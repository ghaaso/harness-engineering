# Rust port C: count gate (builder C of briefs/RUST-PORT.md, 2026-11-25)

Status: done. Nothing committed. `Cargo.toml`, `Cargo.lock` and `kit-core` are unchanged. Cargo did not ask to change the lock.

## Files

- `harness-kit/rust/crates/kit-count-gate/src/main.rs`: replaces the placeholder. It holds `main`, `run`, the three
  modes (`--end`, `--status` and the hook) and the decision.
- `.../src/count.rs`: the count. It holds `since` (read back from the end in 1 MiB pieces, as the JavaScript does),
  the log cache, `manualEnds`, `tailAllows`, `refusedStarts`, `readMeta` and the lock.
- `.../src/widths.rs`: the `WIDTHS.md` parser.
- `.../src/text.rs`: message text in UTF-16 units, `norm`, `glob`, `clip`, `short`, `Number(x)`, and the keys
  that a JavaScript `Set` compares by.
- `.claude/hooks/count-gate.test.mjs`: it now runs the hook through `runHook` and `hookCommand` from
  `hook-under-test.mjs`. No case was changed. The plan gate in the "old hooks" case is still run with `node`. The file
  was edited and tested in a copy of the clone in the scratchpad, then moved into place in one step.

## Tests

| | JavaScript hook | Rust program (`KIT_HOOK_BIN_DIR`) |
|---|---|---|
| `count-gate.test.mjs` | 29 passed of 29 | 29 passed of 29 |

- No case is kept for the JavaScript only, and none is skipped.
- Cargo tests: 19 pass. They cover glob, `Number`, the bracket strip, norm, clip, short, the `WIDTHS.md` parser,
  `since`, the lock (a stale lock is taken over at once and a fresh one after 420 ms), the session folder, `--end`
  in kit mode, and odd input.
- Clippy (`--all-targets -- -D warnings`, the workspace lints) is clean, and `cargo fmt` was run.
- One release build was made, in `%TEMP%/kit-count-gate-target`.

## The run on real data (this session, 0f8570e2)

- `--status 0f8570e2`, run against the real clone (it only reads). The JavaScript hook and the program printed the
  same lines: 4 helpers running, 0 pending, 0 refused, limit 20, 12 meta files, and the same four helper lines. The
  only difference was the time taken: JavaScript 4 ms, Rust 10 ms (debug timing aside, a single run).
- Hook mode: a PreToolUse Agent input with the real transcript_path of this session, run with `--clone=<temp folder>`
  so that the live log got no pending admission. It exited 0 and logged
  `{"ev":"allow",...,"n":4,"limit":20,"wait":0,"hold":2}`.
- `--end` was never run against a real session.

## Not the same as the JavaScript, and why

- **Error text from the operating system.** In "count failed: ...", "cannot be read (...)" and "could not write ...
  (...)", the text from the system is Rust's (`os error N`), not Node's (`ENOENT: ...`). Where the JavaScript would
  throw uncaught in `--status` (the session folder is a file, for example), the program exits 1 with one line,
  `count gate: <error>`, where Node prints a stack.
- **`--clone=` in the reason of `--end`.** kit-core takes every `--clone=` argument out, so such a word cannot appear
  in a reason.
- **A timestamp with no offset** in a transcript is read as UTC (kit-core's `date_parse`). JavaScript reads it as
  local time. The app writes `Z`.
- **Usage lines** still say `node .claude/hooks/count-gate.mjs ...`, word for word as the JavaScript says them.
- Not tested: macOS and Linux (only Windows was run), and the wired kit command in a live session.

## What I missed in kit-core (kept in my crate)

- An append that can fail. `--end` and the allow line need its error, and kit-core's `log::append` ignores errors.
- A message builder in UTF-16 units, so that a cut inside a surrogate pair reaches the log as `\udxxx` and standard
  error as U+FFFD, as Node writes them.
- `Number(x)` for strings and values.
- A `u64` to `f64` conversion that the lints allow.
