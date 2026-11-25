"""R-U4 check (5) and cache staleness: recompute, with U4's code as it is on disk now, the base features, EASE (the
frozen choice) and the content cosine of blocks, and compare with the caches the tables were built from; then compare
each table's rows with the cache cells. usage: python recompute.py <repo> [all|sample] -> /rout/recompute-<repo>.json"""
import json, os, sys, gzip
import numpy as np
import pandas as pd
import d4lib as L
import u4lib as U
import ease as EA
import features as FE

repo = sys.argv[1]; mode = sys.argv[2] if len(sys.argv) > 2 else 'all'
r = L.Repo(repo)
ks = r.block_ids()
if mode == 'sample':
    tr, tu, te = r.block_ids('train'), r.block_ids('tune'), r.block_ids('test')
    ks = sorted(set([tr[0], tr[len(tr) // 2], tr[-1], tu[0], tu[len(tu) // 2], tu[-1], te[0], te[len(te) // 2], te[-1]]))
ch = json.load(open('/out/ease/choice.json'))[repo]['best']
hl, inv, lam = EA.parse(ch)
res = {}
for k in ks:
    b = r.block(k); out = {'split': b.split}
    if not len(b.tasks):
        res[k] = 'empty'; continue
    z = np.load('/out/cache/%s/%d.npz' % (repo, k))
    F = U.base_features(b)
    diff = [c for c in U.BASE if not (z[c].shape == F[c].shape and np.array_equal(z[c], F[c], equal_nan=True))]
    out['base_diff'] = diff
    out['label_in_cache'] = 'label' in z.files
    if 'label' in z.files:
        out['label_ok'] = bool(np.array_equal(z['label'], U.labels(b)))
    out['seeds_ok'] = bool(np.array_equal(z['seeds'], b.seeds)); out['tie_ok'] = bool(np.array_equal(z['tie'], b.rnd))
    e = EA.ease_scores(b, hl, inv, [lam])[lam]; ec = np.load('/out/cache/%s/%d.ease.npy' % (repo, k))
    out['ease_equal'] = bool(np.array_equal(e, ec)); out['ease_maxabs'] = float(np.max(np.abs(e - ec)))
    cc = np.load('/out/cache/%s/%d.content.npy' % (repo, k)); c2 = U.content_cos(b)
    out['content_equal'] = bool(np.array_equal(cc, c2, equal_nan=True))
    out['content_nan_share'] = float(np.isnan(cc).mean())
    # table rows against the cache
    fp = '/out/tables/%s/%s/%d.csv.gz' % (repo, b.split, k)
    df = pd.read_csv(fp)
    D = FE.load_block(repo, k)
    tdiff = []
    for c in U.FEATURES:
        v = df[c].values.astype(np.float32); w = D[c][df['task'].values, df['cand'].values].astype(np.float32)
        if not np.array_equal(v, w, equal_nan=True):
            tdiff.append(c)
    out['table_vs_cache_diff'] = tdiff
    if b.split == 'train':
        M = FE.pool_mask(D, k); ti, ci = np.nonzero(M)
        out['train_rows_match_pool'] = bool(len(ti) == len(df) and np.array_equal(ti, df['task'].values) and np.array_equal(ci, df['cand'].values))
    else:
        out['rows'] = len(df); out['rows_full'] = int(len(b.tasks) * (b.N - 1))
        out['label_all_nan'] = bool(df['label'].isna().all())
    res[k] = out
    print(k, json.dumps(out), flush=True)
json.dump({str(k): v for k, v in res.items()}, open('/rout/recompute-%s.json' % repo, 'w'), indent=1)
bad = {k: v for k, v in res.items() if v != 'empty' and (v['base_diff'] or not v['ease_equal'] or not v['content_equal'] or v['table_vs_cache_diff']
       or not v['seeds_ok'] or not v['tie_ok'] or v.get('label_ok') is False or v.get('train_rows_match_pool') is False)}
print('blocks', len(res), 'with a difference', len(bad), sorted(bad))
