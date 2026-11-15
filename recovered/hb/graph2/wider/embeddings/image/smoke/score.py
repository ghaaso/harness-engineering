# usage: score.py <indir> ; a separate process and container from training.
import json, os, resource, sys, time
import torch
torch.set_num_threads(6)
from pykeen.triples import TriplesFactory
d = sys.argv[1]
r = json.load(open(os.path.join(d, "result.json")))
t0 = time.perf_counter()
model = torch.load(os.path.join(d, "model.pt"), weights_only=False)
tf = TriplesFactory.from_path_binary(os.path.join(d, "tf"))
load_s = time.perf_counter() - t0
model.eval()
g = torch.Generator().manual_seed(5)
idx = torch.randperm(tf.num_triples, generator=g)[:100]
batch = tf.mapped_triples[idx]
t0 = time.perf_counter()
with torch.no_grad():
    s = model.score_hrt(batch).squeeze(-1)
    hr = batch[:1, :2]
    all_t = model.score_t(hr_batch=hr).squeeze(0)  # 1-vs-all tail ranking
    true_t = int(batch[0, 2])
    rank = int((all_t > all_t[true_t]).sum().item()) + 1
    ref = model.score_hrt(tf.mapped_triples[torch.tensor(r["ref_idx"])]).squeeze(-1).tolist()
score_s = time.perf_counter() - t0
maxdiff = max(abs(a - b) for a, b in zip(ref, r["ref_scores"]))
out = dict(model=r["model"], loaded=True, n_scored=int(s.numel()), finite=bool(torch.isfinite(s).all()),
           score_min=float(s.min()), score_max=float(s.max()), one_vs_all_entities=int(all_t.numel()),
           one_vs_all_finite=bool(torch.isfinite(all_t).all()), true_tail_rank=rank,
           reload_max_abs_diff_vs_training_process=maxdiff, load_seconds=round(load_s, 3),
           score_seconds=round(score_s, 3),
           peak_rss_mb=round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024.0, 1),
           threads=torch.get_num_threads())
print(json.dumps(out))
