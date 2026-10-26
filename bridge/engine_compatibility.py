"""Read-only source audit. Never imports, constructs or executes AgentOS."""
import argparse
import ast
import hashlib
import json
from pathlib import Path
import subprocess
import sys

sys.dont_write_bytecode = True
ENGINE_COMMIT = "99e00e13f8a39fa6730f3d3de773ac937b5ac915"
SOURCES = ("agent_os.py", "architect/contracts.py", "architect/lead_loop.py", "architect/prompts.py",
           "architect/dispatcher.py", "squad/dispatcher.py", "squad/chassis.py",
           "kernel/tools/registry.py", "kernel/tools/shell.py", "kernel/guard.py",
           "kernel/checkpoint.py", "kernel/gateway/router.py", "kernel/gateway/openai_compat.py",
           "kernel/config.py", "pyproject.toml", "kernel/execution.py", "kernel/owned_process.py")


def verify_engine(directory):
    root = Path(directory).resolve(strict=True)
    manifest = json.loads((Path(__file__).parent / "coding-compatibility.json").read_text("utf-8"))
    if manifest["engineCommit"] != ENGINE_COMMIT or manifest["executionControl"] != 1 or manifest.get("verifiedObserver") != 1:
        raise ValueError("Unsupported capability manifest")
    head = (root / ".git/HEAD").read_text("ascii").strip()
    if head.startswith("ref: "):
        ref = head[5:]
        if not ref.startswith("refs/heads/") or ".." in ref or "\\" in ref:
            raise ValueError("Untrusted engine reference")
        ref_file = root / ".git" / ref
        if ref_file.is_file():
            head = ref_file.read_text("ascii").strip()
        else:
            refs = (root / ".git/packed-refs").read_text("ascii").splitlines()
            head = next(line.split(" ")[0] for line in refs if line.endswith(" " + ref))
    if head != ENGINE_COMMIT:
        raise ValueError("Untested engine revision")
    expected = manifest["engineFiles"]
    actual = {p.relative_to(root).as_posix() for folder in ("kernel", "brain", "architect", "squad")
              for p in (root / folder).rglob("*.py")}
    actual.update(p.name for p in root.glob("*.py"))
    if actual != set(expected):
        raise ValueError("Unexpected engine source inventory")
    for relative, digest in expected.items():
        path = (root / relative).resolve(strict=True)
        if not path.is_relative_to(root) or hashlib.sha256(path.read_bytes()).hexdigest() != digest:
            raise ValueError("Untested engine source bytes")
    return root


def load_verified_engine(settings):
    if set(settings) != {"engineRoot", "sitePackages"}:
        raise ValueError("Untrusted coding settings")
    root = verify_engine(settings["engineRoot"])
    site = Path(settings["sitePackages"]).resolve(strict=True)
    sys.path[:0] = [str(root), str(site)]
    import pydantic
    import httpx
    if pydantic.__version__ != "2.12.5" or httpx.__version__ != "0.28.1":
        raise ValueError("Untested coding dependencies")
    from kernel.execution import CancellationControl, TaskCancelled, EXECUTION_CONTROL_VERSION, VERIFIED_OBSERVER_VERSION
    from agent_os import AgentOS
    from architect.contracts import ConversationContext, TaskOutcome
    if EXECUTION_CONTROL_VERSION != 1 or VERIFIED_OBSERVER_VERSION != 1 or len(TaskOutcome.model_fields) != 7:
        raise ValueError("Unsupported execution contract")
    return AgentOS, ConversationContext, TaskOutcome, CancellationControl, TaskCancelled


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
    if not execute or execute["parameters"] != ["self", "task_goal", "task_id", "conversation_context", "observer", "cancellation"]:
        raise ValueError("Unexpected engine interface; no compatibility inferred")
    verify_engine(directory)
    return {"engineCommit": commit, "approvedCommitMatches": commit == ENGINE_COMMIT,
            "inspection": "SOURCE_ONLY_NO_ENGINE_IMPORT_OR_EXECUTION", "files": files,
            "signatures": signatures, "taskOutcomeFields": outcome,
            "codingReady": False, "engineCapabilityVerified": True, "g4": "REQUIRES_DESKTOP_EXECUTION_EVIDENCE",
            "missing": [],
            "terminal": "Engine offline suite: 69 PASS, three paid tests NOT_RUN. Desktop integration is separate evidence.",
            "enablement": "Exact tested commit and complete source inventory required. Source inspection alone does not authorize a model route or certify G4."}


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
