# END-ORDER: the one order the embeddings lane follows from the end of stage B to the refuter

Ruling 85 and must-fix MF-2 (`orchestrator/scoring-delta-review.json`), written 2026-11-14 by agent B of the
r58c fix round, before stage B ended. Binding inputs: rulings 81-88 (`orchestrator/coordinator-rulings-81-88.md`)
and `orchestrator/grader-interface-v2.md` (sha256 e707a878...); where a step name of the grader interface applies
it is used here. The coordinator accepts this file (its sha256 is in `r58c/READY-endorder`) before stage B ends.

Conventions used in every step:

- `LANE` = `C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings`
  (`LB` is its `/c/...` form for Git Bash). Inside a container the lane is `/w`, `EMB_ROOT=/w`, work dir `/w/train`.
- **Who**: **lane** (the lane session), **coordinator**, or **grader** (the separate grader session). Nobody does
  another party's step.
- **Stops the line** means: stop, run nothing further from this file, report to the coordinator with the log
  path and the failing line. A stop is never worked around by changing a listed file (see "The code freeze").
- **Python runs only in containers** (no python on the host). Real (non-test) Python steps run in ONE CPU
  container through `sh LANE/r58c/B/lane_step.sh <name> "<writable folders>" "<command>"` (written this round;
  graphtest-kge:1 by image ID, `--network none --pull never --cpus 2 -m 1536m`, every mount read-only except the
  named writable folders, started only when no `kge-*`/`ktest-*` runs and three memgate samples 30 s apart show
  free >= 6 GB and commit < 40 GB; it prints the full `docker run` line into its log first). Container names for
  real steps are `ktest-r<N>` (accepted by the coordinator). A `ktest-r<N>` container takes the same lane lock
  `LANE/r58c/ktest.lock` as every test container and counts in the one-`ktest-*`-at-a-time check
  (`lane_step.sh` and `r58c/B/ktest.sh` both take the lock and both refuse while any `ktest-*` runs).
- **Ruling 79's start rule** (wherever this file names it): three memgate samples 30 s apart, each with host free
  RAM >= 6 GB and commit charge < 38 GB, then the container starts.
- A **freeze check** is `sh LANE/r58c/B/freeze_check.sh` (it checks the lane block and the `# outside` block with `sha256sum -c --quiet` and the `# images` block with `docker image inspect`) and must print nothing and
  exit 0. From step 4 on, every step starts with a freeze check, and the check is part of its preconditions.
- "PASS line", "sha256 line": the RUNLOG forms the ruling-58/83 guard (`train/selectB.py` `r58_guard`) reads:
  `sha256 <64 hex> <role> <path>` and `PASS <role> <log path>`, with the log holding `sha256 <same hex>` and
  `RESULT PASS <role>`. Roles: `item27`, `heldout-driver`, `item24-adapter`, `leak-audit`, `selectB`, `report`
  (the last two added by ruling 83), plus the `PASS assemble-checks <log> tables_digest <hex>` line written only by step 1.

---

## 0. Before step 1 (already ordered elsewhere; listed so nothing is assumed)

- Ruling 87: **done and accepted.** c13 and c16 each trained twice at seed 1 (checkpoint 8b506c0dac14) in test
  container `kge-P1` with ruling 67's flags; both repeat byte for byte (RUNLOG section "Ruling 87 pre-flight").
  The coordinator recorded it in `progress.jsonl` as unit **`preflight_e4_det`** (status `accepted: ...`, file
  `r58c/preflight/rec.jsonl`, its sha256), 2026-11-14T18:57:25Z: the last sentence of ruling 67 lapses and E4 is
  deterministic everywhere. `write_result.py` reads the last `preflight_e4_det` line for its E4 statement (MF-14)
  and refuses `--final` without it.
- Agents A and B of round r58c finished; their RUNLOG sections are appended to `train/RUNLOG.md` by the lead.

## 1. The end-of-run procedure (lane)

- **Command** (host, Git Bash): `sh LANE/orchestrator/end_of_run.sh`
- **Preconditions**: the stage-B guard (since ruling 92 `orchestrator/guard-stageB-r92.sh`; `guard-stageB.sh` before
  it; both write `orchestrator/guard-stageB.log` with the same runner string) has written `stage B complete: no
  unit left` as the last state line of `orchestrator/guard-stageB.log`; no
  `kge-*` and no `ktest-*` container runs; C: has >= 10 GB free; the `preflight_e4_det` line of step 0 is in
  `progress.jsonl`.
