"""Diagnostic (CPU): how a saved model's tuning scores depend on the seed. usage: diag_tgn.py <kind> <repo> <cfg dir name> <epoch> [stream]"""
import sys, os
sys.path.insert(0, '/code')
import numpy as np, torch, core
kind, repo, cfg, ep = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]); st = sys.argv[5] if len(sys.argv) > 5 else 'pair'
torch.set_num_threads(4)
ctx = core.Ctx(repo, sname=st); ks = ctx.ks('tune')
nbr = int(cfg.split('_')[0][1:]); lr = float(cfg.split('_lr')[1])
r = core.Runner(ctx, kind, nbr, lr, device='cpu', seed=0)
r.load_state(torch.load(os.path.join(core.OUT, 'runs', core.vname(st, kind), repo, cfg, 'state_e%d.pt' % ep), map_location='cpu', weights_only=False))
sc = r.score_blocks(ks)
import pandas as pd
for k in ks[:2]:
    df = ctx.table(k).copy(); df['s'] = sc[k]
    cm = df.groupby('cand')['s'].transform('mean')
    sm = df.groupby(['task', 'seed'])['s'].transform('mean')
    print(k, 'score std %.3f, corr(score, cand mean) %.3f, corr(score, seed mean) %.3f' % (df.s.std(), np.corrcoef(df.s, cm)[0, 1], np.corrcoef(df.s, sm)[0, 1]))
    pos = df[df.label == 1]; print(' positives mean score %.3f vs all %.3f; rows %d positives %d' % (pos.s.mean(), df.s.mean(), len(df), len(pos)))
