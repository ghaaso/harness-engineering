"""Agent A, round r58c, phase 1 (3): the two TEST hand-offs in train/HANDOFF-FORMAT.md version 2, made by the real writers
(answer_level.tune and heldout.py run) in test mode, from TUNING data only. No stage-B table is read (the fake stage has
an empty tables/ folder) and nothing under train/stageB, train/selectB, train/heldout or train/report is opened.
  tune/     the four comparators RRF, PPR, CO, DIR and one fake arm (E1, 3 seeds) whose scores are a deterministic hash
            (selectB.placebo with the salt 'fakeE1'; fused = evalcore.fused_with(PPR, CO, hash, w 0.5)), on the grader's
            fixed test set pick8 (answer_level.test_set_ids: 8 late-50 commits, 37 tasks).
  heldout/  heldout.py run --test --test-set pick8 --fake-scores fakeE1: the same 37 tasks on their 8 parents, with a TEST
            item-27 record (arm E1, test: true) and a TEST anchor line (marked "test": true and "TEST anchor"); HANDOFF.json
            copies that line. Both are then checked by r58c/A/precheck_handoff.py.
Runs in a ktest-a<N> container (EMB_ROOT=/w); writes only /w/r58c/A/out and /w/r58c/handoff-test."""
import os, sys, json, shutil, hashlib, datetime, subprocess
ROOT = '/w'; TRAIN = os.path.join(ROOT, 'train')
sys.path.insert(0, TRAIN); sys.path.insert(0, os.path.join(ROOT, 'eval')); sys.path.insert(0, os.path.join(ROOT, 'export'))
import evalcore as ec, selectB, item27, answer_level as al
A = os.path.join(ROOT, 'r58c', 'A', 'out'); HT = os.path.join(ROOT, 'r58c', 'handoff-test')
FB = os.path.join(ROOT, 'r58b', 'out', 'fakeB')
SALT = 'fakeE1'; W = 0.5
SA = 'cd806c803c4ad8ec198790096d196460789951f0'; ZERO = '2fa68134d22db238b53b12e5f24315af29dce4a0'
LARGEST = '7b3a745281898d3d5808c5a15c4916d1d9dbb1b4'
SCOPES = ('pool', 'unrestricted')
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()


def fresh(d):
    if os.path.isdir(d): shutil.rmtree(d)
    os.makedirs(d); return d


# ---- the fake stage: a copy of the synthetic plan (plan_hash 7e57...), an EMPTY tables folder
ST = fresh(os.path.join(A, 'fakestage', 'stageB')); TB = fresh(os.path.join(ST, 'tables'))
PL = os.path.join(ST, 'plan.json'); shutil.copy(os.path.join(FB, 'stageB', 'plan.json'), PL)
plan = json.load(open(PL)); TD = selectB.tables_digest(TB, plan)
print('fake stage', PL, 'plan_hash', plan['plan_hash'], 'tables_digest', TD, flush=True)

# ---- the tuning tasks: every late-50 task of three commits
tasks = ec.load_tasks(); late = ec.commit_set(tasks, 'late50')
ids = al.test_set_ids('pick8')  # the grader's fixed test set (coordinator, 2026-11-14): 8 late-50 commits, 37 tasks
byid = {t['task_id']: t for t in tasks}
pick = sorted({byid[i]['commit'] for i in ids}, key=lambda c: next(t['date_order'] for t in tasks if t['commit'] == c))
assert len(ids) == 37 and len(pick) == 8, (len(ids), len(pick))
print('test set pick8: tasks', len(ids), 'commits', [c[:12] for c in pick], 'parents', len({byid[i]['parent'] for i in ids}), flush=True)
_cl = selectB.cand_lists(); cands = {sc: _cl[sc] for sc in SCOPES}
CD = os.path.join(ROOT, 'eval', 'comparators')
comp = {(n, sc): ec.read_score_table(os.path.join(CD, '%s_%s.tsv.gz' % (n, sc))) for n in ('PPR', 'CO') for sc in SCOPES}

# ---- the fake selectB output of arm E1 (3 seeds, both kinds, both scopes) and its stamp
SEL = fresh(os.path.join(A, 'fakesel')); os.makedirs(os.path.join(SEL, 'E1'))
for s in (1, 2, 3):
    for sc in SCOPES:
        alone = {tid: selectB.placebo(s, tid, cands[sc].get(tid, []), SALT) for tid in ids}
        fused = {tid: ec.fused_with(tid, cands[sc].get(tid, []), comp[('PPR', sc)].get(tid, {}), comp[('CO', sc)].get(tid, {}), alone[tid], W)
                 for tid in ids}
        ec.write_score_table(os.path.join(SEL, 'E1', 'alone_%s_s%d.tsv.gz' % (sc, s)), alone)
        ec.write_score_table(os.path.join(SEL, 'E1', 'fused_%s_s%d.tsv.gz' % (sc, s)), fused)
