# Session tool prototype, skill: ui-ux-pro-max (Sonnet, 2026-11-24)

Open `index.html` from the disk (also `?page=history&day=6`, `?paused=1&t=3:29`, `?theme=dark`, `?open=session:UX`).
Files: `index.html`, `styles.css`, `icons.js`, `app.js` (shell, replay clock, router, overlays, prompt bar), `now.js`,
`history.js`. Data: `../shared/data.js` only. No server, no fetch, no web fonts, no installs.

## What is built

**Now** (constantly updating, replay of Tue 24 Nov, Slow / Normal / Fast, pause, scrub, jumps to 03:29 and 13:03)
- Left rail: sessions ordered by need (Needs you, Working, Quiet, Ended). Each has tag, name, plan step, helpers by kind
  packed in the row, tokens, step progress, trouble marks. The waiting session carries its question, an answer box,
  quick answers, **Answer** and **Stop** (Stop asks once, in place). Working rows have a Stop. Click a row opens a dummy
  session window (Esc or Back returns). Hover a row lights its parts on the board.
- Canvas: one panel with the last three hours on one clock: sessions working (steps), starts as flags with tags, ends,
  waits for him (blue band), his messages, trouble marks, quiet stretches hatched with their length ("Quiet 24 min").
  Under it one row per hook on the same clock (passes, refused, failed), "never fired" for a hook with no event.
  Then every other real part by name in fixed places (documents, commands, skills, helper kinds with model, scripts,
  tests and git, stores). A part in use shows the tags of the sessions on it. Click a part: inspector (path, who uses
  it, recent trouble, Open, Copy path, Seen). Double-click: opens by the setting (VS Code toast or a file pane).
  Zoom with the buttons, keys or Ctrl+wheel; drag the background to pan.
- Trouble stays loud until seen ("Mark all seen"); failed marks pulse, seen marks fade.
- One prompt box at the bottom: new session or reply to a session. A new prompt adds a session row.
- Header: working / waits for you / helpers / failed / refused / tokens, settings (open parts in VS Code or file pane;
  light or dark).

**History**: the week as seven day strips (sessions at once as a numbered heat scale, helpers, trouble, his messages
and away times); click a day. Tuesday opens as session lanes (tree indent, helpers packed under each bar, trouble marks
in place, waits in blue), one thin row per hook on the same clock, quiet stretches under 2 h shown at true width and
labelled, over 2 h folded ("5 h 11 min quiet", click to unfold). Window: drag on the day strip, Whole day, Busiest 3 h,
earlier / later. Other days show the aggregate only (the data has no lanes for them).

## What each part of the skill said, and where it shows

Workflow followed by hand (the search scripts need Python): Step 1 requirements; Step 2 design system from
`products.csv`, `ui-reasoning.csv`, `styles.csv`, `colors.csv`, `typography.csv`; Step 3 `ux-guidelines.csv`,
`charts.csv`, `motion.csv`, `app-interface.csv`; Step 4 stack (nothing detectable; plain HTML, the Tailwind table read
only for general rules). I read `SKILL.md`, `pro-rules.md` and `quick-reference.md` in full.

- **Product match** (`products.csv` 81 Developer Tool / IDE; cross-checks 188 RPA / Automation Dashboard and 166 Status
  Page): "real-time monitor + terminal", "bot status grid, queue, process flow, exception alerts", "service status matrix,
  incident timeline, uptime history". Shows as: the board of named parts as a status matrix; one-row-per-hook strips as
  the "uptime bar"; trouble in place as the incident timeline.
- **Reasoning rows** (`ui-reasoning.csv`): anti-patterns "slow dashboards, decorative charts, hidden error states".
  Shows as: no decorative charts, trouble visible in place, no hidden states. Its "dark by default" for developer tools
  was **not** followed: the owner's word is light; dark exists as a token switch only (skill: results are advice, the
  user outranks them).
- **Style** (`styles.csv`): Minimalism and Swiss Style with Data-Dense Dashboard and Real-Time Monitoring (8 px gaps,
  12 to 14 px dense text raised to 13 to 15 for his screen, status dot, connection and "replay" indicator). Bento Box
  Grid says "do not use for dense tables or real-time monitoring": avoided (his complaint was four cards on empty grey).
- **Colour** (`colors.csv`, priority 6 `color-semantic`, `color-accessible-pairs`): every colour is a token with a text
  value, a fill and a tint; running green, waiting blue, refused amber, failed red from the status rows; dark values from
  the Developer Tool row. Text pairs were chosen at 4.5:1 or more (not machine-checked in this run).
