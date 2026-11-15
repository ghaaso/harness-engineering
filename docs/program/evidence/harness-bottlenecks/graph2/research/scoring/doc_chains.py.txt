"""Count documented defect chains / invariants and the files each one names.

  python -I doc_chains.py <repo> <out.json>
Items: lifecycle-audit '### N.' sections and the test-gap section; HANDOFF section 4 bold items
(**A1.** etc.), 4.4 table rows and 4.5 numbered contradictions; CLAUDE.md bullets under
'## Invariants'. A named file = a backticked token with a code/doc extension, optionally :line,
resolved against `git ls-files main` by full path or unique basename. Zero model tokens.
"""
import json, re, subprocess, sys, collections

REPO, OUT = sys.argv[1], sys.argv[2]
files = subprocess.run(["git", "-C", REPO, "ls-tree", "-r", "--name-only", "main"], capture_output=True,
                       text=True, check=True).stdout.split()
by_base = collections.defaultdict(list)
for f in files:
    by_base[f.rsplit("/", 1)[-1]].append(f)

TOK = re.compile(r"`([^`]+)`")
FILE = re.compile(r"([A-Za-z0-9_./\-\[\]{}]+\.(?:py|tsx|ts|jsx|json|js|mjs|md|toml|sh|yml))(?::[\d\-/:]+)?")


def runtime(p):
    if p.startswith("backend/"):
        return "backend"
    if p.startswith("technician-app/"):
        return "mobile"
    if p.startswith("src/") or p == "ops-server.mjs":
        return "web"
    return "other"


def resolve(name, ctx_dirs):
    name = name.lstrip("./")
    if name in files:
        return name, "exact"
    hits = [f for f in files if f.endswith("/" + name)]
    if len(hits) == 1:
        return hits[0], "suffix"
    if len(hits) > 1:
        # prefer one sharing a directory with something already resolved in the item
        pref = [h for h in hits if any(h.startswith(d) for d in ctx_dirs)]
        if len(pref) == 1:
            return pref[0], "suffix+ctx"
        return None, f"ambiguous({len(hits)})"
    return None, "missing"


def names_in(text):
    out = []
    for t in TOK.findall(text):
        for m in FILE.finditer(t):
            out.append(m.group(1))
    # also bare tokens like TravelScreen.tsx:117 outside backticks
    for m in re.finditer(r"(?<![`/\w.-])([A-Za-z0-9_]+\.(?:py|tsx|ts|jsx|js|mjs))(?::\d+)", text):
        out.append(m.group(1))
    return list(dict.fromkeys(out))


def items_lifecycle(txt):
    parts = re.split(r"\n(?=### |## Test-layer|## Deferred)", txt)
    return [(p.splitlines()[0][:80], p) for p in parts if p.startswith(("### ", "## Test-layer"))]


def items_handoff(txt):
    s4 = txt.split("## 4. Issue register", 1)[1].split("## 5. Unfinished", 1)[0]
    items = []
    for m in re.finditer(r"\*\*([A-C]\d)\. (.*?)(?=\n\*\*[A-C]\d\. |\n### |\Z)", s4, re.S):
        items.append((m.group(1) + " " + m.group(2)[:60], m.group(0)))
    tbl = s4.split("### 4.4", 1)[1].split("### 4.5", 1)[0]
    for row in tbl.splitlines():
        if row.startswith("| ") and not row.startswith("| Slice") and not row.startswith("| ---"):
            items.append(("4.4 " + row[:70], row))
    c45 = s4.split("### 4.5", 1)[1]
    for m in re.finditer(r"\n(\d)\. (.*?)(?=\n\d\. |\Z)", c45, re.S):
        items.append(("4.5." + m.group(1) + " " + m.group(2)[:60], m.group(0)))
    return items


def items_claude(txt):
    inv = txt.split("## Invariants you must respect", 1)[1].split("\n## Where things live", 1)[0]
    out = []
    for m in re.finditer(r"\n- (.*?)(?=\n- |\n### |\Z)", inv, re.S):
        out.append((m.group(1)[:70], m.group(0)))
    return out


def read(p):
    return subprocess.run(["git", "-C", REPO, "show", f"main:{p}"], capture_output=True, text=True,
                          encoding="utf-8", errors="replace", check=True).stdout


res = {}
for label, path, fn in [("lifecycle_audit", "docs/lifecycle-audit-followups-2026-07.md", items_lifecycle),
                        ("handoff_s4", "docs/HANDOFF-2026-07-28-open-work.md", items_handoff),
                        ("claude_md_invariants", "CLAUDE.md", items_claude)]:
    try:
        txt = read(path)
    except subprocess.CalledProcessError:
        txt = open(f"{REPO}/{path}", encoding="utf-8").read()
    rows = []
    for title, body in fn(txt):
        names = names_in(body)
        resolved, unresolved = [], []
        dirs = set()
        for n in names:
            r, how = resolve(n, dirs)
            if r:
                resolved.append(r)
                dirs.add(r.rsplit("/", 1)[0] + "/")
            else:
                unresolved.append(f"{n}:{how}")
        resolved = list(dict.fromkeys(resolved))
        code = [r for r in resolved if not r.endswith(".md")]
        rts = sorted({runtime(r) for r in code} - {"other"})
        rows.append({"item": title, "named": len(names), "resolved_code": code, "unresolved": unresolved,
                     "runtimes": rts, "body": body})
    n = len(rows)
    res[label] = {
        "items": n,
        "items_naming_ge1_code_file": sum(len(r["resolved_code"]) >= 1 for r in rows),
        "items_naming_ge2_code_files": sum(len(r["resolved_code"]) >= 2 for r in rows),
        "items_cross_runtime": sum(len(r["runtimes"]) >= 2 for r in rows),
        "distinct_code_files_named": len({f for r in rows for f in r["resolved_code"]}),
        "unresolved_names": sum(len(r["unresolved"]) for r in rows),
        "rows": rows,
    }
json.dump(res, open(OUT, "w", encoding="utf-8"), indent=1)
for k, v in res.items():
    print(k, {kk: vv for kk, vv in v.items() if kk != "rows"})
