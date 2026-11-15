"""Plumbing test, rulings 65 and 66 (stageB.py). No training (kge.train and scoring are stubbed), no metric;
tuning task ids and parent shas only. Outputs under OUT (default /w/fixes/tests/out/<variant>/r65_66).
usage: python tests/test_r65_66.py <post|pre3>   pre3 = stageB.py before rulings 63-66 (fixes/pre_m3, by path)
  r65a  s = 1, the stubbed scorer reports cands_folded = 1 for one task -> the unit is logged failed (not done),
        no part is left; the error names ruling 65
  r65b  s = 1, seeds_folded = 1 (E5-style counts) -> failed the same way
  r65c  s = 1, all folded counts 0 -> done (control)
  r65d  s = 3, cands_folded = 1 -> done (the rule is for s = 1 only)
  r65e  assemble at s = 1 refuses a part whose counts.json holds a non-zero folded count (written behind run_units' back)
  r66a  plan_hash_inputs holds only s, device, ancestry rule and files; plan_hash is the same with STAGEB_LANES,
        STAGEB_PROCS and STAGEB_RUNNER set to other values (re-imported)
  r66b  with STAGEB_LANES unset the module's LANES is 1 (one process; the dry plan used to record 2)
  r66c  every part's meta.json records runner and processes (trained branch and no-co_changed branch), taken from
        STAGEB_RUNNER / STAGEB_PROCS, and the assembled _meta.json lists them
Prints one line per check and RESULT PASS|FAIL."""
import os, sys, json, shutil, importlib.util
ROOT = os.environ.get('EMB_ROOT', '/w')
sys.path[:0] = [os.path.join(ROOT, 'train'), os.path.join(ROOT, 'export'), os.path.join(ROOT, 'eval')]
VAR = sys.argv[1] if len(sys.argv) > 1 else 'post'
OUT = os.path.join(os.environ.get('OUT', os.path.join(ROOT, 'fixes', 'tests', 'out', VAR)), 'r65_66')
if os.path.exists(OUT): shutil.rmtree(OUT)
os.makedirs(OUT)
for k in ('STAGEB_LANES', 'STAGEB_PROCS', 'STAGEB_RUNNER'): os.environ.pop(k, None)
SRC = os.path.join(ROOT, 'fixes', 'pre_m3', 'stageB.py') if VAR == 'pre3' else os.path.join(ROOT, 'train', 'stageB.py')
n_load = [0]


def load():
    n_load[0] += 1
    spec = importlib.util.spec_from_file_location('stageB_t%d' % n_load[0], SRC)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m


import checkpoints as ck
ok = {}
# r66b, r66a
sb = load()
ok['r66b_default_one'] = float(sb.LANES) == 1.0
print('r66b LANES with STAGEB_LANES unset =', sb.LANES, 'ok' if ok['r66b_default_one'] else 'VIOLATED', flush=True)
h1 = sb.plan_hash(1); keys = sorted(sb.plan_hash_inputs(1))
os.environ.update(STAGEB_LANES='3', STAGEB_PROCS='2', STAGEB_RUNNER='another runner')
sb2 = load(); h2 = sb2.plan_hash(1)
for k in ('STAGEB_LANES', 'STAGEB_PROCS', 'STAGEB_RUNNER'): os.environ.pop(k, None)
ok['r66a_not_in_hash'] = h1 == h2 and keys == ['ancestry_rule', 'device', 'files', 's']
print('r66a plan_hash_inputs keys', keys, 'hash unchanged under other lanes/procs/runner', h1 == h2, 'ok' if ok['r66a_not_in_hash'] else 'VIOLATED', flush=True)

# stubbed units
tasks_all = sb.load_tasks()
F = ck.Facts()
C1 = sb.kge.STAGEA_SHA
C0 = next(p for p in F.split_parents('tune') if F.co(p) == 0)
mine = [t for t in tasks_all if t['parent'] == C1][:2] + [t for t in tasks_all if t['parent'] == C0][:1]
FOLD = {}  # counts the stub scorer adds to the first task


def fake_train(arm, cfg, seed, C, holdout=False, outdir=None, max_epochs=None, es=True, **kw):
    os.makedirs(outdir, exist_ok=True); open(os.path.join(outdir, 'reps.pt'), 'wb').write(b'0' * 64)
    return None, dict(epochs=1, wall_s=0.0, peak_rss_mb=0.0, losses=[0.1]), None


def fake_score(reps_path, rows, cands, P_of, lag, C):
    tables = {sc: {t['task_id']: {'a.py': 0.75, 'b.py': 0.25} for t in rows} for sc in sb.SCOPES}
    per = {}
    for i, t in enumerate(rows):
        base = dict(seeds=1, seeds_folded=0, cands=2, cands_folded=0, cands_unscored=0)
        per[t['task_id']] = dict(parent=t['parent'], checkpoint=C, lag=lag[t['task_id']],
                                 pool=dict(base, **(FOLD if i == 0 else {})), unrestricted=dict(base))
    return tables, per


