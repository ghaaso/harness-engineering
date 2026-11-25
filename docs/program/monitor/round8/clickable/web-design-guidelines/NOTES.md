# Clickable prototype, skill: web-design-guidelines (Vercel)

Builder: Sonnet 5.5. Written after the 9 M limit stopped the build, from what was already known. **The skill's review
was not run as a separate pass and nothing was fixed after it** (see "Review"). Spend: the coordinator's count was
about 9 M at the stop; I did not count it from the transcript.

## What was built
Files: `index.html`, `style.css`, `app.js` (clock, URL, drawer, answer/stop/prompt), `now.js`, `history.js`. Opens from
disk, no server, no fetch, no install, nothing from the web; loads `../shared/data.js`. Light, made for 1870 x 1050,
checked once at 1440 x 900 (no page overflow measured; the picture was taken but not looked at).

- **Header, both pages:** Now / History as real links; five numerals (working, waiting for you, helpers, trouble,
  tokens); play/pause, replay clock, scrubber, speed (Slow / Normal / Fast).
- **Now:** left, the session rail ordered waiting, working, quiet, ended (tag in the session's own colour, current step,
  running helpers by kind and model, spend trace, "from" parent, trouble marks) with a "Since 03:25" row (started,
  finished, refused, failed). Top centre, **Last 3 Hours**: his messages and away bands, helpers running, one lane per
  session (turns, blue where it waited for him, trouble marks), hatched "Nothing ran" stretches, slides left on a
  transform. Below, **Parts**: all 79 named parts in fixed places (hooks, documents, helper kinds, scripts, commands,
  skills, stores and settings, tests and git). A part in use is white with the tag of the session on it; trouble is red or
  amber on the part with the session tag; Journal watch (never fired) is dashed. Zoom and pan of the canvas.
- **History:** the week as seven day strips with a draggable window; below, sessions as lanes (tree order, helpers
  under each bar, blue where it waited, trouble marks, his messages), ten hook rows on the same clock, the 4 h 48 min
  quiet stretch folded into a hatched band that carries its length, the 23 min stretch bracketed, crosshair with time,
  a "Now" line (nothing after the replay minute is drawn).
- **Operating:** click a session anywhere (rail, lane chip, river bar, History lane) opens its sheet (steps, helpers,
  trouble, parts in use, parent and children) in a right drawer; "Open in App" is a toast. Click a part opens its sheet
  (real path, counts, recent events); double-click or the key `O` opens it by the setting (**VS Code** toast, or **File
  Pane** toast plus the sheet). A waiting session carries its question with **Answer** (quick "Yes, Go On" / "Not Yet" or
  free text), **Open Session**, **Stop** (asks first, then a toast with **Undo**). One prompt box at the bottom: "Start
  Session" adds a dummy session to the rail; with a session selected it reads "Send to UX". The "Parts Open In" switch is
  kept in localStorage.
- **Deep links:** `?page=now|history&s=<session>&p=<part>&ev=<event>&from=&to=&t=<minute>&play=0`. Useful:
  `?t=8849&play=0` (03:29, UX waiting), `?page=history&t=9423&play=0` (13:03). The replay starts at 03:20 and loops at
  14:45.

