# Pre-flight audit of the held-out run (graph2): re-audit 3, 2026-11-13

This audit came after pre-flight fix round 2 (`arms/common/harness.js`, `arms/common/tqtarget.js`,
`arms/ladybug/tq.js`, `bench/lib.js`) and the grader's re-freeze at 2026-11-12T21:55Z (02:55 local). All
evidence is in `r3/`. Re-audit 2 follows below, unchanged.

## Verdict

**The held-out run may start.** Checks 1 to 9 pass, and no defect blocks the held-out run.
- ready_for_heldout: **true**.
- bench_ready: **true** (check 10).

Rules kept: no arm ran on a held-out task or question; no file outside `audit/preflight/` was changed;
every arm process ran in `graphtest:1` (`--cpus 6 --memory 4g`, tmpfs over `/build/sealed`, repository
read-only); stores on my own volume `gt-preflight3` (deleted at the end) or in the container; the arm
volumes gt-relational, gt-ladybug, gt-duckpgq and gt-search were only mounted read-only; the postiz
containers were not touched. Image `graphtest:1` id sha256:45dc84c895a0... (created 2026-11-12 08:51 UTC).

## Checks

1. **Lock: pass.**
   - `r2/hashcheck2.js` -> `r3/hashcheck3.json`: `code_hash` recomputed for all 17 records (13
     configurations, 4 question records): 17 of 17 equal, file lists equal, arm field equals folder, every
     configuration hashes to its file name, roles as in addendum 4. No file under `arms/` changed after the
     freeze. (My own deps closure also follows `common/selftest.js` and `crosscheck*.js`, which reach
     `relational/db.js` etc.; those are test tools, not on the run path. The run-path closure,
     `reqclosure.js` -> `r3/reqclosure3.json`, from run.js, each arm.js and tq.js, is fully covered by
     `code_hash` plus `deps_hash` for all 7 arms.)
   - Lock test on a throw-away copy in the container (`r3/run_lock3.sh`, log `r3/run_lock3.log`):
     `r2/locktest2.js` -> `r3/locktest2_r3.json`: 85 of 85 declared set runs and 4 of 4 question runs
     allowed; 357 of 357 undeclared (arm, hash) pairs refused (every list configuration not declared for
     that arm, and every frozen hash under each wrong arm); 30 of 30 special tests pass (T5, unknown set,
     draw misuse, GT_RESULTS override, `--limit`, missing `--frozen-hash`, record naming another arm, code
     edits in common/ and in required files of other arms, added file, visible sealed/, missing live
     record, existing answer file); with `SCORING_STARTED` 89 of 89 runs and the freeze are refused.
   - `r3/locktest3_extra.js` (26 tests on what round 2 changed): `tq_hold.hold = true` refuses all 4
     question lock-checks and the `tq` run itself; `hold = false` allows them; edits to
     `common/harness.js` and `ladybug/tq.js` refuse the arms they cover and not others; `relational/sweep.js`
     refuses ladybug via deps; role rules on freeze; two sets, `--tasks`, `--tasks-jsonl` and a wrong
     `--frozen-hash` on a held-out run refused. 25 of 26 matched my matcher; the 26th (search with the S1
     hash) exited 2 with "no configuration with hash ... in the lists of arm search", a refusal my
     matcher did not recognise, not a defect.
   - The real `results/heldout/` held only its 3 empty folders before and after.
2. **Plan: pass.** `r2/plancheck2.js` -> `r3/plancheck3.json`: 85 set runs wanted, 85 present, none
   missing, none extra, task counts 418/82/237/25/8, commands, output paths and lock checks exact; 4
   question runs (relational, ladybug, duckpgq, search; 30 questions each); no unused frozen record.
   PLAN `configurations` and `question_runs` equal the 17 live records in arm, role, hash, code_hash and
   deps_hash; every run's role equals its record's. `tq_hold.hold` is false; the template hides both
   `/build/sealed` and `/build/audit`.
