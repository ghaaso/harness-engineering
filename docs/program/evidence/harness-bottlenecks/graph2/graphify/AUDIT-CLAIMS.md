# Refuter 2 (claims): audit of the graphify held-out result

Written 2026-11-13 by the claims refuter of the graphify step (protocol addendum 7). It attacks every
headline of `RESULT.md` in this folder, in both directions: could a headline be too hard on graphify,
or too kind to it. Nothing here changes an answer, a score or a verdict. No graphify call, no
container and no arm was run for this audit; it only reads stored files and recomputes from them.

What was tested, in one sentence: graphify 0.9.108's code layer (the graph its parsers build, no model,
no document layer, no agent), asked through its own `query --seed ... --budget 100000 --depth 3`
command, with its ordered file list packed by the shared packer, on one repository's known-answer
tasks and questions. Everything below is about that, and about nothing wider.

My scripts and their outputs (scratch, outside the repository):
`C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/graphify/audit/claims/`
- `recheck.js` -> `recheck.json`: re-score, per-commit paired bootstrap on six metrics, the
  five-commit drop in both directions, the split by where the seed lives, and how many files and
  tokens per file each arm shows at 8,000 tokens.
- `recheck2.js` -> `recheck2.json`: seeds matched by id only, and the tuning table.
- `native_check.js` -> `native_check.json`: the native form re-scored, and how often graphify's
  keyword query drifts into another part of the repository.

Same generator, seed (20261112) and 10,000 resamples as `build/arms/common/compare.js`; the cluster is
the commit. All differences are graphify minus the other arm, in recall (0 to 1).

## 1. What I recomputed and what matched

- I re-scored graphify's, the typed primary's and scripted search's T1 answers (418 tasks each) with
  `build/arms/common/score.js` against `sealed/references.jsonl`. 0 of 1,254 per-task primary values
  differ from the grader's per-task file.
- The T1 means and the G-1 to G-4 intervals in `RESULT.md` reproduce to four decimals
  (for example G-1 -0.1366 [-0.1881, -0.0879]), and so do the seed-location rows.
- The native-form file recall reproduces: 0.3443 per commit on T1 (75 commits).
- The tuning-to-held-out drops reproduce: graphify 0.682 to 0.564, typed 0.785 to 0.700, scripted
  search 0.759 to 0.625, changed-together floor 0.752 to 0.638, same-folder floor 0.719 to 0.549.
- The selection follows addendum 4 item 1 on the stored tuning table: three configurations were within
  one standard error of the best (0.688); the lowest complexity (3) was shared by two, and the higher
  tuning primary (0.682) chose `query-seed-full-d3`.

## 2. Headline by headline

### Headline 1: the typed graph is "better" on T1 (-0.137 [-0.188, -0.088])

Result: **survives, with a qualification.**

- The wording rule is applied exactly: the T1 interval excludes zero and the sign is negative on T1,
  T2 and T3. The T3 sign rests on -0.018 [-0.175, +0.135], with 5 tasks higher for each arm and 15 tied;
  the rule asks for a sign only, so this is allowed, but it is the thinnest of the three signs.
- Dropping five commits, in both directions: the five most favourable to the typed graph give
  -0.100 [-0.141, -0.060]; the five most favourable to graphify give -0.161 [-0.212, -0.114]. Both
  exclude zero.
