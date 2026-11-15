"""Count lookup calls in this repo's recorded sessions and the search->read pairs they supply.

  python -I session_lookups.py <projects_dir> <out.json>
Scans every *.jsonl under folders whose names contain 'EMS-workshop1'. Zero model tokens.
Zones of a target path (relative to the repo root or a worktree root):
  code      backend/ src/ technician-app/ ops-server.mjs with a code extension
  repo_doc  tracked-style docs: CLAUDE.md, ARCHITECTURE.md, README.md, docs/*.md outside docs/program
  program   docs/program/**
  other_in_repo, outside (scratchpad, temp, other projects)
A search->read pair: a Grep/Glob call (or a Bash grep/rg/find/git grep) whose tool_result text names a
repo file that the same transcript Reads within the next 6 tool calls. The pair is a candidate lookup
task: query = the search pattern, reference = the file(s) opened. Opened is not the same as needed.
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
    if low.endswith(".md") and (low.startswith("docs/") or "/" not in low):
        return "repo_doc"
    return "other_in_repo"


BASH_SEARCH = re.compile(r"(^|[|;&\s])(grep|rg|git grep|find|ls)\b")
stats = collections.Counter()
zones = collections.defaultdict(collections.Counter)
pairs = []
files = 0
sessions_with_code_read = 0
for d in os.listdir(ROOT):
    if "EMS-workshop1" not in d:
        continue
    for dp, _, fns in os.walk(os.path.join(ROOT, d)):
        for fn in fns:
            if not fn.endswith(".jsonl"):
                continue
            files += 1
            calls = []  # (id, name, input)
            results = {}
            try:
                fh = open(os.path.join(dp, fn), encoding="utf-8", errors="replace")
            except OSError:
                continue
            with fh:
                for line in fh:
                    if '"tool_use"' not in line and '"tool_result"' not in line:
                        continue
                    try:
                        o = json.loads(line)
                    except ValueError:
                        continue
                    msg = o.get("message") or {}
                    content = msg.get("content")
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
            read_code = False
            for i, (cid, name, inp) in enumerate(calls):
                stats["calls"] += 1
                if name == "Read":
                    z = zone(rel(inp.get("file_path")))
                    zones["Read"][z] += 1
                    read_code |= z == "code"
                elif name in ("Grep", "Glob"):
                    z = zone(rel(inp.get("path"))) if inp.get("path") else "repo_root_or_cwd"
                    zones[name][z] += 1
                elif name == "Bash" and BASH_SEARCH.search(inp.get("command", "") or ""):
                    zones["BashSearch"]["any"] += 1
                elif name in ("Edit", "Write"):
                    zones[name][zone(rel(inp.get("file_path")))] += 1
                if name in ("Grep", "Glob") or (name == "Bash" and BASH_SEARCH.search(inp.get("command", "") or "")):
                    res = results.get(cid, "") or ""
                    opened = []
                    for cid2, name2, inp2 in calls[i + 1:i + 7]:
                        if name2 == "Read":
                            r2 = rel(inp2.get("file_path"))
                            if r2 and r2.rsplit("/", 1)[-1] in res:
                                opened.append(r2)
                    if opened:
                        q = inp.get("pattern") or inp.get("command", "")[:200]
                        pairs.append({"tool": name, "query": q, "opened": sorted(set(opened)),
                                      "zones": sorted({zone(o) for o in opened}), "transcript": fn})
            sessions_with_code_read += read_code

pz = collections.Counter(z for p in pairs for z in p["zones"])
distinct_q = len({(p["query"], tuple(p["opened"])) for p in pairs})
summary = {"transcript_files": files, "tool_calls": stats["calls"],
           "by_tool_zone": {k: dict(v) for k, v in zones.items()},
           "transcripts_reading_product_code": sessions_with_code_read,
           "search_read_pairs": len(pairs), "distinct_query_answer_pairs": distinct_q,
           "pairs_by_zone_of_opened_file": dict(pz)}
json.dump({"summary": summary, "pairs": pairs}, open(OUT, "w", encoding="utf-8"), indent=1)
print(json.dumps(summary, indent=1))
