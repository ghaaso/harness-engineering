"""Agent B, round 3 (ruling 97 (b), (d)): r58c/B/e5_route_audit.py, the post-run route audit (END-ORDER 9.2a, ktest-r11),
on a STAND-IN graph built here: two parents and two checkpoints in graphs0's format (entities.tsv `id kind path code area`,
triples.tsv `h r t`), fake held-out parts (counts.json per checkpoint), a fake tasks.jsonl, a fake stage-B counts file
over late-50 and other tune task ids taken from eval/tune_tasks.jsonl, and two item27 stand-ins (frozen arm E5, and E1).
Every expected count is worked out by hand below. kge.route is imported by the audit, not copied: the source holds no
routing function of its own, and replacing kge.route in-process changes the counts. A mutant whose skip rule is "the area
has triples" instead of "the area has a co_changed triple" gives other counts (the test tells the two apart).
Reads nothing under train/stageB, train/selectB, train/heldout, train/report or grader-returns/. Writes under $R58_OUT.
usage (in a ktest-b container, through kt_inner.sh): python /w/r58c/B/tests/test_e5_route_audit.py
"""
import contextlib, importlib.util, io, json, os, shutil, subprocess, sys

sys.path.insert(0, '/w/train'); sys.path.insert(0, '/w/eval')
OUT = os.environ.get('R58_OUT', '/w/r58c/B/out/test_e5_route_audit')
AUD = '/w/r58c/B/e5_route_audit.py'
n = fails = 0


def check(name, cond, detail=''):
    global n, fails
    n += 1
    if not cond: fails += 1
    print('%s %s%s' % ('PASS' if cond else 'FAIL', name, '' if cond else ' :: %s' % (detail,)), flush=True)


def put(p, text):
    os.makedirs(os.path.dirname(p), exist_ok=True); open(p, 'w', encoding='utf-8').write(text); return p


def graph(root, sha, ents, tri):
    put(os.path.join(root, sha, 'entities.tsv'), 'id\tkind\tpath\tcode\tarea\n' + ''.join('%s\t%s\t%s\t%s\t%s\n' % e for e in ents))
    put(os.path.join(root, sha, 'triples.tsv'), 'h\tr\tt\n' + ''.join('%s\t%s\t%s\n' % t for t in tri))


def run(args):
    p = subprocess.run([sys.executable, AUD] + args, capture_output=True, text=True, timeout=300)
    return p.returncode, (p.stdout + p.stderr).strip().splitlines()


shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT)
G = os.path.join(OUT, 'graphs0')
F = lambda p, area, code='1': ('file:' + p, 'file', p, code, area)
D_ = lambda x: ('doc:' + x, 'doc', x, '0', 'other')   # the new layer's nodes (ruling 96): area other, not code
base_ents = [F('a.py', 'backend'), F('b.py', 'backend'), F('s.py', 'backend'), F('m1.ts', 'mobile'), F('m2.ts', 'mobile'),
             F('w.js', 'web'), F('w2.js', 'web'), D_('x'), D_('y')]
# parents: the routing reads P's 1-hop neighbours
#   a.py: b.py (backend, its own area), doc:x (other)          -> route [backend, other]   (second specialist `other`)
#   s.py: m1.ts, m2.ts (mobile), doc:y (other)                 -> route [backend, mobile]  (mobile 2 > other 1)
#   w.js: w2.js (web)                                          -> route [web]              (one specialist)
par = [('file:a.py', 'co_changed', 'file:b.py'), ('file:a.py', 'mentions', 'doc:x'), ('file:s.py', 'co_changed', 'file:m1.ts'),
       ('file:s.py', 'co_changed', 'file:m2.ts'), ('file:s.py', 'mentions', 'doc:y'), ('file:w.js', 'imports', 'file:w2.js')]
graph(G, 'P1', base_ents, par); graph(G, 'P2', base_ents, par)
# checkpoints: which specialists exist (an area holds a co_changed triple at C)
#   C1: backend yes (a-b), mobile yes (s-m1), web NO (imports only), other NO (mentions only, no co_changed)
#   C2: as C1 plus doc:x co_changed doc:y -> other yes
c1 = [('file:a.py', 'co_changed', 'file:b.py'), ('file:s.py', 'co_changed', 'file:m1.ts'), ('file:w.js', 'imports', 'file:w2.js'),
      ('file:a.py', 'mentions', 'doc:x')]
