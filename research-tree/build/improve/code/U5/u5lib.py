"""U5 (B4): an inductive GNN link predictor in plain torch for D4 (files that change together with a seed file).
Graph of one block = facts of commits[:hend] only (strictly before the block's cutoff, d4lib.py:70): co-change edges weighted
by decayed count, import edges (the block's alive imports), folder edges (same folder). Node features = frozen file
embeddings of the split-start snapshot (U4's snap index; hend of the snapshot <= the block's hend) or structural degrees.
Pair head over the two node vectors plus U4's count features of the pair (from U4's per-block caches).
Run inside the container (see run_cpu.sh / run_gpu.sh)."""
import json, os, time
import numpy as np
import torch, torch.nn as nn, torch.nn.functional as Fn
import d4lib as L
import u4lib as U

OUT = os.environ.get('U5_OUT', '/out')
DEV = torch.device('cuda' if (os.environ.get('U5_DEVICE', 'cuda') == 'cuda' and torch.cuda.is_available()) else 'cpu')
HLS = {'hl30': 30, 'hl90': 90, 'hl365': 365, 'raw': None}     # edge weight: decayed count (half-life days), plain count; 'bin' = 1

# ---- pair features: U4's count features only (no TEXT, RRF, PPR, EASE, CONTENT_COS: those are other arms' scores)
LOG = ['PC', 'DEC7', 'DEC30', 'DEC90', 'DEC180', 'DEC365', 'INV', 'INV7', 'INV30', 'INV90', 'INV180', 'INV365']
AGE = ['LAST_CO_DAYS', 'CAND_AGE_DAYS', 'CAND_LAST_DAYS']
OTHER = ['CONF_SC', 'CONF_CS', 'CAND_NCHG', 'SEED_NCHG', 'SAME_STEM', 'TEST_PAIR', 'FOLDER_DIST', 'IMP_SC', 'IMP_CS']
QRATIO = ['PC', 'INV365', 'DEC90']                              # value / the task's maximum over its candidates
PAIR_NAMES = LOG + AGE + ['%s_ind' % a for a in AGE] + OTHER + ['%s_Q' % q for q in QRATIO]
P = len(PAIR_NAMES)


def pair_X(D, ti, ci):
    """[n, P] float32 for the cells (ti, ci) of one block's feature dict D (cache of U4: [T, N] arrays)."""
    cols = []
    for c in LOG:
        cols.append(np.log1p(np.maximum(D[c][ti, ci].astype(np.float64), 0)))
    inds = []
    for c in AGE:
        v = D[c][ti, ci].astype(np.float64); nan = np.isnan(v)
        cols.append(np.where(nan, 0.0, np.log1p(np.maximum(v, 0)))); inds.append(nan.astype(np.float64))
    cols += inds
    for c in OTHER:
        v = D[c][ti, ci].astype(np.float64)
        if c in ('CAND_NCHG', 'SEED_NCHG'):
            v = np.log1p(np.maximum(v, 0))
        if c == 'FOLDER_DIST':
            v = v / 10.0
        cols.append(np.nan_to_num(v, nan=0.0))
    T = D['PC'].shape[0]
    for c in QRATIO:
        M = D[c].astype(np.float64).copy(); M[np.arange(T), D['seeds']] = 0
        mx = M.max(axis=1)
        v = D[c][ti, ci].astype(np.float64); m = mx[ti]
        cols.append(np.where(m > 0, v / np.where(m > 0, m, 1), 0.0))
    return np.column_stack(cols).astype(np.float32)


