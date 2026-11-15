"""Tune-split report (addendum 8 sections F and G; rulings 32, 38) -> train/report/tune.json.

Arms: E1..E5 (alone and fused, from selectB/), PLACEBO (fused, harness check; alone shown too), and the
comparators RRF, PPR, CO, DIR, RANDOM (eval/comparators). Commit sets: late50 (verdicts) and the pilot's
late-50 set (sensitivity row). For each scope (pool, unrestricted) and metric (P@10, R@10, R@20, MRR):
per seed, then the seed mean per task, then per commit, then over commits (evalcore). Paired bootstrap
by commit against RRF, 10,000 resamples, 95 % percentile intervals; Holm-adjusted intervals over the five
embedding arms per (variant, scope, metric). Verdict words (section G) are computed mechanically from the
unadjusted interval: "adds" (lo > 0 and diff >= +0.02), "matches" (-0.02 <= lo and hi <= +0.02),
"cannot tell (lower)" (hi < 0), else "cannot tell". Primary contrast: fused minus RRF, pool P@10.
Lag (ruling 38) and fold-in/unscored counts come from the stage-B count files.
usage: python report.py [--test]   (--test: PLACEBO + comparators only, from selectB-test/, to report/test.json)
"""
import os, sys, json, collections
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.environ.get('EMB_ROOT') or os.path.dirname(HERE)
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(ROOT, 'eval'))
import numpy as np
import evalcore as ec

SEEDS = (1, 2, 3); SCOPES = ('pool', 'unrestricted'); EMB = ('E1', 'E2', 'E3', 'E4', 'E5')
CD = os.path.join(ROOT, 'eval', 'comparators')
B = 10000


def verdict(diff, lo, hi):
    if lo > 0 and diff >= 0.02: return 'adds'
    if lo >= -0.02 and hi <= 0.02: return 'matches'
    if hi < 0: return 'cannot tell (lower)'
    return 'cannot tell'


