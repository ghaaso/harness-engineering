# sealed/grader/embeddings: the grader of addendum 8 (built 2026-11-14, before any real hand-off)

Grader only. No real hand-off existed while this was built. Nothing here was shaped by an embedding score: the only
figures computed are on the lane's comparator tables (cross-check B), the stored arms of the earlier test
(cross-check C), and synthetic test hand-offs. Reference content and per-task figures stay in this folder.

## What was read

- `wider/embeddings/train/HANDOFF-FORMAT.md` (version 2 on disk; the builder described it as v1), the v2 decisions of the task brief, `heldout.py` (hand-off writer),
  `answer_level.py` (tuning hand-off writer), `write_result.py` (the consumer of the returns), `eval/evalcore.py`
  (sha256 4054976c...), `eval/tune_tasks.jsonl`, `tune_commits.jsonl`, `gate.json`, `comparators/`.
- `protocol-addendum-8.md` items 4-7, 23-27, rulings 71, 73, 81, 88; `graph-test-heldout-e.workflow.js.txt` (SCORING,
  FILES); `sealed/NOTES.md`; `sealed/grader/NOTES.md`; `sealed/grader/heldout/` (NOTES, score_heldout.js, scores.json,
  clusters.jsonl); `arms/common/score.js`, `harness.js` (readGzJsonl), `paths.js`.
- Samples of real shapes: `r58b/out/heldout_test/E2` and `r58b/out/answer_test/handoff` (read-only).
- Not read: `train/stageA`, `train/stageB`.

## Files

| file | role |
|---|---|
| `truth/build_truth.js` | host, node + read-only git; writes `truth/truth.jsonl` (806 T1 tasks) and `truth/commits.jsonl` (140) |
| `truth/check_a.js` | host; cross-check A |
| `truth/build_aux.js` | host, node + read-only git (rev-list, ls-tree); writes `truth/ancestry.jsonl` (253 possible checkpoints, full git ancestry) and `truth/universe.jsonl` (123 parents, code files) |
| `tests/rehearse_full.py` | full-size real-mode rehearsal on synthetic hand-offs (refuter F6) |
| `gradecore.py` | pins, evalcore import (hash-checked), rank / answer-level / literal-check computations, return writer with leak scan |
| `handoff.py` | reads a hand-off; every refusal of decision 7 |
| `grade.py` | the driver: modes `tune`, `heldout`, `tune-test`, `heldout-test` |
| `answer_score.js` | node; per-task answer-level primary through `arms/common/score.js` (rule content) |
| `crosscheck_b.py`, `crosscheck_c.py` | cross-checks B and C; write `crosscheck_b.json`, `crosscheck_c.json` (aggregates) |
| `tests/make_handoffs.py`, `tests/test_grader.py` | generator of synthetic hand-offs and the 31 tests |
| `run.sh` | host launcher (one ktest-G container, memgate, mounts) |
| `make_hashes.js` | writes `HASHES.txt` |
| `work/` | per-task figures of real runs and of cross-check C (sealed); `test-out/` test hand-offs, test work, `test-summary.json`; `logs/` |

## Truth (item 4)

Task id -> commit: `sealed/references.jsonl` (field `commit`, per task id; parent and seed path equal `tasks/tasks.jsonl`
for all 806 T1 tasks). Truth = the reference record's files with status M (the sealed builder's "existing" files,
old path), filtered by `evalcore.CODE`, seed excluded. Derived a second time with read-only git (`diff-tree -r -M
--name-status parent commit`, statuses M, T, R-old-path, CODE, seed excluded): equal for 806 of 806. Every truth file
exists at the parent (`ls-tree`): 0 missing. Every recorded parent is the commit's first parent; no merge commit.
Empty truth: 0 tasks. Date order = author time (git log %at), ties by sha; late 50 = the 50 latest tuning commits.
Counts: 388 tuning tasks / 65 commits (late 50: 313 tasks), 418 held-out tasks / 75 commits / 70 parents.
`gradecore.py` pins the sha256 of `truth.jsonl` (7c4f8163...), `ancestry.jsonl` (a1faee04...), `universe.jsonl`
(9069fa8d...), `references.jsonl`, `evalcore.py`, `score.js`, `harness.js`. Rebuilt on 2026-11-15 by the fixer: `build_truth.js`
wrote byte-identical `truth.jsonl` and `commits.jsonl`.

