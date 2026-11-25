# Brief: port one hook to Rust, to the same test cases (four Opus builders, one hook each)

The owner's words are in `../OWNER-WORDS.md`. Read them first, the last two messages above all. They outrank this brief.

token limit 9 M (expected about 5 M, basis r57-0191)

Deliverable: harness-kit/rust/Cargo.toml

## Why

The owner wants the kit's hooks in Rust, not JavaScript, with no JavaScript hook behind them. The workspace, the
shared library and the two small hooks exist. You port one of the four large hooks. Your prompt names it.

| builder | from | program (crate) | its test file |
|---|---|---|---|
| A | `.claude/hooks/window-ceiling.mjs` | `harness-kit/rust/crates/kit-window-ceiling` | `.claude/hooks/window-ceiling.test.mjs` |
| B | `.claude/hooks/creep-gate.mjs` | `harness-kit/rust/crates/kit-creep-gate` | `.claude/hooks/creep-gate.test.mjs` |
| C | `.claude/hooks/count-gate.mjs` | `harness-kit/rust/crates/kit-count-gate` | `.claude/hooks/count-gate.test.mjs` |
| D | `.claude/hooks/fanout-gate.mjs`, then `harness-kit/tokens.mjs` | `harness-kit/rust/crates/kit-fanout-gate`, `harness-kit/rust/crates/kit-tokens` | `.claude/hooks/fanout-gate.test.mjs`, the test file of `tokens.mjs` |

## Read, in this order

`../CONTRACT.md` section 7 (what you build to; its rules bind you) and section 6; `harness-kit/rust/DESIGN.md` (how
a hook program is laid out, what the shared library gives, the JavaScript behaviours that are easy to get wrong);
`../in/rust-core-report.md`; the two Rust skills section 7 names; then your hook's JavaScript, every line, header
comment included, and its test file.

## What done is

- Your program does what the JavaScript does in both modes (with and without `--harness-kit`): the same
  arguments (the extra modes too, such as `--status`, `--end`, `--replay` where your hook has them), input,
  environment variables, printed text, exit codes, log lines, and the same way of failing on its own error.
- Your hook's test file uses the test switch (`.claude/hooks/hook-under-test.mjs`) and passes both ways with the
  same case counts: against `node <hook>.mjs` as before, and with `KIT_HOOK_BIN_DIR` against your program.
  Where the test file calls the JavaScript by another route than a command (an import), keep that case for the
  JavaScript, give the behaviour a Rust test in your crate, and list it.
- `cargo clippy --offline` clean under the workspace's lints, `cargo fmt` run, one release build at the end.
- It never panics on real data: run it once over this session's own transcript folder as its JavaScript one would
  be called, and say what it printed.

## Rules

- Your files: your crate folder(s) and your hook's test file(s). Not `kit-core`, not another crate, not a hook's
  `.mjs`, not the workspace file except to let `crates/*` pick your crate up (it does already). What you miss in
  `kit-core` goes into your own crate and into your report.
- `.claude/hooks/` is live for every session on this PC: write a changed test file elsewhere first and put it in
  place in one step when it passes.
- Three other builders build in this workspace at the same time: set `CARGO_TARGET_DIR` to a folder of your own
  outside the repository, pass `-j 6`, and build only your own crate (`-p <crate>`). Every cargo call carries
  `--offline`. If `Cargo.lock` must change for your crate, say so in the report and change nothing else in it.
- If the same case still fails after three different fixes, stop and report it with the failing input.
- No commit, no push, no branch. No install, no download. Shell calls under 150 s.

## Hand-back

`docs/program/harness-kit-2026-11-25/in/rust-<your letter>-report.md`: the files; test counts both ways; cases kept
for the JavaScript only and the Rust test that stands for each; clippy's result; what the run over a real
transcript printed; what is not the same as the JavaScript, if anything, with the reason. Return under 1,000 tokens.
