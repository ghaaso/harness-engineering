"""U4 features for D4 (task: files that change together with a seed file). Every feature of block b is computed from
commits[:b.meta['hend']] (all strictly before b.cutoff, d4lib.py:70), the alive file set and imports at that point, and the
content snapshot at the start of the block's split (a commit before every cutoff of that split).
The untrained arms are the card run's own functions (d4lib, evaluate.untrained_matrix), so they come out unchanged.
Run inside the container: PYTHONPATH=/card:/code, D4_DATA=/data (U4 data: card blocks copied + training blocks)."""
import json, os, re
import numpy as np
import scipy.sparse as sp
import d4lib as L
import evaluate as E

U4 = os.environ.get('U4_ROOT', '/out')
ARMS = list(E.UNTRAINED)                      # PC, DEC7..DEC365, INV, INV7..INV365, TEXT, RRF (the card's list)
BASE = ARMS + ['PPR', 'CONF_SC', 'CONF_CS', 'LAST_CO_DAYS', 'CAND_NCHG', 'CAND_AGE_DAYS', 'CAND_LAST_DAYS', 'SEED_NCHG',
               'SAME_STEM', 'TEST_PAIR', 'FOLDER_DIST', 'IMP_SC', 'IMP_CS']
LATE = ['CONTENT_COS', 'EASE']                # added after the embeddings and the EASE choice
EMPTY = ['B4_GNN', 'B5_DYGFORMER', 'B5_TGN']   # filled by units U5 and U6
FEATURES = BASE + LATE                        # what the ranker may use (EMPTY ones once filled)
DAY = 86400.0


# ------------------------------------------------------------------ per-repository event arrays (whole history)
class Events:
    """Flat arrays of the A/M events of every commit: commit index, global id, and per commit the number of distinct
    A/M code files (the card's commit size). A block takes the prefix commit < hend."""
    def __init__(self, repo):
        cs, ids, size = [], [], np.zeros(len(repo.commits), dtype=np.int32)
        for n, c in enumerate(repo.commits):
            F = sorted({i for i, st in c['ev'] if st in ('A', 'M')})
            size[n] = len(F)
            cs.extend([n] * len(F)); ids.extend(F)
        self.c = np.array(cs, dtype=np.int64); self.i = np.array(ids, dtype=np.int64); self.size = size
        self.ct = np.array([c['ct'] for c in repo.commits], dtype=np.int64)

    def upto(self, hend):
        m = self.c < hend
        return self.c[m], self.i[m]


def events(repo):
    if '_u4ev' not in repo.__dict__:          # cached on the Repo object itself (a modified copy gets its own)
        repo._u4ev = Events(repo)
    return repo._u4ev


def lut(b):
    t = np.full(b.repo.max_id + 1, -1, dtype=np.int64)
    for i, n in b.idx.items():
        t[i] = n
    return t


# ------------------------------------------------------------------ names and folders
TEST_RE = re.compile(r'(^|/)(tests?|__tests__|spec)/')


def stem(p):
    return os.path.basename(p).split('.')[0].lower()


def is_test(p):
    b = os.path.basename(p).lower()
    return bool(TEST_RE.search(p.lower()) or b.startswith('test_') or b == 'tests.py' or re.search(r'(_test|_tests)\.\w+$', b)
                or re.search(r'\.(test|spec)\.\w+$', b))


def core(p):
    s = stem(p)
    s = re.sub(r'^test_', '', s); s = re.sub(r'_tests?$', '', s)
    return s


def name_features(b):
    """[N] codes: stem id, core id, is_test; and a [N] list of folder component tuples."""
    st, co = {}, {}
    sid = np.array([st.setdefault(stem(p), len(st)) for p in b.paths]); cid = np.array([co.setdefault(core(p), len(co)) for p in b.paths])
    tst = np.array([is_test(p) for p in b.paths])
    dirs = [tuple(x for x in os.path.dirname(p).split('/') if x) for p in b.paths]
    return sid, cid, tst, dirs


