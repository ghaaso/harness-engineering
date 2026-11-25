# Harness engineering: what we built and what it gained

Written 2026-11-20 for the owner. Every figure carries a mark: **measured** (a log, a run or a count shows it), **computed** (arithmetic from measured figures, shown), **estimate** (a judgement, shown, not run) or **designed** (written down, not built or not run). Things that cost more than planned or gained nothing are listed with their figures. Sources are at the end.

## Summary

- **Time.** The suite that checks every change: 596 s down to 120 s, five times faster (measured). Several writers on one set of files: 7 builders at once instead of 3 (measured).
- **Throughput.** Over the build, 1.8 helpers ran at a time, so the clock time was about 1.8 times shorter than one at a time (computed). The model check ran 1.8 times faster the same way (computed).
- **Quality.** Blind reviews found 10 breaking faults before merge (6 in the guards, 1 in slice 0, 3 in slice 1). The model check found one more, in a fix already built. Landings run the tests: of 25 tries, 3 were undone by failing tests and 2 stopped at merge conflicts (all measured).
- **Rules.** Four rules that were once only written down are now refused by hooks and a commit check (observed, 23 hook self-tests).
- **Tokens.** We found where they go (97 % of all tokens re-read a window already there) and acted on it. The build still used 2.3 times its planned tokens (908 M against 397 M, measured). That is the largest miss.
- **Planned, not run.** The research run's chosen plan cuts the owner's typing from 75-140 turns to 3 acts and the time from about two weeks to 5-8 hours of machine time (computed).

## Every improvement, by what it improves

| Group | Item | Before | After | Gain | Mark |
|---|---|---|---|---|---|
| Time and throughput | Several writers on one file | 3 units at once | 7 builders at once | 2.3 times as many; about 1 h of the build | width measured, time estimate |
| | Test suite, files side by side | 596 s | 264 s | 2.3 times | measured |
| | Self-test cut into 4 shards | 221 s | 67-70 s | 3.2 times | measured |
| | Suite, both together | 596 s | 120.4 s | 5.0 times | measured |
| | Heavy-command queue, 2 then 4 slots | 177 min waiting in 780 commands | 4 at once at 3.67 of 4 | 92 % of perfect | measured; waiting after not measured |
| | Build helpers side by side | about 990 helper-min in turn | 547 min by the clock | 1.8 times | computed |
| | Model-check runs, 3 at once | 4,989 s of run time | 2,820 s | 1.8 times | computed |
| | Readers side by side | not run in turn | 5 readers, 4 min, 767 K tokens | none to state | measured, no baseline |
| | Testbed's parallel check (earlier project) | 855 s | 284 s | 3.0 times | measured |
| Tokens | Found the sink: the re-read window | unknown | 97 % of tokens are re-reads | a target | measured |
| | Hand-over through files, roots in turn | coordinator ran on to 404-527 K | hand-over at 247-273 K; roots 17 % of tokens | window kept smaller | measured |
| | Models by kind of job | helpers on the dearest model | haiku, sonnet, opus by job | not measured in tokens | rule in force; saving not measured |
| | Router design (a model per operation) | one model per session | 13-49 M of 986 M | 1-5 % | designed, computed range |
| | FixFlow skills switched off | about 8,000 tokens in every session | 0 | about 9 % of a first window | computed from characters |
| | Testing policy | 17 suite runs, 2 h 49 min | 5 runs, 50 min | 3.4 times fewer | designed |
| | Tokens counted per unit and per point | 40 M a point (guess) | 62 M a point | a truer plan | measured |
| Quality, fewer wrong claims | Blind reviews in a fresh context | none | 10 breaking faults caught | 10 faults | measured |
| | Model check of the tree | not run | 1 fault found, fixed | 1 fault | measured |
| | Every landing through the tests | unchecked merge | 25 tries: 20 landed, 3 undone, 2 conflicts held | no merge without its tests | measured |
| | Faults audit | no classes | 56 faults sorted by cause | direction only | measured counts |
| | Library of records and recall tests | notes in chat | 4,131 records; recall tests 8, 5, 4 sure | answers from files | measured |
| | Figures quoted from the paper | summaries | 43 corrections to the first pass | fewer wrong figures | measured |
| Rules by machine | Tier hook | rule in prose | 17 self-tests; 6 of 6 live steps | refused starts | observed |
| | Record guard, commit check, plan gate, start hook | prose | 202, 19 and 37 tests pass | refused edits | observed |
| Less of the owner | Chosen plan for the research run | 75-140 turns, about two weeks | 3 acts, 5-8 h | big | computed, not run |
| | No design questions to the owner | 29-question sheet | derive, compute, measure | one sheet rejected | ruling, hook-enforced |
| PC | Freezes were blocked starts, not memory | 3-session limit | limit withdrawn | width by the rule | observed |
| Earlier measured work | Graph test | scripted search 0.625 recall | typed store 0.700 | +0.076 | measured; no agent run |
| | Embeddings test | simple ranker | no arm adds | null | measured, one form |
| Research behind the designs | Round 3, decision rule v2 | none | 145 statements: 86 confirmed | designed, untested | designed |

