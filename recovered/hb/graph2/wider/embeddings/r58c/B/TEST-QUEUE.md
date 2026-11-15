# Agent B, round r58c: tests still to run on the final bytes (written 2026-11-14 after the reset, revised after the coordinator read END-ORDER 1cdcb6e7; NOT run)

Run from LANE (`/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings`)
in Git Bash, **outside the sandboxed Bash**: every container step depends on `orchestrator/memgate.sh`, whose samples come
from PowerShell. Inside the sandbox they come back empty, `memgate.sh wait` never returns, and `lane_step.sh` gives up
after 80 samples. One container at a time. Each launcher takes `r58c/ktest.lock`, waits for no `ktest-*`, runs
`memgate.sh wait`, then applies the race gate (`r58c/B/race_gate.sh`: the command is held until it is released after
two clean looks). kge-B1 is never a reason to wait in these steps.

Start only after the coordinator's go. Stop at the first failure and report it.

| # | Command | Container(s) | Why it reruns | PASS evidence |
|---|---|---|---|---|
| 1 | `sh r58c/B/ktest.sh ktest-b18 /w/r58c/B/tests/role_selectB.sh` | ktest-b18 | test_gate.py imports `train/leak_audit.py`, now 629c0df3 (agent A); test_selection_freeze8 reads write_result.py's text | `r58c/B/out/logs/role_selectB.log` opens `sha256 d42cd900... train/selectB.py`, ends `RESULT PASS selectB` |
| 2 | `sh r58c/B/ktest.sh ktest-b19 /w/r58c/B/tests/role_report.sh p2` | ktest-b19 | test_write_result.py and write_result.py changed (MF-12 absent_tasks shape; ruling92.text), test_write_audit_claims.py and write_audit_claims.py changed (ruling92.text, the pin); test_write_result imports leak_audit 629c0df3 | `r58c/B/out/logs/role_report.p2.log` ends `RESULT PASS part p2 of report`; inside it, test_write_result `RESULT PASS write-result` (mf12_absent_shape_pass_after / _fail_before, mf12_scalar_heldout_handoff, r92_text_printed_pass_after / _fail_before) and test_write_audit_claims (r92_text_in_audit_and_result, r92_fail_before_pre92_wac, wac_pin_is_the_final_writer) |
| 3 | `sh r58c/B/role_join.sh report train/report.py p1 p2` (host, no container) | none | joins p1 (ktest-b14, 21:1xZ, unchanged bytes: test_verdict, test_counts, test_b_units) with the new p2 | `r58c/B/out/logs/role_report.log` opens `sha256 74d8ef99... train/report.py`, ends `RESULT PASS report` |
| 4 | `sh r58c/B/eor/test_end_of_run.sh > r58c/B/logs/test_end_of_run.log 2>&1` (host; takes the lane lock for the whole run) | ktest-b5, b6, b7, b8 (C, E, H, P), ktest-b20, b21 (K3, K4: started, held, removed unreleased), ktest-b22 (K3B: a full assemble on a synthetic copy under the before bytes) | `orchestrator/end_of_run.sh` changed: its container is held until `/tmp/go` and released only after two clean looks (cases K3, K4; fail-before K3B on `r58c/B/pre-race/end_of_run.sh`), and exits 14 MEMGATE_EMPTY on an empty sample (case M, a stub `powershell` on PATH; fail-before MB on `r58c/B/pre-memgate/end_of_run.sh`, about 30 s) | `RESULT PASS end-of-run (<n> checks)`; "the real RUNLOG unchanged" |
| 5 | `sh r58c/B/tests/test_race_gate.sh` (host) | none (fake docker) | its PASS of 22:31Z is on the bytes before the MEMGATE_EMPTY refusal; race_gate.sh, ktest.sh, lane_step.sh and rerun_check.sh changed since | `RESULT PASS race-gate (13 checks)` |
| 6 | `sh r58c/B/tests/test_freeze_check.sh > r58c/B/logs/test_freeze_check.log 2>&1` (host) | none (docker read-only: image inspect, ps -a) | lane_step.sh changed after its PASS of 22:31Z (the MEMGATE_EMPTY refusal) | `RESULT PASS test_freeze_check` (17 checks) |
| 7 | `sh r58c/B/tests/test_memgate_empty.sh` (host) | none (fake docker, stub memgate.sh) | new: the MEMGATE_EMPTY refusal (exit 9) of ktest.sh, lane_step.sh, rerun_check.sh, with fail-befores on `r58c/B/pre-memgate/` | `RESULT PASS memgate-empty (<n> checks)` in `r58c/B/logs/test_memgate_empty.log` |

