"""Review finding selection-freeze-8 (orchestrator/scoring-scripts-review.json): the tests the r58 set did not have.
FAKE DATA ONLY. Every task, candidate list, comparator table and stage-B table here is synthetic and written under
R58_OUT (which must lie under r58c/); no real stage-B table, tune task, tune truth, held-out file or sealed/ path is
read. The only real files read are code (train/*.py, eval/evalcore.py), train/stageB/plan.json's plan_hash (inside
item27.real_hash_tables, a ruling-80 guard) and r58b/logs/test_verdict.log (part D).

Synthetic lane (one task per commit, 65 commits; listed in REVERSE date order and named out of date order, so only
`date_order` can give the right blocks): 100 candidates per task, 10 truth files T1..T10. PPR scores every candidate
(decoys D1..D90 at PPR ranks 1..90, truth at 91..100), CO scores nothing. An embedding table that scores T1..Tk
(k = 0, 1, 5, 10; T1 highest) gives, by hand (weighted RRF, k = 60), fused pool P@10 of
    w = 0.25: 0              (T1 = 1/151 + 0.25/61 = 0.01072 < D33 = 1/93)
    w = 0.5 : min(k, 2) / 10 (T1 = 0.014819 between D7 1/67 and D8 1/68; T2 = 0.014643 between D8 and D9 1/69)
    w = 1   : k / 10         (T10 = 1/160 + 1/70 = 0.020536 > D1 = 1/61)
so every per-commit value at w = 1 is 0, 0.5 or 1.0 (exact binary fractions) and the means below are exact.

A. Block perturbation (fix: "perturbing the late-50 scores of block k leaves the choices of blocks 1..k unchanged").
   A1 deterministic: base = no embedding score anywhere (every candidate 0; ruling 53 picks c01, w 0.25). Perturbed:
      c03 scores T1..T5 on every commit of blocks 3-5 (date order >= 36). Blocks 1-3 must be byte-identical to the
      base (rule-53 rows AND the builder's sensitivity rows), their fused rows identical, and blocks 4, 5 and the
      all-65 choice must change to (c03, 1) with the hand means 5/45, 10/55 and 15/65 (non-vacuous).
   A2 hashed noise: for k = 1..5, tables whose scores change only on the commits of blocks k..5; blocks 1..k must be
      byte-identical to the unperturbed run (both readings).
B. Earlier commits only: earlier_commits recorded = [15, 25, 35, 45, 55]; each block's commits are the date-ordered
   late-50 slice; the four pilot-only commits are left out (ruling 56); A1's block-4 and block-5 means (5/45, 10/55)
   can only come from the commits dated before the block (the block's own commits are perturbed too).
C. Item 27 against hand-computed values, not against selectB.choose: five arms whose per-candidate means, SEs, the
   ruling-53/64 pick, the best candidate and the chosen arm (ruling 57: four-decimal tie E2 = E4 = 0.1, E4 the
   smaller model) are written below as numbers derived by hand. Both item27.main (--test, explicit paths under
   R58_OUT) and selectB.run's final_all65 are checked against them. Also: item27 --test with no paths exits 2
   before reading anything (selection-freeze-1; test_item27.py's sf1_r80_refusals covers the rest).
D. verdict() boundaries: covered by r58b/logs/test_verdict.log when that log carries the CURRENT train/report.py
   sha256 and `RESULT PASS verdict`; then skipped, else the same boundary cases run here.
   Holm labels: ec.holm on hand values; ec.holm_intervals' level per p-value rank, p_holm, interval nesting; and the
   label tuple report.py zips onto holm_intervals' result.
Prints one named line per check and RESULT PASS|FAIL selection-freeze-8.
usage (in a ktest container, EMB_ROOT=/w, R58_OUT=/w/r58c/out): python /w/r58c/tests/test_selection_freeze8.py
"""
import os, sys, json, gzip, math, re, shutil
ROOT0 = os.environ.get('EMB_ROOT', '/w')
sys.path.insert(0, os.path.join(ROOT0, 'train', 'r58', 'tests'))
from r58common import *  # ROOT, TRAIN, OUTR, check, finish, exits, fresh, sha, show_hashes (read-only helpers)
if '/r58c/' not in OUTR.replace('\\', '/') + '/':
    print('refusing: R58_OUT must lie under r58c/ (got %s); this test writes nowhere else' % OUTR, flush=True); sys.exit(2)
