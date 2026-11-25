"""B4's tuning scores for the report: per repository and pooled, against the best untrained arm and against U4's B2 on the
same tuning commits (paired bootstrap over commits, as the card run). Also every sweep run's pooled tuning P@10.
usage: report.py   -> /out/report-tables.json and markdown on stdout (needs /out/choice.json; the frozen run's per-commit scores)"""
import glob, json, os
import numpy as np
import d4lib as L
import u4lib as U
import tune_report as TRP

OUT = '/out'
ch = json.load(open(os.path.join(OUT, 'choice.json')))
run = json.load(open(os.path.join(OUT, 'runs', ch['name'] + '.json')))
b2 = json.load(open(os.path.join(U.U4, 'rank', 'B2', 'choice.json')))
res = {'B4_GNN': {}, 'B2': {}, 'BEST': {}}
pooled = {'B4_GNN': {}, 'B2': {}, 'BEST': {}}
for r in L.REPOS:
    base = TRP.CH['best_untrained'][r]
    arms = TRP.table_arms(r, [base])[base]
    res['BEST'][r] = arms
    res['B2'][r] = {int(t): tuple(v) for t, v in b2[r]['tune']['per_commit'].items()}
    res['B4_GNN'][r] = {int(t): tuple(v) for t, v in run['per_commit'][r].items()}
    for a in res:
        pooled[a].update({(r, t): v for t, v in res[a][r].items()})
    res.setdefault('_base', {})[r] = base


def cell(a, ref, d):
    common = sorted(set(d[a]) & set(d[ref]))
    x = [d[a][c][0] for c in common]; y = [d[ref][c][0] for c in common]; rc = [d[a][c][1] for c in common]
    m, lo, hi = L.bootstrap([p - q for p, q in zip(x, y)])
    return dict(p10=float(np.mean(x)), r10=float(np.mean(rc)), n=len(common), diff=m, lo=lo, hi=hi)


out = {'frozen': ch['name'], 'rows': {}}
for a in ('BEST', 'B2', 'B4_GNN'):
    out['rows'][a] = {}
    for r in L.REPOS:
        out['rows'][a][r] = cell(a, 'BEST', res[a])
    out['rows'][a]['pooled'] = cell(a, 'BEST', pooled)
out['b4_vs_b2'] = {r: cell('B4_GNN', 'B2', res[a_] if False else {'B4_GNN': res['B4_GNN'][r], 'B2': res['B2'][r]}) for r in L.REPOS}
out['b4_vs_b2']['pooled'] = cell('B4_GNN', 'B2', pooled)
out['runs'] = ch['runs']
json.dump(out, open(os.path.join(OUT, 'report-tables.json'), 'w'), indent=1)
print('| arm | ' + ' | '.join(L.REPOS) + ' | pooled |'); print('|---|---|---|---|---|')
for a in ('BEST', 'B2', 'B4_GNN'):
    print('| %s | ' % a + ' | '.join('%.3f / %.3f (%+.3f [%+.3f, %+.3f])' % tuple(out['rows'][a][r][k] for k in ('p10', 'r10', 'diff', 'lo', 'hi'))
                                     for r in L.REPOS + ['pooled']) + ' |')
print('B4 vs B2:', {r: tuple(round(out['b4_vs_b2'][r][k], 4) for k in ('diff', 'lo', 'hi')) for r in L.REPOS + ['pooled']})
print('best untrained arms:', res['_base'])
