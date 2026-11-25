"""R-U4 checks (3)-(5) on the ranker: refit U4's frozen B2 choice per repository with U4's own rank.fit (training blocks,
early stop on tuning), compare with choice.json; then score the tuning blocks two ways: (a) U4's tuning scorer
(float64 scores, u4lib.per_commit_table) and (b) the held-out path: the score matrix built exactly as rank.heldout builds
it (float32, -inf off the table) and scored by the card run's d4lib.per_commit, as U7 will score held-out.
usage: python refit.py -> /rout/refit.json"""
import json, os
import numpy as np
import d4lib as L
import u4lib as U
import rank as RK

ch = json.load(open('/out/rank/B2/choice.json'))
res = {}; done = {}
for r in L.REPOS:
    c = ch[r]['cfg']; cfg = dict(c, cols=ch[r]['cols'])
    key = json.dumps([c['train'], c['qnorm'], c['leaves'], c['lr'], c['span'], cfg['cols'], r if c['train'] == 'own' else ''])
    if key not in done:
        done[key] = RK.fit(dict(cfg, repo=r), L.REPOS if c['train'] == 'pooled' else [r])
    out, bst = done[key]
    ev = RK.table(r, 'tune')
    s = bst.predict(RK.matrix(ev, cfg['cols'], cfg['qnorm'])[0], num_iteration=c['trees'])
    p64, r64, pc64 = RK.tune_p10(ev, s)
    rep = L.Repo(r); pc32 = {}; n_ties64 = n_ties32 = 0
    for k, g in ev.groupby('k').groups.items():
        idx = np.asarray(g); b = rep.block(k)
        M = np.full((len(b.tasks), b.N), -np.inf, dtype=np.float32)
        M[ev['task'].values[idx], ev['cand'].values[idx]] = s[idx]
        pc32.update(L.per_commit(b, M))
        n_ties64 += len(s[idx]) - len(np.unique(np.c_[ev['task'].values[idx], s[idx]], axis=0))
        n_ties32 += len(idx) - len(np.unique(np.c_[ev['task'].values[idx], s[idx].astype(np.float32).astype(np.float64)], axis=0))
    p32 = float(np.mean([v[0] for v in pc32.values()])); r32 = float(np.mean([v[1] for v in pc32.values()]))
    changed = sum(1 for t in pc32 if abs(pc32[t][0] - pc64[t][0]) > 1e-12)
    res[r] = dict(cfg=c, choice_p10=ch[r]['tune']['p10'], choice_trees=c['trees'], refit_p10=out[r]['p10'], refit_trees=out[r]['trees'],
                  rescored_p10_float64=p64, heldout_path_p10_float32=p32, heldout_path_r10=r32, r10_float64=r64,
                  commits=len(pc64), commits_changed_by_float32=changed, tied_cells_float64=int(n_ties64), tied_cells_float32=int(n_ties32))
    print(r, json.dumps(res[r]), flush=True)
pooled64 = [v[0] for r in L.REPOS for v in []]
json.dump(res, open('/rout/refit.json', 'w'), indent=1)
