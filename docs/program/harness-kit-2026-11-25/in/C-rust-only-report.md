# Builder C: the JavaScript duplicates go (2026-11-26)

Done. No commit.

- `.claude/hooks/window-ceiling.mjs`, `creep-gate.mjs`, `count-gate.mjs`, `fanout-gate.mjs`: byte for byte `git show origin/main:<path>` (checked with cmp on the copy before the move; `git diff origin/main` on the four is empty).
- Deleted: `.claude/hooks/kit-mode.mjs`, `harness-kit/hooks/kit-start.mjs`, `harness-kit/tokens.mjs`.
- Test files changed (every case kept): the kit-mode cases and the kit-only repair F1 of the window ceiling run when `KIT_HOOK_BIN_DIR` is set, and against the JavaScript print one skip line with the reason (window-ceiling 15 + 1, creep-gate 6, fanout-gate 12, count-gate 5 by `node:test` skip). `count-gate.test.mjs` no longer copies `kit-mode.mjs`. `kit-start.test.mjs` and `tokens.test.mjs` run against the programs only; without `KIT_HOOK_BIN_DIR` they print one skip line and exit 0. `hook-under-test.mjs` unchanged (not needed).

Check, in place, one release build of the workspace as it stood (`%TEMP%/kitC-target`, exit 0):

| test file | programs | JavaScript |
|---|---|---|
| window-ceiling | 135 passed | 119 passed, 16 skipped |
| creep-gate | 42 ok, all passed | 36 ok, 6 skipped |
| count-gate | 30 passed, 0 skipped | 25 passed, 5 skipped |
| fanout-gate | 49 ok, all passed | 37 ok, 12 skipped |
| kit-start | 10 passed | skipped (program only) |
| tokens | 8 passed | skipped (program only) |

Count-gate: the brief's "28 with 2 skipped" is the count where `research-tree/build/plan.json` and `WIDTHS.md` are absent; in this working copy both exist, so all 30 run and pass.

Left for others: `tier-hook.mjs` still imports `kit-mode.mjs` inside a try (it falls back to no kit mode; builder T restores it). The four documents and some crate comments still name `tokens.mjs` / `kit-start.mjs` / `kit-mode.mjs` (builder T's documents; crates not touched).
