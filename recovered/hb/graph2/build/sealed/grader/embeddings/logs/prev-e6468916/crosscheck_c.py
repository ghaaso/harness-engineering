"""Cross-check C: the grader's answer-level path (answer_score.js -> score.js rule content -> per task; evalcore
per_commit / summary over the task commits of the sealed records) run on the stored held-out T1 answers of the
earlier graph test's frozen arms, against item 7's figures (3 decimals) and the earlier grader's scores.json
(4 decimals, as it stored them). Per-task values go to work/crosscheck_c/ (sealed); crosscheck_c.json holds
aggregates only. Exit 1 on a difference.
"""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import gradecore as gc

ARMS = {'relational': 0.700, 'search': 0.625, 'floor-co': 0.638, 'floor-dir': 0.549}  # item 7 (typed graph = relational)


def main():
    gc.check_pins(); truth = gc.load_truth()
    stored = json.load(open('/build/sealed/grader/heldout/scores.json'))['rows']
    clusters = [r for r in gc.jsonl('/build/sealed/grader/heldout/clusters.jsonl') if r['role'] == 'primary' and r['set'] == 'T1' and not r.get('draw')]
    work = os.path.join(HERE, 'work', 'crosscheck_c'); os.makedirs(work, exist_ok=True)
    res = {'rows': {}}; ok = True
    for arm, item7 in ARMS.items():
        f = '/build/results/heldout/%s/primary/T1.jsonl.gz' % arm
        per, info = gc.answer_level_per_task(f, os.path.join(work, '%s.jsonl' % arm), expect_arm=arm, expect_hash=None)
        ids = set(per)
        if any(truth[i]['split'] != 'heldout' for i in ids): raise SystemExit('not held-out tasks')
        tasks = gc.ec_tasks(ids, truth)
        x = gc.summary(gc.as_metrics(per), tasks)['P@10']
        st = [r for r in stored if r['arm'] == arm and r['role'] == 'primary' and r['set'] == 'T1']
        sv = st[0]['primary'] if len(st) == 1 else None
        cl = [r['primary'] for r in clusters if r['arm'] == arm]
        exact = sum(cl) / len(cl) if len(cl) == 75 else None  # the earlier grader's unrounded mean over its 75 per-commit values
        row = {'grader': x, 'item7': item7, 'scores_json': sv, 'tasks': len(ids), 'commits': len({t['commit'] for t in tasks}),
               'zero_unit_refs': info['zero_unit_refs'], 'stored_exact': exact, 'abs_diff_stored_exact': abs(x - exact) if exact is not None else None,
               'equal_item7_3dp': round(x, 3) == item7, 'equal_item7_half_up_from_4dp': int(round(x, 4) * 1000 + 0.5 + 1e-9) / 1000 == item7,
               'equal_scores_json_4dp': sv is not None and round(x, 4) == sv}
        ok = ok and exact is not None and row['abs_diff_stored_exact'] <= 1e-12 and abs(x - item7) <= 0.0006 and row['equal_scores_json_4dp'] and row['commits'] == 75
        res['rows'][arm] = row
        print(arm, 'grader %.10f stored exact %.10f item7 %.3f scores.json %s round3 %.3f tasks %d commits %d' % (x, exact, item7, sv, round(x, 3), row['tasks'], row['commits']))
    res['pass'] = ok
    json.dump(res, open(os.path.join(HERE, 'crosscheck_c.json'), 'w'), indent=1, sort_keys=True)
    print('pass', ok)
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
