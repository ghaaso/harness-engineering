# Items to classify, file 5: ideas of themes RET, MTH

### RET-01 (idea, theme RET, In use)
name: Existing code maps: import contracts, CODE-MAP, Haiku locator
problem it is meant to solve: Agents need to find where a feature lives without a call-graph tool.
how: Import-boundary contracts (import-linter on the backend, ESLint on the web), a hand-written code map document and a Haiku locator agent.
where it stands: In use in FixFlow. Not measured. Mobile code has no boundary enforcement yet.

### RET-02 (idea, theme RET, In use)
name: Slow grep-and-model search over optimised retrieval
problem it is meant to solve: We want to pick a retrieval design for code understanding that is reliable rather than clever.
how: Prefer reliable agentic search, grep plus a model, over optimised retrieval; a learned reranker was passed over.
where it stands: In use: it matches what the harness already does. A learned reranker is a skip. Taken as a stated preference, not a measured result.

### RET-03 (idea, theme RET, In use)
name: Same-facts cross-check between engines
problem it is meant to solve: We want score differences to come from facts, algorithm and output form, never from an engine bug.
how: Given identical facts and algorithm, two engines must return the identical answer; a mismatch is a bug, not a result.
where it stands: In use in the graph test: typed arms identical on 770 of 770 [M] held-out tasks; the two hypothesis differences were exactly 0 [M].

### RET-04 (idea, theme RET, In use)
name: Podcast RSS feeds for transcripts
problem it is meant to solve: Show pages expose only part of a podcast's transcript, so research on outside ideas is incomplete.
how: Read the feed's transcript tag; otherwise fetch the audio file attached to the episode (its enclosure).
where it stands: In use for two podcasts: one feed gave a 12,100-word [M] transcript against 1,800 words [M] from the site.

### RET-05 (idea, theme RET, In use)
name: X timeline via fxtwitter; charts read as images
problem it is meant to solve: X posts could not be read (HTTP 402) and benchmark numbers sat only in chart images.
how: Page the fxtwitter timeline endpoint for a user's posts and self-replies; give chart images to a reader agent.
where it stands: In use: 197 statuses since 1 September [M], 159 [M] the author's own, plus 7 [M] charts read. Replies under posts are not captured.

### RET-06 (idea, theme RET, Tested)
name: Typed symbol-level graph of the repo
problem it is meant to solve: We want a short ranked answer to what else must change with this code, using typed links across web, mobile and backend that flat search cannot.
how: A model-free script extracts about 2,500 symbols and 19+ edge kinds [M] from each task's parent commit; queries rank neighbours within hop budgets.
where it stands: Tested on held-out commits: recall in an 8,000-token [S] answer 0.700 [M] vs 0.625 [M] for a scripted search. The gain is on mobile seeds (+0.151 [M]). No agent was run.

### RET-07 (idea, theme RET, Tested)
name: Co-change floor (files that changed together)
problem it is meant to solve: We need a cheap baseline for what else changes with this file, taken only from git history, that any graph must beat.
how: From earlier commits only, count files changed together, rank by support (how often the two files changed together), confidence (the share of the seed file’s commits that also changed the other) and recency, and return the top files within the token budget.
where it stands: Measured on held-out commits: recall 0.638 [M] (tuning split 0.752 [M]). Typed graph beats it by +0.063 [M], but only on mobile seeds; on backend seeds co-change 0.709 [M] vs typed 0.699 [M].

### RET-08 (idea, theme RET, Tested)
name: Same-directory floor
problem it is meant to solve: We want to know whether our vertical-slice folder layout already carries most connection information, so any graph must beat files in the same folder.
how: Return the other files in the seed file's folder, packed to the token budget, with no graph and no history.
where it stands: Measured on held-out commits: recall 0.549 [M] (tuning split 0.719 [M]). Typed graph beats it by +0.151 [M]; on web seeds same-directory scored 0.773 [M] vs typed 0.664 [M], interval includes zero.

### RET-09 (idea, theme RET, Tested)
name: PageRank and community priors for ranking
problem it is meant to solve: We want the most relevant neighbours of a changed file first inside a token budget, using ranking a flat table lacks natively.
how: Personalised PageRank from the seed, optionally with a stored community grouping, ranks neighbours; iterations run in our code, only grouping comes from the engine.
where it stands: Tested on held-out commits: no gain of 0.05 or more; +0.015 [M] on the main task, interval spans zero. Five random re-draws of the Louvain communities moved recall about as much as the effect (standard deviation 0.008 [M]).

### RET-10 (idea, theme RET, Tested)
name: Hop sweep with per-edge-kind budgets
problem it is meant to solve: One global hop limit returns either too little or a flood. We want depth, direction and hub handling chosen per kind of link.
how: On tuning commits only, sweep hop depth, direction, per-edge-kind budgets and hub cuts; pick the simplest setting within one standard error and freeze it.
where it stands: Tested on tuning commits: import neighbours reach recall 0.38, 0.72 and 0.87 [M] at 1, 2 and 3 hops, with 9, 45 and 90 [M] files. Hop depth moved the score most.

### RET-11 (idea, theme RET, Tested)
name: Output form and token-budget packing
problem it is meant to solve: We want to score an answer by value per token, not stored size, so the form the model receives is itself tested.
how: One shared packer and tokenizer return the same output forms (paths, signatures, line ranges, snippets) at 2k, 4k, 8k and 16k [S] token budgets.
where it stands: Tested on held-out commits: typed beats search by +0.070 and +0.102 [M] at 2,000 and 4,000 [S] tokens; recall at 16k [S] is 0.832 [M]. Every answer filled its budget.

