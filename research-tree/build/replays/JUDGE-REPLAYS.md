# JUDGE-REPLAYS: the seven replays of top session 7, judged together (2026-11-23)

Judged by a helper of top session 7 (analyse, Opus). Read: `briefs/TOP7-REPLAYS.md`; SCORING.md, RESULT.md and records.md
of each `replays/replay-*`; JUDGE-HANDBACK.md sections 1 and 6; TOP-STATE.md "Top session 7"; `library/README.md`. One
check was run (a copy of replay-L2's `scan.mjs` over the files it missed, in the scratchpad; figures in 3a). [m] measured
here, [q] quoted from the replay's file, [r] reasoned.

## 1. The answer

- **Quality (the tree):** all three leads come out against piloting, each for one form on these records: the narrow "done
  only with a check" gate (the claims had already passed their checks), ruff + mypy after edits (0 of 10 located defects;
  the project already gates on them), a text-only reviewer with two versions (2 of 17 against 4 of 17). What caught the
  recorded defects was a check or reviewer with the code in hand. Next: that stronger form, folded with D1 Phase A.
- **Tokens, router:** cache lapses are the largest measured sink (16.3 % of fresh tokens); the largest block is helpers
  waiting just past 5 minutes (46.2 M). L25 (helper waits) moves ahead of L2's pilot. L24's break guard is dropped (0.28 %).
  L2: the prefix's fresh part is 12.9 % on its subset, about 19.8 % with the 3,048 workflow helpers it missed [m].
- **Tokens, graph:** L5 and L4 are not piloted (dropping a read loses on the meter in every project; re-fetch under 0.01 %).
  The graph's next step stays D2 Phase A, which these replays do not touch.
- **Tokens, library:** L38 found 0 returns in 57 judged pairs; a null for one form (direct helpers, briefs, 1,800 characters).

## 2. The seven, side by side

