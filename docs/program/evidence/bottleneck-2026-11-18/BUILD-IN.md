# Building the decision rule into the harness and the tree (draft, 2026-11-18)

**Status: design only.** Nothing here was built, run or measured. Task r57-0504. The rule is `DECISION-RULE.md`
(records r57-0406 to r57-0408); the eight measurements are its section "Numbers to compute here" (r57-0511).
Every claim cites `b1-claims.md` (C numbers) and every choice a D number there. Marks: **lit** proven in the
literature (record of the quote), **meas** measured here, **obs** observed here, **hyp** hypothesis.
*Harness* = a coordinating session, its helpers and child sessions, heavy commands through the lane.
*Tree* = the research tree's scripts in `research-tree/tcb/`, where a node is a session.
Bound by: no question to the owner (C162); every number computed against quality first, then time, memory and tokens
(C163, C164); a missing number named as one of the eight measurements (C158) with a safe default until it exists.

## 0. The answer

1. One pure function, `widths(facts)` in a new file `research-tree/tcb/width.mjs`, holds the rule once; every gate calls it (D1).
2. The gates exist: lane.mjs (heavy commands), the tier hook (helpers, child sessions), admit `decide` (tree); FX-CGATE binds admit.
3. Finishes reach it through files that exist (lane end lines, helper meta files, the ledger); tokens per helper are on disk.
4. Missing signals, smallest producers: per-unit memory and threads (recorder), processor queue, queued commands, usage file.
5. Until a measurement exists each gate keeps today's numbers, so the first build steps change no behaviour (D16, D20).
6. The tree needs more: a session is not a known process, committed children hold slots, waiting costs tokens, starts need turns.
7. Correction: the rule's Step 1 table says the week share is logged; nothing logs it, it is read by hand (C26, C119).

## 1. The rule, step by step

Each step answers: (1) where the signal is read; (2) the mechanism, who runs it, at which event; (3) what changes;
(4) cost; (5) mark; (6) the measurement it waits for and the safe default.

### 1.0 Step 0: measure each class of unit first

1. **Signal.** *Harness, heavy commands:* time inside per label is on every end line (C6). Peak private memory and
   busy threads per command: missing (C24). Smallest producer: the recorder already lists every process each 2 s (C22);
   add one line per running lane command with the summed private memory and processor time of its process tree,
   found from the lane's pid (on every start line, C5) through one process query with parent ids, the query the
   governor already makes (C21). Precedents: an earlier recorder wrote the largest processes by size (C25); the model
   runner samples its own children (C97); the suite probe sampled one run's tree, but its sampler was not kept (C116).
   *Harness, helpers:* tokens by kind and model are on disk: each helper has a meta file
   with its description (kind first), model and toolUseId (C53) and a transcript that lib can find and sum (C55, C56).
   Helper memory: missing, and not known to be separable. The tier hook's log has no token or finish field (C43);
   it does not need one. *Tree:* tokens per role come from `cost.mjs
   from-transcripts`; memory and serial fraction are left empty there (C81); a session's peak is a guess (C64).
2. **Mechanism.** Scripts, not hooks: figures exist only after units finish. A script run between waves (the event
   CLAUDE.md rule 5 names for reading usage) writes a class table; gates read it at every start. "Runs alone until
   steady" is enforced at the gate: the lane gives width 1 to a class the table marks unsteady, admit does the same
   for a session role. Helpers are never held for it: each helper's tokens are in its own transcript, and holding
   them would break r57-0006 (C165) (D9). Running alone starts only once the per-unit sampler exists; before that it
   would cost time and measure nothing. Weak point: the coordinating session must run the script between waves.
