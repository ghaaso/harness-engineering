"""Agent A, round r58c, rulings 96(a) and 97(c): the ruling-79 probe's synthetic graph carries the held-out graphs'
extra relation, drawn as ruling 97(c) says, and the full-path child records what it scored and ranked.
  r97_synth_new_relation  heldout.synth_graph on a made-up sizes (the 35 relations of the largest tuning graph plus one
        made-up relation of 46 triples, the held-out median): every triple of the made-up relation runs FROM a non-code
        'other' entity TO a code entity, 37 of 46 (four in five, rounded) to a code file and 9 to code-area symbols,
        pairs distinct; every other relation keeps its count; fail before: the r96 bytes (r58c/A/pre/heldout_r96.py)
        drew it as random pairs (some heads not 'other' or code, some tails not code).
  r97_synth_unchanged_without  without new_rels the synthetic graph is byte-identical to the r96 bytes' (same seed).
  r97_rename  rename_new renames exactly the relations no tuning checkpoint has, keeps their counts, keeps no name.
  r97_probe_counts  a test-mode probe (--scale 25, E1, one setting, 1 epoch, 4 full-path tasks): probe.json says the
        synthetic graph has the largest held-out graph's relation count, = the tuning set's 35 + the 1 relation no tuning
        checkpoint has (rulings 96, 97: one new relation; by the coordinator's own count "37 against 36"); its
        triples_by_relation keys are tuning names or zz_heldout_only_relation_<n> only (no held-out-only name in the
        probe's files); the renamed relation keeps the held-out count // 25.
  r97_full_counts  the full-path child writes counts.json (kge.score's counts per scope) and reports scored_tasks and
        ranked_tasks; fail before: the r96 bytes' probe-full wrote no counts.json and reported neither.
Runs in a ktest-a<N> container (EMB_ROOT=/w); reads tuning graphs and the held-out graphs' sizes.json only (ruling 79),
prints counts only; writes r58c/A/out/probe_r97 (removed at the end).
Relation counts (the coordinator, round 7 point 2): every count here is relation NAMES with co_changed INCLUDED (distinct values
of triples.tsv's relation column = sizes.json `relations` = its triples_by_relation keys): 35 for the tuning set, 36 for
the largest held-out graph (its sizes.json only, ruling 79), one new. The coordinator's count of the same graphs is 36 + 1 = 37."""
import os, sys, json, shutil, subprocess, importlib.util
sys.path.insert(0, os.path.join('/w', 'train', 'r58', 'tests'))
from hotest import *
os.environ.update(KGE_DEVICE='cpu', KGE_IMAGE_ID=IMG)
show_hashes('train/heldout.py', 'r58c/A/pre/heldout_r96.py')
H = fresh(os.path.join(OUTR, 'probe_r97'))
import heldout
spec = importlib.util.spec_from_file_location('heldout_r96', os.path.join(ROOT, 'r58c', 'A', 'pre', 'heldout_r96.py'))
P96 = importlib.util.module_from_spec(spec); spec.loader.exec_module(P96)
G0 = os.path.join(ROOT, 'export', 'graphs0'); T = '7b3a745281898d3d5808c5a15c4916d1d9dbb1b4'
TE = os.path.join(G0, T, 'entities.tsv')
plan = json.load(open(FPLAN))
TUNE = heldout.tuning_relations(G0, plan['checkpoints'])
ts = json.load(open(os.path.join(G0, T, 'sizes.json')))
fake = dict(ts, triples_by_relation=dict(ts['triples_by_relation'], zz_made_up=46))
fake['triples'] = sum(fake['triples_by_relation'].values()); fake['relations'] = len(fake['triples_by_relation'])


def graph(d):
    e = {l.split('\t')[0]: l.rstrip('\n').split('\t') for l in list(open(os.path.join(d, 'entities.tsv')))[1:]}
    t = [l.rstrip('\n').split('\t') for l in list(open(os.path.join(d, 'triples.tsv')))[1:]]
    return e, t


def shape(d, rel):
    e, t = graph(d); x = [r for r in t if r[1] == rel]
    heads_ok = all(e[h][3] != '1' and e[h][4] == 'other' for h, _, _ in x)
    files = sum(e[tl][3] == '1' for _, _, tl in x); syms = sum(e[tl][3] != '1' and e[tl][4] != 'other' for _, _, tl in x)
    return dict(n=len(x), heads_other_noncode=heads_ok, to_files=files, to_symbols=syms, distinct=len({(h, tl) for h, _, tl in x}) == len(x))


own = heldout.synth_graph(os.path.join(H, 'new'), fake, TE, scale=1, new_rels={'zz_made_up': 46})
sh = shape(os.path.join(H, 'new'), 'zz_made_up')
P96.synth_graph(os.path.join(H, 'pre'), fake, TE, scale=1)
sp = shape(os.path.join(H, 'pre'), 'zz_made_up')
_, tn = graph(os.path.join(H, 'new'))
cnt = {}
for r in tn: cnt[r[1]] = cnt.get(r[1], 0) + 1
check('r97_synth_new_relation', sh == dict(n=46, heads_other_noncode=True, to_files=37, to_symbols=9, distinct=True)
      and cnt == fake['triples_by_relation'] and own['new_relation_triples'] == {'zz_made_up': 46}
      and not (sp['heads_other_noncode'] and sp['to_files'] + sp['to_symbols'] == sp['n']),
      'current', sh, '; r96 bytes (fail before)', sp)
