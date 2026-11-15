# Dossier: block "orientation" (mechanisms: orientation)

8 bottlenecks and 35 ideas. Numbers carry tags: [M] measured, [E] estimated, [G] guess, [S] setting or outside figure, [T] target, [I] illustrative.

## Bottlenecks

### TK-LOOKUP · Calls that only read or search
family tokens; state: Open: measured exposure; batching not yet trialled; package WP5; metrics: token_count, efficiency, time (primary token_count)
what: Many calls only read or search, and each one re-reads the whole window. This is token lever 3: an exposure, not a saving.
evidence: FixFlow: 64 % [M] of calls, 55 % [M] of tokens; clinic: 52 % and 41 % [M]. November testbed: 54.7 % [M] of calls re-read 43.6 % [E] of context tokens.
what fixing it unlocks: Batching two lookups into one command removes about a third [E] of all calls, and with them a third of the re-reads.
first step: Batch lookups in one command; replay a zero-token index on recorded windows to count answerable lookups.

### TK-FETCHED · Fetched file content fills the windows
family tokens; state: Open: measured; digest untested; needed share unmeasured; package WP5; metrics: token_count, efficiency, token_cost (primary token_count)
what: Content fetched by reading and searching fills about a quarter of the windows and is re-processed every later call; a small hot set recurs across sessions.
evidence: 26 % [E] (2026-11-12); 27-28.5 % [E], or 22.3 % [E] by an independent method (2026-11-11). 72 paths [M] hold half; within-window repeats only 0.5-1.5 % [E].
what fixing it unlocks: This is what indexes, digests and knowledge stores aim at; a digest lasting across sessions could pay if a shorter form stands in for the lines.
first step: Test digests of the 72 hot paths; define needed context from review findings.

### LIB-KS-COST · Each store lookup costs time and tokens
family tokens; state: Open: bound benchmarked; store not built; package WP5; metrics: token_count, time, efficiency (primary token_count)
what: Checking the index against the journal each call takes time; each Bash lookup re-reads the caller's context, and the skill description rides every call.
evidence: 23-35 ms [M] at 5k entries, 57-87 ms [M] at 20k; 49-55 ms [M] with 4-8 callers. 2,000 characters cost about 860 [M] tokens; skill description about 620 [M].
what fixing it unlocks: Lookups cheap enough to run routinely; the routine adds about three fixed turns per phase.
first step: A benchmark test that fails above 50 ms [S] at 5k entries; one total output cap.

### LIB-S3 · Step 3: query words miss the lessons
family library; state: Open: mapped and weighed; no fix agreed; package WP6a; metrics: efficiency, token_cost (primary efficiency)
what: A query in symptom words misses lessons stored in mechanism words, and the query carries the asker's own worry or guess.
evidence: Alone 1.9 % [G], last 24.8 % [G]; 2 [M] limitations; 10 of 59 [M] chosen cases break here.
what fixing it unlocks: Up to 24.8 % [G] of the full fall if this were the last step left.
first step: Agree the limitation list with me first; no fix is chosen yet.

### LIB-KS-RECALL · Word lookup misses reworded symptoms
family retrieval; state: Open: accepted limit; writer and classifier designed; package WP7; metrics: efficiency, token_cost (primary efficiency)
what: A word-matching lookup misses a symptom sharing no word with any stored handle, and misses are counted only when a later record examines them.
evidence: Expected below about 0.2 [E] counted misses per 8-week window. The zero-shared-terms classifier misclassed 6 of 7 [M] measured paraphrase misses.
what fixing it unlocks: Recovers vocabulary misses and gives a measured trigger for adding embeddings (KS-D16).
first step: Build the missed-existing writer with the KS-2 fixtures.

### LIB-GRAPH-CONTRACTS · Cross-runtime contracts break silently
family retrieval; state: Open: partly mapped by script; value unproven; package WP7; metrics: quality, efficiency (primary quality)
what: Client calls to routes, settings keys, the migration chain, slice contracts, outbox kinds and file-bound invariants are not imports, so search and import graphs miss them.
evidence: A script matched 65 of 73 [M] client URL literals to 77 [M] route decorators; 46 [M] settings keys; 46 [M] migration links.
what fixing it unlocks: A scripted contract map as a review input could show what a change might break; its value is unproven.
first step: Zero-token test of the contract map on the recorded defect chains.

