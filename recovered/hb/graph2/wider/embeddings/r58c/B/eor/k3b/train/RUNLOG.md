# Embedding lane run log (protocol addendum 8; rulings 32-35)

Written 2026-11-14 before stage A was launched and before stage B exists. stageA_configs.json sha256
635f1dcd...482d5b, equal to RULES-FROZEN.txt (checked before launch). No task truth and no held-out
truth was read; nothing under build/sealed was read or mounted (mounts: build/arms/common, build/facts,
build/tasks, read-only, for the minConf-0 export only).

## Data

- Ruling 34 export: `export/graphs0/<sha>/` for all 123 task parents (src/export0.js; same loader and
  triple rule as export.js, minConf 0). Tune parents (53): median 1,627 entities, 4,374 triples
  (minConf 0.5: 4,303), median co_changed triples 374 (0.5: 338); largest tune parent 7b3a7452 (2,450
  entities, 7,585 triples). Held-out parents (70): median 3,997 entities, 12,296 triples.
- Stage-A checkpoint: cd806c80 = parent of df61262a, the latest inner15 commit by author time. 1,293
  entities (1,292 in triples), 3,387 triples, 30 relations (+30 reciprocal), 162 co_changed pairs;
  16 pairs (10 %, seed 20261114) held out, both directions removed: 3,355 training triples, 32 queries.

## Correctness checks (train/checks.json, check.py; config c01, seed 1, short runs)

| arm | predict_target vs score(): full order identical / top-10 identical / max abs diff | true-tail median rank, higher=better vs reversed | loss first -> last |
|---|---|---|---|
| E1 | 20/20, 20/20, 0.0 | 5 vs 1288 | 11.12 -> 0.36 |
| E2 | 19/20, 20/20, 3.8e-6 | 4 vs 1289 | 6.92 -> 1.33 |
| E3 | 20/20, 20/20, 0.0 | 5 vs 1288 | 11.21 -> 0.43 |
| E4 (60 ep) | 17/20, 20/20, 5.7e-6 | 5 vs 1288 | 0.974 -> 0.009 |
| E5 specialists | 5/5 each, diff 0.0 | e.g. backend 10 vs 710 | 11.34 -> 5.80 (20 ep) |

The non-identical full orders are float near-ties (diff <= 6e-6). Two defects were found and fixed
before this table: PyKEEN 1.11.1's RotatEInteraction ignores p and always uses the L2 norm (fixed by
RotatEL1Interaction, the paper's sum of moduli); with PyKEEN inverse triples (E4) the factory relation id
is not the representation row (fixed by rel_index, as predict_target maps it).
score() functional test (scoretest.json, P = cd806c80 scored by a model at its latest ancestor parent):
all arms finite; fold-in used for 10 of 835 candidates (E1-E4), E5 126 unscored of 835.

## Reference points on the stage-A held-out pairs (stageA/refs.json; item 22)

PPR filtered MRR 0.282 (all entities = file/doc entities, since PPR scores files only); CO 0.002 (all) /
0.010 (file/doc): CO cannot score a removed pair, so this is its floor by construction.

## Timing (train/timing.json; slowest config of each arm; measured with a second lane container running)

| arm (config) | stage-A graph s/epoch | largest tune parent s/epoch | peak RSS MB (A / largest) | max epochs |
|---|---|---|---|---|
| E1 RotatE d512 | 14.6 | 36.7 | 1091 / 1113 | 400 |
| E2 ComplEx-N3 d512 | 0.59 | 2.53 | 504 / 592 | 200 |
| E3 TransE d512 L2 | 7.2 | 15.1 | 1113 / 1113 | 400 |
| E4 CompGCN 2 layers d200, batch 256 | 3.77 | 12.96 | 1042 / 1608 | 150 |
| E5 routed RotatE d512 (4 specialists) | 17.7 | 33.9 | 1132 / 1043 | 400 |

d256 runs measured in the checks: E1 8.0, E3 3.5, E5 7.3 s/epoch on the stage-A graph.
E4 decision (from timing only): CompGCN as configured, batch 256 (worst stage-A run 150 x 3.8 s, about
10 min plus evaluations, RSS about 1.0 GB, inside 60 min / 4 GB). No batch change, no R-GCN fallback.

## Stride s (item 16, ruling 33; train/stride.json, proj.py)

Projection: 9 runs (3 configs x 3 seeds) per arm per tune checkpoint, all at the slowest config's
s/epoch (linear in triples between the two measured graphs), 5 arms, 2 containers.

| s | tune checkpoints (ruling-33 added) | held-out checkpoints (added) | worst (max epochs) wall h | at 100 epochs (E4 50) wall h |
|---|---|---|---|---|
| 1 | 53 (0) | 70 (0) | 1,464 | 375 |
| 3 | 18 (0) | 34 (10) | 490 | 126 |
| 6 | 9 (0) | 25 (13) | 234 | 60 |
| 10 | 6 (0) | 21 (14) | 159 | 41 |

**No s in {1, 3, 6, 10} gives a projected stage B under 30 h**, even at s = 10 with an assumed 100
epochs per run. s is therefore NOT fixed here: the rule cannot be met as written and the lane lead must
rule (options: s = 10 with a longer budget; recompute after stage A with the selected configs' own
dimensions and their stage-A epoch counts, which are run lengths, not task scores; or fewer epochs per
stage-B run). proj.py takes per-arm epoch counts on the command line for that recompute. Stage B must
not start before this section holds a ruled s.

Note: the stage-A checkpoint cd806c80 is listed in no later parent's commits.jsonl (it is in no
ancestors.txt), so under the leak rule it can serve no stage-B task; stage A is unaffected.

## Stage A launch

- kge-A1: arms E2, E4, E5 (in that order); kge-A2: arms E3, E1. Cap 2 GB each (4 GB total; free RAM
  7.6 GB at launch; measured peak RSS <= 1.13 GB per unit). `--network none --cpus 6`, inputs read-only
  except train/ and export/graphs0/.
- Worst case (every run to max epochs): A1 about 24 h, A2 about 30 h; with early stopping (at least 40
  epochs, eval every 10, patience 3) expected well under that, roughly 10-15 h.
- Progress: train/progress.jsonl (step stageA, unit arm/config); results: train/stageA/results.tsv,
  train/stageA/top3.json, per-unit logs train/stageA/logs/. Resume: rerun the same two docker commands
  (finished units are skipped).

## Stage B tooling (built 2026-11-14 while stage A runs; not launched)

stageB.py (plan, units, assemble), selectB.py (item 20 nested choice + PLACEBO; not named select.py,
which would shadow the stdlib module for every script in train/), report.py (sections F, G),
launchB.sh. Plumbing tested on <= 3 tasks (stageB/test, stageB/test2; no embedding metric computed).
Found in the test: the first tune parent 2fa68134 has no co_changed fact, so a model trained there cannot
score (h, co_changed, ?); its assigned tasks are written as unscored (alone = random, fused = RRF).

## Restart by the coordinator after the PC reset (2026-11-14, boot 07:02 local)

Written by the coordinating session (not the lane), before relaunching. State found on disk: stage A
64 of 80 units done (E2, E3, E4 complete; E1 c01-c06; E5 c01-c10); the last unit finished 01:57Z; the
two containers were gone after the reset (they run with --rm); no .part folder left; no stage-B unit and
no task-level embedding score exists. Docker was started again by another session.

- Relaunch: one container, not two, because host free RAM was 3.6 GB with the ship lanes restarting:
  `kge-A1`, the lane's pattern (drun.sh: network none, 6 cpus, 2 GB cap, same mounts) plus
  `--cpu-shares 128` (scheduling weight only, so gate containers win when the VM's CPUs are contended),
  command `python stageA.py E1 E5`. Units, configurations, seeds and code are unchanged; only which
  container runs which arm differs from launchA.sh.
- Memory guard `orchestrator/guard-stageA.sh` (log beside it): launches at >= 4.5 GB host free RAM
  (3 samples), stops the container under 2.0 GB (3 samples; the unit in flight is redone), relaunches
  when memory is back, exits when no E1/E5 unit is left.
- The `stride` line in the lane's progress file says "blocked"; rulings 36 and 37 (addendum 8, written
  after it) settle it: fixed epochs from stage A, projection redone after stage A, s = 10 if none fits.
- Stage B is not started by the guard.

## Owner decision: stage B and the held-out run may train on the graphics card (recorded 2026-11-14T08:35:34Z by the coordinator)

- The owner approved it in chat on 2026-11-14 ("Yes, use the GPU") after being told: a CUDA build of
  PyTorch, about 3 GB, into a test image only, exact files listed before anything is fetched.
- Listed from index metadata only (nothing fetched): torch 2.15.0+cu132, cp311, manylinux_2_28_x86_64,
  539,138,667 bytes, sha256 eae9eece6dafe688bbc7afd689781b77778038c9043baae21c084261abe4f5ad, from
  https://download.pytorch.org/whl/cu132 ; plus the NVIDIA runtime wheels and triton its metadata pins,
  from PyPI. 20 files, 2,989,703,593 bytes by the coordinator's own resolver. The binding list is the
  lane's image-gpu/wheels.tsv, written before the download.
- Host: driver 617.14 (CUDA user-mode 13.4), RTX 5070 with 12 GB; --gpus all already works in
  graphtest-kge:1 (nvidia-smi sees the card), nothing installed on the host.
- Stage A stays on CPU (76 of 80 units done at 08:32Z; E5 c13-c16 left). No stage-A unit moves to the card.
- Stage B does not start before the coordinator's independent check of the GPU image, the device change
  and the drafted rulings (section L of addendum 8).

## Stage B on the graphics card: device change, checks, timing, launcher (gpu lane, 2026-11-14 09:55-10:27Z)

