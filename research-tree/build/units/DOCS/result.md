# DOCS result (2026-11-19). Nothing committed. Records read with lookup.sh -f: r57-0127, 0151, 0154, 0404, 0414, 0035, 0034, 0517.

| Row | File, line | Old -> new (one line each) |
|---|---|---|
| 9 | RULINGS.md "Heavy commands" bullet | "one at a time (the build session's rule of 2026-11-17)" -> "slots set in lane/capacity.txt (r57-0127); the build's value and why in ORCHESTRATION section 6" (no number written) |
| 10 | RULINGS.md "Not enforced yet" (retitled "What is enforced, and what is not") | "Only the model tier is mechanical ... proposal is withdrawn" -> tier hook, record guard, start hook, commit check (r57-0151, r57-0154), plan gate for the build; text rules remain; tcb/agents unchanged and unused by the build |
| 11 | RULINGS.md "The ceiling" bullet | "a recorded figure ... 133,000" -> "a derived figure ... computed in ORCHESTRATION section 5 (root about 129 K, Opus helpers checkpoint about 330 K); r57-0404's 133 K a hypothesis" |
| 12 | RULINGS.md "How the work is run" first bullet; START-HERE.md "For how to run helpers" paragraph | "sections 3, 4.6, 5 are the method / tiers are in section 3" -> "section 3 is the FixFlow tier guide; routes in force are tier-routes.json as changed by r57-0035; routes and rulings win" |
| 13 | RULINGS.md lanes bullet | "computed by the plan check from four limits" -> r57-0414's widths (memory, processor, bandwidth, ready work, check, token windows, parent's context); build's widths in ORCHESTRATION section 6 |
| 13 | START-HERE.md "Planning the build" row, new "Opening any session" row, "Next" | "(being drafted)" -> ORCHESTRATION final + BUILD-PLAN an input; added row pointing to library/INDEX.md; Next -> go given 2026-11-19, one Fable root session follows ORCHESTRATION, P0 and plan gate first, then slice 0; widths computed |
| 16 | BUILD-PLAN.md line 3 | appended "It is an input to the orchestration document, not the document." |

Not done: the plan gate file does not exist yet (named as "being built"). Row 16's other part (writing ORCHESTRATION) was already done. Rows 14, 15, 17-20 were not in scope. START-HERE keeps its older "Where it stands" and "Do not use" sections unchanged.
