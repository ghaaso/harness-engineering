# Changes C51 to C67 for one more revision of END-ORDER.md (from the check of the changed bytes)

Written by the coordinator on 2026-11-15 at about 11:39Z. Source: `orchestrator/delta-check-result.json` (the check of
the bytes changed between the coordinator's 09:24:35Z copy and the lane's revision of 11:14Z, END-ORDER ad45731a: four
lenses, a refuter each, a critic; its ids are kept in brackets), the lane's notes 35 to 38 and drafts T1 to T3, and
ruling 106 (`orchestrator/coordinator-rulings-106.md`). Each item was checked by the coordinator against the bytes.
END-ORDER ad45731a is NOT accepted. They continue C18-C50. Line numbers are those of ad45731a and of the final bytes
of 11:14Z.

## Code (each with a fail-before; before bytes kept)

- **C51 [W1]**. `r58c/write_audit_claims.py` lines 375-376: the claim for item 22's E5 row has no branch for a
  specialist that `item22.json` holds only as a `note` (`train/item22.py` lines 211-212). `train/write_result.py`
  line 612 prints `not compared (no co_changed)` for it (SR-8), but the claim looks for `<n>/<n> identical`, so the
  claim is lost and the real run of step 9.4 refuses with CLAIM_NOT_IN_RESULT (exit 24), after the held-out run.
  Mirror `write_result.py` line 612 in the claim. A test case in `test_write_audit_claims.py` with one note-only E5
  specialist, with a fail-before on the current bytes.
