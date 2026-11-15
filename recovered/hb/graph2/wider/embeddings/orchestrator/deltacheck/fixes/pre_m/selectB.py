"""selectB.py (not select.py: that name would shadow the stdlib select module for every script in train/). Nested choice of addendum 8 item 20 (and the PLACEBO arm of item 14).

Commits in date order (author timestamp, ruling 32). The late 50 (`late50`) form 5 blocks of 10. For each
block and arm, every (configuration in the arm's stage-B top 3, w in {0.25, 0.5, 1}) is scored on ALL
earlier commits (date order below the block's first commit) by fused pool P@10 averaged over the three
seeds (per task, then per commit, then over commits). The best mean and its standard error over commits
are taken; among the candidates whose mean is >= best - SE, the simplest wins: smaller dimension, then
fewer layers, then smaller w (then config id). The block is then scored with that choice; the arm alone
uses the same configuration. The same rule on all 65 commits gives the frozen choice of item 27.
PLACEBO: a fixed random score per (seed, task, candidate) fused the same way, the same w choices and rule.
Commits of the pilot's late-50 set that are not in `late50` (sensitivity row, ruling 32) take block 1's
choice.

Outputs, per arm (E1..E5, PLACEBO) in train/selectB/<arm>/:
  choices.json                          per block: chosen (config, w), the candidates' mean/SE/n
  alone_<scope>_s<seed>.tsv.gz          assembled embedding scores (late50 + pilot-only commits)
  fused_<scope>_s<seed>.tsv.gz          weighted RRF of PPR, CO and the embedding score with the chosen w
usage: python selectB.py [--test] [arms...]   (--test: PLACEBO only, writes train/selectB-test/)
"""
import os, sys, json, gzip, hashlib, collections
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.environ.get('EMB_ROOT') or os.path.dirname(HERE)
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(ROOT, 'eval'))
import numpy as np
import evalcore as ec

SEEDS = (1, 2, 3); SCOPES = ('pool', 'unrestricted'); WS = (0.25, 0.5, 1.0)
CD = os.path.join(ROOT, 'eval', 'comparators')
TB = os.path.join(HERE, 'stageB', 'tables')


def placebo(seed, tid, cands):
    return {c: int.from_bytes(hashlib.blake2b(('placebo|%d|%s|%s' % (seed, tid, c)).encode(), digest_size=8).digest(), 'big') / 2.0 ** 64
            for c in cands}


def cand_lists():
    out = {}
    for sc in SCOPES:
        d = collections.defaultdict(list)
        with gzip.open(os.path.join(CD, 'candidates_%s.tsv.gz' % sc), 'rt') as f:
            next(f)
            for l in f:
                tid, c, _ = l.rstrip('\n').split('\t'); d[tid].append(c)
        out[sc] = dict(d)
    return out


def simplicity(cfg, w):
    return (float(cfg.get('embedding_dim', 0)), float(cfg.get('num_layers', 0)), w)


def choose(cands_stats):
    """cands_stats: [(key, cfg, w, values per commit)] -> (chosen key, stats list). One-SE rule."""
    stats = []
    for key, cfg, w, v in cands_stats:
        v = np.asarray(v, float); se = float(v.std(ddof=1) / np.sqrt(len(v))) if len(v) > 1 else 0.0
        stats.append(dict(key=key, cfg=cfg, w=w, mean=float(v.mean()), se=se, n_commits=len(v)))
    best = max(stats, key=lambda s: s['mean'])
    ok = [s for s in stats if s['mean'] >= best['mean'] - best['se']]
    pick = min(ok, key=lambda s: (simplicity(s['cfg'], s['w']), s['key']))
    return pick, stats, best


