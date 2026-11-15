"""Review finding selection-freeze-6: report.verdict rounds the difference and both interval bounds to 12 decimals
before the item-26 thresholds. Boundary cases on the current report.py (pass after) and the same float inputs on the
stage-1 report.py (r58b/pre/report.py; fail before: one ulp decides the word). No table is read."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from r58common import *
import report
show_hashes('train/report.py', 'r58b/pre/report.py')
PRE = load_module('report_pre', os.path.join(ROOT, 'r58b', 'pre', 'report.py'))
ULP_LOW = 0.019999999999999997    # 0.02 one ulp low (e.g. a mean of 0.1/3 steps)
ULP_HIGH = 0.020000000000000004   # 0.02 one ulp high
cases = [  # (name, diff, lo, hi, the word)
    ('diff exactly +0.02, lo > 0', 0.02, 0.001, 0.05, 'adds'),
    ('diff +0.02 one ulp low, lo > 0', ULP_LOW, 0.001, 0.05, 'adds'),
    ('lo exactly 0', 0.03, 0.0, 0.05, 'cannot tell'),
    ('lo 1e-13 above 0 (0 at 12 decimals)', 0.03, 1e-13, 0.05, 'cannot tell'),
    ('lo -0.02 and hi exactly +0.02', 0.0, -0.02, 0.02, 'matches'),
    ('hi +0.02 one ulp high', 0.0, -0.02, ULP_HIGH, 'matches'),
    ('lo -0.02 one ulp low', 0.0, -ULP_HIGH, 0.01, 'matches'),
    ('diff exactly 0, interval inside +-0.02', 0.0, -0.01, 0.01, 'matches'),
    ('wholly below 0 but inside +-0.02', -0.01, -0.015, -0.005, 'matches'),
    ('hi < 0 outside the band', -0.05, -0.08, -0.03, 'cannot tell (lower)'),
    ('hi exactly 0, lo below -0.02', -0.03, -0.05, 0.0, 'cannot tell'),
    ('wide interval', 0.01, -0.03, 0.05, 'cannot tell'),
]
for name, d, lo, hi, want in cases:
    got = report.verdict(d, lo, hi)
    check('verdict: ' + name, got == want, 'got', repr(got), 'want', repr(want), '(stage-1 code: %r)' % PRE.verdict(d, lo, hi))
pre_wrong = [n for n, d, lo, hi, w in cases if PRE.verdict(d, lo, hi) != w]
check('sf6_pre_wrong_at_an_ulp', set(pre_wrong) == {'diff +0.02 one ulp low, lo > 0', 'lo 1e-13 above 0 (0 at 12 decimals)', 'hi +0.02 one ulp high',
                                                    'lo -0.02 one ulp low'}, 'fail before: the stage-1 verdict() gave the wrong word for', pre_wrong)
ok = finish('verdict')
sys.exit(0 if ok else 1)
