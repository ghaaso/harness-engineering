"""Plumbing test of the item-24 adapter (train/answer_level.py + answer_level.js), TUNING data only, on 3 late-50 tune
tasks: every arm alone and fused (the synthetic selectB output of test_item27, OUTR/fakeB/selectB, 3 seeds each),
PLACEBO alone and fused, RRF, PPR, CO and DIR, packed by the shared packer.js with the frozen typed primary's options
(file granularity, signature form, pad none, budgets 2,000/4,000/8,000/16,000, primary 8,000) and scored by score.js
against git truth (files of tune_tasks.jsonl; defs empty), aggregated as item 23. The RRF figures must equal the
host run of the same three tasks (1.0, 0.625, 0.571). Refusal: changed adapter bytes (exit 7).
Ruling 71: those figures are only the lane's "file recall within 8,000 tokens, lane-computed"; item 24 itself is the
grader's, so the run must also write the grader's hand-off (handoff/: HANDOFF.json, tasks.jsonl, ranked/ and answers/
per variant, every file listed with its sha256) holding no truth key and no reference file, with the lane figure
kept apart in lane_file_recall/. The PRE-ruling-71 adapter (r58b/pre/answer_level.py) wrote no hand-off: fail before."""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from r58common import *
import answer_level as al
import shutil, gzip, selectB
ec = al.ec
show_hashes('train/answer_level.py', 'train/answer_level.js', 'r58b/pre/answer_level.py', 'r58c/A/pre/answer_level.py', 'r58c/A/pre/answer_level_r89.py')
# round r58c: the synthetic selectB output of r58b/out/fakeB (read-only), copied with stamps of the CURRENT digest
# (selectB.tables_digest over the synthetic stage r58b/out/fakeB/stageB; no real table is read, ruling 80 / MF-8)
FB = os.path.join(ROOT, 'r58b', 'out', 'fakeB')
# ruling 91: a copy of the synthetic stage whose counts files show the three tasks with scored pool candidates and NO
# scored unrestricted candidate (the synthetic alone unrestricted tables hold none of them, so they may be absent there)
ST91 = os.path.join(fresh(os.path.join(OUTR, 'stage91')), 'stageB'); shutil.copytree(os.path.join(FB, 'stageB', 'tables'), os.path.join(ST91, 'tables'))
shutil.copy(os.path.join(FB, 'stageB', 'plan.json'), os.path.join(ST91, 'plan.json'))
IDS = ('T1-0124', 'T1-0158', 'T1-0282')
for _f in os.listdir(os.path.join(ST91, 'tables')):
    if _f.endswith('_counts.json'):
        json.dump({t: dict(pool=dict(seeds=1, seeds_unscored=0, cands=10, cands_unscored=0), unrestricted=dict(seeds=1, seeds_unscored=1, cands=10, cands_unscored=10))
                   for t in IDS}, open(os.path.join(ST91, 'tables', _f), 'w'))
TB = os.path.join(ST91, 'tables'); PL = os.path.join(ST91, 'plan.json'); PLJ = json.load(open(PL))
TD = selectB.tables_digest(TB, PLJ)
SEL = os.path.join(fresh(os.path.join(OUTR, 'sel_v2')), 'selectB'); shutil.copytree(os.path.join(FB, 'selectB'), SEL)
for _a in al.ARMS:
    _cj = os.path.join(SEL, _a, 'choices.json'); _c = json.load(open(_cj))
    _c['stamp'] = dict(_c.get('stamp') or {}, plan_hash=PLJ['plan_hash'], tables_digest=TD); json.dump(_c, open(_cj, 'w'), indent=1)
