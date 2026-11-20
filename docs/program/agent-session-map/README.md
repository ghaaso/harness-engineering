# Agent and session map

Who started whom: the owner, his two sessions, the top session's four child sessions and root 2 under root 1,
with every helper (subagent) of each session. Brief: `BRIEF.md`. Session list: `sessions.json` (read 2026-11-20 03:44 UTC).

## Files
- `agent-session-map.png`: the picture to look at (1860 px wide).
- `agent-session-map.svg`: the same drawing as vector.
- `agent-session-map.drawio`: editable draw.io file with the same geometry (every text line is its own cell; the
  lines between boxes are connectors with the start time beside them). Not opened in the web app (CLAUDE.md rule 4).
- `build/build.mjs`: the generator. `build/helper-tokens.mjs`: the token method, copied. `build/shoot.sh`: PNG by headless Edge.

Build time: 2026-11-20 03:48 UTC (printed in the picture's heading). Counts at that time: 7 sessions, 101 helpers,
about 1,039.7 M tokens (sessions 242.9 M, helpers 796.7 M).

## Rebuild
    node docs/program/agent-session-map/build/build.mjs
    bash docs/program/agent-session-map/build/shoot.sh docs/program/agent-session-map/agent-session-map.svg docs/program/agent-session-map/agent-session-map.png
A close-up: add `x y w h` after the PNG path (a region of the SVG). Edit `sessions.json` to add sessions.

## How tokens are counted
Per message id the largest of each usage field; total = input + cache creation + cache read + output. A session's own
tokens come from its own transcript; each helper is counted from its own file under `<session>/subagents/` and is not
included in its session's figure. Only usage, timestamps, `message.model` and the meta files are read, never message text.

## How the helper lines are built
- A helper's unit is the first capitalised word of its description after the kind (e.g. `S2.2`), taken as a unit only if it is
  in `research-tree/build/plan.json` or one of the top session's own names (P0, GATE, LANE, DOCS, FIX-GATE, FIX-GUARD).
  Helpers without a unit get their own line with the description.
- Root 1's helpers are grouped by slice from the plan's batches (B0a, B0b = slice 0; B1-* = slice 1; S2 = slice 2); a helper
  whose unit is not in the plan is under "Other".
- In a unit line, `→` means the next helper started after the one before it ended (a successor or a following step), `+` that they
  ran at the same time. A helper started by a helper (`parentAgentId`) is indented under its parent's line with `↳`.
- A helper is running when `finished` is not true in its meta file at build time. Session state is `isRunning` from `sessions.json`.
- A session's model is the model on its assistant lines; the helper's model is its meta `model`.

## Checked
The PNG was looked at whole and in close-ups (top session, check-plan session, root 1 slices 0 and 1, root 1 foot, root 2): no cut,
overlapping or unreadable text; helper lines are 14 px, session titles 19 px, light background. The line colour of a model and the
counts (65 helpers in root 1: 16 + 48 + 1) were compared with the data.
## Not checked
- The draw.io file was only checked as well-formed text, not opened in draw.io; its fonts wrap a little differently from the PNG
  (every line is a separate cell with no wrapping, so it should match).
- "Started" times are each transcript's first timestamp, not the app's creation time (the top session's two agree).
- The top session's own transcript was still growing at build time; its figures change with every rebuild.
- Successor links come from timing only, not from the helper descriptions.
