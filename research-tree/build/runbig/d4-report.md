# D4 full run report (2026-11-24)

**Fixed.** B2: 16 AnyBURL tune folders relearned at 60 s / 8 threads. N3 grid extended (0.025; 0.01 run where 0.025 won); _chosen and all ComplEx .npy removed first, so nothing was reused. N3 0.025 won in every repository (d 1000 on FixFlow, d 2000 on the clinic, d 1000 triples on zulip). Tests pass. Fusion weight stayed 0.25, the grid's lowest value, as in the brief.
**B1 (RotatE): not fixable from the source.** I read the paper (arXiv 1902.10197, appendix H, Table 12). It lists, for FB15k-237: "FB15k-237 1000 1024 256 1.0 9" (dimension, batch, negatives, temperature, margin). It states no learning rate and no step count; it says only "We use Adam". The checker's 5e-5 is not in the paper. Not guessing: RotatE is out of the full run and out of the closure wording. Untested: RotatE at the authors' released settings (their code, not read).

**Held-out, once, triples form, weight 0.25, P@10 / recall@10** (commits: FixFlow 53, clinic 51, zulip 494, pooled 598):
- FixFlow: PC 0.247/0.448 (best untrained on tuning), RRF 0.262/0.496, ComplEx-N3 0.141/0.269, AnyBURL 0.172/0.326, PC+ComplEx 0.240/0.448, PC+AnyBURL 0.247/0.446.
- Clinic: RRF 0.167/0.523 (tuning pick), PC 0.179/0.524, ComplEx 0.148/0.394, AnyBURL 0.147/0.410, fused ComplEx 0.179/0.533, fused AnyBURL 0.173/0.522.
- Zulip: INV365 0.101/0.581, ComplEx 0.050/0.250, AnyBURL 0.022/0.079, fused ComplEx 0.101/0.578, fused AnyBURL 0.098/0.557.
- Pooled: best untrained 0.120/0.564, ComplEx 0.066/0.264, AnyBURL 0.046/0.130, fused ComplEx 0.120/0.562, fused AnyBURL 0.117/0.544.
Full intervals (paired bootstrap, 10,000) are in CR/d4/out/result-test.json. Differences to best untrained, pooled: ComplEx -0.053 [-0.060,-0.047]; AnyBURL -0.074 [-0.080,-0.068]; fused ComplEx 0.000 [-0.001,0.002]; fused AnyBURL -0.002 [-0.004,0.000].
Per repository, fused ComplEx: FixFlow -0.007, clinic +0.011 [0.003,0.021], zulip 0.000.

**Verdict.** No learned arm reaches +0.02, pooled or in any repository. Best untrained arm: pair counting with the 1/|e| weight and a 365-day half-life on zulip (INV365), PC on FixFlow, RRF on the clinic. Held-out shows DEC90 adds 0.027 on the clinic over RRF, an untrained arm, not a learned one.
Not tested: RotatE; counts given to the learned forms (they see binary facts); GraIL; a fusion weight below 0.25.

**Cost.** Card about 2 h of training time (logged, selection included), wall about 3.9 h. Nothing broke. The 6-hour projection rule was not triggered.
