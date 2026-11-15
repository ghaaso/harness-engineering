# tmp/rerun: stage-1 re-run on the rebuilt facts (relational, reference, search, floors, TQ)

Date: 2026-11-12. Facts: extractor 59da7b753a4d908e (cache rebuilt 16:31), loader L5. Every run below
ran inside graphtest:1 (Node v24.22.3, SQLite 3.54.1), at most 6 CPUs and 4 GB, TUNE split only.
Nothing was scored. sealed/ and audit/ were never opened. No harness or arm code was changed.

## What exists

| File | Role |
|---|---|
| run_relref.sh | Self-test, held-out lock attempts, then the relational stage-1 list (40 configurations) run by the relational and reference arms with the strict cross-check, one process per set (T1, T1x, T2), each with its own store and source store on the named volume gt-relational (/store/<set>). |
| run_search.sh | Held-out lock attempts; the search stage-1 list (40 configurations) per set; floor-dir and floor-co (8 configurations each, via run.js, sets T1,T1x,T2); TQ for relational and search on the 20 TUNE questions. Stores under /store/S_<set>, /store/F, /store/TQ on gt-relational. |
| verify.js | Structural check of every answer file under a results root (see "Checks"). |
| timing.js | Combines the per-set sweep summaries into per-arm timing. |
| out_* | Raw outputs of each process (copied into results/, kept here as the run record). |
| *.log | relref_main.log, relref_<set>.log, search_main.log, search_<set>.log, floors.log, tq.log. |
| verify.json, timing_relref.json, timing_search.json | Check and timing reports (also copied to results/sweep/stage1/). |

Old results that belonged to the previous facts were moved to results/_phaseA_old/ (bench_run.log,
crosscheck_extra_run.log, sweep_run.log, engine/, reference/, relational/, sweep/, tokenizer/, tq/).
results/ladybug/ and results/duckpgq/ (empty, other lanes) were left alone.

## Where the results are

- results/<arm>/tune/<config hash>.<set>.jsonl.gz for arm = relational, reference, search (40 hashes x 3 sets = 120 files each), floor-dir and floor-co (8 x 3 = 24 files each).
- results/sweep/stage1/<arms>_<set>.{summary.json, configs.json, crosscheck_mismatches.jsonl}; results/sweep/lists.jsonl (every list load).
- results/tq/relational.tune.jsonl and results/tq/search.tune.jsonl (SPEC section 12 format), each identical to the run.js file <arm>.tune.answers.jsonl beside it.

## How to run

```
B=<build folder>
MSYS_NO_PATHCONV=1 docker run --rm --cpus 6 --memory 4g -v "$B:/build" -v "<repo>:/repo:ro" -v gt-relational:/store graphtest:1 bash -lc "bash /build/tmp/rerun/run_relref.sh"
MSYS_NO_PATHCONV=1 docker run --rm --cpus 6 --memory 4g -v "$B:/build" -v "<repo>:/repo:ro" -v gt-relational:/store graphtest:1 bash -lc "bash /build/tmp/rerun/run_search.sh"
# then copy out_* into results/ (as described above) and check:
MSYS_NO_PATHCONV=1 docker run --rm --cpus 6 --memory 4g -v "$B:/build" graphtest:1 bash -lc "GT_BUILD=/build node /build/tmp/rerun/verify.js /build/results"
```

## Results

Task counts (TUNE tasks with a seed path): T1 388, T1x 144, T2 240; 772 in all.
Seed match over the 772: by id 569, file only 168, members 29, none 6.

Relational vs reference (relational list, hash 5efda93e9c470eb9):
- 30,880 (task, configuration) pairs compared (T1 15,520; T1x 5,760; T2 9,600): 0 equivalence failures, 0 ranked-list differences, 0 packed-answer differences. verify.js re-read both arms' files and found the same: 30,880 answers, 0 ranked_sha differences, 0 answer differences.
- Wall time per set (three processes at once): T1 1,088 s, T1x 456 s, T2 723 s; about 18 min end to end.
- 33 distinct rankings per task (the other 7 configurations reuse a ranking): 25,476 rank calls per arm. Summed rank wall time: relational 1,760 s, reference 335 s. Base (PPR) p50: relational 87 ms, reference 15 ms; median over configurations of the p50: relational 85 ms, reference 15 ms; slowest configuration p50: relational 334 ms, reference 70 ms. These timings ran three processes at once and are not engine measures.
- Store size: 142 MB (T1), 57 MB (T1x), 114 MB (T2) on the volume, each holding its set's parents.

Search (its own list, hash ef02c4a27f96928a): 30,880 answers, 0 failures. Wall per set: T1 184 s, T1x 79 s, T2 125 s. 25,476 rank calls, 312 s summed; base p50 13 ms, p95 32 ms.

Floors: floor-dir and floor-co, 8 configurations each, 772 tasks each: 6,176 answers per floor, 0 failures, 93 s for all 16 runs.

TQ (20 TUNE questions, frozen commit): relational 20 answers, 0 errors, median 36 tokens, 1 lookup each; search 20 answers, 0 errors, median 2,839 tokens (ledger total, by the search arm's definition), at most 3 lookups.

Held-out lock: 5 attempts, all refused (relational without flags; reference and floor-dir with a wrong frozen hash; search without flags; search TQ held-out).
Self-test: 49 of 49 checks pass.

## Checks (verify.js; 0 problems)

- Every configuration of every arm present for every task of every set: 0 missing files, 0 missing or extra or duplicate task ids, no held-out answer.
- config_hash in each answer equals the file's hash.
- No answer over its budget at 2,000, 4,000, 8,000 or 16,000 tokens.
- used recomputed from the items (full items + cut tokens + the footer when not everything fits) equals the logged used, and head_tok + tail_tok equal the shown items' tokens, for every answer and budget; shown + beyond = n_units.
- Logged list hashes: every relational load logged 5efda93e9c470eb9 and every search load ef02c4a27f96928a, equal to the hash recomputed from the lists.
- TQ files: 20 lines each, all TUNE question ids, all fields present, 0 errors; relational tokens equal the tokens of the answer on 20 of 20 (search reports the ledger total, so they differ by design).

## Deviations

- Sets ran as three parallel processes per arm group, each with its own store, source store and output folder, then were copied into results/. The sweep summaries are therefore one per set, not one per arm.
- The sweep cross-check runs relational and reference with `--list relational`; the reference arm's own sweep.js re-exports the same list (same hash).
- TQ: the task asks for results/tq/<arm>.tune.jsonl; run.js writes <arm>.tune.answers.jsonl (SPEC 12). Both names are present with identical content. Under the old layout results/tq/relational.tune.jsonl was the relational arm's diagnostic file; it was not produced this time (arm.tq does not write it).
- Run times were measured with three processes sharing 6 CPUs; they are not the quiet-machine engine measures of addendum 2 E.22.
- Floors are run with run.js, one configuration at a time (no 40-entry list exists for them, as their NOTES say).
