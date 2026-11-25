"""History signals for a block: A8 (past commits most like the query vote for the files they edited), co-change from
text seeds, edit count and last-edit age. Every signal of a block reads only commits with ct < the block's start
(History.prefix); time decay is measured from the block's snapshot."""
import os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import u1lib as L

K1, B = 1.2, 0.75


def clean_past_message(m):
    m = L.cardprep.TRAILER.sub('', m)
    m = re.sub(r'\(#\d+\)|#\d+', ' ', m)
    return m[:1000]


class History:
    def __init__(self, repo, rows=None):
        hist = rows if rows is not None else L.rdjsonl(f'{L.rdir(repo)}/history.jsonl.gz')
        hist = sorted(hist, key=lambda c: c['ct'])
        self.h = [c['h'] for c in hist]
        self.ct = np.array([c['ct'] for c in hist], dtype=np.int64)
        self.raw = [[(s, p) for s, p in c['files']] for c in hist]
        self.files = [sorted({p for s, p in c['files'] if L.cardprep.indexable(p)}) for c in hist]
        self.nfiles = np.array([max(len(f), 1) for f in self.files], dtype=np.float64)
        ti = L.TermIndex()
        for c in hist:
            ti.add(L.doc_tokens(clean_past_message(c['msg'])))
        ti.freeze()
        self.vocab, self.M, self.dl = ti.vocab, ti.m, ti.dl

    def prefix(self, t):
        """number of commits with ct < t (they are sorted by ct): the only commits a block starting at t may read."""
        return int(np.searchsorted(self.ct, t, side='left'))


def decay(age_s, hl_days):
    if hl_days is None:
        return np.ones_like(age_s, dtype=np.float64)
    return np.power(0.5, np.maximum(age_s, 0) / (hl_days * L.DAY))


def message_sims(H, n, terms):
    """BM25 (Lucene idf, k1 1.2, b 0.75) of the query terms against the first n commit messages."""
    tids = L.query_tids(H.vocab, terms)
    if n == 0 or not len(tids):
        return np.zeros(n)
    tf = H.M[:n][:, tids].toarray()
    dl = H.dl[:n]
    df = (tf > 0).sum(0)
    idf = L.IDF['lucene'](n, df)
    sat = tf * (K1 + 1) / (tf + K1 * (1 - B + B * dl / (dl.mean() or 1.0))[:, None])
    return sat @ idf


def a8_votes(H, blk, sims, n, K, hl):
    """vote(file) = sum over the K most similar past commits of similarity x 1/|files| x 0.5^(age/half-life)."""
    v = np.zeros(blk.N)
    if n == 0 or not sims.any():
        return L.listed(v)
    o = np.lexsort((-H.ct[:n], -sims))[:K]
    o = o[sims[o] > 0]
    w = sims[o] / H.nfiles[o] * decay(blk.snap_ct - H.ct[o], hl)
    for j, wj in zip(o, w):
        for p in H.files[j]:
            k = blk.pos.get(p)
            if k is not None:
                v[k] += wj
    return L.listed(v)


CO_HL = (None, 90, 365)


def cochange(H, blk, n):
    """file x file co-change over the block's history (card rule: statuses M, A, D; files in the snapshot; commits with
    2 to 30 such files), weight 1/|e| x decay; one matrix per half-life in CO_HL (None = no decay); diagonal zero."""
    import scipy.sparse as sp
    r, c, w, age = [], [], [], []
    k = 0
    for j in range(n):
        fs = sorted({blk.pos[p] for s, p in H.raw[j] if s in 'MAD' and p in blk.pos})
        if 1 < len(fs) <= 30:
            r.extend([k] * len(fs)); c.extend(fs)
            w.append(1.0 / len(fs)); age.append(blk.snap_ct - H.ct[j])
            k += 1
    out = {}
    if k == 0:
        for hl in CO_HL:
            out[hl] = sp.csr_matrix((blk.N, blk.N))
        return out
    W = sp.csr_matrix((np.ones(len(r)), (np.array(r), np.array(c))), shape=(k, blk.N))
    w, age = np.array(w), np.array(age, dtype=np.float64)
    for hl in CO_HL:
        d = w * decay(age, hl)
        C = (W.T @ sp.diags(d) @ W).tocsr()
        C.setdiag(0); C.eliminate_zeros()
        out[hl] = C
    return out


def co_scores(Cs, seeds):
    res = {}
    for hl, C in Cs.items():
        res[hl] = np.asarray(C[seeds].sum(0)).ravel() if len(seeds) else np.zeros(C.shape[0])
    return res


def edit_features(H, blk, n):
    """per file: number of history commits that touched it (any status) and days since the last one (NaN if none)."""
    ne = np.zeros(blk.N)
    last = np.full(blk.N, np.nan)
    for j in range(n):
        for s, p in H.raw[j]:
            k = blk.pos.get(p)
            if k is not None:
                ne[k] += 1
                last[k] = H.ct[j] if np.isnan(last[k]) else max(last[k], H.ct[j])
    return ne, (blk.snap_ct - last) / L.DAY
