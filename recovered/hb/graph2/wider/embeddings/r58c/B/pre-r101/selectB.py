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
and hashes to that value, AND (release gate scoring-selection-6) a line `PASS <role> <log path relative to the
lane root>` whose log exists and holds both `sha256 <the same 64 hex>` and `RESULT PASS <role>`: a hash alone
does not show that the script passed its plumbing test on those bytes. Review finding evidence-2: the guard also
requires a line `PASS assemble-checks <log path relative to the lane root>` (written only by
orchestrator/end_of_run.sh on real output) whose log holds `assemble_checks PASS` and `sha256 <hex>` equal to the
current sha256 of orchestrator/assemble_checks.py (so a run of selectB, report or item27 needs orchestrator/ readable
at <lane root>/orchestrator). report.py and item27.py call this same guard.
Ruling 83 (MF-5): the roles also cover selectB.py and report.py themselves ('selectB', 'report'); every role's sha256
line must name the role's own file (ROLE_FILES) and its PASS line must come AFTER that sha256 line in RUNLOG.
Ruling 82 (MF-1): tables_digest is sha256 over plan.json's bytes and, for every planned (arm, config, seed), the
decompressed pool and unrestricted tables and the counts file; the PASS assemble-checks line carries it
(`PASS assemble-checks <log> tables_digest <hex>`) and it must equal both the log's and the current tables'.
Ruling 84 (MF-6): in real mode EMB_ROOT must be unset or resolve to the lane folder (the parent of the folder this
file is in); anything else is refused (exit 2) before the guard reads RUNLOG.
Release gate plan-04: before any table of a real arm is read, every (arm, configuration, seed) must have its
assembled `<base>_meta.json` (stage B writes it last, as the completion marker) with plan.json's plan_hash, and
both scope tables and the counts file; ruling 67: every runner of an E4 set must carry the WORD det=1 (the same
regex as assemble_checks.py: `(^|\\s)det=1(\\s|$)`, so `xdet=1` is refused). Else exit 4.

Outputs, per arm (E1..E5, PLACEBO) in train/selectB/<arm>/:
  choices.json                          per block: chosen (config, w), the builder's choice, the candidates' mean/SE/n
  alone_<scope>_s<seed>.tsv.gz          assembled embedding scores (late50)
  fused_<scope>_s<seed>.tsv.gz          weighted RRF of PPR, CO and the embedding score with the chosen w
  alone_builder_* / fused_builder_*     the same with the builder's reading (sensitivity only)
  fused_w0.25_* / fused_w0.5_* / fused_w1_*   PLACEBO only: fixed w
  choices.json also carries stamp (plan_hash, plan_sha256, selectB_sha256, tables_digest), test, and outputs
  {file name: sha256} of every table this script wrote for the arm (report.py verifies them).
The stamp (with the digest) is computed before any table is read and again before each arm's choices.json is
written; a difference stops the run (exit 7): the tables, plan.json or this file changed while they were read.
usage: python selectB.py [arms...]   (real; arms from E1..E5, PLACEBO; default all six; anything else: exit 2)
       python selectB.py --test      (PLACEBO only, writes train/selectB-test/; an arm or option given with --test is
                                      refused, exit 2, instead of being ignored)
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
R58_ROLES = ('item27', 'heldout-driver', 'item24-adapter', 'leak-audit', 'selectB', 'report')  # ruling 83: + selectB, report
ROLE_FILES = {'item27': 'train/item27.py', 'heldout-driver': 'train/heldout.py', 'item24-adapter': 'train/answer_level.py',
              'leak-audit': 'train/leak_audit.py', 'selectB': 'train/selectB.py', 'report': 'train/report.py'}
ARMS = ('E1', 'E2', 'E3', 'E4', 'E5', 'PLACEBO')
LANE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # this file's lane folder (tests never patch it)


def env_problems():
    """Ruling 84: [] when EMB_ROOT is unset or resolves to this file's lane folder."""
    e = os.environ.get('EMB_ROOT')
    nc = lambda p: os.path.normcase(os.path.realpath(p))
    return [] if e is None or nc(e) == nc(LANE) else ['EMB_ROOT=%s is not the lane folder %s' % (e, LANE)]


def check_env(who='selectB'):
    """Ruling 84: refuse (exit 2) a path override in real mode."""
    bad = env_problems()
    if bad:
        print('%s: refusing in real mode (ruling 84): %s' % (who, '; '.join(bad)), flush=True)
        raise SystemExit(2)
