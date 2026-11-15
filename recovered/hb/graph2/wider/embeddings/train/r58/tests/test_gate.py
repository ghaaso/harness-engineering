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
show_hashes('train/selectB.py', 'train/r58/pre/selectB.py', 'r58b/pre/selectB.py', 'train/report.py', 'train/item27.py', 'train/r58/tests/test_gate.py')
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
# ---- selection-freeze-7 and ruling 82 (MF-1): choices.json carries the plan hash, selectB.py's sha256 and the tables
# digest over the score tables themselves; report refuses stale input
sys.path[:] = [p for p in sys.path if os.sep + 'pre' not in p and '/pre' not in p]  # never import a snapshot as report
import report
PREB = load_module('selectB_preB', os.path.join(ROOT, 'r58c', 'B', 'pre', 'selectB.py'))  # agent B's before bytes (r58c)
show_hashes('r58c/B/pre/selectB.py', 'r58c/B/pre/report.py')
SEL = os.path.join(D, 'sel_new')
cj = json.load(open(os.path.join(SEL, 'E1', 'choices.json')))
st = cj.get('stamp') or {}
check('sf7_choices_stamped', st.get('plan_hash') == plan['plan_hash'] and st.get('selectB_sha256') == sha(os.path.join(TRAIN, 'selectB.py'))
      and st.get('tables_digest') == selectB.tables_digest(TB, plan) and st.get('plan_sha256') == sha(os.path.join(F, 'stageB', 'plan.json'))
      and cj.get('test') is False and len(cj.get('outputs') or {}) > 0, 'stamp', json.dumps(st)[:200])
rc_ok = exits(report.check_stamps, SEL, ['E1'], plan, TB)
mp = os.path.join(TB, 'E1_c02_s1_meta.json'); keep = open(mp).read(); open(mp, 'a').write(' ')
rc_meta = exits(report.check_stamps, SEL, ['E1'], plan, TB); open(mp, 'w').write(keep)
tp = os.path.join(TB, 'E1_c02_s1_pool.tsv.gz'); keept = open(tp, 'rb').read()
tab = ec.read_score_table(tp); t0 = sorted(tab)[0]; x0 = sorted(tab[t0])[0]; tab[t0][x0] += 0.125
d_before = PREB.tables_digest(TB, plan); n_before = selectB.tables_digest(TB, plan)
retry_write(lambda: ec.write_score_table(tp, tab), tp)
rc_row = exits(report.check_stamps, SEL, ['E1'], plan, TB)
d_after = PREB.tables_digest(TB, plan); n_after = selectB.tables_digest(TB, plan)
open(tp, 'wb').write(keept)
plan2 = dict(plan, plan_hash='Z' * 64); rc_plan = exits(report.check_stamps, SEL, ['E1'], plan2, TB)
check('r82_report_refuses_changed_row_meta_kept', rc_ok == 0 and rc_row == 4 and rc_plan == 4 and rc_meta == 0 and n_before != n_after,
      'current', rc_ok, '| one score row changed, every _meta.json kept', rc_row, '| another plan', rc_plan, '| a _meta.json rewrite alone', rc_meta)
check('r82_fail_before_old_digest_blind_to_a_row', d_before == d_after, 'fail before: r58c/B/pre/selectB.tables_digest is the same before and '
      'after the row change (it read only the _meta.json files)')
# ruling 83 (MF-5): a choices.json flagged test, and a selectB output changed after choices.json named it, are refused
cjp = os.path.join(SEL, 'E1', 'choices.json'); keepc = open(cjp).read()
j = json.loads(keepc); j['test'] = True; open(cjp, 'w').write(json.dumps(j)); rc_t = exits(report.check_stamps, SEL, ['E1'], plan, TB)
open(cjp, 'w').write(keepc)
on = sorted(json.loads(keepc)['outputs'])[0]; op = os.path.join(SEL, 'E1', on); keepo = open(op, 'rb').read(); open(op, 'ab').write(b'\n')
rc_o = exits(report.check_stamps, SEL, ['E1'], plan, TB); open(op, 'wb').write(keepo)
rc_back = exits(report.check_stamps, SEL, ['E1'], plan, TB)
check('r83_report_refuses_test_flag_and_changed_output', rc_t == 4 and rc_o == 4 and rc_back == 0, 'test flag', rc_t, '| %s changed' % on, rc_o, '| restored', rc_back)
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

