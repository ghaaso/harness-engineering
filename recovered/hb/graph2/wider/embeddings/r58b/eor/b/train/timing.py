"""Timing on the real graphs (lane brief step 4): the slowest stage-A config of each arm (largest dimension,
deepest encoder), a few epochs without early stopping, on the stage-A graph (hold-out on) and on the
largest TUNE parent (no hold-out). Writes train/timing.json {key: {s_per_epoch, epochs, rss, ...}}.
usage: python timing.py <arm> [<arm> ...]   (env KGE_E4_BATCH for E4's batch size)"""
import os, sys, json, time
import numpy as np, torch
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kge

LARGEST_TUNE = '7b3a745281898d3d5808c5a15c4916d1d9dbb1b4'
OUT = os.path.join(kge.HERE, 'timing.json')
N_EP = dict(E1=4, E2=10, E3=4, E4=3, E5=4)
SLOWEST = dict(E1=dict(embedding_dim=512, margin=6, lr=0.0005, adversarial_temperature=0.5),
               E2=dict(embedding_dim=512, n3_weight=0.1, lr=0.1),
               E3=dict(embedding_dim=512, margin=6, lr=0.0005, scoring_fct_norm=2),
               E4=dict(num_layers=2, embedding_dim=200, composition='mult', lr=0.001),
               E5=dict(embedding_dim=512, margin=6, lr=0.0005, adversarial_temperature=0.5))
fb = os.environ.get('KGE_E4_FALLBACK') == '1'
if fb: SLOWEST['E4'] = dict(num_layers=2, embedding_dim=200, num_bases=5, lr=0.001)
for arm in sys.argv[1:]:
    for tag, sha, ho in (('stageA', kge.STAGEA_SHA, True), ('largest_tune', LARGEST_TUNE, False)):
        bs = int(os.environ['KGE_E4_BATCH']) if arm == 'E4' and os.environ.get('KGE_E4_BATCH') else None
        key = '%s/%s%s' % (arm, tag, '' if bs is None else '/bs%d' % bs) + ('/rgcn' if (arm == 'E4' and fb) else '')
        res = json.load(open(OUT)) if os.path.exists(OUT) else {}
        if key in res: continue
        t0 = time.perf_counter()
        _, info, G = kge.train(arm, SLOWEST[arm], 1, sha, holdout=ho, max_epochs=N_EP[arm], es=False, batch_size=bs,
                               fallback=fb)
        r = dict(cfg=SLOWEST[arm], epochs=info['epochs'], epoch_s=info['epoch_s'],
                 s_per_epoch=float(np.median(info['epoch_s'])), peak_rss_mb=info['peak_rss_mb'],
                 train_triples=len(G.train), entities=len(G.full_ent), batch_size=info.get('batch_size'),
                 total_s=time.perf_counter() - t0, loss=info['losses'], specialist_triples=info.get('specialist_triples'))
        # cost of one early-stopping evaluation on the stage-A hold-out (same model kinds)
        res = json.load(open(OUT)) if os.path.exists(OUT) else {}
        res[key] = r
        json.dump(res, open(OUT, 'w'), indent=1)
        print(key, json.dumps({k: v for k, v in r.items() if k not in ('epoch_s', 'loss')}), flush=True)
