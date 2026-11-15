# Items to classify, file 4: ideas of themes MEM

### MEM-01 (idea, theme MEM, In use)
name: Root orchestrator's lesson memory
problem it is meant to solve: We keep repeating the same failures across sessions unless something carries each lesson forward.
how: The root session writes one lesson file (why, how to apply) after each failure or correction from me; every later root session loads them.
where it stands: In use in the clinic testbed, machine-local: 15 [M] files, 81,266 [M] bytes, one file 50,136 [M] bytes. Bloat audit cost 18 [M] agents, 1.5M [M] tokens; repeat mistakes unmeasured.

### MEM-02 (idea, theme MEM, In use)
name: Memory file as pointer, not state restatement
problem it is meant to solve: The memory file carried a stale next step, so a new session could start from outdated state.
how: Memory holds pointers to where state lives (plan, PR body, repository) and does not restate the state itself.
where it stands: In use: memory was rewritten as pointers in the review pass, which found and corrected one [M] stale next step.

### MEM-03 (idea, theme MEM, In use)
name: Documentation spine and where-state-belongs table
problem it is meant to solve: Every session needs a start-here route and one named owner for each kind of information, so no second status summary appears.
how: A README resume route, a command catalogue, a where-state-belongs table, a slice-to-document map, and an AGENTS.md page with an evidence-status vocabulary.
where it stands: In use in the clinic testbed; routing tables are hand-maintained and drifted. No token saving was measured; the context map still named old id ranges after the plan moved on.

### MEM-04 (idea, theme MEM, In use)
name: Tests that assert documents match the code
problem it is meant to solve: Shared documents drift from the code, and I want a test to catch that rather than a reader finding it late.
how: Tests parse registry, routing and context documents and fail when they differ from the plan or the code.
where it stands: In use in the testbed for registry-like tables only; the agent guide and context map have none. Drift caught was not counted; root-document edits broke three tests at gates [M].

### MEM-05 (idea, theme MEM, In use)
name: Commit raw workflow outputs as evidence with sha256 manifest
problem it is meant to solve: The raw outputs our findings register cites lived only in a temporary scratchpad folder and could vanish.
how: Copy the cited raw outputs into the program evidence folder and record a sha256 manifest, so every register id traces to its raw source.
where it stands: In use: done in the review pass, and the plan’s evidence folder holds the outputs with their manifest. Not otherwise tested.

### MEM-06 (idea, theme MEM, Tested)
name: Short disciplined notes file as context memory
problem it is meant to solve: We want to keep what matters across compaction and restarts without heavy machinery or a restore system.
how: A short notes file, blank at start and under 3 KiB, kept current by the agent; it survives compaction and is read to resume.
where it stands: Tested as the control arm of a small, interrupted clinic study: recall 15 of 15 [M] and task 100 % [M], the same as the adapter and native arms; the adapter used 6.1 % [M] more input.

### MEM-07 (idea, theme MEM, Tested)
name: Real-case walkthroughs through ten design steps
problem it is meant to solve: We wanted to see where the library design breaks on real problems, not only on thought experiments or one simulated pathway.
how: Sonnet agents find real cases in the record; Opus agents walk each through the ten library steps and mark works, strains or breaks.
where it stands: Measured on a chosen sample: 59 cases [M], 590 step judgments [M], 69 limitations found [M]. Most breaks: check 38, use 31, afterlife 29, match 26 [M]. Shows where, never how often.

### MEM-08 (idea, theme MEM, Tested)
name: Fresh-agent cold-resume trial
problem it is meant to solve: We wanted to know whether the repository alone carries enough state for a new session to resume work with no memory of earlier sessions.
how: A fresh Sonnet agent must recover ten [S] frozen facts from the repository alone; misses are classed absent, ambiguous or present-but-missed.
where it stands: Run once (2026-11-13): a fresh Sonnet agent recovered 10 of 10 [M] frozen facts, so no plan edit was needed; it exposed six [M] plan defects; the miss rule was untested.

### MEM-09 (idea, theme MEM, Built)
name: Break-even sweep: how much work must repeat
problem it is meant to solve: We want to know what share of our work needs a usable library entry for the library to pay for itself.
how: With reach and entry quality set high, sweep the share of work that could hold an entry; find where library cost crosses the ladder's.
where it stands: From guessed inputs [G]: cost crosses at about half the work (middle running cost) or a fifth (low running cost) [G]; the middle guess is a quarter [G]. Not on the page.

