# Builder P: report (stopped by the migration gate, not done)

State: the code is written; it has not passed its proof. After the second clippy run the hook
`.claude/hooks/migration-gate.mjs` (FM-06) refused any more cargo calls: "the last cargo runs left 0, 3, 3 errors".
It seems to count `cargo fmt` as a run and each error line as an error. I did not get round it.

## What is written
- `harness-kit/rust/crates/kit-queue/src/`: `lib.rs`, `queue.rs` (the lane: slots, stale holds, capacity, log
  with fsync, timeout that ends the process tree), `kit.rs` (kitlib: config, git, test list, shards, members, pool,
  notice), `json.rs` (key order as JSON.stringify writes it, indented with 1 space), `sys.rs` (alive, kill_tree,
  priority, a watcher off Windows), `main.rs` (the program with lane.mjs's options and exit codes).
- `kit-check/src/main.rs` and `kit-unit/src/main.rs`: ports of check.mjs and unit.mjs (verbs, options, printed lines,
  exit codes, `.harness/` files).
- `harness-kit/parallel/parallel.test.mjs` runs `kit-unit` and `kit-check` from `KIT_HOOK_BIN_DIR`, or from
  `harness-kit/rust/target/release` when that is not set.
- Not yet deleted: `unit.mjs`, `check.mjs`, `kitlib.mjs` (they go only after the 6 cases pass).

## Where the build stood
Last clippy run: 1 error (a redundant clone in kit-unit `lock`) and 9 warnings (doc-list indents, a byte string).
All three are fixed in the source and have not been compiled since. Cargo tests, the release build and the 6
cases have not run.

## Changes from the JavaScript
- The default queue folder is `<project>/.harness/lane`, not research-tree/lane, and it has at most the processor
  count of slots. Messages start with `kit-queue:`.
- Off Windows, `nice -n 10` sets the priority. If the queue is killed by a signal, a small `sh` watcher ends the
  command's process group. Without libc, signals cannot be passed on.
- An exit code outside 0 to 255 becomes 1.
- New merges carry `Land-Kit: kit-unit`. The re-check also accepts `unit.mjs`.
- The notice and the hints name `kit-unit` and `kit-check`.

## To finish (a fresh helper, or after the gate is reset)
The three crates (`-p kit-queue -p kit-check -p kit-unit`), in one call: clippy `--all-targets`, test, release build.
Then `KIT_HOOK_BIN_DIR=$CARGO_TARGET_DIR/release node --test harness-kit/parallel/parallel.test.mjs`. Once the 6
cases pass, delete `harness-kit/parallel/{unit,check,kitlib}.mjs`.

## Finished by the second builder P (2026-11-26)
- One cargo call for the three crates (`CARGO_TARGET_DIR=%TEMP%/kit-P-target`, `--offline --locked -j 6`): clippy
  `--all-targets -- -D warnings` clean (0 errors, 0 warnings), tests pass (kit-queue 12, one more in another target,
  none failing), release build done. No source change was needed: the first builder's fixes held.
- `KIT_HOOK_BIN_DIR=%TEMP%/kit-P-target/release node --test harness-kit/parallel/parallel.test.mjs`: 6 of 6 pass
  (P1 to P6, 43 s).
- Deleted `harness-kit/parallel/unit.mjs`, `check.mjs`, `kitlib.mjs` (no other .mjs in harness-kit named them).
- Not done here: no commit; COVERAGE.md and the README are not this builder's files.
