import json, os, subprocess, collections, datetime

CACHE = "C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build/facts/cache"
REPO = "C:/Users/User/Documents/projects/EMS_workshop1"
FROZEN = "a31924a3818f4ac94b695906d107c72c912792b2"

def git(*a):
    return subprocess.run(["git", "-C", REPO] + list(a), capture_output=True, text=True).stdout

def load(sha):
    d = {}
    for l in open(os.path.join(CACHE, sha, "nodes.jsonl"), encoding="utf-8"):
        n = json.loads(l)
        d[n["id"]] = n
    return d

def nat(n):
    k = n["kind"]
    if k in ("function", "method", "class", "component", "test"):
        return ("sig", n["kind"], n["name"], n.get("signature"))
    if k == "doc_section":
        return ("sec", n["path"], n["name"])
    if k == "invariant":
        return ("inv", n["name"])
    if k == "client_url_site":
        return ("url", n["path"], n["name"])
    return ("id", n["id"])

anc = []
for sha in os.listdir(CACHE):
    r = subprocess.run(["git", "-C", REPO, "merge-base", "--is-ancestor", sha, FROZEN], capture_output=True)
    if r.returncode == 0 and sha != FROZEN:
        t = int(git("show", "-s", "--format=%ct", sha).strip())
        anc.append((t, sha))
anc.sort()
tf = int(git("show", "-s", "--format=%ct", FROZEN).strip())
fz = load(FROZEN)
fz_ids = set(fz)
fz_nat = collections.defaultdict(set)
for n in fz.values():
    fz_nat[nat(n)].add(n["id"])
print("ancestor snapshots", len(anc))
KINDS = ["function", "method", "class", "component", "test", "doc_section", "invariant", "client_url_site", "file"]
# pick ~8 snapshots spread over time
idxs = sorted(set(int(i * (len(anc) - 1) / 7) for i in range(8)))
for i in idxs:
    t, sha = anc[i]
    old = load(sha)
    age = (tf - t) / 86400
    row = []
    for k in KINDS:
        tot = same = recov = bound_wrong = 0
        for n in old.values():
            if n["kind"] != k:
                continue
            tot += 1
            if n["id"] in fz_ids:
                same += 1
                # silent mis-binding: id survives but the natural key differs
                if k in ("doc_section", "invariant", "client_url_site"):
                    if nat(fz[n["id"]]) != nat(n):
                        bound_wrong += 1
            else:
                if nat(n) in fz_nat and nat(n)[0] != "id":
                    recov += 1
        if tot:
            row.append("%s: n=%d id-survives=%.1f%% (of which mis-bound %.1f%%) recoverable-by-natural-key=%.1f%% lost=%.1f%%" % (
                k, tot, 100 * same / tot, 100 * bound_wrong / max(same, 1), 100 * recov / tot, 100 * (tot - same - recov) / tot))
    print("\n== snapshot %s age %.0f days before frozen" % (sha[:8], age))
    print("\n".join(row))
