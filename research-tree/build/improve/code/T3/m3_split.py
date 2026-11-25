"""T3 measurement 3 (row 17): split-half selection from per-commit tuning scores on disk. 1,000 splits, each repository's tuning
commits halved at random; choose on half A by the unit's own rule, score on half B. -> /t3/m3.json
Families: U5 (22 runs, best-epoch per-commit scores; pooled choice), U6 (per kind x stream: per repository best epoch, setting by
pooled mean, as select_cfg.py; and the best of all four), T2 FUSED weight (per repository from 9), and, when /t3/m1/trees.json
exists, B2 and B2+DIFF tree counts (per repository, every 10 trees)."""
import glob, json, os, sys
import numpy as np
import pandas as pd
import d4lib as L
import u4lib as U

NS = 1000
CH = json.load(open('/cardout/choices.json'))['best_untrained']


def counting_pc():
    pc = {}
    for repo in L.REPOS:
        ch = CH[repo]
        for f in sorted(glob.glob(os.path.join('/u4', 'tables', repo, 'tune', '*.csv.gz'))):
            df = pd.read_csv(f, usecols=['commit', 'task', 'tie', 'label', ch])
            for t, v in U.per_commit_table(df['commit'].values, df['task'].values, df[ch].values, df['tie'].values, df['label'].values).items():
                pc[(repo, int(t))] = v[0]
    return pc


def u5_options():
    ch = json.load(open('/u5/choice.json'))
    opts = {}
    for name, *_ in ch['runs']:
        j = json.load(open('/u5/runs/%s.json' % name))
        opts[name] = {(r, int(t)): v[0] for r, d in j['per_commit'].items() for t, v in d.items()}
    return opts


def u6_options():
    R = {}
    for f in glob.glob('/t3/u6sweep/*/*/*/e*.json'):
        d = json.load(open(f))
        R.setdefault((d['kind'], d.get('stream', 'pair')), {}).setdefault((d['nbr'], d['lr']), {}).setdefault(d['repo'], {})[d['epoch']] = \
            {(d['repo'], int(t)): v[0] for t, v in d['per_commit'].items()}
    return R


def mean(d, keys):
    return float(np.mean([d[k] for k in keys]))