3. **Changes.** New `research-tree/tools/unit-costs.mjs`, function `harnessUnitCosts(sessionId)`: meta files plus
   transcripts to tokens, model and duration per kind. New `research-tree/tools/lane-stats.mjs`, function
   `classFigures(log, recorderLog)`: per label, time inside, memory peak, busy threads. Both write
   `research-tree/lane/classes.json`. `recorder.ps1` main loop: the per-unit line. Tree: `cost.mjs buildUnitCosts`
   fills `rss_mb` and a duration per role from readings at admit and stop (1.1); the readings go into the data of the
   existing admit, stop and commit lines, not new kinds, since the kinds are a closed list (C87).
4. **Cost.** Scripts and hooks spend no model tokens; the coordinator reads one summary line (not measured). The
   process query every 2 s: not measured. Parsing transcripts: not measured (the tree runs it in the background).
5. **Mark.** Measure first: lit (o1-0301 training run, C133; r57-0307 a law needs a first measurement, C145). Alone
   until steady: hyp (C124). "Steady" as 5 % three times is a paper's number: hyp (C125, C150).
6. **Waits for** measurements 1, 2 and 6. **Default:** no class table, so no class is held alone; lane 2 slots (C2),
   N_max 2 (C63). Tokens per helper (the first part of 6) is a count over transcripts, not a run (D20).

### 1.1 Step 1: work out each width

1. **Signals, and the smallest producer of each missing one.**

| Resource | Harness | Tree |
|---|---|---|
| Free memory | recorder every 2 s, only while it runs: started by hand, ends after 12 h, no date in lines (C16-C19, C23). The lane and the hook can read it from the OS themselves, as lib does (C73) | read at each admit and tick (C73); written only into the admit line (C71) |
| Peak per class | missing; the recorder's per-unit line (1.0) | guess 1,200 MB (C64); add private memory to lib's process query (C85) so each admit and stop records it |
| Busy threads, ready queue | whole-PC share only (C17); missing: busy threads per command (same per-unit line) and the processor queue (one more counter beside C16) | none; sessions waiting on the model use little processor (C127) |
| The check | time inside per label (C6), 596 s per suite run (C13, C115), 2 slots (C2), wait (C5). Time outside: missing; smallest: the tier hook logs each Bash call that runs lane.mjs with the helper's id, so a builder's time between its commands can be joined to the lane log | the checker: batch of 12, no wait (C78-C80); duration per checker session from its transcript |
| Bandwidth | none; no term | none |
| Shared files | section 1.7 | section 1.7 |
| Tokens | week and 5-hour shares read by hand from the app (C26, C27); smallest series: a usage file the coordinator appends at each fan-out, later a status-line logger (C32, untested). Per helper: on disk (C53-C56) | spend per attempt from transcripts; meter typed in (C33) and turned into tokens per point (C34). Admit's budget test (C61, C62) is already the token width's form, but its cap is unset (C66) |
| Ready work | lane: queued commands invisible (C7); a ticket file per waiter. Helpers: the coordinator's plan only | runnable rows of the task table |

   **Width per resource** (the shapes; no number is set):
   - memory: the units of a class that fit in free memory less a reserve less what running units may still grow
     into; the model runner already admits this way (C95); cost.mjs prints the same form and nothing reads it (C82);
     admit uses one flat peak for every session (C60); paused units count (C151);
   - processor: expected busy threads of running units plus the new one at most 24, and no excess in the queue;
   - the check: case A, round(sqrt(time outside / time inside)) for pieces of one task; case B, slots x (outside +
     inside) / inside builders for one check per change (C147). Building the fixes is case B;
   - tokens: a budget (C155): no limit while what is left in the window covers the reserve, the open estimates of
     running units and the new unit's estimate; otherwise 0. What is left = (cap - share now) x tokens per point;
   - ready work: its count.
2. **Mechanism.** The recorder (every 2 s) only records. The lane reads memory, processor and its slots at each poll;
   the tier hook reads memory, the usage file and the check flag at each helper or child-session start; admit reads
   memory, slots and spend at each `replace start`; the watcher reads memory and context at each tick. Each reads at
   the event where it decides (D2). The usage reading is the one input a session must supply by hand until the status
   line is tested (D15); the tree's own design says only a session can read the meter (C31).
