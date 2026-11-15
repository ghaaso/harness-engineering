"""Assemble-side checks of rulings 66 and 67 (not hashed; stdlib only). Run it before `stageB.py assemble`, and on the
tables that run_units already assembled per arm; a refusal means those tables are not accepted.

usage: python assemble_checks.py [--train DIR] [--accepted FILE] [--report FILE] [--arms E1,E2,...] [--plan PATH]
  --train     the stage-B tree holding stageB/parts/ (and stageB/tables/); default: train/ beside this folder
  --accepted  the coordinator's equality record; default: orchestrator/equality-accepted.json beside this script
  --report    write the full result as JSON there (default: print only)
Checks, over every finished part (stageB/parts/<arm>/<cid>/s<seed>/<checkpoint>/ holding counts.json):
  R67  every E4 part's meta.json runner carries the token det=1 (detrun.py appends it; ruling 67).
  R66  when an arm's parts come from more than one runner, the accepted record must exist, parse as a JSON object and
       name every one of those runners exactly: in its top-level "runners" list, or in "arms": {<arm>: [...]}.
       (The coordinator's ruling: parts from more than one runner need an accepted equality record.)
       Review finding evidence-6: the record must also name every runner that is NOT the default one, even when it is
       the arm's only runner. The default is exactly DEFAULT_RUNNER below (the single guard, one process, the card
       image by ID), with ' det=1' appended for E4 (detrun.py). Anything else (containers=2, a kge-A1 name, another
       image, procs=2, ...) needs the record.
  TBL  an assembled table's _meta.json "runners" must be a subset of its parts' runners (a stale table is reported).
  A part whose meta.json does not parse, or carries no runner, is refused.
  PARTS (audit-result-4) zero finished parts is refused; with --plan PATH the finished part count must equal the plan's
       unit count (configs x 3 seeds x checkpoints, over --arms when given), and the script prints the tree, the
       count, the newest part's time and `tables_digest <hex>`, which selectB's guard compares with the current tables.
       Ruling 82 (round r58c): the digest is selectB.tables_digest's: sha256 over '<name>\t<sha256 or missing>' lines of
       plan.json's bytes (the plan.json beside the tables, which --plan must equal byte for byte: PLAN), then of every
       planned set's DECOMPRESSED _pool/_unrestricted.tsv.gz and its _counts.json (an unreadable table: DIGEST).
  E4DET (HD-12, ruling 67; with --plan): prints `e4_det1 <n> of <m> e4_parts, planned <p>` and refuses unless n = m = p.
Prints `sha256 <hex> orchestrator/assemble_checks.py` (its own bytes) first, so a log names the code that passed.
Exit 0 = every check passed; 1 = refused (each reason printed, one per line, prefixed REFUSE); 2 = usage error.
"""
import hashlib, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
print('sha256 %s orchestrator/assemble_checks.py' % hashlib.sha256(open(os.path.abspath(__file__), 'rb').read()).hexdigest(), flush=True)
DEFAULT_RUNNER = 'guard-stageB.sh kge-B1 procs=1 image=sha256:a890c54808c11c460d910945c4bf981390f7de43c8dfc5840269b76f5861cbe7'


def is_default(arm, runner):
    """evidence-6: the single guard's runner string, exactly (E4: with detrun's ' det=1' suffix)."""
    return runner == DEFAULT_RUNNER + (' det=1' if arm == 'E4' else '')


args = sys.argv[1:]


def opt(name, default=None):
    if name in args:
        i = args.index(name)
        if i + 1 >= len(args): sys.exit(2)
        v = args[i + 1]; del args[i:i + 2]; return v
    return default


TRAIN = opt('--train', os.path.join(os.path.dirname(HERE), 'train'))
ACCEPTED = opt('--accepted', os.path.join(HERE, 'equality-accepted.json'))
REPORT = opt('--report')
ARMS = opt('--arms')
PLAN = opt('--plan')  # audit-result-4: the part count must equal the plan's unit count; prints the tables digest
if args:
    print('unknown arguments', args); sys.exit(2)
