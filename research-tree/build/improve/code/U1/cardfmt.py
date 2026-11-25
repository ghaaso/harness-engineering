"""The tuning split in the card run's data format, so that the card's own code runs on it unchanged: bm25.mjs gives the
BM25 reference and score.py scores every arm (same scorer as held-out).
usage: python cardfmt.py data | ranks
  data : /out/cardfmt/<repo>/files.jsonl (the tuning snapshot) and queries.jsonl (tuning queries with their truth)
  ranks: /out/cardfmt/<repo>/rank_<arm>.jsonl for bm25py (the Python copy of the card's BM25), bm25f, chunk, a7, a8,
         qwen3, swerank (signals) and a3 (fusion.py's frozen form); a2 is written by ltr.py.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import u1lib as L

ROOT = f'{L.OUT}/cardfmt'
SIG_ARMS = {'bm25py': 's_bm25', 'bm25f': 's_bm25f', 'chunk': 's_chunk', 'a7': 's_a7', 'a8': 's_a8', 'qwen3': 's_qwen3', 'swerank': 's_swerank'}


def rows_from(qids, paths, M):
    out = []
    for qid, v in zip(qids, M):
        keep = ~np.isnan(v)
        out.append(dict(qid=str(qid), scores=[[paths[j], float(v[j])] for j in np.flatnonzero(keep)]))
    return out


def write_ranks(repo, block, root):
    import fusion
    z = np.load(f'{L.rdir(repo)}/sig_{block}.npz')
    paths = [str(p) for p in z['paths']]
    for arm, key in SIG_ARMS.items():
        M = z[key].astype(np.float64)
        if key == 's_a8':
            M = np.where(M > 0, M, np.nan)
        L.wrjsonl(f'{root}/{repo}/rank_{arm}.jsonl', rows_from(z['qids'], paths, M))
    a3 = L.rdjson(f'{L.OUT}/tune/a3.json')['frozen'][repo]
    sig = {k: z[k] for k in fusion.ARMS}
    M = np.stack([fusion.fused(sig, qi, a3, L.tiekeys(str(q), paths)) for qi, q in enumerate(z['qids'])])
    L.wrjsonl(f'{root}/{repo}/rank_a3.jsonl', rows_from(z['qids'], paths, M))


def main():
    mode = sys.argv[1]
    for repo in L.REPOS:
        if mode == 'data':
            sp, qs = L.load_split(repo)
            items = L.load_items(repo)
            b = [x for x in sp['blocks'] if x['id'] == 'tune'][0]
            L.wrjsonl(f'{ROOT}/{repo}/files.jsonl', [dict(path=items[i]['path'], text=items[i]['text']) for i in b['items']])
            L.wrjsonl(f'{ROOT}/{repo}/queries.jsonl', [dict(qid=q['qid'], commit=q['commit'], ct=q['ct'], query=q['query'], truth=q['truth'])
                                                      for q in qs if q['block'] == 'tune'])
        else:
            write_ranks(repo, 'tune', ROOT)
        print(repo, mode, 'done', flush=True)


if __name__ == '__main__':
    main()
