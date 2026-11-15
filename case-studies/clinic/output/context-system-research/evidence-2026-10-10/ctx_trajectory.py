"""Quick context-size trajectory for Claude Code main-session transcripts.

Context size per assistant turn = input_tokens + cache_read + cache_creation.
Usage: python -I ctx_trajectory.py <transcript.jsonl> [...]
"""
import json
import sys
from pathlib import Path


def analyse(path: Path) -> None:
    turns = []
    compactions = []
    first_user = None
    model = None
    last_ctx_by_msg = {}
    with path.open(encoding="utf-8") as fh:
        for n, line in enumerate(fh):
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue
            t = rec.get("type")
            if t == "system" and rec.get("subtype") in ("compact_boundary", "microcompact_boundary"):
                meta = rec.get("compactMetadata") or rec.get("microcompactMetadata") or {}
                compactions.append((len(turns), rec.get("subtype"), meta, rec.get("timestamp")))
            if rec.get("isCompactSummary"):
                compactions.append((len(turns), "summary-msg", {}, rec.get("timestamp")))
            if t == "user" and first_user is None and not rec.get("isMeta"):
                c = rec.get("message", {}).get("content")
                if isinstance(c, str):
                    first_user = c[:160]
                elif isinstance(c, list):
                    for b in c:
                        if isinstance(b, dict) and b.get("type") == "text":
                            first_user = b["text"][:160]
                            break
            if t == "assistant":
                msg = rec.get("message", {})
                u = msg.get("usage") or {}
                ctx = (u.get("input_tokens") or 0) + (u.get("cache_read_input_tokens") or 0) + (u.get("cache_creation_input_tokens") or 0)
                if ctx:
                    model = msg.get("model", model)
                    mid = msg.get("id")
                    if mid in last_ctx_by_msg:
                        continue
                    last_ctx_by_msg[mid] = ctx
                    turns.append((ctx, rec.get("timestamp")))
    if not turns:
        print(f"{path.name}: no usage")
        return
    peak = max(turns, key=lambda x: x[0])
    print(f"== {path.name}  model={model}  api_turns={len(turns)}  peak={peak[0]:,} at {peak[1]}")
    print(f"   first prompt: {first_user!r}")
    print(f"   start={turns[0][1]}  end={turns[-1][1]}")
    # coarse trajectory: every ~5% of turns
    step = max(1, len(turns) // 20)
    traj = [f"{turns[i][0]//1000}k" for i in range(0, len(turns), step)]
    print("   trajectory:", " ".join(traj), f"... last={turns[-1][0]//1000}k")
    for idx, kind, meta, ts in compactions:
        pre = meta.get("preTokens") or meta.get("pre_tokens")
        trig = meta.get("trigger")
        before = turns[idx - 1][0] if idx > 0 else None
        after = turns[idx][0] if idx < len(turns) else None
        print(f"   compaction[{kind}] at turn {idx} ts={ts} trigger={trig} preTokens={pre} ctx_before={before} ctx_after={after}")


for arg in sys.argv[1:]:
    analyse(Path(arg))
