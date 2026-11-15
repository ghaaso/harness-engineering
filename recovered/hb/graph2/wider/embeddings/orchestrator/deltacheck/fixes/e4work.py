"""Task B worker (pre-run fixes, 2026-11-14): E4 c12 on the card vs the CPU. One measurement per process.
Runs in a container: EMB_ROOT=/w, train at /w/train (read-only), this folder at /w/fixes. Stage A's split
(holdout=True, its fixed hold-out seed), never a task score, nothing held out or sealed is read.
usage:
  python e4work.py seed <seed>            E4 c12, 95 fixed epochs, val MRR every 5 epochs (patience off, so the run
                                          is never cut), val at epoch 95 = the stage-B model; init hash recorded
                                          after each PyKEEN reset -> e4/<device>-s<seed>.json
  python e4work.py equiv <pre|post> [arm] KGE_DEVICE=cpu (E4: 1 thread): <arm> (default E4) c01, seed 1, 2 epochs, losses +
                                          reps hashes with the pre-fix kge.py (fixes/pre_m) or the current one
                                          -> e4/equiv-<ver>.json (E4, first run) / e4/equiv2-<arm>-<ver>.json (resume run)
  python e4work.py time <cid> <A|L>       KGE_DEVICE=cpu: 3-epoch timing of an E4 stage-B config on the stage-A
                                          graph (A) or the largest tune parent (L) -> e4/time-cpu-<cid>-<A|L>.json
"""
import os, sys, json, time, hashlib, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
TRAIN = os.path.join(os.environ.get('EMB_ROOT', '/w'), 'train')
OUTD = os.path.join(HERE, 'e4'); os.makedirs(OUTD, exist_ok=True)
LARGEST_TUNE = '7b3a745281898d3d5808c5a15c4916d1d9dbb1b4'


def put(name, obj):  # task 2: .part then train/atomic.replace_retry (five attempts, growing pause)
    if TRAIN not in sys.path: sys.path.append(TRAIN)
    from atomic import put_json
    put_json(os.path.join(OUTD, name), obj, indent=1, default=str)


def thash(t):
    return hashlib.sha256(t.detach().cpu().contiguous().numpy().tobytes()).hexdigest()[:16]


def load_kge(ver):
    if ver == 'pre':
        spec = importlib.util.spec_from_file_location('kge', os.path.join(HERE, 'pre_m', 'kge.py'))
        m = importlib.util.module_from_spec(spec); sys.modules['kge'] = m; spec.loader.exec_module(m)
        m.CONFIG_FILE = os.path.join(TRAIN, 'stageA_configs.json')  # its HERE is fixes/pre_m; the configs live in train/
        return m
    sys.path.insert(0, TRAIN)
    import kge
    return kge


cmd = sys.argv[1]
if cmd == 'seed':
    seed = int(sys.argv[2])
    kge = load_kge('post')
    import torch
    inits = []
    mm = kge.make_model

    def make_model_rec(arm, cfg, tf, fallback=False):
        m, kind = mm(arm, cfg, tf, fallback)
        orig = m.reset_parameters_

        def rec():
            r = orig()
            sd = m.state_dict()
            h = hashlib.sha256(b''.join(sd[k].detach().cpu().contiguous().numpy().tobytes() for k in sorted(sd))).hexdigest()[:16]
            inits.append(dict(device_of_params=str(next(m.parameters()).device), hash=h)); return r
        m.reset_parameters_ = rec  # records the weights right after each PyKEEN reset (probe and final)
        return m, kind
    kge.make_model = make_model_rec
    f0 = kge.es_params; kge.es_params = lambda a: dict(f0(a), patience=10 ** 6)
    cfg = dict(kge.grid('E4'))['c12']
    t0 = time.time()
    _, info, _ = kge.train('E4', cfg, seed, kge.STAGEA_SHA, holdout=True, max_epochs=95)
    val = dict((int(e), v) for e, v in info['val'])
    out = dict(arm='E4', config_id='c12', cfg=cfg, seed=seed, device=str(kge.DEVICE), threads=kge.THREADS, epochs=info['epochs'],
               val_at_95=val.get(95), best_epoch=info['best_epoch'], best_val=info['val_mrr'], val=info['val'],
               losses=info['losses'], init_after_each_reset=inits, wall_s=round(time.time() - t0, 1),
               torch=torch.__version__, note='task B: stage A split and seed rule, 95 fixed epochs, patience off')
    put('%s-s%d.json' % (kge.DEVICE.type, seed), out)
    print(json.dumps({k: out[k] for k in ('device', 'seed', 'val_at_95', 'best_epoch', 'best_val', 'wall_s', 'init_after_each_reset')}))

elif cmd == 'equiv':
    ver = sys.argv[2]; arm = sys.argv[3] if len(sys.argv) > 3 else 'E4'
    assert os.environ.get('KGE_DEVICE', 'cpu') == 'cpu' and (arm != 'E4' or os.environ.get('KGE_THREADS') == '1')
    kge = load_kge(ver)
    cid, cfg = kge.grid(arm)[0]
    model, info, G = kge.train(arm, cfg, 1, kge.STAGEA_SHA, holdout=True, max_epochs=2, es=False)
    E, R = kge.final_reps(model)
    out = dict(arm=arm, ver=ver, cfg_id=cid, threads=kge.THREADS, losses=[repr(x) for x in info['losses']],
               reps_sha=[thash(E), thash(R)], file=kge.__file__, device=str(kge.DEVICE))
    put(os.environ.get('EQUIV_OUT') or 'equiv-%s.json' % ver, out); print(json.dumps(out))

elif cmd == 'time':
    cid, tag = sys.argv[2], sys.argv[3]
    kge = load_kge('post')
    assert kge.DEVICE.type == 'cpu'
    cfg = dict(kge.grid('E4'))[cid]
    sha = kge.STAGEA_SHA if tag == 'A' else LARGEST_TUNE
    _, info, G = kge.train('E4', cfg, 1, sha, holdout=False, max_epochs=3, es=False)
    import numpy as np
    out = dict(arm='E4', config_id=cid, tag=tag, sha=sha, triples=len(G.train), s_per_epoch=float(np.median(info['epoch_s'])),
               epoch_s=info['epoch_s'], peak_rss_mb=info['peak_rss_mb'], threads=kge.THREADS)
    put('time-cpu-%s-%s.json' % (cid, tag), out); print(json.dumps(out))
