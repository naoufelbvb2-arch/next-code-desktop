"""Observe supported registered tools, never infer events from model prose.

Worker/phase observation remains unavailable pending an approved engine hook.
File/test records are task-level only and carry no source bodies or tool output.
"""
import hashlib
from pathlib import Path


def install_tool_events(engine, route, event):
    root = engine.workspace_root.resolve(strict=True)
    registry = engine.tool_registry

    def file_state(path):
        if not path.exists():
            return None
        if path.is_symlink() or not path.is_file() or path.stat().st_size > 1048576:
            raise ValueError("EVENT_FILE_UNAVAILABLE")
        return hashlib.sha256(path.read_bytes()).digest()

    patch = registry.get_tool("apply_patch")

    def apply(ctx, **args):
        relative = args.get("path", "")
        # Only explicit, owner-scoped filenames can become display metadata.
        observed = relative in route["writableFiles"] and ctx.workspace_root.resolve() == root
        path = root / relative if observed else None
        before = file_state(path) if observed else None
        result = patch(ctx, **args)
        if observed:
            after = file_state(path)
            if before != after:
                event("file.changed", {"path": relative,
                    "change_kind": "created" if before is None else "deleted" if after is None else "modified"})
        return result

    command = registry.get_tool("run_command")

    def run(ctx, **args):
        pinned = (args.get("command") == route["command"]
            and ctx.workspace_root.resolve() == root
            and hashlib.sha256((root / route["verificationFile"]).read_bytes()).hexdigest() == route["verificationSha256"])
        result = command(ctx, **args)
        # Permission errors, timeout or prose do not prove a test completed.
        code = (result.metadata or {}).get("returncode")
        if pinned and type(code) is int:
            event("test.result", {"status": "passed" if code == 0 else "failed",
                "summary": "Pinned verification command exited with code " + str(code) + "."})
        return result

    registry.register("apply_patch", apply)
    registry.register("run_command", run)
