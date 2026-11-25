# Brief: one set-up that wires everything, and a clean-clone check that covers it (one Opus builder)

The owner's words are in `../OWNER-WORDS.md`. Read them first. They outrank this brief.

token limit 8 M (expected about 4 M, basis r58-0105)

**Changed after this brief was first written (the owner, 2026-11-25): the kit wires Rust hooks only, with no
JavaScript hook behind them.** `../CONTRACT.md` section 7 says how; read it first, it outranks the points below
where they differ. In short, for you:
- the set-up needs `cargo` on the machine; without it, it stops and says what to install (rustup; the pinned
  version comes from `harness-kit/rust/rust-toolchain.toml`) and changes nothing;
- `--apply` builds the programs first: `cargo build --release --locked --offline` in `harness-kit/rust/`. If that
  fails because a crate is not in the machine's cargo cache, it prints the crates `Cargo.lock` names and that they
  come from crates.io, and stops; with `--fetch` it runs the same build without `--offline`. On this PC never use
  `--fetch`: the crates are cached;
- it wires, for each hook, the built program with the arguments section 7 gives (`--harness-kit`, `--clone=`,
  `--project=`, `--no-usage-tool` when asked), `.exe` added on Windows, and refuses to wire a program that is not
  built;
- `--status` also says for each hook whether its program is built and newer than its sources;
- `check-clone.mjs` builds the workspace in the temp clone with the network off, runs every hook's test file both
  ways (against the JavaScript reference and, through `KIT_HOOK_BIN_DIR`, against the programs) and shows the two
  counts side by side, feeds the wired programs their passing and refused calls, and prints the time of one passing
  call through a JavaScript hook and through its program (the median of 20), so the gain is a number she can see;
- four builders are porting the large hooks while you work. A hook whose program is not there yet, or fails a
  case, is a line of the check that fails and names it. Do not fix it; report it.

Deliverable: harness-kit/setup.mjs

## Why

The teammate clones this repository on a Mac and runs `node harness-kit/setup.mjs --apply` once. After that every
session she starts, in the clone or in a repository of her own, is to be held to the method. Today the set-up wires
three hooks into the clone only. Two builders have just made the rest ready; you wire it and prove it from a clean
clone.

Read `../CONTRACT.md` in full (sections 6 and 7 bind you), then the hand-backs: `../in/hooks-report.md` (for each
hook its event, matcher and arguments), `../in/rust-core-report.md` and `harness-kit/rust/DESIGN.md` (the workspace,
the programs' names, how a test file runs against a program) and `../in/parallel-report.md` (the commands, the
config and its example file, the test files). Then `harness-kit/setup.mjs`, `setup.test.mjs` and
`check-clone.mjs` as they are. Where a report and the contract disagree, the report says what was built: follow it
and note the difference in your hand-back.

## What to build

1. **`harness-kit/setup.mjs`**
   - `--project <folder>`: the repository whose sessions are held; without it, the clone. It writes
     `<project>/.claude/settings.local.json` and nothing else under `.claude`. Both paths are refused if they hold a
     character the command's double quotes do not hold as itself.
   - It wires every kit hook the hooks report lists (window-ceiling, tier-hook, creep-gate, count-gate, fanout-gate,
     kit-start), each marked as today so `--remove` takes out exactly those.
   - `--no-usage-tool`: for a machine whose sessions cannot read the plan's usage; passed on to the fan-out gate.
   - It makes `<project>/.harness/` with what the hooks and commands expect and never overwrites a file there:
     `kit.json` copied from the example the parallel report names, `WIDTHS.md` with the two line forms explained and
     no declaration, `briefs/`. It prints each file it made.
   - FixFlow skills and agents are switched off as today when the project is the clone; in another project there is
     nothing of them to switch off.
   - It prints the lines git should ignore in the project and does not edit `.gitignore`; it says that `.harness/`
     is hers to commit or not.
   - `--status [--project <folder>]`: what is wired for that project, whether each hook file exists, whether the
     config is there. This is how she sees that the set-up held.
   - `--remove` takes out the hook entries and the FixFlow switches it added, leaves `.harness/` alone and says so.
   - The dry run (no flag) prints all of it and changes nothing.
2. **`harness-kit/setup.test.mjs`**: the 22 cases pass as before; new cases for each point above.
3. **`harness-kit/check-clone.mjs`**: from a clean clone of `origin/main` in a temp folder, with every file this job
   adds or changes copied in from the working tree (everything under `harness-kit/`, `.claude/hooks/` and
   `research-tree/tools/` that differs from `origin/main`), it
   - applies the set-up twice: with the clone as the project, and with a second, empty git repository as the project;
   - runs every test file of a kit hook, of the kit's own scripts and of the parallel commands;
   - for each project feeds every wired hook, through the exact command written in the settings file, one call that
     must pass and one that must be refused (for kit-start: that it prints the rules and the clone's path);
   - reads `harness-kit/COVERAGE.md`: every table row has exactly one of the eight marks of the contract's section 4;
     a row marked `hook` names a hook the set-up wires; a row marked `command` names a file that exists in the clone;
     no row's last column still says `missing`;
   - runs `--remove` and shows nothing of the kit is left in either settings file;
   - prints one table and exits 1 if any line failed.
   `COVERAGE.md` and `RULES.md` are being finished by a writer while you work: rows that still say `missing`, and a
   missing `RULES.md`, will fail your check until then. Build the check so that it reports them; do not edit
   those files. The whole check may take minutes: run it in the background with a log, each inner call under 150 s.

## Rules

- Your files: `harness-kit/setup.mjs`, `harness-kit/setup.test.mjs`, `harness-kit/check-clone.mjs`. If a hook or a
  parallel command is wrong, do not fix it: write the fault in your hand-back with the failing call.
- Do not run the set-up with `--apply` in this repository's own folder: another session works here. Use temp folders.
- Never put a literal write into the teammate's folders (`work/`, `.github/`) in a command or a test.
- No Windows-only assumption that a plain change removes. macOS cannot be run here: say so.

## Hand-back

`docs/program/harness-kit-2026-11-25/in/setup2-report.md`: the flags and what each prints; the files the set-up
makes; test counts; the check's table from its last run and its exit code, with the rows that fail only because the
writer is not done; what is not tested; faults found in other units' files. Return under 1,500 tokens.
