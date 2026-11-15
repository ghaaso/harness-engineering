"""Stage B (addendum 8 items 16, 17, 20; rulings 33, 36-38): rolling-origin refits on the tune checkpoints.

usage:
  python stageB.py plan                     plan only (needs stage A complete): epochs, timing, stride, RUNLOG
  python stageB.py run --plan E1 E3         plan if missing, then run these arms' units
  python stageB.py run --wait E5 E2 E4      wait for plan.json (written by the other container), then run
  python stageB.py assemble                 merge finished parts into per (arm, config, seed, scope) tables
  python stageB.py test                     plumbing test: one stage-A model scores <= 3 tasks (no training,
                                            no metric); writes stageB/test/

Plan (stageB/plan.json, written once, .part then rename):
  per arm the stage-A top 3 (stageA/top3.json); epochs per config = its stage-A best epoch rounded up to
  the evaluation interval (10; CompGCN 5), at least 20 (ruling 36); each selected config timed at its own
  settings for 3 epochs on the stage-A graph and on the largest tune parent (no task score is read);
  s = proj.project_selected (ruling 37: smallest of 1, 3, 6, 10 under 30 h, else 10); checkpoints =
  checkpoints_r33('tune', s); every tune task -> its parent's latest valid checkpoint; lag per task =
  T1 task parents in the parent's history (itself included) that are not in the checkpoint's history.
  The s decision is appended to RUNLOG.md before any stage-B unit trains.
Unit = (arm, config, seed in 1..3, checkpoint): train on the whole checkpoint graph for the fixed epochs,
  score every assigned task for pool and unrestricted candidates (kge.score: fold-in, unscored), write
  stageB/parts/<arm>/<cid>/s<seed>/<ckpt>/{pool,unrestricted}.tsv.gz + counts.json + meta.json
  (.part dir then rename), delete the model's reps.pt, log progress (train/progress.jsonl, step stageB).
Tables: stageB/tables/<arm>_<cid>_s<seed>_<scope>.tsv.gz (evalcore format) + <arm>_<cid>_s<seed>_counts.json.
"""
import os, sys, json, gzip, math, time, shutil, datetime, collections
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.environ.get('EMB_ROOT') or os.path.dirname(HERE)
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(ROOT, 'export')); sys.path.insert(0, os.path.join(ROOT, 'eval'))
import numpy as np
import kge, proj, checkpoints as ck

SB = os.path.join(HERE, 'stageB'); PARTS = os.path.join(SB, 'parts'); TABLES = os.path.join(SB, 'tables')
PLAN = os.path.join(SB, 'plan.json'); PROG = os.path.join(HERE, 'progress.jsonl')
SEEDS = (1, 2, 3); SCOPES = ('pool', 'unrestricted')
LARGEST_TUNE = '7b3a745281898d3d5808c5a15c4916d1d9dbb1b4'
LANES = float(os.environ.get('STAGEB_LANES', '2'))          # projection lanes: 2 containers (CPU plan) unless set
MIN_FREE_GB = float(os.environ.get('STAGEB_MIN_FREE_GB', '0'))  # stop before a unit when the disk seen here is lower


def now(): return datetime.datetime.utcnow().isoformat() + 'Z'


def log(unit, status, **kw):
    with open(PROG, 'a') as f: f.write(json.dumps(dict(step='stageB', unit=unit, status=status, t=now(), **kw)) + '\n')


def done_units():
    if not os.path.exists(PROG): return set()
    return {r['unit'] for r in (json.loads(l) for l in open(PROG) if l.strip()) if r.get('step') == 'stageB' and r.get('status') == 'done'}


def put_json(path, obj):
    part = '%s.%d.part' % (path, os.getpid()); json.dump(obj, open(part, 'w'), indent=1); os.replace(part, path)


def load_tasks():
    return [json.loads(l) for l in open(os.path.join(ROOT, 'eval', 'tune_tasks.jsonl')) if l.strip()]


def load_cands():
    out = {}
    for sc in SCOPES:
        d = collections.defaultdict(list)
        with gzip.open(os.path.join(ROOT, 'eval', 'comparators', 'candidates_%s.tsv.gz' % sc), 'rt') as f:
            next(f)
            for l in f:
                tid, c, _ = l.rstrip('\n').split('\t'); d[tid].append(c)
        out[sc] = dict(d)
    return out


def hist(p, P): return {p} | set(P[p]['ancestor_parents'])


def round_epochs(best, arm):
    iv = kge.es_params(arm)['freq']
    return max(20, int(math.ceil(best / iv) * iv))


