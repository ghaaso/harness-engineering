"""UTF-8 output budgets, including JSON framing and the final newline.

These are byte counts, never model-token estimates. Checkpoint text is admitted
as complete blocks; only explicit recall pages may split historical text.
"""
from __future__ import annotations

import json

MIN_BYTES = 64
MAX_BYTES = 1024 * 1024


def byte_limit(value: int | None, name: str, *, optional: bool = False) -> int | None:
    if optional and value is None:
        return None
    if type(value) is not int or not MIN_BYTES <= value <= MAX_BYTES:
        raise ValueError(f"{name} must be an integer from {MIN_BYTES} to {MAX_BYTES}")
    return value


def json_line(value) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n"


def wire_bytes(value) -> int:
    return len(json_line(value).encode("utf-8"))


def context(event: str, text: str) -> dict:
    return {"hookSpecificOutput": {"hookEventName": event, "additionalContext": text}}


def checkpoint_bytes(text: str) -> int:
    # The hook envelope is stricter than the plain-text restore command.
    return wire_bytes(context("SessionStart", text))


def fits_checkpoint(text: str, chars: int, limit: int | None, reserve: int = 0) -> bool:
    return (len(text) + reserve <= chars
            and (limit is None or checkpoint_bytes(text) + reserve <= limit))


def metrics(text: str) -> dict:
    return {"text_chars": len(text), "text_bytes": len(text.encode("utf-8")),
            "wire_bytes": checkpoint_bytes(text)}


def failure(error: Exception, limit: int | None, *, hook: bool = False) -> dict:
    """Keep errors complete and observable even when descriptive text cannot fit."""
    kind = type(error).__name__
    if hook:
        candidates = [
            {"systemMessage": f"Codex context checkpoint unavailable ({kind}); native behavior continues. "
                              "Read the task-state file before relying on recall."},
            {"systemMessage": "Context unavailable; read task state."},
        ]
    else:
        candidates = [{"ok": False, "error": str(error), "type": kind},
                      {"ok": False, "error": kind}]
    for candidate in candidates:
        if limit is None or wire_bytes(candidate) <= limit:
            return candidate
    # Valid limits are at least 64 bytes; these fixed forms fit that minimum.
    return {"systemMessage": "Context unavailable."} if hook else {"ok": False, "error": "Unavailable"}


def checked_json(value, limit: int | None) -> str:
    encoded = json_line(value)
    if limit is not None and len(encoded.encode("utf-8")) > limit:
        raise ValueError("Serialized output exceeds its UTF-8 byte budget")
    return encoded