import numpy as np
import evalcore as ec
import selectB, item27
from atomic import retry_write
show_hashes('train/selectB.py', 'train/item27.py', 'train/report.py', 'eval/evalcore.py')
print('note: selectB.py reviewed bytes start 3a3d32956502; current', sha(os.path.join(TRAIN, 'selectB.py'))[:12], flush=True)

SEEDS = (1, 2, 3); SCOPES = ('pool', 'unrestricted'); WS = selectB.WS
TRUTH = ['t/%02d.py' % j for j in range(1, 11)]
DECOY = ['d/%02d.py' % i for i in range(1, 91)]
CANDS = DECOY + TRUTH
PPR_ROW = dict([(c, 1000.0 - i) for i, c in enumerate(DECOY, 1)] + [(c, 100.0 - j) for j, c in enumerate(TRUTH, 1)])
NAME = {n: 'k%02d' % ((n * 29) % 65 + 1) for n in range(1, 66)}  # 29 is prime to 65: a bijection, not in date order
TID = {n: 't_' + NAME[n] for n in NAME}
TASKS = [dict(task_id=TID[n], commit=NAME[n], date_order=n, pilot_order=n, late50=n > 15, late50_pilot=12 <= n <= 61,
              parent='%040x' % n, seed='src/seed_%02d.py' % n, truth=list(TRUTH), commit_seeds=['src/seed_%02d.py' % n])
         for n in range(65, 0, -1)]  # reverse date order on purpose
FIRST = {b: 16 + 10 * (b - 1) for b in range(1, 6)}  # date order of block b's first commit
HASH = '7e57' * 16  # never the real plan_hash (item27 --test refuses tables that carry it)


def prof(k):
    """Embedding row scoring T1..Tk (T1 highest)."""
    return {TRUTH[j]: 100.0 - j for j in range(k)}


def noise(salt, n, s, bonus):
    """Hashed scores on every candidate, plus a bonus on truth files (scenario A2)."""
    row = selectB.placebo(s, TID[n], CANDS, 'r58c|' + salt)
    return {c: v + (bonus if c in TRUTH else 0.0) for c, v in row.items()}


def cfgd(cid, dim, layers, epochs):
    return dict(config_id=cid, cfg=dict(embedding_dim=dim, num_layers=layers), epochs=epochs)


def build_lane(d, plan, emb_row):
    """A fake lane root: d/cd (candidate lists, PPR, CO), d/train/stageB/plan.json and assembled tables."""
    fresh(d)
    cd = os.path.join(d, 'cd'); tr = os.path.join(d, 'train'); tb = os.path.join(tr, 'stageB', 'tables')
    os.makedirs(cd); os.makedirs(tb)
    for sc in SCOPES:
        with gzip.open(os.path.join(cd, 'candidates_%s.tsv.gz' % sc), 'wt') as f:
            f.write('task_id\tcandidate\tsource\n')
            for t in TASKS:
                for c in CANDS: f.write('%s\t%s\tfake\n' % (t['task_id'], c))
        for n, tab in (('PPR', {t['task_id']: PPR_ROW for t in TASKS}), ('CO', {})):
            p = os.path.join(cd, '%s_%s.tsv.gz' % (n, sc)); retry_write(lambda: ec.write_score_table(p, tab), p)
    json.dump(plan, open(os.path.join(tr, 'stageB', 'plan.json'), 'w'), indent=1)
    for arm, cfgs in plan['configs'].items():
        for c in cfgs:
            for s in SEEDS:
                base = os.path.join(tb, '%s_%s_s%d' % (arm, c['config_id'], s))
                tab = {TID[n]: emb_row(arm, c['config_id'], s, n) for n in range(1, 66)}
                for sc in SCOPES:
                    p = '%s_%s.tsv.gz' % (base, sc); retry_write(lambda: ec.write_score_table(p, tab), p)
                json.dump({}, open(base + '_counts.json', 'w'))
                json.dump(dict(plan_hash=plan['plan_hash'], parts=1, tasks=len(TASKS),
                               runners=[dict(runner='detrun.py stageB.py det=1' if arm == 'E4' else 'stageB.py', processes=1)]),
                          open(base + '_meta.json', 'w'))
    return dict(root=d, cd=cd, train=tr, tb=tb, plan=os.path.join(tr, 'stageB', 'plan.json'), sel=os.path.join(d, 'selectB'))