Not rerun, because nothing they test or import changed since their PASS: role report p1 (ktest-b14), test_item27,
test_rerun_check and test_assemble_checks (ktest-b16), mf4 (ktest-b17). If the coordinator wants every log produced
by the final `ktest.sh`/`kt_inner.sh` bytes, add:
`sh r58c/B/ktest.sh ktest-b23 /w/r58c/B/tests/role_report.sh p1`, then step 3 again;
`sh r58c/B/ktest.sh ktest-b24 /w/r58c/B/tests/kt_inner.sh test_item27 test_rerun_check test_assemble_checks`;
`sh r58c/B/ktest.sh ktest-b25 /w/r58c/B/tests/mf4.sh`.

After the queue: refresh `r58c/B/RUNLOG-B.md`'s evidence lines (the sha256 lines do not change unless a file does),
then the lead appends it to `train/RUNLOG.md`.

## 2d on the final bytes (end-order-changes-2 change 2; supersedes the table above, which allowed skips)

Every test of agent B, in full, no optional skip. Containers through `r58c/B/ktest.sh` (the shared lock, no ktest-* in
`docker ps`, three samples free >= 6 GB and commit < 40 GB, the race gate; exits with the container's code), started
with dangerouslyDisableSandbox; host tests from LANE in Git Bash. Agent A's are in `r58c/A/TEST-QUEUE.md`.

| # | Command | Holds |
|---|---|---|
| q1 | `sh r58c/B/ktest.sh ktest-b30 /w/r58c/B/tests/role_selectB.sh` | test_gate, test_selection_freeze8, test_r64, test_select_report |
| q2 | `sh r58c/B/ktest.sh ktest-b31 /w/r58c/B/tests/role_report.sh p1` | test_verdict, test_counts, test_b_units |
| q3 | `sh r58c/B/ktest.sh ktest-b32 /w/r58c/B/tests/role_report.sh p2` | test_write_result, then test_write_audit_claims (section 9: r86b_*, r94e_*, r94f_*) |
| q4 | `sh r58c/B/role_join.sh report train/report.py p1 p2` (host) | joins q2 and q3 into role_report.log |
| q5 | `sh r58c/B/ktest.sh ktest-b33 /w/r58c/B/tests/kt_inner.sh test_item27 test_item27_trc test_wr_refuses_test_return test_mounts_vs_leak_audit test_rerun_check test_assemble_checks test_item22` | change 4, change 9's unit test, ruling 94 against A's reader, the re-run check, assemble_checks, item22 |
| q6 | `sh r58c/B/ktest.sh ktest-b34 /w/r58c/B/tests/mf4.sh` | MF-4 mutants |
| q7 | `sh r58c/B/eor/test_end_of_run.sh > r58c/B/logs/test_end_of_run.log 2>&1` (host; ktest-b5..b8, b20..b22) | end_of_run.sh (LIMIT_ASSEMBLE, race, MEMGATE_EMPTY) |
| q8 | `sh r58c/B/tests/test_race_gate.sh`, `sh r58c/B/tests/test_memgate_empty.sh`, `sh r58c/B/tests/test_freeze_check.sh > r58c/B/logs/test_freeze_check.log 2>&1` (host) | launchers: race gate, mounts from the list, records kept, MEMGATE_EMPTY, freeze list and check |

Then change 5's timings (not tests): `node r58c/B/timing/make_full_copy.js r58c/B/out/timing/asm` (host), then
`sh r58c/B/ktest.sh ktest-b35 /w/r58c/B/timing/time.sh assemble`, `... ktest-b36 ... selectB`, `... ktest-b37 ... report`,
`sh r58c/B/ktest.sh ktest-b38 /w/r58c/B/timing/time_item22.sh`. Results: section "Results (2d)" below.

## Results (2d)

All runs on the final bytes (file sha256 in RUNLOG-B.md, section "Round 2 final"). The container names of the table
above were used up by void runs (ktest-b30..b34: two launcher defects, CONFLICTS.md note 16); the
final runs are these. Queue log `r58c/B/logs/q2d.log`; each launcher's output `r58c/B/logs/<name>.out`.

| # | Run | Exit | Result line | Log |
|---|---|---|---|---|
| q1 | ktest-b51 role_selectB.sh | 0 | RESULT PASS selectB (test_gate, test_selection_freeze8, test_r64, test_select_report) | r58c/B/out/logs/role_selectB.log |
| q2 | ktest-b52 role_report.sh p1 | 0 | RESULT PASS part p1 of report (test_verdict, test_counts, test_b_units) | r58c/B/out/logs/role_report.p1.log |
| q3 | ktest-b53 role_report.sh p2 | 0 | RESULT PASS part p2 of report (test_write_result 38 keys, test_write_audit_claims 19 keys) | r58c/B/out/logs/role_report.p2.log |
| q4 | role_join.sh report train/report.py p1 p2 (host) | 0 | RESULT PASS report | r58c/B/out/logs/role_report.log |
| q5 | ktest-b54 kt_inner.sh (7 tests) | 0 | test_item27, test_item27_trc (6), test_wr_refuses_test_return (13), test_mounts_vs_leak_audit (8), test_rerun_check, test_assemble_checks (44), test_item22: all RESULT PASS | r58c/B/out/logs/<test>.log, summary-ktest-b54.txt |
| q6 | ktest-b55 mf4.sh | 0 | RESULT PASS mf4 (both mutants FAIL as they must) | r58c/B/logs/ktest-b55.out |
| q7 | test_end_of_run.sh (host, real ktest-b containers under the lock) | 0 | RESULT PASS end-of-run (38 checks) | r58c/B/logs/test_end_of_run.log |
| q8 | test_race_gate.sh, test_memgate_empty.sh, test_freeze_check.sh (host) | 0, 0, 0 | RESULT PASS race-gate (22 checks); memgate-empty (23 checks); test_freeze_check (35 PASS lines) | r58c/B/logs/test_race_gate.log, test_memgate_empty.log, test_freeze_check.log |
| q9 | ktest-b50 test_wrapper_exit.sh (change 9's wrappers exit 1 on a failed test; before bytes exit 0) | 0 | RESULT PASS wrapper-exit (2 checks) | r58c/B/logs/ktest-b50.out |

Change 5 timings (full-size stand-in `r58c/B/out/timing/asm`): ktest-b45 assemble 86.24 s + assemble_checks 31.27 s =
117.51 s; ktest-b46 selectB 88.56 s (six per-arm calls); ktest-b49 report.main 121.10 s (ktest-b47 failed first: evalcore's
GRAPHS pointed at the copy, fixed in the harness, not in report.py); ktest-b48 item22 325 s. Logs
`r58c/B/out/logs/timing-{assemble,selectB,report,item22}.log`. The figures are in END-ORDER section 0's limits table.

## Results (round 3, the coordinator's order after ruling 95)

| Run | Exit | Result line | Log |
|---|---|---|---|
| ktest-b56 report_test.sh (`KT_TRAIN_RW="selectB-test report"`) | 0 | RESULT PASS report-test; train/report/test.json d78f637f..., test: true | r58c/B/out/logs/report-test.log |
| ktest-b57 harness.sh (tune_harness.py, compare_rank.py) | 0 | RESULT PASS harness; 96 cells equal the grader's TEST tune-rank.json (largest difference 0) | r58c/B/out/logs/tune-harness.log |
| ktest-b58 wr_rehearsal.sh (2e) | 14 | VOID (old returns; CONFLICTS.md note 18) | r58c/B/out/logs/wr_rehearsal.log |
| ktest-b59 role_report.sh p2 (leak_audit 0693c858) | 0 | RESULT PASS part p2 (test_write_result; test_write_audit_claims with r95_* checks) | r58c/B/out/logs/role_report.p2.log |
| ktest-b60 role_selectB.sh (leak_audit 0693c858) | 0 | RESULT PASS selectB (test_gate ...) | r58c/B/out/logs/role_selectB.log |
| ktest-b61 kt_inner.sh test_mounts_vs_leak_audit (leak_audit 0693c858) | 0 | RESULT PASS mounts-vs-leak-audit (8 checks) | r58c/B/out/logs/test_mounts_vs_leak_audit.log |
| role_join report (host) | 0 | RESULT PASS report | r58c/B/out/logs/role_report.log |
| test_memgate_empty.sh (host; KT_TRAIN_RW and MEM_R4 checks) | 0 | RESULT PASS memgate-empty (30 checks) | r58c/B/logs/test_memgate_empty.log |
| test_race_gate.sh, test_freeze_check.sh (host) | 0, 0 | RESULT PASS race-gate (22 checks); test_freeze_check | r58c/B/logs/ |
| test_memgate_empty.sh (host; ktest-r4 4g and ruling 79's commit < 38 GB; before bytes pre-r4mem, pre-r4g) | 0 | RESULT PASS memgate-empty (33 checks) | r58c/B/logs/test_memgate_empty.log |
| test_freeze_check.sh (host; test 13: the `# test output` block; before bytes pre-testout) | 0 | RESULT PASS test_freeze_check | r58c/B/logs/test_freeze_check.log |
| test_race_gate.sh (host; rerun after the final lane_step.sh) | 0 | RESULT PASS race-gate (22 checks) | r58c/B/logs/test_race_gate.log |
| ktest-b62 harness_tune.sh (tune_harness.py as it is, on agent A's six-arm fakesel, manifest 229cb87e) | 1 | RESULT FAIL harness-tune: AssertionError ['E1','E2','E3','E4','E5','PLACEBO'] at tune_harness.py:44 (CONFLICTS.md note 21); tune.json not written, r58c/handoff-test/report/tune.json unchanged (f8da1c6d, the one-arm fakesel) | r58c/B/out/logs/tune-harness-only.log |
| ktest-b79 role_report.sh p2 (mixed bytes: r97 code half written) | 1 | VOID: RESULT.md 151 lines (exit 9); two r96 checks wrong (CONFLICTS.md notes 23, 25) | r58c/B/out/logs/role_report.p2.log (overwritten) |
| test_freeze_check.sh (host; test 14: e5_route_audit.py frozen, ktest-r11 limit 1800, its mount list; before bytes pre-r97) | 0 | RESULT PASS test_freeze_check | r58c/B/logs/test_freeze_check.log |
| ktest-b80 kt_inner.sh test_e5_route_audit (stand-in graph) | 0 | RESULT PASS test_e5_route_audit (11 checks, 0 failed) | r58c/B/out/logs/test_e5_route_audit.log |
| ktest-b81 role_report.sh p2 | 1 | test_write_result SyntaxError (a bracket); fixed | r58c/B/out/logs/role_report.p2.log (overwritten) |
| ktest-b82 role_report.sh p2 (write_result 47d6223c, write_audit_claims, r96/r97/D1/E1 checks) | 0 | RESULT PASS part p2 of report (worst case 149 lines) | r58c/B/out/logs/role_report.p2.log |
| ktest-b83 time_r11.sh (r11 stand-in timing) | 0 | 7.0 s, 123 graphs, peak RSS 353 MB, cgroup 255 MB | r58c/B/out/logs/time-r11.log |
| ktest-b84 wr_rehearsal.sh (2e on write_result 47d6223c; narrowed mounts) | 0 | RESULT PASS 2e (write_result exit 0) | r58c/B/out/logs/wr_rehearsal.log |
| ktest-b85 compare_only.sh | 0 | RESULT PASS compare-rank (416 cells, largest difference 0) | r58c/B/out/logs/compare-rank.log |
| ktest-b86 kt_inner.sh test_mounts_vs_leak_audit | 1 | the expected scope lacked ktest-r11 (the leak audit already puts it out of scope); expectation added | r58c/B/out/logs/test_mounts_vs_leak_audit.log (overwritten) |
| ktest-b87 role_report.sh p1 (r58b/pre only) | 0 | RESULT PASS part p1 of report | r58c/B/out/logs/role_report.p1.log |
| ktest-b88 role_selectB.sh (r58b/pre, r58b/logs/test_verdict.log only) | 0 | RESULT PASS selectB | r58c/B/out/logs/role_selectB.log |
| ktest-b89 mf4.sh | 0 | RESULT PASS mf4 | r58c/B/out/logs/mf4-*.log |
| test_memgate_empty.sh (host; 7 new r58b/grader-returns mount checks; before bytes pre-kt58b) | 0 | RESULT PASS memgate-empty (40 checks) | r58c/B/logs/test_memgate_empty.log |
| test_race_gate.sh (host; new ktest.sh) | 0 | RESULT PASS race-gate (22 checks) | r58c/B/logs/test_race_gate.log |
| ktest-b90 kt_inner.sh test_mounts_vs_leak_audit (ktest-r11 in the expected scope) | 0 | RESULT PASS mounts-vs-leak-audit (8 checks) | r58c/B/out/logs/test_mounts_vs_leak_audit.log |
| test_freeze_check.sh (host; case 15: no container mounts r58c/A/logs, fail-before on pre-alogs mounts-B.json and gen_mounts.js) | 0 | RESULT PASS test_freeze_check | r58c/B/out/logs/test_freeze_check-r4.log |
| ktest-b91 kt_inner.sh test_mounts_vs_leak_audit (r58c/A/logs removed from r1-r4, r6-r9) | 0 | RESULT PASS mounts-vs-leak-audit (8 checks) | r58c/B/out/logs/test_mounts_vs_leak_audit.log; launcher r58c/B/out/logs/b91-launch.out |
| ktest-b92 kt_inner.sh test_mounts_vs_leak_audit (leak_audit.py 6a2bf7f4) | 0 | RESULT PASS mounts-vs-leak-audit (8 checks) | r58c/B/out/logs/test_mounts_vs_leak_audit.b92.log; launcher b92-launch.out |
| ktest-b93 role_report.sh p2 (test_write_result, test_write_audit_claims on leak_audit.py 6a2bf7f4) | 0 | RESULT PASS part p2 of report | r58c/B/out/logs/role_report.p2.log; test_write_audit_claims.log; b93-launch.out |
| host test_freeze_check.sh (round 6) | 0 | RESULT PASS test_freeze_check (49) | r58c/B/out/logs/test_freeze_check-r6.log |
| host test_memgate_empty.sh (round 6) | 0 | RESULT PASS memgate-empty (40 checks) | r58c/B/out/logs/test_memgate_empty-r6.log |
| host test_race_gate.sh (round 6) | 0 | RESULT PASS race-gate (22 checks) | r58c/B/out/logs/test_race_gate-r6.log |
| host test_r10_verdict.sh (new, step 9.1 verdict, lane_step 2de011cd) | 0 | RESULT PASS r10-verdict (13 checks) | r58c/B/out/logs/test_r10_verdict-r6.log; r58c/B/logs/test_r10_verdict.log |
| ktest-b94 role_report.sh p2 (write_result 53b629d1, write_audit_claims c7f2dda8; r98 checks) | 0 | RESULT PASS part p2 of report | r58c/B/out/logs/role_report.p2.log; test_write_result.log; test_write_audit_claims.log; ktest-b94.out |
| ktest-b95 wr_rehearsal.sh (2e on write_result 53b629d1; pick8 returns bc2d56da/dc9bc94c/67aa54c8) | 0 | RESULT PASS 2e (write_result exit 0) | r58c/B/out/logs/wr_rehearsal.log; ktest-b95.out |

## 2d, round 8 (final-reread C14, C8; supersedes the 2d table above where they differ)

The 2d table above (q1-q8) stands, with these additions; every entry runs once more, in full, on the final bytes.
Agent A's tests are in `r58c/A/TEST-QUEUE.md`; C14's omitted ones of agent A are named here as well so the two
queues name the same list: test_inject_kinds, test_rehearsal_inj, test_rehearsal_negative, test_probe_r97,
test_staging_blobs, test_heldout_rehearsal_check, test_rehearse_inj, test_kt_inner, precheck_three,
test_precheck_seed, precheck_r96_check (agent A runs them).

| # | Command | Holds |
|---|---|---|
| q9 | `sh r58c/B/ktest.sh ktest-b<N> /w/r58c/B/tests/kt_inner.sh test_e5_route_audit test_tune_harness test_item27_trc test_sr6_guard` | C14: E5 route audit, the tune harness; C15 (item27's tune_rank_check binding); SR-6 (the guard's line-start rule) |
| q10 | `sh r58c/B/tests/test_r10_verdict.sh` (host, stubs) | step 9.1 verdict (exit 10), C16 (lane_step exit 5 without a freeze list), lane_step TEST mode (LS_MOUNTS, mounts-test/) |
| q11 | `sh r58c/B/eor/test_eor_lock.sh` (host, fake docker) | end_of_run.sh takes the lane lock (C14) |
| q12 | `sh r58c/B/ktest.sh ktest-b<N> /w/r58c/B/tests/test_wrapper_exit.sh` | change 9: kt_inner.sh and role.sh exit non-zero on a failed test (C14) |
| q13 | `sh r58c/B/tests/test_rerun_r101.sh` (host, fake docker) | rerun_check.sh: 4g (ruling 100), the lane lock (C16) |
| q14 | `sh r58c/B/tests/test_pass_paths.sh` (host) | C8: every RUNLOG path under a mount of ktest-r1, r2, r3 |
| q15 | `sh r58c/B/tests/test_kt_as.sh` (host, fake docker) | C8: ktest.sh KT_AS (a step's exact list, read-only) |
| q16 | 2d's copy (host): `cp -p r58c/A/logs/{test_heldout,test_answer_level,test_leak_audit}.log r58c/B/out/logs/A/` after agent A's last 2d runs, then `cmp` each pair; the RUNLOG PASS lines of `heldout-driver`, `item24-adapter` and `leak-audit` name `r58c/B/out/logs/A/<log>` | C8 |
| q17 | `node r58c/B/pass_paths.js` (host) on the RUNLOG once 2d's lines are appended | C8 (exit 0; before step 1 only the assemble-checks log is still missing) |
| q18 | `KT_AS=ktest-r1 sh r58c/B/ktest.sh ktest-b<N> /w/r58c/B/tests/dry_guard.py` (the RUNLOG itself, after 2d's lines and step 1's PASS assemble-checks line) | C8: a dry r58_guard with ktest-r1's exact mounts (ac_problems stubbed) |
| q19 | the TEST runs of ktest-r4, r8, r9 through `lane_step.sh` (`LS_PREFREEZE=test`, `LS_MOUNTS` from `node r58c/B/graph_rows.js test-file <out>`, no set argument since C29; commands in END-ORDER 2d): r4 `answer_level.py tune --test --test-set late50` (wall time and memory, for the limits table), r8 the precheck of `r58c/handoff-test/tune-late50`, r9 the precheck of `r58c/handoff-test/heldout` (pick8) | C1, C2; the rows these need beyond the step's own list wait on CONFLICTS.md note 33 |
| q20 | `sh r58c/B/ktest.sh ktest-b<N> /w/r58c/B/tests/wr_rehearsal.sh` | 2e again on write_result 4f9e53a2 (C9, SR-8) |
| q21 | `sh r58c/B/tests/test_rerun_r103.sh` (host, fake docker) | ruling 103(a), C18: 3.5 GB is logged and reported, not a stop; fail-before `pre-r103/rerun_check.sh` |
| q22 | `sh r58c/B/tests/test_memgate_cleanup.sh` (host) | the memgate test leaves no folder behind (exit 0 on PASS) |
| q23 | `sh r58c/B/tests/test_freeze_check.sh` (host) | grown in place: 9b (C21 no-create), 13, 15 (C42, mounts-A.json), 19 (exit 7, ruling 103(d)), 20 (exit 8, C28), 35 (C35 tune_commits) |
| q24 | `sh r58c/B/tests/test_kt_as.sh`, `sh r58c/B/tests/test_r10_verdict.sh` (host) | grown in place: C21, C26 (inspect before release); C19 diff, C21, C29 (TEST mounts gate), C45 limits |
| q25 | `sh r58c/B/ktest.sh ktest-b<N> /w/r58c/B/tests/kt_inner.sh test_mounts_vs_leak_audit test_e5_route_audit test_gate` | ruling 103(c) (ktest-eor in scope, leak_audit 8c53e487), C31 (ruling 104(e) medians) |
| q26 | `sh r58c/B/ktest.sh ktest-b<N> /w/r58c/B/tests/role_report.sh p2`, then `sh r58c/B/role_join.sh report train/report.py p1 p2` (host) | C43 (export note kinds) in test_write_audit_claims, after test_write_result |
| q27 | `sh r58c/B/eor/test_end_of_run.sh` (host; its own ktest-b containers) | end_of_run.sh 8bee89df: C41 comment, C48 `--create` |
| q28 | `sh r58c/B/ktest.sh ktest-b<N> /w/r58c/B/tests/role_report.sh p2`, then `sh r58c/B/role_join.sh report train/report.py p1 p2` (host) | C49: write_result cd2bd6f9 (`c49_*`), write_audit_claims with the anchor input (`c49_*`, fail-before on pre-r105 and pre-r105/write_audit_claims.c49a.py) |
| q29 | `sh r58c/B/ktest.sh ktest-b<N> /w/r58c/B/tests/wr_rehearsal.sh` | 2e again on write_result cd2bd6f9 (C49; no nonfinite_heldout line: RESULT.md as before) |
| q30 | `sh r58c/A/test_h1cap_r105.sh` (host, `DRY=1`; agent A's) | C50: heldout.sh 7627c3e1 H1_CAP |
| q31 | the r8 and r9 TEST runs again after the formal rebuild of the TEST record and the three TEST hand-offs (C50; commands in END-ORDER 2d, r9 with `--freeze-sha256` of the TEST record) | C45 figures on the final bytes |

## Results (round 8)

| Run | Exit | Result line | Log |
|---|---|---|---|
| ktest-b96 kt_inner.sh test_item27_trc (item27 5406fd62) | 0 | RESULT PASS (18 checks; fail-before on pre-r101) | r58c/B/out/logs/test_item27_trc.log |
| ktest-b97 kt_inner.sh test_item27 test_gate | 0 | RESULT PASS, both | r58c/B/out/logs/test_item27.log, test_gate.log |
| ktest-b98 kt_inner.sh test_write_result test_write_audit_claims | 1 | test_write_result PASS; test_write_audit_claims FAIL on r94f (the check still expected no ktest-r4 in the export note; ruling 102 gives r4, r8, r9 graph folders) | r58c/B/out/logs/ |
| host test_kt_as.sh (ktest.sh a5da03ae) | 0 | RESULT PASS kt-as (9 checks; fail-before on pre-r101) | r58c/B/logs/test_kt_as.log |
| host test_memgate_empty.sh (ktest.sh a5da03ae) | 1 | RESULT PASS memgate-empty (40 checks, 0 FAIL); the exit 1 is its final `rm -rf r58c/B/memtest` failing on a held file (memtest/ktest-args-before), after the PASS line | r58c/B/logs/test_memgate_empty.log |
| host test_race_gate.sh (ktest.sh a5da03ae) | 0 | RESULT PASS race-gate (22 checks) | r58c/B/logs/test_race_gate.log |
| host test_rerun_r101.sh, test_pass_paths.sh, test_r10_verdict.sh, test_freeze_check.sh, test_end_of_run.sh | 0 | PASS (7, 6, 27 checks; 65 PASS lines; 44) | r58c/B/logs/ |
| ktest-b99 kt_inner.sh test_write_result test_write_audit_claims test_sr6_guard test_mounts_vs_leak_audit (write_audit_claims with export_dsts; r94f expects r4, r8, r9; new r102_* checks) | 1 | test_write_result PASS; test_write_audit_claims PASS; test_sr6_guard PASS (4 checks); test_mounts_vs_leak_audit FAIL: the expected scope lacked ktest-eor (the audit puts it out of scope; expectation added, CONFLICTS.md note 34) | r58c/B/out/logs/summary-ktest-b99.txt |
| ktest-b100 role_selectB.sh (selectB.py d54cb864, SR-6) | 0 | RESULT PASS selectB | r58c/B/out/logs/role_selectB.log |
| ktest-b101 dry_guard.py, KT_AS=ktest-r1 (ktest-r1's six rows, all read-only), on train/RUNLOG.md as it is | 3 | as expected: every path opened at /w inside r1's mounts; refused on stale hashes (item27, heldout, answer_level, leak_audit), no sha256 line for selectB/report, no assemble-checks line | r58c/B/out/logs/ktest-b101-as-ktest-r1.log, .inspect.json |
| ktest-b102 dry_guard.py, KT_AS=ktest-r1, on r58c/B/out/logs/dryguard/RUNLOG-candidate.md (current role hashes; PASS lines at r58c/B/out/logs/ and the copies in r58c/B/out/logs/A/) | 3 | no path missing or outside r1's mounts; item27, selectB and report pass; agent A's three copied logs do not yet show RESULT PASS on the current heldout.py, answer_level.py, leak_audit.py bytes (agent A's 2d reruns write them); the final run in 2d must exit 0 | r58c/B/out/logs/ktest-b102-as-ktest-r1.log, .inspect.json |
| host test_eor_lock.sh (end_of_run.sh with ktest-eor's list; the test now passes EOR_MOUNTS and its fake docker models `inspect`; before bytes r58c/B/pre-r101/test_eor_lock.sh, fake_docker_eor.sh) | 0 | RESULT PASS eor-lock (8 checks); before the test fix it stopped at exit 45, then 46 | r58c/B/logs/test_eor_lock.log |
| ktest-b103 kt_inner.sh test_mounts_vs_leak_audit test_e5_route_audit test_tune_harness | 0 | RESULT PASS mounts-vs-leak-audit (8 checks; ktest-eor out of scope); test_e5_route_audit (11 checks); test_tune_harness (16 checks) | r58c/B/out/logs/summary-ktest-b103.txt |
| ktest-b104 test_wrapper_exit.sh (kt_inner.sh eb61c76d) | 0 | RESULT PASS wrapper-exit (2 checks) | r58c/B/out/logs/ |
| ktest-b105 wr_rehearsal.sh (2e on write_result 4f9e53a2) | 0 | RESULT PASS 2e (write_result exit 0; RESULT.md 144 lines) | r58c/B/out/logs/wr_rehearsal.log |
| ktest-b106 role_report.sh p2, then role_join (host) | 0, 0 | RESULT PASS part p2 of report; RESULT PASS report | r58c/B/out/logs/role_report.p2.log, role_report.log |
| host test_end_of_run.sh (end_of_run.sh 8bee89df), test_race_gate.sh, test_memgate_empty.sh, test_rerun_r103.sh, test_rerun_r101.sh, test_eor_lock.sh | 0 each | RESULT PASS (43, 22, 40, 8, 7, 8 checks) | r58c/B/logs/*.run.out, test_*.log |
| ktest-b107 kt_inner.sh test_mounts_vs_leak_audit test_e5_route_audit test_gate (q25) | 0 | RESULT PASS (8 checks, leak_audit 8c53e487, ktest-eor in scope; 13 checks; gate) | r58c/B/out/logs/test_mounts_vs_leak_audit.log, test_e5_route_audit.log, test_gate.log |
| ktest-b108 role_report.sh p2, then role_join (q26) | 0, 0 | RESULT PASS part p2; RESULT PASS report; C49 rows cited "(no file: anchor)" (fixed in write_audit_claims 0c21809b) | r58c/B/out/logs/role_report.p2.log |
| ktest-r8 TEST (q19, C45) | 0 | PRECHECK PASS; 4 s; container peak 107,368,448 bytes | r58c/B/lane-steps/ktest-r8-20261115T101652Z.log |
| ktest-r9 TEST (q19, C45), first form | 1 | PRECHECK FAIL "2: no freeze sha256 given" (my command; CONFLICTS.md note 38) | r58c/B/lane-steps/ktest-r9-20261115T102934Z.log |
| ktest-r9 TEST with `--freeze-sha256` of the TEST record | 0 | PRECHECK PASS; 3 s; container peak 35,123,200 bytes | r58c/B/lane-steps/ktest-r9-20261115T104953Z.log |
| ktest-b109 role_report.sh p2 (write_result cd2bd6f9, write_audit_claims 0c21809b), then role_join (q28) | 0, 0 | RESULT PASS part p2; RESULT PASS report (all c49_* ok) | r58c/B/out/logs/test_write_result.log, test_write_audit_claims.log, role_report.log |
| ktest-b110 wr_rehearsal.sh (q29, 2e on write_result cd2bd6f9) | 0 | RESULT PASS 2e (write_result exit 0; RESULT.md 144 lines) | r58c/B/out/logs/wr_rehearsal.log |
