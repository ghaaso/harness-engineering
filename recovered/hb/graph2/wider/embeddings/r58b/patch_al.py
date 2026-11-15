import sys
p = sys.argv[1] + '/train/answer_level.py'
s = open(p, encoding='utf-8').read()

old_doc = s[s.index('Each arm\'s UNRESTRICTED'):s.index('Guards: this file refuses')]
new_doc = '''Each arm's UNRESTRICTED ranked list (evalcore.rank over the task's unrestricted candidates: scored first by score,
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
'''
assert s.count(old_doc) == 1
s = s.replace(old_doc, new_doc)

start = s.index('    tf = os.path.join(outdir, \'tasks.jsonl\')\n')
end = s.index('    json.dump(res, open(os.path.join(outdir, \'answer_level.json\'), \'w\'), indent=1, sort_keys=True)\n')
new_body = '''    HO = os.path.join(outdir, 'handoff'); LF = os.path.join(outdir, 'lane_file_recall'); WK = os.path.join(outdir, 'work')
    for d in (HO, LF, WK):
        if os.path.isdir(d): shutil.rmtree(d)
        os.makedirs(d)
    tf = os.path.join(HO, 'tasks.jsonl')
    with open(tf, 'w') as f:
        for t in sub: f.write(json.dumps(bt[t['task_id']]) + '\\n')
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
    rk = os.path.join(WK, 'ranked_unrestricted.jsonl.gz'); write_ranked(rk, rows)
    ans = os.path.join(WK, 'answers.jsonl.gz')
    pk = node('pack', '--ranked', rk, '--tasks', tf, '--primary', PRIMARY, '--out', ans)
    # ruling 71: the grader's hand-off, one ranked file and one pack file per variant (heldout.py's layout)
    fname = lambda v: v.replace('|', '_')
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
    vlist = [dict(variant=fname(lab if s is None else '%s|s%d' % (lab, s)), label=lab, seed=s,
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
        for t in sub: f.write(json.dumps(dict(id=t['task_id'], set='T1', split='tune', commit=t['commit'], files=t['truth'], defs=[])) + '\\n')
    pt = os.path.join(LF, 'per_task.jsonl')
    sk = node('score', '--answers', ans, '--refs', rf, '--out', pt)
    shutil.rmtree(WK)
    per = {}
    for l in open(pt):
        r = json.loads(l)
        lab, _, s = r['arm'].partition('|s')
        per[(lab, int(s) if s else None, r['id'])] = {m: (r[m] if r[m] is not None else 0.0) for m in MEASURES}
    res = dict(item=24, budget_tokens=8000, options=dict(record='%s.json' % rec['hash'], granularity='file', form='signature', pad='none'),
               tasks=len(sub), commits=len(commits), variants=len(variants), packed=pk,
               item24=dict(measure='scored by the grader with its full references (files and definitions), as on held-out (ruling 71)',
                           status='packs handed to the grader; no item-24 figure computed by the lane',
                           handoff='handoff/HANDOFF.json', handoff_sha256=sha256_file(hp), files=len(files)),
               lane_file_recall=dict(label=LANE_LABEL, scored=sk,
                                     refs='tune truth from git (files of the commit other than the seed, existing at the parent); defs empty',
                                     labels=aggregate(per, tasks, commits, B=B)))
'''
s = s[:start] + new_body + s[end:]

old = '''    rf = os.path.join(outdir, 'tune_refs.jsonl')'''
assert old not in s

a = "import os, sys, json, gzip, hashlib, subprocess, collections\n"
assert s.count(a) == 1
s = s.replace(a, "import os, sys, json, gzip, hashlib, subprocess, collections, shutil, datetime\n")

a = "MEASURES = ('primary', 'r2000', 'r4000', 'r16000', 'file_r10', 'mrr')\n"
assert s.count(a) == 1
s = s.replace(a, a + '''LANE_LABEL = "file recall within 8,000 tokens, lane-computed (not item 24's measure; ruling 71)"
TRUTH_KEYS = ('truth', 'refs', 'references', 'defs', 'definitions', 'files', 'commit', 'gold')  # never a key in a hand-off row


def truth_keys(folder):
    """Ruling 71: [(file, problem)] for any reference-like file or any JSON row (gzip or plain) with a truth key."""
    out = []
    for dp, dn, fn in os.walk(folder):
        for f in fn:
            p = os.path.join(dp, f)
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
                outs[v][1].write(l if l.endswith('\\n') else l + '\\n')
    finally:
        for p, fh in outs.values(): fh.close()
    for p, fh in outs.values(): os.replace(p + '.part', p)
    return sorted(outs)
''')

a = '''        print(json.dumps({k: v for k, v in r.items() if k != 'labels'}), flush=True)
        for lab, d in sorted(r['labels'].items()):
            print('answer-level', lab, 'primary %.4f' % d['mean']['primary'],'''
assert s.count(a) == 1
s = s.replace(a, '''        print(json.dumps({k: v for k, v in r.items() if k != 'lane_file_recall'}), flush=True)
        print('item 24: %s (%s)' % (r['item24']['status'], r['item24']['handoff']), flush=True)
        for lab, d in sorted(r['lane_file_recall']['labels'].items()):
            print(LANE_LABEL, lab, '%.4f' % d['mean']['primary'],''')
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('patched answer_level.py')
