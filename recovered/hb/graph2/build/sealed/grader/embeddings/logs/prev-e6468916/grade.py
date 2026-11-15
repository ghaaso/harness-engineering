"""grade.py: the grader of addendum 8 (embeddings on the code graph), rulings 71, 73 and 88, version-2 decisions.

usage (inside graphtest-kge:1, through run.sh; the hand-off folder is mounted at /handoff):
  python grade.py tune          --handoff /handoff --handoff-sha256 H
  python grade.py heldout       --handoff /handoff --handoff-sha256 H --freeze-sha256 F
  python grade.py tune-test     --handoff /handoff --handoff-sha256 H
  python grade.py heldout-test  --handoff /handoff --handoff-sha256 H --freeze-sha256 F
Real modes write /returns/tune-rank.json and /returns/tune-item24.json, or /returns/heldout.json; per-task figures
stay under work/<mode>/ in this sealed folder. Test modes write only /returns/test/ and test-out/work/<mode>/.
No option names a path besides the hand-off; nothing comes from the environment. Prints counts, hashes and
aggregates only. Exit 0 on success, the refusal code otherwise (handoff.py).
"""
import os, sys, json, gzip
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import numpy as np
import gradecore as gc
import handoff as ho
from gradecore import Refuse, METRICS, SCOPES, SEEDS, KINDS, COMPARATORS

RETURNS = '/returns'
LANE_TASKS = ho.LANE_TASKS


def self_check():
    """Every code and test file listed in HASHES.txt must hash to its listed value (the frozen scorer)."""
    hp = os.path.join(HERE, 'HASHES.txt')
    if not os.path.exists(hp): raise Refuse(21, 'HASHES.txt missing')
    n = 0
    for line in open(hp, encoding='utf-8'):
        if not line.strip(): continue
        h, rel = line.rstrip('\n').split('  ', 1)
        p = os.path.join(HERE, rel)
        if not os.path.exists(p) or gc.sha256_file(p) != h: raise Refuse(21, 'grader file %s differs from HASHES.txt' % rel)
        n += 1
    for need in ('grade.py', 'gradecore.py', 'handoff.py', 'answer_score.js'):
        if need not in open(hp, encoding='utf-8').read(): raise Refuse(21, '%s is not in HASHES.txt' % need)
    return gc.sha256_file(hp)


def scorer_block(files_sha):
    return {'files_sha256': files_sha, 'evalcore_sha256': gc.PINS[gc.EVALCORE], 'score_js_sha256': gc.PINS[gc.SCORE_JS]}


def mean_rows(arms):
    return {'%s_%s_mean' % (a, k): ['%s_%s_s%d' % (a, k, s) for s in SEEDS] for a in arms for k in KINDS}


def save_per_task(path, d):
    """Per-task figures, sealed (never in a return)."""
    with gzip.open(path, 'wt', encoding='utf-8') as f:
        for k in sorted(d): f.write(json.dumps({'key': k, 'per_task': d[k]}, sort_keys=True) + '\n')


def grade_rank(hand, truth, tasks):
    per = {(n, sc): gc.per_task_rank(hand['ranked'][n][sc], truth) for n in hand['variants'] for sc in SCOPES}
    rank = {n: {sc: gc.summary(per[(n, sc)], tasks) for sc in SCOPES} for n in hand['variants']}
    seedm = {}
    for row, names in mean_rows(hand['arms']).items():
        for sc in SCOPES:
            seedm[(row, sc)] = gc.seed_mean([per[(n, sc)] for n in names])
        rank[row] = {sc: gc.summary(seedm[(row, sc)], tasks) for sc in SCOPES}
    for n in COMPARATORS:
        if n in hand['variants']:
            for sc in SCOPES: seedm[(n, sc)] = per[(n, sc)]
    return rank, per, seedm