# Group 1. Time and throughput: running work side by side

## Several writers on one file

**The problem.** The owner ruled that "one writer per file" is the coarsest lock there is. We counted what it would allow. The build had 14 units. They share 20 places: 9 separate entries, 7 ordered lists and 4 identical statements. With one writer per file only **3 of the 14 units** could be built at once. With one writer per function or block, 7. Only by statement, and only with the change 0b built first, 8 (measured count from the change list, r57-0128).

**What we did.** Three steps, in this order.

1. Build 0b first, a change the plan puts ahead of the rest.
2. Make one small change, the skeleton. It fixes the interfaces and turns each shared ordered list into empty steps, one per fix.
3. Give each builder its own copy of the repository (a git worktree, about 20 of them). Each fills in only its own steps.

Then one script, `land.mjs`, lands every finished unit in one fixed order. It merges the unit, runs the tests of the files that unit touches, and undoes the merge if they fail.

**Why it works.** Writers never touch the same copy, so they cannot overwrite each other. The skeleton moves the shared places out of the way before work starts, so most units need no change there. What still collides shows at the landing, as a plain merge a test can check, not as a silent overwrite. The classical name is optimistic concurrency: work freely, check at the point of commit.

<div class="fig">
<div class="figrow"><div class="figlabel">Before: one writer per file</div>
<div class="lanes"><div class="lane"><b>File A</b><span class="u">unit 1</span><span class="u">unit 4</span><span class="u">unit 7</span></div>
<div class="lane"><b>File B</b><span class="u">unit 2</span><span class="u">unit 5</span><span class="u">unit 8</span></div>
<div class="lane"><b>File C</b><span class="u">unit 3</span><span class="u">unit 6</span><span class="u">unit 9</span></div></div>
<div class="fignote">3 at a time; the others wait for the file</div></div>
<div class="figrow"><div class="figlabel">After: own copies, landed in order</div>
<div class="lanes wide"><div class="copies"><span class="u c">copy 1</span><span class="u c">copy 2</span><span class="u c">copy 3</span><span class="u c">copy 4</span><span class="u c">copy 5</span><span class="u c">copy 6</span><span class="u c">copy 7</span></div>
<div class="arrow">land.mjs: one order, tests, undo on failure</div>
<div class="shared">shared branch</div></div>
<div class="fignote">7 at a time (measured); conflicts surface at the landing</div></div>
</div>

**The result.** The first batch had 8 fixes and ran **7 builders at once** (8 helpers at peak), measured. In all, 25 landings were tried (`landings.jsonl`, measured):

- 20 landed.
- **2 stopped with a merge conflict**, both in the written specification files. W7 conflicted in `spec/lib.md` with W6's text (two adjacent bullets). CLAIM conflicted in three spec files with REDO's text. Both times the script aborted and changed nothing. A helper merged the branch into the unit and kept both texts whole, and the unit landed again. The W7 merge cost 1.03 M tokens, the CLAIM merge 3.4 M. No code conflicted.
- 3 landings were undone because a test failed (CLAIM, OUT, W1). The CLAIM failure was a real interaction with REDO; a helper fixed it (6.1 M tokens) before the retry.