ASSEMBLE_CHECKS = 'orchestrator/assemble_checks.py'  # review finding evidence-2 (relative to the lane root)
DET = re.compile(r'(^|\s)det=1(\s|$)')  # ruling 67, the word match of assemble_checks.py (evidence-2)


def r58_guard(runlog=None, root=None):
    """Ruling 58: refuse (exit 3) unless RUNLOG.md lists a matching sha256 line for every role, and a PASS line
    naming a log that shows that role's plumbing test passed on the same bytes (scoring-selection-6)."""
    if runlog is None and root is None: check_env()  # ruling 84 (the real call; tests pass explicit paths)
    runlog = runlog or os.path.join(HERE, 'RUNLOG.md'); root = root or ROOT
    roles = '|'.join(map(re.escape, R58_ROLES))
    seen = {}; passed = {}; acd = None
    if os.path.exists(runlog):
        for i, l in enumerate(open(runlog, encoding='utf-8')):
            m = re.search(r'sha256\s+([0-9a-f]{64})\s+(%s)\s+(\S+)' % roles, l)
            if m: seen[m.group(2)] = (m.group(1), m.group(3), i)
            m = re.match(r'\s*PASS\s+(%s)\s+(\S+)\s*$' % roles, l)
            if m: passed[m.group(1)] = (m.group(2), i)
            m = re.match(r'\s*PASS\s+assemble-checks\s+(\S+)(?:\s+tables_digest\s+([0-9a-f]{64}))?\s*$', l)
            if m: passed['assemble-checks'] = (m.group(1), i); acd = m.group(2)
    bad = []
    for role in R58_ROLES:
        if role not in seen: bad.append('%s: no sha256 line' % role); continue
        h, rel, si = seen[role]; p = os.path.join(root, rel)
        if rel != ROLE_FILES[role]: bad.append('%s: its sha256 line names %s, not %s (ruling 83)' % (role, rel, ROLE_FILES[role])); continue
        if not os.path.exists(p): bad.append('%s: %s missing' % (role, rel)); continue
        if hashlib.sha256(open(p, 'rb').read()).hexdigest() != h: bad.append('%s: %s does not hash to the RUNLOG value' % (role, rel)); continue
        if role not in passed: bad.append('%s: no PASS line' % role); continue
        prel, pi = passed[role]
        if pi < si: bad.append('%s: its PASS line comes before the sha256 line of the current bytes (ruling 83)' % role); continue
        lp = os.path.join(root, prel)
        if not os.path.exists(lp): bad.append('%s: PASS log %s missing' % (role, prel)); continue
        txt = open(lp, encoding='utf-8', errors='replace').read()
        if ('sha256 %s' % h) not in txt or not re.search(r'^RESULT PASS %s\b' % re.escape(role), txt, re.M):
            bad.append('%s: PASS log %s does not show RESULT PASS on sha256 %s' % (role, prel, h[:12]))
    # evidence-2: the assembled tables passed orchestrator/assemble_checks.py (rulings 66, 67) on the current bytes
    if 'assemble-checks' not in passed: bad.append('assemble-checks: no PASS line (orchestrator/end_of_run.sh writes it)')
    else: bad += ac_problems(root, passed['assemble-checks'][0], acd)
    if bad:
        print('ruling 58/83: refusing to run on real stage-B output until RUNLOG.md lists the sha256 and a later PASS line '
              'of the item-27 script, the held-out driver, the item-24 adapter, the leak audit script, selectB.py and '
              'report.py: ' + '; '.join(bad), flush=True)
        raise SystemExit(3)


def file_sha256(p, gz=False):
    """sha256 of a file's bytes (gz: of its decompressed bytes); 'missing' when absent. A gzip that does not
    decompress raises: no digest is ever taken over an unreadable table."""
    if not os.path.exists(p): return 'missing'
    h = hashlib.sha256()
    with (gzip.open(p, 'rb') if gz else open(p, 'rb')) as f:
        for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
    return h.hexdigest()


