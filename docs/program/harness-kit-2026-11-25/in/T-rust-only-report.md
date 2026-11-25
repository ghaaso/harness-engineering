# Builder T: routing fix, effort check (trial), token hints, documents (2026-11-26)

Done: the named test passes both ways.

- `node .claude/hooks/tier-hook.test.mjs`: 20 passed, 0 failed, 11 skipped (31). The 11 are the kit-mode and effort
  cases, program only.
- With `KIT_HOOK_BIN_DIR` pointing at the program: 30 passed, 0 failed, 1 skipped (31).
- `cargo clippy --all-targets -p kit-tier-hook -p kit-tokens`: clean. Cargo tests: 12 and 14 pass. Release built.
  Every call used `--offline --locked -j 6` with its own `CARGO_TARGET_DIR`. The lock was not changed by me; it showed
  as modified before I started.

## What changed

- `.claude/hooks/tier-hook.mjs`: now `origin/main`'s content with one fix, `Object.hasOwn(kinds, kind)`. A
  `constructor: x` start is now refused as an unknown kind; before, the hook threw. Kit mode is gone from the
  JavaScript.
- `.claude/hooks/tier-routes.json`: each kind now lists `efforts`, from r57-0207: haiku low or medium, sonnet medium or
  high, opus and fable high or xhigh. `test` (haiku or sonnet) gets both sets: low, medium, high. The date and source
  text are updated. The JavaScript hook ignores the new key. Each of the three files was tested on a copy and put in
  place in one step.
- `kit-tier-hook`:
  - The effort check runs in kit mode, on helper starts only. A start with no `effort`, or one its route does not
    list, is refused; the refusal names the allowed efforts and says the check is on trial.
  - Every helper decision in kit mode logs `effort` (null when none was named). Plain mode does not check or log it.
  - A route without `efforts` is not checked.
  - Departure: in kit mode the "folder without the kit's hooks" refusal now names `<clone>/harness-kit/setup.sh`
    (`setup.cmd` on Windows) instead of the deleted `setup.mjs`.
  - Five new Rust tests; one existing log test updated for the new effort field.
- `kit-tokens`: the two hints and the top doc line name `harness-kit/rust/target/release/kit-tokens`.
- `tier-hook.test.mjs`: new cases:
  - both ways: `constructor`, and effort not checked outside kit mode;
  - program only: five effort cases.
  - The six kit cases run on the program only (`kexpect`) and now pass an effort. The set-up regex accepts
    `setup.(sh|cmd)`.
- Documents (small edits):
  - `README.md`: needs Rust and git only; the wrapper commands; the three settings the set-up adds and why; every
    command by its program.
  - `README.md`, continued: the effort check moved under "On trial" (out of "Designed, not built"); the "Still
    JavaScript" list replaced by one line about Node for the test files and the clean-clone check; mentions of the
    owner's PC removed.
  - `RULES.md`: `<bin>` is defined, commands go by program, and K1 carries the effort line. Now 5,995 characters,
    after two small trims in K9 and K16.
  - `COVERAGE.md`: 280 rows, every row marked. Command rows name the program and its crate or wrapper. O72 and O74
    are now `trial`; S23, E6 and E18 note the trial. Counts: trial 17, design 50, result 53.
  - `ORCHESTRATION.md`: the `kit-tokens` command; the line "No hook checks effort" was corrected.

## Notes for the coordinator

- The COVERAGE command rows S14 and E89 rely on `harness-kit/setup.sh`, which builder S has not written yet.
- Rows S28 and E115 (`owner's own`) still speak of this owner's PC by design; I left them.
- Not checked: `check-clone.mjs` (builder S's file).
