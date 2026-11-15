"""Unit checks of the command lines agent B changed in round r58c (MF-6, ruling 84 and the coordinator's message 2):
selectB.py (--test given arms or an unknown arm/option is refused, exit 2), report.py (any argument but --test is
refused, exit 2) and item22.py (an unknown option, a test that would write the real record, and a real call under
another EMB_ROOT are refused, exit 2). Fail-before: the same command lines through agent B's before bytes
(r58c/B/pre/), whose __main__ blocks are executed with run/main replaced by a recorder, so nothing real is read or
written (MF-8): the before bytes accept every one of them.
usage (ktest-b container): R58_OUT=/w/r58c/B/out/test_b_units python /w/r58c/B/tests/test_b_units.py"""
import os, sys
sys.path.insert(0, '/w/train/r58/tests')
from r58common import *
import selectB, report, item22
PRE = os.path.join(ROOT, 'r58c', 'B', 'pre')
show_hashes('train/selectB.py', 'train/report.py', 'train/item22.py', 'r58c/B/pre/selectB.py', 'r58c/B/pre/report.py', 'r58c/B/pre/item22.py',
            'r58c/B/tests/test_b_units.py')
D = fresh(os.path.join(OUTR, 'b_units'))


def main_block(mod, path, argv, **stubs):
    """Execute the `if __name__ == '__main__':` block of the file at path in mod's namespace with stubs; -> (exit, calls)."""
    src = open(path, encoding='utf-8').read(); blk = src[src.index("if __name__ == '__main__':"):]
    calls = []
    ns = dict(vars(mod)); ns['__name__'] = '__main__'
    for k, v in stubs.items():
        ns[k] = (lambda name: (lambda *a, **kw: calls.append((name, a, kw))))(k)
    old = sys.argv; sys.argv = ['x'] + list(argv)
    try:
        rc = exits(exec, compile(blk, path, 'exec'), ns)
    finally:
        sys.argv = old
    return rc, calls


# ---- selectB.py
SB_CASES = dict(test_with_arm=['--test', 'E1'], test_with_option=['--test', '--bogus'], unknown_arm=['E9'], unknown_option=['--bogus'])
new = {k: exits(selectB.parse_args, v) for k, v in SB_CASES.items()}
check('selectB_refusals', new == {k: 2 for k in SB_CASES}, new)
check('selectB_accepts', selectB.parse_args(['--test']) == (['PLACEBO'], True) and selectB.parse_args(['E2', 'E4']) == (['E2', 'E4'], False)
      and selectB.parse_args([])[0] == list(selectB.ARMS), 'the accepted forms')
rcm, calls = main_block(selectB, os.path.join(TRAIN, 'selectB.py'), ['--test', 'E1'], run=1)
check('selectB_main_refuses_before_run', rcm == 2 and not calls, 'exit', rcm, 'run called', len(calls))
PREB = load_module('selectB_preB_units', os.path.join(PRE, 'selectB.py'))
pre = {}
for k, v in SB_CASES.items():
    rc, c = main_block(PREB, os.path.join(PRE, 'selectB.py'), v, run=1); pre[k] = (rc, [x[1][0] for x in c])
check('selectB_fail_before', all(rc == 0 and len(arms) >= 1 for rc, arms in pre.values()),
      'fail before: the old selectB.py ran every refused command line:', pre)
# ---- report.py
rcr, cr = main_block(report, os.path.join(TRAIN, 'report.py'), ['--bogus'], main=1)
rct, ct = main_block(report, os.path.join(TRAIN, 'report.py'), ['--test'], main=1)
check('report_refuses_other_arguments', rcr == 2 and not cr and rct == 0 and ct == [('main', (), dict(test=True))], 'exit', rcr, cr, '| --test:', rct, ct)
PRER = load_module('report_preB_units', os.path.join(PRE, 'report.py'))
rcp, cp = main_block(PRER, os.path.join(PRE, 'report.py'), ['--bogus'], main=1)
check('report_fail_before', rcp == 0 and len(cp) == 1, 'fail before: the old report.py ran with --bogus: exit', rcp, cp)
# ---- item22.py
os.environ['EMB_ROOT'] = '/tmp/not-the-lane'
n22 = dict(other_root=exits(item22.parse, []))
os.environ['EMB_ROOT'] = '/w'
n22.update(bogus=exits(item22.parse, ['--bogus', 'x']), incomplete=exits(item22.parse, ['--out']),
           real_out=exits(item22.parse, ['--out', item22.REAL_OUT]), real_out_no_check=exits(item22.parse, ['--no-check']))
check('item22_refusals', n22 == dict(other_root=2, bogus=2, incomplete=2, real_out=2, real_out_no_check=2), n22)
a = item22.parse([]); b = item22.parse(['--out', os.path.join(D, 'x.json'), '--no-check'])
check('item22_accepts', a['test'] is False and a['out'] == item22.REAL_OUT and b['test'] is True and b['check'] is False, 'real and test forms')
PRE22 = load_module('item22_preB_units', os.path.join(PRE, 'item22.py'))
E5 = ('E1', 'E2', 'E3', 'E4', 'E5')
PRE22.stage_a_section = lambda arms: dict(arms={x: [] for x in arms})
PRE22.stage_b_section = lambda arms, parts: {x: {} for x in arms}
PRE22.check_section = lambda arms, e4=None: {}
PRE22.HERE = fresh(os.path.join(D, 'pre22'))  # its default out is HERE/report/item22.json: here a temp folder
os.environ['EMB_ROOT'] = '/tmp/not-the-lane'
p22 = dict(other_root=exits(PRE22.main, []))
os.environ['EMB_ROOT'] = '/w'
p22['bogus'] = exits(PRE22.main, ['--out', os.path.join(D, 'pre22', 'b.json'), '--bogus', 'x', '--no-check'])
check('item22_fail_before', p22 == dict(other_root=0, bogus=0) and os.path.exists(os.path.join(D, 'pre22', 'report', 'item22.json'))
      and os.path.exists(os.path.join(D, 'pre22', 'b.json')), 'fail before: the old item22.py accepted both and wrote:', p22)
ok = finish('b-units')
sys.exit(0 if ok else 1)