def tables_digest(tb, plan):
    """Ruling 82 (MF-1; replaces ruling 80's digest of the _meta.json files): sha256 over '<name>\\t<sha256 or missing>\\n'
    lines in this order: 'plan.json' (the bytes of os.path.join(os.path.dirname(tb), 'plan.json')), then, for arms in
    sorted order, configs in plan order, seeds 1-3: <arm>_<cid>_s<seed>_pool.tsv.gz and _unrestricted.tsv.gz (sha256 of
    the DECOMPRESSED bytes) and _counts.json (its bytes). orchestrator/assemble_checks.py --plan prints the same digest
    (its own stdlib copy, tested equal); choices.json, tune.json and the item-27 record carry it. The signature is
    unchanged; answer_level.py and heldout.py call this function and never re-implement it."""
    h = hashlib.sha256()
    h.update(('plan.json\t%s\n' % file_sha256(os.path.join(os.path.dirname(tb), 'plan.json'))).encode())
    for arm in sorted(plan['configs']):
        for c in plan['configs'][arm]:
            for s in SEEDS:
                for suf, gz in (('_pool.tsv.gz', True), ('_unrestricted.tsv.gz', True), ('_counts.json', False)):
                    n = '%s_%s_s%d%s' % (arm, c['config_id'], s, suf)
                    h.update(('%s\t%s\n' % (n, file_sha256(os.path.join(tb, n), gz))).encode())
    return h.hexdigest()


def ac_problems(root, rel, line_digest=None):
    """evidence-2: [] when the PASS assemble-checks log <root>/<rel> shows `assemble_checks PASS`, no REFUSED line, the
    sha256 of the current <root>/orchestrator/assemble_checks.py, and `tables_digest <hex>` equal to the digest of the
    current <root>/train/stageB/tables under <root>/train/stageB/plan.json (a PASS from an earlier assembly is stale)."""
    ac = os.path.join(root, ASSEMBLE_CHECKS); lp = os.path.join(root, rel)
    if not os.path.exists(ac): return ['assemble-checks: %s missing' % ASSEMBLE_CHECKS]
    if not os.path.exists(lp): return ['assemble-checks: PASS log %s missing' % rel]
    ha = hashlib.sha256(open(ac, 'rb').read()).hexdigest()
    txt = open(lp, encoding='utf-8', errors='replace').read()
    if not re.search(r'^assemble_checks PASS\b', txt, re.M) or re.search(r'^assemble_checks REFUSED', txt, re.M) \
            or not re.search(r'^sha256 %s\b' % ha, txt, re.M):
        return ['assemble-checks: log %s does not show assemble_checks PASS on sha256 %s' % (rel, ha[:12])]
    pp = os.path.join(root, 'train', 'stageB', 'plan.json')
    if not os.path.exists(pp): return ['assemble-checks: %s missing' % pp]
    want = tables_digest(os.path.join(root, 'train', 'stageB', 'tables'), json.load(open(pp)))
    if not re.search(r'^tables_digest %s$' % want, txt, re.M):
        return ['assemble-checks: log %s does not carry the current tables digest %s (stale PASS)' % (rel, want[:12])]
    if line_digest != want:  # ruling 82: end_of_run.sh writes the digest into the PASS line itself
        return ['assemble-checks: the RUNLOG PASS line carries tables_digest %s, the current tables %s (ruling 82; stale PASS)'
                % (str(line_digest)[:12], want[:12])]
    return []


def stamp(plan, tb=None):
    """selection-freeze-7, rulings 82-83: what choices.json carries and report.py compares (plan hash, plan.json bytes,
    selectB.py bytes, ruling 82's tables digest)."""
    tb = tb or os.path.join(HERE, 'stageB', 'tables')
    return dict(plan_hash=plan['plan_hash'], plan_sha256=file_sha256(os.path.join(os.path.dirname(tb), 'plan.json')),
                selectB_sha256=file_sha256(os.path.abspath(__file__)), tables_digest=tables_digest(tb, plan))


