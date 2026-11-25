"""T1: the U5 ablation, seeds and hard negatives (D4, tuning only). U5's code is imported unchanged; only the pair head's
inputs and the negative sampler differ here.
usage: abl.py run <variant> <seed>     variant: asis | nograph | nocount | hard | mix   (setting: U5's frozen choice)
       abl.py score_u5 <u5 run name>   score U5's saved best state on tuning into /t1/scores/u5_<name>/
Reads U5's pairs and graphs (/u5, read-only) and U4's caches; writes /t1/runs, /t1/ckpt, /t1/scores (tuning matrices only).
Held-out blocks are never loaded (make_blocks is called with ('train', 'tune') only)."""
import json, os, sys, time
import numpy as np
import torch, torch.nn as nn, torch.nn.functional as Fn
import u5lib as B
import train as TR
import u4lib as U

T1 = '/t1'
DEV = B.DEV
FROZEN = json.load(open('/u5/choice.json'))
CFG = dict(FROZEN['cfg'])          # sage L1 H128 N20 hl90 qwen
IX = {n: B.PAIR_NAMES.index(n) for n in ('PC', 'INV365', 'DEC90')}
HARD_K = 50


class Net(B.Net):
    """U5's network; mode 'nograph' = the head on the count features alone, 'nocount' = the head on node vectors alone."""
    def __init__(s, mode, arch, layers, H, din, drop=0.1):
        super().__init__(arch, layers, H, din, drop)
        s.mode = mode
        if mode == 'nograph':
            s.inp = None; s.layers = nn.ModuleList()
            s.head = nn.Sequential(nn.Linear(B.P, 128), nn.ReLU(), nn.Dropout(drop), nn.Linear(128, 1))
        elif mode == 'nocount':
            s.head = nn.Sequential(nn.Linear(4 * H, 128), nn.ReLU(), nn.Dropout(drop), nn.Linear(128, 1))

    def encode(s, g):
        return None if s.mode == 'nograph' else super().encode(g)

    def pairs(s, h, si, ci, X):
        if s.mode == 'nograph':
            return s.head(X).squeeze(1)
        a, b = h[si], h[ci]
        z = [a, b, a * b, (a - b).abs()] + ([] if s.mode == 'nocount' else [X])
        return s.head(torch.cat(z, 1)).squeeze(1)


def prep_hard(b):
    """per task: its non-truth rows among the counting top HARD_K (INV365, then PC, then DEC90 descending, then tie)."""
    X = b.X.cpu().numpy()
    b.hard = []
    for t in range(b.T):
        a, e = b.tb[t], b.tb[t + 1]
        o = np.lexsort((b.tie[a:e], -X[a:e, IX['DEC90']], -X[a:e, IX['PC']], -X[a:e, IX['INV365']]))[:HARD_K]
        h = a + o[b.y[a + o] == 0]
        b.hard.append(h if len(h) else b.negs[t])


def train(mode, hard, seed, trainb, evalb, ck, tag):
    """TR.train (U5) with the head mode and the negative pool as the only changes."""
    cfg = dict(CFG, seed=seed)
    din = trainb[0].g.features().shape[1]
    mu, sd = TR.norm_stats(trainb)
    for b in trainb:
        TR.prep_sampler(b)
        if hard:
            prep_hard(b)
    torch.manual_seed(cfg['seed'])
    net = Net(mode, cfg['arch'], cfg['layers'], cfg['hid'], din).to(DEV)
    opt = torch.optim.Adam(net.parameters(), lr=TR.LR, weight_decay=TR.WD)
    st = dict(ep=0, hist=[], best=dict(p=-1.0, ep=0, res=None, state=None), bad=0)
    if os.path.exists(ck):
        d = torch.load(ck, map_location=DEV, weights_only=False)
        net.load_state_dict(d['net']); opt.load_state_dict(d['opt']); st = d['st']
        TR.log(tag, 'resumed from epoch', st['ep'])
    units = [(i, t0) for i, b in enumerate(trainb) for t0 in range(0, b.T, TR.CHUNK)]
    while st['ep'] < TR.MAXEP:
        ep = st['ep']; t0 = time.time()
        rng = np.random.default_rng([cfg['seed'], ep]); torch.manual_seed(cfg['seed'] * 1000 + ep + 1)
        net.train(); tot, cnt = 0.0, 0
        for ui in rng.permutation(len(units)):
            bi, a0 = units[ui]; b = trainb[bi]
            rows = []
            for t in range(a0, min(a0 + TR.CHUNK, b.T)):
                neg = b.hard[t] if hard else b.negs[t]
                if len(neg) == 0:
                    continue
                for p in b.pos[t]:
                    if hard == 'mix':   # half from the counting top 50, half uniform over all non-truth candidates
                        u = b.negs[t]; nh = cfg['neg'] // 2
                        rows.append(np.r_[p, neg[rng.integers(0, len(neg), nh)], u[rng.integers(0, len(u), cfg['neg'] - nh)]])
                    else:
                        rows.append(np.r_[p, neg[rng.integers(0, len(neg), cfg['neg'])]])
            if not rows:
                continue
            R = torch.from_numpy(np.stack(rows)).to(DEV)
            h = net.encode(b.g)
            flat = R.reshape(-1)
            lg = net.pairs(h, b.si_t[flat], b.ci_t[flat], (b.X[flat] - mu) / sd).view(R.shape)
            loss = Fn.cross_entropy(lg, torch.zeros(len(R), dtype=torch.long, device=DEV))
            opt.zero_grad(); loss.backward(); torch.nn.utils.clip_grad_norm_(net.parameters(), 1.0); opt.step()
            tot += float(loss) * len(R); cnt += len(R)
        st['ep'] = ep + 1
        res = TR.evaluate(net, evalb, mu, sd); sm = TR.summarise(res)
        h_ = dict(ep=ep + 1, loss=tot / max(cnt, 1), secs=round(time.time() - t0, 1), tune=sm)
        if sm['pooled'] > st['best']['p']:
            st['best'] = dict(p=sm['pooled'], ep=ep + 1, res={r: {str(c): list(v) for c, v in d.items()} for r, d in res.items()},
                              state={k: v.detach().cpu().clone() for k, v in net.state_dict().items()})
            st['bad'] = 0
        else:
            st['bad'] += 1
        st['hist'].append(h_); TR.log(tag, json.dumps(h_))
        TR.atomic_save(dict(net=net.state_dict(), opt=opt.state_dict(), st=st), ck)
        if st['bad'] >= TR.PATIENCE:
            break
    net.load_state_dict(st['best']['state'])
    return net, mu, sd, st


