# Design check: the wider knowledge-layer test (2026-11-13)

Lane: CHECK OF THE DESIGN. I looked for ways the drafted test could mislead before anyone builds it. This file is the only one I wrote. I did not run, install or download anything. I did not commit or switch branch.

## 0. What I read and how

- The draft: `widen/design-draft.md` (read in full).
- The lane notes: `lane-evaluation.md`, `lane-graphify.md`, `lane-agents.md` and `lane-temporal.md` (all read in full); `architecture.md` §0–§10 (read in full); `refuter.md` (read in full). From `critique-assumptions.md` I read only the headings.
- The finished test: `graph2/protocol.md` (the split lines).
- The token record: `docs/program/TOKEN-BOTTLENECK-2026-11.md` (lines 1–49).
- The knowledge-store design at commit 6fba000 (read via `git show`), with the knowledge-store track note in the owner's memory.
- My own measurements, all read-only:
  - `git log` counts of product-code commits by month, and after the frozen commit `a31924a`, across all refs.
  - The size of the finished test's facts cache: `scratchpad/hb/graph2/build/facts/cache` holds 191 entries, 745 MB by `du`.
- One web page, fetched 2026-11-13: https://raw.githubusercontent.com/Graphify-Labs/graphify/v8/graphify/skills/claude/references/hooks.md . It was read through a fetch tool that has a small model summarise the page.
- All arithmetic marked "my arithmetic" uses a normal approximation, with the lane's own standard errors as inputs. It is not a simulation.
- Strength labels: strong = independent and controlled; medium; weak = self-reported, anecdote or marketing.

## 1. Bottom line

1. **The draft is the right shape, and most of it is sound.**
   - It puts a real agent in the loop and counts every token bucket.
   - It counts build cost, uses a placebo arm and a plain-index control, and keeps references sealed.
   - It tests invalidation first with no model, and it fixes the live-tree leak.
   - It is honest about graphify's 71.5x and about the mismatch between the test's workload and the owner's.
2. **The test cannot deliver what its summary promises.** It says it turns the owner's "graph vs knowledge graph vs TKG" question into measured contrasts. As drafted:
   - A2 (meaning) is not in the main change-task run.
   - The step contrasts (A2 against A1, A3 against A2) are secondary only.
   - A3 bundles time validity together with cached conclusions.
   - No arm is a temporal knowledge graph as the field means it. Graphiti (T) is optional and not recommended.
   - So the owner's headline question can get intervals, never a verdict. (§3, P1)
3. **The verdict rules make "cannot tell" the likely outcome even for an arm that truly helps.** (§3, P2–P4)
   - The correctness guard passes a truly harmless arm only about 51 to 64 % of the time.
   - A YES needs a point estimate of 0.85 or lower, so a true 15 % saving gets YES only about half the time.
   - On change tasks, the stale-answer bound (under 2 %) cannot be met unless about 150 cache hits with zero stale answers are observed.
4. **Two rules are wrong as written.**
   - The phase-1 STOP rule fires on the file-hash policy, which is expected to serve stale answers. Showing that is the experiment's purpose. (P5)
   - "No reference produced by an extractor an arm uses" is broken by the change-task column built from CLAUDE.md invariant anchors, unless those anchors are rewritten by hand. The only existing anchor table, the 90 `constrains` anchors, came from the finished test's docs extractor, which A1 and A2 reuse. (P8)
5. **Hidden costs and hidden decisions.**
   - A3 needs the knowledge store built. v1.3.1 says nothing is built, and the owner's own gate (D1 audit, then a second yes, D1b) comes before any build. Reaching its pilot is about six sessions, half of them on Opus.
   - The draft lists A3 with "Installs: none" and prices it as seeding only. (P10)
   - The per-run token figure of 1 to 3M comes from lean SWE-bench harnesses. In this harness an agent call averages 113 to 123k tokens of context, about 60k of it fixed prefix. If the test uses the real harness, the cost is likely 2 to 4 times the estimate. If it strips the harness, A0 is not "how agents work today". (P11)
6. **The owner's literal words are not all covered.** The draft omits or drops these without saying so:
   - What "spatial topology" maps to.
   - The graph-database speed and size measurement (H5): the timing bench is built, has never been run, and costs zero tokens.
   - Traversal caching.
   - A temporal knowledge graph as shipped.
   - The push-to-pull factor P and the slice-card orientation layer, both in `architecture.md` §7. (P12)
