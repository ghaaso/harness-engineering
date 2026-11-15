"""Tune-split report (addendum 8 sections F and G; rulings 32, 38, 53, 54, 56, 58) -> train/report/tune.json.

Arms: E1..E5 (alone and fused, from selectB/), PLACEBO (fused, harness check; alone shown too), and the
comparators RRF, PPR, CO, DIR, RANDOM (eval/comparators). Commit sets: late50 (verdicts) and
late50_pilot_shared = the pilot's late-50 set restricted to the commits it shares with late50 (ruling 56:
the four pilot-only commits are left out; sensitivity row, NO verdict word). For each scope (pool,
unrestricted) and metric (P@10, R@10, R@20, MRR): per seed, then the seed mean per task, then per commit,
then over commits (evalcore). Paired bootstrap by commit against RRF, 10,000 resamples, 95 % percentile
intervals; percentile intervals at Holm-adjusted levels over the five embedding arms per (variant, scope,
metric). Verdict words (section G) are computed mechanically from the unadjusted interval, for the main
variants (alone, fused) on late50 only: "adds" (lo > 0 and diff >= +0.02), "matches" (-0.02 <= lo and
hi <= +0.02), "cannot tell (lower)" (hi < 0), else "cannot tell". Primary contrast: fused minus RRF, pool P@10.
Sensitivity rows, numbers only, never a verdict word: every arm's `*_builder` variants (the builder's reading of
"simplest", ruling 53) and PLACEBO's fixed-w fused rows `fused_w0.25/0.5/1` (ruling 54).
Lag (ruling 38) comes from plan.json; fold-in/unscored counts (item 17, ruling 62) from the stage-B count files of the
CHOSEN configurations, one seed, three separate figures, with distinct entities recomputed from export/graphs0
(counts_section; release gate scoring-selection-3 and -4).
Ruling 58: without --test this script refuses to run until RUNLOG.md lists the four sha256 lines (selectB.r58_guard).
usage: python report.py [--test]   (--test: PLACEBO + comparators only, from selectB-test/, to report/test.json)
"""
import os, sys, json, collections
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.environ.get('EMB_ROOT') or os.path.dirname(HERE)
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(ROOT, 'eval'))
import numpy as np
import evalcore as ec
from selectB import r58_guard, WS, cand_lists, stamp
from atomic import put_json

SEEDS = (1, 2, 3); SCOPES = ('pool', 'unrestricted'); EMB = ('E1', 'E2', 'E3', 'E4', 'E5')
CD = os.path.join(ROOT, 'eval', 'comparators')
B = 10000
MAIN = ('alone', 'fused')
VERDICT_SET = 'late50'


# ---------------------------------------------------------------- item 17 counts (ruling 62; release gate
# scoring-selection-3 and -4). Counts are taken for the configurations ruling 53 chose (per block for late50, and
# the final_all65 choice for all 65), for ONE seed (seed 1; the other seeds are compared and must be identical,
# because whether a seed or candidate is scored depends only on C's triples, the area split and P's neighbours,
# never on the trained model). Three figures are kept apart (scoring-selection-3): candidates of unscored seeds,
# tasks on a checkpoint with no co_changed fact (no split keys), and the two ruling-55 cases among SCORED seeds
# only. Distinct entities are recomputed from export/graphs0 with kge.score's at_C / route / known-set logic
# (copied below without torch) and the recomputed occurrences are checked against the count files.
AREAS = ('backend', 'mobile', 'web', 'other')  # = kge.AREAS
CO_REL = 'co_changed'
COUNTS_NOTE = ('item 17 / ruling 62 counts for the chosen configuration (ruling 53: per block for late50, final_all65 for all '
               '65), seed 1 (seeds 2 and 3 compared: same_across_seeds); occurrences = task-candidate pairs, distinct = '
               'distinct paths (and distinct checkpoint-path pairs); candidates of unscored seeds, tasks on checkpoints '
               'without co_changed and the two ruling-55 cases among scored seeds are separate figures')


def _read_g0(g0, sha):
    ents = {}
    with open(os.path.join(g0, sha, 'entities.tsv')) as f:
        next(f)
        for l in f:
            i, kind, path, code, area = l.rstrip('\n').split('\t'); ents[i] = (kind, path, area, code == '1')
    with open(os.path.join(g0, sha, 'triples.tsv')) as f:
        next(f)
        tri = [tuple(l.rstrip('\n').split('\t')) for l in f]
    return ents, tri


