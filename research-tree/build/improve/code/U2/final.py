"""Frozen models -> dense score matrices for the tuning and held-out blocks (never the training blocks: the models saw
those queries), A5's held-out ranking files (not scored), tuning Acc@10 per repository.
usage: python final.py <tag>   (card job)   reads /out/sweep/<tag>.frozen.json and /out/models/<tag>/*.pt
writes /out/final/<repo>/dense_<tag>ft.npz ('tune', 'tune_qids', 'heldout', 'heldout_qids'),
       /out/heldout/<repo>/rank_a5_<tag>ft.jsonl (top 300 files per query, the card's rank file format),
       /out/final/<tag>.json (tuning scores)"""
import json, os, sys
import numpy as np
import torch
import u2lib as U
import trainlib as T

BLOCKS = ['tune', 'heldout']


def main():
    tag = sys.argv[1]
    fr = json.load(open(f'{U.OUT}/sweep/{tag}.frozen.json'))
    cfg = fr['cfg']
    res = {}
    groups = [('pooled', U.REPOS)] if cfg['data'] == 'pooled' else [(r, [r]) for r in U.REPOS]
    for key, repos in groups:
        st = torch.load(f'{U.OUT}/models/{tag}/{key}.pt')
        m = T.to_eval(T.build_model(tag, st), tag)
        for r in repos:
            out = U.score_blocks(m, tag, r, BLOCKS)
            os.makedirs(f'{U.OUT}/final/{r}', exist_ok=True); os.makedirs(f'{U.OUT}/heldout/{r}', exist_ok=True)
            np.savez_compressed(f'{U.OUT}/final/{r}/dense_{tag}ft.npz', tune=out['tune'][1], tune_qids=np.array(out['tune'][0]),
                                heldout=out['heldout'][1], heldout_qids=np.array(out['heldout'][0]),
                                tune_paths=np.array(out['tune'][2]), heldout_paths=np.array(out['heldout'][2]))
            qids, M, paths = out['heldout']
            with open(f'{U.OUT}/heldout/{r}/rank_a5_{tag}ft.jsonl', 'w') as f:
                for qid, row in zip(qids, M):
                    top = np.argsort(-row, kind='stable')[:300]
                    f.write(json.dumps(dict(qid=qid, scores=[[paths[j], float(row[j])] for j in top])) + '\n')
            q2, M2, p2 = out['tune']
            res[r] = U.tune_metrics(r, q2, M2, p2)
        del m; torch.cuda.empty_cache()
    per = {r: dict(acc10=float(v[:, 0].mean()), p2=float(v[:, 1].mean()), n=len(v)) for r, v in res.items()}
    summ = dict(tag=tag, cfg=cfg, per_repo=per, macro_acc10=float(np.mean([p['acc10'] for p in per.values()])),
                macro_p2=float(np.mean([p['p2'] for p in per.values()])))
    json.dump(summ, open(f'{U.OUT}/final/{tag}.json', 'w'), indent=1)
    print(json.dumps(summ), flush=True)
    open(f'{U.OUT}/gpu.peak', 'w').write(f'PEAK_CUDA {torch.cuda.max_memory_allocated() / 2**30:.2f} GiB\n')


if __name__ == '__main__':
    main()
