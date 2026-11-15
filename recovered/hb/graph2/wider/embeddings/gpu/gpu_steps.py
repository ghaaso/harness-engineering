"""GPU-lane driver (tasks 3-5): runs every step as its own process, in order, skipping steps whose progress
line says done. Restartable at any moment (the coordinator may `docker stop` kge-* containers): a stopped
step has no done line and is redone. Progress: /w/gpu/progress.jsonl. Per step it also records the
container's peak memory (cgroup memory.current, sampled every second) and the peak summed RSS of the
step's processes.
usage: python gpu_steps.py [only-step-prefix ...]"""
import os, sys, json, time, subprocess, threading, datetime
HERE = os.path.dirname(os.path.abspath(__file__))
TRAIN = '/w/train'
PROG = os.path.join(HERE, 'progress.jsonl')
LOGD = os.path.join(HERE, 'logs'); os.makedirs(LOGD, exist_ok=True)
PY = sys.executable
TOP = json.load(open(os.path.join(TRAIN, 'stageA', 'top3.json')))
ARMS = ('E1', 'E2', 'E3', 'E4', 'E5')
CUDA = dict(os.environ, KGE_DEVICE='cuda')
CPU = dict(os.environ, KGE_DEVICE='cpu')


def now(): return datetime.datetime.utcnow().isoformat() + 'Z'


def done():
    if not os.path.exists(PROG): return set()
    return {r['step'] for r in (json.loads(l) for l in open(PROG) if l.strip()) if r.get('status') == 'done'}


def log(step, status, **kw):
    with open(PROG, 'a') as f: f.write(json.dumps(dict(step=step, status=status, t=now(), **kw)) + '\n')


def cg(name):
    for p in ('/sys/fs/cgroup/' + name,):
        try: return int(open(p).read().split()[0])
        except Exception: pass
    return None


def rss_kb(pid):
    try:
        for l in open('/proc/%d/status' % pid):
            if l.startswith('VmRSS:'): return int(l.split()[1])
    except Exception: pass
    return 0


def run_procs(step, cmds, env, cwd=HERE):
    """Start the commands at once, wait for all; sample memory every second."""
    t0 = time.time(); peak = dict(cg_mb=0.0, rss_sum_mb=0.0)
    logs = [open(os.path.join(LOGD, '%s-%d.log' % (step.replace('/', '_'), i)), 'w') for i in range(len(cmds))]
    ps = [subprocess.Popen(c, env=env, cwd=cwd, stdout=lf, stderr=subprocess.STDOUT) for c, lf in zip(cmds, logs)]
    stop = threading.Event()

    def sampler():
        while not stop.is_set():
            c = cg('memory.current')
            if c: peak['cg_mb'] = max(peak['cg_mb'], c / 2 ** 20)
            peak['rss_sum_mb'] = max(peak['rss_sum_mb'], sum(rss_kb(p.pid) for p in ps) / 1024)
            stop.wait(1.0)
    th = threading.Thread(target=sampler, daemon=True); th.start()
    rcs = [p.wait() for p in ps]; stop.set(); th.join()
    for lf in logs: lf.close()
    return rcs, round(time.time() - t0, 1), {k: round(v, 1) for k, v in peak.items()}


def step(name, cmds, env, cwd=HERE, check=None):
    if name in done(): return
    if not any(name.startswith(p) for p in ONLY): return
    print(now(), 'start', name, flush=True)
    rcs, wall, peak = run_procs(name, cmds, env, cwd)
    ok = all(r == 0 for r in rcs) and (check is None or check())
    log(name, 'done' if ok else 'failed', rc=rcs, wall_s=wall, procs=len(cmds), **peak)
    print(now(), 'done' if ok else 'FAILED', name, rcs, wall, peak, flush=True)


ONLY = sys.argv[1:] or ['']
step('env', [[PY, 'gwork.py', 'env']], CUDA)
# 3: CPU path unchanged - the original kge.py and the edited one, both on the CPU, same seeds
for arm in ARMS:
    for ver in ('orig', 'new'):
        step('equiv/%s/%s' % (arm, ver), [[PY, 'gwork.py', 'equiv', arm, ver]], CPU)
