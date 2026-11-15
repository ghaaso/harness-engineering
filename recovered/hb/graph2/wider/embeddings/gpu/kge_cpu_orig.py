"""Knowledge-graph-embedding training and scoring for the five arms (protocol addendum 8, sections C-E).

Arms (each the way its authors intend; differences from PyKEEN defaults are implemented and noted):
  E1 RotatE (Sun et al. 2019)        PyKEEN RotatE model with the paper's distance: sum over complex dims
                                     of |h*r - t| (RotatEInteraction p=1; PyKEEN's default p=2 is the
                                     L2 norm). Own sLCWA loop: reciprocal triples, 256 uniform tail
                                     corruptions per positive, self-adversarial loss with margin exactly as
                                     the authors' code (pos -log s(g - d), neg sum softmax(a(g - d')) .
                                     -log s(d' - g), (pos + neg)/2) and their subsampling weights, Adam.
  E2 ComplEx-N3 (Lacroix et al. 2018) PyKEEN ComplEx model, own 1-vs-all loop: one cross-entropy over all
                                     entities per training triple (reciprocals included), N3 = w/3 * sum of
                                     cubed complex moduli of the batch's h, r, t factors / batch size,
                                     Adagrad; init N(0,1) * 1e-3 as the authors' code. (PyKEEN's LCWA is
                                     k-vs-all per (h, r) and its Lp regulariser would cube every entity's
                                     real/imag parts on each batch, not the batch factors' moduli.)
  E3 TransE (Bordes 2013, trained as Sun et al. 2019) PyKEEN TransE, no entity-norm constraint (Sun's
                                     margins 6-12 assume unconstrained entities), same loop/loss as E1.
  E4 CompGCN (Vashishth et al. 2020)  PyKEEN CompGCN (DistMult decoder) with tanh activation (the paper's;
                                     PyKEEN's default is identity), dropout 0.1, PyKEEN LCWA loop, BCE with
                                     label smoothing 0.1, Adam. Fallback R-GCN (PyKEEN RGCN, basis decomp.).
  E5 routed RotatE specialists        one E1 model per area on the edges with >= 1 endpoint in it, trained
                                     jointly epoch by epoch, early stopping on the routed system's MRR.

Every arm trains on the checkpoint graph export/graphs0/<sha>/triples.tsv (minConf 0, ruling 34) with a
reciprocal relation for every kind. Saved per run (out dir): reps.pt (final entity and relation
representations, known-entity list), meta.json (config, loss curve, val MRR curve, epochs, wall s, peak RSS).

Scores: higher = more plausible for every arm (PyKEEN's convention; checked against predict_target).
CLI:  python kge.py check            correctness checks (predict_target order, direction, loss)
      python kge.py time <arm> <sha> <epochs>   timing of the largest config of an arm
      python kge.py unit <arm> <cfg_id> <outdir>   one stage-A unit (used by stageA.py)
"""
import os, sys, json, time, math, random, resource, copy, itertools, collections
import numpy as np
import torch
import torch.nn.functional as F

THREADS = int(os.environ.get('KGE_THREADS', '6'))
torch.set_num_threads(THREADS)
from pykeen.triples import TriplesFactory
from pykeen.models import RotatE, ComplEx, TransE, CompGCN, RGCN
from pykeen.nn.modules import RotatEInteraction
from pykeen.utils import ensure_complex


class RotatEL1Interaction(RotatEInteraction):
    """RotatE with the paper's distance (Sun et al. 2019; authors' code model.py RotatE: score = gamma -
    sum over dims of the modulus of h*r - t). PyKEEN 1.11.1's RotatEInteraction.forward hard-codes the L2
    norm (p=2) whatever p is passed, so the paper's form needs this override."""

    def forward(self, h, r, t):
        h, r, t = ensure_complex(h, r, t)
        return -(h * r - t).abs().sum(dim=-1)


HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.environ.get('EMB_ROOT') or os.path.dirname(HERE)
G0 = os.path.join(ROOT, 'export', 'graphs0')
CONFIG_FILE = os.path.join(HERE, 'stageA_configs.json')
CO = 'co_changed'
INV = '__inv'
AREAS = ('backend', 'mobile', 'web', 'other')
HOLDOUT_SEED = 20261114          # fixed seed of the stage-A 10 % pair hold-out
STAGEA_SHA = 'cd806c803c4ad8ec198790096d196460789951f0'  # parent of the latest (author time) inner15 commit
ARMS = ('E1', 'E2', 'E3', 'E4', 'E5')
ARM_KEY = {'E1': 'E1_RotatE', 'E2': 'E2_ComplEx_N3', 'E3': 'E3_TransE', 'E4': 'E4_CompGCN', 'E5': 'E5_Routed_RotatE'}


