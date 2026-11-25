"""T3 measurements 7 and 8: twins against the as-is run (and the as-is repeat as noise), per repository and both together (68 commits).
Two forms: best evaluation epoch per run (in-sample, both sides alike) and the mean over the evaluations 2,5,10,20,40. -> /t3/m78.json"""
import glob, json, os
import numpy as np
import d4lib as L

D = '/t3/u6twin'
runs = {}
for f in glob.glob(os.path.join(D, '*', '*', '*', 'e*.json')):
    j = json.load(open(f))
    runs.setdefault((j['kind'], j['mode']), {}).setdefault(j['repo'], {})[j['epoch']] = {(j['repo'], int(c)): v[0] for c, v in j['per_commit'].items()}


def form(byrepo, how):
    out = {}
    for r, eps in byrepo.items():
        if how == 'best':
            e = max(eps, key=lambda e: (np.mean(list(eps[e].values())), -e)); out.update(eps[e])
        else:
            for k in eps[min(eps)]:
                out[k] = float(np.mean([eps[e][k] for e in eps]))
    return out


res = {}
for kind in ('tgn', 'dygformer'):
    if (kind, 'asis') not in runs: continue
    A = runs[(kind, 'asis')]
    for mode in ('asis2', 'mem', 'hist'):
        if (kind, mode) not in runs: continue
        Bm = runs[(kind, mode)]
        reps = [r for r in ('fixflow', 'clinic') if r in A and r in Bm and len(A[r]) == 5 and len(Bm[r]) == 5]
        for how in ('best', 'mean'):
            a = form({r: A[r] for r in reps}, how); b = form({r: Bm[r] for r in reps}, how)
            for scope in reps + (['both'] if len(reps) == 2 else []):
                ks = sorted(k for k in a if scope == 'both' or k[0] == scope)
                m, lo, hi = L.bootstrap([b[k] - a[k] for k in ks])
                key = '%s %s-asis %s %s' % (kind, mode, how, scope)
                res[key] = dict(b=float(np.mean([b[k] for k in ks])), a=float(np.mean([a[k] for k in ks])), diff=m, lo=lo, hi=hi, n=len(ks))
                print('%-36s %.4f vs %.4f  %+.4f [%+.4f, %+.4f] n=%d' % (key, res[key]['b'], res[key]['a'], m, lo, hi, len(ks)))
json.dump(res, open('/t3/m78.json', 'w'), indent=1)
