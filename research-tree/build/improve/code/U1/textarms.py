"""A7 text search over a block's snapshot: the card's BM25 (FTS5 form), BM25F with a path field, RM3, and a
tree-sitter function-chunk index (file score = best chunk). One shared vocabulary per repository, items = distinct
(path, blob) of all snapshots; a Block is the rows of one snapshot."""
import os, pickle, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import u1lib as L


class Index:
    def __init__(self, repo):
        items = L.load_items(repo)
        self.paths = [it['path'] for it in items]
        self.body = L.TermIndex()
        self.path = L.TermIndex(self.body.vocab)
        self.chunk = L.TermIndex(self.body.vocab)
        self.item_chunks = []
        for it in items:
            self.body.add(L.doc_tokens(it['text']))
            self.path.add(L.doc_tokens(it['path']))
            ids = []
            for c in L.function_chunks(it['path'], it['text']):
                ids.append(len(self.chunk.lens))
                self.chunk.add(L.doc_tokens(c))
            self.item_chunks.append(ids)
        self.body.freeze(); self.path.freeze(); self.chunk.freeze()
        # vocabulary grew while the chunk index was built: widen the earlier matrices to the same columns
        import scipy.sparse as sp
        nv = len(self.body.vocab)
        for t in (self.body, self.path, self.chunk):
            if t.m.shape[1] < nv:
                t.m = sp.csr_matrix((t.m.data, t.m.indices, t.m.indptr), shape=(t.m.shape[0], nv))
        self.inv = [None] * nv
        for t, j in self.body.vocab.items():
            self.inv[j] = t


def get_index(repo):
    p = f'{L.rdir(repo)}/tindex.pkl'
    if os.path.exists(p):
        with open(p, 'rb') as f:
            return pickle.load(f)
    ix = Index(repo)
    with open(p, 'wb') as f:
        pickle.dump(ix, f, protocol=pickle.HIGHEST_PROTOCOL)
    return ix


class Block:
    def __init__(self, ix, b):
        self.id = b['id']
        self.rows = np.array(b['items'], dtype=np.int64)
        self.paths = [ix.paths[i] for i in self.rows]
        self.pos = {p: k for k, p in enumerate(self.paths)}
        self.N = len(self.rows)
        self.Brow = ix.body.m[self.rows]
        self.B = self.Brow.tocsc()
        self.P = ix.path.m[self.rows].tocsc()
        self.dlb = ix.body.dl[self.rows]
        self.dlp = ix.path.dl[self.rows]
        self.df_body = np.diff(self.B.indptr)
        self.vocab, self.inv = ix.body.vocab, ix.inv
        crow, cown = [], []
        for k, i in enumerate(self.rows):
            crow.extend(ix.item_chunks[i]); cown.extend([k] * len(ix.item_chunks[i]))
        self.C = ix.chunk.m[np.array(crow, dtype=np.int64)].tocsc()
        self.cdl = ix.chunk.dl[np.array(crow, dtype=np.int64)]
        self.cown = np.array(cown, dtype=np.int64)
        self.cstart = np.searchsorted(self.cown, np.arange(self.N))
        self.snap_ct = b['snap_ct']
        self.t_block = b['t_block']

    def tids(self, terms):
        return L.query_tids(self.vocab, terms)

    def cols(self, tids):
        return self.B[:, tids].toarray(), self.P[:, tids].toarray()


def bm25_contrib(tb, tp, dlb, dlp, k1, b, pathw, idf, mode):
    """per-term contributions [N, T] (see u1lib.bm25f_terms)."""
    N = tb.shape[0]
    if tb.shape[1] == 0:
        return np.zeros((N, 0))
    n = ((tb + tp) > 0).sum(0)
    w = L.IDF[idf](N, n)
    if mode == 'card':
        tf = tb + tp
        dl = dlb + dlp
        norm = np.maximum(1 - b + b * dl / (dl.mean() or 1.0), 1e-9)[:, None]  # an empty file at b = 1 has tf 0
        sat = tf * (k1 + 1) / (tf + k1 * norm)
    else:
        nb = np.maximum(1 - b + b * dlb / (dlb.mean() or 1.0), 1e-9)[:, None]
        npth = np.maximum(1 - b + b * dlp / (dlp.mean() or 1.0), 1e-9)[:, None]
        tf = tb / nb + pathw * tp / npth
        sat = tf * (k1 + 1) / (tf + k1)
    return sat * w[None, :]


