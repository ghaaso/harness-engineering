"""T2 probe: DIFF_BM25 score matrices [tasks, files] for every training and tuning block (held-out never built).
Query = identifier tokens of the seed's own diff in its task commit; document = identifier tokens of the candidate's content in
the tree of commits[hend-1] plus its path. BM25 k1 1.2, b 0.75, statistics over the block's alive files. See units/T2/SCORING.md.
usage: build_feat.py <repo> ...   -> /out/diff/<repo>/<k>.npy, /out/diff/<repo>/stats.json"""
import gzip, json, os, re, sys, time
import numpy as np
import scipy.sparse as sp
import d4lib as L

SRC = '/out/src'; OUT = '/out/diff'
K1, B = 1.2, 0.75
IDENT = re.compile(r'[A-Za-z_][A-Za-z0-9_]*')
CAMEL = re.compile(r'[A-Z]+(?=[A-Z][a-z])|[A-Z]?[a-z]+|[A-Z]+|[0-9]+')


def tokens(text):
    out = []
    for w in IDENT.findall(text):
        lw = w.lower()
        if len(lw) >= 3:
            out.append(lw)
        parts = [p for s in w.split('_') for p in CAMEL.findall(s)]
        if len(parts) > 1:
            out.extend(p.lower() for p in parts if len(p) >= 3)
    return out


class Vocab:
    def __init__(self):
        self.ix = {}

    def ids(self, toks, grow=True):
        if grow:
            return [self.ix.setdefault(t, len(self.ix)) for t in toks]
        return [self.ix[t] for t in toks if t in self.ix]


def bag(ids):
    if not ids:
        return np.zeros(0, np.int64), np.zeros(0, np.float64)
    u, c = np.unique(np.asarray(ids, np.int64), return_counts=True)
    return u, c.astype(np.float64)


def run(repo):
    t0 = time.time()
    d = os.path.join(SRC, repo); od = os.path.join(OUT, repo); os.makedirs(od, exist_ok=True)
    V = Vocab()
    docs = {}
    with gzip.open(os.path.join(d, 'docs.jsonl.gz'), 'rt', encoding='utf8') as f:
        for line in f:
            if line.strip():
                o = json.loads(line); docs[o['blob']] = bag(V.ids(tokens(o['text'])))
    trees = json.load(open(os.path.join(d, 'trees.json')))
    diffs = {}
    with gzip.open(os.path.join(d, 'diffs.jsonl.gz'), 'rt', encoding='utf8') as f:
        for line in f:
            if line.strip():
                o = json.loads(line); diffs[(o['k'], o['t'], o['seed'])] = o['diff']
    print(repo, 'docs', len(docs), 'diffs', len(diffs), 'vocab', len(V.ix), '%.0fs' % (time.time() - t0), flush=True)
    R = L.Repo(repo)
    stats = {}
    for k in R.block_ids('train') + R.block_ids('tune'):
        b = R.block(k)
        assert b.split in ('train', 'tune')
        tr = trees[str(k)]
        rows, cols, vals = [], [], []
        have = 0
        for n, (gid, p) in enumerate(zip(b.ids, b.paths)):
            pu, pc = bag(V.ids(tokens(p)))
            blob = tr.get(str(gid))
            if blob is not None:
                have += 1
                du, dc = docs[blob]
                u, inv = np.unique(np.r_[du, pu], return_inverse=True)
                c = np.bincount(inv, weights=np.r_[dc, pc])
            else:
                u, c = pu, pc
            rows.append(np.full(len(u), n)); cols.append(u); vals.append(c)
        nv = len(V.ix)
        TF = sp.csr_matrix((np.concatenate(vals), (np.concatenate(rows), np.concatenate(cols))), shape=(b.N, nv))
        dl = np.asarray(TF.sum(axis=1)).ravel(); avg = dl.mean() if b.N else 1.0
        df = np.bincount(TF.indices, minlength=nv)
        idf = np.log(1 + (b.N - df + 0.5) / (df + 0.5))
        TF = TF.tocoo()
        w = idf[TF.col] * TF.data * (K1 + 1) / (TF.data + K1 * (1 - B + B * dl[TF.row] / avg))
        W = sp.csr_matrix((w, (TF.row, TF.col)), shape=(b.N, nv))
        qr, qc = [], []
        empty = 0
        for r, (t, s, _) in enumerate(b.tasks):
            q = np.unique(np.asarray(V.ids(tokens(diffs[(k, t, b.ids[s])]), grow=False), np.int64))
            if len(q) == 0:
                empty += 1
            qr.append(np.full(len(q), r)); qc.append(q)
        Q = sp.csr_matrix((np.ones(sum(len(x) for x in qc)), (np.concatenate(qr), np.concatenate(qc))), shape=(len(b.tasks), nv))
        S = np.asarray((Q @ W.T).todense(), dtype=np.float32)
        np.save(os.path.join(od, '%d.npy' % k), S)
        stats[k] = dict(split=b.split, N=b.N, tasks=len(b.tasks), docs_with_content=have, empty_queries=empty)
    json.dump(stats, open(os.path.join(od, 'stats.json'), 'w'), indent=0)
    tot = lambda f: sum(v[f] for v in stats.values())
    print(repo, 'blocks', len(stats), 'tasks', tot('tasks'), 'empty queries', tot('empty_queries'),
          'content coverage %.3f' % (tot('docs_with_content') / tot('N')), '%.0fs' % (time.time() - t0), flush=True)


if __name__ == '__main__':
    for r in sys.argv[1:]:
        run(r)
