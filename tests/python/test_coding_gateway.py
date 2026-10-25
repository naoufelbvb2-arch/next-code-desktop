"""Actual original Gateway/Provider with in-memory HTTP; never a paid call."""
import asyncio
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "bridge"))
from engine_compatibility import load_verified_engine
from coding_gateway import CodingBudget, build_gateway, validate_route
from coding_policy import install_policy, pure_python

SETTINGS = {"engineRoot": str(ROOT.parent / "next code"),
            "sitePackages": str(ROOT.parent / "next code/.venv/Lib/site-packages")}
AgentOS = load_verified_engine(SETTINGS)[0]
import httpx
from kernel.schemas import Message, ModelProfile, ExecutionContext, AgentRole, PatchBlock
from pydantic import BaseModel


def seed(path):
    path.write_text(json.dumps({"version": 1, "requestLimit": 12, "tokenLimit": 60000,
        "outputLimit": 2048, "taskId": None, "requests": []}), encoding="utf-8")


class CodingGatewayTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="ncd-p7-route-")
        self.root = Path(self.temp.name)
        self.workspace = self.root / "project"
        self.workspace.mkdir()
        (self.workspace / "sample.py").write_text("def add(a, b): return a - b\n")
        (self.workspace / "check.py").write_text("from sample import add\nassert add(2, 3) == 5\n")
        self.budget = self.root / "budget.json"
        seed(self.budget)
        self.route = {"provider": "deepseek_official_v1", "baseUrl": "https://api.deepseek.com",
            "model": "deepseek-flash", "budgetFile": str(self.budget), "workspaceRoot": str(self.workspace),
            "writableFiles": ["sample.py"], "verificationFile": "check.py",
            "verificationSha256": hashlib.sha256((self.workspace / "check.py").read_bytes()).hexdigest(),
            "command": f'"{Path(sys.executable).as_posix()}" -B check.py', "policy": "pure-python-functions-v1"}
        self.calls = []

    def tearDown(self):
        self.temp.cleanup()

    def data(self):
        return json.loads(self.budget.read_text())

    def gateway(self, responder=None):
        def respond(request):
            self.calls.append(request)
            if responder:
                return responder(request)
            return httpx.Response(200, json={"choices": [{"message": {"content": '{"value":2}'},
                "finish_reason": "stop"}], "usage": {"prompt_tokens": 2, "completion_tokens": 1, "total_tokens": 3}})
        CodingBudget(self.budget).claim("real_task")
        return build_gateway({**SETTINGS, "route": self.route}, "sk-synthetic-coding-key", self.workspace,
                             backend=httpx.MockTransport(respond))

    async def test_three_profiles_use_original_gateway_explicit_flash_and_no_retry_or_fallback(self):
        gateway = self.gateway()
        class Reply(BaseModel):
            value: int
        try:
            for profile in ModelProfile:
                value, usage = await gateway.generate_structured(profile, [Message(role="user", content="JSON value")], Reply,
                    task_id="real_task", max_retries=8)
                self.assertEqual(value.value, 2)
                self.assertEqual(usage.total_tokens, 3)
            self.assertEqual(len(self.calls), 3)
            self.assertEqual({v[1] for v in gateway._routes.values()}, {"deepseek-flash"})
            for request in self.calls:
                payload = json.loads(request.content)
                self.assertEqual(str(request.url), "https://api.deepseek.com/chat/completions")
                self.assertEqual(payload["thinking"], {"type": "disabled"})
                self.assertEqual(payload["response_format"], {"type": "json_object"})
                self.assertEqual(payload["max_tokens"], 2048)
            self.assertNotIn("synthetic-coding-key", self.budget.read_text())
        finally:
            await gateway.aclose()

    async def test_thirteenth_http_request_is_denied_before_network(self):
        gateway = self.gateway()
        try:
            for _ in range(12):
                await gateway.generate_text(ModelProfile.REASONING, [Message(role="user", content="JSON")], task_id="real_task")
            with self.assertRaises(Exception):
                await gateway.generate_text(ModelProfile.REASONING, [Message(role="user", content="JSON")], task_id="real_task")
            self.assertEqual(len(self.calls), 12)
            self.assertEqual(len(self.data()["requests"]), 12)
        finally:
            await gateway.aclose()

    async def test_token_reservation_is_conservative_and_blocks_before_network(self):
        gateway = self.gateway()
        data = self.data()
        data["requests"] = [{"ordinal": 1, "status": "completed", "total_tokens": 59000}]
        self.budget.write_text(json.dumps(data))
        try:
            with self.assertRaises(Exception):
                await gateway.generate_text(ModelProfile.REASONING, [Message(role="user", content="JSON")], task_id="real_task")
            self.assertFalse(self.calls)
        finally:
            await gateway.aclose()

    async def test_http_failure_and_structured_failure_never_retry_or_leak_raw_provider_body(self):
        gateway = self.gateway(lambda request: httpx.Response(429, text="sk-synthetic-coding-key raw error"))
        class Reply(BaseModel):
            value: int
        try:
            with self.assertRaises(Exception) as raised:
                await gateway.generate_structured(ModelProfile.REASONING, [Message(role="user", content="JSON")], Reply,
                    task_id="real_task", max_retries=9)
            self.assertNotIn("synthetic-coding-key", str(raised.exception))
            self.assertEqual(len(self.calls), 1)
            self.assertEqual(self.data()["requests"][0]["status"], "failed")
            with self.assertRaises(Exception):
                await gateway.generate_text(ModelProfile.REASONING, [Message(role="user", content="JSON")], task_id="real_task")
            self.assertEqual(len(self.calls), 1)
        finally:
            await gateway.aclose()

    async def test_missing_usage_is_unknown_and_prevents_more_paid_attempts(self):
        gateway = self.gateway(lambda request: httpx.Response(200, json={"choices": [], "usage": {}}))
        try:
            for _ in range(2):
                with self.assertRaises(Exception):
                    await gateway.generate_text(ModelProfile.REASONING, [Message(role="user", content="JSON")], task_id="real_task")
            self.assertEqual(len(self.calls), 1)
            self.assertEqual(self.data()["requests"][0]["status"], "reserved")
        finally:
            await gateway.aclose()

    def test_single_task_claim_survives_restart_and_corrupt_budget_never_resets(self):
        CodingBudget(self.budget).claim("first_task")
        for task in ("first_task", "second_task"):
            with self.assertRaises(ValueError):
                CodingBudget(self.budget).claim(task)
        self.budget.write_bytes(b'{broken')
        with self.assertRaises(ValueError):
            CodingBudget(self.budget).claim("new_task")
        self.assertEqual(self.budget.read_bytes(), b'{broken')

    def test_cross_process_last_request_slot_cannot_be_double_reserved(self):
        budget = CodingBudget(self.budget)
        budget.claim("task_concurrent")
        data = self.data()
        data["requests"] = [{"ordinal": n, "status": "completed", "total_tokens": 1} for n in range(1, 12)]
        self.budget.write_text(json.dumps(data))
        script = "import sys;sys.path.insert(0,sys.argv[1]);from coding_gateway import CodingBudget\ntry: CodingBudget(sys.argv[2]).reserve(100)\nexcept ValueError: sys.exit(2)"
        children = [subprocess.Popen([sys.executable, "-I", "-S", "-c", script, str(ROOT / "bridge"), str(self.budget)],
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) for _ in range(2)]
        self.assertEqual(sorted(p.wait(timeout=10) for p in children), [0, 2])
        self.assertEqual(len(self.data()["requests"]), 12)

    async def test_actual_registry_denies_escaping_writes_commands_and_executable_python(self):
        gateway = self.gateway()
        try:
            engine = AgentOS(self.workspace, gateway=gateway)
            install_policy(engine, self.route)
            ctx = ExecutionContext(workspace_root=self.workspace, role=AgentRole.SURGEON,
                allowed_files=["sample.py"], task_id="real_task")
            for path in (str(ROOT / "README.md"), str(ROOT.parent / "next code/agent_os.py"), "../outside.py", "check.py"):
                result = engine.tool_registry.execute("apply_patch", ctx, path=path,
                    patches=[PatchBlock(search="impossible", replace="unreachable")])
                self.assertFalse(result.success)
            result = engine.tool_registry.execute("run_command", ctx, command='python -c "open(\"../outside\",\"w\")"')
            self.assertFalse(result.success)
            (self.workspace / "sample.py").write_text("import os\ndef add(a,b): return a+b\n")
            result = engine.tool_registry.execute("run_command", ctx, command=self.route["command"])
            self.assertFalse(result.success)
            (self.workspace / "sample.py").write_text("def add(a,b): return a+b\n")
            result = engine.tool_registry.execute("run_command", ctx, command=self.route["command"])
            self.assertTrue(result.success, result.output)
            self.assertFalse((self.root / "outside").exists())
        finally:
            await gateway.aclose()
