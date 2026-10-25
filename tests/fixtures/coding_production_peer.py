"""Test-owned HTTP mock injection into the actual production factory/CLI.

Never imported by product startup. Reuses the existing real-engine responses.
"""
from pathlib import Path
import sys
sys.path[:0] = [str(Path(__file__).parent), str(Path(__file__).resolve().parents[2] / "bridge")]
import coding_bridge
import coding_gateway
from coding_engine_peer import offline_backend

original = coding_gateway.build_gateway
def gateway(settings, key, workspace):
    return original(settings, key, workspace, backend=offline_backend(settings, workspace))
coding_gateway.build_gateway = gateway
if __name__ == "__main__":
    raise SystemExit(coding_bridge.main())