Image graphtest-kge-gpu:1 (torch 2.15.0+cu132, RTX 5070), `--gpus all --network none --cpus 6`, one container at a
time (kge-G1), every start after `orchestrator/memgate.sh wait`; train/ was mounted read-only for all card runs.
Evidence: gpu/ (progress.jsonl, session.log, logs/, the json files named below). Originals: gpu/*_orig.py.

### Device change (task 3)

One env var, `KGE_DEVICE` (default `cpu`). kge.py (684 -> 707 lines): DEVICE from KGE_DEVICE; on cuda only,
`torch.backends.cuda.matmul.allow_tf32 = False` and `torch.backends.cudnn.allow_tf32 = False` (the image's cudnn
default was True); `make_model` builds and initialises on the CPU as before (body moved to `_make_model`) and
returns `m.to(DEVICE)`; SLCWA moves each sub-batch (`ids[j]`, `w[j]`, `Wsum`) to DEVICE; the negative tails are
drawn by the same CPU generator, then `.to(pos.device)`; OneVsAllN3 moves each batch; `final_reps` returns CPU
tensors, so every evaluation, ranking tie, reps.pt and score() stay on the CPU unchanged; `cuda_peak()` adds
peak_cuda_alloc_mb / peak_cuda_reserved_mb to meta on cuda only; `train()` resets the card's peak counter on cuda.
No AMP, no TF32, no torch.compile; models, configs, dims, batch sizes, negatives, optimisers, float32 unchanged.
On the CPU every added `.to(DEVICE)` / `.cpu()` returns the same tensor.
Other files: check.py (output path override KGE_CHECK_OUT), scoretest.py (KGE_SCORETEST_OUT / _DIR), proj.py
(`--gpu <timing dir> --lanes x`; `project_selected(..., lanes=2)` keeps the CPU key `wall_hours_2_containers`),
stageB.py (below), new stageB_test3.py.

Proof the CPU path is unchanged (gpu/equiv/: original kge.py vs edited, both KGE_DEVICE=cpu, c01, seed 1, 2
epochs): E1, E2, E3, E5 bit-identical (losses and sha256 of the final representations). E4 differed in the 2nd
epoch loss at 1e-8, but the ORIGINAL code also differs from itself run to run at 6 threads (orig vs orig2), and
at one thread original, edited and a repeat are bit-identical: CompGCN's multithreaded CPU scatter, not the edit.

> SUPERSEDED (release gate device-04, marked 2026-11-14): the three lines below, from "Known and not changed",
> describe the code before variant B. Since task B ("E4 on the card (task B)" below) E4's size probe and final
> reset run on the CPU and the model then moves to the card, so its initial weights no longer come from the CUDA
> generator; the CPU and card initial weights are bit-identical (c12 in task B; c13 and c16 in "Release gate
> round" below). The last clause (CompGCN's dropout draws on the card) still holds.

Known and not changed: PyKEEN's LCWA loop re-initialises the weights on the model's device, so E4 on the card draws
its initial weights from the CUDA generator (same seed), while E1/E2/E3/E5 initialise on the CPU as before;
CompGCN's dropout also draws on the card.

### Correctness on the card (task 4)

(a) check.py with KGE_DEVICE=cuda (gpu/checks-cuda.json): pass. predict_target vs score(): top-10 identical 20/20
per arm (E5 5/5 per specialist), max |diff| <= 1.05e-5, direction 4-5 vs 1288-1289 (E5 specialists 8-18 vs
143-710), loss falls. Short-run val MRR identical to the CPU checks for E1, E2, E3, E5 (0.3530, 0.7044, 0.4857,
0.0574); E4 0.258 vs 0.226. scoretest.py on cuda (gpu/scoretest-cuda.json): all finite, counts identical to CPU.
(b) gpu/scorediff.json: the stage-A best model of each arm (stageA/<arm>/<top1>/reps.pt), 20 queries x all
entities, score_with on the CPU vs on the card: max |diff| E1 1.9e-6, E2 3.8e-6, E3 1.6e-5, E4 0, E5 1.9e-6
(all within 1e-4); top-10 identical 20/20 each.
(c) stage-A best config retrained on the card, stage A's seed and split (gpu/sanity/; a sanity check only, never
a selection input):

| arm | config | CPU val MRR | GPU val MRR | CPU best epoch | GPU best epoch | GPU wall s |
|---|---|---|---|---|---|---|
| E1 | c04 | 0.7301 | 0.7296 | 70 | 70 | 20.5 |
| E2 | c11 | 0.7518 | 0.7518 | 10 | 10 | 3.7 |
| E3 | c11 | 0.7414 | 0.7227 | 40 | 40 | 13.0 |
| E4 | c12 | 0.7294 | 0.2087 (SUPERSEDED, see the note under this table) | 95 | 15 (stopped at 30) | 14.4 |
| E5 | c03 | 0.4017 | 0.4010 | 70 | 70 | 21.6 |

> SUPERSEDED (release gate device-04, marked 2026-11-14): the E4 row above, check.py's E4 figure in (a) and the
> E4 paragraphs below ran at 10:01-10:27Z on the code before variant B (initial weights from the CUDA generator).
> The variant-B card runs are in "E4 on the card (task B)"; the score and top-10 agreement in (a) and (b) do not
> depend on the initial weights and still hold.

E4: the card's curve follows the CPU curve to epoch 30 (0.097/0.100/0.209/0.152/0.193/0.199 vs CPU
0.088/0.084/0.186/0.121/0.178/0.214), but its epoch-15 bump made the next three evaluations count as no gain, so the
patience rule stopped it at 30; on the CPU epoch 30 happened to be a new best. Diagnostic with the patience rule
off (gpu/curve-E4-c12.json, same seed, 110 epochs): peak 0.555 at epoch 90 (CPU 0.729 at 95); the card run is
reproducible (its first 30 epochs repeat exactly). E4's stage-A curves are noisy on the CPU too. Reported, not
chased. Stage B trains fixed epochs (ruling 36), so the patience rule does not act there.

### Timing on the card (task 5; gpu/timing/; largest tune parent 7b3a7452, 7,585 triples; ruling-36 epochs)

| arm | config | dim | epochs | s/epoch card | s/epoch CPU (timing.json, slowest config) | wall per run s | peak RSS MB | peak card MB (torch reserved) |
|---|---|---|---|---|---|---|---|---|
| E1 | c04 | 256 | 70 | 0.387 | - | 28.9 | 1394 | 250 |
| E1 | c15 | 512 | 70 | 0.619 | 36.7 (d512) | 44.7 | 1394 | 604 |
| E1 | c12 | 512 | 70 | 0.623 | 36.7 (d512) | 45.2 | 1395 | 604 |
| E2 | c11 | 512 | 20 | 0.150 | 2.53 (d512) | 4.3 | 1442 | 116 |
| E2 | c07 | 128 | 20 | 0.134 | - | 4.0 | 1442 | 88 |
| E2 | c10 | 512 | 20 | 0.145 | 2.53 (d512) | 4.2 | 1443 | 116 |
| E3 | c11 | 512 | 40 | 0.344 | 15.1 (d512, L2; c11 is L1) | 15.1 | 1442 | 216 |
| E3 | c03 | 256 | 60 | 0.264 | - | 17.2 | 1443 | 120 |
| E3 | c13 | 512 | 130 | 0.344 | 15.1 (d512, L2) | 46.0 | 1442 | 216 |
| E4 | c12 | 100 | 95 | 0.697 | - | 68.0 | 1971 | 618 |
| E4 | c13 | 200 | 50 | 0.814 | 12.96 (same config) | 42.4 | 1960 | 1224 |
| E4 | c16 | 200 | 60 | 0.791 | - | 49.2 | 1974 | 1160 |
| E5 | c03 | 256 | 70 | 0.424 | - | 31.1 | 1395 | 318 |
| E5 | c11 | 512 | 40 | 0.676 | 33.9 (d512) | 28.3 | 1392 | 606 |
| E5 | c09 | 512 | 160 | 0.680 | 33.9 (d512) | 110.4 | 1394 | 606 |

The card is 16-60x the CPU per epoch. Host nvidia-smi (gpu/gpu-load.tsv, 30 s): max 58 C, 134.3 W, 75 % util;
card memory used up to 3,040 MiB with one process (desktop baseline 1,485 MiB), 4,326 MiB with three.
Memory cap: 2g is the lowest cap that ran every arm (gpu/timing/*-cap2g.json, the stage-B test and the curve
diagnostic all passed at 2g), but E4's process RSS is 1.9-2.0 GB and at 2g epochs ran 6-19 % slower (page-cache
pressure); the launcher uses 2560m (the dry plan test ran at 2560m).
Parallel processes in one container (gpu/parallel.json, 20 epochs, largest tune parent): E1 c04 x2 = 1.30x the
throughput of one, x3 = 1.39x (container at the 4 GB cap); E4 c12 x2 = 1.66x but the container hit 4 GB, x3 one
process OOM-killed at 4 GB; 2 threads per process did not help (x3 1.37x). Two processes would need about 4-4.5 GB
for E4, and one process already gives s = 1: stage B runs ONE process.

Ruling 37 with the card's timing (gpu/stride-gpu-lanes1.json; proj.py --gpu, one process):

| s | tune checkpoints (r33 added) | projected wall h |
|---|---|---|
| 1 | 53 (0) | 14.4 |
| 3 | 18 (0) | 4.8 |
| 6 | 9 (0) | 2.3 |
| 10 | 6 (0) | 1.6 |

s = 1 (the smallest under 30 h). The projection counts training epochs only; per-unit overhead (graph load,
factory, scoring the assigned tasks; about 1-2 s per unit in the test) adds about 1 h over 2,385 units. Lag 0 for
all 388 tasks. This is the plan stageB.py will write (dry run gpu/plantest/: s = 1, 53 checkpoints, 2,385 units);
its timing input is stageB/timing_selected_cuda.json, filled from gpu/timing/ (a CPU plan still reads
stageB/timing_selected.json).

### Stage-B launcher and disk (task 7)

orchestrator/guard-stageB.sh (prepared, not run): one container kge-B1, `--gpus all --network none --cpus 6
-m 2560m`, KGE_DEVICE=cuda, STAGEB_LANES=1, STAGEB_MIN_FREE_GB=20, `python stageB.py run --plan E5 E2 E4 E1 E3`.
Start = memgate wait + no other kge-* container + C: >= 20 GB free + stage-B folder under 4 GB; stop after three
consecutive `memgate.sh low` samples 20 s apart; relaunch when memory is back; C: checked every 20 s while running
(under 20 GB: stop, log, exit 4), stage-B folder size every 5 min (over 4 GB: stop, exit 5); stageB.py also stops
before a unit when it sees under 20 GB (the container sees C:'s free space). Exit 0 when no unit is left, 2 after
three launches without a finished unit. Logs the host nvidia-smi line to gpu/gpu-load.tsv while live.
stageB.py changes: after a unit's parts are written they are read back (both score tables equal to the scored
values, an exact repr round trip; counts.json equal), and only then are reps.pt and the .model folder deleted; a
failure removes the half-written unit so it is redone; the progress line carries reps_deleted and card peaks.
Plumbing test (stageB_test3.py on the card, <= 3 tasks, gpu/stageB-test3/): 2 units, the trained one logged
reps_deleted, no reps.pt/.model/.part left, the rerun skipped both, assemble wrote the tables; 17,874 bytes.
Disk arithmetic (per task from that test: pool 1.1 KB + unrestricted 2.6 KB + counts 0.34 KB = about 3.8 KB per
(arm, config, seed); parts and assembled tables keep it twice): 388 tasks x 3.8 KB x 2 x 45 (5 arms x 3 configs
x 3 seeds) = 133 MB; meta.json 2,385 units x <= 3 KB = 7 MB; NTFS 4 KB clusters on about 9,500 small files
<= 38 MB; one transient reps.pt (<= 10 MB). Stage B about 0.18 GB. Held-out (its task list not read; assumed 15
(arm, seed) sets on 70 parents with up to 3x the tune rows): about 0.35 GB at most. Total about 0.5 GB of the 5 GB
limit; the guard's stage-B ceiling is 4 GB. C: had 31-32 GB free throughout.

## Pre-run fixes (rulings 49-59)

Done 2026-11-14 by the fixes agent (10:35-11:16Z), cut by the PC stop, finished by a resume agent (13:30-13:37Z).
Evidence: fixes/ (progress.jsonl, session.log, logs/, tests/, e4/, dryplan/). Code before the fixes: fixes/pre_m/
(stageB, kge, selectB, report, proj, checkpoints); code as found at resume, before the rename hardening: fixes/pre_m2/.
Every test ran in a container (kge-F1: `--network none --cpus 6 -m 2560m`, train/, export/, eval/ read-only, memgate
before each start); "before" = the pre_m files bind-mounted over their paths (tests-pre 10:46Z, tests-pre2 13:31Z),
"after" = the current files (tests-post2 13:33Z; tests-post 10:49Z passed the first four on the earlier code).
No stage-B unit ran; nothing under sealed/ or any held-out truth was read (held-out parent shas only).
Line numbers are those of the current files.

| ruling | change (file:lines) | test | before | after |
|---|---|---|---|---|
| 48 | none (s = 1 from the card timing; the dry plan below says s = 1) | - | - | - |
| 49 | export/checkpoints.py:80-96 (rule text), 98-145 (Facts: git ancestry from parents_git.jsonl, ancestors.txt subset, `valid`, `why_invalid`, `latest`), 148-161 (checkpoints_m), 164-188 (assignment_m, check_assignment); export/git_parents.js + parents_git.jsonl (new data, host-side); train/stageB.py:144-152 (both splits planned and asserted, task commit not in C's history); train/proj.py:52-59 | fixes/tests/test_r49_50_detail.py | `r49-eligible split=tune pairs=2756 ruling-49-valid=1377 code-accepts=576 missed(valid but refused)=801 wrong(accepted but invalid)=0 VIOLATED`; `r49-guard absent ... VIOLATED` | `r49-eligible split=tune ... code-accepts=1377 missed(valid but refused)=0 wrong(accepted but invalid)=0 ok` (held-out: 2382/2382 ok); `r49-guard pair 8b506c0d<-2fa68134 valid before True, with a dropped commit in C history valid False, check_assignment refused True ok` |
| 50 | export/checkpoints.py:111-113 (`key` = author time, committer time, sha), 125-126, 139-141, 183-184 | test_r49_50_detail.py; test_r49_52.py | `r50-order split=tune parents=53 positions differing ... =2 stride-3 sets differ=True VIOLATED`; `pre-M split=tune s=10 ... violations(parents)={'r51': 18, 'r52': 43, 'r50': 29} ... VIOLATED` | `r50-order split=tune ... =0 stride-3 sets differ=False ok`; `M split=tune s=10 checkpoints=7 ... violations(parents)={} ... ok` |
| 51 | export/checkpoints.py:153-161 (r51 additions), 171 (parents without co_changed), 185 (assert); train/stageB.py:154, 176 (count in the plan and RUNLOG) | test_r49_52.py | `pre-M split=tune s=10 checkpoints=6 parents=53 parents_on_zero_co_checkpoint=19 ... 'r51': 18 ...` | `M split=tune s=10 checkpoints=7 parents=53 parents_on_zero_co_checkpoint=1 violations(parents)={} ... ok` (the 1 is 2fa68134 itself, whose own graph has none) |
| 52 | export/checkpoints.py:143-145 (lag over git ancestry within the split), 169, 186-187; train/stageB.py:153-157 (lag per task and per parent, held-out too) | test_r49_52.py | `'r52': 43` parents (313 tune tasks) at s = 10, 44 held-out parents | `violations(parents)={}` in all four (split, s) rows; s = 1: C = P, lag 0 everywhere |
| 53 | train/selectB.py:84-86 (`size` = dim, layers), 89-110 (`_stats`, `choose`: band = best mean - SE(best); smallest model, higher mean, lower id, smaller w; `choose_builder` kept), 155, 172-178 (final_all65 with mean and SE, builder row); train/report.py:42-47, 60, 89 (builder rows numbers only) | fixes/tests/test_select_report.py; fixes/tests/test_r53_58_unit.py | `r53 chosen ('c01', 0.25) (want c01, 1.0 ...) ok False \| builder sensitivity row False`; `r53-size chosen ('c01', 0.25) want (c01, 1.0) VIOLATED` | `r53 chosen ('c01', 1.0) ... ok True \| builder sensitivity row True`; `r53-size chosen ('c01', 1.0) ... ok`, `r53-se ... ok`, `r53-w ... ok` (these two also held before: coverage only) |
| 54 | train/selectB.py:43, 67-69 (three salted pseudo-configurations), 126-129, 156-157 (fixed-w variants), 197-201; train/report.py:44, 112-114 | test_select_report.py | `r54 candidates per block [3, 3, 3, 3, 3] pseudo-configs ['rand'] fixed-w rows [] ok False False` | `r54 candidates per block [9, 9, 9, 9, 9] pseudo-configs ['p1', 'p2', 'p3'] fixed-w rows ['0.25', '0.5', '1'] ok True True` |
| 55 | train/kge.py:684-735 (E5 branch of score: `at_C`, `vec_A`, two-case counts per candidate) | fixes/tests/test_r55.py | `violations ... {'cand_folded_for_specialist_pool': 6, 'cand_folded_for_specialist_unrestricted': 291} two-case count keys MISSING` | `violations ... {} two-case count keys ok`; `RESULT PASS test_r55 violations 0 keys True` |
| 56 | train/selectB.py:18-19, 117-118, 179 (late50 only), 200 (pilot-only commits listed); train/report.py:5-6, 52, 59, 86-89 (shared row, no verdict word) | test_select_report.py | `r56 pilot-only commits 4 assembled outside late50 4 ok False`; `... verdict words on the pilot row 4 verdict sets ['late50', 'late50_pilot'] ok False` | `r56 pilot-only commits 4 assembled outside late50 0 ok True`; `r56 report sets {'late50': 50, 'late50_pilot_shared': 46} ... verdict words on the pilot row 0 verdict sets ['late50'] ok True` |
| 58 guard | train/selectB.py:20-22, 44-64 (`R58_ROLES`, `r58_guard`), 114; train/report.py:16, 25, 49 | test_select_report.py; test_r53_58_unit.py | `r58 selectB exit 1 \| FileNotFoundError ... plan.json \| ok False`; `r58-guard absent: selectB has no r58_guard VIOLATED` | `r58 selectB exit 3 \| ruling 58: refusing ... \| ok True` (report the same); `r58-guard {"good": "pass", "wrong_hash": "exit 3", "missing_file": "exit 3", "role_missing": "exit 3"} ok` |
| 59 | train/stageB.py:19-22, 44-67 (HASHED incl. atomic.py, `plan_hash_inputs`, `plan_hash`, `part_hash`), 112-116 (a new plan refuses non-empty parts/tables; added at resume), 164-165, 236-245 (`check_plan_hash` in run_units), 255-257 (stale part redone), 273, 281 (hash in every part), 298-338 (assemble: refuse another hash; every tune task once, from its planned checkpoint); stageB/test and test2 moved to stageB/_pre_m (10:41Z) | fixes/tests/test_r59.py; fixes/tests/test_r59_start.py | `(a) ... plan_hash None ok False`; `(b) stale hash -> accepted`; `(c) misplaced task -> accepted`; `(f) planned (plan_hash None)` | `(a) s 1 device cuda checkpoints 53 plan_hash 43fa692e... ok True`; `(b) stale hash -> refused: ruling 59 ...`; `(c) misplaced task -> refused`; `(e) run_units on a mismatched plan -> refused: ruling 59`; `(f) refused: ruling 59: .../parts not empty`, `(g) refused`, `(h) planned` |

Readings to confirm (implemented, not deviations): ruling 49's eligibility also requires C not later than P in
ruling 50's order (item 16 "at or before P", the check ruling 60's audit names); it removes 1 tune and 2 held-out
git-ancestor pairs. Selection-stats-06 (a tie in the best mean makes the band depend on candidate order) is not
covered by ruling 53 and is unchanged. Ruling 55's fold-in branch (an entity absent from C) cannot fire at s = 1
(C = P: an entity absent from P's graph has no neighbour there), so the tests show the forbidden case removed and
the two-case counts, not a fold.

### E4 on the card (task B)

E4 c12, stage A's split and seed rule, 95 fixed epochs (patience off), val MRR every 5 epochs (fixes/e4/*.json):

| run | kge.py | seed 1 | seed 2 | seed 3 | mean | init after reset 1 / 2 equal to CPU |
|---|---|---|---|---|---|---|
| CPU (6 threads) | variant A (CPU path = original) | 0.7294 | 0.6569 | 0.5960 | 0.6608 | - |
| card, variant A (e4-gpu) | resets on the CPU, probe batch on the card | 0.6826 | 0.5431 | 0.6532 | 0.6263 | yes / no |
| card, variant B (e4-gpu2) | probe and final reset on the CPU, then to the card | 0.7039 | 0.6478 | 0.6975 | 0.6831 | yes / yes |

Best epoch (val peak): CPU 0.7294 @95, 0.6569 @95, 0.6372 @85; card B 0.7039 @95, 0.6825 @85, 0.7686 @80.
The original card code (before task B) drew E4's initial weights from the CUDA generator. Variant A moved the
resets to the CPU, but its size-probe batch ran on the card, so its dropout no longer advanced the CPU generator
and the second (training) reset drew other weights (seed 1 d37de318 vs CPU 76e00c85). Variant B keeps the model
on the CPU through the probe and the final reset, so the initial training weights are bit-identical to the CPU
path for all three seeds (both hashes equal); training then runs on the card (its own dropout draws, float order).
Card B minus CPU at epoch 95: -0.025, -0.009, +0.101 (mean +0.022). The CPU curves alone move by up to 0.10
between neighbouring evaluations (seed 1 0.628 @90 -> 0.729 @95; seed 3 0.637 @85 -> 0.561 @90), so the
differences are seed and trajectory variance: no card handicap remains. Variant B is kept (train/kge.py:408-423);
wall per 95-epoch run 40-48 s on the card vs 137-143 s on the CPU. e4-gpu2's in-container rename failed
(PermissionError on cuda-s1.json.part -> .json, all three seeds); the three .part files were complete (95 losses,
19 evaluations, both init hashes) and were moved to cuda-s{1,2,3}.json on the host, not retrained.
CPU path of the current kge.py vs the pre-fix fixes/pre_m/kge.py, KGE_DEVICE=cpu, c01, seed 1, 2 epochs
(fixes/e4/equiv2-*.json, 13:36Z): E4 at one thread losses 0.9740989162371709 / 0.8090423483114976 and reps
362213c11dd09e00 / 1fb335afe28b734c in both; E1 (6 threads) losses 11.116498044558934 / 10.20706057548523 and reps
0d04664268bc500a / db1154262e1acd67 in both: bit-identical.

### Rename hardening (task 2)

train/atomic.py (new, 67 lines): `replace_retry` (os.replace up to 5 times on any OSError, pauses 0.25, 0.5, 1,
2 s; on give-up removes the .part and raises RenameFailed), `put_json`, `retry_write` (wraps a writer that does its
own .part + rename, such as evalcore.write_score_table, which is left unchanged). Call sites: train/stageB.py:36,
83 (put_json: plan, timing, assembled counts/meta), 204-206 and 210 (write_parts: the score tables and the unit
folder), 261-296 (run_units: the no-co_changed branch moved inside the try, so a failed write there is logged
failed instead of ending the launch; a RenameFailed is logged failed and the unit redone at the next launch, never
logged done), 335-336 (assembled tables; _meta.json is written last and marks a set complete); train/kge.py:638-639
(the model folder of train()); train/selectB.py:38, 192-195, 202; train/report.py:26, 140; fixes/e4work.py:21-25.
atomic.py is in stageB's HASHED. Not changed: train/stageA.py (stage A is frozen and never runs again) and
eval/evalcore.py (shared with the comparators; wrapped by retry_write instead).
Test fixes/tests/test_rename.py (os.replace monkeypatched to raise PermissionError(13) for a chosen destination):
on the code as found at resume (pre2) `(4) write_parts held 2x: raised PermissionError(13, ...) ... ok False`,
`(6) run_units held 2x: returned [('cd806c80', 'failed')] tables False ok False`, `(8) run_units no-co_changed
checkpoint held always: escaped PermissionError(13, ...)`, `RESULT FAIL test_rename pre2`; on the current code
`(4) write_parts held 2x: written complete True leftovers [] ok True`, `(5) write_parts held always: raised
RenameFailed attempts 5 unit dir False leftovers [] ok True`, `(6) run_units held 2x: returned [('cd806c80',
'done')] tables True ok True`, `(7) run_units held always: returned [('cd806c80', 'failed')] left under parts [] |
next launch: ... ('cd806c80', 'done')] ok True`, `(8) ... [('2fa68134', 'failed')] left under parts [] | next
launch: ... ('2fa68134', 'done')] ok True`, `RESULT PASS test_rename post`.

### Dry plan and hashes (13:34Z, fixes/dryplan.py on the card image; plan.json, progress and RUNLOG lines went to fixes/dryplan/)

s = 1, device cuda, 53 tune checkpoints, 388 tasks, 70 held-out checkpoints, plan_hash
43fa692efcd4b00cf4224ff9ec950917722770932db1755349b6edb44bce0d00 (STAGEB_LANES unset in the dry run, so its
projection header says 2 lanes; lanes are not in the hash and s = 1 either way).
sha256: train/kge.py 4b01984f085ec29c9c59e628c6016c326d526b0cb5407df5e6edc03155fb9e0f, train/stageB.py
141e4ed7e4331aed27de97b3fe670cf063caa2e141f389fe24ed6555c1168859, train/selectB.py
100e74787cdec300b048ea15fe1cb4fd92ad57c39143a94518b16db9f265d6dc, train/report.py
e649b86c7c509ea00d1892a8db107a3b16c79479b772d54876eddf205b6ca1ba, export/checkpoints.py
508c245f179345780a31e68fb4b2ce43b30540f2b66fe8046e689be83f602b4e, train/atomic.py
728773b1077e141058e59be82a5b39bc2aab00a7cc1cecb84f27b737595d78e0, train/proj.py
dcad14d5bb851e6bd44be69ee571cae0e465b6528718ebbabf67e007220400c9.
Not done here (by the brief): stage B, guard-stageB.sh, the scripts of rulings 57, 58 (item 27, held-out driver,
item-24 adapter, leak audit) and 60-62.

### Rulings 63-66 (written 2026-11-14 while the coordinator's release check ran; NOT YET RUN: no container started)

Code before these rulings: fixes/pre_m3/ (stageB.py, selectB.py, guard-stageB.sh). Syntax checked on the host
only (no Python there): `sh -n`/`bash -n` on the shell files and a bracket/string/indent checker on the Python.
- 63: no change (the order check of ruling 49 stays, export/checkpoints.py:129, 136).
- 64: train/selectB.py:95-100 (`_stats`: on an exact tie for the best mean, the band is measured from that mean
  with the largest SE among the tied candidates; `best` = that candidate, then config id, then w), docstring 7-8.
  Test fixes/tests/test_r64.py: all six orders of a three-candidate case (c02 and c03 tied at 0.625 with SE 0.125
  and 0.25, c01 smaller at 0.45). Expected before: two different picks by order (c02 when c02 is listed first);
  after: c01 for every order, for choose() and choose_builder().
- 65: train/stageB.py:199-212 (`fold_counts`, `check_no_fold`), 299 (run_units: a non-zero folded count at s = 1
  raises before the part is written, so the unit is logged failed, never done), 348 (assemble re-checks the
  merge). The held-out driver (not written yet, ruling 58) must call `check_no_fold` on its parts.
  Test fixes/tests/test_r65_66.py r65a-e (cands_folded = 1 and seeds_folded = 1 at s = 1 -> failed, no part;
  all zero -> done; s = 3 -> done; assemble refuses a part edited to hold a folded count).
- 66: train/stageB.py:42 (STAGEB_LANES unset -> 1 lane, was 2), 214-219 (`runner_info`: runner from
  STAGEB_RUNNER, processes from STAGEB_PROCS, default 1; host, pid), 294 and 303 (both part branches record it),
  361-364 (the assembled _meta.json lists the runners); plan_hash_inputs unchanged (s, device, ancestry rule,
  files). orchestrator/guard-stageB.sh: sets STAGEB_PROCS and STAGEB_RUNNER (70); the container's shell writes
  stageB/guard.rc when its command ends by itself (72-73); if another kge-* container runs beside kge-B1 (seen
  twice, 20 s apart) the guard stops kge-B1 and waits (90-96; before a launch it already waited, 119 and 121); only a launch that
  ended by itself (guard.rc present, not stopped by the guard) with no new finished unit counts toward exit 2
  (104-114); a stop by the guard (memory, other container) or from outside (no guard.rc) is logged, not counted.
  Test test_r65_66.py r66a (hash keys and hash unchanged under other STAGEB_LANES/PROCS/RUNNER), r66b (LANES = 1
  when unset), r66c (runner and processes in both part branches and in the assembled meta).
Run later, in one post-code card container: `cd fixes; sh frun.sh tests-post3 gpu post -- sh tests/runall3.sh;
docker wait kge-F1; sh frun.sh --done tests-post3` (log fixes/logs/tests-post3.log; it reruns the whole earlier
suite and the dry plan on the final code, then test_r64 and test_r65_66 on pre3 and post).
sha256: train/stageB.py 9d30a215eba78b3e7b243a968607d22541e4817c73e17a72583ef8abe99c3e46, train/selectB.py
05a5766b518e378c55d645b3525d875ec5762c5c5cf9c4337770a5932b957fd5, orchestrator/guard-stageB.sh
14350a1804973662f2ea547f0bc8aa24b5d3aae6d664c28a5de81c3eb210972e. The stageB.py change moves plan_hash: the
dry-plan hash 43fa692e... above is superseded; the new one comes from that run.

## Host stall of 2026-11-14 afternoon, and the guard's stop rule (recorded 2026-11-14 ~14:25Z)

- Fact from the coordinator's reading of the Windows logs: a stall on the Windows side began at about
  16:10 local, while the lane's `e4-gpu2` card container ran (16:10 to 16:16 local). Its three rename
  failures (16:11, 16:13, 16:14) belong to that stall. The logs show no graphics-driver or hardware error in
  that window; one warning at 18:01:54 said all ephemeral TCP ports were in use; the PC then died at 18:02
  (event 41). The card run is neither shown nor excluded as a trigger. Card and host load are logged during
  every card session (`gpu/gpu-load.tsv` pattern; guard-stageB.sh runs its own logger).
- guard-stageB.sh stop rule changed at the coordinator's request: three samples with commit above 43 GB or
  free RAM under 2.5 GB (was 48.5 GB / 2.0 GB), so the lane yields before the ship coordinator's own alarm
  (44 GB / 2 GB). memgate.sh reads STOP_FREE_KB / STOP_COMMIT_KB from the environment (old values as
  defaults); the guard exports 2621440 and 45088768 KB. Start rule unchanged (4.5 GB free, commit < 40 GB).

## Release gate round (2026-11-14, 14:05-15:10Z; findings in orchestrator/release-gate.json)

Pre-round copies of every changed file are in fixes/pre_m4/ (stageB.py by its name; the others as *.snapshot).
Nothing frozen or made read-only; stage B not started; guard-stageB.sh not run (only sourced by the host test).

### stageB.py (the only hashed file touched; 9 diff hunks, 5 lines out, 28 in)

- operations-10: `assemble` removes an existing destination before replacing onto it (`_drop`, os.remove when
  the name exists): `_meta.json` first (the completion marker goes first, so an interrupted re-assemble is redone),
  then each score table, `_counts.json`, and `_meta.json` again before its final write.
- operations-02: the progress path is `STAGEB_PROGRESS` when set, else train/progress.jsonl (default unchanged);
  `done_units` reads every progress*.jsonl in that folder.
- One step beyond the brief's letter, reported to the coordinator: `done_units` skips a line that does not decode
  (`_lines`). Without it a half-appended line from a second writer would crash every `done_units` call; a unit whose
  done line is torn is simply redone.
- plan-06 (left as it is): the stale-part dead end (a done unit whose part carries another plan hash is redone; if
  that redo fails, the old part is kept because the unit is still in done_units, and assemble then exits for the
  arm) cannot be reached in this run: the run starts empty (ruling 59, make_plan refuses non-empty parts/tables) and
  check_plan_hash runs before any unit. If it is ever fixed, the fix belongs inside the plan freeze.

### Guard, memgate and launchers (not hashed)

- guard-stageB.sh (rewritten; GUARD_LIB=1 makes it sourceable for tests): device-06 a card check before each
  launch (`docker run --pull never --gpus all ... torch.cuda.is_available()`; a failure counts toward the
  three-strikes exit 2); operations-03 a stopped leftover kge-B1 is removed; operations-02 before each launch
  guard-prelaunch.js moves undecodable progress lines to `<file>.torn`, makes each progress file end in a newline,
  and checks every done unit's part (counts.json and meta.json parse, both tables gunzip with the evalcore header);
  a bad folder moves to train/stageB/quarantine/<UTC stamp>/...; operations-10 20 consecutive stage-B failed lines
  carrying RenameFailed stop kge-B1 and the guard (exit 6), also checked before a launch; operations-07 the image is
  resolved to its ID once and every docker run uses that ID with `--pull never` (exit 7 if the tag is absent);
  ruling 66 PROCS other than 1 needs "ruling 66 equality accepted: procs=N" in this file (exit 8). The
  coordinator's MAX_HOURS 120 and the exported stop thresholds are kept.
- guard-prelaunch.js (new; node, no Python on the host): sanitize, validate, renamefails, left, donen. `left`
  counts a done unit only when its part folder holds counts.json (stageB.py's own skip test), so a quarantined unit
  counts as left; `donen` counts done lines, so a redone unit shows as progress.
- memgate.sh (operations-06): a sample whose two fields are not both numbers counts as low (fail-closed), so three
  unreadable samples in a row stop the container; `startable` also needs two numbers.
- operations-07: `--pull never` in fixes/frun.sh and train/drun.sh. frun.sh now waits (instead of failing) while
  any other kge-* container runs, then runs memgate wait, and re-checks after the gate; FRUN_MEM sets the cap.
- operations-08: superseded launchers renamed with a `.superseded` suffix, a header line and `exit 9`:
  train/launchA.sh, train/launchB.sh, orchestrator/guard-stageA.sh, gpu/run-gpu-session.sh.

### Tests

- Host (no container; fake docker and powershell on PATH): `sh fixes/tests/test_guard_host.sh` -> RESULT PASS,
  25 checks (log fixes/logs/test_guard_host.log). memgate on '', '123', 'abc def', '1000 30000000' says low (before
  this round: ok, ok, ok, low); a stopped kge-B1 is removed and a running one kept; card check fails on exit 3;
  both docker runs carry `--pull never` and the image ID; procs=2 refused without the RUNLOG line; 2 torn lines moved,
  newlines fixed, 2 bad units quarantined and the good one kept; quarantined units count as left (17 of 18; the
  earlier helper said 14); renamefails 19 -> 20 -> 0 after a done line.
- Container suite, one card container (kge-F1, 14:22-14:24Z; `sh frun.sh tests-post4 gpu post -- sh
  tests/runall4.sh`; log fixes/logs/tests-post4.log): every earlier test passes on the changed stageB.py
  (test_r49_52, test_r55, test_r59, test_select_report, test_r49_50_detail, test_r53_58_unit, test_r59_start,
  test_rename post, test_r64 post, test_r65_66 post), and the pre variants fail as before (test_rename pre2,
  test_r64 pre3, test_r65_66 pre3). New: test_ops_stageB pre4 FAIL (opsA env ignored, opsB JSONDecodeError on the
  torn line, opsD RenameFailed after 5 refusals, opsE _meta.json left behind) and post PASS (opsA-opsE; opsD
  re-assembles onto existing files with replace-onto-existing refused and matches the first assemble).
- scoring-selection-5, test_e5_equiv (same container): stageA/E5/c01/reps.pt, 5 tasks at cd806c80, both scopes.
  kge.score vs routed_scores on the candidates present at C: 645 candidates checked, max |diff| 2.98e-08, none scored
  by routed_scores alone. Full lists (1,048 candidates): 0 candidates known to a routed specialist that also knows
  the seed were left unscored; kge.score scored nothing present at C that routed_scores did not (0 folded at s = 1).
- Dry plan (same container, device cuda): plan_hash 71116daa652f5272a577a5b3f16c90d41bb64e08c7cfdad2820e18713f5ceb70
  (supersedes 43fa692e... and the round-2 hash); 53 checkpoints, 388 tasks, lanes 1.

### E4 c13 and c16 on the largest tune parent (device-01 and the init-hash addition)

7b3a745281898d3d5808c5a15c4916d1d9dbb1b4 (7,585 triples), seed 1, hold-out off, 3 fixed epochs, current kge.py
(variant B), `python e4work.py mem <cid>`; one container per row, each after the other-kge wait and memgate wait;
results fixes/e4/mem-*.json, host logs fixes/logs/e4mem-*-host.log.

| run | cap | epochs | peak RSS MB | cgroup memory.peak | docker stats max | card alloc / reserved MB | wall s |
|---|---|---|---|---|---|---|---|
| card c13 | 2560m | 3 of 3 | 2,101 | 2,684,354,560 (= the cap) | 1.738 GiB | 1,152 / 1,224 | 14.3 |
| card c16 | 2560m | 3 of 3 | 2,039 | 2,684,354,560 (= the cap) | 378 MiB (one sample) | 1,106 / 1,160 | 11.3 |
| card c13 | 3g | 3 of 3 | 2,090 | 3,221,225,472 (= the cap) | 1.573 GiB | 1,152 / 1,224 | 11.0 |
| card c16 | 3g | 3 of 3 | 2,041 | 2,664,034,304 | 1.551 GiB | 1,106 / 1,160 | 11.5 |
| CPU c13, c16 (init hashes) | 2560m | 1 | 1,587 / 1,566 | 2,114,588,672 | - | - | 10.4 / 10.0 |

- Peak RSS stays at 2.04-2.10 GB, under the finding's 2.3 GB line, and no run was killed. memory.peak sits at the cap
  because it counts page cache (memory.current also at the cap after the run); swap peak 0. The 3g reruns were made
  because memory.peak passed 2.3 GB; they show the same RSS. Card epochs after the first take 0.84-1.0 s.
- Initial weights after each PyKEEN reset (probe, final), CPU image vs card image: c13 f18e80c8579ade4e,
  9854b1c7c0bac010 on both; c16 the same two hashes on both (c13 and c16 differ only in composition and lr, which do
  not touch the parameter shapes). Bit-identical for both configurations and both resets.
- tf32 inside the card container with KGE_DEVICE=cuda: torch.backends.cuda.matmul.allow_tf32 False and
  torch.backends.cudnn.allow_tf32 False, after import and after training (kge.py:46-47). On the CPU image cudnn's flag
  reads True (kge.py sets them only for cuda; no cuDNN runs there).
- Card during the runs: at most 42 C and 37.0 W (nvidia-smi every ~5-8 s; each run lasts 11-14 s, so a 30 s cadence
  would have caught at most one sample). Host: free RAM 7.6-8.8 GB, commit 37.4-39.3 GB, CPU load 44-96 % (other
  sessions' containers were running).
- Not done: the optional check.py rerun on the card (device-04); C: free was 20 GB at the end, at the stop line.

### Inputs the plan hash does not cover (plan-03; recorded before the start, no code change)

| input | sha256 |
|---|---|
| train/stageA_configs.json | 635f1dcdcec2952e6b1307c1b8bb9a4131dcea74804642dc8501fdf4d1482d5b |
| train/stageA/top3.json | 8cff7d1691fae6c186f21cd30505ce310b470e6952f1ebe2828f1c9da40784d5 |
| eval/tune_tasks.jsonl | e47b9fe5811a74c6dac4b0dca41e350c32ccb9c7a6ebc3a31f117ded941a3789 |
| eval/comparators/candidates_pool.tsv.gz | 4ee503ab6b419dbd95ca6c84cf6d50c832d80b22c2afaa19eb9cce8c6434ca43 |
| eval/comparators/candidates_unrestricted.tsv.gz | c44dccb16f71e7f5bf9a597b2e4c5f9a4b699c2dcc3967a5fec23b6693e0a5cb |
| export/graphs0/ (370 files) combined | 7d1895f261ffd9e85c2dcbda63ee0548c72fc9bc0e35df49e7103f0d25996baa |
| export/graphs/ (738 files) combined | 0236d22947c1ad63448564a415a4e5a55863a090a411925ba152a63468b20fe9 |
| export/sizes.jsonl | b23b1e81078af8a45109c1934faab3258f966118814d79d7599a99cebe1b2e63 |
| image graphtest-kge-gpu:1 | sha256:a890c54808c11c460d910945c4bf981390f7de43c8dfc5840269b76f5861cbe7 (torch 2.15.0+cu132) |
| threads | KGE_THREADS unset -> 6 (kge.py:38); the guard sets OMP_NUM_THREADS=6, MKL_NUM_THREADS=6, --cpus 6 |

A combined hash is the sha256 of the list "<sha256>  <path relative to the tree>\n", one line per file, paths in
byte order (C locale); the lists are fixes/manifest/graphs0.sha256 and fixes/manifest/graphs.sha256. stageA/<arm>/
<cid>/meta.json files are copied into plan.json's body and not listed here.

### Superseded lines (device-04)

The E4-card-init sentence (lines 154-156 before this round) and the E4 row of the sanity table (line 175) carry a
SUPERSEDED marker; nothing was deleted.

sha256 after this round: train/stageB.py 32c8c070938bd51400dcf233604d7ff51ea50a80a02184fdb04480009602ed23,
orchestrator/guard-stageB.sh c54aa7083cfdd235074ca0d232a720daa7ee48b95531d73cdff3e29b8dc04dbb,
orchestrator/memgate.sh 9604c7b1c3e04570d4d0ca8ee045827b00789564f3a997062b6e97fd8fb091a4,
orchestrator/guard-prelaunch.js c2999d063052412f3631bc1c65bc577f286d431f5f6c621994fc23928aff1f9e.

## Freeze for stage B (2026-11-14T15:21:48Z; rulings 67 to 70)

Hashed files (plan_hash inputs) made read-only on the host (chmod a-w), with the wrapper detrun.py.
They equal the `files` map of the dry plan in fixes/logs/tests-post4.log.

plan_hash 71116daa652f5272a577a5b3f16c90d41bb64e08c7cfdad2820e18713f5ceb70 (s 1, device cuda, 53 checkpoints, 388 tasks)

```
32c8c070938bd51400dcf233604d7ff51ea50a80a02184fdb04480009602ed23 *train/stageB.py
4b01984f085ec29c9c59e628c6016c326d526b0cb5407df5e6edc03155fb9e0f *train/kge.py
dcad14d5bb851e6bd44be69ee571cae0e465b6528718ebbabf67e007220400c9 *train/proj.py
728773b1077e141058e59be82a5b39bc2aab00a7cc1cecb84f27b737595d78e0 *train/atomic.py
508c245f179345780a31e68fb4b2ce43b30540f2b66fe8046e689be83f602b4e *export/checkpoints.py
4054976ce935e081082cbeb6ef1ccc64d102a50a00ce61123ea0fd093d7da0ff *eval/evalcore.py
3591ebb9ff27fb4060a8bd71c13940bf435c64004f73a482db8eb4a2ab958e51 *export/parents.jsonl
f28339bfdb0114a299ca48815a7c11bb19830e2aa11795549277c41fcff05783 *export/parents_git.jsonl
# not hashed, frozen by record:
c4d3f94a6db48853803476f1580c96f93005c68be535bea71a3b146aed54812e *train/detrun.py
59d3fb8e0eecf35d1490b10405ccafa12a35a101e37d0c3349ed89c0884a41e3 *orchestrator/guard-stageB.sh
9604c7b1c3e04570d4d0ca8ee045827b00789564f3a997062b6e97fd8fb091a4 *orchestrator/memgate.sh
c2999d063052412f3631bc1c65bc577f286d431f5f6c621994fc23928aff1f9e *orchestrator/guard-prelaunch.js
```

- Ruling 67: train/detrun.py sets CUBLAS_WORKSPACE_CONFIG=:4096:8 before torch loads and
  torch.use_deterministic_algorithms(True) (the measurement's pw.py --det settings), appends " det=1" to
  STAGEB_RUNNER, and runs stageB.py unchanged. Checked in the card image: "detrun: deterministic True
  cublas_ws :4096:8"; a separate python in the same container reads False (the setting stays in the
  wrapper's process). The assemble check for det=1 on E4 parts lands while training (not hashed).
- Guard: order E1 E5 E2 E3, then E4 through detrun.py (one process); the two-process path, gated by procs_ok,
  also routes E4 through detrun.py. Ruling 70: launch at >= 15 GB free on C: (otherwise wait 300 s and
  re-check), stop under 10 GB (STAGEB_MIN_FREE_GB 10).

## Stage B plan (rulings 36-38), written by stageB.py 2026-11-14T15:24:30.827562Z

Epochs per selected config (stage-A best epoch, rounded up to the eval interval, min 20):
- E1: c04 70 ep (best 70), c15 70 ep (best 70), c12 70 ep (best 70)
- E2: c11 20 ep (best 10), c07 20 ep (best 20), c10 20 ep (best 20)
- E3: c11 40 ep (best 40), c03 60 ep (best 60), c13 130 ep (best 130)
- E4: c12 95 ep (best 95), c13 50 ep (best 50), c16 60 ep (best 60)
- E5: c03 70 ep (best 70), c11 40 ep (best 40), c09 160 ep (best 160)

| s | tune checkpoints (r33 added) | projected wall h (1 lanes on cuda) |
|---|---|---|
| 1 | 53 (0) | 14.4 |
| 3 | 19 (0) | 4.9 |
| 6 | 10 (0) | 2.4 |
| 10 | 7 (0) | 1.7 |

**s = 1** (under 30 h). Tune checkpoints used: 53 (r33 added 0, r51 added 0). Lag (ruling 52) over the 388 tasks: {0: 388}. Tasks unscored (parent graph without co_changed, ruling 51): 3. Held-out checkpoints at s: 70. plan_hash 71116daa652f5272a577a5b3f16c90d41bb64e08c7cfdad2820e18713f5ceb70.

## Ruling 58 scripts (2026-11-14T16:19:27Z)

Written and plumbing-tested on TUNING data only while stage B trains (kge-B1); nothing under sealed/ was opened and
no held-out reference was read. Tests ran in kge-W1 (graphtest-kge:1, CPU; three starts) except the leak audit
(host: git and the raw facts cache). Each PASS log prints the sha256 of the bytes it tested and `RESULT PASS <role>`;
selectB.r58_guard requires both (release gate scoring-selection-6).

sha256 9a8e770ebc14e221447178ad0cf6cc4f786a20adc6ef4e1260aea5e883538dfd item27 train/item27.py
sha256 966f9396777c2306ebe1a2e91c7701a36883ea071fffbcb9e7d6530a2f75593b heldout-driver train/heldout.py
sha256 67ed648a7c45e9f13dcac5d418a7be30e7bd81931fa37eeffe2adadbd238d365 item24-adapter train/answer_level.py
sha256 12b244bbae5269ac15a28d6d4852547567cec4831ad2046d9f9b3ea7d5486030 leak-audit train/leak_audit.py
PASS item27 train/r58/logs/test_item27.log
PASS heldout-driver train/r58/logs/test_heldout.log
PASS item24-adapter train/r58/logs/test_answer_level.log
PASS leak-audit train/r58/logs/test_leak_audit.log

Other files of this step (not read by the guard; the adapter pins answer_level.js by its own JS_SHA256):
- 0d346e665ba24323505958c8f3f6ec30bdf09978bf969900d9cf3aebfae13f7a train/answer_level.js (item-24 node side; test_answer_level.log, test_heldout.log)
- a66c4bb1ae8857bfebb191774cf4570366d0b8c9c875c0f16fce0df4c2f76871 train/heldout.sh (launcher of the one held-out run, kge-H1, GPU image by ID)
- 27570db78081dc9d8d7d56d53c11ace757b81b164e6ef4a565de260f9c28c944 train/item22.py (ruling 61; test_item22.log)
- a2853ed994f0a676aec8df3e3a25a345a7984802032b38f0c8e533a93c026d81 train/write_result.py (ruling 62; test_write_result.log)
- 13b6280587047d56041d0894500aefa623ac74328a13c8cf73819af7bc9d5c20 train/selectB.py (gate plan-04 + ruling 67 check, scoring-selection-6 guard; test_gate.log)
- f71c4311ff5018ef5a0bd332c70a05878f9ab95821e6cea7a25ea08ba91d03ad train/report.py (gate scoring-selection-3/-4 counts; test_counts.log, test_write_result.log)
- a6985d6390882d76c7f674f8b62e519ceb2319249cbf2bc165f6babbc642def6 fixes/tests/test_select_report.py (r58 step from a temporary train copy; test_select_report.log)
- pre-fix snapshots for the fail-before checks: train/r58/pre/{selectB.py,report.py,test_select_report.py}

Readings recorded (rulings that left a choice):
- Item 24 on tuning: the references are git truth's FILES (tune_tasks.jsonl), defs empty (the definition half is
  sealed), so the tuning answer-level figure is file recall within 8,000 tokens; options from the frozen record
  build/results/frozen/relational/95e990307da3b42b.json (file / signature / pad none; budgets 2,000-16,000).
- Ruling 60 c5: only held-out truth (anything under sealed/, *reference*.jsonl) fails; tune truth in eval/ mounted
  into the stage-B container is allowed by item 18 and listed. Held-out task commits are unknown to the lane, so c1
  for held-out is "every raw commit of C is P or an ancestor of P".
- Ruling 61 for E4: the kept CompGCN representations are encoder outputs and cannot be written back into a model,
  so check.py's comparison uses a fresh model of the selected config (seed 1, stage-A graph, selection-epoch count).
  E1/E2/E3/E5 inject the KEPT reps.pt and accept only if final_reps returns them exactly. Loss ratio: last tenth /
  the tenth before, stage A both as run and to the selection epoch.
- Ruling 62 / item 17: "distinct" = distinct paths, plus distinct (checkpoint, path) pairs; counts for seed 1 with
  seeds 2-3 compared. N3 stated as weight / 3 per E2 configuration.
- Ruling 57: ties compare figures rounded to four decimals; "smaller model" = selectB.size (dimension, then layers).

## Ruling 58 follow-up rounds 1-3 and rulings 71-72, 78-80 (2026-11-14, written 2026-11-14 after ktest-13)

Three follow-up rounds of the review of the ruling-58 scripts, all on TUNING data and synthetic graphs; nothing under
sealed/ was opened, no held-out reference was read, no card test ran. Tests ran in CPU containers ktest-1..ktest-14
(graphtest-kge:1 by image ID, --network none --pull never --cpus 2 -m 1536m, one at a time, each started after three
memgate samples 30 s apart), with train/ read-only and only r58b/ writable; kge-B1 and its guard were never touched.
Every check that fixes a review note fails on the previous bytes (snapshots r58b/pre/, r58b/pre2/, train/r58/pre/) and
passes on the current bytes; each log prints the sha256 of the bytes it tested. Later lines win in r58_guard, so the
lines below supersede those of the "Ruling 58 scripts" section.

sha256 982c97eabdd8adcceacd15caa66f30fe60d5f66766edd4137e4d21b9d9042c91 item27 train/item27.py
sha256 38699e3e266de4fc5c125be94c2c223fc245d3d471fceb4dd8dbe16870e261a3 heldout-driver train/heldout.py
sha256 ce7a3f95b4499aa1117f902217db7b73cb5a9131423674ccb44cbadd2176a9b3 item24-adapter train/answer_level.py
sha256 6725c5ee454b4e05b0c161ea3be9476d07babd9c8b050ec88e329f6891fd6656 leak-audit train/leak_audit.py
PASS item27 r58b/logs/test_item27.log
PASS heldout-driver r58b/logs/test_heldout.log
PASS item24-adapter r58b/logs/test_answer_level.log
PASS leak-audit r58b/logs/test_leak_audit.log

Other changed files (not read by the guard), with the log that tested them:
- 0f4a6e2dffc2cd535158a6571596828b2fff52d6ff9d99ce02d31ec82179278e train/heldout.sh (rulings 78-79; test_heldout.log, test_probe.log)
- c55760fe28e881a48599b0dde78ead2660ebf78e299d5d3f50702fa0e9564742 train/heldout_inputs.js (ruling 78 staging; test_heldout.log, test_leak_audit.log)
- 9bea9131d0e95da0492675800ec727e26701218c459f76881d5c765339b5c8c1 train/write_result.py (audit-result-2/-3/-7/-8; test_write_result.log)
- 3a3d32956502f993363c6d87f9b93db7bbee553401d59296e0d7a9719e40caec train/selectB.py (stamp, tables digest, r58_guard; test_gate.log, test_item27.log)
- a190dbeabba0ccaed5ea399312a788a81917637dc99d77b856c383b71a9ac658 train/report.py (selection-freeze-6/-7; test_verdict.log, test_counts.log)
- e5e86d60d528751f31b4744ad366a2cfbc9465e29c77e1c799b65eb4fe95e606 orchestrator/assemble_checks.py (audit-result-4; test_assemble_checks.log, test_end_of_run.log)
- eefbd17ba565b91af55dd05985bb808ae5b2cc0404920d6cc0b36c9a32ce8523 orchestrator/end_of_run.sh (evidence-2, selection-freeze-2; test_end_of_run.log)
- 0d346e665ba24323505958c8f3f6ec30bdf09978bf969900d9cf3aebfae13f7a train/answer_level.js (unchanged)
- bbd0107e3544b14a337573da4152c123b5208bf018299f5d76eea014ed2036e2 train/HANDOFF-FORMAT.md (both hand-offs, one naming, the grader's returns)
- tests: train/r58/tests/{hotest.py, test_heldout.py, test_heldout_e4.py, test_probe.py, test_leak_audit.py,
  test_answer_level.py, test_write_result.py, test_item27.py, test_verdict.py, test_gate.py, test_counts.py};
  r58b/eor/test_end_of_run.sh; parallel/tests/test_assemble_checks.sh; hashes printed at the top of each log.

### End-of-run steps (orchestrator/end_of_run.sh; run by hand after the guard logs "stage B complete: no unit left")

1. Preconditions: the guard's last state line is "stage B complete: no unit left" (else exit 10); no kge-* and no
   ktest-* container runs (11); C: has >= 10 GB free (12).
2. Host: `guard-prelaunch.js left` prints 0 (else 20).
3. Host: `guard-prelaunch.js validate` over every arm: missing=0, quarantined=0 (else 30; a quarantined unit is redone
   by the guard, so the procedure stops there).
4. Once the memgate start rule holds (three samples 30 s apart, free >= 6 GB, commit < 40 GB; else 13) and still no
   kge-*/ktest-* runs (11): ONE CPU container ktest-N, export/ eval/ train/ orchestrator/ read-only, only
   train/stageB/tables and the log folder writable: `stageB.py assemble` (every arm; 41-43), then, only if it exited 0,
   `assemble_checks.py --train /w/train --plan` into the log.
