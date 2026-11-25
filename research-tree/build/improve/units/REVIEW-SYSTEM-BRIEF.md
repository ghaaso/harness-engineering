# System review of the improvement round: brief (owner's order r57-0097, 2026-11-25)

The owner's words, in full; they outrank this brief:

> "there seem to be a lot of faults we're encountering overtime, im even thinking there are more, do a proper adversarial review"

and earlier the same morning, after a hung card job sat idle 4 h 20 min while he was asked what to do:

> "why instead of fixing it you wasted 4 hours for me, it has an obvious answe4r"

His standing rulings: no card form is dropped, shrunk or weakened (r57-0080); a cap changes the pace, never the scope.

## What this is

The round (`research-tree/build/IMPROVE-STATE.md`; its top holds his ruling r57-0076) runs card and CPU jobs for
units U2, U3, U5, U6 through job scripts and a card gate written in the last 36 hours, much of it at night and under
pressure, by helpers that no longer exist. Faults have been found one at a time, each after it had cost hours. You
are one of four reviewers. Each has one part; you do not see the others' work. Find the faults nobody has found yet,
before they cost time or put a wrong number in the owner's report.

Paths: `CR` = `C:/Users/User/Documents/projects/card-run-2026-11/`. Code: `research-tree/build/improve/code/`.
Unit briefs and reports: `research-tree/build/improve/units/`. Earlier verdicts: `research-tree/build/refute/`.

## What counts as a fault

A. A wrong result. A number in the final report (a choice made on tuning data, a held-out score, a gain with its
   interval) could be wrong or not comparable. Look for: leakage in time; held-out data or labels reaching training,
   tuning or selection; a resumed or rerun job that does not equal a straight run; a cut-short or partial file read
   as complete; a failed or missing setting skipped without a word in a selection; duplicated, missing or half-written
   per-query lines; the new arm and the baseline scored on different queries, candidates, masks or scorers; a silent
   fallback (CPU for card, a default parameter, an untrained or half-loaded model); a departure from the unit's own
   BRIEF.md that weakens the form (shorter input, smaller batch, fewer candidates) without being recorded; a fix made
   tonight (allocator setting, checkpoint by time, memory caps, requeue) that changes what is computed.
B. Lost time or work. A job that can hang, wait for ever, be skipped, run twice at once, lose or corrupt its save,
   or fill the disk; a queue that starves a job; a ledger or lock entry left behind by a kill, a crash, a Docker
   restart or a reboot; an exit code hidden by a wrapper; a watchdog that kills a healthy job or misses a hung one;
   anything that does not come back by itself after the PC restarts.
C. Cannot finish unattended. A step that waits on a helper or session that no longer exists; a script that waits on
   a file nobody writes; two scripts that wait on each other; a step whose input paths or formats do not match what
   the earlier step wrote; anything the next coordinator needs that exists only in a dead helper's transcript.

## How to work

- Read the real code, logs and outputs. A finding needs: the file and line; the scenario (what state, then what goes
  wrong); the evidence you saw yourself (a log line, a listing, a small repro); whether it has already happened and
  which outputs it touched; how likely it is in what remains. No finding from the shape of the code alone when a log
  or an output can settle it: look.
- Attack your own finding before you write it: is there a guard somewhere else? If you cannot settle it, write
  "not proven" and the one check that would settle it.
- Of each rule in the code ask: who runs it, and who notices at 3 am when it fails?
- Tonight's fixes are code like any other: review them.
- The known faults below are not findings, unless the fix is wrong or incomplete.
- Say plainly what you did not examine.

## Hard limits

- Read only. Never edit, move or delete code, logs, saves, the gate's ledger, locks or marks. Never kill, pause,
  start or requeue a job or a container of the round. Never use the card (no `--gpus`). No network.
- Never open a held-out truth or label file. List it, and grep the code for what reads it; do not print it.
- A repro runs only on copies in your own scratch folder `CR/review-2026-11-25/<your part>/`, on made-up or
  tuning-split data, each command under 2 minutes. Shell repros of the gate use a copy with its root pointed at your
  scratch folder, never the live `CR/gate`. Python runs only in a container: `docker run --rm --network none
  --cpus 2 --memory 2g` (image `d2-embed-gpu:3`), one at a time, and only where reading cannot settle a BREAKING
  candidate.
- `recovered/`, `docs/program/evidence/` and `library/journal/` are never written.
- Keep every command short; do not wait on anything; do not start helpers.

## Severity

- BREAKING: it would change a reported number, lose more than an hour of card work, or stall the round with nobody
  noticing, and it can happen in what remains, or it has already happened (then name the outputs affected).
- SERIOUS: real, but unlikely in what remains or cheap to recover from.
- NOTE: the rest, one line each.

## Output

Write `research-tree/build/refute/IMPROVE-SYSTEM-<part>.md`:
1. One verdict line: the counts by severity.
2. BREAKING findings. Each: a plain title; where (file:line); the scenario; the evidence; happened already or not,
   and what it touched; the smallest repair in one or two lines (a repair, not a redesign).
3. SERIOUS findings, the same, shorter.
4. NOTES.
5. Checked and found sound (so the reader knows what was covered).
6. Not examined.

Your reply: the verdict line, then each BREAKING and SERIOUS finding in two lines. If the app refuses the file
write, put the whole file's text in your reply instead and say so.

## Known faults (found already)

- The card cap counted PyTorch's fragmented cache; fixed 08:45 UTC by expandable segments in
  `code/gatesite/sitecustomize.py` (state file, section "Coordinator 7").
