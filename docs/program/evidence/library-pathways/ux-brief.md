# Pathway map: readability and UX brief (2026-11-13)

Written by the orchestrating session after the owner saw the third build.

## What the owner said

He opened the page in a desktop browser about 1870 px wide, light theme, picked "Strong model directly" in the map, and sent a screenshot with this:

> "you put in work but the human readability and ux are not upto par, DONOT reduce the complexity and miss things. You understand the goal and problem right?"

So the content is accepted. The way it is shown is not. Two orders that pull against each other, and both hold:

1. **Make it readable by a person.** He has moderate ADHD. He understands a design from a picture he can step through and a small simulation he can run. He should see the design working by looking, without decoding.
2. **Remove nothing.** Every state, branch, number, limitation, case, unknown, control and caveat on the page stays reachable. Readability comes from layout, hierarchy, labelling, numbers on the picture and focus-plus-context. It never comes from dropping, merging away or summarising content. Quiet is allowed. Gone is not.

Earlier rejections by the same owner, for context: a page built from coloured status tiles and cards ("terrible representations of what I want to showcase"); a page that led with status and caveats instead of the system; a 34,000 px page of open cards. He asked by name for system-dynamics pictures: stocks as boxes, flows with valves, feedback loops marked R and B, a model the reader can run.

## The goal of the page

His method for the library design: find the real limitations, then solve them one by one until what is left is unsolvable or not worth solving. The page serves that. It must let him see:

- every path a piece of work can take, under each of the three ways of working;
- how much work goes down each path and what it costs;
- where the design breaks (limitations and real cases, placed on the path);
- what each limitation costs if it is the one left unsolved;
- in which cases the design pays.

## What is wrong now (seen at 1870 x 1280, light; pictures in `shots/current-1870/`)

The map (`01-map-library-default.png`, `02-map-strong.png`, `03-map-ladder.png`):

- It draws the model's internals, all at one visual weight. With "Strong model directly" about 25 of the 40 boxes are states that way never enters, drawn as strongly as the live path.
- The graph is 1709 px wide inside a card about 1450 px wide. The right third (capture, afterlife, outcomes) is off screen. Sideways scrolling cuts the left side instead.
- Text in the graph is 11 px on a large monitor.
- Lines carry no numbers. Thickness is the only cue for how much work goes where, and a split cannot be read.
- Lines overlap, run along box edges as thick bars, and loop around the whole drawing. Branches that carry nothing are drawn as long dashed rectangles.
- Labels are model names: "Gate: Opus output right", "design step 8".
- The default picture is one kind of work that is 1.1 % of all work. There is no picture of all work.
- Five groups of pickers and a slider, with no word on what each changes. Some options are greyed with a one-line reason.
- The three ways of working can only be compared by switching and remembering.
- Limitations and broken cases are not on the map at all. They are only under the funnel and in a table far below.
- The route tree (244 routes for one kind of work) and the stepper sit under the graph. Their link to the picture is weak.
- The legend is small and below the drawing. The "Good entries" stock floats at the bottom with a label that collides with a line.

The rest of the page (`04` to `11`):

- The funnel's bars are drawn against 100, so every bar after the first is a sliver. The step-to-step survival (the thing that matters) is not shown.
- Page text sits in a 640 px measure inside 1450 px cards. Cards are stretched to equal height and are half empty.
- Tables are walls of numbers with no picture: the corner table, the gate and ladder table, the three-ways table.
- The "alone" bars in the weights are nearly invisible hatching. Bars are short and far from their labels.
- The cases grid is a 2300 px column of small glyphs with a legend above it.
- Small grey 12 to 13 px type carries important notes.
- Tag chips (M, S, G) repeat on almost every number and add noise.

## Rules for any redesign

Content:

- Nothing removed (see `inventory.json` when it exists). If something is shown more quietly, it stays in place and is one obvious action away.
- The picture is the model: everything drawn is computed from `map.json` by `engine.js`. Nothing is hard-coded and nothing is computed that `map.json` does not declare. A new view that needs a new measure declares it in `map.json`.
- Every number keeps its tag: M measured on this PC, S an outside study or the price list, G a guess. A tag may be shown once for a whole picture or table whose numbers share it, instead of on every number.
- No fixes and no verdicts. A weight is a measurement. The 59 real cases are chosen problem cases: they show where steps break, never how often.
- Plain English: one idea per sentence, no sentence over 20 words, no undefined term. Say "piece of work", "middle value", "all-good setting".

Reading:

- Overview first, then zoom and filter, then details on demand.
- The first picture answers one question for all work: of 100 pieces of work, where do they go, where do they end, what does it cost. One kind of work is a filter on that picture.
- Numbers sit on the picture: a count on every state and on every branch that carries work.
- One reading direction. No sideways page scroll at any width. At 1280 px and wider the whole main picture is visible without scrolling sideways. On a narrow pane it reflows (for example top to bottom); it does not shrink to unreadable text.
- Text in a diagram is at least 13 px at 1280 px and wider, and at least 12 px on a narrow pane. Body text is at least 16 px. Notes are at least 14 px.
- Labels say what happens in plain words, for example "The gate catches it" or "Opus gets it right". Stage headers name the step in words.
- A state or branch that carries no work under the current choice stays in its place, drawn quietly, with one line saying why it is empty.
- The three ways of working can be compared without switching and remembering.
- Each control says what it changes, and the picture shows what changed.
- Limitations and broken cases are placed on the path, at the step where they sit, and open from there.
- The legend sits beside what it explains.
- One visual language across the page: the same mark means the same outcome everywhere.

Look:

- No decorative tiles and no colour-coded status cards.
- Colour may carry meaning in a diagram if every colour is paired with a second cue (pattern, shape, label), and no more than three hues are used. Light and dark themes both work.
- Stocks as boxes, flows with valves, loops marked R or B, where a stock-and-flow picture is drawn.
- Use the width. On a wide screen the layout is wide; cards are as tall as their content.

Mechanics:

- One self-contained file that opens from disk. No outside files, no browser storage, no libraries from the web. Under 500,000 bytes for the final page.
- Usable with a keyboard. Every interactive mark has a visible focus state and a text alternative.

## Looking at your own work

`shot.js.txt` in this folder takes full-resolution pictures of any page in any state, at any width, light or dark, with no dependencies. Its header says how. Each job starts its own browser, so several can run at once. Read the PNG files it writes and judge them as the owner would. A design that has not been looked at as pixels is not done.
