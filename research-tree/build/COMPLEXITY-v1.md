# COMPLEXITY: where the pilot's tokens and hours go, and the shortest checked path to the eight lanes

Helper of top session 3 (kind analyse, Opus), 2026-11-20, from the brief `research-tree/build/briefs/COMPLEXITY.md`.
Read only; nothing started. Marks: [m] measured, [r] read, [c] computed (formula or script shown), [e] estimate.
Tokens = input + cache creation + cache read + output, once per message id (the rule of
`research-tree/build/tools/tokens-self.mjs`). Scripts: `<session scratchpad>/complexity/` (`round3.mjs` counts round 3
from its transcripts, `top3.mjs` its top session, `calc.mjs` everything below). Points: all-models weekly meter at
62 M a point (59-66 M, r57-0170). The direction's budget, 10 % of a week (direction s7) = 10 points = **620 M**
(590-660). One build, one round, one week: a basis, not a law (r57-0015, r57-0028).

## 0. The answer

1. Yes, it can be cut a lot. Of the pilot's 418 M tokens only **63 M (15 %) is research on the field**; the rest runs
   and tests the tree itself: its two comparisons 154 M, coordination 115 M, the model fix 48 M, design checks 39 M.
2. The 8.5-13.8 h rests on a counting error: round 3's "4.8-5.3 h" research sessions include a **4.3 h stop for a
   PC restart** [m]. Reading and checking one field took **1.2-1.8 h**; round 3 ran four fields at once in 2.4 h.
3. Of the 8.5-13.8 h, research is 1.2-2.6 h; the stop counted as work 5.1-7.3 h; the rest is design checks,
   comparisons and the 1.2-1.7 margin. His 37-58 typed turns come on top.
4. He types because a child session can start only on a turn he typed (the app's rule, r57-0109). Helpers need no
   turns. The reduced plan uses one session and helpers only: **2 answers from him** (the go, the cap).
5. Reduced plan: all eight lanes in round 3's checked method (Sonnet readers, Opus report, quote gate, fresh Opus
   refuter, every record checked), run by one Opus session: **about 0.8 B tokens (13 points), about 4 h**, against
   1.2-1.4 B (19-22 points), more than a day and about 100 turns for the pilot plus the full run.
6. Lane 1 also runs as one plain session beside it (the pilot's comparison 1, for about 23 M instead of about
   128 M). If that form holds up, the other seven run in it: **about 0.4 B (6.5 points)** in all.
7. Lost: the tree's own measurements and its extra guards (script-checked quotes, injection labels, seeded faults,
   coverage seeds). The tree stays a research object for later, not the vehicle for this research.
8. The PC is not the limit (memory allows about 25 sessions). What binds: 20 helpers at once per session, the weekly
   meter, and the steps inside a lane that must run in order: about 1.2 h a lane at any width.
9. Parallel readers save both: one lane's readers one after another take 0.8-1.8 h, not 25-39 min, and one long
   reader would cost twice the tokens. Eight lanes done one at a time: about a day (16-24 h), not days. Several writers on
   one file saves nothing here: every reader writes its own file.
10. Budget: the reduced plan fits 10 % only at the leanest lane measured (a1: 0.58 B) or if the one-session form
   holds; at the median it is 1.3 times over, and the coordinator stops at the cap.

## 1. The plan as it stands (PILOT-PLAN.md version 2)

