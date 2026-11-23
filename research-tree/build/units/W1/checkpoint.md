# W1 last helper (FX-W1 final merge): checkpoint at the token limit

Stopped at the root's limit: `build-invariant: W1 final merge and open items before landing | calls 48 | tokens 5.04 M | context now 142.0 K` (expected 3.5 M, limit 5 M). Never written: last.md.

## Done (branch `u/W1`, worktree `MAIN/.claude/worktrees/W1`, clean, head e9f6482b)
1. Merge of `build` f20fca3d: **a9075b50**. Both conflicts resolved as the union. `spec/status.mjs.md` "Reads": W1's `run/arm/` (exit markers and slot files) and OUT's `wt/*/outcome/` with the zombie-write note. `tcb/test/lib.test.mjs`: stubs line `{ readClaim: 1, claimRecord: 1, tombstoneRecord: 2, planAct: 2 }` (OUT's and W1's removals) plus CLAIM's removal loop; W1's "FX-W1 liveness" test and CLAIM's T96z, T96y, T96x all kept. No conflict markers left; `node --check` passes on tcb/*.mjs, tcb/test/*.mjs, e2e/*.mjs.
2. Place 0a of `tcb/briefs/coordinator.md` filled from FX-W1 step 2 and FIX-JOIN 2b row 0 (e9f6482b). Place 4 left for W3.
3. T16 (`tcb/test/guard-hook.test.mjs`): the seam loop now runs over every `prod` entry, not each script's first form (e9f6482b). The M10c mutation is NOT yet shown.
4. `e2e/run-e2e.mjs` (e9f6482b): the raise's result is kept; the nonce is read from its brief line (`--nonce <32 hex>`); the script writes `run/coord-session-2.json` {session_id: COORD2_SID} standing in for the hook's bind step (FIX-fence part 3 step 2); then `handover bind --nonce <X>` without `--session` (which bind refuses, 66), checked by coord.json naming COORD2_SID with `successor_nonce` cleared. NOT yet run.
5. W1last-lib: `tcb/test/lib.test.mjs` at e9f6482b, from the worktree, lane exit 0 (counts below).

## Left, in order
- `git -C MAIN -c core.longpaths=true worktree add --detach C:/Users/User/Documents/projects/hx-W1 u/W1`; from its `research-tree/`:
  - `tcb/test/guard-hook.test.mjs`, label W1last-guard, T 44 W 101 (29.3 s at OUT's landing). If T16 names a spec flag missing from `EXEC_FORMS`, add it in `tcb/guard-hook.mjs` and commit on `u/W1`.
  - M10c: in hx-W1 only, add `'boot'` to replace's fence form (`tcb/guard-hook.mjs` line 674), run `--test-name-pattern "FX-W1 allow list"` (label W1last-M10c, T 30 W 115), expect T16 to fail with `flag not allowed: replace --boot` for `replace.mjs fence`; then `git checkout -- tcb/guard-hook.mjs`.
  - `node e2e/run-e2e.mjs`, label W1last-e2e, T 132 W 13 (88 s at CLAIM's merge; 232 steps).
  - `git -C MAIN worktree remove --force C:/Users/User/Documents/projects/hx-W1`.
- Departures: add to `MAIN/research-tree/build/departures/W1.md` (place 0a wording; the e2e's stand-in for the hook's coord-session file).
- Then `units/W1/last.md` last: merge commit a9075b50, items, counts with labels, e2e steps of 232, tokens.

## Next step
The detached checkout and the W1last-guard run.

## W1last-lib counts (node --test summary)
ℹ tests 199
ℹ suites 0
ℹ pass 197
ℹ fail 0
ℹ cancelled 0
ℹ skipped 2
ℹ duration_ms 35516.0242
