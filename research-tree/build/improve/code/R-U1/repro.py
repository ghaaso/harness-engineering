"""R-U1: the claimed tuning numbers against what U1's code produces from its stored inputs.
  score : the card's score.py over /out/cardfmt (BM25 by the card's bm25.mjs, every U1 arm on tuning)
  fusion: A3 cross-validation and in-sample fit recomputed from sig_tune.npz, compared with /out/tune/a3.json
  ltr   : A2 sweep re-run on a copy of the table (writes only under /w/ltr_out), compared with /out/tune/a2.json;
          U1's saved model on the tuning table compared with /out/cardfmt/<repo>/rank_a2.jsonl;
          and a five-fold estimate inside tuning (selection and early stopping on four folds, scored on the fifth)
usage: python repro.py score|fusion|ltr|ltrcv"""
import json, os, shutil, subprocess, sys
sys.path.insert(0, '/code')
import numpy as np
import u1lib as L


def score():
    arms = 'bm25,bm25py,bm25f,chunk,a7,a8,qwen3,swerank,a3,a2'
    subprocess.run(['python', '-B', 'score.py', '/out/cardfmt', '/w/score-tuning.json', '--arms', arms], cwd='/d2', check=True,
                   capture_output=True)
    o = json.load(open('/w/score-tuning.json'))
    ref = json.load(open('/out/tune/score-tuning.json'))
    for a, v in o['arms'].items():
        same = v == ref['arms'][a]
        print(a, 'macro Acc@10', round(v['macro_acc10'][0], 3), 'P@2', round(v['macro_p2'][0], 3),
              {r: round(x['acc10'], 3) for r, x in v['per_repo'].items()}, 'equal to U1 file' if same else 'DIFFERS from U1 file')
    print('n', o['n_queries'])


def fusion():
    import fusion as F
    M = {}
    for repo in L.REPOS:
        sp, qs = L.load_split(repo)
        z = np.load(f'/out/{repo}/sig_tune.npz')
        sig = {k: z[k] for k in F.ARMS}
        paths = list(z['paths'])
        truth = {q['qid']: set(q['truth']) for q in qs if q['block'] == 'tune'}
        qids = [str(q) for q in z['qids']]
        M[repo] = np.stack([F.config_metrics(sig, qi, L.tiekeys(q, paths), np.array([p in truth[q] for p in paths])) for qi, q in enumerate(qids)])
    cv = F.cross_validate(M)
    ref = json.load(open('/out/tune/a3.json'))
    for f in F.FAMILIES:
        print(f, 'cv macro Acc@10', round(cv[f]['macro_acc10'], 4), 'U1', round(ref['cv'][f]['macro_acc10'], 4))
    fam = sorted(F.FAMILIES, key=lambda f: (-cv[f]['macro_acc10'], -cv[f]['macro_p2'], F.FAMILIES.index(f)))[0]
    ch = F.fit(M, {r: np.arange(len(M[r])) for r in M}, fam)
    ins = np.mean([M[r][:, ch[r], 0].mean() for r in M])
    print('family', fam, 'U1', ref['family'], 'in-sample macro', round(ins, 4), 'U1', round(ref['tuning_macro_acc10'], 4),
          'frozen equal', {r: F.CONFIGS[ch[r]] == ref['frozen'][r] for r in M})
    # how flat is the per-repo surface: configs within one query of the best, per repository
    for r in M:
        acc = M[r][:, :, 0].mean(0)
        print(r, 'best in-sample', round(acc.max(), 3), 'configs within 1/n of it', int((acc >= acc.max() - 1 / len(M[r]) - 1e-12).sum()), 'of', len(acc))


def copy_inputs(dst):
    os.makedirs(f'{dst}/table', exist_ok=True)
    for s in ('train', 'tune', 'heldout'):
        shutil.copy(f'/out/table/{s}.csv.gz', f'{dst}/table/')
    for r in L.REPOS:
        os.makedirs(f'{dst}/{r}', exist_ok=True)
        for f in ('split.json', 'queries.jsonl', 'sig_tune.npz'):
            shutil.copy(f'/out/{r}/{f}', f'{dst}/{r}/')