def rss_mb():
    return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024.0


# ------------------------------------------------------------------ configs
def load_configs():
    return json.load(open(CONFIG_FILE))


def grid(arm, fallback=False):
    """[(cfg_id, {param: value})] in itertools.product order of the grid keys as written (c01..c16)."""
    C = load_configs()[ARM_KEY[arm]]
    if arm == 'E4' and fallback:
        g = {'num_layers': [1, 2], 'embedding_dim': [100, 200], 'num_bases': [2, 5], 'lr': [0.001, 0.003]}
    else:
        g = C['grid']
    keys = list(g)
    return [('c%02d' % (i + 1), dict(zip(keys, vals))) for i, vals in enumerate(itertools.product(*[g[k] for k in keys]))]


def fixed(arm):
    C = load_configs()
    f = C['E1_RotatE']['fixed'] if arm == 'E5' else C[ARM_KEY[arm]]['fixed']
    return dict(f)


def es_params(arm):
    # common.early_stopping: every 10 epochs (CompGCN 5), patience 3 evaluations, relative delta 0.002
    return dict(freq=5 if arm == 'E4' else 10, patience=3, rel_delta=0.002)


# ------------------------------------------------------------------ graphs
def read_graph(sha):
    d = os.path.join(G0, sha)
    ents = {}
    with open(os.path.join(d, 'entities.tsv')) as f:
        next(f)
        for l in f:
            i, kind, path, code, area = l.rstrip('\n').split('\t')
            ents[i] = (kind, path, area, code == '1')
    tri = []
    with open(os.path.join(d, 'triples.tsv')) as f:
        next(f)
        for l in f:
            tri.append(tuple(l.rstrip('\n').split('\t')))
    return ents, tri


def pair_key(h, t):
    return (h, t) if h < t else (t, h)


def stage_a_split(tri, frac=0.1, seed=HOLDOUT_SEED):
    """Hold out 10 % of co_changed PAIRS; both directions leave training together."""
    pairs = sorted({pair_key(h, t) for h, r, t in tri if r == CO})
    k = int(round(frac * len(pairs)))
    held = set(random.Random(seed).sample(pairs, k))
    train = [x for x in tri if not (x[1] == CO and pair_key(x[0], x[2]) in held)]
    queries = sorted([(a, b) for a, b in held] + [(b, a) for a, b in held])
    return train, queries, held


def neighbours(tri):
    nb = collections.defaultdict(set)
    for h, r, t in tri:
        if h != t: nb[h].add(t); nb[t].add(h)
    return nb


# ------------------------------------------------------------------ models
def build_tf(train, entity_labels, pykeen_inverse=False):
    """explicit reciprocal relations '<kind>__inv' (E1/E2/E3/E5), or PyKEEN's own inverse triples (E4:
    CompGCN requires create_inverse_triples)."""
    rows = list(train) if pykeen_inverse else list(train) + [(t, r + INV, h) for h, r, t in train]
    e2id = {e: i for i, e in enumerate(sorted(entity_labels))}
    r2id = {r: i for i, r in enumerate(sorted({r for _, r, _ in rows}))}
    tf = TriplesFactory.from_labeled_triples(np.array(rows, dtype=str), entity_to_id=e2id, relation_to_id=r2id,
                                             create_inverse_triples=pykeen_inverse)
    return tf


def make_model(arm, cfg, tf, fallback=False):
    d = int(cfg['embedding_dim'])
    if arm in ('E1', 'E5'):
        m = RotatE(triples_factory=tf, embedding_dim=d)
        m.interaction = RotatEL1Interaction(p=1)  # paper / authors' code: sum of complex moduli
        return m, 'rotate'
    if arm == 'E3':
        p = int(cfg['scoring_fct_norm'])
        return TransE(triples_factory=tf, embedding_dim=d, scoring_fct_norm=p, entity_constrainer=None), 'transe%d' % p
    if arm == 'E2':
        m = ComplEx(triples_factory=tf, embedding_dim=d, regularizer=None)
        with torch.no_grad():
            for rep in (m.entity_representations[0], m.relation_representations[0]):
                rep._embeddings.weight.normal_(0.0, 1.0).mul_(1e-3)  # kbc: nn.Embedding N(0,1) * init 1e-3
        return m, 'complex'
    if arm == 'E4' and not fallback:
        comp = {'mult': 'multiplication', 'sub': 'subtraction'}[cfg['composition']]
        m = CompGCN(triples_factory=tf, embedding_dim=d,
                    encoder_kwargs=dict(num_layers=int(cfg['num_layers']),
                                        layer_kwargs=dict(composition=comp, dropout=0.1, activation=torch.nn.Tanh)))
        return m, 'distmult'
    if arm == 'E4':
        m = RGCN(triples_factory=tf, embedding_dim=d, num_layers=int(cfg['num_layers']), decomposition='bases',
                 decomposition_kwargs=dict(num_bases=int(cfg['num_bases'])))
        return m, 'distmult'
    raise ValueError(arm)


