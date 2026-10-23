"""P5 live Discussion entry. Only private IIS-01 stdio; no broker/AgentOS tools."""
import asyncio
import json
import os
from pathlib import Path
import sys
import threading
import time

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from desktop_bridge import Input, validate_record, require
from gateway_adapter import load_engine, discuss
from broker_client import BrokerClient, frame_record, BrokerDenied
import secrets


def main():
    settings = json.loads(os.environ["NCD_DISCUSSION_CONFIG"])
    load_engine(settings)
    if sys.argv[1:] == ["--describe"]:
        print(json.dumps({"protocol": 1, "roles": ["discussion"], "provider": True, "engine": True,
                          "model": "deepseek-flash", "destination": "https://api.deepseek.com/chat/completions"}, separators=(",", ":")))
        return 0
    require(sys.argv[1:] == ["--role", "discussion"])
    key = os.environ.pop("DEEPSEEK_API_KEY", "")
    seen, active, conversations = set(), set(), set()
    lock = threading.Lock()

    def emit(kind, payload, correlation=None, identity=None):
        with lock:
            require(len(seen) < 65536)
            identity = identity or secrets.token_hex(24)
            require(identity not in seen)
            seen.add(identity)
            data = json.dumps(dict(version=1, type=kind, message_id=identity, correlation_id=correlation, payload=payload), ensure_ascii=False, separators=(",", ":")).encode("utf-8") + b"\n"
            require(len(data) <= 262144)
            watchdog = threading.Timer(30, lambda: os._exit(74))
            watchdog.daemon = True
            watchdog.start()
            try:
                sys.stdout.buffer.write(data)
                sys.stdout.buffer.flush()
            finally:
                watchdog.cancel()

    broker = BrokerClient(emit)

    def work(frame):
        identity = frame["message_id"]
        value = frame["payload"]["input"]
        started = time.monotonic()
        try:
            sources = broker.sources(identity, value)
            remaining = 295 - (time.monotonic() - started)
            require(remaining > 0)
            result = asyncio.run(asyncio.wait_for(discuss(settings, key, value, sources=sources), timeout=remaining))
            kind, payload = "response", {"status": "completed", "result": result, "reason": None}
        except BrokerDenied:
            kind, payload = "error", {"code": "NOT_AUTHORIZED", "message": "Project inspection was denied or needs separate source permission. Send a new message after resolving access.", "retryable": False}
        except Exception:
            kind, payload = "error", {"code": "PROVIDER_UNAVAILABLE", "message": "Discussion provider request failed or is uncertain.", "retryable": False}
        # Retire before final response is visible; a newly serialized turn may
        # arrive immediately after Main commits that response.
        with lock:
            active.discard(identity)
            conversations.discard(value["conversation_id"])
        emit(kind, payload, identity)

    incoming = Input()
    emit("ready", {"process_role": "discussion"})
    try:
        while True:
            record = incoming.next()
            if record is None:
                return 0
            parsed = frame_record(record)
            if parsed["type"] in ("response", "error"):
                with lock:
                    require(parsed["message_id"] not in seen and len(seen) < 65536)
                    seen.add(parsed["message_id"])
                broker.receive(parsed)
                continue
            frame = validate_record(record)
            with lock:
                require(frame["message_id"] not in seen and len(seen) < 65536 and len(active) < 16)
                require(frame["payload"]["input"]["conversation_id"] not in conversations)
                seen.add(frame["message_id"])
                active.add(frame["message_id"])
                conversations.add(frame["payload"]["input"]["conversation_id"])
            threading.Thread(target=work, args=(frame,), daemon=True).start()
    except Exception:
        return 65


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:
        sys.exit(65)
