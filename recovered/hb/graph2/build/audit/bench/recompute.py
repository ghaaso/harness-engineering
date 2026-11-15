# Independent recompute of the interleaved engine bench (timing audit).
# Reads results/bench/interleaved/{units/*.json, blocks.jsonl, host_load.jsonl, clock.jsonl, engines.json,
# summary.json, check.json, calibration.json}. Writes recompute.json next to this script. Changes nothing else.
import json, os, math, statistics, collections, glob, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
IB = os.path.normpath(os.path.join(HERE, '..', '..', 'results', 'bench', 'interleaved'))
ENG = ['relational', 'ladybug', 'duckpgq']
NAME = {'relational': 'SQLite', 'ladybug': 'LadybugDB', 'duckpgq': 'DuckDB+DuckPGQ'}

def load(f):
    with open(os.path.join(IB, f), encoding='utf-8') as fh:
        return json.load(fh)

def med(a):
    a = sorted(a)
    if not a: return None
    n = len(a); m = n // 2
    return a[m] if n % 2 else (a[m - 1] + a[m]) / 2

def p95(a):
    a = sorted(a)
    if not a: return None
    k = min(len(a) - 1, max(0, math.ceil(0.95 * len(a)) - 1))
    return a[k]

units = [json.load(open(p, encoding='utf-8')) for p in sorted(glob.glob(os.path.join(IB, 'units', 'p*-*.json')))]
engines = load('engines.json')
cal = load('calibration.json')
out = {'units': [u['unit'] for u in units]}

# ---------------------------------------------------------------- 1. per-pass values and table
def best(u, e, cls):
    return (u['best_threads'].get(e) or {}).get(cls)

def pass_values(u, e, cls, setting):
    T = 1 if setting == 'one' else best(u, e, cls)
    if T is None: return None
    wb = [b for b in u['blocks'] if b['spec']['type'] == 'warm' and b['spec']['engine'] == e and b['spec']['cls'] == cls and b['spec']['T'] == T]
    if not wb: return None
    items = []
    for b in wb:
        for it in b['res']['items']:
            items.append((it, b['res']['noop']))
    ww = [med(it['warm_ms']) for it, _ in items]
    wc = [med(it['warm_cpu_ms']) for it, _ in items]
    cb = [b for b in u['blocks'] if b['spec']['type'] == 'cold' and b['spec']['engine'] == e and b['spec']['cls'] == cls and b['spec']['T'] == T]
    cr = [r for b in cb for r in b['res']['rows']]
    def pm(f):
        v = [f(it, nz) for it, nz in items]
        v = [x for x in v if x is not None]
        return med(v)
    seeds = sorted(it['i'] for it, _ in items)
    return {
        'T': T,
        'warm': (med(ww), med(wc)), 'warm_p95': (p95(ww), p95(wc)),
        'uncached': (pm(lambda it, nz: it.get('unc_ms')), pm(lambda it, nz: it.get('unc_cpu_ms'))),
        'cold': (med([r['cold_ms'] for r in cr]), med([r['cold_cpu_ms'] for r in cr])) if cr else (None, None),
        'cold_open': (med([r['open_ms'] for r in cr]), med([r['open_cpu_ms'] for r in cr])) if cr else (None, None),
        'cold_facts_load': med([r.get('facts_load_ms') or 0 for r in cr]) if cr else None,
        'cold_client_load': med([r.get('client_load_ms') or 0 for r in cr]) if cr else None,
        'cold_plus_facts': (med([r['cold_ms'] + (r.get('facts_load_ms') or 0) for r in cr]), None) if cr else (None, None),
        'api': (pm(lambda it, nz: it.get('bd', {}).get('api_ms')), pm(lambda it, nz: it.get('bd', {}).get('api_cpu_ms'))),
        'app': (pm(lambda it, nz: it.get('bd', {}).get('app_ms')), pm(lambda it, nz: it.get('bd', {}).get('app_cpu_ms'))),
        'stmts': pm(lambda it, nz: it.get('bd', {}).get('stmts')),
        'empty_answers': sum(1 for it, _ in items if isinstance(it['hash'], dict) and it['hash'].get('n') == 0),
        'n_items': len(items), 'seed_ids': seeds, 'cold_n': len(cr),
        'cold_ids': sorted(r['i'] for r in cr),
    }

