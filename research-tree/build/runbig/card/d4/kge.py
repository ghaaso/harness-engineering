"""Knowledge-graph embeddings at their published form (own torch code, no library):
ComplEx-N3 (Lacroix et al. 2018: reciprocal relations, 1-vs-all cross-entropy, N3 regulariser, Adagrad, init 1e-3, rank
512-2000) and RotatE (Sun et al. 2019: self-adversarial loss with margin gamma, uniform negatives filtered against known
facts, L1 distance over complex moduli, Adam). Hyper-parameters are chosen on filtered MRR of held-out co-change pairs."""
import time, math, json, os
import numpy as np
import torch
import torch.nn.functional as F

DEV = torch.device(os.environ.get('KGE_DEVICE', 'cuda' if torch.cuda.is_available() else 'cpu'))
REL = {'co': 0, 'imports': 1, 'in_dir': 2, 'dir_parent': 3}


def build_graph(b, form):
    """Triples (h, r, t) over entities: files [0, N) then folders. form 'pairs': co_changed only; 'triples': + imports,
    in_dir, dir_parent. Co-change facts: every pair with count >= 1 in the block's history, both directions."""
    co = set(zip(b.pI.tolist(), b.pJ.tolist()))
    tri = []
    for a, c in co:
        tri.append((a, 0, c)); tri.append((c, 0, a))
    nent = b.N
    if form == 'triples':
        for a, c in b.imports:
            tri.append((a, 1, c))
        dirs = {}
        import os as _os
        for i, p in enumerate(b.paths):
            d = _os.path.dirname(p); chain = []
            while True:
                if d not in dirs:
                    dirs[d] = b.N + len(dirs)
                chain.append(d)
                if not d or d == '/':
                    break
                d = _os.path.dirname(d)
            tri.append((i, 2, dirs[chain[0]]))
            for x, y in zip(chain, chain[1:]):
                tri.append((dirs[x], 3, dirs[y]))
        nent = b.N + len(dirs)
    tri = np.array(sorted(set(tri)), dtype=np.int64).reshape(-1, 3)
    nrel = 4 if form == 'triples' else 1
    return tri, nent, nrel


def split_valid(tri, frac=0.05, seed=11):
    """Hold out frac of the co-change pairs (both directions together) for link prediction."""
    co = tri[tri[:, 1] == 0]
    pairs = sorted({(min(a, c), max(a, c)) for a, _, c in co.tolist()})
    rng = np.random.default_rng(seed)
    k = max(1, int(round(frac * len(pairs))))
    held = {pairs[i] for i in rng.choice(len(pairs), size=k, replace=False)}
    keep = np.array([not (r == 0 and (min(h, t), max(h, t)) in held) for h, r, t in tri.tolist()])
    q = sorted([(a, c) for a, c in held] + [(c, a) for a, c in held])
    return tri[keep], np.array(q, dtype=np.int64)


def with_reciprocal(tri, nrel):
    inv = tri[:, [2, 1, 0]].copy(); inv[:, 1] += nrel
    return np.concatenate([tri, inv])


