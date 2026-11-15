"""Evaluation-only native PreToolUse guard for retention pressure and probes.

Invoke with ``python -I -B retention_pressure_guard.py --mode-file <absolute>``.
The controller-owned JSON mode file contains exactly one ``mode`` key. ``work``
allows ordinary behavior, ``pressure`` permits only the exact tool names
``ReadPressure`` and ``functions.ReadPressure``, and ``probe`` denies every
tool. Missing or invalid configuration and malformed native stdin fail closed.

The controller must place its mode file outside the participant's writable
workspace and independently enforce tool isolation and audit observed events.
This hook does not establish that isolation or cover every native tool route.
Never install this evaluation guard in ordinary user projects. It reads only
the named mode file and hook stdin, and never echoes either in its output.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

MAX_MODE_BYTES = 1024
MAX_HOOK_INPUT_BYTES = 1024 * 1024
PRESSURE_TOOLS = frozenset({"ReadPressure", "functions.ReadPressure"})
DENIAL_REASON = (
    "Retention evaluation permits only ReadPressure during pressure and no "
    "tools during the primary probe. Missing or invalid controller mode also denies."
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
            raise ValueError("Duplicate JSON key")
        result[key] = value
    return result


def guard(mode_file: str | Path | None, payload: object = None) -> dict:
    """Return a bounded native hook decision from the current controller mode.

    The optional direct-use payload must be an object when supplied. Pressure
    requires its exact ``tool_name``; other fields cannot grant permission.
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
        if mode["mode"] == "pressure" and isinstance(payload, dict):
            name = payload.get("tool_name")
            if isinstance(name, str) and name in PRESSURE_TOOLS:
                return {}
        return deny()
    except (OSError, ValueError, TypeError, RecursionError):
        return deny()


class _Parser(argparse.ArgumentParser):
    def error(self, message: str) -> None:
        # An unsuccessful hook process can leave native behavior unchanged.
        # Emit a successful, explicit denial instead of an argument error.
        raise ValueError("Invalid guard arguments")


def main() -> None:
    try:
        parser = _Parser(description=__doc__, add_help=False)
        parser.add_argument("--mode-file")
        args = parser.parse_args()
        raw = sys.stdin.buffer.read(MAX_HOOK_INPUT_BYTES + 1)
        if len(raw) > MAX_HOOK_INPUT_BYTES:
            raise ValueError("Oversized hook input")
        payload = json.loads(raw.decode("utf-8-sig"), object_pairs_hook=_unique_object)
        if not isinstance(payload, dict):
            raise ValueError("Invalid hook input")
        result = guard(args.mode_file, payload)
    except (OSError, ValueError, TypeError, RecursionError):
        result = deny()
    sys.stdout.write(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n")


if __name__ == "__main__":
    main()