ARMS = set(ARMS.split(',')) if ARMS else None
DET = re.compile(r'(^|\s)det=1(\s|$)')
PARTS = os.path.join(TRAIN, 'stageB', 'parts')
TABLES = os.path.join(TRAIN, 'stageB', 'tables')
UNIT_DIR = re.compile(r'^[0-9a-f]{40}$')


def parts():
    """(arm, cid, seed, checkpoint, dir) of every finished part (stageB.py's own test: counts.json present)."""
    if not os.path.isdir(PARTS): return
    for arm in sorted(os.listdir(PARTS)):
        if ARMS and arm not in ARMS: continue
        for cid in sorted(os.listdir(os.path.join(PARTS, arm))):
            for sd in sorted(os.listdir(os.path.join(PARTS, arm, cid))):
                base = os.path.join(PARTS, arm, cid, sd)
                for ck in sorted(os.listdir(base)):
                    d = os.path.join(base, ck)
                    if UNIT_DIR.match(ck) and os.path.isfile(os.path.join(d, 'counts.json')):
                        yield arm, cid, sd, ck, d


def load_accepted():
    if not os.path.exists(ACCEPTED): return None, 'no %s' % ACCEPTED
    try:
        o = json.load(open(ACCEPTED, encoding='utf-8'))
    except Exception as e:
        return None, '%s does not parse: %r' % (ACCEPTED, e)
    if not isinstance(o, dict): return None, '%s is not a JSON object' % ACCEPTED
    return o, None


def accepted_for(o, arm):
    s = set(o.get('runners') or [])
    s |= set((o.get('arms') or {}).get(arm) or [])
    return s


refuse = []; by_arm = {}; by_group = {}; n_parts = 0; n_e4 = 0; n_e4_det = 0
for arm, cid, sd, ck, d in parts():
    n_parts += 1
    unit = '%s/%s/%s/%s' % (arm, cid, sd, ck[:12])
    try:
        meta = json.load(open(os.path.join(d, 'meta.json'), encoding='utf-8'))
        runner = meta.get('runner') if isinstance(meta, dict) else None
    except Exception as e:
        refuse.append('R66 %s: meta.json does not parse (%r)' % (unit, e)); continue
    if not isinstance(runner, str) or not runner:
        refuse.append('R66 %s: no runner in meta.json' % unit); continue
    if arm == 'E4':
        n_e4 += 1
        if DET.search(runner): n_e4_det += 1
        else:
            refuse.append('R67 %s: E4 part without det=1 (runner %r)' % (unit, runner))
    by_arm.setdefault(arm, {}).setdefault(runner, 0)
    by_arm[arm][runner] += 1
    by_group.setdefault('%s_%s_%s' % (arm, cid, sd), set()).add(runner)

acc, acc_err = load_accepted()
for arm, rs in sorted(by_arm.items()):
    # evidence-6: every runner when there are several; otherwise the non-default one (a single runner may be one too)
    need = set(rs) if len(rs) > 1 else {r for r in rs if not is_default(arm, r)}
    if not need: continue
    why = 'parts from %d runners' % len(rs) if len(rs) > 1 else 'parts from a non-default runner'
    if acc is None:
        refuse.append('R66 %s: %s %s and %s' % (arm, why, sorted(need), acc_err)); continue
    missing = sorted(need - accepted_for(acc, arm))
    if missing:
        refuse.append('R66 %s: %s; the accepted record does not name %s' % (arm, why, missing))

tables = []
if os.path.isdir(TABLES):
    for n in sorted(os.listdir(TABLES)):
        if not n.endswith('_meta.json'): continue
        g = n[:-len('_meta.json')]
        if ARMS and g.split('_')[0] not in ARMS: continue
        try:
            tr = {r.get('runner') for r in json.load(open(os.path.join(TABLES, n), encoding='utf-8')).get('runners', [])}
        except Exception as e:
            refuse.append('TBL %s: _meta.json does not parse (%r)' % (g, e)); continue
        extra = sorted(tr - by_group.get(g, set()))
        tables.append(dict(table=g, runners=sorted(tr)))
        if extra:
            refuse.append('TBL %s: assembled from runners %s that no current part carries (stale table)' % (g, extra))

