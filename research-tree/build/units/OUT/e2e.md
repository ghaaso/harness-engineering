# OUT e2e: the end-to-end test writes what FX-OUT's children write (task r57-0507)

- **Commit** `a82b253b` on `u/OUT` ("OUT: e2e writes what FX-OUT's children write"). Its parent is `build` 4d11fa1d:
  the worktree was fast-forwarded from 6b5c48da first. Only `research-tree/e2e/run-e2e.mjs` changed (+33 -9). No
  script under `tcb/` was touched.
- **e2e: 232/232 ok, 0 FAIL**, lane label `OUTe2e-1`, lane exit 0. It ran on the first try, from the detached
  checkout `C:/Users/User/Documents/projects/hx-OUTe2e` of a82b253b, which has since been removed. The step log is
  `units/OUT/e2e.log`.
- **W1's nonce change (cross-unit item 13) ran for the first time and passes:** "handover raise (drain, quiescent):
  ce 2" and "handover bind (successor session)" are both ok.

## What changed, and why

1. **`ready(a, step)` (run-e2e.mjs:306-327) now goes through the hook.** It is async. It runs the attempt's guard
   hook on a PreToolUse Write of `staging/READY.json`, with the bytes that `tcb/briefs/child.md` line 41 gives:
   `{"kind":"ready","task","epoch","step"}`. The role comes from the hook command in the attempt's
   `.claude/settings.json`.
   - The hook's test-and-set creates the ready slot `outcome/<j>.json`. This follows FIX-fence.md:109-111 ("Done
     about it": the hook runs the test-and-set on the child's behalf) and the child-side steps 1-4 at :133-148.
   - Only on allow does the e2e write READY.json, which is "a copy that no decision reads" (:110-111).
   - This process stands in for the harness here, as it already does for the session start and the claim.
   - The hook's answer is checked but not counted. A FAIL line appears only when the hook answers other than the
     design says, so the count stays at 232. The counted check of each slot is the `commit record` step that
     follows it, which exits 2 `no-ready` without a slot.
2. **All six READY points now `await ready(...)`:** d-stpa, d-fmea, d-map (run-e2e.mjs:472); f1-research pack (:604);
   f1-control e2 pack and review (:642, :648); f1-review (:664).
   - f1-control's second READY is the case in Rev 5 point 3 (FIX-fence.md:1038): a row with several steps stays
     `active` after its first commit, and its child goes on. The hook allows it into the next slot.
3. **The torn READY fault (:599-603).** The torn bytes now go through the hook as the child's Write would. They are
   expected to be denied `ready-invalid` (child side 3, FIX-fence.md:139-141), so no slot is made and nothing lands.
   - Its counted step is unchanged: commit record exits 2 `no-ready`.
   - Before this change the torn bytes were written to disk directly. Under FX-OUT a child cannot reach that state:
     either the hook refuses the bytes, or it makes the slot before the Write lands.
4. **The replaced attempt f1-control e1 (:623-625).** It is fenced with reason stall, and the row is at epoch 2. Its
   late READY goes through the hook and is expected to be denied `stale-epoch` (child side 1, the epoch gate,
   FIX-fence.md:135). Neither a slot nor the copy is made.
   - The next watch step was renamed (:630) to "watch --once after the replaced attempt's late writes (its READY was
     denied: no copy for the zombie-write telemetry)".
   - The reason for the rename: watch's zombie-write line reads only a READY.json copy (OUT departure 1), and that
     copy no longer exists. The step checks only the exit code, and that check is unchanged.
   - "FAULT replaced attempt: the late write is logged (zombie-write)" still passes, from commit intake's
     stale-epoch line (commit.mjs:919).

## Failures left

None. No script looked wrong.

Not covered:
- The synthetic transcripts still show no Write call for READY (as before). No script reads the transcript for READY.
- Running the e2e modifies the tracked files `e2e/last-result.json` and `e2e/last-run.log` in the checkout it runs
  from. That is pre-existing behaviour.

## Tokens

`build-invariant: OUT e2e READY after suite 2 | calls 34 | tokens 4.10 M | context now 160.9 K`

This was taken before this file was written. No WARNING was printed. The expected figure was 3.4 M and the limit 5 M.
