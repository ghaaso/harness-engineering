"""A6: SweRankEmbed-Large (7B retriever) at 4-bit (nf4, bf16 compute), function chunks, scored on the tuning and held-out
snapshots (not on U1's training blocks: A1 is fitted on tuning, so those rows stay empty).
usage (inside the container, see run.sh):
  python a6.py count                     CPU: unique chunk texts per repository
  python a6.py check --route both        card: the two routes on real queries and chunks (writes /out/a6/route-check.json)
  python a6.py embed [--route a|b]       card: chunk and query vectors -> /out/a6/vec_<repo>.npz (resumable per repository)
  python a6.py score                     CPU: aggregation (max | sum of the top 3 chunks) chosen on tuning, score matrices,
                                         ranking files, /out/a6/a6_<repo>.npz
Chunks: U1's function_chunks (tree-sitter), each cut to MAXTOK tokens; chunk texts shared between snapshots are embedded once."""
import argparse, json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.environ.get('U1_CODE', '/u1'))
import numpy as np
import u1lib as L

MODEL = os.environ.get('U3_A6_MODEL', '/models/SweRankEmbed-Large')
CODE_COPY = os.environ.get('U3_A6_CODE', '/models/SweRankEmbed-Large')   # the folder's own modeling_qwen.py (identical to the gte copy, blank lines aside)
OUT = os.environ.get('U3_OUT', '/out')
MAXTOK = int(os.environ.get('U3_MAXTOK', '512'))
BLOCKS = ('tune', 'heldout')
TOKBUDGET = int(os.environ.get('U3_TOKBUDGET', '16384'))   # tokens per batch (padded)


def plan(repo):
    sp, qs = L.load_split(repo)
    items = L.load_items(repo)
    texts, tix, item_chunks = [], {}, {}
    for b in sp['blocks']:
        if b['id'] not in BLOCKS:
            continue
        for i in b['items']:
            if i in item_chunks:
                continue
            ids = []
            for c in L.function_chunks(items[i]['path'], items[i]['text']):
                j = tix.get(c)
                if j is None:
                    j = tix[c] = len(texts)
                    texts.append(c)
                ids.append(j)
            item_chunks[i] = ids
    return sp, qs, texts, item_chunks


def cmd_count(a):
    for r in L.REPOS:
        sp, qs, texts, ic = plan(r)
        nq = {b: sum(1 for q in qs if q['block'] == b) for b in BLOCKS}
        print(f'{r}: {len(texts)} unique chunks, {len(ic)} files, queries {nq}, mean chars {np.mean([len(t) for t in texts]):.0f}', flush=True)


def load_model(route, quant=True):
    import embedlib as E
    q = E.bnb_nf4() if quant else None
    return (E.load_route_a(MODEL, quant=q, code_path=CODE_COPY) if route == 'a' else E.load_route_b(MODEL, quant=q))


SAVE_EVERY = float(os.environ.get('U3_SAVE_EVERY', '120'))   # seconds between checkpoints of a running encoding pass


def encode_all(model, tok, texts, max_len, prefix='', ckpt=None):
    """vectors [n, 3584] fp16, texts sorted by length and batched under a padded-token budget (batches are a fixed
    function of the texts, so a restart meets the same batches). ckpt: path of a partial file ({out, done}) written
    atomically every SAVE_EVERY seconds; a restart skips the batches whose rows are done."""
    import torch, embedlib as E
    ids = E.encode_ids(tok, [prefix + t for t in texts], max_len)
    order = np.argsort([len(x) for x in ids], kind='stable')
    out = np.zeros((len(texts), model.config.hidden_size), dtype=np.float16)
    done = np.zeros(len(texts), dtype=bool)
    if ckpt and os.path.exists(ckpt):
        z = np.load(ckpt)
        if z['done'].shape == done.shape and z['out'].shape == out.shape:
            out, done = z['out'], z['done']
            print(f'resume {ckpt}: {int(done.sum())}/{len(done)} done', flush=True)

    def save():
        if ckpt:
            np.savez(ckpt + '.tmp.npz', out=out, done=done)
            os.replace(ckpt + '.tmp.npz', ckpt)
    last = time.time()
    i = 0
    while i < len(order):
        j = i
        while j < len(order) and (j - i + 1) * len(ids[order[j]]) <= TOKBUDGET:
            j += 1
        j = max(j, i + 1)
        sel = order[i:j]
        if not done[sel].all():
            out[sel] = E.embed_ids(model, [ids[k] for k in sel], 'cuda').cpu().numpy().astype(np.float16)
            done[sel] = True
            if time.time() - last > SAVE_EVERY:
                save(); last = time.time()
        i = j
    save()
    return out


