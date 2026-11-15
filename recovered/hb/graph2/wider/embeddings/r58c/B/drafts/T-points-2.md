# T-points-2: T2-0 under the coordinator's three conditions (agent B, 2026-11-15)

This file extends `r58c/B/drafts/T-points.md` (sha256 bb2880fd...). That file is unchanged; "new files only".

- T1 (T1-a, T1-b) and T3 (T3-a, T3-b) stand as drafted there. They are accepted.
- This file replaces T-points.md's **T2-0** (the kt_inner change), its **T2-a new text** and its **T2-b new row**.
- T2-c and T2-d stand.

Nothing in the lane is changed. The real `r58c/B/tests/kt_inner.sh` (eb61c76d) is untouched.

## T2-0, the proposed file

- The full proposed file is `r58c/B/drafts/kt_inner.sh.proposed`, sha256
  d78f343aa943b4c4f1c975d26cd29ee1c3742827711b85ae9fb71843bef3027c.
- Its diff against the current file is `r58c/B/drafts/kt_inner.sh.diff` (unified), sha256
  b8ff13e248eae682a0c6f73f0128887ff18744301fe452182c53bf78f7dd4572.
- The proposed file parses (`sh -n`, host, nothing run).
- Its embedded python (the `MEASURE` wrapper) cannot be compiled on the host: there is no python there. The first
  container run is its first compile; see the fail-before, step 3.
- Applied, the file replaces `r58c/B/tests/kt_inner.sh`. The current bytes go to `r58c/B/pre-r105/kt_inner.sh` first.

What changes (proposed-file line numbers):

- Lines 5-12, header: names the three routes and what each prints.
- Lines 56-59, routes:
  - `test_r53_58_unit` and `test_e5_equiv` go to `/w/fixes/tests/<name>.py`.
  - `test_r64_fixes` goes to `/w/fixes/tests/test_r64.py`.
  - `test_r64` still goes to `/w/r58c/tests/test_r64.py`.
- Lines 66-70, evidence lines (condition 2).
- Lines 74-79, run lines (conditions 1 and 3).
- Lines 16-47, the `MEASURE` wrapper (condition 3).
- Line 83: the summary line also carries the MEASURED / OVER-LIMIT lines.
- No other route, run line, timeout or limit changes.

### Condition 1: output only under $BOUT/<name>

- `test_r53_58_unit`: `OUT=$BOUT/test_r53_58_unit` (line 74). The test writes `OUT/r53_58`, i.e.
  `r58c/B/out/test_r53_58_unit/r53_58`.
- `test_e5_equiv`: `OUT=$BOUT/test_e5_equiv` (line 76). The test writes `OUT/e5_equiv/result.json`; the wrapper writes
  `$BOUT/test_e5_equiv/measure.json`.
- `test_r64_fixes`: writes nothing. `fixes/tests/test_r64.py` opens no file for writing; with `post` it imports
  `train/selectB.py` and prints.
- Nothing is written under `train/`, `fixes/` or any real output folder. ktest.sh mounts `/w/train` and `/w/fixes`
  read-only in any case, and its only writable mount is `r58c/B/out` (= `$BOUT`).
- The test defaults (`/w/fixes/tests/out/<CODE>/...`) are never used: OUT is always set.
- kt_inner's `DROP_OUT=1` already removes `$BOUT/<name>` (line 88, unchanged).

### Condition 2: each log shows the sha256 of the test file and of the file under test, plus RESULT PASS

Every log opens with kt_inner's existing line `sha256 <hex> <test file>` (line 65), for example
`sha256 <hex> fixes/tests/test_e5_equiv.py`. The route then adds:

- `test_r53_58_unit` and `test_r64_fixes` (line 67): `sha256 <hex> train/selectB.py (under test)`.
- `test_e5_equiv` (lines 68-69):
  - `sha256 <hex> train/kge.py (under test)`.
  - Two more lines, marked "(read by the test)" and not asked for, so the log pins every byte it depends on:
    `sha256 <hex> train/stageB.py` (its `load_tasks`, `load_cands`) and `sha256 <hex> train/stageA/E5/c01/reps.pt`
    (the frozen stage-A model).

RESULT lines: all three old tests already print `RESULT PASS|FAIL <name> ...`:

- test_r53_58_unit, its last line;
- test_r64, its last line;
- test_e5_equiv, its last line.

So the route prints no RESULT line of its own. kt_inner's existing rule (line 84) counts a test as passed only on
rc 0 **and** a `^RESULT PASS` line.

