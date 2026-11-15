# sealed/grader/heldout/v2: post-run corrections and page data (grader lane, 2026-11-13)

This folder recomputes, from the stored held-out answers and the stored scores only, the rows that the
three refuters and protocol addendum 6 asked for, and writes the data file for the owner page. No arm was
started. No answer file, configuration, arm code, task file, fact file or frozen record was changed. Every
file in the parent folder `sealed/grader/heldout/` is unchanged; the first report (`../NOTES.md`) stays as
written, and this file lists every place where it is corrected or extended.

## Files

| file | what it is |
|---|---|
| `recompute.js` -> `recompute.json` | Items a to h of the lane: questions on 30, 23 and 22; question tokens two ways; the runtime split of every H3 comparison with counts and the tuning mix; sensitivity checks; T3 clustered three ways; the five community draws; padding and co-change shares. |
| `rankdiff.js` -> `rankdiff.json` | Item g: the 8 (arm, task) pairs whose full ranked-list hash differs from the reference arm. |
| `tuning.js` -> `tuning.json` | The tuning sweep by factor, identity counts on tuning, tuning question scores, and the three worked examples (tuning split only). |
| `build_data.js` -> `data.json` | The page data, with its checks; also copied to `docs/program/graph-test/data/data.json` in the repository. |
| `PROGRESS.txt` | Time stamps of each step, kept in case the session was interrupted. |

## How

- Statistics use the grader's own code: `arms/common/compare.js` `pairedStats` (paired cluster bootstrap,
  10,000 resamples, mulberry32 generator, seed 20261112) on the grader's per-task scores
  (`../tasks.jsonl.gz`), and `arms/common/tq_score.js` for the questions, exactly as
  `../compare_heldout.js` and `../finalize_h4.js` do. Clusters are commits for T1 and T2, and tasks for T3
  unless stated.
- Reproduction check: the recomputation reproduces 21 of 21 stored comparison rows exactly (difference and
  95 % interval, for H3 against search, search S2, the co-change floor and the same-directory floor, H1b,
  co-change floor minus search, and S1 minus primary, each on T1, T2 and T3). The question blocks on 30 and
  23 questions reproduce the stored values exactly (+0.1002 [-0.0601, 0.2571] and +0.1886 [0.0489, 0.3461]).
- The claims refuter used its own generator (seed 777) and the re-scorer another (seed 977). Where they
  computed the same row, every point estimate here equals theirs to four decimals and the interval ends
  differ by at most 0.002 (for example typed minus co-change floor with the five most favourable commits
  dropped: refuter +0.0293 [-0.0086, 0.0662], here +0.0293 [-0.0078, 0.0675]). That is generator noise;
  no reading changes. The refuter's web group of 8 commits is this file's "web with the root-level task".
- The padding and co-change shares (item h) are recomputed here with `score.js` itself: the per-task
  recall without the padding tail is the scorer's `unpad_r8000`; the co-change share re-scores each typed
  answer with every item that is not reached through a `co_changed` edge marked as padding. Both reproduce
  the claims refuter's figures exactly (`audit/heldout/claims/a2_sens.json`, `padshare`).

## Corrections and additions to the first report

1. **Touched questions are 8, not 7** (addendum 6 item 3). The search arm's target for question 25 also
   changed in pre-flight fix round 1. H4 is now shown on 30, 23 and 22 questions, with and without the 7
   judgement items:

   | questions | typed macro F1 | search macro F1 | difference [95 %] | typed higher / search higher / tied | on its own |
   |---|---|---|---|---|---|
   | all 30, with judgement items | 0.745 | 0.645 | +0.100 [-0.060, +0.257] | 12 / 5 / 13 | inconclusive |
   | all 30, without | 0.756 | 0.679 | +0.078 [-0.076, +0.232] | 11 / 5 / 14 | inconclusive |
   | 23 (addendum 5 list), with | 0.841 | 0.653 | +0.189 [+0.049, +0.346] | 11 / 3 / 9 | better |
   | 23, without | 0.856 | 0.697 | +0.159 [+0.028, +0.309] | 10 / 3 / 10 | better |
   | 22 (addendum 6 list), with | 0.834 | 0.676 | +0.158 [+0.025, +0.309] | 10 / 3 / 9 | better |
   | 22, without | 0.849 | 0.722 | +0.128 [+0.003, +0.269] | 9 / 3 / 10 | better |

   Correction after the independent check: the four "better" cells pass the token condition only by
   comparing the typed final answer with what the scripted search read (40 against 819 tokens on 23
   questions, 41.5 against 1,008 on 22). On final answers alone (40 against 35, and 41.5 against 29.5)
   the condition fails, so like for like each of these words would be inconclusive. Only 22 questions
   are untouched in every arm; the 23 are the addendum 5 list.

   The verdict rule is unchanged: all 30 decide, and a subset with a different verdict makes H4
   inconclusive. **H4 stays inconclusive.** Per-kind means are in `recompute.json` (on all 30 the typed
   arms lose "the other half of a rule", -0.306 mean F1 over 4 questions, tie "clients of a route", and win
   the other six kinds).
