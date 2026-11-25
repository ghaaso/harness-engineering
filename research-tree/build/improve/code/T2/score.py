"""T2 probe scoring on TUNING only (units/T2/SCORING.md). Arms: BEST (card's best untrained per repository), DIFF (DIFF_BM25
alone), FUSED (RRF of BEST and DIFF, one weight per repository chosen on tuning), B2 and B2D (frozen U4 B2 settings refit without
and with DIFF_BM25, scores from rank_t2.py frozen). Per repository and pooled; strata by seed kind and by truth file.
usage: score.py  -> /out/score.json and a summary on stdout"""
import json, os
import numpy as np
import pandas as pd
import d4lib as L
import rank_t2 as RK

CH = json.load(open('/cardout/choices.json'))['best_untrained']
WGRID = [0.05, 0.1, 0.2, 0.3, 0.5, 0.7, 1, 1.5, 2]
KINDS = {'none': (0, 0), 'little': (1, 5), 'much': (6, 10 ** 9)}


def order_rank(df, score):
    """0-based rank of each row inside its query, by (-score, tie) as d4lib.per_commit."""
    o = np.lexsort((df['tie'].values, -np.asarray(score, np.float64), df['qid'].values))
    q = df['qid'].values[o]
    start = np.r_[0, np.nonzero(q[1:] != q[:-1])[0] + 1]
    pos = np.arange(len(o)) - np.repeat(start, np.diff(np.r_[start, len(o)]))
    r = np.empty(len(o), np.int64); r[o] = pos
    return r


def per_query(df, score):
    top = order_rank(df, score) < L.K
    lab = df['label'].values.astype(bool); nov = lab & (df['PC'].values == 0); wit = lab & ~nov
    g = pd.DataFrame(dict(qid=df['qid'].values, commit=df['commit'].values, sn=df['SEED_NCHG'].values,
                          h=top & lab, n=lab, hn=top & nov, nn=nov, hw=top & wit, nw=wit)).groupby('qid', sort=False)
    a = g.agg(commit=('commit', 'first'), sn=('sn', 'first'), h=('h', 'sum'), n=('n', 'sum'), hn=('hn', 'sum'), nn=('nn', 'sum'),
              hw=('hw', 'sum'), nw=('nw', 'sum'))
    return a


def commit_means(a, repo):
    """dict name -> {(repo, commit): value} for every measure and stratum."""
    out = {}
    a = a.assign(p10=a['h'] / L.K, r10=a['h'] / a['n'])
    out['p10'] = a.groupby('commit')['p10'].mean(); out['r10'] = a.groupby('commit')['r10'].mean()
    for kname, (lo, hi) in KINDS.items():
        s = a[(a['sn'] >= lo) & (a['sn'] <= hi)]
        out['p10_seed_' + kname] = s.groupby('commit')['p10'].mean()
        out['r10_seed_' + kname] = s.groupby('commit')['r10'].mean()
    s = a[a['nn'] > 0]; out['r10_without'] = (s['hn'] / s['nn']).groupby(s['commit']).mean()
    s = a[a['nw'] > 0]; out['r10_with'] = (s['hw'] / s['nw']).groupby(s['commit']).mean()
    return {m: {(repo, int(c)): float(v) for c, v in ser.items()} for m, ser in out.items()}


def rrf(df, s_a, s_b, w):
    return 1.0 / (L.RRF_K + 1 + order_rank(df, s_a)) + w / (L.RRF_K + 1 + order_rank(df, s_b))


def compare(x, y):
    common = sorted(set(x) & set(y))
    m, lo, hi = L.bootstrap([x[c] - y[c] for c in common])
    return dict(a=float(np.mean([x[c] for c in common])), b=float(np.mean([y[c] for c in common])), diff=m, lo=lo, hi=hi, n=len(common))


def main():
    res = {}       # arm -> measure -> {(repo, commit): v}
    fused_w, cov = {}, {}
    for r in L.REPOS:
        df = RK.table(r, 'tune', ['DIFF_BM25=/out/diff'])
        arms = {'BEST': df[CH[r]].values, 'DIFF': df['DIFF_BM25'].values}
        best_w, best_p = None, -1
        for w in WGRID:
            p = np.mean(list(commit_means(per_query(df, rrf(df, arms['BEST'], arms['DIFF'], w)), r)['p10'].values()))
            if p > best_p:
                best_w, best_p = w, p
        fused_w[r] = best_w
        arms['FUSED'] = rrf(df, arms['BEST'], arms['DIFF'], best_w)
        for tag, name in (('B2', 'B2'), ('B2D', 'B2D')):
            f = os.path.join('/out/rank', tag, r + '.npy')
            if os.path.exists(f):
                s = np.load(f); assert len(s) == len(df); arms[name] = s
        a0 = per_query(df, arms['BEST'])
        cov[r] = dict(queries=len(a0), seeds_none=int((a0['sn'] == 0).sum()), seeds_little=int(((a0['sn'] >= 1) & (a0['sn'] <= 5)).sum()),
                      seeds_much=int((a0['sn'] >= 6).sum()), truth=int(a0['n'].sum()), truth_without=int(a0['nn'].sum()),
                      diff_zero_queries=int((df.groupby('qid')['DIFF_BM25'].max() <= 0).sum()))
        for name, s in arms.items():
            for m, v in commit_means(per_query(df, s), r).items():
                res.setdefault(name, {}).setdefault(m, {}).update(v)
    pairs = [('B2D', 'B2'), ('FUSED', 'BEST'), ('DIFF', 'BEST'), ('B2', 'BEST'), ('B2D', 'BEST')]
    measures = list(res['BEST'].keys())
    out = dict(fused_w=fused_w, coverage=cov, comparisons={})
    for x, y in pairs:
        if x not in res or y not in res:
            continue
        for m in measures:
            for scope in L.REPOS + ['pooled']:
                fx = {c: v for c, v in res[x][m].items() if scope == 'pooled' or c[0] == scope}
                fy = {c: v for c, v in res[y][m].items() if scope == 'pooled' or c[0] == scope}
                out['comparisons']['%s-%s|%s|%s' % (x, y, m, scope)] = compare(fx, fy)
    json.dump(out, open('/out/score.json', 'w'), indent=1)
    print('fused w', fused_w); print('coverage', json.dumps(cov))
    for k, v in out['comparisons'].items():
        if v['n']:
            print('%-40s %.4f vs %.4f  %+.4f [%+.4f, %+.4f] n=%d' % (k, v['a'], v['b'], v['diff'], v['lo'], v['hi'], v['n']))


if __name__ == '__main__':
    main()