7. **There are not enough fresh change tasks today.**
   - `main` has 0 product-code commits after the frozen commit `a31924a` (2026-08-03).
   - Across all refs there are 31 product-code commits since 2026-08-04, 27 of them dated 2026-11-13.
   - All 140 usable commits of the history are already spent (65 tuning, 75 held-out; `protocol.md` line 9).
   - So 40 fresh held-out commits do not exist yet, and the 14-day follow-up label column cannot be filled for them. (P9)

## 2. Where the owner is right and where he is not (as it bears on this design)

- **Right.**
  - The finished test did not measure an agent's tokens.
  - It left out model-read meaning, time validity, cached conclusions and orientation.
  - Graphify's one independent positive result sits in the document layer that was left out (`lane-graphify.md` §4C; weak to medium, 20 tasks).
  - The draft still under-serves his words in four places: spatial topology, the graph database's speed and size, traversal caching, and a temporal knowledge graph as shipped (P12).
- **Not right, or not shown.**
  - Stars are adoption. Graphify has 146,932 stars (GitHub API, 2026-11-13, `lane-graphify.md` §5).
  - The 71.5x is a size ratio against reading the whole corpus, with no answer graded (weak).
  - No source varies graph type with everything else held fixed, so "the wrong kind of graph" is untested, not shown (`refuter.md` R9).
  - "All failing" is false. The finished test reported a better result for the typed store, though only on mobile seeds.
- **The design's own blind spot, which the owner did not name.** Most of his measured spend is in long orchestrator windows and the subagent prefix (`TOKEN-BOTTLENECK-2026-11.md`, levers 1 and 2), and design and document work. The test's main sets replay product commits, and the document stratum has about 20 questions, too few for a verdict (P13).

## 3. Problems, each with the exact fix

### P1. The graph / KG / TKG question gets no verdict (the summary's central promise)

- **Evidence.**
  - Draft §6: the main change-task arms are A0, A1, A3 and G2, so A2 is absent.
  - The primary contrasts are A1, A3 and G2, each against A0.
  - A2 against A1 and A3 against A2 are secondary.
  - A3 = A2 + "validity by commit ancestry" + "a store of verified conclusions", so time and caching are never separated.
  - T (Graphiti, the only temporal knowledge graph as shipped) is optional and recommended "not now".
- **Effect.** "A3 beat A0" could come from structure, from meaning, from time or from the cache. "A2 beat A1" is never tested on change tasks.
- **Fix.**
  1. Rewrite the summary sentence as: "Graph type gets descriptive step contrasts with intervals; only A1, A3 and G2 against A0 can carry a verdict."
  2. Or make the step contrasts primary: A1 against A0, A2 against A1, and A3 against A2. Put A2 in the main change-task run, replacing G2 there; move G2's primary contrast to the questions set, where its only independent gain lies.
  3. Split A3 into A3t (time only: `changed --since`, as-of queries, validity labels on facts and claims, no stored conclusions) and A3c (A3t plus cached conclusions). A3t against A2 is then the "TKG-style" contrast.
  4. State plainly: "No temporal knowledge graph as shipped is tested unless the owner chooses T."

### P2. The correctness guard is too weak to pass a harmless arm reliably

- **Evidence.** Draft §1: YES needs the one-sided 95 % lower bound of the correctness difference to be above −10 points. `lane-evaluation.md` §5 gives the paired standard error as 5 to 6 points at 40 tasks and 3 runs.
- **My arithmetic.**
  - With a true difference of 0, the lower bound is d̂ − 1.645 × SE.
  - P(bound > −10) = Φ((10 − 1.645 × SE) / SE). That is 0.64 at SE 5 and 0.51 at SE 6.
  - It is lower again if the correction for three contrasts also applies to the guard (z = 2.39): 0.33 to 0.47.
- **Effect.** A harmless arm that saves tokens is labelled "cannot tell" about 40 to 50 % of the time on correctness alone.
- **Fix.**
  - Report the probability of a YES for a stated good arm (say 25 % saving, no loss) before the pilot, and let the owner choose:
    - (a) a 15-point margin;
    - (b) a guard on pooled change and question tasks (n ≈ 110);
    - (c) accept that most YES verdicts will come back "cannot tell".
  - State in §6 whether the guard is corrected for three contrasts.

### P3. The YES threshold on tokens has about 50 % power at the threshold itself

