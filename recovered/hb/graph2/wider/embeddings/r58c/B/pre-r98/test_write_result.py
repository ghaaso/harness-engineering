"""Plumbing test of train/write_result.py (round r58c: MF-5, MF-12, MF-13, MF-14, V7 and the write_result notes) and of
report.py's real-mode record (MF-13). SELF-CONTAINED (V7): every input is built here under OUTR/wr (a fake lane with
synthetic assembled tables over the tune candidate lists, selectB.run and report.main on it with the guard bypassed
in-process, item27 --test, item22 --test, a synthetic answer-level record and hand-off, a synthetic leak audit, anchor
and assemble-checks log, and synthetic grader returns in grader-interface-v2's exact shape). No other test's output,
no real stage-B table and nothing under train/stageB/ is read (MF-8); the plan is r58c/B/frozen/plan.json with a test
plan_hash. Fail-before: r58c/B/pre/write_result.py and r58c/B/pre/report.py (agent B's before bytes) on the same inputs.
usage (ktest-b container): R58_OUT=/w/r58c/B/out/test_write_result python /w/train/r58/tests/test_write_result.py"""
import os, sys, json, shutil, hashlib, math, copy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from r58common import *
import evalcore as ec
import selectB, report, item27, item22, write_result as wr
show_hashes('train/write_result.py', 'train/report.py', 'train/item22.py', 'train/selectB.py', 'r58c/B/pre/write_result.py', 'r58c/B/pre/report.py',
            'train/r58/tests/test_write_result.py', 'r58c/B/pre-r96/write_result.py', 'r58c/B/pre-r97/write_result.py')
D = fresh(os.path.join(OUTR, 'wr')); FB = os.path.join(D, 'fakeB'); TB = os.path.join(FB, 'stageB', 'tables'); os.makedirs(TB)
plan = json.load(open(os.path.join(ROOT, 'r58c', 'B', 'frozen', 'plan.json')))
plan = dict(plan, plan_hash='7e57' * 16)  # ruling 80: test tables never carry the real plan_hash
json.dump(plan, open(os.path.join(FB, 'stageB', 'plan.json'), 'w'))
EMB = ('E1', 'E2', 'E3', 'E4', 'E5'); BONUS = dict(E1=0.25, E2=0.6, E3=0.25, E4=0.0, E5=0.0)
tasks = ec.load_tasks(); cl = selectB.cand_lists()
for arm in EMB:
    for c in plan['configs'][arm]:
        for s in (1, 2, 3):
            base = os.path.join(TB, '%s_%s_s%d' % (arm, c['config_id'], s)); tab = {}
            for t in tasks:
                nz = selectB.placebo(s, t['task_id'], cl['pool'].get(t['task_id'], []), 'wr|%s|%s' % (arm, c['config_id'])); tr = set(t['truth'])
                tab[t['task_id']] = {x: v + (BONUS[arm] if x in tr else 0.0) for x, v in nz.items()}
            ec.write_score_table(base + '_pool.tsv.gz', tab); ec.write_score_table(base + '_unrestricted.tsv.gz', {})
            json.dump({}, open(base + '_counts.json', 'w'))
            json.dump(dict(plan_hash=plan['plan_hash'], parts=53, tasks=len(tasks),
                           runners=[dict(runner='detrun.py stageB.py det=1' if arm == 'E4' else 'stageB.py', processes=1)]), open(base + '_meta.json', 'w'))
guard = selectB.r58_guard; selectB.HERE = FB; selectB.r58_guard = lambda *a, **k: None
selectB.run(list(EMB) + ['PLACEBO'], os.path.join(FB, 'selectB'))
# ---- report.py real mode on the fake lane (MF-13: tune.json carries test, plan_hash and the stamp; MF-1: exit 7)
report.HERE = FB; report.r58_guard = lambda *a, **k: None; report.B = 300
report.main(test=False)
TUNE = os.path.join(FB, 'report', 'tune.json'); T = json.load(open(TUNE))
st = T.get('stamp') or {}
check('mf13_tune_json_record', T.get('test') is False and T.get('plan_hash') == plan['plan_hash'] and st.get('tables_digest') == selectB.tables_digest(TB, plan)
      and st.get('report_sha256') == sha(os.path.join(TRAIN, 'report.py')) and st.get('selectB_sha256') == sha(os.path.join(TRAIN, 'selectB.py'))
      and st.get('plan_hash') == plan['plan_hash'] and set(st.get('choices_sha256') or {}) == set(EMB) | {'PLACEBO'}, json.dumps(st)[:240])
PRER = load_module('report_preB', os.path.join(ROOT, 'r58c', 'B', 'pre', 'report.py'))
FBP = os.path.join(D, 'fakeB_pre'); shutil.copytree(FB, FBP, ignore=shutil.ignore_patterns('report'))
PRER.HERE = FBP; PRER.r58_guard = lambda *a, **k: None; PRER.B = 100
selectB.HERE = FBP; rc = exits(PRER.main, False); selectB.HERE = FB
TP = json.load(open(os.path.join(FBP, 'report', 'tune.json'))) if os.path.exists(os.path.join(FBP, 'report', 'tune.json')) else {}
check('mf13_fail_before_pre_report_record', rc != 0 or not ('test' in TP and 'plan_hash' in TP and (TP.get('stamp') or {}).get('report_sha256')),
      'fail before: r58c/B/pre/report.py exit', rc, 'keys test/plan_hash/stamp.report_sha256:', 'test' in TP, 'plan_hash' in TP, bool((TP.get('stamp') or {}).get('report_sha256')))
calls = []
real_cs = report.check_stamps
def drifting(*a, **k):
    s = real_cs(*a, **k); calls.append(1)
    return s if len(calls) == 1 else dict(s, tables_digest='0' * 64)