def folder_dist_rows(b, dirs):
    """[T, N] tree distance between the folders of seed and candidate (0 = same folder)."""
    depth = np.array([len(d) for d in dirs])
    maxd = depth.max() if len(depth) else 0
    # prefix ids per depth: pid[k][n] = id of the first k components of file n's folder (or -1 if shallower)
    pid = []
    for k in range(1, maxd + 1):
        tab = {}
        pid.append(np.array([tab.setdefault(d[:k], len(tab)) if len(d) >= k else -1 for d in dirs]))
    out = np.empty((len(b.seeds), b.N), dtype=np.float32)
    for r, s in enumerate(b.seeds):
        common = np.zeros(b.N, dtype=np.int64)
        for k in range(1, depth[s] + 1):
            common += (pid[k - 1] == pid[k - 1][s])
        out[r] = depth[s] + depth - 2 * common
    return out


# ------------------------------------------------------------------ base features of one block
def base_features(b):
    """dict name -> [T, N] float32 (seed cell included; scoring and tables drop it). Facts: commits[:hend] only."""
    T, N = len(b.tasks), b.N
    F = {}
    for a in ARMS:
        F[a] = np.asarray(E.untrained_matrix(b, a), dtype=np.float32)
    F['PPR'] = np.asarray(L.arm_ppr(b), dtype=np.float32)
    ev = events(b.repo); lt = lut(b)
    ec, ei = ev.upto(b.meta['hend'])
    ei_l = lt[ei]; alive = ei_l >= 0
    # own change counts (any commit), first and last change; transactions = commits of 2..50 files (the card's pairs)
    nchg = np.bincount(ei_l[alive], minlength=N).astype(np.float64)
    tx = alive & (ev.size[ec] >= 2) & (ev.size[ec] <= 50)
    ntx = np.bincount(ei_l[tx], minlength=N).astype(np.float64)
    first = np.full(N, np.iinfo(np.int64).max); last = np.full(N, -1)
    np.minimum.at(first, ei_l[alive], ec[alive]); np.maximum.at(last, ei_l[alive], ec[alive])
    seen = last >= 0
    age = np.full(N, np.nan); lastd = np.full(N, np.nan)
    age[seen] = (b.cutoff - ev.ct[first[seen]]) / DAY; lastd[seen] = (b.cutoff - ev.ct[last[seen]]) / DAY
    pc = F['PC'].astype(np.float64)
    with np.errstate(divide='ignore', invalid='ignore'):
        F['CONF_SC'] = np.nan_to_num(pc / ntx[b.seeds][:, None], nan=0.0, posinf=0.0).astype(np.float32)
        F['CONF_CS'] = np.nan_to_num(pc / ntx[None, :], nan=0.0, posinf=0.0).astype(np.float32)
    # age of the last co-change of (seed, candidate): the latest pT over the block's pairs (all ct < cutoff)
    if len(b.pI):
        key = b.pI.astype(np.int64) * N + b.pJ
        o = np.lexsort((b.pT, key)); k2, t2 = key[o], b.pT[o]
        lastpos = np.r_[np.nonzero(k2[1:] != k2[:-1])[0], len(k2) - 1]
        uk, ut = k2[lastpos], t2[lastpos].astype(np.float64)
        M = sp.coo_matrix((ut, (uk // N, uk % N)), shape=(N, N)).tocsr(); M = (M + M.T).tocsr()
        R = np.asarray(M[b.seeds].todense())
    else:
        R = np.zeros((T, N))
    F['LAST_CO_DAYS'] = np.where(R > 0, (b.cutoff - R) / DAY, np.nan).astype(np.float32)
    F['CAND_NCHG'] = np.broadcast_to(nchg[None, :], (T, N)).astype(np.float32)
    F['CAND_AGE_DAYS'] = np.broadcast_to(age[None, :], (T, N)).astype(np.float32)
    F['CAND_LAST_DAYS'] = np.broadcast_to(lastd[None, :], (T, N)).astype(np.float32)
    F['SEED_NCHG'] = np.broadcast_to(nchg[b.seeds][:, None], (T, N)).astype(np.float32)
    sid, cid, tst, dirs = name_features(b)
    F['SAME_STEM'] = (sid[None, :] == sid[b.seeds][:, None]).astype(np.float32)
    F['TEST_PAIR'] = ((cid[None, :] == cid[b.seeds][:, None]) & (tst[None, :] != tst[b.seeds][:, None])).astype(np.float32)
    F['FOLDER_DIST'] = folder_dist_rows(b, dirs)
    A = np.zeros((N, N), dtype=np.float32)
    for a, c in b.imports:
        A[a, c] = 1.0                                   # a imports c
    F['IMP_SC'] = A[b.seeds].copy(); F['IMP_CS'] = A[:, b.seeds].T.copy()
    return F


def labels(b):
    Y = np.zeros((len(b.tasks), b.N), dtype=np.float32)
    for r, (t, s, truth) in enumerate(b.tasks):
        Y[r, truth] = 1.0
    return Y


# ------------------------------------------------------------------ content cosine from the split-start snapshot
_SNAP, _EMB = {}, {}


def snap_index(repo):
    if repo not in _SNAP:
        _SNAP[repo] = json.load(open(os.path.join(U4, 'snap', repo, 'index.json')))
    return _SNAP[repo]


def emb(repo):
    if repo not in _EMB:
        z = np.load(os.path.join(U4, 'emb', repo + '.npz'))
        _EMB[repo] = ({k: n for n, k in enumerate(z['keys'].tolist())}, z['vecs'])
    return _EMB[repo]


def content_cos(b):
    """[T, N] cosine of the seed's and the candidate's file vectors in the snapshot of the block's split start; NaN when
    either file is not in that snapshot (added later, or its path absent from the snapshot tree)."""
    ix = snap_index(b.repo.name)
    seg = ix['segments'][ix['block_seg'][str(b.k)]]
    assert seg['hend'] <= b.meta['hend'], 'content snapshot after the block cutoff'
    kmap, V = emb(b.repo.name)
    rows = np.full(b.N, -1, dtype=np.int64)
    for n, gid in enumerate(b.ids):
        key = seg['files'].get(str(gid))
        if key is not None:
            rows[n] = kmap[key]
    X = np.zeros((b.N, V.shape[1]), dtype=np.float32); have = rows >= 0
    X[have] = V[rows[have]]
    S = X[b.seeds] @ X.T
    S[~have[b.seeds], :] = np.nan; S[:, ~have] = np.nan
    return S.astype(np.float32)


# ------------------------------------------------------------------ scoring straight from a table (no d4lib Block)
def per_commit_table(commit, task, score, tie, label):
    """Rows of one block (seed rows absent): mean over a commit's seeds of P@10 and recall@10, ties by `tie`.
    Same rule as d4lib.per_commit: order by (-score, tie), top ten."""
    out = {}
    label = np.asarray(label, dtype=np.float64); score = np.asarray(score, dtype=np.float64)
    o = np.lexsort((tie, -score, task))          # by task, then score desc, then tie asc
    task_o = task[o]
    starts = np.r_[0, np.nonzero(task_o[1:] != task_o[:-1])[0] + 1]
    ends = np.r_[starts[1:], len(o)]
    acc = {}
    for s0, e0 in zip(starts, ends):
        rows = o[s0:e0]
        hit = label[rows[:L.K]].sum(); nt = label[rows].sum()
        acc.setdefault(int(commit[rows[0]]), []).append((hit / L.K, hit / nt))
    for t, v in acc.items():
        out[t] = tuple(np.mean(v, axis=0))
    return out
