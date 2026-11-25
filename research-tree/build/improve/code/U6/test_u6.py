"""U6 tests (plain runner; pytest is in no image). Run with run_cpu.sh test_u6.py [test names] (CPU, network off)."""
import os, sys, copy, shutil
sys.path.insert(0, '/code'); sys.path.insert(0, '/card'); sys.path.insert(0, '/u4code')
import numpy as np
import torch
import stream as S
import u6models as M
from utils.utils import NeighborSampler

DEV = os.environ.get('U6_TEST_DEV', 'cpu')
torch.set_num_threads(1)          # one thread: CPU float sums are then reproducible (Adam amplifies sum-order noise)


def toy_stream(n_commits=60, n_files=25, seed=1):
    rng = np.random.default_rng(seed)
    commits = []; ct = 1_700_000_000
    for n in range(n_commits):
        ct += int(rng.integers(3600, 3 * 86400))
        F = rng.choice(n_files, size=int(rng.integers(2, 6)), replace=False)
        commits.append(dict(sha='%040x' % n, ct=ct, msg='m', ev=[[int(f), 'M'] for f in F]))
    return commits


def dyglib_sampler(st):
    adj = [[] for _ in range(st.max_id + 2)]
    for e in range(st.n_events):
        adj[st.src[e]].append((st.dst[e], e + 1, st.t[e])); adj[st.dst[e]].append((st.src[e], e + 1, st.t[e]))
    return NeighborSampler(adj, sample_neighbor_strategy='recent', seed=0)


def test_sampler_equals_dyglib():
    st = S.Stream(toy_stream()); fs = S.FastSampler(st); ds = dyglib_sampler(st)
    rng = np.random.default_rng(0)
    nodes = rng.integers(1, st.max_id + 2, size=300); times = rng.choice(st.t, size=300) + rng.choice([0.0, 0.5, -1e-9], size=300)
    for k in (5, 20, 32):
        a = fs.get_historical_neighbors(nodes, times, k); b = ds.get_historical_neighbors(nodes, times, k)
        for x, y in zip(a, b):
            assert np.allclose(x, y), 'sampler differs from DyGLib'
    e = 10; n = int(st.src[e]); ids, eids, tms = fs.get_historical_neighbors(np.array([n]), np.array([st.t[e]]), 50)
    assert (eids != e + 1).all() and (tms[eids != 0] < st.t[e]).all()      # strictly before the query time


def test_edge_features_cumulative():
    c = toy_stream(); st = S.Stream(c)
    for e in range(0, st.n_events, 7):
        a, b = sorted((int(st.src[e]) - 1, int(st.dst[e]) - 1)); n_same = 0; d30 = 0.0; d365 = 0.0
        for e2 in range(e + 1):
            if sorted((int(st.src[e2]) - 1, int(st.dst[e2]) - 1)) == [a, b]:
                n_same += 1; d30 += 0.5 ** ((st.t[e] - st.t[e2]) / 30); d365 += 0.5 ** ((st.t[e] - st.t[e2]) / 365)
        f = st.edge_feat[e + 1]
        assert np.allclose(f[:3], [np.log1p(d30), np.log1p(d365), np.log1p(n_same)], atol=1e-5), (e, f)
    c2 = copy.deepcopy(c); k = 40
    for x in c2[k:]:
        x['ev'] = [[0, 'M'], [1, 'M'], [2, 'M']]
    st2 = S.Stream(c2); n = int(st.ev_hend[k])
    assert np.array_equal(st.edge_feat[:n + 1], st2.edge_feat[:n + 1]) and np.array_equal(st.src[:n], st2.src[:n])


def _data(st, dim=16):
    X = np.random.default_rng(3).normal(size=(st.max_id + 2, dim)).astype(np.float32); X[0] = 0
    return X, S.FastSampler(st), dyglib_sampler(st)