### Condition 3: the first 2d run of test_e5_equiv records measured time and peak memory; over a limit is reported, no limit raised

- test_e5_equiv runs under the `MEASURE` wrapper (lines 21-47, run at line 76).
- The wrapper runs the test as a child with **the same 560 s limit** every kt_inner test has (`timeout=560`; unchanged,
  not raised). It then writes, to the log and to `$BOUT/test_e5_equiv/measure.json`:
  ```
  MEASURED wall_s <s> (limit 560) peak_rss_mb <MB> cgroup_peak_mb <MB> cap_mb <MB> rc <rc>
  ```
  - `peak_rss_mb`: getrusage RUSAGE_CHILDREN, the largest waited-for process (the method of `r58c/B/timing/mem_run.py`).
  - `cgroup_peak_mb`: the container's own `memory.peak`.
  - `cap_mb`: `memory.max`, which reads 1536.
- Over a limit it prints `OVER-LIMIT <time|memory|killed>: reported to the coordinator; no limit is raised`, and the
  test fails (exit 1 when the test itself passed, else the test's code; 124 on the time limit). The cases:
  - **time**: the 560 s limit was hit.
  - **memory**: the container's peak came within 8 MB of the 1536 MB cap, that is at the cap.
  - **killed**: the child died of a signal, for example the kernel's OOM kill.
- Two backstops cover the case where the wrapper itself dies, with no MEASURED line (lines 77-78):
  - `timeout 570` around the wrapper prints `OVER-LIMIT time` on rc 124.
  - rc 137 (the wrapper killed, the 1536 MB cap) prints `OVER-LIMIT memory`.
- The step then stops and I report the MEASURED (or OVER-LIMIT) line to the coordinator. I raise no limit: not 560 s,
  not 580 s, not 1536 MB.
- **test_e5_equiv runs alone in its own container**, so that `cgroup_peak_mb` is its own peak and ktest's 580 s
  container limit covers it alone. test_r53_58_unit and test_r64_fixes run together in a second container.

## T2-a, new text (replaces the new text of T-points.md T2-a; the old text is the same)

old (`orchestrator/END-ORDER.md`, 2d, lines 516-517, unchanged since T-points.md):
```
  precheck_r96_check (commands in `r58c/A/TEST-QUEUE.md`); and round 8's own: `r58c/B/tests/{test_item27_trc,
  test_sr6_guard}.py` (kt_inner), `r58c/B/tests/{test_rerun_r101, test_pass_paths, test_kt_as}.sh` (host).
```
new:
```
  precheck_r96_check (commands in `r58c/A/TEST-QUEUE.md`); and round 8's own: `r58c/B/tests/{test_item27_trc,
  test_sr6_guard}.py` (kt_inner), `r58c/B/tests/{test_rerun_r101, test_pass_paths, test_kt_as}.sh` (host).
  **Note 35(a), ruled (T2, kt_inner.sh T2-0)**: `fixes/tests/{test_r53_58_unit, test_r64, test_e5_equiv}.py` once more
  on the final bytes, in two containers: `sh r58c/B/ktest.sh ktest-b<N> /w/r58c/B/tests/kt_inner.sh test_e5_equiv`
  (alone, so its measured peak is its own) and `sh r58c/B/ktest.sh ktest-b<N+1> /w/r58c/B/tests/kt_inner.sh
  test_r53_58_unit test_r64_fixes` (`test_r64_fixes` is `fixes/tests/test_r64.py` with `post`; `test_r64` stays
  `r58c/tests/test_r64.py`). Output only under `$BOUT/<name>` (`r58c/B/out/test_r53_58_unit`,
  `r58c/B/out/test_e5_equiv`; test_r64 writes nothing). Each log `r58c/B/out/logs/<name>.log` shows the sha256 of the
  test file and of the file under test (`train/selectB.py`; `train/kge.py`, with `train/stageB.py` and stage A's
  `train/stageA/E5/c01/reps.pt` read by it) and the test's `RESULT PASS` line. test_e5_equiv needs no card (CPU
  storage, `KGE_DEVICE=cpu`, no table or task truth read); its log and `r58c/B/out/test_e5_equiv/measure.json` record
  the measured `wall_s`, `peak_rss_mb` and `cgroup_peak_mb` against the 560 s limit and the 1,536 MB cap. An
  `OVER-LIMIT` line (time, memory at the cap, or killed) stops the step and is reported to the coordinator; no limit
  is raised.
```

## T2-b, new row (replaces the row drafted in T-points.md; the anchor q31 row is the same)

```
| q32 | `sh r58c/B/ktest.sh ktest-b<N> /w/r58c/B/tests/kt_inner.sh test_e5_equiv`, then `sh r58c/B/ktest.sh ktest-b<N+1> /w/r58c/B/tests/kt_inner.sh test_r53_58_unit test_r64_fixes` | note 35(a), ruled (T2): rulings 53, 58, 64 (selectB unit cases) and scoring-selection-5 (kge.score against stage A's routed scores) on the final bytes; kt_inner.sh T2-0; test_e5_equiv's MEASURED line (time, peak memory) goes to the limits record; OVER-LIMIT stops and is reported |
```

## The fail-before I will run once T2-0 is applied

The steps run in order, each through ktest.sh behind the memgate and the lane lock, one container at a time. I edit no
shell script while a container that uses it runs.

1. **Before bytes.** `cp -p r58c/B/tests/kt_inner.sh r58c/B/pre-r105/kt_inner.sh` (eb61c76d). Then write the proposed
   file over `r58c/B/tests/kt_inner.sh` and check that its sha256 equals d78f343a.
2. **Fail before, on the old bytes.** `sh r58c/B/ktest.sh ktest-b<N> /w/r58c/B/pre-r105/kt_inner.sh test_e5_equiv
   test_r53_58_unit test_r64_fixes`. ktest.sh accepts an inner script under `/w/r58c/B/`, and the old kt_inner routes
   the three names to `/w/train/r58/tests/<name>.py`, which do not exist. Expected:
   - every log has `sha256sum: ... No such file or directory`;
   - every log has python's `can't open file` (rc 2) and no `RESULT PASS` line;
   - no `train/selectB.py` or `train/kge.py` sha256 line, and no MEASURED line;
   - the summary is `<name> rc=2` for each, and ktest exits 1 (the container's).

   Then, on the host and before step 3 overwrites the same log names, `cp -p` the three logs and the summary to
   `r58c/B/out/logs/pre-r105-kt_inner/`.
3. **After, on the new bytes** (this is also 2d's first formal run of q32):
   - `sh r58c/B/ktest.sh ktest-b<N+1> /w/r58c/B/tests/kt_inner.sh test_e5_equiv`;
   - then `sh r58c/B/ktest.sh ktest-b<N+2> /w/r58c/B/tests/kt_inner.sh test_r53_58_unit test_r64_fixes`.

   Expected:
   - each log has the test file's sha256 line, the under-test line(s) and `RESULT PASS`;
   - test_e5_equiv's log has `MEASURED ...` and no `OVER-LIMIT`;
   - `r58c/B/out/test_e5_equiv/measure.json` exists;
   - nothing is written outside `r58c/B/out/`. I check this on the host after the run: `find` lists
     `r58c/B/out/test_e5_equiv` and `r58c/B/out/test_r53_58_unit`, and no file under `fixes/tests/out/`, `train/` or
     `r58c/B/out/timing/` is newer than the run's start.

   This is also the first compile of the `MEASURE` python. If it fails to compile, the log shows python's
   SyntaxError, no MEASURED line, rc 1, and the step stops and is reported. I neither fix it in place nor route
   around it.
4. **One check of the wrapper's over-limit path**, in a container and on fake work only. `kt_inner` takes a test name,
   not a command, so this needs a test file that sleeps past 560 s. That would hold the lane lock for over nine minutes
   and run into ktest's own 580 s stop. **I propose not to run it.** The time path is plain python (`subprocess.run(...,
   timeout=560)` -> `TimeoutExpired`); the memory path reads the same cgroup files `mem_run.py` reads, whose figures are
   in END-ORDER section 0. Say if you want it run anyway.
5. **Records.**
   - RUNLOG-B and TEST-QUEUE get the results, with the MEASURED line quoted as printed.
   - The limits record, END-ORDER section 0, gets a test_e5_equiv row with the measured figures. That row is a text
     change after the measurement. It goes in only when the coordinator allows a revision; until then it stays in
     RUNLOG-B.
   - FINAL-CHANGED is rebuilt: `r58c/B/tests/kt_inner.sh` shows as changed, with this file's hash as its report.
   - ROUND8-DONE is rewritten with the new END-ORDER and FINAL-CHANGED sha256s.
