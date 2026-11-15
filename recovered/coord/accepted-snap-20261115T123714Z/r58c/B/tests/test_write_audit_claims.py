"""Plumbing test of r58c/write_audit_claims.py (round r58c, MF-14 and ruling 89), on synthetic inputs only (MF-8).
It takes the fake lane test_write_result.py built (R58_OUT's sibling test_write_result/wr: run that test first in the
same container), writes a richer synthetic leak_audit.json (mount rows, ruling 81's disclosure text, ruling 89's
per-use text), a synthetic mounted task file with two remove_paths rows and one row with a truth key, runs
write_result --test on them, then write_audit_claims --test. Checks: RESULT.md is reproduced and every claim found
(exit 0); AUDIT.md states ruling 81's disclosure and ruling 89's per-use rule as a limit of the isolation, not a clean
pass; section 2b counts the remove_paths rows and lists the truth-key row; the truth-key row is the real run's
refusal (task_rows). Fail-before: r58c/B/pre/write_audit_claims.py on the same inputs does not write such an AUDIT.md.
usage (ktest-b container, after test_write_result): R58_OUT=/w/r58c/B/out/test_write_audit_claims python <this>"""
import os, sys, json, shutil
sys.path.insert(0, '/w/train/r58/tests')
from r58common import *
sys.path.insert(0, os.path.join(ROOT, 'r58c'))
import write_result as wr
import write_audit_claims as wac
show_hashes('r58c/write_audit_claims.py', 'r58c/B/pre/write_audit_claims.py', 'train/write_result.py', 'train/leak_audit.py', 'r58c/B/tests/test_write_audit_claims.py', 'r58c/B/pre-r96/write_audit_claims.py', 'r58c/B/pre-r97/write_audit_claims.py', 'r58c/B/pre-r98/write_audit_claims.py',
            'r58c/B/pre-r101/write_audit_claims.py', 'r58c/B/pre-r106/write_audit_claims.py')
W = os.path.join(os.path.dirname(OUTR), 'test_write_result', 'wr')
check('wr_fake_lane_present', os.path.exists(os.path.join(W, 'fakeB', 'report', 'tune.json')), W)
D = fresh(os.path.join(OUTR, 'wac')); I = os.path.join(D, 'in'); shutil.copytree(W, I, ignore=shutil.ignore_patterns('out_*', 'x', 'fakeB_pre', 'deliv'))
FB = os.path.join(I, 'fakeB')
R81 = 'RULING-81-DISCLOSURE-TEXT export/ is mounted read-only in the stage-B container.'
R89 = 'RULING-89-PER-USE-TEXT stage B loads a graph only for a plan checkpoint; 2385 parts checked.'
R92 = 'RULING-92-GUARDS-TEXT both guards run kge-B1 the same way apart from the disk values.'
LKP = os.path.join(I, 'leak_audit.json')
LK = json.load(open(LKP))
LK.update(mounts=[dict(source='orchestrator/guard-stageB.sh:40', container='kge-B1', host='/w/export', dest='/w/export', cls='code+graphs', files=['graphs', 'graphs0'], ok=True, probe='ro'),
                  dict(source='inspect kge-B1', container='kge-B1', host='/build/tasks/tasks.jsonl', dest='/build/tasks/tasks.jsonl', cls='tasks', files=['tasks.jsonl'], ok=True, probe='ro')],
          disclosure81=dict(text=R81), ruling89=dict(ok=True, text=R89), ruling92=dict(ok=True, text=R92), splits=dict(tune=dict(checkpoints=53, tasks=388, rows=[]), heldout=dict(checkpoints=70, tasks=418, rows=[])))
json.dump(LK, open(LKP, 'w'))
TASKS = os.path.join(I, 'tasks.jsonl')
rows = [dict(id='T-a', set='s', split='tune', parent='p1', seed=dict(path='a.py')), dict(id='T-a~1', set='s', split='tune', parent='p1', seed=dict(path='a.py'), remove_paths=['b.py']),
        dict(id='T-a~2', set='s', split='tune', parent='p1', seed=dict(path='a.py'), remove_paths=['c.py']), dict(id='H-z', set='s', split='heldout', parent='p2', seed=dict(path='z.py'), truth=['x'])]
open(TASKS, 'w').write(''.join(json.dumps(r) + '\n' for r in rows))
tr = wac.task_rows(TASKS)
check('task_rows_counts', tr['rows'] == 4 and tr['remove_paths_rows'] == 2 and tr['truthy'] == [('H-z', 'truth')] and tr['by_split'] == dict(tune=3, heldout=1), json.dumps(tr, default=str)[:200])
# write_result --test on these inputs (the result the audit reproduces)
G = os.path.join(I, 'grader-returns'); RD = os.path.join(D, 'result')
args = ['--test', '--tune', os.path.join(FB, 'report', 'tune.json'), '--item22', os.path.join(I, 'item22', 'item22.json'), '--answer', os.path.join(I, 'answer', 'answer_level.json'),
        '--leak', LKP, '--item27', os.path.join(FB, 'heldout', 'item27.json'), '--plan', os.path.join(FB, 'stageB', 'plan.json'), '--handoff', os.path.join(I, 'heldout', 'HANDOFF.json'),
        '--anchor', os.path.join(I, 'progress.jsonl'), '--ac-log', os.path.join(I, 'assemble_checks.log'),
        '--tune-rank', os.path.join(G, 'tune-rank.json'), '--answer-graded', os.path.join(G, 'tune-item24.json'), '--heldout', os.path.join(G, 'heldout.json')]
