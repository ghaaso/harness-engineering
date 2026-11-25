# System review of the improvement round, part "graph" (U5, U6), 2026-11-25 about 09:00-09:40 UTC

Verdict: 1 BREAKING, 4 SERIOUS (one not proven), 11 NOTES.

Read only. Code read at these file times (local, UTC+5): `code/U6/finish.sh` 00:29, `run_sweep.sh` 01:01, `run_gpu.sh` 00:56,
`core.py`/`sweep.py`/`final.py` 00:26, `select_cfg.py`/`merge.py` 19:51; `code/U5/train.py` 22:14, `fill_tables.py` 19:01,
`run_gpu.sh` 00:56, `sweep_driver.sh` 19:15; `cardgate.sh` 13:45 (25 Nov). Two node scripts that only read the sweep's
`e*.json` files are in `CR/review-2026-11-25/graph/` (`sel.js`, `sel2.js`).

## BREAKING

### B1. U6's selection can only choose epoch 2: the two epoch grids share one value
- Where: `code/U6/select_cfg.py:20` (the key is `(kind, stream, nbr, lr, epoch)`), `:50` (a key counts only if all three
  repositories have it), `:61` (best of those rows); `code/U6/finish.sh:11` (`EV_SMALL=2,5,10,20,40,70,100`,
  `EV_ZULIP=1,2,3,4,6,8`); `code/U6/final.py:56` (one `epochs` for every repository).
- Scenario: the clinic and FixFlow are evaluated at 2,5,10,20,40,70,100 and zulip at 1,2,3,4,6,8. The only epoch in both
  lists is 2. So the pooled table holds only epoch-2 rows. `finish.sh` runs `select_cfg.py` after the sweep and then 30
  `final.py` jobs and the merge, without anyone looking. B5 is then frozen at 2 epochs in every repository. On the clinic and
  FixFlow that is 60 or 40 training batches. The tuning P@10 in U6's report, B5's columns in U4's tables, B5's held-out ranking
  files and what U7 stacks all come from those nearly untrained models.
- Evidence (`sel.js` and `sel2.js` on the 60 sweep folders on disk now): of the rows on all three repositories, 13 of 13 have
  epoch 2.
  - DyGFormer as the code would choose: pair n32 lr1e-4 epoch 2, pooled 0.0809 (clinic 0.009, FixFlow 0.142, zulip 0.083).
  - The same setting with each repository's epoch chosen on tuning: pooled 0.1076 (clinic e40 0.100, FixFlow e40 0.195,
    zulip e8 0.093).
  - TGN: 0.0260 as written, against 0.0393 with the epoch chosen per repository.
  - The handback of 4f04d618 records a clinic P@10 of 0.103 at epoch 20 against 0.117 for the best untrained arm. At epoch 2
    the clinic number is 0.009.
- Happened: no. `select_cfg.py` has never run (`finish.log` has one line, the start at 22:08:11Z). It will happen when the
  zulip drivers end, unless repaired first.
- Smallest repair: in `select_cfg.py`, drop the epoch from the pooled key and give each (kind, stream, nbr, lr) its best
  tuning epoch per repository. Write `epochs` as `{repo: ep}`. `final.py:56` then reads `ch['epochs'][a.repo]`. This is still
  chosen on tuning only. A second way: choose the setting pooled and the epoch per repository.

## SERIOUS

### S1. The "known fault" in `fill_tables.py` is not a fault; the ordered "fix" would break a correct mapping
- Where: `code/U5/fill_tables.py:14` `SPLITDIR = {'train': 'train', 'tune': 'tune', 'test': 'heldout'}`. The key is U4's
  table folder (`tables/<repo>/test`, which exists). The value is U5's scores folder: `train.py:352` writes
  `save_scores('heldout', ...)`, `:354` writes `'tune'` and `:332` writes `'train'`.
- Scenario: the state file (02d5327b, step 2) tells the next U5 helper to "fix `fill_tables.py`'s held-out folder (`heldout`
  there, `test` in U4's tables)". Change the value and the fill finds no scores (`SystemExit 'no scores'`). Change the key and
  `os.listdir(tables/<repo>/heldout)` fails. The failure is loud, not a wrong number, but it costs a helper round.
- Happened: no.
- Repair: strike that item from the state file's next steps. The mapping is right as it is.

### S2. U5 resumes a mid-epoch checkpoint by repeating the whole epoch on already-updated weights
- Where: `code/U5/train.py:175-176` saves `partial=True` while `st['ep']` is still the current epoch. `:141-143` loads the
  weights and Adam state and ignores `partial`. `:153-156` re-seeds and replays the epoch from its first unit.
