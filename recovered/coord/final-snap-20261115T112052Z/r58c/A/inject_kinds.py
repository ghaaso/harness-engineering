"""Agent A, round r58c, ruling 96(a): a COPY of one tuning checkpoint graph (export/graphs0/<C>/: entities.tsv,
triples.tsv, sizes.json) with ONE made-up relation type and TWO made-up node kinds injected, for the rehearsal's
injected-kinds case. The held-out graphs carry such a layer (ruling 96: one relation type and two node kinds no tuning
checkpoint has; the lane is told the counts, not the names), so the names here are invented:
  relation  zz_injected_relation
  kinds     zz_injected_kind_a, zz_injected_kind_b
  path      zz-injected-layer.txt  (a made-up ROOT-LEVEL non-code file: is_code_file 0, area `other`, as on held-out)
Ruling 97(e), after 97(a)'s counts: NODES (10) new nodes, the two kinds alternating, all carrying that path; EDGES (50)
triples of the new relation, every one FROM a new node TO an existing entity: four in five (40) to code-file entities
(is_code_file 1, id file:<path>), the rest to symbol-level entities of code files (6) and to other non-file entities (4).
The first file tie of node i is the i-th code file in path order, so the first ten code files (heldout.py probe-full's
task seeds) each get a new 'other' neighbour, which can change E5's second specialist (kge.py:494-502; the audit
r58c/closed-lists/FINDINGS.md F1); the other ties are drawn at random; deterministic (seed).
drop_other_co (--drop-other-co): the copy also loses every co_changed triple with an endpoint of area 'other', so E5's
'other' specialist has no co_changed relation and is skipped (kge.py:693, 707; F2); the count is recorded.
Every original row is kept byte for byte and in order; the new rows are appended. sizes.json gets the new counts, the
new relation in triples_by_relation, and an `injected` record. The source folder is hashed before and after and must
be byte-identical (it is only read); the copy is written to <dst>.part and renamed, and is refused when <dst> exists,
when it lies under the lane's export/, or when it is the source.
usage: python inject_kinds.py --src export/graphs0/<C> --dst DIR [--drop-other-co]   (prints one JSON line `INJECT {...}`)"""
import os, sys, json, random, hashlib, shutil
REL = 'zz_injected_relation'
KINDS = ('zz_injected_kind_a', 'zz_injected_kind_b')
AREA = 'other'
PATH = 'zz-injected-layer.txt'
NODES, FILE_TIES, SYM_TIES, OTHER_TIES, SEED = 10, 40, 6, 4, 20261115  # 50 edges: 4 in 5 to a file (ruling 97(a), (e))
EHEAD = 'id\tkind\tpath\tis_code_file\tarea'
THEAD = 'head\trelation\ttail'
LANE = os.environ.get('EMB_ROOT') or os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def tree_sha(d):
    out = {}
    for r, _, fs in os.walk(d):
        for f in fs:
            p = os.path.join(r, f); out[os.path.relpath(p, d).replace(os.sep, '/')] = hashlib.sha256(open(p, 'rb').read()).hexdigest()
    return out


def refuse(msg):
    print('inject_kinds: refused: ' + msg, flush=True); raise SystemExit(2)


