# FETCH status (2026-11-24)
Step 1 DONE. Image `d2-embed-gpu:3` built (FROM :2, wheels --no-index --no-deps, --network none). Wheels in CR/d2image/wheels-3/, all five sha256 match PyPI.
Smoke (network off): lightgbm 4.7.0 lambdarank on 20 rows trains and predicts; peft 0.22.0, accelerate 1.16.0, psutil 7.2.2, bitsandbytes 0.50.2 import.
(bitsandbytes prints a harmless notice: no `kernels` module for its CPU gemm path.)
4-bit on the card (RTX 5070, torch 2.15.0+cu132, capability (12,0)): bnb.nn.Linear4bit nf4, compute bf16, 256->128, batch 4: runs, output finite, max abs diff vs bf16 Linear 0.156 (ref max abs 1.79); batch 1 diff 0.133. Verdict: bitsandbytes 4-bit WORKS on sm_120.
Use image `d2-embed-gpu:3`. Step 2 (models) now starting.
