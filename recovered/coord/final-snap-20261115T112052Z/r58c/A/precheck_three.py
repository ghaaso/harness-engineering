"""Agent A, round r58c, round 4: the current r58c/A/precheck_handoff.py (check 8 per the coordinator's ruling) on the
three TEST hand-offs as they stand (none rebuilt), each with --expect-sha256; the held-out one with the TEST freeze
record's sha256. All three must pass with 0 problems. For the record, the before bytes (r58c/A/pre/precheck_handoff_r96.py)
are also run on the late-50 one (they failed it on check 8). Runs in a ktest-a<N> container (EMB_ROOT=/w); writes nothing."""
import os, sys, subprocess, hashlib
ROOT = '/w'; A = os.path.join(ROOT, 'r58c', 'A'); HT = os.path.join(ROOT, 'r58c', 'handoff-test')
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
REC = os.path.join(A, 'out', 'ho_rec', 'item27.json')
RUNS = (('tune', 'tune', '171331762595aaf29b2860fa54858108258bef9afe81cec2146f2822019dc1b9', []),
        ('heldout', 'heldout', '3c1d47c5b5515e21fec87b9927c481ba96f2d03c756cb04fe1396f9369dd525d',
         ['--freeze-sha256', '049ba85be1d2cb84ebe99263b1d8c52ddbe76fc6d67e271d85b9adce0815205b']),
        ('tune-late50', 'tune', 'e6b631e5e95d4b9fc32b88bb197d36081b6a47bb7005643e4e739403191bcf69', []))
print('precheck', sha(os.path.join(A, 'precheck_handoff.py')), 'freeze record', sha(REC), flush=True)


def run(script, folder, split, h, extra):
    cmd = [sys.executable, script, '--dir', os.path.join(HT, folder), '--split', split, '--test', '--expect-sha256', h] + extra
    r = subprocess.run(cmd, capture_output=True, text=True, env=dict(os.environ, EMB_ROOT=ROOT), timeout=500)
    last = [l for l in r.stdout.splitlines() if l.startswith('PRECHECK')]
    print('==', os.path.relpath(script, ROOT), folder, 'rc', r.returncode, flush=True)
    print(r.stdout[-2000:], r.stderr[-1000:], flush=True)
    return r.returncode, (last[-1] if last else '')


ok = True
for folder, split, h, extra in RUNS:
    rc, line = run(os.path.join(A, 'precheck_handoff.py'), folder, split, h, extra)
    good = rc == 0 and line.startswith('PRECHECK PASS') and line.endswith('problems 0')
    print('%s %s: rc %d: %s' % ('OK' if good else 'BAD', folder, rc, line), flush=True)
    ok = ok and good
rc, line = run(os.path.join(A, 'pre', 'precheck_handoff_r96.py'), 'tune-late50', 'tune', RUNS[2][2], [])
print('before bytes on tune-late50: rc %d: %s' % (rc, line), flush=True)
ok = ok and rc == 1
print('RESULT %s precheck_three' % ('PASS' if ok else 'FAIL'), flush=True)
sys.exit(0 if ok else 1)
