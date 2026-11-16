Explicit-state model of "Layer 1: Execution (version 2)", plain Node 24, no packages.
model.mjs: the protocol (task table, epochs, fencing, commit, watcher, wakes, replace, limits, admission, hand-over) and faults as budgeted actions.
check.mjs: BFS over all interleavings; safety (invariants + per-transition checks), deadlock, AG EF(resolved) per field, fair-cycle search for an unsuspected loop.
Run: node check.mjs            (all runs, about 40 s)   node check.mjs SPEC   (one run by id; SPEC-R1 = the spec's own R=1)
Config: 2 fields (one task each), R=2, N_max=3, one coordinator hand-over, at most 2 faults per run (FIXED-K3: 3), 1 planned task hand-over.
Time is abstract: a watcher tick waits until every healthy current child has progressed, except after a pause or at a new watcher's first evaluation.
Flags in makeParams(): one per spec mechanism (ablations switch one off) and FIX_* (the smallest fixes; all off = the spec as written).
SPEC = spec as written; FIXED = spec + fixes; A-* = one mechanism removed from FIXED (A-COMMIT-SPEC from SPEC); traces shown only where a property newly fails.
Coordinator turns are atomic except the window between a replace's fence and its stop; shortest traces are BFS-shortest in that step count.
Not modelled: spend, escrow, memory, meter, common cause, intents beyond level re-check, coordinator crash, review stages and dependencies.
