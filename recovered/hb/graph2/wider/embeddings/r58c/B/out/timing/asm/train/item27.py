"""item27.py: the held-out arm of addendum 8 item 27, by ruling 57, frozen before any held-out unit runs.

Per arm E1..E5 (PLACEBO never competes): from the ASSEMBLED stage-B tables (stageB/tables, checked by
selectB.check_assembled: release gate plan-04 and ruling 67), every (configuration in the arm's stage-B top 3,
w in {0.25, 0.5, 1}) is scored on ALL 65 tune commits by fused pool P@10, seed-averaged (per task: mean of the
three seeds; then per commit; then over commits), and ruling 53's rule (selectB.choose: band = best mean - SE of
the best, ruling 64 on exact ties; the smallest model in the band, then the higher mean, then the lower config id,
then the smaller w) picks the arm's candidate. The arm's figure is that candidate's all-65 mean (ruling 57).
When selectB.py has already written selectB/<arm>/choices.json, its final_all65 must agree (config, w, mean),
else the script stops (exit 5).
Chosen arm: the highest figure; figures equal to four decimals are ties, broken by the smaller model (selectB.size
of the chosen configuration: embedding dimension, then layers), then the arm order E3, E1, E2, E4, E5 (ruling 57).
The record (ruling 57, with ruling 41's device and image id): arm, configuration id and settings, w, epochs (stage
B's, ruling 36), s, device 'cuda', image id, plan_hash, the figures of every arm, and the sha256 of the code the
held-out run depends on. It is written once (an existing record is never replaced) to train/heldout/item27.json
(.part then rename) with its own sha256 in item27.json.sha256, and only while no held-out unit exists
(heldout/progress*.jsonl empty or absent, heldout/parts empty or absent).
Ruling 80 (review finding selection-freeze-1/-4): the real run takes NO option at all (every path override and every
unknown flag is refused, exit 2, before anything is read); the record carries `tables` and `tables_digest`
(selectB.tables_digest over the planned _meta.json files) and each arm's choices.json sha256. The .sha256 file is
written before the record (selection-freeze-5: a .sha256 without a record means "not frozen").
Round r58c (rulings 82-84):
  * ruling 82: tables_digest is selectB.tables_digest (plan.json bytes, every planned set's decompressed pool and
    unrestricted tables and counts file). It is computed before any table is read; every arm's choices.json stamp
    must carry the same digest (exit 7 otherwise; the real run requires every arm's choices.json, exit 5), and it is
    recomputed after the last read (exit 7 on a difference). The real run also requires train/report/tune.json with
    test false, this plan_hash and the same digest in its stamp (exit 7), and records tune_sha256 and report_sha256.
  * ruling 83: CODE includes train/report.py; the guard covers selectB.py and report.py.
  * ruling 84: `pins` = {relpath: sha256} of every file the held-out training and ranking read besides graphs and
    facts: CODE, train/stageA_configs.json, eval/evalcore.py, the task list, the shared harness files
    (build/arms/common/*.js) and the primary's options record; `tuning_inputs` = {relpath: sha256} of
    eval/tune_tasks.jsonl, the comparator tables and the candidate files. relpath is relative to the lane root, files
    outside the lane in the '../../build/...' form (PIN_OUTSIDE). The real run refuses (exit 9) a pinned or tuning
    file that is missing, and (through selectB.r58_guard) an EMB_ROOT other than the lane folder (exit 2).
  * ruling 88b (end-order-changes-2 change 4): the real run refuses (exit 10), right after the guard and before
    anything else is read, unless the LAST coordinator line of unit tune_rank_check in the lane's progress.jsonl has a
    status starting with "accepted" (tune_rank_problem).
Exits: 2 option/override, 3 guard, 4 assembly, 5 selectB disagrees or a missing input, 6 a held-out unit or a record
exists, 7 tables digest, 9 a pinned or tuning input missing, 10 no accepted tune_rank_check line.
usage: python item27.py                                   (the real freeze; no option)
       python item27.py --test --tables DIR --plan PATH --sel DIR --out PATH [--root DIR] [--device cpu] [--image-id X]
  --test (plumbing tests only): no ruling-58 guard; --tables, --plan, --sel and --out are REQUIRED and none may be or lie
  under the real train/stageB, train/selectB or train/heldout, and no _meta.json of --tables may carry the real
  plan.json's plan_hash (ruling 80: a test never reads a real table and never writes there). The record carries
  test: true, which heldout.py accepts only with its own --test.
"""
import os, sys, json, hashlib, datetime, collections, glob
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.environ.get('EMB_ROOT') or os.path.dirname(HERE)
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(ROOT, 'eval'))
import numpy as np
import evalcore as ec
import selectB
from atomic import replace_retry

