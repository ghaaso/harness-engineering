# FAULTS: where each fault on record came from (version 2)

Helper of top session 4 (kind analyse, Opus), 2026-11-20, from `research-tree/build/briefs/FAULTS.md` (ruling r57-0040).
Version 2, the same day, from `research-tree/build/briefs/FAULTS-fold.md`: the blind review `B/refute/FAULTS.md`
("CORRECT: 16 findings") folded in as the top session decided each finding (r57-0021); version 1, which the review cites
by line, is kept byte for byte as `B/FAULTS-v1.md`. Read only; nothing built, run, started or committed; nothing of this
project in any web request. Marks: [r] read at path:line, [c] computed (formula shown), [e] my reasoning or estimate
("the review's" where the review reasoned it). One build and one repository are a basis, not a law (r57-0015,
r57-0028). Short paths: `AB` = `research-tree/model/as-built/`, `B` = `research-tree/build/`, `RJ` =
`docs/program/evidence/research-tree/foundations-2026-11-16/design/result.json`, `SM` = `research-tree/SELECTIONS-MAP.md`,
`DR` = `research-tree/DESIGN-RECORD.md`, `PV2` = `docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md`, `S17` =
`research-tree/notes/section17-draft-2026-11-17.md`, `hb` = branch `build` in `C:/Users/User/Documents/projects/hb`.

## 0. The answer

1. At least 56 faults in the tree's scripts, build and plan: version 1's 44 and 12 the review found (a floor; design flaws apart).
2. Our own glue is the largest cause: 17 of the 44 (23 of the 56). A borrowed design with a step missed or changed: 12 (16).
3. A borrowed design used as written whose assumption fails for model sessions: 3. Made here where a proven one existed: 3 (4).
4. The rest: a part planned, never written 5 (6); a clash of two units, caught at landing 2; a test that checked nothing 1; a guess 1.
5. So both happened: the first scripts failed mostly in borrowed designs (10 of 13), the build mostly in glue (15 of 27; 21 of 38).
6. No one part carries most: none holds more than 8 of the 56; with the design's own 12, the wake holds the most, 11 of 68.
7. Known now, but for two classes: A5's waits on whether an app feature can start a coordinator turn; D10's on a lock test.
8. The pilot adds how often each fault happens and six app facts; it changes no class.
9. No more papers: nine fixes cite sources outside our recorded selections, but no fault's class here rests on them.
10. Pays most: the app's helpers in place of our session control (path e2, chosen); 10 of the first 13 faults (11 of 14) go.
11. But helpers do not fence a replaced helper, limit restarts or catch a hang: those checks are dropped, not done; loss unmeasured.
12. After the pilot: our run lock's checked break for the lane and lander; OS file protection for evidence (your setting, a test first).

## 1. What was counted, and what each count counts (r57-0608)

- **The 44 and the 56.** "The 44" are groups A to D as version 1 counted them; "the 56" are the 44 and the twelve the
  review found (A14, D17 to D27). 56 is a lower bound: the test gaps where the code is right are left out (below), and
  the review scanned five refute files (OUT, S0.4, W5, W7, S0.3) without reading them in full. E's 12 are in neither.
  Each fault is counted once, in one class and in one row of section 4.
- **A, 13 (14 with A14):** faults of the tree's scripts as built before the fixes, found by the model of 2026-11-17,
  merged by the fix that closes them: the 13 fixes and 0b, 14 designs, of which FX-W1 closes two (A8, A9), FX-PLAN none
  of its own (its defects (a) and (b) are A2's and A3's, `AB/FIX-fence.md`:594-600), and FX-W2 and FX-W4 share A5. By
  source: the 7 of `research-tree/FAULTS-AND-FIXES.md`:11-17 (x23-0100 to x23-0106), 2 of its 3 "also" items (:19-20;
  x23-0107, x23-0109; the third, a row committed at `started` that cannot be stopped, x23-0108, is A3's mechanism and is
  not counted again), and 4 more that the 13 fixes and 0b close and those 10 lines do not name (`S17`:245-260): D1, D1b,
  a missing ledger line, 0b's fallback. **A14**, added: the M5 gap, found by the same model and closed by no fix.
- **B, 11:** breaking findings of the build's reviews: slice 0's one, slice 1's three, the fix the model check sent back
  in slice 2 (FX-W6), the hooks review's six. FX-W6's own fix review found none breaking (`B/refute/W6-fix.md`).
- **C, 4:** the pilot plan's gaps 1 to 4 (`B/PILOT-PLAN.md`:142-167).
- **D, 16 (27 with D17 to D27):** other mechanism faults the build's records name, none breaking: r57-0522 (3), slice
  1's two mechanism items (`B/reports/slice-1.md`:30-31), r57-0518 (6), r57-0521's four mechanism items, slice 2's
  refused-start charge. **D17 to D27**, added: eleven more that the refute files and the End list name
  (`B/STATE.md`:708-762).
- **E, 12, counted apart:** faults of the design itself, found before or beside the first scripts: the six flaws of
  protocol v2's first model check (F1 to F6, `DR`:48-53) and the six of the second (M1 to M6, `PV2`:936-941).
- **Not counted:** test gaps where the code is right (the End list's surviving mutations and vacuous checks, r57-0521
  (1), among them CLAIM's T7c; the flaky stop test; the lane clamp's missing test); protocol v2's A1 to A8, its 7 extra
  flaws and 46 attack findings (`DR`:54-69), and the refuter findings on the R57 fix drafts (`AB/REFUTE-*.md`), not
  classified one by one; the mistakes r57-0601 to r57-0613, which are the top session's conduct, not mechanisms (the
  brief leaves them out).
- **Classes:** P proven design applied wrongly (step missed or changed); G our own glue (joints, app facts, plumbing);
  F proven design as written, its assumption fails for model sessions; I made here where a proven design existed;
  and four other causes the records show: **O** a planned part never written, **L** a clash between units built side by
  side, caught by the landing check as designed (every landing through the check, r57-0415; merges do break builds and
  tests, r57-0305), **T** a test that does not reach what it claims (the code right), **X** a value set as a guess or
  from a wrong basis. A fault with two causes is counted once, under the one without which it would not happen; the
  other is named.