### LIB-GRAPH-HUBS · Hub files make impact lists too long
family retrieval; state: Partly closed: measured; partly handled in graph tuning; package WP7; metrics: efficiency, token_count (primary efficiency)
what: The files that change most are hubs with many dependants, so a raw list of everything downstream is too long to use.
evidence: 42 % [M] of code-file changes and 73 % [M] of code commits touch a file with reach over 15; median reach is 2 [M].
what fixing it unlocks: Depth limits, grouping and a hub cut keep touch lists near 15 [T] files, small enough for a reviewer.
first step: Add a depth limit and grouping to the touch list; check list size on recorded fixes.

### LIB-EVAL · Context aids never tested with an agent
family retrieval; state: Open: held-out scored by script; no agent run; package WP7; metrics: efficiency, time, quality (primary efficiency)
what: No context aid (graph, map or recall journal) has run with an agent in the loop, so we do not know whether an agent finishes faster or with fewer mistakes.
evidence: 0 [M] agent runs; the held-out graph test (2026-11-13) used a fixed search script. A quality comparison was forecast at 156M-512M [E] tokens.
what fixing it unlocks: Answers my real question: whether a graph, map or recall layer saves an agent work.
first step: Agent-in-the-loop pilot on 24-30 fix commits, with a plain-notes control.

## Ideas (most mature first)

### MEM-03 · Documentation spine and where-state-belongs table
stage: In use; package WP6c; metrics: efficiency, token_count, time (primary efficiency); answers: B13, B12
problem: Every session needs a start-here route and one named owner for each kind of information, so no second status summary appears.
how: A README resume route, a command catalogue, a where-state-belongs table, a slice-to-document map, and an AGENTS.md page with an evidence-status vocabulary.
where it stands: In use in the clinic testbed; routing tables are hand-maintained and drifted. No token saving was measured; the context map still named old id ranges after the plan moved on.
next: Add a drift test checking the routing doc against the plan; the where-state-belongs table is the part to carry.
origin: Clinic testbed

### RET-01 · Existing code maps: import contracts, CODE-MAP, Haiku locator
stage: In use; package WP7; metrics: token_count, efficiency (primary token_count); answers: PR-MOBILEBOUNDARY, LIB-GRAPH-CONTRACTS
problem: Agents need to find where a feature lives without a call-graph tool.
how: Import-boundary contracts (import-linter on the backend, ESLint on the web), a hand-written code map document and a Haiku locator agent.
where it stands: In use in FixFlow. Not measured. Mobile code has no boundary enforcement yet.
next: Add mobile boundary rules with dependency-cruiser.
origin: Harness review; existing FixFlow practice

### RET-02 · Slow grep-and-model search over optimised retrieval
stage: In use; package WP7; metrics: quality, efficiency (primary quality); answers: -
problem: We want to pick a retrieval design for code understanding that is reliable rather than clever.
how: Prefer reliable agentic search, grep plus a model, over optimised retrieval; a learned reranker was passed over.
where it stands: In use: it matches what the harness already does. A learned reranker is a skip. Taken as a stated preference, not a measured result.
next: Keep using it.
origin: Dex Horthy sweep

### TOK-08 · Session-local file read cache
stage: Tested; package WP5; metrics: token_count, efficiency (primary token_count); answers: TK-FETCHED, TK-REREAD
problem: We wondered whether agents re-open files they already read in the same window and so waste tokens.
how: Cache file reads inside a session so a repeat read returns the earlier content instead of a new copy.
where it stands: Tested against the token record, not built: exact repeats are 0.00 % [M], and content seen before in the window is 0.5-1.5 % [M]. ‘Opened again’ is mostly a different range of the same file.
next: None needed; it would save almost nothing [E], so we skip it.
origin: Token report

### RET-06 · Typed symbol-level graph of the repo
stage: Tested; package WP7; metrics: token_count, quality, efficiency (primary token_count); answers: TK-LOOKUP, LIB-GRAPH-POWER, LIB-GRAPH-MOBILE, LIB-EVAL
problem: We want a short ranked answer to what else must change with this code, using typed links across web, mobile and backend that flat search cannot.
how: A model-free script extracts about 2,500 symbols and 19+ edge kinds [M] from each task's parent commit; queries rank neighbours within hop budgets.
where it stands: Tested on held-out commits: recall in an 8,000-token [S] answer 0.700 [M] vs 0.625 [M] for a scripted search. The gain is on mobile seeds (+0.151 [M]). No agent was run.
next: Decide on the agent pilot, to see whether the graph helps an agent.
origin: Graph test; my objections to the first test