### RET-12 (idea, theme RET, Tested)
name: SQLite as the relational arm
problem it is meant to solve: We want the graph engines to face a strong established relational opponent, and a possible plain home for the facts, so the test is fair.
how: SQLite with typed node and edge tables, covering indexes, full-text search, a co-change table and depth-capped recursive queries.
where it stands: Tested on held-out commits: recall 0.700 [M], identical to both graph engines; 0 mismatches on 7,040 [M] random configurations. First test: 0.05 ms [M] per query.

### RET-13 (idea, theme RET, Tested)
name: LadybugDB embedded graph engine arm
problem it is meant to solve: We want to test an established embedded graph engine with native typed paths and ranking, rather than compare graph and relational designs through code we wrote ourselves.
how: The same facts loaded in LadybugDB 0.22.3 (a maintained Kuzu fork), queried with Cypher and its PageRank and Louvain extension, inside a Linux image.
where it stands: Tested: 0 mismatches in 47,244 [M] comparisons against the reference; recall 0.700 [M] on held-out, equal to the relational arm. Native ranking slow, about 0.7 s [M]. About 16 MB [S] install.

### RET-14 (idea, theme RET, Tested)
name: DuckDB with DuckPGQ graph layer arm
problem it is meant to solve: We want to test a graph query layer on a relational engine, holding the engine fixed and changing only the query layer.
how: DuckDB 2.0.0 with the DuckPGQ extension loaded with the same facts; one edge table per kind, since edge filters are unavailable inside paths.
where it stands: Tested on held-out commits: shown answers identical to the relational arm on 770 of 770 [M] tasks; recall 0.700 [M]. No PageRank or Louvain, so rankings fall back to SQL. About 63 MB [S] install.

### RET-15 (idea, theme RET, Tested)
name: Traversal cache for what-depends-on-this
problem it is meant to solve: We wanted to avoid recomputing what-depends-on-this-file queries, if they were slow enough to be worth caching.
how: A cache over graph traversal results for dependency lookups.
where it stands: Tested on the first graph: all 477 [M] dependency queries together take about 1 ms [M], so there is nothing to save. The replacement test did not re-test the cache question.

### RET-16 (idea, theme RET, Tested)
name: Code-reading question set (50 questions)
problem it is meant to solve: We want to score structured lookups, such as which tables a screen writes, with truth read from the code rather than from the extractor.
how: 50 [S] structured questions answered by one reader with evidence lines and checked blind by a second; 20 for tuning, 30 held out.
where it stands: Tested on 30 held-out questions: typed minus search +0.100 [M], inconclusive. On 23 untouched questions +0.189 [M]. Median typed answer 31 vs 695 [M] tokens search read, not like for like.

### RET-17 (idea, theme RET, Built)
name: Graphify outside code-graph tool
problem it is meant to solve: We search code by grep and a hand-written map. I want to know why this tool looks good while our graph experiments showed modest gains.
how: A PyPI package builds a knowledge graph from code and mixed corpora; extraction may send file contents to a model API.
where it stands: Built in the clinic testbed over an 11-file snapshot: 92 nodes, 127 edges, 10 communities [M]; no query result. Its 71.5x [S] token claim is self-measured. Not installed for FixFlow.

### RET-18 (idea, theme RET, Built)
name: Corpus map of typed edges for planning documents
problem it is meant to solve: Planning documents are hard to navigate. Fresh agents need bounded, source-cited context from the plan with known gaps, not whole documents.
how: A versioned map of 11 planning files as typed edges with exact line spans, one status per record, a coverage ledger and hash-based refresh.
where it stands: Built in the clinic testbed as design plus prototype; no coding agent used it. 3,361 records for 167 KB [M]; extraction recall 0.52 [M] against an earlier reading; validation never run.

### RET-19 (idea, theme RET, Built)
name: Context packet query with frontier and gap lists
problem it is meant to solve: We want to give a fresh agent a small, cited evidence packet by named start, not whole documents.
how: Breadth-first expansion from a named start within a token budget; each record carries a quote and file lines, plus unresolved, frontier and coverage lines.
where it stands: Built in the clinic testbed; never compared with routed reading, so delivered tokens and task quality are unknown. Extraction recall 0.523 [M] exact, 0.588 [M] loose.

### RET-20 (idea, theme RET, Built)
name: Coverage ledger and stale-label freshness
problem it is meant to solve: A derived index silently goes out of date when source files change, and we cannot tell what was actually read.
how: A ledger lists read and unread chunks per file version; queries check file hashes, label changed records stale, and refresh supersedes rather than deletes.
where it stands: Built in the clinic testbed as a manual command, tested on synthetic cases only; the changed-source case was not run. 4,053 dangling endpoints at levels 1 and 2 [M].

### RET-21 (idea, theme RET, Built)
name: Candidate index: similarity proposes, never decides
problem it is meant to solve: Similarity retrieval can leak guesses into answers that are meant to carry evidence. We want guesses kept apart.
how: Similarity and alias proposals sit in a separate candidates file that no query reads; a test deletes it and checks packets are byte-identical.
where it stands: Built in the clinic testbed with its deletion test; precision not measured. 1,906 candidates [M] in the store, 93 [M] open for one file.

### RET-22 (idea, theme RET, Designed)
name: Slice fragments generate board and true-now view
problem it is meant to solve: Slice status and findings go stale and get re-read; one writer edits an 800-line board by hand and sessions carry a 221 KB document.
how: Each slice writes a small state fragment; tools generate a short board and a true-now view; the board diff becomes a check step.
where it stands: Designed in harness v2 phase 3; nothing built. Target: board from 221 KB [M] to under 20 KB [T]; root edits at merge zero [T].

### RET-23 (idea, theme RET, Designed)
name: Doc-context small language model with hash staleness
problem it is meant to solve: Our evolving documentation goes stale and costs context to read.
how: A local small model builds a bounded doc-state summary, each statement pointing to its source; stale summaries are flagged by source hash.
where it stands: Designed in the clinic testbed; nothing run. Premises: one task-state file 17,174 chars [M] against a 9,000 [S] budget (one case); docs about 1.36 MB [M].