2. **The sentence in section 6 of the first notes was wrong.** It said the typed arms "lose 4 of the 7
   touched questions outright". Correct: on the 7 first-listed touched questions the typed arms win 1
   (question 33), lose 2 (46 and 47) and tie 4 (24, 27, 40 and 41). They score F1 0 on 4 of them (24, 40,
   46, 47); on 24 and 40 search also scores 0. With question 25 added (8 touched questions) they win 2,
   lose 2 and tie 4. Question 40 is still answered empty by all three typed arms after the cut-back fix.
3. **Question tokens, two ways** (addendum 6 item 14). The first report's "median 31 against 695 tokens"
   compared different quantities. The size of the final answer, counted with the shared tokenizer: typed
   median 31 tokens, search median 29.5 tokens (all 30 questions; mean 59.9 against 56.5). What the
   scripted search read to reach its answer: median 694.5 tokens (mean 1,903.6). On the 22 untouched
   questions: final answers 41.5 against 29.5, search read 1,008. The typed side's own costs (knowing the
   schema, the query programs written per question kind) are not counted. The stored typed `tokens`
   field equals the recount of its final answer on all 30 questions.
4. **Runtime split of every H3 comparison** (addendum 6 item 11), T1 held-out, typed primary minus the
   other arm:

   | group (commits / tasks) | search | search S2 | co-change floor | same-directory floor |
   |---|---|---|---|---|
   | mobile app (31 / 152) | +0.151 [+0.097, +0.207] | +0.147 [+0.093, +0.203] | +0.155 [+0.095, +0.218] | +0.191 [+0.098, +0.288] |
   | backend (45 / 236) | +0.012 [-0.038, +0.065] | +0.004 [-0.047, +0.057] | -0.009 [-0.063, +0.048] | +0.133 [+0.051, +0.212] |
   | web without the root-level task (7 / 29) | +0.025 [-0.055, +0.119] | -0.011 [-0.071, +0.055] | +0.008 [-0.086, +0.100] | -0.109 [-0.238, +0.057] |
   | web with task T1-0786 (8 / 30) | +0.126 [-0.034, +0.352] | +0.032 [-0.055, +0.137] | +0.104 [-0.058, +0.325] | +0.002 [-0.206, +0.264] |
   | outside the mobile app (48 / 266) | +0.024 [-0.023, +0.075] | +0.010 [-0.036, +0.060] | +0.001 [-0.051, +0.056] | +0.130 [+0.061, +0.202] |
   | all (75 / 418) | +0.076 [+0.036, +0.118] | +0.066 [+0.027, +0.108] | +0.063 [+0.019, +0.110] | +0.151 [+0.092, +0.207] |

   A commit with seeds in two groups counts in both. Task T1-0786 has its seed `ops-server.mjs` at the
   repository root; the first report's split left it out without saying so. Mix of T1 tasks, tuning ->
   held-out: mobile 17 % -> 36 % (commits 32 % -> 41 %), backend 58 % -> 56 %, web 26 % -> 7 % (commits
   37 % -> 9 %). On tuning, typed minus search was +0.040 on mobile, +0.002 on backend and -0.013 on web.
   The held-out per-group differences re-weighted to the tuning task mix give +0.039 against search
   (against +0.076 observed).
