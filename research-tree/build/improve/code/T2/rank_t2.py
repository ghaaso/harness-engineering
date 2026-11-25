"""T2 copy of U4 rank.py (unchanged fit; changes: output under /out (CR/improve/T2), num_threads 4, DIFF_BM25 in QN_RATIO,
and the command `frozen`). B2: LambdaMART (LightGBM lambdarank) trained on the training blocks only, swept and early-stopped on tuning P@10 only.
Reads the CSV tables written by features.py. One query = one (block, seed) task; label = truth file.
usage:
  rank.py sweep [--cols C1,C2,...] [--extra NAME=DIR ...] [--tag B2]
      staged sweep per repository; writes /out/rank/<tag>/sweep.jsonl (every model) and choice.json (frozen, per repository)
  rank.py refit --cols C1,... [--extra NAME=DIR ...] [--train pooled|own] [--span all|half] [--leaves 15] [--lr 0.05]
                [--qnorm 0|1] [--tag T]
      one fit with a given column set (U7 uses it for B1); writes /out/rank/<tag>/refit.json
  rank.py heldout [--tag B2]   (only after the refuter) held-out ranking files /out/heldout/<tag>/<repo>/<k>.npy
--extra NAME=DIR merges a score matrix DIR/<repo>/<k>.npy ([tasks, files], as the card's .npy files) into column NAME.
Column sets: all = u4lib.FEATURES; also any table column (B4_GNN, B5_DYGFORMER, B5_TGN once filled)."""
import argparse, glob, json, os, sys, time
import numpy as np
import pandas as pd
import d4lib as L
import u4lib as U

TREES_STEP, TREES_MAX, PATIENCE = 10, 1000, 300
QN_RATIO = ['PC', 'INV365', 'DEC90', 'TEXT', 'PPR', 'EASE', 'DIFF_BM25']   # value / query max (the pool holds every query max)
QN_GAP = ['CONTENT_COS']                                      # value - query max
GROUPS = {
    'all': list(U.FEATURES),
    'no_content': [c for c in U.FEATURES if c != 'CONTENT_COS'],
    'no_ease': [c for c in U.FEATURES if c != 'EASE'],
    'hist_struct': [c for c in U.FEATURES if c not in ('CONTENT_COS', 'EASE')],
}
_CACHE = {}


def table(repo, split, extra=()):
    key = (repo, split, tuple(extra))
    if key in _CACHE:
        return _CACHE[key]
    fs = sorted(glob.glob(os.path.join(U.U4, 'tables', repo, split, '*.csv.gz')), key=lambda p: int(os.path.basename(p).split('.')[0]))
    df = pd.concat([pd.read_csv(f) for f in fs], ignore_index=True)
    for spec in extra:
        name, d = spec.split('=', 1)
        col = np.full(len(df), np.nan, dtype=np.float32)
        for k, g in df.groupby('k').groups.items():
            M = np.load(os.path.join(d, repo, '%d.npy' % k))
            idx = np.asarray(g)
            col[idx] = M[df['task'].values[idx], df['cand'].values[idx]]
        df[name] = col
    df.insert(0, 'repo', repo)
    df['qid'] = (L.REPOS.index(repo) * 10000 + df['k'].astype(np.int64)) * 100000 + df['task'].astype(np.int64)
    if split == 'train':
        assert set(df['k'].unique()) <= set(train_blocks(repo)), 'a non-training block in the training table'
    _CACHE[key] = df
    return df


def train_blocks(repo):
    plan = json.load(open(os.path.join(L.DATA, repo, 'plan.json')))
    return [b['k'] for b in plan['blocks'] if b['split'] == 'train']