3. **Changes.** `recorder.ps1`: date on every line, the queue counter, the per-unit line. `lane.mjs`: child pid and
   class on the start line, a ticket per waiter. `tier-hook.mjs`: the Bash/lane log line. Tree: `lib.mjs` process
   query (+ private memory) and `edgeFacts` (+ the latest usage reading); `admit.mjs gatherFacts` reads per-role
   peaks from `plan/unit-costs.json` instead of the flat `peak_mb`.
4. **Cost.** Hook: about 37 ms per call already paid (C46); added file reads not measured. One more counter and one
   process query per 2 s: not measured. Tokens: none, except the coordinator's usage line (not measured).
5. **Mark.** Memory: lit (C129 collapse; C131 caps from measured use); paused units: hyp (C151). Processor: lit
   (C132; C130 throttle, never kill). Check: case A lit (C133), case B hyp (C147). Tokens: hyp, no paper (C153, C155).
6. **Waits for:** memory and threads 1; check 2, 3, 4; bandwidth 8; files 5; tokens 6. **Defaults:** peak 1,200 MB
   per session (C64); lane commands 332 MB private (one run, C115); processor term off (whole-PC share alone is not
   a width); check width = the lane's 2 slots, test files one at a time until 4 is run (C160); token cap = the
   phase's agreed cap in its state file (C27); the 5-hour window gives no width until it is read, and a limit hit
   early (about 75 minutes into one window in October, C37) holds every start and is reported, never waited on.

### 1.2 Step 2: the width is the smallest of these

1. **Signal.** The widths of 1.1; nothing new.
2. **Mechanism.** `widths()` returns each width, the smallest, and the resources within one unit of it ("two at once").
   Pure, like `decide` (C57). Every gate calls it and logs the binding resource with its decision: lane start line,
   tier-hook log, admit ledger line; the limit moves from job to job in our own record (C117), and these lines show
   where it went. If ready work gives the smallest, capacity is idle and the gate says so: start
   more (C165). Script code called by each gate, so the rule exists once (D1); two copies of one rule set are already
   a known gap in the tree (C107), and admit and the watcher test room to start separately (C59, C74).
3. **Changes.** New `research-tree/tcb/width.mjs`: `widths(facts, params)`, `fitScore(needs, free)`. Callers:
   `admit.mjs decide` sections 6 and 7; `watch.mjs` `slotFree`; `lane.mjs capacity()`; `tier-hook.mjs` after its
   early exit for other tools (C39), so other tool calls pay nothing.
4. **Cost.** Arithmetic only; not measured. The hook's own work was under 1 ms in the probe.
5. **Mark.** The minimum: lit for two limits in a model (C134), narrowed: no tested program had both (C128). As a
   rule over more resources: hyp (r57-0408). Never "share whatever binds now": lit, one run (C146).
6. **Waits for** nothing of its own. **Default:** the outer cap stays min(N_max, N_ceiling, 3) (C58, C59) and the
   lane's file stays the lane's upper bound (C1-C3).

### 1.3 Step 3: act only at the gate

1. **Signal.** Width against units running. Running: lane slot folders; helpers whose meta file has no finished key
   (C54); the tree's live, unknown and unconfirmed attempts (C59). Memory floor: free memory (C16, C73).