class Fake:
    """Point selectB/item27 at a fake lane for the duration of a with-block (evalcore.load_tasks, selectB.CD,
    selectB.HERE; selectB's ruling-58 guard bypassed in-process, as the r58 tests do)."""

    def __init__(self, lane): self.lane = lane

    def __enter__(self):
        self.saved = (ec.load_tasks, selectB.CD, selectB.HERE, selectB.r58_guard)
        ec.load_tasks = lambda path=None: [dict(t) for t in TASKS]
        selectB.CD = self.lane['cd']; selectB.HERE = self.lane['train']; selectB.r58_guard = lambda *a, **k: None
        return self

    def __exit__(self, *exc):
        ec.load_tasks, selectB.CD, selectB.HERE, selectB.r58_guard = self.saved
        return False


def run_select(lane, arms):
    with Fake(lane):
        selectB.run(list(arms), lane['sel'])
    return {a: json.load(open(os.path.join(lane['sel'], a, 'choices.json'))) for a in arms}


def js(x): return json.dumps(x, sort_keys=True)


def close(a, b, tol=1e-12): return a is not None and b is not None and abs(float(a) - float(b)) <= tol


def se(a, n1, N):
    """SE of N per-commit values, a on n1 of them and 0 elsewhere: a*sqrt(n1*(N-n1)) / (N*sqrt(N-1))."""
    return a * math.sqrt(n1 * (N - n1)) / (N * math.sqrt(N - 1))


E1_PLAN = dict(s=1, plan_hash=HASH, configs=dict(E1=[cfgd('c01', 64, 0, 7), cfgd('c02', 128, 0, 8), cfgd('c03', 256, 0, 9)]))

# ================================================================ A1 deterministic perturbation (+ B)
A1_BASE = build_lane(os.path.join(OUTR, 'sf8', 'a1_base'), E1_PLAN, lambda arm, cid, s, n: {})
A1_PERT = build_lane(os.path.join(OUTR, 'sf8', 'a1_pert'), E1_PLAN,
                     lambda arm, cid, s, n: prof(5) if (cid == 'c03' and n >= FIRST[3]) else {})
base = run_select(A1_BASE, ['E1'])['E1']; pert = run_select(A1_PERT, ['E1'])['E1']
check('A1_base_all_blocks_c01_w0.25', [(b['config_id'], b['w']) for b in base['blocks']] == [('c01', 0.25)] * 5,
      'base blocks', [(b['config_id'], b['w']) for b in base['blocks']], '(all candidates 0: smallest model, then smaller w)')
check('A1_blocks_1_to_3_byte_identical', [js(b) for b in base['blocks'][:3]] == [js(b) for b in pert['blocks'][:3]]
      and [js(b) for b in base['sensitivity_builder']['blocks'][:3]] == [js(b) for b in pert['sensitivity_builder']['blocks'][:3]],
      'scores changed on blocks 3-5 (date order >= %d); rule-53 and builder records of blocks 1-3 unchanged' % FIRST[3])
