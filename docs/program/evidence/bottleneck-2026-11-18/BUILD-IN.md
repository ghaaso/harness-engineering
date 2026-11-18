# Building the decision rule into the harness and the tree (2026-11-18, gated, refuted and folded)

**Status: design only.** Nothing here was built, run or measured. Task r57-0504. The rule is `DECISION-RULE.md`
(records r57-0406 to r57-0408, pointer r57-0705); the eight measurements are its section "Numbers to compute here"
(r57-0511). Every claim cites `b1-claims.md` (C numbers), every choice a D number there; the records are
`library/journal/2026-11-18/b1.jsonl` (b1-0101 to b1-0701; choice Dn is record b1-04nn).
**Verdict marks.** A C or D cited bare was confirmed: by the refuter, or for C27, C28, C36 and C108 by the fold,
which read the two files closed to the refuter. Every other verdict is written beside it: *holds in part* or
*cannot be checked*; none was refuted. A choice that held in part is cited as changed here; section "Verdicts" says
what changed. Literature marks: **lit** proven in the literature (record of the quote), **meas** measured here,
**obs** observed here, **hyp** hypothesis.
*Harness* = a coordinating session, its helpers and child sessions, heavy commands through the lane.
*Tree* = the research tree's scripts in `research-tree/tcb/`, where a node is a session.
Bound by: no question to the owner (C162); every number computed against quality first, then time, memory and tokens
(C163, C164); a missing number named as one of the eight measurements (C158) with a safe default until it exists.

## 0. The answer

1. One pure function, `widths(facts)` in a new `research-tree/tcb/width.mjs`, holds the rule; every gate loads it by
   a guarded import, so a fault in it opens no other check (D1, holds in part, changed).
2. Gates: lane.mjs (heavy commands), the tier hook (helpers, child sessions), admit `decide` and the watcher's start
   test (tree). Each sees one folder; other projects, a tree run and workflow helpers show only in free memory and usage (D4, holds in part).
3. Finishes reach it through files: lane end lines, the ledger, helper meta files plus a transcript-age test (D5, holds in part, changed).
4. Missing signals, smallest producers: per-unit memory and threads (recorder), processor queue, queued commands (lane tickets), usage.
5. Until a measurement exists each gate keeps today's numbers, mostly guesses or null; the first build steps change no behaviour
   (D16, D20, both hold in part), and today nothing acts at the memory floor (the governor matches nothing).
6. The tree needs more: a session is not a known process, committed children hold slots, each wake costs tokens, starts need turns.
7. Correction (proposed, b1-0501): the rule's Step 1 column "Logged today" is wrong for the week share, free memory and ready work.

## 1. The rule, step by step

Each step answers: (1) where the signal is read; (2) the mechanism, who runs it, at which event; (3) what changes;
(4) cost; (5) mark; (6) the measurement it waits for and the safe default.

### 1.0 Step 0: measure each class of unit first

