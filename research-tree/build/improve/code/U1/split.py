"""Step 1: the D2 tuning split and the ranker's training queries, by the card run's rules (prep.py, read-only import).

usage: python split.py <repo> [--src /src/<repo>] [--meta /cr/<repo>/meta.json] [--out /out/<repo>]

- history: `main`, non-merge commits, prep.read_log; candidates: prep.candidates (same filters, B2 stem stripping).
- held-out: unchanged (the card's meta: first_heldout_ct t0 and cutoff are re-derived and asserted equal).
- pre-cutoff candidates: candidates with ct < t0, in time order.
- tuning: the last min(int(30 %), 150) of them (t_tune = the first one's ct; ties at t_tune all go to tuning),
  scored against one snapshot just before t_tune (the held-out rule: the last commit with ct < t_tune), truth = edited
  files in that snapshot, a commit with none dropped.
- training: up to 1,000 candidates with ct < t_tune, cut from the end into blocks of the tuning size; each block is scored
  against the snapshot just before its first candidate, by the same rule. History used by any query of a block (votes,
  co-change, edit counts) = commits with ct < the block's start.
"""
import argparse, json, os, subprocess, sys, threading
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import u1lib as L


def ls_tree(repo, rev):
    raw = L.cardprep.git(repo, 'ls-tree', '-r', '-l', rev)
    out = []
    for line in raw.splitlines():
        meta, path = line.split('\t', 1)
        mode, typ, blob, size = meta.split()
        if typ != 'blob' or not L.cardprep.indexable(path):
            continue
        if size != '-' and int(size) > L.MAXBYTES:
            continue
        out.append((path, blob))
    return out


