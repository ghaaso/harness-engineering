# REDO departures (FX-REDO; branch u/REDO)

Design: `model/as-built/FIX-fence.md` section 5 (F5). Tests named are on u/REDO (lane labels in `units/REDO/result.md`).

1. **The test is its own file, `tcb/test/redo.test.mjs`, not the scripts' files** (FIX-JOIN point 13 says the
   script's file). One test spans replace, stop, status and fsck; a file of its own keeps the seven parallel
   units from colliding at the ends of the shared test files (r57-0128). The suite picks it up (`suite.sh` runs
   `tcb/test/*.test.mjs`). Render's part is a second test, T28 in `render.test.mjs` (its fixtures live there;
   no other unit touches that file): 2 tests, not BUILD-PLAN's 1.
2. **The fs seam reaches the child process through a preload** (`node --import <seam.mjs>`, written by the test
   in its temp folder): it imports the library the script imports and makes the write of one kind's ledger line
   throw. No production code reads the seam's variable.
3. **`replace start`'s death is not driven through the seam**: its first call needs the whole admission world.
   The test starts from the row as such a death leaves it (admitted with a manifest, no admit line). The other
   five paths die through the seam.
4. **`stop request` at stopped also completes the confirmed `stop` line.** F5's table puts stopped/`stop` under
   `stop verify` only, but a request confirmed at once ends at stopped with that line, and its own repeat is a
   request. Test: redo.test.mjs (the request repeat at stopped finds the line).
5. **`stop verify` at stopped now takes the run lock when the confirmed stop line looks missing** (it answered
   without the lock before); with the line present it still answers without it.
6. **Redo data not in the row is null**: `admit` (`reservation`, `live`, `free_mb`), `stop` (`zombie_tokens`,
   0 for a committed row; `grew`, `survivors` empty, as a confirmed stop has them). The `stop-request` session
   is the attempt's, else the folder session, as the first call takes it.
7. **Not covered, as F5's table leaves them:** a `first` fence and a cut or drop with no attempt (no post-state
   with a cut; fsck does not check them either), the `limit` incident line, and the `overflow` line after a
   confirmed cut. A `started` or `stop-request` line missing after the row moved on is not seen by fsck (the row
   keeps no mark of it).
8. **An existing test changed: `replace.test.mjs` T9**, the second of the two concurrent fences now has reason
   `hang`, not `stall`. Two identical fences at once are a repeat at the exact post-state, so the second answers
   0 `repeat` by design; with another reason the CAS test (one wins, one gets 65) stands as meant.
9. **Placement in shared functions** (one line each): `modeFence`'s hold right after the no-task check (before
   FX-OUT's steps, whose stale-epoch refusal would otherwise come first), the repeat branches of `start`,
   `bind`, `stop request`, `stop verify`, the end of `status` `applyReconcile`, the return of fsck's
   `checkUnlogged`, render's `firstIdx` line.