fz_b = ec.read_score_table(os.path.join(A1_BASE['sel'], 'E1', 'fused_pool_s1.tsv.gz'))
fz_p = ec.read_score_table(os.path.join(A1_PERT['sel'], 'E1', 'fused_pool_s1.tsv.gz'))
ids13 = [TID[n] for n in range(FIRST[1], FIRST[4])]
check('A1_fused_rows_of_blocks_1_to_3_identical', all(fz_b.get(t) == fz_p.get(t) for t in ids13) and len(ids13) == 30,
      '30 tasks; block 3 keeps c01, whose table did not change')
want4 = ('c03', 1.0, 5 / 45, se(0.5, 10, 45)); want5 = ('c03', 1.0, 10 / 55, se(0.5, 20, 55)); wantf = ('c03', 1.0, 15 / 65, se(0.5, 30, 65))
got = [(b['config_id'], b['w'], b['mean'], b['se']) for b in pert['blocks'][3:]] + [
    (pert['final_all65']['config_id'], pert['final_all65']['w'], pert['final_all65']['mean'], pert['final_all65']['se'])]
check('A1_later_blocks_change_to_hand_values', all(g[:2] == w[:2] and close(g[2], w[2]) and close(g[3], w[3]) for g, w in zip(got, (want4, want5, wantf))),
      'got', [(g[0], g[1], round(g[2], 6), round(g[3], 6)) for g in got], 'want', [(w[0], w[1], round(w[2], 6), round(w[3], 6)) for w in (want4, want5, wantf)],
      '(non-vacuous: the perturbation does move what comes after it)')
# ---- B: earlier commits only
ec_rec = [b['earlier_commits'] for b in pert['blocks']]
check('B_earlier_commits_15_25_35_45_55', ec_rec == [15, 25, 35, 45, 55] and [b['earlier_commits'] for b in base['blocks']] == ec_rec, 'recorded', ec_rec)
check('B_block_commits_are_date_ordered_late50_slices', [b['commits'] for b in pert['blocks']] == [[NAME[n] for n in range(FIRST[b], FIRST[b] + 10)] for b in range(1, 6)]
      and [b['block'] for b in pert['blocks']] == [1, 2, 3, 4, 5], 'names are out of date order and tasks are listed in reverse; only date_order gives these')
check('B_block4_mean_uses_only_commits_before_block4', close(pert['blocks'][3]['mean'], 5 / 45) and not close(pert['blocks'][3]['mean'], 10 / 55),
      'block 4 mean', pert['blocks'][3]['mean'], '= 5/45 (10 perturbed of the 45 earlier); 10/55 would mean block 4 saw its own commits')
check('B_pilot_only_commits_left_out', pert['pilot_only_commits_left_out'] == [NAME[n] for n in range(12, 16)], pert['pilot_only_commits_left_out'])
check('B_nine_candidates_per_block', all(len(b['candidates']) == 9 for b in pert['blocks']), [len(b['candidates']) for b in pert['blocks']])

# ================================================================ A2 hashed noise, every k
BONUS = dict(c01=0.25, c02=0.45, c03=0.65)
A2_BASE = build_lane(os.path.join(OUTR, 'sf8', 'a2_base'), E1_PLAN, lambda arm, cid, s, n: noise('base|' + cid, n, s, BONUS[cid]))
nb = run_select(A2_BASE, ['E1'])['E1']
res = {}
for k in range(1, 6):
    lane = build_lane(os.path.join(OUTR, 'sf8', 'a2_k%d' % k), E1_PLAN,
                      lambda arm, cid, s, n, k=k: noise(('pert%d|' % k if n >= FIRST[k] else 'base|') + cid, n, s,
                                                        (0.9 - BONUS[cid]) if n >= FIRST[k] else BONUS[cid]))
    p = run_select(lane, ['E1'])['E1']
    same = [js(b) for b in nb['blocks'][:k]] == [js(b) for b in p['blocks'][:k]] and \
        [js(b) for b in nb['sensitivity_builder']['blocks'][:k]] == [js(b) for b in p['sensitivity_builder']['blocks'][:k]]
    later = sum(1 for x, y in zip(nb['blocks'][k:], p['blocks'][k:]) if js(x) != js(y))
    res[k] = (same, later)
    check('A2_perturb_blocks_%d_to_5_keeps_blocks_1_to_%d' % (k, k), same, 'later block records changed: %d of %d (information only)' % (later, 5 - k))

