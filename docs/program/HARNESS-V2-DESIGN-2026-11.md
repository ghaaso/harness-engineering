# Harness v2: design (2026-11-11)

**Status.** Plan accepted on 11 November. Phase 1 has started with read-only work. Nothing is installed, wired or committed.

**Generated file.** Built from `docs/program/harness-v2/design.json` by `docs/program/evidence/harness-v2-design/build.js.txt`. Do not edit it by hand: change the data and rebuild. The owner reads `docs/program/harness-v2/index.html`, which is built from the same data. This file is the record for agents and for git. It is not committed: it holds details of the clinic build and of the owner's PC, and where it goes is the owner's call.

**Number tags.** [M] measured: Observed in the record: a log, a transcript, a timing, a count. The source is one tap away. [S] setting: A value someone chose, in the testbed or in the tool. It was read, not observed. [T] target: A pass mark the design must reach. It is not true yet. [E] estimate: Someone's guess at effort or cost. Not measured. [I] illustrative: Made up to show how a mechanism behaves. Used only inside the demos.

## 0. The architecture

Source: `docs/program/harness-v2/architecture.json`. Page: `docs/program/harness-v2/index.html`. Sections 1 to 12 below are the plan behind it (`plan.html`).

**Speed = lanes × what one lane delivers, until the lowest limit is reached. There are four: the check, the review, the merge, the token window.**

The harness is one machine with four scarce things: time on the check, review, the one-at-a-time merge, and tokens per five-hour window. Each gets a controller. A planner sets how many sessions run at once, a little below the point where one more adds nothing. A library that updates itself feeds the planner its numbers and feeds sessions answers, so they read less.

Which limit comes first depends on rates that are only partly measured today. That is the point of the design: the harness measures them, and the planner works the answer out again for every plan.

Below: the parts, how the machine behaves over time as stocks and flows, the plan check that lays out parallel work before it starts, the library, and the token methods.

| Part | Job | Controls |
| --- | --- | --- |
| Planner | Works out, before any work starts, which slices can run side by side and how many lanes are worth running. | B5 Lanes at the knee |
| Scheduler | Turns the wave plan into running sessions, and brings them back after a stop. | R4 The pile-up |
| Governor | Keeps the token window from stopping everything. | B3 The limit stop; R2 Context growth |
| Lanes | Where the work is written. Each lane is a session that asks before it explores and leaves its results on disk. | – |
| Gate | Decides whether a slice is good, by tests it runs itself. | R1 The fix spiral; B1 Check capacity |
| Merge queue | The one place where work is serial. It is a script, so the serial part is short. | B2 The serial gate |
| The library | The harness's memory. It is written by the tools at the moment something becomes true, and it is asked, never pushed. | R3 The library compounds; B4 Staleness |
| The machine | Power, restart, the off-machine copy and one always-on logger. Everything above stands on it. | – |

**Loops** (R reinforcing, B balancing).

| Id | Loop | The mechanism | In the testbed | In v2 |
| --- | --- | --- | --- | --- |
| R1 | The fix spiral | A fix adds stored state. The state has an ending nobody tested. That is a new defect, which needs another fix, and another check. In the model this is the share of reviews that send a slice back: 64 % [M] in the testbed. | 2.8 [M] rounds per slice, and the last diff read by the root alone. | Two rounds at most, revert instead of patching, and a test for every way new state ends. |
| B1 | Check capacity | Every round needs the check. The check serves its slots divided by its run time and no more. Past that, lanes queue. | One slot and 367 s [M] on Windows. The longest wait on record is 2,030 s [M]. | The container run takes 230 s [M]. A second slot opens once the check's peak memory is measured. |
| B2 | The serial gate | Review and merging pass through something that takes one at a time. However many lanes run, nothing leaves faster than that. | The root did both. It briefed the reviewers, read the last diff itself, ran the check on the branch and again on merged main, and edited the board by hand. | Reviews run in a gate workflow, one gate at a time, outside the root. Merging is a script under a lock with one check. Raising the review limit takes a shorter review, or a second gate workflow when the token window allows. |
| B3 | The limit stop | Tokens used rise with the lanes working and the context each one carries. At the window's limit every lane stops at once. | Unmanaged. 14 [M] limit episodes in October; a run of ten lanes lasted about 15 minutes [M]. | The governor slows the lanes so the window lasts, instead of the limit stopping all of them. |
| R2 | Context growth | Every call re-reads the whole context and adds to it. So each call costs more than the one before. In the model it appears as its average: about 306k per call without a ceiling, about 220k with one. That gap is a comparison across models, not a trial. | Sessions on Sonnet ran to 963k [M]. Sessions on Opus stopped at 367k [M], because of that model's own window. | A ceiling near 367k on every model, and one phase per session. |
| R4 | The pile-up | A lane that waits still holds its context. Waiting costs tokens, tokens bring the stop sooner, and after a stop everything is released at once and waits again. | Every session was released together on 9 November. One check then waited 2,030 s [M]. | Two at a time, and waiting happens parked, outside any session. |
| R3 | The library compounds | Each merged slice writes what it learned. The next session asks before it explores, so it reads less. Less reading means more slices per window, which write more. | No library, and no index or graph was ever tried. The one context trial on record, a compaction adapter on another project, used 6 to 17 % more [M] tokens for the same recall. | Pull-only lookups, counted one by one. Unproven until measured. |
| B4 | Staleness | Code changes. An entry whose files changed is not trusted until its check runs again. This is what stops the library filling with things that are no longer true. | The board carried 183 minor findings with no status at all. | Entries are tied to the files they depend on. Stale by code change, never by age. |
| B5 | Lanes at the knee | More lanes help only until the lowest limit. Past it they add queues, tokens and collisions, and no speed. | Lanes were chosen by feel and nothing checked for collisions. For the first two [M] slices the first check on merged main failed, on hand edits to shared documents. | The plan check runs a little below the knee and keeps colliding slices apart. |

**The model** (stocks: Backlog, In work, Waiting for check, In check, In review, Waiting to merge, Merged, Tokens used, this window, Context per call, Valid library entries).

- `lanes = your setting; with the planner, the lower of that and about 0.8 × the knee. When tokens are the first limit it takes the knee itself, and the governor trims the rest`
- `start = min(backlog, lanes − slices in flight); with the scheduler, at most one new slice every five minutes`
- `work done = in work ÷ work time × governor share`
- `check starts = min(waiting, slots − in check);  check done = in check ÷ check time`
- `after a check: back to work, except one time in every (checks per round), which goes to review`
- `review done = min(in review, one gate at a time) ÷ review time;  another round = review done × (1 − 1 ÷ rounds)`
- `merge = one at a time; each takes merge time + merge checks × check time and holds a check slot. In the testbed the root does both, so it reviews only when it is not merging`
- `burn = (working × governor share + waiting × waiting share) × context factor × library factor`
- `library factor = 1 − lookup-step share × hit rate + cost of looking up;  hit rate = top hit rate × entries ÷ (entries + half point)`
- `entries: + per merged slice, − a share of them with every merge, as their files change`
- `without the governor: every flow stops while tokens used ≥ window. With it: governor share = what the window can still carry ÷ what the lanes would burn`
- `tokens used returns to zero every 300 minutes`
- `one lane delivers 1 ÷ (rounds × (checks per round × (work + check) + review) + merge);  knee = lowest limit ÷ that`

