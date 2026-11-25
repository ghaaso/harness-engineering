# D2 Phase A report (TRACK-PLAN 3.7), 2026-11-24

**Gate: FAIL for Qwen3-Embedding-0.6B.** +2.9 points Acc@10 over BM25 (macro of three repositories, 95 % interval -3.6 to +9.4; the gate is 6 points). SweRankEmbed-Small was not run. Fail drops this embedder at shelf settings for our localisation; tuned and larger retrievers stay open. One embedder, one form, one run.

**What ran.** Four breaking findings fixed (README carries the dated correction): B1 history read from `main`; B2 extension-less file names stripped (whole word); B3 the 0.45/0.68 lines on top-2 precision (P@2); B4 RRF ties by the shared random key. `score.py` now fails on a missing query. Tests: `test_d2.py` 10/10; refuter's tests 4 of 6 pass (B1, B2, B4, missing-query). The two failing are not code faults: `test_seed_lines` needs BM25's Acc@10 and P@2 to agree on the line (data decides: 0.706 vs 0.251), and `test_gate_on_point_estimate_only` is the informational interval test (3.7 sets no interval rule). Prep and CPU arms re-run on all three repositories, then Qwen3 on the card.

**Scores** (Acc@10 macro, 95 % interval; per repository fixflow / clinic / zulip; pooled P@2 and its line verdict):

| arm | Acc@10 macro | per repository | P@2 | line |
|---|---|---|---|---|
| BM25 | 0.653 (0.597-0.708) | 0.594 / 0.588 / 0.777 | 0.251 | stops |
| grep | 0.498 (0.442-0.555) | 0.565 / 0.388 / 0.541 | 0.127 | stops |
| Qwen3 | 0.682 (0.631-0.732) | 0.826 / 0.450 / 0.769 | 0.258 | stops |
| RRF (FixFlow only, co-change stand-in) | 0.449 (0.333-0.565) | 0.449 | 0.123 | stops |

Qwen3 minus BM25: fixflow +23.2, clinic -13.8, zulip -0.8 points. RRF is 14.5 points under BM25 on FixFlow. Not tested: the 5,400-node typed graph, tuned or fine-tuned retrievers, other chunking.

**Limits.** n = 69 + 80 + 242 = 391 against 617 (zulip capped at 250 held-out; fixflow 87 held out on `main`, 18 dropped for no edited file in the cutoff index). Best possible P@2 is 0.83 / 0.84 / 0.77 (a one-file commit caps it at 0.5). BM25's ceiling: messages still name directories and modules; code-only Acc@10 (non-docs truth) BM25 0.58 / 0.54 / 0.77, Qwen3 0.88 / 0.49 / 0.80. FixFlow still has 9 of 69 docs-only queries.

**Cost.** Card about 0.15 h (jobs 1 min, 2 min, 5 min); wall 1 h 51 min, nearly all waiting on D4's GPU.lock (logged); CPU re-run 2 min each time. Broke: a PowerShell-style escape lost `\b` in the first B2 patch (caught by the zulip scope count, redone); `pkill` is absent here. Data: `CR/d2/score-final.json`.

**SweRankEmbed-Small needs, for the owner's approve: line** (sizes not measured, no network used):
1. `configuration_hf_nomic_bert.py` from Hugging Face repo Snowflake/snowflake-arctic-embed-m-long (the model's `auto_map` points there; `modeling_hf_nomic_bert.py` is already local, 52,571 B). A few KB expected.
2. Python package `einops` (imported by the modeling file; pure Python wheel, no dependencies; tens of KB expected). Missing from `d2-embed-gpu:1`.

## SweRankEmbed-Small: set-up (2026-11-24)

Fetched with approval r57-0072, nothing else: `configuration_hf_nomic_bert.py` 1,956 B (sha256 8b42dd8e...4d74; `auto_map` names no revision, so repo `main`) and the einops 0.8.2 wheel 65,638 B (sha256 54058201...8193, matches PyPI). No further file was needed. Both are in CR/FETCHED.md. Image `d2-embed-gpu:2` = `:1` plus the wheel (`pip --no-index --no-deps`, built with network off).
Two local changes, no download: the model is loaded from `CR/models/SweRankEmbed-Small-local` (what `run_gpu.sh` already names), a copy whose `config.json` `auto_map` points at the local files (the original dir is untouched); and in the copy's modeling file a 4-line shim for `get_extended_attention_mask`, which transformers 5.24 removed (same arithmetic as 4.x).
CPU smoke check in the container, network off: loads, all keys match, 3 strings embed to 768-d, identical text gives cosine 1.0.
Waiter: PID 28741 (`CR/d2image/swerank-waiter.sh`), log `CR/logs/d2-swerank.log`, polls every 60 s; D4 holds the lock (d4 27019). On the lock it runs the three repositories, scores, appends the table below this section. Expected card time about 5 to 10 min (Qwen3 took 8 min over three jobs; this model is smaller).

## SweRankEmbed-Small (the waiter ran the card part; its table step failed on a Windows path, so the coordinator f6ee0985 ran swerank-table.mjs by hand on the same score file)

Run 2026-11-24T10:21:30.362Z, card plus scoring 6.6 min, same queries, corpora, cutoffs, chunking and fixed scoring as the Qwen3 arm; data CR/d2/score-swerank.json. n = 69 + 80 + 242.

| arm | Acc@10 macro | per repository (fixflow / clinic / zulip) | P@2 | line |
|---|---|---|---|---|
| bm25 | 0.653 (0.597-0.708) | 0.594 / 0.588 / 0.777 | 0.251 | stops |
| grep | 0.498 (0.442-0.555) | 0.565 / 0.388 / 0.541 | 0.127 | stops |
| qwen3 | 0.682 (0.631-0.732) | 0.826 / 0.450 / 0.769 | 0.258 | stops |
| swerank | 0.669 (0.617-0.722) | 0.739 / 0.475 / 0.793 | 0.284 | stops |
| rrf | 0.449 (0.333-0.565) | 0.449 / - / - | 0.123 | stops |

SweRankEmbed minus BM25 (Acc@10 points): fixflow +14.5, clinic -11.3, zulip +1.7; macro 1.6 (95 % interval -3.9 to 7.3); gate (6 points, lower bound as scored) FAIL. One embedder, one form, shelf settings; the Qwen3 arm and BM25 rows are repeated from score.py on the same files.