report.check_stamps = drifting; os.rename(TUNE, TUNE + '.keep')
rc7 = exits(report.main, False); report.check_stamps = real_cs
check('mf1_report_exit7_when_the_stamp_changes_during_the_run', rc7 == 7 and not os.path.exists(TUNE), 'exit', rc7)
os.rename(TUNE + '.keep', TUNE)
# ---- item 27 (test record), item 22 (test record)
R27P = os.path.join(FB, 'heldout', 'item27.json')
rec, h27 = item27.main(['--root', ROOT, '--tables', TB, '--plan', os.path.join(FB, 'stageB', 'plan.json'), '--sel', os.path.join(FB, 'selectB'),
                        '--test', '--device', 'cpu', '--image-id', 'sha256:wr-test', '--out', R27P])
ARM = rec['chosen']['arm']
selectB.r58_guard = guard
PARTS = os.path.join(D, 'parts'); os.makedirs(PARTS)
I22P = os.path.join(D, 'item22', 'item22.json')
item22.main(['--out', I22P, '--parts', PARTS, '--no-check', '--plan', os.path.join(FB, 'stageB', 'plan.json')])
I22 = json.load(open(I22P))
check('mf13_item22_record', I22.get('test') is True and I22.get('plan_hash') == plan['plan_hash'] and I22.get('refs_sha256') == sha(os.path.join(TRAIN, 'stageA', 'refs.json'))
      and len(I22.get('top3_sha256') or '') == 64, json.dumps({k: I22.get(k) for k in ('test', 'plan_hash', 'refs_sha256')})[:200])
PRE22 = load_module('item22_preB', os.path.join(ROOT, 'r58c', 'B', 'pre', 'item22.py'))
check('mf13_fail_before_pre_item22', not hasattr(PRE22, 'e5_check') and 'refs_sha256' not in open(os.path.join(ROOT, 'r58c', 'B', 'pre', 'item22.py')).read(),
      'fail before: the old item22.py had no E5 compared-count and wrote no refs_sha256')
check('mf14_e5_check', item22.e5_check({}) == (False, 0) and item22.e5_check({'a': {'injected_reps_equal_kept': True}}) == (True, 1)
      and item22.e5_check({'a': {'injected_reps_equal_kept': True}, 'b': {'injected_reps_equal_kept': False}}) == (False, 2)
      and item22.e5_check({'a': {'error': 'x'}}) == (False, 0), 'E5 fails when no specialist was compared')
rcs22 = dict(bogus=exits(item22.parse, ['--bogus', 'x']), real_out=exits(item22.parse, ['--out', item22.REAL_OUT]))
check('mf6_item22_refusals', rcs22 == dict(bogus=2, real_out=2), json.dumps(rcs22))
# add the check rows write_result prints (synthetic: E4 an injection failure, E5 no specialist compared)
cfg = lambda a: plan['configs'][a][0]['config_id']
I22['check_predict_target'] = dict(
    E1=dict(config_id=cfg('E1'), injected_reps_equal_kept=True, full_order_identical=20, queries=20, max_abs_score_diff=0.0),
    E2=dict(config_id=cfg('E2'), injected_reps_equal_kept=True, full_order_identical=20, queries=20, max_abs_score_diff=None),
    E3=dict(config_id=cfg('E3'), injected_reps_equal_kept=True, full_order_identical=20, queries=20, max_abs_score_diff=1e-7),
    E4=dict(config_id=cfg('E4'), injected_reps_equal_kept=False),
    E5=dict(config_id=cfg('E5'), injected_reps_equal_kept=True, specialists_compared=0, specialists={}))
for a in EMB:
    for r in I22['stage_a']['arms'].get(a, []): r['loss_ratio_as_run'] = None
json.dump(I22, open(I22P, 'w'))
# ---- the tuning hand-off and answer-level record (synthetic, the shape answer_level.py writes)
AD = os.path.join(D, 'answer'); os.makedirs(os.path.join(AD, 'handoff'))
PU = lambda p, u: dict(pool=p, unrestricted=u)  # HANDOFF-FORMAT v2 rev 1 item 10
ABS = {'%s_%s_s%d' % (a, k, s): (PU(2, 1) if k == 'alone' and a == 'E5' else PU(0, 0)) for a in EMB + ('PLACEBO',) for k in wr.KINDS for s in (1, 2, 3)}
ABS.update(RRF=PU(0, 0), PPR=PU(0, 0), DIR=PU(0, 0), CO=PU(3, 2))
HO_T = os.path.join(AD, 'handoff', 'HANDOFF.json'); json.dump({'split': 'tune', 'test': True, wr.ABSENT_KEY: ABS}, open(HO_T, 'w'))
labs = ['%s_%s_mean' % (a, k) for a in EMB + ('PLACEBO',) for k in wr.KINDS] + list(wr.COMPS)
lfr = {l: dict(dict(commits=50, mean=dict(primary=0.5), per_seed_primary=None if l in wr.COMPS else dict(s1=0.5, s2=0.5, s3=0.5)),
               **({} if l == 'RRF' else dict(vs_RRF=dict(primary=dict(diff=0.01, lo=-0.02, hi=0.04, p=0.5))))) for l in labs}  # answer_level.py writes no vs_RRF for RRF
AL = dict(item=24, test=True, plan_hash=plan['plan_hash'], tasks=388, commits=50, variants=40, budget_tokens=8000, packed=40,
          options=dict(record='95e990307da3b42b', form='paths', granularity='file', pad=False),
          item24=dict(files=81, handoff='handoff/HANDOFF.json', handoff_sha256=sha(HO_T), measure='grader', status='handed over'),
          lane_file_recall=dict(label='file recall within 8,000 tokens, lane-computed', labels=lfr, refs='git files', scored=388))
ALP = os.path.join(AD, 'answer_level.json'); json.dump(AL, open(ALP, 'w'))
# ---- leak audit, held-out hand-off, anchor, assemble-checks log
R92T = 'RULING-92-GUARDS-TEXT both guards run kge-B1 the same way apart from the disk values.'
LKP = os.path.join(D, 'leak_audit.json')
json.dump(dict(ok=True, test=True, plan_hash=plan['plan_hash'], splits=dict(tune=dict(checkpoints=53, tasks=388), heldout=dict(checkpoints=70, tasks=418)),
               failures=[], mounts=[1, 2, 3], c4_parts=2385, ruling92=dict(ok=True, text=R92T)), open(LKP, 'w'))
