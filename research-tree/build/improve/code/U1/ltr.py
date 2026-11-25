"""A2 (and A1 later, by U7): LambdaMART (LightGBM lambdarank) trained on the training queries' rows of the feature table,
swept on the tuning split, early-stopped on the tuning split only (NDCG@10, patience 100, at least 100 trees, at most
1000). Selection: macro Acc@10 over the three repositories on tuning (ties: macro P@2, then tuning NDCG@10), scored with
the card's ranking rule (candidates by predicted score, every other file of the snapshot unlisted, shared tie key).

Columns: any set of the table's columns; every score column (name starting 's_' or 'co_') also gets two per-query
derived columns over the query's candidate rows: _rank (1 = highest) and _rel (score / the query's highest score).
'kind' is categorical. Pooled = one model over the three repositories; per repository = one model each, the same
hyperparameters for all three (so both scopes choose from grids of the same size).

usage, also the refit script for any column set (U7 for A1): python ltr.py --name a2 [--columns c1,c2,...] [--scopes pooled,per_repo]
writes /out/tune/<name>.json, /out/models/<name>/<scope>.txt and the tuning rankings /out/cardfmt/<repo>/rank_<name>.jsonl
"""
import argparse, json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import pandas as pd
import u1lib as L
from features import EMPTY, FILE_COLS, QF_COLS
from signals import SCORES

A2_COLUMNS = [c for c in SCORES if c != 's_a7'] + FILE_COLS + QF_COLS   # s_a7 is a copy of s_chunk or s_bm25f
GRID = [dict(num_leaves=nl, learning_rate=lr) for nl in (7, 15, 31) for lr in (0.02, 0.05, 0.1)]
FIXED = dict(objective='lambdarank', metric='ndcg', eval_at=[10], min_data_in_leaf=20, feature_fraction=0.8,
             bagging_fraction=0.8, bagging_freq=1, seed=1, deterministic=True, force_row_wise=True, num_threads=8, verbose=-1)
MAX_TREES, MIN_TREES, PATIENCE = 1000, 100, 100
CATEGORICAL = ['kind']


def is_score(c):
    return c.startswith('s_') or c.startswith('co_')


def load_table(split, columns=None):
    df = pd.read_csv(f'{L.OUT}/table/{split}.csv.gz', dtype={'qid': str, 'path': str})
    return df


def derive(df, columns):
    """add <c>_rank and <c>_rel per query for every score column; returns the model's feature list."""
    feats = list(columns)
    g = df.groupby('qid', sort=False)
    for c in columns:
        if not is_score(c):
            continue
        v = df[c].fillna(0.0)
        df[c + '_rank'] = v.groupby(df['qid'], sort=False).rank(ascending=False, method='min')
        mx = v.groupby(df['qid'], sort=False).transform('max')
        df[c + '_rel'] = np.where(mx > 0, v / mx.where(mx > 0, 1.0), 0.0)
        feats += [c + '_rank', c + '_rel']
    return feats


def groups(df):
    q = df['qid'].to_numpy()
    starts = np.flatnonzero(np.r_[True, q[1:] != q[:-1]])
    sizes = np.diff(np.r_[starts, len(q)])
    assert len(starts) == df['qid'].nunique(), 'rows of a query are not contiguous'
    return sizes


class Universe:
    """per tuning query: the snapshot's paths, tie keys and truth (the card's ranking rule over every file)."""

    def __init__(self, split='tune'):
        self.q = {}
        for repo in L.REPOS:
            sp, qs = L.load_split(repo)
            truth = {q['qid']: set(q['truth']) for q in qs if q['split'] == split}
            for b in sp['blocks']:
                if b['split'] != split:
                    continue
                z = np.load(f'{L.rdir(repo)}/sig_{b["id"]}.npz')
                paths = list(z['paths'])
                pos = {p: i for i, p in enumerate(paths)}
                for qid in z['qids']:
                    qid = str(qid)
                    self.q[qid] = (repo, paths, pos, L.tiekeys(qid, paths), np.array([p in truth[qid] for p in paths]))

    def score(self, df, pred):
        per = {}
        for qid, idx in df.groupby('qid', sort=False).indices.items():
            repo, paths, pos, tk, tm = self.q[qid]
            s = np.full(len(paths), np.nan)
            s[[pos[p] for p in df['path'].to_numpy()[idx]]] = pred[idx]
            per.setdefault(repo, []).append(L.qmetrics(s, tk, tm)[:2])
        pr = {r: dict(acc10=float(np.mean([x[0] for x in v])), p2=float(np.mean([x[1] for x in v])), n=len(v)) for r, v in per.items()}
        return pr, float(np.mean([v['acc10'] for v in pr.values()])), float(np.mean([v['p2'] for v in pr.values()]))


