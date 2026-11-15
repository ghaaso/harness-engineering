"""Tuning truth and seeds (tune split only). Reads git output for June 2026 commits only
(eval/git/june_head.txt = `git log --format=%H|%ad|%at|%ct|%P --date=short` filtered to author dates
2026-06-01..2026-06-30; eval/git/june_namestatus.txt = `git diff-tree --no-commit-id -r --name-status -M
--root` for those commits only). No held-out commit is read.

T1 rule as the pilot applied it (graph-v2-pilot-ranking/feat.py): author date in June 2026, the commit's
modified or renamed (status M or R) code files, 2 to 30 of them. Seeds = those files (old path for a
rename); truth for a seed = the other ones.

Writes eval/tune_tasks.jsonl (one row per task) and eval/tune_commits.jsonl (one row per commit).
date_order = 1..65 by author timestamp (%at, then committer time, then sha); pilot_order = the pilot's
order (sorted by the day string, stable on git-log order, so newest first within a day).
late50 = date_order > 15; late50_pilot = pilot_order > 15 (the set behind the pilot's numbers).
"""
import json, re, os, sys
E = '/out/eval'
CODE = re.compile(r'^(backend|src|technician-app)/.*\.(py|ts|tsx|js|jsx|mjs|cjs)$')
log = [l.split('|') for l in open(E + '/git/june_head.txt').read().split('\n') if l]
files = {}; cur = None
for l in open(E + '/git/june_namestatus.txt').read().split('\n'):
    if l.startswith('@@'): cur = l[2:]; files[cur] = []
    elif l.strip(): files[cur].append(l.split('\t'))
commits = []
for i, (h, d, at, ct, p) in enumerate(log):
    if not ('2026-06-01' <= d < '2026-07-01'): continue
    ex = [f[1] for f in files[h] if f[0][0] in 'MR' and CODE.match(f[-1])]
    if 2 <= len(ex) <= 30:
        commits.append(dict(commit=h, day=d, author_time=int(at), commit_time=int(ct),
                            parent=p.split()[0] if p else None, n_parents=len(p.split()), seeds=ex, logpos=i))
pil = sorted(commits, key=lambda c: c['day'])  # stable on git-log order, as feat.py
for i, c in enumerate(pil): c['pilot_order'] = i + 1
for i, c in enumerate(sorted(commits, key=lambda c: (c['author_time'], c['commit_time'], c['commit']))):
    c['date_order'] = i + 1
for c in commits:
    c['late50'] = c['date_order'] > 15; c['late50_pilot'] = c['pilot_order'] > 15
# cross-check with the pilot's own commit list (pickle dump; tune commits only)
pc = json.load(open(E + '/git/pilot_commits.json'))
assert [c['commit'] for c in pil] == [h for h, _, _ in pc], 'commit list or order differs from the pilot'
assert all(c['seeds'] == ex for c, (_, _, ex) in zip(pil, pc)), 'seed lists differ from the pilot'
# match against tasks.jsonl (T1 tune): tasks are grouped by commit in file order
tasks = [json.loads(l) for l in open('/build/tasks/tasks.jsonl') if l.strip()]
tt = [t for t in tasks if t['set'] == 'T1' and t['split'] == 'tune']
rows = []; used = set(); j = 0
remaining = list(commits)
while j < len(tt):
    # the next commit whose parent and seed list match the run of tasks starting at j
    hit = None
    for c in remaining:
        n = len(c['seeds'])
        run = tt[j:j + n]
        if len(run) == n and all(t['parent'] == c['parent'] for t in run) and [t['seed']['path'] for t in run] == c['seeds']:
            hit = c; break
    if hit is None:
        # same seeds in another order?
        for c in remaining:
            n = len(c['seeds']); run = tt[j:j + n]
            if len(run) == n and all(t['parent'] == c['parent'] for t in run) and sorted(t['seed']['path'] for t in run) == sorted(c['seeds']):
                hit = c; break
    assert hit is not None, 'no commit matches tasks from ' + tt[j]['id']
    remaining.remove(hit)
    run = tt[j:j + len(hit['seeds'])]
    hit['task_ids'] = [t['id'] for t in run]
    for t in run:
        s = t['seed']['path']
        rows.append(dict(task_id=t['id'], commit=hit['commit'], date_order=hit['date_order'], pilot_order=hit['pilot_order'],
                         late50=hit['late50'], late50_pilot=hit['late50_pilot'], parent=hit['parent'], seed=s,
                         truth=[x for x in hit['seeds'] if x != s], commit_seeds=hit['seeds']))
    j += len(run)
assert not remaining and len(rows) == 388 and len({r['task_id'] for r in rows}) == 388
rows.sort(key=lambda r: (r['date_order'], r['task_id']))
with open(E + '/tune_tasks.jsonl', 'w') as f:
    for r in rows: f.write(json.dumps(r) + '\n')
with open(E + '/tune_commits.jsonl', 'w') as f:
    for c in sorted(commits, key=lambda c: c['date_order']):
        f.write(json.dumps({k: c[k] for k in ('commit', 'day', 'author_time', 'commit_time', 'parent', 'n_parents', 'date_order',
                                               'pilot_order', 'late50', 'late50_pilot', 'seeds', 'task_ids')}) + '\n')
l50 = {c['commit'] for c in commits if c['late50']}; l50p = {c['commit'] for c in commits if c['late50_pilot']}
print('commits', len(commits), 'tasks', len(rows), 'distinct parents', len({c['parent'] for c in commits}),
      'merge commits', sum(c['n_parents'] > 1 for c in commits))
print('late50 by time vs pilot late50: common', len(l50 & l50p), 'only time', sorted(c[:8] for c in l50 - l50p),
      'only pilot', sorted(c[:8] for c in l50p - l50))
print('task file order == commit match order:', [r['task_id'] for r in sorted(rows, key=lambda r: r['task_id'])] == [t['id'] for t in tt])
