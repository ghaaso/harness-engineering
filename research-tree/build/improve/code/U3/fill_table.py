"""Write A4's and A6's columns (s_a4_rerank, s_a6_swerank_large) of U1's feature tables for the tuning and held-out rows only
(train rows stay empty: neither arm is computed on U1's training blocks; A1 is fitted on tuning). Every other column is
read back and checked unchanged (U2 fills its own columns in the same files: the file is re-read just before the write and
replaced through a temp file).
  s_a4_rerank: (K - position) / K for the files of A2's top K after the rerank, 0 for every other row.
  s_a6_swerank_large: the chosen aggregation of chunk cosines (a6.py score), defined for every row.
usage: python fill_table.py   (container with the table folder mounted read-write at /u1table: run.sh cpurw)"""
import os
import numpy as np
import pandas as pd

OUT = os.environ.get('U3_OUT', '/out')
TABLE = os.environ.get('U3_TABLE', '/u1table')
REPOS = ['fixflow', 'clinic', 'zulip']
COLS = {'a4': 's_a4_rerank', 'a6': 's_a6_swerank_large'}


def lookup(tag, split):
    out = {}
    for r in REPOS:
        p = f'{OUT}/{tag}/{tag}_{r}_{split}.npz' if tag == 'a6' else f'{OUT}/a4/a4_{r}_{split}.npz'
        if not os.path.exists(p):
            return None
        z = np.load(p)
        M = z['M'].astype(np.float64)
        if tag == 'a4':
            M = np.where(M > 0, M, 0.0)
        out[r] = ({str(q): i for i, q in enumerate(z['qids'])}, {str(x): i for i, x in enumerate(z['paths'])}, M)
    return out


def fill(df, col, lk, split):
    vals = np.full(len(df), np.nan)
    for r, (qi, pi, M) in lk.items():
        m = ((df['repo'] == r) & (df['split'] == split)).to_numpy()
        sub = df.loc[m]
        a = sub['qid'].astype(str).map(qi)
        b = sub['path'].map(pi)
        assert not (a.isna().any() or b.isna().any()), f'{r} {split} {col}: a row is not in the score matrix'
        vals[m] = M[a.astype(int).to_numpy(), b.astype(int).to_numpy()]
    df[col] = vals


def main():
    for split in ('tune', 'heldout'):
        todo = {}
        for tag, col in COLS.items():
            lk = lookup(tag, split)
            if lk is None:
                print(split, tag, 'scores not there yet, column left as it is', flush=True)
            else:
                todo[col] = lk
        if not todo:
            continue
        p = f'{TABLE}/{split}.csv.gz'
        df = pd.read_csv(p)
        before = df.drop(columns=list(todo)).copy()
        for col, lk in todo.items():
            fill(df, col, lk, split)
            assert df[col].notna().all()
        assert df.drop(columns=list(todo)).equals(before)
        tmp = p + '.u3.tmp'   # 2026-11-25 (review r57-0097, text B1): the .tmp name made pandas write plain text under the .gz name
        df.to_csv(tmp, index=False, float_format='%.6g', compression='gzip')
        assert open(tmp, 'rb').read(2) == bytes([0x1f, 0x8b]), 'temp table is not gzip'
        chk = pd.read_csv(tmp, compression='gzip')
        assert chk.shape == df.shape and list(chk.columns) == list(df.columns)
        os.replace(tmp, p)
        print(split, df.shape, 'filled', list(todo), flush=True)


if __name__ == '__main__':
    main()