print('fake selectB', SEL, 'stamped with plan_hash', PLJ['plan_hash'][:12], 'tables_digest', TD, flush=True)
IDS = ('T1-0124', 'T1-0158', 'T1-0282')
O = fresh(os.path.join(OUTR, 'answer_test'))
rec = al.check_code()
print('frozen record', os.path.basename(al.PRIMARY), 'hash', rec['hash'], 'config', json.dumps(rec.get('config')), flush=True)
res = al.tune(SEL, O, set(IDS), B=1000, tables=TB, plan=PL)
labs = res['lane_file_recall']['labels']
# ---- ruling 71: the grader's hand-off
HO = os.path.join(O, 'handoff'); H = json.load(open(os.path.join(HO, 'HANDOFF.json')))
listed = set(H['files']); ondisk = {os.path.relpath(os.path.join(dp, f), HO).replace(os.sep, '/') for dp, dn, fn in os.walk(HO) for f in fn} - {'HANDOFF.json'}
check('r71_handoff_manifest', H['split'] == 'tune' and H['tasks'] == 3 and listed == ondisk and all(sha(os.path.join(HO, k)) == v for k, v in H['files'].items())
      and len(H['variants']) == res['variants'] and H['options']['primary_budget'] == 8000 and 'grader' in H['note'],
      'files', len(listed), 'variants', len(H['variants']), 'packs', json.dumps(H['packs'])[:120])
ans_files = sorted(f for f in listed if f.startswith('answers/')); rk_files = sorted(f for f in listed if f.startswith('ranked/'))
check('r71_handoff_per_variant', 2 * len(ans_files) == len(rk_files) == 2 * res['variants'] and 'answers/E2_fused_s1.jsonl.gz' in ans_files
      and 'ranked/RRF_unrestricted.jsonl.gz' in rk_files, 'answers', len(ans_files), 'ranked', len(rk_files))
found = al.truth_keys(HO)
hk = set(H) & (set(al.TRUTH_KEYS) - {'files'})
check('r71_handoff_no_truth', not found and not hk and not any(('ref' in f or 'truth' in f) for f in ondisk)
      and not os.path.exists(os.path.join(HO, 'tune_refs.jsonl')) and not os.path.exists(os.path.join(O, 'lane_file_recall', 'tune_refs.jsonl'))
      and not os.path.exists(os.path.join(O, 'work')),
      'truth keys in hand-off rows', found, 'in HANDOFF.json', sorted(hk))
check('r71_lane_figure_labelled_apart', res['lane_file_recall']['label'].startswith('file recall within 8,000 tokens, lane-computed')
      and "not item 24's measure" in res['lane_file_recall']['label'] and 'labels' not in res and 'grader' in res['item24']['measure']
      and res['item24']['handoff_sha256'] == sha(os.path.join(HO, 'HANDOFF.json')), res['lane_file_recall']['label'], '|', res['item24']['status'])
os.makedirs(os.path.join(HO, 'extra')); open(os.path.join(HO, 'extra', 'x.jsonl'), 'w').write(json.dumps(dict(id='T1-0124', truth=['a.py'])) + '\n')
check('r71_truth_check_catches_a_truth_key', al.truth_keys(HO) != [], al.truth_keys(HO))
import shutil; shutil.rmtree(os.path.join(HO, 'extra'))
PRE_O = fresh(os.path.join(OUTR, 'answer_test_pre'))
PRE = load_module('answer_level_pre', os.path.join(ROOT, 'r58b', 'pre', 'answer_level.py'))
PRE.JS = al.JS  # the node side is unchanged (same JS_SHA256); the snapshot folder holds only the .py
rp = PRE.tune(SEL, PRE_O, set(IDS), B=200)
check('r71_pre_wrote_no_handoff', not os.path.exists(os.path.join(PRE_O, 'handoff', 'HANDOFF.json')) and 'labels' in rp and 'item24' not in rp
      and os.path.exists(os.path.join(PRE_O, 'tune_refs.jsonl')),
      'fail before: the pre-ruling-71 adapter wrote', sorted(os.listdir(PRE_O)), 'and reported file recall as item 24 (top-level labels)')
want = {'RRF', 'PPR', 'CO', 'DIR'} | {'%s_%s' % (a, k) for a in ('E1', 'E2', 'E3', 'E4', 'E5', 'PLACEBO') for k in ('alone', 'fused')}
want = {w if w in ('RRF', 'PPR', 'CO', 'DIR') else w + '_mean' for w in want}  # interface v2 item 1
check('al_every_variant_covered', set(labs) == want, 'labels', len(labs), sorted(set(labs) ^ want))
check('al_packed_all', res['packed'].get('packed') == res['variants'] * 3 == (4 + 12 * 3) * 3 and res['tasks'] == 3 and res['lane_file_recall']['scored'].get('scored') == res['variants'] * 3,
      'variants', res['variants'], 'packed', json.dumps(res['packed'])[:200])