### RET-24 (idea, theme RET, Designed)
name: Pull graph output, never push; build per worktree
problem it is meant to solve: We want to stop a graph or memory layer from breaking the cached start of every window or describing the wrong working tree.
how: Return graph output only as a tool result, never in the system prompt or CLAUDE.md; build the graph per worktree at query time.
where it stands: Designed as a rule for any future retrieval build; not itself built or tested. Agents work in five [M] worktrees with uncommitted files, so a shared graph would mislead.

### RET-25 (idea, theme RET, Idea)
name: Neo4j and other server graph engines
problem it is meant to solve: We want to know whether the market-standard graph database is a better home for the repo graph and its algorithms.
how: Neo4j Community, FalkorDB or Postgres with Apache AGE run through Docker, loaded with the same typed facts.
where it stands: Deferred: not installed, not tested. A server adds 1 to 2 GB [E] of memory on a PC short of memory, and I chose embedded engines instead.

### RET-26 (idea, theme RET, Idea)
name: Embedding-search arm (vector index)
problem it is meant to solve: We want the strongest non-graph baseline from the literature in the test, so graph gains are not credited to the index.
how: A vector index over code and docs, queried by similarity; needs a model download.
where it stands: Deferred: not in the frozen protocol and not tested. It needs a model download, which is my decision to approve.

### RET-27 (idea, theme RET, Idea)
name: Model-built knowledge graph and graph database
problem it is meant to solve: We want semantic relations parsers miss, so an agent fetches small context fast and recalls facts through a rich graph.
how: A model reads code and docs and writes entities, relations and cluster summaries, possibly served from a graph database server or paired with embeddings.
where it stands: Deferred, not tested here. Outside, model-built graphs cost about a thousand times [S] vector indexing and often lose to plain retrieval; the one big gain was against full context.

### RET-28 (idea, theme RET, Idea)
name: Agent-in-the-loop pilot
problem it is meant to solve: I want to know whether a graph or knowledge layer lets an agent finish with fewer tokens, calls and mistakes than ordinary search.
how: Replay 24 to 30 [E] fix commits with one fixed agent: grep alone, plus SQL, a graph tool or BM25; record tokens, calls, success.
where it stands: Deferred, not run; it needs model tokens and many agents. One outside study cut tokens 17 to 39 % [S] on two benchmarks and raised them on a third.

### RET-29 (idea, theme RET, Idea)
name: Wider graph test protocol
problem it is meant to solve: I want to test the architecture I described, with knowledge layer, time, caching, an agent and Graphify as an arm, not only the scorable part.
how: Five research lanes, an assumptions audit and strongest-architecture design, a refuter, a protocol draft and a design check; no installs.
where it stands: Idea stage: research and protocol draft were in progress when last recorded; nothing tested. The earlier test's narrow scope must be stated up front.

### RET-30 (idea, theme RET, Parked)
name: File-level connection graph (first test)
problem it is meant to solve: We wanted one small answer to what depends on this file, instead of several search rounds or reading many files.
how: A model-free script builds a file-to-file graph from imports, test mocks and doc citations, held as JSON or SQLite, and answers everything that depends on this file.
where it stands: Parked: I asked for the strongest form of the idea to be tested instead, and this first version’s verdict was withdrawn. It had 618 files and 1,119 links [M]; answered 1 of 200 [M] searches fully. Replaced by the typed graph test.

### MTH-01 (idea, theme MTH, In use)
name: Root as the only writer of shared documents
problem it is meant to solve: Several sessions editing the same shared documents conflict and give us divergent truth. We want one source for each.
how: Only the root edits shared documents. Slices propose changes in their own record as exact old and new text; registry files are append-only.
where it stands: In use in the clinic build, and it became a bottleneck itself: board state 221 KB [M], root edits caused failing checks at two slices, and docs were stale at wrap-up.

### MTH-02 (idea, theme MTH, In use)
name: Infrastructure failures kept apart from content failures
problem it is meant to solve: A flaky provider or a run that tested nothing must not read as a pass, or as a bad brief.
how: A null is never a result; fresh nulls suggest a session limit; zero tests is never green; coverage reads 16/16 or carries a waiver.
where it stands: In use as program law in the orchestration design, and confirmed in the BAML sweep. BAML's own optimiser documents that it does not cover this.

### MTH-03 (idea, theme MTH, In use)
name: Models give verdicts; code computes counts and scores
problem it is meant to solve: Holistic model scores are unreliable and I cannot read all the logic; a script that filters or asks a model to count can lose items silently.
how: Models give yes/no or enum verdicts; code computes scores, logs dropped counts, applies no silent caps; each phase gets a cheap human-checkable proof.
where it stands: In use as program law: enum verdicts roll up into buckets by script, and the findings backlog means nothing is silently dropped. Confirmed in the BAML sweep.

### MTH-04 (idea, theme MTH, In use)
name: Coordinator session that never implements
problem it is meant to solve: With many sessions at once, we need one place that owns the plan, shared results and merge calls, kept free of implementation work and its token cost.
how: One session on the plan branch owns the ship plan, results file, OWNER-VIEW page, contracts and merge-ready calls. It dispatches reviews and never implements.
where it stands: In use since 2026-11-13. The coordinator woke and resumed eight [M] lane sessions after the power loss. It lets 8 [M] lanes run at once; no measured effect on speed yet.

### MTH-05 (idea, theme MTH, In use)
name: Plan on a branch, tagged before lanes read
problem it is meant to solve: The plan, design notes and evidence live on a PR branch, not main, so a lane could read uncommitted text or miss the files.
how: Lanes read the plan branch by absolute path or git show. The coordinator commits, pushes and tags every plan edit before telling a lane.
where it stands: In use: tags plan-v9 and plan-v9.1 exist, and the results file cites the plan at v9.1. No measured effect yet.