def cmd_check(a):
    import torch, embedlib as E
    from transformers import AutoTokenizer
    tok = AutoTokenizer.from_pretrained(MODEL)
    sp, qs, texts, ic = plan('fixflow')
    rng = np.random.RandomState(0)
    tq = [q['query'] for q in qs if q['block'] == 'tune'][:4]
    tc = [texts[i] for i in rng.choice(len(texts), 8, replace=False)]
    res = {}
    for route in ('a', 'b'):
        t = time.time()
        m = load_model(route)
        t_load = time.time() - t
        qv = encode_all(m, tok, tq, 8192, E.QUERY_PREFIX).astype(np.float32)
        cv = encode_all(m, tok, tc, MAXTOK).astype(np.float32)
        res[route] = (qv, cv, t_load, torch.cuda.max_memory_allocated() / 2**30)
        del m
        torch.cuda.empty_cache()
    (qa, ca, la, pa), (qb, cb, lb, pb) = res['a'], res['b']
    rep = dict(
        queries=len(tq), chunks=len(tc),
        query_cos_min=float((qa * qb).sum(1).min()), chunk_cos_min=float((ca * cb).sum(1).min()),
        query_maxabs=float(np.abs(qa - qb).max()), chunk_maxabs=float(np.abs(ca - cb).max()),
        # does the order of scores agree: query-by-chunk matrices
        score_maxabs=float(np.abs(qa @ ca.T - qb @ cb.T).max()),
        score_rank_agree=bool((np.argsort(-(qa @ ca.T), 1) == np.argsort(-(qb @ cb.T), 1)).all()),
        load_s=dict(a=la, b=lb), peak_gib=dict(a=pa, b=pb), attn='sdpa', quant='nf4 bf16 compute')
    os.makedirs(f'{OUT}/a6', exist_ok=True)
    L.wrjson(f'{OUT}/a6/route-check.json', rep)
    print(json.dumps(rep, indent=1), flush=True)


def cmd_embed(a):
    import torch, embedlib as E
    from transformers import AutoTokenizer
    tok = AutoTokenizer.from_pretrained(MODEL)
    os.makedirs(f'{OUT}/a6', exist_ok=True)
    m = load_model(a.route)
    peak = 0
    for r in a.repos.split(','):
        p = f'{OUT}/a6/vec_{r}.npz'
        if os.path.exists(p):
            print(r, 'exists, skipped', flush=True)
            continue
        t = time.time()
        sp, qs, texts, ic = plan(r)
        qsel = [q for q in qs if q['block'] in BLOCKS]
        qv = encode_all(m, tok, [q['query'] for q in qsel], 8192, E.QUERY_PREFIX, ckpt=f'{OUT}/a6/part_q_{r}.npz')
        print(f'{r}: queries done {time.time() - t:.0f} s, {len(texts)} chunks', flush=True)
        cv = encode_all(m, tok, texts, MAXTOK, ckpt=f'{OUT}/a6/part_c_{r}.npz')
        np.savez(p + '.tmp.npz', cv=cv, qv=qv, qid=np.array([q['qid'] for q in qsel]), qblock=np.array([q['block'] for q in qsel]))
        os.replace(p + '.tmp.npz', p)
        peak = max(peak, torch.cuda.max_memory_allocated())
        print(f'{r}: done {time.time() - t:.0f} s, peak {peak / 2**30:.2f} GiB', flush=True)
    with open(f'{OUT}/gpu-a6.peak', 'w') as f:
        f.write(f'PEAK_CUDA {peak / 2**30:.2f} GiB (torch max_memory_allocated)\n')


