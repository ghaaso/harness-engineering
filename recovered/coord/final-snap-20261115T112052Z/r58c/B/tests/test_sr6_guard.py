"""Test of SR-6 (round 8): selectB.r58_guard reads a role's sha256 line only at the start of a RUNLOG line.
Before: re.search took the LAST line holding `sha256 <hex> <role> <path>` anywhere, so a later RUNLOG note quoting such a
triple (for an old version, or another path) overrode the real line and the guard refused (exit 3).
The test builds a scratch lane (R58_OUT or /tmp/sr6): the six role files, a log per role holding `sha256 <hex>` and
`RESULT PASS <role>`, a RUNLOG with the real sha256 lines and PASS lines, and then a later note that quotes the item27
triple with another hash inside running text. selectB.ac_problems is stubbed (no table is read; nothing real is opened).
  after bytes (train/selectB.py): the guard passes (no SystemExit), the note is not a sha256 line; a real line-start
    sha256 line that names the wrong hash still refuses (exit 3, item27 named), so the anchoring weakens nothing.
  before bytes (r58c/B/pre-r101/selectB.py): the same RUNLOG refuses (exit 3) naming item27 (fail-before).
usage (in a ktest-b container): python /w/r58c/B/tests/test_sr6_guard.py
"""
import os, sys, io, hashlib, importlib.util, contextlib, shutil
TRAIN = '/w/train' if os.path.isdir('/w/train') else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'train')
sys.path.insert(0, TRAIN); sys.path.insert(0, os.path.join(os.path.dirname(TRAIN), 'eval'))
OUT = os.environ.get('R58_OUT') or '/tmp/sr6'
AFTER = os.path.join(TRAIN, 'selectB.py')
BEFORE = os.path.join(os.path.dirname(TRAIN), 'r58c', 'B', 'pre-r101', 'selectB.py')
fails = []; n = 0


def check(name, ok, detail=''):
    global n
    n += 1
    print(('PASS ' if ok else 'FAIL ') + name + ('' if ok else ': ' + str(detail)), flush=True)
    if not ok: fails.append(name)


def load(path, tag):
    spec = importlib.util.spec_from_file_location('selectB_' + tag, path)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m


def lane(tag, note_lines, wrong_item27=False):
    d = os.path.join(OUT, tag); shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
    m = load(AFTER, 'roles_' + tag)
    L = []
    for role in m.R58_ROLES:
        rel = m.ROLE_FILES[role]; p = os.path.join(d, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, 'w').write('# role file of %s\n' % role)
        h = hashlib.sha256(open(p, 'rb').read()).hexdigest()
        lg = 'logs/%s.log' % role; os.makedirs(os.path.join(d, 'logs'), exist_ok=True)
        open(os.path.join(d, lg), 'w').write('sha256 %s %s\nRESULT PASS %s\n' % (h, rel, role))
        L.append('sha256 %s %s %s' % ('0' * 64 if (wrong_item27 and role == 'item27') else h, role, rel))
    L += ['PASS %s logs/%s.log' % (r, r) for r in m.R58_ROLES]
    L.append('PASS assemble-checks logs/ac.log tables_digest ' + 'a' * 64)
    L += note_lines
    open(os.path.join(d, 'RUNLOG.md'), 'w').write('\n'.join(L) + '\n')
    return d


def guard(path, tag, d):
    m = load(path, tag); m.ac_problems = lambda *a, **k: []
    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf): m.r58_guard(runlog=os.path.join(d, 'RUNLOG.md'), root=d)
        return 0, buf.getvalue()
    except SystemExit as e:
        return e.code, buf.getvalue()


for p in (AFTER, BEFORE): print('sha256 %s %s' % (hashlib.sha256(open(p, 'rb').read()).hexdigest(), p), flush=True)
NOTE = ['- note (round 8): the earlier bytes were sha256 %s item27 train/item27.py, replaced since.' % ('b' * 64)]
d = lane('note', NOTE)
code, out = guard(AFTER, 'after_note', d)
check('after: a later RUNLOG note quoting a sha256 triple does not override the line-start sha256 line (guard passes)', code == 0, (code, out[-300:]))
d2 = lane('wrong', [], wrong_item27=True)
code, out = guard(AFTER, 'after_wrong', d2)
check('after: a line-start sha256 line with the wrong hash still refuses (exit 3, item27 named)', code == 3 and 'item27: train/item27.py does not hash' in out, (code, out[-300:]))
d3 = lane('indented', ['  sha256 %s item27 train/item27.py' % ('c' * 64)])
code, out = guard(AFTER, 'after_indented', d3)
check('after: a later indented sha256 line (whitespace only before it) still counts as a sha256 line (exit 3)', code == 3 and 'item27' in out, (code, out[-300:]))
code, out = guard(BEFORE, 'before_note', d)
check('before (fail-before): pre-r101 takes the quoted triple and refuses (exit 3, item27 named)', code == 3 and 'item27' in out, (code, out[-300:]))
print('RESULT %s sr6-guard (%d checks)' % ('PASS' if not fails else 'FAIL', n), flush=True)
sys.exit(1 if fails else 0)
