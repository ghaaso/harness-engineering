"""Stride pre-test (tuning commits only): P@10 of a model retrained at every commit (s=1) against every 10 (s=10).
usage: stride.py REPO FORM -> paired difference (s10 - s1) per learned model with a 95 % bootstrap interval."""
import sys, os, json
import numpy as np
import d4lib as L
name, form = sys.argv[1], sys.argv[2]
res = {}
for kind in ('complex', 'rotate'):
    v = {}
    for s in (1, 10):
        r = L.Repo('%s-s%d' % (name, s)); d = {}
        for k in r.block_ids('tune'):
            b = r.block(k)
            if not len(b.tasks):
                continue
            S = np.load(os.path.join(L.OUT, 'kge', '%s-s%d' % (name, s), form, kind, '%d.npy' % k))
            for t, x in L.per_commit(b, S).items():
                d[t] = x[0]
        v[s] = d
    common = sorted(set(v[1]) & set(v[10]))
    diff = [v[10][c] - v[1][c] for c in common]
    m, lo, hi = L.bootstrap(diff)
    res[kind] = dict(n=len(common), p10_s1=float(np.mean([v[1][c] for c in common])), p10_s10=float(np.mean([v[10][c] for c in common])), diff_s10_minus_s1=m, lo=lo, hi=hi, loss_upper_bound=-lo)
    print(name, form, kind, json.dumps(res[kind]))
json.dump(res, open(os.path.join(L.OUT, 'stride-%s-%s.json' % (name, form)), 'w'), indent=1)