def save_tune(name, net, blocks, mu, sd):
    for b in blocks:
        s = TR.score_block(net, b, mu, sd)
        M = np.full((b.T, b.N), -np.inf, dtype=np.float32); M[b.ti, b.ci] = s
        d = os.path.join(T1, 'scores', name, b.repo); os.makedirs(d, exist_ok=True)
        np.save(os.path.join(d, '%d.npy' % b.k), M)


def run(variant, seed):
    name = '%s_s%d' % (variant, seed)
    fp = os.path.join(T1, 'runs', name + '.json')
    if os.path.exists(fp):
        TR.log(name, 'finished already'); return
    torch.set_num_threads(int(os.environ.get('OMP_NUM_THREADS', '4')))
    t0 = time.time()
    blocks = TR.make_blocks(dict(CFG, seed=seed), ('train', 'tune'))
    trainb = [b for b in blocks if b.split == 'train']; tuneb = [b for b in blocks if b.split == 'tune']
    assert all(b.split in ('train', 'tune') for b in blocks)
    TR.log(name, 'loaded', len(trainb), len(tuneb), '%.0fs' % (time.time() - t0))
    mode = {'asis': 'asis', 'hard': 'asis', 'mix': 'asis', 'nograph': 'nograph', 'nocount': 'nocount'}[variant]
    os.makedirs(os.path.join(T1, 'ckpt'), exist_ok=True)
    net, mu, sd, st = train(mode, {'hard': True, 'mix': 'mix'}.get(variant, False), seed, trainb, tuneb, os.path.join(T1, 'ckpt', name + '.pt'), name)
    save_tune(name, net, tuneb, mu, sd)
    TR.atomic_json(dict(name=name, cfg=dict(CFG, seed=seed), variant=variant, best_ep=st['best']['ep'], tune_pooled=st['best']['p'],
                        per_commit=st['best']['res'], hist=st['hist'], secs=round(time.time() - t0)), fp)
    TR.log(name, 'done: best epoch', st['best']['ep'], 'pooled %.4f' % st['best']['p'])


def score_u5(name):
    d = torch.load(os.path.join('/u5', 'runs', name + '.best.pt'), map_location=DEV, weights_only=False)
    cfg = d['cfg']
    blocks = TR.make_blocks(cfg, ('tune',))
    din = blocks[0].g.features().shape[1]
    net = B.Net(cfg['arch'], cfg['layers'], cfg['hid'], din).to(DEV); net.load_state_dict(d['state'])
    sm = TR.summarise(TR.evaluate(net, blocks, d['mu'], d['sd']))
    rec = json.load(open(os.path.join('/u5', 'runs', name + '.json')))['tune_pooled']
    TR.log(name, 'rescored', json.dumps(sm), 'recorded %.6f' % rec)
    assert abs(sm['pooled'] - rec) < 1e-6, 'U5 state does not reproduce its tuning score'
    save_tune('u5_' + name, net, blocks, d['mu'], d['sd'])


if __name__ == '__main__':
    if sys.argv[1] == 'run':
        run(sys.argv[2], int(sys.argv[3]))
    elif sys.argv[1] == 'score_u5':
        score_u5(sys.argv[2])
