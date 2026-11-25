"""Step 2a: A7 and A8 swept on the tuning split only; one pooled setting each, chosen by macro Acc@10 over the three
repositories (ties: macro P@2, then grid order). Writes /out/tune/a7_sweep.json, a8_sweep.json, frozen_text.json."""
import itertools, json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import u1lib as L
import textarms as TA
import histarms as HA


def block_queries(repo, block_id, ix=None, with_truth=True):
    ix = ix or TA.get_index(repo)
    sp, qs = L.load_split(repo)
    b = [x for x in sp['blocks'] if x['id'] == block_id][0]
    blk = TA.Block(ix, b)
    bq = [dict(q) for q in qs if q['block'] == block_id]
    for q in bq:
        q['terms'] = L.qterms(q['query'])
        q['tk'] = L.tiekeys(q['qid'], blk.paths)
        if with_truth:
            assert q['split'] != 'heldout'
            q['tm'] = np.array([p in set(q['truth']) for p in blk.paths])
    return blk, bq


class Acc:
    """per configuration, per repository: list of (Acc@10, P@2)."""

    def __init__(self):
        self.r = {}

    def add(self, key, repo, m):
        self.r.setdefault(key, {}).setdefault(repo, []).append(m[:2])

    def table(self):
        out = []
        for key, per in self.r.items():
            pr = {rp: dict(acc10=float(np.mean([x[0] for x in v])), p2=float(np.mean([x[1] for x in v])), n=len(v)) for rp, v in per.items()}
            out.append(dict(cfg=json.loads(key), per_repo=pr, macro_acc10=float(np.mean([x['acc10'] for x in pr.values()])),
                            macro_p2=float(np.mean([x['p2'] for x in pr.values()]))))
        return out


def best(table):
    """max macro Acc@10, then macro P@2, then the earliest in grid order (stable)."""
    return sorted(table, key=lambda r: (-r['macro_acc10'], -r['macro_p2']))[0] if table else None


# the plan's ranges (k1 0.9-2, b 0.4-1, path 1/2/5, K 10/30/100), widened once where the first sweep's pick sat on an edge
# (k1 2.0, path weight 5, K 10): k1 3.0, path weight 10, K 3 and 5 added; the second sweep picked k1 3.0 and path weight 10,
# so k1 4 and 6 and path weight 20 were added once more (the last widening; edges are reported, not chased further)
GRID_F = [dict(mode='bm25f', k1=k1, b=b, pathw=pw, idf=idf) for idf in ('fts5', 'lucene') for k1 in (0.9, 1.2, 1.5, 2.0, 3.0, 4.0, 6.0)
          for b in (0.4, 0.6, 0.75, 0.9, 1.0) for pw in (1.0, 2.0, 5.0, 10.0, 20.0)]
GRID_C = [dict(k1=k1, b=b, idf=idf) for idf in ('fts5', 'lucene') for k1 in (0.9, 1.2, 1.5, 2.0, 3.0, 4.0, 6.0) for b in (0.4, 0.6, 0.75, 0.9, 1.0)]
GRID_R = [dict(fb_docs=d, fb_terms=t, lam=l, maxdf=0.1) for d in (5, 10) for t in (10, 20) for l in (0.5, 0.7)]
GRID_A8 = [dict(K=k, hl=h) for k in (3, 5, 10, 30, 100) for h in (30, 90, 180, 365, 730, None)]


def main():
    os.makedirs(f'{L.OUT}/tune', exist_ok=True)
    t = time.time()
    sets = {r: block_queries(r, 'tune') for r in L.REPOS}
    print(f'loaded {time.time() - t:.0f} s', {r: len(v[1]) for r, v in sets.items()}, flush=True)
    # A7: card BM25, BM25F grid, chunk grid
    acc_f, acc_c, acc_b = Acc(), Acc(), Acc()
    for repo, (blk, bq) in sets.items():
        for q in bq:
            tids = blk.tids(q['terms'])
            cache = (tids, *blk.cols(tids))
            acc_b.add(json.dumps(TA.CARD), repo, L.qmetrics(TA.file_score(blk, q['terms'], TA.CARD, cached=cache), q['tk'], q['tm']))
            for cfg in GRID_F:
                acc_f.add(json.dumps(cfg), repo, L.qmetrics(TA.file_score(blk, q['terms'], cfg, cached=cache), q['tk'], q['tm']))
            for cfg in GRID_C:
                acc_c.add(json.dumps(cfg), repo, L.qmetrics(TA.chunk_score(blk, q['terms'], cfg, cached=tids), q['tk'], q['tm']))
        print(f'A7 grids {repo} {time.time() - t:.0f} s', flush=True)
    tf, tc, tb = acc_f.table(), acc_c.table(), acc_b.table()
    bf, bc = best(tf), best(tc)
    acc_r = Acc()
    for repo, (blk, bq) in sets.items():
        for q in bq:
            base = TA.file_score(blk, q['terms'], bf['cfg'])
            for cfg in GRID_R:
                s = TA.rm3_score(blk, q['terms'], bf['cfg'], cfg['fb_docs'], cfg['fb_terms'], cfg['lam'], cfg['maxdf'], base=base)
                acc_r.add(json.dumps(cfg), repo, L.qmetrics(s, q['tk'], q['tm']))
    tr = acc_r.table()
    br = best(tr)
    forms = sorted([('bm25f', bf), ('rm3', br), ('chunk', bc)], key=lambda x: (-x[1]['macro_acc10'], -x[1]['macro_p2']))
    file_form = 'rm3' if (br['macro_acc10'], br['macro_p2']) > (bf['macro_acc10'], bf['macro_p2']) else 'bm25f'
    a7 = dict(form=forms[0][0], bm25f=bf['cfg'], rm3=br['cfg'], chunk=bc['cfg'], file_form=file_form)
    print('A7 frozen', a7, flush=True)
    L.wrjson(f'{L.OUT}/tune/a7_sweep.json', dict(card_bm25=tb, bm25f=tf, chunk=tc, rm3=tr, frozen=a7))
    # A8
    acc_8 = Acc()
    for repo, (blk, bq) in sets.items():
        H = HA.History(repo)
        n = H.prefix(blk.t_block)
        for q in bq:
            sims = HA.message_sims(H, n, q['terms'])
            for cfg in GRID_A8:
                acc_8.add(json.dumps(cfg), repo, L.qmetrics(HA.a8_votes(H, blk, sims, n, cfg['K'], cfg['hl']), q['tk'], q['tm']))
        print(f'A8 {repo} history {n} {time.time() - t:.0f} s', flush=True)
    t8 = acc_8.table()
    a8 = best(t8)['cfg']
    L.wrjson(f'{L.OUT}/tune/a8_sweep.json', dict(grid=t8, frozen=a8))
    L.wrjson(f'{L.OUT}/tune/frozen_text.json', dict(a7=a7, a8=a8))
    for name, row in [('bm25(card)', tb[0]), ('bm25f', bf), ('rm3', br), ('chunk', bc), ('a8', best(t8))]:
        print(name, row['cfg'], round(row['macro_acc10'], 3), round(row['macro_p2'], 3),
              {r: (round(v['acc10'], 3), round(v['p2'], 3), v['n']) for r, v in row['per_repo'].items()}, flush=True)


if __name__ == '__main__':
    main()
