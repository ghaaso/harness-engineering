# Wider knowledge-layer test: protocol draft for the owner's decision

Status: DRAFT, 2026-11-13. Nothing here has been run, installed or frozen. Every token and time figure
marked "estimate" is my arithmetic from stated assumptions, to be replaced by pilot measurements.
Sources: the five lane notes, critique-assumptions.md, architecture.md and refuter.md in this folder.

## 0. Why a second test, in two paragraphs

The finished test answered a narrower question than the owner asked. It scored deterministic parser facts at
one snapshot per commit, with no agent, on recall of the files a commit changed inside a filled 8,000-token
answer. It did not test model-read meaning, summaries, time validity, cached conclusions, or tokens spent by an
agent. It did not fail: a typed store beat a scripted search by +0.076 recall [+0.036, +0.118], but only on
mobile-app seeds, against a scripted search, at a filled budget. It simply did not measure tokens.

Graphify's popularity is not a result to match. Its 71.5x is the whole corpus (about 123,488 tokens) divided by
one answer (about 1,726 tokens), ungraded (8.8x on code alone). Its one code-agent figure is 6 questions.
Independent controlled runs on code with a strong model are flat or negative; the one independent positive
(doc-and-code questions, 80 % against 70 % on 20 tasks, sign reversed on a smaller model) is weak and directional.
Graphify is a parser graph plus a model-read document layer; it is not temporal. Whether graph type (graph,
knowledge graph, temporal knowledge graph) decides the outcome is untested anywhere I could find. This test makes
each layer a switch so that question gets a measured answer.

## 1. The question and the verdicts, fixed in advance

Question: on this repository, does a knowledge layer (structure, meaning, time with cached conclusions,
orientation) let an agent do the same work with fewer total tokens and no loss of correctness, and which layer
earns its cost?

Primary outcome: total tokens per task, all model calls including subagents, plus the layer's build and update
tokens spread over the tasks it served, plus its tool descriptions in every call. Analysed as the geometric-mean
ratio of an arm against the baseline, paired by task, 95 % interval by bootstrap over tasks.
Guard outcome: correctness against the sealed reference (tests pass for change tasks; set F1 or rubric for questions).

- YES for an arm: the token-ratio interval lies wholly below 1.00, the point estimate is 0.85 or lower, the
  one-sided 95 % lower bound of the correctness difference is above -10 points, and (arms that cache) the
  stale-answer rate's upper 95 % bound is below 2 %.
- NO for an arm: the token-ratio interval lies wholly above 0.85 (a 15 % saving is ruled out), or the whole
  correctness interval is below zero, or stale answers exceed 2 % at the lower bound.
- CANNOT TELL: anything else. Also: if the arm's tool was called in fewer than 20 % of runs, the verdict is
  "agents did not use it", not "it does not help".
- Which layer earns its cost: the step contrasts in §2 (each layer against the arm below it) are secondary and
  reported with intervals; only the three primary contrasts (§5) may carry a YES or NO in the headline.
- The 15 % and 10-point thresholds are proposals; the owner sets them before the pilot ends (decision 9).

## 2. Arms (each arm = one fixed tool set given to the same agent)

All arms: same agent model and effort, the parent-era CLAUDE.md in the prompt, default search and read tools.
Layers are added on top of the baseline, never instead of it. A layer appears only where it needs the one below.

