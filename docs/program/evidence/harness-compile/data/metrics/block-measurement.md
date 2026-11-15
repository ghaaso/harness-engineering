# Dossier: block "measurement" (mechanisms: measurement)

17 bottlenecks and 71 ideas. Numbers carry tags: [M] measured, [E] estimated, [G] guess, [S] setting or outside figure, [T] target, [I] illustrative.

## Bottlenecks

### MC-HOOKCOST · Hook and proxy overhead is unmeasured
family machine; state: Open: Not measured on FixFlow; package WP1; metrics: time, efficiency (primary time)
what: Added hooks and proxies are new moving parts whose cost has been measured in the clinic testbed but not on FixFlow's setup.
evidence: Clinic testbed: hook launch about 2.1 s native, 243 ms via the Windows wrapper, 4.9 ms in-process [M]. Not yet measured on FixFlow.
what fixing it unlocks: Knowing the cost before adding per-event hooks avoids a hidden tax on every tool call.
first step: Measure hook launch cost on FixFlow's setup before adding any hook.

### PR-SCRIPTTEST · Workflow-script bugs found only by review
family check; state: Open: Contract fixed; stub harness S-3 proposed; package WP3; metrics: quality, token_cost (primary quality)
what: Nothing runs a workflow gate script without a model, so its bookkeeping defects were found by review, not by tests.
evidence: 3 bookkeeping defects found by review [M]: not_started on HALT, a swallowed catch, a cached null re-served.
what fixing it unlocks: A stub harness tests the script body at zero model spend, making resume reliable.
first step: Build the S-3 stub harness (about 40 lines) and confirm it fails on all three defects.

### B21 · Minor findings pile up uncounted
family review; state: Open: Harness v2 phase 3; waits on D12; package WP3; metrics: quality (primary quality)
what: Low-priority P3 findings were carried forward with no status column, so nobody can count how many are still open.
evidence: 111 P3 findings in round one across ten slices [M]; 183 distinct P3 ids on the board with no status [M]. The original list said 'dozens'.
what fixing it unlocks: An open count exists, and every pilot-critical finding has a verdict.
first step: Write one P0-P3 scale and status table, then a script that parses the board's finding tables against it.

### PR-BRIEFTEST · Brief edits cannot be tested cheaply
family review; state: Open: Parked; no brief edit has flipped a verdict; package WP10a; metrics: token_cost, quality (primary token_cost)
what: A brief's inputs are the live repo and the web, so regression-testing a brief edit costs many Opus runs, our scarcest resource.
evidence: 60-180 agent runs per brief edit [E].
what fixing it unlocks: A cheap regression path, so we can edit briefs with confidence.
first step: When an edit flips a recorded verdict, freeze skeptic inputs at a pinned commit.

### PR-OUTSIDEEVIDENCE · Outside harness ideas have weak evidence
family review; state: Partly closed: Ideas narrowed; trials designed; package WP8; metrics: quality, efficiency (primary quality)
what: Most claims in outside harness material are anecdotal or simply asserted, so few ideas can be adopted on evidence alone.
evidence: Of 311 addendum cards: 37 measured, 141 anecdotal, 128 asserted, 5 marketing [M].
what fixing it unlocks: Fair experiments turn outside claims into tested ideas.
first step: Run the narrowed trials.

### PR-HALLU · No hallucination rate is measured
family review; state: Open: named on 14 November; first scripted count the same day, for compaction summaries; package WP8; metrics: hallucination, quality (primary hallucination)
what: We learn of a false statement only when a reviewer, a script or I happen to catch it. No count exists per session, per model or per window fill.
evidence: What we have are catches: 20-plus recorded overstatements, with no denominator [M], and 2 of 2 compaction summaries wrong on the latest state [M]. On 14 November a script rechecked 1,265 [M] pointers (paths, commits, pull requests) in the 61 [M] FixFlow compaction summaries on record: 16 were not borne out, 1.3 % [M], against 2 of 55 and 2 of 112 [M] in two maintained documents.
what fixing it unlocks: A rate we can watch fall as claims move to scripts and windows stay small.
first step: Count the claims a script could recheck in recorded reports, and how many fail (WP8, with WP3’s verdict script). Done for compaction summaries (WP12); the latest state needs a reader’s check.

### PR-AGENTNULL · Agent failures look the same
family orchestrator; state: Open: Open unknown; one probe away; package WP10a; metrics: efficiency, throughput (primary efficiency)
what: agent() returns an object or null with no attempt count, so a schema-exhaustion failure looks the same as a usage-limit null.
evidence: Not sized; one open unknown.
what fixing it unlocks: Tagged results let the circuit breaker count only the nulls that really suggest a limit.
first step: A Haiku, low-effort probe with an impossible schema to see what agent() returns.

### PR-TEMPOUT · Raw workflow outputs lived only in temp
family orchestrator; state: Closed: Evidence folder with sha256 manifest; package WP10a; metrics: quality, hallucination (primary quality)
what: The raw W1/W2 workflow outputs that the register cites lived only in a temporary scratchpad folder.
evidence: All W1/W2 raw outputs were in %TEMP% [M].
what fixing it unlocks: Every register id traceable to a durable, hashed source.
first step: Commit the evidence at each gate with a sha256 manifest.

### TK-BLIND · Small gaps in the token measurement
family tokens; state: Partly closed: caveats kept beside every table; package WP8; metrics: none (primary none)
what: Some calls never reach transcripts, some groups include unrelated sessions, and part of the window content is unclassified, so the token shares carry small gaps.
evidence: About 1 % [E] of calls missing (harness-internal Haiku); about 3 % [E] of the FixFlow group unrelated; 5-8 % [E] of window content unclassified.
what fixing it unlocks: Closing the gaps firms up every share in the token report.
first step: Keep the caveats beside every table; reclassify the unclassified residue, which is mostly reads.

### LIB-UNNAMED · Unknowns no limitation names yet
family library; state: Open: listed; not yet named as limitations; package WP6a; metrics: none (primary none)
what: Some library unknowns carry part of the fall with no named limitation: the ceiling on parts held, whether a lookup finds the same problem, whether promoted checks run.
evidence: These seven unknowns carry the last 37.1 % [G] of the full fall; moving every step in turn reaches 62.9 % [G].
what fixing it unlocks: Naming them completes the map, so the whole 30.6 % [G] full fall is explained.
first step: Add the seven unnamed unknowns to the limitation list for my review.

### LIB-REACHPAY · Little current FixFlow work the library reaches
family library; state: Open: one critic's statement; not refuted; package WP6a; metrics: efficiency, token_cost (primary efficiency)
what: Only a small share of FixFlow's recorded tokens sit in windows that edit code or fail a check; most of the record is programme and harness work.
evidence: 11 % [M] of FixFlow's tokens vs 78 % [M] in the clinic; about 85 % [M] of FixFlow's record is harness or library work. Ten build sessions: 1.5-1.6B [E] tokens.
what fixing it unlocks: Gives the library an honest reach figure to beat; reach on ship-phase build work is still to measure.
first step: Re-measure the code-editing share of tokens on ship-phase sessions.