def _route(seed_e, ents, nb):
    """kge.route (kge.py:494-502), copied so the report needs no torch."""
    a1 = ents.get(seed_e, ('', '', 'other'))[2]
    c = collections.Counter(ents.get(n, ('', '', 'other'))[2] for n in nb.get(seed_e, ()))
    c.pop(a1, None)
    if not c: return [a1]
    top = max(c.values())
    return [a1, [a for a in AREAS if c.get(a) == top][0]]


class ScoreStatus:
    """Which seeds and candidates kge.score can score for a model trained on C and tasks at P = C (s = 1).
    train: C's training triples (default: C's whole graph, as stage B trains; a stage-A model passes its split)."""

    def __init__(self, g0, sha, train=None):
        self.ents, tri = _read_g0(g0, sha)
        train = tri if train is None else train
        self.known = {h for h, _, _ in train} | {t for _, _, t in train}
        self.nb = collections.defaultdict(set)
        for h, r, t in tri:
            if h != t: self.nb[h].add(t); self.nb[t].add(h)
        area = lambda e: self.ents.get(e, ('', '', 'other'))[2]
        self.at_C = set(); self.specs = {}
        for A in AREAS:
            ta = [x for x in train if area(x[0]) == A or area(x[2]) == A]
            if not ta: continue
            kn = {h for h, _, _ in ta} | {t for _, _, t in ta}
            self.at_C |= kn
            if any(r == CO_REL for _, r, _ in ta): self.specs[A] = kn

    def status(self, arm, seed, cands):
        """(seed case or None if scored, {candidate: case or None if scored}); cases 'absent_at_C',
        'not_in_routed_specialists' (E5 only)."""
        s = 'file:' + seed
        if arm != 'E5':
            if s not in self.known: return 'absent_at_C', {c: 'seed_unscored' for c in cands}
            return None, {c: (None if 'file:' + c in self.known else 'absent_at_C') for c in cands}
        use = [A for A in _route(s, self.ents, self.nb) if A in self.specs and s in self.specs[A]]
        if not use:
            return ('absent_at_C' if s not in self.at_C else 'not_in_routed_specialists'), {c: 'seed_unscored' for c in cands}
        out = {}
        for c in cands:
            e = 'file:' + c
            out[c] = None if any(e in self.specs[A] for A in use) else ('absent_at_C' if e not in self.at_C else 'not_in_routed_specialists')
        return None, out