graph(G, 'C1', base_ents, c1); graph(G, 'C2', base_ents, c1 + [('doc:x', 'co_changed', 'doc:y')])
# held-out tasks (seed 1's parts of the chosen setting; s2 must be ignored)
#   h1 P1@C1 a.py: [backend, other], other skipped    -> two, second_other, skipped, skipped_second_other
#   h2 P1@C1 s.py: [backend, mobile], none skipped    -> two
#   h3 P1@C1 w.js: [web], web skipped                 -> skipped, skipped_first
#   h4 P2@C2 a.py: [backend, other], none skipped     -> two, second_other
H = os.path.join(OUT, 'heldout')
cnt = lambda P, C, k: dict(parent=P, checkpoint=C, lag=0, pool=dict(cands=k), unrestricted=dict(cands=k + 100))
for arm, cid in (('E5', 'c13'), ('E1', 'c11')):
    put(os.path.join(H, 'parts', arm, cid, 's1', 'C1', 'counts.json'), json.dumps(dict(h1=cnt('P1', 'C1', 10), h2=cnt('P1', 'C1', 20), h3=cnt('P1', 'C1', 30))))
    put(os.path.join(H, 'parts', arm, cid, 's1', 'C2', 'counts.json'), json.dumps(dict(h4=cnt('P2', 'C2', 41))))
    put(os.path.join(H, 'parts', arm, cid, 's2', 'C1', 'counts.json'), json.dumps(dict(h9=cnt('P1', 'C1', 999))))
TASKS = put(os.path.join(OUT, 'tasks.jsonl'), ''.join(json.dumps(r) + '\n' for r in (
    dict(id='h1', split='heldout', parent='P1', seed=dict(path='a.py')), dict(id='h2', split='heldout', parent='P1', seed=dict(path='s.py')),
    dict(id='h3', split='heldout', parent='P1', seed=dict(path='w.js')), dict(id='h4', split='heldout', parent='P2', seed=dict(path='a.py')),
    dict(id='T-x', split='tune', parent='P9', seed=dict(path='q.py')))))
# stage-B counts: three late-50 tune tasks (5, 7, 100 -> median 7) and one tune task outside the late 50 (1000, left out)
import evalcore as ec
tt = ec.load_tasks(); late = ec.commit_set(tt, 'late50')
L50 = [t['task_id'] for t in tt if t['commit'] in late][:3]; NOT50 = [t['task_id'] for t in tt if t['commit'] not in late][:1]
check('stand_in_tune_ids', len(L50) == 3 and len(NOT50) == 1, (L50, NOT50))
T = os.path.join(OUT, 'tables')
for arm, cid in (('E5', 'c13'), ('E1', 'c11')):
    put(os.path.join(T, '%s_%s_s1_counts.json' % (arm, cid)), json.dumps(dict({k: dict(pool=dict(cands=v)) for k, v in zip(L50, (5, 100, 7))},
                                                                            **{NOT50[0]: dict(pool=dict(cands=1000))})))
R5 = put(os.path.join(OUT, 'item27-E5.json'), json.dumps(dict(test=True, chosen=dict(arm='E5', config_id='c13', epochs=10, w=0.5))))
R1 = put(os.path.join(OUT, 'item27-E1.json'), json.dumps(dict(test=True, chosen=dict(arm='E1', config_id='c11', epochs=10, w=0.5))))
args = lambda r27, out, **kw: sum(([('--' + k).replace('_', '-'), v] for k, v in dict(dict(item27=r27, heldout_dir=H, tables=T, tasks=TASKS, graphs=G, out=out), **kw).items()), ['--test'])

# ---- E5: the counts against the hand computation
O5 = os.path.join(OUT, 'out', 'e5.json'); rc, lines = run(args(R5, O5))
J = json.load(open(O5)) if os.path.exists(O5) else {}
want = dict(tasks=4, two_specialists=3, second_other=2, skipped=2, skipped_second_other=1, skipped_first=1, parents=2, checkpoints=2)
got = {k: (J.get('route') or {}).get(k) for k in want}
check('e5_exit0', rc == 0 and any(l.startswith('RESULT PASS e5-route-audit') for l in lines), (rc, lines[-3:]))
check('e5_route_counts_by_hand', got == want, got)
check('e5_pool_medians', J.get('pool', {}).get('late50') == dict(tasks=3, median=7) and J.get('pool', {}).get('heldout') == dict(tasks=4, median=25.0),
      J.get('pool'))
import hashlib
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
check('e5_record_fields', J.get('test') is True and J.get('applies') is True and J.get('arm') == 'E5' and J.get('config_id') == 'c13'
      and J.get('item27_sha256') == sha(R5) and J.get('kge_sha256') == sha('/w/train/kge.py') and J.get('self_sha256') == sha(AUD)
      and J.get('pool', {}).get('sources', {}).get('late50_sha256') == sha(os.path.join(T, 'E5_c13_s1_counts.json')), {k: J.get(k) for k in ('test', 'applies', 'arm')})
