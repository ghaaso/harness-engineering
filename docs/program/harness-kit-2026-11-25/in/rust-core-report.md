# Rust core report (builder of briefs/RUST-CORE.md, 2026-11-25)

Status: done. Nothing committed.

## Files

- `harness-kit/rust/Cargo.toml` (workspace, members `crates/*`, edition 2024, rust-version 1.100; the lint table and
  release profile are copied whole from `in/rust-skills/workspace-Cargo.toml`), `rust-toolchain.toml` (the copy
  beside it), `Cargo.lock` (made offline), `.gitignore` (`target/`), `DESIGN.md` (the page for the four builders).
- `crates/kit-core` (library: `context`, `input`, `outcome`, `log`, `transcript`, `tokens`, `paths`, `js`).
- `crates/kit-tier-hook` (port of `.claude/hooks/tier-hook.mjs`) and `crates/kit-start` (port of
  `harness-kit/hooks/kit-start.mjs`).
- `.claude/hooks/hook-under-test.mjs` (new): `runHook(hookFile, args, opts)`, `hookCommand`, `programOf`, `RUST`.
- `.claude/hooks/tier-hook.test.mjs` and `harness-kit/hooks/kit-start.test.mjs`: they now spawn through `runHook`.
  Both were written in the scratchpad, tested there both ways, then put in place by one rename each. No hook `.mjs`
  was changed.

## kit-core

One line per function is in `harness-kit/rust/DESIGN.md`, section "kit-core". In short:
- `Context::from_env()`: arguments, clone (`--clone=` or the nearest folder above the program that holds
  `.claude/hooks/tier-routes.json`), and `Kit` (project, state, briefs, logs, usage_tool) as `kit-mode.mjs` works them out.
- `input::read_stdin/parse/parse_text`.
- `Outcome::{Pass, Say, Refuse, Context, Fail}.finish()`.
- `log::Record` (keys in insertion order) and `log::append`.
- `transcript::lines/json_lines` (streamed).
- `tokens::of_line/of_file/Ledger`.
- `paths::resolve/real_of/key/under/slashes`.
- `js::` length in UTF-16 units, JSON quoting (lone surrogates included), trim, truthiness, `String(x)`, number
  formatting, `toFixed`, `Math.round`, `Date.parse`, `toISOString`, sort order, and `Object.keys` order.

## Tests

| test file | JavaScript hook | Rust program (`KIT_HOOK_BIN_DIR`) |
|---|---|---|
| `tier-hook.test.mjs` | 24 passed of 24 | 23 passed, 1 skipped, of 24 |
| `kit-start.test.mjs` | 10 passed of 10 | 10 passed of 10 |

The skipped case is "kit-mode.mjs missing: the log stays beside the hook". It cannot apply to a program, because
kit mode is built into the program and there is no module that can be missing. The case is not changed: under
`RUST` it prints `skip` with that reason. Its behaviour (the log goes under the project in kit mode and beside the
hooks without it) is covered by the Rust test `kit_mode_logs_under_the_project_and_plain_mode_beside_the_hooks`.

Cargo tests: kit-core 44 plus 2 doc tests, kit-tier-hook 7, kit-start 4. All pass (`--offline --locked`).

One extra check, a differential run in the scratchpad: 63 inputs went through each JavaScript hook and its program
in temporary clones, and the exit code, stdout, stderr and log line (with `t` taken out) were compared. 62 matched.
The 63rd differed only in a temporary folder name that my script had not masked. The inputs covered both modes,
`null`, empty and broken input, the kind `constructor`, labels and session ids cut inside an emoji, an agent id that
is a number or an array, offer and proposal cards, sessions with no folder, ssh sessions and blank folders, the
routes file missing or odd, and kit-start with RULES.md cut inside a surrogate pair, with CRLF and U+FEFF, with
state-file names that test sort order, and with `null` or odd `source` values.

## Clippy

`cargo clippy --offline --all-targets -- -D warnings` is clean under the workspace's lint table. `cargo fmt --check`
is clean. There is no `allow`, `expect`, `unsafe`, `todo` or `unwrap`.

## Timing (one passing Agent call, after one warm-up run, 20 runs each, this PC)

- JavaScript tier hook: median 36.9 ms (34.5 to 42.1)
- Rust `kit-tier-hook.exe` (release): median 6.1 ms (5.7 to 7.1)

## Not tested

- macOS and Linux: only Windows was run. The paths code is not specific to Windows; `key` lower-cases paths except
  on Linux, as the JavaScript does.
- A live Claude Code session wired to the programs.
- The wired command without `--clone=` (it finds the clone above the program): only the logic was written, no run.
- Input deeper than 128 levels, and numbers beyond the double range. `serde_json` refuses these, so the program
  passes them as unreadable where JavaScript reads them. This is listed in DESIGN.md.
- A date-time with no offset: `js::date_parse` reads it as UTC, where JavaScript reads it as local time. Neither
  hook of this unit uses dates.

## Section 7: what I could not keep, or did differently, and why

- **`regex`** is a dependency of `kit-core`, which re-exports it (`kit_core::regex`). It is in the lock that way.
- **Wired check.** In kit-tier-hook, a child session's folder counts as wired when its settings name
  `tier-hook.mjs` or `kit-tier-hook`. The kit wires the program, and that command does not contain `tier-hook.mjs`.
  Without this change, every child session in a folder set up by the kit would be refused. The JavaScript hook only
  looks for `tier-hook.mjs`.
- **Clone path.** The clone is `--clone=` as given (resolved, not made real). The JavaScript gets the real path of
  its own folder. The two differ only where the clone is reached through a link.

## A fault in the JavaScript reference, fixed in the port only (a departure from "same behaviour")

With the description `constructor: x`, `kinds["constructor"]` finds Object's constructor. `tier-hook.mjs` then
throws and exits 1, which is a non-blocking error, so the start goes through unchecked. On the coordinator's
instruction, the Rust tier hook looks a kind up only among the routes file's own kinds, so such a start is refused
as an unknown kind (exit 2). That keeps the rule the hook exists for. `tier-hook.mjs` and its test file are
unchanged; the fault stays there and is listed for the owner (the fix there would be `Object.hasOwn(kinds, kind)`).
Rust tests: `constructor`, `toString`, `hasOwnProperty` and `valueOf` are refused as unknown kinds; `__proto__` is
refused as having no kind.

## Additions after the first hand-back (coordinator)

- **The lock is final.** `kit-window-ceiling`, `kit-creep-gate`, `kit-count-gate`, `kit-fanout-gate` and `kit-tokens`
  exist as members with their final manifests (`kit-core` and `serde_json`). Each `main` only ends with exit 1 and
  "not ported yet" on stderr; this was checked on kit-tokens. `cargo check --offline --workspace` and
  `cargo clippy --offline --workspace --all-targets -- -D warnings` are clean. Tests and the release build ran
  with `--locked`. DESIGN.md tells each builder to replace its `main` only and to report any change cargo asks for
  in the lock.
- **Build folder.** Mine is now `%TEMP%/kit-core-target`. The old `C:/rust-work/kit-core-target` held only build
  output and is removed. DESIGN.md gives each builder `<temp>/kit-<hook>-target`.
  Both test files ran again against the new build: tier-hook 23 passed and 1 skipped of 24, kit-start 10 of 10.
