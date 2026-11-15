"""heldout.py: the one held-out run of addendum 8 item 27 (ruling 58). Produces ranked lists and packs ONLY;
held-out truth stays with the grader (this script never opens sealed/, a reference file, or tune_tasks.jsonl in
a real run).

What it runs: the arm, configuration, w and epochs frozen by item27.py (train/heldout/item27.json, checked against
its .sha256 file, against the value the coordinator wrote into the lane's progress.jsonl, and against the current
bytes of every code file it lists), 3 seeds, at every held-out checkpoint of plan.json (s = 1 at stage B's plan:
C = P), exactly stage B's training path (kge.train on the whole checkpoint graph, fixed epochs, no early stopping;
stageB.score_tasks / write_parts / verify_parts; ruling 65's check_no_fold on every unit and on every merged seed).
E4 runs with ruling 67's settings, made here before torch loads (CUBLAS_WORKSPACE_CONFIG=:4096:8,
torch.use_deterministic_algorithms(True); the same two as detrun.py) and every part's runner records ' det=1'
(assemble refuses an E4 part whose runner lacks the word det=1). The model file is deleted once its scores are
written and read back. Then: per seed, the arm alone and fused (weighted RRF of PPR, CO and the embedding, k = 60,
the frozen w), plus RRF, PPR, CO and DIR (evalcore, on the held-out tasks), for both scopes; ranked lists per
variant and scope (ranked/<variant>_<scope>.jsonl.gz) for the grader's rank metrics; packs of the UNRESTRICTED
lists through answer_level.py (answers/<variant>.jsonl.gz) for the grader's answer-level measure; HANDOFF.json
with sha256 of everything (train/HANDOFF-FORMAT.md describes every file).

Ruling 80 (one held-out run, enforced by code):
  * the real run takes NO option (`python heldout.py run`); every path override and every unknown flag is refused
    (exit 2) before anything is read;
  * the record's sha256 must equal the value the coordinator wrote into the lane's progress.jsonl (ANCHOR, the
    LAST line with "step": "coordinator" and "unit": "item27_freeze"; format in HANDOFF-FORMAT.md), else exit 5;
  * the record's tables_digest must equal selectB.tables_digest of the tables it names (exit 5); a CODE path the
    record lists as null is refused in the real run (exit 5);
  * a second run is refused once a hand-off exists (HANDOFF.json or a 'handoff' done line; exit 8), and an out
    folder that holds a run of another record is refused (exit 8). A resume of the same record with work left runs.
  * test mode (--test) requires --freeze, --plan, --tasks, --out and --anchor explicitly; none of --freeze, --plan
    or --out may be or lie under the real train/stageB, train/selectB or train/heldout (exit 2).
Item 27's task list is pinned (review heldout-tasks-file-not-pinned): the real run refuses (exit 6) unless the
task file's sha256 is TASKS_SHA256 and it holds 418 unique T1 held-out rows whose parents are exactly
plan.heldout.assignment's 70.
Resume integrity (review heldout-resume-integrity): a part counts as done only when its meta.json, counts.json and
both score tables read back and cover exactly its checkpoint's tasks; part files and the progress lines are
fsynced; the 'assemble' and 'ranked' steps are skipped only when every file they wrote reads back (ranked: every
file a readable gzip with one row per task).

Ruling 79 probe (`python heldout.py probe`): before the freeze, after stage B has left the card, trains each
arm's three selected settings (plan.json configs) once for 3 epochs, seed 1, one subprocess per setting, on a
SYNTHETIC graph with the entity, relation and triple counts (and per-relation triple counts) of the largest
held-out graph, read from export/graphs0/<C>/sizes.json only (no held-out graph file is read). Entity kinds,
code flags and areas are taken proportionally from the largest TUNE graph's entities.tsv. Ruling 97(c) (round r58c):
a relation of that sizes.json that no tuning checkpoint has (the tuning set: the triples_by_relation keys of every
plan.json checkpoint's sizes.json) is drawn as edges FROM non-code 'other' entities TO code entities, four in five to a
code file and the rest to code-area symbols (synth_graph new_rels), with its own count; never as random pairs. Such a
relation is renamed in the synthetic graph (zz_heldout_only_relation_<n>), so no held-out-only name reaches the probe's
files (rulings 96(b), 97(a): the lane gets counts, no name); probe.json records only the counts. Writes
train/probe/probe.json with every setting's peak RSS (ru_maxrss) and CUDA peak; a peak above 3.5 GB (3584 MB)
is listed under over_3_5gb and the exit code is 4 (3 when a setting failed). --test allows --plan, --out (both
outside the real folders), --arms, --configs-per-arm, --scale (divides every count) and --test-epochs.

Version 2 (r58c, agent A):
  * HANDOFF.json follows train/HANDOFF-FORMAT.md version 2 (orchestrator/grader-interface-v2.md): it carries the
    coordinator's item27_freeze line verbatim (anchor_line), every variant's seed-mean row <ARM>_<KIND>_mean
    (mean_rows) and the resampling unit; the test flag is kept.
  * MF-9 / HD-2: exactly one item27_freeze line, with file = train/heldout/item27.json, must exist (exit 5); a second
    such line (for instance a re-freeze) is refused, not silently preferred.
  * MF-6 / ruling 84: the record's pins {relpath: sha256} (relative to the lane root; files outside the lane as
    ../../build/...) are checked at every start: each must exist and hash to its value (exit 5); in real mode pins
    must name train/stageA_configs.json, eval/evalcore.py, the task list, the frozen primary's options record and at
    least one shared harness file, and tuning_inputs must name eval/tune_tasks.jsonl. tuning_inputs files that are
    readable here are checked here; the held-out container does not mount them (ruling 81's allow-list), so
    heldout.sh checks every one of them on the host before each launch (heldout_inputs.js pins) and this run lists
    the ones it could not read in its start line. In real mode EMB_ROOT must resolve to the lane folder and no other
    environment variable may override an input or output path (REAL_ENV_REFUSED, GT_TASKS included; exit 2).
  * MF-9 / HD-3, HD-8: every unit done line carries the sha256 of the part's two score tables and counts.json, and a
    resume redoes a unit whose files no longer hash to its last done line; the assemble and ranked done lines carry
    the sha256 of every file they wrote; every destination is removed before it is replaced (stageB._drop), and stray
    *.part files are removed before HANDOFF.json lists the folder.
  * --fake-scores SALT (test only): a unit writes deterministic hash scores (selectB.placebo with the salt) through
    stage B's own write_parts instead of training; every later step is the real one. Used for the test hand-offs.
  * MF-7 / ruling 86a probe: every setting records ru_maxrss, the container's cgroup memory.peak after it, CUDA peak
    reserved and the card's total; a container or process peak above 3.5 GB (over_3_5gb) or a card peak above 10 GB
    (over_card_10gb) exits 4. Then ONE further process (probe-full) runs the whole unit path at the setting with the
    highest peak: train, kge.score on synthetic tasks (both scopes), assemble (score tables, DIR, fused RRF), rank and
    pack (answer_level.js, on the largest tune parent's staged facts); its peaks are flagged the same way.
  * Ruling 101(c) / C13 (round 9): one more process (probe-seq) trains THREE units in a row of the setting with the
    highest RAM peak (and of E4's highest when that setting is not E4), each on its own synthetic graph of the largest
    held-out graph's size, as the held-out run trains its 210 units in one process; probe.json units_in_a_row holds the
    peaks after each unit, flagged as above. An rc 137 of the held-out run is a stop, not a defect: END-ORDER step 7.
Refusals: no frozen record or a hash mismatch (exit 5); plan hash or s differ from the record; the device or the
image (env KGE_IMAGE_ID, set by heldout.sh) differ from the record; a task row carrying truth-like keys or a
tasks path under sealed/ (exit 6); a test record without --test or a real record with --test (exit 5).
usage:
  python heldout.py run                    (the real run; no option)
  python heldout.py run --test --freeze REC --plan PLAN --tasks TASKS --out DIR --anchor PROGRESS
                        [--test-set pick8|late50 | --parents p1,p2] [--test-epochs N] [--stop-after units|assemble|ranked]
  python heldout.py probe                  (ruling 79; no option)
  python heldout.py probe --test --plan PLAN --out DIR [--arms E1,E4] [--configs-per-arm K] [--scale N]
                        [--test-epochs N] [--flag-mb MB] [--card-flag-mb MB] [--full-tasks N] [--seq-units N]
  run --test also takes [--fake-scores SALT]
"""
import os, sys, json, gzip, time, shutil, hashlib, collections, datetime, re, random, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.environ.get('EMB_ROOT') or os.path.dirname(HERE)

