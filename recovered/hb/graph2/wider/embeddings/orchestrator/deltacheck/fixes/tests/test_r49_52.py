"""Plumbing test, rulings 49-52 (tuning data and task-parent shas only; no held-out task or truth is read).
For s in (1, 10) and both splits, takes the assignment the code under test produces and re-derives every rule
from the raw files (export/parents_git.jsonl from git, graphs/<sha>/ancestors.txt, graphs0/<sha>/sizes.json):
  r49  C == P, or C a git ancestor of P with ancestors.txt(C) subset of ancestors.txt(P) (and not later than P,
       item 16 / ruling 60's audit)
  r50  no valid checkpoint of the same plan is later than C in (author time, committer time, sha) order
  r51  no parent with a co_changed fact is served by a checkpoint without one
  r52  lag = task parents of the split that are P or git ancestors of P, minus C and C's git ancestors
  s=1  C == P and lag 0 for every parent
Prints one line per (split, s) and RESULT PASS|FAIL. Works on the pre-M code (assignment_r33 + stageB.hist lag)
and on the M code (assignment_m)."""
import os, sys, json, collections
ROOT = os.environ.get('EMB_ROOT', '/w')
sys.path[:0] = [os.path.join(ROOT, 'train'), os.path.join(ROOT, 'export')]
import checkpoints as ck

EXP = os.path.join(ROOT, 'export')
P = {r['sha']: r for r in (json.loads(l) for l in open(os.path.join(EXP, 'parents.jsonl')) if l.strip())}
G = {r['sha']: r for r in (json.loads(l) for l in open(os.path.join(EXP, 'parents_git.jsonl')) if l.strip())}
H = {s: set(l.strip() for l in open(os.path.join(EXP, 'graphs', s, 'ancestors.txt')) if l.strip()) for s in P}
CO = {s: json.load(open(os.path.join(EXP, 'graphs0', s, 'sizes.json')))['co_changed_triples'] for s in P}
key = lambda s: (G[s]['author_time'], G[s]['committer_time'], s)
ganc = lambda s: set(G[s]['git_ancestor_parents'])
tasks = [json.loads(l) for l in open(os.path.join(ROOT, 'eval', 'tune_tasks.jsonl')) if l.strip()]
ntask = collections.Counter(t['parent'] for t in tasks)


def valid(c, p):
    return c == p or (c in ganc(p) and H[c] <= H[p] and key(c) < key(p))


def expected_lag(p, c, split):
    sp = {s for s, r in P.items() if split in r['splits']}
    return len((({p} | ganc(p)) & sp) - (({c} | ganc(c)) & sp))


def code_assignment(split, s):
    if hasattr(ck, 'assignment_m'):
        a, lag, info = ck.assignment_m(split, s)
        return a, lag, sorted(set(info['checkpoints'])), 'M'
    import stageB as sb  # pre-M: ruling 33 + commits.jsonl ancestry + the old lag
    a, added = ck.assignment_r33(split, s, P)
    cps, _ = ck.checkpoints_r33(split, s, P)
    lag = {p: len(sb.hist(p, P) - sb.hist(c, P)) for p, c in a.items()}
    return a, lag, sorted(set(cps)), 'pre-M'


fails = 0
for s in (1, 10):
    for split in ('tune', 'heldout'):
        a, lag, cps, ver = code_assignment(split, s)
        v = collections.Counter(); vt = collections.Counter()
        for p, c in a.items():
            w = ntask[p] if split == 'tune' else 0
            if not valid(c, p): v['r49'] += 1; vt['r49'] += w
            if any(valid(x, p) and key(x) > key(c) for x in cps): v['r50'] += 1; vt['r50'] += w
            if CO[c] == 0 and CO[p] > 0: v['r51'] += 1; vt['r51'] += w
            if lag[p] != expected_lag(p, c, split): v['r52'] += 1; vt['r52'] += w
            if s == 1 and (c != p or lag[p] != 0): v['s1'] += 1; vt['s1'] += w
        on_zero = sum(1 for p, c in a.items() if CO[c] == 0)
        bad = sum(v.values())
        fails += bad
        print('%s split=%s s=%d checkpoints=%d parents=%d parents_on_zero_co_checkpoint=%d violations(parents)=%s violations(tune tasks)=%s %s' % (
            ver, split, s, len(set(a.values())), len(a), on_zero, dict(v), dict(vt), 'ok' if not bad else 'VIOLATED'), flush=True)
print('RESULT', 'PASS' if fails == 0 else 'FAIL', 'test_r49_52', 'violations', fails, flush=True)