CARD = dict(mode='card', k1=1.2, b=0.75, pathw=1.0, idf='fts5')


def file_score(blk, terms, cfg, weights=None, cached=None):
    """BM25 (card) or BM25F file scores; NaN = unlisted (no term matched)."""
    tids = blk.tids(terms) if cached is None else cached[0]
    if not len(tids):
        return np.full(blk.N, np.nan)
    tb, tp = blk.cols(tids) if cached is None else cached[1:]
    c = bm25_contrib(tb, tp, blk.dlb, blk.dlp, cfg['k1'], cfg['b'], cfg.get('pathw', 1.0), cfg['idf'], cfg['mode'])
    s = c.sum(1) if weights is None else c @ weights
    return L.listed(s)


def chunk_score(blk, terms, cfg, cached=None):
    """BM25 over the function chunks of the snapshot (path in each chunk); file score = best chunk; NaN = unlisted."""
    tids = blk.tids(terms) if cached is None else cached
    if not len(tids):
        return np.full(blk.N, np.nan)
    tc = blk.C[:, tids].toarray()
    c = bm25_contrib(tc, np.zeros_like(tc), blk.cdl, np.zeros_like(blk.cdl), cfg['k1'], cfg['b'], 0.0, cfg['idf'], 'card')
    s = c.sum(1)
    f = np.maximum.reduceat(s, blk.cstart) if len(s) else np.zeros(blk.N)
    return L.listed(f)


def rm3_score(blk, terms, base_cfg, fb_docs, fb_terms, lam, maxdf=0.1, base=None):
    """RM3 over the BM25F base run: P(w|R) from the top fb_docs files' term vectors weighted by their normalised score;
    expansion terms pass the query-term filter and occur in at most maxdf of the snapshot's files; the expanded query
    (lam x original, 1 - lam x expansion) is scored with the same BM25F."""
    if base is None:
        base = file_score(blk, terms, base_cfg)
    s = np.nan_to_num(base, nan=0.0)
    qt = [t for t in terms if t in blk.vocab]
    if not qt:
        return base
    top = np.argsort(-s, kind='stable')[:fb_docs]
    top = top[s[top] > 0]
    if not len(top):
        return base
    ws = s[top] / s[top].sum()
    rel = {}
    for d, wd in zip(top, ws):
        row = blk.Brow[d]
        tot = row.data.sum() or 1.0
        for j, c in zip(row.indices, row.data):
            rel[j] = rel.get(j, 0.0) + wd * c / tot
    cand = []
    for j, v in rel.items():
        t = blk.inv[j]
        if len(t) < 3 or t in L.cardcommon.STOP or not L.QTERM.match(t) or t.isdigit():
            continue
        if blk.df_body[j] > maxdf * blk.N:
            continue
        cand.append((-v, t))
    cand.sort()
    cand = cand[:fb_terms]
    z = sum(-v for v, _ in cand) or 1.0
    q = {t: lam / len(qt) for t in qt}
    for v, t in cand:
        q[t] = q.get(t, 0.0) + (1 - lam) * (-v) / z
    ts = list(q)
    return file_score(blk, ts, base_cfg, weights=np.array([q[t] for t in ts]))


def a7_score(blk, terms, frozen, base=None):
    """the frozen A7 arm: frozen = {'form': 'bm25f'|'rm3'|'chunk', 'bm25f': cfg, 'rm3': {...}, 'chunk': cfg}."""
    if frozen['form'] == 'chunk':
        return chunk_score(blk, terms, frozen['chunk'])
    if frozen['form'] == 'rm3':
        r = frozen['rm3']
        return rm3_score(blk, terms, frozen['bm25f'], r['fb_docs'], r['fb_terms'], r['lam'], r.get('maxdf', 0.1), base)
    return file_score(blk, terms, frozen['bm25f']) if base is None else base


def file_form_score(blk, terms, frozen):
    """the file-level text feature: BM25F, or its RM3 form if RM3 beat BM25F on tuning."""
    base = file_score(blk, terms, frozen['bm25f'])
    if frozen.get('file_form') == 'rm3':
        r = frozen['rm3']
        return rm3_score(blk, terms, frozen['bm25f'], r['fb_docs'], r['fb_terms'], r['lam'], r.get('maxdf', 0.1), base)
    return base
