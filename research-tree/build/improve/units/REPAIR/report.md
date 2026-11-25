## Review repairs (r57-0097): all 7 done, each with one check that passed

**Act on these first:**
1. **U2 now costs about 21-49 card hours, not 7.** It went from 3,787 to about 27,500 training examples. The Qwen3 sweep is most of it. The finish time sent to the owner (Thursday about 07:30 UTC) no longer holds. U2's brief says 5-7 h and "stop a job that projects past twice its estimate", so that rule would trip.
2. **A6 can still be lost to an unrepaired fault.** Coordinator 8 changed the gate at 09:46 UTC: U3 a6* now declares 6,144 MiB, so torch is capped at 5,744. A6's need after the rotary fix is at least about 5,100 MiB (8,442 + 40 − 3,360), so it has roughly 600 MiB of room. If it still runs out of memory, `code/U3/a6chain.sh:6` (`python -B a6.py check || exit 1`) turns exit 76 into 1. The job then ends with no alone rerun and no learned mark. The fix is one line, `|| exit $?`. I did not make it because that file is not in my brief. a6-chain is now waiter 544784 (coordinator 8's requeue, which runs the new run.sh).
3. **Only one U2 chain may run.** If U2's old helper (agent-af3c23686f5a5eee2) wakes, it must not start a second chain.

The changed files are under `research-tree/build/improve/code/`. Every replaced file was swapped by rename, and each old copy is kept beside it as `<name>.before-review`.

### Repair 1: U2 rebuilt at 20,000 zulip commits and restarted
- **Shells ended:** 181978, 354644 and 404883 were ended with kill -9; the tool accepted it. They held no card and no wait entry. The held wait file stays in `CR/gate/held-u2-2026-11-25/` as a record.
- **Old state moved aside:** `CR/improve/U2/sweep`, `models`, `ckpt` and the 2,500-commit `pairs/zulip` are now in `CR/improve/U2/before-review-2026-11-25/`, with a copy of the old chain.sh.
- **Pairs rebuilt:** `mkpairs.py zulip --zcap 20000` took 461 s (log `CR/improve/U2/mkpairs-zulip-20000.log`). It gave 20,000 commits, 48,213 pairs (was 6,145), 288,165 chunks and 80 pools. max_ct 1790972688 is still below t_tune 1790986648.
- **`U2/mkpairs.py`:** the default `ZCAP` is now 20,000, so a rerun without the flag cannot bring the fault back. Nothing else uses it.
- **`U2/filter_ranks.py`:** zulip's filter now embeds 198,104 chunks (was 49,715). That is about 30-40 min of silence, and the gate's hang watch kills U2 non-final jobs after 2,400 s with no output line; the job has no save. It now embeds in slices, in the same length order `U.encode` uses, and prints a line after each slice and every 5,000 pairs ranked.
- **`CR/improve/U2/chain.sh`:**
  - It refuses to start unless `info.json` shows the 20,000-commit build.
  - It runs the zulip filter for SweRank, then Qwen3, each skipped if its rank file exists. Then it runs the sweeps, the two finals, and the fill.
  - Every line ends `|| exit 1`, the fill line included.
  - It does not repeat the resume test, which passed at 01:10 UTC and tests save and resume, not the data.
- **Started:** chain pid 537917, log `CR/improve/U2/chain-20000.log`. Its first job, filter-swerank (537919), was fifth in the queue at 09:49. A RESUME line is in `gate.log`.
- **Checks:**
  - `test_u2.TestPairs` on the rebuilt data: 5 tests OK, including "no pair at or after the tuning start" over all 48,213 zulip pairs (`CR/improve/U2/test-pairs-20000.log`).
  - New filter on FixFlow on CPU, in 5 slices: 249 of 249 ranks identical to the card's file (median 46, max difference 0).
- **Not done:**
  - The zulip filter ranks themselves; they are the chain's first two card jobs.
  - Text S1 (each stage job recomputes the start-model baseline, about 2 min per job) was not in my list.
  - My CPU check's docker client was cut by its timeout, and the tool refused `docker kill` on that scratch container. It ran on 4 CPUs until about 09:49 and then ended by itself; it wrote only to scratch.

### Repair 2: `run.sh gpu` passes the exit code
- **Files:** `U2/run.sh` and `U3/run.sh` now end the gpu branch with `exit $rc`. The fill line's `|| exit 1` is in the new chain.sh.
- **Check (stubbed gate and docker, in scratch):** a job exit of 0, 3, 137 or 76 now gives run.sh exit 0, 3, 137 or 1. The 1 comes from "76 twice", as designed. The old script always exited 0.
- **a6-chain shell 509956:** it kept polling after the rename and re-declared at 09:19:25. It had already parsed the old branch, so it would still have exited 0, but nothing chains on it. Coordinator 8 has since replaced it with 544784.

