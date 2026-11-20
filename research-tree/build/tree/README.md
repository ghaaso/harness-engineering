# The research run's tree, as nodes and lines

Asked by the owner on 2026-11-20 ("give me the correct tree as well"). One picture, two trees side by side. Every agent is
one node; a line joins it to the one that starts it. Dark = session, light = helper, dashed = only if needed. Figures
are not on the picture; they are in `research-tree/build/COMPLEXITY.md` and `PILOT-PLAN.md`.

Files: `research-run-tree.png` (1870 x 2484, light), `research-run-tree.svg`, `research-run-tree.drawio` (one cell per
node, one connector per line, frames as rectangles), `build/tree.mjs`, `build/shoot.sh`.

## Left: the plan chosen (COMPLEXITY.md version 2, path e2)
111 nodes: 1 session, 108 helpers, 2 dashed. All seven fields are drawn.
- Coordinator (a Fable session, COMPLEXITY.md:217-219) starts: the problem sheet and the planted copy (:220-221),
  seven field helpers (:222), the closing helper (:228).
- Each field helper (Opus) has 12 helpers (:222-227): five readers (the 5 is from :129, "3 x (1 + 5 readers)"), the
  report writer (who also reviews the planted copy, its same window), the quote gate, the fresh refuter (who writes the
  fresh review first), the blind scorer, the fold, the extraction, the record check.
- Closing helper (:228-230): a fresh reader per field (seven sample readers), the fold in packets, the draft board, the
  recall test, the synthesis, its refuter, its fold, his page.
- Dashed: "Split leaf" = where a field would split when its questions outgrow one window (B-link split, protocol v2
  :462, R49 :467-469; section 5 itself has no split, so it hangs from the coordinator, not from one field). "Successor" =
  the coordinator's hand-over to a successor, needing his typed turn (COMPLEXITY.md:247-248).

## Right: the plan as it was planned (PILOT-PLAN.md version 2, and the sketch he saw)
28 nodes: 11 sessions, 15 helpers, 2 dashed. The full run is the coordinator with the fields as leaves, readers under
each; six leaves are shown as "Field 1-6" with one "Readers" node each (folded, the plan gives readers one node, row 14),
and the pilot is the seventh leaf, T, with "T's readers" (rows 13-14, PILOT-PLAN.md:47-48). The seven fields follow
COMPLEXITY.md:13 (the sketch said eight with lane 1; lane 1 is the problem sheet, not a field).
- Framed apart, in the pilot's cost list (:37-54): "Design checks and tests" = Control, Canary, STPA, FMEA, Mapper
  (rows 8-12); "The pilot's test" = S1, S2, R1, R2 (rows 16-19), Checkers and Scorer (rows 20-21).
- The ten child sessions of the plan (:17 and row 7) are drawn as sessions: T, Control, Canary, STPA, FMEA, Mapper, S1,
  S2, R1, R2. Checkers, scorer and readers are helpers. R_same (row 15) has no node: it is T's own window.
- Not drawn: the preparation nodes 1-6 (P3.1, P3.2, run root, inputs, fix round, top session), which are not in the
  coordinator's tree. Dashed "Split leaf" and "Successor" as on the left (PILOT-PLAN row 7: 17-38 successors).

## Rebuild
`cd research-tree/build/tree && node build/tree.mjs && TMPDIR=<a scratch folder> bash build/shoot.sh research-run-tree.svg research-run-tree.png`
(headless Edge; the node counts print). Names come from the two plan files; "Field n", "Reader n", "Sample reader n" are
numbering of them.
