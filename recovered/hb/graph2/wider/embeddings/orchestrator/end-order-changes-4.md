# Changes C29 to C48 for the last revision of END-ORDER.md (from the pre-check)

Written by the coordinator on 2026-11-15 at about 09:54Z. Source: `orchestrator/precheck-result.json` (the pre-check
of the lane's code as copied at 09:24:35Z: five lenses, a refuter each, a critic; its ids M1-M7 and S1-S12 are kept
in brackets) and ruling 104 (`orchestrator/coordinator-rulings-104.md`). Each must-fix was checked by the coordinator
against the bytes. They continue C18-C28 (`orchestrator/end-order-changes-3.md`). END-ORDER 2a287f0f is a draft and
is not accepted.

## Must be made (each would stop a step, give a wrong result, or leave a gap in the isolation)

- **C29 [M1]**. `r58c/B/lane_step.sh` lines 35 and 69-70: a TEST run (`LS_PREFREEZE=test` and ` --test `) without
  `LS_MOUNTS` falls back to the real `mounts-B.json`, so a pre-freeze test container can get the real `ktest-r9`
  list with the 70 held-out graph folders, and its record goes to `mounts-test/`, which the audit never judges.
  When `TESTRUN=1`, `lane_step.sh` must require `LS_MOUNTS`, require that file to carry `"_test"`, refuse the real
  `mounts-B.json` path, and refuse any `export/graphs` or `export/graphs0` row whose parent is a key of the plan's
  `heldout.assignment`. `r58c/B/graph_rows.js test-file` refuses the set `heldout`. A host test with a fail-before.
  END-ORDER lines 55-57 ("exits 2 otherwise") must then be true.
- **C30 [M2]** (ruling 104(a)). The 2d TEST run of `ktest-r4` needs `tune_inputs/`, which 2f builds later; as written
  it exits 4. Move items 4 and 5 of 2f (the tuning staging and its check) to after the card window and before 2d's
  r4 TEST run; say so in 2d's preconditions and in 2f; the sentence "Nothing but r4 (step 5) opens the tuning
  staging" becomes "nothing but r4, in its test run of 2d and in step 5". Say also what ruling 104(a) says about a
  change of `train/heldout_inputs.js` or of the shared harness after the staging was built.
- **C31 [M3]** (ruling 104(e)). `r58c/B/e5_route_audit.py` line 58: `v['pool']['cands']` raises KeyError for a task
  whose count has no `cands` key (`train/kge.py` line 673: an unscored seed leaves the counter without it; the plan
  lists three tasks without a co_changed fact in the parent). The step would end with a traceback after the
  held-out run, and `write_result --final` would then refuse. Take the median over the tasks that have the key and
  record, per split, the number without it in `e5_route.json`; add a stand-in task with an unscored seed and one
  with no candidate to `test_e5_route_audit.py`, with a fail-before. If `write_result.py` or
  `write_audit_claims.py` checks the shape of `e5_route.json`, the new field is allowed there.
- **C32 [M4]**. Steps 2a, 2b, 2f and 3 cannot be repeated from their start: `heldout_inputs.js build` and
  `export-manifest` refuse an output that exists (lines 164 and 206). Text only: on a repeat, a staging folder that
  exists together with its manifest is kept and only verified (`check`); a folder without its manifest, or a
  manifest without its folder, is moved aside under section 0 (c) and built again; step 3 skips `export-manifest`
  when `tune_graphs.sha256` exists (`freeze_list.sh` verifies it, exit 5); 2a and 2b rely on `heldout.sh`'s own
  staging check before each launch.
- **C33 [M5]**. Section 0 (c) has no exception for step 7. Add: nothing under `train/heldout` is moved or renamed
  after a reset; `heldout.py` replaces its own half-written outputs (a renamed file in `tables/`, `ranked/` or
  `answers/` would be listed in HANDOFF.json, `train/heldout.py` lines 610-612; a renamed `progress.jsonl` would
  drop the done lines and the start lines).
