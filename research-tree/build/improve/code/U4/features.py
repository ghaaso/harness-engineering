"""Per-block feature caches and tables.
usage: features.py base [REPOS]     base features of every block -> /out/cache/<repo>/<k>.npz (labels only for train/tune)
       features.py content [REPOS]  content cosine -> /out/cache/<repo>/<k>.content.npy (needs /out/emb/<repo>.npz)
       features.py tables [REPOS]   CSV tables -> /out/tables/<repo>/<split>/<k>.csv.gz (needs base, content, EASE)
Tables: one row per (task, candidate), the seed excluded. Columns: ID (block, commit, task, seed, cand, tie, label) then
FEATURES then the empty columns for B4 and B5. Training tables of zulip hold a pool per task (below), tuning and held-out
tables hold every candidate. Held-out tables carry no label (empty)."""
import os, sys, time
import numpy as np
import d4lib as L
import u4lib as U

ID = ['k', 'commit', 'task', 'seed', 'cand', 'tie', 'label']
POOL_FULL_N = 600          # training lists are complete when a block has at most this many files (FixFlow, the clinic)
POOL_TOP = 100             # otherwise: every truth file, the top 100 of each listed signal, and 100 random others
POOL_SIGNALS = ['PC', 'INV365', 'DEC90', 'TEXT', 'PPR', 'CONTENT_COS', 'EASE']
POOL_RANDOM = 100


def cdir(repo):
    d = os.path.join(U.U4, 'cache', repo); os.makedirs(d, exist_ok=True); return d


def base_block(args):
    name, k = args
    fp = os.path.join(cdir(name), '%d.npz' % k)
    if os.path.exists(fp):
        return name, k, 0.0
    t0 = time.time()
    r = REPOS_[name]; b = r.block(k)
    if not len(b.tasks):
        np.savez(fp, empty=np.array(1)); return name, k, time.time() - t0
    F = U.base_features(b)
    extra = dict(seeds=b.seeds, commit=np.array([t for t, s, _ in b.tasks]), tie=b.rnd)
    if b.split != 'test':
        extra['label'] = U.labels(b)
    np.savez(fp + '.tmp.npz', **F, **extra)
    os.replace(fp + '.tmp.npz', fp)
    return name, k, time.time() - t0


REPOS_ = {}


def base(names):
    from multiprocessing import Pool
    for n in names:
        REPOS_[n] = L.Repo(n); U.events(REPOS_[n]); REPOS_[n].pairs()   # computed once, shared by the forked workers
    jobs = [(n, k) for n in names for k in REPOS_[n].block_ids()]
    t0 = time.time()
    with Pool(int(os.environ.get('U4_PROCS', '6'))) as p:
        for i, (n, k, s) in enumerate(p.imap_unordered(base_block, jobs)):
            if s:
                print('%s block %d %.1fs (%d/%d, %.0fs)' % (n, k, s, i + 1, len(jobs), time.time() - t0), flush=True)


def content(names):
    for n in names:
        r = L.Repo(n)
        for k in r.block_ids():
            fp = os.path.join(cdir(n), '%d.content.npy' % k)
            if os.path.exists(fp):
                continue
            b = r.block(k)
            if len(b.tasks):
                np.save(fp, U.content_cos(b))
        print(n, 'content cosine done', flush=True)


def load_block(name, k):
    """dict of [T, N] arrays (base + CONTENT_COS + EASE) and the id arrays; None for a block without tasks."""
    z = np.load(os.path.join(cdir(name), '%d.npz' % k))
    if 'empty' in z:
        return None
    D = {c: z[c] for c in z.files}
    D['CONTENT_COS'] = np.load(os.path.join(cdir(name), '%d.content.npy' % k))
    D['EASE'] = np.load(os.path.join(cdir(name), '%d.ease.npy' % k))
    return D


def pool_mask(D, k):
    """[T, N] bool: the training rows of one block (seed cells excluded)."""
    T, N = D['PC'].shape
    if N <= POOL_FULL_N:
        M = np.ones((T, N), dtype=bool)
    else:
        M = D['label'] > 0
        for s in POOL_SIGNALS:
            S = np.nan_to_num(D[s].astype(np.float64), nan=-np.inf)
            S[np.arange(T), D['seeds']] = -np.inf
            top = np.argsort(-S, axis=1, kind='stable')[:, :POOL_TOP]
            sel = np.take_along_axis(S, top, 1) > -np.inf
            if s in ('PC', 'INV365', 'DEC90', 'EASE', 'TEXT'):
                sel &= np.take_along_axis(S, top, 1) > 0      # only candidates the signal actually scores
            M[np.repeat(np.arange(T), POOL_TOP)[sel.ravel()], top.ravel()[sel.ravel()]] = True
        rng = np.random.default_rng([int(k), 20261124])
        for t in range(T):
            M[t, rng.choice(N, size=min(POOL_RANDOM, N), replace=False)] = True
    M[np.arange(T), D['seeds']] = False
    return M


def block_frame(name, k, split, D, M=None):
    import pandas as pd
    T, N = D['PC'].shape
    if M is None:
        M = np.ones((T, N), dtype=bool); M[np.arange(T), D['seeds']] = False
    ti, ci = np.nonzero(M)
    cols = {'k': np.full(len(ti), k), 'commit': D['commit'][ti], 'task': ti, 'seed': D['seeds'][ti], 'cand': ci,
            'tie': D['tie'][ti, ci],
            'label': (D['label'][ti, ci] if 'label' in D else np.full(len(ti), np.nan, dtype=np.float32))}
    for f in U.FEATURES:
        cols[f] = D[f][ti, ci]
    for f in U.EMPTY:
        cols[f] = np.full(len(ti), np.nan, dtype=np.float32)
    return pd.DataFrame(cols)


def table_block(args):
    n, k, split = args
    d = os.path.join(U.U4, 'tables', n, split); os.makedirs(d, exist_ok=True)
    fp = os.path.join(d, '%d.csv.gz' % k)
    if os.path.exists(fp):
        return split, 0
    D = load_block(n, k)
    if D is None:
        return split, 0
    M = pool_mask(D, k) if split == 'train' else None
    df = block_frame(n, k, split, D, M)
    df.to_csv(fp + '.tmp', index=False, float_format='%.9g', compression='gzip')
    os.replace(fp + '.tmp', fp)          # a file is complete or absent (restartable)
    return split, len(df)


def tables(names):
    from multiprocessing import Pool
    for n in names:
        r = L.Repo(n)
        t0 = time.time(); rows = {}
        jobs = [(n, k, r.blocks_meta[k]['split']) for k in r.block_ids()]
        with Pool(int(os.environ.get('U4_PROCS', '6'))) as p:
            for split, m in p.imap_unordered(table_block, jobs):
                rows[split] = rows.get(split, 0) + m
        print(n, 'tables written', rows, '%.0fs' % (time.time() - t0), flush=True)


if __name__ == '__main__':
    cmd = sys.argv[1]
    names = sys.argv[2:] or L.REPOS
    {'base': base, 'content': content, 'tables': tables}[cmd](names)
