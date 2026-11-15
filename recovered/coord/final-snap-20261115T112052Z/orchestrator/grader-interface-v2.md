# Grader interface, version 2 (coordinator, 2026-11-14; binding for the lane and the grader)

The grader is being built against `train/HANDOFF-FORMAT.md` version 1 plus these decisions. Where they
differ, these win; the lane's version 2 of the format file repeats them. Source: ruling 88 and
`critic.format_changes_for_grader` in `orchestrator/scoring-delta-review.json`.

1. Names. The seed-mean row of an arm is `<ARM>_<KIND>_mean` in both splits (KIND is `alone` or
   `fused`). Comparators keep the bare names `RRF`, `PPR`, `CO`, `DIR`.
2. Tuning hand-off. It also carries `ranked/<variant>_pool.jsonl.gz` beside
   `ranked/<variant>_unrestricted.jsonl.gz` (same row shape: `id`, `variant`, `ranked`), for all 40
   variants, on the late 50. Every file is listed with its sha256 in `HANDOFF.json` `files`.
3. Ranking. The grader ranks from the ranked lists exactly as given and never re-sorts. Score tables
   are reference material.
4. Resampling unit. The task commit, from the grader's sealed records, never the parent.
5. Rank metrics. `evalcore.task_metrics` exactly: P@10 = hits in the first ten places / 10 always;
   R@k = hits in the first k / max(|truth|, 1); MRR = 1 / rank of the first hit over the whole list,
   0 without a hit; a task with empty truth stays in the means. Aggregation: mean of the three seeds
   per task, then mean per commit, then mean over commits. Intervals: `evalcore.paired` /
   `evalcore.bootstrap` as written (generator seed 0, 10,000 resamples, linear percentiles, 95 %), for
   the rank metrics and for the answer-level measure alike.
6. Returns, written by the grader under `LANE/grader-returns/` (test runs under
   `LANE/grader-returns/test/`). JSON, finite numbers only, no per-task figure.

   `tune-rank.json`:
   `{"split":"tune","test":bool,"handoff_sha256":s,"tasks":n,"commits":n,
     "rank":{"<variant or _mean row>":{"pool":{"P@10":x,"R@10":x,"R@20":x,"MRR":x},"unrestricted":{...}}},
     "truth":{"rule":"item 4","tasks_checked":n,"equal_to_lane":n},"scorer":{...}}`
   The coordinator compares `rank` with the lane's `tune.json` (late 50: per seed, seed mean,
   comparators) to 1e-9 before the item-27 freeze (ruling 88b).

   `tune-item24.json`:
   `{"split":"tune","test":bool,"handoff_sha256":s,"tasks":n,"commits":n,
     "labels":{"<ARM>_<KIND>_mean or comparator":{"mean":{"primary":x},
       "per_seed":{"s1":x,"s2":x,"s3":x},"vs_RRF":{"primary":{"diff":x,"lo":x,"hi":x,"p":x}}}},
     "scorer":{...}}`
   `RRF` has no `vs_RRF`; comparators have no `per_seed`. 16 labels: 6 arms x alone/fused, plus 4
   comparators.

   `heldout.json`: the object of HANDOFF-FORMAT.md section 3 ("Held-out, item 27"), `<v>` taking the 12
   values named there, plus
   `"vs_RRF":{"<ARM>_fused_mean":{"pool_P@10":{"diff":x,"lo":x,"hi":x},
       "unrestricted_P@10":{...},"answer_level":{...}},"<ARM>_alone_mean":{...}}` (ruling 88d;
   description only, no verdict word) and
   `"literal_check":{"tasks":418,"task_commit_in_checkpoint_history":0,"parent_mismatch":0}` (ruling 73).

   `scorer` = `{"files_sha256": sha256 of the grader's HASHES.txt, "evalcore_sha256": ..., "score_js_sha256": ...}`.
7. Refusals. In real mode the grader receives from the coordinator the expected sha256 of the
   hand-off's `HANDOFF.json` and, for held-out, the freeze sha256. It refuses a difference, verifies
   every file hash `HANDOFF.json` lists, refuses a hand-off whose test flag is set, refuses a variant
   set or task set other than the expected one, and refuses to grade the held-out split a second time.
   Test mode refuses a hand-off whose test flag is not set.
8. `write_result.py` checks, for each return it reads: `split`, `test` false in real mode,
   `handoff_sha256` equal to the hand-off it wrote, for held-out `freeze_sha256` equal to the anchored
   record, `tasks` and `commits` (418 and 75 on held-out), the exact key sets (no missing and no extra
   variant, metric or scope), every number finite and in [0, 1] (differences and interval bounds in
   [-1, 1]), and the `scorer` block present.
