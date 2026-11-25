"""One sweep job: train one configuration on the events before the tuning split and score the tuning tables at several epochs.
usage: sweep.py --stream pair|bip --repo R --kind dygformer|tgn --nbr 20|32 --lr 1e-4 --eval 5,10,20   (the last epoch is the run's length)
Results: /out/sweep/<[bip-]kind>/<repo>/n<nbr>_lr<lr>/e<epoch>.json (one file per finished evaluation, written at once);
states: /out/runs/<kind>/<repo>/n<nbr>_lr<lr>/{ckpt.pt, state_e<epoch>.pt}. A restart resumes and skips what is on disk."""
import argparse, json, os, sys, time
sys.path.insert(0, '/code')
import numpy as np
import torch
import core


def cfg_name(nbr, lr):
    return 'n%d_lr%g' % (nbr, lr)


def prune(rdir, sdir):
    """The sweep keeps ~1 GB per TGN configuration, too much for the shared disk: when a configuration has run to its last epoch,
    delete the resume checkpoint and keep the saved model states of its two best epochs (tuning P@10) only. A state that was pruned
    and is chosen later is retrained by final.py (same seed, same data) and its tuning score is checked against the sweep's."""
    import glob
    ev = {}
    for f in glob.glob(os.path.join(sdir, 'e*.json')):
        d = json.load(open(f)); ev[d['epoch']] = d['p10']
    if not ev or not os.path.exists(os.path.join(rdir, 'ckpt.pt')):
        return
    keep = set(sorted(ev, key=lambda e: (-ev[e], e))[:2])
    for f in glob.glob(os.path.join(rdir, 'state_e*.pt')):
        if int(os.path.basename(f)[7:-3]) not in keep:
            os.remove(f)
    os.remove(os.path.join(rdir, 'ckpt.pt'))
    core.log('pruned', rdir, 'kept epochs', sorted(keep))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--repo'); ap.add_argument('--kind'); ap.add_argument('--nbr', type=int); ap.add_argument('--lr', type=float)
    ap.add_argument('--eval'); ap.add_argument('--stream', default='pair'); ap.add_argument('--ckpt-secs', type=int, default=600); ap.add_argument('--epoch-secs', type=int, default=120)
    a = ap.parse_args()
    evals = sorted(int(x) for x in a.eval.split(','))
    name = os.path.join(core.vname(a.stream, a.kind), a.repo, cfg_name(a.nbr, a.lr))
    rdir = os.path.join(core.OUT, 'runs', name); sdir = os.path.join(core.OUT, 'sweep', name)
    todo = [e for e in evals if not os.path.exists(os.path.join(sdir, 'e%d.json' % e))]
    if not todo:
        core.log('all evaluations of', name, 'are on disk'); return
    ctx = core.Ctx(a.repo, sname=a.stream)
    ks = ctx.ks('tune')
    dev = 'cuda' if torch.cuda.is_available() else 'cpu'
    r = core.Runner(ctx, a.kind, a.nbr, a.lr, device=dev, seed=0)

    def eval_fn(run, ep):
        t0 = time.time()
        sc = run.score_blocks(ks)
        pc = core.per_commit(ctx, ks, sc)
        p = float(np.mean([v[0] for v in pc.values()])); rc = float(np.mean([v[1] for v in pc.values()]))
        core.atomic_json(os.path.join(sdir, 'e%d.json' % ep), dict(repo=a.repo, kind=a.kind, stream=a.stream, nbr=a.nbr, lr=a.lr, epoch=ep, p10=p, r10=rc,
                         n_commits=len(pc), per_commit={str(c): list(map(float, v)) for c, v in pc.items()}, n_train_events=int(run.n_tr),
                         score_secs=time.time() - t0))
        core.log('EVAL %s epoch %d: tuning P@10 %.4f R@10 %.4f over %d commits (%.0fs)' % (name, ep, p, rc, len(pc), time.time() - t0))

    r.train(ks[0], max(evals), rdir, eval_epochs=todo, eval_fn=eval_fn, ckpt_secs=a.ckpt_secs, keep_epochs=evals, epoch_secs=a.epoch_secs)
    core.log('done', name)
    prune(rdir, sdir)


if __name__ == '__main__':
    main()
