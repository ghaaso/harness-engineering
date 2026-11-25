# Rust builder D report (fan-out gate, then the token counter)

Status: stopped partway. The migration gate (`.claude/hooks/migration-gate.mjs`, rule FM-06) refuses every further
cargo call from this helper.

## Why it stopped

FM-06 refuses a cargo run after "two runs in a row without fewer errors". It counted my runs as 0, 0, 7: two clean
`cargo check` runs, then the first `cargo clippy` run, which had 5 findings (7 lines with "error:"). The rule cannot
tell a clean run followed by a clean run from a repair loop that is not working, so it counts 0 then 0 as "not fewer".
I did not get around the gate. A fresh helper has its own count and can go on.

## Files

- `harness-kit/rust/crates/kit-fanout-gate/src/`: `main.rs` (run, decide, the log record), `jsv.rs` (property reads
  that throw as V8 does, `String(v || '')`, `===`/Map-key identity), `fsx.rs` (readFileSync/readdirSync as Node,
  libuv's sort off Windows), `patterns.rs` (the regular expressions with ASCII `\d`, `\b`, the `i` flag, JS `\s`),
  `limit.rs` (stated limit, brief paths, journal and basis files), `state.rs` (state file, cap, meter lines,
  sessions), `lines.rs` (transcript lines), `meter.rs` (rule 2), `cap.rs` (the cap). Token counting uses
  `kit_core::tokens` (`of_file`, `Ledger`). Nothing was added to kit-core.
- `.claude/hooks/fanout-gate.test.mjs`: spawns through `runHook` (two calls changed, plus a comment line). I wrote it
  in the scratchpad, ran it there against the JavaScript (48 of 48), then put it in place in one rename. It passes
  in place: 48 of 48.
- `harness-kit/tokens.test.mjs`: spawns through `runHook` (import `../.claude/hooks/hook-under-test.mjs`). Against
  the JavaScript: 8 of 8.
- `kit-tokens`: not started. Its `main` is still the placeholder.

## State of the fan-out crate

- `cargo check --offline --locked -p kit-fanout-gate -j 6` was clean.
- `cargo clippy ... --all-targets -- -D warnings` found 5 faults: an unchecked `-` on i128, `sort_by` where
  `sort_by_key` fits, a redundant closure, and two redundant clones. All 5 are fixed in the source. Clippy has not
  run again since the fixes.
- Not run yet: `cargo test`, `cargo fmt`, the release build, the test file against the program
  (`KIT_HOOK_BIN_DIR`), and the run over a real transcript.

## What is not the same as the JavaScript (by design, to be confirmed by the tests)

- The session's first 8 characters are put into the state-file pattern as literal text (`regex::escape`). The
  JavaScript puts them in raw: a session id with a pattern character would throw there or match as a pattern.
  Session ids are UUIDs.
- A Fable window whose `percentUsed` is not a number is ignored. The JavaScript would add it as text.
- Usage fields that are not whole numbers, and message ids that are not strings, count 0 (as `kit_core::tokens`
  counts them).
- A session id cut inside a surrogate pair names no state file.

## For the helper that goes on

Use the same `CARGO_TARGET_DIR` (`%TEMP%/kit-fanout-gate-target`). Run clippy (the fixes are in), then
`cargo test`, `cargo fmt -p kit-fanout-gate`, the release build, and
`KIT_HOOK_BIN_DIR=<target>/release node .claude/hooks/fanout-gate.test.mjs`. Then port `harness-kit/tokens.mjs` to
`kit-tokens`. Keep the error lines of each cargo run falling, or FM-06 stops that helper too.

---

# Second builder D (continued from the above): done

Status: both programs done. Three cargo calls, error lines 0, 0, 0 (clippy + test; clippy + test of both crates;
release build). The migration gate never refused.

## Files (all mine; no `Cargo.toml`, `Cargo.lock`, `kit-core` or `.mjs` hook changed; the two test files not changed)

- `harness-kit/rust/crates/kit-fanout-gate/src/jsadd.rs` (new): JavaScript's `+`, `ToNumber`, `ToString` on the
  token sums and on a meter reading. `cap.rs` now counts tokens with it (its own `tokens_of`, ids compared as `Map`
  keys) instead of `kit_core::tokens`; `meter.rs` keeps the Fable reading as the value it is; `main.rs` logs and
  compares the sums as JavaScript does.
- `harness-kit/rust/crates/kit-tokens/src/main.rs`: the port of `harness-kit/tokens.mjs` (listing, `--basis`).
- `harness-kit/rust/crates/kit-tokens/src/ojson.rs`: `JSON.parse` and `JSON.stringify(v, null, 1)` with JavaScript's
  key order, for the rewrite of `.harness/basis.json` (`serde_json` sorts keys).
- kit-tokens includes `kit-fanout-gate/src/jsadd.rs` by `#[path]` (one copy of the code). It belongs in kit-core.

## Checks

- `cargo clippy --offline --locked --all-targets -- -D warnings`, both crates: clean. `cargo fmt` run on both.
- `cargo test`: kit-fanout-gate 21 passed, kit-tokens 14 passed. One release build of both.
- `.claude/hooks/fanout-gate.test.mjs`: 48 of 48 against the JavaScript and 48 of 48 against the program; 0 skipped.
- `harness-kit/tokens.test.mjs`: 8 of 8 both ways; 0 skipped. No case is kept for the JavaScript only.
- JavaScript and program side by side (`scratchpad/tokcmp.mjs`, not kept in the repository): tokens listing of four
  real sessions of this repository, an ambiguous prefix, `--basis` with no text, and `--basis` on a made-up project
  with a hand-edited `basis.json` (repeated keys, index keys, `\ud800`, `1e400`, `-0`), a usage field given as text
  and a `spawnDepth` given as text: 9 of 9 identical (stdout, exit, `basis.json` bytes).

## The run over real transcripts (this session, 0f8570e2, with a scratch copy of the journal and state files)

- Without `--harness-kit`, as a top-session start and as a helper start (`agent_id` set): both refused, the same text
  from both: "the last meter reading came before the previous wave of starts ..." and "read the meter (get_usage) in
  a message before this start ...". Exit 2.
- With `--harness-kit --no-usage-tool` and the state file in `.harness/` (cap 95 M): both allowed, identical log
  lines: spent 72,321,240, reserve 935,083, running 2. No panic.

## The four differences the first builder listed

1. Session id put into the state-file pattern as text (`regex::escape`): **kept**. The JavaScript builds a pattern
   from the id, which is an injection fault; it shows only for an id with a pattern character, and the app's ids are
   UUIDs. Matching it needs a JavaScript regular-expression engine: put raw into the `regex` crate it would give a
   third behaviour (other syntax, other errors), not the JavaScript's.
2. A Fable `percentUsed` that is not a number: **now as the JavaScript** (`"50"` + moved is joined as text, then
   compared as a number; the message prints `String(v)`).
3. Usage fields that are not whole numbers, ids that are not strings: **now as the JavaScript** (a text field joins as
   text and the sum is logged as a string, `true` is 1, a fraction is kept; ids compared as `Map` keys). The fan-out
   program no longer uses `kit_core::tokens`, whose `of_line` still counts such fields 0.
4. A session id cut inside a surrogate pair: **not a difference**. In the JavaScript the lone surrogate is followed by
   `\b`, and text read from UTF-8 never has a word boundary there, so its pattern matches nothing either.

## kit-tokens: what is not the same

- The date of a `--basis` entry: the JavaScript takes the local date from `new Date()`; Rust's standard library has
  no time zone, so the program runs `date +%Y-%m-%d` (PowerShell `Get-Date` on Windows) and falls back to the UTC
  date if that fails. Checked here on Windows only; macOS `date` not run.
- `ojson` refuses nesting deeper than 1,000 as "not JSON" (V8 reads deeper).
- Where the JavaScript throws (a `null` meta file, an unreadable project folder) the program exits 1 with one line,
  not Node's stack.
- Its printed hints still name `node harness-kit/tokens.mjs`, as the JavaScript prints them; the README or set-up
  that wires `kit-tokens` should say which command she runs.
