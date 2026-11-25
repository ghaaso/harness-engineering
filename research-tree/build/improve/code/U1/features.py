"""Step 3: the feature table per query and candidate, for training, tuning and held-out.

Candidates of a query = the union of the top CAND_K files of each of CAND_FROM (listed files only; never the truth).
Writes /out/table/<split>.csv.gz with: repo, split, block, qid, path, label (1 = an edited file; empty on held-out),
the score columns of signals.py (unlisted text / vote scores as 0), n_edits, age_days (empty = no earlier edit), kind,
the path-token overlap columns, and empty columns for later units (EMPTY). Also /out/table/recall.json: the share of
training and tuning queries with an edited file among their candidates."""
import os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import pandas as pd
import u1lib as L
from signals import SCORES

CAND_FROM = ['s_a7', 's_bm25f', 's_chunk', 's_qwen3', 's_swerank', 's_a8', 'co_inv']
CAND_K = 100
FILE_COLS = ['n_edits', 'age_days', 'kind']
QF_COLS = ['po_count', 'po_frac', 'name_count']
EMPTY = ['s_a4_rerank', 's_a5_qwen3ft', 's_a5_swerankft', 's_a6_swerank_large']
ZERO_IF_UNLISTED = ['s_bm25', 's_bm25f', 's_chunk', 's_a7', 's_a8']
KEYS = ['repo', 'split', 'block', 'qid', 'path', 'label']


def candidates(sig, qi, tk):
    c = set()
    for k in CAND_FROM:
        s = sig[k][qi].astype(np.float64)
        if k.startswith('co_') or k == 's_a8':
            s = np.where(s > 0, s, np.nan)
        o = L.order(s, tk)[:CAND_K]
        c.update(int(j) for j in o if not np.isnan(s[j]))
    return sorted(c)


def block_rows(repo, split, bid, sig, truth_by_qid):
    paths = list(sig['paths'])
    pterms = [L.path_terms(p) for p in paths]
    nterms = [L.path_terms(p.rsplit('/', 1)[-1]) for p in paths]
    frames, rec = [], []
    qtext = sig['_qtext']
    for qi, qid in enumerate(sig['qids']):
        tk = L.tiekeys(str(qid), paths)
        cand = candidates(sig, qi, tk)
        qset = set(L.qterms(qtext[qi]))
        d = {'repo': repo, 'split': split, 'block': bid, 'qid': str(qid), 'path': [paths[j] for j in cand]}
        if split == 'heldout':
            d['label'] = [np.nan] * len(cand)
        else:
            t = set(truth_by_qid[str(qid)])
            d['label'] = [1 if paths[j] in t else 0 for j in cand]
            rec.append(any(paths[j] in t for j in cand))
        for k in SCORES:
            v = sig[k][qi][cand].astype(np.float64)
            if k in ZERO_IF_UNLISTED:
                v = np.nan_to_num(v, nan=0.0)
            d[k] = v
        for k in FILE_COLS:
            d[k] = sig[k][cand]
        d['po_count'] = [len(qset & pterms[j]) for j in cand]
        d['po_frac'] = [len(qset & pterms[j]) / max(len(pterms[j]), 1) for j in cand]
        d['name_count'] = [len(qset & nterms[j]) for j in cand]
        for k in EMPTY:
            d[k] = np.nan
        frames.append(pd.DataFrame(d))
    return frames, rec


def main():
    os.makedirs(f'{L.OUT}/table', exist_ok=True)
    allf = {'train': [], 'tune': [], 'heldout': []}
    recall = {}
    for repo in L.REPOS:
        t = time.time()
        sp, qs = L.load_split(repo)
        truth = {q['qid']: q['truth'] for q in qs if q['split'] != 'heldout'}
        qtext = {(q['block'], q['qid']): q['query'] for q in qs}
        for b in sp['blocks']:
            p = f'{L.rdir(repo)}/sig_{b["id"]}.npz'
            if not os.path.exists(p):
                continue
            z = np.load(p)
            sig = {k: z[k] for k in z.files}
            sig['_qtext'] = [qtext[(b['id'], str(q))] for q in sig['qids']]
            fr, rec = block_rows(repo, b['split'], b['id'], sig, truth)
            allf[b['split']].extend(fr)
            if rec:
                recall.setdefault(repo, {}).setdefault(b['split'], []).extend(rec)
        print(f'{repo} {time.time() - t:.0f} s', flush=True)
    cols = None
    for split, fr in allf.items():
        df = pd.concat(fr, ignore_index=True)
        cols = KEYS + SCORES + FILE_COLS + QF_COLS + EMPTY
        df = df[cols]
        df.to_csv(f'{L.OUT}/table/{split}.csv.gz', index=False, float_format='%.6g')
        print(split, df.shape, 'queries', df.qid.nunique(), 'rows/query', round(len(df) / max(df.qid.nunique(), 1)), flush=True)
    rr = {r: {s: dict(share=float(np.mean(v)), n=len(v)) for s, v in d.items()} for r, d in recall.items()}
    L.wrjson(f'{L.OUT}/table/recall.json', rr)
    print(rr)


if __name__ == '__main__':
    main()
