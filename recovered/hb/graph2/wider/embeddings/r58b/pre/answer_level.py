"""answer_level.py: the item-24 adapter (addendum 8 item 24, ruling 58), Python side; node does the packing.

Each arm's UNRESTRICTED ranked list (evalcore.rank over the task's unrestricted candidates: scored first by score,
ties and unscored in the fixed random order) is handed to the shared packer through answer_level.js, with the
frozen typed primary's options read from its record (results/frozen/relational/95e990307da3b42b.json:
granularity file, form signature, pad none; budgets 2,000 / 4,000 / 8,000 / 16,000; primary = recall within
8,000 tokens), and, on TUNING only, scored by score.js (rule "content") against references built from git:
the files of tune_tasks.jsonl's truth (the commit's other modified existing code files), defs empty (reading
recorded in RUNLOG: the definition half of the reference set is sealed, for tune too, so on tuning the answer-
level figure is file recall at 8,000 tokens). Covered: every arm alone and fused (E1..E5 from selectB/), PLACEBO
alone and fused, RRF, PPR, CO and DIR (eval/comparators). Aggregated as item 23: per seed, then the mean of the
three seeds per task, then per commit, then over commits (late 50); paired bootstrap by commit against RRF,
10,000 resamples, 95 % percentile intervals (evalcore.bootstrap).
Guards: this file refuses to run unless answer_level.js hashes to JS_SHA256, and every shared file the record
lists (common/*.js) hashes to the frozen record's value (import, never edit).
usage:
  python answer_level.py tune --sel <selectB dir> --out <dir> [--task-ids T1-0001,...] [--B 10000]
  python answer_level.py pack --ranked <ranked.jsonl.gz> --tasks <tasks.jsonl> --out <answers.jsonl.gz>  (heldout.py)
env: GT_COMMON (shared code), GT_PRIMARY (frozen record), GT_TASKS (build/tasks/tasks.jsonl), GT_FACTS_CACHE,
GT_SRCSTORE, GT_TMP (paths.js).
"""
import os, sys, json, gzip, hashlib, subprocess, collections
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
        if os.path.exists(p) and sha256_file(p) != h: bad.append('%s differs from the frozen record' % rel)
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


def pack(ranked, tasks_file, out):
    check_code()
    return node('pack', '--ranked', ranked, '--tasks', tasks_file, '--primary', PRIMARY, '--out', out)


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
        assert r['split'] == 'tune' and r['parent'] == t['parent'] and r['seed']['path'] == t['seed'], ('task rows disagree', t['task_id'])
    tf = os.path.join(outdir, 'tasks.jsonl')
    with open(tf, 'w') as f:
        for t in sub: f.write(json.dumps(bt[t['task_id']]) + '\n')
    rf = os.path.join(outdir, 'tune_refs.jsonl')
    with open(rf, 'w') as f:
        for t in sub: f.write(json.dumps(dict(id=t['task_id'], set='T1', split='tune', commit=t['commit'], files=t['truth'], defs=[])) + '\n')
    rows = []
    variants = []
    for n in COMPARATORS:
        variants.append((n, None, os.path.join(ROOT, 'eval', 'comparators', '%s_unrestricted.tsv.gz' % n)))
    for arm in ('E1', 'E2', 'E3', 'E4', 'E5', 'PLACEBO'):
        for kind in ('alone', 'fused'):
            for s in SEEDS:
                p = os.path.join(sel, arm, '%s_unrestricted_s%d.tsv.gz' % (kind, s))
                if os.path.exists(p): variants.append(('%s_%s' % (arm, kind), s, p))
    for lab, s, p in variants:
        T = ec.read_score_table(p)
        v = lab if s is None else '%s|s%d' % (lab, s)
        for t in sub: rows.append((v, t['task_id'], ec.rank(t['task_id'], cand[t['task_id']], T.get(t['task_id'], {}))))
    rk = os.path.join(outdir, 'ranked_unrestricted.jsonl.gz'); write_ranked(rk, rows)
    ans = os.path.join(outdir, 'answers.jsonl.gz')
    pk = node('pack', '--ranked', rk, '--tasks', tf, '--primary', PRIMARY, '--out', ans)
    pt = os.path.join(outdir, 'per_task.jsonl')
    sk = node('score', '--answers', ans, '--refs', rf, '--out', pt)
    per = {}
    for l in open(pt):
        r = json.loads(l)
        lab, _, s = r['arm'].partition('|s')
        per[(lab, int(s) if s else None, r['id'])] = {m: (r[m] if r[m] is not None else 0.0) for m in MEASURES}
    res = dict(item=24, budget_tokens=8000, options=dict(record='%s.json' % rec['hash'], granularity='file', form='signature', pad='none'),
               refs='tune truth from git (files of the commit other than the seed, existing at the parent); defs empty',
               tasks=len(sub), commits=len(commits), variants=len(variants), packed=pk, scored=sk,
               labels=aggregate(per, tasks, commits, B=B))
    json.dump(res, open(os.path.join(outdir, 'answer_level.json'), 'w'), indent=1, sort_keys=True)
    return res


if __name__ == '__main__':
    cmd = sys.argv[1]; a = dict(zip(sys.argv[2::2], sys.argv[3::2]))
    if cmd == 'tune':
        ids = set(a['--task-ids'].split(',')) if a.get('--task-ids') else None
        r = tune(a['--sel'], a['--out'], ids, int(a.get('--B', 10000)))
        print(json.dumps({k: v for k, v in r.items() if k != 'labels'}), flush=True)
        for lab, d in sorted(r['labels'].items()):
            print('answer-level', lab, 'primary %.4f' % d['mean']['primary'],
                  ('vs RRF %+.4f [%+.4f, %+.4f]' % (d['vs_RRF']['primary']['diff'], d['vs_RRF']['primary']['lo'], d['vs_RRF']['primary']['hi'])) if 'vs_RRF' in d else '', flush=True)
    elif cmd == 'pack':
        print(json.dumps(pack(a['--ranked'], a['--tasks'], a['--out'])), flush=True)
    else:
        raise SystemExit('usage: answer_level.py tune|pack ...')