What it saved, as an estimate with the arithmetic. Helpers ran with 7 to 8 at once for 36 minutes and with 3 to 6 at once for 30 minutes (gate log, measured). The work above three at once is at most 36 x (7.5 - 3) + 30 x (4.5 - 3) = 207 helper-minutes. Done three at a time that is at most 207 / 3 = **69 minutes** more. So one writer per file would have added **at most about 1 hour** to the 6.5 hours of the fixes. The build never ran that way. The gain is small because after the first batch only two units were ready at once.

What is not proven. The method came from the literature and worked once, on one repository. The papers disagree about copies against one writer (59.1 against 53.1 % in one, 63.8 against 66.4 % in another, r57-0415).

## The test suite

**The problem.** One run took 596 s, one test file at a time (measured, r57-0103). Every landing and full check paid it, while the PC was about 3 of 24 threads busy.

**What we did.** Run 8 test files at once; set the queue to 4 slots after 4 files at once each took only 1.06 to 1.15 times their time alone; cut the slowest file, the self-test (31 tests, 221 s alone), into 4 shards by test name and run them together.

**Why it works.** The files use their own temporary folders and share no state; the runs passed with the same counts as before. The longest file had set the floor, about 270 s; cutting it removed the floor.

**The result.** 596 s became 264 s with 8 files at once and **120.4 s** with the shards too (processor 59 % average, 93 % peak, free memory above 11.8 GB, all tests passed). The self-test alone: 221 s to 67-70 s. Two whole suites at once took 334 s each, 1.58 times the throughput of one. One test (status T1) failed once at 4 at once and passed alone twice; listed as flaky. Not measured: above 4 at once, repeat runs.

## The heavy-command queue

**The problem.** Every heavy command goes through one queue script. Its log of 780 commands shows 365 minutes of running and about 177 minutes of waiting. Two ran at once for only 41 of 324 minutes (measured, r57-0127).

**What we did.** Raised the slots from 2 to 4, the script's maximum, after measuring that four runs at once cost each only 6 to 15 % extra.

**Why it works.** A queue is short when its slots match what can run together and the PC has room. Free memory stayed above 13 GB and the processor under 50 % with four files running.

**The result.** Four files at once ran at 3.67 of a perfect 4 (92 %). Whether the waiting fell was not measured after the change.

## Helpers side by side in the build

**The problem.** The build had 14 units and 65 helper runs, builders and reviewers. In turn they would have taken about 16.5 hours.

**What we did.** The root session started each unit as soon as it was ready, in its own copy, and its blind reviewer without waiting for the rest.

**Why it works.** Units that share no place do not wait for each other; the landing script is where they meet.

**The result.** From 16:22 to 01:29 UTC (547 minutes) the gate log shows 1.81 helpers running on average, 8 at most. Minutes by number running: none 42, one 269, two 170, three to six 30, seven or eight 36 (measured). Helper-minutes are 1.81 x 547 = about 990, so in turn about 990 minutes: **1.8 times the clock time** (computed; assumes helpers take as long alone as together). The first batch alone averaged 3.2 at a time.

## Model-check runs in parallel

**The problem.** The model check of slice 2 needed 28 runs and 3 reruns, each up to 1,450 s.

**What we did.** Ran them through the queue, at most three at once.

**Why it works.** Each run is its own process with its own memory; free memory stayed between 12.7 and 14.3 GB and none waited for memory.

**The result.** 4,989 s of run time finished in 47 minutes (2,820 s): **1.77 times** (computed from measured figures, r57-0168).

## Readers side by side

**The problem.** Reading sources one reader after another is slow.

**What we did.** Started several Sonnet readers at once, each on its own source and its own file. Used in the first literature wave and in round 3 (four lanes).

**Why it works.** Readers write different files and need nothing from each other.

**The result.** Five readers used 767 K tokens in 4 minutes, under one point of the week (measured, one trial, r57-0115). There is no one-at-a-time run beside it, so it shows cost, not saving. For the planned research run the analysis computes it: a field's readers 22-37 minutes at once against 48-110 in turn; seven fields at three at once 2.8-6.0 h against 13.7-21.1 h (computed, not run). Splitting the reading over five readers also costs fewer tokens, 13.9 M against 33.2 M for one reader (computed); that comes from the split, not from running at once.

