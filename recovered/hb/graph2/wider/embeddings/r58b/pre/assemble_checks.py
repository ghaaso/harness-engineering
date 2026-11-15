"""Assemble-side checks of rulings 66 and 67 (not hashed; stdlib only). Run it before `stageB.py assemble`, and on the
tables that run_units already assembled per arm; a refusal means those tables are not accepted.

usage: python assemble_checks.py [--train DIR] [--accepted FILE] [--report FILE] [--arms E1,E2,...]
  --train     the stage-B tree holding stageB/parts/ (and stageB/tables/); default: train/ beside this folder
  --accepted  the coordinator's equality record; default: orchestrator/equality-accepted.json beside this script
  --report    write the full result as JSON there (default: print only)
Checks, over every finished part (stageB/parts/<arm>/<cid>/s<seed>/<checkpoint>/ holding counts.json):
  R67  every E4 part's meta.json runner carries the token det=1 (detrun.py appends it; ruling 67).
  R66  when an arm's parts come from more than one runner, the accepted record must exist, parse as a JSON object and
       name every one of those runners exactly: in its top-level "runners" list, or in "arms": {<arm>: [...]}.
       (The coordinator's ruling: parts from more than one runner need an accepted equality record.)
  TBL  an assembled table's _meta.json "runners" must be a subset of its parts' runners (a stale table is reported).
  A part whose meta.json does not parse, or carries no runner, is refused.
Exit 0 = every check passed; 1 = refused (each reason printed, one per line, prefixed REFUSE); 2 = usage error.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
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


refuse = []; by_arm = {}; by_group = {}; n_parts = 0; n_e4 = 0
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
        if not DET.search(runner):
            refuse.append('R67 %s: E4 part without det=1 (runner %r)' % (unit, runner))
    by_arm.setdefault(arm, {}).setdefault(runner, 0)
    by_arm[arm][runner] += 1
    by_group.setdefault('%s_%s_%s' % (arm, cid, sd), set()).add(runner)

acc, acc_err = load_accepted()
for arm, rs in sorted(by_arm.items()):
    if len(rs) <= 1: continue
    if acc is None:
        refuse.append('R66 %s: parts from %d runners %s and %s' % (arm, len(rs), sorted(rs), acc_err)); continue
    missing = sorted(set(rs) - accepted_for(acc, arm))
    if missing:
        refuse.append('R66 %s: parts from %d runners; the accepted record does not name %s' % (arm, len(rs), missing))

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

res = dict(train=TRAIN, accepted=ACCEPTED if acc is not None else None, accepted_error=acc_err, parts=n_parts, e4_parts=n_e4,
           runners_by_arm={a: rs for a, rs in sorted(by_arm.items())}, tables=tables, refused=refuse, ok=not refuse)
if REPORT:
    with open(REPORT, 'w') as f: json.dump(res, f, indent=1, sort_keys=True)
for r in refuse: print('REFUSE', r)
print('assemble_checks %s: %d parts (%d E4), arms %s, runners per arm %s' % (
    'PASS' if not refuse else 'REFUSED', n_parts, n_e4, sorted(by_arm), {a: len(rs) for a, rs in sorted(by_arm.items())}))
sys.exit(0 if not refuse else 1)
