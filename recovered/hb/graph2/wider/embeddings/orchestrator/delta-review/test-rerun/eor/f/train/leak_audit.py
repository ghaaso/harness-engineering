"""leak_audit.py: the leak audit of addendum 8 item 18, by ruling 60 (with ruling 35's disclosure).

For every checkpoint used in either split and every task assigned to it (tune: plan.json `assignment` over
eval/tune_tasks.jsonl; held-out: plan.json `heldout.assignment` over the T1 held-out rows of build/tasks/tasks.jsonl,
which carry ids, parents and seeds only), checked from the RAW facts cache (build/facts/cache/<sha>/commits.jsonl,
the commits a checkpoint's facts were built from) and from git itself (the repository, read-only), not from the
lane's derived files:
  c1  the task commit is not in the checkpoint's history. Tune: the commit (tune_tasks.jsonl) is not among C's raw
      commits. Both splits: every raw commit of C is P or a git ancestor of P (`git rev-list P`); the task commit
      is a child of P, so it cannot be one of them. (Held-out task commits are not known to this script.)
  c2  ruling 49: C == P, or C is a git ancestor of P (`git merge-base --is-ancestor`) and C's raw commits are a
      subset of P's.
  c3  C is not later than P in ruling 50's order (author time, committer time, sha; from `git show`).
  c4  the task's checkpoint in plan.json is the one checked, and, when parts folders are given, every part's
      counts.json places each task on its planned checkpoint.
  c5  no truth file is mounted in a training or scoring container: the docker -v / --mount sources of the given
      launcher scripts (orchestrator/guard-stageB.sh, train/heldout.sh, ...) and of `docker inspect` mount lists
      (JSON files, if given) are classified: anything under a `sealed` folder or named *reference*.jsonl is held-out
      truth (never allowed); eval/tune_tasks.jsonl, eval/tune_commits.jsonl, eval/git/pilot_rows.tsv and
      eval/git/june_namestatus.txt (and any tune_refs.jsonl) carry TUNE truth: allowed by item 18 (tuning truth is
      derived from git for tuning commits) and reported; tune commits are ancestors of every held-out parent, so
      their changes are in the held-out facts anyway. Only held-out truth fails c5. A mounted folder is
      expanded to the files under it when it lies inside the lane (--lane-host maps it to /w here). Also checked:
      train/kge.py (the training code) opens no task or truth file.
  c6  ruling 78: the held-out container mounts the facts and the source store of the 70 held-out parents only. Every
      held-out mount (launcher line or docker inspect) is refused when its source is the whole facts cache, a
      facts/cache/<sha> folder, the whole arms/common folder or any srcstore; the staged /gt/facts and /gt/common
      sources (heldout_inputs.js) are read and must hold exactly plan.json's heldout.assignment parents (facts
      folders, trees) and only the blobs those trees name, and common/ only *.js and srcstore.
Coverage (review audit-result-3; a vacuous audit is a FAIL): at least one launcher script per container role in
--roles (default stageB,heldout; a script's role is read from its name: heldout, stageA/stageAB, stageB/guard),
and the parts rows (c4) of each split equal the planned count: tune = configs x 3 seeds x tune tasks
(15 x 3 x 388 = 17,460 at stage B's plan), held-out = 3 seeds x 418 held-out tasks (one frozen configuration).
--test marks the result test: true (write_result.py refuses it) and allows --expect-rows split=N,... instead.
Output: a markdown table for AUDIT.md (per split and checkpoint) with ruling 35's disclosure, and a JSON file
(default train/leak_audit/leak_audit.json, the path write_result.py reads).
usage: python leak_audit.py --repo <repo> --facts <facts cache> --heldout-tasks <build tasks.jsonl>
         [--plan PATH] [--scripts a.sh,b.sh] [--mounts inspect.json,...] [--parts dir,...] [--lane-host C:/...]
         [--roles stageB,heldout] [--out-md PATH] [--out-json PATH]
         [--test [--expect-rows tune=N,heldout=M] [--override-assign split:P=C,...]]   (tests only)
"""
import os, sys, json, re, subprocess, collections, datetime
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.environ.get('EMB_ROOT') or os.path.dirname(HERE)

