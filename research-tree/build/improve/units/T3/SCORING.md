# T3 scoring, written before any run (2026-11-25)

Brief: `research-tree/build/briefs/SMALL-MEASUREMENTS.md` (the owner's words in `briefs/GRAPH-TRANSFORMER-QUESTION.md`
outrank it). Rows named are rows of `improve/FAILURE-MODES-2026-11-25.md`. Added to later, never rewritten.

## Measure (all eight)

- Tuning split only: the 260 tuning commits (FixFlow 34, clinic 34, zulip 192). Held-out blocks, tables and truth are never
  loaded (every loader is called with 'train' and 'tune' only).
- P@10 (and recall@10 where named) per task, ties by the block's tie order, mean over a commit's seeds, mean over commits
  (`d4lib.per_commit` / `u4lib.per_commit_table`, the round's scorer). Pooled = mean over the 260 commits.
- Differences: paired bootstrap over commits, 10,000 resamples, seed 1 (`d4lib.bootstrap`), 95 % interval. Like with like:
  same commits, same candidates, same scorer on both sides.
- "Counting" = the card's best untrained arm per repository (`CR/d4/out/choices.json`: FixFlow PC, clinic RRF, zulip INV365),
  pooled 0.124 on tuning.

## 1. T2's gain without diff lines that name a candidate (row 16)

- Masking rule: a line of the seed's diff (added, removed or hunk header) is dropped when it contains, as a whole identifier
  token (T2's identifier regex, lower-cased), the file stem (basename without extension, lower-cased, 3+ characters) of any
  alive file of the block other than the seed, or contains any such file's path (with or without extension) as a substring.
  Applied to the queries of every training and tuning block (the feature is retrained on masked queries), documents
  unchanged. DIFFm = BM25 with the masked queries, otherwise T2's build unchanged.
- Arms: B2 (T2's frozen refit, scores on disk), B2+DIFFm (T2's `frozen` with DIFFm, B2's frozen settings, trees early-stopped
  on tuning as T2 did), FUSEDm (T2's rule: RRF of counting and DIFFm, weight chosen on tuning from T2's grid).
- Reported: B2+DIFFm minus B2 (P@10 pooled and per repository; recall@10 on "without" truth, PC = 0), FUSEDm minus counting,
  each beside T2's own figures (+0.015 and +0.119; +0.019). Share kept = masked gain / T2 gain. Also the share of tuning tasks
  whose unmasked diff names a truth file by the same rule, and the share of diff lines dropped.
- For "the gain is not mere naming": B2+DIFFm minus B2 pooled lower bound above 0 and half or more of the +0.015 kept.
  Against: interval holding 0, or under a third kept. Between: said as such.

## 2. Counting inside the temporal window (row 3)

- Window: for a seed, its pair events (the card's pair rule: commits of 2..50 added or modified code files, all files, alive or
  not, as in U6's stream) from commits before the block's history end, in stream order (time, then event order); the last 19
  and the last 31 of them (DyGFormer's windows at nbr 20 and 32). Score of an alive candidate = number of window events with it
  (WIN19, WIN31); and the same with weight 0.5^(age/365 d)/|commit| (WIN19i, WIN31i), counting's INV365 form.
- Compared with counting (full history) and with U6's best DyGFormer per repository (best setting and epoch on tuning from
  `CR/improve/U6/sweep/{dygformer,bip-dygformer}`: in-sample, say so). Paired bootstrap of each window arm against counting.
- For "the window is the cap": the best window arm within 0.01 P@10 of best DyGFormer pooled (or at or under it), and under
  counting (upper bound below 0). Against: window counting above DyGFormer by more than 0.02 pooled: then DyGFormer does not
  even use what its window holds, and the window is not the binding limit.

## 3. Split-half selection (row 17)

- 1,000 random splits; each repository's tuning commits halved at random (stratified by repository). On half A choose the
  option with the best mean P@10 under the rule the unit used (pooled for U5 runs; per repository for U6, B2 and T2's fusion
  weight / tree count); score the choice and the reference on half B. Out-of-sample gain = choice minus reference on B;
  in-sample gain = full-tuning choice minus reference on all. Reported: mean and 2.5-97.5 % range over splits, and the
  optimism = the chosen option's score on A minus its score on B.
- Families, from per-commit scores on disk: U5 (each run's best-epoch per-commit scores; the epoch inside a run stays
  in-sample: say so); U6 (every model x stream x setting x epoch per repository, e*.json); T2's FUSED weight (9 weights, from
  T2's matrices) and B2+DIFF's tree count if per-tree scores are produced in measurement 1's refit; B2's best of 40 only if
  per-commit scores per setting exist on disk or are cheap to recompute (U4's sweep.jsonl holds per-repository means only).
  Reference: counting for U5, U6, B2 and FUSED; B2 for B2+DIFF.
- For "the tuning numbers are real": out-of-sample gain at least half of the in-sample gain and its range above 0. Against:
  under half, or its range holding 0.

## 4. TGN popularity (row 6)

- U6's `diag_tgn.py`, unchanged, on one saved TGN state per repository (pair stream; bip if no pair state exists), CPU,
  read only. Reported per block: corr(score, candidate's mean score), corr(score, seed's mean score), score std.
- For "ranks by popularity": corr(score, candidate mean) 0.9 or more in each repository. Against: 0.5 or less. Between: said.

## 5. Commit-size weight on U5's co-change edges (row 5)

- U5's frozen setting (sage, 1 layer, 128 wide, 20 negatives, Qwen3 nodes) with co-change edge weight hl90 / |e| (each pair
  event's decayed weight divided by its commit's file count), seeds 0 and 1, CPU, U5's epoch rule (best tuning epoch,
  patience 6, at most 30). Against T1's `asis` (seeds 0 and 1, mean 0.1308): per-commit P@10 averaged over the two seeds,
  paired bootstrap; seed noise (0.0011) beside it.
- For "the weight helps": gain of 0.003 or more with lower bound above 0. Against: interval holding 0, or a loss.

## 6. Learning curve on zulip (row 8)

- U5's frozen setting, seed 0, CPU; FixFlow and clinic training blocks unchanged, zulip's restricted to its most recent 25, 50
  and 100 training blocks (nearest the tuning period), against the full set (U5's own run, as T1 used it). Scored on zulip's
  192 tuning commits and pooled; paired bootstrap of each size against the full run.
- For "more zulip data of this kind would move this form": a rise with size, full minus 50 blocks above 0.005 and its lower
  bound above 0. Against ("flat"): full minus 50 interval holding 0.

## 7. Pair TGN with the memory advanced to the commit's start (row 9)

- One pair-TGN setting (U6's selected one per repository), FixFlow and the clinic, seed 0, CPU if a run takes under about 20
  minutes. Twin A as it is; twin B: no memory update from an earlier batch's events of the same commit reaches a batch (the
  memory holds the state at the commit's start, as the bipartite stream does it). Same device, seed, epochs and epoch rule
  (best tuning epoch) on both. B minus A per repository and on the 68 commits together, paired bootstrap.
- For "the shortcut costs pair TGN": B above A with lower bound above 0. Against: interval holding 0, or B below A.

## 8. Historical negatives (row 7)

- One setting of DyGFormer and one of TGN (pair stream, U6's selected setting per repository), FixFlow and the clinic, seed 0,
  CPU under the same 20-minute rule. Twin A: as it is (uniform negatives). Twin B: DyGLib's `historical` negative sampling
  (destinations seen before the batch, not in it), same evaluation, device, seed, epochs and epoch rule. B minus A per
  model, per repository and on the 68 commits together.
- For "harder training examples help the temporal models": B above A with lower bound above 0 for a model. Against: interval
  holding 0, or below.

## Caveats fixed now

- Every arm that picks an epoch, tree count or weight on tuning is in-sample; both sides of a comparison pick by the same rule.
- FixFlow and the clinic rest on 34 commits each; zulip is 192 of 260.
- A result is about this form on these three repositories, not a verdict on the family.

## Added 2026-11-25, before any run of 5-8 (after measurements 2, 3 and 4 had run; nothing above changed)

- 6: zulip has exactly 100 training blocks, so "100" is the full set. The full arm is run again on the CPU with seed 0 (same
  device as 25 and 50) beside U5's own run; both are reported.
- 7 and 8: U6 has no frozen choice yet (no `choice.json`). One setting per model for both repositories, by the sum of the
  best tuning P@10 on FixFlow and the clinic in U6's sweep: pair TGN n20 lr 0.001; pair DyGFormer n32 lr 0.0001. Protocol as
  U6's sweep: 100 epochs, evaluations at 2, 5, 10, 20, 40, 70, 100. Pair TGN's sweep swings 0.005-0.105 between epochs of one
  run, so beside the best-epoch comparison (in-sample on both sides) the mean over the seven evaluations of each twin is
  compared too (per-commit means over the seven, paired bootstrap). A claim needs both to agree.
- 8: DyGLib's historical sampler gives negative edges (both ends a past pair not in the batch), as DyGLib's evaluation uses it.

## Added 2026-11-25 14:25 UTC, before any twin of 7 or 8 had finished (nothing above changed)

- 7 and 8 on the CPU: pair TGN on FixFlow measured 26 s per epoch (4 CPUs), so U6's 100 epochs take about 45 minutes a run;
  the card gate has four jobs waiting ahead (one of them whole-card). Both twins of every comparison therefore run 40 epochs
  with evaluations at 2, 5, 10, 20, 40 (U6's grid cut at 40; U6's best pair-TGN and DyGFormer epochs on these two
  repositories lie at 5-40 in 9 of 12 settings). Best-epoch and mean-over-evaluations comparisons as fixed above.
- Added 14:31 UTC: the same pair-TGN run (FixFlow, n20 lr 0.001, seed 0, CPU) gave P@10 0.127 at epoch 2 in a first start
  (stopped) and 0.086 in the second: runs are not repeatable on this CPU. A repeat of each as-is TGN run (`asis2`) is the
  noise reference: a twin's difference counts only if it exceeds the asis-asis2 difference and its interval holds no 0.
