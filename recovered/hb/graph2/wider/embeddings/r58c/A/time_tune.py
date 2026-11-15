"""Agent A, round r58c, end-order-changes-2 item 5: the timing harness of `answer_level.py tune` in test mode.
usage (in a ktest-a<N> container, EMB_ROOT=/w):  python /w/r58c/A/time_tune.py pick8|late50
       (as a ktest item: script:r58c/A/time_tune.py@late50)
Fake arms, real code path: the six arms E1..E5 and PLACEBO, 3 seeds, alone and fused, both scopes, each table a
deterministic hash score (selectB.placebo, salt 'time<ARM>') over every candidate of every task of the test set, the
fused one evalcore.fused_with(PPR, CO, hash, w 0.5). With the four comparators that is the real run's 40 variants
(4 + 6 x 2 x 3). The fake stage is a copy of the synthetic plan r58b/out/fakeB/stageB/plan.json with an EMPTY tables
folder (plus a counts file per arm only if a task of the set has no candidate in a scope). Then ONE timed subprocess:
  python /w/train/answer_level.py tune --test --sel <sel> --out <out> --tables <tables> --plan <plan> --test-set <set>
with the default B (10,000 bootstrap draws). Reported: wall seconds of that subprocess (packing and scoring by node
included), the peak RSS of its process tree (getrusage RUSAGE_CHILDREN, max over the descendants), the container's
cgroup memory peak, and the hand-off's variant and task counts (late50 must be 40 and 313).
Writes only /w/r58c/A/out/timing/ (removed at the end, the summary kept in /w/r58c/A/logs/time_tune-<set>.json).
Never reads or writes r58c/A/out/fakesel, train/stageB, train/selectB, train/heldout or train/report."""
import os, sys, json, time, shutil, resource, subprocess, hashlib
ROOT = '/w'; TRAIN = os.path.join(ROOT, 'train')
sys.path.insert(0, TRAIN); sys.path.insert(0, os.path.join(ROOT, 'eval'))
import evalcore as ec, selectB, answer_level as al
SET = sys.argv[1] if len(sys.argv) > 1 else 'late50'
assert SET in al.TEST_SETS, SET
T = os.path.join(ROOT, 'r58c', 'A', 'out', 'timing'); LOGS = os.path.join(ROOT, 'r58c', 'A', 'logs')
FB = os.path.join(ROOT, 'r58b', 'out', 'fakeB'); W = 0.5; SCOPES = al.SCOPES
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
if os.path.isdir(T): shutil.rmtree(T)
t0 = time.monotonic()
ST = os.path.join(T, 'stage', 'stageB'); TB = os.path.join(ST, 'tables'); os.makedirs(TB)
PL = os.path.join(ST, 'plan.json'); shutil.copy(os.path.join(FB, 'stageB', 'plan.json'), PL)
plan = json.load(open(PL))
ids = al.test_set_ids(SET); tasks = ec.load_tasks(); byid = {t['task_id']: t for t in tasks}
commits = sorted({byid[i]['commit'] for i in ids})
_cl = selectB.cand_lists(); cands = {sc: _cl[sc] for sc in SCOPES}
CD = os.path.join(ROOT, 'eval', 'comparators')
comp = {(n, sc): ec.read_score_table(os.path.join(CD, '%s_%s.tsv.gz' % (n, sc))) for n in ('PPR', 'CO') for sc in SCOPES}
empty = {sc: [tid for tid in ids if not cands[sc].get(tid)] for sc in SCOPES}
SEL = os.path.join(T, 'sel'); CID = 'timing'
for arm in al.ARMS:
    os.makedirs(os.path.join(SEL, arm))
    for s in al.SEEDS:
        for sc in SCOPES:
            alone = {tid: selectB.placebo(s, tid, cands[sc].get(tid, []), 'time' + arm) for tid in ids}
            fused = {tid: ec.fused_with(tid, cands[sc].get(tid, []), comp[('PPR', sc)].get(tid, {}), comp[('CO', sc)].get(tid, {}), alone[tid], W)
                     for tid in ids}
            ec.write_score_table(os.path.join(SEL, arm, 'alone_%s_s%d.tsv.gz' % (sc, s)), alone)
            ec.write_score_table(os.path.join(SEL, arm, 'fused_%s_s%d.tsv.gz' % (sc, s)), fused)
        if empty['pool'] or empty['unrestricted']:  # a task with no candidate is absent from its table: counts show it unscored
            json.dump({tid: {sc: dict(cands=0, cands_unscored=0) for sc in SCOPES if tid in empty[sc]} for tid in set(empty['pool']) | set(empty['unrestricted'])},
                      open(os.path.join(TB, '%s_%s_s%d_counts.json' % (arm, CID, s)), 'w'))
