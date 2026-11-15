"""Correctness checks before stage A (addendum 8 item 22 and the lane brief, step 3).
For one trained model per arm on the stage-A graph (config c01 of each grid, seed 1, short run, hold-out on):
  1. score() path (final representations + kge.score_with) vs PyKEEN predict_target on 20 queries
     (h, co_changed, ?): identical tail order and max |score difference|;
  2. direction: rank of the true tail of TRAINING co_changed triples under "higher = better" vs reversed;
  3. loss falls: first vs last epoch loss.
E5: the routed system's eval runs, and specialists' predict_target agreement is checked the same way.
Also a functional test of kge.score() with fold-in on a later tune parent (counts only; no metric).
Writes train/checks.json."""
import os, sys, json, time
import torch, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kge
from pykeen.predict import predict_target

OUT = os.environ.get('KGE_CHECK_OUT') or os.path.join(kge.HERE, 'checks.json')  # override: device re-checks
EPOCHS = dict(E1=30, E2=30, E3=30, E4=60, E5=20)
res = json.load(open(OUT)) if os.path.exists(OUT) else {}


def compare(model, kind, tf, G, n=20):
    labels, fn = kge.model_score_fn(model, kind, tf, kge.CO)
    heads = sorted({h for h, r, t in G.train if r == kge.CO})[:n]
    mine = fn(heads)
    same_order = 0; maxdiff = 0.0; top10_same = 0
    for qi, h in enumerate(heads):
        p = predict_target(model=model, head=h, relation=kge.CO, triples_factory=tf).df
        ps = torch.full((len(labels),), float('nan'))
        ps[torch.tensor(p['tail_id'].values)] = torch.tensor(p['score'].values, dtype=torch.float32)
        m = mine[qi]
        maxdiff = max(maxdiff, float((ps - m).abs().max()))
        o_pk = list(p.sort_values(['score', 'tail_id'], ascending=[False, True])['tail_id'].values)
        o_me = sorted(range(len(labels)), key=lambda i: (-float(m[i]), i))
        same_order += int(o_pk == o_me)
        top10_same += int(o_pk[:10] == o_me[:10])
    # direction on training co_changed triples
    tr = [(h, t) for h, r, t in G.train if r == kge.CO][:200]
    idx = {e: i for i, e in enumerate(labels)}
    S = fn(sorted({h for h, _ in tr})); hs = sorted({h for h, _ in tr})
    r_hi = []; r_lo = []
    for h, t in tr:
        row = S[hs.index(h)]
        r_hi.append(int((row > row[idx[t]]).sum()) + 1); r_lo.append(int((row < row[idx[t]]).sum()) + 1)
    return dict(queries=len(heads), full_order_identical=same_order, top10_identical=top10_same,
                max_abs_score_diff=maxdiff, train_true_tail_median_rank_higher_better=float(np.median(r_hi)),
                train_true_tail_median_rank_lower_better=float(np.median(r_lo)), entities=len(labels))


for arm in sys.argv[1:] or kge.ARMS:
    if arm in res: continue
    cid, cfg = kge.grid(arm)[0]
    t0 = time.time()
    model, info, G = kge.train(arm, cfg, 1, kge.STAGEA_SHA, holdout=True, max_epochs=EPOCHS[arm], es=False)
    r = dict(cfg_id=cid, cfg=cfg, epochs=info['epochs'], loss_first=info['losses'][0], loss_last=info['losses'][-1],
             loss_falls=info['losses'][-1] < info['losses'][0], s_per_epoch=float(np.mean(info['epoch_s'])),
             peak_rss_mb=info['peak_rss_mb'])
    if arm == 'E5':
        sp = {}
        for A, tr in model.items():
            E, R = kge.final_reps(tr.model)
            if kge.CO in tr.tf.relation_to_id:
                sp[A] = (None, E, R[tr.tf.relation_to_id[kge.CO]], tr.kind, tr.tf.entity_to_id)
        r['routed_val_mrr_after_short_run'] = kge.eval_routed(G, sp)
        for A, tr in model.items():
            GA = kge.Graph.__new__(kge.Graph); GA.train = kge.area_triples(G.train, G.ents, A)
            if not any(x[1] == kge.CO for x in GA.train): continue
            r['specialist_' + A] = compare(tr.model, tr.kind, tr.tf, GA, n=5)
    else:
        tf = kge.build_tf(G.train, G.full_ent, pykeen_inverse=(arm == 'E4'))
        # the model object holds its own factory mapping; rebuild identical mapping for predict_target
        r.update(compare(model, info['kind'], tf, G))
        r['val_mrr_after_short_run'] = kge.eval_queries(G, *kge.model_score_fn(model, info['kind'], tf, kge.CO))
    r['wall_s'] = time.time() - t0
    res[arm] = r
    json.dump(res, open(OUT, 'w'), indent=1)
    print(arm, json.dumps(r)[:900], flush=True)
