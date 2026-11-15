# Independent check of the graph v2 owner page (2026-11-14)

Brief: `pCheck` in `../../graph-v2-page-m.workflow.js.txt` (lines 80-89) with RULES, RULINGS and the path constants, plus three
later additions: (a) the graphify block in G, (b) the measured blocks from `graph-v2/lookup-testset/` (B, I) and
`graph-v2/premise-measure/` (E), (c) the embeddings slot in G. Nothing outside this folder was changed. No network was used.

Page checked: `docs/program/graph-v2/index.html` (367,264 bytes, built 02:06) and its text dump
`page-v2/work/text/alltext.txt` (made at 02:06 from the rendered page, all `<details>` open). Record checked:
`docs/program/GRAPH-V2-DESIGN-2026-11.md` (136 lines).

Files in this folder:
- `trace-numbers.js.txt` -> `unmatched-numbers.txt`: every number of the page text and the record looked up in the SOURCES
  (not in the page's data.json), lenient rounding/scaling match.
- `recompute-d.js.txt` -> `recompute-d.out.txt`: own re-implementation of two section D lookups from the frozen-commit facts.
- `job-sim.json` -> `sim-out/*.txt`: the page's own simulation read out of a headless browser at four control settings.
- `recompute-sim.js.txt` -> `recompute-sim.out.txt`: own arithmetic for the same four settings.

## Verdict

**Not ok.** Checks 2, 4 (mostly), 6 and 7 hold. Check 1 has a few numbers that differ from their source in value or unit,
check 3 has one omitted verifier correction, and check 5 fails: one sentence on the page and in the record overstates the
lookup test set (read span presented as needed span), and the record repeats two graphify sentences that AUDIT-CLAIMS
section 5 forbids. All are text fixes; no computation on the page is wrong.

## Check 1: every number traces to a source

Method: 2,269 number tokens (page text plus record) against 7,508 values parsed from 29 source files. Only 12 tokens were
unmatched, all explained: `1147.2M`, `1039.7M`, `4017.7M`, `1892.8M` are the unrounded totals of the use-cases lane's raw
`qf.json` (use-cases.md gives 1,147M, 1,040M, 4,018M, 1,893M): consistent. `131070` and `281677` are section D file-token
sums, confirmed by check 2. The lenient match cannot see a number in the wrong context, so the key blocks were also checked
by hand against their source lines: A cards, B table and session-start table (use-cases.md lines 111-176), E replay table
(k0 NOTES 186-233), J (v1-audit 38-45, 61-84, 232-233), the power bars (widen/protocol-v2-power.txt n=40 rows), every number
of the lookup-testset block (result.json `baselines.by`, `to_beat`, `could_not_measure` = 10 items), every number of the
premise block (result.json `in_repo_premise_share`, `deterministic_finding_share`, `reads_by_location`), and the graphify
block (RESULT.md headline 1-6). They match, except:

1. **G, R-6 box: "PyTorch for CPU (about 730 MB, per the lane notes)".** The lane notes say PyKEEN is a **730 kB** wheel and
   PyTorch's size was not checked (lane-ranking.md 518, verify-b 102). `embeddings/INSTALL.md` line 13 measured it: venv
   1,373 MB, of which torch 814 MB; image 3.09 GB.
2. **"1,452 recorded sessions" (header, A, B, K, record) and "1,481 recorded sessions they come from" (B measured block).**
   use-cases.md counts 1,452 *transcripts* (109 product transcripts from 13 main sessions); lookup-testset NOTES lines 14-16
   and 36 define a session as a main transcript plus its subagents and give "4,829 instances from 1,481 transcripts". B's
   "product column (109 sessions)" contradicts the page's own "13 main product sessions".
3. **E loop step 3: "validation took 0.31 to 0.79 ms per lookup".** k0 NOTES 358-359: per *snapshot*, over all 5 lanes and
   350 questions (median); early cutoff 3.75 ms. F and H say "per snapshot" correctly.
4. **E premise block: "transcripts ... 1.3 % of calls", "other outside ... 3.2 % of calls".** The recomputation in
   premise-measure NOTES line 186 corrects these to 1.2 % and 3.1 % (raw 0.0125 and 0.0315).
5. **E real-history slice: "all 189 lookups"**, but every row sums to 188 (79+108+1, 183+0+5, ...). cacheslice.json
   `totals` holds C=1 per rule (the cold first lookup), which the page does not show.
6. **J (c) "walk at the chosen depth reached 3,633 of 5,464 nodes"** is a median per query (v1-audit line 45).
7. **A card 4, 13.6 % tagged "measured: use-cases.md".** Not in use-cases.md: it is DESIGN.md section 0's 8.8 % (graph forms)
   plus 4.8 % (orientation cards), summed by the page. The page's "graph forms only 8.7 %" differs from DESIGN's 8.8 % because
   the page marks item-ID (0.8M) as partly and sections (0.7M) as index. Values are right; the tag and headline wording are not.

## Check 2: two step-through examples recomputed

Own code (`recompute-d.js.txt`), importing only the shared tokenizer. The seeded draws reproduce: 65 candidates ->
`enqueuePendingMedia`; 58 -> `throttle.py`; 110 -> `ClockScreen.tsx`. For the "who uses" and the "changes together"
examples, all pool counts (79 / 9 / 70 / 0 / 5 and 58 / 6 / 38 / 14 / 23), the file-token sums (131,070 and 281,677), the
tree-token sums (2,694 and 1,743), the entry tokens (44 and 24) and every one of the 60 and 58 shown items in order (id, hop,
PageRank rank, changed-together rank, fused rank, file tokens, tree and triple tokens) are equal. Collapsed graph 1,084
nodes. The default selection (budget 400: 12 items, 385 tree / 730 triple tokens) is the rank prefix that fits. **Holds.**

## Check 3: theory attributions (from the verifiers' source readings; no source was re-opened, no network)

- In-lists and out-lists: page F and H cite Doyle 1979 (not opened, via de Kleer 1986) and the ledger rests on Build Systems
  a la Carte's verifying traces: matches REFUTE and verify-b T-a. Correct.
- Knowledge-graph definition: H gives Hogan's inclusive definition and "v1 already was one". Correct.
- Stop rule: F names Charnov's marginal value theorem and Pirolli-Card (records only) and states the disputed F (695 vs about
  13,000). Correct as far as it goes, but **F lists arXiv 2506.08479 (Adaptive-k) as a source without verify-b S-i's
  correction**: the one published gap-based stop scored 73.33 against 76.33-78.00 for fixed budgets on GPT-4o factoid QA.
