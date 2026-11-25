"""CPU tests for U3 (unittest; run: run.sh cpu python -B -m unittest -v test_u3).
Route equivalence on a tiny random Qwen2 (same architecture and config keys as SweRankEmbed-Large)."""
import os, shutil, tempfile, unittest
import torch
import embedlib as E

MP = os.environ.get('U3_MODELS', '/models')


def tiny_dir():
    from transformers import Qwen2Config, Qwen2Model
    torch.manual_seed(0)
    cfg = Qwen2Config(vocab_size=300, hidden_size=64, intermediate_size=128, num_hidden_layers=2, num_attention_heads=4,
                      num_key_value_heads=2, max_position_embeddings=512, rope_theta=1000000.0)
    m = Qwen2Model(cfg).eval()
    for p in m.parameters():
        p.data.normal_(0, 0.2)
    d = tempfile.mkdtemp()
    m.save_pretrained(d)
    shutil.copy(f'{MP}/SweRankEmbed-Large/modeling_qwen.py', f'{d}/modeling_qwen.py')
    return d


def ids():
    g = torch.Generator().manual_seed(1)
    return [torch.randint(0, 250, (n,), generator=g).tolist() for n in (5, 17, 9, 30)]


class Routes(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.d = tiny_dir()

    def test_routes_agree_fp32_with_padding(self):
        a = E.load_route_a(self.d, dtype=torch.float32)
        b = E.load_route_b(self.d, dtype=torch.float32)
        x = ids()
        ea = E.embed_ids(a, x, 'cpu', pad=0); eb = E.embed_ids(b, x, 'cpu', pad=0)
        self.assertTrue(torch.allclose(ea, eb, atol=1e-4), (ea - eb).abs().max())

    def test_bidirectional_and_padding_invariant(self):
        b = E.load_route_b(self.d, dtype=torch.float32)
        x = ids()
        batch = E.embed_ids(b, x, 'cpu', pad=0)
        for i, t in enumerate(x):
            one = E.embed_ids(b, [t], 'cpu', pad=0)
            self.assertTrue(torch.allclose(batch[i], one[0], atol=1e-4))
        t = x[3]
        h1 = b(input_ids=torch.tensor([t]), attention_mask=torch.ones(1, len(t), dtype=torch.long), use_cache=False).last_hidden_state[0, 0]
        h2 = b(input_ids=torch.tensor([t[:10]]), attention_mask=torch.ones(1, 10, dtype=torch.long), use_cache=False).last_hidden_state[0, 0]
        self.assertFalse(torch.allclose(h1, h2, atol=1e-4))   # position 0 sees later tokens: not causal


if __name__ == '__main__':
    unittest.main()


import a4lib as A


class Listwise(unittest.TestCase):
    def test_window_schedule_matches_authors(self):
        self.assertEqual(A.windows(30, 10, 5), [(20, 30), (15, 25), (10, 20), (5, 15), (0, 10)])
        self.assertEqual(A.windows(20, 10, 5), [(10, 20), (5, 15), (0, 10)])
        self.assertEqual(A.windows(20, 20, 10), [(0, 20)])
        self.assertEqual(A.windows(30, 20, 10), [(10, 30), (0, 20)])
        self.assertEqual(A.windows(7, 10, 5), [(0, 7)])

    def test_parse_and_apply(self):
        self.assertEqual(A.parse('[3] > [1] > [2]', 3), [2, 0, 1])
        self.assertEqual(A.parse('[2] > [2] > [9]', 4), [1, 0, 2, 3])        # duplicate, out of range, missing
        self.assertEqual(A.parse('nonsense', 3), [0, 1, 2])
        self.assertEqual(A.parse('[10] > [1]', 10), [9, 0, 1, 2, 3, 4, 5, 6, 7, 8])
        o = list('abcdefgh')
        A.apply(o, 2, 6, [3, 2, 1, 0])
        self.assertEqual(''.join(o), 'abfedcgh')

    def test_prompt(self):
        m = A.user_message('q text', ['x [1] y', 'z'])
        self.assertIn('I will provide you with 2 code functions', m)
        self.assertIn('[1] x (1) y\n[2] z\n', m)
        self.assertTrue(m.endswith('do not say any word or explain.'))

    def test_scores_rank_based(self):
        s = A.rank_scores(['a', 'b', 'c'], 3, ['d', 'e'])
        self.assertTrue(s['a'] > s['b'] > s['c'] > 0 > s['d'] > s['e'])