### RET-07 · Co-change floor (files that changed together)
stage: Tested; package WP7; metrics: token_count, quality (primary token_count); answers: LIB-GRAPH-BASELINE
problem: We need a cheap baseline for what else changes with this file, taken only from git history, that any graph must beat.
how: From earlier commits only, count files changed together, rank by support (how often the two files changed together), confidence (the share of the seed file’s commits that also changed the other) and recency, and return the top files within the token budget.
where it stands: Measured on held-out commits: recall 0.638 [M] (tuning split 0.752 [M]). Typed graph beats it by +0.063 [M], but only on mobile seeds; on backend seeds co-change 0.709 [M] vs typed 0.699 [M].
next: Keep reporting every graph result beside this floor and its sensitivity checks.
origin: Graph test; strongest signal in the research round

### RET-08 · Same-directory floor
stage: Tested; package WP7; metrics: token_count, quality (primary token_count); answers: LIB-GRAPH-BASELINE
problem: We want to know whether our vertical-slice folder layout already carries most connection information, so any graph must beat files in the same folder.
how: Return the other files in the seed file's folder, packed to the token budget, with no graph and no history.
where it stands: Measured on held-out commits: recall 0.549 [M] (tuning split 0.719 [M]). Typed graph beats it by +0.151 [M]; on web seeds same-directory scored 0.773 [M] vs typed 0.664 [M], interval includes zero.
next: Keep as a floor in every future retrieval test.
origin: Graph test; phase A audit

### RET-09 · PageRank and community priors for ranking
stage: Tested; package WP7; metrics: quality, token_count (primary quality); answers: LIB-GRAPH-HUBS, LIB-GRAPH-POWER
problem: We want the most relevant neighbours of a changed file first inside a token budget, using ranking a flat table lacks natively.
how: Personalised PageRank from the seed, optionally with a stored community grouping, ranks neighbours; iterations run in our code, only grouping comes from the engine.
where it stands: Tested on held-out commits: no gain of 0.05 or more; +0.015 [M] on the main task, interval spans zero. Five random re-draws of the Louvain communities moved recall about as much as the effect (standard deviation 0.008 [M]).
next: Revisit only on a larger task set or in an agent pilot.
origin: Graph test, after Aider's repo map

### RET-10 · Hop sweep with per-edge-kind budgets
stage: Tested; package WP7; metrics: token_count, quality (primary token_count); answers: LIB-GRAPH-HUBS
problem: One global hop limit returns either too little or a flood. We want depth, direction and hub handling chosen per kind of link.
how: On tuning commits only, sweep hop depth, direction, per-edge-kind budgets and hub cuts; pick the simplest setting within one standard error and freeze it.
where it stands: Tested on tuning commits: import neighbours reach recall 0.38, 0.72 and 0.87 [M] at 1, 2 and 3 hops, with 9, 45 and 90 [M] files. Hop depth moved the score most.
next: Report whole curves, never one point.
origin: Bottleneck compile; my question on hop count

### RET-11 · Output form and token-budget packing
stage: Tested; package WP7; metrics: token_count, quality (primary token_count); answers: LIB-EVAL
problem: We want to score an answer by value per token, not stored size, so the form the model receives is itself tested.
how: One shared packer and tokenizer return the same output forms (paths, signatures, line ranges, snippets) at 2k, 4k, 8k and 16k [S] token budgets.
where it stands: Tested on held-out commits: typed beats search by +0.070 and +0.102 [M] at 2,000 and 4,000 [S] tokens; recall at 16k [S] is 0.832 [M]. Every answer filled its budget.
next: Measure tokens in an agent run, not only in the packer.
origin: Graph test; my point on how facts are stored

