"""U2 tests (run: run.sh cpu python -B -m unittest -v test_u2; pytest is not in the image, pytest also collects these).
The key test: no training pair comes from a commit at or after the tuning split's start, and no pool snapshot or
commit of a pool's group is later than the pair; tuning and held-out queries are never training queries."""
import json, os, unittest
import numpy as np
import u1lib as L
import mkpairs as MP

OUT = '/out'


class TestPairs(unittest.TestCase):
    def repos(self):
        return [r for r in L.REPOS if os.path.exists(f'{OUT}/pairs/{r}/pairs.jsonl')]

    def test_have_data(self):
        self.assertEqual(sorted(self.repos()), sorted(L.REPOS))

    def test_no_pair_at_or_after_tuning_start(self):
        for r in self.repos():
            sp = L.rdjson(f'{L.rdir(r)}/split.json')
            tb = [b for b in sp['blocks'] if b['id'] == 'tune'][0]
            t_tune = sp['t_tune']
            self.assertEqual(t_tune, tb['t_block'])
            tuning_commits = {q['commit'] for q in L.rdjsonl(f'{L.rdir(r)}/queries.jsonl') if q['block'] in ('tune', 'heldout')}
            n = 0
            for l in open(f'{OUT}/pairs/{r}/pairs.jsonl', encoding='utf-8'):
                p = json.loads(l); n += 1
                self.assertLess(p['ct'], t_tune, r)
                self.assertLess(p['snap_ct'], p['ct'], r)          # the negatives' pool predates the commit
                self.assertNotIn(p['commit'], tuning_commits)
            self.assertGreater(n, 100)

    def test_pairs_by_git_history(self):
        """each commit's ct from the history file the split wrote (ct < t0 only), independent of pairs.jsonl's own field."""
        for r in self.repos():
            sp = L.rdjson(f'{L.rdir(r)}/split.json')
            ct = {h['h']: h['ct'] for h in L.rdjsonl(f'{L.rdir(r)}/history.jsonl.gz')}
            for l in open(f'{OUT}/pairs/{r}/pairs.jsonl', encoding='utf-8'):
                p = json.loads(l)
                self.assertLess(ct[p['commit']], sp['t_tune'])

    def test_pool_and_positive_chunks(self):
        for r in self.repos():
            pools = np.load(f'{OUT}/pairs/{r}/pools.npz')
            for l in list(open(f'{OUT}/pairs/{r}/pairs.jsonl', encoding='utf-8'))[:300]:
                p = json.loads(l)
                self.assertGreaterEqual(len(p['negs']), 3)
                pool = set(pools[f'pool_{p["pool"]}'].tolist())
                for j in p['negs']:
                    self.assertIn(j, pool)
                    self.assertNotEqual(j, p['pos'])

    def test_negatives_not_from_edited_files(self):
        r = 'fixflow'
        paths = {}
        import gzip
        for l in gzip.open(f'{OUT}/pairs/{r}/chunks.jsonl.gz', 'rt', encoding='utf-8'):
            x = json.loads(l); paths[x['id']] = x['path']
        for l in open(f'{OUT}/pairs/{r}/pairs.jsonl', encoding='utf-8'):
            p = json.loads(l)
            for j in p['negs']:
                self.assertNotEqual(paths[j], p['pos_path'])


class TestBm25(unittest.TestCase):
    def test_bm25_top_orders_by_match(self):
        import scipy.sparse as sp
        M = sp.csr_matrix(np.array([[3, 0], [1, 0], [0, 5], [0, 0]], dtype=np.float32)).tocsc()
        dl = np.array([4., 4., 6., 2.])
        o = MP.bm25_top(M, dl, np.array([0]))
        self.assertEqual(list(o), [0, 1])


class TestTable(unittest.TestCase):
    def test_fill_keeps_other_columns(self):
        import pandas as pd, fill_table as F
        df = pd.DataFrame(dict(repo=['a', 'a'], split=['tune', 'tune'], qid=['q', 'q'], path=['x', 'y'], other=[1, 2]))
        lk = {('a', 'tune'): ({'q': 0}, {'x': 0, 'y': 1}, np.array([[0.5, 0.25]]))}
        F.fill(df, 'qwen3', 'c', lk)
        self.assertEqual(list(df['c']), [0.5, 0.25]); self.assertEqual(list(df['other']), [1, 2])


if __name__ == '__main__':
    unittest.main()
