"""T1: ceilings and kinds (SCORING.md sections 1-3), tuning tables only.
usage: strata.py   -> /t1/strata.json and markdown on stdout
Arms: BEST (the card's best untrained arm per repository), B2 (/t1/scores/B2/<repo>.rows.npy), and every score folder
/t1/scores/<name>/<repo>/<k>.npy ([tasks, files]); u5_<U5 run> are U5's own states, the rest T1's runs."""
import glob, json, os
import numpy as np
import pandas as pd
import d4lib as L
import u4lib as U

T1 = '/t1'
CH = json.load(open('/cardout/choices.json'))['best_untrained']
B2CH = json.load(open(os.path.join(U.U4, 'rank', 'B2', 'choice.json')))
K = L.K
SRC = {'history': lambda d: d['PC'] > 0, 'imports': lambda d: (d['IMP_SC'] > 0) | (d['IMP_CS'] > 0),
       'folder': lambda d: d['FOLDER_DIST'] == 0, 'name': lambda d: (d['SAME_STEM'] > 0) | (d['TEST_PAIR'] > 0),
       'text': lambda d: d['TEXT'] > 0, 'ppr': lambda d: d['PPR'] > 0}
KINDS = ['none', 'little', 'much']


def kind(n):
    return np.where(n == 0, 0, np.where(n <= 5, 1, 2))


def load(repo):
    fs = sorted(glob.glob(os.path.join(U.U4, 'tables', repo, 'tune', '*.csv.gz')), key=lambda p: int(os.path.basename(p).split('.')[0]))
    cols = ['k', 'commit', 'task', 'cand', 'tie', 'label', 'PC', 'IMP_SC', 'IMP_CS', 'FOLDER_DIST', 'SAME_STEM', 'TEST_PAIR', 'TEXT',
            'PPR', 'SEED_NCHG', CH[repo]]
    df = pd.concat([pd.read_csv(f, usecols=lambda c: c in cols) for f in fs], ignore_index=True)
    arms = {'BEST': df[CH[repo]].values.astype(np.float64)}
    fp = os.path.join(T1, 'scores', 'B2', repo + '.rows.npy')
    if os.path.exists(fp):
        arms['B2'] = np.load(fp)
    for d in sorted(glob.glob(os.path.join(T1, 'scores', '*', repo))):
        name = os.path.basename(os.path.dirname(d)); col = np.full(len(df), np.nan)
        ok = True
        for k, g in df.groupby('k').groups.items():
            f = os.path.join(d, '%d.npy' % k)
            if not os.path.exists(f):
                ok = False; break
            M = np.load(f); idx = np.asarray(g)
            col[idx] = M[df['task'].values[idx], df['cand'].values[idx]]
        if ok:
            assert np.isfinite(col).all(), name
            arms[name] = col
    df['qid'] = df['k'].astype(np.int64) * 100000 + df['task']
    return df, arms


def per_task(df):
    """task-level arrays: commit, seed kind, truth counts, reach per source."""
    q, inv = np.unique(df['qid'].values, return_inverse=True)
    y = df['label'].values > 0; w = y & (df['PC'].values > 0)
    T = dict(n=len(q), inv=inv)
    T['commit'] = np.zeros(len(q), dtype=np.int64); T['commit'][inv] = df['commit'].values
    T['kind'] = np.zeros(len(q), dtype=np.int64); T['kind'][inv] = kind(df['SEED_NCHG'].values)
    T['nt'] = np.bincount(inv, weights=y, minlength=len(q)); T['nw'] = np.bincount(inv, weights=w, minlength=len(q))
    allm = np.zeros(len(df), dtype=bool)
    for s, f in SRC.items():
        m = f(df).values; allm |= m
        T['reach_' + s] = np.bincount(inv, weights=y & m, minlength=len(q))
    T['reach_union'] = np.bincount(inv, weights=y & allm, minlength=len(q))
    T['reach_struct'] = np.bincount(inv, weights=y & ~(df['PC'].values > 0) & (SRC['imports'](df) | SRC['folder'](df) | SRC['name'](df) | SRC['ppr'](df)).values, minlength=len(q))
    return T


def top_hits(df, T, s):
    o = np.lexsort((df['tie'].values, -s, T['inv']))
    inv_o = T['inv'][o]
    start = np.r_[0, np.nonzero(inv_o[1:] != inv_o[:-1])[0] + 1]
    pos = np.arange(len(o)) - np.repeat(start, np.diff(np.r_[start, len(o)]))
    top = o[pos < K]
    y = df['label'].values > 0; wv = df['PC'].values > 0
    h = np.bincount(T['inv'][top], weights=y[top], minlength=T['n'])
    hw = np.bincount(T['inv'][top], weights=(y & wv)[top], minlength=T['n'])
    return h, hw


