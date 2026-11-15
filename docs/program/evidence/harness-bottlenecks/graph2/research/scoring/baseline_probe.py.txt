"""Zero-token probe of the co-change task set: how hard it is, and how noisy a paired comparison is.

  python -I baseline_probe.py <repo> <task_pool_commits.json> <out.json>
Two cheap rankers, both built strictly from the state at the task commit's PARENT:
  DIR   files in the seed's directory, then its parent directory, ... (a stand-in for 'browse nearby')
  CO    historical co-change count with the seed over commits that are ancestors of the parent;
        variant CO-xPR also drops commits from the same pull request as the task (sibling leakage)
Ties and the tail are filled by DIR order. Metric: recall of the other pre-existing code/test/migration
files at k = 5, 10, 20, per seed, averaged per commit (one value per commit, so commits weigh equally).
Reports the paired-difference SD between rankers per split, which sets the sample sizes in the report.
This is a probe of the ground truth, not an arm of the test.
"""
import json, subprocess, sys, collections, statistics, math, random

sys.path.insert(0, __file__.rsplit("/", 1)[0] if "/" in __file__ else ".")
from history_stats import classify  # noqa: E402

REPO, POOL, OUT = sys.argv[1:4]


def git(*a):
    return subprocess.run(["git", "-C", REPO, *a], capture_output=True, text=True, encoding="utf-8",
                          errors="replace", check=True).stdout


pool = json.load(open(POOL, encoding="utf-8"))["pool"]
tasks = [u for u in pool if 2 <= u["n_existing"] <= 30]

# file sets of every non-merge commit (full sha)
files_of = {}
cur = None
for line in git("log", "--all", "--no-merges", "--format=@@@%H", "--name-only").splitlines():
    if line.startswith("@@@"):
        cur = line[3:]
        files_of[cur] = []
    elif line.strip() and cur:
        files_of[cur].append(line.strip())
# PR membership: for first-parent merges on main, commits in p2 ^p1
pr_of = {}
for line in git("log", "main", "--first-parent", "--format=%H %P").splitlines():
    parts = line.split()
    h, ps = parts[0], parts[1:]
    if len(ps) > 1:
        for c in git("rev-list", ps[1], f"^{ps[0]}").split():
            pr_of[c] = h
    else:
        pr_of[h] = h
full = {h[:9]: h for h in files_of}


def ctm(f):
    return classify(f)[0] in ("code", "test", "migration")


def dir_rank(seed, universe):
    parts = seed.split("/")
    order, seen = [], {seed}
    for depth in range(len(parts) - 1, -1, -1):
        prefix = "/".join(parts[:depth]) + ("/" if depth else "")
        same = sorted(f for f in universe if f not in seen and f.startswith(prefix)
                      and (depth == 0 or True))
        # nearer files first: same directory before deeper subdirectories
        same.sort(key=lambda f: (f.count("/") - seed.count("/") != 0, f))
        for f in same:
            seen.add(f)
            order.append(f)
    return order


def recall(ranked, ref, k):
    return len(set(ranked[:k]) & ref) / len(ref) if ref else 0.0


rows = []
for t in tasks:
    sha = full.get(t["sha"])
    if not sha:
        continue
    parent = git("rev-parse", f"{sha}^1").strip()
    universe = [f for f in git("ls-tree", "-r", "--name-only", parent).split() if ctm(f)]
    uset = set(universe)
    anc = set(git("rev-list", "--no-merges", parent).split())
    my_pr = pr_of.get(sha)
    hist_all = [files_of[c] for c in anc if c in files_of]
    hist_xpr = [files_of[c] for c in anc if c in files_of and pr_of.get(c) != my_pr]
    existing = [f for f in t["existing_ctm"] if f in uset]
    if len(existing) < 2:
        continue
    per = collections.defaultdict(list)
    for seed in existing:
        ref = set(existing) - {seed}
        d = dir_rank(seed, universe)
        for name, hist in (("CO", hist_all), ("COxPR", hist_xpr)):
            cnt = collections.Counter()
            for fs in hist:
                if seed in fs and len(fs) <= 50:
                    for f in fs:
                        if f != seed and f in uset:
                            cnt[f] += 1
            dpos = {f: i for i, f in enumerate(d)}
            ranked = sorted(cnt, key=lambda f: (-cnt[f], dpos.get(f, 1e9)))
            ranked += [f for f in d if f not in cnt]
            for k in (5, 10, 20):
                per[f"{name}@{k}"].append(recall(ranked, ref, k))
        for k in (5, 10, 20):
            per[f"DIR@{k}"].append(recall(d, ref, k))
    row = {"sha": t["sha"], "date": t["date"], "is_fix": t["is_fix"], "n_existing": len(existing),
           "same_pr_siblings_in_history": sum(1 for c in anc if pr_of.get(c) == my_pr and c in files_of),
           "universe": len(universe)}
    row.update({k: statistics.mean(v) for k, v in per.items()})
    rows.append(row)


def summ(rs, label):
    out = {"label": label, "commits": len(rs)}
    for k in ("DIR@10", "CO@10", "COxPR@10", "DIR@20", "CO@20", "COxPR@20", "CO@5", "DIR@5"):
        v = [r[k] for r in rs]
        out[k] = round(statistics.mean(v), 3) if v else None
    for a, b in (("COxPR@10", "DIR@10"), ("CO@10", "COxPR@10")):
        diffs = [r[a] - r[b] for r in rs]
        if len(diffs) > 2:
            m, sd = statistics.mean(diffs), statistics.stdev(diffs)
            out[f"diff {a}-{b}"] = {"mean": round(m, 3), "sd": round(sd, 3),
                                    "ci95": [round(m - 1.96 * sd / math.sqrt(len(diffs)), 3),
                                             round(m + 1.96 * sd / math.sqrt(len(diffs)), 3)]}
    return out


tune = [r for r in rows if r["date"] < "2026-07-01"]
test = [r for r in rows if r["date"] >= "2026-07-01"]
res = {"all": summ(rows, "all"), "tune_june": summ(tune, "tune (before 2026-07-01)"),
       "test_july_aug": summ(test, "held-out (2026-07-01 on)"),
       "fix_only": summ([r for r in rows if r["is_fix"]], "fix commits"),
       "tasks_with_same_pr_siblings": sum(r["same_pr_siblings_in_history"] > 0 for r in rows),
       "rows": rows}
json.dump(res, open(OUT, "w", encoding="utf-8"), indent=1)
for k, v in res.items():
    if k != "rows":
        print(k, json.dumps(v))
