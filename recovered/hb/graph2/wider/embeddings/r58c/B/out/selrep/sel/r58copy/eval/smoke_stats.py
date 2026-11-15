"""Smoke test of the statistics helpers and the score-table round trip on the stored comparator tables."""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import evalcore as ec
tasks = ec.load_tasks(); CD = os.path.join(ec.ROOT, 'eval', 'comparators'); late = ec.commit_set(tasks, 'late50')
pt = {n: ec.evaluate_table(ec.read_score_table(os.path.join(CD, n + '_pool.tsv.gz')), 'pool', tasks) for n in ('RRF', 'PPR', 'CO', 'DIR', 'RANDOM')}
for n in ('PPR', 'CO', 'DIR', 'RANDOM'):
    print('RRF minus', n, {k: tuple(round(x, 3) for x in v) for k, v in ec.paired(pt['RRF'], pt[n], tasks, late).items()})
d = [ec.per_commit(pt['RRF'], tasks, late)[1][:, 0] - ec.per_commit(pt[n], tasks, late)[1][:, 0] for n in ('PPR', 'CO', 'DIR', 'RANDOM')]
print('holm P@10', [tuple(round(x, 4) for x in r) for r in ec.holm_intervals(d)])
print('holm([.01,.04,.03,.2])', ec.holm([.01, .04, .03, .2]).tolist())
m = ec.mean_over_seeds([pt['RRF'], pt['RRF']]); print('mean_over_seeds identity', ec.summary(m, tasks, late) == ec.summary(pt['RRF'], tasks, late))
