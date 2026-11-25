# CARD-D4 refute: verdict

**Two breaking findings, both cheap to fix. No leak across the date split, no arm sees the answer, and the tie-breaking,
metric and gate are as the README fixes them.** RotatE is trained with a step 10-40 times the authors', so its result cannot
be read as "RotatE at its published form" (B1). The AnyBURL tuning outputs on FixFlow and the clinic came from 20 s of
learning on 6 threads, while held-out and zulip will use 60 s on 8 threads, so the tuned arm is not the tested arm (B2).
Neither is likely to change the +0.02 gate; both change what the verdict may claim. The answers to the two extra
questions: extend the N3 grid by one step on tuning (yes); the fusion grid does not need it. Nothing full.sh relies on is
missing or half-written.

Refuter (opus), blind, code in `research-tree/build/runbig/card/d4/`, data and outputs in CR =
`C:/Users/User/Documents/projects/card-run-2026-11`. CPU only, network off, no training runs. Scratch: `CR/refute-d4/`.

## Breaking findings

**B1. RotatE is not at its published form: the Adam step is 10-40 times the authors' relative step.**
- Where: `kge.py:119` (`torch.optim.Adam(m.params(), lr=1e-3)`), with the authors' initialisation at `kge.py:70-73`
  (range = (gamma + 2)/d; relation phase = R / (range/pi)).
- Failure: one Adam step of 1e-3 moves a relation phase by about 1e-3 * pi / range, which is 0.15 rad at d = 512 and 0.57 rad
  at d = 2000 [computed]. The authors' FB15k-237 setting (gamma 9, alpha 1, 256 negatives, batch 1024, d 1000, lr 5e-5,
  100,000 steps) gives about 0.014 rad [lr from memory of the authors' best_config.sh, not checked against the source
  here; the recorded research does not hold it]. The measured signs match a step that is too large, whatever the exact
  published value: the best epoch was the first check (epoch 5) in 8 of 9 RotatE selections, and the selection MRR falls
  steeply as d grows (zulip 0.169 / 0.128 / 0.050 at d 512 / 1000 / 2000; FixFlow pairs 0.592 / 0.556 / 0.480). This
  matches the relative step growing with d. So d = 512 is also chosen at the lowest edge of its grid, probably for the same
  reason. A RotatE result from this code cannot support "identity KG embeddings closed at their published settings"
  (TRACK-PLAN 3.6, "Changes next") for RotatE.
- Effect on the gate: probably none. ComplEx-N3, at a higher selection MRR, is already 0.065 (FixFlow) and 0.039 (the
  clinic) P@10 below the best untrained arm on tuning. The effect is on the claim.