| replay | question | headline figures (denominators), by project | scoring's verdict | scoring first? later changes | not tested | tokens: used / expected (limit) |
|---|---|---|---|---|---|---|
| L11 | share of "done" a later check or refuter contradicted; would the narrow rule catch them | contradicted: clinic 79 of 94 gate reviews (25 P1), H build 7 of 20 units, FixFlow 6 of 50 PR reviews (+17 PASS-WITH-FIXES); caught by an existing check: CL 1 of 79, H 0 of 7, FF 0 of 6; code-helper DONE without a passing check after the last edit 84 of 183 (H 32/80, FF 37/67, CL 10/29, RUN 5/7); 11 DONE after a red last check (unread) | do not pilot the narrow form (rule 2); read the 11 first | yes; three departures after first counts, kept: link by reviewed target, clinic unit = gate review, 30-claim sample not read | stronger forms (merged-head suite + guard mutation; exact check + reconstruction); reviewers' own false findings; gh CI as a check | 4.07 M / 4.7 M (10) |
| L8 | do edit diagnostics run here; would ruff/mypy/tsc after each edit flag S2's fix-made defects | diagnostics lines 0 after 30,336 Edit/Write in 4,443 transcripts (all projects 0); clinic ruff + mypy strict: 0 of 10 located defects (P1 0/4, P2 0/6; 2 of 10 in shell, unread by both), 0 of 9 defect-making commits; false flags 2 of 84 control fix commits, 7 of 256 commits | do not pilot L8 on S2 in this project | yes; unchanged (two false classes of the diagnostics scan and an invalid shared-cache pass removed, both kept) | 5 of 15 defects never committed; edit-level states; shell (no shellcheck); tsc (no TS defect); other projects | 10.6 M / 4.7 M (10; LIMIT after all counts) |
| L6 | does a reviewer reading two versions flag overstatements more than one reading one | 37 paired clinic cases: one version 4 of 17 overstated, 1 of 20 false alarms; two versions 2 of 17, 3 of 20; discordant 0 B-only / 2 A-only (overstated), 2 / 0 (accurate), p 0.50 each; second version +3 K a reviewer (184 K vs 188 K mean) | do not pilot; both arms under a quarter: report-reading is not the lever on S4 here | yes; one change before any count (paired, 74 calls not 40), stated in SCORING | reviewers with code, tests or cited evidence; 13 cases without a v2; diff or change-told reviewer; other models, voting; other projects | 33.7 M / 9.4 M (20, then 16 for L6b); case building 12.40 M was planned at 0 |
| L24 | cache writes by class (break, lapse, sibling) and what a keep-alive saves | lapses 151.5 M of 927.4 M fresh (16.3 %; 0.62 % of all) in 703 of 121,284 calls, 4,438 transcripts: FixFlow 19.8, clinic 24.1, harness 8.3, run 6.1 %; breaks 21 calls, 2.6 M (0.28 %); helpers waiting 5-10 min 296 calls, 46.2 M; keep-alive capped at 2 h nets 7.9-8.1 % of the meter (w1h 1.25 / 2); 1-hour cache for helpers loses unless its write weighs under 1.14; false alarms 0 of 1,892 controls | break guard: do not pilot; L25: measure the 1-hour weight and helper waits under 270 s first, then pilot on helper waits | yes; amended after counts (old line kept): request age, not response gap, tells lapse from break (112 of 133 "breaks" were lapses) | whether any keep-alive exists in the app; the 1-hour write weight; per-model weights (Fable sessions weigh more) | 2.96 M / 4.7 M (10) |
| L2 | the fixed prefix per role and start; its fresh share; what is loaded and unused | 1,071 files, 68,556 calls: prefix median 58,045 (helpers 55-58 K, FixFlow helpers 72 K, sessions 78-91 K); 30.1 % of context; prefix fresh 61.2 of 472.8 M fresh, 12.9 % (harness 13.9, run 19.5, FixFlow 12.6, clinic 10.2 %); skill listing unused in 996 of 1,029 files; ceiling 15.6 % of the meter (lean A), 1.9 % (unused listings out) | do-not-pilot line not met (all over 10 %); adopt: skill listing off; measure tool-schema sizes; pilot only short helpers | yes; unchanged | workflow helpers (see 3a); schema sizes per family (fit +-20 %); quality and turns under a lean prefix | 2.50 M / 4.7 M (10) |
| L5 | held reads made stale by a later edit; L4 re-fetch; cost of a drop | 3,339 windows, 35,569 content reads, 22.17 B context: stale (range) 1,855 reads (5.2 %), 6.42 % of read tokens carried, 88 % by the window's own edit; invisible 217 reads, 0.77 % of read tokens carried (harness 0.80, run 0.00, FixFlow 0.94, clinic 0.52 %); 24 of 15,386 own edits on such a read; drop: saves 271 M reads, rewrites 77 M, net -93 M (1.25x), -151 M (2x); re-fetch 18 identical reads, overlap under 0.01 % of context | do not pilot L5 or L4's state view | yes; additions after first counts kept apart: looser re-fetch counts (decision judged on the larger), a parsing fix | shell and editor writes (undercount); symbol level; any quality effect; a notice-only form | 3.6 M / 4.7 M (10) |
| L38 | how often a recorded conclusion is worked out again | 57 blind-judged pairs: 0 returns (18 continuations, 10 checks by design, 29 different); 949 helpers, 5,950 M tokens; 95 % bound about 100 of 949 (10.5 %), mostly the 0.3-0.5 bin (334 helpers, 12 judged); 486 library lookups | do not pilot now; measure first only if wanted (300 pairs, 1.7 M) | yes; unchanged | main sessions; the 3,048 workflow helpers (3a); cosine under 0.3 (509); hand-overs as records; premise coverage (no return to score) | about 3.2 M / 4.7 M (10) |