def matrix(df, cols, qnorm):
    X = [df[c].values.astype(np.float32) for c in cols]
    names = list(cols)
    if qnorm:
        for c in cols:
            if c in QN_RATIO or c in QN_GAP:
                mx = df.groupby('qid')[c].transform('max').values.astype(np.float64)
                v = df[c].values.astype(np.float64)
                if c in QN_RATIO:
                    r = np.where(mx > 0, v / np.where(mx > 0, mx, 1), 0.0)
                else:
                    r = v - mx
                X.append(r.astype(np.float32)); names.append(c + '_Q')
    return np.column_stack(X), names


def tune_p10(df, score):
    pc = U.per_commit_table(df['commit'].values, df['qid'].values, score, df['tie'].values, df['label'].values)
    return float(np.mean([v[0] for v in pc.values()])), float(np.mean([v[1] for v in pc.values()])), pc


def span_filter(df, span):
    if span == 'all':
        return df
    ks = sorted(df['k'].unique())
    return df[df['k'].isin(ks[len(ks) // 2:])]


def fit(cfg, repos_eval, extra=(), log=None):
    """Train on the training tables of cfg['train'] (pooled = all three repositories, own = repos_eval[0]); evaluate
    tuning P@10 of every repository in repos_eval every TREES_STEP (10) trees; per repository keep the best tree count; stop when no
    repository improved for PATIENCE trees or at TREES_MAX. Returns {repo: (p10, r10, trees)} and the booster."""
    import lightgbm as lgb
    cols = cfg['cols']
    src = L.REPOS if cfg['train'] == 'pooled' else [repos_eval[0]]
    tr = pd.concat([span_filter(table(r, 'train', extra), cfg['span']) for r in src], ignore_index=True)
    Xtr, names = matrix(tr, cols, cfg['qnorm'])
    grp = tr.groupby('qid', sort=False).size().values
    assert len(grp) == tr['qid'].nunique() and (np.diff(tr['qid'].values) != 0).sum() + 1 == len(grp), 'queries not contiguous'
    params = dict(objective='lambdarank', metric='None', learning_rate=cfg['lr'], num_leaves=cfg['leaves'], min_data_in_leaf=50,
                  feature_fraction=0.8, bagging_fraction=0.8, bagging_freq=1, lambdarank_truncation_level=30, num_threads=4,
                  seed=7, deterministic=True, force_row_wise=True, verbose=-1)
    ds = lgb.Dataset(Xtr, label=tr['label'].values, group=grp, feature_name=names, free_raw_data=False)
    ev = {r: table(r, 'tune', extra) for r in repos_eval}
    Xev = {r: matrix(ev[r], cols, cfg['qnorm'])[0] for r in repos_eval}
    acc = {r: np.zeros(len(ev[r])) for r in repos_eval}
    best = {r: (-1.0, 0.0, 0) for r in repos_eval}
    t0 = time.time()

    def cb(env):   # every TREES_STEP trees: tuning P@10 per repository; stop when none improved for PATIENCE trees
        n = env.iteration + 1
        if n % TREES_STEP:
            return
        for r in repos_eval:
            acc[r] += env.model.predict(Xev[r], start_iteration=n - TREES_STEP, num_iteration=TREES_STEP)
            p, rc, _ = tune_p10(ev[r], acc[r])
            if p > best[r][0]:
                best[r] = (p, rc, n)
        if all(n - best[r][2] >= PATIENCE for r in repos_eval):
            raise lgb.callback.EarlyStopException(n - 1, [])
    bst = lgb.train(params, ds, num_boost_round=TREES_MAX, callbacks=[cb])
    # the frozen tree count's tuning score, from a fresh prediction (the form used for held-out)
    out = {}
    for r in repos_eval:
        s = bst.predict(Xev[r], num_iteration=best[r][2])
        p, rc, pc = tune_p10(ev[r], s)
        out[r] = dict(p10=p, r10=rc, trees=best[r][2], commits=len(pc), per_commit={str(t): [float(v[0]), float(v[1])] for t, v in pc.items()})
    if log:
        slim = {r: {k: v for k, v in o.items() if k != 'per_commit'} for r, o in out.items()}
        log.write(json.dumps(dict(cfg={k: v for k, v in cfg.items() if k != 'cols'}, cols=cols, res=slim, secs=round(time.time() - t0),
                                  rows=len(tr), queries=len(grp))) + '\n'); log.flush()
    return out, bst


def cfgs_stage1(cols_all):
    for train in ('pooled', 'own'):
        for g, cols in cols_all.items():
            for q in (False, True):
                yield dict(train=train, feats=g, cols=cols, qnorm=q, leaves=15, lr=0.05, span='all')


def sweep(a):
    tag = a.tag; d = os.path.join(U.U4, 'rank', tag); os.makedirs(d, exist_ok=True)
    groups = {'custom': a.cols.split(',')} if a.cols else GROUPS
    log = open(os.path.join(d, 'sweep.jsonl'), 'a')
    results = {r: [] for r in L.REPOS}

    def run(cfg):
        repos_eval = L.REPOS if cfg['train'] == 'pooled' else [cfg['repo']]
        out, _ = fit(cfg, repos_eval, a.extra, log)
        for r, v in out.items():
            results[r].append((v['p10'], dict({k: x for k, x in cfg.items() if k not in ('cols', 'repo')}, trees=v['trees']), v, cfg['cols']))
        print(cfg['train'], cfg.get('repo', ''), cfg['feats'], 'q' if cfg['qnorm'] else '-', cfg['leaves'], cfg['lr'], cfg['span'],
              {r: round(v['p10'], 4) for r, v in out.items()}, flush=True)

    # stage 1: training source x feature group x query normalisation, at leaves 15, lr 0.05, all training blocks
    for cfg in cfgs_stage1(groups):
        if cfg['train'] == 'pooled':
            run(cfg)
        else:
            for r in L.REPOS:
                run(dict(cfg, repo=r))
    # stage 2: per repository, its stage-1 best (source, features, normalisation) with leaves x learning rate x span
    s1 = {r: max(results[r], key=lambda x: x[0]) for r in L.REPOS}
    done = set()
    for r in L.REPOS:
        b = s1[r][1]
        for leaves in (7, 15, 31):
            for lr in (0.03, 0.1):
                for span in ('all', 'half'):
                    cfg = dict(train=b['train'], feats=b['feats'], cols=s1[r][3], qnorm=b['qnorm'], leaves=leaves, lr=lr, span=span)
                    key = (cfg['train'], r if cfg['train'] == 'own' else '', cfg['feats'], cfg['qnorm'], leaves, lr, span)
                    if key in done:
                        continue
                    done.add(key)
                    run(dict(cfg, repo=r) if cfg['train'] == 'own' else cfg)
    choice = {}
    for r in L.REPOS:
        p, c, v, cols = max(results[r], key=lambda x: x[0])
        choice[r] = dict(cfg=c, cols=cols, tune=v, n_models=len(results[r]))
    json.dump(choice, open(os.path.join(d, 'choice.json'), 'w'), indent=1)
    print(json.dumps({r: (choice[r]['cfg'], round(choice[r]['tune']['p10'], 4)) for r in L.REPOS}, indent=1))


def refit(a):
    d = os.path.join(U.U4, 'rank', a.tag); os.makedirs(d, exist_ok=True)
    cfg = dict(train=a.train, feats='custom', cols=a.cols.split(','), qnorm=bool(a.qnorm), leaves=a.leaves, lr=a.lr, span=a.span)
    res = {}
    if a.train == 'pooled':
        out, bst = fit(cfg, L.REPOS, a.extra); res.update(out)
        bst.save_model(os.path.join(d, 'pooled.txt'))
    else:
        for r in L.REPOS:
            out, bst = fit(dict(cfg, repo=r), [r], a.extra); res.update(out)
            bst.save_model(os.path.join(d, 'own-%s.txt' % r))
    json.dump(dict(cfg={k: v for k, v in cfg.items()}, tune=res), open(os.path.join(d, 'refit.json'), 'w'), indent=1)
    print(json.dumps(res, indent=1))


def heldout(a):
    """Refit each repository's frozen choice (same data, same seed: deterministic) and write held-out score matrices.
    Not scored here: held-out tables carry no labels."""
    ch = json.load(open(os.path.join(U.U4, 'rank', a.tag, 'choice.json')))
    for r in L.REPOS:
        c = ch[r]['cfg']
        cfg = dict(c, cols=ch[r]['cols'])
        out, bst = fit(dict(cfg, repo=r), L.REPOS if c['train'] == 'pooled' else [r], a.extra)
        assert abs(out[r]['p10'] - ch[r]['tune']['p10']) < 1e-12 and out[r]['trees'] == c['trees'], 'refit differs from the frozen choice'
        te = table(r, 'test', a.extra)
        assert te['label'].isna().all()
        s = bst.predict(matrix(te, cfg['cols'], cfg['qnorm'])[0], num_iteration=c['trees'])
        d = os.path.join(U.U4, 'heldout', a.tag, r); os.makedirs(d, exist_ok=True)
        rep = L.Repo(r)
        for k, g in te.groupby('k').groups.items():
            idx = np.asarray(g); b = rep.block(k)
            M = np.full((len(b.tasks), b.N), -np.inf, dtype=np.float32)
            M[te['task'].values[idx], te['cand'].values[idx]] = s[idx]
            np.save(os.path.join(d, '%d.npy' % k), M)
        print(r, 'held-out ranking files written:', te['k'].nunique(), flush=True)


T2OUT = '/out'


def frozen(a):
    """Each repository's frozen U4 B2 choice refit (same data, same seed), with --add columns appended; tuning scores saved
    per repository in tuning-table row order: /out/rank/<tag>/<repo>.npy, results in /out/rank/<tag>/res.json."""
    ch = json.load(open(os.path.join(U.U4, 'rank', 'B2', 'choice.json')))
    d = os.path.join(T2OUT, 'rank', a.tag); os.makedirs(d, exist_ok=True)
    add = [c for c in a.add.split(',') if c]
    res, done = {}, {}
    for r in L.REPOS:
        c = ch[r]['cfg']
        cfg = dict({k: v for k, v in c.items() if k != 'trees'}, cols=ch[r]['cols'] + add)
        key = json.dumps({k: v for k, v in cfg.items()}, sort_keys=True)
        if key not in done:
            done[key] = fit(cfg, L.REPOS, a.extra)
        out, bst = done[key]
        ev = table(r, 'tune', a.extra)
        s = bst.predict(matrix(ev, cfg['cols'], cfg['qnorm'])[0], num_iteration=out[r]['trees'])
        np.save(os.path.join(d, r + '.npy'), s.astype(np.float64))
        res[r] = dict(cfg={k: v for k, v in cfg.items() if k != 'cols'}, cols=cfg['cols'], u4_choice_p10=ch[r]['tune']['p10'],
                      u4_choice_trees=c['trees'], **out[r])
        print(r, 'p10 %.4f trees %d (U4 choice %.4f, %d trees)' % (out[r]['p10'], out[r]['trees'], ch[r]['tune']['p10'], c['trees']), flush=True)
    json.dump(res, open(os.path.join(d, 'res.json'), 'w'), indent=1)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd'); ap.add_argument('--cols', default=''); ap.add_argument('--extra', action='append', default=[])
    ap.add_argument('--tag', default='B2'); ap.add_argument('--train', default='pooled'); ap.add_argument('--span', default='all')
    ap.add_argument('--leaves', type=int, default=15); ap.add_argument('--lr', type=float, default=0.05); ap.add_argument('--qnorm', type=int, default=0); ap.add_argument('--add', default='')
    a = ap.parse_args()
    assert a.cmd == 'frozen', 'T2 runs only frozen (tuning); no sweep, refit or held-out writes here'
    frozen(a)
