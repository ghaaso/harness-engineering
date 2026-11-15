"""handoff.py: reads a hand-off (train/HANDOFF-FORMAT.md version 2, with the version-2 decisions of the task brief) and
applies every refusal of decision 7 before anything is graded. Refusal codes (exit codes of grade.py):
  2 usage / missing HANDOFF.json      3 HANDOFF.json sha256 differs from the coordinator's value
  4 test flag wrong for the mode      5 freeze sha256 differs, or the anchor line disagrees with it
  6 a listed file is missing, differs, is unlisted, is a link or lies outside the hand-off; the lane truth file
    differs from cross_check.lane_truth_sha256
  7 split wrong                       8 held-out already graded (returns/heldout.json or the sealed marker exists)
  9 variant set other than expected  10 task set other than expected   11 a ranked, answer or counts file is malformed
 40 a checkpoint outside the sealed possible checkpoints
"""
import os, re, json, gzip
import gradecore as gc
from gradecore import Refuse, COMPARATORS, SCOPES, SEEDS, KINDS, TUNE_ARMS, HELDOUT_ARMS

HEX64 = re.compile(r'[0-9a-f]{64}')
MODES = ('tune', 'heldout', 'tune-test', 'heldout-test')
LANE_TASKS = '/lane/eval/tune_tasks.jsonl'
ANCHOR_FILE = 'train/heldout/item27.json'


def arm_names(arm):
    return ['%s_%s_s%d' % (arm, k, s) for k in KINDS for s in SEEDS]


def expected_variants(mode, H, found_arms):
    if mode == 'tune': arms = list(TUNE_ARMS)
    elif mode == 'heldout':
        a = (H.get('chosen') or {}).get('arm')
        if a not in HELDOUT_ARMS: raise Refuse(9, 'chosen arm %r is not one of %s' % (a, HELDOUT_ARMS))
        arms = [a]
    elif mode == 'tune-test':
        arms = sorted(found_arms)
        if not arms or any(a not in TUNE_ARMS for a in arms): raise Refuse(9, 'test arms %s' % arms)
    else:
        a = (H.get('chosen') or {}).get('arm')
        if a not in HELDOUT_ARMS or sorted(found_arms) != [a]: raise Refuse(9, 'test arm %r, variants of %s' % (a, sorted(found_arms)))
        arms = [a]
    return arms, set(COMPARATORS) | {n for a in arms for n in arm_names(a)}


def check_variants(mode, H):
    V = H.get('variants')
    if not isinstance(V, list) or not V: raise Refuse(9, 'no variant list')
    out = {}; arms = set()
    for v in V:
        name = v.get('name') or v.get('variant')
        if not isinstance(name, str) or name in out: raise Refuse(9, 'variant name missing or repeated')
        kind, seed, arm = v.get('kind'), v.get('seed'), v.get('arm')
        if kind == 'comparator' or name in COMPARATORS:
            if not (name in COMPARATORS and kind == 'comparator' and seed is None and arm in (None, name)):
                raise Refuse(9, 'comparator entry %s is inconsistent' % name)
            if 'mean_row' in v and v['mean_row'] != name: raise Refuse(9, 'variant %s mean_row %s' % (name, v['mean_row']))
            out[name] = dict(name=name, arm=name, kind='comparator', seed=None)
        else:
            if kind not in KINDS or seed not in SEEDS or not isinstance(arm, str) or name != '%s_%s_s%d' % (arm, kind, seed):
                raise Refuse(9, 'variant entry %s is inconsistent' % name)
            if 'label' in v and v['label'] != '%s_%s' % (arm, kind): raise Refuse(9, 'variant %s label %s' % (name, v['label']))
            if 'mean_row' in v and v['mean_row'] != '%s_%s_mean' % (arm, kind): raise Refuse(9, 'variant %s mean_row %s' % (name, v['mean_row']))
            out[name] = dict(name=name, arm=arm, kind=kind, seed=seed); arms.add(arm)
    want_arms, want = expected_variants(mode, H, arms)
    if set(out) != want:
        raise Refuse(9, 'variant set differs: %d missing, %d extra' % (len(want - set(out)), len(set(out) - want)))
    return want_arms, out


