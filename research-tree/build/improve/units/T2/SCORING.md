# T2 probe: scoring, fixed before any run (2026-11-25)

Brief: `research-tree/build/briefs/QUICK-TESTS.md` (T2 probe); design: `research-tree/build/improve/APPROACHES-2026-11-25.md`
sections 1.3 check 4, 4 (design B, step B1) and 6 (T2). Question D4b: the seed file's own diff in the task commit is known.

## The feature (DIFF_BM25)

- **Query** for task (commit t, seed s): identifier tokens of the seed's own diff in commit t (`git diff -M -U0 t^ t -- <seed
  path before> <seed path after>`): the added and removed lines and the hunk headers' context text; no context lines, no file
  headers, nothing of any other file of commit t, not the commit message.
- **Document** for candidate n of block k: identifier tokens of the candidate's content in the tree of `commits[hend-1]` (the last
  commit before the block's cutoff, the tree the block's imports come from) plus the tokens of its path.
- **Tokens:** identifiers `[A-Za-z_][A-Za-z0-9_]*`, lower-cased, kept whole and split at `_` and camelCase; length 3 or more.
  The query is the set of its distinct tokens.
- **Score:** BM25, k1 = 1.2, b = 0.75, document frequency and mean length over the block's alive files. Seed cell dropped as in
  every arm. Not tuned.

## Arms (tuning blocks only; held-out blocks are never built, opened or scored)

1. BEST: the best untrained arm per repository (`CR/d4/out/choices.json`: PC, RRF, INV365), from U4's tuning tables.
2. DIFF: DIFF_BM25 alone.
3. FUSED (the same content given to the untrained baseline): `1/(60+rank_BEST) + w/(60+rank_DIFF)`, one weight w per repository
   chosen on tuning from {0.05, 0.1, 0.2, 0.3, 0.5, 0.7, 1, 1.5, 2} (in-sample, as B2's own choice is).
4. B2: each repository's frozen U4 choice (`CR/improve/U4/rank/B2/choice.json`) refit with U4's `fit` (copied unchanged except the
   output folder and 4 threads), trees early-stopped on tuning as U4 does.
5. B2+DIFF: the same settings with DIFF_BM25 added (and its per-query ratio, as `qnorm` gives every count column), trained on the
   same training blocks (the feature is built for them under the same cut), trees early-stopped on tuning the same way.

## Measures and comparisons

- P@10 and recall@10 per commit (mean over its seeds; ties by the table's `tie` column, as `d4lib.per_commit`); per repository and
  pooled (260 commits); paired bootstrap over commits, 10,000 resamples, `d4lib.bootstrap` (seed 1).
- Main comparisons: **B2+DIFF minus B2**, and **FUSED minus BEST** (the untrained like-with-like). Also DIFF minus BEST.
- **Strata by kind of seed file** (the seed's own change count before the cutoff, `SEED_NCHG`): none (0), little (1-5), much (6+).
  P@10 per commit over that commit's seeds of the kind; commits without such a seed drop out of that stratum.
- **Strata by truth file**: "without" = truth files with no earlier co-change with the seed (`PC` = 0), "with" = the rest.
  Recall@10 within the stratum per seed (hits of the stratum's truth in the top 10 / its truth count), mean per commit over seeds
  that have such truth files.

## What counts for and against the claim "the limit is the signal, not the size"

The claim is read as section 0 of the survey reads it: the plateau is set by the input. A gain from new input supports "the
limit is the signal (in co-change history)" and shows the task is not capped at today's figure; no gain lets the narrow claim
"nothing more is in reach" survive one more form.
- **New input lifts D4 (the plateau was the input):** B2+DIFF minus B2 pooled P@10 with lower bound above 0, or the "without"
  stratum's recall@10 gain with lower bound above 0. A gain of +0.01 P@10 pooled or more is a material gain; the round's +0.02
  over the best untrained arm is reported as a gate, not used to decide this.
- **No lift (the claim survives this form):** B2+DIFF minus B2 pooled interval inside [-0.01, +0.01] and the "without" stratum's
  interval including 0.
- Anything else: cannot tell, said as such. One repository's gain is a result about that repository.
- Caveat fixed now: every pick is in-sample on tuning (B2's trees, w), so gains are optimistic; held-out stays with U7.

## Added after the run (nothing above changed)

- The "none" seed stratum is empty on tuning: every tuning seed has at least one earlier change (SEED_NCHG >= 1 in all 975
  queries). The question "do files with no shared history improve" is therefore read on the truth-file stratum "without".
