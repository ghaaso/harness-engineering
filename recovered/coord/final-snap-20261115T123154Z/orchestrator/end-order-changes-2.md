# END-ORDER.md: changes after the conformance check (coordinator, 2026-11-14 about 23:05Z)

Source: `orchestrator/end-order-review.json` (two lenses and a refuter over revisions 1cdcb6e7 and 61d1c51e
and the scripts on disk; advice "accept after changes"). The finding ids below are the ones in that file.
Every change lands before the code freeze. I accept the revision whose sha256 you send after all of them
are in AND both agents have stopped editing; not 1cdcb6e7 and not 61d1c51e.

## A. Rulings and decisions

1. **Ruling 94** (`orchestrator/coordinator-rulings-94.md`; copy it to the end of section M). `lane_step.sh`
   stops mounting `$REPO:/repo` and the whole facts cache by default (rulings:F1, blocker). Each step gets a
   fixed mount list: r1, r2, r3, r8, r9 need neither; r4 (answer_level tune) gets a staging of the late-50
   tuning parents' facts and source store (`heldout_inputs.js build --split tune`, built and hashed in 2f,
   manifest in the freeze list, verified before step 5); r5 (item22) gets what stage A used; r6 and r7 get
   the deliverable folder (writable) and the protocol file (read-only), not the repository; r10 (the leak
   audit, after the grader has returned) may mount the repository and the whole facts cache. Save a
   `docker inspect` of every `ktest-r<N>`, `kge-R1`, `kge-H1P`, `kge-H1R` and `kge-H1` container and pass
   them all to `leak_audit.py --mounts`; AUDIT.md lists them; the audit fails on a mount outside the step's
   list for the card window and steps 4 to 8.
2. **2d runs every test once more, in full, on the final bytes** (rulings:F7). The "optional" skips of
   TEST-QUEUE.md are fine for interim runs and not for 2d. 2d's list names every test file and both agents'
   queues agree with it. If `answer_level.py`, `heldout.py`, `heldout_inputs.js` or HANDOFF-FORMAT.md
   changed after `r58c/handoff-test/` was built, the test hand-offs are rebuilt before 2e.
3. **Every ktest container, tests included, waits for 6 GB free and commit under 40 GB** (three samples
   30 s apart). `r58c/B/ktest.sh` uses only `memgate.sh wait`, which is the 4.5 GB training rule; give it
   the same 6 GB loop as `r58c/A/ktest.sh` and `lane_step.sh` (commands:F17 read the order as allowing 4.5;
   the machine rule is 6).
4. **item27.py refuses without my `tune_rank_check` line** in `progress.jsonl`, as heldout.py refuses
   without the anchor (rulings:F14), so the 1e-9 check before the freeze of the arm is enforced by code.
5. **Time and memory limits of the real steps are measured, not assumed** (commands, not covered). Before
   the freeze, time on full-size stand-in data: `answer_level.py tune` in test mode on the whole late 50
   with the four comparators and fake arms (40 variants, 313 tasks); `report.py` on fake tables of real
   size; `stageB.py assemble` plus `assemble_checks.py` on a copy of the real parts' shape (counts and
   sizes, fake scores) or state from stage-B's per-arm assembles how long the real one took; and for
   `item22.py` say from stage A's own timings how long its CPU training of the E4 settings takes. Set each
   step's limit in `lane_step.sh` and `end_of_run.sh` to at least three times the measured figure and put
   the figures in the order. A real step that hits its limit after the freeze has no legal way forward.

## B. The refuter's list (all confirmed or narrowed; do each)

6. rulings:F2 (blocker): `r58c/write_audit_claims.py` writes the AUDIT.md section ruling 86(b) requires:
   the 2b logs and container records and the 2e logs with their sha256, and what the rehearsal cannot cover
   (the real record and anchor, the 70 real graphs, wall time). Add its test to 2d.
7. commands:F2: `r58c/A/rehearse.sh:24` waits for a line that never comes, so its stop lands at an
   arbitrary moment. Make it stop at a real mid-unit point (after the first unit's `done` line, inside the
   next unit), then rerun the rehearsal's own test.
8. commands:F5, F6 and rulings:F8: the freeze list also holds `r58c/A/*.py`, `r58c/A/*.sh`
   (precheck_handoff.py runs after the freeze), `r58c/B/eor/*`, and a manifest of every file under
   `train/stageB/parts/` (item22 and the leak audit read parts after the freeze); or the order says exactly
   what is frozen and why the rest need not be. Remove the claim that `r58c/preflight/p1.sh` is used if it
   is not (commands:F13).
9. commands:F3, F4: 2e gets a named wrapper with the concrete test paths, run through `ktest.sh`, and
   `ktest.sh` exits with the container's exit code. Replace "a real-mode write_result on the same returns
   refuses" by the unit test that covers it. The lane never writes into `LANE/grader-returns/` outside
   `test/`.
10. rulings:F4: steps 5 and 8 say that I compare each return's `scorer.files_sha256` with my
    `grader_frozen` line, and that a difference stops the line.
11. rulings:F5 and commands:F8: step 7 says: if `train/heldout/HANDOFF.json` exists, do not run
    `heldout.sh` again; report. Step 8: I read the record's sha256 from the `start` progress lines in
    `train/heldout` (their `freeze_sha256`), and the wording is "one or more start lines, all for the same
    record", not "exactly one".
12. rulings:F9: the reset paragraph also says: if no `ktest-*` container exists, remove a stale
    `r58c/ktest.lock`; a leftover `ktest-r<N>` container has its logs saved and is then removed; both go
    into RUNLOG.
13. rulings:F10: step 1 names who restarts the guard after a quarantine found by end_of_run (the lane,
    `sh guard-stageB.sh` from `orchestrator`, since the guard exits 0 at completion), and that step 1 then
    runs again from its start.
14. commands:F7: step 6's stop list adds item27's exit 9 (a pin or tuning input missing); steps 4, 6 and 9
    say that the last line of the `lane_step` log decides whose exit code it is.
15. commands:F9: the step 3 and step 9.4 commands are each on one line, with no break inside the quotes.
16. rulings:F3: the sentence "a fix sends the lane back to 2d" becomes "the fixed step runs again, then 2d
    runs again in full".
17. rulings:F6: where step 7 quotes ruling 85's re-anchor path, add that the frozen bytes do not support it
    (heldout.py wants exactly one anchor line, item27.py refuses an existing record), so that path always
    needs a coordinator ruling that names the files it may change.
18. Notes to fix in passing: the leak audit's ruling-90 listing is `ruling89.ruling90_sites` (commands:F10);
    `heldout.sh` calls `freeze_check.sh`, not a bare `sha256sum -c` (commands:F11); the end_of_run summary's
    last word (commands:F12); my step-6 comparison of `pins` with the freeze list is by file content hash,
    whatever the path form (commands:F15); "the lead" is the lane (rulings:F13).

## C. What I do on my side

- Before the rehearsal I clear the stale files in `grader-returns/test/` (they are from the grader's own
  tests, not from your hand-offs).
- A reset in the middle of a grading leaves the grader's sealed marker in state "started"; I check that no
  return exists, remove the marker by a recorded step and run the grading again.
