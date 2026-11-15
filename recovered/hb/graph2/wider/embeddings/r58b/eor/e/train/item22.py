"""item22.py: addendum 8 item 22 as ruling 61 words it, for every arm, before an arm is called weak. Numbers only.

1. Stage-A MRR of the arm's three selected configurations (stageA/top3.json; filtered MRR of (h, co_changed, ?) on
   the stage-A held-out pairs, over all entities and over file/doc entities, at the selection epoch) beside PPR's and
   CO's on the same held-out triples (stageA/refs.json).
2. Loss ratio: mean training loss over the last tenth of the epochs divided by the mean over the tenth before it
   (tenth = max(1, floor(epochs / 10)); None when the curve is shorter than two tenths). A reported number, not a
   pass mark (ruling 36 stops at the validation peak). Stage A: for each selected configuration, over the curve as
   run (it ran past the peak by the patience) and over the epochs up to the selection epoch. Stage B: over every
   finished unit's curve (stageB/parts/<arm>/<cid>/s<seed>/<C>/meta.json `losses`), as n, median, min and max.
3. check.py's comparison (compare(), copied from check.py:22-48 unchanged in substance) of the score path (final
   representations + kge.score_with) with PyKEEN's own predict_target on 20 (h, co_changed, ?) queries, for ONE
   selected configuration per arm (the arm's stage-A best, top3[0]), on the stage-A graph with its hold-out:
   E1, E2, E3: a PyKEEN model built by kge.make_model on kge.build_tf(G.train, G.full_ent) receives the KEPT
     representations of stageA/<arm>/<cid>/reps.pt (entities, and the co_changed row of the relations); the
     injection is accepted only if kge.final_reps(model) then returns exactly the kept tensors.
   E5: the same per specialist (5 queries each, as check.py), on that specialist's area triples.
   E4: CompGCN's final representations are encoder outputs, which cannot be written back into the model, so the
     kept file cannot drive predict_target: a fresh model of the same configuration, seed 1, is trained on the
     stage-A graph for --e4-epochs epochs (default: the stage-A selection epoch) and compared (reading recorded).
   Also reported: the reciprocal relation (explicit '<kind>__inv' relations, or PyKEEN's inverse triples for E4).
usage: python item22.py [--out PATH] [--parts DIR] [--arms E1,E2,...] [--e4-epochs N] [--no-check]
  default --out train/report/item22.json, --parts train/stageB/parts (read only).
"""
import os, sys, json, time
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import numpy as np

SA = os.path.join(HERE, 'stageA')


