# Dossier: block "context" (mechanisms: context_growth)

8 bottlenecks and 30 ideas. Numbers carry tags: [M] measured, [E] estimated, [G] guess, [S] setting or outside figure, [T] target, [I] illustrative.

## Bottlenecks

### B04 · One orchestrator is the serial gate
family orchestrator; state: Open: Harness v2 phase 3; gate workflow not built; package WP3; metrics: throughput, token_count, quality, time (primary throughput)
what: One root session reviews, merges, edits the board and runs checks, so it caps how fast work leaves, and its window keeps overflowing and being summarised.
evidence: Root compacted at 574k, 974k, 967k and 970k tokens [M]; a second count of the same transcripts finds three compactions [M]. Root is 15.3 % of November tokens, about 499k per call [M].
what fixing it unlocks: No compaction across a wave of five gates [T]; the gain is bounded because the root is 15.3 % of tokens [M].
first step: Move review into a gate workflow with a typed verdict naming the head SHA; merge through a locked local queue.

### B16 · Agent reports flow through the orchestrator
family orchestrator; state: Open: Premise corrected; harness v2 phase 3; D13 pending; package WP3; metrics: token_count, token_cost, quality (primary token_count)
what: Subagents' full reports return into the root's context instead of files, so the root fills; the 'subagents cannot write' belief was itself an unchecked report.
evidence: Root runs about 499k tokens of context per call [M]. Subagents made 82.4 % of 4,155 October calls [M]. A probe showed a subagent writes and reads back a file [M].
what fixing it unlocks: Zero refused writes over 20 runs [T]; a smaller root window, and gate decisions that fit in it.
first step: Agents write full reports to an allowed folder and return a path, hash and short summary (about 2,500 characters [S]).

### PR-SUMMARY · Compaction summaries misstate the latest state
family orchestrator; state: Partly closed: Mitigated by PR-body rules; package WP10a; metrics: hallucination, quality (primary hallucination)
what: Both compaction summaries got the very latest state wrong, and one dropped an open loop; the verbatim tail corrected both.
evidence: 2 of 2 summaries wrong on the latest state [M]; one auto compaction at 971,158 tokens, one idle at 580k [M].
what fixing it unlocks: With state kept in the repository, compaction becomes harmless.
first step: Put the plan sha and the decisions list in the PR body.

### R2 · Context growth in long sessions
family tokens; state: Partly closed: one phase per session adopted (HR-C1); trial not run; package WP5; metrics: token_count, token_cost, quality, hallucination (primary token_count)
what: Every call re-reads the whole window and adds to it, so our long-lived slice and orchestrator sessions run at very large windows. This is token lever 1.
evidence: Slice sessions took 66.4 % [M] of cache reads at about 306k [M] per call; 39 % [M] (FixFlow) and 74 % [M] (clinic) sat past 200k; Sonnet reached 963k [M].
what fixing it unlocks: A ceiling near the 367k [M] where Opus already stops, plus one phase per session; capping at 150-200k [T] targets our largest exposure.
first step: Keep one phase per session; run the compaction-window trial on Sonnet slice sessions with a peak-context log.

### TK-REREAD · Every call re-reads the whole window
family tokens; state: Open: measured frame; levers 1-4 act on it; package WP5; metrics: token_count, token_cost (primary token_count)
what: Token use is calls times window size. Nearly every token is a re-read of context already in the window; the model's output is a tiny share.
evidence: Cache reads are 96.8 % [M] of 7.35 B [M] context tokens over 35,834 [M] calls; output is 0.75 % [M]. November testbed alone: 4.25 B [M] cache reads.
what fixing it unlocks: Any cut to the number of calls or the window size cuts tokens in proportion; this frame shows where levers 1 to 4 act.
first step: Cap window size and batch lookups; measure both against this baseline.

