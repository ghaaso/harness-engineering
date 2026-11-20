# W2 result: FX-W2, arm first, confirmed by an alarm that has not exited (2026-11-20)

- **Branch** `u/W2` (worktree `MAIN/.claude/worktrees/W2`), base `build` b6fabfa0. **Final commit 308abe83**, clean
  tree. Commits: 1ac4ce94 (code), d81b5951 (tests, hook alarm form, fixtures), d5690df3 (specs, CONTRACT),
  dac3c7fb (coordinator brief places 0a, 2, 3; spec/briefs FX-W2 line), 308abe83 (e2e).
- **Merge of `build`:** `git -c core.longpaths=true merge build` -> "Already up to date": the build tip is still
  b6fabfa0 (PLAN has not landed), so no rerun was due.

## Tests (through MAIN's lane)

| File | Label | Commit | Tests | Pass | Fail | Skipped |
|---|---|---|---|---|---|---|
| tcb/test/watch.test.mjs | W2-ws3 | dac3c7fb | 80 | 76 | 0 | 4 |
| tcb/test/status.test.mjs | W2-ws3 | dac3c7fb | 38 | 36 | 0 | 2 |
| tcb/test/guard-hook.test.mjs | W2-gh | d5690df3 (hx-W2, outside `.claude/`) | 30 | 27 | 0 | 3 |
| e2e/run-e2e.mjs | W2-e2e | 308abe83 (hx-W2e2e, outside `.claude/`) | 232 steps | 232 | 0 | - |

- W2-ws3 is one grouped call of the two files (118 tests, 112 pass, 0 fail, 6 skipped, 80 s); the per-file split is
  by test name from its log. The skips are the `NA` tests (needs the app) and the as-built skips.
- W2-gh: `tcb/guard-hook.mjs` and its test file are unchanged since d5690df3 (the later commits touch only the
  coordinator brief, spec/briefs.md and the e2e). 24 s.
- Earlier runs (builder 2): W2-ws2 (watch + status, 118: 110 pass, 2 fail on the status line's script name, fixed)
  and W2-w3 (`--test-name-pattern FX-W2`, watch, 3/3 pass).
- New tests: watch "FX-W2 usage", "FX-W2 a reused nonce is harmless", "FX-W2 the confirm deadline"; status
  "FX-W2 a second reconcile of a confirmed turn keeps it confirmed in hold 1 (B1.4) ..." and "FX-W2 reconcile
  confirms the arm only by a live slot ..." (M2's test rewritten).
- **e2e adapted to FX-W2's actors** (no script changed for it): the reconciles at old lines 431 and 493 expect exit
  1 `arm-unconfirmed` (was `alarm-missing`); the stand-in alarm (old line 733) also writes `run/arm/slot-1.json`
  {ce, pid, start_time, nonce} and its nonce file {state: registered, k: 1, pid}, as the ensure's hold 1 does, and
  call 2 is `status --reconcile --arm-nonces X`: exit 0 and `turn.json` arm `confirmed`. The e2e calls no
  `watch --alarm`. Step count unchanged (232). The checkout was removed after the run.

## Departures

`MAIN/research-tree/build/departures/W2.md`, items 1-9 (item 9, brief place 0a, done by builder 3).

## Tokens (the counter's lines)

- builder 1: 14.67 M; builder 2: 13.24 M;
- builder 3: build-invariant: W2 alarm slot finish | calls 44 | tokens 4.14 M | context now 122.2 K (before this
  file). Unit total about 32.1 M (29.2 M limit for the unit plus the 7 M the root allowed builder 3).

## Not done

- **PLAN's conflicts.** `git merge-tree` of `u/W2` with `u/PLAN` (eb0c6810) still conflicts in
  `research-tree/CONTRACT.md` and `research-tree/spec/watch.mjs.md`; the code files, both test files and
  `tcb/briefs/coordinator.md` merge without conflict. Whichever of the two lands second resolves them as a union.
- No test for departures 4 (a corrupt `turn.json` rewritten) and 6 (the `turn-moved` guard), nor for the brief's
  text (no test reads `coordinator.md`).
- The real ensure process (`watch --alarm --ensure`) is exercised only in watch.test.mjs; the e2e uses a stand-in.
- S1's single death right after an alarm wake leaves no source until FX-W4 (N3, B1-4).
- The full suite is the root's.