## The testbed's parallel check (earlier project)

**The problem.** The clinic testbed's check ran slowly and one at a time.

**What we did.** Ran the check in parallel; the Linux container run was also timed.

**Why it works.** Same reason as the suite: independent tests share nothing.

**The result.** 855 s to 284 s, 3.0 times (measured, `HARNESS-BOTTLENECKS-2026-11.md`). The Linux container run took 230 s against 367 s on Windows, 1.6 times, but is not the gate. This is another repository; it is evidence, not a tool.

# Group 2. Tokens

## Finding the sink: the re-read window

**The problem.** Nobody knew where tokens go.

**What we did.** Counted every call in 35,834 calls of two other projects, once per message id (`TOKEN-BOTTLENECK-2026-11.md`, t1-0108); an independent re-measurement agreed within 0.3 %.

**Why it works.** Token use is calls times window size. A long window is re-read at every call.

**The result.** 97 % of tokens are re-reads; output is 0.75 %. In FixFlow 47 % was the fixed prefix of many small windows; in the clinic project 74 % sat in one big main window. The guide's answer: small windows, fresh helpers, hand-over. Measured.

## Hand-over through files, three roots in turn

**The problem.** A coordinating session ran on to 404,000 and later 527,000 tokens of context (mistake r57-0604; the figure 800,000 in the record is in no source opened).

**What we did.** One session has one purpose; at its ceiling the work passes to a fresh session through files (r57-0008). The build ran as three roots in turn through `STATE.md`. Helpers are briefed by pointing at files.

**Why it works.** A fresh window is cheap to re-read. Only what the next session needs is written down.

**The result.** Measured hand-over point 247-273 K of context, not the planned 129 K; one root call cost about 0.24 M tokens. The three roots used 154.1 M of the build's 907.7 M, 17 % (r57-0170, r57-0171). Gain against the old way not measured.

## Models by kind of job

**The problem.** Helpers had been put on the most expensive model for reading and write-ups (mistake r57-0603).

**What we did.** Routes from kind of job to model: Haiku locates and extracts, Sonnet reads, collects, runs and builds ordinary code, Opus builds invariant-sensitive code, analyses, refutes and orchestrates. A hook enforces them.

**Why it works.** The smallest model that gives the same output costs fewer fresh tokens; the meter weighs a fresh Sonnet token 0.15-0.5 of an Opus one (range, 132 readings).

**The result.** In force and enforced. The saving was not measured in tokens. In the build 956 M of 997 M tokens were Opus, because the work was invariant-sensitive; a research run's readers are cheaper. The hook cannot see a job named with the wrong kind (r57-0150).

## Router design: a model per operation inside a session

**The problem.** One model serves a whole session, including steps that need less.

**What we did.** `ROUTER.md`: a design that lowers a step's effort first, then moves it to a helper or script on a cheaper model (a session cannot switch its own model). Version 2 follows a blind review of 11 findings.

**Why it works.** The meter counts fresh tokens; a cached re-read costs about 1 % of one.

**The result.** Designed only. Computed range: 13-49 M of 986 M tokens, 0.7-2.7 of 13-17 points on the chosen plan. Worth it but small.

## FixFlow skills switched off

**The problem.** The archived FixFlow skills and agents load their descriptions into every session at the repository root: 32,317 characters, about 8,000 tokens (characters / 4), read again on every call (r57-0155).

**What we did.** Set the 13 skills off and denied the 12 agents in settings (r57-0036, hc1-0105); the files are untouched.

**Why it works.** A smaller fixed prefix is smaller at every call.

**The result.** About 8,000 tokens fewer per call: about 9 % of a main session's first window of 86,000 tokens (computed). Whether the switch-off takes effect in each session was observed, not measured on tokens.

## The testing policy

**The problem.** The owner's ruling: no checking at every step where once at the end costs less (r57-0033).

**What we did.** Builders run only their own tests; the full suite runs only before a unit that depends on landed work, and at the end; a review runs beside the next build; a pass on unchanged files is never rerun (keyed by file hash).

**Why it works.** A late fault costs only the work stacked on it.

