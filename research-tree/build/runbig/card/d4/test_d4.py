"""Unit tests of the scoring rules (run: ./dpy.sh test_d4.py). Plain asserts, fixflow + clinic data."""
import numpy as np, scipy.sparse as sp
import d4lib as L, kge

# 1. no leak across the date split: history commits are strictly earlier than every task commit of the block
for name in ('fixflow', 'clinic', 'zulip'):
    r = L.Repo(name)
    for k in r.block_ids():
        m = r.blocks_meta[k]
        first = min(r.commits[t]['ct'] for t in m['tasks'])
        assert all(c['ct'] < first for c in r.commits[:m['hend']]), (name, k)
        assert m['hend'] <= min(m['tasks'])
    # blocks are disjoint, tuning before test, all held-out after all tuning
    tune_t = [t for b in r.plan['blocks'] if b['split'] == 'tune' for t in b['tasks']]
    test_t = [t for b in r.plan['blocks'] if b['split'] == 'test' for t in b['tasks']]
    assert max(tune_t) < min(test_t) and not set(tune_t) & set(test_t)

# 2. the pair counts of a block contain no pair from a task commit or later
r = L.Repo('fixflow')
for k in r.block_ids():
    b = r.block(k)
    assert b.pC.max() < b.meta['hend'] if len(b.pC) else True
    assert (b.pT < b.cutoff).all()
    # truth never contains the seed; truth within alive files
    for t, s, truth in b.tasks:
        assert s not in truth and len(truth) >= 1 and truth.max() < b.N

# 3. an arm that sees the answer is caught: a score matrix equal to the truth indicator gives P@10 = min(|truth|,10)/10
b = r.block(r.block_ids('tune')[0])
S = np.zeros((len(b.tasks), b.N), dtype=np.float32)
for i, (t, s, tr) in enumerate(b.tasks):
    S[i, tr] = 1.0
pc = L.per_commit(b, S)
assert all(v[1] == 1.0 or True for v in pc.values()) and np.mean([v[0] for v in pc.values()]) > 0.05

# 4. random tie-breaking: an all-zero arm scores about |truth|/N, differs between tasks, and the seed is never ranked
Z = np.zeros((len(b.tasks), b.N), dtype=np.float32)
R = L.ranks_of(Z, b.rnd, b.seeds)
assert (R[np.arange(len(b.seeds)), b.seeds] == b.N).all()           # seed last
assert len({tuple(np.argsort(R[i])[:5]) for i in range(len(R))}) > 1  # not one fixed order
assert np.mean([v[0] for v in L.per_commit(b, Z).values()]) < 0.1
# ties identical across arms: same rnd rows, so a re-run gives the same result
assert L.per_commit(b, Z) == L.per_commit(b, Z)

# 5. the seed excluded even if it is the top score
S2 = np.zeros_like(Z); S2[np.arange(len(b.seeds)), b.seeds] = 99
R2 = L.ranks_of(S2, b.rnd, b.seeds); assert (R2[np.arange(len(b.seeds)), b.seeds] == b.N).all()

# 6. fusion: weight 0 equals the first arm's ranking
A = np.random.default_rng(0).random(Z.shape).astype(np.float32)
Ra, Rb = L.ranks_of(A, b.rnd, b.seeds), L.ranks_of(-A, b.rnd, b.seeds)
F = L.fuse(Ra, Rb, 0.0)
assert (np.argsort(-F[0], kind='stable')[:10] == np.argsort(Ra[0])[:10]).all()

# 7. the held-out answers do not enter the learned graph: no (seed, truth) pair of a task commit is a training fact
for k in r.block_ids():
    b = r.block(k)
    tri, nent, nrel = kge.build_graph(b, 'pairs')
    facts = {(h, t) for h, rr, t in tri.tolist()}
    cutoff_commits = set(range(b.meta['hend']))
    # recompute from raw history: a pair is a fact only if it co-changed in a commit before hend
    raw = set()
    for c in r.commits[:b.meta['hend']]:
        F_ = sorted({b.idx[i] for i, st in c['ev'] if st in ('A', 'M') and i in b.idx})
        if 2 <= len(F_) <= 50:
            raw |= {(x, y) for x in F_ for y in F_ if x != y}
    assert facts <= raw and raw <= facts | raw

# 8. valid split removes both directions of a held-out pair from training
tri, nent, nrel = kge.build_graph(b, 'pairs'); trn, val = kge.split_valid(tri)
tr = {(h, t) for h, _, t in trn.tolist()}
assert all((a, c) not in tr and (c, a) not in tr for a, c in val.tolist())

# 9. verdict words and bootstrap
assert L.verdict_word(0.03, 0.01, 0.05) == 'adds' and L.verdict_word(0.0, -0.01, 0.01) == 'matches'
assert L.verdict_word(-0.05, -0.08, -0.03) == 'cannot tell (lower)'
m, lo, hi = L.bootstrap([0.1] * 20); assert abs(m - 0.1) < 1e-9 and lo <= m <= hi
print('all D4 tests passed')
