"""R01 original ModelGateway tests; two captured test routes, no real provider."""
import asyncio
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.dont_write_bytecode = True
sys.path.insert(0, str(ROOT / "bridge"))
from gateway_adapter import build_gateway, discuss, load_engine

SETTINGS = {"engineRoot": str(ROOT.parent / "next code"), "sitePackages": str(ROOT / ".venv/Lib/site-packages"), "budgetFile": "unused_mock_only"}
httpx, Gateway, Provider, ProviderConfig, Config, Message, Profile = load_engine(SETTINGS)
from kernel.gateway.ledger import TokenLedger


class Budget:
    def __init__(self): self.calls, self.outcomes = 0, []
    def reserve(self): self.calls += 1; return self.calls
    def finish(self, ordinal, result): self.outcomes.append(result)


def turn():
    return {"conversation_id":"r01_conversation", "user_message_id":"r01_user", "text":"What was the synthetic name?", "model_id":"deepseek-flash", "project_ref":"r01_project",
        "context_snapshot":{"recent_messages":[{"message_id":"r01_prior", "role":"user", "text":"Remember Atlas."}], "summaries":[], "decisions":[], "context_revision":2}}


class R01GatewayTests(unittest.IsolatedAsyncioTestCase):
    async def test_R01_P01_two_independent_captured_routes_freeze_issued_choice_and_switch_only_future_calls(self):
        captured = {"A":[], "B":[]}; entered, release = asyncio.Event(), asyncio.Event()
        def backend(label):
            async def respond(request):
                captured[label].append(json.loads(request.content))
                if label == "A": entered.set(); await release.wait()
                return httpx.Response(200,json={"choices":[{"message":{"content":label},"finish_reason":"stop"}],"usage":{"prompt_tokens":1,"completion_tokens":1,"total_tokens":2}})
            return httpx.MockTransport(respond)
        clients = [httpx.AsyncClient(transport=backend(label),trust_env=False) for label in ("A","B")]
        providers = [Provider(config=ProviderConfig(base_url=f"https://captured-{label.lower()}.invalid",api_key=None,max_http_retries=1),client=client) for label,client in zip(("A","B"),clients)]
        (ROOT/".test-profiles").mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=ROOT/".test-profiles") as temp:
            gateway = Gateway(config=Config(deepseek_api_key=None,max_retries=0),ledger=TokenLedger(Path(temp)/"ledger.jsonl"))
            for profile in Profile: gateway.register_route(profile,providers[0],model_name="captured-model-A")
            try:
                pending = asyncio.create_task(gateway.generate_text(Profile.FAST_WORKER,[Message(role="user",content="Synthetic route selection only")],task_id="r01A"))
                await entered.wait()
                gateway.register_route(Profile.FAST_WORKER,providers[1],model_name="captured-model-B")
                release.set()
                self.assertEqual((await pending)[0],"A")
                self.assertEqual((await gateway.generate_text(Profile.FAST_WORKER,[Message(role="user",content="Synthetic later selection")],task_id="r01B"))[0],"B")
                self.assertEqual([x["model"] for x in captured["A"]],["captured-model-A"])
                self.assertEqual([x["model"] for x in captured["B"]],["captured-model-B"])
            finally:
                for client in clients: await client.aclose()

    async def test_R01_P02_401_invalid_synthetic_credential_has_one_request_no_fallback_and_sanitized_failure(self):
        seen, budget = [], Budget()
        async def respond(request):
            seen.append(1)
            return httpx.Response(401,json={"error":"synthetic-secret-error-body-must-not-leak"})
        resources = build_gateway(SETTINGS,"r01-synthetic-credential",backend=httpx.MockTransport(respond),budget=budget)
        with self.assertRaises(Exception) as failure:
            await discuss(SETTINGS,"r01-synthetic-credential",turn(),resources)
        self.assertEqual((len(seen),budget.calls),(1,1))
        self.assertNotIn("synthetic-secret-error-body",str(failure.exception))
        self.assertNotIn("r01-synthetic-credential",str(failure.exception))

    async def test_R01_P03_ambiguous_timeout_has_one_attempt_unknown_reservation_no_implicit_retry(self):
        seen, budget = [], Budget()
        async def respond(request):
            seen.append(1)
            raise httpx.ReadTimeout("synthetic captured timeout")
        resources = build_gateway(SETTINGS,"r01-synthetic-credential",backend=httpx.MockTransport(respond),budget=budget)
        with self.assertRaises(Exception): await discuss(SETTINGS,"r01-synthetic-credential",turn(),resources)
        self.assertEqual((len(seen),budget.calls),(1,1))
        self.assertEqual(budget.outcomes[-1]["status"],"unknown")

    async def test_R01_P04_wrong_effective_route_is_rejected_before_captured_source_can_reach_other_provider(self):
        seen, budget = [], Budget()
        async def respond(request): seen.append(1); raise AssertionError("Wrong route reached")
        resources = build_gateway(SETTINGS,"r01-synthetic-credential",backend=httpx.MockTransport(respond),budget=budget)
        resources[1].base_url = "https://captured-b.invalid"
        with self.assertRaises(ValueError):
            await discuss(SETTINGS,"r01-synthetic-credential",turn(),resources,sources=[{"path":"safe.custom","content":"synthetic canary"}])
        await resources[2].aclose()
        self.assertEqual((len(seen),budget.calls),(0,0))


if __name__ == "__main__": unittest.main(verbosity=2)