# the writers before ruling 97 know no --route: their fail-before runs get the same inputs without it, on a result written without it
args0 = list(args); RD0 = os.path.join(D, 'result0'); rc0 = exits(wr.main, args0 + ['--outdir', RD0])
args = args0 + ['--route', os.path.join(I, 'e5_route.json')]  # ruling 97: the route audit's output (a test stand-in from test_write_result)
rc = exits(wr.main, args + ['--outdir', RD])
check('write_result_test_run', rc == 0 and rc0 == 0 and os.path.exists(os.path.join(RD, 'RESULT.md')) and os.path.exists(os.path.join(RD0, 'RESULT.md')), 'exit', rc, rc0)
# write_audit_claims --test
wa = ['--test', '--name', 'r58c-test'] + args[1:] + ['--result-dir', RD, '--tasks', TASKS]
wa_old = ['--test', '--name', 'r58c-test'] + args0[1:] + ['--result-dir', RD0, '--tasks', TASKS]
wac.TEST_OUT = os.path.join(D, 'wac-out')  # the default r58c/B/out/wac is the same folder family; kept under this test's output
rc = exits(wac.main, wa)
OUT = os.path.join(wac.TEST_OUT, 'r58c-test')
au = open(os.path.join(OUT, 'AUDIT.md')).read() if os.path.exists(os.path.join(OUT, 'AUDIT.md')) else ''
cl = open(os.path.join(OUT, 'CLAIMS.md')).read() if os.path.exists(os.path.join(OUT, 'CLAIMS.md')) else ''
check('wac_reproduces_and_finds_every_claim', rc == 0 and au and cl and 'NOT FOUND' not in cl, 'exit', rc, '| NOT FOUND rows:', cl.count('NOT FOUND'),
      [l[:160] for l in cl.splitlines() if 'NOT FOUND' in l][:3])
check('r89_per_use_rule_beside_r81', R81 in au and R89 in au and 'a limit of the isolation and not a clean pass' in au
      and au.index(R81) < au.index(R89) and '## 2.' in au and au.index(R89) < au.index('## 2.'), 'ruling 81 then ruling 89 in section 1')
check('mf14_task_rows_section', '## 2b. The mounted task rows' in au and 'rows with remove_paths (tune variants that drop paths; no truth) 2' in au
      and 'H-z (truth)' in au, 'section 2b')
check('mf14_claims_mirror_new_writer', 'injection FAILED' in cl and 'FAILED (0 specialist(s) compared)' in cl and '- Item 28 (text)' in cl
      and 'distinct (checkpoint, path)' in cl, 'claim rows for the r58c lines')
# ruling 96 (c): the claim map finds the limits line naming the difference between the splits, from the protocol
R96L = '- ' + (wr.r96_limit(wr.PROTOCOL) or 'NO RULING 96 (c)')
md_ = open(os.path.join(RD, 'RESULT.md')).read()
r96rows = [l for l in cl.splitlines() if '- Ruling 96 (c) (text)' in l]
check('r96c_claim_found_from_protocol', R96L in md_.splitlines() and len(r96rows) == 1 and ('| %s |' % sha(wr.PROTOCOL)) in r96rows[0] and r96rows[0].endswith('| ok |'),
      'RESULT.md has the line:', R96L in md_.splitlines(), '| rows:', r96rows[:1])
check('r96c_writer_pin_is_current', wac.WRITE_RESULT_PIN == sha(os.path.join(TRAIN, 'write_result.py')), wac.WRITE_RESULT_PIN[:12])
PW96 = load_module('wac_pre_r96', os.path.join(ROOT, 'r58c', 'B', 'pre-r96', 'write_audit_claims.py'))
PW96.TEST_OUT = os.path.join(D, 'wac-out-pre-r96'); rcp96 = exits(PW96.main, wa_old)
clp96 = open(os.path.join(PW96.TEST_OUT, 'r58c-test', 'CLAIMS.md')).read() if os.path.exists(os.path.join(PW96.TEST_OUT, 'r58c-test', 'CLAIMS.md')) else ''
check('r96c_fail_before_pre_r96_no_protocol_claim', clp96 != '' and '- Ruling 96 (c) (text)' not in clp96,
      'fail before: r58c/B/pre-r96/write_audit_claims.py exit', rcp96, '| a ruling-96 protocol row:', '- Ruling 96 (c) (text)' in clp96)
# ruling 97 (b), (d) and D1: the claim map finds the protocol texts, the route audit's counts, both pool medians and D1 in the one bullet
RTI = json.load(open(os.path.join(I, 'e5_route.json')))
SH97 = dict(protocol=sha(wr.PROTOCOL), route=sha(os.path.join(I, 'e5_route.json')), write_result=sha(os.path.join(TRAIN, 'write_result.py')))
want97 = {'- Ruling 97 (b) routing (text)': 'protocol', '- Ruling 97 (b) rule (text)': 'protocol', '- Ruling 97 (d) (text)': 'protocol',
          'on %s of %s held-out tasks the second specialist was `other`' % (RTI['route']['second_other'], RTI['route']['tasks']): 'route',
          'on %s a routed specialist was skipped' % RTI['route']['skipped']: 'route',
          'median pool size, late 50': 'route', 'median pool size, held-out': 'route', '- Ruling 97 (d), D1 (text)': 'write_result'}
rows97 = {k: [l for l in cl.splitlines() if l.startswith('| ') and (' %s |' % k) in l] for k in want97}
check('r97_claims_found', all(len(v) == 1 and ('| %s |' % SH97[want97[k]]) in v[0] and v[0].endswith('| ok |') for k, v in rows97.items())
      and sum(1 for l in md_.splitlines() if l.startswith('- Ruling 97 (b)')) == 1, {k: [x[:200] for x in v] for k, v in rows97.items()})
