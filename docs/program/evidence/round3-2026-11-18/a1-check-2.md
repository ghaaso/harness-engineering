# a1 step 5 check, part 2 (x45, x47, x48), Sonnet, 2026-11-19

Method: every record of the three files was parsed with node, field order and ids checked, then each claim was read against the collect file at the cited line (N-3 to N+3) and, where a number or wording was in doubt, against the paper text under `docs/program/evidence/round3-2026-11-18/papers/budget/`. The refuters' narrowings (`a1-refute-1.md`, `a1-refute-2.md`, with `a1-claims.md` A18 to A26, A44 to A52, A60, A66) were then applied to records stating the same finding. x44 and x46 are checked elsewhere. Files are not yet committed, so these are not edits of the journal.

## Counts

| File | Records | Parse faults | Order faults | Id faults | Numbers that did not stand | Records corrected (wrong text) | Records narrowed (refuter) | Records removed |
|---|---|---|---|---|---|---|---|---|
| x45 (allocation) | 34 | 0 | 0 | 0 | 0 | 0 | 6 (0300, 0303, 0308, 0315, 0316, 0319) | 0 |
| x47 (longjobs) | 42 | 0 | 0 | 0 | 0 | 5 (0317, 0318, 0319, 0321, 0328: missing size or budget, labels, wording) | 2 (0302, 0335) | 0 |
| x48 (llmbudget) | 30 | 0 | 0 | 0 | 1 (0306) | 3 (0306, 0321, 0323) plus 1 (0322) | 9 (0300, 0302, 0304, 0305, 0309, 0310, 0312, 0314, 0316) | 0 |

After the changes: x45 34 records (32 quoted, 2 summary), x47 42 (42 quoted), x48 30 (30 quoted). Ids are unique and inside 0300 to 0399 in all three; handles 3 to 6 in all; kind, date and `by` correct. Each record's evidence line number holds the finding in the collect file; each source URL is the one the collect file reads from. Company figures say "self-reported" (x47-0320 to 0324, 0332, 0333, 0335; x48-0325 to 0328 with the fetch date 2026-11-19). No `quoted` record cites a source the collect file marks `summary` or `not opened`. No refuted claim (A76 only) has a record, so nothing was removed for that reason.

## Points the extractors flagged

- x45 "31 quoted and 2 summary of 34": the real split is 32 quoted and 2 summary (34 in all). The two summary records are x45-0320 and x45-0321 (Agrawal and Devanur 2015, introduction only, collect line 64 "summary-level"), and neither is `quoted`. No record lacked a status; the 34th (x45-0333, Talluri and van Ryzin Theorem 1, collect line 96) is `quoted` and stands.
- x47-0318 and x47-0319: the row at paper.txt 546 and 557 is in Table 2, ProGen set J = 60 (caption at line 623), so 60 activities is right and the collect file's "120 activities" is a label error (claim A63). Schedule budgets 1,000 / 5,000 / 50,000 added.
- x47-0317: instance size (30 activities, Table 1) and the budget (1,000 schedules) added; the range 0.30 to 0.54 % is kept as the collect file states it, because the extracted rows are misaligned.
- x47-0321: collect line 56 says "(30 MB/s to 1 MB/s)"; the paper (line 157) says a bad disk may slow read performance from 30 MB/s to 1 MB/s. Record reworded and the note says so.
- x47-0328: paper.txt 586 and 588 give 20 % as the optimal SpeculativeCap in the sleep-workload sensitivity analysis, above the 10 % used on EC2. Record reworded.

## Log of changes

x45
- 0300: narrowed (refute A18, PARTIALLY): the 97.5, 95 and 90 percent figures hold when there is enough time to sell all items at the run-out price (lambda* t >= n), for a known demand function.
- 0303: narrowed (A19): second condition added, "can price each instance of the problem (day, flight, voyage) individually" (gvr/paper.txt 92-97).
- 0308: narrowed (A24): the approximation of the value function is usually re-solved frequently; no industry named; the deterministic programme is one scheme examined.
- 0315, 0316: narrowed (A26): Algorithm 2 gets W_E(1 - O(epsilon)) with probability at least 1 - delta for epsilon >= 1/m (devanur2/paper.txt 452-460); gamma defined as the largest share of any request in any budget or in W_E.
- 0319: narrowed (A26): no algorithm, even knowing the distribution, gets 1 - o(epsilon) on some instances.
- 0301 (A20, "understated"), 0302, 0304: no change; the refuter adds numbers, it does not narrow these quotations, and 0304 already carries min{n, lambda* t}.

x47
- 0302: narrowed (A60): before-and-after observation in a cited study, not a controlled comparison.
- 0335: narrowed (A66): job completion 32 % shorter, June runs against April-May runs of the same jobs on the earlier build, on average (paper.txt 32, 1009). 0334 matches A66's first sentence and stands.
- 0317, 0318, 0319, 0321, 0328: as above.

x48
- 0300: narrowed (A49): abstract "more than 4x"; in the PRM-search setting "nearly" outperforms best-of-N with 4x less compute "at points"; bins from an oracle or from predicted difficulty whose cost is left out.
- 0302: narrowed (A49): up to 4x less compute (16 against 64 generations) at low budgets; held with oracle and predicted bins; predicted-bin cost (2,048 samples per question) not counted; gain shrinks at higher budgets with predicted bins. The old note "check the paper's wording" is resolved.
- 0303: note added (A49): predicted difficulty is the other source of bins.
- 0304, 0305: narrowed (A50): six maths sets, GPT-4o-mini, the model estimates its own budget; under 3 percent is an average, with 8 points lost on MathBench-College (78 to 70); tokens 461 to 149 on average. 0305 notes that the text says 80.22 % while Table 3's average row reads 81.03 %.
- 0306: number did not stand as worded. "On one set TALE-EP scored 81.03 % against 83.75 %" is wrong: both are the Average row of Table 3 (tale/raw.txt 443-447, 627). Corrected to the six-set average.
- 0309, 0310: narrowed (A51): extension by suppressing the end of thinking and appending "Wait"; "six times" counts suppressions, not a multiple of tokens.
- 0312, 0314: narrowed (A44): five context-grounded datasets (two with long documents, so "short context-answer tasks" is not asserted); cost is a fixed per-query unit ratio (1 against 60, 100, 200), not tokens; the router decides on the small model's few-shot self-check.
- 0316: narrowed (A52): BrowseComp, Gemini-2.5-Pro, budget 10 against ReAct at 100, accuracy 12.8 against 12.6 percent (bats/raw.txt 1041), and 31.3 % is the unified cost (tool use plus priced tokens), not tokens alone.
- 0321, 0323: the collect file cites itbc/raw.txt line 3 for the abstract; the sentences are at raw.txt line 5. Claim text now says raw.txt 5; wording unchanged.
- 0322: wording completed from raw.txt 470: smaller "than on Qwen3-32B", on GPT-5.4-Mini.

## Not checked or left as is
- Zhou, Chakrabarty and Lukose figures (x45-0322 to 0330) were checked against the archived text where symbols survive (45 %, 64 %, 67 %, 90 %, non-trivial, ln(U/L) + 1 at paper.txt 484 and 868); formulas with lost symbols rest on the collect file and claim A27.
- Quotation marks in claims were not re-verified character by character against PDFs beyond the lines named above.
