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
Output: a markdown table for AUDIT.md (per split and checkpoint) with ruling 35's disclosure, and a JSON file.
usage: python leak_audit.py --repo <repo> --facts <facts cache> --heldout-tasks <build tasks.jsonl>
         [--plan PATH] [--scripts a.sh,b.sh] [--mounts inspect.json,...] [--parts dir,...] [--lane-host C:/...]
         [--out-md PATH] [--out-json PATH]
         [--override-assign split:P=C,...]   (tests only: replace assignments to show a violation is caught)
"""
import os, sys, json, re, subprocess, collections, datetime
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.environ.get('EMB_ROOT') or os.path.dirname(HERE)

DISCLOSURE_35 = ('Ruling 35 (disclosure): while building the evaluation core, one builder\'s look at a temp file showed the names '
                 'of files in two held-out commits (dated 2026-08-03). No truth was computed or used from it; tuning truth came '
                 'from git for the June commits only.')
TUNE_TRUTH = ('eval/tune_tasks.jsonl', 'eval/tune_commits.jsonl', 'eval/git/pilot_rows.tsv', 'eval/git/june_namestatus.txt')


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


def audit_mounts(scripts, inspects, lane_host):
    rows = []
    for sp in scripts:
        txt = open(sp, encoding='utf-8', errors='replace').read()
        heldout = 'heldout' in os.path.basename(sp)
        for ln, src, dst in mounts_of_script(sp):
            hs = expand_vars(src, txt)
            cls, files = classify(hs, lane_host, 'script')
            ok = cls != 'heldout_truth'
            rows.append(dict(source='%s:%d' % (os.path.basename(sp), ln), host=hs, dest=dst, container='held-out' if heldout else 'stage B / tuning',
                             cls=cls, files=files[:6], ok=ok))
    for ip in inspects:
        j = json.load(open(ip)); name = os.path.basename(ip)
        heldout = 'heldout' in name or 'kge-H' in name
        for m in (j if isinstance(j, list) else [j]):
            hs = m.get('Source', ''); cls, files = classify(hs, lane_host, 'inspect')
            ok = cls != 'heldout_truth'
            rows.append(dict(source=name, host=hs, dest=m.get('Destination', ''), container='held-out' if heldout else 'stage B / tuning',
                             cls=cls, files=files[:6], ok=ok))
    return rows


def kge_reads_no_task_file():
    txt = open(os.path.join(HERE, 'kge.py'), encoding='utf-8').read()
    hits = [w for w in ('tune_tasks', 'tasks.jsonl', 'truth', 'sealed', 'references') if w in txt]
    # 'truth' occurs only in comments about the stage-A split? list each hit with its line for the table
    lines = [(i, l.strip()[:100]) for i, l in enumerate(txt.splitlines(), 1) if any(w in l for w in hits) and 'open(' in l]
    return dict(ok=not lines, open_lines=lines)


def main(argv):
    a = dict(plan=os.path.join(HERE, 'stageB', 'plan.json'), scripts='', mounts='', parts='', override='',
             out_md=os.path.join(HERE, 'leak_audit', 'AUDIT-leak.md'), out_json=os.path.join(HERE, 'leak_audit', 'leak_audit.json'))
    for k, v in zip(argv[::2], argv[1::2]): a[k[2:].replace('-', '_')] = v
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
    res = dict(written=datetime.datetime.utcnow().isoformat() + 'Z', s=plan['s'], plan_hash=plan.get('plan_hash'), splits={}, failures=[])
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
    c4 = []
    for pd in filter(None, a['parts'].split(',')):
        for dp, dn, fn in os.walk(pd):
            if 'counts.json' in fn and not dp.endswith(('.part', '.model')):
                C = os.path.basename(dp)
                for tid, rec in json.load(open(os.path.join(dp, 'counts.json'))).items():
                    P = rec.get('parent'); sp = 'tune' if P in assign['tune'] else 'heldout'
                    ok = rec.get('checkpoint') == C == assign[sp].get(P)
                    c4.append(ok)
                    if not ok: res['failures'].append(dict(split=sp, task=tid, parent=P, checkpoint=C, c4=False))
    res['c4_parts'] = dict(task_rows=len(c4), ok=sum(c4))
    res['mounts'] = audit_mounts([p for p in a['scripts'].split(',') if p], [p for p in a['mounts'].split(',') if p], a.get('lane_host'))
    res['kge_reads_no_task_file'] = kge_reads_no_task_file()
    for m in res['mounts']:
        if not m['ok']: res['failures'].append(dict(mount=m))
    res['ok'] = not res['failures'] and res['kge_reads_no_task_file']['ok']
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
          '| mount (script:line or inspect) | container | host source | class | ok |', '|---|---|---|---|---|']
    for m in res['mounts']:
        L.append('| %s | %s | %s | %s%s | %s |' % (m['source'], m['container'], m['host'][-70:], m['cls'], (' (' + ', '.join(m['files'][:3]) + ')') if m['files'] else '', 'yes' if m['ok'] else 'NO'))
    L += ['', 'Training code (train/kge.py) opens no task or truth file: %s.' % ('yes' if res['kge_reads_no_task_file']['ok'] else 'NO ' + str(res['kge_reads_no_task_file']['open_lines'])),
          'Failures: %d.%s' % (len(res['failures']), '' if not res['failures'] else ' First: ' + json.dumps(res['failures'][0], default=list)[:300]), '',
          DISCLOSURE_35, '']
    with open(a['out_md'], 'w') as f: f.write('\n'.join(L))
    print('leak audit', 'PASS' if res['ok'] else 'FAIL', json.dumps({k: (v['checkpoints'], v['tasks']) for k, v in res['splits'].items()}),
          'failures', len(res['failures']), 'mount rows', len(res['mounts']), flush=True)
    return res


if __name__ == '__main__':
    main(sys.argv[1:])