**The result.** Designed: 5 suite runs instead of 17, about 50 minutes instead of 2 h 49 min at 596 s (computed, r57-0417). Measured since: builders spent 4 to 10 % of their time in tests, not the 30-40 % assumed; reviews took 23.6 minutes each (r57-0173). With the suite at 120 s the saving shrinks.

## Counting tokens per unit and per meter point

**The problem.** The plan guessed 40 M tokens a point of the weekly meter and 11.7 M a builder unit.

**What we did.** Counted every transcript once per message id (`tokens-self.mjs`, `usage.jsonl`).

**Why it works.** A plan is only as good as its inputs.

**The result.** About 62 M a point (59-66 M); a builder unit 32.3 M median (18.5-38.0); a refuter 10.6 M against 5.4 M planned. The next estimate rests on these (measured; one build, one week).

# Group 3. Quality and wrong claims

## Blind reviews in a fresh context

**The problem.** A builder grades its own work.

**What we did.** Every unit got a reviewer that had not seen the builder's reasoning, with mutations to prove the tests catch faults.

**Why it works.** A fresh reader has no shared blind spot.

**The result.** The review of P0 and the plan gate: 6 breaking findings, fixed with tests that fail on the old code. Slice 0: 1 breaking (the skeleton took a lock step outside the run lock). Slice 1: 11 reviews over 14 units, 3 breaking (W5, W3, S2.1). Each was fixed before merge (measured). A review cost a median 10.6 M tokens. The reviews of the plans found 14 (pilot plan), 14 (complexity analysis), 16 (faults), 14 (unattended) and 11 (router) findings.

## The model check of the tree

**The problem.** A coordination design can fail in ways tests do not reach.

**What we did.** Brought the model to the code as built and ran it once: 28 runs and 3 reruns (r57-0168).

**Why it works.** It explores every ordering of events, not one.

**The result.** One fault: a bare acknowledgement from the coordinator re-armed the age cap, so the owner was never told of a stuck attempt. Fixed in FX-W6 (41 M tokens with its review); the check then holds, and an ablation that keeps the old line fails it. The close group held in all 43 two-fault parts. Not covered: three fixes, more than two faults.

## Every landing through the tests

**The problem.** Merged work can be clean to git and wrong.

**What we did.** The landing script (above) runs the unit's tests on every merge and undoes it on failure.

**Why it works.** The check sits at the one place all units pass.

**The result.** 25 landings: 20 landed, 2 stopped by conflicts, 3 undone by failing tests (measured). The suite then passed: 1,037 pass, 0 fail on the final build.

## The faults audit

**The problem.** Where do our faults come from?

**What we did.** Sorted every fault on record by cause (`FAULTS.md`, reviewed blind: 16 findings).

**Why it works.** A class shows where a rule would pay.

**The result.** At least 56 faults. Our own glue: 23. A borrowed design with a step missed: 16. A borrowed design whose assumption fails for model sessions: 3. No part holds more than 8. A direction, not a gain: it favours using the app's own helpers over our session control.

## The library of records and its recall tests

**The problem.** Sessions forget; chat ideas vanish.

**What we did.** A library of structured records, with a board, a lookup script and guards on its journal. Four recall tests by a session that knew nothing.

**Why it works.** An answer comes from a record with its evidence, not from memory.

**The result.** 4,131 records, every line parsed, no id repeated (r57-0152). Fill 1: 2,524 records; 733 read by hand against their sources, 3 small corrections, 1,791 checked by script only. Recall tests: 8 of 14, 5 of 9, 4 of 10 answered surely, the rest partly or rightly "not recorded"; the fourth, on the new board, had no wrong answer in 14 questions. Fixes followed each.

## Figures quoted from the paper

**The problem.** A fetch tool returns a small model's summary. Figures taken from summaries were wrong (mistake r57-0606).

**What we did.** Read the paper itself: curl with `--ssl-no-revoke`, check the file starts `%PDF-`, `pdftotext` (r57-0110).

**Why it works.** The source is read, not a summary of it.

**The result.** The second pass listed 43 corrections to the first across five files, some only adding detail (the count 38 in the mistake record is in no file opened). Measured counts of corrections, not of hallucinations avoided later.