def count_figures(arm, task_cfg, tasks_by_id, read_counts, cands_by_scope, status_of=None):
    """task_cfg: {task_id: chosen config}. read_counts(cid, seed) -> {task_id: rec} or None. status_of(task) ->
    ScoreStatus or None (no recompute). Returns {scope: figures} (see COUNTS_NOTE)."""
    out = {}
    cache = {}

    def rc(cid, s):
        if (cid, s) not in cache: cache[(cid, s)] = read_counts(cid, s)
        return cache[(cid, s)]
    for sc in SCOPES:
        f = collections.Counter(); dist = collections.defaultdict(set); same = True; missing = 0; recompute_ok = True; mism = []
        for tid in sorted(task_cfg):
            cid = task_cfg[tid]; c1 = rc(cid, 1)
            if c1 is None or tid not in c1: missing += 1; continue
            rec = c1[tid]; r = rec.get(sc) or {}
            for s in (2, 3):
                cs = rc(cid, s)
                if cs is None or cs.get(tid, {}).get(sc) != r: same = False
            cl = cands_by_scope[sc].get(tid, [])
            f['tasks'] += 1
            if 'note' in rec:  # checkpoint without any co_changed fact: no split keys exist (stageB.py:299-311)
                f['tasks_on_checkpoint_without_co_changed'] += 1; f['cands_of_those_tasks'] += len(cl); continue
            f['cands_folded'] += r.get('cands_folded', 0); f['seeds_folded'] += r.get('seeds_folded', 0)
            if r.get('seeds_unscored', 0):
                f['tasks_with_unscored_seed'] += 1; f['cands_of_unscored_seeds'] += len(cl)
                case = 'seeds_unscored_absent_at_C' if arm != 'E5' else next((k for k in ('seeds_unscored_absent_at_C', 'seeds_unscored_not_in_routed_specialists') if r.get(k)), 'seeds_unscored_absent_at_C')
                f[case] += 1
            else:
                f['scored_seed_tasks'] += 1; f['scored_seed_cands'] += r.get('cands', 0); f['scored_seed_cands_unscored'] += r.get('cands_unscored', 0)
                if arm == 'E5':
                    f['scored_seed_cands_unscored_absent_at_C'] += r.get('cands_unscored_absent_at_C', 0)
                    f['scored_seed_cands_unscored_not_in_routed_specialists'] += r.get('cands_unscored_not_in_routed_specialists', 0)
                else:
                    f['scored_seed_cands_unscored_absent_at_C'] += r.get('cands_unscored', 0)
            st = status_of(tasks_by_id[tid]) if status_of else None
            if st is None: recompute_ok = None if recompute_ok is not False else False; continue
            t = tasks_by_id[tid]; scase, cst = st.status(arm, t['seed'], cl)
            want_unscored = 1 if scase else 0
            if want_unscored != int(bool(r.get('seeds_unscored', 0))): recompute_ok = False; mism.append((tid, 'seed', scase))
            if scase:
                dist['unscored_seeds'].add(t['seed']); dist['unscored_seeds_ck'].add((rec.get('checkpoint'), t['seed']))
                for c in cl: dist['cands_of_unscored_seeds'].add(c); dist['cands_of_unscored_seeds_ck'].add((rec.get('checkpoint'), c))
                continue
            n_abs = sum(1 for v in cst.values() if v == 'absent_at_C'); n_nr = sum(1 for v in cst.values() if v == 'not_in_routed_specialists')
            got_abs = r.get('cands_unscored_absent_at_C', 0) if arm == 'E5' else r.get('cands_unscored', 0)
            got_nr = r.get('cands_unscored_not_in_routed_specialists', 0) if arm == 'E5' else 0
            if (n_abs, n_nr) != (got_abs, got_nr) or len(cl) != r.get('cands', 0):
                recompute_ok = False; mism.append((tid, sc, (n_abs, n_nr, len(cl)), (got_abs, got_nr, r.get('cands', 0))))
            for c, v in cst.items():
                if v: dist[v].add(c); dist[v + '_ck'].add((rec.get('checkpoint'), c))
        f = dict(f)
        if arm == 'E5':  # the two ruling-55 cases reconcile with the unscored candidates of scored seeds
            f['ruling55_cases_reconcile'] = (f.get('scored_seed_cands_unscored_absent_at_C', 0) + f.get('scored_seed_cands_unscored_not_in_routed_specialists', 0)
                                             == f.get('scored_seed_cands_unscored', 0))
        out[sc] = dict(occurrences=f, distinct={k: len(v) for k, v in sorted(dist.items()) if not k.endswith('_ck')},
                       distinct_checkpoint_entities={k[:-3]: len(v) for k, v in sorted(dist.items()) if k.endswith('_ck')},
                       same_across_seeds=same, tasks_missing_counts=missing, recompute_matches_counts=recompute_ok, mismatches=mism[:5])
    return out


def counts_section(plan, sel, tasks, tables, g0, cands_by_scope, arms=EMB):
    tasks_by_id = {t['task_id']: t for t in tasks}
    late = ec.commit_set(tasks, 'late50')
    st_cache = {}

    def status_of(t):
        if int(plan['s']) != 1: return None  # recompute written for s = 1 (C = P) only, the run's stride
        C = plan['assignment'][t['parent']]
        if C != t['parent']: return None
        if C not in st_cache: st_cache[C] = ScoreStatus(g0, C)
        return st_cache[C]
    out = {}
    for a in arms:
        cj = os.path.join(sel, a, 'choices.json')
        if not os.path.exists(cj): continue
        j = json.load(open(cj))
        blk = {c: b['config_id'] for b in j['blocks'] for c in b['commits']}

        def read_counts(cid, s, a=a):
            p = os.path.join(tables, '%s_%s_s%d_counts.json' % (a, cid, s))
            return json.load(open(p)) if os.path.exists(p) else None
        out[a] = dict(late50_block_choices=count_figures(a, {t['task_id']: blk[t['commit']] for t in tasks if t['commit'] in late},
                                                          tasks_by_id, read_counts, cands_by_scope, status_of),
                      all65_final_choice=dict(config_id=j['final_all65']['config_id'],
                                              figures=count_figures(a, {t['task_id']: j['final_all65']['config_id'] for t in tasks},
                                                                    tasks_by_id, read_counts, cands_by_scope, status_of)))
    return out


