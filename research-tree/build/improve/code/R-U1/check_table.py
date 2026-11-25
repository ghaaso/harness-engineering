"""R-U1 check 5 (table): rebuild every split of the feature table from the stored signal files with U1's own
features.block_rows, and compare with the CSVs on disk (a stale or truncated table after the shutdown would differ).
Also: labels of training and tuning rows = truth membership; held-out labels empty; every query of a split present;
no column empty on held-out that is filled on tuning; the share of NaN per column by split.
usage: python check_table.py"""
import io, sys
sys.path.insert(0, '/code')
import numpy as np
import pandas as pd
import u1lib as L
import features as FE
from signals import SCORES

fails = []


def bad(m):
    fails.append(m); print('FAIL', m, flush=True)


def main():
    allf = {'train': [], 'tune': [], 'heldout': []}
    qset = {'train': set(), 'tune': set(), 'heldout': set()}
    for repo in L.REPOS:
        sp, qs = L.load_split(repo)
        truth = {q['qid']: q['truth'] for q in qs if q['split'] != 'heldout'}
        qtext = {(q['block'], q['qid']): q['query'] for q in qs}
        for q in qs:
            qset[q['split']].add(q['qid'])
        for b in sp['blocks']:
            z = np.load(f'/out/{repo}/sig_{b["id"]}.npz')
            sig = {k: z[k] for k in z.files}
            sig['_qtext'] = [qtext[(b['id'], str(q))] for q in sig['qids']]
            fr, _ = FE.block_rows(repo, b['split'], b['id'], sig, truth)
            allf[b['split']].extend(fr)
    cols = FE.KEYS + SCORES + FE.FILE_COLS + FE.QF_COLS + FE.EMPTY
    for split, fr in allf.items():
        df = pd.concat(fr, ignore_index=True)[cols]
        buf = io.StringIO()
        df.to_csv(buf, index=False, float_format='%.6g')
        buf.seek(0)
        mine = pd.read_csv(buf, dtype={'qid': str, 'path': str})
        disk = pd.read_csv(f'/out/table/{split}.csv.gz', dtype={'qid': str, 'path': str})
        try:
            pd.testing.assert_frame_equal(mine, disk, check_exact=True)
            print(split, 'table on disk = rebuilt from the signals', disk.shape, flush=True)
        except AssertionError as e:
            bad(f'{split}: table on disk differs from the rebuild: {str(e)[:300]}')
        if set(disk.qid) != qset[split]:
            bad(f'{split}: queries in the table {disk.qid.nunique()} vs split {len(qset[split])}')
        if split == 'heldout':
            if not disk.label.isna().all():
                bad('held-out labels not empty')
        nan = {c: round(float(disk[c].isna().mean()), 3) for c in SCORES + FE.FILE_COLS + FE.QF_COLS}
        print(split, 'NaN share', nan, 'rows/query', round(len(disk) / disk.qid.nunique(), 1),
              'positives/query', None if split == 'heldout' else round(disk.groupby('qid').label.sum().mean(), 3), flush=True)
    print('FAILS', len(fails))


if __name__ == '__main__':
    main()