- **Evidence.** YES needs the point estimate at 0.85 or lower and the interval wholly below 1.00.
- **My arithmetic.**
  - From the lane's detectable change of 11.7 to 15.6 % (k = 3, n = 40), the standard error of the log ratio is about 0.044 to 0.061.
  - A true 15 % saving gives P(point ≤ 0.85) = 0.50.
  - A true 20 % saving gives 0.84 to 0.91; a true 25 % saving gives 0.98 or more.
  - If the run-to-run spread is twice the assumed value (`lane-evaluation.md` §5 caveat), these probabilities fall sharply.
- **Fix.**
  - Say "detects reliably only savings of 20 % or more" instead of "detects about a 12 to 16 % change".
  - Or drop the point-estimate condition and keep "interval wholly below 0.95".
  - Re-derive power after the pilot measures sigma and tau, then freeze.

### P4. The stale-answer criterion cannot be met on change tasks

- **Evidence.** YES for a caching arm needs the stale-rate upper 95 % bound below 2 %.
- **My arithmetic.** With zero stale answers in n hits, the upper bound is about 3/n (the rule of three), so n must exceed about 150 cache hits. Forty change tasks with a few lookups each will not reach that.
- **Fix.** Compute the stale criterion on set K (40 claims × 15 steps = 600 claim-steps, where it has power), not on change tasks. On change tasks, report stale answers used as a count, scored as wrong.

### P5. The phase-1 STOP rule is wrong

- **Evidence.** Draft phase 1: "STOP and fix if any invalidation policy serves a stale answer". The policies include "file hash". `lane-temporal.md` §5.2: "Finding a nonzero here is a result, not a failure". The dependency stratum exists precisely because a file hash misses those cases.
- **Fix.** Use this rule instead: STOP and fix if a fact-level policy (with or without early cutoff) serves any stale answer. Report the file-hash and whole-repo policies' stale rates as findings.

### P6. A3's store and the run order conflict, and seeding decides the result

- **Evidence.**
  - Draft fairness rule 3 interleaves arms in random order.
  - A3 seeds "while solving the development tasks", and each run's records feed later tasks.
  - If seeds come from areas far from the held-out tasks, the hit rate is near zero (a strawman). If they come from overlapping or later commits, the arm sees the future.
- **Fix.**
  - Pre-declare the seeding rule. The store used at parent P contains only conclusions recorded in sessions run on exports of ancestors of P (the knowledge-store `applies_while` rule).
  - Run A3 in chronological order within each of its 3 independent store chains. Run the other arms interleaved around those chains.
  - Report the hit rate, and the age of each hit in commits.
  - Count the seeding sessions' tokens, including any reviewer pass, against A3.

### P7. A0 and graphify can be handicapped by the environment

- **Evidence.**
  - The draft gives agents "no .git history". Graphify's post-commit hook finds changed files "via `git diff HEAD~1`" (hooks.md, fetched). Whether `graphify update .` works without git is unverified.
  - Baseline agents normally use `git status` and `git diff` to see their own edits.
  - Whether A0 may spawn subagents is not stated. graphify-bench showed the baseline's subagent delegation moved graphify's token delta from +32k to +107k (`lane-graphify.md` §4C; medium). Graphify's shipped instructions also tell the agent to pass the rule into subagent prompts.
  - Claude Code's version is not pinned, and its system prompt changes token counts.
- **Fix.**
  - Initialise each export as a fresh single-commit git repository (the control Cursor recommends; `lane-evaluation.md` K2), so `git diff` works and no history exists.
  - Give every arm the same subagent ability, with the tool usable inside subagents.
  - Pin the Claude Code version and record each run's system-prompt hash.
  - Measure G2's build tokens from transcripts, not from graphify's own counter: one user found it under-counts subagent usage (`lane-graphify.md` §5).

### P8. Reference leaks and circularity

- **(a) The CLAUDE.md invariants column of change tasks.** If the code anchors come from the 90 `constrains` anchors made by the docs extractor (`architecture.md` §L2a), the reference is produced by an extractor that A1 and A2 reuse.
  - Fix: blind readers write the anchors by hand at each parent, or that column is reported apart and never credits A1 or A2.
- **(b) The break oracle.** A1's TypeScript facts come from the TypeScript compiler API, and the oracle uses `tsc`, so A1 is partly scored by its own source.
  - Fix: report the oracle's results by reference source (test failures, mypy, tsc, import-linter). The headline uses test failures only.
- **(c) A2's commit-message reads.** `git archive` carries no commit messages.
  - Fix: A2 at parent P reads only messages of ancestors of P. It never reads the task commit's own message, from which the task statement is written.