class Model:
    def __init__(self, kind, nent, nrel, d, seed):
        g = torch.Generator().manual_seed(seed)
        self.kind, self.nent, self.nrel, self.d = kind, nent, nrel, d
        if kind == 'complex':
            self.E = (torch.randn(nent, 2 * d, generator=g) * 1e-3).to(DEV).requires_grad_()
            self.R = (torch.randn(2 * nrel, 2 * d, generator=g) * 1e-3).to(DEV).requires_grad_()
        else:
            self.gamma, self.alpha, eps = 9.0, 1.0, 2.0
            self.range = (self.gamma + eps) / d
            self.E = ((torch.rand(nent, 2 * d, generator=g) * 2 - 1) * self.range).to(DEV).requires_grad_()
            self.R = ((torch.rand(2 * nrel, d, generator=g) * 2 - 1) * self.range).to(DEV).requires_grad_()

    def params(self):
        return [self.E, self.R]

    def state(self):
        return [p.detach().clone() for p in self.params()]

    def load(self, st):
        with torch.no_grad():
            for p, s in zip(self.params(), st):
                p.copy_(s)

    # --- scoring of all tails for a batch of (h, r) queries -> [B, nent] (higher = more plausible)
    def score_all(self, h, r):
        d = self.d
        he = self.E[h]
        if self.kind == 'complex':
            re_, im_ = he[:, :d], he[:, d:]
            rr, ri = self.R[r][:, :d], self.R[r][:, d:]
            lr_ = re_ * rr - im_ * ri; li = re_ * ri + im_ * rr
            return lr_ @ self.E[:, :d].T + li @ self.E[:, d:].T
        th = self.R[r] / (self.range / math.pi)
        c, s = torch.cos(th), torch.sin(th)
        re_ = he[:, :d] * c - he[:, d:] * s; im_ = he[:, :d] * s + he[:, d:] * c
        out = torch.empty(len(h), self.nent, device=DEV)
        Er, Ei = self.E[:, :d], self.E[:, d:]
        step = max(1, int(6e7 // (self.nent * d)))
        for i in range(0, len(h), step):
            dr = re_[i:i + step, None, :] - Er[None]; di = im_[i:i + step, None, :] - Ei[None]
            out[i:i + step] = self.gamma - torch.sqrt(dr * dr + di * di + 1e-12).sum(-1)
        return out


def train(kind, tri, nent, nrel, d, n3=0.1, epochs=50, seed=0, valid=None, eval_every=5, patience=2, nfiles=None,
          bs=None, neg=256, log=print):
    """Trains on tri (forward facts); if valid (queries) is given, early-stops on filtered MRR and restores the best
    epoch; returns (model, info). Without valid trains exactly `epochs`."""
    torch.manual_seed(seed); np.random.seed(seed)
    m = Model(kind, nent, nrel, d, seed)
    full = torch.tensor(with_reciprocal(tri, nrel), device=DEV)
    n = len(full)
    if kind == 'complex':
        opt = torch.optim.Adagrad(m.params(), lr=0.1)
        bs = bs or 1000
    else:
        opt = torch.optim.Adam(m.params(), lr=1e-3)
        bs = bs or max(32, min(1024, int(1.0e8 // (neg * d))))
    keys = torch.sort((full[:, 0] * (2 * nrel) + full[:, 1]) * nent + full[:, 2]).values
    t0 = time.time(); curve = []; best = (-1, None, 0); bad = 0
    nfiles = nfiles or nent
    known = None
    if valid is not None:
        known = {}
        for h, r, t in tri.tolist():
            if r == 0:
                known.setdefault(h, set()).add(t)
    for ep in range(1, epochs + 1):
        perm = torch.randperm(n, device=DEV); tot = 0.0
        for i in range(0, n, bs):
            bt = full[perm[i:i + bs]]; h, r, t = bt[:, 0], bt[:, 1], bt[:, 2]
            if kind == 'complex':
                lg = m.score_all(h, r)
                loss = F.cross_entropy(lg, t)
                dd = m.d
                he, re_, te = m.E[h], m.R[r], m.E[t]
                mod = lambda x: torch.sqrt(x[:, :dd] ** 2 + x[:, dd:] ** 2 + 1e-12)
                reg = (mod(he) ** 3 + mod(re_) ** 3 + mod(te) ** 3).sum(-1).mean()
                loss = loss + n3 * reg
            else:
                loss = rotate_loss(m, h, r, t, keys, nrel, neg)
            opt.zero_grad(set_to_none=True); loss.backward(); opt.step(); tot += float(loss) * len(bt)
        curve.append(tot / n)
        if valid is not None and (ep % eval_every == 0 or ep == epochs):
            mrr = filtered_mrr(m, valid, known, nfiles)
            log('  ep %d loss %.4f valid MRR %.4f' % (ep, curve[-1], mrr))
            if mrr > best[0] * (1 + 0.002):
                best = (mrr, m.state(), ep); bad = 0
            else:
                bad += 1
                if bad >= patience:
                    break
    if valid is not None and best[1] is not None:
        m.load(best[1])
    info = dict(kind=kind, d=d, n3=n3, epochs=ep if valid is None else best[2], epochs_run=ep, valid_mrr=best[0] if valid is not None else None,
                wall_s=time.time() - t0, loss_last=curve[-1], facts=int(len(tri)), nent=nent,
                peak_gpu_mb=(torch.cuda.max_memory_allocated() / 2**20 if DEV.type == 'cuda' else 0))
    return m, info


def rotate_loss(m, h, r, t, keys, nrel, neg):
    B, d = len(h), m.d
    nt = torch.randint(0, m.nent, (B, neg), device=DEV)
    k = (h * (2 * nrel) + r)[:, None] * m.nent + nt
    pos_in = torch.searchsorted(keys, k)
    pos_in = pos_in.clamp(max=len(keys) - 1)
    is_true = keys[pos_in] == k                                     # filtered negatives: drop known true tails
    he = m.E[h]; th = m.R[r] / (m.range / math.pi); c, s = torch.cos(th), torch.sin(th)
    re_ = he[:, :d] * c - he[:, d:] * s; im_ = he[:, :d] * s + he[:, d:] * c
    te = m.E[t]
    pos = m.gamma - torch.sqrt((re_ - te[:, :d]) ** 2 + (im_ - te[:, d:]) ** 2 + 1e-12).sum(-1)
    ne = m.E[nt]
    ns = m.gamma - torch.sqrt((re_[:, None] - ne[..., :d]) ** 2 + (im_[:, None] - ne[..., d:]) ** 2 + 1e-12).sum(-1)
    ns_m = ns.masked_fill(is_true, -1e9)
    w = torch.softmax(m.alpha * ns_m, dim=1).detach()
    nl = -(w * F.logsigmoid(-ns)).masked_fill(is_true, 0.0).sum(1)
    pl = -F.logsigmoid(pos)
    return ((pl + nl) / 2).mean()


@torch.no_grad()
def filtered_mrr(m, queries, known, nfiles, chunk=64):
    rr = []
    q = torch.tensor(queries, device=DEV)
    for i in range(0, len(q), chunk):
        qq = q[i:i + chunk]
        sc = m.score_all(qq[:, 0], torch.zeros_like(qq[:, 0]))[:, :nfiles].clone()
        for j in range(len(qq)):
            a, b = int(qq[j, 0]), int(qq[j, 1])
            for t in known.get(a, ()):
                if t != b and t < nfiles:
                    sc[j, t] = -1e30
            sc[j, a] = -1e30
        tgt = sc[torch.arange(len(qq)), qq[:, 1]]
        rank = 1 + (sc > tgt[:, None]).sum(1).float() + 0.5 * ((sc == tgt[:, None]).sum(1).float() - 1)
        rr.append((1.0 / rank).cpu())
    return float(torch.cat(rr).mean())


@torch.no_grad()
def seed_rows(m, seeds, nfiles):
    out = []
    for i in range(0, len(seeds), 64):
        s = torch.tensor(seeds[i:i + 64], device=DEV, dtype=torch.long)
        out.append(m.score_all(s, torch.zeros_like(s))[:, :nfiles].float().cpu().numpy())
    return np.concatenate(out) if out else np.zeros((0, nfiles), dtype=np.float32)
