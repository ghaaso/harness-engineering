# Design record of protocol version 2

An extract of the recorded design step of 2026-11-16 (composition of the borrowed designs, its model check, its attack, its ruling). Source: `docs/program/evidence/research-tree/foundations-2026-11-16/design/result.json`. Line numbers below are lines of that file. Nothing here is new; where the source is silent this file says "not recorded".

Note on keys. The file has only these top-level keys: doc, layers, cost_computed, completeness_computed, model, fidelity, integrated, attack, ruling, revised. The keys flaws, ablations, extra_flaws sit in `model` and `fidelity`; conflicts_resolved, doubts, for_the_owner in `integrated`; edits, edit_list, for_the_judge, not_established in `ruling`; change_log in `revised`. Rule numbers (R..) in `ruling` are the OLD numbers; `revised` renumbered them down by one from old R7 on (line 1155).

## 1. Layers (layers, lines 3-341)

The record gives no one-line purpose per layer. The purpose below is read from the layer name and its pilot_minimum. "pilot" and "later" are the record's tags.

- L1 Execution (3-62). Start, replace, stop, fence and watch the sessions. Pilot: put, admit, replace, stop, commit, watch, status, spend, intent, endturn, meter, handover. Later: salvage.
- L2 Storage (63-118). Immutable cards, packs, reviews, journal, status as a separate relation. Pilot: canon, harvest, commit, snap, tms, render, status, audit, fsck, merge. Later: index, migrate.
- L3 Integrity and assurance (119-191). Trusted base, role profiles, hooks, witness, promotion, certificates. Pilot: tcb-verify, make-profile, guard-hook, perm-audit, snapshot, witness, context-check, check-queue, promote, seed, certify, merge, ledger, selftest. Later: correct-rates, beta, challenge, cooke.
- L4 Evidence method (192-247). Frozen protocol, search log, coverage, certainty, dismissals, comparison, second opinion. Pilot: protocol-freeze, search-log, rescreen-sample, coverage, certainty, dismissals, compare, second-opinion. Later: stop-check.
- L5 Shape and cost (248-295). Tree plan, cost law, capacity check. Pilot: cost, plan-tree, capacity-check, unit-costs. Later: admit, coupling.
- L6 Completeness (296-341). Blind hazard analyses, matrix, estimate, protocol model, gate. Pilot: check-matrix, estimate, protocol-model, gate, canary-check. Later: fracas.
- These per-layer lists are the first composition (about 35 pilot scripts, line 665). The ruling cut them to 25 plus lib.mjs (ruling.pilot_set_final, 1042-1076): lib, admit, replace, stop, watch, status, handover, harvest, commit, tms, render, audit, fsck, guard-hook, snap, witness, check-queue, promote, protocol-freeze, compare, selftest, seed, certify, cost, gate, protocol-model. Merges: alarm into watch, spend into watch, make-profile into replace, tcb-verify into fsck, recapture into render, redact into gate --cut, unit-costs into cost (978). All scripts are .mjs (638-641).
- Moved to later by the ruling (1078-1094): certainty, plan-tree bulk load, hook budget check, redistribution, split with separator, R50 roll-over for the research child, keyed reuse, uncited-card lot sampling, seeded refuter, per-question Chapman, third blind lens, Smith's order, budget from unit costs, hook schema check, pack B crossed design, S2. Deleted, not deferred (1094): SPRT, pause detection, the watcher's deadline exit, stored escrow, intent files except owner messages, R57 as a gate, the meter's 20 % halt, "LCF kernel" and "forward integrity" claims.
- Each layer also lists "contradicts_the_frame" (where a borrowed design overruled the earlier frame), "for_the_owner" and "left_out". Not repeated here except where used below.

## 2. Conflicts resolved (integrated.conflicts_resolved, 557-642)

