# Rust port, builder A: window ceiling (done)

Status: done. Nothing committed. No Cargo.toml or Cargo.lock changed, kit-core untouched, no hook `.mjs` changed.

## Files
- `harness-kit/rust/crates/kit-window-ceiling/src/main.rs`: main, environment (`WINDOW_CEILING_LOGDIR`, `_BUILD`,
  `_SETTINGS`, home), the modes `--test`, `--test-off`, `--show`, and the hook (log lines in the JavaScript's key order).
- `src/reading.rs`: the incremental transcript reading and its state file (version 2, same keys and order, so either
  program reads the other's files).
- `src/limits.rs`: the window from the settings, the lines (checkpoint, W*, Fable compaction cap), `kfmt`, `--show`.
- `src/handover.rs`: what passes above the line (`commandOk`, hand-over paths, kit mode) and `isCoordinator`.
- `src/jsx.rs`: what kit-core lacks: `Number()`, `Math.max/min` with NaN, `JSON.stringify` of any value, Node's
  `path.dirname`/`basename` (win32 and posix).
- `.claude/hooks/window-ceiling.test.mjs`: its four spawn sites now go through `runHook` (no case changed). It was
  written as an unwired file beside the hook, run both ways, then moved over the original in one step.

## Tests
| | JavaScript hook | Rust program (`KIT_HOOK_BIN_DIR`) |
|---|---|---|
| `window-ceiling.test.mjs` | 134 passed of 134 | 134 passed of 134 |

No case is kept for the JavaScript only. Cargo tests of the crate: 19 pass (number parsing, Node paths, two blocks of
one call, compaction segments, state-file round trip, W*, command checks incl. here-documents, the coordinator line).

## Clippy
`cargo clippy --offline --locked -p kit-window-ceiling --all-targets -- -D warnings` is clean under the
workspace's lints; `cargo fmt` was run; one release build was made. There is no `unsafe`, `allow`, `expect` or `unwrap`.

## Real transcripts
I ran `--show` over this session's transcript (3.0 MB) and its 12 helper transcripts, as session, coordinator and
helper, with the JavaScript and the program. All 39 outputs were the same. One hook call on the session's transcript
(a Bash `npm test`, logs sent to a temporary folder) exited 0 and logged
`"ctx":333584,"warn":853100,"line":886550,"g":3345,"gFrom":"own","kind":"coordinator","model":"claude-fable-5-2","form":"fable","decision":"allow"`.

## Where it is not the same as the JavaScript, and why
None of these is reached by real data or by any test case.
- A usage figure that is not a number is read as `Number(x)`. The JavaScript would join strings. Transcripts hold
  numbers only.
- A state file with a field of the wrong type is read again from the start. The JavaScript carries the bad value on.
- An agent id is matched literally against the transcript's name. The JavaScript builds a regular expression from it,
  and it throws on ids such as `(`. Real ids are hex.
- The text after `error: ` in an error note is Rust's, not Node's.
- The user's settings folder comes from `USERPROFILE` (Windows) or `HOME`. Node falls back to the system account
  record when they are unset.
- `expires` in the test-scale file is read with `js::date_parse`, which handles only ISO forms. `--test` writes ISO.
- The clone is `--clone=` as given, not made real, as in kit-core.

## Not run
macOS and Linux (the code paths for them, posix dirname and byte-sorted folder listing, are covered by logic only);
a live session wired to the program.