check('al_frozen_options', res['packed'].get('config_hash') == '95e990307da3b42b' and res['options'] == dict(record='95e990307da3b42b.json', granularity='file', form='signature', pad='none'),
      json.dumps(res['options']), 'config_hash', res['packed'].get('config_hash'))
rows = [json.loads(l) for l in open(os.path.join(O, 'lane_file_recall', 'per_task.jsonl'))]
rrf = {r['id']: r['primary'] for r in rows if r['arm'] == 'RRF'}
check('al_rrf_equals_host_run', [round(rrf[i], 3) for i in IDS] == [1.0, 0.625, 0.571], json.dumps(rrf))
check('al_seeded_labels', all(set(map(str, labs['%s_fused_mean' % a]['per_seed_primary'])) == {'s1', 's2', 's3'} for a in ('E1', 'E5', 'PLACEBO'))
      and 'per_seed_primary' not in labs['RRF'], 'per-seed rows present for arms, absent for comparators')
check('al_vs_rrf_bootstrap', all('vs_RRF' in labs[l] for l in labs if l != 'RRF') and abs(labs['RRF']['mean']['primary'] - sum(rrf.values()) / 3) < 1e-9,
      'RRF primary mean', labs['RRF']['mean']['primary'])
check('al_budget_8000', res['budget_tokens'] == 8000 and all(0 <= labs[l]['mean']['primary'] <= 1 for l in labs), 'budget', res['budget_tokens'])
for l in ('RRF', 'PPR', 'CO', 'DIR', 'E2_fused_mean', 'PLACEBO_fused_mean'):
    print('answer-level', l, 'primary %.4f' % labs[l]['mean']['primary'], json.dumps(labs[l].get('vs_RRF', {}).get('primary')), flush=True)
real = al.JS_SHA256; al.JS_SHA256 = '0' * 64
rc = exits(al.check_code); al.JS_SHA256 = real
check('al_refuses_changed_js', rc == 7, 'exit', rc)
# ---- this round: answer-level-3 to -7 (pass after on the current adapter; fail before on r58b/pre2/answer_level.py,
# the bytes of the previous round)
PRE2 = load_module('answer_level_pre2', os.path.join(ROOT, 'r58b', 'pre2', 'answer_level.py')); PRE2.JS = al.JS
show_hashes('r58b/pre2/answer_level.py')
W = fresh(os.path.join(OUTR, 'answer_test_r3'))
# answer-level-3: a ranked path with no file node is dropped from the pack -> refused (exit 11) in pack
rk0 = [json.loads(l) for l in gzip.open(os.path.join(HO, 'ranked', 'RRF_unrestricted.jsonl.gz'), 'rt')]
rk0[0]['ranked'] = ['no/such/file_r3.py'] + rk0[0]['ranked']
bad_rk = os.path.join(W, 'RRF_dropped.jsonl.gz')
with gzip.open(bad_rk, 'wt') as f:
    for r in rk0: f.write(json.dumps(r) + '\n')
rc3 = exits(al.pack, bad_rk, os.path.join(HO, 'tasks.jsonl'), os.path.join(W, 'a3.jsonl.gz'))
pk_pre = PRE2.pack(bad_rk, os.path.join(HO, 'tasks.jsonl'), os.path.join(W, 'a3_pre.jsonl.gz'))
check('al3_refuses_dropped_ranked_path', rc3 == 11 and al.no_dropped(dict(ranked_paths_without_file_node=0), 'x') is not None,
      'exit', rc3, '; fail before: the previous adapter packed it with ranked_paths_without_file_node =', pk_pre.get('ranked_paths_without_file_node'))