def grade_answers(hand, truth, work):
    per = {}; infos = {}
    for n in sorted(hand['variants']):
        p, info = gc.answer_level_per_task(hand['answers'][n], os.path.join(work, 'answer_%s.jsonl' % n), expect_arm=n)
        if info['answers'] != len(hand['ids']) or set(p) - hand['ids']: raise Refuse(11, 'answers %s: task set differs' % n)
        per[n] = p; infos[n] = info
    scored = set.intersection(*[set(p) for p in per.values()])
    if any(set(p) != scored for p in per.values()): raise Refuse(11, 'answer files score different task sets')
    atasks = gc.ec_tasks(scored, truth)
    pm = {n: gc.as_metrics(per[n]) for n in per}
    al = {n: gc.summary(pm[n], atasks)['P@10'] for n in per}
    for row, names in mean_rows(hand['arms']).items():
        pm[row] = gc.seed_mean([pm[n] for n in names])
        al[row] = gc.summary(pm[row], atasks)['P@10']
    zero = sorted({i['zero_unit_refs'] for i in infos.values()})
    if zero != [0] or scored != hand['ids']:
        # refuter F7: a graded task with no reference unit would change the published key set; refused instead.
        raise Refuse(11, 'a graded task has no reference unit')
    return al, pm, atasks, dict(scored_tasks=len(scored), zero_unit_refs=0)


def lane_truth_equal(ids, truth):
    lane = {(t['commit'], t['parent'], t['seed']): sorted(t['truth']) for t in gc.jsonl(LANE_TASKS)}
    eq = sum(1 for i in ids if lane.get((truth[i]['commit'], truth[i]['parent'], truth[i]['seed'])) == truth[i]['truth'])
    return {'rule': 'item 4', 'tasks_checked': len(ids), 'equal_to_lane': eq}


def run(mode, handoff_dir, handoff_sha, freeze_sha=None, returns_root=RETURNS, work_root=None, B=10000, quiet=False):
    say = (lambda *a: None) if quiet else (lambda *a: print(*a, flush=True))
    test = mode.endswith('-test')
    out_dir = os.path.join(returns_root, 'test') if test else returns_root
    work_root = work_root or os.path.join(HERE, 'test-out' if test else '', 'work')
    marker = os.path.join(work_root, 'heldout', 'STARTED.json') if mode == 'heldout' else None
    files_sha = self_check()
    gc.check_pins()
    truth = gc.load_truth()
    try:
        return _run(mode, handoff_dir, handoff_sha, freeze_sha, out_dir, work_root, B, say, test, files_sha, truth, marker)
    except Refuse as e:
        if marker and os.path.exists(marker) and e.code != 8:
            ho.write_marker(marker, {'handoff_sha256': handoff_sha, 'freeze_sha256': freeze_sha, 'state': 'refused %d' % e.code})
        raise
    except BaseException:
        if marker and os.path.exists(marker):
            ho.write_marker(marker, {'handoff_sha256': handoff_sha, 'freeze_sha256': freeze_sha, 'state': 'stopped'})
        raise