DISCLOSURE_35 = ('Ruling 35 (disclosure): while building the evaluation core, one builder\'s look at a temp file showed the names '
                 'of files in two held-out commits (dated 2026-08-03). No truth was computed or used from it; tuning truth came '
                 'from git for the June commits only.')
TUNE_TRUTH = ('eval/tune_tasks.jsonl', 'eval/tune_commits.jsonl', 'eval/git/pilot_rows.tsv', 'eval/git/june_namestatus.txt',
              'eval/git/pilot_commits.json')
# ruling 72: every file of the mounted eval/ folder is listed with its class; why each tune-truth file is truth
EVAL_WHY = {'eval/tune_tasks.jsonl': 'per task: truth = the commit\'s other changed files',
            'eval/tune_commits.jsonl': 'per commit: seeds (changed files) and task ids',
            'eval/git/pilot_rows.tsv': 'pilot rows with the truth label y',
            'eval/git/june_namestatus.txt': 'git name-status of the June (tune) commits',
            'eval/git/pilot_commits.json': 'pilot commits with their changed files',
            'eval/comparators/metrics.json': 'comparator metrics computed against tune truth (aggregates, no file list)',
            'eval/gate.json': 'evaluation-core gate counts (aggregates, no file list)'}
DERIVED = ('eval/comparators/metrics.json', 'eval/gate.json')
# ruling 72: the code lines showing that training and scoring take only task id, seed and candidates
CODE_EVIDENCE = (('train/stageB.py', r'def load_tasks|tune_tasks\.jsonl|def score_tasks|kge\.score\(|kge\.train\(arm, c\['),
                 ('train/kge.py', r'^def train\(|^def score\(|rows: \[\(task_id, seed_path'),
                 ('eval/evalcore.py', r'^def candidates\(|g\.pool\(task\[.seed.\]\)'))
TRUTH_READ = re.compile(r'''\[['"]truth['"]\]|get\(['"]truth['"]''')


class Git:
    def __init__(self, repo):
        self.repo = repo; self._rl = {}; self._key = {}; self._anc = {}

    def run(self, *a):
        p = subprocess.run(['git', '-c', 'safe.directory=*', '-C', self.repo] + list(a), capture_output=True, text=True)
        return p.returncode, p.stdout

    def revlist(self, s):
        if s not in self._rl:
            rc, out = self.run('rev-list', s)
            if rc != 0: raise RuntimeError('git rev-list %s failed' % s)
            self._rl[s] = set(out.split())
        return self._rl[s]

    def key(self, s):
        if s not in self._key:
            rc, out = self.run('show', '-s', '--format=%at %ct', s)
            a, c = out.split()[:2]; self._key[s] = (int(a), int(c), s)
        return self._key[s]

    def is_ancestor(self, c, p):
        if (c, p) not in self._anc:
            self._anc[(c, p)] = self.run('merge-base', '--is-ancestor', c, p)[0] == 0
        return self._anc[(c, p)]


def raw_hist(facts, s, cache={}):
    if s not in cache:
        cache[s] = frozenset(json.loads(l).get('sha') for l in open(os.path.join(facts, s, 'commits.jsonl')) if l.strip())
    return cache[s]


def check_pair(git, facts, C, P, commit=None):
    hc, hp = raw_hist(facts, C), raw_hist(facts, P)
    rl = git.revlist(P)
    c1 = (commit is None or commit not in hc) and hc <= rl
    c2 = C == P or (git.is_ancestor(C, P) and hc <= hp)
    c3 = git.key(C) <= git.key(P)
    return dict(c1=c1, c2=c2, c3=c3, c1_commit_checked=commit is not None,
                c1_commits_outside_P=len(hc - rl), c2_ancestor=(C == P or git.is_ancestor(C, P)), c2_subset=hc <= hp)


MOUNT_RE = re.compile(r'(?:^|\s)-v\s+("?)([^\s"]+)\1|--mount\s+\S*?(?:source|src)=([^,\s]+)')


