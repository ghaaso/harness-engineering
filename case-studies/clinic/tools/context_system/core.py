"""Shared helpers for the Claude Code context system.

Project root, configuration, the configured auto-compaction behaviour, archive
naming and fast reads of the current context size from a transcript tail.
Standard library only; every caller treats failures as non-fatal.
"""
from __future__ import annotations

import json
import os
import re
import tempfile
import time
from pathlib import Path
from typing import Any, Iterator

HERE = Path(__file__).resolve().parent

DEFAULTS: dict[str, Any] = {
    # Read admission (main thread only): files above this size get a first page plus an outline.
    "read_admission": True,
    "large_read_bytes": 30000,
    "first_page_bytes": 16000,
    "first_page_min_lines": 120,
    "outline_max_entries": 60,
    # One reminder per compaction cycle, this many tokens before the configured threshold.
    "nudge_margin_tokens": 40000,
    # Task-state sections restored verbatim after compaction: exact heading names (numbering and
    # case ignored), in priority order. Blocks between <!-- ctx:restore --> markers override this.
    "restore_sections": ["Next action", "Next actions", "Next step", "Next steps", "Current state",
                         "User instructions and corrections", "User corrections", "Decisions", "Ruled out",
                         "Rejected approaches", "Open questions", "Unfinished work", "Constraints"],
    "restore_max_blocks": 12,
    # Budget for the PreCompact summarizer instructions; obligations are never cut, lists shrink.
    "precompact_instruction_chars": 6000,
    # Each hook string is capped at 10,000 characters by Claude Code. The saved snapshot stays
    # under snapshot_chars; the rest of restore_total_chars is for changed-since-snapshot notes.
    "snapshot_chars": 9000,
    "restore_total_chars": 9800,
    "snapshot_ledger_min_chars": 600,
    "snapshot_ledger_max_chars": 2500,
    # Keep a raw copy of each compacted window so recall survives transcript cleanup.
    "archive_window_jsonl": True,
}

# Claude Code 2.1.293: threshold = window - min(maxOutputTokens, 20000) - 13000.
COMPACT_RESERVE_TOKENS = 33000
WINDOW_MIN, WINDOW_MAX = 100_000, 1_000_000
CHARS_PER_TOKEN = 2.4  # measured 2.25-2.45 on this project's transcripts
HOOK_STRING_CAP = 9500  # Claude Code caps each hook string at 10,000 characters

WRITE_TOOLS = {"Write", "Edit", "MultiEdit", "NotebookEdit"}
SHELL_TOOLS = {"Bash", "PowerShell"}
STATE_FILE_RE = re.compile(r"(?i)^(task|state|handoff|session[_-]?state[\w-]*)\.md$")
BOUNDARY_MARK = b'"compact_boundary"'
MANAGED_SETTINGS = [Path(r"C:\Program Files\ClaudeCode\managed-settings.json"),
                    Path("/Library/Application Support/ClaudeCode/managed-settings.json"),
                    Path("/etc/claude-code/managed-settings.json")]


def load_config() -> dict[str, Any]:
    cfg = dict(DEFAULTS)
    try:
        cfg.update(json.loads((HERE / "config.json").read_text(encoding="utf-8")))
    except (OSError, ValueError):
        pass
    return cfg


def project_root(payload: dict[str, Any] | None = None, explicit: str | None = None) -> Path:
    """The project the session runs in: explicit arg > CLAUDE_PROJECT_DIR > hook cwd > process cwd.

    Never derived from where this code lives, so a sandbox that calls a copy of the
    code elsewhere still reads and writes only its own project state.
    """
    for candidate in (explicit, os.environ.get("CLAUDE_PROJECT_DIR"), (payload or {}).get("cwd")):
        if candidate and Path(candidate).is_dir():
            return Path(candidate).resolve()
    return Path.cwd().resolve()


def read_json(path: Path) -> dict[str, Any]:
    """Lenient read: missing or unparsable files give {} (BOM tolerated)."""
    try:
        data = json.loads(path.read_text(encoding="utf-8-sig"))
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def read_json_strict(path: Path) -> tuple[dict[str, Any], str]:
    """Read a settings file that will be rewritten: ({}, "") when missing, error text when unusable."""
    if not path.exists():
        return {}, ""
    try:
        data = json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, ValueError) as exc:
        return {}, f"{path} cannot be parsed ({exc.__class__.__name__}: {exc})"
    if not isinstance(data, dict):
        return {}, f"{path} is not a JSON object"
    return data, ""


