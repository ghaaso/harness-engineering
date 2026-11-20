# W3 fix round: REDO's test root armed; revocation never gated, every reason (2026-11-20)

- **Commit:** `u/W3m` **054e9ec0** (054e9ec092333ce3c25478a7117995716dd5ffee) "W3: arm REDO's test root; revocation
  never gated, every reason". Its parent is the merge 6b0b0af7. Worktree `MAIN/.claude/worktrees/W3m`, clean after it.
  Two test files only (21 insertions, 7 deletions); no script changed. `u/W3` and its worktree were not touched.

## What changed

1. `research-tree/tcb/test/redo.test.mjs` (the finding of `build/refute/W3.md`):
   - `makeRoot(rows, dirs, { armed = false })`. With `armed: true` it writes `run/turn.json` =
     `{ce: 1, turn_seq: 1, read_seq: 0, arm: 'confirmed', slots: [{k: 1, pid: 4242, start_time}], unarmed_turns: 0}`,
     the record replace.test.mjs's `mk()` writes (`armedTurn(1)`).
   - Only the root of "replace start at admitted with a manifest" is armed: a start creates work, so its hold needs
     the arm. The other five roots stay unarmed: fence, stop, bind and reconcile are not gated, and
     `status --reconcile` rewrites turn.json itself, so an arm there would change what those subtests test.
2. `research-tree/tcb/test/replace.test.mjs`, test "FX-W3 revocation never gated" (survivor R3, row 11 of the refute):
   - It loops over `lib.REASONS` without `first`: stall, hang, loop, crash, tainted, memory, handover, cut, drop
     (it was hang, crash, handover). An assertion pins that list to the nine the title names, so a reason added to
     the library fails the test until it has its case.
   - Setup per reason: `drop` gets the owner's drop line (as T10); the failure reasons (`lib.FAILURE_REASONS`) get
     `--tick 3` (as T11); the others no tick.
   - Each case, on a root with no turn.json: fence exit 0; the row at epoch 2, step fenced, reason the case's; then
     stop request exit 0, no `not-armed`, step stop-requested; still no turn.json.

## Tests

MAIN's lane, from `W3m/research-tree`, on the edits as committed (run before the commit; nothing changed after).
Counts are Node's per-file `test:summary` from a scratch reporter beside `spec`, subtests counted.

| File | Label | Tests | Pass | Fail | Skipped | Before (W3m-rhs, 6b0b0af7) |
|---|---|---|---|---|---|---|
| `tcb/test/redo.test.mjs` | W3fix-redo-replace (35 s, exit 0) | 7 | 7 | 0 | 0 | 7: 5 pass, 2 fail |
| `tcb/test/replace.test.mjs` | W3fix-redo-replace | 100 | 98 | 0 | 2 | 94: 92 pass, 2 skipped |

- replace's six new tests are the six new reasons' cases; each passes.
- Not re-run: the merge's other test files, the selftest and the e2e. The commit changes only these two test files.

## The scratch mutation

- **Copy:** the worktree's `tcb`, with the two test edits, copied to `SCRATCH/W3-fix/copy/research-tree/tcb`.
- **Mutation:** in the copy's `replace.mjs` (line 497, `armedFor`), `reason === 'first'` became
  `(reason === 'first' || reason === 'memory')`, so a fence `memory` waits for the arm.
- **Run:** lane `W3fix-mut-memory` (2 s, exit 1), from the copy:
  `node --test --test-name-pattern="FX-W3 revocation never gated" tcb/test/replace.test.mjs`.
- **Result: killed.** 10 tests, 8 pass, 2 fail. The case `memory` fails with "expected exit 0, got 6: not-armed
  {ce: 1, why: no-turn}", and its parent fails with it; the other eight cases pass.
- **Restored:** the copy's `replace.mjs` copied back from the worktree; both sha256 18dbb0c1e2f1138e... The
  worktree's `replace.mjs` was never changed (its git diff is empty).
- The hook was not mutated: guard-hook's `stepArmed` gates only the start tool, so no fence reason passes through it.

SCRATCH = `C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/8a7db643-dc9c-42d9-8dea-e9f99c2d3b69/scratchpad`.
Logs and the reporter: `SCRATCH/W3-fix/logs/` (`W3fix-redo-replace.log`, `W3fix-mut-memory.log`, each with its
`.summary.jsonl`) and `SCRATCH/W3-fix/summary.mjs`.

## Tokens

- `tokens-self.mjs "W3 redo fixture fix"` before this file was written: calls 32 | tokens 3.60 M | context now 144.0 K. Expected 2.5 M, limit 4 M: over the expectation, under the limit. Most of it is the context re-read on each call.