def mounts_of_script(path):
    """[(line number, host source as written, container destination or '')] of every docker -v / --mount in a script."""
    out = []
    for i, l in enumerate(open(path, encoding='utf-8', errors='replace'), 1):
        if 'docker' not in l and not l.strip().startswith('-v') and '-v ' not in l: continue
        if l.lstrip().startswith('#'): continue
        for m in MOUNT_RE.finditer(l):
            if m.group(2):
                spec = m.group(2); drive = ''
                if re.match(r'^[A-Za-z]:/', spec): drive, spec = spec[:2], spec[2:]  # C:/... host paths
                parts = re.split(r':(?=/)', spec)
                src = drive + parts[0]; dst = parts[1] if len(parts) > 1 else ''
                if dst: out.append((i, src, dst))  # a bind mount names a container path (`grep -v` does not)
            elif m.group(3):
                out.append((i, m.group(3), ''))
    return out


def expand_vars(src, script_text):
    """Resolve $W / ${W} style variables assigned plainly in the script (W=... lines)."""
    env = dict(re.findall(r'^\s*([A-Z_][A-Z0-9_]*)=([^\s;]+)', script_text, re.M))
    dflt = re.compile(r'^\$\{[A-Z_0-9]+:-(.*)\}$')  # WD=${GUARD_WD:-C:/...} -> its default
    env = {k: (dflt.match(v).group(1) if dflt.match(v) else v) for k, v in env.items()}
    for _ in range(3):
        src = re.sub(r'\$\{?([A-Z_][A-Z0-9_]*)\}?', lambda m: env.get(m.group(1), m.group(0)), src)
    return src.strip('"\'')


def classify(host_src, lane_host, kind):
    """-> (class, files): 'heldout_truth' | 'tune_truth' | 'clean' for one mount source, expanded inside the lane."""
    s = host_src.replace('\\', '/')
    segs = s.split('/')
    if 'sealed' in segs or re.search(r'reference[s]?[^/]*\.jsonl$', s): return 'heldout_truth', [s]
    files = []
    lh = lane_host.replace('\\', '/').rstrip('/') if lane_host else None
    if lh and (s == lh or s.startswith(lh + '/')):
        rel = s[len(lh):].lstrip('/'); local = os.path.join(ROOT, rel)
        if os.path.isdir(local):
            for dp, dn, fn in os.walk(local):
                dn[:] = [d for d in dn if d not in ('parts', 'quarantine', '__pycache__')]  # score/model folders hold no task file
                for f in fn: files.append(os.path.relpath(os.path.join(dp, f), ROOT).replace('\\', '/'))
        else:
            files.append(rel)
    bad_h = [f for f in files if 'sealed' in f.split('/') or re.search(r'reference[s]?[^/]*\.jsonl$', f)]
    if bad_h: return 'heldout_truth', bad_h
    tt = [f for f in files if f in TUNE_TRUTH or os.path.basename(f) == 'tune_refs.jsonl']
    if tt: return 'tune_truth', tt
    return 'clean', []


def role_of(name):
    """The container role of a launcher script or an inspect file, read from its name."""
    b = os.path.basename(name)
    if 'kge-H1P' in b or 'probe' in b: return 'heldout'  # the ruling-79 probe container (launched by heldout.sh)
    if 'heldout' in b or 'kge-H' in b: return 'heldout'
    if 'stageA' in b or 'kge-A' in b: return 'stageA'
    if 'stageB' in b or 'guard' in b or 'kge-B' in b: return 'stageB'
    return 'other'


def host_norm(s):
    """C:/... form of a host path written as /c/..., /run/desktop/mnt/host/c/... or C:\\..."""
    s = s.replace('\\', '/')
    m = re.match(r'^(?:/run/desktop/mnt/host)?/([a-zA-Z])/(.*)$', s)
    return (m.group(1).upper() + ':/' + m.group(2)) if m and not re.match(r'^[A-Za-z]:/', s) else s


