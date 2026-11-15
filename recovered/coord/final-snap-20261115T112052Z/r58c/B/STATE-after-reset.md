# Agent B, round r58c: state after the 2026-11-14 hard reset (written about 22:40Z)

Windows was last alive at 21:45:25Z. Read from disk, not from memory.

## 1. The files on disk against what was last recorded

The record is `r58c/B/RUNLOG-B.md` as written at 21:35Z, 41 files.

- **Unchanged, 34 files.** Their sha256 equals the record.
- **Changed after the record and before the reset, 7 files** (21:37-21:40Z, the MF-12 alignment below). Each matches
  the sha256 computed right after its patch:
  - `train/write_result.py` b5f7ae1c
  - `train/r58/tests/test_write_result.py` 5aaa641d
  - `r58c/write_audit_claims.py` (pin)
  - `orchestrator/END-ORDER.md`
  - `r58c/B/CONFLICTS.md`
  - `r58c/B/INTERFACE-for-A.md`
  - `r58c/B/pre-mf12/write_result.py`
- **Torn writes: none found.**
  - No NUL byte in any owned file.
  - Every Python file ends with its `__main__` block intact.
  - Every `.sh` passes `sh -n`, and every `.js` passes `node --check`.
  - The patched Python was read by eye, because there is no host python.
- **Running at the reset:** ktest-b18 (role report p2). It never started: its launch log shows it waiting on the lock
  from 21:38Z until 21:41:56Z. No ktest-b container of mine ran or was left behind. No launcher process of mine
  survived the reset.

The files changed after the reset, and their final sha256, are in `r58c/B/RUNLOG-B.md` (58 files).

## 2. What changed after the reset

1. **MF-12, finished.** `absent_tasks` is read in HANDOFF-FORMAT v2 rev 1b's shape:
   `{variant: {pool, unrestricted}}`.
   - Any other shape is refused (exit 10).
   - Cells print `pool/unrestricted` per seed.
   - CONFLICTS note 5.
2. **The start race** (coordinator item 2).
   - `r58c/B/race_gate.sh` is sourced by `ktest.sh`, `lane_step.sh` and `rerun_check.sh`; `end_of_run.sh` has the
     same logic inline.
   - The container's command is held until `/tmp/go`. The launcher looks right after the start and again 3 s later,
     and releases the command only when both looks are clean.
   - On a twin, the launcher removes its own unreleased container (which has run nothing) and retries.
     `end_of_run.sh` exits 11 instead.
   - CONFLICTS notes 6 and 7.
3. **Ruling 93.**
   - END-ORDER step 1 names `guard-stageB.sh` (59d3fb8e) as the running guard. The r92 copy's units stand.
   - Both guards stay in the freeze list (`freeze_list.sh` unchanged).
   - `kt_inner.sh` keeps scratch by default; `DROP_OUT=1` deletes it.
4. **Agent A's command lines** are in END-ORDER steps 2a, 2b, 2f, 3, 5, 7, 8 and 9.1. No slot is left open.
   - `lane_step.sh` now mounts the facts at `/build/facts/cache` (CONFLICTS note 8).
   - The rehearsal parents' full shas came from `r58c/B/frozen/plan.json`.
5. **`ruling92.text`** (leak_audit.py 629c0df3) is printed:
   - in RESULT.md, on the leak-audit line, so RESULT.md stays at 147 lines;
   - in AUDIT.md section 1, after ruling 90.
   - The write_audit_claims pin now names write_result a8135e3d.

## 3. MF items and rulings

**Done in code, with a test that fails on the before bytes. Status of each test:**

| Item | Where | Test status |
|---|---|---|
| MF-1 | exit 7 on drift | queued, p2 (its check is in test_write_result.py, which changed) |
| MF-4 | mf4 | passed (ktest-b17) |
| MF-5 | real-input refusals | queued, rerun with p2 |
| MF-8 | no test reads a real table | passed |
| MF-12 | write_result keys against grader-interface-v2 and the format | queued, p2 |
| MF-13 | tune.json and item22 records | queued, p2 |
| MF-14 | AUDIT/CLAIMS writer, section 2b | queued, p2 |
| Rulings 82, 83, 84, 87 | | passed, unchanged since |
| Ruling 89 / 90 lines in AUDIT.md | | queued, p2 |
| Ruling 91 shape | | queued, p2 |
| Ruling 92 text | | queued, p2 |
| Start race, ktest/lane_step/rerun_check | | PASS (host) |
| Start race, end_of_run | | queued, test_end_of_run |

**Partial:** nothing in code. What is left is only the queued container tests in `r58c/B/TEST-QUEUE.md`.

## 4. Test logs that show RESULT PASS on the CURRENT bytes

- `r58c/B/logs/test_race_gate.log`: RESULT PASS race-gate, 13 checks, 22:31Z, host, fake docker.
- `r58c/B/logs/test_freeze_check.log`: RESULT PASS, 17 checks, 22:31Z, host.
- The pre-reset logs whose tested and imported bytes are unchanged:
  - role report p1 (`role_report.p1.log`);
  - `test_item27.log`, `test_rerun_check.log`, `test_assemble_checks.log`;
  - the mf4 logs.

**Not current:**

- `role_selectB.log`: test_gate imports leak_audit, which changed to 629c0df3 after the log.
- `role_report.p2.log` and `role_report.log`: the writers and their tests changed.
- `r58c/B/logs/test_end_of_run.log`: end_of_run.sh changed.

All of these are in TEST-QUEUE.

## 5. One incident after the reset

My first run of `test_race_gate.sh` (22:20-22:23Z) had a path-rewrite bug: MSYS converted the `/c/...` arguments it
passed to node. As a result its ktest.sh copies took and freed the **real** `r58c/ktest.lock` and ran the real
memgate.sh. Its lane_step copy then **held the real lock from 22:21:25Z to 22:23:15Z**, and I removed it by hand.

- Every docker call went to the fake. **No container started.**
- The `ktest-b99` lines in `r58c/B/out/logs/ktest-launch.log` are those runs, with a note appended there.
- Fixed in the test: `MSYS_NO_PATHCONV=1` plus `cygpath -m` for the file paths, and a guard that refuses to run any
  copy whose `W=`, `WB=` or `WD=` lines do not name the copy.
- The second run left the real lock, the launch log and lane-steps untouched (checked).

## 6. Revision after the coordinator read END-ORDER 1cdcb6e7

- Every launcher now refuses an empty or non-numeric memgate sample before `memgate.sh wait`:
  - ktest.sh, lane_step.sh and rerun_check.sh exit 9;
  - end_of_run.sh exits 14.
  - The name in both cases is MEMGATE_EMPTY.
- The before bytes are in `r58c/B/pre-memgate/`.
- END-ORDER gained:
  - the reset paragraph in section 0;
  - the step-6 checks the coordinator makes before the anchor;
  - the 2c clause (losses, score tables, counts; no reps). It already matched rerun_compare, so no script change.
- Because the launchers changed, the host logs of `test_race_gate.sh` and `test_freeze_check.sh` are no longer on the
  current bytes. They are queued again in TEST-QUEUE, with the new `test_memgate_empty.sh` and case M of
  `test_end_of_run.sh`. None of these was run.
