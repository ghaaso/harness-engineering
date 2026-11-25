"""Write A5's columns (s_a5_qwen3ft, s_a5_swerankft) of U1's feature tables for the tuning and held-out rows only.
Train rows stay empty: the models saw those queries. Other columns and U1's other files are not touched; the table is
rewritten through a temp file and a check that every other column is byte-identical in value.
usage: python fill_table.py   (CPU)  reads /out/final/<repo>/dense_<tag>ft.npz, edits /u1data-copy: see UOUT"""
import gzip, os, shutil, sys
import numpy as np
import pandas as pd

TAGS = {'qwen3': 's_a5_qwen3ft', 'swerank': 's_a5_swerankft'}
FINAL = os.environ.get('U2_FINAL', '/out/final')
TABLE = os.environ.get('U2_TABLE', '/u1table')     # CR/improve/U1/table, mounted read-write for this step only
REPOS = ['fixflow', 'clinic', 'zulip']


def lookups(tag):
    """(repo, split, qid, path) -> score"""
    out = {}
    for r in REPOS:
        z = np.load(f'{FINAL}/{r}/dense_{tag}ft.npz')
        for blk, split in (('tune', 'tune'), ('heldout', 'heldout')):
            qids = [str(x) for x in z[blk + '_qids']]
            paths = [str(x) for x in z[blk + '_paths']]
            out[(r, split)] = (dict(zip(qids, range(len(qids)))), dict(zip(paths, range(len(paths)))), z[blk])
    return out


def fill(df, tag, col, lk):
    vals = np.full(len(df), np.nan)
    for (r, split), (qi, pi, M) in lk.items():
        m = ((df['repo'] == r) & (df['split'] == split)).to_numpy()
        sub = df.loc[m]
        a = sub['qid'].astype(str).map(qi).to_numpy()
        b = sub['path'].map(pi).to_numpy()
        assert not (pd.isna(a).any() or pd.isna(b).any()), f'{r} {split}: a row not in the score matrix'
        vals[m] = M[a.astype(int), b.astype(int)]
    df[col] = vals


def main():
    for split in ('tune', 'heldout'):
        p = f'{TABLE}/{split}.csv.gz'
        df = pd.read_csv(p)
        before = df.drop(columns=list(TAGS.values())).copy()
        for tag, col in TAGS.items():
            fill(df, tag, col, lookups(tag))
        assert df.drop(columns=list(TAGS.values())).equals(before)
        assert df[list(TAGS.values())].notna().all().all()
        tmp = p + '.tmp'   # 2026-11-25 (review r57-0097, text B1): the .tmp name made pandas write plain text under the .gz name
        df.to_csv(tmp, index=False, float_format='%.6g', compression='gzip')
        assert open(tmp, 'rb').read(2) == bytes([0x1f, 0x8b]), 'temp table is not gzip'
        chk = pd.read_csv(tmp, compression='gzip')
        assert chk.shape == df.shape and list(chk.columns) == list(df.columns)
        os.replace(tmp, p)
        print(split, df.shape, 'filled', list(TAGS.values()), flush=True)


if __name__ == '__main__':
    main()
