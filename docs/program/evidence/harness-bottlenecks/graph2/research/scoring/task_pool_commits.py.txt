"""Build the candidate co-change task pool (seed file -> the other pre-existing files) with leakage facts.

  python -I task_pool.py <repo> <out.json>
Per first-parent unit on main: name-status against the first parent, keeps only files that
existed at the parent (status M, or R/C source side), because no store built at the parent can
return a file that does not exist yet. Zero model tokens.
"""
import json, subprocess, sys, collections, re
sys.path.insert(0, __file__.rsplit("/", 1)[0] if "/" in __file__ else ".")
from history_stats import classify  # noqa: E402

REPO, OUT = sys.argv[1], sys.argv[2]


def git(*a):
    return subprocess.run(["git", "-C", REPO, *a], capture_output=True, text=True,
                          encoding="utf-8", errors="replace", check=True).stdout


units = []
for line in git("log", "main", "--no-merges", "--format=%H|%P|%aI|%s").splitlines():
    h, p, d, s = line.split("|", 3)
    units.append((h, p.split(), d, s))

pool = []
added_total = existing_total = 0
for h, parents, d, s in units:
    if not parents:
        continue
    ns = git("diff", "--name-status", "-M", f"{parents[0]}", h).splitlines()
    existing, added, deleted = [], [], []
    for l in ns:
        parts = l.split("\t")
        st = parts[0]
        if st.startswith("A"):
            added.append(parts[1])
        elif st.startswith("D"):
            deleted.append(parts[1])
        elif st.startswith(("R", "C")):
            existing.append(parts[1])  # the old path existed at the parent
        else:
            existing.append(parts[1])
    keep = lambda fs: [f for f in fs if classify(f)[0] in ("code", "test", "migration")]
    ex, ad = keep(existing), keep(added)
    added_total += len(ad)
    existing_total += len(ex)
    subj = s
    if len(parents) > 1:
        b = git("log", "-1", "--format=%b", h).strip().splitlines()
        subj = b[0] if b else s
    rts = sorted({classify(f)[1] for f in ex if classify(f)[1]})
    pool.append({"sha": h[:9], "parent": parents[0][:9], "date": d[:10], "subject": subj[:120],
                 "existing_ctm": ex, "added_ctm": ad, "n_existing": len(ex), "n_added": len(ad),
                 "runtimes_existing": rts, "is_fix": bool(re.match(r"^\s*fix", subj, re.I))})

usable = [u for u in pool if 2 <= u["n_existing"] <= 30]
summary = {
    "units": len(pool),
    "ctm_files_existing_at_parent": existing_total,
    "ctm_files_added_in_unit": added_total,
    "added_share": round(added_total / max(1, added_total + existing_total), 3),
    "usable_units_2_to_30_existing": len(usable),
    "usable_fix": sum(u["is_fix"] for u in usable),
    "usable_cross_runtime_existing": sum(len(u["runtimes_existing"]) >= 2 for u in usable),
    "usable_by_month": dict(sorted(collections.Counter(u["date"][:7] for u in usable).items())),
    "seed_target_pairs_leave_one_in": sum(u["n_existing"] for u in usable),
    "usable_with_added_files_too": sum(u["n_added"] > 0 for u in usable),
}
json.dump({"summary": summary, "pool": pool}, open(OUT, "w", encoding="utf-8"), indent=1)
print(json.dumps(summary, indent=1))
