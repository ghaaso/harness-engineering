# T-points: draft of ONE text-only revision (agent B, 2026-11-15)

Nothing in the lane is changed by this file. Line numbers are the current bytes (END-ORDER ad45731a, RUNLOG-B,
CONFLICTS.md, TEST-QUEUE.md as of ROUND8-DONE 11:14:16Z). Every "old" is the exact current text. Every "new" is
the text that replaces it.

**One point is not text-only:** T2 needs three routes in `r58c/B/tests/kt_inner.sh`. Without them, no 2d command can
run the three tests (T2-0). I have not coded it. The exact change is drafted below for the coordinator to rule on.

---

## T1. The rmdir of train/selectB was the lane session, not the coordinator

The source is `train/RUNLOG.md` lines 905-911, "## Stray empty folder train/selectB removed (ruling 103(d), C21)":
"Removed with `rmdir` at 2026-11-15T09:37:10Z". I wrongly put it to the coordinator in two places.

**T1-a. `orchestrator/END-ORDER.md`, section 0, lines 55-56**

old:
```
  container), through the old line 64 that created every writable source on every call; the coordinator removed it
  with `rmdir` at 09:37:10Z (`train/RUNLOG.md`). Tests: `test_freeze_check.sh` case 9b, `test_kt_as.sh`,
```
new:
```
  container), through the old line 64 that created every writable source on every call; the lane session removed it
  with `rmdir` at 09:37:10Z (`train/RUNLOG.md`). Tests: `test_freeze_check.sh` case 9b, `test_kt_as.sh`,
```

**T1-b. `r58c/B/RUNLOG-B.md`, line 259** (the same error, in my record)

old:
```
  every writable source on every call. The coordinator removed the folder with `rmdir` at 09:37:10Z (train/RUNLOG.md).
```
new:
```
  every writable source on every call. The lane session removed the folder with `rmdir` at 09:37:10Z (train/RUNLOG.md).
```

---

## T2. 2d runs fixes/tests/test_r53_58_unit.py, test_r64.py and test_e5_equiv.py once more on the final bytes

### What test_e5_equiv needs (read, not run)

- **No card.**
  - It never touches `kge.DEVICE`. The script has no device code at all.
  - `kge.score` (train/kge.py lines 653-700) has no `.to(DEVICE)` or cuda call. Line 5 of that function is
    `torch.load(reps_path, weights_only=False)` and line 6 is `read_graph(parent_sha)`.
  - `stageB.load_tasks` and `load_cands` (train/stageB.py lines 101-111) read only `eval/tune_tasks.jsonl` and
    `eval/comparators/candidates_{pool,unrestricted}.tsv.gz`.
  - The model file `train/stageA/E5/c01/reps.pt` holds CPU storage only. Its `reps/data.pkl` names `cpu` once and no
    `cuda`, so `torch.load` without `map_location` works in a CPU container.
  - ktest.sh sets `KGE_DEVICE=cpu`.
- **Inputs, all small and all already in ktest.sh's read-only mounts:**

  | Input | Size | Mount |
  |---|---|---|
  | `train/stageA/E5/c01/reps.pt` | 3,508,323 bytes | `/w/train` |
  | graph `export/graphs/cd806c80...` | 568 KB | `/w/export` |
  | `eval/tune_tasks.jsonl` | 383,172 bytes | `/w/eval` |
  | the two candidate files | 56,534 and 230,647 bytes gz | `/w/eval` |

  It uses 5 tasks at cd806c80, both scopes, 1,048 candidates in all (release-gate log
  `fixes/logs/tests-post4.log` line 141).
- **Nothing it reads is a real table.**
  - It reads nothing under train/stageB, train/selectB, train/heldout or train/report.
  - It reads the tasks' `task_id`, `seed` and `parent` only. The task file has a `truth` field, which the script
    never reads. That file is already mounted read-only in every ktest container, as for test_select_report.
- **Time.** Not measured on 2 CPUs.
  - At the release gate the whole suite (runall4.sh, about thirty tests) ran in one 6-CPU card container from about
    14:22 to 14:24Z.
  - test_e5_equiv started at 14:24:27Z (`tests-post4.log` line 137) and was the last test.
  - Five tasks of CPU scoring is seconds, so I expect it far inside kt_inner's 560 s timeout and ktest's 580 s limit.
    This is inferred, not measured.
- **Memory.** Not measured.
  - The process is torch plus pykeen imported by kge, a 3.5 MB model, one 568 KB graph and two candidate files.
  - The nearest measured kge.py load stayed far under the cap: ktest-b83, kge.route over all 123
    graph folders, container peak 255 MB of 1,536 MB.
  - I expect it under the 1,536 MB cap. This is also inferred, not measured.