# ---- scoring-selection-6 and ruling 83: hashes alone vs hashes plus later PASS lines with logs, for SIX roles
check('r83_six_roles', tuple(selectB.R58_ROLES) == ('item27', 'heldout-driver', 'item24-adapter', 'leak-audit', 'selectB', 'report')
      and selectB.ROLE_FILES['selectB'] == 'train/selectB.py' and selectB.ROLE_FILES['report'] == 'train/report.py'
      and len(PREB.R58_ROLES) == 4, 'fail before: r58c/B/pre/selectB.py has', len(PREB.R58_ROLES), 'roles')
R = fresh(os.path.join(D, 'guardroot'))
os.makedirs(os.path.join(R, 'train'))
roles = dict((r, selectB.ROLE_FILES[r]) for r in selectB.R58_ROLES)  # ruling 83: each role's sha256 line names its own file
H = {}
for role, rel in roles.items():
    open(os.path.join(R, rel), 'w').write('# %s\n' % role); H[role] = sha(os.path.join(R, rel))
RL = os.path.join(R, 'train', 'RUNLOG.md')
SHA_LINES = ''.join('sha256 %s %s %s\n' % (H[r], r, p) for r, p in roles.items())
open(RL, 'w').write('## Ruling 58 scripts\n' + SHA_LINES)
rc_pre = exits(PRE_GUARD, RL, R); rc_new = exits(NEW_GUARD, RL, R)
check('ss6_pre_passes_on_hashes_alone', rc_pre == 0, 'fail before: pre-fix guard exit', rc_pre, '(no PASS line, no test log)')
check('ss6_new_refuses_without_pass_lines', rc_new == 3, 'pass after: current guard exit', rc_new)
os.makedirs(os.path.join(R, 'train', 'logs'))
for role in roles:
    open(os.path.join(R, 'train', 'logs', role + '.log'), 'w').write('sha256 %s x\nRESULT PASS %s {}\n' % (H[role], role))