sb.kge.train = fake_train; sb.score_tasks = fake_score
sb.load_cands = lambda: {sc: {t['task_id']: ['a.py', 'b.py'] for t in mine} for sc in sb.SCOPES}
sb.SEEDS = (1,)


def setup(case, cps, s=1):
    base = os.path.join(OUT, case)
    sb.PARTS = os.path.join(base, 'parts'); sb.TABLES = os.path.join(base, 'tables'); sb.PROG = os.path.join(base, 'progress.jsonl')
    ts = [t for t in mine if t['parent'] in cps]
    sb.load_tasks = lambda: ts
    plan = dict(s=s, plan_hash=sb.plan_hash(s), configs={'E2': [dict(config_id='c01', cfg={}, epochs=1)]}, checkpoints=cps,
                assignment={t['parent']: t['parent'] for t in ts}, lag={t['task_id']: 0 for t in ts})
    return base, plan


def status():
    rows = [json.loads(l) for l in open(sb.PROG)] if os.path.exists(sb.PROG) else []
    return [(r['status'], (r.get('error') or '')[:70]) for r in rows]


def files_under(d):
    return sorted(os.path.relpath(os.path.join(r, f), d) for r, _, fs in os.walk(d) for f in fs) if os.path.exists(d) else []


def run(case, fold, s=1):
    FOLD.clear(); FOLD.update(fold)
    base, plan = setup(case, [C1], s)
    try:
        sb.run_units(['E2'], plan); r = 'returned'
    except BaseException as e:
        r = 'escaped %r' % e
    return r, status(), files_under(sb.PARTS)


for case, fold, s, want in (('r65a', dict(cands_folded=1), 1, 'failed'), ('r65b', dict(seeds_folded=1), 1, 'failed'),
                            ('r65c', {}, 1, 'done'), ('r65d', dict(cands_folded=1), 3, 'done')):
    r, st, left = run(case, fold, s)
    good = r == 'returned' and [x[0] for x in st] == [want] and (want == 'done' or (not left and 'ruling 65' in st[0][1]))
    ok[case] = good
    print('%s s=%d fold %s -> %s %s parts files %d %s' % (case, s, fold, r, st, len(left), 'ok' if good else 'VIOLATED'), flush=True)

# r65e: a done part whose counts.json holds a fold count, then assemble at s = 1
FOLD.clear()
base, plan = setup('r65e', [C1], 1)
sb.run_units(['E2'], plan)
d = os.path.join(sb.PARTS, 'E2', 'c01', 's1', C1)
cj = json.load(open(os.path.join(d, 'counts.json')))
tid0 = sorted(cj)[0]; cj[tid0]['pool']['cands_folded'] = 2
json.dump(cj, open(os.path.join(d, 'counts.json'), 'w'))
shutil.rmtree(sb.TABLES, ignore_errors=True)
try:
    sb.assemble('E2', plan); r65e = 'assembled'
except BaseException as e:
    r65e = 'refused: %s' % str(e)[:120]
ok['r65e'] = r65e.startswith('refused') and 'ruling 65' in r65e
print('r65e assemble at s=1 with a folded count in a part ->', r65e, 'ok' if ok['r65e'] else 'VIOLATED', flush=True)

# r66c: runner and processes in every part (trained and no-co_changed branches) and in the assembled meta
FOLD.clear()
os.environ.update(STAGEB_RUNNER='test-runner r66c', STAGEB_PROCS='2')
base, plan = setup('r66c', [C1, C0], 1)
try:
    sb.run_units(['E2'], plan); r = 'returned'
except BaseException as e:
    r = 'escaped %r' % e
for k in ('STAGEB_PROCS', 'STAGEB_RUNNER'): os.environ.pop(k, None)
metas = {}
for C in (C1, C0):
    p = os.path.join(sb.PARTS, 'E2', 'c01', 's1', C, 'meta.json')
    m = json.load(open(p)) if os.path.exists(p) else {}
    metas[C[:8]] = (m.get('runner'), m.get('processes'))
am = os.path.join(sb.TABLES, 'E2_c01_s1_meta.json')
amj = json.load(open(am)) if os.path.exists(am) else {}
ok['r66c'] = r == 'returned' and all(v == ('test-runner r66c', 2) for v in metas.values()) \
    and amj.get('runners') == [dict(processes=2, runner='test-runner r66c')]
print('r66c', r, 'parts (runner, processes)', metas, 'assembled runners', amj.get('runners'), 'ok' if ok['r66c'] else 'VIOLATED', flush=True)
json.dump(ok, open(os.path.join(OUT, 'result.json'), 'w'), indent=1)
print('RESULT', 'PASS' if all(ok.values()) else 'FAIL', 'test_r65_66', VAR, json.dumps(ok), flush=True)