- Spot checks that hold: HistoryFinder 0.70/0.75 self-evaluated (verify-a M4), LocAgent 7B direction only (S-a), tree
  format one sample of 37 (S-b), NBI random-split movie data (R-n), Legunsen revision shares (R-p), Dagenais abstract only
  (M10), GRAIL small sets (S2), FB15k-237 "37 is not in Pujara" (R-g), CodexGraph 7-15x (M5).

## Check 4: rulings

R-1 labels on all 43 parts; R-2 cuts listed as cut (Steiner, kind filter, redundancy, tier 3, calibration; Arm L cut inside
the ranker row); R-3 three deferred, confidence folded in, validity sets as infrastructure; R-4 (a)-(i) present as parts;
R-5 build-first set right; R-6 in full in G with the "small part of the token cost" line; R-7 in I and K; R-8 plainly in J.
Two gaps: (i) H's missing-part "text-embedding entry arm" is ruled "K (owner decision: not yet listed with a size)" but K and
F do not list it, while A card 5 says all 7 missing things "are now part of the design"; (ii) the ranker's status "build after
the premise measure" ties it to the wrong condition: R-5 puts ranking last, after the ledger, because its question is 1.8 %.

## Check 5: must-not-claim (refuter list of 13, AUDIT-CLAIMS section 5) and simulation-as-result

Page and record clean on the refuter list: no saving forecast, temporal knowledge graph sense stated, "graph databases" only
with "at this size, for this workload", "zero wrong" carried with its replay and extractor-facts limits in E (A card 3 lacks
the "judged against the extractor's facts" clause). Simulation outputs are tagged "simulation, not a forecast". Failures:

1. **High. I "What it shows" and record line 43: "keyword search ... found the needed span in its top 10 for 55.3 % of
   scorable product lookups and 55.3 % of program ones."** lookup-testset NOTES lines 57-59: this test set can score "was the
   read span returned", not "was the needed span returned"; a hit is an overlap with the primary truth (confirmed files if
   any, else all read files) (lines 63, 102). The 55.3 % rows also include path seeds, where the agent already had the file;
   on search seeds the figures are 42.1 % and 44.0 %.
2. **Medium. "the spans it went on to use"** (B test-set card, F row "Test set of real lookups") and the I legend **"the span
   the agent went on to use"** (median_truth_span_tok): truth is mostly read spans; 27.1 % are confirmed.
3. **High. Record line 110**: graphify "scored macro F1 0.072" with no "raw question text, no agent, no vocabulary step,
   printout scored as an item list" (a sentence AUDIT-CLAIMS section 5 forbids without it), plus the token comparison that
   AUDIT-CLAIMS section 6 item 4 marks as incomplete.