def audit_mounts(scripts, inspects, lane_host):
    rows = []
    for sp in scripts:
        txt = open(sp, encoding='utf-8', errors='replace').read()
        heldout = role_of(sp) == 'heldout'
        for ln, src, dst in mounts_of_script(sp):
            hs = expand_vars(src, txt)
            cls, files = classify(hs, lane_host, 'script')
            ok = cls != 'heldout_truth'
            rows.append(dict(source='%s:%d' % (os.path.basename(sp), ln), host=hs, dest=dst, container='held-out' if heldout else 'stage B / tuning',
                             cls=cls, files=files[:6], ok=ok, probe='kge-H1P' in txt.splitlines()[ln - 1] or 'train/probe' in txt.splitlines()[ln - 1]))
    for ip in inspects:
        j = json.load(open(ip)); name = os.path.basename(ip)
        heldout = role_of(name) == 'heldout'
        for m in (j if isinstance(j, list) else [j]):
            hs = host_norm(m.get('Source', '')); cls, files = classify(hs, lane_host, 'inspect')
            ok = cls != 'heldout_truth'
            rows.append(dict(source=name, host=hs, dest=m.get('Destination', ''), container='held-out' if heldout else 'stage B / tuning',
                             cls=cls, files=files[:6], ok=ok, probe='kge-H1P' in name or 'probe' in name))
    return rows


FORBIDDEN_78 = re.compile(r'(/facts/cache(/[0-9a-f]{40})?|/arms/common|/srcstore(/.*)?)$')


def ruling78(rows, plan, lane_host):
    """c6: the held-out container's mounts against the plan's held-out parents (ruling 78)."""
    parents = set(plan['heldout']['assignment'])
    out = dict(parents=len(parents), problems=[], staged={})
    ho = [m for m in rows if m['container'] == 'held-out']
    if not ho: out['problems'].append('no held-out launcher or inspect given')
    lh = lane_host.replace('\\', '/').rstrip('/') if lane_host else None
    for m in ho:
        h = host_norm(m['host']).rstrip('/')
        if FORBIDDEN_78.search(h): out['problems'].append('%s mounts %s (whole facts cache, a cache folder, arms/common or a srcstore)' % (m['source'], h[-60:]))
    scoring = [m for m in ho if not m.get('probe')]
    for dest in ('/gt/facts', '/gt/common'):
        ms = [m for m in scoring if re.sub(r':(ro|rw)$', '', m['dest'].rstrip('/')) == dest]  # '/gt/facts:ro' names /gt/facts
        if scoring and not ms: out['problems'].append('the held-out container has no staged %s mount' % dest)
        for m in ms:
            h = host_norm(m['host']).rstrip('/')
            local = os.path.join(ROOT, h[len(lh):].lstrip('/')) if lh and (h == lh or h.startswith(lh + '/')) else None
            if not local or not os.path.isdir(local):
                out['problems'].append('%s: staged source %s is not readable here (not inside the lane)' % (m['source'], h[-60:])); continue
            if dest == '/gt/facts':
                got = set(os.listdir(local))
                out['staged']['facts'] = len(got)
                if got != parents: out['problems'].append('%s: staged facts %d folders, %d not a held-out parent, %d parent(s) missing'
                                                          % (m['source'], len(got), len(got - parents), len(parents - got)))
            else:
                tdir = os.path.join(local, 'srcstore', 'trees'); bdir = os.path.join(local, 'srcstore', 'blobs')
                if not os.path.isdir(tdir) or not os.path.isdir(bdir):
                    out['problems'].append('%s: staged common/ has no srcstore/trees and blobs' % m['source']); continue
                tp, extra = set(), []
                for t in os.listdir(tdir):
                    mt = re.match(r'^([0-9a-f]{40})(\.absent)?\.json$', t)
                    if not mt or mt.group(1) not in parents: extra.append(t)
                    elif not mt.group(2): tp.add(mt.group(1))
                named = set()
                for P in tp: named |= {h2 + '.txt' for h2 in json.load(open(os.path.join(tdir, P + '.json'))).values()}
                blobs = set(os.listdir(bdir))
                odd = [f for f in os.listdir(local) if f != 'srcstore' and not f.endswith('.js')]
                out['staged'].update(trees=len(tp), blobs=len(blobs), common_other=odd[:3])
                if extra or tp != parents or blobs != named or odd:
                    out['problems'].append('%s: staged common/ trees %d (%d not a held-out parent), %d parent(s) without a tree, blobs %d '
                                           '(%d unnamed, %d missing), other files %s' % (m['source'], len(tp), len(extra), len(parents - tp),
                                                                                      len(blobs), len(blobs - named), len(named - blobs), odd[:3]))
    out['ok'] = not out['problems']
    return out


