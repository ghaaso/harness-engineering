"""Ruling 64 on the CURRENT selectB.py (port of fixes/tests/test_r64.py, which ran on earlier bytes: tests-post3/4.log).
Ruling 64: on an exact tie for the best mean, the band is measured from that mean with the LARGEST standard error among
the tied candidates; the choice then follows ruling 53 (smallest model, then higher mean, then lower config id, then
smaller w); the result does not depend on the order in which candidates are listed. FAKE DATA ONLY: parts U1-U3 use
fixed per-commit numbers (exact binary fractions, so every tie is exact); part S builds a synthetic lane under R58_OUT
(which must lie under r58c/) and runs selectB.run on it. No real table, tune task, truth or sealed/ path is read.

U1 (the earlier test's case) c02 d200 [0.5, 0.75] mean 0.625 SE 0.125; c03 d200 [0.375, 0.875] mean 0.625 SE 0.25 (tied,
   larger SE); c01 d100 [0.45, 0.45]. Band from 0.625 - 0.25 = 0.375 -> c01 is in -> c01. (From c02's SE: >= 0.5 -> c02.)
U2 seven candidates, four values each; the tie for 0.5 is three-way:
     A (c01, 0.25) d64  [0.25]*4         mean 0.25
     G (c01, 1.0)  d64  [0.25]*4         mean 0.25  (same size and mean as A: the smaller w, A, wins)
     F (c01, 0.5)  d64  [0.2]*4          mean 0.2   (outside every band)
     B (c02, 0.5)  d128 [0.5]*4          mean 0.5   SE 0
     C (c03, 1.0)  d256 [.25,.75,.25,.75] mean 0.5  SE sqrt(1/12)/2 = 0.1443
     D (c03, 0.5)  d256 [0, 1, 0, 1]     mean 0.5   SE sqrt(1/3)/2  = 0.2887 (the largest among the tied)
     E (c02, 1.0)  d128 [0.3]*4          mean 0.3
   Band >= 0.5 - 0.2887 = 0.2113 -> A, G, B, C, D, E -> smallest model c01 -> higher mean (A, G at 0.25 > F out) ->
   smaller w -> A = (c01, 0.25); best = D (c03, 0.5) with its own SE. Measured from C's SE (0.3557) or B's (0.5) the pick
   would be B. All 5,040 orders must give A and best D; choose_builder must give one answer over all orders too.
U3 two tied candidates share the largest SE (D and D' = (c02, 1.0) d128 [0,1,0,1]): best = the lower config id (c02,
   ruling 64's tie-break in selectB._stats), the band is unchanged, the pick is still A; checked on 720 orders.
S  selectB.run end to end on a fake lane (one task per commit; T1..T10 truth among 100 candidates; at w = 1 a table that
   scores k truth files gives fused pool P@10 = k/10, see test_selection_freeze8.py): c01 d64 0.5 on commits 1-9;
   c02 d128 0.5 on commits 1-13; c03 d256 1.0 on commits 1-6 and 0.5 on commit 7. Every earlier set holds commits 1-13,
   so c02 and c03 tie EXACTLY (sum 6.5) in every block and on all 65. By hand:
     block 1 (15 earlier): band from c03's SE 0.12786 -> >= 0.30547; c01 0.3 out -> c02 (smaller than c03), w 1
     block 2 (25): c03 SE 0.08718 -> >= 0.17282; c01 0.18 in -> c01   (from c02's SE 0.05099: >= 0.209, c02)
     block 3 (35): >= 0.12062; c01 0.12857 in -> c01                     (from c02's SE: >= 0.14428, c02)
     block 4 (45): >= 0.09265; c01 0.1 in -> c01                         (from c02's SE: >= 0.11028, c02)
     block 5 (55): >= 0.07522; c01 0.08182 in -> c01                     (from c02's SE: >= 0.08928, c02)
     all 65:       >= 0.06331; c01 0.06923 in -> c01                     (from c02's SE: >= 0.075, c02)
   best = c03, w 1 everywhere. The same lane is run with the plan's configurations listed in all six orders and with
   the task list shuffled; every run must give the same choices, bests and candidate statistics.
Prints one named line per check and RESULT PASS|FAIL r64.
usage (in a ktest container, EMB_ROOT=/w, R58_OUT=/w/r58c/out): python /w/r58c/tests/test_r64.py
"""
import os, sys, json, gzip, math, itertools, random
ROOT0 = os.environ.get('EMB_ROOT', '/w')
sys.path.insert(0, os.path.join(ROOT0, 'train', 'r58', 'tests'))
from r58common import *  # ROOT, TRAIN, OUTR, check, finish, exits, fresh, sha, show_hashes
if '/r58c/' not in OUTR.replace('\\', '/') + '/':
    print('refusing: R58_OUT must lie under r58c/ (got %s); this test writes nowhere else' % OUTR, flush=True); sys.exit(2)
