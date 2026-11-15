# T-points-3: T2-0 simplified (agent B, 2026-11-15; replaces T-points-2.md)

This file replaces `r58c/B/drafts/T-points-2.md`, which is kept unchanged as a record.

From `r58c/B/drafts/T-points.md` (bb2880fd...):

- T1 (T1-a, T1-b) and T3 (T3-a, T3-b) stand as drafted there. They are accepted.
- T2-c and T2-d stand.
- Here: T2-0 (kt_inner), T2-m (mem.sh, new), and T2-a and T2-b (new texts).

Nothing in the lane is changed. The real `r58c/B/tests/kt_inner.sh` (eb61c76d) and `r58c/B/timing/mem.sh` (adc4ea39)
are untouched.

## T2-0. `r58c/B/tests/kt_inner.sh`: the three routes and the under-test sha256 lines, nothing else

- Proposed file `r58c/B/drafts/kt_inner.sh.proposed`, sha256
  685bbf4800a1a9342867a60eaa2902dfa584cf899ed490a1e72756b271ffc80f.
- Diff `r58c/B/drafts/kt_inner.sh.diff`, sha256
  8e1de980727ae81df6c81ae5c8a72dae1a8bd7e92523ce5e237ef06b6174a1a4. It adds 10 lines, changes no existing line, and
  removes nothing.
- `sh -n` parses it (host; nothing run).

What it adds:

- **Routes** (proposed lines 16-19): `test_r53_58_unit|test_e5_equiv` -> `/w/fixes/tests/$t.py`; `test_r64_fixes` ->
  `/w/fixes/tests/test_r64.py`. `test_r64` still goes to `/w/r58c/tests/test_r64.py`.
- **Under-test lines** (lines 26-29), after the existing test-file line:
  - `sha256 <hex> train/selectB.py (under test)` for test_r53_58_unit and test_r64_fixes;
  - `sha256 <hex> train/kge.py (under test)` for test_e5_equiv.
- **Run lines** (lines 33-34):
  - `test_r53_58_unit|test_e5_equiv) OUT=$BOUT/$t CODE=r58 timeout 560 python $f`, the same form as their
    neighbours;
  - `test_r64_fixes) timeout 560 python $f post` (it writes nothing).

How the rest of kt_inner treats them:

- Output goes only under `$BOUT/<name>`: `r58c/B/out/test_r53_58_unit/r53_58` and
  `r58c/B/out/test_e5_equiv/e5_equiv/result.json`. `DROP_OUT=1` removes them as for every other test.
- The summary line and the pass rule are unchanged: rc 0 **and** `^RESULT PASS`.
- A timeout (rc 124) or a kill (rc 137) fails the test like any other failure. It is reported, and no limit is
  raised.
- All three old tests print their own `RESULT PASS|FAIL` line.

## T2-m. `r58c/B/timing/mem.sh`: one new case, `e5_equiv`, for ONE measured run

- `mem.sh` is on no real path and not in the freeze list.
- Proposed file `r58c/B/drafts/mem.sh.proposed`, sha256
  bbf0c6ab0b2e398674e6705afa754d646d3d80313358c4132bb05ef8e5b492a3.
- Diff `r58c/B/drafts/mem.sh.diff`, sha256
  6993b613d5c7d84121e61bee6bf4c8c97dca815f9acbae2747742bcc07a937f1.
- `sh -n` parses it. `mem_run.py` (6d461c5e) is used as it is.

What it adds:

- **Usage line** (header): `... mem.sh assemble|selectB|report|item22|e5_equiv`, plus a two-line note.
- **New case**:
  `e5_equiv) C="timeout 560 env OUT=/w/r58c/B/out/test_e5_equiv CODE=r58 python /w/fixes/tests/test_e5_equiv.py"`.
  This is the same command and the same 560 s timeout kt_inner gives it.
- **Sha256 lines** of the e5_equiv log: `r58c/B/timing/mem_run.py`, `r58c/B/timing/mem.sh`,
  `fixes/tests/test_e5_equiv.py` and `train/kge.py`. The other cases keep their list exactly.

The run and where its figures go:

- `sh r58c/B/ktest.sh ktest-b<N> /w/r58c/B/timing/mem.sh e5_equiv`, alone in its container.
- `mem_run.py` prints `MEMORY e5_equiv rc .. wall_s .. peak_rss_mb .. cgroup_peak_mb .. cap_mb .. at_cap ..`.
- It writes `r58c/B/out/logs/mem-e5_equiv.log` and `r58c/B/out/timing/mem-e5_equiv.json`. That is mem_run's own
  existing place, under `$BOUT/timing`, as for the change-5 figures. The test's own output goes to
  `$BOUT/test_e5_equiv`.
- The figures go into **RUNLOG-B only**. There is no END-ORDER row.
- If the run times out or is killed, or `at_cap` is true, I report it to the coordinator and raise no limit.

