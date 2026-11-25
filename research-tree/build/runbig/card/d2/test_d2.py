import json, os, subprocess, sys, tempfile, unittest
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
import common, prep, grep_rrf, score


class T(unittest.TestCase):
    def test_clean_message_removes_paths_and_trailers(self):
        m = 'Fix crash in src/app/views.py handler (#12)\n\nviews.py breaks when empty.\nSigned-off-by: A <a@b>'
        c = prep.clean_message(m, ['src/app/views.py'])
        self.assertNotIn('views.py', c); self.assertNotIn('Signed-off', c); self.assertNotIn('#12', c)
        self.assertIn('crash', c)

    def test_clean_message_removes_extensionless_stem(self):
        c = prep.clean_message("test_microsoft_teams_importer: Fix check that never ran.", ["zerver/tests/test_microsoft_teams_importer.py"])
        self.assertNotIn("test_microsoft_teams_importer", c); self.assertIn("never ran", c)

    def test_indexable(self):
        self.assertTrue(prep.indexable('a/b.py'))
        self.assertFalse(prep.indexable('locale/de/x.py'))
        self.assertFalse(prep.indexable('package-lock.json'))
        self.assertFalse(prep.indexable('img.png'))

    def test_split_point(self):
        self.assertEqual(prep.split_point(100, 0.4, 250), 60)
        self.assertEqual(prep.split_point(1000, 0.4, 250), 750)

    def test_ties_fixed_and_shared(self):
        u = ['a', 'b', 'c', 'd']
        r1 = common.rank_files('q1', {'a': 1.0, 'b': 1.0}, u)
        r2 = common.rank_files('q1', {'a': 1.0, 'b': 1.0}, u)
        self.assertEqual(r1, r2)
        self.assertEqual(set(r1[:2]), {'a', 'b'})  # listed above unlisted
        self.assertEqual(set(r1[2:]), {'c', 'd'})
        orders = {tuple(common.rank_files(f'q{i}', {}, u)) for i in range(40)}
        self.assertGreater(len(orders), 5)  # not always the same tie order

    def test_metrics(self):
        r = ['x', 'a', 'y'] + [f'f{i}' for i in range(20)]
        self.assertEqual(score.metrics(r, ['a', 'zz']), (1.0, 0.5, 0.5))
        self.assertEqual(score.metrics(r, ['zz']), (0.0, 0.0, 0.0))

    def test_grep_scores(self):
        s = grep_rrf.grep_scores(['alpha', 'beta'], {'p': 'alpha alpha beta', 'q': 'alpha', 'r': 'nothing'})
        self.assertGreater(s['p'], s['q']); self.assertNotIn('r', s)

    def test_rrf_seeds_then_cochange_then_bm25(self):
        adj = grep_rrf.cograph([['a', 'b'], ['a', 'b'], ['a', 'c']])
        r = grep_rrf.rrf_scores(adj, ['a'], {'a': 5.0, 'z': 4.0})
        order = [p for p, _ in sorted(r.items(), key=lambda x: -x[1])]
        self.assertEqual(order, ['a', 'b', 'c', 'z'])

    def test_bootstrap_ci_brackets_mean(self):
        x = np.array([1.0] * 30 + [0.0] * 70)
        m, lo, hi = score.boot_ci([x, x, x])
        self.assertAlmostEqual(m, 0.3); self.assertLess(lo, 0.3); self.assertGreater(hi, 0.3)

    def test_prep_no_leak(self):
        with tempfile.TemporaryDirectory() as d:
            env = dict(os.environ, GIT_AUTHOR_NAME='t', GIT_AUTHOR_EMAIL='t@t', GIT_COMMITTER_NAME='t', GIT_COMMITTER_EMAIL='t@t')

            def g(*a, **k):
                e = dict(env, **k)
                subprocess.run(['git', '-C', d, *a], check=True, capture_output=True, env=e)
            g('init', '-q', '-b', 'main')
            files = [f'm{i}.py' for i in range(5)]
            for f in files:
                open(f'{d}/{f}', 'w').write('x = 1\n')
            g('add', '.'); g('commit', '-qm', 'initial files', GIT_COMMITTER_DATE='2020-01-01T00:00:00', GIT_AUTHOR_DATE='2020-01-01T00:00:00')
            for i in range(20):
                f = files[i % 5]
                open(f'{d}/{f}', 'a').write(f'y{i} = {i}\n')
                if i == 15:
                    open(f'{d}/late_new.py', 'w').write('z = 1\n')
                    g('add', 'late_new.py')
                g('add', f)
                day = 2 + i
                g('commit', '-qm', f'change number {i} in module {f} to handle widgets correctly',
                  GIT_COMMITTER_DATE=f'2020-02-{day:02d}T00:00:00', GIT_AUTHOR_DATE=f'2020-02-{day:02d}T00:00:00')
            out = os.path.join(d, 'out')
            subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), 'prep.py'), '--repo', d, '--name', 't', '--out', out], check=True, capture_output=True)
            meta = json.load(open(f'{out}/meta.json'))
            qs = [json.loads(l) for l in open(f'{out}/queries.jsonl')]
            fl = [json.loads(l) for l in open(f'{out}/files.jsonl')]
            self.assertEqual(len(qs), 8)  # 40 % of 20
            self.assertTrue(all(q['ct'] >= meta['first_heldout_ct'] for q in qs))
            for q in qs:
                for t in q['truth']:
                    self.assertNotIn(t, q['query'])
            # the index is the cutoff tree: it holds no content added by held-out commits
            for f in fl:
                self.assertNotIn('y19 =', f['text'])
            cooc = json.load(open(f'{out}/cooc.json'))
            self.assertTrue(all('late_new.py' not in c for c in cooc))


if __name__ == '__main__':
    unittest.main()
