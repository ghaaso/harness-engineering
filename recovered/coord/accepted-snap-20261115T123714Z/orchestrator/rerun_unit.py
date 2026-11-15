"""Retrain stage-B units exactly as stageB.run_units does and record ruling-68 hashes (container side; not hashed).
Used by the ruling-69 (ii) equality test and by rerun_compare.py. Nothing is written under train/ (mount it read-only).

usage: python rerun_unit.py --out DIR --rec FILE.jsonl [--det] UNIT[=TAG] [UNIT[=TAG] ...]
  UNIT = ARM/CID/sSEED/CKPT (checkpoint: 12 hex or full); configs, epochs, assignment, lag and s come from
         $RERUN_TRAIN/stageB/plan.json (default /w/train), whose plan_hash is checked against the code (ruling 59).
  --det  CUBLAS_WORKSPACE_CONFIG=:4096:8 before torch loads, torch.use_deterministic_algorithms(True): the settings
         of train/detrun.py (ruling 67). Without it the unit trains as stageB.py runs it.
Per unit: kge.train(arm, cfg, seed, C, holdout=False, outdir=<DIR/TAG.model>, max_epochs=plan epochs, es=False),
stageB.score_tasks over the plan's tasks at C, stageB.check_no_fold, stageB.write_parts to DIR/TAG/ and
stageB.verify_parts (the run_units sequence); then the hashes below are taken, reps.pt and the model folder deleted.
One JSON line per unit in FILE: losses (list) and losses_sha256, reps_tensors {path: sha256 of the tensor bytes},
reps_sha256 (over that map), tables_sha256 {pool, unrestricted} (sha256 of the gunzipped table), counts_sha256
(sha256 of counts.json read back and dumped with sorted keys), s_per_epoch (mean of epochs 2..n), wall, det flags.
"""
import os, sys, json, time, hashlib, gzip, shutil, socket

args = sys.argv[1:]


def opt(name):
    i = args.index(name); v = args[i + 1]; del args[i:i + 2]; return v


OUT = opt('--out'); REC = opt('--rec')
DET = '--det' in args
units = [a for a in args if a != '--det']
if DET:
    os.environ['CUBLAS_WORKSPACE_CONFIG'] = ':4096:8'
import torch  # noqa: E402

if DET:
    torch.use_deterministic_algorithms(True)
    assert torch.are_deterministic_algorithms_enabled()
TRAIN = os.environ.get('RERUN_TRAIN', '/w/train')
os.environ['STAGEB_RUNNER'] = 'rerun_unit.py' + (' det=1' if DET else '')
os.environ['STAGEB_PROGRESS'] = os.path.join(OUT, 'progress-rerun.jsonl')  # stageB.log is never called; never train/
sys.path.insert(0, TRAIN)
import stageB, kge  # noqa: E402


def sha(b): return hashlib.sha256(b).hexdigest()


def tensor_hashes(obj, path='', out=None):
    """orchestrator/parwork/pw.py's walk: every tensor by its bytes, plain lists by their JSON, other leaves by repr."""
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


def part_hashes(d):
    """Ruling-68 hashes of a written part folder (the same function reads a stage-B part in rerun_compare.py)."""
    return dict(tables_sha256={sc: sha(gzip.open(os.path.join(d, sc + '.tsv.gz')).read()) for sc in stageB.SCOPES},
                counts_sha256=sha(json.dumps(json.load(open(os.path.join(d, 'counts.json'))), sort_keys=True).encode()))


plan = json.load(open(stageB.PLAN))
stageB.check_plan_hash(plan)
tasks = stageB.load_tasks(); cands = stageB.load_cands()
os.makedirs(OUT, exist_ok=True)
print('rerun_unit', 'det' if DET else 'nondet', units, 'torch', torch.__version__, 'cuda', torch.version.cuda, 'device', kge.DEVICE,
      'det_flag', torch.are_deterministic_algorithms_enabled(), 'cublas_ws', os.environ.get('CUBLAS_WORKSPACE_CONFIG'),
      'plan_hash', plan['plan_hash'][:8], flush=True)


