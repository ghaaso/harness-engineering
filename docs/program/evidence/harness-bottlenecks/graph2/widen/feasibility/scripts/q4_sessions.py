"""Q4/Q5: re-count lookups in this repo's recorded sessions, now (read-only scan of local transcripts).

Extends the earlier scoring lane's session_lookups.py (same zones, same pair rule) with:
  - per-folder and per-month counts, product-code edits, reads per document path (for Q5);
  - search calls by kind; pairs by zone; the free-text share.
Usage: python -I q4_sessions.py <projects_dir> <out.json>
Zero model tokens; nothing leaves the machine.
"""
import json, os, re, sys, collections

ROOT, OUT = sys.argv[1], sys.argv[2]
REPO_MARK = re.compile(r"(?i)EMS_workshop1(?:[\\/]\.claude[\\/]worktrees[\\/][^\\/]+)?[\\/](.*)$")
CODE_EXT = (".py", ".js", ".jsx", ".ts", ".tsx", ".mjs")


def rel(p):
    if not isinstance(p, str):
        return None
    m = REPO_MARK.search(p.replace("/", "\\"))
    if not m:
        return None
    return m.group(1).replace("\\", "/")


def zone(r):
    if r is None:
        return "outside"
    low = r.lower()
    if (low.startswith(("backend/", "src/", "technician-app/")) or low == "ops-server.mjs") and low.endswith(CODE_EXT):
        return "code"
    if low.startswith("docs/program/"):
        return "program"
    if low.endswith(".md") and (low.startswith("docs/") or "/" not in low or low.startswith(("backend/", "technician-app/", ".github/"))):
        return "repo_doc"
    return "other_in_repo"


BASH_SEARCH = re.compile(r"(^|[|;&\s])(grep|rg|git grep|find|ls)\b")
tot = collections.Counter()
zones = collections.defaultdict(collections.Counter)
per_folder = collections.defaultdict(collections.Counter)
months = collections.Counter()
doc_reads = collections.Counter()
doc_read_sessions = collections.defaultdict(set)
pairs = []
code_edit_sessions = set()
for d in sorted(os.listdir(ROOT)):
    if "EMS-workshop1" not in d:
        continue
    short = d.split("worktrees-")[-1] if "worktrees-" in d else "(main checkout)"
    for dp, _, fns in os.walk(os.path.join(ROOT, d)):
        for fn in fns:
            if not fn.endswith(".jsonl"):
                continue
            per_folder[short]["transcripts"] += 1
            tot["transcripts"] += 1
            calls, results = [], {}
            first_ts = None
            try:
                fh = open(os.path.join(dp, fn), encoding="utf-8", errors="replace")
            except OSError:
                continue
            with fh:
                for line in fh:
                    if first_ts is None and '"timestamp"' in line:
                        m = re.search(r'"timestamp":"(\d{4}-\d{2})', line)
                        if m:
                            first_ts = m.group(1)
                    if '"tool_use"' not in line and '"tool_result"' not in line:
                        continue
                    try:
                        o = json.loads(line)
                    except ValueError:
                        continue
                    content = (o.get("message") or {}).get("content")
                    if not isinstance(content, list):
                        continue
                    for c in content:
                        if not isinstance(c, dict):
                            continue
                        if c.get("type") == "tool_use":
                            calls.append((c.get("id"), c.get("name"), c.get("input") or {}))
                        elif c.get("type") == "tool_result":
                            t = c.get("content")
                            if isinstance(t, list):
                                t = " ".join(x.get("text", "") for x in t if isinstance(x, dict))
                            results[c.get("tool_use_id")] = t if isinstance(t, str) else ""
            months[first_ts or "unknown"] += 1
            sid = os.path.join(d, fn)
            for i, (cid, name, inp) in enumerate(calls):
                tot["calls"] += 1
                per_folder[short]["calls"] += 1
                is_search = name in ("Grep", "Glob") or (name == "Bash" and BASH_SEARCH.search(inp.get("command", "") or ""))
                if name == "Read":
                    r = rel(inp.get("file_path"))
                    z = zone(r)
                    zones["Read"][z] += 1
                    per_folder[short]["read_" + z] += 1
                    if z in ("repo_doc", "program"):
                        doc_reads[r] += 1
                        doc_read_sessions[r].add(sid)
                elif name in ("Grep", "Glob"):
                    z = zone(rel(inp.get("path"))) if inp.get("path") else "repo_root_or_cwd"
                    zones[name][z] += 1
                elif name == "Bash" and is_search:
                    zones["BashSearch"]["any"] += 1
                elif name in ("Edit", "Write", "MultiEdit"):
                    z = zone(rel(inp.get("file_path")))
                    zones["Edit/Write"][z] += 1
                    per_folder[short]["edit_" + z] += 1
                    if z == "code":
                        code_edit_sessions.add(sid)
                if is_search:
                    res = results.get(cid, "") or ""
                    opened = []
                    for cid2, name2, inp2 in calls[i + 1:i + 7]:
                        if name2 == "Read":
                            r2 = rel(inp2.get("file_path"))
                            if r2 and r2.rsplit("/", 1)[-1] in res:
                                opened.append(r2)
                    if opened:
                        q = inp.get("pattern") or (inp.get("command", "") or "")[:200]
                        pairs.append({"tool": name, "query": q, "opened": sorted(set(opened)),
                                      "zones": sorted({zone(o) for o in opened}), "folder": short, "month": first_ts})

distinct = {}
for p in pairs:
    distinct.setdefault((p["query"], tuple(p["opened"])), p)
dz = collections.Counter()
for p in distinct.values():
    for z in p["zones"]:
        dz[z] += 1
pz = collections.Counter(z for p in pairs for z in p["zones"])
summary = {
    "transcript_files": tot["transcripts"], "tool_calls": tot["calls"], "transcripts_by_first_month": dict(months),
    "by_tool_zone": {k: dict(v) for k, v in zones.items()},
    "transcripts_editing_product_code": len(code_edit_sessions),
    "search_read_pairs": len(pairs), "distinct_query_answer_pairs": len(distinct),
    "pairs_by_zone_of_opened_file": dict(pz), "distinct_pairs_by_zone_of_opened_file": dict(dz),
    "per_folder": {k: dict(v) for k, v in per_folder.items()},
}
top_docs = [{"path": k, "reads": v, "sessions": len(doc_read_sessions[k])} for k, v in doc_reads.most_common()]
json.dump({"summary": summary, "doc_reads": top_docs, "pairs": list(distinct.values())}, open(OUT, "w", encoding="utf-8"), indent=1)
print(json.dumps(summary, indent=1))