2. **Mechanism.** *Heavy commands:* lane.mjs `tryAcquire` already holds and never kills except at a timeout (C1, C4);
   its count becomes the smaller of the file and the width (D3). *Helpers and child sessions:* the tier hook, which
   handles PreToolUse only (C38), refuses by exit 2 (C40), seen to work on a helper start (C45); a workflow cannot
   read files (C51) and an instruction is the weakest form (D4; the mix of C159 and the ruling C167). A refusal
   returns to the coordinator, who retries after the next finish notice; the hook cannot queue. Finishes need no
   hook: the meta file gains its finished key (C54); SubagentStop also fires if one is ever needed (C47). No lock:
   matching hooks may run in parallel (C49) and a stalled hook lets the call through (C50), so a lock could only
   fail open; a parallel batch may overshoot by its size less one, covered by the reserve (D5). The width part fails
   open with a log line, as unreadable input already does (C42); the routes part stays closed (C41, D6).
   *Lane use itself:* the hook refuses a
   Bash command that starts Node outside lane.mjs, turning a convention (C14, C15) into a refusal; it cannot see
   `sh -c` or a path (C52) (D7). *Floor:* the governor stops only `tcb-build` processes under 2,500 MB (C20, C21),
   never a helper or session. *Tree:* admit refuses and replace defers with exit 6 (C70), so admit stays the gate
   (D8); FX-CGATE makes the hook refuse a session start admit did not grant. At the floor the watcher raises class 24 (C76) and the coordinator
   stops the least important child with stop.mjs and its own tools; no script stops a session (C72). Weak: a step
   the coordinator must take.
3. **Changes.** `lane.mjs tryAcquire` (count) and `MAX_HOLD_MS` (5.5, D21); `tier-hook.mjs`: a width branch for
   Agent and start_session after the routes check, a Bash branch; `.claude/settings.json` unchanged (matcher `*`,
   C44). Tree: `admit.mjs decide` sections 6-7; `watch.mjs` line 554.
4. **Cost.** Hook: a few small file reads per start, not measured. A refusal puts its message into the coordinator's
   context (tokens not measured).
5. **Mark.** Kill for memory, throttle for processor: lit (C130). Memory as a cliff: lit, analytic (C129). Gate only:
   hyp (C148). The hook refusing a helper: obs, one session (C45); on start_session and Bash: not tested (C48).
6. **Waits for** 1 (peaks set the reserve). **Default:** admission reserve 4,000 MB, the largest floor in use (C96);
   stop floor 2,500 MB, the governor's (C20). The lowest free memory on record is 7,306 MB (C118), so neither bound.

### 1.4 Step 4: choose the next unit

1. **Signal.** Needs per class (class table), free resources (1.1), expected time inside the check per label (lane
   end lines, C6). Tree: per-role unit costs and each row's estimate.
2. **Mechanism.** *Lane:* waiters write tickets; a slot goes to the first ticket by fit on all resources (dot
   product, C143), then shortest expected check time, then age, with an age cap so no ticket starves (D10). Today
   waiters have no order (C4). The lane is the only place that sees heavy waiters. *Helpers:* the coordinating
   session chooses; no hook can choose, it can only refuse (D11). Its brief says: start every ready unit at once
   unless refused (C165); order matters only when a width binds. *Cheaper model:* the routes file stays the routing
   (C168); no move below it until a quality gap is measured on our work (C154), which is none of the eight
   measurements (section 6). *Tree:* FX-PLAN's new `planAct` orders candidates by `fitScore` and short checks first,
   not table order (C75, C103). Checker items: oldest intake first instead of by field and card id (C79).
3. **Changes.** `lane.mjs` around the wait loop (lines 70-73); `width.mjs fitScore`; tree: `lib.planAct` (FX-PLAN),
   `check-queue.mjs plan()` sort (line 311).
4. **Cost.** Each waiter reads the ticket folder every 700 ms: not measured.
5. **Mark.** Fit: lit (C143). Short first, nothing held while queued: hyp (C152); never-idle can be far off when
   long light jobs start first: lit (C144). Next unit by fit: hyp (C156).
6. **Waits for** 1 and 2. **Default:** without needs, order by shortest expected check time then age; the times are
   in the lane log already.

### 1.5 Step 5: cross-check with the wait

1. **Signal.** *Harness:* the wait on every lane start (C5); waiters still queued come from the tickets (1.4).
   *Tree:* the checker's wait is not recorded (C80); smallest producer: the age of the oldest real item (from its
   intake line) and the number left out of the batch, added to the queue ledger line.