# 4a: the lane's own checks with the device on the card (outputs beside this script; train/ copies untouched)
step('check', [[PY, 'check.py']], dict(CUDA, KGE_CHECK_OUT=os.path.join(HERE, 'checks-cuda.json')), cwd=TRAIN)
step('scoretest', [[PY, 'scoretest.py']], dict(CUDA, KGE_SCORETEST_OUT=os.path.join(HERE, 'scoretest-cuda.json'),
                                                KGE_SCORETEST_DIR=os.path.join(HERE, 'tmp')), cwd=TRAIN)
# 4b
step('scorediff', [[PY, 'gwork.py', 'scorediff']], CUDA)
# 4c: each arm's stage-A best config retrained on the card, stage A's seed and split (sanity only)
for arm in ('E2', 'E4', 'E3', 'E1', 'E5'):
    cid = TOP[arm]['top3'][0]['config_id']
    out = os.path.join(HERE, 'sanity', arm, cid)
    step('sanity/%s/%s' % (arm, cid), [[PY, os.path.join(TRAIN, 'kge.py'), 'unit', arm, cid, out]], CUDA,
         check=lambda out=out: os.path.exists(os.path.join(out, 'meta.json')))
    if os.path.exists(os.path.join(out, 'reps.pt')): os.remove(os.path.join(out, 'reps.pt'))  # disk: not needed
# 5: timing of the three selected configs per arm: 3 epochs on the stage-A graph (no hold-out), ruling-36
#    epochs on the largest tune parent
for arm in ('E2', 'E4', 'E3', 'E1', 'E5'):
    for row in TOP[arm]['top3']:
        for where in ('A', 'L'):
            step('time/%s/%s/%s' % (arm, row['config_id'], where), [[PY, 'gwork.py', 'time', arm, row['config_id'], where]], CUDA)
# 5: k training processes at once on the card (one container), fixed epochs on the largest tune parent
PAR = [('E1', 'c04', 20, None), ('E4', 'c12', 20, None), ('E1', 'c04', 20, '2')]
for arm, cid, ep, thr in PAR:
    for k in (1, 2, 3):
        env = dict(CUDA, KGE_THREADS=thr) if thr else CUDA
        tagbase = 'par%d%s' % (k, ('t' + thr) if thr else '')
        step('par/%s/%s/k%d%s' % (arm, cid, k, ('/t' + thr) if thr else ''),
             [[PY, 'gwork.py', 'time', arm, cid, 'L', str(ep), '%s-%d' % (tagbase, i)] for i in range(k)], env)
# 3 (follow-up): E4 differed in the second epoch's loss at 1e-8; repeat runs of each version, and both at one thread
for ver, env in (('orig2', CPU), ('new2', CPU), ('orig-t1', dict(CPU, KGE_THREADS='1')), ('new-t1', dict(CPU, KGE_THREADS='1')),
                 ('orig-t1b', dict(CPU, KGE_THREADS='1'))):
    step('equiv2/E4/%s' % ver, [[PY, 'gwork.py', 'equiv', 'E4', ver]], env)
step('proj', [[PY, 'projall.py']], CPU, check=lambda: os.path.exists(os.path.join(HERE, 'stride-gpu-best.json')))
# session 2 (run under the stage-B cap candidate): E4 curve diagnostic, cap checks, stage-B delete-after-score test
step('curve/E4/c12', [[PY, 'gwork.py', 'curve', 'E4', 'c12', '110']], CUDA)
CAPTAG = os.environ.get('CAPTAG', 'cap')
for arm, cid, ep in (('E4', 'c13', 15), ('E5', 'c09', 10), ('E1', 'c12', 10)):
    step('capcheck/%s/%s/%s' % (CAPTAG, arm, cid), [[PY, 'gwork.py', 'time', arm, cid, 'L', str(ep), CAPTAG]], CUDA)
step('stageB-test3', [[PY, 'stageB_test3.py']], dict(CUDA, STAGEB_TEST_DIR=os.path.join(HERE, 'stageB-test3'), STAGEB_MIN_FREE_GB='20'),
     cwd=TRAIN, check=lambda: os.path.exists(os.path.join(HERE, 'stageB-test3', 'test3.json')))
step('plantest', [[PY, 'gwork.py', 'plantest']], dict(CUDA, STAGEB_LANES='1'), check=lambda: os.path.exists(os.path.join(HERE, 'plantest', 'plan.json')))
print(now(), 'gpu_steps finished', flush=True)
