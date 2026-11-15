"""Synthetic hand-offs in the documented layout (train/HANDOFF-FORMAT.md version 2), test flag set unless asked.

make(form, out, ids, ...) writes one hand-off folder:
  form 'tune':    HANDOFF.json (item 24 fields), tasks.jsonl, ranked/<v>_pool.jsonl.gz, ranked/<v>_unrestricted.jsonl.gz,
                  answers/<v>.jsonl.gz
  form 'heldout': HANDOFF.json (heldout.py fields, split "tune (plumbing test)"), tasks_used.jsonl, ranked/<v>_<scope>
                  (rows carry "scope"), answers/<v>.jsonl.gz, tables/counts.json (checkpoint = parent)
Variants: the four comparators (the lane's own tables in /lane/eval/comparators, ranked by evalcore.rank) and a fake
arm of three seeds, alone (seeded random scores) and fused (evalcore.fused_with PPR, CO and that score, w = 1).
Answers are synthetic packs of the unrestricted list in the shared answer record's shape (file granularity, signature
form, seeded token counts and shown lines; budgets 2,000 / 4,000 / 8,000 / 16,000), so score.js can score them.
Only tuning tasks are used by make(). make_full() writes full-size hand-offs (all 40 variants on the late 50, or the
10 variants of one arm on the 418 held-out tasks) with seeded random orders of the sealed code-file universe, for the
size rehearsal (tests/rehearse_full.py). gzip members carry mtime 0, so a folder is byte-reproducible.
"""
import os, sys, json, gzip, hashlib, zlib, shutil
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, HERE)
import numpy as np
import gradecore as gc

COMP = '/lane/eval/comparators'
TASKS = '/build/tasks/tasks.jsonl'
LANE_TASKS = '/lane/eval/tune_tasks.jsonl'
FAKE_FREEZE = hashlib.sha256(b'synthetic freeze record for grader tests').hexdigest()


def anchor(freeze=FAKE_FREEZE, test=True):
    r = {'step': 'coordinator', 'unit': 'item27_freeze', 'file': 'train/heldout/item27.json', 'sha256': freeze, 't': '2026-11-15T00:00:00Z'}
    if test: r['test'] = True
    return json.dumps(r)


def cross_check():
    return dict(target='train/report/tune.json', set='late50', lane_truth_file='eval/tune_tasks.jsonl', lane_truth_sha256=gc.sha256_file(LANE_TASKS))
_TABLES = {}


def table(name, scope):
    k = (name, scope)
    if k not in _TABLES: _TABLES[k] = gc.evalcore().read_score_table(os.path.join(COMP, '%s_%s.tsv.gz' % (name, scope)))
    return _TABLES[k]


def candidates(scope, ids):
    out = {}
    with gzip.open(os.path.join(COMP, 'candidates_%s.tsv.gz' % scope), 'rt', encoding='utf-8') as f:
        next(f)
        for l in f:
            t, c, _ = l.rstrip('\n').split('\t')
            if t in ids: out.setdefault(t, []).append(c)
    return out


def gz_write(path, rows):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as raw:
        with gzip.GzipFile(fileobj=raw, mode='wb', mtime=0, filename='') as g:
            for r in rows: g.write((json.dumps(r) + '\n').encode('utf-8'))


def rng_for(*parts):
    return np.random.default_rng([zlib.crc32('|'.join(map(str, parts)).encode())])


def answer(tid, row, name, ranked, max_items=150, split='tune'):
    r = rng_for('answer', name, tid)
    items = []
    for p in ranked[:max_items]:
        n = int(r.integers(1, 6)); le = int(r.integers(20, 400))
        shown = sorted({int(x) for x in r.integers(1, le + 1, n)})
        items.append(dict(kind='file', path=p, symbol=None, ls=1, le=le, hop=None, via=None, score=0, pad=0,
                          tok=int(r.integers(15, 700)), shown=shown))
    budgets = {}
    for b in (2000, 4000, 8000, 16000):
        used = 0; nf = 0
        for it in items:
            if used + it['tok'] > b: break
            used += it['tok']; nf += 1
        budgets[str(b)] = dict(n_full=nf, used=used, cut=None)
    return dict(id=tid, set='T1', split=split, parent=row['parent'], arm=name, config_hash=gc.PACK_HASH, granularity='file',
                form='signature', pad='none', seeds=['file:' + row['seed']['path']], items=items, budgets=budgets)