LONE_SURROGATE_RE = re.compile(r"[\ud800-\udfff]")


def clean(text: str) -> str:
    """Replace lone surrogates (a transcript string cut mid-emoji) so the text can be encoded."""
    return LONE_SURROGATE_RE.sub("�", text)


def ulen(text: str) -> int:
    """Length in UTF-16 code units, which is how Claude Code measures its 10,000-character hook cap."""
    return len(text.encode("utf-16-le", "surrogatepass")) // 2


def ucut(text: str, limit: int) -> str:
    """Cut to at most `limit` UTF-16 units without splitting a character."""
    if ulen(text) <= limit:
        return text
    out, used = [], 0
    for ch in text:
        used += 2 if ord(ch) > 0xFFFF else 1
        if used > limit:
            break
        out.append(ch)
    return "".join(out)


def write_json_atomic(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), prefix=path.name, suffix=".tmp")
    with os.fdopen(fd, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=1, ensure_ascii=False)
    os.replace(tmp, path)


def write_new(path: Path, text: str) -> Path:
    """Create a file that must not already exist; on a name clash pick the next free suffix."""
    path.parent.mkdir(parents=True, exist_ok=True)
    stem, suffix, n = path.stem, path.suffix, 1
    while True:
        try:
            with open(path, "x", encoding="utf-8", newline="") as fh:
                fh.write(text)
            return path
        except FileExistsError:
            n += 1
            path = path.with_name(f"{stem}-{n}{suffix}")


def claude_home() -> Path:
    return Path(os.environ.get("CLAUDE_CONFIG_DIR") or (Path.home() / ".claude"))


def project_slug(path: Path | str) -> str:
    """Claude Code 2.1.293's project directory name: non-alphanumerics become '-', and names
    over 200 characters are cut there and suffixed with a base-36 Java-style hash of the path."""
    raw = str(path)
    data = raw.encode("utf-16-le")
    units = [int.from_bytes(data[i:i + 2], "little") for i in range(0, len(data), 2)]
    # JavaScript works on UTF-16 units: every unit that is not an ASCII letter or digit becomes '-'.
    slug = "".join(chr(u) if (48 <= u <= 57 or 65 <= u <= 90 or 97 <= u <= 122) else "-" for u in units)
    if len(slug) <= 200:
        return slug
    h = 0
    for unit in units:
        h = (h * 31 + unit) & 0xFFFFFFFF
    if h >= 0x80000000:
        h -= 0x100000000
    n, digits = abs(h), ""
    while True:
        n, r = divmod(n, 36)
        digits = "0123456789abcdefghijklmnopqrstuvwxyz"[r] + digits
        if n == 0:
            break
    return f"{slug[:200]}-{digits}"


def inside(path: str | Path, root: Path) -> bool:
    """True when path resolves to a location within root (symlinks and .. resolved)."""
    try:
        Path(path).resolve().relative_to(root.resolve())
        return True
    except (ValueError, OSError):
        return False


def transcripts_dir(root: Path) -> Path:
    return claude_home() / "projects" / project_slug(root)


def runtime_dir_for(transcript_path: str | None, root: Path) -> Path:
    """Runtime data lives beside the session transcripts, outside the (OneDrive-synced) project."""
    base = Path(transcript_path).parent if transcript_path else transcripts_dir(root)
    return base / "context-system"


def rel(path: str | Path, root: Path) -> str:
    try:
        return Path(path).resolve().relative_to(root.resolve()).as_posix()
    except (ValueError, OSError):
        return str(path)


def utc_stamp() -> str:
    return time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())


# --- configured auto-compaction -----------------------------------------------------------

ONE_MILLION_MODEL_RE = re.compile(r"(?i)opus-(4-[7-9]|[5-9])|sonnet-[5-9]|haiku-5-5|fable")