### TK-OWNOUTPUT · The model's own output carried forward
family tokens; state: Open: estimated; breakdown measured on two clinic sessions; package WP5; metrics: token_count, token_cost (primary token_count)
what: Thinking, echoed commands and file contents the model writes stay in the window and are re-read every later call. Filtering reads cannot remove them. Token lever 4.
evidence: 26 % [E] of all tokens: 15 % FixFlow, 31 % clinic [E]. One clinic session's growth: thinking 31.5 % [M], Write 13.9 % [M], Edit 7.4 % [M].
what fixing it unlocks: Writing big files through a script and compacting after write-heavy phases target this share directly; the size of the saving is still to measure.
first step: Write big files by script; run the same breakdown on FixFlow orchestrator sessions.

### TK-SUMMARIES · Compaction summaries re-read every call
family tokens; state: Open: measured; no change trialled yet; package WP5; metrics: token_count, token_cost (primary token_count)
what: Each compaction leaves a summary in the window, and every later call re-reads it.
evidence: 8 % [E] of all tokens: 11 % clinic, 2 % FixFlow [E]. Main sessions compacted 48 [M] times in the clinic and 9 [M] in FixFlow up to 12 November; by 14 November the record holds 117 [M] compactions in session windows and 42 [M] in agent windows.
what fixing it unlocks: Shorter or fewer summaries; a compaction adapter used 6-17 % [M] more tokens for the same recall, so plain notes are the bar to beat.
first step: Compact earlier with short summaries; measure the summary share per session after the change.

### TK-FILL · Judgement against window fill is unmeasured
family tokens; state: Open: named on 14 November; where windows compact is counted, the link to errors is not; package WP12; metrics: hallucination, quality, token_count (primary hallucination)
what: We do not know at what fill a session’s judgement starts to fall, for any model. The advice to stay under about 40 % [S] of the window is an outside rule of thumb; on our 1,000,000-token windows [E] it is 400k, above where 130 of 159 [M] recorded compactions already happen.
evidence: The root compacted at 574k, 974k, 967k and 970k tokens [M], and 2 of 2 compaction summaries were wrong on the latest state [M]. By 14 November the record holds 159 [M] compactions: Opus 126 at a median 368k, Fable 5.2 16 at a median 967k, Fable 5.1 11 at a median 690k, Sonnet 6 at a median 804k [M]. 42.6, 22.9 and 17.2 % [M] of session calls ran in a window above 300k, 400k and 500k. No record links an error to how full the window was.
what fixing it unlocks: A split or compaction line set per model from our own record, in place of a borrowed figure.
first step: Log context use at each phase close (TOK-34) and record peak context where a session reversed itself (MSR-43); WP12’s trial logs the fill at every correction.

## Ideas (most mature first)

### TOK-01 · One phase per new session, state in repo
stage: In use; package WP5; metrics: token_count, token_cost, quality (primary token_count); answers: R2, TK-REREAD, W3
problem: Late calls in long sessions re-read everything before them, up to 944k [M] tokens per call, and the main window is our largest token cost.
how: Each phase starts in a fresh session; state lives in the repo and draft PR body; lead sessions compact earlier.
where it stands: In use in part: the ruling is in force and state lives in the repo; the 150-200k [T] cap is not yet applied. Slice sessions hold 66.4% [M] of tokens; saving untested.
next: Pick the cap (150k or 200k), start P0a fresh, then compare the share of calls past 200k.
origin: Harness review; Harness v2 design; Token report

### TOK-02 · Earlier auto-compact window of 400,000 tokens
stage: In use; package WP5; metrics: token_count, token_cost, quality (primary token_count); answers: R2, B3-LOOP, TK-REREAD
problem: Long sessions carry huge contexts: 39.8% [M] of November's cache-read tokens were in calls past 400k, and we want later calls smaller.
how: Set autoCompactWindow to 400,000 [S] so compaction fires near 367k [S]; trial it on one wave of Sonnet slice sessions and check one summary.
where it stands: In use for Opus, whose sessions compact near 367k: 38 of 48 [M] compactions came at 366-387k, all on Opus; by 14 November 84 of the 117 [M] in session windows were Opus, 81 [M] of them at 366-385k. Sonnet ran to 963k [M] and is not set. What a compaction loses is unmeasured.
next: Set the window for one wave of Sonnet slice sessions, confirm it fires near 367k, and check one summary.
origin: Clinic testbed; Bottleneck compile; Harness review