Controllers that can be switched in the model: Container run as the gate (the check takes 3.8 minutes, not 6.1); A second check slot (two checks at once, each a little slower; waits on the memory measurement); Fix-round contract (two rounds at most, not 2.8); Gate workflow and merge queue (review leaves the root; a script merges with one check); Context ceiling (every session compacts near 367k); Scheduler: two at a time, waits parked (no mass release; a waiting lane burns nothing); Planner sets the lanes (runs a little below the knee, whatever the slider says: nearly the same finish on fewer lane-hours); Governor (slows the lanes so the token window lasts); The library (unproven) (sessions ask before they explore; each lookup costs a little. Watch the tokens figure).

Model assumptions: This is a model of how the machine behaves, not a forecast. Its output is illustrative. Measured inputs: check times, rounds per slice, checks per merge, the slice count. Estimated from the record: the context factor and the fetched share. Guessed: work, review and merge minutes, checks per round, the size of the token window, the library's costs. The full list is under 'The equations'. Which limit comes first depends on those guesses. Move the token window to see it change: at the size October's runs fitted (about 2.5 lane-hours [E]), tokens are the first limit at any lane count. Stocks are continuous: 2.4 slices in review is an average, not a count. A smooth model shows no queue until a limit is fully used. A real queue forms earlier, which is why the planner runs below the knee. A plan counts as merged when less than half a slice is left. In this model a lane past the knee only waits; it does not slow the others. So the planner does not make a run faster. It gets nearly the same finish with fewer sessions open, which is fewer tokens and less memory. A lane-hour of tokens is what one working testbed session burns in an hour. In the model a stop and a slow-down cost the same time. In the record a stop cost more: a restart by hand, and every session released at once. Review is one gate at a time in both runs. In the testbed the root also merges, so it cannot review while it merges. Not in the model: the PC powering off, you being away, memory, the cost of a revert, a lane that fails. Those stop or slow every flow at once. The machine part and the scheduler are their answer. The library lowers token burn only: the share of tokens that lookup-only calls re-read, times a guessed share of those steps it spares, less a small cost on every lookup. With few entries it costs more than it saves. Fewer lookup steps would also save time; that is not modelled.

**Plan check: parallel work is planned, not discovered.** Every slice declares: The files it will write: its footprint. What it reads from other slices: the interfaces it depends on. The slices it needs merged first. Any shared thing it takes: a migration number, a shared document, a port, a database. Its risk (money, stock, access, import, restore) and its model. Its size, in work rounds.

1. Refuse a slice that declares no footprint.
2. Build two graphs: who needs whom, and who collides with whom. Two slices collide if they write the same file, take the same shared thing, or one writes what the other reads without saying it needs it. The library adds files that have changed together before.
3. Lay the slices out for the shortest finish. The longest chain of needs, weighted by size, is the floor. A re-split is worth it only if it shortens that chain or fills an idle lane.
4. Work out the lanes worth running from the four limits and memory, and run a little below the knee.
5. Name what limits the plan, and the one change that would lift it.
6. Refuse a plan with two writers of one file, or more lanes than that.
7. While it runs: a slice starts as soon as what it needs is merged and nothing running collides with it. The lanes running are the lower of the planner's count and the governor's.
8. At the gate: a branch that changed files outside its footprint is refused until the plan is amended. After the merge, what it really touched goes to the library, so the next plan starts from better footprints.

One lane delivers a slice every cycle. More lanes multiply that until the lowest limit. With these numbers the testbed's first limit is the root, which reviewed and merged everything one at a time: about three lanes were worth running, and the build ran six to nine [M]. In v2 the first limit is the review, then the check. A small token window puts tokens first at any lane count. Several of the times behind this chart are guesses, so read which limits exist and how the controllers move them, not the figures. The harness measures these rates, and the planner works this chart out again for every plan.

**The library.** Holds: What is true now (Slices, verdicts, findings and decisions, each with the commit it became true at and the commit that replaced it. The board is a view of this.) What a change touches (Files that import each other, tests that cover them, files that changed together, and what each slice declared against what it really touched.) Solved problems (The knowledge-store design as it stands: symptom, cause, what failed, the fix, and a check with a control pair that proves the entry applies.) Measured rates (Check time, waits, tokens per lane-hour by model, rounds per slice. The planner and the governor run on these.)

How it changes by itself: Written at the moment of truth: By the gate, the merge queue and the agent that solved the problem. Never by a model reading old text afterwards. Stale by code change: An entry is tied to the files it depends on. When they change, it is not trusted until its check runs again. Never by age. Lessons become checks: An entry seen three times is proposed as a lint, a test or a gate clause. Once that lands, the entry retires and the defect stops arriving. Misses are written down: When a session solves what the library already held, the miss and its cause are recorded and the lookup keys are fixed. Rates replace guesses: Every wave updates the measured rates and footprints, so each plan is laid out on better numbers than the last.

Tables: `journal` (The truth: one unchangeable file per event, in git. The SQLite file is rebuilt from it at any time. Written by every writer.) `entry, handle, footprint_item` (Solved problems, the keys that find them, and the files each one depends on. Written by the solving agent; approved by the reviewer (knowledge-store design).) `state` (Slice, verdict, finding, decision; valid from one commit until another. Written by the gate and merge scripts.) `edge` (imports, covers, changed-together, declared, touched. One recursive query gives what a change touches. Written by scripts over git and the check.) `rate` (A measured number, its scope and how many samples it rests on. Written by the check, the merge queue, the transcript tally.) `lookup` (Who asked what, what came back, tokens returned, hit or miss. Written by the lookup command.)

