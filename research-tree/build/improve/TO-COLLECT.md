# TO-COLLECT: items for the improvement round (for one collect helper; nothing is downloaded)

From `CANDIDATES.md` (2026-11-24). For each item, read the official page and record:
- the exact version or revision;
- the download size in bytes as the source states it;
- the licence as the page declares it;
- the dependencies that are not already in the image `d2-embed-gpu:2`. That image is `graphtest-kge-gpu:1` plus the packages in its `/opt/freeze-after.txt`: torch 2.15.0+cu132, transformers 5.24.0, sentence-transformers 6.3.0, einops.

Fill in what is left open in `../runbig/DOWNLOADS.md`'s format. Do not download or install anything; that needs the owner's word (rule 3).

**Rule 4.** Requests carry only the public package, model or repository names below. Never a project name, path or identifier.

## For this round

| # | item | official source | what it is for | note for the collector |
|---|---|---|---|---|
| 1 | LightGBM (wheel for cp311, manylinux x86_64) | https://pypi.org/project/lightgbm/ | LambdaMART rankers A1, A2, B1, B2 (units U1, U4, U7) | needs numpy and scipy: check whether scipy is in `/opt/freeze-after.txt` |
| 2 | scipy (only if absent from the image) | https://pypi.org/project/scipy/ | LightGBM dependency | wheel size for cp311 |
| 3 | tree-sitter 0.27.0, tree-sitter-python 0.25.0, tree-sitter-javascript 0.25.0, tree-sitter-typescript 0.23.2 | https://pypi.org/project/tree-sitter/ (and the three grammar pages) | function-level chunks (A5, A6, A4, A7) | sizes are in DOWNLOADS.md (701,771 + 108,133 + 99,728 + 344,960 B); they were in the approved list (r57-0065) but are not in FETCHED.md; confirm that they were never installed |
| 4 | peft | https://pypi.org/project/peft/ | LoRA fine-tune of Qwen3-Embedding-0.6B (A5, unit U2) | version compatible with transformers 5.24 |
| 5 | bitsandbytes | https://pypi.org/project/bitsandbytes/ | 4-bit loading of the two 7B models (A4, A6, unit U3) | does it support CUDA 13.2 / torch 2.15 and the RTX 5070 (Blackwell)? Wheel size |
| 6 | accelerate | https://pypi.org/project/accelerate/ | device placement for 4-bit loading in transformers (U3) | whether transformers 5.24 requires it for bitsandbytes |
| 7 | SweRankEmbed-Large (7B retriever) | https://huggingface.co/Salesforce/SweRankEmbed-Large (confirm the name on https://huggingface.co/Salesforce) | arm A6 | size of all files; licence; base model; whether loading needs remote code (as Small did) |
| 8 | SweRankLLM-Small (7B listwise reranker) | https://huggingface.co/Salesforce/SweRankLLM-Small (confirm as above) | reranker A4 | size; licence; prompt format and window settings from the model card |
| 9 | SweRank code (listwise reranking prompt and inference script) | the code repository linked from the SweRank model cards (locate it there) | A4's prompt, window and stride, as the authors ran them | licence; which files hold the prompt; size |
| 10 | DyGLib (DyGFormer, TGN) | https://github.com/yule-BUAA/DyGLib | temporal arm B5 (unit U6) | licence; its requirements file (pandas, scikit-learn?); repository size |
| 11 | Qwen3-Embedding-8B (fallback for A6 if item 7's licence or loading fails) | https://huggingface.co/Qwen/Qwen3-Embedding-8B | arm A6, fallback | size; licence (0.6B is Apache-2.0) |
| 12 | Qwen3-Reranker-4B (fallback for A4) | https://huggingface.co/Qwen/Qwen3-Reranker-4B | reranker A4, fallback | size; licence |
| 13 | free disk space on the drive that holds CR | local check (`df` on the host path) | items 7, 8, 11 and 12 are 7B-8B weights in bf16, expected about 15 GB each | report the free bytes |

## Not for this round (sizes and licences only, so a later round need not collect them again)

| # | item | official source | what it would be for | note |
|---|---|---|---|---|
| 14 | ULTRA code and released checkpoints | https://github.com/DeepGraphLearning/ULTRA | B6 | licence; checkpoint sizes; whether its sparse kernel compiles at first use (nvcc, ninja) and which torch-geometric version it needs |
| 15 | GraIL | https://github.com/kkteru/grail | B8 | licence status (DOWNLOADS.md: none declared by the GitHub API); the owner must be told before any use |
| 16 | RotatE released settings (`best_config.sh`) | https://github.com/DeepGraphLearning/KnowledgeGraphEmbedding | B10; also closes the D4 report's open item: the learning rate and step count for FB15k-237 | quote the FB15k-237 line exactly; licence |