def planned_rows(plan, tune_tasks, n_held):
    """Coverage: the c4 parts rows a finished run must show per split."""
    n_cfg = sum(len(v) for v in plan['configs'].values())
    tune_n = sum(1 for t in tune_tasks if t['parent'] in plan['assignment'])
    return dict(tune=n_cfg * 3 * tune_n, heldout=3 * n_held)


def eval_listing():
    """Ruling 72: every file under the mounted eval/ folder, file by file: class, size, sha256, and why it is truth."""
    out = []
    base = os.path.join(ROOT, 'eval')
    for dp, dn, fn in os.walk(base):
        dn[:] = sorted(d for d in dn if d != '__pycache__')
        dn[:] = [d for d in dn if d != 'sealed']  # never opened
        for f in sorted(fn):
            p = os.path.join(dp, f); rel = os.path.relpath(p, ROOT).replace('\\', '/')
            cls = 'tune truth' if rel in TUNE_TRUTH else 'derived from tune truth (aggregates)' if rel in DERIVED else 'no truth'
            out.append(dict(file=rel, cls=cls, bytes=os.path.getsize(p), sha256=sha256_file(p), why=EVAL_WHY.get(rel, '')))
    return out


def sha256_file(p):
    import hashlib
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
    return h.hexdigest()


def code_evidence():
    """Ruling 72: the lines where stage B loads tasks, trains (no task argument) and scores ((task id, seed, candidates)
    only), and every line of the training/scoring code that reads a task's 'truth' key (must be none)."""
    lines = []; truth_reads = []
    for rel, pat in CODE_EVIDENCE:
        rx = re.compile(pat)
        for i, l in enumerate(open(os.path.join(ROOT, rel), encoding='utf-8'), 1):
            if rx.search(l): lines.append(dict(file=rel, line=i, text=l.strip()[:150]))
    for rel in ('train/stageB.py', 'train/kge.py', 'train/proj.py', 'export/checkpoints.py'):
        for i, l in enumerate(open(os.path.join(ROOT, rel), encoding='utf-8'), 1):
            if TRUTH_READ.search(l): truth_reads.append(dict(file=rel, line=i, text=l.strip()[:150]))
    return dict(lines=lines, truth_key_reads=truth_reads, ok=not truth_reads and len(lines) >= 5)


def kge_reads_no_task_file():
    txt = open(os.path.join(HERE, 'kge.py'), encoding='utf-8').read()
    hits = [w for w in ('tune_tasks', 'tasks.jsonl', 'truth', 'sealed', 'references') if w in txt]
    # 'truth' occurs only in comments about the stage-A split? list each hit with its line for the table
    lines = [(i, l.strip()[:100]) for i, l in enumerate(txt.splitlines(), 1) if any(w in l for w in hits) and 'open(' in l]
    return dict(ok=not lines, open_lines=lines)


