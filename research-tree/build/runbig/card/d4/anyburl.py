"""AnyBURL 23-1x: prep (write per-block graph + queries + properties), score (read predictions into [T, N] matrices).
usage: anyburl.py prep REPO FORM SPLIT SECONDS THREADS | score REPO FORM SPLIT
Rules are learned on the block's history only. AnyBURL drops answers already true in the graph it applies to, which would
remove the known co-change partners (the main signal). So the rules are learned on relation co_a, their head relation is
renamed co_b (anyburl.sh), and the queries (seed, co_b, seed) are applied to a graph that has no co_b facts: nothing is
filtered, and a query carries no truth (the seed is never a candidate)."""
import sys, os, json, re
import numpy as np
import d4lib as L, kge

cmd, repo_name, form, split = sys.argv[1:5]
repo = L.Repo(repo_name)
base = os.path.join(L.OUT, 'anyburl', repo_name, form)


def name(i, nfiles):
    return ('f%d' % i) if i < nfiles else ('d%d' % i)


if cmd == 'prep':
    secs, thr = int(sys.argv[5]), int(sys.argv[6])
    for k in repo.block_ids(split):
        b = repo.block(k)
        if not len(b.tasks):
            continue
        d = os.path.join(base, str(k)); os.makedirs(d, exist_ok=True)
        tri, nent, nrel = kge.build_graph(b, form)
        rn = {0: 'co_a', 1: 'imports', 2: 'in_dir', 3: 'dir_parent'}
        with open(os.path.join(d, 'train.txt'), 'w') as f:
            for h, r, t in tri.tolist():
                f.write('%s\t%s\t%s\n' % (name(h, b.N), rn[r], name(t, b.N)))
        import shutil
        shutil.copy(os.path.join(d, 'train.txt'), os.path.join(d, 'apply-graph.txt'))
        seeds = sorted(set(b.seeds.tolist()))
        with open(os.path.join(d, 'test.txt'), 'w') as f:
            for s in seeds:
                f.write('f%d\tco_b\tf%d\n' % (s, s))
        open(os.path.join(d, 'learn.properties'), 'w').write(
            'PATH_TRAINING = /w/train.txt\nPATH_OUTPUT = /w/rules\nSNAPSHOTS_AT = %d\nWORKER_THREADS = %d\n' % (secs, thr))
        open(os.path.join(d, 'apply.properties'), 'w').write(
            'PATH_TRAINING = /w/apply-graph.txt\nPATH_TEST = /w/test.txt\nPATH_RULES = /w/rules-%d.head\nPATH_OUTPUT = /w/predictions\n'
            'TOP_K_OUTPUT = 300\nWORKER_THREADS = %d\n' % (secs, thr))
        json.dump({'secs': secs, 'threads': thr}, open(os.path.join(d, 'cfg.json'), 'w'))
        print('prep', repo_name, form, k, 'facts', len(tri), 'seeds', len(seeds), flush=True)
else:
    for k in repo.block_ids(split):
        b = repo.block(k)
        if not len(b.tasks):
            continue
        d = os.path.join(base, str(k)); secs = json.load(open(os.path.join(d, 'cfg.json')))['secs']
        pf = os.path.join(d, 'predictions-%d' % secs)
        if not os.path.exists(pf):
            cands = [x for x in os.listdir(d) if x.startswith('predictions')]
            pf = os.path.join(d, cands[0]) if cands else None
        S = np.zeros((len(b.seeds), b.N), dtype=np.float32)
        pred = {}
        if pf:
            lines = open(pf).read().split('\n'); i = 0
            while i < len(lines):
                m = re.match(r'^(\S+) (\S+) (\S+)$', lines[i])
                if m and i + 2 < len(lines) and lines[i + 1].startswith('Heads:'):
                    q = m.group(1); tl = lines[i + 2]
                    assert tl.startswith('Tails:')
                    parts = tl[len('Tails:'):].strip().split('\t'); sc = {}
                    for a, c in zip(parts[0::2], parts[1::2]):
                        if a.startswith('f'):
                            sc[int(a[1:])] = float(c)
                    pred[int(q[1:])] = sc; i += 3
                else:
                    i += 1
        for r, s in enumerate(b.seeds.tolist()):
            for a, c in pred.get(s, {}).items():
                S[r, a] = c
        os.makedirs(os.path.join(L.OUT, 'anyburl-scores', repo_name, form), exist_ok=True)
        np.save(os.path.join(L.OUT, 'anyburl-scores', repo_name, form, '%d.npy' % k), S)
        print('score', repo_name, form, k, 'seeds with predictions', len(pred), 'of', len(set(b.seeds.tolist())), flush=True)
