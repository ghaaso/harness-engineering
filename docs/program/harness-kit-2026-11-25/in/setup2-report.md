# Set-up unit, round 2 (Rust hooks): hand-back

Status: done. setup.test: 58 of 58 pass. The clean-clone check exits 1 on five lines; none of them is in my files (below).
Files: `harness-kit/setup.mjs`, `harness-kit/setup.test.mjs`, `harness-kit/check-clone.mjs`. Nothing committed.

## setup.mjs: flags and what each prints

- no flag (dry run): clone, project, settings file (new or merged), the six commands it would write each with
  "program: built / not built / older than its sources", FixFlow counts (clone only), the `.harness/` files it would
  make, cargo's version or why cargo is missing, the build command, the ignore lines git lacks, ".harness/ is yours to
  commit or not". Changes nothing, builds nothing.
- `--apply [--fetch]`: the same, then `cargo build --release --locked --offline` in `harness-kit/rust` with
  `CARGO_TARGET_DIR=<clone>/harness-kit/rust/target` and `RUSTUP_AUTO_INSTALL=0` (no toolchain download either).
  No cargo: stops, names rustup and the pinned 1.100.0, changes nothing. Pinned toolchain missing: names
  `rustup toolchain install 1.100.0 ...`. Offline miss: prints the registry crates `Cargo.lock` names, that they come
  from crates.io, and `--fetch`; changes nothing. `--fetch`: says what may be downloaded, builds without `--offline`.
  A program not there after the build: refused, named, nothing written. Then writes the settings file and makes
  `.harness/` (prints `made: <path>` for each), never overwriting.
- `--status [--project]`: for each of the six hooks wired or NOT WIRED, event and matcher, program file there or
  MISSING, built and newer than its sources or OLDER; `.harness/` files there or MISSING; FixFlow switches. Exit 0 only
  when all hold.
- `--remove [--project]`: takes out the marked entries and the recorded FixFlow switches, says `.harness/` is left.
- `--project <folder>` / `--project=<folder>`: must be a folder; refused if its path (or the clone's) holds `" $ \` \\`
  or a line break. `--no-usage-tool`: added to the fan-out gate's command only.

Wired command: `"<clone>/harness-kit/rust/target/release/kit-<hook>[.exe]" --harness-kit "--clone=<clone>" "--project=<project>"`
in the order of the hooks report: SessionStart kit-start (no matcher); PreToolUse `*` window-ceiling, `*` tier-hook,
`Agent|Task|SendMessage` count-gate, `Agent|Task` fanout-gate, `Agent|Task` creep-gate. `isOurs` finds the mark as a word
anywhere in a command (an old `node ".../x.mjs" --harness-kit "--project=..."` entry is replaced).

## Files the set-up makes

`<project>/.claude/settings.local.json` (nothing else under `.claude`); `<project>/.harness/kit.json` (copy of
`harness-kit/parallel/kit.example.json`), `.harness/WIDTHS.md` (both forms explained, indented, nothing declared),
`.harness/briefs/`; `harness-kit/rust/target/` in the clone (the build). Ignore lines printed: `.claude/settings.local.json`,
`.claude/logs/`, `.harness/lane/`, `.harness/lane-measure/`.

## Tests

`node harness-kit/setup.test.mjs`: 58 passed, 0 failed. These are the 22 earlier cases, changed only where the wiring
changed (six program commands now, where there were three `node` commands), plus 36 new ones: the mark anywhere in a
command, `hookOf`, an old JavaScript entry being replaced, `--project` (both forms, only `settings.local.json` under its
`.claude`, `--clone=` and `--project=` in every command, no FixFlow, a `$` path refused, a path that is not a folder
refused, `--remove` leaving `.harness/`), `--no-usage-tool` reaching the fan-out gate only, `.harness/` (a copy of the
example, WIDTHS.md with no declaration, briefs/, "made:" lines, nothing overwritten), the ignore lines, the build (the
offline arguments, the target folder, rustup's auto-install off, no build in a dry run, `--fetch`), no cargo, a missing
toolchain, a missing crate, a failed build, a program left unbuilt, and `--status` (nothing wired, all fine, a stale
program, a stale kit-core, a missing program, no change). A stand-in for cargo (`HARNESS_KIT_CARGO`, for tests only)
plays the part of cargo, so these tests build nothing and download nothing.

## The check's last run (`node harness-kit/check-clone.mjs`, 187 s, exit 1)

The clone is `origin/main` afc33539 with 107 kit files from the working tree copied in. Everything below passed:
- both applies (clone; an empty git repo with `--no-usage-tool`), `--status` exit 0 for each, `.harness/` made in
  both, 13 skills and 12 agents switched off in the clone and none in the empty repo;
- the offline build inside the apply: 24 s;
- test files, JavaScript | program: window-ceiling 134 | 134; tier-hook 24 | 23 with 1 skipped; creep-gate 42 | 42;
  count-gate 27 with 2 skipped | 27 with 2 skipped; fanout-gate 48 | 48; kit-start 10 | 10. JavaScript only:
  setup 58, parallel 6, land 7;
- every wired pass and refuse call of window-ceiling, tier-hook (including the two child-session cases), count-gate,
  fanout-gate and creep-gate, in both projects;
- COVERAGE.md: 280 rows, every mark valid, every `hook` row names a wired hook, every `command` row names a file that
  exists;
- `--remove` in both projects: nothing of the kit left, and `.harness/` kept.

Time of one passing call, median of 20, JavaScript hook against its program: kit-start 42.5 against 6.7 ms;
window-ceiling 42.4 against 7.5; tier-hook 40.0 against 5.9; count-gate 41.3 against 13.9; fanout-gate 39.0 against
8.5; creep-gate 42.6 against 12.7.

The lines that fail, and why:
- `harness-kit/tokens.test.mjs` run against the program: 1 passed, 4 failed. `kit-tokens` is still the placeholder.
- kit-start passes and refuse, clone and empty repo: it exits 0 and prints the clone's path, but there are no rules
  in its output because `harness-kit/RULES.md` is missing. The writer is not done.
- `RULES.md` exists: no. The writer is not done.
- COVERAGE.md: 94 rows still say `missing`. The writer is not done.

On the first run (79 s in) three test files did not yet use `hook-under-test.mjs`, and `kit-window-ceiling` was a
placeholder. The check named each of those lines, and by the second run the builders had finished them.

## Not tested

- macOS and Linux: only Windows was run here. The code has no Windows-only paths: `.exe` is added on win32 only, the
  check uses `/bin/sh` off Windows, and Git Bash on Windows when it is installed where Git puts it.
- `--fetch` against the real crates.io: it was run only with the stand-in, because downloading is not allowed here.
- A live Claude Code session started on the settings the set-up writes.
- rustup's `RUSTUP_AUTO_INSTALL=0` with the pinned toolchain missing: that toolchain is installed on this PC, so the
  case ran only with the stand-in.

## Faults found in other units' files, and departures

- None in the hooks. The check showed three test files not yet switched and the two placeholders while their builders
  were still working.
- Timing: the count gate counts a start admitted a few seconds earlier as running. Twenty calls in one session are
  therefore refused from the second on, by the JavaScript hook and the program alike. The check gives each timed call a
  session of its own.
- The brief says to clone `origin/main`. The check instead fetches that ref with `--depth 1` into a fresh `git init`
  in temp, because a local clone does not carry remote-tracking refs. It commits the overlay there under a throwaway
  identity.
- The first build has a 900 s timeout, longer than the 150 s for every other call. It took 24 s.

Done.
