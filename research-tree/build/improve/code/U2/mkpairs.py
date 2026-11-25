"""Training data for A5 from commits BEFORE the tuning split's first commit (t_tune of U1's split.json, per repository).

For each training commit (prep.candidates with ct < t_tune; zulip: the last ZCAP of them):
  query     = prep.clean_message(msg, mod)  (the same text the queries use)
  positives = function chunks (U1's tree-sitter chunker) of the edited files at the PARENT whose text is absent from the
              same file's chunks at the commit (= the chunk was changed or removed); at most 3 per commit, seeded.
  negatives = BM25 (lucene idf, k1 1.2, b 0.75, the card's query terms) top chunks of a snapshot pool, excluding every
              chunk of the commit's edited files. The pool is the repository at a ladder snapshot: commits are cut into
              groups of K in time order and a group's snapshot is the last commit with ct < the group's first ct.
usage: python mkpairs.py <repo> [--zcap 20000]
output /out/pairs/<repo>/: chunks.jsonl.gz {id,text,path}, pools.npz (pool_<i> chunk ids), pairs.jsonl {pid,commit,ct,
snap,snap_ct,pool,query,pos,pos_path,negs[10]}, info.json"""
import argparse, collections, gzip, json, os, random, subprocess, sys, time
import numpy as np
import scipy.sparse as sp
import u1lib as L
import split as S

ZCAP = 20000   # units/U2/BRIEF.md item 2: zulip capped at 20,000 training commits (was 2,500 until the review r57-0097, text B3)
GROUP = {'fixflow': 20, 'clinic': 25, 'zulip': 250}
MAXPOS, NEGKEEP = 3, 10


def diff_raw(src, hashes):
    """{commit: [(path, old_blob, new_blob)]} for status M, one git diff-tree process."""
    p = subprocess.run(['git', '-c', 'core.quotepath=off', '-C', src, 'diff-tree', '--stdin', '-r', '--raw', '--no-renames', '--no-abbrev'],
                       input=''.join(h + '\n' for h in hashes).encode(), capture_output=True, check=True)
    out, cur = {}, None
    for l in p.stdout.decode('utf-8', 'replace').splitlines():
        if l.startswith(':'):
            meta, path = l.split('\t', 1)
            m = meta[1:].split()
            if m[4] == 'M' and cur is not None:
                out[cur].append((path, m[2], m[3]))
        elif len(l) == 40:
            cur = l
            out[cur] = []
    return out


class Chunks:
    def __init__(self):
        self.ids, self.texts, self.paths, self.by_blob = {}, [], [], {}

    def of_blob(self, path, blob, data):
        key = (path, blob)
        if key not in self.by_blob:
            ids = []
            for t in L.function_chunks(path, data.decode('utf-8', 'replace')):
                j = self.ids.get(t)
                if j is None:
                    j = self.ids[t] = len(self.texts)
                    self.texts.append(t)
                    self.paths.append(path)
                ids.append(j)
            self.by_blob[key] = ids
        return self.by_blob[key]


