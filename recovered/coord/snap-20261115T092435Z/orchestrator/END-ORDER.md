# END-ORDER: the one order the embeddings lane follows from the end of stage B to the refuter

Ruling 85 and must-fix MF-2 (`orchestrator/scoring-delta-review.json`), written 2026-11-14 by agent B of the
r58c fix round, before stage B ended. Binding inputs: rulings 81-88 (`orchestrator/coordinator-rulings-81-88.md`)
and `orchestrator/grader-interface-v2.md` (sha256 e707a878...); where a step name of the grader interface applies
it is used here. The coordinator accepts this file (its sha256 is in `r58c/READY-endorder`) before stage B ends.
**Last revision** (round 8, agent B, 2026-11-15): the changes C1-C17 of `orchestrator/final-reread.json` with
rulings 99-102 (`orchestrator/coordinator-rulings-99.md` .. `-102.md`, all at the end of the protocol's section M);
the before bytes are `r58c/B/pre-r101/END-ORDER.md`; the table item -> file:line -> test log is in
`r58c/B/RUNLOG-B.md` (round 8).

Conventions used in every step:

- `LANE` = `C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings`
  (`LB` is its `/c/...` form for Git Bash). Inside a container the lane is `/w`, `EMB_ROOT=/w`, work dir `/w/train`.
- **Who**: **lane** (the lane session), **coordinator**, or **grader** (the separate grader session). Nobody does
  another party's step.
- **Stops the line** means: stop, run nothing further from this file, report to the coordinator with the log
  path and the failing line. A stop is never worked around by changing a listed file (see "The code freeze").
- **Python runs only in containers** (no python on the host). Real (non-test) Python steps run in ONE CPU
  container through `sh LANE/r58c/B/lane_step.sh ktest-r<N> "<command>"` (two arguments; graphtest-kge:1 by image
  ID, `--network none --pull never --cpus 2 -m 1536m` (`ktest-r4`: `-m 4g --memory-swap 4g`, see the limits table), started only when no `kge-*`/`ktest-*` runs and three memgate
  samples 30 s apart show free >= 6 GB and commit < 40 GB (`ktest-r4`: ruling 79's start rule, commit < 38 GB); it prints the full `docker run` line into its log
  first). Container names for real steps are `ktest-r<N>` (accepted by the coordinator). A `ktest-r<N>` container
  takes the same lane lock `LANE/r58c/ktest.lock` as every test container and counts in the
  one-`ktest-*`-at-a-time check (`lane_step.sh` and `r58c/B/ktest.sh` both take the lock and both refuse while any
  `ktest-*` runs). **Every** `ktest-*` container, tests included, starts only after the same 6 GB rule (three
  samples 30 s apart, free >= 6 GB and commit < 40 GB): `r58c/B/ktest.sh`, `r58c/A/ktest.sh` and `lane_step.sh`;
  the one exception is `ktest-r4` (4g), which `lane_step.sh` starts only on ruling 79's rule: free >= 6 GB AND
  commit < 38 GB, three samples 30 s apart (the coordinator, round 3).
- **The lock is shared with the grader**: the coordinator takes `LANE/r58c/ktest.lock` (`mkdir`, only when it is
  free) for its grader runs and writes `LANE/orchestrator/grader-running.txt` while it holds it (about five minutes of
  gradings), then deletes both. Every lane launcher waits on the lock; none removes a lock it did not take.
  `orchestrator/end_of_run.sh` takes it too (round 3, CONFLICTS.md note 22): `until mkdir` before its memgate rule,
  retried every 30 s, never treated as stale, freed right after its container ends (or on any exit after it was
  taken), so it never starts between two of the grader's containers (test `r58c/B/eor/test_eor_lock.sh`, fake
  docker; fail-before `r58c/B/pre-eorlock/end_of_run.sh`).
- **Ruling 94, a fixed mount list per step** (`orchestrator/coordinator-rulings-94.md`; the protocol's section M
  holds it): every container of the end order has a fixed list in ONE file per agent, `r58c/B/mounts-B.json`
  (`ktest-r1` to `ktest-r11`, `kge-R1`) and `r58c/A/mounts-A.json` (agent A's `kge-H1P`, `kge-H1R`, `kge-H1`),
  shape `{"<name>": {"step": "<id>", "allow": [{"src", "dst", "mode": "ro|rw"}]}}`. `lane_step.sh` and
  `rerun_check.sh` build their `-v` flags only from that file (`r58c/B/mounts.js flags`; `lane_step.sh`: a name without an entry is
  refused, exit 2, a missing read-only source, exit 4; `rerun_check.sh`: either one, exit 4) and mount nothing else. **No step before the leak audit
  mounts the repository or the whole facts cache** (ruling 94(a)): r1 selectB, r2 report, r3 item27, r8 and r9
  the pre-checks mount the lane's code, tables and logs (r3 also its pins outside the lane, file by file, and,
  round 8 (C15), `grader-returns/tune-rank.json` read-only, which `item27.py` hashes); r4
  (answer_level tune) mounts the tuning staging `tune_inputs/` of 2f (the late-50 tuning parents' facts and the
  shared code, ruling 94(b)), never the build's facts cache. **Rulings 101(a) and 102** (round 8): r4 (the tuning
  hand-off) and r8 (its pre-check) also mount, read-only, ONE row per parent folder `export/graphs/<P>` ->
  `/w/export/graphs/<P>` for the 38 late-50 tuning parents (the `parent` of the 50 `eval/tune_commits.jsonl` rows
  with `late50` true, each a key of the plan's `assignment`), and r9 (the held-out pre-check) one such row for each
  of the 70 held-out parents (the keys of the plan's `heldout.assignment`) plus `/build/tasks/tasks.jsonl`; none of
  the three mounts `export/` or `export/graphs` whole, and the parent sets come from the plan, never from the
  hand-off being checked (one generator, `r58c/B/graph_rows.js`; the rows, sets and hashes are in
  `r58c/B/READY-mounts-r101`). A TEST run of r4, r8 or r9 (2d) keeps the step's name, runs only through
  `LS_PREFREEZE=test` with ` --test ` in the command and a TEST mounts file in `LS_MOUNTS` (`node r58c/B/graph_rows.js
  test-file <set> <out>`, marked `_test`; `lane_step.sh` exits 2 otherwise), and its record goes to
  `r58c/B/out/mounts-test/<name>-<UTC>.json`, never to `r58c/mounts/`: a TEST record is told apart by its folder,
  not its name. **ktest-eor** (step 1, ruling 101(e)) has an entry too: `export/checkpoints.py`, `export/parents.jsonl`,
  `export/parents_git.jsonl`, `eval` and `orchestrator/assemble_checks.py` read-only, `train` read-only with only
  `train/stageB/tables` writable, and `orchestrator/end-of-run` writable at `/w/eor`; `orchestrator/end_of_run.sh` builds its `-v` flags with `r58c/B/mounts.js` and saves its
  `docker inspect` to `r58c/mounts/ktest-eor.json` before its release. r5 (item22) what stage A used (`train`, `eval`,
  `export`); r6 (write_result) and r7 (write_audit_claims) the deliverable folder, writable at
  `/repo/docs/program/evidence/harness-bottlenecks/graph2/embeddings`, and the protocol file, read-only, never the
  repository (ruling 94(c)); r10 (the leak audit, after the held-out return) the lane, the repository and the whole
  facts cache, all read-only; r11 (the E5 route audit of ruling 97, step 9.2a, after the leak audit) `train`, `eval`
  and `export` read-only, its script `r58c/B/e5_route_audit.py`, the task file alone (`/build/tasks/tasks.jsonl`), and
  only `train/report/e5_route` writable. `export/` is mounted only where a step reads graphs (r2, r5, r11, `kge-R1` and agent A's
  held-out containers; ruling 94(f) with ruling 89); r4, r8 and r9 mount only their parents' folders
  `export/graphs/<P>` (rulings 101(a), 102), and r3 and ktest-eor only the three `export/` files named above. "The lane's logs" above means the RUNLOG's PASS logs
  (`orchestrator/`, `r58c/B/out/logs`); **no real step mounts agent A's logs `r58c/A/logs`**, since none reads them
  (round 4, ruling 94(d); r7's 2b/2e evidence is `r58c/rehearsal/`, `heldout-launch/`, `r58c/B/out/rehearsal` and
  `r58c/B/out/logs`; `test_freeze_check.sh` case 15). After every start the container's `docker inspect` is saved
  (both agents' containers: `r58c/mounts/<name>.json`, an older record of the same name kept as
  `r58c/mounts/<name>.<UTC>.json`). **Ruling 95** (`orchestrator/coordinator-rulings-95.md`, sha256 b66c5cf6...500c; the end of the protocol's
  section M) makes ruling 94(e) exact: the records of the containers that ran before the leak audit (the card window
  and steps 4 to 8) are passed to it (`--mounts`, step 9.1), and it fails when one of them is missing or shows a
  mount outside its step's list; the records of the containers that run after it (item 22 `ktest-r5`, the E5 route
  audit `ktest-r11`, the result writer `ktest-r6`, the audit writer `ktest-r7`) are saved the same way, and AUDIT.md
  section 9 lists r5's, r6's and r11's with their sha256 (step 9.4); the audit writer does not list its own record, which the coordinator's step-10
  audit checks with its launcher line against the fixed list. The fail clause of ruling 94 is unchanged.
- **The last-line rule** (every `lane_step.sh` step): the LAST line of its log
  `r58c/B/lane-steps/<name>-<stamp>.log` decides whose exit code it is. `<name>: rc N; command: ...` means N is
  the command's own code (the step's stop list applies); any other last line means N is `lane_step.sh`'s own:
  2 usage or no mount entry (or `LS_MOUNTS` outside a TEST run), 4 not started (a missing read-only source, the
  lock, the race gate or the inspect save), 5 the freeze check failed, or (round 8, C16) `orchestrator/freeze-list.txt`
  is missing for `ktest-r1`..`ktest-r11` outside a TEST run, 6 over the step's limit, 9 MEMGATE_EMPTY, 10 (`ktest-r10` only, step 9.1) the leak
  audit's verdict is not a pass although the audit exited 0 (round 6; last line `lane_step: exit 10 (step 9.1 verdict
  not a pass: ...)`, after the command's own rc line). The same rule holds for
  `r58c/B/ktest.sh`, which exits with the container's code (last line `exit N (the container's)`) or its own 2, 3
  (no exit code), 6 (over 580 s), 9 or 13 (no 6 GB window in 80 samples) (last line `ktest.sh exit N (its own ...)`).
- **Per-step limits** (change 5 of `orchestrator/end-order-changes-2.md`: measured on full-size stand-ins before
  the freeze; each limit is at least three times the measured figure; a real step that hits its limit after the
  freeze has no legal way forward, so the figures are generous):
  The stand-in is `r58c/B/out/timing/asm` (`r58c/B/timing/make_full_copy.js`: the frozen real plan, 2,385 parts,
  4,001,445 score rows, the real code's own bytes; `r58c/B/timing/time_steps.py`, `time_item22.sh`; logs in
  `r58c/B/out/logs/timing-*.log`). Limits in seconds; the launcher's limit is `lane_step.sh`'s `LIMIT_R<N>`.

  | Step | Container | Measured | Limit | Ratio |
  |---|---|---|---|---|
  | selectB (step 4) | ktest-r1 | 88.6 s (six per-arm calls, an upper bound; ktest-b46); again 91.6 s (ktest-b66). **Memory (ktest-b66): peak RSS 182 MB; container peak 178 MB of the 1,536 MB cap** | 3600 | 40x |
  | report.py (step 4) | ktest-r2 | 121.1 s (`report.main`; ktest-b49); again 124.7 s (ktest-b67). **Memory (ktest-b67): peak RSS 216 MB; container peak 210 MB of the 1,536 MB cap** | 3600 | 30x |
  | item27 (step 6) | ktest-r3 | not measured; reads the tables as selectB does (88.6 s) | 3600 | about 40x |
  | answer_level tune (step 5, the tuning hand-off) | ktest-r4 | 76.9 s wall for all 40 variants on the 313 late-50 tasks, B 10,000, 2 CPUs (agent A's `r58c/A/time_tune.py late50`, ktest-a15, `r58c/A/logs/time_tune-late50.json`; measured at 40 variants, no projection). **Memory: peak RSS 1,402 MB**; the container peaked at 1,532 MB of the 1,536 MB cap | 3600 s (at least 231 s); **memory cap `-m 4g --memory-swap 4g`** (`lane_step.sh` `MEM_R4`; the coordinator rules 4g, ruling 79/item 2's maximum, so 4,096 MB against 3 x 1,402 = 4,206 MB, by the coordinator's decision; start rule commit < 38 GB, `COMMIT_R4`; every other step keeps 1536m and commit < 40 GB) | 47x time; 2.9x memory |
  | item22 (step 9.2) | ktest-r5 | 325 s (E4, 95 epochs on CPU, cpus 2; ktest-b48); again 337 s (ktest-b68). **Memory (ktest-b68): peak RSS 755 MB; container peak 642 MB of the 1,536 MB cap** | 3600 | 11x |
  | write_result, write_audit_claims, the two pre-checks | ktest-r6..r9 | not in change 5's list (JSON only, seconds) | 900 | - |
  | leak audit (step 9.1) | ktest-r10 | agent A's figure (round 8, ktest-a52, `r58c/A/RUNLOG-A.md` ROUND8, sha256 9ecbb50b...): 204.5 s wall on a full-size stand-in (18,714 rows: B's `asm` tune parts plus 210 stand-in held-out parts; all 17 not-yet-existing sources pointed at stand-ins, `r58c/A/r10_repoint.js`; the stand-in's verdict FAIL, as expected, not the real one). **Memory: peak RSS 37.5 MB; container peak 48.1 MB of the 1,536 MB cap** | 3600 (`LIMIT_R10`, 1536m: both unchanged) | 17x |
  | E5 route audit (step 9.2a, ruling 97) | ktest-r11 | full-size stand-in of its graph work (r58c/B/timing/time_r11.py, ktest-b83): all 123 graph folders of export/graphs0 (both splits, a superset of what it reads), each read as a parent and as a checkpoint, 39,941 kge.route calls: 7.0 s (1.6 s import). **Memory (ktest-b83): peak RSS 353 MB; container peak 255 MB of the 1,536 MB cap**. The held-out counts files are not read in the stand-in (no test reads a real table) | 1800 | about 250x |
  | end_of_run assemble + assemble_checks (step 2) | ktest-eor | 86.2 s + 31.3 s = 117.5 s (ktest-b45); again 90.7 s + 32.7 s = 123.4 s (ktest-b69, every planned `_meta.json` of the copy dropped first, as `end_of_run.sh` does). **Memory (ktest-b69): peak RSS 357 MB; container peak 274 MB of the 1,536 MB cap** | 3000 (`LIMIT_ASSEMBLE`) | 25x |
  | kge-R1 rerun (step 2c) | kge-R1 | not measured (it trains fifteen picked units on the card) | 5400 s (`RR_LIMIT`); **memory cap `-m 4g --memory-swap 4g`** (ruling 100; ruling 79's start rule, commit < 38 GB) | - |
- **How the memory figures were taken** (the coordinator, round 3): each change-5 step ran again on the same
  full-size stand-in `r58c/B/out/timing/asm` in its own `ktest-b<N>` at the cap `lane_step.sh` gives it (1536m),
  under `r58c/B/timing/mem.sh` / `mem_run.py`: peak RSS is `getrusage(RUSAGE_CHILDREN).ru_maxrss` (the largest
  single process of the tree, as agent A's `time_tune.py`); the container peak is `/sys/fs/cgroup/memory.peak`, read
  inside the container before it ends. The container peak can be below the RSS: file pages (libraries) already in
  the host's page cache are charged to the cgroup that first read them. No peak came near its cap. Logs
  `r58c/B/out/logs/mem-<step>.log`, figures `r58c/B/out/timing/mem-<step>.json` (ktest-b65's assemble run is kept as
  `mem-assemble.b65-skipped.*`: the copy's sets were already assembled, so it skipped them; ktest-b69 is the figure).
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
- Agents A and B of round r58c finished; their RUNLOG sections are appended to `train/RUNLOG.md` by the lane.
- **Every container launcher closes the start race** (after the 2026-11-14 reset, when `ktest-b13` and `ktest-G40`
  passed "no ktest-* running" in the same second): `r58c/B/ktest.sh`, `r58c/B/lane_step.sh` and
  `r58c/B/rerun_check.sh` (through `r58c/B/race_gate.sh`) and `orchestrator/end_of_run.sh` start the container with
  its command held until `/tmp/go`, look at `docker ps` right after the start and again 3 s later, and release it
  only when no other matching container runs; otherwise the held container is removed (it has run nothing) and the
  launcher retries after a random 30-59 s (`end_of_run.sh` stops with exit 11 instead). Agent A's `r58c/A/ktest.sh`
  re-checks before and 3 s after its start and exits 14. Tests: `r58c/B/tests/test_race_gate.sh` (host, fake docker)
  and `r58c/A/test_ktest_race.sh` (host, stub docker); `end_of_run.sh`'s cases K3, K4, K3B in
  `r58c/B/eor/test_end_of_run.sh`.
- **The launchers need a working `orchestrator/memgate.sh`**, whose samples come from PowerShell. The lane starts
  every launcher itself, from a shell in which `sh orchestrator/memgate.sh sample` prints two numbers, and takes one
  such sample before each start to check that. A launcher that sees an empty sample stops and reports instead of
  waiting: `r58c/B/ktest.sh`, `r58c/B/lane_step.sh` and `r58c/B/rerun_check.sh` take one sample before
  `memgate.sh wait` and exit 9 (MEMGATE_EMPTY) when it is empty, one field or not numbers; `orchestrator/end_of_run.sh`
  does the same at its step 4 and exits 14 (MEMGATE_EMPTY). (After the 2026-11-14 reset the lane's own shell was
  sandboxed and could not run PowerShell: every sample came back empty, so `memgate.sh wait` never returned.) Tests:
  `r58c/B/tests/test_memgate_empty.sh` (host, stubs) and case M of `r58c/B/eor/test_end_of_run.sh`.
- **After a PC reset** (there were two on 2026-11-14), before anything else the lane:
  (a) runs the freeze check `sh r58c/B/freeze_check.sh` if `orchestrator/freeze-list.txt` exists (it must print
  nothing, exit 0);
  (b) verifies the PASS evidence of the last finished step, as this file lists it for that step;
  (c) moves aside, and never reuses, any output the interrupted step had half-written (renamed to
  `<name>.interrupted-<UTC stamp>` beside it, kept for the audit);
  (d) runs the interrupted step again from its start, except step 7, which resumes as written there (same command,
  finished units kept), and stage B, which the guard resumes;
  (e) tells the coordinator which step was interrupted before it continues;
  (f) (round 8, LO-9: this order) FIRST saves the logs of any leftover `ktest-r<N>` or `kge-R1` container
  (`docker logs <name> > r58c/B/lane-steps/<name>-leftover-<UTC stamp>.log 2>&1`) and then removes it (`docker rm
  -f <name>`); both actions go into the lane's RUNLOG section with the time and the container's name (a leftover
  `ktest-r<N>` or `kge-R1` means its step was interrupted: (c) and (d) apply to it). THEN, if no `ktest-*` and no
  `kge-*` container exists (`docker ps -a --filter name=ktest-`, `--filter name=kge-`), no `ktest-G*` container runs and
  `LANE/orchestrator/grader-running.txt` does not exist (the coordinator holds the same lock for its grader runs and
  writes that file meanwhile; a lock taken by the coordinator is never stale to the lane), it removes a stale
  `r58c/ktest.lock` (`rmdir`); otherwise it waits and asks the coordinator.

## 1. The end-of-run procedure (lane)

- **Command** (host, Git Bash): `sh LANE/orchestrator/end_of_run.sh`
- **Preconditions**: the stage-B guard (`orchestrator/guard-stageB.sh`, sha256 59d3fb8e..., the one running since
  2026-11-14T22:11Z under ruling 93, which withdrew ruling 92; `orchestrator/guard-stageB-r92.sh` ran from 20:57Z to
  21:41Z and its units stand; both write `orchestrator/guard-stageB.log` with the same runner string) has written
  `stage B complete: no unit left` as the last state line of `orchestrator/guard-stageB.log`; no
  `kge-*` and no `ktest-*` container runs; C: has >= 10 GB free; the `preflight_e4_det` line of step 0 is in
  `progress.jsonl`.
- **Stage-B memory cap (ruling 98, `orchestrator/coordinator-rulings-98.md`, sha256 5e4faaa0...; protocol section M)**:
  stage B ran under ruling 43's 2560m until the coordinator stopped the guard at 2026-11-15T06:28:25Z; **the remaining
  units (279 at the ruling, all E4 c13 and c16) run at 4g under ruling 98**: the same guard file (sha256 59d3fb8e...)
  started again at 2026-11-15T06:29:24Z with the cap set to 4g in its environment, as its `guard start` line
  records. Nothing in this order waits on it. AUDIT.md section 7b (step 9.4) lists which units ran under which cap,
  from the guard log: each `guard start` line of `orchestrator/guard-stageB.log` names its cap, and a unit takes the
  cap of the last guard start before its done line in `train/progress.jsonl`; RESULT.md's limits carry ruling 98
  beside ruling 43 in one bullet (step 9.3). A host count at 2026-11-15T06:55Z (counts only, no score read): five
  guard starts (four at 2560m, one at 4g), 2,162 units done, 2,113 under 2560m and 49 under 4g, none before the
  first start, none with done lines under two caps.
- **What it does** (in order; each sub-step's exit code is its stop code): 1 preconditions (10, 11, 12; 15 when
  the last `guard start` line does not read `cap 4g`, ruling 101(d));
  2 `guard-prelaunch.js left` = 0 (20); 3 `validate` missing=0 quarantined=0 (30); 4 one memgate sample (14
  MEMGATE_EMPTY when it is not two numbers), then it takes the lane lock `r58c/ktest.lock` (waits while the grader
  or a lane container holds it; freed when its container ends), then memgate (13), then it
  **drops every planned `<set>_meta.json`** (ruling 82: `stageB.py assemble` skips a set whose meta exists, so
  without the drop a part redone after its set was assembled never reaches the table; 44 when a drop fails),
  then ONE CPU container `ktest-eor` with exactly its list in `r58c/B/mounts-B.json` (ruling 101(e); flags from
  `r58c/B/mounts.js`, 45 when they do not build; its run line goes into the summary and its `docker inspect` to
  `r58c/mounts/ktest-eor.json` before its release, 46 when that save fails): `python stageB.py assemble` (41-43), then `assemble_checks.py --train /w/train --plan
  /w/train/stageB/plan.json --report ...`; 5 validate again (50); 6 `check-tables` (60); 7 the log checks (70-73)
  and **HD-12**: the log's `e4_det1 <n> of <m> e4_parts, planned <p>` line must show n = m = p (74; every E4
  stage-B part ran with det=1, ruling 67).
- **Expected PASS evidence**: the summary `orchestrator/end-of-run/end_of_run-<STAMP>.txt` ends with the line
  `PASS assemble-checks orchestrator/end-of-run/assemble_checks-<STAMP>.log tables_digest <64 hex> appended to <the RUNLOG path> (assemble_checks.py sha256 <64 hex>; e4_det1 <n> of <m> e4_parts, planned <p>)`;
  `train/RUNLOG.md` gains exactly one line `PASS assemble-checks orchestrator/end-of-run/assemble_checks-<STAMP>.log tables_digest <64 hex>` (the guard requires the digest on the line to equal both the log's and the current tables');
  the log holds `assemble_checks PASS`, `sha256 <current assemble_checks.py> orchestrator/assemble_checks.py`,
  `train /w/train parts <N> planned <N> ...`, `e4_det1 ...` and `tables_digest <hex>` (ruling 82's digest: plan.json
  bytes, then per planned set the decompressed pool and unrestricted tables and the counts file).
- **Stops the line**: any non-zero exit (14 MEMGATE_EMPTY: start it again from a shell that can sample; 42: the
  assemble ran over `LIMIT_ASSEMBLE`). A quarantine at step 3 or 5: the guard exited 0 at completion, so **the lane
  restarts it** (ruling 101(d), C5): `sh orchestrator/start-guard-r98.sh` from LANE (host, Git Bash; the starter
  of ruling 98, which sets the 4 GB cap; it redoes the quarantined unit), never a bare `sh guard-stageB.sh`
  (that file's default cap is 2560m); the new `guard start` line of `orchestrator/guard-stageB.log` must read
  `cap 4g` (`end_of_run.sh` checks the last `guard start` line and stops with exit 15 otherwise). It then runs step 1 again **from its start** once the guard
  again logs `stage B complete: no unit left`.
- **Coordinator**: records the tables digest from the PASS line: `{"step":"coordinator","unit":"tables_digest",
  "file":"orchestrator/end-of-run/assemble_checks-<STAMP>.log","sha256":"<the tables_digest>","t":"<UTC>"}` in
  `progress.jsonl`.
- **Step 1 runs again** (from the start, and the coordinator records the new digest) if any file step 1 used
  changes before step 3: `orchestrator/end_of_run.sh`, `orchestrator/assemble_checks.py`,
  `orchestrator/guard-prelaunch.js`, `orchestrator/memgate.sh`, `train/stageB.py` (and the modules it imports:
  `train/kge.py`, `train/proj.py`, `train/atomic.py`), `train/stageB/plan.json`, any part under
  `train/stageB/parts/` or any table under `train/stageB/tables/`. The freeze list of step 3 holds all of them
  (every file under `train/stageB/parts/` by its own sha256 line, since item22 and the leak audit read parts after
  the freeze), so after step 3 such a change is a freeze-check failure, and so is a part file that appears or
  disappears (the freeze check compares the set of part files with the list).

## 2. The card window, the reruns on final bytes, and the interface rehearsal

- **"Selected settings"** in 2a to 2c (and in ruling 96(a)) means the three settings per arm that stage A selected
  and stage B trains, fifteen in all (ruling 79's "the three selected settings of each arm"), never selectB's
  choice. The card window stays before the code freeze and before selectB.
- **The card window's length** (what is measured so far). The INJ arm of 2b, on a CPU stand-in (agent A's
  ktest-a30..a39, 2 cores, `-m 4096m`, ten containers, one per copy and arm; `r58c/A/out/inject_standin/*/inject_case.json`):
  **1,304.5 s in all** for the thirty runs (big 904.3 s, noco 400.2 s), all thirty rc 0; the slowest setting
  115.9 s (big, E5); **peak RSS 1,603 MB** (big, E4 c13); **container memory.peak 1,733 MB**, under the 3.5 GB report
  line of 2a and the 4 GB cap of `kge-H1R`. **Card memory was not measured** (the stand-in has no card), and the
  card's wall time is not claimed from the CPU figure. The probe (2a), the three driver arms of 2b and the re-run
  check (2c) have no window-length figure in this file; the window's length is their walls plus INJ's.

### 2a. Ruling 86(a), the probe (lane; after stage B has left the card and before the code freeze)

- **Commands** (agent A's; from LANE in Git Bash): the probe's staging,
  `node train/heldout_inputs.js build --plan train/stageB/plan.json --facts ../../build/facts/cache --common ../../build/arms/common --out probe_inputs --parents 7b3a745281898d3d5808c5a15c4916d1d9dbb1b4`,
  then the probe, `PROBE=1 sh train/heldout.sh` (container `kge-H1P`; the unit-path probe of MF-7 is part of it).
- **Preconditions**: step 1 passed; no `kge-*` container runs (stage B has left the card); **ruling 79's start
  rule** for the probe container (three samples 30 s apart, free >= 6 GB, commit < 38 GB).
- **Expected PASS evidence**: `train/probe/probe.json` lists, for each of the fifteen settings, the container's
  peak memory, the process's peak memory and the card's peak reserved memory against its total, plus one
  unit-path probe (train, score, assemble, rank, pack on synthetic tasks) for the setting with the highest
  peak; `train/probe/probe.rc` is 0; its mount record `r58c/mounts/kge-H1P.json` exists (`heldout.sh` saves it; the leak audit reads it).
  Rulings 96(a), 97(c) (agent A's ROUND6, `r58c/A/RUNLOG-A.md`; the command above is unchanged): the probe's
  synthetic graph takes the relation counts of the largest held-out graph's `sizes.json`; a relation that no tuning
  checkpoint has is renamed `zz_heldout_only_relation_<n>` (no held-out-only name reaches `probe.json`, which
  records counts only) and drawn as edges from non-code `other` entities to code entities, `NEW_REL_FILE_SHARE`
  0.8 of them to code files and the rest to code-area symbols, never as random pairs (`train/heldout.py`, sha256
  9775077c...; before bytes 2e520639 = `r58c/A/pre/heldout_r96.py`; agent A's tests ktest-a28 test_probe_r97 and
  ktest-a40 test_probe PASS). The TEST record 049ba85b still pins heldout.py 2e520639 (agent A: not rebuilt).
- **Stop rule (ruling 86)**: a **container peak above 3.5 GB or a card peak above 10 GB is reported to the
  coordinator before anything else runs**. A failed setting (rc 3) also stops the line.

### 2b. Ruling 86(b), the rehearsal of the held-out driver in test mode (lane)

- **Commands** (agent A's; from LANE in Git Bash): the rehearsal's staging,
  `node train/heldout_inputs.js build --plan train/stageB/plan.json --facts ../../build/facts/cache --common ../../build/arms/common --out r58c/rehearsal/inputs --parents cd806c803c4ad8ec198790096d196460789951f0,2fa68134d22db238b53b12e5f24315af29dce4a0,7b3a745281898d3d5808c5a15c4916d1d9dbb1b4`
  (the three tuning parents in full, as in `train/stageB/plan.json`), then `sh r58c/A/rehearse.sh`. It must run: three tuning parents
  (the smallest, one without a co_changed fact, the largest), the GPU image, the card, the 4 GB cap, test
  records for E4 (c13 or c16, deterministic), E5 and one of E1-E3, a `docker stop` in the middle of a unit
  followed by a relaunch, and a stopped leftover container before a launch.
- **Ruling 96(a), the injected-kinds case** (agent A's ROUND6, `r58c/A/RUNLOG-A.md`; marker `r58c/A/ROUND6-DONE`):
  `sh r58c/A/rehearse.sh` runs the arms `E4 E5 E1 INJ` by default (`ARMS=${*:-E4 E5 E1 INJ}`; before bytes 5b607295
  = `r58c/A/pre/rehearse_r96.sh`). For INJ it runs `REHEARSAL=INJ sh train/heldout.sh` (container `kge-H1R`, card,
  4 GB cap), and `r58c/A/rehearsal.py` with `REHEARSAL_ARM=INJ` (before bytes b31d02c9 = `r58c/A/pre/rehearsal_r96.py`)
  runs `[sys.executable, /w/r58c/A/inject_case.py, '--out', /w/r58c/rehearsal/INJ/case]` (cwd `/w/train`,
  `EMB_ROOT=/w`); its exit code is inject_case's (0 every setting trained, scored, ranked and packed; 3 one did not).
  `r58c/A/inject_case.py` takes all fifteen stage-A settings (plan configs[:3] per arm, E1 to E5) on two injected
  copies of tuning graphs (`r58c/A/inject_kinds.py`: relation `zz_injected_relation`, kinds `zz_injected_kind_a`/`_b`,
  10 non-code nodes of area `other` at `zz-injected-layer.txt`, 50 triples to existing entities): **big** = 7b3a7452
  (all 35 tuning relation types, 36 with the injected one) and **noco** = cd806c80 with its co_changed triples that
  touch `other` removed (`--drop-other-co`; ruling 97(e): E5's `other` specialist has no co_changed fact), and runs
  `heldout.py probe-full` on each (2 epochs, 5 tasks, both scopes, assemble, rank, pack). **INJ passes on rc 0 plus
  `r58c/rehearsal/INJ/case/inject_case.json`** (rehearse.sh notes its sha256 in `r58c/rehearsal/REHEARSAL.txt`), and
  **INJ gets no mid-run stop** (the `docker stop` and the stopped leftover apply to the first non-INJ arm only).
  Ruling 86(b)'s driver rehearsal above keeps its three test records (E4 with c13 or c16, E5, E1). The lane reads no
  held-out graph for this (96(b)). Agent A's tests: test_inject_kinds (ktest-a29), test_rehearse_inj and
  test_rehearse_stop (host), test_rehearsal_inj (ktest-a28), test_rehearsal_negative (ktest-a29), precheck_three
  (ktest-a41), all PASS.
- **The rehearsal's staging check** (agent A's ROUND7, `r58c/A/RUNLOG-A.md`; marker `r58c/A/ROUND7-DONE`):
  `train/heldout.sh` (sha256 1ef02a8c...; before bytes 22485d80 = `r58c/A/pre/heldout_r97.sh`) checks
  `r58c/rehearsal/inputs` under `REHEARSAL` the way the real launch checks its staging (`heldout_inputs.js check`,
  the sources, the three rehearsal parents) and **stops with exit 8** when it fails; no rehearsal container starts
  then. Agent A's host test_heldout_rehearsal_check PASS (intact: past the check; a root-level blob or a tree
  deleted: exit 8; the before bytes let the deleted root-level blob through, the fail-before), test_heldout_mounts PASS.
- **No held-out staging but 2f's** (history, kept as the record of round 3; nothing in this bullet is still to do):
  `r58b/out/hstage` was removed (recorded in `train/RUNLOG.md` first). Agent A's
  `r58c/A/ktest.sh` mounts of `r58b/` only `r58b/out/fakeB`, `r58b/out/leak_parts`, `r58b/pre` and `r58b/pre2`
  (read-only), never `r58b/` whole; its test_leak_audit makes a synthetic held-out staging inside its own container
  at `/w/heldout_inputs`. Agent B's `r58c/B/ktest.sh` mounts as in 2e below. Before the code freeze the only held-out
  staging is 2f's `LANE/heldout_inputs`.
- **The root-file comparison** (ROUND6's negative case; agent A's test_rehearsal_negative, ktest-a51 PASS): with the
  `.editorconfig` blob removed from the staging, the run still packs (rc 0; the shared code packs silently, which is
  why the staging check above exists), and its `ranked/` is byte-identical to the intact run's (20 files); its
  `answers/` (10 files) differ only in each row's pack time `ms`, as a second intact run's do; with `ms` dropped every
  row equals the intact run's; the path `.editorconfig` appears 0 times in the answers.
- **The leak audit's bytes**: `train/leak_audit.py` is 6a2bf7f4... (before bytes `r58c/A/pre/leak_audit_r97.py`),
  with three new ruling-89 GRAPH_RULES for round 6's heldout.py `tuning_relations` lines 662, 665 and 773
  (definition, caller key, plan checkpoint: the tuning checkpoints' `sizes.json` only). Agent B's tests that import it
  ran again on these bytes (test_mounts_vs_leak_audit; test_write_audit_claims through role_report p2).
- **Preconditions**: 2a passed (or the coordinator ruled on its report); **ruling 79's start rule** for each
  rehearsal container (three samples 30 s apart, free >= 6 GB, commit < 38 GB).
- **Expected PASS evidence**: the rehearsal writes only under its scratch folder, reads no real table and no
  held-out graph, ends rc 0 with every unit done after the relaunch, and its logs are kept (AUDIT.md section 9,
  written by `r58c/write_audit_claims.py`, lists them and their container records with sha256 and names what it
  cannot cover: the real record and anchor, the 70 real graphs, wall time; ruling 86(b)).
- **Stops the line**: any failure; a fix it forces is a code change, which happens HERE (before the freeze): the
  fixed step runs again, then 2d runs again in full.

### 2c. The re-run check (lane; card window, coordinator's order of 2026-11-14 with ruling 89)

- **Command** (host, Git Bash): `sh LANE/r58c/B/rerun_check.sh` (no option). It starts ONE container `kge-R1`:
  the GPU image by ID (`sha256:a890c548...`), `--gpus all --network none --pull never --cpus 6 -m 4g
  --memory-swap 4g` (**ruling 100**, round 8: the last E4 c13 units and every c16 unit were made under 4 GB; it
  starts under ruling 79's rule); `train/`, `export/`, `eval/`, `orchestrator/` and `r58c/B/rerun/` read-only; the only
  writable mount is the scratch parent `r58c/B/rerun-out/` at `/w/rerun-out`, and it works in
  `/w/rerun-out/<STAMP>`. **The lane lock** (round 8, C16): after its image check it takes `LANE/r58c/ktest.lock`
  (`until mkdir`, retried every 30 s, never treated as stale) and frees it on any exit, so no `ktest-*` of either
  agent and no grader run starts beside it (test `r58c/B/tests/test_rerun_r101.sh`, fake docker; fail-before
  `r58c/B/pre-r101/rerun_check.sh`). Inside, `python /w/rr/rerun_check.py run --tree /w/train --out
  /w/rerun-out/<STAMP>` (`r58c/B/rerun/` is mounted at `/w/rr`) trains each picked unit in a **fresh process** (one `orchestrator/rerun_unit.py`
  subprocess per unit; E4 always with `--det`, ruling 67) and compares it with its stage-B part through
  `orchestrator/rerun_compare.py`'s `compare` (ruling 68: E1-E4 the loss list, both score tables and the counts
  byte-identical; E5 both score tables and the counts). It compares losses, both score tables and the counts only:
  stage B keeps no representation tensors (`reps.pt` is deleted after scoring), so none are compared
  (`compare` records `reps` as "not kept by the part"). `rerun_unit.py` and `rerun_compare.py` are used as they
  are, never edited. `kge-R1`'s mounts are its entry in `r58c/B/mounts-B.json` (ruling 94(d)) and its
  `docker inspect` is saved to `r58c/mounts/kge-R1.json` before its release.
- **Pick rule** (fixed before any result): for each of the fifteen settings (arm x configuration of the plan),
  the unit of the **100th `done` line of that setting** in `train/progress.jsonl` (step `stageB`, in file order;
  a repeated unit counts once), so it sits deep inside the setting's long process. A done line with
  `"trained": false` (no co_changed fact; nothing was trained) passes to the next trained done line of the
  setting. **A setting with fewer than 100 done lines** (at 159 planned units per setting this happens only if
  units were never logged): the rule then picks the setting's **last trained done line**, and `picks.json`
  records the rule as `fewer than 100 done lines: the last trained done line`. A setting with no trained done
  line at all is `no unit` and fails the check (exit 3).
  **Ruling 98's two caps** (round 6): the rule picks per setting, so E4 c13 and E4 c16 each give one unit. c13's
  100th done line is a 4g unit (46 of its units were done under 2560m at the host count above), all of c16 runs
  under 4g, and the other thirteen settings' picks are 2560m units: the check compares parts made under either cap,
  as ruling 98 says. `rerun_check.py` is unchanged for it. (History: until round 8 `kge-R1` ran at 2560m, and no
  single c16 unit had run under 2560m; **ruling 100** set its cap to 4g, `-m 4g --memory-swap 4g`, above.)
  **A memory kill** (ruling 101(c), C13): a picked unit's process killed inside the container gives that unit
  `result: error` with `returncode` -9 in `result.json` and `rerun_check.sh` exit 3; a kill of the container itself
  (docker exit 137) leaves no `rc` file and `rerun_check.sh` exits 4. Either is a stop that is not a code defect:
  it is reported, and then the same command is run again (`sh LANE/r58c/B/rerun_check.sh`; it works in a new
  `<STAMP>` folder and trains all fifteen picks again; the earlier folder and its finished comparisons are kept for
  the audit, never deleted); a launch that finishes no unit is reported to the coordinator before another try. Whether ruling 86's 3.5 GB
  container stop (below) still applies under the 4g cap is open (CONFLICTS.md note 32).
- **Preconditions**: step 1 passed; the card window is open (no `kge-*` container runs; the script refuses
  otherwise, exit 4); the lane lock (it waits); no `ktest-*` runs (it waits, at most 40 checks 30 s apart, then exit 4); one memgate
  sample (exit 9 MEMGATE_EMPTY when it is not two numbers), `memgate.sh wait`, then ruling 79's start rule; `kge-R1`'s
  entry in `r58c/B/mounts-B.json` builds (LO-10: a missing entry or a missing read-only source is exit 4, not
  started); C: >= 15 GB; after its start the race gate of section 0 (at most 10 starts, then exit 4).
- **Stop rule**: a hard limit of 5,400 s; the card above 10 GB used or the container above 3.5 GB (ruling 86);
  three memgate low samples. Each stops `kge-R1` and is reported before anything else runs.
- **Expected PASS evidence**: exit 0; `r58c/B/rerun-out/<STAMP>/result.json` with `rc` 0, `equal` 15 and empty
  `mismatch` and `error`; `picks.json` (the fifteen picks with their rule and position, and the sha256 of
  `rerun_check.py`, `rerun_unit.py` and `rerun_compare.py`); `compare.jsonl` (one ruling-68 comparison per
  setting); `driver.log` and `host-load.tsv`.
- **Stops the line**: **any difference (exit 1), error (exit 3), stop or not started (exit 4) or MEMGATE_EMPTY
  (exit 9: start it again from a shell that can sample) is reported to the coordinator before anything else runs**;
  a memory kill (exit 3 with `returncode` -9, or exit 4 after docker's 137) is then run again as above.
- Plumbing-tested on CPU only (`r58c/B/tests/test_rerun_check.py` in a `ktest-b<N>` container: fake trees, one
  unit trained twice through the real `rerun_unit.py`, a changed score row found as a mismatch, two mutants that
  fail). It runs on the card only in the card window.

### 2d. Every test rerun on the final bytes (lane)

- **Command**: one `ktest-<letter><N>` container at a time (the lane lock `LANE/r58c/ktest.lock`, then no
  `ktest-*` in `docker ps`, the grader's `ktest-G*` included, then the 6 GB rule of section 0), e.g. `sh
  LANE/r58c/B/ktest.sh ktest-b<N> /w/r58c/B/tests/kt_inner.sh <test> [<test> ...]` for agent B's tests and
  `sh LANE/r58c/A/ktest.sh ktest-a<N> "<test> ..."` for agent A's. **2d runs every test once more, in full, on the
  final bytes**: the "not rerun" and optional skips of the agents' queues are for interim runs only, never for 2d.
  The complete list (both agents' `TEST-QUEUE.md` name exactly these):
  in containers: `train/r58/tests/{test_gate, test_item27, test_verdict, test_write_result, test_counts,
  test_heldout, test_heldout_e4, test_probe, test_answer_level, test_leak_audit, test_item22}.py`,
  `r58c/tests/{test_selection_freeze8, test_r64}.py`, `fixes/tests/test_select_report.py`,
  `parallel/tests/test_assemble_checks.sh`, `r58c/B/tests/{test_rerun_check, test_b_units, test_item27_trc,
  test_wr_refuses_test_return, test_mounts_vs_leak_audit, test_write_audit_claims}.py` (`test_write_audit_claims`
  after `test_write_result`, whose output it reads; it holds the section-9 checks of ruling 86(b) and 94(e), (f)),
  `r58c/B/tests/mf4.sh`, the role wrappers `r58c/B/tests/role_selectB.sh` and `r58c/B/tests/role_report.sh` (p1, p2,
  joined by `r58c/B/role_join.sh`), and agent A's `r58c/A/build_handoffs.py` and `r58c/A/precheck_handoff.py` runs;
  on the host: `r58c/B/tests/test_race_gate.sh`, `r58c/B/tests/test_memgate_empty.sh` (fake docker, no container),
  `r58c/B/tests/test_freeze_check.sh`, `r58c/B/eor/test_end_of_run.sh` (its own `ktest-b<N>` containers, under the
  lane lock), and agent A's `r58c/A/{test_ktest_race, test_tune_staging, test_rehearse_stop,
  test_heldout_mounts}.sh`. **Round 8 (C14) adds the seventeen tests the last re-read found missing**: agent B's
  `r58c/B/tests/{test_e5_route_audit, test_tune_harness}.py` (kt_inner), `r58c/B/tests/test_wrapper_exit.sh` (its
  own `ktest-b<N>`), `r58c/B/tests/test_r10_verdict.sh` and `r58c/B/eor/test_eor_lock.sh` (host); agent A's
  test_inject_kinds, test_rehearsal_inj, test_rehearsal_negative, test_probe_r97, test_staging_blobs,
  test_heldout_rehearsal_check, test_rehearse_inj, test_kt_inner, precheck_three, test_precheck_seed and
  precheck_r96_check (commands in `r58c/A/TEST-QUEUE.md`); and round 8's own: `r58c/B/tests/{test_item27_trc,
  test_sr6_guard}.py` (kt_inner), `r58c/B/tests/{test_rerun_r101, test_pass_paths, test_kt_as}.sh` (host). The
  exact order: `r58c/B/TEST-QUEUE.md` (its round-8 section, q9-q20) and `r58c/A/TEST-QUEUE.md`.
- **Agent A's role logs, copied** (C8, SR-2): the ruling-58/83 guard opens the PASS logs inside ktest-r1, r2 and r3,
  and none of them mounts `r58c/A/logs`. After agent A's last 2d runs the lane copies
  `r58c/A/logs/{test_heldout, test_answer_level, test_leak_audit}.log` unchanged (`cp -p`, then `cmp` each pair)
  into `r58c/B/out/logs/A/`, which all three mount read-only, and the RUNLOG's `PASS heldout-driver`,
  `PASS item24-adapter` and `PASS leak-audit` lines name those copies. Two checks before the freeze:
  `node r58c/B/pass_paths.js` (host; every sha256 path and PASS log of the RUNLOG lies under a mount of ktest-r1,
  r2 and r3 and exists; exit 0, else the line stops; test `r58c/B/tests/test_pass_paths.sh`), and a dry guard run
  with ktest-r1's exact mounts, `KT_AS=ktest-r1 sh r58c/B/ktest.sh ktest-b<N> /w/r58c/B/tests/dry_guard.py`
  (`KT_AS` gives the test container exactly that entry's rows, every one read-only, and nothing else; the inner
  `.py` goes in as `python -c`; `selectB.ac_problems` is stubbed, since the assemble-checks log is step 1's; it
  prints `RESULT PASS dry-guard` and exits 0, else the guard's 3 with its reasons; test `r58c/B/tests/test_kt_as.sh`).
- **The TEST runs of the graph steps** (C1, C2; rulings 101(a), 102): `answer_level.py tune --test --test-set
  late50` through `lane_step.sh` as `ktest-r4` (its time and peak memory are measured again under its list, for the
  limits table), the pre-check of `r58c/handoff-test/tune-late50` as `ktest-r8` and of `r58c/handoff-test/heldout`
  (pick8) as `ktest-r9`, each with `LS_PREFREEZE=test` and a TEST mounts file in `LS_MOUNTS` (section 0). The rows
  these runs need beyond the step's own list (a writable test folder and agent A's fake stage for r4, the hand-off
  folder for r8 and r9) are CONFLICTS.md note 33.
- **The test hand-offs**: if `train/answer_level.py`, `train/heldout.py`, `train/heldout_inputs.js` or
  `train/HANDOFF-FORMAT.md` changed after `r58c/handoff-test/` was built, agent A's `r58c/A/build_handoffs.py`
  rebuilds them before 2e (and the new `HANDOFF.json` sha256 values go to the coordinator).
- **Preconditions**: no code change is pending; 2a, 2b and 2c passed.
- **Expected PASS evidence**: every log prints the sha256 of the bytes it tested and `RESULT PASS <name>`; the
  RUNLOG section appended by the lane holds, for each of the six roles, `sha256 <hex> <role> <path>` equal to
  the current bytes and `PASS <role> <log>`.
- **Stops the line**: any `RESULT FAIL`, a log whose sha256 is not the current bytes, a missing PASS line, a
  non-zero exit of `pass_paths.js` or of the dry guard run, a copy of agent A's log that differs from its source.

### 2e. The interface rehearsal (lane, grader, coordinator)

- **Commands**:
  1. lane: the test hand-offs agent A built under `r58c/handoff-test/` (tuning form and held-out form, from
     tuning data, test flag set); the lane gives the coordinator each `HANDOFF.json`'s sha256 (and the test
     record's sha256 for the held-out form);
  2. coordinator -> grader: those hashes; grader, **test mode**, on its fixed test task set "pick8" (8 late-50
     commits, 37 tasks): grades them and writes `LANE/grader-returns/test/tune-rank.json`, `tune-item24.json`,
     `heldout.json` (grader-interface-v2 §6);
  3. lane: `write_result.py --test` on them through the named wrapper, one line, host, from LANE:
     `sh r58c/B/ktest.sh ktest-b<N> /w/r58c/B/tests/wr_rehearsal.sh` (`r58c/B/ktest.sh` mounts `LANE/grader-returns`
     read-only at `/w/grader-returns` for this wrapper and `compare_only.sh` alone, never for another test, and of
     `r58b/` only `r58b/pre`, `r58b/logs/test_verdict.log` and, for this wrapper, the two TEST records below; never
     `r58b/` whole and never its old held-out staging `r58b/out/hstage` (removed in round 3; history only), so no test container sees a held-out staging
     (before the freeze the one held-out staging is `LANE/heldout_inputs` of 2f, which no test container mounts); it exits with the container's exit code). The wrapper names every input:
     `--tune /w/r58c/handoff-test/report/tune.json` (the TEST tune.json in the real file's shape, on the grader's
     pick8; made by the harness `r58c/B/rehearsal/tune_harness.py`, which calls the evalcore functions report.main
     calls on agent A's `r58c/A/out/fakesel`, NOT by report.main: CONFLICTS.md note 11 (b); it reads the arms and
     variants from fakesel itself, all of them, no fixed list (note 21; six fake arms, alone and fused, since note 18
     (a)); run as `sh r58c/B/ktest.sh ktest-b<N> /w/r58c/B/rehearsal/harness_tune.sh` (it reads nothing under
     `grader-returns/`), then copied by the host to that path; after the returns are in, compared with the grader's
     TEST `tune-rank.json` to 1e-9 by `sh r58c/B/ktest.sh ktest-b<N> /w/r58c/B/rehearsal/compare_only.sh`), `--answer /w/r58c/A/out/tune_ho/answer_level.json`, `--handoff /w/r58c/handoff-test/heldout/HANDOFF.json`,
     `--item27 /w/r58c/A/out/ho_rec/item27.json`, `--anchor /w/r58c/A/out/ho_rec/progress.jsonl`,
     `--plan /w/r58c/A/out/fakestage/stageB/plan.json`, `--item22 /w/r58b/out/item22_test/item22.json`,
     `--leak /w/r58b/out/leak_audit.json`, `--outdir /w/r58c/B/out/rehearsal` (an earlier output folder is renamed
     `rehearsal.old-<stamp>` first); a missing input is exit 3 before anything runs. `--test` reads the three returns
     from `/w/grader-returns/test/` when no return option is given, refuses a return taken from the real
     `grader-returns/` folder itself (exit 2), and never writes into or under the deliverable folder (exit 8). Log:
     `r58c/B/out/logs/wr_rehearsal.log` (the sha256 of every input, then write_result's output, the result.json `test`
     flag and the return hashes it records).
  The coordinator moves old returns aside in `grader-returns/test/` before the grader writes (section C of
  `end-order-changes-2.md`). **The lane never writes into `LANE/grader-returns/` outside `test/`**, and never writes
  the returns themselves (the grader does).
- **Preconditions**: 2d passed; the grader's scorer files are hashed by the coordinator (ruling 88a).
- **Expected PASS evidence**: the grader refuses nothing in test mode; `write_result.py` exits 0 and its
  result.json carries `test: true` and the three returns' sha256. That a real-mode `write_result.py` refuses a
  return with the test flag set is covered by the unit test `r58c/B/tests/test_wr_refuses_test_return.py` (2d:
  `write_result.common` refuses a test tune, item-24 and held-out return in real mode, and all three checks pass
  the flag on; a mutant without the flag line lets the return through). Logs kept in `r58c/B/out/logs/` and listed
  in AUDIT.md section 9.
- **Stops the line**: any refusal by grader or write_result that the format does not explain; a mismatch is a
  format defect and is fixed HERE, before the freeze (both sides rerun 2e).

### 2f. The staging of the held-out inputs, before the freeze (lane; coordinator's order with ruling 89)

- **Commands** (agent A's `train/heldout_inputs.js`, as the coordinator passed them; from LANE in Git Bash):
  1. build: `node train/heldout_inputs.js build --plan train/stageB/plan.json --facts ../../build/facts/cache --common ../../build/arms/common --out heldout_inputs`;
  2. its check, with the staging manifest `heldout_inputs.sha256` (a sha256 line for every staged file):
     `node train/heldout_inputs.js check --plan train/stageB/plan.json --dir heldout_inputs --manifest heldout_inputs.sha256 --facts ../../build/facts/cache --common ../../build/arms/common` (exit 0);
  3. the graphs manifest, a sha256 line for every file of `export/graphs/<sha>/` and `export/graphs0/<sha>/` for
     the 70 held-out parents: `node train/heldout_inputs.js export-manifest --plan train/stageB/plan.json --export export --out heldout_export.sha256`.
  4. the tuning staging of ruling 94(b) (step 5's r4 mounts it instead of the build's facts cache): the late-50
     tuning parents only, `node train/heldout_inputs.js build --plan train/stageB/plan.json --facts ../../build/facts/cache --common ../../build/arms/common --out tune_inputs --split tune`;
  5. its check, with the tuning manifest `tune_inputs.sha256`:
     `node train/heldout_inputs.js check --plan train/stageB/plan.json --dir tune_inputs --manifest tune_inputs.sha256 --facts ../../build/facts/cache --common ../../build/arms/common --split tune` (exit 0).
  STAGING MANIFEST = `heldout_inputs.sha256`, GRAPHS MANIFEST = `heldout_export.sha256`, TUNE STAGING MANIFEST =
  `tune_inputs.sha256` (all lane-relative).
- **Rule (ruling 89 and the coordinator's order)**: copying and hashing is not training and not reading a graph in
  ruling 79's sense. **Nothing else opens the staging before step 7.** Nothing under `export/` is moved, changed
  or written (the graphs manifest only reads).
- **Preconditions**: 2a-2e passed; no `ktest-*` and no `kge-*` container runs.
- **Expected PASS evidence**: both checks exit 0; all three manifests exist, each line `<64 hex>  <path>`; the
  graphs manifest covers exactly the 70 held-out parents of `train/stageB/plan.json` (both folders each); the
  tuning staging holds exactly the late-50 tuning parents (its `MANIFEST.json` `parents`).
- **Stops the line**: any non-zero exit; a manifest with a missing parent.
- **All three manifests go into the freeze list** (step 3). **Step 5 verifies the tuning staging and step 7 the
  other two; neither builds anything.** Nothing but r4 (step 5) opens the tuning staging.

### 2g. The late-50 tuning rehearsal (lane, coordinator, grader; the coordinator's order after ruling 95) - ruled and done

**Ruled and done** (round 6): the coordinator ruled option (b): the hand-off writer takes the test stamp branch
only, under `if test`, and `cross_check.target` is left as it is. All four items have run: item 1 ktest-b56
(2026-11-15T01:35Z, exit 0; `r58c/B/REPORT-TEST-READY`); item 2 the late-50 TEST hand-off, sha256 e6b631e5... (313
tasks, PLACEBO); items 3 and 4 the coordinator graded it in test mode, exit 0, and its `tune_rank_check` found 96
figures with a largest difference of 0 against `train/report/test.json` (sha256 d78f637f...); the grader's
`tune-item24` return of this run is sha256 db31e7e9... (round 7, the coordinator; not dc9bc94c..., which is the pick8
return of 2e) and the lane has not opened it (below). The list stands as the record
of what ran; nothing in it is still to run.

- **Commands**, in this order, one container at a time behind the 6 GB / 40 GB rule:
  1. lane (agent B), host, from LANE: `KT_TRAIN_RW="selectB-test report" sh r58c/B/ktest.sh ktest-b<N> /w/r58c/B/rehearsal/report_test.sh`
     (`KT_TRAIN_RW` makes only `train/selectB-test` and `train/report` writable; the script runs `python selectB.py --test`,
     which restages `train/selectB-test/` (PLACEBO only, every table report.py reads), then `python report.py --test`
     as it is, which writes `train/report/test.json`; log `r58c/B/out/logs/report-test.log`). When it exited 0 the
     lane writes `r58c/B/REPORT-TEST-READY` (one line: UTC time and the sha256 of `train/report/test.json`);
  2. lane (agent A): the late-50 TEST tuning hand-off from `train/selectB-test` (test flag set, the 313 late-50
     tasks), whose `cross_check.target` names `train/report/test.json` with the sha256 of `REPORT-TEST-READY`;
     agent A waits for that file;
  3. coordinator -> grader: the hand-off's sha256; grader, test mode, tune-test on it; returns under
     `LANE/grader-returns/test/`;
  4. coordinator: its `tune_rank_check` of that `tune-rank.json` against `train/report/test.json` (per seed, seed
     mean, comparators; both scopes; four metrics; 1e-9, ruling 88b), the same check as step 5's
     (`orchestrator/tune_rank_check.js` sha256 e9f6d8785b35e0012751f9e4082ab7c3bbff61f42c9f8d05f57d5fe34bfb9ae6).
- **The lane never opens this run's returns**: its `tune-item24.json` holds comparator figures on the real late 50,
  and no answer-level figure on the full tuning set reaches the lane before the freeze. **Correction (round 6,
  agent B)**: the files of `grader-returns/test/` were last written at 2026-11-15T02:50Z (mtimes, read without opening
  them), and agent B's 2e re-run ktest-b84 (05:05Z) ran `write_result.py --test` on them: its log names
  `tune-item24.json` sha256 dc9bc94c..., this run's return. So the lane's 2e did read it, into
  `r58c/B/out/rehearsal/` (CONFLICTS.md note 30 (e); the coordinator rules). Round 6 runs no 2e and opens nothing
  in `grader-returns/test/`. **That correction was itself a mistake** (the coordinator, round 7; CONFLICTS.md note 30
  (e) CORRECTION): `dc9bc94c...` is the PICK8 `tune-item24` return (37 tasks, 8 commits; hand-off 17133176...), not
  this run's. This run's late-50 return (`db31e7e9...`) was moved to the grader's side at 02:48Z, before the pick8
  gradings wrote theirs at 02:50Z, so it was never in `grader-returns/test/` when ktest-b84 ran: the lane did not
  read it, and nothing went wrong. The sentence above stands only as the record of what was said in round 6.
- **Expected PASS evidence**: `report_test.sh` exit 0 with `RESULT PASS report-test` and `test.json` `test: true`;
  `REPORT-TEST-READY`; the coordinator's `tune_rank_check` line (largest difference <= 1e-9).
- **Stops the line**: a non-zero exit of `report_test.sh`; a hand-off naming another target or hash; a
  difference above 1e-9 (a format or harness defect, fixed before the freeze).

## 3. The code freeze (lane, then coordinator)

- **First, the tuning checkpoints' graphs manifest** (round 8, C11; host, from LANE; exit 0, else the line stops):
  `node train/heldout_inputs.js export-manifest --plan r58c/B/frozen/tune-graphs-plan.json --export export --out tune_graphs.sha256`
  (`r58c/B/frozen/tune-graphs-plan.json` is not a plan: its `heldout.assignment` keys are the 53 tuning checkpoints
  of `train/stageB/plan.json`, so agent A's export-manifest, called as it is, lists every file of
  `export/graphs/<C>/` and `export/graphs0/<C>/` for them; report.py, kge.py and evalcore.py read those graphs at
  steps 4 and 9.2, after the freeze).
- **Command** (lane, host, from LANE; one line):
  `sh r58c/B/freeze_list.sh heldout_inputs.sha256 heldout_export.sha256 tune_inputs.sha256 tune_graphs.sha256 > orchestrator/freeze-list.txt.part && mv orchestrator/freeze-list.txt.part orchestrator/freeze-list.txt`,
  then `sha256sum LANE/orchestrator/freeze-list.txt`. `freeze_list.sh` refuses, exit 2, unless all four manifests
  exist; 3 when an image ID differs; 4 when a listed file is missing; 5 when the tuning graphs no longer match
  `tune_graphs.sha256` (`heldout_inputs.js verify-export`); 6 (C4) when a path component in the lane is named
  `sealed` or a file in the lane matches `*reference*.jsonl` (the leak audit's `is_heldout_truth` would flag it;
  agent A's test variants must not leave `r58c/A/out/leak_test/sealed` behind). **Any non-zero exit stops the line**:
  the `.part` file is not moved, no `orchestrator/freeze-list.txt` is written, and the lane reports the exit and
  its message. The list is `<sha256>  <path relative to LANE>` for every
  script, test and input file a later step reads: the lane's code (`train/*.py`, `train/*.js`, `train/*.sh`,
  `train/HANDOFF-FORMAT.md`, `train/stageA_configs.json`, `train/stageB/plan.json`, `train/stageA/top3.json`,
  `train/stageA/refs.json`, `train/stageA/<arm>/<cid>/meta.json` and `reps.pt` of the selected configs),
  `eval/evalcore.py`, `eval/tune_tasks.jsonl`, `eval/comparators/*`, `export/*.py`, `export/*.jsonl`,
  `orchestrator/{assemble_checks.py, end_of_run.sh, guard-prelaunch.js, guard-stageB.sh, guard-stageB-r92.sh, memgate.sh, END-ORDER.md,
  grader-interface-v2.md}`, every assembled table file `train/stageB/tables/*`, `r58c/write_audit_claims.py`,
  every test file of 2d, the `r58c/B/*.sh` launchers, `r58c/B/rerun/rerun_check.py`,
  `orchestrator/{rerun_unit.py, rerun_compare.py}`, agent A's `r58c/A/*.py` and `r58c/A/*.sh` (`precheck_handoff.py`
  runs after the freeze, steps 5 and 8), every file of `r58c/B/eor/` (the end_of_run test), both mount lists
  `r58c/B/mounts-B.json` and `r58c/A/mounts-A.json` with their reader `r58c/B/mounts.js` (ruling 94(d)), **every
  file under `train/stageB/parts/`** by its own sha256 line (item22 and the leak audit read parts after the freeze;
  the freeze check also refuses a part file that appears or disappears), and **all three manifests of 2f** (the
  manifest files themselves; the files they name are verified against them before step 5 for the tuning staging
  and in step 7 for the held-out staging and graphs). **Round 8 adds**: `tune_graphs.sha256` and every tuning graph
  file it names (C11; so every freeze check hashes them), `r58c/B/frozen/tune-graphs-plan.json`, agent A's
  `r58c/A/mounts.js` (C10: `heldout.sh` builds kge-H1's mounts with it at step 7), `orchestrator/start-guard-r98.sh`
  (ruling 101(d)), both stage-B mount captures `orchestrator/kge-B1-inspect-20261114T190928Z.json` and
  `orchestrator/kge-B1-inspect-20261115T073116Z.json` (C7, ruling 101(e)), `r58c/B/e5_route_audit.py`, and in
  `# outside` every facts file of the 70 held-out parents (C16: step 7's `--facts` check compares the staging with
  them).
  After that block, a block **`# test output`** lists every file then under `train/report/` and
  `train/selectB-test/` (`*.part` excluded) with its sha256, so it is plain which files there are test output
  (`report.py --test`'s `train/report/test.json`, `selectB.py --test`'s tables; the coordinator, round 3); the freeze
  check checks it as block 1 (a listed file that changes after the freeze is a difference; the real steps write
  new files there: `tune.json`, `item22.json`, `answer_level/`).
  Files outside the lane (the frozen primary's options record, `build/tasks/tasks.jsonl`, the shared harness
  `arms/common/*.js`, the protocol `protocol-addendum-8.md`) are listed in a second block `# outside` with
  absolute paths, and a third block **`# images`** names both container images by ID:
  `sha256:55715543bc43c85e8426eb6934d9ba8196307b0ef0b0ccd357da85350ac97711  graphtest-kge:1` (CPU) and
  `sha256:a890c54808c11c460d910945c4bf981390f7de43c8dfc5840269b76f5861cbe7  graphtest-kge-gpu:1` (GPU)
  (`freeze_list.sh` prints all four blocks and refuses, exit 3, when either image's ID differs).
  The freeze check `sh LANE/r58c/B/freeze_check.sh` covers all four blocks (a bare `sha256sum -c` would warn on
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

- **Commands** (each one line; the writable folder is the step's mount list, `train/selectB` and `train/report`):
  `sh LANE/r58c/B/lane_step.sh ktest-r1 "python selectB.py"`, then
  `sh LANE/r58c/B/lane_step.sh ktest-r2 "python report.py"`.
- **Whose exit code**: the last-line rule of section 0 (the last line `ktest-r1: rc N; command: ...` is the
  script's; any other last line is `lane_step.sh`'s own 2, 4, 5, 6 or 9).
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

- **First, the tuning staging against its manifest** (host, from LANE; exit 0, else the line stops):
  `node train/heldout_inputs.js check --plan train/stageB/plan.json --dir tune_inputs --manifest tune_inputs.sha256 --facts ../../build/facts/cache --common ../../build/arms/common --split tune`.
- **Command** (lane, one line): `sh r58c/B/lane_step.sh ktest-r4 "python answer_level.py tune"` (ruling 94(b): its
  list mounts the tuning staging `tune_inputs/facts` read-only at `/build/facts/cache` and `tune_inputs/common` at
  `/build/arms/common`, never the build's whole facts cache; rulings 101(a) and 102: one read-only row per late-50
  tuning parent folder `export/graphs/<P>`, since `answer_level.py` scores the tasks absent from the CO tables
  through `evalcore.co_scores`, which opens the parent's graph; `train/report/answer_level` is its only writable
  folder; the last-line rule of section 0 says whose exit code it is). It writes the hand-off
  `train/report/answer_level/handoff/` with `ranked/<variant>_pool.jsonl.gz` and `_unrestricted` for all 40
  variants (grader-interface-v2 §2).
- **Pre-check** (lane, before the hand-off goes out): agent A's check of the grader's nine refusal checks on this
  hand-off, with `<H>` = `sha256sum train/report/answer_level/handoff/HANDOFF.json`:
  `sh r58c/B/lane_step.sh ktest-r8 "python /w/r58c/A/precheck_handoff.py --dir /w/train/report/answer_level/handoff --split tune --expect-sha256 <H>"`
  (exit 0; nothing writable: ktest-r8's list has no writable folder; it mounts the same 38 late-50 parent folders
  as r4, read-only, since the pre-check opens the parents' graphs, rulings 101(a), 102). A refusal here stops the line
  before the coordinator sends any hash.
- **Coordinator -> grader**: the sha256 of the hand-off's `HANDOFF.json`. **Grader**: verifies every listed
  file, grades, writes `LANE/grader-returns/tune-rank.json` and `LANE/grader-returns/tune-item24.json`.
- **Coordinator, the grader's bytes**: compares each return's `scorer.files_sha256` with its own `grader_frozen`
  line (step 3); **a difference stops the line** (the grader graded with bytes other than the frozen ones).
- **Coordinator**: compares `tune-rank.json` `rank` with `train/report/tune.json` (late 50: per seed, seed mean
  `<ARM>_<KIND>_mean`, comparators; both scopes; four metrics) to 1e-9 (`orchestrator/tune_rank_check.js`, sha256
  e9f6d8785b35e0012751f9e4082ab7c3bbff61f42c9f8d05f57d5fe34bfb9ae6: it compares the main rows `<ARM>_alone` and
  `<ARM>_fused` (per seed and seed mean) and the comparators; the report's `_builder` and `_w...` rows are lane-only and
  not compared; at full size 416 figures: 52 rows x 2 scopes x 4 metrics), and
  records the result in `progress.jsonl` as unit **`tune_rank_check`**, in the form `item27.py` reads:
  `{"step":"coordinator","unit":"tune_rank_check","status":"accepted: <what agreed, to 1e-9>","file":"LANE/grader-returns/tune-rank.json","sha256":"<64 hex>","handoff_sha256":"<64 hex>","t":"<UTC>"}`,
  where `sha256` is sha256(`grader-returns/tune-rank.json`) and `handoff_sha256` is the sha256 of the hand-off's
  `HANDOFF.json` the grader graded (round 8, C15: the field is new). `item27.py` (step 6) refuses, exit 10, unless
  the LAST such line's status starts with `accepted`, it comes after the last `code_freeze` and `tune_report`
  lines, its `sha256` equals the sha256 of `grader-returns/tune-rank.json` (mounted read-only in ktest-r3), and its
  `handoff_sha256` equals both the current `train/report/answer_level/handoff/HANDOFF.json`'s sha256 and the
  `handoff_sha256` that `tune-rank.json` itself records; so a stale accepted line cannot pass the 1e-9 gate.
- **Preconditions**: freeze check; step 4 passed and the coordinator's `tune_report` line exists; the tuning
  staging check above exited 0.
- **Expected PASS evidence**: both returns exist with `split` tune, `test` false, the hand-off's sha256 and
  `scorer.files_sha256` equal to `grader_frozen`; the coordinator's line says every value agrees to 1e-9.
- **Stops the line**: a difference above 1e-9 stops the work until it is explained (ruling 88b); a grader
  refusal; a `scorer.files_sha256` other than `grader_frozen`.

## 6. item27 and the coordinator's anchor (lane, then coordinator; ruling 80)

- **Command** (one line): `sh LANE/r58c/B/lane_step.sh ktest-r3 "python item27.py"` (no option; `train/heldout`
  is its only writable folder). **Whose exit code**: the last-line rule of section 0.
- **Preconditions**: freeze check; step 5's accepted `tune_rank_check` line, bound to these bytes as step 5 says
  (round 8, C15: after the last `code_freeze` and `tune_report` lines; its `sha256` = sha256 of
  `grader-returns/tune-rank.json`, mounted read-only in ktest-r3 at `/w/grader-returns/tune-rank.json`; its
  `handoff_sha256` = the current hand-off's `HANDOFF.json` = the return's own `handoff_sha256`); item27.py refuses
  without it, exit 10 (test `r58c/B/tests/test_item27_trc.py`: ten refusals and the good case; fail-before
  `r58c/B/pre-r101/item27.py`); `train/heldout/` holds no part and no progress line.
- **Expected PASS evidence**: `train/heldout/item27.json` and `item27.json.sha256`; the record carries
  `chosen`, `tables_digest` (equal to step 1's), `code_sha256` (CODE includes `train/report.py`), `pins`
  {relpath: sha256} (code list, `train/stageA_configs.json`, `eval/evalcore.py`, the task list, the shared
  harness files, the primary's options record) and `tuning_inputs` {relpath: sha256} (`eval/tune_tasks.jsonl`,
  the comparator tables, the candidate files) (ruling 84), `report_sha256`/`tune_sha256` and `test: false`.
- **Coordinator, before the anchor**, checks the record: sha256(`train/heldout/item27.json`) equals
  `item27.json.sha256`; its `tables_digest` equals the coordinator's `tables_digest` line (step 1); every hash in
  `code_sha256` and `pins` equals the freeze list's line for that file, compared **by content hash whatever the path
  form** (a pin outside the lane is named `../../build/...` in the record and by its absolute path in the freeze
  list's `# outside` block: the hash decides, not the spelling); `chosen` equals the all-65 choice in
  `train/report/tune.json`; `test` is false. **If one check differs, the coordinator does not anchor and the
  line stops.**
- **Coordinator**: then appends `{"step": "coordinator", "unit": "item27_freeze", "file": "train/heldout/item27.json",
  "sha256": "<64 hex>", "t": "<UTC>"}` to `progress.jsonl`.
- **Stops the line**: any non-zero exit (2 option or override, 3 guard, 4 assembly, 5 selectB disagrees,
  6 a held-out unit or a record exists, 7 digest differs, 9 a pinned or tuning input file missing (ruling 84),
  10 no accepted `tune_rank_check` line (ruling 88b) or one not bound to the current return and hand-off (C15)), read by the last-line rule (a last line other than
  `ktest-r3: rc N; command: ...` is `lane_step.sh`'s own code). **A change of the chosen arm, configuration, w or
  epochs after the first anchor is never allowed** (ruling 85).

## 7. Staging, its manifest check, and the single held-out run (lane)

- **Commands** (agent A's; from LANE in Git Bash): **it builds nothing**. First the two verifications, each exit 0:
  `node train/heldout_inputs.js verify-export --plan train/stageB/plan.json --export export --manifest heldout_export.sha256` (the held-out
  parents' graph folders against the graphs manifest of 2f) and the check of 2f,
  `node train/heldout_inputs.js check --plan train/stageB/plan.json --dir heldout_inputs --manifest heldout_inputs.sha256 --facts ../../build/facts/cache --common ../../build/arms/common` (the staged
  files against the staging manifest); both manifests are in the freeze list, so the freeze check covers their
  bytes. A non-zero exit of either stops the line. Then `sh train/heldout.sh`, which launches ONE container `kge-H1`.
- **Preconditions**: freeze check; the anchor line of step 6; no `kge-*` container; C: >= 15 GB; ruling 79's
  memgate (free >= 6 GB, commit < 38 GB). **If `train/heldout/HANDOFF.json` exists, `heldout.sh` is not run
  again**: the lane reports to the coordinator (the held-out run has already finished). `heldout.sh` runs the
  freeze check `r58c/B/freeze_check.sh` itself before it starts (exit 8 when it fails), not a bare `sha256sum -c`.
- **Expected PASS evidence**: `train/heldout/heldout.rc` = 0, `train/heldout/HANDOFF.json` (with the anchor
  line copied in), the mount record `r58c/mounts/kge-H1.json` (and the card check's), the append-only launch log
  `heldout-launch/kge-H1-launch.log` outside `train/heldout`.
- **Stops the line**: any non-zero rc. **Ruling 85**: "If the held-out run stops on a code defect after the
  freeze, the lane changes nothing and reports. The coordinator may then rule a fix; the record is written
  again with the same arm, configuration, w, epochs and tables digest, the coordinator anchors it naming the
  record it replaces, both records and every log are kept, and the result says so. A change of the chosen arm,
  configuration, w or epochs after the first anchor is never allowed." **The frozen bytes do not support that
  re-anchor path** (`heldout.py` wants exactly one anchor line; `item27.py` refuses when a record exists, exit 6), so
  it always needs a coordinator ruling that names the files it may change. A stop that is not a code defect (a
  reset, a stopped container) is resumed by running the same command again; finished units are kept.
  **A memory kill** (ruling 101(c), C13): `kge-H1` exiting 137 (killed for memory under its 4 GB cap) is such a
  stop, not a code defect: the lane reports it, then runs the same command again (`sh train/heldout.sh`, after the
  two verifications above), and the finished units are kept; a launch that finishes no unit is reported to the
  coordinator before another try.

## 8. Hashes to the coordinator, then the grader (lane, coordinator, grader)

- **Pre-check** (lane, before the hashes go out): agent A's check of the grader's nine refusal checks on the
  held-out hand-off, with `<H>` = `sha256sum train/heldout/HANDOFF.json`:
  `sh r58c/B/lane_step.sh ktest-r9 "python /w/r58c/A/precheck_handoff.py --dir /w/train/heldout --split heldout --expect-sha256 <H> --freeze /w/train/heldout/item27.json"`
  (exit 0; ktest-r9's list has no writable folder; rulings 101(a), 102: it mounts, read-only, one folder
  `export/graphs/<P>` per held-out parent of the plan's `heldout.assignment` (70) and `/build/tasks/tasks.jsonl`,
  since the pre-check opens the task list and each parent's graph; this is after the held-out run and is a check of
  the hand-off, not training or ranking); it reads the hand-off and changes nothing. A refusal here
  stops the line (the last-line rule of section 0 says whose exit code it is).
- **Lane**: gives the coordinator `sha256 train/heldout/HANDOFF.json`, the item27 record's sha256 and **the path
  of the append-only launch log** of step 7.
- **Coordinator**: checks the launch log first: **one or more start lines, all for the same record**, and rc 0.
  The record's sha256 is read from the `start` progress lines in `train/heldout` (their `freeze_sha256`), and
  every one must equal the item27 record's sha256. Only then the grader gets anything.
- **Coordinator**: passes both hashes to the grader (ruling 88e: the grader takes them from the coordinator, never
  from a lane file). **Grader**: refuses a difference, verifies every file hash, refuses a test flag, the
  wrong variant or task set, a second held-out grading; writes `LANE/grader-returns/heldout.json` with `vs_RRF`
  and `literal_check` (grader-interface-v2 §6).
- **Coordinator, the grader's bytes**: compares `heldout.json`'s `scorer.files_sha256` with its `grader_frozen`
  line (step 3); **a difference stops the line**.
- **Expected PASS evidence**: `heldout.json` with `split` heldout, `test` false, `tasks` 418, `commits` 75, the
  two hashes, `literal_check` {tasks 418, task_commit_in_checkpoint_history 0, parent_mismatch 0}, and
  `scorer.files_sha256` equal to `grader_frozen`.
- **Stops the line**: a grader refusal; a `literal_check` count other than 0; a `scorer.files_sha256` other than
  `grader_frozen`.

## 9. Leak audit, item 22, the E5 route audit, write_result, AUDIT.md and CLAIMS.md (lane)

1. **Leak audit with the containers' mount records** (agent A's options, as the coordinator passed them):
   `sh r58c/B/lane_step.sh ktest-r10 "python leak_audit.py --repo /repo --facts /build/facts/cache --heldout-tasks /build/tasks/tasks.jsonl --lane-host C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings --host-map C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build=/build --scripts /w/orchestrator/guard-stageB.sh,/w/orchestrator/guard-stageB-r92.sh,/w/train/heldout.sh --mounts /w/orchestrator/kge-B1-inspect-20261114T190928Z.json,/w/orchestrator/kge-B1-inspect-20261115T073116Z.json,/w/r58c/mounts,/w/r58c/A/mounts-A.json,/w/r58c/B/mounts-B.json --self ktest-r10 --parts tune=/w/train/stageB/parts,heldout=/w/train/heldout/parts"`
   (one line; `train/leak_audit` is its only writable folder. It reads stage B's two `docker inspect` captures (the
   19:09Z one and the coordinator's 4 GB one of 07:31Z, ruling 101(e), C7; both in the freeze list), every
   record in `r58c/mounts/` (agent A's `kge-H1P`, `kge-H1R`, `kge-H1` and agent B's `ktest-r<N>`, `kge-R1`,
   `ktest-eor`), both mount lists of ruling 94(d), and both stage-B guards for ruling 92's check; it never reads
   `r58c/B/out/mounts-test/` (the TEST records of section 0). `--self` names its own container: `lane_step.sh` saves
   `r58c/mounts/ktest-r10.json` before its release, so the audit's own record exists while it runs, and `--self`
   says which record that is). **Ruling 101(b)**: the audit classifies the mount rows of the containers it has to
   judge and of the listed truth locations, and lists every other mount row by name without walking it. Ruling 95: the audit checks the records of the containers that ran before it (the
   card window and steps 4 to 8: `kge-H1P`, `kge-H1R`, `kge-R1`, `ktest-r1`..`ktest-r4`, `ktest-r8`, `kge-H1`,
   `ktest-r9`) and fails when one is missing or shows a mount outside its list; `ktest-r5`, `ktest-r11`, `ktest-r6`
   and `ktest-r7` run after it, so their records cannot exist yet and are not its inputs (their steps 9.2-9.4 are
   outside its scope). `ktest-eor` (step 1) ran before it but is outside ruling 95's "card window and steps 4 to
   8": the audit lists its record and does not judge it (CONFLICTS.md note 34 asks whether it should). For r4,
   r8 and r9 it compares each record's graph-folder rows with the plan's parent sets (ruling 102). **Evidence**: `train/leak_audit/leak_audit.json` `ok: true`, `test: false`, this
   plan's `plan_hash`; its `disclosure81.text`, `ruling89.text`, the ruling-90 listing `ruling89.ruling90_sites`,
   `ruling92.text` and `ruling94` (`ok`, `text`, one row per record). Whose exit code: the last-line rule.
   **The verdict, not the exit code** (round 6): `leak_audit.py` exits 0 on a FAIL verdict, so after a command
   code of 0 `lane_step.sh` reads `train/leak_audit/leak_audit.json` itself: it must be modified after the step
   started, parse, and say `ok: true` and `test: false`; otherwise `lane_step.sh` exits 10 (its own code; last line
   `lane_step: exit 10 (step 9.1 verdict not a pass: <reason>; the audit exited 0)`, after the command's rc line). A
   pass logs `step 9.1 verdict: train/leak_audit/leak_audit.json sha256 <64 hex>: ok true, test false` before the
   rc line. `leak_audit.py` is not edited. Test: `r58c/B/tests/test_r10_verdict.sh` (host, stubs, 27 checks since round 8; a FAIL
   verdict with exit 0 is refused by the after bytes and passed as 0 by the before bytes `r58c/B/pre-r98/lane_step.sh`).
   **Three checks of the verdict, each on its own** (round 8): (i) `lane_step.sh` exit 10 here, as above; (ii)
   `write_result.py --final` (step 9.3) refuses, exit 10, unless `leak_audit.json` says `ok: true` and its `test`
   field is `False` (a missing field is a refusal); (iii) `write_audit_claims.py` (step 9.4) refuses, exit 29
   (LEAK_AUDIT_FAIL), unless `ok` is `true` and `test` is exactly `false`: a missing or non-False `test` field is
   refused (round 8; test `r58c/B/tests/test_write_audit_claims.py`
   `r101_real_run_refuses_leak_test_missing_or_not_false`, fail-before `r58c/B/pre-r101/write_audit_claims.py`).
2. **item 22** (one line): `sh LANE/r58c/B/lane_step.sh ktest-r5 "python item22.py"` (container needs torch;
   CPU; its list mounts what stage A used, `train`, `eval`, `export`, with `train/report` writable). **Evidence**: `train/report/item22.json` with `test: false`, `plan_hash`,
   `refs_sha256` (sha256 of `train/stageA/refs.json`) and every arm's `check_predict_target`; E5 fails when no
   specialist was compared.
   **2a. The E5 route audit (step 9.2a; ruling 97 (b), (d); `orchestrator/coordinator-rulings-97.md`)** (one line):
   `sh LANE/r58c/B/lane_step.sh ktest-r11 "python /w/r58c/B/e5_route_audit.py"` (it takes no option; after the
   grader's returns and the leak audit, like item 22, and before write_result; it adds nothing to the held-out run
   and changes no frozen code). Its fixed list (ruling 94) mounts `train`, `eval` and `export` read-only, the script,
   the task file alone, and only `train/report/e5_route` writable; limit `LIMIT_R11` 1800 s. It reads
   `train/heldout/item27.json`; when the frozen arm (`chosen.arm`) is E5, for every held-out task of the chosen
   setting (seed 1's `train/heldout/parts/E5/<cid>/s1/<C>/counts.json`; the routing does not depend on the seed)
   it calls **kge.py's own `kge.route`** (imported, not copied) on the task's parent graph (`kge.read_graph`,
   `kge.neighbours`, as `kge.score` calls them) with the task's file seed from the task file, and counts the tasks
   whose second routed specialist is `other` (`second_other`) and the tasks where a routed specialist is skipped
   (`skipped`: its area holds no co_changed triple at the checkpoint, `kge.area_triples`, which is when
   `kge.train` gives it no `rco` and `kge.score` skips it); for any other frozen arm it computes no count
   (`applies: false`). For ruling 97 (d) it takes the median pool size (`pool.cands`) of the late-50 tuning tasks
   from the chosen setting's `train/stageB/tables/<arm>_<cid>_s1_counts.json` and of the held-out tasks from the
   same parts' counts. **Evidence**: exit 0; `train/report/e5_route/e5_route.json` with `test: false`, `arm`,
   `config_id`, `item27_sha256` (sha256 of item27.json), `applies`, `route` {tasks, two_specialists, second_other,
   skipped, skipped_second_other, skipped_first, parents, checkpoints} (null when not E5), `pool` {late50, heldout:
   {tasks, median}}, `kge_sha256`, `self_sha256`; exits 2 usage (any option in the real run), 3 an input missing or
   of the wrong shape (a held-out task without a held-out row of the same parent in the task file, no parts, no
   stage-B counts file), 4 the output exists (it runs once). Its record `r58c/mounts/ktest-r11.json` is saved
   after the leak audit and listed in AUDIT.md section 9 (ruling 95). Test: `r58c/B/tests/test_e5_route_audit.py`
   on a stand-in graph (every count worked out by hand; `kge.route` replaced in-process changes the counts; a
   mutant skip rule is told apart). Whose exit code: the last-line rule.
3. **write_result** (one line): `sh LANE/r58c/B/lane_step.sh ktest-r6 "python write_result.py --final"` (ruling
   94(c): the deliverable folder writable at `/repo/docs/program/evidence/harness-bottlenecks/graph2/embeddings` and
   the protocol file read-only at its `/repo/...` path; the repository itself is not mounted). **Preconditions**: all three grader returns
   exist in `LANE/grader-returns/`; item22.json and answer_level.json exist. **Evidence**: exit 0, RESULT.md
   under 150 lines, result.json with `write_result_sha256` and every input's sha256; beside each variant's figures the
   count of tasks absent from its table (ruling 91), from the tuning hand-off and HANDOFF.json (exit 10 when
   either lacks the count in the format's shape); the leak-audit line carries `ruling92.text`; the limits carry
   **ruling 96 (c)** as a difference between the splits, word for word from the protocol's paragraph 96: "the
   held-out graphs carry a layer the tuning graphs lack, so the settings were chosen on graphs without it", with its
   counts as paragraph 96 gives them (one relation type and two node kinds, 69 of the 70 parents, "37 relation
   types against 36"), and **in the same bullet ruling 99's correction, word for word from the protocol's paragraph
   99**: "Rulings 96 and 97 give the relation types as "37 against 36". The right figures are 36 against 35, the
   changed-together relation included in both: ..." (round 8, C9; `write_result.r96_limit`, the regex `R99`), so the
   bullet count and the worst case of 149 lines are unchanged (test_write_result
   `c9_line_count_unchanged_against_pre_r101`, 149 = 149); the right counts are therefore **36 relation types
   against 35**. A protocol without the (c) clause, its counts or paragraph 99's correction is a refusal (exit 10),
   and CLAIMS.md maps the line, the correction included, to the protocol (its 96(c) note names paragraph "99. ").
   The limits carry **ruling 97** as ONE bullet (the worst case of RESULT.md is then 149 lines, under the cap):
   (b) E5's routing change on held-out, named in every case, word for word from the protocol's paragraph 97 ("a
   file seed tied to the new nodes can get the `other` specialist as its second one, and that specialist is skipped
   where it has no co_changed fact", and "This is item 13's rule applied to a graph with a new layer, not a
   defect"), with the route audit's two counts when E5 is the frozen arm, or "the frozen arm is X, not E5"; (d) the
   protocol's sentences on the file-collapsed graph ("Pools on held-out are therefore wider, for every method alike")
   with the median pool size of the late 50 beside the held-out one, from e5_route.json; and under (d), **D1**
   (`r58c/closed-lists/FINDINGS-common.md`, sha256 d32cecb5...): "On held-out, the PPR comparator and the PPR half
   of every fused variant walk through the new hub. Their orders, and with them what each budget packs, therefore
   change on graphs the settings never saw, alike for every arm's fused form." result.json carries the three parts
   (`limits.97`) and `route` (the audit's counts). The real run refuses (exit 10) when the protocol lacks the (b) or
   (d) text (`write_result.r97_texts`), or when `train/report/e5_route/e5_route.json` is missing, a test output, or
   names another item27.json; CLAIMS.md maps the protocol texts, both counts, both medians and D1.
   The limits carry **rulings 43 and 98 as ONE bullet** (round 6): ruling 43's paragraph and ruling 98's, word for
   word from the protocol (`write_result.r98_limit`); result.json `limits.43` and `limits.98`. Ruling 43 was in no
   limit before. To keep the worst case at 149 lines (note 23: the cap is not raised) the blank line after the limits
   heading is dropped, so the heading is followed by its first bullet. A protocol without either paragraph prints
   `Rulings 43 and 98: TEXT NOT FOUND in <protocol>`, as the other listed rulings do; CLAIMS.md maps the bullet
   to the protocol (`- Rulings 43 and 98 (text)`).
   **SR-8** (round 8): in item 22's line, an E5 specialist for which `item22.json` holds only a `note` (no
   co_changed fact, so nothing was compared) reads `not compared (no co_changed)`, never a dash or "identical"
   (test_write_result `sr8_note_reads_not_compared`; fail-before `sr8_fail_before_pre_r101_prints_dash_identical`).
4. **AUDIT.md and CLAIMS.md** (one line, no break inside the quotes):
   `sh LANE/r58c/B/lane_step.sh ktest-r7 "python /w/r58c/write_audit_claims.py --outdir /repo/docs/program/evidence/harness-bottlenecks/graph2/embeddings"`
   (it takes no other option; its list mounts the deliverable folder writable and the protocol file read-only,
   ruling 94(c), plus the section-9 evidence: `r58c/rehearsal/`, `heldout-launch/`, `r58c/B/out/rehearsal/`,
   `r58c/mounts/` and both mount lists; the grader returns are read from `LANE/grader-returns/`, the task file from
   the `/build/tasks/tasks.jsonl` mount; exit codes 20-36 named in the script's docstring; 34 = a mounted task row
   carries a truth-like key; 35 = the section-9 evidence is incomplete: no `r58c/rehearsal/REHEARSAL.txt` ending in
   `RESULT PASS rehearsal`, no 2e `result.json` with `test: true`, no `r58c/B/mounts-B.json`, or a container of it
   without its `r58c/mounts/<name>.json`, its own `ktest-r7` excepted, ruling 95). **Evidence**: exit 0;
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
   failed (text from leak_audit.json `ruling90.text` when the audit writes one, else the protocol's paragraph 90),
   and one line gives leak_audit.json `ruling92.text` (both stage-B guards' docker run lines equal apart from the
   disk values) with its check's `ok`, and then **E1 as a note** (`r58c/closed-lists/FINDINGS-common.md`):
   "`ranked_sha` (build/arms/common/harness.js:384) hashes integer node ids, which shift when the new nodes sort in
   (facts.js:62-63). No lane or common code compares it." **AUDIT.md section 9** (ruling 86(b); ruling 94(e), (f); ruling 95): 9a the 2b
   rehearsal's logs and container records and 9b the 2e interface rehearsal's files and log, each with its sha256,
   and what the rehearsals cannot cover (the real item-27 record and its anchor, the 70 real held-out graphs, the
   real run's wall time); 9c every container of both mount lists with its mount record(s) and sha256, earlier
   records of the same container (`r58c/mounts/<name>.<UTC>.json`) and stage B's capture, among them the records of
   item 22 (`ktest-r5`), the E5 route audit (`ktest-r11`, step 9.2a) and the result writer (`ktest-r6`), saved after
   the leak audit ran (ruling 95); NOT its own
   record (`ktest-r7`, step 9.4) or an earlier one of it: its row says "not listed" and a **Ruling 95** line names
   the split; and the ruling-94(f) note naming every container that mounts `export/` (or a file or folder under
   it) with its rows; round 8 (ruling 102): the graph-folder rows of ktest-r4, r8 and r9 are counted, not listed
   (`38 export/graphs/<P> folders, read-only (ruling 102)`, 70 for r9; `write_audit_claims.export_dsts`; test
   `r102_export_note_counts_graph_folders`, fail-before `r102_fail_before_pre_r101_lists_every_graph_folder`).
   The real run refuses, exit 29, unless leak_audit.json has `ok: true` and `test` exactly `false` (step 9.1 (iii)). **AUDIT.md section 7b**
   (ruling 98, round 6): which stage-B units ran under which memory cap: ruling 98's paragraph; the source
   (`orchestrator/guard-stageB.log` and `train/progress.jsonl`, each with its sha256, both in the Inputs table, read
   from the existing read-only mounts `/w/orchestrator` and `/w/train`); every guard start with its cap; the units
   done per cap; per setting the units and the largest peak RSS under each cap; the units under the smaller-count
   cap by setting/seed with their checkpoint ids (every other unit ran under the other cap); and any unit with done
   lines under two caps (the last done line decides). The real run refuses with 36 (CAP_TABLE) when no guard start
   names a cap, the starts are out of order or a done line precedes every start, and with 20 when either file is
   missing; a test run refuses either real file (31). Whose exit code: the last-line rule.
- **Stops the line**: any refusal (e5_route_audit 2-4; write_result 2, 8-14; write_audit_claims 2, 20-36); the leak
  audit `ok: false` or a `test` other than `false` (any of the three checks of 9.1);
  any of `lane_step.sh`'s own codes (2, 4, 5, 6, 9, 10; the last-line rule of section 0).

## 10. The independent audit and the refuter (coordinator)

- The coordinator starts an independent audit session and a refuter on the deliverable folder, the logs and
  the freeze list; the lane answers questions and changes nothing listed without a ruling.
- **Ruling 95**: the independent audit checks the audit writer's own record, `r58c/mounts/ktest-r7.json`, and its
  launcher line (`r58c/B/lane-steps/ktest-r7-<stamp>.log`, the full `docker run` line) against `ktest-r7`'s fixed
  list in `r58c/B/mounts-B.json` (`node r58c/B/mounts.js check r58c/B/mounts-B.json` and the record's `Mounts`); AUDIT.md
  does not list that record.
- **Evidence**: their written verdicts, recorded by the coordinator in `progress.jsonl`.

---

## Names (all final after the 2026-11-14 reset)

- final (not in this list any more): the ruling-87 line is unit `preflight_e4_det` (step 0, recorded and
  accepted); the coordinator's units `tables_digest` (step 1), `code_freeze` and `grader_frozen` (step 3),
  `tune_report` (step 4), `tune_rank_check` (step 5, accepted), `item27_freeze` (step 6); the `ktest-r<N>` prefix
  for real steps (accepted; it takes the lane lock); agent B's scripts and options `end_of_run.sh`, `selectB.py`,
  `report.py`, `item27.py`, `item22.py`, `write_result.py` (`--test`, `--final`), `r58c/B/lane_step.sh`,
  `r58c/B/freeze_list.sh` (four manifest arguments since round 8), `r58c/B/freeze_check.sh`, `r58c/B/ktest.sh`, `r58c/B/rerun_check.sh` with
  `r58c/B/rerun/rerun_check.py` (container `kge-R1`), the mount lists `r58c/B/mounts-B.json` and `r58c/A/mounts-A.json`
  with their reader `r58c/B/mounts.js`, the records folder `r58c/mounts/`, the tuning staging `tune_inputs/` with
  `tune_inputs.sha256`, and the 2e wrapper `r58c/B/tests/wr_rehearsal.sh`;
- **ruling 94** (the fixed mount list per step) is in `orchestrator/coordinator-rulings-94.md` and at the end of the
  protocol's section M (`protocol-addendum-8.md`); this file applies it in section 0 and steps 2c, 4-9;
- **nothing remains open**: agent A's command lines (steps 2a, 2b, 2f, 5, 7, 8, 9.1) are in place as the coordinator
  passed them after the 2026-11-14 reset; the `ktest-r<N>` numbers are r1 selectB, r2 report, r3 item27, r4
  answer_level, r5 item22, r6 write_result, r7 write_audit_claims, r8 and r9 the pre-checks, r10 the leak audit,
  r11 the E5 route audit (ruling 97, step 9.2a).
  The ruling-91 key is settled:
  `absent_tasks`, `{<variant name>: {"pool": n, "unrestricted": n}}` (`train/HANDOFF-FORMAT.md` version 2,
  revision 1d, sha256 8d3a03ae0f655369ed74e830a5590cdf910a8cf55f288b09bf6ad38327ccf732 as agent A's READY-format
  revision 5 gives it; section 1 item 10; refusal 8 reads "the task's file seed is among the answer's seeds, and
  parent equals the task row's"), read by `write_result.py` as `ABSENT_KEY`; any other shape is a refusal
  (exit 10).