def test_dygformer_equals_dyglib():
    from models.DyGFormer import DyGFormer
    st = S.Stream(toy_stream()); X, fs, ds = _data(st)
    for nbr in (20, 32):
        torch.manual_seed(0); orig = DyGFormer(X, st.edge_feat, ds, 100, 50, 1, 2, 2, 0.1, nbr, DEV)
        torch.manual_seed(1); fast = M.FastDyGFormer(X, st.edge_feat, fs, 100, 50, 1, 2, 2, 0.1, nbr, DEV)
        fast.load_state_dict(orig.state_dict())
        orig.eval(); fast.eval()
        rng = np.random.default_rng(2)
        e = rng.integers(0, st.n_events, size=64)
        src, dst, tm = st.src[e], rng.integers(1, st.max_id + 2, size=64), st.t[e] + rng.choice([0.0, 0.3], size=64)
        with torch.no_grad():
            a = orig.compute_src_dst_node_temporal_embeddings(src, dst, tm.astype(np.float64))
            b = fast.compute_src_dst_node_temporal_embeddings(src, dst, tm.astype(np.float64))
        for x, y in zip(a, b):
            assert torch.allclose(x, y, atol=2e-4, rtol=1e-3), float((x - y).abs().max())


def test_tgn_equals_dyglib():
    from models.MemoryModel import MemoryModel
    st = S.Stream(toy_stream()); X, fs, ds = _data(st)
    torch.manual_seed(0); orig = MemoryModel(X, st.edge_feat, ds, 100, 'TGN', 1, 2, 0.1, device=DEV)
    torch.manual_seed(1); fast = M.FastTGN(X, st.edge_feat, fs, 100, 'TGN', 1, 2, 0.1, device=DEV)
    fast.load_state_dict(orig.state_dict()); orig.eval(); fast.eval()
    rng = np.random.default_rng(5)
    for lo in range(0, min(st.n_events, 400), 100):
        idx = np.arange(lo, min(lo + 100, st.n_events))
        neg = rng.integers(1, st.max_id + 2, size=len(idx))
        with torch.no_grad():
            for fl in (False, True):
                kw = dict(src_node_ids=st.src[idx], dst_node_ids=(st.dst[idx] if fl else neg), node_interact_times=st.t[idx],
                          edge_ids=(idx + 1).astype(np.int64) if fl else None, edges_are_positive=fl, num_neighbors=20)
                a = orig.compute_src_dst_node_temporal_embeddings(**kw); b = fast.compute_src_dst_node_temporal_embeddings(**kw)
                for x, y in zip(a, b):
                    assert torch.allclose(x, y, atol=1e-4, rtol=1e-3), float((x - y).abs().max())
    assert torch.allclose(orig.memory_bank.node_memories, fast.memory_bank.node_memories, atol=1e-4)


def test_no_event_at_or_after_cutoff_enters():
    for sname in ('pair', 'bip'):
        _leak(sname)


def test_bip_stream_basics():
    cm = toy_stream()
    b = S.BipStream(cm); p = S.Stream(cm)
    assert b.n_events == sum(len({i for i, s in c['ev']}) for c in cm if 2 <= len({i for i, s in c['ev']}) <= 50)
    assert (b.dst > b.file_max_id + 1).all() and (b.src <= b.file_max_id + 1).all()
    assert np.array_equal(b.u_src, p.src) and np.array_equal(b.u_hend, p.ev_hend)
    # edge feature = the file's plain count so far (log1p), and nothing from later commits changes an earlier row
    i = 5
    f = b.members[i]; before = (b.members[:i + 1] == f).sum()
    assert abs(b.edge_feat[i + 1, 2] - np.log1p(before)) < 1e-6
    cm2 = copy.deepcopy(cm)
    for c in cm2[40:]:
        c['ev'] = [[0, 'M'], [1, 'M']]
    b2 = S.BipStream(cm2); n = b.ev_hend[40]
    assert b2.ev_hend[40] == n and np.array_equal(b.edge_feat[:n + 1], b2.edge_feat[:n + 1]) and np.array_equal(b.src[:n], b2.src[:n])
    # node features of a commit node = mean of its files
    X = np.random.default_rng(0).standard_normal((b.file_max_id + 2, 8)).astype(np.float32); X[0] = 0
    import io
    sf = {str(g): 'f%d' % g for g in range(b.file_max_id + 1)}
    S._cache_test = None
    kmap = {'f%d' % g: g for g in range(b.file_max_id + 1)}
    orig_le = S.load_embeddings
    S.load_embeddings = lambda u, r: (kmap, X[1:])
    try:
        XX = S.node_features('', 'toyrepo', sf, b.max_id, st=b, _cache={})
    finally:
        S.load_embeddings = orig_le
    c0 = int(b.commit[0]); fs_ = b.members[b.commit == c0]
    assert np.allclose(XX[b.file_max_id + 2 + c0], X[fs_ + 1].mean(0), atol=1e-6)


