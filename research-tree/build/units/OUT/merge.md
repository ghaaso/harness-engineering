# OUT: merge of build before landing (helper, 2026-11-20)

- **Merge commit:** `558797e4` on `u/OUT` ("OUT: merge build before landing"), parents `e38717a3` (u/OUT) and
  `baf8c7b3` (build: W6, REDO, W5, W7, CGATE, CLAIM landed). Merge base `ec3b04fd`. Every other file auto-merged.
- **Conflicts resolved, each the union of both sides** (diff3 markers; only marker lines and the base lines were
  dropped; nothing reworded, no code changed beyond the union):
  - `research-tree/spec/replace.mjs.md` (1 block): OUT's rewritten `modeFence` hold bullet and its FX-OUT tests
    bullet, whole; then build's sections "FX-CLAIM (round 3)", "FX-REDO" and "FX-CLAIM with FX-REDO", whole.
    The two base lines OUT had replaced (build left them unchanged) are gone.
  - `research-tree/tcb/test/guard-hook.test.mjs` (1 block, both added before T14): OUT's FX-OUT block (`slotText`,
    `oneCase`, `runHookWithNode`, FX-OUT 1, FX-OUT 2, hook clock), then CGATE's block (G1-G5 and its helpers).
    No duplicate name between them (`node --check` passes).
  - `research-tree/tcb/test/lib.test.mjs` (1 block, the S0.5 skeleton test): OUT's `const stubs` line (without
    `outcomeState`, `outcomeAppend`), followed by CLAIM's two lines that check the arity of `readClaim`,
    `claimRecord`, `tombstoneRecord` and delete them from `stubs`. Both removals kept.
- **Departures:** none (`departures/OUT.md` untouched).
- **Tests, through MAIN's lane, TAP:**
  - `OUTmerge-lib-redo` (worktree `research-tree/`, T 90, W 55): `tcb/test/lib.test.mjs` + `tcb/test/redo.test.mjs`:
    tests 205, pass 203, fail 0, skipped 2 (T82, T92: needs the app), 35.4 s. Run on the resolved tree just before the
    commit (the commit holds the same bytes).
  - `OUTmerge-guard` (detached checkout of 558797e4 at `C:/Users/User/Documents/projects/hx-OUT`, removed after;
    T 60, W 85): `tcb/test/guard-hook.test.mjs`: tests 29, pass 26, fail 0, skipped 3 (needs-app 1-3), 21.2 s.
    FX-OUT 1, FX-OUT 2, FX-OUT hook clock and G1-G5 all pass.
  - Not run (the landing runs them): OUT's other test files.
- **Tokens:** `build-invariant: OUT merge of build before its landing | calls 19 | tokens 1.59 M | context now 105.4 K`
  (expected about 2 M, limit 3 M). The counter read this transcript (no WARNING line).
- Resolver script (not in the repository):
  `C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/8a7db643-dc9c-42d9-8dea-e9f99c2d3b69/scratchpad/OUTmerge/resolve.mjs`.
