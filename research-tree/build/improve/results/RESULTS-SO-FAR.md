# Improvement round: results so far (collected 2026-11-25 about 23:15 UTC)

All figures are on the TUNING data (the three repositories' tuning queries or commits), which the settings were chosen on, so they are optimistic. No held-out number has been opened or scored; only U7 scores held-out, once. Baselines: D2 text search, card BM25 (held-out Acc@10 0.653, gate +6 points; on tuning 0.713). D4 file co-change, best untrained arm (held-out P@10 0.120, gate +0.02; on tuning 0.124).

## Text search (D2), tuning Acc@10, macro over fixflow, clinic, zulip
- card BM25 0.713. A7 text arm 0.833. A3 fusion 0.909 (0.886 five-fold). A2 LambdaMART over all signals 0.919 (0.916 five-fold). U1, done.
- A4 (7B reranker of A2's top 30, 4-bit) 0.933, no real gain over A2 (+0.014 [-0.002, +0.039]). A6 (SweRankEmbed-Large, 4-bit, untrained on our data) 0.815, worse than A2. U3, done, about 11 card hours.
- A5 fine-tuned retrievers (U2, still training): SweRankEmbed-Small 0.749 untuned, 0.837 tuned so far; Qwen3-Embedding-0.6B LoRA 0.777 untuned, 0.862 tuned so far. Both below A2 on tuning so far; epochs, negatives and data stages are still running.

## File co-change (D4), tuning P@10, pooled over 260 commits
- Best untrained 0.124. B3 EASE 0.123 (no gain). B2 LambdaMART 0.138 (+0.013, under the +0.02 line). U4, done.
- B4 graph network (GraphSAGE) 0.1314 (+0.007 over best untrained, below B2). U5, done, 22 runs, CPU.
- B5 temporal models (U6, still running): best DyGFormer 0.108, best TGN 0.041; all below counting. 71 of 72 sweep runs have results.
- Quick checks T1-T3 (done): the graph adds nothing beyond its count inputs in U5's network; BM25 of the seed's own diff added to B2 gives 0.153 (+0.029 over best untrained, above the +0.02 line, in-sample, mostly zulip). This is the one result so far past a gate on tuning.

## Still running or waiting
- U2: the Qwen3 epochs stage (step 1400 of 5610) and the SweRank negatives stage (waiting for the card alone); then finals, A5 columns, held-out files, report.
- U6: one zulip bipartite-TGN setting waits for the card; then finish.sh (choice, four retrained time folds, merge into U4's tables, held-out files).
- The card is overclocked; one driver reset so far (15:45 UTC, U3's A6 requeued, nothing lost). Disk C: about 18-30 GB free.

## Not yet scored
Everything on held-out: A1 and B1 stacks (U7, not started), the cut-offs refuter, the owner's page. U2 and U6 have no report yet.

## Not tested
One seed per graph run; one A4 prompt, one A6 form; more than one repository family; other graph and temporal forms. One null here does not rule a family out.

Per unit: U1.md U2.md U3.md U4.md U5.md U6.md U7.md T1-T3.md. Files: MANIFEST.md.
