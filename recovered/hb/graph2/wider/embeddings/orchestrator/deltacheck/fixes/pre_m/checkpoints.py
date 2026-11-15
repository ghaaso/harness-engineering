"""Checkpoint selection under the leak rule (protocol addendum 8, item 16).

Data: export/parents.jsonl, one row per distinct T1 task parent:
  sha, splits (["tune"] or ["heldout"]), commit_time (the parent's own commit time, from the facts cache
  meta.json), order_tune / order_heldout (1-based rank by commit_time within the split), order_all,
  ancestor_parents = the other T1 task parents listed in this parent's facts-cache commits.jsonl.
Ancestry is exactly "C == P or C in P.ancestor_parents" (commits.jsonl defines it; the history has
branches, so ancestry is NOT the same as "earlier in time"). The full ancestor list per parent is in
export/graphs/<sha>/ancestors.txt.
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
