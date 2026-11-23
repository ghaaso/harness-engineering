# COMPLEXITY: where the pilot's tokens and hours go, and the shortest checked path to the seven fields

Version 2, 2026-11-20: the blind review `research-tree/build/refute/COMPLEXITY.md` ("CORRECT: 14 findings") folded in
as top session 3 decided each finding (r57-0021; brief `research-tree/build/briefs/COMPLEXITY-fold.md`), by a helper of
top session 3 (kind analyse, Opus). Version 1, which the review cites by line, is `research-tree/build/COMPLEXITY-v1.md`.
Read only; nothing started. Marks: [m] measured, [r] read, [c] computed (formula shown), [e] estimate; a [c] that rests
on an [e] says so. Tokens = input + cache creation + cache read + output, once per message id (the rule of
`research-tree/build/tools/tokens-self.mjs`). Scripts in the session scratchpad: `complexity/` (version 1: `round3.mjs`,
`top3.mjs`, `calc.mjs`), `complexity-refute/` (the review: `recalc.mjs`, `lanesess.mjs`, `helpers.mjs`),
`complexity-fold/percall2.mjs` (busy seconds per call); version 2's other figures are computed in the text. Points:
all-models weekly meter at 62 M a point (59-66 M, r57-0170); Fable meter at 5.7 M a Fable point (4.6-7.6 M, one
interval, r57-0170). The direction's budget, 10 % of a week (direction s7) = 10 points = **620 M** (590-660). Fields:
seven, the direction's lanes 2-8; lane 1 is the problem sheet (protocol v1 lines 26-31; v2 line 498, "seven leaves").
One build, one round, one week: a basis, not a law (r57-0015, r57-0028).

## 0. The answer

