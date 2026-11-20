# Agents and sessions: the tree (2026-11-20)

Every session and every helper (subagent) since 2026-11-19 06:48 UTC is one node; a line joins each to the session
or helper that started it. The session list is `sessions.json` (read 2026-11-20 03:44 UTC).

## Files
- `agent-session-map.png`: the tree to look at.
- `agent-session-map.svg`: the same, as vector.
- `agent-session-map.drawio`: the same tree, editable in draw.io (one cell per node, one connector per line). Not
  opened in the web app (CLAUDE.md rule 4).
- `build/tree.mjs`: the generator. `build/shoot.sh`: the PNG, by headless Edge.
- `BRIEF.md`: the brief of the first version (boxes listing each session's helpers with models and tokens). The owner
  rejected it the same day and asked for a plain tree of the agents; that version is in commit c7da4d98.

## Rebuild
    node docs/program/agent-session-map/build/tree.mjs
    bash docs/program/agent-session-map/build/shoot.sh docs/program/agent-session-map/agent-session-map.svg docs/program/agent-session-map/agent-session-map.png
It reads each session's helper meta files again, so new helpers appear. A new session is added to `sessions.json`.

## How the nodes are named and ordered
- Sessions have a short name each (in `tree.mjs`).
- A helper is named from its description: its unit id and kind of job (`W1 build`, `W1 review`); a second or third
  helper of the same unit and kind is numbered (`W1 build 2`). A helper without a unit id is named by the rest of its
  description, cut at 50 characters.
- Under each node come its helpers in the order they started, then its child sessions, smallest first.
- Orange: a helper whose meta file does not say it finished when the tree was drawn.

## Not checked
- The draw.io file was not opened in draw.io.
- A helper's start time is its transcript file's creation time.
