"""Test-owned caller of production Coding Bridge + actual original ModelGateway.

All HTTP is an in-memory mock, all profiles are explicitly replaced, and sockets
to non-loopback destinations fail. This caller is never imported by the product.
"""
import asyncio
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import threading

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "bridge"))
import coding_bridge
from engine_compatibility import load_verified_engine

settings = json.loads(os.environ["NCD_CODING_CONFIG"])
wire_filter = None
load_verified_engine({k: settings[k] for k in ("engineRoot", "sitePackages")})
connect = socket.socket.connect
def local(self, address):
    if not isinstance(address, tuple) or address[0] not in ("127.0.0.1", "::1"):
        raise RuntimeError("External network prohibited by P7 offline fixture")
    return connect(self, address)
socket.socket.connect = local


def offline_backend(settings, workspace):
    import httpx
    from kernel.config import KernelConfig
    from kernel.gateway.router import ModelGateway
    from kernel.gateway.openai_compat import OpenAICompatibleProvider, ProviderConfig
    from kernel.gateway.ledger import TokenLedger
    from kernel.schemas import ModelProfile
    mode = os.environ.get("P7_FIXTURE_CASE", "success")
    if mode == "lost_ack":
        mode = "gateway"
    command = '"C:/Python314/python.exe" -B check.py'

    def architect(action, role=None):
        value = dict(situation_assessment="Synthetic offline fixture",
            mental_simulation=dict(hypothesis="Only sample.py", verification_strategy="check.py"),
            new_phase="COMPLETED" if action == "COMPLETE_TASK" else "EXECUTING",
            next_action=action, final_response="Verified synthetic outcome")
        if role:
            value["task_contract"] = dict(contract_id="fixture_contract_"+role, target_role=role,
                objective="Change or verify only sample.py", target_files=["sample.py"],
                context_briefing="Synthetic approved fixture", test_command=command)
        return value

    def tool(name, args):
        return dict(thought="Bounded actual tool", action_type="CALL_TOOL", tool_call=dict(tool_name=name,arguments=args))

    def finish(verdict="NOT_APPLICABLE"):
        return dict(thought="Observed fixture tool result", action_type="FINISH_TASK",
            final_report=dict(status="SUCCESS",summary="Synthetic worker completed",inquisitor_verdict=verdict))

    if mode == "soak":
        # Existing original AgentOS 15-tick limit; genuine Dispatcher/Chassis
        # invocations and bounded read tools, never injected worker events.
        replies = []
        for _ in range(15):
            replies.extend([architect("DISPATCH_SCOUT", "SCOUT"),
                *[tool("read_file", {"path":"sample.py"}) for _ in range(8)], finish()])
    elif mode == "failed":
        replies = [architect("ABORT_TASK")]
    elif mode in ("shell", "stubborn"):
        replies = [architect("DISPATCH_SURGEON", "SURGEON"),
            tool("run_command", {"command":'"C:/Python314/python.exe" parent.py',"timeout_sec":60})]
    else:
        replies = [architect("DISPATCH_SURGEON", "SURGEON"),
            tool("apply_patch", {"path":"sample.py","patches":[{"search":"return 1","replace":"return 2"}]})
                if "return 1" in workspace.joinpath("sample.py").read_text() else tool("read_file", {"path":"sample.py"}),
            tool("run_command", {"command":command}), finish(),
            architect("DISPATCH_INQUISITOR", "INQUISITOR"), tool("run_command", {"command":command}),
            finish("APPROVED"), architect("COMPLETE_TASK")]
        if mode == "repeated_workers":
            # Same role/contract ID, independent real Engine invocations. The
            # Inquisitor is intentionally between two Scouts, never a UI order.
            replies[4:4] = [architect("DISPATCH_SCOUT", "SCOUT"),
                tool("read_file", {"path":"sample.py"}), finish()]
            replies[-1:-1] = [architect("DISPATCH_SCOUT", "SCOUT"),
                tool("read_file", {"path":"sample.py"}), finish()]
    calls = 0

    async def respond(request):
        nonlocal calls
        calls += 1
        if os.environ.get("NCD_R01_LOOP_AUDIT"):
            loop = asyncio.get_running_loop()
            ports = [getattr(loop, name).getsockname()[1] for name in ("_ssock", "_csock")]
            Path(os.environ["NCD_R01_LOOP_AUDIT"]).write_text(json.dumps({"ports":ports,"source":"Actual CPython ProactorEventLoop socketpair"}))
        payload = json.loads(request.content)
        # Evidence remains in the external synthetic fixture, never a normal DB.
        audit = Path(os.environ["NCD_R01_SOAK_AUDIT"]) if mode == "soak" else workspace / "gateway-audit.json"
        entries = json.loads(audit.read_text()) if audit.exists() else []
        entries.append({"model":payload["model"],"prompt":payload["messages"][-1]["content"]})
        audit.write_text(json.dumps(entries))
        if mode == "soak":
            await asyncio.sleep(0.5)  # Real Gateway wait; cancellation remains observable.
        if mode == "exception":
            raise RuntimeError("Synthetic pre-outcome failure")
        if mode == "stubborn":
            subprocess.Popen([sys.executable, "parent.py"], cwd=workspace)
            workspace.joinpath("awaiting.txt").write_text(mode)
            try:
                await asyncio.Event().wait()
            except asyncio.CancelledError:
                await asyncio.Event().wait()  # Real engine wait that cannot unwind.
        if (mode == "gateway" and calls == 1) or (mode == "worker" and calls == 2):
            workspace.joinpath("awaiting.txt").write_text(mode)
            await asyncio.Event().wait()
        require_reply = replies.pop(0)
        return httpx.Response(200,json={"choices":[{"message":{"content":json.dumps(require_reply)},"finish_reason":"stop"}],
            "usage":{"prompt_tokens":1,"completion_tokens":1,"total_tokens":2}})

    return httpx.MockTransport(respond)


