"""Stride s for stage B (addendum 8 item 16, ruling 33), from timing only.
Stage B per arm = 3 configs x 3 seeds x every tune checkpoint; at most two containers in parallel.
Per-run time on a checkpoint graph = seconds/epoch (linear in its triple count between the two measured
graphs of timing.json, extrapolated linearly outside) x epochs. Two epoch assumptions are projected:
  worst = each arm's max_epochs (no early stop);  typical = given on the command line per arm (e.g. the
  stage-A median of epochs run; None until stage A has run).
s = the smallest of 1, 3, 6, 10 whose WORST-case projection is under 30 h (if none is, the smallest whose
typical projection is, and the run log says so). Writes train/stride.json.
usage: python proj.py [E1=epochs E2=epochs ...]"""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'export'))
import checkpoints as ck

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
T = json.load(open(os.path.join(HERE, 'timing.json'))) if os.path.exists(os.path.join(HERE, 'timing.json')) else {}
cfgs = json.load(open(os.path.join(HERE, 'stageA_configs.json')))
typical = {a.split("=")[0]: float(a.split("=")[1]) for a in sys.argv[1:]} if __name__ == "__main__" else {}
MAXEP = dict(E1=400, E2=200, E3=400, E4=150, E5=400)
P = ck.load_parents()


def ntri(sha):
    return json.load(open(os.path.join(ROOT, 'export', 'graphs0', sha, 'sizes.json')))['triples']


def sec_per_epoch(arm, n):
    k = [k for k in T if k.startswith(arm + '/')]
    a = T[[x for x in k if '/stageA' in x][0]]; b = T[[x for x in k if '/largest_tune' in x][0]]
    x0, y0, x1, y1 = a['train_triples'], a['s_per_epoch'], b['train_triples'], b['s_per_epoch']
    return max(y0 + (y1 - y0) * (n - x0) / (x1 - x0), 0.05)


def interp(n, a, b):
    """a, b = (train_triples, s_per_epoch) at two graphs; linear in triples, floored at 0.05 s."""
    return max(a[1] + (b[1] - a[1]) * (n - a[0]) / (b[0] - a[0]), 0.05)


def project_selected(sel, seeds=3, limit_h=30.0):
    """Ruling 37: sel = [(arm, cid, epochs, (triplesA, speA), (triplesL, speL))] for the selected
    configurations, each timed at its own settings. Per tune checkpoint c of stride s: seeds x epochs x
    s/epoch(triples(c)); summed over configs and arms; two containers. Returns (s, table): s = smallest of
    1, 3, 6, 10 with wall hours < limit_h, else 10 (ruling 37)."""
    table = {}
    for s in (1, 3, 6, 10):
        cps, added = ck.checkpoints_r33('tune', s, P)
        per = {}
        for arm, cid, ep, a, b in sel:
            h = sum(seeds * ep * interp(ntri(c), a, b) for c in cps) / 3600.0
            per[arm] = per.get(arm, 0.0) + h
        table[s] = dict(tune_checkpoints=len(cps), ruling33_added=len(added),
                        per_arm_cpu_hours={k: round(v, 2) for k, v in per.items()},
                        wall_hours_2_containers=round(sum(per.values()) / 2, 2))
    ok = [s for s in (1, 3, 6, 10) if table[s]['wall_hours_2_containers'] < limit_h]
    return (ok[0] if ok else 10), table


def _main():

    out = dict(per_s={}, rule='smallest s in 1,3,6,10 with worst-case stage-B projection < 30 h on 2 containers')
    for s in (1, 3, 6, 10):
        row = {}
        for split in ('tune', 'heldout'):
            cps, added = ck.checkpoints_r33(split, s, P)
            row[split] = dict(checkpoints=len(cps), ruling33_added=len(added), triples=sum(ntri(c) for c in cps))
        cps, _ = ck.checkpoints_r33('tune', s, P)
        for mode in ('worst', 'typical'):
            tot = 0.0; per = {}
            for arm in MAXEP:
                ep = MAXEP[arm] if mode == 'worst' else typical.get(arm)
                if ep is None: per = None; break
                h = sum(9 * ep * sec_per_epoch(arm, ntri(c)) for c in cps) / 3600.0
                per[arm] = round(h, 1); tot += h
            row['stageB_hours_' + mode] = None if per is None else dict(per_arm_cpu_hours=per, wall_hours_2_containers=round(tot / 2, 1))
        out['per_s'][s] = row
    ok = [s for s in (1, 3, 6, 10) if out['per_s'][s]['stageB_hours_worst']['wall_hours_2_containers'] < 30]
    okt = [s for s in (1, 3, 6, 10) if out['per_s'][s]['stageB_hours_typical'] and out['per_s'][s]['stageB_hours_typical']['wall_hours_2_containers'] < 30]
    out['s_worst'] = ok[0] if ok else None
    out['s_typical'] = okt[0] if okt else None
    json.dump(out, open(os.path.join(HERE, 'stride.json'), 'w'), indent=1)
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    _main()
