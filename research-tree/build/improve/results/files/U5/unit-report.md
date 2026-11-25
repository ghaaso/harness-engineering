# U5 report: B4, GNN link predictor (task D4)

**Frozen choice:** `sage_L1_H128_N20_hl90_qwen_s0` = GraphSAGE (mean), 1 layer, hidden 128, 20 negatives, co-change edges weighted by decayed count with half-life 90 days, frozen Qwen3-Embedding-0.6B file embeddings as node features, seed 0, early-stopped at epoch 5. Pair head over the two node vectors plus U4's count features. Plain torch, no torch-geometric.

## Result on the tuning blocks (260 commits; from `CR/improve/U5/final.json`)
| | FixFlow (34) | clinic (34) | zulip (192) | pooled |
|---|---|---|---|---|
| B4 P@10 | 0.2266 | 0.1373 | 0.1135 | **0.1314** |
| best untrained arm (U4 report) | 0.212 | 0.117 | 0.110 | 0.124 |
| B2 LambdaMART (U4, in-sample on tuning) | 0.244 | 0.152 | 0.116 | 0.138 |
| B4 minus best untrained | +0.015 | +0.020 | +0.003 | +0.007 |
| B4 minus B2 | -0.017 | -0.015 | -0.003 | -0.007 |

B4 is above the best untrained arm in all three repositories but by a small margin (pooled +0.007, below the +0.02 line), and below B2 everywhere. No paired interval was computed for B4. Note that the tuning figure for B4 is the best of 22 runs, so it is optimistic too; B2's is as well. Only held-out can judge.

## What was swept (22 runs, all seed 0, chosen by pooled tuning P@10)
- Stage 1: architecture (sage, gat 2 heads) x layers (1, 2) x hidden (64, 128) x negatives (5, 20), edge weighting hl90, Qwen3 nodes (16 runs).
- Stage 2a: edge weighting at the stage-1 best: hl30, hl365, raw count, binary (hl90 was already run).
- Stage 2b: node features at the best: none, SweRankEmbed-Small embeddings.
- Spread is small: the 22 pooled values lie between 0.1275 and 0.1314. SAGE runs sit at 0.128 to 0.131, GAT at 0.128 to 0.130. The differences between neighbouring runs are within what seed noise would likely give; this was not measured (one seed each).
- Edge weighting, none vs Qwen3 vs SweRankEmbed: Qwen3 0.1314, none 0.1291, SweRankEmbed 0.1282.

## Outputs
- Scores: `CR/improve/U5/scores/{train,tune,heldout}/<repo>/<k>.npy`. Training blocks are cross-fitted (4 folds by time); tuning and held-out (37 blocks) by the frozen model. Held-out truth was not opened.
- B4's column `B4_GNN` filled in U4's tables, `CR/improve/U4/tables`: fixflow 16 tables, clinic 16, zulip 135 (167 in all), none already filled before. `fill_tables.py` asserts all other columns unchanged and no lost rows.

## Notes
- **Hardware:** the sweep ran on the CPU (the driver log shows `cpu work` runs; the card worker was frozen/killed on 25 Nov 07:46 so the driver could go on, and the plan finished on CPU). Several GPU job attempts failed with rc=1 earlier in the log; the runs that count are the 22 in `choice.json`. Card hours are not separately metered here; see `logs/gpu-mem-*.txt` and `driver.log`.
- **"Graph S2" row:** I found no row or file by that name in U5's files, the briefs, or `CR/improve/U5`. The only S2 in U5's code is stage 2 of the sweep (2a, 2b above), whose state is finished. If a different row is meant, I did not identify it.
- **Not tested:** more than one seed; 3 or more layers; hidden sizes other than 64/128; negatives other than 5/20; the weighting and node-feature variants only at the stage-1 best, not crossed with other settings; no GAT with other head counts; no held-out score (U7's); no variant without the U4 count features in the pair head; no other repository than these three. One result on these forms and these repositories does not rule out graph neural networks as a family.