### LIB-KS-VALUE · Knowledge store value not yet proven
family library; state: Open: pilot planned; audit KS-0 waits on my KS-D1; package WP6b; metrics: efficiency, token_cost (primary efficiency)
what: No source shows hard defects recur here often enough for a symptom store to beat grep; avoided cost has no baseline, and few entries can lead without Docker.
evidence: Recurrence and avoided cost are unmeasured; every past fix was top-tier. Build: about six sessions to go/stop, five after [E]. 3 [M] worked examples can lead without Docker.
what fixing it unlocks: A pilot verdict with a kill criterion decides further investment; break-even is then measured going forward.
first step: I say yes to KS-D1; run the audit, then a blind replay against grep and git log --grep.

### LIB-GRAPH-POWER · Test sets too small for small gains
family retrieval; state: Partly closed: handled in the frozen protocol; limit remains; package WP8; metrics: none (primary none)
what: Our graph test's held-out set can detect only large differences, so 'inconclusive' is a likely and honest result rather than a failure.
evidence: 75 [M] held-out commits; smallest detectable recall difference about 0.09 [E]; detecting 0.05 needs about 110 [E] paired commits.
what fixing it unlocks: A larger or rolling-origin task set would let the test resolve the 0.05 [T] difference we care about.
first step: Rerun rolling-origin over several split dates; report 'inconclusive' as no evidence either way.

### LIB-GRAPH-MOBILE · Graph gain is concentrated in mobile
family retrieval; state: Open: measured 2026-11-13; unexplained; package WP7; metrics: efficiency (primary efficiency)
what: On held-out commits the typed graph's lead over search comes from mobile-app seeds, and every arm lost recall from tuning to held-out.
evidence: Typed minus search on T1: mobile +0.151 [M], backend +0.012 [M], web +0.025 [M]. Mobile seeds rose from 17 % to 36 % [M]; every arm lost 0.06-0.17 [M].
what fixing it unlocks: Knowing why mobile seeds gain shows where a typed graph pays, so we can use it there first.
first step: Split every graph report by seed runtime and study the mobile cases.

### LIB-GRAPH-BASELINE · Folder layout is already a strong baseline
family retrieval; state: Partly closed: floors built into every graph report; package WP7; metrics: efficiency (primary efficiency)
what: In our vertical-slice layout folders already encode much connection information, and co-change history is thin, so any method must beat both simple floors.
evidence: On tuning no arm beat the co-change floor (0.752 [M]) by 0.05; directory floor 0.719 [M]. Held-out: typed beat co-change by +0.063 [M], fragile without five best commits.
what fixing it unlocks: Fusing signals helped a few points (top-10 precision 0.28 vs 0.26 [M]); the floors keep every claim honest.
first step: Always report results beside both floors.

### LIB-GRAPH-TRUTH · Graph-test answer keys can mislead
family retrieval; state: Partly closed: mitigated in the frozen protocol; package WP8; metrics: none (primary none)
what: Using co-change history as the answer key favours arms that use co-change, and many changed files were new in that commit, so no store could return them.
evidence: 33-36 % [M] of changed files were added in the same unit; 15-19 % [M] of the rest lie beyond 5 hops.
what fixing it unlocks: Questions read from the code give an answer key independent of the extractor, so arms are compared fairly.
first step: Score only reachable answers and report the unreachable share for each arm.

### LIB-EVAL · Context aids never tested with an agent
family retrieval; state: Open: held-out scored by script; no agent run; package WP7; metrics: efficiency, time, quality (primary efficiency)
what: No context aid (graph, map or recall journal) has run with an agent in the loop, so we do not know whether an agent finishes faster or with fewer mistakes.
evidence: 0 [M] agent runs; the held-out graph test (2026-11-13) used a fixed search script. A quality comparison was forecast at 156M-512M [E] tokens.
what fixing it unlocks: Answers my real question: whether a graph, map or recall layer saves an agent work.
first step: Agent-in-the-loop pilot on 24-30 fix commits, with a plain-notes control.

## Ideas (most mature first)

### RET-03 · Same-facts cross-check between engines
stage: In use; package WP7; metrics: quality (primary quality); answers: LIB-GRAPH-TRUTH
problem: We want score differences to come from facts, algorithm and output form, never from an engine bug.
how: Given identical facts and algorithm, two engines must return the identical answer; a mismatch is a bug, not a result.
where it stands: In use in the graph test: typed arms identical on 770 of 770 [M] held-out tasks; the two hypothesis differences were exactly 0 [M].
next: Keep using it.
origin: Graph test

### MSR-04 · Pre-registered, sealed held-out test protocol
stage: In use; package WP8; metrics: quality, hallucination (primary quality); answers: LIB-GRAPH-POWER, LIB-GRAPH-TRUTH, LIB-EVAL
problem: We want every test to settle something, so tuning, the held-out set and the scoring rule are fixed first and wording cannot overclaim.
how: Fix the protocol before any arm exists: split commits by date, tune on one part, one main metric, a smallest worthwhile difference, named wording.
where it stands: In use on the graph test: 65 tune and 75 held-out commits [S]; run clean; smallest detectable difference about 0.09 recall [E]; every arm lost 0.05 to 0.17 [M] tune to held-out.
next: Reuse the same rules for the wider test and each new experiment.
origin: Graph test, from my critique

### MSR-05 · Evaluation protocol with Amdahl bound
stage: In use; package WP8; metrics: throughput, efficiency (primary throughput); answers: B01, B04, B12, B14
problem: We had no agreed way to judge whether a workflow change is an improvement.
how: Measure accepted tasks per active human hour; freeze the baseline; change one mechanism at a time; randomise order; keep all attempts; apply Amdahl's bound.
where it stands: In use in the testbed; no 3x or 5x claim is established. 20 % avoidable effort gives at most 1.25x [I]; 8 [M] run records are schema-valid but carry null telemetry.
next: Size the review and orchestrator bottlenecks with the bound before building.
origin: Clinic testbed

### MSR-49 · Seven-metric lens for every bottleneck and idea
stage: In use · ADDED FROM CHAT: chat of 14 November (session 423aac92, line 6893); package WP8; metrics: quality, hallucination, efficiency, throughput (primary quality); answers: PR-HALLU
problem: The first compile sorted bottlenecks by where they showed up in our build, so the PC outranked what limits agentic work itself.
how: Sort each record by the metric it moves most: throughput, efficiency, token count, token cost, time taken, quality of output, hallucinations.
where it stands: In use from this edition: agents sorted all 606 [M] earlier records on 14 November; a blind second reading agreed on the main metric for 80 of 101 [M].
next: Give hallucinations and quality a measured rate (WP8).
origin: My correction of 14 November

### CHK-24 · Queue-wait measurement for the test lock
stage: Tested; package WP2a; metrics: time, efficiency (primary time); answers: B07, B06
problem: We want to know how much of a gate's cost is queueing rather than testing.
how: Collect waits from printed lock-holder messages and check logs across single, paired and gated runs; log each merge's check size and duration.
where it stands: Measured in the testbed: 15 [M] recorded waits, 3 s to 726 s [M]. A check of about 5 minutes [E] cost 10-18 minutes [E] with two to four sessions.
next: Run the gate once per merge, not per slice session; this decides whether it is sharded.
origin: Clinic testbed