HOF = os.path.join(D, 'heldout', 'HANDOFF.json'); os.makedirs(os.path.dirname(HOF))
json.dump({'split': 'heldout', 'test': True, 'freeze_sha256': sha(R27P), 'tasks': 418, 'commits': 75,
           wr.ABSENT_KEY: {v: (PU(1, 1) if v == 'CO' else PU(0, 0)) for v in wr.ho_variants(rec['chosen']['arm']) if not v.endswith('_mean')}}, open(HOF, 'w'))
ANC = os.path.join(D, 'progress.jsonl')
open(ANC, 'w').write(json.dumps(dict(step='coordinator', unit='preflight_e4_det', status='accepted: E4 c13 and c16 repeat byte for byte', file='r58c/preflight/rec.jsonl')) + '\n'
                     + json.dumps(dict(step='coordinator', unit='item27_freeze', file='train/heldout/item27.json', sha256=sha(R27P))) + '\n')
ACL = os.path.join(D, 'assemble_checks.log')
open(ACL, 'w').write('sha256 %s orchestrator/assemble_checks.py\ne4_det1 477 of 477 e4_parts, planned 477\ntables_digest %s\nassemble_checks PASS\n' % ('a' * 64, 'b' * 64))
PROTO = wr.PROTOCOL
check('protocol_mounted', os.path.exists(PROTO), PROTO)
# ---- the grader's returns (grader-interface-v2 section 6, exact keys)
SCORER = dict(files_sha256='1' * 64, evalcore_sha256='2' * 64, score_js_sha256='3' * 64)
A50 = T['arms']['late50']; C50 = T['comparators']['late50']
def lane_val(v, sc, m):
    if v in wr.COMPS: return C50[sc][v][m]
    b, s = v.rsplit('_', 1); d = A50[sc][b]
    return d['seed_mean'][m] if s == 'mean' else d['per_seed'][s[1:]][m]
TR = dict(split='tune', test=True, handoff_sha256=sha(HO_T), tasks=388, commits=50, scorer=SCORER, truth=dict(rule='item 4', tasks_checked=388, equal_to_lane=388),
          rank={v: {sc: {m: lane_val(v, sc, m) for m in wr.METRICS} for sc in wr.SCOPES} for v in wr.TUNE_ROWS})
AGR = dict(split='tune', test=True, handoff_sha256=sha(HO_T), tasks=388, commits=50, scorer=SCORER,
           labels={l: dict(dict(mean=dict(primary=0.4 + 0.01 * i)), **({} if l in wr.COMPS else dict(per_seed=dict(s1=0.4, s2=0.41, s3=0.42))),
                           **({} if l == 'RRF' else dict(vs_RRF=dict(primary=dict(diff=0.02, lo=-0.01, hi=0.05, p=0.2))))) for i, l in enumerate(wr.LABELS16)})
vs = wr.ho_variants(ARM)
HOR = dict(split='heldout', arm=ARM, test=True, freeze_sha256=sha(R27P), handoff_sha256=sha(HOF), commits=75, tasks=418, scorer=SCORER,
           rank={v: {sc: {m: round(0.1 + 0.01 * i + 0.001 * j, 4) for j, m in enumerate(wr.METRICS)} for sc in wr.SCOPES} for i, v in enumerate(vs)},
           answer_level={v: round(0.5 + 0.01 * i, 4) for i, v in enumerate(vs)},
           vs_RRF={'%s_%s_mean' % (ARM, k): {f: dict(diff=0.01, lo=-0.03, hi=0.05) for f in ('pool_P@10', 'unrestricted_P@10', 'answer_level')} for k in ('fused', 'alone')},
           literal_check=dict(tasks=418, task_commit_in_checkpoint_history=0, parent_mismatch=0))
GR = os.path.join(D, 'grader-returns'); os.makedirs(GR)
def put(name, obj):
    p = os.path.join(GR, name); json.dump(obj, open(p, 'w')); return p
TRP, AGP, HOP = put('tune-rank.json', TR), put('tune-item24.json', AGR), put('heldout.json', HOR)
# ruling 97 (b), (d) and D1: a synthetic route-audit output (r58c/B/e5_route_audit.py's keys) for the frozen arm E5
RTP = os.path.join(D, 'e5_route.json')
RT97 = dict(test=True, ruling='97 (b), (d)', arm='E5', config_id='c99', applies=True, item27_sha256=sha(R27P), kge_sha256='k' * 64, self_sha256='s' * 64,
            route=dict(tasks=418, two_specialists=301, second_other=23, skipped=9, skipped_second_other=8, skipped_first=1, parents=70, checkpoints=70),
            pool=dict(late50=dict(tasks=313, median=41), heldout=dict(tasks=418, median=57.5), sources=dict(late50='E5_c99_s1_counts.json')))
json.dump(RT97, open(RTP, 'w'))
base = ['--test', '--tune', TUNE, '--item22', I22P, '--answer', ALP, '--leak', LKP, '--item27', R27P, '--plan', os.path.join(FB, 'stageB', 'plan.json'),
        '--handoff', HOF, '--anchor', ANC, '--ac-log', ACL, '--protocol', PROTO]
full = base + ['--tune-rank', TRP, '--answer-graded', AGP, '--heldout', HOP]
O = fresh(os.path.join(D, 'out_full'))
rc = exits(wr.main, full + ['--route', RTP, '--outdir', O])
md = open(os.path.join(O, 'RESULT.md')).read() if os.path.exists(os.path.join(O, 'RESULT.md')) else ''
J = json.load(open(os.path.join(O, 'result.json'))) if os.path.exists(os.path.join(O, 'result.json')) else {}
n_lines = len(md.splitlines())
check('wr_full_run', rc == 0 and md != '', 'exit', rc)
check('wr_worst_case_under_150_lines', 0 < n_lines < 150, 'lines with every return, a 16-row graded item-24 table and the held-out table:', n_lines)
check('wr_own_sha256_and_inputs', J.get('write_result_sha256') == sha(os.path.join(TRAIN, 'write_result.py')) and J.get('test') is True
      and {'tune', 'item22', 'answer', 'answer_graded', 'tune_rank', 'leak', 'item27', 'heldout', 'handoff', 'plan', 'protocol', 'anchor', 'ac_log'} <= set(J.get('inputs', {})),
      sorted(J.get('inputs', {})))
