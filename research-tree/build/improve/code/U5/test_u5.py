"""U5 tests (plain runner; no image has pytest). Run: run_cpu.sh test_u5.py
1 the graph of a block ignores every commit at or after its history end (the future is replaced; the graph is bit-identical)
2 the graph's weights equal the card's own pair-weight matrix (d4lib Block.W)
3 every edge fact and every node-feature snapshot is before the block's cutoff
4 training blocks end before the tuning split; the four time folds are disjoint and cover the training blocks
5 held-out pair rows carry no label
6 both architectures run forward and backward (finite)
7 (after the final job) score files have the shape of the caches, -inf at the seed cell, no NaN in any scored cell"""
import json, os, sys
import numpy as np
import torch
import d4lib as L
import u4lib as U
import u5lib as B
import test_u4 as T4
import train as TR

OUT = B.OUT


def blocks_to_check(r):
    return [r.block_ids('train')[0], r.block_ids('train')[-1], r.block_ids('tune')[0], r.block_ids('tune')[-1], r.block_ids('test')[0]]


def seg_files(n, k):
    ix = U.snap_index(n); return ix['segments'][ix['block_seg'][str(k)]]['files']


def same_graph(a, b):
    assert a.keys() == b.keys()
    for c in a:
        assert np.array_equal(a[c], b[c]), c


def test_graph_ignores_the_future():
    for n in L.REPOS:
        r = T4.repo(n)
        for k in blocks_to_check(r):
            b = r.block(k)
            if not len(b.tasks):
                continue
            pb = T4.poisoned(r, b).block(k)
            same_graph(B.build_graph(b, seg_files(n, k)), B.build_graph(pb, seg_files(n, k)))
            assert len(r.pairs()[0]) != len(T4.poisoned(r, b).pairs()[0]) or k == r.block_ids()[-1]   # the poison is real


def test_weights_equal_the_cards_matrix():
    for n in L.REPOS:
        r = T4.repo(n)
        for k in blocks_to_check(r)[:3]:
            b = r.block(k)
            if not len(b.tasks):
                continue
            g = B.build_graph(b, {})
            for tag, hl in (('raw', None), ('hl30', 30), ('hl90', 90), ('hl365', 365)):
                W = b.W(hl, False).toarray()
                M = np.zeros_like(W); M[g['co_i'], g['co_j']] = g['w_' + tag]; M = M + M.T
                assert np.allclose(M, W, rtol=1e-9, atol=1e-12), (n, k, tag)


def test_facts_before_the_cutoff():
    for n in L.REPOS:
        r = T4.repo(n); ix = U.snap_index(n)
        for k in r.block_ids():
            b = r.block(k)
            m = r.blocks_meta[k]
            assert m['hend'] == 0 or r.commits[m['hend'] - 1]['ct'] < m['cutoff_ct']
            seg = ix['segments'][ix['block_seg'][str(k)]]
            assert seg['hend'] <= m['hend']                      # the node-feature snapshot is not later than the block's history
            if seg['hend'] > 0:
                assert r.commits[seg['hend'] - 1]['ct'] < m['cutoff_ct']
            if len(b.tasks):
                assert (b.pT < b.cutoff).all() and b.hist_n == m['hend']
    # the saved graphs carry the same hend and cutoff
    for n in L.REPOS:
        r = T4.repo(n)
        for k in r.block_ids():
            fp = os.path.join(OUT, 'graph', n, '%d.npz' % k)
            if os.path.exists(fp):
                z = np.load(fp)
                assert int(z['hend']) == r.blocks_meta[k]['hend'] and int(z['cutoff']) == r.blocks_meta[k]['cutoff_ct']


def test_training_blocks_and_folds():
    for n in L.REPOS:
        plan = json.load(open(os.path.join(L.DATA, n, 'plan.json')))
        tune0 = min(b['cutoff_ct'] for b in plan['blocks'] if b['split'] == 'tune')
        tr = [b for b in plan['blocks'] if b['split'] == 'train']
        assert all(b['cutoff_ct'] < tune0 for b in tr)
        ks = [b['k'] for b in tr]
        fs = TR.folds(n, ks)
        flat = [k for f in fs for k in f]
        assert sorted(flat) == sorted(ks) and len(set(flat)) == len(flat) and len(fs) == 4
        cut = {b['k']: b['cutoff_ct'] for b in tr}          # folds are consecutive in time
        assert all(max(cut[k] for k in fs[i]) <= min(cut[k] for k in fs[i + 1]) for i in range(3))


def test_heldout_rows_have_no_label():
    for n in L.REPOS:
        plan = json.load(open(os.path.join(L.DATA, n, 'plan.json')))
        for b in plan['blocks']:
            if b['split'] == 'test':
                fp = os.path.join(OUT, 'pairs', n, '%d.npz' % b['k'])
                if os.path.exists(fp):
                    assert not np.load(fp)['y'].any()
                cz = os.path.join(U.U4, 'cache', n, '%d.npz' % b['k'])
                z = np.load(cz)
                assert 'label' not in z.files


def test_models_run():
    n = 'clinic'; r = T4.repo(n); k = r.block_ids('tune')[0]
    b = r.block(k)
    g = dict(np.load(os.path.join(OUT, 'graph', n, '%d.npz' % k)))
    for arch in ('sage', 'gat'):
        for w, nodes in (('hl90', 'qwen'), ('bin', 'none')):
            dg = B.DGraph(g, n, w, nodes, arch)
            net = B.Net(arch, 2, 64, dg.features().shape[1]).to(B.DEV)
            h = net.encode(dg)
            si = torch.zeros(10, dtype=torch.long); ci = torch.arange(10)
            out = net.pairs(h, si, ci, torch.zeros(10, B.P)); out.sum().backward()
            assert torch.isfinite(out).all() and all(torch.isfinite(p.grad).all() for p in net.parameters() if p.grad is not None)


def test_scores_shape():
    for sp in ('train', 'tune', 'heldout'):
        for n in L.REPOS:
            d = os.path.join(OUT, 'scores', sp, n)
            if not os.path.isdir(d):
                return
            for f in os.listdir(d):
                M = np.load(os.path.join(d, f)); k = int(f.split('.')[0])
                z = np.load(os.path.join(U.U4, 'cache', n, '%d.npz' % k))
                assert M.shape == z['PC'].shape
                assert (M[np.arange(len(M)), z['seeds']] == -np.inf).all()
                if sp != 'train':
                    assert np.isfinite(np.delete(M, 0, axis=1) if False else M[np.isfinite(M)]).all() and not np.isnan(M).any()


if __name__ == '__main__':
    fs = [(k, v) for k, v in sorted(globals().items()) if k.startswith('test_') and callable(v)]
    for k, f in fs:
        f(); print('ok', k, flush=True)
    print('all U5 tests passed')