# ================================================================ C item 27 on hand-computed values
P27 = dict(s=1, plan_hash=HASH, configs=dict(
    E1=[cfgd('c01', 64, 0, 7), cfgd('c02', 128, 0, 8), cfgd('c03', 256, 0, 9)],
    E2=[cfgd('c01', 64, 0, 7), cfgd('c02', 128, 0, 8), cfgd('c03', 256, 0, 9)],
    E3=[cfgd('c01', 64, 0, 7), cfgd('c02', 128, 0, 8), cfgd('c03', 256, 0, 9)],
    E4=[cfgd('c01', 64, 2, 11), cfgd('c02', 64, 3, 12), cfgd('c03', 128, 1, 13)],
    E5=[cfgd('c01', 128, 0, 5), cfgd('c02', 64, 0, 6), cfgd('c03', 128, 0, 4)]))


def k27(arm, cid, s, n):
    if arm == 'E1': return 5 if (cid == 'c01' and n <= 12) or (cid == 'c03' and n <= 13) else 0
    if arm == 'E2':
        if cid == 'c01' and n <= 9: return 5
        if cid == 'c02' and 20 <= n <= 28: return 5
        if cid == 'c03' and 30 <= n <= 42: return {1: 10, 2: 5, 3: 0}[s]  # seed mean at w=1: (1 + 0.5 + 0) / 3 = 0.5
        return 0
    if arm == 'E3':
        if cid == 'c01' and n <= 9: return 5
        if cid == 'c02' and 10 <= n <= 22: return 5
        if cid == 'c03' and 23 <= n <= 28: return 10
        if cid == 'c03' and n == 29: return 5
        return 0
    if arm == 'E4': return 5 if cid == 'c01' and n <= 13 else 0
    return 0  # E5: no score anywhere


# Hand values (N = 65). Per-commit values at w=1 are k/10, at w=0.5 min(k,2)/10, at w=0.25 zero.
#  E1: c03 w1 0.5 on 13 -> mean 6.5/65 = 0.1, SE 0.5*sqrt(13*52)/520 = 0.025 (best). Band >= 0.075.
#      c01 w1 0.5 on 12 -> 6/65 = 0.0923 (in band) -> the smallest model in the band: c01, w 1.
#  E2: c03 w1 0.5 on 13 (seeds 1.0/0.5/0.0) -> 0.1, SE 0.025; c01 and c02 4.5/65 = 0.0692 < 0.075 -> c03, w 1.
#  E3: c02 w1 0.5 on 13 -> 0.1, SE 0.025; c03 w1 1.0 on 6 and 0.5 on 1 -> 6.5/65 = 0.1 EXACTLY, SE sqrt(5.6/64/65)
#      = 0.03669 (ruling 64: the larger). Band >= 0.1 - 0.03669 = 0.0633; c01 w1 4.5/65 = 0.0692 is in -> c01, w 1.
#      (Measured from c02's SE the band would be >= 0.075 and the pick c02.) best = c03, w 1.
#  E4: c01 (64, 2 layers) w1 0.5 on 13 -> 0.1, SE 0.025, alone in its band -> c01, w 1.
#  E5: every candidate 0 -> exact nine-way tie, SE 0; best = (c01, 0.25) (largest SE 0, then id, then w); band = all;
#      smallest model c02 (64) -> c02, w 0.25.
#  Ruling 57: figures E1 0.0923, E2 0.1, E3 0.0692, E4 0.1, E5 0 -> tie to four decimals E2 = E4; smaller model:
#      E4 (64, 2) < E2 (256, 0) -> E4, c01, w 1, epochs 11, figure 0.1, tie group [E2, E4].
SE13 = se(0.5, 13, 65)
HAND = dict(
    E1=dict(pick=('c01', 1.0, 6 / 65, se(0.5, 12, 65)), best=('c03', 1.0, 0.1, SE13),
            means={('c01', 0.25): 0, ('c01', 0.5): 12 * 0.2 / 65, ('c01', 1.0): 6 / 65, ('c02', 0.25): 0, ('c02', 0.5): 0, ('c02', 1.0): 0,
                   ('c03', 0.25): 0, ('c03', 0.5): 13 * 0.2 / 65, ('c03', 1.0): 0.1}),
    E2=dict(pick=('c03', 1.0, 0.1, SE13), best=('c03', 1.0, 0.1, SE13),
            means={('c01', 1.0): 4.5 / 65, ('c02', 1.0): 4.5 / 65, ('c03', 1.0): 0.1, ('c03', 0.5): 13 * (0.4 / 3) / 65, ('c03', 0.25): 0}),
    E3=dict(pick=('c01', 1.0, 4.5 / 65, se(0.5, 9, 65)), best=('c03', 1.0, 0.1, math.sqrt(5.6 / 64 / 65)),
            means={('c01', 0.5): 9 * 0.2 / 65, ('c01', 1.0): 4.5 / 65, ('c02', 0.5): 13 * 0.2 / 65, ('c02', 1.0): 0.1,
                   ('c03', 0.5): 7 * 0.2 / 65, ('c03', 1.0): 0.1}),
    E4=dict(pick=('c01', 1.0, 0.1, SE13), best=('c01', 1.0, 0.1, SE13), means={('c02', 1.0): 0, ('c03', 1.0): 0}),
    E5=dict(pick=('c02', 0.25, 0.0, 0.0), best=('c01', 0.25, 0.0, 0.0), means={(c, w): 0 for c in ('c01', 'c02', 'c03') for w in WS}))
