# FAULTS: where each fault on record came from

Helper of top session 4 (kind analyse, Opus), 2026-11-20, from `research-tree/build/briefs/FAULTS.md` (ruling r57-0040).
Read only; nothing built, run, started or committed; nothing of this project in any web request. Marks: [r] read at
path:line, [c] computed (formula shown), [e] my reasoning or estimate. One build and one repository are a basis, not a
law (r57-0015, r57-0028). Short paths: `AB` = `research-tree/model/as-built/`, `B` = `research-tree/build/`,
`RJ` = `docs/program/evidence/research-tree/foundations-2026-11-16/design/result.json`, `SM` =
`research-tree/SELECTIONS-MAP.md`, `DR` = `research-tree/DESIGN-RECORD.md`, `PV2` =
`docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md`, `hb` = branch `build` in `C:/Users/User/Documents/projects/hb`.

## 0. The answer

1. 44 faults of mechanisms are on record: 13 in the first scripts, 11 breaking in the build, 4 plan gaps, 16 more.
2. A proven design applied with a step missed or changed: 12. Our own glue (app facts, joints, plumbing): 18.
3. Made here where a proven design existed: 4. A proven design whose assumption fails for model sessions: 1.
4. Other causes: a planned part never written 4, a test that did not test 3, a guessed value 2.
5. Both of your possibilities happened: the first scripts failed mostly where the design simplified a borrowed one (8 of 13).
6. The build's own faults are mostly glue, tests and missing parts (21 of 27); the plan's 4 gaps involve no borrowed design.
7. One mechanism carries most: the coordinator waking itself, made here because no outside program can start its turn.
8. Known now, from the records: no pilot is needed for the causes; the pilot shows how often, and settles 6 app facts.
9. No more papers: five fixes cite sources the library lacks, but no recorded fault lies in what those sources cover.
10. Pays most: the app's own helpers in place of our session control (10 of the first 13 faults); path e2 does this.
11. Also pays: the OS's file protection for archived evidence (your setting, no build); OS-freed locks later (43 M).
12. Before a fix round, only if the tree runs: compute gap 4's age cap from active time; renew it while open questions fall.

## 1. What was counted, and what each count counts (r57-0608)

- **A, 13:** faults of the tree's scripts as built before the fixes, found by the model of 2026-11-17: the 7 of
  `research-tree/FAULTS-AND-FIXES.md`:11-17 (x23-0100 to x23-0106), 2 of its 3 "also" items (:19-20; x23-0107, x23-0109;
  the third, a row committed at `started` that cannot be stopped, x23-0108, is A3's mechanism and is not counted
  again), and 4 more that the 13 fixes and 0b close and those 10 lines do not name (`notes/section17-draft-2026-11-17.md`:245-260):
  D1, D1b, a missing ledger line, 0b's fallback. One fault per fix or 0b, 14 designs in all; FX-W2 and FX-W4 share A5.
- **B, 11:** breaking findings of the build's reviews: slice 0's one, slice 1's three, the fix the model check sent back
  in slice 2 (FX-W6), the hooks review's six. FX-W6's own fix review found none breaking (`B/refute/W6-fix.md`).
- **C, 4:** the pilot plan's gaps 1 to 4 (`B/PILOT-PLAN.md`:142-167).
- **D, 16:** other mechanism faults the build's records name, none breaking: r57-0522 (3), slice 1's two mechanism
  items (`B/reports/slice-1.md`:30-31), r57-0518 (6), r57-0521's four mechanism items, slice 2's refused-start charge.
- **E, 12, counted apart:** faults of the design itself, found before or beside the first scripts: the six flaws of
  protocol v2's first model check (F1 to F6, `DR`:48-53) and the six of the second (M1 to M6, `PV2`:936-941).
