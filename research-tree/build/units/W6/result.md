# W6 (FX-W6) result

- Branch `u/W6`, final commit **5b5ede1d** (one commit on ec3b04fd), worktree `.claude/worktrees/W6`.
- Built (branch B1): lib `parseTranscript` keeps a tail state (option `tail`; hidden `tail` and `kind`:
  `tool`, `bg-wait`, `model`, `idle`; nothing read = `model`; the 25 non-conversation record types are
  neutral); watch counts counted ticks since the attempt's last new conversation record against the main
  transcript's kind deadline (tool = declared timeout in ticks + `tool_slack_ticks`, `bg_wait_ticks`,
  `model_ticks`, idle none), counts nothing on an epoch's first tick, and raises the uncharged act-dues
  `idle-child` and `age-cap` (re-armed by the acknowledgement); class 21 detail carries kind and deadline.
  CONTRACT 3.20 rows (3.10 and 4.8 lines too), `spec/watch.mjs.md`, `spec/lib.md`, thresholds unit text.
- Tests, through MAIN's lane from the worktree's `research-tree/`:
  - `tcb/test/lib.test.mjs`, label `W6-lib`: 194 tests, 192 pass, 0 fail, 2 skipped (as before).
  - `tcb/test/watch.test.mjs`, label `W6-watch`: 72 tests, 68 pass, 0 fail, 4 skipped (the NA tests); the
    3 new ones (per-kind deadline, idle child, age cap) included; T3 and M5 updated.
  - guard-hook, selftest: not run (not W6's files).
- Departures: `research-tree/build/departures/W6.md` (8 items; item 1: the age cap's "continue" is the
  acknowledgement, so FX-W5's stuck path never reaches an acknowledged cap).
- Tokens: `build-invariant: W6 transcript kinds and deadlines | calls 91 | tokens 15.99 M | context now 298.6 K`.
- Not done: no coordinator-brief line on answering `idle-child` / `age-cap` (not in W6's writes); B2 not
  built; no refuter of its own (reviewed with CLOSE, REDO and W4 in B1-4).