def expected_tasks(mode, truth):
    if mode == 'tune': return {i for i, t in truth.items() if t['split'] == 'tune' and t['late50']}
    if mode == 'heldout': return {i for i, t in truth.items() if t['split'] == 'heldout'}
    return None  # test forms: one of gc.test_sets (refuter F3)


def listed(H, d, rel):
    if rel not in H['files']: raise Refuse(6, 'file %s is not listed in HANDOFF.json' % rel)
    return os.path.join(d, rel)


def read_tasks(mode, H, d, truth):
    rel = 'tasks_used.jsonl' if mode.startswith('heldout') else (H.get('task_file') or 'tasks.jsonl')
    rows = gc.jsonl(listed(H, d, rel))
    want_split = 'heldout' if mode == 'heldout' else 'tune'
    ids = [r.get('id') for r in rows]
    if len(set(ids)) != len(ids): raise Refuse(10, 'a task is listed twice')
    for r in rows:
        t = truth.get(r.get('id'))
        if t is None or r.get('set') != 'T1' or r.get('split') != want_split or t['split'] != want_split:
            raise Refuse(10, 'a task is not a T1 %s task of the sealed records' % want_split)
        if (r.get('seed') or {}).get('path') != t['seed']: raise Refuse(10, 'a task seed differs from the sealed records')
        if mode.startswith('tune') and r.get('parent') != t['parent']: raise Refuse(10, 'a task parent differs from the sealed records')
        if not isinstance(r.get('parent'), str): raise Refuse(10, 'a task row has no parent')
    want = expected_tasks(mode, truth)
    if want is not None and set(ids) != want:
        raise Refuse(10, 'task set differs: %d missing, %d extra' % (len(want - set(ids)), len(set(ids) - want)))
    if want is None and frozenset(ids) not in set(gc.test_sets(truth).values()):
        raise Refuse(10, 'a test hand-off must carry one of the fixed test sets %s' % sorted(gc.test_sets(truth)))
    if not ids: raise Refuse(10, 'no task')
    if H.get('tasks') != len(ids): raise Refuse(10, 'HANDOFF.json tasks %r, task file %d' % (H.get('tasks'), len(ids)))
    if 'commits' in H and H['commits'] != len({truth[i]['commit'] for i in ids}): raise Refuse(10, 'HANDOFF.json commits differs')
    return rows


def read_ranked(H, d, name, scope, ids, truth):
    """One ranked file. Every path is a code file (evalcore.CODE) that exists at the task's parent (sealed universe,
    git ls-tree), the seed is never listed, paths are distinct; an unrestricted list is the whole universe of the
    parent minus the seed (refuter F5; HANDOFF-FORMAT v2 section 5: every list ranks code files only)."""
    rows = gc.jsonl(listed(H, d, 'ranked/%s_%s.jsonl.gz' % (name, scope)))
    U = gc.universe(); out = {}
    for r in rows:
        i = r.get('id'); lst = r.get('ranked')
        if i in out or i not in ids: raise Refuse(11, 'ranked %s %s: a task repeated or unknown' % (name, scope))
        if r.get('variant') != name or r.get('scope', scope) != scope: raise Refuse(11, 'ranked %s %s: variant or scope field' % (name, scope))
        if not isinstance(lst, list) or not all(isinstance(p, str) for p in lst) or len(set(lst)) != len(lst):
            raise Refuse(11, 'ranked %s %s: a list is not a list of distinct paths' % (name, scope))
        t = truth[i]; u = U.get(t['parent'])
        if u is None: raise Refuse(11, 'ranked %s %s: no sealed universe for a parent' % (name, scope))
        if not all(gc.CODE.match(p) for p in lst): raise Refuse(11, 'ranked %s %s: a path is not a code file' % (name, scope))
        if t['seed'] in lst: raise Refuse(11, 'ranked %s %s: a list holds its own seed' % (name, scope))
        if not all(p in u for p in lst): raise Refuse(11, 'ranked %s %s: a path does not exist at the parent' % (name, scope))
        if scope == 'unrestricted' and len(lst) != len(u) - (1 if t['seed'] in u else 0):
            raise Refuse(11, 'ranked %s %s: an unrestricted list is not every code file of the parent but the seed' % (name, scope))
        out[i] = gc.intern_paths(lst)
    if set(out) != ids: raise Refuse(11, 'ranked %s %s: %d task(s) missing' % (name, scope, len(ids - set(out))))
    return out


