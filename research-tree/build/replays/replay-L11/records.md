# Proposed library records from replay-L11 (for the top session to write)

1. kind result, status measured. "Done claims that reached a later gate or refuter were contradicted in 79 of 94 clinic
   gate reviews (84 %, 25 with a P1), 7 of 20 build unit results here (35 %), 6 of 50 FixFlow PR reviews (12 %, 5
   blocking)." Evidence: `research-tree/build/replays/replay-L11/judged.jsonl` (counts printed by judged.mjs);
   RESULT.md table 1.
2. kind result, status measured. "The narrow L11 rule (accept done only against an executed check) would have caught
   about 1 of 92 contradicted code claims. All 7 contradicted build units already had passing lane tests, and 78 of 79
   clinic contradictions came from reading, not from a check (one, a7f29a, is the check's mypy step)." Evidence:
   judged.jsonl (field `by`); `research-tree/build/refute/{W3,W5,S2.1,P0-GATE}.md` line 1; STATE.md:48, 669.
3. kind result, status measured. "Over all helpers here, 84 of 183 code-helper DONE reports (46 %) had no passing check
   after their last edit: H 32/80, FF 37/67, CL 10/29, RUN 5/7. 11 said DONE after a failing last check (regex,
   unread)." Evidence: replay-L11/claims.jsonl via scan.mjs; RESULT.md table 2.
4. kind result, status measured. "What contradicted the 7 build units: the full suite at the merged head 2 (W3, W5),
   mutations 2 (S2.1, S0.5), a model check 1 (W6), probes on copies 2 (P0, GATE)." Evidence: judged.jsonl, H rows.
5. kind decision proposal, status reasoned. "Do not pilot L11's narrow form (SCORING rule 2). Read the 11
   DONE-after-red helpers first. Fold L11 into a merged-head suite plus guard-mutation test with B12 and L8. L6 is the
   lead for the clinic's reading-found contradictions." Evidence: RESULT.md "What it changes next".
6. kind mistake or limit, status observed. "A transcript linker that ties a refuter to the claim it judges by shared
   description words over-links (reviews of other slices share 'Opus', 'refute-review', 'screens'). Link by the
   reviewed target named in the review (slice, unit, PR, head SHA)." Evidence: claims.jsonl field `later`;
   RESULT.md departure (1).
