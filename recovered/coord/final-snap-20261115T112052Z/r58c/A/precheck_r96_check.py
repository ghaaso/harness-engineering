"""Agent A, round r58c: fail-before / pass-after of precheck_handoff.py rule 5 after the ruling on note 18 (a) (a TEST
tuning hand-off may carry all six arms, 40 variants). On the rebuilt r58c/handoff-test/tune: the before bytes
(r58c/A/pre/precheck_handoff_r95.py, e0cc88fa) must FAIL with a rule-5 line, the current bytes must PASS.
Runs in a ktest-a<N> container (EMB_ROOT=/w); writes nothing."""
import os, sys, subprocess
ROOT = '/w'; D = os.path.join(ROOT, 'r58c', 'handoff-test', 'tune')
def run(p):
    r = subprocess.run([sys.executable, p, '--dir', D, '--split', 'tune', '--test'], capture_output=True, text=True, env=dict(os.environ, EMB_ROOT=ROOT), timeout=500)
    print('==', os.path.relpath(p, ROOT), 'rc', r.returncode); print(r.stdout[-2500:], r.stderr[-1500:], flush=True); return r
pre = run(os.path.join(ROOT, 'r58c', 'A', 'pre', 'precheck_handoff_r95.py'))
cur = run(os.path.join(ROOT, 'r58c', 'A', 'precheck_handoff.py'))
ok = (pre.returncode == 1 and '5: a test tuning hand-off carries one arm' in pre.stdout and cur.returncode == 0 and 'PRECHECK PASS' in cur.stdout)
print('RESULT %s precheck_r96_check (before rc %d, rule-5 line %s; after rc %d)' % ('PASS' if ok else 'FAIL', pre.returncode,
      '5: a test tuning hand-off carries one arm' in pre.stdout, cur.returncode), flush=True)
sys.exit(0 if ok else 1)
