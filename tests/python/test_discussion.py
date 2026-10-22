"""Offline P5 tests: original ModelGateway + provider with an HTTP fixture only."""
import asyncio
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.dont_write_bytecode = True
sys.path.insert(0, str(ROOT / "bridge"))
from gateway_adapter import build_gateway, discuss, load_engine, LiveBudget

SETTINGS = {"engineRoot": str(ROOT.parent / "next code"), "sitePackages": str(ROOT / ".venv/Lib/site-packages"), "budgetFile": "unused_offline"}
httpx = load_engine(SETTINGS)[0]


class Budget:
    def __init__(self):
        self.calls = 0
        self.results = []

    def reserve(self):
        self.calls += 1
        return self.calls

    def finish(self, ordinal, result):
        self.results.append(result)


def turn():
    return {"conversation_id": "conversation", "user_message_id": "user", "text": "What was the synthetic name?",
            "model_id": "deepseek-flash", "project_ref": "opaque_project",
            "context_snapshot": {"recent_messages": [{"message_id": "prior", "role": "user", "text": "Remember Atlas."}],
                                 "summaries": [], "decisions": [], "context_revision": 2}}


class GatewayTests(unittest.TestCase):
    def fixture(self, status=200, content="Atlas", finish="stop"):
        budget, captured = Budget(), []

        async def respond(request):
            captured.append({"url": str(request.url), "payload": json.loads(request.content)})
            structured=json.dumps({"answer":content,"task_proposal":None,"summary_candidates":[],"decision_candidates":[]})
            return httpx.Response(status, json={"choices": [{"message": {"content": structured}, "finish_reason": finish}],
                                                "usage": {"prompt_tokens": 20, "completion_tokens": 2, "total_tokens": 22}})

        resources = build_gateway(SETTINGS, "offline-credential-canary", backend=httpx.MockTransport(respond), budget=budget)
        return resources, budget, captured

    def test_real_gateway_class_explicit_destination_model_non_thinking_and_single_request(self):
        resources, budget, seen = self.fixture()
        answer = asyncio.run(discuss(SETTINGS, "offline-credential-canary", turn(), resources))
        self.assertEqual(type(resources[0]).__name__, "ModelGateway")
        self.assertEqual(answer["answer"], "Atlas")
        self.assertEqual(budget.calls, 1)
        self.assertEqual(seen[0]["url"], "https://api.deepseek.com/chat/completions")
        self.assertEqual(seen[0]["payload"]["model"], "deepseek-flash")
        self.assertEqual(seen[0]["payload"]["thinking"], {"type": "disabled"})
        self.assertEqual(seen[0]["payload"]["max_tokens"], 256)
        self.assertFalse(seen[0]["payload"]["stream"])
        self.assertEqual(budget.results[-1]["total_tokens"], 22)

    def test_history_current_user_once_no_paths_credentials_or_tools(self):
        resources, _, seen = self.fixture()
        value = turn()
        asyncio.run(discuss(SETTINGS, "offline-credential-canary", value, resources))
        prompt = seen[0]["payload"]
        self.assertEqual([m["content"] for m in prompt["messages"]].count(value["text"]), 1)
        self.assertIn("Atlas", prompt["messages"][1]["content"])
        self.assertEqual(prompt["messages"][1]["name"], "prior")
        self.assertEqual(prompt["messages"][-1]["name"], "user")
        for denied in ("opaque_project", "offline-credential-canary", str(ROOT)):
            self.assertNotIn(denied, json.dumps(prompt))
        self.assertNotIn("tools", prompt)

    def test_http_503_has_one_attempt_no_hidden_retries(self):
        resources, budget, seen = self.fixture(status=503)
        with self.assertRaises(Exception):
            asyncio.run(discuss(SETTINGS, "offline-credential-canary", turn(), resources))
        self.assertEqual((budget.calls, len(seen)), (1, 1))

    def test_route_destination_mismatch_before_network(self):
        resources, budget, _ = self.fixture()
        resources[1].base_url = "https://untrusted.invalid"
        with self.assertRaises(ValueError):
            asyncio.run(discuss(SETTINGS, "offline-credential-canary", turn(), resources))
        self.assertEqual(budget.calls, 0)

    def test_model_mismatch_before_network(self):
        resources, budget, _ = self.fixture()
        value = turn()
        value["model_id"] = "unregistered"
        with self.assertRaises(ValueError):
            asyncio.run(discuss(SETTINGS, "offline-credential-canary", value, resources))
        asyncio.run(resources[2].aclose())
        self.assertEqual(budget.calls, 0)

    def test_finish_length_is_not_silently_truncated_success(self):
        resources, _, _ = self.fixture(finish="length")
        with self.assertRaises(Exception):
            asyncio.run(discuss(SETTINGS, "offline-credential-canary", turn(), resources))

    def test_overlong_answer_is_rejected(self):
        resources, _, _ = self.fixture(content="x" * 32769)
        with self.assertRaises(Exception):
            asyncio.run(discuss(SETTINGS, "offline-credential-canary", turn(), resources))

    def test_secret_echo_is_rejected(self):
        resources, _, _ = self.fixture(content="offline-credential-canary")
        with self.assertRaises(Exception):
            asyncio.run(discuss(SETTINGS, "offline-credential-canary", turn(), resources))

    def test_missing_key_never_builds_callable_route(self):
        with self.assertRaises(ValueError):
            build_gateway(SETTINGS, "", backend=httpx.MockTransport(lambda _: None), budget=Budget())

    def test_durable_ten_request_reservation_cap_across_instances(self):
        directory = ROOT / ".test-profiles"
        directory.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=directory) as folder:
            file = Path(folder) / "budget.json"
            for ordinal in range(1, 11):
                self.assertEqual(LiveBudget(file).reserve(), ordinal)
            with self.assertRaises(ValueError):
                LiveBudget(file).reserve()
            self.assertEqual(len(json.loads(file.read_text())["requests"]), 10)


if __name__ == "__main__":
    unittest.main(verbosity=2)