check('al3_pre_packed_silently', pk_pre.get('ranked_paths_without_file_node') == 1, 'fail before:', json.dumps(pk_pre)[:160])
# answer-level-4: a missing selectB table (one arm-kind, 3 seeds) -> refused (exit 10)
S4 = os.path.join(W, 'sel_missing'); shutil.copytree(SEL, S4)
for sd in (1, 2, 3): os.remove(os.path.join(S4, 'E3', 'fused_unrestricted_s%d.tsv.gz' % sd))
rc4 = exits(al.tune, S4, os.path.join(W, 'o4'), set(IDS), B=50, tables=TB, plan=PL)
# answer-level-7: a non-T1 task row -> refused (assertion)
T7 = os.path.join(W, 'tasks_t2.jsonl')
with open(T7, 'w') as f:
    for l in open(al.TASKS):
        r = json.loads(l)
        if r.get('id') == IDS[0]: r['set'] = 'T2'
        f.write(json.dumps(r) + '\n')
real_tasks = al.TASKS; al.TASKS = T7
try:
    al.tune(SEL, os.path.join(W, 'o7'), set(IDS), B=50, tables=TB, plan=PL); r7 = 'accepted'
except AssertionError as e:
    r7 = 'AssertionError ' + repr(e)[:80]
al.TASKS = real_tasks
PRE2.TASKS = T7
rp2 = PRE2.tune(S4, os.path.join(W, 'o_pre'), set(IDS), B=50)
pre_arms = sorted({json.loads(l)['arm'] for l in open(os.path.join(W, 'o_pre', 'lane_file_recall', 'per_task.jsonl'))})
check('al4_refuses_missing_table', rc4 == 10, 'exit', rc4, '; fail before: the previous adapter ran on', rp2['variants'], 'variants (37, E3_fused absent)')
check('al4_pre_skipped_silently', rp2['variants'] == 37, 'fail before: variants', rp2['variants'])
check('al7_refuses_non_t1_row', r7.startswith('AssertionError'), r7, '; fail before: the previous adapter accepted a T2 row (its run above used it)')
# answer-level-5: a listed common/ file missing -> refused (exit 7)
CP = os.path.join(W, 'common_partial'); os.makedirs(CP)
for f in os.listdir(al.COMMON):
    if f.endswith('.js') and f != 'seed.js': shutil.copy(os.path.join(al.COMMON, f), CP)
real_common = al.COMMON; al.COMMON = CP; rc5 = exits(al.check_code); al.COMMON = real_common
PRE2.COMMON = CP; rc5_pre = exits(PRE2.check_code)
check('al5_refuses_missing_common_file', rc5 == 7 and rc5_pre == 0, 'exit', rc5, '; fail before: the previous adapter passed (exit %s) with common/seed.js absent' % rc5_pre)
# answer-level-6: one naming; label and seed come from the variant list
per_arms = sorted({json.loads(l)['arm'] for l in open(os.path.join(O, 'lane_file_recall', 'per_task.jsonl'))})
check('al6_one_naming', all('|' not in a for a in per_arms) and all(v['name'] == (v['label'] if v['seed'] is None else '%s_s%d' % (v['label'], v['seed']))
                                                                    and v['kind'] in ('comparator', 'alone', 'fused') for v in H['variants'])
      and any(a.endswith('_s1') for a in per_arms), 'arms', per_arms[:3], '; fail before: the previous adapter named', [a for a in pre_arms if '|' in a][:2])
check('al6_pre_used_bar_names', any('|s' in a for a in pre_arms), 'fail before:', pre_arms[:3])
# ---- round r58c (agent A): format v2 (ruling 88, grader-interface-v2) and MF-13 / MF-6; fail before on
# r58c/A/pre/answer_level.py, the bytes at the start of this round
PRE3 = load_module('answer_level_pre3', os.path.join(ROOT, 'r58c', 'A', 'pre', 'answer_level.py')); PRE3.JS = al.JS
V = fresh(os.path.join(OUTR, 'answer_test_v2'))
vs = H['variants']
check('v2_pool_and_unrestricted_lists', all(('ranked/%s_pool.jsonl.gz' % v['name']) in listed and ('ranked/%s_unrestricted.jsonl.gz' % v['name']) in listed for v in vs)
      and len(rk_files) == 2 * len(vs) == 80, 'ranked files', len(rk_files), 'variants', len(vs))
