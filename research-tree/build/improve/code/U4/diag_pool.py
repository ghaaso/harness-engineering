"""One check of the zulip training pool (features.pool_mask): the same LambdaMART (own, all features, query-normalised,
15 leaves, lr 0.05) trained on the last 15 zulip training blocks, once on the pooled rows and once on complete lists;
tuning P@10 of each. Answers whether the sampled lists cap zulip. usage: diag_pool.py -> /out/rank/diag-pool.json"""
import json, os
import numpy as np
import pandas as pd
import d4lib as L
import features as FE
import rank as RK

r = L.Repo('zulip'); ks = r.block_ids('train')[-15:]
res = {}
for mode in ('pool', 'full'):
    parts = []
    for k in ks:
        D = FE.load_block('zulip', k)
        if D is None:
            continue
        M = FE.pool_mask(D, k) if mode == 'pool' else None
        parts.append(FE.block_frame('zulip', k, 'train', D, M))
    df = pd.concat(parts, ignore_index=True)
    df.insert(0, 'repo', 'zulip')
    df['qid'] = (L.REPOS.index('zulip') * 10000 + df['k'].astype(np.int64)) * 100000 + df['task'].astype(np.int64)
    RK._CACHE[('zulip', 'train', ())] = df
    cfg = dict(train='own', feats='all', cols=RK.GROUPS['all'], qnorm=True, leaves=15, lr=0.05, span='all', repo='zulip')
    out, _ = RK.fit(cfg, ['zulip'])
    res[mode] = dict(rows=len(df), p10=out['zulip']['p10'], r10=out['zulip']['r10'], trees=out['zulip']['trees'])
    print(mode, res[mode], flush=True)
json.dump(dict(blocks=ks, res=res), open(os.path.join('/out', 'rank', 'diag-pool.json'), 'w'), indent=1)
