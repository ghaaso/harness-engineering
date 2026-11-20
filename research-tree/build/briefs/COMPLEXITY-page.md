# Brief: the owner's page for the complexity analysis (helper of top session 3; kind build, Sonnet)

Make one HTML page, `research-tree/build/reports/complexity.html` (main checkout
`C:/Users/User/Documents/projects/harness-engineering`), from `research-tree/build/COMPLEXITY.md` (version 2: the
analysis corrected by its blind review `research-tree/build/refute/COMPLEXITY.md`, 14 findings, all folded in; see its
"Changes from version 1") and the facts in this brief. The top session checks and publishes it. You change no other
file and start nothing.

## Who reads it and how
The owner. Plain words, the answer first, short, nothing that matters left out. He reads it on a wide screen (about
1870 px) in light mode; it must also work on a phone. Plain, professional headings ("The answer", "The paths", ...); no
catchy or pitch-style titles or taglines; no emoji. Numbers carry their unit. Say plainly what is not known. Every
figure on the page must be in COMPLEXITY.md or in this brief: compute none and keep the file's rounding. Wherever a path
letter appears, give its plain name with it.

## Check first
Recompute the totals of paths (e) and (e2) from the parts COMPLEXITY.md lists for them (low, expected, high; points as
the file converts them). Do not change the file. If a total differs from its parts by more than 1 %, build the page with
the file's figures anyway and list each difference in your return.

## Content, in this order
1. Title `Pilot plan complexity`; under it one line: 2026-11-20, top session 3, checked by a blind review (14 findings,
   all folded in).
2. **The answer**: section 0's twelve points as short plain lines.
3. **Where the planned pilot's tokens and hours go**: two horizontal bars drawn to scale (inline SVG): the 418 M tokens
   split into research and each other part, and the 8.5-13.8 h split likewise (a range: draw its midpoint, print the
   range in the label). Under them a short table: each part, its amount, its cause as the file names it. Say plainly
   that the 8.5-13.8 h counted a 4.3 h stop for a PC restart as work.
4. **The paths**: the paths table, one row per path, a plain name first (for example "Tree as planned: pilot, then six
   leaves"); tokens, points of the weekly meter, share of the research budget (10 % of a week), wall time, what he
   must do, checks kept, checks dropped. Mark the chosen path in words in its row; under the table, why it was chosen
   over (e), in three lines; then the check codes (Q1 to Q11, F1, comparison 1) as a short plain list.
5. **The chosen path**: its steps in order; tokens and points on both meters; hours; what he must do and when (the go
   naming the downloads, the cap, opening the coordinator); when it can start (no field fits before the reset, Monday
   2026-11-23 12:00 UTC); what it keeps; what it loses, plainly; the risks the file names.
6. **His review idea**: how it stays measured, on how many fields, its tokens, and what it does not measure.
7. **Readers and writers side by side**: what running readers at once saves, what splitting the reading saves, the
   fields one at a time against side by side, and why several writers on one file saves nothing here.
8. **What this PC allows and what limits the width.**
9. **Not known**, and what would measure each.
10. **What happens next**: top session 4 runs the four pieces he approved at 13:33 UTC under a cap of 106 M tokens:
    the router (a model per operation inside a session), running without his typed "go", where the faults came from,
    and the tree drawn as nodes and lines; their results are added to this page once checked. After them, one plan for
    the research run using the router's models, put to him with `approve:` and `cap:`. The pilot's earlier asks (the
    preparation, the 593 M cap) stay on hold until then. Nothing is asked of him on this page.
11. **How the numbers were reached** (short): tokens counted from the session transcripts (input + cache creation +
    cache read + output, once per message id); round 3's four lanes and the build as the measured basis, a basis and
    not a law; points as the file converts them; times written in earlier files for 2026-11-20 ran about 1.5 h early
    and the figures here use the true times; the blind review's 14 findings and the top session's five added
    decisions (one helper per field as a variant, the same seven fields in every path, this week's room at the 13:20
    UTC reading, his review idea kept measured, the recall test kept).
12. **This round's tokens**: 28.04 M when the fold returned (analysis 7.41 M, blind review 7.76 M, fold 6.04 M, top
    session 3 6.83 M); the page and the close-out about 3 M more; his limit 30 M, raised by him to 32 M.

## Form
Put `<title>Pilot plan complexity</title>` and `<meta name="claude:viewport-fit-sides" content="cover">` at the top,
then one `<style>`; no `<!doctype>`, `<html>`, `<head>` or `<body>` tags. Colours as tokens on `:root` (light),
redefined for dark under `@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme="light"])` and again
under `:root[data-theme="dark"]` (with `color-scheme: dark`); `body` has an explicit background from a token. Side gutter
`padding-left: max(16px, env(safe-area-inset-left, 0px))` and the same on the right; nothing scrolls sideways except a
wide table or the SVG, each inside its own `overflow-x: auto` box. Inter for text, Space Grotesk for headings (Google
Fonts) with system fallbacks; text column about 70 characters; `font-variant-numeric: tabular-nums` in tables. Bars:
one scale per bar, labels inside the SVG's bounds, colours and text from the tokens so both themes read. No scripts.
`research-tree/build/reports/pilot-plan.html` shows the register.

## Limits
Tokens: expected about 1 M (the pilot plan's page 0.6 M), limit 2 M: the round's limit is close. Counter:
`node research-tree/build/tools/tokens-self.mjs "page for the complexity analysis"`. No command over 150 s. Write the
list of every figure on the page with the line of COMPLEXITY.md it comes from to `figures.md` in a scratch folder of
your own under `C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/2e993f56-2f1e-43bc-9ba7-77bd4d0832a6/scratchpad/`.
Return only: the page's path, your token count, the check's differences (or "none"), the path of `figures.md`.
