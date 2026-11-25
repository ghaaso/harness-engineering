# Top session: the system review of 2026-11-25 and what follows (hand-over, written at the window line)

Written by the owner's top session (id 7a07b86e-d52e-4da4-bd24-68ac48d870a3; Fable since about 08:50 UTC) at
about 09:25 UTC on 2026-11-25, when the window ceiling hook stopped its calls. For this session after a compaction,
or for a fresh top session.

## The owner's words (they outrank this file)

- "there seem to be a lot of faults we're encountering overtime, im even thinking there are more, do a proper
  adversarial review" (recorded r57-0097).
- "why instead of fixing it you wasted 4 hours for me, it has an obvious answe4r" (a hung card job sat 4 h 20 min
  while he was asked): fix an obvious, lossless fault in our own run at once and tell him after. Memory file
  `feedback-fix-obvious-faults-dont-ask.md`.

## The review: done

Brief `research-tree/build/improve/units/REVIEW-SYSTEM-BRIEF.md`. Four blind Opus refuters, one part each, read
only. Verdicts: `research-tree/build/refute/IMPROVE-SYSTEM-gate.md`, `-graph.md`, `-text.md`, `-end.md`. Tokens:
about 0.8 M by the app's count for the four (limit 18.5 M each).

Seven breaking findings, each confirmed by this session against code and files:
1. U2 trains on weakened data: `code/U2/mkpairs.py:19` ZCAP = 2500 against the brief's 20,000 zulip training
   commits (a breach of r57-0080, recorded nowhere). U2 held at 09:13 UTC.
2. `run.sh gpu` of U2 and U3 always exits 0: failed stages pass; final.py can freeze an unfinished sweep.
3. U1's `table/tune.csv.gz` and `table/heldout.csv.gz` are plain CSV under a .gz name since 02:48 UTC (U3's fill
   wrote a `.tmp` name without compression); every later reader fails.
4. A6 holds about 3.5 GiB of card memory in rotary tables it never uses (`code/U3/embedlib.py:87`), hence its
   out-of-memory exits and whole-card wait.
5. U6's selection can only pick epoch 2 (`code/U6/select_cfg.py:20,50`: clinic and FixFlow are scored at epochs
   2,5,10,20,40,70,100, zulip at 1,2,3,4,6,8).
6. `code/U6/merge.py:49-50` and `code/U5/fill_tables.py:43-44` read their gzip temp file back without compression:
   both stop on their first table.
7. The gate (`code/cardgate.sh:232`): a job that needs the card alone is refused while other programs leave under
   8,864 MiB free; it stays reserved, backfill is refused on an empty card, nothing is logged, the card idles.

Items 1 to 6 and U3's guard (kills only its wrapper shell) went to REPAIR, an Opus helper of coordinator 7
(session 47ff9697), started 09:15 UTC; its transcript is named in `IMPROVE-STATE.md`. Item 7 and the serious
findings worth acting on went to coordinator 8 in its brief.

