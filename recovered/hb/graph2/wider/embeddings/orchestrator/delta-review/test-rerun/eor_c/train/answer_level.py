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
usage:
  python answer_level.py tune --sel <selectB dir> --out <dir> [--task-ids T1-0001,...] [--B 10000]
  python answer_level.py pack --ranked <ranked.jsonl.gz> --tasks <tasks.jsonl> --out <answers.jsonl.gz>  (heldout.py)
env: GT_COMMON (shared code), GT_PRIMARY (frozen record), GT_TASKS (build/tasks/tasks.jsonl), GT_FACTS_CACHE,
GT_SRCSTORE, GT_TMP (paths.js).
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
COMPARATORS = ('RRF', 'PPR', 'CO', 'DIR')
MEASURES = ('primary', 'r2000', 'r4000', 'r16000', 'file_r10', 'mrr')
LANE_LABEL = "file recall within 8,000 tokens, lane-computed (not item 24's measure; ruling 71)"
TRUTH_KEYS = ('truth', 'refs', 'references', 'defs', 'definitions', 'files', 'commit', 'gold')  # never a key in a hand-off row


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
            d['per_seed_primary'] = {s: float(per_commit(lab, s)[:, 0].mean()) for s in SEEDS}
        if lab != 'RRF':
            mean, lo, hi, p = ec.bootstrap(a - base, B=B)
            d['vs_RRF'] = {m: dict(diff=float(mean[i]), lo=float(lo[i]), hi=float(hi[i]), p=float(p[i])) for i, m in enumerate(MEASURES)}
        out[lab] = d
    return out


