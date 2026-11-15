"""Plumbing test 2 for stageB.py: projection/assignment/lag logic and run_units+assemble on a fake plan
(E2 c01, 2 epochs, one early checkpoint, its <= 3 tasks; outputs under stageB/test2/). No metric."""
import os, json, collections
import stageB as sb, kge, proj, checkpoints as ck
P = ck.load_parents()
T = json.load(open(os.path.join(sb.HERE, 'timing.json')))
sel = [(a, 'cX', 20, (T[a + '/stageA']['train_triples'], T[a + '/stageA']['s_per_epoch']),
        (T[a + '/largest_tune']['train_triples'], T[a + '/largest_tune']['s_per_epoch'])) for a in kge.ARMS]
s, table = proj.project_selected(sel)
assign, added = ck.assignment_r33('tune', 10, P)
tasks = sb.load_tasks()
lag = {t['task_id']: len(sb.hist(t['parent'], P) - sb.hist(assign[t['parent']], P)) for t in tasks}
leak_ok = all(ck.is_ancestor_or_self(assign[t['parent']], t['parent'], P) for t in tasks)
Cs = sorted(set(assign.values()), key=lambda c: P[c]['commit_time'])[:2]
mine = [t for t in tasks if assign[t['parent']] == Cs[0]][:1] + [t for t in tasks if assign[t['parent']] == Cs[1]][:2]
base = os.path.join(sb.SB, 'test2'); sb.PARTS = os.path.join(base, 'parts'); sb.TABLES = os.path.join(base, 'tables')
sb.PROG = os.path.join(base, 'progress.jsonl'); os.makedirs(base, exist_ok=True)
sb.load_tasks = lambda: mine
plan = dict(s=10, configs={'E2': [dict(config_id='c01', cfg=dict(embedding_dim=128, n3_weight=0.005, lr=0.03), epochs=2)]},
            checkpoints=Cs, assignment={t['parent']: assign[t['parent']] for t in mine}, lag=lag)
plan['plan_hash'] = sb.plan_hash(plan['s'])  # ruling 59: run_units refuses a plan without the current hash
sb.SEEDS = (1, 2)
sb.run_units(['E2'], plan)
sb.run_units(['E2'], plan)  # resume: both units skipped
units = [json.loads(l) for l in open(sb.PROG)]
tabs = sorted(os.listdir(sb.TABLES))
print(json.dumps(dict(proj_s_at_20_epochs_slowest=s, wall_h={k: v['wall_hours_2_containers'] for k, v in table.items()},
                      s10_checkpoints=len(set(assign.values())), r33_added=len(added), leak_ok=leak_ok,
                      lag_hist_s10=dict(sorted(collections.Counter(lag.values()).items())), test_tasks=[t['task_id'] for t in mine],
                      units_logged=[(u['unit'], u['status']) for u in units], tables=tabs,
                      model_dirs_left=[d for r, ds, _ in os.walk(base) for d in ds if d.endswith('.model') or d.endswith('.part')])))
