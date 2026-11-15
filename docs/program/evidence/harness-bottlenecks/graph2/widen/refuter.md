# Refuter notes: the assumptions audit and the proposed architecture (2026-11-13)

Lane: REFUTER. Read-only except this file. Nothing installed or run except reading files and three web pages.

## 0. What I read and how

- Finished test, read in full: `graph2/brief.md`, `graph2/protocol.md`, `protocol-addendum-3.md`, `-4.md`, `-5.md`, `-6.md`, `sec6-status.md` (first screen).
- `graph2/build-e/result.json`: the grader's headline, limits and question rows; all three refuters' must-not-claim lists; every claim, mismatch and defect of `refute:claims`; the `bench:rewrite` key numbers. `build-e/grader-heldout-NOTES.md`: the per-arm table, read through grep.
- `graph2/research/critic.txt`: the agent-pilot and missing-algorithm bullets.
- The widening material: `widen/critique-assumptions.md` (the audit, read in full) and `widen/architecture.md` (grep for ceilings, sources, costs and risks; not read line by line). I also grepped `widen/lane-graphrag.md` and `widen/lane-agents.md` for one citation conflict.
- Outside sources, fetched 2026-11-13 through a fetch tool that summarises each page with a small model, so the numbers are as that summary gave them:
  - https://github.com/ohta-rh/graphify-bench (README)
  - https://github.com/Graphify-Labs/graphify/issues/4341
  - https://github.com/Graphify-Labs/graphify/blob/v8/worked/karpathy-repos/review.md

Strength labels used below: strong (independent and controlled), medium, weak (self-reported, anecdote or marketing).

## 1. Bottom line

1. **The audit is mostly right, and it overstates in five places.**
   - (a) The protocol did not misread the owner on the engine axis. He asked for an established engine against a relational store, and the protocol said in advance that the answers would be identical.
   - (b) Co-change was not the only label. The question set (TQ) and the documented chains (T3) were built without co-change.
   - (c) Smaller answer budgets were measured.
   - (d) "Graph type is contradicted as the deciding variable" should read "untested". The sources show only that no study varied graph type.
   - (e) The "+17 to 21 points" figure comes from a superseded version of its paper.
2. **The audit also says one thing that is wrong.** It claims perfect retrieval caps the saving at about a quarter of tokens. Removing lookup steps acts on window re-reads, and those carry a larger exposure.
3. **The audit missed four real flaws.**
   - The answers were path-and-signature pointer lists, so the reads that would follow them were never counted.
   - The token records that motivate the work come mostly from document and research sessions, while every proposed agent test replays product-code commits.
   - The engine axis never delivered the one thing it could show, H5 timing and size.
   - Where history is thin (mobile seeds), the typed store's win has a candidate explanation that nobody has stated or tested.
4. **The architecture has three structural weaknesses.**
   - Most layers have a cheaper substitute: CLAUDE.md is already in the prefix, docs/CODE-MAP.md already maps the repo, git log and diff give history, and a co-change list gives neighbours.
   - The one layer with a large-saving mechanism, cached model conclusions, is exactly where the build-systems "early cutoff" argument does not hold. Re-checking a model conclusion costs a model call. Conclusions that can be re-checked cheaply were already cheap to derive (a 31-token query).
   - Its "ceiling" figures are exposures measured on cache-read tokens.
5. **The graphify headline (71.5x) is evidence about its baseline, reading the whole corpus, and not about this architecture.**
6. **The "one independent positive" for graphify's document layer is weaker than the lanes say.** It rests on 20 tasks, a 2-task difference, no accuracy interval, a reversal on the second model, and arms that differ by more than the graph.

## 2. The audit, claim by claim

### R1. "The headline axis became the storage engine; the narrowing happened before any arm was built" (audit §1, A1)
**Needs qualification.**
- The owner's own words in `brief.md` asked for exactly this comparison: "a merely self made graph vs a established relational engine is not a fair enough comparison".
- `protocol.md` §1 said, before any arm was built, that given identical facts and algorithm "two engines must return the identical answer". It also said the engine axis would be scored on native algorithms, effort, latency, size and update cost.
- So the protocol did what the owner asked and stated in advance that the result would carry no answer-quality information.
- Fair criticism remains in two places:
  - Addendum 3 item 13 still called H1 "primary", and the grader's headline led with it.
  - H5, the only measure on which engines could differ, has still not been reported. `bench:rewrite` built and proved the timing bench, but the full run, estimated at 2.5 to 10 hours, has not been done.