EMB = ('E1', 'E2', 'E3', 'E4', 'E5')


def agrees(rec, hand):
    """rec: dict(config_id, w, mean, se) -> equal to the hand tuple (ids and w exactly, mean/SE to 1e-12)."""
    return rec['config_id'] == hand[0] and float(rec['w']) == hand[1] and close(rec['mean'], hand[2]) and close(rec['se'], hand[3])


L27 = build_lane(os.path.join(OUTR, 'sf8', 'i27'), P27, lambda arm, cid, s, n: prof(k27(arm, cid, s, n)))
sel27 = run_select(L27, list(EMB))
for a in EMB:
    f = sel27[a]['final_all65']
    check('C_selectB_final_all65_%s_equals_hand' % a, agrees(f, HAND[a]['pick']) and agrees(f['best'], HAND[a]['best']),
          'got', (f['config_id'], f['w'], round(f['mean'], 6), round(f['se'], 6)), 'best', (f['best']['config_id'], f['best']['w']),
          'want', (HAND[a]['pick'][0], HAND[a]['pick'][1], round(HAND[a]['pick'][2], 6)), 'best', HAND[a]['best'][:2])
OUT27 = os.path.join(L27['root'], 'heldout', 'item27.json')
args = ['--test', '--tables', L27['tb'], '--plan', L27['plan'], '--sel', L27['sel'], '--out', OUT27, '--root', ROOT,
        '--device', 'cpu', '--image-id', 'sha256:r58c-test-image']
with Fake(L27):
    rc = exits(item27.main, args)
check('C_item27_ran', rc == 0 and os.path.exists(OUT27), 'exit', rc)
rec = json.load(open(OUT27)) if os.path.exists(OUT27) else {}
for a in EMB:
    r = (rec.get('arms') or {}).get(a)
    ok = bool(r) and agrees(r, HAND[a]['pick']) and agrees(r['best'], HAND[a]['best'])
    cands = {(c['config_id'], float(c['w'])): c['mean'] for c in (r or {}).get('candidates', [])}
    bad = [(k, cands.get(k), v) for k, v in HAND[a]['means'].items() if not close(cands.get(k), v)]
    check('C_item27_%s_pick_best_and_means_equal_hand' % a, ok and not bad and len(cands) == 9,
          'pick', r and (r['config_id'], r['w'], round(r['mean'], 6), round(r['se'], 6)), 'best', r and (r['best']['config_id'], r['best']['w']),
          'mismatched means', bad[:3])