| Arm | What it is | Why it is in | Build cost (estimate) | Installs | Data leaving the machine |
|---|---|---|---|---|---|
| A0 baseline | Agent with ordinary search and read only | The real baseline: how agents work today, not a script and not "read every file" | None | None | Prompts and file text to the model provider, as in every arm |
| A0p placebo | A0 plus a tool with an equal-length description that returns plausible, useless output | Separates "an extra tool and its description" from "this content" | Minutes of scripting | None | As A0 |
| A0x plain index | A0 plus capped keyword search (SQLite full-text, BM25 ranking) over symbols, signatures and doc sections, same output format as A1 | Separates "an index with capped, cited answers" from "a graph"; strongest no-graph control available without a download | Seconds per commit, zero model tokens | None expected (SQLite's full-text module; confirm it is in the build already used) | As A0 |
| A1 structure | A0 plus the finished test's typed code graph as one command-line tool: find, neighbors, impact, path, changed-since; every answer cites path:line, capped and grouped | The existing graph, now with an agent; tests the owner's "connections that will or won't break" | About 5.3 s per commit rebuild, zero model tokens; plus a working-tree overlay so the agent's own edits are visible | None | As A0 |
| A2 meaning | A1 plus model-read claims from product docs and commit messages (invariant, decision, reason, hazard, contract), each bound to code by a deterministic resolver, plus a rules lookup | The layer graphify adds and the finished test left out | One model read of about 98k tokens of product docs and 52k of commit messages, plus prompts and output; estimate 0.3 to 1M tokens per full build, then per changed section | None | Document and commit-message text to the model provider (decision 2) |
| A3 time + cached conclusions | A2 plus validity by commit ancestry and a store of verified conclusions, each carrying the facts it rests on, marked suspect when one changes, re-checked before use | The owner's caching-with-invalidation idea; the only layer with a per-case mechanism for large savings | Seeding: conclusions recorded while solving the development tasks (tokens counted against A3); re-checks of suspect model conclusions cost model calls and are counted | None | As A2 |
| A3s stale control | A3 with invalidation switched off | Shows what invalidation is worth and whether stale answers do harm | As A3 | None | As A2 |
| G1 graphify code | Graphify as shipped, code layer only (tree-sitter, no model), with its own instruction block and default advisory hooks | The established tool the owner cites; its `affected` command is the direct analogue of the change tasks and has no public measurement | Seconds to minutes per build, zero model tokens | graphifyy v0.9.108 from PyPI, wheel 1.9 MB plus networkx, numpy, rapidfuzz, pyyaml, tree-sitter and about 25 grammars; Apache-2.0 | None for code (per its README) |
| G2 graphify + docs | G1 plus graphify's own model extraction of documents | Its only independently measured gain sits in this layer | Third-party figures: about 240k tokens for a 140-file project; about 7 USD of a mid-size model for 261k words | As G1 | Document text to the model; must be pinned to the same provider as the agent, never graphify's other backends |

Factor S (on A2 and G2 only): advisory pointer against a forced first query, so steering is not mistaken for content.
Optional, owner's decision: E, A1 with an embedding entry point instead of keyword search (a pre-registered
170,500-episode study on small open models credits embeddings more than graph tools; needs a local model
download, size depends on the model chosen); T, Graphiti as shipped on the repeat-after-change set only
(model-decided invalidation against structure-decided; needs a graph-database server). Not proposed: testing
graph database engines again; the finished test showed identical answers from three engines, and their speed
does not enter token cost.

## 3. Task sets, references and what each can credit

All references are built before any arm runs, from sources no arm's extractor produced, hashed and sealed.

| Set | What it is | Size | How the reference is built | What it can credit |
|---|---|---|---|---|
| Q questions | New questions of 8 to 12 kinds: single and multi-hop across runtimes, impact, which rule applies, the other half of a rule, doc-against-code contradictions, plus 25 to 30 free-text orientation questions ("how does X work here") | 100 (30 tuning, 70 held-out) | Two readers per question who never see any arm's output, with evidence lines; a third on disagreement. Rubric questions scored by a judge (decision 8), order shuffled, five passes, human check on 20 %. A separate document-work stratum if the owner includes the harness documents (decision 3) | Correct answers per token, orientation, the meaning layer, honest "unknown" over a wrong answer |
| R replayed lookups | The 139 distinct search-then-read lookups recorded in past sessions (106 of the 181 pairs open programme documents, 26 product code), turned into seeds by one frozen rule | 139 | The file the agent opened next, kept only if it was then edited, cited or reasoned about within 6 calls | Screening only: whether the needed file is in the tool's answer at 2k and 4k tokens, by stratum. Decides nothing |
| C change tasks | Past commits replayed: the agent gets a task statement written from the commit message by someone who has not seen the diff, at a clean export of the parent | 12 pilot, 40 held-out | Three columns kept apart: (1) files the commit edited; (2) needed but not edited: tests that fail when the production change is applied without its test edits, follow-up fixes to the same area within 14 days, CLAUDE.md invariants whose code anchors the diff touches, files a recorded session of that commit read and then used, and a sufficiency check (a fixed model given only columns 1 and 2 must pass the tests); (3) hidden tests pass or fail, by script | Tokens to a passing change; needed context opened before the first edit; files opened that no column needs; invariants cited |
| B break oracle | Real production diffs plus scripted small changes (rename a route field, change a response shape, a return type, a setting key, drop a column); about a third break nothing | 80 | Apply the change at the parent, run the repo's own tests, mypy, the TypeScript compiler and import-linter by script; the failures are the reference. Tools may not run the checkers | Predicting what a change breaks, scored as precision and recall at 4k, 8k, 16k tokens; scripted first, then 30 with an agent |
| K repeat after change | The same 40 claim-questions asked at each of 15 consecutive commits, in fresh sessions; cache states carried forward only by each arm's own invalidation rule | 40 x 15 steps | Blind readers decide whether each claim's answer changed at each step. Strata fixed from history first: unchanged; answer and anchors both changed; answer changed while its own anchors did not (where a graph could beat a file hash); anchors changed but answer did not | Stale answers served (must be zero), needless re-derivations, net tokens saved after re-check costs. K0: deterministic answers only, replayed over the 190 cached snapshots, no model. K1: model-made conclusions, only if K0 passes and enough "answer changed, anchors did not" steps exist |