# ------------------------------------------------------------------ representations and scoring
@torch.no_grad()
def final_reps(model):
    model.eval()
    E = model.entity_representations[0](indices=None).detach().clone()
    R = model.relation_representations[0](indices=None).detach().clone()
    return E, R


def score_with(kind, h, r, T):
    """h: (Q, d), r: (Q, d), T: (N, d) -> (Q, N) scores, higher = better."""
    if kind == 'rotate':
        hr = h * r
        return torch.cat([-((hr[i:i + 8]).unsqueeze(1) - T.unsqueeze(0)).abs().sum(-1) for i in range(0, len(hr), 8)])
    if kind.startswith('transe'):
        p = int(kind[-1])
        hr = h + r
        return torch.cat([-torch.linalg.vector_norm(hr[i:i + 8].unsqueeze(1) - T.unsqueeze(0), ord=p, dim=-1)
                          for i in range(0, len(hr), 8)])
    if kind == 'complex':
        return torch.real((h * r) @ T.conj().T)
    if kind == 'distmult':
        return (h * r) @ T.T
    raise ValueError(kind)


def realistic_rank(scores, true_idx, mask):
    """scores: (N,) float with NaN = unscored; mask: bool (N,) candidates (filtered ones False, true True).
    Scored candidates first by score (ties: mean position), unscored after them in random order
    (expected position)."""
    s = scores[mask]
    st = scores[true_idx]
    scored = ~torch.isnan(s)
    n_scored = int(scored.sum()); n_un = int((~scored).sum())
    if torch.isnan(st):
        return n_scored + (n_un + 1) / 2.0
    ss = s[scored]
    gt = int((ss > st).sum()); eq = int((ss == st).sum()) - 1
    return gt + 1 + eq / 2.0


class Graph:
    """A checkpoint graph with its (optional) stage-A hold-out."""

    def __init__(self, sha, holdout=False):
        self.sha = sha
        self.ents, self.tri = read_graph(sha)
        self.full_ent = sorted({h for h, _, _ in self.tri} | {t for _, _, t in self.tri})
        if holdout:
            self.train, self.queries, self.held = stage_a_split(self.tri)
        else:
            self.train, self.queries, self.held = list(self.tri), [], set()
        self.known = sorted({h for h, _, _ in self.train} | {t for _, _, t in self.train})
        self.true_tails = collections.defaultdict(set)
        for h, r, t in self.tri:
            if r == CO: self.true_tails[h].add(t)
        self.co_kinds = sorted({self.ents[h][0] for h, r, _ in self.tri if r == CO})
        self.nb_train = neighbours(self.train)

    def area(self, e):
        return self.ents[e][2] if e in self.ents else 'other'


def eval_queries(G, labels, score_fn, file_only=False):
    """Filtered MRR of (h, co_changed, ?) over the queries. labels: entity order of score_fn's columns;
    score_fn(list of head labels) -> (Q, len(labels)) tensor (NaN = unscored)."""
    if not G.queries: return None
    idx = {e: i for i, e in enumerate(labels)}
    heads = sorted({h for h, _ in G.queries})
    S = score_fn(heads)
    base = torch.ones(len(labels), dtype=torch.bool)
    if file_only:
        base = torch.tensor([G.ents.get(e, ('',))[0] in G.co_kinds for e in labels])
    rr = []
    for h, t in G.queries:
        row = S[heads.index(h)]
        m = base.clone()
        for o in G.true_tails[h]:
            if o != t and o in idx: m[idx[o]] = False
        if h in idx: m[idx[h]] = False  # the seed itself is never a candidate
        rr.append(1.0 / realistic_rank(row, idx[t], m))
    return float(np.mean(rr))


# ------------------------------------------------------------------ training: sLCWA (E1, E3, E5)
def subsampling_weights(ids, inv_of):
    """Authors' code (KnowledgeGraphEmbedding count_frequency, start 4): w = 1/sqrt(c(h,r) + c(t, r^-1))."""
    cnt = collections.Counter((int(h), int(r)) for h, r, _ in ids.tolist())
    w = [1.0 / math.sqrt(3 + cnt[(h, r)] + 3 + cnt[(t, inv_of[r])]) for h, r, t in ids.tolist()]
    return torch.tensor(w)


