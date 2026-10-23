"""Isolated test entry: actual production Discussion code, original Gateway,
and a synthetic httpx.MockTransport. Never a production launcher or real HTTP."""
import json
import os
from pathlib import Path
import sys
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "bridge"))
import discussion_bridge
import gateway_adapter


async def offline_discuss(settings, key, value, resources=None, sources=None):
    httpx = gateway_adapter.load_engine(settings)[0]
    class Budget:
        def reserve(self): return 1
        def finish(self, ordinal, result): pass
    async def respond(request):
        payload = json.loads(request.content)
        messages = json.dumps(payload["messages"], ensure_ascii=False)
        safe = "Atlas" in messages and (not sources or "lower-trust" in messages) and "tools" not in payload
        metrics = Path(os.environ["NCD_FIXTURE_METRICS"])
        count = json.loads(metrics.read_text())["mockProviderCalls"] + 1 if metrics.exists() else 1
        metrics.write_text(json.dumps({"mockProviderCalls": count, "approvedSources": len(sources or []), "lowerTrustAndNoTools": safe}), "utf-8")
        response = "Fixture provider saw Atlas in an approved excerpt." if sources and safe else "Fixture provider remembered Atlas." if safe else "Fixture source projection failed."
        answer = {"answer": response, "task_proposal": None, "summary_candidates": [], "decision_candidates": []}
        return httpx.Response(200, json={"choices": [{"message": {"content": json.dumps(answer)}, "finish_reason": "stop"}], "usage": {"prompt_tokens": 20, "completion_tokens": 10, "total_tokens": 30}})
    resources = gateway_adapter.build_gateway(settings, key, backend=httpx.MockTransport(respond), budget=Budget())
    return await gateway_adapter.discuss(settings, key, value, resources=resources, sources=sources)


discussion_bridge.discuss = offline_discuss
if __name__ == "__main__":
    sys.exit(discussion_bridge.main())
