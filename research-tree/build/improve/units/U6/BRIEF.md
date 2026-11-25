# U6 brief: B5, temporal graph models DyGFormer and TGN from DyGLib (task D4), kind build, Sonnet

Deliverable: `units/U6/report.md`, the code under `code/U6/`, B5's score columns in U4's feature tables (training cross-fitted by time, tuning, held-out), and B5's held-out ranking files.

Read `../BRIEF-COMMON.md` first (its rules bind you; the owner's words it points to outrank everything); then row B5 in `CANDIDATES.md`, U4's `units/U4/READY.md` and `report.md` (blocks, cutoffs, feature tables), the DyGLib clone in `CR/tools/DyGLib` (its README and models; the commit is in `CR/FETCHED.md`), and `research-tree/build/runbig/card/d4/`.

1. First check, in `d2-embed-gpu:3` with the network off, that DyGLib's needed imports are present (its requirements are not to be installed; nothing may be downloaded). If one is missing and DyGLib's model code can be used without it (copy only the model and neighbour-sampler code into `code/U6/`, keep its licence notice), do that; if not, stop and report what is missing in your final reply.
2. The co-change event stream: one event per file pair per commit (or a commit-node bipartite stream; choose on tuning), timestamps from commit times, edge features the pair's decayed count at that time; node features U4's Qwen3 file embeddings. Memory and neighbours only from events before each block's cutoff.
3. DyGFormer and TGN as DyGLib defines them; sweep neighbours 20/32, learning rate, epochs on tuning; choose by tuning pooled P@10; freeze. Score each block's seed-candidate pairs U4 scores. Training-block scores cross-fitted by time (4 folds) for U7's stack.
4. Card: about 3-6 hours in CANDIDATES.md (the record notes out-of-memory on large streams: batch down before giving up); one job at a time under `CR/GPU.lock`. A test that no event at or after a block's cutoff enters its memory or neighbours.

End your reply with: the frozen choice, B5's tuning P@10 per repository and pooled against the best untrained arm and against U4's B2 on the same blocks, card hours used.
