"""Parallel-throughput summary and ruling-37 projections with the card's timing (task 5).
Throughput of k processes started together = sum of their epochs / the slowest one's training wall; speedup =
that / the k=1 throughput of the same (arm, config, threads). Then proj.py --gpu for lanes 1 and for the best
measured speedup. Writes gpu/parallel.json, gpu/stride-gpu-lanes1.json, gpu/stride-gpu-best.json."""
import os, sys, json, glob, subprocess, collections
HERE = os.path.dirname(os.path.abspath(__file__))
TRAIN = '/w/train'
G = collections.defaultdict(dict)
for f in glob.glob(os.path.join(HERE, 'timing', '*-L-par*.json')):
    j = json.load(open(f)); tag = j['key'].split('-L-')[1]           # par<k>[t<thr>]-<i>
    kpart, i = tag.rsplit('-', 1); k = int(kpart[3]); thr = kpart[4:] or 'default'
    G[(j['arm'], j['config_id'], thr)].setdefault(k, []).append(j)
res = {}
for (arm, cid, thr), byk in sorted(G.items()):
    base = None; row = {}
    for k in sorted(byk):
        js = byk[k]
        if len(js) != k: continue
        agg = sum(j['epochs'] for j in js) / max(j['train_wall_s'] for j in js)
        if k == 1: base = agg
        row[k] = dict(procs=k, s_per_epoch_each=[round(j['s_per_epoch'], 3) for j in js], epochs_per_s_total=round(agg, 3),
                      speedup_vs_1=round(agg / base, 3) if base else None, peak_rss_mb_each=[round(j['peak_rss_mb']) for j in js],
                      card_used_mb_max=max(j['card_used_mb_max'] or 0 for j in js))
    res['%s/%s/threads=%s' % (arm, cid, thr)] = row
json.dump(res, open(os.path.join(HERE, 'parallel.json'), 'w'), indent=1)
print(json.dumps(res, indent=1))
best = max([r[k]['speedup_vs_1'] for key, r in res.items() if 'threads=default' in key for k in r if r[k]['speedup_vs_1']] or [1.0])
# the conservative lane count: the smallest default-thread speedup at that k across arms
ks = {}
for key, r in res.items():
    if 'threads=default' not in key: continue
    for k, v in r.items():
        if v['speedup_vs_1']: ks.setdefault(k, []).append(v['speedup_vs_1'])
kbest = max(ks, key=lambda k: min(ks[k])) if ks else 1
lanes = round(min(ks.get(kbest, [1.0])), 2)
json.dump(dict(k=kbest, lanes=lanes, by_k={k: min(v) for k, v in ks.items()}), open(os.path.join(HERE, 'lanes.json'), 'w'), indent=1)
for name, ln in (('lanes1', 1.0), ('best', lanes)):
    subprocess.check_call([sys.executable, os.path.join(TRAIN, 'proj.py'), '--gpu', os.path.join(HERE, 'timing'), '--lanes', str(ln),
                           '--out', os.path.join(HERE, 'stride-gpu-%s.json' % name)], stdout=subprocess.DEVNULL)
print('lanes', kbest, lanes)
