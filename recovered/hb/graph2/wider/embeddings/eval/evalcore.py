"""Shared evaluation core for the embedding step (protocol addendum 8, sections B, D, F).

Everything an arm needs to be scored the same way as the comparators:
  tasks         load_tasks(), late50 flags, truth (tune split only)
  candidates    pool(task) (pilot definition) and unrestricted(task)
  comparators   ppr_scores, co_scores, dir_scores, random_scores, rrf_scores (weighted, optional terms)
  ranking       rank(task_id, candidates, scores, tie_seed): scored first by score, ties and unscored
                candidates in a fixed random order derived from (tie_seed, task_id, candidate)
  metrics       evaluate_table(table, scope) -> per-task P@10, R@10, R@20, MRR (R against ALL truth)
                mean_over_seeds(per_task list), per_commit(per_task, commits), summary(...)
  statistics    bootstrap(per-commit values), paired(a, b), holm(pvals), holm_intervals(...)
  score tables  write_score_table / read_score_table (tsv.gz: task_id, candidate, score)
  progress      progress_done(step) / progress_log(step, unit, ...): embeddings/progress.jsonl, one JSON
                line per finished unit {step, unit, status, t, ...}; every long step skips a unit whose
                status is done AND whose output file exists, writes outputs as <file>.part then renames,
                and logs the unit only after the rename (export.js follows the same convention).

Paths are plain repository paths ("backend/app/main.py"). Root folder: env EMB_ROOT, default the folder
above this file (embeddings/). Pure Python + numpy.
"""
import os, re, json, gzip, math, hashlib, collections
import numpy as np

ROOT = os.environ.get('EMB_ROOT') or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GRAPHS = os.path.join(ROOT, 'export', 'graphs')
CODE = re.compile(r'^(backend|src|technician-app)/.*\.(py|ts|tsx|js|jsx|mjs|cjs)$')
METRICS = ('P@10', 'R@10', 'R@20', 'MRR')
SCOPES = ('pool', 'unrestricted')
TIE_SEED = 20261114  # fixed tie-breaking seed for every arm


# ---------------------------------------------------------------- tasks
def load_tasks(path=None):
    """Tune tasks in date order: list of dicts (task_id, commit, date_order, pilot_order, late50,
    late50_pilot, parent, seed, truth, commit_seeds)."""
    path = path or os.path.join(ROOT, 'eval', 'tune_tasks.jsonl')
    return [json.loads(l) for l in open(path) if l.strip()]


def commit_set(tasks, which='late50'):
    """'all' | 'late50' (date order > 15 by author timestamp) | 'late50_pilot' (the pilot's set) |
    'inner15' (date order <= 15)."""
    if which == 'all': return {t['commit'] for t in tasks}
    if which == 'inner15': return {t['commit'] for t in tasks if not t['late50']}
    return {t['commit'] for t in tasks if t[which]}


