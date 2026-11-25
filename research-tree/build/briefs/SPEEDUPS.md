# Brief: the speed-ups we got from working in parallel, and the agent map, as one PDF (helper of top session 2; kind build, Sonnet)

## What the owner said (2026-11-20, to top session 2)
"I need a PDF in which that draw.io diagram tree whatever is attached, and the speedups and the improvements with the
parallelization and all the other stuff is mentioned along with how we achieved it." Of the chat answer he got (a table
of three rows: test suite 596 s to 120 s, build helpers about 1.8x, model-check runs about 1.8x, then bullets): "it's
not that elaborate of how, what's going on, what we solved, why ... It's still very vague. The readability and
conveyance of the information is not optimal at all ... It must not be too exhaustive or complicated." And: "is it we
just got 3 places where we got faster ... Are there other categories? Anything else? ... the method of multiple writers
writing on the same file compared to how we were doing before, like only one writer. I don't even see that being
mentioned here." Write for a reader who is bright but busy: plain words, short paragraphs, numbers first.

## Step 1: find every improvement (read; change nothing)
Collect every place where running work side by side, or a change made for it, made something faster, wider or
cheaper, with before and after. Start from these, then search the library for more (`bash library/lookup.sh <word>`
for: at once, side by side, parallel, shards, slots, lane, worktree, own copy, skeleton, landing, readers, width,
background, wait, queue):
- The test suite: r57-0103 (596 s, one file at a time), r57-0159 (4 at once each 1.06-1.15x its time alone; the
  self-test split into 4 shards, 221 s to 67-70 s; whole suite 120.4 s against 264 s and 596 s), r57-0403,
  `research-tree/build/facts/lane-and-shards.md`.
- The heavy-command queue (lane): r57-0127 (2 slots; 780 commands ran 365 min and waited about 177 min; two at once
  only 41 of 324 min), r57-0159 (raised to 4), hc1-0100 to hc1-0112.
- Several writers on one file, against one writer per file: r57-0012 (the owner rejected one writer per file as the
  coarsest lock), r57-0128 (of 14 units: 3 at once with one writer per file, 7 per function or block, 8 per statement
  with 0b first; 20 shared places), r57-0401 and r57-0415 (the method: own copies, a skeleton change first, one
  landing script in one order through the check), r57-0166 (slice 0 built 0b, the landing script land.mjs and the
  skeleton), r57-0167 and `research-tree/build/reports/slice-1.md` (B1-1: eight fixes, 7 builders at once; 1.8 helpers
  at a time on average, 3.2 in B1-1; the chain W1 to W4 at 80-117 min a link set the time; 42 min with no helper),
  `research-tree/build/landings.jsonl` (two landings, W7 and CLAIM, stopped with conflicts in shared spec files; say
  how they were then landed), `git worktree list` (one worktree per unit). Give the comparison he asked for: one
  writer per file against what we did, in units at once and, as a clearly marked estimate with its arithmetic, in
  hours for the build.
