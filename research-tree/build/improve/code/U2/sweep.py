"""Sweep for one model on the TUNING split only, one setting changed at a time (coordinate sweep, stage order below),
choose by tuning Acc@10 macro (mean of the three repositories' Acc@10), freeze.
Stages: lr (3 values) -> epochs 1/2 -> negatives 3/7 -> consistency filter on/off -> own repository / pooled data.
Each run trains from the START model and scores the 217 tuning queries with the card's dense procedure (u2lib.score_blocks).
usage: python sweep.py <tag> [--max-zulip N] [--stages lr,epochs,negs,filter,data] [--dry]   (card job)
writes /out/sweep/<tag>.json (every run), /out/models/<tag>/<key>.pt for the best run so far, /out/sweep/<tag>.frozen.json"""
import argparse, hashlib, json, os, random, sys, time
import numpy as np
import torch
import u2lib as U
import trainlib as T

LRS = {'swerank': [1e-5, 2e-5, 5e-5], 'qwen3': [5e-5, 1e-4, 2e-4]}
DEFAULT = dict(lr=None, epochs=1, negs=3, filt=True, data='pooled')
RANK_CUT = 100


def log(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)


def get_data(tag, repo, filt, max_n):
    ch, pairs = U.read_pairs(repo)
    if filt:
        rk = json.load(open(f'{U.OUT}/pairs/{repo}/rank_{tag}.json'))
        pairs = [p for p in pairs if rk[p['pid']] <= RANK_CUT]
    if max_n and len(pairs) > max_n:
        pairs = random.Random(3).sample(pairs, max_n)
    return ch, pairs


def baseline(tag, plans):
    m = T.to_eval(T.build_model(tag), tag)
    res = {}
    for r in U.REPOS:
        qids, M, paths = U.score_blocks(m, tag, r, ['tune'], plans[r])['tune']
        res[r] = U.tune_metrics(r, qids, M, paths)
    del m; torch.cuda.empty_cache()
    return res


def summarize(res):
    per = {r: dict(acc10=float(v[:, 0].mean()), p2=float(v[:, 1].mean()), n=len(v)) for r, v in res.items()}
    return dict(per_repo=per, macro_acc10=float(np.mean([p['acc10'] for p in per.values()])), macro_p2=float(np.mean([p['p2'] for p in per.values()])))


