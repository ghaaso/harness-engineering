# Audit of the phase A fixes

This folder holds an independent check that the defects found in phase A are closed. The fixers'
reports were not trusted. Every number below was measured again by the scripts in this folder.
Nothing outside build/audit/fixes and build/tmp/audit-fixes was changed.

## What exists and how to run it

All scripts are run from the build folder. Node scripts run on the Windows host read files only
(facts cache, results, task lists, sealed references, and read-only git objects). Anything that runs
an arm runs inside the Docker image graphtest:1 (6 CPUs, 4 GB), with stores on the named volume
gt-audit-fixes and never on /build.

| File | Check | What it does | How to run |
|---|---|---|---|
| c1_facts_leak.js | 1 | Leak scan over every facts cache folder: ancestry of every listed commit, allowed fields only, PR label equals the parent's own-history PR, `used` equals "2 to 30 files", no same-PR sibling of a task commit, no PR number or task key in meta.json, every hex string of 7 to 40 characters that names a commit is an ancestor, co-change commit references, build log, coverage, extractor version | `node audit/fixes/c1_facts_leak.js` (writes c1_facts_leak.json) |
| c1_cochange.js | 1 | Recomputes the co_changed edges from git with the real task commits and compares them with the cache | `node audit/fixes/c1_cochange.js <parent>...` (writes c1_cochange.json) |
| c2_diff.js | 2 | Edge-by-edge difference between the old frozen facts (extractor version e409baad8b0c794b) and the new cache at parent a31924a, plus a seeded sample (seed 11) with code context | `node audit/fixes/c2_diff.js` (writes c2_diff_summary.json, c2_sample.txt) |
| c2_sqlcheck.py | 2 | Every SQL-derived edge must have its evidence line inside a non-docstring string literal that names the keyword and the table | host python with `-I`, argument = parent (writes c2_sqlcheck_*.json) |
| c2_sqlrecall.py | 2 | SQL recall: table names inside text()/execute()/exec_driver_sql() calls that have no edge | host python with `-I` |
| c2_recall.js | 2 | Recall probes for mobile config reads, environment reads, Protocol calls and looped pytest URLs | `node audit/fixes/c2_recall.js` (writes c2_recall_a31924a.json) |
| c3_handscore.js | 3 | Scores 5 TUNE T1 answers by hand logic, with the shown lines re-derived from the facts and from git, and compares them with arms/common/score.js | `node audit/fixes/c3_handscore.js` (writes c3_handscore.txt/.json) |
| c3_forms.js | 3 | Scores the paths and range forms, and a forged bare list relabelled as signature form | `node audit/fixes/c3_forms.js` (writes c3_forms.json) |
| c3_defalign.js | 3 | Share of reference definitions that the signature form can credit at all | `node audit/fixes/c3_defalign.js` (writes c3_defalign.json) |
| c4_padding.js | 4 | Independent DIR and CO padding orders, floor equality, arm tails versus floor order minus the arm's head, rendering and token identity | `node audit/fixes/c4_padding.js` (writes c4_padding.json) |
| c5_hygiene.js | 5 | Label-like file names and task commit SHAs under arms/ (its source-store part is superseded by c5_srcstore.js) | `node audit/fixes/c5_hygiene.js` |
| c5_srcstore.js | 5 | Verifies every source-store tree and blob against git (sha1 of the text after CRLF to LF) | `node audit/fixes/c5_srcstore.js` (writes c5_srcstore.json) |
| accesslog2.js | 6 | Preload that reuses audit/arms/accesslog.js and adds fs callback and promise calls, accessSync, realpathSync, opendirSync, LadybugDB opens and queries, DuckDB instance creation and runs, and quoted file paths inside SQL or Cypher text. It logs the process id and is loaded through NODE_OPTIONS so forked children are logged too | used by tmp/audit-fixes/leak.sh |
| c6_analyse.js | 6 | Classifies every logged access: sealed paths, audit paths, commit SHAs that are not one of the 6 allowed parents; also compares the re-run answers with the stored ones | `node audit/fixes/c6_analyse.js` (writes c6_leak.json) |
| c7_crosscheck.js | 7 | Strict relational versus reference comparison (ranked list as JSON, and the packed answer with timings stripped) on random (configuration, task) pairs | inside graphtest:1, see tmp/audit-fixes/lock_and_xcheck.sh |
| c7_diag.js | 7 | Re-runs each mismatch with every relational query path (closure on/off, CTE or level-wise) and reports reach, hop, path and score differences | inside graphtest:1 |