# ---- graph of one block (numpy; cached by prep.py in /out/graph/<repo>/<k>.npz)
def build_graph(b, seg_files):
    """b: d4lib.Block. Only fields derived from commits[:hend] (b.pI, pJ, pT, imports) and the alive set are used.
    seg_files: {global id (str): snapshot key} of the block's content snapshot (or {})."""
    N = b.N
    key = b.pI.astype(np.int64) * N + b.pJ
    uk, inv = np.unique(key, return_inverse=True)
    g = dict(n=np.array(N), co_i=(uk // N).astype(np.int32), co_j=(uk % N).astype(np.int32))
    g['w_raw'] = np.bincount(inv, minlength=len(uk)).astype(np.float64) if len(uk) else np.zeros(0)
    for tag, hl in HLS.items():
        if hl:
            w = 0.5 ** ((b.cutoff - b.pT) / (hl * 86400.0))
            g['w_' + tag] = np.bincount(inv, weights=w, minlength=len(uk)) if len(uk) else np.zeros(0)
    imp = sorted({(min(a, c), max(a, c)) for a, c in b.imports if a != c})
    g['imp_i'] = np.array([a for a, c in imp], dtype=np.int32); g['imp_j'] = np.array([c for a, c in imp], dtype=np.int32)
    dirs = [os.path.dirname(p) for p in b.paths]
    grp = {}
    for n, d in enumerate(dirs):
        grp.setdefault(d, []).append(n)
    fi, fj = [], []
    for m in grp.values():
        for x in range(len(m)):
            for y in range(x + 1, len(m)):
                fi.append(m[x]); fj.append(m[y])
    g['fol_i'] = np.array(fi, dtype=np.int32); g['fol_j'] = np.array(fj, dtype=np.int32)
    g['gkey'] = np.array([seg_files.get(str(i), '') for i in b.ids])
    g['cutoff'] = np.array(b.cutoff); g['hend'] = np.array(b.meta['hend'])
    return g


_EMB = {}


def emb(repo, model):
    """(key -> row, vecs) of the frozen file embeddings: 'qwen' = U4's Qwen3-Embedding-0.6B, 'swerank' = U5's SweRankEmbed-Small."""
    if (repo, model) not in _EMB:
        fp = os.path.join(U.U4 if model == 'qwen' else OUT, 'emb', repo + '.npz')
        z = np.load(fp)
        _EMB[(repo, model)] = ({k: n for n, k in enumerate(z['keys'].tolist())}, torch.from_numpy(z['vecs']).to(DEV))
    return _EMB[(repo, model)]


class DGraph:
    """The device form of one block graph for one edge weighting and node-feature choice."""
    def __init__(self, g, repo, wmode, nodef, arch):
        N = int(g['n']); self.N = N
        w = np.ones(len(g['co_i'])) if wmode == 'bin' else g['w_' + wmode]
        ci, cj = np.r_[g['co_i'], g['co_j']], np.r_[g['co_j'], g['co_i']]      # both directions
        cw = np.r_[w, w]
        ii, ij = np.r_[g['imp_i'], g['imp_j']], np.r_[g['imp_j'], g['imp_i']]
        fi, fj = np.r_[g['fol_i'], g['fol_j']], np.r_[g['fol_j'], g['fol_i']]
        deg = [np.bincount(x, minlength=N) for x in (ci, ii, fi)]
        if arch == 'sage':
            self.A = [self._norm(N, ci, cj, cw), self._norm(N, ii, ij, np.ones(len(ii))), self._norm(N, fi, fj, np.ones(len(fi)))]
        else:   # gat: one edge list (dst = row), relations 0 co-change, 1 import, 2 folder, 3 self loop
            dst = np.r_[ci, ii, fi, np.arange(N)].astype(np.int64); src = np.r_[cj, ij, fj, np.arange(N)].astype(np.int64)
            rel = np.r_[np.zeros(len(ci)), np.ones(len(ii)), np.full(len(fi), 2), np.full(N, 3)].astype(np.int64)
            lw = np.zeros(len(dst))
            if wmode != 'bin' and len(cw):
                lc = np.log(np.maximum(cw, 1e-30)); lw[:len(cw)] = lc - lc.mean()   # centred; a learned scale multiplies it
            o = np.argsort(dst, kind='stable')
            self.dst, self.src = torch.from_numpy(dst[o]).to(DEV), torch.from_numpy(src[o]).to(DEV)
            self.rel, self.lw = torch.from_numpy(rel[o]).to(DEV), torch.from_numpy(lw[o]).float().to(DEV)
        if nodef == 'none':
            x = np.log1p(np.column_stack(deg)).astype(np.float32); self.x = torch.from_numpy(x).to(DEV); self.rows = None
        else:
            kmap, V = emb(repo, nodef)
            rows = np.array([kmap[k] if k in kmap else -1 for k in g['gkey'].tolist()], dtype=np.int64)
            self.rows = torch.from_numpy(rows).to(DEV); self.has = (self.rows >= 0).float().unsqueeze(1)
            self.V = V

    @staticmethod
    def _norm(N, i, j, w):
        s = np.bincount(i, weights=w, minlength=N)
        v = w / np.where(s[i] > 0, s[i], 1.0)
        idx = torch.from_numpy(np.vstack([i, j]).astype(np.int64))
        return torch.sparse_coo_tensor(idx, torch.from_numpy(v).float(), (N, N)).coalesce().to(DEV)

    def features(self):
        if self.rows is None:
            return self.x
        x = self.V[self.rows.clamp(min=0)] * self.has
        return torch.cat([x, self.has], 1)


class SageLayer(nn.Module):
    def __init__(s, H, drop):
        super().__init__(); s.lin = nn.Linear(4 * H, H); s.drop = nn.Dropout(drop)

    def forward(s, h, g):
        z = torch.cat([h] + [torch.sparse.mm(A, h) for A in g.A], 1)
        return s.drop(Fn.relu(s.lin(z)))


class GatLayer(nn.Module):
    def __init__(s, H, drop, heads=2):
        super().__init__(); s.h, s.d = heads, H // heads
        s.W = nn.Linear(H, H, bias=False)
        s.a_src = nn.Parameter(torch.randn(heads, s.d) * 0.1); s.a_dst = nn.Parameter(torch.randn(heads, s.d) * 0.1)
        s.relb = nn.Parameter(torch.zeros(4, heads)); s.gam = nn.Parameter(torch.ones(heads)); s.drop = nn.Dropout(drop)

    def forward(s, h, g):
        N = h.shape[0]
        Wh = s.W(h).view(N, s.h, s.d)
        es = (Wh * s.a_src).sum(-1); ed = (Wh * s.a_dst).sum(-1)
        e = Fn.leaky_relu(es[g.src] + ed[g.dst] + s.relb[g.rel] + s.gam * g.lw[:, None], 0.2)
        mx = torch.full((N, s.h), -1e30, device=h.device).scatter_reduce(0, g.dst[:, None].expand(-1, s.h), e.detach(), 'amax', include_self=False)
        ex = torch.exp(e - mx[g.dst])
        den = torch.zeros(N, s.h, device=h.device).index_add_(0, g.dst, ex)
        a = ex / den[g.dst]
        out = torch.zeros(N, s.h, s.d, device=h.device).index_add_(0, g.dst, Wh[g.src] * a[..., None])
        return s.drop(Fn.elu(out.reshape(N, s.h * s.d)))


class Net(nn.Module):
    def __init__(s, arch, layers, H, din, drop=0.1):
        super().__init__()
        s.inp = nn.Linear(din, H)
        s.layers = nn.ModuleList([(SageLayer if arch == 'sage' else GatLayer)(H, drop) for _ in range(layers)])
        s.head = nn.Sequential(nn.Linear(4 * H + P, 128), nn.ReLU(), nn.Dropout(drop), nn.Linear(128, 1))

    def encode(s, g):
        h = Fn.relu(s.inp(g.features()))
        for l in s.layers:
            h = l(h, g)
        return h

    def pairs(s, h, si, ci, X):
        a, b = h[si], h[ci]
        return s.head(torch.cat([a, b, a * b, (a - b).abs(), X], 1)).squeeze(1)
