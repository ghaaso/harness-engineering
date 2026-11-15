"""Assemble tasks/tasks.jsonl, sealed/references.jsonl, tasks/parents.txt, sealed/stats.json.

  python finalize.py
Inputs: sealed/work/t12.json (build_t12.py), sealed/work/t34.json (build_t34.py),
        sealed/work/session_lookups_snapshot.json (copy of the scoring lane's session_lookups.json).
Task ids are opaque and numbered in date order; no task commit sha, message or reference appears in
tasks.jsonl.
"""
import collections, json, os, shutil
from common import FROZEN, git, is_test_path, runtime, classify

HERE = os.path.dirname(os.path.abspath(__file__))
SEALED = os.path.normpath(os.path.join(HERE, ".."))
TASKS = os.path.normpath(os.path.join(HERE, "..", "..", "tasks"))
W = os.path.join(SEALED, "work")
t12 = json.load(open(os.path.join(W, "t12.json"), encoding="utf-8"))
t34 = json.load(open(os.path.join(W, "t34.json"), encoding="utf-8"))
SNAP = os.path.join(W, "session_lookups_snapshot.json")
if not os.path.exists(SNAP):
    shutil.copy(os.path.join(SEALED, "..", "..", "research", "scoring", "session_lookups.json"), SNAP)
sess = json.load(open(SNAP, encoding="utf-8"))["pairs"]


def seed_pub(seed):
    s = seed.get("symbol")
    return {"path": seed["path"],
            "symbol": None if not s else {k: s[k] for k in ("name", "kind", "start", "end")}}


tasks, refs = [], []


def emit(tid, set_, t, extra_task=None, extra_ref=None):
    line = {"id": tid, "set": set_, "split": t["split"], "parent": t["parent"], "seed": seed_pub(t["seed"])}
    if extra_task:
        line.update(extra_task)
    tasks.append(line)
    r = {"id": tid, "set": set_, "split": t["split"], "parent": t["parent"], "seed": t["seed"],
         "files": t["files"], "defs": t["defs"], "excluded_unreachable": t["excluded_unreachable"]}
    for k in ("commit", "date", "not_scored", "commit_n_files_all", "cross_runtime_commit"):
        if k in t:
            r[k] = t[k]
    if extra_ref:
        r.update(extra_ref)
    refs.append(r)


T1 = sorted(t12["T1"], key=lambda t: (t["date"], t["commit"], t["seed"]["path"]))
t1_id = {}
for n, t in enumerate(T1, 1):
    tid = f"T1-{n:04d}"
    t1_id[(t["commit"], t["seed"]["path"])] = tid
    emit(tid, "T1", t)
n = 0
for t in T1:
    if t["cross_runtime_commit"]:
        n += 1
        emit(f"T1x-{n:04d}", "T1x", t, extra_ref={"of": t1_id[(t["commit"], t["seed"]["path"])]})
for n, t in enumerate(sorted(t12["T2"], key=lambda t: (t["date"], t["commit"], t["seed"]["path"])), 1):
    emit(f"T2-{n:04d}", "T2", t)
k3 = sorted([t for t in t34["T3"] if t.get("kept")], key=lambda t: (t["date"], t["doc"], t["item"]))
for n, t in enumerate(k3, 1):
    u = t["excluded_unreachable"]
    t = {**t, "excluded_unreachable": {"n_files": sum(a["type"] == "file" for a in u),
                                       "n_defs": sum(a["type"] == "sym" for a in u), "anchors": u}}
    emit(f"T3-{n:03d}", "T3", t, extra_task={"remove_paths": t["remove_paths"]},
         extra_ref={k: t[k] for k in ("doc", "doc_path", "item", "intro_commit", "intro_how", "date", "unresolved",
                                      "remove_paths")})
k4 = sorted([t for t in t34["T4"] if t.get("kept")], key=lambda t: (t["date"], t["item"]))
for n, t in enumerate(k4, 1):
    emit(f"T4-{n:03d}", "T4", t, extra_task={"remove_paths": t["remove_paths"]},
         extra_ref={k: t[k] for k in ("doc", "item", "fix_commit", "evidence", "date", "seed_in_fix", "remove_paths")})

# ---------- T5: session search -> file opened next, files tracked at the frozen commit ----------
tracked = set(git("ls-tree", "-r", "--name-only", FROZEN).split("\n"))
seen, n5, t5_dropped = set(), 0, 0
for p in sess:
    k = (p["query"], tuple(p["opened"]))
    if k in seen:
        continue
    seen.add(k)
    ok = [o for o in p["opened"] if o in tracked]
    if not ok:
        t5_dropped += 1
        continue
    n5 += 1
    tid = f"T5-{n5:03d}"
    tasks.append({"id": tid, "set": "T5", "split": "heldout", "parent": FROZEN,
                  "seed": {"query": p["query"], "tool": p["tool"]}})
    refs.append({"id": tid, "set": "T5", "split": "heldout", "parent": FROZEN,
                 "seed": {"query": p["query"], "tool": p["tool"]},
                 "files": [{"path": o, "runtime": runtime(o), "class": classify(o)[0], "test": is_test_path(o),
                            "query_names_it": o.rsplit("/", 1)[-1] in p["query"]} for o in ok],
                 "defs": [], "excluded_unreachable": {"n_files": len(p["opened"]) - len(ok), "n_defs": 0,
                                                      "untracked_opened": [o for o in p["opened"] if o not in tracked]},
                 "transcript": p["transcript"]})

# ---------- co-change flags for T3/T4 (T1/T2 carry theirs from build_t12.py) ----------
files_of, cur = {}, None
for line in git("log", "--all", "--no-merges", "--format=@@@%H", "--name-only").splitlines():
    if line.startswith("@@@"):
        cur = line[3:]
        files_of[cur] = set()
    elif line.strip() and cur:
        files_of[cur].add(line.strip())
