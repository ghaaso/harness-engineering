"""Release-gate findings plan-04 and scoring-selection-6: each check runs the PRE-fix code (train/r58/pre/, snapshot
taken before the edits) and the current code on the same inputs; the pre-fix code must show the defect (fail
before) and the current code must not (pass after). Synthetic stage-B tables (placebo-like hashed scores over the
real tune candidate lists, pool scope; the unrestricted scope empty) in a fake lane folder; tuning data only."""
import os, sys, json, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from r58common import *
import evalcore as ec
import selectB
from atomic import retry_write
PRE = load_module('selectB_pre', os.path.join(TRAIN, 'r58', 'pre', 'selectB.py'))
NEW_GUARD, PRE_GUARD = selectB.r58_guard, PRE.r58_guard  # kept before run_new/run_pre bypass them
show_hashes('train/selectB.py', 'train/r58/pre/selectB.py')
D = fresh(os.path.join(OUTR, 'gate'))
F = os.path.join(D, 'fake'); TB = os.path.join(F, 'stageB', 'tables'); os.makedirs(TB)
plan = dict(s=1, plan_hash='H' * 64, configs=dict(
    E1=[dict(config_id=c, cfg=dict(embedding_dim=dm), epochs=1) for c, dm in (('c01', 64), ('c02', 128), ('c03', 256))],
    E4=[dict(config_id=c, cfg=dict(embedding_dim=64, num_layers=1), epochs=1) for c in ('c01', 'c02', 'c03')]))
json.dump(plan, open(os.path.join(F, 'stageB', 'plan.json'), 'w'))
cl = selectB.cand_lists()
tasks = ec.load_tasks()
for arm in ('E1', 'E4'):
    for c in plan['configs'][arm]:
        for s in (1, 2, 3):
            base = os.path.join(TB, '%s_%s_s%d' % (arm, c['config_id'], s))
            tab = {t['task_id']: selectB.placebo(s, t['task_id'], cl['pool'].get(t['task_id'], []), arm + c['config_id']) for t in tasks}
            retry_write(lambda: ec.write_score_table(base + '_pool.tsv.gz', tab), base + '_pool.tsv.gz')  # this mount can refuse a rename
            retry_write(lambda: ec.write_score_table(base + '_unrestricted.tsv.gz', {}), base + '_unrestricted.tsv.gz')
            json.dump({}, open(base + '_counts.json', 'w'))


def set_meta(arm, plan_hash, runner='stageB.py', drop=None):
    for c in plan['configs'][arm]:
        for s in (1, 2, 3):
            mp = os.path.join(TB, '%s_%s_s%d_meta.json' % (arm, c['config_id'], s))
            if drop == (c['config_id'], s):
                if os.path.exists(mp): os.remove(mp)
                continue
            json.dump(dict(plan_hash=plan_hash, parts=1, tasks=388, runners=[dict(runner=runner, processes=1)]), open(mp, 'w'))


def run_new(arm):
    selectB.HERE = F; selectB.r58_guard = lambda *a, **k: None
    return exits(selectB.run, [arm], os.path.join(D, 'sel_new'))


def run_pre(arm):
    PRE.HERE = F; PRE.TB = TB; PRE.r58_guard = lambda *a, **k: None
    return exits(PRE.run, [arm], os.path.join(D, 'sel_pre'))


# ---- plan-04: no _meta.json at all (a set stage B has not marked complete)
rc_pre = run_pre('E1'); rc_new = run_new('E1')
check('plan04_pre_reads_unmarked_tables', rc_pre == 0 and os.path.exists(os.path.join(D, 'sel_pre', 'E1', 'choices.json')),
      'fail before: pre-fix selectB exit', rc_pre, 'and wrote choices.json from tables without _meta.json')
check('plan04_new_refuses_unmarked_tables', rc_new == 4 and not os.path.exists(os.path.join(D, 'sel_new', 'E1', 'choices.json')),
      'pass after: current selectB exit', rc_new)
