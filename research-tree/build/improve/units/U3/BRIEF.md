# U3 brief: A6 SweRankEmbed-Large (7B retriever) and A4 SweRankLLM-Small (7B listwise reranker), both 4-bit (task D2), kind build, Sonnet

Deliverable: `units/U3/report.md`, the code under `code/U3/`, A6's and A4's score columns in U1's feature tables for the tuning and held-out queries, and their held-out ranking files.

Read `../BRIEF-COMMON.md` first (its rules bind you; the owner's words it points to outrank everything); then rows A6 and A4 in `CANDIDATES.md`, `units/FETCH/report.md` (the 4-bit test on this card, the local model folders, the remote-code copy, sdpa or eager attention), U1's `units/U1/READY.md` and `report.md` (splits, feature tables, U1's frozen arm), the card run's dense code in `research-tree/build/runbig/card/d2/`, and the authors' reranking code in `CR/tools/SweRank` (prompt in `src/reranker/utils/rank_listwise_os_llm.py`; `run_rerank.sh`: TOP_K 100, WINDOW_SIZE 10, STEP_SIZE 5; `rerank.py`: context 32768).

1. A6: SweRankEmbed-Large at 4-bit (nf4, bf16 compute, bitsandbytes) from `CR/models/SweRankEmbed-Large` with the local code copy; its query instruction as the model card gives it; function chunks; chunk-to-file aggregation max or sum-of-top-3 chosen on tuning. Scores on tuning and held-out queries (and on U1's training queries if the card time allows within the estimate: the model was not trained on our data).
2. A4: SweRankLLM-Small at 4-bit, listwise over the top 20 or 30 of U1's frozen arm, the authors' prompt variant for issue-style queries, window 10 or 20, step 5 (window/2 when 20), 256 or 512 tokens of each file; sweep these on tuning only. Its output is a reranked list; write a rank-based score column.
3. If the 4-bit test in FETCH's report failed on this card: A4 uses Qwen3-Reranker-4B unquantised (bf16, about 8 GB) and A6 is reported as not run. The fallback weights are fetched only by the fetch unit (approved by r57-0077 for this case); say so in your final reply rather than fetching.
4. Card: about 5-9 hours in CANDIDATES.md (A6 first, then A4); one job at a time under `CR/GPU.lock`; record peak memory; stop a job that projects past twice its estimate.

End your reply with: the frozen choices, A6 and A4 tuning Acc@10 macro and P@2 against BM25 and against U1's frozen arm on the same queries, card hours used.
