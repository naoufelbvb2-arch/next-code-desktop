"""Actual Discussion/Gateway with a synthetic HTTP proposal response only."""
import json
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
        result = {"answer": "A bounded proposal is available for explicit review.",
                  "task_proposal": {"goal": "Change only sample.py so value() returns 2 and verify with check.py.", "reason": "Synthetic offline proposal fixture."},
                  "summary_candidates": [], "decision_candidates": []}
        return httpx.Response(200, json={"choices": [{"message": {"content": json.dumps(result)}, "finish_reason": "stop"}], "usage": {"prompt_tokens": 20, "completion_tokens": 10, "total_tokens": 30}})
    resources = gateway_adapter.build_gateway(settings, key, backend=httpx.MockTransport(respond), budget=Budget())
    return await gateway_adapter.discuss(settings, key, value, resources=resources, sources=sources)


discussion_bridge.discuss = offline_discuss
if __name__ == "__main__":
    raise SystemExit(discussion_bridge.main())
