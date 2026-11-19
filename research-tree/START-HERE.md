# Research tree: the board

This is the research tree's board. Open only the row that fits your purpose. Root `CLAUDE.md` binds every session.
Written on 2026-11-18 by the session that ran the R57 round, after the owner's corrections of that night.
Facts marked (record) come from the commit or document named beside them: check them at their source. The five digests (SELECTIONS-MAP, DESIGN-RECORD, ATTACK-AND-COST-RECORD, FIX-VS-SELECTIONS, BUILD-SIZE) were extracted by small-model readers and are not checked row by row. Rows marked "rest cut" are incomplete.

## Where it stands

| Piece | State | Where |
|---|---|---|
| The design of the tree | Version 2: "the 21 problems fixed with solved designs" (record: commit b869685e) | `docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md` |
| The research behind the design | Done on 2026-11-16 and saved: each problem mapped to its field, the designs chosen, the cost model, the first protocol model and its review, the attack on the result | `docs/program/evidence/research-tree/foundations-2026-11-16/` and `attack-2026-11-16/` |
| The trusted scripts | Built in 31 stages, 20,560 lines. Suite 965 pass, 0 fail; end-to-end 232 of 232 (record: commit 78ce77f1) | `research-tree/tcb/`; the build's record is section 16 of the protocol |
| The protocol model | Groups 1 to 5 run and finished (record: commit 1a82fe4e) | `research-tree/model/results/` |
| The R57 round | Found faults in the scripts as built, with failing traces. Thirteen fix designs. None built | `research-tree/notes/section17-draft-2026-11-17.md`, `notes/r3-changes.md`, `model/as-built/` |
| The transfer | The recorded research, the build's size and the orchestration contract are in the files named here | this page |
| Not done | The thirteen fixes in the scripts; the checks that need the app; the pilot; a first run of the tree | |

## Open only what your purpose needs

For how to run helpers: the method is `docs/ORCHESTRATION-DESIGN-2026-10.md` (sections 4.6 and 5; its section 3 is the FixFlow tier guide: the routes in force are `.claude/hooks/tier-routes.json` as changed by r57-0035, and where they differ the routes and the rulings win). Which of its rules ran and worked, which failed and which were never run is in `docs/program/evidence/harness-method-status-2026-11-18/README.md`. No skill exists for tree work: the one written on 2026-11-18 was discarded.

| Purpose | Open |
|---|---|
| Deciding or designing a mechanism | `research-tree/SELECTIONS-MAP.md`, `research-tree/DESIGN-RECORD.md`, `research-tree/ATTACK-AND-COST-RECORD.md`; the decision at its record line, not the digest |
| Planning the build | `research-tree/BUILD-SIZE.md`, `research-tree/ORCHESTRATION.md` (final, r57-0517), `research-tree/BUILD-PLAN.md` (drafted 2026-11-19, an input to it) |
| Building a file | `research-tree/model/as-built/FIX-fence.md`, `FIX-wake.md`, `FIX-JOIN.md`; `research-tree/notes/r3-changes.md`; `research-tree/FAULTS-AND-FIXES.md` |
| Verifying | `research-tree/FAULTS-AND-FIXES.md`, the failing traces `model/as-built/CEX-fence.md` and `CEX-wake.md`, section 16 of the protocol |
| Running the pilot | Section 10 of `docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md` |
| Reporting to the owner | `research-tree/RULINGS.md` |
| Opening any session | `library/INDEX.md` (the start hook injects it) |

## Next

The orchestration document (`research-tree/ORCHESTRATION.md`, r57-0517) is final and the owner gave his go for the build on 2026-11-19. One root session (Fable) runs the build and follows it. P0 and the plan gate (`.claude/hooks/plan-gate.mjs`, being built) come first; then slice 0 of `research-tree/BUILD-PLAN.md`.
How many sessions run at once is computed (r57-0414; ORCHESTRATION section 6), not guessed here.

## Do not use

`research-tree/notes/r57-decision-sheet-2026-11-17.html` and its published page ask the owner 29 questions, and he rejected being asked. It is still a complete list of the open branches: treat each as something to derive or to measure.