check('r97_route_input_hashed', any(l.startswith('| route | ') and l.endswith('| %s |' % SH97['route']) for l in (au + cl).splitlines()), 'the Inputs row of the route audit file with its sha256')
s1 = au[:au.find('## 2.')] if '## 2.' in au else ''
check('e1_note_in_audit_section1', wac.E1_NOTE in s1 and s1.index(R92) < s1.index(wac.E1_NOTE)
      and 'ranked_sha` (build/arms/common/harness.js:384) hashes integer node ids, which shift when the new nodes sort in (facts.js:62-63). No lane or common code compares it.' in wac.E1_NOTE,
      'AUDIT.md section 1, after ruling 92')
PW97 = load_module('wac_pre_r97', os.path.join(ROOT, 'r58c', 'B', 'pre-r97', 'write_audit_claims.py'))
PW97.TEST_OUT = os.path.join(D, 'wac-out-pre-r97'); PW97.WRITE_RESULT_PIN = wac.WRITE_RESULT_PIN; rcp97 = exits(PW97.main, wa_old)
clp97 = open(os.path.join(PW97.TEST_OUT, 'r58c-test', 'CLAIMS.md')).read() if os.path.exists(os.path.join(PW97.TEST_OUT, 'r58c-test', 'CLAIMS.md')) else ''
aup97 = open(os.path.join(PW97.TEST_OUT, 'r58c-test', 'AUDIT.md')).read() if os.path.exists(os.path.join(PW97.TEST_OUT, 'r58c-test', 'AUDIT.md')) else ''
check('r97_fail_before_pre_r97_no_claims_no_e1', clp97 != '' and aup97 != '' and not any((' %s |' % k) in clp97 for k in want97)
      and 'E1, a note' not in aup97 and not hasattr(PW97, 'E1_NOTE') and exits(PW97.main, wa) == 2,
      'fail before: r58c/B/pre-r97/write_audit_claims.py exit', rcp97, '| a ruling-97 row:', [k for k in want97 if (' %s |' % k) in clp97], '| E1 note:', 'E1, a note' in aup97)
check('wac_codes', wac.EXITS['TASK_TRUTH'] == 34 and wac.PASS_AC.match('PASS assemble-checks orchestrator/end-of-run/x.log tables_digest ' + 'a' * 64).group(2) == 'a' * 64
      and wac.PASS_AC.match('PASS assemble-checks orchestrator/end-of-run/x.log').group(1) == 'orchestrator/end-of-run/x.log', 'exit 34; the PASS line with and without the digest')
check('wac_pin_is_the_final_writer', wac.WRITE_RESULT_PIN == sha(os.path.join(TRAIN, 'write_result.py')), 'pin', wac.WRITE_RESULT_PIN[:12], 'file', sha(os.path.join(TRAIN, 'write_result.py'))[:12])
rcu = exits(wac.parse, ['--outdir', os.path.join(D, 'x'), '--heldout', 'h.json'])
check('real_run_takes_only_outdir', rcu == 2, 'exit', rcu, '(grader returns are read from LANE/grader-returns/ in the real run)')
# ---- ruling 98: the limits bullet (43 beside 98) is a claim, and AUDIT.md section 7b lists the cap of every stage-B unit from the guard log
r98rows = [l for l in cl.splitlines() if '- Rulings 43 and 98 (text)' in l]
check('r98_claim_found_from_protocol', len(r98rows) == 1 and ('| %s |' % sha(wr.PROTOCOL)) in r98rows[0] and r98rows[0].endswith('| ok |')
      and ('- ' + wr.r98_limit(wr.PROTOCOL)) in md_.splitlines(), r98rows[:1])
check('r98_section7b_without_inputs_says_so', '## 7b. Stage-B memory caps (ruling 98)' in au and 'Not available: train/progress.jsonl or orchestrator/guard-stageB.log was not given (test mode).' in au,
      'the main test run gives no progress or guard log')
GL = os.path.join(I, 'guard-stageB.log'); PG = os.path.join(I, 'progress-stageB.jsonl')
open(GL, 'w').write('2026-11-14T15:23:07Z guard start: image graphtest-kge-gpu:1 = sha256:a, cap 2560m, procs 1, lanes 1, units left -1 (-1 = plan not written yet), C: free 25 GB\n'
                    '2026-11-14T15:24:26Z launched kge-B1 (1 2 free_kb commit_kb; C: 25 GB free; stage B 139 KB; units left -1)\n'
                    '2026-11-15T06:28:25Z guard (sha256 59d3fb8e, cap 2560m) stopped by the coordinator for ruling 98\n'
                    '2026-11-15T06:29:24Z guard start: image graphtest-kge-gpu:1 = sha256:a, cap 4g, procs 1, lanes 1, units left 272 (-1 = plan not written yet), C: free 152 GB\n')
def pl(u, t, pk, step='stageB', status='done'): return json.dumps(dict(t=t, step=step, unit=u, status=status, peak_rss_mb=pk)) + '\n'
open(PG, 'w').write(pl('E4/c12/s1/aaaaaaaaaaa1', '2026-11-14T16:00:00.123456Z', 1900.5) + pl('E1/c01/s1/ddddddddddd1', '2026-11-14T17:00:00Z', 800)
                    + pl('E4/c13/s1/bbbbbbbbbbb1', '2026-11-15T05:50:00.1Z', 2400) + pl('E4/c13/s1/bbbbbbbbbbb3', '2026-11-15T05:58:00Z', 2410)
                    + pl('E4/c13/s1/bbbbbbbbbbb3', '2026-11-15T06:31:00Z', 2650) + pl('E4/c13/s1/bbbbbbbbbbb2', '2026-11-15T06:29:24.5Z', 2700)
                    + pl('E4/c16/s2/ccccccccccc1', '2026-11-15T06:45:00Z', 2600) + pl('E4/c16/s2/ccccccccccc9', '2026-11-15T06:50:00Z', 1, status='begun')
                    + pl('E4/c16/s2/ccccccccccc8', '2026-11-15T06:55:00Z', 1, step='heldout') + 'not json\n')
