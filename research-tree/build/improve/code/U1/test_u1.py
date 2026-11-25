"""U1 tests. Run in the container: `python -m unittest -v test_u1` from /code (pytest is not in d2-embed-gpu:3; these are
unittest cases, which pytest also collects). The Real* cases read the outputs under /out and are skipped when absent."""
import gzip, json, os, subprocess, sys, tempfile, unittest
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import pandas as pd
import u1lib as L
import split as S
import histarms as HA
import textarms as TA
import fusion as F
import ltr


def git_repo(d, n=60):
    env = dict(os.environ, GIT_AUTHOR_NAME='t', GIT_AUTHOR_EMAIL='t@t', GIT_COMMITTER_NAME='t', GIT_COMMITTER_EMAIL='t@t')

    def g(*a, **k):
        subprocess.run(['git', '-C', d, *a], check=True, capture_output=True, env=dict(env, **k))
    g('init', '-q', '-b', 'main')
    files = [f'm{i}.py' for i in range(5)]
    def append(p, s, mode='a'):
        with open(p, mode) as fh:
            fh.write(s)
    for f in files:
        append(f'{d}/{f}', 'x = 1\n', 'w')
    g('add', '.'); g('commit', '-qm', 'initial files', GIT_COMMITTER_DATE='2020-01-01T00:00:00', GIT_AUTHOR_DATE='2020-01-01T00:00:00')
    for i in range(n):
        f, f2 = files[i % 5], files[(i + 1) % 5]
        append(f'{d}/{f}', f'marker{i} = {i}\n')
        append(f'{d}/{f2}', f'other{i} = {i}\n')
        g('add', f, f2)
        ts = f'2020-{2 + i // 28:02d}-{1 + i % 28:02d}T00:00:00'
        g('commit', '-qm', f'change number {i} handles widgets and gadgets correctly now', GIT_COMMITTER_DATE=ts, GIT_AUTHOR_DATE=ts)