def check_stamps(sel, arms, plan, tb):
    """selection-freeze-7: refuse (exit 4) unless every arm's choices.json carries the current plan hash, selectB.py
    sha256 and tables digest (a selectB/ folder from an earlier plan, selectB or assembly is stale input)."""
    want = stamp(plan, tb); bad = []
    for a in arms:
        cj = os.path.join(sel, a, 'choices.json')
        got = json.load(open(cj)).get('stamp') if os.path.exists(cj) else 'choices.json missing'
        if got != want: bad.append('%s: %s' % (a, got if isinstance(got, str) else {k: (got or {}).get(k) == v for k, v in want.items()}))
    if bad:
        print('selection-freeze-7: refusing stale selectB output: %s' % '; '.join(bad), flush=True)
        raise SystemExit(4)


def verdict(diff, lo, hi):
    """selection-freeze-6: diff and both bounds are rounded to 12 decimals before the thresholds."""
    diff, lo, hi = round(diff, 12), round(lo, 12), round(hi, 12)
    if lo > 0 and diff >= 0.02: return 'adds'
    if lo >= -0.02 and hi <= 0.02: return 'matches'
    if hi < 0: return 'cannot tell (lower)'
    return 'cannot tell'


def variants(arm):
    v = list(MAIN) + ['alone_builder', 'fused_builder']
    if arm == 'PLACEBO': v += ['fused_w%g' % w for w in WS]
    return v


