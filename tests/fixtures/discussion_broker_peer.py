"""Isolated test entry: actual production Discussion code, original Gateway,
and a synthetic httpx.MockTransport. Never a production launcher or real HTTP."""
import json
import asyncio
import os
from pathlib import Path
import sys
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "bridge"))
import discussion_bridge
import gateway_adapter


async def offline_discuss(settings, key, value, resources=None, sources=None):
    httpx = gateway_adapter.load_engine(settings)[0]
    gate = os.environ.get("NCD_R01_PROVIDER_GATE")
    if sources and gate:
        Path(gate + ".ready").write_text("Actual source already returned by Main; provider not yet called.")
        for _ in range(600):
            if Path(gate).exists():
                break
            await asyncio.sleep(0.05)
        else:
            raise ValueError("PROVIDER_FAILED")
    class Budget:
        def reserve(self): return 1
        def finish(self, ordinal, result): pass
    async def respond(request):
        payload = json.loads(request.content)
        messages = json.dumps(payload["messages"], ensure_ascii=False)
        safe = "Atlas" in messages and (not sources or "lower-trust" in messages) and "tools" not in payload
        metrics = Path(os.environ["NCD_FIXTURE_METRICS"])
        count = json.loads(metrics.read_text())["mockProviderCalls"] + 1 if metrics.exists() else 1
        memory = [m for m in payload["messages"] if m["content"].startswith("Lower-trust conversation memory: ")]
        memory_summary_count = sum(len(json.loads(m["content"].split(": ",1)[1])["derived_summaries"]) for m in memory)
        metrics.write_text(json.dumps({"mockProviderCalls": count, "approvedSources": len(sources or []), "lowerTrustAndNoTools": safe,
            "contextRevision": value["context_snapshot"]["context_revision"], "summaryMemoryCount": memory_summary_count,
            "historyCount": len(value["context_snapshot"]["recent_messages"]), "currentInputOccurrences": sum(m.get("name")==value["user_message_id"] for m in payload["messages"]),
            "r01GatePassed": bool(sources and gate and Path(gate).exists())}), "utf-8")
        response = "Fixture provider saw Atlas in an approved excerpt." if sources and safe else "Fixture provider remembered Atlas." if safe else "Fixture source projection failed."
        summaries = [{"text":"Synthetic pressure memory: Atlas.","source_message_ids":[value["user_message_id"]]}] if value["text"].startswith("R01 pressure Atlas") and len(value["text"])>12000 else []
        answer = {"answer": response, "task_proposal": None, "summary_candidates": summaries, "decision_candidates": []}
        return httpx.Response(200, json={"choices": [{"message": {"content": json.dumps(answer)}, "finish_reason": "stop"}], "usage": {"prompt_tokens": 20, "completion_tokens": 10, "total_tokens": 30}})
    resources = gateway_adapter.build_gateway(settings, key, backend=httpx.MockTransport(respond), budget=Budget())
    from kernel.gateway.ledger import TokenLedger
    resources[0].ledger = TokenLedger(Path(os.environ["NCD_FIXTURE_METRICS"]).parent / "isolated-gateway-ledger.jsonl")
    return await gateway_adapter.discuss(settings, key, value, resources=resources, sources=sources)


discussion_bridge.discuss = offline_discuss
if __name__ == "__main__":
    sys.exit(discussion_bridge.main())