anc_cache = {}
for r in refs:
    if r["set"] not in ("T3", "T4"):
        continue
    par = r["parent"]
    if par not in anc_cache:
        idx = collections.defaultdict(set)
        for c in git("rev-list", "--no-merges", par).split():
            for f in files_of.get(c, ()):
                idx[f].add(c)
        anc_cache[par] = idx
    idx = anc_cache[par]
    sp = r["seed"]["path"]
    for it in r["files"] + r["defs"]:
        it["cochanged_before"] = bool(idx.get(sp, set()) & idx.get(it["path"], set()))

with open(os.path.join(TASKS, "tasks.jsonl"), "w", encoding="utf-8", newline="\n") as fh:
    for t in tasks:
        fh.write(json.dumps(t, ensure_ascii=False, sort_keys=True) + "\n")
with open(os.path.join(SEALED, "references.jsonl"), "w", encoding="utf-8", newline="\n") as fh:
    for r in refs:
        fh.write(json.dumps(r, ensure_ascii=False, sort_keys=True) + "\n")

# ---------- parents.txt: every commit facts must be built at ----------
need = collections.defaultdict(lambda: [set(), 0])
for t in tasks:
    key = (t["parent"], ",".join(t.get("remove_paths", [])) or "-")
    need[key][0].add(t["set"])
    need[key][1] += 1
with open(os.path.join(TASKS, "parents.txt"), "w", encoding="utf-8", newline="\n") as fh:
    fh.write("# parent_sha\tsets\tn_tasks\tremove_paths (doc to drop from the facts, '-' = none)\n")
    for (sha, rm), (sets, cnt) in sorted(need.items()):
        fh.write(f"{sha}\t{','.join(sorted(sets))}\t{cnt}\t{rm}\n")

# ---------- stats ----------
def share(xs, key):
    xs = [x for x in xs if key in x]
    return None if not xs else round(sum(bool(x[key]) for x in xs) / len(xs), 3)


stats = {}
for set_ in ("T1", "T1x", "T2", "T3", "T4", "T5"):
    for split in ("tune", "heldout", "all"):
        rs = [r for r in refs if r["set"] == set_ and (split == "all" or r["split"] == split)]
        if not rs:
            continue
        items = [x for r in rs for x in r["files"] + r["defs"]]
        files = [x for r in rs for x in r["files"]]
        defs = [x for r in rs for x in r["defs"]]
        units = {r.get("commit") or r.get("fix_commit") or r.get("item") or r["id"] for r in rs}
        exf = sum(r["excluded_unreachable"].get("n_files", 0) for r in rs)
        exd = sum(r["excluded_unreachable"].get("n_defs", 0) for r in rs)
        stats[f"{set_}/{split}"] = {
            "tasks": len(rs), "units": len(units),
            "seeds_with_symbol": sum(1 for r in rs if isinstance(r["seed"], dict) and r["seed"].get("symbol")),
            "ref_files": len(files), "ref_defs": len(defs),
            "share_items_test": share(items, "test"), "share_items_cross_runtime": share(items, "cross_runtime"),
            "share_items_never_cochanged": None if share(items, "cochanged_before") is None else round(1 - share(items, "cochanged_before"), 3),
            "share_items_never_cochanged_xpr": None if share(items, "cochanged_before_xpr") is None else round(1 - share(items, "cochanged_before_xpr"), 3),
            "share_files_test": share(files, "test"), "share_files_cross_runtime": share(files, "cross_runtime"),
            "share_files_never_cochanged": None if share(files, "cochanged_before") is None else round(1 - share(files, "cochanged_before"), 3),
            "excluded_unreachable_files": exf, "excluded_unreachable_defs": exd,
            "tasks_with_empty_reference": sum(1 for r in rs if not r["files"] and not r["defs"]),
        }
stats["T3_items_total"] = len(t34["T3"])
stats["T3_items_kept"] = len(k3)
stats["T4_items_mapped"] = len(t34["T4"])
stats["T4_items_kept"] = len(k4)
stats["T5_pairs_distinct"] = len(seen)
stats["T5_pairs_dropped_untracked"] = t5_dropped
stats["parents_distinct"] = len({k[0] for k in need})
# commit-level reachability (T1 pool): what a store built at the parent can and cannot return
for split in ("tune", "heldout", "all"):
    P = [c for c in t12["pool"] if split == "all" or c["split"] == split]
    rf = sum(len(c["existing"]) for c in P)
    rd = sum(len(c["changed_defs"]) for c in P)
    uf = sum(len(c["added"]) for c in P)
    ud = sum(len(c["added_defs"]) for c in P)
    ua = sum(c["defs_in_added_files"] for c in P)
    stats[f"T1_commit_level/{split}"] = {
        "commits": len(P), "existing_ctm_files": rf, "changed_defs_at_parent": rd,
        "added_ctm_files_excluded": uf, "added_defs_in_existing_files_excluded": ud, "defs_in_added_files_excluded": ua,
        "share_files_unreachable": round(uf / max(1, uf + rf), 3),
        "share_defs_unreachable_in_existing_files": round(ud / max(1, ud + rd), 3),
        "deleted_ctm_files_not_scored": sum(len(c["deleted"]) for c in P),
        "commits_over_30_files_all_types": sum(c["n_files_all"] > 30 for c in P)}
json.dump(stats, open(os.path.join(SEALED, "stats.json"), "w", encoding="utf-8"), indent=1)
print(json.dumps({k: v for k, v in stats.items() if k.endswith("/all") or not isinstance(v, dict)}, indent=0))
