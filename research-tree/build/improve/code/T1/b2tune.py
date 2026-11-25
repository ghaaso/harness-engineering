"""T1: B2's tuning scores per cell (U4 keeps only its per-commit P@10). Refits U4's frozen B2 choice with U4's own fit
(rank.fit, unchanged; the same data, seed and thread count as U4) and checks it reproduces the recorded per-commit P@10.
Writes /t1/scores/B2/<repo>.rows.npy: one score per row of the repository's tuning table (blocks in rank.table's order)."""
import json, os
import numpy as np
import d4lib as L
import u4lib as U
import rank as RK

ch = json.load(open(os.path.join(U.U4, 'rank', 'B2', 'choice.json')))
groups = {}
for r in L.REPOS:
    c = ch[r]['cfg']
    key = json.dumps({k: v for k, v in c.items() if k != 'trees'}, sort_keys=True)
    groups.setdefault(key, []).append(r)
os.makedirs('/t1/scores/B2', exist_ok=True)
for key, repos in groups.items():
    c = json.loads(key)
    cfg = dict(c, cols=ch[repos[0]]['cols'])
    assert all(ch[r]['cols'] == cfg['cols'] for r in repos)
    out, bst = RK.fit(cfg, L.REPOS)
    for r in repos:
        assert out[r]['trees'] == ch[r]['cfg']['trees'], (r, out[r]['trees'])
        df = RK.table(r, 'tune')
        s = bst.predict(RK.matrix(df, cfg['cols'], cfg['qnorm'])[0], num_iteration=ch[r]['cfg']['trees'])
        p, rc, pc = RK.tune_p10(df, s)
        rec = ch[r]['tune']['per_commit']
        dmax = max(abs(pc[int(t)][0] - v[0]) for t, v in rec.items())
        print(r, 'refit P@10 %.6f recorded %.6f max per-commit diff %.2e' % (p, ch[r]['tune']['p10'], dmax), flush=True)
        assert dmax < 1e-9, 'refit does not reproduce B2'
        np.save('/t1/scores/B2/%s.rows.npy' % r, s.astype(np.float64))