- **One need the current bytes do not meet: a writable OUT.**
  - By default it writes to `/w/fixes/tests/out/<CODE>/e5_equiv`, but ktest.sh mounts `/w/fixes` read-only.
  - It needs `OUT` set to a folder under `$BOUT`.
  - test_r53_58_unit writes the same way (`OUT/r53_58`) and needs the same.
  - test_r64 writes nothing and takes `post`.
- **Verdict:** no card. Within a test container's time and memory, as far as reading it can tell. It needs a writable
  OUT, which is what T2-0 gives it. If the coordinator wants measured time and memory first, the first 2d run of T2-0
  gives both: kt_inner's log, plus ktest's launch log.

### T2-0. NOT TEXT: `r58c/B/tests/kt_inner.sh` needs three routes (for a ruling; not coded)

- `kt_inner.sh` sends any other name to `/w/train/r58/tests/<name>.py`.
- `test_r64` is already taken by `r58c/tests/test_r64.py`. That is a different file: 40412721, its port to the current
  selectB. `fixes/tests/test_r64.py` is 4b59634b.
- So `fixes/tests/test_r64.py` needs its own name. I propose `test_r64_fixes`.
- ktest.sh only accepts an inner script under `/w/r58c/B/`, so there is no other way in without a code change.

Proposed change, lines 14-15:

old:
```
    test_select_report)
      f=/w/fixes/tests/test_select_report.py ;;
```
new:
```
    test_select_report)
      f=/w/fixes/tests/test_select_report.py ;;
    test_r53_58_unit|test_e5_equiv)
      f=/w/fixes/tests/$t.py ;;
    test_r64_fixes)
      f=/w/fixes/tests/test_r64.py ;;
```

and line 24:

old:
```
     test_select_report) OUT=$BOUT/selrep CODE=r58 timeout 560 python $f ;;
```
new:
```
     test_select_report) OUT=$BOUT/selrep CODE=r58 timeout 560 python $f ;;
     test_r53_58_unit|test_e5_equiv) OUT=$BOUT/$t CODE=r58 timeout 560 python $f ;;
     test_r64_fixes) timeout 560 python $f post ;;
```

How this works with the rest of kt_inner:

- `OUT=$BOUT/$t` puts their scratch output where kt_inner's `DROP_OUT=1` already removes it (`rm -rf "$BOUT/$t"`).
- The check that fails on the old bytes is the run itself. On the current kt_inner, `test_e5_equiv` resolves to
  `/w/train/r58/tests/test_e5_equiv.py`, which does not exist, so the run gives rc != 0 and no `RESULT PASS`. On the new
  bytes it gives RESULT PASS. The same holds for `test_r53_58_unit` and `test_r64_fixes`.
- The before bytes would go to `r58c/B/pre-r105/kt_inner.sh`.
- No other test's route changes.

If the coordinator rules this change in, the revision also carries:

- T2-a to T2-c below.
- A FINAL-CHANGED line for kt_inner.sh.
- A RUNLOG-B line with its hash.

If it rules it out, T2 cannot be done as asked, and 2d keeps note 35(a) as it is.