4. **High. Record line 107**: "Where the seed file lives decides most of this" (AUDIT-CLAIMS section 6 item 1: causal wording)
   and the mobile-app "+0.131 ... above scripted search" with no "subgroup, no verdict" and no fragility, which implies the
   forbidden "graphify beats scripted search on the mobile app". The page itself words this correctly.
5. Medium. Page G graphify: the "2,547 tokens against median 31 and 29.5" comparison carries no section 6 item 4 caveat
   (scripted search's read tokens and the typed store's uncounted costs are left out), which leans toward the forbidden
   "graphify wastes tokens". The F1 qualifier is present but garbled ("given as raw question text: raw question text, ...").
6. Low. G "What it shows": "speed, compression and learned rankers have nothing to win": stronger than the sources (engines
   measured; learned rankers measured only on changed-together truth; embeddings argued under R-6).

Measured-block caveats (brief b): both blocks show their full "could not measure" lists (10 and 9, folded) and the NOTES
caveat "sizes of index answers ... not a forecast of tokens saved". Missing from the page: lookup-testset NOTES section 4
reading notes (path seeds inflate A and C, their "tokens to first hit" is a whole-file read; ties straddle the cut of 10 in
34.6-41.7 % of keyword queries) and the per-episode vs per-call share difference (I: orientation 31.8 %, B: 20.7 %); premise
NOTES lines 77-82 (the 72 % same-session share is an upper figure, 49 % of calls counting recorded writes alone; one 310-hour
session holds 39 % of calls). Embeddings slot (brief c): labelled "Being measured in another session", RESULT.md absent,
R-6 in full. Holds, but K card 3 still offers the embeddings install as an open decision with no size although
`embeddings/INSTALL.md` records the image built and runs made.

## Check 6: simulation arithmetic

Own arithmetic (`recompute-sim.out.txt`) against the page read headless (`sim-out/`): exposed = carried share of the answered
forms x carried/context; moves = exposed x use x (1 - answer/reads); pointer = tokens x 14,647 calls / 2.13 B context
(TOKEN-BOTTLENECK: 1,000 tokens = 0.7 %). Four settings, all equal to 0.1 %: default product+partly 50 %/0.20/2/500 ->
13.6, 5.4, 0.3, net 5.1 %, step view 3.7 %; program graph 100 %/0.05/6/0 -> 20.6, 19.6, 0.0, 19.6, 16.9 %; product +index
30 %/0.50/1/2000 -> 17.7, 2.7, 1.4, 1.3, 0.0 %; product graph 100 %/0.05/4/0 -> 8.7, 8.3, 0.0, 8.3, 7.0 %. The I sentence
"only settings near the extremes reach that range" holds (product reaches 14.2 % only with index forms near maximum use).
Power bars equal the n=40 rows of protocol-v2-power.txt; their tag says "measured" for a power simulation and the text omits
"with 80 % power" and calls the conditions "spread and paired correlation" (they are runs per task, task spread, run noise).

## Check 7: size, network, own check

367,264 bytes (< 500,000). No `script src`, `link href`, `img`, `@import`, `url(`, `iframe`, `fetch(`, XHR, WebSocket,
beacon, `form`, `srcset` (independent grep: 0 hits); outside addresses only as `<a href>`. `node - < check.js.txt`: PASSED,
no problems (its literal sentence match does not catch the paraphrases above). **Holds.**

## Check 8: 1870 px light screenshots

Read: 00-first, b, c, d, e, g, i, j, k (a is covered by 00-first; f and h are long text tables, read through the text dump).
- A card 2: the product bar's "18 %" label on the hatched index segment is low contrast; the program bar's thin slices
  (code map, code relations) carry no label; the six-colour legend has to be decoded.
- C: the "claim with its dependency set" picture draws the pairwise alternative as a clique among premises, while its own
  text says a pairwise rests_on loses nothing as long as all members are present: the picture argues the opposite of the caption.
- E: in "where the reads of earlier conclusions come from" the small segments (4.1 %, 0.4 %, 2.5 %) are unlabelled and the
  scratch-folder segment reuses the dotted green pattern that means "index question" elsewhere.
- I: the per-form "to beat" chart (40 rows, four marker kinds on a log axis) cannot be read at a glance at 1870 px; the
  section is about 5,700 px tall.
- D's final shot shows only step 1; ranking and selection are reachable only by clicking (not a defect, but no shot shows them).
- J (a): the first bar label "Python name: lexical binding" can be misread as name matching, the very claim J corrects.
- Content dropped: AUDIT-CLAIMS section 6 items 6-7 (packer front-loads large files; graphify was below every comparator on
  tuning) and the measured embeddings install sizes.