### MTH-06 (idea, theme MTH, In use)
name: Defer phase plan and recipes to Stage 3
problem it is meant to solve: Phase design before verified facts would be built on guesses, so we wanted it designed only after the deep-dive.
how: One session per phase; Sonnet for well-specified fixes; Opus for outbox, lifecycle, ledger and migration code; Opus reviewers refute by default.
where it stands: Applied: the orchestration design deferred the phase plan on purpose, and it was designed later as the ship plan, after the second gate.

### MTH-07 (idea, theme MTH, In use)
name: Staged workflows with judging gates between them
problem it is meant to solve: We want cheap wide discovery, narrow expensive deep dives and a recorded decision between stages, so the plan is designed only after a verified picture exists.
how: Pre-flight, cheap discovery, gate, Opus deep-dive, gate, phase plan. The main session reads results by id at each gate and writes a record.
where it stands: Both gates written 2026-11-01. Discovery: 16/16 [M] areas, about 1.67M [M] tokens, 14 min [M]. Deep-dive: 8 [M] analysts, 139 [M] findings, about 3.3M [M] tokens, 23 min [M].

### MTH-08 (idea, theme MTH, In use)
name: Model tiers by role, raise effort before tier
problem it is meant to solve: Model choice is our main cost lever. We want the strongest model only where mistakes are expensive, and no agent at an unchosen strength.
how: Haiku extracts; Sonnet maps and runs gates; Opus analyses, refutes; the main session judges. Name model and effort each start; raise effort before tier.
where it stands: Used in FixFlow and the whole clinic build; 12 [M] agent definitions built: 6 Opus and 5 Sonnet on PR #185, and the Haiku explorer. Tiering has no cost measurement yet; every clinic slice needed 2-4 [M] review rounds.

### MTH-09 (idea, theme MTH, In use)
name: Brief contract and CONTEXT block for every agent
problem it is meant to solve: Our agents re-derive project facts, start without a clear task, drift and overstate what was proved. We want every brief complete and every claim cited.
how: A brief names goal, files, branch, settled facts and what done returns, in one paragraph. A fixed context block with rules is prepended verbatim.
where it stands: Used on every brief in the clinic build. No before/after of rework was measured. It does not stop overstated reports: the clinic S11 gate found two unsupported claims.

### MTH-10 (idea, theme MTH, In use)
name: Typed output schemas, forced and validated
problem it is meant to solve: Free prose from agents is costly to read and invites unchecked claims. We want results the orchestrator and scripts can read by a fixed shape.
how: Agents return a fixed JSON Schema object, validated and retried by the workflow tool. A blocked agent returns a named code, not a guess.
where it stands: In use: twelve schemas in the design, all 11 [M] agent definitions reference them; forced output is how the harness works. Strict validation has no silent-drop failure; BAML repair has one [S].

### MTH-11 (idea, theme MTH, In use)
name: State in the repository, parents judge by diff
problem it is meant to solve: Work state lived in chat context and was lost on compaction or restart. We want a stopped session resumable, and parents not trusting a child summary.
how: Each node keeps one task record (status, next action, evidence). A parent reads the diff and record; resume from branch plus record.
where it stands: In use in the clinic: 37 [M] task folders; no real dead-session recovery timed, resume tooling only synthetic. FixFlow skips it, since plan, PR body, results file and git already own state.

### MTH-12 (idea, theme MTH, In use)
name: Wave board as single current-state file
problem it is meant to solve: We want one authoritative place for what is built, in review and next, so any session can pick up the build.
how: One file holds the current-state table (slice, status, session, tier, gate), dated gate sections, wrap-up, next actions and open questions. Root edits only.
where it stands: In use to wrap-up in the clinic: 829 lines, 219,111 bytes [M] at sweep time. Append-only gate sections let earlier statements go stale, and nothing gave me a live progress view.

### MTH-13 (idea, theme MTH, In use)
name: Parallel research agents each own one report
problem it is meant to solve: Delegated agents return unfocused or overlapping work. We want each worker with a clear question, its own file and a stop condition.
how: A delegation template names question, scope, ownership, return form and stop condition. Research agents each own one report file; four [S] workers at most.
where it stands: In use in the clinic testbed. Delegation cost was not measured; more workers is not evidence of better results. The root integrates and cross-checks, not by vote.

### MTH-14 (idea, theme MTH, In use)
name: Short stable handles instead of hashes
problem it is meant to solve: Agents echoing long ids or commit hashes can mis-aggregate them silently.
how: Agents use short labels such as H-01 and S-07b; long hashes are checked by git in code, so a mis-echo fails loudly.
where it stands: In use in the harness. An outside measurement on id aggregation had a small sample, two runs per arm [S], so we rely on the practice, not the figure.

### MTH-15 (idea, theme MTH, In use)
name: Same-tier retry; only infrastructure changes tier
problem it is meant to solve: Silently escalating to a stronger model after a schema failure hides cost and masks a defect in the brief.
how: Structured-output retries stay inside the same subagent; scripts retry at the tail with the same task and model.
where it stands: In use by construction: retries already stay on the same model, so the rule holds today. A design rule could state it.

### MTH-16 (idea, theme MTH, In use)
name: Escape-hatch values in every schema
problem it is meant to solve: A forced schema can make a model invent a conforming answer when the input does not fit.
how: Schemas carry values such as UNVERIFIABLE, untestable, UNCLEAR, unknown or empty, and an unknown is recorded as unknown.
where it stands: In use: already in the output schemas and a research rule. Agents wrote 'undated' honestly in the BAML sweep.

### MTH-17 (idea, theme MTH, In use)
name: Briefs in git; contract shapes frozen
problem it is meant to solve: We want prompt changes to be reviewable and every result traceable to a version.
how: Briefs live in git, runs cite commit hashes, and the fixed return contracts keep their shape so only prose is edited.
where it stands: In use and confirmed in the BAML sweep.