def commit_mean(T, v, mask=None):
    """{commit: mean over its tasks (in mask) of v}"""
    m = np.ones(T['n'], dtype=bool) if mask is None else mask
    out = {}
    for c in np.unique(T['commit'][m]):
        sel = m & (T['commit'] == c)
        out[int(c)] = float(v[sel].mean())
    return out


def arm_metrics(df, T, s):
    h, hw = top_hits(df, T, s)
    nt, nw = T['nt'], T['nw']; no = nt - nw
    M = {'P': commit_mean(T, h / K), 'R': commit_mean(T, h / nt), 'Pwith': commit_mean(T, hw / K), 'Pwithout': commit_mean(T, (h - hw) / K),
         'Rwith': commit_mean(T, np.where(nw > 0, hw / np.maximum(nw, 1), 0), nw > 0),
         'Rwithout': commit_mean(T, np.where(no > 0, (h - hw) / np.maximum(no, 1), 0), no > 0)}
    for i, kd in enumerate(KINDS):
        M['P_' + kd] = commit_mean(T, h / K, T['kind'] == i); M['R_' + kd] = commit_mean(T, h / nt, T['kind'] == i)
    return M


def ceilings(T):
    nt = T['nt']
    C = {'tasks': int(T['n']), 'P_ceiling': commit_mean(T, np.minimum(nt, K) / K), 'R_ceiling': commit_mean(T, np.minimum(nt, K) / nt),
         'share_with': float(T['nw'].sum() / nt.sum())}
    for s in list(SRC) + ['union', 'struct']:
        C['reach_' + s] = float(T['reach_' + s].sum() / nt.sum())            # share of truth files a source reaches at all
        C['P_ceiling_' + s] = commit_mean(T, np.minimum(T['reach_' + s], K) / K)
    for i, kd in enumerate(KINDS):
        m = T['kind'] == i
        C['kind_' + kd] = dict(tasks=int(m.sum()), truth=int(nt[m].sum()), share_with=float(T['nw'][m].sum() / max(nt[m].sum(), 1)),
                               reach_union=float(T['reach_union'][m].sum() / max(nt[m].sum(), 1)),
                               P_ceiling=float(np.mean(list(commit_mean(T, np.minimum(nt, K) / K, m).values()))) if m.any() else None)
    return C


def mean(d):
    return float(np.mean(list(d.values()))) if d else float('nan')


def diff(a, b):
    c = sorted(set(a) & set(b))
    m, lo, hi = L.bootstrap([a[x] - b[x] for x in c])
    return dict(d=m, lo=lo, hi=hi, n=len(c))


def avg(ms):
    """per-commit mean over seeds of each metric"""
    return {k: {c: float(np.mean([m[k][c] for m in ms])) for c in ms[0][k]} for k in ms[0]}


