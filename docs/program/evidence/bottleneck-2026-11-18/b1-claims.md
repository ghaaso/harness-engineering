# b1-claims: what BUILD-IN.md rests on (b1/analyse, Opus, 2026-11-18)

Format: C<n> claim | path:line or record id | exact quoted text (at most 15 words) | mark.
Marks: proven in the literature (the record holding the quote) / measured here / observed here / hypothesis.
"Documented" rows come from the app's documentation as summarised in E = docs/program/evidence/harness-method-status-2026-11-18/
and were never tried here, so they are marked hypothesis. Paths are from the repository root unless absolute.
F = docs/program/evidence/bottleneck-2026-11-18/. Everything was read on 2026-11-18; nothing was run.
Two files are live and may move by a few lines: F/b1-state.md (the coordinator updates it) and the helper
meta files under C:/Users/User/.claude/projects/ (a running helper's file gains a key when it ends).

## Claims

### The lane and the recorder (harness)
C1 | the lane reads its slot count from the file at every try, so every 700 ms poll | research-tree/tools/lane.mjs:43 | "const n = capacity();" | observed here
C2 | the slot file holds 2 | research-tree/lane/capacity.txt:1 | "2" | observed here
C3 | the slot count is clamped to 1..4 and is 1 when the file is unreadable | research-tree/tools/lane.mjs:39 | "return Math.min(4, Math.max(1, parseInt(" | observed here
C4 | a waiter polls every 700 ms and takes the lowest free slot; waiters have no order | research-tree/tools/lane.mjs:72 | "sleep(700);" | observed here
C5 | every start line carries the wait | research-tree/tools/lane.mjs:82 | "log({ ev: 'start', label, pid: process.pid, waited_ms: started - t0," | observed here
C6 | every end line carries the time the command ran | research-tree/tools/lane.mjs:95 | "log({ ev: 'end', label, exit, signal: signal || null, ms: Date.now() - started });" | observed here
C7 | a waiter writes a line only when it gives up; a queued command is otherwise invisible | research-tree/tools/lane.mjs:71 | "log({ ev: 'busy', label, waited_s: waitS });" | observed here
C8 | a slot is broken when its holder is dead or older than the hold limit | research-tree/tools/lane.mjs:56 | "stale = !alive(o.pid) || Date.now() - Date.parse(o.t) > MAX_HOLD_MS;" | observed here
C9 | the hold limit is 20 minutes | research-tree/tools/lane.mjs:23 | "const MAX_HOLD_MS = 20 * 60 * 1000;" | observed here
C10 | a command's timeout may be set up to 1,500 s (25 minutes) | research-tree/tools/lane.mjs:33 | "const timeoutS = Math.min(1500, Math.max(5," | observed here
C11 | the longest command in the lane log ran 25.0 minutes | x16-0171 | "The longest lane-log command ran 25.0 minutes" | measured here
C12 | 780 finished commands ran 365 min and waited about 177 min; two at once for 41 of 324 min; never three | r57-0127 | "two ran at once for 41 of the 324 minutes in which any ran" | measured here
C13 | the last lane line is the suite run, 596,366 ms | research-tree/lane/log.jsonl:1577 | "596366" | observed here
C14 | the rulings say heavy commands go through the lane, one at a time | research-tree/RULINGS.md:41-42 | "go through `research-tree/tools/lane.mjs`," | observed here
C15 | the protocol says every agent command that starts Node runs through the lane | docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md:1022 | "Every command of an agent that starts Node runs through it, one call" | observed here
C16 | the recorder reads free memory | research-tree/tools/recorder.ps1:7 | "PerformanceCounter('Memory','Available MBytes')" | observed here
C17 | a recorder line holds the time of day only, and five fields | research-tree/tools/recorder.ps1:14 | "'{0} free={1} cpu={2}% procs={3} node={4} ps={5}'" | observed here
C18 | the recorder ends itself after 12 hours | research-tree/tools/recorder.ps1:9 | "$end = (Get-Date).AddHours(12)" | observed here
C19 | the recorder is started by hand | research-tree/model/RUN-LADDER.md:63 | "The recorder (`tools/recorder.ps1`) must then be started with" | observed here
C20 | the governor acts under 2,500 MB free | research-tree/tools/recorder.ps1:16 | "if ($f -lt 2500 -or $node -gt 60 -or $pw -gt 40" | observed here
C21 | the governor stops only processes whose command line holds tcb-build | research-tree/tools/recorder.ps1:17 | "-match 'tcb-build'" | observed here
C22 | the recorder already lists every process at each sample | research-tree/tools/recorder.ps1:11 | "$ps = [Diagnostics.Process]::GetProcesses()" | observed here
C23 | the recorder's log covers two periods of 2026-11-17 only | F/own-data.md:5 | "R exists only for 2026-11-17 03:11 to 07:34 and 12:07 to 21:51." | observed here
C24 | nothing logs the processor queue, per-process memory or conflicts | o1-0102 | "nothing logs the processor queue length, per-process memory, page-ins or conflicts" | observed here
C25 | an earlier recorder version wrote the largest processes by size | research-tree/lane/recorder.log:2 | "top=claude:763,ChatGPT:625,claude:408" | observed here

### Usage and tokens
C26 | the week's share is read from the app by the coordinating session; no file holds it | r57-0117 | "Read from the app by the coordinating session; no file holds it." | observed here
C27 | b1 copied its usage readings by hand into its state file | F/b1-state.md:10 | "week 48 % all models (41 % Fable); after it, 49 %" | observed here
C28 | five Sonnet readers used 584,000 helper tokens | F/b1-state.md:12 | "five Sonnet readers (kind read), 584,000 helper tokens in all" | measured here (as b1 reported it)
C29 | five readers earlier used 767,000 tokens and under one point of the week | r57-0115 | "used 767,000 tokens in four minutes and less than one point" | measured here
C30 | the R57 round moved the week from 26 % to 39 % in seven hours | r57-0114 | "went from 26 % to 39 % in seven hours" | measured here
C31 | the tree's design record says only a session can read the meter | research-tree/SELECTIONS-MAP.md:50 | "only a session can read the meter" | observed here
C32 | the status line is documented to receive context_window and rate_limits, display only | E/app-enforcement-mechanisms.md:77-78 | "it sees `context_window`" | hypothesis (documented, not tried here)
C33 | the tree's meter is a percent typed in by the coordinator | research-tree/tcb/status.mjs:750 | "kind: 'meter', data: { pct, self_reported: true }" | observed here
C34 | cost.mjs turns the first and last meter lines into tokens per point | research-tree/tcb/cost.mjs:879 | "// tokens per meter percent (self-reported, whole percent)" | observed here
C35 | 97 % of tokens are re-reads of context | F/own-data.md:39 | "97 % of tokens are re-reads" | measured here
C36 | the b1 coordinator stopped at 135,000 tokens of context, 64,000 of it fixed load | F/b1-state.md:3-4 | "b1 stopped as coordinator at 135,000 tokens of context" | measured here (as b1 reported it)
C37 | in October a limit came about 75 min into a five-hour window | F/own-data.md:36 | "limit about 75 min into a five-hour window" | measured here

### Hooks (harness)
C38 | the tier hook acts on PreToolUse only | .claude/hooks/tier-hook.mjs:27 | "if (j.hook_event_name !== 'PreToolUse') process.exit(0);" | observed here
C39 | it looks only at helper and session starts | .claude/hooks/tier-hook.mjs:30 | "const isSession = /start_session$/.test(tool);" | observed here
C40 | a refusal is exit 2 with the reason | .claude/hooks/tier-hook.mjs:20 | "process.stderr.write(why + '\n'); process.exit(2);" | observed here
C41 | an unreadable routes file refuses every start (fails closed) | .claude/hooks/tier-hook.mjs:43 | "cannot be read. Nothing is started until it is fixed." | observed here
C42 | unreadable hook input lets the call through (fails open) | .claude/hooks/tier-hook.mjs:24 | "note: 'hook input unreadable'" | observed here
C43 | its log record has no token, memory or finish field | .claude/hooks/tier-hook.mjs:38 | "what: isHelper ? 'helper' : 'session'," | observed here
C44 | it is wired for PreToolUse with matcher "*", no other event | .claude/settings.json:3-4 | "PreToolUse" | observed here
C45 | a hook refused a helper by model, also with permissions bypassed (one session, one model, one app version) | r57-0105 | "a helper started on a refused model, also with permissions bypassed" | observed here
C46 | hook input carries session id and transcript path, never context size; one start costs about 37 ms | r57-0106 | "never the context size; one hook start costs about 37 ms" | observed here
C47 | SubagentStop, Stop and SessionStart fire | E/probe-hooks.md:26 | "Do SubagentStop, Stop and SessionStart fire | YES" | observed here
C48 | not tested: a hook that times out, the Edit tool, shell writes, the session tools | E/probe-hooks.md:43-45 | "Not tested: a hook that times out" | observed here
C49 | matching hooks run in parallel | E/app-enforcement-mechanisms.md:34 | "Matching hooks run in parallel." | hypothesis (documented)
C50 | a stalled PreToolUse hook lets the call through | E/app-enforcement-mechanisms.md:99 | "A stalled PreToolUse hook lets the call through" | hypothesis (documented)
C51 | a workflow script has no file or shell access | E/app-enforcement-mechanisms.md:66-67 | "The script has no file or" | hypothesis (documented)
C52 | a hook that takes a lock can hold heavy commands to K slots; it cannot see sh -c or a path | E/app-enforcement-mechanisms.md:94 | "A PreToolUse hook that takes a lock and denies when full" | hypothesis (documented)
C53 | each helper has a meta file with its description (kind first), model, toolUseId and a finished flag | C:/Users/User/.claude/projects/C--Users-User-Documents-projects-harness-engineering/db398cc3-2137-435a-ad82-acd792d5e0cb/subagents/agent-a2fd3246293f4b7e5.meta.json:1 | "read: map the 13 fixes and 0b" | observed here
C54 | the running helper's meta file had no finished key when read; the five ended ones had it | C:/Users/User/.claude/projects/C--Users-User-Documents-projects-harness-engineering/db398cc3-2137-435a-ad82-acd792d5e0cb/subagents/agent-a4d5ca0852dd03f18.meta.json:1 | "analyse: draft BUILD-IN design and claims" | observed here (at the time of reading)
C55 | lib finds a session's helper transcripts by its id | research-tree/tcb/lib.mjs:2230 | "helpers = agent-*.jsonl below <root>/*\/<id>/subagents/" | observed here
C56 | lib.spendOf sums tokens, peak and last context per transcript | research-tree/tcb/lib.mjs:2678 | "peak_context: 0, last_context: 0, partial: false" | observed here

### The tree's scripts (tcb)
C57 | decide is pure: no I/O, no clock | research-tree/tcb/admit.mjs:137 | "// decide(facts): pure, no I/O, no clock; every failing condition adds one reason." | observed here
C58 | a hard ceiling of 3 live children is a constant in code | research-tree/tcb/admit.mjs:16 | "const HARD_CEILING = 3; // R10: never above 3 live child processes" | observed here
C59 | the slot cap is the least of N_max, N_ceiling and 3 | research-tree/tcb/admit.mjs:231 | "const cap = Math.min(nMax, nCeil ?? nMax, HARD_CEILING);" | observed here
C60 | the memory term uses one flat peak for every session | research-tree/tcb/admit.mjs:242 | "freeMb - reserve - peak * pending < peak" | observed here
C61 | the budget refusal: cap minus reservation minus margin below the task's estimate | research-tree/tcb/admit.mjs:258 | "if (B - reservation - r < eTask) add('budget'," | observed here
C62 | the reservation is the spend of every attempt plus open estimates | research-tree/tcb/lib.mjs:3035 | "spend of every attempt of every row, plus max(0, e_task - spent of the" | observed here
C63 | N_max 2 is a guess until memory is measured | research-tree/tcb/thresholds.json:14 | "live child processes until memory is measured (design R10)" | observed here
C64 | one session's peak is guessed at 1,200 MB | research-tree/tcb/thresholds.json:16 | "MB (one session's peak, design R10)" | observed here
C65 | the tree keeps 1,024 MB back, a guess | research-tree/tcb/thresholds.json:17 | "MB (free memory kept back, design R10)" | observed here
C66 | the token cap is not set | research-tree/tcb/thresholds.json:20 | "tokens (cap; null = not set, a reading, design F4)" | observed here
C67 | the coordinator's hand-over window is 133,200 tokens | research-tree/tcb/thresholds.json:23 | "coordinator hand-over window, cost.mjs compute rounded to 100" | observed here
C68 | a stop is confirmed after 2 ticks of no growth | research-tree/tcb/thresholds.json:13 | "ticks of non-growth before a stop is confirmed (design R9, 2 delta)" | observed here
C69 | one tick is 60 s | research-tree/tcb/thresholds.json:4 | "ms (watcher tick, design R4)" | observed here
C70 | replace start runs decide inside the run lock; a refusal is exit 6, deferred | research-tree/tcb/replace.mjs:881 | "const dec = decide(facts);" | observed here
C71 | the admit ledger line already records free memory and live children | research-tree/tcb/replace.mjs:932 | "free_mb: typeof env.freeMb === 'number' ? env.freeMb : null," | observed here
C72 | no script starts or stops a session | research-tree/tcb/README.md:15 | "No script starts, messages or stops a session" | observed here
C73 | the edge reads free memory from the OS | research-tree/tcb/lib.mjs:413 | "freeMb = Math.floor(os.freemem() / 1048576);" | observed here
C74 | the watcher's start test uses N_max alone, over an empty process list | research-tree/tcb/watch.mjs:554 | "const slotFree = used < num(th.get('N_max'), 0);" | observed here
C75 | rowAct starts a stopped row when a slot is free, rows in table order | research-tree/tcb/watch.mjs:140 | "return !blocked && slotFree ? 'replace-start' : null;" | observed here
C76 | the watcher raises class 24 below the reserve | research-tree/tcb/watch.mjs:464 | "facts.freeMb < reserve" | observed here
C77 | the watcher drains at the hand-over window | research-tree/tcb/watch.mjs:518 | "if (typeof wStar === 'number' && win >= wStar) {" | observed here
C78 | a checker batch is due when 12 are ready or nothing else runs | research-tree/tcb/watch.mjs:541 | "if (cands >= batchSize || (cands > 0 && activeRows.length === 0))" | observed here
C79 | checker items are ordered by field and card id, not by age or length | research-tree/tcb/check-queue.mjs:311 | "found.cands.sort((a, b) => byStr(a.field, b.field) || byStr(a.card_id, b.card_id)" | observed here
C80 | the queue ledger line carries no time of waiting | research-tree/tcb/check-queue.mjs:467 | "kind: 'queue', data: w.ledger, now: edge.now" | observed here
C81 | the unit-cost file leaves serial fraction and memory empty | research-tree/tcb/cost.mjs:917-918 | "serial_fraction: null," | observed here
C82 | cost.mjs already has the memory width form, printed only | research-tree/tcb/cost.mjs:365 | "const Nmem = Math.floor((Cc.free_mb - Cc.reserve_mb) / Cc.rss_mb);" | observed here
C83 | N_cap 3 is tagged measured with a rule as its source | research-tree/tcb/cost-inputs.json:218-221 | "harness fact 1: at most three child sessions on this PC" | observed here
C84 | the last attempt of a committed row holds one slot until its stop is confirmed | research-tree/tcb/lib.mjs:3057 | "or the last attempt of a committed row ->" | observed here
C85 | the process list has no memory field | research-tree/tcb/lib.mjs:2737 | "Select-Object ProcessId,ParentProcessId,Name,ExecutablePath,CommandLine," | observed here
C86 | a session's processes are found by folder or session id in command lines | research-tree/tcb/lib.mjs:2846 | "processes whose command line names the folder" | observed here
C87 | ledger kinds are a closed list | research-tree/tcb/lib.mjs:75 | "export const LEDGER_KINDS = Object.freeze([" | observed here
C88 | a child writes only its own staging folder | research-tree/tcb/profiles/child.json:26 | "{attempt}/staging/" | observed here
C89 | objects are stored by exclusive create and never repaired or merged | research-tree/tcb/commit.mjs:6 | "stores each valid object by" | observed here
C90 | two disagreeing verdicts are only flagged | research-tree/tcb/lib.mjs:3585 | "reasons[item] = 'verdict-conflict';" | observed here
C91 | the task table is written by compare-and-set on its revision | research-tree/tcb/lib.mjs:1684 | "if (expectRev !== curRev) throw err('rev-moved', 65" | observed here
C92 | guard-hook reads only, writes nothing, and its own failure is a deny | research-tree/tcb/guard-hook.mjs:6 | "It reads files only and writes nothing" | observed here
C93 | guard-hook lets the tree's coordinator run only node tcb/<name>.mjs | research-tree/tcb/guard-hook.mjs:339 | "const rel = /^tcb\/([^\\/]+)\.mjs$/.exec(script);" | observed here
C94 | the tree's settings wire guard-hook, not the tier hook | research-tree/tcb/settings/coordinator.json:64 | "\"{root}/tcb/guard-hook.mjs\"" | observed here
C95 | the model runner admits a part only if free memory less running headroom covers it above a floor | research-tree/model/run-resumable.mjs:329 | "const ok = free - reserve - reserveOf(size) > FLOOR;" | observed here
C96 | the model runner's floor defaults to 4,000 MB | research-tree/model/run-resumable.mjs:73 | "const FLOOR = Math.floor(num('--floor-mb', 4000));" | observed here
C97 | the model runner samples its own children's memory | research-tree/model/run-resumable.mjs:307 | "working set of our own children (tasklist on Windows, /proc elsewhere)" | observed here
C98 | a session can start another only on a turn the owner typed (or after one of its own sessions ends) | r57-0109 | "A session can start another session only on a turn the owner typed" | observed here (in part; the record's note says which part)

### The fixes and the build
C99 | 0b is strict exclusive create, part of FX-OUT, FX-CLAIM, FX-CGATE | research-tree/notes/section17-draft-2026-11-17.md:247 | "exclusive create with no fallback (part of FX-OUT, FX-CLAIM, FX-CGATE)" | observed here
C100 | FX-CLAIM: one claim per attempt, an idempotency key | research-tree/notes/section17-draft-2026-11-17.md:249 | "idempotency key checked at the server" | observed here
C101 | FX-CGATE: a fencing token checked at the resource | research-tree/notes/section17-draft-2026-11-17.md:250 | "fencing token checked at the resource" | observed here
C102 | FX-CLOSE frees a finished child only after a verified close | research-tree/notes/section17-draft-2026-11-17.md:251 | "close-then-verify on an observed close, driven by a supervisor's due-list" | observed here
C103 | FX-PLAN: one planner with expectations | research-tree/notes/section17-draft-2026-11-17.md:253 | "controller expectations (Kubernetes `ControllerExpectations`)" | observed here
C104 | FX-W6: per-operation deadlines | research-tree/notes/section17-draft-2026-11-17.md:259 | "per-operation deadlines and an overall deadline" | observed here
C105 | FX-W7: lock leases plus fencing | research-tree/notes/section17-draft-2026-11-17.md:260 | "lock leases plus fencing (Chubby)" | observed here
C106 | after the fixes guard-hook still takes no lock | research-tree/notes/section17-draft-2026-11-17.md:525 | "The guard-hook takes no lock and writes only by strict exclusive create" | observed here
C107 | two copies of one rule set are a known gap | research-tree/notes/section17-draft-2026-11-17.md:559 | "`predictFence` and `lib.fence` are two copies of one rule set" | observed here
C108 | files and functions each fix changes (FX-PLAN shown) | F/b1-map-fixes.md:25 | "lib `planAct` (new); status `nextOf`; watch `rowAct` (becomes a filter)" | observed here (Sonnet map; slotCount and rowAct re-read in code)
C109 | "the plan check" computes the lane count from four limits | research-tree/FAULTS-AND-FIXES.md:49-50 | "the plan check from four limits (collisions, the check, the review, the token window)" | observed here
C110 | the build plan is "being drafted"; the file does not exist (ls) | research-tree/START-HERE.md:26 | "`research-tree/BUILD-PLAN.md` (being drafted)" | observed here
C111 | the fixes' new thresholds ship as guesses | research-tree/FAULTS-AND-FIXES.md:70 | "thresholds ship as marked guesses, and the pilot is where they are measured." | observed here
C112 | the 14 units share 20 places: 9 separate entries, 7 ordered sequences, 4 same statements | r57-0128 | "The units share 20 places (9 separate entries or keys, 7 ordered sequences" | measured here
C113 | the single workflow chose waiting over redoing from one run | r57-0401 | "its choice of waiting over redoing assumes tokens are scarce and the PC is not" | hypothesis
C114 | the Edit-hook test and the dummy-edit merge are not run | r57-0506 | "a hook on Edit inside a helper working in its own copy" | observed here (open task)

### Our own measurements
C115 | one suite run: 596 s, 332 MB private peak, about 3 of 24 threads | r57-0103 | "took 596 s with one test file at a time" | measured here
C116 | the suite probe sampled the run's process tree; its sampler was not kept | E/probe-suite-memory.md:53 | "No sampler or run process left." | observed here
C117 | 25 episodes: queue 9, blocked starts 7, memory 4, tokens 4, processor 3 | r57-0129 | "the serial queue is named in 9, blocked program starts in 7, memory in 4" | measured here
C118 | the lowest free memory on record is 7,306 MB | F/own-data.md:46 | "lowest free 7,306 MB at 18:43:37" | measured here

### The rule's own text
C119 | the rule's Step 1 table says the week share is logged | F/DECISION-RULE.md:71 | "Week share yes. Tokens per unit no" | observed here
C120 | it says free memory is logged every 2 s | F/DECISION-RULE.md:66 | "Free memory yes, every 2 s. Per-unit peak no" | observed here
C121 | it says ready work is logged | F/DECISION-RULE.md:72 | "Units ready to start | Their number" | observed here
C122 | it says every measurement needs the owner's word | F/DECISION-RULE.md:134 | "Each is an experiment, so each needs the owner's word" | observed here
C123 | it says measurement 7 is a count, not a run | F/DECISION-RULE.md:143 | "The log already holds both periods, so this is a count, not" | observed here
C124 | a new class runs alone until its figures are steady | F/DECISION-RULE.md:59 | "runs alone until its figures are steady" | hypothesis
C125 | "steady" was borrowed as within 5 % for three units | F/o1-report.md:59 | "A new class runs alone until its ratios hold within 5 % for three units" | hypothesis (a paper's number)
C126 | a waiting session costs tokens by re-reading its context | F/DECISION-RULE.md:78 | "a waiting session that re-reads its context" | hypothesis
C127 | an agent waiting on the model uses little processor | F/o2-report.md:46 | "an agent waiting on the model uses little processor" | hypothesis
C128 | the o1 report changed "proves" to "argues" for the minimum of two widths | F/o1-report.md:120 | "the minimum is best for two limits. It argues it," | observed here

### Literature (the record holds the quote)
C129 | memory is a cliff: one program too many collapses service | o1-0305 | "one program too many causes a complete collapse of service" | proven in the literature (analytic)
C130 | out of CPU: throttle, kill nothing (and kill for memory) | o2-0302 | "a machine out of CPU throttles usage first and kills nothing" | proven in the literature
C131 | caps from measured history beat hand-set caps | o2-0304 | "cut average relative slack to 23 %" | proven in the literature
C132 | holding threads above the hardware count kept 85 % of peak | o1-0304 | "kept 85 % of peak throughput at 200 % load" | proven in the literature
C133 | the serial-step width from a training run came within 1 % | o1-0301 | "within 1 % of the best fixed count" | proven in the literature
C134 | the minimum of two widths, in their model | o1-0302 | "is proved best in their model" | proven in the literature (narrowed: no tested program had both)
C135 | queueing delay, not processor use, is the overload signal | o1-0308 | "Queueing delay, not processor utilisation, is the overload signal" | proven in the literature
C136 | a shared lock defeats both signals; it needs its own | o1-0319 | "overload control on queueing delay or processor use fails" | proven in the literature
C137 | throughput search needs hundreds of finished units per step | o1-0307 | "rather hundreds of departures than some tens per interval" | proven in the literature
C138 | per-object conflict count switches optimistic to locking | o1-0310 | "once its abort counter reaches a threshold" | proven in the literature
C139 | switch back only after a run of quiet acquisitions | o1-0312 | "and back only after a run of quiet acquisitions" | proven in the literature
C140 | a switch between units keeps most throughput | o1-0316 | "kept at least 93 % of OCC or 2PL throughput" | proven in the literature
C141 | locking wins when resources are scarce | r57-0301 | "locking wins when resources are scarce and optimistic control when they are plentiful" | proven in the literature
C142 | merges fail tests after a clean build | r57-0305 | "1 % build failures and 6 % test failures of all merges" | proven in the literature
C143 | dot-product packing on several resources | o2-0309 | "dot-product or L2 packing used up to 10 % fewer bins" | proven in the literature
C144 | never-idle rules can be far off when long light jobs start first | o2-0310 | "every never-idle rule can be Omega(n) worse than optimal makespan" | proven in the literature
C145 | a scaling law needs a first measurement | r57-0307 | "so the law needs a first measurement before it predicts" | proven in the literature
C146 | sharing whichever resource binds now lost throughput in one run | o2-0314 | "sharing whichever resource is currently the bottleneck gave a bandwidth-bound flow 75 Mbps" | proven in the literature (one run)

### Hypotheses already recorded
C147 | the check's width has two cases; past case B's count workers only queue | o1-0402 | "workers past c (T_out + T_check) / T_check only queue" | hypothesis
C148 | act only at the gate; stop only at the memory floor | o1-0403 | "enforce only at the gate (hold new units, never stop running ones" | hypothesis
C149 | state signals lead, throughput is a slow outer check | o1-0404 | "throughput serve as a slow outer check" | hypothesis
C150 | the papers' numbers do not carry over | o1-0405 | "do not carry over to agents" | hypothesis
C151 | count agents paused on the model as holding memory | o2-0401 | "count agents paused on the model as still holding memory" | hypothesis
C152 | short check jobs first; nothing held while queued for the check | o2-0403 | "put short check jobs before long ones" | hypothesis
C153 | charge every token to the task that caused it | o2-0404 | "charge every token to the task that caused it" | hypothesis
C154 | a cheaper model only where its gap was measured small | o2-0407 | "only where its quality gap on that kind of work has been measured small" | hypothesis
C155 | tokens are a budget, not a rate | r57-0408 | "The token allowance is a budget and not a rate" | hypothesis
C156 | next unit by fit on all resources | r57-0407 | "the next unit to start is the one whose needs best fit what is free" | hypothesis
C157 | several writers: switch per file, back after quiet units, between units | r57-0406 | "moves back only after a set number of quiet units and only between units" | hypothesis
C158 | the measurements the rule needs | r57-0511 | "The lane's wait with one slot against two needs no run" | hypothesis (open task)
C159 | enforcement as a mix of workflow, hook, script, audit | r57-0402 | "a hook or a deny rule stops a call inside a session" | hypothesis
C160 | test files side by side are untested | r57-0403 | "untested because nobody knows whether the test files are independent" | hypothesis
C161 | the hand-over figures are designed, not measured | r57-0404 | "untested figures the tree's design record computed from estimated inputs" | hypothesis

### Rulings and standing text
C162 | no design questions to the owner | r57-0001 | "Do not put design questions to the owner" | observed here (ruling)
C163 | a parameter comes from an optimisation, not a preference | r57-0002 | "is the result of an optimisation against the objective" | observed here (ruling)
C164 | the objective | r57-0003 | "quality first, then the least time, memory and tokens" | observed here (ruling)
C165 | work that can run together is started together | r57-0006 | "Work that can run at the same time is started at the same time" | observed here (ruling)
C166 | a coordinator does not run past its ceiling | r57-0008 | "a coordinator does not run on past its context ceiling" | observed here (ruling)
C167 | hooks or scripts, whichever works best | r57-0011 | "Hooks or scripts, no fixed preference" | observed here (ruling)
C168 | the smallest model that gives the same output | r57-0005 | "Use the smallest model that gives the same output" | observed here (ruling)
C169 | three child sessions at most | CLAUDE.md:55 | "Check free memory before starting child sessions: three at a" | observed here
C170 | the tree's own design calls a fixed three a static level | research-tree/SELECTIONS-MAP.md:49 | "a fixed count of three is a static level" | observed here
C171 | an extractor record states three sessions as a measured fact | x21-0120 | "At most three child sessions run at once on this PC." | observed here (the record says "measured")
C172 | the lane lets two run at once, not one | o1-0101 | "The lane lets two heavy commands run at once, not one" | observed here
C173 | a tree run lives outside every repository | CLAUDE.md:46 | "Under version 2 a run lives in its own folder outside every repository." | observed here
C174 | whether a coordinator may start sessions on turns the owner did not type was open | research-tree/FAULTS-AND-FIXES.md:61 | "Can a coordinator start a session on a turn the owner did not type?" | observed here

## Design choices

D1 | one pure function `widths(facts, params)` in a new file research-tree/tcb/width.mjs, called by every gate | one rule in one place; two copies of a rule set are a known gap (C107); admit and the watcher test "room to start" separately today (C59, C74) | r57-0408, C57, C107
D2 | facts are read at the edge, the decision stays pure: the lane and the tier hook read free memory and small files; the tree adds readings to lib.edgeFacts | decide is already pure and edgeFacts is the tree's one place for OS calls (C57, C73) | C57, C73
D3 | heavy commands: the gate stays lane.mjs tryAcquire, its slot count becomes the least of capacity.txt and the width | the lane already holds and never kills, sees every heavy start and end, and re-reads its count at every poll | C1, C4, C6, r57-0127
D4 | helpers and child sessions of the harness: the gate is the tier hook on PreToolUse, not a workflow and not an instruction | a hook is the only thing seen to refuse a start with fresh state; a workflow cannot read files; an instruction is the weakest form | r57-0105, r57-0011, r57-0402, C51
D5 | no lock in the hook; running helpers are counted from meta files without the finished key; a parallel batch may overshoot by its size less one | a stalled hook lets the call through, so a lock can only fail open (C50); tokens are a budget and the memory reserve covers one batch | C49, C50, C53, C54, r57-0408
D6 | the width part of the hook fails open with a log line; the routes part stays closed | a closed width gate stops all work on a fault of its own; memory keeps the governor behind it | C41, C42, C20
D7 | the tier hook refuses a Bash command that starts Node outside lane.mjs | turns a convention (C14, C15) into a refusal; it cannot see sh -c or a path (C52) | C14, C15, C52, r57-0402
D8 | the tree's gate stays admit.decide: sections 6 and 7 call widths(); section 8 gets a window term next to B_tokens | admit already gates inside the run lock and defers with exit 6 | C59-C62, C70, C66
D9 | Step 0's "run alone" applies only to classes whose figures cannot be told apart side by side (heavy commands; sessions' memory) and only once the sampler exists; helpers are never held for it | a helper's tokens are in its own transcript; running alone without a sampler measures nothing and costs time | C53, C55, C124, r57-0006
D10 | the lane gets a ticket queue ordered by fit, then shortest expected check time, then age, with an age cap | today waiters have no order; short-first and fit are the literature's forms | C4, C7, o2-0403, o2-0309, C144
D11 | which helper starts next stays the coordinating session's choice; the hook only refuses | no mechanism can choose for a session; with tokens a budget the order matters only when a width binds | r57-0407, r57-0408
D12 | the lane computes a standing-queue flag at each end into a small stats file; the tier hook reads it for build kinds | the lane is the only place that sees waits and ends together | C5, C6, o1-0308, o1-0319
D13 | the checker queue: the oldest item's age and the number left out go into the queue ledger line; the watcher reads them | check-queue.mjs is the only file that knows the checker's queue | C79, C80, C78
D14 | the outer check is a script run between waves; it drives nothing | about 100 units per step is hours at agent speed | o1-0307, o1-0404
D15 | the week and 5-hour shares: a status-line logger after a test that the app runs one; until then a usage file the coordinator writes at each fan-out | the status line is the only documented automatic reader of rate_limits; no hook carries it | C26, C31, C32, C46
D16 | defaults until each measurement exists: today's numbers; admission reserve 4,000 MB and stop floor 2,500 MB; the week cap of the phase's state file | quality first and memory is a cliff: the largest floor in use for admission, the governor's for stopping; the first build steps change no behaviour | r57-0003, C20, C96, C27, C129
D17 | several writers in the harness: a modes table per file, a Write/Edit branch in the tier hook, and a merge script that counts conflicts | modes before work come from the change list; the count lives where merges happen, enforcement where writes happen | r57-0406, r57-0128, r57-0401, C142
D18 | the tree's run-time writers are left as they are | own copies by construction, content-hash objects never merged, run state under one lock with compare-and-set | C88, C89, C90, C91
D19 | in the tree a unit finishes at its verified close, and counts as running until then | a session not yet closed may still hold memory; FX-CLOSE makes the close verified | C84, C68, C102
D20 | build first the pieces that need no measurement and change no behaviour; two of them turn measurements 6 (tokens per unit) and 7 into counts over files already on disk | the owner's word is needed for experiments, not for counting existing records | C122, C123, r57-0511, C53
D21 | the lane's hold limit is raised to the largest timeout plus a margin | a live 25-minute command can lose its slot at 20 minutes | C8, C9, C10, C11

<!-- b1-analyse done -->