CP = wac.stage_b_caps(PG, GL)
check('r98_caps_by_guard_start', CP['caps'] == ['2560m', '4g'] and CP['units'] == 6 and CP['totals'] == {'2560m': 3, '4g': 3, None: 0}
      and CP['settings'] == {'E4/c12': {'2560m': 1}, 'E1/c01': {'2560m': 1}, 'E4/c13': {'2560m': 1, '4g': 2}, 'E4/c16': {'4g': 1}}
      and CP['listing']['4g'] == {'E4/c13/s1': ['bbbbbbbbbbb3', 'bbbbbbbbbbb2'], 'E4/c16/s2': ['ccccccccccc1']} and CP['peak']['E4/c13'] == {'2560m': 2400, '4g': 2700}
      and CP['multi'] == ['E4/c13/s1/bbbbbbbbbbb3 (2560m at 2026-11-15T05:58:00, 4g at 2026-11-15T06:31:00)'] and CP['problems'] == [], json.dumps(CP, default=str)[:600])
wac.TEST_OUT = os.path.join(D, 'wac-out98')
rc98 = exits(wac.main, wa + ['--progress', PG, '--guard-log', GL]); a98 = os.path.join(wac.TEST_OUT, 'r58c-test', 'AUDIT.md')
au98 = open(a98).read() if os.path.exists(a98) else ''; s7b = au98[au98.find('## 7b. '):au98.find('## 8. ')] if '## 7b. ' in au98 else ''
R98T = wr.ruling_text(wr.PROTOCOL, 98)
check('r98_section7b_lists_units_by_cap', rc98 == 0 and R98T and ('> ' + R98T) in s7b and ('| E4/c13 | 1 | 2 | 2400 | 2700 |') in s7b and '| E4/c16 | 0 | 1 |  | 2600 |' in s7b
      and '- Units under 4g (setting/seed: checkpoint ids):' in s7b and '  - E4/c13/s1: bbbbbbbbbbb3, bbbbbbbbbbb2' in s7b and '  - E4/c16/s2: ccccccccccc1' in s7b
      and '- Every other done unit ran under 2560m.' in s7b and '- Units done: 6; under 2560m 3; under 4g 3.' in s7b
      and '2026-11-14T15:23:07Z cap 2560m; 2026-11-15T06:29:24Z cap 4g' in s7b and ('(sha256 %s)' % sha(GL)) in s7b and ('(sha256 %s)' % sha(PG)) in s7b
      and 'E4/c13/s1/bbbbbbbbbbb3 (2560m at 2026-11-15T05:58:00, 4g at 2026-11-15T06:31:00)' in s7b and au98.find('## 7. ') < au98.find('## 7b. ') < au98.find('## 8. '),
      'exit', rc98, s7b[:700])
check('r98_inputs_hashed', ('| guard_log | ' in au98) and ('| progress | ' in au98) and au98.count(sha(GL)) >= 2, 'the Inputs rows of the guard log and the progress file')
open(os.path.join(I, 'progress-early.jsonl'), 'w').write(pl('E4/c12/s1/aaaaaaaaaaa1', '2026-11-14T10:00:00Z', 1))
pe98 = wac.stage_b_caps(os.path.join(I, 'progress-early.jsonl'), GL)['problems']
check('r98_done_before_every_guard_start_is_a_problem', wac.EXITS['CAP_TABLE'] == 36 and len(pe98) == 1 and 'precedes every guard start' in pe98[0], pe98)
rcr = exits(wac.main, wa + ['--progress', os.path.join(TRAIN, 'progress.jsonl'), '--guard-log', GL])
rcg = exits(wac.main, wa + ['--progress', PG, '--guard-log', os.path.join(ROOT, 'orchestrator', 'guard-stageB.log')])
check('r98_test_never_reads_the_real_progress_or_guard_log', rcr == 31 and rcg == 31, 'exit', rcr, rcg, '(REAL_INPUT_IN_TEST, refused before any read)')
PW98 = load_module('wac_pre_r98', os.path.join(ROOT, 'r58c', 'B', 'pre-r98', 'write_audit_claims.py'))
PW98.TEST_OUT = os.path.join(D, 'wac-out-pre-r98'); PW98.WRITE_RESULT_PIN = wac.WRITE_RESULT_PIN; rcp98 = exits(PW98.main, wa)
aup98 = open(os.path.join(PW98.TEST_OUT, 'r58c-test', 'AUDIT.md')).read() if os.path.exists(os.path.join(PW98.TEST_OUT, 'r58c-test', 'AUDIT.md')) else ''
clp98 = open(os.path.join(PW98.TEST_OUT, 'r58c-test', 'CLAIMS.md')).read() if os.path.exists(os.path.join(PW98.TEST_OUT, 'r58c-test', 'CLAIMS.md')) else ''
check('r98_fail_before_pre_r98', aup98 != '' and '## 7b.' not in aup98 and '- Rulings 43 and 98 (text)' not in clp98 and exits(PW98.main, wa + ['--progress', PG, '--guard-log', GL]) == 2
      and not hasattr(PW98, 'stage_b_caps'), 'fail before: r58c/B/pre-r98/write_audit_claims.py exit', rcp98, '| 7b:', '## 7b.' in aup98)
# ---- fail before: agent B's before bytes on the same inputs
check('r92_text_in_audit_and_result', ('**Ruling 92 (the two stage-B guards; leak_audit.json ruling92.text; check ok = True):** ' + R92) in au
      and R92 in open(os.path.join(RD, 'RESULT.md')).read(), 'AUDIT.md section 1 and RESULT.md')
