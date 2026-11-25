# The research run's map (top-down)

The same two trees as `research-run-tree.*`, redrawn like an organisation chart, with one node "You" (the owner, green)
above each coordinator (COMPLEXITY.md line 217; PILOT-PLAN.md). Asked by the owner on 2026-11-20 ("the proper map in
draw.io"). Names and counts are those of `build/tree.mjs`; the old files are unchanged.

Files: `research-run-map.png` (1870 x 1250, light), `research-run-map.svg`, `research-run-map.drawio` (uncompressed XML;
one vertex per node, one edge per line with its waypoints in the edge geometry; the two frames are rectangles behind
their nodes), `build/map.mjs`.

## What it shows
- Band 1, "As chosen": You, Coordinator, a bus line, ten columns: problem sheet and planted copy; Field 1 to 7 with
  their 12 helpers each in one list; the closing helper with its 14; split leaf and successor (dashed).
  112 nodes (You, 1 session, 108 helpers, 2 dashed), 111 lines.
- Band 2, "As planned": You, Coordinator, a bus line, eleven columns: Field 1 to 6 (each with Readers), T (with T's
  readers), split leaf (dashed), frame "Design checks and tests" (Control, Canary, STPA, FMEA, Mapper), frame "The
  pilot's test" (S1, S2, R1, R2, Checkers, Scorer), successor (dashed). 29 nodes (You, 11 sessions, 15 helpers, 2
  dashed), 28 lines.
- No figures, models or tokens on the picture. Text is 14 px or larger.

## Rebuild
`cd research-tree/build/tree && node build/map.mjs` then
`TMPDIR=<a scratch folder> bash build/shoot.sh "$PWD/research-run-map.svg" "$PWD/research-run-map.png"`
(give shoot.sh absolute paths; with relative ones it printed no PNG here). The script prints the node and line counts and
refuses a label wider than its node. Check of the .drawio: well-formed XML, 141 node vertices (112 + 29), 139 lines
(111 + 28), unique ids.
