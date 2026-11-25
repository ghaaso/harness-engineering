"""Step 2b: every signal, with the settings frozen on tuning (frozen_text.json), for every query of every block
(training, tuning, held-out), as full vectors over the block's snapshot. Writes /out/<repo>/sig_<block>.npz.

Signals (rows = queries of the block, columns = its files): s_bm25 (the card's BM25 form), s_bm25f (BM25F, or its RM3
form if RM3 won on tuning), s_chunk (function-chunk BM25), s_a7 (the frozen A7 arm), s_qwen3, s_swerank (best-chunk
cosine, dense_u1.py), s_a8 (A8 vote), co_inv / co_d90 / co_d365 (co-change from the top-3 files of s_a7, 1/|e|, decay
none / 90 / 365 days); per file: n_edits, age_days, kind. Text and vote scores: NaN = unlisted (no match)."""
import os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import u1lib as L
import textarms as TA
import histarms as HA

SCORES = ['s_bm25', 's_bm25f', 's_chunk', 's_a7', 's_qwen3', 's_swerank', 's_a8', 'co_inv', 'co_d90', 'co_d365']


def block_signals(repo, b, bq, ix, H, frozen, dense):
    blk = TA.Block(ix, b)
    n = H.prefix(blk.t_block)
    assert n == 0 or H.ct[n - 1] < blk.t_block
    Cs = HA.cochange(H, blk, n)
    ne, age = HA.edit_features(H, blk, n)
    a7, a8 = frozen['a7'], frozen['a8']
    out = {k: np.full((len(bq), blk.N), np.nan, dtype=np.float32) for k in SCORES}
    for qi, q in enumerate(bq):
        terms = L.qterms(q['query'])
        tk = L.tiekeys(q['qid'], blk.paths)
        out['s_bm25'][qi] = TA.file_score(blk, terms, TA.CARD)
        base = TA.file_score(blk, terms, a7['bm25f'])
        ff = TA.file_form_score(blk, terms, a7) if a7['file_form'] == 'rm3' else base
        out['s_bm25f'][qi] = ff
        ch = TA.chunk_score(blk, terms, a7['chunk'])
        out['s_chunk'][qi] = ch
        if a7['form'] == 'chunk':
            s7 = ch
        elif a7['form'] == 'rm3':
            s7 = ff if a7['file_form'] == 'rm3' else TA.a7_score(blk, terms, a7, base=base)
        else:
            s7 = base
        out['s_a7'][qi] = s7
        sims = HA.message_sims(H, n, terms)
        out['s_a8'][qi] = HA.a8_votes(H, blk, sims, n, a8['K'], a8['hl'])
        o = L.order(np.asarray(s7, dtype=np.float64), tk)[:3]
        seeds = [j for j in o if not np.isnan(s7[j])]
        co = HA.co_scores(Cs, seeds)
        out['co_inv'][qi], out['co_d90'][qi], out['co_d365'][qi] = co[None], co[90], co[365]
    for tag in ('qwen3', 'swerank'):
        z = dense[tag]
        if b['id'] in z.files:
            qids = list(z[b['id'] + '_qids'])
            assert qids == [q['qid'] for q in bq], f'{repo} {b["id"]} {tag}: query order differs'
            out['s_' + tag] = z[b['id']].astype(np.float32)
    kind = np.array([L.file_kind(p) for p in blk.paths], dtype=np.int8)
    return blk, dict(out, n_edits=ne.astype(np.float32), age_days=age.astype(np.float32), kind=kind,
                     qids=np.array([q['qid'] for q in bq]), paths=np.array(blk.paths), history_n=np.array(n),
                     t_block=np.array(blk.t_block), snap_ct=np.array(blk.snap_ct))


def main():
    frozen = L.rdjson(f'{L.OUT}/tune/frozen_text.json')
    repos = sys.argv[1].split(',') if len(sys.argv) > 1 else L.REPOS
    for repo in repos:
        t = time.time()
        ix = TA.get_index(repo)
        sp, qs = L.load_split(repo)
        H = HA.History(repo)
        dense = {tag: np.load(f'{L.rdir(repo)}/dense_{tag}.npz') for tag in ('qwen3', 'swerank')}
        for b in sp['blocks']:
            bq = [q for q in qs if q['block'] == b['id']]
            if not bq:
                continue
            blk, arr = block_signals(repo, b, bq, ix, H, frozen, dense)
            np.savez_compressed(f'{L.rdir(repo)}/sig_{b["id"]}.npz', **arr)
            print(f'{repo} {b["id"]}: {len(bq)} queries x {blk.N} files, history {int(arr["history_n"])}, {time.time() - t:.0f} s', flush=True)


if __name__ == '__main__':
    main()