1. Execution, Storage, Integrity each had a commit record (attempt folder + COMMIT; journal line; merge.mjs). One commit record: a ledger line {task, epoch, step key, output hashes} written by commit.mjs, first wins, identical repeat is a no-op (559-561).
2. Child write path: put.mjs needs a shell permission, Integrity says no shell. Child has no shell, writes to staging/ with Write; commit.mjs validates; put.mjs dropped (563-565).
3. Five separate logs (events, ledger, journal, group-start lines, incidents). One hash-chained run/ledger.jsonl, appended only through lib.mjs under a lock (566-569).
4. control/epoch against coord.json: kept coord.json and the task epoch (570-573).
5. Two status.mjs and endturn, meter, intent: one status.mjs with --reconcile and --endturn; meter into spend; intents into lib (574-577).
6. perm-audit, audit, search-log: one audit.mjs (578-581).
7. Two label lattices (tms and certify/low-water): one tms.mjs; statuses pending, witnessed, confirmed, unverifiable, rejected, superseded; labels STALE > PENDING > JUDGMENT > IN (582-585).
8. snap and snapshot, location: one snap.mjs, snapshots in .snapshots/ outside git and outside attempt folders (586-589).
9. Capacity check run by the child (no shell) or the watcher: runs in guard-hook.mjs before each reader start and again in the watcher tick (590-593).
10. coverage.js and estimate.js: one recapture.mjs (source mode, hazard mode) (594-597); later folded into a render view (978).
11. Canary check and selftest hook test: the canary is part of selftest (598-601).
12. Restart limit, D3-08 says two, D1-09 and D4-07 say one: R = 1, then the owner chooses a changed input (602-605).
13. Sleep, D4-06 exits, D1-02 and D3-06 shift deadlines: shift deadlines, log the pause, all processes resume (606-609). (Pause detection was later deleted, 1094.)
14. Waves against per-task admission (D1-08): admission when a slot frees; a wave survives only as the owner's checkpoint (610-613).
15. One trusted class against two grades: witnessed by script, confirmed = measured judgment, unverifiable never passes; sessions labelled by what they read (614-617).
16. Node capacity = window budget: two capacities, pack C_node and spend A_leaf; B+ governs only what must share a window; windows follow the square-root law (618-621).
17. Synthesis as a derived view: the table is a view, a cross-field adjudication is a model-written object under the citation constraints (622-625).
18. Dismissals out-list later against pilot: dismissals.mjs is pilot, "the programme's founding mistake" (626-629).
19. Separation of duty: the coordinator starts checkers, the watcher exits non-urgently on a ready batch, promote.mjs reads verdicts from the transcript (630-633).
20. Evidence pilot list against the small-pilot rule: exclusion re-screen and second-opinion moved to later; F2 decided after the pilot's reviews (634-637).
21. File extensions: all .mjs (638-641).

## 3. Flaws found in the composition and the fix adopted

Model check (model.flaws, 450-507). Fix named after the borrowed design.
- F1 restore-check carries post-fence output into the next attempt (fails NoStaleAccepted). Fix: record the attempt's journal high-water mark at the fence; restore reads only at or below it (Kafka leader-epoch truncation) (451-454). Ruling made it a per-file byte length plus sha256 of the prefix (956).
- F2 a lost wake after the watcher's own urgent exit is permanent (fails NoDeadlock). Fix as modelled: a Task Scheduler supervisor re-wake (457). The ruling REJECTED that fix (986-988) and used a second wake source the coordinator starts itself, the --alarm, plus persisted acked_seq (960).
- F3 pause detection works only inside one live watcher. Fix: stall clock = accumulated watched non-paused time, persisted (461). Ruling replaced it with counters in model calls and ticks, no clock (959).
- F4 endturn starts a second watcher. Fix: singleton watcher.lock, endturn kills the old pid first (465).
- F5 escalation leaves the failed attempt running. Fix: OTP-style fence then stop then mark failed (469).
- F6 admission does not count stop-unconfirmed zombies. Fix: count live child processes, as Kubernetes counts Terminating pods (473).
- A1 R conflicts with the configuration, same-class rule makes R=2 vacuous. Fix: own crash class or R counts any class (477). Ruling: R = 1, any class (962).
- A2 handover must kill the watcher; coordinator on exit 31 ends its turn (481).
- A3 quiescence = no live child process of any epoch (485).
- A4 READY of the current epoch outranks suspicion (489).
- A5 coordinator passes the table's epoch; stale READY is telemetry only (493).
- A6 ce check is the first act of each tick and repeated before the append (497).
- A7 admission refusal after the fence leaves the row in `admitted`, retries never re-fence or count toward R (501).
- A8 not modelled: cap parking per task like H_max; intent reconcile at the start of every turn; seq allocated under the watcher lock (505).