check('v2_mean_rows', H['format'] == al.FORMAT and H['mean_rows'] == sorted('%s_%s_mean' % (a, k) for a in al.ARMS for k in ('alone', 'fused'))
      and all(v['mean_row'] == (v['label'] if v['seed'] is None else v['label'] + '_mean') for v in vs) and all(v['pool_source_sha256'] for v in vs),
      'mean_rows', H['mean_rows'][:3], len(H['mean_rows']))
check('v2_cross_check_and_stamp', H['cross_check']['target'] == 'train/report/tune.json' and H['cross_check']['tolerance'] == 1e-9
      and H['plan_hash'] == PLJ['plan_hash'] and H['tables_digest'] == TD and H['test'] is True and res['test'] is True
      and res['plan_hash'] == PLJ['plan_hash'] and res['tables_digest'] == TD, json.dumps(H['cross_check']['paths']))
row = json.loads(gzip.open(os.path.join(HO, 'ranked', 'E2_fused_s1_pool.jsonl.gz'), 'rt').readline())
check('v2_ranked_row_shape', set(row) == {'id', 'variant', 'ranked'} and row['variant'] == 'E2_fused_s1', 'keys', sorted(row))
S13 = os.path.join(V, 'sel_stale'); shutil.copytree(SEL, S13)
cj = os.path.join(S13, 'E1', 'choices.json'); c = json.load(open(cj)); c['stamp']['tables_digest'] = '0' * 64; json.dump(c, open(cj, 'w'))
rc13 = exits(al.tune, S13, os.path.join(V, 'o13'), set(IDS), B=50, tables=TB, plan=PL)
rp3 = PRE3.tune(S13, os.path.join(V, 'pre'), set(IDS), B=50)
H3 = json.load(open(os.path.join(V, 'pre', 'handoff', 'HANDOFF.json')))
pre_rk = [f for f in H3['files'] if f.startswith('ranked/')]
check('v2_pre_lacked_pool_lists', len(pre_rk) == 40 and not any(f.endswith('_pool.jsonl.gz') for f in pre_rk), 'fail before: ranked files', len(pre_rk))
check('v2_pre_lacked_mean_naming', 'E2_fused' in rp3['lane_file_recall']['labels'] and 'E2_fused_mean' not in rp3['lane_file_recall']['labels']
      and 'mean_rows' not in H3 and 'format' not in H3, 'fail before: labels', sorted(rp3['lane_file_recall']['labels'])[:4])
check('mf13_refuses_stale_digest', rc13 == 12, 'exit', rc13, '; fail before: the round-start adapter ran on the stale stamp and wrote', len(H3['files']), 'files')
check('mf13_pre_lacked_test_and_plan_hash', 'test' not in rp3 and 'plan_hash' not in rp3, 'fail before: answer_level.json keys', sorted(rp3))
S14 = os.path.join(V, 'sel_hole'); shutil.copytree(SEL, S14)
p14 = os.path.join(S14, 'E2', 'fused_pool_s1.tsv.gz'); T14 = ec.read_score_table(p14); T14.pop(IDS[0], None); os.remove(p14); ec.write_score_table(p14, T14)
rc14 = exits(al.tune, S14, os.path.join(V, 'o14'), set(IDS), B=50, tables=TB, plan=PL)
rc14_pre = exits(PRE3.tune, S14, os.path.join(V, 'o14pre'), set(IDS), B=50)
check('mf13_refuses_missing_task', rc14 == 12 and rc14_pre == 0, 'exit', rc14, '; fail before: the round-start adapter exit', rc14_pre, '(the task ranked as unscored)')
# ---- ruling 91: absent tasks counted per variant in the hand-off; an absence the method's own counts contradict is refused
names = {v['name'] for v in H['variants']}
check('r91_absent_tasks_in_handoff', set(H['absent_tasks']) == names and all(set(x) == set(al.SCOPES) for x in H['absent_tasks'].values())
      and H['absent_tasks']['E1_alone_s1'] == dict(pool=0, unrestricted=3) and H['absent_tasks']['RRF'] == dict(pool=0, unrestricted=0)
      and res['absent_tasks'] == H['absent_tasks'], 'E1_alone_s1', H['absent_tasks'].get('E1_alone_s1'), 'CO', H['absent_tasks'].get('CO'), len(H['absent_tasks']), 'variants')