### MEM-10 (idea, theme MEM, Built)
name: Exact-text recall with stable path:line references
problem it is meant to solve: After a reset an agent re-reads or re-derives what earlier sessions already said, and we cannot easily check what a session really said.
how: ctx.py scans transcripts, subagent transcripts and the archive for terms with no model calls; 'show' reopens the exact record by reference.
where it stands: Built in the testbed: scans 211 [M] transcripts / 115 MB [M] in 1 s [M]. Token saving not yet measured; in the 2026-10-14 screen no arm used journal recall [M].

### MEM-11 (idea, theme MEM, Built)
name: Planted-fact A/B harness for memory mechanisms
problem it is meant to solve: We judged memory and handoff mechanisms by feel; I want a repeatable test that does not use a model as the judge.
how: A fictional project script plants facts, corrections and rejected approaches; four arms run in separate sandboxes; a deterministic scorer, no model as judge.
where it stands: Built in the testbed; dry run only, never against a model: 175 checks in about 65 s [M], failing when faults are injected [M]. Forecast 156M to 512M tokens, three arms [E].

### MEM-12 (idea, theme MEM, Built)
name: Pathway map: graph of states, trees as views
problem it is meant to solve: One walked pathway is not a diversity of cases; I wanted the library's pathways mapped and measured before any fix is chosen.
how: A graph of 40 [M] states and 83 [M] branches; three ways of working run on the same work; trees show every route.
where it stands: Built; numbers reproduce on a fresh check. A model, not a forecast: 51 [M] of 60 [M] drawn unknowns are guesses [G]. Only much-comes-back, high-reach, good-entries beats the ladder.

### MEM-13 (idea, theme MEM, Built)
name: Ensemble of runs with rank-correlation ranking
problem it is meant to solve: Most rates are unknown guesses, so a single answer would mislead; I want the spread and which unknowns matter most.
how: 1000 [S] runs per tie draw each unknown across its range; we report percentiles and each unknown's Spearman rank correlation with each ratio.
where it stands: Built; spread from guessed ranges, not a library measurement. Cost vs ladder at tie 0: 1.04 [G]; cheaper and no more wrong: 0.3% [G] at tie 0, 6.1% [G] at tie 1.

### MEM-14 (idea, theme MEM, Built)
name: Funnel of a hundred pieces of work
problem it is meant to solve: We want to see where the library's benefit is lost between a task arriving and the cheap model giving a right answer.
how: Start with 100 pieces the cheap model gets wrong alone; count how many survive each stage, from entry held to right attempt.
where it stands: Built; bars match design steps by hand. Middle values fall 13.1, 4.8, 2.3, 1.3, 1.1, 0.97, 0.35 [G]; the all-good setting ends at 31.7 [G].

### MEM-15 (idea, theme MEM, Built)
name: Three conditions and eight corners
problem it is meant to solve: We want to know which conditions must hold for the library to beat the ladder of cheap-to-strong models.
how: Group unknowns into comes back, reach and entry quality; set each poor or good across eight corners and an 11-by-11 reach-by-quality square.
where it stands: Built; group placement is a judgment, corners move up to 0.2 [G]. Only the corner where much comes back, reach is high and entries are good beats the ladder: cost 0.82 [G], wrong 0.67 [G] (every library unknown at its good end gives 0.75 [G]). High reach with …

### MEM-16 (idea, theme MEM, Built)
name: Two weights per limitation: alone and last
problem it is meant to solve: A fix tested alone looks like nothing because steps multiply; a limitation's real size shows when it is the last one left.
how: 'Alone' moves only a limitation's unknowns to their good ends; 'last' leaves only it at middle values with all else good.
where it stands: Built; weights are shares of a guessed 30.6% [G] fall and do not add up. Entry quality: alone 6.0%, last 104.1% [G]; step 4: alone 10.9%, last 94.0% [G].

### MEM-17 (idea, theme MEM, Designed)
name: Stampede control by advisory claim
problem it is meant to solve: Two parallel sessions can miss on the same symptom and both pay to solve it; we want to pay once.
how: First claim wins a sequence number in one write; a second session sees the solver and may wait or switch. Nothing blocks.
where it stands: Designed in the knowledge-store design; not yet tested. The solver's record carries the sequence as a fencing token. No renewal or expiry policy until a view shows the problem is real.

### MEM-18 (idea, theme MEM, Designed)
name: Reasoning-cache library for cheaper models
problem it is meant to solve: Most of our tokens run on costly models, and sessions re-solve solved problems. I want equal output from a cheaper model by reusing earlier solutions.
how: Verified solutions sit in a SQLite index over a git journal. A cheap model adapts a match; unsolved problems climb the ladder.
where it stands: Designed, never built; model outputs from guessed inputs: cost 1.03 [G] and wrong rate 1.01 [G] of the ladder's at middle values, 0.75 [G] and 0.67 [G] at all-good.