- **(d) The replayed lookups.** Programme documents were untracked and change daily. A frozen copy made now is later than the recorded lookups.
  - Fix: label that stratum "index built from a later snapshot", and keep it screening only, as the draft says.
- **(e) Questions written by the arm designers.** "Which rule applies" and "the other half of a rule" match A2's claim schema.
  - Fix: draw at least half the question set from an independent source. Options: the free-text recorded lookups, defects named in the handoff documents, questions the owner writes. Pre-declare a kind mix weighted by observed session lookups.

### P9. There are no fresh held-out change tasks yet

- **My measurements** (git, read-only):
  - Non-merge product-code commits on `main`: 1 in May, 99 in June, 103 in July and 4 in August. There are 0 after `a31924a`.
  - Across all refs since 2026-08-04 there are 31 product-code commits, 27 of them dated 2026-11-13. Some are style or test-only, so fewer are usable.
  - Every one of the 140 usable historical commits is spent (`protocol.md` line 9).
- **Fix.**
  - Make the held-out set prospective: hash the protocol, then take the first N usable ship-phase commits.
  - Wait 14 days after the last one before sealing, so the follow-up-fix column can be filled. Otherwise drop that column for all tasks.
  - State the expected date this becomes possible. Move phase 0's STOP threshold (25 commits) to explicit power figures for 25, 30 and 40 tasks.

### P10. A3's build is hidden

- **Evidence.**
  - The knowledge-store design v1.3.1, §0 (via `git show 6fba000`), says that to reach the go/stop point takes "about six sessions (audit, core, retrieval, gate, seed, pilot), about half of them Opus".
  - The owner's next step is D1, a free audit, then "a second yes from you (D1b)" before any build.
  - The design is a store of solved defects and traps triggered by failures. Impact analyses, flow explanations and slice summaries are kinds that `architecture.md` §L4 adds, and that is new design.
  - The graph upgrades A2 and A3 need are extractor engineering, uncounted. These are the line anchors, span hashes, negative-dependency index, working-tree overlay, claim extractor and resolver (`architecture.md` §L1–L3).
- **Fix.**
  - Add an "engineering build" row per arm, with an estimate in sessions and tokens.
  - Add an owner decision: "Building A3 requires the knowledge store. Run KS-0 and get D1b first, or test only K0 and K1 (no agent) until then."
  - Write A3's spec as "v1.3.1 plus new kinds (unreviewed)", not as "v1.3.1".

### P11. Cost is likely understated

- **Per-run tokens.**
  - The draft assumes 1 to 3M per change-task run "from published SWE-bench traces".
  - In this harness an agent call averages 113 to 123k tokens of context, of which about 60k is fixed prefix, about 50k of that tool and connector schemas (`TOKEN-BOTTLENECK-2026-11.md`, lines 23 and 44).
  - My arithmetic: a 30- to 80-call change task is about 3.5 to 10M tokens; a 5- to 10-call question run is about 0.6 to 1.2M.
  - So with the real harness, the pilot is about 0.5 to 1.8B and the main run about 2 to 6.5B. That is up to three times all recorded FixFlow context tokens (2.13B, not 2.2B, plus 24.6M output).
- **Omitted from the estimate.**
  - A3 seeding chains and reviewer passes.
  - K1.
  - The 90 agent runs on the break oracle.
  - The sufficiency check (a fixed model writes patches from the reference context).
  - Judge passes (5 per rubric answer).
  - Reruns after leak exclusions or a tool that silently failed to connect (two published cases lost whole runs; `lane-agents.md` §1).
  - Per-parent dependency installs: Python, npm for web and mobile. This costs disk and time per parent and is shareable only when lockfiles match.
  - Engineering builds (P10).
- **Human time, unpriced.**
  - Two readers on each of 100 questions.
  - Two readers on 600 claim-steps for K.
  - Task statements for about 52 commits.
  - Needed-but-unedited labels.
  - The 20 to 30 % human samples.
  - If the readers are human, the human is the owner.
- **Machine contention, unpriced.** 15 to 60 hours of containers on a PC whose gate slots the ship plan also uses (commit fd1b643, "gate lock"), plus plan-quota use.
- **Fix.**
  - Re-estimate with two harness settings, "as deployed" and "stripped prefix", and make that choice an owner decision. It also decides whether A0 is the real baseline.
  - Add the omitted rows, an owner-hours line, a quota and machine-time line, and a stop budget for each phase.

