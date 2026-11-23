# replay-L38: how often a recorded conclusion returns (2026-11-23)

**Answer.** In 57 blind-judged pairs (a later helper against its closest earlier report or library record), 0 were a
conclusion worked out again: 18 were deliberate continuations told to build on the earlier one (C), 10 independent
checks by design (V), 29 different questions (D). Point estimate of re-derived helper tokens: 0.00 % in all four groups
(949 helpers, 5,950 M tokens). The 95 % upper bound is wide: about 100 of 949 helpers (10.5 %), almost all from the
cosine 0.3-0.5 bin (334 helpers, 12 judged). The premise question (what traces miss) could not be measured: no return
to measure it on. By the rule fixed first (SCORING.md), the result is "do not pilot" now.

## Counts by project group
| group | helpers | helper tokens (M, total / fresh) | helpers' share of all tokens | best match cos >= 0.5 | 0.3-0.5 | below 0.3 | judged | R whole / part |
|---|---|---|---|---|---|---|---|---|
| harness | 290 | 1,684 / 68.7 | 76.5 % | 60 | 108 | 122 | see key.json | 0 / 0 |
| run | 301 | 788 / 44.5 | 97.4 % | 3 | 63 | 235 | | 0 / 0 |
| FixFlow | 221 | 2,657 / 106.5 | 30.2 % | 27 | 85 | 109 | | 0 / 0 |
| clinic | 137 | 821 / 37.8 | 17.5 % | 16 | 78 | 43 | | 0 / 0 |
| all | 949 | 5,950 / 257.6 | | 106 | 334 | 509 | 57 | 0 / 0 |

By bin (all groups; size / judged / C / V / D): [0.9,1] 4/4/3/0/1; [0.8,0.9) 18/12/0/0/12; [0.7,0.8) 5/5/5/0/0;
[0.6,0.7) 17/12/8/0/4; [0.5,0.6) 62/12/1/5/6; [0.3,0.5) 334/12/1/5/6 (`score.out.txt`). Library records were the
closest earlier item for 3 helpers only (all in 0.3-0.5); no harness helper's closest match was a run helper or the
reverse (`bins.txt`).

Upper bound (one-sided 95 %, 0 of n per bin, 1 - 0.05^(1/n)): 0.53 x 4 + 0.22 x 18 + 0.45 x 5 + 0.22 x 17 + 0.22 x 62
+ 0.22 x 334 = about 100 helpers. A crude bound; below 0.3 (509 helpers) is not sampled and counted as no return.

Side count (`lookups.out.txt`): the library was consulted 486 times in harness and run transcripts (259 by harness
helpers, 158 by run helpers, 69 by harness sessions), returning about 3.06 M characters (about 0.77 M tokens). Recorded
conclusions are already brought back on purpose, by lookup and by successor briefs; hits were not classified.

## How it was counted
- `scan.mjs`: every helper transcript (`<session>/subagents/*.jsonl`) of the four groups: brief, report (SubagentHandback
  else last text), files named by its tools, tokens per message id as `RUN:tools/lib.mjs`; every Edit/Write call with
  its time (10,183). Main-session work is out.
- `pair.mjs`: TF-IDF cosine of each helper's brief against every item on record before it started (earlier helpers'
  brief + report, journal records from the day after their date); best match per helper; six bins; 12 per bin drawn
  with seed 1729, proportional over groups; three blind packets (`judge-1..3.md`, cut to 1,800 characters each side).
- Three Opus judges (`analyse: replay-L38 judge 1..3`), blind to cosine and bin, classes as SCORING.md
  (`judge-*.verdicts.tsv`); `score.mjs` joins them (`key.json`) and computes rates, tokens, premises, invalidation.

## The seven measures
- token count / cost: no measured saving. Point estimate 0 of 5,950 M helper tokens; bound up to about 10 % of helpers
  (tokens not bounded separately: returns could be small or large helpers). The lead's -22.5 to -32.5 % (synthetic APIs)
  has no counterpart here: our repeated briefs are templates over different subjects (all 12 judged in 0.8-0.9 were D).
- throughput, time, efficiency: none shown (no returns to skip).
- quality, hallucinations: not measured; the invalidation scoring (file-level vs "changed") had no pair to score; the
  earlier 0.00 % / 6.49 % replay stands alone.

## What was NOT tested
- Main sessions (65-83 % of tokens in FixFlow and clinic) and the owner's typed questions: a session re-deriving a
  conclusion inside its own work is invisible to a brief-level match.
- Returns worded differently from the earlier brief (cosine < 0.3, 509 helpers) and returns whose closest item was not
  the earlier answer (one candidate per helper).
- Partial returns hidden past the 1,800-character cut (the judges marked few "cut").
- Hand-overs and RETURN.md files as on-record items (only helper reports and journal records were matched).
- The premise questions (traces missing premises; file vs fact level): no R pair. A single judge per pair; no
  second-judge agreement.
- Whether the 486 lookups found what they sought.

## What it changes next
Do not pilot L38 as a conclusion cache now. Where conclusions recur here they already return by design: successor
briefs that point at checkpoints (18 of 57) and library lookups (486). A cache would act on re-derivations this replay
did not find. Measure first only if L38 is wanted again: judge about 300 more pairs from the 0.3-0.5 bin (about
1.7 M tokens at this run's 0.32 M per 57) to bring the bound near the 1 % line, and add main-session sub-questions.
Reason: by the rule fixed first, an estimated re-derived share under 1 % in every group of 50+ helpers means do not
pilot; the wide bound is why "measure first" rather than "drop for good" (one null is not a verdict).

## Files
SCORING.md, scan.mjs, pair.mjs, score.mjs, lookups.mjs; helpers.json, edits.json, sessions.json, pairs.json, bins.txt,
key.json, judge-1..3.md, judge-*.verdicts.tsv, score.out.txt, lookups.json, lookups.out.txt, scan.out.txt, pair.out.txt.
