"""Agent A, round r58c, the coordinator's order after ruling 95, item 2: a second TEST tuning hand-off for the
coordinator's rehearsal, answer_level.py tune --test on train/selectB-test (PLACEBO, written by `selectB.py --test`)
with --test-set late50 (the four comparators and PLACEBO alone/fused x 3 seeds = 10 variants, 313 tasks), timed (wall
seconds, peak RSS of the process tree, cgroup peak). Run in a ktest-a<N> container: script:r58c/A/tune_late50.py
selectB.py --test reads no stage-B table and writes `stamp: null`, so there are no "matching" tables or plan: the
test-mode --tables/--plan given are agent A's fake stage (r58c/A/out/fakestage: the synthetic plan, an empty tables
folder). If answer_level.py refuses, nothing is moved or copied and the exact refusal is printed (RESULT REFUSED).
On success the hand-off folder is copied to r58c/handoff-test/tune-late50/ and prechecked (precheck_handoff.py --split tune
--test). Round r58c ROUND3: answer_level.py checks such a selection as a test selection (HANDOFF.json stamp_check
'test-selection'); run with KT_MEM=4206m or more. Never reads grader-returns/."""
import os, sys, json, time, shutil, resource, subprocess, hashlib
ROOT = '/w'; TRAIN = os.path.join(ROOT, 'train')
SEL = os.path.join(TRAIN, 'selectB-test'); ST = os.path.join(ROOT, 'r58c', 'A', 'out', 'fakestage', 'stageB')
OUT = os.path.join(ROOT, 'r58c', 'A', 'out', 'tune_late50'); DST = os.path.join(ROOT, 'r58c', 'handoff-test', 'tune-late50')
LOGS = os.path.join(ROOT, 'r58c', 'A', 'logs')
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
print('sha256 %s train/answer_level.py' % sha(os.path.join(TRAIN, 'answer_level.py')), flush=True)
print('sha256 %s train/selectB-test/PLACEBO/choices.json (stamp %s)' % (sha(os.path.join(SEL, 'PLACEBO', 'choices.json')),
      json.load(open(os.path.join(SEL, 'PLACEBO', 'choices.json'))).get('stamp')), flush=True)
cmd = [sys.executable, os.path.join(TRAIN, 'answer_level.py'), 'tune', '--test', '--sel', SEL, '--out', OUT, '--tables', os.path.join(ST, 'tables'),
       '--plan', os.path.join(ST, 'plan.json'), '--arms', 'PLACEBO', '--test-set', 'late50']
print('run:', ' '.join(cmd), flush=True)
r0 = resource.getrusage(resource.RUSAGE_CHILDREN); t0 = time.monotonic()
p = subprocess.run(cmd, cwd=TRAIN, capture_output=True, text=True)
wall = time.monotonic() - t0; r1 = resource.getrusage(resource.RUSAGE_CHILDREN)
print('rc %d' % p.returncode, flush=True); print(p.stdout[-3000:], p.stderr[-2000:], flush=True)
cg = None
for f in ('/sys/fs/cgroup/memory.peak', '/sys/fs/cgroup/memory/memory.max_usage_in_bytes'):
    try: cg = int(open(f).read().strip()); break
    except Exception: pass
res = dict(rc=p.returncode, wall_s=round(wall, 1), peak_rss_mb=round(r1.ru_maxrss / 1024.0, 1), cgroup_peak_mb=round(cg / 2.0 ** 20, 1) if cg else None,
           refusal=[l for l in (p.stdout + p.stderr).splitlines() if 'refusing' in l])
if p.returncode == 0:
    if os.path.isdir(DST): shutil.rmtree(DST)
    shutil.copytree(os.path.join(OUT, 'handoff'), DST)
    H = json.load(open(os.path.join(DST, 'HANDOFF.json')))
    res.update(variants=len(H['variants']), tasks=H['tasks'], cross_check_target=H['cross_check']['target'], handoff_sha256=sha(os.path.join(DST, 'HANDOFF.json')))
    res['stamp_check'] = H.get('stamp_check'); res['test_set'] = H.get('test_set')
    q = subprocess.run([sys.executable, os.path.join(ROOT, 'r58c', 'A', 'precheck_handoff.py'), '--dir', DST, '--split', 'tune', '--test'],
                       cwd=TRAIN, capture_output=True, text=True)
    print(q.stdout[-2500:], q.stderr[-1500:], flush=True)
    res['precheck_rc'] = q.returncode; res['precheck'] = [l for l in q.stdout.splitlines() if l.startswith('PRECHECK')]
json.dump(res, open(os.path.join(LOGS, 'tune_late50.json'), 'w'), indent=1, sort_keys=True)
print(json.dumps(res, sort_keys=True), flush=True)
good = p.returncode == 0 and res.get('precheck_rc') == 0 and res.get('variants') == 10 and res.get('tasks') == 313 and res.get('stamp_check') == 'test-selection'
print('RESULT %s tune_late50 rc %d precheck rc %s wall_s %s peak_rss_mb %s cgroup_peak_mb %s' % ('PASS' if good else ('REFUSED' if p.returncode else 'FAIL'), p.returncode,
      res.get('precheck_rc'), res['wall_s'], res['peak_rss_mb'], res['cgroup_peak_mb']), flush=True)
sys.exit(0 if good else (p.returncode or 1))