### TOK-11 · Compaction audit and count
stage: Tested; package WP5; metrics: quality, token_count, hallucination (primary quality); answers: R2, TK-SUMMARIES
problem: I feared compaction silently loses data and wastes tokens, and we did not know how often the orchestrator window overflowed.
how: An Opus audit of a live transcript measures each compaction; a search for compaction records counts them in the clinic root session.
where it stands: Review session: 971k to 22k in 131 s, 580k to 12k in 34 ms [M]; nothing lost caused rework. Clinic root: 3 compactions at 573,774, 974,246 and 967,210 tokens [M].
next: Re-run if a phase session passes 500k tokens [T]; restore declared task sections or split the board.
origin: Harness review; Clinic testbed count

### MEM-07 · Real-case walkthroughs through ten design steps
stage: Tested; package WP6a; metrics: quality (primary quality); answers: LIB-S7, LIB-S6, LIB-S10, LIB-S4
problem: We wanted to see where the library design breaks on real problems, not only on thought experiments or one simulated pathway.
how: Sonnet agents find real cases in the record; Opus agents walk each through the ten library steps and mark works, strains or breaks.
where it stands: Measured on a chosen sample: 59 cases [M], 590 step judgments [M], 69 limitations found [M]. Most breaks: check 38, use 31, afterlife 29, match 26 [M]. Shows where, never how often.
next: Agree the limitation list, then weigh each against the guessed conditions before any build.
origin: Library review, I asked for diversity of pathways

### MEM-08 · Fresh-agent cold-resume trial
stage: Tested; package WP8; metrics: quality, efficiency (primary quality); answers: W3, W2
problem: We wanted to know whether the repository alone carries enough state for a new session to resume work with no memory of earlier sessions.
how: A fresh Sonnet agent must recover ten [S] frozen facts from the repository alone; misses are classed absent, ambiguous or present-but-missed.
where it stands: Run once (2026-11-13): a fresh Sonnet agent recovered 10 of 10 [M] frozen facts, so no plan edit was needed; it exposed six [M] plan defects; the miss rule was untested.
next: Re-run at later phases; edit the plan only for absent or ambiguous misses; confirm the six plan defects are fixed.
origin: Harness review; Ship plan §7; Dex Horthy sweep

### RET-12 · SQLite as the relational arm
stage: Tested; package WP7; metrics: quality (primary quality); answers: MC-ENGINE
problem: We want the graph engines to face a strong established relational opponent, and a possible plain home for the facts, so the test is fair.
how: SQLite with typed node and edge tables, covering indexes, full-text search, a co-change table and depth-capped recursive queries.
where it stands: Tested on held-out commits: recall 0.700 [M], identical to both graph engines; 0 mismatches on 7,040 [M] random configurations. First test: 0.05 ms [M] per query.
next: Report engine speed, size and effort from the timing run.
origin: Graph test; research round

### RET-13 · LadybugDB embedded graph engine arm
stage: Tested; package WP7; metrics: quality (primary quality); answers: MC-ENGINE
problem: We want to test an established embedded graph engine with native typed paths and ranking, rather than compare graph and relational designs through code we wrote ourselves.
how: The same facts loaded in LadybugDB 0.22.3 (a maintained Kuzu fork), queried with Cypher and its PageRank and Louvain extension, inside a Linux image.
where it stands: Tested: 0 mismatches in 47,244 [M] comparisons against the reference; recall 0.700 [M] on held-out, equal to the relational arm. Native ranking slow, about 0.7 s [M]. About 16 MB [S] install.
next: Report engine speed, size and effort from the timing run.
origin: Graph test; I approved it on 2026-11-12

### RET-14 · DuckDB with DuckPGQ graph layer arm
stage: Tested; package WP7; metrics: quality (primary quality); answers: MC-ENGINE
problem: We want to test a graph query layer on a relational engine, holding the engine fixed and changing only the query layer.
how: DuckDB 2.0.0 with the DuckPGQ extension loaded with the same facts; one edge table per kind, since edge filters are unavailable inside paths.
where it stands: Tested on held-out commits: shown answers identical to the relational arm on 770 of 770 [M] tasks; recall 0.700 [M]. No PageRank or Louvain, so rankings fall back to SQL. About 63 MB [S] install.
next: Report engine speed, size and effort from the timing run.
origin: Graph test; research round critic

### RET-16 · Code-reading question set (50 questions)
stage: Tested; package WP8; metrics: quality, token_count (primary quality); answers: LIB-GRAPH-TRUTH, LIB-EVAL, LIB-GRAPH-POWER
problem: We want to score structured lookups, such as which tables a screen writes, with truth read from the code rather than from the extractor.
how: 50 [S] structured questions answered by one reader with evidence lines and checked blind by a second; 20 for tuning, 30 held out.
where it stands: Tested on 30 held-out questions: typed minus search +0.100 [M], inconclusive. On 23 untouched questions +0.189 [M]. Median typed answer 31 vs 695 [M] tokens search read, not like for like.
next: State both token views and name the typed side's uncounted costs.
origin: Graph test; critic recommendation

### MTH-18 · Compare structures on the problem case, not pieces
stage: Tested; package WP8; metrics: quality (primary quality); answers: PR-DOCDRIFT
problem: Fitting BAML's pieces under our structure could hide where its whole structure serves the work better or worse.
how: Build one deep-dive lane BAML's way, compare both structures on ten dimensions with a second agent, then verify headline claims at source and rule.
where it stands: Done; our structure served the case as well or better on all ten dimensions (judged). It corrected one card, found two stale lines, and showed borrows of 10 to 40 lines [E].
next: Decide whether the five borrows earn a refuter pass; none has had one.
origin: My question during the BAML sweep

### MSR-09 · Replacement graph test with a real engine
stage: Tested; package WP7; metrics: efficiency, token_count (primary efficiency); answers: LIB-EVAL, LIB-GRAPH-BASELINE, LIB-GRAPH-POWER
problem: Our first graph test used the weakest query and no real engine, so it could not tell us whether a repo graph helps.
how: Vary facts, algorithm, output form and engine separately; sealed tasks from 140 commits and 50 questions; hops 1 to 6; search, SQLite, graph arms.
where it stands: Tested on held-out commits, run clean, scripted search arm, no agent run. Typed store was ahead of scripted search by +0.076 recall [M], interval +0.036 to +0.118 [M]: clear of zero, though below the 0.09 [E] the protocol had planned as detectable; SQLite and two graph engines gave identical answers [M].
next: I choose which graph engine to install; then run an agent arm in the pilot.
origin: Graph test; Bottleneck compile

### MSR-10 · Scripted search baseline arm
stage: Tested; package WP7; metrics: efficiency (primary efficiency); answers: LIB-EVAL, LIB-GRAPH-BASELINE
problem: We need to compare every graph against what our sessions do today, which is plain text search.
how: A fixed script does text search for the task's names, paths and route strings, in one and two rounds; not an agent.
where it stands: Tested on held-out commits: recall 0.625 [M] one round, 0.634 [M] two rounds, median 6 to 8 [M] lookups; tune 0.759 [M]. No agent was run.
next: Replace it with an agent using ordinary search tools in the pilot.
origin: Graph test, after the Aider repo map

