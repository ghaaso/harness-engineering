"""Embed line-window chunks of the cutoff snapshot and the queries; file score = best chunk cosine.
usage: python dense.py <datadir> <modeldir> <tag> [--limit N]   (card job: take CR/GPU.lock first)"""
import json, sys, time, os
import numpy as np

PROMPTS = {
    'qwen3': 'Instruct: Given a software issue description, retrieve the source files that need to be edited to resolve it\nQuery: ',
    'swerank': 'Represent this query for searching relevant code: ',
}
CHUNK = 1500


def chunks(path, text, size=CHUNK):
    out, cur, n = [], [], 0
    for line in text.splitlines():
        line = line[:400]
        if n + len(line) > size and cur:
            out.append('\n'.join(cur)); cur, n = [], 0
        cur.append(line); n += len(line) + 1
    if cur:
        out.append('\n'.join(cur))
    return [f'{path}\n{c}' for c in out[:80]] or [path]


def file_scores(qvecs, cvecs, owner, nfiles, topk=300):
    """qvecs [Q,D], cvecs [C,D] normalised, owner [C] file index. returns per query list of (file index, score)."""
    res = []
    sims = qvecs @ cvecs.T
    for qi in range(sims.shape[0]):
        best = np.full(nfiles, -np.inf, dtype=np.float32)
        np.maximum.at(best, owner, sims[qi])
        idx = np.argsort(-best)[:topk]
        res.append([(int(i), float(best[i])) for i in idx])
    return res


def main():
    d, mdir, tag = sys.argv[1:4]
    limit = int(sys.argv[sys.argv.index('--limit') + 1]) if '--limit' in sys.argv else None
    import torch
    from sentence_transformers import SentenceTransformer
    files = [json.loads(l) for l in open(f'{d}/files.jsonl', encoding='utf-8')]
    qs = [json.loads(l) for l in open(f'{d}/queries.jsonl', encoding='utf-8')]
    if limit:
        files = files[:limit]; qs = qs[:limit]
    texts, owner = [], []
    for i, f in enumerate(files):
        for c in chunks(f['path'], f['text']):
            texts.append(c); owner.append(i)
    m = SentenceTransformer(mdir, device=os.environ.get('D2_DEVICE', 'cuda'), trust_remote_code=True, model_kwargs={'torch_dtype': torch.float16 if os.environ.get('D2_DEVICE', 'cuda') == 'cuda' else torch.float32})
    m.max_seq_length = 512
    t = time.time()
    order = np.argsort([len(x) for x in texts])
    cv = np.zeros((len(texts), m.get_sentence_embedding_dimension()), dtype=np.float32)
    cv[order] = m.encode([texts[i] for i in order], batch_size=32, normalize_embeddings=True, convert_to_numpy=True, show_progress_bar=False)
    qv = m.encode([q['query'] for q in qs], batch_size=32, prompt=PROMPTS[tag], normalize_embeddings=True, convert_to_numpy=True)
    print(f'{d} {tag}: {len(texts)} chunks, {len(qs)} queries, {time.time()-t:.0f} s', flush=True)
    res = file_scores(qv, cv, np.array(owner), len(files))
    with open(f'{d}/rank_{tag}{"_slice" if limit else ""}.jsonl', 'w') as f:
        for q, r in zip(qs, res):
            f.write(json.dumps(dict(qid=q['qid'], scores=[(files[i]['path'], s) for i, s in r])) + '\n')


if __name__ == '__main__':
    main()
