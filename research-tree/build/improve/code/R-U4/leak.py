"""R-U4 check (1), independent of U4's poisoned() test: for each block, a copy of the repository in which every commit
at or after the block's history end is EMPTIED (no events, no message) except the block's own task commits, which keep
only their M events of files alive at the cutoff (the seeds and truth). Base features and EASE (frozen choice) of the copy
must equal the cached features the tables were built from. Also: training tasks before the tuning start, training tables
hold only training commits, and the zulip pool keeps every query max of the query-normalised columns.
usage: python leak.py <repo> [all|sample] -> /rout/leak-<repo>.json"""
import copy, json, sys, glob, os
import numpy as np
import pandas as pd
import d4lib as L
import u4lib as U
import ease as EA
import features as FE
import rank as RK

repo = sys.argv[1]; mode = sys.argv[2] if len(sys.argv) > 2 else 'all'
r = L.Repo(repo)
ks = r.block_ids()
if mode == 'sample':
    tr, tu, te = r.block_ids('train'), r.block_ids('tune'), r.block_ids('test')
    ks = sorted(set([tr[0], tr[len(tr) // 3], tr[2 * len(tr) // 3], tr[-1], tu[0], tu[-1], te[0], te[-1]]))
hl, inv, lam = EA.parse(json.load(open('/out/ease/choice.json'))[repo]['best'])


def emptied(b):
    p = copy.copy(r)
    for a in ('_pairs', '_u4ev'):
        p.__dict__.pop(a, None)
    p._pairs = None
    hend = b.meta['hend']; tasks = set(b.meta['tasks'])
    new = list(r.commits[:hend])
    for n in range(hend, len(r.commits)):
        c = dict(r.commits[n]); c['msg'] = ''
        c['ev'] = [e for e in c['ev'] if e[1] == 'M' and e[0] in b.idx] if n in tasks else []
        new.append(c)
    p.commits = new
    return p


out = {}
for k in ks:
    b = r.block(k)
    if not len(b.tasks):
        out[k] = 'empty'; continue
    z = np.load('/out/cache/%s/%d.npz' % (repo, k))
    pb = emptied(b).block(k)
    same_tasks = [(t, s, list(x)) for t, s, x in pb.tasks] == [(t, s, list(x)) for t, s, x in b.tasks]
    G = U.base_features(pb)
    diff = [c for c in U.BASE if not np.array_equal(z[c], G[c], equal_nan=True)]
    e = EA.ease_scores(pb, hl, inv, [lam])[lam]; ec = np.load('/out/cache/%s/%d.ease.npy' % (repo, k))
    out[k] = dict(split=b.split, same_tasks=same_tasks, base_diff=diff, ease_maxabs=float(np.max(np.abs(e - ec))))
    print(k, out[k], flush=True)

plan = json.load(open('/data/%s/plan.json' % repo))
tb = [b for b in plan['blocks'] if b['split'] == 'train']; tu = [b for b in plan['blocks'] if b['split'] == 'tune']
t0 = r.commits[tu[0]['tasks'][0]]['ct']
chk = dict(train_tasks=sum(len(b['tasks']) for b in tb),
           train_tasks_at_or_after_tune_start=sum(r.commits[t]['ct'] >= t0 for b in tb for t in b['tasks']),
           train_block_facts_at_or_after_cutoff=sum(any(c['ct'] >= b['cutoff_ct'] for c in r.commits[:b['hend']]) for b in tb))
trt = RK.table(repo, 'train'); tut = RK.table(repo, 'tune')
chk['train_table_blocks_not_train'] = sorted(set(int(x) for x in trt['k'].unique()) - set(b['k'] for b in tb))
chk['train_table_max_commit'] = int(trt['commit'].max()); chk['tune_table_min_commit'] = int(tut['commit'].min())
chk['train_commits_in_tune_or_test'] = len(set(trt['commit'].unique()) & {t for b in plan['blocks'] if b['split'] != 'train' for t in b['tasks']})
# the pool keeps the query max of every normalised column (zulip pools; FixFlow and the clinic are complete lists)
lost = {}
for k in r.block_ids('train')[:: max(1, len(r.block_ids('train')) // 10)]:
    D = FE.load_block(repo, k)
    if D is None:
        continue
    M = FE.pool_mask(D, k); full = np.ones_like(M); full[np.arange(len(M)), D['seeds']] = False
    for c in RK.QN_RATIO + RK.QN_GAP:
        A = np.where(M, D[c], np.nan); B = np.where(full, D[c], np.nan)
        with np.errstate(all='ignore'):
            ma, mb = np.nanmax(A, axis=1), np.nanmax(B, axis=1)
        if c in RK.QN_RATIO:
            bad = (mb > 0) & ~(ma == mb)
        else:
            bad = ~np.isnan(mb) & ~(ma == mb)
        lost[c] = lost.get(c, 0) + int(bad.sum())
chk['pool_queries_missing_their_max'] = lost
out['checks'] = chk
print(json.dumps(chk), flush=True)
json.dump({str(k): v for k, v in out.items()}, open('/rout/leak-%s.json' % repo, 'w'), indent=1)
