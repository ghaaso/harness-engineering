# arms/common, arms/relational, arms/reference (shared harness and specification)

## Pre-flight fix, round 2 (2026-11-13)

Only TUNE tasks, the 20 TUNE questions and nine probe questions written by these lanes (ids 901 to 909,
split `probe`, `tmp/lock/preflight2/probe_questions.jsonl`) were run. Held-out question lines were read
only as text, to check which parsed targets the new rule changes; no arm answered any held-out question
or task. `sealed/` and `audit/` were never opened (every container mounted empty tmpfs over both).
Nothing was frozen. **Every frozen record (17 in all) is stale now** and the grader must re-freeze and
rewrite `results/frozen/PLAN.json`. Evidence and scripts: `tmp/lock/preflight2/` (`run_checks.sh`,
`run_checks.log`, `check.json`, `probe.json`, `parse_check.json`, `hold_test.json`, `locktest.json`,
`locktest.log`, `code_hashes.json`, `nopath_check.json`). Docker volume used: `gt-preflight2` (stores
and source trees only; can be removed).

### What changed (four files with code, plus notes)

1. **`arms/ladybug/tq.js`, setting_readers (D-LB47, blocked the held-out run).** The enclosing-definition
   label is now `min(CASE WHEN f2 IS NULL THEN NULL ELSE f2.path + '::' + ... END)`. LadybugDB's string
   `+` treats NULL as an empty string, so a top-level read gave `'::'` and the fallback to `path::NAME`
   never ran. Probe 904 (the case behind held-out question 47) now gives the same answer in all three
   typed arms.
2. **`arms/common/tqtarget.js`, absent members (D-Q40, biased a result).** Option 1 of the audit was
   implemented: a symbol target (tests_reach, change_reach, other_half) that is not a node of the frozen
   commit's canonical graph (the graph every arm loads) is cut back one trailing `.member` at a time to
   the nearest existing node; the original is kept in the target as `asked`; an existing target is never
   changed; when no prefix exists the target stays as it was. `parse()` is the round-1 parser,
   unchanged; `target()` = `parse()` plus this rule. The rule is applied once, in the shared parser, so
   every arm receives the same target. Result of `parse_check.js` (59 question texts: 20 TUNE, 30
   held-out, 9 probes): **0 TUNE targets changed; held-out: only question 40 changed**
   (`#JobDetail.evidence` to `#JobDetail`); probes: only 908 changed (as designed); still absent: only
   probe 909 (a file that does not exist). **If the orchestrator prefers option 2** (declare question 40 a
   known limit), revert `target()` to `return parse(q)`; nothing else depends on the rule.
3. **`arms/common/harness.js`, tqLockTest (minor, two lines).** A held-out question run is refused while
   `results/frozen/PLAN.json` has `tq_hold.hold === true`. A missing or unreadable plan does not refuse
   (the other checks still apply). Set runs (`lockTest`) are unchanged: the plan's hold on set runs is
   still enforced by the plan's text and the orchestrator.
4. **`bench/lib.js` (minor, one label).** Where the frozen primary's ranking runs, per engine (see
   `bench/NOTES.md`). Not an arm file; no code hash depends on it.
5. Notes: `SPEC.md` section 12 (the absent-member rule), `arms/ladybug/NOTES.md`, `bench/NOTES.md`.

### Proof (inside graphtest:1, `--cpus 6 --memory 4g`, sealed and audit hidden; `run_checks.log`)

- Self-test: 69 of 69 checks pass.
- **T1 regression**: 30 TUNE T1 tasks (seed 20261116, a fresh draw; ids in `regress/ids.txt`) through
  `run.js run` for all 13 (arm, configuration) pairs of addendum 4 (relational and reference
  95e990307da3b42b and 6b70cc1222745385; ladybug those two and f233ae069bdba0ce; duckpgq the two typed
  ones; search e70177e5807f0252 and 950c029615d337c1; floor-dir 714a474060653c1f; floor-co
  c4d2f0a60a3d199c): **13 of 13 runs give answers identical to the stored TUNE answers on 30 of 30
  tasks** (fields `ms`, `engine_ms`, `config_name`, `meta` set aside). `meta` differs only for ladybug
  6b70cc1222745385 and f233ae069bdba0ce, key `queries`, in 24 of 30 answers (the per-process PageRank
  cache count, as in round 1). Wall time of the 13 runs: 108 s.
- **TQ**: the 20 TUNE question answers are identical to `results/tq/<arm>.tune.answers.jsonl` for
  relational, ladybug, duckpgq and search (20 of 20 each, every field but `ms`; 0 errors).
- **Probes** (`probe.json`): no arm throws on any of the 9; the three typed arms are identical on
  **7 of 7** of probes 901 to 907 (round 1: 6 of 7, 904 differed) and on 908 and 909 too; 907 equals the
  merge of the stored TUNE answers of questions 7 and 15 in each typed arm; 908 (an absent member of
  `JobService.submit_completion`) equals 902 in each typed arm (non-empty, 227 characters of JSON); 909
  gives an empty answer and no error in each typed arm.
- **Hold test** (`hold_test.json`): 5 of 5 cases pass (hold true refused; hold false, no `tq_hold`, no
  plan and invalid JSON fall through to the next check). The real tree is refused today with the hold
  reason.
- **End-to-end lock test** re-run on a throw-away copy (`tmp/lock/preflight2/make_fake.js`, then the lock
  lane's `tmp/lock/locktest.js`): 63 of 63 steps pass (log 27 lines: 20 refused, 7 ok). The copy was
  deleted afterwards.
- Ladybug community priors: the runs read a copy; 54 files before and after; nothing written into
  `arms/ladybug/priors/`.

### Code hashes now (first 16 hex; `code_hashes.json`)

relational 3dbb1154988d12e1, reference 8ced4577b0e2c72f, ladybug 43c5ede03b1003a6, duckpgq
310a5902baa28d12, search edecff14904883c0, floor-dir 15403e5b8361cf6e, floor-co 35ccb421a487de4a. Every
arm's code hash changed (common/harness.js and common/tqtarget.js are inside every hash; ladybug also
tq.js). The deps hashes did not change.

