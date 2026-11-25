"""usage: kge_run.py select REPO FORM | run REPO FORM SPLIT [--max-blocks N]
select: grid on the repository's first tuning block, filtered MRR of 5 % held-out co-change pairs.
run: train each model type's chosen config on every block of SPLIT, save the seed rows [T, N]."""
import sys, os, json, time
import numpy as np
import d4lib as L, kge

cmd, repo_name, form = sys.argv[1], sys.argv[2], sys.argv[3]
repo = L.Repo(repo_name)
od = os.path.join(L.OUT, 'kge'); os.makedirs(od, exist_ok=True)
selp = os.path.join(od, 'select-%s-%s.json' % (repo_name, form))
EP = {'complex': 100, 'rotate': 60}
ROTATE = os.environ.get('D4_ROTATE', '0') == '1'   # off since the 2026-11-24 correction (RotatE learning rate not in the paper)
GRID = [('complex', d, w) for d in (512, 1000, 2000) for w in (0.05, 0.1)] + ([('rotate', d, 0.0) for d in (512, 1000, 2000)] if ROTATE else [])


def log(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)


if cmd == 'select':
    ks = repo.block_ids('tune'); b = repo.block(ks[0])
    tri, nent, nrel = kge.build_graph(b, form)
    trn, val = kge.split_valid(tri)
    log(repo_name, form, 'block', ks[0], 'files', b.N, 'entities', nent, 'facts', len(tri), 'train', len(trn), 'valid queries', len(val))
    res = json.load(open(selp)) if os.path.exists(selp) else {}
    res.pop('_chosen', None)

    def cx_best_n3():
        c = [(i['valid_mrr'], i['n3']) for i in res.values() if i['kind'] == 'complex']
        return max(c)[1]

    def run_grid(entries):
        for kind, d, w in entries:
            key = '%s-%d-%s' % (kind, d, w)
            if key in res:
                continue
            log('grid', key)
            m, info = kge.train(kind, trn, nent, nrel, d, n3=w, epochs=EP[kind], valid=val, nfiles=b.N, log=log)
            res[key] = info; log(key, 'valid MRR', info['valid_mrr'], 'epochs', info['epochs'], 'wall s', round(info['wall_s']), 'gpu MB', round(info['peak_gpu_mb']))
            del m
            json.dump(res, open(selp, 'w'), indent=1)
    run_grid(GRID)
    # 2026-11-24 correction: the N3 grid was at its edge (0.05); extend one step down, and to 0.01 only if 0.025 wins
    run_grid([('complex', d, 0.025) for d in (512, 1000, 2000)])
    if cx_best_n3() == 0.025:
        run_grid([('complex', d, 0.01) for d in (512, 1000, 2000)])
    best = {}
    for key, i in res.items():
        if i['kind'] == 'rotate' and not ROTATE:
            continue
        if i['kind'] not in best or i['valid_mrr'] > res[best[i['kind']]]['valid_mrr']:
            best[i['kind']] = key
    res['_chosen'] = best
    json.dump(res, open(selp, 'w'), indent=1)
    log('chosen', best)
else:
    split = sys.argv[4]
    mx = int(sys.argv[sys.argv.index('--max-blocks') + 1]) if '--max-blocks' in sys.argv else 10**9
    sel = json.load(open(selp)); chosen = sel['_chosen']
    for k in repo.block_ids(split)[:mx]:
        b = repo.block(k)
        if not len(b.tasks):
            continue
        tri, nent, nrel = kge.build_graph(b, form)
        for kind, key in chosen.items():
            p = os.path.join(od, repo_name, form, kind); os.makedirs(p, exist_ok=True)
            fp = os.path.join(p, '%d.npy' % k)
            if os.path.exists(fp):
                continue
            c = sel[key]
            m, info = kge.train(kind, tri, nent, nrel, c['d'], n3=c['n3'], epochs=max(5, c['epochs']), seed=0, nfiles=b.N)
            np.save(fp, kge.seed_rows(m, b.seeds, b.N))
            log(repo_name, form, split, 'block', k, kind, key, 'facts', len(tri), 'wall s', round(info['wall_s'], 1), 'gpu MB', round(info['peak_gpu_mb']))
            del m