def _leak(sname):
    """Replace every commit from a block's hend on by other files and messages: the scores of that block (and of every earlier
    block of its split) do not change, for DyGFormer and for TGN (after a short training and the memory replay)."""
    import core
    repo = 'clinic'
    ctx = core.Ctx(repo, sname=sname)
    ks = ctx.ks('tune')[:2]
    k = ks[-1]; h = ctx.hend(k)
    c2 = copy.deepcopy(ctx.commits); rng = np.random.default_rng(9)
    ids = sorted({i for c in ctx.commits for i, _ in c['ev']})
    for c in c2[h:]:
        c['msg'] = 'changed'
        c['ev'] = [[int(i), 'M'] for i in rng.choice(ids, size=int(rng.integers(2, 8)), replace=False)]
    ctx2 = core.Ctx(repo, commits=c2, sname=sname)
    assert ctx2.st.n_events != ctx.st.n_events or not np.array_equal(ctx2.st.src, ctx.st.src)      # the future really differs
    for kind in ('dygformer', 'tgn'):
        out = []
        for n, cx in enumerate((ctx, ctx2)):
            r = core.Runner(cx, kind, 20, 1e-3, device=DEV, seed=0)
            d = '/tmp/u6test_%s_%d' % (kind, n); shutil.rmtree(d, ignore_errors=True)
            r.train(ks[0], 1, d, ckpt_secs=1e9)
            out.append(r.score_blocks(ks))
        for kk in ks:
            assert np.array_equal(out[0][kk], out[1][kk]), (kind, kk, float(np.abs(out[0][kk] - out[1][kk]).max()))
            assert np.isfinite(out[0][kk]).all()
    t = ctx.cutoff_days(k)
    ids_, eids_, tms_ = ctx.sampler.get_historical_neighbors(np.arange(1, ctx.st.max_id + 2), np.full(ctx.st.max_id + 1, t), 64)
    assert (tms_[eids_ != 0] < t).all() and (eids_.max() <= ctx.st.ev_hend[h])


def test_resume_equals_straight_run():
    _resume('pair')


def test_resume_bip_midepoch():
    _resume('bip', mid=True)


def _resume(sname, mid=False):
    import core
    ctx = core.Ctx('clinic', sname=sname); k = ctx.ks('tune')[0]
    res = []
    for mode in ('straight', 'resumed'):
        d = '/tmp/u6resume_%s' % mode; shutil.rmtree(d, ignore_errors=True)
        r = core.Runner(ctx, 'tgn', 20, 1e-3, device=DEV, seed=0)
        if mode == 'straight':
            r.train(k, 3, d, ckpt_secs=1e9)
        elif mid:
            calls = [0]; orig = r.batch_loss
            def boom(*a, **kw):
                calls[0] += 1
                if calls[0] == 6:
                    raise KeyboardInterrupt
                return orig(*a, **kw)
            r.batch_loss = boom
            try:
                r.train(k, 3, d, ckpt_secs=0)           # a checkpoint after every batch; the process dies inside batch 6
            except KeyboardInterrupt:
                pass
            r = core.Runner(ctx, 'tgn', 20, 1e-3, device=DEV, seed=0)
            r.train(k, 3, d, ckpt_secs=1e9)
        else:
            r.train(k, 2, d, ckpt_secs=1e9)
            r = core.Runner(ctx, 'tgn', 20, 1e-3, device=DEV, seed=0)         # a fresh process picks the checkpoint up
            r.train(k, 3, d, ckpt_secs=1e9)
        res.append({n: p.detach().cpu().clone() for n, p in r.bb.state_dict().items()})
    for n in res[0]:
        assert torch.allclose(res[0][n], res[1][n], atol=1e-5), n