- **C34 [M6]** (ruling 104(f)). Steps 9.3 and 9.4: nothing is appended to the lane's `progress.jsonl` between them;
  if something is, 9.3 runs again before 9.4 (`write_result.py` line 751 pins the file; `write_audit_claims.py`
  lines 906-912 refuse with SOURCE_HASH, exit 23).
- **C35 [M7]**. `eval/tune_commits.jsonl` is read after the freeze (step 5's staging check, `answer_level.py` line
  307, `leak_audit.py` line 602) and is not in the freeze list. Add it to `freeze_list.sh` line 45 and to END-ORDER
  step 3's list.

## Smaller points, same revision

- **C36 [S1]**. `train/heldout.sh` `save_record` keeps the FIRST record as `<name>.json` and stamps later ones, the
  reverse of `lane_step.sh` line 116 and of section 0. One convention: either `save_record` moves the older file to
  `<name>.<UTC>.json` and writes the new one as `<name>.json`, or section 0, step 7's evidence and the 9c label at
  `write_audit_claims.py` line 829 state the difference.
- **C37 [S2]** (ruling 104(c)). Step 7's memory paragraph names the evidence as it really appears: `heldout.rc`
  137 with the launch-log line `finished kge-H1 rc=137` (the container itself exits 0); rc 2 with "N unit(s)
  failed" and what the failed units' errors must be; rc 1 with the packer's failure and no error text; everything
  else waits for the coordinator.
- **C38 [S3]**. Section 0 (f) also names `kge-H1`, `kge-H1c`, `kge-H1P`, `kge-H1Pc`, `kge-H1R` and `kge-H1Rc` as
  leftovers whose logs are saved and which are then removed (`kge-H1c` has no `--rm`; a leftover blocks the lock).
- **C39 [S4]**. Section 0's list of `lane_step.sh`'s own exit 4 is wrong: the lock never gives 4; the image ID, a
  leftover container of the same name, the start rule not met in 80 samples, a failed `docker run`, a failed
  inspect save and a failed release do.
- **C40 [S5]**. Step 6 names record fields as they are: `stamp_tune.tune_sha256` and `stamp_tune.report_sha256`;
  `chosen` is compared with `tune.json` `choices[<arm>].final_all65` (config, w, mean) for every arm, and the arm
  is the one ruling 57's rule gives on those five means. The coordinator's script `orchestrator/coord_checks.js
  item27` does this; the text may point at it.
- **C41 [S6]**. Step 1: name `end_of_run.sh`'s exits 2 and 40; correct its comment at line 26 (the metas are
  already dropped before 45/46); the PASS evidence line "ends with" the PASS text (it carries a time prefix).
- **C42 [S7]**. `kge-H1R` mounts `r58c/A` whole, agent A's logs included, against END-ORDER lines 70-71. Narrow the
  row to what `rehearsal.py` needs, or state the exception (a rehearsal container is a test container) in section
  0 and in `test_freeze_check.sh` case 15.
- **C43 [S8]**. AUDIT.md 9c's export note lists `ktest-r3`, `ktest-eor` and `ktest-r10` as graph readers; list file
  pins (`checkpoints.py`, `parents*.jsonl`) apart from graph folders (`write_audit_claims.py` lines 599-600 and
  833-835).
- **C44 [S9]** (ruling 104(g)). Step 10's text: the coordinator's audit also checks the records of `ktest-r10`,
  `ktest-r5`, `ktest-r11` and `ktest-r6` against their lists.
- **C45 [S11]**. `ktest-r8` and `ktest-r9` build a graph per parent; "JSON only, seconds" is wrong for them. Set
  `LIMIT_R8` and `LIMIT_R9` to 3600 s, and write the measured time and peak memory of their TEST runs into the
  limits table. If a peak is above a third of the 1536m cap, tell the coordinator before the last revision.
