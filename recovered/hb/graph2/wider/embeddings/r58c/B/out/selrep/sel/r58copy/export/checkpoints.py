"""Checkpoint selection under the leak rule (protocol addendum 8, item 16).

Data: export/parents.jsonl, one row per distinct T1 task parent:
  sha, splits (["tune"] or ["heldout"]), commit_time (the parent's own commit time, from the facts cache
  meta.json), order_tune / order_heldout (1-based rank by commit_time within the split), order_all,
  ancestor_parents = the other T1 task parents listed in this parent's facts-cache commits.jsonl.
Ancestry is exactly "C == P or C in P.ancestor_parents" (commits.jsonl defines it; the history has
branches, so ancestry is NOT the same as "earlier in time"). The full ancestor list per parent is in
export/graphs/<sha>/ancestors.txt.
SUPERSEDED for stage B and the held-out plan by rulings 49-52 (section M): see Facts / checkpoints_m /
assignment_m at the end of this file. The functions above stay for the record (stage A's notes used them).
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))


def load_parents(path=os.path.join(HERE, 'parents.jsonl')):
    return {r['sha']: r for r in (json.loads(l) for l in open(path) if l.strip())}


def is_ancestor_or_self(c, p, parents):
    return c == p or c in set(parents[p]['ancestor_parents'])


def checkpoints_every(split, s, parents):
    """Every s-th distinct task parent of a split in date order, the first always included."""
    order = sorted((r for r in parents.values() if split in r['splits']), key=lambda r: r['order_' + split])
    return [r['sha'] for i, r in enumerate(order) if i % s == 0]


def latest_checkpoint(p, checkpoints, parents):
    """The latest checkpoint C (by commit_time) with C == P or C an ancestor of P; None if there is none."""
    ok = [c for c in checkpoints if is_ancestor_or_self(c, p, parents)]
    return max(ok, key=lambda c: (parents[c]['commit_time'], c)) if ok else None


def assignment(split, s, parents=None):
    """{task parent: checkpoint parent} for one split and step s, plus the parents with no checkpoint."""
    parents = parents or load_parents()
    cps = checkpoints_every(split, s, parents)
    out = {p: latest_checkpoint(p, cps, parents) for p, r in parents.items() if split in r['splits']}
    return out, [p for p, c in out.items() if c is None]


if __name__ == '__main__':
    P = load_parents()
    for split in ('tune', 'heldout'):
        for s in (1, 3, 6, 10):
            a, none = assignment(split, s, P)
            print(split, 's=%d' % s, 'checkpoints', len(set(v for v in a.values() if v)), 'parents', len(a), 'without checkpoint', len(none))


# ---- ruling 33 (addendum 8): the history branches, so ancestry is not time order. Any parent with no
# checkpoint equal to it or among its ancestors under stride s becomes a checkpoint itself. The old
# functions above are unchanged; these are the ones stage B uses.
def checkpoints_r33(split, s, parents=None):
    """(checkpoints, added): every s-th task parent of the split in date order (first included), plus each
    parent left without an ancestor-or-self checkpoint, taken in date order (an added parent can cover a
    later descendant, so the walk is in date order)."""
    parents = parents or load_parents()
    cps = checkpoints_every(split, s, parents)
    order = sorted((r for r in parents.values() if split in r['splits']), key=lambda r: r['order_' + split])
    added = []
    for r in order:
        if latest_checkpoint(r['sha'], cps + added, parents) is None:
            added.append(r['sha'])
    return cps + added, added


def assignment_r33(split, s, parents=None):
    """{task parent: checkpoint parent} under ruling 33 (every parent has one), plus the ruling-33 additions."""
    parents = parents or load_parents()
    cps, added = checkpoints_r33(split, s, parents)
    out = {p: latest_checkpoint(p, cps, parents) for p, r in parents.items() if split in r['splits']}
    assert all(out.values())
    return out, added


# ---- rulings 49-52 (addendum 8 section M, 2026-11-14). The functions above are kept for the record; stage B
# and the held-out plan use the ones below. Data: parents.jsonl (splits), parents_git.jsonl (written on the host
# by git_parents.js: author/committer time, git ancestry among the task parents), graphs/<sha>/ancestors.txt
# (the commits in the parent's facts history) and graphs0/<sha>/sizes.json (co_changed triples the models train on).
#   r49  C may serve P when C == P, or C is a git ancestor of P AND C's ancestors.txt is a subset of P's.
#        Item 16's "at or before P" (checked by ruling 60's audit) is kept: C is also not later than P in
#        ruling 50's order. In the data three git-ancestor pairs (1 tune, 2 held-out) have C later than P by
#        author time; without this condition P would be served by a checkpoint later than itself even at s = 1.
#   r50  date order of parents = (author time, committer time, sha); "latest" and the stride use it.
#   r51  a parent whose latest valid checkpoint has no co_changed fact while its own graph has one becomes a
#        checkpoint itself (like r33's additions, walked in date order).
#   r52  lag of P served by C = task parents of the same split that are P or git ancestors of P, and are
#        neither C nor git ancestors of C (0 when C == P).
ANCESTRY_RULE = ('r49: C == P or (C git-ancestor of P and ancestors.txt(C) subset of ancestors.txt(P) and '
                 'order(C) < order(P)); r50 order = (author_time, committer_time, sha); r33 + r51 additions; '
                 'r52 lag over git ancestry')


class Facts:
    """Everything the M rules read, loaded once."""

    def __init__(self, root=None):
        root = root or HERE
        self.root = root
        self.P = load_parents(os.path.join(root, 'parents.jsonl'))
        self.G = {r['sha']: r for r in (json.loads(l) for l in open(os.path.join(root, 'parents_git.jsonl')) if l.strip())}
        assert set(self.G) == set(self.P), 'parents_git.jsonl does not cover parents.jsonl (rerun git_parents.js)'
        self.gitanc = {s: set(self.G[s]['git_ancestor_parents']) for s in self.P}
        self._hist = {}
        self._co = {}

    def key(self, s):
        g = self.G[s]
        return (g['author_time'], g['committer_time'], s)

    def hist(self, s):
        if s not in self._hist:
            self._hist[s] = frozenset(l.strip() for l in open(os.path.join(self.root, 'graphs', s, 'ancestors.txt')) if l.strip())
        return self._hist[s]

    def co(self, s):
        if s not in self._co:
            self._co[s] = json.load(open(os.path.join(self.root, 'graphs0', s, 'sizes.json')))['co_changed_triples']
        return self._co[s]

    def split_parents(self, split):
        return sorted((s for s, r in self.P.items() if split in r['splits']), key=self.key)

    def valid(self, c, p):
        return c == p or (c in self.gitanc[p] and self.hist(c) <= self.hist(p) and self.key(c) < self.key(p))

    def why_invalid(self, c, p):
        if c == p: return None
        out = []
        if c not in self.gitanc[p]: out.append('not a git ancestor')
        if not self.hist(c) <= self.hist(p): out.append('ancestors.txt not a subset')
        if not self.key(c) < self.key(p): out.append('later in r50 order')
        return out or None

    def latest(self, p, cps):
        ok = [c for c in cps if self.valid(c, p)]
        return max(ok, key=self.key) if ok else None

    def lag(self, p, c, split):
        sp = set(self.split_parents(split))
        return len((({p} | self.gitanc[p]) & sp) - (({c} | self.gitanc[c]) & sp))


def checkpoints_m(split, s, F=None):
    """(checkpoints in r50 order, r33 additions, r51 additions) for one split and stride s."""
    F = F or Facts()
    order = F.split_parents(split)
    cps = [p for i, p in enumerate(order) if i % s == 0]
    add33, add51 = [], []
    for p in order:
        if p in cps: continue
        c = F.latest(p, cps)
        if c is None:
            cps.append(p); add33.append(p)
        elif F.co(c) == 0 and F.co(p) > 0:
            cps.append(p); add51.append(p)
    return sorted(cps, key=F.key), add33, add51


def assignment_m(split, s, F=None):
    """{task parent: checkpoint}, {task parent: lag}, info. Asserts rulings 49-52 for every assignment."""
    F = F or Facts()
    cps, add33, add51 = checkpoints_m(split, s, F)
    out = {p: F.latest(p, cps) for p in F.split_parents(split)}
    lag = {p: F.lag(p, c, split) for p, c in out.items()}
    check_assignment(split, out, cps, F, lag)
    unscorable = sorted(p for p, c in out.items() if F.co(c) == 0)
    return out, lag, dict(checkpoints=cps, ruling33_added=add33, ruling51_added=add51,
                          parents_without_co_changed=unscorable)


def check_assignment(split, out, cps, F, lag=None):
    """The plan's assertions (r49-r52), one per assignment; raises AssertionError naming the first failure."""
    for p, c in out.items():
        assert c is not None, '%s %s: no checkpoint' % (split, p)
        assert c in cps, '%s %s: %s is not a checkpoint' % (split, p, c)
        assert F.valid(c, p), '%s %s <- %s: %s' % (split, p, c, F.why_invalid(c, p))
        assert c == p or (c in F.gitanc[p] and F.hist(c) <= F.hist(p)), 'r49 %s %s' % (p, c)
        later = [x for x in cps if F.valid(x, p) and F.key(x) > F.key(c)]
        assert not later, 'r50 %s %s: a later valid checkpoint exists %s' % (split, p, later[0])
        assert F.co(c) > 0 or F.co(p) == 0, 'r51 %s %s <- %s: checkpoint has no co_changed fact, parent has %d' % (split, p, c, F.co(p))
        if lag is not None:
            assert lag[p] == F.lag(p, c, split) and (c != p or lag[p] == 0), 'r52 %s %s' % (split, p)
    return True