- The audit's wording ("weakly supported as a reading of the owner's objection") understates how literal the request was. The real missed flaw is that the engine axis yielded nothing at all, because H5 is still missing.

### R2. "Five pre-run warnings were not acted on" (audit §1, §4 table)
**Needs qualification.**
- The agent pilot and the embedding arm were not dropped silently. `protocol.md` §8 lists both, under "Not in this protocol (owner decisions)", in the frozen protocol.
- Whether the owner was asked and answered is not recorded in `graph2/`, as the audit says. That is a gap in the record, not proof of neglect.
- Two warnings truly had no response: community summaries and multi-seed algorithms (critic.txt), and labels for context a change needed but did not edit (verify.txt).

### R3. "'Our experiments are all failing' is false; the typed graph won" (audit §1 point 1)
**Needs qualification.**
- The literal statement holds. H3 is "better" by the pre-declared rule (+0.076 [+0.036, +0.118], `build-e/result.json` grade headline).
- But against the owner's goal, fewer tokens, the test measured nothing. Every answer filled its budget (median 7,999 tokens), and no agent ran.
- The win comes from mobile-app seeds (+0.151). Outside them it is +0.024 [-0.024, +0.074] against search, and +0.001 [-0.051, +0.055] against the co-change floor (`refute:claims`).
- Telling the owner "the graph won" would mislead. "The test did not fail; it did not measure what you asked" is accurate.

### R4. "Co-change is literally the label; truth circularity; co-change stayed the only label" (audit A3, §4 rows)
**Refuted in part.**
- The T1 label is the files changed in the task commit. The co-change feature comes from ancestor commits only (`protocol.md` §3). Before the run, only 62 % of targets had ever co-changed with the seed (`verify.txt`, cited by the audit itself). So the label is not the feature, and 38 % of targets could not be reached by history.
- This is a validity problem of the proxy: it rewards predicting edits. It is not circularity in the strict sense.
- Two task sets used labels built without co-change:
  - T3: chains named in documents, 25 tasks.
  - TQ: 50 questions answered by reading the code and checked blind by a second reader (`protocol.md` §4). TQ explicitly credits context that is read but not edited: tests reaching a function, invariants on a file, readers of a setting, what a change reaches.
- What survives: the primary set (T1) gives no credit for needed-but-unedited context, and TQ is small (30 held-out questions; H4 inconclusive, [-0.060, +0.257]).

### R5. "The owner's 'connections that will or won't break' were never scored" (audit A3 consequence, U4)
**Needs qualification.**
- Three parts of the test are partial proxies for what a change breaks:
  - T2: production change to the tests changed with it.
  - TQ "change reach": question 44 scored typed F1 0.99 against 0 for search (`refute:claims` H4 detail).
  - TQ "tests reaching a function".
- What is missing is an execution oracle: break something and observe what fails. The claim should read: "scored only through edit-history and reader-built proxies, never by execution."

### R6. "A fixed 8,000-token budget: contradicted; the test measured ranking at a fixed spend, not 'small pieces'" (audit A9)
**Needs qualification.**
- The protocol scored recall at 2k, 4k and 16k tokens, the area under the curve, and the share of tasks reaching 80 % recall (grader NOTES table).
- At 2,000 tokens the typed store still beat search, +0.070 [0.029, 0.112].
- Within 16,000 tokens, 66 % of typed tasks reached 80 % recall, against 52 % for search and 56 % for the co-change floor.
- So "small" was measured. What it showed is that small costs recall: typed recall at 2,000 tokens is 0.416.
- What survives: no arm could stop when it had enough, so tokens-to-sufficiency was not measured.
- Missed by the audit (flaw M1 below): the answers were pointers, not content.

### R7. "31 against 695 is the same kind of number as graphify's ratio" (audit A11)
**Needs qualification.**
- Both compare an answer's size with what a baseline reads. The baselines differ by two orders of magnitude in how weak they are.
- Ours is a scripted search that actually ran: it read a median of 695 tokens, and its final answers were 29.5 tokens.
- Graphify's 71.5x baseline is the whole 52-file corpus put in context: about 123,488 tokens against about 1,726 per answer, with no grading (review.md, fetched; weak).
- Ours is a far tighter comparison. Neither is a session measurement.

