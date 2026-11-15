"""Agent A, round 9 (the coordinator's item 6: C13 / ruling 101(c)). The ruling-79 probe also trains units IN A ROW in ONE
process (probe-seq), as the held-out run trains its 210 units, for the setting with the highest RAM peak and, when that
setting is not E4, for E4's highest too; each unit on its own synthetic graph of the largest held-out graph's size.
  r101c_units_in_a_row  a test-mode probe (synthetic plan r58b/out/fakeB, --arms E1,E4, one setting each, --scale 25,
        1 epoch, 4 full-path tasks, --seq-units 3): probe.json units_in_a_row has the top-RAM setting first, an E4 entry,
        each rc 0 with 3 units (unit 1..3, each its own synthetic-seq<k> graph, scored tasks > 0, ru_maxrss, the current
        RSS and the container's memory.peak after each unit), the process peak = the highest unit peak; no seq graph is left
        in the probe's g0; fail before: the round-9-start bytes (r58c/A/pre-r101/heldout.py) refuse --seq-units and, without
        it, write no units_in_a_row.
  r101c_flagged  with --flag-mb 1 every units_in_a_row entry is among over_3_5gb (the same flag rule as the settings),
        exit 4 (report to the coordinator, ruling 86a).
Runs in a ktest-a<N> container (EMB_ROOT=/w); reads the tuning graphs and the held-out graphs' sizes.json only (ruling 79),
prints counts only; writes r58c/A/out/probe_seq_r101 (removed at the end).
usage (ktest item): script:r58c/A/test_probe_seq_r101.py"""
import os, sys, json, shutil, subprocess
sys.path.insert(0, os.path.join('/w', 'train', 'r58', 'tests'))
from hotest import *
os.environ.update(KGE_DEVICE='cpu', KGE_IMAGE_ID=IMG)
show_hashes('train/heldout.py', 'r58c/A/pre-r101/heldout.py', 'train/kge.py', 'r58c/A/test_probe_seq_r101.py')
H = fresh(os.path.join(OUTR, 'probe_seq_r101'))
PRE = os.path.join(H, 'prebin'); os.makedirs(PRE); shutil.copy(os.path.join(ROOT, 'r58c', 'A', 'pre-r101', 'heldout.py'), os.path.join(PRE, 'heldout.py'))
BASE = ['probe', '--test', '--plan', FPLAN, '--arms', 'E1,E4', '--configs-per-arm', '1', '--scale', '25', '--test-epochs', '1', '--full-tasks', '4']


def run(script, out, extra):
    p = subprocess.run([sys.executable, script] + BASE + ['--out', out] + extra, cwd=TRAIN, capture_output=True, text=True,
                       env=dict(env0, PYTHONPATH=TRAIN), timeout=500)
    pj = os.path.join(out, 'probe.json')
    print('--- %s %s exit %d' % (os.path.relpath(script, ROOT), ' '.join(extra), p.returncode), flush=True)
    for l in p.stdout.splitlines():
        if 'units in a row' in l: print('   ', l[:400], flush=True)
    return p, (json.load(open(pj)) if os.path.exists(pj) else {})


NEW = os.path.join(TRAIN, 'heldout.py')
p, r = run(NEW, os.path.join(H, 'new'), ['--seq-units', '3'])
seq = r.get('units_in_a_row') or []
ram = lambda x: max(x.get('peak_rss_mb') or 0, x.get('cgroup_peak_mb_after') or 0)
ok_rows = [x for x in r.get('settings') or [] if x.get('rc') == 0]
top = max(ok_rows, key=ram) if ok_rows else {}
left = sorted(f for f in os.listdir(os.path.join(H, 'new', 'g0')) if f.startswith('synthetic-seq')) if os.path.isdir(os.path.join(H, 'new', 'g0')) else []  # the probe removes its g0 at the end
good = lambda e: (e.get('rc') == 0 and e.get('units_in_a_row') == 3 and [u.get('unit') for u in e.get('units') or []] == [1, 2, 3]
                  and len({u.get('sha') for u in e['units']}) == 3 and all(u.get('scored_tasks', 0) > 0 and u.get('peak_rss_mb') and u.get('rss_now_mb')
                                                                           and 'cgroup_peak_mb' in u for u in e['units'])
                  and abs((e.get('peak_rss_mb') or 0) - max(u['peak_rss_mb'] for u in e['units'])) < 1.0)
q, rp = run(os.path.join(PRE, 'heldout.py'), os.path.join(H, 'pre'), ['--seq-units', '3'])
q2, rp2 = run(os.path.join(PRE, 'heldout.py'), os.path.join(H, 'pre2'), [])
check('r101c_units_in_a_row', p.returncode == 0 and seq and seq[0].get('arm') == top.get('arm') and seq[0].get('config_id') == top.get('config_id')
      and any(e.get('arm') == 'E4' for e in seq) and all(good(e) for e in seq) and not left
      and q.returncode != 0 and q2.returncode == 0 and 'units_in_a_row' not in rp2,
      'current: exit', p.returncode, 'entries', [(e.get('arm'), e.get('config_id'), e.get('rc'), e.get('peak_rss_mb'),
                                                  [(u.get('unit'), u.get('peak_rss_mb'), u.get('rss_now_mb'), u.get('scored_tasks')) for u in e.get('units') or []]) for e in seq],
      'top setting', top.get('arm'), top.get('config_id'), ram(top), 'seq graphs left', left,
      '; round-9-start bytes (fail before): --seq-units exit', q.returncode, 'without it exit', q2.returncode, 'units_in_a_row present', 'units_in_a_row' in rp2)
p3, r3 = run(NEW, os.path.join(H, 'flag'), ['--seq-units', '2', '--flag-mb', '1'])
s3 = r3.get('units_in_a_row') or []
over = {(x['arm'], x['config_id'], x['what']) for x in r3.get('over_3_5gb') or []}
check('r101c_flagged', p3.returncode == 4 and s3 and all((e['arm'], e['config_id'], e['what']) in over for e in s3) and all(e.get('units_in_a_row') == 2 for e in s3),
      'exit', p3.returncode, 'entries', [(e.get('arm'), e.get('what')) for e in s3], 'flagged', len(over))
shutil.rmtree(H, ignore_errors=True)
ok = finish('probe-seq-r101')
sys.exit(0 if ok else 1)