def splits(keys, rng):
    A = []
    for repo in L.REPOS:
        ks = [k for k in keys if k[0] == repo]
        p = rng.permutation(len(ks)); A += [ks[i] for i in p[:len(ks) // 2]]
    A = set(A)
    return sorted(A), sorted(set(keys) - A)


def pick_pooled(opts, keys):           # opts: name -> {key: p10}; pooled mean over keys
    return max(opts, key=lambda n: (mean(opts[n], keys), n))


def pick_per_repo(opts_by_repo, keys):  # opts_by_repo: repo -> name -> {key: p10}; returns {key: p10} of the per-repo choices
    out = {}
    for repo, opts in opts_by_repo.items():
        kr = [k for k in keys if k[0] == repo]
        out[repo] = max(opts, key=lambda n: (mean(opts[n], kr), str(n)))
    return out


def u6_pick(cfgs, keys):
    """select_cfg rule: per config, per repository best epoch on keys; config by pooled mean over keys."""
    best = None
    for cfg, byrepo in cfgs.items():
        if set(byrepo) != set(L.REPOS):
            continue
        comb = {}
        for repo, eps in byrepo.items():
            kr = [k for k in keys if k[0] == repo]
            e = max(eps, key=lambda e: (mean(eps[e], kr), -e))
            comb.update({k: v for k, v in eps[e].items()})
        m = mean(comb, keys)
        if best is None or m > best[0]:
            best = (m, cfg, comb)
    return best[2], best[1]


def run_family(name, choose, ref, keys, rng):
    """choose(keys) -> {key: p10} of the option chosen on those keys. ref: {key: p10}."""
    full = choose(keys)
    ins = mean(full, keys) - mean(ref, keys)
    oos, opt = [], []
    for _ in range(NS):
        A, B = splits(keys, rng)
        c = choose(A)
        oos.append(mean(c, B) - mean(ref, B)); opt.append(mean(c, A) - mean(c, B))
    oos, opt = np.array(oos), np.array(opt)
    r = dict(in_sample_gain=ins, chosen_full=mean(full, keys), ref_full=mean(ref, keys), oos_gain=float(oos.mean()),
             oos_lo=float(np.percentile(oos, 2.5)), oos_hi=float(np.percentile(oos, 97.5)), optimism=float(opt.mean()),
             share_kept=float(oos.mean() / ins) if ins else None, n=len(keys))
    print('%-28s in-sample %+.4f  out-of-sample %+.4f [%+.4f, %+.4f]  optimism %+.4f  kept %s' % (
        name, ins, r['oos_gain'], r['oos_lo'], r['oos_hi'], r['optimism'], None if r['share_kept'] is None else '%.2f' % r['share_kept']), flush=True)
    return r


def run_pair(name, cx, cy, keys, rng):
    """both sides chosen on A by their own rule; gain x - y."""
    fx, fy = cx(keys), cy(keys)
    ins = mean(fx, keys) - mean(fy, keys)
    oos = []
    for _ in range(NS):
        A, B = splits(keys, rng)
        a, b = cx(A), cy(A)
        oos.append(mean(a, B) - mean(b, B))
    oos = np.array(oos)
    r = dict(in_sample_gain=ins, oos_gain=float(oos.mean()), oos_lo=float(np.percentile(oos, 2.5)), oos_hi=float(np.percentile(oos, 97.5)),
             share_kept=float(oos.mean() / ins) if ins else None, n=len(keys))
    print('%-28s in-sample %+.4f  out-of-sample %+.4f [%+.4f, %+.4f]  kept %.2f' % (name, ins, r['oos_gain'], r['oos_lo'], r['oos_hi'], r['share_kept']), flush=True)
    return r


def main():
    rng = np.random.default_rng(20261125)
    cnt = counting_pc(); keys = sorted(cnt)
    assert len(keys) == 260
    res = {}
    u5 = u5_options()
    ONLY = os.environ.get('M3_ONLY_T2') == '1'
    if not ONLY:
        res['U5'] = run_family('U5 (22 runs, pooled)', lambda K: u5[pick_pooled(u5, K)], cnt, keys, rng)
    u6 = u6_options() if not ONLY else {}
    for fam, cfgs in sorted(u6.items()):
        res['U6 %s/%s' % fam] = run_family('U6 %s/%s' % fam, lambda K, c=cfgs: u6_pick(c, K)[0], cnt, keys, rng)
    def u6_all(K):
        best = None
        for fam, cfgs in u6.items():
            comb, _ = u6_pick(cfgs, K); m = mean(comb, K)
            if best is None or m > best[0]: best = (m, comb)
        return best[1]
    if not ONLY:
        res['U6 best of four'] = run_family('U6 best of four', u6_all, cnt, keys, rng)
    if os.path.exists('/t3/m1/fused_w.json'):
        fw = json.load(open('/t3/m1/fused_w.json'))        # tag -> repo -> w -> {commit: p10}
        for tag, byrepo in fw.items():
            opts = {r: {w: {(r, int(t)): v for t, v in d.items()} for w, d in ws.items()} for r, ws in byrepo.items()}
            def ch(K, o=opts):
                p = pick_per_repo(o, K); out = {}
                for r, w in p.items(): out.update(o[r][w])
                return out
            res['FUSED w ' + tag] = run_family('FUSED weight ' + tag, ch, cnt, keys, rng)
    def curve_choice(tag):
        cj = json.load(open('/t3/m1/rank/%s/curve.json' % tag))
        opts = {r: {int(n): {(r, int(t)): v for t, v in d.items()} for n, d in ns.items()} for r, ns in cj.items()}
        def ch(K):
            p = pick_per_repo(opts, K); out = {}
            for r, n in p.items(): out.update(opts[r][n])
            return out
        return ch
    for x, y in (('B2D', 'B2'), ('B2Dm', 'B2')):
        if os.path.exists('/t3/m1/rank/%s/curve.json' % x) and os.path.exists('/t3/m1/rank/%s/curve.json' % y):
            cx, cy = curve_choice(x), curve_choice(y)
            res['trees %s-%s' % (x, y)] = run_pair('tree counts %s minus %s' % (x, y), cx, cy, keys, rng)
            res['trees %s-count' % x] = run_family('tree count %s vs counting' % x, cx, cnt, keys, rng)
    json.dump(res, open('/t3/m3_t2.json' if ONLY else '/t3/m3.json', 'w'), indent=1)


if __name__ == '__main__':
    main()
