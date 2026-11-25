"""T3 measurement 1 scoring (tuning only), with T2's own scorer functions (/t2code/score.py, imported unchanged).
Arms per repository: BEST (counting), DIFF (T2) and DIFFm (masked), FUSED and FUSEDm (T2's rule, weight on tuning), B2 (T2's
refit, /t2/rank/B2), B2D (T2's, /t2/rank/B2D), B2Dm (/t3/m1/rank/B2Dm). Also writes /t3/m1/fused_w.json (per weight, per commit)
for the split-half check. -> /t3/m1/score.json"""
import json, os, sys
sys.path.insert(0, '/t2code')
import numpy as np
import d4lib as L
import score as SC
import rank_t2 as RK

res, fw, wch = {}, {'DIFF': {}, 'DIFFm': {}}, {}
for r in L.REPOS:
    df = RK.table(r, 'tune', ['DIFF_BM25=/t2/diff'])
    dm = RK.table(r, 'tune', ['DIFF_BM25=/t3/m1/diffm'])
    assert (df['qid'].values == dm['qid'].values).all() and (df['cand'].values == dm['cand'].values).all()
    arms = {'BEST': df[SC.CH[r]].values, 'DIFF': df['DIFF_BM25'].values, 'DIFFm': dm['DIFF_BM25'].values}
    for dn in ('DIFF', 'DIFFm'):
        best_w, best_p = None, -1; fw[dn][r] = {}
        for w in SC.WGRID:
            cm = SC.commit_means(SC.per_query(df, SC.rrf(df, arms['BEST'], arms[dn], w)), r)['p10']
            fw[dn][r][str(w)] = {str(c[1]): v for c, v in cm.items()}
            p = np.mean(list(cm.values()))
            if p > best_p: best_w, best_p = w, p
        wch[dn + '|' + r] = best_w
        arms['FUSED' + dn[4:]] = SC.rrf(df, arms['BEST'], arms[dn], best_w)
    for name, f in (('B2', '/t2/rank/B2/%s.npy'), ('B2D', '/t2/rank/B2D/%s.npy'), ('B2Dm', '/t3/m1/rank/B2Dm/%s.npy'), ('B2x', '/t3/m1/rank/B2/%s.npy')):
        if os.path.exists(f % r):
            s = np.load(f % r); assert len(s) == len(df); arms[name] = s
    for name, s in arms.items():
        for m, v in SC.commit_means(SC.per_query(df, s), r).items():
            res.setdefault(name, {}).setdefault(m, {}).update(v)
os.makedirs('/t3/m1', exist_ok=True)
json.dump(fw, open('/t3/m1/fused_w.json', 'w'))
out = dict(fused_w=wch, comparisons={})
pairs = [('B2Dm', 'B2'), ('B2D', 'B2'), ('B2Dm', 'B2D'), ('FUSEDm', 'BEST'), ('FUSED', 'BEST'), ('DIFFm', 'BEST'), ('DIFF', 'BEST'), ('B2x', 'B2')]
for x, y in pairs:
    if x not in res or y not in res: continue
    for m in ('p10', 'r10', 'r10_without', 'r10_with'):
        for scope in L.REPOS + ['pooled']:
            fx = {c: v for c, v in res[x][m].items() if scope == 'pooled' or c[0] == scope}
            fy = {c: v for c, v in res[y][m].items() if scope == 'pooled' or c[0] == scope}
            out['comparisons']['%s-%s|%s|%s' % (x, y, m, scope)] = SC.compare(fx, fy)
json.dump(out, open('/t3/m1/score.json', 'w'), indent=1)
print('fused w', wch)
for k, v in out['comparisons'].items():
    if v['n'] and ('pooled' in k or '|p10|' in k):
        print('%-34s %.4f vs %.4f  %+.4f [%+.4f, %+.4f] n=%d' % (k, v['a'], v['b'], v['diff'], v['lo'], v['hi'], v['n']))
