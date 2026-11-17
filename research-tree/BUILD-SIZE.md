# BUILD-SIZE: what each fix changes, and what can be built at the same time

Made 2026-11-18 by reading only. Sources: `notes/r3-changes.md` (called R3 below, sections 1 to 9),
`notes/section17-draft-2026-11-17.md` lines 159-315 (S17), `model/as-built/CEX-fence.md` and `CEX-wake.md`
(CEX), and `wc -l` on `tcb/`. Nothing here was run.

Caveats. Sizes are estimates from the change lists in R3 section 3, not from a diff: no fix is built.
"Not recorded" means the sources do not say. "Test count" is the number of separate test items in R3
section 6 (a `;` or a list item is one test); R3 gives no counts, so this count is mine. Tests live in
`tcb/test/<script>.test.mjs`, one file per script (the same files as the scripts, so they overlap the
same way). The spec files (`research-tree/spec/<script>.md`) and `CONTRACT.md` are also edited.
Dependencies are the ones the sources name. Some are about correctness in the model, not about build order.

Script lines today: lib 3610, selftest 1279, replace 1078, commit 996, watch 891, status 795, fsck 664,
render 862, guard-hook 631, admit 625, stop 554, handover 456, thresholds.json 66.

## 1a. The fixes: what they close, what triggers it, what it costs