- **What it does** (in order; each sub-step's exit code is its stop code): 1 preconditions (10, 11, 12);
  2 `guard-prelaunch.js left` = 0 (20); 3 `validate` missing=0 quarantined=0 (30); 4 memgate (13), then it
  **drops every planned `<set>_meta.json`** (ruling 82: `stageB.py assemble` skips a set whose meta exists, so
  without the drop a part redone after its set was assembled never reaches the table; 44 when a drop fails),
  then ONE CPU container: `python stageB.py assemble` (41-43), then `assemble_checks.py --train /w/train --plan
  /w/train/stageB/plan.json --report ...`; 5 validate again (50); 6 `check-tables` (60); 7 the log checks (70-73)
  and **HD-12**: the log's `e4_det1 <n> of <m> e4_parts, planned <p>` line must show n = m = p (74; every E4
  stage-B part ran with det=1, ruling 67).
- **Expected PASS evidence**: the summary `orchestrator/end-of-run/end_of_run-<STAMP>.txt` ends with
  `PASS assemble-checks orchestrator/end-of-run/assemble_checks-<STAMP>.log tables_digest <64 hex> appended`;
  `train/RUNLOG.md` gains exactly one line `PASS assemble-checks orchestrator/end-of-run/assemble_checks-<STAMP>.log tables_digest <64 hex>` (the guard requires the digest on the line to equal both the log's and the current tables');
  the log holds `assemble_checks PASS`, `sha256 <current assemble_checks.py> orchestrator/assemble_checks.py`,
  `train /w/train parts <N> planned <N> ...`, `e4_det1 ...` and `tables_digest <hex>` (ruling 82's digest: plan.json
  bytes, then per planned set the decompressed pool and unrestricted tables and the counts file).
- **Stops the line**: any non-zero exit. A quarantine at step 3 or 5 means the guard redoes the unit; rerun step 1
  from the start only after the guard again logs completion.
- **Coordinator**: records the tables digest from the PASS line: `{"step":"coordinator","unit":"tables_digest",
  "file":"orchestrator/end-of-run/assemble_checks-<STAMP>.log","sha256":"<the tables_digest>","t":"<UTC>"}` in
  `progress.jsonl`.
- **Step 1 runs again** (from the start, and the coordinator records the new digest) if any file step 1 used
  changes before step 3: `orchestrator/end_of_run.sh`, `orchestrator/assemble_checks.py`,
  `orchestrator/guard-prelaunch.js`, `orchestrator/memgate.sh`, `train/stageB.py` (and the modules it imports:
  `train/kge.py`, `train/proj.py`, `train/atomic.py`), `train/stageB/plan.json`, any part under
  `train/stageB/parts/` or any table under `train/stageB/tables/`. The freeze list of step 3 holds all of them, so
  after step 3 such a change is a freeze-check failure.

## 2. The card window, the reruns on final bytes, and the interface rehearsal

### 2a. Ruling 86(a), the probe (lane; after stage B has left the card and before the code freeze)

- **Command**: `PROBE=1 sh LANE/train/heldout.sh` (container `kge-H1P`; the probe's own options and the
  separate unit-path probe of MF-7 are agent A's; final names in `train/heldout.py`'s usage after round r58c).
- **Preconditions**: step 1 passed; no `kge-*` container runs (stage B has left the card); **ruling 79's start
  rule** for the probe container (three samples 30 s apart, free >= 6 GB, commit < 38 GB).
- **Expected PASS evidence**: `train/probe/probe.json` lists, for each of the fifteen settings, the container's
  peak memory, the process's peak memory and the card's peak reserved memory against its total, plus one
  unit-path probe (train, score, assemble, rank, pack on synthetic tasks) for the setting with the highest
  peak; `train/probe/probe.rc` is 0; `train/probe/kge-H1P-inspect.json` exists (the leak audit reads it).
- **Stop rule (ruling 86)**: a **container peak above 3.5 GB or a card peak above 10 GB is reported to the
  coordinator before anything else runs**. A failed setting (rc 3) also stops the line.

### 2b. Ruling 86(b), the rehearsal of the held-out driver in test mode (lane)

