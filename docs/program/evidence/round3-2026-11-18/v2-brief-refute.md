# Brief: refute version 2 of the decision rule (step 2b, kind refute, Opus, fresh context)

Repository root: `C:\Users\User\Documents\projects\harness-engineering`. `R:` means
`docs/program/evidence/round3-2026-11-18/`. `B:` means `docs/program/evidence/bottleneck-2026-11-18/`.

## What you see, and what you do not

You see only: `R:v2-claims.md` (the numbered statements of a draft, `V2-001`, ..., each citing lane claim ids and
their verdicts); the four lanes' claims files `R:c1-claims.md`, `R:w1-claims.md`, `R:t1-claims.md`, `R:a1-claims.md`;
their refute files `R:c1-refute.md`, `R:w1-refute.md`, `R:t1-refute.md`, `R:a1-refute-1.md`, `R:a1-refute-2.md`; and
version 1 of the rule, `B:DECISION-RULE.md`. Do not open the draft (`R:RULE-V2-DRAFT.md`), the lane reports, the
state files or any other file: your reading must not be anchored on the drafter's.

Lanes: c1, one serial check shared by many workers; w1, several writers of one object, as database engines solve it;
t1, which kind of B-tree fits a tree whose nodes are sessions; a1, a refilling token allowance and a few long units.

Read `R:v2-claims.md`, version 1 and the five refute files in full. In the claims files, search for each cited id and
read its entry and the text around it; read further only where you need it to judge a contradiction between lanes.

## Task

Try to break every `V2-` statement. For each, ask:
1. Does it follow from the claim it cites, or does it say more than the claim says?
2. Does it overstate a claim that held only in part (the verdict in the claims or refute file)?
3. Does it rest on a refuted claim?
4. Does it hide a contradiction between two lanes, or between a lane and version 1?
5. Does it smuggle in a number: a figure no cited claim measured or proved, an absolute figure where the rule must be
   stated as a ratio, or a company's own figure not marked self-reported?
6. Is it marked right: `proven in the literature` only for the field the literature covers; a transfer to model
   sessions is `hypothesis`.

Give each statement one verdict: `confirmed`, `holds in part` (say which part fails), `refuted`, or
`cannot be checked` (say what is missing). A statement is `confirmed` only if all six questions pass.

## Write

`R:v2-refute.md`: one table, a row per `V2-` id: verdict; the question(s) it fails, by number; the reason in one or
two lines, citing the lane claim or refute line you used. Then a section "Contradictions between lanes" listing every
one you found, whether the claims file settles it, and which way. Then counts by verdict.

## Limits

Reading and writing only. Write only `R:v2-refute.md`. No test, install, download or web search, no commit. Do not
touch `R:intake-*`, `library/INDEX-draft.md`, `library/tests/`. Plain words.

## Return (ten lines or fewer)

The path; counts by verdict; the three worst failures by `V2-` id in one line each; the number of contradictions
between lanes and how many the draft's statements hide.
