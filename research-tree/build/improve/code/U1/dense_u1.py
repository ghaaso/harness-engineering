"""Card job: Qwen3-Embedding-0.6B and SweRankEmbed-Small cosines for every query of every block (training, tuning,
held-out), with the card run's dense code (dense.py, read-only: line-window chunks of about 1500 characters with the
path, best-chunk cosine per file, model-card query prompts, fp16, max 512 tokens). Chunk texts shared between snapshots are
embedded once.

usage: python dense_u1.py [--count] [--tags qwen3,swerank] [--repos fixflow,clinic,zulip]
output: /out/<repo>/dense_<tag>.npz with, per block, '<block>' [nq, nfiles] float32 (file order = the block's items) and
'<block>_qids'.
"""
import argparse, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import u1lib as L
import dense as carddense  # /d2/dense.py

MODELS = {'qwen3': '/models/Qwen3-Embedding-0.6B', 'swerank': '/models/SweRankEmbed-Small-local'}


def plan(repo):
    sp, qs = L.load_split(repo)
    items = L.load_items(repo)
    texts, tix = [], {}
    item_chunks = {}
    for b in sp['blocks']:
        for i in b['items']:
            if i in item_chunks:
                continue
            it = items[i]
            ids = []
            for c in carddense.chunks(it['path'], it['text']):
                j = tix.get(c)
                if j is None:
                    j = tix[c] = len(texts)
                    texts.append(c)
                ids.append(j)
            item_chunks[i] = ids
    return sp, qs, texts, item_chunks


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--count', action='store_true')
    ap.add_argument('--tags', default='qwen3,swerank')
    ap.add_argument('--repos', default=','.join(L.REPOS))
    a = ap.parse_args()
    plans = {r: plan(r) for r in a.repos.split(',')}
    for r, (sp, qs, texts, ic) in plans.items():
        print(f'{r}: {len(texts)} unique chunks, {len(qs)} queries, {sum(len(b["items"]) for b in sp["blocks"])} block-files', flush=True)
    if a.count:
        return
    import torch
    from sentence_transformers import SentenceTransformer
    peak = 0
    for tag in a.tags.split(','):
        t0 = time.time()
        m = SentenceTransformer(MODELS[tag], device='cuda', trust_remote_code=True, model_kwargs={'torch_dtype': torch.float16})
        m.max_seq_length = 512
        for r, (sp, qs, texts, ic) in plans.items():
            t = time.time()
            o = np.argsort([len(x) for x in texts], kind='stable')
            cv = np.zeros((len(texts), m.get_embedding_dimension()), dtype=np.float16)
            cv[o] = m.encode([texts[i] for i in o], batch_size=32, normalize_embeddings=True, convert_to_numpy=True,
                             show_progress_bar=False).astype(np.float16)
            qv = m.encode([q['query'] for q in qs], batch_size=32, prompt=carddense.PROMPTS[tag], normalize_embeddings=True,
                          convert_to_numpy=True, show_progress_bar=False).astype(np.float32)
            qrow = {q['qid'] + '|' + q['block']: k for k, q in enumerate(qs)}
            C = torch.from_numpy(cv).cuda()
            out = {}
            for b in sp['blocks']:
                bq = [q for q in qs if q['block'] == b['id']]
                if not bq:
                    continue
                cids, owner = [], []
                for fi, i in enumerate(b['items']):
                    cids.extend(ic[i]); owner.extend([fi] * len(ic[i]))
                Cb = C[torch.tensor(cids, device='cuda')].float()
                own = torch.tensor(owner, device='cuda')
                Q = torch.from_numpy(qv[[qrow[q['qid'] + '|' + b['id']] for q in bq]]).cuda()
                res = torch.full((len(bq), len(b['items'])), -2.0, device='cuda')
                for s in range(0, len(bq), 64):
                    sims = Q[s:s + 64] @ Cb.T
                    res[s:s + 64] = res[s:s + 64].scatter_reduce(1, own.expand(sims.shape[0], -1), sims, reduce='amax')
                out[b['id']] = res.cpu().numpy().astype(np.float32)
                out[b['id'] + '_qids'] = np.array([q['qid'] for q in bq])
            np.savez_compressed(f'{L.rdir(r)}/dense_{tag}.npz', **out)
            peak = max(peak, torch.cuda.max_memory_allocated())
            print(f'{tag} {r}: {len(texts)} chunks, {len(qs)} queries, {time.time() - t:.0f} s, peak {peak / 2**30:.2f} GiB', flush=True)
            del C
            torch.cuda.empty_cache()
        del m
        torch.cuda.empty_cache()
        print(f'{tag} done {time.time() - t0:.0f} s', flush=True)
    with open(f'{L.OUT}/gpu-dense.peak', 'w') as f:
        f.write(f'PEAK_CUDA {peak / 2**30:.2f} GiB (torch max_memory_allocated)\n')


if __name__ == '__main__':
    main()