### MTH-18 (idea, theme MTH, Tested)
name: Compare structures on the problem case, not pieces
problem it is meant to solve: Fitting BAML's pieces under our structure could hide where its whole structure serves the work better or worse.
how: Build one deep-dive lane BAML's way, compare both structures on ten dimensions with a second agent, then verify headline claims at source and rule.
where it stands: Done; our structure served the case as well or better on all ten dimensions (judged). It corrected one card, found two stale lines, and showed borrows of 10 to 40 lines [E].

### MTH-19 (idea, theme MTH, Built)
name: Map store with bounded chunk readers
problem it is meant to solve: We want relations extracted from a big document set without one agent reading everything or long reports passing through the orchestrator.
how: Chunk by heading (6,000 characters at most [S]); fresh reader per chunk writes a file; script validates; one writer ingests; resume from pending state.
where it stands: Built in the clinic testbed: 51 chunks over 11 files read and ingested [M]; 3,361 records [M]; 11 synthetic tests pass [M]. Tokens, time and build cost were not measured.

### MTH-20 (idea, theme MTH, Built)
name: Hypothesis table and challengeable settled facts
problem it is meant to solve: We want open questions tracked with an owner and what would settle each, while agents skip resolved points but can still correct a wrong settled fact.
how: Hypotheses H1-H18 carry a status, basis and owning analyst. Settled rows go into args as given; an analyst may challenge one with evidence.
where it stands: The table is in use, updated at the first gate. The challenge channel is specified in design v3 only. Not yet tested.

### MTH-21 (idea, theme MTH, Designed)
name: One fact, one command
problem it is meant to solve: An unchecked agent report once produced a false harness rule, and first-deploy steps can be ticked without proof. We want facts backed by evidence.
how: One command checks a fact before it becomes a rule, recorded verified or contradicted. Each first-deploy step carries command, expected result and planted-failure run.
where it stands: Adopted from phase 1 of harness v2; costs one line in a brief. Not yet tested. Planned baseline: count which of the root's 15 [M] lessons are environment facts one command could check.

### MTH-22 (idea, theme MTH, Designed)
name: Scripts before agents
problem it is meant to solve: In the testbed, ideas kept as prose in a brief or model re-checks mostly failed. We want scripts, not models, making every check a script can.
how: Models find things; scripts decide whether a finding is closed. The gate, audit, planner and parser are scripts that spend no tokens.
where it stands: Standing rule of harness v2. Testbed record: 33 [M] practised dropped ideas worked and 38 [M] failed, mostly as prose. The scripts themselves have not run live.

### MTH-23 (idea, theme MTH, Designed)
name: Plan-check section in the orchestration document
problem it is meant to solve: The orchestration document has no dependency graph, footprint check or lane arithmetic, and states capacity facts as rules instead of measured limits.
how: Add a plan-check section, lane arithmetic in the cost section and machine limits in constraints; no plan runs before it passes.
where it stands: Designed in harness v2 section 0. Nothing has changed in the document yet; the edit belongs to the ship plan's PR.

### MTH-24 (idea, theme MTH, Designed)
name: Knowledge-store steps in the phase routine
problem it is meant to solve: A store nobody consults helps nothing, and escalating a tier without a lookup pays the top tier for a repeat.
how: A plan section 0 bullet: look up before escalating, diff lookups at first commit and PR-ready, record before PR-ready, close at phase end.
where it stands: Designed in the knowledge-store design: proposed text only, not applied, conditional on the pilot saying go. Compliance is self-reported, no hook. Not yet tested.

### MTH-25 (idea, theme MTH, Designed)
name: Knowledge-store log and CLAUDE.md trim
problem it is meant to solve: A store nobody consults helps nothing, and the always-loaded CLAUDE.md file stays long.
how: A prospective log with a checkpoint date in the OWNER-VIEW page, and a CLAUDE.md PR that swaps verified narratives for one-line rules.
where it stands: Designed in the knowledge-store design, conditional on a pilot go; not applied and not yet tested. Under go-minimal only declarative entries are wired in and trimmed.

### MTH-26 (idea, theme MTH, Designed)
name: Orchestrator decides; subagents only gather and verify
problem it is meant to solve: We want all judgement in one place, so a cheap agent's first impression never becomes a decision by inertia and never silently cancels a deeper investigation.
how: Main session sets hypotheses, reads every result, makes calls. Subagents gather, analyse, verify; a cheaper verdict may narrow a deeper brief, never remove it.
where it stands: Designed in the orchestration design (v3) as a rule. The records show the main session judging, but no subagent output has yet been audited for being treated as a decision.

### MTH-27 (idea, theme MTH, Designed)
name: Judgement-free discovery
problem it is meant to solve: We want to stop a cheap first-stage impression from becoming a top-priority finding by inertia, and keep what the orchestrator reads bounded by schema, not prose.
how: First-stage agents return constants, lines, names, commands and exit codes, never a comparison, severity or verdict. The gate or analyst compares values.
where it stands: Designed in the orchestration design and applied to every discovery brief; this compile also states the rule. Not yet tested.

### MTH-28 (idea, theme MTH, Designed)
name: Return contract: value or null, with coverage count
problem it is meant to solve: A missing or crashed agent result must never be read by us as 'nothing found'.
how: Every run resolves to a value or null. The script returns results, missing, not-started and coverage; the first gate re-runs or waives each gap.
where it stands: Designed as a rule at the first gate. Not yet tested as a rule; the discovery stage reported 16/16 [M] coverage.