REAL_DIRS = ('stageB', 'selectB', 'heldout')
TASKS_SHA256 = '89a45cb38dbbbc618d8a745a263afc38db71f9382369e5bb60b5809dba32173b'  # build/tasks/tasks.jsonl (1,569 rows)
TASKS_ROWS, TASKS_PARENTS = 418, 70  # T1 held-out rows and their parents (= plan.heldout.assignment)
ANCHOR_STEP, ANCHOR_UNIT = 'coordinator', 'item27_freeze'
DET_RE = re.compile(r'(^|\s)det=1(\s|$)')
PROBE_FLAG_MB = 3584.0  # ruling 79: 3.5 GB
CARD_FLAG_MB = 10240.0  # ruling 86a: 10 GB of the card
ANCHOR_FILE = 'train/heldout/item27.json'
FORMAT = 'train/HANDOFF-FORMAT.md version 2'
REAL_ENV_REFUSED = ('GT_COMMON', 'GT_PRIMARY', 'GT_TASKS', 'GT_FACTS_CACHE', 'GT_SRCSTORE', 'GT_BUILD', 'GT_RESULTS', 'GT_STORE',
                    'GT_REPO', 'STAGEB_PROGRESS')  # ruling 84 / MF-6 (GT_TMP is scratch for the node child: allowed)
PIN_NEED = ('train/stageA_configs.json', 'eval/evalcore.py')  # plus the task list, the primary record, a harness file
OPTS = {'run': ('freeze', 'plan', 'tasks', 'out', 'anchor', 'parents', 'test-set', 'test-epochs', 'stop-after', 'fake-scores'),
        'probe': ('plan', 'out', 'arms', 'configs-per-arm', 'scale', 'test-epochs', 'flag-mb', 'card-flag-mb', 'full-tasks', 'seq-units'),
        'probe-one': ('g0', 'sha', 'arm', 'cid', 'epochs', 'plan'),
        'probe-full': ('g0', 'sha', 'arm', 'cid', 'epochs', 'plan', 'tparent', 'out', 'ntasks'),
        'probe-seq': ('g0', 'shas', 'arm', 'cid', 'epochs', 'plan', 'out', 'ntasks')}
NEED = {'run': ('freeze', 'plan', 'tasks', 'out', 'anchor'), 'probe': ('plan', 'out')}
PATHS = {'run': ('freeze', 'plan', 'out'), 'probe': ('plan', 'out')}


def under_real(path):
    """The real train/<stageB|selectB|heldout> folder that `path` is, or lies under (None otherwise)."""
    ap = os.path.normcase(os.path.realpath(os.path.abspath(path)))
    for d in REAL_DIRS:
        r = os.path.normcase(os.path.realpath(os.path.join(HERE, d)))
        if ap == r or ap.startswith(r + os.sep): return 'train/' + d
    return None


def refuse(code, msg):
    print('heldout: refusing (exit %d): %s' % (code, msg), flush=True)
    raise SystemExit(code)


def env_problems():
    """Ruling 84 (MF-6): [] when EMB_ROOT is unset or resolves to the lane folder (the parent of train/) and no other
    environment variable overrides an input or output path."""
    bad = []
    er = os.environ.get('EMB_ROOT')
    lane = os.path.normcase(os.path.realpath(os.path.dirname(HERE)))
    if er and os.path.normcase(os.path.realpath(er)) != lane: bad.append('EMB_ROOT %s is not the lane folder %s' % (er, lane))
    bad += ['%s is set (%s)' % (k, os.environ[k]) for k in REAL_ENV_REFUSED if (os.environ.get(k) or '').strip()]
    return bad


def parse(argv):
    """Ruling 80: the real run takes no option; --test needs its paths explicitly, outside the real folders."""
    if not argv or argv[0] not in OPTS: refuse(2, 'usage: heldout.py run | probe (see the docstring)')
    o = dict(cmd=argv[0], test=False); i = 1
    while i < len(argv):
        k = argv[i]
        if k == '--test': o['test'] = True; i += 1; continue
        if not k.startswith('--') or k[2:] not in OPTS[o['cmd']] or i + 1 >= len(argv):
            refuse(2, 'unknown or incomplete option %r' % k)
        o[k[2:]] = argv[i + 1]; i += 2
    if o['cmd'] in ('probe-one', 'probe-full', 'probe-seq'):  # internal: the probe's own child processes
        miss = [k for k in OPTS[o['cmd']] if k not in o]
        if miss: refuse(2, 'probe-one needs %s' % miss)
        return o
    given = sorted(k for k in o if k not in ('cmd', 'test'))
    if not o['test']:
        if given: refuse(2, 'the real run takes no option (ruling 80); given %s' % given)
        bad = env_problems()
        if bad: refuse(2, 'real mode (ruling 84): %s' % '; '.join(bad))
        if o['cmd'] == 'run':
            o.update(freeze=os.path.join(HERE, 'heldout', 'item27.json'), plan=os.path.join(HERE, 'stageB', 'plan.json'),
                     tasks=os.path.join(ROOT, '..', '..', 'build', 'tasks', 'tasks.jsonl'),
                     out=os.path.join(HERE, 'heldout'), anchor=os.path.join(ROOT, 'progress.jsonl'))
        else:
            o.update(plan=os.path.join(HERE, 'stageB', 'plan.json'), out=os.path.join(HERE, 'probe'))
        return o
    miss = [k for k in NEED[o['cmd']] if k not in o]
    if miss: refuse(2, '--test needs explicit %s (ruling 80)' % miss)
    real = [(k, under_real(o[k])) for k in PATHS[o['cmd']] if under_real(o[k])]
    if real: refuse(2, '--test path(s) in the real folders %s (ruling 80)' % real)
    if o.get('stop-after') not in (None, 'units', 'assemble', 'ranked'): refuse(2, '--stop-after units|assemble|ranked')
    return o


def record_arm(path):
    try: return json.load(open(path))['chosen']['arm']
    except Exception: return None


OPT = parse(sys.argv[1:]) if __name__ == '__main__' else None
DET = False
if OPT is not None and OPT['cmd'] == 'run': DET = record_arm(OPT['freeze']) == 'E4'
if OPT is not None and OPT['cmd'] in ('probe-one', 'probe-full', 'probe-seq'): DET = OPT['arm'] == 'E4'
if DET:  # ruling 67, before torch loads (as detrun.py)
    os.environ['CUBLAS_WORKSPACE_CONFIG'] = ':4096:8'
    import torch
    torch.use_deterministic_algorithms(True)
    assert torch.are_deterministic_algorithms_enabled()
os.environ['STAGEB_RUNNER'] = 'heldout.py' + (' det=1' if DET else '')

sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(ROOT, 'export')); sys.path.insert(0, os.path.join(ROOT, 'eval'))
if OPT is None or OPT['cmd'] != 'probe':  # the probe's parent stays light (no torch): only its children train
    import kge, stageB, item27, selectB
    import checkpoints as ck
    import evalcore as ec
    from atomic import put_json

SEEDS = (1, 2, 3); SCOPES = ('pool', 'unrestricted'); COMPARATORS = ('RRF', 'PPR', 'CO', 'DIR')
TRUTHY = ('truth', 'reference', 'references', 'files', 'defs', 'definitions', 'ref_files', 'ref_defs')


def now(): return datetime.datetime.utcnow().isoformat() + 'Z'