Extra flaws (fidelity.extra_flaws, 544-552). Titles only in the source, fixes not listed there:
E1 stale-lock break is check-then-act; E5xE8 redoing a replace intent re-fences and re-counts; E11 escrow leaks and the cap is not a bound; the acked event sequence is not persisted; single-writer claims conflict with other writers; a READY landing in a coordinator turn is discarded as a failure; the coordinator fence is incomplete and not atomic with the write. Adopted fixes are in ruling.edit_list: run lock with verified stale break by rename (955), compare-and-set fence (956), step machine in the task row instead of intents (957), computed never-stored reservation (963), acked_seq in coord.json (960), READY re-check before a failure replacement (961).

Fidelity review of the model check (fidelity, 510-553): the rerun reproduces every count (553). Weak or vacuous properties: AtMostOneCommit, Slots at N_max=3, RestartLimit, FailedTaskStopped, NoFalseSuspicion (526-530). Model errors: fault budget overspent (535); stalls never recover, and with recovery FIXED minus the commit record fails AtMostOneCommit in 13 steps (536); FIX_* switches are oracles, not designs (540). Verdict: accept the six flaws and the shape of the fixes, not "all hold" (553).

Attack (attack, 671-948): 46 findings with id, title, kind, severity. Fixes are in `ruling.edit_list` (27 edits, 950-979) and the ruling verdict (1118). Highest: A1-01 restore reads fenced output; A1-02 trusted base within the subjects' reach (fix: user-level deny rules and the owner's tcb commit hash in the go message, 966); A1-03 level-triggered wakes assume a timer that outlives the watcher; A1-04 a stop may not take effect; A1-06 read audit misses auto-loaded files; A2-01 design still has every model flaw, blocked by its own R58; A2-02 coordinator hand-over needs the owner; A2-03 gate cannot pass; A2-04 re-wake cannot wake a session; A2-05 replace is a saga; A2-06 a reboot is charged as a task failure (fix: host class, 962); A3-01..A3-05; A4-01 F1 decided by silence; A4-02 F2 silent default; A4-03 the seven measures appear nowhere (fix: render computes them, 972); A4-04 R8 checkpoint spreads fenced output; A4-05 overflow still "cut and list the rest"; A4-06 square-root law replaces the owner's 300k ceiling; A4-07 five model flaws absent from the document.
Rejected attack points (980-1040): A3-03 remove the lock (kept, 983); A4-07 FIX_REWAKE (986); A2-02 crash-only as default (990); A3-09 run R2 only if R1 and R_same differ (994); A1-11 rename the B+ layer (998); A4-01 C_node presupposes the fresh path (1002); A1-08 (1006); A3-02 hangs to the owner (1010); A1-02 NTFS ACL fallback (1014); A2-07 (1018); A2-11 (1022); A1-10 one checker call per seed (1026); A2-03 name "control" (1030); A4-05 split leaf in the pilot (1034); A4-03 enum of seven (1038). Reasons are given in the lines named.

## 4. Ablations (model.ablations, 420-449)

- Remove fencing by attempt epoch: breaks NoStaleAccepted, "No fault is needed: a planned hand-over is enough" (422-423).
- Remove fencing by coordinator epoch (--ce): breaks TwoCoordinatorsAct (426-427).
- Remove the COMMIT record: from FIXED nothing breaks in the model; from SPEC breaks AtMostOneCommit (430-431). The fidelity review contradicts the first half once stalls can recover (536).
- Suspicion by liveness instead of progress (V): breaks LoopEventuallySuspected and AlwaysCanResolve (434-435).
- Remove pause detection: breaks NoFalseSuspicion only (438-439).
- Remove the level-triggered re-check: breaks AlwaysCanResolve (442-443).
- Remove the restart limit from C-LIMIT: breaks RestartLimit (446-447).
- Model properties and which hold in SPEC: NoStaleAccepted, NoFalseSuspicion, SingleWatcher, FailedTaskStopped, NoDeadlock, AlwaysCanResolve fail; AtMostOneCommit, Slots, RestartLimit, TwoCoordinatorsAct, LoopEventuallySuspected hold (352-419). 13 configurations, 2,952,880 states (351). Reach and limits: 508.

