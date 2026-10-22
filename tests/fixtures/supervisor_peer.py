"""P4 ONLY: isolated non-engine process fault/coding simulator.

Never imported or selectable by the production bridge. All agent_os-shaped
events below are synthetic contract fixtures, never actual AgentOS evidence.
"""
import argparse
import json
import os
import secrets
import subprocess
import sys
import threading
import time

parser = argparse.ArgumentParser()
parser.add_argument("--role", choices=("discussion", "coding_task"), required=True)
parser.add_argument("--mode", default="normal")
args = parser.parse_args()
lock = threading.Lock()
done = threading.Event()
sequence = 0


def emit(kind, payload, correlation=None, message_id=None):
    frame = dict(version=1, type=kind, message_id=message_id or secrets.token_hex(24), correlation_id=correlation, payload=payload)
    with lock:
        sys.stdout.buffer.write(json.dumps(frame, separators=(",", ":")).encode("utf-8") + b"\n")
        sys.stdout.buffer.flush()


def event(task, name, extra):
    global sequence
    sequence += 1
    emit("event", {"name": name, "data": dict(task_id=task, event_id=secrets.token_hex(24), sequence=sequence, source="agent_os", **extra)})


if args.mode == "before_ready":
    sys.exit(17)
if args.mode == "silent":
    time.sleep(120)
    sys.exit(0)
if args.mode == "partial":
    sys.stdout.buffer.write(b'{"version":1')
    sys.stdout.buffer.flush()
    time.sleep(120)
    sys.exit(0)
if args.mode in ("invalid_utf8", "chatter", "oversize", "duplicate_keys", "bad_version"):
    values = {"invalid_utf8": b"\xff\n", "chatter": b"Synthetic untrusted stdout\n", "oversize": b"x" * 262145,
              "duplicate_keys": b'{"version":1,"version":1}\n',
              "bad_version": b'{"version":2,"type":"ready","message_id":"r","correlation_id":null,"payload":{"process_role":"discussion"}}\n'}
    sys.stdout.buffer.write(values[args.mode])
    sys.stdout.buffer.flush()
    time.sleep(120)
    sys.exit(0)
ready_id = "fixture_ready"
emit("ready", {"process_role": "coding_task" if args.role == "discussion" and args.mode == "wrong_role" else args.role}, message_id=ready_id)
if args.mode == "duplicate_ready":
    emit("ready", {"process_role": args.role})
if args.mode == "after_ready":
    time.sleep(0.15)
    sys.exit(19)
if args.mode == "stderr":
    sys.stderr.write("API_KEY=synthetic-secret-do-not-publish C:/private/synthetic/location task.completed\n" * 500)
    sys.stderr.flush()
if args.mode == "wrong_action":
    emit("request", {"action": "task.cancel", "input": {"task_id": "forged"}})
if args.mode == "wrong_correlation":
    emit("error", {"code": "INTERNAL_FAILURE", "message": "Synthetic error", "retryable": False}, "foreign_request")
if args.mode == "no_read":
    time.sleep(120)
    sys.exit(0)


def workload(task):
    event(task, "task.started", {"phase": "INITIALIZING"})
    if args.mode in ("tree", "orphan"):
        # Descendant inherits the Job, not protocol pipes or Main handles.
        child_code = "import subprocess,sys,time,os,json;g=subprocess.Popen([sys.executable,'-I','-S','-c','import time;time.sleep(120)'],stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);m=os.environ.get('P4_FIXTURE_CHILD_FILE');f=open(m,'w',encoding='utf-8') if m else None;f.write(json.dumps({'pid':os.getpid(),'grandchild':g.pid})) if f else None;f.close() if f else None;time.sleep(120)"
        child = subprocess.Popen([sys.executable, "-I", "-S", "-c", child_code], stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if args.mode == "orphan":
            time.sleep(0.2)
            os._exit(21)
    while not done.wait(0.01):
        if args.mode in ("load", "flood"):
            event(task, "task.progress", {"phase": "EXECUTING", "detail": "Synthetic pressure" * (110 if args.mode == "flood" else 1)})


for line in sys.stdin.buffer:
    frame = json.loads(line)
    action = frame["payload"]["action"]
    correlation = frame["message_id"]
    if args.mode == "disconnect":
        os._exit(22)
    if args.mode == "hang_request":
        continue
    if args.mode == "duplicate_id":
        emit("error", {"code": "PROVIDER_UNAVAILABLE", "message": "Synthetic", "retryable": False}, correlation, ready_id)
        continue
    if args.mode == "foreign_final":
        emit("error", {"code": "PROVIDER_UNAVAILABLE", "message": "Synthetic", "retryable": False}, "old_session_request")
        continue
    if action == "task.execute":
        task = frame["payload"]["input"]["task_id"]
        emit("response", {"status": "accepted", "result": None, "reason": None}, correlation)
        threading.Thread(target=workload, args=(task,), daemon=True).start()
    elif action == "task.cancel":
        emit("response", {"status": "completed", "result": {"cancel_request_registered": True}, "reason": None}, correlation)
        if args.mode != "ignore_cancel":
            done.set()
            break
    elif action == "discussion.send":
        if args.mode == "broker":
            emit("request", {"action": "project.discover", "input": {"discussion_request_id": correlation, "directory": ".", "max_depth": 1, "limit": 1, "cursor": None}})
        else:
            emit("error", {"code": "PROVIDER_UNAVAILABLE", "message": "Synthetic fixture has no provider", "retryable": False}, correlation)
done.set()
