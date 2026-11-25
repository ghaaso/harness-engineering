"""T3 measurement 1 (row 16): T2's DIFF_BM25 rebuilt with every diff line dropped that names an alive candidate (whole identifier
token = a candidate's file stem, or a path-like token = a candidate's path with or without extension). Training and tuning blocks
only (held-out never built). Documents, tokens and BM25 exactly T2's (imported from /t2code/build_feat.py).
usage: m1_feat.py <repo> ...  -> /t3/m1/diffm/<repo>/<k>.npy, /t3/m1/diffm/<repo>/stats.json (incl. naming shares on tuning)"""
import gzip, json, os, re, sys, time
import numpy as np
import scipy.sparse as sp
sys.path.insert(0, '/t2code')
import build_feat as BF
import d4lib as L

SRC = '/t2/src'; OUT = '/t3/m1/diffm'
PATHTOK = re.compile(r'[A-Za-z0-9_.\-/]+')


def stem(p):
    b = p.rsplit('/', 1)[-1]
    return b.rsplit('.', 1)[0].lower() if '.' in b else b.lower()


class Namer:
    """For one block: does a line name any alive file in `ids` (local indices)?"""
    def __init__(self, b):
        self.stems = [stem(p) for p in b.paths]
        self.paths = [p.lower() for p in b.paths]
        self.noext = [p.rsplit('.', 1)[0] if '.' in p.rsplit('/', 1)[-1] else p for p in self.paths]
        self.by_stem, self.by_path = {}, {}
        for n in range(b.N):
            if len(self.stems[n]) >= 3:
                self.by_stem.setdefault(self.stems[n], set()).add(n)
            for q in (self.paths[n], self.noext[n]):
                self.by_path.setdefault(q, set()).add(n)

    def named(self, line):
        """local indices of files the line names."""
        out = set()
        for w in BF.IDENT.findall(line):
            out |= self.by_stem.get(w.lower(), set())
        for w in PATHTOK.findall(line):
            w = w.lower().lstrip('./')
            if '/' in w:
                parts = w.split('/')
                for i in range(len(parts) - 1):          # any suffix of the path-like token that is a whole path
                    out |= self.by_path.get('/'.join(parts[i:]), set())
        return out


def run(repo):
    t0 = time.time()
    d = os.path.join(SRC, repo); od = os.path.join(OUT, repo); os.makedirs(od, exist_ok=True)
    V = BF.Vocab(); docs = {}
    with gzip.open(os.path.join(d, 'docs.jsonl.gz'), 'rt', encoding='utf8') as f:
        for line in f:
            if line.strip():
                o = json.loads(line); docs[o['blob']] = BF.bag(V.ids(BF.tokens(o['text'])))
    trees = json.load(open(os.path.join(d, 'trees.json')))
    diffs = {}
    with gzip.open(os.path.join(d, 'diffs.jsonl.gz'), 'rt', encoding='utf8') as f:
        for line in f:
            if line.strip():
                o = json.loads(line); diffs[(o['k'], o['t'], o['seed'])] = o['diff']
    R = L.Repo(repo); stats = {}
    for k in R.block_ids('train') + R.block_ids('tune'):
        b = R.block(k); assert b.split in ('train', 'tune')
        tr = trees[str(k)]; rows, cols, vals = [], [], []
        for n, (gid, p) in enumerate(zip(b.ids, b.paths)):
            pu, pc = BF.bag(V.ids(BF.tokens(p)))
            blob = tr.get(str(gid))
            if blob is not None:
                du, dc = docs[blob]; u, inv = np.unique(np.r_[du, pu], return_inverse=True); c = np.bincount(inv, weights=np.r_[dc, pc])
            else:
                u, c = pu, pc
            rows.append(np.full(len(u), n)); cols.append(u); vals.append(c)
        nv = len(V.ix)
        TF = sp.csr_matrix((np.concatenate(vals), (np.concatenate(rows), np.concatenate(cols))), shape=(b.N, nv))
        dl = np.asarray(TF.sum(axis=1)).ravel(); avg = dl.mean() if b.N else 1.0
        df = np.bincount(TF.indices, minlength=nv); idf = np.log(1 + (b.N - df + 0.5) / (df + 0.5))
        TF = TF.tocoo(); w = idf[TF.col] * TF.data * (BF.K1 + 1) / (TF.data + BF.K1 * (1 - BF.B + BF.B * dl[TF.row] / avg))
        W = sp.csr_matrix((w, (TF.row, TF.col)), shape=(b.N, nv))
        nm = Namer(b); qr, qc = [], []
        st = dict(split=b.split, tasks=len(b.tasks), lines=0, dropped=0, empty_after=0, names_truth=0, names_any=0, truth=0, truth_named=0)
        for r, (t, s, truth) in enumerate(b.tasks):
            keep, any_named, truth_named = [], False, set()
            for ln in diffs[(k, t, b.ids[s])].split('\n'):
                hit = nm.named(ln) - {s}
                st['lines'] += 1
                if hit:
                    st['dropped'] += 1; any_named = True; truth_named |= hit & set(truth.tolist())
                else:
                    keep.append(ln)
            st['names_any'] += any_named; st['names_truth'] += bool(truth_named)
            st['truth'] += len(truth); st['truth_named'] += len(truth_named)
            q = np.unique(np.asarray(V.ids(BF.tokens('\n'.join(keep)), grow=False), np.int64))
            st['empty_after'] += len(q) == 0
            qr.append(np.full(len(q), r)); qc.append(q)
        Q = sp.csr_matrix((np.ones(sum(len(x) for x in qc)), (np.concatenate(qr), np.concatenate(qc))), shape=(len(b.tasks), nv))
        np.save(os.path.join(od, '%d.npy' % k), np.asarray((Q @ W.T).todense(), dtype=np.float32))
        stats[k] = st
    json.dump(stats, open(os.path.join(od, 'stats.json'), 'w'), indent=0)
    for sp_ in ('train', 'tune'):
        v = [x for x in stats.values() if x['split'] == sp_]
        tot = lambda f: sum(x[f] for x in v)
        print(repo, sp_, 'tasks', tot('tasks'), 'lines dropped %.3f' % (tot('dropped') / max(1, tot('lines'))),
              'tasks naming any candidate %.3f' % (tot('names_any') / tot('tasks')), 'tasks naming a truth file %.3f' % (tot('names_truth') / tot('tasks')),
              'truth files named %.3f' % (tot('truth_named') / tot('truth')), 'empty after mask', tot('empty_after'), '%.0fs' % (time.time() - t0), flush=True)


if __name__ == '__main__':
    for r in sys.argv[1:]:
        run(r)