- Scenario: a run killed after a mid-epoch save (an epoch over 600 s, or the first save after a pause, since the clock runs
  while paused) trains the first part of that epoch twice. The resumed run does not equal a straight run.
- Happened: once. `gat_L2_H64_N5_hl90_qwen_s0` was started by the card worker (the driver logs `work rc=1` at 00:31 local) and
  was resumed on CPU: `cpu-worker.log:304` "resumed from epoch 0", then a full 412 s epoch 1. It was also trained partly on the
  card and partly on CPU. Its pooled score was 0.1295 against 0.1314 for the frozen choice (`sage_L1_H128_N20`), so the choice
  is very likely unchanged. Its row in the sweep table is not a straight run.
- What remains: the fold jobs (fold0 took 51 s) and `final` have short epochs, so a repeat is unlikely.
- Repair: on load, if `d['partial']`, restore the epoch's unit position (save `ui`) or drop the partial state. A note in U5's
  report about the one affected row is enough for the result.

### S3. U5's training-block scores come from models trained on later blocks; U6's do not
- Where: `code/U5/train.py:329` `tr = [b for b in trainb if fold_of[...] != f]`. Fold 0 (the earliest blocks) is scored by a
  model trained on folds 1 to 3, which are later in time. `code/U6/final.py:76-88` trains only on events before the fold's
  first block.
- Scenario: B4's training column in U4's tables has a leak in time: weights learned from co-change labels after the block's
  cutoff. B5's training column does not. The reported number is harmed only if something fits on training rows.
  `units/U7/BRIEF.md` says to fit on tuning. But U4's `rank.py fit` concatenates `table(r, 'train', ...)` (`rank.py:92`), and
  the known U7 points name `rank.py refit`. If U7 uses that route with B4, the B4 weight is inflated by the leak.
- Happened: fold0 is written (`crossfit/fold0.json`). Folds 1 to 3 are waiting for the card.
- Repair: train fold f on the folds before it only, as U6 does. The first fold then gets NaN where history is too short. Or
  state in U7's brief that the B4 and B5 training columns must not be used for fitting.

### S4 (not proven). The zulip bipartite-TGN stall was mid-training, not at the evaluation, and the rerun passes the same point
- Where: `sw-bip-tgn-zulip-n20_lr0.001`. `driver-zulip-z2.out`: epoch 5 ended 04:00:29Z, then nothing until exit 137 at
  08:22:59Z.
- Evidence: the card telemetry (local time) shows a checkpoint gap at 09:00:38-09:01:06, training at 40-70 % from 09:01:15 to
  09:02:48, then 0 % with memory flat at 9,253 MiB until 13:20. The stall began about 100 s into epoch 6's training. The
  gate's note on its own test says the old run "failed at the epoch-6 evaluation". That is true of the two n20 runs that went
  out of memory under 5,744 MiB, not of this one.
- Scenario: `finish.sh` reruns it from `ckpt.pt` (epoch 5, 1.67 GB) through the same epoch 6. If the stall can repeat, the job
  stalls again. No watchdog is in yet (`units/WATCHDOG/` does not exist), and every finish pass reruns it. After 3 passes the
  script exits 2 before selection.
- Check that settles it: when this rerun passes epoch 6 (`e6.json` appears), the stall was not deterministic.

## NOTES
1. Disk: 29 GB free on C: (`df`, 09:02Z). `CR/improve/U6/runs` holds 23 GB. A zulip bip-TGN run peaks near 10.7 GB (six
   1.51 GB states plus a 1.67 GB `ckpt.pt`) before its prune. Three n32 bip-TGN zulip settings remain, and the n20_lr0.001
   folder still holds 7.2 GB unpruned. `final.py` keeps every fold's `ckpt.pt` (`folds/<vn>/<repo>/f<i>`; up to 4 × 1.67 GB
   if bip-TGN is chosen). The estimate is about 13-17 GB free at the low point, before U2 and U3. `atomic_save` gives up after
   8 × 30 s.
2. `final.py:60/85`: `scores/<kind>/<repo>` and `folds/<vn>/<repo>/f<i>` are not keyed by setting or epoch, and finished
   blocks are skipped. If `select_cfg` is ever rerun with a different choice (for example after B1's repair, if any final
   already ran), old scores and fold checkpoints are reused silently. Clear them when the choice changes.
