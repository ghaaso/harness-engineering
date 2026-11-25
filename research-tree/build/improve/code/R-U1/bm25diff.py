"""R-U1: why U1's held-out BM25 copy orders some FixFlow top-10 lists differently from the card's file (no truth)."""
import json, sys
sys.path.insert(0, '/code')
import numpy as np, u1lib as L
repo = sys.argv[1]
z = np.load(f'/out/{repo}/sig_heldout.npz'); paths = [str(p) for p in z['paths']]; pos = {p: i for i, p in enumerate(paths)}
card = {r['qid']: dict((p, s) for p, s in r['scores']) for r in map(json.loads, open(f'/cr/{repo}/rank_bm25.jsonl'))}
rel, ties32, ties64 = 0.0, 0, 0
for qi, q in enumerate(str(x) for x in z['qids']):
    c = card[q]; s = z['s_bm25'][qi]
    for p, v in c.items():
        rel = max(rel, abs(v - float(s[pos[p]])) / abs(v))
    c10 = L.cardcommon.rank_files(q, c, paths)[:11]
    v64 = [c[p] for p in c10 if p in c]; v32 = [np.float32(c[p]) for p in c10 if p in c]
    ties64 += len(v64) - len(set(v64)); ties32 += len(v32) - len(set(v32))
print(repo, 'max relative score diff', rel, 'ties in the card top-11 at float64', ties64, 'at float32', ties32)