def across(vals, k):
    w = [v[k][0] for v in vals if v[k][0] is not None]
    c = [v[k][1] for v in vals if v[k][1] is not None]
    return {'wall': med(w), 'wall_spread': (max(w) - min(w)) if w else None, 'cpu': med(c) if c else None,
            'cpu_spread': (max(c) - min(c)) if c else None, 'wall_passes': w, 'cpu_passes': c}

classes = {'tune': ['primary', 'S1', 'base', 'S2'], 'frozen': ['primary', 'S1', 'base', 'S2', 'tq']}
rows = {}
for g, cl in classes.items():
    us = [u for u in units if u['graph'] == g]
    for cls in cl:
        for e in ENG:
            for s in ['one', 'best']:
                vals = [pass_values(u, e, cls, s) for u in us]
                vals = [v for v in vals if v]
                if not vals: continue
                r = {'T': sorted(set(v['T'] for v in vals)), 'passes': len(vals)}
                for k in ['warm', 'warm_p95', 'uncached', 'cold', 'cold_open', 'api', 'app', 'cold_plus_facts']:
                    r[k] = across(vals, k)
                r['cold_facts_load_median'] = med([v['cold_facts_load'] for v in vals if v['cold_facts_load'] is not None])
                r['stmts'] = med([v['stmts'] for v in vals if v['stmts'] is not None])
                r['empty_answers_per_pass'] = [v['empty_answers'] for v in vals]
                r['n_items_per_pass'] = [v['n_items'] for v in vals]
                r['same_seed_set_all_passes'] = len(set(tuple(v['seed_ids']) for v in vals)) == 1
                r['seed_ids_hash'] = hash(tuple(vals[0]['seed_ids'])) & 0xffffffff
                r['cold_ids_hash'] = hash(tuple(vals[0]['cold_ids'])) & 0xffffffff
                r['same_as_one'] = s == 'best' and all(t == 1 for t in r['T'])
                rows[(g, cls, e, s)] = r

# compare with engines.json table
KEYMAP = {'warm': ('warm_wall_p50_ms', 'warm_cpu_p50_ms'), 'warm_p95': ('warm_wall_p95_ms', 'warm_cpu_p95_ms'),
          'uncached': ('warm_uncached_wall_p50_ms', 'warm_uncached_cpu_p50_ms'), 'cold': ('cold_wall_ms', 'cold_cpu_ms'),
          'cold_open': ('cold_open_wall_ms', None), 'api': ('engine_api_wall_ms', None), 'app': ('app_code_wall_ms', 'app_code_cpu_ms')}
mism = []; checked = 0
for t in engines['table']:
    key = (t['graph'], t['query_class'], t['engine'], t['setting'])
    r = rows.get(key)
    if r is None:
        mism.append(f'{key}: no recomputed row'); continue
    for k, (wk, ck) in KEYMAP.items():
        for idx, jk in ((0, wk), (1, ck)):
            if jk is None or jk not in t: continue
            mine = r[k]['wall_passes' if idx == 0 else 'cpu_passes']
            theirs = t[jk]['per_pass']
            checked += 1
            if len(mine) != len(theirs) or any(abs(a - b) > 0.0015 for a, b in zip(mine, theirs)):
                mism.append(f'{key} {jk}: mine {[round(x,3) for x in mine]} theirs {theirs}')
            if abs(med(mine) - t[jk]['median_over_passes']) > 0.0015 or abs((max(mine) - min(mine)) - t[jk]['spread_between_passes']) > 0.003:
                mism.append(f'{key} {jk}: median/spread differ')
    if r['stmts'] is not None and abs(r['stmts'] - t['statements_per_ranking']) > 1e-6:
        mism.append(f'{key}: statements {r["stmts"]} vs {t["statements_per_ranking"]}')
out['table_check'] = {'rows_in_engines_json': len(engines['table']), 'rows_recomputed': len(rows), 'cells_checked': checked, 'mismatches': mism}