class SyntheticSplit(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        d = cls.tmp.name
        os.makedirs(f'{d}/repo')
        git_repo(f'{d}/repo')
        cls.out = f'{d}/out'
        cls.sp = S.build('t', f'{d}/repo', None, cls.out, train_max=20)
        cls.qs = L.rdjsonl(f'{cls.out}/queries.jsonl')
        cls.items = L.rdjsonl(f'{cls.out}/items.jsonl.gz')
        cls.hist = L.rdjsonl(f'{cls.out}/history.jsonl.gz')
        cls.log = {c['h']: c for c in L.cardprep.read_log(f'{d}/repo', 'main')}

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_sizes(self):
        sp = self.sp
        self.assertEqual(sp['candidates'], 60)
        self.assertEqual(sp['heldout_candidates'], 24)          # min(40 %, 250), the card's split
        self.assertEqual(sp['pre_cutoff'], 36)
        self.assertEqual(sp['tune_size'], 10)                    # min(int(30 %), 150)
        self.assertEqual(sp['training'], 20)                     # train_max
        self.assertEqual([b['candidates'] for b in sp['blocks'] if b['split'] == 'train'], [10, 10])

    def test_tuning_and_training_before_heldout_and_disjoint(self):
        sp = self.sp
        tune = [q for q in self.qs if q['split'] == 'tune']
        train = [q for q in self.qs if q['split'] == 'train']
        self.assertTrue(all(sp['t_tune'] <= q['ct'] < sp['t0'] for q in tune))
        self.assertTrue(all(q['ct'] < sp['t_tune'] for q in train))      # no training commit at or after the tuning start
        self.assertFalse({q['commit'] for q in tune} & {q['commit'] for q in train})

    def test_snapshot_holds_nothing_from_its_block_or_later(self):
        for b in self.sp['blocks']:
            if b['split'] == 'heldout':
                continue
            text = '\n'.join(self.items[i]['text'] for i in b['items'])
            for c in self.log.values():
                if c['ct'] >= b['t_block'] and c['msg'].startswith('change number'):
                    i = int(c['msg'].split()[2])
                    self.assertNotIn(f'marker{i} =', text, f'{b["id"]} snapshot holds commit {i}')
            self.assertLess(b['snap_ct'], b['t_block'])

    def test_truth_in_snapshot_and_not_in_query(self):
        for q in self.qs:
            if q['split'] == 'heldout':
                continue
            b = [x for x in self.sp['blocks'] if x['id'] == q['block']][0]
            paths = {self.items[i]['path'] for i in b['items']}
            self.assertTrue(set(q['truth']) <= paths)
            self.assertTrue(set(q['truth']) <= {p for st, p in self.log[q['commit']]['files'] if st == 'M'})

    def test_votes_cochange_and_edits_read_only_earlier_commits(self):
        H = HA.History('t', rows=self.hist)
        for b in self.sp['blocks']:
            n = H.prefix(b['t_block'])
            self.assertTrue((H.ct[:n] < b['t_block']).all())
            self.assertTrue(n == len(H.ct) or H.ct[n] >= b['t_block'])
            bq = [q for q in self.qs if q['block'] == b['id']]
            self.assertFalse({q['commit'] for q in bq} & set(H.h[:n]))   # no query's own commit votes
        # a vote can only reach files through commits in the prefix: with an empty prefix nothing is voted
        blk = type('B', (), {})()
        blk.N, blk.pos, blk.snap_ct = 5, {f'm{i}.py': i for i in range(5)}, 0
        v = HA.a8_votes(H, blk, np.zeros(0), 0, 10, None)
        self.assertTrue(np.isnan(v).all())

    def test_history_stops_before_heldout(self):
        self.assertTrue(all(c['ct'] < self.sp['t0'] for c in self.hist))


class Scorer(unittest.TestCase):
    def test_fast_order_equals_card_rank_files_and_metrics(self):
        rng = np.random.default_rng(0)
        paths = [f'p{i}' for i in range(60)]
        for t in range(50):
            s = rng.integers(0, 4, 60).astype(float)
            s[rng.random(60) < 0.4] = np.nan
            qid = f'q{t}'
            truth = list(rng.choice(paths, 2, replace=False))
            card = L.cardcommon.rank_files(qid, {p: v for p, v in zip(paths, s) if not np.isnan(v)}, paths)
            mine = [paths[j] for j in L.order(s, L.tiekeys(qid, paths))]
            self.assertEqual(card, mine)
            tm = np.array([p in truth for p in paths])
            self.assertEqual(L.cardscore.metrics(card, truth), L.qmetrics(s, L.tiekeys(qid, paths), tm))

    def test_card_bm25_formula(self):
        ti = L.TermIndex()
        for d in ['alpha beta beta', 'beta gamma', 'delta']:
            ti.add(L.doc_tokens(d))
        ti.freeze()
        tids = L.query_tids(ti.vocab, ['beta'])
        tb = ti.m[:, tids].toarray()
        c = TA.bm25_contrib(tb, np.zeros_like(tb), ti.dl, np.zeros(3), 1.2, 0.75, 1.0, 'fts5', 'card')
        N, n, avg = 3, 2, 2.0
        idf = max(np.log((N - n + 0.5) / (n + 0.5)), 1e-6)
        want = [idf * 2 * 2.2 / (2 + 1.2 * (0.25 + 0.75 * 3 / avg)), idf * 1 * 2.2 / (1 + 1.2 * (0.25 + 0.75 * 2 / avg)), 0.0]
        np.testing.assert_allclose(c[:, 0], want)

    def test_function_chunks(self):
        src = 'import os\n\nclass A:\n    x = 1\n    def f(self):\n        return 1\n\ndef g():\n    pass\n'
        ch = L.function_chunks('a/b.py', src)
        self.assertTrue(all(c.startswith('a/b.py\n') for c in ch))
        self.assertTrue(any('def f' in c and 'def g' not in c for c in ch))
        self.assertTrue(any('def g' in c and 'def f' not in c for c in ch))
        self.assertTrue(any('import os' in c for c in ch))


class Fusion(unittest.TestCase):
    def test_simplex(self):
        self.assertEqual(len(F.WEIGHTS), 66)
        self.assertTrue(all(abs(sum(w) - 1) < 1e-9 and min(w) >= 0 for w in F.WEIGHTS))
        self.assertIn((1.0, 0.0, 0.0), F.WEIGHTS)

    def test_normalise(self):
        x = np.array([1.0, 3.0, 2.0])
        np.testing.assert_allclose(F.normalise(x, 'mm', 0), [0, 1, 0.5])
        self.assertAlmostEqual(F.normalise(x, 'z', 0).mean(), 0)
        np.testing.assert_allclose(F.normalise(np.array([0.0, 0.5]), 'tmm', -1.0), [2 / 3, 1.0])
        np.testing.assert_allclose(F.normalise(np.ones(3), 'mm', 0), 0)

    def test_corner_weight_is_the_single_arm_and_rrf_prefers_agreement(self):
        paths = [f'p{i}' for i in range(6)]
        tk = L.tiekeys('q', paths)
        sig = {'s_a7': np.array([[5.0, 4, 3, np.nan, np.nan, 1]]), 's_qwen3': np.array([[0.1, 0.9, 0.8, 0.7, 0.2, 0.3]]),
               's_swerank': np.array([[0.2, 0.9, 0.1, 0.5, 0.3, 0.4]])}
        s = F.fused(sig, 0, dict(kind='convex', norm='mm', w=[1.0, 0.0, 0.0]), tk)
        self.assertEqual(list(np.argsort(-s)[:3]), [0, 1, 2])
        r = F.fused(sig, 0, dict(kind='rrf', k=10), tk)
        self.assertEqual(int(np.argmax(r)), 1)     # second in text, first in both dense lists

    def test_fit_pooled_vs_per_repo_and_folds(self):
        # repo a prefers config 0, repo b config 1; per repository picks each, pooled one for both
        M = {'a': np.zeros((10, len(F.CONFIGS), 2)), 'b': np.zeros((10, len(F.CONFIGS), 2))}
        M['a'][:, 0, 0] = 1; M['b'][:, 1, 0] = 1; M['b'][:5, 0, 0] = 1
        rows = {r: np.arange(10) for r in M}
        self.assertEqual(F.fit(M, rows, 'convex-per-repo'), {'a': 0, 'b': 1})
        self.assertEqual(F.fit(M, rows, 'convex-pooled'), {'a': 0, 'b': 0})
        fo = F.folds(37)
        self.assertEqual(sorted(np.concatenate(fo).tolist()), list(range(37)))
        cv = F.cross_validate(M)
        self.assertEqual(set(cv), set(F.FAMILIES))


class Ranker(unittest.TestCase):
    def table(self, nq=12, nc=8, seed=0):
        rng = np.random.default_rng(seed)
        rows = []
        for q in range(nq):
            for c in range(nc):
                rows.append(dict(repo='fixflow', qid=f'q{q}', path=f'p{c}', label=int(c == q % nc), s_a7=float(c == q % nc) + rng.random(),
                                 co_inv=rng.random(), kind=int(rng.integers(0, 3)), n_edits=float(rng.integers(0, 5))))
        return pd.DataFrame(rows)

    def test_derive_and_groups(self):
        df = self.table()
        feats = ltr.derive(df, ['s_a7', 'co_inv', 'kind', 'n_edits'])
        self.assertEqual(feats, ['s_a7', 'co_inv', 'kind', 'n_edits', 's_a7_rank', 's_a7_rel', 'co_inv_rank', 'co_inv_rel'])
        g = ltr.groups(df)
        self.assertEqual(g.sum(), len(df)); self.assertEqual(len(g), 12)
        self.assertTrue((df.groupby('qid').s_a7_rel.max() == 1).all())
        self.assertEqual(df.groupby('qid').s_a7_rank.min().max(), 1)
        bad = pd.concat([df.iloc[:3], df.iloc[20:23], df.iloc[3:5]])
        with self.assertRaises(AssertionError):
            ltr.groups(bad)

    def test_train_predict_shapes(self):
        import lightgbm as lgb
        tr, tu = self.table(40, 8, 1), self.table(10, 8, 2)
        feats = ltr.derive(tr, ['s_a7', 'co_inv', 'kind']); ltr.derive(tu, ['s_a7', 'co_inv', 'kind'])
        m, best, nd = ltr.train_one(lgb, tr[feats], tr.label, ltr.groups(tr), tu[feats], tu.label, ltr.groups(tu),
                                    dict(num_leaves=7, learning_rate=0.1, min_data_in_leaf=5))
        p = m.predict(tu[feats], num_iteration=best)
        self.assertEqual(p.shape, (len(tu),))
        self.assertGreaterEqual(best, min(ltr.MIN_TREES, m.num_trees()))
        top = tu.assign(p=p).sort_values(['qid', 'p'], ascending=[True, False]).groupby('qid').head(1)
        self.assertGreater(top.label.mean(), 0.8)


def _have(p):
    return os.path.exists(p)


@unittest.skipUnless(_have(f'{L.OUT}/fixflow/split.json'), 'no U1 outputs')
class RealOutputs(unittest.TestCase):
    def test_split_rules_on_the_three_repositories(self):
        for repo in L.REPOS:
            sp, qs = L.load_split(repo)
            tune = [q for q in qs if q['split'] == 'tune']
            train = [q for q in qs if q['split'] == 'train']
            ho = [q for q in qs if q['split'] == 'heldout']
            self.assertTrue(all(sp['t_tune'] <= q['ct'] < sp['t0'] for q in tune), repo)
            self.assertTrue(all(q['ct'] < sp['t_tune'] for q in train), repo)
            self.assertFalse({q['qid'] for q in tune} & {q['qid'] for q in train})
            self.assertTrue(all(q['truth'] is None for q in ho))
            self.assertLessEqual(len({q['commit'] for q in train}), L.TRAIN_MAX)
            for b in sp['blocks']:
                self.assertLess(b['snap_ct'], b['t_block'], (repo, b['id']))
                bq = [q for q in qs if q['block'] == b['id']]
                self.assertTrue(all(q['ct'] >= b['t_block'] for q in bq), (repo, b['id']))

    @unittest.skipUnless(_have(f'{L.OUT}/fixflow/sig_tune.npz'), 'no signals')
    def test_signals_read_history_before_their_block(self):
        for repo in L.REPOS:
            sp, qs = L.load_split(repo)
            H = HA.History(repo)
            for b in sp['blocks']:
                p = f'{L.rdir(repo)}/sig_{b["id"]}.npz'
                if not os.path.exists(p):
                    continue
                n = int(np.load(p)['history_n'])
                self.assertTrue(n == 0 or H.ct[n - 1] < b['t_block'], (repo, b['id']))
                self.assertTrue(n == len(H.ct) or H.ct[n] >= b['t_block'], (repo, b['id']))
                commits = {q['commit'] for q in qs if q['block'] == b['id']}
                self.assertFalse(commits & set(H.h[:n]), (repo, b['id']))

    @unittest.skipUnless(_have(f'{L.OUT}/table/heldout.csv.gz'), 'no table')
    def test_table_labels_and_splits(self):
        ho = pd.read_csv(f'{L.OUT}/table/heldout.csv.gz', usecols=['qid', 'label', 'split'])
        self.assertTrue(ho.label.isna().all())
        tr = pd.read_csv(f'{L.OUT}/table/train.csv.gz', usecols=['qid', 'split'])
        tu = pd.read_csv(f'{L.OUT}/table/tune.csv.gz', usecols=['qid', 'split'])
        self.assertFalse(set(tr.qid) & set(tu.qid))
        self.assertFalse(set(tr.qid) & set(ho.qid))
        self.assertEqual(set(tr.split), {'train'})


if __name__ == '__main__':
    unittest.main()