### MSR-12 · Token tally from session transcripts
stage: Tested; package WP8; metrics: token_count, token_cost (primary token_count); answers: TK-BLIND, TK-LIMITACCT, B3-LOOP, TK-BUDGET
problem: We did not know where our tokens went or why usage limits hit, so any cut would have been a guess.
how: Read-only scripts parse every transcript, count each call once per message id, and total calls, tokens and compactions per group and per slice session.
where it stands: Measured for October and November. November: 4,252.9M [M] cache-read tokens over 184 files; slice sessions 66.4 % [M] by one count; re-measurement agreed within 0.3 % [M].
next: Rerun the October script on November for per-slice figures, and again after any lever to see its effect.
origin: Clinic testbed; Bottleneck compile; Harness v2 design; Token report

### MSR-14 · Throughput record from git history
stage: Tested; package WP8; metrics: throughput (primary throughput); answers: B14
problem: We had no before-and-after baseline of how much work lands per day.
how: Count commits per day on all branches and first-parent merges onto main with light git log commands, and note gap days.
where it stands: Measured in the testbed: 426 [M] commits since 1 Nov, peak 150 [M] on 6 Nov, 36 [M] first-parent merges onto main. Commit counts are not a quality measure.
next: Compute before and after any harness change; pair with per-slice token counts.
origin: Clinic testbed

### MAC-14 · One Linux image for every engine arm
stage: Built; package WP7; metrics: quality (primary quality); answers: MC-ENGINE
problem: A Windows build would have handicapped one graph engine, whose algorithm extension would not load. We want every arm on identical footing.
how: A 1.26 GB [M] Docker image holds both graph engines, their algorithm libraries and the runner, and is rebuilt from a Dockerfile recipe.
where it stands: Built and used in the graph test. PageRank, Louvain, connected components and k-core (see Connected components / k-core) ran natively and PageRank matched DuckDB [M]. Docker had to be restarted twice; the image stayed intact.
next: Keep the recipe with the evidence so the test can be rebuilt.
origin: Graph test (I chose Linux over a handicap)

### MEM-09 · Break-even sweep: how much work must repeat
stage: Built; package WP6a; metrics: token_cost, efficiency (primary token_cost); answers: LIB-COMES
problem: We want to know what share of our work needs a usable library entry for the library to pay for itself.
how: With reach and entry quality set high, sweep the share of work that could hold an entry; find where library cost crosses the ladder's.
where it stands: From guessed inputs [G]: cost crosses at about half the work (middle running cost) or a fifth (low running cost) [G]; the middle guess is a quarter [G]. Not on the page.
next: Decide whether to add a comes-back slider or break-even chart to the library page.
origin: Library review, third build check

### MEM-11 · Planted-fact A/B harness for memory mechanisms
stage: Built; package WP8; metrics: quality, hallucination (primary quality); answers: LIB-EVAL, B12
problem: We judged memory and handoff mechanisms by feel; I want a repeatable test that does not use a model as the judge.
how: A fictional project script plants facts, corrections and rejected approaches; four arms run in separate sandboxes; a deterministic scorer, no model as judge.
where it stands: Built in the testbed; dry run only, never against a model: 175 checks in about 65 s [M], failing when faults are injected [M]. Forecast 156M to 512M tokens, three arms [E].
next: Keep the method; shrink the scale before any live run, since cost is the barrier.
origin: Clinic testbed

### MEM-12 · Pathway map: graph of states, trees as views
stage: Built; package WP8; metrics: token_cost, quality (primary token_cost); answers: LIB-FUNNEL, LIB-S4, LIB-S9, LIB-S2
problem: One walked pathway is not a diversity of cases; I wanted the library's pathways mapped and measured before any fix is chosen.
how: A graph of 40 [M] states and 83 [M] branches; three ways of working run on the same work; trees show every route.
where it stands: Built; numbers reproduce on a fresh check. A model, not a forecast: 51 [M] of 60 [M] drawn unknowns are guesses [G]. Only much-comes-back, high-reach, good-entries beats the ladder.
next: Agree the limitation list with me; optionally add a comes-back break-even slider.
origin: Library review; I proposed trees, ensembles and graphs

### MEM-13 · Ensemble of runs with rank-correlation ranking
stage: Built; package WP8; metrics: token_cost, quality (primary token_cost); answers: -
problem: Most rates are unknown guesses, so a single answer would mislead; I want the spread and which unknowns matter most.
how: 1000 [S] runs per tie draw each unknown across its range; we report percentiles and each unknown's Spearman rank correlation with each ratio.
where it stands: Built; spread from guessed ranges, not a library measurement. Cost vs ladder at tie 0: 1.04 [G]; cheaper and no more wrong: 0.3% [G] at tie 0, 6.1% [G] at tie 1.
next: Keep using it.
origin: Library review; I suggested ensemble models

### MEM-14 · Funnel of a hundred pieces of work
stage: Built; package WP8; metrics: token_cost, quality (primary token_cost); answers: LIB-FUNNEL, LIB-S2, LIB-S4, LIB-S6
problem: We want to see where the library's benefit is lost between a task arriving and the cheap model giving a right answer.
how: Start with 100 pieces the cheap model gets wrong alone; count how many survive each stage, from entry held to right attempt.
where it stands: Built; bars match design steps by hand. Middle values fall 13.1, 4.8, 2.3, 1.3, 1.1, 0.97, 0.35 [G]; the all-good setting ends at 31.7 [G].
next: Keep using it.
origin: Library review (pathway map)

### MEM-15 · Three conditions and eight corners
stage: Built; package WP8; metrics: token_cost, quality (primary token_cost); answers: LIB-COMES, LIB-REACH, LIB-Q
problem: We want to know which conditions must hold for the library to beat the ladder of cheap-to-strong models.
how: Group unknowns into comes back, reach and entry quality; set each poor or good across eight corners and an 11-by-11 reach-by-quality square.
where it stands: Built; group placement is a judgment, corners move up to 0.2 [G]. Only the corner where much comes back, reach is high and entries are good beats the ladder: cost 0.82 [G], wrong 0.67 [G] (every library unknown at its good end gives 0.75 [G]). High reach with poor entries: cost 1.43-1.53 [G].
next: Keep using it.
origin: Library review (pathway map)

### MEM-16 · Two weights per limitation: alone and last
stage: Built; package WP8; metrics: token_cost, quality (primary token_cost); answers: LIB-S4, LIB-S9, LIB-S2, LIB-Q
problem: A fix tested alone looks like nothing because steps multiply; a limitation's real size shows when it is the last one left.
how: 'Alone' moves only a limitation's unknowns to their good ends; 'last' leaves only it at middle values with all else good.
where it stands: Built; weights are shares of a guessed 30.6% [G] fall and do not add up. Entry quality: alone 6.0%, last 104.1% [G]; step 4: alone 10.9%, last 94.0% [G].
next: Keep using it.
origin: Library review (pathway map)

### MSR-15 · System-dynamics model of the harness
stage: Built; package WP8; metrics: throughput, token_count (primary throughput); answers: B3-LOOP, PR-CONFLICTS
problem: Which limit binds first depends on rates, so we want to see how each controller changes the machine before building it.
how: Eleven stocks with flow equations, nine switchable controllers and four limits; assumptions listed. It shows behaviour, not a forecast.
where it stands: Built in the harness v2 page; a refuter checked claims. At October's window of about 2.5 lane-hours [E], tokens are the first limit at any lane count [I].
next: Replace guessed inputs with measured rates.
origin: Harness v2 design