def sha256_file(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
    return h.hexdigest()


def fsync_path(p):
    try:
        fd = os.open(p, os.O_RDONLY)
        try: os.fsync(fd)
        finally: os.close(fd)
    except OSError:
        pass


def fsync_tree(d):
    for r, _, fs in os.walk(d):
        for f in fs: fsync_path(os.path.join(r, f))
        fsync_path(r)


def anchor_line(path):
    """Rulings 80, 88e and MF-9 (HD-2): (sha256, the line verbatim, problem). Exactly one progress.jsonl line
    {"step": "coordinator", "unit": "item27_freeze", ...} may exist, and its file must be train/heldout/item27.json;
    otherwise sha256 and line are None and problem says why."""
    if not os.path.exists(path): return None, None, 'no file %s' % path
    found = []
    for l in open(path, encoding='utf-8'):
        try: r = json.loads(l)
        except ValueError: continue
        if isinstance(r, dict) and r.get('step') == ANCHOR_STEP and r.get('unit') == ANCHOR_UNIT: found.append((r, l.rstrip('\r\n')))
    if len(found) != 1: return None, None, '%d item27_freeze lines (exactly one is required)' % len(found)
    r, l = found[0]
    if r.get('file') != ANCHOR_FILE: return None, None, 'the item27_freeze line names file %r, not %s' % (r.get('file'), ANCHOR_FILE)
    if not re.match(r'^[0-9a-f]{64}$', str(r.get('sha256'))): return None, None, 'the item27_freeze line has no 64-hex sha256'
    return r['sha256'], l, None


def anchor_sha(path):
    return anchor_line(path)[0]


def pin_path(rel):
    """A pin key (relative to the lane root, '/' separators; ../../build/... outside the lane) as a local path."""
    return os.path.normpath(os.path.join(ROOT, *rel.split('/')))


def check_pins(rec, real):
    """MF-6 / ruling 84: (problems, tuning inputs not readable here). pins: every file must exist and hash to its value;
    tuning_inputs: every readable file must hash to its value (the others are checked on the host by heldout.sh)."""
    bad, unread = [], []
    pins, tin = rec.get('pins'), rec.get('tuning_inputs')
    for name, d in (('pins', pins), ('tuning_inputs', tin)):
        if d is None: continue
        if not isinstance(d, dict) or not all(isinstance(v, str) and re.match(r'^[0-9a-f]{64}$', v) for v in d.values()):
            bad.append('%s is not {relpath: sha256}' % name)
    if bad: return bad, unread
    if real:
        keys = set(pins or {})
        miss = [k for k in PIN_NEED if k not in keys]
        if not pins: bad.append('the record has no pins')
        if miss: bad.append('pins lack %s' % miss)
        if not any(k.endswith('/tasks/tasks.jsonl') for k in keys): bad.append('pins lack the task list (build/tasks/tasks.jsonl)')
        if not any(k.endswith('/95e990307da3b42b.json') for k in keys): bad.append("pins lack the primary's options record")
        if not any('/arms/common/' in k and k.endswith('.js') for k in keys): bad.append('pins lack the shared harness files')
        if not tin or 'eval/tune_tasks.jsonl' not in tin: bad.append('tuning_inputs lack eval/tune_tasks.jsonl')
    for k, h in sorted((pins or {}).items()):
        p = pin_path(k)
        if not os.path.isfile(p): bad.append('pin %s: missing' % k)
        elif sha256_file(p) != h: bad.append('pin %s: hashes to %s, record %s' % (k, sha256_file(p)[:12], h[:12]))
    for k, h in sorted((tin or {}).items()):
        p = pin_path(k)
        if not os.path.isfile(p): unread.append(k); continue
        if sha256_file(p) != h: bad.append('tuning input %s: hashes to %s, record %s' % (k, sha256_file(p)[:12], h[:12]))
    return bad, unread


def _drop(p):
    """MF-9 / HD-8 (as stageB._drop): remove an existing destination before a replace onto it."""
    if os.path.lexists(p): os.remove(p)


def shas(d, names):
    """{name: sha256} of the files of a folder (None for a missing one)."""
    return {n: (sha256_file(os.path.join(d, n)) if os.path.isfile(os.path.join(d, n)) else None) for n in names}


def null_code(rec):
    return sorted(p for p, h in (rec.get('code_sha256') or {}).items() if h is None)


def pin_tasks(path, parents, sha_want=TASKS_SHA256, rows_want=TASKS_ROWS, parents_want=TASKS_PARENTS):
    """Item 27's held-out task list: the file's sha256, the count of T1 held-out rows, unique ids, and a parent set
    equal to `parents` (plan.heldout.assignment). Returns the rows; refuses with exit 6."""
    got = sha256_file(path)
    if got != sha_want: refuse(6, 'task file sha256 %s, pinned %s (heldout-tasks-file-not-pinned)' % (got[:16], sha_want[:16]))
    rows = [json.loads(l) for l in open(path, encoding='utf-8') if l.strip()]
    h = [r for r in rows if r.get('set') == 'T1' and r.get('split') == 'heldout']
    ids = [r.get('id') for r in h]; ps = {r.get('parent') for r in h}
    if len(h) != rows_want or len(set(ids)) != len(ids) or len(ps) != parents_want or ps != set(parents):
        refuse(6, 'held-out task rows %d (want %d), unique ids %d, parents %d (want %d, equal to plan.heldout: %s)'
               % (len(h), rows_want, len(set(ids)), len(ps), parents_want, ps == set(parents)))
    return h


class Run:
    def __init__(self, o):
        self.o = o; self.out = o['out']; os.makedirs(self.out, exist_ok=True)
        self.prog = os.path.join(self.out, 'progress.jsonl')

    def log(self, unit, status, **kw):
        with open(self.prog, 'a') as f:
            f.write(json.dumps(dict(step='heldout', unit=unit, status=status, t=now(), **kw)) + '\n')
            f.flush(); os.fsync(f.fileno())

    def lines(self):
        return list(stageB._lines(self.prog)) if os.path.exists(self.prog) else []

    def done(self):
        return {r.get('unit') for r in self.lines() if r.get('status') == 'done'}

    # ------------------------------------------------------------ checks
    def verify(self):
        o = self.o
        rec, fh = item27.verify(o['freeze'])
        if bool(rec.get('test')) != bool(o['test']):
            refuse(5, 'the record test=%s does not match --test=%s' % (rec.get('test'), o['test']))
        a, line, why = anchor_line(o['anchor'])
        if why: refuse(5, 'anchor %s: %s (rulings 80, 88e; MF-9)' % (o['anchor'], why))
        if a != fh:
            refuse(5, 'the record sha256 %s is not the value the coordinator wrote (%s) in %s (ruling 80)' % (fh[:16], a[:16], o['anchor']))
        self.anchor = line
        pb, self.unread_inputs = check_pins(rec, not o['test'])
        if pb: refuse(5, 'the record pins do not hold (ruling 84, MF-6): %s' % '; '.join(pb[:8]))
        if not o['test'] and null_code(rec):
            refuse(5, 'the record lists CODE path(s) as null: %s (heldout-record-hash-not-anchored)' % null_code(rec))
        bad = [p for p, h in rec['code_sha256'].items() if h is not None and (not os.path.exists(os.path.join(ROOT, p))
                                                                             or stageB.sha256_file(os.path.join(ROOT, p)) != h)]
        if bad: refuse(5, 'code differs from the frozen record: %s' % bad)
        plan = json.load(open(o['plan']))
        if plan.get('plan_hash') != rec['plan_hash'] or int(plan['s']) != int(rec['s']):
            refuse(5, 'plan %s s=%s, record %s s=%s' % (plan.get('plan_hash'), plan['s'], rec['plan_hash'], rec['s']))
        if not o['test'] or 'tables_digest' in rec:
            tb = rec.get('tables') or ''
            tb = tb if os.path.isabs(tb) else os.path.join(ROOT, tb)
            td = selectB.tables_digest(tb, plan) if rec.get('tables') and os.path.isdir(tb) else None
            if not rec.get('tables_digest') or td != rec['tables_digest']:
                refuse(5, 'tables digest %s of %s, record %s (ruling 80)' % ((td or 'none')[:16], rec.get('tables'), (rec.get('tables_digest') or 'none')[:16]))
        if kge.DEVICE.type != rec['device']: refuse(5, 'device %s, record %s (ruling 41)' % (kge.DEVICE.type, rec['device']))
        if os.environ.get('KGE_IMAGE_ID') != rec['image_id']:
            refuse(5, 'KGE_IMAGE_ID %s, record %s (ruling 41)' % (os.environ.get('KGE_IMAGE_ID'), rec['image_id']))
        self.rec, self.fh, self.plan = rec, fh, plan
        self.arm = rec['chosen']['arm']; self.cid = rec['chosen']['config_id']; self.cfg = rec['chosen']['cfg']
        self.w = float(rec['chosen']['w']); self.epochs = int(rec['chosen']['epochs'])
        if o['test'] and o.get('test-epochs'): self.epochs = int(o['test-epochs'])
        print('heldout: record %s sha256 %s (anchored): %s %s w %g epochs %d s %d device %s det %s' % (
            o['freeze'], fh[:12], self.arm, self.cid, self.w, self.epochs, rec['s'], rec['device'], DET), flush=True)

    def once(self):
        """Ruling 80: no second run once a hand-off exists; an out folder of another record is refused."""
        if os.path.exists(os.path.join(self.out, 'HANDOFF.json')) or 'handoff' in self.done():
            refuse(8, 'a hand-off exists in %s: one held-out run only (ruling 80)' % self.out)
        other = sorted({r.get('freeze_sha256') for r in self.lines() if r.get('unit') == 'start'} - {self.fh})
        if other: refuse(8, '%s holds a run of another record %s' % (self.out, [x[:12] for x in other if x]))
        self.log('start', 'begun', freeze_sha256=self.fh, pins=len(self.rec.get('pins') or {}),
                 tuning_inputs_checked_on_host=sorted(self.unread_inputs))

    def load_tasks(self):
        o = self.o
        if 'sealed' in os.path.abspath(o['tasks']).replace('\\', '/').split('/'): refuse(6, 'tasks path under sealed/')
        split = 'tune' if o['test'] else 'heldout'
        if not o['test']: pin_tasks(o['tasks'], self.plan['heldout']['assignment'])
        rows = []
        for l in open(o['tasks']):
            if not l.strip(): continue
            r = json.loads(l)
            if r.get('set') != 'T1' or r.get('split') != split: continue
            if any(k in r for k in TRUTHY): refuse(6, 'task %s carries a truth-like key' % r.get('id'))
            rows.append(r)
        if o.get('parents') and o.get('test-set'): refuse(2, 'give --test-set or --parents, not both')
        if o.get('parents'):
            want = set(o['parents'].split(','))
            rows = [r for r in rows if r['parent'] in want]
        if o.get('test-set'):  # the grader's fixed test sets (answer_level.test_set_ids): the tasks themselves, on their parents
            import answer_level
            want = set(answer_level.test_set_ids(o['test-set']))
            rows = [r for r in rows if r['id'] in want]
            if {r['id'] for r in rows} != want: refuse(6, 'test set %s: %d of %d task rows in %s' % (o['test-set'], len(rows), len(want), o['tasks']))
        if o['test']:
            assert all(r['split'] == 'tune' for r in rows), 'the plumbing test runs on tune tasks only'
        hp = self.plan['heldout'] if not o['test'] else dict(assignment=self.plan['assignment'], lag_by_parent=self.plan['lag_by_parent'],
                                                             checkpoints=self.plan['checkpoints'])
        F = ck.Facts(os.path.join(ROOT, 'export'))
        self.tasks = []
        for r in rows:
            P = r['parent']; C = hp['assignment'][P]
            assert C in hp['checkpoints'] and F.valid(C, P), ('leak rule', r['id'], P, C)
            self.tasks.append(dict(task_id=r['id'], parent=P, seed=r['seed']['path'], checkpoint=C, lag=hp['lag_by_parent'][P]))
        self.tasks.sort(key=lambda t: (F.key(t['checkpoint']), t['task_id']))
        self.ckpts = sorted({t['checkpoint'] for t in self.tasks}, key=F.key)
        self.by_ck = collections.defaultdict(list)
        for t in self.tasks: self.by_ck[t['checkpoint']].append(t)
        self.cands = {sc: {t['task_id']: ec.candidates(t, sc) for t in self.tasks} for sc in SCOPES}
        self.lag = {t['task_id']: t['lag'] for t in self.tasks}
        self.tasks_sha256 = sha256_file(o['tasks'])
        print('heldout: %d tasks (%s), %d checkpoints, split %s' % (len(self.tasks), len({t['parent'] for t in self.tasks}), len(self.ckpts), split), flush=True)

    # ------------------------------------------------------------ units (stage B's path)
    def part_dir(self, seed, C): return os.path.join(self.out, 'parts', self.arm, self.cid, 's%d' % seed, C)

    def part_ok(self, out, C=None):
        """Resume integrity: meta (this record), counts.json and both score tables read back, covering exactly the
        checkpoint's tasks. Any read error means 'redo the unit'."""
        try:
            m = json.load(open(os.path.join(out, 'meta.json')))
            if m.get('freeze_sha256') != self.fh: return False
            C = C or m.get('checkpoint')
            want = {t['task_id'] for t in self.by_ck.get(C, [])}
            cnt = json.load(open(os.path.join(out, 'counts.json')))
            if not want or set(cnt) != want: return False
            for sc in SCOPES:
                if not set(ec.read_score_table(os.path.join(out, sc + '.tsv.gz'))) <= want: return False
            return True
        except Exception:
            return False

    PART_FILES = ('pool.tsv.gz', 'unrestricted.tsv.gz', 'counts.json')

    def unit_done(self, unit, out, C):
        """Resume: the unit's LAST done line names the sha256 of its part files as they are now, and the part reads back."""
        last = None
        for r in self.lines():
            if r.get('unit') == unit and r.get('status') == 'done': last = r
        if last is None or not self.part_ok(out, C): return False
        return last.get('sha256') == shas(out, self.PART_FILES)

    def fake_units(self, seed, C):
        """--fake-scores (test only): deterministic hash scores (selectB.placebo, salted) for every candidate."""
        salt = self.o['fake-scores']; tables = {sc: {} for sc in SCOPES}; per = {}
        for t in self.by_ck[C]:
            tid = t['task_id']; rec = dict(parent=t['parent'], checkpoint=C, lag=self.lag[tid])
            for sc in SCOPES:
                cands = self.cands[sc][tid]
                tables[sc][tid] = selectB.placebo(seed, tid, cands, salt)
                rec[sc] = dict(seeds=1, cands=len(cands))
            per[tid] = rec
        return tables, per

    def units(self):
        failed = 0
        for seed in SEEDS:
            for C in self.ckpts:
                unit = 'unit/%s/%s/s%d/%s' % (self.arm, self.cid, seed, C[:12])
                out = self.part_dir(seed, C)
                if self.unit_done(unit, out, C): continue
                mdir = out + '.model'; t0 = time.time()
                try:
                    nco = json.load(open(os.path.join(kge.G0, C, 'sizes.json')))['co_changed_triples']
                    meta = dict(arm=self.arm, config_id=self.cid, cfg=self.cfg, seed=seed, checkpoint=C, freeze_sha256=self.fh,
                                plan_hash=self.plan['plan_hash'], split='tune (plumbing test)' if self.o['test'] else 'heldout', **stageB.runner_info())
                    if self.o['test'] and self.o.get('fake-scores'):
                        tables, per = self.fake_units(seed, C)
                        stageB.write_parts(out, tables, per, dict(meta, trained=False, fake_scores=self.o['fake-scores']))
                        stageB.verify_parts(out, tables, per); fsync_tree(out)
                        self.log(unit, 'done', tasks=len(per), fake_scores=True, sha256=shas(out, self.PART_FILES)); continue
                    if nco == 0:
                        per = {t['task_id']: dict(parent=t['parent'], checkpoint=C, lag=self.lag[t['task_id']], note='checkpoint has no co_changed fact',
                                                  **{sc: dict(seeds=1, seeds_unscored=1, cands=len(self.cands[sc][t['task_id']]),
                                                              cands_unscored=len(self.cands[sc][t['task_id']])) for sc in SCOPES}) for t in self.by_ck[C]}
                        stageB.write_parts(out, {sc: {} for sc in SCOPES}, per, dict(meta, trained=False))
                        fsync_tree(out)
                        self.log(unit, 'done', tasks=len(per), trained=False, sha256=shas(out, self.PART_FILES)); continue
                    _, info, _ = kge.train(self.arm, self.cfg, seed, C, holdout=False, outdir=mdir, max_epochs=self.epochs, es=False)
                    tables, per = stageB.score_tasks(os.path.join(mdir, 'reps.pt'), self.by_ck[C], self.cands, None, self.lag, C)
                    stageB.check_no_fold(per, self.rec['s'], unit)  # ruling 65, held-out split
                    meta.update(epochs=info['epochs'], wall_s=info['wall_s'], peak_rss_mb=info['peak_rss_mb'], losses=info['losses'],
                                reps_bytes=os.path.getsize(os.path.join(mdir, 'reps.pt')), tasks=len(per), **kge.cuda_peak())
                    stageB.write_parts(out, tables, per, meta)
                    stageB.verify_parts(out, tables, per)
                    fsync_tree(out)
                    os.remove(os.path.join(mdir, 'reps.pt')); shutil.rmtree(mdir, ignore_errors=True)
                    self.log(unit, 'done', tasks=len(per), wall_s=round(time.time() - t0, 1), reps_deleted=not os.path.exists(mdir),
                             sha256=shas(out, self.PART_FILES))
                except Exception as e:
                    if os.path.exists(out) and unit not in self.done(): shutil.rmtree(out, ignore_errors=True)
                    shutil.rmtree(mdir, ignore_errors=True)
                    self.log(unit, 'failed', error=repr(e)[:300]); failed += 1
                    print('FAILED', unit, repr(e), flush=True)
        return failed

    # ------------------------------------------------------------ tables, ranked lists, packs
    def check_det(self):
        """Review heldout-e4-runner-not-checked: an E4 part whose runner lacks the word det=1 is refused (exit 7)."""
        if self.arm != 'E4': return
        bad = []
        for seed in SEEDS:
            for C in self.ckpts:
                try: r = json.load(open(os.path.join(self.part_dir(seed, C), 'meta.json'))).get('runner') or ''
                except Exception: r = ''
                if not DET_RE.search(r): bad.append('s%d/%s runner %r' % (seed, C[:12], r))
        if bad: refuse(7, '%d E4 part(s) without det=1 (ruling 67): %s' % (len(bad), bad[:3]))

    def table_files(self):
        out = ['tables/counts.json'] + ['tables/%s_%s.tsv.gz' % (n, sc) for n in COMPARATORS for sc in SCOPES]
        return out + ['tables/%s_%s_s%d.tsv.gz' % (k, sc, s) for k in ('alone', 'fused') for sc in SCOPES for s in SEEDS]

    def tables_ok(self):
        try:
            cnt = json.load(open(os.path.join(self.out, 'tables', 'counts.json')))
            if sorted(cnt) != ['s%d' % s for s in SEEDS] or any(len(v) != len(self.tasks) for v in cnt.values()): return False
            for f in self.table_files()[1:]: ec.read_score_table(os.path.join(self.out, f))
            return True
        except Exception:
            return False

    def assemble(self):
        self.check_det()
        tdir = os.path.join(self.out, 'tables'); os.makedirs(tdir, exist_ok=True)
        want = {t['task_id']: t['checkpoint'] for t in self.tasks}
        comp = {}
        for sc in SCOPES:
            T = ec.comparator_tables(sc, self.tasks)
            comp[sc] = T
            for n in COMPARATORS:
                p = os.path.join(tdir, '%s_%s.tsv.gz' % (n, sc)); _drop(p); ec.write_score_table(p, T[n])
        counts = {}
        for seed in SEEDS:
            per = {}; tabs = {sc: {} for sc in SCOPES}
            for C in self.ckpts:
                d = self.part_dir(seed, C)
                assert self.part_ok(d, C), ('part missing, unreadable or from another freeze', d)
                for tid, r in json.load(open(os.path.join(d, 'counts.json'))).items():
                    assert tid in want and tid not in per and r['checkpoint'] == C == want[tid], ('task placement', tid, C)
                    per[tid] = r
                for sc in SCOPES:
                    for tid, row in ec.read_score_table(os.path.join(d, sc + '.tsv.gz')).items():
                        assert tid in want and want[tid] == C and tid not in tabs[sc], ('score row placement', tid, sc)
                        tabs[sc][tid] = row
            assert set(per) == set(want), ('tasks missing', len(set(want) - set(per)))
            stageB.check_no_fold(per, self.rec['s'], 'heldout merge s%d' % seed)  # ruling 65 on the merge
            counts['s%d' % seed] = per
            for sc in SCOPES:
                _drop(os.path.join(tdir, 'alone_%s_s%d.tsv.gz' % (sc, seed)))
                ec.write_score_table(os.path.join(tdir, 'alone_%s_s%d.tsv.gz' % (sc, seed)), tabs[sc])
                fz = {t['task_id']: ec.fused_with(t['task_id'], self.cands[sc][t['task_id']], comp[sc]['PPR'].get(t['task_id'], {}),
                                                  comp[sc]['CO'].get(t['task_id'], {}), tabs[sc].get(t['task_id'], {}), self.w) for t in self.tasks}
                _drop(os.path.join(tdir, 'fused_%s_s%d.tsv.gz' % (sc, seed)))
                ec.write_score_table(os.path.join(tdir, 'fused_%s_s%d.tsv.gz' % (sc, seed)), fz)
        _drop(os.path.join(tdir, 'counts.json'))
        put_json(os.path.join(tdir, 'counts.json'), counts)
        fsync_tree(tdir)

    def variants(self):
        """One naming for both splits (answer-level-6, HANDOFF-FORMAT.md): <arm>_<alone|fused>_s<seed>, and the
        comparators by their own name. Each entry: (name, table pattern, fields)."""
        v = [('%s_%s_s%d' % (self.arm, k, s), 'tables/%s_%%s_s%d.tsv.gz' % (k, s), dict(arm=self.arm, kind=k, seed=s, mean_row='%s_%s_mean' % (self.arm, k)))
             for k in ('alone', 'fused') for s in SEEDS]
        return v + [(n, 'tables/%s_%%s.tsv.gz' % n, dict(arm=n, kind='comparator', seed=None, mean_row=n)) for n in COMPARATORS]

    def ranked_ok(self):
        try:
            for name, _, _ in self.variants():
                for sc in SCOPES:
                    with gzip.open(os.path.join(self.out, 'ranked', '%s_%s.jsonl.gz' % (name, sc)), 'rt', encoding='utf-8') as f:
                        rows = [json.loads(l) for l in f if l.strip()]
                    if len(rows) != len(self.tasks) or {r['id'] for r in rows} != {t['task_id'] for t in self.tasks}: return False
            return True
        except Exception:
            return False

    def ranked(self):
        rdir = os.path.join(self.out, 'ranked'); os.makedirs(rdir, exist_ok=True)
        for name, pat, _ in self.variants():
            for sc in SCOPES:
                T = ec.read_score_table(os.path.join(self.out, pat % sc))
                p = os.path.join(rdir, '%s_%s.jsonl.gz' % (name, sc))
                with gzip.open(p + '.part', 'wt', encoding='utf-8') as f:
                    for t in self.tasks:
                        f.write(json.dumps(dict(id=t['task_id'], variant=name, scope=sc,
                                                ranked=ec.rank(t['task_id'], self.cands[sc][t['task_id']], T.get(t['task_id'], {})))) + '\n')
                fsync_path(p + '.part'); _drop(p); os.replace(p + '.part', p)
        fsync_path(rdir)

    def packs(self):
        import answer_level
        adir = os.path.join(self.out, 'answers'); os.makedirs(adir, exist_ok=True)
        tf = os.path.join(self.out, 'tasks_used.jsonl')
        ids = {t['task_id'] for t in self.tasks}
        with open(tf, 'w') as f:
            for l in open(self.o['tasks']):
                if l.strip() and json.loads(l)['id'] in ids: f.write(l if l.endswith('\n') else l + '\n')
        res = {}
        for name, _, _ in self.variants():
            _drop(os.path.join(adir, '%s.jsonl.gz' % name))
            res[name] = answer_level.pack(os.path.join(self.out, 'ranked', '%s_unrestricted.jsonl.gz' % name), tf,
                                          os.path.join(adir, '%s.jsonl.gz' % name))
        fsync_tree(adir); fsync_path(tf)
        return res

    def handoff(self, packs):
        files = {'tasks_used.jsonl': sha256_file(os.path.join(self.out, 'tasks_used.jsonl'))}
        for sub in ('tables', 'ranked', 'answers'):
            for f in sorted(os.listdir(os.path.join(self.out, sub))):
                if f.endswith('.part'): _drop(os.path.join(self.out, sub, f)); continue  # HD-8: no stray part file is listed
                files['%s/%s' % (sub, f)] = stageB.sha256_file(os.path.join(self.out, sub, f))
        ev = os.path.join(ROOT, 'eval', 'evalcore.py')
        absent = {}  # ruling 91: per variant and scope, the tasks with no row in its table (ranked by the tie-break alone)
        for name, pat, _ in self.variants():
            for sc in SCOPES:
                T = ec.read_score_table(os.path.join(self.out, pat % sc))
                absent.setdefault(name, {})[sc] = sum(1 for t in self.tasks if t['task_id'] not in T)
        put_json(os.path.join(self.out, 'HANDOFF.json'), dict(
            format=FORMAT, split='heldout',  # the held-out form in both modes; a test run (tuning parents) has test: true
            written=now(), freeze=os.path.basename(self.o['freeze']), freeze_sha256=self.fh, anchor_line=self.anchor, chosen=self.rec['chosen'],
            tasks=len(self.tasks), parents=len({t['parent'] for t in self.tasks}), checkpoints=len(self.ckpts), seeds=list(SEEDS),
            tasks_file_sha256=self.tasks_sha256, test=bool(self.o['test']), test_set=self.o.get('test-set'), scopes=list(SCOPES),
            variants=[dict(name=n, **fl) for n, _, fl in self.variants()],
            mean_rows=['%s_%s_mean' % (self.arm, k) for k in ('alone', 'fused')], absent_tasks=absent,
            grading=dict(evalcore_sha256=sha256_file(ev) if os.path.exists(ev) else None,
                         truth_rule="item 4: the commit's other modified (not added) code files per evalcore.CODE; R against all truth",
                         aggregation='item 23: seed mean per task, then the mean per commit, then the mean over commits',
                         metrics=['P@10', 'R@10', 'R@20', 'MRR'], answer_level='item 24 (the grader computes it from answers/)',
                         ranking='from ranked/ exactly as given, never re-sorted (score tables are reference material)',
                         resampling_unit='the task commit, from the grader\'s sealed records (never the parent)'),
            note=('TEST: the held-out form built on tuning parents and tasks; ' if self.o['test'] else '') +
                 'ranked lists (both scopes) and packs (unrestricted, frozen typed primary options, 8,000-token primary) only; '
                 'no metric was computed here; the truth is with the grader', packs=packs, files=files))
        fsync_path(os.path.join(self.out, 'HANDOFF.json'))

    def run(self):
        self.verify(); self.once(); self.load_tasks()
        stop = self.o.get('stop-after') if self.o['test'] else None
        failed = self.units()
        if failed:
            print('heldout: %d unit(s) failed; rerun to redo them (finished units are kept)' % failed, flush=True); raise SystemExit(2)
        if stop == 'units': print('heldout: stopped after units (--stop-after, test only)', flush=True); return
        for step, fn, ok, sub in (('assemble', self.assemble, self.tables_ok, 'tables'), ('ranked', self.ranked, self.ranked_ok, 'ranked')):
            last = [r for r in self.lines() if r.get('unit') == step and r.get('status') == 'done']
            d = os.path.join(self.out, sub)
            if last and ok() and last[-1].get('sha256') == shas(d, sorted(f for f in os.listdir(d) if not f.endswith('.part'))): continue
            fn(); self.log(step, 'done', sha256=shas(d, sorted(f for f in os.listdir(d) if not f.endswith('.part'))))
            if stop == step: print('heldout: stopped after %s (--stop-after, test only)' % step, flush=True); return
        packs = self.packs(); self.log('packs', 'done', packs={k: v.get('packed') for k, v in packs.items()})
        self.handoff(packs); self.log('handoff', 'done')
        print('heldout: finished; HANDOFF.json written; %d variants packed' % len(packs), flush=True)


# ---------------------------------------------------------------- ruling 79 / 86a: memory probe on a synthetic graph
def largest(G0, shas):
    best = None
    for C in shas:
        s = json.load(open(os.path.join(G0, C, 'sizes.json')))
        if best is None or (s['triples'], C) > (best[1]['triples'], best[0]): best = (C, s)
    return best


NEW_REL_FILE_SHARE = 0.8  # ruling 97(a): four in five of the new relation's triples end at a file


def tuning_relations(G0, checkpoints):
    """The relation names of every tuning checkpoint (sizes.json triples_by_relation keys; tuning graphs only)."""
    out = set()
    for C in checkpoints: out |= set(json.load(open(os.path.join(G0, C, 'sizes.json')))['triples_by_relation'])
    return out


def rename_new(sizes, tune_rels):
    """Ruling 97(c): the relations of sizes that no tuning checkpoint has, renamed zz_heldout_only_relation_<n>
    (in order of count, then of a hash of the name, so the name is not kept); returns (sizes copy, {new name: count})."""
    by = sizes['triples_by_relation']
    new = sorted((r for r in by if r not in tune_rels), key=lambda r: (-by[r], hashlib.sha256(r.encode()).hexdigest()))
    m = {r: 'zz_heldout_only_relation_%d' % (i + 1) for i, r in enumerate(new)}
    s = dict(sizes, triples_by_relation={m.get(r, r): k for r, k in by.items()})
    return s, {m[r]: by[r] for r in new}


def synth_graph(d, sizes, tune_entities, scale=1, seed=20261114, real_ids=False, new_rels=None):
    """A synthetic checkpoint graph with the counts of `sizes` (divided by `scale`): entities with kind, code flag and
    area taken proportionally from a tune graph's entities.tsv, and per relation that many distinct random
    (head, tail) pairs. real_ids (the full-path probe): the entities keep the tune graph's own ids and paths (each at
    most once; extra entities get synthetic ids), so kge.score finds 'file:<path>' entities and the packer finds the
    paths in that tune parent's facts. new_rels (ruling 97(c)): the relations in it are drawn from non-code 'other'
    entities to code entities (NEW_REL_FILE_SHARE to code files, the rest to code-area symbols), distinct pairs, not
    random pairs over all entities. Returns its own counts."""
    n = max(4, sizes['entities'] // scale)
    rows = []
    with open(tune_entities) as f:
        next(f)
        for l in f:
            i, kind, path, code, area = l.rstrip('\n').split('\t'); rows.append((kind, code, area, i, path))
    rows.sort()
    if real_ids and n <= len(rows): pick = [rows[(i * len(rows)) // n] for i in range(n)]
    elif real_ids: pick = rows + [rows[i % len(rows)][:3] + ('s%05d' % i, 'synthetic/s%05d' % i) for i in range(len(rows), n)]
    else: pick = [rows[(i * len(rows)) // n][:3] + ('s%05d' % i, 'synthetic/s%05d' % i) for i in range(n)]
    ents = [p[3] for p in pick]
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, 'entities.tsv'), 'w') as f:
        f.write('id\tkind\tpath\tis_code_file\tarea\n')
        for kind, code, area, e, path in pick: f.write('%s\t%s\t%s\t%s\t%s\n' % (e, kind, path, code, area))
    rng = random.Random(seed); tri = 0; by = {}
    with open(os.path.join(d, 'triples.tsv'), 'w') as f:
        f.write('head\trelation\ttail\n')
        heads = [i for i, p in enumerate(pick) if p[1] != '1' and p[2] == 'other']
        files = [i for i, p in enumerate(pick) if p[1] == '1']
        syms = [i for i, p in enumerate(pick) if p[1] != '1' and p[2] != 'other']
        for rel in sorted(sizes['triples_by_relation']):
            k = max(1, sizes['triples_by_relation'][rel] // scale); seen = set()
            if new_rels and rel in new_rels:  # ruling 97(c): from non-code 'other' entities to code entities
                if not heads or not files or not syms: raise ValueError('ruling 97(c): no other/file/symbol entities to draw from')
                kf = int(round(NEW_REL_FILE_SHARE * k)); kf = min(kf, len(heads) * len(files)); ks = min(k - kf, len(heads) * len(syms))
                for want, ends in ((kf, files), (kf + ks, syms)):
                    while len(seen) < want: seen.add((heads[rng.randrange(len(heads))], ends[rng.randrange(len(ends))]))
                k = len(seen)
            while len(seen) < k:
                h, t = rng.randrange(n), rng.randrange(n)
                if h != t: seen.add((h, t))
            for h, t in sorted(seen): f.write('%s\t%s\t%s\n' % (ents[h], rel, ents[t]))
            tri += k; by[rel] = k
    own = dict(sha=os.path.basename(d), entities=n, relations=len(by), triples=tri, triples_by_relation=by,
               co_changed_triples=by.get('co_changed', 0), synthetic=True, real_ids=bool(real_ids),
               new_relation_triples={r: by[r] for r in sorted(new_rels or {}) if r in by})
    json.dump(own, open(os.path.join(d, 'sizes.json'), 'w'), indent=1)
    return own


def cgroup_peak_mb():
    """The container's cgroup memory peak (cgroup v2 memory.peak, else v1 max_usage), MB; None when unreadable."""
    for p in ('/sys/fs/cgroup/memory.peak', '/sys/fs/cgroup/memory/memory.max_usage_in_bytes'):
        try: return round(int(open(p).read().strip()) / 1048576.0, 1)
        except Exception: pass
    return None


def card_total_mb():
    """The card's total memory (MB) as torch reports it; None off the card."""
    if os.environ.get('KGE_DEVICE', 'cpu') != 'cuda': return None
    try:
        import torch
        if not torch.cuda.is_available(): return None
        return round(torch.cuda.get_device_properties(0).total_memory / 1048576.0, 1)
    except Exception:
        return None


def flag_rows(rows, flag, card_flag):
    """Ruling 86a: a container (cgroup) or process peak above `flag`, or a card peak above `card_flag`."""
    over = [dict(arm=r['arm'], config_id=r['config_id'], what=r.get('what', 'setting'), peak_rss_mb=r.get('peak_rss_mb'),
                 cgroup_peak_mb_after=r.get('cgroup_peak_mb_after')) for r in rows
            if max(r.get('peak_rss_mb') or 0, r.get('cgroup_peak_mb_after') or 0) > flag]
    card = [dict(arm=r['arm'], config_id=r['config_id'], what=r.get('what', 'setting'), peak_cuda_reserved_mb=r.get('peak_cuda_reserved_mb'),
                 card_total_mb=r.get('card_total_mb')) for r in rows if (r.get('peak_cuda_reserved_mb') or 0) > card_flag]
    return over, card


def child(cmd):
    t0 = time.time()
    p = subprocess.run(cmd, capture_output=True, text=True, env=dict(os.environ, EMB_ROOT=ROOT))
    r = dict(rc=p.returncode, wall_s=round(time.time() - t0, 1))
    for l in reversed(p.stdout.strip().splitlines()):
        if l.startswith('PROBE '): r.update(json.loads(l[6:])); break
    if p.returncode != 0: r['error'] = (p.stdout + p.stderr).strip()[-600:]
    r['cgroup_peak_mb_after'] = cgroup_peak_mb()
    return r


def probe(o):
    plan = json.load(open(o['plan']))
    G0 = os.path.join(ROOT, 'export', 'graphs0')
    C, s = largest(G0, plan['heldout']['checkpoints'])  # sizes.json only (ruling 79: no held-out graph file is read)
    T, ts = largest(G0, plan['checkpoints'])
    tune_rels = tuning_relations(G0, plan['checkpoints'])
    s_held = s; s, new_rels = rename_new(s, tune_rels)  # ruling 97(c): no held-out-only name kept
    scale = int(o.get('scale', 1)) if o['test'] else 1
    epochs = int(o.get('test-epochs', 3)) if o['test'] else 3
    out = o['out']; os.makedirs(out, exist_ok=True)
    sha = 'synthetic-%s' % C[:12]
    g0 = os.path.join(out, 'g0'); own = synth_graph(os.path.join(g0, sha), s, os.path.join(G0, T, 'entities.tsv'), scale, new_rels=new_rels)
    arms = o['arms'].split(',') if (o['test'] and o.get('arms')) else sorted(plan['configs'])
    k = int(o.get('configs-per-arm', 3)) if o['test'] else 3
    rows = []
    for arm in arms:
        for c in plan['configs'][arm][:k]:
            r = dict(arm=arm, config_id=c['config_id'], what='setting')
            r.update(child([sys.executable, os.path.abspath(__file__), 'probe-one', '--g0', g0, '--sha', sha, '--arm', arm,
                            '--cid', c['config_id'], '--epochs', str(epochs), '--plan', o['plan']]))
            rows.append(r)
            print('probe: %s %s rc %d peak_rss_mb %s cgroup_peak_mb %s cuda_reserved_mb %s of %s wall %.0f s' % (
                arm, c['config_id'], r['rc'], r.get('peak_rss_mb'), r.get('cgroup_peak_mb_after'), r.get('peak_cuda_reserved_mb'),
                r.get('card_total_mb'), r['wall_s']), flush=True)
    # ruling 86a: one further process runs the whole unit path at the setting with the highest peak
    ok = [r for r in rows if r['rc'] == 0] or rows
    top = max(ok, key=lambda r: ((r.get('peak_cuda_reserved_mb') or 0), (r.get('peak_rss_mb') or 0)))
    sha_f = 'synthetic-full-%s' % C[:12]
    own_f = synth_graph(os.path.join(g0, sha_f), s, os.path.join(G0, T, 'entities.tsv'), scale, real_ids=True, new_rels=new_rels)
    nt = int(o.get('full-tasks', 30)) if o['test'] else 30
    full = dict(arm=top['arm'], config_id=top['config_id'], what='full path (train, score, assemble, rank, pack)', tune_parent_facts=T)
    full.update(child([sys.executable, os.path.abspath(__file__), 'probe-full', '--g0', g0, '--sha', sha_f, '--arm', top['arm'],
                       '--cid', top['config_id'], '--epochs', str(epochs), '--plan', o['plan'], '--tparent', T,
                       '--out', os.path.join(out, 'full'), '--ntasks', str(nt)]))
    print('probe: full path %s %s rc %d peak_rss_mb %s cgroup_peak_mb %s cuda_reserved_mb %s steps %s' % (
        top['arm'], top['config_id'], full['rc'], full.get('peak_rss_mb'), full.get('cgroup_peak_mb_after'),
        full.get('peak_cuda_reserved_mb'), full.get('steps')), flush=True)
    # ruling 101(c) / C13 (round 9): THREE units in a row in ONE process, as the held-out run trains its units, for the
    # setting with the highest RAM peak (and, when that is not an E4 setting, also for E4's highest: stage B showed
    # memory building up across E4 units), each unit on its own synthetic graph of the largest held-out graph's size
    ram = lambda r: max(r.get('peak_rss_mb') or 0, r.get('cgroup_peak_mb_after') or 0)
    tops = [max(ok, key=ram)]
    e4 = [r for r in ok if r['arm'] == 'E4']
    if e4 and tops[0]['arm'] != 'E4': tops.append(max(e4, key=ram))
    nseq = int(o.get('seq-units', 3)) if o['test'] else 3
    seq = []
    for t_ in tops:
        shas = []
        for k_ in range(1, nseq + 1):
            sk = 'synthetic-seq%d-%s-%s' % (k_, t_['arm'], C[:12]); shas.append(sk)
            synth_graph(os.path.join(g0, sk), s, os.path.join(G0, T, 'entities.tsv'), scale, seed=20261114 + k_, real_ids=True, new_rels=new_rels)
        r = dict(arm=t_['arm'], config_id=t_['config_id'], what='%d units in a row in one process (ruling 101(c))' % nseq, units_in_a_row=nseq)
        r.update(child([sys.executable, os.path.abspath(__file__), 'probe-seq', '--g0', g0, '--shas', ','.join(shas), '--arm', t_['arm'],
                        '--cid', t_['config_id'], '--epochs', str(epochs), '--plan', o['plan'], '--out', os.path.join(out, 'seq-' + t_['arm']), '--ntasks', str(nt)]))
        for sk in shas: shutil.rmtree(os.path.join(g0, sk), ignore_errors=True)
        seq.append(r)
        print('probe: %d units in a row %s %s rc %d peak_rss_mb %s cgroup_peak_mb %s cuda_reserved_mb %s per unit %s' % (
            nseq, t_['arm'], t_['config_id'], r['rc'], r.get('peak_rss_mb'), r.get('cgroup_peak_mb_after'), r.get('peak_cuda_reserved_mb'),
            [(u.get('unit'), u.get('peak_rss_mb'), u.get('rss_now_mb')) for u in r.get('units') or []]), flush=True)
    flag = float(o['flag-mb']) if (o['test'] and o.get('flag-mb')) else PROBE_FLAG_MB  # --flag-mb: tests of the flag only
    card_flag = float(o['card-flag-mb']) if (o['test'] and o.get('card-flag-mb')) else CARD_FLAG_MB
    over, card = flag_rows(rows + [full] + seq, flag, card_flag)
    res = dict(written=now(), ruling='79, 86a', test=bool(o['test']), plan_hash=plan.get('plan_hash'), epochs=epochs, seed=1,
               device=os.environ.get('KGE_DEVICE', 'cpu'), image_id=os.environ.get('KGE_IMAGE_ID'), card_total_mb=card_total_mb(),
               largest_heldout=dict(sha=C, **{k2: s_held[k2] for k2 in ('entities', 'relations', 'triples', 'co_changed_triples')}),
               tuning_relation_types=len(tune_rels), heldout_only_relation_types=len(new_rels),
               heldout_only_relation_triples=sorted(new_rels.values(), reverse=True),
               tune_entities_from=T, synthetic=dict(own, scale=scale), synthetic_full=dict(own_f, scale=scale), flag_mb=flag,
               card_flag_mb=card_flag, settings=rows, full_path=full, units_in_a_row=seq, over_3_5gb=over, over_card_10gb=card,
               failed=[(r['arm'], r['config_id'], r.get('what')) for r in rows + [full] + seq if r['rc'] != 0],
               note='peak_rss_mb = ru_maxrss of the setting\'s own process; cgroup_peak_mb_after = the container\'s memory.peak '
                    'after it (cumulative: the container\'s peak so far; the cap is 4 GB); CUDA peak reserved against the card total '
                    '(kge.cuda_peak, torch.cuda.get_device_properties); flags: container or process > 3.5 GB, card > 10 GB '
                    '(ruling 86a). The graph is synthetic (counts of the largest held-out graph, random pairs).')
    tmp = os.path.join(out, 'probe.json.part'); json.dump(res, open(tmp, 'w'), indent=1); _drop(os.path.join(out, 'probe.json'))
    os.replace(tmp, os.path.join(out, 'probe.json'))
    shutil.rmtree(g0, ignore_errors=True)
    if res['failed']: print('probe: %d step(s) FAILED: %s' % (len(res['failed']), res['failed']), flush=True); raise SystemExit(3)
    if over or card:
        print('probe: report to the coordinator before anything else runs (ruling 86a): above 3.5 GB %s; card above 10 GB %s' % (over, card), flush=True)
        raise SystemExit(4)
    print('probe: %d setting(s) and the full path, none above 3.5 GB or 10 GB of the card; %s' % (len(rows), os.path.join(out, 'probe.json')), flush=True)


def peaks():
    return dict(peak_rss_mb=round(kge.rss_mb(), 1), card_total_mb=card_total_mb(), **kge.cuda_peak())


def probe_one(o):
    plan = json.load(open(o['plan']))
    cfg = [c for c in plan['configs'][o['arm']] if c['config_id'] == o['cid']][0]
    kge.G0 = o['g0']
    t0 = time.time()
    _, info, _ = kge.train(o['arm'], cfg['cfg'], 1, o['sha'], holdout=False, outdir=None, max_epochs=int(o['epochs']), es=False)
    print('PROBE ' + json.dumps(dict(info_peak_rss_mb=info.get('peak_rss_mb'), det=DET, epochs=info.get('epochs'),
                                     train_wall_s=round(time.time() - t0, 1), **peaks())), flush=True)


def probe_seq(o):
    """Ruling 101(c) / C13 (round 9): ONE process trains the given synthetic graphs as units in a row, the way Run.units
    does: kge.train's three return values unpacked into the same names, with saved reps (the previous unit's value stays
    bound while the next one trains, and kge keeps its current graph), kge.score of synthetic tasks over every code file, then the
    model folder is removed. After each unit: ru_maxrss (the process high-water mark), the current RSS, the container's
    memory.peak and the CUDA peak, so a build-up across units shows."""
    plan = json.load(open(o['plan']))
    cfg = [c for c in plan['configs'][o['arm']] if c['config_id'] == o['cid']][0]
    kge.G0 = o['g0']; out = o['out']; os.makedirs(out, exist_ok=True); units = []; t0 = time.time()
    def rss_now():
        try: return round(int([l for l in open('/proc/self/status') if l.startswith('VmRSS:')][0].split()[1]) / 1024.0, 1)
        except Exception: return None
    for k, sha in enumerate(o['shas'].split(','), 1):
        mdir = os.path.join(out, 'model%d' % k); tu = time.time()
        _, info, _ = kge.train(o['arm'], cfg['cfg'], k, sha, holdout=False, outdir=mdir, max_epochs=int(o['epochs']), es=False)
        ents, _g = kge.read_graph(sha)
        code = sorted(p for e, (kind, p, area, isc) in ents.items() if isc and e == 'file:' + p)
        n = 0
        for i, sp in enumerate(code[:int(o['ntasks'])]):
            tb, cn = kge.score(os.path.join(mdir, 'reps.pt'), [('SEQ-%d-%04d' % (k, i), sp, [c for c in code if c != sp])], sha); n += len(tb)
        del ents, _g
        shutil.rmtree(mdir, ignore_errors=True)
        units.append(dict(unit=k, sha=sha, scored_tasks=n, epochs=info.get('epochs'), wall_s=round(time.time() - tu, 1),
                          peak_rss_mb=round(kge.rss_mb(), 1), rss_now_mb=rss_now(), cgroup_peak_mb=cgroup_peak_mb(), **kge.cuda_peak()))
        print('probe-seq: unit %d %s' % (k, json.dumps(units[-1])), flush=True)
    print('PROBE ' + json.dumps(dict(units=units, det=DET, wall_s=round(time.time() - t0, 1), **peaks())), flush=True)


def probe_full(o):
    """Ruling 86a: ONE process through the whole unit path on synthetic tasks: train (kge.train, saved reps), kge.score
    (both scopes), assemble (score tables, DIR, fused weighted RRF), rank (evalcore.rank) and pack (answer_level.js
    on the tune parent's facts; the count of ranked paths without a file node is recorded, not refused)."""
    import answer_level
    plan = json.load(open(o['plan']))
    cfg = [c for c in plan['configs'][o['arm']] if c['config_id'] == o['cid']][0]
    kge.G0 = o['g0']; out = o['out']; os.makedirs(out, exist_ok=True)
    steps = []; t0 = time.time(); mdir = os.path.join(out, 'model')
    kge.train(o['arm'], cfg['cfg'], 1, o['sha'], holdout=False, outdir=mdir, max_epochs=int(o['epochs']), es=False); steps.append('train')
    ents, _ = kge.read_graph(o['sha'])
    code = sorted(p for e, (kind, p, area, isc) in ents.items() if isc and e == 'file:' + p)
    seeds = code[:int(o['ntasks'])]
    tasks = [dict(task_id='PROBE-%04d' % i, parent=o['tparent'], seed=sp) for i, sp in enumerate(seeds)]
    cands = {'unrestricted': {t['task_id']: [c for c in code if c != t['seed']] for t in tasks}}
    cands['pool'] = {k: v[:100] for k, v in cands['unrestricted'].items()}
    tabs = {}; counts = {}
    for sc in SCOPES:
        tabs[sc] = {}; counts[sc] = collections.Counter()
        for t in tasks:
            tb, cn = kge.score(os.path.join(mdir, 'reps.pt'), [(t['task_id'], t['seed'], cands[sc][t['task_id']])], o['sha'])
            tabs[sc].update(tb); counts[sc].update(cn)
        counts[sc] = dict(counts[sc])
    json.dump(counts, open(os.path.join(out, 'counts.json'), 'w'), indent=1)  # round r58c: kge.score's counts (ruling 96(a))
    scored = {sc: sum(1 for t in tasks if tabs[sc].get(t['task_id'])) for sc in SCOPES}
    steps.append('score')
    tdir = os.path.join(out, 'tables'); os.makedirs(tdir, exist_ok=True)
    for sc in SCOPES:
        dirs = {t['task_id']: ec.dir_scores(t, cands[sc][t['task_id']]) for t in tasks}
        fz = {t['task_id']: ec.fused_with(t['task_id'], cands[sc][t['task_id']], dirs[t['task_id']], {}, tabs[sc].get(t['task_id'], {}), 0.5) for t in tasks}
        for n, T in (('alone', tabs[sc]), ('DIR', dirs), ('fused', fz)):
            p = os.path.join(tdir, '%s_%s.tsv.gz' % (n, sc)); _drop(p); ec.write_score_table(p, T)
    steps.append('assemble')
    rk = os.path.join(out, 'ranked_unrestricted.jsonl.gz')
    T = ec.read_score_table(os.path.join(tdir, 'fused_unrestricted.tsv.gz'))
    nrk = 0
    with gzip.open(rk, 'wt', encoding='utf-8') as f:
        for t in tasks:
            L = ec.rank(t['task_id'], cands['unrestricted'][t['task_id']], T.get(t['task_id'], {})); nrk += int(bool(L))
            f.write(json.dumps(dict(id=t['task_id'], variant='PROBE_fused_s1', ranked=L)) + '\n')
    steps.append('rank')
    tf = os.path.join(out, 'tasks.jsonl')
    with open(tf, 'w') as f:
        for t in tasks: f.write(json.dumps(dict(id=t['task_id'], parent=t['parent'], seed=dict(path=t['seed'], symbol=None), set='T1', split='tune')) + '\n')
    answer_level.check_code()
    pk = answer_level.node('pack', '--ranked', rk, '--tasks', tf, '--primary', answer_level.PRIMARY, '--out', os.path.join(out, 'answers.jsonl.gz'))
    steps.append('pack')
    shutil.rmtree(mdir, ignore_errors=True)
    print('PROBE ' + json.dumps(dict(steps=steps, tasks=len(tasks), packed=pk.get('packed'), ranked_paths_without_file_node=pk.get('ranked_paths_without_file_node'),
                                     scored_tasks=scored, ranked_tasks=nrk, counts=counts,
                                     det=DET, wall_s=round(time.time() - t0, 1), **peaks())), flush=True)


if __name__ == '__main__':
    if OPT['cmd'] == 'run': Run(OPT).run()
    elif OPT['cmd'] == 'probe': probe(OPT)
    elif OPT['cmd'] == 'probe-full': probe_full(OPT)
    elif OPT['cmd'] == 'probe-seq': probe_seq(OPT)
    else: probe_one(OPT)