### MTH-29 (idea, theme MTH, Designed)
name: Write the gate record before the next workflow
problem it is meant to solve: The deep-dive analysts started without the first gate record, because a shell quoting failure delayed it. We want the decision trail never lost.
how: The gate record is written to the repo and confirmed on disk before the next workflow starts, so every analyst gets the settled facts.
where it stands: Adopted as a plan rule and stated as a lesson from both gates. No analyst's output depended on the missing file, because the substance was in the brief (qualitative).

### MTH-30 (idea, theme MTH, Designed)
name: Plan sha in PR body, with resume fetch
problem it is meant to solve: A restarted or compacted session does not know which plan version it used, and can miss an amendment because git updates origin/main only on fetch.
how: The PR body starts with the plan commit id. On resume, fetch origin, diff from that id to origin/main and re-read only changed sections.
where it stands: Reviewer ruling adopt; the fetch line is adopted in its narrow one-line form. Not yet tested. Pass test: each recorded sha equals the remote main head at that moment.

### MTH-31 (idea, theme MTH, Designed)
name: Phase opening, precedence and journal rules bundle
problem it is meant to solve: Our phase routine can skip steps or trust the wrong document. I want small written rules so each phase opens, runs and closes the same way.
how: Small written rules: document precedence, explicit skill start, fetch before resume, pasted opening block, cause tags, three-push CI stop, live PR body fetch.
where it stands: Designed from the Dex Horthy sweep; not yet tested here. Umbrella over many single rules, eight adopt and the rest trial. FixFlow only; no bottleneck record names these skips.

### MTH-32 (idea, theme MTH, Designed)
name: One-sentence source-precedence rule in ship plan
problem it is meant to solve: When the journal, the plan, a design note and CLAUDE.md disagree, a fresh agent has no stated order for which one wins.
how: One sentence in plan section 0 ranks my correction, plan on main, Plan @ sha, design note; CLAUDE.md and code win on stack facts.
where it stands: Designed, not yet tested. It stays out of CLAUDE.md on purpose to keep that file short. The test plants two conflicts in the P1 cold-resume fact set.

### MTH-33 (idea, theme MTH, Designed)
name: Move 'Start here' pointer to ship plan
problem it is meant to solve: CLAUDE.md still sends a fresh session to the July handoff, so a cold agent starts from the wrong document.
how: One-row swap in CLAUDE.md's doc map so 'Start here' points to the ship plan section 0 instead of the July handoff.
where it stands: Designed, not yet tested. Pushing context into every session was looked at and set aside; only the one-row edit stays.

### MTH-34 (idea, theme MTH, Designed)
name: Phase id comes from me, never inferred
problem it is meant to solve: Concurrent phases are allowed and branch names do not name phases, so a session could pick the wrong phase.
how: One line in the orchestration skill's start step: the phase id comes from my opening message or skill arguments; if missing, the session asks.
where it stands: Designed as a one-line edit; not yet tested. Pass is zero sessions naming a phase different from my opening message across the next 5 phase sessions [T].

### MTH-35 (idea, theme MTH, Designed)
name: Fetch live PR body before every body-file write
problem it is meant to solve: Rewriting a PR body from a stale copy silently loses journal lines and ticked boxes.
how: One clause in section 0: before each body-file write, fetch the live PR body with gh and edit that text, never a rebuilt copy.
where it stands: Designed, not yet tested. Check at the close of P1, P2 and P3 by reading each PR body's edit history; pass is zero unexplained losses [T].

### MTH-36 (idea, theme MTH, Designed)
name: Save-rule, run provenance and skill retirement
problem it is meant to solve: Workflows are written per task and not saved, and without the script, args and reviewer brief a run cannot be re-run or audited.
how: Keep a script only after a second use or a failure; save it as run with args and brief; run skill retire checks.
where it stands: Adopted in narrowed form, not yet tested. Pass by P10 [T]: every saved script names at least 2 dated uses or a failure id.

### MTH-37 (idea, theme MTH, Designed)
name: Explicit effort on every reviewer and implementer launch
problem it is meant to solve: An agent launched with no effort setting silently inherits the orchestrator's effort, so reviewers may run at the wrong level and cost more.
how: One line in section 0: launch reviewers and implementers with an effort from the plan, via a Workflow agent call, never an inheriting path.
where it stands: Listed as adopt, narrowed, though both reviewers scored it trial; not yet tested. Check over the first 3 phase PRs that every launch shows explicit effort [T].

### MTH-38 (idea, theme MTH, Designed)
name: Secrets passed by variable name in briefs
problem it is meant to solve: Phases that handle secrets, such as the backup dump and Cloudflare calls, could leak values into records, PR bodies or agent context.
how: In four phase briefs, secrets are passed by variable name; records name the variable, never the value; agents never read a .env file.
where it stands: Designed for four named phases only; not yet tested. At each close a local exact-value scan of diff, PR body and evidence must find 0 [T].

### MTH-39 (idea, theme MTH, Designed)
name: Escalation ladder: Sonnet, then Opus, then Fable
problem it is meant to solve: I want the cheap model first, yet it will fail some hard work outright, and the average gap between tiers hides that hard tail.
how: Cheap model first; a caught failure gets one cheap retry, then Opus, then Fable. Solve once at the lowest capable tier and store it.
where it stands: Modelled on guessed inputs: at middle values 25.7 [G] cheap-call equivalents and 21.2 % [G] wrong per piece, against 29.9 [G] and 11.2 % [G] for the strong model alone.

### MTH-40 (idea, theme MTH, Designed)
name: Five-phase harness build order with dependencies
problem it is meant to solve: We have 21 problems to fix and want to build them in the order the evidence supports.
how: Phase 1 machine, 2 check, 3 gate and review scripts, 4 first use, 5 token budget. Hard order: 1 before 2, 2 before 4.
where it stands: Designed in harness v2; phase 1 has started with read-only work and its findings exist. The order follows the record: machine first (24 [M] power-offs), review third, tokens last.

