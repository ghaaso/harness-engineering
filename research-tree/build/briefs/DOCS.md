# DOCS: bring the research tree's guide documents up to date before the build (2026-11-19)

Kind build, Sonnet. Asked by the top session on the owner's go of 2026-11-19. Commit nothing.

**Task.** Apply rows 9 to 13 and 16 of `research-tree/build/check/B-documents.md` (each row's "Fix" column) to
`research-tree/RULINGS.md`, `research-tree/START-HERE.md` and line 3 of `research-tree/BUILD-PLAN.md`, with
today's state instead of the row's where they differ:
- The orchestration document `research-tree/ORCHESTRATION.md` is final (task r57-0517) and the owner gave his go
  for the build on 2026-11-19; the build is run by one root session (Fable) that follows it; P0 and a plan gate
  (`.claude/hooks/plan-gate.mjs`, being built now) come first. START-HERE's "Next" row says that.
- The lane's slots: "set in `research-tree/lane/capacity.txt`; the build's value and why are in ORCHESTRATION.md
  section 6" (do not write a number: it is being re-measured now).
- The hand-over figure: "computed in ORCHESTRATION.md section 5 (root about 129 K, Opus helpers checkpoint at
  about 330 K); r57-0404's 133 K was a hypothesis".
- Enforcement (row 10): the tier hook, the record guard, the start hook and the commit check (r57-0151, r57-0154;
  `library/README.md`, "What enforces these rules"), and the plan gate for the build; leave
  `research-tree/tcb/agents/*.md` unchanged (the build builds the tree's scripts; it does not use them).
- Widths (row 13): r57-0414's limits; the build's widths are ORCHESTRATION.md section 6.
Change only the lines these rows name; keep each document's style (short, plain words). Look each cited record
up with `bash library/lookup.sh -f <id>` before you cite it; never cite a record you have not read.

**Rules.** Archived files (`recovered/`, `docs/program/evidence/`, files in `migration/source-manifest.json`) and
the journal are never edited (the record guard refuses it). **Done** = the edits made and
`research-tree/build/units/DOCS/result.md` listing each row, the file and line changed, old and new text in one
line each, anything not done and why. **Tokens (r57-0038):** expected 1.8 M (read helpers, 1.1-4.7 M), limit
4.7 M. Return at most 6 lines.
