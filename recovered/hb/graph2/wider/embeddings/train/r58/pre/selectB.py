"""selectB.py (not select.py: that name would shadow the stdlib select module for every script in train/). Nested choice of addendum 8 item 20 (and the PLACEBO arm of item 14).

Commits in date order (author timestamp, ruling 32). The late 50 (`late50`) form 5 blocks of 10. For each
block and arm, every (configuration in the arm's stage-B top 3, w in {0.25, 0.5, 1}) is scored on ALL
earlier commits (date order below the block's first commit) by fused pool P@10 averaged over the three
seeds (per task, then per commit, then over commits). Ruling 53: the band is every candidate whose mean is
within one SE of the best candidate's mean (SE of the best candidate's per-commit values; ruling 64: on an exact
tie for the best mean, the largest SE among the tied candidates); the choice is the
smallest MODEL in the band (smaller embedding dimension, then fewer layers; w is not part of simplicity),
then the higher mean, then the lower configuration id, then the smaller w. The block is then scored with
that choice; the arm alone uses the same configuration. The same rule on all 65 commits gives the frozen
choice of item 27 (final_all65 carries its mean and SE). The builder's earlier reading (w counted as
simplicity: dim, layers, w, then id) is kept as a labelled SENSITIVITY row (`*_builder_*` tables) and never
decides a verdict.
PLACEBO (ruling 54): three pseudo-configurations p1, p2, p3 (independent hash salts), each a fixed random score
per (seed, task, candidate), with the three w, chosen by the same rule (a nine-way choice like a real arm). Its
fused tables are also written at each fixed w (`fused_w<w>_*`; the configuration chosen by the same rule among
the three pseudo-configurations at that w).
Ruling 56: only the late50 commits are assembled; the pilot set's four pilot-only commits are left out (the
report's pilot row uses the commits it shares with late50).
Ruling 58: on real stage-B output (not --test) this script refuses to run until RUNLOG.md lists, for each of
the roles in R58_ROLES, a line `sha256 <64 hex> <role> <path relative to the lane root>` whose file exists
and hashes to that value.

Outputs, per arm (E1..E5, PLACEBO) in train/selectB/<arm>/:
  choices.json                          per block: chosen (config, w), the builder's choice, the candidates' mean/SE/n
  alone_<scope>_s<seed>.tsv.gz          assembled embedding scores (late50)
  fused_<scope>_s<seed>.tsv.gz          weighted RRF of PPR, CO and the embedding score with the chosen w
  alone_builder_* / fused_builder_*     the same with the builder's reading (sensitivity only)
  fused_w0.25_* / fused_w0.5_* / fused_w1_*   PLACEBO only: fixed w
usage: python selectB.py [--test] [arms...]   (--test: PLACEBO only, writes train/selectB-test/)
"""
import os, sys, json, gzip, hashlib, collections, re
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.environ.get('EMB_ROOT') or os.path.dirname(HERE)
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(ROOT, 'eval'))
import numpy as np
import evalcore as ec
from atomic import replace_retry, retry_write  # task 2: hardened renames

SEEDS = (1, 2, 3); SCOPES = ('pool', 'unrestricted'); WS = (0.25, 0.5, 1.0)
CD = os.path.join(ROOT, 'eval', 'comparators')
TB = os.path.join(HERE, 'stageB', 'tables')
PLACEBO_CFGS = ('p1', 'p2', 'p3')
R58_ROLES = ('item27', 'heldout-driver', 'item24-adapter', 'leak-audit')