def nssa_batch(model, pos, w, Wsum, margin, temp, num_neg, num_e, gen):
    neg_t = torch.randint(0, num_e, (pos.shape[0], num_neg), generator=gen)
    f_pos = margin + model.score_hrt(pos).view(-1)                      # g - d
    f_neg = margin + model.score_t(hr_batch=pos[:, :2], tails=neg_t)    # g - d', (B, K)
    p = torch.softmax(f_neg * temp, dim=1).detach()
    l_neg = -(p * F.logsigmoid(-f_neg)).sum(1)
    l_pos = -F.logsigmoid(f_pos)
    return ((l_pos + l_neg) / 2.0 * w).sum() / Wsum


class SLCWA:
    """One self-adversarial model (E1/E3, or one E5 specialist)."""

    def __init__(self, arm, cfg, tf, seed, sub_batch):
        self.fx = fixed('E1' if arm == 'E5' else arm)
        self.model, self.kind = make_model(arm, cfg, tf)
        self.tf = tf
        self.ids = tf.mapped_triples.clone()
        inv_of = {}
        for lab, i in tf.relation_to_id.items():
            j = tf.relation_to_id.get(lab[:-len(INV)] if lab.endswith(INV) else lab + INV)
            inv_of[i] = j
        self.w = subsampling_weights(self.ids, inv_of)
        self.opt = torch.optim.Adam(self.model.parameters(), lr=float(cfg['lr']))
        self.margin = float(cfg['margin'])
        self.temp = float(cfg.get('adversarial_temperature', self.fx.get('adversarial_temperature', 1.0)))
        self.gen = torch.Generator().manual_seed(seed)
        self.sub = sub_batch

    def epoch(self):
        m = self.model; m.train()
        bs = int(self.fx['batch_size']); K = int(self.fx['num_negs_per_pos'])
        perm = torch.randperm(self.ids.shape[0], generator=self.gen)
        tot = 0.0; nb = 0
        for b0 in range(0, len(perm), bs):
            idx = perm[b0:b0 + bs]
            Wsum = self.w[idx].sum()
            self.opt.zero_grad()
            lb = 0.0
            for s0 in range(0, len(idx), self.sub):
                j = idx[s0:s0 + self.sub]
                loss = nssa_batch(m, self.ids[j], self.w[j], Wsum, self.margin, self.temp, K, self.tf.num_entities, self.gen)
                loss.backward(); lb += float(loss)
            self.opt.step(); m.post_parameter_update()
            tot += lb; nb += 1
        return tot / max(nb, 1)


# ------------------------------------------------------------------ training: 1-vs-all + N3 (E2)
class OneVsAllN3:
    def __init__(self, cfg, tf, seed):
        self.fx = fixed('E2')
        self.model, self.kind = make_model('E2', cfg, tf)
        self.tf = tf; self.ids = tf.mapped_triples.clone()
        self.opt = torch.optim.Adagrad(self.model.parameters(), lr=float(cfg['lr']))
        self.w = float(cfg['n3_weight'])
        self.gen = torch.Generator().manual_seed(seed)

    def epoch(self):
        m = self.model; m.train()
        bs = int(self.fx['batch_size'])
        perm = torch.randperm(self.ids.shape[0], generator=self.gen)
        tot = 0.0; nb = 0
        Er = m.entity_representations[0]; Rr = m.relation_representations[0]
        for b0 in range(0, len(perm), bs):
            b = self.ids[perm[b0:b0 + bs]]
            self.opt.zero_grad()
            scores = m.score_t(hr_batch=b[:, :2])
            ce = F.cross_entropy(scores, b[:, 2])
            h = Er(indices=b[:, 0]); r = Rr(indices=b[:, 1]); t = Er(indices=b[:, 2])
            n3 = (self.w / 3.0) * (h.abs() ** 3 + r.abs() ** 3 + t.abs() ** 3).sum() / b.shape[0]
            loss = ce + n3
            loss.backward(); self.opt.step(); m.post_parameter_update()
            tot += float(loss); nb += 1
        return tot / max(nb, 1)


# ------------------------------------------------------------------ one run
def rel_index(model, tf, label):
    """Row of the relation representation matrix for a relation label. With PyKEEN's own inverse triples
    (E4) the factory id is NOT the row: the model maps it (relation r -> row 2r, inverse 2r+1) in
    _prepare_batch, as predict_target does; with explicit '__inv' relations the id is the row."""
    rid = tf.relation_to_id[label]
    if getattr(tf, 'create_inverse_triples', False):
        return int(model._prepare_batch(batch=torch.tensor([[0, rid]]), index_relation=1)[0, 1])
    return rid