P92 = load_module('wac_pre92', os.path.join(ROOT, 'r58c', 'B', 'pre-r92', 'write_audit_claims.py')); P92.TEST_OUT = os.path.join(D, 'pre92-out')
P92.WRITE_RESULT_PIN = wac.WRITE_RESULT_PIN  # the same writer bytes: only the AUDIT.md text differs
rc92 = exits(P92.main, list(wa_old)); au92 = open(os.path.join(P92.TEST_OUT, 'r58c-test', 'AUDIT.md')).read() if os.path.exists(os.path.join(P92.TEST_OUT, 'r58c-test', 'AUDIT.md')) else ''
check('r92_fail_before_pre92_wac', au92 != '' and '**Ruling 92 ' not in au92, 'pre-r92 exit', rc92, 'wrote AUDIT.md', au92 != '')
PRE = load_module('wac_preB', os.path.join(ROOT, 'r58c', 'B', 'pre', 'write_audit_claims.py'))
PRE.TEST_OUT = os.path.join(D, 'pre-out')
pre_args = [x for x in wa_old]
for k in ('--tune-rank', '--anchor', '--ac-log', '--tasks'):
    i = pre_args.index(k); del pre_args[i:i + 2]
rcp = exits(PRE.main, pre_args)
aup = open(os.path.join(PRE.TEST_OUT, 'r58c-test', 'AUDIT.md')).read() if os.path.exists(os.path.join(PRE.TEST_OUT, 'r58c-test', 'AUDIT.md')) else ''
check('fail_before_pre_wac', rcp != 0 and R89 not in aup and '2b. The mounted task rows' not in aup,
      'fail before: the old writer exit', rcp, '| ruling 89 text in its AUDIT.md:', R89 in aup)
# ---- section 9 (end-order-changes-2 change 6, rulings:F2; ruling 94(e), (f)): a fake evidence folder, never the lane's own
EV = os.path.join(D, 'evidence')
def put(rel_, data):
    q = os.path.join(EV, rel_); os.makedirs(os.path.dirname(q), exist_ok=True); open(q, 'w').write(data); return q
put('r58c/rehearsal/REHEARSAL.txt', 'x\nRESULT PASS rehearsal\n'); hl = put('r58c/rehearsal/E4/run/heldout.log', 'unit/1 done\n')
put('r58c/rehearsal/E4/run/kge-H1R-inspect.json', '[{"Mounts": []}]'); put('r58c/rehearsal/inputs/facts/p/facts.json', '{}')
put('r58c/rehearsal/E4-launch1.out', 'stopped\n'); put('heldout-launch/kge-H1R-launch.log', 'start kge-H1R\n')
put('r58c/B/out/rehearsal/result.json', '{"test": true}'); put('r58c/B/out/rehearsal/RESULT.md', '# TEST\n'); put('r58c/B/out/logs/wr_rehearsal.log', 'RESULT PASS 2e\n')
MB = json.load(open(os.path.join(ROOT, 'r58c', 'B', 'mounts-B.json'))); put('r58c/B/mounts-B.json', json.dumps(MB))
for k in MB:
    if not k.startswith('_'): put('r58c/mounts/%s.json' % k, '[{"Name": "/%s"}]' % k)
put('r58c/mounts/ktest-r1.20261115T000000Z.json', '[]'); put('r58c/mounts/ktest-r7.20261115T000000Z.json', '[]')
put('r58c/A/mounts-A.json', json.dumps({'kge-H1': {'step': '7 held-out run', 'allow': [{'src': 'C:/x/export', 'dst': '/w/export', 'mode': 'ro'}]}}))
put('train/heldout/kge-H1-inspect.json', '[]'); put('orchestrator/kge-B1-inspect-20261114T190928Z.json', '[]')
wac.TEST_OUT = os.path.join(D, 'wac-out9')
rc9 = exits(wac.main, wa + ['--evidence', EV]); a9p = os.path.join(wac.TEST_OUT, 'r58c-test', 'AUDIT.md')
au9 = open(a9p).read() if os.path.exists(a9p) else ''
s9 = au9[au9.find('## 9. '):] if '## 9. ' in au9 else ''
check('r86b_section9_lists_2b_and_2e_with_sha256', rc9 == 0 and s9 and ('| r58c/rehearsal/E4/run/heldout.log | 12 | %s |' % sha(hl)) in s9
      and 'kge-H1R-inspect.json' in s9 and 'heldout-launch/kge-H1R-launch.log' in s9 and 'r58c/B/out/rehearsal/result.json' in s9
      and 'r58c/B/out/logs/wr_rehearsal.log' in s9 and 'inputs/facts' not in s9, 'exit', rc9, s9[:300])
check('r86b_section9_names_what_it_cannot_cover', ('**What the rehearsals cannot cover:** ' + wac.UNCOVERED) in s9
      and 'the 70 real held-out graphs' in wac.UNCOVERED and 'wall time' in wac.UNCOVERED and 'anchor' in wac.UNCOVERED, 'the ruling 86(b) sentence')
OWN = [k for k in MB if not k.startswith('_') and MB[k].get('step') == '9.4']  # ruling 95: the audit writer's own container
check('r94e_section9_lists_every_mount_record', OWN == ['ktest-r7'] and all(('| %s | B |' % k) in s9 and ('r58c/mounts/%s.json' % k) in s9 for k in MB if not k.startswith('_') and k not in OWN)
      and '| kge-H1 | A |' in s9 and 'train/heldout/kge-H1-inspect.json' in s9 and '| kge-B1 | stage B |' in s9 and 'r58c/mounts/ktest-r1.20261115T000000Z.json' in s9,
      'every container of mounts-B.json and mounts-A.json with its record')
