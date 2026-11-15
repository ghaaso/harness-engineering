"""gradecore.py: the grader's computations for addendum 8 (rank metrics, answer level, literal check).

Runs inside graphtest-kge:1 with the layout of run.sh:
  /build           build/ (read-only; sealed references, shared harness, facts cache, stored results)
  /build/sealed/grader/embeddings   this folder (read-write)
  /lane/eval       the lane's eval/ (read-only; evalcore.py, tune_tasks.jsonl, comparator tables)
  /returns         the lane's grader-returns/ (read-write; aggregates only)
No path comes from the environment. Every pinned input is checked by sha256 before use.
"""
import os, re, sys, json, gzip, math, hashlib, subprocess, importlib.util, collections
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = '/build'
LANE_EVAL = '/lane/eval'
EVALCORE = os.path.join(LANE_EVAL, 'evalcore.py')
REFS = os.path.join(BUILD, 'sealed', 'references.jsonl')
SCORE_JS = os.path.join(BUILD, 'arms', 'common', 'score.js')
HARNESS_JS = os.path.join(BUILD, 'arms', 'common', 'harness.js')
TRUTH = os.path.join(HERE, 'truth', 'truth.jsonl')
ANCESTRY = os.path.join(HERE, 'truth', 'ancestry.jsonl')  # full git ancestry per possible checkpoint (truth/build_aux.js)
UNIVERSE = os.path.join(HERE, 'truth', 'universe.jsonl')  # code files (evalcore.CODE) of git ls-tree per T1 parent
COMMITS = os.path.join(HERE, 'truth', 'commits.jsonl')  # task commits (build_truth.js); not read by the grade, pinned so it cannot drift from truth.jsonl unnoticed
LOGS = os.path.join(HERE, 'logs')
ANSWER_JS = os.path.join(HERE, 'answer_score.js')

PINS = {  # sha256 of every input the grade depends on besides the hand-off
    EVALCORE: '4054976ce935e081082cbeb6ef1ccc64d102a50a00ce61123ea0fd093d7da0ff',
    SCORE_JS: 'abe4737d40daa88dc0991aa653b7e450f545c3743807893d411e8a70f9bb2ff2',
    HARNESS_JS: '3ff6b5a213a765f3afe0cef945e61c7b7d197bb023b6fe6dbcd44fba5d0711a4',
    REFS: '8282703053422511ccc4e2a1350eae20366b7f3ec8a4c11b7c738d033d328bac',
    TRUTH: '7c4f816385c07767e552b760d93d492e0bf5ebcddff7e50877026f5bf2429b79',
    ANCESTRY: 'a1faee04959144fd4f82235bfefe1e22501285ceecc4c886b7d30f9d63715963',
    UNIVERSE: '9069fa8dd6db0b7c239f6543e9112c57812f32e6cb4eabf4f81fa00d81d8967d',
    COMMITS: 'da138931bb647426d9ee299ed1acc41191d406d655eb4907177851e5baf6a2d6',
}
SHA40 = re.compile(r'[0-9a-f]{40}')
CODE = re.compile(r'^(backend|src|technician-app)/.*\.(py|ts|tsx|js|jsx|mjs|cjs)$')  # evalcore.CODE (line 26)
METRICS = ('P@10', 'R@10', 'R@20', 'MRR')
SCOPES = ('pool', 'unrestricted')
SEEDS = (1, 2, 3)
COMPARATORS = ('RRF', 'PPR', 'CO', 'DIR')
TUNE_ARMS = ('E1', 'E2', 'E3', 'E4', 'E5', 'PLACEBO')
HELDOUT_ARMS = ('E1', 'E2', 'E3', 'E4', 'E5')
KINDS = ('alone', 'fused')
PACK_HASH = '95e990307da3b42b'
ANSWER_PROBLEMS = ('duplicate task', 'arm field differs from the variant', 'config_hash differs', 'not a content form',
                   'no reference for a task', 'null primary')


