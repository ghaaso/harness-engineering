"""U5 training, sweep, cross-fitting and scoring of B4 (the GNN link predictor).
usage: train.py run <name>        one sweep run (resumes from /out/ckpt/<name>.pt; skipped when /out/runs/<name>.json exists)
       train.py plan              prints the next pending sweep run (stage logic reads the finished runs) or DONE
       train.py freeze            writes /out/choice.json from the finished sweep (best pooled tuning P@10)
       train.py crossfit [--fold f]   4 time folds of the training blocks; each fold scored by a model that did not train on it
       train.py final             tuning and held-out scored by the frozen model (the best state of the frozen run)
Names: <arch>_L<layers>_H<hidden>_N<negatives>_<weighting>_<nodes>_s<seed>   e.g. sage_L2_H128_N20_hl90_qwen_s0.
Training: sampled softmax over (positive, N sampled negatives from the same task's U4 candidate rows), Adam, a fixed number of
tasks per step (CHUNK), whole-block graph forward per step. Everything is seeded per epoch, so a resumed run repeats."""
import glob, json, os, sys, time
import numpy as np
import torch, torch.nn.functional as Fn
import d4lib as L
import u4lib as U
import u5lib as B

OUT = B.OUT
CHUNK = 16                  # tasks per step (the same in every configuration)
LR, WD, PATIENCE = float(os.environ.get('U5_LR', '1e-3')), 1e-5, 6
MAXEP = int(os.environ.get('U5_MAXEP', '30'))
SUBSET = int(os.environ.get('U5_SUBSET', '0'))     # tests only: at most this many training blocks per repository
CK_EVERY = 600              # seconds between mid-epoch checkpoints
DEV = B.DEV


def log(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)


def parse(name):
    p = name.split('_')
    return dict(arch=p[0], layers=int(p[1][1:]), hid=int(p[2][1:]), neg=int(p[3][1:]), w=p[4], nodes=p[5], seed=int(p[6][1:]))


def mkname(c):
    return '%s_L%d_H%d_N%d_%s_%s_s%d' % (c['arch'], c['layers'], c['hid'], c['neg'], c['w'], c['nodes'], c['seed'])


def atomic_save(obj, fp):
    os.makedirs(os.path.dirname(fp), exist_ok=True)
    torch.save(obj, fp + '.tmp'); os.replace(fp + '.tmp', fp)


def atomic_json(obj, fp):
    os.makedirs(os.path.dirname(fp), exist_ok=True)
    json.dump(obj, open(fp + '.tmp', 'w'), indent=1); os.replace(fp + '.tmp', fp)


# ---------------------------------------------------------------------------------------------- data
class Blk:
    pass


def load_pairs(repo, k):
    z = np.load(os.path.join(OUT, 'pairs', repo, '%d.npz' % k))      # not kept: the feature matrix lives on the device only
    return {c: z[c] for c in z.files}


def blocks_of(repo, split):
    plan = json.load(open(os.path.join(L.DATA, repo, 'plan.json')))
    ks = [b['k'] for b in plan['blocks'] if b['split'] == split]
    return [k for k in ks if os.path.exists(os.path.join(OUT, 'pairs', repo, '%d.npz' % k))]


def make_blocks(cfg, splits=('train', 'tune'), repos=L.REPOS):
    out = []
    for r in repos:
        for sp in splits:
            for k in blocks_of(r, sp)[-SUBSET if (SUBSET and sp == 'train') else None:]:
                z = load_pairs(r, k)
                g = dict(np.load(os.path.join(OUT, 'graph', r, '%d.npz' % k)))
                b = Blk(); b.repo, b.k, b.split = r, k, sp
                b.g = B.DGraph(g, r, cfg['w'], cfg['nodes'], cfg['arch'])
                b.N, b.T = int(z['N']), int(z['T'])
                b.ti = z['ti']; b.ci = z['ci']; b.y = z['y']; b.commit = z['commit']; b.tie = z['tie']; b.seeds = z['seeds']
                b.X = torch.from_numpy(z['X']).to(DEV)
                b.si_t = torch.from_numpy(b.seeds[b.ti].astype(np.int64)).to(DEV); b.ci_t = torch.from_numpy(b.ci.astype(np.int64)).to(DEV)
                out.append(b)
    return out


def prep_sampler(b):
    """per task: start/end of its rows (rows are sorted by task), its positive and negative rows."""
    ti = b.ti; T = b.T
    edges = np.searchsorted(ti, np.arange(T + 1))
    b.tb = edges
    b.pos, b.negs = [], []
    for t in range(T):
        a, e = edges[t], edges[t + 1]
        yy = b.y[a:e]
        b.pos.append(a + np.nonzero(yy)[0]); b.negs.append(a + np.nonzero(yy == 0)[0])


