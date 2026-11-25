# Rust builder B report: `creep-gate.mjs` ported to `kit-creep-gate`

Status: done. Nothing committed. No hook `.mjs`, no `Cargo.toml`, no `kit-core` file changed; `Cargo.lock` was not changed.

## Files

- `harness-kit/rust/crates/kit-creep-gate/src/main.rs`: `main`, the hook (`run`), `--replay`, `sessDirOf`,
  `ownerRecord`. `main` checks for `--replay` before it reads standard input, as the JavaScript does, so a replay
  started from a terminal does not wait for input.
- `src/rules.rs`: the kinds, the review words, the fold and repair-round patterns, `breaking` (the look-behind is
  matched by hand), the path pattern, `norm`, `isBrief`, `isContext`, `targetOf`, the `Deliverable:` line and
  `owner: r57-NNNN` (JavaScript's multi-line `^` is matched by hand at `\n`, `\r`, U+2028 and U+2029).
- `src/session.rs`: `load`, `walk`, `mtimeOf`.
- `src/decide.rs`: `decide`, `fmtTok`, `fmtMin`.
- `.claude/hooks/creep-gate.test.mjs`: its three `spawnSync(process.execPath, [HOOK, ...])` calls now go through
  `runHook` from `hook-under-test.mjs`. No case was changed. The file was tested in the scratchpad both ways first,
  then put in place with one rename.

## Tests

| run | result |
|---|---|
| `node .claude/hooks/creep-gate.test.mjs` (JavaScript) | 42 passed of 42 |
| the same with `KIT_HOOK_BIN_DIR` (release build) | 42 passed of 42, none skipped |
| `cargo test -p kit-creep-gate` | 14 passed |

The printed lines of the two runs were also compared, with the temporary folder names masked. They are the same.
No case is kept for JavaScript only, because the test file imports nothing from the hook.

Differential check (a script in the scratchpad, not kept): the live JavaScript hook and the program were run on the
same inputs. The comparison covered exit code, standard output, standard error, and the last log line with `t` taken
out.
- **Real transcripts:** 41 transcripts (the 41 newest main sessions, plus this helper's own transcript). Each one got
  5 starts in both modes plus a `--replay`. That is 462 comparisons, and 0 differ.
- **Odd input:** 33 comparisons (empty input, `null`, `0`, a string, an array, a tool name given as an array, ids
  cut inside an emoji at 8, 17 and 60, lone surrogates, an absolute path under the root, "NON-breaking", a numeric
  `tool_use_id` and `agent_id`, a description that is an object, a replay with no transcript). 0 differ.

## Clippy

`cargo clippy --offline --locked -p kit-creep-gate --all-targets -- -D warnings` is clean under the workspace's lint
table, and `cargo fmt --check` is clean. There is no `allow`, `expect`, `unsafe`, `todo` or `unwrap`. One release
build was run, into `%TEMP%/kit-creep-gate-target`.

## A real run (this session's transcript, as the app calls the hook)

The input was a `refute:` start whose `transcript_path` was this helper's own transcript (it lies under the session's
`subagents/` folder). The program exits 0 and prints the same text as the JavaScript, byte for byte:
`creep gate: 13 helpers started in this session, 1 of them reviews; a file last changed 0 min ago (.../scratchpad/realrun.sh);
0 k of the session's 57.5 M tokens (0 %) came after that. No deliverable stated: ... (CLAUDE.md rule 8).`

## Not the same as the JavaScript, and why

- **The program's own error:** where `load` throws (a `null` block in a user or assistant line), the hook passes and
  logs `error: Cannot read properties of null (reading 'type')`, as the JavaScript does. Under `--replay` the
  JavaScript prints a stack and exits 1; the program exits 1 with one line,
  `creep gate: TypeError: Cannot read properties of null (reading 'type')` (Rust tests:
  `a_null_block_in_the_transcript_passes_with_the_error_logged`, `a_null_block_in_an_assistant_line_fails_as_javascript_throws`).
- **Usage fields that are not numbers:** a token count given as text counts as 0. The JavaScript would join the texts
  as strings. No real transcript holds this.
- **Ids that are objects:** call ids that are JSON objects compare by their text here, but by identity in JavaScript.
  Ids that are strings, numbers, `null` or missing behave the same.
- **Shared with `kit-core`:** the clone is `--clone=` as given, and `serde_json` reads no input nested deeper than
  128 levels. The rest of `DESIGN.md`'s list does not touch this hook. `os.homedir()` is `USERPROFILE` on Windows
  and `HOME` elsewhere.

Nothing was missing from `kit-core`.

## Not tested

- macOS and Linux (only Windows was run).
- Kit mode with a project reached through a link (the `realOf` root).
- `--replay` given a session id rather than a path: only the "not found" message was compared.