ch = rec.get('chosen') or {}
check('C_item27_chosen_arm_by_ruling57_hand', ch.get('arm') == 'E4' and ch.get('config_id') == 'c01' and float(ch.get('w', -1)) == 1.0
      and ch.get('epochs') == 11 and close(ch.get('figure_all65'), 0.1) and rec.get('tie_group_4dp') == ['E2', 'E4'] and rec.get('test') is True
      and (rec.get('arms') or {}).get('E4', {}).get('size') == [64.0, 2.0],
      'chosen', ch.get('arm'), ch.get('config_id'), ch.get('w'), ch.get('epochs'), ch.get('figure_all65'), 'tie group', rec.get('tie_group_4dp'))
check('C_E3_is_the_ruling64_case', HAND['E3']['pick'][0] == 'c01' and (rec.get('arms') or {}).get('E3', {}).get('config_id') == 'c01'
      and (0.1 - 0.025) > 4.5 / 65 > (0.1 - math.sqrt(5.6 / 64 / 65)),
      'c01 (4.5/65) lies inside the band from the larger tied SE and outside the band from the smaller one')
real_out = os.path.join(TRAIN, 'heldout', 'item27.json'); before = os.path.exists(real_out)
rc = exits(item27.main, ['--test'])
check('C_sf1_item27_test_without_paths_exits_2', rc == 2 and os.path.exists(real_out) == before,
      'exit', rc, '(parse refuses before any read; train/heldout/item27.json existence unchanged:', before, ')')

# ================================================================ D verdict boundaries and Holm labels
import report
vlog = os.path.join(ROOT, 'r58b', 'logs', 'test_verdict.log'); rsha = sha(os.path.join(TRAIN, 'report.py'))
vtxt = open(vlog, encoding='utf-8', errors='replace').read() if os.path.exists(vlog) else ''
covered = ('sha256 %s train/report.py' % rsha) in vtxt and bool(re.search(r'^RESULT PASS verdict\b', vtxt, re.M))
if covered:
    check('D_verdict_boundaries_covered_by_test_verdict_log', True, 'r58b/logs/test_verdict.log: RESULT PASS on report.py', rsha[:12], '- skipped here')
else:
    ULP_LOW, ULP_HIGH = 0.019999999999999997, 0.020000000000000004
    cases = [('diff exactly +0.02, lo > 0', 0.02, 0.001, 0.05, 'adds'), ('diff +0.02 one ulp low', ULP_LOW, 0.001, 0.05, 'adds'),
             ('lo exactly 0', 0.03, 0.0, 0.05, 'cannot tell'), ('lo 1e-13', 0.03, 1e-13, 0.05, 'cannot tell'),
             ('lo -0.02 hi +0.02', 0.0, -0.02, 0.02, 'matches'), ('hi one ulp high', 0.0, -0.02, ULP_HIGH, 'matches'),
             ('lo one ulp low', 0.0, -ULP_HIGH, 0.01, 'matches'), ('below 0 inside band', -0.01, -0.015, -0.005, 'matches'),
             ('hi < 0 outside band', -0.05, -0.08, -0.03, 'cannot tell (lower)'), ('hi exactly 0', -0.03, -0.05, 0.0, 'cannot tell'),
             ('wide', 0.01, -0.03, 0.05, 'cannot tell')]
    for nm, d, lo, hi, want in cases:
        check('D_verdict: ' + nm, report.verdict(d, lo, hi) == want, 'got', report.verdict(d, lo, hi), 'want', want)