### Repair 3: U1's tables are gzip again
- **Tables:** `CR/improve/U1/table/tune.csv.gz` and `heldout.csv.gz` were gzipped in place after confirming no fill was running. Each round trip was byte-identical before the swap, and the file times were kept. All three tables now start `1f 8b` and pass `gzip -t`.
- **Fill scripts:** `U2/fill_table.py` and `U3/fill_table.py` now write with `compression='gzip'`, assert the gzip magic bytes, and read back with `compression='gzip'`.
- **Checks:**
  - The new write lines, taken from the files, produce gzip that reads back by name.
  - Each reader's form of `read_csv` opens all three tables. That covers `ltr.py` and `check_table.py` (dtype), the two fills, and `test_u1.py` (usecols). Shapes: train 281,529×26, tune 54,499×26, heldout 101,969×26. Only shapes were printed; no held-out values.

### Repair 4: A6's rotary tables
- **File:** `U3/embedlib.py` now builds the tables for min(max_position_embeddings, max(8192, U3_MAXTOK) + 1) = 8,193 positions. The +1 covers the flash path's max position + 1. The length bound was checked first: `encode_ids` cuts to `max_len`, which is 8,192 for queries and 512 for chunks; the sdpa path asks for `kv_seq_len`.
- **Check (CPU, the remote rotary class):** cos, sin and inv_freq are bitwise equal for positions 0-8,192, and the forward at 8,192 in bf16 is equal. The 28 layers take 224 MiB instead of 3,584 MiB.
- **Learned mark:** `CR/gate/learned/U3_a6-chain` was moved to `learned.removed-2026-11-25/` (UNLEARN line in `gate.log`). The waiter re-declared 8,864 at 09:19:25, before it was admitted. Coordinator 8 has since lowered it to 6,144 (see item 2 at the top).

### Repair 5: U6 chooses the epoch per repository
- **Files:**
  - `U6/select_cfg.py`: the key is now (kind, stream, nbr, lr). Each repository takes its best tuning epoch, with ties going to the earlier one. The pooled score is taken at those epochs, and `epochs` is written as {repo: epoch}.
  - `U6/final.py:56` reads `ch['epochs'][a.repo]`. Nothing else reads U6's `choice.json`.
- **Check (current sweep files, output to scratch, live `choice.json` not written):**
  - DyGFormer: pair n32 lr 1e-4, epochs clinic 40, FixFlow 40, zulip 8, pooled 0.1076. This matches the reviewer's figures.
  - TGN: bip n20 lr 3e-4, epochs clinic 2, FixFlow 20, zulip 8, pooled 0.0393.
  - The 15 table rows span epochs 1-100.
- finish.sh (240420) has not reached the selection yet.

### Repair 6: U3's guard ends the whole process group
- **File:** `U3/guard.sh` starts the command under `setsid`. On a stall it kills the whole session (`kill -- -pid` and `pkill -s`) and waits up to 60 s until no process of it is left.
- **Check (container, stall limit 20 s, a bash wrapper over a sleeping Python):** the old guard left 1 Python alive; the new one leaves 0. A normal exit 7 still passes through.

### Repair 7: merge and fill read-backs
- **Files:** `U6/merge.py:50` and `U5/fill_tables.py:44` now read back with `compression='gzip'`. Nothing else in `fill_tables.py` changed.
- **Check (copy of a real U4 tuning table, clinic tune 0.csv.gz, 12,270 rows × 39 columns):** both old versions fail with `UnicodeDecodeError` (byte 0x8b). Both new versions write, read back, keep every other column identical, and write the new column right.

### U2's card hours on the rebuilt pairs: about 21 h, range 21-49 h

| Part | All defaults stay | 2 epochs wins | Every alternative wins |
|---|---|---|---|
| Zulip filters (SweRank about 0.65 h, Qwen3 about 0.8 h) | 1.5 h | 1.5 h | 1.5 h |
| SweRank sweep (7 runs in 5 stage jobs) | 3.9 h | 5.6 h | 8.6 h |
| Qwen3 sweep | 15.8 h | 26.2 h | 38.5 h |
| Finals (scoring only, rough) | 0.3 h | 0.3 h | 0.3 h |
| **Total** | **about 21 h** | **about 34 h** | **about 49 h** |

"Every alternative wins" means 2 epochs, 7 negatives and filter off all beat the current choice. Queue waits come on top; U2 cannot share the card with U6's large jobs.

Basis:
- **SweRank, measured:** 0.37 s per step (batch 8, 3 negatives; 474 steps in 175 s, 03:19-03:33 UTC). Scoring a run is about 120 s. Job start plus the start-model baseline is about 130 s per stage job.
- **From 8-step speed tests (less sure):** SweRank with 7 negatives 0.81 s per step. Qwen3 with 7 negatives 3.58 s per step; I took 1.8 s for Qwen3 with 3 negatives. Qwen3 scoring is taken as about 1.3× SweRank.
- **Filter rates:** 113 chunks/s (SweRank) and 86 chunks/s (Qwen3), from `filter.log`.
- **Examples:** about 27,500 (SweRank) and 24,300 (Qwen3) after the filter, assuming it keeps the same share of zulip pairs as at 2,500 commits (56 % and 50 %); 48,814 unfiltered. Before: 3,787.
- **Biggest unknown:** Qwen3's step time. Its first lr run prints the time every 50 steps; recompute from that.

Free disk on C: was 32 GB at 09:49 UTC; it dipped to 19 GB at about 09:30. U2's checkpoints will add about 4-8 GB.
