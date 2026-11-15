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
PRE2 = load_module('selectB_pre2', os.path.join(ROOT, 'r58b', 'pre', 'selectB.py'))  # evidence-2: the stage-1 final bytes
PRE2_GUARD = PRE2.r58_guard
show_hashes('train/selectB.py', 'train/r58/pre/selectB.py', 'r58b/pre/selectB.py', 'train/report.py', 'train/item27.py')
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
# ---- selection-freeze-7: choices.json carries the plan hash, selectB.py's sha256 and the tables digest; report refuses stale input
sys.path[:] = [p for p in sys.path if os.sep + 'pre' not in p and '/pre' not in p]  # never import a snapshot as report
import report
cj = json.load(open(os.path.join(D, 'sel_new', 'E1', 'choices.json')))
st = cj.get('stamp') or {}
check('sf7_choices_stamped', st.get('plan_hash') == plan['plan_hash'] and st.get('selectB_sha256') == sha(os.path.join(TRAIN, 'selectB.py'))
      and st.get('tables_digest') == selectB.tables_digest(TB, plan), 'stamp', json.dumps(st)[:200])
rc_ok = exits(report.check_stamps, os.path.join(D, 'sel_new'), ['E1'], plan, TB)
mp = os.path.join(TB, 'E1_c02_s1_meta.json'); keep = open(mp).read(); open(mp, 'a').write(' ')
rc_stale = exits(report.check_stamps, os.path.join(D, 'sel_new'), ['E1'], plan, TB); open(mp, 'w').write(keep)
plan2 = dict(plan, plan_hash='Z' * 64); rc_plan = exits(report.check_stamps, os.path.join(D, 'sel_new'), ['E1'], plan2, TB)
check('sf7_report_refuses_stale_choices', rc_ok == 0 and rc_stale == 4 and rc_plan == 4, 'current', rc_ok, 'a table re-assembled', rc_stale, 'another plan', rc_plan)
rc_pre = run_pre('E1'); pcj = json.load(open(os.path.join(D, 'sel_pre', 'E1', 'choices.json')))
PRE2_REPORT = load_module('report_pre2', os.path.join(ROOT, 'r58b', 'pre', 'report.py'))
check('sf7_pre_unstamped_and_unchecked', 'stamp' not in pcj and not hasattr(PRE2_REPORT, 'check_stamps'),
      'fail before: the stage-1 selectB wrote no stamp and the stage-1 report had no stale-input check')
# ---- ruling 67 (with plan-04): an E4 set whose runner lacks det=1
set_meta('E4', plan['plan_hash'], runner='stageB.py E4')
rc_e4 = exits(selectB.check_assembled, 'E4', ['c01', 'c02', 'c03'], plan, TB)
check('r67_new_refuses_e4_without_det', rc_e4 == 4, 'exit', rc_e4)
set_meta('E4', plan['plan_hash'], runner='detrun.py stageB.py det=1')
rc_e4 = exits(selectB.check_assembled, 'E4', ['c01', 'c02', 'c03'], plan, TB)
check('r67_new_accepts_e4_with_det', rc_e4 == 0, 'exit', rc_e4)
# ---- evidence-2: det=1 as a WORD (assemble_checks.py's regex); the stage-1 substring test accepted xdet=1
set_meta('E4', plan['plan_hash'], runner='rerun xdet=1')
rc_pre2 = exits(PRE2.check_assembled, 'E4', ['c01', 'c02', 'c03'], plan, TB)
rc_e4 = exits(selectB.check_assembled, 'E4', ['c01', 'c02', 'c03'], plan, TB)
check('ev2_pre_accepts_xdet', rc_pre2 == 0, 'fail before: stage-1 selectB exit', rc_pre2, 'on runner "rerun xdet=1"')
check('ev2_new_refuses_xdet', rc_e4 == 4, 'pass after: exit', rc_e4)
set_meta('E4', plan['plan_hash'], runner='detrun.py stageB.py det=1')

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
# ---- evidence-2: the four role PASS lines are no longer enough; a PASS assemble-checks line (written only by
# orchestrator/end_of_run.sh) must name a log showing assemble_checks PASS on the current assemble_checks.py bytes
rc_pre2 = exits(PRE2_GUARD, RL, R); rc_new = exits(NEW_GUARD, RL, R)
check('ev2_pre_passes_without_assemble_checks', rc_pre2 == 0, 'fail before: stage-1 guard exit', rc_pre2, '(no PASS assemble-checks line)')
check('ev2_new_refuses_without_assemble_checks', rc_new == 3, 'pass after: current guard exit', rc_new)
sys.path[:] = [p for p in sys.path if os.sep + 'pre' not in p and '/pre' not in p]  # the snapshots' folders (selectB inserts its own)
selectB.r58_guard = NEW_GUARD  # run_new replaced it with a no-op; report and item27 bind it at import time
import report, item27
report.r58_guard = NEW_GUARD  # report may have been imported earlier (sf7), with the no-op bound
assert os.path.dirname(os.path.abspath(report.__file__)) == os.path.abspath(TRAIN) == os.path.dirname(os.path.abspath(item27.__file__)), (report.__file__, item27.__file__)
selectB.HERE, selectB.ROOT = os.path.join(R, 'train'), R  # report and item27 call this same guard (defaults)
REAL27 = os.path.join(TRAIN, 'heldout', 'item27.json'); had27 = os.path.exists(REAL27)
rc_rep = exits(report.main); rc_i27 = exits(item27.main, [])  # the real run takes no option (ruling 80); the guard stops it first
check('ev2_report_and_item27_refuse', rc_rep == 3 and rc_i27 == 3 and os.path.exists(REAL27) == had27, 'report exit', rc_rep, 'item27 exit', rc_i27,
      '; train/heldout/item27.json untouched (train/ is read-only here as well)')