3. `final.py:47`: when a pruned state is retrained, a tuning P@10 that differs from the sweep's is only logged
   (`retrain/.../check_e<ep>.json`). With B1 as written, every chosen state (epoch 2) has been pruned for pair DyGFormer
   n32 lr1e-4 on all three repositories, so all would be retrained. The report must read the check files.
4. `finish.sh` has no single-instance guard. A second copy started while the first is alive would run the same `final-*` job
   (not claimed, unlike `sw-*`) into the same fold folder. Nothing restarts `finish.sh`, the drivers or U5's `sweep_driver.sh`
   after a reboot.
5. The gate need for `final-*` names (`cardgate.sh:62`) has no `n32` in the name, so an n32 TGN final declares 6,144 MiB, not
   7,680. A bip-TGN zulip final that needs about 8.4 GiB declares 6,144. Expect one out-of-memory exit 76 and an uncapped rerun
   per such job (time, not results).
6. Stale claim folders: `claims/sw-dygformer-clinic-n20_lr0.001` (pid 114652) and `sw-tgn-zulip-n20_lr0.0001` (pid 122228),
   both settings done and both pids gone. They are reclaimed if needed. `CR/gate/held/1795550384-115321` remains for U5's
   killed worker (gate part).
7. U6 sweep runs resumed before 19:26Z (the pause) restored no CUDA RNG, so their dropout stream differs from a straight run.
   They are equal in distribution, not bitwise.
8. U6's `scores/<kind>/<repo>/<k>.npy` are row vectors aligned to the table rows. Only `heldout/B5_*/<repo>/<k>.npy` are
   `[tasks, files]`. `rank.py --extra` expects `[tasks, files]` for every block (`rank.py:10`). U7 must take B5 from the table
   columns.
9. U5's whole sweep (24 runs) ran on CPU (`peak_gpu_gb` null in every `runs/*.json`). The folds and `final` run on the card.
   U5's report should say so (brief item 4).
10. `merge.py` and `select_cfg.py` have never run, and `test_u6.py` has no test of them. `merge.py` writes the held-out `.npy`
    files without tmp and rename (a rerun rewrites them).
11. Three leftover background shells of an ended session (pids 98382, 98456, 99445) poll every 60 s and only print. They are
    harmless.

## Checked and found sound
- `fill_tables.py` split mapping (S1). Its train-row NaN guard and its skip of filled tables.
- U6's resume logic: the epoch-end checkpoint is saved before the evaluation, and the evaluation is redone on resume (seen:
  "resumed at epoch 6 batch 0" then the EVAL of epoch 6). The batch RNG is seeded by (seed, epoch, batch). The time-gated
  epoch-end save cannot skip an evaluation file.
- A skipped saved block in TGN `score_blocks` still replays every event. DyGLib's memory messages do not use node features.
- Saves are atomic (tmp then `os.replace`) in U5 and U6. No `.tmp` or `.stale` leftovers under `CR/improve/U6`. The two
  17:11Z failed settings (dygformer clinic n20 lr3e-4, n32 lr1e-3) now have every epoch.
- Every U6 `e*.json` was scored on the same commits: clinic 34, FixFlow 34, zulip 192. Training events per repository are the
  same in every one (5,994; 3,865; 342,722).
- No CPU fallback in U6's sweep. Epoch times are 0-19 s on the small repositories and 49-402 s on zulip, all card-speed.
- U6's selection and comparisons use tuning only. U4's held-out `label` is empty (U4 report), and U5's `final` asserts it.
- `merge.py` writes only the B5 column under `.u6merge.lock`, checks every other column string for string, and re-reads the
  live file before the swap.
- `finish.sh` grid names match the sweep folder names (`Number('1e-4')` gives `0.0001`, as `%g` does). Exit codes 75, 2, 3,
  4 and 5 are passed on. The run_sweep claims handle a dead owner.
- U5: graph and pairs only from `commits[:hend]` (`prep.py`, `u5lib.build_graph`). The selection (`freeze`) and the frozen
  epoch are chosen on tuning, and `final` checks that it reproduces its tuning score within 2e-3.

## Not examined
- `stream.py` and `u6models.py` against DyGLib, beyond what `test_u6.py` and the hand-backs say. `test_u5.py`,
  `embed_swerank.py`, `report.py`'s `tune_report`, and U4's feature caches.
- The cause of S4's stall (no container log beyond the driver's).
- The gate's admission and waiting (the gate part). The WATCHDOG change, which is not in (no `units/WATCHDOG/report.md` at
  09:40Z).
- Whether U7 will use `rank.py refit` on training rows (the end part).
