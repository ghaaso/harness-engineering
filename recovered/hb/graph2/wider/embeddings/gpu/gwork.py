"""GPU-lane worker: one measurement per process (so peak RSS and card peaks are its own).
Runs inside the container (EMB_ROOT=/w, train at /w/train, this folder at /w/gpu).
usage:
  python gwork.py env                         torch/cuda facts, disk as seen in the container -> env.json
  python gwork.py equiv <arm> <orig|new>      KGE_DEVICE=cpu: 2-epoch c01 run, losses + reps hashes -> equiv/<arm>-<ver>.json
  python gwork.py scorediff                   4b: stage-A best model per arm, 20 queries scored on CPU and on the card
  python gwork.py time <arm> <cid> <A|L> [<epochs>] [<tag>]   timing run (no early stopping) -> timing/<key>.json
No task truth, no held-out truth, nothing under sealed/ is read."""
import os, sys, json, time, hashlib, shutil
HERE = os.path.dirname(os.path.abspath(__file__))
TRAIN = os.path.join(os.environ.get('EMB_ROOT', '/w'), 'train')
LARGEST_TUNE = '7b3a745281898d3d5808c5a15c4916d1d9dbb1b4'


def put(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    part = path + '.part'; json.dump(obj, open(part, 'w'), indent=1, default=str); os.replace(part, path)


def thash(t):
    return hashlib.sha256(t.detach().cpu().contiguous().numpy().tobytes()).hexdigest()[:16]


def ruling36_epochs(kge, arm, cid):
    import math
    meta = json.load(open(os.path.join(TRAIN, 'stageA', arm, cid, 'meta.json')))
    iv = kge.es_params(arm)['freq']
    return max(20, int(math.ceil(meta['best_epoch'] / iv) * iv)), meta['best_epoch']


cmd = sys.argv[1]
if cmd == 'env':
    import torch
    out = dict(torch=torch.__version__, cuda=torch.version.cuda, available=torch.cuda.is_available(),
               device=torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
               tf32_matmul_default=torch.backends.cuda.matmul.allow_tf32, cudnn_tf32_default=torch.backends.cudnn.allow_tf32,
               float32_matmul_precision=torch.get_float32_matmul_precision(),
               disk={p: shutil.disk_usage(p)._asdict() for p in ('/w/train', '/w/gpu', '/tmp')})
    if torch.cuda.is_available():
        f, t = torch.cuda.mem_get_info(); out.update(card_free_mb=f / 2 ** 20, card_total_mb=t / 2 ** 20)
    put(os.path.join(HERE, 'env.json'), out); print(json.dumps(out))

elif cmd == 'equiv':
    arm, ver = sys.argv[2], sys.argv[3]
    assert os.environ.get('KGE_DEVICE', 'cpu') == 'cpu'
    if ver.startswith('orig'):
        sys.path.insert(0, HERE); import kge_cpu_orig as kge
        kge.CONFIG_FILE = os.path.join(TRAIN, 'stageA_configs.json')  # its HERE is gpu/, the configs live in train/
    else:
        sys.path.insert(0, TRAIN); import kge
    cid, cfg = kge.grid(arm)[0]
    model, info, G = kge.train(arm, cfg, 1, kge.STAGEA_SHA, holdout=True, max_epochs=2, es=False)
    if arm == 'E5':
        reps = {A: kge.final_reps(tr.model) for A, tr in model.items()}
        hashes = {A: [thash(E), thash(R)] for A, (E, R) in reps.items()}
    else:
        E, R = kge.final_reps(model); hashes = [thash(E), thash(R)]
    out = dict(arm=arm, ver=ver, cfg_id=cid, losses=[repr(x) for x in info['losses']], reps_sha=hashes,
               file=kge.__file__, device=str(getattr(kge, 'DEVICE', 'cpu (no DEVICE in this version)')))
    put(os.path.join(HERE, 'equiv', '%s-%s.json' % (arm, ver)), out); print(json.dumps(out))

elif cmd == 'scorediff':
    sys.path.insert(0, TRAIN); import kge, torch
    top = json.load(open(os.path.join(TRAIN, 'stageA', 'top3.json')))
    G = kge.Graph(kge.STAGEA_SHA, holdout=True)
    co_heads = sorted({h for h, r, t in G.train if r == kge.CO})
    res = {}
    for arm in kge.ARMS:
        cid = top[arm]['top3'][0]['config_id']
        reps = torch.load(os.path.join(TRAIN, 'stageA', arm, cid, 'reps.pt'), weights_only=False)
        if arm == 'E5':
            parts = [(A, sd['labels'], sd['E'], sd['rco']) for A, sd in sorted(reps['specialists'].items()) if sd['rco'] is not None]
            per = 20 // len(parts) + 1; kind = 'rotate'
        else:
            parts = [('all', reps['labels'], reps['E'], reps['rco'])]; per = 20; kind = reps['kind']
        rows = []; left = 20
        for A, labels, E, r in parts:
            idx = {e: i for i, e in enumerate(labels)}
            hs = [h for h in co_heads if h in idx][:min(per, left)]; left -= len(hs)
            if not hs: continue
            h = E[torch.tensor([idx[x] for x in hs])]
            Sc = kge.score_with(kind, h, r.unsqueeze(0).expand_as(h), E)
            Sg = kge.score_with(kind, h.cuda(), r.cuda().unsqueeze(0).expand_as(h), E.cuda()).cpu()
            d = (Sc - Sg).abs()
            top10 = sum(int(torch.equal(torch.topk(Sc[i], 10).indices, torch.topk(Sg[i], 10).indices)) for i in range(len(hs)))
            full = sum(int(torch.equal(torch.sort(Sc[i], stable=True, descending=True).indices,
                                       torch.sort(Sg[i], stable=True, descending=True).indices)) for i in range(len(hs)))
            rows.append(dict(part=A, queries=len(hs), entities=len(labels), max_abs=float(d.max()),
                             max_rel=float((d / Sc.abs().clamp(min=1e-12)).max()), max_abs_score=float(Sc.abs().max()),
                             top10_identical=top10, full_order_identical=full))
        res[arm] = dict(config_id=cid, kind=kind, parts=rows, queries=sum(x['queries'] for x in rows),
                        max_abs=max(x['max_abs'] for x in rows), max_rel=max(x['max_rel'] for x in rows),
                        top10_identical=sum(x['top10_identical'] for x in rows),
                        full_order_identical=sum(x['full_order_identical'] for x in rows),
                        within_1e4=max(x['max_abs'] for x in rows) <= 1e-4)
        print(arm, json.dumps(res[arm]), flush=True)
    put(os.path.join(HERE, 'scorediff.json'), res)

elif cmd == 'curve':
    # diagnostic for 4c only (never a selection input): the arm's stage-A best config on the stage-A split,
    # evaluated every interval to a fixed epoch count with the patience rule switched off
    sys.path.insert(0, TRAIN); import kge
    arm, cid, ep = sys.argv[2], sys.argv[3], int(sys.argv[4])
    f0 = kge.es_params; kge.es_params = lambda a: dict(f0(a), patience=10 ** 6)
    cfg = dict(kge.grid(arm))[cid]
    _, info, _ = kge.train(arm, cfg, int(kge.load_configs()['common']['seed_stageA']), kge.STAGEA_SHA, holdout=True, max_epochs=ep)
    out = dict(arm=arm, config_id=cid, device=str(kge.DEVICE), epochs=info['epochs'], val=info['val'], best_epoch=info['best_epoch'],
               val_mrr=info['val_mrr'], losses=info['losses'], note='patience off; diagnostic for the 4c sanity check only')
    put(os.path.join(HERE, 'curve-%s-%s.json' % (arm, cid)), out); print(json.dumps({k: out[k] for k in ('epochs', 'best_epoch', 'val_mrr')}))

elif cmd == 'plantest':
    # dry run of stageB.make_plan as the guard will call it (KGE_DEVICE=cuda, STAGEB_LANES): plan, RUNLOG lines and
    # progress go to gpu/plantest/ instead of train/; every timing key exists, so nothing trains
    import builtins
    sys.path.insert(0, TRAIN); import stageB as sb
    d = os.path.join(HERE, 'plantest'); os.makedirs(d, exist_ok=True)
    sb.PLAN = os.path.join(d, 'plan.json'); sb.PROG = os.path.join(d, 'progress.jsonl')
    if os.path.exists(sb.PLAN): os.remove(sb.PLAN)
    sb.open = lambda p, *a, **k: builtins.open(os.path.join(d, 'RUNLOG-lines.md') if str(p).endswith('RUNLOG.md') else p, *a, **k)
    p = sb.make_plan()
    print(json.dumps(dict(s=p['s'], checkpoints=len(p['checkpoints']), lanes=p['lanes'], device=p['device'],
                          units=sum(len(v) for v in p['configs'].values()) * 3 * len(p['checkpoints']))))

elif cmd == 'time':
    sys.path.insert(0, TRAIN); import kge, torch, numpy as np
    arm, cid, where = sys.argv[2], sys.argv[3], sys.argv[4]
    ep36, best = ruling36_epochs(kge, arm, cid)
    epochs = int(sys.argv[5]) if len(sys.argv) > 5 and sys.argv[5] != '-' else (3 if where == 'A' else ep36)
    tag = sys.argv[6] if len(sys.argv) > 6 else ''
    key = '%s-%s-%s%s' % (arm, cid, where, ('-' + tag) if tag else '')
    cfg = dict(kge.grid(arm))[cid]
    sha = kge.STAGEA_SHA if where == 'A' else LARGEST_TUNE
    used = []
    if kge.DEVICE.type == 'cuda':
        torch.cuda.init(); f0, tot = torch.cuda.mem_get_info(); used.append((tot - f0) / 2 ** 20)

    def log(epoch, loss, info):
        if kge.DEVICE.type == 'cuda':
            f, t = torch.cuda.mem_get_info(); used.append((t - f) / 2 ** 20)
    t0 = time.perf_counter()
    _, info, G = kge.train(arm, cfg, 1, sha, holdout=False, max_epochs=epochs, es=False, log=log)
    wall = time.perf_counter() - t0
    out = dict(key=key, arm=arm, config_id=cid, cfg=cfg, dim=cfg['embedding_dim'], graph=sha, where=where,
               device=str(kge.DEVICE), threads=kge.THREADS, epochs=info['epochs'], ruling36_epochs=ep36, stageA_best_epoch=best,
               s_per_epoch=float(np.median(info['epoch_s'])), s_per_epoch_mean=float(np.mean(info['epoch_s'])),
               epoch_s=info['epoch_s'], train_wall_s=info['wall_s'], call_wall_s=wall, triples=len(G.train),
               entities=len(G.full_ent), peak_rss_mb=info['peak_rss_mb'],
               peak_cuda_alloc_mb=info.get('peak_cuda_alloc_mb'), peak_cuda_reserved_mb=info.get('peak_cuda_reserved_mb'),
               card_used_mb_before=used[0] if used else None, card_used_mb_max=max(used) if used else None,
               loss_first=info['losses'][0], loss_last=info['losses'][-1])
    put(os.path.join(HERE, 'timing', key + '.json'), out)
    print(json.dumps({k: v for k, v in out.items() if k != 'epoch_s'}), flush=True)