def test_cadence_resume_equals_straight_run():
    """New epoch-end cadence: with epoch_secs huge the resume checkpoint is written only at keep_epochs and the last epoch; a run killed
    inside epoch 3 resumes from the epoch-2 state and ends bit-for-bit (same tolerance as the other resume tests) where a straight run ends."""
    import core
    ctx = core.Ctx('clinic', sname='pair'); k = ctx.ks('tune')[0]
    saves = []; orig_save = core.atomic_save
    def spy(path, obj):
        if path.endswith('ckpt.pt'):
            saves.append(obj['epoch'])
        return orig_save(path, obj)
    core.atomic_save = spy
    try:
        res = []
        for mode in ('straight', 'killed'):
            d = '/tmp/u6cad_%s' % mode; shutil.rmtree(d, ignore_errors=True); del saves[:]
            r = core.Runner(ctx, 'tgn', 20, 1e-3, device=DEV, seed=0)
            if mode == 'straight':
                r.train(k, 4, d, ckpt_secs=1e9, keep_epochs=(2,), epoch_secs=1e9)
                assert saves == [2, 4], saves
            else:
                calls = [0]; orig = r.batch_loss
                nb = (int(ctx.st.u_hend[ctx.hend(k)]) + core.BATCH - 1) // core.BATCH
                def boom(*a, **kw):
                    calls[0] += 1
                    if calls[0] == 2 * nb + 2:
                        raise KeyboardInterrupt
                    return orig(*a, **kw)
                r.batch_loss = boom
                try:
                    r.train(k, 4, d, ckpt_secs=1e9, keep_epochs=(2,), epoch_secs=1e9)
                except KeyboardInterrupt:
                    pass
                assert saves == [2], saves
                r = core.Runner(ctx, 'tgn', 20, 1e-3, device=DEV, seed=0)
                r.train(k, 4, d, ckpt_secs=1e9, keep_epochs=(2,), epoch_secs=1e9)
            res.append({n: p.detach().cpu().clone() for n, p in r.bb.state_dict().items()})
    finally:
        core.atomic_save = orig_save
    for n in res[0]:
        assert torch.allclose(res[0][n], res[1][n], atol=1e-5), n


def test_final_retrain_equals_sweep_state():
    """final.py retrain: a state retrained to epoch 3 equals the state a longer run (planned 4 epochs, keeping epoch 3) saved."""
    import core, final
    ctx = core.Ctx('clinic', sname='pair'); k = ctx.ks('tune')[0]
    shutil.rmtree('/tmp/u6out', ignore_errors=True); core.OUT = '/tmp/u6out'
    d = '/tmp/u6out/ref'
    r = core.Runner(ctx, 'dygformer', 20, 1e-3, device=DEV, seed=0)
    r.train(k, 4, d, keep_epochs=(3,))
    ref = torch.load(d + '/state_e3.pt', map_location='cpu', weights_only=False)
    r2 = core.Runner(ctx, 'dygformer', 20, 1e-3, device=DEV, seed=0)
    sf = final.retrain(ctx, r2, 'dygformer', 'dygformer', 'clinic', 20, 1e-3, 3, 600, 120)
    got = torch.load(sf, map_location='cpu', weights_only=False)
    assert not os.path.exists(os.path.dirname(sf) + '/ckpt.pt')
    for n in ref['bb']:
        assert torch.equal(ref['bb'][n], got['bb'][n]), n
    for n in ref['lp']:
        assert torch.equal(ref['lp'][n], got['lp'][n]), n


if __name__ == '__main__':
    names = [n for n in sorted(globals()) if n.startswith('test_')]
    only = sys.argv[1:]
    for n in names:
        if only and n not in only:
            continue
        globals()[n](); print('ok', n, flush=True)
    print('all U6 tests passed')
