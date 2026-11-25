# U6 (second builder, helper of 4f04d618): its reply at the owner's pause, 2026-11-24 about 17:19 UTC, saved unchanged

Paused. I started nothing and changed nothing after your message. The sweep is early: 4 clinic configurations are finished, and no selection, final scoring, merge or report has been run. Card hours so far are about 0.5 h.

**Built this session (all tests pass, CPU, network off)**
- The commit-node bipartite stream (item a) is built: `BipStream` in `code/U6/stream.py`, with a `--stream pair|bip` switch in `sweep.py`, `core.py` and `final.py`. File nodes are linked to commit nodes, a commit node's feature is the mean of its files' vectors, and the units trained on are the same co-change pairs as the pair stream.
- Tests added in `test_u6.py`: the bipartite stream basics, the no-leak test on both streams (scores bit-identical after replacing every commit from a cutoff on, DyGFormer and TGN), and a mid-epoch resume test on the bipartite TGN (it matches a straight run).
- `merge.py` is rewritten text-level: only the B5 field changes, NaN is written as an empty string, every other column is checked equal, and it uses the `.u6merge.lock` directory.
- `select_cfg.py` now reports both streams per model and chooses the stream together with the settings.
- `run_sweep.sh` is the driver: one card job per configuration. It skips a configuration whose last evaluation is on disk and stops on exit code 75.
- Two edits made after the first failures: `atomic_save` retries on a write error, and a finished sweep job deletes its resume checkpoint and keeps the two best epochs' model states. The prune exists because TGN states took about 1.2 GB per configuration. If a pruned state is later chosen, `final.py` has to retrain it. That fallback is not coded yet.
- `diag_tgn.py` is a CPU diagnostic. It showed the TGN positives score above the average, so the TGN scoring path works.

**Finished sweep files** (under `CR/improve/U6/sweep/<variant>/clinic/<cfg>/e<epoch>.json`)
- Complete to epoch 100: `dygformer`, `tgn`, `bip-dygformer` and `bip-tgn` at n20, lr 1e-4.
- Partial: `bip-dygformer` n20, lr 3e-4 has epochs 2 to 70, and its epoch-100 file is missing. `tgn` n20, lr 3e-4 has epochs 2 and 5 only.
- Clinic only so far: nothing yet for FixFlow or zulip.
- Tuning P@10 on the clinic, DyGFormer pair stream, n20, lr 1e-4: 0.103 at epoch 20, then 0.099, 0.090 and 0.077 at epochs 40, 70 and 100. The best untrained arm on the clinic is 0.117. TGN, pair stream: 0.003 to 0.013 across epochs. I did not read the bipartite results.

**Failed and stopped**
- At about 17:11 UTC two jobs failed on a checkpoint write error. These were `dygformer` clinic n20 lr 3e-4 (it left only a partial `ckpt.pt.tmp`) and the adopted job `dygformer` clinic n32 lr 1e-3 (it left some files and was the first sweep job). The disk was at 96 % full (44 GB free) with other units writing.
- The driver then started `tgn` clinic n20 lr 3e-4 (the job you are stopping). It last saved `runs/tgn/clinic/n20_lr0.0003/ckpt.pt` plus `state_e2.pt` and `state_e5.pt`. A leftover `ckpt.pt.tmp` sits beside them.
- The driver also logged exit 1 for that tgn job at 17:14:06, so it may already have died.
- Those two write failures need a rerun.

**Still queued, and what they do on wake-up**
- The clinic then FixFlow driver (`run_sweep.sh clinic ...; run_sweep.sh fixflow ...`) and the zulip driver (`run_sweep.sh zulip 1,2,3,4,6,8`) are still alive and polling for `GPU.lock`.
- If you want true quiet, kill those bash processes and the old adopted job (pid 8685). I left them as they are, as you instructed.

**To resume** (from `research-tree/build/improve/code/U6`)
1. Release the lock you hold. The drivers will then continue by themselves.
2. If the drivers are dead, restart them. Each one skips configurations that are finished, and a half-finished one resumes from its checkpoint. A configuration that was never given its last epoch will rerun from its checkpoint.
   - `nohup bash -c 'bash run_sweep.sh clinic 2,5,10,20,40,70,100; bash run_sweep.sh fixflow 2,5,10,20,40,70,100' > <CR>/improve/U6/logs/driver-small.out 2>&1 &`
   - `nohup bash run_sweep.sh zulip 1,2,3,4,6,8 > <CR>/improve/U6/logs/driver-zulip.out 2>&1 &`
3. The driver does not rerun a configuration that exited with code 1. After the passes, run the same commands once more to fill the gaps: the 17:11 failures, `bip-dygformer` clinic n20 lr 3e-4, and every other configuration without its last epoch file.
4. Then run `select_cfg.py`, `final.py` for `tuneheld` and `f0` to `f3`, and `merge.py`, as in the plan. All go through `run_cpu.sh` or `run_gpu.sh`.
5. Run `merge.py` only when no U5 `fill_tables.py` is running.
6. If a job exits with code 75, rerun it unchanged after 17:40 UTC.

What was not run: the sweep on FixFlow and zulip, `select_cfg.py`, `final.py`, `merge.py`, the held-out ranking files, the frozen choice, and the report. No tables have been touched.