1. **Signal.** *Harness, heavy commands:* time inside per label is on every end line (C6). Peak private memory and
   busy threads per command: not logged today (C24, holds in part: it was sampled three times, by an earlier recorder
   that wrote the largest processes, C25, by the model runner for its own children, C97, and by the suite probe for
   one run's tree, whose sampler was not kept, C116). Smallest producer: the recorder already lists every process
   each 2 s (C22); add one line per running lane command with the summed private memory and processor time of its
   process tree, found from the lane's pid (on every start line, C5) through one process query with parent ids, the
   query the governor already makes (C21). *Harness, helpers:* tokens by kind and model are on disk: each helper has a
   meta file with its description (kind first), model and toolUseId (C53) and a transcript that lib can find and sum
   (C55, C56). Helper memory: missing, and not known to be separable. The tier hook's log has no token or finish
   field (C43); it does not need one. *Tree:* tokens per role come from `cost.mjs from-transcripts`; memory and serial
   fraction are left empty there (C81); a session's peak is a guess (C64).
2. **Mechanism.** Scripts, not hooks: figures exist only after units finish. A script run between waves (the event
   CLAUDE.md rule 5 names for reading usage) writes a class table; gates read it at every start. "Runs alone until
   steady" is narrowed (D9, holds in part, changed): memory can be told apart side by side, through the per-unit line
   for commands and, for sessions, lib's mapping of processes to a session by folder or id (C86), if the app's
   sessions show either (section 3.1). So no class is held alone for memory. Running alone is kept for one thing
   only, measurement 3 (does a unit slow when another runs beside it), and only once the per-unit sampler exists.
   Helpers are never held: each helper's tokens are in its own transcript, and holding them would break r57-0006
   (C165). Weak point: the coordinating session must run the script between waves.
3. **Changes.** New `research-tree/tools/unit-costs.mjs`, function `harnessUnitCosts(sessionId)`: meta files plus
   transcripts to tokens, model and duration per kind. New `research-tree/tools/lane-stats.mjs`, function
   `classFigures(log, recorderLog)`: per label, time inside, memory peak, busy threads. Both write
   `research-tree/lane/classes.json`. `recorder.ps1` main loop: the per-unit line. Tree: `cost.mjs buildUnitCosts`
   fills `rss_mb` and a duration per role from readings at admit and stop (1.1); the readings go into the data of the
   existing admit, stop and commit lines, not new kinds, since the kinds are a closed list (C87).
4. **Cost.** Scripts and hooks spend no model tokens; the coordinator reads one summary line (not measured). The
   process query every 2 s: not measured. Parsing transcripts: not measured (the tree runs it in the background).
5. **Mark.** Measure first: lit (o1-0301, a simulator, C133; r57-0307 a law needs a first measurement, C145). Alone
   for measurement 3 only: hyp (C124, narrowed by D9). "Steady" as 5 % three times is a paper's number, for
   microsecond iterations: hyp (C125, C150).
6. **Waits for** measurements 1, 2 and 6; running alone waits for 3. **Default:** no class table, so no class is held
   alone; lane 2 slots (C2), N_max 2 (C63). Tokens per helper (the first part of 6) is a count over transcripts, not a
   run (D20, holds in part).

### 1.1 Step 1: work out each width

1. **Signals, and the smallest producer of each missing one.**

| Resource | Harness | Tree |
|---|---|---|
| Free memory | recorder every 2 s, only while it runs: started by hand (C19), ends after 12 h (C18), no date in lines (C17); three periods of 2026-11-17 and no line since 21:51 that day (C23, holds in part: three periods, not two). The lane and the hook can read it from the OS themselves, as lib does (C73) | read at each admit and tick (C73); written only into the admit line (C71) |
| Peak per class | not logged (C24, holds in part); the recorder's per-unit line (1.0) | guess 1,200 MB (C64); add private memory to lib's process query (C85) so each admit and stop records it |
| Busy threads, ready queue | whole-PC share only, from the same hand-started recorder (C17); missing: busy threads per command (same per-unit line) and the processor queue (one more counter beside C16) | none; sessions waiting on the model use little processor (C127, cannot be checked: no per-process processor figure is on record) |
| The check | time inside per label (C6), 596 s per suite run (C13, C115), 2 slots (C2), wait (C5), for commands that use the lane. Time outside: missing; smallest: the tier hook logs each Bash call that runs lane.mjs with the helper's id, so a builder's time between its commands can be joined to the lane log | the checker: batch of 12, a guess, no wait (C78-C80); duration per checker session from its transcript |
| Bandwidth | none; no term | none |
| Shared files | section 1.7 | section 1.7 |
| Tokens | week and 5-hour shares read by hand from the app (C26) and copied by hand into state files (C27); no file logs them. Smallest reader, tested in this order (D15, holds in part, changed): a session tool named `get_usage` in this app's tool list (never tried); a usage file the coordinator appends at each fan-out; a status-line logger (C32, documented only, a terminal feature, while the login here is in the desktop app). Per helper: on disk (C53-C56) | spend per attempt from transcripts; meter typed in (C33) and turned into tokens per point (C34). Admit's budget test (C61, C62) is already the token width's form, but its cap is unset (C66), so it never refuses today |
| Ready work | lane: queued commands invisible (C7); a ticket file per waiter (1.4). Helpers: the coordinator's plan only | runnable rows of the task table |

   **Width per resource** (the shapes; no number is set):
   - memory: the units of a class that fit in free memory less a reserve less what running units may still grow
     into; the model runner already admits this way (C95); cost.mjs prints the same form and no gate reads it (C82);
     admit uses one flat peak for every session (C60); paused units count (C151);
   - processor: expected busy threads of running units plus the new one at most 24, and no excess in the queue;
   - the check: case A, round(sqrt(time outside / time inside)) for pieces of one task; case B, slots x (outside +
     inside) / inside builders for one check per change (C147). Building the fixes is case B;
   - tokens: a budget (C155): no limit while what is left in the window covers the reserve, the open estimates of
     running units and the new unit's estimate; otherwise 0. What is left = (cap - share now) x tokens per point;
   - ready work: its count.
2. **Mechanism.** The recorder (every 2 s) only records. The lane reads its slots and the ticket folder at each poll;
   its memory and processor terms stay off until a per-command peak exists (B9), since nothing logs one (C24; D3,
   holds in part). The tier hook reads memory, the usage reading and the check flag at each helper or child-session
   start; admit reads memory, slots and spend at each `replace start`; the watcher reads memory and context at each
   tick. Each reads at the event where it decides (D2). The usage reading is the one input a session supplies by hand
   until a reader is tested (D15, holds in part); the tree's own design says only a session can read the meter (C31).
3. **Changes.** `recorder.ps1`: date on every line, the queue counter, the per-unit line. `lane.mjs`: child pid and
   class on the start line, a ticket per waiter. `tier-hook.mjs`: the Bash/lane log line. Tree: `lib.mjs` process
   query (+ private memory) and `edgeFacts` (+ the latest usage reading); `admit.mjs gatherFacts` reads per-role
   peaks from `plan/unit-costs.json` instead of the flat `peak_mb`.
4. **Cost.** Hook: about 37 ms per call already paid (C46); added file reads not measured. One more counter and one
   process query per 2 s: not measured. Tokens: none, except the coordinator's usage line (not measured).
5. **Mark.** Memory: lit (C129 collapse, analytic; C131 caps from measured use, which needs a usage history per job
   we lack); paused units: hyp (C151). Processor: lit (C132, spinners that cost nothing to stop; C130 throttle, never
   kill, Borg cells). Check: case A lit (C133), case B hyp (C147). Tokens: hyp, no paper (C153, C155).
6. **Waits for:** memory and threads 1; check 2, 3, 4; bandwidth 8; files 5; tokens 6. **Defaults:** peak 1,200 MB
   per session (C64, a guess); lane commands 332 MB private (one run, C115); processor term off (whole-PC share alone
   is not a width); check width = the lane's 2 slots, test files one at a time until 4 is run (C160); token cap = the
   phase's agreed cap in its state file (C27; b1's was "stop at 55 %" of the week, b1-state.md:10, read by the fold);
   the 5-hour window gives no width until it is read, and a limit hit early (about 75 minutes into one window in
   October, C37) holds every start and is reported, never waited on.

### 1.2 Step 2: the width is the smallest of these

