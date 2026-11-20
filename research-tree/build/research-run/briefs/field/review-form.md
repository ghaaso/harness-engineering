# The fixed review form (both arms of field f{n})

Both reviews of field f{n}, the one written in the research window and the one written fresh from the claims, use
this form and nothing else, so that the blind scorer compares like with like. Sources: protocol version 1 section 5
step 4 (`H:docs/program/RESEARCH-TREE-PROTOCOL-2026-11-16.md` lines 66-71: per approach, what we assumed, what the
literature says, a verdict, the strongest form, the expected effect on the seven measures, the cheapest decisive test,
what would change the verdict; every factual sentence cites, the rest is judgment); protocol version 2 R18 and section
11 (`H:docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md` lines 226-230, 737-743: a sentence is fact or judgment,
cites, and states the scope it applies to; plants found with the right reason, citation failures, use outside
conditions); the built form of both (`H:research-tree/tcb/briefs/fresh-reviewer.md` lines 16-19: verdict words,
findings on our files with reason `wrong-assumption`, `wrong-number`, `wrong-scope`, `other`).

## What you review
The files `RUN:planted/INDEX.md` lists for f{n}, read under `RUN:planted/`: copies of our own files. Review every
claim in them that bears on this field, whether or not anything points you at it.

## Rules
- A row of kind `fact` states only what its cited source states, any number in it equals the source's, and its
  condition stays inside the source's conditions. A row that goes further, or cites nothing, is kind `judgment`.
- A source is a place: `RUN:papers/f{n}/<short>/paper.txt line N` (or `page.txt line N`) with a quote of at most 25
  words, or our file
  `planted/<path>:<line>` for what our file says. Never a claim id, a collect file, a report or a library id alone.
- Our place is `planted/<path>:<line>` (the line where the claim of ours stands) with the claim quoted, at most 25 words.
- No line names who wrote the review, its window, its arm, its model or its session; no heading or line before the
  first table but the title. Every table row begins with its id cell (`| W1 |`, `| A1 |`): the blinding script
  (`RUN:tools/shuffle.mjs`, lines 8-10) masks the whole words R_same, same window, refuter(s), writer(s), fresh and
  arm(s), drops a heading that holds one, and drops a line outside the tables that begins with arm, reviewer, review
  by, writer, author, produced by, written by, model, session or window and a colon; lines on sources and files stay.
- At most 40 rows in table 1, one row per approach in table 2, at most 80 words a cell. Rows in the order of our file
  and line.

## The review (write exactly this)
```
# Review of field f{n}

## 1. Claims of ours that the sources contradict or bound
| Id | Our place | The claim of ours (quoted) | What is wrong with it (reason: wrong-assumption, wrong-number, wrong-scope or other; then at most 40 words) | Kind | Source with its place (quoted) | The condition it holds under (task, model, language, repository size, metric, baseline, as the source states) | Measure (one of the seven) |
|---|---|---|---|---|---|---|---|
| W1 | planted/<path>:<line> | "..." | wrong-number: ... | fact | RUN:papers/f{n}/<short>/paper.txt line N: "..." | ... | token count |

## 2. Our approaches in this field
| Id | Approach of ours (our place) | What we assumed | What the sources say (places) | Verdict (promising, untested, wrong-form, wrong-problem, not-worth-testing, unclear) | The strongest form and what it needs (data, compute, card memory) | Expected effect on which of the seven measures, and the strength of the evidence | The cheapest decisive test | What would change the verdict | Kind |
|---|---|---|---|---|---|---|---|---|---|
| A1 | ... | ... | ... | untested | ... | ... | ... | ... | judgment |

## 3. Counts
| Id | Rows in table 1 | of them fact | Approaches | of them untested |
|---|---|---|---|---|
| N1 | ... | ... | ... | ... |
```
Say `untested` where the sources do not decide. A finding nobody planted is still a finding: write it.

## Changes after the review (2026-11-21)
- 12: the note on the blinding script corrected: whole words only; lines on sources and files kept.
- 5: a raw page's `page.txt line N` is a source place.