# ---- E1: no route counts, the pool medians still computed
O1 = os.path.join(OUT, 'out', 'e1.json'); rc1, l1 = run(args(R1, O1)); J1 = json.load(open(O1)) if os.path.exists(O1) else {}
check('e1_not_applicable', rc1 == 0 and J1.get('applies') is False and J1.get('route') is None and J1.get('arm') == 'E1'
      and J1.get('pool', {}).get('heldout') == dict(tasks=4, median=25.0), (rc1, J1.get('applies'), J1.get('route')))
# ---- kge.route is kge's own (imported, not copied)
src = open(AUD).read()
check('route_imported_not_copied', 'kge.route(' in src and 'def route' not in src and 'Counter(ents' not in src, 'source')
spec = importlib.util.spec_from_file_location('e5ra', AUD); M = importlib.util.module_from_spec(spec); spec.loader.exec_module(M)
import kge
r0 = kge.route; kge.route = lambda seed_e, ents, nb: [ents.get(seed_e, ('', '', 'other'))[2]]  # one specialist always
try:
    with contextlib.redirect_stdout(io.StringIO()): res = M.main(args(R5, os.path.join(OUT, 'out', 'stub.json')))
finally:
    kge.route = r0
check('route_replaced_in_kge_changes_counts', (res.get('route') or {}).get('second_other') == 0 and (res.get('route') or {}).get('two_specialists') == 0
      and (res.get('route') or {}).get('skipped') == 1, res.get('route'))
# ---- a mutant skip rule ("the area has triples") is told apart: at C1 web and other have triples but no co_changed, so
#      the mutant skips nothing (h1 and h3 are skipped under kge's rule)
MU = os.path.join(OUT, 'mutant.py')
ms = src.replace('any(x[1] == kge.CO for x in kge.area_triples(triC, entsC, A))', 'bool(kge.area_triples(triC, entsC, A))')
put(MU, ms); pm = subprocess.run([sys.executable, MU] + args(R5, os.path.join(OUT, 'out', 'mutant.json')), capture_output=True, text=True, timeout=300)
JM = json.load(open(os.path.join(OUT, 'out', 'mutant.json'))) if os.path.exists(os.path.join(OUT, 'out', 'mutant.json')) else {}
check('mutant_skip_rule_differs', ms != src and pm.returncode == 0 and (JM.get('route') or {}).get('skipped_first') == 0
      and (JM.get('route') or {}).get('skipped') == 0 and (JM.get('route') or {}).get('skipped_second_other') == 0, (ms != src, pm.returncode, JM.get('route')))
# ---- refusals
bad = {}
bad['real_with_option'] = run(['--item27', R5])[0]
bad['test_missing_input'] = run(['--test', '--item27', R5, '--out', os.path.join(OUT, 'out', 'x.json')])[0]
bad['test_out_under_train'] = run(args(R5, '/w/train/report/e5_route/x.json'))[0]
bad['unknown_option'] = run(args(R5, os.path.join(OUT, 'out', 'u.json'), bogus='1'))[0]
R5r = put(os.path.join(OUT, 'item27-real.json'), json.dumps(dict(test=False, chosen=dict(arm='E5', config_id='c13'))))
bad['item27_not_test'] = run(args(R5r, os.path.join(OUT, 'out', 'r.json')))[0]
T2 = put(os.path.join(OUT, 'tasks-missing.jsonl'), ''.join(l for l in open(TASKS) if '"h4"' not in l))
bad['task_without_row'] = run(args(R5, os.path.join(OUT, 'out', 'm.json'), tasks=T2))[0]
T3 = put(os.path.join(OUT, 'tasks-parent.jsonl'), open(TASKS).read().replace('"id": "h4", "split": "heldout", "parent": "P2"', '"id": "h4", "split": "heldout", "parent": "P1"'))
bad['parent_mismatch'] = run(args(R5, os.path.join(OUT, 'out', 'p.json'), tasks=T3))[0]
bad['no_tables_file'] = run(args(R5, os.path.join(OUT, 'out', 't.json'), tables=os.path.join(OUT, 'nothing')))[0]
bad['no_parts'] = run(args(R5, os.path.join(OUT, 'out', 'h.json'), heldout_dir=os.path.join(OUT, 'nothing')))[0]
want_bad = dict(real_with_option=2, test_missing_input=2, test_out_under_train=2, unknown_option=2, item27_not_test=3, task_without_row=3,
                parent_mismatch=3, no_tables_file=3, no_parts=3)
check('refusals', bad == want_bad, bad)
check('refusals_write_nothing', not any(os.path.exists(os.path.join(OUT, 'out', x)) for x in ('x.json', 'u.json', 'r.json', 'm.json', 'p.json', 't.json', 'h.json'))
      and not os.path.exists('/w/train/report/e5_route/x.json'), 'no output on a refusal')
print('RESULT %s test_e5_route_audit (%d checks, %d failed)' % ('PASS' if fails == 0 else 'FAIL', n, fails), flush=True)
sys.exit(0 if fails == 0 else 1)