import evalcore as ec
import selectB
from atomic import retry_write
show_hashes('train/selectB.py', 'eval/evalcore.py')
print('note: selectB.py reviewed bytes start 3a3d32956502; current', sha(os.path.join(TRAIN, 'selectB.py'))[:12], flush=True)


def close(a, b, tol=1e-12): return a is not None and b is not None and abs(float(a) - float(b)) <= tol


def row(cid, w, dim, vals): return ((cid, w), {'embedding_dim': dim}, w, list(vals))


def picks_over(rows, perms, fn):
    out = set(); bests = set()
    for p in perms:
        pick, stats, best = fn([rows[i] for i in p])
        out.add((pick['key'], pick['w'])); bests.add((best['key'], round(best['se'], 15)))
    return out, bests


# ================================================================ U1
U1 = [row('c02', 0.5, 200, [0.5, 0.75]), row('c03', 0.5, 200, [0.375, 0.875]), row('c01', 0.5, 100, [0.45, 0.45])]
pk, bs = picks_over(U1, list(itertools.permutations(range(3))), selectB.choose)
check('U1_choose_c01_in_every_order', pk == {(('c01', 0.5), 0.5)} and bs == {(('c03', 0.5), 0.25)}, 'picks', sorted(pk), 'best (key, SE)', sorted(bs))
pkb, _ = picks_over(U1, list(itertools.permutations(range(3))), selectB.choose_builder)
check('U1_choose_builder_one_answer', len(pkb) == 1, 'builder picks', sorted(pkb))

# ================================================================ U2
A = row('c01', 0.25, 64, [0.25] * 4); G = row('c01', 1.0, 64, [0.25] * 4); F = row('c01', 0.5, 64, [0.2] * 4)
B = row('c02', 0.5, 128, [0.5] * 4); C = row('c03', 1.0, 256, [0.25, 0.75, 0.25, 0.75]); D = row('c03', 0.5, 256, [0.0, 1.0, 0.0, 1.0])
E = row('c02', 1.0, 128, [0.3] * 4)
U2 = [A, G, F, B, C, D, E]
SE_C = math.sqrt(1 / 12) / 2; SE_D = math.sqrt(1 / 3) / 2
pick, stats, best = selectB.choose(U2)
st = {(s['key'], s['w']): s for s in stats}
check('U2_stats_equal_hand', close(st[(('c03', 0.5), 0.5)]['se'], SE_D) and close(st[(('c03', 1.0), 1.0)]['se'], SE_C)
      and st[(('c02', 0.5), 0.5)]['se'] == 0.0 and all(st[(r[0], r[2])]['mean'] == 0.5 for r in (B, C, D)),
      'SE D', round(st[(('c03', 0.5), 0.5)]['se'], 6), 'SE C', round(st[(('c03', 1.0), 1.0)]['se'], 6), '(exact three-way tie at 0.5)')
check('U2_best_is_largest_SE_tied', best['key'] == ('c03', 0.5) and close(best['se'], SE_D), 'best', best['key'], round(best['se'], 6))
perms = list(itertools.permutations(range(7)))
pk, bs = picks_over(U2, perms, selectB.choose)
check('U2_choose_A_in_all_5040_orders', pk == {(('c01', 0.25), 0.25)} and len(bs) == 1 and next(iter(bs))[0] == ('c03', 0.5) and len(perms) == 5040,
      'picks', sorted(pk), 'bests', sorted(bs))