def _window_from(data: dict[str, Any], model: str | None) -> int | str | None:
    """A number, "auto" (explicitly the model default) or None (this file says nothing)."""
    per_model = ((data.get("modelSettings") or {}).get(model) or {}) if model else {}
    value = per_model.get("autoCompactWindow", data.get("autoCompactWindow"))
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return int(value)
    return "auto" if value == "auto" else None


def compaction_config(root: Path, model: str | None = None) -> dict[str, Any]:
    """What the settings visible to a hook say about auto-compaction.

    Mirrors Claude Code's precedence (managed > env > local > project > user) for the
    files a hook can see. Launch flags (--settings JSON, --autocompact) are invisible
    to hooks, so the result is a configured value, not proof of the session's state.
    """
    notes = ["launch flags (--settings, --autocompact) are not visible to hooks"]
    scopes = [(p, "managed") for p in MANAGED_SETTINGS] + [
        (root / ".claude" / "settings.local.json", "local"),
        (root / ".claude" / "settings.json", "project"),
        (claude_home() / "settings.json", "user"),
    ]
    loaded = [(read_json(p), label) for p, label in scopes if p.is_file()]
    enabled = True
    if os.environ.get("DISABLE_COMPACT") or os.environ.get("DISABLE_AUTO_COMPACT"):
        enabled = False
        notes.append("auto-compaction disabled by environment")
    else:
        for data, label in loaded:
            if isinstance(data.get("autoCompactEnabled"), bool):
                enabled = data["autoCompactEnabled"]
                if not enabled:
                    notes.append(f"autoCompactEnabled=false in {label} settings")
                break
    # 2.1.293 resolver: env var > --autocompact flag > merged settings (managed first) > model default.
    window, source = None, "model-default"
    env = os.environ.get("CLAUDE_CODE_AUTO_COMPACT_WINDOW", "")
    if env.isdigit():
        window, source = int(env), "env"
    else:
        for data, label in loaded:
            window = _window_from(data, model)
            if window is not None:
                source = label
                break
    if window is None or window == "auto":
        window, source = WINDOW_MAX, "model-default"
    window = max(WINDOW_MIN, min(WINDOW_MAX, window))
    if model and not ONE_MILLION_MODEL_RE.search(model) and window > 200_000:
        # Claude Code caps the window at the model's own context window.
        window = 200_000
        notes.append(f"window capped at 200k for {model} (not known to have a 1M context window)")
    threshold = window - COMPACT_RESERVE_TOKENS
    pct = os.environ.get("CLAUDE_AUTOCOMPACT_PCT_OVERRIDE", "")
    if pct.isdigit() and 0 < int(pct) <= 100:
        threshold = min(threshold, int((window - 20000) * int(pct) / 100))
        notes.append(f"CLAUDE_AUTOCOMPACT_PCT_OVERRIDE={pct}")
    return {"enabled": enabled, "window": window, "threshold": threshold, "source": source,
            "model": model, "notes": notes}


def describe_compaction(cc: dict[str, Any]) -> str:
    if not cc["enabled"]:
        return "auto-compaction appears disabled (" + "; ".join(cc["notes"][1:]) + ")"
    return (f"configured to auto-compact once context passes ~{cc['threshold'] // 1000}k tokens "
            f"(autoCompactWindow {cc['window'] // 1000}k from {cc['source']} settings; a single step can "
            f"overshoot it, and launch flags are not visible to this check)")


# --- transcript access ---------------------------------------------------------------------

def iter_lines(path: str | Path, needles: list[str] | None = None) -> Iterator[tuple[int, str, dict[str, Any]]]:
    """Yield (line number, raw line, record); with needles, skip lines containing none of them."""
    with open(path, encoding="utf-8", errors="replace") as fh:
        for n, line in enumerate(fh):
            if needles:
                low = line.lower()
                if not any(nd in low for nd in needles):
                    continue
            try:
                rec = json.loads(line)
            except ValueError:
                continue
            if isinstance(rec, dict):
                yield n, line, rec


def is_compact_boundary(rec: dict[str, Any]) -> bool:
    return rec.get("type") == "system" and rec.get("subtype") == "compact_boundary"