def r58_guard(runlog=None, root=None):
    """Ruling 58: refuse (exit 3) unless RUNLOG.md lists a matching sha256 line for every role."""
    runlog = runlog or os.path.join(HERE, 'RUNLOG.md'); root = root or ROOT
    seen = {}
    if os.path.exists(runlog):
        for l in open(runlog, encoding='utf-8'):
            m = re.search(r'sha256\s+([0-9a-f]{64})\s+(%s)\s+(\S+)' % '|'.join(map(re.escape, R58_ROLES)), l)
            if m: seen[m.group(2)] = (m.group(1), m.group(3))
    bad = []
    for role in R58_ROLES:
        if role not in seen: bad.append('%s: no sha256 line' % role); continue
        h, rel = seen[role]; p = os.path.join(root, rel)
        if not os.path.exists(p): bad.append('%s: %s missing' % (role, rel)); continue
        if hashlib.sha256(open(p, 'rb').read()).hexdigest() != h: bad.append('%s: %s does not hash to the RUNLOG value' % (role, rel))
    if bad:
        print('ruling 58: refusing to run on real stage-B output until RUNLOG.md lists the sha256 of the item-27 script, '
              'the held-out driver, the item-24 adapter and the leak audit script: ' + '; '.join(bad), flush=True)
        raise SystemExit(3)


