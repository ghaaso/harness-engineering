# W7: merge of `build` after the landing conflict (2026-11-19)

- **Merge commit:** `31658ae76efc3f9f551d6a343e524f537ea821c7` on `u/W7` (worktree `MAIN/.claude/worktrees/W7`),
  parents `bb0295bb` (u/W7, the refuted tip) and `35647885` (build: W6 and REDO landed). Merge base `ec3b04fd`.
- **Files resolved:** one, `research-tree/spec/lib.md`, section "Round-3 skeleton (S0.5)". The two units changed
  two adjacent bullets of the base, so the hunks touched: W7 rewrote the `acquireLock` bullet (FX-W7 step 1,
  built, test W7a); W6 rewrote the `parseTranscript` bullet (FX-W6, tail state and `transcriptKind`, test W6a).
  Union: W7's `acquireLock` bullet whole, then W6's `parseTranscript` bullet whole, each in place of the base
  text of its own bullet; the shared continuation lines (`TRANSCRIPT_KINDS`, `TRANSCRIPT_RECORD_TYPES`) as they
  were. Checked: build's side to the result equals the base to W7's side, and W7's side to the result equals the
  base to build's side (one hunk each); no markers left. Nothing reworded; no code changed. Every other file
  (CONTRACT.md, `tcb/lib.mjs`, `tcb/watch.mjs`, both test files, `spec/watch.mjs.md`, the watch fixture data and
  the rest) merged without conflict.
- **Tests on the merged tree** (before the commit, which then took exactly that tree), through MAIN's lane, label
  `W7merge-lib-watch`, T 140, W 5, TAP reporter: `tcb/test/lib.test.mjs` + `tcb/test/watch.test.mjs`: 268 tests,
  **262 pass, 0 fail**, 6 skipped, 0 cancelled; exit 0; waited 2 ms, ran 69.1 s.
- **Tokens:** `build-invariant: W7 merge of build after a landing conflict | calls 15 | tokens 1.03 M | context now 77.5 K`
  (counter read this helper's transcript; no WARNING). Expected about 2 M, limit 4 M.
- **Not done:** the landing itself (the root lands `u/W7` at `31658ae7`); the full suite was not run here.
