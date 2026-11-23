# W1 (FX-W1) result: tri-state liveness, exit markers, the coordinator's exec allow list

- **Branch** `u/W1` (worktree `MAIN/.claude/worktrees/W1`, clean). **Final commit 2aff1708.** Commits: b1e11391
  (lib `liveness`, `exitMarkers`), 7172d34f (watch exit markers; status tri-state, prune, D1; tests), a78deee2
  (guard-hook allow list, U3-F8 (a), its test), 8997471d (merge of `build` at 8269b551, W6: no conflict; the
  shared stubs line in lib.test.mjs keeps W1's removal of `liveness: 3`), 2aff1708 (`run/arm/` in the run root's
  `.gitignore`; CONTRACT §1.2, §2, §3.9 [arm-exited], the 67 row, decision 41 R6-b; specs lib, watch, status,
  guard-hook, handover).

## Tests (every lane run of the unit; helper 1 ran none through the lane)
| Lane label | File | Commit | Tests | Pass | Fail | Skipped |
|---|---|---|---|---|---|---|
| W1-lib (helper 2) | tcb/test/lib.test.mjs | 7172d34f | 195 | 193 | 0 | 2 |
| W1-watch (helper 2) | tcb/test/watch.test.mjs, `--test-name-pattern "FX-W1\|T20"` | 7172d34f | 4 | 4 | 0 | 0 |
| W1-status (helper 2) | tcb/test/status.test.mjs | 7172d34f | 36 | 34 | 0 | 2 |
| W1-hook-subset (helper 2) | guard-hook.test.mjs, pattern FX-W1, T5, T6 (in the worktree) | before a78deee2 | 3 | 2 | 1 | 0 (fixed in a78deee2) |
| W1-guard-hook (helper 2) | tcb/test/guard-hook.test.mjs from `hx-W1` | a78deee2 | 21 | 18 | 0 | 3 |
| W1-lib (helper 3) | tcb/test/lib.test.mjs | 8997471d (after the merge) | 195 | 193 | 0 | 2 |
| W1-watch (helper 3) | tcb/test/watch.test.mjs, whole file (65.9 s of T 76) | 8997471d | 73 | 69 | 0 | 4 |
| W1-handover (helper 3) | tcb/test/handover.test.mjs | 2aff1708's content | 22 | 19 | 0 | 3 |
| W1-guard-hook (helper 3) | tcb/test/guard-hook.test.mjs from `hx-W1` (removed after) | 2aff1708 | 21 | 18 | 0 | 3 |
| W1-status (helper 3) | tcb/test/status.test.mjs | 2aff1708 | 36 | 34 | 0 | 2 |

New tests (BUILD-PLAN counts 3; built 7): lib "FX-W1 liveness"; watch "FX-W1 alarm" (exit markers on 30, 0, 64,
67); status 4 "FX-W1" tests (endturn tri-state, `state-corrupt`, reconcile D1, the prune); guard-hook "FX-W1
allow list" (spec T16). The full suite was not run (the root's).

## Departures
`MAIN/research-tree/build/departures/W1.md`: 11 entries (the checkpoint's 8, plus the 67 row of CONTRACT §1.4,
R6-b placed under decision 41, and the non-strict create of the exit marker).

## Tokens (the counter's lines)
- Helper 1: 15.05 M. Helper 2: `build-invariant: W1 successor from checkpoint | calls 91 | tokens 13.49 M`, plus
  about 0.5 M for checkpoint 2.
- Helper 3: `build-invariant: W1 third helper finishes the left list | calls 75 | tokens 8.97 M | context now
  182.9 K`, plus about 0.2 M for this file.
- **Unit: about 38.2 M** (limit 29.2 M for helpers 1-2; the third helper's 10 M came from the pooled reserve).

## Not done
- Step 6 (the L2 beat, `lease_ms`, `beat_ms`): not built, by branch L1.
- R55 in the protocol (U3-F8 (a)): not changed; no slice-1 unit writes the protocol.
- `unarmed-*` records of an older ce are kept by the prune (departure 7); FX-W4 owns them.
- Landing note: guard-hook T16 reads every script spec's "## Command line"; a unit that lands a new `--flag`
  there must add it to `EXEC_FORMS` in `tcb/guard-hook.mjs`, or T16 fails at that landing.
- The whole watch file took 65.9 s against T 76: a later run should use T about 99.
