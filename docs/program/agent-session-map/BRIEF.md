# MAP: the agent and session map (2026-11-20)

Kind build, Sonnet. Asked by the top session for the owner ("Yes, build it"). Write only inside
`docs/program/agent-session-map/` and your own scratchpad. Commit nothing. Start no helpers. Read
`docs/program/pipeline-diagram/` but never write there: it is another session's uncommitted work.

**Goal.** One diagram of who started whom: the sessions in `sessions.json` (beside this brief) and every helper
(subagent) under them, drawn as a tree. The owner wants a diagram file, not a page (2026-11-20): no HTML page, no
Artifact. Deliver `agent-session-map.png` (to look at), `agent-session-map.svg` and `agent-session-map.drawio`
(editable), with a `README.md`. All three are drawn by a small generator in `build/` from the transcripts, so it can be
rebuilt later.

**Data (read-only).**
- Sessions, who started whom, roles, the transcript of each: `sessions.json`.
- A session's own transcript: `<transcripts>/<transcript>.jsonl`. Its helpers: `<transcripts>/<transcript>/subagents/`,
  `agent-<id>.jsonl` with `agent-<id>.meta.json` (description, model, spawnDepth, finished; parentAgentId when a
  helper started it). A session's model is `message.model` on its assistant lines.
- Tokens: per message id take the largest of each usage field; total = input + cache creation + cache read + output.
  The method is in
  `C:/Users/User/AppData/Local/Temp/claude/af6be68e39765efe/34cb9690-1ca8-44d6-9123-a245578918d2/scratchpad/helper-tokens.mjs`
  (copy it into `build/`). A session's own tokens come from its own transcript; its helpers are counted separately.
- Units and slices: `research-tree/build/plan.json`. A helper's unit is the unit id in its description
  (e.g. "build-invariant: S2.2 model successor 2" is unit S2.2).
- Parse transcripts in node only. Never open one with the Read tool (they run to 30 MB). Use only usage, timestamps,
  `message.model` and the meta files.

**Content.**
1. The tree. You (the owner) → his two sessions (top, pipeline) → the top session's four child sessions → root 2
   under root 1. Lines mean "started", each labelled with the start time (UTC).
2. Each session box shows: title, model, role (from `sessions.json`), state, its own tokens, how many helpers and their
   tokens, first and last time. A helper's state is `finished` in its meta file at build time; mark the unfinished ones
   as running.
3. Inside each box, its helpers grouped by unit. One line per unit gives each helper's kind, model and tokens. Helpers
   that ran one after another (successors) are shown as such. A helper started by a helper is indented under it.
   Group root 1's 65 helpers by slice (0, 1, 2), then by unit.
4. A small legend (models, the running mark, what a line means), the build time (UTC), the totals (sessions,
   helpers, tokens), and one line at the foot from `not_drawn`.

Nothing is dropped: every helper appears in its unit's line. Quiet is allowed, gone is not.

**Form and readability.** First read the owner's three notes in
`C:/Users/User/.claude/projects/C--Users-User-Documents-projects-harness-engineering/memory/`:
`feedback-diagrams-pipelines-not-flat-boxes.md`, `feedback-readable-without-removing.md` and
`feedback-plain-wording.md`.
- At first glance the tree of sessions must be visible; the helper detail is for the second look.
- Use plain headings, e.g. "Sessions and helpers, 2026-11-20 04:10 UTC", with no taglines.
- Lay it out to fit 1,870 px wide at 100 % (his screen), any height. A left-to-right tree with one column per level
  fits: You, his sessions, their children, root 2.
- Helper lines at 14 px or more, session titles at 18 px or more, on a light background.
- PNG: copy `docs/program/pipeline-diagram/build/shoot.sh` (headless Edge) into `build/`.
- draw.io format: see `docs/program/pipeline-diagram/build/lib.mjs` and copy what you need. Do not open the
  draw.io file in the web app (CLAUDE.md rule 4).

**Check once, at the end.** Look at the PNG whole (Read the image), then in close-ups made with shoot.sh's region
form. Nothing may be cut, overlapping or unreadable. If something is, fix it and rebuild.

**Done** means the three picture files, `README.md` and the generator exist. The README covers: what each file is,
the build time, how to rebuild, how tokens are counted, and what was and was not checked. Return at most 6 lines:
the paths, the counts (sessions, helpers, tokens), and anything that did not fit.

**Tokens (r57-0038).** Expected about 2 M: 25 calls at the 73-74 K a call of the last page helper [c]. Limit 5 M
(the build's ratio of limit to expected, 2.5). At the limit, stop and return "LIMIT" with the state of the files.
