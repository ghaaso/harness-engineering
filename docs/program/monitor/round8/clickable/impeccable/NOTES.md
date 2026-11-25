# Clickable prototype, built with Impeccable (round 8, 2026-11-24)

Open `index.html` from the disk (plain HTML, CSS, JS; it loads `../shared/data.js`; no server, no fetch, nothing from the
web). Files: `index.html`, `style.css`, `app.js` (Now page, rail, dock), `history.js` (History page), `shots/`.
Page states by query string, for looking: `?paused=1&t=03:29&page=history&sel=UX&part=hook:tier-hook&z=1.8&open=vscode&pane=hook:tier-hook`.

## What I built
- **A map of the working parts drawn as a transit diagram.** Each zone (Hooks, Helper kinds, Commands, Tests and git,
  Scripts, Stores and settings, Skills and commands, Documents) is a route line with a navy roundel; each of the 79 real
  parts is a station on it, named, in a fixed place. A working session lights the stations it touches in its own colour;
  two sessions on one part draw concentric rings (the interchange sign). Trouble sits on the station: red triangle =
  failed, amber diamond = refused, dashed ring = hook not on, with a count; it stays until seen (click it, then Seen, or
  open the session). Helpers running show as dots over their kind.
- **Now:** left rail of sessions ordered waiting, working, quiet, ended (who started whom as "from BR1"); the session that
  waits for him is blue with its closing report, Answer and Stop. The canvas zooms and pans (wheel, drag, + − fit;
  three detail levels). Above it the last three hours as one unbroken ribbon: start flags, gaps with their length
  ("15 min"), his messages, trouble marks, a blue "you 03:25" marker and chips for what changed since then
  (failed, refused, started). The replay runs by itself (play, 1×/4×/15×, jump to 03:29 crowded, 11:40 quiet stretch,
  13:03 after the gap).
- **History:** the week as seven strips (his messages in blue); the opened day (Tue 24) as session lanes in tree order,
  helpers packed under each bar as one step area, trouble ticks on the lane, blue where it waited for him, "you away"
  bands, the quiet stretch folded ("4 h 40 min", click to unfold), one thin row per hook on the same clock with a hover
  crosshair joining a tick to its hook row. Wheel zooms the day, drag pans, double-click resets. History always shows the
  whole recorded day (to 14:45), not only up to the replay time.
- **Operating:** one prompt box in a fixed place at the bottom, addressed to the selected session (or "New session").
  Answer (answers the waiting session; the card turns to working), Send, Start (adds a new dummy session), Stop with a
  confirm click. Click a session = "opens" it (toast) and spotlights its parts; hover a card previews the same. Double-click
  a part opens by the setting at top right: VS Code (toast with the path) or the file pane (slide-over with path and its
  recent trouble). Esc closes things; Space plays and pauses.

## What was tested
All controls were driven in headless Edge (through its debugging port, a throwaway script outside this folder) at 03:29:
card click, Answer (dock focused with the question, answered), Stop two-step, new session, double-click to file pane and to
VS Code, part and trouble popovers (Seen, Open session), zoom out/in/fit (levels out, mid, in), chips, ribbon click
back in time, jump, speed, play, History tab, fold/unfold, day select, tick popover, window zoom/fit, lane click. Every
one responded; no console errors. (The Browser pane shows file pages only as static snapshots, so it could not run them.)

## What each part of the skill said, and where it shows
| Skill part | What it said | Where on the page |
|---|---|---|
| SKILL.md, how to design | The brief wins; honour pinned looks | His pins kept: light, one canvas, whole screen, no tables, no explaining text, named real parts. The look is mine only where he left it open |
| SKILL.md, Modes: **Operate** | Scanability, standard controls, brand in precise details; world lends type, palette, density, one signature move, never layout or controls | Standard tabs, buttons, select, segmented switch, input, popover. Signature move: stations on route lines with interchange rings |
| new-work.md 1 to 4 (world) | Name the mechanism and audience scene; list seven systems from the audience's world (not their tools); roll; weigh challengers on audience fit and product clarity | By hand: seven = transit diagram, Marey railway graph, survey map, ward board, orchestral score, synoptic weather chart, ticket rail (the last stood for #7). Die gave #7 assigned, #1 and #3 as challengers; transit beat the assigned one on both axes and became the build. No script ran, so no seed reference |
| new-work.md 4, colour | Pick a strategy; colour does real jobs; light or dark from the use scene | Scene: a researcher at a desk, second screen, daylight, glancing back after an hour away, so light. Committed shell (navy bar, navy roundels, cool tinted rail). Blue is only ever him; red failed, amber refused; session hues for working sessions. Trouble also has shapes, so colour is never alone |
| new-work.md 4, faces | System stacks suit Operate; avoid the listed defaults | `Segoe UI Variable` / system stack, tabular numbers; none of the listed faces; monospace only for file paths |
| new-work.md 5 | Direction contract before code, kept out of the page | Thesis: the harness as a network you read at a glance, not a board of tiles. Own world: route lines, roundels, rings, navy on cool white. Story: see what runs, what broke where, what happened since he left, reach anything in one click. First viewport: rail left, ribbon on top, map filling the rest, one prompt box under it. Not copied into the page files |
| new-work.md 6 | First viewport is a thesis; prove, don't claim; author the assets | The first screen is the live map on real names; every part, session and event comes from the data; dummy bits are named in the notes below |
| craft-floor.md, Verify | Contrast 4.5:1; type scale; one authored motion; hover/focus/empty states; theme the browser's own parts | Text colours chosen from OKLCH lightness (not measured by a tool); roles 12/13/14/16/20 px, nothing under 12; `::selection`, focus rings, thin rail scrollbar, tabular numerals themed; focus-visible on every control. Empty states not built |
| craft-floor.md, Refuse | No kicker, no section numbers, no hero metric, no side-stripe border, no glass, no gradient text, no modal for light tasks, no emoji icons | None used. Counts are inline chips, not a hero number; working cards have a full border; Answer and part details are inline (rail, popover, slide-over); icons are one drawn SVG set |
| operate.md | Earned familiarity; fixed type scale; tighter ratio; second neutral layer; 150 to 250 ms; no load choreography; overlays escape their container | Rail is the second neutral layer; transitions .15 to .3 s; nothing animates on load; tooltips and popovers are `position: fixed` |
| layout.md | Spatial thesis; squint test; proximity before containers; rhythm; structural responsiveness | Stations have no card around them (proximity and a line do the grouping); 112 px row pitch against a 30 px label gap; below 1500 px the rail narrows; the map has three detail levels by zoom |
| colorize.md | Roles not swatches; strongest colour owns a region; non-colour cues; OKLCH | Roles in `:root` tokens; navy owns header and roundels; triangle, diamond, dashed ring carry state beside colour |
| animate.md | Motion thesis: focal moment, continuity, feedback, budget; reduced-motion path | Focal: a part being touched (ring grows) and a trouble badge dropping in once. Continuity: the ribbon glides by a transform at constant speed. Feedback: toasts, confirm-arm on Stop. Only transform, opacity, colour, shadow. `prefers-reduced-motion` block in CSS |
| typeset.md | Few roles, fixed scale, balanced wraps | `text-wrap: balance` on station names; same role identical everywhere |
| init.md | PRODUCT.md first, from an interview | Not written to disk (it belongs at the repository root and rule 7 bars questions). The product facts are his words in `BRIEF.md` and `NEXT-ROUND-8.md` sections 1 and 3 |
| critique.md and critique-rubric.md | Two assessments, 10 heuristics 0 to 4, cognitive load, personas, P0 to P3 | See below. Run once on this page, by hand |
| distill.md | Remove what does not earn its place | See below |

