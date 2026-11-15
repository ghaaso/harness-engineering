"""Agent A, round r58c, rulings 96(a) and 97(e): test of r58c/A/inject_kinds.py on the largest tuning graph (export/graphs0/7b3a7452,
read only). Checks:
  inj_relations   the copy has the source's relation types + 1 (the made-up one), i.e. 35 + 1 = 36 counted as distinct
                  values of triples.tsv's relation column (sizes.json `relations` agrees); 35 is also the count over all 53
                  tuning checkpoints, so the copy carries the tuning set plus one, as the held-out graphs do (ruling 96);
  inj_kinds       the copy has the source's kinds + 2 made-up ones (23 + 2); the 10 injected nodes carry the made-up
                  root-level path zz-injected-layer.txt, are non-code (is_code_file 0) and of area `other` (ruling 97(e));
                  the new relation has 50 distinct triples, every one from a new node to an existing entity: 40 (four in
                  five) to code files (file:<path>), 6 to symbols of code files, 4 to other non-file entities; every new
                  node has a tie; the first 10 code files in path order (probe-full's task seeds) each have one; the
                  area and code-flag value sets are unchanged;
  inj_drop_other_co  a copy of cd806c80 with --drop-other-co: by kge.area_triples (the real E5 split), the 'other'
                  specialist's triples hold no co_changed while every other area's still do, and only co_changed
                  triples touching 'other' were removed (count recorded); the source is unchanged;
  inj_keeps_rows  every source row of entities.tsv and triples.tsv is in the copy, in order, byte for byte (a prefix);
  inj_source_identical  the source folder's files have the same sha256 before and after (and no file was added);
  inj_refusals    a second copy to the same place, a copy under export/ and a copy inside the source are refused (exit 2)
                  and leave the source untouched.
Writes only r58c/A/out/inject_test (removed at the end). Runs in a ktest-a<N> container (EMB_ROOT=/w)."""
import os, sys, json, shutil
ROOT = '/w'; sys.path[:0] = [os.path.join(ROOT, 'r58c', 'A'), os.path.join(ROOT, 'train'), os.path.join(ROOT, 'export'), os.path.join(ROOT, 'eval')]
import inject_kinds as ik
SRC = os.path.join(ROOT, 'export', 'graphs0', '7b3a745281898d3d5808c5a15c4916d1d9dbb1b4')
SRC2 = os.path.join(ROOT, 'export', 'graphs0', 'cd806c803c4ad8ec198790096d196460789951f0')
T = os.path.join(ROOT, 'r58c', 'A', 'out', 'inject_test')
PLAN = os.path.join(ROOT, 'r58b', 'out', 'fakeB', 'stageB', 'plan.json')
res = {}


def check(name, ok, *msg):
    res[name] = bool(ok); print('%s %s: %s' % ('PASS' if ok else 'FAIL', name, ' '.join(str(m) for m in msg)), flush=True)


def tsv(p):
    return [l.split('\t') for l in open(p, encoding='utf-8').read().split('\n')[1:] if l]


def exits(fn, *a):
    try: fn(*a)
    except SystemExit as e: return e.code
    return 0


if os.path.isdir(T): shutil.rmtree(T)
os.makedirs(T)
before = ik.tree_sha(SRC)
print('source', SRC, json.dumps(before), flush=True)
tune_rel = set()
for C in json.load(open(PLAN))['checkpoints']:
    tune_rel |= {r[1] for r in tsv(os.path.join(ROOT, 'export', 'graphs0', C, 'triples.tsv'))}
dst = os.path.join(T, 'g0', os.path.basename(SRC))
r = ik.inject(SRC, dst)
se, st = tsv(os.path.join(SRC, 'entities.tsv')), tsv(os.path.join(SRC, 'triples.tsv'))
ce, ct = tsv(os.path.join(dst, 'entities.tsv')), tsv(os.path.join(dst, 'triples.tsv'))
srel, crel = {x[1] for x in st}, {x[1] for x in ct}
sz = json.load(open(os.path.join(dst, 'sizes.json')))
check('inj_relations', len(crel) == len(srel) + 1 == len(tune_rel) + 1 == 36 and crel - srel == {ik.REL} and srel <= tune_rel
      and sz['relations'] == len(crel) and sz['triples_by_relation'][ik.REL] == r['injected_triples'] and sz['triples'] == len(ct),
      'source', len(srel), 'copy', len(crel), 'tuning set (53 checkpoints)', len(tune_rel), 'sizes.json relations', sz['relations'])
