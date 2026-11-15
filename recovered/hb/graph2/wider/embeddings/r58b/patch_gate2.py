import sys
p = sys.argv[1] + '/train/r58/tests/test_gate.py'
s = open(p).read()
a = "os.makedirs(os.path.join(R, 'orchestrator'))\n"
assert s.count(a) == 1
s = s.replace(a, """os.makedirs(os.path.join(R, 'orchestrator')); os.makedirs(os.path.join(R, 'train', 'stageB', 'tables'))
json.dump(plan, open(os.path.join(R, 'train', 'stageB', 'plan.json'), 'w'))
HD = selectB.tables_digest(os.path.join(R, 'train', 'stageB', 'tables'), plan)  # the guard recomputes it (selection-freeze-2)
""")
a = "open(ALOG, 'w').write('sha256 %s orchestrator/assemble_checks.py\\nassemble_checks PASS: 1 parts\\n' % HA)\n"
assert s.count(a) == 1, 'pass log'
s = s.replace(a, """open(ALOG, 'w').write('sha256 %s orchestrator/assemble_checks.py\\nassemble_checks PASS: 1 parts\\ntables_digest %s\\n' % (HA, '1' * 64))
rc_new = exits(NEW_GUARD, RL, R)
check('sf2_new_refuses_a_stale_tables_digest', rc_new == 3, 'exit', rc_new, '(a PASS log from another assembly)')
open(ALOG, 'w').write('sha256 %s orchestrator/assemble_checks.py\\nassemble_checks PASS: 1 parts\\ntables_digest %s\\n' % (HA, HD))
""")
i = s.index("EC = os.environ.get('EOR_PASS_ROOT')")
j = s.index("open(os.path.join(R, 'train', 'la.py'), 'a')")
s = s[:i] + """EC = os.environ.get('EOR_PASS_ROOT')
if EC:  # the REAL end_of_run.sh output (r58b/eor/c): its PASS log passes ac_problems; after a table changes it is stale
    pl = [l for l in open(os.path.join(EC, 'train', 'RUNLOG.md'), encoding='utf-8') if l.startswith('PASS assemble-checks ')][-1].split()[2]
    p0 = selectB.ac_problems(EC, pl)
    mp = os.path.join(EC, 'train', 'stageB', 'tables', 'E4_c12_s3_meta.json'); keep = open(mp, 'rb').read()
    open(mp, 'ab').write(b' ')
    p1 = selectB.ac_problems(EC, pl)
    open(mp, 'wb').write(keep)
    check('ev2_guard_accepts_end_of_run_output', p0 == [] and len(p1) == 1 and 'stale' in p1[0], 'real log', pl, p0, '; after a table changes:', p1)
""" + s[j:]
open(p, 'w', newline='\n').write(s)
print('patched test_gate.py')