## 2. The faults

Columns: what broke; where; the mechanism; its source; class [how known]; evidence; what would have prevented it.

### A. The scripts as first built (R57 round, 13, and A14)

| id | what broke | where | mechanism | source | class | evidence | prevented by |
|---|---|---|---|---|---|---|---|
| A1 | A finished child's READY thrown away by a fence that races it (D4a) | replace.mjs:466-477 (readyValid 183-201), the hook passes, the Write lands after the fence | READY re-check under the run lock (ruling edit 961, widened by M6) | the ruling's own fix for an extra flaw; the record held test-and-set by exclusive create for check-then-act races (D3-10) and the commit record written last (D3-09) | **I** [r]; F part: the child's Write is neither exclusive nor torn-proof | `AB/CEX-fence.md`:124-140; `DR`:64; `SM`:55-56; `AB/FIX-fence.md`:91-107 | both outcomes propose on one write-once slot (what FX-OUT does) |
| A2 | Two sessions started for one attempt (D4b) | status.mjs:542, watch.mjs:157-165 order `start-session` for an admitted row with no visible transcript | the row's step machine replacing intent files; "a transcript on disk means the start happened" | D1-07, Helland 2012 and 2007: write the intent before the effect, reconcile after restart | **P** [r]: the intent of the session start was dropped (edit 957; intent files deleted, 1094); F part: the transcript appears late | `SM`:17; `DR`:18, :64; `RJ`:957; `AB/CEX-fence.md`:230-240; `AB/FIX-fence.md`:594-600 | a record that the start was issued, keyed by the attempt (FX-CLAIM) |
| A3 | A finished child holds its slot for ever (D4c); also x23-0108 | commit.mjs:937 accepts a row at `started`; stop.mjs:276-278 and replace.mjs:987 refuse it after | the joint state table of commit, stop and bind | none for the table; the slot rule counts sessions as Kubernetes counts Terminating pods (F6) | **G** [r]; F part: a session never ends by itself and no script can end it | `AB/CEX-fence.md`:207-219, :258-277; `AB/FIX-fence.md`:500-504 | one total transition table checked by test (D1-10; FX-PLAN's table) |
| A4 | A stale coordinator can start a session (D3), if coordinators hold the session tools (today they do not, x23-0120) | the session-start tool, outside every script's `--ce` check | coordinator fence by epoch, compare-and-set under the run lock (edit 956) | D1-01: fencing token checked at the resource (Burrows 2006) | **P** [r]: the token was checked on the table, not on every resource; the record's own review listed "the coordinator fence is incomplete" | `DR`:64; `AB/CEX-fence.md`:242-255; `AB/FIX-fence.md`:370-383 | the check on every path the leader acts through (FX-CGATE) |
| A5 | One dead coordinator turn leaves nothing to wake the tree (D6, seven paths; M2 window) | reconcile asks for the alarm, the turn may die before it arms (status.mjs, watch.mjs) | two wake sources the coordinator starts itself (ruling edit R7) | a supervisor outside the failure domain that re-wakes its subject (D4-06; the model's fix), rejected: "A Task Scheduler entry cannot start a coordinator turn" | **F** [r]: the supervisor's assumption, that it can wake its subject, fails here; were it true, the model's outside re-wake would cover every path, and an alert-only watchdog (FX-W4) does not wake the tree; P part: register before testing (the lost wake-up's order) missed in the M2 fix, behind D6's paths 2-4 and the M2 window; paths 1 and 5-7 need a party outside the tree | `RJ`:986-988; `DR`:49; `AB/CEX-wake.md`:143; `AB/SEM-wake.md`:518-530; `AB/FIX-wake.md`:154-158, :270-272 | arm before testing (paths 2-4); for the rest, an outside party that can start a turn, if the app has one (section 8) |
| A6 | A healthy ten-minute call taken for a hang and fenced (D5) | watch.mjs hang counter | hang = h ticks with no new call, h a guess (edit 959) | D1-02: unreliable failure detectors, phi accrual, progress, a hard bound (Chandra and Toueg 1996; Hayashibara 2004) | **P** [r]: one fixed count for every kind of call in place of a detector fitted to the operation; X part: h guessed | `SM`:12; `DR`:131; `AB/FIX-wake.md`:330-332 | per-kind deadlines from measured calls (FX-W6 steps 1-4) |
| A7 | A due act raised once; ignored, never raised again (M3) | watch.mjs act-due class 17 | raised once per onset, silent after the acknowledgement (fix M3) | at-least-once delivery, Mesa hints (D1-07, D3-07) | **F** [r]: an acknowledgement means "processed"; the coordinator acknowledges at endturn whatever it did | `AB/FIX-wake.md`:311-313; `AB/CEX-wake.md`:204 | raise again while the condition holds (FX-W5) |
| A8 | Wake loop when the process list is unavailable (D1) | status.mjs:128, :596 (`aliveIn(null)` = alarm-missing) | the M2 fix: "or the process list is unavailable" counts as missing | D1-02: an unreliable detector's "unknown" is never "dead" | **P** [r] | `AB/FIX-wake.md`:102; `PV2`:937; `AB/CEX-wake.md`:152-168 | a third answer, unknown, never acted on as dead (FX-W1) |
| A9 | Test flags of the scripts reachable by the coordinator (x23-0109) | the scripts' own flags, passed by the hook | the hook's allow-list of command forms | D5-02: complete mediation, least privilege (Saltzer and Schroeder 1975) | **P** [r] for the design and the fault, [e] that the list checked forms, not flags | `AB/FIX-wake.md`:104; `SM`:84 | a flag allow-list (FX-W1) |
| A10 | No coordinator brief; nothing enforces the wake acts (D2, x23-0107) | `tcb/briefs/` had no coordinator brief | the acts of rule R6, assumed obeyed | the record selected a reference monitor (D5-04) elsewhere | **O** [r]: a planned part never written | `AB/SEM-wake.md`:505-515 | write the brief; a precondition the scripts check (FX-W3) |
| A11 | A hard-killed watcher's lock no one can break while the list is unknown: a 30 s exit-75 loop (D1b) | watcher.lock, run.lock stale break | lock broken only on a holder judged dead | D3-10: exclusive create paired with leases (Gray and Cheriton 1989) | **P** [r] for the fault, [e] for the step: the lease's expiry by time was replaced by a liveness check that can answer unknown | `AB/SEM-wake.md`:496-500; `SM`:56 | expiry by time, or a lock the OS frees (section 4, row 1) |
| A12 | A ledger line missing after a death (FX-REDO) | tasks.json and run/ledger.jsonl written apart | two stores with no atomic commit across them | D2-03: ARIES, write-ahead log, redo at restart | **P** [r] for the fault and the selection, [e] for the step: no redo pass at restart | `AB/FIX-fence.md`:571-577; `SM`:31 | the redo pass (FX-REDO, the after-image) |
| A13 | A hook write could be seen before its bytes (0b) | lib.mjs:676-688, the fallback when hard links fail | `exclusiveWrite` falling back to a plain `wx` create | D3-10: atomic exclusive create (`wx`); "none of its assumptions fails" here | **F** [r]: D3-10 used as written; its unstated assumption, that the created name alone is the claim, fails for slots whose bytes are read (READY, claim); G if the fallback is read as our plumbing | `AB/FIX-fence.md`:61-70; `research-tree/FIX-VS-SELECTIONS.md`:7; `SM`:56 | no fallback (0b) |
| A14 | Suspends shorter than 2Δ still counted as hang ticks (the M5 gap; real in kind) | watch.mjs pause discount, timer branch (b) | M5's fix: a tick more than 2Δ after the previous evaluation leaves the hang count unchanged | D1-02 and D3-06: detect a suspend as a gap between polls and shift every deadline (`SM`:52) | **P** [e], the review's, as E's M5: a gap threshold that short suspends pass under; open by design, closed by no fix | `S17`:186, :394, :536; `AB/CEX-wake.md`:53, :226-228; `PV2`:940 | detect the suspend itself (what Windows logs for one, H6, is unchecked: `S17`:536) |

### B. Breaking findings of the build's reviews (11)

| id | what broke | where | mechanism | source | class | evidence | prevented by |
|---|---|---|---|---|---|---|---|
| B1 | Skeleton put hold 2's lock step outside the run lock | status.mjs `reconcileHold2` (skeleton S0.5) | the holds of reconcile | our joint design (FIX-JOIN point 6, part 2c) | **G** [r] | `B/units/S0.5/refute-checkpoint.md`:39-50; `B/refute/S0.5.md`:12-24 | the skeleton read against FIX-JOIN before the fixes filled it |
| B2 | W5's own test fails after FX-W6 landed | watch.test.mjs `W5 stuck` | the test's setup (FX-W6 counts nothing on an epoch's first tick) | none | **L** [r]: units built side by side; the test reached what it claims and caught a real mismatch at landing, as designed | `B/refute/W5.md`:1, :13-21 | tests run on the merge with landed fixes (land.mjs does this) |
| B3 | REDO's landed test fails on W3 | redo.test.mjs `makeRoot` writes no `run/turn.json` | a new precondition (armed) | none | **L** [r]: as B2 | `B/refute/W3.md`:1 | the other units' fixtures listed with a precondition |
| B4 | S2.1's N2 test exercised no handover exit 2 | status test "after handover exit 2" | a vacuous test | none | **T** [r] | `B/refute/S2.1.md`:1, :57-62 | a mutation that the test must catch (the review did this) |
| B5 | A bare acknowledgement re-armed the age cap; a stuck attempt never reached the owner | watch.mjs:1199-1204 | FX-W6's age cap, re-armed when the coordinator lets the attempt "continue" (step 5, revision 4, never attacked) | an overall deadline (a request's total budget, `AB/FIX-wake.md`:330), which is not renewed [e, the review's] | **O** [r]: the design needs a continue act that tells "continue" apart from silence, and none was written ("a new mechanism, not built"); G part: the build mapped "continue" to the acknowledgement | `AB/FIX-wake.md`:344; `B/departures/W6.md`:6-13; `B/refute/W4.md`:100-115; `B/reports/slice-2.md`:4-6 | write the continue act, or leave the cap un-renewed (what the FX-W6 fix round did: `B/refute/W6-fix.md`:18-22) |
| B6 | Evidence that the manifests do not list was unprotected | record guard `archivedBy`, commit check `isArchived` | the protected set read from manifests | CLAUDE.md rule 1 covers all evidence; D5-02: fail-safe defaults (decide on permission, not exclusion; `SM`:84) | **P** [e], the review's, as B7: protection decided by a list | `B/refute/P0-GATE.md`:12-21 | the rule's prefix, not a list |
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

### D. Other mechanism faults in the build's records (16, and D17 to D27 added; none breaking)

D17 to D27 come from the review (finding 9): their facts [r] at the places cited, their classes the review's [e].

| id | what broke | mechanism | class | evidence |
|---|---|---|---|---|
| D1 | The brief says "answer" an idle child; the coordinator has no tool that messages a session | brief and tool profile written apart | **G** [r] | r57-0522 (1); `B/refute/W6-fix.md`:86-97 |
| D2 | "Stop it unless it is making progress": the coordinator cannot read the child's transcripts | an act whose input the role cannot see | **G** [r] | r57-0522 (2) |
| D3 | No "continue" act; an honest long attempt reaches the owner (240 and 285 ticks, guesses) | a part the design needs and never wrote | **O** [r]; X part | r57-0522 (3); `B/reports/fx-w6.md`:38-40 |
| D4 | The app's session id and the CLI's are not tied; every close needs the owner's relayed `closed` | FX-CLOSE's verify | **G** [r] (app fact) | `B/reports/slice-1.md`:30; `B/reports/slice-2.md`:32-33 |
| D5 | Long coordinator turns (89 measured over 60 min) will raise false dead-man alerts | FX-W4's period | **P** [e], the review's: the record's progress-kicked watchdog (D3-06) is not kicked by turns; X part: a guessed period against a measurement | `B/reports/slice-1.md`:31; `SM`:52; `B/refute/W4.md`:172-178 |
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
| D17 | A row committed at `started` whose started line was lost gets neither the redo nor fsck's warning (reachable since FX-CLOSE step 3) | FX-REDO's `reconcileRedo` and fsck look only at `active` rows at `started` | **P** [e], the review's: ARIES redoes every state a death can leave (D2-03); this one is skipped | `B/refute/W4.md`:135-137; `B/STATE.md`:746 |
| D18 | A start record that does not parse, or has `tick: null`, counts as present and never expires: the row is `none` for ever and no owner act is raised | the start lease of FX-PLAN, FX-CLAIM and FX-CGATE (`startLeaseExpired(null)` is false) | **P** [e], the review's: a lease that never expires (D1-01, D3-10 select leases) | `B/refute/PLAN.md`:105-109 |
| D19 | Nonce files `run/arm/<X>.json` are never pruned: one more each turn, and the exit-marker read grows with the folder | FX-W2's arm nonces; hold 2 prunes only exit markers | **G** [e], the review's | `B/refute/W2.md`:76-77 |
| D20 | A corrupt `turn.json` restarts `turn_seq` at 1 and `unarmed_turns` at 0: an abandoned ensure waits until `alarm_ms`, and FX-W4's unarmed count restarts | FX-W2's turn record (its departures 4 and 5) | **G** [e], the review's | `B/refute/W2.md`:73-75 |
| D21 | land.mjs's stale-lock break can let two breakers in (`rmSync`, then `mkdir`, as the lane does); remote, since the design has one lander | land.mjs's lock | **I** [e], the review's, as D10: the run lock's checked break was on record (`RJ`:955) | `B/refute/S0.6.md`:121-122 |
| D22 | The start tool's `initiation` is not checked: `own_initiative` leaves a card the owner can start long after the lease; `offer` never starts and always ends in a charged no-start | FX-CGATE's start check | **G** [e], the review's | `B/refute/CGATE.md`:89-92 |
| D23 | The start-tool field check is a deny-list | FX-CGATE's field check | **P** [e], the review's, as B7: fail-safe defaults, decide on permission, not exclusion (D5-02, `SM`:84) | `B/STATE.md`:725-726; r57-0521 (1, CGATE) |
| D24 | A coordinator's own `status --deadman` run can take an onset's alert and put the owner's next toast back by up to `realert_runs` runs; `deadman.json` is last-writer-wins | FX-W4's dead-man, admitted for the coordinator by the hook | **G** [e], the review's (it needs a coordinator acting against brief 0c) | `B/refute/W4.md`:179-184 |
| D25 | The dry run (`predictFence`) ignores the no-start rule: it predicts `restart_charged: true` for an uncharged no-start | FX-CLAIM's dry run | **G** [e], the review's (OUT uses it for refusals only, so no joint defect) | `B/refute/CLAIM.md`:88; `B/STATE.md`:733 |
| D26 | FX-PLAN's `start-session` act has no brief place of its own | the coordinator brief and FX-PLAN's planner | **O** [e], the review's: a planned part never written | `B/STATE.md`:716-717 |
| D27 | FX-W6's `--set` accepts any flag name | FX-W6's watcher command | **G** [e], the review's | `B/STATE.md`:761; r57-0521 (1, FX-W6's review) |

### E. Faults of the design before or beside the first scripts (12, counted apart)

Classes [e]: F2 and M1 to M3 from the review's reading of their sources, F6 alike with M4, F3 to F5 from the record's
one-line entries only.

| id | the flaw | class | evidence |
|---|---|---|---|
| F1 | Restore carried post-fence output into the next attempt | P: the leader-epoch truncation of fencing missed (fixed by it) | `DR`:48 |
| F2 | A lost wake after the watcher's own urgent exit is permanent | F: the model's fix, an outside re-wake, was rejected because no outside program can start a turn (as A5) | `DR`:49; `RJ`:986-988 |
| F3 | Pause detection works only inside one live watcher | G | `DR`:50 |
| F4 | Endturn starts a second watcher | G | `DR`:51 |
| F5 | Escalation leaves the failed attempt running | P: supervision ends the child before it escalates | `DR`:52 |
| F6 | Admission does not count unstopped sessions | F, alike with M4: the slot rule assumes a stopped worker ends; the fix counts them as Kubernetes counts Terminating pods | `DR`:53 |
| M1 | Endturn kills the alarm; the kill's exit wakes the coordinator: a busy loop | G: a killed background command's exit is itself a wake, an app fact (KILL_WAKES in `AB/CEX-fence.md`) | `PV2`:936 |
| M2 | A first turn that dies before endturn leaves no wake source | P: register before testing (the lost wake-up, D3-07); both wake sources were started only at endturn, after the work | `PV2`:937 |
| M3 | A row left mid-step: the watcher never exits | P: the Mesa re-check of a due act's condition (D3-07) missed; the watcher raised events only | `PV2`:938; `SM`:53; `DR`:78 |
| M4 | Three sessions beside N_max = 2 | F: the slot rule assumes a stopped worker ends | `PV2`:939 |
| M5 | Two PC sleeps in one call count two hang ticks | P: D1-02 and D3-06 say detect a pause; the ruling deleted pause detection | `PV2`:940; `DR`:18 |
| M6 | A planned hand-over fences an attempt whose READY is written | I: a re-check, the forerunner of A1 | `PV2`:941 |

## 3. By class

| class | A | B | C | D | the 44 | added | the 56 | E |
|---|---|---|---|---|---|---|---|---|
| P proven design, step missed or changed | 7 | 2 | 0 | 3 | **12** | 4 | **16** | 5 |
| G our own glue | 1 | 4 | 1 | 11 | **17** | 6 | **23** | 3 |
| I made here where a proven design existed | 1 | 1 | 0 | 1 | **3** | 1 | **4** | 1 |
| F proven design, its assumption fails | 3 | 0 | 0 | 0 | **3** | 0 | **3** | 3 |
| O a planned part never written | 1 | 1 | 2 | 1 | **5** | 1 | **6** | 0 |
| L a clash of units, caught at landing | 0 | 2 | 0 | 0 | **2** | 0 | **2** | 0 |
| T a test that did not test (code right) | 0 | 1 | 0 | 0 | **1** | 0 | **1** | 0 |
| X a guessed value | 0 | 0 | 1 | 0 | **1** | 0 | **1** | 0 |
| total | 13 | 11 | 4 | 16 | **44** | 12 | **56** | 12 |

"Added" are A14 (P) and D17 to D27 (G 6, P 3, I 1, O 1) [c]. By where found [c]: the first scripts (A's 13) P 7, F 3,
I 1, G 1, O 1, so borrowed designs (P and F) 10 of 13, 11 of 14 with A14; the build (B and D, 27) G 15, P 5, O 2, L 2,
I 2, T 1, so glue 15 and glue, missing parts and the test 18 (20 with the two clashes); with the eleven added (38) G 21,
P 8, O 3, I 3, L 2, T 1; the plan (C, 4) G 1, O 2, X 1, no borrowed design.

How known: of the 44, 34 rest on records read [r] and 10 on reasoning for the class or the missed step (mine: A9, A11,
A12, B7, B9, D10, D13, D15; the review's: B6, D5); the twelve added are classed by the review's reasoning [e], their facts
read [r]; E's twelve [e] (section 2). A fault's second cause (the "part" in the tables) is named, not counted: F parts in
A1, A2, A3; a P part in A5; X parts in A6, D3, D5; a G part in B5. A13 reads G if its fallback is taken as our plumbing.

Where the P faults' missed steps were made: in the 2026-11-16 ruling's edits that replaced a selected step with a simpler
one (A2: edits 957 and 1094; A4: 956; A6: 959; `RJ`:955-959, `DR`:18, :64) [r], in the six model-check fixes (A8 in M2's,
A14 in M5's), in the first code (A9, A11, A12) [r], and in the build's fixes and hooks (B6, B7, D5, D13, D15; of the added
D17, D18, D23) [e].

Where they sit [c: each fault once, in the row of section 4 it belongs to]:

| row of section 4 | of the 44 | of the 56 | of E's 12 |
|---|---|---|---|
| 3 start, claim and the step machine | 3 | 8 | 0 |
| 5 failure detection | 6 | 8 | 2 |
| 14 record guard and commit check | 8 | 8 | 0 |
| 6 the wake | 4 | 7 | 4 |
| 2 fencing and outcomes | 4 | 4 | 2 |
| 10 integrity | 3 | 3 | 0 |
| 15 plan gate | 3 | 3 | 0 |
| 17 land.mjs | 2 | 3 | 0 |
| 1 locks | 2 | 2 | 1 |
| 9 records | 1 | 2 | 0 |
| 4 stop and close | 1 | 1 | 1 |
| 8 admission and budget | 1 | 1 | 2 |
| 11, 13 and 16, one each | 3 | 3 | 0 |
| no row: the clashes and the test (B2, B3, B4) | 3 | 3 | 0 |
| total | 44 | 56 | 12 |

No row holds most: of the 56, rows 3, 5 and 14 hold 8 each (14 %) and the wake 7; of the 44 the record guard holds the
most, 8 (18 %); with E's 12 (68 in all) the wake holds the most, 11 (16 %), and failure detection 10. Version 1's "14 of
the 56" counted faults in two rows and mixed E's 12 in. Session control in version 1's wide sense (start, claim, fence,
stop and wake, with their detectors and the watcher's lock) holds 10 of A's 13, all but A9, A12 and A13, and 11 of 14
with A14; rows 2 to 4 alone hold 8 of the 44 and 13 of the 56.

## 4. The inventory

Status: **whole** (the proven design used as its source states it), **adapted** (where and why), **made here**. Cost of
a replacement [c]: one fix unit = builder 32.3 M + refuter 10.6 M = **42.9 M**, medians (r57-0173); the quartile sums
give 28.5-51.4 M [c: 18.5 + 10.0 and 38.0 + 13.4], plus a root share. Lines counted on hb (`research-tree/tcb/*.mjs`
23,474 lines; `.claude/hooks/*.mjs` 1,953 lines with two test files; `tools/check-commit.mjs` 113). The Faults column
lists each fault once, in the row it belongs to (version 1 listed some in two rows); E's after "E:".

| # | Group (scripts, units) | Proven design and source | Status, where and why | Faults | Replacement, cost and saving |
|---|---|---|---|---|---|
| 1 | Locks: run.lock, watcher.lock (lib, watch; W7, S0.5) | exclusive create (D3-10), leases (Gray and Cheriton 1989, held as a selection name only) | adapted: create used whole; the lease's expiry by time replaced by judging the holder by PID and start time, which can answer "unknown"; run.lock's break is checked: renamed, then pid, start time and nonce compared (`RJ`:955; hb `lib.mjs`:1460-1466) | A11, B1; E: F4 | a lock the OS frees when its holder dies (a named pipe held by the process is the usual single-instance form) [e: whether this PC behaves so needs a small test, r57-0506]; about 1 unit, 43 M (28.5-51.4 M), with the lane; saves the stale-break class (A11, D10, D21, E1 of `DR`:64); after the pilot |
| 2 | Fencing and outcomes: epoch compare-and-set, `--ce`, staging cut, outcome log, READY copy (replace, lib, guard-hook; OUT, S0.4) | fencing token at the resource (Burrows 2006, D1-01); leader-epoch truncation (Kafka); test-and-set on write-once slots (CORFU, named by the fix, not in the record) | adapted: the file system checks no token, so scripts and the hook check it; the record selects a write-ahead log with a commit record (D2-03, D3-09) where FX-OUT built a slot log | A1, A4, A13, D15; E: F1, M6 | none better: the fixes now apply the designs; D15 closes by putting the lease act and the claim on one slot |
| 3 | Start, claim and the step machine; planners (replace, status, watch, lib; CLAIM, PLAN, CGATE) | idempotency keys and intents (Helland 2012, 2007, D1-07); state machine approach (Schneider 1990, D1-10); Kubernetes controller expectations (named by FX-PLAN, not in the record) | adapted: intents replaced by the row's steps (edit 957), so a start had no record until FX-CLAIM | A2, A3, D16, D18, D22, D23, D25, D26 | the app's own helper mechanism, where the work fits helpers: start, completion notice, result and model per helper, in real use (r57-0157); nothing to build; for that work our session control (rows 2 to 6) goes, and its faults with it (10 of A's 13, 11 of 14); its jobs go too: nothing on record gives a helper a fence after it is replaced, a restart limit or a hang detector, so those checks are dropped, not done, unless the app does them (unmeasured); costs the tree's own measurements (`B/COMPLEXITY-v1.md`:20, :26); version 2 chose it, path e2 (`B/COMPLEXITY.md`:19) |
| 4 | Stop and close; restart limit; host class (stop, replace; CLOSE) | supervision with restart limits (Armstrong 2003, D1-09); close then verify | adapted: a lease rejected because sessions neither stop at expiry nor can be killed | D4; E: F5 (A3 and M4 also touch it) | as row 3 |
| 5 | Failure detection: stall and hang counters, the progress variant V, tri-state liveness, exit markers, per-kind deadlines and the age cap, pause discount (watch, lib; W1, W6) | unreliable failure detectors (Chandra and Toueg 1996), phi accrual (Hayashibara 2004), D1-02; variant per time box (Floyd 1967, D7-07); progress-kicked watchdog (D3-06) | adapted: fixed counts per kind in place of an adaptive detector; pause detection deleted (1094), half restored (M5; A14 is the half left); the age cap an overall deadline, not renewed since the FX-W6 fix round | A6, A8, A14, B5, D1, D2, D3, D27; E: F3, M5 | deadlines from the pilot's measured calls (the plan's Q3 + 1.5 IQR method); phi accrual only once the pilot gives inter-arrival data; no build before the pilot |
| 6 | The wake: watcher, self-armed alarm with re-arm token, reconcile and endturn, act-due and its re-raise, arm-first, the armed precondition, dead-man (watch, status, handover; W2 to W5, W4) | lost wake-up and Mesa hints (Lampson and Redell 1980, D3-07); at-least-once delivery (D1-07); reference monitor (Anderson 1972, D5-04); watchdog outside the failure domain (D4-06) | **made here**: the outside supervisor's assumption, that it can start its subject's turn, fails (`RJ`:986-988; A5, class F), so the coordinator starts its own wake sources; the borrowed parts are fitted around that | A5, A7, A10, D5, D19, D20, D24; E: F2, M1, M2, M3 | no proven implementation for this app is known; whether a scheduled task, a monitor or Remote Control can begin a turn is being looked into (the piece on running without the owner); helpers avoid it (row 3) |
| 7 | Hand-over: drain, ce raise, successor nonce, W* (handover, cost) | checkpoint interval (Young 1974), square-root law (Harris 1913), D3-01, D2-04 | adapted: "the formula is derived, not borrowed" (`SM`:32) | none in the build | keep |
| 8 | Admission and budget: slots with unstopped sessions counted, the reservation, memory check (admit, lib) | load control (Denning 1968, D3-03), escrow (O'Neil 1986, D1-08) | adapted: reservation computed, never stored | D14; E: F6, M4 | keep |
| 9 | Records: commit records, the hash-chained ledger, redo, snapshots by hash, truth labels, views, fsck (commit, lib, snap, tms, render, fsck; REDO) | ARIES (D2-03); hash chains (Schneier and Kelsey 1999, D5-11); JTMS and ATMS (D7-02); hash baseline (Kim and Spafford 1994, D5-08) | adapted, written here: value logging and no replay (`SM`:31), ledger lines self-attested (`SM`:93), AGM closure fails (`SM`:121) | A12, D17 | keep |
| 10 | Integrity: the guard hook's profiles and allow-lists, witness, certify and promote, the check queue and seeds, selftest (guard-hook, witness, certify, promote, check-queue, seed, selftest) | reference monitor and complete mediation (D5-02, D5-04); Clark-Wilson (1987); error seeding (Mills 1972) | adapted: a hook sees tool inputs, not what a program does (`B/refute/P0-GATE.md`:71-90) | A9, C2, C3 (A10 and D1 also touch it) | keep; C2 and C3 are missing files |
| 11 | Evidence method and shape: protocol freeze, compare, cost law, gate (protocol-freeze, compare, cost, gate) | registered protocols (D6-07); equivalence and McNemar tests (D6-05); D3-12's fan-out law, derived here | adapted: McNemar computed conditional on the run (hb `compare.mjs`:547), since the record has one unit per arm, "treat as one reading" (`SM`:106); one law derived | C4 | keep |
| 12 | The model checker (`research-tree/model/`, 2,316 lines with the as-built model) | explicit-state model checking, TLA (Lamport 1994; Holzmann 1997), D7-06 | method whole, implementation ours; runs stop BOUNDED at their memory | none recorded | TLC: about 2 units (86 M; 57-103 M) [e] plus a Java install (rule 3); no recorded fault avoided; does not pay now |
| 13 | Tier hook and `tier-routes.json` | none; routing literature held (a1-0405; RouteLLM, a1-0322 to a1-0336) | made here, a rule table | C1 | the router piece (top session's item C) |
| 14 | Record guard and commit check (`.claude/hooks/record-guard.mjs`, `tools/check-commit.mjs`) | reference monitor, complete mediation, fail-safe defaults (Saltzer and Schroeder 1975) | adapted: mediation by parsing tool inputs and command text; it cannot see programs, paths built at run time, or other writers | B6 to B9, D6 to D9 | the OS's own protection: archived evidence read-only, journals with an append-only right, the commit check kept for hashes; no build unit [e: under 2 M for a script]; untested here like row 1: whether append-only rights hold against the tools' appends and git needs a small test; the owner sets it (a security setting: `RJ`:1014-1015); saves B6, B7, B9, D7 and the class of writers the hook cannot see |
| 15 | Plan gate (`.claude/hooks/plan-gate.mjs`) | a job scheduler with a width limit (make -j, a job server) | made here | B10, B11, D11 | keep (fixed); its "done" now follows D3-09 |
| 16 | The lane (slots for heavy commands) | counting semaphore | made here, PID-judged stale slots | D10 | first the run lock's checked break, on record and built (row 1); row 1's OS lock only after its small test |
| 17 | `land.mjs` (merge, test, undo) | merge queue (Bors, Zuul; c1-0323 to c1-0334) | adapted, local only | D12, D13, D21 | keep; D13 needs the queue's rule (never land on a failing tip); D21 the run lock's checked break, as row 16 |
| 18 | The tree's shape: packing questions into leaves (no script: `fill_factor` read by none, `plan-tree.mjs` absent, t1-0101) | B-tree and B+ tree, bulk loading at a fill factor (Bayer and McCreight 1972; D2-01, `SM`:29) | adapted and deferred by the record: the B+ parts (plan-tree bulk load, split with a separator, redistribution) moved to later (`DR`:18); an over-limit leaf is cut and listed (t1-0104), as D2-01 allows until the pilot measures key costs (`SM`:29) | none on record (the tree never ran, t1-0114) | t1-0400 (a bulk-loaded two-level tree, f computed from R) and t1-0401 (a B-link split of unstarted keys), hypotheses on quoted mechanisms; nothing to build before the tree runs |

## 5. When each answer is known

- **Class of every fault: known now, all but two.** Of the 44, 34 rest on records read [r] and 10 on reasoning about
  recorded facts; the twelve added rest on the review's reasoning. A5's class (F) waits on an app fact: whether any app
  facility other than a background command's exit can begin a coordinator turn; if one can, the outside re-wake was
  usable and A5 is I. D10's class (I, and D21's with it) waits on a small test: whether a lock the OS frees at a hard
  kill works on this PC (r57-0506). None waits for the pilot or an A/B test.
- **What the pilot adds:** how often each happens, and six app facts behind faults whose class is already known: a
  background command's exit as the coordinator's wake and real turn lengths (A5, D5); the app's session id against the
  CLI's (D4); whether a refused start leaves `start.json` (D16); what the app does with a hook that times out (D9; a
  small test, r57-0506); the call lengths per kind behind the deadlines (A6, C4); T's real length (D3, C4).
- **More literature: none needed.** Nine fixes cite sources outside the selections map
  (`research-tree/FIX-VS-SELECTIONS.md`:8-20; `S17`:250-260): FX-OUT's slot log (CORFU, Balakrishnan and others, NSDI
  2012), FX-PLAN's expectations (Kubernetes source, not a paper), FX-W5's visibility timeout and capped backoff (a
  vendor's documentation), FX-W2's register-before-testing (Birrell 1989; Lampson and Redell 1980 is in the record),
  FX-CLAIM's tombstone and partial synchrony (Dwork, Lynch and Stockmeyer 1988), FX-W6's per-operation and overall
  deadlines under partial synchrony, FX-CGATE's one-time nonce, FX-CLOSE's close then verify on a due-list, FX-W7's
  shedding of work. The library answers "not recorded" for CORFU, ControllerExpectations, a visibility timeout, register
  before testing, Birrell, partial synchrony, an overall deadline, a one-time nonce and close then verify [r: `bash
  library/lookup.sh`]; it holds tombstones only for CRDTs (x04-0312) and load shedding only from other work (a1-0319;
  x46-0351, the SRE book), not selected. None changes a class: B5 is classed from the records (O), and version 1's
  renewal of the cap, which rested on two unread sources (Gray and Cheriton's renewal, the overall deadline), is dropped
  (section 6). So none is read (r57-0014, r57-0110).
- **The open gaps:** r57-0521 (test gaps T, words, D15; of the added, D17, D23 and D25 to D27, on its End list),
  r57-0522 (D1 to D3), r57-0518 (D6 to D11). Six added faults are on neither the End list nor r57-0518 to r57-0522, only
  in their refute files: D18 to D22 and D24 [r: `B/STATE.md`:708-762]. Classes known now; D1 and D2 are glue and D3 a missing part (the
  continue act), and none of the three has a fix from the record now that version 1's gap 4 (b) is dropped; the rest is
  glue, fixed after the pilot as planned.

## 6. Before the fix round (PILOT-PLAN.md node 5)

| gap | kind of fix | what it changes in the fix round |
|---|---|---|
| 1 models | glue | none in size. Read the route from `tier-routes.json` (one table) in the start act and the Agent starts, so the router piece changes data, not code [e] |
| 2 scorer | glue (a missing part) | none |
| 3 S1 and S2 | glue (a missing part) | none (version 1's "the same role serves the complexity analysis's one plain session" is withdrawn: that analysis's version 2 dropped the single-session run, `B/COMPLEXITY.md`:265-268) |
| 4 W_quality 280 K | computed (368 K compaction - 48 K - 38 K) | none |
| 4 attempt_max_ticks | computed already: about 1.8 h, about 108 ticks at a tick a minute [c: 1.8 x 60] | a value, no code. Without round 3's PC-restart stop the seven sessions ran 0.45-1.18 h (median 1.07), and Q3 + 1.5 IQR is 1.8 h (`B/COMPLEXITY.md`:59-64); below the 240 placeholder and the plan's 630 (10.5 h, which counted the 4.3 h restart, :54). The cap stays un-renewed as the FX-W6 fix round built it: an acknowledgement does not re-arm it, and FX-W5's re-raise and `stuck` path reach the owner (`B/refute/W6-fix.md`:18-22). Version 1's (b), renewing the cap when `V_min` fell, is dropped: a hypothesis (section 8) |

Nothing else needs to move before the pilot: rows 1, 14, 16 and 17 of section 4 are robustness work for after it, rows
1 and 14 each after a small test. The complexity analysis's version 2 has chosen path e2, helpers and no child sessions
(`B/COMPLEXITY.md`:19), which has no fix round (:205): then this section applies only when the tree itself runs, and the
faults of section 4's rows 2 to 6 do not arise in the research run. Nor do their checks: a fence after a replacement, a
restart limit and hang detection are not done by our code there, and nothing on record says the app's helpers do them
(unmeasured). For the top session: that analysis's list of what path e2 loses (`B/COMPLEXITY.md`:269-273) does not name
these three; it is not edited here.

## 7. r57-0113 checked

"9 fixes use the recorded design, 5 a variant" counts 14 designs: the 13 fixes and 0b
(`research-tree/FIX-VS-SELECTIONS.md`:7-20). The verdicts follow from the table's own rows, and each key matches the map
(`SM`:11-12, :17, :31, :53, :56, :71, :84, :86) [r]. But "same design" compares the family's name, not its steps: 4 of
the 9 add parts the record does not hold (FX-CLAIM's tombstone and partial synchrony, FX-CGATE's one-time nonce, FX-W6's
per-operation and overall deadlines, FX-W7's shedding of work), and the 5 variants' named sources are in no library
record: nine fixes in all (section 5). The one built fix the model check sent back, FX-W6, is a "same design" row, and
it failed in a part the record does not hold: the continue act its step 5 needs, never written (B5). So r57-0113 stands
as a check of names and says nothing on where faults come from.

## 8. Not known

- Of the 10 classes of the 44 that rest on reasoning, the review upheld A9, A11, A12, B7, D13 and D15, did not check B9,
  and gave B6 and D5 itself; D10 waits on a small test. The twelve added, B6's and D5's new classes and F6's have had no
  refuter.
- E's F3 to F5 are classed from their titles only (`DR`:50-52), in version 1 and by the review.
- The refute files of OUT, S0.4, W5, W7 and S0.3 were scanned by the review, not read in full: more non-breaking faults
  may be there (one reason 56 is a lower bound).
- Gray and Cheriton 1989 is not read; the library holds it only as a selection name (x19-0400, x19-0435). Nothing here
  rests on its renewal rule now; the lease's expiry by time in A11 and D18 is named from the selection.
- D10's reused PID (a slot held up to 26 min) is not traced in code past `research-tree/tools/lane.mjs`:44 and :60.
- Renewing the age cap on the variant V (version 1's gap 4 (b)) is a hypothesis [e]: it needs a model run (the AGE
  configurations) and a refuter before anything is built. Against it, from the review: the cap is the bound on imitation,
  V counts ids from cards the child writes, and the cap would become a second stall detector beside the one V drives.
- What the app's helpers do about a replaced helper's later writes, about restarts and about a hang: unmeasured; a hung
  helper leaves its caller waiting, as a lost wake does. `B/COMPLEXITY.md`:269-273 does not list these as losses of path
  e2 (for the top session; not edited here).
- Whether any app facility other than a background command's exit can begin a coordinator turn (A5's class; whether row
  6 stays made here).
- Whether a named pipe held as a lock is freed at a hard kill and refuses a second holder on this PC: a small test
  (D10's class; row 1).
- Whether the OS's append-only rights hold against the tools' appends and git (row 14): a small test.
- What Windows logs for a suspend (H6), behind A14 and M5 (`S17`:536).
- Which row A3 (3 or 4), A8 (5 or 6) and A10 (6 or 10) belong to is my choice [e]; section 3's row counts move by one
  or two with it, and no row comes near most.
- Group E's other findings (protocol v2's A1 to A8, 7 extra flaws, 46 attack findings) and the refuter findings on the
  R57 fix drafts are not classified one by one; the test gaps are not counted as faults.
- The six pilot facts of section 5.

## Changes from version 1

By the review's numbers; the brief's decisions were matched to them by content (its "finding 4" is findings 4 and 5
here, "5" is 6, "8" is 9, "9" is 10).

1. A5 from I to F [r], with a P part (finding 1; decision 5): A5's row, row 6's reason, section 3; its class waits on an
   app fact (sections 0 and 5).
2. E reclassed (finding 2): F2 F, M1 G, M2 P, M3 P, and F6 F alike with M4 (my choice between the two); E now P 5, G 3,
   F 3, I 1.
3. A13 from P to F [r] (finding 3; decision 5): the first scripts' P from 8 to 7.
4. B5 from P to O [r], with a G part (finding 4; decision 2): B5's row; the lease reading of Gray and Cheriton removed.
5. Gap 4 (b), the cap's renewal on V, dropped (finding 5; decision 2): the cap stays un-renewed as the FX-W6 fix round
   built it; the renewal is a hypothesis under section 8.
6. Gap 4 (a) cites `B/COMPLEXITY.md`:59-64, 1.8 h, about 108 ticks [c], and computes nothing new (finding 6; decision 3).
7. B2 and B3 from T to L, a new class: a clash of units built side by side, caught at landing (finding 7).
8. Section 0's "21 of 27" recomputed (finding 8): on the 44 the build is glue 15 of 27, glue, missing parts and the test
   18, 20 with the two clashes; on the 56, glue 21 of 38.
9. A said as counted (merged by fix; W1 two, PLAN none); A14 and D17 to D27 added to the tables; 56 a lower bound, the
   test gaps left out and said so; every count given on the 44 and the 56 (finding 9; decision 1).
10. Helpers: the faults go, not the jobs; a fence after replacement, a restart limit and hang detection are dropped, not
    done, loss unmeasured (finding 10; decision 4): section 0, row 3, section 6, section 8; `B/COMPLEXITY.md`:269-273
    named for the top session, not edited.
11. The wake no longer "carries most" (finding 11): each fault counted once in its row; section 3's second table;
    section 0 line 6.
12. Rows 9 and 11 from "used whole" to adapted (finding 12; decision 5).
13. Row 18, the tree's shape, added; the run lock's checked break named for rows 16 and 17 (D10, D21) before an OS lock
    that needs a test (finding 13; decision 5).
14. "Every class known now" to all but two: A5 (an app fact) and D10 (a small test) (finding 14; decision 5).
15. Five fixes with sources outside the library to nine; no paper needed (finding 15; decision 5): sections 0, 5 and 7.
    Checked here: the library holds load shedding (a1-0319, x46-0351) and CRDT tombstones (x04-0312), not selected.
16. D5 from X to P [e], with an X part; B6 from G to P [e], as B7; gap 3's clause on the plain session withdrawn; row
    14's OS protection needs a small test; 43 M given with its quartile sums, 28.5-51.4 M, and row 12's 86 M with
    57-103 M (finding 16).
17. The review's "Left to do" (E's F3 to F5 from titles; five refute files scanned; Gray and Cheriton not read; D10's
    PID reuse not traced) listed under section 8 (decision 6).
18. Section 0 rewritten from the corrected figures: twelve lines answering the owner's four questions.
19. Citations corrected while folding: FX-W6's overall deadline is at `AB/FIX-wake.md`:330 and "the subject writes its
    own evidence" at :332 (the review gave :323 and :325).