check('wr_aggregates_only', all(t['task_id'] not in md for t in tasks if len(str(t['task_id'])) >= 6), 'no task id in RESULT.md')
# MF-14 wording
items = {n: wr.ruling_text(PROTO, n) for n in wr.LIMIT_ITEMS}
check('mf14_items_28_31_verbatim', all(t and ('- Item ' + t) in md for t in items.values()), [n for n, t in items.items() if not t or ('- Item ' + t) not in md])
rul = {n: wr.ruling_text(PROTO, n) for n in wr.LIMIT_RULINGS}
check('mf14_limit_rulings_verbatim', all(t and ('- Ruling ' + t) in md for t in rul.values()), [n for n, t in rul.items() if not t or ('- Ruling ' + t) not in md])
R74 = wr.r74_sentence(PROTO)
check('mf14_r74_sentence', bool(R74) and ('E4 (ruling 74): ' + R74) in md, 'ruling 74 sentence:', R74)
# ruling 96 (c): the limits name the difference between the splits (word for word from the protocol's paragraph 96)
R96 = wr.r96_limit(PROTO); LIM = md.split('## Limits', 1)[-1].split('## Sources', 1)[0] if '## Limits' in md else ''
check('r96c_split_difference_in_limits', bool(R96) and ('- ' + R96 + '\n') in LIM
      and 'the held-out graphs carry a layer the tuning graphs lack, so the settings were chosen on graphs without it' in R96
      and '37 relation types against 36' in R96 and J.get('limits', {}).get('96c') == R96, 'ruling 96 (c) line:', R96)
P96 = os.path.join(D, 'protocol-no96.md')
open(P96, 'w', encoding='utf-8').write(open(PROTO, encoding='utf-8').read().replace('so the settings were chosen on graphs without it', 'so the settings were picked on graphs without it'))
check('r96c_missing_sentence_is_found_missing', wr.r96_limit(P96) is None and wr.ruling_text(P96, 96) is not None, 'a protocol whose (c) sentence differs')
PR96 = load_module('write_result_pre_r96', os.path.join(ROOT, 'r58c', 'B', 'pre-r96', 'write_result.py'))
O96 = fresh(os.path.join(D, 'out_pre_r96')); rc96p = exits(PR96.main, full + ['--outdir', O96])
md96p = open(os.path.join(O96, 'RESULT.md')).read() if os.path.exists(os.path.join(O96, 'RESULT.md')) else ''
check('r96c_fail_before_pre_r96', rc96p == 0 and md96p != '' and 'carry a layer the tuning graphs lack' not in md96p and not hasattr(PR96, 'r96_limit'),
      'fail before: r58c/B/pre-r96/write_result.py exit', rc96p, '| names the difference:', 'carry a layer the tuning graphs lack' in md96p)
# ruling 97 (b), (d) and D1: the three limit lines, word for word from the protocol's paragraph 97, with the route audit's counts
TX97 = wr.r97_texts(PROTO)
L97 = (["Ruling 97 (b), E5's routing on held-out: %s; %s. In this run: frozen arm E5: on 23 of 418 held-out tasks the second specialist was `other`;"
        " on 9 a routed specialist was skipped (kge.route; e5_route.json)." % (TX97[0], TX97[1]),
        "Ruling 97 (d): %s; median pool size: late 50 41 (313 tasks), held-out 57.5 (418 tasks) (from the parts' and the stage-B counts)." % TX97[2],
        'Under ruling 97 (d), D1 (r58c/closed-lists/FINDINGS-common.md): On held-out, the PPR comparator and the PPR half of every fused variant walk through'
        ' the new hub. Their orders, and with them what each budget packs, therefore change on graphs the settings never saw, alike for every'
        " arm's fused form."]) if TX97 else None
check('r97_protocol_texts_found', TX97 is not None and TX97[0].startswith('a file seed tied to the new nodes can get the `other` specialist')
      and TX97[1].startswith("This is item 13's rule") and 'file-collapsed graph' in TX97[2] and TX97[2].endswith('for every method alike'), TX97)
LINE97 = ('- ' + ' '.join(L97)) if L97 else None  # one bullet: RESULT.md's worst case stays under 150 lines
check('r97_one_limit_bullet', bool(L97) and (LINE97 + '\n') in LIM and sum(1 for l in LIM.splitlines() if 'Ruling 97' in l) == 1,
      'ruling 97 bullet:', [l[:160] for l in LIM.splitlines() if '97' in l])
check('r97b_routing_part_with_counts', bool(L97) and ('- ' + L97[0] + ' ') in md and 'on 23 of 418 held-out tasks the second specialist was `other`; on 9 a routed specialist was skipped' in L97[0], L97 and L97[0][-200:])
check('r97d_pool_part_with_medians', bool(L97) and (' ' + L97[1] + ' ') in md and 'late 50 41 (313 tasks), held-out 57.5 (418 tasks)' in L97[1], L97 and L97[1][-160:])
check('r97d_D1_part', bool(L97) and (' ' + L97[2] + '\n') in md, L97 and L97[2])
check('r97_result_json', J.get('limits', {}).get('97') == L97 and (J.get('route') or {}).get('route') == RT97['route']
      and (J.get('route') or {}).get('pool') == RT97['pool'] and 'route' in J.get('inputs', {}), J.get('limits', {}).get('97'))
l_other = wr.r97_lines(PROTO, dict(RT97, arm='E1', applies=False, route=None)); l_none = wr.r97_lines(PROTO, None)
check('r97b_names_the_change_in_every_case', len(l_other) == len(l_none) == 3
      and all(l[0].startswith("Ruling 97 (b), E5's routing on held-out: " + TX97[0]) for l in (l_other, l_none))
      and 'the frozen arm is E1, not E5: the counts are not computed' in l_other[0] and 'e5_route.json not given: the counts are n/a' in l_none[0]
      and 'late 50 41 (313 tasks), held-out 57.5 (418 tasks)' in l_other[1] and 'e5_route.json not given (n/a)' in l_none[1]
      and l_other[2] == l_none[2] == L97[2], l_other, l_none)
