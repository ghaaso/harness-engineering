"""Item 22 reference points: PPR's and CO's filtered MRR on the stage-A held-out co_changed pairs, ranked
exactly as kge.eval_queries ranks an embedding (same queries, same filtering, same candidate sets).
  PPR: rooted PageRank on the pilot graph at the stage-A checkpoint (evalcore.PilotGraph). The pilot graph
       never contains co_changed edges, so "minus the held-out pairs" removes nothing from it.
  CO : co-change confidence (pilot 'conf') from the remaining pairs: the held-out pairs are removed, so a
       held-out true tail is never scored by CO (by construction its floor).
File/doc entities are scored (PPR 0.0 when absent from the pilot graph, as evalcore); other entities are
unscored (ranked after the scored ones, expected position). Writes train/stageA/refs.json."""
import os, sys, json
import torch, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'eval'))
import kge, evalcore as ec

G = kge.Graph(kge.STAGEA_SHA, holdout=True)
P = ec.PilotGraph(kge.STAGEA_SHA)
labels = G.full_ent
held_paths = {tuple(sorted((G.ents[a][1], G.ents[b][1]))) for a, b in G.held}


def fn_for(which):
    def fn(heads):
        S = torch.full((len(heads), len(labels)), float('nan'))
        for qi, h in enumerate(heads):
            sp = G.ents[h][1]
            if which == 'PPR':
                pr = P.ppr(sp)
            for j, e in enumerate(labels):
                kind, path = G.ents[e][0], G.ents[e][1]
                if kind not in G.co_kinds: continue
                if which == 'PPR':
                    k = 'F:' + path
                    S[qi, j] = float(pr[P.idx[k]]) if (len(pr) and k in P.idx) else 0.0
                else:
                    v = P.co.get('F:' + sp, {}).get('F:' + path)
                    if v and v['conf'] > 0 and tuple(sorted((sp, path))) not in held_paths:
                        S[qi, j] = v['conf']
        return S
    return fn


out = dict(sha=kge.STAGEA_SHA, co_pairs=len({kge.pair_key(h, t) for h, r, t in G.tri if r == kge.CO}),
           held_pairs=len(G.held), queries=len(G.queries), entities=len(labels), co_kinds=G.co_kinds)
for w in ('PPR', 'CO'):
    out[w] = dict(mrr_all_entities=kge.eval_queries(G, labels, fn_for(w)),
                  mrr_file_doc=kge.eval_queries(G, labels, fn_for(w), file_only=True))
os.makedirs(os.path.join(kge.HERE, 'stageA'), exist_ok=True)
json.dump(out, open(os.path.join(kge.HERE, 'stageA', 'refs.json'), 'w'), indent=1)
print(json.dumps(out))