def file_scores(Q, C, owner, nfiles, how):
    """Q [nq,d], C [nc,d] normalised; owner [nc] file index. how: 'max' | 'top3' (sum of the 3 best chunk cosines)."""
    S = Q @ C.T
    res = np.full((Q.shape[0], nfiles), np.nan, dtype=np.float32)
    order = np.argsort(owner, kind='stable')
    ow = owner[order]
    bounds = np.flatnonzero(np.r_[True, ow[1:] != ow[:-1], True])
    for s, e in zip(bounds[:-1], bounds[1:]):
        f = ow[s]
        v = S[:, order[s:e]]
        if how == 'max':
            res[:, f] = v.max(1)
        else:
            k = min(3, v.shape[1])
            res[:, f] = -np.sort(-v, axis=1)[:, :k].sum(1)
    return res


def cmd_score(a):
    import evalu3 as EV
    mats = {}
    truth = {}
    for r in L.REPOS:
        sp, qs, texts, ic = plan(r)
        truth[r] = EV.tune_truth(r)
        z = np.load(f'{OUT}/a6/vec_{r}.npz')
        C = z['cv'].astype(np.float32)
        qrow = {(b, q): k for k, (b, q) in enumerate(zip(z['qblock'], z['qid']))}
        items = L.load_items(r)
        for b in sp['blocks']:
            if b['id'] not in BLOCKS:
                continue
            bq = [q for q in qs if q['block'] == b['id']]
            Q = z['qv'][[qrow[(b['id'], q['qid'])] for q in bq]].astype(np.float32)
            cids, owner = [], []
            for fi, i in enumerate(b['items']):
                cids.extend(ic[i]); owner.extend([fi] * len(ic[i]))
            Cb = C[np.array(cids)]
            paths = [items[i]['path'] for i in b['items']]
            for how in ('max', 'top3'):
                mats[(r, b['id'], how)] = (file_scores(Q, Cb, np.array(owner), len(paths), how), [q['qid'] for q in bq], paths)
    res = {}
    for how in ('max', 'top3'):
        per = {r: EV.repo_metrics(*mats[(r, 'tune', how)], truth[r]) for r in L.REPOS}
        m = EV.macro(per)
        res[how] = dict(per_repo={r: dict(acc10=v[0], p2=v[1], n=v[2]) for r, v in per.items()}, macro_acc10=m[0], macro_p2=m[1])
    chosen = max(('max', 'top3'), key=lambda h: (res[h]['macro_acc10'], res[h]['macro_p2']))
    res['chosen'] = chosen
    L.wrjson(f'{OUT}/a6/aggregation.json', res)
    for r in L.REPOS:
        for bid in BLOCKS:
            M, qids, paths = mats[(r, bid, chosen)]
            np.savez_compressed(f'{OUT}/a6/a6_{r}_{bid}.npz', M=M, qids=np.array(qids), paths=np.array(paths))
            root = f'{OUT}/cardfmt' if bid == 'tune' else f'{OUT}/heldout'
            EV.write_rank(f'{root}/{r}/rank_a6.jsonl', M, qids, paths)
    print(json.dumps(res, indent=1))


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['count', 'check', 'embed', 'score'])
    ap.add_argument('--route', default='a')
    ap.add_argument('--repos', default=','.join(L.REPOS))
    a = ap.parse_args()
    globals()['cmd_' + a.cmd](a)
