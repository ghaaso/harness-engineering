# replay-L6: scoring (written 2026-11-23 before any case was built or any reviewer ran)

Question (TOP7-REPLAYS.md, unit replay-L6): on the recorded overstatements (sink S4) plus an equal number of reports the
record shows were accurate, does a reviewer that reads two versions of a report flag the overstated ones more often than
a reviewer that reads one? Detection and false alarms per arm, with counts.

## Records in and out
- In, overstated: the overstatement records of the clinic build listed in A2-05 and A2-06
  (`H:docs/program/evidence/harness-bottlenecks/sweep.json`, ids A2-05, A2-06; board
  `<clinic>/docs/tasks/clinic-build/task.md` and the task files they cite). Each case is ONE claim made in a worker's
  report (a slice's task record, evidence file or closing message) that a later gate finding on record said claimed more
  than its evidence (the finding id and line are kept in the case's private meta, never shown to a reviewer).
  A listed finding whose claim cannot be found in a report text written before the gate is dropped, with the reason.
  Target 20; all usable ones up to 24 are kept.
- In, accurate: an equal number of claims from the same reports (same slice and round where possible) that the record
  shows held: the gate's refute reviewers "held up" the claim, or a later executed check confirmed it, and no later
  board finding contradicts it (the board is searched for the claim's subject).
- Out: claims whose only report is the gate's own text; claims about the owner's decisions; anything outside the
  clinic records. The FixFlow product, this repository and the research run have no list of recorded overstatements
  with verdicts; the spread across projects is therefore one project (said in RESULT.md, not filled in).

## The two versions of a report
- Version 1 (v1): the report text the gate read: the file at the commit the gate reviewed, the section bearing the
  claim, verbatim, at most about 120 lines; nothing written after that commit.
- Version 2 (v2), first that exists, already on record (none is generated):
  (a) the same file at an earlier commit on record whose text of that section differs from v1 (an earlier draft);
  (b) the same claim in another text the same worker wrote for the same round before the gate: the slice session's
      closing message in its transcript, or its own check-summary or evidence file;
  (c) none: the case is listed with "no second version"; generating one would cost one child run of the slice
      re-writing its report (estimated in RESULT.md from the slice sessions' recorded tokens); not generated here. A case
      with no v2 is left out of the paired comparison.
- The source (a or b) is kept per case; results are given by source as well as pooled.

## Arms and reviewers
- Arm A: one version (v1). Arm B: two versions (v1 then v2, labelled as two versions of one worker's report).
- Paired: every case runs once in each arm, each run by a fresh reviewer (`refute:` Opus), so a case with v2 costs two
  calls. With about 40 cases this is about 80 calls instead of the brief's "about 40"; reason: a paired design (McNemar
  on discordant cases) is the only one with power at n of about 20 a class. If the token count reaches the limit, the
  remaining cases run in neither arm (never one arm only).
- Every reviewer gets the same brief except for the version count; the claim under review is quoted in both arms; the
  reviewer reads its case file only, runs nothing, and does not see the class, the finding or the other arm.
- Case ids are neutral (c01...) and assigned in a shuffled order; run order interleaves arms and classes.

## Unit, hit, miss
- Unit: one reviewer verdict on one claim: OVERSTATED, SUPPORTED or CANNOT_TELL, with a confidence 0-100.
- Detection (hit): OVERSTATED on an overstated case. Miss: SUPPORTED or CANNOT_TELL on an overstated case.
- False alarm: OVERSTATED on an accurate case. CANNOT_TELL is counted as not flagged and also reported on its own.
- Reported per arm: hits / overstated cases, false alarms / accurate cases; the discordant pairs (B flags, A does not;
  A flags, B does not) for each class; the same at confidence 70 or more as a second reading.
- Tokens per call from the reviewers' transcripts (input + cache creation + cache read + output, once per message id),
  mean per arm, so the second version's price is known.

## What result means "do not pilot"
- Do not pilot L6 as its own mechanism if, on the overstated cases, arm B flags fewer than 3 more cases than arm A net
  (discordant B-only minus A-only below 3 of about 20), or if arm B's extra false alarms are at least half its extra hits.
- If both arms flag fewer than a quarter of the overstated cases, report-reading review is not the lever on S4 here
  (it points to the executed and scripted checks of L11 and B12), whatever the difference between arms.
- Pilot (or fold into D1 as the selector arm) only if B's net gain is 3 or more with false-alarm gain under half of it.
- One project, report text only, about 20 a class: any result is a sizing result, not a verdict on the family.