def train_one(lgb, Xtr, ytr, gtr, Xtu, ytu, gtu, params):
    dtr = lgb.Dataset(Xtr, ytr, group=gtr, categorical_feature=[c for c in CATEGORICAL if c in Xtr.columns], free_raw_data=False)
    dtu = lgb.Dataset(Xtu, ytu, group=gtu, reference=dtr)
    ev = {}
    m = lgb.train(dict(FIXED, **params), dtr, num_boost_round=MAX_TREES, valid_sets=[dtu], valid_names=['tune'],
                  keep_training_booster=True,   # keep the trees past the best one, so MIN_TREES can apply
                  callbacks=[lgb.early_stopping(PATIENCE, first_metric_only=True, verbose=False), lgb.record_evaluation(ev)])
    curve = ev['tune']['ndcg@10']
    best = max(MIN_TREES, int(np.argmax(curve)) + 1)
    best = min(best, m.num_trees())
    return m, best, float(curve[best - 1]) if best - 1 < len(curve) else float(curve[-1])


def sweep(name, columns, scopes=('pooled', 'per_repo'), log=print):
    import lightgbm as lgb
    tr, tu = load_table('train'), load_table('tune')
    for c in columns:
        if c not in tr.columns:
            raise KeyError(f'column {c} not in the table')
        if tr[c].isna().all() or tu[c].isna().all():
            raise ValueError(f'column {c} is empty on training or tuning rows: fill it before refitting')
    feats = derive(tr, columns)
    derive(tu, columns)
    uni = Universe('tune')
    results = []
    for scope in scopes:
        for params in GRID:
            t = time.time()
            pred = np.zeros(len(tu))
            iters, nd = {}, []
            parts = [('pooled', tr.index, tu.index)] if scope == 'pooled' else [
                (r, tr.index[tr.repo == r], tu.index[tu.repo == r]) for r in L.REPOS]
            models = {}
            for key, itr, itu in parts:
                a, b = tr.loc[itr], tu.loc[itu]
                m, best, ndcg = train_one(lgb, a[feats], a['label'].astype(int), groups(a), b[feats], b['label'].astype(int), groups(b), params)
                pred[tu.index.get_indexer(itu)] = m.predict(b[feats], num_iteration=best)
                iters[key] = best; nd.append(ndcg); models[key] = (m, best)
            pr, acc, p2 = uni.score(tu, pred)
            results.append(dict(scope=scope, params=params, trees=iters, tune_ndcg10=float(np.mean(nd)), per_repo=pr,
                                macro_acc10=acc, macro_p2=p2, _models=models, _pred=pred))
            log(f'{name} {scope} {params} trees {iters} acc10 {acc:.3f} p2 {p2:.3f} {time.time() - t:.0f} s')
    best = sorted(results, key=lambda r: (-r['macro_acc10'], -r['macro_p2'], -r['tune_ndcg10']))[0]
    md = f'{L.OUT}/models/{name}'
    os.makedirs(md, exist_ok=True)
    for key, (m, it) in best['_models'].items():
        m.save_model(f'{md}/{key}.txt', num_iteration=it)
    frozen = dict(columns=list(columns), features=feats, scope=best['scope'], params=dict(FIXED, **best['params']),
                  trees=best['trees'], models={k: f'models/{name}/{k}.txt' for k in best['_models']})
    write_rankings(name, tu, best['_pred'])
    out = dict(frozen=frozen, tuning=dict(per_repo=best['per_repo'], macro_acc10=best['macro_acc10'], macro_p2=best['macro_p2']),
               grid=[{k: v for k, v in r.items() if not k.startswith('_')} for r in results])
    L.wrjson(f'{L.OUT}/tune/{name}.json', out)
    return out


def write_rankings(name, df, pred, root=None, split='tune'):
    """one ranking file per repository in the card's format: {"qid", "scores": [[path, score], ...]}."""
    root = root or f'{L.OUT}/cardfmt'
    for repo in df['repo'].unique():
        sub = df.index[df.repo == repo]
        rows = []
        for qid, idx in df.loc[sub].groupby('qid', sort=False).indices.items():
            ii = sub[idx]
            rows.append(dict(qid=qid, scores=[[p, float(s)] for p, s in zip(df.loc[ii, 'path'], pred[df.index.get_indexer(ii)])]))
        L.wrjsonl(f'{root}/{repo}/rank_{name}.jsonl', rows)


def predict(name, split):
    """the frozen models of <name> on a table split: returns (df, scores)."""
    import lightgbm as lgb
    fz = L.rdjson(f'{L.OUT}/tune/{name}.json')['frozen']
    df = load_table(split)
    derive(df, fz['columns'])
    pred = np.zeros(len(df))
    for key, path in fz['models'].items():
        m = lgb.Booster(model_file=f'{L.OUT}/{path}')
        idx = df.index if key == 'pooled' else df.index[df.repo == key]
        pred[df.index.get_indexer(idx)] = m.predict(df.loc[idx, fz['features']])
    return df, pred


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--name', default='a2')
    ap.add_argument('--columns', default=','.join(A2_COLUMNS))
    ap.add_argument('--scopes', default='pooled,per_repo')
    a = ap.parse_args()
    out = sweep(a.name, a.columns.split(','), a.scopes.split(','), log=lambda s: print(s, flush=True))
    print(json.dumps(dict(frozen={k: v for k, v in out['frozen'].items() if k != 'features'}, tuning=out['tuning']), indent=1))


if __name__ == '__main__':
    main()