def norm_stats(blocks):
    n = 0; s = np.zeros(B.P); q = np.zeros(B.P)
    for b in blocks:
        X = b.X.double().cpu().numpy(); n += len(X); s += X.sum(0); q += (X * X).sum(0)
    mu = s / n; sd = np.sqrt(np.maximum(q / n - mu ** 2, 1e-12))
    return torch.tensor(mu, dtype=torch.float32, device=DEV), torch.tensor(sd, dtype=torch.float32, device=DEV)


# ---------------------------------------------------------------------------------------------- scoring
@torch.no_grad()
def score_block(net, b, mu, sd):
    net.eval()
    h = net.encode(b.g)
    out = []
    for s0 in range(0, len(b.X), 500000):
        sl = slice(s0, s0 + 500000)
        out.append(net.pairs(h, b.si_t[sl], b.ci_t[sl], (b.X[sl] - mu) / sd).float().cpu())
    return torch.cat(out).numpy() if out else np.zeros(0, dtype=np.float32)


def evaluate(net, blocks, mu, sd):
    """per-commit (P@10, R@10) by repository for the tuning blocks: {repo: {commit: (p, r)}}"""
    res = {}
    for b in blocks:
        s = score_block(net, b, mu, sd)
        pc = U.per_commit_table(b.commit, b.ti, s, b.tie, b.y)
        res.setdefault(b.repo, {}).update(pc)
    return res


def summarise(res):
    allp = [v[0] for r in res.values() for v in r.values()]
    return dict(pooled=float(np.mean(allp)), n=len(allp), **{r: float(np.mean([v[0] for v in d.values()])) for r, d in res.items()})


# ---------------------------------------------------------------------------------------------- training
def train(cfg, name, trainb, evalb=None, epochs=None, ck=None, tag=''):
    """Train on `trainb`. With evalb: evaluate every epoch and stop at patience (the sweep). With epochs: exactly that many
    epochs (cross-fitting). Resumes from `ck`. Returns (net, mu, sd, hist, best)."""
    din = (trainb[0].g.features().shape[1])
    mu, sd = norm_stats(trainb)
    for b in trainb:
        prep_sampler(b)
    torch.manual_seed(cfg['seed'])
    net = B.Net(cfg['arch'], cfg['layers'], cfg['hid'], din).to(DEV)
    opt = torch.optim.Adam(net.parameters(), lr=LR, weight_decay=WD)
    st = dict(ep=0, hist=[], best=dict(p=-1.0, ep=0, res=None, state=None), bad=0)
    if ck and os.path.exists(ck):
        d = torch.load(ck, map_location=DEV, weights_only=False)
        net.load_state_dict(d['net']); opt.load_state_dict(d['opt']); st = d['st']
        log(tag, 'resumed from epoch', st['ep'])
    units = [(i, t0) for i, b in enumerate(trainb) for t0 in range(0, b.T, CHUNK)]

    def save(partial=False):
        if ck:
            atomic_save(dict(net=net.state_dict(), opt=opt.state_dict(), st=st, mu=mu, sd=sd, partial=partial), ck)
    last_ck = time.time()
    maxep = epochs if epochs is not None else MAXEP
    while st['ep'] < maxep:
        ep = st['ep']; t0 = time.time()
        rng = np.random.default_rng([cfg['seed'], ep]); torch.manual_seed(cfg['seed'] * 1000 + ep + 1)
        net.train(); tot, cnt = 0.0, 0
        for ui in rng.permutation(len(units)):
            bi, a0 = units[ui]; b = trainb[bi]
            tasks = range(a0, min(a0 + CHUNK, b.T))
            rows = []
            for t in tasks:
                neg = b.negs[t]
                if len(neg) == 0:
                    continue
                for p in b.pos[t]:
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
            if time.time() - last_ck > CK_EVERY:
                save(partial=True); last_ck = time.time()
        st['ep'] = ep + 1
        h_ = dict(ep=ep + 1, loss=tot / max(cnt, 1), secs=round(time.time() - t0, 1))
        if evalb is not None:
            res = evaluate(net, evalb, mu, sd); sm = summarise(res); h_['tune'] = sm
            if sm['pooled'] > st['best']['p']:
                st['best'] = dict(p=sm['pooled'], ep=ep + 1, res={r: {str(c): list(v) for c, v in d.items()} for r, d in res.items()},
                                  state={k: v.detach().cpu().clone() for k, v in net.state_dict().items()})
                st['bad'] = 0
            else:
                st['bad'] += 1
        st['hist'].append(h_)
        log(tag, json.dumps(h_))
        save(); last_ck = time.time()
        if evalb is not None and st['bad'] >= PATIENCE:
            break
    return net, mu, sd, st