P89 = load_module('answer_level_r89', os.path.join(ROOT, 'r58c', 'A', 'pre', 'answer_level_r89.py')); P89.JS = al.JS
S91 = os.path.join(V, 'sel_91'); shutil.copytree(SEL, S91)
p91 = os.path.join(S91, 'E2', 'alone_pool_s1.tsv.gz'); T91 = ec.read_score_table(p91); T91.pop(IDS[0], None); os.remove(p91); ec.write_score_table(p91, T91)
rc91 = exits(al.tune, S91, os.path.join(V, 'o91'), set(IDS), B=50, tables=TB, plan=PL)
rc91p = exits(P89.tune, S91, os.path.join(V, 'o91pre'), set(IDS), B=50, tables=TB, plan=PL)
check('r91_alone_absent_though_scored_refused', rc91 == 12 and rc91p == 0, 'exit', rc91, '; fail before: the ruling-89 bytes (r58c/A/pre/answer_level_r89.py) exit', rc91p,
      '(counted it as legitimately unscored)')
FRT = fresh(os.path.join(V, 'root91')); C91 = os.path.join(FRT, 'eval', 'comparators'); shutil.copytree(os.path.join(ROOT, 'eval', 'comparators'), C91)
pc = os.path.join(C91, 'CO_pool.tsv.gz'); TC = ec.read_score_table(pc); TC.pop(IDS[0], None); os.remove(pc); ec.write_score_table(pc, TC)
al.COMP_DIR = C91
rc91c = exits(al.tune, SEL, os.path.join(V, 'o91c'), set(IDS), B=50, tables=TB, plan=PL)
al.COMP_DIR = os.path.join(ROOT, 'eval', 'comparators')
P89.ROOT = FRT
rc91cp = exits(P89.tune, SEL, os.path.join(V, 'o91cpre'), set(IDS), B=50, tables=TB, plan=PL)
P89.ROOT = ROOT
check('r91_co_absent_with_co_candidates_refused', rc91c == 12 and rc91cp == 0, 'exit', rc91c, '; fail before: the ruling-89 bytes exit', rc91cp)
# ---- the grader's fixed test sets (coordinator, 2026-11-14): pick8 = late-50 positions 0, 6, ..., 42 by date_order
P8 = al.test_set_ids('pick8'); _bt = {t['task_id']: t for t in ec.load_tasks()}
p8c = sorted({_bt[i]['commit'] for i in P8}, key=lambda c: _bt[[i for i in P8 if _bt[i]['commit'] == c][0]]['date_order'])
COORD8 = ['ec1b5dfb5af0', 'd26c2b056044', 'e31123233553', '1e345dead615', '08e829bef3cb', '245e299d403a', '83b3ef8f4c8e', 'ec2076cfdb35']
check('pick8_named_set', len(P8) == 37 and [c[:12] for c in p8c] == COORD8 and len(al.test_set_ids('late50')) == 313
      and exits(al.test_set_ids, 'pick9') == 2 and exits(al.tune, SEL, os.path.join(V, 'o_p8'), set(IDS), test_set='pick8', tables=TB, plan=PL) == 2,
      'pick8', len(P8), 'tasks on', [c[:12] for c in p8c], '; late50', len(al.test_set_ids('late50')))
saved = {k: os.environ.pop(k) for k in al.REAL_ENV_REFUSED if k in os.environ}
rc_path = exits(al.tune, SEL, os.path.join(V, 'o_real'))
os.environ['GT_TASKS'] = '/gt/tasks.jsonl'; rc_env = exits(al.tune, None, None); os.environ.pop('GT_TASKS')
os.environ.update(saved)
check('mf6_real_refuses_overrides', rc_env == 2 and rc_path == 2 and not hasattr(PRE3, 'env_problems'), 'exit env', rc_env, 'exit path', rc_path,
      '; fail before: the round-start adapter has no env check (env_problems absent)')
ok = finish('item24-adapter')
sys.exit(0 if ok else 1)
