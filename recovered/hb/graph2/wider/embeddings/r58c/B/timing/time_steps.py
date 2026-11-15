"""Agent B, round r58c, end-order-changes-2 change 5: wall time of the end order's table-reading steps on the
FULL-SIZE synthetic copy r58c/B/out/timing/asm (r58c/B/timing/make_full_copy.js: the frozen real plan, 2,385 parts,
every candidate of every tune task scored). Never reads train/stageB, train/selectB, train/report or train/heldout.
Each mode runs the copy's OWN bytes of the real code (train/*.py copied unchanged) through its real entry function:
  assemble  stageB.assemble(arm, plan) for every arm (what end_of_run.sh's `python stageB.py assemble` does), then
            `python orchestrator/assemble_checks.py --train --plan --report` as a subprocess (end_of_run's second call)
  selectB   selectB.run(ARMS, <copy>/train/selectB) (step 4, ktest-r1), once per arm so a partial run still times
            each arm (every call recomputes the tables digest: the sum is an upper bound of one call over all arms)
  report    report.main(test=False) (step 4, ktest-r2) on the selectB output of the mode above
What differs from the real run, and only this: r58_guard() is replaced by a no-op (the copy's RUNLOG has no PASS
lines; the guard reads RUNLOG.md and hashes seven files: seconds at most); for report.py, ROOT is set to /w after the
import (and evalcore's GRAPHS to /w/export/graphs) so the graphs it reads are the real tune graphs, read-only, as the real run's.
usage (in a ktest-b container): python /w/r58c/B/timing/time_steps.py assemble|selectB|report
Writes r58c/B/out/timing/timing-<mode>.json and prints TIMING lines and RESULT PASS|FAIL timing-<mode>.
"""
import json, os, subprocess, sys, time
COPY = '/w/r58c/B/out/timing/asm'
mode = sys.argv[1] if len(sys.argv) == 2 else None
if mode not in ('assemble', 'selectB', 'report'): print('usage: time_steps.py assemble|selectB|report'); sys.exit(2)
os.environ['EMB_ROOT'] = COPY  # before any import of the copy's modules (ROOT is read at import)
sys.path.insert(0, os.path.join(COPY, 'train')); os.chdir(os.path.join(COPY, 'train'))
res = dict(mode=mode, copy=COPY, steps={}, ok=False)
T0 = time.time()


def tick(name, t):
    dt = round(time.time() - t, 2); res['steps'][name] = dt; print('TIMING %s %.2f s' % (name, dt), flush=True); return dt


try:
    if mode == 'assemble':
        import stageB, kge
        plan = json.load(open(stageB.PLAN))
        assert stageB.PARTS.startswith(COPY) and stageB.TABLES.startswith(COPY), (stageB.PARTS, stageB.TABLES)
        for a in kge.ARMS:
            t = time.time(); stageB.assemble(a, plan); tick('assemble %s' % a, t)
        tick('assemble all arms', T0)
        t = time.time()
        p = subprocess.run([sys.executable, os.path.join(COPY, 'orchestrator', 'assemble_checks.py'), '--train', os.path.join(COPY, 'train'),
                            '--plan', stageB.PLAN, '--report', os.path.join(COPY, 'ac.json')], capture_output=True, text=True)
        tick('assemble_checks', t)
        print(p.stdout[-1500:], flush=True); res['assemble_checks_rc'] = p.returncode
        res['ok'] = p.returncode == 0
    elif mode == 'selectB':
        import selectB
        assert selectB.HERE.startswith(COPY), selectB.HERE
        selectB.r58_guard = lambda *a, **k: None
        out = os.path.join(COPY, 'train', 'selectB')
        for a in selectB.ARMS:
            t = time.time(); selectB.run([a], out); tick('selectB %s' % a, t)
        tick('selectB all arms', T0); res['ok'] = True
    else:
        import report
        assert report.HERE.startswith(COPY), report.HERE
        report.r58_guard = lambda *a, **k: None
        report.ROOT = '/w'  # the counts section's graphs: the real tune graphs, read-only (as the real run)
        report.ec.GRAPHS = '/w/export/graphs'  # evalcore's candidate graphs (read at its import from the copy's ROOT)
        t = time.time(); report.main(test=False); tick('report main', t)
        j = json.load(open(os.path.join(COPY, 'train', 'report', 'tune.json')))
        res['tune_json'] = dict(test=j.get('test'), arms=sorted(j.get('arms', {}).get('late50', {}).get('pool', {}))[:3],
                                harness_ok=(j.get('harness_check') or {}).get('ok'), counts_arms=sorted(j.get('counts') or {}))
        res['ok'] = True
except BaseException as e:  # SystemExit included: a refusal is recorded, not hidden
    import traceback; traceback.print_exc(); res['error'] = repr(e)
res['total_s'] = round(time.time() - T0, 2)
json.dump(res, open('/w/r58c/B/out/timing/timing-%s.json' % mode, 'w'), indent=1)
print('TIMING total %.2f s' % res['total_s'], flush=True)
print('RESULT %s timing-%s' % ('PASS' if res['ok'] else 'FAIL', mode), flush=True)
sys.exit(0 if res['ok'] else 1)