def count_boundaries(transcript: str | Path) -> int:
    """Number of compactions recorded in a transcript (fast byte scan, then exact parse)."""
    count = 0
    try:
        with open(transcript, "rb") as fh:
            for line in fh:
                if BOUNDARY_MARK in line:
                    try:
                        if is_compact_boundary(json.loads(line)):
                            count += 1
                    except ValueError:
                        pass
    except OSError:
        return 0
    return count


def usage_tokens(rec: dict[str, Any]) -> int:
    """Context size of an assistant API call (input incl. cache), 0 for anything else."""
    if rec.get("type") != "assistant":
        return 0
    msg = rec.get("message") or {}
    if msg.get("model") == "<synthetic>":
        return 0
    u = msg.get("usage") or {}
    return int((u.get("input_tokens") or 0) + (u.get("cache_read_input_tokens") or 0)
               + (u.get("cache_creation_input_tokens") or 0))


def content_chars(rec: dict[str, Any]) -> int:
    content = (rec.get("message") or {}).get("content")
    if content is None and isinstance(rec.get("attachment"), dict):
        return len(json.dumps(rec["attachment"], ensure_ascii=False))
    if isinstance(content, str):
        return len(content)
    return _block_chars(content)


IMAGE_CHARS = 3600  # an image costs roughly 1.5k tokens whatever its base64 size


def _block_chars(value: Any) -> int:
    """Text length of message content; images and documents count a flat amount, not their base64."""
    if isinstance(value, str):
        return len(value)
    if isinstance(value, list):
        return sum(_block_chars(v) for v in value)
    if not isinstance(value, dict):
        return 0
    if value.get("type") in ("image", "document"):
        return IMAGE_CHARS
    total = len(value["text"]) if isinstance(value.get("text"), str) else 0
    if value.get("content") is not None:
        total += _block_chars(value["content"])
    if value.get("input") is not None:
        total += len(json.dumps(value["input"], ensure_ascii=False))
    return total


def tail_status(transcript_path: str | Path, tail_bytes: int = 2_000_000) -> dict[str, Any]:
    """Estimate the next request's context and the session model from the transcript tail.

    The tail grows until it contains an API usage record or a compaction boundary (or the
    whole file), so one very long final line cannot hide the real size.
    """
    result = {"tokens": 0, "model": None, "at_boundary": False, "api_error": False}
    try:
        size = os.path.getsize(transcript_path)
    except OSError:
        return result
    while True:
        result = _tail_scan(transcript_path, size, tail_bytes)
        if result.pop("anchored") or tail_bytes >= size or tail_bytes >= 128_000_000:
            return result
        tail_bytes *= 4


def _tail_scan(transcript_path: str | Path, size: int, tail_bytes: int) -> dict[str, Any]:
    result = {"tokens": 0, "model": None, "anchored": False, "at_boundary": False, "api_error": False}
    try:
        with open(transcript_path, "rb") as fh:
            fh.seek(max(0, size - tail_bytes))
            chunk = fh.read().decode("utf-8", errors="replace")
    except OSError:
        result["anchored"] = True
        return result
    lines = chunk.split("\n")  # not splitlines(): U+2028/U+2029 inside JSON strings are not record breaks
    if size > tail_bytes and lines:
        lines = lines[1:]  # first line is probably partial
    extra_chars = 0
    for line in reversed(lines):
        try:
            rec = json.loads(line)
        except ValueError:
            continue
        if not isinstance(rec, dict):
            continue
        if is_compact_boundary(rec):
            # No API call has been recorded since the last compaction boundary.
            result.update(tokens=int(extra_chars / CHARS_PER_TOKEN), anchored=True, at_boundary=True)
            return result
        base = usage_tokens(rec)
        if base:
            msg = rec.get("message") or {}
            out = int((msg.get("usage") or {}).get("output_tokens") or 0)
            result.update(tokens=base + out + int(extra_chars / CHARS_PER_TOKEN), model=msg.get("model"),
                          anchored=True)
            return result
        if rec.get("type") == "assistant" and (rec.get("isApiErrorMessage")
                                               or (rec.get("message") or {}).get("model") == "<synthetic>"):
            result["api_error"] = True  # the main thread's last request failed (e.g. prompt too long)
        if rec.get("type") in ("user", "attachment"):
            extra_chars += content_chars(rec)
    result["tokens"] = int(extra_chars / CHARS_PER_TOKEN)
    return result
