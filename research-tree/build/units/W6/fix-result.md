# Result: the FX-W6 fix round (task r57-0507, slice 2, S2.4; builder `build-invariant: W6 age cap fix round`)

**Branch** `u/W6` (worktree `.claude/worktrees/W6`). **Final commit** cfdd10c4, on `build` d655547f. Merging `build`
was a no-op: `build` is still d655547f, already an ancestor.

Commits:
- 27e3a5e1 tests first, on the old code;
- 1c5a6633 the deletion;
- 2323e351 the brief line, spec and CONTRACT;
- 4748c275 the model;
- cfdd10c4 RUN-BUILD and MAP-build.

**Files changed** (10; 184 insertions, 62 deletions):
- `tcb/watch.mjs`: the re-arm block is deleted (build's 1198-1204), the comment is corrected, and the call is now
  `{ rows, tick }`. `age_base` is kept in `freshTaskState` at 0.
- `tcb/test/watch.test.mjs`: "FX-W6 age cap" now pins the fixed behaviour; "FX-W6 age cap stuck" is new.
- `tcb/briefs/coordinator.md`: new place 7b for `idle-child` and `age-cap`.
- `spec/watch.mjs.md`: step 3, step j, W6c, and a new W6d.
- `CONTRACT.md` 3.10: `age_base`.
- `model/as-built/`:
  - `model-build.mjs`: line 1015, `BLD_AGE_CAP` as fixed, the ablation `AB_AGE_REARM`; `BLD_AGE_STUCK` is gone.
  - `configs-build.mjs`: AGE-B, AGE-STUCK, and the new AGE-REARM.
  - `model-build.test.mjs`, `RUN-BUILD.md` (section 9), `MAP-build.md`.

**Tests**, each through MAIN's lane from the worktree's `research-tree/` folder:

| Label | File | Commit | Tests | Pass | Fail | Skipped | Time |
|---|---|---|---|---|---|---|---|
| `W6-fix-oldcode` | `tcb/test/watch.test.mjs`, `--test-name-pattern "FX-W6 age cap"` | 27e3a5e1 (old code) | 2 | 0 | **2, intended** | 0 | 1 s |
| `W6-fix-watch` | `tcb/test/watch.test.mjs` | 1c5a6633 | 86 | 82 | 0 | 4 (NA1-NA4) | 86 s |
| `W6-fix-status-handover` | `tcb/test/status.test.mjs` + `tcb/test/handover.test.mjs` | 2323e351 | 72 | 67 | 0 | 5 | 65 s |
| `W6-fix-model` | `model/as-built/model-build.test.mjs` | 4748c275 | 37 | 37 | 0 | 0 | 31 s |
| `W6-fix-guard-hook` | `tcb/test/guard-hook.test.mjs`, from detached checkout `hx-W6` at cfdd10c4 (removed) | cfdd10c4 | 31 | 28 | 0 | 3 | 24 s |

Later commits change no file these tests read.

**The failing run on the old code** (`W6-fix-oldcode`, 27e3a5e1):
- "FX-W6 age cap" fails at watch.test.mjs:1733, `the acknowledgement does not re-arm the cap`: 3 !== 0. The old code
  set age_base to 3.
- "FX-W6 age cap stuck" fails at watch.test.mjs:1761, `assertLine` expected exit 17, got 0, at tick 18. The first
  re-raise never came, because the cap had been re-armed.

Both pass after the deletion.

**For the landing:**
- the five test files: `tcb/test/watch.test.mjs`, `tcb/test/status.test.mjs`, `tcb/test/handover.test.mjs`,
  `tcb/test/guard-hook.test.mjs` (outside `.claude/`) and `model/as-built/model-build.test.mjs`;
- guard-hook took 24 s of its 25 s timeout here, so allow it more.

**Model, small runs** (lane `W6-fix-model-small`, 4748c275's model):

| Configuration | Size | States | Result |
|---|---|---|---|
| AGE-B | k=1,m=1 | 65,582 | every property holds |
| AGE-STUCK | k=1,m=1 | 65,582 | the same as AGE-B |
| AGE-REARM | k=1,m=1 | 23,819 | AgeCapReachesOwner F 16, EventuallyResolves F 16, AlwaysCanResolve F 3 |
| FN-N2-B | k=1,u=1 | 619,856 (5.5 s) | EventuallyResolves F 9, as S2.4 VERDICT section 6 |

model-build.test.mjs pins all four, and checks that BLD_AGE_CAP and AB_AGE_REARM each change the states.

**RUN-BUILD rows added** (section 9): seven background lane commands with `--timeout-s 1450`, outputs under
`model/results-build/fx-w6/`:

| Configuration | Size | M | Expected states | Expected result |
|---|---|---|---|---|
| AGE-B | whole | 800 | 476,122 | ACRO holds, EventuallyResolves F 5 (the u artefact) |
| AGE-B | k=2,m=1,o=1 | 600 | 162,074 | all hold |
| AGE-STUCK | the same two sizes | | the same states as AGE-B | as AGE-B |
| AGE-REARM | whole | 800 | 434,359 | ACRO F 16 |
| AGE-REARM | k=2,m=1,o=1 | 600 | 62,123 | ACRO F 16 |
| FN-N2-B | k=1,u=1 | 800 | 619,856 | EventuallyResolves F 9 |

(ACRO is AgeCapReachesOwner.) FN-N2-B reads no flag the round changed besides line 1015, so R3
(`results-build/rerun/FN-N2-B-V-parts.json`) stands as its k=2 result.

**Departures:** `research-tree/build/departures/W6-fix.md`, 7 items. The main ones:
- "stop it" is the fence (5a) and then the close (5c), because `stop request` refuses an attempt that is neither
  fenced nor committed;
- place 7b moves places 8 and 9 down 14 lines (place 9 is now coordinator.md:177-180), and line 1015's label cites
  that.

**Tokens:** `build-invariant: W6 age cap fix round | calls 83 | tokens 13.64 M | context now 253.0 K`.

**Not done:**
- the e2e and the full suite (the root's suite 6, as the brief says);
- an explicit "continue" act that re-arms the cap (refute/W4.md:113-115; not built in this round);
- the model of a coordinator that stops an age-capped attempt (place 7b);
- a test that follows an age cap to the dead-man's toast; the test stops at `watcher.json.stuck`;
- no fence reason for stopping is named in the brief line (the design names none).
