# Wider knowledge-layer test: protocol, version 2

Status: PROTOCOL DRAFT v2, 2026-11-13. Nothing in it has been run, built, installed or frozen. It revises `design-draft.md` by applying every fix in `design-check.md` and the program judge's ten rulings. Figures marked "estimate" are my arithmetic from stated inputs; the arithmetic is in `protocol-v2-power.py` and its output `protocol-v2-power.txt` (normal approximation, no simulation). Section 15 lists every change from the draft and the check problem it answers.

## 0. What this test is for, in four sentences

The finished test compared a scripted search, two floors and three storage engines holding one parser-built code graph, scored on which other files a past commit changed; it ran no agent and counted no session tokens. This test asks the owner's question directly: on this repository, does a knowledge layer let a coding agent do the same work with fewer total tokens and no loss of correctness, and which layer earns its cost? Each layer is a separate switch (structure, meaning, time validity alone, time with cached conclusions), so "graph, knowledge graph or temporal knowledge graph" gets measured contrasts; which contrasts can carry a verdict is fixed below, before any run. Graphify runs as its authors ship it, beside our own layers.

## 1. Where the owner's tokens go, and what any knowledge layer can touch

All figures are from `docs/program/TOKEN-BOTTLENECK-2026-11.md` (every API call in this PC's FixFlow transcripts: 14 sessions, 1,153 agent transcripts, 14,647 calls; an independent re-measurement agreed within 0.3 %).

- FixFlow sessions processed 2.13 billion context tokens and 24.6 million output tokens. 94.9 % of the context tokens were prompt-cache reads. A cache read is still a token the model processes; the provider's prompt cache lowers price and delay, not the token count.
- Token use is calls times window size. An agent window carries about 60,000 tokens of fixed prefix on every call (system prompt, about 50,000 tokens of tool and connector schemas, CLAUDE.md, briefs); an agent call averages 113,000 to 123,000 tokens of context. The fixed prefix is 47 % of FixFlow's context tokens.
- Content fetched by reads and searches is about 23 % of FixFlow's context tokens; the model's own earlier output carried forward is 15 %. Calls that only read or search are 64 % of calls and 55 % of tokens. These shares overlap; each is an exposure, not a saving and not a ceiling for any one task.
- A knowledge layer acts directly on fetched content (smaller answers instead of whole files) and indirectly on the number of calls (fewer lookup steps, each of which re-reads the whole window). It does not act on the two largest levers in the token report: capping the orchestrator window (39 % of FixFlow's cache-read tokens sit in calls past 200,000 tokens) and stripping the subagent prefix. It is at best the third lever.
- The most re-read content in FixFlow sessions is the harness's own design and planning documents, not product code (`architecture.md` §2: the 15 documents among the 30 most-read paths hold 4.9 % of all FixFlow tokens). Results on product-code tasks may not transfer to design and document work. Set D (section 5) is the part of this test aimed at that work.

## 2. Switches, contrasts, and which can carry a verdict

Layers stack in this order, each arm adding one switch to the arm before it: A0 (no layer) → A1 structure → A2 meaning → A3t time validity alone → A3c time with cached conclusions. Graphify is a separate line: G1 (its code layer) → G2 (plus its document extraction).

Primary contrasts (fixed now; Holm correction over all five, always; a primary that is not run keeps its place in the family and counts as not shown):

| # | Contrast | Task set | The owner's words it answers |
|---|---|---|---|
| P1 | A1 against A0 | C change tasks | "graph": structure, connections that will or won't break |
| P2 | A2 against A1 | C change tasks | "knowledge graph": meaning added on top of structure |
| P3 | A3c against A3t, plus the stale bound | K repeat after change | "caching on top of it" with invalidation |
| P4 | G2 against A0 | Q product questions | graphify as shipped, with its document layer |
| P5 | A2 against A0 | D document questions | meaning layer on design and document work |

Descriptive contrasts (intervals reported, never a verdict, declared now): A3t against A2 on Q, D and C-extended (time validity alone, the closest thing to a temporal knowledge graph we build); A3c against A3t on C-extended; A1 against A0x on Q (graph against a plain index); A2 against A1 on Q; G1 against A0 and G2 against G1 on Q; G2 against A0 on C-extended; A0p against A0 (placebo); steering (forced first call against advisory) on A2 and G2; every split by runtime, slice, task kind and reference source.

No temporal knowledge graph as shipped is tested unless the owner chooses optional arm T (section 12). A3t is validity by commit ancestry over our own facts and claims; it is not a temporal knowledge graph as the literature means it.

## 3. Arms

Every arm: the same agent model, version and effort; the same pinned Claude Code version with its as-deployed harness prefix (the system-prompt hash is recorded per run); the same right to spawn subagents, with the arm's tool usable inside subagents; the parent-era CLAUDE.md only; ordinary search and read tools. Layers are added on top of A0, never instead of it. Our layers are one command-line program called through Bash with a pointer text of matched length and style; graphify uses its own instructions, hooks and commands.

| Arm | What it is | New engineering (estimate, build sessions) | Build tokens | Installs |
|---|---|---|---|---|
| A0 baseline | A real agent with ordinary search and read tools | Runner (below) | None | None |
| A0p placebo (control) | A0 plus a tool with a matched description that returns plausible, useless output | Under 1, with A0x | None | None |
| A0x plain index (control) | A0 plus capped keyword search (SQLite full-text, BM25) over symbols, signatures and doc sections, same output format as A1 | Under 1 | None | None expected (SQLite full-text; confirm in the image) |
| A1 structure | The finished test's typed code graph: `find`, `neighbors`, `impact`, `path`; every answer cites path:line, grouped and capped; a working-tree overlay shows the agent's own edits | 1 to 2 (CLI, line anchors in answers, overlay) | None; about 5.3 s per commit rebuild | None |
| A2 meaning | A1 plus model-read claims (invariant, decision, reason, hazard, contract) from product docs and from commit messages of ancestors of the parent only, bound to code by a deterministic resolver; `rules` tool | 1 to 2 (extractor prompt, resolver, `rules`) | Measured in phase 3; if each of 300 to 800 sections is one call through the harness at 60,000 to 75,000 tokens, about 20 to 60 million per full build (estimate) | None |
| A3t time validity | A2 plus validity by commit ancestry on every fact and claim: `changed --since`, as-of answers, validity labels; no stored conclusions | 1 (stable-identity diff across snapshots, rename heuristic) | None | None |
| A3c cached conclusions | A3t plus the small store of section 4 | About 2 | Re-checks and derivations, measured and charged to A3c | None |
| G1 graphify code | graphifyy 0.9.108 as shipped: code layer (tree-sitter, no model), its own instruction block, default hooks and `affected` command | Under 1 (pinned container, per-export repository) | None | graphify, container only (owner decision 1) |
| G2 graphify with documents | G1 plus graphify's own document extraction, run through the same model provider and harness the agent uses (its default route) | With G1 | Measured from transcripts, not from graphify's own counter (one user reported it under-counts subagents) | As G1 |

Shared engineering: a headless runner (pinned harness, single-commit repository exports, isolated containers, token accounting from transcripts with the existing parsers in `docs/program/evidence/token-spend/`, leak audit), 1 to 2 sessions; reference builders (break-oracle runner with per-parent Python and npm installs, task-statement writer, judge), 1 to 2 sessions. Total new engineering: about 7 to 11 build sessions (estimate). The tokens of a build session are not measured; they are recorded and reported beside the result, not charged to any arm.

Every export, for every arm, is initialised as a fresh single-commit git repository, so graphify's hooks (which find changed files with `git diff HEAD~1`) and an agent's own `git status` and `git diff` work, and no history exists. Optional arms E (embedding entry point) and T (Graphiti) are in section 12. Not in this protocol: a CLAUDE.md that moves reasons from pushed text to a pulled `rules` tool (the push-to-pull factor in `architecture.md`; it changes the owner's file and carries the largest risk), and slice cards; both are named in section 13 as untested.

## 4. A3c: the smallest store that tests cached conclusions with invalidation

It does not use, and does not wait for, the knowledge-store design v1.3.1 (commit 6fba000), whose own gate (the D1 audit, then a second yes, D1b) comes before any build. A positive result would be evidence for that design, not a build of it.

- **Entry.** One SQLite file per store chain. Each conclusion holds: the question in a searcher's words; the answer (at most about 400 tokens); its evidence spans as path:line ranges; its dependency set; the commit it was recorded at; the producer (model, prompt hash, session); the tokens its derivation cost; a status (valid, suspect, invalid).
- **Dependency set, by script, never by the model.** For each cited span, the structure node that contains it and that node's span content hash; the typed neighbours the answer names; and, for answers of the form "nothing else does X", a digest of the set of in-edges of that kind into that node, so any new writer or caller invalidates it.
- **Validity by ancestry.** An entry is visible at parent P only if it was recorded at an ancestor of P (decided at export time from the repository, because agents get no history).
- **Invalidation driven by structure.** At each new parent, a diff of the facts by stable identity, span hash and edge-set digest marks every dependent entry suspect. Nothing is invalidated by age, and no model decides freshness.
- **Re-check before serving.** `recall <words>` matches questions by full-text search and returns at most two entries. A valid entry is served after a deterministic check (its anchors still resolve, its hashes are unchanged). A suspect entry gets one short model re-check (the entry plus the current cited lines: does it still hold?); if yes it is re-stamped and served, if no it is marked invalid and the agent derives afresh. Model-made conclusions are never cleared by early cutoff alone. `record` writes an entry at the end of a derivation. Every re-check and derivation is charged to A3c.
- **Left out on purpose.** The design's reviewer refutation pass, failure-triggered trap entries and journal. Entry quality is therefore whatever the solving agent writes; a poor result may reflect that, and the report must say so.
- **A3s (stale control)** is the same store with invalidation switched off. On set K its answers are the stored text, scored for staleness, at no model cost.

## 5. Task sets and references

All references are built before any arm runs, from sources no arm's extractor produced, then hashed and sealed. Reference readers are two independent fresh model sessions per item with the parent export, no arm tool and a stripped harness (readers are not subjects), plus a third on disagreement; the owner checks a random 20 % sample. Readers are the same model family as the agents, which may favour A0-style answers; the owner sample is the check on that.

| Set | What it is | Size | Reference | Credits |
|---|---|---|---|---|
| C change tasks | The agent gets a task statement written from the commit message by a session that has not seen the diff, at a single-commit export of the parent | Pilot 12 (tuning commits); main 40 prospective (below); C-extended uses 20 of the 40 | (1) files the commit edited; (2) needed but not edited: tests that fail when the production change is applied without its test edits, follow-up fixes to the same area within 14 days, files a recorded session read and then used, and a sufficiency check (a fixed model given only columns 1 and 2 must pass the tests); CLAUDE.md invariants whose anchors the diff touches are a separate column, written from the finished test's docs extractor, reported apart and never credited to A1 or A2; (3) hidden tests pass or fail, by script | Tokens to a passing change; needed context opened before the first edit; files opened that no column needs |
| Q product questions | 8 to 12 kinds: single and multi-hop across runtimes, impact, which rule applies, the other half of a rule, doc-against-code contradictions, "what changed since", and 20 to 25 orientation questions ("how does X work here"). At least half come from sources independent of the arm designers: recorded session lookups, defects named in the handoff documents, questions the owner chooses to write. The kind mix is weighted by observed session lookups | 90 (20 tuning, 70 held-out) | Two readers with evidence lines; set answers scored by script; free-text answers by a judge on atomic key-fact coverage with a penalty for unsupported claims, five passes, shuffled order | Correct answers per token; P4 |
| D document questions | Questions about the harness design and planning documents, on a frozen, dated copy of `docs/program/` (mostly untracked and changing daily), drawn first from the recorded lookups that opened programme documents (106 of 181 recorded pairs) | 50 (10 tuning, 40 held-out) | As Q | P5; the only verdict aimed at the owner's main spend |
| K repeat after change | The same claim-questions asked at consecutive commits in fresh sessions; each store carried forward only by its own rule. K0: deterministic answers replayed over the 190 cached snapshots, no model (running now in another lane). K1: model-made conclusions | K1: 40 claims × 10 consecutive steps = 400 claim-steps; more steps if K0 shows fewer than 150 expected serves | K0: the facts recomputed at the next commit (consistency with the extractor, not with the code). K1: readers decide at each step whether the answer changed. Strata fixed from history first: unchanged; answer and anchors changed; answer changed while its own anchors did not; anchors changed but answer did not | P3: tokens per claim-step net of re-checks, stale answers served |
| B break oracle | Real production diffs plus scripted small changes (rename a route field, change a response shape, a return type, a setting key, drop a column); about a third break nothing | 80 scripted; then 30 with an agent (A0, A1, G1, one run each) | Apply at the parent and run the repository's tests, mypy, the TypeScript compiler and import-linter by script. The headline uses test failures only, because A1's TypeScript facts come from the compiler the oracle also uses; each source is reported apart | "Connections that will or won't break": precision and recall at 4k, 8k and 16k tokens; graphify's `affected` scored directly |
| R recorded lookups | The 139 distinct search-then-read lookups in past sessions | 139 | The file opened next, kept only if then used within 6 calls. The document stratum is labelled "index built from a later snapshot" | Screening only; decides nothing |

**Fresh change tasks do not exist yet; the prospective set.** All 140 usable historical commits are spent (65 tuning, 75 held-out in the finished test). At 16:35 on 2026-11-13, `main` had 5 non-merge product-code commits after the frozen commit `a31924a`, all squash-merged ship-phase pull requests landed that day (87bbe88, 5cd29b1, 47a2246, 15df06d, 9b2e8f5), touching 35, 59, 32, 9 and 12 product files by my `git diff --name-only` count (added files included); about 2 of the 5 fit the finished test's "2 to 30 existing files" rule. Across all refs, 62 non-merge product-code commits were dated that day, most of them on pull-request branches. Rule: after the protocol is hashed, every non-merge product-code commit that lands on `main` and touches 2 to 30 existing product files is taken in landing order until 40 run at their parents. The rate cannot be predicted (five in one day after three months with none), so no date is promised. The primary outcomes (tokens, hidden tests) need no waiting; the follow-up-fix column is filled by a frozen script 14 days after each task's commit, and the needed-context measure is scored only then. **Without the prospective set**, P1 and P2 can be run on the 75 previously held-out commits as an "examined set" (the program saw their aggregate results); those results are descriptive only and never a verdict. P3, P4 and P5, the free phases and set B do not need fresh commits.

## 6. Measures, per run, every arm

- Tokens in four buckets kept apart (uncached input, cache-write input, cache-read input, output) and their sum over all calls including subagents: the primary, matching the owner's records. Pre-declared secondary: non-prefix tokens (the sum minus each call's fixed prefix); if the two disagree, the report says so.
- Layer cost: build and update tokens per commit, divided by the number of agent sessions that use one index state. The denominator is pre-declared as agent windows per product commit in the FixFlow records, computed before the pilot; sensitivity at 1, 10 and 100 is shown, and P2, P4 and P5 verdicts must hold at the pre-declared value. Tool-description and pointer tokens count in every call.
- Runs that fail or hit the cap are counted at the token cap, and tokens per successful task and pass^k (all k runs pass) are shown beside the primary.
- Tokens to sufficiency (the point at which the needed context has first been read), tool-result tokens per call, files opened that no reference column needs, calls, turns, wall time with tool latency apart, whether the tool connected and whether it was called.
- Stale answers: on K, the served answer matches the old value where readers say it changed; elsewhere a stale tool answer the agent used is counted and scored wrong.
- All runs count in their assigned arm; a "tool used" view is shown beside, marked non-randomised. The judge's score against answer length is reported per arm.

## 7. Fairness rules

1. Every index is built from a `git archive` export of the task's parent, or built at the oldest parent and updated commit by commit in order; never from the live tree or a later commit. A2 reads only commit messages of ancestors of the parent, never the task commit's own message.
2. Agent environment: single-commit repository, no history, no live tree mounted, no network except the model provider, memory files off, parent-era CLAUDE.md only. A reader blind to results audits every transcript for leaks; exclusions are published.
3. Same model, version, effort, harness version, turn, time and token caps for every arm. Arms other than A3c are interleaved in time in random order. A3c runs in chronological order within each store chain (one chain per run index), interleaved with the others around it; its store at parent P holds only entries recorded on ancestors of P. Its hit rate and the age of each hit, in commits, are reported.
4. Pointer and tool descriptions of A0p, A0x, A1, A2, A3t and A3c are of matched length and style; their tokens count against the arm. Graphify is not tuned by us.
5. References sealed before any arm runs; question writers never see arm output. "Which rule applies" questions form their own stratum, because A2 reads the same documents.
6. Tuning split for every choice; held-out sets run once, after protocol, sizes and thresholds are hashed.
7. Scoring by script wherever the answer is a set or a test result; the scorer is not the session that built the arms. Three refuters read the result before it is reported.
8. Model-built layers (A2, G2) are built twice on 10 parents; the difference in answers is reported.

## 8. Verdict rules, and how likely each is to fire

Tokens are compared as the geometric-mean ratio R of an arm over its comparator, paired by task (by claim on K), with 95 % intervals from a cluster bootstrap and the bound used for a verdict adjusted by Holm over the five primaries.

- **YES** for a primary: the adjusted upper bound of R is below 0.95; the correctness guard passes; for tool arms, the tool was called in at least 20 % of runs; for P3, the stale bound passes.
- **NO**: the adjusted lower bound of R is above 0.80 (a saving of 20 % or more is ruled out); or the one-sided 95 % upper bound of the correctness difference is below zero (a loss is shown); or, for P3, the one-sided 95 % lower bound of the stale rate is above 2 %.
- **CANNOT TELL**: anything else. If the tool was called in fewer than 20 % of runs, the verdict is "agents did not use it", not "it does not help". "Cannot tell" never means "does not help".
- **Correctness guard**: the one-sided 95 % lower bound of the success difference (tests pass on C; key-fact score on 0 to 100 on Q and D; correct answer on K) is above minus 15 points. It is not corrected for the five contrasts, and the report says so. A loss smaller than 15 points cannot be ruled out by this test.
- **Stale bound (P3, set K only)**: the one-sided 95 % upper bound of stale answers among A3c's served answers is below 2 %. With zero stale answers this needs at least 150 serves; with one, about 237. On change tasks stale answers used are a count, scored wrong, never a rate.

What the main run can detect (estimates; σ is the run-to-run spread of log tokens, ln 1.34 = 0.293 from one published 5-task study, and twice that as a check; τ is the spread of the arm's effect across tasks, 0.15 or 0.30; first Holm step, 80 % power):

| Set | Size | Smallest true saving that clears "below 0.95": σ 0.293 | σ 0.586 |
|---|---|---|---|
| C, P1 and P2 | 40 tasks × 3 runs | 18 to 23 % | 28 to 30 % |
| Q, P4 | 70 questions × 2 runs | 17 to 20 % | 26 to 27 % |
| D, P5 | 40 questions × 2 runs | 21 to 24 % | 32 to 33 % |

Probabilities for C at 40 tasks × 3 runs, σ 0.293 (τ 0.30 to 0.15): YES on tokens at a true 25 % saving 0.91 to 1.00, at 20 % 0.60 to 0.90, at 10 % 0.05 to 0.09; NO at no true saving 0.86 to 0.99, at a true 25 % saving 0.00; guard passes at no true loss 0.80 to 0.91 (paired standard error 6 to 5 points); YES overall for an arm with a true 25 % saving and no loss 0.73 to 0.91. If σ is twice the assumed value, YES at a true 25 % saving falls to 0.53 to 0.66 and NO at no saving to 0.47 to 0.59. Stale bound: with 300 serves, a true stale rate of 0.25 % passes 0.83 of the time and 1 % passes 0.20. The pilot measures σ and τ; this table is recomputed with them before freezing, and k (2 or 3) is then the smallest that keeps the smallest detectable saving on C at or below 25 %.

What this means in this harness (my reasoning, not a measurement): about half of every agent call is the fixed prefix of about 60,000 tokens, and fetched content is about 23 % of FixFlow's context tokens. A layer that returns smaller answers but leaves the number of calls unchanged would have to remove most fetched content to reach a 20 % saving on total tokens. So the main run can detect a layer that removes a fifth or more of the agent's calls, or the equivalent; a layer that only makes answers smaller will most likely read "cannot tell", and the report must say so. The non-prefix secondary is where such a layer would show.

## 9. Cost (estimates; the cost probe replaces them)

Per-run inputs (estimate): a change-task run of 30 to 80 calls at 113,000 to 123,000 tokens per call is about 3.5 to 10 million tokens; a question run of 5 to 10 calls about 0.6 to 1.2 million; a served conclusion in a short session about 0.25 to 0.4 million; a reader session with a stripped harness about 0.3 to 0.6 million.

| Stage | Contents | Tokens (estimate) |
|---|---|---|
| Cost probe | 4 tuning tasks × A0 × 3 runs | 0.04 to 0.12 billion |
| Pilot | C 12 × 4 arms (A0, A0p, A1, A2) × 3; Q and D 30 tuning questions × 6 arms (A0, A0x, A1, A2, G1, G2) × 2; K1 8 claims × 5 steps | 0.8 to 1.9 billion |
| Main stage A (no fresh commits needed) | Q 70 × 7 arms × 2 plus steering; D 40 × 4 arms (A0, A0x, A2, G2) × 2; K1 400 claim-steps; B with agent; readers and judge | 1.6 to 3.2 billion |
| Main stage B (needs 40 prospective commits) | C 40 × 3 arms (A0, A1, A2) × 3, plus A0p on 20 × 3; sufficiency check | 1.7 to 4.7 billion |
| Option: C-extended | A3t, A3c, G2, A0x on 20 tasks × 2 | 0.6 to 1.6 billion |
| Reserve | Reruns after leak exclusions or a tool that failed to connect | 10 % of the above |

For scale, all recorded FixFlow context tokens are 2.13 billion. Probe, pilot and both main stages together come to about 4.0 to 10.0 billion tokens (estimate), two to five times everything recorded so far; the test itself may cost more tokens than a winning layer would save for a long time. Each stage has a stop budget equal to its upper estimate, re-set from the probe. Not in tokens: model-built layer builds (phase 3, measured), engineering sessions (section 3), per-parent dependency installs (disk and time), about 8 to 15 owner hours for the 20 % reference and judge samples and a check of task statements (estimate), and about 25 to 80 hours of container time (5 to 20 minutes per change run, 2 to 5 per question run, three in parallel; estimate) on a PC whose test slots the ship plan also uses.

## 10. Phases, each ending in a stop or go

0. **Free, running now in other lanes** (no agent, no model). Feasibility counts: do tests, mypy, the TypeScript compiler and import-linter run at old parents; how many change commits survive; how many needed-but-not-edited items per commit (12 sampled); how many "answer changed, anchors did not" steps exist for K; whether the 190 snapshots give consecutive runs long enough for 10-step walks. K0 cache replay over the 190 snapshots with five policies (none, whole repository, file hash, fact level, fact level with early cutoff). The engine timing is done (`build-f/engines_checked.json`) and is cited, not re-run. STOP if fewer than 25 commits run at their parents (power at 25, 30 and 40 tasks is in `protocol-v2-power.txt`) or the needed-but-not-edited column is near empty (itself a finding); drop K1 if fewer than 30 "answer changed, anchors did not" steps exist. STOP and fix only if a fact-level policy serves any stale answer; the stale rates of the file-hash and whole-repository policies are findings, reported as such.
1. **Free screens.** B scripted on A0x, A1, scripted search and G1 (after owner decision 1); R replay. Records which arms reach the needed file at all.
2. **Engineering builds** (section 3). The extractor and the facts cache are copied out of the session scratchpad into a durable folder outside the repository first (about 750 MB; no tokens).
3. **Model-built layers.** A2 claims and G2 extraction built twice on 10 parents. STOP if build cost exceeds its budget or the two builds disagree on more than a quarter of anchored claims.
4. **Cost probe**, then the owner's go on the pilot budget with measured per-run figures.
5. **Pilot** (tuning material only). Measures σ, τ, adoption, the share of tokens spent on orientation, judge reliability, leak audit. Freeze sizes, thresholds and k; hash the protocol. STOP if adoption is below 20 % in every tool arm without forced steering, or the leak audit finds leaks the environment did not prevent.
6. **Main stage A** once, interleaved. **Main stage B** once, when 40 prospective commits run.
7. **Score** by script and judge; three refuters; report with the must-not-claim lists. Verdicts per section 8 only.

## 11. The owner's words against what measures them

| Owner's words | What it is taken to mean here | Where it is measured | Gap left |
|---|---|---|---|
| "graph database" | The engine that stores and queries the code graph | Done: three engines returned the same ranked answer for every seed (`build-f/engines_checked.json`) and the same shown answers on 770 of 770 held-out tasks (finished test) | None on answers; not re-tested |
| "very fast" | Query time | Done, same file: for the selected configuration, warm median per ranking 14.5 ms (SQLite), 41.5 ms (LadybugDB) and 70.3 ms (DuckDB with DuckPGQ) on a 2,450-node graph; 32.7, 71.2 and 98.7 ms on a 5,464-node graph (LadybugDB and DuckDB not distinguishable there), one thread, on a busy PC. This compares each arm's implementation, not engines in general. Here, tool latency per call is recorded | Milliseconds do not enter the token count; whether they matter in a session is not shown |
| "small size" | Bytes on disk, and tokens added to the window | Bytes done, same file: 11.2 MB (SQLite), 19.1 MB (LadybugDB), 17.1 MB (DuckDB) on the 5,464-node graph, designs with different extra tables, not engines alone. Tokens here: tool-result tokens per call, tokens to sufficiency | None |
| "semantic relations" | Model-read claims (rules, reasons, contracts) bound to code | A2 (P2, P5); G2's document layer (P4) | — |
| "connections that will or won't break" | Typed structure and impact | Set B against the repository's own checkers; A1 (P1); graphify `affected` | Checkers catch only what tests and type checks catch |
| "spatial topology" | Structure and location relations of the code graph: containment (folder, file, symbol), the twelve slices mirrored across runtimes, the three runtimes (backend, web, mobile), and cross-runtime links (client URL to route, test to route, outbox kind to handler) | A1 `neighbors` and `impact` (per-kind hops, answers grouped by slice); every result split by runtime and by cross-runtime task; set B's cross-runtime changes; the same-folder floor of the finished test | No contrast isolates location relations alone; embedding "space" only in optional E |
| "temporal topology", "TKG" | Facts and claims with validity over commits | A3t (descriptive); K0 policy comparison | No temporal knowledge graph as shipped unless T |
| "caching on top of it" | (a) traversal caching; (b) cached conclusions; (c) the provider's prompt cache | (a) done: the LadybugDB arm's JavaScript ranking over a cached adjacency took 17 ms, and 51 ms with its application caches dropped (frozen graph, configuration S1), milliseconds and no tokens; (b) A3c on K (P3), K0, A3s; (c) cache-read bucket in every run | (a) not re-tested with an agent; it cannot change tokens |
| "invalidation" | Deciding what is still true after a change | K0 (five policies), K1 (A3c against A3s) | — |
| "don't traverse unnecessary nodes", "don't fetch unnecessary context" | Not putting unneeded text into the window | Files opened that no reference needs; tool-result tokens; lookup-only calls per task | — |
| "small pieces, very fast" | Small answers, few steps | Tokens to sufficiency; calls and turns; tool latency | — |
| "a lot of files and documents" | The owner's spend is mostly documents | Set D (P5); section 1 ceiling | 40 held-out items only |
| "graphify shows such good results" | Graphify as its users run it | G1, G2 on Q, D, B (P4) | Its stars and its 71.5x are not evidence of effect and are not measured |

## 12. Decisions for the owner

1. **Install graphify** (graphifyy 0.9.108 from PyPI, released 2026-11-12, about one release a day; wheel 1.9 MB plus networkx, numpy, rapidfuzz, pyyaml, tree-sitter and about 25 grammar packages) inside the test container only, pinned. Recommend yes. Cost: minutes; G1 uses no model tokens; G2's document extraction sends document text to the same provider the agent already uses, through the same harness, measured in phase 3.
2. **Token budget.** (a) Harness setting: recommend as deployed (the baseline is then how agents work today); a stripped prefix would cut per-run cost by roughly two fifths but measure a harness nobody runs and make relative savings look larger. (b) Recommend approving now only the cost probe (0.04 to 0.12 billion) and, after its measured figures, the pilot (0.8 to 2.1 billion estimated). (c) Main stage A (1.6 to 3.2 billion) and stage B (1.7 to 4.7 billion, only when fresh commits exist) are decided after the pilot; C-extended (0.6 to 1.6 billion) is optional. For scale: 2.13 billion is everything recorded for FixFlow.
3. **Optional arms.** E, an embedding entry point in place of keyword search (a local model download; the owner earlier listed embeddings under "do not build"): recommend not now. T, Graphiti as shipped on set K only (a graph-database server on a PC short of memory, plus model tokens per ingested document): recommend not now; the cost of that choice is that no temporal knowledge graph as shipped is tested.
4. **Order against the two larger levers.** Recommend: the free phases continue now; the agent phases start after the decision on stripping the subagent prefix (lever 2), because that prefix sets both the cost per run and how much any layer's saving is diluted, and a test of today's harness would measure one that is about to change. Cost: the agent phases wait.

## 13. What this protocol does not test, or cannot settle yet

- Not tested: a temporal knowledge graph as shipped (unless T); moving CLAUDE.md reasons from pushed to pulled text; slice cards; a tool server against a command-line tool; models other than the deployed one (published graph-tool gains shrink as models grow); other repositories; the orchestrator-window and subagent-prefix levers.
- Not settled until phase 0 and the probe: whether old parents run their tests; how many needed-but-not-edited items and "answer changed, anchors did not" steps exist; the real per-run token figure; σ and τ; whether graphify parses this stack fully, including table reads and writes; when 40 fresh commits will exist; whether cache reads count against the owner's plan limits.
- Results on C, Q and B speak to product-code work. Only P5 speaks to document work, on 40 held-out items.

## 14. Sentences that may not be said about this test or its results

The lists in `build-e/result.json` (refute:claims and refute:discipline, `must_not_claim`), `build-f/engines_checked.json` (`must_not_claim`) and `widen/result.json` (`refuter.must_not_claim`, `designCheck.must_not_claim`) bind every report. Added here: "A3t is a temporal knowledge graph." "Descriptive step contrasts show which graph type is right." "Change-task results on the examined set are held-out results." "The test can detect a 10 % saving." "Traversal caching saves tokens." "Graphify was tested on this repository's history as its users run it day to day" (each export is one fresh commit).

## 15. Changes from the draft, and the problem each answers

1. Summary and section 2 rewritten: layers as separate switches, five pre-declared primaries, all step contrasts declared primary or descriptive (check P1; ruling 1).
2. A2 moved into the change-task run; P2 is A2 against A1 on change tasks (P1; ruling 1).
3. A3 split into A3t (time validity alone) and A3c (with cached conclusions) (P1; ruling 1).
4. Plain statement that no temporal knowledge graph as shipped is tested unless T runs (P1; ruling 1).
5. Correctness guard set at 15 points with its pass probability, stated as uncorrected for multiplicity (P2; ruling 5).
6. Point-estimate condition dropped; YES uses an adjusted bound below 0.95; NO rules out 20 %; probabilities written beside each (P3; ruling 5).
7. Power redone with this harness's per-call figures, the smallest detectable saving stated per set, and the dilution by the 60,000-token prefix explained (P3, P11; ruling 5).
8. Stale bound computed on K only; on change tasks stale use is a count (P4; ruling 5).
9. Phase-0 stop fires only on a fact-level policy; file-hash and whole-repository stale rates are findings (P5).
10. A3c runs chronologically in its own chains with the ancestry rule; hit rate and hit age reported; derivations and re-checks charged to it (P6).
11. Every export a fresh single-commit git repository; equal subagent rights with the tool usable in subagents; pinned harness and system-prompt hash; G2 build tokens from transcripts (P7; rulings 2, 3).
12. Graphify runs as shipped, code layer then document extraction through the agent's provider (P7, P15; ruling 2).
13. Baseline defined as a real agent with the same prefix and subagent rights; A0p and A0x named as controls (P7, P11; ruling 3).
14. CLAUDE.md invariant column reported apart and never credited to A1 or A2; break-oracle headline on test failures only; A2 reads only ancestor commit messages; R document stratum labelled; at least half the questions from independent sources (P8).
15. Prospective set designed from commits landing on `main`, with today's measured count, no promised date, the 14-day column scored later, and what can be concluded without it (P9; ruling 7).
16. A3c specified as a small store independent of the knowledge-store design; per-arm engineering rows with session estimates (P10; ruling 4).
17. Cost re-estimated at this harness's per-run figures, with readers, judge, sufficiency check, K1, set B with agent, reruns, owner hours and machine time added, stop budgets per stage (P11; ruling 10).
18. Owner-words table with no gap unnamed, spatial topology defined, engine timing and traversal-cache timing cited from `build-f/engines_checked.json` (P12; rulings 6, 8).
19. Ceiling section and document set D with a primary contrast (P13; ruling 9).
20. Failed runs at the cap, pass^k, pre-declared build-cost denominator with sensitivity, key-fact judge with length check, non-prefix secondary, named set per contrast (P14).
21. K walks shortened to 10 steps pending the consecutiveness check; K0 described as consistency with the extractor, not the code (P15).
22. Owner decisions cut to four, each with a recommendation and cost; the knowledge-store gate no longer blocks this test (ruling 10).
23. Free phases first, cited as running in other lanes; engine timing not re-run (ruling 6).
24. Push-to-pull factor and slice cards named as untested rather than dropped silently (P12).
