"""Test of item27.py's tune_rank_check refusal (agent B, round r58c; end-order-changes-2 change 4, rulings:F14).
The real run (no option) must refuse with exit 10, right after the guard and before anything else is read, unless the
LAST coordinator line of unit tune_rank_check in progress.jsonl has a status starting with "accepted".
No real table, plan or record is read: the module's ROOT and HERE are pointed at a scratch folder ($R58_OUT or
/tmp/trc) holding only a fake progress.jsonl, and selectB.r58_guard is replaced by a no-op.
  after bytes (train/item27.py): no line, a line "rejected: ...", a line of another unit, an accepted line followed
    by a rejected one -> exit 10 with the refusal text; an accepted last line -> no exit 10 (it goes on and fails
    later on the empty scratch folder with a FileNotFoundError, which is expected: nothing real exists there).
  before bytes (r58c/B/pre-r94/item27.py): no line -> NOT exit 10 (fail-before).
usage (in a ktest-b container): python /w/r58c/B/tests/test_item27_trc.py
"""
import os, sys, json, io, contextlib, importlib.util, hashlib
TRAIN = '/w/train' if os.path.isdir('/w/train') else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'train')
sys.path.insert(0, TRAIN); sys.path.insert(0, os.path.join(os.path.dirname(TRAIN), 'eval'))
OUT = os.environ.get('R58_OUT') or '/tmp/trc'
AFTER = os.path.join(TRAIN, 'item27.py')
BEFORE = os.path.join(os.path.dirname(TRAIN), 'r58c', 'B', 'pre-r94', 'item27.py')
fails = []; n = 0


def check(name, ok, detail=''):
    global n
    n += 1
    print(('PASS ' if ok else 'FAIL ') + name + ('' if ok else ': ' + detail), flush=True)
    if not ok: fails.append(name)


def load(path, tag):
    spec = importlib.util.spec_from_file_location('item27_' + tag, path)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m


def run(path, tag, lines):
    d = os.path.join(OUT, tag); os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, 'progress.jsonl'), 'w') as f:
        for l in lines: f.write(json.dumps(l) + '\n')
    m = load(path, tag)
    m.ROOT = d; m.HERE = os.path.join(d, 'train')  # every real path of main() now lies in the scratch folder
    m.selectB.r58_guard = lambda *a, **k: None
    buf = io.StringIO(); code = None
    try:
        with contextlib.redirect_stdout(buf): m.main([])
        code = 0
    except SystemExit as e:
        code = e.code
    except Exception as e:  # the accepted case goes on and meets the empty scratch folder
        code = type(e).__name__
    return code, buf.getvalue()


for p in (AFTER, BEFORE): print('sha256 %s %s' % (hashlib.sha256(open(p, 'rb').read()).hexdigest(), p), flush=True)
C = lambda unit, status: {'step': 'coordinator', 'unit': unit, 'status': status, 't': '2026-11-15T00:00:00Z'}
cases = [('none', []), ('rejected', [C('tune_rank_check', 'rejected: differs by 2e-9')]),
         ('other_unit', [C('tune_report', 'accepted: x')]),
         ('accepted_then_rejected', [C('tune_rank_check', 'accepted: all agree'), C('tune_rank_check', 'rejected: rerun')])]
for tag, lines in cases:
    code, out = run(AFTER, 'after_' + tag, lines)
    check('after, %s: exit 10 with the refusal text' % tag, code == 10 and 'refusing (exit 10)' in out, 'code %r out %r' % (code, out[-200:]))
code, out = run(AFTER, 'after_accepted', [C('tune_rank_check', 'rejected: first'), C('tune_rank_check', 'accepted: all 1e-9')])
check('after, an accepted last line: not refused with exit 10', code != 10 and 'exit 10' not in out, 'code %r out %r' % (code, out[-200:]))
code, out = run(BEFORE, 'before_none', [])
check('before (fail-before): no line is NOT refused with exit 10', code != 10, 'code %r' % (code,))
print('RESULT %s item27-tune-rank-check (%d checks)' % ('PASS' if not fails else 'FAIL', n), flush=True)
sys.exit(1 if fails else 0)
