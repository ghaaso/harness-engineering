# F: running many agent sessions at once

Status words: built and measured / built / designed only / hypothesis, untested / dropped. "Tree" = the research tree (scripts in research-tree/tcb/, a node is a session). "Build" = the tree that builds those scripts (ORCHESTRATION.md). Format per part: name | plain | borrowed from | in | out | when | status | src.

## Parts

### A. The seven borrowed designs of the tree protocol (protocol v2 section 1; "58 rules", R1-R58, plus R59-R60 added in section 16)
1. Layer 1 Execution | one coordinator keeps a task table, starts numbered attempts of each task, commits each atomically and re-runs from the last commit if one dies | borrowed from: MapReduce master-worker (Dean-Ghemawat), Erlang/OTP supervision tree, crash-only software, batch-scheduler admission (O'Neil escrow), watchdog + Mesa-monitor wakes | in: task list | out: committed task results | when: always on | status: built (24 scripts, 965 tests pass); not run on a real pilot | src: protocol s1-2, s16
2. Layer 2 Storage | everything is written once, never edited; each step's outputs become visible only via one commit record; people read rebuilt views | borrowed from: append-only content-addressed multi-version DB (ARIES/MVCC), views, Shake build traces, truth maintenance | in: staged files | out: store objects, ledger | when: landing a change | status: built | src: s3
3. Layer 3 Integrity | a small trusted checker alone promotes facts; sessions are labelled by what they read; each role gets least privilege | borrowed from: Clark-Wilson, Biba low-water mark, Anderson reference monitor, Saltzer-Schroeder least privilege | in: session outputs | out: labels, promotions | when: always on | status: built (hook behaviour needs real app, unverified) | src: s4
4. Layer 4 Evidence | research questions frozen first, searches logged, certainty set by a script ceiling | borrowed from: Cochrane rapid systematic review, GRADE, PRISMA, Chapman capture-recapture | in: question list | out: graded evidence tables | when: planning/after | status: built (scripts); "later" parts designed only | src: s5 (research content, little relevance to code building)
5. Layer 5 Assurance | every check has a measured detection rate by planting known faults; three results pass/fail/not-run | borrowed from: IEEE 1012 independent V&V, error seeding (Mills), mutation testing, acceptance sampling (Dodge-Romig) | in: checks | out: detection rates, certificates | when: before use/after | status: built | src: s6
6. Layer 6 Shape and cost | work is cut so what must share a context window fits one node; hand-over timing by a square-root law; load control | borrowed from: B+ tree bulk load at fill factor, Young/Harris square-root (economic order quantity), Denning load control, Smith's rule, internal pilot | in: per-question token costs | out: tree plan, W*, budgets | when: planning | status: pilot form built; bulk load/plan-tree "later" designed only | src: s7
7. Layer 7 Completeness | find what the design misses by two blind analyses and a model check | borrowed from: STPA (Leveson), FMEA matrix, capture-recapture (Chao), model checking with faults (Holzmann), FRACAS | in: design cut | out: hazard list, gate | when: before the first unit | status: model built, verdict blocked/idealised (see Unclear) | src: s8

### B. Tree: execution rules
- R1 One run lock | one lock file guards every shared write; stale locks broken only by verified rename | lost update/mutex | in: write request | out: serialised writes | when: always | built | s2
- R2 Attempts, epochs, fencing | every start of a task raises its epoch; only output of the current epoch is accepted | fencing token (Kafka leader epoch, Chubby) | in: staging folder | out: accepted or logged "zombie" | landing | built; races open | s2
- R3 Step machine in the task row | start/replace goes fenced, stopped, admitted, started, bound; each script acts only if the row is at the named step | saga/recorded intent reconciled with the world | in: row | out: next step | admitting | built | s2
- R4 Watcher (watch.mjs) | a script that reads state, decides and exits so the sleeping coordinator wakes; checks stalls, spend, memory | watchdog, event loop | built | s2
- R5 Progress not liveness | a task is "stalled" if c model calls pass with no drop in remaining work V; "hung" if h ticks pass with no new call; loop = same call 3 times | variant function, logical supervision | while a unit runs | built; c,h guesses | s2
- R6 Level-triggered wakes | a wake is only a hint; coordinator re-reads status file; watcher plus an alarm are two wake sources | Mesa monitors, lost wake-up | built; both lost = owner only | s2
- R7 One restart path | first start, stall, crash, hand-over, fresh review all run replace.mjs | crash-only | built | s2
- R8 Restart limit | a failed task replaced at most once (R=1); host reboot not charged; two failures in W_cc halt admission | OTP restart intensity, beta factor | built | s2
- R9 Stopping (stop.mjs) | fence first, then check 2 ticks that transcripts stop growing, count zombie spend | orphan processes | built; stop not confirmed on real app | s2
- R10 Admission per task (admit.mjs) | start only if dependencies committed, protocol hash, gate passes, selftest passes, free slot (N_max 2, never above 3), memory covers one session, reservation allows it | load control, admission reservation, quotas | admitting | built | s2, s16 M4
- R11 Spend by script, stop by coordinator | watcher computes spend from transcripts; tell child to commit at 0.8e, stop near the limit | quotas/rlimit | while running | built | s2
- R12 Coordinator state and hand-over (drain) | from W*_coord (133.2k tokens) coordinator starts nothing, waits for quiet, owner starts a successor | checkpoint, snapshot from log | after | built; owner step | s2, s16 R59
- M1-M6 model-check fixes (alarm re-arm by token; reconcile asks for alarm; act-due watcher class 17; zombie slots counted; pause discount; READY wins over fence) | s16 point 2 | built
- R59 coordinator hands over early (before long waits above W*) | built (rule) | s16. R60 restart trusts only a stage's own record | build practice | s16
- Open defects list (possible wake loop; stale coordinator can start second session; READY races fence; slow call taken as hang; one dead turn leaves no wake; weak model properties) | s16 point 2

### C. Tree: storage, integrity, assurance (single lines)
- R13 one writer per file; R14 commit protocol (first commit record wins); R15 harvest never retype; R16 correction not deletion; R17 packs frozen; R18 citations as foreign keys; R19 tms.mjs labels with staleness; R20 views incl. the seven measures; R21 declared inputs; R22 read audit; R23 fsck store check | all built | s3
- R24 two trust classes; R25 witness by script (snap/witness; needs F5 fetch script); R26 narrow judge interface (checker); R27 labels computed; R28 trusted base pinned by owner commit hash; R29 least privilege enforced twice (settings + guard-hook); R30 typed status notes (TURN-END); R31 hash-chained ledger; R32 reader returns schema-checked | built | s4
- R33-R39 evidence rules (frozen protocol, search log, held-out seed recall, certainty ceiling (later), agreement never raises claim, dismissal bar, frozen analysis plan) | built except R36 later | s5
- R40 three values pass/fail/not-run; R41 scripts self-tested incl. hook canary; R42 seeded faults; R43 cited cards fully checked; R44 certify an expert; R45 action line per measure | built | s6
- Role table: reader, checker, child, fresh reviewer, coordinator, scripts (tools/reads/writes) | s4

### D. Tree: shape, cost, completeness
- R46 key space (one owning field per question id) | built
- R47 bulk load (plan-tree.mjs) at fill 0.75 | designed only (after pilot)
- R48 overflow in tree order: (a) hook budget check later, (b) pack out of line, (c) move cross-field key later, (d) leaf split with separator later, (e) owner drops range | mostly designed only
- R49 roll-over is not a split | designed only (only under option b)
- R50 hand-over interval W* = P+S+sqrt(2*H0*g) | borrowed: Young/Harris square root | built for coordinator; measured on stand-in inputs
- R51 order of work by Smith's rule | later; R52 budget from internal pilot (cost.mjs --from-transcripts) | built script, applied after pilot; R53 stated prediction for the tree vs one session | built
- R54 two blind analyses (STPA, FMEA) on a design cut; R55 map + gate.mjs; R56 residual estimate is a reading (never a gate); R57 protocol model (breadth-first search with faults); R58 incidents as ledger lines (fracas later) | built; gate blocked by model verdict
- Pilot comparisons: tree vs one session (Comparison 1, P18), same-window vs fresh review (Comparison 2, F1) | designed only, not run | s11
- "Left out on purpose": backup tasks, consensus, two-phase commit, distributed locks, same-model voting, bidding, a DB engine | dropped | s10
- Deleted: SPRT, pause detection (later reinstated as M5), watcher deadline exit, stored escrow, meter 20% halt | dropped | s10

### E. The 13 fixes (research-tree/FAULTS-AND-FIXES.md; table in BUILD-IN s2 adds 0b). All designed only, not built.
FX-OUT outcome log (a finished child's result is not thrown away by a racing fence; write-ahead log + commit record last) | FX-CLAIM one claim per attempt (a leased start counts as running; stops two sessions for one attempt) | FX-CGATE coordinator hook (hook refuses a session start admit did not grant; stops a stale coordinator) | FX-CLOSE release a finished child (slot freed only after verified close) | FX-REDO missing ledger line | FX-PLAN planner (planAct computes next legal actions from files; stops repeated start acts) | FX-W1 liveness markers | FX-W2 alarm slots (wake slots, Mesa hint) | FX-W3 armed before work (requireArmed) | FX-W4 dead-man alert outside the tree | FX-W5 re-raise act-due (at-least-once, idempotent) | FX-W6 per-kind deadlines | FX-W7 watcher lock. Plus 0b strict hook write (exclusive create; lets 8 builders work at statement grain). Size: 14 units, 4 large (OUT, CLAIM, CGATE, W4), 52 tests. src: FAULTS-AND-FIXES; BUILD-IN s2.
- The 7 faults they fix: result thrown away by fence race; two sessions for one attempt; finished child holds slot for ever; stale coordinator starts session; one dead turn leaves no wake; healthy slow call taken as hang; due act raised once only.
- Two facts to measure first: does a hook input carry session id; can a coordinator start a session on a turn the owner did not type (app refused it on 2026-11-17).

### F. The decision rule v2 (DECISION-RULE-v2.md). Status for ALL clauses: hypothesis, nothing run or measured; no number set.
- Step 0 per-class measurement | keep busy threads, peak memory, time in/outside check, window use per kind of unit; predict next = mean of last two; cap is a limit not a prediction
- Step 1 widths | how many units can run at once = the smallest of: memory (hard), processor, bandwidth, ready work, the check (binds when N*S/c reaches a worker's cycle), each token window, parent's window (children per epoch b <= (g*k* - own growth)/s_summary) | borrowed: min of limits (bottleneck analysis), bid-price control (revenue management)
- Token window clause: reserve for running units + protected later demand (owner's own use); price zero while the queue fits, else bid price; stand-in = re-plan at (1-u)/(1-s) of even rate until Q37 measured (Decision 1)
- Step 2 run at the smallest width; start only if it fits every window
- Step 3 act only at the gate, show budget in prompt; two stops: memory floor, unit at own cap (Decision 5: commit-and-end = checkpoint then end; successor resumes; designed only)
- Step 4 next unit | fit is a filter; inside short window value per token above price; oldest held unit first at reset (Decision 2); waiting for memory/check: reservation for oldest, shorter units backfilled if they do not delay it | borrowed: EASY backfilling; one-worker units: shortest expected check first, then oldest, age cap; speculative copy only if time saved worth tokens
- Steps 5-6 standing queue at the check is the signal; throughput vs workers is slow outer check (>= 6 points)
- Step 7 the check's levers (no order until Q21, Q05, Q07): shorten run, batch waiting (cap p), test ahead, let waiting worker go on, make queue visible
- Step 8 several writers | floor = own copy per writer, every landing through the check in one order with undo (Decision 3, safety floor not a quality claim); fixed order only where a plan declares; then ranked: reshape shared places, version-checked writes, claims below the file, wait per known hot pair, checkpoints, every landing through the check, structured merge last; no default owner; whole-file CRDT neither used nor ruled out (Q36)
- Step 9 the tree | its kind chosen by L against b and R against 1/f; f = 1/q_(1-p)(R); split or hand-over open (Q30); fewer parent wakes first; run-state files written by a script step (L, R, q not defined in my documents: not stated)
- Q01-Q37 measurements (Q37 = later demand per window); order: counts over files first, then simulations, then runs with owner's word
- Decision 4: five unchecked source statements (V2-108..112); all 29 searched items stand

### G. BUILD-IN.md: the rule built into scripts (design only; nothing built)
- widths(facts, params) in research-tree/tcb/width.mjs | one pure function returns each width and the smallest, and which resource binds; every gate calls it by guarded dynamic import so a fault allows and logs, never opens other checks | in: facts | out: width + binding resource, logged | each start | designed only
- fitScore(needs, free) filter | designed only
- Gates (callers): lane.mjs (heavy commands), tier-hook (helpers, child sessions), admit decide + watcher slotFree (tree) | each sees one folder only; width part to go in user settings (hypothesis)
- Signals and producers: recorder.ps1 (free memory, per-unit memory/threads line, queue counter, date), lane log end lines (time inside per label, wait), helper meta files + transcripts (tokens, model), usage reading (get_usage tool, else usage file, else status-line logger: B8), ready work, ticket files
- Class table classes.json via unit-costs.mjs (harnessUnitCosts) and lane-stats.mjs (classFigures, throughputByLevel) | designed only
- Memory floors: admit only while free memory minus open peaks minus new peak > 4,000 MB (model runner's form); stop floor 2,500 MB (governor) with no actor; tree flat peak guess 1,200 MB; 332 MB per lane command (one run)
- Lane repairs: count all held slot folders, break stale slot by rename, owner.json by temp+rename with own timeout, hold = timeout + margin, age cap (B5) | designed (P0 partly built: lane breaks live hold only above 1,560 s)
- Lane tickets: waiters write tickets (pid, label, time, needs); slot to tickets that fit, shortest expected check first, then oldest, age cap; dead tickets removed | designed
- Standing-queue flag from tickets and stats file; tier hook reads it when a build/run helper starts | designed
- Refusal text says when to retry (after next finish notice, never poll); named limit: retry is a step the coordinator must remember
- Finish detection: meta-file finished key + transcript written within T_quiet (default 45 min guess; 11 of 404 meta files lack key)
- No lock in hook (release problem after crash); parallel batch may overshoot by size-1: named limit
- Fail modes: width part fails open with log; routes part wrapped to fail closed (B6)
- Audit of Node run outside the lane (log, no refusal) (B7)
- Several-writers mode table research-tree/build/modes.json: 20 shared places = 9 separate entries (own copies) + 11 one-owner; PreToolUse Write/Edit branch refuses non-owner; merge.mjs counts conflicts per file and switches mode (chance of conflict x redo cost > waiting cost; back after quiet units) | designed; Edit hook untested
- Tree side needs: committed children hold slots until verified stop; session memory unknown; coordinator context a second cliff (133.2k); starts bound to owner-typed turns; tree runs outside the lane (two gates not seeing each other)
- Build order B1-B14 (corrections; width.mjs; lane-stats; unit-costs; lane fixes; tier-hook wrapper; Node audit; usage reader; recorder; width gate in hook; lane ticket order; tree width in admit/watcher after FX-CLAIM/CLOSE/PLAN/CGATE; planAct order; several-writers) | plan
- Proposed corrections (b1-0501..0506) to earlier records

### H. The build's own tree (ORCHESTRATION.md): how the owner's build is actually run
- Root session (one, talks to owner; Opus kind orchestrate; was Fable before no-L1 decision) | the only node that starts nothing below itself except helpers, runs commands over 150 s as background lane commands, lands every unit | built/running (go given 2026-11-19)
- L1 batch orchestrator for B1-1 | helper that runs a batch | dropped (polling costs 1.5-3.5 M vs 0.42 M saved)
- Nesting probe (Haiku parent, two children) | done; nested helpers start in background when fork mode off
- Leaves: builder (Opus, build-invariant), refuter (blind, Opus, one mutation per invariant), S2.1 test builder (Sonnet), analysers, readers, runners, extractors (Haiku)
- Model by kind of job: tier hook + tier-routes.json (Haiku locates/extracts; Sonnet reads/runs/ordinary build; Opus invariant build/analyse/refute/orchestrate; Fable for orchestrator whose children have children) | built
- Batches and slices (P0, slice 0 B0a/B0b, slice 1 B1-1..B1-4, slice 2) with plan.json; width per batch
- Plan gate (plan-gate.mjs) | admission control + counting semaphore: refuses wrong kind/model, unmet dependencies, duplicate helper for a unit+role, batch past its width; width changes only by a line in STATE.md | built (37 tests)
- Own worktree + branch per unit under .claude/worktrees/<unit> (names <= 7 chars) cut from build tip | built (the floor of Step 8)
- Landing (land.mjs): merge into build branch in build worktree, run unit's own test files, failure undoes merge; passes keyed by file hash; one lander at a time; landings.jsonl written by land.mjs | built (S0.6, being built as unit); revert with git revert -m 1
- Testing policy: builder runs only its unit's files via main checkout's lane, each call under 150 s (timeout 1.5x last run, wait budget 145 s minus); exit 75 = no slot; 5 full suites at batch points (264 s; 120 s sharded)
- Lane capacity 4 slots (measured); lane copy in a worktree is a separate lane so always call main checkout's by absolute path
- Per-node limits: expected = median of same-kind past work; limit = Q3 + 1.5 IQR (builder 11.7 M expected, 29.2 M limit; refuter 5.4/15.6); at limit the leaf commits, writes checkpoint, returns LIMIT; parent continues/starts successor/stops
- Pooled reserve at root | critical-chain project management (Goldratt): sqrt of summed squared spreads = 28.0 M | designed
- Hand-over by lot-sizing law: W* = F + sqrt(2Rg); root W* about 129 K, at next quiet point through STATE.md; leaf checkpoint at about 330 K before app compacts at 368 K | borrowed: Harris/Wilson EOQ
- Token budget: 416 M tokens = 10.4 weekly points (6.7-16.6); cap to ask 15 points; gate at every start: u_now + running reserve + unit expected <= 100 - 0.21 x hours to reset; get_usage read by root; usage.jsonl log | designed, partly in use
- Wake timer (background until-loop, 3 x Q3 minutes) so root wakes if no helper ends | built practice
- Failure-mode countermeasure table (116 rows, grouped) | planned
- Preconditions: P0 record guard worktree-aware; hooks committed; owner's go

### I. Hooks and scripts that enforce rules
- tier-hook.mjs (PreToolUse): refuses a helper or child session with no kind, no explicit model, or wrong model for the kind; logs to .claude/logs/tier-hook.jsonl; cannot see a mislabelled job | built
- record-guard.mjs v2 (PreToolUse on Write, Edit, MultiEdit, NotebookEdit, AskUserQuestion, Bash, PowerShell): archived evidence never changed; journal append-only; questions to owner must begin approve:/cap:/fact: (no design questions); worktree-aware; path normalisation | built (selftest 202/202)
- plan-gate.mjs (see H) | built
- library-start.mjs (SessionStart): injects library board and NEXT task at every start/resume/clear/compaction | built
- tools/check-commit.mjs via tools/git-hooks/pre-commit: refuses commits that change evidence or journal lines or add invalid records; catches shell writes; --no-verify skips | built
- selftest.mjs for hooks | built
- lane.mjs: capacity slots, below-normal priority, heap cap, timeout kill, log.jsonl, exit 75/124 | built
- recorder.ps1 + governor (stops node/powershell naming tcb-build when memory low) | built but matches nothing today, started by hand
- Tree-side: guard-hook.mjs (tree roles), fsck, audit, selftest canary (see C)

## Flow (one unit of work in the build tree)
1. Planned: unit appears in plan.json (kind, model, dependencies, batch, width) and ORCHESTRATION limits (expected, limit, reserve).
2. Admitted by plan gate: dependency units done, no duplicate live helper, batch below width; tier hook checks kind and model; root checks token gate (get_usage), machine memory, lane slots; decision rule step 2: smallest width. (Tree form: admit.mjs checks deps, protocol hash, gate, selftest, N_max slots incl. zombies, memory, reservation.)
3. Started on the model fixed by its kind (builder Opus, test Sonnet, reader Haiku) by the root via the Agent tool; agent id recorded in STATE.
4. Claims what it will write: build plan names each unit's files; modes table (own copy vs one owner) decides; a write guard branch is designed (designed only). In the tree: a child writes only its staging folder.
5. Works in its own worktree and branch; runs only its own test files through the main checkout's lane, each call under 150 s; watches its own tokens/context (checkpoint at ~330 K, return LIMIT at its limit).
6. Lands: refuter (blind, fresh) reviews; root/lander merges into build branch, runs unit's tests, undoes the merge if they fail, writes landings.jsonl; commit check runs; full suite at batch points. (Tree form: commit.mjs under fence by epoch, first commit record wins.)
7. Reports to parent: result.md (branch, commit, tests pass/fail/not-run, departures, tokens), done file last.
8. Parent wakes by helper end notice, background command end, or wake timer; reads STATE/status, starts next ready unit. (Tree: watcher exit/alarm; level-triggered re-read.)

## Loops
- Watchdog: progress V falls, or calls/ticks -> stall/hang/loop -> restart once (R=1) or escalate.
- Spend: transcript token sum vs expected e -> at 0.8e commit, at limit stop; at 330 K context checkpoint.
- Wake loop: wake is a hint; coordinator re-reads status; acked_seq stops repeat wakes; alarm re-arm.
- Admission: slots, memory, reservation, token window vs running units -> width -> admit or hold.
- Token window pacing: use u vs time share s -> pace starts to (1-u)/(1-s); later protected demand Q37.
- Check queue: wait at the check (tickets, standing queue) -> width narrows/binds; slow outer check: throughput vs workers.
- Several-writers mode switch: conflicts per file x redo cost vs waiting -> one owner or own copies; back after quiet runs.
- Hand-over: window size vs W* -> coordinator drains, successor starts from files.
- Budget re-plan: actual > 1.5 x estimate -> re-plan; exponential averaging of unit costs.
- Model check loop: counterexample blocks the change; each fix modelled and rerun.
- Incidents (R58) -> hazards -> stops admission if high and unmapped (later).

## Jargon
unit: one piece of planned build work given to one helper | lane: queue letting only N heavy commands run at once | fence: epoch check refusing output from an old attempt | epoch: attempt/coordinator number raised at each restart | claim: declaring which files a unit will write (FX-CLAIM: one lease per attempt) | wake: message that restarts a sleeping coordinator turn | landing: merging a finished unit into the shared branch after tests | worktree: separate checkout of the repo for one unit | width: how many units may run at once by the tightest limit | window (token): usage allowance period; (context): model's input length | B-link split: B+-tree node split with a link so readers are not blocked (Lehman-Yao; named only as a source of R48 splitting) | slot: one permitted live process | admission: decision to start | reservation: tokens held back for running units | drain: stop starting, wait for quiet | hand-over: successor session continues from files | checkpoint: saved state to resume from | zombie: attempt still running after being replaced | ledger: hash-chained append-only log | staging: a session's private output folder | TCB: trusted scripts folder | W*: context size at which hand-over is cheapest | R=1: one restart allowed | quiescence: no live child | refuter: blind reviewer trying to break a unit | L1: batch orchestrator helper layer | Q3+1.5 IQR: Tukey outlier fence used as token limit | bid price: value of capacity kept for later demand | fail open/closed: allow/refuse when the check itself breaks | oracle (in model): assumed-perfect step.

## Unclear
- Lane slots: ORCHESTRATION s6 table says 2 slots; s13 says 4 (s13 holds). Plan.json width for B1-1 is 3, s13 computes 7 pending re-measure. CLAUDE.md and DESIGN-RECORD still say "three at most"/N_max 2-3; CLAUDE.md says that rule is withdrawn; BUILD-IN keeps N_max 2, ceiling 3 as defaults.
- Root model: ORCHESTRATION s0 and s2 say Fable orchestrate-deep; s13 row 2 says Opus (no L1). s13 holds.
- L1 (batch orchestrator): s0/s2 conditional on probe; s13 dropped.
- Protocol v2 count: "58 rules" but R59, R60 added; script count 25 vs 24 scripts + model folder; DESIGN-RECORD describes six layers (integrity and assurance merged) vs seven in protocol; design record says amendment/R numbering shifted by one from old R7.
- Handover: protocol says handover.mjs kills watcher and alarm; s16 corrects to raising ce so old ones exit 64.
- Protocol v2 status "blocked by its own R57" vs "holds all 14 properties" (idealised; four fixes are oracles in the model).
- Decision rule Step 9 symbols L, b, R, f, q and Step 8 "claims below the file" are named but not explained in my documents: not stated. Version 1 rule (B:DECISION-RULE.md) and the draft RULE-V2-DRAFT.md hold details not read.
- FX-CLAIM, FX-W1..W7 internals not stated in my documents beyond one-line summaries; BUILD-SIZE.md, FIX-*.md hold them.
- Whether hooks fire for helpers, user-level settings reach other folders, workflow helpers: not tested.
- "Hold 4 slots" lane vs how many sessions: sessions count (N_max) and lane slots are separate limits; not reconciled in one rule beyond widths().
- Cap for tokens in the tree (B) is an owner item, value not stated; c, h, W_cc, H_max, Z, delta values not stated.
