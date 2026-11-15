"""answer_level.py: the item-24 adapter (addendum 8 item 24, ruling 58), Python side; node does the packing.

Each arm's UNRESTRICTED ranked list (evalcore.rank over the task's unrestricted candidates: scored first by score,
ties and unscored in the fixed random order) is handed to the shared packer through answer_level.js, with the
frozen typed primary's options read from its record (results/frozen/relational/95e990307da3b42b.json:
granularity file, form signature, pad none; budgets 2,000 / 4,000 / 8,000 / 16,000; primary = recall within
8,000 tokens). Covered: every arm alone and fused (E1..E5 from selectB/), PLACEBO alone and fused, RRF, PPR, CO and
DIR (eval/comparators).
Ruling 71: item 24 on the TUNING split is scored by the GRADER with the full references (files and definitions),
exactly as on held-out. So `tune` writes a hand-off folder <out>/handoff/ in heldout.py's form: HANDOFF.json (the
manifest: split, tasks, seeds, variants with their source tables, options, packs, note, sha256 of every file),
tasks.jsonl (build/tasks rows: id, parent, seed; no truth), ranked/<variant>_unrestricted.jsonl.gz and
answers/<variant>.jsonl.gz. No truth key and no reference file is written there (checked before HANDOFF.json is
written; exit 9 otherwise). The lane computes NO item-24 figure.
Kept, under its own label only: "file recall within 8,000 tokens, lane-computed" (<out>/lane_file_recall/), scored
by score.js (rule "content") against git's files of tune_tasks.jsonl's truth with defs empty; aggregated as item 23
(per seed, the mean of the three seeds per task, per commit, over commits; paired bootstrap by commit against RRF,
10,000 resamples, 95 % percentile intervals). It is never item 24's measure.
Guards: this file refuses to run unless answer_level.js hashes to JS_SHA256, and every shared file the record
lists (common/*.js) exists and hashes to the frozen record's value (import, never edit; answer-level-5: a missing
listed file is a refusal, exit 7). A ranked path with no file node in the facts graph is a refusal, both in tune and
in pack (answer-level-3, exit 11). tune refuses unless all 40 variants' tables exist (4 comparators + 6 arms x
alone/fused x 3 seeds; answer-level-4, exit 10) and every task row is set T1 (answer-level-7).
Naming (answer-level-6, one scheme for both splits, train/HANDOFF-FORMAT.md): <ARM>_<alone|fused>_s<seed> and the
comparators by name; HANDOFF.json lists every variant with explicit label and seed fields, and the lane's own
aggregation reads label and seed from that list, never by parsing a name.
Version 2 of the hand-off (train/HANDOFF-FORMAT.md v2, orchestrator/grader-interface-v2.md): the tuning hand-off also
carries ranked/<variant>_pool.jsonl.gz for all 40 variants (ruling 88b), names train/report/tune.json as the 1e-9
cross-check target with the truth rule (HANDOFF.json cross_check), lists each arm variant's seed-mean row
<ARM>_<KIND>_mean, and keeps the test flag; the lane's own labels use the same _mean names (per seed: s1, s2, s3).
MF-13 (ALH-5): before any table is read, every arm's selectB choices.json must carry a stamp whose plan_hash equals
plan.json's and whose tables_digest equals selectB.tables_digest(<stage-B tables>, plan) computed now (exit 12); a
late-50 task missing from a table that scores every candidate by construction (every fused table, RRF, PPR, DIR) is
refused (exit 12). Ruling 91: a task may be absent from CO only when the comparator's own scoring of its candidates
(evalcore.co_scores over the candidate file) gives no co-change candidate, and from an arm alone only when the stage-B
counts file of the config that scored its commit's block (<arm>_<cid>_s<seed>_counts.json) shows no scored candidate
(cands - cands_unscored == 0); otherwise exit 12. Such a task is ranked by the fixed tie-break alone. HANDOFF.json and
answer_level.json carry absent_tasks = {variant: {pool: n, unrestricted: n}} for every variant (0 included).
answer_level.json carries test, plan_hash and tables_digest.
MF-6 / ruling 84 (real mode): EMB_ROOT must resolve to the lane folder (the parent of train/), and every other
environment override of an input or output path (REAL_ENV_REFUSED, GT_TASKS included) is refused (exit 2); GT_TMP
(scratch for the node child) is the one path variable allowed. The real run takes no option.
usage:
  python answer_level.py tune                                   (the real run: train/selectB -> train/report/answer_level)
  python answer_level.py tune --test --sel S --out O --tables T --plan P [--test-set pick8|late50 | --task-ids T1-0001,...]
                            [--arms E1,...] [--B N]
  python answer_level.py pack --ranked <ranked.jsonl.gz> --tasks <tasks.jsonl> --out <answers.jsonl.gz>  (heldout.py)
env (test mode only): GT_COMMON (shared code), GT_PRIMARY (frozen record), GT_TASKS (build/tasks/tasks.jsonl),
GT_FACTS_CACHE, GT_SRCSTORE (paths.js); GT_TMP in both modes.
"""
import os, sys, json, gzip, hashlib, subprocess, collections, shutil, datetime
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.environ.get('EMB_ROOT') or os.path.dirname(HERE)
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(ROOT, 'eval'))
import numpy as np
import evalcore as ec