## Critique (once, on the first full render)
`DEGRADED: single-context`: the skill wants two isolated reviewers and its detector script; the brief forbids both, so I
scored by hand with the rubric, and no detector ran.
- **Specificity:** grounded in this product (named parts, sessions, hooks); not usable unchanged by another product.
- **Heuristics (0 to 4):** status 3, real world 3, control 3, consistency 3, error prevention 3, recognition 2, flexibility 2,
  minimalism 2, recovery 3, help 2. **26 of 40, "Acceptable".** I did not re-score after the fixes.
- **Cognitive load:** 2 failed (minimal choices: nine top-bar controls and a Stop on every card; working memory: matching a
  session's colour on the map back to the rail).
- **Personas:** Alex (power user): keys are only Space, Enter, Esc. Sam: focus rings and shapes beside colour are there; the ribbon
  and History ticks cannot be reached by keyboard; dimmed stations in a spotlight are pale. Project persona, the owner back after
  an absence: "what happened since" is carried by chips and the ribbon, not stated in one place.
- **Priority issues:** (P1) Stop repeated on every working card; (P1) which map parts belong to which session needs
  colour matching; (P2) too many replay controls; (P2) ribbon day labels hit by his message dots, "0" spend shown;
  (P2) "away" bands unlabelled; (P3) the Documents loop clipped.

**Applied once (distill and the fixes, one batch):** Stop kept only on the waiting card and in the dock; the "ended" chip and
the date chip removed; the 1×/4×/15× group became one cycling button; spend hidden when zero; rail header split into
two deliberate lines; hover on a rail card spotlights its parts on the map (and tags carry the session's colour);
"you away 6 h 21 min" labels on the bands; ribbon labels moved clear of the dots; loop no longer clipped; zoom "out" level
only below 0.6 so 1440 px keeps its labels.
**Left undone:** keyboard shortcuts for pages; keyboard path to the ribbon and History ticks; empty states.

## What I could not do, or did not check
- No script of the skill was run (brief): no `context`, `concept-seed`, `surface-brief`, `serve-question`, `first-viewport`,
  `detect`, no finish-reviewer or documenter helper, no DESIGN.md or PRODUCT.md. The roll and the critique are by hand.
- 1440 px: the map scales to about 0.74, so station names are about 9.6 px. After the last two edits I retook the 1440 shots
  and the 1870 History shot but did not look at them again, so the zoom-level change at 1440 and the moved "you away" labels
  are unseen on a screenshot.
- Not tested: 8 sessions at once (the data never has more than 4 working), a stranger looking for ten seconds.
- Dummy: skills, `monitor`, git and four helper kinds are dummy parts in the data; Answer, Stop, Start and the opens are
  local to the page; the waiting question is the data's invented one; "tokens" are the data's tool-call counts, not billed.
- The replay speeds and the jump list exist only for review.

## Screenshots (in `shots/`)
`final-now-1870.png`, `final-history-1870.png`, `final-now-1440.png`, `final-history-1440.png`, `final-now-0329.png`;
clicked states: `b-answer-ready.png` (Answer with the question in the dock), `b-file-pane.png`, `b-trouble-popover.png`,
`b-zoom-out.png`, `b-zoom-in.png`, `b-session-selected.png` (spotlight), `b-now-1303-after.png`, `b-hist-unfolded.png`,
`b-hist-popover.png`. Looked at: the first Now and History renders, zoom-in, session-selected, trouble popover, final Now at
1870 and 1440 (before the last two edits), final History at 1870 (before the label move).

## Tokens
My own counter read 1.77 M after about 17 calls; I did not count again. The coordinator counted over 8 M when it raised the
limit to 9 M. Cause: every call re-read a window of 100 to 200 K tokens (the skill's references were about 50 K of it,
read in full as asked, and the code about 35 K).
