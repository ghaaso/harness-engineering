# Builder S: the set-up in Rust (report)

Done as the brief says. Nothing committed.

- `harness-kit/rust/crates/kit-setup`: `main.rs` (arguments, dry run, `--apply`, `--status`, `--remove`), `wiring.rs` (the six hooks, the mark, `hook_of`, strip and add), `own.rs` (FixFlow switches and the three new settings, one record), `build.rs` (cargo, the lock's crates, built and fresh), `json.rs` (her file's key order kept: the lock has no ordered map), `tests.rs`.
- Checks: clippy clean (`--all-targets`, the workspace lints, no `#[allow]`); `cargo test -p kit-setup`: 22 tests pass, holding the 58 cases of `setup.test.mjs` with the same expectations, plus 7 tests for the new settings, the commands it names and the JSON writer; release build fine; a dry run on this repository (`--clone=`), no `--apply`.
- New settings, each only where the local settings file has no value of its own, recorded in `env.HARNESS_KIT_OFF` (new fields `env`, `modelSettings`, `settings`). `--remove` takes each out only while it still holds the kit's value: `env.CLAUDE_CODE_FORK_SUBAGENT "0"`; `modelSettings["claude-opus-5-5"] = {"autoCompactWindow":400000}` (the entry this PC's user file holds; that file was only read); `skillListingMaxDescChars 1` in the clone only.
- Wrappers: `harness-kit/setup.sh` and `harness-kit/setup.cmd` (CRLF). Both set `CARGO_TARGET_DIR=<kit>/rust/target`, add `--offline` and `RUSTUP_AUTO_INSTALL=0` unless `--fetch` is given, and give a hint on cargo's exit 101. Both tried in a temp copy.
- Deleted: `harness-kit/setup.mjs`, `harness-kit/setup.test.mjs`.
- `harness-kit/check-clone.mjs`: it keeps its own copy of the hook list, `isOurs` and `hookOf`. It runs the set-up through the wrapper and adds a row for the three settings. It runs `cargo test -p kit-setup`, and `parallel.test.mjs` against the programs, naming any program still a placeholder. The start-hook and token test files now run against their programs only. The timing step, which compared the JavaScript hooks with the programs, is removed. It has not been run in full, because it builds the whole workspace while the other builders are still working.

Changes from the old behaviour:
1. The workspace build adds `--workspace --exclude kit-setup`, so the running set-up program is never relinked; on Windows a running program's file is locked.
2. One expectation is adjusted. In another project the settings now always hold `env`, for the fork setting and the record. The case "no FixFlow switch in another project" now checks that the record lists no skills and no agents.
3. The Node-version check is gone.
4. Open for the owner: `setup.sh` has no executable bit in git. Setting it needs `git add --chmod=+x`, which stages the file, so I left it. Until then she runs it as `sh harness-kit/setup.sh`.
