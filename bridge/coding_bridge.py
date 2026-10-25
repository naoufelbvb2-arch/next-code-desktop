"""Real P7 AgentOS boundary; private stdio and independent cancellation reader.

Offline tests inject a Gateway through a test-owned caller. Production has no
fixture selector on the CLI, environment, Renderer or public IPC.
"""
import argparse
import asyncio
import contextlib
import json
import os
from pathlib import Path
import secrets
import sys
import threading

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from desktop_bridge import Input, exact, ident, integer, require, text
from broker_client import frame_record
from engine_compatibility import load_verified_engine


def validate_request(record):
    frame = frame_record(record)
    exact(frame, "version type message_id correlation_id payload")
    require(type(frame["version"]) is int and frame["version"] == 1)
    ident(frame["message_id"])
    require(frame["type"] == "request" and frame["correlation_id"] is None)
    payload = frame["payload"]
    exact(payload, "action input")
    value = payload["input"]
    if payload["action"] == "task.cancel":
        exact(value, "task_id")
        ident(value["task_id"])
    else:
        require(payload["action"] == "task.execute")
        exact(value, "task_id conversation_id task_goal workspace_root conversation_context")
        ident(value["task_id"])
        ident(value["conversation_id"])
        text(value["task_goal"], 16384, 1)
        text(value["workspace_root"], 1024, 1)
        require(len(value["workspace_root"]) >= 3 and value["workspace_root"][1:3] in (":\\", ":/"))
        require(value["task_id"] != value["conversation_id"])
    return frame


@contextlib.contextmanager
def descendant_stdin():
    # Private JSONL stdin belongs exclusively to the bridge reader. Inherited
    # stdin for Git/engine subprocesses is NUL, never the task/cancel channel.
    if sys.platform != "win32":
        yield
        return
    import ctypes as c
    from ctypes import wintypes as w
    api = c.WinDLL("kernel32", use_last_error=True)
    api.GetStdHandle.argtypes, api.GetStdHandle.restype = [w.DWORD], w.HANDLE
    api.SetStdHandle.argtypes = [w.DWORD, w.HANDLE]
    api.CreateFileW.argtypes = [w.LPCWSTR, w.DWORD, w.DWORD, c.c_void_p, w.DWORD, w.DWORD, w.HANDLE]
    api.CreateFileW.restype = w.HANDLE
    api.CloseHandle.argtypes = [w.HANDLE]
    old = api.GetStdHandle(0xfffffff6)
    null = api.CreateFileW("NUL", 0x80000000, 3, None, 3, 0x80, None)
    require(null and null != c.c_void_p(-1).value)
    require(api.SetStdHandle(0xfffffff6, null))
    try:
        yield
    finally:
        api.SetStdHandle(0xfffffff6, old)
        api.CloseHandle(null)


def serve(settings, gateway_factory=None):
    with descendant_stdin():
        return _serve(settings, gateway_factory)


