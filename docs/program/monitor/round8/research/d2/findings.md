# Round 8 research, D2 "History": how the best views of work over time show unbroken time

Saved by the round 8 session from d2's hand-back, unchanged: the app refuses a helper's write of a findings file ("return findings as text"). d2 ran on Fable at high effort; about 2.2 M of its 3.5 M limit (its estimate, calls times window). Not achieved: Perfetto's live viewer did not load; the studies are abstract or summary only; Prefect not seen.

Researcher d2, 24 November 2026. Question: how do real views of work over time make a gap (nothing ran 11:33 to 12:18) and a start (two pieces of work began at 12:18) plain at once, with parent and child work, events marked on the real part they hit, and zoom from a week down to minutes (goals 3, 4, 5, 6, 8a, 9, 12).

How things are known, in the words used below: **screen seen** (a picture of the product looked at), **page read** (the page's own text read with headless Edge), **abstract only**, **summary only** (a search tool's summary; not a reading), **from memory**. Nothing was downloaded or installed. 15 pictures kept; other screens were seen and are named with their address.

Sizes used below (computed, from the brief's scale): a week is 10,080 minutes. On a 1,870 px screen with about 1,700 px for the time axis, **one strip for the week gives 5.9 minutes per pixel**: the 45-minute gap is 8 px wide and a 2-minute helper is a third of a pixel. **Seven day-strips stacked give 0.85 minutes per pixel**: the same gap is 53 px and the helper 2.4 px.

---

## A. Views where a gap and a start are read from the shape

### 1. Nx Cloud timeline view: a strip of "how many were running" above packed lanes
- **What it is:** one run of 325 tasks: a thin area strip on top (height = tasks running at once, with two brush handles), below it bars packed into lanes; failed bars red, in their true place; it draws live while the run goes on.
- **Source:** https://nx.dev/blog/nx-cloud-timeline-view (22 September 2026)
- **Picture:** `01-nx-two-bursts-and-idle.png`
- **How known:** screen seen, page read. The author's own reading of this picture: "You don't need to read a single task name to see the problem": a block of work, a long empty middle, a second block.
- **Goals:** 3 (the empty middle and the second start are the first thing seen), 5 (red bar where and when it failed), 9 and 12 (325 bars on one screen because lanes are packed, not one row per task), 10 (live).
- **What breaks with our data:** it is one run of six minutes, not a week. Its lanes are machines, so a bar has no parent; our helpers must stay under their session. At week scale its bars fall under one pixel (see sizes above), so only the strip survives a week; the bars need the brushed window.

### 2. Chrome DevTools performance panel: overview strip with a brushed window, trouble marked in the strip
- **What it is:** a strip of the whole recording (activity as a filled curve; idle is flat) with two handles; the big view below shows only the brushed window. Red bars sit above the curve in the strip wherever a task ran too long, so the place to zoom is visible before zooming.
- **Source:** https://developer.chrome.com/docs/devtools/performance/reference
- **Pictures:** `02-devtools-overview-strip.png`, `03-devtools-long-task-mark.png`
- **How known:** screens seen (the reference page's pictures); page text not read in full.
- **Goals:** 3 (flat = nothing ran), 5 (red in the strip = something broke about there), 9 (week to minutes is one drag of the handles), 12.
- **What breaks:** the strip's height is one number; ours has to choose one (sessions and helpers running, or tokens per minute). One strip per week is 5.9 min per pixel: a short failure is one red pixel. Seven day-strips fix that.

### 3. ActivityWatch timeline: a whole day on a true clock axis
- **What it is:** 00:00 to 24:00, one row per source, each event a bar or a hair-thin tick; the night and the midday break are plain white; scroll to zoom.
- **Source:** https://activitywatch.net/ (screenshot "timeline", version 0.14)
- **Picture:** `09-activitywatch-day.png`
- **How known:** screen seen.
- **Goals:** 3 (gaps and the first event of the morning are plain with no reading), 9.
- **What breaks:** no parent and child; 277 events already merge into barcode stripes; two thirds of the width is empty night. It shows the cost of true time: the quiet hours take the pixels.

### 4. Dagster overview timeline: rows of recurring work over 24 hours, crowded runs merged with a count
- **What it is:** rows are jobs, grouped in folders that carry two counts (succeeded, failed); runs are ticks on a clock axis; runs that would overlap are merged into one block with a number; failed is red; a "Now" line; range buttons 1, 6, 12, 24 hours.
- **Source:** https://docs.dagster.io/guides/operate/webserver
- **Picture:** `10-dagster-runs-timeline.png`
- **How known:** screen seen; the page's text says nothing about the timeline's rules.
- **Goals:** 3, 5 (the red tick is on its row at its time), 12 (merging with a count keeps a crowded row readable).
- **What breaks:** range buttons are fixed windows, not free zoom. A merged block hides which run inside it failed. Our 40 sessions a week fit as 40 rows; 800 helpers do not fit as rows at all.

### 5. Grafana state timeline: nothing is drawn where nothing was
- **What it is:** one row per named thing, coloured blocks by state; where there is no value the row is empty. Options: merge equal neighbours, join gaps shorter than a threshold.
- **Source:** https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/state-timeline/
- **Picture:** `08-grafana-state-timeline-gaps.png`
- **How known:** screen seen, page read.
- **Goals:** 3, 1 and 6 (a row per named part: a hook's row shows when it let through, refused, failed, or was silent).
- **What breaks:** the state names are written inside the blocks and vanish when blocks are narrow; colour must carry the state alone. 60 parts as 60 rows is a table again; about 10 hook rows is the size that reads.

### 6. Grafana status history: fixed time buckets (the thing to avoid for goal 3)
- **What it is:** a grid, one cell per row per time bucket, coloured by state.
- **Source:** https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/status-history/
- **Picture:** not kept. **How known:** screen seen.
- **Goals and break:** red reads at once (as round 6 found for the Airflow grid), but time is cut into equal slots: a start at 12:18 and a start at 12:01 land in the same cell. This is the "fixed slots" the owner rejected.

---

## B. Cutting quiet time out of the axis

### 7. Sentry trace view, "time compression": the cut is drawn and carries its length
- **What it is:** empty stretches between spans are removed from the axis; each cut is a hatched band through all rows with a pill on the axis giving the removed time ("4.02s"); the axis numbers after the band are the true times.
- **Source:** https://docs.sentry.io/concepts/key-terms/tracing/trace-view/ ; announced 21 October 2026, https://sentry.io/changelog/trace-waterfall-time-compression-pinned-attributes-and-web-vitals/
- **Picture:** `04-sentry-time-compression.png`
- **How known:** screen seen, both pages read.
- **Goals:** 3 (the gap is an object on the screen with its size on it), 9 and 12 (busy stretches get the pixels).
- **What breaks:** lengths on the two sides of a band can no longer be compared by eye, and the band's width says nothing about 45 minutes against 9 hours unless the label does. It needs an unbroken view beside it.

### 8. vis-timeline "hidden periods": the same cut with no mark
- **What it is:** nights and weekends are removed from the axis; nothing is drawn at the cut; only the labels jumping from "Fri 18" to "Mon 21" give it away.
- **Source:** https://visjs.github.io/vis-timeline/examples/timeline/other/hidingPeriods.html (live example)
- **Picture:** `15-vis-hidden-periods-unmarked.png`
- **How known:** screen seen (the live example was run).
- **Goals and break:** it fails goal 3 outright: a two-day gap looks like no gap. Kept as the counter-example to 7. The same library has collapsible nested groups and a clustering switch (controls seen, not seen switched on); it is what Temporal's timeline is built on (page read, finding 14).

### 9. The timeline design space (Brehmer, Lee, Bach, Riche, Munzner 2017) names these choices
- **What it is:** five time scales: chronological, relative, logarithmic, sequential, sequential plus interim duration; and four layouts: one line, faceted (several lines), segmented (one line cut into rows), both.
- **Source:** https://timelinesrevisited.github.io/
- **Picture:** not kept. **How known:** project page read and its figure seen; the paper itself not read.
- **Use:** goal 3 asks for the chronological scale. A git graph is the sequential scale. Sentry's band is close to "sequential plus interim duration". A week drawn as seven day rows is the segmented layout.
- **Related, weaker:** Di Bartolomeo et al. 2020 (192 people; line, circle, spiral): shape changes time taken, not correctness. **Abstract only**; the abstract does not say which shape was fastest, so it is not cited for that.

---

## C. Parent and child work

### 10. Honeycomb trace summary: the whole tree as rows of depth, in true time
- **What it is:** above the waterfall, every span is a small pill on the row of its depth (root on top, children under it), so 46 spans take six thin rows; a switch fades everything but the failed one, which stays red.
- **Source:** https://docs.honeycomb.io/investigate/analyze/explore-traces/
- **Picture:** `06-honeycomb-trace-summary.png`
- **How known:** screen seen.
- **Goals:** 4 (child under parent with no lines), 5 (one red pill in a faded tree), 12.
- **What breaks:** children that run at the same time need rows of their own; with 20 helpers at once under one session the block is 20 rows deep unless they are packed (finding 12) or summed into a height.

### 11. Buildkite waterfall: a parent row with one bar for all its children; bars split into waiting and working
- **What it is:** a group is a row with one solid bar over the span of its children, red if any child failed; the children are indented under it. Each child bar has three parts: grey waiting, yellow handed over, green or red running.
- **Source:** https://buildkite.com/docs/pipelines/waterfall
- **Picture:** `11-buildkite-parent-rows.png`
- **How known:** screen seen, page read.
- **Goals:** 4 (waiting against working shows where the time went), 5 (the parent turns red, so a failure is seen while the children are folded away).
- **What breaks:** finished steps only, so not for a live page; the page states a limit of 3,000 jobs; one row per job is a long scroll.

### 12. Perfetto: overlapping pieces packed into two or three sub-rows; state as a thin strip
- **What it is:** in the frame track, pieces that overlap in time drop to a second and third sub-row instead of each getting a row; late ones are red, on-time ones green. A thread's state is one thin coloured strip above its work.
- **Source:** https://perfetto.dev/docs/data-sources/frametimeline , https://perfetto.dev/docs/data-sources/cpu-scheduling
- **Picture:** `13-perfetto-packed-lanes.png`
- **How known:** screens seen (the documentation's pictures). Pinning a track to the top: page read. Folding a group of tracks into one summary row: **from memory**; the live viewer did not finish loading in the headless browser.
- **Goals:** 4, 5, 12.
- **What breaks:** packing still needs as many sub-rows as things run at once (up to 20 for us), so it is the zoomed-in form; zoomed out it has to become a height.

### 13. Jaeger and Grafana Tempo trace views: small map above, one row per span below
- **What it is:** a small map of the whole trace with a brushed window; below it an indented tree of names with a bar per row. Jaeger marks a failed span with a red "!" beside its name.
- **Source:** https://www.jaegertracing.io/img/trace-detail-ss.png ; https://grafana.com/docs/grafana/latest/explore/trace-integration/
- **Picture:** not kept. **How known:** screens seen.
- **Goals:** 3, 9 (the map), 4 (the tree).
- **What breaks:** 51 spans already fill the screen; 800 helpers would be about 17 screens. The red "!" is in the name column, away from the time axis: it says which, not when.

### 14. Temporal timeline: every child is a row
- **What it is:** one row per group of events; child workflows are rows with a long pill; failed is a red pill; single events are dots; zoom-out is limited on purpose.
- **Source:** https://temporal.io/blog/lets-visualize-a-workflow
- **Picture:** `14-temporal-1000-children.png` (a parent with 1,000 children)
- **How known:** screen seen, page read.
- **Goals:** 4, 5.
- **What breaks:** this is our scale problem on a real screen: 1,000 children are a list to scroll, with no summary and the parent not drawn above them.

### 15. Git history views (GitKraken commit graph): order, not time
- **What it is:** one row per commit, coloured lanes and joining lines for branches; this year's version also draws agent sessions as nodes on a branch with a state pill.
- **Source:** https://www.gitkraken.com/features/commit-graph
- **Picture:** not kept. **How known:** screen seen (the product page's picture).
- **Goals:** 4 only (who came from whom).
- **What breaks:** rows are equally spaced, so two minutes and two days between rows look the same: goal 3 fails. Useful only as a way to draw "who started whom" beside a true time axis, not as the axis.

### 16. Dagster run view: boxes joined by lines on a time axis
- **What it is:** one run's steps as boxes placed in time with lines for what waited on what; a scale slider.
- **Source:** https://docs.dagster.io/guides/operate/webserver . **Picture:** not kept. **How known:** screen seen.
- **Goals and break:** 4, for about 15 steps. With 20 helpers at once the joining lines become the mesh that rounds 5 and 7 were rejected for.

---

## D. Marking an event on the part it hit, without words

### 17. DevTools: the mark is on the bar itself
- **What it is:** a task that ran too long has its excess part hatched red and a red corner; moments that concern everything are a dashed vertical line with a small chip in a row of their own; arrows from cause to effect appear for the selected piece only.
- **Source:** as finding 2. **Picture:** `03-devtools-long-task-mark.png`
- **How known:** screens seen.
- **Goals:** 5 (where and when in one mark), 4 (cause arrows only on selection, so no mesh).
- **What breaks:** every call of ours passes about 10 hooks; marking each decision is thousands of marks. Only refused, failed and not-switched-on can be marks; let-through has to be a faint count or nothing.

### 18. Sentry: a count badge on the bar at the moment; child counts on folded rows
- **What it is:** a warning badge with a number sits on the span's bar where the problems happened; named moments are dashed lines with coloured pills on the axis; folded rows show how many children they hide.
- **Source:** as finding 7. **Picture:** `05-sentry-marks-on-span.png`
- **How known:** screen seen, page read.
- **Goals:** 5, 12.
- **What breaks:** the badge says "5 problems here", not which part caused them; naming the hook still needs words or a row for the hook (finding 20).

### 19. Honeycomb: events as circles on the bar
- **What it is:** each event inside a span is a small circle on the bar at its time; failed rows are red.
- **Source:** as finding 10. **Picture:** `07-honeycomb-span-events.png`
- **How known:** screen seen.
- **Goals:** 5. **What breaks:** circles overlap when many fall close together; one row per span.

### 20. Firefox Profiler: marks in a strip of their own above the activity, red where it broke
- **What it is:** each track has a filled activity curve and above it a strip of ticks for events; red bars in that strip mark stretches where the program stopped answering; clicking one zooms to it. Quiet tracks are hidden ("4 / 8 tracks"). Where a track has no data, the page says an indicator gives the reason.
- **Source:** https://github.com/firefox-devtools/profiler/blob/main/docs-user/guide-ui-tour-timeline.md
- **Picture:** `12-firefox-profiler-tracks.png`
- **How known:** screen seen, page read.
- **Goals:** 1 and 5 (a named row for the thing, a red mark at the time), 6 (activity per part over time), 12.
- **What breaks:** black ticks at this density are a barcode; only the red reads without hovering. So: one colour for trouble, the rest pale.

### 21. Grafana annotations: a line through everything
- **What it is:** a dashed vertical line with a small triangle on the axis; a span of time is a shaded band.
- **Source:** https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/annotate-visualizations/
- **Picture:** not kept. **How known:** screen seen.
- **Goals and break:** it says when, not which part or which session; many events make a fence. Right for the few moments that concern everything (the owner left, the owner came back, a limit was hit).

---

## E. Studies: what was read and what was not

### 22. People who use trace views say the standard view is not enough (weak, abstract only)
- Davidson, Wall, Mace 2023, IEEE TVCG, interviews with 6 practitioners at two large companies: 5 challenges and 8 guidelines; the abstract says operators struggle to make effective use of existing tools.
- **Source:** https://virtual.ieeevis.org/year/2023/paper_v-tvcg-10034850.html . **How known:** abstract only; the challenges and guidelines themselves are in a PDF that was not read.

### 23. Overview beside detail, and cut charts: not read
- Isenberg, Bezerianos, Dragicevic, Fekete 2011 (15 people): a chart that shows the full context and the zoomed part together did best; overlaid scales did worst. **Summary only**: the authors' page returned nothing and the archive page was behind a bot check. If true it supports finding 2 and the pairing in idea 3.
- Cockburn, Karlson, Bederson 2008, the review of overview plus detail, zooming, and focus plus context: PDF only, **not read**.
- Morrow et al. 2019, periphery plots (the focus in the middle, squeezed summaries of before and after at the sides): page read (https://ar5iv.arxiv.org/html/1906.07637); no user test found in it; the authors say the side plots are hard to compare.
- Round 6's finding stands and is built on: still frames side by side beat replay (Robertson 2008, Archambault 2011). For History that means the whole week drawn at once, not played.

### Not looked at
Prefect's run graph (the documentation page had moved); GitHub Actions' graph and Speedscope (captured, not examined: neither has a clock axis over many runs); Perfetto's live viewer (did not load); video editors and calendars, which are the everyday unbroken-time views.

---

## What breaks at 40 sessions and 800 helpers a week, in one place

| Form | Where it stops working |
|---|---|
| One row per piece of work (Jaeger, Temporal, Honeycomb waterfall, Buildkite) | about 50 rows a screen; 800 helpers is 17 screens |
| Lines from parent to child (Dagster run view, git graph) | about 15 to 20 children; then a mesh |
| One strip for the whole week | 5.9 min per pixel: a 45-minute gap is 8 px, a helper under 1 px |
| Unbroken clock axis (ActivityWatch) | most of the width is quiet hours |
| Cutting quiet hours with no mark (vis-timeline) | the gap disappears |
| A mark for every event (Firefox ticks) | a barcode; only one trouble colour survives |
| Fixed buckets (status history) | starts inside a bucket cannot be told apart |

---

## The three ideas to take into a prototype, ranked

**1. A week strip that is never cut, with a brushed window onto session lanes.** Seven day-strips stacked (0.85 min per pixel): height = sessions and helpers running, red ticks where something failed or was refused. The brushed window below: one lane per session, its helpers packed under it, a failure red on the bar.
Goals 3, 4, 5, 8a, 9, 12. At a glance: white is "nothing ran", a rising edge is "something started", red is "look here".
Pictures: `01`, `02`, `09`, `10`, `13`, `06`.

**2. A row for each hook on the same time axis.** About 10 thin named rows under the lanes: a mark at each refusal or failure, a pale trace for let-through, an empty row for a hook that never fired; the same instant is marked on the session's bar, so the column joins "which hook" to "which session".
Goals 1, 5, 6. At a glance: the row is the part, the position is the time, the colour is the result; no words under boxes.
Pictures: `08`, `12`, `03`, `05`.

**3. In the zoomed view only, fold long quiet stretches into a marked band that carries its length.** A hatched band with "45 min" or "9 h" on it; the week strip above stays whole, so nothing is hidden and busy hours get the pixels.
Goals 3, 9, 12. At a glance: the gap becomes a thing with a number on it rather than empty width.
Pictures: `04` (do this), `15` (not this).