5. **Sensitivity of the co-change floor and search comparisons** (addendum 6 item 12), T1:

   | check | typed - search | typed - search S2 | typed - co-change floor | co-change floor - search |
   |---|---|---|---|---|
   | as scored | +0.076 [+0.036, +0.118] | +0.066 [+0.027, +0.108] | +0.063 [+0.019, +0.110] | +0.013 [-0.006, +0.031] |
   | 5 most favourable commits dropped | +0.045 [+0.012, +0.079] | +0.036 [+0.003, +0.069] | **+0.029 [-0.008, +0.068]** | +0.000 [-0.017, +0.015] |
   | 3 largest commits dropped (by changed files) | +0.074 [+0.033, +0.117] | +0.063 [+0.023, +0.106] | +0.059 [+0.014, +0.107] | +0.015 [-0.005, +0.034] |
   | seeds matched by id only (74 commits, 291 tasks) | +0.072 [+0.012, +0.129] | +0.062 [+0.003, +0.119] | **+0.060 [-0.001, +0.118]** | +0.013 [-0.009, +0.036] |

   The "better" against the co-change floor loses its interval under two of these checks. Seed matching is
   identical in every arm (291 by id, 105 file only, 16 by members, 6 none). The three largest commits by
   tasks and by reference units are the same three; both rows are in `recompute.json`, with the 3 most
   favourable commits dropped and the leave-one-commit-out range.
6. **T3 clustered by task and by parent commit** (addendum 6 item 15). T3 has 25 tasks from 4 parent
   commits and 3 documents (5 parent-and-document groups; 13 tasks from one of them). Typed minus search:
   by task +0.163 [+0.010, +0.327]; by parent +0.331 [+0.080, +0.779]; by parent and document +0.382
   [+0.067, +0.744]. With 4 clusters the bootstrap has at most 256 distinct resamples, so those intervals
   are not usable effect sizes. In all 5 groups the typed store scores higher than search; against search
   S2 and both floors it is higher in 4 groups and tied in 1. T3 carries a sign only.
7. **H1b, all five community draws** (addendum 6 item 10). LadybugDB S2 minus relational primary, T1:
   stored draw +0.015 [-0.010, +0.042], draw 1 +0.032 [+0.004, +0.061], draw 2 +0.019 [-0.008, +0.046],
   draw 3 +0.009 [-0.012, +0.031], draw 4 +0.016 [-0.007, +0.041]. Under the same wording rule draw 1 is
   **inconclusive** (its interval excludes zero but the signs are T1 +, T2 -, T3 +, questions 0, and it is
   not inside plus or minus 0.05); the other four are equivalent. T2: -0.037, -0.013, +0.006, -0.017,
   -0.024 (stored draw [-0.083, +0.007], not inside plus or minus 0.05). T3: +0.027 to +0.058, none
   excluding zero. The stored verdict word for H1b (equivalent, on the stored draw) is unchanged.
8. **Ranked-list hash** (addendum 6 item 5). The first report said relational's ranked list differs "from
   the other two" on 2 T1, 1 T1x and 2 T2 tasks. Measured against the reference arm: relational differs on
   5 tasks, DuckPGQ on 3 (T1-0719, T1x-0201, T2-0423), LadybugDB on 0. These 8 pairs are 2 distinct
   queries (one seed at one parent appears in T1, T1x and T2; another in T1 and T2). In every pair the
   shown items with their scores (80 or 86 items), the budgets, the seeds and the 50-path sample beyond
   the budget are identical, and every score field the scorer produces is identical. The hash covers about
   3,900 ranked nodes with their raw scores (`harness.js` line 384), so a last-digit difference in a
   deep-tail score or the order of equal rounded scores past position 130 changes it; the stored answers
   keep only the hash of that tail, so which of the two it was cannot be told from them. **No reported
   measure reads beyond the shown items**: `score.js` reads only `items` (the items packed into the
   16,000-token answer), `budgets` and the reference; it never reads `ranked_sha`, `n_ranked` or
   `beyond_sample`.
9. **Padding and co-change shares** (item h). Per task, T1 held-out, inside 8,000 tokens: scripted search
   recall 0.592, of which 0.307 from its own results and 0.285 (48 %) from the co-change padding tail
   (per commit: 0.625, 0.348 and 0.276); search S2 0.602, 0.056 (9 %) from padding. The typed primary has
   no padding tail; of its 0.670 recall per task, 0.337 (50 %) was reached by an item whose stored
   explanation path contains a co-change edge (per commit 0.333 of 0.700). LadybugDB S2: 0.409 of 0.680
   (60 %). One explanation path per item, so this is descriptive.
10. **Floor statements in the first report.** "floor-co beats typed on backend seeds (0.709 vs 0.699)" is
    confirmed: -0.009 [-0.063, +0.048]. "floor-dir beats typed on web seeds (0.773 vs 0.664)" holds only
    without the root-level task (-0.109 [-0.238, +0.057]); with it the typed store scored 0.002 higher
    (+0.002 [-0.206, +0.264]). Both intervals include zero, so neither statement is shown to hold.