class Refuse(Exception):
    def __init__(self, code, msg):
        super().__init__(msg); self.code = code; self.msg = msg


def sha256_file(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
    return h.hexdigest()


def check_pins():
    for p, want in PINS.items():
        if not os.path.exists(p): raise Refuse(20, 'pinned input missing: %s' % p)
        got = sha256_file(p)
        if got != want: raise Refuse(20, 'pinned input changed: %s (%s, want %s)' % (p, got[:12], want[:12]))


_EC = None


def evalcore():
    """The lane's frozen evaluation code, imported from its file after its hash is checked."""
    global _EC
    if _EC is None:
        got = sha256_file(EVALCORE)
        if got != PINS[EVALCORE]: raise Refuse(20, 'evalcore.py hashes to %s' % got[:12])
        spec = importlib.util.spec_from_file_location('evalcore_frozen', EVALCORE)
        m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); _EC = m
    return _EC


def jsonl(p):
    op = gzip.open if p.endswith('.gz') else open
    with op(p, 'rt', encoding='utf-8') as f:
        return [json.loads(l) for l in f if l.strip()]


def intern_paths(lst):
    """One string object per distinct path (a full tuning hand-off holds about 11.7 M list entries; refuter F6)."""
    return [sys.intern(p) for p in lst]


def load_truth():
    """{task id: {id, split, commit, parent, seed, date_order, late50, truth}} (sealed records; build_truth.js)."""
    return {r['id']: r for r in jsonl(TRUTH)}


def test_sets(truth):
    """The only task sets a test hand-off may carry (refuter F3): 'pick8' = every T1 task of the late-50 commits at
    positions 0, 6, ..., 42 of date order (8 commits), and 'late50' = every late-50 task (50 commits). Fixed sets, so
    no test return is an aggregate over a set the lane chose (one task, or two sets one task apart)."""
    first = {}
    for t in truth.values():
        if t['split'] == 'tune' and t['late50']: first[t['commit']] = min(first.get(t['commit'], t['date_order']), t['date_order'])
    late = sorted(first, key=lambda c: (first[c], c))
    pick = set(late[::6][:8])
    return {'pick8': frozenset(i for i, t in truth.items() if t['commit'] in pick),
            'late50': frozenset(i for i, t in truth.items() if t['split'] == 'tune' and t['late50'])}


_UNI = None


def universe():
    """{T1 parent: frozenset of its code files} (sealed, pinned)."""
    global _UNI
    if _UNI is None:
        _UNI = {r['parent']: frozenset(r['code_files']) for r in jsonl(UNIVERSE)}
    return _UNI


def ec_tasks(ids, truth):
    """Task dicts in evalcore's shape (task_id, commit, date_order) for per_commit / summary / paired."""
    return [dict(task_id=i, commit=truth[i]['commit'], date_order=truth[i]['date_order']) for i in sorted(ids)]


# ------------------------------------------------------------------ rank metrics
def per_task_rank(ranked, truth):
    """ranked: {task id: [paths]} as handed over (never re-sorted) -> {task id: evalcore.task_metrics}."""
    ec = evalcore()
    return {i: ec.task_metrics(ranked[i], truth[i]['truth']) for i in ranked}


def seed_mean(per_task_list):
    return evalcore().mean_over_seeds(per_task_list)


def summary(per_task, tasks):
    """Mean per commit, then over commits (evalcore.summary)."""
    return evalcore().summary(per_task, tasks)


def paired(per_a, per_b, tasks, B=10000):
    """Paired bootstrap by commit, A minus B (evalcore.paired: seed 0, 10,000 resamples, 95 %)."""
    return evalcore().paired(per_a, per_b, tasks, B=B)


# ------------------------------------------------------------------ answer level
def as_metrics(per_primary):
    """{task id: x} -> {task id: {metric: x}} so evalcore's per_commit / mean_over_seeds can carry one measure."""
    return {i: {m: v for m in METRICS} for i, v in per_primary.items()}