Container scripts live in build/tmp/audit-fixes:
- lock_and_xcheck.sh runs the held-out lock attempts for every arm (check 5) and c7_crosscheck.js
  with 500 pairs, seed 20261112, 12 parents (check 7). Log: lock_and_xcheck.log.
- leak.sh runs relational, search, ladybug and duckpgq, each with its own 40-entry stage-1 list, on
  the 30 TUNE tasks in leak_tasks.txt (6 parents, leak_parents.txt), with access logging. It is
  started with `--network none --tmpfs /build/sealed` so the sealed folder is empty inside the
  container. Logs: leak/<arm>.log, leak/<arm>.out, leak.log; answers: leak/res.
- diag2.js runs degnorm alone on the 3 check-7 mismatches and prints the per-node scores.

Docker command used for every container run:
`MSYS_NO_PATHCONV=1 docker run --rm --network none --cpus 6 --memory 4g --label gt-lane=audit-fixes [--tmpfs /build/sealed] -v "<build>:/build" -v "C:/Users/User/Documents/projects/EMS_workshop1:/repo:ro" -v gt-audit-fixes:/store graphtest:1 bash -lc "<script>"`

## Results

### Check 1. Facts leak and co-change: pass

- 190 cache folders scanned, 0 failures. They hold 22,495 commit rows and 577,980 commit
  references inside co_changed edges. 0 PR labels differ from the parent's own-history PR.
- 238 same-PR siblings of real task commits are correctly absent from commits.jsonl.
- All 128 distinct parents in tasks/parents.txt (133 lines) have a folder, all built by extractor
  version 59da7b753a4d908e.
- Co-change recomputed independently at 6 held-out parents (a60a0a69, 01ac9e84, 6c2ef824, 19e80c01,
  which has 3 task PRs, 8dafcecc and a31924a): identical edge sets (1,124, 1,440, 1,440, 1,712, 1,856 and
  1,896 edges) and identical listed-commit sets.
- Minor: at 32 parents that have no task, 140 ancestor commits are dropped although they are not
  siblings of any real task commit. The drop is keyed on "children of the parent on main", not on
  task commits. Every such parent has no task, so no score is affected.

### Check 2. Extractor fixes: pass

- Edge differences at a31924a between the old and the new extractor (added / changed attributes /
  removed): calls 14/0/0, calls_url 1/0/0, cites 3/8/7, constrains 5/0/0, contains 2/0/2,
  mentions 2/1/1, migration_touches 19/5/12, reads_setting 14/0/2, reads_table 9/2/14,
  test_calls_route 6/0/0, uses_constant 0/1/0, writes_column 10/0/0, writes_table 16/7/9.
- 118 changed or added edges were read by hand against the code, and all 118 were correct.
- Every SQL-derived edge sits inside a non-docstring string literal that names its table: 48 of 48
  at a31924a, and 28 of 28, 8 of 8 and 8 of 8 at three other parents. SQL recall probe: 0 missed
  file-table pairs out of 39 table mentions inside SQL calls.
- Recall probes at a31924a: mobile config reads 10 of 10, environment reads 4 of 4, Protocol calls
  13 of 13, looped pytest URLs 6 of 6.
- Minor, known: invariant 9 (`captured_at`) has 4 ambiguous constrains edges at confidence 0.25, 3 of
  them wrong; they are below the default minConf of 0.5.

### Check 3. Scorer: pass

- 5 of 5 hand scores equal score.js exactly. The shown lines were re-derived independently, with 0
  mismatches. Cases: relational file/signature T1-0063 0.8889; search symbol/snippet T1-0155 0.4167;
  ladybug pad DIR T1-0274 0.4444; duckpgq file/snippet T1-0185 0.3333 (including a cut item);
  floor-co symbol/signature T1-0150 0.7143.
- Paths and range forms get no definition credit and no primary: primary, recall at 8,000 tokens and
  definition recall at 8,000 tokens are null for floor-dir and for relational with form paths.
- A bare list no longer scores high. Under the old locate rule floor-dir in paths form scored 0.941
  recall at 8,000 tokens. The same list relabelled as signature form now earns at most 0.459, from
  file credit only.
