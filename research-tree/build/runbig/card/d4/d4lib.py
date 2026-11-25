"""D4 shared code: data, blocks, tasks, untrained arms, metrics, fusion, bootstrap. Scoring is fixed in README.md.
Run inside the container (numpy, scipy). Data root: env D4_DATA (default /data), results root: D4_OUT (default /out)."""
import json, os, math, re, collections
import numpy as np
import scipy.sparse as sp

DATA = os.environ.get('D4_DATA', '/data')
OUT = os.environ.get('D4_OUT', '/out')
TIE_SEED = 7
K = 10
RRF_K = 60
HALF_LIVES = [None, 7, 30, 90, 180, 365]   # days; None = no decay
REPOS = ['fixflow', 'clinic', 'zulip']


class Repo:
    def __init__(self, name):
        self.name = name
        d = os.path.join(DATA, name)
        self.dir = d
        self.commits = [json.loads(l) for l in open(os.path.join(d, 'commits.jsonl')) if l.strip()]
        self.plan = json.load(open(os.path.join(d, 'plan.json')))
        self.blocks_meta = {b['k']: b for b in self.plan['blocks']}
        self.max_id = max(i for c in self.commits for i, _ in c['ev'])
        self._pairs = None

    def pairs(self):
        """All co-change pairs over the whole history (global ids), as arrays; a block filters by commit index < hend.
        Commit size = code files added or modified in the commit; commits of 2..50 files count."""
        if self._pairs is None:
            I, J, C, S = [], [], [], []
            for n, c in enumerate(self.commits):
                F = sorted({i for i, st in c['ev'] if st in ('A', 'M')})
                if len(F) < 2 or len(F) > 50:
                    continue
                a, b = np.triu_indices(len(F), 1)
                Fa = np.array(F, dtype=np.int32)
                I.append(Fa[a]); J.append(Fa[b]); C.append(np.full(len(a), n, dtype=np.int32)); S.append(np.full(len(a), len(F), dtype=np.int32))
            self._pairs = tuple(np.concatenate(x) for x in (I, J, C, S))
        return self._pairs

    def block_ids(self, split=None):
        return [b['k'] for b in self.plan['blocks'] if split in (None, b['split'])]

    def block(self, k):
        return Block(self, k)


class Block:
    def __init__(self, repo, k):
        self.repo, self.k = repo, k
        m = repo.blocks_meta[k]
        self.meta = m
        self.split = m['split']
        self.cutoff = m['cutoff_ct']
        b = json.load(open(os.path.join(repo.dir, 'blocks', '%d.json' % k)))
        self.ids = sorted(int(x) for x in b['alive'])
        self.idx = {i: n for n, i in enumerate(self.ids)}
        self.paths = [b['alive'][str(i)] for i in self.ids]
        self.N = len(self.ids)
        self.imports = sorted({(self.idx[int(a)], self.idx[int(c)]) for a, c in (e.split(',') for e in b['imports'])
                               if int(a) in self.idx and int(c) in self.idx})
        self._hist()
        self._tasks()
        self._cache = {}

    # ---- history: only commits with committer time strictly before the block's first task commit
    def _hist(self):
        hend = self.meta['hend']
        assert all(c['ct'] < self.cutoff for c in self.repo.commits[:hend]), 'history leaks past the cutoff'
        self.hist_n = hend
        gI, gJ, gC, gS = self.repo.pairs()
        lut = np.full(self.repo.max_id + 1, -1, dtype=np.int32)
        for i, n in self.idx.items():
            lut[i] = n
        m = (gC < hend) & (lut[gI] >= 0) & (lut[gJ] >= 0)
        a, c = lut[gI[m]], lut[gJ[m]]
        self.pI, self.pJ = np.minimum(a, c), np.maximum(a, c)
        self.pC, self.pS = gC[m], gS[m]
        cts = np.array([c['ct'] for c in self.repo.commits], dtype=np.int64)
        self.pT = cts[self.pC]

    # ---- tasks: one per (task commit, modified alive seed); truth = the other modified alive code files
    def _tasks(self):
        self.tasks = []   # (commit_index, seed_idx, truth_idx array)
        for t in self.meta['tasks']:
            c = self.repo.commits[t]
            S = sorted({self.idx[i] for i, st in c['ev'] if st == 'M' and i in self.idx})
            if len(S) < 2:
                continue
            for s in S:
                self.tasks.append((t, s, np.array([x for x in S if x != s], dtype=np.int32)))
        self.seeds = np.array([x[1] for x in self.tasks], dtype=np.int32)
        T = len(self.tasks)
        rnd = np.empty((T, self.N), dtype=np.float32)
        for n, (t, s, _) in enumerate(self.tasks):
            sha = self.repo.commits[t]['sha']
            rnd[n] = np.random.default_rng([int(sha[:12], 16), int(s), TIE_SEED]).random(self.N, dtype=np.float32)
        self.rnd = rnd

    # ---- pair-weight matrix: symmetric N x N csr; weights decay(age at the cutoff) x (1/size if inv)
    def W(self, hl=None, inv=False):
        key = ('W', hl, inv)
        if key not in self._cache:
            w = np.ones(len(self.pI), dtype=np.float64)
            if hl:
                w *= 0.5 ** ((self.cutoff - self.pT) / (hl * 86400.0))
            if inv:
                w /= self.pS
            A = sp.coo_matrix((w, (self.pI, self.pJ)), shape=(self.N, self.N)).tocsr()
            self._cache[key] = (A + A.T).tocsr()
        return self._cache[key]

    def rows(self, M):  # dense score rows for the task seeds
        return np.asarray(M[self.seeds].todense(), dtype=np.float32)