| Fix | Defects it closes | What triggers the defect | What it costs when it happens |
|---|---|---|---|
| 0b strict hook write | N5, C9, O5/X5 (as far as the hook controls), part of N1/N2 | Not modelled (every hook create is one atomic step in the model). Trigger not recorded | Not recorded. The fix removes the fallback write and the parent-folder creation in hook writes |
| FX-OUT outcome log | D4a (READY races the fence), half-written READY, M6 gap, N1 | Normal operation, narrow window: a child's Write of READY is in flight while a planned hand-over fence runs (window is one Write call). The shortest model trace uses one dead turn, but CEX says it is not needed (inferred) | A finished result (READY) lands in a fenced attempt and is discarded. ReadyNotDiscarded fails in 6 steps |
| FX-CLAIM one claim per attempt | D4b (late transcript, double start), D3 child backstop, RC gap, C1, C2/N7 | One dead turn before `bind` plus the transcript not yet visible (normal lag); or the first session crashes before its transcript shows. D3 side: see FX-CGATE | A duplicate session: three live processes against N_max = 2 (Slots, OneSessionPerAttempt fail in 3 steps single-mechanism, 5-6 with all flags) |
| FX-CGATE coordinator hook | D3 (stale coordinator starts a session), coordinator's own retry, CE gap for session tools and helpers, N2, N6 | One owner event (a hand-over) after a stale coordinator takes a pending wake. Needs the session tools allowed to the coordinator (today they are not, so no session can be started at all as built). Shortest trace (7 steps) is an artefact; the real form adds a status build and a dead turn x | Two coordinators start the same attempt: a duplicate session, stale writes (TwoCoordinatorsAct 7, StaleWrites 7, OneSessionPerAttempt 8, Slots 9) |
| FX-CLOSE release a finished child | D4c (committed child holds its slot), N8 as a probe condition | One dead turn before `bind`, then the coordinator commits the row at `started` (acts on READY, not on `next`). 5 steps. The liveness trace of 12 steps needs two dead turns | A slot held for ever: later work (f1) can never start. The tree stalls; model says AlwaysCanResolve fails. How the owner clears it: not recorded |
| FX-REDO missing ledger line | A missing ledger line after a death | A death part-way through a repeat call. Not modelled; trigger detail not recorded | A missing ledger line (fsck warns, render orders by epoch). Size of the loss: not recorded |
| FX-PLAN planner expectations | Planners' double start (status.mjs:542, watch.mjs:164), `bind` loop on committed/started rows (status.mjs:543), Q5b wake loop (N9), rest of N1 | The double start needs a start already issued but not yet seen (same trigger as D4b: one dead turn plus lag). The `bind` loop is D4c's row. Q5b loop: the owner chose the "no session tools" branch | A duplicate session; a row stuck in a `bind` loop; a wake loop under Q5b. Q5b without the fix: liveness fails after one lost wake |
| FX-W1 tri-state, exit markers, allow-list | D1 wake loop (except a hard kill under L1), M1 superseded exits, endturn exit 2 hiding a dead alarm, exit 67, test-flag forgery | D1: the process list becomes unavailable once (one fault u, no second fault needed; a 10 s query timing out under load is listed as the real cause). Exit 2 hiding a dead alarm: u plus an alarm ending inside a long turn. Exit 67: alarm.json unreadable (fault y) | D1: every wake starts an alarm that supersedes the last; each superseded alarm exits 0 and wakes the coordinator again, one link per alarm period; many alarm processes alive. Exit 2 case: the tree goes silent once the list returns |
| FX-W2 arm first, confirm by live slot | M2 window; D6 paths 2, 3, 4; B2.2, B2.3, B1.4 | One dead turn between the reconcile that says alarm-missing and the start of the alarm (1 step). Path 4: the alarm exits mid-turn and the turn dies before endturn | No alarm and no watcher: nothing wakes the tree until the owner acts |
| FX-W3 work needs a live confirmed arm | D2 (no enforcer for each act), B1.1, B1.2; R5 N2 covers hand-over exit 2 | Not modelled. Trigger not recorded. R5 N2 case: hand-over exit 2 with the process list down, then one lost wake (two faults u, l) | Not recorded for D2. N2 case: silence (WakeSourceAlive fails in 4 steps) |
| FX-W4 dead-man check | D6 paths 1, 5, 6, 7; B3.2; B4.1; B4.5; B6.1 alert; a skipped watcher restart | Path 1: one dead turn at the start. Path 5: alarm.json unreadable (y). Path 6 only if an unknown fact is true. Path 7: PC reset (owner's own case). As designed in rev 4 (alert once per onset) it failed at one fault | The tree is silent and no one is told. Fix adds an owner alert; rev 5 repeats it while the cause holds |
| FX-W5 re-raise act-due | M3 gap; feeds B3.2's alert | Two faults: a stuck child (cs) and a woken turn that omits its fence (o). 13 steps | A raised hang is acknowledged and never acted on; the row stalls until a new event or the owner acts (AlwaysCanResolve holds) |
| FX-W6 per-kind deadlines | D5 (slow call, waiting child, first tick of an epoch), B5.2 bounded, B5.3 | Normal operation: one healthy slow call of about ten minutes (two ticks with no new message). Not a fault | A healthy child is suspected of a hang: ledger line, exit 20, a charged and wasted restart. NoFalseSuspicion fails in 6 steps |
| FX-W7 watcher lock under run lock | D1b, restart loop on exit 67, two writers of watcher state, B6.1 | Not modelled. Needs a hung run-lock holder and a split tick (AW final F1), a new mechanism. Frequency not recorded | Not recorded as a measured cost. Named: two writers of watcher state, a restart loop |

## 1b. The fixes: where they land and what they lean on

Size: S under about 80 changed lines, M 80 to 300, L over 300 (my estimate, by place counts in R3 section 3).

| Fix | Scripts changed | New files | Tests | Probes (rows of R3 section 2) | Depends on (as named) | Size, reason |
|---|---|---|---|---|---|---|
| 0b | lib, guard-hook, selftest | none | 3 | 2: F-P6, F-P12 | none | M: strict option, `fsRetry` budget, every hook write, selftest check (about 90, 3 files) |
| FX-OUT | lib, guard-hook, replace, commit, watch, status, fsck | runtime `outcome/<j>.json`; new CONTRACT section 3.23 | 6 | 4: F-P2, F-P3, F-P6, F-P9 | 0b; FX-PLAN step 1 and FX-CLOSE for liveness (model); FX-CLAIM shares `lib.fence` | L: new log reader and append in lib, hook step, fence steps 1-7 replace a block in replace, 4 readers, fsck |
| FX-CLAIM | lib, guard-hook, replace, stop, handover, admit, status, thresholds.json | runtime `claim.json` | 7 | 6: F-P1, F-P5, F-P6, F-P7, F-P9, F-P10b (via `close-session`) | 0b; FX-OUT (tombstone is its step 6); FX-PLAN (lease act, `close-session`); a live watcher for the lease | L: claim helpers, `slotCount`, hook, fence flag, bind, stop, reconcile, 2 callers |
| FX-CGATE | guard-hook, handover, status, selftest (via `init`; the script that holds `init` is not named) | runtime `start.json`, `run/coord-session-<ce>.json`, `run/close/{intent,done}/`; PostToolUse entry in `settings/coordinator.json`; `session_tools` key in `profiles/coordinator.json` | 5 | 7: F-P1, F-P4, F-P6, F-P7, F-P8, F-P9, F-P10 | 0b; Q5 (owner); hook order shared with FX-W1 and FX-W3 (R3 section 3, hook order) | L: whole coordinator branch in the hook, nonce in handover, owner act in status |
| FX-CLOSE | lib (tasks schema), stop, thresholds.json | none | 3 | 1: F-P10 (a, b, c) | FX-CGATE (done records, Post hook); FX-PLAN steps 0 and 3; Q5 | M: request guard, verify rules (a)(b)(c), two thresholds |
| FX-REDO | replace, status, stop, fsck, render (R3 section 3 names fsck and render.mjs:625; the spec list adds the other three) | none | 1 | 0 | none | S: small repeat-call and fsck/render changes (borderline with M) |
| FX-PLAN | lib (`planAct`), status (`nextOf`), watch (`rowAct`) | none | 5 | 3: F-P1a, F-P5, F-P10b | FX-CLAIM, FX-CGATE (`start.json`), FX-OUT (log); Q5 | M: one planner function and a total table test, two callers rewired, a new act |
| FX-W1 | lib (`liveness`), guard-hook (allow-list), watch, status; `.gitignore` line | none | 3 | 3: W-H2, W-allow, W-helpers (last two are file checks) | L1/L2 (owner choice); W-H2 | M: tri-state, per-script allow-list for every script, markers, prune (about 250) |
| FX-W2 | lib (`realProc`), watch, status, thresholds.json | runtime `run/turn.json`, `run/arm/*` | 3 | 2: W-H1, W-turn (file check) | FX-W4 (correct only with it); S1/S2 (owner) | M: two flags in watch, `--arm-nonces`, `turn.json`, `armAtStart` removed |
| FX-W3 | lib (`withRunLock`), replace, guard-hook, watch, status, handover | new `tcb/briefs/coordinator.md` (the other fixes' acts are written into it too) | 5 (incl. the R5 N2 endturn test) | 1: W-H2 | FX-W1 marker; FX-W2 `turn.json` | M: a gate in 3 scripts, `unarmed` record, endturn K, brief; E2 option is extra |
| FX-W4 | status (`--deadman` mode, status view), thresholds.json | new `tcb/settings/deadman-task.xml`; runtime `run/deadman.json` | 4 | 4: W-H4, W-H7a, W-H7b, W-toast | inputs from FX-W3 (`unarmed`), FX-W5 (`stuck`), FX-W7 (`watcher-busy.json`); owner install | L: new read-only mode with about 8 alert causes, re-alert state, pacing (estimate about 300) |
| FX-W5 | watch, thresholds.json | none | 2 | 0 | none named (R1/R2 owner choice); shares `rowAct` with FX-PLAN (join point 11) | S: re-raise and `stuck` counter over the act-due set |
| FX-W6 | lib (`parseTranscript` kind), watch, thresholds.json; stop only for B2 (open, not designed) | none | 3 | 1: W-H5 | B1/B2 (owner); H5 | M: per-kind deadlines, idle, age cap, kind returned |
| FX-W7 | lib (`acquireLock`), watch, thresholds.json | runtime `run/watcher-busy.json` | 2 | 0 | RL-yes/RL-no (owner) | M: lock break under run lock, copy then adopt in `evaluate`, busy file, quarantine |

Runtime file kinds named across all fixes: 13 (`outcome/<j>.json`, `claim.json`, `start.json`,
`run/coord-session-<ce>.json`, `run/close/intent`, `run/close/done`, `run/arm/slot-<k>.json`, `<nonce>.json`,
`exited-*.json`, `unarmed-*.json`, `run/turn.json`, `run/deadman.json`, `run/watcher-busy.json`).

## 2. File overlap: which fixes change each file

Code files (a fix counts only for the places R3 section 3 names):

| File | Fixes that change it | Count |
|---|---|---|
| lib.mjs | 0b, OUT, CLAIM, CLOSE, PLAN, W1, W2, W3, W6, W7 | 10 |
| status.mjs | OUT, CLAIM, CGATE, REDO, PLAN, W1, W2, W3, W4 | 9 |
| watch.mjs | OUT, PLAN, W1, W2, W3, W5, W6, W7 | 8 |
| thresholds.json | CLAIM, CLOSE, W1, W2, W4, W5, W6, W7 (separate keys, one file) | 8 |
| guard-hook.mjs | 0b, OUT, CLAIM, CGATE, W1, W3 | 6 |
| replace.mjs | OUT, CLAIM, REDO, W3 | 4 |
| stop.mjs | CLAIM, CLOSE, REDO (+ W6 for B2, open) | 3 (+1) |
| handover.mjs | CLAIM (pass `{root}`), CGATE, W3 | 3 |
| selftest.mjs | 0b, CGATE | 2 |
| fsck.mjs | OUT, REDO | 2 |
| commit.mjs | OUT | 1 |
| admit.mjs | CLAIM | 1 |
| render.mjs | REDO | 1 |

Other files:

| File | Fixes | Note |
|---|---|---|
| `CONTRACT.md` | all except REDO (0b via section 8.20 and decision 20) | new section 3.23 (OUT), new decision 41 (W2, W3, W4, J1) |
| `spec/<script>.md` | follows each script row; also `briefs.md` (OUT, CLAIM, W3) | R3 section 4 |
| `briefs/child.md` and the four helper briefs (`fmea`, `fresh-reviewer`, `mapper`, `stpa`) | OUT, CLAIM | same READY line and claim line in all five |
| `briefs/coordinator.md` (new) | W3, and acts from W1, W2, CGATE, PLAN | one file, five contributors |
| `settings/coordinator.json` | CGATE | exactly one PreToolUse entry must stay |
| `profiles/coordinator.json` | CGATE (PLAN reads it) | |
| `.gitignore` | W1 | one line |
| `e2e/run-e2e.mjs` | not a fix (R3 section 10, follow-up) | overlaps no fix |

## 3. What can be built at the same time

Rule: two builders must not change the same file. Method: two fixes conflict if they share a code file in
table 2 (the `thresholds.json` counts as a file). Pairs of fixes with no shared file (checked pair by pair):

- 0b with REDO, W4, W5.
- CGATE with CLOSE, W5, W6, W7.
- REDO with 0b, W5, W7 (and W6 if its stop.mjs part for B2, which is open, is left out).
- W4 with 0b only. W5 with 0b, CGATE, REDO. W6 with CGATE (and REDO without B2). W7 with CGATE, REDO.
- No file-disjoint partner at all: OUT, CLAIM, PLAN, W1, W2, W3, CLOSE only with CGATE.

Groups of three fixes that are file-disjoint from each other and share no named dependency:
{0b, REDO, W5}, {0b, REDO, W7}, {0b, REDO, W6 without B2}. The largest such group is **3 fixes**. There is
no group of 4 (checked: only 0b has more than two partners, and among 0b's partners REDO, W4, W5 only
REDO and W5 are disjoint from each other). One more unit exists outside the fixes: `e2e/run-e2e.mjs`
(R3 section 10), which overlaps nothing, so **at most 4 builders** if it counts as a builder.

Dependencies that bar some of these groups (as named in section 1b): W5 shares `rowAct` with PLAN (join
point 11) and W7 shares `evaluate` with W5 and W6; W4 reads files written by W3, W5, W7; 0b is first in
lib's build order. 0b is a dependency of OUT, CLAIM and CGATE, so 0b can run beside REDO and W5 but the three
fixes that use it come after it.

Build order named in the sources (R3 section 3, "Build order across lib", join point 11):
1. lib: 0b; then `outcomeState` and claim helpers; `planAct`; `liveness` and `realProc` timeout;
   `withRunLock` `requireArmed`; `acquireLock`; `parseTranscript` kind; `slotCount`. All in one file, so
   the 10 fixes that touch lib are in sequence if they are split by fix.
2. Replace.mjs fence hold order (join point 11): `requireArmed` (W3, reason `first`), then OUT steps 1-5,
   then the tombstone (CLAIM), then the `lib.fence` compare-and-swap with the log callback and `nostart`.
   OUT, CLAIM and W3 all edit this one hold.
3. Hook order inside one process (join point 9): profile and grammar, W1 allow-list, CGATE bind recognition,
   current session, W3 armed predicate, row check, then CGATE `start.json`. Six fixes edit the one hook.
4. PLAN after CLAIM, CGATE and OUT (it reads their claim, `start.json` and log); CLOSE after CGATE and PLAN.
5. Wake group: W1 markers, then W2 `turn.json`, then W3 (needs both), then W4 (reads W3, W5, W7 records).
   W2 says it is correct only with W4, and W4 reads what W3 writes, which needs W2: a loop in the design,
   not in the file formats.
6. `watch.mjs` `evaluate`: W5, W6, W7 all change it (join point 11); `rowAct`: PLAN and W5.
7. OUT's liveness needs PLAN step 1 and CLOSE, while PLAN reads OUT's log: a loop in the design.

Fact about the shape: all 14 fixes sit in one connected group by shared files (through lib, status, watch,
thresholds.json), so splitting by fix leaves at most 3 at a time. Splitting by file gives one owner per
file: 13 code files, of which `lib.mjs` carries 10 fixes' edits and `status.mjs` 9. That cut needs the
function signatures between files (for example `planAct`, `outcomeState`, `liveness`) fixed first; the
sources name them in R3 section 3 but give no signatures.

## 4. Defects by how they are triggered

Normal operation or one common event (a slow call, a late transcript, one dead turn):

| Defect | Fix | Event | Cost |
|---|---|---|---|
| D5 | W6 | one healthy slow call (about 10 min), no fault | false hang suspicion, charged wasted restart |
| D4a | OUT | READY Write in flight at a planned fence (timing window, one Write call); shortest trace uses one dead turn but CEX says not needed (inferred) | a finished result discarded |
| D4b | CLAIM, PLAN | one dead turn before `bind` (or one first-session crash) plus a late transcript | duplicate session (three processes against N_max 2) |
| M2 gap | W2, W4 | one dead turn at the start of the first turn | tree silent until the owner wakes it |
| D4c | CLOSE, PLAN | one dead turn before `bind`, then a commit at `started` | slot held for ever, later work cannot start |
| D1 | W1 | one process-list outage (one fault u) | wake loop, many alarm processes |
| D6 path 4 | W2, W3, W4 | alarm exits mid-turn, one dead turn before endturn | silence |
| D6 path 5 | W1, W4 | alarm.json unreadable (one fault y) | reconcile exits 67, no status.json, silence |
| D3 | CGATE (CLAIM backstop) | one hand-over plus a stale coordinator; needs session tools allowed to the coordinator, which they are not today | duplicate session from two coordinators |
| D6 path 3b (exit 2) | W1 | process list down (u) plus an alarm expiring inside a long turn (rare) | silence after the list returns |

Needs two faults:

| Defect | Fix | Faults | Cost |
|---|---|---|---|
| M3 | W5 | stuck child (cs) and a turn that omits its fence (o) | an acknowledged hang never acted on |
| Hand-over exit 2 then lost wake (also the M4 "unknown + wake group" NoDeadlock 8) | W3 (R5 N2); not named by the table for FX-W4 | list down (u) and a lost wake (l) | nothing enabled, silence until owner |
| D4c liveness form (EventuallyResolves 12) | CLOSE | two dead turns (x, x) | a stopped row never admitted |
| M5 short suspends | none assigned (reader withdrawn) | two short suspends, only in timer branch (b), unmeasured | two healthy children suspected |
| D6 path 6 | W4 | one crash, real only if an unknown fact holds | silence |

Not modelled, so trigger and cost not recorded: 0b, FX-REDO, FX-W3 (D2), FX-W7. D6 path 7 is the owner's
own PC reset, left out of the property by design. Three traces are model artefacts (a list or a slow call
that never returns; a zombie slot), not defects. Open and not closed by any fix: G6, O5/PROBE 6, C4/PROBE 7(b),
PROBE 1(c), N8/PROBE 10(a), N4, N10, P3-P5, hard kill under L1 (R3 section 9).

## 5. Totals

| Item | Count |
|---|---|
| Fixes | 14 rows (13 fixes plus 0b) |
| By size | L 4 (OUT, CLAIM, CGATE, W4); M 8 (0b, CLOSE, PLAN, W1, W2, W3, W6, W7); S 2 (REDO, W5) |
| Scripts changed | 12 (lib, status, watch, guard-hook, replace, stop, handover, selftest, fsck, commit, admit, render), plus `thresholds.json` |
| New files in the source tree | 2 (`tcb/briefs/coordinator.md`, `tcb/settings/deadman-task.xml`); 13 runtime file kinds; new CONTRACT section 3.23 and decision 41 |
| Existing non-script files edited | `settings/coordinator.json`, `profiles/coordinator.json`, 5 briefs, `.gitignore`, `CONTRACT.md`, spec files |
| Tests to add | 52 (0b 3, OUT 6, CLAIM 7, CGATE 5, CLOSE 3, REDO 1, PLAN 5, W1 3, W2 3, W3 5, W4 4, W5 2, W6 3, W7 2), my count of R3 section 6; model checks not counted |
| Probes | 21 distinct (11 of the F set: P1-P10 and P12; 10 of the W set: H1, H2, H4, H5, H7a, H7b, toast, helpers, allow, turn); 29 rows in R3 section 2, which also lists F-P11 (not needed), H6 (check for a withdrawn reader) and premise (a), (c) (no probe). Three W probes are file or transcript checks, not app observations: helpers, allow, turn |
| Largest group built at the same time, by fix | 3 (4 with the `e2e` follow-up) |
