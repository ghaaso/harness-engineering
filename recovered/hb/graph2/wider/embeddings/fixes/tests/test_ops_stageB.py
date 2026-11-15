"""Plumbing test of the release-gate changes to stageB.py (operations-02 progress path, operations-10 assemble).
No training (kge.train and scoring are stubbed), no metric; tuning task ids and parent shas only.
Outputs under OUT (default /w/fixes/tests/out/<variant>/ops_stageB).
usage: python tests/test_ops_stageB.py <post|pre4>   pre4 = stageB.py before this round (fixes/pre_m4, by path)
  opsA  STAGEB_PROGRESS set -> the module appends there (PROG); unset -> train/progress.jsonl (default unchanged)
  opsB  done_units reads every progress*.jsonl in PROG's folder: a done unit in progress.jsonl, another in
        progress-B2.jsonl, and a torn last line (half a JSON object, NUL bytes) in progress.jsonl -> both units,
        no exception
  opsC  control: a first assemble writes the three tables files and _meta.json
  opsD  re-assemble after an interrupted one (tables and _counts.json present, _meta.json gone) while os.replace
        refuses to replace ONTO an existing file (as this mount did): the post code drops each destination first
        and completes; the result equals the first assemble byte for byte (tables) and in content (json)
  opsE  the completion marker goes first: the re-assemble is interrupted after the first table (a writer raises)
        -> no _meta.json is left behind, so the next launch redoes it
Prints one line per check and RESULT PASS|FAIL."""
import os, sys, json, shutil, gzip, importlib.util
ROOT = os.environ.get('EMB_ROOT', '/w')
sys.path[:0] = [os.path.join(ROOT, 'train'), os.path.join(ROOT, 'export'), os.path.join(ROOT, 'eval')]
VAR = sys.argv[1] if len(sys.argv) > 1 else 'post'
OUT = os.path.join(os.environ.get('OUT', os.path.join(ROOT, 'fixes', 'tests', 'out', VAR)), 'ops_stageB')
if os.path.exists(OUT): shutil.rmtree(OUT)
os.makedirs(OUT)
for k in ('STAGEB_LANES', 'STAGEB_PROCS', 'STAGEB_RUNNER', 'STAGEB_PROGRESS'): os.environ.pop(k, None)
SRC = os.path.join(ROOT, 'fixes', 'pre_m4', 'stageB.py') if VAR == 'pre4' else os.path.join(ROOT, 'train', 'stageB.py')
n_load = [0]


def load():
    n_load[0] += 1
    spec = importlib.util.spec_from_file_location('stageB_o%d' % n_load[0], SRC)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m


import atomic
atomic.PAUSE = 0.0  # the retries still happen (five attempts), without the pauses
ok = {}

# opsA
sb = load(); default_prog = sb.PROG
want = os.path.join(OUT, 'a', 'progress-B9.jsonl')
os.environ['STAGEB_PROGRESS'] = want
sbA = load(); os.environ.pop('STAGEB_PROGRESS')
ok['opsA'] = sbA.PROG == want and default_prog == os.path.join(ROOT, 'train', 'progress.jsonl')
print('opsA PROG with STAGEB_PROGRESS =', sbA.PROG, '| unset =', default_prog, 'ok' if ok['opsA'] else 'VIOLATED', flush=True)

# opsB
d = os.path.join(OUT, 'b'); os.makedirs(d)
with open(os.path.join(d, 'progress.jsonl'), 'wb') as f:
    f.write(b'{"step": "stageB", "unit": "E2/c01/s1/aaaaaaaaaaaa", "status": "done"}\n{"step": "stageB", "unit": "E2/c0\x00\x00')
with open(os.path.join(d, 'progress-B2.jsonl'), 'w') as f:
    f.write('{"step": "stageB", "unit": "E3/c02/s2/bbbbbbbbbbbb", "status": "done"}\n')
sb.PROG = os.path.join(d, 'progress.jsonl')
try:
    got = sorted(sb.done_units()); r = 'returned'
except BaseException as e:
    got = None; r = 'escaped %r' % e
ok['opsB'] = got == ['E2/c01/s1/aaaaaaaaaaaa', 'E3/c02/s2/bbbbbbbbbbbb']
print('opsB done_units ->', r, got, 'ok' if ok['opsB'] else 'VIOLATED', flush=True)

# stubbed units for assemble (as test_r65_66)
import checkpoints as ck
tasks_all = sb.load_tasks()
C1 = sb.kge.STAGEA_SHA
mine = [t for t in tasks_all if t['parent'] == C1][:3]