2. **Mechanism.** At each end the lane recomputes, from its own log, the shortest wait over the last window and the
   number queued, into a small stats file (temporary file and rename). Above zero means a standing queue: the check
   binds whatever the processor shows, and the width marks it binding (D12). The tier hook reads the flag when a
   build or run helper starts. A shared serial step needs its own signal (C136), so the lane, not the recorder, is
   the sensor. *Tree:* the watcher's class 14 test (C78) reads the age; a standing checker queue stops the planner
   from starting more research children than the checker can judge (D13).
3. **Changes.** `lane.mjs` end handler (lines 92-99); `tier-hook.mjs` reads the stats file; tree: `check-queue.mjs`
   ledger data (line 467), `watch.mjs evaluate` (lines 539-541).
4. **Cost.** Reading the log's tail at each end: not measured.
5. **Mark.** The wait, not processor use: lit (C135). Its own signal for a shared step: lit (C136).
6. **Waits for** 7 (a count: the log holds both periods, C123) and 2 (the window). **Default:** window = one suite
   run, 596 s (C115); target zero.

### 1.6 Step 6: a slow outer check

1. **Signal.** Throughput against units at once after about 100 finished units. The lane log already holds 780
   (C12); helpers: finished meta files; tree: commit lines.
2. **Mechanism.** A script run between waves and at a phase's end; it confirms or questions the rule and drives
   nothing (D14).
3. **Changes.** `lane-stats.mjs`, function `throughputByLevel(log)`; `unit-costs.mjs` for helpers; tree: a summary
   line from `cost.mjs from-transcripts`.
4. **Cost.** Script only; the coordinator reads one line.
5. **Mark.** Throughput search needs hundreds of units: lit (C137); outer check only: hyp (C149).
6. **Waits for** none of the eight; the lane's part is a count now. **Default:** no action from it.

### 1.7 Several writers on one file

Where it applies. *Harness:* building the 13 fixes and 0b, several builders on `lib.mjs`, `status.mjs`, `watch.mjs`,
`thresholds.json`: 20 shared places, 9 separate entries, 7 ordered sequences, 4 same statements (C112). *Tree at run
time:* no shared work file by construction: a child writes only its staging folder (C88); objects are stored by
exclusive create and never merged (C89); disagreeing verdicts are flagged (C90); run state has one owner under the run
lock with compare-and-set (C91). The tree already runs both modes, chosen by place, and is left as it is (D18).

1. **Signal.** Conflicts per file: missing (C24). Smallest producer: the merge script named in r57-0401 (C113)
   writes one line per merge: file, place, clean / conflict / merged but failed the check, tokens of the redone
   unit. Wait cost: how long a builder waited for an owner. What is scarce now: tokens (1.1) and the check (1.5).
2. **Mechanism.** *Before work:* the build plan gives each of the 20 places a mode from the change list: own copies
   for the 9 separate entries, one owner or a split first for the 11 others. A PreToolUse branch on Write and Edit
   refuses a write to a one-owner file by a helper that is not its owner. *While work runs:* the merge script counts
   conflicts per file and moves a file to one owner when chance of conflict x cost of redoing > cost of waiting, in
   whatever is scarce now; it moves back after a set number of quiet units; a change applies only to units started
   after it. The count lives where merges happen, the refusal where writes happen (D17). Every merge passes the check.
3. **Changes.** New `research-tree/tools/merge.mjs` (`mergeUnit`, `countConflict`); a modes table
   `research-tree/build/modes.json` (file, mode, owner, since); `tier-hook.mjs` Write/Edit branch; the build plan,
   which does not exist yet (C110).
4. **Cost.** A file read per Write (not measured); a check per merge, 596 s per suite run (C115).
5. **Mark.** Locking wins when resources are scarce: lit (C141). Count per object: lit (C138); back after quiet runs:
   lit (C139); switch between units: lit (C140). Clean merges still fail tests: lit (C142). The rule itself: hyp (C157).