### TOK-03 · Short, capped agent hand-backs
stage: In use; package WP5; metrics: token_count, efficiency (primary token_count); answers: B16, TK-OWNOUTPUT, R2
problem: The main session fills with whole-document reads and long subagent reports, and we believed subagent writes were refused, so reports had to pass through it.
how: Agents return capped text, about 2,500 [S] characters with path:line evidence; noisy output goes to files; drops are logged, never silent.
where it stands: In use in the clinic testbed as a returns-as-text rule; the hygiene rules file is built but not installed. No token figures. Partly replaced by reports on disk.
next: Apply the 2,500 [S] character hand-back rule in FixFlow briefs; check logged drop counts after W1.
origin: Clinic testbed; Orchestration design

### TOK-06 · No PreCompact hook; keep idle compaction on
stage: In use; package WP5; metrics: quality, efficiency (primary quality); answers: TK-SUMMARIES, R2
problem: We had to decide how much compaction machinery to add, if any.
how: Add no PreCompact hook and no context-system install; leave Claude Code's idle compaction (default on, 200k threshold [S]) as it is.
where it stands: In use as a binding ruling: a PreCompact hook can only block a compaction, and custom compaction instructions are not applied to automatic compaction. Idle compaction took 34 ms [M] and dropped one open loop (an unfinished thread of work).
next: Keep using it.
origin: Harness review

### TOK-07 · Lead implements the Opus work itself
stage: In use; package WP10a; metrics: token_count, efficiency, quality (primary token_count); answers: R2, TK-REREAD
problem: A long-lived orchestrator window that only briefs others was the largest measured token cost of the program, and every hand-off loses context.
how: In a lane, the Opus lead implements the Opus-owned work; Sonnet subagents get tests, screens, read models, infra files and runbooks.
where it stands: In use: applied to every lane started 2026-11-13. Its reason is measured (largest token cost [M]); the effect of the change itself is untested.
next: Compare lane token use with the earlier orchestrator-led runs.
origin: Ship plan §7; Token report

### MTH-11 · State in the repository, parents judge by diff
stage: In use; package WP10a; metrics: quality, time, hallucination (primary quality); answers: W3, B13, B03
problem: Work state lived in chat context and was lost on compaction or restart. We want a stopped session resumable, and parents not trusting a child summary.
how: Each node keeps one task record (status, next action, evidence). A parent reads the diff and record; resume from branch plus record.
where it stands: In use in the clinic: 37 [M] task folders; no real dead-session recovery timed, resume tooling only synthetic. FixFlow skips it, since plan, PR body, results file and git already own state.
next: Split current state from archive to avoid the 829-line board read; reconsider the single-owner rule.
origin: Clinic testbed

### TOK-12 · Codex adapter for snapshot and restore
stage: Tested; package WP5; metrics: quality, token_count (primary quality); answers: TK-SUMMARIES, PR-SUMMARY
problem: After the window is summarised, details are lost; we tried heavier machinery on a Codex-based project to see whether it beats native compaction.
how: Hooks save a checksummed snapshot before compaction and restore it after, with a search journal, under byte budgets; failure falls back to native.
where it stands: Tested in the clinic testbed: recall 15 of 15 and task success equal in all arms; tokens +6.1% over a notes file and +17.0% over native [M]. Nothing showed a saving.
next: Use a short notes file; reuse the engineering rules; revisit only if a case shows recall loss.
origin: Clinic testbed

### MEM-06 · Short disciplined notes file as context memory
stage: Tested; package WP6a; metrics: quality, token_count (primary quality); answers: PR-SUMMARY
problem: We want to keep what matters across compaction and restarts without heavy machinery or a restore system.
how: A short notes file, blank at start and under 3 KiB, kept current by the agent; it survives compaction and is read to resume.
where it stands: Tested as the control arm of a small, interrupted clinic study: recall 15 of 15 [M] and task 100 % [M], the same as the adapter and native arms; the adapter used 6.1 % [M] more input.
next: Keep notes short and current; keep task.md as the baseline any new memory mechanism must beat.
origin: Clinic testbed; FixFlow CLAUDE.md and memory index