def run(arms, outroot, test=False):
    tasks = ec.load_tasks()
    order = {t['commit']: t['date_order'] for t in tasks}
    late = sorted(ec.commit_set(tasks, 'late50'), key=order.get)
    pilot_extra = sorted(ec.commit_set(tasks, 'late50_pilot') - set(late), key=order.get)
    blocks = [late[i:i + 10] for i in range(0, 50, 10)]
    cl = cand_lists()
    comp = {sc: {n: ec.read_score_table(os.path.join(CD, '%s_%s.tsv.gz' % (n, sc))) for n in ('PPR', 'CO')} for sc in SCOPES}
    plan = json.load(open(os.path.join(HERE, 'stageB', 'plan.json'))) if not test else None
    by_commit = collections.defaultdict(list)
    for t in tasks: by_commit[t['commit']].append(t)
    for arm in arms:
        if arm == 'PLACEBO':
            cfgs = [('rand', {})]
            emb = {('rand', s, sc): {t['task_id']: placebo(s, t['task_id'], cl[sc].get(t['task_id'], [])) for t in tasks}
                   for s in SEEDS for sc in SCOPES}
        else:
            cfgs = [(c['config_id'], c['cfg']) for c in plan['configs'][arm]]
            emb = {(cid, s, sc): ec.read_score_table(os.path.join(TB, '%s_%s_s%d_%s.tsv.gz' % (arm, cid, s, sc)))
                   for cid, _ in cfgs for s in SEEDS for sc in SCOPES}

        def fused(cid, s, sc, w, t):
            tid = t['task_id']; cands = cl[sc].get(tid, [])
            return ec.fused_with(tid, cands, comp[sc]['PPR'].get(tid, {}), comp[sc]['CO'].get(tid, {}),
                                 emb[(cid, s, sc)].get(tid, {}), w)

        # fused pool P@10 per (cid, w, task), seed-averaged
        p10 = {}
        for cid, cfg in cfgs:
            for w in WS:
                for t in tasks:
                    v = [ec.task_metrics(ec.rank(t['task_id'], cl['pool'].get(t['task_id'], []), fused(cid, s, 'pool', w, t)), t['truth'])['P@10']
                         for s in SEEDS]
                    p10[(cid, w, t['task_id'])] = float(np.mean(v))

        def per_commit_vals(cid, w, commits):
            return [float(np.mean([p10[(cid, w, t['task_id'])] for t in by_commit[c]])) for c in commits]

        choices = []
        for bi, blk in enumerate(blocks):
            first = order[blk[0]]
            earlier = sorted([c for c in order if order[c] < first], key=order.get)
            pick, stats, best = choose([((cid, w), cfg, w, per_commit_vals(cid, w, earlier)) for cid, cfg in cfgs for w in WS])
            choices.append(dict(block=bi + 1, commits=blk, earlier_commits=len(earlier), config_id=pick['key'][0], w=pick['w'],
                                best=dict(config_id=best['key'][0], w=best['w'], mean=best['mean'], se=best['se']),
                                candidates=[dict(config_id=s['key'][0], w=s['w'], mean=s['mean'], se=s['se']) for s in stats]))
        allc = sorted(order, key=order.get)
        pick, stats, best = choose([((cid, w), cfg, w, per_commit_vals(cid, w, allc)) for cid, cfg in cfgs for w in WS])
        final = dict(config_id=pick['key'][0], w=pick['w'], best=dict(config_id=best['key'][0], w=best['w']),
                     note='item 27: chosen on all 65 tune commits by the same rule (used only if this arm is selected)')
        # assemble late50 (+ pilot-only commits with block 1's choice)
        od = os.path.join(outroot, arm); os.makedirs(od, exist_ok=True)
        assign = {c: choices[bi] for bi, blk in enumerate(blocks) for c in blk}
        for c in pilot_extra: assign[c] = choices[0]
        for s in SEEDS:
            for sc in SCOPES:
                alone = {}; fz = {}
                for c, ch in assign.items():
                    for t in by_commit[c]:
                        tid = t['task_id']
                        alone[tid] = emb[(ch['config_id'], s, sc)].get(tid, {})
                        fz[tid] = fused(ch['config_id'], s, sc, ch['w'], t)
                ec.write_score_table(os.path.join(od, 'alone_%s_s%d.tsv.gz' % (sc, s)), alone)
                ec.write_score_table(os.path.join(od, 'fused_%s_s%d.tsv.gz' % (sc, s)), fz)
        tmp = os.path.join(od, 'choices.json.part')
        json.dump(dict(blocks=choices, final_all65=final, pilot_extra_commits=pilot_extra), open(tmp, 'w'), indent=1)
        os.replace(tmp, os.path.join(od, 'choices.json'))
        print(arm, 'blocks', [(c['config_id'], c['w']) for c in choices], 'final', (final['config_id'], final['w']), flush=True)


if __name__ == '__main__':
    args = sys.argv[1:]
    test = '--test' in args
    arms = [a for a in args if not a.startswith('--')] or (['PLACEBO'] if test else ['E1', 'E2', 'E3', 'E4', 'E5', 'PLACEBO'])
    if test: arms = ['PLACEBO']
    run(arms, os.path.join(HERE, 'selectB-test' if test else 'selectB'), test=test)
