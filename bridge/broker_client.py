"""Private closed-JSONL broker client; no filesystem or shell capability."""
import hashlib
import json
import re
import secrets
import threading
from desktop_bridge import exact, ident, text, require, unique, no_float, bounded_array

WIRE_ERRORS = frozenset("BAD_FRAME BAD_SCHEMA UNSUPPORTED_VERSION DUPLICATE_MESSAGE_ID INVALID_CORRELATION INVALID_STATE NOT_AUTHORIZED WORKSPACE_MISMATCH STALE_SOURCE SENSITIVE_CONTENT RESOURCE_LIMIT PROVIDER_UNAVAILABLE PROVIDER_TIMEOUT STARTUP_FAILED BROKER_IO_ERROR INTERNAL_FAILURE".split())


def frame_record(record):
    require(0 < len(record) <= 262144 and record.endswith(b"\n") and b"\r" not in record and b"\n" not in record[:-1])
    frame = json.loads(record[:-1].decode("utf-8", "strict"), object_pairs_hook=unique, parse_float=no_float, parse_constant=no_float)
    stack = [(frame, 0)]
    nodes = 0
    while stack:
        value, depth = stack.pop()
        nodes += 1
        require(nodes <= 20000 and depth <= 32)
        if isinstance(value, str):
            value.encode("utf-8", "strict")
        elif type(value) is dict:
            stack.extend((v, depth + 1) for v in value.values())
        elif type(value) is list:
            stack.extend((v, depth + 1) for v in value)
    exact(frame, "version type message_id correlation_id payload")
    require(type(frame["version"]) is int and frame["version"] == 1)
    ident(frame["message_id"])
    return frame


class BrokerDenied(Exception):
    pass


class BrokerClient:
    def __init__(self, emit):
        self.emit, self.pending, self.lock = emit, {}, threading.Lock()

    def call(self, parent, action, values):
        require(action in ("project.discover", "project.read"))
        identity = secrets.token_hex(24)
        event, slot = threading.Event(), {}
        with self.lock:
            require(len(self.pending) < 16)
            self.pending[identity] = (action, values, event, slot)
        try:
            self.emit("request", {"action": action, "input": {"discussion_request_id": parent, **values}}, identity=identity)
            if not event.wait(30):
                raise BrokerDenied("BROKER_IO_ERROR")
            if "error" in slot:
                raise BrokerDenied("NOT_AUTHORIZED")
            return slot["result"]
        finally:
            with self.lock:
                self.pending.pop(identity, None)

    def receive(self, frame):
        require(frame["type"] in ("response", "error"))
        ident(frame["correlation_id"])
        with self.lock:
            entry = self.pending.get(frame["correlation_id"])
            require(entry is not None)
            action, values, event, slot = entry
            require(not event.is_set())
            payload = frame["payload"]
            if frame["type"] == "error":
                exact(payload, "code message retryable")
                require(payload["code"] in WIRE_ERRORS)
                text(payload["message"], 2048)
                require(type(payload["retryable"]) is bool)
                slot["error"] = True
            else:
                exact(payload, "status result reason")
                require(payload["status"] in ("completed", "rejected"))
                if payload["status"] == "rejected":
                    require(payload["result"] is None)
                    exact(payload["reason"], "code message")
                    require(payload["reason"]["code"] in WIRE_ERRORS)
                    text(payload["reason"]["message"], 2048)
                    slot["error"] = True
                else:
                    require(payload["reason"] is None)
                    result = payload["result"]
                    if action == "project.discover":
                        exact(result, "directory entries next_cursor complete excluded_count")
                        require(result["directory"] == values["directory"])
                        bounded_array(result["entries"], 100)
                        for item in result["entries"]:
                            exact(item, "path kind size_bytes")
                            text(item["path"], 1024, 1)
                            require(item["kind"] in ("file", "directory"))
                            require(item["size_bytes"] is None or type(item["size_bytes"]) is int and 0 <= item["size_bytes"] <= 9007199254740991)
                        require(result["next_cursor"] is None or isinstance(result["next_cursor"], str) and re.fullmatch(r"[\x21-\x7e]{1,128}", result["next_cursor"]) is not None)
                        require(type(result["complete"]) is bool and type(result["excluded_count"]) is int and 0 <= result["excluded_count"] <= 9007199254740991)
                    else:
                        exact(result, "path start_line end_line content truncated observed_mtime_ns excerpt_sha256")
                        require(result["path"] == values["path"])
                        require(type(result["start_line"]) is int and result["start_line"] == values["start_line"])
                        require(type(result["end_line"]) is int and result["start_line"] <= result["end_line"] <= values["end_line"])
                        text(result["content"], min(16384, values["max_chars"]), 1)
                        require(type(result["truncated"]) is bool)
                        require(isinstance(result["observed_mtime_ns"], str) and re.fullmatch(r"(?:0|[1-9][0-9]{0,18})", result["observed_mtime_ns"]) is not None)
                        require(int(result["observed_mtime_ns"]) <= 9223372036854775807)
                        require(result["excerpt_sha256"] == hashlib.sha256(result["content"].encode("utf-8")).hexdigest())
                    slot["result"] = result
            event.set()

    def sources(self, parent, value):
        # Relevance strategy is advisory. Only Main can authorize a returned
        # selector, and explicit source intent cannot grant provider consent.
        request = value["text"].strip()
        direct = re.fullmatch(r"/read ([^\r\n]+)", request)
        if direct:
            paths = [direct.group(1)]
        elif request.lower().startswith(("/inspect", "inspect project", "review project", "analyze project", "read project", "افحص المشروع", "اقرأ ملفات المشروع")):
            page = self.call(parent, "project.discover", {"directory": ".", "max_depth": 1, "limit": 40, "cursor": None})
            files = [item["path"] for item in page["entries"] if item["kind"] == "file"]
            favored = ("readme.md", "package.json", "pyproject.toml", "cargo.toml", "go.mod")
            paths = sorted(files, key=lambda p: (p.lower() not in favored, p.lower()))[:2]
        else:
            return []
        sources = []
        for path in paths:
            sources.append(self.call(parent, "project.read", {"path": path, "start_line": 1, "end_line": 200, "max_chars": 4096, "expected_mtime_ns": None}))
        return sources
