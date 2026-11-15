import json, os, subprocess, collections, difflib, sys, re
CACHE = "C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build/facts/cache"
REPO = "C:/Users/User/Documents/projects/EMS_workshop1"
FR = "a31924a3818f4ac94b695906d107c72c912792b2"
KIND = ("function", "method", "class", "component")
def load(sha):
    d = {}
    for l in open(os.path.join(CACHE, sha, "nodes.jsonl"), encoding="utf-8"):
        n = json.loads(l); d[n["id"]] = n
    return d
_fc = {}
def filetext(sha, path):
    k = (sha, path)
    if k not in _fc:
        r = subprocess.run(["git", "-C", REPO, "show", "%s:%s" % (sha, path)], capture_output=True)
        _fc[k] = r.stdout.decode("utf-8", "replace").splitlines() if r.returncode == 0 else None
    return _fc[k]
def body(sha, n):
    t = filetext(sha, n["path"])
    if t is None or not n.get("line_start"): return None
    b = "\n".join(t[n["line_start"] - 1:n["line_end"]])
    return re.sub(r"\s+", " ", b)
fz = load(FR)
cands = collections.defaultdict(list)
for n in fz.values():
    if n["kind"] in KIND and n.get("line_start"):
        b = body(FR, n)
        if b and len(b) > 40: cands[n["kind"]].append((n, b))
for pre in sys.argv[1:]:
    full = [d for d in os.listdir(CACHE) if d.startswith(pre)][0]
    old = load(full)
    c = collections.Counter(); ex = []
    for n in old.values():
        if n["kind"] not in KIND or n["id"] in fz: continue
        c["lost"] += 1
        bo = body(full, n)
        if not bo or len(bo) <= 40:
            c["too_small_or_unreadable"] += 1; continue
        best = (0, None)
        for m, bm in cands[n["kind"]]:
            if abs(len(bm) - len(bo)) > 0.6 * max(len(bm), len(bo)): continue
            s = difflib.SequenceMatcher(None, bo, bm, autojunk=False)
            if s.real_quick_ratio() < 0.5 or s.quick_ratio() < 0.5: continue
            r = s.ratio()
            if r > best[0]: best = (r, m)
        r = best[0]
        if r >= 0.8:
            c["ge08"] += 1
            c["ge08_diffname"] += (best[1]["name"] != n["name"])
            c["ge08_samefile"] += (best[1]["path"] == n["path"])
        elif r >= 0.5: c["body_match 0.5-0.8 (probable, rewritten)"] += 1
        else: c["no_match<0.5 (deleted or rewritten)"] += 1
        if r >= 0.8 and len(ex) < 3: ex.append((n["name"], best[1]["name"], round(r, 2), n["path"] == best[1]["path"]))
    print(pre, dict(c)); print(" examples (old name, new name, ratio, same file):", ex)