### MSR-07 · Window-fill analysis: what fills the context
stage: Tested; package WP5; metrics: token_count, efficiency (primary token_count); answers: TK-FETCHED, TK-LOOKUP, TK-OWNOUTPUT, TK-SUMMARIES
problem: Knowing the token total is not enough; we did not know what content fills the windows, so claims about levers were guesses.
how: Classify each context token from growth between calls, weighted by re-reads: fixed start, own output, fetched content, summaries. Also count lookup-only calls.
where it stands: Measured, checked by two refuters: FixFlow fetched content 27-28.5 % [E], 43.6 % [E] re-read by lookup-only calls; testbed own output 53-69 % [M] of growth. Exposures, not savings.
next: Replay recorded windows with an index; rerun the fill after any lever; run the testbed breakdown on FixFlow orchestrator sessions.
origin: Bottleneck compile; Token report; Clinic testbed

### TOK-15 · Read admission: first page plus outline
stage: Built; package WP5; metrics: token_count, efficiency (primary token_count); answers: TK-FETCHED
problem: Reading a whole large file into the window costs tokens that stay there for the rest of the session.
how: A hook rewrites a Read over 30,000 [S] bytes to the first 16 KB [S] plus an outline of up to 60 [S] entries.
where it stands: Built in the clinic testbed and unit-tested only; not installed, so no measured effect. Forensics show most window growth is the model's own output, which this gate does not touch.
next: Trial on the current Claude Code version and measure tokens saved per session.
origin: Clinic testbed

### TOK-16 · Compaction snapshot, restore and recall hooks
stage: Built; package WP5; metrics: quality, token_count, hallucination (primary quality); answers: R2, TK-SUMMARIES, PR-SUMMARY
problem: Long sessions grow past 700k tokens [E], and their summaries can drop decisions; we want 300-400k [T] active tokens to carry an 800k [T] history.
how: Python hooks lower the trigger to 400k [S], snapshot declared task sections before compaction, restore them verbatim after, and offer exact-text recall over transcripts.
where it stands: Built in the clinic testbed, never run live: 85 offline tests [M], 53 defects fixed [M], recall over 115 MB in about 1 s [M]. Restore quality not measured.
next: Keep it in its own repository; reuse its rules for any FixFlow checkpoint. A live A/B is needed first.
origin: Clinic testbed; Harness review

### MTH-19 · Map store with bounded chunk readers
stage: Built; package WP7; metrics: token_count, efficiency (primary token_count); answers: B16, B04, B12, B03
problem: We want relations extracted from a big document set without one agent reading everything or long reports passing through the orchestrator.
how: Chunk by heading (6,000 characters at most [S]); fresh reader per chunk writes a file; script validates; one writer ingests; resume from pending state.
where it stands: Built in the clinic testbed: 51 chunks over 11 files read and ingested [M]; 3,361 records [M]; 11 synthetic tests pass [M]. Tokens, time and build cost were not measured.
next: Reuse the file-handback and single-writer pattern for bulk extraction, for example FixFlow invariants from docs.
origin: Clinic testbed