def _run(mode, handoff_dir, handoff_sha, freeze_sha, out_dir, work_root, B, say, test, files_sha, truth, marker):
    hand = ho.load(mode, handoff_dir, handoff_sha, freeze_sha, out_dir, truth, marker=marker)
    ids = hand['ids']; tasks = gc.ec_tasks(ids, truth)
    commits = len({truth[i]['commit'] for i in ids})
    work = os.path.join(work_root, mode); os.makedirs(work, exist_ok=True); os.makedirs(out_dir, exist_ok=True)
    say('grader %s: hand-off %s, %d tasks, %d commits, %d variants; scorer files %s' % (mode, handoff_sha[:16], len(ids), commits, len(hand['variants']), files_sha[:16]))
    rank, per_rank, seedm = grade_rank(hand, truth, tasks)
    save_per_task(os.path.join(work, 'per_task_rank.jsonl.gz'), {'%s|%s' % k: v for k, v in per_rank.items()})
    al, pm, atasks, ainfo = grade_answers(hand, truth, work)
    save_per_task(os.path.join(work, 'per_task_answer.jsonl.gz'), pm)
    sc = scorer_block(files_sha)
    written = {}
    if mode.startswith('tune'):
        R = {'split': 'tune', 'test': test, 'handoff_sha256': handoff_sha, 'tasks': len(ids), 'commits': commits,
             'rank': rank, 'truth': lane_truth_equal(ids, truth), 'scorer': sc}
        labels = {}
        for row, names in mean_rows(hand['arms']).items():
            labels[row] = {'mean': {'primary': al[row]},
                           'per_seed': {'s%d' % s: al[n] for s, n in zip(SEEDS, names)},
                           'vs_RRF': {'primary': gc.bootstrap_diff(pm[row], pm['RRF'], atasks, B)}}
        for n in COMPARATORS:
            labels[n] = {'mean': {'primary': al[n]}}
            if n != 'RRF': labels[n]['vs_RRF'] = {'primary': gc.bootstrap_diff(pm[n], pm['RRF'], atasks, B)}
        A = {'split': 'tune', 'test': test, 'handoff_sha256': handoff_sha, 'tasks': ainfo['scored_tasks'],
             'commits': len({t['commit'] for t in atasks}), 'labels': labels, 'scorer': sc}
        written['tune-rank.json'] = gc.write_return(os.path.join(out_dir, 'tune-rank.json'), R, ids)
        written['tune-item24.json'] = gc.write_return(os.path.join(out_dir, 'tune-item24.json'), A, ids)
    else:
        arm = hand['arms'][0]
        names = ['%s_%s_s%d' % (arm, k, s) for k in KINDS for s in SEEDS]
        v12 = names[:3] + ['%s_alone_mean' % arm] + names[3:] + ['%s_fused_mean' % arm] + list(COMPARATORS)
        vs = {}
        for k in ('fused', 'alone'):
            row = '%s_%s_mean' % (arm, k); d = {}
            for s_ in SCOPES:
                p = gc.paired(seedm[(row, s_)], seedm[('RRF', s_)], tasks, B)['P@10']
                d['%s_P@10' % s_] = {'diff': p[0], 'lo': p[1], 'hi': p[2]}
            b = gc.bootstrap_diff(pm[row], pm['RRF'], atasks, B)
            d['answer_level'] = {'diff': b['diff'], 'lo': b['lo'], 'hi': b['hi']}
            vs[row] = d
        lit = gc.literal_check(hand['rows'], truth, hand['checkpoints'])
        Hh = hand['H']
        R = {'split': 'heldout', 'arm': arm, 'test': test, 'freeze_sha256': freeze_sha, 'handoff_sha256': handoff_sha,
             'commits': commits, 'tasks': len(ids), 'rank': {v: rank[v] for v in v12}, 'answer_level': {v: al[v] for v in v12},
             'vs_RRF': vs, 'literal_check': lit, 'scorer': sc}
        written['heldout.json'] = gc.write_return(os.path.join(out_dir, 'heldout.json'), R, ids)
        if marker: ho.write_marker(marker, {'handoff_sha256': handoff_sha, 'freeze_sha256': freeze_sha, 'state': 'returned',
                                            'return_sha256': written['heldout.json']})
        say('literal check: %s' % json.dumps(lit, sort_keys=True))
    for f, h in sorted(written.items()): say('return %s sha256 %s' % (os.path.join(out_dir, f), h))
    say('answer level: %s' % json.dumps(ainfo, sort_keys=True))
    return written


def main(argv):
    if not argv or argv[0] not in ho.MODES: print(__doc__); return 2
    mode = argv[0]; a = {}
    rest = argv[1:]
    if len(rest) % 2: print('options come in pairs'); return 2
    for k, v in zip(rest[::2], rest[1::2]):
        if k not in ('--handoff', '--handoff-sha256', '--freeze-sha256'): print('unknown option %s' % k); return 2
        a[k] = v
    if '--handoff' not in a: print('--handoff is required'); return 2
    if mode in ('tune', 'tune-test') and '--freeze-sha256' in a: print('--freeze-sha256 is for the held-out modes'); return 2
    try:
        run(mode, a['--handoff'], a.get('--handoff-sha256'), a.get('--freeze-sha256'))
    except Refuse as e:
        print('grader: refusing (exit %d): %s' % (e.code, e.msg), flush=True); return e.code
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