- Smallest fix: set the published learning rate (5e-5; 1e-4 is the authors' value on FB15k and WN18) with enough epochs
  for it. Re-run only the RotatE part of the selection on FixFlow first: seconds to minutes on the card at d 512, then
  zulip. The other route is to drop RotatE from the closure wording and close only ComplEx-N3 and AnyBURL.

**B2. The AnyBURL arm used for tuning on FixFlow and the clinic is not the one held-out will use.**
- Where: `full.sh:14,27` call `burl_all.sh ... 60 8 8`. The 16 existing tune directories
  `CR/d4/out/anyburl/{fixflow,clinic}/{pairs,triples}/{0..3}` were learned at 20 s on 6 threads (`cfg.json`, `rules-20`)
  and carry `done`, so `anyburl.sh:83` skips them. `anyburl.py prep` (line 38-43) then overwrites their `cfg.json` and
  properties with 60 s, and `anyburl.py score` (line 51-54) falls back to the old `predictions` file.
- Failure: the tuning P@10 of `burl:*`, the triples-against-pairs record and the pooled fusion weight are computed from a
  20-s / 6-thread AnyBURL on two repositories. The held-out blocks, and zulip's tuning blocks, get 60 s and 8 threads. The
  setting is not frozen across the split ("Held-out is scored once, with every choice frozen from tuning"), and the files
  will afterwards say 60 s for runs that took 20 s. The size of the effect is not measured; with 84k-246k rules already
  at 20 s it is probably small.
- Smallest fix: before `full.sh`, delete the `done` files (or the directories) of those 16 tune blocks so they are
  relearned at 60 s / 8 threads. That is about 16 x 35-65 s of CPU, with no card.

## The two extra questions

**1. Grid edges.**
- **N3 weight: yes, extend one step down (0.025; then 0.01 only if 0.025 wins), ComplEx only, on the selection block,
  before the held-out run.** By its own criterion the selection is still rising steeply at the edge. From 0.1 to 0.05 the
  filtered MRR rises by +0.044 to +0.050 (clinic), +0.071 to +0.083 (FixFlow) and +0.061 to +0.063 (zulip),
  at every d, in all five distinct selections. So the chosen setting is not shown to be the best form on this data. The
  cost is about 3 x 5 min of card for zulip pairs and seconds for FixFlow and the clinic; zulip triples is selected later
  by full.sh anyway. There is no leak: the selection uses hidden pairs inside the first tuning block's history. It will
  probably not move the gate: ComplEx's top ten are already 98.5 % known partners against a maximum of 98.8 % (probe
  below), and its facts carry no counts. But it decides whether the verdict may say "at its best setting" or only "at the
  published 0.05-0.1, with weaker regularisation favoured and untested" (the earlier test's weaker weights were a
  different pipeline: EC s6 item 9).
  Trap when doing it: `kge_run.py:262` skips any existing `.npy` whatever config made it, and `full.sh:12` skips selection
  once `_chosen` exists. So remove `_chosen` from the `select-*.json` files and delete the ComplEx tune `.npy` files of
  every repository and form whose choice changes. Otherwise the old matrices are reused silently.
- **Fusion weight: no extension needed for the gate.** With w = 0 the fused arm is exactly the best untrained arm, so a
  lower weight can only pull the fused gain toward 0; it cannot produce +0.02. Measured on FixFlow + clinic tuning
  (`CR/refute-d4/probe.py`), the pooled mean over the three learned arms at w = 0 / 0.0625 / 0.125 / 0.25 / 0.5 is
  0.1642 / 0.1647 / 0.1647 / 0.1654 / 0.1621 for triples (pairs: 0.1642 / 0.1645 / 0.1646 / 0.1657 / 0.1620). So 0.25 is an
  interior maximum once the grid is extended. Zulip will be 200 of about 277 pooled tuning commits; adding 0.125 to
  `WEIGHTS` (`evaluate.py:9`) costs seconds and removes the edge question. It is optional.

**2. The stopped background jobs: nothing full.sh relies on is missing or half-written.**
- Zulip slice. `select-zulip-pairs.json` holds all 9 grid entries plus `_chosen` (complex-2000-0.05, rotate-512). Both
  `kge/zulip/pairs/{complex,rotate}/{0,1}.npy` load and have the block's (tasks, files) shape. The slice ended on its
  own at 00:36 UTC (block 1 done; the stride job, waiting on the card lock, started at 00:44). full.sh resumes at zulip block 2. No
  zulip AnyBURL directory exists, so none is half-prepared.
- Stride job. It wrote only `kge/{fixflow,clinic}-s{1,10}` and their `select-*` files. The clinic-s10 block 3 finished
  (both kinds, 00:59:52 and 00:59:58); then the job stopped before `stride.py`, so no `stride-*.json` exists and zulip-s1
  and zulip-s10 never ran. full.sh does not read any of these (the block size is fixed in extract.mjs).
- Checks: all 220 `.npy` under `CR/d4/out` load, all values are finite, and the shapes match their blocks
  (`CR/refute-d4/npycheck.py`). All 16 AnyBURL directories with `done` have a `predictions` file. No `CR/GPU.lock` is
  left, and no D4 container is running.