1. Yes, it can be cut in hours and in his typing; in tokens only a little, once the checks he keeps are paid for.
2. Path e2, chosen: a Fable coordinator starts one Opus helper per field, and that helper runs the field's own helpers.
3. Seven fields so: about 1.0 B tokens (0.80-1.22), 16 points (13-20), 1.6 times the direction's 10 % (620 M).
4. Path a, the tree as planned: 1.01-1.18 B, about two weeks, about 75-140 typed turns from him. Path e2: three acts.
5. His acts: the go (420 MB of public papers; rule 3's exception for the review test), the cap, opening the coordinator.
6. Path e, one Opus coordinator running every field's helpers itself, costs about 3 % less but hands over 2-3 times.
7. Each hand-over waits for his typed turn and loses detail; e2 keeps each field in one fresh window and does not wait.
8. Time: e2 about 5-8 h of machine time at three fields at once, 3.5-4.5 h if the app lets more helpers run at once.
9. When: after the 106 M he approved at 13:33 UTC no field fits this week (one is about 118 M): start at the 23 Nov reset.
10. His review idea stays measured: per field, the report writer and a fresh refuter review planted mistakes (142 M).
11. Lane 1 is the problem sheet, written once. One single-session run of a field could only rule that form out, not in.
12. Not known: whether helpers of helpers share the app's 20 at once, a helper coordinator on a real field, Fable's weight.

## 1. The plan as it stands (PILOT-PLAN.md version 2)

**Tokens by what the work is [c: calc.mjs over the plan's expected column, 417.8 M; finding 9].**

| Group | M | Nodes | Cause |
|---|---|---|---|
| Research on the field | **72.9 (17 %)** | T 12.84, its readers 31.9, R_same 9.9 (F1's default (a): the child that researched reviews, v2:752-756), R1 10.23, a third of the checkers 5.4 [e: they check T's, S1's and S2's cards], a third of the inputs 2.7 [e: the field and question list] | the work itself |
| The protocol's comparisons | **143.6 (34 %)** | fix units 2 and 3 (scorer, S1/S2 role) 95.1, S1 and S2 25.7, R2 10.2, scorer 1.8, two thirds of the checkers 10.7 | comparison 1 (tree against one session, R39) and comparison 2's spread (R2); they measure the method, not the field |
| Coordination | **114.8 (27 %)** | coordinator 94.3 (Fable), top session 20.5 | the protocol's script steps per unit; W*_coord 133.2 K (a default, protocol s12); app: the Opus top session cannot start a Fable session |
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
| Outside the 13.8 h: drains at the hand-overs; 37-58 typed turns (10 child starts, 17-38 successors, 10 relayed closes); preparation 3-4 h | not priced | app r57-0109; W*_coord default; the app's session id against the CLI's (unknown fact); the fix round run one unit after another |

**The error [m: round3.mjs; transcript 40282554 at 14:48:51 "[Request interrupted by user]", then at 19:05:14 a
message from the top session: "the owner stopped you for a PC restart ... he has now said to resume"].** The three
collecting sessions (afb95132 5.34 h, 88f1506e 4.96 h, 40282554 4.80 h first to last call: the plan's "4.8-5.3 h")
each hold a 256-minute gap, 14:48 to 19:05 UTC on 2026-11-18. After the resume they ran 1.07, 0.69 and 0.53 h. The
age cap of 630 ticks (10.5 h) came from the same seven sessions; without the stop they ran 0.45-1.18 h (median 1.07),
so Q3 + 1.5 IQR is 1.8 h [c].

**Recomputed:** 2.8-3.8 h of work on the path, 3.4-6.5 h with the margin, at N_max 2. N_max 2 is the protocol's
silent default "until memory is measured" (s12), not this PC's limit (section 2). Successors, like for like (finding
10): the pilot's coordinator runs in a lean run root, F 70-90 K (P:91-93), orientation 2.33 M (r57-0171), g 1.3-2.3 K,
so W* = F + sqrt(2Rg) = 148-194 K and a session holds 8.7-8.9 M [c: R + nF + g n^2/2]; 49-94 M is 6-11 sessions:
**5-10 successors, not 17-38, and 25-30 typed turns** (10 child starts + 5-10 + 10 relayed closes).

## 2. Lower bounds for one field (round 3's four lanes, measured; the pilot's research share for comparison)

**Tokens per lane by step [m: round3.mjs; median (Q1-Q3), least]:** readers 34.3 (30.6-36.9), least 19.7; extraction
5.5 (4.0-7.7), 3.4; report and fold 20.0 (17.6-23.4), 12.2; quote gate and record check 5.0 (4.0-6.2), 3.4; fresh
refuter 15.5 (13.3-18.2), 13.3; the lane session 9.8 (9.1-10.6), 9.0. **Lane whole 93.2 M (82.4-102.3); least a1
64.7 M**; the helpers without the lane session 83.1 (71.8-92.8), a1 55.7. Lanes: c1 88.3, t1 98.1, w1 114.8, a1 64.7.
Shared: intake 54.0 M (4 lanes); top session cf83865e (Fable) **29.7 M in the round** [m: top2.mjs; 37.7 M from
14:00 UTC, of which 8.0 M came before the owner's message of 14:41:56 started the lanes; finding 13]; all-in 114 M a
lane. The meter moved 51 to 58 % over 472.6 M: about 67.5 M a point, near r57-0170's 62. Checks held: 1-4 % of claims
refuted and 35-40 % narrowed by the refuters; the intake sampled 151 records and none failed (at most about 2 % wrong
at 95 %, rule of three [c]); a recall test of 14 questions on the draft board had no wrong answer (r57-0140).

**Least tokens:** the least step figures sum to 54-61 M (with a shared coordinator at about 2 M a lane [c] or a lane
session at 9 M); a1 did the whole for 64.7 M. The pilot's research share, 72.9 M, is the same size: the tree adds about
345 M around one field's research [c: 417.8 - 72.9].

**Least hours [m]:** the steps run in order: readers 25-39 min (all at once, with second attempts), report 14-18,
gate beside refuter 7-20, fold 17-20, extraction beside it then check 4-10: **67-107 min; a1 took 70 min.** More width
does not cut this (Amdahl): one field needs about 1.1-1.2 h at any width. With decision 4's review steps the path
grows by the fresh arm's review before the refutation, 5-12 min [e: 20-45 calls at the refuters' 14-24 min for 48-110
calls], to **1.2-2.0 h**; R_same runs beside the gate and refuter, the scorer beside the fold.

**Widths on this PC (r57-0414) [r: C-capacity.md rows 1-5; r57-0157; round 3's transcripts]:**
- Memory: about **20 more sessions** beside the 13 running [c from an e: 0.5 GB a session (0.1-1.0), C-capacity row
  4]. A helper's memory is inside its session's process and not measured (0.1-0.2 GB a busy session [e], row 5): to
  be measured by a snapshot before and after a fan-out. The PC is not the limit (finding 12).
- Processor: about 20 threads; sessions wait on the network; not binding.
- The app: **20 running helpers a session by default** (`CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`, his to approve;
  `facts/docs-subagents-excerpt.md`:40); above it the account's rate limits bind (15 Sonnet readers at once measured,
  round 3, 19:07 UTC). 3 levels of nesting; a child session only on a typed turn; no grandchild session.
- Token windows (decision 3, PILOT-PLAN s3's method), at the reading of 13:20 UTC on 2026-11-20 (82 % all models, 53 %
  Fable; 70.7 h to the reset, 2026-11-23 12:00 UTC): his protected use 0.21 x 70.7 = 14.8 points, room
  100 - 82 - 14.8 = **3.2 points, 196 M** (186-209) [c]. Less the work ordered since, the four pieces he capped at 106 M
  at 13:33 UTC (expected 79 M, TOP-STATE) and the rest of this round (about 5 M [e]): **about 1.8 points, 112 M**
  (102-125) [c]. Fable: 1.51 M an hour x 70.7 h = 106.7 M = 18.7 Fable points (14.0-23.2) protected; room 28.3
  (23.8-33.0), 161 M of Fable (110-250) [c]. The reset week: 64.7 points, 55.5 Fable points (PILOT-PLAN s3). The plan's
  "about 09:15" and "10:24" readings were about 10:45 and 11:54 UTC: its times for 2026-11-20 ran about 1.5 h early.
- The parent's window (finding 1). Path e's single Opus coordinator for seven fields makes **384-531 calls** [c: 7 x
  50-71 calls after the first helper start, round 3's lane sessions (lanesess.mjs); + 34, round 3's intake session],
  growing 1.27 K a call: 570-760 K without a hand-over [c: 86 + 384 x 1.27; 86 + 531 x 1.27]. At the computed point
  (247-273 K, r57-0171; RULINGS: "hand over at the computed point"; compactions are not a plan, r57-0008) it hands
  over **2-3 times**, each successor on his typed turn (r57-0109) [c: the review's model, sessions of (260 - 86)/1.27 =
  137 calls]; **up to 8 times** if each successor re-reads to 169 K at its first work call as the build's roots did [c:
  W* 246 K, (246 - 169)/1.27 = 61 calls a session]. Path e2's Fable coordinator only starts ten helpers and reads their
  ten-line returns: 23-32 calls [c: 10 starts x 2.3-3.2 calls a start, round 3's lane sessions] after an orientation of
  8-17 calls [m: a1; r57-0171], ending at **153-243 K** [c: 124-169 K + 23-32 x 1.27-2.3 K], under its hand-over point.
  Each field's Opus helper starts at 59 K [m: E 1b], reads in 38-57 K [m: round 3's lane sessions], makes 50-71 calls
  and 26-45 polls and ends at **169-220 K** [c: 97-116 + 64-90 + 8-14], under the 330 K checkpoint of Opus helpers.
- The report writer's window (decision 4): R_same adds 32-72 K [c: 20-45 calls x 1.6 K, E 1b refuters' growth] after
  the report; round 3's report writers ended at **253, 293, 293 and 354 K** [m: helpers.mjs]. Under the 368 K compaction
  R_same fits where the report ended under 296 K [c: 368 - 72]: three lanes of four.