def inject(src, dst, drop_other_co=False):
    src, dst = os.path.realpath(src), os.path.abspath(dst)
    exp = os.path.realpath(os.path.join(LANE, 'export'))
    if os.path.exists(dst) or os.path.exists(dst + '.part'): refuse('%s exists' % dst)
    if os.path.commonpath([exp, os.path.realpath(os.path.dirname(dst))]) == exp: refuse('the copy may not lie under export/: %s' % dst)
    if os.path.commonpath([src, os.path.realpath(os.path.dirname(dst))]) == src: refuse('the copy may not lie in the source folder')
    before = tree_sha(src)
    if sorted(before) != ['entities.tsv', 'sizes.json', 'triples.tsv']: refuse('the source is not a graph folder: %s' % sorted(before))
    eb = open(os.path.join(src, 'entities.tsv'), 'rb').read(); tb = open(os.path.join(src, 'triples.tsv'), 'rb').read()
    el = eb.decode('utf-8').split('\n'); tl = tb.decode('utf-8').split('\n')
    if el[0] != EHEAD or tl[0] != THEAD: refuse('unexpected header in entities.tsv or triples.tsv')
    ents = [l.split('\t') for l in el[1:] if l]
    rels = {l.split('\t')[1] for l in tl[1:] if l}
    kinds = {e[1] for e in ents}
    if REL in rels or set(KINDS) & kinds: refuse('the made-up names already occur in the source')
    code = sorted(e[0] for e in ents if e[3] == '1' and e[0] == 'file:' + e[2])  # path order = probe-full's seed order
    cpaths = {e[2] for e in ents if e[3] == '1'}
    syms = sorted(e[0] for e in ents if e[3] == '0' and e[2] in cpaths and not e[0].startswith('file:'))
    others = sorted(e[0] for e in ents if e[3] == '0' and not e[0].startswith('file:') and e[2] not in cpaths)
    if PATH in {e[2] for e in ents}: refuse('the made-up path already occurs in the source')
    if len(code) < FILE_TIES or len(syms) < SYM_TIES or len(others) < OTHER_TIES:
        refuse('too few code files (%d), symbols (%d) or other non-file entities (%d)' % (len(code), len(syms), len(others)))
    rng = random.Random(SEED)
    n = NODES; heads = ['%s:n%04d' % (KINDS[i % 2], i) for i in range(n)]
    new_e = ['\t'.join((h, KINDS[i % 2], PATH, '0', AREA)) for i, h in enumerate(heads)]
    pairs = set((heads[i], code[i]) for i in range(n))  # the first n code files, one tie each
    while len(pairs) < FILE_TIES: pairs.add((heads[rng.randrange(n)], code[rng.randrange(len(code))]))
    for ends, want in ((syms, FILE_TIES + SYM_TIES), (others, FILE_TIES + SYM_TIES + OTHER_TIES)):
        while len(pairs) < want: pairs.add((heads[rng.randrange(n)], ends[rng.randrange(len(ends))]))
    new_t = ['\t'.join((h, REL, t)) for h, t in sorted(pairs)]
    area = {e[0]: e[4] for e in ents}
    kept_t = [l for l in tl[1:] if l]; dropped = 0
    if drop_other_co:
        keep = [l for l in kept_t if not (l.split('\t')[1] == 'co_changed' and 'other' in (area.get(l.split('\t')[0], 'other'), area.get(l.split('\t')[2], 'other')))]
        dropped = len(kept_t) - len(keep); kept_t = keep
    part = dst + '.part'; os.makedirs(part)
    nl = lambda b: b if b.endswith(b'\n') else b + b'\n'
    open(os.path.join(part, 'entities.tsv'), 'wb').write(nl(eb) + ('\n'.join(new_e) + '\n').encode())
    tbytes = nl(tb) if not drop_other_co else ('\n'.join([THEAD] + kept_t) + '\n').encode()
    open(os.path.join(part, 'triples.tsv'), 'wb').write(tbytes + ('\n'.join(new_t) + '\n').encode())
    s = json.load(open(os.path.join(src, 'sizes.json')))
    by = dict(s.get('triples_by_relation') or {}); by[REL] = len(new_t)
    if drop_other_co:
        by['co_changed'] = by.get('co_changed', 0) - dropped
        s['co_changed_triples'] = by['co_changed']
    s.update(entities=len(ents) + n, triples=sum(by.values()), relations=len(by), triples_by_relation=by,
             injected=dict(ruling='96(a)', relation=REL, kinds=list(KINDS), area=AREA, nodes=n, triples=len(new_t),
                           path=PATH, ends=dict(files=FILE_TIES, symbols=SYM_TIES, other_non_file=OTHER_TIES), first_files=code[:n],
                           drop_other_co=bool(drop_other_co),
                           co_changed_dropped=dropped,
                           seed=SEED, source=os.path.basename(src), source_sha256=before,
                           note='TEST copy of a tuning graph with a made-up layer (agent A, round r58c); not an export'))
    json.dump(s, open(os.path.join(part, 'sizes.json'), 'w'), indent=1)
    os.replace(part, dst)
    after = tree_sha(src)
    if after != before: refuse('the source changed while it was read')  # never expected: it is only read
    ck = {e[1] for e in ents} | set(KINDS)
    res = dict(src=src, dst=dst, entities=len(ents) + n, triples=s['triples'], relations=len(by), relations_source=len(rels),
               kinds=len(ck), kinds_source=len(kinds), injected_nodes=n, injected_triples=len(new_t), source_unchanged=True,
               drop_other_co=bool(drop_other_co), co_changed_dropped=dropped,
               copy_sha256=tree_sha(dst))
    print('INJECT ' + json.dumps(res), flush=True)
    return res


def main(argv):
    o = {}; i = 0; drop = False
    while i < len(argv):
        if argv[i] == '--drop-other-co': drop = True; i += 1; continue
        if argv[i] not in ('--src', '--dst') or i + 1 >= len(argv): print('usage: python inject_kinds.py --src DIR --dst DIR [--drop-other-co]'); return 2
        o[argv[i][2:]] = argv[i + 1]; i += 2
    if set(o) != {'src', 'dst'}: print('usage: python inject_kinds.py --src DIR --dst DIR [--drop-other-co]'); return 2
    inject(o['src'], o['dst'], drop_other_co=drop); return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