# ---------------------------------------------------------------- untrained arms (return [T, N] score matrices)
def arm_decay(b, hl=None, inv=False):
    return b.rows(b.W(hl, inv))


def arm_text(b):
    if 'text' in b._cache:
        return b._cache['text']
    toks = re.compile(r'[a-z]{3,}')
    stop = set('the and for with from this that not are was add fix use get set new into when after before via has have its'.split())
    prof = [collections.Counter() for _ in range(b.N)]
    for c in b.repo.commits[:b.meta['hend']]:
        words = [w for w in toks.findall(c['msg'].lower()) if w not in stop]
        if not words:
            continue
        for i, st in c['ev']:
            if st in ('A', 'M') and i in b.idx:
                prof[b.idx[i]].update(words)
    vocab = {}
    rr, cc, vv = [], [], []
    for n, p in enumerate(prof):
        for w, cnt in p.items():
            rr.append(n); cc.append(vocab.setdefault(w, len(vocab))); vv.append(1 + math.log(cnt))
    M = sp.csr_matrix((vv, (rr, cc)), shape=(b.N, max(len(vocab), 1)), dtype=np.float64)
    df = np.asarray((M > 0).sum(axis=0)).ravel()
    idf = np.log((1 + b.N) / (1 + df)) + 1
    M = M.multiply(idf).tocsr()
    nrm = np.sqrt(np.asarray(M.multiply(M).sum(axis=1)).ravel()); nrm[nrm == 0] = 1
    M = sp.diags(1 / nrm) @ M
    S = np.asarray((M[b.seeds] @ M.T).todense(), dtype=np.float32)
    b._cache['text'] = S
    return S


def structural_graph(b):
    """Undirected adjacency over files + folders: imports, file-in-folder, folder-parent. Returns csr (Nall x Nall), Nall."""
    dirs = {}
    edges = [(a, c) for a, c in b.imports]
    for i, p in enumerate(b.paths):
        d = os.path.dirname(p)
        chain = []
        while True:
            if d not in dirs:
                dirs[d] = b.N + len(dirs)
            chain.append(d)
            if not d or d == '/':
                break
            d = os.path.dirname(d)
        edges.append((i, dirs[chain[0]]))
        for x, y in zip(chain, chain[1:]):
            edges.append((dirs[x], dirs[y]))
    n = b.N + len(dirs)
    e = np.array(sorted(set(edges)), dtype=np.int64)
    A = sp.coo_matrix((np.ones(len(e)), (e[:, 0], e[:, 1])), shape=(n, n)).tocsr()
    A = ((A + A.T) > 0).astype(np.float64)
    return A, n


def arm_ppr(b, alpha=0.15, iters=30):
    A, n = structural_graph(b)
    deg = np.asarray(A.sum(axis=1)).ravel(); deg[deg == 0] = 1
    P = (sp.diags(1 / deg) @ A).T.tocsr()          # column-stochastic transition
    T = len(b.seeds)
    E = np.zeros((n, T)); E[b.seeds, np.arange(T)] = 1.0
    X = E.copy()
    for _ in range(iters):
        X = (1 - alpha) * (P @ X) + alpha * E
    return X[:b.N].T.astype(np.float32)


def ranks_of(S, rnd, seeds):
    """1-based rank of every candidate per row (best = 1), ties broken by rnd; the seed gets the worst rank."""
    S = S.copy(); S[np.arange(len(seeds)), seeds] = -np.inf
    order = np.empty(S.shape, dtype=np.int32)
    for r in range(S.shape[0]):
        order[r] = np.lexsort((rnd[r], -S[r]))
    R = np.empty_like(order)
    ar = np.arange(1, S.shape[1] + 1, dtype=np.int32)
    for r in range(S.shape[0]):
        R[r, order[r]] = ar
    return R


def arm_rrf(b):
    """Our ranker as reconstructed: RRF (k=60) of rooted PageRank on the structural graph and co-change confidence."""
    pc = arm_decay(b)
    Rp, Rc = ranks_of(arm_ppr(b), b.rnd, b.seeds), ranks_of(pc, b.rnd, b.seeds)
    return (1.0 / (RRF_K + Rp) + 1.0 / (RRF_K + Rc)).astype(np.float32)


def fuse(Ra, Rb, w):
    return (1.0 / (RRF_K + Ra) + w / (RRF_K + Rb)).astype(np.float32)


# ---------------------------------------------------------------- metrics
def per_commit(b, S):
    """S: [T, N] scores for the block's tasks. Returns {commit_index: (p10, r10)} (mean over the commit's seeds)."""
    S = S.copy(); S[np.arange(len(b.seeds)), b.seeds] = -np.inf
    acc = collections.defaultdict(list)
    for r, (t, s, truth) in enumerate(b.tasks):
        top = np.lexsort((b.rnd[r], -S[r]))[:K]
        hit = len(set(top.tolist()) & set(truth.tolist()))
        acc[t].append((hit / K, hit / len(truth)))
    return {t: tuple(np.mean(v, axis=0)) for t, v in acc.items()}


def bootstrap(diffs, n=10000, seed=1):
    d = np.asarray(diffs, dtype=np.float64)
    if len(d) == 0:
        return (float('nan'),) * 3
    rng = np.random.default_rng(seed)
    idx = rng.integers(0, len(d), size=(n, len(d)))
    m = d[idx].mean(axis=1)
    return float(d.mean()), float(np.percentile(m, 2.5)), float(np.percentile(m, 97.5))


def verdict_word(mean, lo, hi, bar=0.02):
    if lo > 0 and mean >= bar:
        return 'adds'
    if lo > -bar and hi < bar:
        return 'matches'
    return 'cannot tell' + (' (lower)' if hi < 0 else '')