ARM_ORDER = ('E3', 'E1', 'E2', 'E4', 'E5')  # ruling 57 tie order
SEEDS = (1, 2, 3); WS = (0.25, 0.5, 1.0)
DEVICE = 'cuda'  # ruling 41
IMAGE_ID = 'sha256:a890c54808c11c460d910945c4bf981390f7de43c8dfc5840269b76f5861cbe7'  # graphtest-kge-gpu:1 (ruling 41)
# the code the held-out run depends on (paths relative to the lane root); a missing file is recorded as null
CODE = ('train/item27.py', 'train/heldout.py', 'train/heldout.sh', 'train/heldout_inputs.js', 'train/answer_level.py', 'train/answer_level.js',
        'train/leak_audit.py', 'train/stageB.py', 'train/kge.py', 'train/proj.py', 'train/atomic.py', 'train/detrun.py',
        'train/selectB.py', 'train/report.py', 'eval/evalcore.py', 'export/checkpoints.py', 'export/parents.jsonl',
        'export/parents_git.jsonl')
# ruling 84: further pins (paths relative to the lane root; '../../build/...' lies outside the lane)
PIN_LANE = ('train/stageA_configs.json', 'eval/evalcore.py')
PIN_OUTSIDE = ('../../build/tasks/tasks.jsonl', '../../build/results/frozen/relational/95e990307da3b42b.json')
PIN_COMMON = '../../build/arms/common'  # every *.js directly in it (the shared harness files)
PIN_GROUPS = {'tasks': '../../build/tasks/tasks.jsonl', 'primary': '../../build/results/frozen/relational/95e990307da3b42b.json',
              'common': PIN_COMMON + '/'}
TUNING_INPUTS = ('eval/tune_tasks.jsonl', 'eval/comparators/*.tsv.gz')


def pin_paths(root):
    """Ruling 84: the relpaths `pins` covers (CODE first, then PIN_LANE, PIN_OUTSIDE, the common *.js), no duplicates."""
    com = sorted(PIN_COMMON + '/' + os.path.basename(p) for p in glob.glob(os.path.join(root, PIN_COMMON, '*.js')))
    out = []
    for p in list(CODE) + list(PIN_LANE) + list(PIN_OUTSIDE) + com:
        if p not in out: out.append(p)
    return out, com


def tuning_paths(root):
    out = []
    for pat in TUNING_INPUTS:
        hits = sorted(glob.glob(os.path.join(root, pat)))
        out += [os.path.relpath(h, root).replace(os.sep, '/') for h in hits] if '*' in pat else [pat]
    return out


def hashes(root, rels):
    return {p: (sha256_file(os.path.normpath(os.path.join(root, p))) if os.path.exists(os.path.normpath(os.path.join(root, p))) else None)
            for p in rels}