def model_score_fn(model, kind, tf, rel_label):
    """score_fn over all entities of tf, from the final representations (the path score() uses)."""
    E, R = final_reps(model)
    e2id = tf.entity_to_id; r = R[rel_index(model, tf, rel_label)]
    labels = sorted(e2id, key=e2id.get)

    def fn(heads):
        h = E[torch.tensor([e2id[x] for x in heads])]
        return score_with(kind, h, r.unsqueeze(0).expand_as(h), E)
    return labels, fn


def train_single(arm, cfg, seed, G, max_epochs=None, es=True, sub_batch=128, batch_size=None, log=None, fallback=False):
    """Train one model (E1/E2/E3/E4) on G.train; returns (model, kind, tf, info)."""
    torch.manual_seed(seed); np.random.seed(seed); random.seed(seed)
    fx = fixed(arm); ep = es_params(arm)
    max_epochs = int(max_epochs or fx['max_epochs'])
    entity_labels = G.full_ent
    t0 = time.perf_counter()
    info = dict(arm=arm, cfg=cfg, seed=seed, sha=G.sha, losses=[], val=[], val_file=[], epoch_s=[])
    best = dict(mrr=-1.0, epoch=0, state=None)
    if arm == 'E4':
        from pykeen.training import LCWATrainingLoop
        from pykeen.training.callbacks import TrainingCallback
        from pykeen.losses import BCEWithLogitsLoss
        tf = build_tf(G.train, entity_labels, pykeen_inverse=True)
        torch.manual_seed(seed)
        model, kind = make_model(arm, cfg, tf, fallback=fallback)
        model.loss = BCEWithLogitsLoss()
        opt = torch.optim.Adam(model.get_grad_params(), lr=float(cfg['lr']))
        loop = LCWATrainingLoop(model=model, triples_factory=tf, optimizer=opt)

        class CB(TrainingCallback):
            def __init__(s):
                super().__init__(); s.tl = time.perf_counter(); s.bad = 0

            def post_epoch(s, epoch, epoch_loss, **kw):
                now = time.perf_counter(); info['losses'].append(float(epoch_loss)); info['epoch_s'].append(now - s.tl)
                if es and G.queries and epoch % ep['freq'] == 0:
                    v = _eval(model, kind, tf); model.train()
                    _track(v, epoch, model, best, info)
                    s.bad = 0 if best['epoch'] == epoch else s.bad + 1
                    if s.bad >= ep['patience']: s.training_loop._should_stop = True
                if log: log(epoch, epoch_loss, info)
                s.tl = time.perf_counter()

        bs = int(batch_size or fx['batch_size'])
        info['batch_size'] = bs
        loop.train(triples_factory=tf, num_epochs=max_epochs, batch_size=bs, label_smoothing=0.1, callbacks=[CB()],
                   use_tqdm=False, use_tqdm_batch=False, pin_memory=False)
    else:
        tf = build_tf(G.train, entity_labels)
        torch.manual_seed(seed)
        trainer = OneVsAllN3(cfg, tf, seed) if arm == 'E2' else SLCWA(arm, cfg, tf, seed, sub_batch)
        model, kind = trainer.model, trainer.kind
        info['batch_size'] = int(fx['batch_size'])
        bad = 0
        for epoch in range(1, max_epochs + 1):
            tl = time.perf_counter()
            info['losses'].append(trainer.epoch()); info['epoch_s'].append(time.perf_counter() - tl)
            if es and G.queries and epoch % ep['freq'] == 0:
                v = _eval(model, kind, tf)
                _track(v, epoch, model, best, info)
                bad = 0 if best['epoch'] == epoch else bad + 1
                if bad >= ep['patience']: break
            if log: log(epoch, info['losses'][-1], info)
    if best['state'] is not None:
        model.load_state_dict(best['state'])
    info.update(epochs=len(info['losses']), best_epoch=best['epoch'], val_mrr=best['mrr'] if best['state'] is not None else None,
                wall_s=time.perf_counter() - t0, peak_rss_mb=rss_mb(), kind=kind,
                untrained_entities=len(set(G.full_ent) - set(G.known)))
    return model, kind, tf, info


def _eval(model, kind, tf, G=None):
    labels, fn = model_score_fn(model, kind, tf, CO)
    return labels, fn


