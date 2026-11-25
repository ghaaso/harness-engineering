# The harness kit enforces the whole method: state (the owner's words of 2026-11-25)

Session 0f8570e2 (Fable; it coordinates, helpers build). Started 2026-11-25 about 17:20 UTC by the session that
built the first kit (34bdfefe, ended at its cap).

Cap 60 M tokens (his answer of 2026-11-25 to a cap: question, "Yes, 60 M"). Expected about 43 M: nine helpers about
29 M, this session about 14 M. Meter at the reading before the first wave: 83 % all models, 53 % Fable, reset
2026-11-30 12:00 UTC.

His words: `docs/program/harness-kit-2026-11-25/OWNER-WORDS.md`. The brief: `.../briefs/ENFORCE.md`.
The names every helper builds to, the kit's parts and the marks: `docs/program/harness-kit-2026-11-25/CONTRACT.md`.

Deliverable: harness-kit/COVERAGE.md

## Plan

| wave | unit | helper | limit (expected), basis | writes |
|---|---|---|---|---|
| 0 | rows 1 to 3 | three Sonnet readers | 2.5 M each (0.9 M), r58-0102 | `in/coverage-*.md`, joined into `harness-kit/COVERAGE.md` |
| 1 | hooks | Opus builder | 12 M (6 M), r58-0104 | `.claude/hooks/**` kit mode, `harness-kit/hooks/kit-start.mjs`, `basis.json`, `tokens.mjs` |
| 1 | parallel | Opus builder | 10 M (5 M), r58-0104 | `harness-kit/parallel/*.mjs`, the queue's timeout off Windows |
| 2 | set-up | Opus builder | 7 M (3 M), r58-0105 | `harness-kit/setup.mjs`, its tests, `check-clone.mjs` |
| 2 | documents | Opus writer | 6 M (3 M), r58-0105 | `README.md`, `ORCHESTRATION.md`, `RULES.md`, `COVERAGE.md` final marks |
| 3 | review | Opus refuter, blind | 11 M (6 M), r57-0173 | one list of breaking faults |
| 3 | repair | Opus builder, only for a breaking fault | 6 M (3 M), r58-0104 | |

Then: `node harness-kit/check-clone.mjs` exits 0; commits on `bilal/build`; a branch `bilal/kit-enforce` by
`tools/promote.mjs`; a pull request to `main`, opened, not merged; records by `tools/journal.mjs`.

## State

- By 17:44 UTC (clock; the "about 17:20" above is an estimate): read the owner's words, the brief, the board, the
  kit. Cap asked and given. Contract and five briefs written (`briefs/COVERAGE-ROWS.md`, `HOOKS.md`, `PARALLEL.md`,
  `SETUP.md`, `DOCS.md`).
- Wave 0 done: three Sonnet readers wrote 280 rows (S 38, E 115, D 42, O 85); `harness-kit/COVERAGE.md` joined
  from them as things stood before the build: 94 rows with something missing, all inside the plan's units (the
  start hook and `RULES.md`; kit mode for window-ceiling, count-gate, fanout-gate; `unit.mjs`, `check.mjs`,
  `tokens.mjs`; the queue's README step and timeout off Windows). No row marked `trial` yet: the writer sets those
  from what is built. Reader 2 left out the ten unbuilt proposals under "Which remaining rules could get a check
  now": they are not table rows.
- Wave 1 running since about 17:40 UTC (meter 84 % all models, 54 % Fable): the hooks builder and the parallel
  builder, both Opus. Their hand-backs: `in/hooks-report.md`, `in/parallel-report.md`.
- About 17:45 UTC: the starting session relayed the owner's added instruction: the hooks in Rust, not JavaScript,
  where possible (his words are in `OWNER-WORDS.md`). Found: Rust 1.100.0 on this PC (host
  x86_64-pc-windows-msvc only, no macOS target); a probe program with serde_json and regex builds with the network
  off in 8 s from the cargo cache; the Rust skills are those of the session tool's move (`rust-best-practices` and the
  Microsoft guidelines excerpt), copied to `docs/program/harness-kit-2026-11-25/in/rust-skills/` so that a kit helper's
  brief does not name the session tool's folders (the migration gate holds those). The six hooks are 98,353 bytes of
  JavaScript; a port with the same tests passing measured 8.4 M per 47,870 bytes on Opus (r57-0191).
