"""Ground-truth census of git history on main for the graph-vs-relational retrieval test.

Read-only against the repo. Run:
  python -I history_stats.py <repo> <out.json>
Two units of change are counted:
  A  every non-merge commit reachable from main
  B  every first-parent unit on main (a merge diffed against its first parent = one PR;
     a squash/direct commit = itself)
Zero model tokens.
"""
import json, re, subprocess, sys, collections, statistics

REPO = sys.argv[1]
OUT = sys.argv[2]

CODE_EXT = (".py", ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs")


def git(*args):
    return subprocess.run(["git", "-C", REPO, *args], capture_output=True, text=True,
                          encoding="utf-8", errors="replace", check=True).stdout


def classify(path):
    p = path.replace("\\", "/")
    low = p.lower()
    name = low.rsplit("/", 1)[-1]
    if low.endswith(".md"):
        return "doc", None
    rt = None
    if p.startswith("backend/"):
        rt = "backend"
    elif p.startswith("technician-app/"):
        rt = "mobile"
    elif p.startswith("src/") or p in ("ops-server.mjs",):
        rt = "web"
    if not low.endswith(CODE_EXT):
        return "other", rt
    is_test = ("/tests/" in low or "/__tests__/" in low or name.startswith("test_")
               or ".test." in name or ".spec." in name or name == "conftest.py"
               or name.startswith("vitest.setup") or name.startswith("jest.setup"))
    if "/alembic/versions/" in low:
        return "migration", rt
    if is_test:
        return "test", rt
    if rt is None:
        return "config_code", rt  # root vite/eslint configs etc.
    return "code", rt


def parse_units(log_args):
    # --name-only with a sentinel per commit
    raw = git("log", *log_args, "--format=@@@%H|%P|%aI|%s", "--name-only")
    units = []
    cur = None
    for line in raw.splitlines():
        if line.startswith("@@@"):
            h, parents, date, subj = line[3:].split("|", 3)
            cur = {"sha": h, "parents": parents.split(), "date": date, "subject": subj, "files": []}
            units.append(cur)
        elif line.strip() and cur is not None:
            cur["files"].append(line.strip())
    return units


def merge_files(sha):
    out = git("diff", "--name-only", f"{sha}^1", sha)
    return [l.strip() for l in out.splitlines() if l.strip()]


def merge_subject(sha):
    body = git("log", "-1", "--format=%b", sha).strip().splitlines()
    return body[0] if body else ""


def summarise(units, label):
    n = len(units)
    per = []
    for u in units:
        cls = collections.Counter()
        rts_code = set()
        rts_any = set()
        for f in u["files"]:
            c, rt = classify(f)
            cls[c] += 1
            if rt:
                rts_any.add(rt)
                if c in ("code", "test", "migration"):
                    rts_code.add(rt)
        subj = u.get("effective_subject", u["subject"])
        per.append({
            "sha": u["sha"][:9], "date": u["date"][:10], "subject": subj[:120],
            "n_files": len(u["files"]), "n_code": cls["code"], "n_test": cls["test"],
            "n_migration": cls["migration"], "n_doc": cls["doc"], "n_other": cls["other"] + cls["config_code"],
            "runtimes_code": sorted(rts_code), "runtimes_any": sorted(rts_any),
            "is_fix": bool(re.match(r"^\s*fix", subj, re.I)),
        })
    def frac(k):
        return f"{k} / {n} ({100*k/n:.1f} %)" if n else "0"
    nf = [p["n_files"] for p in per]
    nc = [p["n_code"] for p in per]
    code2 = [p for p in per if p["n_code"] >= 2]
    codeprod = [p for p in per if (p["n_code"] + p["n_migration"]) >= 2]
    cross_be = [p for p in per if "backend" in p["runtimes_code"] and ({"web", "mobile"} & set(p["runtimes_code"]))]
    cross_any = [p for p in per if len(p["runtimes_code"]) >= 2]
    code_test = [p for p in per if p["n_code"] >= 1 and p["n_test"] >= 1]
    fixes = [p for p in per if p["is_fix"]]
    fix_code2 = [p for p in fixes if p["n_code"] + p["n_migration"] >= 2]
    fix_code_test = [p for p in fixes if p["n_code"] >= 1 and p["n_test"] >= 1]
    doc_only = [p for p in per if p["n_files"] and p["n_doc"] == p["n_files"]]
    no_code = [p for p in per if p["n_code"] + p["n_test"] + p["n_migration"] == 0]
    mig_with_model = [p for p in per if p["n_migration"] >= 1 and p["n_code"] >= 1]
    big = [p for p in per if p["n_files"] > 50]
    # usable for a "given a seed file, predict the rest" task: 2..30 code+test+migration files
    def ctm(p):
        return p["n_code"] + p["n_test"] + p["n_migration"]
    usable = [p for p in per if 2 <= ctm(p) <= 30]
    usable_fix = [p for p in usable if p["is_fix"]]
    hist = collections.Counter()
    for p in per:
        k = ctm(p)
        b = "0" if k == 0 else "1" if k == 1 else "2-3" if k <= 3 else "4-7" if k <= 7 else "8-15" if k <= 15 else "16-30" if k <= 30 else "31+"
        hist[b] += 1
    months = collections.Counter(p["date"][:7] for p in per)
    usable_months = collections.Counter(p["date"][:7] for p in usable)
    return {
        "label": label, "units": n,
        "files_per_unit": {"median": statistics.median(nf) if nf else 0, "mean": round(statistics.mean(nf), 1) if nf else 0,
                           "p90": sorted(nf)[int(0.9 * (n - 1))] if nf else 0, "max": max(nf) if nf else 0},
        "prod_code_files_per_unit": {"median": statistics.median(nc) if nc else 0, "mean": round(statistics.mean(nc), 1) if nc else 0},
        "hist_code_test_migration_files": dict(sorted(hist.items())),
        "ge2_prod_code_files": frac(len(code2)),
        "ge2_prod_code_or_migration_files": frac(len(codeprod)),
        "cross_runtime_backend_with_web_or_mobile": frac(len(cross_be)),
        "cross_runtime_any_two": frac(len(cross_any)),
        "code_with_tests": frac(len(code_test)),
        "migration_with_code": frac(len(mig_with_model)),
        "fix_subject": frac(len(fixes)),
        "fix_with_ge2_code": frac(len(fix_code2)),
        "fix_with_code_and_test": frac(len(fix_code_test)),
        "doc_only": frac(len(doc_only)),
        "no_code_test_migration": frac(len(no_code)),
        "over_50_files": frac(len(big)),
        "usable_2_to_30_code_test_migration": frac(len(usable)),
        "usable_fixes": frac(len(usable_fix)),
        "by_month_all": dict(sorted(months.items())),
        "by_month_usable": dict(sorted(usable_months.items())),
        "per_unit": per,
    }


def main():
    a = parse_units(["main", "--no-merges"])
    b = parse_units(["main", "--first-parent"])
    for u in b:
        if len(u["parents"]) > 1:
            u["files"] = merge_files(u["sha"])
            ms = merge_subject(u["sha"])
            u["effective_subject"] = ms or u["subject"]
    m = re.compile(r"Merge pull request #\d+ from [^/]+/(.*)")
    for u in b:
        s = u.get("effective_subject", u["subject"])
        mm = m.match(u["subject"])
        if mm and not u.get("effective_subject"):
            u["effective_subject"] = mm.group(1)
    total_main = int(git("rev-list", "--count", "main").strip())
    res = {"repo_main_commits": total_main,
           "A_nonmerge": summarise(a, "A: non-merge commits reachable from main"),
           "B_first_parent": summarise(b, "B: first-parent units on main (PR-level)")}
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(res, fh, indent=1)
    for k in ("A_nonmerge", "B_first_parent"):
        r = dict(res[k]); r.pop("per_unit")
        print(json.dumps(r, indent=1))


if __name__ == "__main__":
    main()