## What each rule said and where it shows
| Rule of the skill | Where on the page |
|---|---|
| Icon-only buttons need `aria-label` | Zoom, pan, play, close buttons all carry one; icons are `aria-hidden` |
| `<button>` for actions, `<a>` for navigation | Parts, sessions, lane labels are buttons; Now/History are `<a href>` (Ctrl/Cmd-click works) |
| Skip link, hierarchical headings, `scroll-margin-top` | "Skip to Main Content"; h1 brand, h2 regions, h3 zones and drawer sections; `scroll-margin-top` on headings |
| Semantic HTML before ARIA | `fieldset`/`legend` for the opener switch, `output` for clock and zoom, `ul` for the rail |
| `aria-live="polite"` for async updates | Toast stack, a hidden status line ("UX waiting for you"), `role="alert"` on the prompt error |
| Visible focus, never bare `outline:none`, `:focus-visible`, `:focus-within` | One blue ring on everything; the switch and prompt use `:focus-within`/`:focus-visible` |
| Forms: label, `name`, `autocomplete="off"`, `…` placeholder with an example, paste not blocked, submit stays enabled, spinner, inline error and focus, warn before leaving a draft | The prompt box and the answer box; "Starting…" spinner; `beforeunload` guard |
| Animation: reduced motion, transform/opacity, no `transition: all`, interruptible, pause for autoplay over 5 s | `prefers-reduced-motion` block; the river slides by `translate3d` (in steps under reduced motion); every transition lists its properties; the replay has Pause |
| Typography: `…`, curly quotes, non-breaking spaces, `tabular-nums`, balanced headings | Toasts and placeholder; `1 h 25 min` joined with U+00A0; tabular numerals on the whole page |
| Content handling: truncate, `min-width:0`, empty states | Session and lane titles truncate with the full text in `title`; "None running.", "Nothing yet." |
| Performance: no layout reads in render, batch writes, virtualise large lists | Per-frame work is one transform; layout is read only on resize/show; History draws only the window |
| URL reflects state, deep links | The parameters above, written with `replaceState` |
| Destructive actions need confirmation or undo | Stop: "Stop BR1?" with **Stop Session** / **Keep Running**, then **Undo** |
| Touch and interaction: `touch-action: manipulation`, `overscroll-behavior`, no selection during drag, `inert` while dragging, drag needs a keyboard alternative | Set on `html`; `contain` on drawer, rail, canvas, History block; drag pan sets `inert` on the board; arrow keys and `+ - 0` pan and zoom, History has Earlier / Later / Zoom buttons and arrow keys |
| Safe areas, no unwanted scrollbars | `env(safe-area-inset-*)` on the body, `overflow:hidden` on the page, panes scroll inside |
| Theming: `color-scheme`, `theme-color`, native `select` colours | `color-scheme: light`, matching `theme-color`, explicit `select` background and colour |
| Locale: `Intl` for dates and numbers, `translate="no"` on identifiers | All times through `Intl.DateTimeFormat`, counts through `Intl.NumberFormat` (compact); tags, part names, paths are `translate="no"` |
| Hover states stronger than rest | Buttons, tabs, cards, tiles, chips, lane labels |
| Copy: Title Case buttons, numerals, specific labels, error with a fix | "Start Session", "Send Answer", "Keep Running"; "Write a prompt first, then press Start Session." |
| Anti-patterns | None used: no `user-scalable=no`, no `<div onClick>`, no `transition: all`, no images without size (there are no images) |

## Review (the skill's list against my own files, by memory of the code; line numbers not checked)
Not done: a read of the three scripts and the stylesheet line by line in the skill's `file:line` format, and the one
fix round after it. What I know is open, in the skill's wording:
- `app.js`, `now.js`, `history.js` (SVG): bars, trouble marks and week brush are pointer-only inside the SVG, no tab stop;
  the keyboard routes are the rail cards, the lane chips, History lane labels, **Next / Previous Trouble** and the arrow
  keys. Gesture without a keyboard alternative is met only through those.
- `style.css`: hover and flash transitions animate `background-color`, `border-color`, `box-shadow`, `color`; the rule
  says `transform`/`opacity` only. Not changed.
- `now.js`: 79 tiles are not virtualised (rule: lists over 50). They are a fixed board; left as is.
- `history.js`: `getBoundingClientRect` is read on every pointer move of the week brush (layout read in an event).
- Drawer covers the right of the board when open; a focused tile under it is not scrolled into view (sticky overlay rule).
- `index.html`: the Now page has no visible h2 (its sections have); the speed is read from the URL but not written back.

## Found while looking, not caused by the skill
- `--screenshot` in headless Edge does not run animation frames: lane chips and the helper count in the river stay
  empty in such a shot. I drove a real page through the DevTools protocol instead; there they fill (verified).
- Tested by script on a live page: answer, stop, confirm, undo, empty and valid prompt, opener switch, double-click
  open, zoom, keys, play, scrub, river click, Escape, tabs, History zoom, day buttons, trouble buttons, lane labels.
  Seen working. Not tested: wheel zoom, week-brush drag, touch.
- History keeps blank rows for sessions that start after the replay minute (labels hidden), so there is a gap in the
  lane list early in the replay.
- Opening a part or a session marks its trouble as seen, so the red on the tile goes out; trouble comes back only on new
  marks. Tokens are the data's tool-call counts (some sessions show none); nothing here is a bill.
- The answer and the started session are dummies: they change the rail only.

## Screenshots taken (scratchpad folder, not in this folder)
`C:\Users\User\AppData\Local\Temp\claude\29140a92c6ee6732\79535d9d-07e6-405d-9868-85a38ff9664f\scratchpad\`:
`now1.png` (03:29), `now2.png` (13:03, after the quiet stretch), `hist1.png` and `hist3.png` (History, window 00:00 to
15:00), `drawer-session.png`, `drawer-part.png`, `now-1440.png` (taken, not looked at), `s1.png` to `s3.png` (early,
before fixes). Weak spots seen in them: the board fits at 89 to 95 percent, so tile text is slightly small at 1870 px;
the river is 200 px high and carries a lot at once.

## Not done
Dark theme, a touch pass, a screen-reader pass, wheel zoom check, the formal review and its fix round.
