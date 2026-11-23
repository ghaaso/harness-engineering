# W1 (FX-W1) last records: the final merge, the open items, the G1 fix after the undone landing

- **Branch** `u/W1` (worktree `MAIN/.claude/worktrees/W1`, clean). **Final commit 9089fa97.** After `result.md`'s
  2aff1708: **a9075b50** (merge of `build` at f20fca3d: W6, REDO, W5, W7, CGATE, CLAIM, OUT), e9f6482b (the open
  items), 9089fa97 (G1, after the root undid W1's landing of e9f6482b).

## Each item's change
1. **Merge a9075b50.** Both conflicts resolved as the union. `spec/status.mjs.md` "Reads": W1's `run/arm/` (exit
   markers and slot files) and OUT's `wt/*/outcome/` with the zombie-write note. `tcb/test/lib.test.mjs`: the
   stubs line `{ readClaim: 1, claimRecord: 1, tombstoneRecord: 2, planAct: 2 }` (OUT's and W1's removals) plus
   CLAIM's removal loop; W1's "FX-W1 liveness" and CLAIM's T96z, T96y, T96x all kept. No conflict markers left;
   `node --check` passed on tcb/*.mjs, tcb/test/*.mjs, e2e/*.mjs.
2. **Place 0a of `tcb/briefs/coordinator.md`** (e9f6482b), from FX-W1 step 2 and FIX-JOIN 2b row 0: the marker
   before 30, 0 superseded, 64 or an error exit; dead from then on, never unknown; `run/arm/` is not the
   coordinator's; a hard kill leaves no marker and unknown starts nothing. Place 4 left to W3. Departure 12.
3. **T16** (`tcb/test/guard-hook.test.mjs`, e9f6482b): the seam loop runs over every `prod` entry, not each
   script's first form (refute W1 M10c). Shown below.
4. **`e2e/run-e2e.mjs`** (e9f6482b): the raise's result is kept, the nonce read from its brief line; the script
   writes `run/coord-session-2.json` {session_id: COORD2_SID} for the hook's bind step, then `handover bind
   --nonce <X>` without `--session`, checked by coord.json naming COORD2_SID with `successor_nonce` cleared.
   Departure 13. Not run by W1 (the root runs the e2e).
5. **G1 (9089fa97).** The root's landing of e9f6482b failed CGATE's G1 in 2 cases (log
   `build/landings/20261119T210418Z-W1-36356/1-tcb_test_guard-hook.test.mjs.log`): "an extra flag" (`--now`) and
   "status.mjs with the bind flags" expected `stale-coordinator`, got `bash-pattern`. The designed order puts
   FX-W1's allow list first: FIX-JOIN 2b row 1 "Bash grammar and allow-list ..., bind recognition (FX-CGATE
   step 2)", row 2 "grammar, allow-list, current session (FX-CGATE step 3)"; the spec's round-3 skeleton (step
   6 `checkAccess` with `stepAllowList` in its exec branch, then step 7 `coordinatorSteps`: `stepBind`,
   `stepCurrentSession`); FIX-fence part 3 step 2 runs "after the profile and Bash grammar checks". The code
   already runs so (`tcb/guard-hook.mjs` 470 `checkAccess`, 591 `stepAllowList`, 476 `coordinatorSteps`).
   **So G1's two expected reasons are now `bash-pattern`; no code changed, no departure.** One case added so
   `stepBind`'s exact-pairs rule stays tested behind the allow list: an extra flag the bind form admits
   (`--dry-run`) passes the allow list, does not qualify, and is `stale-coordinator`; nothing binds (the file
   check is unchanged).

## Tests (lane runs after `result.md`)
| Lane label | File | Commit | Tests | Pass | Fail | Skipped |
|---|---|---|---|---|---|---|
| W1last-lib (last helper) | tcb/test/lib.test.mjs, from the worktree | e9f6482b | 199 | **197** | 0 | 2 |
| W1last-M10c (this helper) | guard-hook.test.mjs, TAP, from `hx-W1` with M10c (not committed) | e9f6482b + M10c | 30 | 25 | 2 | 3 |
| W1rec-guard (this helper) | guard-hook.test.mjs, TAP, from `hx-W1` (removed after) | 9089fa97 | 30 | **27** | **0** | 3 |

**M10c: caught.** With `'boot'` added to replace's fence form in `EXEC_FORMS`, T16 ("FX-W1 allow list") fails
with exactly two entries: `node tcb/replace.mjs fence --root C:/r --ce 1 --task f1-plan --epoch 1 --reason crash
--if-unclaimed --dry-run --boot 5` and the same with `--boot=2026-11-20T00:00:00.000Z` are allowed where
`bash-pattern` is expected. Under the old loop (each script's first form, replace: `plan`) M10c survived. The
run's other failure, G1, is the same 2 cases the landing showed on unmutated e9f6482b; replace's forms play no
part in them. TAP logs: `units/W1/W1last-M10c.tap`, `units/W1/W1rec-guard.tap`. The 3 skips are needs-app 1-3.

## Departures
`MAIN/research-tree/build/departures/W1.md`: 13 entries (12: place 0a's wording; 13: the e2e's stand-in for the
hook's coord-session file); header now names 9089fa97.

## Tokens (the counter's lines)
- Last helper: `build-invariant: W1 final merge and open items before landing | calls 48 | tokens 5.04 M |
  context now 142.0 K` (limit 5 M).
- This helper: `build-invariant: W1 records after the last helper's limit | calls 34 | tokens 3.31 M | context
  now 127.4 K`, plus about 0.15 M for this file (limit 5 M, raised from 2 M with the G1 task).
- **Unit: about 46.7 M** (38.2 M to `result.md`, 5.04 M, about 3.5 M).

## Not done
- The e2e (232 steps) and the full suite: the root's. Item 4's e2e change is untested by W1's own runs.
- lib.test.mjs was not re-run at 9089fa97 (only guard-hook.test.mjs changed).
