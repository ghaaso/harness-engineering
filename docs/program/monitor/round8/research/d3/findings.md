# D3 "Operate": how front ends for many agents let one person prompt, see who needs him, answer, stop and jump

Researcher d3 (Fable, high effort), 24 November 2026. Saved by the round 8 session from d3's hand-back, unchanged in
substance: the app refuses a helper's write of a findings file ("return findings as text"). Pages were read and pictures
taken with headless Edge on an empty profile; nothing downloaded or installed. "Screen seen" = the picture in this folder
was looked at; "page read" = the page's own text was read. Goals as numbered in `NEXT-ROUND-8.md` section 3. Tokens:
about 3.1 M of its 3.5 M limit (calls times window, its estimate); it stopped there, so the user-report part is thin.

## Findings

### 1. The step that waits for a person is the only loud thing, in its place in the flow, with the answer control on it
- Source: https://buildkite.com/docs/pipelines/configure/step-types/block-step. Picture: `01-buildkite-blocked-step.png`.
- How known: screen seen; the page's text was fetched but not read.
- Shows: finished steps are thin green outlines; the two waiting steps ("Are we ready?", "Release") have a strong purple
  outline, a pause mark and a filled arrow button on the step itself; the build's badge is a pause sign.
- Goals 2, 5, 8, 13: "needs you" read from colour and position, no sentence, answered where it is seen; the mark is on
  the part, not written under a box.
- Breaks: a pipeline is one row of about 8 steps; we have 8 sessions with up to 20 helpers. The rule (one accent, in
  place, control on it) carries over; the single row does not.

### 2. A waiting agent's own last line on its tab, with a count badge
- Source: https://cmux.com/ (feature list: "Notification rings: panes light up when agents need attention").
  Picture: `02-cmux-attention-tabs.png`. How known: screen seen (the product picture on its own site).
- Shows: a vertical list of agents; each row: name, the agent's latest notice in its own words ("Claude is waiting for
  your input", "Awaiting dogfood approval"), branch and folder; rows that need the person carry a blue numbered badge.
