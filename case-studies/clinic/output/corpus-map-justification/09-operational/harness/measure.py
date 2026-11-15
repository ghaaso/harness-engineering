"""Measure agent runs from workflow transcripts: context consumed, tool calls, tokens; and audit file access.

Usage: python -I -B measure.py TRANSCRIPT_DIR [TRANSCRIPT_DIR ...] --out OUT.json [--workspace-root ROOT]
For every agent-*.jsonl (label from its .meta.json description):
  material_chars / material_tokens  total characters of tool results (what the agent read through tools) / 4
  tool_calls                         number of tool_use blocks
  peak_context_tokens                largest (input + cache_creation + cache_read) of any model call
  total_input_tokens / output_tokens summed over distinct model calls (cache reads included in input)
  baseline_context_tokens            context of the first model call (harness system prompt, instructions, tools)
  paths                              file paths named in tool inputs; outside_workspace lists those outside the
                                     agent's workspace (when --workspace-root is given, ROOT/<label>/ is its workspace)
"""
import argparse
import json
import re
from pathlib import Path

PATH_RE = re.compile(r"[A-Za-z]:[\\/][^\s\"'|;,)]+|(?<![\w.])(?:output|tmp|docs|sources|archive)[\\/][^\s\"'|;,)]+")


def text_len(content):
    if isinstance(content, str):
        return len(content)
    n = 0
    for b in content or []:
        if b.get("type") == "text":
            n += len(b.get("text", ""))
        elif b.get("type") == "tool_result":
            n += text_len(b.get("content"))
        else:
            n += len(json.dumps(b))
    return n


def measure(path):
    rows = [json.loads(l) for l in path.read_text(encoding="utf-8").splitlines() if l.strip()]
    by_call, tool_calls, material, paths, final = {}, 0, 0, [], ""
    for r in rows:
        m = r.get("message") or {}
        if r.get("type") == "assistant":
            mid = m.get("id") or r.get("uuid")
            u = m.get("usage") or {}
            if u:                       # one call may be logged as several entries; the last carries final usage
                by_call[mid] = u
            for b in m.get("content") or []:
                if b.get("type") == "tool_use":
                    tool_calls += 1
                    paths += PATH_RE.findall(json.dumps(b.get("input"), ensure_ascii=False).replace("\\\\", "\\"))
                if b.get("type") == "text":
                    final = b.get("text", "")
        elif r.get("type") == "user" and isinstance(m.get("content"), list):
            for b in m["content"]:
                if b.get("type") == "tool_result":
                    material += text_len(b.get("content"))
    calls = list(by_call.values())
    ctx = [u.get("input_tokens", 0) + u.get("cache_creation_input_tokens", 0) + u.get("cache_read_input_tokens", 0) for u in calls]
    return {"model_calls": len(calls), "tool_calls": tool_calls, "material_chars": material, "material_tokens": round(material / 4),
            "baseline_context_tokens": ctx[0] if ctx else 0, "peak_context_tokens": max(ctx) if ctx else 0,
            "total_input_tokens": sum(ctx), "output_tokens": sum(u.get("output_tokens", 0) for u in calls),
            "paths": sorted(set(paths)), "final_text_chars": len(final)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dirs", nargs="+")
    ap.add_argument("--out", required=True)
    ap.add_argument("--workspace-root", default=None)
    ap.add_argument("--allow", action="append", default=[], help="path prefixes always allowed (tools, python)")
    a = ap.parse_args()
    out = {}
    for d in map(Path, a.dirs):
        for f in sorted(d.glob("agent-*.jsonl")):
            meta = json.loads((f.with_suffix("").with_suffix(".meta.json")).read_text(encoding="utf-8")) \
                if f.with_suffix("").with_suffix(".meta.json").exists() else {}
            label = meta.get("description") or f.stem
            r = measure(f)
            r["transcript"] = str(f)
            if a.workspace_root:
                ws = str(Path(a.workspace_root) / label.split(":")[-1]).replace("/", "\\").lower()
                allow = [p.replace("/", "\\").lower() for p in a.allow]
                r["outside_workspace"] = [p for p in r["paths"] if p.replace("/", "\\").lower().startswith(("c:\\", "output", "tmp", "docs", "sources", "archive"))
                                          and not p.replace("/", "\\").lower().startswith(tuple([ws] + allow))]
            out[label] = r
    Path(a.out).write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
    for k, v in out.items():
        print(f"{k}: tools {v['tool_calls']}, material {v['material_tokens']} tok, peak ctx {v['peak_context_tokens']}, "
              f"input {v['total_input_tokens']}, output {v['output_tokens']}" + (f", OUTSIDE {len(v['outside_workspace'])}" if v.get("outside_workspace") else ""))


if __name__ == "__main__":
    main()
