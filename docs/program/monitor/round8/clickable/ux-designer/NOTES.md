# Clickable prototype, skill: ux-designer (Sonnet 5.5, 2026-11-24)

Open `index.html` from the disk (also `?page=history`, `?t=03:29&paused=1`, `?pop=reply`). Files: `index.html`, `styles.css`,
`app.js` (clock, toasts, drawer, popover, search, prompt box), `now.js` (canvas and time strip), `history.js`; `shots/` holds
the screenshots, `shoot.sh` (Edge line) and `selftest.js` (drives the controls with DOM events; load with `?selftest=1`).
Data: `../shared/data.js` only; no server, no fetch, no web fonts.

## Status, plainly (read this first)
- **Not finished to the standard in BRIEF.md.** I stopped at 7.12 M by the transcript count, past the 7 M line: reading the
  skill's references in full cost about 2 M before the first line of code.
- The self-test (`?selftest=1&t=03:31&paused=1`, results in `body[data-test]`) ended with **26 PASS and 8 FAIL**:
  zoom-in step (24% to 24%), "open in file pane shows drawer" (button in the card popover), "waiting card changed after
  answer", "dock target follows", "new session card appears", "lane click opens session" (History), "Trouble filter" (still 20
  lanes), "wheel zoom on the day". I did not have the budget to tell page faults from test faults (virtual time may not run the
  zoom tween; the answer and new-session cases may need one more frame). **Treat these eight controls as unverified.**
- The `?zoom=2.2&at=BR1` deep link did not apply (the shot is at 84%), so the **near zoom level was never looked at**.
  `history-zoom.png` was taken but not looked at. No 1440 px shot, no drawer shot, no keyboard pass by hand.
- Stranger test, my own judgement from `now-0329.png`: running now (3 working, 1 waits, in blue, in the header too), parts at
  work (white chips with session dots), what broke (hook tiles in red/amber with the session tags) read in ten seconds. "Since he
  left" lives in the time strip (blue band, starts, trouble marks) and a popover; it is not on the canvas itself.

## What was built
- **Now:** one canvas, pan (drag, arrows), zoom around the cursor (wheel, + - 0 F, buttons, Fit), minimap when off Fit, three
  semantic levels (far: blocks; mid: names; near: plan lines and file paths). Hooks as tiles on top with an hour strip
  each (bars = let through, red/amber = failed/refused, session tags on them); sessions as a tree of cards (who started whom)
  in the middle, each with state, step n/m, helpers by kind, spend trace; the 79 parts in zones, white with session dots
  when in use. Hover a session: its parts light, others dim, one set of lines. Time strip below: working sessions, helpers,
  hatched "nothing ran 4 h 40 min", blue "you were away" band, session starts, trouble marks, his messages, a draggable
  playhead. The replay runs by itself (1x, 4x, 16x, pause).
- **Operate:** a waiting session turns blue with its question, Answer (quick replies, free text) and Stop (asks first, Undo
  in a toast); the same pill sits in the header on both pages; one prompt box at the bottom, addressed to the selected
  session or a new one; click a session opens it (drawer stands in for the app), double-click a part opens it per the
  "Open parts in VS Code / File pane" setting; `/` jumps to any session or part.
- **History:** seven week strips (same scale), a day opened as session lanes (tree, helper trace, trouble ticks on the bar,
  blue hatch where it waited for him, his messages), ten hook rows on the same clock pinned below, a crosshair, the quiet
  stretch folded to "4 h 40 min folded", wheel zoom and drag on the time, filter All / Trouble / Waited for me. Other days
  show counts only (the data has no lanes for them).

## Where the skill shows (rule, what it said, where on the page)
- **SKILL.md, "calm over clever"; generated-UI defaults:** no gradients, glass, emoji or card-in-card; grey for normal,
  colour only for him (blue), trouble (red/amber) and one hue per session. One filled blue button only (Answer).
- **01 Nielsen:** (1) status: live dot turns grey when paused, state word on every card, clock; (3) Stop asks, Undo toast;
  (5) inline confirm instead of a modal; (6) recognition: parts by real name, no legend; (8) minimal: detail on hover or
  zoom; (9) a mark says which part, what, which session, when.
- **02 laws:** Fitts (Answer and Stop 30 px high inside the card, banner in the header); Hick (two pages, three filters);
  Von Restorff and Zeigarnik (the waiting card is the only blue-filled thing and stays until answered); Gestalt (zone
  islands = common region, tags near parts = proximity, one glyph family = similarity); Doherty (feedback under 100 ms,
  tweens 220 to 340 ms); Jakob (zoom box bottom-left, search top, page tabs top-left).
- **04 visual:** tokens on `:root`, 4/8 px scale, system font stack, warm paper 60 / islands 30 / accent 10, text contrast
  at least 4.5:1, one dominant element. **05 IA:** two top-level items, current page marked, one-word labels, search for the
  rest. **06 interaction:** hover, focus, pressed and disabled states (Send is disabled with a title that says why),
  `prefers-reduced-motion` removes tweens.
- **13a canvas:** zoom at the cursor, 25 to 400 %, presets by keys, Fit, minimap, pan by drag or arrows, semantic zoom.
  **13b:** level of detail by CSS, only transform and opacity animate, arrow keys move between nodes, aria-labels on nodes
  (about 120 nodes, so no culling).
- **14 AI patterns:** human in the loop (nothing happens without his click), step n/m and plan list, helpers shown by kind,
  Stop with confirm and Undo, answer offered as quick replies plus free text, never auto-applied.
- **17 notifications:** needs-you = persistent banner (not a modal) plus a badge on the Now tab; toasts newest on top, three
  at most, five seconds, one with an action stays until closed; `aria-live` says only who waits.
- **18 data visualisation:** small multiples on one scale (week strips), sparkline per session, no pies or dual axes;
  overview, then zoom and filter, then detail on demand (tooltip, popover); crosshair; reset visible only when zoomed;
  shape plus colour for result (triangle failed, no-entry sign refused, dashed ring not on); "paused" never looks live.
- **20 emotional:** errors stated without blame ("Window ceiling refused UX"), no jokes near trouble, calm motion, a toast
  at the end of the replay (peak-end). **22 performance:** positions fixed so live updates never move anything; a card or tile
  is rewritten only when its signature changes; the layout is recomputed only when the set of sessions changes; the file
  pane shows skeleton lines.
- **03, 09, 12a/12b, 19:** native buttons, visible focus ring, colour never the only signal; plain button words ("Stop it",
  "Keep it"); live/paused as the connection state; jump search with grouped results, bold match, arrows, Esc, a helpful
  zero-result line. **Not used:** 21 (tables: he said none), 15, 16, 23 to 26, 07, 08, 10, 11 beyond tokens.

## Not done
Dark theme; mobile; a hand keyboard pass; the near zoom level checked; History lane order by need; the 8-session crowd
(the data has at most 4 working at once); real go-to-session (the drawer is a stand-in).

## Screenshots (`shots/`, 1870 x 1050, light)
`now-0329.png` (looked at), `now-1303.png` (looked at before the last fixes), `history.png` (looked at), `now-reply.png`
(looked at), `now-near.png` and `history-zoom.png` (taken, not as intended or not looked at).

## Tokens
7.12 M by `tok.mjs` on this session's transcript (limit 5 M, raised to 7.5 M; stop line 7 M passed while writing this).