**T2-a. `orchestrator/END-ORDER.md`, 2d, lines 516-517** (append the three to round 8's own list)

old:
```
  precheck_r96_check (commands in `r58c/A/TEST-QUEUE.md`); and round 8's own: `r58c/B/tests/{test_item27_trc,
  test_sr6_guard}.py` (kt_inner), `r58c/B/tests/{test_rerun_r101, test_pass_paths, test_kt_as}.sh` (host).
```
new:
```
  precheck_r96_check (commands in `r58c/A/TEST-QUEUE.md`); and round 8's own: `r58c/B/tests/{test_item27_trc,
  test_sr6_guard}.py` (kt_inner), `r58c/B/tests/{test_rerun_r101, test_pass_paths, test_kt_as}.sh` (host).
  **Note 35(a), ruled (T2)**: `fixes/tests/{test_r53_58_unit, test_r64, test_e5_equiv}.py` once more on the final
  bytes, in one container: `sh r58c/B/ktest.sh ktest-b<N> /w/r58c/B/tests/kt_inner.sh test_r53_58_unit test_r64_fixes
  test_e5_equiv` (kt_inner's names; `test_r64_fixes` is `fixes/tests/test_r64.py` with `post`, and `test_r64` stays
  `r58c/tests/test_r64.py`). Each writes its scratch output under `$BOUT/<name>` (`OUT`), none needs the card: test_e5_equiv
  scores five tuning tasks at cd806c80 on CPU with stage A's `train/stageA/E5/c01/reps.pt` (CPU storage), reads no
  table and no task truth; logs `r58c/B/out/logs/{test_r53_58_unit, test_r64_fixes, test_e5_equiv}.log`.
```

**T2-b. `r58c/B/TEST-QUEUE.md`, after row q31** (line 151)

old (the q31 row, unchanged, as the anchor):
```
| q31 | the r8 and r9 TEST runs again after the formal rebuild of the TEST record and the three TEST hand-offs (C50; commands in END-ORDER 2d, r9 with `--freeze-sha256` of the TEST record) | C45 figures on the final bytes |
```
new (the q31 row, unchanged, then one row added):
```
| q31 | the r8 and r9 TEST runs again after the formal rebuild of the TEST record and the three TEST hand-offs (C50; commands in END-ORDER 2d, r9 with `--freeze-sha256` of the TEST record) | C45 figures on the final bytes |
| q32 | `sh r58c/B/ktest.sh ktest-b<N> /w/r58c/B/tests/kt_inner.sh test_r53_58_unit test_r64_fixes test_e5_equiv` | note 35(a), ruled (T2): rulings 53, 58, 64 (selectB unit cases) and scoring-selection-5 (kge.score against stage A's routed scores) on the final bytes; needs kt_inner.sh's three routes (T2-0) |
```

**T2-c. `r58c/B/CONFLICTS.md`, note 35(a), lines 329-334**

old:
```
    (a) For a ruling: `fixes/tests/test_r53_58_unit.py` and `fixes/tests/test_r64.py` (rulings 53, 58, 64 in
```
new:
```
    (a) Ruled (the coordinator's T2, 2026-11-15): 2d runs these once more on the final bytes (END-ORDER 2d, TEST-QUEUE
    q32; kt_inner.sh routes, T2-0); the text of the question as it stood: `fixes/tests/test_r53_58_unit.py` and `fixes/tests/test_r64.py` (rulings 53, 58, 64 in
```
(lines 330-334 stay as they are; groups (b), (c) and (d) stay out, as the coordinator said.)

**T2-d. The C23 listing then counts** 83 files, 58 named in 2d, 25 left out (the three leave group (a)). A RUNLOG-B
line in the revision: `- C23 listing after T2: files 83, named in 2d 58 (adds fixes/tests/{test_r53_58_unit,
test_r64, test_e5_equiv}.py), left out 25 (groups (b), (c), (d) of note 35).` For that, `r58c/B/c23_listing.js` has
to match `fixes/tests/test_r64.py` by folder and name, which the text of T2-a gives it (`fixes/tests/{..., test_r64, ...}.py`).
I will check this by running the listing once the revision is allowed.

---

## T3. The zero count is recorded too (note 36; the line format is confirmed)

**T3-a. `orchestrator/END-ORDER.md`, step 8, lines 963-964**

old:
```
  FOUND; the pre-r105 claim map has no row, the first C49 bytes `pre-r105/write_audit_claims.c49a.py` cite "(no file: anchor)"). The coordinator writes the line here in step 8, before the hashes go to the grader (so before 9.3, ruling 104(f)),
  when the count is not zero; a zero count may be recorded or left out (both print nothing). CONFLICTS.md note 36.
```
new:
```
  FOUND; the pre-r105 claim map has no row, the first C49 bytes `pre-r105/write_audit_claims.c49a.py` cite "(no file: anchor)"). The coordinator writes the line here in step 8, before the hashes go to the grader (so before 9.3, ruling 104(f)),
  always: when the count is 0 it records the line with `"count":0` and empty lists (`"seeds":[]`, `"parents":[]`),
  which prints nothing (test_write_result `c49_count_0_prints_nothing` runs exactly that line). The format is
  confirmed by the coordinator (T3). CONFLICTS.md note 36.
```

**T3-b. `r58c/B/CONFLICTS.md`, note 36, line 356**

old:
```
    coordinator writes (the lane chose it; the coordinator is asked to confirm it): `{"step":"coordinator","unit":
```
new:
```
    coordinator writes (the lane chose it; the coordinator confirmed it, T3, and records it for a count of 0 too, with empty lists): `{"step":"coordinator","unit":
```

---

## Not changed by this revision

- write_result.py, write_audit_claims.py and their tests. A count of 0 with empty lists is already accepted and prints
  nothing (`train/write_result.py` `nonfinite_heldout`; test_write_result line 459:
  `dict(NFL, count=0, seeds=[], parents=[])`).
- The standing rule on lost Git Bash appends is noted. In the logs I read this round, every step log I checked ends
  with its `rc` line: ktest-r8, both ktest-r9 runs, ktest-b107 to b110, the host tests. I wrote no line by hand.
- After the revision, the files that change get new hashes in RUNLOG-B and FINAL-CHANGED, and ROUND8-DONE is
  rewritten. Those are records, so I list them here and do not draft them:
  - END-ORDER;
  - RUNLOG-B;
  - CONFLICTS;
  - TEST-QUEUE;
  - kt_inner.sh, if ruled in.

  The C1-C50 table in RUNLOG-B is regenerated by `node r58c/B/c_table.js LANE`. T1-a, T2-a and T3-a add lines to
  END-ORDER, which shifts the line numbers it reports.