Also found: the hangs are graphics driver resets. Windows System log, provider nvlddmkm, event 153 ("Error occurred
on GPUID: 100") at 13:55:15 and 15:02:45 UTC on 24 Nov and at 00:19:14 and 04:02:48 UTC on 25 Nov, all after the
Studio driver went in at about 13:38 UTC on 24 Nov. 00:19 matches U3's a4-frozen exit 137; 04:02 matches the U6
hang. The cause is open; the watchdog (in since 09:09 UTC) recovers within about 20 min.

One "known fault" is not a fault: `code/U5/fill_tables.py`'s `heldout` folder mapping is right; the step that
told a helper to change it is struck.

## What runs

- Coordinator 8: an Opus helper of this session (Agent tool, agent id a3de0d847b4388496), started about 09:20 UTC,
  not a child session, so that a hand-over needs no click by the owner. Its replies come to this session; lines
  marked "For the owner:" are relayed in plain words. At its window line it writes its hand-over into
  `IMPROVE-STATE.md` and says "hand over"; this session then starts coordinator 9 the same way (description
  "orchestrate: improvement round, coordinator 9", general-purpose, model opus, a token limit line with basis
  r57-0173, after a meter reading).
- Its order: check REPAIR's seven repairs; repair item 7; act on the serious findings that can cost more than an
  hour (the watchdog killing a quiet healthy job; a watch on event 153; one restart script for after a reboot;
  an owner for U3's remaining work; U5's folds declaring their measured need); list the rest; send a new finish
  time and the count of tokens the end steps need; carry the round to its end.
- Keep-awake: a script of this session, pid 52496, holds the PC awake until 2026-11-26 21:00 UTC
  (`C:\Users\User\AppData\Local\Temp\claude\29140a92c6ee6732\7a07b86e-d52e-4da4-bd24-68ac48d870a3\scratchpad\keep-awake.ps1`,
  parameter -UntilUtc). U2's rebuilt data adds card hours: when the new finish time comes, start a second copy
  that ends after the latest time. The owner approved holding it awake until the round ends.

## Open with the owner

1. The review's results were given to him in chat. A page (CLAUDE.md rule 6) is not built: one screen, the seven
   faults by kind (wrong number; last steps stopped; card idle), a state mark each, the driver resets, what was
   found sound (read section 5 of the four verdict files).
2. The new finish time, once coordinator 8 has measured U2 on the full data.
3. The meter: 74 % at about 09:15 UTC, line 85 % (r57-0091). The end steps all need new helpers and the round
   needs only a point or two, but his other work may pass the line first. When coordinator 8 has counted the end
   steps' tokens, put one "cap:" question to him with that figure.
4. The driver resets: tell him the cause is open; a change to a system or driver setting is his to approve.
5. The disk session (local_a774799d) waits on him: the Docker disk only after the round ends.

## A trap this session fell into

The window ceiling hook treats a session as a coordinator, with the lower hand-over line, when a .md file directly
in `research-tree/build/` has one line holding both "session <first 8 characters of its id>" and "kind
orchestrate". Coordinator 8's line in `IMPROVE-STATE.md` ("coordinator 8, helper of the top session 7a07b86e, kind
orchestrate, Opus"), written as this session's brief asked, matches. The hook then put this session's line at
227 K with its context at 303 K. Do not reword that line to get round the hook: this session does coordinate, and
its window was large. A compaction (the owner types /compact) brings it under the line. In later briefs, do not ask
a helper to write this session's id and "kind orchestrate" on one line.

## The owner's ruling on this session's window (2026-11-25, about 09:15 UTC; recorded r57-0098 by the guard-change session)

His words: "we'll do compaction at 500k tokens since ur fable ur quality is not likely to decrease since its good
for long horizon tasks". So: this session, on Fable, compacts at 500 K of context, not earlier.

Not in force yet: when he said it the window ceiling hook already held this session at a coordinator's line of
about 230 K (context about 340 K), and it refuses every call but hand-over notes, the journal tool's Bash call
included. First steps once calls pass again (after one compaction): record the ruling through the journal tool
(status owner; see r57-0008, r57-0056, r57-0035); then make the hook follow it, in the open and with one line to
him after: read `.claude/hooks/window-ceiling.mjs` for how a coordinator is named and how its line is set, and
either give the hook a ruled line for a session named in an owner record, or word coordinator 8's line in
`IMPROVE-STATE.md` so that it names coordinator 8 and not this session as the coordinator; then hold this session
to 500 K. This replaces the sentence below that says not to reword that line: his ruling came after it.

## The owner's ruling on the round's cap (2026-11-25, about 09:20 UTC; recorded r57-0099)

Asked "cap: raise the round's counted token limit from 405 M to 480 M?", he chose: "Raise to 480 M". Why it was
asked: since coordinator 8 runs as a helper of this session and `IMPROVE-STATE.md` names this session, the fan-out
gate counts this session's whole folder (about 106 M, the four reviewers and the top session's own work included)
against the round's cap: 359 M counted, about 254 M of it the round itself; the end steps need about 52 M more.
The 480 M is on the gate's count; the round's real spend is expected near 310 M.

