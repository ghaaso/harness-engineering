# LANE: how much test work this PC carries at once (2026-11-19)

Kind run, Sonnet. Asked by the top session: the owner's go of 2026-11-19 to use the machine fully. Commit nothing;
write only under `research-tree/build/facts/`.

**Why.** The build's widest batch runs 3 builders because the lane has 2 slots (`research-tree/lane/capacity.txt`;
`research-tree/ORCHESTRATION.md` section 6). Two full suites at once ran 27 % slower each (1.58 times the
throughput, processor peak 97.6 %), and one suite is bound by its longest file, `selftest.test.mjs` (270 s of the
suite's 264 s side by side). Two numbers decide the build's settings: how much test commands of a builder's size
slow each other at 4 at once, and whether the longest file splits into parts that run at once.

**Find first.** The suite's test files and per-file times: `research-tree/lane/log.jsonl` (labels `mg-suite-*`,
2026-11-17, and `r57-0517-sbs8`, the side-by-side suite command) and `research-tree/build/check/C-capacity.md`.

**Measure (not through the lane: another helper is editing `lane.mjs`; call `node --test` directly):**
- **A. Four at once.** Pick 4 different test files that each take 40 to 90 s alone. Run each alone (k = 1), then
  all 4 at once, each its own `node --test <file>` process (k = 4). Record each file's wall time and pass or
  fail, whole-PC processor use every 2 s (for example `typeperf "\Processor(_Total)\% Processor Time" -si 2`
  writing to a file) and free memory. Report t1, t4 and t4/t1 per file; mean and peak processor at k = 4; and
  c_eff(4) = 4 x mean(t1) / mean(t4).
- **B. Split the longest file.** List `selftest.test.mjs`'s top-level tests. Form 4 shards with
  `--test-name-pattern` that together cover every test exactly once, and run the 4 at once. Record each shard's
  time, pass or fail, and the count of tests run against the file's total. If a shard fails that passes alone
  (shared state), say which and try 2 shards.
- **C.** If B works: run the full suite once, the other files side by side plus the selftest shards, and record
  the wall time and pass or fail.

**Rules.** Every Bash call under 150 s: start anything longer in the background with output to a log under
`research-tree/build/facts/lane-measure/`, then read the log in short calls. Before each run, check that no other
`node --test` process is running (another helper may test hooks); if one is, wait and retry, and note it. End
every process you started. Write `research-tree/build/facts/lane-and-shards.md`: the commands, the tables, the
numbers, what was not measured. **Tokens (r57-0038):** expected about 2 M (nearest: run helpers 1.4 M, 1.3-1.8 M,
and the tree build's probes 0.9-3.0 M; this one runs three measurements), limit 4 M; at the limit, write what you
have and return "LIMIT". Return at most 10 lines.
