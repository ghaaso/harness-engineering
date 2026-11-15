"""C8 (round 8): a DRY run of the ruling-58/83 guard (train/selectB.py r58_guard) inside a container that has EXACTLY a
real step's mount list (r58c/B/ktest.sh with KT_AS=ktest-r1, every row read-only). It shows that every role file and
PASS log the RUNLOG names can be opened at /w inside that step. Dry: selectB.ac_problems is replaced by a stub (the
assemble-checks log is end_of_run's; nothing here reads a table), and nothing is written (no writable mount).
The RUNLOG is DG_RUNLOG (default /w/train/RUNLOG.md); it must lie under one of the step's mounts.
Exit: the guard's (0 pass; 3 refused, with its reasons printed). Passed by ktest.sh as python -c (the file is read on
the host; the container has no mount of r58c/B/tests)."""
import os, sys, hashlib
sys.path.insert(0, '/w/train'); sys.path.insert(0, '/w/eval')
import selectB
rl = os.environ.get('DG_RUNLOG') or '/w/train/RUNLOG.md'
print('dry r58_guard: selectB.py sha256 %s; runlog %s (sha256 %s); root /w; ac_problems stubbed' % (
    hashlib.sha256(open('/w/train/selectB.py', 'rb').read()).hexdigest(), rl,
    hashlib.sha256(open(rl, 'rb').read()).hexdigest() if os.path.exists(rl) else 'missing'), flush=True)
selectB.ac_problems = lambda *a, **k: []
try:
    selectB.r58_guard(runlog=rl, root='/w')
except SystemExit as e:
    print('RESULT FAIL dry-guard (exit %s)' % e.code, flush=True); sys.exit(e.code if isinstance(e.code, int) else 1)
print('RESULT PASS dry-guard', flush=True)
