# arms/common, arms/relational, arms/reference (harness fix, addendum 2 sections A, B, C, D.15, E)

Date of this revision: 2026-11-12. Loader version L5. Only TUNE tasks were run. No configuration was
chosen or frozen. sealed/ and audit/ were never opened by any script or command here. The full
sweep was not run; only a 20-task smoke test inside graphtest:1.

The exact algorithm specification for graph-arm builders is SPEC.md in this folder. It replaces the
"Algorithm specification" section that this note used to hold.

## What exists

| File | Role |
|---|---|
| paths.js | Fixed locations, each overridable by an environment variable: GT_BUILD (the build folder), GT_REPO (the repository), GT_FACTS_CACHE (facts/cache), GT_STORE (arm database files), GT_TMP (git exports), GT_SRCSTORE, GT_RESULTS. `storeFor(arm)` = GT_STORE/<arm> when GT_STORE is set, else arms/<arm>/db. |
| edgeclasses.js | Edge kind to class (12 classes); `SYMMETRIC` = {co_changed}. |
| facts.js | Loader L5 (D.15): one edge per (kind, src, dst), weight = highest confidence, evidence rows kept and counted; co_changed stored once with src < dst and `sym = 1`; reads only `extractor_version` from meta.json; accepts a commits.jsonl that holds only kept commits. `exportCanon(G, dir)` writes nodes.csv, edges.csv, edges_<kind>.csv and canon.json (sha256 over the sorted per-file hashes). |
| config.js | Configuration schema, validation (throws "INVALID CONFIG: ..."), canonical form, hash, rankKey. Shared factors: granularity, form, pad (none, DIR, CO; default none), minConf (default 0.5). Traversals khop, budget, metapath; state space capped at 8,192 states; metapath at most 8 steps, a step repeats at most 6 times. Extensions: a mode named `x_...` and a `variant` string (SPEC 9.4). |
| padding.js | The DIR and CO tails (B.8), ported from arms/search so every arm pads the same way. |
| packer.js | Projection, tail append, the four forms, budget packing with the whole-line cut rule; records head and tail tokens per budget. |
| harness.js | Tasks, the held-out lock, per-arm sweep lists (exactly 40 stage-1, exactly 20 stage-2, list hashes logged), answer records (pad, n_head, ms, engine_ms, lookups). |
| arms.js | Arm registry: arms/<name>/arm.js exports `open(G, opts)` returning `{rank, close, tq?}`; open and rank may return promises. Built-in arm `none` ranks nothing (with pad DIR or CO it is the DIR or CO floor). `register()` adds an in-process arm for tests only. |
| run.js | `run`, `freeze`, `tq`, `freeze-tq`, `canon` commands for any arm. |
| sweep.js | TUNE sweep over any set of arms using one arm's list; equivalence check (equiv.js) for every pair of arms, strict byte comparison for relational vs reference; wall and engine time p50/p95. |
| equiv.js | E.19 equivalence: same reach set and hops, scores within 1e-9, order valid within score ties, explanation path valid per SPEC 7. |
| score.js | The single scorer (section A). |
| compare.js | Paired cluster bootstrap and sign-flip test between two answer files. |
| tq_score.js | Scorer for TQ answer files (SPEC 12 format). |
| selftest.js | 49 checks on synthetic data for score, compare, tq_score, the packer cut rule, config/metapath and equiv. |
| crosscheck_extra.js | 13 more combinations (metapath with emit end and kind steps, minConf 0 and 0.25, closure, recursive CTE and level-wise query paths), relational vs reference. |
| tokcompare.js, tokenizer.js, textterms.js, seed.js, source.js | Unchanged except tokcompare.js now takes BASE from relational/sweep.js. |
| SPEC.md | Complete specification for graph-arm builders. |

## The scorer (score.js)

- Rule `content` is the default. A reference definition counts only when its lines are visible in the
  answer (signature or snippet form). `--rule locate` keeps the old rule, under which a path or a
  symbol range also counts.
- A cut item (the last item at a budget, partly shown) counts only for the lines it shows in full.
  The packer stores `cut.path_shown` and `cut.shown` for that.
- Metrics, computed per task, averaged within a cluster, then averaged over clusters:
  - primary: recall at 8,000 tokens; signature and snippet forms only, null for paths and range.
  - recall at 2,000, 4,000 and 16,000 tokens.
  - AUC over a grid of 32 points, one every 500 tokens up to 16,000.
  - Tokens to 80 percent recall (`t80c`, capped at 16,000) and the share of tasks that reach it.
  - Definition-only recall at each budget, file recall at each budget, unpadded recall at each budget
    (head items only), and precision at each budget.
  - File recall@10, nDCG@10 and MRR. These are the only measures reported for the paths and range forms.
  - Median tokens used at 8,000.