P97 = os.path.join(D, 'protocol-no97.md')
open(P97, 'w', encoding='utf-8').write(open(PROTO, encoding='utf-8').read().replace("E5's routing as coded", "E5's routing as written"))
check('r97_missing_text_is_found_missing', wr.r97_texts(P97) is None and wr.ruling_text(P97, 97) is not None
      and wr.r97_lines(P97, RT97) == ['Ruling 97 (b), (d): TEXT NOT FOUND in %s' % P97], 'a protocol whose (b) clause differs')
PR97 = load_module('write_result_pre_r97', os.path.join(ROOT, 'r58c', 'B', 'pre-r97', 'write_result.py'))
O97 = fresh(os.path.join(D, 'out_pre_r97')); rc97p = exits(PR97.main, full + ['--outdir', O97])
md97p = open(os.path.join(O97, 'RESULT.md')).read() if os.path.exists(os.path.join(O97, 'RESULT.md')) else ''
rc97r = exits(PR97.main, full + ['--route', RTP, '--outdir', os.path.join(D, 'x', 'pre97_route')])
check('r97_fail_before_pre_r97', rc97p == 0 and md97p != '' and 'Ruling 97' not in md97p and 'walk through the new hub' not in md97p
      and rc97r == 2 and not hasattr(PR97, 'r97_lines'),
      'fail before: r58c/B/pre-r97/write_result.py exit', rc97p, '| a ruling-97 line:', 'Ruling 97' in md97p, '| with --route exit', rc97r)
check('mf14_injection_failed', '%s: injection FAILED' % cfg('E4') in md, 'E4 injection failure printed')
check('mf14_e5_no_specialist_failed', 'FAILED (0 specialist(s) compared)' in md, 'E5 fails when no specialist is compared')
check('mf14_e4_facts', 'every planned stage-B E4 part ran with det=1 (assemble_checks: 477 of 477, planned 477)' in md and 'preflight_e4_det: accepted' in md
      and 'Ruling 68: E5 is held to identical score tables and counts' in md, 'rulings 67, 68, 87')
check('mf14_distinct_checkpoint_pairs', 'distinct (checkpoint, path) pairs' in md and 'distinct (checkpoint, path) pairs (ruling 76)' in md, 'ruling 76')
check('note_no_bar_in_max_abs_diff', 'max abs diff' in md and '|diff|' not in md, 'markdown-safe')
check('note_f3_none_prints_na', '/a' not in md.replace('n/a', ''), 'f3(None)[1:] printed "/a"')
check('mf12_heldout_lines', wr.R88G in md and wr.ITEM7 in md and 'minus RRF (seed mean' in md and "grader's literal check (ruling 73): 418 tasks" in md
      and all(('| %s | ' % v) in md for v in vs), 'item 7, 88g, vs_RRF, literal check, variant rows')
check('mf12_tune_rank_line', "Grader's tuning rank check (ruling 88b): %d cells" % (len(wr.TUNE_ROWS) * 8) in md and J.get('tune_rank_check', {}).get('max_abs_diff') == 0.0,
      J.get('tune_rank_check'))
check('r91_absent_counts_beside_figures', '| tasks absent pool/unrestricted (ruling 91) |' in md
      and any(l.startswith('| E5 |') and l.rstrip().endswith('| 2/1, 2/1, 2/1 ; 0/0, 0/0, 0/0 |') for l in md.splitlines())
      and any(l.startswith('| CO |') and l.rstrip().endswith('| 3/2 |') for l in md.splitlines() if '0.' in l)
      and any(l.startswith('| CO | ') and l.rstrip().endswith('| 1/1 |') for l in md.splitlines() if l.count('|') > 10),
      'tuning table and held-out table carry the hand-off counts', [l for l in md.splitlines() if l.startswith('| E5 |') or l.startswith('| CO |')][:3])
# MF-12 (format rev 1 item 10): the reader takes {variant: {pool, unrestricted}} and refuses any other shape;
# the r58c/B/pre-mf12 bytes printed the dicts raw and accepted scalar counts.
PM = load_module('write_result_pre_mf12', os.path.join(ROOT, 'r58c', 'B', 'pre-mf12', 'write_result.py'))
SCAL = {'CO': 3, 'E5_alone_s1': 2}
BADS = [SCAL, {'CO': PU(1, -1)}, {'CO': dict(pool=1)}, {'CO': dict(pool=True, unrestricted=0)}, {}, [PU(0, 0)]]
def mf12_ok(m):
    cell = m.absent_cell(ABS, ['E5_alone', 'E5_fused']); mean = m.absent_cell(ABS, ['E5_alone_mean'])
    rd = fresh(os.path.join(D, 'mf12_' + m.__name__)); res = []
    for i, v in enumerate(BADS):
        p = os.path.join(rd, '%d.json' % i); json.dump({m.ABSENT_KEY: v}, open(p, 'w')); res.append(m.absent_counts(p))
    return (cell == '2/1, 2/1, 2/1 ; 0/0, 0/0, 0/0' and mean == '2/1, 2/1, 2/1' and all(r is None for r in res)), (cell, mean, res)