def run(name):
    cfg = parse(name)
    fp = os.path.join(OUT, 'runs', name + '.json')
    if os.path.exists(fp):
        log(name, 'finished already'); return
    t0 = time.time()
    blocks = make_blocks(cfg)
    trainb = [b for b in blocks if b.split == 'train']; tuneb = [b for b in blocks if b.split == 'tune']
    log(name, 'data loaded: train blocks', len(trainb), 'tune blocks', len(tuneb), '%.0fs' % (time.time() - t0), 'device', DEV)
    net, mu, sd, st = train(cfg, name, trainb, tuneb, ck=os.path.join(OUT, 'ckpt', name + '.pt'), tag=name)
    best = st['best']
    atomic_save(dict(state=best['state'], mu=mu, sd=sd, cfg=cfg, ep=best['ep']), os.path.join(OUT, 'runs', name + '.best.pt'))
    atomic_json(dict(name=name, cfg=cfg, best_ep=best['ep'], tune_pooled=best['p'], per_commit=best['res'], hist=st['hist'],
                     tune={r: float(np.mean([v[0] for v in d.values()])) for r, d in best['res'].items()},
                     secs=round(time.time() - t0), peak_gpu_gb=(torch.cuda.max_memory_allocated() / 2 ** 30 if DEV.type == 'cuda' else None)), fp)
    log(name, 'done: best epoch', best['ep'], 'pooled tuning P@10 %.4f' % best['p'])


# ---------------------------------------------------------------------------------------------- the sweep plan
S1 = [dict(arch=a, layers=l, hid=h, neg=n) for a in ('sage', 'gat') for l in (1, 2) for h in (64, 128) for n in (5, 20)]
W_ALL = ['bin', 'raw', 'hl30', 'hl90', 'hl365']
NODES_ALL = ['qwen', 'swerank', 'none']


def result(name):
    fp = os.path.join(OUT, 'runs', name + '.json')
    return json.load(open(fp)) if os.path.exists(fp) else None


def claimed(n):
    return os.path.isdir(os.path.join(OUT, 'claims', n))


def plan():
    """Stage 1: arch x layers x hidden x negatives with weighting hl90 and Qwen3 nodes. Stage 2a: the edge weighting at the
    stage-1 best. Stage 2b: the node features at that. Choice by pooled tuning P@10. Returns the first run of the current
    stage that is neither finished nor claimed by a worker; BUSY while the stage's remaining runs are all claimed."""
    def stage(names, need_emb=False):
        pend = [n for n in names if not result(n)]
        if not pend:
            return None
        for n in pend:
            if need_emb and 'swerank' in n and not os.path.exists(os.path.join(OUT, 'emb', 'zulip.npz')):
                continue
            if not claimed(n):
                return n
        return 'WAIT_SWERANK' if any('swerank' in n and not os.path.exists(os.path.join(OUT, 'emb', 'zulip.npz')) for n in pend) and need_emb \
            and all(claimed(n) or 'swerank' in n for n in pend) else 'BUSY'
    base = dict(w='hl90', nodes='qwen', seed=0)
    n1 = [mkname(dict(c, **base)) for c in S1]
    r = stage(n1)
    if r:
        return r
    b1 = max(n1, key=lambda n: result(n)['tune_pooled']); c1 = parse(b1)
    n2 = [mkname(dict(c1, w=w)) for w in W_ALL if w != 'hl90']
    r = stage(n2)
    if r:
        return r
    b2 = max([b1] + n2, key=lambda n: result(n)['tune_pooled']); c2 = parse(b2)
    n3 = [mkname(dict(c2, nodes=x)) for x in NODES_ALL if x != 'qwen']
    r = stage(n3, need_emb=True)
    return r or 'DONE'


def take(who):
    """The next run for a worker (claimed with mkdir), 'BUSY', 'WAIT_SWERANK' or 'DONE'."""
    os.makedirs(os.path.join(OUT, 'claims'), exist_ok=True)
    for _ in range(20):
        n = plan()
        if n in ('BUSY', 'WAIT_SWERANK', 'DONE'):
            return n
        try:
            os.mkdir(os.path.join(OUT, 'claims', n))
            open(os.path.join(OUT, 'claims', n, 'who.txt'), 'w').write('%s %s' % (who, time.strftime('%FT%T')))
            return n
        except FileExistsError:
            continue
    return 'BUSY'


def work(who):
    """One sweep run by this worker; exit code 0 = ran one, 10 = sweep finished, 11 = nothing free now, 12 = waits for the SweRank vectors."""
    n = take(who)
    if n in ('BUSY', 'WAIT_SWERANK', 'DONE'):
        log('worker', who, n); return {'DONE': 10, 'BUSY': 11, 'WAIT_SWERANK': 12}[n]
    try:
        run(n)
    finally:
        import shutil; shutil.rmtree(os.path.join(OUT, 'claims', n), ignore_errors=True)   # a failed run resumes from its checkpoint
    return 0