### R8. "graphify-bench is the only independent positive: doc-and-code 80 % against 70 % (medium)" (audit A4; architecture L2 evidence)
**Needs qualification. I downgrade it to weak and directional.** Fetched README, 2026-11-13:
- **Size.** 20 doc-and-code tasks. 80 % against 70 % is a 2-task difference, and no accuracy interval is given.
- **Tokens.** For Sonnet 5 the token change was -129k [-325k, +33k], which crosses zero. Only the cost interval, -0.084 USD [-0.180, -0.005], excludes zero.
- **The second model reverses the sign.** Haiku 4.5 scored 75 % with graphify against 80 % without it.
- **The contradiction hunt is n = 4**, on a synthetic corpus whose 12 contradictions were planted by the benchmark's author.
- **The arms differ by more than the graph.** The author states that "the graphify arms carry the skill text and per-read nudges, and they never spawn subagents". The baseline delegated to subagents in about half its runs. The doc-layer arm also has its own CLAUDE.md section and hooks.
- **One repetition per task.** The intervals resample tasks only, so run-to-run noise is unmeasured.
- **Inconsistent task count.** The page states both 65 and 105 tasks.
- **The author says** "treat direction, not magnitude, as the finding".
- The audit and the architecture both call this medium. It supports "worth testing", not "the layer that works".

### R9. "Graph type does not decide the result: contradicted" (audit U9; verdict point 3)
**Needs qualification.**
- The evidence is that no source varied graph type with the other factors held fixed. That is absence of evidence, so the status should be "untested".
- The sentence "no source found shows that graph type separates wins from losses" survives. "Contradicted" does not.

### R10. "Graph tools give +17 to 21 points at 1.7 to 4B and 2 to 5 at 32B" (audit A7, U7; architecture open question 10)
**Needs qualification.**
- `lane-graphrag.md` line 152 takes these figures from arXiv 2610.33958 v1, the exploratory version with 79,000 episodes: Qwen3-4B grep 26.8 against graph 37.1.
- `lane-agents.md` reads the later pre-registered version, with 170,500 episodes and a placebo arm: Qwen3-4B grep 0.114, graph 0.191 (+7.7 points), embedding 0.218. There, "embedding arm is never below the graph arm".
- The direction (gains shrink with model size) holds in both versions. The size of the gain and the credit given to the graph do not.

### R11. "Even perfect retrieval caps the saving at about a quarter of tokens" (audit U2)
**Refuted as stated.**
- Fetched content is 22.5 to 28.5 % of context tokens. But a lookup step that is removed also removes a full window re-read.
- Lookup-only calls re-read 43.6 % of context tokens in the testbed, and 55 % in FixFlow (`architecture.md` table, citing the token records).
- Both are exposures, and they overlap, so no single ceiling is established. "About a quarter" is the ceiling for answer size only, not for fewer steps.
- The architecture states this correctly; the audit does not.

### R12. Audit claims that survive as written
- **Live-tree mount (U6).** Addendum 6 item 7 confirms it. An agent arm would be exposed to the full git history.
- **Half of the typed arm's credited recall came through co-change paths.** 0.337 of 0.670 per task (`refute:claims` H3 detail).
- **Tokens to 80 % recall.** 7,152 / 7,014 / 6,283, verified in grader NOTES. As the audit says, these are on different subsets.
- **TUNE and held-out are not exchangeable.** Every arm lost 0.058 to 0.170. Mobile seeds rose from 17 % to 36 %. S1 was +0.011 [-0.004, +0.026].
- **The typed side's own costs were not counted.** Knowing the schema and writing the per-kind programs; addendum 6 item 14.
- **Graphify is not a temporal knowledge graph.** The lanes read the source; I did not re-read it.
- **Stars measure adoption, not effect.**

## 3. Real flaws the audit missed

- **M1. The answers were pointer lists.**
  - The frozen primary is "file granularity, signature form" (addendum 4 item 4). An 8,000-token answer is paths and signature lines, and an agent must then read the files.
  - Recall at 8k therefore measures the quality of the pointers. The token cost of acting on them, the reads that follow, was not counted for any arm.
  - Any "fetch small pieces" claim has to count those follow-up reads.
- **M2. The workload behind the token figures is not the workload the next test replays.**
  - The brief says this repo's recorded sessions are almost all document and research work: 767 edits, only 10 on product code, and 94 of 1,527 reads on product code.
  - The architecture's own measurement says the hottest re-reads are the harness's design documents. The top 30 paths hold 7.1 % of FixFlow tokens, and the 15 documents among them hold 4.9 %.
  - Yet D1 (replayed commits) and D2 (break oracle) both use product-code commits. A win there would not show savings where this owner's tokens actually go. The reverse is also true: a null there would not rule out savings on design prose.