- One scorer: arms/search/score.js is gone. Only arms/common/score.js, compare.js and selftest.js
  read the references.
- Minor, equal for every arm: 182 of 4,162 TUNE T1 reference definitions (4.4 %) are Python
  variables, TSX variables or JavaScript objects with no node, so only the snippet form can credit
  them.

### Check 4. Padding: pass

Over 10 tasks with DIR and CO padding: the floor order equals the independent order in 20 of 20
cases; each of 5 arms' tails equals the floor order minus that arm's head in 100 of 100 cases;
9,981 tail items are rendered byte-identically to the floor's; 0 token-count mismatches; 128 arm
pairs with identical heads have identical tails.

### Check 5. Selection hygiene and held-out lock: pass, with minor clean-up

- No label or score file under arms/. No task commit SHA anywhere under arms/ except the stale
  arms/common/frozen-facts (old extractor version, a31924a), whose commits are all ancestors and whose
  `dropped` field is null on all 233 rows. Harmless, but it should be deleted.
- Source store: 56 trees, 13,376 entries and 1,162 blobs, all equal to git. Trees exist for 8dafcecc
  (a held-out-only parent, written at 16:37:00), a31924a and d683faa4 (a parent with no task). These
  are source text, not labels, but whoever wrote them should say why.
- arms/relational/db holds stores for TUNE parents only (stale).
- The held-out lock refused every attempt for all 8 arms (relational, reference, search, ladybug,
  duckpgq, none, floor-dir, floor-co): no flags, allow without a hash, wrong hash, a correct hash
  that was never frozen, tq with split heldout, and tq with held_out and allow. Also refused: a
  direct loadTasks call, a forged Symbol token, and the diagnostic tq.js of relational, ladybug and
  duckpgq. results/frozen does not exist.

### Check 6. Leak re-run with access logging: pass

Each of the four arms ran its own 40-entry stage-1 list on the same 30 TUNE tasks (20 T1, 10 T2; 6
parents) inside graphtest:1, with no network and with /build/sealed replaced by an empty tmpfs
(the script printed "sealed visible entries: 0").

| Arm | Exit | Wall time | Logged accesses | Sealed paths | Audit paths | Foreign commit SHAs | Facts folders read | Answers equal to the stored stage-1 answers |
|---|---|---|---|---|---|---|---|---|
| relational | 0 | 69 s | 5,761 | 0 | 0 | 0 | the 6 task parents only | 1,200 of 1,200 |
| search | 0 | 15 s | 586 | 0 | 0 | 0 | the 6 task parents only | 1,200 of 1,200 |
| ladybug | 0 | 48 s | 6,976 (7 processes) | 0 | 0 | 0 | the 6 task parents only | 1,200 of 1,200 |
| duckpgq | 0 | 50 s | 1,205 | 0 | 0 | 0 | the 6 task parents only | 1,200 of 1,200 |

- "Foreign commit SHA" means any hex run of 12 to 40 characters, in a path, a git argument or a file
  path inside engine SQL or Cypher, that matches a repository commit other than the 6 parents.
- The only git calls are `git archive` of the 6 parents (relational, search and ladybug). duckpgq
  made none, because it ran after the source store was filled in the same volume.
- The engines opened only their own store files: SQLite files, the Ladybug database and its CSV
  imports, the DuckDB file and its CSV imports, all under the run's store folder.
- The arms read the parent's whole tree from the `git archive` export (including docs/ and .claude/
  as they were at the parent). That is the world as it stood before the task commit, so it is
  allowed.
- The first ladybug attempt failed at once because of my preload, not the arm. Ladybug's Connection
  checks `database.constructor.name === "Database"`, and my wrapper class was anonymous. I named the
  wrapper `Database` and re-ran ladybug alone with leak_one.sh (log: leak_ladybug.log). The other
  three arms are from the first run (leak.log).
- Every answer of the re-run is byte-identical (timings stripped) to the stored stage-1 answers in
  results/relational/tune, results/search/tune, results/ladybug/stage1/ladybug/tune and
  results/duckpgq/tune. So those stored results were produced without access to the sealed folder.

### Check 7. Relational versus reference strict cross-check: 3 of 500 fail

