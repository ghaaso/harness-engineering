# Refuter brief: one blind check of one unit's code before its held-out run, kind refute, Opus

The coordinator names the unit (U1, U4, or "the training cut-offs of U2, U5, U6") in your prompt.

Deliverable: `research-tree/build/refute/IMPROVE-<unit>.md`: breaking findings first (each with a failing test or a command whose output shows it), then the non-breaking list. Breaking means: it would change a held-out number or make it invalid.

Read `research-tree/build/improve/BRIEF-COMMON.md` (the rules the unit was built under) and `research-tree/build/improve/units/<unit>/BRIEF.md` (what it was asked to build), then the code under `research-tree/build/improve/code/<unit>/` and its outputs under `CR/improve/<unit>/` (CR = `C:/Users/User/Documents/projects/card-run-2026-11/`). Do not read the unit's READY.md or report until you have your own findings (you are blind to its claims); then check its claimed tuning numbers against what the code produces.

Check, in this order: (1) leakage in time: any training row, vote, count, embedding, graph edge, memory event or label from at or after a query's snapshot or a block's cutoff; any tuning query or block inside training; in-sample scores fed to a stacked ranker; (2) held-out untouched: no held-out truth read, no choice made on held-out; (3) the scorer and query sets equal the card run's (`research-tree/build/runbig/card/`), the card run's untrained arms reproduced on the same queries; (4) the ranker fitted and early-stopped on what the brief says; (5) the feature tables' held-out rows built by the same code path as tuning.

Run code only in Docker with `--network none`; the card only under `CR/GPU.lock` and only if needed. No edits to the unit's code; tests you write go in `research-tree/build/improve/code/R-<unit>/`. One pass; no second round. End your reply with: the number of breaking findings and one line each.
