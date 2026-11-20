# W3 merge with build (CLOSE landed), 2026-11-20

- **Commit:** `u/W3m` **6b0b0af7** "W3: merge build (CLOSE landed): union in lib.test.mjs". Its parents are `u/W3`
  cf7211ec and `build` 91b46c34. The worktree is `MAIN/.claude/worktrees/W3m` and its tree is clean. The unit tests
  below ran on exactly this tree, staged before the commit.

## The conflict and how it was resolved

- **The conflict:** one, in `research-tree/tcb/test/lib.test.mjs`, at the end of the file. Both units appended a
  test there, and the two tests shared the file's last `});` line.
- **The resolution, a union with each side kept whole:**
  1. W3's "FX-W3 armedState ..." test, with its own `});` added back;
  2. a blank line;
  3. CLOSE's "FX-CLOSE T2 ..." test, followed by the original closing line.
- **The checks:**
  - Against `build`, the file has 62 insertions and 0 deletions, which are W3's lines.
  - Against `u/W3`, it has CLOSE's 57 insertions, plus the 3 lines CLOSE changed earlier in the file, which
    auto-merged: the FX-PLAN T1 todo becomes a real test.
  - `node --check` passes.
  - `git merge-file --union` would have kept the shared `});` only once. That would leave W3's test unclosed, which
    is why the resolution was done by hand.
- **Auto-merged:** CONTRACT.md, `e2e/run-e2e.mjs`, `tcb/briefs/coordinator.md`, guard-hook, lib, watch, and the
  guard-hook, status and watch tests. Each unit's hunks in these files are in separate places.

## The regions checked: no semantic clash between W3 and CLOSE

- **lib, `withRunLock` and `requireArmed`.** The order is the ce check, then armedCheck, then fn.
  - A `fence first` that is not armed is refused before `lib.fence`, so nothing is written, the
    `verify_rounds` reset included.
  - A planned row has no `verify_rounds`.
  - Every other fence reason is not gated, and still resets `verify_rounds` as CLOSE intends.
  - `closeDoneCounts` is exported. Nothing in W3 touches it.
- **replace, `armedFor`.** It gates `start` and fence `first` only. CLOSE's `stop request` at `started`, and its
  stop verify, run in `stop.mjs`. Its `underLock` passes no `requireArmed`, so revocations stay ungated.
- **The hook.**
  - W3's `stepArmed` runs in PreToolUse, and returns at once unless the tool is the start tool.
  - CLOSE's anchored `closeOutcome` runs in PostToolUse, for the stop tools only.
  - W3's PreToolUse cases ("stop_session unarmed" and "archive_session unarmed") and CLOSE's G5 cases 21 to 24 do
    not overlap.
- **status, endturn.**
  - CLOSE did not change `status.mjs`.
  - CLOSE's new status test calls no endturn.
  - endturn and `armedState` read no clock, so the e2e's `stop_verify_ms` clock moves do not affect them.
- **watch.**
  - W3's slot record `turn_seq_at_reg` and unarmed record are on the alarm path.
  - CLOSE's wall floor is in `rowAct` and `evaluate`: `svm`, and `plan.nowMs`, defined at `watch.mjs:474` and `:694`.
  - No state is shared between the two.
- **e2e.**
  - W3's `armTurn` runs before each `beginAttempt`. This includes f1-control e2, which starts after CLOSE's stop.
  - CLOSE's `closeAttempt` runs `status owner --act closed`, which is not an act that creates work, so it is not
    gated.
  - CLOSE's clock moves leave the arm alone.
- **Documents.** The merged brief reads as one text: 5c (CLOSE), then 5d, then section 6 (W3). In CONTRACT, the
  two units' hunks are in different sections.

## Tests

All runs went through MAIN's lane.

- The first three labels ran in parallel, from `W3m/research-tree`.
- `W3m-guard` and `W3m-e2e` ran from the detached checkout `C:/Users/User/Documents/projects/hx-W3m` at 6b0b0af7.
  That checkout was removed after (`--force`, because the e2e rewrites its tracked `e2e/last-result.json` and
  `last-run.log`).
- The counts per file are Node's own per-file `test:summary`, taken with a scratch reporter beside `spec`.
  Subtests are counted, as in the units' own counts.

| File | Label | Tests | Pass | Fail | Skipped | Todo |
|---|---|---|---|---|---|---|
| `tcb/test/watch.test.mjs` | W3m-watch (92 s, exit 0) | 85 | 81 | 0 | 4 | 0 |
| `tcb/test/status.test.mjs` | W3m-status-lib (57 s, exit 0) | 41 | 39 | 0 | 2 | 0 |
| `tcb/test/lib.test.mjs` | W3m-status-lib | 206 | 204 | 0 | 2 | 0 |
| `tcb/test/replace.test.mjs` | W3m-rhs (42 s, exit 1, from redo) | 94 | 92 | 0 | 2 | 0 |
| `tcb/test/handover.test.mjs` | W3m-rhs | 23 | 20 | 0 | 3 | 0 |
| `tcb/test/stop.test.mjs` | W3m-rhs | 48 | 45 | 0 | 3 | 0 |
| `tcb/test/redo.test.mjs` (added, see the finding) | W3m-rhs | 7 | 5 | **2** | 0 | 0 |
| `tcb/test/guard-hook.test.mjs` | W3m-guard (24 s, exit 0) | 31 | 28 | 0 | 3 | 0 |

**Each count is the sum of both units' tests.** Each row is one unit's last run plus the other unit's additions:

| File | One unit's last run | The other's additions | Merged |
|---|---|---|---|
| watch | 84 (CLOSE) | 1 (W3) | 85 |
| status | 40 (CLOSE) | 1 (W3) | 41 |
| lib | 205 (CLOSE) | 1 (W3) | 206 |
| stop | 43 (W3) | 5 (CLOSE) | 48 |
| guard-hook | 30 (CLOSE) | 1 (W3) | 31 |

- **e2e** (W3m-e2e, `--timeout-s 135 --wait-s 10`, 83 s, exit 0): `# 239/239 steps ok, 0 FAIL`.
  - CLOSE's 7 `status owner --act closed` steps are there.
  - W3's 6 `replace fence first` steps and every start pass, armed by `armTurn`.

## Finding

The finding is W3 against REDO; it is not a clash with CLOSE. Nothing was changed for it.

- **What fails:** `redo.test.mjs`, the case "replace start at admitted with a manifest: the admit line" (line 195).
  It gets `[6, undefined, undefined]` where it expects `[0, true, true]`. Its parent test fails with it, which makes
  the 2 failures.
- **The cause:** W3's `armedFor('start')` gates the whole start hold. That hold includes FX-REDO's repeat path,
  `startRedo` (`replace.mjs` near line 949), and the redo root has no armed `run/turn.json`.
- **Not from this merge:** REDO was already on the base 2a8480af. The W3 reviewer's lane runs show the same
  failure on `u/W3`: `W3r-redo` exits 1, and `W3r-redo-base` exits 0.
- **Not decided here:** whether a repeat of a start, which only completes a missing admit line, needs the arm. That
  is for W3's review and its fix, not this merge. The arm on the redo root or the gate's place would change.
- **Why redo was run:** it is not in the brief's list, but it was added to the third call because CLOSE edited it
  and W3's gate reaches it.

## Tokens

- The counter read `build-invariant: W3 merge with CLOSE | calls 41 | tokens 4.33 M | context now 150.1 K` before
  this file was written. The total is about 4.6 M at hand-back.
- The expected figure was 3 M and the limit 5 M.