ok_new, ev_new = mf12_ok(wr); ok_pre, ev_pre = mf12_ok(PM)
# leak_audit.json ruling92.text (agent A, leak_audit.py 629c0df3) beside the leak-audit line; the pre-mf12 bytes drop it
O92 = fresh(os.path.join(D, 'out_pre92')); rc92 = exits(PM.main, full + ['--outdir', O92])
md92 = open(os.path.join(O92, 'RESULT.md')).read() if os.path.exists(os.path.join(O92, 'RESULT.md')) else ''
check('r92_text_printed_pass_after', R92T in md and (J.get('leak_audit') or {}).get('ruling92', {}).get('text') == R92T, 'RESULT.md and result.json')
check('r92_text_printed_fail_before', rc92 == 0 and md92 and R92T not in md92, 'pre-mf12 exit', rc92, 'wrote', bool(md92))
check('mf12_absent_shape_pass_after', ok_new, ev_new)
check('mf12_absent_shape_fail_before', not ok_pre, ev_pre)
check('mf12_item24_grader_table', '| ranked list | item 24 (grader) | minus RRF [95 %] |' in md and '### Item 24 (grader, tune-item24.json)' in md, 'graded labels normalised')
# ---- fail before: the same inputs through agent B's before bytes
PREW = load_module('write_result_preB', os.path.join(ROOT, 'r58c', 'B', 'pre', 'write_result.py'))
OP = fresh(os.path.join(D, 'out_pre'))
pre_args = list(base)  # the old writer takes any --key value pair; the extra ones are ignored there
try:
    rcp = exits(PREW.main, pre_args + ['--outdir', OP])
except Exception as e:  # the old writer crashes on a None max_abs_score_diff ('%.1e' % None): that is the defect
    rcp = 'crash %s: %s' % (type(e).__name__, e)
mdp = open(os.path.join(OP, 'RESULT.md')).read() if os.path.exists(os.path.join(OP, 'RESULT.md')) else ''
Jp = json.load(open(os.path.join(OP, 'result.json'))) if os.path.exists(os.path.join(OP, 'result.json')) else {}
check('fail_before_pre_writer', rcp != 0 or ('|diff|' in mdp or '/a' in mdp.replace('n/a', '')) and 'write_result_sha256' not in Jp
      and 'injection FAILED' not in mdp and 'FAILED (0 specialist' not in mdp and items[28] not in mdp,
      'fail before: exit', rcp, '| "|diff|" or "/a" present:', '|diff|' in mdp, '/a' in mdp.replace('n/a', ''), '| own sha256:', 'write_result_sha256' in Jp,
      '| injection FAILED:', 'injection FAILED' in mdp, '| item 28 verbatim:', bool(items[28]) and items[28] in mdp)
os.makedirs(os.path.join(D, 'x'), exist_ok=True)
pre_ok = [x for i, x in enumerate(pre_args) if x != '--item22' and (i == 0 or pre_args[i - 1] != '--item22')]  # inputs it can print
rc_unknown_pre = exits(PREW.main, pre_ok + ['--bogus', 'x', '--outdir', os.path.join(D, 'x', 'pre_unknown')])
# the deliverable folder stands in as a temp folder for both writers (never the repo's)
FD = os.path.join(D, 'deliv'); os.makedirs(FD); real_deliv = (PREW.DELIVERABLE, wr.DELIVERABLE); PREW.DELIVERABLE = wr.DELIVERABLE = FD
rc_sub_pre = exits(PREW.main, pre_ok + ['--outdir', os.path.join(FD, 'sub')]); wrote_pre = os.path.exists(os.path.join(FD, 'sub', 'RESULT.md'))
rc_sub_new = exits(wr.main, full + ['--outdir', os.path.join(FD, 'sub2')]); wrote_new = os.path.exists(os.path.join(FD, 'sub2'))
PREW.DELIVERABLE, wr.DELIVERABLE = real_deliv
check('fail_before_pre_options', rc_unknown_pre == 0 and rc_sub_pre == 0 and wrote_pre, 'fail before: the old writer exit', rc_unknown_pre,
      'on an unknown option; exit', rc_sub_pre, 'and wrote', wrote_pre, 'under a deliverable subfolder')
check('note_subfolder_refused', rc_sub_new == 8 and not wrote_new, 'the current writer: exit', rc_sub_new, 'wrote', wrote_new)
# ---- refusals (MF-6, MF-12, notes)
rcs = dict(unknown=exits(wr.main, full + ['--bogus', 'x', '--outdir', os.path.join(D, 'x', 'u')]),
           test_final=exits(wr.main, full + ['--final', '--outdir', os.path.join(D, 'x', 'tf')]),
           deliverable=exits(wr.main, full + ['--outdir', wr.DELIVERABLE]),
           deliverable_sub=exits(wr.main, full + ['--outdir', os.path.join(wr.DELIVERABLE, 'sub', 'dir')]),
           no_outdir=exits(wr.main, full),
           real_with_option=exits(wr.main, ['--tune', TUNE]))
env0 = os.environ.get('EMB_ROOT'); os.environ['EMB_ROOT'] = '/tmp/not-the-lane'; rcs['real_other_root'] = exits(wr.main, []); os.environ['EMB_ROOT'] = env0 or '/w'
os.environ['FIXFLOW_REPO'] = '/repo'; rcs['real_fixflow_repo'] = exits(wr.main, []); del os.environ['FIXFLOW_REPO']
check('mf6_refusals', rcs == dict(unknown=2, test_final=2, deliverable=8, deliverable_sub=8, no_outdir=2, real_with_option=2, real_other_root=2, real_fixflow_repo=2),
      json.dumps(rcs))
# ---- END-ORDER 2e: --test reads LANE/grader-returns/test/ when no return is named (a temp lane root stands in)
root0 = wr.ROOT; FR = os.path.join(D, 'fakeroot'); os.makedirs(os.path.join(FR, 'grader-returns', 'test'))
for n, p in (('tune-rank.json', TRP), ('tune-item24.json', AGP), ('heldout.json', HOP)): shutil.copy(p, os.path.join(FR, 'grader-returns', 'test', n))
shutil.copy(TRP, os.path.join(FR, 'grader-returns', 'tune-rank.json'))
wr.ROOT = FR
O2 = os.path.join(D, 'x', 'default_returns'); rc_def = exits(wr.main, base + ['--outdir', O2])
J2 = json.load(open(os.path.join(O2, 'result.json'))) if os.path.exists(os.path.join(O2, 'result.json')) else {}
rc_realret = exits(wr.main, base + ['--tune-rank', os.path.join(FR, 'grader-returns', 'tune-rank.json'), '--outdir', os.path.join(D, 'x', 'rr')])
wr.ROOT = root0
check('e2e_test_reads_grader_returns_test', rc_def == 0 and {'tune_rank', 'answer_graded', 'heldout'} <= set(J2.get('inputs', {})) and rc_realret == 2,
      'exit', rc_def, 'inputs', sorted(J2.get('inputs', {})), '| a return from the real returns folder: exit', rc_realret)
