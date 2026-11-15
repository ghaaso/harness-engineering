"""Comparator score tables on all 65 tune commits + the gate (addendum 8 item 6).
Writes eval/comparators/<ARM>_<scope>.tsv.gz, eval/comparators/metrics.json, eval/gate.json.
Resumes: a table whose progress unit is done and whose file exists is read, not recomputed."""
import os, sys, json, collections
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import evalcore as ec

E = os.path.join(ec.ROOT, 'eval'); CD = os.path.join(E, 'comparators'); os.makedirs(CD, exist_ok=True)
tasks = ec.load_tasks()
PILOT = {'RRF': 0.233, 'PPR': 0.204, 'CO': 0.199, 'RANDOM': 0.118}
PILOT_R10 = {'RRF': 0.508, 'PPR': 0.430, 'CO': 0.447, 'RANDOM': 0.259}
gate = {}

# 1. candidate pools and scores against the pilot's own rows (pilot_rows.pkl dumped to tsv, tune only)
pr = collections.defaultdict(dict)
with open(os.path.join(E, 'git', 'pilot_rows.tsv')) as f:
    next(f)
    for l in f:
        ci, s, t, y, hop, ppr, co, sup, rec = l.rstrip('\n').split('\t')
        pr[(int(ci) + 1, s[2:])][t[2:]] = (float(ppr), float(co), int(y))
same_pool = diff_pool = 0; maxd_ppr = 0.0; co_mis = 0; y_mis = 0; nrows = 0; strict_empty = []
for t in tasks:
    mine = set(ec.candidates(t, 'pool')); theirs = pr.get((t['pilot_order'], t['seed']), {})
    if not mine: strict_empty.append(t['task_id'])
    if mine == set(theirs): same_pool += 1
    else: diff_pool += 1
    p = ec.ppr_scores(t, sorted(mine)); c = ec.co_scores(t, sorted(mine))
    for x in mine & set(theirs):
        nrows += 1; maxd_ppr = max(maxd_ppr, abs(p[x] - theirs[x][0]))
        if abs(c.get(x, 0.0) - theirs[x][1]) > 1e-12: co_mis += 1
        if int(x in t['truth']) != theirs[x][2]: y_mis += 1
nonempty_loose = sum(1 for t in tasks if t['task_id'] in strict_empty and ec.graph(t['parent']).pool(t['seed'], strict=False))
gate['pilot_rows_check'] = dict(tasks_same_pool=same_pool, tasks_diff_pool=diff_pool, rows_compared=nrows,
                                pilot_rows_total=sum(len(v) for v in pr.values()), max_abs_ppr_diff=maxd_ppr,
                                co_conf_mismatches=co_mis, truth_label_mismatches=y_mis,
                                seeds_with_empty_pool_strict=len(strict_empty),
                                of_which_nonempty_if_co_only_seeds_kept=nonempty_loose)
print(json.dumps(gate['pilot_rows_check']))

# 2. replay of the pilot's metric code on its own rows (rng(1) jitter in row order, ev.py lines 25-54)
rows = []
with open(os.path.join(E, 'git', 'pilot_rows.tsv')) as f:
    next(f)
    for l in f:
        ci, s, t, y, hop, ppr, co, sup, rec = l.rstrip('\n').split('\t'); rows.append((int(ci), s, t, int(y), float(ppr), float(co)))
jit = np.random.default_rng(1).random(len(rows)) * 1e-9
byseed = collections.defaultdict(list)
for i, r in enumerate(rows): byseed[(r[0], r[1])].append(i)
yv = np.array([r[3] for r in rows]); P = np.array([r[4] for r in rows]); C = np.array([r[5] for r in rows])
def rank_in_seed(score):
    rk = np.zeros(len(rows)); sc = score + jit
    for key, idxs in byseed.items():
        a = np.array(idxs); o = a[np.argsort(-sc[a])]; rk[o] = np.arange(1, len(a) + 1)
    return rk
rrf = 1 / (60 + rank_in_seed(P)) + np.where(C > 0, 1 / (60 + rank_in_seed(C)), 0)
pseeds = [(t['pilot_order'] - 1, 'F:' + t['seed'], len(t['truth'])) for t in tasks]
def replay(score):
    sc = score + jit; per = collections.defaultdict(list)
    for ci, s, nt in pseeds:
        if ci < 15: continue
        idxs = byseed.get((ci, s))
        if not idxs: per[ci].append((0, 0)); continue
        a = np.array(idxs); o = a[np.argsort(-sc[a])][:10]; h = int(yv[o].sum()); per[ci].append((h / 10, h / nt))
    return np.array([np.mean(per[c], axis=0) for c in sorted(per)]).mean(axis=0)