JS = os.path.join(HERE, 'answer_level.js')
JS_SHA256 = '0d346e665ba24323505958c8f3f6ec30bdf09978bf969900d9cf3aebfae13f7a'
BUILD = os.path.normpath(os.path.join(ROOT, '..', '..', 'build'))
COMMON = os.environ.get('GT_COMMON') or os.path.join(BUILD, 'arms', 'common')
PRIMARY = os.environ.get('GT_PRIMARY') or os.path.join(BUILD, 'results', 'frozen', 'relational', '95e990307da3b42b.json')
TASKS = os.environ.get('GT_TASKS') or os.path.join(BUILD, 'tasks', 'tasks.jsonl')
SEEDS = (1, 2, 3)
SCOPES = ('pool', 'unrestricted')
COMPARATORS = ('RRF', 'PPR', 'CO', 'DIR')
MEASURES = ('primary', 'r2000', 'r4000', 'r16000', 'file_r10', 'mrr')
LANE_LABEL = "file recall within 8,000 tokens, lane-computed (not item 24's measure; ruling 71)"
TRUTH_KEYS = ('truth', 'refs', 'references', 'defs', 'definitions', 'files', 'commit', 'gold')  # never a key in a hand-off row
ARMS = ('E1', 'E2', 'E3', 'E4', 'E5', 'PLACEBO')
FORMAT = 'train/HANDOFF-FORMAT.md version 2'
# ruling 84 / MF-6: environment overrides of an input or output path refused in real mode (GT_TMP is scratch, allowed)
REAL_ENV_REFUSED = ('GT_COMMON', 'GT_PRIMARY', 'GT_TASKS', 'GT_FACTS_CACHE', 'GT_SRCSTORE', 'GT_BUILD', 'GT_RESULTS', 'GT_STORE',
                    'GT_REPO', 'STAGEB_PROGRESS')
REAL_DIRS = ('stageB', 'selectB', 'heldout', 'report')
COMPLETE_TABLES = ('RRF', 'PPR', 'DIR')  # comparators that score every candidate by construction (CO does not)
COMP_DIR = os.path.join(ROOT, 'eval', 'comparators')  # the comparator tables and candidate files (a test may point a module copy elsewhere)


def env_problems():
    """Ruling 84 (MF-6): [] when EMB_ROOT is unset or resolves to the lane folder (the parent of train/) and no other
    environment variable overrides an input or output path."""
    bad = []
    er = os.environ.get('EMB_ROOT')
    lane = os.path.normcase(os.path.realpath(os.path.dirname(HERE)))
    if er and os.path.normcase(os.path.realpath(er)) != lane: bad.append('EMB_ROOT %s is not the lane folder %s' % (er, lane))
    bad += ['%s is set (%s)' % (k, os.environ[k]) for k in REAL_ENV_REFUSED if (os.environ.get(k) or '').strip()]
    return bad


def under_real(path):
    """The real train/<stageB|selectB|heldout|report> folder that `path` is, or lies under (None otherwise)."""
    ap = os.path.normcase(os.path.realpath(os.path.abspath(path)))
    for d in REAL_DIRS:
        r = os.path.normcase(os.path.realpath(os.path.join(HERE, d)))
        if ap == r or ap.startswith(r + os.sep): return 'train/' + d
    return None