# ---------------------------------------------------------------- graphs
class PilotGraph:
    """The pilot's file-collapsed undirected graph at one parent (export/graphs/<sha>/pilot_graph.tsv),
    its co-change pairs (pilot_co.tsv) and the code files that exist there (entities.tsv)."""

    def __init__(self, sha):
        d = os.path.join(GRAPHS, sha)
        nb = collections.defaultdict(set)
        with open(os.path.join(d, 'pilot_graph.tsv')) as f:
            next(f)
            for l in f:
                a, b, _ = l.rstrip('\n').split('\t')
                nb[a].add(b); nb[b].add(a)
        self.nb = dict(nb)
        self.co = collections.defaultdict(dict)
        with open(os.path.join(d, 'pilot_co.tsv')) as f:
            next(f)
            for l in f:
                a, b, conf, sup, rec, cmax = l.rstrip('\n').split('\t')
                v = dict(conf=float(conf), support=float(sup), recency=float(rec), conf_max=float(cmax))
                self.co[a][b] = v; self.co[b][a] = v
        self.code_files = set()
        with open(os.path.join(d, 'entities.tsv')) as f:
            next(f)
            for l in f:
                _id, kind, path, is_code, _area = l.rstrip('\n').split('\t')
                if is_code == '1': self.code_files.add(path)
        self.keys = list(self.nb)
        self.idx = {k: i for i, k in enumerate(self.keys)}
        src, dst = [], []
        for a in self.keys:
            for b in self.nb[a]: src.append(self.idx[a]); dst.append(self.idx[b])
        self.src = np.array(src, dtype=np.int64); self.dst = np.array(dst, dtype=np.int64)
        self.deg = np.array([len(self.nb[k]) for k in self.keys], dtype=float)
        self.w = 1.0 / np.maximum(self.deg[self.src], 1)

    def ppr(self, seed_path, alpha=0.15, iters=25):
        """Rooted PageRank from F:<seed> (restart alpha, `iters` power steps, as the pilot); {key: score}."""
        S = 'F:' + seed_path
        if S not in self.idx: return {}
        N = len(self.keys); e0 = np.zeros(N); e0[self.idx[S]] = 1.0; pr = e0.copy()
        for _ in range(iters):
            pr = alpha * e0 + (1 - alpha) * np.bincount(self.dst, weights=pr[self.src] * self.w, minlength=N)
        return pr

    def pool(self, seed_path, strict=True):
        """Pilot pool: code files within 2 hops of the seed on the pilot graph, plus every co-change
        neighbour that is a code file, seed excluded. strict=True keeps the pilot's behaviour for a seed
        with no structural edge: an empty pool (feat.py skips it, and it scores 0)."""
        S = 'F:' + seed_path
        if S not in self.idx:
            if strict: return []
            near = set()
        else:
            dist = {S: 0}; fr = [S]
            for h in (1, 2):
                nf = []
                for u in fr:
                    for v in self.nb[u]:
                        if v not in dist: dist[v] = h; nf.append(v)
                fr = nf
            near = {k for k, dd in dist.items() if dd > 0}
        near |= set(self.co.get(S, {}))
        out = {k[2:] for k in near if k.startswith('F:') and CODE.match(k[2:])}
        out.discard(seed_path)
        return sorted(out)

    def unrestricted(self, seed_path):
        """Every code file that exists at the parent, seed excluded."""
        return sorted(self.code_files - {seed_path})


_GCACHE = collections.OrderedDict()


def graph(sha, cap=8):
    if sha in _GCACHE: _GCACHE.move_to_end(sha); return _GCACHE[sha]
    g = PilotGraph(sha); _GCACHE[sha] = g
    if len(_GCACHE) > cap: _GCACHE.popitem(last=False)
    return g


def candidates(task, scope):
    g = graph(task['parent'])
    return g.pool(task['seed']) if scope == 'pool' else g.unrestricted(task['seed'])


# ---------------------------------------------------------------- comparators (score dicts: path -> score)
def ppr_scores(task, cands, alpha=0.15, iters=25):
    g = graph(task['parent']); pr = g.ppr(task['seed'], alpha, iters)
    if len(pr) == 0: return {c: 0.0 for c in cands}
    return {c: float(pr[g.idx['F:' + c]]) if ('F:' + c) in g.idx else 0.0 for c in cands}


def co_scores(task, cands, field='conf'):
    """Co-change confidence; only candidates with a positive value are scored (the pilot's 'co-change
    only where it exists'). field='conf' is the pilot's value (last raw row of the pair), 'conf_max' the
    shared loader's (max over rows)."""
    g = graph(task['parent']); row = g.co.get('F:' + task['seed'], {})
    out = {}
    for c in cands:
        v = row.get('F:' + c)
        if v and v[field] > 0: out[c] = v[field]
    return out


def dir_scores(task, cands):
    """Number of shared leading directory segments with the seed."""
    sd = task['seed'].split('/')[:-1]
    out = {}
    for c in cands:
        cd = c.split('/')[:-1]; n = 0
        while n < min(len(sd), len(cd)) and sd[n] == cd[n]: n += 1
        out[c] = float(n)
    return out


def random_scores(task, cands):
    """Every candidate tied at 0: the order is the fixed random tie-break alone."""
    return {c: 0.0 for c in cands}


def ranks_within(task_id, cands, scores, tie_seed=TIE_SEED):
    """1-based rank of every SCORED candidate among the scored candidates of `cands`."""
    order = rank(task_id, [c for c in cands if c in scores], scores, tie_seed)
    return {c: i + 1 for i, c in enumerate(order)}


def rrf_scores(task_id, cands, arms, k=60, tie_seed=TIE_SEED):
    """Weighted reciprocal-rank fusion. arms = [(scores, weight), ...]; an arm contributes
    weight / (k + rank) for a candidate only if it scored that candidate (an unscored candidate adds no
    term: the pilot's co-change rule and addendum 8 item 17)."""
    out = {c: 0.0 for c in cands}
    for scores, wt in arms:
        for c, r in ranks_within(task_id, cands, scores, tie_seed).items(): out[c] += wt / (k + r)
    return out