def _track(v, epoch, model, best, info):
    labels, fn = v
    G = _CURRENT['G']
    mrr = eval_queries(G, labels, fn); mrr_f = eval_queries(G, labels, fn, file_only=True)
    info['val'].append([epoch, mrr]); info['val_file'].append([epoch, mrr_f])
    rd = es_params(info['arm'])['rel_delta']
    if best['state'] is None or mrr > best['mrr'] * (1 + rd):
        best.update(mrr=mrr, epoch=epoch, state=copy.deepcopy(model.state_dict()))
        info['val_file_at_best'] = mrr_f


_CURRENT = {}


# ------------------------------------------------------------------ E5: routed specialists
def area_triples(train, ents, A):
    return [x for x in train if ents.get(x[0], ('', '', 'other'))[2] == A or ents.get(x[2], ('', '', 'other'))[2] == A]


def route(seed_e, ents, nb):
    """The seed's own area, then the area holding most of the seed's 1-hop neighbours outside it (none if
    no neighbour lies outside; ties by the fixed area order)."""
    a1 = ents.get(seed_e, ('', '', 'other'))[2]
    c = collections.Counter(ents.get(n, ('', '', 'other'))[2] for n in nb.get(seed_e, ()))
    c.pop(a1, None)
    if not c: return [a1]
    top = max(c.values())
    return [a1, [a for a in AREAS if c.get(a) == top][0]]


def percentiles(scores):
    """Mid-rank percentile in (0, 1] of each scored entry among the scored entries; NaN stays NaN."""
    out = torch.full_like(scores, float('nan'))
    ok = ~torch.isnan(scores)
    s = scores[ok]
    if s.numel() == 0: return out
    order = torch.sort(s).values
    lo = torch.searchsorted(order, s, right=False).double(); hi = torch.searchsorted(order, s, right=True).double()
    out[ok] = ((lo + hi + 1) / 2.0 / s.numel()).to(scores.dtype)
    return out


def routed_scores(specs, seed_labels, cand_labels, ents, nb, cand_mask_fn=None):
    """specs: {area: (labels, E, rco, kind)} ; returns (Q, len(cand_labels)) mean-percentile scores, NaN =
    unknown to both routed specialists. cand_mask_fn(q) -> bool mask of candidates competing for query q
    (percentiles are taken over the candidates each specialist knows within that set)."""
    out = torch.full((len(seed_labels), len(cand_labels)), float('nan'))
    for qi, s in enumerate(seed_labels):
        acc = torch.zeros(len(cand_labels)); n = torch.zeros(len(cand_labels))
        cm = cand_mask_fn(qi) if cand_mask_fn else torch.ones(len(cand_labels), dtype=torch.bool)
        for A in route(s, ents, nb):
            labels, E, rco, kind, idx = specs[A]
            if s not in idx: continue
            cols = [idx.get(c, -1) for c in cand_labels]
            known = torch.tensor([c >= 0 for c in cols]) & cm
            if not known.any(): continue
            sc = score_with(kind, E[idx[s]].unsqueeze(0), rco.unsqueeze(0), E[torch.tensor([max(c, 0) for c in cols])])[0]
            sc = torch.where(known, sc, torch.tensor(float('nan')))
            pc = percentiles(sc)
            ok = ~torch.isnan(pc)
            acc[ok] += pc[ok]; n[ok] += 1
        out[qi] = torch.where(n > 0, acc / n.clamp(min=1), torch.tensor(float('nan')))
    return out


def eval_routed(G, specs, file_only=False):
    labels = G.full_ent
    idx = {e: i for i, e in enumerate(labels)}
    base = torch.ones(len(labels), dtype=torch.bool)
    if file_only: base = torch.tensor([G.ents.get(e, ('',))[0] in G.co_kinds for e in labels])
    rr = []
    for h, t in G.queries:
        m = base.clone()
        for o in G.true_tails[h]:
            if o != t: m[idx[o]] = False
        m[idx[h]] = False
        S = routed_scores(specs, [h], labels, G.ents, G.nb_train, cand_mask_fn=lambda q: m)[0]
        rr.append(1.0 / realistic_rank(S, idx[t], m))
    return float(np.mean(rr))


