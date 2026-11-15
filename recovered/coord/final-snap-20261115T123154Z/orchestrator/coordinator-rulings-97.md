# Coordinator ruling 97, after the lane's read-only audit of the arm code for unseen kinds

Ruled by the coordinator on 2026-11-15 at about 03:25Z (file hash and exact time are in `progress.jsonl`,
line `rulings_97`), while stage B was training and before any stage-B or held-out score had been read.
Source: `r58c/closed-lists/FINDINGS.md` (sha256 c3e6211e0ea7091f627e1c3ca4d86d23d9941dba82e192083e6f1341beacbf8f).
It goes to the end of section M word for word.

97. The new layer of the held-out graphs: what was read, and what follows.
    (a) Ruling 96's exception is extended by one step, again by the coordinator only: per held-out
    parent, the number of triples of the new relation and the kinds of their two ends, as counts by
    kind; no path and no pair. Found: between 0 and 90 such triples a parent (median 46; one parent has
    none); each runs from a new node to an existing entity, four in five of them to a file and the rest
    to symbol-level and other non-file entities; every new node carries a path, a file at the
    repository root outside the three code areas, so its area is `other` and it is not a code file. The
    relation's name has no tab or newline and does not end in `__inv`. The lane gets these counts and
    kinds and no name.
    (b) No frozen stage-B code changes. The audit found no closed list of relations or kinds and no
    crash on a new one; what changes on held-out is E5's routing as coded: a file seed tied to the new
    nodes can get the `other` specialist as its second one, and that specialist is skipped where it has
    no co_changed fact. This is item 13's rule applied to a graph with a new layer, not a defect. If E5
    is the arm frozen for held-out, the audit reports, computed after the run with `kge.py`'s own
    routing function, on how many held-out tasks the second specialist was `other` and on how many a
    specialist was skipped; RESULT.md's limits name it in either case.
    (c) The ruling-79 probe draws its 37th relation as edges from non-code `other` nodes to code
    entities, mostly files, with the counts of (a), not as random pairs.
    (d) On held-out the candidate pool and the simple rankers run on a file-collapsed graph in which
    the new nodes are merged into one non-code file node that links the files they point to. Pools on
    held-out are therefore wider, for every method alike. RESULT.md says so and shows the median pool
    size of the late 50 beside that of the held-out tasks.
    (e) The injected graph of ruling 96(a) follows (a): new nodes with a root-level non-code path, area
    `other`, tied mostly to files and partly to symbol-level and non-file entities, about fifty edges;
    one of the rehearsal's graphs has a checkpoint whose `other` specialist has no co_changed fact.