- Goals 2, 8, 11: he learns what is asked without opening the chat. Claude Code can supply the text: a Notification hook
  with a `permission_prompt` matcher (page read, https://code.claude.com/docs/en/desktop).
- Breaks: three to four lines of small text per row; 8 rows fit, 40 do not; it is reading (goal 13). Keep one line,
  only on the rows that wait.

### 3. The common layout: list left, one chat middle, files right, prompt under the chat
- Sources: https://www.conductor.build/ ; https://imbue.com/product/sculptor ; https://github.com/smtg-ai/claude-squad.
  Pictures: `03-conductor-workspaces.png`, `04-sculptor-sidebar-dots.png`, `06-claude-squad-list.png`.
- How known: screens seen (each product's own picture); Conductor's documentation did not load.
- Shows: Conductor lists workspaces (pinned, mine), tool use folded to "17 tool calls, 3 messages", touched files as
  chips with +/- counts, a merge state heading the right pane. Sculptor: tasks under their repository, one dot each
  (green, grey, red), tool names and file chips in the chat. Claude Squad: numbered list, a dot and +/- counts, a
  preview pane, one key per action (n new, d kill, enter open).
- Goals 7, 8 (jumping and prompting work). Against goals 1, 3, 9: one chat at a time; no time, no who-started-whom, no
  working parts. No hook appears by name on any screen seen; tool calls are a count or a chip. Goal 1 has no model here.
- Breaks: helpers have no place in a flat list (800 a week); a list of names is the hunting through chats he wants to
  leave.

### 4. Board columns by state, and one prompt box with Queue and Stop beside it
- Source: https://github.com/BloopAI/vibe-kanban (picture from its README). Picture: `05-vibe-kanban-board.png`.
- How known: screen seen; README text not read beyond the picture; a search summary says it is no longer maintained.
- Shows: columns To do, In progress, In review, Done; the running attempt is a small card with moving dots; the open
  task's chat at the right with one box and the buttons Queue and Stop next to the model choice.
- Goal 8: the box is always in the same corner; a message can be queued while the agent works; Stop is one click.
- Breaks: columns are states, so a session jumps column and its history is lost (goal 3); "Done" becomes a long pile;
  four mostly empty columns are the empty grey he rejected (goal 11).

### 5. A status list that separates "blocked on you" from "failed", and helpers as pills on their parent
- Source: https://docs.warp.dev/agents/using-agents/managing-agents. Picture: `07-warp-runs-panel.png`.
- How known: page read, screen seen.
- Says and shows: the panel is "designed to answer, at a glance" which runs are working, blocked, failed, succeeded or
  cancelled; blocked (yellow) = waiting on user input; failed = red triangle; a click opens that conversation. Children
  of a local parent get no rows: one pill each with a live status badge in a bar above the parent's view; a click on a
  pill switches to that child in place. The page warns a parent can show success while a child still runs or failed.
- Goals 2, 5, 7, 12: helpers folded onto their session as small marks; a session's mark must carry its helpers' worst
  state.
- Breaks: the panel is a table of rows with six filter menus (goal 13); four of six rows red and nothing says which
  matters.

### 6. An unread dot and "mark as done" keep a week of sessions from piling up
- Source: https://code.visualstudio.com/docs/copilot/chat/chat-sessions. Picture: `08-vscode-sessions-list.png`.
- How known: page read, screen seen.
- Shows: one row with a blue dot, others faint; +/- counts, age, a tick that marks the session done; done sessions leave
  the active list and are reached by a filter; an icon badge and a title-bar status mark can be switched on.
- Goals 2, 8a: "done by me" is his act, apart from "the agent stopped"; that moves a session from Now to History.
- Breaks: little; the list form does not scale past a screen.

### 7. The strip board: position is the state, a strip pushed out of line means "look here"
- Source: https://en.wikipedia.org/wiki/Flight_progress_strip. Picture: `09-flight-strips.png`.
- How known: page read (the article is flagged as short of citations).
- Says: one strip per flight in a rack; the position of the strip in the board is part of the information; the holder's
  colour has a meaning; a strip may be offset ("cocked out") to highlight an issue.
- Goals 2, 11, 12, 13: many flights held with almost no reading: order, colour and offset say it.
- Breaks: no time, no who-started-whom; a side rail for the map, not the map.

### 8. What people who run many agents say
- Sources: discussion threads news.ycombinator.com/item?id=46368739, 45427697, 47140322 (read through the site's data
  service, only comments matching attention, waiting, switching, status); GitHub's guide
  https://github.blog/ai-and-ml/github-copilot/how-to-orchestrate-agents-using-mission-control/ (page read).
- Says: one tool's makers list hooks that notify when agents are done or need attention as a headline feature and admit
  the switching cost is real; a commenter doubts people who dislike context switching would use such a tool; another
  maker says people still need an interface to see agents' status and review their work; GitHub's guide says to step in
  when logs show drift, tests fail or scope creeps, and to review in batches.
- Goals 2, 8: the cost is switching, not prompting: the picture must say which one needs him and what it asks, so he
  switches once.
- Limit: no issue thread was read; this part is thin.

## Not read, not seen
GitHub mission control (documentation read, no screen); Cursor (change log lines only); OpenAI Codex app (headings
only); Devin (nothing on a session list found); Crystal, Omnara, Jules, Factory, Temporal (not read); Lens (cookie wall);
Argo CD (shot taken, not looked at, nothing claimed); the Claude Code desktop app's session list (documentation lines
only: click a session in the sidebar, Ctrl+Tab between sessions, archive from its menu). No product picture seen shows
8 running and 40 a week; the scale notes are readings of each layout.

## The three ideas for a prototype
1. **One loud mark for "needs you", on the session where it stands, with the answer on it** (`01`, `02`). Everything
   running stays quiet; a waiting session gets the one accent colour, a pause sign, one line of what it asks, and
   Approve / Answer / Stop on the node. Goals 2, 5, 8, 13.
2. **A narrow rail of strips at one edge, ordered by need, the waiting ones pushed out of line** (`09`, `08`, `07`). One
   strip per session: waiting on top and offset, then running, then finished and unseen (dot); helpers as small pills;
   a click jumps to the session; his "done" tick sends it to History. Goals 2, 7, 8a, 12.
3. **One prompt dock in a fixed place that speaks to whatever is selected** (`05`, `03`). Nothing selected: it starts a
   session. A session selected: it messages or queues to it, Stop beside Send, touched files as chips that open on a
   double-click where his setting says. Goals 8, 7, 8b.