### MSR-16 · Trial harness: transcript accounting and blind scoring
stage: Built; package WP8; metrics: token_count, quality (primary token_count); answers: TK-BLIND, B12
problem: We want per-agent tokens, tool calls and file reads measured after the fact, and runs scored without knowing which arm they came from.
how: Scripts build per-arm workspaces, read agent transcripts for tokens and peak context, check citations, and blind the arm labels before scoring.
where it stands: Built in the testbed; not yet run on trials, only an extraction comparison exists. Its token figures are characters divided by 4 [E].
next: Adapt the measuring script to Claude Code's transcript format; it could give FixFlow sub-agent cost per task.
origin: Clinic testbed

### MAC-25 · Memory table of who holds RAM when short
stage: Designed; package WP2a; metrics: throughput, time (primary throughput); answers: B08, B05, B07, B09
problem: Memory runs short during builds and we do not know who holds it, which limits check slots and rules out a graph server.
how: Run one build day with a per-process-group memory sampler, read who holds memory, then choose: shared test database, WSL2 memory cap, or closing apps.
where it stands: Designed in harness v2 phase 2; waits on the always-on logger. No-build reading: browser 6.1 GB, WSL2 VM 5.2 GB, Claude 3.2 GB [M]. Target: a table when under 2 GB is free [T].
next: Run the always-on logger through one build day, then choose among the three options (D11).
origin: Bottleneck compile; Harness v2 design

### REV-32 · One finding table and counting parser
stage: Designed; package WP3; metrics: quality (primary quality); answers: B21, PR-SEVERITY
problem: Minor findings pile up uncounted: 183 [M] P3 ids carry no status, so we have no open count, and a parser can silently lose rows.
how: Write P0 to P3 and each status once; parser takes allowed values from that table; unmapped status fails; it reports rows kept and dropped.
where it stands: Designed in harness v2 phase 3; a script, no tokens, not built. Target: zero unmapped statuses, every dropped row explained, and an open count over the 183 [M] P3 ids.
next: Draft the one P0 to P3 table (decision D12) and generate the parser from it.
origin: BAML sweep, Bottleneck compile, Harness v2 design

### TOK-24 · Cost envelope by stage
stage: Designed; package WP5; metrics: token_cost, token_count (primary token_cost); answers: TK-BUDGET, PR-VERIFYBUDGET
problem: Running many agents multiplies tokens, so we want an order-of-magnitude spend expectation before we start.
how: A table of agents per stage and tier mix, from sixteen [S] first-wave agents down to none at gates.
where it stands: Designed in the orchestration design: orders of magnitude only, no actual spend recorded. The second-wave analysts are stated to be the main spend.
next: Record actual tokens per stage after the run and compare with the table.
origin: Orchestration design

### MEM-39 · Blind pilot against two incumbents, with a stop point
stage: Designed; package WP6b; metrics: efficiency, token_cost (primary efficiency); answers: LIB-KS-VALUE
problem: Nobody has measured whether a lookup beats grep over existing prose in a young repo; we should know after about five build sessions [E], before the rest of the build.
how: A non-seeding session writes 20+ blind queries, 40+ hard negatives; lookups race grep over CLAUDE.md and git log. Verdict: go, go-minimal or stop.
where it stands: Designed; not yet tested. Go needs recall at shown of 60 percent or more [T] and zero acted-on false positives [T]. 0 in 40 probes bounds the rate at 7.5% [S].
next: Run the git-history audit first (KS-D1); freeze thresholds, then pilot. It decides the build before about ten sessions [E] are spent in all.
origin: Knowledge-store design, judge panel, clinic-project warning

### MEM-40 · Prospective checkpoint on real encounters
stage: Designed; package WP6b; metrics: efficiency, token_cost (primary efficiency); answers: LIB-KS-VALUE, LIB-KS-COST
problem: A pilot on replayed history says little about new encounters or how much solve cost the store really avoids.
how: After 20 encounters or 8 weeks, read the logged views: verified hits, acted false positives, escalations without lookup, and lookup cost against solve cost.
where it stands: Designed; not yet tested. Checkpoint at 20 encounters or 8 weeks [S], whichever comes first. It would give the first measurement of the solve cost avoided.
next: Starts when the first real encounter is logged; I give the verdict and rule on two deferred options (KS-D21, KS-D22).
origin: Knowledge-store design, research lane X-05

### MEM-41 · Diff-handle selectivity gate and false-fire ceiling
stage: Designed; package WP6b; metrics: efficiency, quality (primary efficiency); answers: LIB-KS-DIFF
problem: Common identifiers would make the warning fire so often that nobody reads it.
how: Author-named handles are replayed over about 150 commits [S] and refused above about 5 percent [S]; go needs warnings on at most 1 in 10 commits [T].
where it stands: Designed; to be built in an early phase. Under the first rule 48.7 percent of commits warned [M]; useState 31 percent, client_id 22 to 28 percent, job 58 to 66 percent [M].
next: Print each handle's historic fire count when recording. This keeps a go verdict for the diff warning meaningful.
origin: Knowledge-store design, refuter pass

### MEM-42 · Measure compliance: escalations made without a lookup
stage: Designed; package WP6b; metrics: efficiency (primary efficiency); answers: LIB-S2, W2
problem: With a pull-only store, 'useless' and 'never consulted' look the same from outside, so we cannot tell which one we have.
how: Closing messages report escalations made without a lookup; ks close checks a diff lookup exists at the final head; reviewers log unwarned forbidden merges.
where it stands: Designed; not yet tested. Self-reported and cross-checked against dispatch records; no hook in the first version.
next: Add the evidence line with the plan bullet after a pilot go.
origin: Knowledge-store design, judge panel and critic

### MEM-43 · Break-even model for the knowledge store
stage: Designed; package WP6b; metrics: token_cost, efficiency (primary token_cost); answers: LIB-KS-VALUE
problem: A build of about ten sessions needs a stated condition under which it repays itself.
how: Saving per hard encounter = h·(solve cost S − lookup cost), less miss and build costs. Audit estimates h, pilot measures it, checkpoint measures S.
where it stands: Designed; my parameters until the checkpoint replaces them with measurements. Build cost about ten sessions [E]. The decision rests on h times S, with nothing spent on Docker, sync or wiring first.
next: Fill h at the audit and S at the checkpoint.
origin: Knowledge-store design, research lane X-05

### MEM-49 · Retrieval thresholds frozen before the pilot
stage: Designed; package WP8; metrics: quality (primary quality); answers: LIB-KS-FALSELEAD, LIB-KS-VALUE
problem: If the pilot can tune its own cut-offs it grades itself, and no literature gives thresholds for this kind of store.
how: A leave-one-handle-out replay over seeded entries and hard negatives freezes lead 0.5, candidate 0.3 and margin 0.2 [S]; the pilot cannot change them.
where it stands: Designed; not yet tested. Values are my inferred parameters, not design facts. Small samples bound only coarsely: 0 failures in 40 means 7.5 percent or less [S].
next: Run the replay at the end of seeding; I accept the thresholds (KS-D8). That keeps the pilot a fair test.
origin: Knowledge-store design, completeness critic

