# OUT result (FX-OUT: the outcome log and the READY fence; FIX-fence.md section 1)

- **Branch** `u/OUT`, **final commit `e38717a3`** (parent ec3b04fd). Built by the first helper (stopped at its
  330 K checkpoint, `units/OUT/checkpoint.md`); the successor ran the tests. No test failed, so nothing was fixed
  and no commit followed: the commit message's "tests not yet run" is the state at that commit, this file records
  the runs. Files: `tcb/lib.mjs`, `guard-hook.mjs`, `replace.mjs`, `commit.mjs`, `watch.mjs`, `status.mjs`,
  `fsck.mjs`; CONTRACT 3.12, 3.23, 4.6; the specs of those scripts and `spec/briefs.md`; the READY line in
  `tcb/briefs/child.md`, `fmea.md`, `fresh-reviewer.md`, `mapper.md`, `stpa.md`, and section 5a of
  `coordinator.md`; six test files.
- **Tests**, through MAIN's lane with `--test-reporter=tap`, from the worktree's `research-tree/`:
  - `OUT-lib-commit` (38.3 s): lib.test.mjs 194 tests, 192 pass, 0 fail, 2 not-run (T82, T92, need the app);
    commit.test.mjs 36 tests, 35 pass, 0 fail, 1 not-run (N1, needs the app).
  - `OUT-replace-fsck` (42.0 s): replace.test.mjs 86 tests, 84 pass, 0 fail, 2 not-run (NA1, NA2);
    fsck.test.mjs 21 tests, 21 pass, 0 fail, 0 not-run.
  - `OUT-watch` (53.5 s): watch.test.mjs 69 tests, 65 pass, 0 fail, 4 not-run (NA1-NA4).
  - `OUT-status` (45.4 s): status.test.mjs 32 tests, 30 pass, 0 fail, 2 not-run (NA1, NA2).
  - `OUT-guard-hook` (19.9 s), from the detached checkout `C:/Users/User/Documents/projects/hx-OUT` of e38717a3
    (removed after): guard-hook.test.mjs 23 tests, 20 pass, 0 fail, 3 not-run (needs-app 1-3).
  - The 7 new tests all pass: guard-hook FX-OUT 1, FX-OUT 2 and FX-OUT hook clock (the hook run as a process
    under a 2000 ms preload: the write budget counts from the process start; S0.4 refuter M25); replace FX-OUT 3
    and FX-OUT 4 (F1); commit FX-OUT 5 (F7); fsck FX-OUT 6. Changed tests: commit T15 (departure 4); replace T5
    and T5b put a ready slot; the READY helpers of commit, watch and status also write the slot.
  - Per-file counts are split from one TAP log per lane call by test name. The first helper's lane call
    (OUT-lib-commit, without `--test-reporter`) also exited 0 (lane log); its `# pass` filter found nothing
    because node 24 then prints the spec reporter.
- **What is built.** lib: `outcomeSlotBytes`, `outcomeState` (R-a fenced, R-b ready steps not in `row.commits`,
  R-c and the other tamper reads), `outcomeAppend` (fenced first, the check on every read, identical, create at
  the first free j, read again on a lost name). The hook: a READY Write becomes one ready slot (Edit denied, a
  bad or foreign READY `ready-invalid`, a repair marker passes with no slot, a fenced log `attempt-fenced`).
  replace: the ready check reads the log (lib.fence's callback); the fence writes one fenced slot (none for a
  first fence, a cut or drop without an attempt, an attempt never admitted (H1), a refused fence, a dry run, or
  an attempt without `outcome/`);
  `start` makes `outcome/`. commit: no ready slot 2 `no-ready`, a fenced log 1 `attempt-fenced`, no ready slot
  for the step or later 1 `ready-mismatch`. watch class 11 and status `readyPending` read the log; fsck check 10
  `outcome`.
- **Departures:** `research-tree/build/departures/OUT.md` (7 items: class 12 and the zombie-write telemetry
  still read READY.json; the skeleton test's `const stubs` line, a landing conflict with W1 and CLAIM expected,
  resolve as the union of removals; status `ready-unparseable` became `outcome-tamper`; commit T15's epoch-1
  READY now exits 2; more than R-c is tamper; two shared lines left; selftest not run).
- **Not done:** CONTRACT 3.6's row text, guard-hook.mjs header line 8 and `spec/status.mjs.md` line 62 (shared
  lines, departures 3 and 6); no status test asserts the `outcome-tamper` anomaly; selftest.test.mjs not run;
  the full suite is the root's.
- **Tokens:** first helper `build-invariant: OUT outcome log and READY fence | calls 95 | tokens 20.64 M |
  context now 331.8 K`; successor `build-invariant: OUT successor, tests and result | calls 42 | tokens 3.81 M |
  context now 131.3 K` (before this file). Unit about 24.5 M of its 29.2 M.
