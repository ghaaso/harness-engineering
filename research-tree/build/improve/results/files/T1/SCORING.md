# T1 scoring, written before any run (2026-11-25)

Task D4 (files that change together with one seed file). Tuning split only: the 260 tuning commits of U4's tables
(FixFlow 34, clinic 34, zulip 192). Held-out tables, blocks and truth are not opened. Added to, never rewritten.

## Measure

- P@10 and recall@10 per task, ties by the table's `tie` column, mean over a commit's seeds, mean over commits
  (`u4lib.per_commit_table`, the round's scorer). Pooled = mean over the 260 commits.
- Differences: paired bootstrap over commits, 10,000 resamples, seed 1 (`d4lib.bootstrap`), 95 % interval.
- Like with like: every arm on the same 260 commits, the same candidate rows (the tuning tables), the same scorer.

## Kinds (fixed here, before any number is seen)

- **Kind of seed file** (per task), from `SEED_NCHG` (commits that changed the seed before the block's cutoff):
  none = 0, little = 1-5, much = 6 or more.
- **Kind of truth file** (per task and truth file): "with" = `PC` > 0 (an earlier co-change with the seed),
  "without" = `PC` = 0.
- Per-kind measures: P@10 split into its two parts, P@10 = P@10(with) + P@10(without), where P@10(with) = truth files
  "with" in the top 10 / 10; recall@10(with) = hits "with" / truth "with" over tasks that have one (likewise "without").
  Seed kinds: P@10 and recall@10 over the tasks of that kind (a commit counts in a kind if it has a task of it).

## 1. Ceilings (descriptive)

Per repository and seed kind: the P@10 ceiling (min(|truth|, 10) / 10) and the recall@10 ceiling; the share of truth
each source can reach at all: history (`PC` > 0), imports (`IMP_SC` or `IMP_CS`), same folder (`FOLDER_DIST` = 0),
name (`SAME_STEM` or `TEST_PAIR`), text (`TEXT` > 0), structural graph (`PPR` > 0), their union; and the P@10 ceiling if only
one source's candidates could be picked. Each arm's P@10 as a share of the ceiling.

## 2. Arms on the kinds

Best untrained arm (PC / RRF / INV365, the card's choice), B2 (U4's frozen choice, refitted; must reproduce its
recorded per-commit P@10), B4 (U5's frozen run `sage_L1_H128_N20_hl90_qwen_s0`, scored from its saved best state; must
reproduce 0.1314 pooled). Each against the best untrained arm per kind.

## 3. The U5 ablation and seeds (frozen setting sage, 1 layer, 128 wide, 20 negatives, hl90, Qwen3 nodes)

Arms, each with seeds 0 and 1, same training blocks, same epoch rule as U5 (best tuning epoch, patience 6, at most 30):
- `asis`: U5 as it is (seed 0 = U5's own run; seed 1 new);
- `nograph`: the pair head on the count features alone (no node vectors);
- `nocount`: the graph network alone (pair head without the count features);
- `hard`: as it is, but the 20 negatives drawn from the task's non-truth candidates in the counting top 50
  (order by INV365, then PC, then DEC90, then the table's tie), not from all candidates.
Comparison: per-commit P@10 averaged over the two seeds, each variant against `asis`, paired bootstrap; the seed-to-seed
difference of each arm is reported beside it as the noise reference (plus U5's existing seeds 97 and 98 of a sibling
setting). The epoch is chosen on tuning for every arm alike (in-sample; it flatters each arm alike).

## What counts for and against the claim "the limit is the signal, not the size"

For (the input is the limit, in co-change history):
- `nograph` within 0.002 pooled of `asis` with the interval holding 0: the graph part adds nothing in this form;
- `hard` gains less than 0.01 on P@10(with) pooled: the training target is not what holds the network back;
- learned arms tie the best untrained arm on P@10(with), and any gain sits in P@10(without) and comes from B2's
  name, folder and import features.
Against:
- `hard` gains 0.01 or more pooled P@10 (or on P@10(with)) with its interval above 0: the target, not the input, held it;
- `asis` above `nograph` by more than the seed noise and with its interval above 0: the graph network adds beyond counts;
- an arm's gain sits in P@10(with) well under the history ceiling for that kind, leaving room counting does not use.
A result on these three repositories, this network form and this question only; not a verdict on graph models.

## Added 2026-11-25 11:41 UTC, after seeing only the first two epochs of `hard_s0` (pooled 0.036 at epoch 2)

Negatives drawn only from the counting top 50 never show the network a far file, so it may stop rejecting them; that is a
weak form of the idea, not its best one. Added arm `mix` (seeds 0 and 1): 10 of the 20 negatives from the counting top 50,
10 uniform over all non-truth candidates (the usual mixed form). Same comparison and same thresholds as `hard`; both are
reported. No other part of this file changes.