# Holm adjusted p-values on hand values
HOLM_HAND = [([0.01, 0.04, 0.03, 0.2, 0.5], [0.05, 0.12, 0.12, 0.4, 0.5]),   # step-down: 0.04's 3x = 0.12 = running max
             ([0.6, 0.01], [0.6, 0.02]), ([0.02, 0.011], [0.022, 0.022]),     # monotone: 0.02 lifted to 0.022
             ([0.4, 0.5, 0.45], [1.0, 1.0, 1.0])]                             # capped at 1
hh = [(p, list(map(float, ec.holm(p))), w) for p, w in HOLM_HAND]
check('D_holm_adjusted_p_hand_values', all(len(g) == len(w) and all(close(x, y) for x, y in zip(g, w)) for _, g, w in hh),
      '; '.join('%s -> %s' % (p, [round(x, 6) for x in g]) for p, g, _ in hh))
rng = np.random.default_rng(20261114)
diffs = [rng.normal(mu, 0.05, 50) for mu in (0.0, 0.012, 0.025, 0.06, -0.03)]
res_h = ec.holm_intervals(diffs, B=2000, seed=0)
rsrc = open(os.path.join(TRAIN, 'report.py'), encoding='utf-8').read(); esrc = open(os.path.join(ROOT, 'eval', 'evalcore.py'), encoding='utf-8').read()
LABELS = ('diff', 'lo', 'hi', 'p_raw', 'p_holm', 'level')
check('D_holm_label_tuple_matches_result_order', "dict(zip(('diff', 'lo', 'hi', 'p_raw', 'p_holm', 'level'), r))" in rsrc
      and 'Returns list of (mean, lo, hi, p_raw, p_holm, level)' in esrc and all(len(r) == 6 for r in res_h),
      'report.py zips', LABELS, 'onto holm_intervals (mean, lo, hi, p_raw, p_holm, level)')
recs = [dict(zip(LABELS, r)) for r in res_h]
p_raw = [r['p_raw'] for r in recs]


def holm_by_hand(ps):
    m = len(ps); order = sorted(range(m), key=lambda i: ps[i]); out = [0.0] * m; run = 0.0
    for r, i in enumerate(order):
        run = max(run, min(1.0, (m - r) * ps[i])); out[i] = run
    return out


ok_rows = []
for i, (r, d) in enumerate(zip(recs, diffs)):
    m95, lo95, hi95, p95 = ec.bootstrap(d, 2000, 0)
    ok_rows.append(close(r['diff'], float(np.mean(d))) and close(r['p_raw'], float(p95)) and r['lo'] <= float(lo95) + 1e-15
                   and r['hi'] >= float(hi95) - 1e-15 and r['lo'] <= r['diff'] <= r['hi'])
check('D_holm_rows_diff_praw_and_nesting', all(ok_rows), 'per row: diff = mean, p_raw = the unadjusted bootstrap p, Holm interval contains the 95 % one', ok_rows)
check('D_holm_p_holm_is_step_down', all(close(r['p_holm'], h) for r, h in zip(recs, holm_by_hand(p_raw))), 'p_raw', [round(p, 4) for p in p_raw],
      'p_holm', [round(r['p_holm'], 4) for r in recs])
levels = sorted(r['level'] for r in recs)
mono = all(recs[i]['level'] >= recs[j]['level'] for i in range(5) for j in range(5) if p_raw[i] < p_raw[j])
check('D_holm_level_by_p_rank', all(close(a, b) for a, b in zip(levels, sorted(1 - 0.05 / k for k in range(1, 6)))) and mono
      and close(max(r['level'] for r in recs if r['p_raw'] == min(p_raw)), 0.99),
      'levels', [round(r['level'], 5) for r in recs], 'smaller p -> level at least as high; smallest p at 0.99')
check('D_holm_wording_ruling62', 'percentile intervals at Holm-adjusted levels' in rsrc
      and 'percentile interval at Holm-adjusted level' in open(os.path.join(TRAIN, 'write_result.py'), encoding='utf-8').read(),
      'report.py note and write_result.py column header')
ok = finish('selection-freeze-8')
sys.exit(0 if ok else 1)