def answer_level_per_task(answer_file, out_file, expect_arm=None, expect_hash=PACK_HASH):
    """Runs answer_score.js (arms/common/score.js, rule content, sealed references) on one answer file. Writes the
    per-task primaries to out_file (sealed) and returns ({task id: primary}, info)."""
    args = ['node', ANSWER_JS, '--answers', answer_file, '--refs', REFS, '--out', out_file]
    if expect_arm is not None: args += ['--arm', expect_arm]
    if expect_hash is not None: args += ['--config-hash', expect_hash]
    p = subprocess.run(args, capture_output=True, text=True)
    last = (p.stdout or '').strip().splitlines()[-1:] or ['']
    try: info = json.loads(last[0])
    except ValueError: info = None
    if p.returncode != 0 or not isinstance(info, dict) or info.get('ok') is not True:
        # refuter F10: the message carries only answer_score.js's own problem list (a fixed vocabulary) and the exit
        # status; raw stderr goes to a sealed log, never to the terminal.
        os.makedirs(LOGS, exist_ok=True)
        with open(os.path.join(LOGS, 'answer_score.stderr.log'), 'a', encoding='utf-8') as f:
            f.write('%s exit %d\n%s\n' % (os.path.basename(answer_file), p.returncode, p.stderr or ''))
        probs = info.get('problems') if isinstance(info, dict) and isinstance(info.get('problems'), list) else []
        probs = [x for x in probs if x in ANSWER_PROBLEMS]
        raise Refuse(30, 'answer scoring failed for %s: exit %d, problems %s' % (os.path.basename(answer_file), p.returncode, probs or ['(see logs/answer_score.stderr.log)']))
    per = {r['id']: r['primary'] for r in jsonl(out_file)}
    return per, info


def commit_values(per_task, tasks):
    """(commit list, array [n_commits, 4]) by evalcore.per_commit."""
    return evalcore().per_commit(per_task, tasks)


def bootstrap_diff(per_a, per_b, tasks, B=10000):
    """Paired bootstrap by commit of one measure carried in P@10 (evalcore.per_commit + evalcore.bootstrap)."""
    ec = evalcore()
    ca, a = ec.per_commit(per_a, tasks); cb, b = ec.per_commit(per_b, tasks)
    if ca != cb: raise Refuse(31, 'paired commits differ')
    m, lo, hi, p = ec.bootstrap(a[:, 0] - b[:, 0], B=B)
    return dict(diff=float(m), lo=float(lo), hi=float(hi), p=float(p))


# ------------------------------------------------------------------ literal check (ruling 73)
_ANC = None


def history(sha):
    """T1 task commits that are the checkpoint or a git ancestor of it: the full git ancestry (truth/ancestry.jsonl,
    git rev-list, sealed and pinned). The facts cache's commits.jsonl is not used: it leaves ancestors out (audit A1).
    A checkpoint that is not 40 hex, or not one of the possible checkpoints of that file, is refused."""
    global _ANC
    if not isinstance(sha, str) or not SHA40.fullmatch(sha): raise Refuse(11, 'a checkpoint is not a 40-hex sha')
    if _ANC is None: _ANC = {r['checkpoint']: frozenset(r['task_commits']) for r in jsonl(ANCESTRY)}
    if sha not in _ANC: raise Refuse(40, 'a checkpoint is not one of the sealed possible checkpoints')
    return _ANC[sha]


def literal_check(task_rows, truth, checkpoints):
    """task_rows: hand-off task rows; checkpoints: {task id: set of checkpoint shas}, required for every task (the
    hand-off's tables/counts.json, every seed; no fallback to the hand-off's own parent, refuter F1). Counts tasks
    whose commit is a checkpoint or a git ancestor of one, and tasks whose hand-off parent is not the commit's
    parent (sealed records, git first parent)."""
    hc = {}; leak = 0; mism = 0
    for r in task_rows:
        t = truth[r['id']]
        if r['parent'] != t['parent']: mism += 1
        bad = False
        cs = checkpoints.get(r['id'])
        if not cs: raise Refuse(11, 'a task has no checkpoint')
        for c in sorted(cs):
            if c not in hc: hc[c] = history(c)
            if t['commit'] == c or t['commit'] in hc[c]: bad = True
        leak += bad
    return dict(tasks=len(task_rows), task_commit_in_checkpoint_history=leak, parent_mismatch=mism)


