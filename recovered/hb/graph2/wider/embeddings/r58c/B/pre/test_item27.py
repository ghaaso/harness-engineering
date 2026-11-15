"""Plumbing test of train/item27.py (ruling 57), TUNING data only. Builds a fake lane folder (OUTR/fakeB) holding the
real stage-B plan.json (copied) and synthetic ASSEMBLED stage-B tables for E1..E5 (3 configurations x 3 seeds, the
pool scope scored over the real tune candidate lists, _counts and _meta with plan.json's hash; E4 runners det=1).
E2's scores carry the tune truth (a bonus on truth files), so E2 must be chosen; the others are hashed noise (E1, E3
with a smaller bonus). selectB.run (guard bypassed in-process, as a test) writes fakeB/selectB for every arm and
PLACEBO (used again by the answer-level, held-out and write_result tests). Checks: the chosen arm and its
configuration agree with selectB's final_all65; the tie rule (four decimals, then the smaller model, then E3, E1,
E2, E4, E5); the record's sha256 file; refusals (record exists, a held-out unit exists, selectB disagrees, an
unassembled set, no ruling-58 lines without --test)."""
import os, sys, json, shutil, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from r58common import *
import numpy as np
import evalcore as ec
import selectB, item27
show_hashes('train/item27.py', 'train/selectB.py')
FB = fresh(os.path.join(OUTR, 'fakeB'))
TB = os.path.join(FB, 'stageB', 'tables'); os.makedirs(TB)
plan = json.load(open(os.path.join(TRAIN, 'stageB', 'plan.json')))
REAL_PLAN_HASH = plan['plan_hash']
plan = dict(plan, plan_hash='7e57' * 16)  # ruling 80: test tables never carry the real plan_hash (item27 --test refuses them)
json.dump(plan, open(os.path.join(FB, 'stageB', 'plan.json'), 'w'))
tasks = ec.load_tasks(); cl = selectB.cand_lists()
BONUS = dict(E1=0.25, E2=0.6, E3=0.25, E4=0.0, E5=0.0)
EMB = ('E1', 'E2', 'E3', 'E4', 'E5')
for arm in EMB:
    for c in plan['configs'][arm]:
        for s in (1, 2, 3):
            base = os.path.join(TB, '%s_%s_s%d' % (arm, c['config_id'], s))
            tab = {}
            for t in tasks:
                noise = selectB.placebo(s, t['task_id'], cl['pool'].get(t['task_id'], []), 'r58|%s|%s' % (arm, c['config_id']))
                tr = set(t['truth'])
                tab[t['task_id']] = {x: v + (BONUS[arm] if x in tr else 0.0) for x, v in noise.items()}
            ec.write_score_table(base + '_pool.tsv.gz', tab)
            ec.write_score_table(base + '_unrestricted.tsv.gz', {})
            json.dump({}, open(base + '_counts.json', 'w'))
            json.dump(dict(plan_hash=plan['plan_hash'], parts=53, tasks=len(tasks),
                           runners=[dict(runner='detrun.py stageB.py det=1' if arm == 'E4' else 'stageB.py', processes=1)]), open(base + '_meta.json', 'w'))
print('fake assembled tables written for', EMB, flush=True)
real_guard = selectB.r58_guard
selectB.HERE = FB; selectB.r58_guard = lambda *a, **k: None
selectB.run(list(EMB) + ['PLACEBO'], os.path.join(FB, 'selectB'))
selectB.r58_guard = real_guard
fin = {a: json.load(open(os.path.join(FB, 'selectB', a, 'choices.json')))['final_all65'] for a in EMB}
print('selectB final_all65', json.dumps({a: (f['config_id'], f['w'], round(f['mean'], 4)) for a, f in fin.items()}), flush=True)
args = ['--root', ROOT, '--tables', TB, '--plan', os.path.join(FB, 'stageB', 'plan.json'), '--sel', os.path.join(FB, 'selectB'), '--test',
        '--device', 'cpu', '--image-id', 'sha256:r58-test-image']