- **M3. The engine axis produced no information of any kind.**
  - Answers were identical by construction, and H5 (latency, size, update cost, query effort) was never run.
  - So "graph database against relational" is still unanswered on the only dimension where it could differ. Calling it "equivalent" is correct only for answers.
- **M4. A candidate explanation of the mobile win was never stated or tested.**
  - On mobile seeds the co-change floor reached only 0.484 recall, against 0.691 on backend seeds (`refute:claims`).
  - A hypothesis follows: the typed store helps where history is thin, such as newer code with few ancestor commits.
  - If true, that matters for new features. It is untested, and I offer it as a hypothesis only.

## 4. The architecture, layer by layer

- **L0, working-tree overlay. Survives as engineering.**
  - It is needed only if the store is queried during edits.
  - "What did I change" is already `git diff`. Rename identity is heuristic and its error rate is unmeasured.
- **L1, structure graph. Needs qualification: there is a cheaper substitute for most of the repo.**
  - Outside mobile seeds the typed store tied the co-change floor (+0.001 [-0.051, +0.055]).
  - A precomputed co-change list, one `git log` pass, is as good there and costs nothing to maintain.
  - The win the graph showed is on one runtime and over a padded scripted search.
  - The pre-registered study credits an embedding entry more than graph tools (`lane-agents.md`).
- **L2a, deterministic doc layer, and the rules tool. Needs qualification; largely covered already.**
  - The 20 invariants and their anchors come from CLAUDE.md, which is already in every call's prefix. Arch §2 says it is about 7,400 tokens; that is my reading of the source.
  - While CLAUDE.md stays pushed, a rules answer repeats content the agent already holds, at extra cost.
  - Edit-time invariant warnings (L5c) need only the 90-row anchor table and a hook, not a graph.
  - Slice cards (L5b) overlap `docs/CODE-MAP.md` Part 3, which already maps each feature to where it lives.
- **L2b, model-read claims bound to code. Needs qualification: weak evidence, stale-prone, cost estimate weak.**
  - **Evidence.** The supporting evidence is R8, which is weak. The opposing evidence is medium to strong: the ETH AGENTS.md study found model-written context files raised cost by about 20 to 23 %; free summary reuse in SWE Context Bench scored 22.22 % against 26.26 % with none.
  - **Staleness.** 517 of 1,268 backticked file names in the docs (41 %) do not resolve today. Claims anchored there cannot be invalidated by structure, so they can only be marked unanchored. For those claims, staleness is managed by hope.
  - **Determinism.** Build non-determinism is unmeasured.
  - **Cost.** "About 2 USD" scales one third-party figure by word count (weak).
  - **Leakage.** A build from the live tree leaks later fixes into replays. The architecture names this risk.
- **L3, time by commit ancestry plus early cutoff. Needs qualification: the core argument breaks where the savings would be.**
  - Early cutoff (Skyframe, Salsa, rustc) works because re-checking means re-running the same cheap deterministic function and comparing results.
  - Conclusions that are deterministic here are already cheap: 31 tokens, about one query.
  - The expensive conclusions are model-made, and the architecture says a changed anchor marks them "suspect, never false". Re-checking a suspect conclusion needs a model call, which may cost about as much as deriving it again. Not serving it lowers the hit rate.
  - Fan-out works against reuse. Arch L1 risk: 73 % of code commits touch a file with reach over 15. Negative dependencies ("no other caller") are invalidated by any new edge of that kind anywhere.
  - "What changed near X since K" is mostly `git log`/`git diff -- <path>`.
  - Nothing here is measured. The architecture correctly puts the D4 replay first.