Nothing in this folder changes an answer, a score or a verdict word of the first report. H1, H2:
equivalent. H1b: equivalent on the stored draw (draw 1 would be inconclusive). H3 against search,
search S2, the co-change floor and the same-directory floor: better, with the qualifications above. H4:
inconclusive. H5: not measured here.

## Page data (`data.json`)

Aggregates only, every number labelled held-out or tuning, with its count and its interval where one
exists. It holds: the seven arms in plain words, the frozen configurations and the role rows; the task
sets with tuning and held-out counts; the held-out table for every arm, role and set (75 rows) and the
recall-by-budget curves for T1, T2 and T3; every pre-declared comparison with its verdict, deciding
condition and the qualification the claims refuter requires; the descriptive rows; items c to h above;
the questions on 30, 23 and 22 with per-kind and per-question F1 (ids, kinds and touched flags only; no
question text, no reference content); the tuning sweep; identity counts; three worked examples from the
tuning split; the trust timeline; the limits (addendum 6 section D and both must-not-claim lists,
verbatim); and `engines: {status: "measuring"}` for the timing lane.

The tuning sweep (T1 tuning primary, 65 commits) shows what mattered for the typed arms: hop depth (0.438
at 1 hop to 0.784 unbounded; 0.664 at the base of 2 hops), direction (one direction only loses about 0.2),
output form (snippets 0.363 against signatures 0.664 at the base), the edge classes (adding co-change
history moved the base by +0.056) and padding at 2 hops (+0.107 with the co-change tail). The ranking mode
moved it by at most 0.014 at 2 hops and 0.023 unbounded. For search the padding tail mattered most
(+0.237 with the co-change tail), then rounds and output form. The best engine-native rows were within
0.002 of the shared-specification rows at the same depth.

Worked examples (tuning only), chosen by a stated rule: among the 94 tuning T1 tasks whose reference has
3 to 8 units, the median task of each group. Typed beats search by at least 0.30: 5 tasks, median
T1-0181 (typed 0.8, search 0.4, co-change floor 0.4). Tie of all three, strictly between 0 and 1: 35
tasks, median by reference size T1-0095 (all 0.4). Search or the co-change floor beats typed by at least
0.30: 5 tasks, median T1-0169 (typed 0.5, search 1.0, co-change floor 1.0). All three happen to be
mobile-app seeds. Each example's recall recomputed from the shown items equals the stored score.

Checks run by `build_data.js` (all passed): every comparison difference and interval equals
`../comparisons.json`; the recomputation reproduces the stored rows; no question text and no held-out
question reference item outside the tuning examples; every example is a tuning task; no held-out task id
except T1-0786 (named by the reporting rule) and the 5 tasks of the ranked-hash note; no held-out
reference definition; engines left as a placeholder.

Not done here: H5 (engine timing) belongs to another lane. The relational-against-reference identity on
tuning for the primary configuration could not be recounted from stored answers, because the reference
arm stored no tuning answers for that configuration (its stage-2 cross-check summaries are in
`results/relational/stage2/`); relational against LadybugDB and DuckPGQ are 772 of 772 identical on tuning.

## Independent check applied (2026-11-13)

An independent check of `data.json` reported 8 mismatches, 16 defects and 4 checked claims. Every value
it named was recomputed here by `fix_apply.js` from the stored per-task scores (`../tasks.jsonl.gz`),
the stored held-out answers, the reference file and the unrounded tuning tables. Nothing was run on a
held-out task or question, and no answer, score or verdict changed. `fix_apply.js` starts from the
untouched copy `data.before_check.json`, so it can be re-run; it writes both copies of `data.json` and
lists all 68 changes, old value to new value, in `fix_apply.json`. Both copies are byte-identical.

1. **Win, loss and tie counts (check right).** `arms/common/compare.js` counts a tie only when the two
   commit means are exactly equal. Averaging the same task scores in a different order can leave a
   difference of about 1e-16 (0.0000000000000001), which was then counted as a win or a loss. Counting
   a tie when the absolute difference is at most 1e-12, all 207 paired rows in `data.json` were recounted
   (every row of the comparisons, the trust block, the runtime split, the sensitivity checks, T3 and
   the draws). Exactly the 11 rows the check named change, by one cluster each: H1b T2 11 / 16 / 22 (a
   higher / b higher / tied); H3-floor-co T2 16 / 14 / 19; X-s1-primary T1 25 / 15 / 35 (and the same row
   in the trust block); search S2 at 4,000 tokens 45 / 15 / 15; draws stored T2 11 / 16 / 22, draw 1 T1
   25 / 22 / 28, draw 2 at 4,000 tokens 29 / 25 / 21, draw 3 T1 25 / 21 / 29, draw 3 at 2,000 tokens
   23 / 30 / 22, draw 4 T1 25 / 19 / 31. `tie_scan.js` (output `tie_scan.json`) lists 318 such near-ties
   across all arm pairs, sets and metrics; the others sit in pairs or metrics for which `data.json`
   holds no counts. Not corrected: `../comparisons.json` (outside this folder) still holds the
   exact-zero counts for H1b T2, H3-floor-co T2 and X-s1-primary T1. No interval, difference or verdict
   depends on these counts.
