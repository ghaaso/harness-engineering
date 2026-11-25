# The kit after this job: its parts and the names every helper builds to (coordinator, 2026-11-25)

The owner's words are in `OWNER-WORDS.md`; they outrank this file. The job's brief is `briefs/ENFORCE.md`.
This file fixes what the helpers of this job share, so that units built side by side fit together.

## 1. Words

- **The clone**: her clone of this repository. It holds the kit (`harness-kit/`), the hooks (`.claude/hooks/`), the
  helper types (`.claude/agents/lean-*.md`) and the queue and landing scripts (`research-tree/tools/`).
- **The project**: the repository whose sessions the kit holds. By default the clone itself. She works in a
  repository of her own (Python, Postgres, pytest), so the set-up can also be pointed at that one:
  `node harness-kit/setup.mjs --apply --project <folder>`.
- **Kit mode**: a hook started with the argument `--harness-kit`. Without that argument a hook behaves exactly as it
  does today on the owner's PC; `.claude/settings.json` there is not changed by this job.

## 2. Kit mode: what every kit hook does the same way

A kit hook is wired, in `<project>/.claude/settings.local.json`, as

    node "<clone>/<path of the hook>" --harness-kit "--project=<project>" [--no-usage-tool]

- `--project=<folder>` absent: the project is the clone.
- In kit mode everything a hook reads or writes about the work is under the project, never under the clone:
  - state files (hand-over, cap, meter line): `<project>/.harness/*-STATE.md`
  - briefs: `<project>/.harness/briefs/*.md`
  - declared widths: `<project>/.harness/WIDTHS.md`
  - her own measured costs, usable as a basis: `<project>/.harness/basis.json`
  - the config of the parallel commands: `<project>/.harness/kit.json`
  - hook logs: `<project>/.claude/logs/`
- What ships with the kit and is read from the clone: `.claude/hooks/tier-routes.json`, `harness-kit/basis.json`
  (the measured costs of helper roles from the owner's records, each with its record id), `harness-kit/RULES.md`.
- One small module, `.claude/hooks/kit-mode.mjs`, works this out from `process.argv` and the hook's own folder; each
  kit hook imports it. A hook must still load and behave as today if that module is missing or throws.
- `--no-usage-tool`: for a machine whose sessions have no tool that reads the plan's usage (Claude Code in a
  terminal). Only the fan-out gate reads it: the rule "the meter is read before a wave" is then off and said so in
  its log; every other rule of that gate stays.

## 3. The parts, and where each stands today

| part | what it holds | today |
|---|---|---|
| `window-ceiling` hook | past its context line a session or helper may only write its hand-over | wired by the set-up; knows no project other than the clone; hand-over paths are this PC's |
| `tier-hook` | a helper or child session names its kind of job and runs on the model routed to it | wired; no test file of its own; effort is not checked |
| `creep-gate` hook | a deliverable named before helpers start; no review panel, review of a review, or repair round on small findings | wired |
| `count-gate` hook | at most 20 helpers at once, helpers of helpers counted; a width or hold declared in the widths file | not wired: two cases of its test file read the owner's files |
| `fanout-gate` hook | every helper start states a token limit above its expected figure with a measured basis; the job's cap; the meter read before each wave; a meter line | not wired: it needs the desktop app's usage tool and the record book |
| `kit-start` hook (new, `harness-kit/hooks/kit-start.mjs`) | puts the short rules (`harness-kit/RULES.md`) into every session at start, resume and compaction | not built |
| FixFlow skills and agents off | the archived product material does not load | in |
| the queue, `research-tree/tools/lane.mjs` | heavy commands a few at a time, at low priority, each with a timeout and a log line | on `main`; a timeout off Windows stops only the direct child; no step in the README |
| own copies and landing, `harness-kit/parallel/unit.mjs` (new) over the steps of `research-tree/tools/land.mjs` | several writers: each unit in its own copy and branch; landings one at a time, in one order, through her check; a failing landing undone | `land.mjs` is on `main` and bound to this repository's layout and to `node --test`; nothing for a project of hers |
| the check side by side, `harness-kit/parallel/check.mjs` (new) | her test files several at once through the queue; a measuring run at 1, 2, 4, 8 at once that prints the seconds | not built for a project of hers (here: `shards.cmds`, bound to one test file) |
| what a helper cost, `harness-kit/tokens.mjs` (new) | tokens per helper of a session, counted as the fan-out gate counts, so she writes her own basis rows | not in the kit (the counter lives inside `fanout-gate.mjs` and in `research-tree/build/tools/tokens-self.mjs` on `bilal/build`) |
| helper types `lean-*` and the routes | the eight lean helper types and kind to model | in |
| `ORCHESTRATION.md`, `RESULTS.md`, `parallel/` | the rules, the measurements, the parallel work and its research | in |
| `RULES.md` (new) | the short rules every session gets at its start | not written |
| `COVERAGE.md` (new) | every item of the four sources with its mark | not written |

