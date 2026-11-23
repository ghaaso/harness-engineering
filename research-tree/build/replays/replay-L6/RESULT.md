# replay-L6: result (DONE, 2026-11-23, finished by unit replay-L6b)

**Answer: no. A reviewer that reads two versions of a report did not flag the overstated claims more often than one
that reads one version. It flagged fewer: 2 of 17 against 4 of 17. It also raised more false alarms: 3 of 20 against
1 of 20. Under the rule SCORING.md fixed before any count, L6 is not piloted. Both arms also flag fewer than a quarter
of the overstated claims, so on these records report-reading review is not the lever on S4. That points to the
executed and scripted checks of L11 and B12.** This is a sizing result from one project and report text only. It is not
a verdict on the family (see "What was not tested").

## Counts (tally-out.txt, tally.json; all 37 cases with a second version, each run once in each arm)
| class | arm A, one version | arm B, two versions |
|---|---|---|
| overstated (n 17): detection | 4 of 17 (23.5 %) | 2 of 17 (11.8 %) |
| accurate (n 20): false alarms | 1 of 20 (5.0 %) | 3 of 20 (15.0 %) |
| overstated, confidence 70 or more | 3 of 17 | 1 of 17 |
| accurate, confidence 70 or more | 0 of 20 | 0 of 20 |

No reviewer answered CANNOT_TELL. All 74 verdicts were written, none was missing, and none was started twice.

## Paired comparison (McNemar on discordant pairs, as SCORING.md fixed it)
- Overstated: B flags and A does not, 0. A flags and B does not, 2. Net gain of B: -2. Exact two-sided p = 0.50
  (2 discordant pairs).
- Accurate: B flags and A does not, 2. A flags and B does not, 0. B has 2 extra false alarms. p = 0.50.
- At confidence 70 or more: overstated 0 against 2, net -2. Accurate 0 against 0.
- With 2 discordant pairs in each class, neither difference is significant. The point estimate goes against arm B
  in both classes.

## By source of the second version
| source | overstated: A / B (B-only, A-only) | accurate: A / B (B-only, A-only) |
|---|---|---|
| a, earlier commit of the same file (5 + 5) | 0/5 / 0/5 (0, 0) | 0/5 / 1/5 (1, 0) |
| b, another text by the same worker in the round (12 + 15) | 4/12 / 2/12 (0, 2) | 1/15 / 2/15 (1, 0) |

Every hit came from source b, and so did both of arm B's lost detections. An earlier commit (source a) gave neither
arm a hit on its 5 overstated cases.

## The do-not-pilot rule, applied as written
- "Do not pilot if, on the overstated cases, arm B flags fewer than 3 more cases than arm A net": the net is -2, which
  is below 3. **Do not pilot.**
- "...or if arm B's extra false alarms are at least half its extra hits": B has 2 extra false alarms against -2 extra
  hits. This also holds.
- "If both arms flag fewer than a quarter of the overstated cases, report-reading review is not the lever on S4 here":
  A flags 23.5 % and B 11.8 %, both under 25 %. **It holds.** This points to L11 and B12.
- The pilot condition (net gain of 3 or more, with false-alarm gain under half of it) is not met.

## What was not tested
- Any project but the clinic. The FixFlow product, this repository and the research run keep no list of
  overstatements with their verdicts.
- Reviewers with access to code, tests or the evidence files the reports cite. By design the reviewer reads only the
  report text. Several reviewers said the claim matched its report while the case file did not show the evidence
  behind it.
- The 13 cases with no second version on record (8 overstated and 5 accurate). None was generated. A generated second
  version, a re-write of the report by the slice, is a different form of L6 and was not tried.
- Other forms of the mechanism: a reviewer told what changed between the versions, a diff instead of two full texts,
  a model other than Opus, or several reviewers voting.
- Power: about 20 cases a class, with 2 discordant pairs a class. A small true gain for arm B cannot be ruled out.

## Tokens (input + cache creation + cache read + output, once per message id)
- Reviewers, all 74 (refute: Opus): 13.77 M over 222 calls. Arm A: 37 reviewers, 6.83 M, mean 184 K. Arm B: 37
  reviewers, 6.94 M, mean 188 K. The second version costs about 3 K a reviewer (+1.7 %). The first attempt's estimate,
  +18 K, came from 5 reviewers per arm.
- This unit (replay-L6b): 64 reviewers at about 11.98 M, plus this coordinating window at 2.21 M before this file was
  written (tokens-self.mjs). That is about 14.2 M against an expected 13 M and a limit of 16 M. No cases were cut.
- The whole replay: case builders 12.40 M + first analyse session about 5.1 M + reviewers 13.77 M + this window about
  2.4 M, about 33.7 M.

## The seven measures
- Quality: arm B is no better. Detection fell by 2 of 17, and false alarms rose by 2 of 20.
- Hallucinations: arm B's 3 false alarms are reviewers calling an accurate claim overstated. All 3 were at confidence
  under 70.
- Token count and cost: +1.7 % a reviewer for the second version.
- Time: a reviewer took 9 to 19 s.
- Throughput: about 4 reviewers in 15 s, under the cap of 4 at once.
- Efficiency: with no gain, the extra tokens buy nothing here.

## First attempt (replay-L6, stopped at LIMIT, kept as the record)
**Answer then: not measured. The unit reached its 20 M limit after 10 of the 74 planned reviewer calls, and no case
ran in both arms.** Of the 10 unpaired verdicts (unpaired-10.txt), arm A flagged 1 of 2 overstated cases (c05, G09-14;
missed c03, GC-03) and 0 of 3 accurate ones. Arm B flagged 1 of 2 overstated cases (c06, G02-02; missed c02, GC-06) and
1 of 3 accurate ones (c10, OK-s10-1). Those 10 verdicts are kept and form part of the 37 pairs above.

What was built and is reused unchanged:
- SCORING.md was written before any count. It is unchanged.
- 50 cases from the clinic records (cases-src/): 25 overstated, from A2-05 and A2-06, and 25 accurate controls from
  the same reports. 37 have a second version on record and 13 have none (assemble-out.txt). Of the 37 second versions,
  10 are an earlier commit of the same file (source a) and 27 are another text by the same worker in the same round
  (source b). The dropped findings, each with its reason, are in the builders' meta notes: G00-13, RR-2, G09-02,
  faster-check "section 13", "Completion was overstated" and G10-23.
- 74 blinded case files (cases/), key.json with a fixed-seed shuffle, BRIEF-reviewer.md and tally.mjs.

The first attempt's tokens: 3 Sonnet case builders, 12.40 M over 116 calls. The analyse session, about 5.1 M. 10
reviewers, 1.79 M. The plan had put case building at nothing, and case building used most of the 20 M limit.
