"""Desktop P4 Discussion boundary. No engine, provider, SQLite or file tools.

The internal --describe probe is not a wire command. Operational traffic is
exclusively IIS-01 v1. Coding simulation lives only under tests/fixtures.
"""
import argparse
import json
import os
import queue
import re
import secrets
import sys
import threading
import time

MAX_RECORD = 262144
MAX_QUEUE_BYTES = 8388608


def require(condition):
    if not condition:
        raise ValueError("BAD_SCHEMA")


def exact(value, fields):
    require(type(value) is dict and set(value) == set(fields.split()))


def text(value, maximum, minimum=0):
    require(type(value) is str and minimum <= len(value) <= maximum)
    value.encode("utf-8", "strict")


def ident(value):
    require(type(value) is str and re.fullmatch(r"[A-Za-z0-9_-]{1,64}", value))


def integer(value):
    require(type(value) is int and 0 <= value <= 9007199254740991)


def bounded_array(value, maximum):
    require(type(value) is list and len(value) <= maximum)


def validate_context(value):
    exact(value, "recent_messages summaries decisions context_revision")
    integer(value["context_revision"])
    require(len(json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8")) <= 98304)
    bounded_array(value["recent_messages"], 20)
    bounded_array(value["summaries"], 10)
    bounded_array(value["decisions"], 20)
    for item in value["recent_messages"]:
        exact(item, "message_id role text")
        ident(item["message_id"])
        require(item["role"] in ("user", "assistant"))
        text(item["text"], 16384)
    for item in value["summaries"]:
        exact(item, "summary_id text source_message_ids")
        ident(item["summary_id"])
        text(item["text"], 2048)
        bounded_array(item["source_message_ids"], 100)
        for source in item["source_message_ids"]:
            ident(source)
    for item in value["decisions"]:
        exact(item, "decision_id text approval_message_id")
        ident(item["decision_id"])
        ident(item["approval_message_id"])
        text(item["text"], 2048)


def unique(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result)
        result[key] = value
    return result


def no_float(_):
    raise ValueError("BAD_SCHEMA")


def validate_record(data):
    require(0 < len(data) <= MAX_RECORD and data.endswith(b"\n") and b"\r" not in data and b"\n" not in data[:-1])
    source = data[:-1].decode("utf-8", "strict")
    require(not source.startswith("\ufeff"))
    frame = json.loads(source, object_pairs_hook=unique, parse_float=no_float, parse_constant=no_float)
    # Iterative resource and Unicode check, before recursive field validation.
    stack = [(frame, 0)]
    nodes = 0
    while stack:
        value, depth = stack.pop()
        nodes += 1
        require(nodes <= 20000 and depth <= 32)
        if isinstance(value, str):
            value.encode("utf-8", "strict")
        elif type(value) is dict:
            for key, item in value.items():
                key.encode("utf-8", "strict")
                stack.append((item, depth + 1))
        elif type(value) is list:
            stack.extend((item, depth + 1) for item in value)
    exact(frame, "version type message_id correlation_id payload")
    require(type(frame["version"]) is int and frame["version"] == 1)
    ident(frame["message_id"])
    require(frame["type"] == "request" and frame["correlation_id"] is None)
    payload = frame["payload"]
    exact(payload, "action input")
    require(payload["action"] == "discussion.send")
    value = payload["input"]
    exact(value, "conversation_id user_message_id text model_id context_snapshot project_ref")
    ident(value["conversation_id"])
    ident(value["user_message_id"])
    text(value["text"], 16384, 1)
    text(value["model_id"], 128, 1)
    if value["project_ref"] is not None:
        ident(value["project_ref"])
    validate_context(value["context_snapshot"])
    return frame


class Input:
    def __init__(self):
        self.records = queue.Queue(maxsize=256)
        self.lock = threading.Lock()
        self.bytes = 0
        self.partial_at = None
        self.failed = threading.Event()
        threading.Thread(target=self.read, daemon=True).start()

    def read(self):
        pending = bytearray()
        try:
            while True:
                chunk = os.read(sys.stdin.fileno(), 65536)
                if not chunk:
                    if pending:
                        self.failed.set()
                    self.records.put(None, timeout=30)
                    return
                for byte in chunk:
                    if not pending:
                        self.partial_at = time.monotonic()
                    pending.append(byte)
                    require(len(pending) <= MAX_RECORD)
                    if byte == 10:
                        record = bytes(pending)
                        pending.clear()
                        self.partial_at = None
                        deadline = time.monotonic() + 30
                        while True:
                            with self.lock:
                                if self.bytes + len(record) <= MAX_QUEUE_BYTES:
                                    self.bytes += len(record)
                                    break
                            require(time.monotonic() < deadline)
                            time.sleep(0.01)
                        self.records.put(record, timeout=max(0, deadline - time.monotonic()))
        except (ValueError, OSError, queue.Full):
            self.failed.set()

    def next(self):
        while True:
            if self.failed.is_set() or self.partial_at is not None and time.monotonic() - self.partial_at >= 15:
                raise ValueError("BAD_FRAME")
            try:
                record = self.records.get(timeout=0.05)
                if record is not None:
                    with self.lock:
                        self.bytes -= len(record)
                return record
            except queue.Empty:
                pass


def serve():
    seen = set()
    incoming = Input()

    def emit(kind, payload, correlation=None):
        require(len(seen) < 65536)
        message_id = secrets.token_hex(24)
        require(message_id not in seen)
        seen.add(message_id)
        data = json.dumps(dict(version=1, type=kind, message_id=message_id, correlation_id=correlation, payload=payload), ensure_ascii=False, separators=(",", ":")).encode("utf-8") + b"\n"
        require(len(data) <= MAX_RECORD)
        # A stalled Main cannot retain an unbounded Python writer or input queue.
        finished = threading.Event()
        watchdog = threading.Timer(30, lambda: os._exit(74) if not finished.is_set() else None)
        watchdog.daemon = True
        watchdog.start()
        try:
            sys.stdout.buffer.write(data)
            sys.stdout.buffer.flush()
        finally:
            finished.set()
            watchdog.cancel()

    emit("ready", {"process_role": "discussion"})
    try:
        while True:
            record = incoming.next()
            if record is None:
                return 0
            frame = validate_record(record)
            require(len(seen) < 65536 and frame["message_id"] not in seen)
            seen.add(frame["message_id"])
            # P5 owns model routing. Never invent an answer, proposal or retry.
            emit("error", {"code": "PROVIDER_UNAVAILABLE", "message": "Discussion provider is not configured in P4.", "retryable": False}, frame["message_id"])
    except (ValueError, TypeError, KeyError, UnicodeError, RecursionError, OSError):
        # No raw request, exception, filesystem path, or environment diagnostic.
        return 65


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--describe", action="store_true")
    parser.add_argument("--role", choices=("discussion",))
    args = parser.parse_args()
    if args.describe:
        print(json.dumps({"protocol": 1, "roles": ["discussion"], "provider": False, "engine": False}, separators=(",", ":")))
        return 0
    if args.role != "discussion":
        return 64
    return serve()


if __name__ == "__main__":
    sys.exit(main())