### MTH-41 (idea, theme MTH, Idea)
name: Machine-appliable patches for shared docs
problem it is meant to solve: Only the root writes shared documents, and that makes the root a serial bottleneck we want to remove.
how: Children write their proposed shared-document edits as a patch that a script applies, so the root no longer rewrites each one.
where it stands: Idea only, suggested in a sweep card's transfer note. Not built, not tested.

### MTH-42 (idea, theme MTH, Idea)
name: Advisory CI check on PR bodies
problem it is meant to solve: Whether the phase routine ran is self-reported, so a missing plan line, journal heading or reviewer verdict raises no alarm.
how: A dependency-free workflow checks PR bodies for a resolving plan line, task list, journal heading and a reviewer verdict naming the head commit.
where it stands: Trial, not yet tested. Top trial 3 of the Horthy sweep; about 40 lines of YAML [E]; advisory on drafts, failing when ready.

### MTH-43 (idea, theme MTH, Idea)
name: Gate-script hygiene: tagged results and clean inputs
problem it is meant to solve: A schema failure could look like a usage-limit null, a skeptic could get contaminated inputs, and a script could trust an agent's own list of reads.
how: Tag agent results null, error or value; build skeptic inputs by pure function; check self-listed reads against the transcript; rename 'reasoning' to 'explanation'.
where it stands: Trial, unrefuted and not yet tested. Refuters narrowed all four to FixFlow only: no dead reviewer read as clean and no contaminated reviewer is on the testbed record.

### MTH-44 (idea, theme MTH, Idea)
name: Shape block: signatures and call stack in PR
problem it is meant to solve: On phases that change control flow or add surfaces, design mistakes show up only after the code is written.
how: Before the first code commit, the Opus implementer drafts public signatures and the call stack in the draft PR body. No tool is built.
where it stands: Trial, narrowed, not yet tested. Candidates are the first 4 Opus-owned phases that change control flow [T].

### MTH-45 (idea, theme MTH, Idea)
name: Script-generated document provenance
problem it is meant to solve: Documents may carry placeholder or unverifiable provenance, so a reader cannot tell which commit a claim was written against.
how: A script writes metadata frontmatter (git commit and branch) and citations use commit-pinned permalinks; only that script is pre-approved.
where it stands: Deferred: it went over the sweep's cap, so no refuter has ruled on it and no measurement is defined.

### MTH-46 (idea, theme MTH, Idea)
name: Paste-to-open-a-phase block
problem it is meant to solve: A new phase session can skip the steps that leave no trace, and nobody can tell afterwards.
how: A 5 to 8 line block in plan section 0, with separate code and operations first steps, naming only steps that leave no trace.
where it stands: Trial, not yet tested. The evidence behind it is a single anecdote, so we test it on our own phases first.

### MTH-47 (idea, theme MTH, Idea)
name: 'Mirror these files' field in Sonnet briefs
problem it is meant to solve: Sonnet implementers write code that does not match the patterns already in the repo.
how: Each Sonnet implementation brief names 1 to 3 existing files to mirror, which the explorer agent can fill in.
where it stands: Trial, not yet tested. The test is a blind paired probe rather than a PR count: 4 tasks, each with and without the line, 8 sessions [T].

### MTH-48 (idea, theme MTH, Idea)
name: Two failed corrections, then a fresh session
problem it is meant to solve: Repeated corrections pile failed attempts into one session's context, and the box still does not close.
how: After two failed corrections: commit and push, journal the failure, resume in a new session; a failed subagent gets a fresh brief.
where it stands: Trial, not yet tested. It aims to keep long windows short. Applies to the first 10 phase sessions from P0a [T].

### MTH-49 (idea, theme MTH, Idea)
name: Script the mechanical phase-close sequence
problem it is meant to solve: Phase-close steps are done from memory and can be left out.
how: Script only the mechanical close steps (Plan @ line, OWNER-VIEW page updated, verdict names the commit); a cheap extractor counts omitted steps.
where it stands: Gated trial, not yet tested. Six mechanical close steps are counted after the first three phases [T]. A whole-phase driver was considered and set aside.

### MTH-50 (idea, theme MTH, Idea)
name: Rename VERDICT.reasoning to explanation
problem it is meant to solve: A required 'reasoning' field in the skeptic's verdict can trigger a documented refusal, a billed reply that may not match the schema and costs a verdict.
how: Grep committed transcripts for refusals (costs zero tokens), then rename the verdict field to explanation at the next brief edit.
where it stands: Trial, not applied, not yet tested. The twelve skeptic verdicts [M] all came back, so no refusal is on record. Benefit unproven; cost is one word.

### MTH-51 (idea, theme MTH, Idea)
name: Add description text to output schemas
problem it is meant to solve: Our output schemas carry no description, so P0 to P3 are defined nowhere and word limits live only in script comments the model never sees.
how: Test whether a schema property description reaches the model; if so, define each severity and verdict value once in a shared constant.
where it stands: Trial, not yet tested. Baseline to beat: 8 of 12 skeptic verdicts lowered a severity [M]; 4 of 12 survived [M]. BAML's own rendering evidence was judged not to transfer.

### MTH-52 (idea, theme MTH, Idea)
name: One constants table for verdicts and buckets
problem it is meant to solve: A verdict value could be added to a schema without a matching bucket in the gate script, leaving results unclassified.
how: A single table of about 15 lines [E] generates both the schema enums and the bucket mapping, with citation statuses folded in.
where it stands: Trial, unrefuted and not yet tested. It would make bucket totality structural: a verdict cannot exist without a bucket.

### MTH-53 (idea, theme MTH, Idea)
name: Fix stale analyst-cap lines in the design
problem it is meant to solve: The design says findings are sliced to 12, but a later section says the script never cuts a P0 or P1, so two readings coexist.
how: Edit two lines of the orchestration design so they match the current version, which never truncates a P0 or P1.
where it stands: Idea, not yet applied. The BAML structural comparison found the two stale lines; the ruling names them for the design's next edit.