open(os.path.join(R, 'train', 'logs', 'leak-audit.log'), 'w').write('sha256 %s x\nRESULT FAIL leak-audit {}\n' % H['leak-audit'])
PASS_LINES = ''.join('PASS %s train/logs/%s.log\n' % (r, r) for r in roles)
open(RL, 'a').write(PASS_LINES)
rc_new = exits(NEW_GUARD, RL, R)
check('ss6_new_refuses_a_failed_log', rc_new == 3, 'exit', rc_new)
open(os.path.join(R, 'train', 'logs', 'leak-audit.log'), 'w').write('sha256 %s x\nRESULT PASS leak-audit {}\n' % ('0' * 64))
rc_new = exits(NEW_GUARD, RL, R)
check('ss6_new_refuses_a_log_of_other_bytes', rc_new == 3, 'exit', rc_new)
open(os.path.join(R, 'train', 'logs', 'leak-audit.log'), 'w').write('sha256 %s x\nRESULT PASS leak-audit {}\n' % H['leak-audit'])
# ---- evidence-2: the role PASS lines are not enough; a PASS assemble-checks line (written only by
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
# ---- ruling 84 (MF-6): in the real call an EMB_ROOT that is not the lane is refused (exit 2) before anything is read
env0 = os.environ.get('EMB_ROOT'); os.environ['EMB_ROOT'] = '/tmp/not-the-lane'
rc_g = exits(NEW_GUARD); rc_rep = exits(report.main); rc_i27 = exits(item27.main, [])
if env0 is None: del os.environ['EMB_ROOT']
else: os.environ['EMB_ROOT'] = env0
check('r84_real_calls_refuse_another_root', rc_g == 2 and rc_rep == 2 and rc_i27 == 2, 'guard', rc_g, 'report', rc_rep, 'item27', rc_i27)
check('r84_fail_before_no_env_check', not hasattr(PREB, 'check_env') and not hasattr(PREB, 'env_problems'), 'fail before: r58c/B/pre/selectB.py has no root check')
os.makedirs(os.path.join(R, 'orchestrator')); os.makedirs(os.path.join(R, 'train', 'stageB', 'tables'))
json.dump(plan, open(os.path.join(R, 'train', 'stageB', 'plan.json'), 'w'))
HD = selectB.tables_digest(os.path.join(R, 'train', 'stageB', 'tables'), plan)  # the guard recomputes it (selection-freeze-2)
ACP = os.path.join(R, 'orchestrator', 'assemble_checks.py'); open(ACP, 'w').write('# assemble_checks stand-in\n'); HA = sha(ACP)
ALOG = os.path.join(R, 'orchestrator', 'end-of-run', 'ac.log'); os.makedirs(os.path.dirname(ALOG))
open(ALOG, 'w').write('sha256 %s orchestrator/assemble_checks.py\nREFUSE R66 E4: x\nassemble_checks REFUSED: 1 parts\n' % HA)
AC_LINE = 'PASS assemble-checks orchestrator/end-of-run/ac.log tables_digest %s\n' % HD
open(RL, 'a').write(AC_LINE)
rc_new = exits(NEW_GUARD, RL, R)
check('ev2_new_refuses_a_refused_log', rc_new == 3, 'exit', rc_new)
open(ALOG, 'w').write('sha256 %s orchestrator/assemble_checks.py\nassemble_checks PASS: 1 parts\n' % ('0' * 64))
rc_new = exits(NEW_GUARD, RL, R)
check('ev2_new_refuses_a_log_of_other_bytes', rc_new == 3, 'exit', rc_new)
open(ALOG, 'w').write('sha256 %s orchestrator/assemble_checks.py\nassemble_checks PASS: 1 parts\ntables_digest %s\n' % (HA, '1' * 64))
rc_new = exits(NEW_GUARD, RL, R)
check('sf2_new_refuses_a_stale_tables_digest', rc_new == 3, 'exit', rc_new, '(a PASS log from another assembly)')
GOOD_LOG = 'sha256 %s orchestrator/assemble_checks.py\nassemble_checks PASS: 1 parts\ntables_digest %s\n' % (HA, HD)
open(ALOG, 'w').write(GOOD_LOG)
rc_new = exits(NEW_GUARD, RL, R)
check('ss6_new_passes_with_pass_lines', rc_new == 0, 'exit', rc_new, '(six roles, each PASS after its sha256 line, and the assemble-checks line with the digest)')
rc_rep = exits(lambda: report.r58_guard()); rc_i27 = exits(lambda: item27.selectB.r58_guard())
check('ev2_report_and_item27_guard_pass', rc_rep == 0 and rc_i27 == 0, 'exits', rc_rep, rc_i27)
# ---- rulings 82, 83: variants of a passing RUNLOG, each refused by the current guard
def variant(name, text):
    p = os.path.join(R, 'train', 'RUNLOG-%s.md' % name); open(p, 'w').write(text); return exits(NEW_GUARD, p, R)
base_rl = open(RL).read()
v_nodig = variant('nodigest', base_rl.replace(AC_LINE, 'PASS assemble-checks orchestrator/end-of-run/ac.log\n'))
v_otherdig = variant('otherdigest', base_rl.replace(AC_LINE, 'PASS assemble-checks orchestrator/end-of-run/ac.log tables_digest %s\n' % ('2' * 64)))
v_order = variant('order', '## Ruling 58 scripts\n' + PASS_LINES + SHA_LINES + AC_LINE)
open(os.path.join(R, 'train', 'other27.py'), 'w').write('# item27\n')
v_name = variant('name', base_rl.replace('item27 train/item27.py', 'item27 train/other27.py'))
check('r82_new_refuses_pass_line_without_or_with_another_digest', v_nodig == 3 and v_otherdig == 3, 'no digest', v_nodig, '| another digest', v_otherdig)
check('r83_new_refuses_pass_before_sha_and_another_file', v_order == 3 and v_name == 3, 'PASS lines before the sha256 lines', v_order,
      '| the item27 sha256 line names train/other27.py (same bytes)', v_name)