1. **Signal.** The widths of 1.1; nothing new.
2. **Mechanism.** `widths()` returns each width, the smallest, and the resources within one unit of it ("two at once").
   Pure, like `decide` (C57). Every gate calls it and logs the binding resource with its decision: lane start line,
   tier-hook log, admit ledger line; the limit moves from job to job in our own record (C117), and these lines show
   where it went. If ready work gives the smallest, capacity is idle and the gate says so: start more (C165). Script
   code called by each gate, so the rule exists once (D1, holds in part, changed); two copies of one rule set are
   already a known gap in the tree (C107), and admit and the watcher test room to start separately (C59, C74).
   Two limits of "once" the refuter found: a tree run uses its own copy of `tcb/` in its run folder (C173; the
   coordinator's settings load `{root}/tcb/`), so a run keeps the `width.mjs` it was started with; and a static import
   of a broken `width.mjs` would crash the tier hook with exit 1, which lets every start through, routes included.
   So each caller loads it by a guarded dynamic import, as guard-hook loads lib (`guard-hook.mjs` lines 8-9): a load
   fault in the width part allows and logs, and never reaches the routes part (1.3).
3. **Changes.** New `research-tree/tcb/width.mjs`: `widths(facts, params)`, `fitScore(needs, free)`. Callers:
   `admit.mjs decide` sections 6 and 7; `watch.mjs` `slotFree`, which becomes a count (1.3); `lane.mjs capacity()`;
   `tier-hook.mjs` after its early exit for other tools (C39), so other tool calls pay nothing.
4. **Cost.** Arithmetic only; not measured. The hook's own work was under 1 ms in the probe.
5. **Mark.** The minimum: lit for two limits in a model (C134), narrowed: no tested program had both (C128). As a
   rule over more resources: hyp (r57-0408). Never "share whatever binds now": lit, one run (C146).
6. **Waits for** nothing of its own. **Default:** the outer cap stays min(N_max, N_ceiling, 3) (C58, C59), and an
   N_max above N_ceiling or 3 stays a refusal ('ceiling'), not a clamp (C59); the lane's file stays the lane's upper
   bound (C1-C3).

### 1.3 Step 3: act only at the gate

1. **Signal.** Width against units running. Running: lane slot folders, all of them (below); helpers whose meta file
   has no finished key and whose transcript was written within T_quiet (C54, D5); the tree's live, unknown and
   unconfirmed attempts (C59). Memory floor: free memory (C16, C73).
2. **Mechanism.**
   *Heavy commands* (D3, holds in part, changed). lane.mjs `tryAcquire` already holds and never kills except at a
   timeout (C1, C4); its count becomes the smaller of the file and the width, with three repairs. (a) It counts every
   held slot folder, slot-0 to slot-3, against the width: today it tries only slots below the count, so after the
   count falls a holder of a higher slot is not counted and a waiter takes slot-0. (b) It breaks a stale slot by first
   renaming the folder to a name of its own; of two waiters that judge one slot stale only one rename succeeds (today
   the second can delete the first's fresh slot; there is no fence). (c) It writes `owner.json` by temporary file and
   rename, with the command's own timeout in it, and breaks a live holder only after its start plus that timeout plus
   a margin, with an age cap against pid reuse (D21); a half-written file then never breaks a live slot after 15 s (C8).
   *Helpers and child sessions* (D4, holds in part). The tier hook, which handles PreToolUse only (C38), refuses by
   exit 2 (C40), seen to work on a helper start (C45); a workflow cannot read files (C51) and an instruction is the
   weakest form (the mix of C159 and the ruling C167). Its reach is one folder: it runs only in sessions that load this
   repository's project settings (C44); a tree run lives outside every repository under guard-hook only (C94, C173);
   helpers a workflow script starts are not the session's Agent calls and may not pass PreToolUse (untested, C48), up
   to 16 at once by default. So the width part is wired in the user settings, where every folder's sessions load it,
   while routes stay project-only (hyp; B10 tests it in another folder and on a workflow helper). Until that is seen,
   a workflow script's own concurrency is set to the width by its author, and other sessions show only through free
   memory and the week share, which are PC-wide and account-wide: a named limit.
   A refusal returns to the coordinator with text that says when to retry: after the next finish notice, never by
   polling, since each poll is a model call over the whole context (D11, holds in part, changed). A refused start
   leaves no ticket, so the retry is a step the coordinator must remember: a named limit.
   *Running units and finishes* (D5, holds in part, changed). Finishes need no hook: the meta file gains its finished
   key (C54); SubagentStop also fires if one is ever needed (C47). But a missing key outlives helpers that ended
   without it (11 of 404 meta files on this PC for helpers long ended, the refuter's count), and each would hold a
   slot for ever; so a helper counts as running only if its transcript was also written within T_quiet. T_quiet is
   counted from transcripts on disk, the longest silence in a helper that later finished (B4); until then 45 minutes,
   the lane's default wait of 900 s plus its largest timeout of 1,500 s, rounded up (a guess).
   *No lock* (D5, holds in part, reason changed). A lock could fail closed, since a stalled hook lets the call through only "unless
   onFailure: block is set" (C50, holds in part: the claim dropped that exception). The case against a lock is its
   release: a helper that crashes never releases what it took, the fault of the missing finished key again. Whether the
   hooks of one parallel batch run at once is not known (C49 is about several hooks on one event), so without a lock a
   parallel batch may overshoot by its size less one; for tokens that is harmless
   while the budget has room (C155); for memory the overshoot is unknown, since a helper's peak was never measured
   (C64 is a session's guess): a named limit.
   *Failure* (D6, holds in part, changed). The width part fails open with a log line, as unreadable input already does
   (C42). The routes part is wrapped so that any exception refuses (exit 2); today it fails closed only for an
   unreadable or unparsable file (C41), while routes that parse to null or a kind without models throw and exit 1,
   which lets the call through. The backstop assumed behind a fail-open width is not there today: the governor (C20)
   stops only processes whose command line holds `tcb-build` (C21), which no lane command has carried since
   2026-11-17 08:42 UTC, and the recorder that runs it is started by hand (C19) and silent since 21:51 that day. B9
   points its match at the lane's own process trees (pids from the start lines). Until then nothing acts at the floor
   in the harness: a named limit.
   *Lane use itself* (D7, holds in part, changed). The hook logs, and does not refuse, a Bash or PowerShell call that
   starts Node outside lane.mjs. A refusal would block the model ladder run, which "loads every core for an hour or
   more" (RUN-LADDER.md line 62), and the tree's watcher, since the lane kills at 1,500 s; the PowerShell tool starts
   Node where a Bash branch does not look; npm, npx, `cd x && node`, `sh -c` and paths escape (C52); and a hook's
   refusal of a Bash call is untested (C48). Lane use stays a convention (C14, C15): a named limit, now with an audit.
   *Tree.* admit refuses and replace defers with exit 6 (C70), so admit stays the gate (D8, holds in part, changed),
   and the watcher's start test changes with it: `slotFree` becomes the count `widths()` gives, taken down by one for
   each replace-start offered in the tick; today one free slot can give several replace-start acts in one tick (C75)
   that admit then defers, the wake loop FX-PLAN exists to stop. FX-CGATE makes the hook refuse a session start admit
   did not grant. At the floor the watcher raises class 24 (C76) and the coordinator stops the least important child
   with stop.mjs and its own tools; no script stops a session (C72). Weak: a step the coordinator must take.
3. **Changes.** `lane.mjs tryAcquire` (count over all slots, break by rename, `owner.json` by rename with its timeout)
   and `MAX_HOLD_MS` (own timeout plus margin, D21); `tier-hook.mjs`: a fail-closed wrapper round the routes part, a
   width branch for Agent and start_session after it, a Bash and PowerShell audit branch; the user settings: the width
   hook (hyp); `.claude/settings.json` unchanged (matcher `*`, C44). Tree: `admit.mjs decide` sections 6-7;
   `watch.mjs` line 554 and `rowAct`'s `slotFree` as a count.
4. **Cost.** Hook: a few small file reads per start, not measured. A refusal puts its message into the coordinator's
   context (tokens not measured).
5. **Mark.** Kill for memory, throttle for processor: lit (C130, Borg cells). Memory as a cliff: lit, analytic (C129).
   Gate only: hyp (C148). The hook refusing a helper: obs, one session (C45); on start_session, Bash, PowerShell and
   workflow helpers: not tested (C48). A hook in the user settings reaching every folder and a tree run: hyp.
6. **Waits for** 1 (peaks set the reserve). **Default** (D16, holds in part, changed): admit a unit only while free
   memory less the open peaks of running units less the new unit's peak stays above 4,000 MB, the model runner's form
   and floor (C95, C96); 4,000 MB is a floor left after the units' sizes, not a reserve before an unknown peak. The
   peaks are the guesses 1,200 MB per session (C64) and 332 MB per lane command (one run, C115). Stop floor 2,500 MB,
   the governor's (C20), with no actor until B9. The lowest free memory on record is 7,306 MB (C118), so no bound
   binds yet.

### 1.4 Step 4: choose the next unit

1. **Signal.** Needs per class (class table), free resources (1.1), expected time inside the check per label (lane
   end lines, C6). Tree: per-role unit costs and each row's estimate.
2. **Mechanism.** *Lane* (D10, holds in part, changed): waiters write tickets (pid, label, time, needs). A slot goes
   first to tickets whose needs fit what is free (fit as a filter, C143), among them to the shortest expected check
   time per label (from the log's labels and ms), then the oldest, with an age cap so no ticket starves. Fit first
   would start long light commands before short heavy ones, which can be Omega(n) worse (C144) and which o2-0403
   orders the other way; o2-0309's packing minimises bins, not finish time (C143). A ticket whose pid is dead, or
   whose age passes the lane's longest wait (pid reuse), is removed. Today waiters have no order (C4). The lane is the
   only place that sees heavy waiters. *Helpers:* the coordinating session chooses; no hook can choose, it can only
   refuse (D11, holds in part). Its brief says: start every ready unit at once unless refused (C165); order matters
   only when a width binds. *Cheaper model:* the routes file stays the routing (C168); no move below it until a quality
   gap is measured on our work (C154), which is none of the eight measurements (section 6). *Tree:* FX-PLAN's new
   `planAct` filters candidates by `fitScore` and starts short checks first, not table order (C75, C103). Checker
   items: oldest intake first instead of by field and card id (C79).
3. **Changes.** `lane.mjs` around the wait loop (lines 70-73); `width.mjs fitScore` (a filter); tree: `lib.planAct`
   (FX-PLAN), `check-queue.mjs plan()` sort (line 311).
4. **Cost.** Each waiter reads the ticket folder every 700 ms: not measured.
5. **Mark.** Fit: lit (C143), as a filter: hyp. Short first, nothing held while queued: hyp (C152). Never-idle can be
   far off when long light jobs start first: lit, worst-case theory (C144). Next unit by fit: hyp (C156), narrowed here
   to a filter (proposed correction of r57-0407, b1-0506).
6. **Waits for** 1 and 2. **Default:** without needs, order by shortest expected check time then age; the times are
   in the lane log already.

### 1.5 Step 5: cross-check with the wait

1. **Signal.** *Harness:* the wait on every lane start (C5); waiters still queued, their count and oldest age, are
   read from the tickets directly (D12, holds in part, changed): a flag worked out from end lines lags, since a waiter
   is invisible until it starts or gives up (C7) and two ends can be 596 to 1,500 s apart (C13, C10). *Tree:* the
   checker's wait is not recorded (C80); the watcher already counts candidates every tick (C78) and takes their oldest
   age there (D13, holds in part, changed): check-queue's ledger line is written only when a batch forms, so between
   batches the age would go unseen.
2. **Mechanism.** At each poll the lane reads the ticket folder; at each end it writes the shortest wait over the last
   window, the queue's count and its oldest age into a small stats file by temporary file and rename, since several
   lane processes write it. A wait above zero means a standing queue: the check binds whatever the processor shows,
   and the width marks it binding. The tier hook reads the flag when a build or run helper starts. A shared serial
   step needs its own signal (C136), so the lane, not the recorder, is the sensor. *Tree:* the watcher's class 14 test
   (C78) reads the age; a standing checker queue stops the planner from starting more research children than the
   checker can judge.
3. **Changes.** `lane.mjs` wait loop and end handler (lines 92-99); `tier-hook.mjs` reads the stats file; tree:
   `watch.mjs evaluate` (lines 539-541).
4. **Cost.** Reading the ticket folder at each poll and writing the stats file at each end: not measured.
5. **Mark.** The wait, not processor use: lit (C135). Its own signal for a shared step: lit (C136).
6. **Waits for** 2 (the window) and 7, which is not a count after all (D20, holds in part): the log holds no slot
   count, and one slot held only from the lane's start at 03:11 to the first overlap at 03:50 on 2026-11-17, under
   other work, so a count compares two workloads, not one slot against two. **Default:** window = one suite run,
   596 s (C115); target zero.

### 1.6 Step 6: a slow outer check

1. **Signal.** Throughput against units at once after about 100 finished units. The lane log already holds 780
   (C12), 28 s per command on average (364.6 min over 780), so a step of 100 is about 45 minutes at the lane's pace;
   helpers: finished meta files; tree: commit lines.
2. **Mechanism.** A script run between waves and at a phase's end; it confirms or questions the rule and drives
   nothing, so it cannot break a gate (D14).
3. **Changes.** `lane-stats.mjs`, function `throughputByLevel(log)`; `unit-costs.mjs` for helpers; tree: a summary
   line from `cost.mjs from-transcripts`.
4. **Cost.** Script only; the coordinator reads one line.
5. **Mark.** Throughput search needs hundreds of units: lit (C137, gains in figures not read); outer check only: hyp
   (C149).
6. **Waits for** none of the eight; the lane's part is a count now. **Default:** no action from it.

### 1.7 Several writers on one file

Where it applies. *Harness:* building the 13 fixes and 0b, several builders on `lib.mjs`, `status.mjs`, `watch.mjs`,
`thresholds.json`: 20 shared places, 9 separate entries, 7 ordered sequences, 4 same statements (C112, counted from
the change list, not from diffs). *Tree at run time:* no shared work file by construction: a child writes only its
staging folder (C88); objects are stored by exclusive create and never repaired (C89); disagreeing verdicts are
flagged (C90); run state has one owner under the run lock with compare-and-set (C91). The tree already runs both
modes, chosen by place, and is left as it is (D18).

1. **Signal.** Conflicts per file: missing (C24, holds in part; its conflicts part stands). Smallest producer: the merge script named in r57-0401 (C113)
   writes one line per merge: file, place, clean / conflict / merged but failed the check, tokens of the redone
   unit. Wait cost: how long a builder waited for an owner. What is scarce now: tokens (1.1) and the check (1.5).
2. **Mechanism.** *Before work:* the build plan gives each of the 20 places a mode from the change list: own copies
   for the 9 separate entries, one owner or a split first for the 11 others. A PreToolUse branch on Write and Edit
   refuses a write to a one-owner file by a helper that is not its owner (D17, holds in part, changed). The hook knows
   a helper only by agent_id, and a meta file holds a description, not files; so ownership is written at the start:
   the build plan names each unit's label and files, the tier hook's start line records the toolUseId with the label
   (B6), and the branch goes from agent_id to the meta file's toolUseId to the label to the owner in the modes table.
   *While work runs:* the merge script counts conflicts per file and moves a file to one owner when chance of
   conflict x cost of redoing > cost of waiting, in whatever is scarce now; it moves back after a set number of quiet
   units; a change applies only to units started after it. The count lives where merges happen, the refusal where
   writes happen. Every merge passes the check. Named limits: the Edit hook is untested (C48, C114) and writes through
   Bash or PowerShell are not seen; the merge script's count is the backstop.
3. **Changes.** New `research-tree/tools/merge.mjs` (`mergeUnit`, `countConflict`); a modes table
   `research-tree/build/modes.json` (file, mode, owner label, since); `tier-hook.mjs` Write/Edit branch; the build
   plan, which does not exist yet (C110).
4. **Cost.** A file read per Write (not measured); a check per merge, 596 s per suite run (C115).
5. **Mark.** Locking wins when resources are scarce: lit (C141, a simulation). Count per object: lit (C138); back
   after quiet runs: lit (C139); switch between units: lit (C140). Clean merges still fail tests: lit (C142; 1 % and
   6 % of all merges). The rule itself: hyp (C157).
6. **Waits for** 5 (conflicts on our own neighbouring lines), 6 (tokens per redone unit), 2 (wait). **Default:** one
   owner for the 11 places where a conflict is certain, own copies for the 9; no switching until 5 exists. The Edit
   refusal waits for its test (C114); only Write was seen refused (C48).

## 2. Fit with the 13 fix designs and 0b

Files and functions per fix: `b1-map-fixes.md` table (C108, confirmed by the fold: the FX-PLAN row stands at line 25,
`rowAct` is at watch.mjs line 135 and `nextOf` at status.mjs line 520, where S17 line 253 points, and `planAct` is
new); `slotCount` and `rowAct` re-read in code.

| Fix | Verdict | Why |
|---|---|---|
| 0b strict hook write | leaves alone | 0b is strict create inside FX-OUT, FX-CLAIM, FX-CGATE (C99); guard-hook reads only today (C92) and takes no lock after the fixes, where it writes by exclusive create (C106). No gate here writes inside the tree; widths are read. In the build, 0b first is what lets 8 builders work at statement grain (C112) |
| FX-OUT outcome log | leaves alone | Makes the finish event reliable. Readings added to the commit line must go in after FX-OUT changes `recordPass` (same lines) |
| FX-CLAIM one claim per attempt | leaves alone | Changes `slotCount`, which the width reads as "running" (C100). A leased start counts as running |
| FX-CGATE coordinator hook | leaves alone; relies on it | The fencing token at the session start (C101) turns admit's width from a step the coordinator must remember (C72) into a refusal at the start |
| FX-CLOSE release a finished child | leaves alone; relies on it | Frees a slot only after a verified close (C102); the tree's finish event is that close (section 3) |
| FX-REDO missing ledger line | leaves alone | A reading is data of its ledger line, written once with it, so repeat calls stay idempotent |
| FX-PLAN planner | changes | `planAct` (C103) is where Step 4's order goes; its "slot free" test must be `widths()`, counted down per start offered in a tick (1.3) |
| FX-W1 liveness, markers | leaves alone | Alarm processes are not units; their memory is inside the reserve |
| FX-W2 alarm slots | leaves alone | `alarm_slots` are wake slots, not work width; not counted |
| FX-W3 armed before work | leaves alone | The width decision runs inside the run lock its `requireArmed` guards |
| FX-W4 dead-man | leaves alone | An alert outside the tree |
| FX-W5 re-raise act-due | leaves alone, one condition | `rowAct` gives no act for a start without a free slot (C75); once that test is the width count, a held start is not raised as due, and one free slot no longer gives several acts in a tick |
| FX-W6 per-kind deadlines | leaves alone; shares data | Its per-kind timings (C104) are the durations Step 0 wants per class; read, not changed |
| FX-W7 watcher lock | leaves alone | The one-owner case of 1.7 at run time (C105), the right mode for a place where a conflict is certain |
| "The plan check" (C109) | replaced in part | Its lane count fixed before work becomes the width at every event; it keeps the before-work modes of 1.7 |
| N_max, N_ceiling, 3 | changes | Become the outer cap and the defaults of `widths()`; no fix changes N_max; `widths()` keeps the 'ceiling' refusal (C59). widths() in admit and the watcher lands on places the fixes change (C108, r57-0128), so it is built after them (B12) |

New thresholds the rule adds ship as marked guesses, as the fixes' do (C111).

## 3. What the tree needs that the harness does not

1. **A node's memory is a session's, not a known process's.** Live attempts are found by folder or session id in
   command lines (C86, report only); whether app sessions show either is not recorded. The per-role peak may be
   readable only as the app's total with 0 to 3 children: measurement 1 run on sessions. Until then: 1,200 MB (C64)
   and three at most.
2. **Tokens accrue for the node's whole life, mostly as re-reads** (C35, measured on clinic and FixFlow sessions, not
   on this tree). A coordinator pays its context at every wake: b1 stopped at 135,000 tokens, 64,000 of them fixed
   load (C36, b1's own report at b1-state.md lines 3-4, read by the fold, not recounted). Waiting costs tokens only at
   a wake (a poll or a notice), not while a session is blocked on a tool or a helper; and once its prompt cache lapses
   each wake pays cache writes at weight 1.25 instead of reads at 0.05 (C126, holds in part; thresholds.json line 64).
   So the several-writers threshold and a deferred start count wakes x context, at the write weight once a wait
   outlives the cache. Measurement 6 (how cached reads count) sets the weights.
3. **Context is a second cliff.** The coordinator drains at 133,200 tokens (C67, C77), designed not measured (C161),
   and admit blocks every start while draining; context is a width of 0 for new starts then. The harness has the
   same ceiling (C166) but no hook sees context (C46): there it is a step the session must remember.
4. **Handover and starts are bound to turns.** A session can start another on a turn the owner typed; on a turn begun
   by a helper's notice it was refused (C98, holds in part: the record's "or after one of its own sessions ends" has
   no source; open in C174). A start deferred by memory or the checker can be retried only on such a turn, not when a
   heavy command ends or the watcher wakes. The width may have room that no turn can use.
5. **Committed children hold slots.** The last attempt of a committed row counts as one slot until its stop is
   confirmed (C84), after 2 ticks of 60 s (C68, C69). So a unit finishes at its verified close (FX-CLOSE), at least
   two minutes after its work; the width counts it as running until then (D19). FX-CLOSE's "no such session" rule
   keeps a lost session from holding the slot for ever. Safe: an open session may hold memory.
6. **No automatic stop at the floor.** No script stops a session (C72), and the governor stops only `tcb-build`
   processes (C21), which match nothing today. The floor is the coordinator's act on class 24; the admission floor
   (1.3) compensates.
7. **The tree's run bypasses the lane.** Guard-hook lets the tree's coordinator run only `node tcb/<name>.mjs` (C93),
   so lane.mjs itself is refused there (C15); the tree's settings wire guard-hook and not the tier hook (C94), and a
   run lives outside every repository (C173). Two gates on one PC that do not see each other: the tree's admit must
   read the lane's slot folders (or the lane form must be allowed by guard-hook) before both run at once.

## 4. Build order

First the pieces that need no measurement; none changes behaviour until its inputs exist. Checks are named, not run.

| # | Piece | Depends on | How it is shown to work |
|---|---|---|---|
| B1 | Section 5's corrections as proposed corrections (b1-0501 to b1-0506); the top session adjudicates, then the rule's table and the records are corrected | nothing | each adjudicated line greps as written |
| B2 | `width.mjs` with today's numbers, no caller yet; the guarded import its callers use | nothing | equivalence test: for every case in `admit.test.mjs`, `widths()` admits and refuses as sections 6-7 of `decide` do; a broken `width.mjs` gives allow-and-log, never exit 1 |
| B3 | `lane-stats.mjs` over the existing log: per-label times, the lane's part of Step 6 | nothing | reproduces r57-0127: 780 commands, about 365 min run, 177 min waited, 41 of 324 min two at once (C12). It does not give measurement 7 (D20, holds in part) |
| B4 | `unit-costs.mjs` for helpers: tokens per unit by kind and model (measurement 6, first part, a count); T_quiet from the same transcripts | nothing | the five readers of b1's session sum to the 584,000 tokens of its state file (C28, b1's report, not yet recounted) |
| B5 | `lane.mjs`: count every held slot; break by rename; `owner.json` by rename with the command's timeout; hold until its start + timeout + margin, age cap (D21); child pid and class on the start line; a ticket per waiter; the recorder log's age on the start line | nothing | lane tests: a live 25-minute holder keeps its slot; with slot-1 held and the count lowered to 1, a waiter does not start; two waiters breaking one stale slot leave one owner; a waiter leaves a ticket |
| B6 | `tier-hook.mjs`: a fail-closed wrapper round the routes part; log lines for Agent and start_session starts with toolUseId and label, and for Bash and PowerShell calls that start Node, with or without the lane | nothing | self-tests: routes that parse to null refuse; the 6-step real-session pattern of r57-0120 leaves one line per start and lane call |
| B7 | Audit of Node outside the lane (D7, holds in part: a log line, no refusal) | B6 | a `node --test` without the lane leaves an audit line, the same through the lane leaves none; nothing is refused |
| B8 | A usage reader: first the session tool `get_usage`; failing it, a usage file the coordinator writes at each fan-out; then a status-line logger | a test of each in that order (C32) | two readings across a 5-hour boundary say fixed or rolling (measurement 6) |
| B9 | `recorder.ps1`: date, queue counter, per-unit line; the governor's match moved from `tcb-build` to the lane's process trees | B5 (child pid); the owner's word: running it is measurement 1 | beside one suite run its private peak is near the probe's 332 MB (C115); the governor's match names the running lane command's tree in its log |
| B10 | Width gate in the tier hook (memory, usage, check flag, running count with T_quiet), wired in the user settings | B2, B4, B6, B8 | a usage reading at the cap refuses a helper; a low free-memory reading refuses; a fault in the width part allows and logs; it fires in a session in another folder and on a helper a workflow starts, or that path is a named limit |
| B11 | Lane count from the width over all held slots; ticket order (fit filter, shortest, age); queue stats from the tickets | B2, B3, B5, B9 | `lane-stats` on the next 100 commands against B3's baseline: wait and throughput by level |
| B12 | Tree: `width.mjs` in admit and in the watcher's start count; window term in the budget (inert while B_tokens is null, C61); `rss_mb` per role | FX-CLAIM, FX-CLOSE, FX-PLAN, FX-CGATE built (r57-0507); B2 | today's `admit.test.mjs` and `watch.test.mjs` pass unchanged; a tick with one free slot offers one replace-start |
| B13 | Tree: `planAct` order; the checker queue's oldest age in `watch.mjs evaluate` | FX-PLAN; B12 | ordering tests on `planAct`; the watcher's state carries the age |
| B14 | Several writers: modes table with owners from the start lines, Write/Edit branch, merge script | the Edit-hook test (C114); measurement 5; B6 | the dummy-edit merge of r57-0506 run through the script counts what git reports |

## 5. Corrections

None of these edits a record or the rule's page; each contradiction of a record is a proposed correction for the top
session (b1-0501 to b1-0506).

1. **The rule's Step 1 column "Logged today" is wrong** (b1-0101, proposed correction of r57-0705 as b1-0501).
   Line 71, "Week share yes": no file logs the week share, the 5-hour share or tokens per unit (C119; b1-map-lane.md
   F11, F12 and line 60); the week share is read from the app by the coordinating session (C26) and copied by hand
   (C27); in the tree the meter is a typed-in percent (C33). Line 66, "Free memory yes, every 2 s", and line 67,
   "Whole-PC share yes", hold only while the recorder runs (C120): started by hand, it ends after 12 hours, its lines
   carry no date (C17-C19), and its log holds three periods of 2026-11-17 and nothing after 21:51 (C23, holds in
   part). Line 72, ready work "Yes": not logged (C121): a queued command leaves no line until it starts or gives up
   (C7); for helpers it lives only in the coordinator's state file; for the tree it is the task table. Line 68, "Wait
   yes", holds only for commands that use the lane, which is a convention (C14, C15). o1-0102 ("already logs" free
   memory) bears on it (b1-0502).
2. **Per-process memory has been sampled, though nothing samples it now** (C24, holds in part; b1-0502, proposed
   correction of o1-0102 together with the free-memory point of item 1).
3. **Measurement 7 is not a count, and measurement 6 is partly one** (b1-0503, proposed correction of r57-0511). The
   rule says every measurement is an experiment needing the owner's word (C122) and that 7 is a count (C123). Tokens
   per unit by class and model can be counted from transcripts on disk (C53); the 5-hour window and cached reads still
   need readings over time. Measurement 7 cannot be counted: the log has no slot count, and one slot held only from
   03:11 to the first overlap at 03:50 on 2026-11-17 (capacity 2 committed at 04:00 in 7358773d) under other work.
4. **"Three child sessions" is a rule, recorded as a measurement** (b1-0504, proposed correction of x21-0120).
   cost-inputs tags it measured (C83) and x21-0120 calls it a measured fact (C171), but its source is the rule in
   CLAUDE.md (C169), and the tree's own design calls a fixed three a static level (C170). Under r57-0002 (C163) it is a
   parameter to compute from measurement 1.
5. **A waiting session costs tokens at each wake, not while it waits** (b1-0505, proposed correction of r57-0408,
   which says side-by-side work costs extra through "a waiting session re-reading its context"; C126, holds in part).
6. **The next unit is chosen by fit as a filter, then shortest first** (b1-0506, proposed correction of r57-0407,
   which puts best fit first; D10, holds in part, against o2-0310 and o2-0403).
7. **The lane can exceed its capacity** (b1-0102 to b1-0104). Its hold limit is 20 minutes (C9) but a timeout may be
   25 (C10); a live holder past 20 minutes is broken by the next caller (C8). The longest logged command, 25.0
   minutes (C11), was a timeout kill (exit 124 at 1,500,104 ms); the same label's run before it ended at 1,193,636 ms.
   Also: a lowered count leaves a higher slot uncounted; two waiters can break one slot twice; one failed read of
   `owner.json` breaks a live slot after 15 s. Not seen in the log (never three at once, C12). No record says this.
8. **Three memory floors on one PC:** 2,500 MB in the governor (C20), which matches nothing today (C21), 1,024 MB in
   the tree (C65), 4,000 MB in the model runner (C96). No record names them together (b1-0120).
9. **The tier hook's routes part fails closed only for an unreadable or unparsable file** (C41, b1-0108): routes that
   parse to null, or a kind without models, throw, exit 1 and let the call through. The hook's own message ("Nothing
   is started until it is fixed") promises more; no record says otherwise, so this is a fact, not a correction.
10. **RULINGS.md still says "one at a time"** for the lane (C14); the records were corrected (C172, C12), the file not.
11. **The maps' line numbers slip by one** in places: the hard ceiling is admit.mjs line 16 (C58), not 17; N_max is
    thresholds.json line 14 (C63). The design above uses the lines re-read in code.
12. Record o1-0302 says the minimum is "proved best in their model"; the report narrowed the claim to "argues" it, and
    no program it tested had both limits (C128, C134). Both hold; cite the record with the narrowing.

## 6. Not known

- Whether a helper or a child session has a process of its own, so whether its memory can be sampled (section 3.1).
- Whether the session tool `get_usage` gives the week and 5-hour shares; whether the desktop app runs a status line,
  and what `rate_limits` carries (C32: documented only).
- Whether a hook in the user settings fires in sessions of other folders, in a tree run that loads its own settings,
  and for helpers a workflow script starts.
- Whether the PreToolUse hooks of a batch of parallel Agent calls run at the same time (C49 is about several hooks on
  one event).
- What a hook sees for start_session, Bash, PowerShell and Edit (C48).
- T_quiet: the longest silence of a live helper's transcript (a count over transcripts on disk, B4).
- Whether the 5-hour window is fixed or rolling; how cached reads count; tokens per point of the meter by model.
  Two readings (C28, C29) put Sonnet near or above 600,000 tokens per point, in whole points only. The week's move of
  26 % to 39 % in seven hours (C30, holds in part) was all sessions together, not the R57 round alone, so it says
  nothing on its own about a dearer model's cost per point.
- Processor use of a session waiting on the model (C127, cannot be checked).
- The cost of a process query every 2 s, of loading `width.mjs` in each hook and lane call, of a ticket folder poll.
- The quality gap of a cheaper model on our work: none of the eight measurements; no route goes below the routes file.
- What "steady" should mean for measurement 3 (C125 is a paper's 5 %, for microsecond iterations).
- Whether a finished but unclosed session still holds memory (section 3.5).
- Whether a coordinator may start a session on the turn after a helper's or a command's end (C98, holds in part).
- Memory bandwidth on this PC (measurement 8, only if 1 to 3 show an unexplained slowdown).

## Verdicts

**Gate** (`b1-gate.md`): 174 PASS of 174. It checked only that each quote stands at its cited place, not that the claim
follows from it.

**Refuter** (`b1-refute.md`, 174 claims and 21 choices): 168 confirmed, 22 hold in part, 0 refuted, 5 cannot be
checked. Four of the five (C27, C28, C36, C108) cite files the refuter's brief closed to it; the fold read them and
confirms them: the quotes stand at b1-state.md line 10, line 12 and lines 3-4, and b1-map-fixes.md line 25. C28 and
C36 are b1's own report, not recounted (B4 recounts C28); C108's functions exist where S17 line 253 points (`rowAct`
watch.mjs line 135, `nextOf` status.mjs line 520) and `planAct` is new, as the map says. The fold also settles the
part of D16 the refuter could not check: b1's week cap is "stop at 55 %" (b1-state.md line 10). C127 stays cannot be
checked. **After the fold: 172 confirmed, 22 hold in part, 0 refuted, 1 cannot be checked.**

**What each narrowed item changed.**

| Item | Refuter's point | What changed here |
|---|---|---|
| C23 | three periods, not two (gap 15:45:34 to 17:19:03) | 1.1 table, section 5 item 1; fact b1-0106 |
| C24 | per-process memory was sampled three times | 1.0, 1.1; section 5 item 2; proposed b1-0502 |
| C30 | the 26 to 39 % was all sessions together | section 6: no inference about a dearer model |
| C50 | the source keeps "unless onFailure: block" | 1.3: the reason against a lock is release after a crash, not fail-open |
| C98 | "after one of its own sessions ends" has no source | 3.4 rewritten: only the owner's turn is known to work |
| C126 | waiting pays only at a wake; after the cache lapses, writes not reads | 3.2 rewritten; proposed b1-0505 |
| D1 | callers in three places, a run's own copy of tcb/, a static import crashes the hook open | 1.2: guarded dynamic import; a run keeps its copy (named limit); B2 test |
| D3 | shrink gap, unfenced stale break, 15 s break on one failed read; no per-command peak | 1.3 repairs (a)-(c); lane memory term off until B9; B5 tests |
| D4 | one folder; tree run under guard-hook; workflow helpers untested; up to 16 at once | width part in the user settings (hyp, B10 test); workflow concurrency set by its author; named limit |
| D5 | wrong reason; meta files outlive ended helpers (11 of 404); per-helper peak never measured | transcript-age test with T_quiet (counted in B4, default 45 min); reason replaced; memory overshoot a named limit |
| D6 | no governor behind it; routes fail open on any exception | routes wrapped fail-closed (B6); governor match moved (B9); until then a named limit |
| D7 | refusal blocks the model ladder and the watcher; PowerShell, npm, npx unseen; untested | audit line, no refusal (B7); lane use stays a convention, named |
| D8 | the watcher's start test left out; widths() lands on fixed places; window term inert | watcher `slotFree` as a count per tick; built after the fixes (B12); inert term named |
| D9 | memory can be told apart side by side; alone only for interference | running alone kept only for measurement 3 |
| D10 | fit first starts long light before short heavy | fit as a filter, then shortest, then age; dead tickets by pid and age; proposed b1-0506 |
| D11 | a refused start leaves no ticket; polling costs a whole-context call | refusal text says when to retry; the retry is a named limit |
| D12 | an end-time flag lags; tickets give the queue directly; several writers of one file | queue from the ticket folder; stats by write-then-rename |
| D13 | ledger line only when a batch forms | oldest age taken in `watch.mjs evaluate` each tick |
| D15 | the status line is a terminal feature; a typed figure can be forgotten; a `get_usage` tool exists | B8 tests `get_usage` first |
| D16 | stop floor has no actor; 4,000 MB is a floor after sizes; defaults bind nothing yet | 1.3 default restated in the model runner's form; stop floor named as without actor until B9 |
| D17 | Edit hook untested; Bash and PowerShell writes unseen; hook knows only agent_id | owner recorded at the start (label to toolUseId to agent_id); limits named |
| D20 | measurement 7 is not a count; the rest of 6 is not on disk | B3 no longer claims measurement 7; 1.5 waits for it; proposed b1-0503 |

**Confirmed, with a note that changed the text:** C11 (the 25.0 minutes was a timeout kill), C15 and C93 (guard-hook
refuses lane.mjs to a tree coordinator), C21 (`tcb-build` matches nothing since 2026-11-17 08:42 UTC), C41 (routes fail
closed only for an unreadable file), C44 (project settings only), C54 (11 of 404 meta files lack the key for ended
helpers), C59 ('ceiling' is a refusal, not a clamp), C61 (B_tokens null, never refuses), C75 (several acts per tick
from one free slot), C123 (the one-slot period is under 40 minutes), C125 (the 5 % is for microsecond iterations).

**The refuter's weakest points, each a change or a named limit.**

| # | Weakest point | Change or limit |
|---|---|---|
| 1 | the gates see one folder; workflow helpers may bypass PreToolUse; other sessions' load uncounted | change: width part in the user settings (B10 tests it); limit: until seen, workflow concurrency is set by its author, and other sessions show only in free memory and usage |
| 2 | no safety net behind a fail-open gate: governor matches nothing, recorder silent, any hook exception lets starts through | change: routes fail closed on any exception (B6), governor match moved to the lane's trees (B9); limit: until B9 nothing acts at the floor |
| 3 | liveness from meta files is unsound | change: running = no finished key and a transcript written within T_quiet |
| 4 | the lane's shrink gap, stale-break race and 15 s break | change: count all held slots, break by rename, `owner.json` by rename with its own timeout (B5) |
| 5 | most numbers are guesses or null; "logged today" is wrong | limit: the defaults are named as guesses, the token and lane memory terms are off until read; correction proposed (b1-0501) |
| 6 | fit before short-first; measurement 7 compares two workloads; refusing Node blocks the model run | change: fit as a filter (b1-0506); measurement 7 stays a measurement (b1-0503); an audit, not a refusal (B7) |
