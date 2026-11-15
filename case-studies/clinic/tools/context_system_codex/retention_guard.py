"""Evaluation-only PreToolUse guard for answer-only retention probes.

Register an unfiltered PreToolUse command hook with:

    python -I -B retention_guard.py --mode-file <absolute-controller-owned-path>

The controller creates a small JSON file containing exactly {"mode": "work"}
or {"mode": "probe"}. Work mode allows ordinary tool behavior. Probe mode
denies every tool routed through PreToolUse, before its execution. Missing,
malformed or oversized inputs fail closed with a bounded, valid hook response.

The mode file must be outside the participant's writable workspace; the
controller owns its transitions. This hook does not establish that isolation
or cover every possible native tool route. The controller must also audit
probe events and invalidate a probe on any attempted tool use, even if denied.
Never install this evaluation guard in ordinary user projects.

The output schema matches eval_guard.py and Codex's PreToolUse decision schema.
Only the explicitly named mode file and hook stdin are read.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

MAX_MODE_BYTES = 1024
MAX_HOOK_INPUT_BYTES = 1024 * 1024
DENIAL_REASON = (
    "Primary retention probe requires an answer without tools. "
    "Tool execution is denied; missing or invalid controller mode also denies."
)


def deny() -> dict:
    return {"hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": DENIAL_REASON,
    }}


def _unique_object(pairs: list[tuple[str, object]]) -> dict:
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate mode key")
        result[key] = value
    return result


def guard(mode_file: str | Path | None, payload: object = None) -> dict:
    """Return a native hook decision; mode/config errors never allow tools.

    ``payload`` is optional for direct offline use. If supplied, it must be a
    JSON object; no tool names or command contents affect the decision.
    """
    try:
        if payload is not None and not isinstance(payload, dict):
            return deny()
        if mode_file is None:
            return deny()
        path = Path(mode_file)
        if not path.is_absolute() or path.is_symlink():
            return deny()
        with path.open("rb") as stream:
            raw = stream.read(MAX_MODE_BYTES + 1)
        if len(raw) > MAX_MODE_BYTES:
            return deny()
        mode = json.loads(raw.decode("utf-8-sig"), object_pairs_hook=_unique_object)
        if not isinstance(mode, dict) or set(mode) != {"mode"}:
            return deny()
        if mode["mode"] == "work":
            return {}
        return deny()
    except (OSError, ValueError, TypeError, RecursionError):
        return deny()


class _Parser(argparse.ArgumentParser):
    def error(self, message: str) -> None:
        # A nonzero hook process failure can leave native behavior unchanged.
        # Configuration errors must instead produce a valid explicit denial.
        raise ValueError("Invalid guard arguments")


def main() -> None:
    try:
        parser = _Parser(description=__doc__, add_help=False)
        parser.add_argument("--mode-file")
        args = parser.parse_args()
        raw = sys.stdin.buffer.read(MAX_HOOK_INPUT_BYTES + 1)
        if len(raw) > MAX_HOOK_INPUT_BYTES:
            raise ValueError("Oversized hook input")
        payload = json.loads(raw.decode("utf-8-sig"))
        if not isinstance(payload, dict):
            raise ValueError("Invalid hook input")
        result = guard(args.mode_file, payload)
    except (OSError, ValueError, TypeError, RecursionError):
        result = deny()
    sys.stdout.write(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n")


if __name__ == "__main__":
    main()