json.dump(dict(test=True, note='TEST: hash-scored fake arm (selectB.placebo, salt %s), fused with PPR and CO at w %g; not a model' % (SALT, W),
               stamp=dict(plan_hash=plan['plan_hash'], tables_digest=TD)), open(os.path.join(SEL, 'E1', 'choices.json'), 'w'), indent=1)

# ---- tune/: answer_level.tune in test mode (the real writer), then the hand-off folder copied out
TO = os.path.join(A, 'tune_ho')
res = al.tune(SEL, TO, B=1000, test=True, arms=('E1',), tables=TB, plan=PL, test_set='pick8')
dst = os.path.join(HT, 'tune')
if os.path.isdir(dst): shutil.rmtree(dst)
shutil.copytree(os.path.join(TO, 'handoff'), dst)
H = json.load(open(os.path.join(dst, 'HANDOFF.json')))
assert H['test'] is True and H['format'] == al.FORMAT and all(sha(os.path.join(dst, k)) == v for k, v in H['files'].items())
print('tune hand-off', dst, 'variants', len(H['variants']), 'files', len(H['files']), 'sha256', sha(os.path.join(dst, 'HANDOFF.json')), flush=True)

# ---- heldout/: a TEST item-27 record (arm E1) and a TEST anchor line, then heldout.py run --test --fake-scores
rec = json.load(open(os.path.join(FB, 'heldout', 'item27.json')))
rec['chosen'] = dict(rec['chosen'], arm='E1')
rec['code_sha256'] = item27.code_hashes(ROOT)
pins, _ = item27.pin_paths(ROOT)
rec['pins'] = {k: v for k, v in item27.hashes(ROOT, pins).items() if v}
rec['tuning_inputs'] = {k: v for k, v in item27.hashes(ROOT, item27.tuning_paths(ROOT)).items() if v}
rec['tables'] = os.path.relpath(TB, ROOT); rec['tables_digest'] = TD; rec['test'] = True
rec['note'] = 'TEST record of round r58c (agent A): a hash-scored fake arm E1 on the pick8 test set (37 tuning tasks, their 8 parents); not a frozen choice'
RD = fresh(os.path.join(A, 'ho_rec')); RP = os.path.join(RD, 'item27.json')
data = json.dumps(rec, indent=1, sort_keys=True).encode(); open(RP, 'wb').write(data)
fh = hashlib.sha256(data).hexdigest(); open(RP + '.sha256', 'w').write('%s  item27.json\n' % fh)
ANC = os.path.join(RD, 'progress.jsonl')
open(ANC, 'w').write(json.dumps(dict(step='coordinator', unit='item27_freeze', file='train/heldout/item27.json', sha256=fh,
                                     t=datetime.datetime.utcnow().isoformat() + 'Z', test=True,
                                     note="TEST anchor written by agent A for the r58c test hand-off; not the coordinator's")) + '\n')
HO = os.path.join(HT, 'heldout')
if os.path.isdir(HO): shutil.rmtree(HO)
env = dict(os.environ, KGE_DEVICE='cpu', KGE_IMAGE_ID=rec['image_id'])
cmd = [sys.executable, os.path.join(TRAIN, 'heldout.py'), 'run', '--test', '--freeze', RP, '--plan', PL, '--tasks', os.environ.get('GT_TASKS', '/gt/tasks.jsonl'),
       '--out', HO, '--anchor', ANC, '--test-set', 'pick8', '--fake-scores', SALT]
p = subprocess.run(cmd, cwd=TRAIN, capture_output=True, text=True, env=env, timeout=500)
print(p.stdout[-3000:], p.stderr[-3000:], flush=True)
assert p.returncode == 0, p.returncode
HH = json.load(open(os.path.join(HO, 'HANDOFF.json')))
assert HH['test'] is True and json.loads(HH['anchor_line'])['test'] is True
print('held-out hand-off', HO, 'variants', len(HH['variants']), 'files', len(HH['files']), 'tasks', HH['tasks'], 'sha256', sha(os.path.join(HO, 'HANDOFF.json')),
      'record sha256', fh, flush=True)
print('RESULT PASS build_handoffs', flush=True)