- **Command**: not final (agent A's `heldout.sh`/`heldout.py` rehearsal mode). It must run: three tuning parents
  (the smallest, one without a co_changed fact, the largest), the GPU image, the card, the 4 GB cap, test
  records for E4 (c13 or c16, deterministic), E5 and one of E1-E3, a `docker stop` in the middle of a unit
  followed by a relaunch, and a stopped leftover container before a launch.
- **Preconditions**: 2a passed (or the coordinator ruled on its report); **ruling 79's start rule** for each
  rehearsal container (three samples 30 s apart, free >= 6 GB, commit < 38 GB).
- **Expected PASS evidence**: the rehearsal writes only under its scratch folder, reads no real table and no
  held-out graph, ends rc 0 with every unit done after the relaunch, and its logs are kept (AUDIT.md lists them
  and names what it cannot cover: the real record and anchor, the 70 real graphs, wall time).
- **Stops the line**: any failure; a fix it forces is a code change, which happens HERE (before the freeze) and
  sends the lane back to 2d.

### 2c. The re-run check (lane; card window, coordinator's order of 2026-11-14 with ruling 89)

- **Command** (host, Git Bash): `sh LANE/r58c/B/rerun_check.sh` (no option). It starts ONE container `kge-R1`:
  the GPU image by ID (`sha256:a890c548...`), `--gpus all --network none --pull never --cpus 6 -m 2560m
  --memory-swap 2560m`; `train/`, `export/`, `eval/`, `orchestrator/` and `r58c/B/rerun/` read-only; the only
  writable mount is the scratch folder `r58c/B/rerun-out/<STAMP>/`. Inside, `r58c/B/rerun/rerun_check.py run
  --tree /w/train --out /w/out` trains each picked unit in a **fresh process** (one `orchestrator/rerun_unit.py`
  subprocess per unit; E4 always with `--det`, ruling 67) and compares it with its stage-B part through
  `orchestrator/rerun_compare.py`'s `compare` (ruling 68: E1-E4 the loss list, both score tables and the counts
  byte-identical; E5 both score tables and the counts). `rerun_unit.py`, `rerun_compare.py` and
  `r58c/preflight/p1.sh` are used as they are, never edited.
- **Pick rule** (fixed before any result): for each of the fifteen settings (arm x configuration of the plan),
  the unit of the **100th `done` line of that setting** in `train/progress.jsonl` (step `stageB`, in file order;
  a repeated unit counts once), so it sits deep inside the setting's long process. A done line with
  `"trained": false` (no co_changed fact; nothing was trained) passes to the next trained done line of the
  setting. **A setting with fewer than 100 done lines** (at 159 planned units per setting this happens only if
  units were never logged): the rule then picks the setting's **last trained done line**, and `picks.json`
  records the rule as `fewer than 100 done lines: the last trained done line`. A setting with no trained done
  line at all is `no unit` and fails the check (exit 3).
- **Preconditions**: step 1 passed; the card window is open (no `kge-*` container runs; the script refuses
  otherwise, exit 4); no `ktest-*` runs; `memgate.sh wait`, then ruling 79's start rule; C: >= 15 GB.
- **Stop rule**: a hard limit of 5,400 s; the card above 10 GB used or the container above 3.5 GB (ruling 86);
  three memgate low samples. Each stops `kge-R1` and is reported before anything else runs.
- **Expected PASS evidence**: exit 0; `r58c/B/rerun-out/<STAMP>/result.json` with `rc` 0, `equal` 15 and empty
  `mismatch` and `error`; `picks.json` (the fifteen picks with their rule and position, and the sha256 of
  `rerun_check.py`, `rerun_unit.py` and `rerun_compare.py`); `compare.jsonl` (one ruling-68 comparison per
  setting); `driver.log` and `host-load.tsv`.
- **Stops the line**: **any difference (exit 1), error (exit 3) or stop (exit 4) is reported to the coordinator
  before anything else runs.**
- Plumbing-tested on CPU only (`r58c/B/tests/test_rerun_check.py` in a `ktest-b<N>` container: fake trees, one
  unit trained twice through the real `rerun_unit.py`, a changed score row found as a mismatch, two mutants that
  fail). It runs on the card only in the card window.

### 2d. Every test rerun on the final bytes (lane)

