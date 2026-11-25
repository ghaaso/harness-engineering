"""Scoring and verdict. usage: evaluate.py tune [REPOS...] | test [REPOS...] | arms
tune: per-repository best untrained arm, learned arms alone, pairs vs triples, the fusion weight; writes out/choices.json.
test: frozen choices only; per-commit P@10 / recall@10, bootstrap against the best untrained arm; writes out/result-test.json.
Arm names: PC, DEC<hl>, INV, INV<hl>, TEXT, RRF; kge:<complex|rotate>:<pairs|triples>; burl:<pairs|triples>."""
import sys, os, json, itertools
import numpy as np
import d4lib as L

WEIGHTS = [0.25, 0.5, 1, 2, 4]
UNTRAINED = ['PC'] + ['DEC%d' % h for h in L.HALF_LIVES if h] + ['INV'] + ['INV%d' % h for h in L.HALF_LIVES if h] + ['TEXT', 'RRF']
cache_dir = os.path.join(L.OUT, 'cache'); os.makedirs(cache_dir, exist_ok=True)


def untrained_matrix(b, name):
    if name == 'PC':
        return L.arm_decay(b)
    if name == 'TEXT':
        return L.arm_text(b)
    if name == 'RRF':
        return L.arm_rrf(b)
    inv = name.startswith('INV')
    hl = int(name[3:]) if len(name) > 3 else None
    return L.arm_decay(b, hl, inv)


def learned_matrix(repo, b, name):
    p = name.split(':')
    if p[0] == 'kge':
        fp = os.path.join(L.OUT, 'kge', repo.name, p[2], p[1], '%d.npy' % b.k)
    else:
        fp = os.path.join(L.OUT, 'anyburl-scores', repo.name, p[1], '%d.npy' % b.k)
    return np.load(fp) if os.path.exists(fp) else None


def matrix(repo, b, name):
    return untrained_matrix(b, name) if ':' not in name else learned_matrix(repo, b, name)


def per_arm(repo, split, names):
    """{arm: {commit: (p10, r10)}}; an arm with a missing block is dropped."""
    out = {n: {} for n in names}; dead = set()
    for k in repo.block_ids(split):
        b = repo.block(k)
        if not len(b.tasks):
            continue
        for n in names:
            if n in dead:
                continue
            S = matrix(repo, b, n)
            if S is None:
                dead.add(n); continue
            for t, v in L.per_commit(b, S).items():
                out[n][(repo.name, t)] = v
    return {n: v for n, v in out.items() if n not in dead}


def fused(repo, split, base, learned, w):
    out = {}
    for k in repo.block_ids(split):
        b = repo.block(k)
        if not len(b.tasks):
            continue
        S = learned_matrix(repo, b, learned)
        if S is None:
            return None
        Ra = L.ranks_of(untrained_matrix(b, base), b.rnd, b.seeds)
        Rb = L.ranks_of(S, b.rnd, b.seeds)
        for t, v in L.per_commit(b, L.fuse(Ra, Rb, w)).items():
            out[(repo.name, t)] = v
    return out


def mean(d, i=0):
    return float(np.mean([v[i] for v in d.values()])) if d else float('nan')


def available_learned(repos):
    names = []
    for form in ('pairs', 'triples'):
        for kind in (('complex', 'rotate') if os.environ.get('D4_ROTATE') == '1' else ('complex',)):
            names.append('kge:%s:%s' % (kind, form))
        names.append('burl:%s' % form)
    ok = []
    for n in names:
        if all(learned_matrix(r, r.block(r.block_ids('tune')[0]), n) is not None for r in repos):
            ok.append(n)
    return ok


