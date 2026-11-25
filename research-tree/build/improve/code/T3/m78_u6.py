"""T3 measurements 7 and 8: U6's pair-stream models as they are against a changed twin, same device (CPU), seed, data, epochs and
evaluations (U6's sweep protocol: train on the events before the first tuning block, score the tuning tables at 2,5,10,20,40,70,100).
U6's code (core.Runner, DyGLib) imported unchanged; only the twin's change is overridden here.
usage: m78_u6.py <kind dygformer|tgn> <repo> <nbr> <lr> <mode asis|mem|hist> [max_epoch]
  asis2: a repeat of asis (run-to-run noise on this CPU)
  mem  (pair TGN only): before each training batch the memory holds exactly the events of commits before the batch's first commit
       (replayed under no_grad, as the bipartite stream does), and the batch's own positives store no messages.
  hist : DyGLib's NegativeEdgeSampler 'historical' (past edges not in the batch, random fill) gives the negative edges.
-> /t3/u6twin/<kind>/<repo>/<mode>/e<epoch>.json"""
import json, os, sys, time
sys.path.insert(0, '/code'); sys.path.insert(0, '/dyglib')
import numpy as np
import torch
import core
from utils.utils import NegativeEdgeSampler

EVALS = [2, 5, 10, 20, 40, 70, 100]


class Twin(core.Runner):
    mode = 'asis'

    def batch_loss(self, idx, rng, pool):
        st = self.ctx.st
        if self.mode.startswith('asis') or (self.bip and not self.pair_mem):
            return super().batch_loss(idx, rng, pool)
        src, dst = st.u_src[idx], st.u_dst[idx]
        fl = rng.random(len(idx)) < 0.5
        src, dst = np.where(fl, dst, src), np.where(fl, src, dst)
        t = st.u_t[idx]
        if self.mode == 'hist':
            ep, bi = getattr(self, '_ep_bi', (0, 0))
            if getattr(self, '_ns_ep', None) != ep:
                self.ns = NegativeEdgeSampler(st.u_src[:self.n_tr], st.u_dst[:self.n_tr], st.u_t[:self.n_tr], negative_sample_strategy='historical',
                                              seed=self.seed * 1000 + ep)
                self._ns_ep = ep
            nsrc, ndst = self.ns.sample(size=len(idx), batch_src_node_ids=src, batch_dst_node_ids=dst,
                                        current_batch_start_time=t[0], current_batch_end_time=t[-1])
            self.n_hist = getattr(self, 'n_hist', 0) + len(idx)
        else:     # mem: uniform negatives as U6
            neg = pool[rng.integers(len(pool), size=len(idx))]; nsrc, ndst = src, neg
        if self.kind == 'tgn':
            ns, nd = self.bb.compute_src_dst_node_temporal_embeddings(src_node_ids=nsrc, dst_node_ids=ndst, node_interact_times=t,
                                                                      edge_ids=None, edges_are_positive=False, num_neighbors=self.nbr)
            pos_store = self.mode != 'mem'
            ps, pd_ = self.bb.compute_src_dst_node_temporal_embeddings(src_node_ids=src, dst_node_ids=dst, node_interact_times=t,
                                                                       edge_ids=(idx + 1).astype(np.int64) if pos_store else None,
                                                                       edges_are_positive=pos_store, num_neighbors=self.nbr)
        else:
            ps, pd_ = self.bb.compute_src_dst_node_temporal_embeddings(src, dst, t)
            ns, nd = self.bb.compute_src_dst_node_temporal_embeddings(nsrc, ndst, t)
        pos = self.lp(input_1=ps, input_2=pd_).squeeze(-1)
        ng = self.lp(input_1=ns, input_2=nd).squeeze(-1)
        pred = torch.cat([pos, ng]); lab = torch.cat([torch.ones_like(pos), torch.zeros_like(ng)])
        return self.lossf(pred, lab)


def main():
    kind, repo, nbr, lr, mode = sys.argv[1], sys.argv[2], int(sys.argv[3]), float(sys.argv[4]), sys.argv[5]
    maxep = int(sys.argv[6]) if len(sys.argv) > 6 else 100
    evals = [e for e in EVALS if e <= maxep]
    torch.set_num_threads(4)
    sdir = os.path.join('/t3/u6twin', kind, repo, mode); rdir = os.path.join('/t3/u6twin/runs', kind, repo, mode)
    ctx = core.Ctx(repo, sname='pair'); ks = ctx.ks('tune')
    r = Twin(ctx, kind, nbr, lr, device='cpu', seed=0); r.mode = mode; r.pair_mem = False
    if mode == 'mem':
        assert kind == 'tgn'
        ctx.st.u_commit = ctx.st.commit      # pair stream: the unit's commit = its event's commit (in this process only)
        r.bip = True; r.pair_mem = True      # core.Runner.train then replays the memory to the batch's commit start, as for bip
    t00 = time.time()

    def eval_fn(run, ep):
        t0 = time.time()
        sc = run.score_blocks(ks); pc = core.per_commit(ctx, ks, sc)
        p = float(np.mean([v[0] for v in pc.values()])); rc = float(np.mean([v[1] for v in pc.values()]))
        core.atomic_json(os.path.join(sdir, 'e%d.json' % ep), dict(repo=repo, kind=kind, mode=mode, nbr=nbr, lr=lr, epoch=ep, p10=p, r10=rc,
                         n_commits=len(pc), per_commit={str(c): list(map(float, v)) for c, v in pc.items()}, n_train_events=int(run.n_tr),
                         secs_total=time.time() - t00))
        core.log('EVAL %s/%s/%s epoch %d: P@10 %.4f (%.0fs, total %.0fs)' % (kind, repo, mode, ep, p, time.time() - t0, time.time() - t00))

    r.train(ks[0], maxep, rdir, eval_epochs=evals, eval_fn=eval_fn, ckpt_secs=10 ** 9, keep_epochs=(), epoch_secs=10 ** 9)
    ck = os.path.join(rdir, 'ckpt.pt')
    if os.path.exists(ck):
        os.remove(ck)
    core.log('done', kind, repo, mode, '%.0fs' % (time.time() - t00), 'historical-negative rows', getattr(r, 'n_hist', 0))


if __name__ == '__main__':
    main()