def truth_keys(folder):
    """Ruling 71: [(file, problem)] for any reference-like file or any JSON row (gzip or plain) with a truth key."""
    out = []
    for dp, dn, fn in os.walk(folder):
        for f in fn:
            p = os.path.join(dp, f)
            if f == 'HANDOFF.json': continue  # the manifest (its 'files' key is the sha256 list); checked by the test
            if 'ref' in f.lower() or 'truth' in f.lower(): out.append((f, 'reference-like file name')); continue
            if not f.endswith(('.jsonl', '.jsonl.gz', '.json')): continue
            op = gzip.open if f.endswith('.gz') else open
            with op(p, 'rt', encoding='utf-8') as fh:
                txt = fh.read()
            rows = [json.loads(l) for l in txt.splitlines() if l.strip()] if '.jsonl' in f else [json.loads(txt)]
            for r in rows:
                if isinstance(r, dict):
                    bad = sorted(set(r) & set(TRUTH_KEYS))
                    if bad: out.append((f, bad)); break
    return out


def split_by(src, key, path_of):
    """One gzip JSONL per value of row[key] (heldout.py's per-variant layout)."""
    outs = {}
    try:
        with gzip.open(src, 'rt', encoding='utf-8') as f:
            for l in f:
                if not l.strip(): continue
                v = json.loads(l)[key]
                if v not in outs:
                    p = path_of(v); os.makedirs(os.path.dirname(p), exist_ok=True)
                    outs[v] = (p, gzip.open(p + '.part', 'wt', encoding='utf-8'))
                outs[v][1].write(l if l.endswith('\n') else l + '\n')
    finally:
        for p, fh in outs.values(): fh.close()
    for p, fh in outs.values(): os.replace(p + '.part', p)
    return sorted(outs)


def sha256_file(p):
    return hashlib.sha256(open(p, 'rb').read()).hexdigest()


def check_code():
    """Refuse (exit 7) unless the node side and the shared answer code are the bytes this adapter was tested with."""
    bad = []
    if sha256_file(JS) != JS_SHA256: bad.append('answer_level.js hashes to %s, not %s' % (sha256_file(JS)[:12], JS_SHA256[:12]))
    rec = json.load(open(PRIMARY))
    if rec.get('hash') != '95e990307da3b42b' or rec.get('role') != 'primary': bad.append('the record is not the typed primary 95e990307da3b42b')
    for rel, h in sorted(rec.get('code_files', {}).items()):
        if not rel.startswith('common/'): continue
        p = os.path.join(COMMON, rel[len('common/'):])
        if not os.path.exists(p): bad.append('%s is missing under %s' % (rel, COMMON))  # answer-level-5
        elif sha256_file(p) != h: bad.append('%s differs from the frozen record' % rel)
    for need in ('packer.js', 'score.js', 'harness.js', 'config.js', 'facts.js', 'seed.js', 'tokenizer.js'):
        if 'common/' + need not in rec.get('code_files', {}): bad.append('the record does not list common/' + need)
    if bad:
        print('item-24 adapter: refusing: ' + '; '.join(bad), flush=True)
        raise SystemExit(7)
    return rec


def node(*args):
    env = dict(os.environ, GT_COMMON=COMMON)
    p = subprocess.run(['node', JS] + list(args), capture_output=True, text=True, env=env)
    if p.returncode != 0: raise RuntimeError('answer_level.js %s failed: %s' % (args[0], (p.stderr or p.stdout)[-2000:]))
    return json.loads(p.stdout.strip().splitlines()[-1])


def write_ranked(path, rows):
    """rows: [(variant, task_id, [paths])] -> gzip JSONL (.part then rename)."""
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with gzip.open(path + '.part', 'wt', encoding='utf-8') as f:
        for v, tid, r in rows: f.write(json.dumps(dict(id=tid, variant=v, ranked=r)) + '\n')
    os.replace(path + '.part', path)