Not kit parts, because they keep this owner's own records, pages, branches or work: `record-guard`, `owner-report`,
`library-start`, `plan-gate`, `journal-watch`, `migration-gate`, `owner-guard`, the commit check
(`tools/check-commit.mjs`), the journal tool (`tools/journal.mjs`), the record book (`library/`).

Never built here, designs only (the kit lists them as that): the function that computes how many run at once
(`parallel/research/BUILD-IN.md`), pacing a token window by re-planning, a model and effort per step (the router),
several writers inside one file by version-checked writes or claims for harness builds.

## 4. The marks of `harness-kit/COVERAGE.md`

Every row carries exactly one:

| mark | meaning | "by what" then holds |
|---|---|---|
| `hook` | after the set-up a hook refuses a breach | the hook |
| `loaded` | in the short rules every session gets at its start; nothing refuses a breach | the rule's place in `RULES.md` |
| `command` | a procedure she runs | the command |
| `trial` | in the kit and switched on, never proven here | how she sees whether it works |
| `owner's own` | about this owner's records, pages, machine, branches or approvals | why it is not hers |
| `cannot` | cannot work off this PC as built | why, and the smallest change |
| `design` | exists only as a design | what building it takes |
| `result` | a finding or a measurement; nothing to enforce or run | where she reads it |

`hook` and `loaded` are the brief's "enforced after set-up"; `command` its "runs after set-up". `design` and `result`
are added so that no row claims more than is true.

## 5. Who owns which files in this job (two helpers never write the same file)

| unit | files |
|---|---|
| rows (three readers) | `docs/program/harness-kit-2026-11-25/in/coverage-speedups.md`, `coverage-enforcement.md`, `coverage-rule-orchestration.md` |
| hooks | `.claude/hooks/**`, `harness-kit/hooks/**`, `harness-kit/basis.json`, `harness-kit/tokens.mjs` and their tests |
| parallel | `research-tree/tools/lane.mjs`, `research-tree/tools/land.mjs` (only if it must change), `harness-kit/parallel/*.mjs`, `harness-kit/parallel/kit.example.json` and their tests |
| set-up | `harness-kit/setup.mjs`, `harness-kit/setup.test.mjs`, `harness-kit/check-clone.mjs` |
| documents | `harness-kit/README.md`, `ORCHESTRATION.md`, `RULES.md`, `COVERAGE.md`, `RESULTS.md` |

Each unit hands back in `docs/program/harness-kit-2026-11-25/in/<unit>-report.md` (what it built, each file, each
test count, what is not tested, what it could not do), and returns under 1,500 tokens.

## 7. The hooks in Rust (the owner's instruction of 2026-11-25; his answer: "no fallbacks needed")

This section outranks sections 2, 3 and 5 where they differ.

- **The kit wires Rust hooks only.** No JavaScript hook stands behind them on a machine without Rust. The JavaScript
  hooks stay as they are on the owner's PC (its `.claude/settings.json` is not changed by this job) and are the
  reference: a Rust hook is done when the test file of its JavaScript one passes against it, case for case, in both
  modes (with and without `--harness-kit`).
- **Workspace** `harness-kit/rust/`: `Cargo.toml` (edition 2024, rust-version 1.100, the lint table and release
  profile the owner's other Rust work uses, copied whole into it), `rust-toolchain.toml` (1.100.0, minimal, clippy,
  rustfmt), `Cargo.lock` committed, `.gitignore` holding `target/`.
