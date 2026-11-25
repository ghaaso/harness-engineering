"""Pre-test 1 (surprise index) and graph sizes. usage: pretest.py [REPOS]"""
import sys, json, os
import numpy as np, scipy.sparse as sp
import d4lib as L
out = {}
for name in (sys.argv[1:] or L.REPOS):
    r = L.Repo(name); tot = hit_co = reach = 0; ntasks = 0
    for k in r.block_ids('tune'):
        b = r.block(k)
        if not len(b.tasks):
            continue
        W = b.W(); A, n = L.structural_graph(b); A = A.tocsr()
        A2 = (A @ A) + A
        for t, s, truth in b.tasks:
            ntasks += 1
            for f in truth:
                tot += 1
                if W[s, f] > 0:
                    hit_co += 1
                elif A2[s, f] > 0:
                    reach += 1
    sizes = {}
    last = r.block(r.block_ids()[-1])
    import kge
    for form in ('pairs', 'triples'):
        tri, nent, nrel = kge.build_graph(last, form)
        sizes[form] = dict(facts=len(tri), entities=nent)
    nfile = [len({i for i, st in c['ev'] if st in ('A', 'M')}) for c in r.commits]
    out[name] = dict(tune_tasks=ntasks, truth=tot, share_prior_cochange=hit_co / tot, share_reach_2hop_not_cochanged=reach / tot,
                     largest_graph=sizes, files_alive_last=last.N, commits=len(nfile),
                     commits_over_50_dropped=sum(x > 50 for x in nfile), commits_over_30=sum(x > 30 for x in nfile))
    print(name, json.dumps(out[name]), flush=True)
json.dump(out, open(os.path.join(L.OUT, 'pretest1.json'), 'w'), indent=1)
