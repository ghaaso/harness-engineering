# Brief: the research run's tree, drawn as nodes and lines (helper of top session 4; kind build, Sonnet)

Asked by the owner on 2026-11-20 at 12:39 UTC: "since you said that what you made was not a tree and that was
incorrect, then give me the correct tree as well, so I have a better understanding." Part of the four pieces under his
cap of 106 M tokens.

## How he wants a tree (memory note `feedback-tree-is-nodes-and-lines.md`, mistake r57-0612)
- Every agent is its own node with a short name of one to four words. A line joins each node to the one that starts it.
- No models, tokens, slices or lists inside nodes; colour shows the kind of node (session or helper) and nothing else
  needs reading, with one legend line. Figures go in the README, not on the picture.
- Plain wording; it must read at about 1870 px wide, light background, with nothing dropped; look at the real PNG.
- He saw and did not object to this sketch (2026-11-20):
  ```
  coordinator (root: the question list and the separators between leaves)
  ├── leaf 1: one research session, field 1's questions packed to fit one window
  │     ├── reader
  │     └── …
  │   …
  └── leaf 8: field 8
        └── readers …
  Pilot: coordinator ── T (leaf for field X) ── readers   | S1, S2 | R1, R2 | checks
  ```

## Draw
1. **The tree of the chosen plan**: `research-tree/build/COMPLEXITY.md` version 2, section 5 (path e2) and section 0:
   the coordinator, the problem sheet written once (lane 1), one node per field (seven), and under each field every
   helper that section 5 gives it (readers, checks, the refuter, the report writer, the planted-mistake reviews, the
   scorer: whatever it lists, each its own node). Draw all seven fields with their children if it reads at 1870 px;
   else draw one field in full and the other six with the same children folded into a labelled count, and say so in
   the README. Mark, as a dashed node or line, where a field splits when its questions outgrow one window (the B-link
   split, `docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md`; library t1-0401) and where any node hands over to a
   successor, if section 5 has one.
2. **The tree as it was planned**, smaller, beside it: `research-tree/build/PILOT-PLAN.md` version 2 and the sketch
   above: the B+ tree of the full run (coordinator, the fields as leaves, readers under each) with the pilot as one leaf
   and its test (S1, S2, R1, R2, the checks) marked apart from the tree by a frame or a colour.
Every node name comes from those files; add none of your own.

## Files
New folder `research-tree/build/tree/`: `build/tree.mjs` (the generator), the picture as `research-run-tree.svg`,
`research-run-tree.png` (headless Edge) and `research-run-tree.drawio` (one cell per node, one connector per line), and
`README.md` (what each picture shows, the node count, the sources with path:line, how to rebuild). Start from the
generator and the screenshot script of the earlier agent map, `docs/program/agent-session-map/build/tree.mjs` and
`shoot.sh` (read and copy; change nothing there). How to screenshot a local page without the browser pane: the memory
note `reference-local-page-build-and-preview.md` under
`C:/Users/User/.claude/projects/C--Users-User-Documents-projects-harness-engineering/memory/`.

## Rules
Never touch `docs/program/pipeline-diagram/` or `docs/program/agent-session-map/`. Write only under
`research-tree/build/tree/` and scratch files in
`C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/340b6a42-dea1-407f-9afb-f9d304e4f79e/scratchpad/tree/`. No
install, no download, no web request, no session or helper start, no commit, no command over 150 s. Look at the PNG
yourself (open it with the Read tool) and fix what does not read before you return.

## Return
The paths of the files, the node count of each tree, one line on anything section 5 left unclear, and your token
count: expected about 1 M, limit 2 M; counter `node research-tree/build/tools/tokens-self.mjs "tree of the research run"`.
