"""T3 measurement 2 (row 3): plain counting restricted to the seed's last 19 / 31 neighbour events (DyGFormer's window),
tuning only. Scored with d4lib.per_commit; compared with counting (the card's best untrained arm per repository) and with U6's
best DyGFormer per repository (best setting x epoch on tuning, from the sweep's e*.json; in-sample). -> /t3/m2.json"""
import json, glob, os
import numpy as np
import d4lib as L

CH = json.load(open('/cardout/choices.json'))['best_untrained']
SW = '/t3/u6sweep'          # U6 sweep mounted read-only here


def counting(b, name):
    if name == 'PC': return L.arm_decay(b)
    if name == 'INV365': return L.arm_decay(b, 365, True)
    if name == 'RRF': return L.arm_rrf(b)
    raise ValueError(name)


def window_arms(R, b, ks=(19, 31)):
    """Events of commits[:hend], card pair rule, ALL files (as U6's stream); per seed the last k events in stream order."""
    gI, gJ, gC, gS = R.pairs()
    m = gC < b.hist_n
    I, J, C, Sz = gI[m], gJ[m], gC[m], gS[m]
    cts = np.array([c['ct'] for c in R.commits], dtype=np.int64)
    out = {('WIN%d' % k) + s: np.zeros((len(b.tasks), b.N), np.float32) for k in ks for s in ('', 'i')}
    lut = np.full(R.max_id + 1, -1, dtype=np.int64)
    for gid, n in b.idx.items(): lut[gid] = n
    cache = {}
    for r, (t, s, _) in enumerate(b.tasks):
        g = b.ids[s]
        if g not in cache:
            e = np.nonzero((I == g) | (J == g))[0]        # event order = stream order (commit order, then pair order)
            nb = np.where(I[e] == g, J[e], I[e])
            cache[g] = (e, nb)
        e, nb = cache[g]
        for k in ks:
            ee, nn = e[-k:], nb[-k:]
            loc = lut[nn]; ok = loc >= 0
            np.add.at(out['WIN%d' % k][r], loc[ok], 1.0)
            w = 0.5 ** ((b.cutoff - cts[C[ee]]) / (365 * 86400.0)) / Sz[ee]
            np.add.at(out['WIN%di' % k][r], loc[ok], w[ok])
    return out


def best_dygformer(repo):
    best = (-1, None, None)
    for kind in ('dygformer', 'bip-dygformer'):
        for f in glob.glob(os.path.join(SW, kind, repo, '*', 'e*.json')):
            j = json.load(open(f))
            if j['p10'] > best[0]:
                best = (j['p10'], f.split('/sweep/')[-1] if '/sweep/' in f else f, {int(c): v[0] for c, v in j['per_commit'].items()})
    return best


def main():
    pc = {}     # arm -> {(repo, commit): p10}
    info = {}
    for repo in L.REPOS:
        R = L.Repo(repo)
        for k in R.block_ids('tune'):
            b = R.block(k); assert b.split == 'tune'
            arms = {'COUNT': counting(b, CH[repo]), 'PC': L.arm_decay(b), 'INV365': L.arm_decay(b, 365, True)}
            arms.update(window_arms(R, b))
            for a, S in arms.items():
                for t, v in L.per_commit(b, S).items():
                    pc.setdefault(a, {})[(repo, t)] = v[0]
        p, f, d = best_dygformer(repo)
        info[repo] = dict(best_dygformer=f, p10=p)
        for t, v in d.items(): pc.setdefault('DYGF', {})[(repo, t)] = v
    res = {'info': info, 'mean': {}, 'diff': {}}
    for scope in L.REPOS + ['pooled']:
        keys = sorted(k for k in pc['COUNT'] if scope == 'pooled' or k[0] == scope)
        assert all(k in pc['DYGF'] for k in keys), scope
        for a in pc:
            res['mean']['%s|%s' % (a, scope)] = float(np.mean([pc[a][k] for k in keys]))
        for a in ('WIN19', 'WIN31', 'WIN19i', 'WIN31i', 'DYGF'):
            for ref in ('COUNT', 'DYGF'):
                if a != ref:
                    res['diff']['%s-%s|%s' % (a, ref, scope)] = L.bootstrap([pc[a][k] - pc[ref][k] for k in keys])
        res['n|' + scope] = len(keys)
    json.dump(res, open('/t3/m2.json', 'w'), indent=1)
    for k, v in res['mean'].items(): print('%-22s %.4f' % (k, v))
    for k, v in res['diff'].items(): print('%-28s %+.4f [%+.4f, %+.4f]' % ((k,) + tuple(v)))
    print(json.dumps(info))


if __name__ == '__main__':
    main()
