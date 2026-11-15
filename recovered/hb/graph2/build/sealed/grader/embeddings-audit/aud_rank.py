"""Auditor's own rank scorer and comparisons (runs in graphtest-kge:1; /build ro, this folder rw, /lane/eval ro).

Own code, written from addendum 8 items 4, 5, 23, 27 and decision 5: truth from aud_truth.jsonl (aud_truth.js),
metrics, seed mean -> commit mean -> mean over commits, paired bootstrap by commit (numpy default_rng(0), 10,000,
linear percentiles 2.5/97.5, p = min(1, 2 min(share<=0, share>=0))). The only rule taken from the lane is the tie
rule of evalcore.rank / tiebreak (blake2b digest 8 of 'TIE_SEED|task|candidate', TIE_SEED 20261114), used to turn the
comparator score tables into ranked lists. evalcore.py is NOT imported for any of this.

Part 2 imports the BUILDER's code (gradecore / grade) only to produce the builder's figures on the same input, with
every output redirected into this folder. Prints aggregates and counts only.
"""
import os, sys, json, gzip, hashlib, math, collections
import numpy as np

A = os.path.dirname(os.path.abspath(__file__))
COMP = '/lane/eval/comparators'
SYN = '/build/sealed/grader/embeddings/test-out/handoffs/heldout'
TIE = 20261114
M4 = ('P@10', 'R@10', 'R@20', 'MRR')
SC = ('pool', 'unrestricted')
COMPS = ('RRF', 'PPR', 'CO', 'DIR')


def jl(p):
    op = gzip.open if p.endswith('.gz') else open
    with op(p, 'rt', encoding='utf-8') as f: return [json.loads(l) for l in f if l.strip()]


TR = {r['id']: r for r in jl(os.path.join(A, 'aud_truth.jsonl'))}


# ------------------------------------------------------------------ own metrics and aggregation
def metrics(lst, truth):
    T = set(truth); d = len(T) if T else 1
    h10 = len([p for p in lst[:10] if p in T]); h20 = len([p for p in lst[:20] if p in T])
    first = next((k for k, p in enumerate(lst, 1) if p in T), None)
    return (h10 / 10.0, h10 / d, h20 / d, 1.0 / first if first else 0.0)


def by_commit(per, ids):
    """per: {id: tuple of values}; -> (commits in date order, array [n_commits, k])."""
    g = collections.defaultdict(list)
    for i in ids: g[TR[i]['commit']].append(per[i])
    cs = sorted(g, key=lambda c: TR[next(i for i in ids if TR[i]['commit'] == c)]['order'])
    return cs, np.array([np.mean(np.array(g[c], float), axis=0) for c in cs])


def agg(per, ids):
    _, a = by_commit(per, ids); return a.mean(axis=0)


def seedmean(pers, ids):
    return {i: tuple(np.mean([np.array(p[i], float) for p in pers], axis=0)) for i in ids}


def boot(v, B=10000):
    v = np.asarray(v, float); n = len(v); idx = np.random.default_rng(0).integers(0, n, (B, n)); mm = v[idx].mean(axis=1)
    lo, hi = np.percentile(mm, [2.5, 97.5]); p = min(1.0, 2 * min(float((mm <= 0).mean()), float((mm >= 0).mean())))
    return float(v.mean()), float(lo), float(hi), p


def paired(pa, pb, ids, col):
    ca, a = by_commit(pa, ids); cb, b = by_commit(pb, ids); assert ca == cb
    return boot(a[:, col] - b[:, col])


# ------------------------------------------------------------------ tie rule (taken from the lane)
def tb(task, c):
    return int.from_bytes(hashlib.blake2b(('%d|%s|%s' % (TIE, task, c)).encode(), digest_size=8).digest(), 'big') / 2.0 ** 64


def rank_from_scores(task, cands, scores):
    s = [c for c in cands if c in scores and scores[c] is not None and not (isinstance(scores[c], float) and math.isnan(scores[c]))]
    ss = set(s)
    return sorted(s, key=lambda c: (-scores[c], tb(task, c), c)) + sorted([c for c in cands if c not in ss], key=lambda c: (tb(task, c), c))


def tsv(p, ids, val=True):
    out = collections.defaultdict(dict) if val else collections.defaultdict(list)
    with gzip.open(p, 'rt', encoding='utf-8') as f:
        next(f)
        for l in f:
            t, c, s = l.rstrip('\n').split('\t')
            if t in ids:
                if val: out[t][c] = float(s)
                else: out[t].append(c)
    return out


def leaves(o, pre=''):
    if isinstance(o, dict):
        for k in sorted(o): yield from leaves(o[k], pre + '/' + str(k))
    elif isinstance(o, (int, float)) and not isinstance(o, bool): yield pre, float(o)


