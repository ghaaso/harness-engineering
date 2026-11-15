# CHECK-2: second pass on the graph v2 page (index.html 389,006 bytes)

Checker: independent. Read only my own dump (text2/alltext.txt, identical to the builder's
work/text/alltext.txt), the record docs/program/GRAPH-V2-DESIGN-2026-11.md (138 lines), the
sources and a2.png. Nothing outside check/ was changed.

## 0. check.js.txt

`cd docs/program/graph-v2 && node - < check.js.txt` -> PASSED, no problems.

## 1. The 20 earlier defects

Text fixes, confirmed on page and (where the defect touched it) in the record:

- I sentence: 42.1 % / 44 % for search seeds, "overlapping the span the agent read", hit = overlap. Record same.
- "went on to use" replaced by "the span the agent read (the used span where confirmed)".
- R-6 box: PyKEEN 730,295 bytes; measured install 1,373 MB env, PyTorch 814 MB, 3.09 GB image.
- 1,452 recorded transcripts everywhere; B keeps 1,481 / 1,343 / 109 with their meanings. Record 1,452.
- Validation: "per snapshot ... 350 questions; 3.75 ms early cutoff".
- A card 5: "6 of the 7 ... text-embedding entry arm is an open decision in section K"; K says install size not measured.
- F: Adaptive-k correction present.
- Premise block: upper-figure, 49 % / 75 % and 310-hour caveats present.
- I: path-seed, ties and per-episode notes present.
- graphify: F1 qualifier and token-comparison caveat on page and record; section 6 items 6-7 caveats added;
  "each of the four paired differences" fixed; record subgroup line "8,000 tokens only, no verdict" + fragility.
- Calls 1.2 % and 3.1 %, marked corrected. History slice "1 cold first lookup" on each row.
- A card 4 tag "derived here: graph plus partly-graph forms ... summed here"; headline "fully or partly".
- Power block "with 80 % power", "runs per task, task spread and run noise vary".
- Ranker "build last (ruling R-5)". G "not expected to pay (measured for ...; argued for embeddings)".
- A card 3 "judged against the extractor's own facts". H "5 findings concern sources (three cited for
  what they do not say)". J "(median per query)".

Not re-verified this pass: the low visual fixes (C claim picture, E bar labels, I chart). Their text
labels are present (C: "pairwise: 10 edges / one change set node: 5 edges / pairwise: 5 rests_on"), but
I did not view the retaken c..k shots. The power block's tag was not re-checked.

## 2. A2 · The seven measures

Every number traces to data.json/extras.json and its source: 0.4 / 2.2 %, 242.0M / 1147.2M / 23.3 %,
55 % / 68.6 %, 87.6 %, 0.31-0.79 / 3.75 ms, 12 of 60 (Wilson 11.8-31.8), 0 / 6.5 / 32.7 %, 2 of 8,
5,010 of 8,000, 1.8 %, 0.700 / 0.625, 322 / 588, 42.1 / 44 %, 27.1 %, 2,182, 0.564,
F1 0.072 / 0.745 / 0.645, 25 ms vs 5.3 s. The defects are in labels, tags and omissions, not arithmetic.

D1 (medium-high) Row "code relations and ranking", hallucinations: "edges were not checked for
correctness; only rankings were scored" is false for the current typed graph. v1-audit.md (lines 32,
93, 256-260) gives sampled precision: calls 30/30, mentions 27/30 strict, constrains 19/20, cites 29/30,
reads_setting 29/30. Fix: "measured (v1-audit, sampled precision of the first test's typed graph):
calls 30/30, cites 29/30, constrains 19/20, mentions 27/30 strict; v2's edges not built".

D2 (medium) Same row, quality: 0.700 is the first test's typed graph (v1) on change-completion tasks.
In a design-part row it reads as v2's result. Fix the label: "first test's typed graph (v1), change
completion; v2's code layer and ranker not built"; "where" should add that RESULT.md reproduced it. Also
missing from the row: 11.2 % of changed definitions without a node, 0 of 4,886 calls resolved by name.

D3 (medium) Hallucinations, "0 % wrong at fact level": a stale-cached-answer rate on deterministic
questions, judged against the extractor's own facts. It is not a model hallucination rate. Relabel:
"stale cached answers served: 0 % (a cause of wrong agent statements, not a hallucination rate)". The
measured 2 of 8 stale findings (re-shown 6 times after the change, written 0 times) sit only in a folded
qualifier; show them in the cell.

D4 (medium) "Not measured" cells naming no test: row 4 time ("ranking time was not measured; engine
times in storage row"), row 4 hallucinations, row 6 time ("build times are not comparable"), row 6
hallucinations ("no edge was checked"), row 7 token count and hallucinations ("engines returned identical
answers" is a reason, not a test). Hallucination cells in rows 1, 2 and 5 name "the lookup-level replay",
which scores span overlap, not hallucination: implausible. Plausible tests: check agents' file:line
citations against the code at the session commit; precision of document-to-code links on 73-385 labelled
pairs per type (the extractor's cut test); per-step timing in the replay for time cells.

D5 (low-medium) Quality, "12 of 60 ... rest only on tracked, re-checkable premises": this is the
ledger's reach, not output quality, and the qualifier omits the file-cluster bootstrap 6.1-41.4 %, which
premise-measure NOTES calls "the honest, wider one". Fix: tag it as reach, add the interval.

D6 (low-medium) Index arm token count "322 / 588 tokens to first hit": add NOTES' caveat "sizes of
index answers, not tokens saved".

D7 (low) Efficiency cell 87.6 %: a cache hit rate on deterministic questions, no token count. Qualifier:
"hit rate, not tokens saved".

D8 (low) Row 4 token-count cell mixes a v1-audit number with a use-cases figure (1.8 %) under one tag;
split the tags.

D9 (low) Replayable 10.6 % describes the test set's scope, not one of the seven measures; at most a
qualifier on row 5 quality. graphify F1 (with its qualifier) is present in the table; fine.

D10 (low) The record has no A2 section; add a short one, or a line saying A2 is a page-only view of
numbers already in the record.

a2.png: reads as a grid, but not at a glance. 15 measured cells are bold with blue/green tags and
"not measured" chips are muted, yet cells wrap 3-7 lines, qualifiers are folded, and measured vs not
measured differ only by bold text. Fix: tint measured cells or grey the not-measured ones.

## 3. A card 4 wording (R-7)

Page: "An agent pilot of about 40 tasks can see only savings of about 20 to 25 %." Record line 10: "A
40-task agent pilot detects only savings of about 20 to 25 %." Both can read as a forecast that the
saving will be 20-25 %. Exact rewording for both:

"An agent pilot of about 40 tasks would detect a saving only if it were about 20 to 25 % per task or
more (80 % power, round 2's power script; ruling R-7); an effect the size of these exposures would go
unseen, which is why a lookup-level replay comes first."

## Verdict

Earlier fixes landed; check.js.txt passes; all A2 numbers trace. Not ok yet: A2 has one wrong cell
(D1), two mislabelled measures (D2, D3), six untested and three implausibly tested "not measured" cells
(D4), and the card 4 sentence still reads as a forecast.
