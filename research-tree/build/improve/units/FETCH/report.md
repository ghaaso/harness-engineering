# FETCH report (2026-11-24; the FETCH-2 helper's reply text, saved unchanged by coordinator 193c5a98)

FETCH report (draft for units/FETCH/report.md). No downloads, no card use, no GPU.lock taken (nothing needed the card).

**Open item: SweRankEmbed-Large model-00002-of-00003.safetensors is being re-downloaded since 12:51 UTC (another session deleted the verified copy).** The log's earlier OK for that shard is not usable now. I never read its bytes or hashed it. I only ran `ls` and `stat` on the growing file, to see whether the download was moving (about 6 MB/s). Those size readings are not a check and are not recorded. In FETCHED.md the shard is marked "re-downloading since 12:51 UTC; sha256 to be checked by the coordinator". The model-list size (4,932,750,280) and hash (1db9acf8...) are noted as list values only. All meta-device checks used config and code only, and the index check read only the index and the file names.

**Image:** `d2-embed-gpu:3`. It has torch 2.15.0+cu132, transformers 5.24.0 and accelerate. flash_attn is not installed.

**4-bit on the card (from status.md):** bitsandbytes 0.50.2 nf4 Linear4bit with bf16 compute works on the RTX 5070 (sm_120). Test: 256 to 128, batch 4. The output was finite and the max abs diff against a bf16 Linear was 0.156 (reference max 1.79). Batch 1 diff was 0.133. It prints a harmless "no kernels module" notice.

**FETCHED.md:** I appended a section "Added 2026-11-24 (improvement round, FETCH unit; two 7B models)". It has a row per file for SweRankEmbed-Large (rev b2cbc7dd...), SweRankLLM-Small (rev 5f124b0d...) and the gte modeling_qwen.py. Each row gives bytes and sha256. Shard hashes come from model-list.txt and match FETCH's log; I hashed the small files myself. The section's header line gives the totals (14,154,259,561 B and 15,241,462,858 B) and the licence, CC BY-NC 4.0. The gte copy's revision was not recorded anywhere, so I did not invent one.

**Local model folders** (`CR/models/...`):
- `SweRankEmbed-Large`: 3 shards, bidirectional Qwen2 encoder, 7,069,121,024 params, bf16.
- `SweRankLLM-Small`: 4 shards, Qwen2ForCausalLM, 7,612,756,480 params, no remote code.
- `gte-Qwen2-7B-instruct-code`: only `modeling_qwen.py` (65,203 B).

**Safetensors index vs shard files:** both indexes name exactly the shard files present (3 and 4). Every state-dict key of the meta-built models is in the index, with none missing and none extra.

**SweRankLLM-Small:** it builds on the meta device with both sdpa and eager. Use sdpa.

**SweRankEmbed-Large remote code:**
- The two modeling_qwen.py copies are identical except for blank lines (65,177 B vs 65,203 B). `diff -B -w` shows no difference.
- The auto_map points at `Alibaba-NLP/gte-Qwen2-7B-instruct--modeling_qwen.Qwen2Model`, which is the hub repo. Offline it fails: `AutoModel.from_pretrained(..., trust_remote_code=True)` raises "couldn't connect to huggingface.co". The folder's own `modeling_qwen.py` is not what the auto_map resolves to. Either copy is usable only by direct import.
- **Neither copy imports under transformers 5.24.0.** It fails with `No module named 'transformers.modeling_attn_mask_utils'`. With that module stubbed, the import passes. The model then fails to build, because `Qwen2Config` has no `rope_theta` (the setting moved to `rope_parameters` in v5). So the remote code needs porting to transformers 5, or the model must run on another route.
- The native `transformers.Qwen2Model`, built from the folder's config, matches the index exactly (7,069,121,024 params) with both sdpa and eager. But native attention has `is_causal = True`. The model is bidirectional (`is_causal: false` in config). U3 must make it non-causal, for example by setting `is_causal=False` on every self_attn layer and checking the mask path. I did not test this. It needs a numeric check against the remote-code behaviour, which cannot run on this stack. A second route is a transformers 4.x environment, which would need a download and the owner's word.
- sdpa vs eager for the embedder: both build natively. Use sdpa if the non-causal patch holds, otherwise eager. The remote-code route was not tested for either, since it does not build.

**For U3 at 4-bit:**
- Load SweRankLLM-Small with `BitsAndBytesConfig(load_in_4bit, nf4, bf16 compute)`, `attn_implementation="sdpa"`, `HF_HUB_OFFLINE=1`, and `--network none`.
- At bf16 the two models are 14.2 GB and 15.2 GB. 4-bit brings each to roughly 4 to 5 GB, so they fit the 12 GB card one at a time.
- bnb 4-bit on Qwen2 needs accelerate, which is in the image. Take the card lock under `CR/GPU.lock` as `U1/run.sh` does.
- SweRankEmbed-Large's load is blocked by the remote-code problem above, not by the card.
- Wait for the coordinator's sha256 check of shard 2 before U3 loads SweRankEmbed-Large.

Files: C:/Users/User/Documents/projects/card-run-2026-11/FETCHED.md (appended). Scratch scripts: C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/193c5a98-df5a-4e7d-badf-0cb4563c6ad9/scratchpad/meta.py, shim.py and native.py.