def ltr_check():
    dst = '/w/ltr_out'
    copy_inputs(dst)
    L.OUT = dst
    import ltr
    out = ltr.sweep('a2r', ltr.A2_COLUMNS, log=lambda s: None)
    ref = json.load(open('/out/tune/a2.json'))
    print('re-run: scope', out['frozen']['scope'], out['frozen']['params']['num_leaves'], out['frozen']['params']['learning_rate'],
          'trees', out['frozen']['trees'], 'macro Acc@10', round(out['tuning']['macro_acc10'], 4), 'P@2', round(out['tuning']['macro_p2'], 4))
    print('U1    : scope', ref['frozen']['scope'], ref['frozen']['params']['num_leaves'], ref['frozen']['params']['learning_rate'],
          'trees', ref['frozen']['trees'], 'macro Acc@10', round(ref['tuning']['macro_acc10'], 4), 'P@2', round(ref['tuning']['macro_p2'], 4))
    g1 = [(g['scope'], g['params']['num_leaves'], g['params']['learning_rate'], round(g['macro_acc10'], 4)) for g in out['grid']]
    g0 = [(g['scope'], g['params']['num_leaves'], g['params']['learning_rate'], round(g['macro_acc10'], 4)) for g in ref['grid']]
    print('grid equal', g1 == g0)
    # U1's saved model (the file heldout.py will use) on the tuning table vs the tuning ranking U1 scored
    L.OUT = '/out'
    import lightgbm as lgb
    df = ltr.load_table('tune')
    ltr.derive(df, ref['frozen']['columns'])
    m = lgb.Booster(model_file='/out/models/a2/pooled.txt')
    pred = m.predict(df[ref['frozen']['features']])
    print('saved model trees', m.num_trees())
    worst = 0.0
    for repo in L.REPOS:
        rk = {r['qid']: dict((p, s) for p, s in r['scores']) for r in L.rdjsonl(f'/out/cardfmt/{repo}/rank_a2.jsonl')}
        sub = df[df.repo == repo]
        for (q, p), v in zip(zip(sub.qid, sub.path), pred[sub.index]):
            worst = max(worst, abs(rk[q][p] - v))
    print('saved model vs scored tuning ranking: max abs diff', worst)


def ltrcv():
    """five contiguous time folds of the tuning queries per repository; for each fold: every grid point trained on the
    training rows, early-stopped and selected on the other four folds, scored on this fold."""
    import lightgbm as lgb
    import ltr
    tr, tu = ltr.load_table('train'), ltr.load_table('tune')
    feats = ltr.derive(tr, ltr.A2_COLUMNS); ltr.derive(tu, ltr.A2_COLUMNS)
    uni = ltr.Universe('tune')
    ct = {}
    for r in L.REPOS:
        sp, qs = L.load_split(r)
        ct.update({q['qid']: q['ct'] for q in qs if q['split'] == 'tune'})
    fold = {}
    for r in L.REPOS:
        qq = sorted(tu.qid[tu.repo == r].unique(), key=lambda q: ct[q])
        edges = np.linspace(0, len(qq), 6).round().astype(int)
        for f in range(5):
            for q in qq[edges[f]:edges[f + 1]]:
                fold[q] = f
    tu['fold'] = tu.qid.map(fold)
    oof = np.zeros(len(tu))
    for f in range(5):
        va, te = tu[tu.fold != f], tu[tu.fold == f]
        best = None
        for params in ltr.GRID:          # pooled scope (U1's frozen choice); per-repo omitted here
            m, it, nd = ltr.train_one(lgb, tr[feats], tr.label.astype(int), ltr.groups(tr), va[feats], va.label.astype(int), ltr.groups(va), params)
            p = m.predict(va[feats], num_iteration=it)
            _, acc, p2 = uni.score(va, p)
            if best is None or (acc, p2, nd) > best[0]:
                best = ((acc, p2, nd), m, it, params)
        oof[tu.index.get_indexer(te.index)] = best[1].predict(te[feats], num_iteration=best[2])
        print('fold', f, 'chosen', best[3], 'trees', best[2], 'inner acc', round(best[0][0], 3), flush=True)
    pr, acc, p2 = uni.score(tu, oof)
    print('A2 five-fold inside tuning: macro Acc@10', round(acc, 4), 'P@2', round(p2, 4), {r: round(v['acc10'], 3) for r, v in pr.items()})


if __name__ == '__main__':
    dict(score=score, fusion=fusion, ltr=ltr_check, ltrcv=ltrcv)[sys.argv[1]]()
