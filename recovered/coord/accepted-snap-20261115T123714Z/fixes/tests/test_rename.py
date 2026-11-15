"""Plumbing test, task 2 (hardened `.part` -> final renames). A held destination is simulated by monkeypatching
os.replace to raise PermissionError(13) for chosen targets. No training (kge.train and scoring are stubbed), no metric.
usage: python tests/test_rename.py <post|pre2>
  post = train/stageB.py; pre2 = stageB.py as found at resume, before task 2 (fixes/pre_m2/stageB.py, loaded by path).
  (1) atomic.replace_retry, held 3 times then free -> recovered on attempt 4, pauses grow, no .part left
  (2) atomic.replace_retry, held every time -> RenameFailed after 5 attempts, .part removed, destination absent
  (3) atomic.put_json, held twice -> recovered (the plan / report / e4work writer)
  (4) stageB.write_parts, held twice -> the unit folder written once and complete, no .part
  (5) stageB.write_parts, held every time -> raises; neither the unit folder nor its .part is left
  (6) stageB.run_units on a trained checkpoint, held twice -> the unit is logged done on the first launch
  (7) stageB.run_units, held every time -> logged failed (never done), nothing under parts; the next launch with the
      destination free -> done, complete, assemble writes the tables
  (8) stageB.run_units on a checkpoint without co_changed facts (no training path), held every time -> logged failed
      and the launch goes on (not an escaped exception); next launch -> done
Outputs under OUT (default /w/fixes/tests/out/<variant>/rename). Prints one line per case and RESULT PASS|FAIL."""
import os, sys, json, shutil, types, importlib.util
ROOT = os.environ.get('EMB_ROOT', '/w')
TRAIN = os.path.join(ROOT, 'train')
sys.path[:0] = [TRAIN, os.path.join(ROOT, 'export'), os.path.join(ROOT, 'eval')]
VAR = sys.argv[1] if len(sys.argv) > 1 else 'post'
OUT = os.path.join(os.environ.get('OUT', os.path.join(ROOT, 'fixes', 'tests', 'out', VAR)), 'rename')
if os.path.exists(OUT): shutil.rmtree(OUT)
os.makedirs(OUT)
import atomic, checkpoints as ck
if VAR == 'pre2':
    spec = importlib.util.spec_from_file_location('stageB_pre2', os.path.join(ROOT, 'fixes', 'pre_m2', 'stageB.py'))
    sb = importlib.util.module_from_spec(spec); spec.loader.exec_module(sb)
else:
    import stageB as sb
REAL = os.replace
pauses = []
atomic.time = types.SimpleNamespace(sleep=lambda s: pauses.append(s))  # no real waiting; the pauses are recorded


class Held:
    """os.replace stand-in: raises PermissionError for a destination matching `match`, `n` times (-1: always)."""
    def __init__(s, n, match): s.n = n; s.match = match; s.raised = 0

    def __call__(s, a, b):
        if s.match(str(b)) and s.n != 0:
            s.raised += 1
            if s.n > 0: s.n -= 1
            raise PermissionError(13, 'Permission denied (test: destination held)', str(a))
        return REAL(a, b)


def held(n, match):
    h = Held(n, match); os.replace = h; return h


def free(): os.replace = REAL


def unit_left(C):
    """files anywhere under PARTS, and any folder named after the checkpoint (unit, .part or .model)"""
    if not os.path.exists(sb.PARTS): return []
    return sorted(os.path.relpath(os.path.join(r, x), sb.PARTS) for r, ds, fs in os.walk(sb.PARTS) for x in fs + [y for y in ds if C in y])


def leftovers(d):
    return sorted(os.path.relpath(os.path.join(r, x), d) for r, ds, fs in os.walk(d) for x in ds + fs if x.endswith('.part') or '.part' in x)


ok = {}
# (1) and (2): the helper itself
d = os.path.join(OUT, 'h'); os.makedirs(d)
src, dst = os.path.join(d, 'a.json.part'), os.path.join(d, 'a.json'); open(src, 'w').write('{}')
pauses.clear(); h = held(3, lambda b: b == dst)
try:
    n = atomic.replace_retry(src, dst); r1 = 'recovered on attempt %d' % n