def main():
    out = {}
    late = sorted(i for i, t in TR.items() if t['split'] == 'tune' and t['late50'])
    # ---------------- (b) comparators, late 50
    M = json.load(open(os.path.join(COMP, 'metrics.json')))
    XB = json.load(open('/build/sealed/grader/embeddings/crosscheck_b.json'))
    ranked_c = {}; mine_c = {}; worst_lane = 0.0; worst_xb = 0.0
    for sc in SC:
        C = tsv(os.path.join(COMP, 'candidates_%s.tsv.gz' % sc), set(late), val=False)
        for n in COMPS:
            S = tsv(os.path.join(COMP, '%s_%s.tsv.gz' % (n, sc)), set(late))
            R = {i: rank_from_scores(i, C.get(i, []), S.get(i, {})) for i in late}
            ranked_c[(n, sc)] = R
            per = {i: metrics(R[i], TR[i]['truth']) for i in late}
            v = agg(per, late); mine_c[(n, sc)] = per
            lane = M['%s_%s' % (n, sc)]['late50']; xb = XB['rows']['%s_%s_late50' % (n, sc)]['grader']
            worst_lane = max(worst_lane, max(abs(v[k] - lane[m]) for k, m in enumerate(M4)))
            worst_xb = max(worst_xb, max(abs(v[k] - xb[m]) for k, m in enumerate(M4)))
            out['comp_%s_%s' % (n, sc)] = dict(zip(M4, map(float, v)))
    out['comparators'] = dict(tasks=len(late), commits=len({TR[i]['commit'] for i in late}), max_abs_vs_metrics_json=worst_lane, max_abs_vs_builder_crosscheck_b_json=worst_xb)
    # builder's code on the same ranked lists (fresh run)
    sys.path.insert(0, '/build/sealed/grader/embeddings')
    import gradecore as gc, grade
    gc.check_pins(); btruth = gc.load_truth(); btasks = gc.ec_tasks(late, btruth); worst_b = 0.0
    for (n, sc), R in ranked_c.items():
        b = gc.summary(gc.per_task_rank(R, btruth), btasks)
        worst_b = max(worst_b, max(abs(b[m] - out['comp_%s_%s' % (n, sc)][m]) for m in M4))
    out['comparators']['max_abs_vs_builder_code_fresh'] = worst_b
    # extra: a tuning-style paired interval (PPR - RRF pool) mine vs builder (evalcore.paired via gradecore)
    mp = paired(mine_c[('PPR', 'pool')], mine_c[('RRF', 'pool')], late, 0)
    bp = gc.paired(gc.per_task_rank(ranked_c[('PPR', 'pool')], btruth), gc.per_task_rank(ranked_c[('RRF', 'pool')], btruth), btasks)['P@10']
    out['comparators']['paired_PPR_minus_RRF_pool_P10_max_abs'] = max(abs(x - y) for x, y in zip(mp, bp))

    # ---------------- (c) synthetic held-out-form hand-off: own grading
    H = json.load(open(os.path.join(SYN, 'HANDOFF.json')))
    hsha = hashlib.sha256(open(os.path.join(SYN, 'HANDOFF.json'), 'rb').read()).hexdigest()
    for rel, h in H['files'].items():
        assert hashlib.sha256(open(os.path.join(SYN, rel), 'rb').read()).hexdigest() == h, 'listed hash'
    ids = sorted(r['id'] for r in jl(os.path.join(SYN, 'tasks_used.jsonl')))
    arm = H['chosen']['arm']; V = [v['name'] for v in H['variants']]
    per = {}
    for n in V:
        for sc in SC:
            R = {r['id']: r['ranked'] for r in jl(os.path.join(SYN, 'ranked', '%s_%s.jsonl.gz' % (n, sc)))}
            per[(n, sc)] = {i: metrics(R[i], TR[i]['truth']) for i in ids}
    ans = collections.defaultdict(dict)
    for r in jl(os.path.join(A, 'ans_synth.jsonl')): ans[os.path.basename(r['file']).replace('.jsonl.gz', '')][r['id']] = (r['r8000'],)
    mine = {'rank': {}, 'answer_level': {}, 'vs_RRF': {}}
    for k in ('alone', 'fused'):
        names = ['%s_%s_s%d' % (arm, k, s) for s in (1, 2, 3)]
        for sc in SC: per[('%s_%s_mean' % (arm, k), sc)] = seedmean([per[(n, sc)] for n in names], ids)
        ans['%s_%s_mean' % (arm, k)] = seedmean([ans[n] for n in names], ids)
    v12 = ['%s_alone_s%d' % (arm, s) for s in (1, 2, 3)] + ['%s_alone_mean' % arm] + ['%s_fused_s%d' % (arm, s) for s in (1, 2, 3)] + ['%s_fused_mean' % arm] + list(COMPS)
    for v in v12:
        mine['rank'][v] = {sc: dict(zip(M4, map(float, agg(per[(v, sc)], ids)))) for sc in SC}
        mine['answer_level'][v] = float(agg(ans[v], ids)[0])
    for k in ('fused', 'alone'):
        row = '%s_%s_mean' % (arm, k); d = {}
        for sc in SC:
            m_, lo, hi, _ = paired(per[(row, sc)], per[('RRF', sc)], ids, 0); d['%s_P@10' % sc] = dict(diff=m_, lo=lo, hi=hi)
        m_, lo, hi, _ = paired(ans[row], ans['RRF'], ids, 0); d['answer_level'] = dict(diff=m_, lo=lo, hi=hi)
        mine['vs_RRF'][row] = d
    mine['commits'] = len({TR[i]['commit'] for i in ids}); mine['tasks'] = len(ids)
    # builder's grade.run on the same hand-off, outputs redirected here
    bret = os.path.join(A, 'builder-run', 'returns'); bwork = os.path.join(A, 'builder-run', 'work')
    os.makedirs(bret, exist_ok=True); os.makedirs(bwork, exist_ok=True)
    grade.run('heldout-test', SYN, hsha, H['freeze_sha256'], returns_root=bret, work_root=bwork, quiet=True)
    BR = json.load(open(os.path.join(bret, 'test', 'heldout.json')))
    lb = dict(leaves({k: BR[k] for k in ('rank', 'answer_level', 'vs_RRF', 'commits', 'tasks')}))
    lm = dict(leaves(mine))
    keys_equal = set(lb) == set(lm)
    is_ans = lambda k: k.startswith('/answer_level') or '/answer_level/' in k
    rank_d = max(abs(lb[k] - lm[k]) for k in lb if not is_ans(k))
    ans_d = max(abs(lb[k] - lm[k]) for k in lb if is_ans(k))
    out['synthetic_heldout_counts'] = dict(rank_leaves=sum(1 for k in lb if not is_ans(k)), answer_leaves=sum(1 for k in lb if is_ans(k)))
    out['synthetic_heldout'] = dict(tasks=len(ids), commits=mine['commits'], leaves=len(lb), keys_equal=keys_equal, max_abs_rank_and_P10_intervals=rank_d,
                                    max_abs_answer_level_and_its_intervals=ans_d, builder_literal_check=BR['literal_check'],
                                    builder_top_keys=sorted(BR), builder_scorer=BR['scorer'])
    # literal-check probe: give one synthetic task a checkpoint whose facts history holds its task commit
    probe = None
    fc = '/build/facts/cache'
    for sha in sorted(os.listdir(fc)):
        p = os.path.join(fc, sha, 'commits.jsonl')
        if not os.path.exists(p): continue
        hist = {r['sha'] for r in jl(p)}
        hit = [i for i in ids if TR[i]['commit'] in hist]
        if hit: probe = (sha, hit[0]); break
    if probe:
        rows = jl(os.path.join(SYN, 'tasks_used.jsonl'))
        lc = gc.literal_check(rows, btruth, {probe[1]: {probe[0]}})
        rows2 = [dict(r, parent=('0' * 40 if r['id'] == probe[1] else r['parent'])) for r in rows]
        lc2 = gc.literal_check(rows2, btruth, {r['id']: {r['parent']} for r in rows})
        out['literal_probe'] = dict(one_leaky_checkpoint=lc, one_wrong_parent=lc2['parent_mismatch'])
    # ---------------- (d) stored held-out answers: own scorer vs builder path
    st = collections.defaultdict(dict)
    for r in jl(os.path.join(A, 'ans_stored.jsonl')): st[r['file'].split('/')[-3]][r['id']] = (r['r8000'],)
    XC = json.load(open('/build/sealed/grader/embeddings/crosscheck_c.json'))
    d = {}
    for arm_, per_ in st.items():
        hid = sorted(per_); mv = float(agg(per_, hid)[0])
        bper, info = gc.answer_level_per_task('/build/results/heldout/%s/primary/T1.jsonl.gz' % arm_, os.path.join(A, 'builder-run', 'work', 'stored_%s.jsonl' % arm_), expect_arm=arm_, expect_hash=None)
        bv = gc.summary(gc.as_metrics(bper), gc.ec_tasks(set(bper), btruth))['P@10']
        task_eq = sum(1 for i in hid if abs(bper[i] - per_[i][0]) < 1e-12)
        d[arm_] = dict(mine=mv, builder_fresh=bv, builder_crosscheck_c=XC['rows'][arm_]['grader'], abs_diff=abs(mv - bv), tasks=len(hid),
                       commits=len({TR[i]['commit'] for i in hid}), per_task_equal=task_eq)
    out['stored_answers'] = d
    print(json.dumps(out, indent=1, sort_keys=True))
    json.dump(out, open(os.path.join(A, 'aud_rank_out.json'), 'w'), indent=1, sort_keys=True)


if __name__ == '__main__':
    main()