def main(test=False):
    if not test: r58_guard()
    tasks = ec.load_tasks()
    late = ec.commit_set(tasks, 'late50')
    sets = {'late50': late, 'late50_pilot_shared': ec.commit_set(tasks, 'late50_pilot') & late}
    sel = os.path.join(HERE, 'selectB-test' if test else 'selectB')
    arms = ['PLACEBO'] if test else list(EMB) + ['PLACEBO']
    if not test:
        check_stamps(sel, arms, json.load(open(os.path.join(HERE, 'stageB', 'plan.json'))), os.path.join(HERE, 'stageB', 'tables'))
    in_scope = {t['task_id'] for t in tasks if t['commit'] in late}
    sub = [t for t in tasks if t['task_id'] in in_scope]
    out = dict(B=B, sets={k: len(v) for k, v in sets.items()}, tasks=len(sub), arms={}, comparators={}, contrasts={},
               holm={}, verdicts={}, harness_check={}, lag={}, counts={}, choices={},
               notes=dict(late50_pilot_shared='ruling 56: pilot set on the commits shared with late50; sensitivity row, no verdict word',
                          builder="ruling 53: '*_builder' rows use the builder's earlier reading of 'simplest'; sensitivity only, no verdict word",
                          fixed_w='ruling 54: PLACEBO fused at each fixed w; harness rows, no verdict word',
                          holm='percentile intervals at Holm-adjusted levels'))
    pt = {}  # (name, scope) -> seed-averaged per task ; (name, scope, seed) -> per seed
    for sc in SCOPES:
        for n in ('RRF', 'PPR', 'CO', 'DIR', 'RANDOM'):
            pt[(n, sc)] = ec.evaluate_table(ec.read_score_table(os.path.join(CD, '%s_%s.tsv.gz' % (n, sc))), sc, sub)
        for a in arms:
            for v in variants(a):
                per_seed = [ec.evaluate_table(ec.read_score_table(os.path.join(sel, a, '%s_%s_s%d.tsv.gz' % (v, sc, s))), sc, sub) for s in SEEDS]
                for s, p in zip(SEEDS, per_seed): pt[('%s_%s' % (a, v), sc, s)] = p
                pt[('%s_%s' % (a, v), sc)] = ec.mean_over_seeds(per_seed)
    for setname, commits in sets.items():
        for sc in SCOPES:
            for n in ('RRF', 'PPR', 'CO', 'DIR', 'RANDOM'):
                out['comparators'].setdefault(setname, {}).setdefault(sc, {})[n] = ec.summary(pt[(n, sc)], sub, commits)
            for a in arms:
                for v in variants(a):
                    key = '%s_%s' % (a, v)
                    d = out['arms'].setdefault(setname, {}).setdefault(sc, {}).setdefault(key, {})
                    d['seed_mean'] = ec.summary(pt[(key, sc)], sub, commits)
                    d['per_seed'] = {s: ec.summary(pt[(key, sc, s)], sub, commits) for s in SEEDS}
                    c = ec.paired(pt[(key, sc)], pt[('RRF', sc)], sub, commits, B=B)
                    cs = {s: ec.paired(pt[(key, sc, s)], pt[('RRF', sc)], sub, commits, B=B)['P@10'] for s in SEEDS}
                    row = dict(vs_RRF={m: dict(zip(('diff', 'lo', 'hi', 'p'), c[m])) for m in ec.METRICS},
                               per_seed_P10_vs_RRF={s: dict(zip(('diff', 'lo', 'hi', 'p'), cs[s])) for s in SEEDS})
                    if setname == VERDICT_SET and v in MAIN:
                        row['verdict_P10'] = verdict(*c['P@10'][:3])
                    else:
                        row['sensitivity'] = True  # numbers only; no verdict word (rulings 53, 54, 56)
                    out['contrasts'].setdefault(setname, {}).setdefault(sc, {})[key] = row
            # Holm over the five embedding arms, per main variant and metric
            emb = [a for a in arms if a in EMB]
            if emb:
                for v in MAIN:
                    for m_i, m in enumerate(ec.METRICS):
                        diffs = []
                        for a in emb:
                            _, x = ec.per_commit(pt[('%s_%s' % (a, v), sc)], sub, commits); _, y = ec.per_commit(pt[('RRF', sc)], sub, commits)
                            diffs.append((x - y)[:, m_i])
                        res = ec.holm_intervals(diffs, B=B)
                        out['holm'].setdefault(setname, {}).setdefault(sc, {}).setdefault(v, {})[m] = {
                            a: dict(zip(('diff', 'lo', 'hi', 'p_raw', 'p_holm', 'level'), r)) for a, r in zip(emb, res)}
    # verdict words: late50, main variants only
    for a in arms:
        V = {}
        for v in MAIN:
            for sc in SCOPES:
                V['%s_%s' % (v, sc)] = out['contrasts'][VERDICT_SET][sc]['%s_%s' % (a, v)]['verdict_P10']
        V['primary'] = V['fused_pool']
        out['verdicts'].setdefault(VERDICT_SET, {})[a] = V
    out['harness_check'] = dict(placebo_primary_late50=out['verdicts']['late50']['PLACEBO']['primary'],
                                ok=out['verdicts']['late50']['PLACEBO']['primary'] != 'adds',
                                placebo_fixed_w_late50_pool_P10_vs_RRF={
                                    'w%g' % w: out['contrasts']['late50']['pool']['PLACEBO_fused_w%g' % w]['vs_RRF']['P@10'] for w in WS})
    # choices, lag and counts (embedding arms only)
    for a in arms:
        cj = os.path.join(sel, a, 'choices.json')
        if os.path.exists(cj):
            j = json.load(open(cj))
            out['choices'][a] = dict(blocks=[(b['block'], b['config_id'], b['w']) for b in j['blocks']], final_all65=j['final_all65'],
                                     sensitivity_builder=[(b['block'], b['config_id'], b['w']) for b in j['sensitivity_builder']['blocks']])
    if not test:
        plan = json.load(open(os.path.join(HERE, 'stageB', 'plan.json')))
        late_ids = {t['task_id'] for t in tasks if t['commit'] in sets['late50']}
        out['lag'] = dict(stride=plan['s'], late50_tasks=dict(sorted(collections.Counter(plan['lag'][i] for i in late_ids).items())),
                          all_tune_tasks=dict(sorted(collections.Counter(plan['lag'].values()).items())))
        out['counts'] = counts_section(plan, sel, tasks, os.path.join(HERE, 'stageB', 'tables'),
                                       os.path.join(ROOT, 'export', 'graphs0'), cand_lists())
        out['notes']['counts'] = COUNTS_NOTE
    od = os.path.join(HERE, 'report'); os.makedirs(od, exist_ok=True)
    path = os.path.join(od, 'test.json' if test else 'tune.json')
    put_json(path, out)  # .part then replace_retry (atomic.py, task 2)
    print('wrote', path, 'verdicts', json.dumps(out['verdicts'].get('late50', {}))[:600])


if __name__ == '__main__':
    main(test='--test' in sys.argv)