To do as soon as calls pass: record it through the journal tool (kind ruling, status owner, quote "Raise to
480 M", supersedes r57-0077's figure, see r57-0077); tell coordinator 8 (agent a3de0d847b4388496) the record id so
that it writes the state file's new cap line, "Cap 480 M tokens (<id>)", and starts its blocked helpers.

## The guard change (asked by the owner 2026-11-25)

His words: "modify that guard such that it doesnt do these problems for fable specifically only for opus on the
other models". Being done by the child session local_f364d9ec-5420-4845-9823-84226188b4ab from the brief
`research-tree/build/briefs/WINDOW-CEILING-FABLE.md`: a Fable transcript gets one hard line at 500 K in
`.claude/hooks/window-ceiling.mjs`; other models unchanged. Until its note arrives this session stays locked.

## After a compaction: read in this order

`library/INDEX.md`; this file; the last sections of `research-tree/build/IMPROVE-STATE.md` (coordinator 7's two
hand-overs and coordinator 8's lines); then the four verdict files only where a finding is in question.

## His rulings in force

r57-0076 (bolder, measurable improvements before the pilot; the pilot stays on hold); r57-0077 (cap 405 M tokens);
r57-0080 (no card form dropped, shrunk or weakened); r57-0091 (meter stop line 85 %); r57-0092 (card jobs side by
side as far as memory allows); r57-0097 (this review). How he is written to: plain words, the answer first, few
numbers, no record ids, paths or internal labels; questions only as approve:, cap: or fact:; results as a
one-screen page. He is at UTC+5.

## How the hooks behave (learned in this session)

- Window ceiling: past the line only hand-over calls pass (a STATE file, a brief, the journal, a commit).
- Creep gate: a review start passes with a prompt line "owner: r57-NNNN" naming an owner record; name the code path
  first in the prompt, never the review's own output; never the word "fold" in a prompt.
- Fan-out gate: a prompt line "token limit L M (expected about E M, basis <a measured record>)"; a get_usage reading
  in an earlier message, after the last wave of starts and no older than 26 min.
- Tier hook: the description starts with the kind and a colon; the model is passed explicitly (refute, analyse,
  orchestrate, build-invariant: opus).
- Journal: only `node tools/journal.mjs <file> --prefix r57`, a dry run first, then `--append`.
- Owner-report check: a message to him with record ids, paths or many figures is sent back once for a rewrite.

## Results so far, in plain words (tuning data only; held-out not scored)

The learned text ranker finds the right file in its top ten for about 92 % of reports against 71 % for keyword
search (checked, no faults). The co-change ranker gains a little, below the bar. The 7B model's re-ordering is
level with the text ranker. The graph network is level with the co-change ranker. The time-aware graph models
were below the baseline, but their selection was faulty (finding 5), so that is not a verdict. The search-model
training starts again on the full data (finding 1). Last finish time sent to him: Thursday 26 Nov about 07:30 UTC
(range 01:00 to 16:00), before the full-data rebuild; a later one is due from coordinator 8.

## What a summary may drop

The six earlier coordinators' turn-by-turn notes; the pause and the 3-hour card memory reservation (done); the
disk clean-up (done, about 43 GB free; the Docker disk waits for the round's end); the crash diagnosis beyond "the
graphics driver; Studio driver in since 24 Nov about 13:38 UTC"; the question about NVIDIA's serving tools (not
useful for this work now); raw tool outputs, listings, code excerpts and hook source.

## To save as memory once a hand-over has worked without a click

Coordinators as helpers of the top session (Agent tool, Opus, "orchestrate:"), the top session on Fable: a
hand-over then needs no card click, which cost hours on 24 and 25 Nov. The limit is the top session's own window.

## After the unlock (2026-11-25, 09:32 UTC by the clock)

- The guard change is in (r57-0098): this session passes again; its line is 500 K.

- The review page is published: https://claude.ai/artifact/2pJ8ey8LcS7B4nDMZ9whbZ ; its file is `improve/review-page/system-review.html`; republish the same file when a repair state changes (faults 1, 3 and 5 were "in repair" at the first publish).

- Disk: 19 GB free at 09:30 UTC; coordinator 8 was told to sum the remaining writes against it and to free our own re-creatable files first; an approve: to the owner about his own files only on a shortfall.

- Memory saved: `reference-helper-coordinators.md`.

## The rented-GPU move (2026-11-25, from about 10:00 UTC)

- The owner wants the round done today before 23:00 his time (18:00 UTC): "the point is to somehow get done today before 11, if renting multiple gpus will help we will do both horizontal and vertical scaling". He is renting on RunPod (advised: one pod, 6 x RTX PRO 6000 96 GB, PyTorch 2.8 template, on demand, 200 GB volume, SSH on).

- Brief: `briefs/RENT-MOVE.md`. Lead: an Opus helper of this session (agent a7117b31b288543c6), doing Phase 0 (local preparation in `CR/rent/`, no outside contact), aim 11:00 UTC. It moves U2 (all), U3 A6 (all) and U6 zulip settings; rules in the brief (whole units per hardware, held-out truth stays on the PC, no job changed).

- NOT yet given by the owner (asked 10:05 UTC, he answered with a wish to discuss the plan first): (1) his yes to copy the three repositories code and the data to the pod, install there, download the public models there; (2) his yes to create an SSH key on the PC; (3) cap: counted cap from 480 M to 650 M (the fan-out gate counted 422 M at 10:05 and lets the lead start only two of four builders). Nothing is sent and no key is made before his yes. After his yes: record each through the journal tool (from his own message), write the id and the SSH line into the brief section "Approved", write the new cap line in IMPROVE-STATE.md, message the lead and coordinator 8.

- Outbound steps (upload, SSH): if the app refuses the lead because the approval was relayed, the top session runs them itself from `CR/rent/RUNBOOK.md`.

- This session stood at about 455 K of its 500 K line at 10:05 UTC: ask the owner to compact right after his go.

## State at the 500 K line (read the clock line above this heading for the time)

- The owner, new request, verbatim: "before we do that i think since we will maybe have a lot of vram in this rented gpus idle we can expand our scope as well i suppose so a critical review of what we're doing and how we can do better with our models, make the architectures better more optimized and maybe even bigger i suppose take a look into that possibility". "Before we do that" = before deploying the rented machine.

- To do first after the compaction: one analysis helper (analyse/Opus, after a meter reading; limit line with a measured basis). Inputs: `improve/CANDIDATES.md` (18 forms ranked, 8 chosen for a 12 GB card), the units' briefs and reports, the four review verdicts, `briefs/RENT-MOVE.md`. Output `improve/EXPAND-2026-11-25.md`: what the 12 GB card forced on each arm (4-bit 7B models, input length 256, batch size of the contrastive training, model sizes, graph model widths and sequence lengths), which bigger or better forms a 96 GB card allows, each ranked by expected gain per GPU-hour with its basis in the record or the literature, its GPU-hours on an RTX PRO 6000, its downloads (source, size, licence) and what it does to comparability (a new form is a new arm with its own tuning and held-out files, never a change inside a running grid). Spare card memory is not spare compute: every added form costs GPU-hours and his credit. Then show him the short list as a page and ask approve: per form and for the credit.

- RunPod: nothing deployed. RTX 5090 and 4090 not available in number; advised two RTX PRO 6000 (96 GB each; his balance of 43 dollars covers about 8 hours of two; the base move needs about 6). He asked for instructions in the RunPod site and has them; he has no SSH key yet (three commands given to him to run himself).

- Still not given by him: the yes to copy the repositories code to the pod; the counted cap 650 M. Phase 0 of the move is done: `CR/rent/RUNBOOK.md` (GPU lists are arguments; with two cards the lead must re-plan the slots). The lead (agent a7117b31b288543c6) has ended its turn; resume it with SendMessage.

- Coordinator 8 (agent a3de0d847b4388496) keeps the PC jobs running; its context was about 290 K at 10:10 UTC, so its hand-over is near: start coordinator 9 the same way when it says "hand over".

## Scope widened by the owner (2026-11-25, 10:57 UTC by the clock)

- The no-compaction ruling is r58-0001; the window ceiling (version 3) holds a Fable session only at the compaction cap, about 897 K. r57 ruling numbers are used up: new owner rulings go under prefix r58.

- `improve/EXPAND-2026-11-25.md` (what 96 GB cards allow; page https://claude.ai/artifact/9wCWQKU3XmrE7MsEpvbHV7): five options ranked; he was asked for the scope of the rented run and answered with a wider request.

- His wider request is quoted in full in `briefs/APPROACHES-REVIEW.md`: a plateau across sizes is an architecture question; evaluate different approaches, pipelines of specialised components, graph plus language model designs, TGN and the other graph models; big model first, then smaller. An analyse/Opus helper (agent af04620a5be117e95) writes `improve/APPROACHES-2026-11-25.md` (about forty minutes). Then: show him the designs and the short list as a page; nothing is rented or built before his word.

- RunPod: still nothing deployed; advised two RTX PRO 6000; the move is prepared in `CR/rent/`; his yes to copying the code and the counted cap of 650 M are still not given.

## The two quick tests (started 11:11 UTC on 2026-11-25, by the clock)

- The owner approved them: r58-0002 ("Yes, run them"); counted cap 650 M: r58-0003. Brief `briefs/QUICK-TESTS.md`; survey `improve/APPROACHES-2026-11-25.md`; page https://claude.ai/artifact/TAtJ9zNpF8Gvc4BLenMLof .

- T1 (plateau tests; agent a910f9bed1a14ec3e) and the T2 probe (the seed change content as a feature; agent aa0ca731ca8a6b56a): Opus builders, helpers of the top session, about three hours, on his PC, tuning data only. Reports to `improve/units/T1/report.md` and `T2/report.md`.

- The rental is on hold (nothing deployed; his balance kept for the judge model of design A). Coordinator 8 was told at the same time: PC only; U2 two chains side by side allowed again.

- When both report: read the numbers against the claim "the limit is the signal", show him the result as one page (what it says for designs A, B and C, and what to build next), and ask his word for the next build.

## The two quick tests: results (12:02 UTC on 2026-11-25, by the clock)

- T2 probe (`improve/units/T2/report.md`): the seed change content as one keyword feature lifts B2 on tuning from 0.138 to 0.153 pooled P@10 (+0.015 [+0.010, +0.021]); against the best untrained arm +0.029 [+0.023, +0.035], the first D4 arm over the +0.02 line (in-sample, a changed task: the edit is known; the same content given to the untrained baseline gives +0.019). Recall@10 of truth files with no earlier co-change: 0.225 against 0.106. Mainly zulip.

- T1 (`improve/units/T1/report.md`, saved by the top session from its reply): ceiling 0.263 pooled, counting 0.124, B2 0.138; U5 as built 0.131, its counts without the graph 0.129 (within seed noise), the graph without the counts 0.107 (below counting); hard negatives hurt. Inside history a perfect order would give about 0.198.

- Page: https://claude.ai/artifact/WdRTUrvaS3WC3h2LmZdvqR ("Quick Tests 25 Nov"); file `improve/review-page/quick-tests.html`.

- Derived build order, shown to him: design B (information: the edit in full, parsed code structure) first, then design A (the judge reading that evidence, with a checker), then the small student; design C router inside B. Asked: his word to add "B2 told what the edit was" to this round as its own arm with held-out files (not scored before U7), and to start building design B (a cap for it; tree-sitter: source, size and licence to collect before asking for the download).

## The graph transformer question (2026-11-25, 13:45 UTC by the clock)

- The owner asked (r58-0006; his words in full in `briefs/GRAPH-TRANSFORMER-QUESTION.md`, with what his lecture deck says): the end goal and the benefit; whether a relational graph transformer should be tested on rented GPUs; whether our weak graph results come from known failure modes (over-squashing among them); data need and data quality; whether good results could be cheated; use published findings instead of re-running.
- Started 13:45 UTC, helpers of the top session, all read only: two collect/Sonnet (outputs `improve/lit/GT-LIT-1.md`, `GT-LIT-2.md`; agents a8e1a6fe6f474a128, a32c87686c4f5f8ca) and one analyse/Opus (`improve/FAILURE-MODES-2026-11-25.md`; agent a895516257cdd4f04). The record book held nothing on graph transformers, over-squashing, link-prediction limits or temporal baselines.
- He was given at once: the goal, the two baselines, where each stands, and that the benefit inside an agent is not measured yet (the survey's R12). First read sent as unconfirmed: over-squashing unlikely (truth one or two hops away; the graph network best at one layer, `CR/improve/U5/choice.json`); the limit hit is node-wise vectors against pair facts; a relational graph transformer fits as the model inside design B, not on today's inputs; two repositories too small.
- To do when the three return: write `improve/GRAPH-TRANSFORMER-ANSWER-2026-11-25.md`, the page `improve/review-page/graph-transformers.html`, the short answer. Meter 80 % all models at 13:42 UTC (stop line 85 %, reset 2026-11-30 12:00 UTC): say what still fits before the line when proposing a build.
- Coordinator 8 was asked at 13:45 UTC for a six-line status by SendMessage (its context was 322 K).
- Coordinator 8's status of 13:45 UTC (by SendMessage): card full (U2's two chains side by side); round finish on the PC likely Friday 27 Nov about 02:00 UTC, range Thursday 26 Nov 14:00 to Friday 27 Nov 18:00 UTC, firm after Qwen3's first 50 steps; C: 27 GB free, low point 8-12 GB expected at U6's finals and the end of U2 unless the owner frees space; no NaN, no "DIFFERENT" check, no driver reset since the overclock; its context 332 K, no hand-over yet. Relayed to the owner.
