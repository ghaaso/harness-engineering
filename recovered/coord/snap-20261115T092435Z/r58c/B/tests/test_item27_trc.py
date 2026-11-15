"""Test of item27.py's tune_rank_check refusal (agent B, round r58c; end-order-changes-2 change 4, rulings:F14).
The real run (no option) must refuse with exit 10, right after the guard and before anything else is read, unless the
LAST coordinator line of unit tune_rank_check in progress.jsonl has a status starting with "accepted".
No real table, plan or record is read: the module's ROOT and HERE are pointed at a scratch folder ($R58_OUT or
/tmp/trc) holding only a fake progress.jsonl, and selectB.r58_guard is replaced by a no-op.
  after bytes (train/item27.py): no line, a line "rejected: ...", a line of another unit, an accepted line followed
    by a rejected one -> exit 10 with the refusal text; an accepted last line -> no exit 10 (it goes on and fails
    later on the empty scratch folder with a FileNotFoundError, which is expected: nothing real exists there).
  before bytes (r58c/B/pre-r94/item27.py): no line -> NOT exit 10 (fail-before).
  round 8, C15 (SR-4, SR-5): the accepted line must name these bytes. Each C15 case's scratch folder holds
    grader-returns/tune-rank.json and train/report/answer_level/handoff/HANDOFF.json; the accepted line passes only with
    sha256 = sha256(tune-rank.json), handoff_sha256 = sha256(HANDOFF.json) = tune-rank.json's handoff_sha256, and after
    the last code_freeze and tune_report lines. Every other case -> exit 10 naming C15; before bytes
    (r58c/B/pre-r101/item27.py): a stale accepted line (before code_freeze, about another return) is NOT refused.
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


def fixture(d, tr_handoff=None, no_tr=False):
    """C15 files in the scratch folder: (sha256 of tune-rank.json or None, sha256 of HANDOFF.json)."""
    hd = os.path.join(d, 'train', 'report', 'answer_level', 'handoff'); os.makedirs(hd, exist_ok=True)
    hb = b'{"split": "tune", "files": {}}\n'; open(os.path.join(hd, 'HANDOFF.json'), 'wb').write(hb); hh = hashlib.sha256(hb).hexdigest()
    os.makedirs(os.path.join(d, 'grader-returns'), exist_ok=True); tp = os.path.join(d, 'grader-returns', 'tune-rank.json')
    if no_tr:
        if os.path.exists(tp): os.remove(tp)
        return None, hh
    tb = json.dumps({'split': 'tune', 'test': False, 'handoff_sha256': tr_handoff or hh, 'rank': {}}).encode(); open(tp, 'wb').write(tb)
    return hashlib.sha256(tb).hexdigest(), hh


def run(path, tag, lines, fx=None):
    d = os.path.join(OUT, tag); os.makedirs(d, exist_ok=True)
    if fx is not None: lines = fx(d)
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
def T(sha, hh): return dict(C('tune_rank_check', 'accepted: all 1e-9'), file='LANE/grader-returns/tune-rank.json', sha256=sha, handoff_sha256=hh)
CF, TR = C('code_freeze', 'x'), C('tune_report', 'x')
def good(d):
    sha, hh = fixture(d); return [CF, TR, C('tune_rank_check', 'rejected: first'), T(sha, hh)]
code, out = run(AFTER, 'after_accepted', None, good)
check('after, an accepted last line: not refused with exit 10', code != 10 and 'exit 10' not in out, 'code %r out %r' % (code, out[-200:]))
def bad_cases():
    def before_freeze(d): sha, hh = fixture(d); return [T(sha, hh), CF, TR]
    def before_report(d): sha, hh = fixture(d); return [CF, T(sha, hh), TR]
    def no_freeze(d): sha, hh = fixture(d); return [TR, T(sha, hh)]
    def no_report(d): sha, hh = fixture(d); return [CF, T(sha, hh)]
    def wrong_sha(d): sha, hh = fixture(d); return [CF, TR, T('0' * 64, hh)]
    def no_sha(d): sha, hh = fixture(d); l = T(sha, hh); del l['sha256']; return [CF, TR, l]
    def wrong_handoff(d): sha, hh = fixture(d); return [CF, TR, T(sha, '1' * 64)]
    def no_handoff_field(d): sha, hh = fixture(d); l = T(sha, hh); del l['handoff_sha256']; return [CF, TR, l]
    def return_other_handoff(d): sha, hh = fixture(d, tr_handoff='2' * 64); return [CF, TR, T(sha, hh)]
    def no_return(d): sha, hh = fixture(d, no_tr=True); return [CF, TR, T('3' * 64, hh)]
    return [before_freeze, before_report, no_freeze, no_report, wrong_sha, no_sha, wrong_handoff, no_handoff_field, return_other_handoff, no_return]
for fx in bad_cases():
    code, out = run(AFTER, 'after_c15_' + fx.__name__, None, fx)
    check('C15 after, %s: exit 10 naming C15' % fx.__name__, code == 10 and 'refusing (exit 10)' in out and ('C15' in out or 'missing' in out), 'code %r out %r' % (code, out[-240:]))
BEFORE101 = os.path.join(os.path.dirname(TRAIN), 'r58c', 'B', 'pre-r101', 'item27.py')
print('sha256 %s %s' % (hashlib.sha256(open(BEFORE101, 'rb').read()).hexdigest(), BEFORE101), flush=True)
for fx in bad_cases()[:1] + bad_cases()[4:5]:
    code, out = run(BEFORE101, 'before101_' + fx.__name__, None, fx)
    check('C15 before (fail-before), %s: pre-r101 does NOT refuse with exit 10' % fx.__name__, code != 10, 'code %r' % (code,))
code, out = run(BEFORE, 'before_none', [])
check('before (fail-before): no line is NOT refused with exit 10', code != 10, 'code %r' % (code,))
print('RESULT %s item27-tune-rank-check (%d checks)' % ('PASS' if not fails else 'FAIL', n), flush=True)
sys.exit(1 if fails else 0)
