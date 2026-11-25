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
- 18:46 UTC (clock): ports A, B, C and the set-up done and committed (90e199c3). The clean-clone check ran once:
  every hook's test file passes against the JavaScript and against the program; it fails only on what is not
  written yet (`RULES.md`, the coverage rows still saying missing, the token counter's program). Port D was stopped
  by the migration gate's repair-loop rule at 0, 0, 7 (two clean checks, then clippy); a fresh builder continues
  from its report. Writer started 18:48 (limit 6 M). Session total 60.6 M.
- About 18:50 UTC, the owner: "Why the fuck is this taking so long? You aren't doing unnecessary rounds of
  adversarial reviews and JavaScript versus Rust comparisons, are you? [...] don't do that". So: **no review at
  the end, no repair round, no further comparison runs.** When the token counter and the writer are back: one run
  of the clean-clone check, commit, `tools/promote.mjs`, the pull request, the records, the report. Nothing else.
- To record by `tools/journal.mjs` at the end: his two cap answers, the Rust instruction and "no fallbacks", the
  measured costs of this job's helpers, what was built.

Cap 95 M tokens (his answer of 2026-11-25 to a second cap: question, "yes 95m also no fallbacks needed we willl fix errors if they occue"; replaces the 60 M above).

## After the build (2026-11-25, 19:00 to 19:25 UTC by the clock)

- 19:01: the last programs and the documents committed (fa860edc). `node harness-kit/check-clone.mjs` passed every
  line, exit 0, 176 s (log in the scratchpad; its table is in `in/setup2-report.md` for the earlier run).
- 19:03: the owner approved one rigorous adversarial review held to breaking faults only (his words in
  `OWNER-WORDS.md`; record r58-0020). Brief `briefs/REVIEW.md`; one Opus refuter, fresh context, 9.10 M.
- 19:05: eight records appended (r58-0018 to r58-0020, r58-0108 to r58-0110, r58-0602, r58-0500). The promotion's
  entries file `docs/program/harness-kit-2026-11-25/promote-kit-enforce.json` passes the dry run (93 files).
- 19:18: the review's result, `in/breaking-faults.md`: 2 breaking faults. F1: the window ceiling gives an Opus
  session no line on a machine without the owner's model settings. F2: under a cap a helper killed by an app
  restart keeps its limit reserved and nothing in the kit names the command that ends it. Sound: the programs
  against the JavaScript on real transcripts, the set-up applied and removed, the landing with its failure cases.
  Four notes not breaking, not to be fixed now (in its section 4).
- 19:22: the repair started (brief `briefs/REPAIR.md`, one Opus builder, limit 3.8 M); the session's total 90.3 M.
  His answer to a third cap: question, for the repair and the delivery: "Yes, 100 M".
- Left: on the repair's hand-back, one run of the clean-clone check; commit; `node tools/promote.mjs
  docs/program/harness-kit-2026-11-25/promote-kit-enforce.json --apply`; push `bilal/build` and `bilal/kit-enforce`;
  open the pull request to `main` (not merged); two more records (the cap of 100 M, the review and its repair);
  remove `in/rust-skills/`; report.

- 19:29: the repair done and committed (54b17300; one Opus builder, 3.70 M): both faults fixed in the JavaScript
  hooks and the Rust programs; test files both ways window-ceiling 135, fanout-gate 49, count-gate 28 with 2
  skipped. That commit's path list was built from the folder and so took in two files another session had just
  written (`.claude/hooks/hypothesis-gate.mjs` and its test file): the next commit takes them out of the index
  again, the files stay on disk as that session left them. The session's total at 19:29: 95.62 M.
- Then: the clean-clone check run once more after the repair (every line passed, exit 0); two more records
  (the cap of 100 M; the review and its repair); the branch `bilal/kit-enforce` made by `tools/promote.mjs` from
  `docs/program/harness-kit-2026-11-25/promote-kit-enforce.json`; `bilal/build` and `bilal/kit-enforce` pushed; the
  pull request to `main` opened, not merged. `in/rust-skills/` (copies of the vetted Rust skills) removed.
- The journal file `library/journal/2026-11-25/r58.jsonl` is committed with this job's ten records and with five
  lines another session had appended and not yet committed.
- Open, for the owner: record r58-0500 (six points).

Cap 100 M tokens (his answer of 2026-11-25 to a third cap: question, "Yes, 100 M"; replaces the 95 M above).

- About 19:40 UTC, the owner (his words in `OWNER-WORDS.md`, the last message): everything she runs in Rust, the
  JavaScript duplicates removed, the settings that help here written by the set-up, the small fixes made, nothing
  about this PC in the kit. One wave of four Opus builders, brief `docs/program/harness-kit-2026-11-25/briefs/RUST-ONLY.md`:
  S the set-up (limit 11 M), P the parallel commands and the queue (14 M), C the JavaScript duplicates (5 M),
  T the routing fix, the effort check as a trial and the documents (8 M); basis r58-0110 (0.18 M a KB ported).
  Four placeholder crates made and the lock file brought to its final state by the coordinator (kit-setup,
  kit-queue, kit-check, kit-unit). Then one clean-clone check, commits, the pull request branch updated.
  Not done on purpose: the migration gate's repair-loop rule and this PC's own wiring are not part of the kit.

Cap 140 M tokens (his answer of 2026-11-25 to a fourth cap: question, "Yes, 140 M"; replaces the 100 M above).

## The Rust-only round (2026-11-25, 19:52 to 20:20 UTC by the clock)

- Four Opus builders at once and one fresh builder after a stop by the repair-loop rule (0, 3, 3). Done: the
  set-up as `kit-setup` with its two wrappers and the three settings; `kit-queue`, `kit-check`, `kit-unit`; the
  JavaScript duplicates removed and the four hooks back to what `main` holds; the routing fix; the effort check on
  trial; the documents. Commit 19d85582. The clean-clone check failed once on its own sample (a helper start with no
  effort, refused by the new trial), was given an effort, and then passed every line (exit 0).
- Tokens as the fan-out gate counts, read by `kit-tokens`:

```
build-invariant: Rust port D continued, fanout-gate and toke  claude-opus-5-5          54    6.73 M
build-invariant: builder C, remove the JavaScript duplicates  claude-opus-5-5          20    1.01 M
build-invariant: builder T, routing fix, effort trial and do  claude-opus-5-5          50    4.47 M
build-invariant: builder P, parallel commands and queue in R  claude-opus-5-5          28    4.06 M
build-invariant: builder P continued, finish the parallel co  claude-opus-5-5           9   342.2 K
build-invariant: builder S, the set-up in Rust                claude-opus-5-5          29    4.27 M
its own messages                                              claude-fable-5-2         97   33.41 M
sum                                                                                        123.05 M
```

- Delivered: records by `tools/journal.mjs`; the branch `bilal/kit-rust-only` by `tools/promote.mjs` from
  `docs/program/harness-kit-2026-11-25/promote-kit-rust-only.json`, with one more commit there that removes the two
  JavaScript set-up files `main` still held; the earlier pull request closed in favour of the new one.
- Still open, not part of the kit: points 2, 3 and 5 of record r58-0500.
