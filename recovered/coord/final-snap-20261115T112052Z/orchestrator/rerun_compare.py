"""Ruling 69: during the run, one finished unit per setting is re-run and compared under ruling 68 (not hashed).
`select` and `compare` are stdlib only (they run on the host too); `run` trains through rerun_unit.py, in a kge-T*
container started by orchestrator/rerun-compare.sh while kge-A1 and kge-B1 are stopped (alone on the card).

usage:
  python rerun_compare.py select  --tree DIR [--by arm,cid,runner] [--ledger FILE] [--arms E1,..]
  python rerun_compare.py run     --tree DIR --out DIR [--by ...] [--ledger FILE] [--arms ..] [--limit N]
  python rerun_compare.py compare --part DIR --rec FILE --tag TAG [--out DIR]
  --tree    a stage-B tree: progress*.jsonl beside stageB/parts/ (production: /w/train, read only)
  --by      the grouping (default arm,cid,runner: one unit per setting and runner, ruling 69's "for each setting";
            arm,runner is the coarser reading). A group already in the ledger with a result is not picked again.
  --out     results: OUT/units/<tag>/ (re-run parts), OUT/rerun.jsonl (rerun_unit.py records), OUT/compare.jsonl,
            OUT/markers/sidebyside-stop-<arm> on a mismatch (the host script copies it into orchestrator/, where
            guard-stageAB.sh reads it: E4 -> A retired; a B arm -> A kept off while B has units of that arm left).
Pick rule inside a group: the finished, trained unit with the lowest sha256 of its unit id (fixed in advance; not by
size, time or result). The re-run is deterministic exactly when the original's runner carries det=1.
Ruling 68 criterion: E1, E2, E3, E4 -> the loss list, both score tables and the counts byte-identical; E5 -> both
score tables and the counts. Representation tensors are compared when both sides kept them; stage-B parts never keep
reps.pt (deleted after the unit), so against a stage-B part the representations are reported as not kept.
Exit: 0 all compared units equal; 1 a mismatch (markers written); 2 usage; 3 an error in a re-run.
"""
import os, sys, json, glob, gzip, hashlib, re, subprocess, time

HERE = os.path.dirname(os.path.abspath(__file__))
UNIT = re.compile(r'^(E\d)/(c\d+)/s(\d)/([0-9a-f]{12})$')
SCOPES = ('pool', 'unrestricted')
DET = re.compile(r'(^|\s)det=1(\s|$)')


def sha(b): return hashlib.sha256(b).hexdigest()


def lines(p):
    with open(p, encoding='utf-8', errors='replace') as fh:
        for l in fh:
            try: r = json.loads(l)
            except ValueError: continue
            if isinstance(r, dict): yield r


def part_dir(tree, unit):
    m = UNIT.match(unit or ''); d = os.path.join(tree, 'stageB', 'parts', m.group(1), m.group(2), 's' + m.group(3))
    if not os.path.isdir(d): return None
    hits = [n for n in os.listdir(d) if n.startswith(m.group(4)) and '.part' not in n and not n.endswith('.model')]
    return os.path.join(d, hits[0]) if len(hits) == 1 else None


def part_hashes(d):
    """Same as rerun_unit.part_hashes: gunzipped table bytes, counts.json read back and dumped with sorted keys."""
    return dict(tables_sha256={sc: sha(gzip.open(os.path.join(d, sc + '.tsv.gz')).read()) for sc in SCOPES},
                counts_sha256=sha(json.dumps(json.load(open(os.path.join(d, 'counts.json'))), sort_keys=True).encode()))


def finished(tree, arms=None):
    """{unit: (part dir, meta)} of done, trained units with a readable part."""
    done = set()
    for p in sorted(glob.glob(os.path.join(tree, 'progress*.jsonl'))):
        for r in lines(p):
            if r.get('step') == 'stageB' and r.get('status') == 'done' and UNIT.match(r.get('unit') or ''): done.add(r['unit'])
    out = {}
    for u in sorted(done):
        if arms and u.split('/')[0] not in arms: continue
        d = part_dir(tree, u)
        if not d or not os.path.isfile(os.path.join(d, 'counts.json')): continue
        try: meta = json.load(open(os.path.join(d, 'meta.json')))
        except Exception: continue
        if meta.get('trained') is False: continue          # a no-co_changed unit: nothing was trained
        out[u] = (d, meta)
    return out


def group_key(unit, meta, by):
    arm, cid = unit.split('/')[:2]
    vals = dict(arm=arm, cid=cid, runner=meta.get('runner', ''), seed=unit.split('/')[2])
    return '|'.join(vals[k] for k in by)


def ledger_groups(path):
    if not path or not os.path.exists(path): return set()
    return {r['group'] for r in lines(path) if r.get('result') in ('equal', 'MISMATCH')}