Fresh data: the 75 held-out commits and 30 held-out questions of the finished test are spent; they become
tuning material. Held-out change tasks come from commits after the freeze or a prospective set whose protocol is
hashed first. The owner's measured spend is mostly design and document work, not product commits; results on C
and B therefore speak to product-code work only, and Q's document stratum is the only part aimed at his spend.

## 4. Measures (per run, every arm)

- Tokens in four buckets kept apart: uncached input, cache-write input, cache-read input, output; their sum over
  all calls including subagents; peak context size; tokens added by tool results; tool-description tokens.
- Layer cost: build tokens and update tokens per commit step, divided by the tasks served by that index state,
  added to each task's total. Reads that follow a pointer answer are counted because the agent makes them.
- Turns, tool calls, wall time (tool latency shown separately), whether the tool connected, whether it was called.
- Correctness against the sealed reference; needed-context recall before the first edit; wasted reads.
- Stale answers served: an answer that matches the old value where the reference says it changed. Counted in every
  arm, not only the caching arms. Outside set K a stale tool answer that the agent used counts as wrong.
- All runs count in the arm they were assigned, including runs that never called the tool; a "tool used" view is
  shown beside it, marked as non-randomised.

## 5. Fairness rules

1. Every index (A0x, A1, A2, A3, G1, G2) is built from a `git archive` export of the task's parent commit, or
   built at the oldest parent and updated commit by commit in order; never from the live tree or a later commit.
2. Agent environment: one-commit export, no .git history, no live tree mounted, no network except the model
   provider, memory files off, parent-era CLAUDE.md only. The finished test mounted the live tree with history;
   that is fixed here. A reader blind to results audits every transcript for leaks; exclusions are published.
3. Same model, version and effort for every arm; same turn, time and token caps; arms interleaved in time and in
   random order so prompt-cache warmth does not favour one arm.
4. Tool descriptions of A0p, A0x, A1 and A2 are of matched length and style; their tokens count against the arm.
5. Graphify runs as shipped at a pinned version, with its own instructions and hooks; it is not tuned by us.
6. References sealed and hashed before any arm runs; question writers never see arm output; nothing in a
   reference is produced by an extractor an arm uses. "Which rule applies" questions are reported as their own
   stratum, because the meaning layer reads the same documents.
7. Tuning split (pilot tasks and the spent commits) for all choices; held-out split run once, after the protocol,
   sample size and thresholds are frozen and hashed.
8. Scoring by script wherever the answer is a set or a test result; a judge only for rubric questions, with
   shuffled order and a human sample. The scorer is not the person or session that built the arms.
9. Three refuters read the result before it is reported; the refuter must-not-claim list in refuter.md binds
   the report's wording.
10. Model-built layers are built twice on 10 parents; the difference in answers is reported.
11. Results are split by runtime (backend, web, mobile) and by task kind; splits are descriptive, never claims.

## 6. Size

Primary contrasts, pre-declared, corrected for testing three: A1 against A0, A3 against A0, G2 against A0.
Everything else (A2 against A1, A3 against A2, A3 against A3s, steering, A0x, A0p) is secondary.

- Pilot (tuning split): C 12 tasks x 4 arms (A0, A0p, A1, A3) x 3 runs = 144 runs; Q 30 questions x 5 arms
  (A0, A0x, A1, A2, G2) x 2 runs = 300 runs. Output: run-to-run spread, the spread of the effect across tasks,
  adoption, the share of tokens spent on orientation, leak audit, judge reliability.
- Main (held-out, once): C 40 tasks x 4 arms (A0, A1, A3, G2) x 3 runs = 480 runs, plus A0p on 20 tasks x 3
  = 60; Q 70 questions x 6 arms x 2 runs = 840 runs; B 80 changes scripted, then 30 with an agent x 3 arms;
  K0 always; K1 only if phase 1 finds at least 30 "answer changed, anchors did not" steps.
- What this can detect (estimate from lane-evaluation.md §5, inputs from one 5-task study): about a 12 to 16 %
  token change per contrast at 40 tasks and 3 runs, somewhat more after correcting for three contrasts.
  Correctness only as a guard: a paired standard error of 5 to 6 points rules out a large loss, not a small one.
  A smaller real saving will read as "cannot tell", and the report must say so.

## 7. Reused from the finished test