- Model-check runs in parallel: r57-0168 (28 runs and 3 reruns, 4,989 s of run time in 47 min, at most three at once).
- Readers side by side: r57-0115 (five readers, 767 K tokens, four minutes), r57-0125, r57-0126, round 3 (r57-0140).
- Computed for the research run: `research-tree/build/COMPLEXITY.md` section 4 (readers per field 22-37 min against
  48-110; splitting reading over five readers 13.9 M against 33.2 M tokens; seven fields 2.8-6.0 h at three at once
  against 13.7-21.1 h; several writers add nothing there; the pilot's fix round 1.2 h against 3 h).
- Anything else you find (helpers running in the background, r57-0157; more child sessions at once, r57-0032 and
  r57-0414; reviews beside the next build, r57-0417; the decision rule's widths). Say for each whether it was used and
  measured, used but not measured, or only designed.
Mark every figure measured, computed (arithmetic shown) or estimate. Quote nothing you have not opened. If a category
turns out to have no gain or was never used, say so in one line rather than dropping it.

## Step 2: write and build the PDF
New folder `research-tree/build/speedups/`: `SPEEDUPS.md` (the text, the record behind the PDF), `speedups.html`, a
build script, and `speedups.pdf` (headless Edge `--print-to-pdf`; how to drive headless Edge: memory note
`reference-local-page-build-and-preview.md` in
`C:/Users/User/.claude/projects/C--Users-User-Documents-projects-harness-engineering/memory/`). A4 or Letter, light,
body text at least 11 pt, about five to seven pages. Layout:
1. Title (plain: "Parallel work in the harness build: what got faster and how") and a five-line summary: the biggest
   gains with their numbers.
2. One table of every improvement: what, before, after, gain, measured or computed.
3. Several writers on one file first, in full: the problem (one writer per file left only 3 of 14 units buildable at
   once), what we did (own copy per builder, the skeleton change, the landing script, in that order), why it works,
   the result (7 at once; the two conflicts and what happened to them), and a small before-and-after figure drawn in
   the HTML (simple boxes: one writer per file against own copies landing in order).
4. Then one short section per other improvement, each with the same four headings: The problem; What we did; Why it
   works; The result.
5. What did not get faster and why (the W1 to W4 chain; parallel work saves time, not tokens; tokens are saved by
   keeping windows small), in a few lines.
6. The agent map: `research-tree/build/tree/research-run-map.png` on its own page (landscape if it reads better),
   with three lines on how to read it; the draw.io file is `research-tree/build/tree/research-run-map.drawio`.
7. Sources: record ids and files, small type, last.
Plain headings, no slogans or taglines (memory note `feedback-plain-wording.md`); short paragraphs; one idea per line.

## Scope widened by the owner (2026-11-20, later; this section wins where it differs from the above)
His words: "my point wasn't to only add the several writers on one page or file or function or whatever. The point was
to gather all of this other innovation that we've made and compile it up and list the speedups we've achieved, the
results we've had. Not just whatever I tell you, you do that."

So the PDF covers everything the harness work built or changed and what each gained, not only parallel work. Title:
"Harness engineering: what we built and what it gained". Group the items by what they improve (his seven measures:
throughput, efficiency, token count, token cost, time taken, quality, hallucinations); parallel work is one group.
Candidates to check (open each before you use it; add any other you find on the board, in `docs/program/` and in
`research-tree/build/`; the board's newest lines name today's records):
- **Time and throughput:** everything in step 1.
- **Tokens:** the coordinator's long window as the main sink and what was done about it
  (`docs/program/TOKEN-BOTTLENECK-2026-11.md`, t1-0108); hand-over through files, three roots in turn (r57-0171,
  r57-0008, the mistake r57-0604); helpers briefed by pointing at files; models by kind of job (r57-0150,
  `.claude/hooks/tier-routes.json`, the mistake r57-0603); the archived FixFlow skills switched off, about 8,000 tokens
  a session (r57-0155); the testing policy (r57-0417, r57-0173: suite runs and reviews planned against run, the share
  of a builder's time in tests); tokens counted per unit and per meter point (r57-0170,
  `research-tree/build/tools/tokens-self.mjs`); the router design (`research-tree/build/ROUTER.md`: designed, say what
  it computes).
- **Quality and wrong claims:** blind reviews in a fresh context and what they caught (r57-0166, r57-0167,
  `research-tree/build/refute/`; the pilot plan's and the complexity analysis's 14 findings each); the model check of
  the tree (r57-0168, r57-0169: the fault it found and its fix); every landing through the tests (the landing script,
  `landings.jsonl`); the faults audit (`research-tree/build/FAULTS.md`); the library of records and its recall tests
  (r57-0121, r57-0124, r57-0132, r57-0140, r57-0152); figures quoted from the paper, not a summary (r57-0606, r57-0110).
- **Rules enforced by the machine instead of by prose:** tier hook, record guard, commit check, start hook, plan gate
  (r57-0151, r57-0105, r57-0120, r57-0160, r57-0164, r57-0165).
- **Running with less of the owner:** the complexity analysis's chosen plan (r57-0420: machine hours and typed turns
  against the tree as planned; computed, not run); `research-tree/build/UNATTENDED.md`; no design questions (r57-0001).
- **The PC:** the freezes were blocked program starts, not memory, and the three-session limit went (r57-0032; the
  VERDICT.md of the evidence folder named pc-freezes-2026-11-17).
- **Earlier measured work:** `docs/program/HARNESS-BOTTLENECKS-2026-11.md`, `GRAPH-TEST-RESULT-2026-11.md`, the
  embeddings test (`docs/program/evidence/harness-bottlenecks/graph2/embeddings/COORDINATOR-REPORT.md`): a line or two
  each with its result, a null result included.
- **Research behind the designs:** round 3 (r57-0140), the decision rule version 2 (r57-0841: designed, untested).
For each item: before, after, the gain as a number where the record has one, and its mark: measured, computed
(arithmetic shown) or designed only. A thing that cost more than planned or gained nothing is listed with its figure
(the build used 2.3 times its planned tokens, r57-0170); do not leave it out and do not dress it up.

Layout, replacing step 2's items 1 to 5: the summary (the largest gains, numbers first); one table of everything,
grouped; then one short section per item with the four headings (The problem; What we did; Why it works; The result),
at most about eight lines each, several writers on one file keeping its fuller text and its figure; then what did not
improve or is only designed; then the map and the sources as before. Readable before complete: about 8 to 12 pages.

## Rules
Change no existing file. Never touch `docs/program/pipeline-diagram/` or `docs/program/agent-session-map/`. No
install, download, web request, session or helper start, or commit; no command over 150 s. Scratch folder:
`C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/957a3bc0-ad3a-48a1-9f83-846a60b75555/scratchpad/speedups/`.
Open the PDF with the Read tool (pages parameter) and fix what does not read before you return.

## Return
The PDF's path and page count, the list of improvements found (one line each with its gain and mark), anything you
could not settle, and your token count: expected about 6 M, limit 9 M; counter
`node research-tree/build/tools/tokens-self.mjs "speed-ups PDF"`.