- **Command**: one `ktest-<letter><N>` container at a time (the lane lock `LANE/r58c/ktest.lock`, then no
  `ktest-*` in `docker ps`, then `sh LANE/orchestrator/memgate.sh wait`), e.g. `sh LANE/r58c/B/ktest.sh ktest-b<N>
  "<tests>"` for agent B's tests and agent A's launcher for its own. All tests of both agents:
  `train/r58/tests/{test_gate, test_item27, test_verdict, test_write_result, test_counts, test_heldout,
  test_heldout_e4, test_probe, test_answer_level, test_leak_audit, test_item22}.py`,
  `r58c/tests/{test_selection_freeze8, test_r64}.py`, `fixes/tests/test_select_report.py`,
  `parallel/tests/test_assemble_checks.sh`, `r58c/B/tests/*` (`test_rerun_check.py` included) and the role wrappers
  `r58c/B/tests/role_selectB.sh`, `r58c/B/tests/role_report.sh`.
- **Preconditions**: no code change is pending; 2a, 2b and 2c passed.
- **Expected PASS evidence**: every log prints the sha256 of the bytes it tested and `RESULT PASS <name>`; the
  RUNLOG section appended by the lead holds, for each of the six roles, `sha256 <hex> <role> <path>` equal to
  the current bytes and `PASS <role> <log>`.
- **Stops the line**: any `RESULT FAIL`, a log whose sha256 is not the current bytes, a missing PASS line.

### 2e. The interface rehearsal (lane, grader, coordinator)

- **Commands**:
  1. lane: the test hand-offs agent A built under `r58c/handoff-test/` (tuning form and held-out form, from
     tuning data, test flag set); the lane gives the coordinator each `HANDOFF.json`'s sha256 (and the test
     record's sha256 for the held-out form);
  2. coordinator -> grader: those hashes; grader, **test mode**, on its fixed test task set "pick8" (8 late-50
     commits, 37 tasks): grades them and writes `LANE/grader-returns/test/tune-rank.json`, `tune-item24.json`,
     `heldout.json` (grader-interface-v2 §6);
  3. lane: `write_result.py --test` on them in a `ktest-b<N>` container (`r58c/B/ktest.sh` mounts
     `LANE/grader-returns` read-only at `/w/grader-returns`); `--test` reads the three returns from
     `/w/grader-returns/test/` when no return option is given, refuses a return taken from the real
     `grader-returns/` folder itself (exit 2), and never writes into or under the deliverable folder (exit 8):
     `python /w/train/write_result.py --test --tune <test tune.json> --item22 <test item22.json> --answer <test
     answer_level.json> --handoff <test HANDOFF.json> --item27 <test item27.json> --anchor <test progress.jsonl>
     --leak <test leak_audit.json> --plan <test plan.json> --outdir /w/r58c/B/out/rehearsal`.