def _serve(settings, gateway_factory):
    AgentOS, Context, Outcome, Control, Cancelled = load_verified_engine({k: settings[k] for k in ("engineRoot", "sitePackages")})
    incoming, lock, seen = Input(), threading.RLock(), set()
    wire_lock, event_lock = threading.Lock(), threading.RLock()
    wire = sys.stdout.buffer
    active, thread, control = None, None, None
    terminal = False

    def emit(kind, payload, correlation=None):
        with lock:
            require(len(seen) < 65536)
            identity = secrets.token_hex(24)
            require(identity not in seen)
            seen.add(identity)
            record = json.dumps(dict(version=1, type=kind, message_id=identity,
                correlation_id=correlation, payload=payload), ensure_ascii=False,
                separators=(",", ":")).encode("utf-8") + b"\n"
            require(len(record) <= 262144)
        # Pipe backpressure must not hold the state/identity lock: the independent
        # input reader can validate and register cancellation while stdout waits.
        with wire_lock:
            watchdog = threading.Timer(30, lambda: os._exit(74))
            watchdog.daemon = True
            watchdog.start()
            try:
                wire.write(record)
                wire.flush()
            finally:
                watchdog.cancel()

    def work(frame, context, task_control):
        nonlocal terminal
        value = frame["payload"]["input"]
        identity = value["task_id"]
        sequence, started, ended = 0, False, False
        evidence, observed_outcome = None, None

        def event(name, extra):
            nonlocal sequence
            with event_lock:
                require(started and not ended or name in ("task.completed", "task.failed", "task.cancelled"))
                sequence += 1
                emit("event", {"name": name, "data": dict(task_id=identity,
                    event_id=secrets.token_hex(24), sequence=sequence, source="agent_os", **extra)})

        class Observer:
            def started(self, tid, root):
                nonlocal started
                require(not started and not ended and tid == identity and root == workspace)
                started = True
                event("task.started", {"phase": "INITIALIZING"})

            def outcome(self, outcome):
                nonlocal ended, evidence, observed_outcome
                require(started and not ended and isinstance(outcome, Outcome))
                result = outcome.model_dump(mode="json")
                exact(result, "task_id success final_phase summary total_ticks rollbacks_triggered final_checkpoint_hash")
                require(result["task_id"] == identity and type(result["success"]) is bool)
                text(result["summary"], 2048)
                integer(result["total_ticks"])
                integer(result["rollbacks_triggered"])
                if result["final_checkpoint_hash"] is not None:
                    text(result["final_checkpoint_hash"], 128)
                require(result["final_phase"] in ("INITIALIZING", "EXPLORING", "PLANNING", "EXECUTING", "VERIFYING", "COMPLETED", "FAILED"))
                require(not result["success"] or result["final_phase"] == "COMPLETED")
                evidence = ("task.completed" if result["success"] else "task.failed", {"outcome": result})
                observed_outcome, ended = outcome, True

            def cancelled(self, tid, root):
                nonlocal ended, evidence
                require(started and not ended and tid == identity and root == workspace and task_control.requested)
                evidence = ("task.cancelled", {"confirmation": "AgentOS cooperatively unwound awaited tools and workers. Existing file changes are retained."})
                ended = True

            def failed(self, tid, root, error):
                pass  # No TaskOutcome or cooperative-stop event is invented.

        try:
            workspace = Path(value["workspace_root"]).resolve(strict=True)
            require(gateway_factory is not None)
            gateway = gateway_factory(settings, workspace)
            # Engine prints never become transport records or outcome evidence.
            with open(os.devnull, "w") as discarded, contextlib.redirect_stdout(discarded):
                async def execute():
                    try:
                        engine = AgentOS(workspace, gateway=gateway, verbose=False)
                        if "route" in settings:
                            from coding_policy import install_policy
                            from coding_events import install_tool_events
                            install_policy(engine, settings["route"])
                            install_tool_events(engine, settings["route"], event)
                        return await engine.execute_task(value["task_goal"], identity,
                            conversation_context=context, observer=Observer(), cancellation=task_control)
                    finally:
                        close = getattr(gateway, "aclose", None)
                        if close is not None:
                            await close()
                outcome = asyncio.run(execute())
                require(isinstance(outcome, Outcome) and outcome is observed_outcome and ended)
        except Cancelled:
            if not ended:
                emit("error", {"code": "INTERNAL_FAILURE", "message": "Execution stopped without a verified started lifecycle; reconciliation is required.", "retryable": False}, frame["message_id"])
                return
        except BaseException as error:
            code = type(error).__name__
            code = code if code.isascii() and code.isidentifier() and len(code) <= 64 else "EngineError"
            emit("error", {"code": "INTERNAL_FAILURE", "message": "Execution failed ("+code+") without verified terminal evidence; reconciliation is required.", "retryable": False}, frame["message_id"])
            return
        # Terminal delivery follows actual AgentOS return/unwind and Gateway
        # cleanup, never a pre-call wrapper or cancelled Future.
        if evidence is not None:
            with lock:
                event(*evidence)
                terminal = True

    emit("ready", {"process_role": "coding_task"})
    try:
        while True:
            record = incoming.next()
            if record is None:
                if control is not None and not terminal:
                    control.request()
                if thread is not None:
                    thread.join()  # Main owns the independent 15-second Job bound.
                return 0
            frame = validate_request(record)
            with lock:
                require(frame["message_id"] not in seen and len(seen) < 65536)
                seen.add(frame["message_id"])
                value = frame["payload"]["input"]
                if frame["payload"]["action"] == "task.cancel":
                    require(active is not None and value["task_id"] == active and not terminal)
                    control.request()
                    emit("response", {"status": "completed", "result": {"cancel_request_registered": True}, "reason": None}, frame["message_id"])
                else:
                    require(active is None)
                    if gateway_factory is None:
                        emit("error", {"code": "PROVIDER_UNAVAILABLE", "message": "A coding model route requires separate configuration and authorization.", "retryable": False}, frame["message_id"])
                        return 78
                    if "route" in settings:
                        from coding_gateway import CodingBudget, validate_route
                        validate_route(settings["route"], Path(value["workspace_root"]).resolve(strict=True))
                        CodingBudget(settings["route"]["budgetFile"]).claim(value["task_id"])
                    context = None if value["conversation_context"] is None else Context.snapshot_and_validate(Context.model_validate(value["conversation_context"]))
                    if context is not None:
                        require(context.conversation_id == value["conversation_id"])
                        require(context.workspace_root.resolve() == Path(value["workspace_root"]).resolve(strict=True))
                        require(all(prior.task_id != value["task_id"] for prior in context.prior_tasks))
                    active, control = value["task_id"], Control()
                    emit("response", {"status": "accepted", "result": None, "reason": None}, frame["message_id"])
                    thread = threading.Thread(target=work, args=(frame, context, control), daemon=False)
                    thread.start()
    except BaseException:
        if control is not None:
            control.request()
        return 65


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--describe", action="store_true")
    parser.add_argument("--role", choices=("coding_task",))
    args = parser.parse_args()
    try:
        settings = json.loads(os.environ["NCD_CODING_CONFIG"])
        load_verified_engine({k: settings[k] for k in ("engineRoot", "sitePackages")})
        if args.describe:
            print(json.dumps({"protocol": 1, "roles": ["coding_task"], "provider": False, "engine": True, "executionControl": 1}, separators=(",", ":")))
            return 0
        require(args.role == "coding_task")
        factory = None
        if "route" in settings:
            from coding_gateway import build_gateway
            key = os.environ.pop("DEEPSEEK_API_KEY", "")
            require(bool(key))
            factory = lambda config, workspace: build_gateway(config, key, workspace)
        return serve(settings, factory)
    except BaseException:
        frame = dict(version=1, type="error", message_id=secrets.token_hex(24), correlation_id=None,
            payload={"code":"STARTUP_FAILED", "message":"The tested coding runtime could not be verified.", "retryable":False})
        sys.stdout.buffer.write((json.dumps(frame, separators=(",", ":"))+"\n").encode())
        sys.stdout.buffer.flush()
        return 78


if __name__ == "__main__":
    raise SystemExit(main())