### PAR-22 · Orchestration as a distributed B+ tree: split, merge on context
stage: Designed · ADDED FROM CHAT: chat of 14 November (session 423aac92, line 6893); package WP12; metrics: hallucination, quality, token_count, efficiency (primary hallucination); answers: B04, R2, PR-SUMMARY, TK-SUMMARIES, TK-FILL
problem: The orchestrator’s window grows until it must compact or clear, and the summary loses state: hallucination, re-read tokens and one overloaded root.
how: Sessions form a distributed B+ tree: inner ones hold routing keys, leaves hold the work. A session passing about 40 % [S] of its window splits; small siblings merge.
where it stands: Rule written and replayed over 97 [M] recorded session windows on 14 November; not tested live. 72, 32 and 26 [M] of them passed lines of 300k, 400k and 500k, holding 65.1, 44.6 and 36.8 % [M] of what sessions re-read. On tokens the record does not settle it against compacting earlier: 1.05–1.06 times on the middle of three sets of assumed costs with the work split evenly, 0.53–1.24 across all nine cases (each set with the work split evenly, unevenly or not at all) [E]. It writes 1.3–1.6 briefs for each summary an earlier compaction would write [E]. Hand-over quality is untested.
next: I said yes to one trial wave at 300k. First D07, then a reader’s check of the latest state on our recorded summaries.
origin: My idea, from database and distributed-systems study

### TOK-19 · Reports on disk: path, hash and short summary
stage: Designed; package WP5; metrics: token_count, token_cost, efficiency (primary token_count); answers: B16, TK-OWNOUTPUT, R2
problem: Long subagent reports pass through the orchestrator's context, which averaged about 499k [M] per call; we want that window smaller.
how: After a 15-minute write probe, agents write full reports to one allowed folder and return a path, hash and short summary.
where it stands: Designed in harness v2 phase 3. A background subagent wrote and read back a file with no prompt [M]. Target: zero refused writes over 20 [T] runs. Not tested at volume.
next: Run the 15-minute write probe in the clinic's default mode; I decide if agents may write to one folder (D13).
origin: Bottleneck compile; Harness v2 design

### TOK-20 · No waiting inside a session
stage: Designed; package WP5; metrics: token_count, token_cost, efficiency, time (primary token_count); answers: R4, B07, B14
problem: A waiting lane keeps its context and burns tokens; recorded waits had a median of 409 s [M] and a longest of 2,030 s [M].
how: Park a waiting slice, and run the check in the background instead of a foreground polling loop.
where it stands: Designed in harness v2 phase 2; not yet tested. A parked lane would burn nothing in the model [I].
next: Build the heartbeat and background checks in phase 2.
origin: Harness v2 design

### TOK-44 · Take finished material out of a live window
stage: Designed · ADDED FROM CHAT: chat of 26 October (session 4647c1c0, line 130); package WP12; metrics: token_count, efficiency, quality (primary token_count); answers: TK-REREAD, TK-FETCHED
problem: Material a session no longer needs stays in its window and is re-read on every call; I asked for it to be pulled out.
how: A live window cannot give material up. Under the split rule (PAR-22) a new session starts from a one-page brief that points at the repository; finished material never enters it.
where it stands: Settled inside the split rule on 14 November: finished material is whatever a new session’s brief does not name. No mechanism of its own; untested. A new session’s first call reads a median 79k [M].
next: In the trial, count what a new session re-reads and what it guesses.
origin: My request in a chat of 26 October

### MEM-50 · Decisions, ruled-out and corrections list in PR body
stage: Designed; package WP10a; metrics: hallucination, quality (primary hallucination); answers: PR-SUMMARY, W3
problem: Decisions made mid-phase live only in chat, and a summary after compaction can lose or distort them.
how: Each draft PR body holds a list of decisions, ruled-out options and my corrections, appended as events happen, so a fresh session can recover them.
where it stands: Adopted by the harness review for the plan's resume section; not yet tested.
next: Start the list on the first phase PR.
origin: Harness review, after the clinic harness

### MTH-30 · Plan sha in PR body, with resume fetch
stage: Designed; package WP10a; metrics: quality, hallucination (primary quality); answers: W3, PR-SUMMARY
problem: A restarted or compacted session does not know which plan version it used, and can miss an amendment because git updates origin/main only on fetch.
how: The PR body starts with the plan commit id. On resume, fetch origin, diff from that id to origin/main and re-read only changed sections.
where it stands: Reviewer ruling adopt; the fetch line is adopted in its narrow one-line form. Not yet tested. Pass test: each recorded sha equals the remote main head at that moment.
next: Add the fetch line to the plan's resume section; use it on the first phase draft PR.
origin: Harness review; Dex Horthy sweep

