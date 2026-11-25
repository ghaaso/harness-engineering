"""Tuning-split metrics (the card's Acc@10 and P@2, same order rule as common.rank_files via u1lib) and ranking files in the
card's format. Truth is read only for the tuning block; held-out rows have none."""
import os, sys
sys.path.insert(0, os.environ.get('U1_CODE', '/u1'))
import numpy as np
import u1lib as L

TOPK = 300


def tune_truth(repo):
    sp, qs = L.load_split(repo)
    return {q['qid']: q['truth'] for q in qs if q['block'] == 'tune'}


def repo_metrics(M, qids, paths, truth):
    """M [nq, nfiles] (NaN = unlisted) -> (Acc@10, P@2, n)."""
    idx = {p: i for i, p in enumerate(paths)}
    acc, p2 = [], []
    for k, q in enumerate(qids):
        tm = np.zeros(len(paths), dtype=bool)
        for t in truth[q]:
            if t in idx:
                tm[idx[t]] = True
        a, p, _ = L.qmetrics(M[k].astype(np.float64), L.tiekeys(q, paths), tm)
        acc.append(a); p2.append(p)
    return float(np.mean(acc)), float(np.mean(p2)), len(qids)


def macro(per_repo):
    return float(np.mean([v[0] for v in per_repo.values()])), float(np.mean([v[1] for v in per_repo.values()]))


def write_rank(path, M, qids, paths, topk=TOPK):
    rows = []
    for k, q in enumerate(qids):
        o = L.order(M[k].astype(np.float64), L.tiekeys(q, paths))[:topk]
        rows.append(dict(qid=q, scores=[[paths[j], float(M[k][j])] for j in o if not np.isnan(M[k][j])]))
    L.wrjsonl(path, rows)
