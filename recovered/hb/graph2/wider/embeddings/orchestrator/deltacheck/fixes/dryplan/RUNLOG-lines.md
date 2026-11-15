
## Stage B plan (rulings 36-38), written by stageB.py 2026-11-14T13:51:22.366878Z

Epochs per selected config (stage-A best epoch, rounded up to the eval interval, min 20):
- E1: c04 70 ep (best 70), c15 70 ep (best 70), c12 70 ep (best 70)
- E2: c11 20 ep (best 10), c07 20 ep (best 20), c10 20 ep (best 20)
- E3: c11 40 ep (best 40), c03 60 ep (best 60), c13 130 ep (best 130)
- E4: c12 95 ep (best 95), c13 50 ep (best 50), c16 60 ep (best 60)
- E5: c03 70 ep (best 70), c11 40 ep (best 40), c09 160 ep (best 160)

| s | tune checkpoints (r33 added) | projected wall h (2 containers) |
|---|---|---|
| 1 | 53 (0) | 7.2 |
| 3 | 19 (0) | 2.5 |
| 6 | 10 (0) | 1.2 |
| 10 | 7 (0) | 0.8 |

**s = 1** (under 30 h). Tune checkpoints used: 53 (r33 added 0, r51 added 0). Lag (ruling 52) over the 388 tasks: {0: 388}. Tasks unscored (parent graph without co_changed, ruling 51): 3. Held-out checkpoints at s: 70. plan_hash 43fa692efcd4b00cf4224ff9ec950917722770932db1755349b6edb44bce0d00.