def no_dropped(pk, where):
    """answer-level-3: a ranked path with no file node would be dropped from the pack (every later item moves up)."""
    if pk.get('ranked_paths_without_file_node', 0) != 0:
        print('item-24 adapter: refusing (exit 11): %s: %s ranked path(s) have no file node in the facts graph (e.g. %s)'
              % (where, pk.get('ranked_paths_without_file_node'), json.dumps(pk.get('sample'))[:200]), flush=True)
        raise SystemExit(11)
    return pk


def pack(ranked, tasks_file, out):
    check_code()
    return no_dropped(node('pack', '--ranked', ranked, '--tasks', tasks_file, '--primary', PRIMARY, '--out', out), ranked)


def aggregate(per, tasks, commits, B=10000):
    """per: {(label, seed or None, task_id): {measure: value}} -> item-23 aggregation per label (seed-averaged per
    task, then per commit, then over commits) and paired bootstrap against RRF by commit."""
    by_commit = collections.defaultdict(list)
    scored = {k[2] for k in per}  # only the tasks that were packed and scored (a subset run leaves a commit's other tasks out)
    for t in tasks:
        if t['commit'] in commits and t['task_id'] in scored: by_commit[t['commit']].append(t['task_id'])
    order = {t['commit']: t['date_order'] for t in tasks}
    cs = sorted(by_commit, key=order.get)
    labels = sorted({k[0] for k in per})
    out = {}

    def per_commit(label, seed='mean'):
        rows = []
        for c in cs:
            vals = []
            for tid in by_commit[c]:
                if seed == 'mean':
                    ss = [per[k] for k in ((label, s, tid) for s in SEEDS) if k in per] or [per[(label, None, tid)]]
                    vals.append([float(np.mean([x[m] for x in ss])) for m in MEASURES])
                else:
                    vals.append([per[(label, seed, tid)][m] for m in MEASURES])
            rows.append(np.mean(vals, axis=0))
        return np.array(rows)
    base = per_commit('RRF')
    for lab in labels:
        a = per_commit(lab); seeded = any(k[0] == lab and k[1] is not None for k in per)
        d = dict(commits=len(cs), mean={m: float(a[:, i].mean()) for i, m in enumerate(MEASURES)})
        if seeded:
            d['per_seed_primary'] = {'s%d' % s: float(per_commit(lab, s)[:, 0].mean()) for s in SEEDS}
        if lab != 'RRF':
            mean, lo, hi, p = ec.bootstrap(a - base, B=B)
            d['vs_RRF'] = {m: dict(diff=float(mean[i]), lo=float(lo[i]), hi=float(hi[i]), p=float(p[i])) for i, m in enumerate(MEASURES)}
        out[lab + '_mean' if seeded else lab] = d  # interface v2 item 1: <ARM>_<KIND>_mean, comparators bare
    return out


def refuse(code, msg):
    print('item-24 adapter: refusing (exit %d): %s' % (code, msg), flush=True)
    raise SystemExit(code)


def check_stamps(sel, arms, tables, plan):
    """MF-13 (ALH-5, ruling 82): every arm's choices.json stamp names this plan and the digest of the stage-B tables as
    they are now (selectB.tables_digest, never re-implemented here). Returns (plan_hash, tables_digest); exit 12."""
    import selectB
    td = selectB.tables_digest(tables, plan); bad = []
    for arm in arms:
        cj = os.path.join(sel, arm, 'choices.json')
        try: st = json.load(open(cj)).get('stamp')
        except Exception as e: bad.append('%s: choices.json unreadable (%s)' % (arm, e.__class__.__name__)); continue
        if not isinstance(st, dict): bad.append('%s: choices.json has no stamp' % arm); continue
        if st.get('plan_hash') != plan.get('plan_hash'): bad.append('%s: stamp plan_hash %s, plan %s' % (arm, str(st.get('plan_hash'))[:12], str(plan.get('plan_hash'))[:12]))
        if st.get('tables_digest') != td: bad.append('%s: stamp tables_digest %s, the tables now %s' % (arm, str(st.get('tables_digest'))[:12], td[:12]))
    if bad: refuse(12, 'selectB choices do not match the stage-B tables or plan (MF-13, ruling 82): %s' % '; '.join(bad))
    return plan.get('plan_hash'), td


