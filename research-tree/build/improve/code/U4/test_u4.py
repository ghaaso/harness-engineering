"""U4 tests: the no-leak rule and the untrained arms' agreement with the card run.
Run: run_cpu.sh py test_u4.py   (plain runner below; the functions are pytest-style, but no image has pytest and
installing it is not allowed this round). Needs the data, caches and tables of U4 (CR/improve/U4)."""
import copy, glob, hashlib, json, os, sys
import numpy as np
import d4lib as L
import evaluate as E
import u4lib as U
import ease as EA

CARD_DATA = '/carddata'
CH = json.load(open('/cardout/choices.json'))
_R = {}


def repo(n):
    if n not in _R:
        _R[n] = L.Repo(n)
    return _R[n]


def sha(p):
    return hashlib.sha256(open(p, 'rb').read()).hexdigest()


# ---------------------------------------------------------------- 1. the card's data is used unchanged
def test_card_data_unchanged():
    for n in L.REPOS:
        assert sha(os.path.join(L.DATA, n, 'commits.jsonl')) == sha(os.path.join(CARD_DATA, n, 'commits.jsonl'))
        card = json.load(open(os.path.join(CARD_DATA, n, 'plan.json')))
        mine = json.load(open(os.path.join(L.DATA, n, 'plan.json')))
        assert [b for b in mine['blocks'] if b['split'] != 'train'] == card['blocks']
        for b in card['blocks']:
            assert sha(os.path.join(L.DATA, n, 'blocks', '%d.json' % b['k'])) == sha(os.path.join(CARD_DATA, n, 'blocks', '%d.json' % b['k']))


# ---------------------------------------------------------------- 2. training blocks: the rule of d4lib.py:70, before tuning
def test_training_blocks_rule():
    for n in L.REPOS:
        r = repo(n); plan = json.load(open(os.path.join(L.DATA, n, 'plan.json')))
        size = 20 if n == 'zulip' else 10
        tb = [b for b in plan['blocks'] if b['split'] == 'train']
        tune = [b for b in plan['blocks'] if b['split'] == 'tune']
        t0 = r.commits[tune[0]['tasks'][0]]['ct']                    # the tuning split's start (its first cutoff)
        elig = [i for i, c in enumerate(r.commits) if 2 <= sum(st == 'M' for _, st in c['ev']) <= 50]
        pre = [i for i in elig if r.commits[i]['ct'] < t0]
        assert len(tb) >= 1 and all(b['k'] >= 1000 for b in tb)
        flat = [t for b in tb for t in b['tasks']]
        assert flat == pre[len(pre) - len(flat):], 'training tasks are not the last eligible commits before tuning'
        for b in tb:
            assert len(b['tasks']) == size
            first = b['tasks'][0]
            h = first
            while h > 0 and r.commits[h - 1]['ct'] >= r.commits[first]['ct']:
                h -= 1
            assert b['hend'] == h and b['cutoff_ct'] == r.commits[first]['ct']
            assert all(c['ct'] < b['cutoff_ct'] for c in r.commits[:b['hend']])                     # facts strictly before
            assert all(r.commits[t]['ct'] < t0 for t in b['tasks'])                                 # labels before tuning
            r.block(b['k'])                                                                         # d4lib.py:70 holds
        test_t = {t for b in plan['blocks'] if b['split'] != 'train' for t in b['tasks']}
        assert not set(flat) & test_t and max(flat) < min(test_t)                                   # no tuning block in training


# ---------------------------------------------------------------- 3. no fact at or after a block's cutoff in its features
def poisoned(r, b, seed=0):
    """A copy of the repository in which every commit at or after the block's history end is changed (other files, other
    messages); the block's own task commits keep only their M events of alive files (they define seeds and truth) and get
    extra files and a new message."""
    rng = np.random.default_rng(seed)
    p = copy.copy(r)
    for a in ('_pairs', '_u4ev'):
        p.__dict__.pop(a, None)
    p._pairs = None
    hend = b.meta['hend']; tasks = set(b.meta['tasks']); ids = np.array(b.ids)
    new = list(r.commits[:hend])
    for n in range(hend, len(r.commits)):
        c = dict(r.commits[n]); words = ' '.join('w%dx' % x for x in rng.integers(0, 50, 6)) + ' zzzleak'
        extra = [[int(i), 'A'] for i in rng.choice(ids, size=min(5, len(ids)), replace=False)]
        if n in tasks:
            c['ev'] = [e for e in c['ev'] if e[1] == 'M' and e[0] in b.idx] + extra
        else:
            c['ev'] = extra + [[int(i), 'M'] for i in rng.choice(ids, size=min(3, len(ids)), replace=False)]
        c['msg'] = words; new.append(c)
    p.commits = new
    p.max_id = max(i for c in new for i, _ in c['ev'])
    return p