# fail before: agent B's before bytes accept all three (a root whose log carries the before bytes' own digest)
RP = os.path.join(D, 'guardroot_pre'); shutil.copytree(R, RP)
open(os.path.join(RP, 'orchestrator', 'end-of-run', 'ac.log'), 'w').write(
    'sha256 %s orchestrator/assemble_checks.py\nassemble_checks PASS: 1 parts\ntables_digest %s\n' % (HA, PREB.tables_digest(os.path.join(RP, 'train', 'stageB', 'tables'), plan)))
def pvariant(name, text):
    p = os.path.join(RP, 'train', 'RUNLOG-%s.md' % name); open(p, 'w').write(text); return exits(PREB.r58_guard, p, RP)
NODIG = 'PASS assemble-checks orchestrator/end-of-run/ac.log\n'
p_nodig = pvariant('nodigest', '## Ruling 58 scripts\n' + SHA_LINES + PASS_LINES + NODIG)
p_order = pvariant('order', '## Ruling 58 scripts\n' + PASS_LINES + SHA_LINES + NODIG)
open(os.path.join(RP, 'train', 'other27.py'), 'w').write('# item27\n')
p_name = pvariant('name', ('## Ruling 58 scripts\n' + SHA_LINES + PASS_LINES + NODIG).replace('item27 train/item27.py', 'item27 train/other27.py'))
check('r82_r83_fail_before_pre_guard_accepts_them', p_nodig == 0 and p_order == 0 and p_name == 0, 'fail before: r58c/B/pre guard exits', p_nodig, p_order, p_name,
      '(no digest on the line; PASS before sha256; another file)')
open(ACP, 'a').write('# edited after its check\n')
rc_new = exits(NEW_GUARD, RL, R)
check('ev2_new_refuses_edited_assemble_checks', rc_new == 3, 'exit', rc_new)
open(ACP, 'w').write('# assemble_checks stand-in\n')
# evidence-2 with a REAL end_of_run.sh output (the synthetic-copy run of r58c/B/eor/test_end_of_run.sh): its PASS line and
# log, and that copy's assemble_checks.py bytes, satisfy the guard; after one counts file changes the PASS is stale.
# MF-3: the output is COPIED into this test's own folder first; nothing is ever written into EOR_PASS_ROOT.
EC0 = os.environ.get('EOR_PASS_ROOT')
check('mf3_eor_pass_root_given', bool(EC0) and os.path.isdir(EC0 or ''), 'EOR_PASS_ROOT', EC0)
if EC0 and os.path.isdir(EC0):
    EC = os.path.join(D, 'eor_copy'); shutil.copytree(EC0, EC)
    lw = [l for l in open(os.path.join(EC, 'train', 'RUNLOG.md'), encoding='utf-8') if l.startswith('PASS assemble-checks ')][-1].split()
    pl, ld = lw[2], (lw[4] if len(lw) > 4 and lw[3] == 'tables_digest' else None)
    p0 = selectB.ac_problems(EC, pl, ld)
    cp = os.path.join(EC, 'train', 'stageB', 'tables', 'E4_c12_s3_counts.json'); src = os.path.join(EC0, 'train', 'stageB', 'tables', 'E4_c12_s3_counts.json')
    h_src = sha(src); open(cp, 'ab').write(b' ')
    p1 = selectB.ac_problems(EC, pl, ld)
    check('ev2_guard_accepts_end_of_run_output', p0 == [] and len(p1) == 1 and 'stale' in p1[0] and sha(src) == h_src,
          'real log', pl, 'digest', str(ld)[:12], p0, '; after a counts file changes in the copy:', p1, '; EOR_PASS_ROOT untouched')
open(os.path.join(R, 'train', 'leak_audit.py'), 'a').write('# edited after its test\n')
rc_new = exits(NEW_GUARD, RL, R)
check('ss6_new_refuses_edited_script', rc_new == 3, 'exit', rc_new)
ok = finish('gate')
sys.exit(0 if ok else 1)