### MSR-17 · Replay before live
stage: Designed; package WP3; metrics: quality, throughput (primary quality); answers: B17, B12, L3
problem: A gate or review mechanism could refuse good work or miss defects, so we want proof on the record before it can block us.
how: Accept a mechanism by replaying it on the recorded history where possible, and run it record-only before it may refuse anything.
where it stands: Adopted as a standing rule of harness v2, to apply to mechanisms 1 to 6. No mechanism has yet run live under it.
next: Apply the rule to mechanisms 1 to 6 (decision D15).
origin: Harness v2 design

### MSR-18 · Sealed replay with read log
stage: Designed; package WP3; metrics: quality (primary quality); answers: B01, B12, B17
problem: Replaying an old fix chain to test a review method is unfair if the agent can peek at the later fix, finding tables or board.
how: Replay in a clone with no later refs, answer key hashed first, read log from the transcript, one head commit and brief per arm.
where it stands: Designed in harness v2 phase 3 (mechanism 1), first script at zero tokens; never run. Proof planned: one recorded fix chain, sealed clone against plain worktree.
next: Write the clone-and-read-log script and test it on two [T] runs; makes replay evidence for B01, B12 and B17 fair.
origin: Harness v2 design; Dex Horthy sweep

### MSR-20 · Missed-existing detector with blind re-rule
stage: Designed; package WP6b; metrics: efficiency, quality (primary efficiency); answers: LIB-KS-RECALL, LIB-KS-VALUE
problem: A miss of an entry that existed looks the same as a store nobody consulted, so we cannot measure recall or whether embeddings are needed.
how: At record time the author lists prior lookups; detectors flag matches against the store’s existing entries (its roster); author rules same/related/new; reviewer re-rules blind. Unknown stays NULL, never zero.
where it stands: Designed in the knowledge-store design (build planned in KS-2 and KS-3, read at KS-9); a lower bound by construction. Not yet tested; expected under about 0.2 per 8-week window [E].
next: Build with the write gate (KS-4/5), fixtures in KS-2; counts then give the embedding decision (KS-D16) a real denominator.
origin: Knowledge-store design; my critique

### MSR-22 · Record unknown as unknown, never zero
stage: Designed; package WP8; metrics: hallucination, quality (primary hallucination); answers: PR-FALSEGREEN
problem: If we record missing data as zero, a gap looks like a measured absence and we draw the wrong conclusion.
how: Store an unmeasured value as unknown, and write decisive checks with explicit if-and-raise rather than bare assert.
where it stands: Adopted as a stated lesson from the CureFound research results; it matches the repository rule that an unknown evidence value is not zero. Not separately measured.
next: Apply to every tally and check script.
origin: Library review; CureFound research results

### MSR-23 · Frozen validation contract for any map or store
stage: Designed; package WP8; metrics: quality, efficiency (primary quality); answers: LIB-EVAL, LIB-KS-VALUE
problem: We built maps and stores without testing whether they beat the routed reading we already have, so we want a fair A/B first.
how: Sealed: 5 [S] cases, 3 arms (map, routed reading, Graphify), 2 [S] runs each, blind scoring; better needs a 0.10 [T] gap in 4 of 5 cases.
where it stands: Designed and frozen in the testbed, never run: 30 runs [S], 16,000 tokens [S] per run; the runs folder is empty. Work moved to context-admission research.
next: Run it, or a FixFlow copy, before building any map, store or graph; it gives a reusable A/B template.
origin: Clinic testbed

### MSR-24 · Measured-rates table feeding planner and governor
stage: Designed; package WP8; metrics: throughput, time (primary throughput); answers: B3-LOOP, B07, PR-CONFLICTS
problem: We lay out plans on guessed times and an unknown token budget per five-hour window, so we cannot tell which limit comes first.
how: The check, merge queue and transcript tally write measured rates (check time, waits, tokens per lane-hour, rounds per slice); every wave updates them.
where it stands: Designed in harness v2; not yet tested. First rates are the check timings 367 s and 230 s [M]; the planner and governor depend on it.
next: Take phase 2 container gate timings, then the phase 5 per-slice baseline.
origin: Harness v2 design

### MSR-25 · Pre-registered evaluation plan with gates and staged budgets
stage: Designed; package WP8; metrics: quality, hallucination (primary quality); answers: LIB-EVAL, B12
problem: We want to stop a harness declaring its own win, so gates and budgets are settled before anything runs.
how: Four arms, gates written in advance, staged budgets with caps, inconclusive at budget exhaustion, and all overhead charged to the treatment.
where it stands: Designed in the testbed; stage 1 and a screen ran, stages 2 to 4 did not. Input gates -50 % and -25 % not met: adapter +10.31 % [M], +17.02 % [M].
next: Copy the template for the next FixFlow memory or token experiment; it accepts the simpler workflow as a valid result.
origin: Clinic testbed

### MSR-26 · Tool qualification and G0-G8 gates
stage: Designed; package WP8; metrics: hallucination, quality (primary hallucination); answers: PR-FALSEGREEN, B12
problem: Measurement tools can report green or zero when nothing was checked, so we want to catch that before trusting a number.
how: Qualify maintained tools (Promptfoo, Langfuse, Phoenix) before writing a runner; use independent oracles, hold-out inaccessibility and a trap list for green-but-empty results.
where it stands: Designed in the testbed; no tool installed or run. Registers cover 27 methods and 44 tool source groups [M]; four Promptfoo traps were read from source, not reproduced.
next: Audit FixFlow's gates for zero tests, skipped tests and defaulted cost fields.
origin: Clinic testbed

### MSR-27 · Effectiveness review F01-F10
stage: Designed; package WP8; metrics: quality, efficiency (primary quality); answers: B02, B19
problem: A claim of 3x measures productivity, not quality, and we lacked early proof the system runs and restores.
how: Four separate measures (quality, context, productivity, cost), a context freshness test, a frozen baseline, and a throwaway synthetic deployment with backup and restore.
where it stands: Designed in the testbed as proposals only; not yet tested. The illustrative hosting cost stayed under its cap [I].
next: Walk a clean install and restore early.
origin: Clinic testbed

### MSR-28 · Honest cold-resume trial with hashed answer key
stage: Designed; package WP8; metrics: quality, hallucination (primary quality); answers: W3
problem: The one test of whether a fresh session can resume our work could pass just by the agent reading the answer file.
how: Record a hash of the answer file in the PR journal first, commit the file after judging, run on a checkout without it, then check the read log.
where it stands: Adopted for phase 1 (P1), narrowed after refuter review; n=1 [S], one rerun if contaminated. Not yet run. Pass: hash first, zero reads of the key.
next: Apply it in the P1 cold-resume trial; it makes that single resume test trustworthy.
origin: Dex Horthy sweep

### MSR-29 · Symmetric reading rule for single-run gaps
stage: Designed; package WP8; metrics: quality (primary quality); answers: L1
problem: One benchmark run per setting cannot separate an effort effect from noise, so we risk over-reading small gaps.
how: A zero-cost reading rule: a single-run gap of a few strict passes counts as no detectable difference for either effort level; cost and task fit then decide.
where it stands: Adopted for this review's effort decisions only. Source: medium 28 against xhigh 25 of 196 [S] strict passes, one run each, read as no detectable difference.
next: Apply when the effort dispositions are written; pass is zero statements treating a single-run gap as evidence.
origin: Dex Horthy sweep

