"""Isolated schema-conformance peer. No engine imports, files, providers or work."""
import json
import re
import sys


def require(condition):
    if not condition:
        raise ValueError("invalid fixture")


def obj(value, keys):
    require(type(value) is dict and set(value) == set(keys.split()))


def string(value, maximum, minimum=0):
    require(type(value) is str and minimum <= len(value) <= maximum)
    value.encode("utf-8", errors="strict")


def ident(value):
    require(type(value) is str and re.fullmatch(r"[A-Za-z0-9_-]{1,64}", value))


def number(value, minimum=0, maximum=9007199254740991):
    require(type(value) is int and minimum <= value <= maximum)


def boolean(value):
    require(type(value) is bool)


def enum(value, allowed):
    require(type(value) is str and value in allowed.split())


def path(value, file=False):
    string(value, 1024, 1)
    if value == ".":
        require(not file)
        return
    require(not re.search(r'^[\\/]|[\\:\x00-\x1f<>"|?*]', value))
    require(all(part not in ("", ".", "..") and not part.endswith((" ", ".")) for part in value.split("/")))


def workspace(value):
    string(value, 1024, 1)
    require(re.match(r"^[A-Za-z]:[\\/]", value) and not re.search(r"[\x00-\x1f]", value))
    require(".." not in re.split(r"[\\/]", value))


def stamp(value):
    require(type(value) is str and re.fullmatch(r"0|[1-9][0-9]*", value) and len(value) <= 19 and int(value) <= 9223372036854775807)


def array(value, maximum):
    require(type(value) is list and len(value) <= maximum)


PHASES = "INITIALIZING EXPLORING PLANNING EXECUTING VERIFYING COMPLETED FAILED"
ERRORS = "BAD_FRAME BAD_SCHEMA UNSUPPORTED_VERSION DUPLICATE_MESSAGE_ID INVALID_CORRELATION INVALID_STATE NOT_AUTHORIZED WORKSPACE_MISMATCH STALE_SOURCE SENSITIVE_CONTENT RESOURCE_LIMIT PROVIDER_UNAVAILABLE PROVIDER_TIMEOUT STARTUP_FAILED BROKER_IO_ERROR INTERNAL_FAILURE"


def outcome(v):
    obj(v, "task_id success final_phase summary total_ticks rollbacks_triggered final_checkpoint_hash")
    ident(v["task_id"]); boolean(v["success"]); enum(v["final_phase"], PHASES)
    string(v["summary"], 2048); number(v["total_ticks"]); number(v["rollbacks_triggered"])
    if v["final_checkpoint_hash"] is not None: string(v["final_checkpoint_hash"], 128)


def context(v):
    obj(v, "recent_messages summaries decisions context_revision")
    number(v["context_revision"])
    array(v["recent_messages"], 20); array(v["summaries"], 10); array(v["decisions"], 20)
    require(len(json.dumps(v, ensure_ascii=False, separators=(",", ":")).encode("utf-8")) <= 98304)
    for m in v["recent_messages"]:
        obj(m, "message_id role text"); ident(m["message_id"]); enum(m["role"], "user assistant"); string(m["text"], 16384)
    for s in v["summaries"]:
        obj(s, "summary_id text source_message_ids"); ident(s["summary_id"]); string(s["text"], 2048)
        array(s["source_message_ids"], 100)
        for i in s["source_message_ids"]: ident(i)
    for d in v["decisions"]:
        obj(d, "decision_id text approval_message_id"); ident(d["decision_id"]); string(d["text"], 2048); ident(d["approval_message_id"])