### TOK-26 · Write big files by script; compact after writing
stage: Idea; package WP5; metrics: token_count, token_cost (primary token_count); answers: TK-OWNOUTPUT
problem: The model's thinking, echoed commands and written files stay in the window and are re-read on every call: 31% [E] of clinic tokens.
how: Write large files through a script instead of inline tool content, and compact after a write-heavy phase so written text stops riding along.
where it stands: Idea from the token report, ranked fourth; untested. Own earlier output is 26% [E] of all context tokens, and 31% [E] in the clinic.
next: Add 'script big files, then compact' to briefs; 31% [E] of clinic tokens is carried own output.
origin: Token report

### TOK-27 · Quiet gate wrapper for web and mobile
stage: Idea; package WP5; metrics: token_count, efficiency (primary token_count); answers: TK-FETCHED, R2
problem: Verbose lint, test and build output floods an agent's window; the backend gate is already quiet but web and mobile are not.
how: Extend the backend wrapper (log to file, one EXIT line, counts) to web and mobile gates if one green run shows output worth cutting.
where it stands: Not yet tried for web and mobile: the backend wrapper is in use, and the extension is a trial planned over the first two code phases. FixFlow only; the clinic check already has a wrapper.
next: Record characters/4 per gate; drop it if a full green run is at or below 3k [T] tokens.
origin: Dex Horthy sweep (backpressure scripts)

### TOK-28 · CLAUDE.md names noisy commands and quiet wrappers
stage: Idea; package WP5; metrics: token_count (primary token_count); answers: TK-FETCHED, W1
problem: Raw noisy commands flood the window, and a bare prohibition gives the agent no alternative.
how: CLAUDE.md lists the noisy raw commands as off-limits and pairs each with its quiet wrapper.
where it stands: Deferred: it sat over the per-group cap, so no refuter verdict; reviewers split between trial and skip, and it would lengthen CLAUDE.md. No measurement defined yet.
next: Run a refuter pass and define a measurement before deciding.
origin: Dex Horthy sweep

### TOK-29 · Model-keyed window for the Fable session
stage: Idea; package WP5; metrics: token_count, quality (primary token_count); answers: R2
problem: My 400,000 [S] window names only the Opus model, so it does not apply to the Fable session.
how: If a phase session passes 500k [S], add autoCompactWindow 500000 [S] for the Fable model beside the Opus entry in user settings.
where it stands: Deferred: not set now; set only if a phase session passes 500k [S]. The setting mismatch is confirmed [M]; the effect of a Fable setting is untested.
next: Watch phase session size.
origin: Harness review ruling

### TOK-30 · Resume-pointer hook after compaction
stage: Idea; package WP5; metrics: quality, efficiency (primary quality); answers: TK-SUMMARIES, PR-SUMMARY
problem: After a mid-phase compaction the session may not know its branch, recent commits or where to resume.
how: A SessionStart hook with matcher compact prints the branch, short sha, resume pointer and last three commits into context.
where it stands: Deferred: not tested. One phase per session makes compaction rare, so the exact settings text is kept for later. Open checks: path expansion on Windows; it also fires after subagent compactions.
next: Install only if a phase session compacts mid-phase.
origin: Harness review

### MTH-48 · Two failed corrections, then a fresh session
stage: Idea; package WP10a; metrics: quality, token_count (primary quality); answers: R2
problem: Repeated corrections pile failed attempts into one session's context, and the box still does not close.
how: After two failed corrections: commit and push, journal the failure, resume in a new session; a failed subagent gets a fresh brief.
where it stands: Trial, not yet tested. It aims to keep long windows short. Applies to the first 10 phase sessions from P0a [T].
next: Log each firing; record whether the fresh session closes the box with zero further corrections.
origin: Dex Horthy sweep; restart rather than correct