def main(argv):
    a = dict(plan=os.path.join(HERE, 'stageB', 'plan.json'), scripts='', mounts='', parts='', override='', roles='stageB,heldout',
             out_md=os.path.join(HERE, 'leak_audit', 'AUDIT-leak.md'), out_json=os.path.join(HERE, 'leak_audit', 'leak_audit.json'))
    test = '--test' in argv; argv = [x for x in argv if x != '--test']
    for k, v in zip(argv[::2], argv[1::2]): a[k[2:].replace('-', '_')] = v
    if not test and (a.get('override_assign') or a.get('expect_rows')):
        raise SystemExit('leak audit: --override-assign and --expect-rows are for --test only')
    git = Git(a['repo']); facts = a['facts']
    plan = json.load(open(a['plan']))
    tune = [json.loads(l) for l in open(os.path.join(ROOT, 'eval', 'tune_tasks.jsonl')) if l.strip()]
    held = []
    for l in open(a['heldout_tasks']):
        if not l.strip(): continue
        r = json.loads(l)
        if r.get('set') == 'T1' and r.get('split') == 'heldout':
            held.append(dict(task_id=r['id'], parent=r['parent'], commit=None))
    assign = dict(tune=dict(plan['assignment']), heldout=dict(plan['heldout']['assignment']))
    for item in filter(None, a['override_assign'].split(',')) if a.get('override_assign') else []:
        sp, pc = item.split(':'); P, C = pc.split('='); assign[sp][P] = C
    res = dict(written=datetime.datetime.utcnow().isoformat() + 'Z', s=plan['s'], plan_hash=plan.get('plan_hash'), splits={}, failures=[], test=test)
    for split, rows in (('tune', [dict(task_id=t['task_id'], parent=t['parent'], commit=t['commit']) for t in tune]), ('heldout', held)):
        per_ck = collections.OrderedDict()
        for t in rows:
            C = assign[split][t['parent']]
            r = check_pair(git, facts, C, t['parent'], t['commit'])
            d = per_ck.setdefault(C, dict(checkpoint=C, tasks=0, parents=set(), c1=0, c2=0, c3=0, c_eq_p=0, commit_checked=0))
            d['tasks'] += 1; d['parents'].add(t['parent']); d['c_eq_p'] += int(C == t['parent'])
            for k in ('c1', 'c2', 'c3'): d[k] += int(r[k])
            d['commit_checked'] += int(r['c1_commit_checked'])
            if not (r['c1'] and r['c2'] and r['c3']):
                res['failures'].append(dict(split=split, task=t['task_id'], parent=t['parent'], checkpoint=C, **r))
        for d in per_ck.values(): d['parents'] = len(d['parents'])
        res['splits'][split] = dict(checkpoints=len(per_ck), tasks=len(rows), rows=list(per_ck.values()))
    # c4: parts place every task on its planned checkpoint
    c4 = []; c4_by = collections.Counter()
    for pd in filter(None, a['parts'].split(',')):
        for dp, dn, fn in os.walk(pd):
            if 'counts.json' in fn and not dp.endswith(('.part', '.model')):
                C = os.path.basename(dp)
                for tid, rec in json.load(open(os.path.join(dp, 'counts.json'))).items():
                    P = rec.get('parent'); sp = 'tune' if P in assign['tune'] else 'heldout'
                    ok = rec.get('checkpoint') == C == assign[sp].get(P)
                    c4.append(ok); c4_by[sp] += 1
                    if not ok: res['failures'].append(dict(split=sp, task=tid, parent=P, checkpoint=C, c4=False))
    res['c4_parts'] = dict(task_rows=len(c4), ok=sum(c4), by_split=dict(c4_by))
    scripts = [p for p in a['scripts'].split(',') if p]
    res['mounts'] = audit_mounts(scripts, [p for p in a['mounts'].split(',') if p], a.get('lane_host'))
    # coverage (audit-result-3): every role has a launcher, every split its planned parts rows
    want = planned_rows(plan, tune, len(held))
    if test and a.get('expect_rows'): want.update({k: int(v) for k, v in (x.split('=') for x in a['expect_rows'].split(','))})
    cov = []
    roles = [r for r in a['roles'].split(',') if r]
    if not test and not {'stageB', 'heldout'} <= set(roles): cov.append('--roles must include stageB and heldout (given %s)' % roles)
    have = collections.Counter(role_of(sp) for sp in scripts)
    for r in roles:
        if not have[r]: cov.append('no launcher script for the %s role' % r)
    for sp, n in sorted(want.items()):
        if c4_by[sp] != n: cov.append('%s parts rows %d, planned %d' % (sp, c4_by[sp], n))
    res['coverage'] = dict(ok=not cov, problems=cov, planned_rows=want, roles=roles)
    res['ruling78'] = ruling78(res['mounts'], plan, a.get('lane_host'))
    res['kge_reads_no_task_file'] = kge_reads_no_task_file()
    res['eval_files'] = eval_listing(); res['code_evidence'] = code_evidence()
    res['eval_mounted_in'] = sorted({m['source'] for m in res['mounts'] if m['host'].replace('\\', '/').rstrip('/').endswith('/eval')})
    for m in res['mounts']:
        if not m['ok']: res['failures'].append(dict(mount=m))
    res['ok'] = (not res['failures'] and res['kge_reads_no_task_file']['ok'] and res['code_evidence']['ok'] and res['coverage']['ok']
                 and res['ruling78']['ok'])
    os.makedirs(os.path.dirname(os.path.abspath(a['out_json'])), exist_ok=True)
    json.dump(res, open(a['out_json'], 'w'), indent=1, default=list)
    L = ['## Leak audit (addendum 8 item 18, ruling 60)', '',
         'Written by train/leak_audit.py %s; s = %s, plan_hash %s. Checked from the raw facts cache (commits.jsonl) and git.' % (res['written'], plan['s'], plan.get('plan_hash')),
         'c1 task commit not in C\'s history (tune: by sha; both splits: every raw commit of C is P or a git ancestor of P); '
         'c2 ruling 49 (C = P, or git ancestor with a raw-history subset); c3 C not later than P (ruling 50 order).', '',
         '| split | checkpoint | tasks | parents | C = P | c1 | c2 | c3 |', '|---|---|---|---|---|---|---|---|']
    for split in ('tune', 'heldout'):
        for d in res['splits'][split]['rows']:
            L.append('| %s | %s | %d | %d | %d | %d | %d | %d |' % (split, d['checkpoint'][:12], d['tasks'], d['parents'], d['c_eq_p'], d['c1'], d['c2'], d['c3']))
    L += ['', 'Totals: ' + '; '.join('%s %d checkpoints, %d tasks' % (k, v['checkpoints'], v['tasks']) for k, v in res['splits'].items()) +
          '; parts rows placed on their planned checkpoint %d of %d.' % (res['c4_parts']['ok'], res['c4_parts']['task_rows']), '',
          'Coverage (a vacuous audit fails): %s.' % ('ok' if res['coverage']['ok'] else 'FAIL: ' + '; '.join(res['coverage']['problems'])), '',
          'Ruling 78 (held-out mounts = the %d held-out parents\' facts and source store only): %s.' % (
              res['ruling78']['parents'], ('ok, staged %s' % json.dumps(res['ruling78']['staged'])) if res['ruling78']['ok'] else 'FAIL: ' + '; '.join(res['ruling78']['problems'])), '',
          '| mount (script:line or inspect) | container | host source | class | ok |', '|---|---|---|---|---|']
    for m in res['mounts']:
        L.append('| %s | %s | %s | %s%s | %s |' % (m['source'], m['container'], m['host'][-70:], m['cls'], (' (' + ', '.join(m['files'][:3]) + ')') if m['files'] else '', 'yes' if m['ok'] else 'NO'))
    L += ['', 'Training code (train/kge.py) opens no task or truth file: %s.' % ('yes' if res['kge_reads_no_task_file']['ok'] else 'NO ' + str(res['kge_reads_no_task_file']['open_lines'])),
          '', '### Tuning truth inside the mounted eval/ folder (ruling 72)', '',
          'The whole eval/ folder is mounted read-only in: %s. Every file in it:' % (', '.join(res['eval_mounted_in']) or 'no listed container'), '',
          '| file | class | bytes | sha256 | why |', '|---|---|---|---|---|'] + [
          '| %s | %s | %d | %s | %s |' % (e['file'], e['cls'], e['bytes'], e['sha256'][:16], e['why']) for e in res['eval_files']] + [
          '', 'Code lines showing that training takes no task and scoring takes only (task id, seed, candidates):', ''] + [
          '- `%s:%d` %s' % (c['file'], c['line'], c['text'].replace('|', '/')) for c in res['code_evidence']['lines']] + [
          '', 'Lines of train/stageB.py, train/kge.py, train/proj.py, export/checkpoints.py that read a task\'s truth key: %s.' % (
              'none' if not res['code_evidence']['truth_key_reads'] else res['code_evidence']['truth_key_reads']), '',
          'Failures: %d.%s' % (len(res['failures']), '' if not res['failures'] else ' First: ' + json.dumps(res['failures'][0], default=list)[:300]), '',
          DISCLOSURE_35, '']
    with open(a['out_md'], 'w') as f: f.write('\n'.join(L))
    print('leak audit', 'PASS' if res['ok'] else 'FAIL', json.dumps({k: (v['checkpoints'], v['tasks']) for k, v in res['splits'].items()}),
          'failures', len(res['failures']), 'mount rows', len(res['mounts']), 'coverage', res['coverage']['problems'] or 'ok',
          'ruling78', res['ruling78']['problems'][:3] or 'ok', 'test' if test else '', flush=True)
    return res


if __name__ == '__main__':
    main(sys.argv[1:])