def read_blobs(repo, shas):
    proc = subprocess.Popen(['git', '-C', repo, 'cat-file', '--batch'], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    payload = ''.join(f'{s}\n' for s in shas).encode()
    threading.Thread(target=lambda: (proc.stdin.write(payload), proc.stdin.close()), daemon=True).start()
    out = {}
    for s in shas:
        hdr = proc.stdout.readline().split()
        if len(hdr) < 3 or hdr[1] != b'blob':
            continue
        n = int(hdr[2])
        data = proc.stdout.read(n)
        proc.stdout.read(1)
        out[s] = data
    proc.stdout.close()
    proc.wait()
    return out


def snapshot_before(commits, t):
    """the card's rule (prep.py main): the last commit, in log order, with ct < t."""
    before = [c for c in commits if c['ct'] < t]
    return before[-1] if before else None


def ancestry_max_ct(repo, h):
    raw = L.cardprep.git(repo, 'rev-list', '--format=%ct', '--no-commit-header', h)
    return max(int(x) for x in raw.split())


def cut_blocks(training, size):
    """blocks of `size` from the end (the last block abuts the tuning split)."""
    blocks = []
    i = len(training)
    while i > 0:
        blocks.append(training[max(0, i - size):i])
        i -= size
    return blocks[::-1]


def build(repo, src, meta, outd, train_max=L.TRAIN_MAX, tune_frac=L.TUNE_FRAC, tune_max=L.TUNE_MAX, heldout_queries=None):
    commits = L.cardprep.read_log(src, 'main')
    cands = L.cardprep.candidates(commits)
    k = L.cardprep.split_point(len(cands), 0.4, 250)
    t0 = cands[k]['ct']
    cut = snapshot_before(commits, t0)
    if meta:
        assert t0 == meta['first_heldout_ct'] and cut['h'] == meta['cutoff'] and len(cands) == meta['candidates'], 'held-out split differs from the card run'
    pre = sorted((c for c in cands if c['ct'] < t0), key=lambda c: c['ct'])
    m = min(int(len(pre) * tune_frac), tune_max)
    t_tune = pre[len(pre) - m]['ct']
    tuning = [c for c in pre if c['ct'] >= t_tune]
    pool = [c for c in pre if c['ct'] < t_tune]
    training = pool[-train_max:]
    bsize = len(tuning)
    blocks = [('tune', 'tune', tuning)] + [(f'train{i}', 'train', b) for i, b in enumerate(cut_blocks(training, bsize))]

    items, item_ix, blob_need = [], {}, set()
    snaps = {}
    specs = []
    for bid, kind, cs in blocks:
        tb = cs[0]['ct']
        s = snapshot_before(commits, tb)
        if s is None:
            specs.append((bid, kind, cs, tb, None, []))
            continue
        amax = ancestry_max_ct(src, s['h'])
        assert amax < tb, f'{repo} {bid}: snapshot ancestry has a commit at or after the block start'
        lst = ls_tree(src, s['h'])
        blob_need.update(b for _, b in lst)
        specs.append((bid, kind, cs, tb, s, lst))
    hl = ls_tree(src, cut['h'])
    blob_need.update(b for _, b in hl)
    data = read_blobs(src, sorted(blob_need))
    ok = {b for b, x in data.items() if not (len(x) > L.MAXBYTES or b'\x00' in x[:2000])}

    def item(p, b):
        key = (p, b)
        if key not in item_ix:
            item_ix[key] = len(items)
            items.append(dict(i=len(items), path=p, blob=b, text=data[b].decode('utf-8', 'replace')))
        return item_ix[key]

    queries, bl = [], []
    for bid, kind, cs, tb, s, lst in specs:
        rows = [item(p, b) for p, b in lst if b in ok]
        pset = {items[i]['path'] for i in rows}
        nq = nd = ndocs = 0
        for c in cs:
            truth = [p for p in c['mod'] if p in pset]
            if not truth:
                nd += 1
                continue
            nq += 1
            ndocs += all(p.endswith(L.cardscore.DOCS) or p.startswith('docs/') for p in truth)
            queries.append(dict(qid=f"{repo}-{c['h'][:10]}", block=bid, split=kind, commit=c['h'], ct=c['ct'],
                                query=L.cardprep.clean_message(c['msg'], c['mod']), truth=truth))
        bl.append(dict(id=bid, split=kind, t_block=tb, t_last=cs[-1]['ct'], snapshot=s['h'] if s else None,
                       snap_ct=s['ct'] if s else None, candidates=len(cs), queries=nq, dropped=nd, docs_only=ndocs,
                       files=len(rows), items=rows))
    hrows = [item(p, b) for p, b in hl if b in ok]
    hq = heldout_queries or []
    for q in hq:
        queries.append(dict(qid=q['qid'], block='heldout', split='heldout', commit=q['commit'], ct=q['ct'], query=q['query'], truth=None))
    bl.append(dict(id='heldout', split='heldout', t_block=t0, t_last=None, snapshot=cut['h'], snap_ct=cut['ct'],
                   candidates=len(cands) - k, queries=len(hq), dropped=None, docs_only=None, files=len(hrows), items=hrows))
    hist = [dict(h=c['h'], ct=c['ct'], msg=c['msg'][:1500], files=c['files']) for c in commits if c['ct'] < t0]
    sp = dict(repo=repo, ref='main', commits=len(commits), candidates=len(cands), heldout_candidates=len(cands) - k,
              pre_cutoff=len(pre), tune_size=m, t0=t0, t_tune=t_tune, training_pool=len(pool), training=len(training),
              block_size=bsize, history_commits=len(hist), blocks=bl)
    os.makedirs(outd, exist_ok=True)
    L.wrjsonl(f'{outd}/items.jsonl.gz', items)
    L.wrjsonl(f'{outd}/queries.jsonl', queries)
    L.wrjsonl(f'{outd}/history.jsonl.gz', hist)
    L.wrjson(f'{outd}/split.json', sp)
    return sp


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('repo')
    ap.add_argument('--src'); ap.add_argument('--meta'); ap.add_argument('--out')
    a = ap.parse_args()
    src = a.src or f'{L.SRC}/{a.repo}'
    meta = L.rdjson(a.meta or f'{L.CRD2}/{a.repo}/meta.json')
    outd = a.out or L.rdir(a.repo)
    hq = L.load_heldout_queries(a.repo)
    sp = build(a.repo, src, meta, outd, heldout_queries=hq)
    # the held-out snapshot is the card's index, file for file
    card_paths = [json.loads(l)['path'] for l in open(f'{L.CRD2}/{a.repo}/files.jsonl', encoding='utf-8')]
    items = L.load_items(a.repo)
    hb = [b for b in sp['blocks'] if b['id'] == 'heldout'][0]
    assert sorted(items[i]['path'] for i in hb['items']) == sorted(card_paths), 'held-out snapshot differs from the card index'
    print(json.dumps({k: v for k, v in sp.items() if k != 'blocks'}))
    for b in sp['blocks']:
        print(json.dumps({k: v for k, v in b.items() if k != 'items'}))


if __name__ == '__main__':
    main()
