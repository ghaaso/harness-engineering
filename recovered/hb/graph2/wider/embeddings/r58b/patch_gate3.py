import sys
p = sys.argv[1] + '/train/r58/tests/test_gate.py'
s = open(p).read()
a = "check('plan04_new_runs_on_complete_set', rc_new == 0 and os.path.exists(os.path.join(D, 'sel_new', 'E1', 'choices.json')), 'exit', rc_new)\n"
assert s.count(a) == 1
s = s.replace(a, a + """# ---- selection-freeze-7: choices.json carries the plan hash, selectB.py's sha256 and the tables digest; report refuses stale input
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
""")
open(p, 'w', newline='\n').write(s)
print('patched')