# ------------------------------------------------------------------ plan
def make_plan():
    if os.path.exists(PLAN): return json.load(open(PLAN))
    top = json.load(open(os.path.join(HERE, 'stageA', 'top3.json')))
    missing = [a for a in kge.ARMS if not top.get(a, {}).get('complete')]
    if missing: raise SystemExit('stage A not complete for %s' % missing)
    sel = []; configs = {}
    # the CPU plan keeps its file; a card plan reads the card's timing (gpu lane, task 5)
    timing_path = os.path.join(SB, 'timing_selected%s.json' % ('' if kge.DEVICE.type == 'cpu' else '_' + kge.DEVICE.type))
    os.makedirs(SB, exist_ok=True)
    timing = json.load(open(timing_path)) if os.path.exists(timing_path) else {}
    for arm in kge.ARMS:
        configs[arm] = []
        for row in top[arm]['top3']:
            cid = row['config_id']
            meta = json.load(open(os.path.join(HERE, 'stageA', arm, cid, 'meta.json')))
            ep = round_epochs(meta['best_epoch'], arm)
            configs[arm].append(dict(config_id=cid, cfg=row['cfg'], epochs=ep, stageA_best_epoch=meta['best_epoch']))
            for tag, sha in (('A', kge.STAGEA_SHA), ('L', LARGEST_TUNE)):
                key = '%s/%s/%s' % (arm, cid, tag)
                if key not in timing:
                    _, info, G = kge.train(arm, row['cfg'], 1, sha, holdout=False, max_epochs=3, es=False)
                    timing[key] = dict(triples=len(G.train), s_per_epoch=float(np.median(info['epoch_s'])),
                                       peak_rss_mb=info['peak_rss_mb'])
                    put_json(timing_path, timing)
            sel.append((arm, cid, ep, (timing[arm + '/' + cid + '/A']['triples'], timing[arm + '/' + cid + '/A']['s_per_epoch']),
                        (timing[arm + '/' + cid + '/L']['triples'], timing[arm + '/' + cid + '/L']['s_per_epoch'])))
    s, table = proj.project_selected(sel, lanes=LANES)
    wk = proj.wall_key(LANES)
    P = ck.load_parents()
    assign, added = ck.assignment_r33('tune', s, P)
    cps = sorted(set(assign.values()), key=lambda c: P[c]['commit_time'])
    tasks = load_tasks()
    lag = {t['task_id']: len(hist(t['parent'], P) - hist(assign[t['parent']], P)) for t in tasks}
    for t in tasks: assert ck.is_ancestor_or_self(assign[t['parent']], t['parent'], P)
    plan = dict(written=now(), s=s, projection=table, configs=configs, checkpoints=cps, ruling33_added=added,
                assignment=assign, lag=lag, timing_selected=timing,
                device=str(kge.DEVICE), lanes=LANES,
                rule='ruling 37: smallest s in 1,3,6,10 with projected wall < 30 h on %g lanes, else 10' % LANES)
    # the s decision goes to RUNLOG.md before any unit trains
    lines = ['', '## Stage B plan (rulings 36-38), written by stageB.py %s' % plan['written'], '',
             'Epochs per selected config (stage-A best epoch, rounded up to the eval interval, min 20):']
    for arm in kge.ARMS:
        lines.append('- %s: %s' % (arm, ', '.join('%s %d ep (best %s)' % (c['config_id'], c['epochs'], c['stageA_best_epoch']) for c in configs[arm])))
    lines += ['', '| s | tune checkpoints (r33 added) | projected wall h (%s) |' % ('2 containers' if LANES == 2 else '%g lanes on %s' % (LANES, kge.DEVICE)), '|---|---|---|']
    for k in (1, 3, 6, 10):
        lines.append('| %d | %d (%d) | %.1f |' % (k, table[k]['tune_checkpoints'], table[k]['ruling33_added'], table[k][wk]))
    lag_c = collections.Counter(lag.values())
    lines += ['', '**s = %d** (%s). Tune checkpoints used: %d. Lag (task parents) over the 388 tasks: %s.' % (
        s, 'under 30 h' if table[s][wk] < 30 else 'none under 30 h: s = 10 by ruling 37',
        len(cps), dict(sorted(lag_c.items())))]
    with open(os.path.join(HERE, 'RUNLOG.md'), 'a') as f: f.write('\n'.join(lines) + '\n')
    put_json(PLAN, plan)
    log('plan', 'done', s=s, checkpoints=len(cps))
    return plan