- 17:50 UTC: his answer to the second cap: question: "yes 95m also no fallbacks needed we willl fix errors if they
  occue". So the kit wires Rust hooks only; her machine needs the Rust toolchain; no JavaScript hook behind them.
  The set-up, the parallel commands and the queue stay JavaScript in this job and are listed as that (no measured
  gain from porting a command she runs a few times a day; the hooks run on every tool call).
- Plan after that answer: when the JavaScript hooks builder hands back (its kit mode and test cases are what the
  Rust is ported from and tested by): wave R0 one Opus builder (workspace, `kit-core`, tier hook, start hook, the
  test switch; limit 6 M, expected 3 M, basis r57-0191); wave R1 four Opus builders at once (window-ceiling 9 M;
  creep-gate 7 M; count-gate 8 M; fanout-gate and the token counter 8 M; expected 5, 3.9, 4.4, 4.6 M) with the
  set-up builder (8 M, expected 4 M); then the writer; then the clean-clone check and one review.
- 17:58 UTC (clock): wave 1 done and committed (348ef7ef). Hooks builder: kit mode in the five JavaScript hooks,
  `kit-mode.mjs`, the tier hook's own test file, start hook, token counter, basis table; tests window-ceiling 134,
  creep-gate 42, fanout-gate 48, count-gate 29, tier 24, start 10, tokens 8, selftest 245; about 9 M by its own
  count (limit 12 M). Parallel builder: `unit.mjs`, `check.mjs`, the queue's options; 6 tests; `land.mjs` unchanged.
  The JavaScript to port is now 119,277 bytes (about 21 M at r57-0191's rate). Meter 85 % all models, 56 % Fable.
  Open from the reports, for the set-up builder: `isOurs` must find the mark anywhere in a command; the check must
  count skips apart from failures. For the writer: no verb removes a landed unit's copy (two git commands by hand);
  rerun `node harness-kit/basis.build.mjs` after the documents change. The effort check is not built: what it takes
  is in `in/hooks-report.md`.
- 17:59 UTC: wave R0 started: the Rust core builder (brief `briefs/RUST-CORE.md`, hand-back `in/rust-core-report.md`).
- 18:22 UTC (clock): wave R0 done and committed (c6e138e7): the workspace `harness-kit/rust/`, `kit-core`, the tier
  hook and the start hook as programs; the test switch `hook-under-test.mjs` (`KIT_HOOK_BIN_DIR`); both test files
  pass both ways (24 with 1 skip against the program, 10 of 10); one passing call 36.9 ms in JavaScript, 6.1 ms in
  Rust (median of 20). The lock file is final and the five other crates hold placeholders. One departure: the
  program refuses a kind such as `constructor`, which makes `tier-hook.mjs` throw and pass the start unchecked; the
  JavaScript hook is left as it is and the fault is to be listed for the owner as a follow-up.
- 18:23 UTC: wave R1 started, five Opus builders at once (meter 86 % all models, 57 % Fable; the session's total
  31.5 M as the creep gate counts): ports A window-ceiling (limit 9 M), B creep-gate (8 M), C count-gate (8 M),
  D fanout-gate and the token counter (10 M), brief `briefs/RUST-PORT.md`, hand-backs `in/rust-A-report.md` to
  `rust-D-report.md`; and the set-up builder (8 M), brief `briefs/SETUP.md`, hand-back `in/setup2-report.md`.
- Next: when all five are back, commit, read the meter, start the writer (`briefs/DOCS.md`); then run
  `node harness-kit/check-clone.mjs` in the background, one blind review, a repair only for a breaking fault, then
  `tools/promote.mjs`, the pull request and the records. At the end remove `in/rust-skills/` (copies of third-party
  skills, not to be committed).
- To record by `tools/journal.mjs` at the end: his two cap answers, the Rust instruction and "no fallbacks", the
  measured costs of this job's helpers, what was built.

Cap 95 M tokens (his answer of 2026-11-25 to a second cap: question, "yes 95m also no fallbacks needed we willl fix errors if they occue"; replaces the 60 M above).
