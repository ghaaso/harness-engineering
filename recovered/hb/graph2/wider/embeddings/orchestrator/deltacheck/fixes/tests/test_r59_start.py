"""Plumbing test, ruling 59's first sentence ("Stage B starts with empty stageB/parts and stageB/tables"), tuning data
only, no training (runs only when every timing key of the device's timing_selected file exists, so make_plan never
trains). plan.json, progress and RUNLOG lines are redirected to OUT (default /w/fixes/tests/out/<CODE>/r59_start).
  (f) make_plan with a leftover part under stageB/parts must refuse to write a new plan;
  (g) the same with a leftover table under stageB/tables must refuse;
  (h) with both empty it plans (dry) and the plan carries plan_hash.
Prints RESULT PASS|FAIL."""
import os, sys, json, shutil, builtins
ROOT = os.environ.get('EMB_ROOT', '/w')
sys.path[:0] = [os.path.join(ROOT, 'train'), os.path.join(ROOT, 'export'), os.path.join(ROOT, 'eval')]
import stageB as sb, kge

CODE = os.environ.get('CODE', 'post')
OUT = os.path.join(os.environ.get('OUT', os.path.join(ROOT, 'fixes', 'tests', 'out', CODE)), 'r59_start')
if os.path.exists(OUT): shutil.rmtree(OUT)
os.makedirs(OUT)
tp = os.path.join(sb.SB, 'timing_selected%s.json' % ('' if kge.DEVICE.type == 'cpu' else '_' + kge.DEVICE.type))
top = json.load(open(os.path.join(sb.HERE, 'stageA', 'top3.json')))
need = ['%s/%s/%s' % (a, r['config_id'], t) for a in kge.ARMS for r in top[a]['top3'] for t in 'AL']
have = json.load(open(tp)) if os.path.exists(tp) else {}
if [k for k in need if k not in have]:
    print('timing keys missing in %s: make_plan would train; not run' % tp); print('RESULT FAIL test_r59_start not-run'); sys.exit(0)
sb.PROG = os.path.join(OUT, 'progress.jsonl')
_open = builtins.open
sb.open = lambda p, *a, **k: _open(os.path.join(OUT, 'RUNLOG-lines.md') if str(p).endswith('RUNLOG.md') else p, *a, **k)


def attempt(case, leftover):
    base = os.path.join(OUT, case); sb.PLAN = os.path.join(base, 'plan.json')
    sb.PARTS = os.path.join(base, 'parts'); sb.TABLES = os.path.join(base, 'tables')
    os.makedirs(sb.PARTS); os.makedirs(sb.TABLES)
    if leftover: os.makedirs(os.path.dirname(os.path.join(base, leftover)), exist_ok=True); _open(os.path.join(base, leftover), 'w').write('x')
    try:
        p = sb.make_plan()
        return 'planned (plan_hash %s)' % p.get('plan_hash')
    except SystemExit as e:
        return 'refused: %s' % str(e)[:140]


res = dict(f=attempt('f', 'parts/E2/c01/s1/x/counts.json'), g=attempt('g', 'tables/E2_c01_s1_pool.tsv.gz'), h=attempt('h', None))
for k in 'fgh': print('(%s)' % k, res[k], flush=True)
ok = res['f'].startswith('refused') and res['g'].startswith('refused') and res['h'].startswith('planned') and 'None' not in res['h']
json.dump(res, _open(os.path.join(OUT, 'result.json'), 'w'), indent=1)
print('RESULT', 'PASS' if ok else 'FAIL', 'test_r59_start', flush=True)