def train_routed(cfg, seed, G, max_epochs=None, es=True, sub_batch=128, log=None):
    torch.manual_seed(seed); np.random.seed(seed); random.seed(seed)
    fx = fixed('E5'); ep = es_params('E5')
    max_epochs = int(max_epochs or fx['max_epochs'])
    t0 = time.perf_counter()
    trainers = {}
    sizes = {}
    for k, A in enumerate(AREAS):
        tri = area_triples(G.train, G.ents, A)
        sizes[A] = len(tri)
        if not tri: continue
        ents_A = sorted({h for h, _, _ in tri} | {t for _, _, t in tri})
        tf = build_tf(tri, ents_A)
        torch.manual_seed(seed * 100 + k)
        trainers[A] = SLCWA('E5', cfg, tf, seed * 100 + k, sub_batch)
    info = dict(arm='E5', cfg=cfg, seed=seed, sha=G.sha, losses=[], val=[], val_file=[], epoch_s=[], specialist_triples=sizes)
    best = dict(mrr=-1.0, epoch=0, state=None)

    def specs_now():
        out = {}
        for A, tr in trainers.items():
            E, R = final_reps(tr.model)
            e2id = tr.tf.entity_to_id
            out[A] = (None, E, R[tr.tf.relation_to_id[CO]] if CO in tr.tf.relation_to_id else None, tr.kind, e2id)
        return {A: v for A, v in out.items() if v[2] is not None}

    bad = 0
    for epoch in range(1, max_epochs + 1):
        tl = time.perf_counter()
        info['losses'].append(float(np.mean([tr.epoch() for tr in trainers.values()])))
        info['epoch_s'].append(time.perf_counter() - tl)
        if es and G.queries and epoch % ep['freq'] == 0:
            sp = specs_now()
            mrr = eval_routed(G, sp); mrr_f = eval_routed(G, sp, file_only=True)
            info['val'].append([epoch, mrr]); info['val_file'].append([epoch, mrr_f])
            if best['state'] is None or mrr > best['mrr'] * (1 + ep['rel_delta']):
                best.update(mrr=mrr, epoch=epoch, state={A: copy.deepcopy(tr.model.state_dict()) for A, tr in trainers.items()})
                info['val_file_at_best'] = mrr_f; bad = 0
            else:
                bad += 1
                if bad >= ep['patience']: break
        if log: log(epoch, info['losses'][-1], info)
    if best['state'] is not None:
        for A, tr in trainers.items(): tr.model.load_state_dict(best['state'][A])
    info.update(epochs=len(info['losses']), best_epoch=best['epoch'], val_mrr=best['mrr'] if best['state'] is not None else None,
                wall_s=time.perf_counter() - t0, peak_rss_mb=rss_mb(), kind='rotate',
                untrained_entities=len(set(G.full_ent) - set(G.known)))
    return trainers, info


def train(arm, config, seed, checkpoint_sha, holdout=None, outdir=None, max_epochs=None, es=True, batch_size=None,
          fallback=False, log=None):
    """Train one arm on the checkpoint graph (holdout=True: the stage-A 10 % pair hold-out). Saves
    reps.pt + meta.json in outdir (written as .part, then renamed). Returns info."""
    G = Graph(checkpoint_sha, holdout=bool(holdout))
    _CURRENT['G'] = G
    if arm == 'E5':
        trainers, info = train_routed(config, seed, G, max_epochs=max_epochs, es=es, log=log)
        reps = {'arm': 'E5', 'kind': 'rotate', 'specialists': {}}
        for A, tr in trainers.items():
            E, R = final_reps(tr.model)
            e2id = tr.tf.entity_to_id
            reps['specialists'][A] = dict(labels=sorted(e2id, key=e2id.get), E=E,
                                          rco=R[tr.tf.relation_to_id[CO]] if CO in tr.tf.relation_to_id else None,
                                          known=sorted({h for h, _, _ in area_triples(G.train, G.ents, A)} |
                                                       {t for _, _, t in area_triples(G.train, G.ents, A)}))
        model = trainers
    else:
        model, kind, tf, info = train_single(arm, config, seed, G, max_epochs=max_epochs, es=es,
                                             batch_size=batch_size, fallback=fallback, log=log)
        E, R = final_reps(model)
        e2id = tf.entity_to_id
        reps = dict(arm=arm, kind=kind, labels=sorted(e2id, key=e2id.get), E=E, rco=R[rel_index(model, tf, CO)], known=G.known)
    info['val_curve_note'] = 'val = filtered MRR of (h, co_changed, ?) over all entities; val_file = over file/doc entities'
    if outdir:
        part = outdir.rstrip('/\\') + '.part'
        os.makedirs(part, exist_ok=True)
        torch.save(reps, os.path.join(part, 'reps.pt'))
        json.dump(info, open(os.path.join(part, 'meta.json'), 'w'), indent=1, default=str)
        if os.path.exists(outdir):
            import shutil; shutil.rmtree(outdir)
        os.replace(part, outdir)
    return model, info, G