# ------------------------------------------------------------------ units
def score_tasks(reps_path, task_rows, cands, P_of, lag, C):
    """Per task kge.score (per-task counts); returns ({scope: table}, per-task counts)."""
    tables = {sc: {} for sc in SCOPES}; per = {}
    for t in task_rows:
        tid = t['task_id']; rec = dict(parent=t['parent'], checkpoint=C, lag=lag[tid])
        for sc in SCOPES:
            tb, cnt = kge.score(reps_path, [(tid, t['seed'], cands[sc].get(tid, []))], t['parent'])
            tables[sc].update(tb); rec[sc] = cnt
        per[tid] = rec
    return tables, per


def write_parts(out, tables, per, meta):
    import evalcore as ec
    part = out + '.part'
    if os.path.exists(part): shutil.rmtree(part)
    os.makedirs(part)
    for sc in SCOPES: ec.write_score_table(os.path.join(part, sc + '.tsv.gz'), tables[sc])
    json.dump(per, open(os.path.join(part, 'counts.json'), 'w'), indent=1)
    json.dump(meta, open(os.path.join(part, 'meta.json'), 'w'), indent=1, default=str)
    if os.path.exists(out): shutil.rmtree(out)
    os.replace(part, out)


def verify_parts(out, tables, per):
    """Read the written unit back: every scope table equal to what was scored (scores are written in repr
    form, so the round trip is exact) and counts.json equal. Only then may the model be deleted."""
    import evalcore as ec
    for sc in SCOPES:
        back = ec.read_score_table(os.path.join(out, sc + '.tsv.gz'))
        want = {t: v for t, v in tables[sc].items() if v}
        if back != {t: {c: float(x) for c, x in v.items()} for t, v in want.items()}:
            raise RuntimeError('read-back mismatch in %s/%s.tsv.gz' % (out, sc))
    if json.load(open(os.path.join(out, 'counts.json'))) != json.loads(json.dumps(per)):
        raise RuntimeError('read-back mismatch in %s/counts.json' % out)


def disk_ok(unit):
    if MIN_FREE_GB <= 0: return True
    free = shutil.disk_usage(PARTS if os.path.exists(PARTS) else HERE).free / 2 ** 30
    if free < MIN_FREE_GB:
        log(unit, 'stopped', reason='free disk %.1f GB < %.1f GB' % (free, MIN_FREE_GB))
        print('free disk %.1f GB < %.1f GB: stopping before %s' % (free, MIN_FREE_GB, unit), flush=True)
        return False
    return True


def run_units(arms, plan):
    tasks = load_tasks(); cands = load_cands()
    by_ck = collections.defaultdict(list)
    for t in tasks: by_ck[plan['assignment'][t['parent']]].append(t)
    for arm in arms:
        for c in plan['configs'][arm]:
            for seed in SEEDS:
                for C in plan['checkpoints']:
                    unit = '%s/%s/s%d/%s' % (arm, c['config_id'], seed, C[:12])
                    out = os.path.join(PARTS, arm, c['config_id'], 's%d' % seed, C)
                    if unit in done_units() and os.path.exists(os.path.join(out, 'counts.json')): continue
                    if not disk_ok(unit): raise SystemExit(3)
                    mdir = out + '.model'
                    t0 = time.time()
                    nco = json.load(open(os.path.join(kge.G0, C, 'sizes.json')))['co_changed_triples']
                    if nco == 0:
                        # a checkpoint without any co_changed fact has no relation to score (h, co_changed, ?):
                        # every assigned task is unscored (alone = random order, fused = RRF; item 17)
                        per = {t['task_id']: dict(parent=t['parent'], checkpoint=C, lag=plan['lag'][t['task_id']],
                                                  note='checkpoint has no co_changed fact',
                                                  **{sc: dict(seeds=1, seeds_unscored=1, cands=len(cands[sc].get(t['task_id'], [])),
                                                              cands_unscored=len(cands[sc].get(t['task_id'], []))) for sc in SCOPES})
                               for t in by_ck[C]}
                        write_parts(out, {sc: {} for sc in SCOPES}, per, dict(arm=arm, config_id=c['config_id'], seed=seed,
                                                                             checkpoint=C, trained=False, reason='no co_changed fact'))
                        log(unit, 'done', tasks=len(per), trained=False, note='no co_changed fact at checkpoint')
                        continue
                    try:
                        _, info, _ = kge.train(arm, c['cfg'], seed, C, holdout=False, outdir=mdir, max_epochs=c['epochs'], es=False)
                        tables, per = score_tasks(os.path.join(mdir, 'reps.pt'), by_ck[C], cands, None, plan['lag'], C)
                        meta = dict(arm=arm, config_id=c['config_id'], cfg=c['cfg'], seed=seed, checkpoint=C, epochs=info['epochs'],
                                    wall_s=info['wall_s'], peak_rss_mb=info['peak_rss_mb'], losses=info['losses'],
                                    reps_bytes=os.path.getsize(os.path.join(mdir, 'reps.pt')), tasks=len(per))
                        meta.update(kge.cuda_peak())
                        write_parts(out, tables, per, meta)
                        verify_parts(out, tables, per)  # read back before the model goes
                        os.remove(os.path.join(mdir, 'reps.pt'))
                        shutil.rmtree(mdir, ignore_errors=True)  # model weights are not kept (meta.json keeps the curve)
                        log(unit, 'done', tasks=len(per), wall_s=round(time.time() - t0, 1), peak_rss_mb=round(info['peak_rss_mb'], 1),
                            reps_deleted=not os.path.exists(mdir), **{k: round(v, 1) for k, v in kge.cuda_peak().items()})
                    except Exception as e:  # logged, retried on the next start; nothing half-written is kept
                        if os.path.exists(out) and not (unit in done_units()): shutil.rmtree(out, ignore_errors=True)
                        shutil.rmtree(mdir, ignore_errors=True)
                        log(unit, 'failed', error=repr(e)[:300], wall_s=round(time.time() - t0, 1))
                        print('FAILED', unit, repr(e), flush=True)
            assemble(arm, plan)


