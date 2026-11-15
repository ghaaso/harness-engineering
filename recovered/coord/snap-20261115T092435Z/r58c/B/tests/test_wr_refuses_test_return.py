"""Unit test (agent B, round r58c; end-order-changes-2 change 9, commands:F4): a REAL-mode write_result check refuses a
grader return that carries test: true, for all three returns, without copying any test return into LANE/grader-returns/
(END-ORDER 2e's former sentence "a real-mode write_result on the same returns refuses" could not be produced: the real
mode reads only LANE/grader-returns/*.json and takes no path). It reads no real file.
  1. write_result.common(bad, R, split, is_test=False, ...) flags 'test=True, want False' for a tune, an item-24 and a
     held-out return with test: true, and nothing about the flag for test: false; with is_test=True the reverse.
  2. check_tune_rank, check_item24 and check_heldout each pass their is_test to common() (source of the current bytes).
  3. mutant (the test must bite): common() with its test-flag line removed lets a test: true return through in real mode.
usage (in a ktest-b container): python /w/r58c/B/tests/test_wr_refuses_test_return.py
"""
import os, sys, hashlib, inspect, re, types
TRAIN = '/w/train' if os.path.isdir('/w/train') else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'train')
sys.path.insert(0, TRAIN); sys.path.insert(0, os.path.join(os.path.dirname(TRAIN), 'eval'))
import write_result as wr
fails = []; n = 0


def check(name, ok, detail=''):
    global n
    n += 1
    print(('PASS ' if ok else 'FAIL ') + name + ('' if ok else ': ' + str(detail)), flush=True)
    if not ok: fails.append(name)


print('sha256 %s train/write_result.py' % hashlib.sha256(open(wr.__file__, 'rb').read()).hexdigest(), flush=True)
H = 'a' * 64
RET = dict(tune=dict(split='tune', handoff_sha256=H, tasks=313, commits=50), item24=dict(split='tune', handoff_sha256=H, tasks=313, commits=50),
           heldout=dict(split='heldout', handoff_sha256=H, tasks=418, commits=75))
flag = lambda bad: [b for b in bad if b.startswith('test=')]


def run(common):
    out = {}
    for name, R in RET.items():
        for t in (True, False):
            for is_test in (False, True):
                bad = []; common(bad, dict(R, test=t), R['split'], is_test, H, R['tasks'], R['commits']); out[(name, t, is_test)] = flag(bad)
    return out


got = run(wr.common)
for name in RET:
    check('%s return with test: true, real mode: refused (test=True, want False)' % name, got[(name, True, False)] == ['test=True, want False'], got[(name, True, False)])
    check('%s return with test: false, real mode: the flag is not a complaint' % name, got[(name, False, False)] == [], got[(name, False, False)])
    check('%s return with test: false, --test mode: refused' % name, got[(name, False, True)] == ['test=False, want True'], got[(name, False, True)])
for fn in (wr.check_tune_rank, wr.check_item24, wr.check_heldout):
    src = inspect.getsource(fn)
    check('%s passes is_test to common()' % fn.__name__, re.search(r'\bcommon\(bad, [^\n]*\bis_test\b', src) is not None, src[:200])
src = inspect.getsource(wr.common)
mut_src = '\n'.join(l for l in src.split('\n') if "R.get('test')" not in l)
ns = {}; exec(mut_src, wr.__dict__.copy(), ns)
mgot = run(ns['common'])
check('mutant without the flag line lets a test: true tune return through in real mode (the test bites)', mgot[('tune', True, False)] == [], mgot[('tune', True, False)])
print('RESULT %s wr-refuses-test-return (%d checks)' % ('PASS' if not fails else 'FAIL', n), flush=True)
sys.exit(1 if fails else 0)