- Each metric has a standard error over clusters. Cluster = the reference's `commit`, else
  `fix_commit`, else `group`, else the task id.
- `--per-cluster <file>` writes one line per cluster; `--per-task <file>` writes one line per task.
- References: one JSON line per task with `id`, `files` (strings or {path}) and `defs` ({path, start,
  end} or line_start/line_end); an optional `reference` object is merged in.

compare.js:
- Resampling: 10,000 cluster resamples with mulberry32, seed 20261112, percentile 95 percent interval,
  plus a sign-flip permutation p-value.
- Output per metric: wins, losses and ties per cluster.
- `matched` compares recall at the smaller of the two median tokens-used-at-8,000 values, rounded down
  to the 500-token grid.

tq_score.js:
- Precision, recall and F1 per question, macro and micro averages, with aliases.
- Optional judgement items, from `--judgement` or a `judgement_items` field, with a variant computed
  without them.
- An optional `--split` filter selects the references by split; `heldout` is read as `held_out`. The
  scorer only reads files it is given and runs no arm, so it has no lock. Here it ran only in the
  self-test.

## Padding (B.8)

- pad = none, DIR or CO, in the shared packer.
- DIR fills the tail with files ordered by directory distance from the seed file.
- CO fills the tail by co-change with the seed file: the commit counts come from commits.jsonl (kept
  commits of 2 to 30 files), weighted by 0.5^(age in days / 30).
- At symbol granularity, the tail lists the seed file's own definitions first, then each tail file's
  definitions.
- Each budget records `head_tok` and `tail_tok`, and each item carries `pad` (0 = head, 1 = tail).
- Floors: arm `none` with pad DIR or CO.

## Arm registry (C)

- Each arm is arms/<name>/arm.js with `open(G, opts)`, where opts = {store, parent, removePaths}.
- rank(seedIds, cfg, seed) returns either the ranked list or {ranked, engine_ms, lookups, meta}.
  Either may come back as a promise.
- Wall time (`ms`) is measured by the harness; `engine_ms` is whatever the arm reports.
- Sweep lists: arms/<arm>/sweep.js exports STAGE1 (exactly 40 named configurations); an optional
  arms/<arm>/stage2.json holds exactly 20. Any other size, a duplicate name or a duplicate
  configuration is refused.
- Every load appends {arm, stage, count, list_hash} to <results>/sweep/lists.jsonl.
- The held-out lock applies to every arm. A held-out run needs all of the following:
  - `--allow-heldout`;
  - a `--frozen-hash` equal to the configuration hash;
  - a frozen record for that hash from `run.js freeze` for the same arm.
  Without these, loadTasks refuses held-out tasks.

## Relational stage-1 list (H)

arms/relational/sweep.js holds the list; the reference arm mirrors it (`arms/reference/sweep.js`
re-exports it).

- Base configuration: file granularity, signature form, pad none, minConf 0.5, direction both;
  classes code (structure, imports, calls, http, tests, data, config) plus history; k-hop with 2 hops;
  hub none; PPR rank with restart 0.30 and cochange weight 1.
- Added to the old list:
  - a metapath (structure out 0..1, then code classes both directions 1..2, then tests in 0..1);
  - minConf 0 and minConf 1;
  - pad DIR and pad CO;
  - symbol granularity with paths form.
- Removed to keep the list at exactly 40 entries:
  - file granularity with range form;
  - hops 5;
  - hub indeg above 15;
  - the 6-class step of the class ladder;
  - PPR with cochange weight 0.5;
  - symbol granularity with range form (replaced by symbol with paths form).
- List hash: 5efda93e9c470eb9.

## How to run

From the build folder on the host (development only), or inside the image as below.

```
node arms/common/selftest.js
node arms/common/sweep.js --arms relational,reference[,<arm>] [--list relational] [--stage 1|2] \
     [--sets T1,T2] [--limit N | --tasks id,id] [--only name,name] [--out <results root>]
node arms/common/crosscheck_extra.js [--tasks id,id] [--out <results root>]
node arms/common/run.js run --arm <arm> --config <list name|config.json> --sets T1 --split tune [--limit N] [--out dir]
node arms/common/run.js freeze --arm <arm> --config <...>
node arms/common/run.js tq --arm relational --split tune      # writes results/tq/<arm>.tune.answers.jsonl
node arms/common/run.js freeze-tq --arm <arm>
node arms/common/run.js canon --parent <sha> [--remove <path>] --out <dir>
node arms/common/score.js --answers <file.jsonl.gz> | --answers-dir <dir> --refs <refs.jsonl> \
     [--rule content|locate] [--out f.json] [--per-cluster f.jsonl] [--per-task f.jsonl]
node arms/common/compare.js --a <A.jsonl.gz> --b <B.jsonl.gz> --refs <refs.jsonl> [--metric primary,r2000,auc,matched]
node arms/common/tq_score.js --answers <answers.jsonl> --refs <tq refs> [--judgement f] [--split tune]
```

