import json, os, sys, subprocess, collections

CACHE = "C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build/facts/cache"
REPO = "C:/Users/User/Documents/projects/EMS_workshop1"

out = subprocess.run(["git", "-C", REPO, "log", "--all", "--format=%H %P"], capture_output=True, text=True).stdout
parents = {}
for line in out.splitlines():
    p = line.split()
    if p:
        parents[p[0]] = p[1:]
cached = set(os.listdir(CACHE))
pairs = []
for c in cached:
    ps = parents.get(c, [])
    if ps and ps[0] in cached and len(ps) == 1:
        pairs.append((ps[0], c))
print("cache folders", len(cached), "linear pairs where parent also cached", len(pairs))

KINDS = ["function", "method", "class", "component", "test", "constant", "column", "doc_section", "invariant", "doc_id", "client_url_site", "route", "setting", "file"]

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
    if k in ("invariant",):
        return ("inv", n["name"])
    if k == "doc_id":
        return ("did", n["path"], n["name"])
    if k == "client_url_site":
        return ("url", n["path"], n["name"])
    return ("id", n["id"])

agg = collections.defaultdict(lambda: collections.Counter())
for P, C in pairs:
    a = load(P)
    b = load(C)
    ida, idb = set(a), set(b)
    removed = ida - idb
    added = idb - ida
    addnat = collections.defaultdict(list)
    for i in added:
        addnat[nat(b[i])].append(i)
    for i in removed:
        n = a[i]
        k = n["kind"]
        if k not in KINDS:
            continue
        agg[k]["removed"] += 1
        key = nat(n)
        if key[0] != "id" and key in addnat:
            # same natural key re-appears under a new id
            same_path = any(b[j].get("path") == n.get("path") for j in addnat[key])
            agg[k]["reappears_same_file" if same_path else "reappears_other_file"] += 1
        else:
            agg[k]["gone"] += 1
    for i in ida & idb:
        n = a[i]
        k = n["kind"]
        if k not in KINDS:
            continue
        agg[k]["kept_id"] += 1
        if k in ("invariant",) and a[i]["name"] != b[i]["name"]:
            agg[k]["kept_id_but_different_entity"] += 1
        if k in ("doc_section",) and a[i]["name"] != b[i]["name"]:
            agg[k]["kept_id_but_different_entity"] += 1
        if k in ("function", "method", "class", "component", "test") and a[i].get("signature") != b[i].get("signature"):
            agg[k]["kept_id_signature_changed"] += 1

for k in KINDS:
    c = agg[k]
    tot = c["kept_id"] + c["removed"]
    print(k, dict(c), "total_prior", tot)