- Standing: unproven. Nothing like it has been tried: the testbed never tested an index or a graph. Its one context trial, a compaction adapter on another project, used 6 to 17 % more [M] tokens for the same recall. This library is asked, never pushed, and every lookup is counted.
- What it could touch is estimated as two exposures, which overlap. about 27 to 28.5 % [E] of context is content fetched by reading. And 54.7 % [M] of calls did nothing but read or search, re-reading 43.6 % [E] of all tokens. Neither is a saving and neither is a ceiling.
- Where it could pay is across sessions, not inside one. Re-reading inside a window is only 0.5 to 1.5 % [E], so a cache of files already read saves almost nothing. Across windows the reading is concentrated: 72 paths [E] hold half the fetched tokens, and the paths read in five or more windows hold 73 % [E]. So the form that could pay lasts across sessions and returns something shorter than the lines. Nothing has shown that a shorter digest can stand in for the lines. Whether the reading was needed at all is unmeasured: 74 % [E] went to files the window did not edit, which is not proof of waste.
- Its first test spends no tokens: replay the recorded windows. Build an import-and-caller index at each window's start commit, count the lookup-only calls it would have answered, and check whether its list holds the files the window went on to edit. An index earns a live trial only if that replay says so. A refuter suggested pass marks of 3 % of tokens and a recall of 0.8 [T]; setting them is your decision. Files that changed together are the weak half, with only 432 commits [M] to learn from. The replay reads the clinic repository and the transcripts and writes nothing there.
- Its larger worth may be elsewhere. The generated board replaces a 221 KB [M] document that sessions carry. And the measured rates are what let the planner and the governor work at all.
- It builds on the knowledge-store design (PR #183), which already has the journal, the SQLite index, the lookup command and the proof step, and which stops for your yes after a free audit and again after a pilot. That design expects only 3 to 5 [E] repeats in the record it would audit.
- v2 departs from that design in three ways. Work state sits in sibling tables, not in the store, which that design says is not a defect register. Code edges are added, which it chose to skip; they stay only if the index replay passes. And a lookup before exploring is a new trigger; that design looks up on an error, an escalation or a diff.
- That design's stop rule is carried over: fewer than 3 verified hits in 20 encounters or 8 weeks [S]. Lookups stay on this PC, as in that design; only their totals go to the journal.
- Its worth, in that design’s own terms: hit rate × (cost of solving again − cost of a hit) − miss rate × cost of a miss − cost of writing. None of those is measured yet.

**Tokens.** Nearly every token the build used was a re-read: 4.25 billion [M] cache-read tokens in November. Whatever enters a session’s context is read again on every later call. So a piece of context costs its size times the calls still to come. What fills that context is estimated from the transcripts. The start of every window is about 29 % [E]. The model's own earlier output, carried forward, is about 32 % [E]. What the session fetched by reading and searching is about 27 to 28.5 % [E]. Each method below attacks one of those three, or cuts the number of calls: 54.7 % [M] of calls only read or searched.

What the windows hold: the start of every window about 29 %; the model's own earlier output about 32 %; what the session fetched 27 to 28.5 %; everything else the rest. Shares of November's 4.33 billion [M] context tokens, not of a bill: output tokens are left out. Estimates from the transcripts, checked by two refuters and an independent re-measurement, which put fetched content at 22.3 % [E].

Fetched content entered the windows once as about 19 million [E] tokens. It was then processed about 950 million [E] times, some 50 [E] passes per token, because every later call reads it again. That is why keeping something out of a long session matters more than how big it is.

| Method | Cuts | How | What the record says | Standing |
| --- | --- | --- | --- | --- |
| A context ceiling on every model | own | No call re-reads more than about 367k. | 39.8 % [M] of tokens were in calls past 400k, all on Sonnet and Fable. Opus never passed 367k [M]: 38 of 48 [M] compactions came there. | Trial. What a compaction loses is unmeasured. |
| Route by window as well as price | own | A cheaper model with a bigger window can cost more. | Slice calls on Sonnet read 1,452 million [M] tokens; on Opus, 1,306 million [M] in nearly twice the calls. | A comparison across models, not a trial. |
| One phase per session | own | Each phase starts with a small context. | Late calls in a long session carry everything before them: about 519 [M] calls per session. | Design. |
| A small standing context | start | A generated board, a short brief, a short tool list. | The board is 221 KB [M]. Tool definitions are 34k [M] of the about 70,000 tokens [M] each agent pays. | Build, with a with-and-without test. |
| Ask, do not read | fetched | A library answer of at most about 860 tokens [S] instead of files read into the session. | Two exposures, which overlap: about 27 to 28.5 % [E] of context is fetched content, and calls that only read or search re-read 43.6 % [E]. Inside one window re-reading is only 0.5 to 1.5 % [E], so the gain, if any, is across sessions. | Unproven. A zero-token index replay first. |
| Results on disk | own | A report is a path and a summary; a verdict is a few fixed fields. | The root averaged about 499k [M] of context per call. | Build. |
| No waiting inside a session | calls | A waiting slice is parked; the check runs in the background. | Median recorded wait 409 s [M]; the longest 2,030 s [M]. | Build. |
| Fewer rounds | calls | Each round re-reads the session's context again. | 2.8 [M] rounds per slice. | Trial: the fix-round contract. |
| Scripts before agents | calls | The gate, the audit, the planner and the parser spend no tokens. | 38 of 71 [M] practised ideas failed as prose. | Build. |
| Lanes at the knee | calls | No lane runs that only waits. | Ten lanes at once lasted about 15 minutes [M]. | Design: the plan check. |

**Would the orchestration document then carry the parallel planning too?** Yes. The orchestration document is where the method lives, and today it has none of this. Its only parallel work is read-only discovery, five readers at a time. It puts off phase design, and it has no dependency graph, no footprint check, no lane arithmetic and no predicted speed-up. The plan check belongs there as a new section after its second gate, with the lane arithmetic in its cost section and the machine's limits in its constraints section. Its read-only discovery fan-out stays as it is. The mechanism is defined once, here. The orchestration document carries the rule: no plan runs before it passes the check. Three of its rules are really capacity facts that the planner should compute instead of state: fixed container names with one test database (that is one check slot), no two installs at once, and the top model alone on the risky areas. Migration numbers are a collision point it never names. Nothing in that document was changed. It belongs to the ship plan's pull request, which this track does not edit. The section can be written when you say so.

**Build order.** 1. The machine: The copy, the restart, the logger, the resume list. Phase 1, under way. 2. The check: The container run as the gate, slots from one measured number, the heartbeat. Its timings are the first measured rates. 3. The gate, the merge queue and the plan check: All scripts, no tokens. The same scripts write 'what is true now' and the rates, which is the first half of the library. The index replay runs here too, on the record. 4. First use and a real host: The clean-install walk and the rehearsal. 5. The governor and the rest of the library: The budget from measured rates and the context ceiling. Solved problems come last, through the knowledge store's own audit and pilot.

**Limits of the architecture.** Which limit comes first depends on guessed times and on the size of the token window, which nobody knows. The charts show how the machine behaves, not how fast it will be. The model leaves out the PC powering off, the owner being away, memory, the cost of a revert and a failing lane. The library is unproven. The figures for what it could touch are exposures, not savings and not ceilings. No index or graph has been tried in the testbed. The window-fill shares are estimates. They rest on context growth between calls; the path key is the last two path segments; the first run counted some heredoc writes as reads; output tokens are left out. How cache reads count against the plan’s limits is unknown. The sample plan is made up. The testbed’s slices were never laid out with footprints, so there is no real plan to replay yet. The library departs from the knowledge-store design in three places, listed in its section. The orchestration document was read, not edited. A refuter ran the model and checked the claims; what it found and what changed is in evidence/harness-v2-design/refute-architecture.md.

## 1. Summary

The clinic build ended with 21 unsolved problems. None needs more reading. Seven [M] wait on a decision from you, seven [M] are ordinary builds, three [M] need one measurement on this PC and four [M] are trials.

The order comes from what the record shows. The PC powered off 24 [M] times, so the machine comes first. The idea lists sharpen review, so they come third. The three-day stop was a power-off and not a usage limit, so tokens come last.

v2 is for the clinic build. It is proven first on the clinic's own record, and its live numbers are read the next time the clinic build runs. It changes no rule of FixFlow's ship plan.

The compile's summary says six builds and four diagnoses. Its own tables say seven and three. This page follows the tables.

**Phase 1 so far.**

- Done: Token baseline saved for every slice session. All 184 [M] November transcript files are still there.
- Done: Every power-off joined to what was running. 15 of 25 [M] had no session active.
- Done: The clinic repository checked for damage: none. It is small, 55 MB [M] packed. Six [M] folders in it are in no commit, so a plain bundle would miss them.
- Done: New from the baseline: 38 [M] of the 48 [M] compactions on record came near 367k [M], every one on Opus. The compile had counted four, in the root only.
- Done: Your five phase 1 answers are recorded. They are shown on each card under Your decisions.
- Waiting on the owner: Switch off sleep on mains power. In Windows: Settings, System, Power, and set sleep when plugged in to Never.
- Waiting on the owner: Plug in the drive for the copy and switch on its encryption. Then the copy can be made and checked against the repository.
- Waiting on the owner: Install the sensor logger and the debugger.
- Waiting on the owner: Say which days the house lost power. The day list is on the sensor-logger card under Your decisions.
- Not started: The resume list and the nightly copy are scripts for the clinic repository. They need a session working there. Docker's start at sign-in stays off by your choice, so the resume list's first line will be: start Docker.

Phase 1 measurements and their scripts: `docs/program/harness-v2/phase1/` (start at FINDINGS.md).

## 2. The five phases

| Phase | Built | Answers | Owner decides | Done when |
| --- | --- | --- | --- | --- |
| 1. Keep the work safe, get back up | Off-machine copy; Restart chain; Resume list; Shutdown diagnosis; Token baseline, saved early; One free rule from day one | B03, B05, B10, B11 | D02, D03, D04, D05, D06, D07, D08 | The copy is verified, one real reboot comes back with no command, and the logger is running. |
| 2. One fast check, sized by a measurement | Container run as the gate; Slots from one number; Heartbeat; Memory table; Clean-up | B06, B07, B08, B09, B14, B15, B18 | D09, D10, D11 | The container run is the gate, the peak-memory number is written down, and the heartbeat is live. |
| 3. Gate and review as scripts | Reports on disk; Generated board; Six scripts that spend no tokens; Gate workflow; Touch-list test; Index replay; The fix-round contract; Two things that cost people or tokens, last | B01, B04, B12, B13, B16, B17, B21 | D12, D13, D14, D15, D16, D17, D18, D19, D20, D23 | Each of the six scripts has passed its stated test, and the merge queue has run record-only over the 65 [M] recorded merges. |
| 4. First use and a real host | Zero-seed walk in every gate; Real-host rehearsal; Load rerun | B02, B19, B20 | D21 | The walk is a gate step and has caught the 11 November gap on replay. The checklist has run once on a real host. |
| 5. One token budget | The budget as numbers; Lever 1: slice sessions; Lever 2: fixed cost per agent; Lever 3: the root; The compaction-window trial | cuts across B03, B04 | D22 | The per-slice baseline exists and the budget is checked against it. The trial is optional. |

### Phase 1: Keep the work safe, get back up

**Why here.** The PC powered off 24 [M] times and the work exists only on it. Nothing else matters until that is covered. The idea lists add one small guard here and nothing else.

- **Off-machine copy.** After your custody choice: a bundle of every branch, verified, copied off the PC. A nightly copy, run by a scheduled task, that also captures uncommitted work. The copy logs its own success, and the resume list warns when it is more than a day old. The November transcripts and the evidence folder go with it, because every later proof replays on them. *Answers B11.*
- **Restart chain.** Docker starts at sign-in. The databases in use restart themselves, two at most until the power-offs are diagnosed. The check starts its own database if it is missing. *Answers B10.*
- **Resume list.** At sign-in, a list of the sessions that were mid-work and where each branch stands. Sessions are released two at a time. A session whose record and branch disagree parks itself (mechanism 8). *Answers B03.*
- **Shutdown diagnosis.** Join the 24 event times to commits and check logs. Your notes on mains outages. One always-on logger of temperature, power and memory by process group; phase 2 reads the same log. Decode the 7 October crash dump. No sleep while sessions hold work. *Answers B05.* *Also helps B08, B09.*
- **Token baseline, saved early.** Rerun the token tally per slice on November's transcripts while they still exist. It costs no tokens. Phase 5 needs it, and the budget figure is set from it.
- **One free rule from day one.** One fact, one command (mechanism 7): a fact about this PC or the tools is checked by a command before it becomes a rule. It costs a line in a brief. *Also helps B16, B19.*

**Proof.** A clone from the copy shows the same heads. The copy is under 24 hours [T] old. After a reboot and sign-in, databases are healthy within 3 minutes [T] with no command. The next unexpected shutdown has a trace that ends at it. Zero sleep-related events in 14 days [T]. Idle time between 'could resume' and the next commit: from about three days [M] to under three hours [T].

**Cost.** Building: one to two days [E] of one session. Scripts and settings only. Agents: None in parallel. No replays. Owner: Five decisions now and two later. 15 to 30 minutes [E] for the first copy, and an afternoon [E] if you set up the sensor logger yourself. Your part comes after FixFlow's P0a. **Watch.** The second check slot stays shut until the diagnosis names a cause that is not load, or 14 days [T] that include build load pass with no power-off.

### Phase 2: One fast check, sized by a measurement

**Why here.** The check is where the testbed's measured wins are: 855 s [M] came down to 284 s [M] when it ran in parallel. It is also where sessions wait. Every later phase runs through it, so it is fixed before anything is added to it.

- **Container run as the gate.** The Linux container run becomes the gate. The Windows run triggers only when the Windows-side tools change. Expect one fix-up round for tests that depend on run order. *Answers B06, B18.*
- **Slots from one number.** Measure one check's peak memory. Set the slots from it. A fair queue that prints each check's place. One full gate per review round. *Answers B07.*
- **Heartbeat.** The check writes waiting (with its place), running (with the current test) or stalled. Checks run in the background. On a stall every worker's stack is dumped. The stall limit comes down only after 20 runs [T] on a loaded day show it kills no healthy check. *Answers B14, B09.*
- **Memory table.** One build day read from phase 1's logger. A table of who holds memory when it is short. Then a choice among a shared test database, a cap on the WSL2 machine, and closing other applications. *Answers B08.*
- **Clean-up.** A written archive rule. A reaper that lists merged, clean worktrees and their containers. It skips anything written to in the last 24 hours and any worktree whose session is still open. *Answers B15.*

**Proof.** Median gate near 230 s [T]. Zero Linux-only failures on main. Second slot open on at least half [T] of the polls. Median wait under a minute [T]. Longest gap between heartbeats under 60 s [T]. The next stall names its test. A table of who holds memory when less than 2 GB [T] is free. After each merge, worktree and container counts return to the active slices plus one.

**Cost.** Building: three to four days [E] of one session, including one observed build day for the memory table. Agents: None. Owner: Two decisions now and one later, after the memory table exists. **Watch.** A second slot opens only if the measured peak allows it and phase 1's diagnosis does not point at load.

### Phase 3: Gate and review as scripts

**Why here.** This is where the two idea lists land. They reach nothing for eleven [M] of the 21 problems, which is why they could not come first. 29 [M] of the 87 [M] kept ideas fit a problem, and one dropped idea was promoted. All but one of those thirty reduce to eleven mechanisms. The testbed had already practised 71 [M] of the dropped ideas: 33 [M] worked and 38 [M] failed, mostly as lines in a brief and model re-checks. So v2 takes them as scripts that can fail.

- **Reports on disk.** After a 15-minute write probe: agents write full reports to a folder you have allowed and hand back a path, a hash and a short summary. *Answers B16.*
- **Generated board.** Each slice writes a small state fragment. A generator builds a short board. The root stops editing it by hand. *Answers B13.*
- **Six scripts that spend no tokens.** Sealed replay, verdict script, transcript audit, finding table, dry run with stand-in agents, merge queue. In that order. *Answers B01, B12, B13, B17, B21.* *Also helps B15.*
- **Gate workflow.** First a probe that a workflow agent can run the check at all. Then the round's reviewers run in a saved workflow outside the root, write their reports to disk and return the typed verdict. It is tested with stand-in agents before any real one. *Answers B04, B17.*
- **Touch-list test.** At zero tokens, on the ten recorded cases: does the file of the later defect fall inside the list? The list is dropped if fewer than six of ten [T] do, or if it runs past about fifteen files [T]. *Also helps B01.*
- **Index replay.** At zero tokens, on the recorded windows: build an import-and-caller index at each window's start commit, count the lookup-only calls it would have answered, and check whether its list holds the files the window went on to edit. An index earns a live trial only if this says so. It reads the clinic repository and the transcripts and writes nothing there.
- **The fix-round contract.** The contract and its clauses (mechanism 9), replayed under the seal on the recorded chains before any live use. *Answers B01.*
- **Two things that cost people or tokens, last.** You read the marked lines of three high-risk merges. A short tool list for gate agents, after a with-and-without test. *Also helps B17, B04.*

**Proof.** Each mechanism passes its own stated test. See the ladder below. High-risk merges with an unread final head: from 5 of 6 [M] to zero. Board from 221 KB [M] to under 20 KB [T]. Root edits at merge: zero. The claims script flags the recorded overstatements with false flags under 10 % [T]. An open count exists over the 183 [M] P3 ids. No compaction of the root across a wave of five gates [T].

**Cost.** Building: about a week [E] of one session for the scripts. Agents: While it is being built: replays and probes only, outside build hours, two at a time. Once it is live: each fix round adds at most one fresh reviewer, and a high-risk merge whose branch changed adds one read. Owner: Decisions as each mechanism reaches you. about 3 hours [E] of reading across the review replay and the three-merge trial. **Watch.** A script may refuse a merge only after you say so.

### Phase 4: First use and a real host

**Why here.** The last-day gaps were missing production paths hidden behind test data. Only walking a clean install finds them. The walk runs inside the container gate, so it needs phase 2.

- **Zero-seed walk in every gate.** Against a fresh container database: install, first user, tills and accounts, a real-shaped import, one transaction, close of day. Plus a test that every kind of record the seeder writes can also be created in production. *Answers B02.*
- **Real-host rehearsal.** Free steps first, with you present for one administrator prompt: fresh-machine restore, the first-deploy checklist, an off-site push, an alert with a planted failure. Each step has its command, its expected result and a run that must fail. Then a rented host for a day, with made-up data only. *Answers B19.*
- **Load rerun.** Rerun the 12 users [M] drill on current main. A bulk generator to reach 250,000 [T] stock movements. Rerun on the rented host. *Answers B20.*

**Proof.** The walk fails on the commit before the 11 November merge and passes after it. Each first-deploy gap has a result file from a real host. A regression signal from the load rerun now. Proof of the real limits only on the host.

**Cost.** Building: two to three days [E] of one session, including the work to close the rig's gaps. Agents: None. The walk adds 2 to 3 minutes [E] to every gate run. Owner: One decision. about one minute [E] for the administrator prompt. a domain fee and a few hours of host rental [E]. **Watch.** Rig steps need an administrator prompt, so they cannot run while you are away.

### Phase 5: One token budget

**Why here.** The three-day stop was a power-off. Usage limits did interrupt work on other days, and how much is not measured. Nobody knows how re-read tokens count against the plan's limit, so no token cut can promise fewer stops. That is why this is last.

- **The budget as numbers.** Per-slice tokens and limit events for November, from the baseline saved in phase 1. The budget figure set in phase 1 is checked against them.
- **Lever 1: slice sessions.** The largest share: 66.4 % [M] of tokens. One phase per session. A smaller mandatory pre-read. The compaction-window trial. What an index could touch there is estimated as two exposures, which overlap: about 27 to 28.5 % [E] of context is content the sessions fetched by reading, and calls that only read or search re-read 43.6 % [E] of all tokens. Neither is a saving. The index replay in phase 3 is the first test.
- **Lever 2: fixed cost per agent.** about 70,000 tokens [M] before any work. Fewer connectors and skills in agent sessions. Fewer tiny fan-outs. The short tool list from phase 3.
- **Lever 3: the root.** The gate workflow and merge queue from phase 3. Bounded: the root is 15.3 % [M] of tokens. *Also helps B04.*
- **The compaction-window trial.** 39.8 % [M] of November's tokens were in calls whose context had passed 400k. That is exposure, not a saving. Phase 1's baseline narrows it: sessions on Opus never passed 367k [M] and compacted there 38 [M] times, while sessions on Sonnet ran to 963k [M]. So the calls above 400k are on Sonnet and Fable. The trial: set the window to 400,000 tokens [S] for Sonnet slice sessions, for one wave. Confirm it took effect: compactions should show near about 367k [S]. Charge each compaction call to the trial. Check one summary against the slice's task record. The result will be an anecdote.

**Proof.** Per-slice token figures exist for November. The trial shows compactions near about 367k [S], with their cost counted on the trial's side. No promise is made that fewer tokens means fewer stops. That link is unknown.

**Cost.** Building: about an hour [E] for the tally. The trial is a setting. Agents: None extra. Each extra compaction pays for one full-context call. Owner: One decision. **Watch.** The budget rule itself applies from phase 1. This phase only measures and tunes it.

**Dependencies.**

- 1 → 2 (hard): Find out why the PC powers off before adding load. The second slot waits for that.
- 2 → 3 (soft): Replays and verdict scripts take check time. They want one fast gate first.
- 2 → 4 (hard): The first-use walk runs inside the container gate.
- 3 → 5 (soft): The gate workflow and tool list change what a session costs. Measure after.
- 1 → 5 (data): The token baseline is saved in phase 1, while the transcripts still exist.

**Order.** The five phases stay in the order given.

- The budget rule (two lanes, a written budget per window) applies from phase 1, and its figure is set in phase 1. Phase 5 measures and tunes it. Reason: the refuter warned that the remedies added together recreate the stops.
- The token baseline is saved in phase 1. Reason: it needs the November transcripts, and the app may clean them up.
- Mechanisms 7 and 8 enter in phase 1. Reason: they cost a line in a brief, and the resume check guards the resume list that phase 1 builds.
- Inside phase 3 the scripts come before the fix-round contract. The compile's first list of moves had the contract first. Reason: the contract's replay needs the seal and the verdict script.
- Phase 4 needs only phase 2. It can swap with phase 3 if you want the clean-install walk sooner. It sits fourth because it draws on check minutes, on the rig's memory and on your presence for an administrator prompt.

**Standing rules.**

- **The ship plan comes first.** FixFlow's P0a is the next session and nothing here delays or edits it. Your part of phase 1 comes after P0a. Harness work takes neither the Docker gate nor agent lanes while a FixFlow phase is running or waiting on its reviewer: both draw on the same usage limit.
- **One budget.** Lanes two at a time. A token budget written down before any launch. One agent-adding change per window. State on disk.
- **Script before agent.** Models find things. Scripts decide whether a finding is closed. A check a script can make is never left to a model.
- **Replay before live.** A gate-and-review mechanism is accepted by its replay on the record wherever a replay is possible. It runs record-only before it may refuse anything.
- **One fact, one command.** A fact about this PC or the tools becomes a rule only after one command has checked it. The original list carried five facts that turned out wrong.
- **Your yes for anything that reaches outside.** No hooks, no installs, no scheduled tasks, no permission changes and nothing leaving this PC without your decision.

## 3. The 21 bottlenecks

| Id | Problem | Class | Phase | Idea lists | First step | Proof |
| --- | --- | --- | --- | --- | --- | --- |
| B01 | Fixes that create new defects | trial | 3 | supporting | A fix-round contract. A test per finding that fails before and passes after. The full gate before the fix commit. Revert instead of patching a patch. A fresh reviewer. Two rounds at most. A table of every way new state ends. A touch list. First replay it on the recorded chains. | Replay: would the table and the list have demanded the tests the five late P1s needed? Live: defects made by fixes, per fixed finding, against the testbed's rate. |
| B02 | Gaps found only on the last day | build | 4 | none | A zero-seed walk against a fresh container database in every gate: install, first user, tills and accounts, a real-shaped import, one transaction, close of day. Plus a test that every kind of record the seeder writes can also be created in production. | The walk fails on the commit before the 11 November merge and passes after it. |
| B03 | Everything stops when you are away | decide | 1 | supporting | A restart chain, plus a resume list at sign-in. Sessions are released two at a time. Gates run as workflows. Parked starts stay the default. | Idle time between 'could resume' and the next commit: from about three days [M] to under three hours [T]. |
| B04 | One orchestrator is the only gate | trial | 3 | supporting | Move review into a gate workflow that returns a typed verdict naming the commit it read. Move merging into a local queue under a lock that tests the merged result. Keep the root for judgment. | No compaction across a wave of five gates [T]. The gain is bounded: the root is 15.3 % [M] of tokens. |
| B05 | The PC powers off | diagnose | 1 | none | Join the 24 event times to commits and check logs. You note mains outages. One always-on logger of temperature, power and memory by process group. Decode the 7 October crash dump. Stop the PC sleeping while sessions hold work. | The next event has a trace that ends at it. Zero sleep-related events in 14 days [T]. |
| B06 | The check is slow on Windows | decide | 2 | none | The container run becomes the gate. The Windows run triggers only when the Windows-side tools change. Expect one fix-up round for tests that depend on run order. | Median gate near 230 s [T]. Zero Linux-only failures on main. |
| B07 | Checks queue behind each other | build | 2 | none | Measure one check's peak memory. Set the slots from that number. A fair queue with a printed position. One full gate per review round. | Second slot open on at least half [T] of the polls. Median wait under a minute [T]. |
| B08 | Memory is short | diagnose | 2 | none | One build day read from the always-on logger, by process group. Then choose among one shared test database, a cap on the WSL2 machine, and closing other applications. | A table of who holds memory when less than 2 GB [T] is free. |
| B09 | One check hung | diagnose | 2 | none | The heartbeat records the running test. On a stall, dump every worker's stack. Lower the stall limit from 600 s [S] to about 120 s [T], once 20 runs [T] on a loaded day show it kills no healthy check. | The next stall names its test and its kind of cause. |
| B10 | Nothing restarts after a reboot | decide | 1 | none | Docker starts at sign-in. Only the databases in use restart themselves, two at most until the power-offs are diagnosed. The check starts its own database when it is missing. | After a reboot and sign-in, the databases are healthy within 3 minutes [T] with no command. |
| B11 | The work exists only on this PC | decide | 1 | none | You pick custody: a private remote or an encrypted bundle. Then a bundle of every branch, verified, copied off the PC. A nightly copy that also captures uncommitted work. | A clone from the copy shows the same heads. The copy is under 24 hours [T] old. |
| B12 | Session reports overstate | trial | 3 | supporting | Each slice commits a claims file. A script checks that every cited test exists, ran, and fails when its guard is removed. It runs in the root's gate first. First replay it over the recorded gates. | The share of the 20-plus [M] recorded overstatements it flags. False flags under 10 % [T]. |
| B13 | Shared documents have one writer | build | 3 | supporting | Each slice writes a small state fragment. A generator builds a short board. The generated board's diff is a step of the local check. Tests compare the routing documents with the plan. | Board from 221 KB [M] to under 20 KB [T]. Root edits at merge: zero. |
| B14 | You cannot see progress | build | 2 | none | The check writes a heartbeat: waiting with its place in the queue, running, or stalled. Checks run in the background, never in a foreground polling loop. | Longest gap between heartbeats under 60 s [T]. |
| B15 | Worktrees and containers pile up | decide | 2 | supporting | A written archive rule. A reaper that only lists what it would remove: merged, clean worktrees and their containers. It skips anything written to in the last 24 hours and any worktree whose session is still open. | After each merge, worktree and container counts return to the active slices plus one. |
| B16 | Reports flow through the orchestrator | build | 3 | supporting | A 15-minute probe in the clinic's own permission mode. Then agents write the full report to a folder you have allowed and return a path, a hash and a short summary. | Refused writes: zero over 20 runs [T] in the clinic's permission mode. |
| B17 | Nobody reads the final commit | trial | 3 | direct | A finding closes only on a test the harness runs. Each merge records who read the final head, and a high-risk branch cannot merge on 'nobody' or 'its own session'. A replay of seven known misses with a fresh reviewer. | High-risk merges with an unread final head: from 5 of 6 [M] to zero. The replay result is exploratory. |
| B18 | Tests ran only on Windows | decide | 2 | none | The same decision as the slow check: the container run becomes the gate. | Median gate near 230 s [T]. Zero Linux-only failures on main. |
| B19 | Nothing has run on a real host | decide | 4 | supporting | Free steps first, with you present for one administrator prompt: the fresh-machine restore, the first-deploy checklist end to end, an off-site push, an alert with a planted failure. Then a one-day rented host. | Each checklist gap has a result file from a real host. |
| B20 | The load test was not rerun | build | 4 | none | Rerun the load drill on current main. A bulk generator to reach 250,000 [T] stock movements. Rerun on the rented host. | A regression signal now. Proof of the real limits only on the host. |
| B21 | Minor findings pile up uncounted | build | 3 | supporting | A script parses the board's finding tables into records: id, severity, status, closing commit, files. You set the rule for when a finding goes stale, and for a second look at anything on money, stock, access, import or restore. | An open count exists. Every pilot-critical finding has a verdict. |

The corrected diagnosis of each is in design.json (`bottlenecks[].diagnosis`) and on the page.

## 4. The eleven mechanisms (phase 3, in order)

| # | Mechanism | Cost | Owner decision | Accepted by | Its test | Ideas absorbed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Sealed replay | A script. No tokens. | none | a replay on the record | Run one recorded fix chain in a sealed clone and in a plain worktree. The read log must show zero opens of the later fix, the finding tables or the board. | G2-F051, G2-F044, G4-F023 |
| 2 | Verdict script for each gate round | A script, plus check-slot time for the cited tests. | D14 | a replay on the record | For each closed P1 that cites a test, run it at the fix's parent: count assertion failures against collection errors. Score the 20-plus [M] recorded overstatements. False flags under 10 % [T]. | G4-F086, G1-F085, G2-F015, G4-F073, T-08, G2-F114 |
| 3 | Transcript audit at merge | A script. No tokens. | none | a replay on the record | Run it over the 10 and 11 November merges. It must find the unread final heads by itself and give a root-edit count per merge. | G2-F183, G2-F023, G3-F074 |
| 4 | One finding table | A script. No tokens. | D12 | a replay on the record | Parse the board: zero unmapped statuses, every dropped row explained, an open count over the 183 [M] P3 ids. | D-13, S-2, R-05 |
| 5 | Dry run with stand-in agents | A script. No tokens. | none | planted cases, not a replay | Planted cases only, because the testbed had no gate script: a reviewer that returns nothing, a crash, a refuted verdict, a reader of 'nobody' on a high-risk branch. None may reach merge. | S-3 |
| 6 | Merge queue that checks the commit | A script. No tokens. | D15 | a replay on the record | Record-only over the 65 [M] recorded merges, it must flag the unread heads of 10 and 11 November. Live: unread high-risk final heads from 5 of 6 [M] to zero. | G2-F118, G4-F232, G1-F196, G2-F041, G4-F068 |
| 7 | One fact, one command (in from phase 1) | A line in a brief. Free. | none | a baseline count, not a pass or fail | Count the environment facts in the root's 15 [M] lessons and the 21 problem statements that one command could check, and how many turned out wrong. This is a baseline. It passes or fails nothing. | G2-F180, G4-F152 |
| 8 | Resume check (in from phase 1) | A line in a brief. Free. | none | a replay on the record | For the 9 November mass resume, count sessions whose record disagreed with their branch. Zero means unproven: the check stays dormant. | G2-F054 |
| 9 | Fix-round clauses | One agent per finding that fails twice. It is the contract's fresh reviewer, not a second one. | none | a replay on the record | Under the seal, on the five late P1 fix commits: how many does the state-source line name? How many round-two findings state no failing condition? | G1-F170, G4-F081, G4-F088 |
| 10 | You read the marked lines | Your time at merge. | D16 | a live trial on three merges | The merge record names you and the commit you read. Your wait is logged against the idle hours of the stop problem. | G4-F140 |
| 11 | Short tool list for gate agents | A setting, after a with-and-without test. | D18 | a with-and-without test, not a replay | One context reading with and without the list. 20 runs [T] with zero refused writes. | G1-F157 |

## 5. Owner decisions

| Id | Decision | Phase | When | Kind | Options (the design's lean in bold) | Bottlenecks | Owner's answer |
| --- | --- | --- | --- | --- | --- | --- | --- |
| D01 | Go ahead with this plan? | all | now | decision | **Yes, start phase 1** / Phase 1 only, decide the rest later / Not now | – | Yes, start phase 1 (11 November) |
| D02 | Where does the off-machine copy live? | 1 | now | decision | **An encrypted external drive** / A private remote or a cloud folder / Both | B11 | An encrypted external drive (11 November) |
| D03 | Let Docker and the databases restart themselves? | 1 | now | decision | **Both, for two databases at most until the power-offs are diagnosed** / Docker only; the check starts its own database / Leave as it is | B10 | Not now. Docker's start at sign-in stays off (11 November) |
| D04 | Stop the PC sleeping while sessions hold work? | 1 | now | decision | **Yes, no sleep on mains power** / No | B05, B03 | Yes, no sleep on mains power (11 November) |
| D05 | Allow a sensor logger, and tell us about power cuts | 1 | now | input | **Allow one sensor logging tool** / Built-in counters only / Neither | B05 | A sensor logger and a debugger are both allowed (11 November). The power-cut notes are still to come |
| D06 | How do sessions come back after a stop? | 1 | now | decision | **A resume list waits for one message from you; the root releases two at a time** / Also probe whether a scheduled task may release sessions without you / Leave as it is | B03 | A resume list, released two at a time (11 November) |
| D07 | What is the token budget per window? | 1 | before the first replay | later | **Start from the one measured window and adjust after the November rerun** / Set your own figure | – |  |
| D08 | If the mains is the cause: a battery backup? | 1 | after the diagnosis | later | **Decide when the diagnosis is in** / Buy one now | B05 |  |
| D09 | Make the Linux container run the gate? | 2 | phase 2 | decision | **Yes; Windows runs only when the Windows-side tools change** / Run both on every gate / Keep Windows as the gate | B06, B18 |  |
| D10 | What may be cleaned up, and by whom? | 2 | phase 2 | decision | **The reaper lists; you approve each batch** / Automatic for merged and clean, after 24 quiet hours / Leave as it is | B15 |  |
| D11 | Who gives up memory? | 2 | after the memory table | later | One shared test database / A cap on the WSL2 machine / Close other applications during builds | B08 |  |
| D12 | What do P0 to P3 mean, and when does a finding go stale? | 3 | phase 3 | decision | **Second look only at money, stock, access, import and restore. A finding goes stale when the code it points at changes, never by age** / Second look at all of them | B21 |  |
| D13 | May agents write reports to one folder without asking? | 3 | phase 3 | decision | **Allow one reports folder, after the probe** / Keep asking each time | B16 |  |
| D14 | May the script's verdict replace the root's own reading? | 3 | after its replay | later | **Side by side for one wave, then decide** / Replace now / Never; the root reads every diff | B04, B12 |  |
| D15 | May a script merge, edit the board and refuse? | 3 | after its replay | later | **Record-only over the recorded merges first, then refuse on high-risk branches** / Refuse on every branch / Flag only, never refuse | B17, B13 |  |
| D16 | Will you read the marked lines of high-risk merges? | 3 | phase 3, late | later | **Try it on three merges and log the wait** / Skip | B17 |  |
| D17 | Hooks stay off? | 3 | phase 3 | decision | **Stay off** / Re-open for two uses | B12, B14 |  |
| D18 | A short tool list for gate agents? | 3 | after its test | later | **Adopt only on a measured drop** / Skip | B04 |  |
| D19 | A second vendor's model in the review replay? | 3 | not now | later | **Not now; run the same-model arm only** / Approve, after the sealed replay exists | B17 |  |
| D20 | Replay three candidate fixes per recorded chain? | 3 | after the contract's replay | later | **Not yet; decide after the contract's replay** / Run it once the seal exists | B01 |  |
| D23 | What must the index replay show? | 3 | before the index replay | later | The marks the refuter suggested / Set your own marks / Skip the replay | – |  |
| D21 | Rehearse on a real host? | 4 | phase 4 | decision | **Free steps with you present, then rent a host for a day** / Free steps only, for now / Wait | B19 |  |
| D22 | Try the earlier compaction window? | 5 | phase 5 | later | **Try it on one wave, and call the result an anecdote** / Skip; work on one phase per session and a smaller pre-read first | – |  |

Seven of the 21 problems wait on a decision from you. The cards below split some of those into separate choices and add the ones the mechanisms raise. That makes 23 cards. Only six are needed to start.

## 6. One budget

The refuter added it up: a fresh reviewer per fix round, gate workflows, a final-head reviewer and several replays, all at once, would recreate the stops. So everything that adds an agent is listed here, with what it really costs.

**Ceiling, as measured.**

- Ten lanes at once died in about 15 minutes [M].
- Two at a time got further: 18 of 48 [M] agents finished in one window. A lean run finished 30 of 31 [M].
- One five-hour window covered about 3.4 million [M] subagent tokens.
- October had 14 [M] limit episodes, and subagents caused 91 of 104 [M] of the limit errors.
- Every agent pays about 70,000 tokens [M] before it does any work. For scale, the fixed cost of about 48 [I] agents fills one such window.

| What v2 adds | What pays for it | Net |
| --- | --- | --- |
| A fresh reviewer per fix round | New spend. The old third round was the root reading alone, with no agent. Capped at one per round and two rounds. It is the same agent mechanism 9 calls in after two failed fixes, not a second one. | added, capped |
| A gate workflow with two reviewers | The root already briefed two reviewers per gate in round one. They now run outside the root. Two agents at a time at most. | same count |
| A final-head reviewer on high-risk merges | Only when the branch changed after review, and only the change since the reviewed commit. Counted in that gate's budget. | added, rare |
| Replays | One-off, outside build hours, two lanes at a time, with a token budget written before launch. On record: about 14 [E] reviewer runs for the review replay (half without a second vendor), two runs for the seal's own test, four chains for the contract, five commits for the clauses. | one-off |
| Two write probes | Twenty short runs each: one for reports on disk, one for the short tool list. | one-off |
| Reruns at the commit before the fix | No agents. Only the cited tests, inside the round's one lock hold. | check time |
| The first-use walk in every gate | No agents. It adds 2 to 3 minutes [E] of check time per gate run. | check time |
| Your read of marked lines | Your time, on three merges, batched at your turn. | your time |

**Left out.** Three candidate fixes per recorded chain, chosen by a test written first. Not run unless you switch it on. A trial of graph recall that needs 40 [E] agent runs. Not in v2. The index replay comes first and spends none. A second vendor's review pass. Not now.

**Rules.** Scripts that spend no tokens come first. One agent-adding change per window. A written token budget before any launch, set in phase 1 from the one measured window. Lanes two at a time. State on disk. Stop starting agents after the first empty result. No harness agents while a FixFlow phase is running or waiting on its reviewer.

**Unknown.** Nobody knows how re-read tokens count against the plan's limit, and the three-day stop was a power-off. So this budget keeps v2 from adding stops. It does not promise fewer.

## 7. Conflicts between ideas and the rule that settles each (compile §9.5)

| Pull | Against | Rule | Where |
| --- | --- | --- | --- |
| Reruns at the commit before the fix | one check slot, where waits reached 2,030 s [M] | Only the cited tests are rerun, inside the same lock hold as the round's one full gate. Never a second full check. Replays run outside build hours. | Mechanism 2 |
| Refusals and owner reads | fewer waits for you | A refused merge or a mismatched resume parks only its own slice. Your reads are batched at your turn. The wait is measured on the three-merge trial. | Mechanisms 6, 8, 10 |
| A short tool list | refused writes, which a list without Write caused | The list always keeps Write for the report folder. 20 runs [T] with zero refused writes are part of its pass mark. | Mechanism 11 |
| A fresh agent after two failed fixes | the one budget, at about 70,000 tokens [M] fixed per agent | That agent is the contract's fresh reviewer, not a second one. Nothing in either list offers a cheaper checker to pay for more review. | Mechanism 9 |
| Non-blocking notes | the 183 [M] findings that were carried as notes with no status | A note exists only as a finding record with a status from the one table. | Mechanisms 4, 9 |
| A reader field that is merely filled in | reports that overstate | The field must match the commit in the typed verdict and the transcript audit. | Mechanisms 3, 6 |
| An advisory check | a refusal | The same check at two strengths. Record-only first. Refusal after you decide. | Mechanism 6 |
| A short tool list | the context trials that showed no gain | It cuts fixed overhead and restores nothing. It is adopted only on a measured drop. | Mechanism 11 |

## 8. Not built

- **Thought structures.** Their measured gains are on puzzles with a 2023 model. At equal compute, plain sampling matches them. They multiply calls against the limit and checks against the queue. Not built: A tree, forest or graph layer in prompts; A tree-search agent with a model as judge; A vote over reviewers' findings (the union is kept: most real defects are found by one reviewer); Debate loops; A model merging slices or documents; One full check per candidate fix; More review rounds as the cure for bad fixes. Kept: a test written first and a scripted guard removal for every single fix. Yours to switch on later: a replay of three candidate fixes per recorded chain.
- **Graph and memory machinery.** The reason is the outside evidence and this PC's memory. A graph built by a model costs far more than a plain index and often does worse than plain search. The one large gain on record was measured against the full context, not against an indexed table, and its benchmark is disputed. A graph server needs memory this PC does not have. The testbed's own result is not the reason: its one context trial, a compaction adapter on another project, used 6 to 17 % more [M] tokens for the same recall, and no index or graph was ever tried there. Not built: A knowledge graph extracted by a model; A graph database server on a PC that is short of memory; Embeddings or a vector index; A memory layer that pushes context into sessions; Expiry by age; Rules that rewrite themselves; Any map or store, before the testbed's own frozen validation contract has been run. Kept, as two small scripts: a generated 'what is true now' board, and a touch list for each fix. The list is dropped if it fails its test on the ten recorded cases. And one candidate trial at zero tokens: the index replay in phase 3.
- **From the idea lists.** They fit FixFlow, or add nothing here yet. Not built: The 58 [M] ideas that only fit FixFlow's ship plan. They keep their standing there; A second vendor's review pass (idea G4-F084 in the Horthy list). Not now: code would leave your machines; The testbed's context system, corpus map and measurement system. Built or designed, no gain shown; Hooks. Yours to re-open; The knowledge store (PR #183). Its own track.
- **What v2 does not solve.** Stated so nobody assumes otherwise. Not built: Switching the PC on and signing in while you are away; The cause of the power-offs, until the diagnosis runs. If it is the mains, the fix is hardware and a later decision; How re-read tokens count against the plan's limit; A human reviewer other than you; Proof of the load limits without a real host.

## 9. The six demos on the page

Each demo explains a mechanism and lists its assumptions on screen. None is a result.

- **A power-off.** What happens after the PC loses power. Left: what the record shows for 6 November. Right: the same stop with phase 1 in place.
- **The check queue.** Sessions that all want the check at the same moment. Change the gate, the slots and how sessions are released, and watch the waits.
- **A fix round.** Left: one recorded chain, the cutoff guards, step by step. Right: the clause of the fix-round contract that would apply at that step.
- **A merge nobody read.** A branch is about to merge. Set who read its final commit and see what the merge queue does.
- **Where the tokens went.** November's 4.25 billion [M] cache-read tokens, by kind of session and by how large the context was on each call.
- **The root as the only gate.** Five slices finish. Left: every review, merge and board edit passes through the root. Right: a gate workflow and a merge queue do the mechanical part.

## 10. Limits

- Every proof on this page is a proposal. Nothing here was run against the testbed except the token tally and the PC's own logs.
- The record does not say how many sessions were released at once on 9 November. The queue demo uses a number you can change.
- The container run was built in the last week of the testbed. A replay at an older commit may have to use the Windows check.
- The transcript audit and the token baseline need the November transcripts. The app's clean-up setting is not set in the user settings file on this PC (read on 11 November), so a default applies. The documented default is 30 days; that is not verified here. Phase 1 copies the transcripts first.
- The high-risk list (money, stock, access, import, restore) is a proposal. The testbed never named one, so the count of 5 of 6 is a mapper's tally.
- Not yet named: which files count as the gate's own settings. Not yet checked: whether the reviewer briefs for the seven known misses still exist.
- What fills the session windows is estimated from the transcripts, not counted directly. The figures are exposures for an index, not savings.
- Effort figures are the mappers' estimates from the compile's evidence, added up here. They are guesses.
- The compile was made by models reading records. Its own limits (sections 8 and 9.7) carry over to this design.

## 11. Sources

- docs/program/HARNESS-BOTTLENECKS-2026-11.md (the compile; untracked)
- docs/program/evidence/harness-bottlenecks/ (machine-facts.md, tally-output.txt, sweep-cards.txt, map-full.txt, refute.txt, fit/)
- docs/program/evidence/harness-v2-design/read/ (four fact sheets with file and line for the figures used here)
- docs/program/evidence/harness-v2-design/refute-fidelity.md and refute-design.md (two refuter passes over this design, and what was changed)
- docs/program/SHIP-PLAN-2026-11.md section 0 (rules this design must not break)

## 12. Numbers

Every number in this file carries a tag. The full list of 139 numbers with their sources is generated beside the build script: `docs/program/evidence/harness-v2-design/numbers.md`.