except Exception as e:
    r1 = 'raised %r' % e
free()
ok['1_recover'] = r1 == 'recovered on attempt 4' and os.path.exists(dst) and not os.path.exists(src) and pauses == sorted(pauses) and len(pauses) == 3
print('(1) held 3x:', r1, 'pauses', pauses, 'dst', os.path.exists(dst), '.part', os.path.exists(src), 'ok', ok['1_recover'], flush=True)
src, dst = os.path.join(d, 'b.json.part'), os.path.join(d, 'b.json'); open(src, 'w').write('{}')
pauses.clear(); h = held(-1, lambda b: b == dst)
try:
    atomic.replace_retry(src, dst); r2 = 'returned'
except atomic.RenameFailed as e:
    r2 = 'RenameFailed after %d attempts' % h.raised
free()
ok['2_give_up'] = r2 == 'RenameFailed after 5 attempts' and not os.path.exists(dst) and not os.path.exists(src)
print('(2) held always:', r2, 'pauses', pauses, 'dst', os.path.exists(dst), '.part', os.path.exists(src), 'ok', ok['2_give_up'], flush=True)
dst = os.path.join(d, 'c.json'); h = held(2, lambda b: b == dst)
try:
    atomic.put_json(dst, dict(x=1)); r3 = 'recovered' if json.load(open(dst)) == dict(x=1) else 'wrong content'
except Exception as e:
    r3 = 'raised %r' % e
free()
ok['3_put_json'] = r3 == 'recovered' and not leftovers(d)
print('(3) put_json held 2x:', r3, 'leftovers', leftovers(d), 'ok', ok['3_put_json'], flush=True)

# stageB under test, redirected to OUT
tasks_all = sb.load_tasks()
F = ck.Facts()
C1 = sb.kge.STAGEA_SHA                                                           # a checkpoint with co_changed facts
C0 = next(p for p in F.split_parents('tune') if F.co(p) == 0)                    # one without (no training path)
mine = [t for t in tasks_all if t['parent'] == C1][:2] + [t for t in tasks_all if t['parent'] == C0][:1]
sb.load_tasks = lambda: mine
sb.load_cands = lambda: {sc: {t['task_id']: ['a.py', 'b.py'] for t in mine} for sc in sb.SCOPES}
sb.SEEDS = (1,)


def fake_train(arm, cfg, seed, C, holdout=False, outdir=None, max_epochs=None, es=True, **kw):
    os.makedirs(outdir, exist_ok=True); open(os.path.join(outdir, 'reps.pt'), 'wb').write(b'0' * 64)
    return None, dict(epochs=1, wall_s=0.0, peak_rss_mb=0.0, losses=[0.1]), None


def fake_score(reps_path, rows, cands, P_of, lag, C):
    tables = {sc: {t['task_id']: {'a.py': 0.75, 'b.py': 0.25} for t in rows} for sc in sb.SCOPES}
    per = {t['task_id']: dict(parent=t['parent'], checkpoint=C, lag=lag[t['task_id']], pool=dict(cands=2), unrestricted=dict(cands=2)) for t in rows}
    return tables, per


sb.kge.train = fake_train; sb.score_tasks = fake_score


def setup(case, cps):
    base = os.path.join(OUT, case)
    sb.PARTS = os.path.join(base, 'parts'); sb.TABLES = os.path.join(base, 'tables'); sb.PROG = os.path.join(base, 'progress.jsonl')
    ts = [t for t in mine if t['parent'] in cps]
    sb.load_tasks = lambda: ts
    plan = dict(s=1, plan_hash=sb.plan_hash(1), configs={'E2': [dict(config_id='c01', cfg={}, epochs=1)]}, checkpoints=cps,
                assignment={t['parent']: t['parent'] for t in ts}, lag={t['task_id']: 0 for t in ts})
    return base, plan


def status(base):
    rows = [json.loads(l) for l in open(sb.PROG)] if os.path.exists(sb.PROG) else []
    return [(r['unit'].split('/')[-1][:8], r['status']) for r in rows]