- After one out-of-memory exit a kind of job was marked as needing the whole card; marks moved aside; a helper
  (WATCHDOG, started 08:50 UTC) is changing this to the measured peak plus a margin.
- On an empty card small jobs overtook the reserved oldest waiter; fixed 08:37 UTC.
- No hang watchdog except U3's; WATCHDOG is adding one for U2, U5, U6 (may still be editing `cardgate.sh` and the
  run scripts while you read: note each file's time when you read it).
- U3's in-container wrapper turned exit 76 into exit 1 (a6-chain, 08:51 UTC; handled by hand, the wrapper itself
  not known to be repaired).
- `code/U2/run.sh` prints a stale `gpu.peak` line for jobs that do not write it.
- `code/U5/fill_tables.py` maps the held-out split to a folder `heldout`; U4's table folders are `train`, `tune`,
  `test` (state file line about U5's report; not known to be repaired).
- `fetch-models.sh` did not retry a sha failure; one shard of SweRankEmbed-Large was re-fetched twice (once by a
  dead coordinator that woke up).
- U6's `run_sweep.sh` does not rerun a setting that exited; `finish.sh` reruns missing settings, up to 3 passes.
- Two of U6's saves failed at about 17:11 UTC on 24 Nov on a full disk; recorded for a rerun.
- U6's merge and U5's fill keep off each other by marker files (`merge.running`, `fill.running`), by convention.
- For U7: B3's held-out files keep a finite seed cell to mask; float32 ties; `ltr.py` fits on training rows, so the
  stack needs its own fit on tuning; `rank.py refit` needs every extra directory to cover the training blocks.
- U3's `a4-frozen` ended with exit 137 at 00:27 UTC on 25 Nov, cause not found; rerun as `a4-frozen2`.
- An empty folder `improve/code/U3;C` exists (not explained).
- Helpers report only to the coordinator that started them; later coordinators work from transcripts.
- The other lists: every "End list" line in the state file.

## The four parts

**gate** : how jobs get the card. `code/cardgate.sh`, `code/gatesite/sitecustomize.py`, how each unit's run script
calls them (`code/U2/run.sh`, `code/U3/run.sh`, `code/U5/run_gpu.sh`, `code/U6/run_gpu.sh`), the ledger, marks and
log under `CR/gate/`, and the watchdog (read it last; `units/WATCHDOG/report.md` exists once it is in; if it is not
in when you finish, say so). Probe: the admission arithmetic against what the card really holds (the desktop
reservation is 1,100 MiB; other programs took 3.6 GB at 17:03 UTC on 24 Nov); two admissions at once; entries left
by a kill, a Docker restart or a reboot; who restarts what after a reboot; reservation and starvation; the learned
marks; the exit code map; the system-memory check; memory that spills from the card into system memory without an
error; a watchdog that kills a job during a long quiet step (a 7B model load, a long evaluation) or misses a hang;
requeue limits; the same job running twice.

**graph** : units U5 and U6. `code/U6/` (the sweep drivers, `sweep.py`, the selection, `final.py`, `finish.sh`, the
merge), `code/U5/` (the drivers, `train.py`, `fill_tables.py`, `report.py`), their outputs and logs under
`CR/improve/U5` and `CR/improve/U6`, the hand-backs in `units/U6/`, the briefs `units/U5/BRIEF.md` and
`units/U6/BRIEF.md`, and what U4 handed them (`units/U4/report.md`). Probe: resumed equals straight; saves written
whole or not at all; settings missing or failed at selection time; the two saves that failed on the full disk;
selection on tuning data only; edges, features or negatives from after the cut-off; runs of one grid made partly on
CPU and partly on the card compared as equals; processes frozen or left from the pause; the marker files; what U7
expects from them.

**text** : units U2 and U3. `code/U2/` (run and chain scripts, `trainlib.py`, `resume_test.py`, `final.py`,
`fill_table.py`), `code/U3/` (`run.sh`, `guard.sh`, `a4.py`, the a6 scripts), their outputs and logs under
`CR/improve/U2` and `CR/improve/U3`, the briefs `units/U2/BRIEF.md` and `units/U3/BRIEF.md`, and U1's tables that
they fill (`units/U1/report.md`). Probe: training pairs that hold tuning or held-out queries or labels; resume with
in-batch negatives; per-query lines after a kill (duplicates, half lines, lines from two different runs mixed, as
a4-frozen and a4-frozen2 may be); choices frozen on tuning data only; hidden exit codes; a job that cannot fit the
card even alone and is requeued for ever; every departure from the briefs (input length 256, batch, candidates) and
whether it weakens the form; the empty `code/U3;C` folder and what was meant to be written there.

**end** : the way to the final numbers, and the hand-overs. `units/U7/BRIEF.md`, `units/U1/report.md`,
`units/U4/report.md`, `refute/IMPROVE-U1.md`, `refute/IMPROVE-U4.md`, the held-out ranking files U1 and U4 wrote
under `CR/improve/U1` and `CR/improve/U4`, the card run's scorers and baselines (`research-tree/build/runbig/`,
`CR/d2`, `CR/d4`), and the state file in full. Probe: can U7 run from what is on disk, every input it names present
and in the shape it expects; is each baseline computed on the same queries, candidates and scorer as the arm set
against it; where the held-out truth lives, what code can read it, and whether "scored once" holds; how the gains'
intervals are computed and what choosing the best of many settings on tuning does to them; every process still alive
from a coordinator or helper that has ended (list them: what each will do when it wakes, and whether that can harm,
as the dead coordinator that deleted a model shard did); every step left in the state file, with who or what does
it; the keep-awake's end (26 Nov 21:00 UTC), the meter line, the token cap and the free disk against what remains.