# stores: builds and updates
smism = []
for s in engines['stores']:
    g, e = s['graph'], s['engine']
    us = [u for u in units if u['graph'] == g]
    bw = [med([b['res']['build_ms'] for b in u['blocks'] if b['spec']['type'] == 'build' and b['spec']['engine'] == e]) for u in us]
    bc = [med([b['res']['build_cpu_ms'] for b in u['blocks'] if b['spec']['type'] == 'build' and b['spec']['engine'] == e]) for u in us]
    by = med([med([b['res']['bytes'] for b in u['blocks'] if b['spec']['type'] == 'build' and b['spec']['engine'] == e]) for u in us])
    uw = [med([r['total_ms'] for b in u['blocks'] if b['spec']['type'] == 'update' and b['spec']['engine'] == e for r in b['res']['rows']]) for u in us]
    uc = [med([r['total_cpu_ms'] for b in u['blocks'] if b['spec']['type'] == 'update' and b['spec']['engine'] == e for r in b['res']['rows']]) for u in us]
    for nm, mine, k in (('build wall', bw, 'build_wall_ms'), ('build cpu', bc, 'build_cpu_ms'), ('update wall', uw, 'update_one_file_wall_ms'), ('update cpu', uc, 'update_one_file_cpu_ms')):
        th = s[k]['per_pass']
        if any(abs(a - b) > 0.0015 for a, b in zip(mine, th)): smism.append(f'{g}/{e} {nm}: mine {mine} theirs {th}')
    if by != s['size_bytes']: smism.append(f'{g}/{e} bytes {by} vs {s["size_bytes"]}')
    rows[(g, 'build', e, 'default')] = {'build': {'wall': med(bw), 'wall_spread': max(bw) - min(bw), 'cpu': med(bc), 'cpu_spread': max(bc) - min(bc), 'wall_passes': bw, 'cpu_passes': bc}}
    rows[(g, 'update', e, 'default')] = {'update': {'wall': med(uw), 'wall_spread': max(uw) - min(uw), 'cpu': med(uc), 'cpu_spread': max(uc) - min(uc), 'wall_passes': uw, 'cpu_passes': uc}}
out['stores_check'] = {'mismatches': smism}

# ---------------------------------------------------------------- 4. differences, three rules
def compare(A, B):
    dW = A['wall'] - B['wall']; dC = A['cpu'] - B['cpu']
    same = (dW > 0) == (dC > 0) and dW != 0 and dC != 0
    big_max = abs(dW) > max(A['wall_spread'], B['wall_spread']) and abs(dC) > max(A['cpu_spread'], B['cpu_spread'])
    big_sum = abs(dW) > A['wall_spread'] + B['wall_spread'] and abs(dC) > A['cpu_spread'] + B['cpu_spread']
    # strictest: every pass value of the lower engine below every pass value of the other, in wall and CPU
    lo, hi = (A, B) if dW < 0 else (B, A)
    disjoint = max(lo['wall_passes']) < min(hi['wall_passes']) and max(lo['cpu_passes']) < min(hi['cpu_passes'])
    n = min(len(A['wall_passes']), len(B['wall_passes']))
    sgn = -1 if dW < 0 else 1
    agree = sum(1 for i in range(n) if (A['wall_passes'][i] - B['wall_passes'][i]) * sgn > 0 and (A['cpu_passes'][i] - B['cpu_passes'][i]) * sgn > 0)
    return {'wall_diff': dW, 'cpu_diff': dC, 'same_direction': same, 'holds_their_rule': same and big_max and n >= 2,
            'holds_sum_rule': same and big_sum, 'holds_disjoint_rule': same and disjoint, 'passes_agreeing': agree,
            'ratio_wall': (max(A['wall'], B['wall']) / min(A['wall'], B['wall'])) if min(A['wall'], B['wall']) > 0 else None}

MEAS = [('warm', 'warm median'), ('warm_p95', 'warm p95'), ('uncached', 'warm, application caches dropped'), ('cold', 'cold (open + first call)')]
mycomp = {}
for g, cl in classes.items():
    for cls in cl:
        for s in ['one', 'best']:
            for i in range(3):
                for j in range(i + 1, 3):
                    A = rows.get((g, cls, ENG[i], s)); B = rows.get((g, cls, ENG[j], s))
                    if not A or not B: continue
                    for k, t in MEAS:
                        if A[k]['wall'] is None or B[k]['wall'] is None: continue
                        what = f"{g}/{cls} {'1 thread' if s == 'one' else 'best threads'} {t}"
                        c = compare(A[k], B[k]); c.update({'what': what, 'a': ENG[i], 'b': ENG[j], 'measure': k, 'graph': g, 'cls': cls, 'setting': s,
                                                         'duplicate_of_1_thread_row': s == 'best' and A['same_as_one'] and B['same_as_one']})
                        mycomp[(what, ENG[i], ENG[j])] = c