def make(form, out, ids, arm='E1', test=True, scope_field=None, drop_variant=None, checkpoint_override=None, parent_override=None):
    """checkpoint_override {(seed, task id): sha} and parent_override {task id: sha} (task row, answers and counts.json)
    drive the literal check's positive cases."""
    ec = gc.evalcore()
    if os.path.isdir(out): shutil.rmtree(out)
    os.makedirs(out)
    rows = [r for r in gc.jsonl(TASKS) if r['id'] in ids]
    assert len(rows) == len(ids) and all(r['split'] == 'tune' and r['set'] == 'T1' for r in rows)
    rows.sort(key=lambda r: r['id'])
    for r in rows:
        if parent_override and r['id'] in parent_override: r['parent'] = parent_override[r['id']]
    truth = gc.load_truth()
    scope_field = (form == 'heldout') if scope_field is None else scope_field
    C = {sc: candidates(sc, set(ids)) for sc in gc.SCOPES}
    variants = [dict(name=n, arm=n, kind='comparator', seed=None) for n in gc.COMPARATORS]
    variants += [dict(name='%s_%s_s%d' % (arm, k, s), arm=arm, kind=k, seed=s) for k in gc.KINDS for s in gc.SEEDS]
    ranked = {}
    for v in variants:
        for sc in gc.SCOPES:
            lst = {}
            for r in rows:
                t = r['id']; cands = C[sc].get(t, [])
                if v['kind'] == 'comparator':
                    S = table(v['name'], sc).get(t, {})
                else:
                    rg = rng_for('score', v['seed'], sc, t)
                    emb = {c: float(x) for c, x in zip(cands, rg.random(len(cands)))}
                    S = emb if v['kind'] == 'alone' else ec.fused_with(t, cands, table('PPR', sc).get(t, {}), table('CO', sc).get(t, {}), emb, 1.0)
                lst[t] = ec.rank(t, cands, S)
            ranked[(v['name'], sc)] = lst
            gz_write(os.path.join(out, 'ranked', '%s_%s.jsonl.gz' % (v['name'], sc)),
                     [dict(id=t, variant=v['name'], **({'scope': sc} if scope_field else {}), ranked=lst[t]) for t in sorted(lst)])
        gz_write(os.path.join(out, 'answers', '%s.jsonl.gz' % v['name']),
                 [answer(r['id'], r, v['name'], ranked[(v['name'], 'unrestricted')][r['id']]) for r in rows])
    tf = 'tasks_used.jsonl' if form == 'heldout' else 'tasks.jsonl'
    with open(os.path.join(out, tf), 'w', encoding='utf-8', newline='\n') as f:
        for r in rows: f.write(json.dumps(r) + '\n')
    if form == 'heldout':
        co = checkpoint_override or {}
        counts = {'s%d' % s: {r['id']: dict(parent=r['parent'], checkpoint=co.get((s, r['id']), truth[r['id']]['parent']), lag=0) for r in rows} for s in gc.SEEDS}
        os.makedirs(os.path.join(out, 'tables'))
        with open(os.path.join(out, 'tables', 'counts.json'), 'w', encoding='utf-8', newline='\n') as f: json.dump(counts, f, sort_keys=True)
    if drop_variant: variants = [v for v in variants if v['name'] != drop_variant]
    files = {}
    for dp, dn, fn in os.walk(out):
        for fl in fn:
            q = os.path.join(dp, fl); files[os.path.relpath(q, out).replace(os.sep, '/')] = gc.sha256_file(q)
    commits = len({truth[i]['commit'] for i in ids})
    if form == 'tune':
        H = dict(format='train/HANDOFF-FORMAT.md', item=24, split='tune', set='T1', tasks=len(rows), commits=commits, seeds=list(gc.SEEDS), task_file='tasks.jsonl', test=test,
                 variants=[dict(variant=v['name'], name=v['name'], label=(v['name'] if v['seed'] is None else '%s_%s' % (arm, v['kind'])),
                                mean_row=(v['name'] if v['seed'] is None else '%s_%s_mean' % (arm, v['kind'])),
                                seed=v['seed'], arm=v['arm'], kind=v['kind'], source='synthetic', source_sha256='0' * 64) for v in variants],
                 cross_check=cross_check(), note='synthetic test hand-off (grader tests)', files=files)
    else:
        H = dict(format='train/HANDOFF-FORMAT.md', split='tune (plumbing test)', freeze='item27.json', freeze_sha256=FAKE_FREEZE, anchor_line=anchor(),
                 chosen=dict(arm=arm, config_id='c00', w=1), tasks=len(rows), parents=len({r['parent'] for r in rows}),
                 checkpoints=len({r['parent'] for r in rows}), seeds=list(gc.SEEDS), test=test, scopes=list(gc.SCOPES),
                 variants=[dict(name=v['name'], arm=v['arm'], kind=v['kind'], seed=v['seed'],
                                mean_row=(v['name'] if v['seed'] is None else '%s_%s_mean' % (arm, v['kind']))) for v in variants],
                 note='synthetic test hand-off (grader tests)', files=files)
    return write_handoff(out, H)