def run(spec):
    u, _, tag = spec.partition('=')
    arm, cid, sd, ck = u.split('/'); seed = int(sd[1:])
    C = [c for c in plan['checkpoints'] if c.startswith(ck)]
    assert len(C) == 1, ('checkpoint not in the plan or ambiguous', ck); C = C[0]
    c = [x for x in plan['configs'][arm] if x['config_id'] == cid]
    assert len(c) == 1, ('config not in the plan', arm, cid); c = c[0]
    unit = '%s/%s/s%d/%s' % (arm, cid, seed, C[:12]); tag = tag or unit.replace('/', '_')
    out = os.path.join(OUT, tag); mdir = out + '.model'
    my = [t for t in tasks if plan['assignment'][t['parent']] == C]
    rec = dict(tag=tag, unit=unit, arm=arm, cid=cid, seed=seed, ckpt=C, epochs_planned=c['epochs'], det=DET,
               det_flag=torch.are_deterministic_algorithms_enabled(), cublas_ws=os.environ.get('CUBLAS_WORKSPACE_CONFIG'),
               device=str(kge.DEVICE), host=socket.gethostname(), plan_hash=plan['plan_hash'], tasks=len(my), t_start=time.time())
    nco = json.load(open(os.path.join(kge.G0, C, 'sizes.json')))['co_changed_triples']
    if nco == 0:
        rec.update(status='untrained', note='no co_changed fact at the checkpoint: stageB.py writes empty parts, nothing to train')
        return rec
    _, info, _ = kge.train(arm, c['cfg'], seed, C, holdout=False, outdir=mdir, max_epochs=c['epochs'], es=False)
    rp = os.path.join(mdir, 'reps.pt')
    tables, per = stageB.score_tasks(rp, my, cands, None, plan['lag'], C)
    stageB.check_no_fold(per, plan['s'], unit)
    meta = dict(arm=arm, config_id=cid, cfg=c['cfg'], seed=seed, checkpoint=C, epochs=info['epochs'], wall_s=info['wall_s'],
                peak_rss_mb=info['peak_rss_mb'], losses=info['losses'], reps_bytes=os.path.getsize(rp), tasks=len(per),
                plan_hash=plan['plan_hash'], **stageB.runner_info())
    meta.update(kge.cuda_peak())
    stageB.write_parts(out, tables, per, meta)
    stageB.verify_parts(out, tables, per)
    reps = torch.load(rp, weights_only=False)
    th = tensor_hashes(reps)
    rec.update(status='done', epochs=info['epochs'], losses=info['losses'], losses_sha256=sha(json.dumps(info['losses']).encode()),
               reps_tensors=th, reps_sha256=sha(json.dumps(th, sort_keys=True).encode()), reps_file_sha256=sha(open(rp, 'rb').read()),
               rows={sc: sum(len(v) for v in tables[sc].values()) for sc in stageB.SCOPES},
               s_per_epoch=(sum(info['epoch_s'][1:]) / max(1, len(info['epoch_s']) - 1)), epoch_s=info['epoch_s'],
               wall_s_train=info['wall_s'], peak_rss_mb=info['peak_rss_mb'], part=out, t_end=time.time(), **kge.cuda_peak())
    rec.update(part_hashes(out))
    os.remove(rp); shutil.rmtree(mdir, ignore_errors=True)
    return rec


for spec in units:
    try:
        r = run(spec)
    except Exception as e:  # reported, never hidden
        import traceback
        r = dict(spec=spec, status='error', error=repr(e)[:2000], tb=traceback.format_exc()[-4000:], t_end=time.time())
    with open(REC, 'a') as f: f.write(json.dumps(r) + '\n')
    print(json.dumps({k: r.get(k) for k in ('tag', 'unit', 'status', 'epochs', 's_per_epoch', 'reps_sha256', 'error')}), flush=True)
