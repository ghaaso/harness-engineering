"""T3 measurement 1 (and 3): B2's frozen settings refit with T2's code (rank_t2.fit, unchanged, 4 threads), tuning only, saving
the tuning scores and the per-commit P@10 at every 10 trees (for the split-half check of the tree count).
usage: m1_rank.py <tag> [diffdir]   tag B2 (no diff column), B2D (T2's DIFF_BM25 from diffdir), B2Dm (masked)
-> /t3/m1/rank/<tag>/<repo>.npy, res.json, curve.json {repo: {trees: {commit: p10}}}"""
import json, os, sys
sys.path.insert(0, '/t2code')
import numpy as np
import rank_t2 as RK
import d4lib as L

tag = sys.argv[1]; ddir = sys.argv[2] if len(sys.argv) > 2 else None
extra = ['DIFF_BM25=' + ddir] if ddir else []
add = ['DIFF_BM25'] if ddir else []
d = os.path.join('/t3/m1/rank', tag); os.makedirs(d, exist_ok=True)
REC = {}
_orig = RK.tune_p10
def rec(df, score):
    p, rc, pc = _orig(df, score)
    REC.setdefault(df['repo'].iloc[0], []).append({str(t): float(v[0]) for t, v in pc.items()})
    return p, rc, pc
RK.tune_p10 = rec

ch = json.load(open('/u4/rank/B2/choice.json'))
res, curve, done = {}, {}, {}
for r in L.REPOS:
    c = ch[r]['cfg']
    cfg = dict({k: v for k, v in c.items() if k != 'trees'}, cols=ch[r]['cols'] + add)
    key = json.dumps(cfg, sort_keys=True)
    if key not in done:
        REC.clear()
        out, bst = RK.fit(cfg, L.REPOS, extra)
        done[key] = (out, bst, {k: v[:-1] for k, v in REC.items()})     # the last call per repository is the frozen re-score
    out, bst, rc = done[key]
    curve[r] = {str(10 * (i + 1)): v for i, v in enumerate(rc[r])}
    ev = RK.table(r, 'tune', extra)
    s = bst.predict(RK.matrix(ev, cfg['cols'], cfg['qnorm'])[0], num_iteration=out[r]['trees'])
    np.save(os.path.join(d, r + '.npy'), s.astype(np.float64))
    assert abs(np.mean(list(curve[r][str(out[r]['trees'])].values())) - out[r]['p10']) < 1e-9
    res[r] = dict(cfg={k: v for k, v in cfg.items() if k != 'cols'}, cols=cfg['cols'], **out[r])
    print(tag, r, 'p10 %.4f trees %d, curve points %d' % (out[r]['p10'], out[r]['trees'], len(curve[r])), flush=True)
json.dump(res, open(os.path.join(d, 'res.json'), 'w'), indent=1)
json.dump(curve, open(os.path.join(d, 'curve.json'), 'w'))
