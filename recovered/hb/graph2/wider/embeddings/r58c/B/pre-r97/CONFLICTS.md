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
