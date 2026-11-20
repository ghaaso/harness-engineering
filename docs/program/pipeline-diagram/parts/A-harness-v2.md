# A: harness v2 (parts list). Docs: D = HARNESS-V2-DESIGN-2026-11.md, A = architecture.json, J = design.json, S = harness-v2-status.md
Overall status (S): no v2 part was built or run. Only read-only measurements (token tally, shutdown join, repo check) and the model page exist. "designed only" below means that unless said.

## Parts
Planner | works out before work starts which tasks can run side by side and how many parallel workers are worth it | in: plan (slices, declared files, needs, shared things); library footprints and rates | out: waves and lane count to Scheduler; predicted speed-up and binding limit to owner | when: planning | status: designed only | src: D s0, A parts
Plan check: declarations | every task declares files it writes (footprint), what it reads from others, tasks it needs first, shared things (migration number, shared doc, port, database), risk (money, stock, access, import, restore), model, size | in: the plan file | out: input to the plan-check graphs | planning | designed only | D s0
Plan check step 1: refuse no footprint | rejects any task with no declared files | planning | designed only | D s0
Plan check step 2: two graphs (needs, collides) | builds who-needs-whom and who-collides-with-whom (same file, same shared thing, undeclared read-after-write; plus files that changed together) | in: declarations, library edges | out: graphs | planning | designed only (co-change edges unvalidated, 432 commits) | D s0
Plan check step 3: shortest finish | lays tasks out so the longest chain of needs (weighted by size) is the floor; re-split only if it shortens that chain | planning | designed only | D s0
Plan check step 4: lanes below the knee | computes worker count from the four limits and memory and runs about 0.8 of the knee | out: lane count | planning | designed only (inputs partly guessed) | D s0
Plan check step 5: name the limiter | states what limits the plan and the one change that would lift it | out: owner | planning | designed only | D s0
Plan check step 6: refuse bad plan | refuses a plan with two writers of one file or more lanes than computed | planning | designed only | D s0
Plan check step 7: start-on-merge rule | a task starts as soon as what it needs is merged and nothing running collides; running lanes = lower of planner and governor | doing | designed only | D s0
Plan check step 8: footprint breach and write-back | gate refuses a branch that changed files outside its footprint until plan amended; after merge the real footprint goes to the library | checking, after | designed only | D s0
Scheduler | turns the plan into running sessions, parks waiting ones, brings sessions back after a stop | in: waves (Planner), lanes allowed (Governor) | out: sessions to Lanes; resume list to owner | planning/doing | designed only (resume list "not started") | D s0, A
Scheduler: one session per slice in own worktree/branch/port/database | isolation per task | doing | designed only | A
Scheduler: release two at a time; waiting is parked | stops the pile-up | doing | designed only | A, D loops
Scheduler: failed lane returns slice to backlog and re-plans | recovery | doing | designed only | A
Scheduler: resume list at sign-in plus resume check (mechanism 8) | after a restart lists mid-work sessions; a session whose record disagrees with its branch lists stray commits and parks | in: session record, branch | out: resume or park | after a stop | designed only (owner chose "list, two at a time") | D phase 1, mech 8
Governor | keeps the token window from stopping everything | in: burn per lane by model (library); free memory and check peak (logger) | out: lanes allowed now to Scheduler; ceilings and tool lists to sessions | always on | designed only; needs an unmeasured fact (how re-read tokens count against the limit) | D s0, A
Governor: one token budget per window (lanes, reviewers, replays together) | one written budget before any launch | planning | designed only (figure D07 unanswered) | A, D s6
Governor: slow lanes when burn would exhaust window | slows instead of hard stop | doing | designed only | A
Governor: learn window size from every limit message | estimates the unknown window | always on | designed only | A
Governor: context ceiling about 367k per model | no call re-reads more than that | doing | designed only / trial | A
Governor: fallback to fixed two lanes if estimate wrong twice | safety net | doing | designed only | A
Lanes | each lane is one session on one slice that asks the library before exploring and leaves results on disk | in: brief, branch, library answers | out: branch and claims file to Gate; solved problem to library | doing | designed only | D s0, A
Lanes: one phase per session | small starting context | doing | designed only | D tokens
Lanes: ask library first | one command before reading the code | doing | designed only, unproven | A
Lanes: reports on disk (path, hash, short summary) | writes full reports to one allowed folder | doing | designed only (probe not run) | D phase 3
Lanes: claims file | slice commits what it claims and the test proving each claim | doing | designed only | A
Gate | decides if a slice is good with tests it runs itself | in: branch, claims; library touch data and open findings | out: verdict to Merge queue; findings to Lanes and library | checking | designed only | D s0, A
Gate: container check as the gate | full test run in a Linux container (230 s vs 367 s on Windows); Windows only when Windows-side tools change | checking | designed only (D09 unanswered; container run exists, not as gate) | D phase 2
Gate: slots from one measured number | how many checks run at once, set from one check's peak memory (never measured) | checking | designed only | D phase 2
Gate: fair queue with printed place | checks wait in order and show position | checking | designed only | D phase 2
Gate: heartbeat | check writes waiting/running/stalled, dumps worker stacks on stall; stall limit lowered only after 20 loaded runs | checking | designed only | D phase 2
Gate: verdict script (mechanism 2) | script checks each claim (test exists, ran, fails without the fix) and writes a fixed-format verdict naming the commit | in: claims, tests | out: typed verdict | checking | designed only (replay not run) | D s4
Gate: finding closes only on a test that fails before the fix and passes after | no closing on prose | checking | designed only | A
Gate: fix-round contract (mechanism 9, loop R1) | max two rounds; red gate means revert not patch; fresh reviewer after two failed fixes; third failure back to planning; block only on a stated failing condition; new stored state names its source of truth and how it ends | checking | designed only / trial | D s4, A
Gate: touch list | scripted list of what a fix touches (callers, co-changed files, covering tests); dropped if fewer than 6 of 10 recorded cases fit or over 15 files | checking | designed only (test never run) | D phase 3
Gate: gate workflow (reviewers outside the root) | two reviewers run as a saved workflow, write reports to disk, return typed verdict | checking | designed only (never built; probe first) | D phase 3, S
Gate: zero-seed walk | on a fresh container database: install, first user, tills/accounts, import, one transaction, close of day; plus test that seeded record kinds can be created in production | checking | designed only; adds 2-3 min per gate | D phase 4
Gate: footprint-breach refusal | see plan check step 8 | checking | designed only | A
Gate: final-head reader record (B17) | each merge records who read the final commit; high-risk branch cannot merge on "nobody" or "own session" | checking | designed only | D B17
Gate: high-risk list | money, stock, access, import, restore trigger a second look | planning/checking | idea only (a proposal, D12) | D s10
Merge queue | the single serial step: one script, one lock | in: verdict naming a commit | out: merged work; real footprints and timings to library | landing | designed only (record-only first) | D s0, A
Merge queue: merge only if verdict names exact commit | blocks unread or changed heads | landing | designed only | A, mech 6
Merge queue: one check on merged result | landing | designed only | A
Merge queue: apply generated board, flag dirty worktree | nobody edits the board by hand | landing | designed only | A, mech 6
Merge queue: record actual footprint and timings | feeds library | landing/after | designed only | A
Generated board | short "what is true now" view built from per-slice state fragments (221 KB doc to under 20 KB) | in: state fragments | out: board for sessions and owner | landing | designed only | D phase 3
Finding table (mechanism 4) | one table of severity (P0-P3) and status words; parser built from it; every row counted; open count over 183 minor findings | after | designed only | D s4, B21
The library | harness memory: four kinds of fact, written when something becomes true, asked never pushed | in: verdicts, findings, footprints, timings, solved problems | out: footprints/rates to Planner, burn to Governor, answers to Lanes, touch data to Gate, board to owner | always on | designed only, unproven (never tested) | D s0
Library: what is true now | slices, verdicts, findings, decisions with commit valid from/until | designed only | A
Library: what a change touches | imports, covers, changed-together, declared vs touched | designed only (index replay first) | A
Library: solved problems | symptom, cause, failed attempts, fix, check with a control pair | designed only (builds on knowledge-store PR #183) | A
Library: measured rates | check time, waits, tokens per lane-hour by model, rounds per slice | designed only | A
Library table journal | one unchangeable file per event in git; SQLite rebuilt from it | designed only | A
Library tables entry/handle/footprint_item, state, edge, rate, lookup | solved problems and keys; work state; code edges; measured numbers; log of each lookup (hit/miss, tokens) | designed only | A
Library lifecycle: Candidate, Valid, Stale, A check | written by solver, proved by reviewer, trusted when valid, stale when its files change (never by age), valid again when its check passes | designed only | A library.flow
Library: lessons become checks | entry seen three times proposed as lint/test/gate clause; owner decides; entry then retires | designed only | A
Library: misses written down | when a session re-solves what the library held, miss and cause recorded, keys fixed | designed only | A
Library: lookup command | answer at most about 860 tokens with proof; every lookup counted; stays on this PC | designed only | A
Library: stop rule | stop if under 3 verified hits in 20 encounters or 8 weeks | designed only | D
Index replay | at zero tokens, replay recorded windows with an import-and-caller index to see if it would have answered read-only calls | in: transcripts, clinic repo | out: go/no-go for a live trial (marks 3% tokens, recall 0.8, D23 open) | before library | designed only (never run) | D s0
The machine (substrate) | power, restart, off-machine copy, one always-on logger | out: memory and check peak to Governor | always on | designed only; phase 1 partly done read-only | D s0, A
Machine: off-machine copy | verified bundle of all branches, nightly copy incl. uncommitted work, transcripts, evidence | designed only (drive not plugged in) | D phase 1
Machine: restart chain | Docker and databases start at sign-in (owner said not now); check starts its own DB | designed only (D03 declined) | D phase 1
Machine: sensor logger and shutdown diagnosis | log temperature, power, memory by process group; join 24 power-offs to commits; decode crash dump | partly built (join done, logger not installed) | D phase 1
Machine: no sleep on mains while sessions hold work | settings change | designed only (waiting on owner) | D phase 1
Machine: memory table | who holds memory when short; then choose shared DB, WSL2 cap, or close apps | designed only | D phase 2
Machine: reaper | lists merged clean worktrees and containers (skips last 24 h); owner approves each batch | designed only | D phase 2
Machine: real-host rehearsal | fresh-machine restore, first-deploy checklist, off-site push, alert with planted failure, then rented host for a day | designed only | D phase 4
Load rerun | rerun 12-user drill on current main; bulk generator to 250,000 stock movements; rerun on rented host | designed only | D phase 4
Token baseline | per-slice token tally of November transcripts, saved early | built and measured (zero tokens) | D phase 1, S
Token budget (phase 5) | per-slice tokens and limit events; levers: slice sessions, fixed cost per agent (about 70,000 tokens), the root | designed only | D phase 5
Compaction-window trial | set compaction window for Sonnet slice sessions for one wave; result an anecdote | designed only (owner moved to 300k on 14 Nov; no result) | D phase 5, S
Stock-and-flow model (page) | simulation of backlog, work, check, review, merge, tokens, context, library entries with switchable controllers | built (output illustrative only) | D s0
Mechanism 1 sealed replay | replay in a clone that cannot see later commits or the answer key | designed only | D s4
Mechanism 3 transcript audit | script reads tool records to see who read the final head and counts root edits; blocks nothing | designed only | D s4
Mechanism 5 dry run with stand-in agents | run gate/merge scripts with fake agents that return nothing, crash or disagree | designed only | D s4
Mechanism 7 one fact, one command | check an environment fact by a command before it becomes a rule | idea only / free rule | D s4
Mechanism 10 owner reads marked lines | owner reads changed lines the reviewer marks on high-risk merges (trial on 3 merges) | designed only | D s4
Mechanism 11 short tool list for gate agents | gate agents load fewer tools (tools are 34k of 70k); always keeps Write | designed only (with/without test) | D s4
Token methods (10 rows) | context ceiling (trial); route by window as well as price (comparison, not trial); one phase per session; small standing context; ask do not read (unproven); results on disk; no waiting inside a session; fewer rounds; scripts before agents; lanes at the knee | various | designed only / trial | D tokens
Standing rules | ship plan first; one budget (two lanes, written budget, one agent-adding change per window, state on disk); script before agent; replay before live; one fact one command; owner's yes for anything reaching outside | always on | designed only | D s2
Replay-before-live / record-only mode | a refusing script first only records what it would do | always on | designed only | D s2
Owner decisions D01-D23 | D01-D06 answered 11 Nov; D07-D23 open | always on | as stated | D s5
Not built: thought structures (trees, debate, voting, model merging), knowledge graph by a model, graph DB server, embeddings/vector index, memory layer that pushes, expiry by age, self-rewriting rules, second vendor review, hooks | rejected for evidence/memory reasons | dropped | D s8
Not solved: PC on while away, cause of power-offs, how re-read tokens count, other human reviewer, load limits without real host | stated gaps | - | D s8

## Flow
1. Request arrives; owner's plan lists slices with declared footprint, risk, size (plan check declarations).
2. Planner: refuse missing footprints, build needs/collision graphs (library adds co-change), lay out waves, compute knee, run about 0.8 of it, name the limiter, refuse bad plans.
3. Governor sets token budget and lanes allowed; lanes running = lower of Planner and Governor.
4. Scheduler starts a session per slice in its own worktree, two at a time, as soon as needs are merged and nothing collides; waiting slices are parked.
5. Lane asks the library, works one phase, writes reports to disk, commits code and claims file.
6. Gate: container check in fair queue (heartbeat), verdict script, touch list, zero-seed walk, footprint test, reviewers in the gate workflow; fix rounds max two, revert not patch.
7. Verdict naming the exact commit goes to Merge queue.
8. Merge queue: lock, merge, one check on merged result, apply generated board, flag dirty tree.
9. After: real footprints, timings, findings, solved problems written to the library (journal, state, edge, rate); stale entries marked; rule-of-three lessons proposed as checks; predicted vs real finish corrects rates.
10. Always on: Machine (copy, restart, logger), resume list and resume check after a stop; Governor slows lanes.

## Loops
R1 fix spiral: share of reviews sending a slice back (64%, 2.8 rounds); contract caps rounds; amplifies unless capped.
B1 check capacity: slots divided by check time; queue forms; steadies.
B2 serial gate: review and merge one at a time; caps throughput; steadies (a limit).
B3 limit stop: tokens used vs window; governor slows lanes; steadies (without it, all stop at once).
R2 context growth: each call re-reads and grows context; ceiling 367k and one phase per session; amplifies.
R4 pile-up: waiting lane holds context, burns tokens, stop sooner, mass release; two at a time and parking break it; amplifies.
R3 library compounds: entries written per merge, less reading, more slices per window; amplifies (unproven; costs more with few entries).
B4 staleness: entries whose files change are untrusted until re-checked; steadies.
B5 lanes at the knee: lanes past the lowest limit add only queues; planner runs below knee; steadies.
Also: planner prediction vs real finish corrects the rates (rates replace guesses); steadies.

## Jargon
root: the one orchestrator session that reviews and merges.
slice: one piece of the product built by its own session.
lane: one session running alongside others.
gate: the check plus review a branch must pass.
the check: the full test run (about 2,500 tests).
slot: how many checks may run at once.
knee: lane count past which more adds nothing.
footprint: the files a slice will write.
wave: slices that can run together.
token window: usage limit that resets every five hours.
context / re-read tokens: what the model re-reads on every call.
compaction: swapping a full context for a summary.
worktree: separate working copy of the repository.
verdict (typed): fixed-format result naming the commit read.
final head: last commit on a branch.
record-only: writes what it would do, blocks nothing.
replay / seal: rerun on history; sealed clone sees no later commits.
refuter: model whose job is to disprove a claim.
heartbeat: file showing waiting, running or stalled.
parked start: session created but waiting for a go.
P0-P3: finding severities; P1 blocks merge.
stand-in agent: fake agent used to test scripts.
touch list: files a fix touches.
state fragment: small per-slice state file.
zero-seed walk: install on an empty database, walk first use.
journal: unchangeable event files in git.
[M][S][T][E][I]: measured, setting, target, estimate, illustrative.
clinic / testbed: the earlier project the record comes from.

## Unclear
- Window size: D says about 2.5 lane-hours [E]; model slider starts at 30 [I]; refuter said tokens then bind at about 2 lanes.
- Compaction trial: D says 400k; owner moved to 300k on 14 Nov (S); 367k also used as the ceiling.
- No hooks (D17), yet no stated runner for the gate workflow; it was never built (S).
- Who writes "stale by code change" is only partly named (lookup command and merge script); refuter said no writer.
- Planner re-plan after a lane fails: stated, mechanism not described.
- Flaky-test rule for mechanism 2 not written; "which files are the gate's own settings" not named.
- Governor mechanism unspecified: how to read the window without knowing how re-reads count.
- D summary says six builds and four diagnoses; its tables say seven and three (D follows tables).
- Owner decisions D07-D23 unanswered, so many statuses are conditional.