def tune(sel, outdir, task_ids=None, B=10000):
    rec = check_code()
    os.makedirs(outdir, exist_ok=True)
    tasks = ec.load_tasks()
    late = ec.commit_set(tasks, 'late50')
    sub = [t for t in tasks if t['commit'] in late and (not task_ids or t['task_id'] in task_ids)]
    commits = {t['commit'] for t in sub}
    ids = {t['task_id'] for t in sub}
    cand = {}
    with gzip.open(os.path.join(ROOT, 'eval', 'comparators', 'candidates_unrestricted.tsv.gz'), 'rt') as f:
        next(f)
        for l in f:
            tid, c, _ = l.rstrip('\n').split('\t')
            if tid in ids: cand.setdefault(tid, []).append(c)
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
    rows = []
    variants = []
    for n in COMPARATORS:
        variants.append((n, None, os.path.join(ROOT, 'eval', 'comparators', '%s_unrestricted.tsv.gz' % n)))
    missing = []
    for arm in ('E1', 'E2', 'E3', 'E4', 'E5', 'PLACEBO'):
        for kind in ('alone', 'fused'):
            for s in SEEDS:
                p = os.path.join(sel, arm, '%s_unrestricted_s%d.tsv.gz' % (kind, s))
                if os.path.exists(p): variants.append(('%s_%s' % (arm, kind), s, p))
                else: missing.append(os.path.relpath(p, sel))
    if missing or len(variants) != len(COMPARATORS) + 6 * 2 * len(SEEDS):  # answer-level-4: 40 variants, none skipped
        print('item-24 adapter: refusing (exit 10): %d variant(s), %d table(s) missing: %s' % (len(variants), len(missing), missing[:4]), flush=True)
        raise SystemExit(10)
    vname = lambda lab, s: lab if s is None else '%s_s%d' % (lab, s)  # answer-level-6: the held-out naming
    vmap = {vname(lab, s): (lab, s) for lab, s, _ in variants}
    for lab, s, p in variants:
        T = ec.read_score_table(p)
        for t in sub: rows.append((vname(lab, s), t['task_id'], ec.rank(t['task_id'], cand[t['task_id']], T.get(t['task_id'], {}))))
    rk = os.path.join(WK, 'ranked_unrestricted.jsonl.gz'); write_ranked(rk, rows)
    ans = os.path.join(WK, 'answers.jsonl.gz')
    pk = no_dropped(node('pack', '--ranked', rk, '--tasks', tf, '--primary', PRIMARY, '--out', ans), 'tune')
    # ruling 71: the grader's hand-off, one ranked file and one pack file per variant (heldout.py's layout)
    fname = lambda v: v
    split_by(rk, 'variant', lambda v: os.path.join(HO, 'ranked', '%s_unrestricted.jsonl.gz' % fname(v)))
    split_by(ans, 'arm', lambda v: os.path.join(HO, 'answers', '%s.jsonl.gz' % fname(v)))
    found = truth_keys(HO)
    if found:
        print('item-24 adapter: refusing: the hand-off holds truth keys or reference files: %s' % found[:5], flush=True)
        raise SystemExit(9)
    files = {}
    for dp, dn, fn in os.walk(HO):
        for f in sorted(fn):
            q = os.path.join(dp, f); files[os.path.relpath(q, HO).replace(os.sep, '/')] = sha256_file(q)
    vlist = [dict(variant=vname(lab, s), name=vname(lab, s), label=lab, seed=s, arm=lab.split('_')[0],
                  kind=('comparator' if s is None else lab.split('_')[1]),
                  source=os.path.relpath(p, ROOT).replace(os.sep, '/'), source_sha256=sha256_file(p)) for lab, s, p in variants]
    hand = dict(written=datetime.datetime.utcnow().isoformat() + 'Z', item=24, split='tune', set='T1', tasks=len(sub), commits=len(commits),
                seeds=list(SEEDS), variants=vlist, task_file='tasks.jsonl',
                options=dict(record='%s.json' % rec['hash'], granularity='file', form='signature', pad='none', budgets=[2000, 4000, 8000, 16000], primary_budget=8000),
                packs=pk, test=bool(task_ids),
                note='ranked lists (unrestricted) and packs (frozen typed primary options, 8,000-token primary) only; no item-24 figure '
                     'was computed here; the grader scores these packs with its full references (files and definitions), exactly as '
                     'on held-out (ruling 71). No truth key and no reference file is in this folder.',
                truth_keys_checked=list(TRUTH_KEYS), files=files)
    hp = os.path.join(HO, 'HANDOFF.json')
    json.dump(hand, open(hp, 'w'), indent=1, sort_keys=True)
    # the lane's own figure, under its own label (never item 24's measure)
    rf = os.path.join(LF, 'tune_refs.jsonl')
    with open(rf, 'w') as f:
        for t in sub: f.write(json.dumps(dict(id=t['task_id'], set='T1', split='tune', commit=t['commit'], files=t['truth'], defs=[])) + '\n')
    pt = os.path.join(LF, 'per_task.jsonl')
    sk = node('score', '--answers', ans, '--refs', rf, '--out', pt)
    shutil.rmtree(WK)
    per = {}
    for l in open(pt):
        r = json.loads(l)
        lab, s = vmap[r['arm']]  # answer-level-6: label and seed from the variant list, not parsed from the name
        per[(lab, s, r['id'])] = {m: (r[m] if r[m] is not None else 0.0) for m in MEASURES}
    res = dict(item=24, budget_tokens=8000, options=dict(record='%s.json' % rec['hash'], granularity='file', form='signature', pad='none'),
               tasks=len(sub), commits=len(commits), variants=len(variants), packed=pk,
               item24=dict(measure='scored by the grader with its full references (files and definitions), as on held-out (ruling 71)',
                           status='packs handed to the grader; no item-24 figure computed by the lane',
                           handoff='handoff/HANDOFF.json', handoff_sha256=sha256_file(hp), files=len(files)),
               lane_file_recall=dict(label=LANE_LABEL, scored=sk,
                                     refs='tune truth from git (files of the commit other than the seed, existing at the parent); defs empty',
                                     labels=aggregate(per, tasks, commits, B=B)))
    json.dump(res, open(os.path.join(outdir, 'answer_level.json'), 'w'), indent=1, sort_keys=True)
    return res


if __name__ == '__main__':
    cmd = sys.argv[1]; a = dict(zip(sys.argv[2::2], sys.argv[3::2]))
    if cmd == 'tune':
        ids = set(a['--task-ids'].split(',')) if a.get('--task-ids') else None
        r = tune(a['--sel'], a['--out'], ids, int(a.get('--B', 10000)))
        print(json.dumps({k: v for k, v in r.items() if k != 'lane_file_recall'}), flush=True)
        print('item 24: %s (%s)' % (r['item24']['status'], r['item24']['handoff']), flush=True)
        for lab, d in sorted(r['lane_file_recall']['labels'].items()):
            print(LANE_LABEL, lab, '%.4f' % d['mean']['primary'],
                  ('vs RRF %+.4f [%+.4f, %+.4f]' % (d['vs_RRF']['primary']['diff'], d['vs_RRF']['primary']['lo'], d['vs_RRF']['primary']['hi'])) if 'vs_RRF' in d else '', flush=True)
    elif cmd == 'pack':
        print(json.dumps(pack(a['--ranked'], a['--tasks'], a['--out'])), flush=True)
    else:
        raise SystemExit('usage: answer_level.py tune|pack ...')