def main():
    res, ceil = {}, {}
    for r in L.REPOS:
        df, arms = load(r)
        T = per_task(df)
        ceil[r] = ceilings(T)
        res[r] = {a: arm_metrics(df, T, s) for a, s in arms.items()}
        # checks: the scorer equals the round's (u4lib.per_commit_table) and the recorded B2 / U5 numbers
        pc = U.per_commit_table(df['commit'].values, df['qid'].values, arms['BEST'], df['tie'].values, df['label'].values)
        assert max(abs(pc[c][0] - res[r]['BEST']['P'][c]) for c in pc) < 1e-12
        if 'B2' in arms:
            rec = B2CH[r]['tune']['per_commit']
            assert max(abs(rec[str(c)][0] - res[r]['B2']['P'][c]) for c in res[r]['B2']['P']) < 1e-9
        print(r, 'loaded', len(df), 'rows,', T['n'], 'tasks; arms', list(arms), flush=True)
    names = sorted(set.intersection(*[set(res[r]) for r in L.REPOS]))
    pool = {a: {k: {(r, c): v for r in L.REPOS for c, v in res[r][a][k].items()} for k in res[L.REPOS[0]][a]} for a in names}
    out = dict(ceilings={r: {k: (mean(v) if isinstance(v, dict) and k.startswith('P_') or k == 'R_ceiling' else v) for k, v in C.items()} for r, C in ceil.items()},
               arms={}, vs_best={}, ablation={})
    pc_ceil = {(r, c): v for r in L.REPOS for c, v in ceil[r]['P_ceiling'].items()}
    out['ceilings']['pooled'] = dict(P_ceiling=mean(pc_ceil))
    metrics = list(pool[names[0]])
    for a in names:
        out['arms'][a] = {k: {**{r: mean(res[r][a][k]) for r in L.REPOS}, 'pooled': mean(pool[a][k])} for k in metrics}
        if a != 'BEST':
            out['vs_best'][a] = {k: {**{r: diff(res[r][a][k], res[r]['BEST'][k]) for r in L.REPOS}, 'pooled': diff(pool[a][k], pool['BEST'][k])} for k in metrics}
    # the ablation: seed-averaged per-commit metrics against asis (U5's s0 and T1's asis_s1)
    seeds = {'asis': ['u5_sage_L1_H128_N20_hl90_qwen_s0', 'asis_s1']}
    for v in ('nograph', 'nocount', 'hard', 'mix'):
        seeds[v] = ['%s_s0' % v, '%s_s1' % v]
    have = {v: [n for n in ns if n in pool] for v, ns in seeds.items()}
    if len(have['asis']) == 2:
        A = avg([pool[n] for n in have['asis']])
        for v, ns in have.items():
            if not ns:
                continue
            V = avg([pool[n] for n in ns])
            out['ablation'][v] = dict(seeds=ns, P=mean(V['P']), Pwith=mean(V['Pwith']), Pwithout=mean(V['Pwithout']),
                                      per_repo={r: float(np.mean([out['arms'][n]['P'][r] for n in ns])) for r in L.REPOS},
                                      vs_asis={k: diff(V[k], A[k]) for k in ('P', 'Pwith', 'Pwithout', 'R')},
                                      seed_noise=(diff(pool[ns[1]]['P'], pool[ns[0]]['P']) if len(ns) == 2 else None))
    json.dump(out, open(os.path.join(T1, 'strata.json'), 'w'), indent=1)
    show(out)


def show(out):
    print('\n## ceilings (tuning)')
    for r, C in out['ceilings'].items():
        if r == 'pooled':
            print('pooled P@10 ceiling %.3f' % C['P_ceiling']); continue
        print(r, 'tasks', C['tasks'], 'P@10 ceiling %.3f R@10 ceiling %.3f share with %.3f' % (C['P_ceiling'], C['R_ceiling'], C['share_with']),
              'reach', {s: round(C['reach_' + s], 3) for s in list(SRC) + ['union', 'struct']},
              'P@10 ceiling per source', {s: round(C['P_ceiling_' + s], 3) for s in list(SRC) + ['union']})
        for kd in KINDS:
            print('   seed', kd, C['kind_' + kd])
    print('\n## arms: P@10 pooled and per repository; with / without; seed kinds')
    for a, M in out['arms'].items():
        print('%-36s P %s | Pwith %.4f Pwithout %.4f | Rwith %.3f Rwithout %.3f | P none %.3f little %.3f much %.3f' % (
            a, ' '.join('%s %.4f' % (k[:3], v) for k, v in M['P'].items()), M['Pwith']['pooled'], M['Pwithout']['pooled'],
            M['Rwith']['pooled'], M['Rwithout']['pooled'], M['P_none']['pooled'], M['P_little']['pooled'], M['P_much']['pooled']))
    print('\n## against BEST, pooled (d [lo, hi])')
    for a, D in out['vs_best'].items():
        print('%-36s' % a, ' '.join('%s %+.4f [%+.4f, %+.4f]' % (k, D[k]['pooled']['d'], D[k]['pooled']['lo'], D[k]['pooled']['hi'])
                                     for k in ('P', 'Pwith', 'Pwithout', 'P_none', 'P_little', 'P_much')))
    print('\n## ablation (seed-averaged, against asis)')
    for v, X in out['ablation'].items():
        print(v, X['seeds'], 'P %.4f' % X['P'], {r: round(x, 4) for r, x in X['per_repo'].items()},
              ' '.join('%s %+.4f [%+.4f, %+.4f]' % (k, d['d'], d['lo'], d['hi']) for k, d in X['vs_asis'].items()),
              'seed1-seed0 %s' % ('%+.4f [%+.4f, %+.4f]' % (X['seed_noise']['d'], X['seed_noise']['lo'], X['seed_noise']['hi']) if X['seed_noise'] else '-'))


if __name__ == '__main__':
    main()