All seven: about 60.6 M against 37.6 M expected and the 87 M cap [q TOP-STATE]. Five of seven came in under expected;
L6 ran 3.6 times its expected (case building unplanned) and L8 2.3 times (background pauses, 317 trees through mypy).

## 3. Checks made here

**(a) L2 against L24.** L2's `scan.mjs` (lines 19-29) lists `<session>/subagents/*.jsonl` only; L24, L5, L8 and L11 walk
the whole `subagents/` tree. L38's `scan.mjs` (lines 74-97) has the same gap as L2. Missed: workflow helpers under
`subagents/workflows/<wf>/`. Run here with L2's own code on those files [m]: 3,048 files with usage, 435.7 M fresh
(FixFlow 1,766 files, 283.2 M; clinic 294, 33.7 M; other 988, 118.8 M; none in harness or run). Their prefix fresh:
FixFlow 85.8 M (30.3 % of their fresh), clinic 9.1 M (27.2 %). One denominator, four projects: L2 + workflow = 789.7 M
fresh, L24 = 780.5 M (L24 also drops 1,398 message ids repeated across files, and files have grown since; 1.2 % apart).
On it the prefix's fresh part is 156.1 M, **19.8 %** (FixFlow 22.4 %, clinic 14.0 %, harness 13.9 %, run 19.5 %), not
12.9 %; its after-the-first-call part is 37.6 M (4.8 points). L24's lapses on the same four projects: 139.2 M (17.8 %).
L2's 30.1 % re-read share and its 15.6 % / 1.9 % meter ceilings are on the 1,071-file subset and were not recomputed
here; with workflow helpers both are likely higher [r]. L38's helper token shares for FixFlow (30.2 %) and clinic
(17.5 %) also leave out workflow helpers: with them about 56 % and 26 % [m, from score.out.txt plus the scan above], so
main sessions carry about 44 % (FixFlow) and 74 % (clinic), not 65-83 %.

**(b) L2's 5.5 points against L24's 16.3 %.** Consistent. L2's "later" is only the prefix part (at most P, about 58 K) of
every rewrite after a file's first call (lapses, compactions, breaks, model changes); L24's lapse is the whole lost cache
(151.5 M over 703 calls, about 215 K a call). In every project L2's part is below L24's lapse + compaction + break:
harness 2.0 against 13.4 M, run 1.1 against 2.8, FixFlow 17.4 against 99.1, clinic 5.3 against 39.5 (L2's harness and
FixFlow split pre-split worktrees differently). 703 lapses x 58 K is about 41 M, near the 37.6 M of (a). The two are not
additive: a leaner prefix and a keep-alive both save the same 4.8-5.5 points.

**(c) The three quality nulls.** Forms tested: L11, a gate that holds a DONE without a passing executed check after the last
edit, replayed against later verdicts; L8, ruff 0.13.3 + mypy 1.19.1 strict per commit on one Python project whose own
check already runs them; L6, an Opus reviewer with report text only, two full versions from the record against one, 37
pairs. Not tested: L11's stronger forms (merged-head suite plus guard mutation; exact check plus reconstruction); L8 on
TypeScript, shell, a project without a strict checker, or per-edit states; L6 with code, tests or evidence in hand, a
diff, a generated second version, other models or voting. Each is a result on one form on these records. One caveat in
L11's figure: "about 1 of 92 caught" is the count of contradictions an existing check showed; whether the claim was
backed by its own check was measured per claim only in H (7 of 7 backed); for clinic and FixFlow only session-level
backing exists (17 of 38 and 8 of 42 sessions with code edits, `sessions.jsonl`, checked here). Where the defects and
overstatements were caught: in H by executed checks stronger than the worker's (full suite at the merged head 2,
mutations 2, a model check 1, probes on copies 2; `judged.jsonl`, checked here); in the clinic by Opus gate reviewers
reading the code and probing (78 of 79); in FixFlow by PR reviewers (6). None by the worker's own passing check, none by
the static checkers (L8: the defects are wrong rules that type-check), and a reviewer without the code found under a
quarter (L6). Together [r]: the catch came from a second party with the code in hand or running a stronger check.

