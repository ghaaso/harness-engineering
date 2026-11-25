# Brief: everything she runs is Rust, the JavaScript duplicates go, the small fixes are made (four Opus builders at once)

The owner's words are in `../OWNER-WORDS.md`. Read his last message there first: it is why this round exists and
it outranks this brief. In short: the kit is for her; she follows the README, runs one thing, and it works without
hassle; nothing in it may depend on this PC; what this PC's settings give as an advantage goes into the kit; the
JavaScript that was built for the kit and then replaced by Rust is a duplicate and is removed; and this must not
take long.

Deliverable: harness-kit/COVERAGE.md

## What is fixed for all four (do not re-decide it)

- After this round a second person needs **Rust and git only** to set the kit up and use it. No Node.
- Programs, all in the workspace `harness-kit/rust/` (crates exist as placeholders, the lock file is final: every
  cargo call carries `--offline --locked`, `-p <your crate>`, `-j 6`, and `CARGO_TARGET_DIR` in a folder of your own
  under the temp folder; if cargo wants a lock change, stop and report it):
  `kit-setup` (the set-up), `kit-queue` (the queue for heavy commands, a library and a program), `kit-check` (her
  test files side by side), `kit-unit` (units in their own copies and their landing), beside the seven that exist
  (`kit-start`, `kit-window-ceiling`, `kit-tier-hook`, `kit-count-gate`, `kit-fanout-gate`, `kit-creep-gate`,
  `kit-tokens`).
- How she starts it: `harness-kit/setup.sh --apply` (macOS, Linux) or `harness-kit\setup.cmd --apply` (Windows), two
  small wrappers that run `cargo run --release --locked --manifest-path <kit>/rust/Cargo.toml -p kit-setup -- <her arguments>`.
  The other programs are called by their built path under `harness-kit/rust/target/release/`.
- The JavaScript hooks in `.claude/hooks/` are not part of the kit. They go back to what `origin/main` holds.
  The test files stay JavaScript and drive the programs: they are tools for whoever changes the kit, as is
  `harness-kit/check-clone.mjs`. Using the kit needs none of them.
- Read `harness-kit/rust/DESIGN.md` and the two Rust skills first if you write Rust (under `../in/rust-skills/`: `rust-best-practices/SKILL.md` and `ms-rust-guidelines/all-excerpt.txt`). No `unsafe`, no `#[allow]`, no stubs;
  clippy clean under the workspace lints.
- A hook on this PC refuses a helper's further cargo calls after three in a row whose error counts did not go down
  with the last above zero (two clean calls then one with errors count as that). Chain clippy, tests and the release
  build in one shell call; fix every error before the next call; read your code before you compile it.
- **Done is when the named test passes. Stop there.** No extra comparison runs, no improvement nobody asked for.
- `.claude/hooks/` is live for every session on this PC: change a file there on a copy, test the copy, put it in
  place in one step. Another session works in this folder: touch only your files. No commit, no push.
  Shell calls under 150 s. Hand-back under 600 tokens, and in `../in/<your letter>-rust-only-report.md`.

## Builder S: the set-up in Rust

From `harness-kit/setup.mjs` (30 KB) to the crate `kit-setup`: every flag and every printed line as now (`--apply`,
`--remove`, `--status`, `--project`, `--no-usage-tool`, `--fetch`), the same wiring, the same `.harness/` files, the
FixFlow switches for the clone. New, and written the same careful way as the FixFlow switches (only where she has
no value of her own, recorded so that `--remove` takes out exactly what was added):
- `env.CLAUDE_CODE_FORK_SUBAGENT = "0"`: a helper's own helpers can then run in the background (record r57-0157);
- the Opus window this project's window-ceiling lines were measured under (record r57-0107): the entry
  `modelSettings` holds in this PC's user settings file (`~/.claude/settings.json`, read it, change nothing there);
