"""T3 measurements 5 and 6 on U5's frozen setting (sage L1 H128 N20 hl90 qwen), CPU, tuning only. U5's and T1's code imported
unchanged (T1's abl.train = U5's training loop; mode 'asis', uniform negatives).
usage: m56_u5.py inv <seed>       5: co-change edge weight hl90 / |e| (each pair event's decayed weight over its commit's file count)
       m56_u5.py zul <n> <seed>   6: zulip training restricted to its last n training blocks (FixFlow and clinic unchanged)
-> /t3/u5runs/<name>.json (per-commit tuning P@10 at the best epoch, history)"""
import json, os, sys, time
import numpy as np
import torch
import u5lib as B
import train as TR
import abl as A
import d4lib as L

OUTD = '/t3/u5runs'


def add_inv_weights(blocks):
    reps = {}
    for b in blocks:
        rp = reps.setdefault(b.repo, L.Repo(b.repo))
        db = rp.block(b.k)
        g = dict(np.load(os.path.join(B.OUT, 'graph', b.repo, '%d.npz' % b.k)))
        N = db.N; assert N == int(g['n'])
        key = db.pI.astype(np.int64) * N + db.pJ
        uk, inv = np.unique(key, return_inverse=True)
        assert np.array_equal((uk // N).astype(np.int32), g['co_i']) and np.array_equal((uk % N).astype(np.int32), g['co_j'])
        dec = 0.5 ** ((db.cutoff - db.pT) / (90 * 86400.0))
        assert np.allclose(np.bincount(inv, weights=dec, minlength=len(uk)), g['w_hl90']), 'hl90 weights differ from U5 graph'
        g['w_hl90inv'] = np.bincount(inv, weights=dec / db.pS, minlength=len(uk))
        b.g = B.DGraph(g, b.repo, 'hl90inv', A.CFG['nodes'], A.CFG['arch'])


def main():
    kind = sys.argv[1]
    if kind == 'inv':
        seed = int(sys.argv[2]); name = 'inv_s%d' % seed
    else:
        n, seed = int(sys.argv[2]), int(sys.argv[3]); name = 'zul%d_s%d' % (n, seed)
    fp = os.path.join(OUTD, name + '.json')
    if os.path.exists(fp):
        TR.log(name, 'finished already'); return
    os.makedirs(os.path.join(OUTD, 'ckpt'), exist_ok=True)
    torch.set_num_threads(4); t0 = time.time()
    blocks = TR.make_blocks(dict(A.CFG, seed=seed), ('train', 'tune'))
    assert all(b.split in ('train', 'tune') for b in blocks)
    if kind == 'inv':
        add_inv_weights(blocks)
    else:
        zk = sorted(b.k for b in blocks if b.repo == 'zulip' and b.split == 'train')
        keep = set(zk[-n:])
        blocks = [b for b in blocks if not (b.repo == 'zulip' and b.split == 'train' and b.k not in keep)]
    trainb = [b for b in blocks if b.split == 'train']; tuneb = [b for b in blocks if b.split == 'tune']
    TR.log(name, 'loaded', len(trainb), len(tuneb), 'train tasks', sum(b.T for b in trainb), '%.0fs' % (time.time() - t0))
    net, mu, sd, st = A.train('asis', False, seed, trainb, tuneb, os.path.join(OUTD, 'ckpt', name + '.pt'), name)
    TR.atomic_json(dict(name=name, cfg=dict(A.CFG, seed=seed), kind=kind, best_ep=st['best']['ep'], tune_pooled=st['best']['p'],
                        per_commit=st['best']['res'], hist=st['hist'], train_blocks=len(trainb), secs=round(time.time() - t0)), fp)
    TR.log(name, 'done: best epoch', st['best']['ep'], 'pooled %.4f' % st['best']['p'], '%.0fs' % (time.time() - t0))


if __name__ == '__main__':
    main()