# ---- the returns: each defect refused with its exit code (grader-interface-v2 section 8)
def variant(name, obj, flag):
    p = put('v_%s.json' % name, obj); a = list(full); a[a.index(flag) + 1] = p
    return exits(wr.main, a + ['--outdir', os.path.join(D, 'x', name)])
def mod(o, f):
    o = copy.deepcopy(o); f(o); return o
e = {}
e['tr_1e9'] = variant('tr_1e9', mod(TR, lambda o: o['rank']['E2_fused_mean']['pool'].__setitem__('P@10', o['rank']['E2_fused_mean']['pool']['P@10'] + 2e-9)), '--tune-rank')
e['tr_ok_5e10'] = variant('tr_ok', mod(TR, lambda o: o['rank']['E2_fused_mean']['pool'].__setitem__('P@10', o['rank']['E2_fused_mean']['pool']['P@10'] + 5e-10)), '--tune-rank')
e['tr_missing_row'] = variant('tr_mr', mod(TR, lambda o: o['rank'].pop('E5_alone_s3')), '--tune-rank')
e['tr_extra_key'] = variant('tr_ek', mod(TR, lambda o: o.__setitem__('note', 'x')), '--tune-rank')
e['tr_truth'] = variant('tr_tr', mod(TR, lambda o: o['truth'].__setitem__('equal_to_lane', 387)), '--tune-rank')
e['tr_nan'] = variant('tr_nan', mod(TR, lambda o: o['rank']['CO']['pool'].__setitem__('MRR', float('nan'))), '--tune-rank')
e['tr_testflag'] = variant('tr_tf', mod(TR, lambda o: o.__setitem__('test', False)), '--tune-rank')
e['tr_handoff'] = variant('tr_ho', mod(TR, lambda o: o.__setitem__('handoff_sha256', '9' * 64)), '--tune-rank')
e['tr_scorer'] = variant('tr_sc', mod(TR, lambda o: o['scorer'].__setitem__('evalcore_sha256', 'zz')), '--tune-rank')
e['ag_missing_label'] = variant('ag_ml', mod(AGR, lambda o: o['labels'].pop('E3_alone_mean')), '--answer-graded')
e['ag_extra_label'] = variant('ag_el', mod(AGR, lambda o: o['labels'].__setitem__('E9_fused_mean', o['labels']['E1_fused_mean'])), '--answer-graded')
e['ag_rrf_vs'] = variant('ag_rv', mod(AGR, lambda o: o['labels']['RRF'].__setitem__('vs_RRF', dict(primary=dict(diff=0, lo=0, hi=0, p=1)))), '--answer-graded')
e['ag_p_above_1'] = variant('ag_p', mod(AGR, lambda o: o['labels']['E1_fused_mean']['vs_RRF']['primary'].__setitem__('p', 1.5)), '--answer-graded')
e['ag_bool'] = variant('ag_b', mod(AGR, lambda o: o['labels']['PPR']['mean'].__setitem__('primary', True)), '--answer-graded')
e['ag_comp_per_seed'] = variant('ag_cps', mod(AGR, lambda o: o['labels']['DIR'].__setitem__('per_seed', dict(s1=0, s2=0, s3=0))), '--answer-graded')
e['ho_freeze'] = variant('ho_fz', mod(HOR, lambda o: o.__setitem__('freeze_sha256', '0' * 64)), '--heldout')
e['ho_literal'] = variant('ho_lc', mod(HOR, lambda o: o['literal_check'].__setitem__('parent_mismatch', 1)), '--heldout')
e['ho_vs_missing'] = variant('ho_vm', mod(HOR, lambda o: o['vs_RRF'].pop('%s_alone_mean' % ARM)), '--heldout')
e['ho_diff_range'] = variant('ho_dr', mod(HOR, lambda o: o['vs_RRF']['%s_fused_mean' % ARM]['answer_level'].__setitem__('hi', 1.5)), '--heldout')
e['ho_extra_variant'] = variant('ho_ev', mod(HOR, lambda o: o['rank'].__setitem__('X', o['rank']['RRF'])), '--heldout')
e['ho_tasks'] = variant('ho_t', mod(HOR, lambda o: o.__setitem__('tasks', 417)), '--heldout')
e['ho_arm'] = variant('ho_a', mod(HOR, lambda o: o.__setitem__('arm', 'E9')), '--heldout')
e['ho_scorer_differs'] = variant('ho_sd', mod(HOR, lambda o: o.__setitem__('scorer', dict(SCORER, files_sha256='4' * 64))), '--heldout')
want = dict(tr_1e9=14, tr_ok_5e10=0, tr_missing_row=14, tr_extra_key=14, tr_truth=14, tr_nan=14, tr_testflag=14, tr_handoff=14, tr_scorer=14,
            ag_missing_label=13, ag_extra_label=13, ag_rrf_vs=13, ag_p_above_1=13, ag_bool=13, ag_comp_per_seed=13,
            ho_freeze=12, ho_literal=12, ho_vs_missing=12, ho_diff_range=12, ho_extra_variant=12, ho_tasks=12, ho_arm=12, ho_scorer_differs=12)