def same(a, b):
    return a.shape == b.shape and np.array_equal(a, b, equal_nan=True)


def test_features_ignore_the_future():
    for n in L.REPOS:
        r = repo(n)
        ks = [r.block_ids('train')[0], r.block_ids('train')[-1], r.block_ids('tune')[0], r.block_ids('tune')[-1], r.block_ids('test')[0]]
        for k in ks:
            b = r.block(k)
            if not len(b.tasks):
                continue
            pb = poisoned(r, b).block(k)
            assert [(t, s, list(x)) for t, s, x in pb.tasks] == [(t, s, list(x)) for t, s, x in b.tasks]
            F, G = U.base_features(b), U.base_features(pb)
            for c in U.BASE:
                assert same(F[c], G[c]), (n, k, c)
            e1 = EA.ease_scores(b, 90, True, [5.0]); e2 = EA.ease_scores(pb, 90, True, [5.0])
            assert same(e1[5.0], e2[5.0]), (n, k, 'EASE')
            # and the poison is real: the whole-history pair counts do change
            assert len(r.pairs()[0]) != len(poisoned(r, b).pairs()[0]) or k == r.block_ids()[-1]


def test_content_snapshot_before_cutoff():
    for n in L.REPOS:
        r = repo(n); ix = json.load(open(os.path.join(U.U4, 'snap', n, 'index.json')))
        for k in r.block_ids():
            seg = ix['segments'][ix['block_seg'][str(k)]]
            hend = r.blocks_meta[k]['hend']
            assert seg['hend'] <= hend
            if seg['hend'] > 0:
                assert seg['sha'] == r.commits[seg['hend'] - 1]['sha']
                assert r.commits[seg['hend'] - 1]['ct'] < r.blocks_meta[k]['cutoff_ct']
            split = r.blocks_meta[k]['split']
            if split != 'train':
                assert ix['block_seg'][str(k)] == split
        # a training segment never reads a snapshot taken in the tuning or held-out split
        tune_h = r.blocks_meta[r.block_ids('tune')[0]]['hend']
        assert all(s['hend'] < tune_h for name, s in ix['segments'].items() if name.startswith('train'))


# ---------------------------------------------------------------- 4. labels and tables
def test_tables_and_labels():
    import pandas as pd
    for n in L.REPOS:
        r = repo(n)
        for split in ('train', 'tune', 'test'):
            fs = glob.glob(os.path.join(U.U4, 'tables', n, split, '*.csv.gz'))
            ks = {int(os.path.basename(f).split('.')[0]) for f in fs}
            want = {k for k in r.block_ids(split)
                    if 'empty' not in np.load(os.path.join(U.U4, 'cache', n, '%d.npz' % k)).files}
            assert ks == want, (n, split)
        for split in ('train', 'tune'):
            k = r.block_ids(split)[-1]
            df = pd.read_csv(os.path.join(U.U4, 'tables', n, split, '%d.csv.gz' % k))
            b = r.block(k)
            Y = U.labels(b)
            assert np.array_equal(df['label'].values, Y[df['task'].values, df['cand'].values])
            assert (df['seed'].values != df['cand'].values).all()
            assert (df['seed'].values == b.seeds[df['task'].values]).all()
            assert np.array_equal(df['tie'].values.astype(np.float32), b.rnd[df['task'].values, df['cand'].values])
            if split == 'tune':
                assert (df.groupby('task').size().values == b.N - 1).all()          # every candidate
            for t in range(len(b.tasks)):                                          # every truth file is a row
                assert df[(df['task'] == t)]['label'].sum() == len(b.tasks[t][2])
        df = pd.read_csv(sorted(glob.glob(os.path.join(U.U4, 'tables', n, 'test', '*.csv.gz')))[0])
        assert df['label'].isna().all()                                            # held-out tables carry no truth
        for c in U.EMPTY:
            assert c in df.columns and df[c].isna().all()