- **Not counted:** test gaps where the code is right (the surviving mutations of r57-0521 (1), the flaky stop test, the
  lane clamp's missing test); protocol v2's A1 to A8, its 7 extra flaws and 46 attack findings (`DR`:54-69), and the
  refuter findings on the R57 fix drafts (`AB/REFUTE-*.md`), not classified one by one; the mistakes r57-0601 to
  r57-0613, which are the top session's conduct, not mechanisms (the brief leaves them out).
- **Classes:** P proven design applied wrongly (step missed or changed); G our own glue (joints, app facts, plumbing);
  F proven design as written, its assumption fails for model sessions; I made here where a proven design existed;
  and three other causes the records show: **O** a planned part never written, **T** a test that does not reach what it
  claims (the code right), **X** a value set as a guess or from a wrong basis. A fault with two causes is counted once,
  under the one without which it would not happen; the other is named.

## 2. The faults

Columns: what broke; where; the mechanism; its source; class [how known]; evidence; what would have prevented it.

### A. The scripts as first built (R57 round, 13)

| id | what broke | where | mechanism | source | class | evidence | prevented by |
|---|---|---|---|---|---|---|---|
| A1 | A finished child's READY thrown away by a fence that races it (D4a) | replace.mjs:466-477 (readyValid 183-201), the hook passes, the Write lands after the fence | READY re-check under the run lock (ruling edit 961, widened by M6) | the ruling's own fix for an extra flaw; the record held test-and-set by exclusive create for check-then-act races (D3-10) and the commit record written last (D3-09) | **I** [r]; F part: the child's Write is neither exclusive nor torn-proof | `AB/CEX-fence.md`:124-140; `DR`:64; `SM`:55-56; `AB/FIX-fence.md`:91-107 | both outcomes propose on one write-once slot (what FX-OUT does) |
| A2 | Two sessions started for one attempt (D4b) | status.mjs:542, watch.mjs:157-165 order `start-session` for an admitted row with no visible transcript | the row's step machine replacing intent files; "a transcript on disk means the start happened" | D1-07, Helland 2012 and 2007: write the intent before the effect, reconcile after restart | **P** [r]: the intent of the session start was dropped (edit 957; intent files deleted, 1094); F part: the transcript appears late | `SM`:17; `DR`:18, :64; `RJ`:957; `AB/CEX-fence.md`:230-240; `AB/FIX-fence.md`:594-600 | a record that the start was issued, keyed by the attempt (FX-CLAIM) |
| A3 | A finished child holds its slot for ever (D4c); also x23-0108 | commit.mjs:937 accepts a row at `started`; stop.mjs:276-278 and replace.mjs:987 refuse it after | the joint state table of commit, stop and bind | none for the table; the slot rule counts sessions as Kubernetes counts Terminating pods (F6) | **G** [r]; F part: a session never ends by itself and no script can end it | `AB/CEX-fence.md`:207-219, :258-277; `AB/FIX-fence.md`:500-504 | one total transition table checked by test (D1-10; FX-PLAN's table) |
| A4 | A stale coordinator can start a session (D3), if coordinators hold the session tools (today they do not, x23-0120) | the session-start tool, outside every script's `--ce` check | coordinator fence by epoch, compare-and-set under the run lock (edit 956) | D1-01: fencing token checked at the resource (Burrows 2006) | **P** [r]: the token was checked on the table, not on every resource; the record's own review listed "the coordinator fence is incomplete" | `DR`:64; `AB/CEX-fence.md`:242-255; `AB/FIX-fence.md`:370-383 | the check on every path the leader acts through (FX-CGATE) |
| A5 | One dead coordinator turn leaves nothing to wake the tree (D6, seven paths; M2 window) | reconcile asks for the alarm, the turn may die before it arms (status.mjs, watch.mjs) | two wake sources the coordinator starts itself (ruling edit R7) | the model's fix, an outside re-wake, was rejected: "A Task Scheduler entry cannot start a coordinator turn" | **I** [r]: the self-wake was made here; the watchdog outside the failure domain (D4-06) was on record and usable in its alert-only form (as FX-W4 now does); F part: an outside watchdog can only alert | `RJ`:986-988; `DR`:49; `AB/CEX-wake.md`:143; `AB/FIX-wake.md`:156-158, :270-272 | arm before testing; an alert-only watchdog from the start |
| A6 | A healthy ten-minute call taken for a hang and fenced (D5) | watch.mjs hang counter | hang = h ticks with no new call, h a guess (edit 959) | D1-02: unreliable failure detectors, phi accrual, progress, a hard bound (Chandra and Toueg 1996; Hayashibara 2004) | **P** [r]: one fixed count for every kind of call in place of a detector fitted to the operation; X part: h guessed | `SM`:12; `DR`:131; `AB/FIX-wake.md`:330-332 | per-kind deadlines from measured calls (FX-W6 steps 1-4) |
| A7 | A due act raised once; ignored, never raised again (M3) | watch.mjs act-due class 17 | raised once per onset, silent after the acknowledgement (fix M3) | at-least-once delivery, Mesa hints (D1-07, D3-07) | **F** [r]: an acknowledgement means "processed"; the coordinator acknowledges at endturn whatever it did | `AB/FIX-wake.md`:311-313; `AB/CEX-wake.md`:204 | raise again while the condition holds (FX-W5) |
| A8 | Wake loop when the process list is unavailable (D1) | status.mjs:128, :596 (`aliveIn(null)` = alarm-missing) | the M2 fix: "or the process list is unavailable" counts as missing | D1-02: an unreliable detector's "unknown" is never "dead" | **P** [r] | `AB/FIX-wake.md`:102; `PV2`:937; `AB/CEX-wake.md`:152-168 | a third answer, unknown, never acted on as dead (FX-W1) |
| A9 | Test flags of the scripts reachable by the coordinator (x23-0109) | the scripts' own flags, passed by the hook | the hook's allow-list of command forms | D5-02: complete mediation, least privilege (Saltzer and Schroeder 1975) | **P** [r] for the design and the fault, [e] that the list checked forms, not flags | `AB/FIX-wake.md`:104; `SM`:84 | a flag allow-list (FX-W1) |
| A10 | No coordinator brief; nothing enforces the wake acts (D2, x23-0107) | `tcb/briefs/` had no coordinator brief | the acts of rule R6, assumed obeyed | the record selected a reference monitor (D5-04) elsewhere | **O** [r]: a planned part never written | `AB/SEM-wake.md`:505-515 | write the brief; a precondition the scripts check (FX-W3) |
| A11 | A hard-killed watcher's lock no one can break while the list is unknown: a 30 s exit-75 loop (D1b) | watcher.lock, run.lock stale break | lock broken only on a holder judged dead | D3-10: exclusive create paired with leases (Gray and Cheriton 1989) | **P** [r] for the fault, [e] for the step: the lease's expiry by time was replaced by a liveness check that can answer unknown | `AB/SEM-wake.md`:496-500; `SM`:56 | expiry by time, or a lock the OS frees (section 4, row 1) |
| A12 | A ledger line missing after a death (FX-REDO) | tasks.json and run/ledger.jsonl written apart | two stores with no atomic commit across them | D2-03: ARIES, write-ahead log, redo at restart | **P** [r] for the fault and the selection, [e] for the step: no redo pass at restart | `AB/FIX-fence.md`:571-577; `SM`:31 | the redo pass (FX-REDO, the after-image) |
| A13 | A hook write could be seen before its bytes (0b) | lib.mjs:676-688, the fallback when hard links fail | `exclusiveWrite` falling back to a plain `wx` create | D3-10: atomic exclusive create; "none of its assumptions fails" here | **P** [r] | `AB/FIX-fence.md`:61-70; `research-tree/FIX-VS-SELECTIONS.md`:7 | no fallback (0b) |

### B. Breaking findings of the build's reviews (11)

| id | what broke | where | mechanism | source | class | evidence | prevented by |
|---|---|---|---|---|---|---|---|
| B1 | Skeleton put hold 2's lock step outside the run lock | status.mjs `reconcileHold2` (skeleton S0.5) | the holds of reconcile | our joint design (FIX-JOIN point 6, part 2c) | **G** [r] | `B/units/S0.5/refute-checkpoint.md`:39-50; `B/refute/S0.5.md`:12-24 | the skeleton read against FIX-JOIN before the fixes filled it |
| B2 | W5's own test fails after FX-W6 landed | watch.test.mjs `W5 stuck` | the test's setup (FX-W6 counts nothing on an epoch's first tick) | none | **T** [r]: the mechanism held | `B/refute/W5.md`:1, :13-21 | tests run on the merge with landed fixes (land.mjs does this) |
| B3 | REDO's landed test fails on W3 | redo.test.mjs `makeRoot` writes no `run/turn.json` | a new precondition (armed) | none | **T** [r] | `B/refute/W3.md`:1 | the other units' fixtures listed with a precondition |
| B4 | S2.1's N2 test exercised no handover exit 2 | status test "after handover exit 2" | a vacuous test | none | **T** [r] | `B/refute/S2.1.md`:1, :57-62 | a mutation that the test must catch (the review did this) |
| B5 | A bare acknowledgement re-armed the age cap; a stuck attempt never reached the owner | watch.mjs:1199-1204 | FX-W6's overall deadline with a "continue" that re-arms it | overall deadline; a renewable deadline is a lease, renewed by its holder on evidence (Gray and Cheriton 1989, D1-01) | **P** [r] for the facts, [e] for the class: the renewal was given to a signal that carries no decision; the step was added in FX-W6 revision 4, never attacked; G part: the build mapped "continue" to the acknowledgement | `AB/FIX-wake.md`:344; `B/departures/W6.md`:6-13; `B/reports/slice-2.md`:4-6; `B/refute/W4.md`:100 | renewal only on evidence of progress (section 6) |
| B6 | Evidence that the manifests do not list was unprotected | record guard `archivedBy`, commit check `isArchived` | the protected set read from manifests | CLAUDE.md rule 1 covers all evidence | **G** [r] | `B/refute/P0-GATE.md`:12-21 | the rule's prefix, not a list |
| B7 | Git forms that drop journal lines passed (checkout -f, switch -f, stash) | record guard `gitCmd` | refusing listed dangerous forms | D5-02: fail-safe defaults (decide on permission, not exclusion) | **P** [e] | `B/refute/P0-GATE.md`:22-33 | allow known forms, refuse the rest; or the OS (section 4, row 14) |
| B8 | A journal Edit could change the last line | record guard `appendEdit` | our append check | none | **G** [r] | `B/refute/P0-GATE.md`:35-41 | the newline rule (fixed) |
| B9 | Path forms through the admin share and volume names not brought to the real path | record guard `canonical` | our canonicaliser | path equivalence (CWE-41) | **G** [e] | `B/refute/P0-GATE.md`:42-55 | the OS's own check on the file (section 4, row 14) |
| B10 | The plan gate took a unit as done once its done file existed, also while its helper ran or after LIMIT | plan-gate.mjs `notDone()` | done = the file is present | D7-05: "partial outputs look complete if presence means done"; D3-09: commit record written last | **I** [r]: the record names this failure and its cure | `SM`:124, :55; `B/refute/P0-GATE.md`:56-62 | done = helper ended and a marker written last (fixed so) |
| B11 | A helper continued by SendMessage was invisible to the gate | plan-gate.mjs `running()` | the gate's reading of SubagentStop | app fact assumed: a stopped helper stays stopped | **G** [r] | `B/refute/P0-GATE.md`:63-70 | log a start on SendMessage (fixed so) |

### C. The pilot plan's gaps (4)

| id | what broke | where | mechanism | source | class | evidence | prevented by |
|---|---|---|---|---|---|---|---|
| C1 | Every child would run on Fable; helpers inherit their caller's model | `briefs/coordinator.md`:129-138; tier hook :2-5 against `spec/briefs.md`:10, :36 | model choice at a start | our own rules in conflict; the start tool inherits ("Omit to inherit yours") | **G** [r] | `B/PILOT-PLAN.md`:142-150; `B/COMPLEXITY.md`:40 | one route table read by the start act |
| C2 | The scorer cannot be started | no `agents/scorer.md`, no profile; coordinator may start only checkers | roles and profiles | the protocol's blind scorer | **O** [r] | `B/PILOT-PLAN.md`:151-155 | the role's files written with its brief |
| C3 | S1 and S2 would fan out or could not search | no single-session role (guard-hook.mjs:27) | roles and profiles | protocol v2:729-730 | **O** [r] | `B/PILOT-PLAN.md`:156-161 | the arm built as a role |
| C4 | `W_quality` 300 K and `attempt_max_ticks` 240 were placeholders | `tcb/thresholds.json`:70 | parameters | marked "a guess" in the file | **X** [r] | `B/PILOT-PLAN.md`:162-167; hb `thresholds.json`:70 | computed values (the plan does this; see section 6 on the second) |

### D. Other mechanism faults in the build's records (16, none breaking)

| id | what broke | mechanism | class | evidence |
|---|---|---|---|---|
| D1 | The brief says "answer" an idle child; the coordinator has no tool that messages a session | brief and tool profile written apart | **G** [r] | r57-0522 (1); `B/refute/W6-fix.md`:86-97 |
| D2 | "Stop it unless it is making progress": the coordinator cannot read the child's transcripts | an act whose input the role cannot see | **G** [r] | r57-0522 (2) |
| D3 | No "continue" act; an honest long attempt reaches the owner (240 and 285 ticks, guesses) | a part the design needs and never wrote | **O** [r]; X part | r57-0522 (3); `B/reports/fx-w6.md`:38-40 |
| D4 | The app's session id and the CLI's are not tied; every close needs the owner's relayed `closed` | FX-CLOSE's verify | **G** [r] (app fact) | `B/reports/slice-1.md`:30; `B/reports/slice-2.md`:32-33 |
| D5 | Long coordinator turns (89 measured over 60 min) will raise false dead-man alerts | FX-W4's period | **X** [r]: a guessed period against a measurement; the record's progress-kicked watchdog (D3-06) is not kicked by turns | `B/reports/slice-1.md`:31; `SM`:52 |
| D6 | Merges, `commit -n` and `-c core.hooksPath` pass the commit check | a pre-commit hook | **G** [r] (git runs no pre-commit there) | r57-0518 (5); `B/refute/P0-GATE.md`:92, :124 |
| D7 | Manifests unprotected | record guard | **G** [r] | r57-0518 (6) |
| D8 | An append without a final newline glues two records | record guard | **G** [r] | r57-0518 (7) |
| D9 | Hooks set no timeout; a slow gate could fail open | hook settings | **G** [r] (app behaviour on a timed-out hook unknown) | r57-0518 (9) |
| D10 | Lane: two waiters can enter one stale slot; a reused PID holds a slot up to 26 min | the lane's slots, staleness judged by PID | **I** [e]: a counting lock with PID checks where locks the OS frees at death exist | r57-0518 (10); `B/refute/P0-GATE.md`:149 |
| D11 | A second run of a done unit is not refused | plan gate | **G** [r] | r57-0518 |
| D12 | A killed lander exits 1, like "tests failed" | land.mjs | **G** [r] | r57-0521 (1, S0.6) |
| D13 | After exit 4 below the tip, the next landing goes ahead on the failing merge | land.mjs, a merge queue | **P** [e]: a merge queue lands only on a passing tip (merge queues: c1-0323 to c1-0334) | r57-0521 (1, S0.6) |
| D14 | `slotCount` without `{root}` fails open | lib, FX-CLAIM | **G** [r] | r57-0521 (1, CLAIM) |
| D15 | A millisecond window between the lease act's `--if-unclaimed` check and a claim | lease act and hook claim, one locked and one lock-free | **P** [e]: the test-and-set on one slot (D3-10) applied to outcomes, not to this pair; reachable only under reading (ii) of the lease | r57-0521 (4); `B/reports/slice-2.md`:30-31 |
| D16 | If a refused start leaves `start.json`, the third refused start on a row is charged without a fault | FX-CGATE's start record | **G** [r] (app fact, a pilot fact) | `B/reports/slice-2.md`:27-29 |

### E. Faults of the design before or beside the first scripts (12, counted apart; classes [e] from their titles)

| id | the flaw | class | evidence |
|---|---|---|---|
| F1 | Restore carried post-fence output into the next attempt | P: the leader-epoch truncation of fencing missed (fixed by it) | `DR`:48 |
| F2 | A lost wake after the watcher's own urgent exit is permanent | I (the wake) | `DR`:49 |
| F3 | Pause detection works only inside one live watcher | G | `DR`:50 |
| F4 | Endturn starts a second watcher | G | `DR`:51 |
| F5 | Escalation leaves the failed attempt running | P: supervision ends the child before it escalates | `DR`:52 |
| F6 | Admission does not count unstopped sessions | G | `DR`:53 |
| M1 | Endturn kills the alarm; the kill's exit wakes the coordinator: a busy loop | I (the wake) | `PV2`:936 |
| M2 | A first turn that dies before endturn leaves no wake source | I (the wake) | `PV2`:937 |
| M3 | A row left mid-step: the watcher never exits | I (the wake) | `PV2`:938 |
| M4 | Three sessions beside N_max = 2 | F: the slot rule assumes a stopped worker ends | `PV2`:939 |
| M5 | Two PC sleeps in one call count two hang ticks | P: D1-02 and D3-06 say detect a pause; the ruling deleted pause detection | `PV2`:940; `DR`:18 |
| M6 | A planned hand-over fences an attempt whose READY is written | I: a re-check, the forerunner of A1 | `PV2`:941 |

## 3. By class

| class | A | B | C | D | A to D | E |
|---|---|---|---|---|---|---|
| P proven design, step missed or changed | 8 | 2 | 0 | 2 | **12** | 3 |
| G our own glue | 1 | 5 | 1 | 11 | **18** | 3 |
| I made here where a proven design existed | 2 | 1 | 0 | 1 | **4** | 5 |
| F proven design, its assumption fails | 1 | 0 | 0 | 0 | **1** | 1 |
| O a planned part never written | 1 | 0 | 2 | 1 | **4** | 0 |
| T a test that did not test (code right) | 0 | 3 | 0 | 0 | **3** | 0 |
| X a guessed value | 0 | 0 | 1 | 1 | **2** | 0 |
| total | 13 | 11 | 4 | 16 | **44** | 12 |

How known: of the 44, 35 rest on records read [r] and 9 on my reasoning for the class or the missed step (A9, A11,
A12, B5, B7, B9, D10, D13, D15); E's twelve are classed [e] from their titles. A fault's second cause (the "part" in the tables) is named, not counted: F parts in A1, A2,
A3, A5; X parts in A6, D3; a G part in B5.

Where the P faults' missed steps were made [r]: in the 2026-11-16 ruling's edits that replaced a selected step with a
simpler one (A2: edits 957 and 1094; A4: 956; A6: 959; `RJ`:955-959, `DR`:18, :64), in the six model-check fixes (A8),
in the first code (A9, A11, A12, A13), and in a design revision no refuter attacked (B5: FX-W6 revision 4,
`AB/FIX-wake.md`:344), carried into the build as a recorded departure (`B/departures/W6.md`:6-13).

The wake (the coordinator waking itself, A5) holds 14 of the 56: A5, A7, A8, A10, A11, B5, D1, D2, D3, D5, F2, M1, M2,
M3 [c: counted from the tables above]. Session control (start, claim, fence, stop, wake) holds 10 of A's 13: all but
A9, A12 and A13.

## 4. The inventory

Status: **whole** (the proven design used as its source states it), **adapted** (where and why), **made here**. Cost of
a replacement [c]: one fix unit = builder 32.3 M + refuter 10.6 M = **42.9 M** (r57-0173), plus a root share. Lines
counted on hb (`research-tree/tcb/*.mjs` 23,474 lines; `.claude/hooks/*.mjs` 1,953 lines with two test files;
`tools/check-commit.mjs` 113).

| # | Group (scripts, units) | Proven design and source | Status, where and why | Faults | Replacement, cost and saving |
|---|---|---|---|---|---|
| 1 | Locks: run.lock, watcher.lock (lib, watch; W7, S0.5) | exclusive create (D3-10), leases (Gray and Cheriton 1989) | adapted: create used whole; the lease's expiry by time replaced by judging the holder by PID and start time, which can answer "unknown" | A11, B1, F4; with row 16: D10 | a lock the OS frees when its holder dies (a named pipe held by the process is the usual single-instance form) [e: whether this PC behaves so needs a small test, r57-0506]; about 1 unit, 43 M, with the lane; saves the stale-break class (A11, D10, E1 of `DR`:64); after the pilot |
| 2 | Fencing and outcomes: epoch compare-and-set, `--ce`, staging cut, outcome log, READY copy (replace, lib, guard-hook; OUT, S0.4) | fencing token at the resource (Burrows 2006, D1-01); leader-epoch truncation (Kafka); test-and-set on write-once slots (CORFU, named by the fix, not in the record) | adapted: the file system checks no token, so scripts and the hook check it; the record selects a write-ahead log with a commit record (D2-03, D3-09) where FX-OUT built a slot log | A1, A4, A13, F1, M6, D15 | none better: the fixes now apply the designs; D15 closes by putting the lease act and the claim on one slot |
| 3 | Start, claim and the step machine; planners (replace, status, watch, lib; CLAIM, PLAN, CGATE) | idempotency keys and intents (Helland 2012, 2007, D1-07); state machine approach (Schneider 1990, D1-10); Kubernetes controller expectations (named by FX-PLAN, not in the record) | adapted: intents replaced by the row's steps (edit 957), so a start had no record until FX-CLAIM | A2, A3, D14, D16 | the app's own helper mechanism, where the work fits helpers: start, completion notice, result and model per helper, in real use (r57-0157); nothing to build; avoids this group and groups 2, 4, 6 for that work; costs the tree's own measurements (`B/COMPLEXITY-v1.md`:20, :26); version 2 chose it, path e2 (`B/COMPLEXITY.md`:19) |
| 4 | Stop and close; restart limit; host class (stop, replace; CLOSE) | supervision with restart limits (Armstrong 2003, D1-09); close then verify | adapted: a lease rejected because sessions neither stop at expiry nor can be killed | A3, F5, M4, D4 | as row 3 |
| 5 | Failure detection: stall and hang counters, the progress variant V, tri-state liveness, exit markers, per-kind deadlines and the age cap, pause discount (watch, lib; W1, W6) | unreliable failure detectors (Chandra and Toueg 1996), phi accrual (Hayashibara 2004), D1-02; variant per time box (Floyd 1967, D7-07); progress-kicked watchdog (D3-06) | adapted: fixed counts per kind in place of an adaptive detector; pause detection deleted (1094), half restored (M5) | A6, A8, B5, M5, F3 | deadlines from the pilot's measured calls (the plan's Q3 + 1.5 IQR method); phi accrual only once the pilot gives inter-arrival data; no build before the pilot |
| 6 | The wake: watcher, self-armed alarm with re-arm token, reconcile and endturn, act-due and its re-raise, arm-first, the armed precondition, dead-man (watch, status, handover; W2 to W5, W4) | lost wake-up and Mesa hints (Lampson and Redell 1980, D3-07); at-least-once delivery (D1-07); reference monitor (Anderson 1972, D5-04); watchdog outside the failure domain (D4-06) | **made here**: an outside supervisor cannot start a turn (`RJ`:986-988), so the coordinator starts its own wake sources; the borrowed parts are fitted around that | A5, A7, A8, A10, A11, B5, D1, D2, D3, D5, F2, M1, M2, M3 | no proven implementation for this app is known; whether a scheduled task, a monitor or Remote Control can begin a turn is being looked into (the piece on running without the owner); helpers avoid it (row 3) |
| 7 | Hand-over: drain, ce raise, successor nonce, W* (handover, cost) | checkpoint interval (Young 1974), square-root law (Harris 1913), D3-01, D2-04 | adapted: "the formula is derived, not borrowed" (`SM`:32) | none in the build | keep |
| 8 | Admission and budget: slots with unstopped sessions counted, the reservation, memory check (admit, lib) | load control (Denning 1968, D3-03), escrow (O'Neil 1986, D1-08) | adapted: reservation computed, never stored | F6, M4, D14 | keep |
| 9 | Records: commit records, the hash-chained ledger, redo, snapshots by hash, truth labels, views, fsck (commit, lib, snap, tms, render, fsck; REDO) | ARIES (D2-03); hash chains (Schneier and Kelsey 1999, D5-11); JTMS and ATMS (D7-02); hash baseline (Kim and Spafford 1994, D5-08) | used whole as principles, written here | A12 | keep |
| 10 | Integrity: the guard hook's profiles and allow-lists, witness, certify and promote, the check queue and seeds, selftest (guard-hook, witness, certify, promote, check-queue, seed, selftest) | reference monitor and complete mediation (D5-02, D5-04); Clark-Wilson (1987); error seeding (Mills 1972) | adapted: a hook sees tool inputs, not what a program does (`B/refute/P0-GATE.md`:71-90) | A9, A10, C2, C3, D1 | keep; C2 and C3 are missing files |
| 11 | Evidence method and shape: protocol freeze, compare, cost law, gate (protocol-freeze, compare, cost, gate) | registered protocols (D6-07); equivalence and McNemar tests (D6-05); D3-12's fan-out law, derived here | used whole (formulas), one law derived | C4 | keep |
| 12 | The model checker (`research-tree/model/`, 2,316 lines with the as-built model) | explicit-state model checking, TLA (Lamport 1994; Holzmann 1997), D7-06 | method whole, implementation ours; runs stop BOUNDED at their memory | none recorded | TLC: about 2 units (86 M) [e] plus a Java install (rule 3); no recorded fault avoided; does not pay now |
| 13 | Tier hook and `tier-routes.json` | none; routing literature held (a1-0405; RouteLLM, a1-0322 to a1-0336) | made here, a rule table | C1 | the router piece (top session's item C) |
| 14 | Record guard and commit check (`.claude/hooks/record-guard.mjs`, `tools/check-commit.mjs`) | reference monitor, complete mediation, fail-safe defaults (Saltzer and Schroeder 1975) | adapted: mediation by parsing tool inputs and command text; it cannot see programs, paths built at run time, or other writers | B6 to B9, D6 to D9 | the OS's own protection: archived evidence read-only, journals with an append-only right, the commit check kept for hashes; no build unit [e: under 2 M for a script]; the owner sets it (a security setting: `RJ`:1014-1015); saves B6, B7, B9, D7 and the class of writers the hook cannot see |
| 15 | Plan gate (`.claude/hooks/plan-gate.mjs`) | a job scheduler with a width limit (make -j, a job server) | made here | B10, B11, D11 | keep (fixed); its "done" now follows D3-09 |
| 16 | The lane (slots for heavy commands) | counting semaphore | made here, PID-judged stale slots | D10 | row 1's lock |
| 17 | `land.mjs` (merge, test, undo) | merge queue (Bors, Zuul; c1-0323 to c1-0334) | adapted, local only | D12, D13 | keep; D13 needs the queue's rule (never land on a failing tip) |

## 5. When each answer is known

- **Class of every fault: known now** from the records (35 [r], 9 by my reasoning on recorded facts). None waits for
  the pilot or an A/B test.
- **What the pilot adds:** how often each happens, and six app facts behind faults whose class is already known: a
  background command's exit as the coordinator's wake and real turn lengths (A5, D5); the app's session id against the
  CLI's (D4); whether a refused start leaves `start.json` (D16); what the app does with a hook that times out (D9; a
  small test, r57-0506); the call lengths per kind behind the deadlines (A6, C4); T's real length (D3, C4).
- **More literature: none needed.** Adapted parts with no recorded source: FX-OUT's slot log (CORFU, Balakrishnan and
  others, NSDI 2012), FX-PLAN's expectations (Kubernetes source, not a paper), FX-W5's visibility timeout (a vendor's
  documentation), FX-W2's register-before-testing (Birrell 1989; Lampson and Redell 1980 is in the record), FX-CLAIM's
  tombstone and partial synchrony (Dwork, Lynch and Stockmeyer 1988); the library holds no record of CORFU,
  ControllerExpectations or a visibility timeout [r: `bash library/lookup.sh` answers "not recorded"]. None of these
  would change a class: the recorded faults lie in steps these sources do not cover (B5 in the re-arm added here, D15
  in the joint of the lease act and the claim, the rest in glue). So none is read (r57-0014, r57-0110).
- **The open gaps:** r57-0521 (test gaps T, words, D15), r57-0522 (D1 to D3), r57-0518 (D6 to D11): classes known now;
  D3 and D2 have a fix from the record (section 6); the rest is glue, fixed after the pilot as planned.

## 6. Before the fix round (PILOT-PLAN.md node 5)

| gap | kind of fix | what it changes in the fix round |
|---|---|---|
| 1 models | glue | none in size. Read the route from `tier-routes.json` (one table) in the start act and the Agent starts, so the router piece changes data, not code [e] |
| 2 scorer | glue (a missing part) | none |
| 3 S1 and S2 | glue (a missing part) | none; the same role serves the complexity analysis's one plain session |
| 4 W_quality 280 K | computed (368 K compaction - 48 K - 38 K) | none |
| 4 attempt_max_ticks 630 | the proven design applied properly | (a) the 630 ticks (10.5 h) come from wall times of 1.2 h (1.1-4.85), and round 3's 4.8-5.3 h sessions include a 4.3 h PC restart (`B/COMPLEXITY-v1.md`:15-16; `B/COMPLEXITY.md`:54) while ticks count only while the watcher runs: recompute from active time (1.2-1.8 h a field), measured by the complexity analysis's `round3.mjs` [r for the facts, e for the effect: a lower cap]. (b) A deadline that may be extended is a lease, renewed on its holder's evidence (D1-01); the record's evidence of progress is the variant V per time box (D7-07), which the watcher already computes (hb `watch.mjs`:517-551). Renewing the cap only when `V_min` fell since the last cap replaces the guessed "continue" and gives D2's missing judgement; one small change in unit 3's watch.mjs and the brief's place 7b [e: well under one unit]; avoids D2, D3 and the B5 class |

Nothing else needs to move before the pilot: rows 1, 14 and 16 of section 4 are robustness work for after it. The
complexity analysis's version 2 has chosen path e2, helpers and no child sessions (`B/COMPLEXITY.md`:19), which has no
fix round (:205): then this section applies only when the tree itself runs, and the faults of section 4's rows 2 to 4
and 6 do not arise in the research run.

## 7. r57-0113 checked

"9 fixes use the recorded design, 5 a variant" counts 14 designs: the 13 fixes and 0b
(`research-tree/FIX-VS-SELECTIONS.md`:7-20). The verdicts follow from the table's own rows, and each key matches the map
(`SM`:11-12, :17, :31, :53, :56, :71, :84, :86) [r]. But "same design" compares the family's name, not its steps: 3 of
the 9 add parts the record does not hold (FX-CLAIM's tombstone and partial synchrony, FX-CGATE's one-time nonce, FX-W7's
shedding of work), and the 5 variants' named sources are in no library record. The one built fix the model check sent
back, FX-W6, is a "same design" row, and it failed in a step the record does not hold (B5). So r57-0113 stands as a
check of names and says nothing on where faults come from.

## 8. Not known

- The nine classes resting on my reasoning, and E's twelve, have had no refuter.
- Group E's other findings (protocol v2's A1 to A8, 7 extra flaws, 46 attack findings) and the refuter findings on the
  R57 fix drafts are not classified one by one; the test gaps are not counted as faults.
- Whether a named pipe held as a lock is freed at a hard kill and refuses a second holder on this PC: a small test.
- Whether any app facility other than a background command's exit can begin a coordinator turn (decides whether row 6
  stays made here).
- The six pilot facts of section 5.