def make_full(form, out, ids, arms, test=False, max_items=60):
    """Full-size hand-off for the size rehearsal: 'tune' (tasks.jsonl, 40 variants) or 'heldout' (tasks_used.jsonl,
    split heldout, counts.json with checkpoint = the sealed parent, anchor line). Ranked lists are seeded random orders
    of the sealed universe (unrestricted = every code file of the parent but the seed; pool = a seeded subset)."""
    if os.path.isdir(out): shutil.rmtree(out)
    os.makedirs(out)
    truth = gc.load_truth(); U = gc.universe()
    rows = sorted([r for r in gc.jsonl(TASKS) if r['id'] in ids], key=lambda r: r['id'])
    assert len(rows) == len(ids)
    split = 'heldout' if form == 'heldout' else 'tune'
    variants = [dict(name=n, arm=n, kind='comparator', seed=None) for n in gc.COMPARATORS]
    variants += [dict(name='%s_%s_s%d' % (a, k, s), arm=a, kind=k, seed=s) for a in arms for k in gc.KINDS for s in gc.SEEDS]
    for v in variants:
        unr = {}
        for sc in gc.SCOPES:
            lst = {}
            for r in rows:
                t = truth[r['id']]; c = sorted(U[t['parent']] - {t['seed']})
                rg = rng_for('full', v['name'], sc, r['id'])
                order = [c[j] for j in rg.permutation(len(c))]
                lst[r['id']] = order if sc == 'unrestricted' else [p for p in order if rg.random() < 0.2]
            if sc == 'unrestricted': unr = lst
            gz_write(os.path.join(out, 'ranked', '%s_%s.jsonl.gz' % (v['name'], sc)),
                     [dict(id=t, variant=v['name'], scope=sc, ranked=lst[t]) for t in sorted(lst)])
        gz_write(os.path.join(out, 'answers', '%s.jsonl.gz' % v['name']),
                 [answer(r['id'], r, v['name'], unr[r['id']], max_items=max_items, split=split) for r in rows])
    tf = 'tasks_used.jsonl' if form == 'heldout' else 'tasks.jsonl'
    with open(os.path.join(out, tf), 'w', encoding='utf-8', newline='\n') as f:
        for r in rows: f.write(json.dumps(r) + '\n')
    if form == 'heldout':
        counts = {'s%d' % s: {r['id']: dict(parent=r['parent'], checkpoint=truth[r['id']]['parent'], lag=0) for r in rows} for s in gc.SEEDS}
        os.makedirs(os.path.join(out, 'tables'))
        with open(os.path.join(out, 'tables', 'counts.json'), 'w', encoding='utf-8', newline='\n') as f: json.dump(counts, f, sort_keys=True)
    files = {}
    for dp, dn, fn in os.walk(out):
        for fl in fn:
            q = os.path.join(dp, fl); files[os.path.relpath(q, out).replace(os.sep, '/')] = gc.sha256_file(q)
    V = [dict(name=v['name'], arm=v['arm'], kind=v['kind'], seed=v['seed'], mean_row=(v['name'] if v['seed'] is None else '%s_%s_mean' % (v['arm'], v['kind'])))
         for v in variants]
    commits = len({truth[i]['commit'] for i in ids})
    if form == 'tune':
        H = dict(format='train/HANDOFF-FORMAT.md', item=24, split='tune', set='T1', tasks=len(rows), commits=commits, seeds=list(gc.SEEDS),
                 task_file='tasks.jsonl', test=test, variants=V, cross_check=cross_check(), note='synthetic full-size rehearsal', files=files)
    else:
        H = dict(format='train/HANDOFF-FORMAT.md', split='heldout', freeze='item27.json', freeze_sha256=FAKE_FREEZE, anchor_line=anchor(test=test),
                 chosen=dict(arm=arms[0]), tasks=len(rows), seeds=list(gc.SEEDS), test=test, scopes=list(gc.SCOPES), variants=V,
                 note='synthetic full-size rehearsal', files=files)
    return write_handoff(out, H)


def write_handoff(out, H):
    with open(os.path.join(out, 'HANDOFF.json'), 'w', encoding='utf-8', newline='\n') as f: json.dump(H, f, indent=1, sort_keys=True)
    return gc.sha256_file(os.path.join(out, 'HANDOFF.json'))


def shell(form, out, ids, variant_names, test, extra=None, chosen_arm=None):
    """A hand-off with only HANDOFF.json and its task file (no ranked or answer file): for refusals that must come
    before any list is read (variant set, task set, split). Task rows come from build/tasks (no truth)."""
    if os.path.isdir(out): shutil.rmtree(out)
    os.makedirs(out)
    rows = sorted([r for r in gc.jsonl(TASKS) if r['id'] in ids], key=lambda r: r['id'])
    tf = 'tasks_used.jsonl' if form == 'heldout' else 'tasks.jsonl'
    with open(os.path.join(out, tf), 'w', encoding='utf-8', newline='\n') as f:
        for r in rows: f.write(json.dumps(r) + '\n')
    V = []
    for n in variant_names:
        if n in gc.COMPARATORS: V.append(dict(name=n, arm=n, kind='comparator', seed=None))
        else:
            a, k, s = n.split('_'); V.append(dict(name=n, arm=a, kind=k, seed=int(s[1:])))
    H = dict(split=('heldout' if form == 'heldout' else 'tune'), test=test, tasks=len(rows), variants=V,
             files={tf: gc.sha256_file(os.path.join(out, tf))})
    if form == 'heldout': H.update(freeze_sha256=FAKE_FREEZE, chosen=dict(arm=chosen_arm or 'E1'), anchor_line=anchor(test=test))
    else: H.update(task_file='tasks.jsonl', cross_check=cross_check())
    H.update(extra or {})
    return write_handoff(out, H)
