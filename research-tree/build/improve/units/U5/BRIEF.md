# U5 brief: B4, a graph neural network with file text and weighted edges (task D4), kind build, Sonnet

Deliverable: `units/U5/report.md`, the code under `code/U5/`, B4's score column in U4's feature tables for the training (cross-fitted, see 3), tuning and held-out blocks, and B4's held-out ranking files.

Read `../BRIEF-COMMON.md` first (its rules bind you; the owner's words it points to outrank everything); then row B4 in `CANDIDATES.md`, U4's `units/U4/READY.md` and `report.md` (training blocks, cutoffs, features, the Qwen3 file embeddings, how to run U4's code), and `research-tree/build/runbig/card/d4/`.

1. An inductive link predictor in plain torch (torch-geometric is not installed and is not to be): GraphSAGE (mean aggregation) and GAT (2 heads), 1 or 2 layers, on the graph at each block's cutoff: co-change edges weighted by decayed count (half-life chosen on tuning), import edges, folder edges. Node features: the frozen Qwen3-Embedding-0.6B file embeddings U4 computed (SweRankEmbed-Small's as the variant). A pair head over the two node vectors plus U4's count features for the pair.
2. Trained on seed-to-truth pairs of U4's training blocks (graph and features from before each block's cutoff), negatives sampled from the candidates U4 scores; sweep layers, hidden 64/128, edge weighting, node features, negatives 5/20 on tuning; choose by tuning pooled P@10; freeze.
3. Training-block scores for the stack: cross-fitted (each training block scored by a model that did not train on it, 4 folds by time) so U7's ranker does not see in-sample scores; tuning and held-out scored by the frozen model.
4. Card: about 1-3 hours in CANDIDATES.md; one job at a time under `CR/GPU.lock`. A test that no edge or feature for a block comes from at or after its cutoff.

End your reply with: the frozen choice, B4's tuning P@10 per repository and pooled against the best untrained arm and against U4's B2 on the same blocks, card hours used.
