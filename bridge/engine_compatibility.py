"""Read-only source audit. Never imports, constructs or executes AgentOS."""
import argparse
import ast
import hashlib
import json
from pathlib import Path
import subprocess
import sys

sys.dont_write_bytecode = True
ENGINE_COMMIT = "834d0ca62cc9b2c03e530bafe4090024d98f31d3"
SOURCES = ("agent_os.py", "architect/contracts.py", "architect/lead_loop.py", "architect/prompts.py",
           "architect/dispatcher.py", "squad/dispatcher.py", "squad/chassis.py",
           "kernel/tools/registry.py", "kernel/tools/shell.py", "kernel/guard.py",
           "kernel/checkpoint.py", "kernel/gateway/router.py", "kernel/gateway/openai_compat.py",
           "kernel/config.py", "pyproject.toml")


def inspect_engine(directory):
    root = Path(directory).resolve(strict=True)
    git = subprocess.run(["git", "-c", "safe.directory=" + root.as_posix(), "-C", str(root), "rev-parse", "HEAD"],
                         capture_output=True, timeout=5, check=True)
    commit = git.stdout.decode("ascii").strip()
    files, trees = {}, {}
    for relative in SOURCES:
        file = (root / relative).resolve(strict=True)
        if not file.is_relative_to(root):
            raise ValueError("Untrusted source location")
        data = file.read_bytes()
        if len(data) > 1024 * 1024:
            raise ValueError("Source audit size bound")
        files[relative] = {"sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)}
        if relative.endswith(".py"):
            trees[relative] = ast.parse(data.decode("utf-8-sig"))
    signatures = {}
    for file, tree in trees.items():
        for cls in [n for n in tree.body if isinstance(n, ast.ClassDef)]:
            for method in cls.body:
                if isinstance(method, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    if cls.name in ("AgentOS", "LeadArchitectLoop", "EphemeralSquadDispatcher"):
                        signatures[cls.name + "." + method.name] = {"file": file, "line": method.lineno,
                            "async": isinstance(method, ast.AsyncFunctionDef),
                            "parameters": [a.arg for a in method.args.posonlyargs + method.args.args + method.args.kwonlyargs]}
    classes = {n.name:n for n in trees["architect/contracts.py"].body if isinstance(n, ast.ClassDef)}
    outcome = [n.target.id for n in classes["TaskOutcome"].body if isinstance(n, ast.AnnAssign) and isinstance(n.target, ast.Name)]
    execute = signatures.get("AgentOS.execute_task")
    if not execute or execute["parameters"] != ["self", "task_goal", "task_id", "conversation_context"]:
        raise ValueError("Unexpected engine interface; no compatibility inferred")
    return {"engineCommit": commit, "approvedCommitMatches": commit == ENGINE_COMMIT,
            "inspection": "SOURCE_ONLY_NO_ENGINE_IMPORT_OR_EXECUTION", "files": files,
            "signatures": signatures, "taskOutcomeFields": outcome,
            "codingReady": False, "g4": "BLOCKED",
            "missing": ["Engine-owned lifecycle start observation", "Cooperative cancellation request and confirmed-stop contract",
                        "Verified propagation through worker and blocking tool execution"],
            "terminal": "Structured TaskOutcome return exists; actual invocation/serialization NOT_RUN until lifecycle/cancel gate is resolved.",
            "enablement": "Future engine changes require separate owner authorization and actual integration tests; source/commit match alone cannot enable coding."}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--engine-root", required=True)
    args = parser.parse_args()
    try:
        value = inspect_engine(args.engine_root)
    except Exception:
        value = {"codingReady": False, "g4": "BLOCKED", "error": "Engine source identity or interface could not be established."}
    print(json.dumps(value, ensure_ascii=True, separators=(",", ":")))
    return 0 if "error" not in value else 2


if __name__ == "__main__":
    raise SystemExit(main())
