# Brief: repair the two breaking faults the review showed, and nothing else (one Opus builder)

The owner's words are in `../OWNER-WORDS.md`; his last message there sets the standard: actual breaking faults are
fixed, nothing that does not matter is touched. They outrank this brief.

token limit 3.8 M (expected about 3 M, basis r58-0104)

Deliverable: harness-kit/COVERAGE.md

The review's findings are in `../in/breaking-faults.md`, sections F1 and F2, each with the input that shows it, the
files and the lines. Read those two sections first. Its section 4 (not breaking) is not yours: change nothing for it.

## F1. The window ceiling holds no Opus session on a machine without the owner's settings

The hook takes a model's window from `modelSettings.<model>.autoCompactWindow` in the settings, else from a table
that holds Fable and Sonnet only. On her machine an Opus session or helper therefore gets no line at all.

Fix, in both forms: Opus gets a window of 400 K in that fallback table (`.claude/hooks/window-ceiling.mjs` near
line 94; `harness-kit/rust/crates/kit-window-ceiling/src/limits.rs` near line 24). 400 K is the window this project
ran Opus at when the lines were measured (the owner's own setting, record r57-0107). A window given in the
settings still wins, so on this PC nothing changes. One new case in `.claude/hooks/window-ceiling.test.mjs`, passing
both ways: an Opus transcript past its line, with settings that give no window, is refused. In
`harness-kit/README.md`, where the window ceiling is described, two plain lines: without an Opus window in her
settings the hook takes 400 K, the figure this project measured under; if her Opus sessions compact before about
330 K the line is never reached, and the setting that gives her the same window is the one named there (write the
exact key as the hook reads it).

## F2. Under a cap, a helper killed by an app restart blocks every later start, and nothing tells her the way out

The fan-out gate keeps the unused limit of a helper that never got marked finished reserved until it is ended by
hand; that is its design and stays. The fault is that in kit mode nothing names the command.

Fix, in kit mode only (the text without `--harness-kit` stays as it is, word for word):
- the fan-out gate's refusal at the cap, and the count gate's text that names `--end`, give the kit form of the
  command with this machine's own paths filled in: the count-gate program, `--end <helper id> <why>` first, then
  the kit arguments (`--harness-kit`, `--clone=`, `--project=`), and one way to see what is counted (`--status`);
  in the JavaScript hooks' kit mode the same text, so the two forms still match;
- `harness-kit/README.md` (where the limits and the cap are described) and `harness-kit/RULES.md` rule K3 name it in
  one line each. `RULES.md` stays under 6,000 characters.
One new case in `.claude/hooks/fanout-gate.test.mjs` and one in `count-gate.test.mjs`, passing both ways: the kit-mode
text names the command. If an existing case holds the old kit-mode text, change that expectation and say so.

## Rules

- Your files: the three JavaScript hooks named above and their three test files; the crates `kit-window-ceiling`,
  `kit-fanout-gate`, `kit-count-gate`; `harness-kit/README.md`; `harness-kit/RULES.md`. Nothing else: not `kit-core`,
  not the lock file, not the set-up, not `COVERAGE.md` (its rows become true by your fix).
- `.claude/hooks/` is live for every session on this PC: change a hook or a test file on a copy, test the copy, put
  it in place in one step. Without `--harness-kit`, and with this PC's settings, every hook behaves as before.
- Cargo: `--offline --locked -j 6`, `CARGO_TARGET_DIR` in a folder of your own under the temp folder, and as few
  calls as you can: a hook here refuses a helper's further cargo calls after three in a row whose error counts did
  not go down with the last above zero. Read what you wrote before you compile; chain clippy, tests and the release
  build of the three crates in one shell call.
- Proof of done: the three test files pass both ways (against the JavaScript, and with `KIT_HOOK_BIN_DIR` against
  your build) with their old cases unchanged except as said above; clippy clean. Stop there: no further comparison
  runs, no other improvement.
- No commit, no push. Shell calls under 150 s.

## Hand-back

`docs/program/harness-kit-2026-11-25/in/repair-report.md`: each change with its file and line; the test counts both
ways; any expectation you changed. Return under 500 tokens.
