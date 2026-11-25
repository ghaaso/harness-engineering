"""Tuning-split intervals: per-query Acc@10 and P@2 of arms read from ranking files (card format), macro over the three
repositories, bootstrap 95 % interval (queries resampled within each repository, 2000 draws, seed 0) for each arm and for the
paired difference to A2 and to BM25 on the same queries.  usage: python evalint.py a4[,a6,...]"""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import u1lib as L
import evalu3 as EV

OUT = os.environ.get('U3_OUT', '/out')
U1D = os.environ.get('U1_OUT', '/u1data')


def rankfile(arm, repo):
    return f'{OUT}/cardfmt/{repo}/rank_{arm}.jsonl' if arm in ('a4', 'a6') else f'{U1D}/cardfmt/{repo}/rank_{arm}.jsonl'


def perq(arm, repo, paths, truth):
    idx = {p: i for i, p in enumerate(paths)}
    rows = {str(r['qid']): r['scores'] for r in L.rdjsonl(rankfile(arm, repo))}
    res = {}
    for q in sorted(truth):
        M = np.full(len(paths), np.nan)
        for p, s in rows[str(q)]:
            M[idx[p]] = s
        tm = np.zeros(len(paths), dtype=bool)
        for t in truth[q]:
            if t in idx:
                tm[idx[t]] = True
        a, p2, _ = L.qmetrics(M, L.tiekeys(str(q), paths), tm)
        res[str(q)] = (a, p2)
    return res


def main():
    arms = sys.argv[1].split(',')
    allarms = ['bm25', 'a2'] + arms
    data = {a: {} for a in allarms}
    qs_by = {}
    for r in L.REPOS:
        sp, qs = L.load_split(r)
        items = L.load_items(r)
        b = [x for x in sp['blocks'] if x['id'] == 'tune'][0]
        paths = [items[i]['path'] for i in b['items']]
        truth = {str(q['qid']): q['truth'] for q in qs if q['block'] == 'tune'}
        qs_by[r] = sorted(truth)
        for a in allarms:
            data[a][r] = perq(a, r, paths, truth)
    rng = np.random.RandomState(0)
    draws = [{r: rng.randint(0, len(qs_by[r]), len(qs_by[r])) for r in L.REPOS} for _ in range(2000)]

    def vec(a, m):
        return {r: np.array([data[a][r][q][m] for q in qs_by[r]]) for r in L.REPOS}

    def macro(v, d=None):
        return float(np.mean([(v[r] if d is None else v[r][d[r]]).mean() for r in L.REPOS]))
    out = {}
    for m, mn in ((0, 'acc10'), (1, 'p2')):
        V = {a: vec(a, m) for a in allarms}
        for a in allarms:
            bs = [macro(V[a], d) for d in draws]
            out[f'{a}_{mn}'] = dict(macro=macro(V[a]), ci=[float(np.percentile(bs, 2.5)), float(np.percentile(bs, 97.5))],
                                    per_repo={r: float(V[a][r].mean()) for r in L.REPOS})
        for a in arms:
            for base in ('a2', 'bm25'):
                diff = {r: V[a][r] - V[base][r] for r in L.REPOS}
                bs = [macro(diff, d) for d in draws]
                out[f'{a}-{base}_{mn}'] = dict(macro=macro(diff), ci=[float(np.percentile(bs, 2.5)), float(np.percentile(bs, 97.5))])
    out['n'] = {r: len(qs_by[r]) for r in L.REPOS}
    L.wrjson(f'{OUT}/intervals_{"_".join(arms)}.json', out)
    for k, v in out.items():
        if k != 'n':
            print(k, round(v['macro'], 4), [round(x, 4) for x in v['ci']])
    print(out['n'])


main()
