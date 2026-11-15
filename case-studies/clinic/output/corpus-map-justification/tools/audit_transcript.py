"""Isolation audit: list every tool call an agent made, from its transcript.

Usage: python audit_transcript.py TRANSCRIPT.jsonl [--forbid SUBSTRING ...] [--brief]
Prints each tool call (name + main argument). With --forbid, exits 1 if any tool-call
input mentions a forbidden path fragment (case-insensitive, slashes normalised).
"""
import argparse
import json
import pathlib
import sys


def calls(path):
    for line in pathlib.Path(path).read_text(encoding="utf-8").splitlines():
        try:
            rec = json.loads(line)
        except json.JSONDecodeError:
            continue
        msg = rec.get("message") or {}
        content = msg.get("content") if isinstance(msg, dict) else None
        if not isinstance(content, list):
            continue
        for block in content:
            if isinstance(block, dict) and block.get("type") == "tool_use":
                yield block.get("name"), block.get("input") or {}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("transcript")
    ap.add_argument("--forbid", nargs="*", default=[])
    ap.add_argument("--brief", action="store_true")
    a = ap.parse_args()
    forbid = [f.lower().replace("\\", "/") for f in a.forbid]
    hits, n = [], 0
    for name, inp in calls(a.transcript):
        n += 1
        flat = json.dumps(inp, ensure_ascii=False).lower().replace("\\\\", "/").replace("\\", "/")
        bad = [f for f in forbid if f in flat]
        if bad:
            hits.append((name, bad))
        if not a.brief or bad:
            main_arg = next((str(inp[k]) for k in ("file_path", "path", "pattern", "command", "query", "url", "prompt")
                             if k in inp), json.dumps(inp)[:120])
            print(f"{'FORBIDDEN ' if bad else ''}{name}: {main_arg[:220]}")
    print(f"-- {n} tool calls; {len(hits)} touching forbidden paths")
    sys.exit(1 if hits else 0)


if __name__ == "__main__":
    main()