3. **Selection: pass.** `../selection/myscore.js` re-scored every TUNE answer into `r3/scores/` (14 s);
   the table is byte-identical to re-audit 2's (no TUNE answer file changed since 2026-11-12 23:20 local).
   `myselect2.js` (amended rule) -> `r3/selection3.json`: relational, ladybug, duckpgq primary
   95e990307da3b42b (T1 TUNE 0.7853, complexity 2, the only configuration at that key); search
   e70177e5807f0252 (0.7593, complexity 3); floor-dir 714a474060653c1f (0.7191); floor-co
   c4d2f0a60a3d199c (0.7521); S1 6b70cc1222745385 (0.7681); S2 ladybug f233ae069bdba0ce (0.7862), search
   950c029615d337c1 (0.7644). All frozen records match.
4. **Removed-document path: pass.** 15 fresh TUNE variants (`r2/make_variants2.js`, seed 4049: 12 T1, 3
   T2, distinct parents, 5 also remove a code file; at most 1 task overlaps an earlier audit's draw),
   run by `r3/run_r3.sh` for all 13 frozen (arm, configuration) pairs:
   - relational, ladybug and duckpgq equal the reference arm on 15 of 15 packed answers and ranked-list
     hashes, for 95e990307da3b42b and for 6b70cc1222745385 (`r3/removed_check3.json`);
   - a removed path occurs (whole-path match) in 0 answers of all 13 runs; the stored answers held a
     removed path in 15 of 15 tasks for the typed runs and 5 of 15 for search and floors, and exactly those
     answers changed;
   - search text probe (`r3/removed/search_probe.json`): 20 removed paths, 0 failures: each is in the
     search tree without removal and absent from the tree, the line index, the arm's grep and BM25 with
     it; a unique line of each of the 5 removed code files is found before removal and not after.
5. **Inputs: pass.** `inputs.js` -> `r3/inputs3.json`: T1 418 tasks (70 parents), T1x 82 (9), T2 237
   (47), T3 25 (4), T4 8 (4); 74 distinct parents, every one with facts of extractor 59da7b753a4d908e,
   every seed in its parent's facts; no leak. `facts/tools/verify_cache.js`: 190 folders, 0 failures, no
   task or drop label, no missing parent. No file under `facts/` or `tasks/` changed since re-audit 2.
   All 33 held-out T3/T4 tasks carry `remove_paths`.
6. **No held-out content: pass.** `r2/scan2.js` -> `r3/scan3.json` (6,354 files, 12.76 GB under results/,
   tmp/, arms/, bench/, sealed/grader/): held-out task ids only in `tmp/lock/inputs_check.json` (an input
   check); "split heldout" lines only in `tmp/lock/fakebuild` (relabelled TUNE ids) and parse/lock logs;
   0 held-out question answers; held-out question text only as shared 60-character openings (0 matches
   at 120 characters; `results/bench/smoke/plan.json` holds question ids 1 to 20 only); held-out task
   commits only in `tmp/facts-fix/before/` (history of the frozen commit). `results/heldout/` holds no
   file. The arm volumes hold no store, prior or tree of any of the 74 held-out parents (read-only listing),
   and `arms/ladybug/priors/` holds 54 files: 53 TUNE parents and the frozen commit (TQ and T5 parent).
7. **Questions: pass.** `r2/tq_static.js` -> `r3/tq_static3.json` (no arm run): all 50 questions parse,
   all 8 kinds dispatched by all 4 arms, every held-out target exists in the frozen facts; question 40
   now resolves to `#JobDetail` (asked `#JobDetail.evidence`). `r3/tq_setting_static.js` computes, from the
   facts, the answer the SQL queries and the LadybugDB query would give to each setting question: equal
   for all 6 (2 TUNE, which match the stored answers of all 3 typed arms, and 4 held-out, including 47).
   Probe run (`r3/probe_run3.json`, 11 probes: 901 to 909 of fix round 2 plus my 952 and 958, absent
   members of tests_reach and change_reach targets; none is a held-out target): the 3 typed arms are
   identical on 11 of 11; 904 gives `technician-app/src/lib/config.ts::EXPO_PUBLIC_API_URL` in all three
   (D-LB47 fixed); 952, 958 and 908 equal the stored TUNE answers of questions 2, 8 and 4 in every typed
   arm (the cut-back rule works in all three kinds); no arm, search included, raised an error.
8. **Regression: pass.** 30 TUNE T1 tasks (seed 5150, `r3/regress/ids.txt`; at most 4 overlap any earlier
   draw) for all 13 pairs: 390 of 390 answers identical to the stored TUNE answers (fields `ms`,
   `engine_ms`, `config_name`, `meta` set aside); `meta` differs only in LadybugDB `query_ms`/`queries`
   and DuckPGQ `prep_ms`/`setup_ms` (timing and cache counters). 20 TUNE questions identical for
   relational, ladybug, duckpgq and search (80 of 80, every field but `ms`). Heal (the 15 variant tasks
   without removal on the same volume): 195 of 195 identical.
9. **Hiding: pass.** `hide.js` in graphtest:1 with the tmpfs (`r3/hide3.json`): `/build/sealed` lists
   empty; 1,035 read attempts (345 sealed files, 3 path spellings each) all ENOENT; `umount` refused
   (no privilege, although uid 0); 6,907 files outside sealed/ scanned, the only reference-marker hit is
   `hide.js` itself. Positive control without the tmpfs: 15 entries listed, a read succeeds, and
   `run.js tq` refuses because sealed/ is visible.
10. **Benches: pass.** `bench/` (outside `arms/`) ran end to end as it stands after fix round 2
    (`r3/bench5.sh`, the order of `run_all.sh`, 5 seeds, 5 calibration seeds, 5 cold samples, 5 update
    files, pinned CPUs 12,14,16,18,20,22, 6 CPUs, 4 GB, sealed hidden; output `r3/bench5/`, log
    `r3/bench5.log`). Every step exited 0; wall time 391 s; plan hash d185eb59a0999064 (same as re-audit
    2); `check.js` 0 problems; `update.js` 0 problems per engine; arms priors 54 -> 54, source trees 56 ->
    56. `summary.md` covers the classes primary, S1, the 2-hop base 8067b9cf65e59b2f, LadybugDB S2 and the
    20 TUNE question lookups on both graphs; thread candidates 1, 2, 4, 6 with calibration and a chosen
    best (1 thread was best everywhere, so the 1-thread and best rows coincide); warm, warm-uncached and
    cold (median / 95th percentile); API, application and round-trip time apart; statements and query-text
    length per class; store build time (3 builds) and bytes; the one-file update; postiz `docker stats`
    before and after each step (48 lines); and the four item-20 labels, including round 2's "where the
    frozen primary's ranking runs" (not in the engine for LadybugDB). Inputs are TUNE only.

## Defects (none blocks the held-out run)

- **Minor: a stale-looking DuckPGQ store will serve the held-out questions.** `gt-duckpgq` holds
  `duckpgq/a31924a3818f4ac94b695906d107c72c912792b2-28870c30.duckdb`, built 2026-11-12 16:35 UTC, 3
  minutes before the last change to `arms/duckpgq/store.js` (16:38 UTC), with the same store version
  D2; the arms reuse a store by file name only (DuckPGQ also checks sha and counts). I built a fresh store
  with the frozen code and compared (`r3/store_cmp.js`, `r3/store_cmp_duckpgq.json`): same file name, 54
  tables in both, 0 tables differ (row count and row-hash sum), meta differs only in 5 build timings. So
  no answer changes. Fix (optional): bump a store version or delete arm-volume stores before the run, or
  have each arm compare the store's canonical hash with the loaded graph's.
- **Minor (latent, no question affected): LadybugDB `setting_readers` groups evidence lines.** In
  `arms/ladybug/tq.js` line 143 the second `WITH` groups by (source, evidence path) without the line, so a
  non-definition source that reads one setting inside two different definitions would get one label
  where SQL gives two. At the frozen commit no reads_setting group has more than one distinct enclosing
  label (0 of 32), so no TUNE or held-out answer can differ. No change before the run (it would change
  the code hash for no effect); record it as a translation limit.
- **Minor: inputs are not hash-locked.** The lock covers code, not `tasks/*.jsonl` or `facts/cache/`.
  They are unchanged since re-audit 2; `r3/input_hashes.json` (written by `r3/input_hashes.js`) records
  sha256 of tasks.jsonl (89a45cb3...), tq_questions.jsonl (f70f179a...), parents.txt and a digest per
  facts folder of the 74 held-out parents and the frozen commit (overall cfbc4964...). Fix: the runner
  re-runs it before the first entry and after the last and diffs.
- **Minor (carried over): the question hold is only honoured for question runs and only when it is the
  JSON boolean `true`.** A set run is allowed while `hold` is true; the string `"true"` holds nothing.
  Moot while `hold` is false.
- **Minor (carried over): the grader's T3/T4 absence check does not exist yet** in `sealed/grader/`;
  when written it must match whole paths (`CLAUDE.md` occurs inside a HANDOFF section title at parent
  1c546a3106). Owner: grader, before scoring.
- **Observation, not a defect:** held-out question 32 and TUNE question 12 have the same other_half
  target (`JobService.transition`), so every typed arm's held-out answer to 32 equals its TUNE answer to
  12 while the reference answers differ. The typed queries depend on the target only, by design.

## Re-running (from `audit/preflight/`, build root B)

- `node r2/hashcheck2.js B r3/hashcheck3.json`; `node reqclosure.js B r3/reqclosure3.json`
- `bash r3/run_lock3.sh` (inside the container; uses `r2/locktest2.js` and `r3/locktest3_extra.js`)
- `node r2/plancheck2.js B r3/plancheck3.json`
- `node ../selection/myscore.js B r3/scores`; `node myselect2.js B r3/scores r3/selection3.json`
- `node r2/make_variants2.js B r3/removed 4049`; `node r3/make_ids3.js B 5150`
- `bash r3/run_r3.sh` (inside the container, volume gt-preflight3); then `node r3/compare_removed3.js B
  r3/removed_check3.json`, `SUB=regress SET=T1 node r3/compare_regress3.js B r3/regress_check3.json`,
  `SUB=heal SET=T1|T2 ...`
- `node inputs.js B r3/inputs3.json`; `node ../../facts/tools/verify_cache.js`; `node r2/scan2.js B r3/scan3.json`
- `node r2/tq_static.js B r3/tq_static3.json`; `node r3/tq_setting_static.js B r3/tq_setting_static.json`;
  `node r2/probe_run.js r3/probe_questions3.jsonl r3/probe_run3.json` (inside the container)
- `node hide.js r3/sealed_list.txt r3/hide3.json` (inside the container, with the tmpfs)
- `node r3/store_cmp.js /old/duckpgq/<file> r3/store_cmp_duckpgq.json` (container, gt-duckpgq read-only at /old)
- `node r3/input_hashes.js B r3/input_hashes.json`; `bash r3/bench5.sh` (host)

---

# Pre-flight audit of the held-out run (graph2): re-audit 2, 2026-11-13

This audit came after pre-flight fix round 1 and the grader's re-freeze at 2026-11-12T21:02Z. All evidence
for it is in `r2/`. The first audit's scripts and evidence stay in this folder; its summary is at the end.

## Verdict

**The held-out run must not start yet.** Checks 1 to 6, 8 and 9 pass. Check 7 fails on 2 of the 30 held-out
questions:
- Question 47: LadybugDB will answer `["::"]`, while the relational and DuckPGQ arms answer
  `["src/shared/lib/api.js::VITE_API_URL"]`.
- Question 40: the typed arms resolve the question to a node that does not exist, so they answer it empty.

`results/frozen/PLAN.json` also still has `tq_hold.hold = true`. While that hold is on, no LadybugDB entry
and no question entry may run. Either fix changes frozen code, and a change to shared code would make any
earlier set run stale. So both findings have to be ruled on before the first set run of any arm.

- ready_for_heldout: **false**.
- bench_ready: **true**. The benches ran end to end with 5 seeds, and the one-file update measure now
  exists. One labelling gap remains (minor).

Rules kept during this audit:
- No arm ran on a held-out task or held-out question.
- No file outside `audit/preflight/` was changed.
- Every arm process ran in `graphtest:1` with `--cpus 6 --memory 4g`, with a tmpfs over `/build/sealed` and
  the repository mounted read-only.
- Stores were on my own volume `gt-preflight2`, which I deleted at the end, or on the container
  filesystem.
- The postiz containers were not touched.

## Checks

1. **Lock: pass.**
   - `r2/hashcheck2.js` recomputed `code_hash` for all 17 frozen records independently. 17 of 17 match. The
     file lists match. The arm field matches the folder. Each configuration hashes to its record name.
   - `deps_hash` was recomputed from the files each record lists: 17 of 17 match.
   - `reqclosure.js` walks the require closure from run.js, every arm.js and every tq.js. Every file it
     reaches is covered by `code_hash` or `deps_hash`.
   - No file under `arms/` is newer than the re-freeze. The LadybugDB priors folder still holds 54 files.
   - `r2/locktest2.js` (run by `r2/run_lock.sh` on a copy of the harness in `/tmp/fake` inside the
     container) gave these results:
     - 85 of 85 declared set runs and 4 of 4 question runs are allowed.
     - 357 of 357 undeclared (arm, hash) pairs are refused. That covers every list configuration and every
       frozen hash under a wrong arm.
     - 30 of 30 special tests pass: T5, LB_COMM_DRAW misuse, a GT_RESULTS override, `--limit`, a missing
       `--frozen-hash`, a record that names another arm, edits to `common/packer.js`,
       `common/tqtarget.js`, `relational/schema.sql`, `reference/ref.js`, `ladybug/stage2.json` and
       `relational/tq.js`, an added .js file, a visible sealed folder refusing `run` and `tq`, a missing
       live record (only the `_replaced` copy left), restores, and an existing answer file.
     - With `SCORING_STARTED` present, 89 of 89 runs and the freeze command are refused.
   - On the real tree, every `lock_check` command in PLAN.json prints `allowed` (89 of 89;
     `r2/run_probe_lc.log`). `results/heldout/` held 0 files before and after.
2. **Plan: pass.**
   - `r2/plancheck2.js` compares PLAN.json with addendum 4 section B. It finds 85 set runs, none missing and
     none extra.
   - Task counts per set are 418, 82, 237, 25 and 8.
   - Commands, output paths and lock checks are as expected.
   - There are 4 question runs and no extra frozen record.
   - PLAN.json `configurations` and `question_runs` match the 17 records in arm, role, hash, code_hash and
     deps_hash.
3. **Selection: pass.**
   - `audit/selection/myscore.js` re-scored every TUNE answer into `r2/scores/`. The table is identical to
     the first audit's; no TUNE answer file has changed since 2026-11-12 23:20 local.
   - `myselect2.js` applies the amended rule. Primary for relational, LadybugDB and DuckPGQ:
     `95e990307da3b42b`, T1 TUNE 0.7853, complexity 2, the only configuration at that key.
   - Search primary: `e70177e5807f0252`, 0.7593.
   - S2: LadybugDB `f233ae069bdba0ce` (0.7862) and search `950c029615d337c1` (0.7644).
   - S1: `6b70cc1222745385` (0.7681).
   - Floors: floor-dir `714a474060653c1f` (0.7191) and floor-co `c4d2f0a60a3d199c` (0.7521).
   - Every frozen primary, S1 and S2 record matches these.
4. **Removed-document path: pass.**
   - `r2/make_variants2.js` drew 15 fresh TUNE variants with seed 31337 (12 T1 and 3 T2, distinct
     parents). Only 1 task overlaps the first audit's draw. Five variants also remove a code file.
   - Results (`r2/compare_removed2.js`, `r2/removed_check.json`):
     - Relational, LadybugDB and DuckPGQ equal the reference arm on 15 of 15 packed answers and ranked
       lists, for both `95e990307da3b42b` and `6b70cc1222745385`.
     - A removed path appears in 0 answers across all 13 runs.
     - Typed answers changed in 15 of 15 tasks. Search and floor answers changed in the 5 tasks with a
       code-file removal.
     - My first matcher was a substring test, and it flagged 5 false positives (`README.md` inside
       `backend/README.md`). The whole-path matcher shows 0.
   - Search text probe (`r2/removed/search_probe.json`): 20 removed paths, 0 failures. Unique lines of the
     5 removed code files are found before removal and are absent from the tree, the grep and BM25 after
     removal.
   - Held-out T3 and T4 removals were checked on the facts. No node outside the removed document names it,
     except one HANDOFF section title at parent 1c546a3106 that mentions CLAUDE.md, which is legitimate.
     Edges touching removed nodes go with them.
5. **Inputs: pass.**
   - `inputs.js` found these sets (tasks, distinct parents):

     | set | tasks | parents |
     |---|---|---|
     | T1 | 418 | 70 |
     | T1x | 82 | 9 |
     | T2 | 237 | 47 |
     | T3 | 25 | 4 |
     | T4 | 8 | 4 |

     That is 74 distinct parents in all.
   - Every parent has facts with extractor `59da7b753a4d908e`, and every seed is in its parent's facts.
   - No leak was found.
   - `facts/tools/verify_cache.js` checked 190 folders: 0 failures, no task or drop label, no missing
     parent.
6. **No held-out content: pass.** `r2/scan2.js` read 6,286 files (12.75 GB) under results/, tmp/, arms/,
   bench/ and sealed/grader/. It also checks whole JSON documents, and the commits of the 38 held-out
   tasks that are not themselves a parent.
   - Held-out task ids appear only in `tmp/lock/inputs_check.json`, an input check.
   - "split heldout" lines appear only in `tmp/lock/fakebuild` (relabelled TUNE ids) and in
     `tmp/lock/preflight1/tq_parse_check.json`, which holds question targets parsed from text, not answers.
   - 0 held-out question answers.
   - Held-out question text appears only as 60-character prefixes, never as 200 characters of a held-out
     question.
   - Held-out task commits appear only in `tmp/facts-fix/before/` (old facts of the frozen commit, whose
     history naturally includes them; no arm reads tmp/).
   - `results/heldout/` holds no file.
7. **Questions: FAIL.**
   - `r2/tq_static.js` runs no arm. It applies the shared parser `common/tqtarget.js` (a pure function of
     the question text) and looks every target up in the frozen commit's facts:
     - All 50 questions parse.
     - All 8 kinds are dispatched by all 4 arms.
     - Held-out question 40 resolves to `sym:backend/app/features/jobs/schemas.py#JobDetail.evidence`,
       which is missing; the nearest existing node is `#JobDetail`.
     - Held-out question 47 (`{env: VITE_API_URL}`) has exactly 1 reader, `file:src/shared/lib/api.js`
       line 13, with no enclosing function, method or constant. That is the case where LadybugDB answers
       `::`.
   - `r2/probe_run.js` ran the 7 probe questions (901 to 907; none shares a target with a held-out
     question) through the 4 arms. The typed arms are identical on 6 of 7. On probe 904, LadybugDB gives
     `["::"]`, while relational and DuckPGQ give `["technician-app/src/lib/config.ts::EXPO_PUBLIC_API_URL"]`.
   - So LadybugDB will give a wrong answer to held-out question 47, and the typed arms will give an empty
     answer to question 40.
8. **Regression: pass.**
   - `r2/run_r2.sh` and `r2/compare_regress2.js` re-ran 30 TUNE T1 tasks (seed 777; 3 overlap the first
     audit's draw) for all 13 frozen (arm, configuration) pairs. 390 of 390 answers are identical to the
     stored TUNE answers. Only `meta` timing and diagnostic fields differ: DuckPGQ `prep_ms`, LadybugDB
     `query_ms` and `queries`.
   - The 20 TUNE questions are identical for all 4 arms (80 of 80).
   - The source-store fix holds:
     - The same volume first served the removal loads.
     - The 15 variant tasks re-run without removal ("heal") then gave 195 of 195 answers identical to the
       stored ones (13 pairs x 15 tasks), LadybugDB `f233ae069bdba0ce` included.
     - The first audit had 5 of those 30 differing.
9. **Hiding: pass.** `hide.js` ran in graphtest:1 with the tmpfs:
   - `/build/sealed` lists empty.
   - 1,017 read attempts (339 files, 3 path spellings each) all fail.
   - `umount` is refused.
   - Of 6,717 files scanned outside sealed/, the only reference-marker hit is `hide.js` itself.
   - Positive control without the tmpfs: 15 entries are visible and a read succeeds.
   - The harness also refuses `run` and `tq` while sealed/ is visible (check 1).
10. **Benches: pass.** `r2/bench5.sh` ran the unchanged bench code in the order of `run_all.sh`, with 5
    seeds, 5 calibration seeds, 5 cold samples and 5 update files, on the pinned CPU set
    12,14,16,18,20,22. It wrote to `r2/bench5/`.
    - Every step exited 0 (wall time 840 s).
    - `check.js` reports 0 problems, and update.js reports 0 problems for each engine.
    - The plan hash is d185eb59a0999064.
    - The arms priors folder stayed at 54 files and the source store at 56 trees.
    - Covered:
      - classes: primary, S1, the 2-hop base `8067b9cf65e59b2f`, LadybugDB S2, and the 20 TUNE question
        lookups;
      - thread settings 1, 2, 4 and 6, with calibration and a chosen best;
      - warm, warm-uncached and cold;
      - API, application and round-trip time;
      - statements and query text per class;
      - store build time (3 builds) and size;
      - the one-file update, now present (`bench/update.js`);
      - postiz `docker stats` before and after each step;
      - the item-20 labels, printed in every engine JSON and in summary.md.
    - Plan inputs are TUNE only (prep.js refuses a held-out question).

## Defects

- **D-LB47 (blocks the held-out run).**
  - Where: `arms/ladybug/tq.js` line 141,
    `min(f2.path + '::' + ${SUF('f2.sid')}) AS enc`.
  - The defect: when the OPTIONAL MATCH finds no enclosing definition, LadybugDB yields `'::'` instead of
    NULL, so `coalesce(enc, ep + '::' + sn)` never falls back. Held-out question 47 is that case.
  - Why it blocks: a translation that should be identical (addendum 3 item 19) gives a known wrong answer.
    A wrong-answer defect does not qualify for a repeat after scoring (addendum 4 item 12). The fix
    changes LadybugDB's code hash, which covers all of LadybugDB's set runs.
  - Fix:
    1. Change the line to
       `min(CASE WHEN f2 IS NULL THEN NULL ELSE f2.path + '::' + ${SUF('f2.sid')} END)`.
    2. Re-run the 20 TUNE questions; they must stay identical.
    3. Re-run probes 901 to 907; the 3 typed arms must be identical on 7 of 7.
    4. The grader re-freezes LadybugDB's primary, s1, s2 and tq records and rewrites PLAN.json.
  - Owner: the LadybugDB arm lane, then the grader.
- **D-Q40 (biases a result: H4 on 1 of 30 questions, against the typed arms).**
  - Where: `arms/common/tqtarget.js` lines 51 to 54 (the other_half `Symbol (path` fallback), used by all
    4 tq.js files.
  - The defect: question 40 names `JobDetail.evidence` (a schema field, which has no node) and
    `JobService._detail`. The target is the missing field, so the typed arms answer `[]`.
  - Fix, the orchestrator decides before any set run:
    - either add one generic rule in the shared target step: when a parsed sid is absent, strip trailing
      `.member` parts to the nearest existing node (here `#JobDetail`). Then re-run the TUNE and probe
      questions, re-freeze all 17 records and rewrite PLAN.json;
    - or declare it a known limit and report H4 with and without question 40.
- **D-HOLD (blocks the held-out run).**
  - Where: `results/frozen/PLAN.json` `tq_hold` and rule 7.
  - The hold is still on, and rule 7 lets relational entries 1 to 5 run while it is on.
  - Why that is unsafe: the D-Q40 decision may change `common/tqtarget.js` or the relational and DuckPGQ
    tq.js files. That changes those arms' code hashes, which would leave earlier answer files under a
    superseded hash and refuse the remaining rows.
  - Fix:
    1. Hold all 89 entries until both findings are ruled on.
    2. Apply any fixes.
    3. Re-freeze.
    4. Rewrite PLAN.json with `hold: false`.
  - Owner: the orchestrator and the grader.
- **Minor.**
  - The question hold lives only in PLAN.json; `tqLockTest` does not enforce it.
  - The PLAN container template does not hide `/build/audit`, which holds TUNE per-task scores; the bench
    does hide it. Fix: add `--mount type=tmpfs,destination=/build/audit`.
  - The bench labels do not say that LadybugDB's frozen primary (degree-normalised spreading) and SQLite's
    unbounded walk run in application code ("not in the engine", addendum 2 item 20). Only a code comment
    in `arms/ladybug/lb.js` and bench/NOTES.md say it. Fix: add a per-class "where the ranking runs" label
    in `bench/lib.js` LABELS or the engine notes, so it shows in summary.md.
  - For the grader's own absence check on T3 and T4: match whole paths, not substrings.
    `CLAUDE.md` occurs inside a HANDOFF section title at parent 1c546a3106.

## Re-running (host Node for host scripts; graphtest:1 for arm runs; mount the build as the `C:/...` path, not `$PWD`)

- `node r2/hashcheck2.js <build> r2/hashcheck2.json`
- `node reqclosure.js <build> r2/reqclosure.json`
- `bash r2/run_lock.sh` (inside the container)
- `node r2/plancheck2.js <build> r2/plancheck.json`
- `node ../selection/myscore.js <build> r2/scores`, then `node myselect2.js <build> r2/scores r2/selection.json`
- `node r2/make_variants2.js <build> r2/removed 31337`
- `bash r2/run_r2.sh` (inside the container, on a fresh volume), then:
  - `node r2/compare_removed2.js`
  - `SUB=regress SET=T1 node r2/compare_regress2.js`
  - `SUB=heal SET=T1` and `SUB=heal SET=T2` with the same script
- `node inputs.js`
- `node ../../facts/tools/verify_cache.js`
- `node r2/scan2.js`
- `node r2/tq_static.js`
- `bash r2/run_probe_lc.sh` (inside the container)
- `node hide.js r2/sealed_list.txt r2/hide.json` (inside the container, with the tmpfs)
- `bash r2/bench5.sh` (from the host)

## Not done

- No held-out question or task was run, so the size of D-LB47 and D-Q40 on held-out F1 is not measured.
- The arm volumes gt-relational, gt-ladybug, gt-duckpgq and gt-search were not re-scanned this round.
  No lane has used them since the first audit's volscan, which found no held-out content.

## First audit (2026-11-13, before fix round 1), in short

- It found D-TQ: 7 held-out questions did not parse. Fix round 1 fixed it.
- It found D-SRC: the source tree was keyed by sha alone. Fixed, and confirmed by the heal test above.
- It found that the one-file update bench was missing. Added, and confirmed above.
- It found these minor issues: deps_hash did not cover .sql or stage2.json (fixed); the runner did not
  check the sealed tmpfs (fixed); the bench wrote into arms/ (fixed).
- Its scripts are the unprefixed files in this folder.
