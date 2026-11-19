# FIX-GUARD: the review's breaking findings in the record guard and the commit check (2026-11-19)

Kind build-invariant, Opus. Asked by the top session: one blind review (`research-tree/build/refute/P0-GATE.md`)
found these break. Commit nothing.

**Fix, each with a test that fails on the current code and passes on yours** (read the verdict file first; it gives
the input that shows each one and the smallest fix):
1. Finding 1: files under `docs/program/evidence/` that HEAD holds are protected like the manifests' files, in the
   record guard and in the commit check (new files stay allowed; in a worktree, its own HEAD).
2. Finding 2: `git checkout -f <branch>`, `git switch -f` or `--discard-changes`, and `git stash` (any form that
   drops working-tree changes) are refused while the journal has uncommitted lines, as `reset --hard` is.
3. Finding 3: a journal Edit may only add text after the old content, starting with a newline; nothing of the
   existing last line changes.
4. Finding 4: UNC admin-share paths (`\\localhost\c$`, `//localhost/c$`, the PC's own name, `127.0.0.1`) and
   `\\?\Volume{...}` paths are resolved to the local path before the checks, or refused when they cannot be.
5. The regex that hangs on long runs of spaces in a PowerShell command (verdict, non-breaking list): make it linear.
6. The verdict's invariants of these files that no test guards: add a test for each.

**Files you may change:** `.claude/hooks/record-guard.mjs`, `.claude/hooks/selftest.mjs`, `tools/check-commit.mjs`,
its test file, `tools/git-hooks/pre-commit`. Another helper (FIX-GATE) is changing `plan-gate.mjs` and its test now:
do not touch them. The hooks are live for every session: write each new version beside the old one, test it, then
swap it in.

**Then**, only when every test passes: set the record guard's matcher to
`Write|Edit|MultiEdit|NotebookEdit|AskUserQuestion|Bash|PowerShell` in `.claude/settings.json` and
`library/.claude/settings.json` (that one entry only), and check by hand that an ordinary Bash command, a journal
append and a git status still pass in this session.

**Done** = all tests pass (`node .claude/hooks/selftest.mjs`, the commit check's tests) and
`research-tree/build/units/FIX-GUARD/result.md` lists each finding, its test, before and after, and your tokens.
Every Bash call under 150 s. **Tokens (r57-0038):** expected 10.9 M (the fix units of 2026-11-17), limit 29.2 M;
at about 330 K context write `units/FIX-GUARD/checkpoint.md` and return "LIMIT". Return at most 8 lines.