### MTH-54 (idea, theme MTH, Idea)
name: Give sweep assessors the design text and rules
problem it is meant to solve: Our assessment stage did not read the design documents, so ideas that were already program law were rated as new and only the refuter caught it.
how: The next sweep's assessment brief carries the output-schema text and the RT-01 to RT-07 rules, so overlap with program law is caught at assessment, not left to the refuter.
where it stands: Idea, not yet tested. Observed cost: 8 of 24 adopt calls were already program law [M]. Fewer repeated assessments are expected, not measured.

### MTH-55 (idea, theme MTH, Idea)
name: Verify facts I state, inline
problem it is meant to solve: A mid-phase correction from me about code or environment can be wrong, and agents may act on it unchecked or silently override it.
how: The orchestrator checks a checkable fact with a grep or command and journals verified or contradicted; contradictions return to me, no research agent.
where it stands: Trial over phases P1 to P3, not yet tested. The test target is that 100% [T] of checkable-fact entries carry a verified or contradicted line.

### MTH-56 (idea, theme MTH, Idea)
name: Invoke the orchestration skill at phase start
problem it is meant to solve: A skill may not load from its description alone, so a phase's instructions might never be read.
how: A zero-cost habit: call the orchestration skill at phase start and prompt the close step explicitly, with no new phase-start or phase-close skills.
where it stands: Trial, not yet tested. It measures whether auto-loading works by checking 3 plain-prompt sessions [T] for a skill call before the first brief or commit.

### MTH-57 (idea, theme MTH, Parked)
name: Thought structures (tree, forest, graph) rejected
problem it is meant to solve: We hoped structured multi-branch reasoning would improve agent output and fixes over a single chain.
how: Branch and merge several reasoning paths in a tree, forest or graph, with a judge or vote, before answering.
where it stands: Parked: outside studies show gains on puzzles with a 2023 model [S], and at equal compute plain sampling matches them [S]. Not built, not tested here.

### MTH-58 (idea, theme MTH, Parked)
name: Scale process weight to task size
problem it is meant to solve: A one-line change should not carry the full research, plan and implement process.
how: A one-line change needs only a prompt, small issues skip research, and the process weight is calibrated by repetition.
where it stands: Parked: the evidence is anecdotal, and the orchestration guide's section 3 already scales work by task size, so nothing new is needed.

### MTH-59 (idea, theme MTH, Parked)
name: Autonomous refactor loop (Ralph) for style rules
problem it is meant to solve: Repetitive refactors cost human time, and we wanted to hand them to a loop.
how: A loop on a cloud VM ran about 6 hours [S] from style rules and produced 20 commits [S].
where it stands: Parked: the outside result was a PR of about 20,000 lines [S] that was never merged and had about 100 conflicts [S] two days later.

### MTH-60 (idea, theme MTH, Parked)
name: Outside observer and ban-expensive-model controls
problem it is meant to solve: We wanted an outside check of worker state, a spend control, and no dependence on one vendor's tooling.
how: One Claude watching another through tmux, per-task requests for the costly model, and borrowing HumanLayer's research-plan-implement skills.
where it stands: Parked: tmux is absent on this PC and phase sessions are not tmux panes; with one developer requester equals approver. Nothing taken as a dependency: pin and copy, never depend.

### MTH-61 (idea, theme MTH, Parked)
name: Brief lint and dry-run flag in scripts
problem it is meant to solve: I want hand-edits to a brief to be safe and reviewable before we spend: no dropped context block, no leaked tier word, no pasted raw schema.
how: A pure in-script check runs before any agent call, and a dry-run flag returns assembled prompts and schemas instead of calling agents.
where it stands: Parked after a refuter pass. The agent call already rejects bad schemas, one concatenation adds the context block, and diffing the saved script gives the text diff. No brief edit has broken anything on record.

### MTH-62 (idea, theme MTH, Parked)
name: Categorical rubric instead of numeric likelihood
problem it is meant to solve: Fields like likelihood for this fleet carry a number the model asserts and that may mean little.
how: Replace model-asserted 0 to 1 likelihood numbers in schemas with a defined enum such as slow, medium or fast.
where it stands: Parked: refuted on committed data. 53 values fell over 17 distinct ones; the top three cover 15 of 53 (28%) [M]. The trial threshold already fails; no script decision reads the number.

### MTH-63 (idea, theme MTH, Parked)
name: Evidence fields before verdict in every contract
problem it is meant to solve: Format-restricted output may lower accuracy if the answer key comes before the reasoning, so we wanted reasoning first.
how: In each return contract, put explanation and evidence properties before verdict and severity, all required.
where it stands: Parked after a refuter pass. Agents already work through a tool loop before one final structured-output call, and a reasoning-style first field is a known refusal trigger. The evidence was 2024 non-reasoning models [S].

### MTH-64 (idea, theme MTH, Parked)
name: Report directive text found in fetched pages
problem it is meant to solve: BAML's docs open with an instruction addressed to an AI reader, which is an instruction inside fetched content; we want that noticed and reported.
how: A research-contract rule and field so a reader reports instructions found inside a source instead of acting on them.
where it stands: Parked after a refuter pass. Subagents already treat tool output as data and handled the notice correctly. We have no injection incident on record.

### MTH-65 (idea, theme MTH, Parked)
name: Prompt optimiser (GEPA) over a test corpus
problem it is meant to solve: We tune our briefs by hand and would like a way to improve them against a score.
how: BAML's beta optimiser rewrites prompt text and type descriptions, scored by the project's tests.
where it stands: Parked as premature: it needs a scored test corpus we lack, an install and API keys. Not tested. Its one useful rule is already kept as infrastructure failures apart from content failures.

