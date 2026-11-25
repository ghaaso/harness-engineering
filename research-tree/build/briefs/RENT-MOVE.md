# Brief: move the long card work to rented GPUs, to finish today (2026-11-25)

The owner's words, in full; they outrank this brief:

> "the point is to somehow get done today before 11, if renting multiple gpus will help we will do both horizontal and vertical scaling"

Earlier today: "what if i rented a 5090 for an hour or so"; "which would get us done fastest". His standing rulings:
no card form is dropped, shrunk or weakened (r57-0080); fix an obvious, lossless fault at once and tell him after.
"Before 11" is 23:00 at UTC+5, that is **18:00 UTC on 2026-11-25**, for the round's report. It was 09:58 UTC when
this was written. On his card alone the round ends Saturday to Monday (`research-tree/build/IMPROVE-STATE.md`).

## The machine

He is renting on RunPod: one pod, template "PyTorch 2.8.0 (CUDA 12.8)", up to 6 x RTX PRO 6000 (96 GB each, 16
vCPU and about 157 GB RAM per GPU), on demand, a volume at `/workspace`, SSH on. A pod is a Linux container with
root: no Docker inside, the network is on. The exact count and the SSH line come from the top session.

## What moves, and the rules that keep the numbers right

1. **U2, all of it** (both models; it has just restarted from nothing on the 20,000-commit pairs, so nothing is
   lost): the zulip filter ranks, the sweeps, the finals with the held-out ranking files. The table fill stays
   on the PC.
2. **U3's A6, all of it** (not started on the PC: no vector exists): `a6chain.sh`'s card steps. Scoring and the
   table fill stay on the PC.
3. **U6's zulip settings.** Time one zulip setting on the pod first. If all 24 zulip settings fit before 15:00
   UTC, run all 24 there, so the whole zulip grid is on one hardware, and keep the PC's zulip results aside as the
   record. If not, run only the settings the PC has not finished and write down plainly that the zulip grid mixes
   two cards. Then the zulip finals there. Clinic and FixFlow stay on the PC with their finals (each repository's
   finals run on the hardware of its sweep, or `final.py`'s retrain check reads DIFFERENT).
4. A unit's runs that are compared with each other run on one hardware and one library build. Never resume on the
   pod a run that began on the PC, or the other way round.
5. Nothing about a job changes: batch size, input length, epochs, negatives, seeds, 4-bit settings, the staged
   sweep and its order of choices. Only where it runs and how many run at once.
6. **Held-out truth never leaves the PC.** `CR/d2/<repo>/queries.jsonl` holds it: send a copy with the truth of
   held-out queries blanked (`u1lib.load_heldout_queries` drops it at parse, so no computation changes; show that
   with one local run of a tuning-only step on the blanked copy). Scoring of held-out stays on the PC (U7).
7. Public models are downloaded on the pod from their public source, not uploaded: SweRankEmbed-Small,
   Qwen3-Embedding-0.6B, SweRankEmbed-Large and the gte modelling file A6 needs; each checked against the sha256
   of the PC's copy (`CR/FETCHED.md`). The private part is uploaded: the three repositories as U2 mounts them
   (`code/U2/run.sh` lines 16 to 19), the pairs, the D2 data files, U1's data that U2 and U3 read, U4's and U6's
   zulip inputs.
8. Nothing is sent to the pod, and no SSH connection is opened, before the top session writes "approved" below
   with the journal id of the owner's word. Until then everything is local preparation.

## Phase 0: local preparation, starts now, no outside contact

Deliverable: the folder `C:/Users/User/Documents/projects/card-run-2026-11/rent/` holding:
- `setup-pod.sh`: builds on the pod the library set of the image `d2-embed-gpu:3` (its `/opt/pip-report.json` and
  `pip freeze`), in a venv on `/workspace`. If the PC's torch build needs a newer host driver than the pod has, use
  the nearest build that runs there and write both version lists side by side into `VERSIONS.md`. It also downloads
  the public models and checks their hashes. Offline switches for the model hub once the downloads are done.
- `bundle/`: what is uploaded, as tar files with a sha256 list, built by one script that can be rerun; the blanked
  queries files; a `MANIFEST.md` naming every item and its size.
- `run_u2_pod.sh`: U2 on N GPUs. The staged sweep stays as it is: `sweep.py <tag> --stages ...` makes every choice
  itself and reads finished trials from `sweep/<tag>.json`. Read `sweep.py` to see how a trial is keyed and stored,
  then pre-run in parallel, one process per GPU slot (`CUDA_VISIBLE_DEVICES`), exactly the trials the next stage or
  stages can ask for, and let the unmodified staged call pick among them. Both models side by side. Where GPUs are
  free, pre-run the following stage for each possible winner. Show with one CPU toy test (made-up trial scores)
  that the choices equal those of the plain sequential `run_sweeps.sh`. Then the finals. One log per trial, a
  `STATUS` file a watcher can read, exit codes that stop on a failure, the allocator setting of
  `code/gatesite/sitecustomize.py` (expandable segments), no memory cap needed with one GPU per slot, and a hang
  watch (no output and an idle GPU for the time the gate uses).
- `run_a6_pod.sh` and `run_u6_zulip_pod.sh`: the same for A6 and for U6's zulip settings and finals (per-setting
  processes spread over free GPUs; U6's own resume and selection code unchanged, with the per-repository epoch
  choice of this morning's repair).
- `sync-up.sh`, `sync-back.sh` (rsync or scp over the SSH line given as an argument; results land in
  `CR/rent/from-pod/` first, then are placed where the units' scripts expect them, with a file count and hash
  check), `wipe-pod.sh` (removes every uploaded and produced file on the pod), and `RUNBOOK.md`: the commands in
  order, each on one line, for whoever holds the SSH line.

Use helpers side by side (build/Sonnet for the plain scripts, build-invariant/Opus for `run_u2_pod.sh` and its
equality test). Aim to have Phase 0 done within 40 minutes. Reply to the top session when it is done or when
something cannot be done by the deadline.

## Phase 1 to 3: after "approved" and the SSH line

1. Upload, run `setup-pod.sh`, one smoke test: a small U2 training step and its tuning score on the pod against the
   same step on the PC; say what differs and why.
2. Launch U2 (both models), A6 and U6 zulip. Tell the round's coordinator, through the state file and the top
   session, to stop the PC's U2 chain and A6 waiter once the pod runs them. The PC's card carries on with U6
   (clinic and FixFlow finals after selection), U5, and zulip until the pod's results are back.
3. Watch `STATUS`; a failed or hung trial is rerun at once. Send the top session a time for "all results back on
   the PC" as soon as one U2 trial per model has been timed.
4. `sync-back.sh`, the checks, the results placed; `wipe-pod.sh`; tell the top session, who tells the owner to end
   the rental.

If the app refuses an outbound step because the approval was relayed, stop and tell the top session: it runs that
step itself from `RUNBOOK.md`. Do not look for another way round.

## Approved

(not yet; the top session writes the journal id and the SSH line here)

## Tokens and kinds

Orchestrate: Opus. Builders as above. Every helper start carries its limit line with a measured basis and follows a
meter reading. The owner is asked for a higher counted cap for this move; until the top session writes it here,
stay inside the round's cap line in `IMPROVE-STATE.md`.