for g in ['tune', 'frozen']:
    for kind, lab in (('build', 'store build'), ('update', 'one-file update')):
        for i in range(3):
            for j in range(i + 1, 3):
                A = rows[(g, kind, ENG[i], 'default')][kind]; B = rows[(g, kind, ENG[j], 'default')][kind]
                what = f'{g} {lab}'
                c = compare(A, B); c.update({'what': what, 'a': ENG[i], 'b': ENG[j], 'measure': kind, 'graph': g, 'cls': kind, 'setting': 'default', 'duplicate_of_1_thread_row': False})
                mycomp[(what, ENG[i], ENG[j])] = c

dm = []
theirs_all = [(x, True) for x in engines['differences_that_hold']] + [(x, False) for x in engines['differences_within_noise']]
for x, listed_hold in theirs_all:
    c = mycomp.get((x['what'], x['a'], x['b']))
    if not c: dm.append('not recomputed: ' + x['what']); continue
    if c['holds_their_rule'] != listed_hold: dm.append(f"verdict differs: {x['what']} {x['a']}-{x['b']}: listed {listed_hold}, mine {c['holds_their_rule']}")
    if abs(c['wall_diff'] - x['wall_diff_ms']) > 0.002 or abs(c['cpu_diff'] - x['cpu_diff_ms']) > 0.002: dm.append('diff value differs: ' + x['what'])
    if c['passes_agreeing'] != x['passes_agreeing']: dm.append('passes agreeing differs: ' + x['what'])
out['differences_check'] = {'listed_hold': len(engines['differences_that_hold']), 'listed_noise': len(engines['differences_within_noise']),
                            'recomputed_comparisons': len(mycomp), 'mismatches': dm,
                            'hold_their_rule': sum(1 for c in mycomp.values() if c['holds_their_rule']),
                            'hold_sum_rule': sum(1 for c in mycomp.values() if c['holds_sum_rule']),
                            'hold_disjoint_rule': sum(1 for c in mycomp.values() if c['holds_disjoint_rule']),
                            'hold_their_rule_but_not_sum_rule': [f"{c['what']} {NAME[c['a']]}-{NAME[c['b']]}" for c in mycomp.values() if c['holds_their_rule'] and not c['holds_sum_rule']],
                            'hold_their_rule_but_not_disjoint': [f"{c['what']} {NAME[c['a']]}-{NAME[c['b']]}" for c in mycomp.values() if c['holds_their_rule'] and not c['holds_disjoint_rule']],
                            'duplicates_listed_as_hold': sum(1 for c in mycomp.values() if c['holds_their_rule'] and c['duplicate_of_1_thread_row'])}

# cold including LadybugDB's facts load (other engines have facts_load 0)
cf = []
for g, cl in classes.items():
    for cls in cl:
        for s in ['one']:
            r = rows.get((g, cls, 'ladybug', s))
            if not r: continue
            line = {'graph': g, 'cls': cls, 'ladybug_cold_wall': r['cold']['wall'], 'ladybug_facts_load_ms_median': r['cold_facts_load_median'],
                    'ladybug_cold_plus_facts_wall': r['cold_plus_facts']['wall'], 'ladybug_cold_plus_facts_passes': r['cold_plus_facts']['wall_passes']}
            for e in ['relational', 'duckpgq']:
                o = rows.get((g, cls, e, s))
                if o:
                    line[e + '_cold_wall'] = o['cold']['wall']; line[e + '_cold_passes'] = o['cold']['wall_passes']; line[e + '_facts_load_ms_median'] = o['cold_facts_load_median']
                    lo_l = r['cold_plus_facts']['wall_passes']; oo = o['cold']['wall_passes']
                    line['ladybug_incl_facts_vs_' + e] = 'ladybug lower in all passes (ranges disjoint)' if max(lo_l) < min(oo) else ('ladybug higher in all passes (ranges disjoint)' if min(lo_l) > max(oo) else 'ranges overlap')
            cf.append(line)
