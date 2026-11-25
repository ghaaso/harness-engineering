"""resume test (card job, tiny): 2 epochs x 24 examples, bs 8 = 6 steps. A: straight through. B: killed after 4 steps, resumed. Final states must match."""
import os, sys, torch
import u2lib as U, trainlib as T
tag = sys.argv[1]
ch, pairs = U.read_pairs('fixflow')
ex = T.make_examples(pairs[:24], ch, 3)
ck = f'/out/ckpt/resume_test_{tag}.ckpt'
if os.path.exists(ck): os.remove(ck)
_, sa, ia = T.train(tag, ex, 2e-5, 2)
_, sa2, _ = T.train(tag, ex, 2e-5, 2)
print("two straight runs, max abs diff", max(float((sa[k].float() - sa2[k].float()).abs().max()) for k in sa), flush=True)
orig = torch.optim.AdamW.step
n = [0]
def boom(self, *a, **k):
    n[0] += 1
    if n[0] == 5: raise RuntimeError('simulated shutdown')
    return orig(self, *a, **k)
torch.optim.AdamW.step = boom
try:
    T.train(tag, ex, 2e-5, 2, ckpt=ck, every=0)
except RuntimeError as e:
    print('stopped:', e, 'ckpt exists', os.path.exists(ck), flush=True)
torch.optim.AdamW.step = orig
_, sb, ib = T.train(tag, ex, 2e-5, 2, ckpt=ck, every=0, log=print)
mx = max(float((sa[k].float() - sb[k].float()).abs().max()) for k in sa)
print('steps', ia['steps'], ib['steps'], 'max abs diff of final states', mx, flush=True)
os.remove(ck)
