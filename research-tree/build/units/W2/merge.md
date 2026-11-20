# W2 merge with build (PLAN landed), 2026-11-20

- **Branch `u/W2m`** (worktree `MAIN/.claude/worktrees/W2m`), cut from `u/W2` 308abe83; `merge build` d64d1d71.
- **Commits:** 2dfb84fb `W2: merge build (PLAN landed): unions in CONTRACT.md and spec/watch.mjs.md` (parents
  308abe83, d64d1d71); then debb0009, the two tests the root asked for after the review (a separate commit, so
  the merge holds only the merge). **Tip debb0009**, clean tree: the root fast-forwards `u/W2` to it.

## Conflicts (union, each side whole)

1. `research-tree/CONTRACT.md`, end of file (decision 41): both appended after the FX-W1 paragraph. W2: the
   FX-W2 paragraph of item 41 (7 lines); PLAN: the section `### FX-PLAN (round 3): the planner's acts, first
   match` (blank line + 13 lines). Kept W2's paragraph first (it continues item 41), then PLAN's section.
2. `research-tree/spec/watch.mjs.md`, end of file: W2 rewrote the base's two "FX-W1 built" lines into five
   (FX-W2 built; `reg.registered` set at the slot write, W2 departure 3); PLAN kept those two lines as in the
   base (byte-identical to b6fabfa0) and appended `## FX-PLAN (round 3): the planner`. Kept W2's five lines and
   PLAN's section; the base's two lines, which W2 replaced, are not kept beside them.
- Check: for each file, resolved vs `u/W2` differs by exactly PLAN's change vs base, and resolved vs `build` by
  exactly W2's change vs base (sorted +/- lines equal). No markers left.

## Code regions checked (auto-merged)

- `tcb/status.mjs`: PLAN's `computeStatus` (slotCount `counted`, `planContext`, `next` through `nextOf`) and
  `nextOf`/`planContext` (base 582-609), next to W2's `runBuild` (base 619-650: `armNonces`, `readArmSlots` and
  `judgeArmSlots` before the hold, `turnHold1` in the main hold after `computeStatus`, `reconcileHold2` in place
  of `armAtStart`). Both stand: the arm reads only `pre.procList`, the slot records and the exit markers; the
  planner reads attempt folders and writes nothing; no shared name (W2's `slotCountOf` counts arm slots,
  `alarm_slots`; lib's `slotCount` counts session slots).
- `tcb/watch.mjs`: PLAN's `rowAct`/`rowActPlanned` and `evaluate` sections c and j (`zombieRows`, `sessions7`, the
  `plan` facts; `nowMs` in scope); W2's FLAGS (`ensure`, `nonce`, `NONCE_RE`), `runAlarm` (ensure, hold 1), the
  ensure functions, `main`'s refusal of a bare `--alarm`. Neither region calls into the other.
- `tcb/lib.mjs` (PLAN only): `folderSessionSlots` gains a fifth parameter (default null), `slotCount`
  `opts.counted`; W2's code calls neither.
- Also read: CONTRACT 3.8, 3.9, 3.10 and decision 40 (M2, M3), spec/status.mjs.md, spec/lib.md, coordinator
  brief places 0a, 2, 3 (W2) and 7a (PLAN): they read together. `node --check` passes; no duplicate top-level names.

## Tests (MAIN's lane, from the worktree's research-tree)

| File | Label | Content | Tests | Pass | Fail | Skipped | Todo | s |
|---|---|---|---|---|---|---|---|---|
| tcb/test/lib.test.mjs | W2m-lib | 2dfb84fb (same at debb0009) | 204 | 201 | 0 | 2 | 1 | 38 |
| tcb/test/status.test.mjs | W2m-status | 2dfb84fb | 38 | 36 | 0 | 2 | 0 | 42 |
| tcb/test/watch.test.mjs | W2m-watch | 2dfb84fb | 81 | 77 | 0 | 4 | 0 | 74 |
| tcb/test/status.test.mjs | W2m-status2 | debb0009 | 39 | 37 | 0 | 2 | 0 | 41 |
| tcb/test/watch.test.mjs | W2m-watch2 | debb0009 | 82 | 78 | 0 | 4 | 0 | 81 |
| tcb/test/guard-hook.test.mjs | W2m-gh | debb0009, hx-W2m outside `.claude/` | 30 | 27 | 0 | 3 | 0 | 23 |
| e2e/run-e2e.mjs | W2m-e2e | debb0009, hx-W2m | 232 steps | 232 | 0 | - | - | - |

- The counts add up: lib = PLAN's (the todo is FX-CLOSE's); status 38 = W2's (PLAN changed T3 in place); watch
  81 = base 77 + PLAN 1 + W2 3. **End-to-end: 232/232 steps ok, 0 FAIL.**
- hx-W2m removed with `--force`: its only changes were `e2e/last-result.json` and `e2e/last-run.log`, which the run writes.

## Two tests added (root's message after the review passed), commit debb0009

1. `tcb/test/watch.test.mjs`, last test: "FX-W2 the coordinator's order: an ensure that registers after
   reconcile r1 has read the slot confirms the arm in that reconcile". The reviewer's scratch test
   (`scratchpad/W2-refute/refute-tests.txt`), REFUTE prefix dropped, comment rewritten, body unchanged; it
   uses watch.test.mjs's helpers (`slotFile`, `nonceFile`, `alarmArgs`, `newNonce`). Passes, 7.1 s (W2m-watch2).
2. `tcb/test/status.test.mjs`, after "FX-W2 reconcile confirms the arm only by a live slot": "FX-W2 --arm-nonces
   refuses a value holding .. or a path separator: exit 66 usage before any write, also when one value of the
   list is bad". 13 values: `..`, `../x`, `a/b`, the backslash forms, a leading `/`, `../../<hex32>`,
   32-character values ending in `..`, `/` or a backslash, and two lists whose second value is bad. Each: exit 66,
   reason `usage` {flag `arm-nonces`, expect naming hex}; status.json, turn.json and `run/arm/` unchanged. At the
   end no `x.json` or `<hex>.json` at the root or in `run/`; the ledger unchanged. Passes, 0.7 s (W2m-status2).
   Not run against the mutation (refute row 17, check deleted): the call passes `--reconcile`, so nothing else
   exits 66 and the first value fails the exit assertion.

## Findings

- None: no semantic clash between W2's arm steps and PLAN's planner.

## Tokens
- build-invariant: W2 merge with PLAN | calls 55 | tokens 6.48 M | context now 161.9 K
