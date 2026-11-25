# U3 report: A6 SweRankEmbed-Large (4-bit) and A4 SweRankLLM-Small (4-bit), finished 2026-11-25 ~23:00 local

Status: done. Both models ran at nf4 / bf16 compute, sdpa attention (the 4-bit test passed, so the Qwen3-Reranker-4B fallback was not used and nothing was fetched).

## Route check (A6, overclocked card)
No NaN. Query/chunk cosine vs the reference path >= 0.99995, max abs difference 0.0, score ranking agrees (CR/improve/U3/a6/route-check.json). No overclock effect seen. Driver reset 15:45:24 UTC killed the A6 job (exit 137); it resumed from its save and finished 17:47 UTC (peak 6.19 GiB).

## Results on tuning queries (217 = fixflow 34, clinic 37, zulip 146; macro over the three repositories; 95 % intervals)
| arm | Acc@10 | P@2 |
|---|---|---|
| BM25 | 0.713 [0.634, 0.788] | 0.256 [0.210, 0.307] |
| A2 (U1 frozen arm) | 0.919 [0.868, 0.963] | 0.497 [0.446, 0.552] |
| A4 | 0.933 [0.886, 0.973] | 0.475 [0.419, 0.535] |
| A6 | 0.815 [0.754, 0.877] | 0.379 [0.327, 0.433] |

Differences: A4 - A2 Acc@10 +0.014 [-0.002, 0.039], P@2 -0.022 [-0.071, 0.028] (no difference). A4 - BM25 +0.220 [0.152, 0.294] / +0.219 [0.156, 0.285]. A6 - A2 -0.103 [-0.169, -0.039] / -0.118 [-0.168, -0.070] (A6 worse than A2). A6 - BM25 +0.103 [0.030, 0.178] / +0.122 [0.065, 0.179].
A4 intervals are optimistic: its setting was chosen on 75 of these 217 queries. (A4 per repository on tuning: fixflow 0.941/0.559, clinic 0.865/0.351, zulip 0.993/0.514.)

## Frozen choices
- A4: top K=30 of A2, window 10 (step 5), 512 tokens, content "best". Rule: max of macro Acc@10 + macro P@2 on the stride sample; Acc@10 alone would have picked another setting (K20 W10 N512 head, Acc@10 0.947 vs 0.933 on the sample, but lower P@2). Ties to smaller K, then fewer tokens (sweep: CR/improve/U3/a4/sweep.json, frozen.json).
- A6: function chunks, query instruction per the model card, chunk-to-file aggregation sum-of-top-3 ("top3": macro Acc@10 equal to max, 0.8155; macro P@2 0.3785 vs 0.3740 for max; a6/aggregation.json).

## Not tested / limits
- A6 not scored on training queries (time); A6 was not trained on our data. Only one A6 form (nf4, one instruction, two aggregations) and one A4 listwise prompt; no conclusion on 7B retrievers or rerankers in general.
- A4 queries are cut at 1,024 tokens total (as given in the earlier hand-back; the count of cut queries was not re-measured here).
- Held-out numbers were not opened; held-out rankings and score columns are written only.

## Files
- Score columns filled by fill_table.py (only s_a4_rerank and s_a6_swerank_large; both .gz files start 1f 8b): C:\Users\User\Documents\projects\card-run-2026-11\improve\U1\table\tune.csv.gz (54499 rows), heldout.csv.gz (101969 rows).
- Scores: CR\improve\U3\a6\a6_*_{tune,heldout}.npz, a6\aggregation.json, a6\vec_*.npz; CR\improve\U3\a4\a4_*_{tune,heldout}.npz, a4\frozen.json, a4\score.json, held-out ranking files a4\run_K30_W10_N512_best_heldout_*.jsonl.
- Intervals: CR\improve\U3\intervals_a4.json (older), output of `evalint.py a4,a6` copied above; logs CR\improve\U3\logs\ (score.out, fill.out).
- Code: H\research-tree\build\improve\code\U3.

## Card hours (from CR/logs/improve-U3.log, all runs including killed ones)
A4 sweep runs 2.7 h (three killed with exit 137 before a clean 0.58 h pass), A4 frozen runs 1.9 h (one killed, one clean 1.35 h), A6 check 2.4 h, A6 chain 4.0 h (one failed at 122 s with out-of-memory, one killed by the driver reset at 3.9 h, the final resume 349 s). Total about 11 h, of which about 4 h were lost to kills/reset. Peaks: A4 7.73 GiB, A6 6.19 GiB.

## Faults
Several exit-137 kills (A4 sweeps, frozen, A6 at the 15:45 driver reset), one A6 out-of-memory under the old cap; all recovered by resume from saves. No NaN or route disagreement.