TD = selectB.tables_digest(TB, plan)
for arm in al.ARMS:
    json.dump(dict(test=True, note='TEST: timing harness fake arm (selectB.placebo, salt time%s), fused with PPR and CO at w %g' % (arm, W),
                   stamp=dict(plan_hash=plan['plan_hash'], tables_digest=TD), blocks=[dict(config_id=CID, commits=commits)]),
              open(os.path.join(SEL, arm, 'choices.json'), 'w'), indent=1)
setup_s = time.monotonic() - t0
print('set %s: %d tasks, %d commits; tasks without a candidate: pool %d, unrestricted %d; fake inputs built in %.1f s'
      % (SET, len(ids), len(commits), len(empty['pool']), len(empty['unrestricted']), setup_s), flush=True)
OUT = os.path.join(T, 'out')
cmd = [sys.executable, os.path.join(TRAIN, 'answer_level.py'), 'tune', '--test', '--sel', SEL, '--out', OUT, '--tables', TB,
       '--plan', PL, '--test-set', SET]
print('timed:', ' '.join(cmd), flush=True)
r0 = resource.getrusage(resource.RUSAGE_CHILDREN); t1 = time.monotonic()
p = subprocess.run(cmd, cwd=TRAIN, capture_output=True, text=True)
wall = time.monotonic() - t1; r1 = resource.getrusage(resource.RUSAGE_CHILDREN)
print(p.stdout[-1500:], p.stderr[-1500:], flush=True)
cg = None
for f in ('/sys/fs/cgroup/memory.peak', '/sys/fs/cgroup/memory/memory.max_usage_in_bytes'):
    try: cg = int(open(f).read().strip()); break
    except Exception: pass
H = json.load(open(os.path.join(OUT, 'handoff', 'HANDOFF.json'))) if p.returncode == 0 else {}
res = dict(set=SET, rc=p.returncode, wall_s=round(wall, 1), cpu_user_s=round(r1.ru_utime - r0.ru_utime, 1), cpu_sys_s=round(r1.ru_stime - r0.ru_stime, 1),
           peak_rss_mb=round(r1.ru_maxrss / 1024.0, 1), cgroup_peak_mb=round(cg / 2.0 ** 20, 1) if cg else None, setup_s=round(setup_s, 1),
           variants=len(H.get('variants', [])), tasks=H.get('tasks'), commits=H.get('commits'), B=10000, cpus=2, memory_cap_mb=1536,
           answer_level_sha256=sha(os.path.join(TRAIN, 'answer_level.py')), answer_level_js_sha256=sha(os.path.join(TRAIN, 'answer_level.js')))
json.dump(res, open(os.path.join(LOGS, 'time_tune-%s.json' % SET), 'w'), indent=1, sort_keys=True)
print(json.dumps(res, sort_keys=True), flush=True)
shutil.rmtree(T, ignore_errors=True)
want = dict(pick8=(40, 37), late50=(40, 313))[SET]
ok = p.returncode == 0 and (res['variants'], res['tasks']) == want
print('RESULT %s time_tune %s wall_s %s peak_rss_mb %s variants %s tasks %s' % ('PASS' if ok else 'FAIL', SET, res['wall_s'], res['peak_rss_mb'], res['variants'], res['tasks']), flush=True)
sys.exit(0 if ok else 1)
