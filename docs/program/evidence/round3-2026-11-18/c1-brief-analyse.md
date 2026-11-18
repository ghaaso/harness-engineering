# c1 step 2 brief: analyse (Opus)

Repository root: `C:\Users\User\Documents\projects\harness-engineering`. `R:` = `docs/program/evidence/round3-2026-11-18/`.

## Read
1. `R:ROUND.md` (sections "What the owner asked", "The report", "Limits") and `R:lane-check.md` (all; "What the
   report must settle" is your checklist).
2. The five collect files `R:c1-collect-{queue,group,mergeq,shorter,bottleneck}.md`. Where a claim you make rests
   on a quotation, open the paper text it cites (`R:papers/check/<short>/paper.txt`) at that line and confirm it.
3. What our lane and tree do today: `bash library/lookup.sh -f b1-01NN` for b1-0101 to b1-0126 (or
   `grep -h '"id":"b1-01' library/journal/2026-11-18/b1.jsonl`), and `docs/program/evidence/bottleneck-2026-11-18/BUILD-IN.md`
   section 1, only the parts on the check step (grep `check`, `lane`, `suite`, `slot`). Do not read code.
4. Our rule's formula: grep `docs/program/evidence/bottleneck-2026-11-18/DECISION-RULE.md` for `saturation`,
   `slots`, `check`, `N*`, and read those ranges only. Library records it rests on: r57-0408, r57-0129, r57-0127,
   r57-0103, r57-0306, r57-0307, r57-0309, r57-0610, o2-0403 (`bash library/lookup.sh -f <id>`).
Never read a file over 300 lines whole: grep, then read a range.

## Write two files
`R:c1-claims.md`: every claim the report makes, numbered C01, C02, ... One block each: the claim in one sentence;
its mark (`proven` in the literature / `measured here` / `hypothesis`); the exact quotation; the path of the
paper text and its line (`R:papers/check/<short>/paper.txt:N`) or the library id and the place it cites; the
conditions under which it holds. A claim with no quotation is a `hypothesis` and says what it is inferred from.

`R:c1-report.md` (draft), in the format of ROUND.md "The report":
1. The answer in at most ten lines.
2. One table: conclusion | where it comes from (claim ids) | measured gain and its conditions | what the refuter
   left (write "pending" now) | what is still a guess for model sessions | what it would change in our rule or tree.
3. The five points of the lane file, each settled in its own short section:
   (a) the model and its formula for the number of workers, in ratios, for one slot and for c slots, with and
       without batching, and where our rule's formula stands against it (same, special case, or wrong, and why);
   (b) for batching, testing ahead and a shorter check: the largest measured gain, at what failure rate and suite
       length, and what each needs to know about a project before it can be used;
   (c) which hold for a check of seconds, of minutes and of an hour, and for 3 and for 16 workers (a small grid);
   (d) what our lane and tree do today at the check (from b1 and BUILD-IN.md section 1);
   (e) a ranked proposal for our check, by expected gain; each part marked proven / measured here / hypothesis,
       with the measurement that would set its number, and how it behaves from small to very large projects.
4. What was not found and what was not opened, with what was searched (from the collect files).
5. Proposed corrections: any existing library record the findings contradict (for example a record or a known gap
   saying a shared check is in no paper, or the rule's formula marked `reasoned` when a source states it), with
   the record id and the claim id that contradicts it.
State how each conclusion was reached (ruling r57-0027). No number is guessed: a missing number is named as a
measurement. Nothing is tuned to one repository (r57-0028).

## Rules
Reading and writing only: no test, measurement, install, git write. Write only the two files above.

## Return (at most ten lines)
The two paths; the claim count by mark; the answer in three lines; the proposed corrections by id.