## 5. Doubts left open (integrated.doubts, 660-669)

1. Length 612 lines against "about 520"; the section-9 table has 58 rows (661).
2. One ledger and commit.mjs reading attempt folders with no git merge are the composer's own simplification; lock contention not measured (662).
3. Capacity check inside guard-hook assumes briefs name question ids in a parseable form and that hooks fire for Agent calls; neither verified (663).
4. Checker calibration (14 seeds per J class plus clean items, 112 items at d0 = 0.8) is a real pilot token cost (664).
5. About 34 pilot scripts; the high/low cut is the composer's judgment (665).
6. Quoted figures (2.4 to 4.4 times; completeness 40 to 80, about 7) come from guessed or contaminated inputs (666).
7. Source-check counts differ per field (667).
8. Full mapping texts not read; mechanisms from the six layer specs (668).
Open facts (ruling.not_established, 1105-1117): whether a background command's exit starts a coordinator turn; whether user-level denies bind sessions in other folders; whether children are separate OS processes findable by folder with a readable start time; whether hooks fire for helpers and see Agent schema; whether a background script keeps the PC awake; whether the extended model holds (it has not run, so version 2 is blocked by its own R58); pilot total token cost; coordinator calls per wake and owner start latency; whether amendment 1's single 300k session or W* roll-overs give better reviews; whether held-out seed recall overstates coverage; whether the coordinator can start its own successor cheaply.

## 6. For the judge and for the owner

For the judge (ruling.for_the_judge, 1096-1104), shortened:
- F1 and the research child's window: amendment 1 set as silent default with the price shown; unsure whether the 300k ceiling bounds the research or only where the review runs (1097).
- Coordinator hand-over: drain kept as default, made to end by blocking every start; unsure idle slots cost more time than crash-only re-reads (1098).
- User-level deny rules added in normal running; whether that decides a section-12 item is the judge's call (1099).
- Keep the lock (A1-05, A2-08) against removing it (A3-03); A3-03 wins if scripts are provably serial (1100).
- Calibration: one seed per class per checker call is a compromise; correlation across classes unknown (1101).
- Hangs treated as stalls under R9 with the host class; depends on how often hangs are host-wide (1102).
- Silent default on thresholds: the mapping's default where one exists, else a reading; whether that needs the owner's word is the judge's call (1103).

For the owner (integrated.for_the_owner, 643-659; per-layer lists at 40-48, 164-174, 99-105, 225-233, 274-282, 322-330), shortened: the go; F1 where the review runs (both forms in the pilot; fresh default for "no difference shown", later replaced by amendment 1, 974); F2 second expert (none until pilot reviews); F3 second provider's model for checks, scoring, extra lenses; F4 cap, pilot allowance, admission margin; F5 Node fetch script, local page snapshots outside git, PDF text package; R = 1; owner starts the fresh coordinator at a quiet point; keep-awake; memory reserve and N_max; all thresholds (d0, p1 and beta, SPRT p0/p1, plants t of 3, coverage floor, completeness residual, smallest effect of interest, action line per measure); approvals (question lists, approach ids, field protocols, analysis plan, model property list, splits, dropped ranges); hook test fallback and where deny rules live; whether S2 runs; whether the hand-over line is by token count or weighted cost. Quote of the CLAUDE.md rule 7 applies: these are to be computed or measured, not chosen by the owner (see section 7).

## 7. Parameters

Tags in the record: M measured, E estimated, G guessed (343). "Not recorded" = the file names it and gives no value.

Slots and starts
- N_max, children at once: 2 until peak memory is measured, never above 3 (28; 963; 653). Derivation: load control N = min(cap 3, N_mem), N_mem = 2 on stand-in memory (343 [6]); speedup S(1..3) at serial share s = 0.2: 1.00, 1.67, 2.14; s = 0.4: 1.00 1.43 1.67; s = 0.6: 1.00 1.25 1.36; "time only; tokens never fall with N" (343 [6]). s and memory are guesses (343 last paragraph). Owner's memory reserve: left to the owner (46, 653).
- Slot count includes stop-unconfirmed zombies (473, 963).