6. **Waits for** 5 (conflicts on our own neighbouring lines), 6 (tokens per redone unit), 2 (wait). **Default:** one
   owner for the 11 places where a conflict is certain, own copies for the 9; no switching until 5 exists. The Edit
   refusal waits for its test (C114); only Write was seen refused (C48).

## 2. Fit with the 13 fix designs and 0b

Files and functions per fix: `b1-map-fixes.md` table (C108); `slotCount` and `rowAct` re-read in code.

| Fix | Verdict | Why |
|---|---|---|
| 0b strict hook write | leaves alone | 0b is strict create inside FX-OUT, FX-CLAIM, FX-CGATE (C99); guard-hook reads only today (C92) and takes no lock after the fixes (C106). No gate here writes inside the tree; widths are read. In the build, 0b first is what lets 8 builders work at statement grain (C112) |
| FX-OUT outcome log | leaves alone | Makes the finish event reliable. Readings added to the commit line must go in after FX-OUT changes `recordPass` (same lines) |
| FX-CLAIM one claim per attempt | leaves alone | Changes `slotCount`, which the width reads as "running" (C100). A leased start counts as running |
| FX-CGATE coordinator hook | leaves alone; relies on it | The fencing token at the session start (C101) turns admit's width from a step the coordinator must remember (C72) into a refusal at the start |
| FX-CLOSE release a finished child | leaves alone; relies on it | Frees a slot only after a verified close (C102); the tree's finish event is that close (section 3) |
| FX-REDO missing ledger line | leaves alone | A reading is data of its ledger line, written once with it, so repeat calls stay idempotent |
| FX-PLAN planner | changes | `planAct` (C103) is where Step 4's order goes; its "slot free" test must be `widths()` |
| FX-W1 liveness, markers | leaves alone | Alarm processes are not units; their memory is inside the reserve |
| FX-W2 alarm slots | leaves alone | `alarm_slots` are wake slots, not work width; not counted |
| FX-W3 armed before work | leaves alone | The width decision runs inside the run lock its `requireArmed` guards |
| FX-W4 dead-man | leaves alone | An alert outside the tree |
| FX-W5 re-raise act-due | leaves alone, one condition | `rowAct` already gives no act for a start without a free slot (C75); once that test is the width, a held start is not raised as due |
| FX-W6 per-kind deadlines | leaves alone; shares data | Its per-kind timings (C104) are the durations Step 0 wants per class; read, not changed |
| FX-W7 watcher lock | leaves alone | The one-owner case of 1.7 at run time (C105), the right mode for a place where a conflict is certain |
| "The plan check" (C109) | replaced in part | Its lane count fixed before work becomes the width at every event; it keeps the before-work modes of 1.7 |
| N_max, N_ceiling, 3 | changes | Become the outer cap and the defaults of `widths()`; no fix changes N_max |

New thresholds the rule adds ship as marked guesses, as the fixes' do (C111).

## 3. What the tree needs that the harness does not

1. **A node's memory is a session's, not a known process's.** Live attempts are found by folder or session id in
   command lines (C86); whether app sessions show either is not recorded. The per-role peak may be readable only as
   the app's total with 0 to 3 children: measurement 1 run on sessions. Until then: 1,200 MB (C64) and three at most.
2. **Tokens accrue for the node's whole life, mostly as re-reads** (C35). A coordinator pays its context at every
   wake: b1 stopped at 135,000 tokens, 64,000 of them fixed load (C36). So in the tree waiting is not free in tokens
   (C126): the several-writers threshold and a deferred start count wakes x context as a waiting cost. Measurement 6
   (how cached reads count) sets its weight.
3. **Context is a second cliff.** The coordinator drains at 133,200 tokens (C67, C77), designed not measured (C161),
   and admit blocks every start while draining; context is a width of 0 for new starts then. The harness has the
   same ceiling (C166) but no hook sees context (C46): there it is a step the session must remember.