def check_answers_follow(H, d, name, ranked_unr, rows_by_id):
    """Each answer: items (file granularity) are the unrestricted ranked list's head, in order; parent equals the task
    row and the task's file seed is among the seeds; the 8,000 budget is internally consistent (refuter F11: used <= 8,000, the full items plus
    the cut fit in used, n_full within the items, a cut item exists and is not longer than its item)."""
    bad = {'head': 0, 'parent_or_seed': 0, 'budget': 0}
    for a in gc.jsonl(listed(H, d, 'answers/%s.jsonl.gz' % name)):
        r = ranked_unr.get(a.get('id')); row = rows_by_id.get(a.get('id'))
        items = a.get('items') if isinstance(a.get('items'), list) else []
        ps = [it.get('path') for it in items]
        if r is None or ps != r[:len(ps)]: bad['head'] += 1
        seeds = a.get('seeds')
        if row is None or a.get('parent') != row['parent'] or not isinstance(seeds, list) or not seeds or ('file:' + row['seed']['path']) not in seeds:
            bad['parent_or_seed'] += 1
        b = (a.get('budgets') or {}).get('8000')
        try:
            nf = b['n_full']; cut = b.get('cut'); used = b['used']
            ok = isinstance(nf, int) and 0 <= nf <= len(items) and 0 <= used <= 8000
            if ok:
                tot = sum(int(items[k]['tok']) for k in range(nf))
                if cut:
                    ok = nf < len(items) and 0 < int(cut['tok']) <= int(items[nf]['tok']); tot += int(cut['tok'])
                ok = ok and tot <= used
        except (TypeError, KeyError, ValueError, AttributeError):
            ok = False
        if not ok: bad['budget'] += 1
    if bad['head']: raise Refuse(11, 'answers %s: %d answer(s) are not the head of the unrestricted ranked list' % (name, bad['head']))
    if bad['parent_or_seed']: raise Refuse(11, 'answers %s: %d answer(s) carry another parent or seed than the task row' % (name, bad['parent_or_seed']))
    if bad['budget']: raise Refuse(11, 'answers %s: %d answer(s) have an inconsistent 8000 budget' % (name, bad['budget']))


def checkpoints(H, d, ids):
    """{task id: set of checkpoints} from tables/counts.json, which every held-out hand-off must list (refuter F1,
    audit A3): exactly the seeds s1, s2, s3, each giving every task a 40-hex checkpoint that is one of the sealed
    possible checkpoints. No fallback to the hand-off's own parent."""
    if 'tables/counts.json' not in H['files']: raise Refuse(11, 'tables/counts.json is not listed (the literal check needs every checkpoint)')
    try: C = json.load(open(listed(H, d, 'tables/counts.json'), encoding='utf-8'))
    except ValueError: raise Refuse(11, 'tables/counts.json is not JSON')
    want = {'s%d' % s for s in SEEDS}
    if not isinstance(C, dict) or set(C) != want: raise Refuse(11, 'tables/counts.json does not hold exactly the seeds s1, s2, s3')
    out = {}
    for s in sorted(want):
        per = C[s]
        if not isinstance(per, dict) or set(per) != ids: raise Refuse(11, 'tables/counts.json %s does not cover exactly the tasks' % s)
        for i, row in per.items():
            c = row.get('checkpoint') if isinstance(row, dict) else None
            if not isinstance(c, str) or not gc.SHA40.fullmatch(c): raise Refuse(11, 'tables/counts.json %s: a task has no 40-hex checkpoint' % s)
            gc.history(c)  # refuses (40) a checkpoint outside the sealed possible checkpoints
            out.setdefault(i, set()).add(c)
    return out


