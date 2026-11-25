"""U6 (B5): data context, training with checkpoints, and scoring of the U4 table rows for DyGFormer and TGN.
Mounts (run_u6.sh): /u4 = CR/improve/U4 (read-only), /out = CR/improve/U6, /dyglib, /card (D4 code), /code.
A block's scores use only events strictly before its cutoff: the sampler answers 'strictly before time t' and the TGN memory is
replayed only through commits[:hend] of that block (hend = first task commit; commits are in committer-time order and
commits[:hend] all have ct < cutoff, asserted by d4lib at load)."""
import json, os, sys, time, glob
import numpy as np
import pandas as pd
import torch
import torch.nn as nn

sys.path.insert(0, '/code')
import stream as S
import u6models as M

U4 = os.environ.get('U4_ROOT', '/u4')
OUT = os.environ.get('U6_OUT', '/out')
BATCH = 200
TABLE_COLS = ['k', 'commit', 'task', 'seed', 'cand', 'tie', 'label']


def vname(stream, kind):
    return kind if stream == 'pair' else stream + '-' + kind


def log(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)


def atomic_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path + '.tmp', 'w') as f:
        json.dump(obj, f)
    os.replace(path + '.tmp', path)


def atomic_save(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    for attempt in range(8):          # a write can fail while the shared disk is briefly full: wait and write again (nothing is skipped)
        try:
            torch.save(obj, path + '.tmp')
            break
        except (RuntimeError, OSError) as e:
            log('save failed (%s), attempt %d' % (str(e)[:80], attempt + 1))
            if attempt == 7:
                raise
            time.sleep(30)
    os.replace(path + '.tmp', path)


def cuda_rng():
    return torch.cuda.get_rng_state_all() if torch.cuda.is_available() else None


class Ctx:
    def __init__(self, repo, commits=None, stream=None, sname='pair'):
        self.repo = repo
        self.sname = sname
        d = os.path.join(U4, 'data', repo)
        self.dir = d
        self.commits = commits if commits is not None else [json.loads(l) for l in open(os.path.join(d, 'commits.jsonl')) if l.strip()]
        self.plan = json.load(open(os.path.join(d, 'plan.json')))
        self.meta = {b['k']: b for b in self.plan['blocks']}
        self.st = stream if stream is not None else S.make_stream(sname, self.commits)
        self.sampler = S.FastSampler(self.st)
        self.ix = json.load(open(os.path.join(U4, 'snap', repo, 'index.json')))
        self._X, self._alive, self._tab = {}, {}, {}

    def ks(self, split):
        return sorted([b['k'] for b in self.plan['blocks'] if b['split'] == split], key=lambda k: self.meta[k]['hend'])

    def seg(self, k):
        return self.ix['block_seg'][str(k)]

    def X(self, k):
        s = self.seg(k)
        if s not in self._X:
            sg = self.ix['segments'][s]
            self._X[s] = S.node_features(U4, self.repo, sg['files'], self.st.max_id, st=self.st)
        return self._X[s]

    def seg_hend(self, k):
        return self.ix['segments'][self.seg(k)]['hend']

    def alive(self, k):
        if k not in self._alive:
            b = json.load(open(os.path.join(self.dir, 'blocks', '%d.json' % k)))
            self._alive[k] = np.array(sorted(int(x) for x in b['alive']), dtype=np.int64)
        return self._alive[k]

    def table(self, k):
        if k not in self._tab:
            sp = self.meta[k]['split']
            sp = {'train': 'train', 'tune': 'tune', 'test': 'test'}[sp]
            fp = os.path.join(U4, 'tables', self.repo, sp, '%d.csv.gz' % k)
            self._tab[k] = pd.read_csv(fp, usecols=TABLE_COLS)
        return self._tab[k]

    def cutoff_days(self, k):
        return self.st.time_of(self.meta[k]['cutoff_ct'])

    def hend(self, k):
        return self.meta[k]['hend']


class Runner:
    def __init__(self, ctx, kind, nbr, lr, device='cuda', seed=0, dropout=0.1):
        self.bip = ctx.st.kind == 'bip'
        self.ctx, self.kind, self.nbr, self.lr, self.dev, self.seed = ctx, kind, nbr, lr, device, seed
        torch.manual_seed(seed)
        X0 = np.zeros((ctx.st.max_id + 2, 1024), dtype=np.float32)
        self.bb, self.lp = M.build(kind, X0, ctx.st.edge_feat, ctx.sampler, nbr, device, dropout=dropout)
        self.params = [p for p in list(self.bb.parameters()) + list(self.lp.parameters()) if p.requires_grad]
        self.opt = torch.optim.Adam(self.params, lr=lr)
        self.lossf = nn.BCEWithLogitsLoss()
        self.mem_pos = 0

    # ----------------------------------------------------------------- state
    def state(self, with_memory=True):
        s = dict(bb=self.bb.state_dict(), lp=self.lp.state_dict(), opt=self.opt.state_dict())
        if self.kind == 'tgn' and with_memory:
            s['mem'] = self.mem_state()
        return s

    def light_state(self):
        s = dict(bb=self.bb.state_dict(), lp=self.lp.state_dict())
        if self.kind == 'tgn':
            s['mem'] = self.mem_state()
        return s

    def mem_state(self):
        mb = self.bb.memory_bank
        raw = {int(n): [(m.detach().cpu(), float(t)) for m, t in v] for n, v in mb.node_raw_messages.items() if len(v)}
        return dict(mem=mb.node_memories.data.cpu(), last=mb.node_last_updated_times.data.cpu(), raw=raw, pos=self.mem_pos)

    def load_mem(self, m):
        mb = self.bb.memory_bank
        mb.node_memories.data = m['mem'].to(self.dev); mb.node_last_updated_times.data = m['last'].to(self.dev)
        mb.node_raw_messages = type(mb.node_raw_messages)(list)
        for n, v in m['raw'].items():
            mb.node_raw_messages[n] = [(x.to(self.dev), np.float64(t)) for x, t in v]
        self.mem_pos = m['pos']

    def load_state(self, s):
        self.bb.load_state_dict(s['bb']); self.lp.load_state_dict(s['lp'])
        if 'opt' in s:
            self.opt.load_state_dict(s['opt'])
        if 'mem' in s:
            self.load_mem(s['mem'])

    def set_X(self, X):
        self.bb.set_node_features(X)

    # ----------------------------------------------------------------- training
    def batch_loss(self, idx, rng, pool):
        st = self.ctx.st
        src, dst = st.u_src[idx], st.u_dst[idx]
        fl = rng.random(len(idx)) < 0.5
        src, dst = np.where(fl, dst, src), np.where(fl, src, dst)
        neg = pool[rng.integers(len(pool), size=len(idx))]
        t = st.u_t[idx]
        if self.bip and self.kind == 'tgn':
            B = len(idx)
            emb = self.bb.node_embeddings(np.concatenate([src, dst, neg]), np.concatenate([t, t, t]), self.nbr)
            pos = self.lp(input_1=emb[:B], input_2=emb[B:2 * B]).squeeze(-1)
            ng = self.lp(input_1=emb[:B], input_2=emb[2 * B:]).squeeze(-1)
            pred = torch.cat([pos, ng]); lab = torch.cat([torch.ones_like(pos), torch.zeros_like(ng)])
            return self.lossf(pred, lab)
        if self.kind == 'tgn':
            ns, nd = self.bb.compute_src_dst_node_temporal_embeddings(src_node_ids=src, dst_node_ids=neg, node_interact_times=t,
                                                                      edge_ids=None, edges_are_positive=False, num_neighbors=self.nbr)
            ps, pd_ = self.bb.compute_src_dst_node_temporal_embeddings(src_node_ids=src, dst_node_ids=dst, node_interact_times=t,
                                                                       edge_ids=(idx + 1).astype(np.int64), edges_are_positive=True,
                                                                       num_neighbors=self.nbr)
        else:
            ps, pd_ = self.bb.compute_src_dst_node_temporal_embeddings(src, dst, t)
            ns, nd = self.bb.compute_src_dst_node_temporal_embeddings(src, neg, t)
        pos = self.lp(input_1=ps, input_2=pd_).squeeze(-1)
        ng = self.lp(input_1=ns, input_2=nd).squeeze(-1)
        pred = torch.cat([pos, ng]); lab = torch.cat([torch.ones_like(pos), torch.zeros_like(ng)])
        return self.lossf(pred, lab)

    def train(self, k_first, epochs, run_dir, eval_epochs=(), eval_fn=None, ckpt_secs=600, keep_epochs=(), epoch_secs=120):
        """Train on the events of commits strictly before block k_first's hend (the first block of the span the model will score),
        node features from that block's content snapshot. Resumable: run_dir/ckpt.pt is the newest state (epoch end, or every
        ckpt_secs inside an epoch; at an epoch end only when epoch_secs have passed since the last save, and always at keep_epochs, eval_epochs and the last epoch: the cadence changes nothing the model sees, batch rng is seeded by (seed, epoch, batch), torch rng is restored from the checkpoint). eval_fn(runner, epoch) is called at each epoch in eval_epochs (once; its result is kept by
        the caller). keep_epochs: epochs whose state (model and memory) is saved to run_dir/state_e<epoch>.pt."""
        ctx, st = self.ctx, self.ctx.st
        n_tr = int(st.u_hend[ctx.hend(k_first)])          # units to learn (the pair stream: = events)
        n_ev = int(st.ev_hend[ctx.hend(k_first)])         # graph events before the span
        self.n_tr, self.n_ev = n_tr, n_ev
        self.set_X(ctx.X(k_first))
        if n_tr == 0:
            raise RuntimeError('no training events')
        pool = np.unique(np.concatenate([st.u_src[:n_tr], st.u_dst[:n_tr]]))
        nb = (n_tr + BATCH - 1) // BATCH
        ck = os.path.join(run_dir, 'ckpt.pt')
        e0, b0 = 0, 0
        if os.path.exists(ck):
            c = torch.load(ck, map_location='cpu', weights_only=False)
            self.load_state(c['state']); e0, b0 = c['epoch'], c['batch']
            if 'rng' in c:
                torch.set_rng_state(c["rng"])
            if c.get("cuda_rng") is not None and torch.cuda.is_available():
                torch.cuda.set_rng_state_all(c["cuda_rng"])
            log('resumed at epoch %d batch %d' % (e0, b0))
            if b0 == 0 and e0 > 0 and e0 in eval_epochs and eval_fn is not None:
                eval_fn(self, e0)          # the process died between the epoch-end state and its evaluation
        losses = []
        last_ck = time.time()
        for ep in range(e0, epochs):
            self.bb.train(); self.lp.train()
            if self.kind == 'tgn' and b0 == 0:
                self.bb.memory_bank.__init_memory_bank__()
                self.mem_pos = 0
            t0 = time.time()
            for bi in range(b0, nb):
                idx = np.arange(bi * BATCH, min((bi + 1) * BATCH, n_tr))
                rng = np.random.default_rng([self.seed, ep, bi, 5])
                if self.bip and self.kind == 'tgn':
                    # memory holds the graph events of the commits before this batch's first unit (not its own commit)
                    self.advance(int(st.ev_hend[int(st.u_commit[idx[0]])]))
                    self.bb.train(); self.lp.train()
                loss = self.batch_loss(idx, rng, pool)
                self.opt.zero_grad(); loss.backward(); self.opt.step()
                if self.kind == 'tgn':
                    self.bb.memory_bank.detach_memory_bank()
                losses.append(loss.item())
                if time.time() - last_ck > ckpt_secs and bi + 1 < nb:
                    if not self.bip:
                        self.mem_pos = (bi + 1) * BATCH
                    atomic_save(ck, dict(state=self.state(), epoch=ep, batch=bi + 1, rng=torch.get_rng_state(), cuda_rng=cuda_rng()))
                    last_ck = time.time()
            b0 = 0
            if self.bip and self.kind == 'tgn':
                self.advance(n_ev)
            self.mem_pos = n_ev
            log('epoch %d done: loss %.4f, %.0fs, %d batches' % (ep + 1, float(np.mean(losses[-nb:])), time.time() - t0, nb))
            e1 = ep + 1
            if e1 in keep_epochs:
                atomic_save(os.path.join(run_dir, 'state_e%d.pt' % e1), self.light_state())
            # epoch-end state first (so a crash during the evaluation loses nothing), then the evaluation
            if e1 in keep_epochs or e1 in eval_epochs or e1 == epochs or time.time() - last_ck >= epoch_secs:
                atomic_save(ck, dict(state=self.state(), epoch=e1, batch=0, rng=torch.get_rng_state(), cuda_rng=cuda_rng()))
                last_ck = time.time()
            if e1 in eval_epochs and eval_fn is not None:
                eval_fn(self, e1)
        return self

    # ----------------------------------------------------------------- scoring
    @torch.no_grad()
    def advance(self, e_to):
        """TGN: replay events [mem_pos, e_to) into the memory (eval mode), in batches of BATCH, in time order."""
        st = self.ctx.st
        self.bb.eval(); self.lp.eval()
        while self.mem_pos < e_to:
            hi = min(self.mem_pos + BATCH, e_to)
            idx = np.arange(self.mem_pos, hi)
            self.bb.compute_src_dst_node_temporal_embeddings(src_node_ids=st.src[idx], dst_node_ids=st.dst[idx], node_interact_times=st.t[idx],
                                                             edge_ids=(idx + 1).astype(np.int64), edges_are_positive=True, num_neighbors=self.nbr)
            self.bb.memory_bank.detach_memory_bank()
            self.mem_pos = hi

    @torch.no_grad()
    def score_block(self, k, row_batch=1000):
        """Logits for the rows of block k's table, using only events before its cutoff. TGN: the memory must already hold exactly
        the events of commits[:hend] (call advance first)."""
        ctx = self.ctx
        df = ctx.table(k)
        ids = ctx.alive(k)
        t = ctx.cutoff_days(k)
        self.set_X(ctx.X(k))
        self.bb.eval(); self.lp.eval()
        seed_g = ids[df['seed'].values] + 1; cand_g = ids[df['cand'].values] + 1
        out = np.zeros(len(df), dtype=np.float32)
        if self.kind == 'tgn':
            assert self.mem_pos == int(ctx.st.ev_hend[ctx.hend(k)]), 'memory is not at this block\'s cutoff'
            node = np.unique(np.concatenate([seed_g, cand_g]))
            emb = self.bb.node_embeddings(node, t, self.nbr)
            pos = {int(n): i for i, n in enumerate(node)}
            si = torch.from_numpy(np.searchsorted(node, seed_g)).to(self.dev); ci = torch.from_numpy(np.searchsorted(node, cand_g)).to(self.dev)
            for a in range(0, len(df), 20000):
                z = self.lp(input_1=emb[si[a:a + 20000]], input_2=emb[ci[a:a + 20000]]).squeeze(-1)
                out[a:a + 20000] = z.float().cpu().numpy()
        else:
            for a in range(0, len(df), row_batch):
                s, c = seed_g[a:a + row_batch], cand_g[a:a + row_batch]
                tt = np.full(len(s), t, dtype=np.float64)
                es, ed = self.bb.compute_src_dst_node_temporal_embeddings(s, c, tt)
                out[a:a + row_batch] = self.lp(input_1=es, input_2=ed).squeeze(-1).float().cpu().numpy()
        return out

    @torch.no_grad()
    def score_blocks(self, ks, save_dir=None):
        """Score blocks (ascending hend). TGN replays the memory through each block's history in order, from self.mem_pos, and
        restores the memory bank afterwards. Returns {k: scores}; each is also written to save_dir/<k>.npy when given."""
        ks = sorted(ks, key=lambda k: self.ctx.hend(k))
        res = {}
        bak = None
        if self.kind == 'tgn':
            bak = (self.bb.memory_bank.backup_memory_bank(), self.mem_pos)
        for k in ks:
            if save_dir and os.path.exists(os.path.join(save_dir, '%d.npy' % k)):
                res[k] = np.load(os.path.join(save_dir, '%d.npy' % k)); continue
            if self.kind == 'tgn':
                self.set_X(self.ctx.X(k))
                self.advance(int(self.ctx.st.ev_hend[self.ctx.hend(k)]))
            res[k] = self.score_block(k)
            if save_dir:
                os.makedirs(save_dir, exist_ok=True)
                np.save(os.path.join(save_dir, '%d.tmp.npy' % k), res[k]); os.replace(os.path.join(save_dir, '%d.tmp.npy' % k), os.path.join(save_dir, '%d.npy' % k))
        if bak is not None:
            self.bb.memory_bank.reload_memory_bank(bak[0]); self.mem_pos = bak[1]
        return res


def per_commit(ctx, ks, scores):
    """{commit: (P@10, recall@10)} over the blocks ks, from the table rows, the card's rule (ties by the table's tie key)."""
    import u4lib as U
    out = {}
    for k in ks:
        df = ctx.table(k)
        out.update(U.per_commit_table(df['commit'].values, df['task'].values, scores[k], df['tie'].values, df['label'].values))
    return out