- **L4, cached conclusions (the owner's library). Needs qualification.**
  - The architecture calls it the only layer with a large-saving mechanism. Its own source, the library-pathways model with mostly guessed inputs, puts it at 1.03 times the cost of the cheap-model ladder at middle values, and at 0.82 only in the favourable corner.
  - Outside code evidence is flat or negative: VibeMemBench, 11 of 12 pairings no better than memory off; SWE Context Bench, free reuse below baseline.
  - "Mechanism for large savings" holds only per case (one reuse avoided about 15M tokens). It has not been shown as a rate.
- **L5, orientation, and the push-to-pull factor P. Needs qualification.**
  - The "2.5 to 5 % of FixFlow context tokens" is an exposure on prefix tokens, which are mostly cache reads. Whether cache reads count against the owner's limits is an open question in the architecture itself (open question 11).
  - Pulled text enters the uncached tail of the window and is then re-read on every later call. If it is pulled often, it can cost more than the cached prefix it replaced.
  - The cost of a missed rule is a paid-for trap.
- **L6, a command-line tool with cited lines. Survives as a design choice.**
  - A command-line tool avoids adding tool-schema tokens to the prefix.
  - Adoption risk is real: published adoption runs from 0 calls in 60 sessions to 42 % of trials.

Other architecture statements:
- **"A graph database does not store connections more compactly."** Needs qualification. Bytes on disk (H5) were not measured in the finished test; the only size comparison is from the first, rejected test. Storage size also does not enter token cost, so the point is moot for the owner's question.
- **"All 477 dependency queries take about 1 ms together."** Needs qualification on the source. The figure is from the first, rejected test's in-memory JSON graph (HARNESS §6), not the finished engines, whose H5 is unmeasured. The conclusion survives anyway: a model step is about 6.6 s (`brief.md`), and the bill is in tokens, not milliseconds.

## 5. What would make the wider test look good for the wrong reason

1. **Weak baselines.**
   - Reading every file (graphify's 71.5x).
   - A scripted search padded by co-change.
   - An A0 arm whose CLAUDE.md has been weakened. A0 must keep today's full CLAUDE.md, or the parent-era one at full strength.
2. **Measuring tokens without measuring whether the answer is right.** Graphify's own benchmark command does exactly this (issue 4341, open, no maintainer reply). That issue's independent check on 177 SWE-bench Lite issues, graphify 0.9.85: graphify's answer put the right file first in 25 % of issues (first 5: 38 %; anywhere in its about 2,000-token answer: 62 %). BM25 over the .py files put it first in 32 % (first 5: 64 %; within its top 50: 92 %). Medium.
3. **Building the index after the answer exists.**
   - A model-read layer or seeded conclusions (A3) built from the live tree or later docs.
   - L4 entries seeded by replaying commits whose questions overlap the test tasks.
   - D5 "which invariant applies" questions labelled from the same CLAUDE.md that L2a is built from. That is the circularity the audit criticised in T1, repeated.
   - Planted contradictions written by someone who knows what the layer extracts.
4. **Uncounted costs.**
   - Build and seeding tokens.
   - Re-checks of suspect entries.
   - Subagent tokens. graphify-bench's main-session-only usage changed its sign.
   - Tool-schema and pointer prefix.
   - The follow-up reads after pointer answers (M1).
5. **Confounds.**
   - Steering, hooks and nudges against no steering.
   - Arms that spawn subagents against arms that cannot.
   - Forcing the first query.
6. **Forking paths.**
   - The arm list has at least 11 arms plus factors S, P, E and T, while the main run has 3 arms. Choosing arms on the pilot and confirming on the same tasks would inflate any win.
   - Confirm on fresh commits. The 75 held-out commits are spent.
7. **Workload mismatch (M2).** Product-commit tasks when the spend is on design documents. This cuts both ways.
8. **Too little power, read as an answer.** With about 40 tasks x 3 runs only a 12 to 16 % token change is detectable (`lane-evaluation.md`, the lane's own arithmetic). A null result is "no evidence at this size".

## 6. Is the graphify headline evidence for the architecture?

No. The 71.5x is about 123,488 estimated corpus tokens divided by about 1,726 tokens per answer, over five generic questions (review.md, fetched 2026-04-04 page). No answer was graded. The same corpus, code only, gives 8.8x (16,997 against 1,929). Any retrieval method beats reading everything, so the number is evidence about its baseline only. Its one agent result on code is n = 6 (lanes; not re-fetched). Strength: weak.

## 7. Could not verify

- Whether the owner was asked about the agent pilot or the embedding arm.
- The later, pre-registered version of arXiv 2610.33958. I compared the two lanes' readings and did not fetch the paper.
- Whether graphify-bench's doc-and-code cost row includes the baseline's subagent tokens.
- Whether its tasks were written before the graphs were built (the page does not say).
- H5 timing and size: never run.
- Every fetched page is a small model's summary.
- Architecture figures I did not recompute: the CLAUDE.md byte count, the 1.03 and 0.82 factors, the top-30 shares.
