"""P7 source inspection/quarantined entry only. No AgentOS or model invocation."""
import ast
import json
from pathlib import Path
import subprocess
import sys
import unittest

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "bridge"))
from engine_compatibility import inspect_engine, ENGINE_COMMIT


class CodingGateTests(unittest.TestCase):
    def test_actual_engine_source_signature_outcome_fields_and_missing_capabilities_remain_blocked(self):
        audit = inspect_engine(ROOT.parent / "next code")
        self.assertEqual(audit["engineCommit"], ENGINE_COMMIT)
        self.assertTrue(audit["approvedCommitMatches"])
        self.assertFalse(audit["codingReady"])
        self.assertEqual(audit["g4"], "BLOCKED")
        self.assertEqual(audit["signatures"]["AgentOS.execute_task"]["parameters"], ["self", "task_goal", "task_id", "conversation_context"])
        self.assertEqual(audit["taskOutcomeFields"], ["task_id", "success", "final_phase", "summary", "total_ticks", "rollbacks_triggered", "final_checkpoint_hash"])
        self.assertNotIn(str(ROOT.parent), json.dumps(audit))

    def test_missing_engine_probe_emits_sanitized_denial_and_never_enables_coding(self):
        result = subprocess.run([sys.executable, "-I", "-S", str(ROOT / "bridge/engine_compatibility.py"), "--engine-root", str(ROOT / ".test-profiles/nonexistent-engine")], capture_output=True, timeout=10)
        value = json.loads(result.stdout)
        self.assertEqual(result.returncode, 2)
        self.assertEqual(value["g4"], "BLOCKED")
        self.assertFalse(value["codingReady"])
        self.assertNotIn(str(ROOT), json.dumps(value))

    def test_coding_entry_has_no_ready_no_acceptance_or_fake_events_and_fails_closed_before_reading_task(self):
        frame = {"version": 1, "type": "request", "message_id": "execute_fixture", "correlation_id": None,
                 "payload": {"action": "task.execute", "input": {}}}
        result = subprocess.run([sys.executable, "-I", "-S", str(ROOT / "bridge/coding_bridge.py"), "--role", "coding_task"], input=(json.dumps(frame)+"\n").encode(), capture_output=True, timeout=5)
        lines = result.stdout.splitlines()
        self.assertEqual(result.returncode, 78)
        self.assertEqual(len(lines), 1)
        value = json.loads(lines[0])
        self.assertEqual(set(value), {"version", "type", "message_id", "correlation_id", "payload"})
        self.assertEqual(value["type"], "error")
        self.assertEqual(value["payload"]["code"], "STARTUP_FAILED")
        self.assertIsNone(value["correlation_id"])
        self.assertFalse(value["payload"]["retryable"])
        self.assertFalse(result.stderr)

    def test_quarantined_entry_does_not_advertise_coding_capability_or_import_engine(self):
        result = subprocess.run([sys.executable, "-I", "-S", str(ROOT / "bridge/coding_bridge.py"), "--describe"], capture_output=True, check=True, timeout=5)
        self.assertEqual(json.loads(result.stdout), {"protocol": 1, "roles": [], "provider": False, "engine": False})
        tree = ast.parse((ROOT / "bridge/coding_bridge.py").read_text())
        imports = [n.module if isinstance(n, ast.ImportFrom) else a.name for n in ast.walk(tree)
                   if isinstance(n, (ast.Import, ast.ImportFrom)) for a in n.names]
        self.assertTrue(set(imports).isdisjoint({"agent_os", "gateway_adapter", "os", "subprocess", "engine_compatibility"}))