**Round of 2026-11-15 (pin of commits.jsonl):** `gradecore.PINS` now also pins `truth/commits.jsonl` (da138931...),
checked in `check_pins` like the others (refusal 20). No grader code reads that file (task commits come from
`truth.jsonl`), so the pin adds a refusal only; behaviour is otherwise unchanged. Two tests added (33): a changed line
in commits.jsonl refuses 20 like truth.jsonl; v2 keys the grader does not read (absent_tasks, test_set, mean_rows,
cross_check extras, per-variant pool_source) are accepted. The previous 14 files are in `logs/prev-e6468916/`
(moved there from `final-check/` after the round, because make_hashes.js does not walk `logs`; HASHES.txt lists the
14 live code and test files). Tests in ktest-G40, B in ktest-G41, A on
the host: all pass.

**Round of 2026-11-15 (seeds check):** an answer now passes when the task's file seed is among the seeds (was: first
entry), because the shared harness (`arms/common/seed.js`) lists seed node ids in node order and another node of the seed
file can come first (T1-0065, T1-0267 of the lane's late-50 test hand-off). Two tests added (35); the accept test fails
on the previous bytes (`logs/prev-4bd8fd6d/`, run ktest-G80: 34 of 35); all 35 pass in ktest-G81.

## Cross-checks

- **A (pass).** Against `eval/tune_tasks.jsonl`, matched by (commit, parent, seed): 388 of 388 matched, truth equal
  388 of 388; the lane's task ids equal the build ids (388), date order equal (388), late-50 flag equal (388).
- **B (pass).** Comparator tables -> `evalcore.read_score_table` + the scope's candidate file + `evalcore.rank` ->
  this grader's rank path with this grader's truth. Late 50 (313 tasks, 50 commits), both scopes, all four metrics,
  against `comparators/metrics.json`: max abs difference 0.0 (16 rows x 4 metrics, also on the pilot's late-50 set,
  308 tasks). Pool P@10, grader / metrics.json / gate.json / item 6 pilot:
  - pilot set: RRF 0.232700 / 0.232700 / 0.2327 / 0.233; PPR 0.203575 / 0.203575 / 0.2036 / 0.204; CO 0.195480 /
    0.195480 / 0.1955 / 0.199 (all within 0.005 of the pilot); DIR 0.195028.
  - late 50 (author-time set): RRF 0.249344, PPR 0.214898, CO 0.214080, DIR 0.208172 (pool); RRF 0.251317, PPR
    0.216833, CO 0.173699, DIR 0.172768 (unrestricted); each equal to metrics.json. Full table in `crosscheck_b.json`.
- **C (pass, with one rounding explained).** Stored held-out T1 answers (`results/heldout/<arm>/primary/T1.jsonl.gz`)
  through `answer_score.js` + evalcore aggregation over the 75 task commits: relational 0.7001091641, search
  0.6244836702, floor-co 0.6375084205, floor-dir 0.5494402192, each equal to the earlier grader's unrounded
  per-commit mean (clusters.jsonl) and to scores.json at 4 decimals (0.7001, 0.6245, 0.6375, 0.5494). Item 7 says
  0.700, 0.625, 0.638, 0.549: three agree at three decimals; search's exact value rounds to 0.624 — item 7's 0.625 is
  the stored 4-decimal 0.6245 rounded half up. The scoring is reproduced exactly; the 0.001 is a rounding of the
  printed figure only.

- **Rerun by the fixer (2026-11-15, after every change):** A on the host (388/388 matched and equal; ids, date order,
  late-50 flag 388 each), B in ktest-G22 (max abs difference 0.0, pass), C in ktest-G22 (the four values above,
  unchanged to 10 decimals, pass).

## The driver

`sh run.sh ktest-G<N> <host hand-off folder> "python grade.py <mode> --handoff /handoff --handoff-sha256 <H> [--freeze-sha256 <F>]"`

Order of refusals (exit code). Before all: every file of `HASHES.txt` and every pin (21, 20). Then: real held-out
already graded, i.e. `heldout.json` in the returns OR the sealed marker `work/heldout/STARTED.json` OR any per-task
file in `work/heldout/` (8); malformed hash options (2); `HANDOFF.json` sha256 (3); test flag (4; missing = wrong);
split (7); held-out: freeze sha256 and `anchor_line` (its sha256 = the coordinator's freeze value, file
`train/heldout/item27.json`; required in real held-out, checked when present in heldout-test) (5); every listed file:
present, sha256, not a link and not under one, resolving inside the hand-off (6); tuning: `eval/tune_tasks.jsonl`
equal to `cross_check.lane_truth_sha256` (required in real tune, checked when present in tune-test) (6). In real
held-out the sealed marker is written HERE, before any list is parsed; any later stop rewrites it with the outcome
(`refused <code>`, `stopped`, or `returned` with the return's sha256) and keeps blocking a second grading until the
coordinator removes it (a recorded step). Then: variant set, with `label` / `mean_row` checked when present (9);
task set (10): real tune = the 313 late-50 tasks, real held-out = the 418, test forms = exactly one of the fixed test
sets `gc.test_sets`: `pick8` (the late-50 commits at date-order positions 0, 6, ..., 42: 8 commits, 37 tasks) or
`late50` (313); ranked lists (11): task missing or repeated, wrong variant/scope field, repeated path, a path that is
not `evalcore.CODE`, the seed itself, a path absent at the task's sealed parent (sealed universe = git ls-tree and
CODE, equal to the lane's export-graph code entities at all 123 parents), an unrestricted list that is not every code
file of the parent but the seed; answers (11): items not the head of the unrestricted list, `parent` other than the task
row's, `seeds` not a non-empty list or the task's file seed not among the seeds, an inconsistent 8,000 budget (used over 8,000, full items plus cut over `used`,
`n_full` beyond the items, a cut longer than its item); `tables/counts.json` (held-out modes, 11): listed, exactly
s1..s3, every task in every seed with a 40-hex checkpoint, and every checkpoint one of the sealed possible
checkpoints (40); answer file with another arm field, configuration or form (30; the message carries only
answer_score.js's fixed problem list, raw stderr goes to `logs/answer_score.stderr.log`); a graded task with zero
reference units (11; there are none in T1, so the published key set never changes).

Rank metrics: `evalcore.task_metrics` on the lists as given; per seed `evalcore.summary` (mean per commit, then over
commits); `_mean` rows = `evalcore.mean_over_seeds` then summary; held-out vs_RRF = `evalcore.paired` on the seed-mean
per-task values (P@10 of both scopes). Answer level: score.js primary per task; the same aggregation; intervals =
`evalcore.bootstrap` of the per-commit difference (seed 0, 10,000, 95 %). Resampling unit: the task commit of the
sealed records. No truth rule and no metric definition was changed by the fixer.

Literal check (ruling 73): checkpoints from `tables/counts.json`, every seed, no fallback; a task counts when its
commit (sealed records) is a checkpoint or a git ancestor of one, read from `truth/ancestry.jsonl` (git rev-list per
possible checkpoint: every facts-cache sha, every lane export graph sha, every T1 parent and T1 task commit; 253).
The builder used `facts/cache/<sha>/commits.jsonl`, which is not the full ancestry: over the 190 facts-cache
checkpoints git has 13,681 (checkpoint, T1 task commit) ancestor-or-equal pairs; the lists, counting the checkpoint
itself, hold 13,426 of them and none outside git's. The auditor's 315 missed pairs include 60 checkpoint = commit
pairs that the builder's equality test did catch; 255 were truly missed.

Returns: real `/returns/tune-rank.json` + `tune-item24.json`, or `/returns/heldout.json`; test forms `/returns/test/`.
Sorted keys, no timestamp; the writer refuses (50) any number that is not finite or outside its v2 range (metrics,
`primary`, `p`, `per_seed` and `answer_level` values in [0, 1]; `diff`/`lo`/`hi` in [-1, 1]; counts non-negative
integers; a number under any other key), and (51) a return holding a task id or a reference path of the graded tasks.

## Tests (35 of 35 pass, ktest-G81 on 2026-11-15; summary in test-out/test-summary.json)

The builder's 20 (end to end both test forms, independent recomputation, determinism, naming, leak scan, aggregation
order, lists as given, every refusal of decision 7), with the malformed-list cases now asserting their message, plus
11 added by the fixer, one per finding: full git ancestry (A1: 36 held-out and 6 tuning task commits that a
facts-cache checkpoint descends from but whose `commits.jsonl` omits them, each placed at that checkpoint: all
counted, none would be with the facts lists; control: all 806 tasks at their own parent count 0); positive literal
cases end to end (F2: a seed-2 checkpoint that descends from the task commit gives 1; a changed hand-off parent gives
parent_mismatch 1); counts.json missing, a checkpoint missing, a task or a seed missing, a `../` checkpoint (11), an
unknown 40-hex checkpoint (40) (A3, F1, F9); the sealed marker (A2, F4: a refusal after acceptance leaves
`refused 6`, the next run is refused 8 with a fresh returns folder, a lone per-task file also gives 8, a refusal
before acceptance leaves no marker); fixed test sets (F3: one task, the set less one task, both forms give 10); code
universe (F5 and its probe: non-code path, seed, absent path, short and empty unrestricted list give 11); answer
integrity (F11); node failure message (F10); v2 ranges (F8); zero-unit refusal (F7); real-mode mismatches (F12:
held-out hand-off to real tune 7, wrong freeze in real held-out 5, anchor disagreeing or missing 5, lane truth sha 6,
missing cross_check in real tune 6, a symlinked listed file 6). Test modes leave the real returns folder and this
folder (outside test-out and logs) unchanged, and `work/heldout` is never created.

Full-size rehearsal (F6, `tests/rehearse_full.py`, ktest-G23..G25, REAL mode on synthetic hand-offs with test false,
returns and work under `test-out/full/`): tune = 40 variants x 313 tasks x 2 scopes (unrestricted lists of up to 469
paths): 20.7 s, peak RSS 118 MB (python) / 97 MB (node children); held-out = 10 variants of E3 x 418 tasks over 75
commits, checkpoint = sealed parent: 6.9 s to the return, peak 127 MB / 102 MB, literal check 418/0/0, marker
`returned`, a second run refused 8, and again 8 with the return deleted (marker alone). Both far inside 1536 MB and
580 s.

Lane test hand-offs: `r58b/out/heldout_test/E2` (8 tasks over 2 commits) is now refused in heldout-test with exit 10
(not a fixed test set; ktest-G26); a lane rehearsal must use `pick8` or `late50`. `r58b/out/answer_test/handoff`
(3 tasks, no pool lists) stays refused.

## Not covered

- No real tuning or held-out hand-off exists; the real modes ran only on synthetic hand-offs (full size, above).
- Pack fidelity is the lane's: per-item `tok`, shown lines and the packer's choices are trusted; only order, arm,
  configuration, form, parent, seed and the 8,000 budget's internal consistency are checked. Re-packing a sample with
  the pinned harness was not done.
- Test returns are visible to the lane. With the fixed test sets no return aggregates a set the lane chose, but two
  test hand-offs on the same fixed set that differ in one task's answer would still let a lane difference out that
  task's answer-level figure on the tuning references (definitions included, ruling 71). The remedy is procedural:
  test gradings only on the coordinator's instruction, and the coordinator relays nothing but pass/fail.
- The comparison with the lane's tune.json to 1e-9 is the coordinator's (decision 2), not done here.
- The lane's `write_result.py` still reads version-1 tuning labels (`<ARM>_<KIND>`); the returns follow decision 1.
