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
show_hashes('r58c/write_audit_claims.py', 'r58c/B/pre/write_audit_claims.py', 'train/write_result.py', 'train/leak_audit.py', 'r58c/B/tests/test_write_audit_claims.py', 'r58c/B/pre-r96/write_audit_claims.py', 'r58c/B/pre-r97/write_audit_claims.py')
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
      and 'ktest-r1 (' not in s9 and 'ktest-r4 (' not in s9, 'the containers mounting export/ (from the lists)')
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
ok = finish('write-audit-claims')
sys.exit(0 if ok else 1)