out['cold_with_facts_load'] = cf

# empty answers and seed identity
out['answers_empty'] = {f'{g}/{c}/{e}/{s}': r['empty_answers_per_pass'] for (g, c, e, s), r in rows.items() if 'empty_answers_per_pass' in r}
seedsets = collections.defaultdict(set)
for (g, c, e, s), r in rows.items():
    if 'seed_ids_hash' in r: seedsets[(g, c)].add((r['seed_ids_hash'], r['cold_ids_hash'], r['same_seed_set_all_passes']))
out['same_seeds_across_engines_settings_passes'] = {f'{g}/{c}': (len(v) == 1 and all(x[2] for x in v)) for (g, c), v in seedsets.items()}

# ---------------------------------------------------------------- 2. equivalence across engines from unit hashes
eq = {}
for g, cl in classes.items():
    us = [u for u in units if u['graph'] == g]
    for cls in cl:
        by_i = collections.defaultdict(set); by_i_exact = collections.defaultdict(set); n = 0; who = set()
        for u in us:
            for b in u['blocks']:
                if b['spec']['type'] not in ('warm',) or b['spec']['cls'] != cls: continue
                for it in b['res']['items']:
                    H=it['hash'] if isinstance(it['hash'], dict) else {'exact': it['hash']}; by_i[it['i']].add((H.get('order'), H.get('n'), H.get('score9', H.get('exact')))); by_i_exact[it['i']].add(json.dumps(H.get('exact'))); n += 1; who.add(b['spec']['engine'])
            for b in u['blocks']:
                if b['spec']['type'] != 'cold' or b['spec']['cls'] != cls: continue
                for r in b['res']['rows']:
                    H=r['hash'] if isinstance(r['hash'], dict) else {'exact': r['hash']}; by_i[r['i']].add((H.get('order'), H.get('n'), H.get('score9', H.get('exact')))); by_i_exact[r['i']].add(json.dumps(H.get('exact'))); n += 1
        eq[f'{g}/{cls}'] = {'answers': n, 'engines': sorted(who), 'seeds': len(by_i), 'seeds_with_more_than_one_answer_at_1e-9': sum(1 for v in by_i.values() if len(v) > 1),
                            'seeds_with_more_than_one_exact_hash': sum(1 for v in by_i_exact.values() if len(v) > 1)}
out['equivalence_from_unit_hashes'] = eq

# ---------------------------------------------------------------- 2/3. alternation, timestamps, load rule
blocks = [json.loads(l) for l in open(os.path.join(IB, 'blocks.jsonl'), encoding='utf-8') if l.strip()]
sessions = sorted(set(b['session'] for b in blocks))
final_session = sessions[-1]
alt = {}
overl = 0; rule_err = []; first_pos = collections.Counter(); kept_flag_attempt = collections.Counter()
for unit in sorted(set(b['unit'] for b in blocks)):
    bs = [b for b in blocks if b['unit'] == unit]
    sess = sorted(set(b['session'] for b in bs))
    use = [b for b in bs if b['session'] == sess[-1]]
    use.sort(key=lambda b: (b['t0'], b['t1']))
    ov = sum(1 for a, b in zip(use, use[1:]) if b['t0'] < a['t1'])
    overl += ov
    # alternation: consecutive runs of the same engine (a run = maximal sequence of same engine in time order)
    runs = []
    for b in use:
        if runs and runs[-1][0] == b['engine']: runs[-1][1] += 1
        else: runs.append([b['engine'], 1])
    longest = collections.Counter()
    for e, n in runs: longest[e] = max(longest[e], n)
    for b in use:
        lim = b['load']['limit_cpus']; fl = b['load']['other_cpus'] > lim
        if fl != b['load']['flagged']: rule_err.append(f"{unit} {b['key']} attempt {b['attempt']}: flagged field inconsistent")
        exp = ('repeat' if fl and b['attempt'] < 3 else ('kept_flagged' if fl else 'kept'))
        if exp != b['action']: rule_err.append(f"{unit} {b['key']} attempt {b['attempt']}: action {b['action']} expected {exp}")
        if b['action'] == 'kept_flagged': kept_flag_attempt[b['attempt']] += 1
    kept = [b for b in use if b['action'] != 'repeat']
    keys = collections.Counter(b['key'] for b in kept)
    alt[unit] = {'sessions': len(sess), 'attempts_used_session': len(use), 'attempts_discarded_earlier_sessions': len(bs) - len(use),
                 'kept': len(kept), 'repeats': sum(1 for b in use if b['action'] == 'repeat'), 'kept_flagged': sum(1 for b in use if b['action'] == 'kept_flagged'),
                 'overlapping_attempts': ov, 'engine_runs': len(runs), 'longest_same_engine_run': dict(longest),
                 'keys_kept_more_than_once': sum(1 for v in keys.values() if v > 1),
                 'start': datetime.datetime.utcfromtimestamp(use[0]['t0'] / 1000).isoformat() + 'Z', 'end': datetime.datetime.utcfromtimestamp(use[-1]['t1'] / 1000).isoformat() + 'Z'}
