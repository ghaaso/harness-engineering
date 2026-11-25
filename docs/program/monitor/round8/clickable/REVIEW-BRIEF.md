# Review, choose with him, then build the final: the brief for the Opus session

Round 8 of the owner's session tool, 2026-11-24. Kind of job: analyse (model Opus, extra effort, as he asked).

**Read first:** `BRIEF.md` in this folder (his words of 2026-11-24 in full, unedited; they are the task and outrank this
file), then `docs/program/monitor/NEXT-ROUND-8.md` sections 1, 3 and 5 (his earlier words, the goals he approved, the
skills).

**What is here:** four clickable prototypes, each built by a Sonnet session armed with one skill:
`ux-designer/`, `ui-ux-pro-max/`, `web-design-guidelines/`, `impeccable/`, each with `index.html` and `NOTES.md` (what
the skill said and where it shows). All use `shared/data.js` (dummy data with real names, a replay of Tuesday 24 Nov).

## Steps (his words: "review them, aggregate them, see which ones are good ... an interactive conversation between me
and that agent, see which skill produced what kind of the thing good ... pick out the good stuff from each one ... use
those skills and aggregate our results into one final good one")

1. **Review each page once**, by using it: open it in the Browser pane, click through Now, History and the operating
   controls, watch the replay move. Use the two review skills he attached for this (`~/.claude/skills/ux-audit`, then
   `design-review`; read each `SKILL.md` and what it points to, in full; never run their scripts, never `npx`, never log
   in) and the stranger test of `NEXT-ROUND-8.md` section 3 ("How it is judged"). One review per page; no repair rounds.
2. **Show him the four side by side**, as a page with the real screenshots first: for each page what is good and what
   is not, and which skill produced it. Plain words, short, a handful of numbers at most.
3. **Talk it through with him.** He picks what to keep from each. Facts about his use may be asked; design questions
   are not put to him (CLAUDE.md rule 7): you recommend, he says yes or no.
4. **Build the final page** in `final/` from his picks, reading and following the skills that produced them (in full,
   as their `SKILL.md` says). Same rules as `BRIEF.md`: front end only, dummy data, `file://`, no server, no installs.
   Look at real screenshots; show him the first working state early.

Write only under `docs/program/monitor/round8/clickable/` (`review/` and `final/`). Commit nothing. Tokens: your limit is
in your start message; count your spend with the `tok.mjs` line in `BRIEF.md` (your transcript holds "Opus review and
final"); stop at nine tenths and say so.
