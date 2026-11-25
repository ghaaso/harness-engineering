"""usage: python score.py <CR/d2 dir> <out.json> [--arms bm25,grep,qwen3,swerank,rrf]
Scoring as in README.md (fixed before any arm ran)."""
import json, sys
import numpy as np
from common import rank_files

REPOS = ['fixflow', 'clinic', 'zulip']
ARMS_ALL = ['bm25', 'grep', 'qwen3', 'swerank', 'rrf']


def load(dirp, repo, arm):
    try:
        return {r['qid']: dict((p, s) for p, s in r['scores']) for r in map(json.loads, open(f'{dirp}/{repo}/rank_{arm}.jsonl'))}
    except FileNotFoundError:
        return None


def metrics(ranked, truth):
    t = set(truth)
    top10, top2 = ranked[:10], ranked[:2]
    h10 = sum(p in t for p in top10)
    return (1.0 if h10 else 0.0, sum(p in t for p in top2) / 2.0, h10 / len(t))


def per_query(dirp, repo, arm, qs, universe):
    rk = load(dirp, repo, arm)
    if rk is None:
        return None
    missing = [q['qid'] for q in qs if q['qid'] not in rk]
    if missing:  # a missing query is an error, never a random ranking
        raise KeyError(f'{arm} on {repo}: {len(missing)} queries missing from the ranking file, e.g. {missing[:3]}')
    return np.array([metrics(rank_files(q['qid'], rk[q['qid']], universe), q['truth']) for q in qs])


DOCS = ('.md', '.rst', '.txt')


def code_query(q):
    return any(not (p.endswith(DOCS) or p.startswith('docs/')) for p in q['truth'])


def line_verdict(p2):
    """3.7 / SYN:659 / HB:557: the lines are on top-2 precision. Under 0.45 stops; 0.68 or more allows seeding."""
    return 'stops' if p2 < 0.45 else ('allows_seeding' if p2 >= 0.68 else 'between')


def boot_ci(x, n=10000, seed=0):
    """x [Q] or [R][Q]-list: resample queries within each repo; returns (mean, lo, hi) of the macro mean."""
    rng = np.random.default_rng(seed)
    reps = x if isinstance(x, list) else [x]
    means = np.zeros(n)
    for r in reps:
        idx = rng.integers(0, len(r), size=(n, len(r)))
        means += r[idx].mean(axis=1)
    means /= len(reps)
    return float(np.mean([r.mean() for r in reps])), float(np.percentile(means, 2.5)), float(np.percentile(means, 97.5))


def main():
    dirp, outp = sys.argv[1:3]
    arms = sys.argv[sys.argv.index('--arms') + 1].split(',') if '--arms' in sys.argv else ARMS_ALL
    data, codeq, ceil = {}, {}, {}
    for repo in REPOS:
        try:
            qs = [json.loads(l) for l in open(f'{dirp}/{repo}/queries.jsonl', encoding='utf-8')]
            universe = [json.loads(l)['path'] for l in open(f'{dirp}/{repo}/files.jsonl', encoding='utf-8')]
        except FileNotFoundError:
            continue
        data[repo] = {a: per_query(dirp, repo, a, qs, universe) for a in arms}
        codeq[repo] = np.array([code_query(q) for q in qs])
        ceil[repo] = float(np.mean([min(len(q['truth']), 2) / 2.0 for q in qs]))
    out = {'n_queries': {r: len(next(iter(v.values()))) for r, v in data.items() if any(x is not None for x in v.values())}, 'best_possible_p2': ceil, 'code_queries': {r: int(c.sum()) for r, c in codeq.items()}, 'arms': {}}
    for a in arms:
        reps = [d[a] for d in data.values() if d.get(a) is not None]
        if not reps:
            continue
        o = {'per_repo': {r: dict(acc10=float(d[a][:, 0].mean()), p2=float(d[a][:, 1].mean()), r10=float(d[a][:, 2].mean())) for r, d in data.items() if d.get(a) is not None}}
        o['macro_acc10'] = boot_ci([x[:, 0] for x in reps])
        o['macro_p2'] = boot_ci([x[:, 1] for x in reps])
        o['pooled_acc10'] = float(np.concatenate([x[:, 0] for x in reps]).mean())
        o['pooled_p2'] = float(np.concatenate([x[:, 1] for x in reps]).mean())
        o['line_verdict_p2_0.45_0.68'] = line_verdict(o['pooled_p2'])
        o['code_only_acc10'] = {r: float(d[a][codeq[r], 0].mean()) for r, d in data.items() if d.get(a) is not None and codeq[r].any()}
        if a != 'bm25':
            pairs = [(d[a][:, 0] - d['bm25'][:, 0]) for d in data.values() if d.get(a) is not None and d.get('bm25') is not None]
            if pairs:
                o['vs_bm25_acc10'] = boot_ci(pairs)
                o['gate_pass_0.06'] = bool(len(pairs) == 3 and o['vs_bm25_acc10'][0] >= 0.06)
                o['vs_bm25_per_repo'] = {r: float((d[a][:, 0] - d['bm25'][:, 0]).mean()) for r, d in data.items() if d.get(a) is not None and d.get('bm25') is not None}
        out['arms'][a] = o
    json.dump(out, open(outp, 'w'), indent=1)
    print(json.dumps(out, indent=1))


if __name__ == '__main__':
    main()