# ---------------------------------------------------------------- 5. the untrained arms from the tables equal the card run
def test_untrained_arms_match_card_run():
    import pandas as pd
    for n in L.REPOS:
        r = repo(n); res = {a: {} for a in E.UNTRAINED}
        for k in r.block_ids('tune'):
            fp = os.path.join(U.U4, 'tables', n, 'tune', '%d.csv.gz' % k)
            if not os.path.exists(fp):
                assert not len(r.block(k).tasks); continue
            df = pd.read_csv(fp); b = r.block(k)
            for a in E.UNTRAINED:
                pc = U.per_commit_table(df['commit'].values, df['task'].values, df[a].values, df['tie'].values, df['label'].values)
                ref = L.per_commit(b, E.untrained_matrix(b, a))
                assert set(pc) == set(ref) and all(np.allclose(pc[t], ref[t], rtol=0, atol=1e-12) for t in ref), (n, k, a)
                res[a].update(pc)
        for a in E.UNTRAINED:
            m = float(np.mean([v[0] for v in res[a].values()]))
            assert abs(m - CH['tune'][n][a]) < 1e-12, (n, a, m, CH['tune'][n][a])


# ---------------------------------------------------------------- 6. scorer, EASE algebra, ranker input
def test_scorer_sees_an_oracle():
    r = repo('fixflow'); b = r.block(r.block_ids('tune')[0])
    Y = U.labels(b); T, N = Y.shape
    m = ~np.eye(N, dtype=bool)[b.seeds]
    ti, ci = np.nonzero(m)
    pc = U.per_commit_table(np.array([b.tasks[t][0] for t in ti]), ti, Y[ti, ci], b.rnd[ti, ci], Y[ti, ci])
    ref = L.per_commit(b, Y)
    assert all(np.allclose(pc[t], ref[t]) for t in ref)
    want = np.mean([np.mean([min(len(x), 10) / 10 for (t2, s, x) in b.tasks if t2 == t]) for t in ref])
    assert abs(np.mean([v[0] for v in pc.values()]) - want) < 1e-12 and want > 0.1


def test_ease_closed_form():
    rng = np.random.default_rng(3)
    X = (rng.random((40, 12)) < 0.25).astype(float); G = X.T @ X; lam = 2.0
    P = np.linalg.inv(G + lam * np.eye(12)); B = np.eye(12) - P / np.diag(P)[None, :]
    w, Q = np.linalg.eigh(G); d = 1 / (np.maximum(w, 0) + lam)
    Ps = (Q[[0, 5]] * d) @ Q.T; dP = (Q ** 2) @ d
    S = -Ps / dP[None, :]; S[0, 0] = 0; S[1, 5] = 0
    assert np.allclose(S, B[[0, 5]]) and np.allclose(np.diag(B), 0)


def test_ranker_input():
    import rank as RK
    for n in L.REPOS:
        tr = RK.table(n, 'train')
        assert set(tr['k'].unique()) <= set(repo(n).block_ids('train'))
        assert (np.diff(tr['qid'].values) >= 0).all()
        g = tr.groupby('qid').agg(pos=('label', 'sum'))
        assert (g['pos'] >= 1).all()
        tu = RK.table(n, 'tune')
        assert set(tu['k'].unique()) <= set(repo(n).block_ids('tune'))
        assert not set(tr['qid']) & set(tu['qid'])


if __name__ == '__main__':
    names = [k for k in sorted(globals()) if k.startswith('test_')]
    only = sys.argv[1:]
    bad = 0
    for k in names:
        if only and k not in only:
            continue
        try:
            globals()[k](); print('PASS', k, flush=True)
        except Exception as e:
            bad += 1; print('FAIL', k, repr(e)[:400], flush=True)
    print('all U4 tests passed' if not bad else '%d failed' % bad)
    sys.exit(1 if bad else 0)