gate['pilot_replay_late50_pilot'] = {n: dict(zip(('P@10', 'R@10'), np.round(replay(s), 4).tolist()))
                                     for n, s in (('RRF', rrf), ('PPR', P), ('CO', C), ('RANDOM', np.zeros(len(rows))))}
print('replay', gate['pilot_replay_late50_pilot'])

# 3. comparator tables, both scopes
results = {}
for scope in ec.SCOPES:
    names = ('PPR', 'CO', 'RRF', 'DIR', 'RANDOM')
    files = {n: os.path.join(CD, '%s_%s.tsv.gz' % (n, scope)) for n in names}
    done = ec.progress_done('comparators')
    if all(('%s_%s' % (n, scope)) in done and os.path.exists(files[n]) for n in names):
        T = {n: ec.read_score_table(files[n]) for n in names}
    else:
        T = ec.comparator_tables(scope, tasks)
        for n in names:
            ec.write_score_table(files[n], T[n])
            ec.progress_log('comparators', '%s_%s' % (n, scope), rows=sum(len(v) for v in T[n].values()))
    for n in names:
        pt = ec.evaluate_table(T[n], scope, tasks)
        results['%s_%s' % (n, scope)] = {w: ec.summary(pt, tasks, ec.commit_set(tasks, w)) for w in ('late50_pilot', 'late50', 'all')}
    print(scope, 'done', flush=True)
# candidate lists (for training code: what to score)
for scope in ec.SCOPES:
    ec.write_score_table(os.path.join(CD, 'candidates_%s.tsv.gz' % scope), {t['task_id']: {c: 0.0 for c in ec.candidates(t, scope)} for t in tasks})
json.dump(results, open(os.path.join(CD, 'metrics.json'), 'w'), indent=1)

# 4. gate: late 50 (the pilot's set), pool P@10 within 0.005
g = {}
for n in PILOT:
    v = results['%s_pool' % n]['late50_pilot']
    g[n] = dict(mine_P10=round(v['P@10'], 4), pilot_P10=PILOT[n], diff=round(v['P@10'] - PILOT[n], 4),
                mine_R10=round(v['R@10'], 4), pilot_R10=PILOT_R10[n], within=abs(v['P@10'] - PILOT[n]) <= 0.005)
gate['gate_late50_pilot_pool'] = g
gate['GATE'] = 'pass' if all(x['within'] for x in g.values()) else 'fail'

# 5. tie-break sensitivity: 50 tie seeds, pool P@10 on the pilot's late 50; analytic expectation of random
late = ec.commit_set(tasks, 'late50_pilot'); sweep = collections.defaultdict(list)
Tpool = {n: ec.read_score_table(os.path.join(CD, '%s_pool.tsv.gz' % n)) for n in ('PPR', 'CO')}
for s in range(1, 51):
    rr = {}
    for t in tasks:
        cands = ec.candidates(t, 'pool')
        rr[t['task_id']] = ec.rrf_scores(t['task_id'], cands, [(Tpool['PPR'].get(t['task_id'], {}), 1), (Tpool['CO'].get(t['task_id'], {}), 1)], 60, s)
    for n, tab in (('RRF', rr), ('PPR', Tpool['PPR']), ('CO', Tpool['CO']), ('RANDOM', {})):
        sweep[n].append(ec.summary(ec.evaluate_table(tab, 'pool', tasks, s), tasks, late)['P@10'])
exp = {}
for t in tasks:
    cands = ec.candidates(t, 'pool'); n = len(cands); m = len(set(cands) & set(t['truth']))
    exp[t['task_id']] = {'P@10': (min(10, n) * m / n / 10) if n else 0.0, 'R@10': 0, 'R@20': 0, 'MRR': 0}
gate['tie_seed_sweep_late50_pilot_pool_P10'] = {n: dict(mean=round(float(np.mean(v)), 4), sd=round(float(np.std(v)), 4),
                                                        min=round(min(v), 4), max=round(max(v), 4)) for n, v in sweep.items()}
gate['random_expected_P10_late50_pilot'] = round(ec.summary(exp, tasks, late)['P@10'], 4)
json.dump(gate, open(os.path.join(E, 'gate.json'), 'w'), indent=1)
ec.progress_log('gate', 'late50_pilot_pool_P10', status='done', result=gate['GATE'])
print(json.dumps({k: gate[k] for k in ('GATE', 'gate_late50_pilot_pool', 'tie_seed_sweep_late50_pilot_pool_P10', 'random_expected_P10_late50_pilot')}, indent=1))