- **Preconditions**: 2d passed; the grader's scorer files are hashed by the coordinator (ruling 88a).
- **Expected PASS evidence**: the grader refuses nothing in test mode; `write_result.py` exits 0 and its
  result.json carries `test: true` and the three returns' sha256; a real-mode `write_result.py` on the same
  returns refuses (test flag set). Logs kept in `r58c/B/logs/` (or the lane's chosen folder) and listed in AUDIT.md.
- **Stops the line**: any refusal by grader or write_result that the format does not explain; a mismatch is a
  format defect and is fixed HERE, before the freeze (both sides rerun 2e).

### 2f. The staging of the held-out inputs, before the freeze (lane; coordinator's order with ruling 89)

- **Commands** (agent A owns `train/heldout_inputs.js` and gives the command lines; the coordinator passes them
  into this slot; nothing here is final until then):
  1. build: `<SLOT A-1: heldout_inputs.js build command line>`;
  2. its check: `<SLOT A-2: heldout_inputs.js check command line>` (exit 0);
  3. the staging manifest, a sha256 line for every staged file: `<SLOT A-3: command line>` writing
     `<SLOT A-3 path: STAGING MANIFEST, lane-relative>`;
  4. the graphs manifest, a sha256 line for every file of `export/graphs/<sha>/` and `export/graphs0/<sha>/` for
     the 70 held-out parents: `<SLOT A-4: command line>` writing `<SLOT A-4 path: GRAPHS MANIFEST, lane-relative>`.
- **Rule (ruling 89 and the coordinator's order)**: copying and hashing is not training and not reading a graph in
  ruling 79's sense. **Nothing else opens the staging before step 7.** Nothing under `export/` is moved, changed
  or written (the graphs manifest only reads).
- **Preconditions**: 2a-2e passed; no `ktest-*` and no `kge-*` container runs.
- **Expected PASS evidence**: the check exits 0; both manifests exist, each line `<64 hex>  <path>`; the graphs
  manifest covers exactly the 70 held-out parents of `train/stageB/plan.json` (both folders each).
- **Stops the line**: any non-zero exit; a manifest with a missing parent.
- **Both manifests go into the freeze list** (step 3). **Step 7 verifies them and builds nothing.**

## 3. The code freeze (lane, then coordinator)

- **Command** (lane, host): `sh LANE/r58c/B/freeze_list.sh <STAGING MANIFEST> <GRAPHS MANIFEST> >
  LANE/orchestrator/freeze-list.txt`, then `sha256sum LANE/orchestrator/freeze-list.txt` (`freeze_list.sh`
  refuses, exit 2, unless both manifests of 2f exist). The list is `<sha256>  <path relative to LANE>` for every
  script, test and input file a later step reads: the lane's code (`train/*.py`, `train/*.js`, `train/*.sh`,
  `train/HANDOFF-FORMAT.md`, `train/stageA_configs.json`, `train/stageB/plan.json`, `train/stageA/top3.json`,
  `train/stageA/refs.json`, `train/stageA/<arm>/<cid>/meta.json` and `reps.pt` of the selected configs),
  `eval/evalcore.py`, `eval/tune_tasks.jsonl`, `eval/comparators/*`, `export/*.py`, `export/*.jsonl`,
  `orchestrator/{assemble_checks.py, end_of_run.sh, guard-prelaunch.js, guard-stageB.sh, guard-stageB-r92.sh, memgate.sh, END-ORDER.md,
  grader-interface-v2.md}`, every assembled table file `train/stageB/tables/*`, `r58c/write_audit_claims.py`,
  every test file of 2d, the `r58c/B/*.sh` launchers, `r58c/B/rerun/rerun_check.py`,
  `orchestrator/{rerun_unit.py, rerun_compare.py}`, and **both manifests of 2f** (the manifest files themselves;
  the files they name are verified against them in step 7).
  Files outside the lane (the frozen primary's options record, `build/tasks/tasks.jsonl`, the shared harness
  `arms/common/*.js`, the protocol `protocol-addendum-8.md`) are listed in a second block `# outside` with
  absolute paths, and a third block **`# images`** names both container images by ID:
  `sha256:55715543bc43c85e8426eb6934d9ba8196307b0ef0b0ccd357da85350ac97711  graphtest-kge:1` (CPU) and
  `sha256:a890c54808c11c460d910945c4bf981390f7de43c8dfc5840269b76f5861cbe7  graphtest-kge-gpu:1` (GPU)
  (`freeze_list.sh` prints all three blocks and refuses, exit 3, when either image's ID differs).
  The freeze check `sh LANE/r58c/B/freeze_check.sh` covers all three blocks (a bare `sha256sum -c` would warn on
  the comment and image lines, so it is not the check). `lane_step.sh` runs it before every real step once the list exists.
- **Coordinator**: appends `{"step":"coordinator","unit":"code_freeze","file":"orchestrator/freeze-list.txt","sha256":"<sha256 of that file>","t":"<UTC>"}` to `progress.jsonl`.
- **Coordinator, the grader's bytes**: records at this step the sha256 of the grader's file list (unit
  **`grader_frozen`**: `{"step":"coordinator","unit":"grader_frozen","file":"<the grader's file list>","sha256":
  "<64 hex>","t":"<UTC>"}`). The interface rehearsal 2e must have passed on exactly those grader bytes; if the
  grader's files changed after 2e, 2e runs again before this line is written.
- **Preconditions**: steps 1 and 2 (2a-2f) passed; no file is being edited.
- **Expected PASS evidence**: both anchor lines exist and `sha256sum orchestrator/freeze-list.txt` equals the
  `code_freeze` one; a freeze check prints nothing.
- **From now on no listed file changes without a coordinator ruling recorded in `progress.jsonl`.** A change
  without such a line voids every later step. This includes `leak_audit.py`, `selectB.py`, `report.py`,
  `answer_level.py`, `item22.py`, `write_result.py` and `r58c/write_audit_claims.py`, which run after the
  freeze (HD-10): all their edits land before step 3.

## 4. selectB, then report (lane)

- **Commands**:
  `sh LANE/r58c/B/lane_step.sh ktest-r1 "train/selectB" "python selectB.py"`, then
  `sh LANE/r58c/B/lane_step.sh ktest-r2 "train/report" "python report.py"`.
- **Preconditions**: freeze check; the guard (`r58_guard`) finds sha256 and PASS lines for all six roles and a
  current `PASS assemble-checks` line (both scripts refuse with exit 3 otherwise); `EMB_ROOT` is `/w` (the
  scripts refuse another root and every other path override in real mode, exit 2).
- **Expected PASS evidence**: `train/selectB/<arm>/choices.json` for E1-E5 and PLACEBO, each with
  `stamp` = {`plan_hash`, `plan_sha256`, `selectB_sha256`, `tables_digest`} equal to the step-1 digest;
  `train/report/tune.json` with `test: false`, `plan_hash`, `stamp` {`report_sha256`, `selectB_sha256`,
  `plan_sha256`, `tables_digest`} and `harness_check.ok`.
- **Stops the line**: a non-zero exit (3 guard, 4 assembly or stale stamp, 2 override, 7 digest differs from the
  tables read).
- **After report.py** (lane -> coordinator): the sha256 of `train/report/tune.json` and of every
  `train/selectB/<arm>/choices.json` (six files). **Coordinator**: records them (unit **`tune_report`**:
  `{"step":"coordinator","unit":"tune_report","file":"train/report/tune.json","sha256":"<64 hex>","choices":
  {"<arm>":"<64 hex>",...},"t":"<UTC>"}`) **before step 5 starts**.

## 5. The tuning hand-off and the grader's tuning check (lane, coordinator, grader; ruling 88b)

- **Command** (lane): `python answer_level.py tune ...` through `lane_step.sh` with `train/report/answer_level`
  writable (agent A's real-mode options; not final this round). It writes the hand-off
  `train/report/answer_level/handoff/` with `ranked/<variant>_pool.jsonl.gz` and `_unrestricted` for all 40
  variants (grader-interface-v2 §2).
- **Pre-check** (lane, before the hand-off goes out): agent A's check of the grader's nine refusal checks on this
  hand-off, `<SLOT A-6: precheck command line on the tuning hand-off>` (exit 0). A refusal here stops the line
  before the coordinator sends any hash.
- **Coordinator -> grader**: the sha256 of the hand-off's `HANDOFF.json`. **Grader**: verifies every listed
  file, grades, writes `LANE/grader-returns/tune-rank.json` and `LANE/grader-returns/tune-item24.json`.
- **Coordinator**: compares `tune-rank.json` `rank` with `train/report/tune.json` (late 50: per seed, seed mean
  `<ARM>_<KIND>_mean`, comparators; both scopes; four metrics) to 1e-9, and records the result in
  `progress.jsonl` as unit **`tune_rank_check`** (accepted).
- **Preconditions**: freeze check; step 4 passed and the coordinator's `tune_report` line exists.
- **Expected PASS evidence**: both returns exist with `split` tune, `test` false, the hand-off's sha256; the
  coordinator's line says every value agrees to 1e-9.
- **Stops the line**: a difference above 1e-9 stops the work until it is explained (ruling 88b); a grader
  refusal.

## 6. item27 and the coordinator's anchor (lane, then coordinator; ruling 80)

- **Command**: `sh LANE/r58c/B/lane_step.sh ktest-r3 "train/heldout" "python item27.py"` (no option).
- **Preconditions**: freeze check; step 5's 1e-9 line; `train/heldout/` holds no part and no progress line.
- **Expected PASS evidence**: `train/heldout/item27.json` and `item27.json.sha256`; the record carries
  `chosen`, `tables_digest` (equal to step 1's), `code_sha256` (CODE includes `train/report.py`), `pins`
  {relpath: sha256} (code list, `train/stageA_configs.json`, `eval/evalcore.py`, the task list, the shared
  harness files, the primary's options record) and `tuning_inputs` {relpath: sha256} (`eval/tune_tasks.jsonl`,
  the comparator tables, the candidate files) (ruling 84), `report_sha256`/`tune_sha256` and `test: false`.
- **Coordinator**: appends `{"step": "coordinator", "unit": "item27_freeze", "file": "train/heldout/item27.json",
  "sha256": "<64 hex>", "t": "<UTC>"}` to `progress.jsonl`.
- **Stops the line**: any non-zero exit (2 option or override, 3 guard, 4 assembly, 5 selectB disagrees,
  6 a held-out unit or a record exists, 7 digest differs). **A change of the chosen arm, configuration, w or
  epochs after the first anchor is never allowed** (ruling 85).

## 7. Staging, its manifest check, and the single held-out run (lane)

- **Command**: `sh LANE/train/heldout.sh` (agent A's). It **builds nothing**: it verifies the staged files
  against the staging manifest of 2f and the held-out parents' graph folders against the graphs manifest of 2f
  (both manifests are in the freeze list, so the freeze check covers their bytes), refuses on any difference,
  then launches ONE container `kge-H1`. Agent A's exact verify options go in `<SLOT A-5: heldout.sh verify
  behaviour and exit code>`.
- **Preconditions**: freeze check; the anchor line of step 6; no `kge-*` container; C: >= 15 GB; ruling 79's
  memgate (free >= 6 GB, commit < 38 GB).
- **Expected PASS evidence**: `train/heldout/heldout.rc` = 0, `train/heldout/HANDOFF.json` (with the anchor
  line copied in), `train/heldout/kge-H1-inspect.json`, the append-only launch log outside `train/heldout`.
- **Stops the line**: any non-zero rc. **Ruling 85**: "If the held-out run stops on a code defect after the
  freeze, the lane changes nothing and reports. The coordinator may then rule a fix; the record is written
  again with the same arm, configuration, w, epochs and tables digest, the coordinator anchors it naming the
  record it replaces, both records and every log are kept, and the result says so. A change of the chosen arm,
  configuration, w or epochs after the first anchor is never allowed." A stop that is not a code defect (a reset,
  a stopped container) is resumed by running the same command again; finished units are kept.

## 8. Hashes to the coordinator, then the grader (lane, coordinator, grader)

- **Pre-check** (lane, before the hashes go out): agent A's check of the grader's nine refusal checks on the
  held-out hand-off, `<SLOT A-6: precheck command line on train/heldout/HANDOFF.json>` (exit 0); it reads the
  hand-off and changes nothing. A refusal here stops the line.
- **Lane**: gives the coordinator `sha256 train/heldout/HANDOFF.json`, the item27 record's sha256 and **the path
  of the append-only launch log** of step 7.
- **Coordinator**: checks the launch log first: exactly one start line (resumes of the same record allowed: every
  start line names the same item27 sha256) and rc 0. Only then the grader gets anything.
- **Coordinator**: passes both hashes to the grader (ruling 88e: the grader takes them from the coordinator, never
  from a lane file). **Grader**: refuses a difference, verifies every file hash, refuses a test flag, the
  wrong variant or task set, a second held-out grading; writes `LANE/grader-returns/heldout.json` with `vs_RRF`
  and `literal_check` (grader-interface-v2 §6).
- **Expected PASS evidence**: `heldout.json` with `split` heldout, `test` false, `tasks` 418, `commits` 75, the
  two hashes, `literal_check` {tasks 418, task_commit_in_checkpoint_history 0, parent_mismatch 0}.
- **Stops the line**: a grader refusal; a `literal_check` count other than 0.

## 9. Leak audit, item 22, write_result, AUDIT.md and CLAIMS.md (lane)

1. **Leak audit with the containers' mount records**: `python leak_audit.py ...` through `lane_step.sh`
   (agent A's real-mode options; it reads the `docker inspect` captures `train/heldout/kge-H1-inspect.json`,
   `train/probe/kge-H1P-inspect.json` and the stage-B captures). **Evidence**: `train/leak_audit/leak_audit.json`
   `ok: true`, `test: false`, this plan's `plan_hash`; its ruling-81 disclosure text (MF-14 slot, below).
2. **item 22**: `sh LANE/r58c/B/lane_step.sh ktest-r5 "train/report" "python item22.py"` (container needs
   torch; CPU). **Evidence**: `train/report/item22.json` with `test: false`, `plan_hash`,
   `refs_sha256` (sha256 of `train/stageA/refs.json`) and every arm's `check_predict_target`; E5 fails when no
   specialist was compared.
3. **write_result**: `sh LANE/r58c/B/lane_step.sh ktest-r6 "repo:docs/program/evidence/harness-bottlenecks/graph2/embeddings" "python write_result.py --final"`
   (repository mounted at `/repo`, deliverable folder writable). **Preconditions**: all three grader returns
   exist in `LANE/grader-returns/`; item22.json and answer_level.json exist. **Evidence**: exit 0, RESULT.md
   under 150 lines, result.json with `write_result_sha256` and every input's sha256; beside each variant's figures the
   count of tasks absent from its table (ruling 91), from the tuning hand-off and HANDOFF.json (exit 10 when
   either lacks the count).
4. **AUDIT.md and CLAIMS.md**: `sh LANE/r58c/B/lane_step.sh ktest-r7 "repo:docs/program/evidence/harness-bottlenecks/graph2/embeddings" "python
   /w/r58c/write_audit_claims.py --outdir /repo/docs/program/evidence/harness-bottlenecks/graph2/embeddings"` (it takes no other option; the grader returns
   are read from `LANE/grader-returns/`, the task file from the `/build/tasks/tasks.jsonl` mount; exit codes 20-34
   named in the script's docstring; 34 = a mounted task row carries a truth-like key). **Evidence**: exit 0;
   CLAIMS.md maps every RESULT.md claim (RESULT.md reproduced by write_result.build()); AUDIT.md section 2b counts
   the mounted task rows (remove_paths rows counted as tune variants). AUDIT.md section 1
   states, beside ruling 81's disclosure, **ruling 89's per-use rule as a limit of the isolation, not a clean
   pass**: the stage-B container mounted `export/`, which holds the 70 held-out parents' graphs (mount evidence
   `orchestrator/kge-B1-inspect-20261114T190928Z.json`, sha256 052cbfa0...); stage B loads a graph only for a
   checkpoint of the plan; the audit fails if any of the 2,385 parts names a checkpoint outside the plan's 53
   tuning checkpoints, or if the frozen stage-B code opens a graph folder by any other key. The texts are read
   from the leak audit's output, `disclosure81.text` and `ruling89.text` (agent A's `leak_audit.py`); the real
   run refuses (exit 29) when either is absent. Beside them one line states ruling 90: make_plan's single read of
   the held-out parents' lineage metadata (ancestors.txt, sizes.json) is by design, listed by file and line, not
   failed (text from leak_audit.json `ruling90.text` when the audit writes one, else the protocol's paragraph 90).
- **Stops the line**: any refusal (write_result 2, 8-14; write_audit_claims 2, 20-34); the leak audit `ok: false`.

## 10. The independent audit and the refuter (coordinator)

- The coordinator starts an independent audit session and a refuter on the deliverable folder, the logs and
  the freeze list; the lane answers questions and changes nothing listed without a ruling.
- **Evidence**: their written verdicts, recorded by the coordinator in `progress.jsonl`.

---

## Names not final when this file was written

- final (not in this list any more): the ruling-87 line is unit `preflight_e4_det` (step 0, recorded and
  accepted); the coordinator's units `tables_digest` (step 1), `code_freeze` and `grader_frozen` (step 3),
  `tune_report` (step 4), `tune_rank_check` (step 5, accepted), `item27_freeze` (step 6); the `ktest-r<N>` prefix
  for real steps (accepted; it takes the lane lock); agent B's scripts and options `end_of_run.sh`, `selectB.py`,
  `report.py`, `item27.py`, `item22.py`, `write_result.py` (`--test`, `--final`), `r58c/B/lane_step.sh`,
  `r58c/B/freeze_list.sh` (two manifest arguments), `r58c/B/freeze_check.sh`, `r58c/B/ktest.sh`, `r58c/B/rerun_check.sh` with
  `r58c/B/rerun/rerun_check.py` (container `kge-R1`);
- **only agent A's command lines remain open**: the probe and rehearsal (steps 2a, 2b), the staging slots A-1 to
  A-4 (step 2f), the verify behaviour A-5 of `heldout.sh` (step 7), the hand-off pre-check A-6 (steps 5 and 8), `answer_level.py tune` (step 5) and
  `leak_audit.py` with its ruling-89 check and ruling-90 listing (step 9.1). The ruling-91 key is settled:
  `absent_tasks`, `{<variant name>: {"pool": n, "unrestricted": n}}` (`train/HANDOFF-FORMAT.md` version 2,
  revision 1b, section 1 item 10), read by `write_result.py` as `ABSENT_KEY`; any other shape is a refusal
  (exit 10). The coordinator passes the command lines in; nothing else in this file changes when they arrive.