TEST_SETS = ('pick8', 'late50')  # the grader's two fixed test task sets (coordinator, 2026-11-14)
PICK8_POSITIONS = (0, 6, 12, 18, 24, 30, 36, 42)


def test_set_ids(name):
    """The task ids of a named test set, from eval/tune_commits.jsonl: the late-50 tuning commits sorted by date_order;
    'pick8' keeps positions 0, 6, ..., 42 (0-based; 8 commits, 37 tasks), 'late50' keeps all 50 (313 tasks)."""
    if name not in TEST_SETS: refuse(2, 'unknown test set %r (one of %s)' % (name, list(TEST_SETS)))
    cs = [json.loads(l) for l in open(os.path.join(ROOT, 'eval', 'tune_commits.jsonl')) if l.strip()]
    late = sorted((c for c in cs if c['late50']), key=lambda c: c['date_order'])
    pick = late if name == 'late50' else [late[i] for i in PICK8_POSITIONS]
    return sorted(t for c in pick for t in c['task_ids'])


def tune(sel, outdir, task_ids=None, B=10000, test=None, arms=None, tables=None, plan=None, test_set=None):
    if test_set is not None:
        if task_ids: refuse(2, 'give a test set or task ids, not both')
        task_ids = set(test_set_ids(test_set)); test = True if test is None else test
    test = bool(task_ids) if test is None else bool(test)
    if not test:  # ruling 84 / MF-6, ruling 80: the real run reads and writes the lane's own folders only
        bad = env_problems()
        if bad: refuse(2, 'real mode: ' + '; '.join(bad))
        want = dict(sel=os.path.join(HERE, 'selectB'), out=os.path.join(HERE, 'report', 'answer_level'))
        for k, v in (('sel', sel), ('out', outdir)):
            if v is not None and os.path.normcase(os.path.realpath(v)) != os.path.normcase(os.path.realpath(want[k])):
                refuse(2, 'real mode: --%s %s is not %s' % (k, v, want[k]))
        if task_ids or test_set or arms is not None or tables is not None or plan is not None: refuse(2, 'real mode: task ids, test set, arms, tables and plan are fixed')
        sel, outdir = want['sel'], want['out']
        arms, tables, plan = ARMS, os.path.join(HERE, 'stageB', 'tables'), os.path.join(HERE, 'stageB', 'plan.json')
    else:
        miss = [k for k, v in (('sel', sel), ('out', outdir), ('tables', tables), ('plan', plan)) if not v]
        if miss: refuse(2, '--test needs explicit %s' % miss)
        real = [(k, under_real(v)) for k, v in (('sel', sel), ('out', outdir), ('tables', tables), ('plan', plan)) if under_real(v)]
        if real: refuse(2, '--test path(s) in the real folders %s (ruling 80)' % real)
        arms = tuple(arms) if arms else ARMS
        if any(a not in ARMS for a in arms): refuse(2, 'unknown arm(s) %s' % [a for a in arms if a not in ARMS])
    planj = json.load(open(plan))
    plan_hash, tdig = check_stamps(sel, arms, tables, planj)
    rec = check_code()
    os.makedirs(outdir, exist_ok=True)
    tasks = ec.load_tasks()
    late = ec.commit_set(tasks, 'late50')
    sub = [t for t in tasks if t['commit'] in late and (not task_ids or t['task_id'] in task_ids)]
    commits = {t['commit'] for t in sub}
    ids = {t['task_id'] for t in sub}
    cand = {}
    for sc in SCOPES:
        cand[sc] = {}
        with gzip.open(os.path.join(COMP_DIR, 'candidates_%s.tsv.gz' % sc), 'rt') as f:
            next(f)
            for l in f:
                tid, c, _ = l.rstrip('\n').split('\t')
                if tid in ids: cand[sc].setdefault(tid, []).append(c)
    # build/tasks rows (seed path + symbol) for exactly these ids; parents and seed paths must agree with tune_tasks
    bt = {}
    for l in open(TASKS):
        r = json.loads(l)
        if r['id'] in ids: bt[r['id']] = r
    for t in sub:
        r = bt[t['task_id']]
        assert r['set'] == 'T1' and r['split'] == 'tune' and r['parent'] == t['parent'] and r['seed']['path'] == t['seed'], ('task rows disagree', t['task_id'])
    HO = os.path.join(outdir, 'handoff'); LF = os.path.join(outdir, 'lane_file_recall'); WK = os.path.join(outdir, 'work')
    for d in (HO, LF, WK):
        if os.path.isdir(d): shutil.rmtree(d)
        os.makedirs(d)
    tf = os.path.join(HO, 'tasks.jsonl')
    with open(tf, 'w') as f:
        for t in sub: f.write(json.dumps(bt[t['task_id']]) + '\n')
    variants = []  # (label, seed or None, {scope: table path})
    for n in COMPARATORS:
        variants.append((n, None, {sc: os.path.join(COMP_DIR, '%s_%s.tsv.gz' % (n, sc)) for sc in SCOPES}))
    missing = []
    for arm in arms:
        for kind in ('alone', 'fused'):
            for s in SEEDS:
                ps = {sc: os.path.join(sel, arm, '%s_%s_s%d.tsv.gz' % (kind, sc, s)) for sc in SCOPES}
                miss = [os.path.relpath(p, sel) for p in ps.values() if not os.path.exists(p)]
                if miss: missing += miss
                else: variants.append(('%s_%s' % (arm, kind), s, ps))
    if missing or len(variants) != len(COMPARATORS) + len(arms) * 2 * len(SEEDS):  # answer-level-4: 40 variants (both scopes), none skipped
        refuse(10, '%d variant(s), %d table(s) missing: %s' % (len(variants), len(missing), missing[:4]))
    vname = lambda lab, s: lab if s is None else '%s_s%d' % (lab, s)  # answer-level-6: the held-out naming
    mrow = lambda lab, s: lab if s is None else '%s_mean' % lab  # interface v2 item 1: the seed-mean row
    vmap = {vname(lab, s): (lab, s) for lab, s, _ in variants}
    rows = {sc: [] for sc in SCOPES}; absent = {}; holes = []
    byid = {t['task_id']: t for t in sub}
    blocks = {}  # ruling 91: the config that scored each commit's block, per arm (choices.json blocks, selectB's late-50 assembly)
    for arm in arms:
        blocks[arm] = {c: b['config_id'] for b in (json.load(open(os.path.join(sel, arm, 'choices.json'))).get('blocks') or []) for c in b.get('commits', [])}
    counts = {}
    def scored_in_counts(arm, s, tid, sc):
        cid = blocks.get(arm, {}).get(byid[tid]['commit'])
        if cid is None: return None, 'no block of choices.json holds its commit'
        p = os.path.join(tables, '%s_%s_s%d_counts.json' % (arm, cid, s))
        if p not in counts: counts[p] = json.load(open(p)) if os.path.exists(p) else None
        if counts[p] is None: return None, '%s missing' % os.path.basename(p)
        e = (counts[p].get(tid) or {}).get(sc)
        if not isinstance(e, dict) or not isinstance(e.get('cands'), int) or not isinstance(e.get('cands_unscored'), int):
            return None, '%s has no %s count for it' % (os.path.basename(p), sc)
        return e['cands'] - e['cands_unscored'], os.path.basename(p)
    for lab, s, ps in variants:
        for sc in SCOPES:
            T = ec.read_score_table(ps[sc])
            gone = sorted(t['task_id'] for t in sub if t['task_id'] not in T)  # MF-13: a late-50 task missing from the table
            absent.setdefault(vname(lab, s), {})[sc] = len(gone)
            for t in sub: rows[sc].append((vname(lab, s), t['task_id'], ec.rank(t['task_id'], cand[sc][t['task_id']], T.get(t['task_id'], {}))))
            if not gone: continue
            if lab.endswith('_fused') or lab in COMPLETE_TABLES:
                holes.append('%s %s: %d task(s), e.g. %s' % (vname(lab, s), sc, len(gone), gone[0])); continue
            for tid in gone:  # ruling 91: absent only where the method scored no candidate
                if lab == 'CO':
                    co = ec.co_scores(byid[tid], cand[sc].get(tid, []))
                    if co: holes.append('CO %s: %s absent, but the comparator scores %d co-change candidate(s) for it' % (sc, tid, len(co)))
                else:
                    n, why = scored_in_counts(lab.split('_')[0], s, tid, sc)
                    if n is None: holes.append('%s %s: %s absent and no counts show it unscored (%s)' % (vname(lab, s), sc, tid, why))
                    elif n > 0: holes.append('%s %s: %s absent although %s shows %d scored candidate(s)' % (vname(lab, s), sc, tid, why, n))
    if holes: refuse(12, 'late-50 task(s) missing from a table that scores every candidate, or absent though scored (MF-13, ruling 91): %d: %s'
                     % (len(holes), '; '.join(holes)))
    rk = {sc: os.path.join(WK, 'ranked_%s.jsonl.gz' % sc) for sc in SCOPES}
    for sc in SCOPES: write_ranked(rk[sc], rows[sc])
    ans = os.path.join(WK, 'answers.jsonl.gz')
    pk = no_dropped(node('pack', '--ranked', rk['unrestricted'], '--tasks', tf, '--primary', PRIMARY, '--out', ans), 'tune')
    # ruling 71 / 88b: the grader's hand-off, both scopes' ranked lists and one pack file per variant (heldout.py's layout)
    for sc in SCOPES: split_by(rk[sc], 'variant', lambda v, sc=sc: os.path.join(HO, 'ranked', '%s_%s.jsonl.gz' % (v, sc)))
    split_by(ans, 'arm', lambda v: os.path.join(HO, 'answers', '%s.jsonl.gz' % v))
    found = truth_keys(HO)
    if found:
        print('item-24 adapter: refusing: the hand-off holds truth keys or reference files: %s' % found[:5], flush=True)
        raise SystemExit(9)
    files = {}
    for dp, dn, fn in os.walk(HO):
        for f in sorted(fn):
            q = os.path.join(dp, f); files[os.path.relpath(q, HO).replace(os.sep, '/')] = sha256_file(q)
    rel = lambda p: os.path.relpath(p, ROOT).replace(os.sep, '/')
    vlist = [dict(variant=vname(lab, s), name=vname(lab, s), label=lab, mean_row=mrow(lab, s), seed=s, arm=lab.split('_')[0],
                  kind=('comparator' if s is None else lab.split('_')[1]),
                  source=rel(ps['unrestricted']), source_sha256=sha256_file(ps['unrestricted']),
                  pool_source=rel(ps['pool']), pool_source_sha256=sha256_file(ps['pool'])) for lab, s, ps in variants]
    tt = os.path.join(ROOT, 'eval', 'tune_tasks.jsonl')
    cross = dict(target='train/report/tune.json', set='late50', scopes=list(SCOPES), metrics=list(ec.METRICS), tolerance=1e-9,
                 paths={'<ARM>_<KIND>_mean': 'arms.late50.<scope>.<ARM>_<KIND>.seed_mean.<metric>',
                        '<ARM>_<KIND>_s<k>': 'arms.late50.<scope>.<ARM>_<KIND>.per_seed.<k>.<metric>',
                        '<COMPARATOR>': 'comparators.late50.<scope>.<COMPARATOR>.<metric>'},
                 truth_rule="item 4: the commit's other modified (not added) code files per evalcore.CODE; the lane's tuning truth is "
                            "the truth field of eval/tune_tasks.jsonl (none of it is in this folder)",
                 lane_truth_file='eval/tune_tasks.jsonl', lane_truth_sha256=sha256_file(tt) if os.path.exists(tt) else None)
    hand = dict(format=FORMAT, written=datetime.datetime.utcnow().isoformat() + 'Z', item=24, split='tune', set='T1', tasks=len(sub), commits=len(commits),
                seeds=list(SEEDS), variants=vlist, mean_rows=sorted({mrow(lab, s) for lab, s, _ in variants if s is not None}), task_file='tasks.jsonl',
                options=dict(record='%s.json' % rec['hash'], granularity='file', form='signature', pad='none', budgets=[2000, 4000, 8000, 16000], primary_budget=8000),
                packs=pk, cross_check=cross, plan_hash=plan_hash, tables_digest=tdig, test=test, absent_tasks=absent, test_set=test_set,
                note='ranked lists (pool and unrestricted) and packs (frozen typed primary options, 8,000-token primary) only; no item-24 figure '
                     'was computed here; the grader scores these packs with its full references (files and definitions), exactly as '
                     'on held-out (ruling 71). No truth key and no reference file is in this folder.',
                truth_keys_checked=list(TRUTH_KEYS), files=files)
    hp = os.path.join(HO, 'HANDOFF.json')
    json.dump(hand, open(hp, 'w'), indent=1, sort_keys=True)
    # the lane's own figure, under its own label (never item 24's measure)
    rf = os.path.join(WK, 'tune_refs.jsonl')  # in the work folder, removed below: no truth file stays under train/ (the held-out container mounts train/)
    pt = os.path.join(LF, 'per_task.jsonl')
    try:  # ALH-4: the work folder (tune truth) is removed even when scoring fails
        with open(rf, 'w') as f:
            for t in sub: f.write(json.dumps(dict(id=t['task_id'], set='T1', split='tune', commit=t['commit'], files=t['truth'], defs=[])) + '\n')
        sk = node('score', '--answers', ans, '--refs', rf, '--out', pt)
    finally:
        shutil.rmtree(WK, ignore_errors=True)
    per = {}
    for l in open(pt):
        r = json.loads(l)
        lab, s = vmap[r['arm']]  # answer-level-6: label and seed from the variant list, not parsed from the name
        per[(lab, s, r['id'])] = {m: (r[m] if r[m] is not None else 0.0) for m in MEASURES}
    res = dict(item=24, budget_tokens=8000, options=dict(record='%s.json' % rec['hash'], granularity='file', form='signature', pad='none'),
               tasks=len(sub), commits=len(commits), variants=len(variants), packed=pk, test=test, plan_hash=plan_hash, tables_digest=tdig,
               format=FORMAT, absent_tasks=absent,
               item24=dict(measure='scored by the grader with its full references (files and definitions), as on held-out (ruling 71)',
                           status='packs handed to the grader; no item-24 figure computed by the lane',
                           handoff='handoff/HANDOFF.json', handoff_sha256=sha256_file(hp), files=len(files)),
               lane_file_recall=dict(label=LANE_LABEL, scored=sk,
                                     refs='tune truth from git (files of the commit other than the seed, existing at the parent); defs empty',
                                     labels=aggregate(per, tasks, commits, B=B)))
    json.dump(res, open(os.path.join(outdir, 'answer_level.json'), 'w'), indent=1, sort_keys=True)
    return res


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    argv = sys.argv[2:]; test = '--test' in argv; argv = [x for x in argv if x != '--test']
    if len(argv) % 2 or any(not k.startswith('--') for k in argv[::2]): refuse(2, 'options come in --key value pairs')
    a = dict(zip(argv[::2], argv[1::2]))
    if cmd == 'tune':
        known = ('--sel', '--out', '--tables', '--plan', '--task-ids', '--test-set', '--arms', '--B')
        if any(k not in known for k in a): refuse(2, 'unknown option(s) %s' % [k for k in a if k not in known])
        if not test and a: refuse(2, 'the real run takes no option (ruling 80); given %s' % sorted(a))
        ids = set(a['--task-ids'].split(',')) if a.get('--task-ids') else None
        r = tune(a.get('--sel'), a.get('--out'), ids, int(a.get('--B', 10000)), test=test,
                 arms=a['--arms'].split(',') if a.get('--arms') else None, tables=a.get('--tables'), plan=a.get('--plan'),
                 test_set=a.get('--test-set'))
        print(json.dumps({k: v for k, v in r.items() if k != 'lane_file_recall'}), flush=True)
        print('item 24: %s (%s)' % (r['item24']['status'], r['item24']['handoff']), flush=True)
        for lab, d in sorted(r['lane_file_recall']['labels'].items()):
            print(LANE_LABEL, lab, '%.4f' % d['mean']['primary'],
                  ('vs RRF %+.4f [%+.4f, %+.4f]' % (d['vs_RRF']['primary']['diff'], d['vs_RRF']['primary']['lo'], d['vs_RRF']['primary']['hi'])) if 'vs_RRF' in d else '', flush=True)
    elif cmd == 'pack':
        print(json.dumps(pack(a['--ranked'], a['--tasks'], a['--out'])), flush=True)
    else:
        raise SystemExit('usage: answer_level.py tune|pack ...')