- Seeds matched by definition id only (291 tasks, 74 commits): -0.118 [-0.165, -0.072].
- Not the adapter's mapping: every file graphify returned exists in the shared facts, and all
  1,232,853 printed query nodes of the tuning run were found in graphify's own graph. Nodes without a
  file are external names (graphify's `concept` nodes), not repository files.
- Not the seed: every arm got the same seed; graphify got it as its own node id through `--seed`,
  which its README recommends.
- **The packer does shape the size of the gap.** graphify's order (seeds, then by hop and by degree)
  puts large, highly connected files first. At 8,000 tokens it shows a median 18 whole files at a
  median 422 tokens per file; the typed graph shows 30.5 files at 247 tokens per file, scripted search
  26 files at 293. On ranking measures that do not charge for file size, the gap is smaller:
  top-10 file recall -0.102 [-0.145, -0.060], nDCG@10 -0.063 [-0.095, -0.032], and the rank of the
  first right file (MRR) -0.015 [-0.055, +0.027], which includes zero. So graphify's first right file
  comes as early as the typed graph's; it falls behind on the files after it, and loses more where
  large files fill the budget. This is still "which files graphify picks and in what order", as
  addendum 7 item 7 says, but the order is costed by file size, and that should be said.
- Qualification to attach: "On recall of the files and definitions a commit changed, inside an
  8,000-token answer, on this repository, the typed graph scored higher than graphify's code layer
  queried through our adapter; part of the gap comes from graphify putting large, highly connected
  files first under a budget that charges by size. The first right file comes equally early in both
  (MRR difference -0.015 [-0.055, +0.027])."

### Headline 2: inconclusive against scripted search, the changed-together floor and the same-folder floor

Result: **survives as worded; the sensitivity line needs both directions.**

- The verdicts follow the rule. G-2 and G-3 fail "better" only because T3 has the opposite sign
  (+0.145 and +0.152, 25 tasks from 4 parent commits); G-3's T1 interval itself excludes zero
  (-0.074 [-0.145, -0.003]).
- `RESULT.md` drops only the five commits most favourable to the leading arm. In the other direction:
  - G-2 without the five commits most favourable to graphify: -0.099 [-0.166, -0.037];
    G-3: -0.115 [-0.184, -0.051]. Both exclude zero (the verdict stays "inconclusive" because of T3).
  - G-4 without the five commits most favourable to the same-folder floor: +0.067 [+0.013, +0.121],
    with T2 and T3 also positive. By the rule that would read "better" for graphify.
  - So each of these three verdicts moves with five of 75 commits, in one direction or the other.
- Seeds matched by id only (addendum 6 item 12, not reported in `RESULT.md`): G-2 -0.045
  [-0.110, +0.018], G-3 -0.058 [-0.127, +0.011], G-4 +0.040 [-0.031, +0.107]. No verdict changes.
- Packer-free ranking against the same-folder floor (secondary measures, no verdict declared):
  nDCG@10 +0.093 [+0.024, +0.161] on T1, +0.164 [+0.097, +0.233] on T2, +0.286 [+0.137, +0.442] on T3;
  MRR +0.242 [+0.165, +0.320] on T1. On these, graphify's code layer ranks clearly above a folder
  listing. That is not a verdict, but it rules out the reading "graphify is no better than a folder
  listing".
- Qualification to attach: "inconclusive" means the interval does not support either "better" or
  "equivalent". It does not mean graphify matched these arms.

### Headline 3: "Where the seed file lives decides most of this"

Result: **needs qualification.** The numbers reproduce; the causal wording and the mobile result do
not hold up as stated.

- The backend deficit is real at 8,000 tokens: against the typed graph -0.227 [-0.295, -0.163]
  (3 commits higher for graphify, 37 lower), against scripted search -0.214 [-0.292, -0.142]; both
  survive dropping five commits in either direction.
- But on backend seeds graphify's top files are about as good as scripted search's: top-10 file
  recall -0.035 [-0.103, +0.024], nDCG@10 -0.001 [-0.062, +0.047], MRR +0.071 [-0.003, +0.135]. The
  backend gap opens further down the list and grows with the budget (2,000 tokens -0.080, 8,000
  tokens -0.214). On backend seeds the changed-together floor alone scores 0.709, so the backend is
  where history beats a structure-only graph.
- The mobile-app result "+0.131 [+0.038, +0.215] above scripted search" is fragile:
  - without the five commits most favourable to graphify: +0.066 [-0.024, +0.141] (includes zero);
  - at 2,000 tokens +0.001 [-0.071, +0.065]; at 4,000 tokens +0.048 [-0.042, +0.137];
  - top-10 file recall -0.028, nDCG@10 -0.040, MRR -0.049 (all intervals include zero).
  The same holds against both floors (dropping five: +0.066 and +0.104; only the same-folder floor
  stays above zero).
- "graphify close to the typed graph on mobile" (-0.019 [-0.092, +0.038]) holds at 8,000 tokens only:
  at 2,000 tokens -0.080 [-0.148, -0.020], top-10 file recall -0.108 [-0.188, -0.038].
- The mobile pattern is not specific to graphify. It is where the history-based arms are weak
  (changed-together floor 0.502, scripted search 0.506), and the typed graph shows the same pattern
  (refuter.md, finished test). It reads as "structure beats history where history is thin", not as a
  graphify property.
- The held-out mix (36 % of T1 tasks seeded in the mobile app, against 17 % on tuning) favours
  graphify. On tuning graphify scored below every comparator, the same-folder floor included
  (0.682 against 0.719).
- Qualification to attach: "graphify's shortfall is concentrated on backend seeds and grows with the
  answer size. On mobile-app seeds it scored above scripted search and both floors at 8,000 tokens, but
  not at 2,000 or 4,000 tokens, not on top-10 ranking, and not after dropping five commits; the typed
  graph shows the same mobile pattern."

### Headline 4: 0 of 336 reference files reachable only through link kinds graphify does not build

Result: **survives as a count, needs qualification as an explanation.**

- The 0 is by construction: graphify builds no route, URL, table, setting or changed-together relation
  (every edge in its graphs comes from the parser). Within 3 hops the same split gives 210 such files,
  of which graphify showed 14.
- The group split does not isolate the effect of those link kinds on the rest of the gap. With an
  unbounded walk almost every in-runtime file is reachable through code edges, so the NEEDS group came
  out equal to the cross-runtime set (82 tasks, 9 commits). In the WITHOUT group the typed arm still
  ranks with changed-together and other link kinds (half of its credited recall came through
  co-change paths in the finished test), so "-0.134 without those tasks" is not "the gap without those
  link kinds".
- An indication from tuning data only (not held-out, different traversal depth): the typed store
  restricted to parser-type edge classes (structure, imports, calls, tests; 2 hops) scored 0.608 on T1
  tuning, its all-class 2-hop base 0.664, and its frozen primary (unbounded, degree-normalised) 0.785;
  graphify's chosen configuration scored 0.682. So on tuning, graphify's code layer was not behind a
  typed store held to the same kinds of edges; the typed primary's lead came with more link kinds and
  a tuned traversal together. The held-out run cannot separate the two.
- Qualification to attach: "graphify cannot show files that only a route, table, setting or
  changed-together link connects to the seed; on T1 that is 13 % of reference files (336 of 2,562) on
  82 of 418 tasks. Tasks without such files still show a gap of -0.134, but this run does not separate
  how much of that is link kinds and how much is ranking and tuning."

### Headline 5: native form, 0.344 of T1 reference files named, against 0.447 typed and 0.360 search

Result: **survives with a qualification.**

- Recomputed: 0.3443. Intervals belong in the headline: against the typed graph's 2,000-token answer
  -0.102 [-0.172, -0.033]; against scripted search -0.015 [-0.097, +0.068] and both floors
  (intervals include zero). The point values alone invite "below scripted search", which the interval
  does not support.
- The native form tells the same story as the packed form, not a different one: below the typed
  graph, not distinguishable from scripted search or the floors on T1, and much lower on T2 test files
  (0.072 against 0.227 to 0.287).
- Adapter effect checked: the native query text is "<name> <path>"; graphify's keyword matcher also
  matches words of the path and can start in another part of the repository (in the first held-out
  task, a backend seed started from two web components). Median share of printed nodes in another
  runtime: 11 %; 39 of 418 answers mostly elsewhere. Without those answers the recall is 0.351, so
  this does not change the result.
- Two limits to attach: the native form is graphify's keyword mode at its defaults (depth 2), not the
  seeded mode that was frozen; and G-5 credits file paths only, while graphify's text also names
  definitions with file and line.

### Headline 6: questions, macro F1 0.072 against 0.745 typed and 0.645 search

Result: **needs qualification.**

- The numbers reproduce from the grader's files, but F1 is the wrong headline number for a traversal
  printout scored as an item list: graphify's answer names a median 26 candidate items, so its
  precision is near 0.07 whatever it finds. Recall is the fairer reading: 0.194 at the default budget
  and 0.347 at `--budget 8000`, against 0.808 (typed) and 0.789 (scripted search). The gap stays large.
- The headline does not follow addendum 6 item 14: the 29.5 tokens for scripted search are its final
  answer; it read a median 694.5 tokens to reach it. The typed store's own costs (knowing the schema,
  one query program written per question kind) are not counted. Both are in the section 5 table, not
  in the headline.