### MEM-19 (idea, theme MEM, Designed)
name: Lessons become checks
problem it is meant to solve: The same defects keep arriving and notes alone have not stopped them: 38 of 71 [M] practised ideas failed as prose.
how: An entry seen three times becomes a proposed lint, test or gate clause; once it lands, the entry retires and the gate catches it.
where it stands: Designed; modelled as its own pathway: 0.04 [G] more pieces caught per 100 at middle values, 2.8 [G] at all-good. One real check already protects every agent [M].

### MEM-20 (idea, theme MEM, Designed)
name: Misses are written down; lookup keys fixed
problem it is meant to solve: A lookup library that fails silently never improves, and we would not know when it should have answered.
how: If a session solves what the library already held, record the miss and cause, fix the lookup keys; every lookup logs hit or miss.
where it stands: Designed in harness v2; not tested, no hit rate measured. Stop rule carried over: fewer than 3 [S] verified hits in 20 [S] encounters or 8 [S] weeks.

### MEM-21 (idea, theme MEM, Designed)
name: Knowledge store of solved problems (PR #183)
problem it is meant to solve: We re-pay an expensive model each time the same hard defect or build trap returns, because past diagnoses sit in prose nobody can query by symptom.
how: Record symptom, cause, failed attempts, fix, files relied on and a check. A cheap agent finds it, runs the check, reuses the fix.
where it stands: Designed (v1.3.1, PR #183); nothing built. Same-cause repeats: 3 to 5 [M] among 48 [M] fix commits on main. Stop if fewer than 3 [S] verified hits in 20 [S] encounters.

### MEM-22 (idea, theme MEM, Designed)
name: Journal of event files plus SQLite index
problem it is meant to solve: Several sessions, worktrees and hosts must share one store safely, with full history and no lost writes, on Windows with no database server.
how: Immutable sha256-named event files in a private git store are the truth; a disposable per-host SQLite file is rebuilt from them. A publisher writes each event as a new file and never renames over an existing one.
where it stands: Designed, not built. Measured here: renaming over an existing file failed 99-126 [M] times per 8x1,000 events; freshness check 23-35 ms [M] at 5,000 events; 18,300 [M] test writes, no corruption.

### MEM-23 (idea, theme MEM, Designed)
name: Entries with diagnosis path, negative results, do-not-apply
problem it is meant to solve: What failed and why is the costly part to save, and agents retry it; some prescribed fixes are wrong; 'X failed' notes go stale.
how: Each entry holds symptom, cause, ordered diagnosis steps, fix and scoped failed approaches. Do-not-apply entries are found by action words or exact error text.
where it stands: Designed, not built; eight examples rebuilt from git history. Walked savings are guesses: 36 [G] old-job messages the enable-dispatcher entry would flag; 16 [G] broken-main days a stranded-fix scan fits.

### MEM-24 (idea, theme MEM, Designed)
name: Stale by code change, never by age
problem it is meant to solve: A stored fix goes stale when the code it relies on changes. Age is a poor stand-in, and our libraries fill with things no longer true.
how: Each entry lists its dependencies (file hashes, config keys, versions). A change marks it suspect and re-runs its check; if valid, it is re-stamped.
where it stands: Designed in the store design and harness v2; not tested. Whole-file hashes first, symbol-level spans later. The board carried 183 [M] minor findings with no status.

### MEM-25 (idea, theme MEM, Designed)
name: Feedback loop that revises entries
problem it is meant to solve: I want entries to improve with use, without a model rewriting them freely or confirming wrong hits.
how: Applied then resolved confirms an entry; not resolved suppresses it at that footprint and queues an Opus revision. New proposals need independent approval.
where it stands: Designed in section 4.3 of the store design; not built or tested. Proposals activate only on a different Opus approver or two independent confirmations.

### MEM-26 (idea, theme MEM, Designed)
name: Seed the store through the write gate
problem it is meant to solve: A new store starts empty, and bulk-copying old prose would import errors, contradictions and untested claims.
how: Seed eight worked examples and four CLAUDE.md traps through the write gate, each approved by another Opus session; later, seed on lookup misses.
where it stands: Designed (phase KS-4), blocked on KS-1 to KS-3 and KS-D1b. The inventory to draw on: about 20 [M] solved entries, 21 [M] traps and 60 [M] negative results, of which the first seed takes eight examples and four traps; 128 [M] open defects stay in the register.

### MEM-27 (idea, theme MEM, Designed)
name: Pull-only lookup, nothing pushed or hooked
problem it is meant to solve: A layer that pushes extra context into every turn showed no measurable gain in the clinic testbed and costs tokens on every call.
how: Agents run the lookup on demand; nothing is pushed or hooked. The recurrence audit and my yes come first, then a pilot (kill criterion).
where it stands: Designed; not tested for the store itself. Clinic synthetic trials showed identical acceptance with and without a context projection [M]; that evidence concerns always-loaded files, not a lookup hook.

### MEM-28 (idea, theme MEM, Designed)
name: Scrub secrets and customer data from the store
problem it is meant to solve: Entries could hold secrets or customer data, everything an agent reads reaches Anthropic, and raw symptom text committed to GitHub would expose it.
how: A scrubber redacts secrets, token patterns, phone and CNIC (Pakistani national identity card) numbers, and refuses the write if scrubbing fails (fails closed). Raw tables stay local; only scrubbed aggregates are committed.
where it stands: Designed for phases KS-0, KS-1, KS-5 and KS-9; not tested. A known-miss fixture will show the name and address limit in every test run. A second gitleaks pass is my call (KS-D5).

### MEM-29 (idea, theme MEM, Designed)
name: Knowledge store copied off the machine to my VPS
problem it is meant to solve: The store sits on one disk, so a lost PC means lost lessons, and no code or defect data may reach a third party.
how: The journal lives in a private repo, pushed over SSH to a bare git repo on my VPS; a code allow-list refuses github.com.
where it stands: Designed; not yet tested. Needs phase P3b (the VPS) first; stage one is a one-way backup. Backup under 4 writers kept integrity [M]; restore-drill digests must match [T].

### MEM-30 (idea, theme MEM, Designed)
name: Store home at profile root, with doctor check
problem it is meant to solve: Windows can give the Claude desktop app’s processes a private copy of an AppData folder, so they and my own shell would silently write to two different stores.
how: The store sits in a profile-root folder outside the repo, OneDrive and AppData; ks doctor refuses other places and dead locks; a never-do list.
where it stands: Designed; to be built in phase KS-1. Stress test: 2 to 4 SQLITE_BUSY (database busy) failures per 1,200 writes at 8+ writers [M]; no corruption in about 18,300 writes [M].

### MEM-31 (idea, theme MEM, Designed)
name: SQLite via node:sqlite as the store engine
problem it is meant to solve: We need a store engine with no install, daemon or telemetry that runs on this Windows PC and a Linux VPS for a few hundred rows.
how: SQLite built into Node 24 (FTS5, JSON, WAL), one file per host outside all worktrees; other engines stay in reserve behind an abstraction layer.
where it stands: Designed; a bounded engine trial was rejected because no two candidates were close. 4 writer processes, 12,000 rows [M], integrity ok; graph-style lineage queries 0.07-95 ms [M].

### MEM-32 (idea, theme MEM, Designed)
name: Diff lookup warnings quoted by the reviewer
problem it is meant to solve: A forbidden change never raises an error, so error-text lookup cannot stop it, and a reviewer saying 'ran the check' could be vacuous.
how: The CLI matches changed-line identifiers against stored do-not-apply entries at key points; the reviewer runs it at the head and answers each warning.
where it stands: Designed; replay on 154 [M] past commits: first rule warned on 48.7% [M], strict handles 27-44% [M], ex4 on 13 commits against 47 for a file join [M].

### MEM-33 (idea, theme MEM, Designed)
name: Write gate against duplicate records
problem it is meant to solve: We want lookups to return the right earlier diagnosis, never a plausible wrong one, so what enters the store must be clean.
how: Before a record is saved, the store checks for duplicates, refuses self-matches and looks for an already-existing entry.
where it stands: Designed in phase KS-2; not yet tested. Sonnet implements and Opus reviews the scrubber as a security boundary.

### MEM-34 (idea, theme MEM, Designed)
name: Declarative gate runner with control pairs
problem it is meant to solve: A stored 'this fix applies' claim can be wrong: a probe may match a moved guard or comment and pass vacuously, and agents copy near matches.
how: Probes over parsed data need a control pair (present on a broken commit, absent on a fixed one), mutants, preconditions and a three-way verdict.
where it stands: Designed for phase 3 of the knowledge-store plan; not built or tested. Refuters rejected the first polarity rule (which way a probe must read on the broken and the fixed commit) on both review lenses [M]. Target: zero acted-on false leads [T].

### MEM-35 (idea, theme MEM, Designed)
name: Write-through record at solve time, Opus-confirmed
problem it is meant to solve: Entries written later from a transcript lose the diagnosis path or fill the store with junk, and a self-confirmed entry could be wrong.
how: The solving session fills a fixed schema before PR-ready, for hard problems only; the PR's Opus reviewer tries to refute it, then approves.
where it stands: Designed; not yet tested. Estimated cost about 10 to 20 minutes of the solving session per record [E]. It is policy plus review, not a technical lock.

### MEM-36 (idea, theme MEM, Designed)
name: Do-not-apply entries with a proposed-change check
problem it is meant to solve: A rule like 'a locked account must refuse even a correct PIN' needs a check that fires before the forbidden change lands.
how: A check run on a proposed change has four outcomes: applies, protection changed, protection disabled, or inconclusive. The prohibition text is never withheld.
where it stands: Designed; not yet tested. 3 of 3 past edits to the protective files were legitimate [M], so stops go to the reviewer, never to an automatic verdict.

### MEM-37 (idea, theme MEM, Designed)
name: Teardown checklist for a stop verdict
problem it is meant to solve: If we stop an experiment, we want nothing left lingering in the repo.
how: One code PR and one docs PR remove the skill, hooks, CI workflow, ignores and tool, revert the CLAUDE.md edit, leave the journal read-only.
where it stands: Designed; not yet tested. It would make the knowledge-store experiment safely reversible.

### MEM-38 (idea, theme MEM, Designed)
name: ks close: anchor, rescan at main, four counts
problem it is meant to solve: A fix can be pushed after its PR merged and stay stranded off main, and entries drift after refactors. One fix sat stranded for 16 days [M].
how: At phase close one command re-points checks to the merged commit, rescans main, labels 'fix not on main' or 'regression', and prints four counts.
where it stands: Designed for phase 3b; not built or tested. Its test must fire at every main tip across the stranded span [T].

### MEM-39 (idea, theme MEM, Designed)
name: Blind pilot against two incumbents, with a stop point
problem it is meant to solve: Nobody has measured whether a lookup beats grep over existing prose in a young repo; we should know after about five build sessions [E], before the rest of the build.
how: A non-seeding session writes 20+ blind queries, 40+ hard negatives; lookups race grep over CLAUDE.md and git log. Verdict: go, go-minimal or stop.
where it stands: Designed; not yet tested. Go needs recall at shown of 60 percent or more [T] and zero acted-on false positives [T]. 0 in 40 probes bounds the rate at 7.5% [S].

### MEM-40 (idea, theme MEM, Designed)
name: Prospective checkpoint on real encounters
problem it is meant to solve: A pilot on replayed history says little about new encounters or how much solve cost the store really avoids.
how: After 20 encounters or 8 weeks, read the logged views: verified hits, acted false positives, escalations without lookup, and lookup cost against solve cost.
where it stands: Designed; not yet tested. Checkpoint at 20 encounters or 8 weeks [S], whichever comes first. It would give the first measurement of the solve cost avoided.

### MEM-41 (idea, theme MEM, Designed)
name: Diff-handle selectivity gate and false-fire ceiling
problem it is meant to solve: Common identifiers would make the warning fire so often that nobody reads it.
how: Author-named handles are replayed over about 150 commits [S] and refused above about 5 percent [S]; go needs warnings on at most 1 in 10 commits [T].
where it stands: Designed; to be built in an early phase. Under the first rule 48.7 percent of commits warned [M]; useState 31 percent, client_id 22 to 28 percent, job 58 to 66 percent [M].

### MEM-42 (idea, theme MEM, Designed)
name: Measure compliance: escalations made without a lookup
problem it is meant to solve: With a pull-only store, 'useless' and 'never consulted' look the same from outside, so we cannot tell which one we have.
how: Closing messages report escalations made without a lookup; ks close checks a diff lookup exists at the final head; reviewers log unwarned forbidden merges.
where it stands: Designed; not yet tested. Self-reported and cross-checked against dispatch records; no hook in the first version.

### MEM-43 (idea, theme MEM, Designed)
name: Break-even model for the knowledge store
problem it is meant to solve: A build of about ten sessions needs a stated condition under which it repays itself.
how: Saving per hard encounter = h·(solve cost S − lookup cost), less miss and build costs. Audit estimates h, pilot measures it, checkpoint measures S.
where it stands: Designed; my parameters until the checkpoint replaces them with measurements. Build cost about ten sessions [E]. The decision rests on h times S, with nothing spent on Docker, sync or wiring first.

### MEM-44 (idea, theme MEM, Designed)
name: Prose contradictions become a corrections docs PR
problem it is meant to solve: Our docs disagree with each other and with git, so a store seeded from them would store errors.
how: Phase KS-4 resolves each contradiction against git and opens one docs PR of corrections, each linking its entry.
where it stands: Designed for phase KS-4; not run. Seven [M] named contradictions are listed. I merge the PR (KS-D12, default merge); it ships even if the store track stops.

### MEM-45 (idea, theme MEM, Designed)
name: Eight handle kinds with canonicalised error templates
problem it is meant to solve: The same root cause appears with different error text, files and words, so one key per entry would miss or mis-merge symptoms.
how: Each entry carries several key types (error template, signature, frames, command, paraphrase, identifiers, doc pointers, actions); a mask pipeline scrubs ids and numbers.
where it stands: Designed in the knowledge-store design; not yet tested. One check: ex6's diff gives 113 tokens [M] firing on 91% of commits [M], so handles are author-named, not derived.

### MEM-46 (idea, theme MEM, Designed)
name: Abstaining retrieval: miss, candidate or lead
problem it is meant to solve: At a few hundred entries a wrong hit acted on is the dangerous failure, and a lookup must never leak customer data into the store.
how: Scrub and canonicalise, exact-handle prefilter, BM25 ranking, then abstain on score-free features; output is miss, candidate or lead inside a 2,000-character [S] cap.
where it stands: Designed; not yet tested. Starting thresholds: lead 0.5, candidate 0.3, margin 0.2 [S]; frozen in KS-4. The customer-name case is a known scrubber miss.

### MEM-47 (idea, theme MEM, Designed)
name: ast-grep syntax-tree reader for code probes
problem it is meant to solve: Whole-file hashes flag too much, and text checks over code are fooled by moved guards, comments and renames. We want checks that read structure.
how: After the pilot, a pinned ast-grep tool anchors checks to code symbols and ignores comments, tested with refactor mutants; unparseable code gives inconclusive.
where it stands: Designed in the knowledge-store design; not yet tested. It fixes one of four ways a code check can be fooled [M, per source]. A 360 Total Security smoke test is pending.

### MEM-48 (idea, theme MEM, Designed)
name: Docker test-id gate and Jest/Vitest phase signal
problem it is meant to solve: Entries whose cause lives in code behaviour need a runnable check, and a setup failure must not look like a failing test.
how: A sandbox with locked dependencies, no network and a per-run database runs named tests; Jest or Vitest hook failures never read as test failures.
where it stands: Designed; not yet tested. Conditional on a pilot go and uses the single Docker gate slot. It would give runnable checks for four examples but largely duplicates CI for several.

### MEM-49 (idea, theme MEM, Designed)
name: Retrieval thresholds frozen before the pilot
problem it is meant to solve: If the pilot can tune its own cut-offs it grades itself, and no literature gives thresholds for this kind of store.
how: A leave-one-handle-out replay over seeded entries and hard negatives freezes lead 0.5, candidate 0.3 and margin 0.2 [S]; the pilot cannot change them.
where it stands: Designed; not yet tested. Values are my inferred parameters, not design facts. Small samples bound only coarsely: 0 failures in 40 means 7.5 percent or less [S].

### MEM-50 (idea, theme MEM, Designed)
name: Decisions, ruled-out and corrections list in PR body
problem it is meant to solve: Decisions made mid-phase live only in chat, and a summary after compaction can lose or distort them.
how: Each draft PR body holds a list of decisions, ruled-out options and my corrections, appended as events happen, so a fresh session can recover them.
where it stands: Adopted by the harness review for the plan's resume section; not yet tested.

### MEM-51 (idea, theme MEM, Designed)
name: One ruling: accept all defaults for my decisions
problem it is meant to solve: Sixteen of the decisions for me were hard to read at a glance, and accepting every default would have started about four Opus-heavy build sessions without my noticing. I want to decide few things, at the right time.
how: 'Accept all defaults' means run the recurrence audit, then stop and ask; KS-D1b is a second yes before any build.
where it stands: Designed in the knowledge-store design: only KS-D1 is needed now. Starred decisions mark the real calls for me, and each phase close updates one OWNER-VIEW line. Not yet tested.

### MEM-52 (idea, theme MEM, Idea)
name: Cross-session and cross-project recall
problem it is meant to solve: New sessions do not remember earlier sessions' mistakes, so the same error is re-hit across many sessions and across projects.
how: The library serves entries across sessions and projects, so a lesson paid for once reaches later windows, including a second project.
where it stands: Idea; no fix agreed. One missing-tool error was re-hit in 54 of 78 [M] sessions across 9 [M] projects; only config-value checks still run in another repo (5 of 50 [M] fixes).

### MEM-53 (idea, theme MEM, Idea)
name: Review findings fed forward by slice type
problem it is meant to solve: Review sends work back often; if findings repeat an earlier class, we pay the same fix round again.
how: Store review findings by slice type and serve them to the builders of the next slice of that type.
where it stands: Idea; not tested. Record: 2.8 [M] review rounds per slice and 64 % [M] sent back.

### MEM-54 (idea, theme MEM, Idea)
name: Plan templates and cross-project design decisions
problem it is meant to solve: We re-derive recurring slice shapes, design 'no' decisions, research claims and stack or machine traps each time they come up.
how: Store plan templates for recurring slice shapes, design decisions with their reasons, research claims, and stack and machine traps.
where it stands: Idea; no fix agreed. Seen working through today's documents, not a library: a design 'no' held five [M] months; a later design reused one that cost about 15M [M] helper tokens.

### MEM-55 (idea, theme MEM, Idea)
name: Similarity-based reuse: a hit is a hypothesis
problem it is meant to solve: Exact repeats are rare, but similar problems across projects and time may be common; we need to know whether a similar-not-same solution fits.
how: Fetch the nearest stored solution, treat it as a hypothesis, adapt it, and let tests decide; entries are verified when written.
where it stands: Idea, untested here; coverage on my work is unmeasured. Outside: 17-45% of fixes follow recurring patterns [S]; 40% of this repo's commits fit six file shapes [E].

### MEM-56 (idea, theme MEM, Idea)
name: Merge partial solutions through a graph
problem it is meant to solve: A new problem may be covered in parts by two stored entries, and returning one best match cannot use both halves.
how: Score how much of a problem each entry covers, then select entries whose parts together cover it; needs a split into parts.
where it stands: Not yet tested. In real walks two checked answers did not make a checked merge (6 cases [M]); merge cards needed four parts (2 cases [M]); the seam needed a new fact.

### MEM-57 (idea, theme MEM, Idea)
name: Oracle-match trial
problem it is meant to solve: We want to learn whether a cheap model given the best earlier solution reaches strong-model quality, before we build the library.
how: On held-out past problems, run Sonnet with and without the best-matching earlier solution and score both by tests.
where it stands: Proposed, not run. It would test the matching and use steps with no build.

### MEM-58 (idea, theme MEM, Idea)
name: Similar-problem coverage labelling
problem it is meant to solve: Nobody has measured how much of our work an earlier session already answered, and that sets the ceiling for any library.
how: Label about 200 [E] recorded exploration runs by whether an earlier session had already answered the same or a similar question.
where it stands: Proposed, not run; needs no build. It decides the ceiling: halving exploration needs about 3 in 4 steps to repeat [E].

### MEM-59 (idea, theme MEM, Idea)
name: Fix withholding and optional journal deny rule
problem it is meant to solve: Cheap agents may apply a stored fix without verifying it first, and we want the check to happen before the fix is used.
how: The CLI withholds a stored fix until the gate passes; the skill bars reading the journal; KS-D20 adds an optional deny rule.
where it stands: Deferred in the knowledge-store design: the journal is plain files, so withholding is a convention, not a lock. KS-D20 defaults to off. Not yet tested.

### MEM-60 (idea, theme MEM, Idea)
name: Thin MCP wrapper over lookup verbs
problem it is meant to solve: Agents might misuse the command-line tool, and we want a safer route if they do.
how: A small stdio MCP server wrapping the lookup and show commands.
where it stands: Deferred in the knowledge-store design (KS-D15): the answer is no for now. Add it only if the lookup log shows misuse. Not yet tested.

### MEM-61 (idea, theme MEM, Idea)
name: guarded_refs advisory (allowed-site lists)
problem it is meant to solve: We can detect a new reference to a guarded identifier, but cannot tell whether an existing check covers it.
how: An optional author-named list of allowed sites per entry; the diff lookup reads it as a hint that never changes a verdict.
where it stands: Deferred, default off; to be built in a later build phase after the pilot, or after that. Not yet tested.

### MEM-62 (idea, theme MEM, Idea)
name: Automatic footprint capture for knowledge-store entries
problem it is meant to solve: Authors may forget to list what an entry depends on, so we want the list captured, not guessed.
how: Three captures: what the agent read (hooks or transcript), what the check executed (coverage), and a fixed environment probe.
where it stands: Deferred. The pilot uses only the fix diff, check inputs, environment probes and transcript reads; coverage capture waits (KS-D5) and needs two small dev dependencies. Not yet tested.

### MEM-63 (idea, theme MEM, Idea)
name: Edit-time warning hook
problem it is meant to solve: We want a forbidden edit to warn at edit time, not only in review.
how: A fail-open hook (one that lets the edit through if the hook itself fails) on Edit and Write diffs the edited path through the same lookup and shows one short warning. It never blocks.
where it stands: Deferred, default off; not yet tested. Its known blind spot is edits made through Bash or PowerShell.

### MEM-64 (idea, theme MEM, Idea)
name: Temporal knowledge graph
problem it is meant to solve: I want recall to say when a fact was true and when it was recorded, so we never return a stale conclusion.
how: Store facts with validity intervals, from one commit until superseded, and record when each was learned; start with a tool-written temporal view.
where it stands: Idea, not tested here: our graph test had one snapshot per commit and no validity intervals. Outside study: context cut from 115k [S] to 1.6k [S] tokens, against full context; benchmark disputed.

### MEM-65 (idea, theme MEM, Idea)
name: SQLite graph library for a self-evolving repository
problem it is meant to solve: I remembered a graph-based library with fast, token-minimal recall that improves itself; we wanted to know where it lives and whether it works.
how: Not built in the clinic lane: no SQLite file, graph or self-modifying part exists; nearest pieces are exact-text recall, agent notes and outside tools.
where it stands: Idea only: no graph or SQLite recall measured, and nothing in the clinic line learns or rewrites itself. The knowledge-store track (PR #183) is where it would come from.

### MEM-66 (idea, theme MEM, Idea)
name: Scheduler-system knowledge graph (Pulse)
problem it is meant to solve: A candidate source of my recollection of a graph-based memory; we wanted to see whether it is the one.
how: A scheduling assistant writes structured JSON episodes into a temporal graph (Graphiti on Neo4j), skipping model extraction at write time.
where it stands: Idea only: a README-level look at a different project of mine; no benchmark found and not tested.

### MEM-67 (idea, theme MEM, Idea)
name: Embeddings behind a measured trigger
problem it is meant to solve: Keyword search misses paraphrases with no shared words; we do not know if vectors would help at this size, and installing them carries risk.
how: None in v1. Only if vocabulary misses reach a stated trigger: add sqlite-vec and a local embedder; dense-only hits stay candidates, never leads.
where it stands: Deferred (KS-D16), not yet tested. Trigger: at least 3 [S] misses on 3+ [S] entries among 10+ [S] lookups, with a 95% lower bound on k/n of 5% [S].

### MEM-68 (idea, theme MEM, Idea)
name: Trained tree ensemble over recorded episodes
problem it is meant to solve: We want predicted routes from our own recorded sessions instead of from guessed rates.
how: Train a tree ensemble on a few hundred labelled episodes from session records to predict which route a task takes through the design.
where it stands: An idea for a later phase; not started. Members must make different mistakes and need a sampled audit for branches they cannot see. The tool-error scan already exists.

### MEM-69 (idea, theme MEM, Parked)
name: Rejected storage engines and memory products
problem it is meant to solve: I asked that we neither re-invent decades-old solutions nor fake a database with Markdown, so engines had to be ruled in or out.
how: Candidates were scored on local-only data, Windows, telemetry off and one-developer cost; Cassandra, ClickHouse, Neo4j, Qdrant, hosted products: rejected or reference only.
where it stands: Rejected as components; Postgres, DuckDB and Dolt stay reserve targets. Cassandra needs an 8 GB [S] RAM floor; the Postgres-container design scored 222 of 360 [M] and is unreachable with Docker off.

### MEM-70 (idea, theme MEM, Parked)
name: Push memory, age expiry and self-rewriting rules
problem it is meant to solve: We want a memory that stays current by itself, without someone tidying it, so sessions start with what is still true.
how: A layer that pushes context into sessions, retires notes by age, matches headings by keyword, and lets rules rewrite themselves.
where it stands: Parked: rejected in the knowledge-store design and listed as not built in harness v2. It was not tested here, so we have no result either way.

### MEM-71 (idea, theme MEM, Parked)
name: Hand-written code lexer for span anchoring
problem it is meant to solve: We wanted code checks that ignore comments and strings and anchor to function spans without installing a heavy parser.
how: A zero-dependency lexer for Python, TS/JS, JSON and YAML, with span anchors, planned to let code checks skip comments and strings.
where it stands: Withdrawn after my critique: nobody had evaluated it and its spec left out JSX. Never built. Replaced by the ast-grep reader.