def factory(settings, workspace):
    if wire_filter is not None:
        wire_filter.workspace = workspace
    if os.environ.get("P7_FIXTURE_CASE") == "before_start":
        workspace.joinpath("before-start.txt").write_text("Actual Coding Bridge reached Gateway setup; AgentOS not yet constructed.")
        threading.Event().wait()
    import httpx
    from kernel.config import KernelConfig
    from kernel.gateway.router import ModelGateway
    from kernel.gateway.openai_compat import OpenAICompatibleProvider, ProviderConfig
    from kernel.gateway.ledger import TokenLedger
    from kernel.schemas import ModelProfile
    client = httpx.AsyncClient(transport=offline_backend(settings, workspace), trust_env=False)
    provider = OpenAICompatibleProvider(config=ProviderConfig(api_key=None,max_http_retries=1),client=client)
    gateway = ModelGateway(config=KernelConfig(workspace_root=workspace,deepseek_api_key=None,max_retries=0),
        ledger=TokenLedger(workspace / ".agent_os/offline-ledger.jsonl"))
    for profile in ModelProfile:
        gateway.register_route(profile,provider,model_name="offline_"+profile.value)
    gateway.aclose = client.aclose
    return gateway


if __name__ == "__main__":
    if os.environ.get("P7_FIXTURE_CASE") == "lost_ack":
        class AckFilter:
            workspace = None
            def __init__(self, output): self.output = output
            def write(self, record):
                frame = json.loads(record)
                if frame["type"] == "response" and frame["payload"].get("status") == "accepted":
                    return len(record)  # Actual response dropped, never replaced.
                if frame["type"] == "event" and frame["payload"]["name"] == "task.started":
                    self.workspace.joinpath("actual-start-with-lost-ack.json").write_text(json.dumps(frame))
                return self.output.write(record)
            def flush(self): return self.output.flush()
        original_stdout = sys.stdout
        wire_filter = AckFilter(original_stdout.buffer)
        class Output:
            buffer = wire_filter
            def write(self, value): return original_stdout.write(value)
            def flush(self): return original_stdout.flush()
        sys.stdout = Output()
    raise SystemExit(coding_bridge.serve(settings, factory))