### RET-15 · Traversal cache for what-depends-on-this
stage: Tested; package WP7; metrics: time (primary time); answers: -
problem: We wanted to avoid recomputing what-depends-on-this-file queries, if they were slow enough to be worth caching.
how: A cache over graph traversal results for dependency lookups.
where it stands: Tested on the first graph: all 477 [M] dependency queries together take about 1 ms [M], so there is nothing to save. The replacement test did not re-test the cache question.
next: None. It would return only if lookups became slow at larger scale.
origin: Bottleneck compile; my question of 2026-11-12

### MSR-50 · Where the time goes: model step against disk
stage: Tested · ADDED FROM CHAT: chat of 11 November (session e24f17dc, line 6950); package WP8; metrics: time, efficiency (primary time); answers: TK-LOOKUP
problem: I expected fetching from disk to be the slow part, as in database design, and a cache to be the fix.
how: Time one file read, one repeat read, one search of the repository and one model step on this PC, and compare them.
where it stands: Measured on 11 November: one model step took 6,600 ms (median of 10,658 steps) [M]; a 93 KB file read 0.5 ms (possibly a warm read), a repeat 0.05 ms, a search of 618 files 124 ms [M].
next: Count steps saved, not milliseconds, when judging an index or cache.
origin: Measured in a chat of 11 November

### REV-25 · Cross-runtime contract map
stage: Built; package WP7; metrics: quality, efficiency (primary quality); answers: LIB-GRAPH-CONTRACTS, B01, B17
problem: Silent breaks between web, mobile, backend and configuration live in contracts, not imports, so neither a search nor an import graph sees them.
how: A script extracts client URL to route, settings keys, migration chain, slice contracts, outbox kinds and handlers, and file-tied invariants as review input.
where it stands: Partly built as a script: 65 of 73 client URL literals matched 77 route decorators [M]; 46 settings keys, 46 migration links [M]. Value to review untested.
next: Test at zero tokens on the recorded defect chains, beside the touch-list test.
origin: Graph test; Bottleneck compile

### TOK-14 · Reading rules: grep first, then ranged reads
stage: Built; package WP5; metrics: hallucination, token_count, quality (primary hallucination); answers: TK-FETCHED, B12
problem: Agents read whole large files and cite facts they never saw, so spend is invisible and evidence is second-hand.
how: Never read a file over 300 [S] lines whole: grep the symbol, then read a range; follow imports one hop and list extra files read.
where it stands: Built into the Android analyst, appsec, migration and explorer agent definitions; the design rule came in v3. Not yet tested.
next: Audit the first W2 outputs for extra-file lists.
origin: Orchestration design; Skills packages

### TOK-17 · Cached Expo package sources instead of npm install
stage: Built; package WP9; metrics: efficiency, time, hallucination (primary efficiency); answers: MC-TOOLS, MC-PREBUILD
problem: To answer native Android questions we would otherwise need an install or a network fetch, and the branch head is not the pinned version.
how: Pinned Expo sources are cached on disk; fall back to npm pack of the exact version, then unpkg; never the branch head.
where it stands: Built in the orchestration design: the doc says the sources are already cached. Not yet tested. No install or native prebuild is needed or allowed for these questions.
next: Point the two named research steps at the cache.
origin: Orchestration design

### MEM-10 · Exact-text recall with stable path:line references
stage: Built; package WP7; metrics: token_count, efficiency, time (primary token_count); answers: B12, LIB-EVAL
problem: After a reset an agent re-reads or re-derives what earlier sessions already said, and we cannot easily check what a session really said.
how: ctx.py scans transcripts, subagent transcripts and the archive for terms with no model calls; 'show' reopens the exact record by reference.
where it stands: Built in the testbed: scans 211 [M] transcripts / 115 MB [M] in 1 s [M]. Token saving not yet measured; in the 2026-10-14 screen no arm used journal recall [M].
next: Try a lexical scan over FixFlow's project transcripts to check what a session really said.
origin: Clinic testbed context system

### RET-17 · Graphify outside code-graph tool
stage: Built; package WP7; metrics: token_count, quality (primary token_count); answers: LIB-EVAL, TK-LOOKUP
problem: We search code by grep and a hand-written map. I want to know why this tool looks good while our graph experiments showed modest gains.
how: A PyPI package builds a knowledge graph from code and mixed corpora; extraction may send file contents to a model API.
where it stands: Built in the clinic testbed over an 11-file snapshot: 92 nodes, 127 edges, 10 communities [M]; no query result. Its 71.5x [S] token claim is self-measured. Not installed for FixFlow.
next: Run as shipped in the wider test: throwaway clone, isolated install, version 14+ days old, ten fixed questions against grep.
origin: Clinic testbed; Harness review; raised by me