def select(tree, by, ledger=None, arms=None):
    seen = ledger_groups(ledger); groups = {}
    for u, (d, meta) in finished(tree, arms).items():
        g = group_key(u, meta, by)
        if g in seen: continue
        if g not in groups or sha(u.encode()) < sha(groups[g][0].encode()): groups[g] = (u, d, meta)
    return [dict(group=g, unit=u, part=d, runner=meta.get('runner'), det=bool(DET.search(meta.get('runner') or '')))
            for g, (u, d, meta) in sorted(groups.items())]


def compare(part, rec):
    """Ruling 68 against a part folder (a stage-B part or another re-run's part) for one rerun_unit.py record."""
    arm = rec['arm']; ph = part_hashes(part); meta = json.load(open(os.path.join(part, 'meta.json')))
    res = dict(arm=arm, unit=rec.get('unit'), tag=rec.get('tag'), part=part)
    res['tables'] = {sc: ph['tables_sha256'][sc] == rec['tables_sha256'][sc] for sc in SCOPES}
    res['counts'] = ph['counts_sha256'] == rec['counts_sha256']
    res['losses'] = meta.get('losses') == rec.get('losses')
    res['reps'] = 'not kept by the part (stage B deletes reps.pt)'
    need = list(res['tables'].values()) + [res['counts']]
    if arm != 'E5': need.append(res['losses'])
    res['criterion'] = 'tables+counts (E5, ruling 68)' if arm == 'E5' else 'losses+tables+counts (ruling 68)'
    res['result'] = 'equal' if all(need) else 'MISMATCH'
    return res


def opts(argv):
    o = {}; rest = []
    i = 0
    while i < len(argv):
        if argv[i].startswith('--'): o[argv[i][2:]] = argv[i + 1]; i += 2
        else: rest.append(argv[i]); i += 1
    return o, rest


def mark(out, res, group):
    md = os.path.join(out, 'markers'); os.makedirs(md, exist_ok=True)
    with open(os.path.join(md, 'sidebyside-stop-' + res['arm']), 'a') as f:
        f.write(json.dumps(dict(group=group, **res, t=time.time())) + '\n')


def main():
    if len(sys.argv) < 2: sys.exit(2)
    cmd = sys.argv[1]; o, _ = opts(sys.argv[2:])
    by = (o.get('by') or 'arm,cid,runner').split(',')
    arms = set(o['arms'].split(',')) if o.get('arms') else None
    if cmd == 'select':
        print(json.dumps(select(o['tree'], by, o.get('ledger'), arms), indent=1)); return 0
    if cmd == 'compare':
        rec = [r for r in lines(o['rec']) if r.get('tag') == o['tag'] and r.get('status') == 'done'][-1]
        res = compare(o['part'], rec); print(json.dumps(res))
        if o.get('out'):
            os.makedirs(o['out'], exist_ok=True)
            with open(os.path.join(o['out'], 'compare.jsonl'), 'a') as f: f.write(json.dumps(res) + '\n')
            if res['result'] != 'equal': mark(o['out'], res, 'compare:' + o['tag'])
        return 0 if res['result'] == 'equal' else 1
    if cmd != 'run': sys.exit(2)
    out = o['out']; os.makedirs(out, exist_ok=True)
    picks = select(o['tree'], by, o.get('ledger'), arms)[:int(o.get('limit', 10 ** 6))]
    json.dump(picks, open(os.path.join(out, 'picks.json'), 'w'), indent=1)
    print('picks', len(picks), flush=True)
    rc = 0
    for i, p in enumerate(picks):
        tag = 'rr%03d_%s' % (i, p['unit'].replace('/', '_'))
        cmdl = [sys.executable, os.path.join(HERE, 'rerun_unit.py'), '--out', os.path.join(out, 'units'), '--rec',
                os.path.join(out, 'rerun.jsonl')] + (['--det'] if p['det'] else []) + ['%s=%s' % (p['unit'], tag)]
        t0 = time.time(); r = subprocess.run(cmdl)
        recs = [x for x in lines(os.path.join(out, 'rerun.jsonl')) if x.get('tag') == tag and x.get('status') == 'done']
        if r.returncode != 0 or not recs:
            res = dict(group=p['group'], unit=p['unit'], result='error', returncode=r.returncode); rc = max(rc, 3)
        else:
            res = dict(group=p['group'], runner=p['runner'], det=p['det'], wall=round(time.time() - t0, 1), **compare(p['part'], recs[-1]))
            if res['result'] != 'equal': mark(out, res, p['group']); rc = max(rc, 1)
        with open(os.path.join(out, 'compare.jsonl'), 'a') as f: f.write(json.dumps(res) + '\n')
        if o.get('ledger'):
            with open(o['ledger'], 'a') as f: f.write(json.dumps(dict(group=p['group'], unit=p['unit'], result=res['result'], out=out, t=time.time())) + '\n')
        print(json.dumps({k: res.get(k) for k in ('group', 'unit', 'result', 'tables', 'counts', 'losses')}), flush=True)
    return rc


if __name__ == '__main__':
    sys.exit(main())