- **Type** (`typography.csv` "Developer Mono", "Minimal Swiss", "Dashboard Data"): no fonts may be fetched, so system
  Segoe UI Variable for text and Cascadia Mono for tags, times and numbers; `number-tabular` on all figures.
- **1 Accessibility**: visible focus ring (3 px) on every control; icon buttons carry aria-labels; skip link; roles on
  dialogs; Esc closes, Tab stays inside the session window, focus returns to the opener (`dialog-focus`);
  `color-not-only`: every state has a shape or text as well as colour (triangle failed, diamond refused, ring quiet,
  pause glyph waiting); `reduced-motion` stops loops and animations; a polite live region announces only changes
  ("1 session waits for you", counts) (`contextual-live-badge-updates`); the double-click has a keyboard path (the
  inspector's Open button).
- **2 Touch and interaction**: `cursor-pointer`, pressed state within 120 ms, `touch-action: manipulation`, targets
  24 px and more (`web-target-size`), drag has buttons as alternatives (`dragging-alternative`: zoom buttons, window
  buttons), the Stop is confirmed in place once (`confirmation-dialogs`) while routine actions are not.
- **3 Performance**: transform and opacity only; the strips are one wide SVG moved by one transform per frame; DOM
  updated only where a value changed; data ticks four times a second (`debounce-throttle`); width reserved so nothing
  jumps (`content-jumping`); the replay holds still while he types in an answer, hovers the waiting card, or has a
  window open, and stops when the tab is hidden.
- **4 Style selection**: one icon family (24 grid, 1.75 stroke, no emoji; `icons.js`), one elevation scale.
- **5 Layout**: 4/8 spacing scale, z-index scale (10, 40, 60, 80), container width, two columns above 1360 px and one
  below (`breakpoint`), no page-level horizontal scroll.
- **7 Animation**: motion tokens (120, 200, 260 ms; exit 170 ms = about 65 % of enter), ease-out in and ease-in out,
  `motion-meaning` (movement carries data), `interruptible`, rail rows reorder by FLIP, 1 to 2 loops only
  (live dot, helper pulse, failed ring); chart rule for streaming data: a pause control and a current value.
- **8 Forms and feedback**: visible labels ("Answer UX"), empty submit is not disabled but flagged and announced
  (`submit-not-pre-disabled`), IME-safe Enter (`ime-composition-enter`), toasts non-critical, polite, 4 s,
  trouble marks stay (`persistent-errors`), empty state on days without lanes.
- **9 Navigation**: Now and History in the same place on both pages, current page marked, URL reflects the page
  (`#now`, `#history`, query for day and window), focus moves to the main region on a page change, state kept when
  switching back.
- **10 Charts** (`charts.csv` Real-Time Streaming, Anomaly Detection, Heat Map, Process Mining): marks use a distinct
  shape and a number as well as colour; heat scale has a numeric legend; quiet stretches annotated; tooltips on pointer
  and on focus; a text label for each chart (aria-label).
- **pro-rules.md checklist**: icons, pressed states that do not shift layout, tokens per theme, labelled controls,
  reduced motion. It is written for native apps, so the safe-area and 375 px items were not applicable.

## What I could not do or did not finish

- **The interaction test did not run.** My scripted click test in the Browser pane returned "page not loaded" (the
  pane showed a static snapshot of the file), so none of the click paths was run by a script. The screenshots show the
  pages draw. Answer, Stop, the prompt box, settings, file pane, inspector, session window, History day and window
  controls are written but were **not tested by clicking**; expect small faults.
- The last edits (ticks on the History page, "Stop" tooltip, the History header counts) were not looked at again.
- History page is about 150 px taller than 1050 px (hook rows are below the first screen; scrolls).
- Colour contrast was set by token choice, not measured; dark theme looked at once (screenshot, file pane open).
- Skills, git and tests show as parts, but the data has no events for them, so they never light up.
- Not tested at 8 sessions at once. At 1440 px the board is a single column and the canvas scrolls.

## Screenshots (Edge headless, light unless noted)
Taken into the scratchpad `...\scratchpad\`: `a-now0329.png` (first, History layer showing through: fixed), `n1.png`
(Now 03:29, 1870 px), `n2.png` (Now 13:03), `h1.png` (History, Tuesday), `n3.png` (1440 px with the session window),
`n4.png` (dark, file pane). Seen and judged: n1, h1, n3, n4 (n2 was shot, not opened).

## Tokens
About 9 M by the coordinator's count at the stop (limit raised 5 M, 7.5 M, 9 M). Most of it was the long window re-read
on each call, not the files; the three source files were written in one go each.
