"""A3: convex fusion of normalised text (the frozen A7 arm, a BM25 form), Qwen3 and SweRank scores; RRF as a variant.
Weights on the simplex, step 0.1; normalisation min-max, z-score or theoretical min-max (text: 0 to max; cosine: -1 to
max), per query over the snapshot's files; RRF k 10/30/60 with equal weights (a text arm lists only matching files).
Pooled or per repository, and convex or RRF, are chosen by five-fold cross-validation inside the tuning split (contiguous
folds in time, per repository); the chosen family is then refitted on the whole tuning split.
usage: python fusion.py   (writes /out/tune/a3.json)"""
import itertools, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import u1lib as L

ARMS = ['s_a7', 's_qwen3', 's_swerank']
WEIGHTS = [w for w in ((a / 10, b / 10, round(1 - a / 10 - b / 10, 1)) for a in range(11) for b in range(11 - a))]
NORMS = ['mm', 'z', 'tmm']
RRF_K = [10, 30, 60]
CONFIGS = [dict(kind='convex', norm=n, w=list(w)) for n in NORMS for w in WEIGHTS] + [dict(kind='rrf', k=k) for k in RRF_K]
FAMILIES = ['rrf-pooled', 'convex-pooled', 'rrf-per-repo', 'convex-per-repo']   # ties: the simpler first


def normalise(x, how, lower):
    if how == 'mm':
        r = x.max() - x.min()
        return (x - x.min()) / r if r > 0 else np.zeros_like(x)
    if how == 'z':
        s = x.std()
        return (x - x.mean()) / s if s > 0 else np.zeros_like(x)
    r = x.max() - lower
    return (x - lower) / r if r > 0 else np.zeros_like(x)


def arm_vectors(sig, qi):
    t = np.nan_to_num(sig['s_a7'][qi].astype(np.float64), nan=0.0)
    return [t, sig['s_qwen3'][qi].astype(np.float64), sig['s_swerank'][qi].astype(np.float64)], [0.0, -1.0, -1.0]


def fused(sig, qi, cfg, tk):
    vs, lows = arm_vectors(sig, qi)
    if cfg['kind'] == 'convex':
        V = np.stack([normalise(v, cfg['norm'], lo) for v, lo in zip(vs, lows)])
        return np.asarray(cfg['w']) @ V
    s = np.zeros_like(vs[0])
    for name, v in zip(ARMS, vs):
        lst = np.where(v > 0, v, np.nan) if name == 's_a7' else v
        o = L.order(lst, tk)
        n = int((~np.isnan(lst)).sum())
        s[o[:n]] += 1.0 / (cfg['k'] + np.arange(1, n + 1))
    return s


def config_metrics(sig, qi, tk, tm):
    """[len(CONFIGS), 2] (Acc@10, P@2) for one query."""
    vs, lows = arm_vectors(sig, qi)
    out = np.zeros((len(CONFIGS), 2))
    i = 0
    W = np.array(WEIGHTS)
    for n in NORMS:
        V = np.stack([normalise(v, n, lo) for v, lo in zip(vs, lows)])
        S = W @ V
        for row in S:
            out[i] = L.qmetrics(row, tk, tm)[:2]; i += 1
    for k in RRF_K:
        out[i] = L.qmetrics(fused(sig, qi, dict(kind='rrf', k=k), tk), tk, tm)[:2]; i += 1
    return out


def family_idx(fam):
    kind = fam.split('-')[0]
    return [i for i, c in enumerate(CONFIGS) if c['kind'] == kind]


def fit(M, rows, fam):
    """M: repo -> [nq, ncfg, 2]; rows: repo -> query indices to fit on. returns repo -> config index."""
    idx = family_idx(fam)
    if fam.endswith('pooled'):
        acc = np.mean([M[r][rows[r]][:, idx, 0].mean(0) for r in M], axis=0)
        p2 = np.mean([M[r][rows[r]][:, idx, 1].mean(0) for r in M], axis=0)
        j = idx[sorted(range(len(idx)), key=lambda k: (-acc[k], -p2[k], k))[0]]
        return {r: j for r in M}
    out = {}
    for r in M:
        acc = M[r][rows[r]][:, idx, 0].mean(0); p2 = M[r][rows[r]][:, idx, 1].mean(0)
        out[r] = idx[sorted(range(len(idx)), key=lambda k: (-acc[k], -p2[k], k))[0]]
    return out


