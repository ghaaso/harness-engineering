# Protocol addendum 6 — post-run record and reporting rules

Written 2026-11-13, after the held-out run was scored and three refuters had reported. It changes
no answer, no score and no verdict. It corrects the record and binds how the result is reported.

## A. The run

1. 89 of 89 declared invocations ran once each (05:55 to 06:40 UTC). No repeat, no superseded
   file, no undeclared run. Code hashes at the run equal the frozen records. Input hashes before
   and after the run equal the pre-flight record. Scoring started at 06:43 UTC, after the last
   answer file.
2. An independent scorer reproduced 1,151 point values to four decimals and all 46,200 per-task
   values. No verdict word changes under it.

## B. Corrections to the record

3. Touched questions are 8, not 7. The search arm's target for question 25 also changed in
   pre-flight fix round 1. The untouched subset is 22 questions (without 24, 25, 27, 33, 40, 41,
   46, 47). H4 is reported on 30, on 23 (as declared in addendum 5) and on 22. The verdict rule
   is unchanged.
4. The LadybugDB setting fix (addendum 5 item 2). The fix lane found the defect on its own probe.
   The second pre-flight audit then worked out from the facts that it would hit held-out question
   47, which made it blocking; the third audit worked out the expected typed answers for
   questions 25, 33, 41 and 47 the same way. No reference answer was used in either.
5. Identity. The three typed arms' shown answers are identical to the reference arm and to each
   other on 770 of 770 held-out tasks. The hash of the full ranked list, beyond what is shown,
   differs on 5 primary tasks for SQLite and 3 for DuckPGQ.
6. Question 40. The cut-back rule changed the target, but the typed arms still answer it empty.
7. Mounts. Every arm container mounted the live working tree read-only. It holds the full git
   history and untracked copies of the sealed notes and statistics (no held-out answer or id).
   Keeping later commits out of reach rested on the arm code, which exports the parent commit
   only. A re-check on 10 sampled held-out tasks found nothing from the task commit in the facts
   or the search tree.
8. Two containers ran at once, so the plan's order held within each arm only.

## C. Reporting rules (binding on every summary of this test)

9. H1 and H2 are worded: "the three implementations compute the same answers from the same facts
   with the same method". Never: "graphs add nothing".
10. H1b is worded: "adding a stored community prior to personalised PageRank gave no gain of 0.05
    recall or more". All five draws and the T2 row are shown with it. The PageRank iterations run
    in application code; only the community grouping comes from the engine.
11. Every H3 verdict is shown with the split by where the seed file lives (mobile app, backend,
    web) and with the change of mix between tuning and held-out (mobile seeds 17 % to 36 %). The
    web figure is given with and without the one root-level task.
12. The co-change floor comparison is shown with its sensitivity checks (the five most favourable
    commits dropped; seeds matched by id only).
13. The search arm is called a scripted search. It is not an agent searching.
14. Question tokens are shown two ways: the size of the final answer, and what the scripted search
    read to reach it. The typed side's own costs (knowing the schema, the query programs written
    per question kind) are named as not counted.
15. T3 is reported clustered by task (as scored) and by parent commit. It carries a sign, not an
    effect size.
16. The question recall convention is stated: a non-empty answer to an empty reference counts as
    recall 1; F1 is 0 either way.
17. The first-written tie rule's choice (S1) scored 0.011 higher on held-out than the amended
    choice [-0.004, +0.026]. That is shown; it supports no claim about either rule.
18. The sentences in the refuters' must-not-claim lists (`build-e/result.json`) may not appear in
    any report, in those words or by implication.

## D. Not shown by this test

19. Whether an agent finishes a task faster or with fewer mistakes with any of these tools. No
    agent was run.
20. Context that a change needed but did not edit. The reference is what the commit changed.
21. Any other repository.
22. Engine speed, size and effort, until the timing run (H5) reports.
