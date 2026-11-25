import json, sys, collections
from common import terms, tiekey


def load(d):
    files = [json.loads(l) for l in open(f'{d}/files.jsonl', encoding='utf-8')]
    qs = [json.loads(l) for l in open(f'{d}/queries.jsonl', encoding='utf-8')]
    return files, qs


def grep_scores(ts, texts):
    """case-insensitive fixed-string match of every term; score = distinct terms matched, then total hits."""
    out = {}
    for p, low in texts.items():
        n = 0
        hits = 0
        for t in ts:
            c = low.count(t)
            if c:
                n += 1
                hits += c
        if n:
            out[p] = n + min(hits, 9999) / 10000.0
    return out


def cograph(cooc):
    adj = collections.defaultdict(lambda: collections.defaultdict(float))
    for fs in cooc:
        w = 1.0 / len(fs)
        for a in fs:
            for b in fs:
                if a != b:
                    adj[a][b] += w
    return adj


def ppr(adj, seeds, d=0.85, it=30):
    s = {n: 0.0 for n in adj}
    for x in seeds:
        if x in s:
            s[x] = 1.0 / len(seeds)
    r = dict(s)
    for _ in range(it):
        nr = {n: (1 - d) * s[n] for n in adj}
        for n, nbrs in adj.items():
            if r[n]:
                tot = sum(nbrs.values())
                for m, w in nbrs.items():
                    nr[m] += d * r[n] * w / tot
        r = nr
    return r


def rrf_scores(adj, seeds, bm25, k=60, qid='q'):
    """seeds first, then files ranked by RRF(PPR, CO) from the seeds, then the BM25 order."""
    co = collections.defaultdict(float)
    for s in seeds:
        for m, w in adj.get(s, {}).items():
            if m not in seeds:
                co[m] += w
    live = [s for s in seeds if s in adj]
    pp = {}
    if live:
        pp = {n: v for n, v in ppr(adj, live).items() if v > 0 and n not in seeds}
    fused = collections.defaultdict(float)
    for lst in (co, pp):
        for i, (n, _) in enumerate(sorted(lst.items(), key=lambda x: (-x[1], tiekey(qid, x[0])))):
            fused[n] += 1.0 / (k + i + 1)
    res = {}
    for i, s in enumerate(seeds):
        res[s] = 3e6 - i
    for n, v in fused.items():
        if n not in res:
            res[n] = 2e6 + v
    for n, v in bm25.items():
        if n not in res:
            res[n] = v
    return res


def run(d, do_rrf):
    files, qs = load(d)
    texts = {f['path']: (f['path'] + '\n' + f['text']).lower() for f in files}
    adj = cograph(json.load(open(f'{d}/cooc.json'))) if do_rrf else None
    bm = {}
    if do_rrf:
        for l in open(f'{d}/rank_bm25.jsonl'):
            r = json.loads(l)
            bm[r['qid']] = dict(r['scores'])
    g = open(f'{d}/rank_grep.jsonl', 'w')
    r = open(f'{d}/rank_rrf.jsonl', 'w') if do_rrf else None
    for q in qs:
        sc = grep_scores(terms(q['query']), texts)
        g.write(json.dumps(dict(qid=q['qid'], scores=list(sc.items()))) + '\n')
        if do_rrf:
            b = bm[q['qid']]
            seeds = [p for p, _ in sorted(b.items(), key=lambda x: (-x[1], tiekey(q['qid'], x[0])))[:3]]
            r.write(json.dumps(dict(qid=q['qid'], scores=list(rrf_scores(adj, seeds, b, qid=q['qid']).items()))) + '\n')
    g.close()
    if r:
        r.close()


if __name__ == '__main__':
    run(sys.argv[1], len(sys.argv) > 2 and sys.argv[2] == 'rrf')
