# a1 step 2 brief: analyse (Opus)

Repository root: `C:\Users\User\Documents\projects\harness-engineering`. `R:` = `docs/program/evidence/round3-2026-11-18/`.

## Read
1. `R:ROUND.md` (sections "What the owner asked", "The report", "Keeping the library clean", "Limits") and
   `R:lane-budget.md` (all; "The frame to test" is the top session's reasoning, not a finding: test it, part by
   part; "What the report must settle" is your checklist).
2. The five collect files `R:a1-collect-{pacing,allocation,quotas,longjobs,llmbudget}.md`, including any
   "Second attempt" section. Where a claim you make rests on a quotation, open the text it cites
   (`R:papers/budget/<short>/paper.txt` or `page.txt`) at that line and confirm it.
3. Our rule: grep `docs/program/evidence/bottleneck-2026-11-18/DECISION-RULE.md` for `token`, `allowance`,
   `window`, `model`, `budget`, `long`, `schedul`, `Graham`, `critical`, and read those ranges only (the table row
   "Token allowance" near line 77, the note "Tokens are a budget, not a rate" near line 80, the scheduling step,
   and the list of missing measurements near line 150).
4. The library records the rule rests on for these two parts: `bash library/lookup.sh -f o2-0501`, then
   `bash library/lookup.sh token bucket`, `quota`, `allowance`, `Graham`, `critical path`, `cheaper`, and read the
   records' cited places only where a claim needs them.
Never read a file over 300 lines whole: grep, then read a range.

## Write two files
`R:a1-claims.md`: every claim the report makes, numbered A01, A02, ... One block each: the claim in one sentence;
its mark (`proven` in the literature / `measured here` / `hypothesis`); the exact quotation; the path of the text
and its line (`R:papers/budget/<short>/paper.txt:N`) or the library id and the place it cites; the conditions under
which it holds (horizon, number of steps, distribution assumptions, spend per step against budget, what is known in
advance, scale). A company's figure says "self-reported". A provider's documentation is quoted with its fetch date.
A claim with no quotation is a `hypothesis` and says what it is inferred from.

`R:a1-report.md` (draft), in the format of ROUND.md "The report":
1. The answer in at most ten lines.
2. One table: conclusion | where it comes from (claim ids) | measured gain and its conditions | what the refuter
   left (write "pending" now) | what is still a guess for model sessions | what it would change in our rule or tree.
3. The five points of the lane file, each settled in its own short section:
   (a) the rule for spending a refilling allowance, stated in ratios (share of the window left against share of
       its time left), for one window and for two nested windows (and a per-model window), with the source of each
       part and what it must know; say whether several budgets combine as one price each summed, or the dearest
       alone, and from which source;
   (b) how that rule chooses between a dearer and a cheaper model, and the measurement it needs (quality per token
       by kind of work), with the largest measured saving at equal quality and its baseline;
   (c) the facts of our windows as the provider documents them, quoted with fetch date, and what stays unknown;
   (d) for a few long units: the scheduling method with the largest measured gain, on which workload and scale,
       and what it needs to know about a unit's length (how the gain falls as the estimate worsens);
   (e) what each part would change in the rule's token and scheduling steps, from a small project to a very large
       one, ranked by expected gain; each part marked proven / measured here / hypothesis, with the measurement
       that would set its number. Where a source's bound holds only for long horizons or many small steps, say how
       far our tens to hundreds of units per window are from that.
4. What was not found and what was not opened, with what was searched (from the collect files).
5. Proposed corrections: any existing library record or line of the rule the findings contradict (for example
   o2-0501 "no paper read covers it", or the rule's "The mapping to our windows is reasoning: no paper"), with the
   record id or rule line and the claim id that contradicts it.
State how each conclusion was reached (ruling r57-0027). No number is guessed: a missing number is named as a
measurement. Nothing is tuned to one repository (r57-0028).

## Rules
Reading and writing only: no test, measurement, install, web, git write. Write only the two files above.

## Return (at most ten lines)
The two paths; the claim count by mark; the answer in three lines; the proposed corrections by id.
