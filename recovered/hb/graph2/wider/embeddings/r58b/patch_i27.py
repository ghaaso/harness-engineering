import sys
p = sys.argv[1] + '/train/item27.py'
s = open(p, encoding='utf-8').read()
reps = [
("""usage: python item27.py [--root <lane root>] [--tables DIR] [--plan PATH] [--sel DIR] [--out PATH] [--test
       [--device cpu] [--image-id X]]
  --test: no ruling-58 guard, and the device / image id may be overridden; used only by the plumbing tests (the
  record then carries test: true, which heldout.py accepts only with its own --test).
\"\"\"""", """Ruling 80 (review finding selection-freeze-1/-4): the real run takes NO option at all (every path override and every
unknown flag is refused, exit 2, before anything is read); the record carries `tables` and `tables_digest`
(selectB.tables_digest over the planned _meta.json files) and each arm's choices.json sha256. The .sha256 file is
written before the record (selection-freeze-5: a .sha256 without a record means "not frozen").
usage: python item27.py                                   (the real freeze; no option)
       python item27.py --test --tables DIR --plan PATH --sel DIR --out PATH [--root DIR] [--device cpu] [--image-id X]
  --test (plumbing tests only): no ruling-58 guard; --tables, --plan, --sel and --out are REQUIRED and none may be or lie
  under the real train/stageB, train/selectB or train/heldout, and no _meta.json of --tables may carry the real
  plan.json's plan_hash (ruling 80: a test never reads a real table and never writes there). The record carries
  test: true, which heldout.py accepts only with its own --test.
\"\"\""""),
("""def main(argv):
    a = dict(root=ROOT, tables=os.path.join(HERE, 'stageB', 'tables'), plan=os.path.join(HERE, 'stageB', 'plan.json'),
             sel=os.path.join(HERE, 'selectB'), out=os.path.join(HERE, 'heldout', 'item27.json'), test=False)
    i = 0
    while i < len(argv):
        k = argv[i]
        if k == '--test': a['test'] = True; i += 1; continue
        a[k[2:]] = argv[i + 1]; i += 2
    if not a['test']: selectB.r58_guard()
""", """REAL_DIRS = ('stageB', 'selectB', 'heldout')  # ruling 80: a test never reads or writes these real folders
TEST_OPTS = ('tables', 'plan', 'sel', 'out', 'root', 'device', 'image-id')


def under_real(path):
    \"\"\"The real train/<stageB|selectB|heldout> folder that `path` is, or lies under (None otherwise).\"\"\"
    ap = os.path.normcase(os.path.realpath(os.path.abspath(path)))
    for d in REAL_DIRS:
        r = os.path.normcase(os.path.realpath(os.path.join(HERE, d)))
        if ap == r or ap.startswith(r + os.sep): return 'train/' + d
    return None


def parse(argv, opts=TEST_OPTS, need=('tables', 'plan', 'sel', 'out'), who='item 27'):
    \"\"\"Ruling 80: real mode = no option at all; --test requires `need` explicitly, outside the real folders.\"\"\"
    a = dict(test=False); i = 0
    while i < len(argv):
        k = argv[i]
        if k == '--test': a['test'] = True; i += 1; continue
        if not k.startswith('--') or k[2:] not in opts or i + 1 >= len(argv):
            print('%s: refusing: unknown or incomplete option %r' % (who, k), flush=True); raise SystemExit(2)
        a[k[2:]] = argv[i + 1]; i += 2
    given = sorted(k for k in a if k != 'test')
    if not a['test'] and given:
        print('%s: refusing: the real run takes no option (ruling 80); given %s' % (who, given), flush=True); raise SystemExit(2)
    if a['test']:
        miss = [k for k in need if k not in a]
        if miss: print('%s: refusing: --test needs explicit %s (ruling 80)' % (who, miss), flush=True); raise SystemExit(2)
        real = [(k, under_real(a[k])) for k in need if under_real(a[k])]
        if real: print('%s: refusing: --test path(s) in the real folders %s (ruling 80)' % (who, real), flush=True); raise SystemExit(2)
    return a


def real_hash_tables(tables):
    \"\"\"Ruling 80: names of _meta.json files in a test tables folder that carry the REAL plan.json's plan_hash.\"\"\"
    rp = os.path.join(HERE, 'stageB', 'plan.json')
    if not os.path.exists(rp) or not os.path.isdir(tables): return []
    h = json.load(open(rp)).get('plan_hash'); out = []
    for n in sorted(os.listdir(tables)):
        if n.endswith('_meta.json'):
            try:
                if json.load(open(os.path.join(tables, n))).get('plan_hash') == h: out.append(n)
            except ValueError:
                pass
    return out


def main(argv):
    a = parse(argv)
    if not a['test']:
        a.update(root=ROOT, tables=os.path.join(HERE, 'stageB', 'tables'), plan=os.path.join(HERE, 'stageB', 'plan.json'),
                 sel=os.path.join(HERE, 'selectB'), out=os.path.join(HERE, 'heldout', 'item27.json'))
        selectB.r58_guard()
    else:
        a.setdefault('root', ROOT)
        rh = real_hash_tables(a['tables'])
        if rh: print('item 27: refusing: --test tables carry the real plan_hash (%s ...; ruling 80)' % rh[:2], flush=True); raise SystemExit(2)
"""),
("""               plan_hash=plan.get('plan_hash'), arms=figs, code_sha256=code_hashes(a['root']), test=bool(a['test']))
    os.makedirs(hdir, exist_ok=True)
    data = json.dumps(rec, indent=1, sort_keys=True).encode()
    tmp = a['out'] + '.part'
    with open(tmp, 'wb') as f: f.write(data)
    replace_retry(tmp, a['out'])
    h = hashlib.sha256(data).hexdigest()
    with open(a['out'] + '.sha256.part', 'w') as f: f.write('%s  %s\\n' % (h, os.path.basename(a['out'])))
    replace_retry(a['out'] + '.sha256.part', a['out'] + '.sha256')
""", """               plan_hash=plan.get('plan_hash'), arms=figs, code_sha256=code_hashes(a['root']), test=bool(a['test']),
               tables=rel_or_abs(a['tables'], a['root']), tables_digest=selectB.tables_digest(a['tables'], plan),
               choices_sha256={arm: (sha256_file(os.path.join(a['sel'], arm, 'choices.json'))
                                     if os.path.exists(os.path.join(a['sel'], arm, 'choices.json')) else None) for arm in figs})
    os.makedirs(hdir, exist_ok=True)
    data = json.dumps(rec, indent=1, sort_keys=True).encode()
    h = hashlib.sha256(data).hexdigest()
    with open(a['out'] + '.sha256.part', 'w') as f: f.write('%s  %s\\n' % (h, os.path.basename(a['out'])))
    replace_retry(a['out'] + '.sha256.part', a['out'] + '.sha256')  # first (selection-freeze-5)
    tmp = a['out'] + '.part'
    with open(tmp, 'wb') as f: f.write(data)
    replace_retry(tmp, a['out'])
"""),
("""def verify(path):""", """def rel_or_abs(p, root):
    ap, r = os.path.abspath(p), os.path.abspath(root)
    return os.path.relpath(ap, r).replace(os.sep, '/') if ap.startswith(r + os.sep) else ap.replace(os.sep, '/')


def verify(path):"""),
]
for x, y in reps:
    assert s.count(x) == 1, x[:80]
    s = s.replace(x, y)
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('patched item27.py')
