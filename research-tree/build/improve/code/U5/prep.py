"""U5 preparation (CPU): per block, the graph (facts of commits[:hend] only) and the pair rows with their features.
usage: prep.py graph [repos]   -> /out/graph/<repo>/<k>.npz
       prep.py pairs [repos]   -> /out/pairs/<repo>/<k>.npz   rows: train = U4's table rows (complete lists for FixFlow and
                                  the clinic, the pool for zulip), tune and test = every candidate (seed cell excluded)
Held-out blocks carry no label in U4's caches; none is read here (y is 0 for them and never used)."""
import json, os, sys, time
import numpy as np
import d4lib as L
import u4lib as U
import features as FT
import u5lib as B


def graph(names):
    for n in names:
        r = L.Repo(n); ix = U.snap_index(n)
        d = os.path.join(B.OUT, 'graph', n); os.makedirs(d, exist_ok=True)
        t0 = time.time()
        for k in r.block_ids():
            fp = os.path.join(d, '%d.npz' % k)
            if os.path.exists(fp):
                continue
            z = np.load(os.path.join(FT.cdir(n), '%d.npz' % k))
            if 'empty' in z:
                continue
            b = r.block(k)
            seg = ix['segments'][ix['block_seg'][str(k)]]
            assert seg['hend'] <= b.meta['hend']
            g = B.build_graph(b, seg['files'])
            np.savez(fp + '.tmp.npz', **g); os.replace(fp + '.tmp.npz', fp)
        print(n, 'graphs done %.0fs' % (time.time() - t0), flush=True)


def pairs(names):
    for n in names:
        r = L.Repo(n)
        t0 = time.time()
        for k in r.block_ids():
            split = r.blocks_meta[k]['split']
            d = os.path.join(B.OUT, 'pairs', n); os.makedirs(d, exist_ok=True)
            fp = os.path.join(d, '%d.npz' % k)
            if os.path.exists(fp):
                continue
            D = FT.load_block(n, k)
            if D is None:
                continue
            T, N = D['PC'].shape
            M = FT.pool_mask(D, k) if split == 'train' else np.ones((T, N), dtype=bool)
            M[np.arange(T), D['seeds']] = False
            ti, ci = np.nonzero(M)
            y = (D['label'][ti, ci] > 0).astype(np.uint8) if 'label' in D else np.zeros(len(ti), dtype=np.uint8)
            X = B.pair_X(D, ti, ci)
            np.savez(fp + '.tmp.npz', ti=ti.astype(np.int32), ci=ci.astype(np.int32), y=y, X=X, commit=D['commit'][ti].astype(np.int32),
                     tie=D['tie'][ti, ci].astype(np.float32), seeds=D['seeds'].astype(np.int32), N=np.array(N), T=np.array(T),
                     split=np.array(split))
            os.replace(fp + '.tmp.npz', fp)
        print(n, 'pairs done %.0fs' % (time.time() - t0), flush=True)


if __name__ == '__main__':
    cmd = sys.argv[1]; names = sys.argv[2:] or L.REPOS
    {'graph': graph, 'pairs': pairs}[cmd](names)
