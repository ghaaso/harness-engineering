import sys
p = sys.argv[1] + '/train/r58/tests/test_answer_level.py'
s = open(p, encoding='utf-8').read()
old = """check('al_refuses_changed_js', rc == 7, 'exit', rc)
"""
new = """check('al_refuses_changed_js', rc == 7, 'exit', rc)
# ---- this round: answer-level-3 to -7 (pass after on the current adapter; fail before on r58b/pre2/answer_level.py,
# the bytes of the previous round)
import gzip, shutil
PRE2 = load_module('answer_level_pre2', os.path.join(ROOT, 'r58b', 'pre2', 'answer_level.py')); PRE2.JS = al.JS
show_hashes('r58b/pre2/answer_level.py')
W = fresh(os.path.join(OUTR, 'answer_test_r3'))
# answer-level-3: a ranked path with no file node is dropped from the pack -> refused (exit 11) in pack
rk0 = [json.loads(l) for l in gzip.open(os.path.join(HO, 'ranked', 'RRF_unrestricted.jsonl.gz'), 'rt')]
rk0[0]['ranked'] = ['no/such/file_r3.py'] + rk0[0]['ranked']
bad_rk = os.path.join(W, 'RRF_dropped.jsonl.gz')
with gzip.open(bad_rk, 'wt') as f:
    for r in rk0: f.write(json.dumps(r) + '\\n')
rc3 = exits(al.pack, bad_rk, os.path.join(HO, 'tasks.jsonl'), os.path.join(W, 'a3.jsonl.gz'))
pk_pre = PRE2.pack(bad_rk, os.path.join(HO, 'tasks.jsonl'), os.path.join(W, 'a3_pre.jsonl.gz'))
check('al3_refuses_dropped_ranked_path', rc3 == 11 and al.no_dropped(dict(ranked_paths_without_file_node=0), 'x') is not None,
      'exit', rc3, '; fail before: the previous adapter packed it with ranked_paths_without_file_node =', pk_pre.get('ranked_paths_without_file_node'))
check('al3_pre_packed_silently', pk_pre.get('ranked_paths_without_file_node') == 1, 'fail before:', json.dumps(pk_pre)[:160])
# answer-level-4: a missing selectB table (one arm-kind, 3 seeds) -> refused (exit 10)
S4 = os.path.join(W, 'sel_missing'); shutil.copytree(os.path.join(OUTR, 'fakeB', 'selectB'), S4)
for sd in (1, 2, 3): os.remove(os.path.join(S4, 'E3', 'fused_unrestricted_s%d.tsv.gz' % sd))
rc4 = exits(al.tune, S4, os.path.join(W, 'o4'), set(IDS), B=50)
# answer-level-7: a non-T1 task row -> refused (assertion)
T7 = os.path.join(W, 'tasks_t2.jsonl')
with open(T7, 'w') as f:
    for l in open(al.TASKS):
        r = json.loads(l)
        if r.get('id') == IDS[0]: r['set'] = 'T2'
        f.write(json.dumps(r) + '\\n')
real_tasks = al.TASKS; al.TASKS = T7
try:
    al.tune(os.path.join(OUTR, 'fakeB', 'selectB'), os.path.join(W, 'o7'), set(IDS), B=50); r7 = 'accepted'
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
"""
assert s.count(old) == 1
s = s.replace(old, new)
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('patched test_answer_level.py')
