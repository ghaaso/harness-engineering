# usage: train.py <rotate|complex|compgcn> <triples.tsv> <outdir>
import json, os, resource, sys, time
t_import0 = time.perf_counter()
import torch
torch.set_num_threads(6)
from pykeen.triples import TriplesFactory
from pykeen.models import RotatE, ComplEx, CompGCN
from pykeen.losses import NSSALoss, CrossEntropyLoss
from pykeen.training import SLCWATrainingLoop, LCWATrainingLoop
from pykeen.training.callbacks import TrainingCallback
import pykeen
name, tsv, out = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(out, exist_ok=True)
t_import = time.perf_counter() - t_import0
torch.manual_seed(7)


def rss_mb():
    return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024.0


class Timer(TrainingCallback):
    def __init__(self):
        super().__init__()
        self.t0 = time.perf_counter()
        self.rows = []

    def post_epoch(self, epoch, epoch_loss, **kw):
        t = time.perf_counter()
        self.rows.append({"epoch": epoch, "seconds": round(t - self.t0, 3), "loss": float(epoch_loss),
                          "peak_rss_mb_so_far": round(rss_mb(), 1)})
        self.t0 = t


tf = TriplesFactory.from_path(tsv, create_inverse_triples=(name == "compgcn"))
DIM = 256
if name == "rotate":
    model = RotatE(triples_factory=tf, embedding_dim=DIM, loss=NSSALoss,
                   loss_kwargs=dict(margin=9.0, adversarial_temperature=1.0))
    mk = lambda opt: SLCWATrainingLoop(model=model, triples_factory=tf, optimizer=opt, negative_sampler="basic",
                                       negative_sampler_kwargs=dict(num_negs_per_pos=32))
    epochs, bs, lr, mode = 5, 512, 1e-3, "sLCWA NSSALoss, 32 negatives/positive"
elif name == "complex":
    model = ComplEx(triples_factory=tf, embedding_dim=DIM, loss=CrossEntropyLoss, regularizer="lp",
                    regularizer_kwargs=dict(p=3.0, weight=1e-3, normalize=True))
    mk = lambda opt: LCWATrainingLoop(model=model, triples_factory=tf, optimizer=opt)
    epochs, bs, lr, mode = 5, 256, 1e-3, "LCWA CrossEntropyLoss, LpRegularizer p=3 weight 1e-3"
elif name == "compgcn":
    model = CompGCN(triples_factory=tf, embedding_dim=DIM, loss=CrossEntropyLoss)
    mk = lambda opt: LCWATrainingLoop(model=model, triples_factory=tf, optimizer=opt)
    epochs, bs, lr, mode = 2, 256, 1e-3, "LCWA CrossEntropyLoss, CompGCN default encoder"
else:
    raise SystemExit("unknown model")
opt = torch.optim.Adam(params=model.get_grad_params(), lr=lr)
loop = mk(opt)
cb = Timer()
t0 = time.perf_counter()
cb.t0 = t0
losses = loop.train(triples_factory=tf, num_epochs=epochs, batch_size=bs, use_tqdm=False, use_tqdm_batch=False,
                    callbacks=[cb], pin_memory=False)
total = time.perf_counter() - t0
model.eval()
g = torch.Generator().manual_seed(11)
idx = torch.randperm(tf.num_triples, generator=g)[:5]
with torch.no_grad():
    ref = model.score_hrt(tf.mapped_triples[idx]).squeeze(-1).tolist()
torch.save(model, os.path.join(out, "model.pt"))
tf.to_path_binary(os.path.join(out, "tf"))
res = dict(model=name, mode=mode, dim=DIM, epochs=epochs, batch_size=bs, lr=lr, entities=tf.num_entities,
           relations=tf.num_relations, triples=tf.num_triples, params=sum(p.numel() for p in model.parameters()),
           torch_threads=torch.get_num_threads(), interop_threads=torch.get_num_interop_threads(),
           pykeen=pykeen.get_version(), torch=torch.__version__, import_seconds=round(t_import, 2),
           train_total_seconds=round(total, 2), per_epoch=cb.rows, peak_rss_mb=round(rss_mb(), 1),
           ref_idx=idx.tolist(), ref_scores=ref, model_bytes=os.path.getsize(os.path.join(out, "model.pt")))
json.dump(res, open(os.path.join(out, "result.json"), "w"), indent=1)
print(json.dumps({k: v for k, v in res.items() if k not in ("ref_idx", "ref_scores")}))
