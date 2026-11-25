# D2 builder: READY for the refuter (2026-11-24)

Check the code in `research-tree/build/runbig/card/d2/` against `README.md` (the scoring, fixed before any arm ran).
Files: `prep.py` (history, split, snapshot, queries, truth, co-change pairs), `bm25.mjs`, `grep_rrf.py` (grep and the RRF
arm), `dense.py` (embedders), `score.py`, `common.py` (terms, tie key), `run_cpu.sh`, `run_gpu.sh`, `test_d2.py`
(9 unit tests incl. a no-leak test on a synthetic git repo; pass in `d2-embed-gpu:1`).

Run: `docker run --rm --network none -v <d2>:/code:ro d2-embed-gpu:1 python -B /code/test_d2.py`.
Data made so far (in `C:/Users/User/Documents/projects/card-run-2026-11/d2/<fixflow|clinic|zulip>/`): prep, BM25, grep and
RRF (FixFlow) done on all three; `score-nodense.json` scores them. Dense: code ran on a 12-file CPU slice only
(`rank_qwen3_slice.jsonl`); the card (GPU.lock held by D4) is not yet used.

What to look for, in order: (1) leaks: index = tree at the cutoff, held-out ct >= first_heldout_ct, co-change only from
commits before it, edited paths stripped from queries (messages still name directories and modules: a ceiling, not
removed); (2) an arm seeing the answer (RRF seeds are BM25 top 3 only); (3) tie-breaking (`common.rank_files`, one key per
query and file, listed above unlisted); (4) the gate (`score.py`: macro mean of per-repo Acc@10 differences, bootstrap by
query, pass at +0.06 lower... see README; the code tests the point estimate, `gate_pass_0.06`, not the lower bound).

Known gaps, not for the refuter: SweRankEmbed-Small cannot load yet (see report).