- 500 pairs, 0 errors, 12 s. Agreement: khop 248 of 248, budget 94 of 94, metapath with emit end
  79 of 79. Failures: 3 metapath pairs with emit all, direction dependencies and hub none (T1-0114
  hybrid degnorm+text+text minConf 0.75; T1-0019 hybrid ppr+degnorm; T1-0109 degnorm with pad DIR).
- Reach sets, hops and explanation paths are identical, and the relational query paths (closure or
  not, CTE or level-wise) agree among themselves. Only the scores differ.
- Cause: in metapath mode a DAG arc may follow a step whose `dir` is against `cfg.direction`, so its
  source u can have od(u) = 0 under cfg.direction (SPEC 8.1). SPEC 8.1 does not say what to do then.
  - The reference arm (arms/reference/ref.js line 257) and the ladybug arm (arms/ladybug/lb.js
    scoreFor) divide by zero and get NaN or Infinity, which serialises as a null score and
    corrupts the sort comparator.
  - The relational arm (arms/relational/queries.js degnorm_level) gets SQL NULL from a/0, and SUM
    skips it.
  - The duckpgq arm (arms/duckpgq/pgq.js degnorm) has no q_od row for u, and the inner join drops
    the term.
  - Measured with degnorm alone on the 3 pairs: 4 of 99, 53 of 239 and 145 of 553 nodes differ.
- This only touches metapath traversal with direction other than both and degnorm or hybrid
  containing degnorm. Stage 1 does not combine them, but stage 2 could, so it biases a result.
  Fix: define od(u) for this case in SPEC 8.1 (for example count the arcs of u under every
  orientation the metapath steps allow, or skip the term when od(u) = 0) and make all four arms
  follow it.

## Verdict

The phase A defects are closed: the facts leak, the extractor gaps, the scorer, the padding, the
held-out lock and access to sealed files. The harness is ready to score stage 1. Before stage 2 may
select a metapath configuration that has a direction other than "both" and a degnorm or hybrid
ranking, SPEC 8.1 must define od(u) = 0 and all four arms must follow that definition. The
alternative is to keep stage 2 from selecting such configurations.

## Requests to other lanes

- Harness or spec owner: define degnorm when od(u) = 0 under metapath traversal (SPEC 8.1), and align
  reference, relational, ladybug and duckpgq.
- Arms owners: delete the stale arms/common/frozen-facts and arms/relational/db.
- Whoever filled the source store: say why trees exist for 8dafcecc (held-out-only parent) and
  d683faa4 (no task).
- Facts owner (optional): key the co-change drop on real task commits instead of all children on main.

## Deviations

- Several facts checks read facts at parents whose tasks are all held-out:
  - The co-change recomputation of check 1 used a60a0a69, 01ac9e84, 6c2ef824, 19e80c01, 8dafcecc
    and a31924a, all of them held-out parents.
  - The check 2 diff, hand reading and recall probes used a31924a, because that is where the old
    frozen facts exist to diff against.
  - The check 2 SQL checks used a31924a, 6c2ef824 and c27bb399 (held-out parents) plus the TUNE
    parents (c2_sqlcheck_tune.json).
  Checking facts at the parents the test will be scored on is the point of a leak audit. These checks
  read facts files and git objects only; they read no reference and score no answer at those
  parents, and no arm ran on a held-out task. A reader who wants the held-out parents untouched by
  any process should note this.
- To reproduce the old scoring rule and the old frozen facts, a31924a was exported with
  `git archive` into build/tmp/audit-fixes/exp-a31924a. The export was deleted afterwards.
- Host-side analyses (c1, c2, c3, c4, c5, c6_analyse) read result files, facts and git objects only.
  No arm ran on the host for a reported result.
- Some TUNE scores were computed for the hand-scoring and form checks. They are kept here only and
  are not arm-versus-arm results.
- The leak re-run hides sealed/ behind an empty tmpfs, so a read attempt would fail and also be
  logged. accesslog2.js sees Node-level file calls, child processes and file paths quoted inside
  SQL or Cypher text. It cannot see a file a native engine opens by itself without the path
  appearing in the query text.
- The ladybug part of check 6 was run a second time on its own, after a fix to my preload (see
  check 6). Its stores went to /store/leak1 on the same volume; all leak stores were deleted after
  the runs. The volume gt-audit-fixes still holds the source store /store/src from check 7.
- c5_hygiene.js's own source-store verification assumed git blob hashes and is wrong. c5_srcstore.js
  replaces it.
