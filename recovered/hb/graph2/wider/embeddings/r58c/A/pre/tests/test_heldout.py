"""Plumbing test of the held-out driver train/heldout.py (ruling 58), on TUNE parents only (heldout.py --test reads
split 'tune' rows of build/tasks/tasks.jsonl and plan.json's tune assignment; it never reads a held-out row's truth,
and no truth exists in that file). Record: the item-27 test freeze of test_item27 (E2, test: true, device cpu), with
--test-epochs 2, on two tune parents: cd806c80 (5 tasks) and 2fa68134 (3 tasks, the checkpoint without co_changed,
stage B's unscored branch). Checks: units for 3 seeds x 2 checkpoints with no model file left; assemble/ranked/packs/
HANDOFF; refusals (another image, a truth-like key in the task rows).
This round (ruling 80; review heldout-no-once-guard, heldout-record-hash-not-anchored, heldout-tasks-file-not-pinned,
heldout-resume-integrity, answer-level-6), each with a fail before on the previous round's heldout.py (r58b/pre2):
  * strict options: the real run takes no option; --test needs --freeze/--plan/--tasks/--out/--anchor, none of
    freeze/plan/out under train/stageB|selectB|heldout (exit 2);
  * the record must match the anchor line (last {"step":"coordinator","unit":"item27_freeze"} line), its tables
    digest must match, a null CODE hash is refused in the real run (exit 5);
  * a second run once a hand-off exists, or into the folder of another record, is refused (exit 8);
  * the real task list is pinned (sha256, 418 unique T1 held-out rows, the plan's 70 parents; exit 6);
  * resume: a torn counts.json behind a done line makes the unit redo; an unreadable ranked file makes 'ranked' redo;
  * HANDOFF.json lists tasks_used.jsonl, every variant with explicit arm/kind/seed, and the grading rules."""
import os, sys, json, shutil, gzip, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hotest import *
import item27
show_hashes('train/heldout.py', 'train/heldout.sh', 'train/heldout_inputs.js', 'train/item27.py', 'train/answer_level.py', 'train/answer_level.js',
            'r58b/pre2/heldout.py')
H = fresh(os.path.join(OUTR, 'heldout_test'))
ANC = os.path.join(H, 'progress.jsonl')
rec = json.load(open(REC)); FH = item27.verify(REC)[1]
anchor(ANC, FH)
PREPY = prebin(H)
print('record', rec['chosen']['arm'], rec['chosen']['config_id'], 'w', rec['chosen']['w'], 'test', rec['test'], 'sha256', FH[:16], flush=True)
O = os.path.join(H, 'E2')
# ---- 1. units only
rc, txt = hrun(O, ANC, stop='units')
d1 = done_units(O)
check('ho_units_done', rc == 0 and len(d1) == 6 and not os.path.exists(os.path.join(O, 'tables')), 'exit', rc, 'units done', len(d1))
# ---- 2. resume integrity: a torn counts.json behind a done line
trained = sorted(os.path.dirname(p) for p in glob.glob(os.path.join(O, 'parts', '**', 'meta.json'), recursive=True)
                 if json.load(open(p)).get('trained') is not False)
torn = trained[0]; open(os.path.join(torn, 'counts.json'), 'w').close()
O_p1 = os.path.join(H, 'E2_pre_torn'); shutil.copytree(O, O_p1)
rcp, txtp = hrun(O_p1, ANC, pre=PREPY)
check('resume_pre_crashed_on_torn_part', rcp != 0 and ('JSONDecodeError' in txtp or 'Expecting value' in txtp),
      'fail before: the previous heldout.py trusted the done line and crashed in assemble (exit %d)' % rcp)
rc, txt = hrun(O, ANC, stop='ranked')
key = 'unit/%s/%s/s%s/%s' % (rec['chosen']['arm'], rec['chosen']['config_id'], torn.split(os.sep)[-2][1:], os.path.basename(torn)[:12])
n_torn = sum(1 for r in done_units(O) if r['unit'] == key)
check('resume_redoes_torn_part', rc == 0 and n_torn == 2 and len(done_units(O)) == 7 and os.path.getsize(os.path.join(torn, 'counts.json')) > 0,
      'exit', rc, 'done lines of the torn unit', n_torn, 'all unit done lines', len(done_units(O)))