**(d) Figures a RESULT.md gives that its raw output does not carry.** L2: R2 0.65 of the chars-per-token fit and "4.3 B of
14.4 B context tokens" (aggregate.txt prints neither; the latter is derivable). L6: "a reviewer took 9 to 19 s", "4
reviewers in 15 s" (not in tally-out.txt or tally.json). L38: "0.32 M per 57" judge tokens and "0.77 M tokens" for 3.06 M
characters (a ratio, not output). L11: "6.6 h" is 84 holds x S7's 283.8 s (computed, correct). L6 records.md item 7 says
replay-L6b "hit the app's limit"; TOP-STATE (17:05) records that f4c's reader starts were refused while L6b ran 16
reviewers beside the other parts. L38's "main sessions 65-83 %" and L2's 12.9 % are corrected in (a). All other headline
figures checked against raw output agreed (L24 ka.txt and summary.txt; L5 table sums; L11 judged.jsonl; L6 tally-out.txt).

## 4. What follows, in order

1. Read the 11 helpers that said DONE after a red last check (L11). Reading only, no new model run beyond the reader,
   well under 1 M [r]; no owner word. A real one is the narrow rule's only clear catch [q].
2. Quality: the form that caught the defects, a merged-head suite plus mutation of the claimed guard, folded with D1
   Phase A (70.5 M [q JUDGE-HANDBACK]) and B12 [q L11]. Model run; owner's word and a cap. Its case set at commit level is
   10 of S2's 15 defects (8 in Python), since 5 were never committed [m L8].
3. Router, L25: refit the 132 meter readings of r57-0175 with 5-minute and 1-hour writes apart (no model run), and test
   whether a helper's wait can be kept under 270 s by polling in steps (46.2 M of lapses at stake) [q L24]. A pilot on
   helper waits after both; owner's word and a cap.
4. Router, L2: re-run L2's aggregate with the workflow helpers (no model run, about a minute of scan [m]) so its ceilings
   stand on L24's denominator. Then: switch off the skill listing here (a settings change: owner's word; 1.9 % of the
   meter on the subset [q]); measure each tool-schema family's size (one probe session per MCP server: a small model
   run). L2's 384 M pilot only after, on short helpers [q].
5. Graph: L5 and L4 not piloted; sheet S14's re-fetch estimate is replaced by under 0.01 % [q L5]. D2 Phase A stays next
   (needs installs and the owner's word; untouched here).
6. Library, only if wanted: about 300 more judged pairs from the 0.3-0.5 bin (1.7 M [q]) with the workflow helpers and
   main-session sub-questions in [r].

## 5. For the owner

- Seven replays over the records on this PC used about 60.6 M tokens (cap 87 M); no pilot was needed to decide them.
- Quality: none of the three cheap checks helps in the form tried. The faults on record were caught by a reviewer or a
  check that had the code in hand, not by the worker's own tests, the type checker, or a reviewer reading the report.
- Tokens: the cache running out while helpers wait just over 5 minutes is the largest waste found (46.2 M; all lapses
  16.3 % of fresh tokens). The fixed start-up text of each helper is about 20 % of fresh tokens.
- Not known: whether the app can keep a cache alive, what a 1-hour cache write weighs on the meter, and whether a
  stronger check catches the clinic's faults. Two scans missed 3,048 workflow helpers; corrected here.
- approve: read the 11 helpers that said DONE after a failing check (under 1 M).
- approve: measure the 1-hour write weight and helper waits under 270 s (no model run), then a helper-wait pilot with a cap.
- approve: switch off the skill listing in this repository's sessions and helpers (about 1.9 % of the meter).
- approve: the stronger quality test (merged-head suite plus guard mutation) with D1 Phase A, with a cap.