- **C46 [S12]**. `train/heldout.py` lines 22-23: the docstring says the LAST `item27_freeze` line; the code requires
  exactly one. Correct the docstring.
- **C47** (ruling 104(d)). Step 1's quarantine paragraph: the lane reports to the coordinator before it restarts
  the guard.
- **C48**. Two notes on earlier changes. C21 must reach every caller of `mounts.js flags`: `lane_step.sh` line 71
  (create only when `TESTRUN=0`), `ktest.sh` line 55 (never), `orchestrator/end_of_run.sh` line 155 and
  `rerun_check.sh` line 56 (real launches, which keep creating), and `test_freeze_check.sh` case 9 and
  `test_kt_as.sh` follow. C23's listing walks `fixes/`, `parallel/`, `r58b/`, `r58c/`, `orchestrator/` and
  `train/r58/tests`, not only `r58c/`. Ruling 104(b): the r9 TEST line's check is "at least", not "equal".

## Checked by the coordinator, nothing to do

- A real card container's saved record shows only its bind rows (the stage-B capture of 07:31Z has three); the card
  adds none. Neither image sets a `GT_*` variable. The late-50 parents of `eval/tune_tasks.jsonl` equal those of
  `eval/tune_commits.jsonl` (38; no task's parent differs from its commit row). `7b3a7452` is the largest tuning
  checkpoint by triples in both graph folders.

## Added at 09:59Z with ruling 105 (text only)

- **C49** (ruling 105, `orchestrator/coordinator-rulings-105.md`). Step 1, after its PASS line: the coordinator counts
  the score rows of the assembled tables whose score is not a finite number (`orchestrator/coord_checks.js nonfinite
  train/stageB/tables`) and records the line `nonfinite_tables`; the lane waits for that line before the card window;
  a count that is not zero stops the line until the coordinator has ruled. Step 8, before the hashes go to the
  grader: the coordinator takes the same count over `train/heldout`; a count that is not zero changes nothing in the
  run and is stated in the result. The lane says whether `write_result.py` can carry one sentence for it within 150
  lines or whether it goes to AUDIT.md only.

## Added at 10:41Z, after agent A's report on memory at full size

- **C50**. `train/heldout.sh` hard-codes `-m 4g --memory-swap 4g` for `kge-H1`, `kge-H1P` and `kge-H1R` (lines 59, 61,
  63). Agent A's stand-in on a processor (one E4 c13 unit at the largest held-out size: process peak 3,031.9 MB,
  container peak 3,661.2 MB under 4g) is not the card's figure, but it shows the cap may be close. So that a cap
  decision after the real probe needs no change of a file (which would force 2d again in full), the launcher takes
  the cap from `H1_CAP`: default `4g`; it accepts `4g`, `5g` and `6g` only and refuses anything else with exit 8;
  the value goes into both `-m` and `--memory-swap`, and the launch log's start line shows it. A host test (DRY) for
  the default, for `6g` and for a refused value. END-ORDER 2a, 2b and 7 say: the cap is 4g unless a coordinator
  ruling recorded before the freeze names another; the lane then sets `H1_CAP` as that ruling says, for the probe
  as for the real run. Nothing else in ruling 79's start rule changes.
- The three-units-in-a-row figure of ruling 101(c) is taken in the real probe on the card (`probe.json`
  `units_in_a_row`), not in a test container; the stand-in figure above is recorded as a stand-in.
- `heldout.sh` holds the lane lock for the whole held-out run: accepted (nothing else runs during step 7).
- The TEST record and the three TEST hand-offs still pin older bytes: the formal 2d and 2e rebuild them and the
  coordinator grades them again, as planned.
- Agent A's one container outside the launcher (`docker run --rm ... python -m py_compile`, before ktest-a53): its
  exact command line with every `-v` flag, its time and its exit go into `r58c/A/RUNLOG-A.md` and to the coordinator.