4. **Handover and starts are bound to turns.** A session can start another only on a turn the owner typed or after one
   of its own sessions ends (C98; open in C174). A start deferred by memory or the checker can be retried when a
   child ends, not when a heavy command ends or the watcher wakes. The width may have room that no turn can use.
5. **Committed children hold slots.** The last attempt of a committed row counts as one slot until its stop is
   confirmed (C84), after 2 ticks of 60 s (C68, C69). So a unit finishes at its verified close (FX-CLOSE), at least
   two minutes after its work; the width counts it as running until then (D19). Safe: an open session may hold memory.
6. **No automatic stop at the floor.** No script stops a session (C72) and the governor stops only `tcb-build`
   processes (C21). The floor is the coordinator's act on class 24; the larger admission reserve (1.3) compensates.
7. **The tree's run bypasses the lane.** Guard-hook lets the tree's coordinator run only `node tcb/<name>.mjs` (C93),
   the tree's settings wire guard-hook and not the tier hook (C94), and a run lives outside every repository (C173).
   Two gates on one PC that do not see each other: the tree's admit must read the lane's slot folders (or the lane
   form must be allowed by guard-hook) before both run at once.

## 4. Build order

First the pieces that need no measurement; none changes behaviour until its inputs exist. Checks are named, not run.

| # | Piece | Depends on | How it is shown to work |
|---|---|---|---|
| B1 | Corrections of section 5 into the rule's table and the records | nothing | each corrected line greps as written |
| B2 | `width.mjs` with today's numbers, no caller yet | nothing | equivalence test: for every case in `admit.test.mjs`, `widths()` admits and refuses as sections 6-7 of `decide` do |
| B3 | `lane-stats.mjs` over the existing log: measurement 7 and the lane's part of Step 6 | nothing | reproduces r57-0127: 780 commands, about 365 min run, 177 min waited, 41 of 324 min two at once (C12) |
| B4 | `unit-costs.mjs` for helpers: measurement 6, first part, as a count | nothing | the five readers of b1's session sum to the 584,000 tokens of its state file (C28) |
| B5 | `lane.mjs`: hold limit above the largest timeout (D21); child pid and class on the start line; a ticket per waiter; the recorder log's age on the start line | nothing | lane test: a live holder older than 20 min keeps its slot inside its timeout; a waiter leaves a ticket |
| B6 | `tier-hook.mjs` logging: Agent and start_session starts with toolUseId; Bash calls that run lane.mjs | nothing | the 6-step real-session pattern of r57-0120: each start and lane call leaves one line |
| B7 | Bash branch: refuse Node outside the lane (D7) | B6; a Bash probe (C48) | a `node --test` without the lane is refused, the same through the lane passes |
| B8 | Usage file (interim, written at each fan-out); then a status-line logger | a test that the app runs a status line and what rate_limits holds (C32) | two readings across a 5-hour boundary say fixed or rolling (measurement 6) |
| B9 | `recorder.ps1`: date, queue counter, per-unit line | B5 (child pid); the owner's word: running it is measurement 1 | beside one suite run its private peak is near the probe's 332 MB (C115) |
| B10 | Width gate in the tier hook (memory, usage, check flag) | B2, B6, B8 | a usage file at the cap refuses a helper; a low free-memory reading refuses; a fault in the width part allows and logs |
| B11 | Lane count from the width; ticket order; stats file | B2, B3, B5, B9 | `lane-stats` on the next 100 commands against B3's baseline: wait and throughput by level |
| B12 | Tree: `width.mjs` in admit and the watcher; window term in the budget; `rss_mb` per role | FX-CLAIM, FX-CLOSE, FX-PLAN, FX-CGATE built (r57-0507); B2 | today's `admit.test.mjs` and `watch.test.mjs` pass unchanged; new cases per width |
| B13 | Tree: `planAct` order; checker queue age | FX-PLAN; B12 | ordering tests on `planAct`; the queue line carries the age |
| B14 | Several writers: modes table, Write/Edit branch, merge script | the Edit-hook test (C114); measurement 5 | the dummy-edit merge of r57-0506 run through the script counts what git reports |