### RET-18 · Corpus map of typed edges for planning documents
stage: Built; package WP7; metrics: token_count, hallucination, quality (primary token_count); answers: B13, B12
problem: Planning documents are hard to navigate. Fresh agents need bounded, source-cited context from the plan with known gaps, not whole documents.
how: A versioned map of 11 planning files as typed edges with exact line spans, one status per record, a coverage ledger and hash-based refresh.
where it stands: Built in the clinic testbed as design plus prototype; no coding agent used it. 3,361 records for 167 KB [M]; extraction recall 0.52 [M] against an earlier reading; validation never run.
next: Run the frozen validation contract before building any map; carry over the status discipline and recompute-from-base rule.
origin: Clinic testbed

### RET-19 · Context packet query with frontier and gap lists
stage: Built; package WP7; metrics: token_count, hallucination (primary token_count); answers: B12, B13
problem: We want to give a fresh agent a small, cited evidence packet by named start, not whole documents.
how: Breadth-first expansion from a named start within a token budget; each record carries a quote and file lines, plus unresolved, frontier and coverage lines.
where it stands: Built in the clinic testbed; never compared with routed reading, so delivered tokens and task quality are unknown. Extraction recall 0.523 [M] exact, 0.588 [M] loose.
next: Run the validation contract before building a packet tool for FixFlow.
origin: Clinic testbed

### SKL-18 · Orchestration contract skill for the main session
stage: Built; package WP10b; metrics: efficiency, token_count (primary efficiency); answers: W4
problem: The main session must recall tier routing, output schemas and session rules each phase without re-reading long design documents.
how: An authored skill the main session loads each phase: routing table, agent registry, context block, schemas, script contract, plan rules. Not preloaded into subagents.
where it stands: Built: authored on 2026-11-04 from the design and ship plan; in PR #185, merged on 13 Nov. Not yet tested.
next: Check it holds over the first phases that load it.
origin: Skills packages; Orchestration design

### REV-36 · Blast-radius touch list for a fix
stage: Designed; package WP7; metrics: quality, efficiency (primary quality); answers: B01
problem: Fixes introduce defects in files nobody looked at, and we want reviewers shown what a fix could touch.
how: A script lists changed functions, callers, importers, co-changing files and touching tests, and attaches the list to the reviewer's brief.
where it stands: Designed in v2 phase 3; not yet run. Zero-token test on ten recorded fix cases: kept if six of ten [T] fall inside and the list stays within about 15 files [T].
next: Run the zero-token test on the ten recorded cases; hubs need a depth limit and grouping.
origin: Bottleneck compile; Harness v2 design; Graph test

### REV-40 · Diff-restricted register check with one-hop rule
stage: Designed; package WP10a; metrics: token_cost, quality, efficiency (primary token_cost); answers: PR-VERIFYBUDGET
problem: Re-auditing every old register item is expensive, but 'unchanged' can be wrong when an imported file changed.
how: An item is unchanged only if neither its cited files nor files one import hop away changed; otherwise it is checked in depth.
where it stands: Designed in orchestration design v3 as a Sonnet high task; not yet tested.
next: Feed it the git diff outputs.
origin: Orchestration design

### TOK-18 · Pull-only lookups with a 2,000-character cap
stage: Designed; package WP5; metrics: token_count, token_cost, efficiency (primary token_count); answers: TK-FETCHED, TK-CACHEBREAK, LIB-KS-COST, W1
problem: Fetched content is about 27-28.5% [E] of context and gets re-read many times; always-loaded lessons tax every call.
how: Nothing is pushed into context; a lookup returns one lead and one candidate within 2,000 characters [S], mid-window so the prompt cache survives.
where it stands: Designed in the knowledge store (KS-2); untested. 2,000 characters cost about 860 tokens [M]. Prompt caching already works: in the design’s sample, 98.2% [M] of context was cache reads.
next: Build the cap in KS-2, run the zero-token index replay, and log cost per lookup with cache reads.
origin: Knowledge-store design; Harness review rulings; Harness v2 design

