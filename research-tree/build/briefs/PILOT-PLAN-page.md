# Brief: the owner's page for the pilot's plan and cap (helper of top session 2; kind build, Sonnet)

Make one HTML page, `research-tree/build/reports/pilot-plan.html` (main checkout
`C:/Users/User/Documents/projects/harness-engineering`), from `research-tree/build/PILOT-PLAN.md` (the plan, already
corrected by its blind review `research-tree/build/refute/PILOT-PLAN.md`) and the close-out facts below. The top
session checks and publishes it. You change no other file and start nothing.

## Who reads it and how
The owner. He reads plain words, the answer first, short, with nothing that matters left out. He looks at it on a
wide screen (about 1870 px) in light mode; it must also work on a phone. No catchy or pitch-style titles or taglines:
plain, professional headings ("The answer", "What I need from you now", "What runs", ...). No emoji. Numbers carry
their unit. Say plainly what is not known. Every figure on the page must be in `PILOT-PLAN.md` or in this brief; do not
compute new ones and do not round differently from the file.

## Content, in this order
1. **Title** `Pilot plan and cap` and one line under it: date 2026-11-20, "top session 2".
2. **The answer** (at most 8 short lines): what the pilot is (one research field run by the tree, compared with one
   session doing the same job; protocol v2 section 11); that a small fix round must come first and why in one line
   (the plan's four gaps, by name); expected tokens and points; the cap and the meter lines it means (all models and
   Fable); when it can run (this week only with a higher line, otherwise from the reset, Monday 2026-11-23 12:00 UTC);
   time (preparation, the pilot, the number of turns he types). State that the pilot's coordinator runs on **Fable**
   because its child sessions have helpers of their own (his ruling r57-0035), and that he opens it himself, since an
   Opus session cannot start a Fable one. State that the go (asked later) is an exception to CLAUDE.md rule 3: the
   pilot runs on this PC with the network on, outside a container, because its readers use the web; without his
   approval of that exception the pilot does not run. Say plainly that he types about 37-58 turns during the pilot
   (each child session and each coordinator successor starts only on a turn he types).
3. **What I need from you now**: only the asks the plan marks for now, each as the exact `approve:` or `cap:` line
   from its section 6, each with its tokens and points. Then a short list "Asked later, not now" with the other asks
   and when each comes.
4. **What runs**: a simple tree of who starts whom: every agent its own small node with a short name (one to four
   words), joined by a line to the one that starts it; colour for the model with a one-line legend; no figures inside
   the nodes. Inline SVG, drawn to fit its box, readable in light and dark. Below it, a table of the nodes: name,
   model, started by, expected tokens, limit.
5. **Before the pilot, and what the pilot measures**: the fix round's four items in plain words (one line each); what
   the owner does himself before the go (the deny rules, importing the dead-man task); what is left to measure in the
   pilot rather than fixed first.
6. **How the numbers were reached** (short): measured from the build and from past research sessions; expected =
   median of like-for-like work; cap = expected + every node at its upper quartile together; the meter conversion
   (about 62 M tokens a point, one week, mostly Opus); the build used 2.3 times its plan, and what stops this plan if
   it overruns (the line stops new starts; he is asked again).
7. **Not known**: the plan's section 5, as a short list.
8. **Done today (the build's close-out)**: the build's last records committed on branch `build` (17be051d), nothing
   merged or pushed; 13 records written into the library (journal `2026-11-20/r57.jsonl`, board 1.4, next task the
   pilot), commit 01fd5514 on the working branch; five of the six finished sessions archived, the sixth ("analyse:
   harness check and build orchestration plan") refused by the app's auto-mode check, left for him to archive from the
   sidebar; the memory note on the research tree corrected. Measured on the way: the build used 908 M tokens, 2.3 times
   its plan; one point of the weekly meter took about 62 M tokens, not the 40 M planned.

## Form
A plain, well-set page. Put `<title>Pilot plan and cap</title>` and the
`<meta name="claude:viewport-fit-sides" content="cover">` tag at the top, then one `<style>`; no `<!doctype>`,
`<html>`, `<head>` or `<body>` tags (the publisher wraps the page). Colours as tokens on `:root` (light), redefined for
dark under `@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme="light"])` and again under
`:root[data-theme="dark"]`; `body` has an explicit background from a token. Side gutter
`padding-left: max(16px, env(safe-area-inset-left, 0px))` and the same on the right; nothing scrolls sideways except a
wide table or the SVG inside its own `overflow-x: auto` box. Fonts: Inter for text, Space Grotesk for headings, from
Google Fonts, with system fallbacks. Text column about 70 characters; tables may be wider. No scripts are needed. The
earlier report pages (`research-tree/build/reports/fx-w6.html`) show the register; you need not copy their look.

## Limits
Tokens: expected about 2 M, limit 6 M. No command over 150 s. Return the path and a list of every figure on the page
with the line of `PILOT-PLAN.md` it comes from.