def placebo(seed, tid, cands, cfg='p1'):
    return {c: int.from_bytes(hashlib.blake2b(('placebo|%s|%d|%s|%s' % (cfg, seed, tid, c)).encode(), digest_size=8).digest(), 'big') / 2.0 ** 64
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


def size(cfg):
    """Ruling 53: model size only (embedding dimension, then layers)."""
    return (float(cfg.get('embedding_dim', 0)), float(cfg.get('num_layers', 0)))


def _stats(cands_stats):
    stats = []
    for key, cfg, w, v in cands_stats:
        v = np.asarray(v, float); se = float(v.std(ddof=1) / np.sqrt(len(v))) if len(v) > 1 else 0.0
        stats.append(dict(key=key, cfg=cfg, w=w, mean=float(v.mean()), se=se, n_commits=len(v)))
    # ruling 64: on an exact tie for the best mean the band is measured from that mean with the LARGEST SE among
    # the tied candidates, so the band (and the choice) does not depend on the order the candidates are listed in;
    # `best` is that tied candidate (largest SE, then config id, then w), reported with its own SE
    top = max(s['mean'] for s in stats)
    best = min((s for s in stats if s['mean'] == top), key=lambda s: (-s['se'], s['key'][0], s['w']))
    band = [s for s in stats if s['mean'] >= top - best['se']]
    return stats, best, band


def choose(cands_stats):
    """cands_stats: [(key=(config_id, w), cfg, w, values per commit)] -> (chosen, stats, best). Ruling 53."""
    stats, best, band = _stats(cands_stats)
    pick = min(band, key=lambda s: (size(s['cfg']), -s['mean'], s['key'][0], s['w']))
    return pick, stats, best


def choose_builder(cands_stats):
    """The builder's reading before ruling 53 (w as simplicity, then name): sensitivity row only."""
    stats, best, band = _stats(cands_stats)
    pick = min(band, key=lambda s: (size(s['cfg']) + (s['w'],), s['key']))
    return pick, stats, best


def run(arms, outroot, test=False):
    if not test: r58_guard()
    tasks = ec.load_tasks()
    order = {t['commit']: t['date_order'] for t in tasks}
    late = sorted(ec.commit_set(tasks, 'late50'), key=order.get)
    pilot_only = sorted(ec.commit_set(tasks, 'late50_pilot') - set(late), key=order.get)
    blocks = [late[i:i + 10] for i in range(0, 50, 10)]
    cl = cand_lists()
    comp = {sc: {n: ec.read_score_table(os.path.join(CD, '%s_%s.tsv.gz' % (n, sc))) for n in ('PPR', 'CO')} for sc in SCOPES}
    plan = json.load(open(os.path.join(HERE, 'stageB', 'plan.json'))) if not test else None
    by_commit = collections.defaultdict(list)
    for t in tasks: by_commit[t['commit']].append(t)
    for arm in arms:
        if arm == 'PLACEBO':
            cfgs = [(p, {}) for p in PLACEBO_CFGS]
            emb = {(p, s, sc): {t['task_id']: placebo(s, t['task_id'], cl[sc].get(t['task_id'], []), p) for t in tasks}
                   for p in PLACEBO_CFGS for s in SEEDS for sc in SCOPES}
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

        def cand_rows(commits, ws=WS):
            return [((cid, w), cfg, w, per_commit_vals(cid, w, commits)) for cid, cfg in cfgs for w in ws]

        variants = {'': choose, '_builder': choose_builder}
        if arm == 'PLACEBO':
            for w in WS: variants['_w%g' % w] = (lambda rows, w=w: choose([r for r in rows if r[2] == w]))
        choices = {v: [] for v in variants}
        for bi, blk in enumerate(blocks):
            first = order[blk[0]]
            earlier = sorted([c for c in order if order[c] < first], key=order.get)
            rows = cand_rows(earlier)
            for v, fn in variants.items():
                pick, stats, best = fn(rows)
                choices[v].append(dict(block=bi + 1, commits=blk, earlier_commits=len(earlier), config_id=pick['key'][0], w=pick['w'],
                                       mean=pick['mean'], se=pick['se'],
                                       best=dict(config_id=best['key'][0], w=best['w'], mean=best['mean'], se=best['se']),
                                       candidates=[dict(config_id=s['key'][0], w=s['w'], mean=s['mean'], se=s['se']) for s in stats]))
        allc = sorted(order, key=order.get)
        rows = cand_rows(allc)
        finals = {}
        for v, fn in (('', choose), ('_builder', choose_builder)):
            pick, stats, best = fn(rows)
            finals[v] = dict(config_id=pick['key'][0], w=pick['w'], mean=pick['mean'], se=pick['se'], n_commits=pick['n_commits'],
                             best=dict(config_id=best['key'][0], w=best['w'], mean=best['mean'], se=best['se']),
                             candidates=[dict(config_id=s['key'][0], w=s['w'], mean=s['mean'], se=s['se']) for s in stats])
        finals[''].update(rule='ruling 53', note='item 27: chosen on all 65 tune commits by the same rule (used only if this arm is selected)')
        finals['_builder'].update(rule="builder's reading (sensitivity only, never decides a verdict)")
        # assemble late50 only (ruling 56)
        od = os.path.join(outroot, arm); os.makedirs(od, exist_ok=True)
        for v in variants:
            assign = {c: choices[v][bi] for bi, blk in enumerate(blocks) for c in blk}
            for s in SEEDS:
                for sc in SCOPES:
                    alone = {}; fz = {}
                    for c, ch in assign.items():
                        for t in by_commit[c]:
                            tid = t['task_id']
                            alone[tid] = emb[(ch['config_id'], s, sc)].get(tid, {})
                            fz[tid] = fused(ch['config_id'], s, sc, ch['w'], t)
                    if not v.startswith('_w'):
                        pa = os.path.join(od, 'alone%s_%s_s%d.tsv.gz' % (v, sc, s))
                        retry_write(lambda: ec.write_score_table(pa, alone), pa)
                    pf = os.path.join(od, 'fused%s_%s_s%d.tsv.gz' % (v, sc, s))
                    retry_write(lambda: ec.write_score_table(pf, fz), pf)
        tmp = os.path.join(od, 'choices.json.part')
        json.dump(dict(rule='ruling 53', blocks=choices[''], final_all65=finals[''],
                       sensitivity_builder=dict(blocks=choices['_builder'], final_all65=finals['_builder']),
                       fixed_w={v[2:]: choices[v] for v in variants if v.startswith('_w')},
                       pilot_only_commits_left_out=pilot_only, placebo_configs=list(PLACEBO_CFGS) if arm == 'PLACEBO' else None),
                  open(tmp, 'w'), indent=1)
        replace_retry(tmp, os.path.join(od, 'choices.json'))
        print(arm, 'blocks', [(c['config_id'], c['w']) for c in choices['']], 'final', (finals['']['config_id'], finals['']['w']),
              'builder', [(c['config_id'], c['w']) for c in choices['_builder']], flush=True)


if __name__ == '__main__':
    args = sys.argv[1:]
    test = '--test' in args
    arms = [a for a in args if not a.startswith('--')] or (['PLACEBO'] if test else ['E1', 'E2', 'E3', 'E4', 'E5', 'PLACEBO'])
    if test: arms = ['PLACEBO']
    run(arms, os.path.join(HERE, 'selectB-test' if test else 'selectB'), test=test)