2. **Rounding (check right, plus 5 more found here).** Values computed from already-rounded inputs now
   come from unrounded ones: co-change floor minus search re-weighted to the tuning mix 0.0163 (exact
   0.016264, was 0.0162); LadybugDB S2 share of recall via a co-change edge 0.6012 (exact 0.601228, was
   0.6013); tuning range of the edge-confidence factor 0.0296 (exact 0.029640, was 0.0297) and of the
   traversal-mode factor 0.1649 (exact 0.164872, was 0.1648), also in `tuning.factor_summary`. Found here
   by the same recomputation: typed primary share via a co-change edge 0.5037 (exact 0.503750, below the
   half-way point; was 0.5038); ranking-mode range at unbounded depth 0.0228 (exact 0.022753, was
   0.0227, also in the summary); change from base for PageRank co-change weight 3 -0.0093 (exact
   -0.009344, was -0.0094), for search with 3 rounds +0.0490 (exact 0.048951, was 0.0489) and for search
   with the same-directory padding tail +0.2347 (exact 0.234652, was 0.2346).
3. **Interval ends (check right that this is noise; nothing changed).** The 31 interval ends that differ
   from the checker's own bootstrap by 0.005 to 0.010 are all in rows with few clusters and lie within
   0.0067 of the checker's 200,000-resample reference. The values here come from the declared generator
   and seed (10,000 resamples, seed 20261112) and were left as they are.
4. **Sentences reworded (check right).** "most of its credited recall" is now "about half (48 % per
   task)" (0.2854 of 0.5921 per task; 44 % per commit). "The whole T1 gain comes from" mobile seeds is now
   "rests on", and the outside-mobile estimate +0.024 [-0.023, +0.075] is called indistinguishable from
   zero. "ties co-change" is now "cannot be told apart from co-change", with the web figures added from
   the split table (+0.008 [-0.086, +0.100] without the root-level task, +0.104 [-0.058, +0.325] with it).
   "about as good" is now "the same-directory floor scored 0.109 higher" on web seeds without the
   root-level task. The search arm is "a fixed script modelled on the searches sessions run". The
   tuning-to-held-out drop is "0.05 to 0.17" (smallest 0.0544, LadybugDB S2 draw 1; largest 0.1697, the
   same-directory floor). The tuning step lists 8 configurations per floor, as `tuning.counts` shows. The
   pre-flight step now says question 40 is still answered empty, and the held-out run step names the
   read-only mount of the live working tree.
5. **H4 subsets (check right).** The key `untouched23` is renamed `addendum5_list23` everywhere
   (`questions.h4`, `questions.h4.words`, `questions.blocks`, `questions.tokens_two_ways`,
   `comparisons.rows[8].by_block`, `comparisons.rows[8].v2_words`), because only 22 questions are
   untouched in every arm. The subset words "better (typed)" now say that they hold only when the typed
   final answer is compared with what the scripted search read, and that on final answers alone (40
   against 35 tokens on 23 questions, 41.5 against 29.5 on 22) the token condition fails and the word is
   inconclusive. The stored `verdict` fields of the first report's blocks are unchanged; their
   `decided_by` text names the two quantities. The H4 verdict stays inconclusive.
6. **T3 one-task groups.** In `t3.comparisons.*.per_group_sign`, groups 3 and 4 hold one task each, so
   their two means were that task's held-out scores. The means were removed from those two groups; the
   sign stays (addendum 6 item 15).
7. **Left for the owner (not changed).** `questions.per_question` gives F1, precision, recall, tokens and
   lookups for each of the 30 held-out questions; whether a question counts as a task under "no per-task
   held-out score" is the owner's call. `sensitivity.largest_commits` names 5 held-out commit SHAs with
   their reference sizes (the check raised this under check 6 but did not list it as a defect).
