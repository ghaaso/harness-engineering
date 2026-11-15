import sys
import json, os, collections
CACHE = "C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build/facts/cache"
FR = "a31924a3818f4ac94b695906d107c72c912792b2"
def load(sha):
    d = {}
    for l in open(os.path.join(CACHE, sha, "nodes.jsonl"), encoding="utf-8"):
        n = json.loads(l); d[n["id"]] = n
    return d
fz = load(FR)
fz_files = {n["path"] for n in fz.values() if n["kind"] == "file"}
byname = collections.defaultdict(list)
for n in fz.values():
    if n["kind"] in ("function", "method", "class", "component"):
        byname[n["name"]].append(n)
for sha in sys.argv[1:] if False else ["cd806c80", "08e829be"]:
    full = [d for d in os.listdir(CACHE) if d.startswith(sha)][0]
    old = load(full)
    c = collections.Counter()
    for n in old.values():
        if n["kind"] not in ("function", "method", "class", "component"): continue
        if n["id"] in fz: c["survives"] += 1; continue
        c["lost"] += 1
        if n["path"] not in fz_files:
            # file gone: does the same name exist elsewhere?
            if n["name"] in byname: c["lost_file_gone_name_exists_elsewhere"] += 1
            else: c["lost_file_gone_name_gone"] += 1
        else:
            if any(m["path"] == n["path"] for m in byname.get(n["name"], [])): c["lost_same_file_same_name?"] += 1
            elif n["name"] in byname: c["lost_file_kept_name_moved"] += 1
            else: c["lost_file_kept_name_gone(renamed_or_deleted)"] += 1
    print(sha, dict(c))
