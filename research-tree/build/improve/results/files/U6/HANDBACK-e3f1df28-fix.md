# U6-FIX hand-back (helper of e3f1df28, 2026-11-24 about 19:50 UTC), saved unchanged by the coordinator

All three items are done and tested on CPU (network off, one container at a time). Nothing is started: the drivers, the card jobs and U5 were not touched, and `finish.sh` has only been dry-run. Each edited .py file was written as a `.new` copy and renamed into place.

**1. Checkpoint cadence (`core.py`, `sweep.py`, `final.py`)**
- `Runner.train` takes a new `epoch_secs=120`. The epoch-end `ckpt.pt` is written only if at least 120 s have passed since the last save. It is always written at the `keep_epochs`, the eval epochs and the last epoch.
- The mid-epoch save every `ckpt_secs` (default 600) stays and is time-gated as before. `sweep.py` and `final.py` have a new `--epoch-secs` flag (default 120).
- Nothing the model sees depends on when saves happen. The batch RNG is seeded by `(seed, epoch, batch)`. The torch RNG is saved in the checkpoint at an epoch end and restored on resume.
- I also save and restore the CUDA RNG state in the checkpoint (old checkpoints without it still load). Before this, a resumed GPU run did not restore dropout's CUDA RNG.
- A crash now loses at most about 120 s of work at an epoch end, plus up to the existing 600 s gap mid-epoch on long zulip epochs.
- Test `test_cadence_resume_equals_straight_run` (clinic tune split, pair stream, TGN, 4 epochs):
  - A straight run with `epoch_secs=1e9` and `keep_epochs=(2,)` wrote checkpoints at epochs [2, 4] only.
  - A run killed inside epoch 3 had written [2] only. Resumed from the epoch-2 state, it ended with the same loss as the straight run (0.5873).
  - Final weights match with `allclose` at atol 1e-5, the same tolerance as the existing resume tests, not bit-exact `torch.equal`.
  - Two `test_u6.py` checks that were not new and were not run this time: bipartite mid-epoch resume, and the no-leak test.

**2. `final.py` retraining a pruned state**
- In `tuneheld`, if `state_e<ep>.pt` is missing from the sweep's runs folder, it retrains. It uses the same seed, settings and data, trains to the chosen epoch with a new `retrain()`, and works in its own folder `OUT/retrain/<variant>/<repo>/<cfg>/`, so the sweep's folder is untouched.
- The retrain is resumable and its resume checkpoint is removed at the end. Afterwards `check_retrain` compares the tuning P@10 with the sweep's `e<ep>.json` and writes `check_e<ep>.json`. A difference is logged but does not stop the run, because GPU sum order can differ. Read it before using the scores.
- Test `test_final_retrain_equals_sweep_state` (dygformer, 4-epoch run keeping epoch 3, against `retrain()` to epoch 3): `bb` and `lp` weights are equal under `torch.equal`, so bit-identical, and the resume checkpoint is gone. It exercises `retrain()` only, not the P@10 comparison, and not the TGN memory state or the bipartite stream.

**3. `finish.sh`** (`bash finish.sh --list` is the dry run)
- It waits until pids 33599, 33603 and 33902 are gone and no `run_sweep.sh` is left in `ps`.
- It then makes up to 3 passes. Each pass lists the grid settings whose last epoch file is missing. It reruns `run_sweep.sh` per repo with the same epoch lists, which resume from their checkpoints. It exits 75 on a card-cap stop. It exits 2 before selection if settings are still missing after 3 passes.
- Next it runs `select_cfg.py`, then `final.py` as `run_gpu.sh final-<kind>-<repo>-<part>` for dygformer and tgn, on clinic, fixflow and zulip, parts `tuneheld`, `f0`, `f1`, `f2` and `f3` (30 jobs, one retry each). Then it runs `merge.py`, after waiting while `CR/improve/U5/fill.running` exists.
- `run_cpu.sh` now accepts `U6_DOCKER_EXTRA`. `finish.sh` uses it to mount `/cardout` for `select_cfg.py` and `CR/improve/U4/tables` as `/u4tables` for `merge.py`. The old `run_cpu.sh` had neither mount, so those two scripts could not have run through it.
- Log: `CR/improve/U6/logs/finish.log`. It creates `CR/improve/U6/merge.running` during the merge.
- Merge locking: `merge.py` already takes `.u6merge.lock` per table file, so `finish.sh` does not hold it as well (that would deadlock). U5's `fill_tables.py` and `run_fill.sh` currently use neither `.u6merge.lock` nor `fill.running`. U5 must create `fill.running` and honour `.u6merge.lock`, or the two merges can still collide. A U5 fill that starts after the check but during the merge is not blocked.
- What the dry run lists (all 4 you named are in it, plus the other 2×3×4 settings for fixflow and zulip that the running drivers will still do):
  - Clinic settings missing now: 20. They are n20 lr 3e-4 (all 4 variants), n20 lr 1e-3, and n32 at all three learning rates, each across dygformer, tgn, bip-dygformer and bip-tgn. These include `dygformer` n20 lr 3e-4, `tgn` n20 lr 3e-4, `bip-dygformer` n20 lr 3e-4 (stopped at epoch 72) and `dygformer` n32 lr 1e-3. `bip-tgn` n20 lr 3e-4 is the job running now.
  - Fixflow settings missing now: all 24. Zulip is also not started.
  - Driver log exits recorded so far: 5 exit 0, 2 exit 1 (dygformer n20 lr 3e-4, tgn n20 lr 3e-4) and 1 exit 137 (the pause kill of `bip-dygformer` n20 lr 3e-4). `dygformer` n32 lr 1e-3 failed under the old adopted job, not under a driver.
  - Then `select_cfg`, the 30 `final` jobs, and `merge`.

**Not done / notes**
- The sweep's own jobs need no restart. Each job picks up the new `core.py` and `sweep.py` when it starts. A job already running keeps the old every-epoch save. The job running now (`bip-tgn` clinic n20 lr 3e-4) is probably still on the old code.
- I ran no GPU test. Retrain's P@10 check and `finish.sh` past its dry run are untested.
- For about 3 minutes `run_cpu.sh` was an empty file, from a failed sed followed by a mv. It is restored and now has 12 lines. No sweep job uses it, only tests and CPU steps, and my own test container had already started.
- `final.py` folds retrain from scratch, and there are no CPU-time estimates for zulip. TGN on CPU at one thread took about 130-180 s per epoch on clinic.
- The `--epoch-secs` flag exists, but the cadence was not tested with a real wall-clock 120 s, only with `1e9`.
- Files changed: `core.py`, `sweep.py`, `final.py`, `test_u6.py` (two tests added), `run_cpu.sh`, and the new `finish.sh`, all in `C:/Users/User/Documents/projects/harness-engineering/research-tree/build/improve/code/U6/`.
