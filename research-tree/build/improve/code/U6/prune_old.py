import os, sys, glob, json
sys.path.insert(0, '/code')
import sweep
for sd in glob.glob('/out/sweep/*/*/*'):
    rd = sd.replace('/out/sweep/', '/out/runs/')
    last = max([int(os.path.basename(f)[1:-5]) for f in glob.glob(sd + '/e*.json')] or [0])
    # only configurations that ran to their last planned epoch: the checkpoint's epoch says so
    ck = rd + '/ckpt.pt'
    if os.path.exists(ck) and last >= 100:
        sweep.prune(rd, sd)
