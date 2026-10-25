"""Actual registered tools and negative evidence tests; no provider/network."""
import hashlib
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "bridge"))
from engine_compatibility import load_verified_engine
load_verified_engine({"engineRoot": str(ROOT.parent / "next code"),
    "sitePackages": str(ROOT.parent / "next code/.venv/Lib/site-packages")})
from coding_events import install_tool_events
from kernel.tools.registry import ToolRegistry
from kernel.schemas import ExecutionContext, AgentRole, PatchBlock, ToolResult
from kernel.execution import TaskCancelled


class CodingEventTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="ncd-p8-tools-")
        self.root = Path(self.temp.name)
        (self.root / "sample.py").write_text("def add(a,b): return a-b\n")
        (self.root / "check.py").write_text("from sample import add\nassert add(2,3)==5\n")
        self.engine = SimpleNamespace(workspace_root=self.root, tool_registry=ToolRegistry())
        self.route = {"writableFiles":["sample.py"], "verificationFile":"check.py",
            "verificationSha256":hashlib.sha256((self.root / "check.py").read_bytes()).hexdigest(),
            "command":f'"{Path(sys.executable).as_posix()}" -B check.py'}
        self.rows = []
        self.ctx = ExecutionContext(task_id="synthetic", workspace_root=self.root,
            role=AgentRole.SURGEON, allowed_files=["sample.py"])

    def tearDown(self): self.temp.cleanup()
    def install(self): install_tool_events(self.engine, self.route, lambda name,data:self.rows.append((name,data)))

    def test_actual_patch_digest_change_only_no_event_for_failed_or_noop_patch(self):
        self.install()
        result = self.engine.tool_registry.execute("apply_patch", self.ctx, path="sample.py",
            patches=[PatchBlock(search="a-b", replace="a+b")])
        self.assertTrue(result.success)
        self.assertEqual(self.rows,[("file.changed",{"path":"sample.py","change_kind":"modified"})])
        self.engine.tool_registry.execute("apply_patch", self.ctx, path="sample.py",
            patches=[PatchBlock(search="not present", replace="not executed")])
        self.assertEqual(len(self.rows),1)
        self.assertNotIn("worker_ref",self.rows[0][1])

    def test_actual_failed_and_successful_pinned_test_return_codes_not_generated_summary(self):
        self.install()
        result = self.engine.tool_registry.execute("run_command",self.ctx,command=self.route["command"])
        self.assertFalse(result.success)
        self.assertEqual(self.rows[-1][1]["status"],"failed")
        (self.root / "sample.py").write_text("def add(a,b): return a+b\n")
        result = self.engine.tool_registry.execute("run_command",self.ctx,command=self.route["command"])
        self.assertTrue(result.success)
        self.assertEqual(self.rows[-1],("test.result",{"status":"passed","summary":"Pinned verification command exited with code 0."}))
        self.assertNotIn("Traceback",str(self.rows))

    def test_pasSED_prose_without_actual_return_code_and_boolean_code_never_prove_test(self):
        for metadata in ({},{"returncode":True}):
            self.engine.tool_registry.register("run_command",lambda ctx,**args:ToolResult(success=True,
                output="ALL TESTS PASSED / worker completed",execution_time_ms=0,metadata=metadata))
            self.install()
            self.engine.tool_registry.execute("run_command",self.ctx,command=self.route["command"])
        self.assertEqual(self.rows,[])

    def test_tool_cancellation_does_not_fabricate_test_or_worker_completion(self):
        def cancel(ctx,**args): raise TaskCancelled("Synthetic cancellation boundary")
        self.engine.tool_registry.register("run_command",cancel)
        self.install()
        with self.assertRaises(TaskCancelled):
            self.engine.tool_registry.execute("run_command",self.ctx,command=self.route["command"])
        self.assertEqual(self.rows,[])
