"""T3 measurements 5 and 6: per-commit tuning P@10 comparisons, paired bootstrap (d4lib). -> /t3/m56.json"""
import json, os
import numpy as np
import d4lib as L


def pc(fp):
    j = json.load(open(fp))
    return {(r, int(t)): v[0] for r, d in j['per_commit'].items() for t, v in d.items()}


def avg(*ds):
    return {k: float(np.mean([d[k] for d in ds])) for k in ds[0]}


def cmp(x, y, scope):
    ks = sorted(k for k in x if scope == 'pooled' or k[0] == scope)
    m, lo, hi = L.bootstrap([x[k] - y[k] for k in ks])
    return dict(a=float(np.mean([x[k] for k in ks])), b=float(np.mean([y[k] for k in ks])), diff=m, lo=lo, hi=hi, n=len(ks))


R = '/t3/u5runs/%s.json'
asis0 = pc('/u5/runs/sage_L1_H128_N20_hl90_qwen_s0.json'); asis1 = pc('/t1/runs/asis_s1.json'); asis = avg(asis0, asis1)
out = {}
have = lambda n: os.path.exists(R % n)
if have('inv_s0') and have('inv_s1'):
    inv = avg(pc(R % 'inv_s0'), pc(R % 'inv_s1'))
    for s in L.REPOS + ['pooled']:
        out['inv(2 seeds)-asis(2 seeds)|' + s] = cmp(inv, asis, s)
    out['inv_s1-inv_s0|pooled'] = cmp(pc(R % 'inv_s1'), pc(R % 'inv_s0'), 'pooled')
for n in (25, 50, 100):
    if have('zul%d_s0' % n):
        z = pc(R % ('zul%d_s0' % n))
        for s in ('zulip', 'pooled'):
            out['zul%d-u5full|%s' % (n, s)] = cmp(z, asis0, s)
            if have('zul100_s0') and n != 100:
                out['zul%d-zul100cpu|%s' % (n, s)] = cmp(z, pc(R % 'zul100_s0'), s)
json.dump(out, open('/t3/m56.json', 'w'), indent=1)
for k, v in out.items():
    print('%-34s %.4f vs %.4f  %+.4f [%+.4f, %+.4f] n=%d' % (k, v['a'], v['b'], v['diff'], v['lo'], v['hi'], v['n']))
