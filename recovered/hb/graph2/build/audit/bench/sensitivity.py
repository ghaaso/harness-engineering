# Sensitivity of the "differences that hold" verdicts (timing audit).
# Variant A: drop the 6 kept-and-flagged blocks. Variant B: drop the frozen seeds whose answer is empty.
# Variant C: both. Variant D: count LadybugDB's facts load in its cold time (other engines load none).
# Rule as in isummary.js (same direction in wall and CPU; |difference| larger than both engines' spreads).
import json, os, glob, math, collections
HERE = os.path.dirname(os.path.abspath(__file__))
IB = os.path.normpath(os.path.join(HERE, '..', '..', 'results', 'bench', 'interleaved'))
ENG = ['relational', 'ladybug', 'duckpgq']
units = [json.load(open(p, encoding='utf-8')) for p in sorted(glob.glob(os.path.join(IB, 'units', 'p*-*.json')))]
engines = json.load(open(os.path.join(IB, 'engines.json'), encoding='utf-8'))

def med(a):
    a = sorted(a); n = len(a)
    return None if not n else (a[n // 2] if n % 2 else (a[n // 2 - 1] + a[n // 2]) / 2)
def p95(a):
    a = sorted(a); return a[min(len(a) - 1, max(0, math.ceil(0.95 * len(a)) - 1))] if a else None

empty = set()
for u in units:
    if u['graph'] != 'frozen': continue
    for b in u['blocks']:
        if b['spec']['type'] == 'warm' and b['spec']['cls'] in ('primary', 'S1', 'base', 'S2'):
            for it in b['res']['items']:
                if it['hash'].get('n') == 0: empty.add(it['i'])

def pv(u, e, cls, s, drop_flag, drop_empty, facts):
    T = 1 if s == 'one' else (u['best_threads'].get(e) or {}).get(cls)
    if T is None: return None
    ok = lambda b: b['spec']['engine'] == e and b['spec']['cls'] == cls and b['spec']['T'] == T and not (drop_flag and b['flagged'])
    wb = [b for b in u['blocks'] if b['spec']['type'] == 'warm' and ok(b)]
    if not wb: return None
    de = drop_empty and u['graph'] == 'frozen' and cls != 'tq'
    its = [it for b in wb for it in b['res']['items'] if not (de and it['i'] in empty)]
    cr = [r for b in u['blocks'] if b['spec']['type'] == 'cold' and ok(b) for r in b['res']['rows'] if not (de and r['i'] in empty)]
    ww = [med(it['warm_ms']) for it in its]; wc = [med(it['warm_cpu_ms']) for it in its]
    add = (lambda r: r.get('facts_load_ms') or 0) if facts else (lambda r: 0)
    return {'warm': (med(ww), med(wc)), 'warm_p95': (p95(ww), p95(wc)),
            'uncached': (med([it['unc_ms'] for it in its]), med([it['unc_cpu_ms'] for it in its])),
            'cold': (med([r['cold_ms'] + add(r) for r in cr]), med([r['cold_cpu_ms'] for r in cr])) if cr else (None, None)}

def acr(vals, k):
    w = [v[k][0] for v in vals if v[k][0] is not None]; c = [v[k][1] for v in vals if v[k][1] is not None]
    if not w: return None
    return {'wall': med(w), 'ws': max(w) - min(w), 'cpu': med(c), 'cs': max(c) - min(c)}

def holds(A, B, wall_only=False):
    dW = A['wall'] - B['wall']; dC = A['cpu'] - B['cpu']
    if wall_only: return abs(dW) > max(A['ws'], B['ws'])
    return (dW > 0) == (dC > 0) and abs(dW) > max(A['ws'], B['ws']) and abs(dC) > max(A['cs'], B['cs'])

MEAS = [('warm', 'warm median'), ('warm_p95', 'warm p95'), ('uncached', 'warm, application caches dropped'), ('cold', 'cold (open + first call)')]
def verdicts(drop_flag, drop_empty, facts):
    out = {}
    for g, cl in {'tune': ['primary', 'S1', 'base'], 'frozen': ['primary', 'S1', 'base', 'tq']}.items():
        us = [u for u in units if u['graph'] == g]
        for cls in cl:
            for s in ['one', 'best']:
                R = {}
                for e in ENG:
                    vals = [v for v in (pv(u, e, cls, s, drop_flag, drop_empty, facts) for u in us) if v]
                    if vals: R[e] = {k: acr(vals, k) for k, _ in MEAS}
                for i in range(3):
                    for j in range(i + 1, 3):
                        a, b = ENG[i], ENG[j]
                        if a not in R or b not in R: continue
                        for k, t in MEAS:
                            A, B = R[a][k], R[b][k]
                            if not A or not B: continue
                            what = f"{g}/{cls} {'1 thread' if s == 'one' else 'best threads'} {t}"
                            # for the facts variant the CPU column is not changed (facts CPU not recorded per row), so judge wall only
                            h = holds(A, B, wall_only=(facts and k == 'cold' and 'ladybug' in (a, b)))
                            out[(what, a, b)] = {'holds': h, 'lower': a if A['wall'] < B['wall'] else b, 'wall_diff': round(A['wall'] - B['wall'], 3)}
    return out

base = {(x['what'], x['a'], x['b']): x['holds'] for x in engines['differences_that_hold'] + engines['differences_within_noise']}
res = {'frozen_seeds_with_empty_answer': len(empty)}
for name, args in (('A_drop_flagged_blocks', (True, False, False)), ('B_drop_empty_frozen_seeds', (False, True, False)),
                   ('C_both', (True, True, False)), ('D_ladybug_cold_includes_facts_load', (False, False, True))):
    v = verdicts(*args)
    ch = []
    for k, h in base.items():
        if k in v and v[k]['holds'] != h:
            ch.append(f"{k[0]} {k[1]}-{k[2]}: listed holds={h}, variant holds={v[k]['holds']} (lower: {v[k]['lower']}, wall diff {v[k]['wall_diff']} ms)")
        elif k in v and h and v[k]['holds']:
            pass
    flips = [f"{k[0]} {k[1]}-{k[2]}: lower engine now {v[k]['lower']} (wall diff {v[k]['wall_diff']} ms), holds={v[k]['holds']}" for k in base if k in v and 'cold' in k[0] and name.startswith('D') and 'ladybug' in k[1:]]
    res[name] = {'verdict_changes': ch, 'count': len(ch)}
    if flips: res[name]['ladybug_cold_comparisons'] = flips
json.dump(res, open(os.path.join(HERE, 'sensitivity.json'), 'w', encoding='utf-8'), indent=1)
print(json.dumps(res, indent=1))
