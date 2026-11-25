# Brief: the research run's map, redrawn to read at first glance (helper of top session 2; kind build, Sonnet)

The owner, 2026-11-20, to top session 2: "regarding the agent tree you didnt generate properly and gave me a ascii tree
which weas a waste in readibility standards, i need the proper map in draw.io".

## What exists
`research-tree/build/tree/` (made by top session 4's helper at 18:55 local): `research-run-tree.drawio`, `.svg`,
`.png`, the generator `build/tree.mjs`, the screenshot script `build/shoot.sh`, `README.md`. Its nodes and names are
right (README: left tree 111 nodes, right tree 28). Its layout reads poorly: a left-to-right tree 1870 x 2484 px, the
seven field blocks stacked down one narrow strip, about two thirds of the width empty, small text; the first glance
does not show coordinator, then fields, then each field's helpers.

## Draw
The same two trees with the same node names and counts, plus one node "You" (the owner, in its own colour) above each
coordinator, since he opens it (`research-tree/build/COMPLEXITY.md` line 217; `research-tree/build/PILOT-PLAN.md`).
Top-down, like an organisation chart:
1. Band 1, "As chosen": You, then Coordinator, at the top centre. Under the coordinator one row of columns joined by a
   horizontal bus line: [Problem sheet and Planted copy stacked in one column], Field 1 to Field 7, Closing helper,
   [Split leaf and Successor stacked, dashed]. Under each field its 12 helpers in one vertical list (a vertical bus at
   the column's left edge, a short stub to each); under the closing helper its 14.
2. Band 2, "As planned: the full run, with the pilot inside it (the pilot is leaf T)", below band 1, full width: You,
   then Coordinator, at the top; one row under it: Field 1 to Field 6 (each with its "Readers" node beneath), T (with
   "T's readers" beneath), Split leaf (dashed), a frame "Design checks and tests" (Control, Canary, STPA, FMEA,
   Mapper), a frame "The pilot's test" (S1, S2, R1, R2, Checkers, Scorer), Successor (dashed). Sessions and helpers
   coloured as in the old picture.
3. At most 1870 px wide; node text at least 14 px; no text cut or overflowing its node; no line crossing a node; one
   legend line (You, session, helper, dashed = only if needed, framed = a test apart from the tree); the old title. No
   figures, models or tokens on the picture.
4. The .drawio: uncompressed XML that the draw.io app opens; one vertex per node, one edge per line with its waypoints
   in the edge geometry so draw.io shows the same routes as the SVG; frames as rectangles behind their nodes. Check
   that it is well-formed XML and that the vertex and edge counts match the node and line counts.

## Files
New files only, beside the old ones: `research-tree/build/tree/build/map.mjs` (start from `build/tree.mjs`: read and
copy it, change nothing there), `research-tree/build/tree/research-run-map.drawio`, `research-run-map.svg`,
`research-run-map.png` (through `build/shoot.sh` with `TMPDIR` set to your scratch folder) and
`research-tree/build/tree/MAP-README.md` (what it shows, node counts, how to rebuild). Scratch folder:
`C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/957a3bc0-ad3a-48a1-9f83-846a60b75555/scratchpad/map/`.

## Rules
Change no existing file: top session 4 owns the files now in `research-tree/build/tree/`. Never touch
`docs/program/pipeline-diagram/` or `docs/program/agent-session-map/`. No install, download, web request, session or
helper start, or commit; no command over 150 s. Read the memory notes `feedback-readable-without-removing.md`,
`feedback-tree-is-nodes-and-lines.md` and `reference-local-page-build-and-preview.md` in
`C:/Users/User/.claude/projects/C--Users-User-Documents-projects-harness-engineering/memory/`. Open the PNG with the
Read tool and fix what does not read before you return.

## Return
The paths, the node count of each band, the PNG's size, one line on anything you could not make read, and your token
count: expected about 1 M, limit 2 M; counter `node research-tree/build/tools/tokens-self.mjs "research run map"`.
