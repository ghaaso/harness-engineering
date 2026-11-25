# Hooks report (builder of briefs/HOOKS.md, 2026-11-25)

Done. Every hook below was changed on a copy outside `.claude/hooks/`, tested there, and put in place by one rename
each; all tests were run again in the live folder and in a tree holding only `origin/main` plus these files. Without
`--harness-kit` a hook does not even load `kit-mode.mjs` (dynamic import inside a try, only when the argument is
present), so its behaviour is the old one; a missing or broken `kit-mode.mjs` with the argument also gives the old
behaviour (tested for tier-hook).

## Files

New
- `.claude/hooks/kit-mode.mjs`: `kitMode(import.meta.url)` gives kit or not (null), clone, project
  (`--project=<f>` or `--project <f>`, else the clone), state `<project>/.harness`, briefs, logs `<project>/.claude/logs`,
  `usageTool` (false with `--no-usage-tool`), and `realOf`/`key`/`under` (real paths via `realpathSync.native`, deepest
  existing folder for a file not yet made; lower case on Windows and macOS).
- `.claude/hooks/tier-hook.test.mjs` (24 cases; copies the hook, routes and kit-mode into a temp clone, nothing else needed).
- `harness-kit/hooks/kit-start.mjs` + `kit-start.test.mjs` (10).
- `harness-kit/tokens.mjs` + `tokens.test.mjs` (8). Project defaults to the current folder; transcripts under
  `$CLAUDE_CONFIG_DIR` or `~/.claude` `/projects/<slug>`, slug tried for the path as given and its real path.
- `harness-kit/basis.build.mjs` -> `harness-kit/basis.json` (18 records). Rule: an id cited in ORCHESTRATION.md or
  RESULTS.md on a line holding a token figure (`0.20 M`, `280 K`, `404,000 tokens`), status measured or observed in
  `library/journal`. Left out: r57-0063 (owner), r57-0418, r57-0421 (reasoned). The selection is mechanical: a few kept
  ids are window figures rather than helper costs (t8-0107, r57-0604, t7-0608). `--check` says if basis.json is stale;
  re-run it after the documents' helper changes ORCHESTRATION.md or RESULTS.md. It exits 1 where `library/` is absent.

Changed (kit mode only): `window-ceiling.mjs`, `tier-hook.mjs`, `creep-gate.mjs`, `count-gate.mjs`, `fanout-gate.mjs`
and the test files of all but tier-hook.
- window-ceiling: root = project; coordinators from `<project>/.harness/*STATE.md`; past the line passes a write or read
  of `.harness/*STATE.md`, `.harness/briefs/*.md`, `.harness/units/**` (real paths compared); refusal text names those.
- tier-hook: log under the project; a child-session folder without the hook is told to run
  `node "<clone>/harness-kit/setup.mjs" --apply --project "<dir>"`.
- creep-gate: root = project; briefs also from `<project>/.harness/<path>` and `.harness/briefs/<name>`. Without a record
  book the escape "owner: r57-NNNN" passes nothing: every rule holds, no way past (tested).
- count-gate: `<project>/.harness/WIDTHS.md`, log and lock under the project; `--status` looks in the project's transcript
  folder; `--end` drops the kit arguments from its reason. Its two owner-file cases skip in a clean clone, saying why.
- fanout-gate: root = project; state `.md` in `<project>/.harness/`; basis from `<project>/library/journal` (if present),
  clone `harness-kit/basis.json`, `<project>/.harness/basis.json`; `--no-usage-tool` turns the meter rule off and logs
  "meter rule off: --no-usage-tool" on each decision; every other rule unchanged (tested).

## Test counts (before -> after, live folder; same in the main-only tree)

window-ceiling 119 -> 134; creep-gate 36 -> 42; fanout-gate 37 -> 48; count-gate 25 -> 29 (main-only: 27 pass, 2 skip);
tier-hook none -> 24; selftest.mjs 245 -> 245; kit-start 10; tokens 8.

## Command lines the set-up must write (`<project>/.claude/settings.local.json`, this order)

    SessionStart (no matcher)          node "<clone>/harness-kit/hooks/kit-start.mjs" --harness-kit "--project=<project>"
    PreToolUse  *                      node "<clone>/.claude/hooks/window-ceiling.mjs" --harness-kit "--project=<project>"
    PreToolUse  *                      node "<clone>/.claude/hooks/tier-hook.mjs" --harness-kit "--project=<project>"
    PreToolUse  Agent|Task|SendMessage node "<clone>/.claude/hooks/count-gate.mjs" --harness-kit "--project=<project>"
    PreToolUse  Agent|Task             node "<clone>/.claude/hooks/fanout-gate.mjs" --harness-kit "--project=<project>" [--no-usage-tool]
    PreToolUse  Agent|Task             node "<clone>/.claude/hooks/creep-gate.mjs" --harness-kit "--project=<project>"

count-gate before fanout-gate, as on this PC (count-gate's fix B2 reads a later hook's refusal).

For the set-up builder: `setup.mjs`'s `isOurs` tests `endsWith(' --harness-kit')`; with `--project=` after the mark it must
test for the mark anywhere in the command. `check-clone.mjs` reads node:test counts as passed/total, so count-gate in a
clean clone shows 27/29 with exit 0 (2 skipped); it should count skips apart.

## Effort (not built)

A PreToolUse hook sees an effort only if the caller passes it. The Agent tool's schema (in this session's API request
lines) has an optional `effort`, enum low, medium, high, xhigh, max, "set this ONLY when ... instructions explicitly
ask"; the five helper starts of this session carry description, subagent_type, model, prompt, run_in_background and no
effort; the helper meta has only `pickedEffortModel`. Building the check: an `effort` per kind in `tier-routes.json`, and
in tier-hook a refusal of a start with no `effort` or one above its route (about 20 lines and cases like the model's),
plus a line in RULES.md telling sessions to pass it (the schema's own wording needs that instruction). What a helper then
ran at is visible only afterwards, in its transcript's request lines (`output_config.effort`).

## Not tested

macOS and Linux (this PC is Windows; the symlink case ran as a junction); a live Claude Code session on the kit's
settings (hooks were fed their input by tests); `tokens.mjs` against a real macOS transcript folder; kit-start with the
real RULES.md (not yet written when tested; the missing-file line and the 9,000 cut are tested).