out['alternation'] = {'per_unit': alt, 'overlapping_attempts_total': overl, 'load_rule_errors': rule_err[:50], 'load_rule_error_count': len(rule_err),
                      'kept_flagged_by_attempt_index': dict(kept_flag_attempt), 'sessions': sessions}

# unit files against blocks.jsonl: every kept block in a unit file matches a kept line (same t0) of blocks.jsonl
ufmis = 0; ufn = 0
kept_lines = {(b['unit'], b['key'], b['t0']) for b in blocks if b['action'] != 'repeat'}
for u in units:
    for b in u['blocks']:
        ufn += 1
        if (u['unit'], b['key'], b['res']['t0']) not in kept_lines: ufmis += 1
out['unit_blocks_matched_to_log'] = {'unit_blocks': ufn, 'not_found_as_kept_line': ufmis}

# rounds inside a unit file: for warm blocks with the same (cls, from), do all engines run the same seed range, consecutively?
rnd = {'rounds': 0, 'rounds_all_engines_present': 0, 'rounds_engine_order': collections.Counter()}
for u in units:
    grp = collections.defaultdict(list)
    for b in u['blocks']:
        if b['spec']['type'] in ('warm', 'cold'):
            grp[(b['spec']['type'], b['spec']['cls'], b['spec']['from'])].append(b)
    for (ty, cls, fr), bs in grp.items():
        rnd['rounds'] += 1
        es = set(b['spec']['engine'] for b in bs)
        need = {'ladybug'} if cls == 'S2' else set(ENG)
        if es == need: rnd['rounds_all_engines_present'] += 1
        if len(need) == 3:
            # order of first block per engine, by the time the block that was kept started (repeats may move it)
            firsts = sorted(((min(b['res']['t0'] for b in bs if b['spec']['engine'] == e), e) for e in es))
            rnd['rounds_engine_order'][firsts[0][1]] += 1
rnd['first_engine_count'] = dict(rnd.pop('rounds_engine_order'))
out['rounds'] = rnd

# ---------------------------------------------------------------- 3. host load per engine (kept blocks, unit files)
hl = {}
for e in ENG:
    bs = [b for u in units for b in u['blocks'] if b['spec']['engine'] == e]
    oc = [b['load']['other_cpus'] for b in bs]
    dur = [(b['res']['t1'] - b['res']['t0']) / 1000 for b in bs if 't1' in b['res']]
    hl[e] = {'kept_blocks': len(bs), 'repeats': sum(b['attempts'] - 1 for b in bs), 'kept_flagged': sum(1 for b in bs if b['flagged']),
             'other_median': med(oc), 'other_max': max(oc), 'other_p90': sorted(oc)[int(0.9 * len(oc))],
             'blocks_with_other_above_6_cpus': sum(1 for x in oc if x > 6), 'blocks_without_host_timeline': sum(1 for b in bs if b['load'].get('host_timeline') != 'ok'),
             'block_seconds_median': med(dur), 'blocks_shorter_than_1s': sum(1 for d in dur if d < 1.0), 'host_samples_median': med([b['load'].get('host_samples', 0) for b in bs])}
out['host_load_per_engine'] = hl

# recompute the host part of "other work" for kept warm blocks from host_load.jsonl
def iso(s): return datetime.datetime.fromisoformat(s.replace('Z', '+00:00')).timestamp() * 1000
hs = []
for l in open(os.path.join(IB, 'host_load.jsonl'), encoding='utf-8-sig'):
    l = l.strip().lstrip('﻿')
    if not l: continue
    try:
        o = json.loads(l); hs.append((iso(o['t0']), iso(o['t1']), o['other_cpus']))
    except Exception: pass
