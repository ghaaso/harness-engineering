# Pathway map page: brief for the third build

Written by the orchestrating session on 2026-11-12 after opening the second build in the browser pane. The second build's brief is kept as `page-brief-second-build.md`. The second build is close: the order is right, the funnel works, and nothing but the title sits above the map. Four things are wrong for its reader, and this build corrects them.

1. **The ranking misleads.** Every limitation is weighed with all else at its middle value. There the largest weight is 1.2 % and the limitation with the most real cases is below zero. The owner ranks by weight, so he would set aside the trigger. Model brief section 14, R19, gives two weights.
2. **The reference settings and the tie lean toward the library.** R18 replaces them with three conditions and their eight corners.
3. **The page does not open in the app's pane.** The pane refuses a local file over 512 KiB. The second build is 537,860 bytes.
4. **The map's text is too small.** At the pane's width the graph's labels are about 7 px on screen.

## The reader

The owner. He has moderate ADHD. He understands a design from a picture he can step through and a small simulation he can run. He proposed this map himself ("trees, ensemble models and graphs"). His method: find the real limitations, then solve them one by one until what is left is unsolvable or not worth solving. He asked for cases to be defined before any opinion is given. So the page has to show him the cases in which the design pays, where it breaks, and what each limitation costs if it is the one left unsolved.

## Order of the page

1. **Title, two sentences, the three tags on one line.** As built. Nothing else above the map.
2. **The map.** As built, with two changes. Text in the graph is at least 11 px on screen at a 644 px pane; let the graph scroll sideways and size the boxes to fit. The promoted-check path (R21) is drawn: from the stock of good entries to the gate, with no lookup.
3. **The funnel.** As built, with one faint mark only, at the all-good setting. One line under it: checks promoted into the shared tests do not pass through this funnel, with the number they catch at the gate.
4. **Three conditions** (new, R18). This is the "define the cases" section.
   - One sentence each for the three conditions, in plain words: much of the work comes back; an entry reaches the cheap model; the entry is right and is used rightly. One more line for what the library costs to run.
   - A table of the eight corners, one row each, in words (little or much comes back; low or high reach; poor or good entries), plus a row for the middle values. Columns: cost and wrong rate against the ladder, cost and wrong rate against the strong model. Mark each row as below, near or above the ladder by a pattern, never by colour alone. Under it: the all-good setting with running cost at its low and high ends, and the worst corner.
   - The square (R18c): reach across, quality up, a toggle for how much comes back (little, middle value, much), a toggle for cost or wrong rate against the ladder. Cells shaded by value, with the line where the ratio is one. Tapping a cell shows its four ratios.
   - No sentence may say what the owner should conclude. The table and the square are the statement.
5. **Where real cases broke.** As built.
6. **The limitations, by step.**
   - First a short box, "Two weights": what "alone" and "last" mean, one sentence each, and that the shares do not add up because the steps multiply. Then the size of the full fall they are shares of, with its tag.
   - Ranked lists by "last": the four groups, then the ten steps, each row with both bars. Then the steps moved one after another as a small waterfall, ending with the share that belongs to unknowns no limitation names, with their plain names.
   - The table: one line per limitation with cases, families, other-way count, "alone" and "last". A limitation that shares its unknowns with others says so on the row. Rows that act only through the gate or the ladder say so and link to the table below. Rows with no setting say "not in the model".
   - "The gate and the ladder" (R20): one small table. Cost and wrong rate of the three ways, at the middle values and with the library at all-good, each as it is, with the gate group moved, with the ladder group moved, and with both. One line: these unknowns are shared by all three ways.
   - "Savings the walks saw or estimated" stays beside the limitations, as built.
7. **Run it.** As built, without the three-setting table (section 4 replaces it). The usage panel gains the promoted-check figures. The stock drawing gains the promoted-check arrow and marks any loop it closes.
8. **Many runs.** Tie 0, 0.5 and 1 side by side, with four shared levels, one per group (R18b). Remove the sentence about the tie's lean; say instead that no group is tied to another. One line states how many unknowns are guesses.
9. **What the map leaves out.** Updated for revision 4: the pinned-defect effect of promoted checks; the limitation-to-unknown match is a judgment; weights are shares of a fall that is itself a guess. Drop items revision 4 made untrue.
10. **Words**, behind one tap.

## Size

`index.html` must be under 500,000 bytes. Do it in the build, not by cutting content the page shows: strip comment lines, block comments, leading indentation and blank lines from the inlined scripts and style sheet, and leave out of the inlined data any field the page never reads. The parity check then runs on what is inlined, and the build fails above the limit. `engine.js` on disk stays readable.

## Text

- At most 2,500 words visible with everything collapsed. One idea per sentence. No sentence over 20 words, in page copy and in data text.
- Plain names everywhere: "comes back" for recurrence, "reach", "entry quality", "running cost". A file id may appear second, small.
- Say "piece of work", never "episode". Say "middle value", never "best value" or "best guess", for the value an unknown starts at. "All-good setting" for the setting with every library unknown at its good end.
- Today's notes are in every way of working and cancel out. Say it once, beside the comparison with the ladder.
- No fixes, no verdicts, every number tagged, the 59 cases never read as rates. A weight is a measurement. Word "alone" as "what moving only this gives" and "last" as "what is lost if only this stays". Never word either as advice.

## Unchanged rules

One self-contained file that opens from disk. Data and engine inlined from the data files by the build script; outputs never edited by hand. The picture is the model. Plain ink, stocks as boxes, flows with valves, loops marked R or B, light and dark, usable at phone width, no browser storage. The record `docs/program/LIBRARY-PATHWAYS-2026-11.md` is generated from the same data and stays under 250 lines.

## Looking at the page

The browser pane refuses the local file while it is over 512 KiB, and shows files as a frozen snapshot in some sessions. A static server is configured for this: preview name `pathway-map` in `.claude/launch.json`, serving `docs/program` on port 5199. The page is at `http://localhost:5199/library-pathways/index.html`. Scripted scrolling needs `behavior: 'instant'`, or screenshots show the old position.
