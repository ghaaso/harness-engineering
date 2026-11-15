# Round r58c, agent B: CONFLICTS

grader-interface-v2.md (sha256 e707a878...) won wherever it and MF-12 differed. Each row: where, what, what I did.

1. MF-12 / the old write_audit_claims.py real options (r58c/B/pre/write_audit_claims.py:141, `real_opts = ('outdir',
   'answer-graded', 'heldout')`) against grader-interface-v2 (returns at fixed paths in LANE/grader-returns/).
   Done: the real run takes only `--outdir` and reads `LANE/grader-returns/{tune-rank,tune-item24,heldout}.json`
   (r58c/write_audit_claims.py `parse`); write_result.py's real run reads the same fixed paths (train/write_result.py
   `parse`, the `rets` block).
2. Step numbering. The coordinator's messages name END-ORDER steps "2c" and "2d"; after the rerun check was inserted as
   the new 2c (coordinator message 4, change 2), the old 2c (tests) is 2d and the old 2d (interface rehearsal) is 2e
   (orchestrator/END-ORDER.md, sections 2c-2f). Message 4's "2d must have passed on those grader bytes" is applied
   to 2e, the rehearsal (END-ORDER.md step 3).
3. item27.py's real run hashes `train/stageB/plan.json` (train/item27.py `real_hash_tables` path, through
   selectB.tables_digest). No conflict with a ruling; noted because the tests (r58c/tests/test_selection_freeze8.py,
   train/r58/tests/test_item27.py) can only reach it with the frozen copy r58c/B/frozen/plan.json, never the real file
   (MF-8).
4. MF-14 asks for "mounted tasks_truthy.jsonl/remove_paths rows". No file of that name is mounted anywhere in the
   plan; tasks_truthy.jsonl exists only as test_heldout.py's synthetic refusal case (train/r58/tests/test_heldout.py:96).
   Plain reading implemented: AUDIT.md section 2b lists the rows of the mounted task file /build/tasks/tasks.jsonl,
   counts rows with remove_paths (tune variants) and lists any row with a truth-like key (heldout.TRUTHY); the real
   run refuses such a row (exit 34). The test feeds a synthetic file with both kinds
   (r58c/B/tests/test_write_audit_claims.py).
5. MF-12 against train/HANDOFF-FORMAT.md v2 rev 1b (sha256 9f86534c..., section 1 item 10): absent_tasks is
   {<variant name>: {"pool": n, "unrestricted": n}}. No conflict between the format and grader-interface-v2 (which
   names no absent_tasks or test_set key; the grader ignores unknown HANDOFF.json keys, per READY-format). The
   mismatch was agent B's own: write_result.py read the counts as scalars (r58c/B/pre-mf12/write_result.py
   absent_cell). Fixed: train/write_result.py:96 absent_ok checks the format's shape, absent_counts returns None on
   any other shape (a real run then refuses, exit 10), cells print pool/unrestricted per seed. Test:
   train/r58/tests/test_write_result.py mf12_absent_shape_fail_before / _pass_after, mf12_scalar_heldout_handoff.