- Busy time of a coordinating session [m: percall2.mjs over round 3's seven lane-session transcripts, 289 calls: median
  3.6 s, mean 6.0 s a call]: 7.0-7.9 min a lane. Path e's one coordinator is busy about 50-55 min for seven fields: it
  is not the bound.
- Horizontal: path e: seven fields at once fit 20 helpers with rolling starts (7 x 185 helper-minutes / 20 = 65 min
  [c: 163 [m] + about 22 for the review steps [e]], under the 1.2-2.0 h field path): **seven fields in 1.2-2.0 h** [c].
  Path e2: each field's helper holds one of the 20 while it runs; the documentation counts subagents "running in a
  session" [r], so helpers of helpers probably count (not measured): **three fields at once** (3 x (1 + 5 readers) =
  18; a start refused with "Concurrent subagent limit reached" is started again after one poll, as the documentation
  says a start succeeds once the count drops): seven fields in **2.8-6.0 h** [c: 7/3 to 3 rounds x 1.2-2.0 h]; if they
  do not count, 1.2-2.0 h.
- Vertical: a helper hears from its own helpers only at a tool boundary, and a standalone sleep is refused (r57-0158,
  `facts/nesting.md`), so a helper orchestrator waits with file-watching calls of at most 150 s (a helper's call over
  about 180 s is moved to the background and can stall): over a field's 64-113 min of waiting, 26-45 polls at 130-160 K
  = **3.4-7.2 M a field** [c from e: the poll length is the brief's choice; r57-0418's 1.5-3.5 M was for B1-1's shorter
  waits and smaller windows; the probe polled every 20 s, 21 calls in 6.4 min, r57-0158; finding 14]. In tokens the
  level does not pay: a field's helper costs 13.0-18.7 M against 9.6-13.5 M of path e's coordinator per field [c:
  67.5-94.6 / 7] (r57-0418's test: polls dearer than the parent calls they save). It pays in his turns and in
  hand-overs (r57-0042; a hand-over loses detail, ORCHESTRATION s5), and t1-0402's condition holds: a field's helper
  returns ten lines for 50-71 calls of management, and its readers run at once. A level of child sessions costs a typed
  turn each.

## 3. Paths to the same goal (checked results on the direction's seven fields)

Q1 sources read in full, quoted with line; Q2 quote gate; Q3 fresh refuter; Q4 every record checked; Q5 intake sample
and recall test; Q6 injection labels and trusted scripts; Q7 held-out coverage seeds; Q8 seeded faults; Q9 the two
comparisons (F1 = comparison 2's same-window against fresh review); Q10 design checks; Q11 ledger, fencing, restart by
process.

| Path | Tokens, M: low / expected / high | Points | Of the 10 % | Wall time | His acts (decision 7) | Keeps | Drops |
|---|---|---|---|---|---|---|---|
| (a) tree as planned: pilot, then six leaves | 1,010 / - / 1,180 [c: pilot 418 + 6 leaves x 78-91 (T, readers, R_same, R1, a third of 9 batches, coordinator share) + later scripts 100-170 [e: 3-5 scripts at the build's 36 M a script, 907.7 M for 25, r57-0170] + synthesis 21-38 [e] + problem sheet 5-10]; 1,088-1,271 if the pilot's field runs again as a leaf | 16.3-19.0 | 163-190 % | preparation 3-4 h; pilot 8.5-13.8 h as planned (3.4-6.5 h without the stop) from the reset; six leaves at N_max 2: 3 waves, 4.5-6 h [e]; over two weeks | go with the downloads and rule 3's exception; cap; 5 asks; 37-58 typed turns in the pilot (25-30 like for like), then 34-75 [e] | Q1-Q11 | none |
| (b) the same tree from helpers | about 1,000-1,270 [e: pilot 406-507 (work nodes 160 + coordinator 49-94 + polls 1-5 + 4-5 fix units to run roles as helpers) + six leaves 466-544 + scripts 100-170 + synthesis + problem sheet] | 16-20.5 | 161-205 % | as (a) less turn waits, plus 4-5 fix units | go with downloads and exception; cap; about 6 | Q1-Q5, Q7-Q9 | Q6 weaker and Q11 changed: helpers share the coordinator's process and settings |
| (c) round 3's way, as it ran | 749 / 837 / 911 [c: 7 x 82-102 + intake 94 (54.0 x 7/4) + top 52 (29.7 x 7/4) + synthesis 21-38 [e] + problem sheet 5-10] | 13.5 (12.1-14.7) | 135 % (121-147) | about 4-5 h [e] | go with downloads; cap; 9-16 typed starts of child sessions [e: one or two a field, round 3, + intake + synthesis] | Q1-Q5 | Q6-Q11, F1 |
| (d) one session per field (S1's form) + a fresh refuter | 155 / 215 / 302 [c: 7 x (12.8 + 10.2) + synthesis + top + problem sheet] | 3.5 (2.5-4.9) | 35 % (25-49) | about 2.5 h [e] | go with downloads; cap | Q1 (fewer sources), Q3 | the readers' coverage (unmeasured: comparison 1's question), Q2, Q4, Q5 unless added (+5-10 M a field [e]), F1 |
| (e) round 3's method, one Opus coordinator, helpers only | 776 / 959 / 1,185 [c, below] | 15.5 (12.5-19.1) | 155 % (125-191) | 3.4-4.4 h of machine time [c: fields 1.2-2.0 h + closing 2.2-2.4 h] + 2-3 drains of 15-40 min [e] + his replies | go with downloads and exception; cap; **2-3 typed successor starts (up to 8)** | Q1-Q5, F1 | Q6-Q11, comparison 1 |
| **(e2) as (e), each field run by its own Opus helper under a Fable coordinator** | **801 / 985 / 1,219** [c, below], of it Fable 4-9 | **15.9 (12.9-19.7)**; Fable 1.1 (0.5-1.9) | **159 % (129-197)** | **5.0-8.4 h** at three fields at once [c: 2.8-6.0 + 2.2-2.4]; 3.4-4.4 h if helpers of helpers do not count in the 20 | go with downloads and exception; cap; **he opens the Fable coordinator; none during the run** | Q1-Q5, F1 | Q6-Q11, comparison 1 |

**(e) [c]:** 7 x the field's helpers 71.8 / 83.1 / 92.8 [m: round 3, lane less its session] + coordinator 67.5 / 81.0 /
94.6 (the review's model: sessions of 137 calls from 86 to 260 K, 1 M orientation each; 384 / 461 / 531 calls) + briefs
14 / 21 / 28 [e: version 1's 16-32 x 7/8] + intake readers 31.6 / 32.9 / 33.4 (7 x 4.51 / 4.70 / 4.77 [m]) + intake fold
28.2 / 37.1 / 46.0 (3.5 two-field packets at 8.05 / 10.59 / 13.13 [m: 1fe0ac69; finding 2]) + draft board 5.5 and recall
test 5.0 [m, n=1: 0.75 + 4.27; decision 5] + synthesis 21 / 30 / 38 [e: round 3's rule-v2 draft 23.1 M, n=1; an analyse,
refute and fold at their medians 21.3] + top session 10 / 15 / 20 [e] + problem sheet 4.9 / 8.1 / 10.4 [m: E 1a
analyse/opus, n=19] + F1 arms 86 / 142 / 255 (section 5). Without the F1 arms: 690 / 817 / 931.

**(e2) [c]:** as (e) without its coordinator and briefs, plus 7 field helpers 13.0 / 15.6 / 18.7 each (round 3's lane
sessions 9.1 / 9.8 / 10.6 [m] + the scorer's and blinding calls 0.5-0.9 [e] + 26-45 polls 3.4 / 5.1 / 7.2 [c from e]) +
the Fable coordinator 4.1 / 6.0 / 8.9 (orientation 0.9-2.3 M [m: a1; r57-0171] + 23-32 calls from 124-169 K at 1.27-2.3 K
a call [c]) + the closing helper 11.5 / 13.7 / 16.0 (round 3's intake session 3.96 [m] + the synthesis steps' starts
1.3-2.3 [c] + 50-55 polls over its 130-143 min, 6.2-9.7 [c from e]). Fable on the all-models meter is not known
(r57-0514): at two Opus tokens a Fable token, +0.1 point.

**Lane 1, the problem sheet,** is counted once in every path as one Opus analyser writing from our own measurements
(direction lane 1's five files): 8.05 M (4.94-10.39) [m: E 1a analyse/opus, n=19]. The pilot plan has no node for it;
in (e) and (e2) it is the coordinator's first helper, and every field's reviewers get it with our files.

Ways work starts without his typing, from the record, none around the app's control: helpers (r57-0157, r57-0158;
background with fork mode off, 20 at once, 3 levels); a Workflow script (x01-0328: 16 agents at once by default, up to
256; enableWorkflows is on, x08-0141), which needs his opt-in once, resumes by position (memory note) and is not shown
to pass the tier hook (ORCHESTRATION s2, s11): not taken; a cross-session message wakes an existing session (round 3's
top session resumed the lanes this way, transcript 40282554, on a turn after his word) but starts none. The start
tool's own text [r, 2026-11-20]: a started session's model is "Same family or cheaper than yours; anything higher is
ignored", so an Opus top session cannot start the Fable coordinator: he opens it, unless the top session at the go
runs on Fable; and when a session it started ends its turn "the app continues you". Whether a start is allowed on
that continued turn (r57-0109's claim) is still in no source; if it is, (e)'s successors need no typed turn.

## 4. Parallel readers and writers: what they save [c from round3.mjs]

- **Readers, per field:** at once 22-37 min; one at a time 48-110 min of reader time (a1 48, t1 67, c1 102, w1 110).
  The whole field: 70-106 min against 118-181 helper-minutes one at a time.
- **Readers, tokens:** running them at once saves time, not tokens: five readers one after another each start a fresh
  window and cost the same. The tokens are saved by splitting the reading among several readers, at once or not: five
  readers of 31 calls cost 13.9 M by nF + g n^2/2 (F 59 K, g 2.0 K); one reader doing all 155 calls would cost 33.2 M
  and reach 369 K, past compaction (finding 11).
- **Fields:** seven at once 1.2-2.0 h in (e), 2.8-6.0 h in (e2) at three at once; one after another, helpers one at a
  time, **13.7-21.1 h (median 19.0 h)** [c: 7 x 118-181 helper-minutes]: under a day. Path (a) one node at a time:
  pilot 5-7 h + preparation 3 h + leaves 13.5-16.5 h [e: version 1's 18-22 h x 6/8], and its 75-140 typed turns spread
  it over days.
- **Writers:** every reader, extractor and report writer writes its own file, and the ledger and task table have one
  writer under the run lock (t1-0408): the several-writers research (r57-0415) saves nothing in any research path.
  It applies only to the plan's fix round: its three units run one after another because units 1 and 3 both change
  the settings templates; own copies landing in one order, as the build ran 3-7 builders at once, would take about
  1.2 h, not 3 [c: one unit 53 min, FX-W6]. Paths (e) and (e2) have no fix round.

## 5. The verdict and the chosen plan

**Can it be reduced?** In hours and in his typing, yes; in tokens, a little. Path (e2) needs 0.80-1.22 B tokens
(0.98 expected) against 1.01-1.18 B for (a) on the same seven fields; 5-8 h of machine time against two weeks; three
acts from him against about 75-140. It costs as much as it does because it keeps the checks: the F1 arms (142 M) and
the recall test with its board (10.5 M) are in it. No path that keeps the checks fits the 10 %; only (d) does, and its
quality is not measured. The tree's own size is machinery, not research: one field's research (72.9 M, about 1.2 h)
inside 345 M and 7-11 h of machinery, comparisons and waiting.

**The plan (path e2):**
1. He opens one Fable coordinator in the main checkout (kind orchestrate-deep: its helpers have helpers, r57-0035,
   `.claude/hooks/tier-routes.json`). It reads usage before every start, holds a start that does not fit the room
   (PILOT-PLAN s3's gate), and stops at the cap.
2. Its first two helpers (Opus, analyse): the problem sheet (lane 1) and one copy of our files with k planted wrong
   assumptions per field, its key kept for the scorers only.
3. Each field: one Opus helper (kind orchestrate), at most three at once, runs ROUND.md steps 1-5: Sonnet readers at
   once; the Opus report, whose writer then reviews the planted copy in the protocol's fixed form (R_same); the Sonnet
   gate beside the fresh Opus refuter, which first writes the same fixed-form review from the claims alone (the fresh
   arm, as R1 from a pack), then refutes; a blind Sonnet scorer on the two reviews, arm names stripped and order
   shuffled by a short script; the Opus fold; Haiku extraction; a Sonnet check of every record. Library records are
   reused (r57-0130). It waits with file-watching calls of at most 150 s and returns at most ten lines.
4. Then one Opus closing helper: a fresh reader per field samples its records (4.7 M each); Opus folds in two-field
   packets; the draft board; the recall test and its scoring (decision 5); the synthesis (the map of leads, the note on
   the embeddings test's assumptions, two or three test designs), its fresh refuter, the fold, and his page.
5. From him: `approve:` the go, naming the paper downloads (public papers under 40 MB each from open copies, ROUND.md;
   about 60 MB a field [m: round 3 kept 240 MB for four lanes], **about 420 MB** for seven [c]) and the exception to
   CLAUDE.md rule 3 (the F1 comparison runs in the desktop app with the network on, outside a container); `cap:`; and
   opening the coordinator on Fable.
6. When: no field fits this week [c: the first start is the two preparation helpers, 16.1 M, with a field at its
   expected 117.7 M (96.3-146.4) = 133.8 M, above the 112 M (102-125) left after the ordered 106 M; at the 13:20 room
   alone, 196 M, one field would fit]. The run starts from the reset, 2026-11-23 12:00 UTC, and needs 15.9 points
   (12.9-19.7) of that week's 64.7, and 0.5-1.9 of its 55.5 Fable points.

**Why (e2), not (e) (decision 1; r57-0003: quality first, then the least time, memory, tokens; r57-0042).** Both keep
the same checks. Quality: (e2) keeps every field's management in one fresh Opus window of 169-220 K that never hands
over; (e) runs all seven through one window that hands over 2-3 times (up to 8) mid-run, and a hand-over loses detail.
Time: (e) stops at each hand-over for a drain and his typed turn, and he will not be at the PC for the whole run
(r57-0042); (e2) needs him once, before it starts, at the risk of 1.6-4 h more machine time if helpers of helpers
share the app's 20. Memory: the same; helpers live in their session's process either way. Tokens: (e2) costs 25-34 M
more (about 3 %), the polls, and moves 4-9 M of it to the Fable meter. Risks taken in (e2): no helper orchestrator has
yet run a real batch here (r57-0418); a stalled field helper shows only as silence; the coordinator reaches its
hand-over point only at the top of every range at once, and then needs one typed turn.

**His review idea, kept measured (decision 4, finding 7).** Added a field: R_same 9.9 (6.3-17.8) [PILOT-PLAN node 15];
the fresh arm's review 7.4 (4.2-12.4) [c from e: 30 calls (20-45) at 110-160 K, then its 40-60 K carried through the
refutation's 44-87 calls, E 1b]; the scorer 1.79 (1.07-4.68) [node 21]: **19.1 M (11.6-34.9)**; once, the planted copy
8.05 (4.94-10.39): **142 M (86-255) for seven fields**. The fresh arm's review and the planted copy are added because
the refuter of round 3's method reviews the claims, not our files: without both arms reviewing the same planted copy,
the scorer has nothing common to score. R_same runs only where the report ended under 296 K (section 2), else that
field's pair is recorded as not run: about five pairs if round 3's spread holds [c: 3 of 4 x 7]. **It measures** F1,
same-window against fresh review (his ruling after the pilot, v2:752-757), as paired results over those fields: plants
found with the right reason (primary), citation failures, use outside conditions, tokens, and R_same's factual
sentences that cite nothing (D8-07). **It does not measure** comparison 1 (the tree or fan-out against one session, S1
and S2); the spread between two fresh reviews (one fresh arm, not R1 and R2, so a gap cannot be set against |R1 - R2|);
or the scorer's error (one scorer). Each pair is also a different field. The refuter reads our planted files before it
refutes; a separate fresh reviewer (R1's form, 10.23 M a field [m]) would keep them out of its window for 2.8 M more a
field: not taken, the decision names the refuter.

**The single-session run (finding 3, decision 6).** Dropped with its 0.4 B branch. One run of a field in the
single-session form can only rule that form out, by a gross gap, never in for the other fields (v2:734-735, :794,
:819-820); its result would not change this run (RULINGS: a test runs only if its result can change what is done
next), and lane 1 is the problem sheet, not a field. Comparison 1 stays with the pilot (S1 and S2 approved, r57-0043).

**What it loses:** comparison 1 and R2; the tree's section 11 parameters; quotes checked by a model on stored text
rather than certified by a script on page bytes; the injection defence by labels; coverage by held-out seeds; seeded
faults; design checks. None was seen to fail in round 3 (151 records sampled, none failed), but round 3 did not test
them. The 25 scripts (the build, 0.9 B) stay unused; the pilot can run later as an experiment of lane 7 with its own cap.

## 6. Not known, and what would measure it

- Whether helpers of helpers count in the app's 20 running helpers a session: it sets (e2)'s width (three fields or
  seven); the coordinator's first fan-out shows it (a refused start), with no separate test.
- A helper orchestrator on a real field: its polls, stalls and window (none has run a real batch here, r57-0418): the
  first field measures it.
- Whether a start is allowed on the turn the app gives a session after its own session ends (r57-0109; the start
  tool's text says only that the app continues it): it decides whether (e)'s successors need his typed turns.
- How far a successor coordinator re-reads (86-169 K): (e)'s 2-3 or up to 8 hand-overs.
- Whether each field's report leaves R_same room under 296 K (round 3: 253-354 K): how many F1 pairs run.
- The coordinator's real cost per unit in the plan: n = 3 roots, Opus in the main checkout; the fit and the median
  differ by 45 M.
- A session's and a busy helper's memory: sampled private bytes through a run, and a snapshot around a fan-out.
- How many helpers at once the account sustains: 15 measured; 20 not.
- The fixed load of a helper in a lean folder (58.7 K here; it is about half a reader's tokens): the plan's control.
- Whether a field of the direction is as large as a round-3 lane: lanes 4 and 7 have prior work (records on memory
  371, orchestration 150 [m: lookup counts]); 2, 3, 5, 6 and 8 have few or none.
- The meter per model, Fable on the all-models meter (r57-0514), and tokens per point in the reset week (62 M this
  week; 67.5 M over round 3).
- His typed-turn latency, and the app's session id against the CLI's.

## Changes from version 1

Findings of the review:
1. Coordinator (finding 1): (e)'s coordinator recomputed for seven fields by the review's model, 384-531 calls, 67.5-94.6
   M, 2-3 successors on his typed turns (up to 8); its "96 calls" and "hands over never" removed.
2. Intake fold (finding 2): two-field packets of 8.05-13.13 M [m], 28-46 M for seven fields, replace "8-13".
3. Single-session form (finding 3): the 0.4 B branch and the single-session run of lane 1 dropped (section 5).
4. Field count (finding 4): seven fields in every path; (a) is the pilot plus six leaves, 1,010-1,180 M.
5. His inputs (finding 5): the go names about 420 MB of paper downloads and the rule-3 exception; per path in section 3.
6. This week's room (finding 6): 3.2 points at 13:20 UTC, about 1.8 after the ordered 106 M; the run waits for the reset.
7. His review idea (finding 7): kept measured as F1 in the chosen path (section 5), no longer listed as lost.
8. Recall test (finding 8): kept with the draft board it runs on, +10.5 M; Q5 whole.
9. Research share (finding 9): R_same counted as research, 72.9 M (17 %); comparisons 143.6 M (34 %).
10. Plan's successors (finding 10): like for like 5-10 successors and 25-30 typed turns (section 1).
11. Readers (finding 11): at once saves time; splitting the reading saves tokens (section 4).
12. Widths (finding 12): 20 helpers is a default he may change, then rate limits; helper memory not measured; about 20
    more sessions [c from an e].
13. Round 3's top session (finding 13): 29.7 M in the round, not 37.7; (c) recomputed; 67.5 M a point over the round.
14. Marks (finding 14): [e] on the later scripts (basis: 36 M a script), the polls (basis shown), the memory width, the
    briefs, the synthesis, the top session, the leaves' hours and (d)'s hours.

Decisions of top session 3:
1. Variant (e2) computed beside (e) on tokens, both meters, hours, his acts and checks, and chosen (section 5).
2. Seven fields; lane 1's problem sheet counted once, 8.05 M, in every path; (a), (c), (e), (e2) recomputed with their
   share of the 10 %; (b) and (d) recomputed on the same count.
3. The room recomputed at 13:20 UTC with the true times; none of (e2)'s fields fits before the reset; one would without
   the 106 M ordered at 13:33.
4. F1 measured: R_same, the fresh refuter's fixed-form review, one blind scorer, one planted copy: 19.1 M a field, 142 M
   in all; the fresh arm's review and the planted copy added, since without them nothing common can be scored.
5. The recall test kept: 0.75 + 4.27 M, with its draft board 5.5 M.
6. The 0.4 B branch dropped; one single-session run can only rule that form out.
7. His acts listed per path: the go with downloads and the exception, the cap, and every typed start (one in (e2)).
8. Every figure on an unsourced input re-marked [e], with its basis where one exists.