os.makedirs(os.path.join(R, 'orchestrator')); os.makedirs(os.path.join(R, 'train', 'stageB', 'tables'))
json.dump(plan, open(os.path.join(R, 'train', 'stageB', 'plan.json'), 'w'))
HD = selectB.tables_digest(os.path.join(R, 'train', 'stageB', 'tables'), plan)  # the guard recomputes it (selection-freeze-2)
ACP = os.path.join(R, 'orchestrator', 'assemble_checks.py'); open(ACP, 'w').write('# assemble_checks stand-in\n'); HA = sha(ACP)
ALOG = os.path.join(R, 'orchestrator', 'end-of-run', 'ac.log'); os.makedirs(os.path.dirname(ALOG))
open(ALOG, 'w').write('sha256 %s orchestrator/assemble_checks.py\nREFUSE R66 E4: x\nassemble_checks REFUSED: 1 parts\n' % HA)
open(RL, 'a').write('PASS assemble-checks orchestrator/end-of-run/ac.log\n')
rc_new = exits(NEW_GUARD, RL, R)
check('ev2_new_refuses_a_refused_log', rc_new == 3, 'exit', rc_new)
open(ALOG, 'w').write('sha256 %s orchestrator/assemble_checks.py\nassemble_checks PASS: 1 parts\n' % ('0' * 64))
rc_new = exits(NEW_GUARD, RL, R)
check('ev2_new_refuses_a_log_of_other_bytes', rc_new == 3, 'exit', rc_new)
open(ALOG, 'w').write('sha256 %s orchestrator/assemble_checks.py\nassemble_checks PASS: 1 parts\ntables_digest %s\n' % (HA, '1' * 64))
rc_new = exits(NEW_GUARD, RL, R)
check('sf2_new_refuses_a_stale_tables_digest', rc_new == 3, 'exit', rc_new, '(a PASS log from another assembly)')
open(ALOG, 'w').write('sha256 %s orchestrator/assemble_checks.py\nassemble_checks PASS: 1 parts\ntables_digest %s\n' % (HA, HD))
rc_new = exits(NEW_GUARD, RL, R)
check('ss6_new_passes_with_pass_lines', rc_new == 0, 'exit', rc_new, '(with the assemble-checks line)')
rc_rep = exits(lambda: report.r58_guard()); rc_i27 = exits(lambda: item27.selectB.r58_guard())
check('ev2_report_and_item27_guard_pass', rc_rep == 0 and rc_i27 == 0, 'exits', rc_rep, rc_i27)
open(ACP, 'a').write('# edited after its check\n')
rc_new = exits(NEW_GUARD, RL, R)
check('ev2_new_refuses_edited_assemble_checks', rc_new == 3, 'exit', rc_new)
open(ACP, 'w').write('# assemble_checks stand-in\n')
# evidence-2 with a REAL end_of_run.sh output (the synthetic-copy run, r58b/eor/c): its PASS line and log, and the real
# orchestrator/assemble_checks.py bytes, satisfy the guard; the same log against edited bytes does not
EC = os.environ.get('EOR_PASS_ROOT')
if EC:  # the REAL end_of_run.sh output (r58b/eor/c): its PASS log passes ac_problems; after a table changes it is stale
    pl = [l for l in open(os.path.join(EC, 'train', 'RUNLOG.md'), encoding='utf-8') if l.startswith('PASS assemble-checks ')][-1].split()[2]
    p0 = selectB.ac_problems(EC, pl)
    mp = os.path.join(EC, 'train', 'stageB', 'tables', 'E4_c12_s3_meta.json'); keep = open(mp, 'rb').read()
    open(mp, 'ab').write(b' ')
    p1 = selectB.ac_problems(EC, pl)
    open(mp, 'wb').write(keep)
    check('ev2_guard_accepts_end_of_run_output', p0 == [] and len(p1) == 1 and 'stale' in p1[0], 'real log', pl, p0, '; after a table changes:', p1)
open(os.path.join(R, 'train', 'la.py'), 'a').write('# edited after its test\n')
rc_new = exits(NEW_GUARD, RL, R)
check('ss6_new_refuses_edited_script', rc_new == 3, 'exit', rc_new)
ok = finish('gate')
sys.exit(0 if ok else 1)