6. The start race, two patterns. The coordinator's message after the reset says "stop your own container and retry";
   its later note says agent A's r58c/A/ktest.sh "removes its own container and exits 14" and asks for "the same
   pattern". Agent B kept the retry and took A's second look: r58c/B/race_gate.sh holds the container's command until
   /tmp/go, looks right after the start and 3 s later (rg_clear), and on a twin removes its own container unreleased
   and retries after a random 30-59 s (ktest.sh, lane_step.sh; rerun_check.sh at most 10 times, then exit 4).
   orchestrator/end_of_run.sh does not retry: a twin there is exit 11, like its other "containers running" stops.
   Both patterns close the race; they differ only in retry versus exit. If the coordinator wants exit 14 for B's
   launchers too, it is a two-line change in each (the `done` loop's retry branch).
7. r58c/B/rerun_check.sh used to refuse at once (exit 4) when a ktest-* ran; it now waits for ktest-* (at most 40
   checks 30 s apart, then exit 4), because a retry after the race gate meets the twin still running. kge-* is still
   refused at once (the card window). END-ORDER 2c says so.
8. r58c/B/lane_step.sh now mounts the facts read-only at /build/facts/cache: agent A's step-5 and step-9.1 command
   lines need it (coordinator: "Facts must be mounted at /build/facts/cache").

## Round r58c, end-order-changes-2 (ruling 94), agent B, 2026-11-14 about 23:50Z

9. **Open, not coded around: step 9.1's leak audit fails on the containers that run after it.** `train/leak_audit.py`
   `ruling94()` (agent A) reports "has no saved docker inspect record" for every container of a mount file without a
   record, except `--self`. `r58c/B/mounts-B.json` must list ktest-r5 (9.2 item22), ktest-r6 (9.3 write_result) and
   ktest-r7 (9.4 write_audit_claims) (ruling 94(d): a fixed list for every step), and those run AFTER 9.1, so at 9.1
   they have no record and `leak_audit.json` comes out `ok: false`, which stops the line. Shown, not judged, by the
   INFO line of `r58c/B/tests/test_mounts_vs_leak_audit.py`. Ways out (the coordinator's choice; none is mine to code):
   (a) agent A's `ruling94()` requires a record only for the containers whose step comes before the audit's own
   (the card window and steps 2-8, plus any 9.x step already run), or takes a list of not-yet-run names; (b) item22
   moves before 9.1 (it does not read the audit), which still leaves r6 and r7; (c) a ruling that 9.2-9.4 are audited
   by AUDIT.md section 9 only (wac lists their records with sha256), not by the leak audit.
10. **Done on agent B's side to match agent A's reader** (no change to A's files): `r58c/B/mounts-B.json` holds only
    `{step, allow}` objects (its `_about` string made `is_allow_file()` read the whole file as an inspect record); each
    step is the bare END-ORDER id (`"4"`, `"2c"`, `"9.1"`: `r94_in_scope()` matches the whole string, so `"4 selectB"`
    was out of scope and never audited), the label is in a `what` key; kge-R1 mounts the scratch parent
    `r58c/B/rerun-out` writable at `/w/rerun-out` and works in `/w/rerun-out/<STAMP>` (`_r94_pat()` knows `{ARM}` only, so a
    `<STAMP>` src never matched its record); an older record of the same container is kept as
    `r58c/mounts/<name>.<UTC of that record>.json` (the audit reads every `*.json` there; `.json.prev-<stamp>` was never
    read). Tests: `test_mounts_vs_leak_audit.py` (A's reader on records equal to the lists; fail-before on
    `r58c/B/pre-r94b/mounts-B.json`), `test_race_gate.sh` (the kept record; fail-before on `r58c/B/pre-r94b/`).
11. **Item 2 of the coordinator's last order is STOPPED, as ordered**: `train/report.py`'s test mode takes only
    `--test`; it reads `train/selectB-test/` (PLACEBO and the comparators, all 65 tuning commits' tasks; late-50
    figures inside) and writes `train/report/test.json`. It cannot be restricted to pick8, cannot read
    `r58c/A/out/fakesel`, and cannot write under `r58c/handoff-test/`. What it can do instead: (a) `report.py --test`
    as it is (PLACEBO only, all tasks, its own output path); (b) a separate harness that calls the same evalcore
    functions report.main uses (`evaluate_table`, `summary`, `mean_over_seeds`, `paired`) on pick8 and fakesel, in
    tune.json's `arms`/`comparators` shape: the same arithmetic, not report.main itself. Nothing was built. 2e is
    blocked on it: `write_result.py --test` needs a `--tune` (exit 14 otherwise) and the wrapper
    `r58c/B/tests/wr_rehearsal.sh` stops with exit 3 while `r58c/handoff-test/report/tune.json` is missing.
12. The tuning staging name is agent B's choice: `tune_inputs/` with manifest `tune_inputs.sha256` (END-ORDER 2f
    items 4-5, step 5's check, `ktest-r4`'s list, `freeze_list.sh`'s third argument). Agent A's `heldout_inputs.js
    build --split tune --out tune_inputs` writes it; agent A to confirm the command lines.
13. END-ORDER 9.1's `--mounts` and `--self` are read from `train/leak_audit.py`'s docstring (records folder
    `/w/r58c/mounts`, both mount lists, `--self ktest-r10`); agent A to confirm. Agent A's `heldout.sh` now saves its
    records to `r58c/mounts/<name>.json`, so END-ORDER 2a and 7 name those instead of `train/probe/kge-H1P-inspect.json`
    and `train/heldout/kge-H1-inspect.json` (write_audit_claims section 9 still also looks at the old paths).
14. Not a conflict any more: `train/heldout.sh` calls `r58c/B/freeze_check.sh` (line 82), not a bare `sha256sum -c`.
15. `r58c/B/ktest.sh` now exits with the container's own exit code (change 9), not 0; its own codes are 2, 3, 6, 9, 13.
16. **Two launcher defects found by the first real runs after the hold was lifted, both fixed before any real step**
    (the host tests drove an MSYS fake docker, which sees neither):
    (a) `r58c/B/race_gate.sh` `rg_release` and `orchestrator/end_of_run.sh`'s release ran `docker exec NAME touch
    /tmp/go` without `MSYS_NO_PATHCONV=1`; Git Bash rewrote `/tmp/go` into `C:/Users/User/AppData/Local/Temp/go` for the
    native docker, the release failed and every B launcher would have refused to start (ktest-b30, b31 at 23:45Z
    and 23:46Z: "release failed", exit 3; nothing ran in them). Test: `test_race_gate.sh` drives `rg_release` against a
    NATIVE stand-in (node.exe copied as docker.exe, its preload records argv), fail-before on
    `r58c/B/pre-pathconv/race_gate.sh`; end_of_run.sh's line by text (before bytes in `r58c/B/pre-pathconv/`).
    (b) `r58c/B/ktest.sh`'s three-sample loop (my change 3) used `set --`, which replaced the inner script's
    arguments with the sample's numbers (ktest-b32 ran `role_report.sh 12473244 35617836`, exit 2; ktest-b33 ran
    kt_inner.sh with no real test). `lane_step.sh` and `rerun_check.sh` keep their arguments in variables and were not
    affected. Test: `test_memgate_empty.sh` (the arguments reach `docker run`; fail-before on
    `r58c/B/pre-argfix/ktest.sh`). ktest-b34 died because I edited ktest.sh while it was being read. Runs b30-b34 are
    void; the queue ran again as ktest-b40 onwards.
17. **A defect of my own from the ruling-92 change, found by 2d (ktest-b42, 00:13Z)**: `train/write_result.py`
    (pinned a8135e3d) ends RESULT.md's leak-audit line with ruling 92's text; `r58c/write_audit_claims.py`'s claim map
    still expected the line without it, so four leak-audit claims were NOT FOUND and the test run ended exit 24
    (`wac_reproduces_and_finds_every_claim` and `r86b_section9_lists_2b_and_2e_with_sha256` failed). The claim line now
    carries the same suffix. Fail-before: `r58c/B/logs/test_write_audit_claims.pre-r92line.log` (the run on the bytes
    kept in `r58c/B/pre-r92line/write_audit_claims.py`); pass-after: the rerun of role_report p2.

## Round 3 (the coordinator's order after ruling 95), agent B, 2026-11-15 about 02:00Z

18. **2e on the old returns is VOID** (ktest-b58, 01:48Z, exit 14; log `r58c/B/out/logs/wr_rehearsal.log` kept). The
    coordinator held 2e after it had run: agent A rebuilt the pick8 hand-offs (tune 042e1a41..., held-out ef315738...),
    and the returns in `grader-returns/test/` (tune-rank 54e30a48..., tune-item24 4217581e..., heldout e3007d95...) were
    graded from the old tune hand-off 0565f62a.... write_result refused for two reasons, and the second one will come back
    on fresh returns unless it is ruled first:
    (a) `handoff_sha256 0565f62aa964 is not the hand-off the lane wrote (042e1a41e96d)`: explained by the rebuild;
    (b) `rank keys: missing ['E2_alone_mean', ...]`: write_result's TUNE_ROWS (and LABELS16 for tune-item24.json) is the
        fixed real set, 6 arms x 2 kinds x (3 seeds + mean) + 4 comparators = 52 rows; the test hand-off carries ONE arm
        (E1), so the grader returns 12 rows (and 6 labels). grader-interface-v2 section 8 asks for "the exact key sets",
        section 6 names 16 labels. **Needs a ruling** (only the coordinator can decide): either write_result in test mode
        takes the expected set from the hand-off's variants (a change to train/write_result.py, test mode only; the real
        set stays fixed), or the test hand-off carries all six arms. Nothing is coded around until then. The values
        themselves agree: `r58c/B/rehearsal/compare_rank.py` found the 96 cells the return carries equal to the harness's
        tune.json (largest difference 0; ktest-b57, `r58c/B/out/logs/tune-harness.log`).
19. Note 11 (a) needed a writable `train/selectB-test` and `train/report`, which `r58c/B/ktest.sh` mounted read-only:
    `KT_TRAIN_RW` (only these two words; anything else exit 2) adds them for one run (test_memgate_empty, before bytes
    `r58c/B/pre-ktrw/`). `train/selectB-test/` held a Nov-14 output without the builder and fixed-w tables that
    `report.py --test` reads, so `selectB.py --test` (as it is) restaged it first; `report.py --test` then ran unchanged.
20. r4's memory (superseded, the coordinator: 4g is deliberate): `lane_step.sh` gives ktest-r4 `-m 4g --memory-swap 4g`
    (`MEM_R4`; ruling 79/item 2's maximum, 4,096 MB, below the 3 x 1,402 MB = 4,206 MB of the earlier order, by the
    coordinator's decision) and starts it only on ruling 79's rule: free >= 6 GB AND commit < 38 GB (`COMMIT_R4`), three
    samples 30 s apart; every other step keeps 1536m and commit < 40 GB. Time limit 3600 s (floor 231 s). Before bytes
    `r58c/B/pre-r4mem/` (1536m) and `r58c/B/pre-r4g/` (4400m, 40 GB); test_memgate_empty (33 checks).
21. tune_harness.py "as it is" cannot run on the rebuilt fakesel (note 18 option (a): six fake arms, 40 variants): it
    asserts `arms == ['E1']` and `var == {'E1': ['alone', 'fused']}` (tune_harness.py:44, :46) and reads
    `E1/choices.json` only (:47), so on six arms it stops with an AssertionError before writing tune.json. Making it take
    the arms and variants fakesel holds is a code change to the harness; not made, waiting for the coordinator's word.
    Run: ktest-b62 (02:28Z, FAKESEL-READY 02:26:34Z, fakesel.manifest 229cb87e), exit 1, AssertionError
    ['E1', 'E2', 'E3', 'E4', 'E5', 'PLACEBO'] at line 44; log r58c/B/out/logs/tune-harness-only.log.
    **Resolved** (the coordinator's yes: our rehearsal tool, not on the frozen path): `discover()` reads every arm
    directory and every `<variant>_<scope>_s<seed>.tsv.gz` of fakesel, no fixed list, and refuses an incomplete
    variant, a stray file, an arm without choices.json or tables, a seed outside (1, 2, 3); verdicts, Holm and
    harness_check follow report.main on what the arms hold. Before bytes `r58c/B/rehearsal/pre-sixarm/`; test
    `r58c/B/tests/test_tune_harness.py` (ktest-b64); the harness rerun is ktest-b63.
    `r58c/B/rehearsal/harness_tune.sh` (new) runs the harness alone, without compare_rank and without reading or
    hashing anything under grader-returns/ (harness.sh hashes grader-returns/test/tune-rank.json).
22. The shared lock: no lane code removes `r58c/ktest.lock`. `r58c/B/ktest.sh`, `lane_step.sh` and
    `test_end_of_run.sh` wait with `until mkdir` and remove only a lock they took (EXIT trap after the mkdir);
    `race_gate.sh` only reads container state. The one place that removes a stale lock is END-ORDER's reset item (f),
    which now also requires no running `ktest-G*` and no `LANE/orchestrator/grader-running.txt`. Finding:
    `orchestrator/end_of_run.sh` does not take the lock at all (it refuses only while a `ktest-*`/`kge-*` container
    runs), so it would not wait for a coordinator grader run that holds the lock between containers.
    **Resolved** (the coordinator: end_of_run.sh is mine since round 2): its one container launch now takes
    `r58c/ktest.lock` as ktest.sh does (`until mkdir`, every 30 s, before the memgate rule; EXIT trap after the mkdir;
    freed right after `docker wait`). Before bytes `r58c/B/pre-eorlock/end_of_run.sh`; test `r58c/B/eor/test_eor_lock.sh`
    (fake docker `r58c/B/eor/fake_docker_eor.sh`; cases G, W, M and the fail-before GB). END-ORDER section 0 and step 1.
23. Ruling 96 (c), ruling 97 (b), (d), D1 and the 150-line cap of RESULT.md. With the ruling-96 line and three ruling-97
    lines the worst case of RESULT.md (every return, the 16-row graded item-24 table, the held-out table) is 151 lines,
    over `write_result.MAX_LINES` 149 ("under 150 lines", END-ORDER 9.3); write_result refuses that (exit 9, ktest-b79).
    Nothing is cut and no cap is raised: ruling 97 is ONE limits bullet of three parts, (b) with the route audit's
    counts, (d) with the two pool medians, and D1 "under ruling 97 (d)" (the coordinator's words), so the worst case is
    149 lines. result.json keeps the three parts apart (`limits.97`). Settled in the code, not a conflict; noted so the
    coordinator can rule otherwise (a raised cap, or another line merged) before the freeze.
24. Ruling 97 (b)'s post-run audit (the coordinator: "decide where it runs"): step 9.2a, container `ktest-r11`
    (`r58c/B/e5_route_audit.py`), after the grader's returns and the leak audit, before write_result, so it changes
    nothing that ran before the freeze and the leak audit's inputs (ruling 95) are unchanged; its record is saved after
    the leak audit and listed in AUDIT.md section 9 with r5's and r6's. Fixed list (ruling 94): `train`, `eval`, `export`
    read-only, the script, `/build/tasks/tasks.jsonl` alone, only `train/report/e5_route` writable. Limit 1800 s
    (`LIMIT_R11`; the stand-in timing is in END-ORDER section 0). The skip count follows kge.py exactly: a routed
    specialist is skipped when its area holds no co_changed triple at the checkpoint (`kge.train` then gives it no
    `rco`, and `kge.score` skips an area not in `specs`). Seed 1's parts only (the routing does not depend on the
    seed). For a frozen arm other than E5 it writes `applies: false` and the pool medians only; RESULT.md then says
    "the frozen arm is X, not E5" in the (b) part, so the routing change is named in every case.
25. Earlier r96 test checks were wrong and never passed until now (first run ktest-b79, on mixed bytes): the missing-text
    case replaced a phrase r96_limit does not read, and the claim-row check looked for the source's tag where CLAIMS.md
    prints its path. Both corrected (the missing-text case now breaks "so the settings were chosen on graphs without
    it"; the row check reads the protocol's sha256 and `ok`). E1 (FINDINGS-common.md) is a note in AUDIT.md section 1,
    after ruling 92's line; nothing compares `ranked_sha`.
26. The coordinator's standing rule (about 04:45Z): never open, read, grep, hash, copy or mount r58c/A/out/probe_test/,
    r58c/A/logs/test_probe*.log or the ktest-a19/a24 logs. What of agent B's touches those paths (nothing of B's
    READS them; these MOUNT them):
    (a) `r58c/B/ktest.sh:55` mounts the whole `r58c/` read-only (`-v $W/r58c:/w/r58c:ro`) into every ktest-b container, so
        r58c/A/out/probe_test/ and r58c/A/logs/ are visible in each (ktest-b80..b83 ran so; none of their tests read
        either path). Every further ktest-b run (the 2e rerun, test_mounts_vs_leak_audit) is HELD until the coordinator
        rules. ktest-b84 was stopped before its container started (lock freed by its own trap). A possible fix, NOT
        made: tmpfs over both paths (`--mount type=tmpfs,dst=/w/r58c/A/out/probe_test`, the same for
        `/w/r58c/A/logs`), or mounting r58c/ subfolder by subfolder.
    (b) `r58c/B/mounts-B.json` (from `r58c/B/gen_mounts.js:18`, BASE) mounts `r58c/A/logs` read-only into ktest-r1,
        r2, r3, r4, r6, r7, r8 and r9 (end-order steps 4-6, 8, 9.3, 9.4). No lane code I found reads r58c/A/logs at run
        time (write_result and write_audit_claims read none of it); the mount can go, or be narrowed to named files,
        on the coordinator's word (it changes mounts-B.json, so the leak audit's ruling-94 lists change too).
    (c) ktest-r10 (agent A's leak audit) mounts the whole lane at /w: its inputs are agent A's to answer.
    Not touched: `r58c/B/freeze_list.sh` lists `r58c/A/*.py` and `r58c/A/*.sh` only (no out/, no logs/);
    write_audit_claims's section-9 hashing reads r58c/rehearsal/, heldout-launch/, r58c/B/out/rehearsal/,
    r58c/B/out/logs/wr_rehearsal.log and r58c/mounts/ only. Before the rule, one `find r58c -name RESULT.md`
    (looking for RESULT.md outputs) walked r58c/ and so listed names under those folders; no file there was opened.
    **Lifted** (the coordinator found nothing to quarantine). ktest-b84 and later ran after the lift.
27. r58b/ and grader-returns/ in test containers (the coordinator, round 3). Before: `r58c/B/ktest.sh:56` mounted
    `r58b/` whole (with `r58b/out/hstage`, the r58b round's full held-out staging, 386 MB) and `grader-returns/` into
    EVERY ktest-b container. What agent B's tests read under r58b (through ktest.sh): test_gate (`r58b/pre/selectB.py`,
    `r58b/pre/report.py`, fail-befores), test_verdict (`r58b/pre/report.py`), test_selection_freeze8 and mf4.sh
    (`r58b/logs/test_verdict.log`, part D; mf4.sh links `/w/r58b` into its mutant copy), wr_rehearsal.sh, the 2e wrapper
    (`r58b/out/item22_test/item22.json`, `r58b/out/leak_audit.json`, TEST records); agent A's tests that ktest.sh's
    default branch could run (test_item27, test_answer_level: `r58b/pre`; test_heldout, test_probe: `r58b/pre2`,
    hotest `r58b/out/fakeB`; test_leak_audit: `r58b/out/leak_parts`, `hstage`) run on agent A's launcher, not mine,
    and are not mounted for. grader-returns/ is read by wr_rehearsal.sh and compare_only.sh (2e) and by the old
    harness.sh (superseded by harness_tune.sh + compare_only.sh). No test reads `r58b/out/hstage`.
    After: ktest.sh mounts read-only only `r58b/pre` and `r58b/logs/test_verdict.log` for every test; for
    wr_rehearsal.sh also `r58b/out/item22_test` and `r58b/out/leak_audit.json`; `grader-returns/` only for
    wr_rehearsal.sh and compare_only.sh. A missing source is named and not mounted (Docker would make an empty folder).
    Before bytes `r58c/B/pre-kt58b/ktest.sh`; test test_memgate_empty.sh (fake docker; 7 new checks, fail-before on
    the old bytes). harness.sh now sees no grader-returns (it is no longer a 2e step).
28. 2026-11-15, round 4 (the Lead's item 2, ruling 94(d)): `r58c/B/mounts-B.json` mounted `r58c/A/logs` read-only into
    ktest-r1, r2, r3, r4, r6, r7, r8 and r9 (from gen_mounts.js BASE). No real step reads it: selectB.py, report.py,
    item27.py, answer_level.py, write_result.py, write_audit_claims.py and r58c/A/precheck_handoff.py name no
    `r58c/A/logs` path (grep). r7's section 9 takes its 2b evidence from `r58c/rehearsal/` and `heldout-launch/`, its 2e
    evidence from `r58c/B/out/rehearsal` and `r58c/B/out/logs/wr_rehearsal.log`; the RUNLOG's PASS logs are under
    `orchestrator/` and `r58c/B/out/logs`. So r7 does not need it either, and it is removed from all eight (40 lines, no
    other change; `node r58c/B/mounts.js check` ok, 12 containers). gen_mounts.js BASE drops it too (mounts-B.json is
    hand-edited since ktest-r11, so it is not regenerated). END-ORDER section 0 says so. Before bytes
    `r58c/B/pre-alogs/`; test_freeze_check.sh case 15 (fail-before on the pre-alogs mounts-B.json and gen_mounts.js);
    test_mounts_vs_leak_audit re-run (ktest-b91). END-ORDER's limits row for r4 still cites
    `r58c/A/logs/time_tune-late50.json` as the source of a measured figure; that is a citation, not a mount.
29. 2026-11-15, round 5 (the Lead, after agent A's ROUND7): END-ORDER 2b's pending lines written from r58c/A/RUNLOG-A.md
    ROUND7 (heldout.sh 1ef02a8c rehearsal staging check, exit 8; agent A's ktest.sh mounts only r58b/out/fakeB,
    out/leak_parts, pre, pre2; r58b/out/hstage removed; the root-file comparison; leak_audit.py 6a2bf7f4 with three
    GRAPH_RULES). My tests that import leak_audit.py ran again on 6a2bf7f4: test_mounts_vs_leak_audit (ktest-b92; b91
    had already run on these bytes, same log bytes) and test_write_audit_claims (write_audit_claims.py imports it;
    role_report p2, ktest-b93). wr_rehearsal.sh (2e) runs only write_result.py, which does not import it: not re-run.
    test_memgate_empty.sh names hstage only inside its own fake lane (r58c/B/memtest/<case>/r58b/out/hstage, an empty
    folder it makes) so that its check "no container mounts r58b whole or r58b/out/hstage" (line 139) has something
    the before bytes would mount; it reads nothing of the real r58b and is only that NOT-mounted check.
    r58c/FINAL-CHANGED.txt: baseline = RUNLOG-B lines 16-84 (END-ORDER 61d1c51e) and r58c/A/STATE-after-reset.md;
    agent A's files from r58c/A/sums.js, hashes read from disk.

30. 2026-11-15, round 6 (the coordinator's last edit round; ruling 98). Four points, none coded around:
    (a) Step 9.1 failed on the exit code only: neither r58c/B/lane_step.sh (ad894853, kept as
    r58c/B/pre-r98/lane_step.sh) nor orchestrator/end_of_run.sh (step 2, not 9.1) read leak_audit.json, and
    leak_audit.py exits 0 on a FAIL verdict (agent A, round 8). lane_step.sh now reads the file itself after a
    command code of 0 for ktest-r10 and exits 10 unless it was written by this run (mtime after the start) and says
    ok true, test false. leak_audit.py is untouched. Test r58c/B/tests/test_r10_verdict.sh (13 checks; the before
    bytes pass a FAIL verdict as exit 0).
    (b) RESULT.md's limits never carried ruling 43 (it was not in LIMIT_RULINGS). Ruling 98 asks for it beside 98, so
    write_result.py prints ONE bullet "Ruling 43 ... Ruling 98 ..." (r98_limit). The worst case was already 149
    lines (note 23: the cap is not raised); to stay at 149 the blank line after the "## Limits ..." heading is
    dropped. This is a layout trade in a coordinator-accepted layout: the coordinator may prefer another line to go.
    (c) rerun_check's pick needs no change: it picks one unit per (arm, configuration), so E4 c13 and E4 c16 each give
    one (c13's 100th done line is a 4g unit; c16 runs wholly under 4g). Risk, not changed: kge-R1 runs at -m 2560m;
    ruling 98's relaunches show one c13 unit finishing in a fresh process under 2560m, but no single c16 unit has
    run under 2560m. A kill (137) on the c16 pick would stop step 2c under its stop rule. Changing kge-R1's cap
    needs a ruling.
    (d) AUDIT.md section 7b reads train/progress.jsonl and orchestrator/guard-stageB.log through ktest-r7's existing
    read-only mounts (/w/train, /w/orchestrator): no mount list changed. A host dry count of the real files (counts
    only, 2026-11-15T06:55Z) found no done line before the first guard start, so CAP_TABLE (36) would not fire today.
    (e) END-ORDER 2g said "Agent B's 2e ran before the grader wrote them". That is false for ktest-b84: the files of
    grader-returns/test/ were last written at 2026-11-15T02:50Z (mtimes only), and b84 (05:05Z) ran write_result.py
    --test on them; r58c/B/out/logs/wr_rehearsal.log names tune-item24.json dc9bc94c..., the same hash the
    coordinator gives for the late-50 run's tune-item24 return. So the comparator figures of that return reached
    r58c/B/out/rehearsal/. I found this in round 6 while preparing a 2e re-run on the new write_result bytes, and I
    did not run it. Nothing was deleted. 2g now carries the correction; the coordinator rules whether it matters.
    (e) CORRECTION (round 7, from the coordinator): (e) above was a mistake and nothing went wrong. dc9bc94c... is
    the PICK8 tune-item24 return (37 tasks, 8 commits, 16 labels; hand-off 17133176...), not the late-50 one. The
    late-50 return (db31e7e9...) was moved to the grader's side at 02:48Z, before the pick8 gradings wrote theirs at
    02:50Z, so it was never in grader-returns/test/ when ktest-b84 ran. The 2g text in END-ORDER is corrected in
    the last revision, not in round 7.
    (f) Round 7, 2e re-run on write_result 53b629d1: ktest-b95, exit 0, RESULT PASS 2e (write_result exit 0;
    RESULT.md 144 lines, result.json test true, limits.43 and limits.98 present). Inputs: the three pick8 returns
    bc2d56da (tune-rank), dc9bc94c (tune-item24), 67aa54c8 (heldout), the only files in grader-returns/test/;
    nothing else opened there. Outputs r58c/B/out/rehearsal/result.json 5d98e3e4..., RESULT.md a5e408d0...; log
    r58c/B/out/logs/wr_rehearsal.log 67578acb... (b84's log kept as wr_rehearsal.b84.log 2ca7e863...; b84's outputs
    renamed by the script to r58c/B/out/rehearsal.old-20261115T073158Z).

31. 2026-11-15, round 8, C1/C2 and ruling 101(a): file-level graph mounts do not fit the Windows command line.
    The graph files each step reads are export/graphs/<P>/{pilot_graph.tsv, pilot_co.tsv, entities.tsv}
    (evalcore.PilotGraph opens all three). ktest-r4 and ktest-r8 read them for the 38 parents of the 313 late-50
    tasks; ktest-r9 reads them for the 70 held-out parents. One -v row per file gives 114 rows for r4/r8 (31,806
    characters of -v flags, about 34.6 KB of command with the base list) and 210 for r9 (58,590 characters).
    CreateProcess caps a command line at 32,767 characters; a probe from this shell (node with a 40,000-character
    argument) gives "Argument list too long", and 32,000 works. So the exact-files lists cannot be started by
    `docker run` from lane_step.sh. Options, for a ruling:
    (A) one read-only row per parent FOLDER export/graphs/<P> (r4/r8 9,538 characters, r9 17,570): only the parents
        read, but each folder also holds ancestors.txt, sizes.json and triples.tsv, which these steps do not read;
    (B) a lane folder of NTFS hard links holding only the three files per parent, mounted as one row (the files
        read and nothing else, but a second path to the held-out graph files inside the lane, which the leak
        audit would have to classify);
    (C) create the container through the Docker Engine API (node over the named pipe), with no command line.
    Recommended: (A). Also: the TEST held-out hand-off (r58c/handoff-test/heldout/HANDOFF.json) is test_set pick8,
    so its precheck reads tuning parents' graphs; under ktest-r9's exact held-out list it cannot run. Its 2d run
    needs r9's list plus the pick8 parents' graphs (a test list) or the r8 list. Asked the Lead at about 08:00Z;
    READY-mounts-r101 is not written until the ruling.

32. 2026-11-15, round 8, ruling 100 against ruling 86's container stop in step 2c. Ruling 100 raises kge-R1's cap to
    4 GB because the last E4 c13 units and every c16 unit were made under 4 GB and none of c16 under 2560m.
    rerun_check.sh now runs -m 4g --memory-swap 4g (r58c/B/rerun_check.sh:59; test r58c/B/tests/test_rerun_r101.sh).
    It also still stops the check when the CONTAINER passes 3.5 GB (ruling 86's probe stop rule;
    rerun_check.sh:85, END-ORDER :324). Ruling 100 does not name that stop. If a c16 unit's peak lies between
    3.5 and 4 GB, the stop ends the check for the very reason ruling 100 removes the 2560m cap. I have NOT changed
    the 3.5 GB stop (nothing coded around). For a ruling: keep 3.5 GB as is, or raise it for kge-R1 (say to 3.9 GB,
    under the cap so the stop comes before the kernel's kill). The stage-B record of c16 peaks would settle which.

33. 2026-11-15, round 8, the 2d TEST runs of ktest-r4, ktest-r8 and ktest-r9 cannot run on the step's list alone.
    (a) ktest-r4 (`answer_level.py tune --test --test-set late50`): in test mode answer_level.py needs explicit
    --sel, --out, --tables and --plan and refuses any of them under train/{stageB,selectB,heldout,report}
    (answer_level.py:329-332, ruling 80). ktest-r4's only writable row is train/report/answer_level, a real folder,
    and its list has no test plan or tables (2g used r58c/A/out/fakestage: plan.json and an empty tables folder,
    r58c/A/tune_late50.py:20-21). So the run needs two rows more: r58c/A/out/fakestage read-only and one writable
    test folder outside the real folders (say r58c/B/out/r4test -> /w/r58c/B/out/r4test).
    (b) ktest-r8 and ktest-r9: the TEST hand-offs are r58c/handoff-test/tune-late50/ (e6b631e5..., late50, fits r8's
    graph rows) and r58c/handoff-test/heldout/ (3c1d47c5..., pick8); neither folder is under r8's or r9's mounts
    (train, eval, orchestrator, progress.jsonl, r58c/B/out/logs, precheck_handoff.py; r9 also tasks.jsonl). Each
    needs one row more: its hand-off folder read-only.
    Proposed, for a ruling: graph_rows.js test-file adds exactly these rows to the TEST mounts file (marked
    "_test", used only through LS_MOUNTS with LS_PREFREEZE=test and " --test ", recorded under
    r58c/B/out/mounts-test/, never r58c/mounts/); the graph rows stay the generator's (late50 for r4 and r8, pick8
    for r9); every other row is the step's own. Nothing is coded yet (nothing coded around). The re-measure waits on
    kge-B1 in any case.

34. 2026-11-15, round 8, ktest-eor and the leak audit's scope. ktest-eor (step 1, end_of_run.sh assemble; ruling
    101 (e)) now has an entry in r58c/B/mounts-B.json (step "1") and a record r58c/mounts/ktest-eor.json. Agent A's
    train/leak_audit.py (8da35f9c...) r94_in_scope (leak_audit.py:459-462) judges only the card window (2a-2c) and
    steps 4 to 8, ruling 95's words, so it reads ktest-eor's record and lists it but does not judge it against its
    list (in_scope false). Ruling 101 (e) says the record is saved "like every other step's" and does not say
    whether the audit judges it. test_mounts_vs_leak_audit.py now expects ktest-eor out of scope, as the audit
    reads it (the test failed on ktest-b99 for lacking the key). For a ruling: leave ktest-eor out of the judged
    scope (ruling 95 as written), or have agent A add step 1 to r94_in_scope. Not coded around; no file of agent A
    touched.

## Round 8, ruling 104 and C29-C49, agent B, 2026-11-15 about 10:40Z

35. 2026-11-15, C23, tests on disk that 2d does not name. The host listing (RUNLOG-B "C23 listing") finds these
    test files outside 2d's list. Left out as earlier rounds left them, for the reason given; the first group is
    for a ruling, nothing is coded around:
    (a) Ruled (the coordinator's T2, 2026-11-15; ruling 106(a)): 2d runs these once more on the final bytes (END-ORDER
    2d, TEST-QUEUE q32; kt_inner.sh routes, T2-0); amended by ruling 107(a) (note 40): 2d runs test_r64 and
    test_e5_equiv only, not test_r53_58_unit; the text of the question as it stood: `fixes/tests/test_r53_58_unit.py` and `fixes/tests/test_r64.py` (rulings 53, 58, 64 in
    `train/selectB.py`, which step 4 runs; 2d runs `r58c/tests/test_r64.py` and `fixes/tests/test_select_report.py`,
    which cover rulings 53, 54, 56, 58 and 64 through the real entry points, but not test_r53_58_unit's unit cases),
    and `fixes/tests/test_e5_equiv.py` (kge.score against stage A's routed scores; `train/kge.py` is frozen and is
    run again by step 7). They test bytes that have not changed since they passed at the release gate. Should 2d
    run them once more?
    (b) Stage B only, its run over and its code frozen (nothing after step 1 runs it): `fixes/tests/{test_ops_stageB,
    test_r49_50_detail, test_r49_52, test_r55, test_r59, test_r59_start, test_r65_66, test_rename}.py`,
    `fixes/tests/test_guard_host.sh` and its two copies `r58c/r92/test_guard_host_{new,old}.sh`,
    `parallel/tests/{test_guard_stageAB, test_rerun_compare_host, test_rerun_driver, test_swap}.sh` (the stage-A/B
    guard, the old rerun-compare driver, the swap; `rerun_compare.py` itself is covered by `test_rerun_check.py`).
    (c) Copies kept as records, not tests of the lane's bytes: `orchestrator/deltacheck/fixes/tests/*` (eight
    files, a review snapshot), `orchestrator/delta-review/test-rerun/test_end_of_run-r.sh`, `r58b/eor/test_end_of_run.sh`
    (round r58b's copy; 2d runs `r58c/B/eor/test_end_of_run.sh`).
    (d) Not a test file of 2d's kind: `r58c/B/rehearsal/report_test.sh` is step 2g's TEST report (ruled and done).

36. 2026-11-15, C49 (ruling 105(c)): where the held-out non-finite count is stated. `train/write_result.py` has no
    input for it, and RESULT.md is at its worst case of 149 lines already (`MAX_LINES` = 149, line 70; the 2e
    rehearsal's RESULT.md has 144 lines), so no line can be added. A sentence appended to an existing bullet (for
    example the limits bullet of ruling 105) fits the line cap, but it needs a code change before the freeze:
    write_result.py reads the coordinator's line from `progress.jsonl` (its unit name and fields are not fixed yet;
    say `nonfinite_heldout` with the count and the seeds and parents it touches), prints the sentence, records it
    in result.json, and CLAIMS.md maps it; plus a test with a fail-before. `r58c/write_audit_claims.py` has no input
    for it either, so "AUDIT.md only" also needs a code change. For a ruling: (i) the write_result change above, (ii)
    the AUDIT.md change only, or (iii) neither: the coordinator's report states the count. Nothing is coded.
    **Superseded the same day** by the coordinator's C49 order (if it fits, add it as an optional input, absent by
    default, with a test that the worst case stays at or under 149): it fits, and (i) is built. The line format the
    coordinator writes (the lane chose it; the coordinator confirmed it, T3, and records it for a count of 0 too, with
    empty lists, C63): `{"step":"coordinator","unit":
    "nonfinite_heldout","count":N,"seeds":[int,..],"parents":[hex sha,..],"t":"<UTC>"}` in `progress.jsonl`, the last
    such line counting. Absent or count 0: nothing printed; count above 0: one sentence on the ruling-97 bullet; any
    other shape: exit 10. write_result.py before bytes `r58c/B/pre-r105/write_result.py`, write_audit_claims.py
    before bytes `r58c/B/pre-r105/write_audit_claims.py` (WRITE_RESULT_PIN moved to the new write_result.py). END-ORDER
    step 8 and 9.3.

37. 2026-11-15, two points to name in the report (no ruling asked unless the coordinator wants one).
    (a) The r8 and r9 TEST measurements (C45) run through `lane_step.sh` as `ktest-r8` and `ktest-r9`, not
    `ktest-b<N>`: the coordinator's C19/C45 order says to measure them under their lists, and a TEST run keeps the
    step's name (section 0); each ran under the lane lock, one at a time, with LS_TEST_LIMIT=570.
    (b) The r4 TEST re-measure (C1, 2d) cannot run yet: `tune_inputs/` does not exist, and ruling 104(a) puts its
    build after the card window. The limits table keeps the r4 figure of ktest-a15 until then.

38. 2026-11-15, the r9 TEST command of 2d (found by running it). `precheck_handoff.py` refuses a held-out
    hand-off without a freeze sha256 (its check 2), so the 2d form `--split heldout --test` alone exited 1
    (`r58c/B/lane-steps/ktest-r9-20261115T102934Z.log`). Its own default TEST mode uses the sha256 of the TEST record
    `r58c/A/out/ho_rec/item27.json`; the 2d command now passes it as `--freeze-sha256 $(sha256sum ... | cut -c1-64)`
    taken on the host, so the ktest-r9 TEST list mounts nothing more. A text fix of my command, no code change; named
    in the report.

## Round 9, ruling 106 and C51-C67, agent B, 2026-11-15 about 12:00Z

39. RULED (ruling 107(b), 2026-11-15 about 12:31Z): no change; the launcher waits for three memory samples 30 s apart
    before every start, so two records of one container cannot carry the same second. As raised: 2026-11-15, an
    observation, no ruling asked (not ordered; nothing coded). `r58c/B/lane_step.sh` (a real run) moves an
    older record to `r58c/mounts/<name>.<mtime UTC>.json` with `mv` and no collision suffix (line 143): a second real
    run of the same step whose earlier record has the same mtime second as a kept one would replace that kept record.
    It needs two records of one name within the same second; no real step has run yet. `heldout.sh` `save_record`
    adds `-1`, `-2` (C36, C56). Named here so the coordinator can decide whether the same rule should apply.

40. RULED (ruling 107(a), 2026-11-15 about 12:31Z; C68): 2d does not run `fixes/tests/test_r53_58_unit.py`; its three
    ruling-53 cases in ktest-b112 (log `r58c/B/out/logs/test_r53_58_unit.log` sha256 a3392c75...9d15, selectB.py
    d54cb864...b885) are the record; 2d keeps test_r64_fixes and test_e5_equiv; if train/selectB.py changes before the
    freeze the lane reports before 2d; kt_inner.sh and freeze_list.sh unchanged. As raised: 2026-11-15, FOR A RULING
    (q32, ktest-b112, 12:07:50-12:07:57Z): `fixes/tests/test_r53_58_unit.py` (62d6dae7, last
    written 2026-11-14T18:28Z) prints `RESULT FAIL test_r53_58_unit` on the final `train/selectB.py` (d54cb864): its
    three ruling-53 checks pass (r53-se, r53-w, r53-size), and its r58-guard case fails. The case writes one sha256
    line per role of `R58_ROLES` naming fake files `r58c/B/out/test_r53_58_unit/r53_58/f<i>.py` and no PASS lines, and
    expects `good` to pass; the current guard refuses it, exit 3, because since ruling 83 each sha256 line must name
    the role's own file (`ROLE_FILES`, `train/selectB.py` lines 69 and 111) and a PASS line must follow it. The other
    three cases (wrong hash, missing file, role missing) exit 3 as the test expects. So the case encodes the guard
    contract from before ruling 83; it is not a defect of selectB.py. Ruling 83's contract is tested in 2d by
    `train/r58/tests/test_gate.py`, `r58c/tests/{test_r64, test_selection_freeze8}.py` and `r58c/B/tests/test_sr6_guard.py`.
    My note 35(a) said these tests "test bytes that have not changed since they passed at the release gate"; for
    selectB.py that was wrong. Nothing is changed or coded around: `fixes/tests` is not agent B's to edit. For a
    ruling: (i) the r58-guard case counts as superseded by ruling 83 and q32 passes on the three r53 checks, (ii) the
    case is updated to ruling 83's contract (by whom), or (iii) another reading. The other two q32 tests passed:
    `test_r64_fixes` (`RESULT PASS test_r64 post`) and `test_e5_equiv` (`RESULT PASS`, max |diff| 2.98e-08).

## Step 2d, the lead, 2026-11-15 about 15:05Z

41. RULED (ruling 109, 2026-11-15 about 14:37Z): a 2d test that fails on the machine's refusal of its own scratch
    file ("Device or resource busy") is run again unchanged, up to two more times. Applied to
    `r58c/B/tests/test_pass_paths.sh` (run 1 FAIL, terminal 18599acb...7dee, log c45413e1...; run 2 PASS, log
    062af81c...) and `r58c/A/test_heldout_r101.sh` (run 1 FAIL, log e8d98f94...; run 2 PASS, log a085594b...).
42. RULED (ruling 110, 2026-11-15 about 15:00Z; record, no fix): `r58c/A/rehearse.sh` lines 46 and 63 let the success
    of a note (`note()` at line 19, `echo | tee -a "$SUM"`) decide a branch. A refused append marks an arm failed
    (line 46) or prints a stray FAIL line after PASS (line 63); it can never turn a failure into a pass, and the
    exit code follows `$fail`. Seen in `r58c/A/test_rehearse_stop.sh` run 2 (14:56:14-14:57:50Z, nothing else
    running, PASS, log 4e52f87f...37af, terminal 86c32cc7...06b9): its l1 case printed RESULT PASS and then RESULT
    FAIL with rc 0. Run 1 (13:36:49-13:38:38Z, FAIL, log 0ed8a2a2...b8b8, kept as scratchpad 2d-A/
    test_rehearse_stop.run1.log; terminal 9be2e921...) is unexplained; the line-46 form fits it, unproved, since the
    test deletes its scratch folder. The real 2b (REHEARSAL.txt d13ead7a...) has one RESULT line, PASS. The
    coordinator read every other launcher of the order: no log call decides a branch there. AUDIT.md does not carry
    this (its writer reads no text for it); the record is ruling 110, RUNLOG-A, this note and the coordinator's
    report.
43. RULED (ruling 111, 2026-11-15 about 15:17Z): `r58c/B/eor/test_end_of_run.sh` cannot pass as it is once step 1 has
    run. Its fixture `r58c/B/eor/make_copy.js:16` copies the real `train/RUNLOG.md` into each trial lane, and since
    step 1 that holds step 1's own `PASS assemble-checks` line (line 923): the test's PASS-line counts (`passn()`, line
    40) read one too many, and case C's log checks (line 76) read two log names. 2d run 1 (14:59-15:14Z) failed 15 of
    43 that way; every exit-code and behaviour check passed. Neither the test nor make_copy.js changes. A diagnostic
    copy outside the lane's test files, whose make_copy drops that line from the trial lanes' RUNLOG, passed 43 of 43
    once (15:19-15:34Z, terminal 5efd45a2...); it stands as the 2d evidence with the 10:44Z run (097be17c...) and step
    1's real run. The test runs again only if step 1 is repeated before the freeze; the coordinator's report names
    the limit (111(c)).