### Not done here (other lanes' files)

- `results/frozen/PLAN.json` (grader and orchestrator): re-freeze all 17 records (each arm's primary,
  S1, S2 and crosscheck records plus the four `tq.json`), then rewrite the plan with `tq_hold.hold`
  false once the orchestrator accepts the two rulings; until then no entry should run (the auditor's
  D-hold: rule 7 still lets relational set runs start). Also add
  `--mount type=tmpfs,destination=/build/audit` to the plan's container template (minor).
- The grader's T3/T4 absence check in `sealed/grader/` should match whole paths with boundaries
  (minor; this lane may not open `sealed/`).
- Residual, not a defect found in any answer: LadybugDB's `LABEL()` would also give `'::name'` for a node
  with no path where SQL gives NULL. The frozen graph has 55 such nodes outside tests and the backend
  (setting 24, missing_ref 13, slice 8, ambiguous_ref 7, runtime 6, outbox_kind 1; 59 path-less nodes
  in all), but none of the 59 is the source of a `calls_url` or `calls` edge, which is all `LABEL()` is
  applied to (`nopath_check.json`: 0 such edges), and all 29 TUNE and probe question answers agree
  across the typed arms.

## Pre-flight fix, round 1 (2026-11-13)

Only TUNE tasks and TUNE questions were run, plus seven probe questions written by this lane (ids 901 to
907, split `probe`, in `tmp/lock/preflight1/probe_questions.jsonl`). Held-out lines were read only to
check that every held-out question now parses. `sealed/` and `audit/` were never opened. Nothing was
frozen: **every frozen record is now stale** (code and deps hashes changed) and the grader must re-freeze.
Evidence and scripts: `tmp/lock/preflight1/` (`run_checks.sh`, `run_checks.log`, `check.json`,
`probe.json`, `tree_test.json`, `tq_parse_check.json`).

### What changed