# ------------------------------------------------------------------ scoring tasks (stage B)
def _fold(E, idx, e, nbP):
    """Item 17: the entity's own final representation if known at C, else the mean of the final
    representations of its 1-hop neighbours at P that are known at C, else None (unscored)."""
    if e in idx: return E[idx[e]], False
    ks = [idx[n] for n in nbP.get(e, ()) if n in idx]
    if not ks: return None, False
    return E[torch.tensor(ks)].mean(0), True


def score(reps_path, rows, parent_sha):
    """rows: [(task_id, seed_path, [candidate paths])] for tasks at parent P = parent_sha, model trained at
    a checkpoint C (ancestor-or-self of P, checked by the caller). Returns (table {task_id: {cand: score}},
    counts). Entity of a path = 'file:<path>'. Unscored seeds/candidates get no row."""
    reps = torch.load(reps_path, weights_only=False)
    entsP, triP = read_graph(parent_sha)
    nbP = neighbours(triP)
    ent = lambda p: 'file:' + p
    table = {}; cnt = collections.Counter()
    if reps['arm'] != 'E5':
        idx = {e: i for i, e in enumerate(reps['labels'])}
        known = set(reps['known']); idx = {e: i for e, i in idx.items() if e in known}
        E, r, kind = reps['E'], reps['rco'], reps['kind']
        cache = {}

        def vec(e):
            if e not in cache: cache[e] = _fold(E, idx, e, nbP)
            return cache[e]
        for tid, sp, cands in rows:
            hv, hf = vec(ent(sp)); cnt['seeds'] += 1
            if hv is None: cnt['seeds_unscored'] += 1; table[tid] = {}; continue
            cnt['seeds_folded'] += int(hf)
            V = []; keep = []
            for c in cands:
                v, f = vec(ent(c)); cnt['cands'] += 1
                if v is None: cnt['cands_unscored'] += 1; continue
                cnt['cands_folded'] += int(f); V.append(v); keep.append(c)
            if not keep: table[tid] = {}; continue
            s = score_with(kind, hv.unsqueeze(0), r.unsqueeze(0), torch.stack(V))[0]
            table[tid] = {c: float(x) for c, x in zip(keep, s)}
        return table, dict(cnt)
    # E5: per specialist fold-in, router on P's 1-hop neighbours, percentiles within each specialist
    specs = {}
    for A, sd in reps['specialists'].items():
        if sd['rco'] is None: continue
        idx = {e: i for i, e in enumerate(sd['labels'])}; known = set(sd['known'])
        specs[A] = (sd['E'], sd['rco'], {e: i for e, i in idx.items() if e in known})
    for tid, sp, cands in rows:
        cnt['seeds'] += 1
        s = ent(sp); acc = collections.defaultdict(float); n = collections.Counter(); seed_any = False
        for A in route(s, entsP, nbP):
            if A not in specs: continue
            E, r, idx = specs[A]
            hv, hf = _fold(E, idx, s, nbP)
            if hv is None: continue
            seed_any = True; cnt['seed_specialist_folded'] += int(hf)
            V = []; keep = []
            for c in cands:
                v, f = _fold(E, idx, ent(c), nbP)
                if v is None: continue
                V.append(v); keep.append(c); cnt['cand_specialist_folded'] += int(f)
            if not keep: continue
            sc = score_with('rotate', hv.unsqueeze(0), r.unsqueeze(0), torch.stack(V))[0]
            pc = percentiles(sc)
            for c, x in zip(keep, pc.tolist()): acc[c] += x; n[c] += 1
        if not seed_any: cnt['seeds_unscored'] += 1
        table[tid] = {c: acc[c] / n[c] for c in n}
        cnt['cands'] += len(cands); cnt['cands_unscored'] += len(cands) - len(n)
    return table, dict(cnt)


# ------------------------------------------------------------------ CLI
if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'unit':
        arm, cid, outdir = sys.argv[2], sys.argv[3], sys.argv[4]
        fb = os.environ.get('KGE_E4_FALLBACK') == '1'
        cfg = dict(grid(arm, fallback=fb))[cid]
        bs = int(os.environ['KGE_E4_BATCH']) if arm == 'E4' and os.environ.get('KGE_E4_BATCH') else None
        seed = int(load_configs()['common']['seed_stageA'])
        _, info, _ = train(arm, cfg, seed, STAGEA_SHA, holdout=True, outdir=outdir, batch_size=bs, fallback=fb)
        print(json.dumps({k: info[k] for k in ('arm', 'val_mrr', 'epochs', 'best_epoch', 'wall_s', 'peak_rss_mb')}))
