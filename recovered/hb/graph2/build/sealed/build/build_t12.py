"""T1, T1x and T2 from the frozen main history (protocol section 4).

  python -I build_t12.py <out.json>
Pool (the scoring lane's task_pool_commits.py rule, unchanged): every non-merge commit reachable
from the frozen main; diff against its first parent with rename detection; a file is EXISTING if its
status is M (or R, old path), ADDED if A; only code, test and migration (ctm) files count; usable =
2..30 existing ctm files. Split by author date at 2026-07-01.
References: hunks of `git diff -U0 -M parent commit` mapped to their enclosing canonical definition
at the parent (python ast; TS/JS through the TypeScript compiler, defs_ts.js). Added lines are
mapped on the child side and carried back to the parent definition of the same name; a definition
that exists only in the child is ADDED (unreachable, excluded and counted).
"""
import collections, json, sys
from common import (FROZEN, Blobs, classify, cross_runtime, defs_for, git, is_ctm, is_test_path, map_file, parse_diff,
                    runtime, split_of)

OUT = sys.argv[1]
FN_KINDS = ("function", "component", "method", "class", "test")

# ---------- pool ----------
units = []
for line in git("log", FROZEN, "--no-merges", "--format=%H|%P|%aI|%s").splitlines():
    h, p, d, s = line.split("|", 3)
    if p.split():
        units.append((h, p.split()[0], d[:10]))
pool = []
for h, parent, date in units:
    ns = git("diff", "--name-status", "-M", parent, h).splitlines()
    existing, added, deleted, n_all = [], [], [], 0
    for l in ns:
        parts = l.split("\t")
        st = parts[0]
        n_all += 1
        if st.startswith("A"):
            added.append(parts[1])
        elif st.startswith("D"):
            deleted.append(parts[1])
        else:
            existing.append(parts[1])
    ex = [f for f in existing if is_ctm(f)]
    if 2 <= len(ex) <= 30:
        pool.append({"sha": h, "parent": parent, "date": date, "existing": ex,
                     "added": [f for f in added if is_ctm(f)], "deleted": [f for f in deleted if is_ctm(f)],
                     "n_files_all": n_all})
pool.sort(key=lambda u: (u["date"], u["sha"]))
print("usable", len(pool), collections.Counter(split_of(u["date"]) for u in pool), file=sys.stderr)

# ---------- diffs and definitions ----------
blobs = Blobs()
jobs, per = [], {}
for u in pool:
    fd = parse_diff(u["parent"], u["sha"])
    by_old = {f["old"]: f for f in fd if f["status"] != "A"}
    u["files"] = []
    for path in u["existing"]:
        f = by_old.get(path)
        if f is None:  # e.g. a type change the patch shows differently; keep the file, no hunks
            f = {"status": "M", "old": path, "new": path, "hunks": []}
        u["files"].append(f)
        jobs.append(((u["sha"], "p", path), path, blobs.get(u["parent"], path)))
        jobs.append(((u["sha"], "c", path), f["new"], blobs.get(u["sha"], f["new"])))
    for path in u["added"]:
        jobs.append(((u["sha"], "a", path), path, blobs.get(u["sha"], path)))
blobs.close()
DEFS = defs_for(jobs)

# ---------- co-change history (ancestors of the parent only) ----------
files_of, cur = {}, None
for line in git("log", "--all", "--no-merges", "--format=@@@%H", "--name-only").splitlines():
    if line.startswith("@@@"):
        cur = line[3:]
        files_of[cur] = set()
    elif line.strip() and cur:
        files_of[cur].add(line.strip())
pr_of = {}
for line in git("log", FROZEN, "--first-parent", "--format=%H %P").splitlines():
    parts = line.split()
    h, ps = parts[0], parts[1:]
    if len(ps) > 1:
        for c in git("rev-list", ps[1], f"^{ps[0]}").split():
            pr_of[c] = h
    else:
        pr_of[h] = h


def cochange_index(u):
    anc = [c for c in git("rev-list", u["parent"]).split() if c in files_of]
    mypr = pr_of.get(u["sha"])
    idx, idx_x = collections.defaultdict(set), collections.defaultdict(set)
    for c in anc:
        for f in files_of[c]:
            idx[f].add(c)
            if mypr is None or pr_of.get(c) != mypr:
                idx_x[f].add(c)
    return idx, idx_x


