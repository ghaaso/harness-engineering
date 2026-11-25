# Brief: the kit's Rust workspace, its core, and the two small hooks (one Opus builder, first Rust unit)

The owner's words are in `../OWNER-WORDS.md`. Read them first, the last two messages above all. They outrank this brief.

token limit 6 M (expected about 3 M, basis r57-0191)

Deliverable: harness-kit/rust/Cargo.toml

## Why

The owner wants the kit's hooks in Rust, not JavaScript, with no JavaScript hook behind them. Four builders will
port the four large hooks at once after you. You go first: you make the workspace they build in, the library they
all use, the way a test file runs against a Rust program, and you port the two small hooks so that the whole path
is proven once before four builders stand on it.

Read `../CONTRACT.md` in full: section 7 is what you build to and its rules bind you; sections 1, 2 and 6 as well.
Then `../in/hooks-report.md` (the JavaScript builder's hand-back: kit mode as built, each hook's arguments, the test
files), then the Rust skills section 7 names, then the JavaScript you port.

## What to build

1. **The workspace** `harness-kit/rust/` as section 7 describes. The lint table and the release profile: copy them
   whole from the workspace file the owner's other Rust work uses; the coordinator has put a copy of that file at
   `../in/rust-skills/workspace-Cargo.toml`. Members: `crates/*`.
2. **`crates/kit-core`**, a library with what every hook program needs, each piece matching what the JavaScript does:
   - arguments: kit mode, `--clone=`, `--project=`, `--no-usage-tool`, and the folders that follow from them, as
     `.claude/hooks/kit-mode.mjs` works them out (real paths, forward slashes, Windows drive letters compared
     without case as the JavaScript does);
   - the hook's input from standard input as JSON, tolerant of an empty or broken input exactly as the JavaScript is;
   - one way to end: pass (exit 0, optional text), refuse (exit 2, one line on standard error), print a
     SessionStart context object; no direct `process::exit`, no `println!` (the lint table denies both): `main`
     returns an exit code;
   - a log line appended to a `.jsonl` file under the right logs folder, never failing the hook;
   - reading a transcript file line by line as JSON, skipping broken lines, without loading a large file whole
     where the JavaScript does not;
   - counting tokens as the fan-out gate counts them (input + cache creation + cache read + output, once per
     message id): the other builders need the same counter.
   Keep its surface small and documented: four builders will read it, not you.
3. **`crates/kit-tier-hook`** from `.claude/hooks/tier-hook.mjs`, and **`crates/kit-start`** from
   `harness-kit/hooks/kit-start.mjs`.
4. **The test switch**: one helper module beside the hooks' tests (`.claude/hooks/hook-under-test.mjs`) that gives a
   test file the command to run for a hook: `node <hook>.mjs`, or with `KIT_HOOK_BIN_DIR` set the program
   `kit-<hook>` from that folder with `--clone=`. Use it in `tier-hook.test.mjs` and in the start hook's test file.
   Both files pass in both ways, with the same case counts.
5. **`harness-kit/rust/DESIGN.md`**, one page for the four builders: how a hook program is laid out, the functions
   of `kit-core` with one line each, how to run a test file against a program, the JavaScript behaviours that are
   easy to get wrong in Rust and how you handled each (string length in UTF-16 units against bytes, regular
   expression differences, number formatting, date parsing, path separators, sort order, a missing file).
6. **One timing**: the same passing call through the JavaScript tier hook and through the Rust one, 20 times each,
   the median of each in milliseconds, in your report.

## Rules

- Your files: `harness-kit/rust/**`, `.claude/hooks/hook-under-test.mjs`, `.claude/hooks/tier-hook.test.mjs`, the
  start hook's test file. `.claude/hooks/` is live for every session on this PC: a test file or helper there is
  written elsewhere first and put in place in one step when it passes. Do not change a hook's `.mjs`.
- Every cargo call carries `--offline`. Build with `CARGO_TARGET_DIR` set to a folder outside the repository.
- No commit, no push, no branch. No install, no download.

## Hand-back

`docs/program/harness-kit-2026-11-25/in/rust-core-report.md`: the files; `kit-core`'s functions; test counts both
ways for the two hooks; clippy's result; the timing; what is not tested; anything of section 7 you could not keep,
with the reason. Return under 1,200 tokens.
