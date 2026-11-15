"""Parallel-work measurement wrapper (parwork). Calls the lane's own stage-B unit path (kge.train with the plan's
fixed epochs, es=False, holdout=False; stageB.score_tasks / check_no_fold / write_parts / verify_parts), exactly
as stageB.run_units does for one unit, and records hashes before the model file is deleted. No lane code changes.

usage: python pw.py <tag> [--det] [--loop] [--stopfile PATH] UNIT [UNIT ...]
  UNIT = ARM:CID:SHA12 (seed 1). --det: CUBLAS_WORKSPACE_CONFIG=:4096:8 + torch.use_deterministic_algorithms(True)
  --loop: repeat the unit list until the stop file exists (checked at every epoch end; aborts the running unit)
  writes one JSON line per unit to /w/pw/runs/<tag>.jsonl
"""
import os, sys, json, time, hashlib, gzip, shutil, socket

args = sys.argv[1:]
tag = args.pop(0)
DET = '--det' in args
LOOP = '--loop' in args
STOP = None
if '--stopfile' in args:
    i = args.index('--stopfile'); STOP = args[i + 1]; del args[i:i + 2]
units = [a for a in args if not a.startswith('--')]
if DET:
    os.environ['CUBLAS_WORKSPACE_CONFIG'] = ':4096:8'
import torch
if DET:
    torch.use_deterministic_algorithms(True)
sys.path.insert(0, '/w/train')
import stageB, kge  # noqa: E402

PW = '/w/pw'
RUNS = os.path.join(PW, 'runs', tag + '.jsonl')
EPOCHS = json.load(open(os.path.join(PW, 'epochs.json')))          # {arm/cid: epochs} from the card plan
TOP = json.load(open('/w/train/stageA/top3.json'))
ASSIGN = json.load(open(os.path.join(PW, 'assign.json')))         # ck.assignment_m('tune', 1) output
CFG = {a: {r['config_id']: r['cfg'] for r in TOP[a]['top3']} for a in TOP}
tasks = stageB.load_tasks(); cands = stageB.load_cands()
lag = {t['task_id']: ASSIGN['lag_by_parent'][t['parent']] for t in tasks}
full = {C[:12]: C for C in ASSIGN['checkpoints']}


class Stop(Exception):
    pass


def sha(b): return hashlib.sha256(b).hexdigest()


def tensor_hashes(obj, path='', out=None):
    out = {} if out is None else out
    if isinstance(obj, torch.Tensor):
        t = obj.detach().cpu().contiguous()
        out[path] = dict(sha256=sha(t.numpy().tobytes()), shape=list(t.shape), dtype=str(t.dtype))
    elif isinstance(obj, dict):
        for k in sorted(obj): tensor_hashes(obj[k], path + '/' + str(k), out)
    elif isinstance(obj, (list, tuple)):
        if all(not isinstance(x, (torch.Tensor, dict, list, tuple)) for x in obj):
            out[path] = dict(sha256=sha(json.dumps(list(obj)).encode()), n=len(obj), kind='list')
        else:
            for i, x in enumerate(obj): tensor_hashes(x, '%s[%d]' % (path, i), out)
    else:
        out[path] = dict(value=repr(obj))
    return out


def stop_now(): return STOP is not None and os.path.exists(STOP)