def assemble(arm, plan):
    """Merge the parts of every (config, seed) whose checkpoints are all done."""
    import evalcore as ec
    os.makedirs(TABLES, exist_ok=True)
    for c in plan['configs'][arm]:
        for seed in SEEDS:
            dirs = [os.path.join(PARTS, arm, c['config_id'], 's%d' % seed, C) for C in plan['checkpoints']]
            if not all(os.path.exists(os.path.join(d, 'counts.json')) for d in dirs): continue
            base = os.path.join(TABLES, '%s_%s_s%d' % (arm, c['config_id'], seed))
            if all(os.path.exists('%s_%s.tsv.gz' % (base, sc)) for sc in SCOPES) and os.path.exists(base + '_counts.json'): continue
            for sc in SCOPES:
                T = {}
                for d in dirs: T.update(ec.read_score_table(os.path.join(d, sc + '.tsv.gz')))
                ec.write_score_table('%s_%s.tsv.gz' % (base, sc), T)
            per = {}
            for d in dirs: per.update(json.load(open(os.path.join(d, 'counts.json'))))
            put_json(base + '_counts.json', per)


# ------------------------------------------------------------------ plumbing test
def test():
    """One stage-A model (stageA/E2/c01, trained at cd806c80) scores <= 3 tasks whose parent is cd806c80
    (its only valid task parent under the leak rule). No training; no metric."""
    P = ck.load_parents(); C = kge.STAGEA_SHA
    tasks = [t for t in load_tasks() if t['parent'] == C][:3]
    cands = load_cands()
    lag = {t['task_id']: len(hist(t['parent'], P) - hist(C, P)) for t in tasks}
    out = os.path.join(SB, 'test', 'parts', 'E2', 'c01', 's1', C)
    res = {}
    for arm in ('E2', 'E5'):
        rp = os.path.join(HERE, 'stageA', arm, 'c01', 'reps.pt')
        if not os.path.exists(rp): continue
        tables, per = score_tasks(rp, tasks, cands, None, lag, C)
        write_parts(out.replace('/E2/', '/%s/' % arm), tables, per, dict(test=True, reps=rp))
        res[arm] = dict(tasks=[t['task_id'] for t in tasks], rows={sc: sum(len(v) for v in tables[sc].values()) for sc in SCOPES},
                        cands={sc: sum(len(cands[sc].get(t['task_id'], [])) for t in tasks) for sc in SCOPES},
                        counts={tid: {sc: per[tid][sc] for sc in SCOPES} for tid in per}, lag=lag)
    put_json(os.path.join(SB, 'test', 'test.json'), res)
    print(json.dumps(res)[:2000])


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'plan':
        p = make_plan(); print('s =', p['s'], 'checkpoints', len(p['checkpoints']))
    elif cmd == 'run':
        args = sys.argv[2:]; arms = [a for a in args if a.startswith('E')]
        if '--plan' in args:
            plan = make_plan()
        else:
            while not os.path.exists(PLAN): time.sleep(30)
            plan = json.load(open(PLAN))
        run_units(arms, plan)
        print('stageB finished for', arms, flush=True)
    elif cmd == 'assemble':
        plan = json.load(open(PLAN))
        for a in kge.ARMS: assemble(a, plan)
    elif cmd == 'test':
        test()
