"""B3: EASE (Steck, WWW 2019), a closed-form item-item ridge model on the commit x file incidence matrix of a block's
history. Rows = the card's co-change transactions (commits before hend with 2..50 code files A/M; columns = files alive
at the cutoff), each row weighted by decay(age at the cutoff) x (1/|e| if inv). G = X^T W X; P = (G + lam I)^-1;
B = -P / diag(P) with diag(B) = 0; the score of candidate c for seed s is B[s, c].
lam = lam_rel x mean(diag G). One eigendecomposition per row weight serves all six lambdas.
usage: ease.py sweep [REPOS]   (tuning blocks only; writes /out/ease/choice.json and the tuning table)
       ease.py apply [REPOS]   (the chosen setting on every block: /out/cache/<repo>/<k>.ease.npy)
       ease.py heldout [REPOS] (after the refuter) /out/heldout/B3/<repo>/<k>.npy"""
import json, os, sys, time
import numpy as np
import scipy.sparse as sp
import d4lib as L
import u4lib as U

LAMS = [0.2, 1.0, 5.0, 25.0, 125.0, 625.0]   # x mean(diag G); factor 5; at the top EASE tends to the weighted count
WEIGHTS = [(hl, inv) for inv in (False, True) for hl in (None, 30, 90, 365)]
OUTD = os.path.join(U.U4, 'ease')


def tx_matrix(b):
    """X (n_tx x N) 0/1 csr over alive files, row ct and row size, from commits[:hend] only."""
    ev = U.events(b.repo); lt = U.lut(b)
    ec, ei = ev.upto(b.meta['hend'])
    keep = (ev.size[ec] >= 2) & (ev.size[ec] <= 50) & (lt[ei] >= 0)
    ec, col = ec[keep], lt[ei[keep]]
    rows, rid = np.unique(ec, return_inverse=True)
    X = sp.csr_matrix((np.ones(len(col)), (rid, col)), shape=(len(rows), b.N))
    return X, ev.ct[rows], ev.size[rows]


def weights(b, ct, size, hl, inv):
    w = np.ones(len(ct))
    if hl:
        w *= 0.5 ** ((b.cutoff - ct) / (hl * 86400.0))
    if inv:
        w /= size
    return w


def ease_scores(b, hl, inv, lams, X=None):
    """{lam_rel: [T, N] float32}"""
    if X is None:
        X = tx_matrix(b)
    X_, ct, size = X
    assert (ct < b.cutoff).all()
    w = weights(b, ct, size, hl, inv)
    G = np.asarray((X_.T @ sp.diags(w) @ X_).todense(), dtype=np.float64)
    md = float(np.mean(np.diag(G))) or 1.0
    ev_, Q = np.linalg.eigh(G)
    Qs = Q[b.seeds]
    out = {}
    for lr in lams:
        d = 1.0 / (np.maximum(ev_, 0) + lr * md)
        Ps = (Qs * d) @ Q.T                     # P[seeds, :]
        dP = (Q ** 2) @ d                       # diag(P)
        S = -Ps / dP[None, :]
        S[np.arange(len(b.seeds)), b.seeds] = 0.0
        out[lr] = S.astype(np.float32)
    return out


def sweep(repos):
    os.makedirs(OUTD, exist_ok=True)
    res = {}
    for r in repos:
        acc = {}
        t0 = time.time()
        for k in r.block_ids('tune'):
            b = r.block(k)
            if not len(b.tasks):
                continue
            X = tx_matrix(b)
            for hl, inv in WEIGHTS:
                for lr, S in ease_scores(b, hl, inv, LAMS, X).items():
                    for t, v in L.per_commit(b, S).items():
                        acc.setdefault('%s|%s|%s' % (hl, inv, lr), {})[t] = v
        tab = {c: (float(np.mean([v[0] for v in d.values()])), float(np.mean([v[1] for v in d.values()])), len(d)) for c, d in acc.items()}
        best = max(tab, key=lambda c: tab[c][0])
        res[r.name] = dict(best=best, p10=tab[best][0], r10=tab[best][1], table=tab, secs=round(time.time() - t0))
        hl, inv, lr = best.split('|')
        edge = float(lr) in (LAMS[0], LAMS[-1])
        print(r.name, 'EASE best', best, 'P@10 %.4f R@10 %.4f' % tab[best][:2], 'lambda at grid edge' if edge else '', '%ds' % res[r.name]['secs'], flush=True)
    old = json.load(open(os.path.join(OUTD, 'choice.json'))) if os.path.exists(os.path.join(OUTD, 'choice.json')) else {}
    old.update(res)
    json.dump(old, open(os.path.join(OUTD, 'choice.json'), 'w'), indent=1)


def parse(c):
    hl, inv, lr = c.split('|')
    return (None if hl == 'None' else int(hl)), inv == 'True', float(lr)


def apply_block(args):
    name, k, best = args
    r = L.Repo(name); b = r.block(k)
    fp = os.path.join(U.U4, 'cache', name, '%d.ease.npy' % k)
    if not len(b.tasks) or os.path.exists(fp):
        return k
    hl, inv, lr = parse(best)
    np.save(fp, ease_scores(b, hl, inv, [lr])[lr])
    return k


def apply(repos):
    ch = json.load(open(os.path.join(OUTD, 'choice.json')))
    from multiprocessing import Pool
    for r in repos:
        os.makedirs(os.path.join(U.U4, 'cache', r.name), exist_ok=True)
        jobs = [(r.name, k, ch[r.name]['best']) for k in r.block_ids()]
        with Pool(int(os.environ.get('U4_PROCS', '4'))) as p:
            for k in p.imap_unordered(apply_block, jobs):
                pass
        print(r.name, 'EASE applied to', len(jobs), 'blocks', flush=True)


def heldout(repos):
    """(only after the refuter) held-out ranking files of B3: the chosen EASE matrices of the held-out blocks, unscored."""
    import shutil
    for r in repos:
        d = os.path.join(U.U4, 'heldout', 'B3', r.name); os.makedirs(d, exist_ok=True)
        n = 0
        for k in r.block_ids('test'):
            src = os.path.join(U.U4, 'cache', r.name, '%d.ease.npy' % k)
            if os.path.exists(src):
                shutil.copyfile(src, os.path.join(d, '%d.npy' % k)); n += 1
        print(r.name, 'B3 held-out ranking files:', n, flush=True)


if __name__ == '__main__':
    cmd = sys.argv[1]
    repos = [L.Repo(n) for n in (sys.argv[2:] or L.REPOS)]
    {'sweep': sweep, 'apply': apply, 'heldout': heldout}[cmd](repos)