- **C52 [T7]**. `r58c/B/freeze_list.sh`: step 3 says every test file of 2d is frozen, but the list has no
  `r58c/A/*.js` (2d runs `r58c/A/test_sums_filter.js`) and not `r58c/B/graph_rows.js` (the gate of the step
  launcher's test runs). Add `r58c/A/*.js` and `r58c/B/*.js` to block 1, and the three test files of ruling 106(a)
  (`fixes/tests/test_r53_58_unit.py`, `fixes/tests/test_r64.py`, `fixes/tests/test_e5_equiv.py`). Step 3's text
  names them.
- **C53 [A1]**. `train/leak_audit.py` line 474 (`R94_CARD_SAVED`, printed into the audit's ruling-94 text and from
  there into AUDIT.md) and the comment at line 471 state the reverse of C36: the NEWEST record is `<name>.json` and an
  older one is moved to `<name>.<UTC>.json`. Correct the sentence.
- **C54 [W4, and the coordinator]** (ruling 106(d)). `train/heldout.sh`: `card_ok` ignores `save_record`'s return
  (line 92), and a main container whose record cannot be saved runs to its end and then exits 3 with "the leak audit
  will fail on it" (lines 151 and 165 of the 11:14Z bytes): both leave a missing record that fails the leak audit
  after the held-out run. `save_record` tries three times, 2 s apart; if the card check's record still cannot be
  saved, the card check container is removed and `card_ok` fails (nothing is launched); if the main container's
  record cannot be saved while the container runs, the launcher stops the container at once and exits 3 ("rerun to
  resume"). A container that ended by itself before the record could be taken (a fast refusal) is reported as now.
  The same for the probe and the rehearsal. A host test with a stub docker whose `inspect` fails.
- **C55 [L3]**. `r58c/B/ktest.sh` line 57: with `KT_AS`, the rows that `mounts.js` leaves out are named only on the
  terminal. Ruling 103(d) says they are named in the log: capture the lines and write them to the launch log, as
  `lane_step.sh` lines 105-106 do.
- **C56 [W5]**. `r58c/write_audit_claims.py` lines 619-620: the pattern for kept records in AUDIT.md 9c does not
  match the names `<name>.<UTC>-1.json` that `heldout.sh` `save_record` gives when a name is taken. Allow
  `(-[0-9]+)?` before `.json`.
- **T2-0** (ruling 106(a); agreed at 11:32Z and 11:35Z). `r58c/B/tests/kt_inner.sh`: only the three routes
  (`test_r53_58_unit`, `test_r64_fixes`, `test_e5_equiv`) and the sha256 lines of the files under test; no measuring
  block. One measured run of `test_e5_equiv` through a new case of `r58c/B/timing/mem.sh`, its figures in RUNLOG-B.

## Text and records

- **C57 [T2, T1]**. `train/RUNLOG.md` lines 907-909 still name ktest-b98 as the cause of the empty `train/selectB`
  and promise an identification that never follows. Append the identification (the host look-up `node
  r58c/B/mounts.js flags ... ktest-r1` at 08:13:00.744Z, no container) and withdraw the ktest-b98 sentence. END-ORDER
  lines 55-56 and `r58c/B/RUNLOG-B.md` line 259: the lane session removed the folder, not the coordinator.
- **C58 [T4]**. 2d's TEST commands (END-ORDER lines 557-558) cite a form for the `memory.peak` read that is written
  nowhere. Write the exact form the r8 and r9 TEST runs used, which keeps the command's exit code: `<command> ; rc=$?;
  echo cgroup_peak_bytes $(cat /sys/fs/cgroup/memory.peak 2>/dev/null || cat
  /sys/fs/cgroup/memory/memory.max_usage_in_bytes 2>/dev/null); exit $rc`.
- **C59 [T3]**. END-ORDER lines 561-562 say the r8 and r9 TEST runs "ran before the card window"; lines 566-569 say
  the formal 2d rebuilds the hand-offs before them. Say both: they ran once before the card window (interim figures
  in the limits table) and run again in the formal 2d after the TEST record and hand-offs are rebuilt (q31).
- **C60 [T-M1, T8]**. The header (lines 8-10) names C29-C48 and ruling 104 only. It names C18-C67, rulings 103 to 106
  (all at the end of section M before the freeze) and the before-bytes folders up to the newest. Line 518: drop
  "ruling 105's" before `test_h1cap_r105.sh` (C50 came from agent A's memory report). Step 3's sentence on the
  protocol names rulings 103 to 106.
- **C61 [T6]**. Three wrong pointers: "`heldout.sh` lines 113 and 117" (line 358), "its checks 1 to 8" for
  `coord_checks.js item27` (line 871; it has checks 1 to 10), "27 checks" (line 1009; 42).
- **C62 [T5]**. END-ORDER lines 326-327, 399 and 415 give earlier sha256 values of `heldout.py`, `heldout.sh` and
  `leak_audit.py` in the present tense. Mark them as that round's values or give the current ones.
- **C63 [W3, T3 of the drafts]**. Step 8: the coordinator always records the line `nonfinite_heldout`, also for a
  count of 0; `seeds` and `parents` are required lists (empty when the count is 0) and the parents are lowercase
  hex. The words "may be recorded or left out" go.
- **C64 [W2]** (ruling 106(f)). Step 9.4's sentence "CLAIMS.md maps every RESULT.md claim" names what is mapped and
  what is carried as text without a pointer into the grader's return (the held-out differences to RRF with their
  intervals, the literal check, the grader's totals), and that the coordinator's audit compares those lines with the
  return itself. No claim row is added.
- **C65 [A2]**. 2a: under a ruled cap the probe's report line stays 3.5 GB and `probe.json` still says the cap is
  4 GB (`train/heldout.py` lines 103 and 845); the cap in force is read from the launch log's start line, and a
  repeat that exits 4 again is judged by the coordinator on its report.
- **C66 [T9]** (ruling 106(e)). Step 8: the coordinator's script checks that every start line of the launch log
  shows the 4 GB cap or the ruled one (`coord_checks.js heldout-start --cap`).
- **C67** (rulings 106(b), (c), (d)). Section 0 names the three rules: what the ordinary test containers mount and
  that the coordinator checks the saved records of the step launcher's test runs before it records the freeze; that
  a missing log line is reported and not interpreted (step 1 excepted); that no container runs on without its saved
  record. 2d names the three tests of ruling 106(a) (T2-a, T2-b, T2-c of the lane's draft).

## Not ordered (read, and left as they are)

- [L1] The gate `graph_rows.js test-check` refuses exact spellings only. No code change: the coordinator checks the
  saved records of the step launcher's test runs before the freeze (ruling 106(b)).
- [L2] `KT_AS` accepts any step's entry. No change: the ordinary test containers mount the export folder whole in any
  case (ruling 106(b)); 2d uses `KT_AS=ktest-r1` only.
- [W6] RESULT.md does not print `without_cands`; it is in `e5_route.json`, and the coordinator's report states it.

## Checked by the coordinator, nothing to do

- Neither image declares a volume, and a real card container's record shows only its bind rows, so a card check's
  record has no mount. Real records on this host give sources in the `C:/` form, which `record_check.js` and the
  leak audit both read. The score column the coordinator's count reads is the third, as `eval/evalcore.py` writes it.
  The r8 and r9 TEST runs kept their commands' exit codes (their logs show the form of C58).

## Added at 12:31Z for a text-only revision (ruling 107; END-ORDER 9d779b5d is not accepted)

The coordinator compared the lane's revision of 12:26Z (END-ORDER 9d779b5d, FINAL-CHANGED 21853c11) with its copy of
the 11:14Z bytes (20 files changed, 4 new, none removed), read every changed line of code and of the order, and found
C51 to C67 made as ordered; every shell and node script the order runs parses. Three text points remain:

- **C68** (ruling 107(a), the lane's note 40). 2d does not run `fixes/tests/test_r53_58_unit.py`: its guard case
  states the guard as it was before ruling 83. 2d names `test_r64_fixes` and `test_e5_equiv` only, with that reason
  and the record of the three ruling-53 cases (ktest-b112, its log's sha256, the selection script's sha256); TEST-QUEUE
  q32 runs those two; the C23 listing follows. If `train/selectB.py` changes before the freeze, the lane reports
  before 2d. The route in `r58c/B/tests/kt_inner.sh` and the line in `r58c/B/freeze_list.sh` stay as they are: no
  code file changes in this revision.
- **C69**. Section 0, "No container runs on without its saved record": the sentence runs into "`train/heldout.sh`
  `save_record`, C54: ..." without its opening bracket.
- **C70**. The header and step 3 name rulings 103 to 107 and C18 to C70; notes 39 and 40 are marked ruled (note 39:
  no change, ruling 107(b)).