def run_unit(u, idx):
    arm, cid, c12 = u.split(':'); C = full[c12]; seed = 1
    ep = int(EPOCHS['%s/%s' % (arm, cid)]); cfg = CFG[arm][cid]
    my = [t for t in tasks if ASSIGN['assignment'][t['parent']] == C]
    base = os.path.join(PW, 'out', tag, '%s_%s_s%d_%s_%d' % (arm, cid, seed, c12, idx))
    mdir = base + '.model'
    rec = dict(tag=tag, i=idx, unit='%s/%s/s%d/%s' % (arm, cid, seed, c12), arm=arm, cid=cid, ckpt=C, seed=seed,
               epochs_planned=ep, det=DET, host=socket.gethostname(), pid=os.getpid(), tasks=len(my))
    ep_t = []

    def lg(epoch, loss, info):
        ep_t.append(time.time())
        if stop_now(): raise Stop('stop file at epoch %d' % epoch)
    rec['t_call'] = time.time()
    try:
        _, info, _ = kge.train(arm, cfg, seed, C, holdout=False, outdir=mdir, max_epochs=ep, es=False, log=lg)
    except Stop as e:
        rec.update(status='aborted', reason=str(e), t_ep_end=ep_t, t_end=time.time())
        shutil.rmtree(mdir, ignore_errors=True); shutil.rmtree(mdir + '.part', ignore_errors=True)
        return rec
    rec['t_trained'] = time.time()
    rp = os.path.join(mdir, 'reps.pt')
    tables, per = stageB.score_tasks(rp, my, cands, None, lag, C)
    stageB.check_no_fold(per, 1, rec['unit'])
    meta = dict(arm=arm, config_id=cid, cfg=cfg, seed=seed, checkpoint=C, epochs=info['epochs'], wall_s=info['wall_s'],
                peak_rss_mb=info['peak_rss_mb'], losses=info['losses'], reps_bytes=os.path.getsize(rp), tasks=len(per),
                plan_hash='parwork', **stageB.runner_info())
    meta.update(kge.cuda_peak())
    stageB.write_parts(base, tables, per, meta)
    stageB.verify_parts(base, tables, per)
    rec['t_scored'] = time.time()
    reps = torch.load(rp, weights_only=False)
    rec['reps_tensors'] = tensor_hashes(reps)
    rec['reps_file_sha256'] = sha(open(rp, 'rb').read())
    os.remove(rp); shutil.rmtree(mdir, ignore_errors=True)
    rec['tables_sha256'] = {sc: sha(gzip.open(os.path.join(base, sc + '.tsv.gz')).read()) for sc in stageB.SCOPES}
    rec['counts_sha256'] = sha(json.dumps(per, sort_keys=True).encode())
    rec['rows'] = {sc: sum(len(v) for v in tables[sc].values()) for sc in stageB.SCOPES}
    shutil.rmtree(base, ignore_errors=True)
    rec.update(status='done', t_end=time.time(), t_ep_end=ep_t, losses=info['losses'], epoch_s=info['epoch_s'],
               epochs=info['epochs'], wall_s_train=info['wall_s'], peak_rss_mb=info['peak_rss_mb'], **kge.cuda_peak())
    return rec


os.makedirs(os.path.dirname(RUNS), exist_ok=True)
print('pw', tag, 'det' if DET else 'nondet', 'loop' if LOOP else 'once', units, 'torch', torch.__version__,
      'cuda', torch.version.cuda, 'device', kge.DEVICE, 'threads', torch.get_num_threads(),
      'det_flag', torch.are_deterministic_algorithms_enabled(), 'cublas_ws', os.environ.get('CUBLAS_WORKSPACE_CONFIG'), flush=True)
with open(RUNS, 'a') as f:
    f.write(json.dumps(dict(tag=tag, event='start', t=time.time(), det=DET, units=units, pid=os.getpid(),
                            torch=torch.__version__, cuda=torch.version.cuda)) + '\n')
k = 0
while True:
    for u in units:
        if stop_now(): break
        try:
            r = run_unit(u, k)
        except Exception as e:  # reported, never hidden
            import traceback
            r = dict(tag=tag, i=k, unit=u, status='error', error=repr(e)[:2000], tb=traceback.format_exc()[-4000:], t_end=time.time())
        with open(RUNS, 'a') as f: f.write(json.dumps(r) + '\n')
        print(json.dumps({x: r.get(x) for x in ('i', 'unit', 'status', 'epochs', 'error')}),
              'wall %.1f' % (r['t_end'] - r.get('t_call', r['t_end'])), flush=True)
        k += 1
        if r['status'] == 'error' and not LOOP: pass
    if not LOOP or stop_now(): break
with open(RUNS, 'a') as f: f.write(json.dumps(dict(tag=tag, event='end', t=time.time())) + '\n')
