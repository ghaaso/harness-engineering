# Brief: a critical review of the round's models, and what bigger rented cards allow (2026-11-25)

The owner's words, in full; they outrank this brief:

> "before we do that i think since we will maybe have a lot of vram in this rented gpus idle we can expand our scope as well i suppose so a critical review of what we're doing and how we can do better with our models, make the architectures better more optimized and maybe even bigger i suppose take a look into that possibility"

His ruling behind the round (r57-0076, at the top of `research-tree/build/IMPROVE-STATE.md`): considerable,
measurable improvements over the simple baselines before the pilot; be bolder; try new things. His rules for how an
idea is tested: the strongest form of it, like with like, scoring defined first; one null is not a verdict on a
family; no card form is dropped, shrunk or weakened (r57-0080).

## The situation

The round's arms were chosen for a 12 GB card (`research-tree/build/improve/CANDIDATES.md`: 18 forms ranked, 8
chosen). He is about to rent cards with 96 GB each (most likely two RTX PRO 6000; each about three times his card's
speed per job). Their move is planned in `research-tree/build/briefs/RENT-MOVE.md`. Spare card memory is not spare
compute: the planned jobs already keep the cards busy, so every added form costs GPU-hours and his credit, which
now covers about eight hours of two cards against about six for the planned move.

Results so far, tuning data only (held-out is scored once, at the end): the learned text ranker (U1) finds the
right file in its top ten for about 92 % of reports against 71 % for keyword search; the 7B listwise reranker (U3,
A4, at 4-bit) is level with it; the co-change ranker (U4) gains +0.013 P@10, under the +0.02 line; the graph
network (U5) is level with U4; the time-aware models (U6) were under the baseline, with a faulty selection since
repaired; the fine-tuned retrievers (U2) have not run on the full data. This morning's review of the running
system: `research-tree/build/refute/IMPROVE-SYSTEM-*.md`.

## What to deliver

`research-tree/build/improve/EXPAND-2026-11-25.md`, and a reply of at most fifteen lines with the ranked list.

1. **A critical reading of each arm** (U1 to U7; briefs and reports under `improve/units/`, code under
   `improve/code/`): what the 12 GB card or the clock forced on it, with the line that shows it (4-bit loading,
   input length, batch size and negatives of the contrastive training, the reranker's window and candidate count,
   hidden sizes, neighbours, sequence lengths, epochs, seeds); and what its results say about where the headroom
   is. Be plain where a bigger model is unlikely to help because the limit is the signal or the data, not the
   capacity.
2. **The forms a 96 GB card allows:** better, more optimised, or bigger. Take them from the record first
   (`CANDIDATES.md`, including the forms it ranked and did not choose and why; `improve/DOWNLOADS-IMPROVE.md` and
   `CR/FETCHED.md` for what is already on disk, its size and its licence; the library's records). For each: what it
   is in one line; the expected gain and its basis (a record id, or the source `CANDIDATES.md` cites; if it rests
   on reasoning alone, write "hypothesis"); GPU-hours on an RTX PRO 6000, computed from times measured in this
   round and scaled, with the sum shown; card memory; downloads still needed (source, size, licence; unknown means
   "to collect", not a guess); what it does to comparability (a new form is a new arm with its own tuning choice
   and held-out files, never a change inside a running grid; say what it adds to the choice of the best among
   many); what could go wrong.
3. **Lossless speed-ups** of the arms as they are (same numbers, fewer GPU-hours), separately: only those you can
   show change no result.
4. **The ranking:** by expected gain per GPU-hour, a short list of at most five to put to the owner, each with its
   GPU-hours and what it needs from him (a download, credit). Say which popular ideas are not worth it here, and
   why. Say what stays untested.

## Limits

Read only. No download, no install, no web search, no job started or touched, nothing sent anywhere. Never open a
held-out truth file. No project name, path or code leaves this machine. Work from the files, not from memory of
them. About thirty minutes; do not start helpers.