## T2-a, new text (replaces T-points-2.md's)

old (`orchestrator/END-ORDER.md`, 2d, lines 516-517, unchanged):
```
  precheck_r96_check (commands in `r58c/A/TEST-QUEUE.md`); and round 8's own: `r58c/B/tests/{test_item27_trc,
  test_sr6_guard}.py` (kt_inner), `r58c/B/tests/{test_rerun_r101, test_pass_paths, test_kt_as}.sh` (host).
```
new:
```
  precheck_r96_check (commands in `r58c/A/TEST-QUEUE.md`); and round 8's own: `r58c/B/tests/{test_item27_trc,
  test_sr6_guard}.py` (kt_inner), `r58c/B/tests/{test_rerun_r101, test_pass_paths, test_kt_as}.sh` (host).
  **Note 35(a), ruled (T2)**: `fixes/tests/{test_r53_58_unit, test_r64, test_e5_equiv}.py` once more on the final
  bytes (kt_inner, as `test_r53_58_unit`, `test_r64_fixes` and `test_e5_equiv`).
```

## T2-b, new row (replaces T-points-2.md's; the anchor q31 row is the same)

```
| q32 | `sh r58c/B/ktest.sh ktest-b<N> /w/r58c/B/tests/kt_inner.sh test_r53_58_unit test_r64_fixes test_e5_equiv` | note 35(a), ruled (T2): fixes/tests/test_r53_58_unit.py, test_r64.py (`post`) and test_e5_equiv.py on the final bytes |
```

The one measured run of T2-m is a TEST-QUEUE row too: it is a container run. It is not part of 2d:

```
| q33 | `sh r58c/B/ktest.sh ktest-b<N> /w/r58c/B/timing/mem.sh e5_equiv` (once) | test_e5_equiv's wall time and peak memory, for RUNLOG-B only; no END-ORDER row; over a limit is reported, no limit raised |
```

## The fail-before I will run once T2-0 and T2-m are applied

The steps run in order, one container at a time, through ktest.sh behind the memgate and the lane lock. I edit no shell
script while a container that uses it runs.

1. **Before bytes.** `cp -p r58c/B/tests/kt_inner.sh r58c/B/pre-r105/kt_inner.sh` (eb61c76d) and
   `cp -p r58c/B/timing/mem.sh r58c/B/pre-r105/mem.sh` (adc4ea39). Then write both proposed files in place and check
   their sha256s (685bbf48 and bbf0c6ab).
2. **Fail before, kt_inner.** `sh r58c/B/ktest.sh ktest-b<N> /w/r58c/B/pre-r105/kt_inner.sh test_r53_58_unit
   test_r64_fixes test_e5_equiv`. The old kt_inner routes the three names to `/w/train/r58/tests/<name>.py`, which do
   not exist. Expected:
   - each log has `sha256sum: ... No such file or directory` and python's `can't open file`;
   - each log has no `RESULT PASS` and no `(under test)` line;
   - the summary is `<name> rc=2` for each, and ktest exits 1.

   Then, on the host and before step 3 overwrites the same log names, `cp -p` the three logs and the summary to
   `r58c/B/out/logs/pre-r105-kt_inner/`.
3. **After, kt_inner (q32).** `sh r58c/B/ktest.sh ktest-b<N+1> /w/r58c/B/tests/kt_inner.sh test_r53_58_unit
   test_r64_fixes test_e5_equiv`. Expected:
   - each log has the test file's sha256 line, the `(under test)` line and `RESULT PASS`, and rc 0;
   - nothing is written outside `r58c/B/out/`. I check this on the host with `find ... -newer` over `fixes/tests/out`,
     `train/` and the lane root.
4. **Fail before, mem.sh.** `sh r58c/B/ktest.sh ktest-b<N+2> /w/r58c/B/pre-r105/mem.sh e5_equiv`. Expected:
   `usage: mem.sh assemble|selectB|report|item22` and exit 2.

   This run writes no log file: the old case statement exits before `L` is written. ktest's launch log keeps the
   exit.
5. **After, mem.sh (q33).** `sh r58c/B/ktest.sh ktest-b<N+3> /w/r58c/B/timing/mem.sh e5_equiv`. Expected:
   - the four sha256 lines, the test's `RESULT PASS`, and `MEMORY e5_equiv rc 0 wall_s .. peak_rss_mb ..
     cgroup_peak_mb .. cap_mb 1536.0 at_cap False`;
   - `rc 0`.

   Its figures go into RUNLOG-B. If the run times out (rc 124) or is killed (rc 137), or `at_cap` is True, I report it
   and raise no limit.
6. **Records.**
   - RUNLOG-B and TEST-QUEUE get the results.
   - FINAL-CHANGED is rebuilt: `r58c/B/tests/kt_inner.sh` and `r58c/B/timing/mem.sh` change, each with its reported
     hash.
   - ROUND8-DONE is rewritten.
