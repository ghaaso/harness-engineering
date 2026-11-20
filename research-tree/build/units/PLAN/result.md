# Result: unit PLAN (FX-PLAN, FIX-fence section 6 with rev 4 P1/P2 and rev 5 points 1-2)

- Branch `u/PLAN` (cut from `build` b6fabfa0; `merge build`: already up to date). Final commit **eb0c6810**.
- Built: `lib.planAct` (the total act table, first match, Q5a acts only), `lib.planFacts` (one fact reader for both
  callers), `slotCount`'s `opts.counted` (the step-7 sessions); status `nextOf` and watch `rowAct`/`rowActPlanned`
  delegate (the transcript-visible branch is gone; the watcher keeps its can-take-now filters); the lease act
  `replace-fence --reason crash --if-unclaimed` with `lib.startLeaseExpired`, `bind` after `claimed-late`;
  `close-session <sid>` (rev 5 point 1); the zombie-over row raises no row act (FX-W5 step 1 now acts);
  `status.schema.json` `next` as a pattern; CONTRACT 3.8, 3.10, class 17, M3 and a "FX-PLAN (round 3)" section;
  spec sections in lib, status, watch; coordinator brief 7a.

## Tests (MAIN's lane, from the worktree's research-tree; e2e from the detached hx-PLAN checkout, since removed)

| File | Lane label | Commit | Tests | Pass | Fail | Not run |
|---|---|---|---|---|---|---|
| tcb/test/lib.test.mjs | PLAN-lib | eb0c6810 | 204 | 201 | 0 | 2 skipped, 1 todo (below) |
| tcb/test/status.test.mjs | PLAN-status | 188955ca | 37 | 35 | 0 | 2 skipped |
| tcb/test/watch.test.mjs | PLAN-watch | 188955ca content | 78 | 74 | 0 | 4 skipped (needs-app) |
| e2e/run-e2e.mjs | PLAN-e2e | eb0c6810 | 232 steps | 232 | 0 | - |

New tests (5): lib FX-PLAN T1 (the total table: one act per state x step x claim x start x lease; each script act
accepted by its script's dry run), T2 (torn fence retry or owner; verify_rounds ends), T3 (close-session, owner when
its close does not count, none once it counts, never for a waiting attempt); watch "FX-PLAN act due" (start-session,
quiet while the lease runs, the lease act, bind after the claim) and "FX-PLAN: a zombie-over row raises no row act".
The todo: committed at started -> `stop-request` is refused by stop.mjs (wrong-step 65) until FX-CLOSE step 3.
Updated: status T3 (three rows), watch M3 admitted test replaced, lib.test `stubs` line (planAct out).
guard-hook, replace and stop files were not changed and not run (no new flag in any "## Command line").

## Departures
`research-tree/build/departures/PLAN.md` (10 items).

## Tokens
build-invariant: PLAN act table build | calls 109 | tokens 21.16 M | context now 299.2 K

## Not done
- FX-CLOSE (B1-3): stop.mjs must accept committed at started (then lib T1's todo passes: drop the `todo`), and
  reset `verify_rounds` at the fence as the model does, or step 0 asks the owner at once on a later stop.
- close-session: the coordinator's close tool takes the app id; the hook names close records by it (CGATE
  departure 1), so until a CLI-to-app id map exists a close-session is ended only by the owner's `closed`.
- T1 checks the script acceptance of bind, stop-request, the first fence and the lease act; replace-start and
  stop-verify are unchanged acts, checked as before by status T3 and the replace and stop tests.
- The full suite is the root's.