def unclaim_all():
    import shutil; shutil.rmtree(os.path.join(OUT, 'claims'), ignore_errors=True)


def freeze():
    names = [os.path.basename(f)[:-5] for f in glob.glob(os.path.join(OUT, 'runs', '*_s0.json'))]
    rs = {n: result(n) for n in names}
    best = max(rs, key=lambda n: rs[n]['tune_pooled'])
    table = sorted(((n, rs[n]['tune_pooled'], rs[n]['best_ep'], rs[n]['tune']) for n in rs), key=lambda x: -x[1])
    atomic_json(dict(name=best, cfg=parse(best), best_ep=rs[best]['best_ep'], tune_pooled=rs[best]['tune_pooled'], runs=table), os.path.join(OUT, 'choice.json'))
    log('frozen', best, rs[best]['tune_pooled'])


# ---------------------------------------------------------------------------------------------- cross-fitting and final scoring
def folds(repo, ks):
    return [list(map(int, f)) for f in np.array_split(np.array(sorted(ks)), 4)]


def save_scores(split, b, s, fill):
    M = np.full((b.T, b.N), fill, dtype=np.float32)
    M[b.ti, b.ci] = s
    M[np.arange(b.T), b.seeds] = -np.inf
    d = os.path.join(OUT, 'scores', split, b.repo); os.makedirs(d, exist_ok=True)
    fp = os.path.join(d, '%d.npy' % b.k)
    np.save(fp + '.tmp.npy', M); os.replace(fp + '.tmp.npy', fp)


def crossfit(only=None):
    ch = json.load(open(os.path.join(OUT, 'choice.json'))); cfg = ch['cfg']; ep = ch['best_ep']
    blocks = make_blocks(cfg, ('train', 'tune'))
    trainb = [b for b in blocks if b.split == 'train']; tuneb = [b for b in blocks if b.split == 'tune']
    fold_of = {}
    for r in L.REPOS:
        for f, ks in enumerate(folds(r, [b.k for b in trainb if b.repo == r])):
            for k in ks:
                fold_of[(r, k)] = f
    for f in range(4):
        if only is not None and f != only:
            continue
        done = os.path.join(OUT, 'crossfit', 'fold%d.json' % f)
        if os.path.exists(done):
            log('fold', f, 'finished already'); continue
        tr = [b for b in trainb if fold_of[(b.repo, b.k)] != f]; te = [b for b in trainb if fold_of[(b.repo, b.k)] == f]
        net, mu, sd, st = train(cfg, ch['name'], tr, None, epochs=ep, ck=os.path.join(OUT, 'ckpt', 'fold%d.pt' % f), tag='fold%d' % f)
        for b in te:
            save_scores('train', b, score_block(net, b, mu, sd), np.nan)
        sm = summarise(evaluate(net, tuneb, mu, sd))
        atomic_json(dict(fold=f, epochs=ep, train_blocks=len(tr), scored_blocks=[[b.repo, b.k] for b in te], tune_of_fold_model=sm), done)
        log('fold', f, 'scored', len(te), 'blocks; this fold model on tuning', json.dumps(sm))


def final():
    ch = json.load(open(os.path.join(OUT, 'choice.json'))); cfg = ch['cfg']
    d = torch.load(os.path.join(OUT, 'runs', ch['name'] + '.best.pt'), map_location=DEV, weights_only=False)
    blocks = make_blocks(cfg, ('tune', 'test'))
    din = blocks[0].g.features().shape[1]
    net = B.Net(cfg['arch'], cfg['layers'], cfg['hid'], din).to(DEV); net.load_state_dict(d['state']); mu, sd = d['mu'], d['sd']
    tune = [b for b in blocks if b.split == 'tune']
    sm = summarise(evaluate(net, tune, mu, sd))
    log('frozen model on tuning', json.dumps(sm), 'choice run', ch['tune_pooled'])
    assert abs(sm['pooled'] - ch['tune_pooled']) < 2e-3, 'the frozen model does not reproduce its tuning score'
    for b in blocks:
        s = score_block(net, b, mu, sd)
        if b.split == 'test':
            assert not b.y.any()
            save_scores('heldout', b, s, -np.inf)
        else:
            save_scores('tune', b, s, -np.inf)
    atomic_json(dict(tune=sm, test_blocks=sum(b.split == 'test' for b in blocks)), os.path.join(OUT, 'final.json'))


if __name__ == '__main__':
    c = sys.argv[1]
    if c == 'run':
        run(sys.argv[2])
    elif c == 'plan':
        print(plan())
    elif c == 'work':
        sys.exit(work(sys.argv[2]))
    elif c == 'unclaim':
        unclaim_all()
    elif c == 'freeze':
        freeze()
    elif c == 'crossfit':
        crossfit(int(sys.argv[3]) if len(sys.argv) > 3 else None)
    elif c == 'final':
        final()