- **D-TQ, held-out question phrasings that did not parse (blocks the held-out run).** New shared parser
  `arms/common/tqtarget.js` (`target`, `routesOf`); `relational/tq.js`, `duckpgq/tq.js`, `ladybug/tq.js`
  and `search/tq.js` all use it (ladybug used to import the relational copy). The old patterns run first,
  so every target that parsed before is unchanged; fallbacks read the sentence before " Scope:":
  - other_half: `path::Symbol`, `Symbol (path)`, a code-like `Symbol (path` anywhere, else the first code
    path alone gives `{ path }` (the typed arms then start from every node of that file);
  - setting_readers: `settings.X` with an optional `env VAR` gives `{ name[, env] }`; "setting key X"
    with shop_setting gives `{ name: 'shop/X' }`; `config.a.b` gives `{ config }` (matched against the
    setting node's name); an upper-case env variable alone gives `{ env }`. When name and env are not
    both present, the typed arms build the condition from the fields that are present;
  - route_clients: every `METHOD /path` of the sentence; more than one gives `{ routes }`, answered one
    route at a time and merged (distinct, byte order).
  - A question with no target now throws, naming the question.
  Result (`tq_parse_check.json`): all 50 questions parse in every arm (before: 7 of 30 held-out
  questions failed in the typed arms, ids 24, 27, 33, 40, 41, 46, 47; 4 failed in search, ids 27, 33, 41,
  47). No TUNE target changed. No held-out target that parsed before changed in the typed arms. In
  search, held-out question 25 changed from the wrong env "setting" to FIXFLOW_LABOUR_RATE_PAISA.
- **source.js ensureTree (minor).** The tree cache no longer loses a document that a removal load left
  out: the tree is rebuilt when a wanted path is neither in it nor in `trees/<sha>.absent.json`, and the
  old keys are kept. `facts.js` passes every file and doc path of the graph (taken before the removal
  filter). `tree_test.json`: verdict ok (a full load after a removal load, and a full load over a partial
  tree written by the old code, both give the clean canonical hash; the healed tree holds the document).
- **deps_hash (minor).** Now also covers `*.sql` and `stage2.json` of the arm's own folder and of every
  folder it depends on (for example `relational/schema.sql`, `<arm>/stage2.json`). LadybugDB priors are
  deliberately not hashed: a held-out run adds prior files for new canonical graphs.
- **run.js (minor).** `run` and `tq` refuse (exit 2, "REFUSED: ... sealed is visible") when
  `<GT_BUILD>/sealed` lists any entry. A folder that cannot be listed counts as hidden.

### Proof that answers did not change (`run_checks.log`, `check.json`)

- Self-test: 69 pass, 0 fail. Sealed check: a visible sealed folder gave exit 2, an empty one exit 0.
- 30 TUNE T1 tasks (seed 20261115, a fresh draw) for each of the 13 (arm, configuration) pairs of
  addendum 4 (relational and reference: 95e990307da3b42b, 6b70cc1222745385; ladybug: those two and
  f233ae069bdba0ce; duckpgq: the two typed ones; search: e70177e5807f0252, 950c029615d337c1; floor-dir
  714a474060653c1f; floor-co c4d2f0a60a3d199c): 13 of 13 runs give answers identical to the stored TUNE
  answers on all 30 tasks (fields `ms`, `engine_ms`, `config_name`, `meta` set aside). The only `meta`
  difference: LadybugDB S1 and S2 report one more Cypher query (3 against 2) on 19 of 30 tasks, a
  diagnostic count that depends on which earlier tasks warmed the per-process cache (this run is 30
  tasks, the stored one ran the whole TUNE set).
- The 20 TUNE questions: identical to `results/tq/<arm>.tune.answers.jsonl` for relational, ladybug,
  duckpgq and search (20 of 20 each, 0 errors).
- Probe questions 901 to 907: no arm throws; the two-route probe 907 equals the merge of the stored TUNE
  answers of questions 7 and 15 in all three typed arms; typed arms identical on 6 of 7.

### Found, not fixed (reported to the orchestrator)

- **LadybugDB setting_readers when the reader is a file with no enclosing definition.** Probe 904
  (`{ env: EXPO_PUBLIC_API_URL }`; the reader is `file:technician-app/src/lib/config.ts`, line 14,
  outside any function) gives `["::"]` in LadybugDB and
  `["technician-app/src/lib/config.ts::EXPO_PUBLIC_API_URL"]` in relational and duckpgq. Cause: in
  LadybugDB `NULL + '::' + ...` is `'::'`, not NULL, so `min(f2.path + '::' + ...)` is `'::'` and the
  `coalesce(enc, ep + '::' + sn)` fallback never runs. The same happens in the old name-and-env form
  (`tmp/lock/preflight1/lb904.js`). No TUNE question reaches this case (no `"::"` in any stored TUNE
  answer). A fix (`min(CASE WHEN f2 IS NULL THEN NULL ELSE ... END)`) would change LadybugDB's held-out
  answers, so it was not made. Held-out questions 47 (`{ env: VITE_API_URL }`) and any other setting
  question whose reader is a top-level file read may be affected.
- **Held-out question 40** parses to `sym:backend/app/features/jobs/schemas.py#JobDetail.evidence`, a node
  that does not exist (only `#JobDetail` does), so the typed arms answer it empty.
- **The question-run hold** exists only in `results/frozen/PLAN.json`; `tqLockTest` does not enforce it.
  `PLAN.json` is not this lane's file.

## Held-out lock (lock lane, 2026-11-13, protocol addendum 4 sections B and D)

Only TUNE tasks were run. No held-out task or question was given to any arm; held-out lines of
`tasks/tasks.jsonl` and `tasks/tq_questions.jsonl` were read only to check that inputs exist. `sealed/` and
`audit/` were never opened (every container mounted an empty tmpfs over `/build/sealed`). Nothing was
frozen: the grader freezes. Changed files: `harness.js`, `run.js`, `sweep.js` (`--tasks-jsonl`; the
pairwise answer comparison now sets `meta` aside), `SPEC.md` section 12. Lane scripts and evidence:
`tmp/lock/`.

### What the lock does now

- **Frozen records keyed by (arm, configuration hash):** `results/frozen/<arm>/<hash>.json` = arm, hash,
  role (`primary`, `s1`, `s2` or `crosscheck`), the full normalised configuration, where it was found
  (list, stage, name), `code_hash`, `code_files`, `deps_hash`, `deps_files`, Node version, time.
  - `code_hash` = sha256 over the lines `"<folder>/<file> <sha256 of file>\n"`, sorted, for every
    `arms/<arm>/*.js` and `arms/common/*.js` (exactly addendum 4 item 13).
  - `deps_hash` (addition): the same over files of OTHER arm folders that the arm's code requires,
    followed transitively. Today: reference needs `relational/sweep.js`; duckpgq `relational/sweep.js`;
    ladybug `reference/ref.js`, `relational/sweep.js` (since pre-flight round 1 no longer
    `relational/tq.js`: every arm's target parser is `common/tqtarget.js`, inside the code hash; data
    files `*.sql` and `stage2.json` of those folders are hashed too); relational, search and the floors
    no code files.
  - `run.js freeze` refuses: no or unknown role; the reference arm with any role but `crosscheck`; role
    `crosscheck` on any other arm; a second configuration with the same role on one arm (except
    `crosscheck`); a record that exists and differs (unless `--refreeze --reason`, which moves the old
    record to `results/frozen/_replaced/`); anything once `results/heldout/SCORING_STARTED` exists.
    Freezing the same thing again prints "already frozen, unchanged". Every write is appended to
    `results/frozen/freeze_log.jsonl`.
  - `--config` accepts a name, a 16-hex configuration hash found in the arm's own stage-1 or stage-2
    list, or a JSON file. Every frozen hash of addendum 4 is in its arm's own lists (table below).
- **Question code:** `run.js freeze-tq --arm A` writes `results/frozen/<arm>/tq.json` with the same
  `code_hash` and `deps_hash`. Held-out TQ is refused without it or when either hash differs.
- **checkSplit / lockTest (harness.js):** a held-out run is refused when `SCORING_STARTED` exists; when
  `results/frozen/<arm>/<hash>.json` is missing, names another arm or hash, holds a configuration that
  does not hash to its name, or has no valid role; when `code_hash` or `deps_hash` differs from the files
  now (the refusal names the added, removed or changed files); when `LB_COMM_DRAW` is set for an arm
  other than ladybug, is not 0 to 4, or is set for a configuration that does not use the community prior
  (`x_comm`). The run also needs `--allow-heldout` and `--frozen-hash` equal to the hash (as before).
- **lock-check:** `run.js lock-check --arm A --config C [--sets ...] [--repeat --reason r]` and
  `run.js lock-check --arm A --tq` perform exactly that test (plus, with `--sets`, the set and output
  tests below), print one JSON line and then `allowed` or `refused: <reason>`, and exit 0 or 3. They
  read no task and no question.
- **Held-out layout:** `results/heldout/<arm>/<role>/<set>.jsonl.gz`; the reference arm's two
  configurations share role `crosscheck`, so its folders carry the hash (`crosscheck-<hash>/`); a
  LadybugDB draw adds `-draw<k>` (`results/heldout/ladybug/s2-draw1/T1.jsonl.gz`). Questions:
  `results/heldout/tq/<arm>.answers.jsonl`. The empty folders `heldout/`, `heldout/tq/`,
  `heldout/_running/`, `heldout/_superseded/` exist.
- **Run discipline:** one set per held-out invocation (`--sets T1`); `--out`, `--limit`, `--tasks`,
  `--tasks-file`, `--tasks-jsonl` are refused; `GT_RESULTS` must be `<GT_BUILD>/results`. Sets: T1, T1x,
  T2, T3, T4; **T5 is refused** with the addendum 4 item 7 reason. Every held-out invocation, refused or
  not, appends one line to `results/heldout/runs.jsonl`: `at_start`, `at_end`, arm, hash, role, set,
  draw, `n_tasks`, `exit` (ok, error, refused), `repeat` (0 for a first run), `reason`, `out`,
  `code_hash`, `argv`, `host`, plus `refusal`, `error`, `superseded`, `parents` where they apply. A run
  writes `<out>.part`, renames it when complete, and keeps a marker in `heldout/_running/` while it runs,
  so a killed run is visible. An earlier attempt (answer file, `.part`, marker, or a logged non-refused
  run) makes the harness refuse unless `--repeat --reason "<text>"`; then the old files go to
  `heldout/_superseded/<arm>/<dir>/<file>.<time>` and the line records the repeat number. `--repeat`
  with nothing to repeat is refused. Once `results/heldout/SCORING_STARTED` exists, every held-out run,
  repeat, TQ run and freeze is refused.
- **TUNE variants (`--tasks-jsonl`, run.js and sweep.js, tune only):** a JSON-lines file of TUNE tasks
  with `remove_paths` added. Each line must equal its TUNE task in id, set, split, parent and seed, and
  may add only `remove_paths`; anything else is refused, so it cannot carry a held-out task.
- The old hash-only records (`6b70cc1222745385`, `714a474060653c1f`, `c4d2f0a60a3d199c`,
  `e70177e5807f0252`, `by_arm.json`, the grader's NOTES.md) are kept in `results/frozen_v1/`; the lock
  never reads them. `results/frozen/` is empty.

Configurations of addendum 4, as the lists hold them (`--config <hash>` finds each):

| arm | role | hash | list, name |
|---|---|---|---|
| relational | primary / s1 | 95e990307da3b42b / 6b70cc1222745385 | stage 2 `s2: hops=null rank=degnorm` / stage 1 `hops=4` |
| ladybug | primary / s1 / s2 | 95e990307da3b42b / 6b70cc1222745385 / f233ae069bdba0ce | stage 2 `s2 hops=null rank=degnorm` / stage 1 `hops=4` / stage 2 `s2 hops=null native rank=hybrid ppr+x_comm` |
| duckpgq | primary / s1 | 95e990307da3b42b / 6b70cc1222745385 | stage 2 `s2: hops=null + rank=degnorm` / stage 1 `hops=4` |
| reference | crosscheck (both) | 95e990307da3b42b, 6b70cc1222745385 | stage 2 `s2: hops=null rank=degnorm`, stage 1 `hops=4` |
| search | primary / s2 | e70177e5807f0252 / 950c029615d337c1 | stage 2 `pad=CO rounds=1 routes=off` / stage 2 `pad=CO co rrf rounds=1` |
| floor-dir | primary | 714a474060653c1f | floor list `gran=file form=signature` |
| floor-co | primary | c4d2f0a60a3d199c | floor list `gran=file form=signature` |

Code hashes now (first 16 hex of the 64; the grader's freeze records the full values): relational
8a17c272804fe948, reference 675b2397833349a1 (deps 8163e1985fd39a27), ladybug 5a338a2461788c4f (deps
e5222522daade91e), duckpgq 693dc6b6408083a4 (deps 8163e1985fd39a27), search 1e228ba998e67bbb, floor-dir
be048fb0e97d34b1, floor-co c1c252796e7b9220. **Any edit to any `arms/common/*.js` or `arms/<arm>/*.js`
after the freeze makes the lock refuse that arm**, including scripts that are not on the answer path
(for example `arms/ladybug/bench.js`; addendum 4 item 16 puts benches in `build/bench/`). Non-`.js`
files (notes, `stage2.json`, `arms/ladybug/priors/*.json`) are not hashed; the configuration itself is
in the record.

### Proofs (all inside graphtest:1, `--cpus 6 --memory 4g`, `/build/sealed` hidden; TUNE only)

1. **Self-test:** 69 of 69 checks pass (`tmp/lock/selftest.log`).
2. **End-to-end lock test, 63 of 63 steps pass** (`tmp/lock/locktest.js`, log `locktest.log`, result
   `locktest.json`). It runs on a throw-away build `tmp/lock/fakebuild` (copies of the arm code, made by
   `make_fake.js`) whose "held-out" tasks and questions are TUNE tasks and TUNE questions relabelled, so
   the whole held-out path ran for real with no held-out input: refusals before and after freezing,
   role rules, a record naming another arm, two sets, T5, a wrong hash, `--limit`, `--out`, a
   `GT_RESULTS` override, a real run (3 tasks, log line ok, repeat 0), a refused second run, `--repeat`
   without and with a reason (old file in `_superseded/`, repeat 1), a simulated killed run (marker and
   `.part` left; refused, then repeated), a T3-shaped run with ARCHITECTURE.md removed, code changes in
   the arm folder, in `common/`, an added file and a required file of another arm (each refused with the
   file named; allowed again after the restore), TQ before and after `freeze-tq` and after a `tq.js`
   change, the draw rules, real ladybug runs of `f233ae069bdba0ce` at draw 0 (`ladybug/s2/T1.jsonl.gz`) and
   draw 1 (`ladybug/s2-draw1/T1.jsonl.gz`, log draw 1), the variants-file rules, and `SCORING_STARTED`
   (run, repeat, TQ, freeze and lock-check all refused). Its log held 27 lines: 20 refused, 7 ok.
3. **Real tree:** `run.js lock-check --arm relational --config 95e990307da3b42b --sets T1` prints
   `refused: configuration 95e990307da3b42b was never frozen for arm relational ...` (exit 3), as it
   must before the grader freezes.
4. **Removed-document dry run (item 14)**, `tmp/lock/run_dry.sh`, checks `dry_check.js` /
   `dry_check.json`, `search_probe.json`. 40 TUNE T1 tasks over 28 parents, drawn with seed 20261113
   (`make_dry.js`), each with `remove_paths: ["ARCHITECTURE.md"]`. Not CLAUDE.md: it exists at
   no TUNE parent (it was added on the split date, commit bfb5714, 2026-07-01), and ARCHITECTURE.md
   exists at all 53 TUNE parents and sits in 310 of 388 stored typed-primary TUNE T1 answers.
   - Equivalence, through `sweep.js --tasks-jsonl` with relational, reference, ladybug and duckpgq on the
     relational list: 95e990307da3b42b and 6b70cc1222745385, 40 tasks each, 6 arm pairs each: **0
     equivalence failures**, 0 strict ranked or answer failures relational vs reference, and 0 packed
     answers differing between any pair (meta set aside).
   - **The removed path appears in no answer of any arm** (shown items, beyond-budget sample, seeds):
     0 of 40 for each of the 13 (arm, configuration) runs: four typed arms x two configurations, ladybug
     f233ae069bdba0ce, search e70177e5807f0252 and 950c029615d337c1, floor-dir, floor-co.
   - It did bite: the stored answers without removal held ARCHITECTURE.md in 40 of 40 tasks for
     95e990307da3b42b, 29 of 40 for 6b70cc1222745385 and 40 of 40 for ladybug f233ae069bdba0ce; with it
     removed, 38, 40 and 40 answers changed (the 2 unchanged primary answers had it only in the
     beyond-budget sample). Search and floors never show Markdown, so their 40 answers were unchanged.
   - Search text: with the document removed it is absent from the search arm's exported tree on all 28
     parents (present on 28 of 28 without removal) and from the canonical graph (476 nodes with that path
     without removal, 0 with); its grep and BM25 corpus is code files only, so it never held a Markdown
     file. A removed code file does change a search answer: task T1-0067, removing
     `technician-app/src/lib/jobsApi.test.ts` (rank 1 in the stored answer): the file leaves the tree and
     the answer, the head goes from 6 to 5 items; the re-run without removal equals the stored answer.
   - Ladybug community priors for the 28 new canonical graphs were written to the dry container's
     volume (`LB_PRIORS_DIR=/store/lbpriors`), not to `arms/ladybug/priors/`. Dry answers were deleted;
     the sweep summaries stay in `tmp/lock/dry/<primary|s1>/sweep/`.
5. **Regression (item i)**, `tmp/lock/run_regress.sh`, `regress_check.js`, `regress.json`: 30 TUNE T1
   tasks (seed 20261114, ids in `tmp/lock/regress/ids.txt`) through `run.js run` for 13 (arm,
   configuration) runs: **30 of 30 answers identical to the stored TUNE answers in every run**
   (fields set aside: `ms`, `engine_ms`, `config_name`, `meta`; the reference arm's 95e990307da3b42b is
   compared with the relational arm's stored file). `meta` differs only for ladybug 6b70cc1222745385
   and f233ae069bdba0ce, in 23 of 30 answers, key `queries` only: the arm's count of Cypher queries
   depends on its application-code PageRank cache, which a 60-configuration sweep keeps warm. The
   ladybug arm read a copy of its priors: 54 files before and after.

### Held-out inputs (item g; `tmp/lock/inputs_check.js`, `inputs_check.json`)

| set | held-out tasks (expected) | parents | facts present, extractor 59da7b753a4d908e | seed file in facts and tree |
|---|---|---|---|---|
| T1 | 418 (418) | 70 | 70 of 70 | 418 of 418 |
| T1x | 82 (82) | 9 | 9 of 9 | 82 of 82 |
| T2 | 237 (237) | 47 | 47 of 47 | 237 of 237 |
| T3 | 25 (25) | 4 | 4 of 4 | 25 of 25 |
| T4 | 8 (8) | 4 | 4 of 4 | 8 of 8 |
| T5 | 27 (not run) | 1 | - | no file seeds; refused by the harness |

74 distinct parents over T1 to T4. Removed documents: T4 8 entries (`docs/HANDOFF-2026-07-28-open-work.md`),
all present at their parent in git and in the facts. T3 25 entries: **20 do not exist at their
parent**: `docs/lifecycle-audit-followups-2026-07.md` (7 tasks, parent f36b216, 2026-07-26; the doc was
added 2026-07-27) and `docs/HANDOFF-2026-07-28-open-work.md` (13 tasks, parent 013a86b, 2026-07-28; the
doc was added by 906b990 the same day). That is the T3 design ("facts built at the commit before the
doc"), so their removal is a no-op; the other 5 (`CLAUDE.md`) exist at their parents and are removed.

### Held-out questions (item h; `tmp/lock/tq_kinds.js`, `tq_kinds.json`)

The 30 held-out questions: screen_tables 3, tests_reach 4, invariants_on_file 3, other_half 4,
setting_readers 4, migrations_touch_table 4, route_clients 4, change_reach 4. Every kind also occurs in
TUNE, and the question code of relational, ladybug, duckpgq and search dispatches all 8 kinds (read as
text). **But the question text does not always fit the arms' target patterns.** A format check with
copies of those patterns (no arm code loaded, no store opened, no answer produced) finds:
- typed arms (relational and duckpgq `target()`, which ladybug imports): **7 of 30 questions yield no
  target**, so the arm throws and the harness records an error and an empty answer: ids 24, 40, 46
  (other_half phrased without `path::Symbol` and without a leading `Symbol (path)`), 27 (route_clients
  naming two routes: "routes GET ... or PUT ..."), 33, 41, 47 (setting_readers about a shop_setting
  registry key, a mobile config value and a build-time variable, without "setting X (settings.Y, env
  Z)");
- search: **4 of 30** (27, 33, 41, 47; its other_half does not need a target).
No arm code was changed (not this lane's folder). Whether these may be fixed before the held-out run
(the question text is an input; addendum 4 item 12 allows mechanical fixes before scoring) is for the
orchestrator and the arm lanes.

### How to run (from the host; build root `B`)

```
# every command below runs inside the image, from /build:
#   MSYS_NO_PATHCONV=1 docker run --rm --cpus 6 --memory 4g --mount type=tmpfs,destination=/build/sealed \
#     -v "<build root>:/build" -v "C:/Users/User/Documents/projects/EMS_workshop1:/repo:ro" -v gt-<arm>:/store \
#     graphtest:1 bash -lc "git config --global --add safe.directory /repo; export GT_BUILD=/build GT_REPO=/repo GT_STORE=/store GT_SRCSTORE=/store/src GT_TMP=/tmp/gt; mkdir -p /tmp/gt; cd /build; <command>"
node arms/common/run.js freeze --arm <arm> --config <hash> --role primary|s1|s2|crosscheck
node arms/common/run.js freeze-tq --arm relational|ladybug|duckpgq|search
node arms/common/run.js lock-check --arm <arm> --config <hash> --sets T1,T1x,T2,T3,T4      # allowed / refused: <reason>
node arms/common/run.js lock-check --arm <arm> --tq
node arms/common/run.js run --arm <arm> --config <hash> --sets T1 --split heldout --allow-heldout --frozen-hash <hash>
LB_COMM_DRAW=1 node arms/common/run.js run --arm ladybug --config f233ae069bdba0ce --sets T1 --split heldout --allow-heldout --frozen-hash f233ae069bdba0ce
node arms/common/run.js tq --arm <arm> --split heldout --allow-heldout
node arms/common/run.js run ... --repeat --reason "<what failed and what was fixed>"     # only after a mechanical failure, before scoring
# the grader, before scoring the first held-out answer:  touch results/heldout/SCORING_STARTED
# lane checks (TUNE only): bash tmp/lock/run_dry.sh ; bash tmp/lock/run_regress.sh ;
#   node tmp/lock/make_fake.js && node tmp/lock/locktest.js /build/tmp/lock/fakebuild (in the image, GT_FACTS_CACHE=/build/facts/cache GT_STORE=/store GT_SRCSTORE=/store/src GT_TMP=/tmp/gt)
```

For the runner: run inside `graphtest:1` with the arm's volume (`-v gt-<arm>:/store`, `GT_STORE=/store`,
a `GT_SRCSTORE` on the volume) and the tmpfs over `/build/sealed`. The ladybug arm writes community prior
files for every new canonical graph (each held-out parent, each removed-document variant, each draw) into
`arms/ladybug/priors/`; that is addendum 3 item 5's stored grouping, and it does not change a code hash.

---

Revision of 2026-11-12, evening (harness-fix2 lane, protocol addendum 3 items 1, 4, 11, 12). Loader
version L5, facts extractor 59da7b753a4d908e. Only TUNE tasks were run; nothing was scored, selected
or frozen. sealed/ and audit/ were never opened by any script or command. The earlier revision (the
harness fix for addendum 2) is summarised under "History" at the end.

The exact algorithm specification for graph-arm builders is SPEC.md in this folder.

## What exists

| File | Role |
|---|---|
| paths.js | Fixed locations, each overridable by an environment variable: GT_BUILD, GT_REPO, GT_FACTS_CACHE (facts/cache, the only facts location: the old frozen-facts fallback is gone), GT_STORE (arm stores, `<GT_STORE>/<arm>`), GT_SRCSTORE, GT_TMP, GT_RESULTS. |
| edgeclasses.js | Edge kind to class (12 classes); `SYMMETRIC` = {co_changed}. |
| facts.js | Loader L5: one edge per (kind, src, dst), weight = highest confidence, evidence rows kept and counted; co_changed stored once with src < dst. Reads facts only from facts/cache/<sha>/. `exportCanon` writes the canonical CSV files and a content hash. |
| config.js | Configuration schema, validation, canonical form, hash, rankKey. `x_` modes (any arm; an `x_` traversal may leave direction out) and `variant` strings pass validation; `isExtension(cfg)` says whether a configuration uses either. |
| padding.js | The DIR and CO tails (comments rewritten: they describe the rule, not code that no longer exists). |
| packer.js | Projection, tail append, the four forms, budget packing with the whole-line cut rule. |
| harness.js | Tasks, the held-out lock, list loading (stage 1 = 40, stage 2 = 20 with no repeat of a stage-1 entry, floor = the fixed 8 of `arms/floor-*/configs.js`), answer records, and the one place lookups are counted (`PAD_LOOKUPS`). |
| arms.js | Arm registry; built-in arm `none` (empty head, 0 lookups). |
| run.js | `run` (now with `--tasks id,id` and `--tasks-file <ids or a sweep summary.json>`), `freeze`, `tq`, `freeze-tq`, `canon`. |
| sweep.js | TUNE sweep over any set of arms; `--stage 2`; floors accepted; extension entries of a shared list run only on the list's own arm; tasks grouped by (parent, removed documents) as in run.js. |
| equiv.js | E.19 equivalence. |
| score.js, compare.js, tq_score.js | The single scorer, the paired comparison, the TQ scorer (unchanged). |
| selftest.js | 69 checks: the earlier 49 plus 20 new (sections 12 to 14 below). |
| crosscheck_extra.js | 13 fixed combinations, relational vs reference (unchanged, not re-run). |
| crosscheck_random.js | New. Strict relational vs reference on N seeded random (configuration, task) pairs; `--focus` draws only metapath + degnorm cases (see "Re-run"). |
| tokcompare.js, tokenizer.js, textterms.js, seed.js, source.js | Unchanged. |
| SPEC.md | Updated: 1 (stage 2, floors), 6.3 (absent steps), 8.1 (out-degree 0), 9.4 (extensions), 10 (lookups, meta), 11 (random cross-check), 12 (one TQ file name). |

## What changed in this revision (addendum 3)

1. **Degree-normalised ranking, out-degree 0 (A.1).** When a node has no arc under the configured
   direction, classes and minConf, its out-degree is the number of reach-DAG arcs leaving it (each
   (u, v, kind, orientation) once; at least 1). This only happens in metapath mode with direction
   dependents or dependencies. Implemented in arms/reference/ref.js and arms/relational/queries.js
   (`degnorm_od`). Before, the reference arm divided by zero (infinite activation) and the relational
   arm dropped the term (SQLite division by zero is NULL). The graph lanes implement the same
   sentence in their own arms (SPEC 8.1).
2. **Absent metapath steps (A.4).** A step whose kinds and classes have no edge at a commit matches
   nothing; it is not an error. Both arms already behaved so; it is now checked (self-test section
   13, and 147 pairs of the focused random cross-check).
3. **Answer record (D.11, D.12).** New fields `lookups_head`, `lookups_pad`, `meta`:
   - `lookups_head` = the arm's own count (the search arm's ledger length; 1 for an arm that reports
     nothing, which is one query; 0 for an empty head: the floors and arm `none`).
   - `lookups_pad` = 1 for pad DIR, 2 for pad CO, 0 for none, the same for every arm and counted
     only in harness.js. It is counted whenever the configuration pads; `tail_tok` per budget says
     whether a budget reached the tail.
   - `lookups` = `lookups_head + lookups_pad`. For the floors this is still 1 (DIR) and 2 (CO).
   - `meta` = the arm's `rank().meta` with an array `ledger` replaced by `ledger_len`; null when the
     arm returns none. For search: `tokens_read`, `r1_lookups`, `names`, `routes`, `ledger_len`,
     `seed_in_tree`.
4. **Floors on the swept arms' task set (D.12).** sweep.js accepts a floor's fixed list of 8, so
   `--arms floor-dir,floor-co --sets <set>` runs exactly the tasks of any other arm's sweep of that
   set. run.js gained `--tasks` and `--tasks-file`.
5. **One TQ answer file name.** results/tq/<arm>.<split>.answers.jsonl. The duplicates
   results/tq/relational.tune.jsonl and search.tune.jsonl were removed (kept under
   tmp/harness-fix2/old_results/tq/). arms/relational/tq.js now writes its diagnostic file to
   results/relational/tq_diagnostic/.
6. **Stage 2 (D.8, D.9).** `sweep.js --stage 2` loads arms/<arm>/stage2.json (exactly 20, unique
   names and configurations, none repeating a stage-1 configuration or name), writes answers beside
   stage 1 (results/<arm>/tune/<hash>.<set>.jsonl.gz), logs the list hash with stage 2 in
   sweep/lists.jsonl, and writes summary.stage2.json, configs.stage2.json and
   crosscheck_mismatches.stage2.jsonl. An `x_` entry passes validation for any arm; on a shared list
   it runs only on the list's own arm and is never cross-checked. The relational arm runs an `x_`
   mode only when it is registered in rel.js (`EXT_TRAVERSAL`, `EXT_RANK`; none exists) and refuses
   it by name otherwise. Tested on a throw-away copy of the build tree with a dummy 20-entry list
   (19 minConf variants and one registered `x_` rank), 4 T1 tasks: 20 answer files written beside
   the stage-1 base, list hash logged twice (one load per arm), the `x_` entry ran on relational
   only (4 runs skipped on reference), 76 pairs compared with 0 mismatches. The copy was deleted;
   no stage2.json exists in any arm folder.
7. **paths.js / facts.js.** No fallback to arms/common/frozen-facts (deleted folder).

New self-test checks (selftest.js):
- Section 12, a seven-node metapath graph with the scores worked out by hand in the comment
  (direction dependencies, steps `calls out` then `calls in`; od(b) = 0, so od(b) = its 3 DAG arcs;
  scores x 2/3, b 1/2, c 1/2, d 1/6, e 1/6). Both arms give exactly these, byte-identical, also inside
  a hybrid.
- Section 13, absent steps: a step of kind enqueues_kind (absent) gives only the hop-1 nodes with
  emit all and nothing with emit end; a single step of an absent class gives nothing; `x_` modes pass
  validation and the relational arm refuses an unregistered one by name.
- Section 14, the answer record: lookups (head 5 + CO 2 = 7; unreported head = 1, + DIR = 2; DIR
  floor = 1), meta (`tokens_read` kept, ledger replaced by `ledger_len`), the floor list (8 entries,
  no stage 2), stage-2 list size (19 refused, 20 accepted).

## Re-run (inside graphtest:1, TUNE only)

All runs: Node v24.22.3, SQLite 3.54.1, at most 6 CPUs and 4 GB per container, stores and source
stores on the named volume gt-relational (the relational stores from the previous re-run were reused:
schema and loader did not change). Scripts and logs: tmp/harness-fix2/ (run_relref.sh,
run_search.sh, assemble.sh, verify2.js, swap.sh, timing.js, *.log). Task counts: T1 388, T1x 144,
T2 240 (772 in all).

- Self-test: 69 of 69 checks pass (in the image).
- Held-out lock: 6 attempts, all refused (relational without flags; reference, floor-co and
  floor-dir with a wrong frozen hash; search without flags; search TQ held-out).
- Random cross-check (crosscheck_random.js, seed 20261112): 500 (configuration, task) pairs over 52
  parents; every combination of traversal mode (khop, budget, metapath) x direction (3) x ranking
  (bfs, degnorm, ppr, cochange, text, hybrid) had at least 9 pairs; metapath steps used in, out and
  both 116, 104 and 107 times. 0 mismatches: 0 ranked lists differ, 0 packed answers differ,
  0 equivalence failures, 0 errors. The out-degree-0 fallback was used in 6 pairs; 1 pair had an
  absent step. 96 pairs reached nothing (for example minConf 1 or rare kinds). 26 s wall.
- Focused random cross-check (`--focus`, seed 20261113): 500 pairs over 53 parents, all metapath
  with direction dependents or dependencies and degnorm alone or in a hybrid (125 pairs per
  direction for each). 0 mismatches. The fallback was used in 55 pairs; 147 pairs had an absent step
  (102 of them reached nothing). 6 s wall.
- Relational vs reference, the relational stage-1 list (hash 5efda93e9c470eb9), one process per set,
  three at once: 30,880 (task, configuration) pairs (T1 15,520; T1x 5,760; T2 9,600): 0 equivalence
  failures, 0 ranked-list differences, 0 packed-answer differences. Wall: T1 1,158 s, T1x 457 s,
  T2 725 s. 25,476 rank calls per arm (33 distinct rankings per task). Summed rank wall time:
  relational 1,842 s, reference 351 s; base (PPR) p50 relational 89 ms, reference 16 ms; median
  over configurations of the p50 relational 88 ms, reference 15 ms; slowest configuration p50
  relational 320 ms, reference 77 ms. These ran three processes at once and are not engine measures.
- Search (its own list, hash ef02c4a27f96928a): 30,880 answers. Wall T1 180 s, T1x 79 s, T2 120 s;
  25,476 rank calls, 316 s summed; base p50 14 ms, p95 32 ms.
- Floors, through sweep.js (lists floor-dir 4d36e676b1fde233, floor-co 43b5798d088ac9ea, 8 entries
  each): 6,176 answers per floor; wall 24 s (T1), 9 s (T1x), 15 s (T2) for both floors together.
- TQ (20 TUNE questions, frozen commit): relational and search, 0 errors each; files
  results/tq/relational.tune.answers.jsonl and search.tune.answers.jsonl.

Checks (tmp/harness-fix2/verify2.js, copied to results/sweep/stage1/verify2.json): 0 problems.
- Every configuration of every arm present for every task of every set; no duplicate, extra or
  held-out id; config_hash equals the file's hash.
- No answer over its budget; `used` recomputed from the items equals the logged value at every
  budget; head_tok + tail_tok equal the shown items' tokens; n_full + cut + beyond = n_units.
- Lookups: `lookups = lookups_head + lookups_pad` in every answer; floors head 0 (total 1 and 2);
  relational and reference head 1 and meta null; search meta.tokens_read present and
  meta.ledger_len = lookups_head in every answer (search head lookups: median 23, at most 114).
- The five arms ran identical task sets in each of T1, T1x and T2.
- Logged list hashes equal the recomputed ones (relational, search, floor-dir, floor-co).
- TQ: one file per arm, 20 lines, all fields; relational tokens equal the answer's tokens on 20 of
  20 (search reports the ledger total by design: median 2,839 tokens, at most 3 lookups).

Old against new (the previous files are kept in tmp/harness-fix2/old_results/, 160 MB): 0 of 30,880
relational, 0 of 30,880 reference, 0 of 30,880 search and 0 of 6,176 per floor ranked lists changed,
and 0 packed contents changed (items, budgets, units, seeds); 0 of 20 TQ answers changed per arm.
Expected: no stage-1 entry uses degnorm with a metapath (the only degnorm entry is k-hop, where
out-degree 0 cannot occur on a DAG source), and no stage-1 metapath step uses an absent kind. What
changed in every record are the new fields `lookups_head`, `lookups_pad`, `meta`, and `lookups` for
padded answers (pad=DIR +1, pad=CO +2) and for relational/reference (null before, now 1).

Where the results are: results/<arm>/tune/<hash>.<set>.jsonl.gz for relational, reference, search
(120 files each), floor-dir and floor-co (24 each); results/sweep/stage1/<arms>_<set>.{summary,
configs, crosscheck_mismatches}; results/sweep/lists.jsonl; results/sweep/crosscheck_random*.json;
results/sweep/stage1/timing_{relref,search,floors}.json and verify2.json; results/tq/.

## How to run

```
node arms/common/selftest.js
node arms/common/sweep.js --arms relational,reference --list relational [--stage 1|2] --sets T1 [--limit N | --tasks id,id | --tasks-file f] [--only name,...] [--out <results root>]
node arms/common/sweep.js --arms search --sets T1 --out <root>
node arms/common/sweep.js --arms floor-dir,floor-co --sets T1 --out <root>      # same tasks as any sweep of T1
node arms/common/crosscheck_random.js [--pairs 500] [--seed 20261112] [--focus] [--out <root>]
node arms/common/crosscheck_extra.js [--tasks id,id] [--out <root>]
node arms/common/run.js run --arm <arm> --config <name | config.json> --sets T1 --split tune [--tasks ... | --tasks-file ...] [--out dir]
node arms/common/run.js tq --arm <arm> --split tune        # results/tq/<arm>.tune.answers.jsonl
node arms/common/run.js freeze | freeze-tq | canon ...
node arms/common/score.js | compare.js | tq_score.js ...  (grader only; unchanged)
```

Inside graphtest:1 (store and source store on a named volume, never /build):

```
MSYS_NO_PATHCONV=1 docker run --rm --cpus 6 --memory 4g -v "<build>:/build" \
  -v "C:/Users/User/Documents/projects/EMS_workshop1:/repo:ro" -v gt-relational:/store \
  graphtest:1 bash -lc "bash /build/tmp/harness-fix2/run_relref.sh"     # and run_search.sh
```

## For the graph lanes and the grader

- Graph lanes: implement SPEC 8.1's out-degree-0 sentence (count reach-DAG arcs leaving the node,
  each (u, v, kind, orientation) once). `crosscheck_random.js --focus` is a ready load test of it,
  but it compares relational with reference only; a graph arm can reuse `drawConfig(r, i, true)`.
- Graph lanes: rank() may report `lookups` (else 1 is recorded) and `meta` (kept in the record).
  Their TQ diagnostic files still sit in results/tq/ (`ladybug.tune.jsonl`, `duckpgq.tune.jsonl`,
  written by their tq.js); the one answer file name is `<arm>.tune.answers.jsonl`, so those
  diagnostics should move (for example to results/<arm>/tq_diagnostic/). Not changed here.
- Grader: `lookups` now includes the padding tail for padded configurations of every arm; use
  `lookups_head` (plus `lookups_pad` once a budget's `tail_tok` > 0) for lookups-to-80 %. Search's
  per-item `via` still names the ledger entry ("L<k>") and tokens read so far ("read<t>").
- Grader: the `complexity()` functions in arms/relational/sweep.js and arms/search/sweep.js predate
  addendum 3 item 10 (parsimony); they are not the selection rule.

## Deviations and limits

- The tokenizer is still a deterministic approximation; no model tokenizer is installed.
- minConf applies to unweighted traversals, the reach DAG and the degnorm out-degree; not to PPR
  transitions, the cochange score or the hub measures.
- Explanation paths in budget and metapath modes follow state parents (SPEC 7).
- Padding lookups are counted per configuration, not per budget (see "For the grader").
- crosscheck_extra.js and relational/bench.js were not re-run in this revision.
- Run times above come from three processes sharing 6 CPUs; they are not the quiet-machine engine
  measures of addendum 2 E.22.

## History

- Harness fix for addendum 2 (2026-11-12, afternoon): loader L5, the shared padding tail, the arm
  registry, the single scorer, the held-out lock for every arm, metapath mode, SPEC.md; smoke test
  only (20 tasks).
- Re-run on the rebuilt facts (tmp/rerun/, 2026-11-12): full stage-1 sweeps of relational,
  reference, search and both floors (floors via run.js), 0 mismatches; those files are the "old"
  side of the comparison above.
