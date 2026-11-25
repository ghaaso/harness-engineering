"""Card job: Qwen3-Embedding-0.6B file vectors for every (blob, path) text of the content snapshots.
The card run's dense code (runbig/card/d2/dense.py) is used as it is: its line-window chunker (1500 characters, 80 chunks
at most, path prefixed), fp16, max_seq_length 512, normalised chunk vectors, no prompt for documents. A file vector is the
normalised mean of its chunk vectors. Restartable: keys already in the output are not embedded again.
usage: python embed.py <repo>... [--count]   (--count: chunk counts only, CPU; otherwise on the card under CR/GPU.lock)
in:  /out/snap/<repo>/texts.jsonl   out: /out/emb/<repo>.npz (keys, vecs float32 [n, 1024])"""
import json, os, sys, time
import numpy as np
sys.path.insert(0, '/d2code')
from dense import chunks   # the card run's chunker


def load(repo):
    return [json.loads(l) for l in open(f'/out/snap/{repo}/texts.jsonl', encoding='utf-8') if l.strip()]


def main():
    repos = [a for a in sys.argv[1:] if not a.startswith('--')]
    if '--count' in sys.argv:
        for r in repos:
            T = load(r); n = sum(len(chunks(t['path'], t['text'])) for t in T)
            print(r, 'texts', len(T), 'chunks', n, 'projected s at 67 chunks/s', round(n / 67), flush=True)
        return
    import torch
    from sentence_transformers import SentenceTransformer
    m = SentenceTransformer('/models/Qwen3-Embedding-0.6B', device='cuda', model_kwargs={'torch_dtype': torch.float16})
    m.max_seq_length = 512
    os.makedirs('/out/emb', exist_ok=True)
    for r in repos:
        fp = f'/out/emb/{r}.npz'
        old = dict(np.load(fp, allow_pickle=False)) if os.path.exists(fp) else None
        have = set(old['keys'].tolist()) if old else set()
        T = [t for t in load(r) if t['key'] not in have]
        texts, owner = [], []
        for i, t in enumerate(T):
            for c in chunks(t['path'], t['text']):
                texts.append(c); owner.append(i)
        t0 = time.time()
        print(f'{r}: {len(T)} new texts, {len(texts)} chunks', flush=True)
        if texts:
            order = np.argsort([len(x) for x in texts])
            cv = np.zeros((len(texts), 1024), dtype=np.float32)
            B = 2048
            for s in range(0, len(order), B):   # pieces, so progress is visible in the log
                ix = order[s:s + B]
                cv[ix] = m.encode([texts[i] for i in ix], batch_size=32, normalize_embeddings=True, convert_to_numpy=True, show_progress_bar=False)
                print(f'  {r} {min(s + B, len(order))}/{len(order)} chunks {time.time() - t0:.0f} s', flush=True)
            owner = np.array(owner)
            fv = np.zeros((len(T), 1024), dtype=np.float64)
            np.add.at(fv, owner, cv)
            fv /= np.maximum(np.linalg.norm(fv, axis=1, keepdims=True), 1e-12)
            keys = np.array([t['key'] for t in T])
            if old:
                keys = np.concatenate([old['keys'], keys]); fv = np.concatenate([old['vecs'].astype(np.float64), fv])
            np.savez(fp, keys=keys, vecs=fv.astype(np.float32))
        print(f'{r}: done {time.time() - t0:.0f} s; peak card memory {torch.cuda.max_memory_allocated() / 2**30:.2f} GB allocated, '
              f'{torch.cuda.max_memory_reserved() / 2**30:.2f} GB reserved', flush=True)


if __name__ == '__main__':
    main()