def bm25_top(M, dl, qtids, k1=1.2, b=0.75, top=60):
    n = M.shape[0]
    if not len(qtids):
        return np.zeros(0, dtype=np.int64)
    Mc = M[:, qtids]
    df = np.asarray((Mc > 0).sum(axis=0)).ravel()
    idf = np.log1p((n - df + 0.5) / (df + 0.5))
    Mc = Mc.tocoo()
    tf = Mc.data.astype(np.float64)
    norm = tf * (k1 + 1) / (tf + k1 * (1 - b + b * dl[Mc.row] / dl.mean()))
    s = np.zeros(n)
    np.add.at(s, Mc.row, norm * idf[Mc.col])
    o = np.argsort(-s, kind='stable')[:top]
    return o[s[o] > 0]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('repo'); ap.add_argument('--zcap', type=int, default=ZCAP); ap.add_argument('--group', type=int)
    a = ap.parse_args()
    repo = a.repo
    src = f'{L.SRC}/{repo}'
    sps = L.rdjson(f'{L.rdir(repo)}/split.json')
    t_tune = sps['t_tune']
    commits = L.cardprep.read_log(src, 'main')
    cands = L.cardprep.candidates(commits)
    pre = sorted((c for c in cands if c['ct'] < t_tune), key=lambda c: c['ct'])
    if repo == 'zulip':
        pre = pre[-a.zcap:]
    K = a.group or GROUP[repo]
    print(f'{repo}: {len(pre)} training commits before t_tune={t_tune}, group {K}', flush=True)
    t = time.time()
    raw = diff_raw(src, [c['h'] for c in pre])
    CH = Chunks()
    need = set()
    for c in pre:
        for p, o, n in raw.get(c['h'], []):
            if p in c['mod']:
                need.update((o, n))
    data = S.read_blobs(src, sorted(need))
    pairs, rng = [], random.Random(7)
    groups = [pre[i:i + K] for i in range(0, len(pre), K)]
    pools, pool_meta = [], []
    for gi, g in enumerate(groups):
        snap = S.snapshot_before(commits, g[0]['ct'])
        if snap is None:
            pools.append(None); pool_meta.append(None)
            continue
        assert S.ancestry_max_ct(src, snap['h']) < g[0]['ct']
        lst = S.ls_tree(src, snap['h'])
        blobs = S.read_blobs(src, sorted({b for p_, b in lst if (p_, b) not in CH.by_blob}))
        ids = []
        for path, blob in lst:
            if (path, blob) in CH.by_blob:
                ids.extend(CH.by_blob[(path, blob)])
            elif blob in blobs and b'\x00' not in blobs[blob][:2000]:
                ids.extend(CH.of_blob(path, blob, blobs[blob]))
        pools.append(np.array(sorted(set(ids)), dtype=np.int64)); pool_meta.append(dict(snap=snap['h'], snap_ct=snap['ct']))
        print(f'  pool {gi}: {len(pools[-1])} chunks, {time.time() - t:.0f} s', flush=True)
    for gi, g in enumerate(groups):
        for c in g:
            pos = []
            for p, o, n in raw.get(c['h'], []):
                if p not in c['mod'] or o not in data or n not in data:
                    continue
                oc = CH.of_blob(p, o, data[o]); nc = set(CH.of_blob(p, n, data[n]))
                pos.extend(j for j in oc if j not in nc)
            if not pos or pools[gi] is None:
                continue
            pos = sorted(set(pos))
            rng.shuffle(pos)
            for j in pos[:MAXPOS]:
                pairs.append(dict(commit=c['h'], ct=c['ct'], pool=gi, query=L.cardprep.clean_message(c['msg'], c['mod']), pos=j, mod=c['mod']))
    vocab, rows = {}, {}

    def tok(j):
        r = rows.get(j)
        if r is None:
            cnt = collections.Counter(L.doc_tokens(CH.texts[j]))
            r = rows[j] = (np.array([vocab.setdefault(w, len(vocab)) for w in cnt], dtype=np.int64), np.array(list(cnt.values()), dtype=np.float32))
        return r

    byg = collections.defaultdict(list)
    for p in pairs:
        byg[p['pool']].append(p)
    for gi, ps in sorted(byg.items()):
        ids = pools[gi]
        ind, dat, ptr = [], [], [0]
        for j in ids:
            i_, d_ = tok(int(j)); ind.append(i_); dat.append(d_); ptr.append(ptr[-1] + len(i_))
        V = len(vocab) + 1
        M = sp.csr_matrix((np.concatenate(dat), np.concatenate(ind), np.array(ptr)), shape=(len(ids), V))
        dl = np.asarray(M.sum(axis=1)).ravel() + 1.0
        M = M.tocsc()
        ppath = np.array([CH.paths[int(j)] for j in ids])
        for p in ps:
            qt = [vocab[w] for w in L.qterms(p['query']) if w in vocab]
            top = bm25_top(M, dl, np.array(qt, dtype=np.int64))
            mod = set(p['mod'])
            p['negs'] = [int(ids[i]) for i in top if ppath[i] not in mod and int(ids[i]) != p['pos']][:NEGKEEP]
        print(f'  negatives pool {gi}: {len(ps)} pairs, {time.time() - t:.0f} s', flush=True)
    pairs = [p for p in pairs if len(p.get('negs', [])) >= 3]
    od = f'/out/pairs/{repo}'
    os.makedirs(od, exist_ok=True)
    with gzip.open(f'{od}/chunks.jsonl.gz', 'wt', encoding='utf-8') as f:
        for j, tx in enumerate(CH.texts):
            f.write(json.dumps(dict(id=j, text=tx, path=CH.paths[j])) + '\n')
    np.savez_compressed(f'{od}/pools.npz', **{f'pool_{i}': p for i, p in enumerate(pools) if p is not None})
    with open(f'{od}/pairs.jsonl', 'w', encoding='utf-8') as f:
        for i, p in enumerate(pairs):
            pm = pool_meta[p['pool']]
            f.write(json.dumps(dict(pid=f'{repo}-{i}', repo=repo, commit=p['commit'], ct=p['ct'], pool=p['pool'], snap=pm['snap'], snap_ct=pm['snap_ct'],
                                    query=p['query'], pos=p['pos'], pos_path=CH.paths[p['pos']], negs=p['negs'])) + '\n')
    info = dict(repo=repo, t_tune=t_tune, training_commits=len(pre), pairs=len(pairs), commits_with_pairs=len({p['commit'] for p in pairs}),
                chunks=len(CH.texts), pools=len([p for p in pools if p is not None]), group=K, max_ct=max(p['ct'] for p in pairs),
                max_snap_ct=max(m['snap_ct'] for m in pool_meta if m))
    json.dump(info, open(f'{od}/info.json', 'w'), indent=1)
    print(json.dumps(info), f'{time.time() - t:.0f} s', flush=True)


if __name__ == '__main__':
    main()