def coding_context(v):
    obj(v, "schema_version conversation_id workspace_root prior_tasks recent_messages advisory_preferences")
    require(type(v["schema_version"]) is int and v["schema_version"] == 1)
    ident(v["conversation_id"]); workspace(v["workspace_root"])
    array(v["prior_tasks"], 3); array(v["recent_messages"], 6); array(v["advisory_preferences"], 5)
    for t in v["prior_tasks"]:
        obj(t, "task_id task_goal success final_phase summary"); ident(t["task_id"]); string(t["task_goal"], 500, 1); boolean(t["success"]); enum(t["final_phase"], PHASES); string(t["summary"], 1000, 1)
        require(t["success"] == (t["final_phase"] == "COMPLETED"))
    for m in v["recent_messages"]:
        obj(m, "role content"); enum(m["role"], "user assistant"); string(m["content"], 1000, 1)
    for p in v["advisory_preferences"]: string(p, 200, 1)


def request(v):
    obj(v, "action input"); a = v["action"]; p = v["input"]
    if a == "discussion.send":
        obj(p, "conversation_id user_message_id text model_id context_snapshot project_ref")
        ident(p["conversation_id"]); ident(p["user_message_id"]); string(p["text"], 16384, 1); string(p["model_id"], 128, 1); context(p["context_snapshot"])
        if p["project_ref"] is not None: ident(p["project_ref"])
    elif a == "project.discover":
        obj(p, "discussion_request_id directory max_depth limit cursor"); ident(p["discussion_request_id"]); path(p["directory"]); number(p["max_depth"], 1, 3); number(p["limit"], 1, 100)
        if p["cursor"] is not None: string(p["cursor"], 128, 1)
    elif a == "project.read":
        obj(p, "discussion_request_id path start_line end_line max_chars expected_mtime_ns"); ident(p["discussion_request_id"]); path(p["path"], True)
        number(p["start_line"], 1); number(p["end_line"], p["start_line"], p["start_line"] + 199); number(p["max_chars"], 1, 16384)
        if p["expected_mtime_ns"] is not None: stamp(p["expected_mtime_ns"])
    elif a == "task.execute":
        obj(p, "task_id conversation_id task_goal workspace_root conversation_context"); ident(p["task_id"]); ident(p["conversation_id"]); string(p["task_goal"], 16384, 1); workspace(p["workspace_root"])
        if p["conversation_context"] is not None:
            c = p["conversation_context"]; coding_context(c)
            require(c["conversation_id"] == p["conversation_id"] and c["workspace_root"] == p["workspace_root"] and p["task_id"] != p["conversation_id"])
            require(all(t["task_id"] != p["task_id"] for t in c["prior_tasks"]))
    elif a == "task.cancel":
        obj(p, "task_id"); ident(p["task_id"])
    else: raise ValueError("unknown action")


def candidate(v):
    obj(v, "text source_message_ids"); string(v["text"], 2048); array(v["source_message_ids"], 100)
    for i in v["source_message_ids"]: ident(i)


def result(v):
    require(type(v) is dict)
    if "answer" in v:
        obj(v, "answer task_proposal summary_candidates decision_candidates"); string(v["answer"], 32768)
        if v["task_proposal"] is not None:
            obj(v["task_proposal"], "goal reason"); string(v["task_proposal"]["goal"], 16384, 1); string(v["task_proposal"]["reason"], 2048)
        for field in ("summary_candidates", "decision_candidates"):
            array(v[field], 100)
            for item in v[field]: candidate(item)
    elif "directory" in v:
        obj(v, "directory entries next_cursor complete excluded_count"); path(v["directory"]); array(v["entries"], 100); boolean(v["complete"]); number(v["excluded_count"])
        if v["next_cursor"] is not None: string(v["next_cursor"], 128, 1)
        for e in v["entries"]:
            obj(e, "path kind size_bytes"); path(e["path"]); enum(e["kind"], "file directory")
            if e["size_bytes"] is not None: number(e["size_bytes"])
    elif "content" in v:
        obj(v, "path start_line end_line content truncated observed_mtime_ns excerpt_sha256")
        path(v["path"], True); number(v["start_line"], 1); number(v["end_line"], v["start_line"], v["start_line"] + 199); string(v["content"], 16384); boolean(v["truncated"]); stamp(v["observed_mtime_ns"])
        require(type(v["excerpt_sha256"]) is str and re.fullmatch(r"[a-f0-9]{64}", v["excerpt_sha256"]))
    else:
        obj(v, "cancel_request_registered"); require(v["cancel_request_registered"] is True)