# ---- 3. resume integrity: an unreadable ranked file behind the 'ranked' done line
rk = os.path.join(O, 'ranked', 'RRF_unrestricted.jsonl.gz'); open(rk, 'wb').close()
O_p2 = os.path.join(H, 'E2_pre_ranked'); shutil.copytree(O, O_p2)
rcp, txtp = hrun(O_p2, ANC, pre=PREPY)
check('ranked_pre_crashed', rcp != 0, 'fail before: the previous heldout.py skipped ranked because the folder existed and crashed in packs (exit %d)' % rcp)
n_unit_lines = len(done_units(O))
mt = {p: os.path.getmtime(p) for p in glob.glob(os.path.join(O, 'parts', '**', 'meta.json'), recursive=True)}
rc, txt = hrun(O, ANC)
check('ranked_integrity_redone', rc == 0 and sum(1 for r in lines(O) if r.get('unit') == 'ranked' and r['status'] == 'done') == 2
      and os.path.getsize(rk) > 0 and len(done_units(O)) == n_unit_lines and all(os.path.getmtime(p) == t for p, t in mt.items()),
      'exit', rc, '; ranked redone, no unit redone')
# ---- 4. the finished hand-off
left = glob.glob(os.path.join(O, '**', 'reps.pt'), recursive=True) + glob.glob(os.path.join(O, 'parts', '**', '*.model'), recursive=True)
check('ho_models_deleted', not left and all(u.get('reps_deleted', True) for u in done_units(O)), 'left', left[:3])
metas = [json.load(open(p)) for p in glob.glob(os.path.join(O, 'parts', '**', 'meta.json'), recursive=True)]
check('ho_parts_record_freeze', len(metas) == 6 and all(m.get('freeze_sha256') == FH and m.get('runner') == 'heldout.py' for m in metas)
      and sum(1 for m in metas if m.get('trained') is False) == 3, 'parts', len(metas))
cnt = json.load(open(os.path.join(O, 'tables', 'counts.json')))
check('ho_all_tasks_per_seed', sorted(cnt) == ['s1', 's2', 's3'] and all(len(v) == 8 for v in cnt.values()), 'tasks per seed', [len(v) for v in cnt.values()])
rkf = sorted(os.listdir(os.path.join(O, 'ranked'))); an = sorted(os.listdir(os.path.join(O, 'answers')))
ho = json.load(open(os.path.join(O, 'HANDOFF.json')))
check('ho_ranked_and_packs', len(rkf) == 20 and len(an) == 10 and all(v.get('packed') == 8 for v in ho['packs'].values())
      and all(v.get('config_hash') == '95e990307da3b42b' and v.get('ranked_paths_without_file_node') == 0 for v in ho['packs'].values()) and ho['test'] is True,
      'ranked', len(rkf), 'packs', len(an))
rows = [json.loads(l) for l in gzip.open(os.path.join(O, 'ranked', 'RRF_unrestricted.jsonl.gz'), 'rt')]
check('ho_ranked_have_no_truth', all(set(r) == {'id', 'variant', 'scope', 'ranked'} for r in rows) and len(rows) == 8, 'keys', sorted(rows[0]))
arm = rec['chosen']['arm']
want_v = [dict(name='%s_%s_s%d' % (arm, k, s), arm=arm, kind=k, seed=s) for k in ('alone', 'fused') for s in (1, 2, 3)] + \
         [dict(name=n, arm=n, kind='comparator', seed=None) for n in ('RRF', 'PPR', 'CO', 'DIR')]
check('ho_handoff_manifest', ho['variants'] == want_v and 'tasks_used.jsonl' in ho['files'] and sha(os.path.join(O, 'tasks_used.jsonl')) == ho['files']['tasks_used.jsonl']
      and ho['tasks_file_sha256'] == sha(TASKS) and ho['grading']['evalcore_sha256'] == sha(os.path.join(ROOT, 'eval', 'evalcore.py'))
      and ho['format'] == 'train/HANDOFF-FORMAT.md' and ho['freeze_sha256'] == FH and ho['parents'] == 2,
      'variants', [v['name'] for v in ho['variants']], '; files', len(ho['files']))
# ---- 5. one run: a second run once a hand-off exists is refused
O_p3 = os.path.join(H, 'E2_pre_second'); shutil.copytree(O, O_p3)
w0 = json.load(open(os.path.join(O_p3, 'HANDOFF.json')))['written']
rc, txt = hrun(O, ANC)
check('r80_second_run_refused', rc == 8 and 'one held-out run only' in txt and json.load(open(os.path.join(O, 'HANDOFF.json')))['written'] == ho['written'],
      'exit', rc)