def anchor_ok(H, freeze_sha, required):
    """HANDOFF-FORMAT v2 section 2: anchor_line is the coordinator's item27_freeze line, verbatim. Its sha256 must be
    the coordinator's freeze value and its file train/heldout/item27.json (refuter F12)."""
    a = H.get('anchor_line')
    if a is None:
        if required: raise Refuse(5, 'HANDOFF.json has no anchor_line')
        return
    try: r = json.loads(a) if isinstance(a, str) else a
    except ValueError: raise Refuse(5, 'anchor_line is not a JSON line')
    if not isinstance(r, dict) or r.get('step') != 'coordinator' or r.get('unit') != 'item27_freeze' or r.get('file') != ANCHOR_FILE \
            or r.get('sha256') != freeze_sha:
        raise Refuse(5, 'anchor_line does not name item27.json with the coordinator\'s freeze sha256')
    if required and r.get('test'): raise Refuse(5, 'anchor_line is marked test in real mode')


def lane_truth_ok(H, required):
    """cross_check.lane_truth_sha256 (HANDOFF-FORMAT v2, tuning) must be the sha256 of the lane truth file the grader
    compares with (eval/tune_tasks.jsonl), so truth.equal_to_lane is measured against the file the lane named."""
    cc = H.get('cross_check')
    want = cc.get('lane_truth_sha256') if isinstance(cc, dict) else None
    if want is None:
        if required: raise Refuse(6, 'HANDOFF.json cross_check.lane_truth_sha256 is missing')
        return
    if gc.sha256_file(LANE_TASKS) != want: raise Refuse(6, 'eval/tune_tasks.jsonl differs from cross_check.lane_truth_sha256')


def heldout_marker_exists(marker):
    """The sealed record of a real held-out grading (audit A2, refuter F4): the marker itself, or any per-task file
    left in its folder by an earlier run."""
    d = os.path.dirname(marker)
    return os.path.exists(marker) or (os.path.isdir(d) and any(f.startswith('per_task') or f.startswith('answer_') for f in os.listdir(d)))


def write_marker(marker, obj):
    os.makedirs(os.path.dirname(marker), exist_ok=True)
    tmp = marker + '.part'
    with open(tmp, 'w', encoding='utf-8', newline='\n') as f: json.dump(obj, f, sort_keys=True); f.write('\n')
    os.replace(tmp, marker)


