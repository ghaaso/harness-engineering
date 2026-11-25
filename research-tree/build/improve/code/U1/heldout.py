"""After the refuter's breaking findings are fixed: the held-out ranking files of A7, A8, A3 and A2, NOT scored.
Format as the card run's (one JSON line per query: {"qid", "scores": [[path, score], ...]}), one file per arm per
repository: /out/heldout/<repo>/rank_<a7|a8|a3|a2>.jsonl. Only unit U7 scores them. Nothing here reads held-out truth
(the split keeps none; the table's held-out label column is empty).
usage: python heldout.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import u1lib as L
import cardfmt
import ltr

ROOT = f'{L.OUT}/heldout'


def main():
    for repo in L.REPOS:
        sp, qs = L.load_split(repo)
        assert all(q['truth'] is None for q in qs if q['split'] == 'heldout')
        cardfmt.write_ranks(repo, 'heldout', ROOT)
        for arm in ('bm25py', 'bm25f', 'chunk', 'qwen3', 'swerank'):
            os.remove(f'{ROOT}/{repo}/rank_{arm}.jsonl')   # only the unit's arms are written
    df, pred = ltr.predict('a2', 'heldout')
    ltr.write_rankings('a2', df, pred, root=ROOT)
    for repo in L.REPOS:
        want = [q['qid'] for q in L.load_heldout_queries(repo)]
        for arm in ('a7', 'a8', 'a3', 'a2'):
            got = [r['qid'] for r in L.rdjsonl(f'{ROOT}/{repo}/rank_{arm}.jsonl')]
            assert sorted(got) == sorted(want), f'{repo} {arm}: held-out queries missing or extra'
        print(repo, 'written', flush=True)


if __name__ == '__main__':
    main()