# audit-result-4: never pass on nothing; with --plan, the part count is the plan's unit count, and the log names the
# tree, the count, the newest part's time and the digest of the planned tables' _meta.json files (selectB.tables_digest)
if n_parts == 0: refuse.append('PARTS no finished part under %s' % PARTS)
digest = None


def fsha(p, gz=False):
    """= selectB.file_sha256: sha256 of the bytes (gz: decompressed), 'missing' when absent; an unreadable gzip raises."""
    import gzip
    if not os.path.exists(p): return 'missing'
    h = hashlib.sha256()
    with (gzip.open(p, 'rb') if gz else open(p, 'rb')) as f:
        for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
    return h.hexdigest()


def tables_digest(tb, plan):
    """Ruling 82, the same bytes as selectB.tables_digest (stdlib copy; parallel/tests/test_assemble_checks.sh checks
    equality): 'plan.json' then per planned set the decompressed pool and unrestricted tables and the counts file."""
    h = hashlib.sha256()
    h.update(('plan.json\t%s\n' % fsha(os.path.join(os.path.dirname(tb), 'plan.json'))).encode())
    for a in sorted(plan['configs']):
        for c in plan['configs'][a]:
            for s in (1, 2, 3):
                for suf, gz in (('_pool.tsv.gz', True), ('_unrestricted.tsv.gz', True), ('_counts.json', False)):
                    n = '%s_%s_s%d%s' % (a, c['config_id'], s, suf)
                    h.update(('%s\t%s\n' % (n, fsha(os.path.join(tb, n), gz))).encode())
    return h.hexdigest()


if PLAN:
    import datetime
    plan = json.load(open(PLAN, encoding='utf-8'))
    want = sum(len(plan['configs'][a]) for a in plan['configs'] if not ARMS or a in ARMS) * 3 * len(plan['checkpoints'])
    if n_parts != want: refuse.append('PARTS %d finished parts, the plan has %d units' % (n_parts, want))
    # ruling 82: the digest reads plan.json beside the tables; --plan must be that file, byte for byte
    tree_plan = os.path.join(os.path.dirname(TABLES), 'plan.json')
    if fsha(PLAN) != fsha(tree_plan): refuse.append('PLAN --plan %s is not %s byte for byte (ruling 82)' % (PLAN, tree_plan))
    # HD-12 / ruling 67: every planned E4 part exists and carries the word det=1
    want_e4 = (len(plan['configs'].get('E4', [])) * 3 * len(plan['checkpoints'])) if (not ARMS or 'E4' in ARMS) else 0
    if n_e4 != want_e4 or n_e4_det != n_e4:
        refuse.append('E4DET %d of %d E4 parts carry det=1, the plan has %d E4 units (HD-12)' % (n_e4_det, n_e4, want_e4))
    try:
        digest = tables_digest(TABLES, plan)
    except Exception as e:  # an unreadable table: no digest is printed
        refuse.append('DIGEST a planned table does not read (%r)' % (e,))
    newest = max([os.path.getmtime(os.path.join(d, 'counts.json')) for _, _, _, _, d in parts()] or [0])
    print('train %s parts %d planned %d newest_part %s' % (TRAIN, n_parts, want, datetime.datetime.utcfromtimestamp(newest).isoformat() + 'Z'))
    print('e4_det1 %d of %d e4_parts, planned %d' % (n_e4_det - 1, n_e4, want_e4))
    if digest: print('tables_digest %s' % digest)
res = dict(train=TRAIN, accepted=ACCEPTED if acc is not None else None, accepted_error=acc_err, parts=n_parts, e4_parts=n_e4,
           runners_by_arm={a: rs for a, rs in sorted(by_arm.items())}, tables=tables, tables_digest=digest, refused=refuse, ok=not refuse)
if REPORT:
    with open(REPORT, 'w') as f: json.dump(res, f, indent=1, sort_keys=True)
for r in refuse: print('REFUSE', r)
print('assemble_checks %s: %d parts (%d E4), arms %s, runners per arm %s' % (
    'PASS' if not refuse else 'REFUSED', n_parts, n_e4, sorted(by_arm), {a: len(rs) for a, rs in sorted(by_arm.items())}))
sys.exit(0 if not refuse else 1)