- The adapter handicaps graphify here in a way the headline does not say: each question was passed
  verbatim, with its "[repo at commit ...]" prefix and scope sentences, to a lexical matcher. graphify's
  own skill tells the agent first to pick up to 12 words from the graph's vocabulary (a model step);
  that step was not run because no model was allowed.
- 24 of 30 questions need link kinds graphify does not build; on the 3 that do not, graphify's F1 was
  0.044 (3 questions, descriptive).
- Qualification to attach: "Given the raw question text, with no agent and no vocabulary step,
  graphify's code-layer query printout contained 0.19 of the reference items (0.35 at an 8,000-token
  budget), against 0.81 and 0.79 for the typed store's and scripted search's per-kind answers, whose
  own costs are counted differently. 24 of the 30 questions need links graphify does not build."

### Other statements in `RESULT.md`

- Build cost (section 8): survives only as stated. The typed facts' times come from another lane under
  conditions not recorded, so no speed comparison may be drawn.
- Tuning effort (item 21): 10 configurations against 60 per typed arm. Among graphify's shipped
  options the three full-traversal configurations converge (0.671 to 0.688 on tuning), so more of the
  same options is unlikely to close a 0.10 gap; options outside the shipped defaults (relation
  subsets, context filters, padding) were not tried, so "graphify tuned as hard as the typed arms"
  is false.
- graphify's purpose-built change command, `affected` (reverse dependents), scored 0.20 on T1 tuning:
  it walks only toward dependents, while a commit's changed files run in both directions. The frozen
  command is graphify's orientation query, used here as a file ranker.