# ---- refusals that must come before the freeze
os.rename(os.path.join(TB, 'E5_%s_s2_meta.json' % plan['configs']['E5'][0]['config_id']), os.path.join(D0 := FB, 'held_meta.json'))
rc = exits(item27.main, args + ['--out', os.path.join(FB, 'h_meta', 'item27.json')])
os.rename(os.path.join(D0, 'held_meta.json'), os.path.join(TB, 'E5_%s_s2_meta.json' % plan['configs']['E5'][0]['config_id']))
check('item27_refuses_unassembled_set', rc == 4, 'exit', rc)
bad = os.path.join(FB, 'selectB_bad'); shutil.copytree(os.path.join(FB, 'selectB'), bad)
cj = os.path.join(bad, 'E1', 'choices.json'); j = json.load(open(cj)); j['final_all65']['w'] = 0.25 if j['final_all65']['w'] != 0.25 else 1.0
json.dump(j, open(cj, 'w'))
a2 = list(args); a2[a2.index('--sel') + 1] = bad
rc = exits(item27.main, a2 + ['--out', os.path.join(FB, 'h_bad', 'item27.json')])
check('item27_refuses_selectB_disagreement', rc == 5, 'exit', rc)
os.makedirs(os.path.join(FB, 'h_started'))
open(os.path.join(FB, 'h_started', 'progress.jsonl'), 'w').write('{"unit": "unit/E2/c07/s1/x", "status": "done"}\n')
rc = exits(item27.main, args + ['--out', os.path.join(FB, 'h_started', 'item27.json')])
check('item27_refuses_after_a_heldout_unit', rc == 6, 'exit', rc)
selectB.HERE = fresh(os.path.join(FB, 'emptyrunlog'))
open(os.path.join(selectB.HERE, 'RUNLOG.md'), 'w').write('# no ruling-58 lines\n')
rc = exits(item27.main, [])
check('item27_real_mode_needs_ruling58_lines', rc == 3, 'exit', rc)
# ---- ruling 80 / selection-freeze-1: real mode takes no option; --test needs explicit paths outside the real folders
PRE = load_module('item27_pre', os.path.join(ROOT, 'r58b', 'pre', 'item27.py'))
real_out = os.path.join(TRAIN, 'heldout', 'item27.json')
os.makedirs(os.path.join(FB, 'h_pre'), exist_ok=True); open(os.path.join(FB, 'h_pre', 'item27.json'), 'w').write('{}')
rc_pre = exits(PRE.main, ['--test', '--bogus', 'x', '--out', os.path.join(FB, 'h_pre', 'item27.json')])
check('sf1_pre_accepts_defaults_and_unknown_flags', rc_pre == 6, 'fail before: the stage-1 item27 took --test with the real default --tables/--plan/--sel '
      'and an unknown flag, and went on to the freeze step (exit', rc_pre, 'only because the out file existed)')
rcs = dict(
    test_defaults=exits(item27.main, ['--test']),
    test_real_tables=exits(item27.main, args[:args.index('--tables') + 1] + [os.path.join(TRAIN, 'stageB', 'tables')] + args[args.index('--tables') + 2:]
                           + ['--out', os.path.join(FB, 'h_x', 'item27.json')]),
    test_real_out=exits(item27.main, args + ['--out', real_out]),
    test_real_sel=exits(item27.main, args[:args.index('--sel') + 1] + [os.path.join(TRAIN, 'selectB')] + args[args.index('--sel') + 2:]
                        + ['--out', os.path.join(FB, 'h_x', 'item27.json')]),
    unknown_flag=exits(item27.main, args + ['--out', os.path.join(FB, 'h_x', 'item27.json'), '--bogus', 'x']),
    real_with_out=exits(item27.main, ['--out', os.path.join(FB, 'h_x', 'item27.json')]),
    real_with_tables=exits(item27.main, ['--tables', TB]))
RT = fresh(os.path.join(FB, 'realhash_tables')); json.dump(dict(plan_hash=REAL_PLAN_HASH), open(os.path.join(RT, 'E1_c01_s1_meta.json'), 'w'))
a4 = list(args); a4[a4.index('--tables') + 1] = RT
rcs['test_tables_with_real_plan_hash'] = exits(item27.main, a4 + ['--out', os.path.join(FB, 'h_x', 'item27.json')])
check('sf1_r80_refusals', all(v == 2 for v in rcs.values()) and not os.path.exists(os.path.join(FB, 'h_x')) and not os.path.exists(real_out),
      json.dumps(rcs), '; nothing written under h_x or train/heldout')
