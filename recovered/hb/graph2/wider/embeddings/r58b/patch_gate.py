import sys
L = sys.argv[1]
p = L + '/train/r58/tests/r58common.py'; s = open(p).read()
a = "OUTR = os.path.join(TRAIN, 'r58', 'out')\n"
assert s.count(a) == 1
s = s.replace(a, "OUTR = os.environ.get('R58_OUT') or os.path.join(TRAIN, 'r58', 'out')  # follow-up: /w/r58b/out (train/ read-only)\n")
open(p, 'w', newline='\n').write(s)
p = L + '/train/r58/tests/incontainer.sh'; s = open(p).read()
for a, b in (("LOGS=/w/train/r58/logs\n", "LOGS=${R58_LOGS:-/w/train/r58/logs}\nOUTB=${R58_OUT:-/w/train/r58/out}\n"),
             ("OUT=/w/train/r58/out/selrep", "OUT=$OUTB/selrep"),
             ("# Runs the ruling-58 plumbing tests inside ONE container (kge-W1, CPU image).", "# Runs the ruling-58 plumbing tests inside ONE CPU container (kge-W1 in stage 1; ktest-N since the follow-up, with\n# train/ read-only and R58_LOGS / R58_OUT on a writable mount).")):
    assert s.count(a) == 1, a; s = s.replace(a, b)
open(p, 'w', newline='\n').write(s)
p = L + '/train/r58/tests/test_gate.py'; s = open(p).read()
a = "NEW_GUARD, PRE_GUARD = selectB.r58_guard, PRE.r58_guard  # kept before run_new/run_pre bypass them\n"
assert s.count(a) == 1
s = s.replace(a, a + "PRE2 = load_module('selectB_pre2', os.path.join(ROOT, 'r58b', 'pre', 'selectB.py'))  # evidence-2: the stage-1 final bytes\nPRE2_GUARD = PRE2.r58_guard\n")
a = "show_hashes('train/selectB.py', 'train/r58/pre/selectB.py')"
s = s.replace(a, "show_hashes('train/selectB.py', 'train/r58/pre/selectB.py', 'r58b/pre/selectB.py', 'train/report.py', 'train/item27.py')")
a = """check('r67_new_accepts_e4_with_det', rc_e4 == 0, 'exit', rc_e4)
"""
b = a + """# ---- evidence-2: det=1 as a WORD (assemble_checks.py's regex); the stage-1 substring test accepted xdet=1
set_meta('E4', plan['plan_hash'], runner='rerun xdet=1')
rc_pre2 = exits(PRE2.check_assembled, 'E4', ['c01', 'c02', 'c03'], plan, TB)
rc_e4 = exits(selectB.check_assembled, 'E4', ['c01', 'c02', 'c03'], plan, TB)
check('ev2_pre_accepts_xdet', rc_pre2 == 0, 'fail before: stage-1 selectB exit', rc_pre2, 'on runner "rerun xdet=1"')
check('ev2_new_refuses_xdet', rc_e4 == 4, 'pass after: exit', rc_e4)
set_meta('E4', plan['plan_hash'], runner='detrun.py stageB.py det=1')
"""
assert s.count(a) == 1; s = s.replace(a, b)
a = """rc_new = exits(NEW_GUARD, RL, R)
check('ss6_new_passes_with_pass_lines', rc_new == 0, 'exit', rc_new)
"""
b = """# ---- evidence-2: the four role PASS lines are no longer enough; a PASS assemble-checks line (written only by
# orchestrator/end_of_run.sh) must name a log showing assemble_checks PASS on the current assemble_checks.py bytes
rc_pre2 = exits(PRE2_GUARD, RL, R); rc_new = exits(NEW_GUARD, RL, R)
check('ev2_pre_passes_without_assemble_checks', rc_pre2 == 0, 'fail before: stage-1 guard exit', rc_pre2, '(no PASS assemble-checks line)')
check('ev2_new_refuses_without_assemble_checks', rc_new == 3, 'pass after: current guard exit', rc_new)
import report, item27
selectB.HERE, selectB.ROOT = os.path.join(R, 'train'), R  # report and item27 call this same guard (defaults)
rc_rep = exits(report.main); rc_i27 = exits(item27.main, ['--out', os.path.join(D, 'i27_refused', 'item27.json')])
check('ev2_report_and_item27_refuse', rc_rep == 3 and rc_i27 == 3 and not os.path.exists(os.path.join(D, 'i27_refused')), 'report exit', rc_rep, 'item27 exit', rc_i27)
os.makedirs(os.path.join(R, 'orchestrator'))
ACP = os.path.join(R, 'orchestrator', 'assemble_checks.py'); open(ACP, 'w').write('# assemble_checks stand-in\n'); HA = sha(ACP)
ALOG = os.path.join(R, 'orchestrator', 'end-of-run', 'ac.log'); os.makedirs(os.path.dirname(ALOG))
open(ALOG, 'w').write('sha256 %s orchestrator/assemble_checks.py\nREFUSE R66 E4: x\nassemble_checks REFUSED: 1 parts\n' % HA)
open(RL, 'a').write('PASS assemble-checks orchestrator/end-of-run/ac.log\n')
rc_new = exits(NEW_GUARD, RL, R)
check('ev2_new_refuses_a_refused_log', rc_new == 3, 'exit', rc_new)
open(ALOG, 'w').write('sha256 %s orchestrator/assemble_checks.py\nassemble_checks PASS: 1 parts\n' % ('0' * 64))
rc_new = exits(NEW_GUARD, RL, R)
check('ev2_new_refuses_a_log_of_other_bytes', rc_new == 3, 'exit', rc_new)
open(ALOG, 'w').write('sha256 %s orchestrator/assemble_checks.py\nassemble_checks PASS: 1 parts\n' % HA)
rc_new = exits(NEW_GUARD, RL, R)
check('ss6_new_passes_with_pass_lines', rc_new == 0, 'exit', rc_new, '(with the assemble-checks line)')
rc_rep = exits(lambda: report.r58_guard()); rc_i27 = exits(lambda: item27.selectB.r58_guard())
check('ev2_report_and_item27_guard_pass', rc_rep == 0 and rc_i27 == 0, 'exits', rc_rep, rc_i27)
open(ACP, 'a').write('# edited after its check\n')
rc_new = exits(NEW_GUARD, RL, R)
check('ev2_new_refuses_edited_assemble_checks', rc_new == 3, 'exit', rc_new)
open(ACP, 'w').write('# assemble_checks stand-in\n')
"""
assert s.count(a) == 1; s = s.replace(a, b)
open(p, 'w', newline='\n').write(s)
print('patched')
