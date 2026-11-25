"""R-U1 checks 1 and 5 (signals): for each named block, recompute U1's signals with
  (a) a History holding only the commits with ct < the block start, and
  (b) a text index built from that block's own snapshot files only,
and compare every array with the stored /out/<repo>/sig_<block>.npz. Equal arrays mean no signal of the block read a
commit at or after its start, or another snapshot's files. Also: shapes, query order, paths, dense columns filled.
usage: python check_signals.py <repo> <block,block,...|all>"""
import sys, time
sys.path.insert(0, '/code')
import numpy as np
import u1lib as L
import textarms as TA
import histarms as HA
import signals as SG

fails = []


def bad(m):
    fails.append(m); print('FAIL', m, flush=True)


def main():
    repo = sys.argv[1]
    sp, qs = L.load_split(repo)
    want = sys.argv[2].split(',') if sys.argv[2] != 'all' else [b['id'] for b in sp['blocks']]
    frozen = L.rdjson('/out/tune/frozen_text.json')
    hist = L.rdjsonl(f'/out/{repo}/history.jsonl.gz')
    items = L.load_items(repo)
    dense = {t: np.load(f'/out/{repo}/dense_{t}.npz') for t in ('qwen3', 'swerank')}
    for b in sp['blocks']:
        if b['id'] not in want:
            continue
        t = time.time()
        bq = [q for q in qs if q['block'] == b['id']]
        z = np.load(f'/out/{repo}/sig_{b["id"]}.npz')
        if [str(x) for x in z['qids']] != [q['qid'] for q in bq]:
            bad(f'{repo} {b["id"]}: query order')
        if [str(p) for p in z['paths']] != [items[i]['path'] for i in b['items']]:
            bad(f'{repo} {b["id"]}: paths')
        for tag in ('qwen3', 'swerank'):
            v = z['s_' + tag]
            if v.shape != (len(bq), len(b['items'])) or not np.isfinite(v).all() or (v <= -1.5).any():
                bad(f'{repo} {b["id"]}: s_{tag} not filled ({v.shape}, finite {np.isfinite(v).mean():.3f})')
            if not np.array_equal(v, dense[tag][b['id']].astype(np.float32)):
                bad(f'{repo} {b["id"]}: s_{tag} differs from dense_{tag}.npz')
        # (a) history cut at the block start, (b) an index of this snapshot only
        H = HA.History(repo, rows=[r for r in hist if r['ct'] < b['t_block']])
        sub = [items[i] for i in b['items']]
        orig = L.load_items
        L.load_items = lambda r: sub
        try:
            ix = TA.Index(repo)
        finally:
            L.load_items = orig
        b2 = dict(b, items=list(range(len(sub))))
        _, arr = SG.block_signals(repo, b2, bq, ix, H, frozen, dense)
        if int(arr['history_n']) != int(z['history_n']):
            bad(f'{repo} {b["id"]}: history_n {int(z["history_n"])} vs {int(arr["history_n"])} with the cut history')
        for k in SG.SCORES + ['n_edits', 'age_days', 'kind']:
            a, s = np.asarray(arr[k], dtype=np.float64), np.asarray(z[k], dtype=np.float64)
            same = a.shape == s.shape and np.allclose(a, s, rtol=2e-6, atol=1e-6, equal_nan=True)
            if not same:
                d = np.nanmax(np.abs(a - s)) if a.shape == s.shape else 'shape'
                bad(f'{repo} {b["id"]}: {k} differs under the cut history / own-snapshot index (max diff {d})')
        print(repo, b['id'], len(bq), 'queries', len(sub), 'files', 'history', int(arr['history_n']), f'{time.time() - t:.0f} s', flush=True)
    print('FAILS', len(fails))


if __name__ == '__main__':
    main()
