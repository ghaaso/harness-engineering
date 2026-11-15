"""Agent A, round r58c (rulings 96(a), 97(e)): r58c/A/rehearsal.py's INJ branch, the in-container half of rehearse.sh's
INJ arm. Each version of rehearsal.py runs with REHEARSAL_ARM=INJ in this process with subprocess.call replaced by a
recorder (nothing is trained, nothing is written).
  reh_inj_current  the current bytes call r58c/A/inject_case.py --out /w/r58c/rehearsal/INJ/case once, cwd train, EMB_ROOT
                   /w, exit with its rc (3 recorded here), and import no item27/selectB/kge and write no test record.
  reh_inj_before   the r96 bytes (r58c/A/pre/rehearsal_r96.py) fail on INJ (plan configs have no INJ arm; KeyError) and
                   never call inject_case (fail before).
Runs in a ktest-a<N> container (EMB_ROOT=/w); reads the synthetic plan only; writes nothing."""
import os, sys, subprocess
sys.path.insert(0, os.path.join('/w', 'train', 'r58', 'tests'))
from hotest import *
show_hashes('r58c/A/rehearsal.py', 'r58c/A/pre/rehearsal_r96.py')
calls = []
real_call = subprocess.call


def fake(cmd, **kw):
    calls.append(dict(cmd=cmd, cwd=kw.get('cwd'), emb=(kw.get('env') or {}).get('EMB_ROOT')))
    return 3


def run(path):
    del calls[:]
    for m in ('item27', 'selectB', 'kge'): sys.modules.pop(m, None)
    os.environ['REHEARSAL_ARM'] = 'INJ'; subprocess.call = fake; saved = list(sys.path)
    rc = err = None
    try: exec(compile(open(path).read(), path, 'exec'), {'__name__': '__main__'})
    except SystemExit as e: rc = e.code
    except Exception as e: err = '%s: %s' % (type(e).__name__, e)
    finally: subprocess.call = real_call; sys.path[:] = saved
    return rc, err, list(calls), sorted(m for m in ('item27', 'selectB', 'kge') if m in sys.modules)


rc, err, cl, mods = run(os.path.join(ROOT, 'r58c', 'A', 'rehearsal.py'))
want = [sys.executable, '/w/r58c/A/inject_case.py', '--out', '/w/r58c/rehearsal/INJ/case']
check('reh_inj_current', rc == 3 and err is None and len(cl) == 1 and cl[0]['cmd'] == want and cl[0]['cwd'] == '/w/train'
      and cl[0]['emb'] == '/w' and not mods and not os.path.exists('/w/r58c/rehearsal/INJ/rec'),
      'rc', rc, 'error', err, 'calls', cl, 'imported', mods)
rc, err, cl, mods = run(os.path.join(ROOT, 'r58c', 'A', 'pre', 'rehearsal_r96.py'))
check('reh_inj_before', rc is None and err is not None and 'INJ' in err and not cl, 'r96 bytes (fail before): rc', rc, 'error', err, 'calls', cl)
ok = finish('rehearsal-inj')
sys.exit(0 if ok else 1)