def fake_train(arm, cfg, seed, C, holdout=False, outdir=None, max_epochs=None, es=True, **kw):
    os.makedirs(outdir, exist_ok=True); open(os.path.join(outdir, 'reps.pt'), 'wb').write(b'0' * 64)
    return None, dict(epochs=1, wall_s=0.0, peak_rss_mb=0.0, losses=[0.1]), None


def fake_score(reps_path, rows, cands, P_of, lag, C):
    tables = {sc: {t['task_id']: {'a.py': 0.75, 'b.py': 0.25} for t in rows} for sc in sb.SCOPES}
    per = {}
    for t in rows:
        base = dict(seeds=1, seeds_folded=0, cands=2, cands_folded=0, cands_unscored=0)
        per[t['task_id']] = dict(parent=t['parent'], checkpoint=C, lag=lag[t['task_id']], pool=dict(base), unrestricted=dict(base))
    return tables, per


sb.kge.train = fake_train; sb.score_tasks = fake_score
sb.load_cands = lambda: {sc: {t['task_id']: ['a.py', 'b.py'] for t in mine} for sc in sb.SCOPES}
sb.load_tasks = lambda: mine
sb.SEEDS = (1,)
base_dir = os.path.join(OUT, 'asm')
sb.PARTS = os.path.join(base_dir, 'parts'); sb.TABLES = os.path.join(base_dir, 'tables'); sb.PROG = os.path.join(base_dir, 'progress.jsonl')
plan = dict(s=1, plan_hash=sb.plan_hash(1), configs={'E2': [dict(config_id='c01', cfg={}, epochs=1)]}, checkpoints=[C1],
            assignment={C1: C1}, lag={t['task_id']: 0 for t in mine})
sb.run_units(['E2'], plan)
B = os.path.join(sb.TABLES, 'E2_c01_s1')
names = ['_pool.tsv.gz', '_unrestricted.tsv.gz', '_counts.json', '_meta.json']


def snap():
    out = {}
    for n in names:
        p = B + n
        if not os.path.exists(p): out[n] = None
        elif n.endswith('.gz'): out[n] = gzip.open(p, 'rb').read()
        else: out[n] = json.load(open(p))
    return out


# opsC
try:
    sb.assemble('E2', plan); r = 'assembled'
except BaseException as e:
    r = 'escaped %r' % e
first = snap()
ok['opsC'] = r == 'assembled' and all(first[n] is not None for n in names)
print('opsC first assemble ->', r, 'files', [n for n in names if first[n] is not None], 'ok' if ok['opsC'] else 'VIOLATED', flush=True)

# opsD
real_replace = os.replace
refused = [0]


def replace_not_onto_existing(src, dst):
    if os.path.lexists(dst):
        refused[0] += 1
        raise PermissionError(13, 'Permission denied (test: replace onto an existing file)', dst)
    return real_replace(src, dst)


os.remove(B + '_meta.json')
os.replace = replace_not_onto_existing
try:
    sb.assemble('E2', plan); r = 'assembled'
except BaseException as e:
    r = 'escaped %s' % repr(e)[:110]
finally:
    os.replace = real_replace
second = snap()
leftover = sorted(n for n in os.listdir(sb.TABLES) if '.part' in n)
ok['opsD'] = r == 'assembled' and second == first and not leftover
print('opsD re-assemble with replace-onto-existing refused ->', r, '| refusals', refused[0], '| equal to first',
      second == first, '| .part left', leftover, 'ok' if ok['opsD'] else 'VIOLATED', flush=True)

# opsE
import evalcore as ec
real_w = ec.write_score_table
calls = [0]


def w_fail_second(p, T):
    calls[0] += 1
    if calls[0] == 2: raise RuntimeError('test: interrupted after the first table')
    return real_w(p, T)


shutil.rmtree(sb.TABLES); sb.assemble('E2', plan)  # a fresh complete set, _meta.json included
ec.write_score_table = w_fail_second
try:
    os.remove(B + '_pool.tsv.gz')  # a complete set with a matching plan_hash is skipped, so drop one table
    sb.assemble('E2', plan); r = 'assembled'
except BaseException as e:
    r = 'interrupted: %s' % str(e)[:60]
finally:
    ec.write_score_table = real_w
meta_left = os.path.exists(B + '_meta.json')
ok['opsE'] = r.startswith('interrupted') and not meta_left
print('opsE re-assemble interrupted after the first table ->', r, '| _meta.json left', meta_left, 'ok' if ok['opsE'] else 'VIOLATED', flush=True)

json.dump(ok, open(os.path.join(OUT, 'result.json'), 'w'), indent=1)
print('RESULT', 'PASS' if all(ok.values()) else 'FAIL', 'test_ops_stageB', VAR, json.dumps(ok), flush=True)