### MSR-30 · One provenance line in each evidence README
stage: Designed; package WP8; metrics: quality (primary quality); answers: L1
problem: Someone re-running or disputing an evidence folder later cannot tell which model and tool build produced it.
how: Each evidence README gets one line: exact model id, ids the aliases resolved to, tool version and run date.
where it stands: Adopted, narrowed to one line; standing re-runs on every release were dropped. Not yet tested; pass is 2 of 2 [T] next folders carrying the line.
next: Add the line to the next two evidence READMEs.
origin: Dex Horthy sweep

### MAC-30 · Codex session folders and skill sourcing review
stage: Idea; package WP1; metrics: none (primary none); answers: -
problem: We want to know where my Codex sessions leave their work, so none of it is lost.
how: 16 [M] Codex session folders exist; one FixFlow skill sourcing review was run by three subagents.
where it stands: An observation, not yet a built mechanism: the session folders are mostly empty and nothing is measured yet.
next: Read it in full on the FixFlow skills track.
origin: Clinic testbed (my Codex sessions)

### TOK-34 · Log context use at phase close
stage: Idea; package WP5; metrics: quality, token_count (primary quality); answers: TK-BLIND, R2
problem: The 500k [T] context trigger has no sensor, and we do not know whether a fuller orchestrator window degrades its judgements; the advice to keep context under about 40 % of the window is anecdotal.
how: Log tokens, percent and compactions at phase close, checked against one transcript; over 5 phases [T] add peak context and correction positions.
where it stands: Trial; not yet run. A near-free instrument that grounds the context ceiling in data, starting with a usage line (tokens, percent, compactions) on the first 4 [T] phase sessions.
next: Compare the recorded figure with the transcript for one session, then record peak context over 5 phases.
origin: Dex Horthy sweep

### MEM-57 · Oracle-match trial
stage: Idea; package WP6a; metrics: token_cost, quality (primary token_cost); answers: LIB-S4, LIB-S6
problem: We want to learn whether a cheap model given the best earlier solution reaches strong-model quality, before we build the library.
how: On held-out past problems, run Sonnet with and without the best-matching earlier solution and score both by tests.
where it stands: Proposed, not run. It would test the matching and use steps with no build.
next: Pick held-out past problems and best matches, then score by tests. It could settle whether to build the library.
origin: Library review

### MEM-58 · Similar-problem coverage labelling
stage: Idea; package WP6a; metrics: efficiency, token_cost (primary efficiency); answers: LIB-COMES
problem: Nobody has measured how much of our work an earlier session already answered, and that sets the ceiling for any library.
how: Label about 200 [E] recorded exploration runs by whether an earlier session had already answered the same or a similar question.
where it stands: Proposed, not run; needs no build. It decides the ceiling: halving exploration needs about 3 in 4 steps to repeat [E].
next: Label the runs. The result tells us whether a library can pay at all.
origin: Library review, refuters' cheapest decisive test

### MEM-68 · Trained tree ensemble over recorded episodes
stage: Idea; package WP8; metrics: token_cost, efficiency (primary token_cost); answers: -
problem: We want predicted routes from our own recorded sessions instead of from guessed rates.
how: Train a tree ensemble on a few hundred labelled episodes from session records to predict which route a task takes through the design.
where it stands: An idea for a later phase; not started. Members must make different mistakes and need a sampled audit for branches they cannot see. The tool-error scan already exists.
next: Label a few hundred episodes, then decide whether to build it.
origin: Library review, my ensemble idea

### RET-26 · Embedding-search arm (vector index)
stage: Idea; package WP7; metrics: quality (primary quality); answers: LIB-EVAL, LIB-KS-RECALL
problem: We want the strongest non-graph baseline from the literature in the test, so graph gains are not credited to the index.
how: A vector index over code and docs, queried by similarity; needs a model download.
where it stands: Deferred: not in the frozen protocol and not tested. It needs a model download, which is my decision to approve.
next: Add to the wider test if I approve the download.
origin: Graph test, after outside literature

### RET-28 · Agent-in-the-loop pilot
stage: Idea; package WP7; metrics: token_count, efficiency, quality (primary token_count); answers: LIB-EVAL
problem: I want to know whether a graph or knowledge layer lets an agent finish with fewer tokens, calls and mistakes than ordinary search.
how: Replay 24 to 30 [E] fix commits with one fixed agent: grep alone, plus SQL, a graph tool or BM25; record tokens, calls, success.
where it stands: Deferred, not run; it needs model tokens and many agents. One outside study cut tokens 17 to 39 % [S] on two benchmarks and raised them on a third.
next: I decide on the pilot and its token budget; start with the wider-test protocol.
origin: Graph test; critic recommendation; me

### RET-29 · Wider graph test protocol
stage: Idea; package WP8; metrics: quality, token_count (primary quality); answers: LIB-EVAL
problem: I want to test the architecture I described, with knowledge layer, time, caching, an agent and Graphify as an arm, not only the scorable part.
how: Five research lanes, an assumptions audit and strongest-architecture design, a refuter, a protocol draft and a design check; no installs.
where it stands: Idea stage: research and protocol draft were in progress when last recorded; nothing tested. The earlier test's narrow scope must be stated up front.
next: Read the draft protocol and decide on Graphify and the agent pilot.
origin: Graph test; my challenge

### SKL-25 · Phase-scoped skill trigger tally
stage: Idea; package WP10b; metrics: efficiency, token_count (primary efficiency); answers: W4
problem: Skills may never load in the phases their descriptions name, and nothing shows it.
how: At each phase close, search transcripts for skill calls and skill-preloading agents; tabulate against the phases each description names.
where it stands: Trial: to run over the first six phase sessions [T]. A cap and pruning were refuted in the sweep. Not yet run.
next: Tally across P0a, P0b, P1, P2a, P2b-1 and P2b-2 against the plan's phase table.
origin: Dex Horthy sweep

### MSR-32 · 'Sessions:' line in the PR journal
stage: Idea; package WP3; metrics: quality (primary quality); answers: W2
problem: Transcripts of resumed or multi-session phases are hard to find when we want to audit them.
how: One plain line listing session ids, copied from the scratchpad path, goes into the existing PR journal.
where it stands: Trial from the Dex Horthy sweep, run alongside the transcript tally; not yet tested. Audit at least 7 days [S] after close.
next: On the first 3 [T] closed PRs, check the transcript is found from the branch alone and every session is listed.
origin: Dex Horthy sweep

### MSR-36 · Send-back repeat share
stage: Idea; package WP6a; metrics: quality, efficiency (primary quality); answers: LIB-S9
problem: We do not know how often a review send-back repeats a finding class we have already seen, so we cannot tell if lessons are being captured.
how: Count the share of review send-backs that repeat a class of finding already found earlier.
where it stands: Proposed in the library review; not run, so no repeat share exists yet.
next: Count repeats across the recorded review rounds.
origin: Library review

