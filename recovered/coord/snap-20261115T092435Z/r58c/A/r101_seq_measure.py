"""Agent A, round 9 (the coordinator's item 6: C13 / ruling 101(c)): the full-size measurement of three units IN A ROW in ONE
process, the held-out run's way, for the setting with the highest peak. Run in a ktest-a<N> container with KT_MEM=4g (kge-H1's
cap, -m 4g --memory-swap 4g; CPU, 2 cores).
  * the graphs: three synthetic graphs at scale 1 (heldout.synth_graph, real_ids, seeds 20261115..17) with the counts of the
    largest held-out graph of the plan (its sizes.json only, ruling 79; held-out-only relation names renamed, ruling 97(c)),
    entities drawn from the largest tuning checkpoint, exactly as the probe makes them;
  * the setting: E4 c13 by default, the highest peak of the fifteen settings in the round-8 full-size stand-in
    (r58c/A/logs/inject_standin-big-E4.log: E4 c13 peak_rss_mb 1603.0, cgroup 1733.1; the next arm's best is E1 c15, 1073.6);
    the argument <arm>:<config_id>[:epochs[:ntasks]] picks another;
  * the process: `heldout.py probe-seq` (the probe's own child: kge.train with saved reps, kge.score of ntasks synthetic tasks,
    the model folder removed, per unit), 3 epochs (the probe's) and 30 tasks (the probe's full path) by default.
Prints the per-unit peaks and one line `R101SEQ {...}` (peaks, the 3.5 GB flag of ruling 86a, the 4g cap and the margin), and
exits 0 when the highest peak (process or container) stays at or under the flag, 4 when it is above it (report), 3 on a failure.
Reads the synthetic plan r58b/out/fakeB/stageB/plan.json (stage B's configs and checkpoint lists), the tuning graph's
entities.tsv and the held-out graphs' sizes.json; writes r58c/A/out/r101_seq (removed at the end, the result kept as
r58c/A/out/r101_seq.json).
ktest item form: script:r58c/A/r101_seq_measure.py[@E4:c13]"""
import os, sys, json, time, shutil, subprocess, hashlib, resource
ROOT = os.environ.get('EMB_ROOT') or '/w'; TRAIN = os.path.join(ROOT, 'train')
sys.path[:0] = [TRAIN, os.path.join(ROOT, 'export'), os.path.join(ROOT, 'eval')]
for _p in ('train/heldout.py', 'train/kge.py', 'r58c/A/r101_seq_measure.py'):
    print('sha256 %s %s' % (hashlib.sha256(open(os.path.join(ROOT, _p), 'rb').read()).hexdigest(), _p), flush=True)
import heldout
PLAN = os.path.join(ROOT, 'r58b', 'out', 'fakeB', 'stageB', 'plan.json')
OUT = os.path.join(ROOT, 'r58c', 'A', 'out', 'r101_seq'); RES = OUT + '.json'
FLAG, CAP = 3584, 4096  # ruling 86a's flag (3.5 GB) under kge-H1's 4g cap
a = (sys.argv[1] if len(sys.argv) > 1 else 'E4:c13').split(':')
arm, cid = a[0], a[1]; epochs = a[2] if len(a) > 2 else '3'; ntasks = a[3] if len(a) > 3 else '30'
plan = json.load(open(PLAN))
G0 = os.path.join(ROOT, 'export', 'graphs0')
C, s = heldout.largest(G0, plan['heldout']['checkpoints'])
T, _ = heldout.largest(G0, plan['checkpoints'])
s, new_rels = heldout.rename_new(s, heldout.tuning_relations(G0, plan['checkpoints']))
shutil.rmtree(OUT, ignore_errors=True); g0 = os.path.join(OUT, 'g0'); shas = []
for k in (1, 2, 3):
    sk = 'synthetic-seq%d-%s' % (k, arm); shas.append(sk)
    own = heldout.synth_graph(os.path.join(g0, sk), s, os.path.join(G0, T, 'entities.tsv'), 1, seed=20261114 + k, real_ids=True, new_rels=new_rels)
print('graphs: 3 x (entities %d, relations %d, triples %d), the largest held-out graph\'s counts at scale 1' % (own['entities'], own['relations'], own['triples']), flush=True)
t0 = time.time()
p = subprocess.run([sys.executable, os.path.join(TRAIN, 'heldout.py'), 'probe-seq', '--g0', g0, '--shas', ','.join(shas), '--arm', arm, '--cid', cid,
                    '--epochs', epochs, '--plan', PLAN, '--out', os.path.join(OUT, 'seq'), '--ntasks', ntasks],
                   cwd=TRAIN, capture_output=True, text=True, env=dict(os.environ, EMB_ROOT=ROOT, PYTHONPATH=TRAIN))
r = {}
for l in p.stdout.splitlines():
    if l.startswith('probe-seq: unit'): print(l[:600], flush=True)
    if l.startswith('PROBE '): r = json.loads(l[6:])
cg = heldout.cgroup_peak_mb()
units = r.get('units') or []
peak = max([u.get('peak_rss_mb') or 0 for u in units] + [cg or 0])
res = dict(arm=arm, config_id=cid, epochs=int(epochs), ntasks=int(ntasks), rc=p.returncode, wall_s=round(time.time() - t0, 1),
           graph=dict(entities=own['entities'], relations=own['relations'], triples=own['triples'], scale=1),
           units=[dict((k, u.get(k)) for k in ('unit', 'epochs', 'scored_tasks', 'wall_s', 'peak_rss_mb', 'rss_now_mb', 'cgroup_peak_mb')) for u in units],
           peak_rss_mb=r.get('peak_rss_mb'), cgroup_peak_mb_after=cg, highest_mb=peak, flag_mb=FLAG, cap_mb=CAP,
           margin_to_flag_mb=round(FLAG - peak, 1), margin_to_cap_mb=round(CAP - peak, 1),
           growth_rss_now_mb=(round(units[-1]['rss_now_mb'] - units[0]['rss_now_mb'], 1) if len(units) > 1 and units[0].get('rss_now_mb') and units[-1].get('rss_now_mb') else None),
           measure_self_maxrss_mb=round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024.0, 1))
if p.returncode != 0: res['error'] = (p.stdout + p.stderr).strip()[-800:]
json.dump(res, open(RES, 'w'), indent=1)
print('R101SEQ ' + json.dumps(res), flush=True)
shutil.rmtree(OUT, ignore_errors=True)
sys.exit(3 if p.returncode != 0 or len(units) != 3 else (4 if peak > FLAG else 0))
