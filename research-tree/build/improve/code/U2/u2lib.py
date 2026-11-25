"""U2 shared code: model loading, the card's dense scoring on a block (same chunks, prompts, fp16, best-chunk cosine),
tuning metrics, training pairs.  Mounts: see run.sh (/u1 = U1 code, /u1data = U1 outputs ro, /out = CR/improve/U2)."""
import gzip, json, os, sys, time
import numpy as np
import u1lib as L            # /u1
import dense as carddense    # /d2/dense.py (read-only card code)

MODELS = {'qwen3': '/models/Qwen3-Embedding-0.6B', 'swerank': '/models/SweRankEmbed-Small-local'}
OUT = '/out'
REPOS = L.REPOS


def load_st(tag, dtype='fp16'):
    import torch
    from sentence_transformers import SentenceTransformer
    dt = {'fp16': torch.float16, 'bf16': torch.bfloat16, 'fp32': torch.float32}[dtype]
    m = SentenceTransformer(MODELS[tag], device='cuda', trust_remote_code=True, model_kwargs={'torch_dtype': dt})
    m.max_seq_length = 512
    return m


def block_plan(repo, block_ids):
    """chunks (card form) of the block snapshots' items, queries of those blocks."""
    sp, qs = L.load_split(repo)
    items = L.load_items(repo)
    texts, tix, ic = [], {}, {}
    bl = {b['id']: b for b in sp['blocks']}
    for bid in block_ids:
        for i in bl[bid]['items']:
            if i in ic:
                continue
            ids = []
            for c in carddense.chunks(items[i]['path'], items[i]['text']):
                j = tix.get(c)
                if j is None:
                    j = tix[c] = len(texts); texts.append(c)
                ids.append(j)
            ic[i] = ids
    return sp, qs, items, texts, ic


def encode(m, texts, bs=32, prompt=None):
    o = np.argsort([len(x) for x in texts], kind='stable')
    out = np.zeros((len(texts), m.get_embedding_dimension()), dtype=np.float32)
    if len(texts):
        out[o] = m.encode([texts[i] for i in o], batch_size=bs, normalize_embeddings=True, convert_to_numpy=True,
                          show_progress_bar=False, **({'prompt': prompt} if prompt else {}))
    return out


def score_blocks(m, tag, repo, block_ids, plan=None):
    """{block: (qids, matrix [nq, nfiles] float32, paths)} exactly as dense_u1.py (best chunk cosine per file, fp16)."""
    import torch
    sp, qs, items, texts, ic = plan or block_plan(repo, block_ids)
    cv = encode(m, texts).astype(np.float16)
    C = torch.from_numpy(cv).cuda()
    res = {}
    for b in sp['blocks']:
        if b['id'] not in block_ids:
            continue
        bq = [q for q in qs if q['block'] == b['id']]
        qv = encode(m, [q['query'] for q in bq], prompt=carddense.PROMPTS[tag])
        cids, owner = [], []
        for fi, i in enumerate(b['items']):
            cids.extend(ic[i]); owner.extend([fi] * len(ic[i]))
        Cb = C[torch.tensor(cids, device='cuda')].float()
        own = torch.tensor(owner, device='cuda')
        Q = torch.from_numpy(qv).cuda()
        out = torch.full((len(bq), len(b['items'])), -2.0, device='cuda')
        for s in range(0, len(bq), 64):
            sims = Q[s:s + 64] @ Cb.T
            out[s:s + 64] = out[s:s + 64].scatter_reduce(1, own.expand(sims.shape[0], -1), sims, reduce='amax')
        res[b['id']] = ([q['qid'] for q in bq], out.cpu().numpy().astype(np.float32), [items[i]['path'] for i in b['items']])
        del Cb, Q
    del C
    torch.cuda.empty_cache()
    return res


def tune_metrics(repo, qids, M, paths):
    """per-query (acc10, p2, r10) on the tuning block with the card's tie rule."""
    sp, qs = L.load_split(repo)
    truth = {q['qid']: set(q['truth']) for q in qs if q['block'] == 'tune'}
    ix = {p: j for j, p in enumerate(paths)}
    out = []
    for qi, qid in enumerate(qids):
        tm = np.zeros(len(paths), dtype=bool)
        for p in truth[qid]:
            tm[ix[p]] = True
        out.append(L.qmetrics(M[qi].astype(np.float64), L.tiekeys(qid, paths), tm))
    return np.array(out)


def read_pairs(repo):
    d = f'{OUT}/pairs/{repo}'
    ch = {}
    with gzip.open(f'{d}/chunks.jsonl.gz', 'rt', encoding='utf-8') as f:
        for l in f:
            r = json.loads(l); ch[r['id']] = r['text']
    pairs = [json.loads(l) for l in open(f'{d}/pairs.jsonl', encoding='utf-8')]
    return ch, pairs