check('U2_not_the_smaller_SE_answer', 0.5 - SE_D < 0.25 < 0.5 - SE_C, 'A (0.25) is inside the band from D\'s SE and outside the bands from C\'s or B\'s SE')
pkb, _ = picks_over(U2, perms, selectB.choose_builder)
check('U2_choose_builder_one_answer', len(pkb) == 1, 'builder picks over 5040 orders', sorted(pkb))

# ================================================================ U3
D2 = row('c02', 1.0, 128, [0.0, 1.0, 0.0, 1.0])
U3 = [A, B, C, D, D2, F]
pk, bs = picks_over(U3, list(itertools.permutations(range(6))), selectB.choose)
check('U3_equal_largest_SE_best_by_id_pick_A', pk == {(('c01', 0.25), 0.25)} and bs == {(('c02', 1.0), round(SE_D, 15))},
      'picks', sorted(pk), 'bests', sorted(bs), '(D and D\' share the largest SE; the lower config id is reported)')

# ================================================================ S end to end on selectB.run
SEEDS = (1, 2, 3); SCOPES = ('pool', 'unrestricted')
TRUTH = ['t/%02d.py' % j for j in range(1, 11)]
DECOY = ['d/%02d.py' % i for i in range(1, 91)]
CANDS = DECOY + TRUTH
PPR_ROW = dict([(c, 1000.0 - i) for i, c in enumerate(DECOY, 1)] + [(c, 100.0 - j) for j, c in enumerate(TRUTH, 1)])
NAME = {n: 'k%02d' % ((n * 29) % 65 + 1) for n in range(1, 66)}
TID = {n: 't_' + NAME[n] for n in NAME}
TASKS = [dict(task_id=TID[n], commit=NAME[n], date_order=n, pilot_order=n, late50=n > 15, late50_pilot=12 <= n <= 61,
              parent='%040x' % n, seed='src/seed_%02d.py' % n, truth=list(TRUTH), commit_seeds=['src/seed_%02d.py' % n])
         for n in range(1, 66)]
CFGS = [dict(config_id='c01', cfg=dict(embedding_dim=64, num_layers=0), epochs=5),
        dict(config_id='c02', cfg=dict(embedding_dim=128, num_layers=0), epochs=6),
        dict(config_id='c03', cfg=dict(embedding_dim=256, num_layers=0), epochs=7)]


def k_of(cid, n):
    if cid == 'c01': return 5 if n <= 9 else 0
    if cid == 'c02': return 5 if n <= 13 else 0
    return 10 if n <= 6 else (5 if n == 7 else 0)


def prof(k): return {TRUTH[j]: 100.0 - j for j in range(k)}


LANE = fresh(os.path.join(OUTR, 'r64', 'lane'))
CD = os.path.join(LANE, 'cd'); TR = os.path.join(LANE, 'train'); TB = os.path.join(TR, 'stageB', 'tables')
os.makedirs(CD); os.makedirs(TB)
for sc in SCOPES:
    with gzip.open(os.path.join(CD, 'candidates_%s.tsv.gz' % sc), 'wt') as f:
        f.write('task_id\tcandidate\tsource\n')
        for t in TASKS:
            for c in CANDS: f.write('%s\t%s\tfake\n' % (t['task_id'], c))
    for nm, tab in (('PPR', {t['task_id']: PPR_ROW for t in TASKS}), ('CO', {})):
        p = os.path.join(CD, '%s_%s.tsv.gz' % (nm, sc)); retry_write(lambda: ec.write_score_table(p, tab), p)
