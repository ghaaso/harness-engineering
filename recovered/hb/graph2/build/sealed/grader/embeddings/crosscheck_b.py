"""Cross-check B: the lane's comparator score tables (eval/comparators, both scopes) turned into ranked lists the
lane's way (evalcore.read_score_table, the scope's candidate file, evalcore.rank with its tie rule), graded with the
grader's own truth and the grader's own rank path (gradecore.per_task_rank, summary) on the late 50 tuning commits
(and on the pilot's late-50 set for the gate). Compared with eval/comparators/metrics.json, eval/gate.json and the
pilot values of item 6. Writes crosscheck_b.json here (aggregates only). Exit 1 on a difference over tolerance.
"""
import os, sys, json, gzip
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import gradecore as gc

COMP = '/lane/eval/comparators'
PILOT = {'RRF': 0.233, 'PPR': 0.204, 'CO': 0.199}


def cands(scope, ids):
    out = {}
    with gzip.open(os.path.join(COMP, 'candidates_%s.tsv.gz' % scope), 'rt', encoding='utf-8') as f:
        next(f)
        for l in f:
            t, c, _ = l.rstrip('\n').split('\t')
            if t in ids: out.setdefault(t, []).append(c)
    return out


def main():
    gc.check_pins(); ec = gc.evalcore(); truth = gc.load_truth()
    lane = {t['task_id']: t for t in gc.jsonl('/lane/eval/tune_tasks.jsonl')}
    late = {i for i, t in truth.items() if t['split'] == 'tune' and t['late50']}
    pilot = {i for i in late | {i for i, t in truth.items() if t['split'] == 'tune'} if lane.get(i, {}).get('late50_pilot')}
    same_ids = all(lane[i]['commit'] == truth[i]['commit'] and lane[i]['seed'] == truth[i]['seed'] for i in truth if truth[i]['split'] == 'tune')
    M = json.load(open(os.path.join(COMP, 'metrics.json'))); G = json.load(open('/lane/eval/gate.json'))
    res = {'tasks_late50': len(late), 'commits_late50': len({truth[i]['commit'] for i in late}), 'tasks_late50_pilot': len(pilot),
           'lane_task_ids_are_build_ids': same_ids, 'rows': {}}
    worst = 0.0
    for scope in gc.SCOPES:
        C = cands(scope, late | pilot)
        for n in ('RRF', 'PPR', 'CO', 'DIR'):
            T = ec.read_score_table(os.path.join(COMP, '%s_%s.tsv.gz' % (n, scope)))
            ranked = {i: ec.rank(i, C.get(i, []), T.get(i, {})) for i in late | pilot}
            per = gc.per_task_rank(ranked, truth)
            for setname, S in (('late50', late), ('late50_pilot', pilot)):
                mine = gc.summary({i: per[i] for i in S}, gc.ec_tasks(S, truth))
                theirs = M['%s_%s' % (n, scope)][setname]
                d = max(abs(mine[m] - theirs[m]) for m in gc.METRICS); worst = max(worst, d)
                row = {'grader': mine, 'lane_metrics_json': theirs, 'max_abs_diff': d}
                if scope == 'pool' and setname == 'late50_pilot':
                    g = G['gate_late50_pilot_pool'].get(n)
                    if g: row['gate_json_P@10'] = g['mine_P10']
                    if n in PILOT: row['pilot_item6_P@10'] = PILOT[n]; row['within_0.005_of_pilot'] = abs(mine['P@10'] - PILOT[n]) <= 0.005
                res['rows']['%s_%s_%s' % (n, scope, setname)] = row
    res['max_abs_diff_vs_metrics_json'] = worst
    res['pass'] = bool(worst <= 1e-9 and same_ids and all(r.get('within_0.005_of_pilot', True) for r in res['rows'].values()))
    json.dump(res, open(os.path.join(HERE, 'crosscheck_b.json'), 'w'), indent=1, sort_keys=True)
    for k, r in sorted(res['rows'].items()):
        print(k, ' '.join('%s %.6f/%.6f' % (m, r['grader'][m], r['lane_metrics_json'][m]) for m in gc.METRICS),
              'gate %.4f' % r['gate_json_P@10'] if 'gate_json_P@10' in r else '', 'pilot %.3f' % r['pilot_item6_P@10'] if 'pilot_item6_P@10' in r else '')
    print('max abs diff', worst, 'pass', res['pass'])
    return 0 if res['pass'] else 1


if __name__ == '__main__':
    sys.exit(main())