The extractor and its 28 self-tests (layers A1 and the deterministic doc layer), the 190-commit facts cache (the
free ground truth for K0), the task loader and output format, the floors and scripted search as non-agent
baselines, the grader, cluster bootstrap and three-refuter process, the Linux image definition (mount fixed),
the token-accounting parsers in docs/program/evidence/token-spend/, and the knowledge-store design v1.3.1 (commit
6fba000) as the specification of A3. The extractor and cache sit in a session scratchpad; they must be copied
somewhere durable first (decision 1). The LadybugDB and DuckDB arms are not reused.

## 8. Phases, each ending in a stop or go

0. Feasibility, no agent, no model calls. Do tests, mypy, tsc and import-linter run at old parents? How many
   change commits survive? How many needed-but-not-edited items per commit (12 sampled)? How many "answer changed,
   anchors did not" steps exist for K? Are there enough fresh commits? STOP if fewer than 25 runnable commits or
   the needed-but-not-edited column is near empty (that is itself a finding); drop K1 if fewer than 30 steps.
1. Screens, no agent, no model calls: B scripted on A0x, A1, scripted search and G1; K0 cache replay with five
   policies (none, whole repo, file hash, fact level, fact level with early cutoff); R replay. STOP and fix if
   any invalidation policy serves a stale answer; record which arms reach the needed file at all.
2. Model layers (after decision 2): build A2 claims and G2 extraction twice on 10 parents. STOP if build cost
   exceeds the agreed budget or the two builds disagree on more than a quarter of anchored claims.
3. Pilot agent runs (§6). Freeze sample size, thresholds and arms; hash the protocol. STOP if adoption is below
   20 % in every tool arm without steering, or the leak audit finds leaks that the environment did not prevent.
4. Held-out main run, once, interleaved.
5. Score by script and judge, three refuters, report with the must-not-claim list; verdicts per §1 only.

## 9. Decisions for the owner

1. Copy the extractor and facts cache out of the session scratchpad into a durable folder. Recommend yes.
   Cost: about 750 MB of disk; no tokens.
2. Model reads of documents (A2, G2) send document and commit-message text to the model provider. Options: none
   (drops A2 and G2); product docs and commit messages only; also harness documents. Recommend product docs and
   commit messages, through the same provider the agent already uses. Cost (estimate): 0.3 to 1M tokens per
   build, twice for the determinism check, then per change.
3. Include the harness design documents (where most measured spend goes; mostly untracked and changing daily) as
   a frozen, copied document stratum in Q and R. Recommend yes, as a separate stratum. Cost: writing about 20
   questions with two readers each.
4. Install graphify (graphifyy v0.9.108, PyPI, 1.9 MB wheel plus dependencies) inside the test container only,
   pinned. Recommend yes. Cost: minutes; no tokens for G1.
5. Embedding arm E (local model download) and Graphiti arm T (graph-database server plus model calls). Recommend
   E as a phase-1 screen on B and R only if a download is acceptable; T not now, because K tests time validity
   and invalidation without a server. Cost: E, a download of a size set by the model chosen; T, a server
   install and model tokens per ingested document.
6. Agent model and effort: name the deployment model; published graph-tool gains shrink as models grow, so a
   smaller model's result would not transfer. Recommend the model the harness actually runs.
7. Thresholds: a 15 % token saving and a 10-point correctness margin. Recommend these; larger savings are
   easier to detect, smaller margins need more tasks than this repo has.
8. Judge for rubric questions: another provider's model (sends answers and excerpts out) or the same provider's
   model with a larger human sample. Recommend the same provider plus a 30 % human sample.
9. Pilot first. Recommend yes, and decide on the main run only after it. Token cost (estimate, assuming 1 to 3M
   tokens per change-task run and 0.1 to 0.4M per question run, mostly cache reads; to be measured): pilot about
   0.17 to 0.55 billion; main about 0.6 to 2.0 billion. For scale, by my arithmetic from the token records, all
   recorded FixFlow context tokens are about 2.2 billion: the main run could cost as much as everything recorded
   so far. Wall time (estimate, 5 to 20 minutes per change run, three in parallel): pilot 4 to 16 hours of runs;
   main 15 to 60 hours (change runs only). Phases 0 and 1 cost no model tokens.
10. Order against the larger levers. The token records show capping the orchestrator window and stripping the
    subagent prefix are larger levers than any knowledge layer, and neither is a graph feature. Recommend running
    phases 0 and 1 now (free) and deciding on the agent phases after seeing them beside those two levers.

## 10. What this draft could not settle

Whether old parents can run their tests; how many needed-but-not-edited items and dependency-case steps the
history holds; the per-run token figure; whether a command-line tool keeps adoption as high as a tool server;
whether graphify parses this stack fully and extracts table reads and writes; and every number marked estimate.
