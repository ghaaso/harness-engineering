import json, re, sys, os
B, X = sys.argv[1], sys.argv[2]
seen = set()
for f in ["sealed/tq_writer/answers.jsonl", "sealed/tq_second/answers.jsonl"]:
    for l in open(os.path.join(B, f), encoding="utf-8"):
        r = json.loads(l); a = r["answer"]
        its = a if isinstance(a, list) else [x for v in a.values() for x in (v if isinstance(v, list) else [v])]
        for x in its:
            if isinstance(x, str) and "::" in x: seen.add((r["id"], x))
for qid, x in sorted(seen):
    path, sym = x.split("::", 1)
    fp = os.path.join(X, path)
    if not os.path.exists(fp): print("MISSING FILE", qid, x); continue
    src = open(fp, encoding="utf-8", errors="replace").read()
    parts = sym.split(".")
    top = parts[0]
    pat = r"^(export\s+)?(default\s+)?(async\s+)?(function\*?\s+%s\b|const\s+%s\b|let\s+%s\b|class\s+%s\b|def\s+%s\b|async\s+def\s+%s\b)" % ((re.escape(top),)*6)
    m = re.search(pat, src, re.M)
    if not m: print("NOT TOP-LEVEL", qid, x)
    elif len(parts) > 1:
        if not re.search(r"\b%s\b" % re.escape(parts[-1]), src): print("INNER NOT FOUND", qid, x)
print("checked", len(seen))