Restart and failure
- R (restarts per task): 1, any class (962; 36; 605). Reason: D1-09 and D4-07 say one, D3-08 says two; the model shows R=2 is vacuous with a same-class rule (477, 528). A changed input after R is the owner's decision (36, 605).
- Host reset: not charged to R or W_cc when OS boot time is later than the attempt start (962). W_cc and H_max: named, no value (1165; H_max "fixed at 1" in the model only, 518).
- Hand-overs per task: stop at H_max (1165), value not recorded.

Hand-over (window) rule
- Law: Young-style interval k* = sqrt(2*H0/g) for hand-over cost against re-reading; with reloaded state growth sigma per epoch k* = sqrt((2*H0 + sigma*n_rem)/g); the plain law gave about half the best interval found by simulation (16 calls against 35) (271).
- Coordinator: H0 = 432.4k, k* = 17.6 calls, W* = 133.2k (count); weighted-cost W* = 157.1k, k* = 26.1; with a script-written status W* = 133.0k (343 [1]). Tagged E (275, 272). The recorded main-session average is 333.0k to 396.0k per call (343 [1]). Owner picks token count or weighted cost (275, 658) and whether W* replaces the fixed 200k line (277).
- Research child, n = 237 work calls, state growth 8.0k per epoch, quality cap 300.0k (343 [2]). g = 2.8k per call: k* = 16.1, W* = 115.0k; cost k* = 26.8, W* = 145.1k. g = 5.0k: 12.0, 130.1k; cost 20.1, 170.3k. g = 10.0k: 8.5, 155.0k; cost 14.2, 211.9k. Best constant k by simulation: 35 at g = 2.8k (37.17M tokens), 27 at 5.0k, 20 at 10.0k. Adaptive k: 37.56M, 8 hand-overs, max window 190.4k at 2.8k. One session reaches 730.8k (over the 300k cap); hand-over total 44.98M. Hand-over pays from n = 29 calls (g = 2.8k), 22 (5.0k), 16 (10.0k). Leaf capacity before reload thrash n_max = 289, 298, 307 calls (343 [2]). g, S0, sigma are guesses (343 last paragraph). Whether the child's window is one session to 300k or roll-overs at W*: the owner's decision, amendment 1 is the silent default (974, 1097).
- Token fan-out (D3-12): n/k* = 14.8 windows of about 16 calls for n = 237; "window epochs, sequential or parallel; they are not fields" (343 [4]).
- Watcher stop at 1.5 * W* (263); the ruling deletes this for the coordinator and flags turns above 1.5 * W*_coord instead (965).
- Cost of a poor interval: coordinator about 12 % more per call for a later band against about 2.3 times as many hand-overs (965). F1 price: same session 126.42M against hand-over 52.57M, ratio 2.40 at g = 2.8k; 3.24 at 5.0k; 4.37 at 10.0k (343 [3]); window passes 300k after about 82 calls at g = 2.8k (276).
- Fixed lines in force: coordinator 200k, child 300k quality cap (277). Pack capacity C_node = W_quality - P - R_rev = 180.0k (343 [3]). P = 79k session, 60k agent (M, 343). Fill factor f 0.75 proposed, z 1.64 proposed, margin floor m_owner, memory reserve, cap F4: owner items (278).
- Hard spend limit sits below the allowance by (Δ + wake latency) x peak spend rate (32; D3-05). Δ, wake latency: not recorded.

Stall, hang, time
- Stall: c consecutive model calls with no fall in V. Hang: h watcher ticks with no new call. Counters persisted; a tick counts at most once per Δ; no wall clock (959). c and h: "guesses until the pilot measures them" (959). T_box and T_watch removed (1149). The owner's hard time box: named (25), value not recorded.
- Deleted rule: pause = gap > 2Δ+30 s (438). Stale lock: dead process and older than 2 min (513).