- **Crates**: `crates/kit-core` (a library: arguments and kit mode, the hook's input, logs, refusing and passing,
  reading transcript lines, counting tokens) and one program per hook: `kit-window-ceiling`, `kit-tier-hook`,
  `kit-creep-gate`, `kit-count-gate`, `kit-fanout-gate`, `kit-start`, `kit-tokens`.
- **Dependencies**: `serde_json` 1 and `regex` 1, nothing else. Both, with all they need, are in this PC's cargo
  cache: every cargo call on this PC carries `--offline` (a call without it once fetched a crate nobody approved:
  r57-0621).
- **Same behaviour**: a program takes the same arguments, reads the same input and the same environment variables
  its JavaScript one reads (the test overrides included), prints the same text, exits with the same code, writes
  the same log lines and fails the same way on its own error (open or closed, as its JavaScript one does). It never
  panics on real data.
- **Where the clone is**: the argument `--clone=<folder>` (the set-up writes it); without it, the nearest folder above
  the program that holds `.claude/hooks/tier-routes.json`. Files that ship beside the JavaScript hooks
  (`tier-routes.json`) are read from `<clone>/.claude/hooks/`.
- **The wired command** becomes
  `"<clone>/harness-kit/rust/target/release/kit-<hook>" --harness-kit "--clone=<clone>" "--project=<project>" [--no-usage-tool]`
  (`.exe` added on Windows).
- **The test switch**: with the environment variable `KIT_HOOK_BIN_DIR` set to a folder of built programs, a hook's
  test file runs `<that folder>/kit-<hook>` in place of `node <hook>.mjs`. One small helper module does this for
  every test file. Without the variable the test file runs the JavaScript hook as today.
- **Stays JavaScript in this job, and is listed as that**: the set-up (it must run before anything is built), the
  clean-clone check and the test files (they drive both), the parallel commands and the queue (run a few times a
  day, no measured gain from a port; the queue is in live use here).
- **Her machine** needs the Rust toolchain (rustup brings the pinned version), Node and git. Her first build fetches
  the crates from crates.io unless they are in her cache; the set-up says so before it does and needs a flag for it.

Rules for a helper that writes Rust here:
- Read first: `in/rust-skills/rust-best-practices/SKILL.md` with its chapters 1, 2, 4 and 5 as needed, and
  `in/rust-skills/ms-rust-guidelines/all-excerpt.txt`. These are the skills the owner had vetted for Rust builders.
- No `unsafe`. No `#[allow(...)]`, `#[expect(...)]`, `todo!`, `unimplemented!`, no stub that returns a fixed answer.
  Never change a test case to make it pass; a case that cannot apply to a program is listed in the report with the
  reason, and the behaviour gets a Rust test.
- `cargo clippy --offline` is clean under the workspace's lint table; `cargo fmt` is run.
- While several builders work at once each sets its own `CARGO_TARGET_DIR` outside the repository and `-j 6`.
  `cargo check` while working, one release build at the end. Shell calls under 150 s.
- A builder owns its own crate folder and its hook's test file. It does not edit `kit-core` after the first unit has
  delivered it: what it misses there it puts in its own crate and names in its report.
- If the same case still fails after three different fixes, stop and report it with the failing input.

## 6. Rules that bind every helper of this job

- Another session is working in this folder and every hook in `.claude/hooks/` is live for it. Change a live hook
  only like this: work on a copy outside `.claude/hooks/`, run its tests against the copy, and replace the live file
  in one step when they pass. Without `--harness-kit` its behaviour is unchanged.
- Evidence is never edited: nothing under `recovered/`, `docs/program/evidence/` or `library/journal/`.
- Nothing of the teammate's is touched: `work/`, `tools/run_checks.sh`, `.github/workflows/`, her branches.
- No commit, no push, no branch: the coordinator commits.
- No install or download. Node 24 and git are here; Python is not.
- Shell calls stay under 150 s; longer work runs in the background with a log that is read.
- macOS cannot be run on this PC. Write nothing that assumes Windows where a plain change removes it, and say in the
  report what was not run.
- Nothing is called proven that no record measures. A figure names its record.