hs.sort()
import bisect
starts = [h[0] for h in hs]
def wavg(a, b):
    if b - a < 1: b = a + 1
    i = max(0, bisect.bisect_left(starts, a) - 2); w = s = 0
    while i < len(hs) and hs[i][0] < b:
        t0, t1, v = hs[i]
        o = min(b, t1) - max(a, t0)
        if o > 0: w += o; s += o * v
        i += 1
    return s / w if w else None
diffs = []; n = 0
for u in units:
    for b in u['blocks']:
        off = b['load'].get('clock_offset_ms') or 0
        mine = wavg(b['res']['t0'] + off, b['res']['t1'] + off)
        if mine is None or b['load'].get('host_other_cpus') is None: continue
        n += 1; diffs.append(abs(mine - b['load']['host_other_cpus']))
diffs.sort()
out['host_other_recomputed'] = {'blocks': n, 'abs_diff_median_cpus': med(diffs), 'abs_diff_p99_cpus': diffs[int(0.99 * len(diffs))] if diffs else None, 'abs_diff_max_cpus': diffs[-1] if diffs else None,
                                 'note': 'host side of other work recomputed from host_load.jsonl with the clock offset stored per block; the VM side is not in a file and cannot be recomputed'}

# load difference between engines inside the same round (does load fall alike?)
pair = collections.defaultdict(list)
for u in units:
    grp = collections.defaultdict(dict)
    for b in u['blocks']:
        if b['spec']['type'] == 'warm' and b['spec'].get('T') == 1:
            grp[(b['spec']['cls'], b['spec']['from'])][b['spec']['engine']] = b['load']['other_cpus']
    for k, d in grp.items():
        for i in range(3):
            for j in range(i + 1, 3):
                if ENG[i] in d and ENG[j] in d: pair[(ENG[i], ENG[j])].append(d[ENG[i]] - d[ENG[j]])
out['load_difference_same_round'] = {f'{a}-{b}': {'rounds': len(v), 'median_cpus': med(v), 'mean_cpus': sum(v) / len(v)} for (a, b), v in pair.items()}

# ---------------------------------------------------------------- 5. thread read-back
rb = collections.defaultdict(set)
for u in units:
    for b in u['blocks']:
        if b['spec']['type'] == 'warm':
            rb[(u['graph'], b['spec']['engine'], b['spec']['cls'], b['spec']['T'])].add(json.dumps(b['res'].get('readback'), sort_keys=True))
out['thread_readback'] = {f'{g}/{e}/{c}/T{T}': sorted(v) for (g, e, c, T), v in sorted(rb.items(), key=str)}
out['calibration_best'] = cal.get('best')
cal_close = []
for g, x in cal['graphs'].items():
    for e, byc in x['by'].items():
        for c, byT in byc.items():
            m = sorted((float(v['median_ms']), int(t)) for t, v in byT.items())
            lo = m[0][0]; b1 = float(byT['1']['median_ms'])
            cal_close.append({'graph': g, 'engine': e, 'cls': c, 'best': cal['best'][e][g][c], 'one_thread_ms': b1, 'lowest_ms': lo, 'one_thread_over_lowest_pct': round(100 * (b1 / lo - 1), 1)})
out['calibration_margin'] = cal_close

def ser(o):
    if isinstance(o, dict): return {str(k): ser(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)): return [ser(x) for x in o]
    if isinstance(o, float): return round(o, 4)
    return o
out['rows'] = {'|'.join(k): ser({kk: vv for kk, vv in v.items() if kk not in ('seed_ids',)}) for k, v in rows.items()}
out['comparisons'] = [ser(c) for c in mycomp.values()]
with open(os.path.join(HERE, 'recompute.json'), 'w', encoding='utf-8') as fh:
    json.dump(out, fh, indent=1)
short = {k: v for k, v in out.items() if k not in ('rows', 'comparisons', 'thread_readback', 'answers_empty', 'calibration_margin', 'cold_with_facts_load', 'alternation')}
print(json.dumps(short, indent=1)[:9000])