### P12. The owner's words are only partly covered

| Owner's words | Where the draft measures it | Gap and fix |
|---|---|---|
| Graph database | Not tested again ("speed does not enter token cost") | The timing and size bench (H5) is built, has never run, and costs zero tokens (`refuter.md` R1, M3). Run it in phase 1, so "graph DB: same answers, measured speed and size here" is a measured statement. |
| Spatial topology | Undefined | Pre-declare a reading. Graph neighbourhood and hop count are tested by A1 `neighbors`/`impact` with per-kind hops. Code locality is covered by the same-folder floor. Embedding space is arm E. Report each under that label. |
| Temporal topology / TKG | Folded into A3 | Split A3 into A3t and A3c (P1). Offer T as a K-only arm, with its cost stated neutrally. |
| Caching | A3, K, token buckets | Add a stated result: the existing prompt cache already covers 94.9 % of context tokens (`TOKEN-BOTTLENECK`), so a database cache can act only on the rest. Report savings per bucket. |
| "Don't traverse unnecessary nodes" | Dropped | The 1 ms figure for 477 queries comes from the first, rejected test's in-memory graph (`refuter.md` §4). Measure traversal latency, cold and warm, in H5, and say it does not touch tokens. |
| Invalidation | K0, K1, A3s | Covered, after fix P5. |
| Semantic relations; connections that will or won't break | A2, G2, break oracle | Covered, after fixes P1 and P8b. |
| Small pieces, very fast | Tokens added by tool results; tool latency | Add tokens-to-sufficiency: the first point at which the needed context has been read. |
| Orientation, push to pull | Questions only; factor P and slice cards dropped silently | Restore factor P as a decision. Moving CLAUDE.md reasons to pull is "the largest number in this whole design" (`architecture.md` §L2b), and the riskiest. Leave it to the owner; do not drop it silently. |

### P13. The workload mismatch caps what any result can say

- The owner's tokens go mostly to design documents and orchestrator windows (`architecture.md` §2; `refuter.md` M2).
- The draft's only set aimed at that spend is an optional document stratum of about 20 questions, which cannot carry a verdict.
- **Fix.** Either make a document-work set co-primary, with 40 or more items on a frozen copy, or put this sentence in the headline of every report: "Results speak to product-code tasks only; no verdict is possible on design and document work, where most measured spend is."

### P14. Measures that can be gamed

- **(a) Failing early saves tokens.**
  - Fix: count capped or failed runs at the token cap.
  - Report tokens per successful task and pass^k beside the primary.
- **(b) Build-cost spreading depends on a free denominator, "tasks served by that index state".**
  - Fix: pre-declare the denominator as sessions per commit in the owner's records.
  - Report sensitivity at 1, 10 and 100 sessions per commit. A2 and G2 verdicts must hold at the pre-declared value.
- **(c) A judge favouring long answers.**
  - Fix: score rubric questions by atomic key-fact coverage, as SWE-QA and graphify's maintainers do, with a penalty for unsupported claims.
  - Report the correlation between judge score and answer length per arm. A same-provider judge's self-preference is constant across arms, but verbosity bias is not.
- **(d) An unweighted sum of tokens hides a prefix trade.**
  - Fix: keep the four-bucket sum as primary, matching the owner's records.
  - Add a pre-declared secondary on non-prefix tokens. If the two disagree, say so.
- **(e) Questions-set contrasts are unnamed.**
  - Fix: name, per primary contrast, the task set it is computed on. A0x appears only on questions, so a change-task win by A1 cannot be credited to "graph rather than index".

### P15. Smaller items

- The 190 snapshots are parents of task commits, not necessarily consecutive commits. Check consecutiveness for K's 15-step walks.
- K0's ground truth is the extractor's own view. It proves a policy is consistent with the facts, not with the code. K1's blind readers are the only test of real staleness.
- G2's "same provider" pin survives. Graphify's default extraction already runs through the host assistant's model (`lane-graphify.md` §1).
- Factor S on A2 and G2 only survives as designed. A1 and A3 then get no forced-call condition, so low adoption there reads as "agents did not use it", as the draft already says.

## 4. Claims in the draft, judged