# ---------------------------------------------------------------- ranking and metrics
def tiebreak(task_id, cand, tie_seed=TIE_SEED):
    h = hashlib.blake2b(('%d|%s|%s' % (tie_seed, task_id, cand)).encode(), digest_size=8).digest()
    return int.from_bytes(h, 'big') / 2.0 ** 64


def rank(task_id, cands, scores, tie_seed=TIE_SEED):
    """Ranked list: scored candidates by score (desc), then unscored ones; ties and the unscored block in
    the fixed random order of tiebreak(task_id, candidate). NaN scores count as unscored."""
    sc = [(-scores[c], tiebreak(task_id, c, tie_seed), c) for c in cands
          if c in scores and scores[c] is not None and not (isinstance(scores[c], float) and math.isnan(scores[c]))]
    scored = {c for _, _, c in sc}
    un = [(tiebreak(task_id, c, tie_seed), c) for c in cands if c not in scored]
    return [c for _, _, c in sorted(sc)] + [c for _, c in sorted(un)]


def task_metrics(ranked, truth):
    """P@10 = hits/10; R@K = hits/|truth| (truth outside the list counts); MRR = 1/rank of the first truth
    file in the list (0 if none)."""
    T = set(truth); n = max(len(T), 1)
    h10 = sum(1 for c in ranked[:10] if c in T); h20 = sum(1 for c in ranked[:20] if c in T)
    mrr = 0.0
    for i, c in enumerate(ranked):
        if c in T: mrr = 1.0 / (i + 1); break
    return {'P@10': h10 / 10.0, 'R@10': h10 / n, 'R@20': h20 / n, 'MRR': mrr}


def evaluate_table(table, scope, tasks=None, tie_seed=TIE_SEED):
    """table: {task_id: {candidate: score}} from any arm. Scored on the scope's candidate list for each
    task (rows for candidates outside the scope are ignored; scope candidates missing from the table are
    unscored and ranked after the scored ones in random order). Returns {task_id: metrics}."""
    tasks = tasks or load_tasks(); out = {}
    for t in tasks:
        cands = candidates(t, scope)
        out[t['task_id']] = task_metrics(rank(t['task_id'], cands, table.get(t['task_id'], {}), tie_seed), t['truth'])
    return out


def mean_over_seeds(per_task_list):
    """Average per-task metrics over training seeds (addendum 8 item 23: per seed, then the seed mean
    per task)."""
    ids = per_task_list[0].keys()
    return {i: {m: float(np.mean([pt[i][m] for pt in per_task_list])) for m in METRICS} for i in ids}


def per_commit(per_task, tasks=None, commits=None):
    """Task -> commit mean. Returns (commit list in date order, array [n_commits, 4] in METRICS order)."""
    tasks = tasks or load_tasks(); by = collections.defaultdict(list); order = {}
    for t in tasks:
        if commits is not None and t['commit'] not in commits: continue
        by[t['commit']].append([per_task[t['task_id']][m] for m in METRICS]); order[t['commit']] = t['date_order']
    cs = sorted(by, key=lambda c: order[c])
    return cs, np.array([np.mean(by[c], axis=0) for c in cs])


def summary(per_task, tasks=None, commits=None):
    """Mean over commits of the per-commit means: {metric: value}."""
    _, a = per_commit(per_task, tasks, commits)
    return {m: float(a[:, i].mean()) for i, m in enumerate(METRICS)}


# ---------------------------------------------------------------- statistics
def bootstrap(values, B=10000, seed=0, level=0.95):
    """Percentile bootstrap over commits (rows). values: [n] or [n, m]. Returns (mean, lo, hi, p) with
    p = two-sided bootstrap p-value for mean == 0 (useful on paired differences)."""
    v = np.asarray(values, float); r = np.random.default_rng(seed); n = len(v)
    idx = r.integers(0, n, (B, n))
    means = v[idx].mean(axis=1)
    a = (1 - level) / 2
    lo, hi = np.percentile(means, [100 * a, 100 * (1 - a)], axis=0)
    p = np.minimum(1.0, 2 * np.minimum((means <= 0).mean(axis=0), (means >= 0).mean(axis=0)))
    return v.mean(axis=0), lo, hi, p