def run(tag, cfg, plans, max_zulip):
    t = time.time()
    data = {r: get_data(tag, r, cfg['filt'], max_zulip if r == 'zulip' else None) for r in U.REPOS}
    ex = {r: T.make_examples(data[r][1], data[r][0], cfg['negs']) for r in U.REPOS}
    res, states, info = {}, {}, {}
    groups = [('pooled', U.REPOS)] if cfg['data'] == 'pooled' else [(r, [r]) for r in U.REPOS]
    for key, repos in groups:
        exs = [e for r in repos for e in ex[r]]
        log(f'  train {key}: {len(exs)} examples')
        ckdir = f"{U.OUT}/ckpt/{tag}/" + hashlib.md5(json.dumps(cfg, sort_keys=True).encode()).hexdigest()[:10]
        os.makedirs(ckdir, exist_ok=True)
        dpath = f"{ckdir}/{key}.done.pt"
        if os.path.exists(dpath):                      # the training of this group finished before a shutdown
            d = torch.load(dpath, weights_only=False); st, inf = d["state"], d["info"]
            log(f"  {key}: training read back from {dpath}")
            m = T.build_model(tag, st)
        else:
            m, st, inf = T.train(tag, exs, cfg['lr'], cfg['epochs'], log=log, ckpt=f"{ckdir}/{key}.ckpt")
            torch.save(dict(state=st, info=inf), dpath + ".tmp"); os.replace(dpath + ".tmp", dpath)
            if os.path.exists(f"{ckdir}/{key}.ckpt"): os.remove(f"{ckdir}/{key}.ckpt")
        states[key] = st; info[key] = dict(inf, examples=len(exs))
        m = T.to_eval(m, tag)
        for r in repos:
            qids, M, paths = U.score_blocks(m, tag, r, ['tune'], plans[r])['tune']
            res[r] = U.tune_metrics(r, qids, M, paths)
        del m; torch.cuda.empty_cache()
    out = dict(cfg=cfg, **summarize(res), train=info, secs=time.time() - t)
    return out, states


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('tag'); ap.add_argument('--max-zulip', type=int, default=None)
    ap.add_argument('--stages', default='lr,epochs,negs,filter,data'); ap.add_argument('--dry', action='store_true')
    a = ap.parse_args()
    tag = a.tag
    os.makedirs(f'{U.OUT}/sweep', exist_ok=True); os.makedirs(f'{U.OUT}/models/{tag}', exist_ok=True)
    plans = {r: U.block_plan(r, ['tune']) for r in U.REPOS}
    sf = f'{U.OUT}/sweep/{tag}.json'
    runs = json.load(open(sf)) if os.path.exists(sf) else []
    done = {json.dumps(r['cfg'], sort_keys=True): r for r in runs}
    if 'baseline' not in done and not a.dry:
        b = summarize(baseline(tag, plans)); log('start model', json.dumps(b))
        runs.append(dict(cfg='baseline', **b)); done['baseline'] = runs[-1]
        json.dump(runs, open(sf, 'w'), indent=1)
    best = None

    def trial(cfg):
        nonlocal best
        k = json.dumps(cfg, sort_keys=True)
        if k not in done:
            log('RUN', k)
            r, states = run(tag, cfg, plans, a.max_zulip)
            runs.append(r); done[k] = r
            log(f'  -> macro Acc@10 {r["macro_acc10"]:.4f} P@2 {r["macro_p2"]:.4f}', json.dumps({x: round(v['acc10'], 3) for x, v in r['per_repo'].items()}))
            if best is None or r['macro_acc10'] > best[1]['macro_acc10']:
                for key, st in states.items():          # models first, then the record of the run: a shutdown between them re-runs the run
                    torch.save(st, f'{U.OUT}/models/{tag}/{key}.pt.tmp'); os.replace(f'{U.OUT}/models/{tag}/{key}.pt.tmp', f'{U.OUT}/models/{tag}/{key}.pt')
                best = (cfg, r)
                json.dump(dict(cfg=cfg, result=r), open(f'{U.OUT}/sweep/{tag}.best.json', 'w'), indent=1)
            json.dump(runs, open(sf, 'w'), indent=1)
        else:
            r = done[k]
            if best is None or r['macro_acc10'] > best[1]['macro_acc10']:
                best = (cfg, r)
        return done[k]

    cfg = dict(DEFAULT)
    stages = a.stages.split(',')
    # an interrupted sweep resumes: finished runs are read back, the models of the best run so far are on disk
    if 'lr' in stages:
        for lr in LRS[tag]:
            trial(dict(cfg, lr=lr))
        cfg['lr'] = best[0]['lr']
    else:
        cfg['lr'] = LRS[tag][1]
    for stage, key, alt in (('epochs', 'epochs', 2), ('negs', 'negs', 7), ('filter', 'filt', False), ('data', 'data', 'own')):
        if stage in stages:
            trial(dict(cfg, **{key: alt}))
            # keep the setting if it won against the current choice
            cur = done[json.dumps(cfg, sort_keys=True)]
            alt_r = done[json.dumps(dict(cfg, **{key: alt}), sort_keys=True)]
            if alt_r['macro_acc10'] > cur['macro_acc10']:
                cfg[key] = alt
    frozen = dict(tag=tag, cfg=cfg, result=done[json.dumps(cfg, sort_keys=True)], max_zulip=a.max_zulip)
    json.dump(frozen, open(f'{U.OUT}/sweep/{tag}.frozen.json', 'w'), indent=1)
    log('FROZEN', json.dumps(frozen['cfg']), frozen['result']['macro_acc10'])
    open(f'{U.OUT}/gpu.peak', 'w').write(f'PEAK_CUDA {torch.cuda.max_memory_allocated() / 2**30:.2f} GiB\n')


if __name__ == '__main__':
    main()