def sha256_file(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
    return h.hexdigest()


def code_hashes(root):
    return {p: (sha256_file(os.path.join(root, p)) if os.path.exists(os.path.join(root, p)) else None) for p in CODE}


def arm_choice(arm, cfgs, tables, tasks, cl, comp):
    """Ruling 53 on all 65 commits for one arm -> (pick, stats, best) of selectB.choose."""
    emb = {(cid, s): ec.read_score_table(os.path.join(tables, '%s_%s_s%d_pool.tsv.gz' % (arm, cid, s))) for cid, _ in cfgs for s in SEEDS}
    by_commit = collections.defaultdict(list)
    for t in tasks: by_commit[t['commit']].append(t)
    order = {t['commit']: t['date_order'] for t in tasks}
    commits = sorted(by_commit, key=order.get)
    rows = []
    for cid, cfg in cfgs:
        for w in WS:
            p10 = {}
            for t in tasks:
                tid = t['task_id']; cands = cl.get(tid, [])
                v = [ec.task_metrics(ec.rank(tid, cands, ec.fused_with(tid, cands, comp['PPR'].get(tid, {}), comp['CO'].get(tid, {}),
                                                                       emb[(cid, s)].get(tid, {}), w)), t['truth'])['P@10'] for s in SEEDS]
                p10[tid] = float(np.mean(v))
            rows.append(((cid, w), cfg, w, [float(np.mean([p10[t['task_id']] for t in by_commit[c]])) for c in commits]))
    return selectB.choose(rows)


def choose_arm(figs):
    """figs: {arm: dict(mean, size)} -> (arm, the tie group). Highest mean to four decimals, then the smaller model,
    then ARM_ORDER."""
    top = max(round(f['mean'], 4) for f in figs.values())
    tied = [a for a in figs if round(figs[a]['mean'], 4) == top]
    return min(tied, key=lambda a: (tuple(figs[a]['size']), ARM_ORDER.index(a))), tied


def tune_rank_problem(progress):
    """Ruling 88b, enforced by code (end-order-changes-2 change 4, review finding rulings:F14): None when the LAST
    progress.jsonl line with step "coordinator" and unit "tune_rank_check" has a status starting with "accepted"
    (the coordinator's 1e-9 check of the grader's tuning rank against tune.json, END-ORDER step 5); else the reason."""
    last = None
    if os.path.exists(progress):
        for l in open(progress, encoding='utf-8'):
            try: d = json.loads(l)
            except ValueError: continue
            if isinstance(d, dict) and d.get('step') == 'coordinator' and d.get('unit') == 'tune_rank_check': last = d
    if last is None: return 'no tune_rank_check line of the coordinator in %s' % progress
    if not str(last.get('status', '')).startswith('accepted'):
        return 'the last tune_rank_check line has status %r, not accepted' % last.get('status')
    return None


def heldout_started(hdir):
    if os.path.isdir(os.path.join(hdir, 'parts')) and os.listdir(os.path.join(hdir, 'parts')): return 'heldout/parts is not empty'
    if os.path.isdir(hdir):
        for f in os.listdir(hdir):
            if f.startswith('progress') and f.endswith('.jsonl') and os.path.getsize(os.path.join(hdir, f)) > 0:
                return 'heldout/%s has lines' % f
    return None


REAL_DIRS = ('stageB', 'selectB', 'heldout')  # ruling 80: a test never reads or writes these real folders
TEST_OPTS = ('tables', 'plan', 'sel', 'out', 'root', 'device', 'image-id')


def under_real(path):
    """The real train/<stageB|selectB|heldout> folder that `path` is, or lies under (None otherwise)."""
    ap = os.path.normcase(os.path.realpath(os.path.abspath(path)))
    for d in REAL_DIRS:
        r = os.path.normcase(os.path.realpath(os.path.join(HERE, d)))
        if ap == r or ap.startswith(r + os.sep): return 'train/' + d
    return None


def parse(argv, opts=TEST_OPTS, need=('tables', 'plan', 'sel', 'out'), who='item 27'):
    """Ruling 80: real mode = no option at all; --test requires `need` explicitly, outside the real folders."""
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
    """Ruling 80: names of _meta.json files in a test tables folder that carry the REAL plan.json's plan_hash."""
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
        why = tune_rank_problem(os.path.join(ROOT, 'progress.jsonl'))
        if why: print('item 27: refusing (exit 10): %s; the freeze comes after the coordinator\'s 1e-9 check (ruling 88b, END-ORDER step 5)' % why, flush=True); raise SystemExit(10)
    else:
        a.setdefault('root', ROOT)
        rh = real_hash_tables(a['tables'])
        if rh: print('item 27: refusing: --test tables carry the real plan_hash (%s ...; ruling 80)' % rh[:2], flush=True); raise SystemExit(2)
    hdir = os.path.dirname(os.path.abspath(a['out']))
    why = heldout_started(hdir)
    if why: print('item 27: refusing: a held-out unit exists already (%s); the freeze must come first' % why, flush=True); raise SystemExit(6)
    if os.path.exists(a['out']): print('item 27: refusing: %s exists (the record is frozen once)' % a['out'], flush=True); raise SystemExit(6)
    plan = json.load(open(a['plan']))
    # ruling 84: the pins and tuning inputs; the real run refuses a missing one (exit 9)
    prels, com = pin_paths(a['root']); pins = hashes(a['root'], prels)
    tins = hashes(a['root'], tuning_paths(a['root']))
    if not a['test']:
        miss = [p for p, h in list(pins.items()) + list(tins.items()) if h is None]
        if not com: miss.append(PIN_COMMON + '/*.js (none found)')
        if not any(p.startswith('eval/comparators/') for p in tins): miss.append('eval/comparators/*.tsv.gz (none found)')
        if miss: print('item 27: refusing (exit 9): pinned or tuning input file(s) missing: %s (ruling 84)' % miss[:6], flush=True); raise SystemExit(9)
    # ruling 82: the digest of the tables about to be read, checked against every arm's choices.json and tune.json
    td0 = selectB.tables_digest(a['tables'], plan)
    stale = []; tune_rec = None
    for arm in ('E1', 'E2', 'E3', 'E4', 'E5'):
        cj = os.path.join(a['sel'], arm, 'choices.json')
        if not os.path.exists(cj):
            if not a['test']: print('item 27: refusing (exit 5): %s missing (selectB runs before the freeze)' % cj, flush=True); raise SystemExit(5)
            continue
        got = (json.load(open(cj)).get('stamp') or {}).get('tables_digest')
        if got != td0: stale.append('%s choices.json %s' % (arm, str(got)[:12]))
    if not a['test']:
        tp = os.path.join(HERE, 'report', 'tune.json')
        T = json.load(open(tp)) if os.path.exists(tp) else None
        if T is None: print('item 27: refusing (exit 5): %s missing (report runs before the freeze)' % tp, flush=True); raise SystemExit(5)
        if T.get('test') is not False or T.get('plan_hash') != plan.get('plan_hash'):
            stale.append('tune.json test=%r plan_hash=%s' % (T.get('test'), str(T.get('plan_hash'))[:12]))
        if (T.get('stamp') or {}).get('tables_digest') != td0: stale.append('tune.json %s' % str((T.get('stamp') or {}).get('tables_digest'))[:12])
        tune_rec = dict(tune_sha256=sha256_file(tp), report_sha256=(T.get('stamp') or {}).get('report_sha256'))
    if stale:
        print('item 27: refusing (exit 7): the tables digest %s differs from %s (ruling 82: the tables changed since selectB/report read them)'
              % (td0[:12], stale), flush=True)
        raise SystemExit(7)
    tasks = ec.load_tasks()
    assert len({t['commit'] for t in tasks}) == 65, 'item 27 needs all 65 tune commits'
    cl = selectB.cand_lists()['pool']
    comp = {n: ec.read_score_table(os.path.join(selectB.CD, '%s_pool.tsv.gz' % n)) for n in ('PPR', 'CO')}
    figs = {}
    for arm in ('E1', 'E2', 'E3', 'E4', 'E5'):
        cfgs = [(c['config_id'], c['cfg']) for c in plan['configs'][arm]]
        selectB.check_assembled(arm, [c for c, _ in cfgs], plan, a['tables'])  # plan-04, ruling 67
        pick, stats, best = arm_choice(arm, cfgs, a['tables'], tasks, cl, comp)
        ep = {c['config_id']: c['epochs'] for c in plan['configs'][arm]}[pick['key'][0]]
        figs[arm] = dict(config_id=pick['key'][0], cfg=pick['cfg'], w=pick['w'], mean=pick['mean'], se=pick['se'], n_commits=pick['n_commits'],
                         size=list(selectB.size(pick['cfg'])), epochs=ep,
                         best=dict(config_id=best['key'][0], w=best['w'], mean=best['mean'], se=best['se']),
                         candidates=[dict(config_id=s['key'][0], w=s['w'], mean=s['mean'], se=s['se']) for s in stats])
        cj = os.path.join(a['sel'], arm, 'choices.json')
        if os.path.exists(cj):
            f = json.load(open(cj))['final_all65']
            agree = (f['config_id'], float(f['w'])) == (pick['key'][0], float(pick['w'])) and abs(f['mean'] - pick['mean']) < 1e-12
            figs[arm]['selectB_final_all65_agrees'] = agree
            if not agree:
                print('item 27: %s: selectB final_all65 %s differs from this computation %s; stopping' % (
                    arm, (f['config_id'], f['w'], f['mean']), (pick['key'][0], pick['w'], pick['mean'])), flush=True)
                raise SystemExit(5)
        print('item27', arm, figs[arm]['config_id'], figs[arm]['w'], round(figs[arm]['mean'], 6), 'size', figs[arm]['size'], flush=True)
    td1 = selectB.tables_digest(a['tables'], plan)
    if td1 != td0:
        print('item 27: refusing (exit 7): the tables digest changed while the tables were read: %s -> %s (ruling 82)' % (td0[:12], td1[:12]), flush=True)
        raise SystemExit(7)
    arm, tied = choose_arm(figs)
    ch = figs[arm]
    rec = dict(rule='addendum 8 item 27, ruling 57 (ruling 53 on all 65 commits; ties to four decimals: smaller model, then E3, E1, '
                    'E2, E4, E5); ruling 41 device and image',
               frozen_at=datetime.datetime.utcnow().isoformat() + 'Z',
               chosen=dict(arm=arm, config_id=ch['config_id'], cfg=ch['cfg'], w=ch['w'], epochs=ch['epochs'], figure_all65=ch['mean'],
                           se=ch['se']),
               tie_group_4dp=sorted(tied, key=ARM_ORDER.index), s=int(plan['s']),
               device=a.get('device', DEVICE) if a['test'] else DEVICE, image_id=a.get('image-id', IMAGE_ID) if a['test'] else IMAGE_ID,
               plan_hash=plan.get('plan_hash'), arms=figs, code_sha256=code_hashes(a['root']), test=bool(a['test']),
               tables=rel_or_abs(a['tables'], a['root']), tables_digest=td0, pins=pins, tuning_inputs=tins, stamp_tune=tune_rec,
               plan_sha256=selectB.file_sha256(a['plan']),
               choices_sha256={arm: (sha256_file(os.path.join(a['sel'], arm, 'choices.json'))
                                     if os.path.exists(os.path.join(a['sel'], arm, 'choices.json')) else None) for arm in figs})
    os.makedirs(hdir, exist_ok=True)
    data = json.dumps(rec, indent=1, sort_keys=True).encode()
    h = hashlib.sha256(data).hexdigest()
    with open(a['out'] + '.sha256.part', 'w') as f: f.write('%s  %s\n' % (h, os.path.basename(a['out'])))
    replace_retry(a['out'] + '.sha256.part', a['out'] + '.sha256')  # first (selection-freeze-5)
    tmp = a['out'] + '.part'
    with open(tmp, 'wb') as f: f.write(data)
    replace_retry(tmp, a['out'])
    print('item27 chosen', arm, ch['config_id'], 'w', ch['w'], 'epochs', ch['epochs'], 'figure', round(ch['mean'], 6),
          'tie group', tied, 'record', a['out'], 'sha256', h, flush=True)
    return rec, h


def rel_or_abs(p, root):
    ap, r = os.path.abspath(p), os.path.abspath(root)
    return os.path.relpath(ap, r).replace(os.sep, '/') if ap.startswith(r + os.sep) else ap.replace(os.sep, '/')


def verify(path):
    """(record, sha256) of a frozen record whose bytes match its .sha256 file; raises otherwise (used by heldout.py)."""
    data = open(path, 'rb').read(); h = hashlib.sha256(data).hexdigest()
    want = open(path + '.sha256').read().split()[0]
    if h != want: raise SystemExit('item 27 record %s hashes to %s, its .sha256 file says %s' % (path, h, want))
    return json.loads(data), h


if __name__ == '__main__':
    main(sys.argv[1:])