# ------------------------------------------------------------------ return hygiene
UNIT = set(METRICS) | {'primary', 'p'}  # numbers in [0, 1]
SIGNED = {'diff', 'lo', 'hi'}           # numbers in [-1, 1]
COUNTS = {'tasks', 'commits', 'tasks_checked', 'equal_to_lane', 'task_commit_in_checkpoint_history', 'parent_mismatch'}


def finite(o, where='return', key=None, parent=None):
    """Every number finite and in its v2 range (HANDOFF-FORMAT 3.2; refuter F8): metrics, primary, p and the values
    under per_seed / answer_level in [0, 1]; diff, lo, hi in [-1, 1]; counts are non-negative integers. A number
    under any other key is refused (exit 50)."""
    if isinstance(o, dict):
        for k, v in o.items(): finite(v, where + '.' + str(k), str(k), key)
    elif isinstance(o, (list, tuple)):
        for v in o: finite(v, where, key, parent)
    elif isinstance(o, bool) or o is None or isinstance(o, str):
        return
    elif isinstance(o, (int, float)):
        if not math.isfinite(o): raise Refuse(50, 'non-finite number at %s' % where)
        if key in COUNTS:
            if not (isinstance(o, int) and o >= 0): raise Refuse(50, 'a count is not a non-negative integer at %s' % where)
        elif key in SIGNED:
            if not -1.0 <= o <= 1.0: raise Refuse(50, 'out of [-1, 1] at %s' % where)
        elif key in UNIT or parent in ('per_seed', 'answer_level'):
            if not 0.0 <= o <= 1.0: raise Refuse(50, 'out of [0, 1] at %s' % where)
        else:
            raise Refuse(50, 'a number under an unexpected key at %s' % where)
    else:
        raise Refuse(50, 'unexpected type at %s' % where)


TASK_ID = re.compile(r'T[0-9][a-z]?-[0-9]{4}')


def reference_strings(ids):
    """Every reference path (files and definition paths) of the given T1 tasks, and their truth files."""
    ids = set(ids); out = set()
    for r in jsonl(REFS):
        if r.get('id') in ids:
            out.update(f['path'] if isinstance(f, dict) else f for f in r.get('files', []))
            out.update(d['path'] for d in r.get('defs', []))
            out.update((f.get('child_path') or '') for f in r.get('files', []) if isinstance(f, dict))
    tr = load_truth()
    for i in ids:
        if i in tr: out.update(tr[i]['truth'])
    out.discard('')
    return out


def leak_scan(text, ids):
    """[(kind, count)] of forbidden content in a return's text: task ids and reference paths of the graded tasks."""
    bad = []
    if TASK_ID.search(text): bad.append(('task id', len(TASK_ID.findall(text))))
    hits = sum(1 for s in reference_strings(ids) if s in text)
    if hits: bad.append(('reference path', hits))
    return bad


def dumps(obj):
    finite(obj)
    return json.dumps(obj, sort_keys=True, indent=1, allow_nan=False) + '\n'


def write_return(path, obj, ids):
    """Aggregates only: finite numbers, no task id, no reference path of the graded tasks; written atomically."""
    text = dumps(obj)
    bad = leak_scan(text, ids)
    if bad: raise Refuse(51, 'return %s would hold %s' % (os.path.basename(path), bad))
    tmp = path + '.part'
    with open(tmp, 'w', encoding='utf-8', newline='\n') as f: f.write(text)
    os.replace(tmp, path)
    return sha256_file(path)