def load(mode, d, handoff_sha, freeze_sha, returns_dir, truth, marker=None):
    """All refusals of decision 7, in this order: second held-out grading (returns file or sealed marker), HANDOFF.json
    hash, test flag, split, freeze hash and anchor line, every listed file's hash; then (real held-out: after the sealed
    marker is written) the variant set, the task set, the ranked, answer and counts files themselves."""
    if mode not in MODES: raise Refuse(2, 'mode must be one of %s' % (MODES,))
    real = mode in ('tune', 'heldout')
    if mode == 'heldout':
        if os.path.exists(os.path.join(returns_dir, 'heldout.json')): raise Refuse(8, 'held-out already graded: heldout.json exists')
        if marker is None or heldout_marker_exists(marker): raise Refuse(8, 'held-out already graded: the sealed marker or per-task figures exist')
    if not isinstance(handoff_sha, str) or not HEX64.fullmatch(handoff_sha): raise Refuse(2, '--handoff-sha256 must be 64 hex')
    if mode.startswith('heldout') and (not isinstance(freeze_sha, str) or not HEX64.fullmatch(freeze_sha)):
        raise Refuse(2, '--freeze-sha256 must be 64 hex')
    hp = os.path.join(d, 'HANDOFF.json')
    if not os.path.isfile(hp) or os.path.islink(hp): raise Refuse(2, 'no HANDOFF.json in the hand-off folder')
    got = gc.sha256_file(hp)
    if got != handoff_sha: raise Refuse(3, 'HANDOFF.json hashes to %s, not the coordinator\'s %s' % (got[:12], handoff_sha[:12]))
    H = json.load(open(hp, encoding='utf-8'))
    if real and H.get('test') is not False: raise Refuse(4, 'real mode: the hand-off test flag is %r' % H.get('test'))
    if not real and H.get('test') is not True: raise Refuse(4, 'test mode: the hand-off test flag is %r' % H.get('test'))
    sp = H.get('split')
    if not ((mode == 'tune' and sp == 'tune') or (mode == 'heldout' and sp == 'heldout') or (mode == 'tune-test' and sp == 'tune')
            or (mode == 'heldout-test' and sp in ('tune (plumbing test)', 'tune', 'heldout'))):
        raise Refuse(7, 'split %r for mode %s' % (sp, mode))
    if mode.startswith('heldout'):
        if H.get('freeze_sha256') != freeze_sha: raise Refuse(5, 'HANDOFF.json freeze_sha256 differs from the coordinator\'s value')
        anchor_ok(H, freeze_sha, required=(mode == 'heldout'))
    F = H.get('files')
    if not isinstance(F, dict) or not F: raise Refuse(6, 'HANDOFF.json lists no file')
    root = os.path.realpath(d)
    for rel, h in sorted(F.items()):
        p = os.path.normpath(os.path.join(d, rel))
        if os.path.isabs(rel) or '..' in rel.replace('\\', '/').split('/') or not p.startswith(os.path.normpath(d)):
            raise Refuse(6, 'listed path outside the hand-off')
        if not os.path.isfile(p): raise Refuse(6, 'listed file %s is missing' % rel)
        q = p; real_p = os.path.realpath(p)
        while q.startswith(os.path.normpath(d)) and q != os.path.normpath(d):
            if os.path.islink(q): raise Refuse(6, 'listed file %s is or lies under a link' % rel)
            q = os.path.dirname(q)
        if not (real_p == root or real_p.startswith(root + os.sep)): raise Refuse(6, 'listed file %s resolves outside the hand-off' % rel)
        if gc.sha256_file(p) != h: raise Refuse(6, 'listed file %s differs from its listed sha256' % rel)
    if mode.startswith('tune'): lane_truth_ok(H, required=(mode == 'tune'))
    if mode == 'heldout':
        # The coordinator-pinned hand-off is accepted byte for byte; from here on a stop leaves the sealed marker, and a
        # second grading needs the coordinator to remove it (recorded).
        write_marker(marker, {'handoff_sha256': handoff_sha, 'freeze_sha256': freeze_sha, 'state': 'started'})
    arms, V = check_variants(mode, H)
    rows = read_tasks(mode, H, d, truth)
    ids = {r['id'] for r in rows}
    by_id = {r['id']: r for r in rows}
    ranked = {n: {sc: read_ranked(H, d, n, sc, ids, truth) for sc in SCOPES} for n in sorted(V)}
    for n in sorted(V): check_answers_follow(H, d, n, ranked[n]['unrestricted'], by_id)
    return dict(H=H, arms=arms, variants=V, rows=rows, ids=ids, ranked=ranked,
                answers={n: os.path.join(d, 'answers', '%s.jsonl.gz' % n) for n in V},
                checkpoints=checkpoints(H, d, ids) if mode.startswith('heldout') else {})