def loss_ratio(losses):
    n = len(losses or []); k = max(1, n // 10)
    if n < 2 * k or n < 2: return None
    before = float(np.mean(losses[-2 * k:-k])); last = float(np.mean(losses[-k:]))
    return last / before if before else None


def stage_a_section(arms):
    top = json.load(open(os.path.join(SA, 'top3.json'))); refs = json.load(open(os.path.join(SA, 'refs.json')))
    out = dict(held_out=dict(sha=refs['sha'], co_pairs=refs['co_pairs'], held_pairs=refs['held_pairs'], queries=refs['queries']),
               PPR=refs['PPR'], CO=refs['CO'], arms={})
    for a in arms:
        rows = []
        for c in top[a]['top3']:
            m = json.load(open(os.path.join(SA, a, c['config_id'], 'meta.json')))
            L = m['losses']; be = int(m['best_epoch'])
            rows.append(dict(config_id=c['config_id'], cfg=c['cfg'], mrr_all_entities=m['val_mrr'], mrr_file_doc=m.get('val_file_at_best'),
                             epochs_run=m['epochs'], selection_epoch=be,
                             loss_ratio_as_run=loss_ratio(L), loss_ratio_to_selection_epoch=loss_ratio(L[:be]),
                             minus_PPR_all=m['val_mrr'] - refs['PPR']['mrr_all_entities'], minus_CO_all=m['val_mrr'] - refs['CO']['mrr_all_entities']))
        out['arms'][a] = rows
    return out


def stage_b_section(arms, parts):
    top = json.load(open(os.path.join(SA, 'top3.json')))
    out = {}
    for a in arms:
        out[a] = {}
        for c in top[a]['top3']:
            cid = c['config_id']; d = os.path.join(parts, a, cid); r = []
            if os.path.isdir(d):
                for s in sorted(os.listdir(d)):
                    for C in sorted(os.listdir(os.path.join(d, s))):
                        mp = os.path.join(d, s, C, 'meta.json')
                        if C.endswith('.part') or C.endswith('.model') or not os.path.exists(mp): continue
                        m = json.load(open(mp))
                        if m.get('trained') is False or not m.get('losses'): continue
                        x = loss_ratio(m['losses'])
                        if x is not None: r.append(x)
            out[a][cid] = dict(units=len(r), median=float(np.median(r)) if r else None, min=float(min(r)) if r else None,
                               max=float(max(r)) if r else None, share_below_1=float(np.mean([x < 1 for x in r])) if r else None)
    return out


# ------------------------------------------------------------------ check.py's comparison
def compare(model, kind, tf, G, n=20):
    """check.py:22-48 (same queries, same measures)."""
    import torch, kge
    from pykeen.predict import predict_target
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


def _set_rep(rep, X):
    """Write X into a PyKEEN embedding so that rep(indices=None) returns exactly X; True on success."""
    import torch
    W = rep._embeddings.weight
    X = X.detach().cpu()
    cands = [torch.view_as_real(X).reshape(X.shape[0], -1), torch.cat([X.real, X.imag], -1)] if torch.is_complex(X) else [X.reshape(X.shape[0], -1)]
    with torch.no_grad():
        for c in cands:
            if tuple(c.shape) != tuple(W.shape): continue
            W.copy_(c.to(W.dtype).to(W.device))
            out = rep(indices=None).detach().cpu()
            if out.shape == X.shape and torch.equal(out, X): return True
    return False


def inject(model, tf, E, rco):
    """Kept entity representations and the co_changed relation row into model; verified through kge.final_reps."""
    import torch, kge
    model.eval()
    ok_e = _set_rep(model.entity_representations[0], E)
    ri = kge.rel_index(model, tf, kge.CO)
    with torch.no_grad():
        R = model.relation_representations[0](indices=None).detach().cpu().clone()
    R[ri] = rco
    ok_r = _set_rep(model.relation_representations[0], R)
    E2, R2 = kge.final_reps(model)
    return bool(ok_e and ok_r and torch.equal(E2, E.cpu()) and torch.equal(R2[ri], rco.cpu()))


def check_section(arms, e4_epochs=None):
    import torch, kge
    top = json.load(open(os.path.join(SA, 'top3.json')))
    out = {}
    G = kge.Graph(kge.STAGEA_SHA, holdout=True)
    for a in arms:
        c = top[a]['top3'][0]; cid, cfg = c['config_id'], c['cfg']
        t0 = time.time()
        rp = os.path.join(SA, a, cid, 'reps.pt')
        r = dict(config_id=cid, cfg=cfg, reps=os.path.relpath(rp, HERE).replace('\\', '/'))
        if a in ('E1', 'E2', 'E3'):
            reps = torch.load(rp, weights_only=False)
            tf = kge.build_tf(G.train, G.full_ent)
            labels = sorted(tf.entity_to_id, key=tf.entity_to_id.get)
            assert labels == list(reps['labels']), 'entity order differs from the kept file'
            model, kind = kge.make_model(a, cfg, tf)
            assert kind == reps['kind'], (kind, reps['kind'])
            r['injected_reps_equal_kept'] = inject(model, tf, reps['E'], reps['rco'])
            r['reciprocal'] = "explicit '<kind>__inv' relations (%d relations incl. inverses)" % tf.num_relations
            if r['injected_reps_equal_kept']: r.update(compare(model, kind, tf, G))
            r['source'] = 'kept stage-A representations'
        elif a == 'E5':
            reps = torch.load(rp, weights_only=False)
            r['specialists'] = {}
            for A, sd in sorted(reps['specialists'].items()):
                tri = kge.area_triples(G.train, G.ents, A)
                ents_A = sorted({h for h, _, _ in tri} | {t for _, _, t in tri})
                tf = kge.build_tf(tri, ents_A)
                assert sorted(tf.entity_to_id, key=tf.entity_to_id.get) == list(sd['labels']), ('specialist entity order', A)
                if sd['rco'] is None or kge.CO not in tf.relation_to_id:
                    r['specialists'][A] = dict(note='no co_changed relation in this area'); continue
                model, kind = kge.make_model('E5', cfg, tf)
                ok = inject(model, tf, sd['E'], sd['rco'])
                d = dict(injected_reps_equal_kept=ok)
                GA = kge.Graph.__new__(kge.Graph); GA.train = tri
                if ok: d.update(compare(model, kind, tf, GA, n=5))
                r['specialists'][A] = d
            r['injected_reps_equal_kept'] = all(v.get('injected_reps_equal_kept', True) for v in r['specialists'].values())
            r['reciprocal'] = "explicit '<kind>__inv' relations per specialist"
            r['source'] = 'kept stage-A representations, per specialist (5 queries each, as check.py)'
        else:  # E4
            meta = json.load(open(os.path.join(SA, a, cid, 'meta.json')))
            ep = int(e4_epochs or meta['best_epoch'])
            model, info, G4 = kge.train('E4', cfg, 1, kge.STAGEA_SHA, holdout=True, max_epochs=ep, es=False)
            tf = kge.build_tf(G4.train, G4.full_ent, pykeen_inverse=True)
            r.update(compare(model, info['kind'], tf, G4))
            r.update(epochs_trained=info['epochs'], threads=kge.THREADS, device=kge.DEVICE.type,
                     reciprocal="PyKEEN's inverse triples (create_inverse_triples, CompGCN requires them)",
                     source='fresh model, seed 1, stage-A graph with its hold-out (reading: the kept CompGCN representations are '
                            'encoder outputs and cannot be written back into a model, so they cannot drive predict_target)')
        r['wall_s'] = round(time.time() - t0, 1)
        out[a] = r
        print('item22 check', a, json.dumps({k: v for k, v in r.items() if k not in ('cfg', 'specialists')})[:400], flush=True)
    return out


def main(argv):
    a = dict(out=os.path.join(HERE, 'report', 'item22.json'), parts=os.path.join(HERE, 'stageB', 'parts'), arms='E1,E2,E3,E4,E5')
    check = True; i = 0
    while i < len(argv):
        if argv[i] == '--no-check': check = False; i += 1; continue
        a[argv[i][2:]] = argv[i + 1]; i += 2
    arms = a['arms'].split(',')
    res = dict(item=22, ruling=61, note='numbers only; the loss ratio is not a pass mark (ruling 36 stops at the validation peak)',
               stage_a=stage_a_section(arms), stage_b_loss_ratio=stage_b_section(arms, a['parts']),
               parts=os.path.abspath(a['parts']))
    if check: res['check_predict_target'] = check_section(arms, a.get('e4-epochs'))
    os.makedirs(os.path.dirname(os.path.abspath(a['out'])), exist_ok=True)
    json.dump(res, open(a['out'] + '.part', 'w'), indent=1, default=str)
    os.replace(a['out'] + '.part', a['out'])
    for ar in arms:
        print('item22', ar, 'stageA', [(r['config_id'], round(r['mrr_all_entities'], 4), r['loss_ratio_as_run'] and round(r['loss_ratio_as_run'], 4))
                                       for r in res['stage_a']['arms'][ar]], 'stageB', {k: v['units'] for k, v in res['stage_b_loss_ratio'][ar].items()}, flush=True)
    print('item22 wrote', a['out'], flush=True)
    return res


if __name__ == '__main__':
    main(sys.argv[1:])