## 3. Is graphify being judged on a task it was not designed for?

Partly, and the result has to say so.

- T1 to T4 ask for the files a commit changed, ranked inside a token budget. graphify's `query` is
  meant for an agent that reads a traversal printout and then asks again; its `affected` is meant for
  "what does this change reach", which is one direction of what a commit edits. Neither was designed
  as a ranked list of files to edit.
- The questions (G-6) are closer to graphify's design, but graphify's design includes an agent that
  picks the query words; that part was not run.
- What remains fair: the comparison asks the same thing of every arm, and the typed and search arms
  were not designed for these tasks either. graphify's first right file comes as early as the typed
  graph's.

## 4. What this says about the owner's question

The owner asked why graphify shows good results when the first test found little.

What this result says:
- graphify's code layer is the same kind of object as the typed code graph of the first test, and on
  the first test's own tasks it did not find more of the changed files than the arms that test already
  had. It did not reveal a capability the first test lacked. Its code layer is not why graphify's
  published numbers look good on this kind of task.
- That is consistent with the explanation in `widen/lane-graphify.md`: graphify's headline numbers
  measure other things (the size of one capped answer against the whole corpus in context with no
  correctness check, conversational memory, six agent questions on one other repository).

What it does not say:
- Nothing about tokens: every answer of every arm filled its budget (median 7,999 tokens), and no
  session was run. The token-saving claims are neither confirmed nor refuted here.
- Nothing about the model-read document layer, community labels or the report, where the one
  independent positive result for graphify sits.
- Nothing about an agent using graphify: whether it would call it, re-query, or read fewer files.
- Nothing about other repositories, other languages, orientation questions, or graphify versions
  other than 0.9.108.

## 5. Sentences nobody may say to the owner about this result

Against graphify:
- "graphify does not work." / "graphify is worse in general." / "graphify is worse than grep."
- "graphify is worse than scripted search" or "worse than the changed-together floor" (both
  inconclusive).
- "graphify is no better than listing the folder" (inconclusive on the primary; above it on every
  ranking secondary).
- "graphify's token savings are false" or "graphify wastes tokens" (no tokens were measured).
- "graphify cannot answer code questions" or "graphify scores F1 0.07 on questions" without "raw
  question text, no agent, no vocabulary step, printout scored as an item list".
- "graphify's document layer would not help" (not run).
- "graphify's graph is wrong" (no edge was checked for correctness; only rankings were scored).

For graphify:
- "graphify is as good as the typed graph on the mobile app" (8,000 tokens only; lower at 2,000).
- "graphify beats scripted search on the mobile app" or "beats both floors there" (fails at 2,000 and
  4,000 tokens, on top-10 ranking, and after dropping five commits; subgroup, no verdict).
- "graphify is equivalent to scripted search or the floors" ("inconclusive" is not "equivalent").
- "graphify is better than the same-folder floor" (not by the declared rule).
- "graphify lost only because it lacks route, table and history links" (the gap is -0.134 on tasks
  that do not need them; this run does not separate link kinds from ranking and tuning).
- "graphify lost only because of our adapter or packer" (no mapping loss; the gap survives on
  packer-free top-10 recall and nDCG; only the rank of the first right file is level).
- "graphify was tuned as hard as the typed arms" or "with more tuning it would win" (10 against 60
  configurations; neither is shown).
- "graphify builds its graph faster or smaller than the typed store" (times not comparable).
- "This explains why graphify shows good results elsewhere" or "this confirms graphify's published
  numbers" (they measure other things).

## 6. Defects in `RESULT.md`

1. Headline 3 uses causal wording ("decides most of this") and presents the mobile-app lead over
   scripted search without its fragility (five-commit drop, smaller budgets, ranking measures).
2. The five-commit sensitivity is reported in one direction only; G-4 would read "better" for graphify
   when the floor's five best commits are dropped, and G-2 and G-3 exclude zero against graphify when
   graphify's five best are dropped.
3. The seeds-matched-by-id-only check (addendum 6 item 12) is not reported. No verdict changes.
4. Headline 6 omits the scripted search's read tokens and the typed store's uncounted costs
   (addendum 6 item 14), and the missing vocabulary step; F1 is used where recall is the fair reading.
5. Headline 5 gives point values without intervals.
6. The packer interaction (graphify front-loads large files: 422 against 247 tokens per shown file)
   is not stated, and no packer-free ranking measure is shown.
7. Tuning context missing: graphify was below every comparator on tuning, and the held-out mix
   favoured it.
8. Section 6's unbounded-reach split makes the NEEDS group equal the cross-runtime set and leaves the
   typed arm's ranking use of co-change in the WITHOUT group; the 3-hop sensitivity is the more
   informative split and should lead.

No headline is refuted outright. Every verdict word in `RESULT.md` follows the declared rule.