Spend and admission
- Reservation = Σ measured spend of every attempt + Σ (e_task - spent) over admitted and running tasks; admit if B - reservation - r >= e_new; computed, never stored; B is a target, not a bound (963). B, r: owner's cap and margin (F4), values not recorded (46, 648).
- Escrow factor 1.82 until two fields are measured; with 6 pilot-units left at most 3 pilot-sized fields can be reserved; re-plan when actual/estimate > 1.5 (343 [7]). Inputs guesses. The ruling renamed escrow to "admission reservation" (963); whether 1.82 survives is not recorded.
- Order after the pilot by weight per estimate: F2 3.00, F7 2.50, F6 2.22, F4 2.14, F5 1.67, F3 1.25 (343 [8]); weights are an owner item (279).
- Pilot token allowance A_pilot and overall cap: owner's (46, 648). Predicted total over all arms (T, R_same, R1, R2, S1, S2 if allowed) must be stated before the pilot (973).
- Bulk-load example: fill 0.75, spend 1.33 and pack 1.03 of one leaf, lower bound 2 leaves (343 [5]); illustrative key set only.

Checks and statistics
- d0 per fault class 0.8, beta 0.05 as the silent defaults; 14 calls at d0 = 0.8 (Clopper-Pearson counts calls) (970; 154; 151). 112 checker items if one seed per call (664, 1026).
- Seeds: 14 for each of J1-J4 plus as many clean items; S1-S4 fixtures plus 5 live seeds each; then 10 % proof seeds per batch (151). Plants: 3 per expert, t of 3 (151, 154). Where no mapping gives a default (plants t, coverage floor, action lines) the item is a reading, not a gate (970).
- Coverage floor 0.6 and target 0.8 proposed; re-screen share 20 % and threshold 10 % proposed (232). Re-screen moved to later (636).
- Second opinion: stop buying a same-model second opinion at n_eff 1.3 and beta 0.7 (proposed, 227).
- Completeness residual threshold: experts proposed 2 or 3 (323); the ruling deleted the threshold, the estimate is a reading (969, 1145). Estimates: Chao 85 to 96, Chapman residual about 7, range about 3 to 80 (344).
- SPRT p0, p1, alpha, beta: deleted with the SPRT (970).
- Model bounds: 2 fields, at most 2 events (3 in K3), 2,952,880 states in 13 runs (351, 508). Ruling asks a 4-event budget and R = 1 (971).

## 8. Parallel work

- Children run in per-task admission, not waves; a wave survives only as the owner's checkpoint (610-613). Admission happens only in a coordinator turn (1007).
- At most 2 children until peak memory is measured, never above 3 (28, 963). Pilot inserts a memory admission check before each start (R8, 264). CLAUDE.md of the repo says three sessions at most as well.
- Zombie processes count as live and hold slots until a stop is confirmed (473, 963). Slots can be deadlocked by zombies at N=3, argued from the N=2 trace (508).
- Tokens do not fall with more slots; only time does, with diminishing gain (343 [6]).
- Token fan-out windows "sequential or parallel; they are not fields" (343 [4]).
- Reader helpers run under a child; capacity check runs before each reader start in the hook (592).
- Shared writes use one run lock, because a session can issue parallel tool calls and the watcher's intake runs at the same time (955, 983). Intake runs as a process the watcher spawns without waiting, one at a time under the run lock (958). The coordinator's turn and intake overlap (1100).
- Single watcher per ce (singleton lock, 465, 958). Two coordinators are fenced by --ce (427).
- Coordinator hand-over drain: blocks every start; quiescence = no live child of any epoch; owner starts the successor (965). Hand-over only at a quiet point (35).
- What limits it: the weekly meter is read only by a session, in whole percent, and the owner's other sessions spend the same allowance and memory (318); the owner asks for a quiet period in the pilot to calibrate tokens per percent (328); memory (28); the PC may sleep and keep-awake is unproven (326, 1110); tokens counted per slot (343 [6]).
- Pilot shape: one field as one frozen leaf (260); arms T, R_same, R1, R2, S1 and S2 optional (215, 973); S1 runs no fan-out to the 300k line (973). Seven leaves expected, "no inner level is ever needed for 7-10 fields" (343 [1]).
- Fields run in parallel only up to the reservation: with 6 pilot-units left, at most 3 pilot-sized fields at once (343 [7]).