# ---- plan-04: a stale set (another plan_hash) and a half-assembled set (one _meta.json missing)
set_meta('E1', 'X' * 64)
shutil.rmtree(os.path.join(D, 'sel_pre')); rc_pre = run_pre('E1'); rc_new = run_new('E1')
check('plan04_pre_reads_stale_plan_hash', rc_pre == 0, 'fail before: pre-fix exit', rc_pre)
check('plan04_new_refuses_stale_plan_hash', rc_new == 4, 'pass after: exit', rc_new)
set_meta('E1', plan['plan_hash'], drop=('c02', 3))
rc_new = run_new('E1')
check('plan04_new_refuses_one_missing_meta', rc_new == 4, 'exit', rc_new)
set_meta('E1', plan['plan_hash'])
os.remove(os.path.join(TB, 'E1_c03_s2_counts.json')); rc_new = run_new('E1')
check('plan04_new_refuses_missing_counts', rc_new == 4, 'exit', rc_new)
json.dump({}, open(os.path.join(TB, 'E1_c03_s2_counts.json'), 'w'))
rc_new = run_new('E1')
check('plan04_new_runs_on_complete_set', rc_new == 0 and os.path.exists(os.path.join(D, 'sel_new', 'E1', 'choices.json')), 'exit', rc_new)
# ---- ruling 67 (with plan-04): an E4 set whose runner lacks det=1
set_meta('E4', plan['plan_hash'], runner='stageB.py E4')
rc_e4 = exits(selectB.check_assembled, 'E4', ['c01', 'c02', 'c03'], plan, TB)
check('r67_new_refuses_e4_without_det', rc_e4 == 4, 'exit', rc_e4)
set_meta('E4', plan['plan_hash'], runner='detrun.py stageB.py det=1')
rc_e4 = exits(selectB.check_assembled, 'E4', ['c01', 'c02', 'c03'], plan, TB)
check('r67_new_accepts_e4_with_det', rc_e4 == 0, 'exit', rc_e4)

# ---- scoring-selection-6: hashes alone vs hashes plus PASS lines with logs
R = fresh(os.path.join(D, 'guardroot'))
os.makedirs(os.path.join(R, 'train'))
roles = dict(zip(selectB.R58_ROLES, ('train/a27.py', 'train/hd.py', 'train/al.py', 'train/la.py')))
H = {}
for role, rel in roles.items():
    open(os.path.join(R, rel), 'w').write('# %s\n' % role); H[role] = sha(os.path.join(R, rel))
RL = os.path.join(R, 'train', 'RUNLOG.md')
open(RL, 'w').write('## Ruling 58 scripts\n' + ''.join('sha256 %s %s %s\n' % (H[r], r, p) for r, p in roles.items()))
rc_pre = exits(PRE_GUARD, RL, R); rc_new = exits(NEW_GUARD, RL, R)
check('ss6_pre_passes_on_hashes_alone', rc_pre == 0, 'fail before: pre-fix guard exit', rc_pre, '(no PASS line, no test log)')
check('ss6_new_refuses_without_pass_lines', rc_new == 3, 'pass after: current guard exit', rc_new)
os.makedirs(os.path.join(R, 'train', 'logs'))
for role in roles:
    open(os.path.join(R, 'train', 'logs', role + '.log'), 'w').write('sha256 %s x\nRESULT PASS %s {}\n' % (H[role], role))
open(os.path.join(R, 'train', 'logs', 'leak-audit.log'), 'w').write('sha256 %s x\nRESULT FAIL leak-audit {}\n' % H['leak-audit'])
open(RL, 'a').write(''.join('PASS %s train/logs/%s.log\n' % (r, r) for r in roles))
rc_new = exits(NEW_GUARD, RL, R)
check('ss6_new_refuses_a_failed_log', rc_new == 3, 'exit', rc_new)
open(os.path.join(R, 'train', 'logs', 'leak-audit.log'), 'w').write('sha256 %s x\nRESULT PASS leak-audit {}\n' % ('0' * 64))
rc_new = exits(NEW_GUARD, RL, R)
check('ss6_new_refuses_a_log_of_other_bytes', rc_new == 3, 'exit', rc_new)
open(os.path.join(R, 'train', 'logs', 'leak-audit.log'), 'w').write('sha256 %s x\nRESULT PASS leak-audit {}\n' % H['leak-audit'])
rc_new = exits(NEW_GUARD, RL, R)
check('ss6_new_passes_with_pass_lines', rc_new == 0, 'exit', rc_new)
open(os.path.join(R, 'train', 'la.py'), 'a').write('# edited after its test\n')
rc_new = exits(NEW_GUARD, RL, R)
check('ss6_new_refuses_edited_script', rc_new == 3, 'exit', rc_new)
ok = finish('gate')
sys.exit(0 if ok else 1)