check('r94f_section9_export_note', '**Ruling 94(f), export/:**' in s9 and all(x in s9 for x in ('ktest-r2 (', 'ktest-r5 (', 'ktest-r10 (', 'kge-R1 (', 'kge-H1 ('))
      and 'ktest-r1 (' not in s9, 'the containers mounting export/ (from the lists)')
# round 8 (ruling 102): ktest-r4, r8 and r9 mount one read-only row per parent folder; the note counts them, it lists none
exn = s9[s9.find('**Ruling 94(f), export/:**'):]; exn = exn[:exn.find('\n')]
NG = {k: sum(1 for m in MB[k]['allow'] if m['dst'].startswith('/w/export/graphs/')) for k in ('ktest-r4', 'ktest-r8', 'ktest-r9')}
check('r102_export_note_counts_graph_folders', NG == {'ktest-r4': 38, 'ktest-r8': 38, 'ktest-r9': 70}
      and all(('%s (' % k) in exn and ('%d export/graphs/<P> folders, read-only (ruling 102)' % v) in exn for k, v in NG.items())
      and '/w/export/graphs/' not in exn, (NG, exn[:400]))
# C43 (pre-check S8): graph readers apart from the whole lane (ktest-r10) and from single-file pins (ktest-r3, ktest-r7,
# ktest-eor: checkpoints.py, parents*.jsonl)
gpart = exn[:exn.find('The whole lane')] if 'The whole lane' in exn else exn
lpart = exn[exn.find('The whole lane'):exn.find('Single export files')] if 'Single export files' in exn else ''
ppart = exn[exn.find('Single export files'):] if 'Single export files' in exn else ''
check('c43_export_note_graph_readers_apart_from_pins', all(('%s (' % k) not in gpart for k in ('ktest-r3', 'ktest-r7', 'ktest-eor', 'ktest-r10'))
      and all(('%s (' % k) in gpart for k in ('ktest-r2', 'ktest-r4', 'ktest-r5', 'ktest-r8', 'ktest-r9', 'ktest-r11', 'kge-R1'))
      and 'ktest-r10 (' in lpart and all(('%s (' % k) in ppart for k in ('ktest-r3', 'ktest-eor')), (gpart[:300], lpart[:200], ppart[:300]))
P104 = load_module('wac_pre_r104', os.path.join(ROOT, 'r58c', 'B', 'pre-r104', 'write_audit_claims.py'))
pe4 = P104.rehearsal_evidence(EV).get('export') or []
check('c43_fail_before_pre_r104_lists_pins_as_graph_readers', any(x.startswith('ktest-r3 (') for x in pe4) and any(x.startswith('ktest-eor (') for x in pe4), pe4[:3])
P101N = load_module('wac_pre_r101n', os.path.join(ROOT, 'r58c', 'B', 'pre-r101', 'write_audit_claims.py'))
pe = P101N.rehearsal_evidence(EV).get('export') or []
check('r102_fail_before_pre_r101_lists_every_graph_folder', any(x.startswith('ktest-r4 (') and x.count('/w/export/graphs/') == 38 for x in pe), pe[:2])
# ruling 95: item 22 (ktest-r5) and the result writer (ktest-r6) listed with their sha256; the writer's own record (ktest-r7) and
# an earlier record of it are not listed, and its absence is no problem
r56 = all(('| %s | B | %s | r58c/mounts/%s.json | %d | %s |' % (k, st, k, os.path.getsize(os.path.join(EV, 'r58c', 'mounts', k + '.json')),
                                                              sha(os.path.join(EV, 'r58c', 'mounts', k + '.json')))) in s9 for k, st in (('ktest-r5', '9.2'), ('ktest-r6', '9.3')))
R95 = wr.ruling_text(wa[wa.index('--protocol') + 1] if '--protocol' in wa else wr.PROTOCOL, 95)
check('r95_after_audit_records_listed_with_sha256', r56 and '**Ruling 95:** ' in s9 and 'ktest-r5 (item 22), ktest-r6 (the result writer)' in s9
      and R95 is not None and ('> ' + R95) in s9, 'r5 and r6 rows with bytes and sha256; ruling 95 quoted')
check('r95_own_record_not_listed', 'r58c/mounts/ktest-r7.json' not in s9 and 'ktest-r7.20261115T000000Z.json' not in s9
      and '| ktest-r7 | B | 9.4 | not listed: ' in s9 and 'r58c/mounts/ktest-r1.20261115T000000Z.json' in s9, 'own record and its earlier record left out')
EMPTY = os.path.join(D, 'evidence-empty'); os.makedirs(EMPTY, exist_ok=True)
pe = wac.rehearsal_evidence(EMPTY)['problems']
os.remove(os.path.join(EV, 'r58c', 'mounts', 'ktest-r7.json')); pm7 = wac.rehearsal_evidence(EV)['problems']
P95 = load_module('wac_pre95', os.path.join(ROOT, 'r58c', 'B', 'pre-r95', 'write_audit_claims.py')); pm7b = P95.rehearsal_evidence(EV)['problems']
check('r95_fail_before_pre95_requires_own_record', pm7 == [] and pm7b == ['ktest-r7: no mount record r58c/mounts/ktest-r7.json (ruling 94(e))'],
      'after:', pm7, '| before (pre-r95):', pm7b)
put('r58c/mounts/ktest-r7.json', '[]'); os.remove(os.path.join(EV, 'r58c', 'mounts', 'ktest-r5.json')); pm = wac.rehearsal_evidence(EV)['problems']
check('r86b_real_run_refuses_without_evidence', wac.EXITS['REHEARSAL_EVIDENCE'] == 35 and any('REHEARSAL.txt' in x for x in pe)
      and any('result.json' in x for x in pe) and any('mounts-B.json' in x for x in pe) and pm == ['ktest-r5: no mount record r58c/mounts/ktest-r5.json (ruling 94(e))'],
      'empty folder:', pe, '| one record removed:', pm)
