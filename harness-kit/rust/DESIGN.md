# The kit's hooks in Rust: how a hook program is built

Every kit hook is a program `kit-<hook>` in this workspace. It behaves exactly as its JavaScript hook does
(`.claude/hooks/<hook>.mjs`, `harness-kit/hooks/kit-start.mjs`), and it is done when that hook's own test file passes
against it in both modes (with and without `--harness-kit`). The rules are in
`docs/program/harness-kit-2026-11-25/CONTRACT.md` section 7.

## Layout

    Cargo.toml            workspace: members crates/*; the lint table and release profile are protected
    crates/kit-core       the library every program uses (do not edit it: put what you miss in your own crate)
    crates/kit-<hook>     kit-window-ceiling, kit-creep-gate, kit-count-gate, kit-fanout-gate, kit-tokens already
                          exist with a final Cargo.toml and a placeholder main (exit 1, "not ported yet")
                          src/main.rs: main() and run(); unit tests at the bottom

A program is `main` plus one function that can be tested:

    fn main() -> ExitCode {
        let ctx = Context::from_env();
        run(&ctx, &input::read_stdin(), js::now_ms()).finish()
    }
    fn run(ctx: &Context, input: &Input, now: u64) -> Outcome { ... }   // writes its log line, returns the ending

`run` takes the time as an argument so tests can fix it. The lints deny `println!`, `eprintln!`, `process::exit`,
`unwrap`, `expect`, `panic!`, indexing (`v[i]`, `&s[a..b]`) and unchecked integer arithmetic: use `.get()`,
`checked_*`/`saturating_*`, `unwrap_or_default()`, and return an `Outcome`.

A builder replaces its crate's `src/main.rs` (and adds files under `src/`); it does not touch any `Cargo.toml` or
`Cargo.lock`. The lock is final: `serde_json` and `regex` are in it, and every crate depends on `kit-core` and
`serde_json`. Use regular expressions through `kit_core::regex` (kit-core re-exports the crate). Run cargo with
`--locked` as well as `--offline`: if cargo wants to change the lock, that is a fault to report, not to accept.
Work with `-p kit-<hook>` so another crate's half-built state does not stop yours.

## Build and test

    export CARGO_TARGET_DIR=<the OS temp folder>/kit-<hook>-target   # each builder its own; Git Bash on Windows:
                                                                     #   $(cygpath -m "$TEMP")/kit-<hook>-target
    cargo check  --offline --locked -j 6 -p kit-<hook>
    cargo clippy --offline --locked -j 6 -p kit-<hook> --all-targets       # must be clean
    cargo test   --offline --locked -j 6 -p kit-<hook>
    cargo fmt -p kit-<hook>
    cargo build  --offline --locked -j 6 --release -p kit-<hook>           # once, at the end
    KIT_HOOK_BIN_DIR=$CARGO_TARGET_DIR/release node .claude/hooks/<hook>.test.mjs   # the JavaScript test file, Rust program
    node .claude/hooks/<hook>.test.mjs                                               # the same file, JavaScript hook

## The test switch: `.claude/hooks/hook-under-test.mjs`

A test file replaces `spawnSync(process.execPath, [hookFile, ...args], opts)` with
`runHook(hookFile, args, opts)` (import `{ runHook, RUST }`). Without `KIT_HOOK_BIN_DIR` that is the same call. With
it, the helper runs `<KIT_HOOK_BIN_DIR>/kit-<hook>[.exe]` with `--clone=<two folders above hookFile>` first, so the
program reads the files the test copied beside the hook (`<clone>/.claude/hooks/tier-routes.json` and the like).
A case that cannot apply to a program (it tests the JavaScript module system, say) is not changed: under `RUST` it
is printed as `skip <name>  (<reason>)` and counted, the summary line says `N skipped`, and the behaviour gets a
Rust test. Used now by `tier-hook.test.mjs` (24 cases) and `harness-kit/hooks/kit-start.test.mjs` (10).

## kit-core

- `context::Context::from_env()`: `args` (without `--clone=`), `clone`, `cwd`, `kit: Option<Kit>`; `has(flag)`,
  `hooks_dir()` (`<clone>/.claude/hooks`), `logs()` (`<project>/.claude/logs` in kit mode, else `<clone>/.claude/logs`).
  `Kit { project, state, briefs, logs, usage_tool }` as `kit-mode.mjs` computes them. `from_parts` for tests.
- `input::read_stdin()` / `parse(bytes)` give `Input::Json(Value)` or `Input::Unreadable` (the JavaScript's `catch`);
  `parse_text(&str)` is `JSON.parse` in a `try` for any text (a transcript line, a file).
- `outcome::Outcome`: `Pass` (0), `Say(text)` (0, stdout as is), `Refuse(why)` (2, `why\n` on stderr),
  `Context { event, text }` / `Outcome::context(event, &str)` (0, the SessionStart object), `Fail(why)` (1: where
  the JavaScript throws). `finish()` writes and gives the `ExitCode`; `parts()` for tests.
- `log::Record`: `new().int("t", now).str(k, v).cut(k, v, n).num(k, x).bool(..).null(..).opt_str(..).raw(k, json)`,
  keys in insertion order, a key set again keeps its place (`{ ...rec, k }`); `log::append(dir, "x.jsonl", &rec)`
  makes the folder and never fails.
- `transcript::lines(path)`: the pieces of `(readFileSync(p, 'utf8') || '').split('\n')`, read one at a time (a
  missing file is one empty line); `json_lines(path, keep)` parses the kept lines and skips broken ones.
- `tokens::of_line(&Value)` (id, input + cache creation + cache read + output); `of_file(lines)` (per id, last usage
  wins, first-seen order); `Ledger::new().add(&per_file) -> Count { tokens, messages }` counts an id once across files.
- `paths::resolve(base, parts)` (Node's `path.resolve`, text only), `normalize`, `cwd()`, `slashes(p)`,
  `real_of(p)`, `key(p)`, `under(p, dir)` (as in kit-mode.mjs).
- `js::` `len`, `utf16`, `quote`, `quote_utf16`, `is_space`, `trim`, `truthy`, `to_string` (`String(v)`), `join`,
  `display` (`${v}`, `undefined` for a missing value), `number_to_string`, `to_fixed`, `round`, `now_ms`,
  `date_parse`, `iso_string`, `cmp_utf16`, `object_keys(json_text, path)`.

## JavaScript behaviours that are easy to get wrong in Rust

- **String length.** `s.length` and `s.slice(0, n)` count UTF-16 units; Rust's `len()` counts bytes. Use `js::len`,
  `Record::cut`, or `js::utf16` and `truncate`. A cut inside a surrogate pair leaves a lone surrogate, which
  `JSON.stringify` writes as `\udxxx`: keep such text as `Vec<u16>` and write it with `js::quote_utf16` (kit-start's
  9,000 cut does this). `String::from_utf16_lossy` would change it.
- **White space.** JavaScript's `trim` and `\s` include U+FEFF and not U+0085; Rust's `trim`/`is_whitespace` the other
  way round. Use `js::trim` / `js::is_space`.
- **Regular expressions.** In the `regex` crate `\d`, `\w`, `\b` and `\s` are Unicode-wide and `(?i)` folds Unicode
  (K, the Kelvin sign, matches `k`); in a JavaScript pattern without the `u` flag they are ASCII (except `\s`) and `i`
  folds only within ASCII and between non-ASCII letters. Write `[0-9]`, `[A-Za-z0-9_]`, `(?-u:\b)`, or match by
  hand (kit-tier-hook's `kind_of`). `regex` has no look-behind or back-references: rewrite such a pattern by hand.
  `^`/`$` without the `m` flag mean the whole text in both; `.` stops at `\n` only in Rust, at `\r`, U+2028 and
  U+2029 too in JavaScript.
- **Numbers.** `String(x)` and template literals print `1e+21`, `1.5e-7`, `0.1`, `-0` as `0`: `js::number_to_string`.
  `toFixed` rounds an exact half up, Rust's `{:.N}` to even: `js::to_fixed`. `Math.round(-2.5)` is `-2`: `js::round`.
  JSON numbers are doubles: `js::to_string` goes through `as_f64`, so a 20-digit id prints as JavaScript prints it.
- **Dates.** `js::date_parse` covers the ECMAScript format with `Z` or an offset (`+05:30` and `+0530`), lower-case
  `t`/`z`, days 1 to 31 running over the month's end (`2026-02-30` is 2 March), `24:00`; checked against Node 24 in
  its tests. A date-time with no offset is read as UTC (JavaScript: local time); V8's other formats give `None`
  where V8 might give a time. `js::iso_string` is `toISOString`.
- **Key order.** `serde_json::Map` sorts keys; a JavaScript object keeps them in insertion order (array-index keys
  first). When a hook prints or walks keys in order (a table of kinds), take the order from `js::object_keys` on the
  file's text. A log line is a `Record`, built in the JavaScript's order. `JSON.parse` keeps the last of a repeated
  key, as `serde_json` does.
- **Truthiness and missing fields.** `x || d`, `x ? a : b`, `&&` follow `js::truthy` (0, `""`, `null` false; `[]`, `{}`
  true). `Value::get` gives `None` on a non-object, as a property read of a number or string gives `undefined`; a read
  of `null` throws in JavaScript: end with `Outcome::Fail` there (kit-tier-hook does for a `null` input).
  `obj[name]` also finds `constructor` on any object: the tier hook's JavaScript throws on the kind `constructor`
  and the start passes unchecked. That is a fault, and the port does not copy it: it looks a kind up among the
  file's own keys (`Map::get`) and refuses such a kind as unknown. Do the same where a name from the input picks a
  property, and report it as a departure.
- **Thrown errors.** An uncaught exception ends a Node hook with exit 1 and a stack on stderr; the port returns
  `Outcome::Fail` with a one-line reason. A hook that catches (`try {} catch {}`) passes in both.
- **Path separators.** Node's `resolve`/`join` give `\` on Windows; texts the hooks print use `.replace(/\\/g, '/')`:
  `paths::slashes`. `paths::resolve` is lexical like Node's (Rust's `canonicalize` is not: it reads the disk and on
  Windows returns `\\?\C:\...`; `real_of` strips that prefix as `realpathSync.native` does). Compare paths with
  `paths::key`, lower case off Linux.
- **The clone.** A JavaScript hook finds the clone from its own file (Node gives the real path of the main module);
  a program takes `--clone=` as given, resolved but not made real.
- **Sort order.** JavaScript's default `sort()` compares UTF-16 units; Rust's `str` order is by code point (they
  differ above U+FFFF against U+E000 to U+FFFF): `sort_by(|a, b| js::cmp_utf16(a, b))`. `localeCompare` is not this.
- **A missing file.** `readFileSync` in a `try` gives the JavaScript's fallback (`''`, `null`, a refusal); keep the
  same fallback per call site. `transcript::lines` already gives one empty line for a missing file, as
  `''.split('\n')` does. `readdirSync` lists folders too, as `read_dir` does. Invalid UTF-8 becomes U+FFFD in both.
- **Input that `serde_json` refuses and `JSON.parse` accepts.** A lone surrogate escape is mended to U+FFFD and
  parsed again. Nesting deeper than 128 and numbers beyond the double range (`1e400`) still make the input unreadable
  where JavaScript reads it.
