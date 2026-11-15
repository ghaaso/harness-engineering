"""Plumbing test, rulings 49 and 50 taken apart (test_r49_52 sees them only through the final assignment).
Tuning and held-out task-parent shas only (export/); no task, truth or sealed file is read. CODE=pre|post.
  r49-eligible  for every ordered pair (C, P) of distinct parents of one split: the code's "C may serve P" equals
                ruling 49 (C a git ancestor of P and ancestors.txt(C) a subset of ancestors.txt(P); plus not later
                than P in ruling 50's order, item 16 / ruling 60), re-derived from the raw files. Pre-M code:
                ck.is_ancestor_or_self (commits.jsonl listing).
  r49-guard     the subset condition binds: one valid git-ancestor pair whose ancestors.txt(C) is given one extra
                commit P's facts do not hold must become ineligible, and check_assignment must refuse it
                (in the data no git-ancestor pair fails the subset test, so only a constructed case shows the guard).
  r50-order     the parent order the code walks (checkpoint stride, "latest") equals (author time, committer time,
                sha); count of positions that differ, and whether the s = 3 stride set differs.
Prints one line per check and RESULT PASS|FAIL."""
import os, sys, json
ROOT = os.environ.get('EMB_ROOT', '/w')
sys.path[:0] = [os.path.join(ROOT, 'train'), os.path.join(ROOT, 'export')]
import checkpoints as ck

EXP = os.path.join(ROOT, 'export')
P = {r['sha']: r for r in (json.loads(l) for l in open(os.path.join(EXP, 'parents.jsonl')) if l.strip())}
G = {r['sha']: r for r in (json.loads(l) for l in open(os.path.join(EXP, 'parents_git.jsonl')) if l.strip())}
H = {s: set(l.strip() for l in open(os.path.join(EXP, 'graphs', s, 'ancestors.txt')) if l.strip()) for s in P}
key = lambda s: (G[s]['author_time'], G[s]['committer_time'], s)
ganc = lambda s: set(G[s]['git_ancestor_parents'])
M = hasattr(ck, 'Facts')
F = ck.Facts() if M else None


def want(c, p): return c in ganc(p) and H[c] <= H[p] and key(c) < key(p)


def code_valid(c, p): return F.valid(c, p) if M else ck.is_ancestor_or_self(c, p, P)


ok = {}
for split in ('tune', 'heldout'):
    sp = [s for s, r in P.items() if split in r['splits']]
    missed = wrong = n = 0
    for p in sp:
        for c in sp:
            if c == p: continue
            n += 1; w, g = want(c, p), code_valid(c, p)
            missed += int(w and not g); wrong += int(g and not w)
    ok['r49_eligible_' + split] = missed == 0 and wrong == 0
    print('r49-eligible split=%s pairs=%d ruling-49-valid=%d code-accepts=%d missed(valid but refused)=%d wrong(accepted but invalid)=%d %s' % (
        split, n, sum(want(c, p) for p in sp for c in sp if c != p), sum(code_valid(c, p) for p in sp for c in sp if c != p),
        missed, wrong, 'ok' if ok['r49_eligible_' + split] else 'VIOLATED'), flush=True)

if M:
    tune = F.split_parents('tune')
    pair = next((c, p) for p in tune for c in tune if c != p and F.valid(c, p))
    c, p = pair
    before = F.valid(c, p)
    F._hist[c] = F.hist(c) | {'0' * 40}            # one commit in C's history that P's facts do not hold
    after = F.valid(c, p)
    try:
        ck.check_assignment('tune', {p: c}, [c], F); refused = False
    except AssertionError as e:
        refused = True
    F._hist.pop(c)
    ok['r49_guard'] = before and not after and refused
    print('r49-guard pair %s<-%s valid before %s, with a dropped commit in C history valid %s, check_assignment refused %s %s' % (
        p[:8], c[:8], before, after, refused, 'ok' if ok['r49_guard'] else 'VIOLATED'), flush=True)
else:
    ok['r49_guard'] = False
    print('r49-guard absent: the pre-M code has no subset condition (no Facts.valid / check_assignment) VIOLATED', flush=True)

for split in ('tune', 'heldout'):
    sp = [s for s, r in P.items() if split in r['splits']]
    exp = sorted(sp, key=key)
    got = F.split_parents(split) if M else sorted(sp, key=lambda s: P[s]['order_' + split])
    diff = sum(a != b for a, b in zip(exp, got))
    s3_exp = {x for i, x in enumerate(exp) if i % 3 == 0}
    s3_got = {x for i, x in enumerate(got) if i % 3 == 0}
    ok['r50_order_' + split] = diff == 0 and s3_exp == s3_got
    print('r50-order split=%s parents=%d positions differing from (author, committer, sha) order=%d stride-3 sets differ=%s %s' % (
        split, len(sp), diff, s3_exp != s3_got, 'ok' if ok['r50_order_' + split] else 'VIOLATED'), flush=True)
print('RESULT', 'PASS' if all(ok.values()) else 'FAIL', 'test_r49_50_detail', json.dumps(ok), flush=True)