P94 = load_module('wac_pre94', os.path.join(ROOT, 'r58c', 'B', 'pre-r94', 'write_audit_claims.py')); P94.TEST_OUT = os.path.join(D, 'pre94-out')
P94.WRITE_RESULT_PIN = wac.WRITE_RESULT_PIN
rc94 = exits(P94.main, list(wa_old)); a94p = os.path.join(P94.TEST_OUT, 'r58c-test', 'AUDIT.md')
au94 = open(a94p).read() if os.path.exists(a94p) else ''
check('r86b_fail_before_pre94_wac', au94 != '' and '## 9. ' not in au94 and 'cannot cover' not in au94, 'pre-r94 exit', rc94, 'wrote AUDIT.md', au94 != '')
# ---- round 8: the REAL run refuses (exit 29, LEAK_AUDIT_FAIL) a leak_audit.json whose `test` is missing or not False, as
# write_result does. Driven in-process on this test's own inputs: parse() returns them with test False, markers() finds
# none, load() hands back a leak record with the `test` field under test (ok true, ruling89/disclosure81 texts present),
# and WR.ruling_text, the first call after the leak checks, raises PASSED, so nothing past the checks runs or is written.
class PASSED(Exception): pass
class WRStop:
    def __getattr__(self, k):
        if k == 'ruling_text':
            def stop(*a, **kw): raise PASSED()
            return stop
        return getattr(wr, k)
def real_leak(mod, field):
    a0 = wac.parse(list(wa)); a0 = dict(a0, test=False); base_load = mod.load
    def load_(p):
        o = base_load(p)
        if p == a0['leak'] and isinstance(o, dict):
            o = dict(o, ok=True, ruling89=dict(text='x'), disclosure81=dict(text='x')); o.pop('test', None)
            if field != 'absent': o['test'] = field
        return o
    saved = (mod.parse, mod.markers, mod.load, mod.WR)
    mod.parse = lambda argv: a0; mod.markers = lambda *x, **k: []; mod.load = load_; mod.WR = WRStop()
    try: return exits(mod.main, [])
    except PASSED: return 'passed'
    finally: mod.parse, mod.markers, mod.load, mod.WR = saved
rl = {str(f): real_leak(wac, f) for f in ('absent', None, 'no', 0, True, False)}
check('r101_real_run_refuses_leak_test_missing_or_not_false', rl == {'absent': 29, 'None': 29, 'no': 29, '0': 29, 'True': 29, 'False': 'passed'}, rl)
PW101 = load_module('wac_pre_r101', os.path.join(ROOT, 'r58c', 'B', 'pre-r101', 'write_audit_claims.py')); PW101.WRITE_RESULT_PIN = wac.WRITE_RESULT_PIN
rl0 = {str(f): real_leak(PW101, f) for f in ('absent', None, False)}
check('r101_fail_before_pre_r101_accepts_a_missing_test_field', rl0 == {'absent': 'passed', 'None': 'passed', 'False': 'passed'}, rl0)
# C49 (ruling 105(c)): with the coordinator's nonfinite_heldout line (count 3) in progress.jsonl, RESULT.md carries one
# sentence on the last limits bullet, and the claim map finds its count and its seeds and parents (rows ok, no NOT
# FOUND); fail before: the pre-r105 claim map has no row for it
ANC49 = os.path.join(I, 'progress-nf.jsonl')
NFL49 = dict(step='coordinator', unit='nonfinite_heldout', count=3, seeds=[1, 2], parents=['%040x' % (0xabc0 + i) for i in range(3)], t='2026-11-15T12:00:00Z')
open(ANC49, 'w', encoding='utf-8').write(open(os.path.join(I, 'progress.jsonl'), encoding='utf-8').read().rstrip('\n') + '\n' + json.dumps(NFL49) + '\n')
args49 = [x if x != os.path.join(I, 'progress.jsonl') else ANC49 for x in args]; RD49 = os.path.join(D, 'result49')
rc49w = exits(wr.main, args49 + ['--outdir', RD49])
wa49 = ['--test', '--name', 'r58c-test'] + args49[1:] + ['--result-dir', RD49, '--tasks', TASKS]
wac.TEST_OUT = os.path.join(D, 'wac-out49'); rc49 = exits(wac.main, wa49)
cl49 = open(os.path.join(wac.TEST_OUT, 'r58c-test', 'CLAIMS.md')).read() if os.path.exists(os.path.join(wac.TEST_OUT, 'r58c-test', 'CLAIMS.md')) else ''
r49 = [l for l in cl49.splitlines() if 'the coordinator counted 3 score row(s) or loss(es)' in l or 'ruling 105(c) seeds and parents' in l]
check('c49_nonfinite_sentence_claims_found', rc49w == 0 and rc49 == 0 and len(r49) == 2 and all(l.endswith('| ok |') for l in r49) and 'NOT FOUND' not in cl49
      and 'Ruling 105 (c)' in open(os.path.join(RD49, 'RESULT.md'), encoding='utf-8').read(), 'exits', rc49w, rc49, r49[:2])