def tune(repos):
    ch = {'best_untrained': {}, 'tune': {}}
    allres = {}
    for r in repos:
        res = per_arm(r, 'tune', UNTRAINED)
        allres[r.name] = res
        best = max(res, key=lambda n: mean(res[n]))
        ch['best_untrained'][r.name] = best
        ch['tune'][r.name] = {n: mean(v) for n, v in res.items()}
        print(r.name, 'best untrained on tuning:', best, round(mean(res[best]), 4), 'PC', round(mean(res['PC']), 4))
    learned = available_learned(repos)
    ch['learned_available'] = learned
    for n in learned:
        for r in repos:
            res = per_arm(r, 'tune', [n])
            ch['tune'][r.name][n] = mean(res[n])
    # pairs vs triples: decided on FixFlow, complex alone, +0.01
    fx = ch['tune'].get('fixflow', {})
    dec = os.path.join(L.OUT, 'triples-decision.json')
    if os.path.exists(dec):
        ch['triples_chosen'] = json.load(open(dec))['triples_chosen']
    else:
        ch['triples_chosen'] = bool('kge:complex:triples' in fx and 'kge:complex:pairs' in fx and fx['kge:complex:triples'] >= fx['kge:complex:pairs'] + 0.01)
        if 'kge:complex:triples' in fx:   # only a run that saw FixFlow's two forms writes the decision
            json.dump({'triples_chosen': ch['triples_chosen'], 'fixflow': fx}, open(dec, 'w'))
    form = 'triples' if ch['triples_chosen'] else 'pairs'
    ch['form'] = form
    # one fusion weight: maximises mean pooled-over-repos tuning P@10 over the learned arms of the chosen form
    arms = [n for n in learned if n.endswith(form)]
    sc = {}
    for w in WEIGHTS:
        vals = []
        for n in arms:
            pool = {}
            for r in repos:
                f = fused(r, 'tune', ch['best_untrained'][r.name], n, w)
                if f:
                    pool.update(f)
            vals.append(mean(pool))
        sc[w] = float(np.mean(vals)) if vals else float('nan')
    ch['fusion_scores'] = {str(k): v for k, v in sc.items()}
    ch['fusion_weight'] = max(sc, key=lambda w: sc[w]) if arms else 1
    json.dump(ch, open(os.path.join(L.OUT, 'choices.json'), 'w'), indent=1)
    print(json.dumps(ch, indent=1))


def test(repos):
    ch = json.load(open(os.path.join(L.OUT, 'choices.json')))
    form, w = ch['form'], ch['fusion_weight']
    learned = [n for n in ch['learned_available'] if n.endswith(form)]
    rows = {}; per = {}
    for r in repos:
        base = ch['best_untrained'][r.name]
        names = sorted({base, 'PC', 'RRF', 'TEXT', 'DEC90'} | set(learned))
        res = per_arm(r, 'test', names)
        for n in learned:
            f = fused(r, 'test', base, n, w)
            if f:
                res['fused(%s+%s,w=%s)' % (base, n, w)] = f
        per[r.name] = (base, res)
    pooled = {}
    for r in repos:
        base, res = per[r.name]
        for n, v in res.items():
            key = n if (n in learned or n.startswith('fused') or n in ('PC', 'RRF', 'TEXT')) else 'BEST_UNTRAINED'
            if n == base:
                pooled.setdefault('BEST_UNTRAINED', {}).update(v)
            if key != 'BEST_UNTRAINED':
                pooled.setdefault(key.replace('(%s+' % base, '(BEST+'), {}).update(v)
    out = {'form': form, 'weight': w, 'repos': {}, 'pooled': {}, 'gate_bar': 0.02}

    def summarise(res, bestkey):
        rows = {}
        bu = res[bestkey]
        for n, v in res.items():
            common = sorted(set(v) & set(bu))
            d = [v[c][0] - bu[c][0] for c in common]
            m, lo, hi = L.bootstrap(d)
            rows[n] = dict(p10=mean({c: v[c] for c in common}), r10=mean({c: v[c] for c in common}, 1), n_commits=len(common),
                           vs_best_untrained=dict(diff=m, lo=lo, hi=hi, word=L.verdict_word(m, lo, hi)))
        return rows
    for r in repos:
        base, res = per[r.name]
        out['repos'][r.name] = dict(best_untrained=base, arms=summarise(res, base))
    if 'BEST_UNTRAINED' in pooled:
        out['pooled'] = summarise(pooled, 'BEST_UNTRAINED')
    json.dump(out, open(os.path.join(L.OUT, 'result-test.json'), 'w'), indent=1)
    print(json.dumps(out, indent=1))


if __name__ == '__main__':
    cmd = sys.argv[1]
    names = sys.argv[2:] or L.REPOS
    repos = [L.Repo(n) for n in names]
    {'tune': tune, 'test': test}[cmd](repos)
