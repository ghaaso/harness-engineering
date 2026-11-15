"""Disposable evaluation-only tool guard; never installed in the user's projects.

The controller separately validates dynamic-tool paths and outputs. Native hooks
do not cover every tool path, so this guard is not claimed as a complete sandbox.
"""
from __future__ import annotations

import json
import sys

ALLOWED = {"ReadFixture", "WriteFixture", "RunFixtureCheck", "RecallSearch", "RecallShow", "update_plan"}


def guard(payload: dict) -> dict:
    name = payload.get("tool_name", "")
    # Direct dynamic tools may be reported with the ordinary functions namespace.
    if name in ALLOWED or (name.startswith("functions.") and name[10:] in ALLOWED):
        return {}
    return {"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny",
            "permissionDecisionReason": "Evaluation tools are restricted to this synthetic fixture."}}


def main() -> None:
    try:
        raw = sys.stdin.buffer.read(1024 * 1024 + 1)
        if len(raw) > 1024 * 1024:
            raise ValueError("Oversized guard input")
        value = json.loads(raw.decode("utf-8-sig"))
        if not isinstance(value, dict):
            raise ValueError("Invalid guard input")
        result = guard(value)
    except Exception:
        result = guard({})
    print(json.dumps(result, ensure_ascii=False, separators=(",", ":")))


if __name__ == "__main__":
    main()