PW105 = load_module('wac_pre_r105', os.path.join(ROOT, 'r58c', 'B', 'pre-r105', 'write_audit_claims.py')); PW105.WRITE_RESULT_PIN = wac.WRITE_RESULT_PIN
PW105.TEST_OUT = os.path.join(D, 'wac-out49-pre-r105'); rc49p = exits(PW105.main, wa49)
cl49p = open(os.path.join(PW105.TEST_OUT, 'r58c-test', 'CLAIMS.md')).read() if os.path.exists(os.path.join(PW105.TEST_OUT, 'r58c-test', 'CLAIMS.md')) else ''
check('c49_fail_before_pre_r105_has_no_claim_row', 'the coordinator counted 3' not in cl49p and 'ruling 105(c) seeds' not in cl49p, 'pre-r105 exit', rc49p)
# C49 (second fix): both claim rows cite the anchor file itself (progress-nf.jsonl and its sha256), never "(no file:
# anchor)"; fail before: the first C49 bytes (pre-r105/write_audit_claims.c49a.py) had no anchor in the files table
SH49 = sha(ANC49)
check('c49_claim_rows_cite_the_anchor_file', len(r49) == 2 and all('progress-nf.jsonl' in l and SH49 in l and '(no file' not in l for l in r49), r49[:1])
PW49A = load_module('wac_c49a', os.path.join(ROOT, 'r58c', 'B', 'pre-r105', 'write_audit_claims.c49a.py')); PW49A.WRITE_RESULT_PIN = wac.WRITE_RESULT_PIN
PW49A.TEST_OUT = os.path.join(D, 'wac-out49-c49a'); rc49a = exits(PW49A.main, wa49)
cl49a = open(os.path.join(PW49A.TEST_OUT, 'r58c-test', 'CLAIMS.md')).read() if os.path.exists(os.path.join(PW49A.TEST_OUT, 'r58c-test', 'CLAIMS.md')) else ''
r49a = [l for l in cl49a.splitlines() if 'the coordinator counted 3 score row(s) or loss(es)' in l or 'ruling 105(c) seeds and parents' in l]
check('c49_fail_before_c49a_rows_have_no_file', rc49a == 0 and len(r49a) == 2 and all('(no file: anchor)' in l for l in r49a), 'c49a exit', rc49a, r49a[:1])
# C51 (delta check, round 9): one E5 specialist item22 wrote only as a note (SR-8); RESULT.md prints 'not compared (no
# co_changed)' and the claim map finds that line (exit 0, row ok); fail before: the pre-r106 claim map builds
# '-/- identical' for it and exits 24 (CLAIM_NOT_IN_RESULT)
I22P = os.path.join(I, 'item22', 'item22.json'); I51 = json.load(open(I22P))
I51['check_predict_target']['E5'] = dict(config_id=I51['check_predict_target']['E5'].get('config_id'), injected_reps_equal_kept=True, specialists_compared=1,
    specialists=dict(code=dict(injected_reps_equal_kept=True, full_order_identical=7, queries=7), other=dict(note='no co_changed relation in this area')))
I51P = os.path.join(I, 'item22', 'item22_note.json'); json.dump(I51, open(I51P, 'w'))
args51 = [x if x != I22P else I51P for x in args]; RD51 = os.path.join(D, 'result51')
rc51w = exits(wr.main, args51 + ['--outdir', RD51])
md51 = open(os.path.join(RD51, 'RESULT.md'), encoding='utf-8').read() if os.path.exists(os.path.join(RD51, 'RESULT.md')) else ''
wa51 = ['--test', '--name', 'r58c-test'] + args51[1:] + ['--result-dir', RD51, '--tasks', TASKS]
wac.TEST_OUT = os.path.join(D, 'wac-out51'); rc51 = exits(wac.main, wa51)
cl51 = open(os.path.join(wac.TEST_OUT, 'r58c-test', 'CLAIMS.md')).read() if os.path.exists(os.path.join(wac.TEST_OUT, 'r58c-test', 'CLAIMS.md')) else ''
r51 = [l for l in cl51.splitlines() if 'other not compared (no co_changed)' in l]
check('c51_note_only_specialist_claim_found', rc51w == 0 and rc51 == 0 and 'code 7/7 identical, other not compared (no co_changed)' in md51
      and len(r51) == 1 and r51[0].endswith('| ok |') and 'NOT FOUND' not in cl51, 'exits', rc51w, rc51, r51[:1])
PW106 = load_module('wac_pre_r106', os.path.join(ROOT, 'r58c', 'B', 'pre-r106', 'write_audit_claims.py')); PW106.WRITE_RESULT_PIN = wac.WRITE_RESULT_PIN
PW106.TEST_OUT = os.path.join(D, 'wac-out51-pre-r106'); rc51p = exits(PW106.main, wa51)
check('c51_fail_before_pre_r106_exit_24', wac.EXITS['CLAIM_NOT_IN_RESULT'] == 24 and rc51p == 24, 'pre-r106 exit', rc51p)
# C56 (delta check, round 9): heldout.sh's save_record names a second kept record of the same second <name>.<UTC>-1.json
# (and -2); section 9 lists it with the plain <name>.<UTC>.json ones, and the writer's own earlier records stay out;
# fail before: the pre-r106 pattern leaves the -1 record out
put('r58c/mounts/ktest-r1.20261115T000000Z-1.json', '[1]'); put('r58c/mounts/ktest-r7.20261115T000000Z-2.json', '[2]')
ex56 = [str(x) for x in wac.rehearsal_evidence(EV)['extra']]; ex56p = [str(x) for x in PW106.rehearsal_evidence(EV)['extra']]
check('c56_kept_record_with_suffix_listed', any('ktest-r1.20261115T000000Z-1.json' in x for x in ex56) and any('ktest-r1.20261115T000000Z.json' in x for x in ex56)
      and not any('ktest-r7.' in x for x in ex56), ex56)
check('c56_fail_before_pre_r106_leaves_it_out', not any('ktest-r1.20261115T000000Z-1.json' in x for x in ex56p) and any('ktest-r1.20261115T000000Z.json' in x for x in ex56p), ex56p)
ok = finish('write-audit-claims')
sys.exit(0 if ok else 1)