### MEM-45 · Eight handle kinds with canonicalised error templates
stage: Designed; package WP7; metrics: efficiency, quality (primary efficiency); answers: LIB-KS-RECALL, LIB-S3
problem: The same root cause appears with different error text, files and words, so one key per entry would miss or mis-merge symptoms.
how: Each entry carries several key types (error template, signature, frames, command, paraphrase, identifiers, doc pointers, actions); a mask pipeline scrubs ids and numbers.
where it stands: Designed in the knowledge-store design; not yet tested. One check: ex6's diff gives 113 tokens [M] firing on 91% of commits [M], so handles are author-named, not derived.
next: Build the canonicaliser with golden fixtures from the repo's own traps in KS-2.
origin: Knowledge-store design, after crash-signature practice

### RET-23 · Doc-context small language model with hash staleness
stage: Designed; package WP6c; metrics: token_count, hallucination (primary token_count); answers: B13, PR-DOCDRIFT
problem: Our evolving documentation goes stale and costs context to read.
how: A local small model builds a bounded doc-state summary, each statement pointing to its source; stale summaries are flagged by source hash.
where it stands: Designed in the clinic testbed; nothing run. Premises: one task-state file 17,174 chars [M] against a 9,000 [S] budget (one case); docs about 1.36 MB [M].
next: Build the cheap, testable part first: hash-based stale detection.
origin: Clinic testbed

### MTH-33 · Move 'Start here' pointer to ship plan
stage: Designed; package WP10a; metrics: efficiency, quality (primary efficiency); answers: W3, W2
problem: CLAUDE.md still sends a fresh session to the July handoff, so a cold agent starts from the wrong document.
how: One-row swap in CLAUDE.md's doc map so 'Start here' points to the ship plan section 0 instead of the July handoff.
where it stands: Designed, not yet tested. Pushing context into every session was looked at and set aside; only the one-row edit stays.
next: Fresh Sonnet agent, neutral prompt: pass if it opens ship plan section 0 first in 3 of 3 runs [T].
origin: Dex Horthy sweep

### SKL-19 · ks command-line tool plus skill as the agent interface
stage: Designed; package WP6b; metrics: efficiency, token_count (primary efficiency); answers: LIB-S5
problem: Subagents and workflow agents need one way into the knowledge store that works with no configuration or approval prompt.
how: A zero-dependency Node command-line tool called through Bash (lookup, verify, show, outcome, claim, record, close), with a skill carrying the procedure.
where it stands: Designed in the knowledge-store design; nothing built. No hook in v1. A skill description at its ceiling would add about 620 tokens per call [E].
next: Build the tool in KS-2, the skill after; I decide KS-D15 (MCP wrapper) and KS-D21 (edit-time hook).
origin: Knowledge-store design

### MSR-21 · Zero-token import-and-caller index replay
stage: Designed; package WP7; metrics: token_count, efficiency (primary token_count); answers: TK-LOOKUP, TK-FETCHED, R2
problem: Our sessions spend many calls only reading; we want to know cheaply whether a code index would have answered them before spending agent tokens.
how: At each recorded window's start commit, build an import-and-caller index, count lookups it would answer, and check it lists the files later edited.
where it stands: Designed, not yet run: 54.7 % [M] of calls only read or search. Co-change half is weak, only 432 commits [M]. Proposed pass marks 3 % of tokens, recall 0.8 [T].
next: I set the pass marks (D23); then run the replay in phase 3 and go live only if it passes.
origin: Bottleneck compile; Harness v2 design

### TOK-25 · Batch lookups into one command
stage: Idea; package WP5; metrics: token_count, efficiency, time (primary token_count); answers: TK-LOOKUP, TK-REREAD
problem: 58% [M] of our calls only read or search, and each one re-reads the whole window.
how: Put two or more reads or searches in one command or one parallel tool-call block, so one re-read serves several lookups.
where it stands: Idea from the token report, ranked third; untested. Batching two lookups would remove about a third of all calls [E] and a third of their re-reads [E].
next: Add a batch-lookups rule to agent briefs and compare calls per task; it could cut about a third [E] of calls.
origin: Token report