### MSR-38 · Transcript tally at phase close
stage: Idea; package WP8; metrics: quality, hallucination (primary quality); answers: W2
problem: Routine steps that leave no git or GitHub trace look the same whether done or skipped, so we cannot check compliance from outside.
how: A read-only Node script scores 8 [T] routine steps from session transcript tool calls and compares them with the closing message.
where it stands: Trial from the Dex Horthy sweep (top trial 2); about 100 lines [E]. Not yet tested. Must run within 7 days [S] of a phase close, before transcripts are pruned.
next: Run after the first three phases within seven days; shows whether an outside compliance check works without hooks.
origin: Dex Horthy sweep

### MSR-39 · Cause tag on journal entries for my corrections
stage: Idea; package WP8; metrics: quality, efficiency (primary quality); answers: W2
problem: When I correct an agent, we cannot tell a harness failure from a plan or product error, so repeats stay invisible.
how: A one-word tag (harness, plan or product) on each journal entry that records one of my corrections; count harness-tagged shapes that repeat.
where it stands: Trial from the Dex Horthy sweep; a weekly trace-mining loop was dropped. Not yet tested. Covers the first 5 [T] executed phases.
next: Tag every correction at each close; it passes if at least one harness shape repeats.
origin: Dex Horthy sweep

### MSR-41 · Re-run CLAUDE.md probes on model change
stage: Idea; package WP8; metrics: quality (primary quality); answers: W1
problem: A new model behind the Sonnet or Opus tier may follow CLAUDE.md rules differently, and nothing would show it.
how: At a recorded model change, run 10 [S] probes with the full CLAUDE.md on a frozen commit, old against new model, 3 [S] fresh sessions each.
where it stands: Trial from the Dex Horthy sweep, narrowed by the refuter; runs only after the first CLAUDE.md probe set has run once. Not yet tested.
next: At the first model change, run the 10 probes with a frozen rubric, old against new.
origin: Dex Horthy sweep

### OWN-17 · My one-off watch of P1
stage: Idea; package WP11; metrics: quality (primary quality); answers: W2, W3
problem: Live watching might catch costly departures earlier than a transcript audit afterward.
how: I watch P1 through its first code commit and log departures without interrupting; a fresh agent then audits the transcript against a fixed list.
where it stands: Trial on P1 only; kept only if it catches something the audit would find late. Not yet tested.
next: Compare departures caught live with those the post-close transcript audit catches.
origin: Dex Horthy sweep

### CHK-41 · Slop and complexity detectors as a gate
stage: Parked; package WP2b; metrics: quality (primary quality); answers: -
problem: We want to stop agent code getting messier over time, with some gate that scores it.
how: Run slop-rule or complexity and duplication scripts as a gate on agent code.
where it stands: Parked: such detectors flag most code (77.75% to 94.25% [S] of lines across models) and can be gamed, so they give no clear bad-code verdict.
next: Return only if I propose a slop gate.
origin: Dex Horthy sweep, after SlopCodeBench

### REV-57 · Agents audit run transcripts for wasted calls
stage: Parked; package WP3; metrics: efficiency, token_cost (primary efficiency); answers: W2
problem: We wondered whether briefs waste calls or ignore their own rules without anyone seeing it.
how: An Opus pass reads the six lane transcripts and lists wasted calls and ignored rules; I or the orchestrator triage.
where it stands: Parked: the refuter found recorded quota failures came from fan-out size and effort, not waste inside agents; fixed overhead dominates. The earlier transcript audit found nothing that caused a mistake.
next: Would return if a transcript audit shows waste that caused a failure.
origin: BAML sweep, after a talk on agent testing

### TOK-43 · Standing per-stage token and cost tracking
stage: Parked; package WP8; metrics: token_cost, token_count, efficiency (primary token_cost); answers: TK-BLIND
problem: We cannot see spend per stage, agent and model, so it is hard to find where tokens are wasted.
how: Attribute tokens and cost per stage, agent and model from recorded counts at pinned rates; use tokens per solve as a codebase-health signal.
where it stands: Parked: the evidence was vendor claims, one anecdote and a hypothesis. It would also reopen the skipped measurement pipeline, and per-agent data already sits in workflow transcripts.
next: None.
origin: Dex Horthy sweep

### MTH-65 · Prompt optimiser (GEPA) over a test corpus
stage: Parked; package WP10a; metrics: quality, efficiency (primary quality); answers: PR-BRIEFTEST
problem: We tune our briefs by hand and would like a way to improve them against a score.
how: BAML's beta optimiser rewrites prompt text and type descriptions, scored by the project's tests.
where it stands: Parked as premature: it needs a scored test corpus we lack, an install and API keys. Not tested. Its one useful rule is already kept as infrastructure failures apart from content failures.
next: Revisit once we hold a scored corpus of brief runs.
origin: BAML sweep, from the DSPy authors' optimiser

### MSR-45 · Measurement ledger and pipeline M00-M06
stage: Parked; package WP8; metrics: efficiency, quality (primary efficiency); answers: TK-BLIND
problem: We had no standing way to measure whether harness changes help; all eight exports had null tokens, effort, cost and resume time.
how: An append-only log with hash manifests and an identity hierarchy, an optional rebuildable SQLite index, and seven build slices.
where it stands: Parked: designed in the testbed, never built. I ruled it low priority and the review rated it skip, because a month of research found no measured gain. Eight [M] exports lack tokens.
next: Log per-session wall time, usage and rework in a small append-only file, with no pipeline.
origin: Clinic testbed; Harness review

### MSR-46 · Judge models by corrections per conversation
stage: Parked; package WP8; metrics: quality (primary quality); answers: L1
problem: One-shot answers are a poor way to judge a model for loop-style work.
how: Judge a model by loop or goal outcomes and the corrections needed per conversation, not one-shot answers.
where it stands: Parked: skipped in the Dex Horthy sweep; my corrections are already journalled and tallied elsewhere, and land on the orchestrator, not a routing tier. Source's five-to-two figure is illustrative [I].
next: None.
origin: Dex Horthy sweep

### MSR-47 · Standing regression re-runs for briefs and models
stage: Parked; package WP8; metrics: quality (primary quality); answers: PR-BRIEFTEST, L1
problem: Editing an agent brief or changing a model could silently change results, with no test to show it.
how: Run 10-30 [S] past inputs on old and new brief 3 times each, score with deterministic checks, review only disagreements; re-run on each model release.
where it stands: Parked: not now. Inputs are live repo and web, not fixed cases; cost about 60-180 [E] agent runs per brief edit; a standing re-run would rebuild the measurement pipeline we set aside.
next: Reopen only after a recorded brief edit flipped a verdict; none is on record. Useful parts live in the effort trial.
origin: BAML sweep; Dex Horthy sweep

### MSR-48 · Schema-retry count as a brief-quality signal
stage: Parked; package WP10a; metrics: quality (primary quality); answers: PR-BRIEFTEST
problem: A brief that makes agents fail the output schema often may be defective, but our scripts cannot see retry counts.
how: Log structured-output rejection counts per brief over 3 [S] runs; flag any brief above a 10% [G] retry rate.
where it stands: Parked: refuted in the BAML sweep because the program has never recorded a schema rejection; its failures are usage and session limits. The 10% [G] threshold is not yet calibrated. Not tested.
next: None.
origin: BAML sweep
