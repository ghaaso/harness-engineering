# recheck:T-05

lane=T-05 tool_status=ok checks=9

- F1 ON_PAGE — https://www.cs.auckland.ac.nz/~ian/CBR/AICom.pdf
    quote: 1. RETRIEVE the most similar case or cases 2. REUSE the information and knowledge in that case to solve the problem 3. REVISE the proposed solution 4. RETAIN the parts of this experience likely to be useful for future problem solving
    note: WebFetch could not decode the PDF; text read via local pdftotext of the saved file. Header also says AI Communications, Vol. 7: 1, pp. 39-59, 1994. The doi.org URL redirected to sagepub and returned 403, so the DOI page itself was not read.
- F3 ON_PAGE — https://en.wikipedia.org/wiki/Case-based_reasoning
    quote: A case consists of a problem, its solution, and, typically, annotations about how the solution was derived.
    note: The 'justification element that must be stored' framing is interpretation, not page text. The core statement is on the page.
- F6 ON_PAGE — https://folk.idi.ntnu.no/agnar/CBR%20papers/smyth-keane-remembering-95.pdf
    quote: no matter what knowledge is deleted, the system's competence is not altered; problems can always be solved from first-principles... competence had fallen to 80% and 86% of its former level for the utility and random deletion policies respectively.
    note: Read via local pdftotext. Utility = 80%, random = 86%, which matches the fact's order. Footprint deletion (FD) and footprint-utility deletion (FUD) both held 100%.
- F7 ON_PAGE — https://folk.idi.ntnu.no/agnar/CBR%20papers/smyth-keane-remembering-95.pdf
    quote: auxiliary cases are selected for deletion before support cases, which in turn are chosen before spanning and pivotal cases.
    note: Read via local pdftotext. The pivotal definition (reachable by no other case but itself), auxiliary (coverage subsumed), spanning (links regions) and support (groups; removing the whole group is analogous to deleting a pivot) all match.
- F15 ON_PAGE — https://docs.getthread.com/skill-library/change-and-problem-management/known-error-database.md
    quote: Same root cause, different symptom wording -> extend the existing entry's symptom list, never create a sibling. ... Retirement recommendations go to a human; never bulk-delete knowledge.
    note: Every sub-claim was matched in the fetch summary: symptom-first title, verbatim error text, Affects, workaround with cost and hold time, status line, evidenced-root-cause prerequisite, lookup cites date and status, lookalike cross-reference, three hygiene flags, RESOLVED retained. The small-model summary may have paraphrased some quotes.
- F17 ON_PAGE — https://sre.google/workbook/postmortem-culture/
    quote: Requiem parses out metadata from individual postmortems and makes it available for searching, analysis, and reporting.
    note: Template fields, action-item guidance (one owner, tracking bug, priority, verifiable end state, automated systems over human behaviour) and the searchable repository all supported. Wording is from a fetch summary and may be paraphrased.
- F21 PARTIAL — https://how.complexsystems.fail/ ; https://howie-guide.pagerduty.com/
    quote: Because overt failure requires multiple faults, there is no isolated 'cause' of an accident. ... post-accident remedies usually increase the coupling and complexity of the system.
    note: The Cook claims are ON_PAGE: multiple insufficient factors, hindsight bias as the primary obstacle, remedies add coupling. The Cook page says end-of-chain measures 'do little to reduce the likelihood' of further accidents, which is close to 'rarely prevent'. The Howie page fails: it never uses 'contributing factors'. It only calls root-cause analysis a legacy term with 'a history of negativity' and suggests terms such as 'learning review'.
- F22 PARTIAL — https://arxiv.org/html/2509.25140v1
    quote: constrained to at most three memory items ... Similarity search is conducted over the memory pool using cosine distance ... more advanced consolidation mechanisms (e.g., merging, forgetting) can be incorporated in future work
    note: Supported: the title/description/content items stored with query and trajectory, the LLM judge with no ground truth, at most 3 items, cosine with gemini-embedding-001, top-k=1 results of 49.7, 46.0, 45.5, 44.4, and plain-addition consolidation. Fails: the v1 page shows only 29 Sep 2025 and has no v2 date (2026-03-16) and no ICLR 2026 mention. The last 2k characters were unread. The 'relevance and quality matter more than quantity' conclusion was not confirmed.
- F23 PARTIAL — https://arxiv.org/abs/2505.16067v2
    quote: experience-following property: high similarity between a task input and the input in a retrieved memory record ... error propagation, where inaccuracies in past experiences compound and degrade future performance
    note: Supported: experience-following, error propagation, and misaligned experience replay. Fails: the abstract page has no ~10% selective-addition gain, no evaluator-accuracy limitation, and no ACL 2026 mention. The page lists v1 21 May 2025 and v2 10 Oct 2025. These claims may be in the paper body, which was not read.