sk, ck = {x[1] for x in se}, {x[1] for x in ce}
new = ce[len(se):]; ids = {x[0] for x in new}; code = {x[0] for x in se if x[3] == '1' and x[0] == 'file:' + x[2]}
cpaths = {x[2] for x in se if x[3] == '1'}; syms = {x[0] for x in se if x[3] == '0' and x[2] in cpaths and not x[0].startswith('file:')}
others = {x[0] for x in se if x[3] == '0' and not x[0].startswith('file:') and x[2] not in cpaths}; old = {x[0] for x in se}
nt = ct[len(st):]
first10 = sorted(code, key=lambda e: e)[:10]
ties = {}
for h, rel, t in ct[len(st):]: ties.setdefault(h, []).append((rel, t))
ends = dict(files=sum(t in code for _, _, t in nt), symbols=sum(t in syms for _, _, t in nt), other_non_file=sum(t in others for _, _, t in nt))
check('inj_kinds', ck - sk == set(ik.KINDS) and len(ck) == len(sk) + 2
      and all(x[1] in ik.KINDS and x[2] == 'zz-injected-layer.txt' and '/' not in x[2] and x[3] == '0' and x[4] == 'other' for x in new)
      and {x[4] for x in ce} == {x[4] for x in se} and {x[3] for x in ce} == {x[3] for x in se}
      and len(nt) == 50 == len({tuple(x) for x in nt}) and all(h in ids and rel == ik.REL and t in old for h, rel, t in nt)
      and ends == dict(files=40, symbols=6, other_non_file=4) and set(ties) == ids
      and all(any(t == f for v in ties.values() for _, t in v) for f in first10)
      and len(ids) == r['injected_nodes'] == 10,
      'kinds', len(sk), '->', len(ck), 'injected nodes', len(ids), 'triples', len(nt), 'ends', ends, 'areas', sorted({x[4] for x in ce}))
sb = open(os.path.join(SRC, 'entities.tsv'), 'rb').read(); cb = open(os.path.join(dst, 'entities.tsv'), 'rb').read()
sb2 = open(os.path.join(SRC, 'triples.tsv'), 'rb').read(); cb2 = open(os.path.join(dst, 'triples.tsv'), 'rb').read()
check('inj_keeps_rows', cb.startswith(sb) and cb2.startswith(sb2) and ce[:len(se)] == se and ct[:len(st)] == st, 'source rows are a byte prefix of the copy')
r2 = exits(ik.inject, SRC, dst)
r3 = exits(ik.inject, SRC, os.path.join(ROOT, 'export', 'zz_inject_refused'))
r4 = exits(ik.inject, SRC, os.path.join(SRC, 'zz_inside'))
check('inj_refusals', (r2, r3, r4) == (2, 2, 2) and not os.path.exists(os.path.join(ROOT, 'export', 'zz_inject_refused'))
      and not os.path.exists(os.path.join(SRC, 'zz_inside')), 'exits', r2, r3, r4)
before2 = ik.tree_sha(SRC2)
dst2 = os.path.join(T, 'g0noco', os.path.basename(SRC2))
r5 = ik.inject(SRC2, dst2, drop_other_co=True)
import kge
kge.G0 = os.path.join(T, 'g0noco'); e2, t2 = kge.read_graph(os.path.basename(SRC2))
kge.G0 = os.path.join(ROOT, 'export', 'graphs0'); e1, t1 = kge.read_graph(os.path.basename(SRC2))
co_by = {A: sum(1 for x in kge.area_triples(t2, e2, A) if x[1] == kge.CO) for A in kge.AREAS}
co_src = {A: sum(1 for x in kge.area_triples(t1, e1, A) if x[1] == kge.CO) for A in kge.AREAS}
gone = set(t1) - set(t2)
check('inj_drop_other_co', co_by['other'] == 0 and co_src['other'] > 0 and all(co_by[A] > 0 for A in kge.AREAS if A != 'other' and co_src[A] > 0)
      and all(x[1] == kge.CO and 'other' in (e1[x[0]][2], e1[x[2]][2]) for x in gone) and len(gone) == r5['co_changed_dropped'] > 0
      and ik.tree_sha(SRC2) == before2 and len({x[1] for x in t2}) == len({x[1] for x in t1}) + 1,
      'co_changed per E5 specialist, source', co_src, 'copy', co_by, 'dropped', r5['co_changed_dropped'])
after = ik.tree_sha(SRC)
check('inj_source_identical', after == before and r['source_unchanged'] is True, 'sha256 of the source files before == after:', after == before)
shutil.rmtree(T, ignore_errors=True)
ok = all(res.values())
print('RESULT %s inject-kinds %s' % ('PASS' if ok else 'FAIL', json.dumps(res)), flush=True)
sys.exit(0 if ok else 1)