def event(v, outer_id):
    obj(v, "name data"); n = v["name"]; d = v["data"]
    extras = {"task.started":"phase", "task.progress":"phase detail", "worker.started":"worker_ref role", "worker.completed":"worker_ref role status summary", "file.changed":"path change_kind", "test.result":"status summary", "task.completed":"outcome", "task.failed":"outcome", "task.cancelled":"confirmation"}
    require(n in extras); obj(d, "task_id event_id sequence source " + extras[n])
    ident(d["task_id"]); ident(d["event_id"]); require(d["event_id"] != outer_id); number(d["sequence"], 1); require(d["source"] == "agent_os")
    if "phase" in d: enum(d["phase"], PHASES)
    if "detail" in d: string(d["detail"], 2048)
    if "worker_ref" in d: ident(d["worker_ref"]); enum(d["role"], "SCOUT SURGEON INQUISITOR")
    if n == "worker.completed": enum(d["status"], "SUCCESS FAILED BLOCKED"); string(d["summary"], 2048)
    if n == "file.changed": path(d["path"], True); enum(d["change_kind"], "created modified deleted")
    if n == "test.result": enum(d["status"], "passed failed skipped"); string(d["summary"], 2048)
    if n in ("task.completed", "task.failed"):
        outcome(d["outcome"]); require(d["outcome"]["task_id"] == d["task_id"] and d["outcome"]["success"] == (n == "task.completed"))
        if n == "task.completed": require(d["outcome"]["final_phase"] == "COMPLETED")
    if n == "task.cancelled": string(d["confirmation"], 2048, 1)


def unique(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result); result[key] = value
    return result


def reject_float(_):
    raise ValueError("no v1 floating-point numeric field")


def validate(data):
    require(0 < len(data) <= 262144 and data.endswith(b"\n") and b"\n" not in data[:-1] and b"\r" not in data)
    source = data[:-1].decode("utf-8", errors="strict"); require(not source.startswith("\ufeff"))
    v = json.loads(source, object_pairs_hook=unique, parse_float=reject_float, parse_constant=reject_float)
    obj(v, "version type message_id correlation_id payload")
    require(type(v["version"]) is int and v["version"] == 1); ident(v["message_id"])
    t = v["type"]; p = v["payload"]; enum(t, "ready request response event error")
    if t in ("ready", "request", "event"): require(v["correlation_id"] is None)
    elif t == "response": ident(v["correlation_id"])
    elif v["correlation_id"] is not None: ident(v["correlation_id"])
    if t == "ready": obj(p, "process_role"); enum(p["process_role"], "discussion coding_task")
    elif t == "request": request(p)
    elif t == "event": event(p, v["message_id"])
    elif t == "error": obj(p, "code message retryable"); enum(p["code"], ERRORS); string(p["message"], 2048); boolean(p["retryable"])
    else:
        obj(p, "status result reason"); enum(p["status"], "accepted completed rejected")
        if p["status"] == "accepted": require(p["result"] is None and p["reason"] is None)
        elif p["status"] == "completed": require(p["reason"] is None); result(p["result"])
        else: require(p["result"] is None); obj(p["reason"], "code message"); enum(p["reason"]["code"], ERRORS); string(p["reason"]["message"], 2048)


# This test harness format is not an application protocol extension.
for line in sys.stdin.buffer:
    try:
        validate(bytes.fromhex(json.loads(line)["hex"]))
        accepted = True
    except (ValueError, TypeError, KeyError, UnicodeError, RecursionError):
        accepted = False
    sys.stdout.write(json.dumps({"valid": accepted}) + "\n")
    sys.stdout.flush()
