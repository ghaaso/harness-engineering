# Harness v2 design: evidence and build (2026-11-11)

**Status.** Design only. Nothing was built, installed, wired or committed. Everything here is untracked, like the compile it rests on: it holds details of the clinic build and of the owner's PC, and where it goes is the owner's call.

## What is where

| Path | What it is |
| --- | --- |
| `docs/program/harness-v2/architecture.json` | The architecture: the parts of the machine, the feedback loops, the stock-and-flow model and its numbers, the plan check for parallel work, the library, the token methods |
| `docs/program/harness-v2/index.html` | The architecture page. Generated from architecture.json. This is the owner's main page since 11 November, after the owner said the first page reported status instead of showing the harness |
| `docs/program/harness-v2/plan.html` | The earlier page: the 21 problems, the five phases, the decisions. Generated from design.json |
| `src/arch.html.txt`, `src/arch.css.txt`, `src/arch.js.txt` | Skeleton, styles and script of the architecture page. The model (simulate, capacity) is in arch.js.txt |
| `read/orchestration-doc.md`, `read/knowledge-store-design.md` | What the orchestration document and the knowledge-store design (PR #183) say, for the plan check and the library |
| `refute-architecture.md` | The refuter pass over the architecture and its model |
| `docs/program/harness-v2/design.json` | The single data source: 21 bottlenecks, 5 phases, 11 mechanisms, 22 decision cards, the budget, the conflicts, what is not built, six demos, and every number with its tag and source |
| `docs/program/HARNESS-V2-DESIGN-2026-11.md` | The record for agents and for git. Generated from the same data |
| `build.js.txt` | The build script. It checks the data, then writes the page, the record, `numbers.md` and `build-report.txt` |
| `src/page.html.txt`, `src/page.css.txt`, `src/page.js.txt` | The page's skeleton, styles and script. They hold no design content |
| `numbers.md` | Every number used, with its tag and source. Generated |
| `build-report.txt` | The last build: check results and the lint of untagged digits |
| `read/*.md` | Four fact sheets from the reading agents, with file and line |
| `refute-fidelity.md`, `refute-design.md` | The two refuter passes over the first draft |
| `refute-adjudication.md` | What each refuter finding changed |
| `cold-reader.md` | The cold-reader test of the page |
| `screenshots/` | Sixteen screenshots from the browser run |

## To rebuild

```bash
cd docs/program/evidence/harness-v2-design && node - < build.js.txt
```

The script refuses to write if a check fails. It checks, among other things: 21 bottlenecks in classes 7, 7, 3, 4; the eleven bottlenecks no idea reaches; every bottleneck answered by a build in its own phase and in no other; 29 idea ids across 11 mechanisms, without G4-F084; every decide-class bottleneck has a decision card; 24 shutdowns; token bands that add up; the count and median of the recorded waits; every number has a tag and a source; and no network reference in the page.

## How it was made

- The main session read the compile, the machine facts, the token tallies, the fit list and its check, and wrote the design.
- Four Sonnet readers pulled exact figures with file and line (`read/`).
- Two Opus refuters attacked the first draft: 27 fidelity findings and 23 soundness attacks. The main session checked the cited lines and took almost all of them (`refute-adjudication.md`).
- One Sonnet cold reader opened the finished page in the browser pane, with no other source, and answered ten questions. All ten answers were right. On one (the compaction figure) it reached the right conclusion without finding the page's own number, which sat only inside a demo; that number is now also in phase 5. It also named eight readability problems; six were fixed (jargon now explains itself where it first appears and in a word list; decision counts say "now" and "later"; part 2 has jump links to the order, rules, budget and conflicts; tags no longer fuse to their numbers; "our lean" and the small codes are explained; an internal note moved to the limits). Two were left: the page is long, and the opening summary is dense.
- Total: seven subagents, about 1.1M subagent tokens, in batches of at most four.

## Browser run

The page was opened in the app's browser pane as a local file. Checked by clicking: the five-facts cards, the shutdown strip, the map and its filters, a problem drawer and a mechanism drawer, all five phases, the eleven-mechanism ladder, the dependency diagram, the budget and conflicts, all six demos with their controls, the decisions board (choosing options, the power-cut inputs, copying answers, the switch to all 22), light and dark, and phone width (375 px, no sideways scroll). The console showed no errors at any point.

One limit of the run: the pane's screenshot tool often returned a blank or stale frame right after a scripted scroll or click, while the page itself was correct (checked through the page's own state). The screenshots kept here are the ones that captured correctly. Two of them (`10`, `12`) predate small fixes: the wait chart's labels and a line break inside an assumption box.

## Limits

- The design rests on the compile, which was made by models reading records. Nothing here was run against the clinic repository.
- One fact was checked on this PC for this design: `cleanupPeriodDays` is not set in the user settings file, so the app's default transcript clean-up applies.
- The cold reader did not open the demos or the problem tiles. Those were checked by the main session only.