Inside graphtest:1 (the smoke test, at most 6 CPUs and 4 GB, store on a named volume):

```
MSYS_NO_PATHCONV=1 docker run --rm --cpus 6 --memory 4g -v "<build>:/build" \
  -v "C:/Users/User/Documents/projects/EMS_workshop1:/repo:ro" -v gt-harness-fix:/store \
  graphtest:1 bash -lc "bash /build/tmp/harness-fix/smoke.sh" > tmp/harness-fix/smoke.log 2>&1
```

For a real run, set GT_STORE to a container path or a named volume, never to a /build path.

## Results of this revision

The self-test and checks below ran inside graphtest:1 (Node v24.22.3, SQLite 3.54.1), except where
marked as a host run.

- Self-test: 49 of 49 checks pass.
- Held-out lock: all three attempts refused:
  - without `--allow-heldout`;
  - with a wrong frozen hash;
  - a direct loadTasks call.
- Canonical export:
  - At parent c89e021f, the graph has 1,810 nodes and 4,723 edges.
  - The content hash was 4d5c9389...a84a on two exports in the image and on the host.
  - The two exports were byte-identical.
- Smoke sweep: 20 TUNE tasks (16 T1, 4 T2) × the 40 relational stage-1 configurations, relational vs
  reference.
  - 800 comparisons: 0 equivalence failures, 0 ranked-list differences, 0 answer differences.
  - Wall time 58 s.
  - Seed match: id 13, file only 6, none 1.
- Extra cross-check: 13 combinations × 20 tasks; 0 mismatches; 7 s.
- Floors: arm `none` with pad DIR and with pad CO ran on 3 tasks each.
- TQ: 20 tune questions, 0 errors, written in the SPEC 12 format.
- Store: 25 MB in the named volume.
- Query time p50, relational vs reference:
  - base PPR 76 vs 13 ms;
  - budget B2 297 vs 62 ms;
  - metapath 72 vs 13.5 ms;
  - bfs 0.7 vs 0.2 ms.
  Engine time is about equal to wall time.
- Padding:
  - The CO tail's first 5 files differ from the DIR tail's on 13 of the 16 T1 answers.
  - The mean tail at 8,000 tokens is 2,303 tokens over the 20 tasks.
- Asynchronous arm (host run, tmp/harness-fix/async_test.js): an arm whose open, rank and close all
  return promises was run through openArm, normRank and answer.
  - Reach was 26 to 363 nodes per list.
  - Its output was equivalent to the reference on 12 of 12 lists (3 tasks × 4 configurations,
    including a metapath with emit end).
- Scorer end to end (host run, tmp/harness-fix/e2e/): score.js and compare.js ran on the smoke answer
  files.
  - The references were SYNTHETIC: files taken from answer positions 2, 6 and 15. They are not labels,
    and their numbers mean nothing.
  - The check confirms that the files parse and that the outputs are written: 16 tasks in 6 clusters,
    a per-cluster file, and a 10,000-resample comparison.

## Deviations and limits

- The tokenizer is still a deterministic approximation; no model tokenizer is installed.
- minConf applies to unweighted traversals, the reach DAG and the degnorm out-degree. It does not apply
  to PPR transitions (which use the weight), the cochange score, or the hub measures, which are
  defined independently of the configuration.
- Explanation paths in budget and metapath modes follow state parents, not node parents (SPEC 7).
  Node parents could chain through states that break the budget.
- Symbol-granularity padding puts the seed file's own definitions before the tail files.
- The CO pad uses commits.jsonl as search did. When the `used` field is present, it decides which
  commits count; otherwise commits of 2 to 30 files that are not dropped count.
- The `matched` metric rounds down to the 500-token grid.
- Judgement items in tq_score.js come only from a file or a reference field. Nothing here produces them.
- arms/relational/tq.js still writes its diagnostic file results/tq/relational.<split>.jsonl beside
  the SPEC-format answers file.
- The smoke test used a snapshot of 6 parent folders from the existing facts cache (old extractor).
- Stores and old results that predate loader L5 are stale:
  - arms/relational/db/;
  - results/sweep/;
  - results/engine/.
- bench.js was updated but not re-run, so the engine figures from the previous revision are no longer
  current.
- The full sweep over all TUNE tasks was not run.