rcp, txtp = hrun(O_p3, ANC, pre=PREPY)
w1 = json.load(open(os.path.join(O_p3, 'HANDOFF.json')))['written']
check('r80_pre_ran_again', rcp == 0 and w1 != w0, 'fail before: the previous heldout.py ran again over a finished hand-off and rewrote HANDOFF.json (exit %d)' % rcp)
OT = os.path.join(H, 'other'); os.makedirs(OT)
open(os.path.join(OT, 'progress.jsonl'), 'w').write(json.dumps(dict(step='heldout', unit='start', status='begun', freeze_sha256='ab' * 32)) + '\n')
rc, txt = hrun(OT, ANC)
check('r80_other_record_folder_refused', rc == 8 and 'another record' in txt, 'exit', rc)
# ---- 6. refusals of the earlier rounds
rc, txt = hrun(os.path.join(H, 'img'), ANC, env=dict(env0, KGE_IMAGE_ID='sha256:other'))
check('ho_refuses_other_image', rc == 5 and 'KGE_IMAGE_ID' in txt, 'exit', rc)
bad = os.path.join(H, 'tasks_truthy.jsonl')
with open(bad, 'w') as f:
    for l in open(TASKS):
        r = json.loads(l)
        if r.get('parent') == SA and r.get('split') == 'tune': r['truth'] = ['x']
        f.write(json.dumps(r) + '\n')
rc, txt = hrun(os.path.join(H, 'truthy'), ANC, tasks=bad)
check('ho_refuses_truthy_rows', rc == 6, 'exit', rc)
# ---- 7. ruling 80: options (in process)
os.environ.update(KGE_DEVICE='cpu', KGE_IMAGE_ID=IMG)
import heldout, stageB
PRE = load_module('heldout_pre2', PREPY)
sys.path[:] = [p for p in sys.path if 'prebin' not in p]
X = os.path.join(H, 'x')
full = ['--freeze', REC, '--plan', FPLAN, '--tasks', TASKS, '--out', X, '--anchor', ANC]
cases = dict(real_with_option=['run', '--freeze', REC], real_probe_with_option=['probe', '--out', X],
             test_without_anchor=['run', '--test'] + full[:-2],
             test_out_in_train_heldout=['run', '--test'] + full[:7] + [os.path.join(TRAIN, 'heldout', 'x')] + full[8:],
             test_real_plan=['run', '--test'] + full[:3] + [os.path.join(TRAIN, 'stageB', 'plan.json')] + full[4:],
             test_freeze_in_train_heldout=['run', '--test', '--freeze', os.path.join(TRAIN, 'heldout', 'item27.json')] + full[2:],
             unknown_flag=['run', '--test'] + full + ['--bogus', 'y'], no_command=[])
rcs = {k: exits(heldout.parse, v) for k, v in cases.items()}
check('r80_options_refused', all(v == 2 for v in rcs.values()) and not os.path.exists(X), json.dumps(rcs))
po = PRE._opts(['run', '--out', X]); pt = PRE._opts(['run', '--test'])
check('r80_pre_took_overrides_and_defaults', po['out'] == X and pt['freeze'].replace(os.sep, '/').endswith('heldout/item27.json'),
      'fail before: the previous heldout.py took --out in real mode and gave --test the real record', pt['freeze'])
ok_args = heldout.parse(['run', '--test'] + full)
check('r80_complete_test_options_accepted', ok_args['anchor'] == ANC and ok_args['test'] is True, 'parsed')
# ---- 8. ruling 80: the anchor, the tables digest, null CODE hashes (in process; verify only)
def o_(**k): return dict(dict(cmd='run', test=True, freeze=REC, plan=FPLAN, tasks=TASKS, out=os.path.join(H, 'v'), anchor=ANC), **k)
A2 = os.path.join(H, 'anchor_wrong.jsonl'); anchor(A2, 'ff' * 32, append=False)
A3 = os.path.join(H, 'anchor_wrong_then_right.jsonl'); anchor(A3, 'ff' * 32, append=False); anchor(A3, FH)
A4 = os.path.join(H, 'anchor_right_then_wrong.jsonl'); anchor(A4, FH, append=False); anchor(A4, 'ff' * 32)
r_a = dict(missing=exits(heldout.Run(o_(anchor=os.path.join(H, 'none.jsonl'))).verify), wrong=exits(heldout.Run(o_(anchor=A2)).verify),
           wrong_then_right=exits(heldout.Run(o_(anchor=A3)).verify), right_then_wrong=exits(heldout.Run(o_(anchor=A4)).verify))
