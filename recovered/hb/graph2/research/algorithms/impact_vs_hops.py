"""Measure, on the project's own history, how well k-hop import-graph neighbourhoods,
personalised PageRank and co-change predict which code files change in the same commit.

Read-only on the repo: only `git ls-files`, `git ls-tree`, `git log`, `git show` and file reads.
Run:  python -I impact_vs_hops.py <repo> <out.json> [head|split]
Ground truth: for a commit that changed 2..30 code files, query = one changed file,
truth = the other changed code files. Time split: first 70 % of commits (oldest first, main,
no merges) train the co-change counts; the last 30 % are the test queries.
Mode "head": import graph read from the working tree (HEAD). This LEAKS edges that the test
commits themselves added (a commit that adds file A importing B makes A-B a 1-hop pair), which
favours the static graph.
Mode "split": import graph rebuilt from the tree as of the last training commit (no leakage).
Seeds that do not exist yet are skipped; truth files that do not exist yet are dropped from the
truth set (their share is reported as mean_share_of_truth_that_exists_in_graph).
"""
import ast, json, os, random, re, subprocess, sys
from collections import defaultdict, Counter
import numpy as np

REPO = sys.argv[1]
OUT = sys.argv[2]
MODE = sys.argv[3] if len(sys.argv) > 3 else "head"
random.seed(7)


