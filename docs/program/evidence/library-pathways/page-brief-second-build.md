# Pathway map page: brief for the second build

Written by the orchestrating session on 2026-11-12 after opening the first build. The first build is correct but unusable for its reader: 33,957 px tall at the pane's width, 5,184 words of limitation cards open at once, and 543 words of caveats before the map.

## The reader

The owner. He has moderate ADHD. He understands a design from a picture he can step through and a small simulation he can run. He rejected an earlier page in this project for leading with status and caveats instead of the system. He proposed this map himself ("trees, ensemble models and graphs") and wants to use it for his method: find the real limitations, then solve them one by one until what is left is unsolvable or not worth solving. So the page has to show him where the design breaks and how much each limitation holds the result down.

## Order of the page

1. **Title, two sentences, the three tags on one line.** Nothing else above the map. No summary box, no caveat list, no word list (put the word list behind one tap).
2. **The map.** As built: graph, pickers, route tree, stepper. Keep.
3. **The funnel** (new, brief section 13, R16). One horizontal picture: 100 pieces of work the cheap model would get wrong alone, and how many are left after each step, down to how many the library turns right. Drawn at the current settings, with two faint marks at each step for the unfavourable and favourable reference settings (R15). Under each step: how many limitations sit there and how many of the 59 real cases broke there (tag M). Tapping a step opens that step's limitations. This is the centre of the page: it is the pathway, measured.
4. **Where real cases broke.** The grid as built. Keep the one-line statement that these are chosen problem cases. Keep the mark on steps that rest on the earlier knowledge-store design.
5. **The limitations, by step.** Collapsed: one line per limitation (title, real cases and families, contradicted or not, its weight from R17). The description, examples and unknowns open on tap. A step's limitations open together from the funnel. Above the list, two short ranked lists: the single limitations with the largest weight, and the steps with the largest weight when all their limitations are moved together. "Where it worked" stays beside it with equal weight.
6. **Run it.** Three reference settings side by side (R15) as one small table: cost and wrong rate against the ladder and against the strong model, and the funnel's last number. Then the sliders, the three-way table, the time path, the stock drawing. Caveats that change how a number reads sit next to that number, one line each, the rest behind a tap.
7. **Many runs.** The tie control (0, 0.5, 1) with results side by side. Spread, scatter, ranking. One line stating how many unknowns are guesses.
8. **What the map leaves out.** As built, updated for revision 3.

## Text

- Halve the visible words. Target: under 2,500 words visible with everything collapsed (the first build shows about 11,500).
- One idea per sentence. No sentence over 20 words.
- Plain names everywhere. A file id may appear second, small.
- Say "piece of work", never "episode".
- Today's notes (CLAUDE.md, the memory notes, checks in the shared test run) are in every way of working, so they cancel out. Say that once, next to the comparison with the ladder. Remove "the ladder keeps no notes".
- No fixes, no verdicts, every number tagged, the 59 cases never read as rates. "The weight of a limitation" is a measurement: word it as "how much this holds the result down", never as advice.

## Unchanged rules

One self-contained file that opens from disk. Data and engine inlined from the data files by the build script; outputs never edited by hand. The picture is the model. Plain ink, stocks as boxes, flows with valves, loops marked R or B, light and dark, usable at phone width. The record `docs/program/LIBRARY-PATHWAYS-2026-11.md` is generated from the same data and stays under 250 lines.
