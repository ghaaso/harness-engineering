## Hand-back 1 (2026-11-24T14:09:46.224Z)

U6 is not finished. I stopped early to hand back state, so there is no report, no scores and no card hours yet: no card job has run. The card was held by U3 (a4-sweep, since 13:48 UTC) for the whole time I worked. My first sweep job is queued behind it, and a CPU test is still running.

**Built (all under research-tree/build/improve/code/U6/)**
- `stream.py` builds the co-change event stream and a vectorised "recent neighbours before time t" sampler.
  - There is one event per file pair per commit (commits of 2 to 50 code files, the card's pair rule). Times are in days from the first commit.
  - Edge features are four numbers per event: log1p of the pair's decayed count at half-lives 30 d and 365 d, log1p of its plain count, and log of the commit size. All are cumulative, so no later event enters an earlier one.
  - Node features are U4's Qwen3 vectors from the content snapshot of each block's segment (1024-d, not reduced).
- `u6models.py` imports DyGFormer and TGN unchanged from the DyGLib clone, mounted read-only at `/dyglib`. I added only faster data paths.
  - The DyGLib commit is 3aacc36b94b8d2d8293d70a74fdf6d39089b4163 (read from the clone's `.git`; it is not listed in FETCHED.md or FETCH's report).
  - Defaults are DyGLib's: DyGFormer with channel 50, 2 layers, 2 heads and patch 1; TGN with 1 layer, 2 heads and time dimension 100.
  - The neighbours setting means `max_input_sequence_length` for DyGFormer and `num_neighbors` for TGN.
- `core.py` trains and scores. The loss is `BCEWithLogits` instead of sigmoid plus BCE, which is mathematically the same. Checkpoints:
  - Training state is saved at least every 10 minutes and at each epoch end. TGN checkpoints include its memory.
  - The model state at each evaluated epoch is saved to `runs/.../state_e<epoch>.pt`.
  - A crash between an epoch-end checkpoint and its evaluation is handled on restart.
  - Scores are logits, so they do not saturate into ties.
- `sweep.py`, `select_cfg.py`, `final.py`, `merge.py`, `run_cpu.sh`, `run_gpu.sh`:
  - `run_gpu.sh` takes `CR/GPU.lock` with `mkdir`, polls every 60 s and never breaks a lock. It logs start, end, exit code and peak card memory to `CR/logs/improve-U6.log`.
  - `final.py` scores the tuning and held-out blocks with the frozen model, and trains the four time folds for the training blocks.
  - `merge.py` writes only the `B5_DYGFORMER` and `B5_TGN` columns into U4's tables, under a lock directory, and writes the held-out ranking files `[tasks, files]` with -inf elsewhere.
  - `select_cfg.py` is written but not run.
  - `final.py`, `merge.py` and `select_cfg.py` have never been run.

**Step 1, the import check.** In `d2-embed-gpu:3` with the network off, every import DyGLib's model and utility code needs is present (torch 2.15.0, numpy, pandas, sklearn). Nothing was downloaded, and no DyGLib code was copied.

**Tests passed on CPU, network off**
- The sampler returns the same neighbours as DyGLib's own `NeighborSampler` ('recent'), and a query never sees an event at its own time.
- Edge features match a brute-force recount, and a changed later commit leaves earlier features unchanged.
- FastDyGFormer gives the same embeddings as DyGLib's DyGFormer (neighbours 20 and 32), and FastTGN gives the same embeddings and memory as DyGLib's MemoryModel (TGN) over several batches.

**Still running on CPU:** `test_no_event_at_or_after_cutoff_enters` and `test_resume_equals_straight_run`, started with one thread, so they are slow. Log: `/tmp/u6t.log`.
- The first run of the leak test failed for TGN only. Two training runs on the same data gave parameters up to 0.09 apart. The cause is multi-thread CPU sum order amplified by Adam, not a leak. DyGFormer passed.
- I reran with one thread; that run has not finished. Only a pass of both tests shows that no event at or after a cutoff reaches a model's neighbours or memory, and that a resumed run matches a straight one. Until then both are unproven.

**Data sizes.** The streams are small: FixFlow 11,041 pair events (3,865 before the tuning split), clinic 10,298 (5,994), zulip 352,715 (342,722). Training on FixFlow and the clinic is therefore very short. Epochs there cost seconds and zulip about 1,700 batches per epoch.

**Queued job.** `run_gpu.sh sw-dygformer-clinic-n32-lr1e-3` (`sweep.py --repo clinic --kind dygformer --nbr 32 --lr 1e-3 --eval 2,5,10`) was started with `nohup` and is polling for the lock. Its log is `CR/improve/U6/logs/job-sw-dyg-clinic-n32-lr1e-3.out`. Its first results will give the real GPU speeds.

**Sweep plan (nothing run)**
- Neighbours 20 and 32, learning rate 1e-4, 3e-4 and 1e-3, each for both models.
- Epochs up to 100 on FixFlow and the clinic, and about 1 to 8 on zulip, to be fixed after the speed test.
- That is roughly 36 jobs, one lock hold each.
- Choice per repository on its own tuning P@10, as the card did. I would also report the single pooled-selected setting, because the brief says pooled and zulip is 192 of the 260 tuning commits.

**Open points**
- Not tested: the commit-node bipartite stream. Only the pair stream is built.
- Single seed 0 per configuration.
- Cross-fit folds on FixFlow and the clinic: their first folds have almost no earlier history. Folds under 300 training events will be left as NaN.
- Races on U4's tables: U5 may rewrite the same tables for its own column, and my lock does not stop it. I do not know how U5 writes them.
- Raising the card's batch size or shrinking anything is not planned.

**To continue:** wait for the CPU tests, then run `run_gpu.sh <job> sweep.py ...` jobs one at a time. Then run `select_cfg.py`, `final.py` (`tuneheld` and `f0` to `f3`, per kind and repo) and `merge.py`. After `merge.py`, verify that U4's other table columns are unchanged.

Card hours used so far: 0.

## Hand-back 2 (2026-11-24T14:25:34.352Z)

U6 is still not finished: no card job has run (0 card hours) and there are no scores, no frozen choice and no report. This is the state I'm handing back. The card is held by U3 (a4-sweep, since 13:48 UTC), and my first sweep job is queued behind it.

**Tests (CPU, network off)**
- Passed: the sampler matches DyGLib's own `NeighborSampler`, and edge features are cumulative. FastDyGFormer matches DyGLib's DyGFormer, and FastTGN matches DyGLib's MemoryModel.
- Passed: `test_no_event_at_or_after_cutoff_enters`. I replaced every commit from the second tuning block's start on, and the scores of both tuning blocks stayed bit-identical for DyGFormer and TGN after a short training and the memory replay. This is the check that no event at or after a cutoff reaches a model's neighbours or memory.
- Failed once, then fixed: `test_resume_equals_straight_run`. The restart did not restore torch's random state, so dropout differed after a resume. Checkpoints now save and restore it. I reran the test with one thread; it was still running when I stopped (background ID b5l9fwe8j, output file `C:\Users\User\AppData\Local\Temp\claude\29140a92c6ee6732\807f5dc3-0a29-44f0-8f3a-f7bf850f6fb2\tasks\b5l9fwe8j.output`). Until it prints "ok", resume equality is unproven.

**Queued job.** The sweep job `sw-dygformer-clinic-n32-lr1e-3` is polling for `CR/GPU.lock`. Its log is `CR/improve/U6/logs/job-sw-dyg-clinic-n32-lr1e-3.out`. That is a `nohup` process from my earlier turn. If this run was restarted, check that it is still alive.

**Code.** Everything is in `research-tree/build/improve/code/U6/`: `stream.py`, `u6models.py`, `core.py`, `sweep.py`, `select_cfg.py`, `final.py`, `merge.py`, `run_cpu.sh`, `run_gpu.sh`, `test_u6.py`. The DyGLib commit is 3aacc36b94b8d2d8293d70a74fdf6d39089b4163, read from the clone's `.git`. The earlier handback of this unit has the full design and open points.

**Not run:** `select_cfg.py`, `final.py` and `merge.py` have never run. The commit-node bipartite stream is not built, so only the pair stream is covered. One seed per configuration.

**To continue**
1. Confirm the resume test passes.
2. Run the sweep jobs through `run_gpu.sh` one config at a time. Each stays within its lock hold, and the lock is released between configs.
3. Run `select_cfg.py`, then `final.py` for `tuneheld` and `f0` to `f3` per model and repository.
4. Run `merge.py`, then check that U4's other table columns are byte-identical.
5. Write the report, ending with the frozen choice, tuning P@10 per repository and pooled against the best untrained arm and U4's B2, and the card hours.

Card hours used: 0.

## Final reply text (2026-11-24T14:34:23.919Z)

The resume test now passes: `test_resume_equals_straight_run` printed "ok" after the random-state fix, and `all U6 tests passed`. U6 is still unfinished, and no card job has run, so card hours used are 0.

- **Tests:** all the CPU tests pass. That covers the sampler against DyGLib's own, DyGFormer and TGN against DyGLib's classes, the check that no event at or after a cutoff reaches a model, and resume matching a straight run.
- **Card:** the first sweep job (clinic, DyGFormer) is still waiting for `CR/GPU.lock`, held by U3.
- **Not run:** the sweep, `select_cfg.py`, `final.py` and `merge.py`. B5's columns are not in U4's tables yet, and no held-out ranking files exist.
- **Not built:** the commit-node bipartite stream, so only the pair stream is covered.

The next step is the card sweep through `run_gpu.sh`, one config per lock hold, then selection, final scoring and the merge into U4's tables. The code is in `research-tree/build/improve/code/U6/`.