- only when the project is the clone: `skillListingMaxDescChars = 1` (as this repository's own settings have it).
It wires the programs by their built paths as now, and names `kit-unit`, `kit-check`, `kit-queue`, `kit-tokens` in
what it prints. Write the two wrappers. Port the 58 cases of `harness-kit/setup.test.mjs` to tests in the crate,
same cases and expectations, plus cases for the three new settings; then delete `setup.mjs` and `setup.test.mjs`.
Change `harness-kit/check-clone.mjs` so it drives `kit-setup` and the programs (it stays JavaScript); where another
builder's part is not finished it names the failing line, as before. Your files: the crate `kit-setup`, the two
wrappers, `setup.mjs`, `setup.test.mjs`, `check-clone.mjs`.

## Builder P: the parallel commands and the queue in Rust

From `research-tree/tools/lane.mjs` (9 KB, as it is now, with its options) to `kit-queue`; from
`harness-kit/parallel/check.mjs`, `unit.mjs`, `kitlib.mjs` (44 KB) to `kit-check` and `kit-unit`. The same verbs,
options, printed lines, exit codes, files under `.harness/` and config keys. Do the queue first. Off Windows a
timed-out command's whole process group is stopped; on Windows its process tree, as the JavaScript does. Proof:
`harness-kit/parallel/parallel.test.mjs` drives the built programs (with `KIT_HOOK_BIN_DIR` naming their folder)
and its 6 cases pass. Then delete `unit.mjs`, `check.mjs`, `kitlib.mjs`. Leave `research-tree/tools/lane.mjs` and the
two example config files as they are. Your files: the crates `kit-queue`, `kit-check`, `kit-unit`, the three
JavaScript files, `parallel.test.mjs`.

## Builder C: the JavaScript duplicates go

- `.claude/hooks/window-ceiling.mjs`, `creep-gate.mjs`, `count-gate.mjs`, `fanout-gate.mjs`: back to the content
  `origin/main` holds (`git show origin/main:<path>`), byte for byte. Delete `.claude/hooks/kit-mode.mjs`,
  `harness-kit/hooks/kit-start.mjs`, `harness-kit/tokens.mjs`.
- Their test files (`window-ceiling`, `creep-gate`, `count-gate`, `fanout-gate` `.test.mjs`,
  `harness-kit/hooks/kit-start.test.mjs`, `harness-kit/tokens.test.mjs`) keep every case. A case that needs kit mode,
  or a fix made only for the kit, runs against the program and is skipped with one line of reason when the test
  file runs against the JavaScript; the two files of the start hook and the token counter run against the programs
  only. Proof: against the programs every case passes with the counts of today (135, 42, 28 with 2 skipped, 49,
  10, 8); against the JavaScript the cases that are left pass.
- Do not touch `tier-hook.mjs` or its test file (builder T has them). Your files: the ones named here and
  `.claude/hooks/hook-under-test.mjs`.

## Builder T: the routing fix, the effort check as a trial, the documents

- `.claude/hooks/tier-hook.mjs`: back to `origin/main`'s content plus one fix: a kind is looked up only among the
  routes file's own kinds (`Object.hasOwn`), so a description starting `constructor:` is refused as an unknown
  kind instead of making the hook throw. `tier-hook.test.mjs`: that case, passing both ways; kit-mode cases run
  against the program only.
- The effort check, in `kit-tier-hook` only, as a trial: `.claude/hooks/tier-routes.json` gets, per kind, the
  efforts its route allows, from the design of record r57-0207 (Haiku: low, medium; Sonnet: medium, high; Opus:
  high, xhigh; Fable as Opus) and nothing invented beyond it. In kit mode a helper start that names no effort, or
  one its route does not allow, is refused with a line that says which efforts the route allows and that this
  check is on trial. Cargo tests and test-file cases for it (program only). Every pass and refusal is logged with
  the effort, so she can see in the tier hook's log whether it works.
- `kit-tokens`: its printed hints name the program, not `tokens.mjs`.
- The documents, by small edits, not rewrites: `harness-kit/README.md` (needs Rust and git only; the one wrapper
  command; each command by its program; the three settings the set-up adds and why; the effort check under "On
  trial"; no "Still JavaScript" list for what she runs, one line that the test files and the clean-clone check are
  tools for whoever changes the kit and need Node; nothing that speaks of this PC), `RULES.md` (commands by their
  programs; one line for the effort; under 6,000 characters), `COVERAGE.md` (the "by what" of rows that named a
  `.mjs` command now names the program; the rows on effort become `trial`; still 280 rows, no row without a mark),
  `ORCHESTRATION.md` where it names a command. Your files: `tier-hook.mjs`, `tier-hook.test.mjs`,
  `tier-routes.json`, the crates `kit-tier-hook` and `kit-tokens`, the four documents.