## 5. Corrections

1. **The week share is not logged** (the rule's Step 1 table, C119; b1-map-lane.md says so). It is read from the
   app by the coordinating session and no file holds it (C26); b1 copied its readings by hand (C27). In the tree the
   meter is a typed-in percent (C33). The table should say "read by hand; not logged".
2. **Free memory is logged only while the recorder runs** (table, C120): started by hand, ends after 12 hours, lines
   carry no date (C17-C19); the log covers two periods of 2026-11-17 (C23). The tree reads it but writes it only
   into admit lines (C71).
3. **Ready work is not logged for the lane** (table, C121): a queued command leaves no line until it starts or gives
   up (C7). For helpers it lives only in the coordinator's state file; for the tree it is the task table.
4. **"Wait: yes" holds only for commands that use the lane**, which is a convention (C14, C15); nothing refuses a heavy
   command outside it.
5. **The lane can exceed its capacity.** Its hold limit is 20 minutes (C9) but a timeout may be 25 (C10) and the
   longest logged command ran 25.0 minutes (C11); a live holder past 20 minutes is broken by the next caller (C8).
   Not seen in the log (never three at once, C12). No record says this.
6. **Three memory floors on one PC:** 2,500 MB in the governor (C20), 1,024 MB in the tree (C65), 4,000 MB in the
   model runner (C96). No record names them together.
7. **"Three child sessions" is a rule, recorded as a measurement.** cost-inputs tags it measured (C83) and x21-0120
   calls it a measured fact (C171), but its source is the rule in CLAUDE.md (C169), and the tree's own design calls a
   fixed three a static level (C170). Under r57-0002 (C163) it is a parameter to compute from measurement 1.
8. **RULINGS.md still says "one at a time"** for the lane (C14); the records were corrected (C172, C12), the file not.
9. **Measurement 6 is partly a count.** The rule says every measurement is an experiment needing the owner's word
   (C122); tokens per unit by class and model, like 7 (C123), can be counted from transcripts already on disk (C53).
   The 5-hour window and cached reads still need readings over time.
10. **The maps' line numbers slip by one** in places: the hard ceiling is admit.mjs line 16 (C58), not 17; N_max is
    thresholds.json line 14 (C63). The design above uses the lines re-read in code.
11. Record o1-0302 says the minimum is "proved best in their model"; the report narrowed the claim to "argues" for
    programs (C128, C134). Both hold; cite the record with the narrowing.

## 6. Not known

- Whether a helper or a child session has a process of its own, so whether its memory can be sampled (section 3.1).
- Whether the desktop app runs a status line, and what `rate_limits` carries (C32: documented only).
- Whether the PreToolUse hooks of a batch of parallel Agent calls run at the same time (C49 is about several hooks).
- What a hook sees for start_session, Bash and Edit (C48).
- Whether the 5-hour window is fixed or rolling; how cached reads count; tokens per point of the meter by model.
  Two readings (C28, C29) put Sonnet near or above 600,000 tokens per point, in whole points only; the R57 round (C30)
  suggests a dearer model costs more per point (hyp).
- The cost of a process query every 2 s, of loading `width.mjs` in each hook and lane call, of a ticket folder poll.
- The quality gap of a cheaper model on our work: none of the eight measurements; no route goes below the routes file.
- What "steady" should mean for a class (C125 is a paper's 5 %).
- Whether a finished but unclosed session still holds memory (section 3.5).
- Whether a coordinator may start a session on the turn after a helper's or a command's end (C98 says refused on a
  helper's notice; part of that record has no source).
- Memory bandwidth on this PC (measurement 8, only if 1 to 3 show an unexplained slowdown).