### TOK-33 · Cross-session digests of hot, often-read files
stage: Idea; package WP5; metrics: token_count, efficiency (primary token_count); answers: TK-FETCHED, TK-LOOKUP
problem: About a quarter of our tokens are fetched file content, and a small set of files is re-read across sessions while questions rarely repeat.
how: Keep a durable short digest of the most-read files that stands in for reading their lines, lasting across sessions.
where it stands: Idea; digest untested. 72 paths (3.3% [E]) hold half the fetched tokens; paths read in 5+ windows hold 73% [E]. Estimated saving 5-24% [E] after refuters cut a 42% claim.
next: Build digests for the 72 hot paths and test whether answers stay correct.
origin: Bottleneck compile; Library review

### MEM-65 · SQLite graph library for a self-evolving repository
stage: Idea; package WP7; metrics: token_count, efficiency (primary token_count); answers: LIB-KS-VALUE
problem: I remembered a graph-based library with fast, token-minimal recall that improves itself; we wanted to know where it lives and whether it works.
how: Not built in the clinic lane: no SQLite file, graph or self-modifying part exists; nearest pieces are exact-text recall, agent notes and outside tools.
where it stands: Idea only: no graph or SQLite recall measured, and nothing in the clinic line learns or rewrites itself. The knowledge-store track (PR #183) is where it would come from.
next: Use LCM and Virtual Context as design references; I pick which outside designs to test against the plain task file.
origin: My recollection; Clinic testbed sweep

### MEM-67 · Embeddings behind a measured trigger
stage: Idea; package WP7; metrics: efficiency, quality (primary efficiency); answers: LIB-KS-RECALL
problem: Keyword search misses paraphrases with no shared words; we do not know if vectors would help at this size, and installing them carries risk.
how: None in v1. Only if vocabulary misses reach a stated trigger: add sqlite-vec and a local embedder; dense-only hits stay candidates, never leads.
where it stands: Deferred (KS-D16), not yet tested. Trigger: at least 3 [S] misses on 3+ [S] entries among 10+ [S] lookups, with a 95% lower bound on k/n of 5% [S].
next: Report k, n and the bound at KS-9 from the missed-existing view.
origin: Knowledge-store design; my critique and refuter pass

### RET-25 · Neo4j and other server graph engines
stage: Idea; package WP7; metrics: token_count, quality (primary token_count); answers: MC-ENGINE, B08
problem: We want to know whether the market-standard graph database is a better home for the repo graph and its algorithms.
how: Neo4j Community, FalkorDB or Postgres with Apache AGE run through Docker, loaded with the same typed facts.
where it stands: Deferred: not installed, not tested. A server adds 1 to 2 GB [E] of memory on a PC short of memory, and I chose embedded engines instead.
next: Revisit only if the agent pilot shows graphs help and an embedded engine proves too small.
origin: Bottleneck compile; research round

### RET-27 · Model-built knowledge graph and graph database
stage: Idea; package WP7; metrics: token_count, quality, token_cost (primary token_count); answers: LIB-EVAL, B08, LIB-KS-RECALL
problem: We want semantic relations parsers miss, so an agent fetches small context fast and recalls facts through a rich graph.
how: A model reads code and docs and writes entities, relations and cluster summaries, possibly served from a graph database server or paired with embeddings.
where it stands: Deferred, not tested here. Outside, model-built graphs cost about a thousand times [S] vector indexing and often lose to plain retrieval; the one big gain was against full context.
next: Test inside the wider test via Graphify; index replay decides whether a small index earns a trial.
origin: Bottleneck compile; Harness v2 design; GraphRAG-style systems

### RET-30 · File-level connection graph (first test)
stage: Parked; package WP7; metrics: token_count, time (primary token_count); answers: TK-LOOKUP, TK-FETCHED
problem: We wanted one small answer to what depends on this file, instead of several search rounds or reading many files.
how: A model-free script builds a file-to-file graph from imports, test mocks and doc citations, held as JSON or SQLite, and answers everything that depends on this file.
where it stands: Parked: I asked for the strongest form of the idea to be tested instead, and this first version’s verdict was withdrawn. It had 618 files and 1,119 links [M]; answered 1 of 200 [M] searches fully. Replaced by the typed graph test.
next: None; the idea lives on in the typed graph and the contract map.
origin: Bottleneck compile; my question of 2026-11-12