check('mf12_return_refusals', e == want, json.dumps({k: (v, want[k]) for k, v in e.items() if v != want[k]}) or 'all as specified')
anc2 = os.path.join(D, 'progress-bad.jsonl'); open(anc2, 'w').write(json.dumps(dict(step='coordinator', unit='item27_freeze', sha256='5' * 64)) + '\n')
a = list(full); a[a.index('--anchor') + 1] = anc2
check('mf12_anchor_mismatch_refused', exits(wr.main, a + ['--outdir', os.path.join(D, 'x', 'anc')]) == 12, 'an anchor naming other bytes')
# ---- the real run's input checks (exit 10), on synthetic records, function by function
T_real = dict(T, test=False); I22_real = dict(I22, test=False); AL_real = dict(AL, test=False); LK_real = dict(json.load(open(LKP)), test=False)
R27_real = dict(rec, test=False)
R27RP = os.path.join(D, 'real', 'item27.json'); os.makedirs(os.path.dirname(R27RP)); json.dump(R27_real, open(R27RP, 'w'))
RRP = os.path.join(D, 'real', 'e5_route.json'); json.dump(dict(RT97, test=False, item27_sha256=sha(R27RP)), open(RRP, 'w'))
ancr = os.path.join(D, 'real', 'progress.jsonl')
open(ancr, 'w').write(json.dumps(dict(step='coordinator', unit='preflight_e4_det', status='accepted: both repeat')) + '\n'
                      + json.dumps(dict(step='coordinator', unit='item27_freeze', file='train/heldout/item27.json', sha256=sha(R27RP))) + '\n')
ar = dict(plan=os.path.join(FB, 'stageB', 'plan.json'), item27=R27RP, ac_log=ACL, protocol=PROTO, answer=ALP, handoff=HOF, route=RRP)
good = wr.real_input_problems(ar, T_real, I22_real, AL_real, LK_real, R27_real, plan, ancr)
check('mf5_real_inputs_good_case', good == [], good[:3])
def bad_case(**kw):
    args = dict(a=ar, T=T_real, I22=I22_real, AL=AL_real, LK=LK_real, R27=R27_real, plan=plan, prog=ancr); args.update(kw)
    return wr.real_input_problems(args['a'], args['T'], args['I22'], args['AL'], args['LK'], args['R27'], args['plan'], args['prog'])
R27_other = dict(R27_real, chosen=dict(R27_real['chosen'], w=0.123))
cases = dict(
    tune_test_flag=bad_case(T=dict(T_real, test=True)), tune_no_test=bad_case(T={k: v for k, v in T_real.items() if k != 'test'}),
    tune_plan_hash=bad_case(T=dict(T_real, plan_hash='x')), tune_stamp=bad_case(T=dict(T_real, stamp=dict(st, report_sha256=None))),
    item22_test=bad_case(I22=dict(I22_real, test=True)), item22_refs=bad_case(I22=dict(I22_real, refs_sha256='0' * 64)),
    answer_test=bad_case(AL=dict(AL_real, test=True)), leak_not_ok=bad_case(LK=dict(LK_real, ok=False)),
    r27_digest=bad_case(R27=dict(R27_real, tables_digest='0' * 64)), r27_no_report=bad_case(R27=dict(R27_real, code_sha256={})),
    r27_no_pins=bad_case(R27=dict(R27_real, pins={})), r27_final_all65=bad_case(R27=R27_other),
    no_preflight=bad_case(prog=os.path.join(D, 'progress.jsonl').replace('progress.jsonl', 'nothing.jsonl')),
    anchor=bad_case(a=dict(ar, item27=R27P)), ac_log=bad_case(a=dict(ar, ac_log=os.path.join(D, 'nothing.log'))),
    protocol=bad_case(a=dict(ar, protocol=os.path.join(D, 'nothing.md'))), missing=bad_case(I22=None),
    r91_tune_handoff=bad_case(a=dict(ar, answer=os.path.join(D, 'nothing', 'answer_level.json'))),
    r91_heldout_handoff=bad_case(a=dict(ar, handoff=HO_T.replace('HANDOFF.json', 'no91.json'))))
open(HO_T.replace('HANDOFF.json', 'no91.json'), 'w').write('{}')
cases['r91_heldout_handoff'] = bad_case(a=dict(ar, handoff=HO_T.replace('HANDOFF.json', 'no91.json')))
SC91 = os.path.join(os.path.dirname(HO_T), 'scalar91.json'); json.dump({'split': 'heldout', wr.ABSENT_KEY: SCAL}, open(SC91, 'w'))
cases['mf12_scalar_heldout_handoff'] = bad_case(a=dict(ar, handoff=SC91))
cases['r96_protocol_without_c'] = bad_case(a=dict(ar, protocol=P96))  # ruling 96 (c): a protocol without the clause is refused in real mode
check('r96c_real_mode_refuses_protocol_without_c', any(x.startswith('text of item/ruling [96] not found') for x in cases['r96_protocol_without_c']), cases['r96_protocol_without_c'])
cases['r97_protocol_without_b'] = bad_case(a=dict(ar, protocol=P97))  # ruling 97: a protocol without the (b)/(d) text is refused in real mode
check('r97_real_mode_refuses_protocol_without_text', any(x.startswith('text of item/ruling [97] not found') for x in cases['r97_protocol_without_b']), cases['r97_protocol_without_b'])
RTT = os.path.join(D, 'real', 'e5_route_test.json'); json.dump(RT97, open(RTT, 'w'))
RTO = os.path.join(D, 'real', 'e5_route_other27.json'); json.dump(dict(RT97, test=False, item27_sha256='0' * 64), open(RTO, 'w'))
for k_, p_ in (('r97_route_missing', os.path.join(D, 'real', 'no_route.json')), ('r97_route_test_output', RTT), ('r97_route_other_item27', RTO)):
    cases[k_] = bad_case(a=dict(ar, route=p_))
check('r97_real_mode_refuses_route_missing_test_or_other_item27',
      any('e5_route.json' in x and 'is missing (ruling 97' in x for x in cases['r97_route_missing'])
      and all(any(x == 'e5_route.json is a test output or names another item27.json (ruling 97)' for x in cases[k_]) for k_ in ('r97_route_test_output', 'r97_route_other_item27')),
      {k_: cases[k_] for k_ in ('r97_route_missing', 'r97_route_test_output', 'r97_route_other_item27')})

check('mf5_mf12_mf13_real_input_refusals', all(len(v) >= 1 for v in cases.values()), json.dumps({k: len(v) for k, v in cases.items()}))
ok = finish('write-result')
sys.exit(0 if ok else 1)