def paired(per_task_a, per_task_b, tasks=None, commits=None, B=10000, seed=0, level=0.95):
    """Paired bootstrap by commit of A minus B, all four metrics: {metric: (diff, lo, hi, p)}."""
    ca, a = per_commit(per_task_a, tasks, commits); cb, b = per_commit(per_task_b, tasks, commits)
    assert ca == cb
    m, lo, hi, p = bootstrap(a - b, B, seed, level)
    return {k: (float(m[i]), float(lo[i]), float(hi[i]), float(p[i])) for i, k in enumerate(METRICS)}


def holm(pvals):
    """Holm step-down adjusted p-values (same order as given)."""
    p = np.asarray(pvals, float); m = len(p); order = np.argsort(p)
    adj = np.empty(m); run = 0.0
    for r, i in enumerate(order):
        run = max(run, min(1.0, (m - r) * p[i])); adj[i] = run
    return adj


def holm_intervals(diff_arrays, B=10000, seed=0, alpha=0.05):
    """Holm-adjusted percentile intervals for several paired contrasts. diff_arrays: list of per-commit
    difference vectors (one metric). The contrast with the r-th smallest bootstrap p-value (r = 0..m-1)
    gets a (1 - alpha / (m - r)) interval. Returns list of (mean, lo, hi, p_raw, p_holm, level)."""
    res = [bootstrap(d, B, seed) for d in diff_arrays]
    ps = [float(x[3]) for x in res]; adj = holm(ps); m = len(ps); out = [None] * m
    for r, i in enumerate(np.argsort(ps)):
        lvl = 1 - alpha / (m - r)
        mean, lo, hi, _ = bootstrap(diff_arrays[i], B, seed, lvl)
        out[i] = (float(mean), float(lo), float(hi), ps[i], float(adj[i]), lvl)
    return out


# ---------------------------------------------------------------- score tables
def write_score_table(path, table):
    """tsv.gz, header task_id<TAB>candidate<TAB>score, one row per SCORED (task, candidate); a candidate
    absent for a task is unscored. Scores in repr (round-trip) form."""
    tmp = path + '.part'
    with gzip.open(tmp, 'wt', encoding='utf-8', newline='\n') as f:
        f.write('task_id\tcandidate\tscore\n')
        for tid in sorted(table):
            for c in sorted(table[tid]): f.write('%s\t%s\t%r\n' % (tid, c, float(table[tid][c])))
    os.replace(tmp, path)


def read_score_table(path):
    out = collections.defaultdict(dict)
    with gzip.open(path, 'rt', encoding='utf-8') as f:
        next(f)
        for l in f:
            tid, c, s = l.rstrip('\n').split('\t'); out[tid][c] = float(s)
    return dict(out)


# ---------------------------------------------------------------- comparator tables
def comparator_tables(scope, tasks=None, tie_seed=TIE_SEED, co_field='conf', k=60):
    """{name: table} for PPR, CO, RRF, DIR, RANDOM on one scope (RRF ranks within that scope)."""
    tasks = tasks or load_tasks(); T = {n: {} for n in ('PPR', 'CO', 'RRF', 'DIR', 'RANDOM')}
    for t in tasks:
        tid = t['task_id']; cands = candidates(t, scope)
        p = ppr_scores(t, cands); c = co_scores(t, cands, co_field)
        T['PPR'][tid] = p; T['CO'][tid] = c; T['DIR'][tid] = dir_scores(t, cands); T['RANDOM'][tid] = random_scores(t, cands)
        T['RRF'][tid] = rrf_scores(tid, cands, [(p, 1.0), (c, 1.0)], k, tie_seed)
    return T


def fused_with(task_id, cands, ppr, co, emb, w, k=60, tie_seed=TIE_SEED):
    """Addendum 8 item 14: weighted RRF of PPR, CO and an embedding score (weight w)."""
    return rrf_scores(task_id, cands, [(ppr, 1.0), (co, 1.0), (emb, w)], k, tie_seed)


# ---------------------------------------------------------------- progress / resume
def progress_done(step, path=None):
    """Units already finished for a step (progress.jsonl at the embeddings root)."""
    path = path or os.path.join(ROOT, 'progress.jsonl')
    if not os.path.exists(path): return set()
    return {r['unit'] for r in (json.loads(l) for l in open(path) if l.strip()) if r.get('step') == step and r.get('status') == 'done'}


def progress_log(step, unit, status='done', path=None, **extra):
    import datetime
    path = path or os.path.join(ROOT, 'progress.jsonl')
    with open(path, 'a') as f:
        f.write(json.dumps(dict(step=step, unit=unit, status=status, t=datetime.datetime.utcnow().isoformat() + 'Z', **extra)) + '\n')
