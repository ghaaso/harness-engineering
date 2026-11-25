"""Consistency filter inputs: for every training pair, the rank of its positive chunk under the START model among the
chunks of its snapshot pool (1 + the number of pool chunks of OTHER files scoring above it for the query).
The record's filtered tuning drops pairs whose positive ranks below 100 (f3a).
usage: python filter_ranks.py <tag> [--repos fixflow,clinic,zulip]   (card job)
output /out/pairs/<repo>/rank_<tag>.json {pid: rank}"""
import argparse, json, os, time
import numpy as np
import u2lib as U
import dense as carddense


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('tag'); ap.add_argument('--repos', default=','.join(U.REPOS))
    a = ap.parse_args()
    import torch
    m = U.load_st(a.tag)
    for repo in a.repos.split(','):
        t = time.time()
        ch, pairs = U.read_pairs(repo)
        d = f'{U.OUT}/pairs/{repo}'
        pools = np.load(f'{d}/pools.npz')
        paths = {}
        for l in __import__('gzip').open(f'{d}/chunks.jsonl.gz', 'rt', encoding='utf-8'):
            r = json.loads(l); paths[r['id']] = r['path']
        need = sorted({int(j) for k in pools.files for j in pools[k]} | {p['pos'] for p in pairs})
        E = np.zeros((max(need) + 1, m.get_embedding_dimension()), dtype=np.float16)
        # 2026-11-25 (review r57-0097, text B3: zulip at 20,000 commits, about 288k chunks): encoded in slices taken in the order
        # U.encode sorts by (text length, stable), with a line after each, so the gate's hang watch (no output line for 2 T =
        # 2,400 s) does not kill a healthy 40-50 min embedding that has no save
        o = sorted(need, key=lambda j: len(ch[j])); SL = int(os.environ.get('U2_FILTER_SLICE', '16384'))
        for s0 in range(0, len(o), SL):
            ids = o[s0:s0 + SL]
            E[ids] = U.encode(m, [ch[j] for j in ids]).astype(np.float16)
            print(f'{repo}: {min(s0 + SL, len(o))} of {len(o)} chunks embedded, {time.time() - t:.0f} s', flush=True)
        qv = U.encode(m, [p['query'] for p in pairs], prompt=carddense.PROMPTS[a.tag])
        Et = torch.from_numpy(E).cuda()
        out = {}
        print(f'{repo}: {len(pairs)} queries embedded, {time.time() - t:.0f} s', flush=True)
        for i, (p, q) in enumerate(zip(pairs, qv)):
            pool = torch.from_numpy(pools[f'pool_{p["pool"]}']).cuda()
            qt = torch.from_numpy(q).cuda().half()
            s = Et[pool] @ qt
            sp_ = float(Et[p['pos']] @ qt)
            other = torch.tensor([paths[int(j)] != p['pos_path'] for j in pools[f'pool_{p["pool"]}']], device='cuda')
            out[p['pid']] = int(1 + ((s > sp_) & other).sum())
            if (i + 1) % 5000 == 0:
                print(f'{repo}: {i + 1} of {len(pairs)} pairs ranked, {time.time() - t:.0f} s', flush=True)
        json.dump(out, open(f'{d}/rank_{a.tag}.json', 'w'))
        r = np.array(list(out.values()))
        print(f'{repo} {a.tag}: pairs {len(r)}, rank<=100: {np.mean(r <= 100):.3f}, median {np.median(r):.0f}, {time.time() - t:.0f} s', flush=True)
        del Et
        torch.cuda.empty_cache()
    open(f'{U.OUT}/gpu.peak', 'w').write(f'PEAK_CUDA {torch.cuda.max_memory_allocated() / 2**30:.2f} GiB\n')


if __name__ == '__main__':
    main()