def git(*a):
    r = subprocess.run(["git", "-C", REPO, *a], capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.stdout


EXT = (".py", ".js", ".jsx", ".ts", ".tsx", ".mjs")

# ---------------- history first (oldest -> newest, main, no merges) ----------------
_log = git("log", "main", "--no-merges", "--reverse", "--format=@@%H", "--name-only")
commits, hashes, _cur = [], [], None
for _line in _log.splitlines():
    if _line.startswith("@@"):
        _cur = []
        commits.append(_cur)
        hashes.append(_line[2:])
    elif _line.strip() and _cur is not None:
        _cur.append(_line.strip())
n_commits_total = len(commits)
SPLIT = int(n_commits_total * 0.7)
REV = hashes[SPLIT - 1] if MODE == "split" else None


def read_file(f):
    if REV:
        return git("show", f"{REV}:{f}")
    return open(os.path.join(REPO, f), encoding="utf-8", errors="replace").read()


all_files = [f for f in (git("ls-tree", "-r", "--name-only", REV) if REV else git("ls-files")).splitlines() if f]
code = [f for f in all_files if f.endswith(EXT) and "node_modules" not in f]
code_set = set(code)
idx = {f: i for i, f in enumerate(code)}
N = len(code)


# ---------------- import edges ----------------
def py_resolve(modpath):
    base = "backend/" + modpath.replace(".", "/")
    for c in (base + ".py", base + "/__init__.py"):
        if c in code_set:
            return c
    return None


def py_edges(f):
    out = set()
    try:
        tree = ast.parse(read_file(f))
    except Exception:
        return out
    pkg = os.path.dirname(f)
    for n in ast.walk(tree):
        if isinstance(n, ast.Import):
            for a in n.names:
                t = py_resolve(a.name)
                if t:
                    out.add(t)
        elif isinstance(n, ast.ImportFrom):
            if n.level:
                d = pkg
                for _ in range(n.level - 1):
                    d = os.path.dirname(d)
                modrel = (d + "/" + (n.module or "").replace(".", "/")).rstrip("/")
                cands = [modrel] + [modrel + "/" + a.name for a in n.names]
                for c in cands:
                    for t in (c + ".py", c + "/__init__.py"):
                        if t in code_set:
                            out.add(t)
            elif n.module:
                t = py_resolve(n.module)
                if t:
                    out.add(t)
                for a in n.names:
                    t2 = py_resolve(n.module + "." + a.name)
                    if t2:
                        out.add(t2)
    out.discard(f)
    return out


ALIAS = {"@app/": "src/app/", "@ops/": "src/ops/", "@shared/": "src/shared/", "@features/": "src/features/"}
JS_RE = re.compile(
    r"""(?:from\s+|import\s+|require\(\s*|import\(\s*|(?:vi|jest)\.(?:mock|doMock|importActual)\(\s*)['"]([^'"]+)['"]"""
)
JS_EXTS = ["", ".js", ".jsx", ".ts", ".tsx", ".mjs", ".json"]


def js_resolve(f, spec):
    if spec.startswith("."):
        base = os.path.normpath(os.path.join(os.path.dirname(f), spec)).replace("\\", "/")
    else:
        base = None
        for k, v in ALIAS.items():
            if spec.startswith(k):
                base = v + spec[len(k):]
        if base is None and spec.startswith("@/") and f.startswith("technician-app/"):
            base = "technician-app/src/" + spec[2:]
        if base is None:
            return None
    for e in JS_EXTS:
        if (base + e) in code_set:
            return base + e
    for e in JS_EXTS[1:]:
        if (base + "/index" + e) in code_set:
            return base + "/index" + e
    return None


def js_edges(f):
    out = set()
    try:
        txt = read_file(f)
    except Exception:
        return out
    for m in JS_RE.finditer(txt):
        t = js_resolve(f, m.group(1))
        if t and t != f:
            out.add(t)
    return out


imp = defaultdict(set)
for f in code:
    for t in (py_edges(f) if f.endswith(".py") else js_edges(f)):
        imp[f].add(t)
n_imp = sum(len(v) for v in imp.values())

A = np.zeros((N, N), dtype=np.float32)  # A[i,j]=1 if i imports j
for s_, ds in imp.items():
    for d in ds:
        A[idx[s_], idx[d]] = 1
U = np.maximum(A, A.T)
deg_in = A.sum(0)
deg_out = A.sum(1)
dU = U.sum(1)


# ---------------- hop growth ----------------
def reach_counts(M, kmax):
    sizes = []
    cur = np.eye(N, dtype=bool)
    for k in range(1, kmax + 1):
        cur = (cur.astype(np.float32) @ M > 0) | cur
        sizes.append(cur.sum(1) - 1)
    return sizes


hop_growth = {}
for name, M in (("undirected", U), ("dependents_only(reverse)", A.T.copy()), ("dependencies_only(forward)", A.copy())):
    sz = reach_counts(M, 6)
    hop_growth[name] = [
        {"k": k + 1, "mean": float(x.mean()), "median": float(np.median(x)), "p90": float(np.percentile(x, 90)),
         "max": int(x.max()), "share_of_repo_mean": float(x.mean() / (N - 1))}
        for k, x in enumerate(sz)
    ]

# ---------------- history -> transactions ----------------
tx = [sorted({f for f in files if f.endswith(EXT) and "node_modules" not in f}) for files in commits]
sizes = Counter(len(t) for t in tx)
usable = [t for t in tx if 2 <= len(t) <= 30]
train_tx = [t for t in tx[:SPLIT] if 2 <= len(t) <= 30]
test_tx = [t for t in tx[SPLIT:] if 2 <= len(t) <= 30]

cnt = Counter()
co = Counter()
for t in train_tx:
    for a in t:
        cnt[a] += 1
    for i in range(len(t)):
        for j in range(len(t)):
            if i != j:
                co[(t[i], t[j])] += 1

C = np.zeros((N, N), dtype=np.float32)  # C[a,b] = confidence(a->b) from train commits
S = np.zeros((N, N), dtype=np.float32)  # support
for (a, b), c in co.items():
    if a in idx and b in idx:
        C[idx[a], idx[b]] = c / cnt[a]
        S[idx[a], idx[b]] = c

# ---------------- queries ----------------
queries, ceil, qcommit = [], [], []
for ci, t in enumerate(test_tx):
    for f in t:
        if f not in idx:
            continue
        truth_all = set(t) - {f}
        truth = truth_all & code_set
        if not truth:
            continue
        ceil.append(len(truth) / len(truth_all))
        queries.append((f, truth, len(t)))
        qcommit.append(ci)

K_LIST = [5, 10, 20]


def ppr(W, seed, alpha=0.15, iters=40):
    rs = W.sum(1, keepdims=True)
    P = np.divide(W, rs, out=np.zeros_like(W), where=rs > 0)
    r = np.zeros(N, dtype=np.float64)
    r[seed] = 1.0
    x = r.copy()
    PT = P.T.astype(np.float64)
    for _ in range(iters):
        x = alpha * r + (1 - alpha) * (PT @ x)
    return x


def neigh_lists(M):
    return [np.nonzero(M[i])[0] for i in range(N)]


NL = {"U": neigh_lists(U), "REV": neigh_lists(A.T), "FWD": neigh_lists(A)}


def bfs(nl, s, kmax):
    dist = {s: 0}
    fr = [s]
    for k in range(1, kmax + 1):
        nxt = []
        for u in fr:
            for v in nl[u]:
                v = int(v)
                if v not in dist:
                    dist[v] = k
                    nxt.append(v)
        fr = nxt
    return dist


def prf(cands, truth):
    hit = len(cands & truth)
    return (hit / len(cands) if cands else None), (hit / len(truth) if truth else None), hit


def agg(rows):
    ps = [r[0] for r in rows if r[0] is not None]
    return {
        "mean_set_size": float(np.mean([r[3] for r in rows])),
        "share_nonempty": float(np.mean([1 if r[3] > 0 else 0 for r in rows])),
        "precision_when_nonempty": float(np.mean(ps)) if ps else None,
        "recall": float(np.mean([r[1] for r in rows])),
        "hit_rate_any": float(np.mean([1 if r[2] > 0 else 0 for r in rows])),
    }


results = {}
for name, key in (("import_undirected", "U"), ("import_dependents_only", "REV"), ("import_dependencies_only", "FWD")):
    res = []
    for k in range(1, 6):
        rows = []
        for f, truth, _ in queries:
            d = bfs(NL[key], idx[f], k)
            cands = {code[i] for i in d if i != idx[f]}
            p, r, h = prf(cands, truth)
            rows.append((p, r, h, len(cands)))
        a = agg(rows)
        a["k"] = k
        res.append(a)
    results[name] = res


def slice_of(f):
    m = re.match(r"(?:backend/app/features|src/features|technician-app/src/features)/([^/]+)/", f)
    return m.group(1) if m else None


by_dir, by_slice = defaultdict(set), defaultdict(set)
for f in code:
    by_dir[os.path.dirname(f)].add(f)
    s_ = slice_of(f)
    if s_:
        by_slice[s_].add(f)
for nm, getter in (("same_directory", lambda f: by_dir[os.path.dirname(f)] - {f}),
                   ("same_slice_name_all_runtimes", lambda f: (by_slice[slice_of(f)] - {f}) if slice_of(f) else set())):
    rows = []
    for f, truth, _ in queries:
        cands = getter(f)
        p, r, h = prf(cands, truth)
        rows.append((p, r, h, len(cands)))
    results[nm] = agg(rows)


def boot_ci(vals, commit_ids, B=2000):
    """95 % bootstrap CI of the mean, resampling COMMITS (queries inside a commit share truth)."""
    rng = np.random.default_rng(11)
    by = defaultdict(list)
    for v, c in zip(vals, commit_ids):
        by[c].append(v)
    groups = [np.array(g) for g in by.values()]
    means = []
    for _ in range(B):
        pick = rng.integers(0, len(groups), len(groups))
        allv = np.concatenate([groups[i] for i in pick])
        means.append(allv.mean())
    return float(np.percentile(means, 2.5)), float(np.percentile(means, 97.5))


def ranked_eval(score_fn, name):
    out = {}
    for K in K_LIST:
        P, R, H = [], [], []
        for f, truth, _ in queries:
            sc = score_fn(idx[f]).copy()
            sc[idx[f]] = -1
            order = np.argsort(-sc, kind="stable")
            top = [code[i] for i in order[:K] if sc[i] > 0]
            hit = len(set(top) & truth)
            P.append(hit / K)
            R.append(hit / len(truth))
            H.append(1 if hit else 0)
        out[f"@{K}"] = {"precision": float(np.mean(P)), "recall": float(np.mean(R)), "hit_rate_any": float(np.mean(H))}
        if K == 10:
            out["@10"]["precision_ci95"] = boot_ci(P, qcommit)
            out["@10"]["recall_ci95"] = boot_ci(R, qcommit)
    results[name] = out


def bfs_rank(key, kmax, tie):
    def fn(s):
        d = bfs(NL[key], s, kmax)
        sc = np.zeros(N)
        for v, k in d.items():
            if v == s:
                continue
            sc[v] = 1000.0 / k + ((1.0 / (1 + dU[v])) if tie == "lowdeg" else random.random() * 0.01)
        return sc
    return fn


def ppr_fn(W, alpha):
    cache = {}

    def fn(s):
        if s not in cache:
            cache[s] = ppr(W, s, alpha)
        return cache[s]
    return fn


rng0 = np.random.default_rng(5)
ranked_eval(lambda s: rng0.random(N) + 1e-3, "baseline_random_files")
ranked_eval(lambda s: (deg_in + 1e-3 * rng0.random(N)).astype(np.float64), "baseline_most_imported_files")
ranked_eval(bfs_rank("U", 2, "random"), "ranked_bfs2_undirected_random_tiebreak")
ranked_eval(bfs_rank("U", 2, "lowdeg"), "ranked_bfs2_undirected_lowdegree_tiebreak")
ranked_eval(bfs_rank("U", 4, "lowdeg"), "ranked_bfs4_undirected_lowdegree_tiebreak")
ranked_eval(ppr_fn(U.astype(np.float64), 0.15), "ppr_import_undirected_alpha0.15")
ranked_eval(ppr_fn(U.astype(np.float64), 0.30), "ppr_import_undirected_alpha0.30")
Wd = U / np.sqrt(np.outer(np.maximum(dU, 1), np.maximum(dU, 1)))
ranked_eval(ppr_fn(Wd.astype(np.float64), 0.15), "ppr_import_symdegnorm_alpha0.15")
# dependents-only (reverse edges only): "who imports the seed"
ranked_eval(ppr_fn(A.T.astype(np.float64), 0.15), "ppr_dependents_only_alpha0.15")
ranked_eval(lambda s: C[s].astype(np.float64) + 1e-6 * S[s], "cochange_confidence_train70")
Cm = np.where(S >= 2, C, 0)
ranked_eval(lambda s: Cm[s].astype(np.float64), "cochange_confidence_minsupport2")
for wc in (0.5, 1.0, 3.0):
    W = U.astype(np.float64) + wc * (C + C.T).astype(np.float64)
    ranked_eval(ppr_fn(W, 0.15), f"ppr_import_plus_cochange_w{wc}")
    W2 = Wd.astype(np.float64) + wc * (C + C.T).astype(np.float64)
    ranked_eval(ppr_fn(W2, 0.15), f"ppr_symdegnorm_plus_cochange_w{wc}")

cov = {
    "mode": MODE, "graph_rev": REV or "HEAD(working tree)",
    "mean_share_of_truth_that_exists_in_graph": float(np.mean(ceil)),
    "queries": len(queries), "test_commits": len(test_tx),
    "queries_with_any_cochange_train_link": float(np.mean([1 if any(S[idx[f]][idx[t]] > 0 for t in truth) else 0 for f, truth, _ in queries])),
    "queries_with_truth_within_1_import_hop": float(np.mean([1 if any(idx[t] in bfs(NL['U'], idx[f], 1) for t in truth) else 0 for f, truth, _ in queries])),
    "queries_with_truth_within_2_import_hops": float(np.mean([1 if any(idx[t] in bfs(NL['U'], idx[f], 2) for t in truth) else 0 for f, truth, _ in queries])),
}
dist_counter, tot = Counter(), 0
for f, truth, _ in queries:
    d = bfs(NL["U"], idx[f], 8)
    for t in truth:
        tot += 1
        dist_counter[d.get(idx[t], "unreached")] += 1
dist_share = {str(k): v / tot for k, v in sorted(dist_counter.items(), key=lambda kv: str(kv[0]))}

meta = {
    "mode": MODE, "code_files": N, "import_edges": int(n_imp),
    "commits_main_nomerge": n_commits_total, "commits_with_2_to_30_code_files": len(usable),
    "train_commits_usable": len(train_tx), "test_commits_usable": len(test_tx),
    "tx_over30_code_files": sum(v for k, v in sizes.items() if k > 30),
    "co_change_pairs_train": len(co) // 2,
    "co_change_pairs_support_ge2": int(sum(1 for v in co.values() if v >= 2) // 2),
    "co_change_pairs_support_ge3": int(sum(1 for v in co.values() if v >= 3) // 2),
    "top_in_degree": [(code[i], int(deg_in[i])) for i in np.argsort(-deg_in)[:8]],
    "undirected_degree_median": float(np.median(dU)), "isolated_nodes": int((dU == 0).sum()),
}
json.dump({"meta": meta, "hop_growth": hop_growth, "coverage": cov, "truth_hop_distance_share": dist_share, "results": results},
          open(OUT, "w"), indent=1)
print("ok", MODE, N, n_imp, len(queries))