**Tokens by what the work is [c: calc.mjs over the plan's expected column, 417.8 M].**

| Group | M | Nodes | Cause |
|---|---|---|---|
| Research on the field | **63.0 (15 %)** | T 12.84, its readers 31.9, R1 10.23, a third of the checkers 5.4 [e: they check T's, S1's and S2's cards], a third of the inputs 2.7 [e: the field and question list] | the work itself |
| The protocol's comparisons | **153.5 (37 %)** | fix units 2 and 3 (scorer, S1/S2 role) 95.1, S1 and S2 25.7, R_same 9.9, R2 10.2, scorer 1.8, two thirds of the checkers 10.7 | comparison 1 (tree against one session, R39) and comparison 2 (same-window against fresh review, F1); they measure the method, not the field |
| Coordination | **114.8 (27 %)** | coordinator 94.3 (Fable), top session 20.5 | the protocol's script steps per unit; W*_coord 133.2 K (a default, protocol s12): 17-38 successors; app: the Opus top session cannot start a Fable session |
| Model fix | **47.6 (11 %)** | fix unit 1 | our own rules: the tier hook needs a model on every start, the briefs may not name one; the start tool inherits the caller's model |
| Design checks and tests | **38.9 (9 %)** | STPA, FMEA, mapper 24.2, P3.1 5.8, inputs' protocol part 5.4, run root 1.4, P3.2 0.8, canary 0.8, control 0.6 | protocol s10 "before the go" (layer 7); safety (P3.1: whether a stop ends helpers, R9); the lean baseline |

**The coordinator's 94.3 M is likely high [c].** It is 23 units x 4.10 M, the median of three roots' rates per unit
(1.72, 4.10, 8.80). A line through the three roots, fixed part plus a part per unit, fits all three within 0.5 M:
**15.1 M + 1.49 M a unit** (65 units 111.9, 6 units 24.6, 2 units 17.6 M). For 23 units: **49.4 M**. The median of
rates counts a small root's fixed 15 M again in every unit. Expected then 373 M, not 418.

**Hours on the critical path [c from the plan's own parts].** The plan: design checks 1-1.5 h + T 4.8-5.3 h +
R_same 0.5 + R1 and R2 0.5 + scorer and comparisons 0.3 = 7.1-8.1 h, x 1.2-1.7 = 8.5-13.8 h.

| Part of the 8.5-13.8 h | Hours | Cause |
|---|---|---|
| Research (T's real work 0.53-1.03 h, R1 0.5 h, times the factor) | **1.2-2.6** | the work |
| Round 3's PC-restart stop, counted as T's time (4.27 h x 1.2-1.7) | **5.1-7.3** | an error in the basis, see below |
| Design checks (STPA, FMEA, mapper) | 1.2-2.6 | protocol layer 7; two waves at N_max 2 (analysers take 12-19 min each [m: E 1b]) |
| Comparisons (R_same, scorer, compare) | 1.0-1.4 | comparisons 1 and 2 |
| Outside the 13.8 h: drains at 17-38 hand-overs; 37-58 typed turns (10 child starts, 17-38 successors, 10 relayed closes); preparation 3-4 h | not priced | app r57-0109; W*_coord default; the app's session id against the CLI's (unknown fact); the fix round run one unit after another |

**The error [m: round3.mjs; transcript 40282554 at 14:48:51 "[Request interrupted by user]", then at 19:05:14 a
message from the top session: "the owner stopped you for a PC restart ... he has now said to resume"].** The three
collecting sessions (afb95132 5.34 h, 88f1506e 4.96 h, 40282554 4.80 h first to last call: the plan's "4.8-5.3 h")
each hold a 256-minute gap, 14:48 to 19:05 UTC on 2026-11-18. After the resume they ran 1.07, 0.69 and 0.53 h. The
age cap of 630 ticks (10.5 h) came from the same seven sessions; without the stop they ran 0.45-1.18 h (median 1.07),
so Q3 + 1.5 IQR is 1.8 h [c].

**Recomputed:** 2.8-3.8 h of work on the path, 3.4-6.5 h with the margin, at N_max 2. N_max 2 is the protocol's
silent default "until memory is measured" (s12), not this PC's limit (section 2). Successors: at the measured
hand-over point (r57-0171: orientation 2.33 M, 169 K at the first work call, W* 247-273 K) a coordinator session holds
10.8-17.3 M [c: R + nF + g n^2/2], so 49-94 M is 3-9 sessions: **2-8 successors, not 17-38**, and 22-28 typed turns.

## 2. Lower bounds for one field (round 3's four lanes, measured; the pilot's research share for comparison)

**Tokens per lane by step [m: round3.mjs; median (Q1-Q3), least]:** readers 34.3 (30.6-36.9), least 19.7; extraction
5.5 (4.0-7.7), 3.4; report and fold 20.0 (17.6-23.4), 12.2; quote gate and record check 5.0 (4.0-6.2), 3.4; fresh
refuter 15.5 (13.3-18.2), 13.3; the lane session 9.8 (9.1-10.6), 9.0. **Lane whole 93.2 M (82.4-102.3); least a1
64.7 M.** Lanes: c1 88.3, t1 98.1, w1 114.8, a1 64.7. Shared: intake 54.0 M (4 lanes), top session cf83865e (Fable)
37.7 M in the round's window [m: top3.mjs]; all-in 116 M a lane. The meter moved 51 to 58 % over 480.6 M: 69 M a
point, near r57-0170's 62. Checks held: 1-4 % of claims refuted and 35-40 % narrowed by the refuters; the intake
sampled 151 records and none failed (at most about 2 % wrong at 95 %, rule of three [c]) (r57-0140).

**Least tokens:** the least step figures sum to 54-61 M (with a shared coordinator at about 2 M a lane [c] or a lane
session at 9 M); a1 did the whole for 64.7 M. The pilot's research share, 63 M, is the same size: the tree adds about
355 M around one field's research.

**Least hours [m]:** the steps run in order: readers 25-39 min (all at once, with second attempts), report 14-18,
gate beside refuter 7-20, fold 17-20, extraction beside it then check 4-10: **67-107 min; a1 took 70 min.** More width
does not cut this (Amdahl): one field needs about 1.1-1.2 h at any width.

**Widths on this PC (r57-0414) [m: C-capacity.md rows 1-5; r57-0157; round 3's transcripts]:**
- Memory: (14.3 GB free - 4 GB floor) / 0.4 GB a session = **about 25 sessions** (10-64 at 1.0-0.16 GB). Helpers have
  no process of their own: memory does not limit them. A session's memory is one snapshot of 13 sessions (0.16-0.60 GB
  working set, private about 1.8 times); measured per kind by sampling each session process's private bytes every 2 s
  through a run and tying it to its session by start time.
- Processor: about 20 threads; sessions wait on the network; not binding.
- The app: **20 running helpers a session**, 3 levels of nesting, a child session only on a typed turn, no grandchild.
- Token windows: this week's room was 4.3 points at 10:24 UTC (section 3 of the plan); the reset week 64.7.
- The parent's window: one Opus coordinator for all eight lanes reaches 211-307 K [c: 96 calls, 86 K start, 1.3-2.3 K
  a call], under the 368 K compaction: no hand-over, so no typed turn.
- Rate limits: not stated (G-models). Measured to work: 15 Sonnet readers at once (round 3, 19:07 UTC), 13 sessions.
- Horizontal: eight lanes at once fit 20 helpers with rolling starts (8 x 163 helper-minutes / 20 slots = 65 min,
  under the 1.2-1.7 h lane path): **eight lanes in about 2-2.5 h** [c].
- Vertical: a level of helper orchestrators costs polls, one re-read of its window each (r57-0418): 30-43 polls at
  110-150 K = 3-6.5 M a lane [c], against nothing for depth-1 helpers of one session (woken by notices). A level of
  child sessions costs a typed turn each. So no extra level pays here (t1-0402: a level only where it compresses and
  its children run at once).

## 3. Paths to the same goal (checked results on the direction's eight lanes)

Q1 sources read in full, quoted with line; Q2 quote gate; Q3 fresh refuter; Q4 every record checked; Q5 intake sample
and recall test; Q6 injection labels and trusted scripts; Q7 held-out coverage seeds; Q8 seeded faults; Q9 the two
comparisons; Q10 design checks; Q11 ledger, fencing, restart by process.

| Path | Tokens, M: low / expected / high | Points | Of the 10 % | Wall time | His turns | Keeps | Drops |
|---|---|---|---|---|---|---|---|
| (a) tree as planned: pilot, then eight leaves | 1,160 / - / 1,352 [c: pilot 418 + 8 leaves x 78-91 (T, readers, R_same, R1, a third of 9 batches, coordinator share) + later scripts not yet planned 100-170 [e] + synthesis 21-38] | 18.7-21.8 | 187-218 % | preparation 3-4 h; pilot 8.5-13.8 h as planned (3.4-6.5 h without the stop) from the reset; leaves at N_max 2: 4 waves, 6-8 h [e]; over two weeks | 5 asks + 37-58, then 45-100 [e] | Q1-Q11 | none |
| (b) the same tree from helpers | pilot 406-507 [e: work nodes 160 + coordinator 49-94 + polls 1-5 + 4-5 fix units at 47.6 to run roles as helpers]; whole about 1.1-1.3 B | 18-21 | 180-210 % | as (a) less turn waits, plus 4-5 fix units | about 6 | Q1-Q5, Q7-Q9 | Q6 weaker and Q11 changed: helpers share the coordinator's process and settings |
| (c) round 3's way, as it ran | 863 / 959 / 1,039 [c: 8 lanes x 82-102 + intake 108 + top 75 + synthesis 21-38] | 15.5 | 155 % | about 4-5 h | 10-16 as child sessions | Q1-Q5 | Q6-Q11 |
| (d) one session per lane (S1's form) + a fresh refuter | 167 / 230 / 325 [c: 8 x (12.8 + 10.2) + synthesis + top] | 3.7 | 37 % | about 2.5 h [e] | 2 | Q1 (fewer sources), Q3 | the readers' coverage (unmeasured: comparison 1's question), Q2, Q4, Q5 unless added (+5-10 M a lane) |
| **(e) reduced: round 3's method, one Opus session, helpers only** | **681 / 798 / 901** [c: 8 x 72-93 + coordinator 14-19 + briefs 16-32 [e] + intake readers 37 + fold 8-13 + synthesis 21-38 + top 10-20 [e]]; at a1's cost 578 | **12.9** (9.3 at a1) | **129 %** (93 %) | **about 4 h** | **2** | Q1-Q5 | Q6-Q11 |

Ways work starts without his typing, from the record, none around the app's control: helpers (r57-0157, r57-0158;
background with fork mode off, 20 at once, 3 levels); a Workflow script (x01-0328: 16 agents at once by default, up to
256; enableWorkflows is on, x08-0141), which needs his opt-in once, resumes by position (memory note) and is not shown
to pass the tier hook (ORCHESTRATION s2, s11): not taken; a cross-session message wakes an existing session (round 3's
top session resumed the lanes this way, transcript 40282554, on a turn after his word) but starts none; r57-0109's
"the turn after one of its own sessions ends" is in no source opened.

## 4. Parallel readers and writers: what they save [c from round3.mjs]

- **Readers, per lane:** at once 25-39 min; one at a time 48-110 min of reader time (a1 48, t1 67, c1 102, w1 110).
  The whole lane: 70-106 min against 118-181 helper-minutes one at a time.
- **Readers, tokens:** five readers of 31 calls cost 13.9 M by nF + g n^2/2 (F 59 K, g 2.0 K); one reader doing all
  155 calls would cost 33.2 M and reach 369 K, past compaction. Fan-out halves the reader tokens.
- **Lanes:** eight at once about 2-2.5 h; one after another, helpers one at a time, **15.7-24.1 h (median 21.8 h)**:
  about a day, not days. Path (a) one node at a time: pilot 5-7 h + preparation 3 h + leaves 18-22 h [e], and its
  100-odd typed turns would spread it over days.
- **Writers:** every reader, extractor and report writer writes its own file, and the ledger and task table have one
  writer under the run lock (t1-0408): the several-writers research (r57-0415) saves nothing in any research path.
  It applies only to the plan's fix round: its three units run one after another because units 1 and 3 both change
  the settings templates; own copies landing in one order, as the build ran 3-7 builders at once, would take about
  1.2 h, not 3 [c: one unit 53 min, FX-W6]. Path (e) has no fix round.

## 5. The verdict and the reduced plan

**Can it be reduced?** Yes. For the goal, checked results on eight lanes, path (e) needs 0.68-0.90 B tokens against
1.16-1.35 B for (a) (a third to two fifths less), about 4 h against more than a day of machine time, and 2 typed
answers against about 100. The plan's size comes from testing the tree, not from the research: the pilot is one
field's research (63 M, about 1.2 h) inside 355 M and 7-11 h of machinery, comparisons and waiting.

**The reduced plan (path e):**
1. One Opus coordinator session (kind orchestrate; no node has grandchildren, so not Fable, r57-0035, r57-0418),
   started by the top session on his go; it hands over never (it ends near 210-310 K).
2. Each lane in round 3's method (`ROUND.md` steps 1-6): Sonnet readers at once, Opus report, Sonnet gate beside a
   fresh Opus refuter, Opus fold, Haiku extraction, Sonnet check of every record; library records reused (r57-0130).
   At most 20 helpers at once, rolling; usage read before each wave; it stops at the cap.
3. Lane 1 also runs once in S1's form (one Opus helper, no readers, about 23 M with its refuter). Scored by questions
   answered with a confirmed claim, tokens and hours. If it holds, lanes 2-8 run in that form (total about 0.4 B);
   if not, in round 3's (about 0.8 B). One lane, one run: it shows a gross gap, not equality (protocol s13).
4. Then one fresh reader per lane samples the records (4.6 M each), an Opus fold, the synthesis (the map of leads,
   the note on the embeddings test's assumptions, two or three test designs), refuted once, and his page.
5. From him: `approve:` the go and `cap:` (the 10 % line, 620 M, or the reduced plan's figure).

**What it loses:** both comparisons and the tree's section 11 parameters; quotes checked by a model on stored text
rather than certified by a script on page bytes; the injection defence by labels; coverage by held-out seeds; seeded
faults; design checks. None was seen to fail in round 3 (151 records sampled, none failed), but round 3 did not test
them. The 25 scripts (the build, 0.9 B) stay unused; the pilot can run later as an experiment of lane 7 with its own cap.

## 6. Not known, and what would measure it

- The one-session form's quality against fan-out (comparison 1's question): step 3 above.
- The coordinator's real cost per unit: n = 3 roots, Opus in the main checkout; the fit and the median differ by 45 M.
- A session's memory by kind: sampled private bytes through a run (section 2).
- How many helpers at once the account sustains: 15 measured; 20 not.
- The fixed load of a helper in a lean folder (58.7 K here; it is about half a reader's tokens): the plan's control.
- Whether a lane of the direction is as large as a round-3 lane: lanes 1, 4 and 7 have prior work (records on tokens
  340, memory 371, orchestration 150 [m: lookup counts]); 2, 3, 5 and 6 have few or none.
- The meter per model (r57-0514), and tokens per point in the reset week (62 M this week; 69 M over round 3).
- His typed-turn latency (the plan's 37-58 turns), and the app's session id against the CLI's.
