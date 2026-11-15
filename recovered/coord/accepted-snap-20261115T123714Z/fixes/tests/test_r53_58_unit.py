"""Unit test, rulings 53 and 58 (selectB.py; report.py imports the same guard). Fixed numbers and temporary files
only; no task, score or truth is read. CODE=pre|post. Outputs under OUT (default /w/fixes/tests/out/<CODE>/r53_58).
  r53-se     the band uses the BEST candidate's standard error: a smaller model whose own SE is wide but whose mean
             is below best - SE(best) is outside the band (best c02 d200 mean 0.60 SE 0; c01 d100 mean 0.59) -> c02.
  r53-w      same configuration, same mean, two w -> the smaller w (the last tie-break).
  r53-size   a larger w of the smaller model with the higher mean beats its smaller w (w is not simplicity) and a
             larger model with the best mean (test_select_report's case, repeated here on its own).
  r58-guard  selectB.r58_guard(runlog, root): passes with four matching sha256 lines; exits 3 when one hash is wrong,
             when a listed file is missing, and when a role has no line.
Prints one line per check and RESULT PASS|FAIL."""
import os, sys, json, shutil, hashlib
ROOT = os.environ.get('EMB_ROOT', '/w')
sys.path[:0] = [os.path.join(ROOT, 'train'), os.path.join(ROOT, 'eval')]
import selectB

CODE = os.environ.get('CODE', 'post')
OUT = os.path.join(os.environ.get('OUT', os.path.join(ROOT, 'fixes', 'tests', 'out', CODE)), 'r53_58')
if os.path.exists(OUT): shutil.rmtree(OUT)
os.makedirs(OUT)
ok = {}
pick = lambda rows: (lambda p: (p['key'][0], p['w']))(selectB.choose(rows)[0])
r = [(('c02', 0.5), {'embedding_dim': 200}, 0.5, [0.60, 0.60]), (('c01', 0.5), {'embedding_dim': 100}, 0.5, [0.20, 0.98])]
ok['r53_se'] = pick(r) == ('c02', 0.5)
print('r53-se chosen', pick(r), 'want (c02, 0.5)', 'ok' if ok['r53_se'] else 'VIOLATED', flush=True)
r = [(('c01', 1.0), {'embedding_dim': 100}, 1.0, [0.5, 0.5]), (('c01', 0.5), {'embedding_dim': 100}, 0.5, [0.5, 0.5])]
ok['r53_w'] = pick(r) == ('c01', 0.5)
print('r53-w chosen', pick(r), 'want (c01, 0.5)', 'ok' if ok['r53_w'] else 'VIOLATED', flush=True)
r = [(('c02', 0.25), {'embedding_dim': 200}, 0.25, [0.51, 0.55]), (('c01', 0.25), {'embedding_dim': 100}, 0.25, [0.52, 0.52]),
     (('c01', 1.0), {'embedding_dim': 100}, 1.0, [0.525, 0.525])]
ok['r53_size'] = pick(r) == ('c01', 1.0)
print('r53-size chosen', pick(r), 'want (c01, 1.0)', 'ok' if ok['r53_size'] else 'VIOLATED', flush=True)

if not hasattr(selectB, 'r58_guard'):
    ok['r58_guard'] = False
    print('r58-guard absent: selectB has no r58_guard VIOLATED', flush=True)
else:
    roles = getattr(selectB, 'R58_ROLES')
    for i, role in enumerate(roles):
        open(os.path.join(OUT, 'f%d.py' % i), 'w').write('# %s\n' % role)
    h = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()

    def runlog(lines):
        p = os.path.join(OUT, 'RUNLOG.md'); open(p, 'w').write('\n'.join(lines) + '\n'); return p

    rel = os.path.relpath(OUT, ROOT).replace(os.sep, '/')
    good = ['sha256 %s %s %s/f%d.py' % (h(os.path.join(OUT, 'f%d.py' % i)), role, rel, i) for i, role in enumerate(roles)]

    def outcome(lines):
        try:
            selectB.r58_guard(runlog=runlog(lines), root=ROOT); return 'pass'
        except SystemExit as e:
            return 'exit %s' % e.code
    res = dict(good=outcome(good),
               wrong_hash=outcome([good[0].replace(good[0].split()[1], '0' * 64)] + good[1:]),
               missing_file=outcome(good[:1] + [good[1].replace('f1.py', 'nope.py')] + good[2:]),
               role_missing=outcome(good[:-1]))
    ok['r58_guard'] = res == dict(good='pass', wrong_hash='exit 3', missing_file='exit 3', role_missing='exit 3')
    print('r58-guard', json.dumps(res), 'ok' if ok['r58_guard'] else 'VIOLATED', flush=True)
print('RESULT', 'PASS' if all(ok.values()) else 'FAIL', 'test_r53_58_unit', json.dumps(ok), flush=True)
