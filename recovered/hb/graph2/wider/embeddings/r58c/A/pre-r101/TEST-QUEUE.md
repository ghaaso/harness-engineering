# Agent A, r58c: tests on the final bytes (end-order-changes-2, after the TEST HOLD was lifted)

Run each command from LANE in Git Bash, one at a time and in this order, started with dangerouslyDisableSandbox (the
sandboxed shell gets empty memgate samples). Each container goes through r58c/A/ktest.sh: the shared lock
r58c/ktest.lock, no ktest-* in docker ps (the grader runs ktest-G*), three memgate samples (free >= 6 GB, commit < 40 GB),
graphtest-kge:1 with `--network none --pull never --cpus 2 -m 1536m`, the start-race re-check (exit 14 = another ktest
started beside it; nothing ran), and since item 9 ktest.sh exits with the container's own exit code. No kge-* container.

LANE = C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings

## Host checks (no container)

| # | command | covers | expected |
|---|---|---|---|
| h1 | `sh r58c/A/test_ktest_race.sh > r58c/A/logs/test_ktest_race.log 2>&1` | the start race and item 9 (exit code; before bytes pre/ktest_r93.sh) | `RESULT PASS ktest-race` |
| h2 | `sh r58c/A/test_tune_staging.sh > r58c/A/logs/test_tune_staging.log 2>&1` | ruling 94 (a), `heldout_inputs.js build/check --split tune` (before pre/heldout_inputs_r93.js) | `RESULT PASS tune-staging` |
| h3 | `sh r58c/A/test_rehearse_stop.sh > r58c/A/logs/test_rehearse_stop.log 2>&1` | item 7, rehearse.sh's stop (before pre/rehearse_r93.sh) | `RESULT PASS rehearse-stop` |
| h4 | `sh r58c/A/test_heldout_mounts.sh > r58c/A/logs/test_heldout_mounts.log 2>&1` | ruling 94 (b), heldout.sh's -v flags from mounts-A.json (DRY=1 only) | `RESULT PASS heldout-mounts` |

## Containers

| # | command | covers | expected |
|---|---|---|---|
| c1 | `sh r58c/A/ktest.sh ktest-a10 "test_leak_audit" > r58c/A/logs/a10.out 2>&1` | leak_audit.py rulings 92-94 (ruling 94 (c): pass, a mount outside the list, a missing record, ...) | rc 0, `RESULT PASS` in logs/test_leak_audit.log |
| c2 | `sh r58c/A/ktest.sh ktest-a11 "test_probe" > r58c/A/logs/a11.out 2>&1` | the probe (a9 died on a rename around the reset) | rc 0 |
| c3 | `sh r58c/A/ktest.sh ktest-a12 "script:r58c/A/build_handoffs.py script:r58c/A/precheck_handoff.py" > r58c/A/logs/a12.out 2>&1` | item 2: rebuild r58c/handoff-test/ (heldout_inputs.js changed); fakesel kept unchanged | rc 0; new HANDOFF.json sha256 in logs/build_handoffs.log |
| c4 | `sh r58c/A/ktest.sh ktest-a13 "test_answer_level test_heldout test_heldout_e4" > r58c/A/logs/a13.out 2>&1` | 2d: the writers' tests on the final bytes | rc 0 |
| c5 | `sh r58c/A/ktest.sh ktest-a14 "script:r58c/A/time_tune.py@pick8" > r58c/A/logs/a14.out 2>&1` | item 5, timing on the 37-task set first (projection) | rc 0, logs/time_tune-pick8.json |
| c6 | `sh r58c/A/ktest.sh ktest-a15 "script:r58c/A/time_tune.py@late50" > r58c/A/logs/a15.out 2>&1` | item 5, the measured figure: 40 variants, 313 tasks, B 10,000 | rc 0, logs/time_tune-late50.json; if c5 projects over 560 s, KT_CAP/KT_ITEM only with the coordinator's leave |