def folds(n, k=5):
    edges = np.linspace(0, n, k + 1).round().astype(int)
    return [np.arange(edges[i], edges[i + 1]) for i in range(k)]


def cross_validate(M):
    res = {}
    for fam in FAMILIES:
        oof = {r: np.zeros((len(M[r]), 2)) for r in M}
        fr = {r: folds(len(M[r])) for r in M}
        for f in range(5):
            train = {r: np.setdiff1d(np.arange(len(M[r])), fr[r][f]) for r in M}
            ch = fit(M, train, fam)
            for r in M:
                oof[r][fr[r][f]] = M[r][fr[r][f], ch[r]]
        res[fam] = dict(per_repo={r: dict(acc10=float(oof[r][:, 0].mean()), p2=float(oof[r][:, 1].mean())) for r in M},
                        macro_acc10=float(np.mean([oof[r][:, 0].mean() for r in M])),
                        macro_p2=float(np.mean([oof[r][:, 1].mean() for r in M])))
    return res


def main():
    M = {}
    for repo in L.REPOS:
        sp, qs = L.load_split(repo)
        z = np.load(f'{L.rdir(repo)}/sig_tune.npz')
        sig = {k: z[k] for k in ('s_a7', 's_qwen3', 's_swerank')}
        paths = list(z['paths'])
        truth = {q['qid']: set(q['truth']) for q in qs if q['block'] == 'tune'}
        ct = {q['qid']: q['ct'] for q in qs if q['block'] == 'tune'}
        qids = [str(q) for q in z['qids']]
        assert [ct[q] for q in qids] == sorted(ct[q] for q in qids), 'tuning queries not in time order'
        M[repo] = np.stack([config_metrics(sig, qi, L.tiekeys(q, paths), np.array([p in truth[q] for p in paths]))
                            for qi, q in enumerate(qids)])
        print(repo, M[repo].shape, flush=True)
    cv = cross_validate(M)
    fam = sorted(FAMILIES, key=lambda f: (-cv[f]['macro_acc10'], -cv[f]['macro_p2'], FAMILIES.index(f)))[0]
    allrows = {r: np.arange(len(M[r])) for r in M}
    ch = fit(M, allrows, fam)
    frozen = {r: CONFIGS[j] for r, j in ch.items()}
    insample = {r: dict(acc10=float(M[r][:, ch[r], 0].mean()), p2=float(M[r][:, ch[r], 1].mean()), n=len(M[r])) for r in M}
    best_rrf = fit(M, allrows, 'rrf-pooled')
    rrf_in = {r: dict(acc10=float(M[r][:, best_rrf[r], 0].mean()), p2=float(M[r][:, best_rrf[r], 1].mean())) for r in M}
    out = dict(family=fam, frozen=frozen, cv=cv, tuning_in_sample=insample,
               tuning_macro_acc10=float(np.mean([v['acc10'] for v in insample.values()])),
               tuning_macro_p2=float(np.mean([v['p2'] for v in insample.values()])),
               rrf_variant=dict(cfg=CONFIGS[best_rrf['zulip']], per_repo=rrf_in,
                                macro_acc10=float(np.mean([v['acc10'] for v in rrf_in.values()])),
                                macro_p2=float(np.mean([v['p2'] for v in rrf_in.values()]))))
    L.wrjson(f'{L.OUT}/tune/a3.json', out)
    print(json.dumps(dict(family=fam, frozen=frozen, tuning=insample, cv={f: round(v['macro_acc10'], 3) for f, v in cv.items()}), indent=1))


if __name__ == '__main__':
    main()
