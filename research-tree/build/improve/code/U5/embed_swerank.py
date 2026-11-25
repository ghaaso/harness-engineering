"""Card job (variant node features): SweRankEmbed-Small file vectors for the same snapshot texts U4 embedded with Qwen3.
Same chunker as the card run (dense.chunks), fp16, max_seq_length 512, normalised chunk vectors, no prompt for documents,
a file vector = normalised mean of its chunk vectors. Restartable per repository (a finished npz is kept).
in: /u4/snap/<repo>/texts.jsonl (U4, read-only)   out: /out/emb/<repo>.npz (keys, vecs float32 [n, d])
usage: embed_swerank.py <repo>... [--cpu-test N]  (--cpu-test N: N texts on the CPU, writes nothing)"""
import json, os, sys, time
import numpy as np
sys.path.insert(0, '/d2code')
from dense import chunks


def load(repo):
    return [json.loads(l) for l in open(f'/u4/snap/{repo}/texts.jsonl', encoding='utf-8') if l.strip()]


def main():
    args = [a for a in sys.argv[1:]]
    test_n = int(args[args.index('--cpu-test') + 1]) if '--cpu-test' in args else 0
    repos = [a for a in args if a in ('fixflow', 'clinic', 'zulip')]
    import torch
    from sentence_transformers import SentenceTransformer
    dev = 'cpu' if test_n else 'cuda'
    m = SentenceTransformer('/models/SweRankEmbed-Small-local', device=dev, trust_remote_code=True,
                            model_kwargs={'torch_dtype': torch.float32 if test_n else torch.float16})
    m.max_seq_length = 512
    os.makedirs('/out/emb', exist_ok=True)
    for r in repos:
        fp = f'/out/emb/{r}.npz'
        if os.path.exists(fp) and not test_n:
            print(r, 'exists, kept'); continue
        T = load(r)
        if test_n:
            T = T[:test_n]
        texts, owner = [], []
        for i, t in enumerate(T):
            for c in chunks(t['path'], t['text']):
                texts.append(c); owner.append(i)
        t0 = time.time(); print(f'{r}: {len(T)} texts, {len(texts)} chunks', flush=True)
        order = np.argsort([len(x) for x in texts])
        cv = None
        B = 2048
        pf = f'/out/emb/{r}.partial.npz'      # chunk vectors done so far (a crash or stop loses one piece, not the repository)
        s0 = 0
        if os.path.exists(pf) and not test_n:
            z = np.load(pf); cv, s0 = z['cv'], int(z['done'])
            print('  resumed at chunk', s0, flush=True)
        for s in range(s0, len(order), B):
            ix = order[s:s + B]
            e = m.encode([texts[i] for i in ix], batch_size=32, normalize_embeddings=True, convert_to_numpy=True, show_progress_bar=False)
            if cv is None:
                cv = np.zeros((len(texts), e.shape[1]), dtype=np.float32)
            cv[ix] = e
            if not test_n:
                np.savez(pf + '.tmp.npz', cv=cv, done=np.array(min(s + B, len(order)))); os.replace(pf + '.tmp.npz', pf)
            print(f'  {r} {min(s + B, len(order))}/{len(order)} chunks {time.time() - t0:.0f} s', flush=True)
        owner = np.array(owner)
        fv = np.zeros((len(T), cv.shape[1]), dtype=np.float64)
        np.add.at(fv, owner, cv)
        fv /= np.maximum(np.linalg.norm(fv, axis=1, keepdims=True), 1e-12)
        if test_n:
            print('test ok, dim', fv.shape[1]); return
        np.savez(fp + '.tmp.npz', keys=np.array([t['key'] for t in T]), vecs=fv.astype(np.float32))
        os.replace(fp + '.tmp.npz', fp)
        print(f'{r}: done {time.time() - t0:.0f} s; peak card memory {torch.cuda.max_memory_allocated() / 2**30:.2f} GB allocated', flush=True)


if __name__ == '__main__':
    main()