Then `node r58c/A/sums.js` (sha256 of every changed file and each log's RESULT line) and r58c/A/RUNLOG-A.md.

For agent B: train/leak_audit.py changed again (ruling 94: a `ruling94` key in the result JSON, its text and a records
table in AUDIT.md, `--mounts` now also takes the two mount files, `--self`). B's test_gate.py and test_write_result.py
import leak_audit, so B reruns them on the final bytes.

## Results

(appended below as each run ends)

All run on 2026-11-14/15 (details and exit codes in r58c/A/RUNLOG-A.md):
- h1 test_ktest_race PASS (rerun after the 2026-11-15 --rm fix, before pre/ktest_r95.sh); h2 test_tune_staging PASS;
  h3 test_rehearse_stop PASS; h4 test_heldout_mounts PASS; new h5 `sh r58c/A/test_kt_inner.sh` PASS (before pre/kt_inner_r95.sh).
- c1 test_leak_audit: ktest-a10 and a16 failed on the test's own bytes, then a17 passed. After ruling 95, ktest-a20
  passed on the final bytes (leak_audit.py 0693c858, test 98795304).
- c2 test_probe: ktest-a11 and a18 failed on the test's expectations, then ktest-a19 passed.
- c3 ktest-a12 build_handoffs, precheck_handoff and time_tune@pick8 all passed. Tune HANDOFF.json is 042e1a41…8d9f and
  held-out is ef315738…083c; fakesel is unchanged.
- c4 ktest-a13 test_answer_level, test_heldout and test_heldout_e4 all passed (exit 0).
- c5/c6 time_tune: pick8 took 13.2 s at 248 MB; late50 took 76.9 s at 1,402 MB RSS (cgroup 1,532 MB of 1,536).
- ruling-95 order item 2: ktest-a21 tune_late50 was REFUSED, rc 12, because selectB-test's choices.json has no stamp.
- ROUND3:
  - ktest-a22 PASS: test_answer_level (with the tsel_* checks), test_heldout, test_heldout_e4.
  - ktest-a23: build_handoffs PASS, precheck_handoff PASS (pick8 tune ffa8af7e, heldout b299d5b5), tune_late50 tune
    rc 0 but PRECHECK FAIL (check 8 on T1-0065 and T1-0267: their first seed is the const node).
  - ktest-a24 test_probe: rerun on answer_level 06c69e8c.
  - ktest-a24 test_probe PASS (rc 0).
  - ktest-a25 build_handoffs@replace-fakesel PASS, precheck_handoff PASS (tune 17133176, 40 variants; heldout 3c1d47c5),
    precheck_r96_check PASS (fail-before of rule 5 on the pre bytes).
- ROUND4:
  - ktest-a26 test_precheck_seed PASS, precheck_three PASS (all three TEST hand-offs rc 0, 0 problems).
  - ROUND5: ktest-a27 precheck_three PASS (rc 0; three hand-offs, 0 problems each).
- ROUND6 (rulings 96, 97):
  - host test_staging_blobs PASS (exit 0); host test_rehearse_inj PASS (exit 0); host test_rehearse_stop PASS (exit 0).
  - ktest-a28: test_inject_kinds rc 1 (the test's import path; fixed), test_rehearsal_inj PASS, test_probe_r97 PASS.
  - ktest-a29: test_inject_kinds PASS, test_rehearsal_negative PASS.
  - ktest-a30..a39: inject_standin big-E1..E5, noco-E1..E5 all PASS (30 settings, 0 failed).
  - ktest-a40 test_probe PASS; ktest-a41 precheck_three PASS.
- ROUND7 (the coordinator's four rulings):
  - host: test_sums_filter PASS, test_heldout_rehearsal_check PASS, test_heldout_mounts PASS, test_ktest_race PASS (exit 0).
  - ktest-a42 test_leak_audit FAIL (ruling-89 sites of round 6; fixed in leak_audit.py), a43 FAIL (old-bytes halves; test fixed),
    a44 PASS; a45..a49 all PASS; a50, a51 test_rehearsal_negative PASS (byte and field comparison).
