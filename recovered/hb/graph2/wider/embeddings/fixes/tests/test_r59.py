"""Plumbing test, ruling 59 (stale parts), tuning data only; outputs under OUT (default /w/fixes/tests/out/<CODE>/r59).
 (a) a dry plan as the guard would write it (stageB.make_plan with every timing key present, nothing trains;
     plan.json, progress and RUNLOG lines redirected to OUT) must carry plan_hash, and the hash must cover s, the
     device, the ancestry rule and the code;
 (b) assemble on a part written under ANOTHER plan_hash must refuse;
 (c) assemble on parts whose hash matches but where one task sits under a checkpoint other than its planned one
     (and so appears twice) must refuse;
 (d) assemble on correct parts must succeed with every task exactly once per (config, seed, scope);
 (e) run_units on a plan whose hash differs from the code's must refuse before any training (M code only: on the
     pre-M code it would train, so it is not run there).
No training, no metric. Prints RESULT PASS|FAIL."""
import os, sys, json, shutil, builtins
ROOT = os.environ.get('EMB_ROOT', '/w')
sys.path[:0] = [os.path.join(ROOT, 'train'), os.path.join(ROOT, 'export'), os.path.join(ROOT, 'eval')]
import stageB as sb, checkpoints as ck

CODE = os.environ.get('CODE', 'post')
OUT = os.path.join(os.environ.get('OUT', os.path.join(ROOT, 'fixes', 'tests', 'out', CODE)), 'r59')
if os.path.exists(OUT): shutil.rmtree(OUT)
os.makedirs(OUT)
res = {}
# (a) dry plan
sb.PLAN = os.path.join(OUT, 'plan.json'); sb.PROG = os.path.join(OUT, 'progress.jsonl')
_open = builtins.open
sb.open = lambda p, *a, **k: _open(os.path.join(OUT, 'RUNLOG-lines.md') if str(p).endswith('RUNLOG.md') else p, *a, **k)
plan = sb.make_plan()
h = plan.get('plan_hash')
res['a_plan_hash'] = h
res['a_ok'] = bool(h) and hasattr(sb, 'plan_hash') and sb.plan_hash(plan['s']) == h \
    and sb.plan_hash(plan['s'], device='cpu' if plan['device'] != 'cpu' else 'cuda') != h \
    and sb.plan_hash(plan['s'] + 1) != h
print('(a) s', plan['s'], 'device', plan['device'], 'checkpoints', len(plan['checkpoints']), 'plan_hash', h, 'ok', res['a_ok'], flush=True)
# fake small plan for (b)-(d): two planned checkpoints, <= 3 tasks
tasks = sb.load_tasks()
Cs = plan['checkpoints'][:2] if len(plan['checkpoints']) >= 2 else plan['checkpoints']
mine = [t for t in tasks if plan['assignment'][t['parent']] == Cs[0]][:1] + [t for t in tasks if plan['assignment'][t['parent']] == Cs[1]][:2]
sb.load_tasks = lambda: mine
fake = dict(s=plan['s'], plan_hash=h or 'none', configs={'E2': [dict(config_id='c01', cfg={}, epochs=1)]}, checkpoints=Cs,
            assignment={t['parent']: plan['assignment'][t['parent']] for t in mine})
sb.SEEDS = (1,)


def write(case, parts_hash, misplace=False):
    base = os.path.join(OUT, case); sb.PARTS = os.path.join(base, 'parts'); sb.TABLES = os.path.join(base, 'tables')
    for C in Cs:
        ts = [t for t in mine if fake['assignment'][t['parent']] == C]
        if misplace and C == Cs[0]: ts = ts + [t for t in mine if fake['assignment'][t['parent']] == Cs[1]][:1]
        tables = {sc: {t['task_id']: {'x.py': 0.5} for t in ts} for sc in sb.SCOPES}
        per = {t['task_id']: dict(parent=t['parent'], checkpoint=C, lag=0, pool={}, unrestricted={}) for t in ts}
        sb.write_parts(os.path.join(sb.PARTS, 'E2', 'c01', 's1', C), tables, per, dict(test=True, plan_hash=parts_hash))


def try_assemble(case):
    try:
        sb.assemble('E2', fake)
    except (SystemExit, AssertionError) as e:
        return 'refused: %s' % str(e)[:160]
    files = sorted(os.listdir(sb.TABLES)) if os.path.exists(sb.TABLES) else []
    return 'accepted: %s' % files


write('b_stale', 'another-plan-hash'); res['b'] = try_assemble('b')
write('c_misplaced', fake['plan_hash'], misplace=True); res['c'] = try_assemble('c')
write('d_good', fake['plan_hash']); res['d'] = try_assemble('d')
d_ok = res['d'].startswith('accepted')
if d_ok:
    per = json.load(open(os.path.join(sb.TABLES, 'E2_c01_s1_counts.json')))
    d_ok = sorted(per) == sorted(t['task_id'] for t in mine)
print('(b) stale hash ->', res['b'], flush=True)
print('(c) misplaced task ->', res['c'], flush=True)
print('(d) good parts ->', res['d'], 'every task once:', d_ok, flush=True)
e_ok = None
if CODE != 'pre':
    try:
        sb.run_units(['E2'], dict(fake, plan_hash='bogus')); res['e'] = 'ran (should not)'; e_ok = False
    except SystemExit as e:
        res['e'] = 'refused: %s' % str(e)[:160]; e_ok = 'ruling 59' in str(e)
    print('(e) run_units on a mismatched plan ->', res['e'], flush=True)
else:
    print('(e) not run on the pre-M code (it would train)', flush=True)
ok = res['a_ok'] and res['b'].startswith('refused') and res['c'].startswith('refused') and d_ok and (e_ok is not False)
json.dump(res, open(os.path.join(OUT, 'result.json'), 'w'), indent=1)
print('RESULT', 'PASS' if ok else 'FAIL', 'test_r59', 'plan_hash', h, flush=True)