5. Host: validate again (else 50).
6. Host: every planned (arm, config, seed) has `_meta.json` with plan.json's plan_hash and the plan's part count, both
   scope tables and `_counts.json` (`check-tables`; else 60).
7. Only if 4-6 passed, the log shows `assemble_checks PASS` (else 70/72), the sha256 of the current
   assemble_checks.py (71), the part count equal to the plan's and a `tables_digest` line (73): append
   `PASS assemble-checks <log>` to this RUNLOG. Any failure appends nothing.

### Rulings 71 and 72: what changed

- Ruling 71 supersedes the first reading of the "Ruling 58 scripts" section (item 24 on tuning as file recall).
  answer_level.py tune now writes the grader's hand-off train/report/answer_level/handoff/ (HANDOFF.json with every
  file's sha256, tasks.jsonl, one ranked and one answers file per variant, 40 variants, no truth key, checked by
  truth_keys); the lane's file recall within 8,000 tokens stays beside it under its own label. write_result.py shows
  the grader's item-24 figure (--answer-graded) and the lane figure apart.
- Ruling 72: leak_audit.py lists every file of the mounted eval/ folder with class, size, sha256 and why it is truth,
  plus the code lines showing stage B trains and scores on (task id, seed, candidates) only; AUDIT.md carries both.