PLAN = dict(s=1, plan_hash='7e57' * 16, configs=dict(E1=CFGS))
for c in CFGS:
    for s in SEEDS:
        base = os.path.join(TB, 'E1_%s_s%d' % (c['config_id'], s))
        tab = {TID[n]: prof(k_of(c['config_id'], n)) for n in range(1, 66)}
        for sc in SCOPES:
            p = '%s_%s.tsv.gz' % (base, sc); retry_write(lambda: ec.write_score_table(p, tab), p)
        json.dump({}, open(base + '_counts.json', 'w'))
        json.dump(dict(plan_hash=PLAN['plan_hash'], parts=1, tasks=65, runners=[dict(runner='stageB.py', processes=1)]), open(base + '_meta.json', 'w'))


def run_order(tag, cfg_order, task_order):
    plan = dict(PLAN, configs=dict(E1=[CFGS[i] for i in cfg_order]))
    json.dump(plan, open(os.path.join(TR, 'stageB', 'plan.json'), 'w'), indent=1)
    saved = (ec.load_tasks, selectB.CD, selectB.HERE, selectB.r58_guard)
    ec.load_tasks = lambda path=None: [dict(t) for t in task_order]
    selectB.CD = CD; selectB.HERE = TR; selectB.r58_guard = lambda *a, **k: None
    try:
        out = os.path.join(LANE, 'sel_' + tag); selectB.run(['E1'], out)
    finally:
        ec.load_tasks, selectB.CD, selectB.HERE, selectB.r58_guard = saved
    return json.load(open(os.path.join(out, 'E1', 'choices.json')))


def summary(j):
    """Order-free view: choice, best and the candidates sorted by (config, w), for the blocks and the final choice."""
    def one(b): return dict(pick=(b['config_id'], b['w'], b['mean'], b['se']), best=(b['best']['config_id'], b['best']['w'], b['best']['mean'], b['best']['se']),
                            cands=sorted((c['config_id'], c['w'], c['mean'], c['se']) for c in b['candidates']))
    return json.dumps(dict(blocks=[one(b) for b in j['blocks']], final=one(j['final_all65']),
                           builder=[one(b) for b in j['sensitivity_builder']['blocks']] + [one(j['sensitivity_builder']['final_all65'])]), sort_keys=True)


runs = {}
for perm in itertools.permutations(range(3)):
    runs['cfg' + ''.join(str(i + 1) for i in perm)] = run_order('cfg' + ''.join(str(i + 1) for i in perm), perm, TASKS)
shuf = list(TASKS); random.Random(64).shuffle(shuf)
runs['tasks_shuffled_cfg321'] = run_order('tasks_shuffled_cfg321', (2, 1, 0), shuf)
views = {k: summary(v) for k, v in runs.items()}
check('S_same_result_in_every_listing_order', len(set(views.values())) == 1 and len(views) == 7,
      'distinct results over', len(views), 'runs (6 plan orders of c01-c03, one with the task list shuffled):', len(set(views.values())))
j = runs['cfg123']
want = [('c02', 1.0)] + [('c01', 1.0)] * 4
check('S_block_picks_equal_hand', [(b['config_id'], b['w']) for b in j['blocks']] == want, 'got', [(b['config_id'], b['w']) for b in j['blocks']], 'want', want)
check('S_final_all65_c01_by_ruling64', (j['final_all65']['config_id'], j['final_all65']['w']) == ('c01', 1.0) and close(j['final_all65']['mean'], 4.5 / 65),
      'final', j['final_all65']['config_id'], j['final_all65']['w'], round(j['final_all65']['mean'], 6))
N = [15, 25, 35, 45, 55, 65]
ties = all(b['best']['config_id'] == 'c03' and float(b['best']['w']) == 1.0
           and close(b['best']['mean'], 6.5 / n) and close(b['best']['se'], math.sqrt((6.25 - 6.5 ** 2 / n) / (n - 1) / n))
           and any(c['config_id'] == 'c02' and c['w'] == 1.0 and c['mean'] == b['best']['mean'] for c in b['candidates'])
           for b, n in zip(j['blocks'] + [j['final_all65']], N))
check('S_exact_tie_best_is_c03_with_its_SE', ties, 'every block and all 65: c02 and c03 tie exactly at 6.5/N; best = c03 (SE sqrt((6.25 - 6.5^2/N)/(N-1)/N))')
ok = finish('r64')
sys.exit(0 if ok else 1)