# ---- the freeze
OUT = os.path.join(FB, 'heldout', 'item27.json')
rec, h = item27.main(args + ['--out', OUT])
ch = rec['chosen']; f2 = fin[ch['arm']]
check('item27_chooses_E2', ch['arm'] == 'E2', 'chosen', ch['arm'], ch['config_id'], ch['w'], round(ch['figure_all65'], 4))
check('item27_agrees_with_selectB_final_all65', (ch['config_id'], float(ch['w'])) == (f2['config_id'], float(f2['w'])) and abs(ch['figure_all65'] - f2['mean']) < 1e-12
      and all(rec['arms'][a]['selectB_final_all65_agrees'] for a in EMB), 'selectB', f2['config_id'], f2['w'])
ep = {c['config_id']: c['epochs'] for c in plan['configs'][ch['arm']]}[ch['config_id']]
check('item27_record_fields', ch['epochs'] == ep and rec['s'] == plan['s'] and rec['plan_hash'] == plan['plan_hash'] and rec['test'] is True
      and rec['device'] == 'cpu' and rec['code_sha256']['train/heldout.py'] == sha(os.path.join(TRAIN, 'heldout.py'))
      and rec['code_sha256']['train/answer_level.js'] == sha(os.path.join(TRAIN, 'answer_level.js')), 'epochs', ch['epochs'], 's', rec['s'])
check('r80_record_carries_tables_digest', rec.get('tables_digest') == selectB.tables_digest(TB, plan) and rec.get('tables', '').endswith('fakeB/stageB/tables')
      and all(rec['choices_sha256'][a] == sha(os.path.join(FB, 'selectB', a, 'choices.json')) for a in EMB), rec.get('tables'), str(rec.get('tables_digest'))[:16])
r2, h2 = item27.verify(OUT)
check('item27_sha256_file', h2 == h == hashlib.sha256(open(OUT, 'rb').read()).hexdigest() and open(OUT + '.sha256').read().split()[0] == h, h[:16])
rc = exits(item27.main, args + ['--out', OUT])
check('item27_refuses_second_freeze', rc == 6 and item27.verify(OUT)[1] == h, 'exit', rc)
open(OUT, 'a').write(' ')
rc = exits(item27.verify, OUT)
_d = open(OUT, 'rb').read(); open(OUT, 'wb').write(_d[:-1])
check('item27_verify_refuses_changed_record', rc != 0 and item27.verify(OUT)[1] == h, 'exit', rc)
# ---- the tie rule (ruling 57) on fixed figures
t1, g1 = item27.choose_arm(dict(E1=dict(mean=0.30001, size=[256, 0]), E3=dict(mean=0.29996, size=[256, 0]), E2=dict(mean=0.3, size=[512, 0]),
                                 E4=dict(mean=0.2, size=[64, 1]), E5=dict(mean=0.1, size=[64, 0])))
t2, _ = item27.choose_arm(dict(E1=dict(mean=0.3, size=[128, 0]), E3=dict(mean=0.3, size=[256, 0]), E2=dict(mean=0.29, size=[64, 0]),
                                E4=dict(mean=0.2, size=[64, 1]), E5=dict(mean=0.1, size=[64, 0])))
t3, _ = item27.choose_arm(dict(E1=dict(mean=0.3, size=[128, 0]), E3=dict(mean=0.3, size=[128, 0]), E2=dict(mean=0.3, size=[128, 0]),
                                E4=dict(mean=0.30004, size=[128, 2]), E5=dict(mean=0.29996, size=[128, 0])))
t4, _ = item27.choose_arm(dict(E1=dict(mean=0.3, size=[128, 0]), E3=dict(mean=0.29, size=[64, 0]), E2=dict(mean=0.3001, size=[512, 0]),
                                E4=dict(mean=0.2, size=[64, 1]), E5=dict(mean=0.1, size=[64, 0])))
check('item27_tie_rule', (t1, t2, t3, t4) == ('E3', 'E1', 'E3', 'E2') and sorted(g1) == ['E1', 'E2', 'E3'],
      'four-decimal tie -> smaller model -> E3 first:', t1, '| smaller model', t2, '| all equal size -> E3', t3, '| no tie at 4 dp', t4)
ok = finish('item27')
sys.exit(0 if ok else 1)