# Group 4. Rules enforced by the machine

## Tier hook

**The problem.** A written rule about models was not followed (mistake r57-0603).

**What we did.** A hook refuses a helper or session without a kind of job in front, without an explicit model, or on a model its kind does not allow.

**Why it works.** The refusal happens before the start, whatever the session remembers.

**The result.** 17 self-tests pass; a real session gave the expected result on 6 of 6 steps (2 started, 4 refused); about 37 ms a start. It cannot see a wrong kind or the effort level (observed).

## Record guard, commit check, plan gate, start hook

**The problem.** Archived evidence and journal lines were editable; design questions reached the owner.

**What we did.** A record guard refuses edits of archived evidence, non-append writes to the journal and a question not starting `approve:`, `cap:` or `fact:`. A commit check backs it. A plan gate checks a start and a done mark. A start hook puts the board into every session start (about 7,200 characters).

**Why it works.** The machine refuses before the mistake; a review found the first version's holes.

**The result.** Version 2 after six breaking findings: record guard 202 of 202 tests (the old guard fails 50), commit check 19 of 19, plan gate 37 of 37; about 43 ms a shell call. Seen but unprotected: 1,063 of 4,042 tracked evidence files are in no manifest (observed).

# Group 5. Running with less of the owner

## The chosen plan for the research run

**The problem.** The tree as planned needs about 75-140 typed turns over about two weeks.

**What we did.** A complexity analysis (`COMPLEXITY.md`, blind review 14 findings, all accepted) chose path e2: a Fable coordinator starts one Opus helper per field, which runs the field's readers, gate and fresh refuter.

**Why it works.** Each field keeps its own fresh window and nothing waits for a typed turn.

**The result.** Computed, not run: 3 owner acts (the go, the cap, opening the coordinator); 5-8 h of machine time at three fields at once; about 1.0 B tokens (0.80-1.22), 16 points, 1.6 times the direction's 10 %. In tokens it saves only a little.

## Running without his typed "go"

**The problem.** Each session start waited for him.

**What we did.** `UNATTENDED.md`: the app's own means (Auto mode, optional Remote Control, Windows set not to sleep) and the stops that remain.

**Why it works.** A coordinator starts helpers without a go per session.

**The result.** Designed. Three turns, none during the run unless it stops. It drops checks the protocol had (fencing a replaced helper, a restart limit, hang detection). Open: whether a session may start sessions on a continuation (P1).

## No design questions to the owner

**The problem.** A 29-question decision sheet was put to him and rejected (r57-0001).

**What we did.** A mechanism comes from the recorded research, a parameter is computed against the seven measures, a missing fact is measured. The record guard refuses a question without a prefix.

**Why it works.** The owner supplies a go, a cap or a fact, not a design.

**The result.** In force and enforced. The saving in his time is not measured.

# Group 6. The PC

## The freezes were blocked program starts, not memory

**The problem.** The PC froze; memory was blamed, and sessions were limited to three at once.

**What we did.** Read the app's own log and the recorder across 52 unclean restarts (`pc-freezes-2026-11-17/VERDICT.md`). Removed 360 Total Security.

**Why it works.** At all four freezes of 17 November 11.8 to 19.3 GB were free; what failed was starting a program. The antivirus slowed every PowerShell start thirteen-fold (2,070-2,180 ms against 151-160 ms after removal).

**The result.** The limit of three child sessions was withdrawn (r57-0032); the width is computed. The owner reports no freeze since; that the antivirus was the cause is not proven.

# Group 7. Earlier measured work

## The graph test

**The problem.** Would a typed store of code facts help find the other files a change touches?

**What we did.** Three engines and two floors on 75 held-out commits, an 8,000-token answer.

**Why it works.** A typed store knows callers and co-changed files; a text search does not.

**The result.** Typed store 0.700 recall against 0.625 for scripted search, +0.076 [+0.036, +0.118]. The three engines were identical. A community prior added nothing (+0.015). Not tested: whether an agent finishes faster or with fewer mistakes. No agent was run.

## The embeddings test

**The problem.** Would learned embeddings add to a simple ranker?

**What we did.** Four embedding models and a graph encoder fused with it; 50 later tuning commits.

