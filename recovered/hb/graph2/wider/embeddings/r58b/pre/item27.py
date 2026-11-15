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
usage: python item27.py [--root <lane root>] [--tables DIR] [--plan PATH] [--sel DIR] [--out PATH] [--test
       [--device cpu] [--image-id X]]
  --test: no ruling-58 guard, and the device / image id may be overridden; used only by the plumbing tests (the
  record then carries test: true, which heldout.py accepts only with its own --test).
"""
import os, sys, json, hashlib, datetime, collections
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
CODE = ('train/item27.py', 'train/heldout.py', 'train/heldout.sh', 'train/answer_level.py', 'train/answer_level.js',
        'train/leak_audit.py', 'train/stageB.py', 'train/kge.py', 'train/proj.py', 'train/atomic.py', 'train/detrun.py',
        'train/selectB.py', 'eval/evalcore.py', 'export/checkpoints.py', 'export/parents.jsonl', 'export/parents_git.jsonl')


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


def heldout_started(hdir):
    if os.path.isdir(os.path.join(hdir, 'parts')) and os.listdir(os.path.join(hdir, 'parts')): return 'heldout/parts is not empty'
    if os.path.isdir(hdir):
        for f in os.listdir(hdir):
            if f.startswith('progress') and f.endswith('.jsonl') and os.path.getsize(os.path.join(hdir, f)) > 0:
                return 'heldout/%s has lines' % f
    return None


def main(argv):
    a = dict(root=ROOT, tables=os.path.join(HERE, 'stageB', 'tables'), plan=os.path.join(HERE, 'stageB', 'plan.json'),
             sel=os.path.join(HERE, 'selectB'), out=os.path.join(HERE, 'heldout', 'item27.json'), test=False)
    i = 0
    while i < len(argv):
        k = argv[i]
        if k == '--test': a['test'] = True; i += 1; continue
        a[k[2:]] = argv[i + 1]; i += 2
    if not a['test']: selectB.r58_guard()
    hdir = os.path.dirname(os.path.abspath(a['out']))
    why = heldout_started(hdir)
    if why: print('item 27: refusing: a held-out unit exists already (%s); the freeze must come first' % why, flush=True); raise SystemExit(6)
    if os.path.exists(a['out']): print('item 27: refusing: %s exists (the record is frozen once)' % a['out'], flush=True); raise SystemExit(6)
    plan = json.load(open(a['plan']))
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
    arm, tied = choose_arm(figs)
    ch = figs[arm]
    rec = dict(rule='addendum 8 item 27, ruling 57 (ruling 53 on all 65 commits; ties to four decimals: smaller model, then E3, E1, '
                    'E2, E4, E5); ruling 41 device and image',
               frozen_at=datetime.datetime.utcnow().isoformat() + 'Z',
               chosen=dict(arm=arm, config_id=ch['config_id'], cfg=ch['cfg'], w=ch['w'], epochs=ch['epochs'], figure_all65=ch['mean'],
                           se=ch['se']),
               tie_group_4dp=sorted(tied, key=ARM_ORDER.index), s=int(plan['s']),
               device=a.get('device', DEVICE) if a['test'] else DEVICE, image_id=a.get('image-id', IMAGE_ID) if a['test'] else IMAGE_ID,
               plan_hash=plan.get('plan_hash'), arms=figs, code_sha256=code_hashes(a['root']), test=bool(a['test']))
    os.makedirs(hdir, exist_ok=True)
    data = json.dumps(rec, indent=1, sort_keys=True).encode()
    tmp = a['out'] + '.part'
    with open(tmp, 'wb') as f: f.write(data)
    replace_retry(tmp, a['out'])
    h = hashlib.sha256(data).hexdigest()
    with open(a['out'] + '.sha256.part', 'w') as f: f.write('%s  %s\n' % (h, os.path.basename(a['out'])))
    replace_retry(a['out'] + '.sha256.part', a['out'] + '.sha256')
    print('item27 chosen', arm, ch['config_id'], 'w', ch['w'], 'epochs', ch['epochs'], 'figure', round(ch['mean'], 6),
          'tie group', tied, 'record', a['out'], 'sha256', h, flush=True)
    return rec, h


def verify(path):
    """(record, sha256) of a frozen record whose bytes match its .sha256 file; raises otherwise (used by heldout.py)."""
    data = open(path, 'rb').read(); h = hashlib.sha256(data).hexdigest()
    want = open(path + '.sha256').read().split()[0]
    if h != want: raise SystemExit('item 27 record %s hashes to %s, its .sha256 file says %s' % (path, h, want))
    return json.loads(data), h


if __name__ == '__main__':
    main(sys.argv[1:])
