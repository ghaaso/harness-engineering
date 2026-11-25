"""R-U1 check 3 (no truth opened): the card run's untrained arms against U1's copies of them on the held-out queries.
For BM25, Qwen3 and SweRank: the top 10 of the card's held-out ranking file (common.rank_files over the card's index)
against the top 10 of U1's stored held-out signal (same tie rule). Reports identical top-10 lists and mean overlap.
Then a dry run of U1's held-out writer (heldout.py) on a scratch copy, to check the path runs and covers every query;
the files it writes are deleted at the end and are never scored.
usage: python heldout_arms.py compare|dryrun"""
import json, os, shutil, sys
sys.path.insert(0, '/code')
import numpy as np
import u1lib as L


def compare():
    for repo in L.REPOS:
        z = np.load(f'/out/{repo}/sig_heldout.npz')
        paths = [str(p) for p in z['paths']]
        card_universe = [json.loads(l)['path'] for l in open(f'/cr/{repo}/files.jsonl', encoding='utf-8')]
        assert sorted(card_universe) == sorted(paths)
        qids = [str(q) for q in z['qids']]
        for arm, key in (('bm25', 's_bm25'), ('qwen3', 's_qwen3'), ('swerank', 's_swerank')):
            card = {r['qid']: dict((p, s) for p, s in r['scores']) for r in map(json.loads, open(f'/cr/{repo}/rank_{arm}.jsonl'))}
            same, ov, top1 = 0, [], 0
            for qi, q in enumerate(qids):
                c10 = L.cardcommon.rank_files(q, card[q], card_universe)[:10]
                s = z[key][qi].astype(np.float64)
                m10 = [paths[j] for j in L.order(s, L.tiekeys(q, paths))[:10]]
                same += c10 == m10
                top1 += c10[0] == m10[0]
                ov.append(len(set(c10) & set(m10)) / 10)
            print(repo, arm, 'identical top-10', same, 'of', len(qids), 'same top-1', top1, 'mean top-10 overlap', round(float(np.mean(ov)), 4), flush=True)


def dryrun():
    dst = '/w/ho_out'
    shutil.rmtree(dst, ignore_errors=True)
    for r in L.REPOS:
        os.makedirs(f'{dst}/{r}')
        for f in ('split.json', 'queries.jsonl', 'sig_heldout.npz'):
            shutil.copy(f'/out/{r}/{f}', f'{dst}/{r}/')
    os.makedirs(f'{dst}/tune'); os.makedirs(f'{dst}/models/a2'); os.makedirs(f'{dst}/table')
    for f in ('a2.json', 'a3.json'):
        shutil.copy(f'/out/tune/{f}', f'{dst}/tune/')
    shutil.copy('/out/models/a2/pooled.txt', f'{dst}/models/a2/')
    shutil.copy('/out/table/heldout.csv.gz', f'{dst}/table/')
    L.OUT = dst
    import heldout
    heldout.main()
    for r in L.REPOS:
        for arm in ('a7', 'a8', 'a3', 'a2'):
            rows = L.rdjsonl(f'{dst}/heldout/{r}/rank_{arm}.jsonl')
            n = [len(x['scores']) for x in rows]
            fin = all(np.isfinite(s) for x in rows for _, s in x['scores'])
            print(r, arm, 'queries', len(rows), 'listed files per query min/median', min(n), int(np.median(n)), 'finite', fin)
    shutil.rmtree(dst)
    print('scratch held-out files deleted (never scored)')


if __name__ == '__main__':
    dict(compare=compare, dryrun=dryrun)[sys.argv[1]]()
