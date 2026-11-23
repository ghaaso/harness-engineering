# CLOSE result (FX-CLOSE, third helper, 2026-11-20)

- **Branch:** `u/CLOSE` (worktree `MAIN/.claude/worktrees/CLOSE`). **Final commit: `572bb8eb`**, with a clean tree.
  It is 4 commits on build `2a8480af`:
  - `effce0f2`: the code and its tests;
  - `4126cb75`: G5 and redo;
  - `d478c7cc`: the T3 tests;
  - `572bb8eb`: the e2e only.

  `git merge build` at `d478c7cc` changed nothing (build was still at `2a8480af`).
- **Built.** The plan and the record of each step are in `units/CLOSE/checkpoint.md`, checkpoints 1 to 3.
  - `tcb/stop.mjs`:
    - `stop request` also works at `started`, on a committed row whose holder was never bound.
    - `stop verify` confirms only when all three hold: (a) the claim is a tombstone or the claim holder's close is
      recorded; (b) every other folder session's close is recorded; (c) nothing grew over `stop_verify_deltas`
      ticks, and at least `stop_verify_ms` of wall time has passed since the sample.
    - New: `closesMissing`, `verify_rounds` and the `close-missing` reason.
  - `tcb/lib.mjs`: `closeDoneCounts` is exported, and the fence resets.
  - `tcb/guard-hook.mjs`: the anchored close answer (`closeOutcome`).
  - `tcb/watch.mjs`: the watcher's wall floor (`rowAct`).
  - `tcb/schemas/stop-sample.schema.json`: a new field, `at`.
  - Documents: CONTRACT 3.6, `spec/stop.mjs.md`, and section 5c of `tcb/briefs/coordinator.md`.
  - `tcb/thresholds.json` is unchanged: `stop_verify_ms` (120000, a guess) was there already.

## What the landing runs

Each run goes through MAIN's lane, `node MAIN/research-tree/tools/lane.mjs --label <label> ...`. Run from the
worktree's `research-tree/` unless the row says otherwise. Commit `572bb8eb` changes the e2e only, so the earlier
counts still hold.

| File | Label | Commit | Tests | Pass | Fail | Skipped |
|---|---|---|---|---|---|---|
| `tcb/test/stop.test.mjs` + `tcb/test/lib.test.mjs` (one call) | CLOSE-stop-lib | effce0f2 | 253 | 248 | 0 | 5 |
| `tcb/test/redo.test.mjs` | CLOSE-redo | 4126cb75 | 7 | 7 | 0 | 0 |
| `tcb/test/guard-hook.test.mjs`, from a checkout outside `.claude/` (removed after) | CLOSE-guard-hook | 4126cb75 | 30 | 27 | 0 | 3 |
| `tcb/test/status.test.mjs` | CLOSE-status | d478c7cc | 40 | 38 | 0 | 2 (NA1, NA2: need the app) |
| `tcb/test/watch.test.mjs` | CLOSE-watch | d478c7cc | 84 | 80 | 0 | 4 |
| `e2e/run-e2e.mjs` (changed), from a detached checkout outside `.claude/` (removed after) | CLOSE-e2e | 572bb8eb | 239 steps | 239 | 0 | 0 |

**The e2e run.**
- Command: `--timeout-s 135 --wait-s 10`. The checkout was `C:/Users/User/Documents/projects/hx-CLOSEe2e`.
- Outcome: lane exit 0 in 83 s, `# 239/239 steps ok, 0 FAIL`.
- What changed (`departures/CLOSE.md` item 11):
  - after each `stop request`, the e2e stands in for the owner's `closed` act;
  - before each comparing verify, the e2e clock moves by `stop_verify_ms`.
- This applies to the f1-control stop and to `stopCommitted`. The 7 new steps are those owner acts.
- No script changed.
- The e2e was not run before the edit, because the brief asked for one run. From reading `stop.mjs`, the old
  comparing verifies would fail in two ways:
  - inside the wall floor, they answer `waiting` (exit 6);
  - past it, they answer `close-missing` (exit 1).

## The rest

- **Departures:** `departures/CLOSE.md`, 11 items.
  - Item 1 is the main one: the id gap stays open, for S2.2. The hook names a close by the app's `local_<uuid>`,
    but verify looks closes up by the CLI's id. So today every close that verify counts comes from the owner's
    `closed` act.
  - Item 6: the anchored match fails closed on a wrapped error.
  - Item 7: a surviving process still blocks a confirm, which is stricter than the design.
- **Review:** CLOSE has no reviewer of its own; the combined review in B1-4 covers it. The root lands it on this
  result.
- **Tokens:** about 32.8 M for the unit, against its 29.2 M plus the 5.5 M limit set for helper 3.

  | Helper | Label | Tokens | Calls |
  |---|---|---|---|
  | 1 | `CLOSE stop verify build` | 22.42 M | 116 |
  | 2 | `CLOSE stop verify successor` | about 6.7 M | 54 (stopped at its LIMIT) |
  | 3 | `CLOSE stop verify finish` | 3.42 M | 37 |

  Helper 3's count was taken just before this file was written; its last calls add about 0.3 M, for a total of
  about 3.7 M (expected 4 M, limit 5.5 M).

## Not done

- **The id gap (S2.2).** Nothing maps the app's id to the CLI's, so verify never finds a close record written by
  the hook, and every close needs the owner's act.
- **The `error` shape of PostToolUseFailure** is inferred, not measured. It needs the app.
- **The skipped tests did not run:** 14 across the files. Status NA1 and NA2 need the app.
- **`stop_verify_ms` (120000) is a guess.** It has not been measured.
- **What the e2e does not test:**
  - the hook's path for a close;
  - a folder with a second session.

  These are tested in the unit tests only.
- **Where the records live:** this file, `departures/CLOSE.md` and `checkpoint.md` are build records in MAIN, where
  they are untracked. They are not on `u/CLOSE`.
