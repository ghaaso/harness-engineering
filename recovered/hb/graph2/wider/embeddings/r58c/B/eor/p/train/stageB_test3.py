"""Plumbing test 3 for stageB.py on the card (gpu lane, task 7): the delete-after-score path. A fake plan (E1
c04's settings, 2 epochs, seed 1, the first two s=10 checkpoints, <= 3 tasks) runs run_units twice (the second
run must skip both units) and assemble; then checks: every trained unit's reps.pt is gone, its parts read back,
no .model/.part folder is left, and the bytes kept. Outputs under stageB/test3/ (or STAGEB_TEST_DIR). No metric.
run with KGE_DEVICE=cuda."""
import os, json, collections
import stageB as sb, kge, checkpoints as ck
P = ck.load_parents()
assign, added = ck.assignment_r33('tune', 10, P)
tasks = sb.load_tasks()
lag = {t['task_id']: len(sb.hist(t['parent'], P) - sb.hist(assign[t['parent']], P)) for t in tasks}
Cs = sorted(set(assign.values()), key=lambda c: P[c]['commit_time'])[:2]
mine = [t for t in tasks if assign[t['parent']] == Cs[0]][:1] + [t for t in tasks if assign[t['parent']] == Cs[1]][:2]
base = os.environ.get('STAGEB_TEST_DIR') or os.path.join(sb.SB, 'test3')
sb.PARTS = os.path.join(base, 'parts'); sb.TABLES = os.path.join(base, 'tables')
sb.PROG = os.path.join(base, 'progress.jsonl'); os.makedirs(base, exist_ok=True)
sb.load_tasks = lambda: mine
top = json.load(open(os.path.join(sb.HERE, 'stageA', 'top3.json')))
cfg = top['E1']['top3'][0]['cfg']
plan = dict(s=10, configs={'E1': [dict(config_id=top['E1']['top3'][0]['config_id'], cfg=cfg, epochs=2)]},
            checkpoints=Cs, assignment={t['parent']: assign[t['parent']] for t in mine}, lag=lag)
plan['plan_hash'] = sb.plan_hash(plan['s'])  # ruling 59: run_units refuses a plan without the current hash
sb.SEEDS = (1,)
sb.run_units(['E1'], plan)
sb.run_units(['E1'], plan)  # resume: both units skipped
units = [json.loads(l) for l in open(sb.PROG)]
files = []; left = []
for r, ds, fs in os.walk(base):
    left += [d for d in ds if d.endswith('.model') or d.endswith('.part')]
    files += [(os.path.relpath(os.path.join(r, f), base), os.path.getsize(os.path.join(r, f))) for f in fs]
out = dict(device=str(kge.DEVICE), tasks=[t['task_id'] for t in mine], checkpoints=[c[:12] for c in Cs],
           units_logged=[(u['unit'], u['status'], u.get('reps_deleted'), u.get('trained', True)) for u in units],
           reps_pt_left=[f for f, _ in files if f.endswith('reps.pt')], model_or_part_dirs_left=left,
           files=files, bytes_parts=sum(b for f, b in files if f.startswith('parts')),
           bytes_tables=sum(b for f, b in files if f.startswith('tables')), bytes_total=sum(b for _, b in files))
json.dump(out, open(os.path.join(base, 'test3.json'), 'w'), indent=1)
print(json.dumps(out))