## What was checked and held
- **Date split.** History is strictly before the block's first task: the assertion at `d4lib.py:70` and test 1 hold. The
  import snapshot `commits[hend-1]` has no ancestor at or after the cutoff in any of 55 blocks (`CR/refute-d4/anc.mjs`).
  Tuning comes entirely before held-out. Rebased or cherry-picked duplicates: none in FixFlow or the clinic; zulip has 43
  duplicate (author time, author, subject) groups, and none puts a task commit's twin into its history.
- **Data.** Re-running the current `extract.mjs` gives byte-identical data for all three repositories (`CR/refute-d4/x/`).
- **No arm sees the answer.** Co-change, decay, 1/|e|, text, PPR, the KGE graph and the AnyBURL graph are built from
  `commits[:hend]` and the cutoff snapshot only. AnyBURL's queries carry only the seed (`seed co_b seed`), and the renamed
  head relation filters nothing.
- **Ties.** The key is fixed per (sha, seed, 7) (`d4lib.py:98`) and shared by every arm, by fusion's rank step and by
  scoring. AnyBURL's own list order against the saved scores plus random ties differs by at most 0.003 P@10, and float32
  storage costs at most 0.0005 (`CR/refute-d4/burlorder.py`).
- **Metric and gate.** P@10 = hits/10, recall = hits/|truth|, each averaged per commit. The bootstrap is paired over
  commits with 10,000 resamples. "adds" requires a point gain of at least 0.02 and a lower end above 0. The held-out code
  path (`evaluate.py test`) was run on tuning blocks through a patched copy (`CR/refute-d4/evaluate_tuneastest.py`); it runs,
  and the per-repository and pooled rows are as specified. Held-out was not run or looked at.
- `dpy.sh test_d4.py` passes. `dpy.sh evaluate.py tune fixflow clinic` reproduces `choices.json` exactly: PC best on
  FixFlow (0.2117), RRF on the clinic (0.1166), triples chosen (ComplEx 0.1473 against 0.1305), weight 0.25.

## Non-breaking findings
1. The learned arms see co-change as binary facts (count >= 1, `kge.py:17`); pair counting uses counts. Their top ten are
   already almost all known partners (FixFlow 98.5-98.8 %, clinic 92.7-93.2 %, the maximum possible being 98.8 % and
   93.2 %), so they lose on order within the known partners. The verdict should say that the forms tested receive no
   counts.
2. `anyburl.sh:92` touches `done` even when Java fails, and `anyburl.py:55` then saves an all-zero matrix, which is a
   silent random arm. `anyburl.py:53-54` takes the first `os.listdir` entry starting with "predictions", which could be
   `predictions_plog`; it works today. Make both fail loudly.
3. `kge_run.py:262` reuses any existing `.npy` file whatever config made it (see question 1).
4. FixFlow was extracted from the checked-out branch `docs/orchestration-design-2026-10` (903787e, 429 commits; main has
   264, and 177 commits are on this branch only), not main, which D2 uses (its fix B1). Zulip's sha is pinned; FixFlow's is
   not recorded. Record 903787e.
5. The candidates for "best untrained" include RRF, a baseline in the plan, not an untrained history form. It wins on the
   clinic by 0.0008 over INV7 on 34 commits. This raises the bar slightly; it is conservative.
6. The pooled gate is about 82 % zulip (500 of 611 held-out commits); FixFlow has 55 held-out commits and the clinic 56,
   so per-repository intervals will be wide. Six learned or fused arms are judged in four scopes with no multiplicity
   control; report each arm, not the best of them.
7. The filtered MRR (`kge.py:192-194`) filters only training facts, not the other hidden pairs. The bias is the same for
   every config.
8. `test_d4.py` tests 3 (`or True`) and 7 (`raw <= facts | raw`) are partly always true; "an arm that sees the answer is
   caught" is not really tested.
9. Pre-test 1 shows "room" on all three repositories (9, 45 and 11 points against a bar of 5). By the README the GraIL
   condition is therefore met, and the owner is to be told of its missing licence. There is no GraIL step in full.sh,
   as the README intends.
10. `extract.mjs:12` also excludes `dist/`, `build/` and `.git/`, which the README does not list.