def check_assembled(arm, cids, plan, tb=None):
    """Release gate plan-04 (and ruling 67 for E4): refuse (exit 4) unless every (config, seed) of the arm has its
    assembled _meta.json with plan.json's plan_hash, both scope tables and the counts file."""
    tb = tb or os.path.join(HERE, 'stageB', 'tables')
    bad = []
    for cid in cids:
        for s in SEEDS:
            base = os.path.join(tb, '%s_%s_s%d' % (arm, cid, s)); mp = base + '_meta.json'
            if not os.path.exists(mp): bad.append('%s: _meta.json missing (set not assembled or incomplete)' % os.path.basename(base)); continue
            try:
                meta = json.load(open(mp))
            except ValueError:
                bad.append('%s: _meta.json does not parse' % os.path.basename(base)); continue
            if meta.get('plan_hash') != plan.get('plan_hash'):
                bad.append('%s: plan_hash %s != plan.json %s' % (os.path.basename(base), meta.get('plan_hash'), plan.get('plan_hash'))); continue
            miss = [p for p in ['%s_%s.tsv.gz' % (base, sc) for sc in SCOPES] + [base + '_counts.json'] if not os.path.exists(p)]
            if miss: bad.append('%s: missing %s' % (os.path.basename(base), ', '.join(os.path.basename(p) for p in miss))); continue
            if arm == 'E4':
                runners = meta.get('runners') or []
                if not runners or not all(DET.search(str((r or {}).get('runner', ''))) for r in runners):
                    bad.append('%s: an E4 part without det=1 in its runner (ruling 67): %s' % (os.path.basename(base), runners))
    if bad:
        print('plan-04: refusing to read %s: %s' % (arm, '; '.join(bad)), flush=True)
        raise SystemExit(4)


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
    tb = os.path.join(HERE, 'stageB', 'tables')  # HERE read at call time (tests point it elsewhere)
    st0 = stamp(plan, tb) if plan else None  # ruling 82: the digest of the tables about to be read
    by_commit = collections.defaultdict(list)
    for t in tasks: by_commit[t['commit']].append(t)
    for arm in arms:
        if arm == 'PLACEBO':
            cfgs = [(p, {}) for p in PLACEBO_CFGS]
            emb = {(p, s, sc): {t['task_id']: placebo(s, t['task_id'], cl[sc].get(t['task_id'], []), p) for t in tasks}
                   for p in PLACEBO_CFGS for s in SEEDS for sc in SCOPES}
        else:
            cfgs = [(c['config_id'], c['cfg']) for c in plan['configs'][arm]]
            check_assembled(arm, [cid for cid, _ in cfgs], plan, tb)  # release gate plan-04, ruling 67
            emb = {(cid, s, sc): ec.read_score_table(os.path.join(tb, '%s_%s_s%d_%s.tsv.gz' % (arm, cid, s, sc)))
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
        st1 = stamp(plan, tb) if plan else None
        if st1 != st0:  # ruling 82: the tables, plan.json or this file changed while they were read
            print('selectB: refusing (exit 7): the stamp changed during the run: %s -> %s' % (st0, st1), flush=True)
            raise SystemExit(7)
        outs = sorted(f for f in os.listdir(od) if f.endswith('.tsv.gz'))
        tmp = os.path.join(od, 'choices.json.part')
        json.dump(dict(rule='ruling 53', stamp=st0, test=bool(test), outputs={f: file_sha256(os.path.join(od, f)) for f in outs},
                       blocks=choices[''], final_all65=finals[''],
                       sensitivity_builder=dict(blocks=choices['_builder'], final_all65=finals['_builder']),
                       fixed_w={v[2:]: choices[v] for v in variants if v.startswith('_w')},
                       pilot_only_commits_left_out=pilot_only, placebo_configs=list(PLACEBO_CFGS) if arm == 'PLACEBO' else None),
                  open(tmp, 'w'), indent=1)
        replace_retry(tmp, os.path.join(od, 'choices.json'))
        print(arm, 'blocks', [(c['config_id'], c['w']) for c in choices['']], 'final', (finals['']['config_id'], finals['']['w']),
              'builder', [(c['config_id'], c['w']) for c in choices['_builder']], flush=True)


def parse_args(args):
    """-> (arms, test). --test runs PLACEBO only and refuses anything given with it (exit 2); real mode takes arms
    from ARMS only (exit 2 on an unknown arm or option)."""
    test = '--test' in args
    rest = [a for a in args if a != '--test']
    if test and rest:
        print('selectB --test: refusing (exit 2): --test runs PLACEBO only and takes nothing else; given %s' % rest, flush=True)
        raise SystemExit(2)
    bad = [a for a in rest if a not in ARMS]
    if bad:
        print('selectB: refusing (exit 2): unknown arm or option %s (arms: %s)' % (bad, ', '.join(ARMS)), flush=True)
        raise SystemExit(2)
    return (['PLACEBO'] if test else (rest or list(ARMS))), test


if __name__ == '__main__':
    arms, test = parse_args(sys.argv[1:])
    run(arms, os.path.join(HERE, 'selectB-test' if test else 'selectB'), test=test)