### Rulings 78-80

- Ruling 78: heldout.sh stages the 70 held-out parents' facts, trees, the blobs they name and common/*.js
  (heldout_inputs.js build/check; launch refused, exit 8, unless the staging checks) and mounts only that;
  leak_audit.py c6 compares the mount list and the staged folder with the plan's 70 parents.
- Ruling 79: -m 4g --memory-swap 4g for every arm; start after three samples free >= 6 GB, commit < 38 GB;
  `PROBE=1 sh heldout.sh` runs `heldout.py probe` (3 epochs of each arm's three selected settings on a synthetic graph
  with the largest held-out graph's counts, 2c7f91e1: 5,458 entities, 36 relations, 17,391 triples) and writes
  train/probe/probe.json with each setting's peak RSS; a setting above 3.5 GB is listed and exits 4.
- Ruling 80: the anchor line in the lane's progress.jsonl (only the last such line counts):
  `{"step": "coordinator", "unit": "item27_freeze", "file": "train/heldout/item27.json", "sha256": "<64 hex>", "t": "<ISO 8601 UTC>"}`.
  heldout.py verify refuses (exit 5) a record whose sha256 differs, a test flag, a null code hash or a tables digest
  that differs; once() refuses (exit 8) a second run once HANDOFF.json exists or the folder holds another record's
  start line; the item-27 record carries tables_digest.

### Readings (rulings that left a choice)

- Ruling 79 probe: entity kinds, code flags and areas come from the largest TUNE graph in proportion; relation pairs
  are random distinct pairs; peak = each child process's ru_maxrss (the cgroup peak is added when readable). The
  probe container is classed under the heldout role by the leak audit.
- Rulings 39, 44, 45: texts taken word for word from protocol-addendum-8.md, as for 35, 46, 47, 67, 68.
- answer_level.js counts node index 0 as missing (`if (!i)`); the adapter now refuses a dropped ranked path (exit 11)
  instead of producing a wrong number.
- end_of_run.sh validates before and after assembling; the memgate is checked only before step 4. EOR_TEST_IGNORE is
  for the plumbing test only and unset in the real run.
- Held-out task list: pinned by sha256 89a45cb3... of build/tasks/tasks.jsonl, 418 T1 held-out rows, 70 parents
  (= plan.heldout.assignment); anything else exits 6.

### Found by the last test runs and fixed

- The tune run of answer_level.py wrote tune_refs.jsonl (tune truth) under train/report/answer_level/, and an earlier
  test left one under train/r58/out/answer_test/; the held-out container mounts train/ read-only, so it would have
  seen tune truth. The refs now go to the work folder, which is removed after scoring; the stray file was moved to
  r58b/out/moved_from_train/. test_leak_audit's leak_heldout_launcher_mounts_clean caught it.
- leak_audit.py ruling78 compared the mount destination with its mode suffix (`/gt/facts:ro`), so the staged mounts
  were never recognised; the suffix is now stripped before the comparison.
- write_result.py: the worst case (full held-out table and a graded 16-label item-24 table) reached 171 lines. The
  item-24 and lane file-recall figures are now one compact table (one row per arm, cells alone / fused, plus the
  comparators; nothing dropped), the lane column under its own label and heading; the worst case is 146 lines.
- test_gate: report.py had bound the no-op guard that an earlier check installs (report.py imports r58_guard by
  name), so report's "guard passes" check passed without the guard and its refusal check failed; the test now gives
  report and selectB the real guard back before those checks, and item27 is called with no option (ruling 80).
- test_leak_audit r78_old_launcher_fails: with the suffix fixed, the old launcher's /gt/facts is recognised as the
  whole facts cache outside the staging (not as "no staged mount"); the check now asserts that.
- heldout.py's tests ran on answer_level.py 9241a9b5...; the later change touches only tune(), which heldout.py does
  not call (it uses pack()), so they were not rerun.

### Remaining review notes: take or leave

- selection-freeze-3: taken (counts per configuration and seed; test_counts.log).
- selection-freeze-4: taken (test_counts.log).
- selection-freeze-5: taken (test_select_report.log).
- selection-freeze-8: taken in part: the verdict boundary tests (test_verdict.log) and the item-27 --test refusals
  (test_item27.log). Left, not done this round: the block-perturbation test (block k's scores change, blocks 1..k keep
  their choices; earlier_commits = [15,25,35,45,55]) and test_r64 on the current selectB. Both can run on fake
  tables; recommended for the next round, before selectB runs for real.
- heldout-sibling-seeds: left, disclosed here. The held-out rows a run reads are truth-free one by one, but the
  seeds sharing a parent reproduce most tasks' truth in aggregate (item 4). No code path uses a sibling seed (by_ck
  groups tasks per checkpoint only to batch them; scoring takes one task's id, seed and candidates); separating the
  data would change item 4's task set, which is the protocol's, not the lane's.
- heldout-untested-surface: left; the card path (CUDA, the GPU image, E4 with CUBLAS, 70 checkpoints) can only be
  tested on the card, and no card test is allowed while stage B runs. The CPU path of the same code, held-out task
  pinning, the staged mounts and the probe on a full-size synthetic graph are tested; the ruling-79 probe on the card
  is the first real exercise of that path.
- heldout-record-hash-not-anchored: taken (ruling 80 anchor).
- heldout-grader-interface-unspecified: taken in part (train/HANDOFF-FORMAT.md); the grader's own code is not the
  lane's to write.
- heldout-memory-cap-frozen: taken (ruling 79).
- heldout-mounts-later-facts: taken (ruling 78).
- heldout-no-once-guard: taken (exit 8).
- answer-level-7: taken (non-T1 rows refused).
- audit-result-5: taken in part (docker inspect capture, staged-folder check); left: auditing a container's live
  filesystem, which needs the running held-out container.
- audit-result-6: left. The leak audit now lists every eval/ file and the ruling-72 code lines (in its AUDIT-leak.md
  and JSON), but no script yet writes the deliverable AUDIT.md (seven parts) or CLAIMS.md; several parts (the
  assemble_checks result, the freeze and hand-off hashes, the grader's ruling-73 check) exist only after the run.
  To be built before write_result runs for real; recommended for the next round.
- audit-result-9: left; not in this round's list. item22.py still states the reciprocal relation instead of checking
  head prediction, and write_result does not print CO's floor note, "injection FAILED" or ruling 74's wording for E4.
  Small, recommended for the next round.
- audit-result-10: taken in part. write_result refuses a missing item27.json, a failed or test leak audit, and an
  audit or record of another plan (exit 10); the tautological test is fixed. Left: test/plan_hash fields written by
  report.py, item22.py and answer_level.py and checked by write_result.

## Ruling 87 pre-flight: deterministic E4 c13 and c16 (2026-11-14, accepted by the coordinator, progress.jsonl `preflight_e4_det`)

- One container kge-P1, GPU image sha256:a890c54808c11c460d910945c4bf981390f7de43c8dfc5840269b76f5861cbe7, `--gpus all
  --network none --pull never --cpus 6 -m 2560m --memory-swap 2560m`, started 18:53:00Z after memgate (7,641,168 KB
  free, commit 39,361,120 KB), ran 149 s; kge-B1 was stopped by the guard and relaunched by it.
- `orchestrator/rerun_unit.py --det` (CUBLAS_WORKSPACE_CONFIG=:4096:8, use_deterministic_algorithms(True)), seed 1, plan
  epochs (c13 50, c16 60), checkpoint 8b506c0dac14, runs a and b of each setting in one process.
- Checkpoint, disclosed: the smallest tuning checkpoint 2fa68134d22d has no co_changed fact, so stage B never trains there
  (empty parts); 8b506c0dac14 (542 entities, 1,258 triples, 26 co_changed) is the smallest that trains. The coordinator
  ruled this the right reading of ruling 87.
- Result, ruling 68 (losses, every representation tensor, both score tables, counts): c13 identical (losses
  4d6192af4f78…, reps b1a37dadd771…), c16 identical (losses ca212a6ddef9…, reps fbce3f62443a…). No deterministic-kernel
  error. The coordinator's own comparison: runs differ only in timing fields and the output path.
- Consequence: the last sentence of ruling 67 lapses; E4 is deterministic everywhere (rulings 67, 87).
- Memory: process peak RSS 2014, 2255, 2256, 2268 MB over the four units (cap 2560m); the coordinator kept the cap. If an
  E4 container is killed for memory more than twice, the lane reports it and the coordinator rules on the cap.
- Files (r58c/preflight/): p1.sh 37aee48023af8ea7e86a3cf94ba05f3e8e5812e696c3ac7ec511c9143aa8b46d, compare.js 47b54b5ab312815dda2e9dbdddb4505295ffc37b1a99713d98c08d3a0b8b9fd8, rec.jsonl c1340beb46598eccad17b16b95bccb4fa7dcdbd96b1e4f6b37d10a7cd78c354e,
  run.log c82c1d0073c1dfdc1ea6e47c1d47f536f6ced4c31a1c8b670faf7af4fd3fbfe3, driver.log 2f00801390b7a787c1eb39e4f84ea4f6670f1c477284696c66fe47123984f6d0. compare.js prints `RESULT PASS`.

## Ruling 92: the stage-B guard's disk lines lowered (2026-11-14, coordinator ruling 92, `rulings_92`)

- Reason (coordinator): C: loses about 1.5 GB an hour to something outside the measurement (25 GB free at 15:24Z,
  17.1 GB at 20:48Z; the stage-B folder is 31 MB). At ruling 70's lines the guard would have stopped hours before stage
  B ends, freeing nothing.
- orchestrator/guard-stageB.sh was NOT edited (a running shell reads its script as it goes); kept, sha256
  59d3fb8e0eecf35d1490b10405ccafa12a35a101e37d0c3349ed89c0884a41e3. Copy orchestrator/guard-stageB-r92.sh, sha256
  8933e847d7e17eceed89c69f9d34bdb2af61baab9c71dc8035454a407e750730. The only difference (`diff`):
```
39,40c39,40
< MIN_FREE_GB=10        # ruling 70: stop under 10 GB free on C: (also STAGEB_MIN_FREE_GB)
< START_FREE_GB=15      # ruling 70: launch only at >= 15 GB free
---
> MIN_FREE_GB=5         # ruling 92 (was 10, ruling 70): stop under 5 GB free on C: (also STAGEB_MIN_FREE_GB)
> START_FREE_GB=6       # ruling 92 (was 15, ruling 70): launch only at >= 6 GB free
```
  Line 99 then passes STAGEB_MIN_FREE_GB=5 into the container (stageB.py:44 reads it).
- Fake-docker tests: fixes/tests/test_guard_host.sh copied to r58c/r92/test_guard_host_{old,new}.sh (only the
  output folder and the guard path changed; three checks added: MIN_FREE_GB, START_FREE_GB, and the
  STAGEB_MIN_FREE_GB value in the fake docker run line). Old file: 28 ok, RESULT PASS (10 / 15 / 10); new file: 28 ok,
  RESULT PASS (5 / 6 / 5). Logs r58c/r92/test_guard_host_old.log e94e8dae1550d2b993ba6a84e29cd6bb1a8a3651b7fd6dbaa74dc27c334b114d,
  test_guard_host_new.log f0a66a129dff819a382836b0892b52e8f0e2a7fb0c2895ab4e2c383d5571e265; scratch output deleted.
- Switch: old guard shell (pid 106341) and its GPU logger killed at 20:55Z (TaskStop alone left the shell running);
  kge-B1 stopped with `docker stop -t 20` at 20:55:36Z, the unit in flight is redone; new guard started at 20:56:06Z
  the same way (`cd orchestrator; sh guard-stageB-r92.sh`, same log orchestrator/guard-stageB.log). Its lines:
  `guard start ... units left 1598 ... C: free 18 GB`; `pre-launch: ... validate done=788 checked=787 missing=0
  quarantined=0`; `launched kge-B1 (6990992 40467056 free_kb commit_kb; C: 18 GB free; stage B 40085 KB; units left
  1598)` at 20:57:27Z. docker inspect of the new kge-B1 shows STAGEB_MIN_FREE_GB=5.
- Held-out keeps ruling 70's lines unless the coordinator rules again.

## After the PC reset of 2026-11-14 (last alive 21:45:25Z, reboot 22:03Z): stage B restarted under the original guard (ruling 93)

- State at restart (coordinator): 838 units done, the last at 21:40:43Z; two E5/c09/s1 units logged `failed` with
  RenameFailed during the Windows stall before the reset (dfe87430ac1b at 21:48:22Z, 89d41d69aef7 at 21:56:37Z), to be
  redone at the next launch (stageB.py:327). No guard, kge-* or ktest-* left. A stale r58c/ktest.lock removed.
- 22:09:14Z the original orchestrator/guard-stageB.sh (59d3fb8e…41e3) started as first started; 22:11:05Z pre-launch
  validate done=838 missing=0 quarantined=0; 22:11:16Z launched kge-B1 (docker inspect: STAGEB_MIN_FREE_GB=10, runner
  string unchanged).
- 22:12:38Z the guard stopped kge-B1, "memgate low three times ()", no unit finished (not counted toward exit 2).
  Cause: after the reset that guard's shell ran where powershell could not be called ("Permission denied"), so every
  memgate sample was empty, and an unreadable sample counts as low (fail-closed); such a guard could never launch again.
  Free memory was also under the stop line then (the owner's game, about 10.5 GB).
- 22:13:33Z that guard (its shell and a leftover memgate wait loop) stopped by the lane and logged; 22:13:51Z replaced by
  the same file and command, started so that powershell can be called: its samples read (3,539,460 KB free, 40,306,676
  KB commit). It waits at the start rule (4.5 GB free, commit under 40 GB) and launches by itself. The coordinator
  accepted the replacement. If a launch line ever shows an empty sample again, the lane reports instead of restarting.

## Incident: agent B's race test touched the real lane lock (2026-11-14, about 22:20Z; noted and accepted by the coordinator)

- The first host run of r58c/B's start-race test had an MSYS path bug: the `/c/...` paths passed to node were converted,
  so the test's copies of ktest.sh and lane_step.sh pointed at the real lane.
- Effect: the copies took and freed the real `r58c/ktest.lock` and called the real `orchestrator/memgate.sh` (read-only
  samples); a lane_step copy held the real lock from 22:21:25Z until agent B removed it at 22:23:15Z. Every docker call
  went to the stub docker: no container started, no lane file other than the lock and the launch log was touched.
- Marked in r58c/B/out/logs/ktest-launch.log as the `ktest-b99` lines, with a note. The test now refuses to run a copy
  that still names the real lane; its second run left the real lock, launch log and lane steps untouched.

## Round 3 test staging (lead, 2026-11-15, recorded for the coordinator)

- About 01:36Z: `selectB.py --test` (unchanged) restaged `train/selectB-test/`. The 14 November output there lacked
  the builder and fixed-w tables that `report.py --test` reads. `report.py --test` (unchanged) then wrote
  `train/report/test.json` (d78f637f1f5ad271ad0a244c063f59ce078343267e3df9adc2829163bc033800; ktest-b56, exit 0).
  Both folders hold test output only; at the code freeze every file under them is listed with its sha256.
- `r58c/B/ktest.sh` gained `KT_TRAIN_RW`. It makes only `train/selectB-test` and `train/report` writable, for one
  test run; any other word is exit 2 (CONFLICTS.md note 19).
- ktest-b58 (2e on returns graded from the old pick8 hand-off 0565f62a): exit 14, void. Its log is kept at
  `r58c/B/out/logs/wr_rehearsal.log`.
- Coordinator rulings: note 18, option (a). The pick8 test hand-off carries six fake arms (40 variants), and the
  held-out test form keeps one arm. The r4 cap is 4g by ruling, with ruling 79's start rule (6 GB free, commit
  under 38 GB); 4,096 MB is 2.92 times the measured 1,402 MB, and item 2's maximum wins over "three times" for memory.

## Rulings 96-97 follow-up (lead, 2026-11-15, about 05:00Z)

- TEST freeze record r58c/A/out/ho_rec/item27.json 049ba85be1d2cb84ebe99263b1d8c52ddbe76fc6d67e271d85b9adce0815205b is
  SUPERSEDED. It is the record the coordinator's rehearsal graded (`rehearsal_grader_side_2`) and it pins the old
  heldout.py (2e520639); heldout.py is now 9775077c (ruling 97(c), the probe's renaming and its other-to-code edges).
  At the formal 2e on the final bytes, all three test hand-offs and the test record are rebuilt and graded again.
- Old probe outputs: before ruling 97(c) the probe wrote relation names into probe.json. The coordinator searched the
  lane folders: the new relation's name is in the shared harness's own list (build/arms/common/edgeclasses.js) and
  our copies of it, and the probe.json counts are size counts allowed by ruling 79. Nothing was quarantined. Agent A's
  sums.js opened test_probe.a11-fail.log and test_probe.a18-fail.log through a mistyped exclude pattern and printed
  only "NO RESULT" from them.
- Relation counts: sizes.json's `relations` leaves co_changed out. Tuning: union 36 with co_changed (35 without).
  Held-out: 69 graphs have 37, one has 36 (36 and 35 without). The lane's tests count without co_changed (35 + 1).
- r58b/out/hstage (a full held-out staging from the r58b round) is still mounted into test containers by both
  agents' launchers; it is being taken out of every mount, then recorded here and removed.

## r58b/out/hstage removed (lead, 2026-11-15, coordinator's order after ruling 97)

- What it was: a full staging of the 70 held-out parents' facts from the r58b round (built 2026-11-14 about 17:08Z).
- Who used it: agent A's r58c/A/ktest.sh mounted it at /w/heldout_inputs, and all of r58b, in every A test container
  (test_leak_audit.py used it for its ruling 78/81 name checks); agent B's r58c/B/ktest.sh mounted all of r58b in
  every B test container (no B test read hstage). Both launchers now mount only named r58b subfolders, never
  hstage (A: fakeB, leak_parts, pre, pre2; B: pre, logs/test_verdict.log, and for wr_rehearsal two TEST records).
  test_leak_audit now builds a synthetic held-out staging inside its own container. No running container
  mounted it at removal.
- Recorded before removal: 1,574 files, 146 directories, 394,367 KB; listing sha256 (sorted `path<TAB>size` lines,
  find -printf '%P\t%s\n' | LC_ALL=C sort) 4c322ef6709ea4e4689de7cf7a98c80adf012071002e07fc98edae772e49fe13.
- The only held-out staging left is the one step 2f builds (LANE/heldout_inputs).

## Stage B memory cap: ruling 98 (2026-11-15)

- Kills at the 2560m cap (ruling 43), from `orchestrator/guard-stageB.log`: the container ran E4 c12 and the first 39
  units of c13 in one process, then ended with rc 137 at 05:55:39Z; each relaunch after it finished one unit and ended
  with rc 137: 05:59:07Z, 06:02:32Z, 06:05:59Z, 06:09:25Z, 06:12:54Z, 06:16:20Z, 06:19:47Z, 06:23:11Z, 06:26:38Z
  (ten kills in all). No unit failed; every pre-launch validate read missing=0 quarantined=0.
- Ruling 98 (`orchestrator/coordinator-rulings-98.md`, sha256 5e4faaa012841796a51991b8056a114c2e9997d3290125f75916f24df8d8362f):
  the cap of the remaining units is 4g.
- 06:28:25Z: the coordinator stopped the running guard and kge-B1 (`docker stop -t 20`; the unit in flight is redone).
  2,114 units validated at the last 2560m launch, 272 left.
- 06:29:24Z: the coordinator started the SAME guard file (`orchestrator/guard-stageB.sh`, sha256
  59d3fb8e0eecf35d1490b10405ccafa12a35a101e37d0c3349ed89c0884a41e3, unchanged, re-hashed 07:29Z) through
  `orchestrator/start-guard-r98.sh` (sha256 2be9f10a541d56a0f31fa3c651ceebcaae2bb3c16b3a40f483b667962d1af45c; it only
  sets CAP=4g and execs the guard), detached. Start line: "cap 4g". 06:30:40Z validate done=2114 checked=2113
  missing=0 quarantined=0; 06:30:46Z launched kge-B1 (10600100 free_kb, 34027028 commit_kb).
- Lane verification at 07:29Z: one guard process; `docker inspect kge-B1`: Memory 4294967296, image
  sha256:a890c548...7be3, NetworkMode none, mounts eval ro, export ro, train rw, runner string unchanged
  (`python stageB.py run --plan E1 E5 E2 E3 && python detrun.py run E4`). That one launch has finished 117 units
  (distinct stageB units done: 2,230 at 07:29Z against 2,113 at the restart) with no kill; memory 1.77 GiB of 4 GiB at
  07:29Z; highest peak_rss_mb logged under 4g so far 3,190.9.
- After a PC reset the guard is started as `sh orchestrator/start-guard-r98.sh` (or `CAP=4g sh guard-stageB.sh` from
  orchestrator), never without the cap.
- Rulings 98, 99 and 100 are copied word for word to the end of protocol-addendum section M.

## Stray empty folder train/selectB removed (ruling 103(d), C21)

- train/selectB was created at 2026-11-15T08:13:01Z (13:13:01 local; train/ changed in the same second), when the
  second ktest-b98 started. r58c/B/mounts.js line 64 (`flags`) creates every writable source, for a test call too.
  The exact call is named by agent B below once identified.
- Checked at 2026-11-15T09:37:10Z before removal: `find train/selectB` listed the folder alone (0 files, 0 subfolders). No score was in
  it and none was read. Removed with `rmdir` at 2026-11-15T09:37:10Z. train/heldout did not exist and does not.
- From the last revision on, only a real launch creates a writable source; a test creates nothing (C21).
PASS assemble-checks orchestrator/end-of-run/assemble_checks-20261115T104206Z.log tables_digest a5c5c528d2042b1d48ce68099a1c6695e29dab589ed223b1847194b9dcd1cff7