check('r80_anchor', r_a == dict(missing=5, wrong=5, wrong_then_right=0, right_then_wrong=5) and heldout.anchor_sha(A3) == FH, json.dumps(r_a), '; the last line wins')
po2 = dict(o_()); po2.pop('anchor')
check('r80_pre_ignored_anchor', exits(PRE.Run(dict(po2, anchor=A2)).verify) == 0, 'fail before: the previous verify accepted a record no anchor names')
R2 = os.path.join(H, 'rec_digest', 'item27.json'); h2 = write_record(R2, dict(rec, tables_digest='0' * 64)); anchor(ANC, h2)
rc_d = exits(heldout.Run(o_(freeze=R2)).verify); rc_dp = exits(PRE.Run(dict(po2, freeze=R2)).verify)
check('r80_tables_digest_checked', rc_d == 5 and rc_dp == 0, 'exit', rc_d, '; fail before: the previous verify accepted a wrong tables digest (exit %d)' % rc_dp)
code = dict(rec['code_sha256']); code[sorted(code)[0]] = None
R3 = os.path.join(H, 'rec_null', 'item27.json'); h3 = write_record(R3, dict(rec, test=False, code_sha256=code)); anchor(ANC, h3)
rc_n = exits(heldout.Run(o_(freeze=R3, test=False)).verify); rc_np = exits(PRE.Run(dict(po2, freeze=R3, test=False)).verify)
check('r80_null_code_refused_in_real_run', rc_n == 5 and heldout.null_code(dict(code_sha256=code)) == [sorted(code)[0]] and rc_np == 0,
      'exit', rc_n, '; fail before: the previous verify skipped a null CODE hash (exit %d)' % rc_np)
# ---- 9. the held-out task list is pinned (ids and parents of build/tasks/tasks.jsonl only; no truth exists there)
hplan = json.load(open(FPLAN))['heldout']['assignment']
rows_ok = heldout.pin_tasks(TASKS, hplan)
allrows = [l for l in open(TASKS) if l.strip()]
t1h = [i for i, l in enumerate(allrows) if json.loads(l).get('split') == 'heldout' and json.loads(l).get('set') == 'T1']; last_h = t1h[-1]
T1 = os.path.join(H, 'tasks_minus_one.jsonl'); open(T1, 'w').write(''.join(l for i, l in enumerate(allrows) if i != last_h))
T2 = os.path.join(H, 'tasks_dup.jsonl'); open(T2, 'w').write(''.join(allrows[:last_h]) + allrows[t1h[-2]] + ''.join(allrows[last_h + 1:]))
r_t = dict(minus_one=exits(heldout.pin_tasks, T1, hplan), minus_one_own_sha=exits(heldout.pin_tasks, T1, hplan, sha(T1)),
           duplicate_own_sha=exits(heldout.pin_tasks, T2, hplan, sha(T2)), other_parents=exits(heldout.pin_tasks, TASKS, dict(list(hplan.items())[1:]), sha(TASKS)))
check('tasks_pinned', len(rows_ok) == 418 and len({r['parent'] for r in rows_ok}) == 70 and all(v == 6 for v in r_t.values()), '418 rows, 70 parents;', json.dumps(r_t))
T3 = os.path.join(H, 'tasks_tune_minus_one.jsonl')
sa_rows = [i for i, l in enumerate(allrows) if json.loads(l).get('parent') == SA and json.loads(l).get('split') == 'tune' and json.loads(l).get('set') == 'T1']
open(T3, 'w').write(''.join(l for i, l in enumerate(allrows) if i != sa_rows[-1]))
RP = PRE.Run(dict(po2, tasks=T3, parents=SA + ',' + ZERO)); RP.verify(); RP.load_tasks()
check('tasks_pre_accepted_a_short_file', len(RP.tasks) == 7, 'fail before: the previous heldout.py ran on', len(RP.tasks), 'of 8 tasks without a word')
# ---- 10. ruling 65 inside a unit (in-process: a folded count injected into stage B's per-task counts)
real = stageB.score_tasks


def folded(*a, **k):
    tables, per = real(*a, **k)
    for r in per.values(): r['pool']['cands_folded'] = 1
    return tables, per


A5 = os.path.join(H, 'anchor_fold.jsonl'); anchor(A5, FH, append=False)
R = heldout.Run(o_(out=os.path.join(H, 'fold'), anchor=A5, parents=SA, **{'test-epochs': '1'}))
R.verify(); R.once(); R.load_tasks()
heldout.stageB.score_tasks = folded
nf = R.units(); heldout.stageB.score_tasks = real
fl = [r for r in lines(os.path.join(H, 'fold')) if r.get('unit', '').startswith('unit/') and r['status'] == 'failed']
check('ho_check_no_fold_fails_unit', nf == 3 and len(fl) == 3 and all('ruling 65' in u.get('error', '') for u in fl), 'failed units', nf)
ok = finish('heldout-driver')
sys.exit(0 if ok else 1)
