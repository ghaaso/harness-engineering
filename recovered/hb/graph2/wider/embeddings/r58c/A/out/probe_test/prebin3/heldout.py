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
code flags and areas are taken proportionally from the largest TUNE graph's entities.tsv. Writes
train/probe/probe.json with every setting's peak RSS (ru_maxrss) and CUDA peak; a peak above 3.5 GB (3584 MB)
is listed under over_3_5gb and the exit code is 4 (3 when a setting failed). --test allows --plan, --out (both
outside the real folders), --arms, --configs-per-arm, --scale (divides every count) and --test-epochs.

Refusals: no frozen record or a hash mismatch (exit 5); plan hash or s differ from the record; the device or the
image (env KGE_IMAGE_ID, set by heldout.sh) differ from the record; a task row carrying truth-like keys or a
tasks path under sealed/ (exit 6); a test record without --test or a real record with --test (exit 5).
usage:
  python heldout.py run                    (the real run; no option)
  python heldout.py run --test --freeze REC --plan PLAN --tasks TASKS --out DIR --anchor PROGRESS
                        [--parents p1,p2] [--test-epochs N] [--stop-after units|assemble|ranked]
  python heldout.py probe                  (ruling 79; no option)
  python heldout.py probe --test --plan PLAN --out DIR [--arms E1,E4] [--configs-per-arm K] [--scale N]
                        [--test-epochs N] [--flag-mb MB]
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
OPTS = {'run': ('freeze', 'plan', 'tasks', 'out', 'anchor', 'parents', 'test-epochs', 'stop-after'),
        'probe': ('plan', 'out', 'arms', 'configs-per-arm', 'scale', 'test-epochs', 'flag-mb'),
        'probe-one': ('g0', 'sha', 'arm', 'cid', 'epochs', 'plan')}
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
    if o['cmd'] == 'probe-one':  # internal: the probe's own child process
        miss = [k for k in OPTS['probe-one'] if k not in o]
        if miss: refuse(2, 'probe-one needs %s' % miss)
        return o
    given = sorted(k for k in o if k not in ('cmd', 'test'))
    if not o['test']:
        if given: refuse(2, 'the real run takes no option (ruling 80); given %s' % given)
        if o['cmd'] == 'run':
            o.update(freeze=os.path.join(HERE, 'heldout', 'item27.json'), plan=os.path.join(HERE, 'stageB', 'plan.json'),
                     tasks=os.environ.get('GT_TASKS') or os.path.join(ROOT, '..', '..', 'build', 'tasks', 'tasks.jsonl'),
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
if OPT is not None and OPT['cmd'] == 'probe-one': DET = OPT['arm'] == 'E4'
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


def anchor_sha(path):
    """Ruling 80: the sha256 of the LAST progress.jsonl line {"step": "coordinator", "unit": "item27_freeze", ...};
    None when there is no such line (or no file)."""
    if not os.path.exists(path): return None
    last = None
    for l in open(path, encoding='utf-8'):
        try: r = json.loads(l)
        except ValueError: continue
        if isinstance(r, dict) and r.get('step') == ANCHOR_STEP and r.get('unit') == ANCHOR_UNIT: last = r.get('sha256')
    return last


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
        a = anchor_sha(o['anchor'])
        if a != fh:
            refuse(5, 'the record sha256 %s is not the value the coordinator wrote (%s) in %s (ruling 80)' % (fh[:16], (a or 'no line')[:16], o['anchor']))
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
        self.log('start', 'begun', freeze_sha256=self.fh)

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
        if o.get('parents'):
            want = set(o['parents'].split(','))
            rows = [r for r in rows if r['parent'] in want]
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

    def units(self):
        failed = 0
        for seed in SEEDS:
            for C in self.ckpts:
                unit = 'unit/%s/%s/s%d/%s' % (self.arm, self.cid, seed, C[:12])
                out = self.part_dir(seed, C)
                if unit in self.done() and self.part_ok(out, C): continue
                mdir = out + '.model'; t0 = time.time()
                try:
                    nco = json.load(open(os.path.join(kge.G0, C, 'sizes.json')))['co_changed_triples']
                    meta = dict(arm=self.arm, config_id=self.cid, cfg=self.cfg, seed=seed, checkpoint=C, freeze_sha256=self.fh,
                                plan_hash=self.plan['plan_hash'], split='tune (plumbing test)' if self.o['test'] else 'heldout', **stageB.runner_info())
                    if nco == 0:
                        per = {t['task_id']: dict(parent=t['parent'], checkpoint=C, lag=self.lag[t['task_id']], note='checkpoint has no co_changed fact',
                                                  **{sc: dict(seeds=1, seeds_unscored=1, cands=len(self.cands[sc][t['task_id']]),
                                                              cands_unscored=len(self.cands[sc][t['task_id']])) for sc in SCOPES}) for t in self.by_ck[C]}
                        stageB.write_parts(out, {sc: {} for sc in SCOPES}, per, dict(meta, trained=False))
                        fsync_tree(out)
                        self.log(unit, 'done', tasks=len(per), trained=False); continue
                    _, info, _ = kge.train(self.arm, self.cfg, seed, C, holdout=False, outdir=mdir, max_epochs=self.epochs, es=False)
                    tables, per = stageB.score_tasks(os.path.join(mdir, 'reps.pt'), self.by_ck[C], self.cands, None, self.lag, C)
                    stageB.check_no_fold(per, self.rec['s'], unit)  # ruling 65, held-out split
                    meta.update(epochs=info['epochs'], wall_s=info['wall_s'], peak_rss_mb=info['peak_rss_mb'], losses=info['losses'],
                                reps_bytes=os.path.getsize(os.path.join(mdir, 'reps.pt')), tasks=len(per), **kge.cuda_peak())
                    stageB.write_parts(out, tables, per, meta)
                    stageB.verify_parts(out, tables, per)
                    fsync_tree(out)
                    os.remove(os.path.join(mdir, 'reps.pt')); shutil.rmtree(mdir, ignore_errors=True)
                    self.log(unit, 'done', tasks=len(per), wall_s=round(time.time() - t0, 1), reps_deleted=not os.path.exists(mdir))
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
                p = os.path.join(tdir, '%s_%s.tsv.gz' % (n, sc)); ec.write_score_table(p, T[n])
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
                ec.write_score_table(os.path.join(tdir, 'alone_%s_s%d.tsv.gz' % (sc, seed)), tabs[sc])
                fz = {t['task_id']: ec.fused_with(t['task_id'], self.cands[sc][t['task_id']], comp[sc]['PPR'].get(t['task_id'], {}),
                                                  comp[sc]['CO'].get(t['task_id'], {}), tabs[sc].get(t['task_id'], {}), self.w) for t in self.tasks}
                ec.write_score_table(os.path.join(tdir, 'fused_%s_s%d.tsv.gz' % (sc, seed)), fz)
        put_json(os.path.join(tdir, 'counts.json'), counts)
        fsync_tree(tdir)

    def variants(self):
        """One naming for both splits (answer-level-6, HANDOFF-FORMAT.md): <arm>_<alone|fused>_s<seed>, and the
        comparators by their own name. Each entry: (name, table pattern, fields)."""
        v = [('%s_%s_s%d' % (self.arm, k, s), 'tables/%s_%%s_s%d.tsv.gz' % (k, s), dict(arm=self.arm, kind=k, seed=s))
             for k in ('alone', 'fused') for s in SEEDS]
        return v + [(n, 'tables/%s_%%s.tsv.gz' % n, dict(arm=n, kind='comparator', seed=None)) for n in COMPARATORS]

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
                fsync_path(p + '.part'); os.replace(p + '.part', p)
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
            res[name] = answer_level.pack(os.path.join(self.out, 'ranked', '%s_unrestricted.jsonl.gz' % name), tf,
                                          os.path.join(adir, '%s.jsonl.gz' % name))
        fsync_tree(adir); fsync_path(tf)
        return res

    def handoff(self, packs):
        files = {'tasks_used.jsonl': sha256_file(os.path.join(self.out, 'tasks_used.jsonl'))}
        for sub in ('tables', 'ranked', 'answers'):
            for f in sorted(os.listdir(os.path.join(self.out, sub))):
                files['%s/%s' % (sub, f)] = stageB.sha256_file(os.path.join(self.out, sub, f))
        ev = os.path.join(ROOT, 'eval', 'evalcore.py')
        put_json(os.path.join(self.out, 'HANDOFF.json'), dict(
            format='train/HANDOFF-FORMAT.md', split='tune (plumbing test)' if self.o['test'] else 'heldout',
            written=now(), freeze=os.path.basename(self.o['freeze']), freeze_sha256=self.fh, chosen=self.rec['chosen'],
            tasks=len(self.tasks), parents=len({t['parent'] for t in self.tasks}), checkpoints=len(self.ckpts), seeds=list(SEEDS),
            tasks_file_sha256=self.tasks_sha256, test=bool(self.o['test']), scopes=list(SCOPES),
            variants=[dict(name=n, **fl) for n, _, fl in self.variants()],
            grading=dict(evalcore_sha256=sha256_file(ev) if os.path.exists(ev) else None,
                         truth_rule="item 4: the commit's other modified (not added) code files per evalcore.CODE; R against all truth",
                         aggregation='item 23: seed mean per task, then the mean per commit, then the mean over commits',
                         metrics=['P@10', 'R@10', 'R@20', 'MRR'], answer_level='item 24 (the grader computes it from answers/)'),
            note='ranked lists (both scopes) and packs (unrestricted, frozen typed primary options, 8,000-token primary) only; '
                 'no metric was computed here; the truth is with the grader', packs=packs, files=files))
        fsync_path(os.path.join(self.out, 'HANDOFF.json'))

    def run(self):
        self.verify(); self.once(); self.load_tasks()
        stop = self.o.get('stop-after') if self.o['test'] else None
        failed = self.units()
        if failed:
            print('heldout: %d unit(s) failed; rerun to redo them (finished units are kept)' % failed, flush=True); raise SystemExit(2)
        if stop == 'units': print('heldout: stopped after units (--stop-after, test only)', flush=True); return
        for step, fn, ok in (('assemble', self.assemble, self.tables_ok), ('ranked', self.ranked, self.ranked_ok)):
            if step in self.done() and ok(): continue
            fn(); self.log(step, 'done')
            if stop == step: print('heldout: stopped after %s (--stop-after, test only)' % step, flush=True); return
        packs = self.packs(); self.log('packs', 'done', packs={k: v.get('packed') for k, v in packs.items()})
        self.handoff(packs); self.log('handoff', 'done')
        print('heldout: finished; HANDOFF.json written; %d variants packed' % len(packs), flush=True)


# ---------------------------------------------------------------- ruling 79: memory probe on a synthetic graph
def largest(G0, shas):
    best = None
    for C in shas:
        s = json.load(open(os.path.join(G0, C, 'sizes.json')))
        if best is None or (s['triples'], C) > (best[1]['triples'], best[0]): best = (C, s)
    return best


def synth_graph(d, sizes, tune_entities, scale=1, seed=20261114):
    """A synthetic checkpoint graph with the counts of `sizes` (divided by `scale`): entities with kind, code flag and
    area taken proportionally from a tune graph's entities.tsv, and per relation that many distinct random
    (head, tail) pairs. Returns its own counts."""
    n = max(4, sizes['entities'] // scale)
    rows = []
    with open(tune_entities) as f:
        next(f)
        for l in f:
            i, kind, path, code, area = l.rstrip('\n').split('\t'); rows.append((kind, code, area))
    rows.sort()
    ents = ['s%05d' % i for i in range(n)]
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, 'entities.tsv'), 'w') as f:
        f.write('id\tkind\tpath\tis_code_file\tarea\n')
        for i, e in enumerate(ents):
            kind, code, area = rows[(i * len(rows)) // n]
            f.write('%s\t%s\tsynthetic/%s\t%s\t%s\n' % (e, kind, e, code, area))
    rng = random.Random(seed); tri = 0; by = {}
    with open(os.path.join(d, 'triples.tsv'), 'w') as f:
        f.write('head\trelation\ttail\n')
        for rel in sorted(sizes['triples_by_relation']):
            k = max(1, sizes['triples_by_relation'][rel] // scale); seen = set()
            while len(seen) < k:
                h, t = rng.randrange(n), rng.randrange(n)
                if h != t: seen.add((h, t))
            for h, t in sorted(seen): f.write('%s\t%s\t%s\n' % (ents[h], rel, ents[t]))
            tri += k; by[rel] = k
    own = dict(sha=os.path.basename(d), entities=n, relations=len(by), triples=tri, triples_by_relation=by,
               co_changed_triples=by.get('co_changed', 0), synthetic=True)
    json.dump(own, open(os.path.join(d, 'sizes.json'), 'w'), indent=1)
    return own


def cgroup_peak_mb():
    for p in ('/sys/fs/cgroup/memory.peak', '/sys/fs/cgroup/memory/memory.max_usage_in_bytes'):
        try: return round(int(open(p).read().strip()) / 1048576.0, 1)
        except Exception: pass
    return None


def probe(o):
    plan = json.load(open(o['plan']))
    G0 = os.path.join(ROOT, 'export', 'graphs0')
    C, s = largest(G0, plan['heldout']['checkpoints'])  # sizes.json only (ruling 79: no held-out graph file is read)
    T, ts = largest(G0, plan['checkpoints'])
    scale = int(o.get('scale', 1)) if o['test'] else 1
    epochs = int(o.get('test-epochs', 3)) if o['test'] else 3
    out = o['out']; os.makedirs(out, exist_ok=True)
    sha = 'synthetic-%s' % C[:12]
    g0 = os.path.join(out, 'g0'); own = synth_graph(os.path.join(g0, sha), s, os.path.join(G0, T, 'entities.tsv'), scale)
    arms = o['arms'].split(',') if (o['test'] and o.get('arms')) else sorted(plan['configs'])
    k = int(o.get('configs-per-arm', 3)) if o['test'] else 3
    rows = []
    for arm in arms:
        for c in plan['configs'][arm][:k]:
            cmd = [sys.executable, os.path.abspath(__file__), 'probe-one', '--g0', g0, '--sha', sha, '--arm', arm,
                   '--cid', c['config_id'], '--epochs', str(epochs), '--plan', o['plan']]
            t0 = time.time()
            p = subprocess.run(cmd, capture_output=True, text=True, env=dict(os.environ, EMB_ROOT=ROOT))
            r = dict(arm=arm, config_id=c['config_id'], rc=p.returncode, wall_s=round(time.time() - t0, 1))
            for l in reversed(p.stdout.strip().splitlines()):
                if l.startswith('PROBE '): r.update(json.loads(l[6:])); break
            if p.returncode != 0: r['error'] = (p.stdout + p.stderr).strip()[-600:]
            r['cgroup_peak_mb_after'] = cgroup_peak_mb()
            rows.append(r)
            print('probe: %s %s rc %d peak_rss_mb %s cuda_reserved_mb %s wall %.0f s' % (arm, c['config_id'], p.returncode, r.get('peak_rss_mb'),
                                                                                    r.get('peak_cuda_reserved_mb'), r['wall_s']), flush=True)
    flag = float(o['flag-mb']) if (o['test'] and o.get('flag-mb')) else PROBE_FLAG_MB  # --flag-mb: tests of the flag only
    over = [dict(arm=r['arm'], config_id=r['config_id'], peak_rss_mb=r.get('peak_rss_mb')) for r in rows
            if (r.get('peak_rss_mb') or 0) > flag]
    res = dict(written=now(), ruling=79, test=bool(o['test']), plan_hash=plan.get('plan_hash'), epochs=epochs, seed=1,
               device=os.environ.get('KGE_DEVICE', 'cpu'), image_id=os.environ.get('KGE_IMAGE_ID'),
               largest_heldout=dict(sha=C, **{k2: s[k2] for k2 in ('entities', 'relations', 'triples', 'co_changed_triples')}),
               tune_entities_from=T, synthetic=dict(own, scale=scale), flag_mb=flag, settings=rows, over_3_5gb=over,
               failed=[(r['arm'], r['config_id']) for r in rows if r['rc'] != 0],
               note='peak_rss_mb = ru_maxrss of the setting\'s own process (host RAM; the container cap is 4 GB); CUDA peaks are '
                    'from kge.cuda_peak(); the graph is synthetic (counts of the largest held-out graph, random pairs)')
    tmp = os.path.join(out, 'probe.json.part'); json.dump(res, open(tmp, 'w'), indent=1); os.replace(tmp, os.path.join(out, 'probe.json'))
    shutil.rmtree(g0, ignore_errors=True)
    if res['failed']: print('probe: %d setting(s) FAILED: %s' % (len(res['failed']), res['failed']), flush=True); raise SystemExit(3)
    if over: print('probe: %d setting(s) above 3.5 GB, report to the coordinator before the freeze: %s' % (len(over), over), flush=True); raise SystemExit(4)
    print('probe: %d setting(s), none above 3.5 GB; %s' % (len(rows), os.path.join(out, 'probe.json')), flush=True)


def probe_one(o):
    plan = json.load(open(o['plan']))
    cfg = [c for c in plan['configs'][o['arm']] if c['config_id'] == o['cid']][0]
    kge.G0 = o['g0']
    t0 = time.time()
    _, info, _ = kge.train(o['arm'], cfg['cfg'], 1, o['sha'], holdout=False, outdir=None, max_epochs=int(o['epochs']), es=False)
    print('PROBE ' + json.dumps(dict(peak_rss_mb=round(kge.rss_mb(), 1), info_peak_rss_mb=info.get('peak_rss_mb'), det=DET,
                                     epochs=info.get('epochs'), train_wall_s=round(time.time() - t0, 1), **kge.cuda_peak())), flush=True)


if __name__ == '__main__':
    if OPT['cmd'] == 'run': Run(OPT).run()
    elif OPT['cmd'] == 'probe': probe(OPT)
    else: probe_one(OPT)