| Claim | Result | Why |
|---|---|---|
| The finished test did not fail; it did not measure tokens | Needs qualification | It measured answer tokens (31 against 695) and recall at 2k to 16k tokens. It did not measure an agent's session tokens. |
| The 71.5x is a ratio against reading the whole corpus | Survives | `lane-graphify.md` §3.1. Weak, self-reported, ungraded. It is the average of five answers, not "one answer". |
| Graphify's own code-agent figure is 6 questions | Survives | BENCHMARKS.md ERPNext n = 6 (weak). |
| Independent controlled runs on code with a strong model are flat or negative | Needs qualification | Essentially one controlled independent study, graphify-bench (one repetition, synthetic corpus). The others are anecdotes or a retrieval-only check. On a weaker model (Haiku), graphify saved tokens on code tasks. |
| The one independent positive is weak and directional | Survives | `refuter.md` R8. |
| Graphify is not temporal | Survives | `lane-graphify.md` §1, read from source. |
| Graph type deciding the outcome is untested | Survives | As absence of evidence. |
| Each layer as a switch gives the graph / KG / TKG question a measured answer | Refuted as drafted | P1. |
| A0 is the real baseline | Needs qualification | P7 and P11: subagents, git, harness prefix. |
| Graphify runs as shipped | Needs qualification | P7: environment without git. |
| Indexes from a parent export leave no leak | Needs qualification | P6 and P8c. |
| No reference is produced by an extractor an arm uses | Needs qualification | P8a, P8b. |
| The main run detects about a 12 to 16 % token change | Needs qualification | P3. The assumed spread comes from a single 5-task study of one model. |
| Correctness serves as a guard | Needs qualification | P2. |
| The stale criterion is under 2 % | Refuted as workable on change tasks | P4. |
| Phase-1 STOP on any stale serve | Refuted | P5. |
| Cost: pilot 0.17 to 0.55B, main 0.6 to 2.0B tokens | Needs qualification, likely understated | P11. |
| FixFlow recorded about 2.2B context tokens | Needs qualification | 2.13B context plus 24.6M output. |
| A3 needs no installs; its cost is seeding; v1.3.1 is its spec | Refuted | P10. |
| Held-out change tasks come from fresh commits | Needs qualification | P9. |
| A2 build costs 0.3 to 1M tokens | Needs qualification | Depends on the route. Run through harness subagents, every call carries the about 60k prefix. |
| Product-code results may not transfer to the owner's spend | Survives | Add P13. |
| Not re-testing engines, because speed is not tokens | Needs qualification | P12: H5 is free and answers his literal words. |
| Factor S separates steering from content | Survives | On A2 and G2 only. |
| Fairness: arms interleaved in random order | Needs qualification | Conflicts with A3's chronological store (P6). |

## 5. Sentences that must not be said about this design

- "This test answers whether a graph, a knowledge graph or a temporal knowledge graph is the right choice." (Only descriptive step contrasts, plus no TKG as shipped unless T runs.)
- "A3 tests a temporal knowledge graph." (It bundles commit-ancestry validity with a conclusion cache; it is not a TKG as the literature means.)
- "The test can detect a 12 % token saving." (Only at about 50 % power at the threshold; reliably only 20 % or more, under assumed variance.)
- "A 'cannot tell' result means the layer does not help."
- "A 'no' on change tasks means no saving on the owner's sessions." (Workload mismatch, P13.)
- "A3 needs no installs or build."
- "The main run costs at most 2 billion tokens." (Likely understated, P11.)
- "Held-out tasks are fresh commits." (Not until prospective commits exist, P9.)
- "References are independent of every arm's extractor." (Not without P8a and P8b.)
- "Graphify was tested exactly as its users run it." (Not without a single-commit git repository and subagent parity, P7.)
- "The graph database question is settled." (Answers are identical; speed and size, H5, are unmeasured.)
- "Caching on top of the graph was tested." (Traversal caching was not; conclusion caching is A3 and K.)
- "Graphify's stars or its 71.5x show it works on code."
- "The finished test failed." / "Graphs add nothing."
- "The owner's design-document spend is covered by this test."

## 6. Could not verify

- Whether `graphify update .` works without a .git directory (the hooks page does not say).
- Whether the 190 cached snapshots form consecutive runs long enough for 15-step walks.
- The real per-run token cost in this harness for a change task. My 3.5 to 10M figure is arithmetic from average context per call, and the 30 to 80 calls per change task are my assumption.
- How many of the 31 recent product commits meet the "2 to 30 existing files" rule, and whether they run at their parents.
- Whether cache reads count against the owner's plan limits (`architecture.md` open question 11).
- Every outside figure comes from the lane notes, read through a summarising fetch tool. I re-fetched only the graphify hooks page.
