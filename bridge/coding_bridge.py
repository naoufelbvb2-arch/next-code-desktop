"""Quarantined P7 coding entry. No engine execution until the owner-approved gate.

It deliberately emits no READY, accepted/start/terminal/cancelled record.
The missing engine hooks must not be hidden behind a simulated task lifecycle.
"""
import argparse
import json
import secrets
import sys

sys.dont_write_bytecode = True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--describe", action="store_true")
    parser.add_argument("--role", choices=("coding_task",))
    args = parser.parse_args()
    if args.describe:
        print(json.dumps({"protocol": 1, "roles": [], "provider": False, "engine": False}, separators=(",", ":")))
        return 0
    if args.role != "coding_task":
        return 64
    frame = {"version": 1, "type": "error", "message_id": secrets.token_hex(24), "correlation_id": None,
             "payload": {"code": "STARTUP_FAILED", "message": "Coding is unavailable pending approved engine lifecycle and cooperative cancellation integration.", "retryable": False}}
    sys.stdout.buffer.write((json.dumps(frame, separators=(",", ":")) + "\n").encode())
    sys.stdout.buffer.flush()
    return 78


if __name__ == "__main__":
    raise SystemExit(main())