def main(test=False):
    tasks = ec.load_tasks()
    sets = {'late50': ec.commit_set(tasks, 'late50'), 'late50_pilot': ec.commit_set(tasks, 'late50_pilot')}
    sel = os.path.join(HERE, 'selectB-test' if test else 'selectB')
    arms = ['PLACEBO'] if test else list(EMB) + ['PLACEBO']
    in_scope = {t['task_id'] for t in tasks if t['commit'] in sets['late50'] | sets['late50_pilot']}
    sub = [t for t in tasks if t['task_id'] in in_scope]
    out = dict(B=B, sets={k: len(v) for k, v in sets.items()}, tasks=len(sub), arms={}, comparators={}, contrasts={},
               holm={}, verdicts={}, harness_check={}, lag={}, counts={}, choices={})
    pt = {}  # (name, scope) -> seed-averaged per task ; (name, scope, seed) -> per seed
    for sc in SCOPES:
        for n in ('RRF', 'PPR', 'CO', 'DIR', 'RANDOM'):
            pt[(n, sc)] = ec.evaluate_table(ec.read_score_table(os.path.join(CD, '%s_%s.tsv.gz' % (n, sc))), sc, sub)
        for a in arms:
            for v in ('alone', 'fused'):
                per_seed = [ec.evaluate_table(ec.read_score_table(os.path.join(sel, a, '%s_%s_s%d.tsv.gz' % (v, sc, s))), sc, sub) for s in SEEDS]
                for s, p in zip(SEEDS, per_seed): pt[('%s_%s' % (a, v), sc, s)] = p
                pt[('%s_%s' % (a, v), sc)] = ec.mean_over_seeds(per_seed)
    for setname, commits in sets.items():
        for sc in SCOPES:
            for n in ('RRF', 'PPR', 'CO', 'DIR', 'RANDOM'):
                out['comparators'].setdefault(setname, {}).setdefault(sc, {})[n] = ec.summary(pt[(n, sc)], sub, commits)
            for a in arms:
                for v in ('alone', 'fused'):
                    key = '%s_%s' % (a, v)
                    d = out['arms'].setdefault(setname, {}).setdefault(sc, {}).setdefault(key, {})
                    d['seed_mean'] = ec.summary(pt[(key, sc)], sub, commits)
                    d['per_seed'] = {s: ec.summary(pt[(key, sc, s)], sub, commits) for s in SEEDS}
                    c = ec.paired(pt[(key, sc)], pt[('RRF', sc)], sub, commits, B=B)
                    cs = {s: ec.paired(pt[(key, sc, s)], pt[('RRF', sc)], sub, commits, B=B)['P@10'] for s in SEEDS}
                    out['contrasts'].setdefault(setname, {}).setdefault(sc, {})[key] = dict(
                        vs_RRF={m: dict(zip(('diff', 'lo', 'hi', 'p'), c[m])) for m in ec.METRICS},
                        per_seed_P10_vs_RRF={s: dict(zip(('diff', 'lo', 'hi', 'p'), cs[s])) for s in SEEDS},
                        verdict_P10=verdict(*c['P@10'][:3]))
            # Holm over the five embedding arms, per variant and metric
            emb = [a for a in arms if a in EMB]
            if emb:
                for v in ('alone', 'fused'):
                    for m_i, m in enumerate(ec.METRICS):
                        diffs = []
                        for a in emb:
                            _, x = ec.per_commit(pt[('%s_%s' % (a, v), sc)], sub, commits); _, y = ec.per_commit(pt[('RRF', sc)], sub, commits)
                            diffs.append((x - y)[:, m_i])
                        res = ec.holm_intervals(diffs, B=B)
                        out['holm'].setdefault(setname, {}).setdefault(sc, {}).setdefault(v, {})[m] = {
                            a: dict(zip(('diff', 'lo', 'hi', 'p_raw', 'p_holm', 'level'), r)) for a, r in zip(emb, res)}
    # verdict words (late50 = verdicts; pilot set = sensitivity row)
    for setname in sets:
        for a in arms:
            V = {}
            for v in ('fused', 'alone'):
                for sc in SCOPES:
                    V['%s_%s' % (v, sc)] = out['contrasts'][setname][sc]['%s_%s' % (a, v)]['verdict_P10']
            V['primary'] = V['fused_pool']
            out['verdicts'].setdefault(setname, {})[a] = V
    out['harness_check'] = dict(placebo_primary_late50=out['verdicts']['late50']['PLACEBO']['primary'],
                                ok=out['verdicts']['late50']['PLACEBO']['primary'] != 'adds')
    # choices, lag and counts (embedding arms only)
    for a in arms:
        cj = os.path.join(sel, a, 'choices.json')
        if os.path.exists(cj):
            j = json.load(open(cj))
            out['choices'][a] = dict(blocks=[(b['block'], b['config_id'], b['w']) for b in j['blocks']], final_all65=j['final_all65'])
    if not test:
        plan = json.load(open(os.path.join(HERE, 'stageB', 'plan.json')))
        late_ids = {t['task_id'] for t in tasks if t['commit'] in sets['late50']}
        out['lag'] = dict(stride=plan['s'], late50_tasks=dict(sorted(collections.Counter(plan['lag'][i] for i in late_ids).items())),
                          all_tune_tasks=dict(sorted(collections.Counter(plan['lag'].values()).items())))
        for a in EMB:
            agg = collections.Counter()
            for cfg in plan['configs'][a]:
                for s in SEEDS:
                    p = os.path.join(HERE, 'stageB', 'tables', '%s_%s_s%d_counts.json' % (a, cfg['config_id'], s))
                    if not os.path.exists(p): continue
                    for tid, rec in json.load(open(p)).items():
                        if tid not in late_ids: continue
                        for sc in SCOPES:
                            for k, val in rec[sc].items(): agg['%s/%s/%s' % (cfg['config_id'], sc, k)] += val
            out['counts'][a] = dict(agg)
    od = os.path.join(HERE, 'report'); os.makedirs(od, exist_ok=True)
    path = os.path.join(od, 'test.json' if test else 'tune.json')
    json.dump(out, open(path + '.part', 'w'), indent=1); os.replace(path + '.part', path)
    print('wrote', path, 'verdicts', json.dumps(out['verdicts'].get('late50', {}))[:600])


if __name__ == '__main__':
    main(test='--test' in sys.argv)
