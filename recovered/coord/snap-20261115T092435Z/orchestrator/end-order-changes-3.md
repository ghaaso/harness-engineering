# Changes C18 to C27 for the last revision of END-ORDER.md

Written by the coordinator on 2026-11-15 (09:16Z to 09:30Z), after reading END-ORDER revision 2a287f0f in full as a
draft (933 lines; not accepted) and after ruling 103 (`orchestrator/coordinator-rulings-103.md`, sha256 bf8eb944...).
They continue the numbering of the last re-read (`orchestrator/final-reread.json`, C1 to C17). Sent to the lane as two
messages (C18 to C26 at 09:17Z, C27 at about 09:30Z). Stage B was complete (2,385 of 2,385 units); no selection,
report or held-out score had been read.

- **C18** (ruling 103(a), the lane's note 32). `r58c/B/rerun_check.sh`: a container reading above 3.5 GB is logged and
  reported after the check; it does not stop `kge-R1`. The 4 GB cap, the 10 GB card line, the time limit and three low
  host samples still stop it. A test with a fail-before.
- **C19** (ruling 103(b), note 33). The TEST mounts files of `ktest-r4`, `ktest-r8` and `ktest-r9` may add the rows the
  lane proposed, with three limits: the TEST file drops the step's real writable row (r4 writes to a test folder only);
  r9's TEST graph rows are seventy tuning rows (the 53 `export/graphs` folders plus 17 of `export/graphs0`), so the
  test line has the real line's row count and length, and no test mounts a held-out parent's folder; the log prints
  the difference between the TEST entry and the real entry row by row. The real `ktest-r9` flags are built once on the
  host (no container) and their length is logged.
- **C20** (ruling 103(c), note 34). The leak audit judges `ktest-eor`'s record against its list (missing or outside is
  a fail; every kept record if step 1 ran twice). `test_mounts_vs_leak_audit` expects it in scope.
- **C21** (ruling 103(d)). The empty `train/selectB` came from `r58c/B/mounts.js` line 64: `flags` creates every
  writable source, also for a test. The lane says which call it was, removes the folder with `rmdir` and records it.
  Writable sources are created only by a real launch; a test path gets nothing created, and a row with a missing
  source is left out of the test container and named in its log. `freeze_list.sh` refuses when a real output of steps
  4 to 9 already exists (the ruling lists them). A test with a fail-before on the current `mounts.js`.
- **C22**. END-ORDER 2a does not mention ruling 101(c)'s probe of three units in a row in one process: the command or
  option, where `probe.json` records it, and that its peak falls under the same report line.
- **C23**. END-ORDER 2d says "seventeen" and names sixteen; agent A's round-8 and round-9 tests (`test_heldout_r101`,
  `test_r101_real_lists`, `test_probe_seq_r101` and any other new one) are not named. A host listing in the RUNLOG
  shows that the 2d list equals the test files on disk, with every file left out named and why.
- **C24**. END-ORDER names `kge-H1P`, `kge-H1R` and `kge-H1` but not the three card-check containers of
  `r58c/A/mounts-A.json` (`kge-H1c`, `kge-H1Pc`, `kge-H1Rc`; empty lists): section 0 and step 9.1 name them, say where
  their records are saved, and that the audit fails when one shows any mount.
- **C25**. The header still says the coordinator accepts the file before stage B ends; it is before step 1. At step 3
  the lane times the first freeze check on the real list and reports it with the list's hash; section 0 says whether
  a step's limit clock includes the freeze check.
- **C26**. `KT_AS` (in `r58c/B/ktest.sh`) says it saves the container's `docker inspect`, but both records on disk are
  two bytes (`[]`): the container is gone before the inspect. Save it before the release, as `lane_step.sh` does, or
  drop the claim.
- **C27**. The protocol file is in the freeze list (`freeze_list.sh` line 68, the `# outside` block), so appending a
  ruling to section M after step 3 would fail every later freeze check. Step 3 says so: ruling 103 is appended before
  the freeze; a ruling made after the freeze lives in its own file under `orchestrator/` and in `progress.jsonl`
  only, and the coordinator appends it to the protocol after step 9.4 has finished. AUDIT.md cannot name such a
  ruling; the coordinator's report does.