**Why it works.** It does not: the models mostly relearn the co-change facts the ranker already has.

**The result.** Null. Largest gain +0.0023 in the pool against the +0.02 bar. A gain up to about +0.006 is not ruled out. This is one form on one repository, not a verdict on the family.

# Group 8. Research behind the designs

## Round 3 and the decision rule, version 2

**The problem.** Several designs rested on guesses: how many workers a check feeds, how to pace tokens, how to let writers share files.

**What we did.** Four research lanes, each report refuted in a fresh context (r57-0140): 357 lane records and 884 extractor records. Version 2 of the rule was decided from them (r57-0841).

**Why it works.** The mechanisms are borrowed from solved fields.

**The result.** Lane counts by their own refuters: c1 66 claims (41 confirmed, 23 in part, 2 refuted); t1 115 (65, 42, 5, 3 unchecked); a1 82 (48, 33, 1). The rule: 145 statements, 86 confirmed, 53 narrowed, 1 refuted, 5 searched only. Designed and untested: every number in it is a hypothesis.

# What did not improve, or is only designed

- **The build's tokens.** 908 M used against 397 M planned, 2.3 times (measured, r57-0170). A builder unit used 32.3 M against 11.7 M, a refuter 10.6 M against 5.4 M. The meter ran 64 % to 80 %.
- **The chain of four fixes.** W1 to W4 each depend on the one before; a link took 80-117 minutes. That chain set the fixes' time however many helpers ran. For 42 minutes no helper ran at all.
- **Parallel work saves time, not tokens.** In turn or side by side costs about the same; tokens are saved by small windows.
- **Several writers do not help research.** Every reader writes its own file, so the method saves nothing there; it would shorten only the pilot's fix round, 3 h to 1.2 h (computed, not built).
- **Nothing has run for real.** The pilot is the first real run of the tree.
- **Only designed:** the router, the chosen research plan, the unattended run, the testing policy and the decision rule's numbers. Probed once, no gain: helpers started in the background (r57-0158).
- **One test is flaky** under full load (stop.test FX-CLOSE).

# The agent map

This page shows the map of the planned research run: every agent a node, the lines show who starts whom. The top band is the run as chosen, the lower band the pilot as planned. It is the planned research run, not the build. The editable file is `research-tree/build/tree/research-run-map.drawio`.

How to read it. Start at the green "You" node and follow the lines down. A coordinator starts the seven fields; each field is a column with its helpers listed under it. Dashed nodes start only if the work grows while it runs.

<div class="mappage"><img src="../tree/research-run-map.png" alt="The research run agent map"></div>

# Sources

Library records (`bash library/lookup.sh -f <id>`): r57-0001, r57-0008, r57-0012, r57-0032, r57-0033, r57-0036, r57-0103, r57-0110, r57-0115, r57-0120, r57-0121, r57-0124, r57-0127, r57-0128, r57-0130, r57-0132, r57-0140, r57-0150 to r57-0152, r57-0155, r57-0157, r57-0158, r57-0159, r57-0160, r57-0164 to r57-0173, r57-0401, r57-0403, r57-0414, r57-0415, r57-0417, r57-0420, r57-0603, r57-0604, r57-0606, r57-0841, t1-0108, hc1-0100, hc1-0101, hc1-0104, hc1-0105. Files: `research-tree/build/facts/lane-and-shards.md`, `landings.jsonl`, `STATE.md`, `reports/slice-0.md` to `slice-2.md`, `refute/` (P0-GATE, W1 to W7, S0.5, S2.1, the plan reviews), `COMPLEXITY.md`, `FAULTS.md`, `ROUTER.md`, `UNATTENDED.md`, `tools/tokens-self.mjs`, `tree/research-run-map.drawio`, all under `research-tree/build/`; `docs/program/HARNESS-BOTTLENECKS-2026-11.md`, `TOKEN-BOTTLENECK-2026-11.md`, `GRAPH-TEST-RESULT-2026-11.md`, `evidence/harness-bottlenecks/graph2/embeddings/COORDINATOR-REPORT.md`, `evidence/pc-freezes-2026-11-17/VERDICT.md`; `library/tests/recall-test-1.md` to `recall-test-4.md`.