heldout.synth_graph(os.path.join(H, 'new0'), fake, TE, scale=3)
P96.synth_graph(os.path.join(H, 'pre0'), fake, TE, scale=3)
same = all(open(os.path.join(H, 'new0', f), 'rb').read() == open(os.path.join(H, 'pre0', f), 'rb').read() for f in ('entities.tsv', 'triples.tsv'))
check('r97_synth_unchanged_without', same, 'without new_rels: entities.tsv and triples.tsv equal to the r96 bytes byte for byte')
s2, nr = heldout.rename_new(fake, TUNE)
check('r97_rename', nr == {'zz_heldout_only_relation_1': 46} and 'zz_made_up' not in s2['triples_by_relation']
      and {k: v for k, v in s2['triples_by_relation'].items() if k in TUNE} == ts['triples_by_relation'] and len(TUNE) == 35,
      'renamed', nr, 'tuning relation types', len(TUNE))
cmd = [sys.executable, os.path.join(TRAIN, 'heldout.py'), 'probe', '--test', '--plan', FPLAN, '--out', os.path.join(H, 'probe'), '--arms', 'E1',
       '--configs-per-arm', '1', '--scale', '25', '--test-epochs', '1', '--full-tasks', '4']
p = subprocess.run(cmd, cwd=TRAIN, capture_output=True, text=True, env=dict(env0, PYTHONPATH=TRAIN), timeout=500)
print('--- probe exit %d' % p.returncode, flush=True)
r = json.load(open(os.path.join(H, 'probe', 'probe.json'))) if os.path.exists(os.path.join(H, 'probe', 'probe.json')) else {}
sy = r.get('synthetic', {}); lh = r.get('largest_heldout', {})
hs = json.load(open(os.path.join(G0, lh.get('sha', 'x'), 'sizes.json'))) if lh.get('sha') else {}
held_new = sorted(v // 25 for k, v in (hs.get('triples_by_relation') or {}).items() if k not in TUNE)
keys = set(sy.get('triples_by_relation') or {})
text = open(os.path.join(H, 'probe', 'probe.json')).read() if r else ''
leak = [k for k in (hs.get('triples_by_relation') or {}) if k not in TUNE and k in text]
check('r97_probe_counts', p.returncode == 0 and sy.get('relations') == lh.get('relations') == r.get('tuning_relation_types', 0) + r.get('heldout_only_relation_types', 0)
      and r.get('tuning_relation_types') == 35 and r.get('heldout_only_relation_types') == 1
      and keys <= TUNE | {'zz_heldout_only_relation_%d' % (i + 1) for i in range(5)} and not leak
      and sorted((sy.get('new_relation_triples') or {}).values()) == held_new,
      'exit', p.returncode, 'synthetic relations', sy.get('relations'), 'largest held-out', lh.get('relations'), 'tuning', r.get('tuning_relation_types'),
      'held-out only', r.get('heldout_only_relation_types'), 'its synthetic triples', sorted((sy.get('new_relation_triples') or {}).values()),
      'held-out-only names in probe.json', len(leak))
fp = r.get('full_path', {})
cj = os.path.join(H, 'probe', 'full', 'counts.json')
# fail before: the r96 bytes' probe-full on the same kind of graph (a tiny synthetic one made here, tuning names only)
g0 = os.path.join(H, 'g0pre'); P96.synth_graph(os.path.join(g0, 'synthetic-pre'), ts, TE, scale=25, real_ids=True)
pf = os.path.join(H, 'prefull'); os.makedirs(os.path.join(H, 'prebin96'), exist_ok=True)
shutil.copy(os.path.join(ROOT, 'r58c', 'A', 'pre', 'heldout_r96.py'), os.path.join(H, 'prebin96', 'heldout.py'))
q = subprocess.run([sys.executable, os.path.join(H, 'prebin96', 'heldout.py'), 'probe-full', '--g0', g0, '--sha', 'synthetic-pre', '--arm', 'E1', '--cid',
                    plan['configs']['E1'][0]['config_id'], '--epochs', '1', '--plan', FPLAN, '--tparent', T, '--out', pf, '--ntasks', '4'],
                   cwd=TRAIN, capture_output=True, text=True, env=dict(env0, PYTHONPATH=TRAIN), timeout=500)
pl = [json.loads(l[6:]) for l in q.stdout.splitlines() if l.startswith('PROBE ')]
check('r97_full_counts', fp.get('rc') == 0 and os.path.isfile(cj) and set(json.load(open(cj))) == {'pool', 'unrestricted'}
      and set(fp.get('scored_tasks') or {}) == {'pool', 'unrestricted'} and isinstance(fp.get('ranked_tasks'), int)
      and q.returncode == 0 and pl and 'counts' not in pl[0] and 'scored_tasks' not in pl[0] and not os.path.exists(os.path.join(pf, 'counts.json')),
      'current: counts.json', os.path.isfile(cj), 'scored', fp.get('scored_tasks'), 'ranked', fp.get('ranked_tasks'),
      '; r96 bytes (fail before): rc', q.returncode, 'keys', sorted(pl[0]) if pl else None)
shutil.rmtree(H, ignore_errors=True)
ok = finish('probe-r97')
sys.exit(0 if ok else 1)