# ---------- per commit: changed definitions ----------
commits = []
for u in pool:
    changed_defs, added_defs, unparsed, per_file = [], [], [], {}
    for f in u["files"]:
        path = f["old"]
        pr, cr = DEFS[(u["sha"], "p", path)], DEFS[(u["sha"], "c", path)]
        if not pr["ok"] or not cr["ok"]:
            unparsed.append(path)
        ch, ad, mod = map_file(pr["defs"], cr["defs"], f["hunks"]) if pr["ok"] and cr["ok"] else ({}, [], 0)
        rows = []
        for i, n in sorted(ch.items()):
            d = pr["defs"][i]
            rows.append({"path": path, "name": d["name"], "occ": d["occ"], "kind": d["kind"],
                         "start": d["start"], "end": d["end"], "changed_lines": n})
        per_file[path] = {"rows": rows, "module_lines": mod, "status": f["status"], "child_path": f["new"],
                          "n_hunks": len(f["hunks"])}
        changed_defs += rows
        added_defs += [{"path": path, "name": a} for a in ad]
    defs_in_added = sum(len(DEFS[(u["sha"], "a", p)]["defs"]) for p in u["added"])
    idx, idx_x = cochange_index(u)
    commits.append({**{k: u[k] for k in ("sha", "parent", "date", "existing", "added", "deleted", "n_files_all")},
                    "split": split_of(u["date"]), "per_file": per_file, "changed_defs": changed_defs,
                    "added_defs": added_defs, "defs_in_added_files": defs_in_added, "unparsed": unparsed,
                    "_idx": idx, "_idx_x": idx_x})


KIND_RANK = {"function": 0, "component": 0, "method": 0, "test": 0, "class": 1}


def pick_seed_symbol(rows):
    """The seed symbol: the most specific changed definition of the seed file (function, component,
    method or test block before a class, a class before an object or variable), then the one with
    the most changed lines, then the earliest. None when no definition of the file changed."""
    if not rows:
        return None
    r = sorted(rows, key=lambda r: (KIND_RANK.get(r["kind"], 2), -r["changed_lines"], r["start"]))[0]
    return {"name": r["name"], "kind": r["kind"], "start": r["start"], "end": r["end"], "occ": r["occ"]}


def item_flags(c, seed, path):
    a, b = c["_idx"].get(seed, set()), c["_idx"].get(path, set())
    ax, bx = c["_idx_x"].get(seed, set()), c["_idx_x"].get(path, set())
    return {"runtime": runtime(path), "class": classify(path)[0], "test": is_test_path(path),
            "cross_runtime": cross_runtime(seed, path),
            "cochanged_before": bool(a & b), "cochanged_before_xpr": bool(ax & bx)}


def make_task(c, seed, ref_files):
    sym = pick_seed_symbol(c["per_file"][seed]["rows"])
    files = []
    for p in ref_files:
        pf = c["per_file"][p]
        files.append({"path": p, "status": pf["status"], "child_path": pf["child_path"], **item_flags(c, seed, p)})
    defs = []
    for r in c["changed_defs"]:
        if r["path"] not in ref_files and r["path"] != seed:
            continue
        if sym and r["path"] == seed and r["name"] == sym["name"] and r["occ"] == sym["occ"]:
            continue
        defs.append({**{k: r[k] for k in ("path", "name", "kind", "start", "end", "changed_lines")},
                     "same_file_as_seed": r["path"] == seed, **item_flags(c, seed, r["path"])})
    return {"commit": c["sha"], "parent": c["parent"], "date": c["date"], "split": c["split"],
            "seed": {"path": seed, "symbol": sym}, "files": files, "defs": defs,
            "excluded_unreachable": {"added_files": c["added"], "added_defs": c["added_defs"],
                                     "defs_in_added_files": c["defs_in_added_files"],
                                     "n_files": len(c["added"]),
                                     "n_defs": len(c["added_defs"]) + c["defs_in_added_files"]},
            "not_scored": {"deleted_files": c["deleted"], "unparsed_files": c["unparsed"],
                           "seed_module_lines": c["per_file"][seed]["module_lines"]},
            "commit_n_files_all": c["n_files_all"]}


T1, T2 = [], []
for c in commits:
    rts = {runtime(p) for p in c["existing"]} - {None}
    for seed in c["existing"]:
        t = make_task(c, seed, [p for p in c["existing"] if p != seed])
        t["cross_runtime_commit"] = len(rts) >= 2
        T1.append(t)
    tests = [p for p in c["existing"] if classify(p)[0] == "test"]
    code = [p for p in c["existing"] if classify(p)[0] == "code"]
    if tests and code:
        for seed in code:
            t = make_task(c, seed, tests)
            t["defs"] = [d for d in t["defs"] if not d["same_file_as_seed"]]
            T2.append(t)
for c in commits:
    c.pop("_idx")
    c.pop("_idx_x")
json.dump({"pool": commits, "T1": T1, "T2": T2}, open(OUT, "w", encoding="utf-8"), indent=0)
print("T1 seeds", len(T1), "T1 commits", len({t["commit"] for t in T1}),
      "T1x commits", len({t["commit"] for t in T1 if t["cross_runtime_commit"]}),
      "T2 seeds", len(T2), "T2 commits", len({t["commit"] for t in T2}), file=sys.stderr)