### MSR-43 · Record true peak context and reversal positions
stage: Idea; package WP8; metrics: quality, hallucination (primary quality); answers: R2, TK-BLIND
problem: A 40% [S] context rule is untested here, and the on-screen percentage includes the autocompact buffer, so we mislocate decisions made at high context.
how: For 5 [T] phase sessions a Haiku extractor sums input, cache-creation and cache-read tokens per call, records the peak, and logs where reversed decisions sit.
where it stands: Trial from the Dex Horthy sweep; the counting method was corrected in its 2026-11-09 addendum. Not yet tested.
next: Run on the first 5 [T] phase sessions.
origin: Dex Horthy sweep

### TOK-36 · Outside tools that cap tool output
stage: Parked; package WP5; metrics: token_count (primary token_count); answers: TK-FETCHED, TK-REREAD
problem: We want a shipped tool that bounds what tool outputs add to the window, or trims repeated reads.
how: Static review of 19 [M] pinned outside repos: hooks that redirect reads, stub large outputs, rewrite results, or a proxy with a read lifecycle.
where it stands: Parked: none passed as a complete remedy and none installed; no efficacy measured. One maintainer claims about 50% [S] savings, not reproduced. Bypass list and stub-plus-retrieve design kept.
next: Use the bypass list to design a FixFlow output-capping hook; trial Bash output filtering and a Read gate with outline.
origin: Clinic testbed; outside projects (CCH, Headroom, squeez)

### TOK-37 · Project admission contract and ledger
stage: Parked; package WP5; metrics: token_count, quality (primary token_count); answers: R2, TK-FETCHED
problem: Runs refilled the window from about 700k [S] to 800k [S] after a state file and new chat; saved state does not control what tools admit.
how: Split resident input from tool admission; keep a ledger of bytes entering by route; planned test: 3 arms, 3 resumes, 2 repetitions [S].
where it stands: Parked: the clinic research's framing was withdrawn on 2026-10-09 and replaced by the context-system research. The 700k and 800k figures are user-reported; nothing was measured.
next: Reuse the ingress checklist and the resident-versus-admission split for a FixFlow session-size guard.
origin: Clinic testbed

### TOK-38 · Context-size limit, split prompts, trimmed MCP tools
stage: Parked; package WP5; metrics: quality, token_count (primary quality); answers: R2, TK-PREFIX
problem: Models seem to degrade in very long contexts, long prompts skip steps, and MCP tool definitions use context we want for work.
how: Restart at about 100k tokens [S]; split prompts of 50-85 instructions [S]; pick MCP tools per need; repeat key instructions at start and end.
where it stands: Parked: anecdotal. The author withdrew the flat 100k [S] figure in September 2026 and says experts go to 200-400k [S]. One MCP server costs about 5.7k tokens [S].
next: None.
origin: Dex Horthy sweep

### TOK-39 · Compact Instructions section for the summarizer
stage: Parked; package WP5; metrics: hallucination, quality (primary hallucination); answers: TK-SUMMARIES, PR-SUMMARY
problem: Automatic compaction summaries can get the latest state wrong, and we hoped instructions to the summarizer would improve them.
how: Add a Compact Instructions section that tells the automatic summarizer what to keep.
where it stands: Parked: not tested. Native support for such a section is unverified and it adds per-agent overhead, so the harness review ruled to skip it.
next: Revisit only if native support is verified.
origin: Harness review

### TOK-41 · Survey of outside memory and context tools
stage: Parked; package WP6a; metrics: quality, token_count (primary quality); answers: R2, TK-SUMMARIES
problem: We wanted to know whether an existing hook, proxy or memory store could be adopted instead of building one.
how: A source-pinned audit of about 20 outside tools against one need (800k [T] history in a 300-400k [T] window); no installs or trials.
where it stands: Parked: none adopted; local hooks were built instead. Vendor figures only, not reproduced: MemTree 68.7 vs full history 69.3 vs native compact 48.7 [S].
next: Use as design vocabulary; run our own A/B if needed, with Cairn as a comparator for cross-session memory.
origin: Clinic testbed; outside tools surveyed
