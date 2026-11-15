import sys
p = sys.argv[1] + '/train/r58/tests/test_gate.py'
s = open(p).read()
pairs = [
    ("stand-in\n')", "stand-in\\n')"),
    ("orchestrator/assemble_checks.py\nREFUSE R66 E4: x\nassemble_checks REFUSED: 1 parts\n'", "orchestrator/assemble_checks.py\\nREFUSE R66 E4: x\\nassemble_checks REFUSED: 1 parts\\n'"),
    ("orchestrator/assemble_checks.py\nassemble_checks PASS: 1 parts\n'", "orchestrator/assemble_checks.py\\nassemble_checks PASS: 1 parts\\n'"),
    ("orchestrator/end-of-run/ac.log\n')", "orchestrator/end-of-run/ac.log\\n')"),
    ("after its check\n')", "after its check\\n')"),
]
for a, b in pairs:
    n = s.count(a)
    assert n >= 1, a
    s = s.replace(a, b)
open(p, 'w', newline='\n').write(s)
print('fixed')