def launch(plan):
    try:
        sb.run_units(['E2'], plan); return 'returned'
    except BaseException as e:
        return 'escaped %r' % e


# (4) and (5): write_parts
base = os.path.join(OUT, 'wp'); out = os.path.join(base, 'unit')
tb = {sc: {'T1': {'a.py': 0.5}} for sc in sb.SCOPES}; per = {'T1': dict(parent='p', checkpoint='c', lag=0, pool={}, unrestricted={})}
h = held(2, lambda b: b == out)
try:
    sb.write_parts(out, tb, per, dict(plan_hash='x')); r4 = 'written'
except Exception as e:
    r4 = 'raised %r' % e
free()
complete = all(os.path.exists(os.path.join(out, f)) for f in ('pool.tsv.gz', 'unrestricted.tsv.gz', 'counts.json', 'meta.json'))
ok['4_write_parts_recover'] = r4 == 'written' and complete and not leftovers(base)
print('(4) write_parts held 2x:', r4, 'complete', complete, 'leftovers', leftovers(base), 'ok', ok['4_write_parts_recover'], flush=True)
shutil.rmtree(base); out = os.path.join(base, 'unit')
h = held(-1, lambda b: b == out)
try:
    sb.write_parts(out, tb, per, dict(plan_hash='x')); r5 = 'written'
except Exception as e:
    r5 = 'raised %s' % type(e).__name__
free()
ok['5_write_parts_give_up'] = r5.startswith('raised') and not os.path.exists(out) and not leftovers(base) and h.raised == 5
print('(5) write_parts held always:', r5, 'attempts', h.raised, 'unit dir', os.path.exists(out), 'leftovers', leftovers(base), 'ok', ok['5_write_parts_give_up'], flush=True)

# (6) run_units, trained checkpoint, held twice
base, plan = setup('ru6', [C1])
h = held(2, lambda b: b.endswith(os.sep + C1) and sb.PARTS in b)
r6 = launch(plan); free()
ok['6_run_units_recover'] = r6 == 'returned' and status(base) == [(C1[:8], 'done')] and os.path.exists(os.path.join(sb.TABLES, 'E2_c01_s1_meta.json'))
print('(6) run_units held 2x:', r6, status(base), 'tables', os.path.exists(os.path.join(sb.TABLES, 'E2_c01_s1_meta.json')), 'ok', ok['6_run_units_recover'], flush=True)

# (7) run_units, trained checkpoint, held always, then a free launch
base, plan = setup('ru7', [C1])
h = held(-1, lambda b: b.endswith(os.sep + C1) and sb.PARTS in b)
r7a = launch(plan); free(); s7a = status(base)
left7 = unit_left(C1)
r7b = launch(plan); s7b = status(base)
ok['7_run_units_give_up_redo'] = r7a == 'returned' and s7a == [(C1[:8], 'failed')] and not left7 and s7b[-1] == (C1[:8], 'done') \
    and os.path.exists(os.path.join(sb.TABLES, 'E2_c01_s1_meta.json'))
print('(7) run_units held always:', r7a, s7a, 'left under parts', left7, '| next launch:', r7b, s7b, 'ok', ok['7_run_units_give_up_redo'], flush=True)

# (8) run_units, checkpoint without co_changed facts (the no-training branch), held always, then a free launch
base, plan = setup('ru8', [C0])
h = held(-1, lambda b: b.endswith(os.sep + C0) and sb.PARTS in b)
r8a = launch(plan); free(); s8a = status(base)
left8 = unit_left(C0)
r8b = launch(plan); s8b = status(base)
ok['8_no_co_give_up_redo'] = r8a == 'returned' and s8a == [(C0[:8], 'failed')] and not left8 and s8b[-1] == (C0[:8], 'done')
print('(8) run_units no-co_changed checkpoint held always:', r8a[:160], s8a, 'left under parts', left8, '| next launch:', r8b[:80], s8b,
      'ok', ok['8_no_co_give_up_redo'], flush=True)
json.dump(ok, open(os.path.join(OUT, 'result.json'), 'w'), indent=1)
print('RESULT', 'PASS' if all(ok.values()) else 'FAIL', 'test_rename', VAR, json.dumps(ok), flush=True)
