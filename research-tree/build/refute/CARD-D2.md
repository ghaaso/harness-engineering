# CARD-D2: blind refute of the D2 Phase A code (TRACK-PLAN 3.7), 2026-11-24

Code: `research-tree/build/runbig/card/d2/`. Data: `CR/d2/<repo>/`. Tests and outputs: `CR/refute-d2/` (run in
`d2-embed-gpu:1` with `--network none`, CPU only). CR = `C:/Users/User/Documents/projects/card-run-2026-11/`.

**Verdict: four breaking findings, all fixable before the dense runs. B1 to B3 touch the gate. The date split itself
holds.**

## Breaking

**B1. FixFlow's held-out set is mostly docs bookkeeping, because prep reads the checked-out branch.**
`prep.py:51` logs `HEAD`, and FixFlow's checkout is on `docs/orchestration-design-2026-10`. Of the 146 FixFlow queries,
140 have only docs files as truth: commits like "docs(program): P12a merged as 15df06d - board, owner page, verdict".
The held-out span is 2026-11-13 to 11-14. The same rules on `main` (`branch_mix.py`) give 87 held-out commits, 15 of
them docs-only, from 2026-07-08 to 11-14. These are not "issue-like text" for finding the files to edit, and not FixFlow
"as the earlier test found it" (that test held out product code commits). Every FixFlow score changes: BM25's 0.884 is a
score on board files, and FixFlow is a third of the macro gate. Failing test:
`test_data.py::test_fixflow_heldout_is_code_localisation` (140 of 146).
Correct: pass a ref to prep (`main`) instead of reading HEAD, and fix a docs-only rule before scoring. The clinic has
19 of 80 docs-only queries, zulip 27 of 242.

**B2. Zulip queries still name the edited file.** `prep.py:20-22` removes the path and the basename but not the stem.
Zulip's subjects open with "file_stem:". In 123 of 242 zulip queries that prefix is an edited file, e.g.
"test_microsoft_teams_importer: Fix check that never ran." for `zerver/tests/test_microsoft_teams_importer.py`.
Counting a stem anywhere as a whole word: zulip 149 of 242, the clinic 34 of 80 (mostly ordinary words like "check"),
FixFlow 1 of 146. I stripped the truth stems (`residue.py`) and re-ran `bm25.mjs` unchanged (`compare_nostem.py`). BM25
Acc@10 changes as follows:
- zulip: 0.818 to 0.777 (-4.1 points), and -6.7 on the 149 queries that name the file;
- the clinic: -1.25;
- FixFlow: 0.

That moves the macro BM25 baseline by -1.8 points, against a 6-point gate. How the embedders respond is not measured.
Failing test: `test_data.py::test_no_edited_file_stem_as_subject_scope` (123).
Correct: remove truth stems as whole words, at least in the subject's scope prefix.

**B3. The 0.45 and 0.68 lines are applied to the wrong metric.** `README.md:31-33` shows them against pooled Acc@10, and
`score.py:60-70` gives no verdict on them. Section 3.7 (with SYN:659, HB:557 and f3a L4, CodeGrep table 2) sets them on
top-2 file precision. On the data so far the two readings disagree for BM25: on Acc@10 (0.799) it "allows seeding", on
P@2 (0.306) it "stops". Failing test: `test_gate.py::test_seed_lines_are_on_top2_precision`.
Correct: a per-arm line verdict on P@2. Also say that P@2 over edited files tops out at 0.5 on a one-file commit (the
best possible P@2 is 0.87, 0.84 and 0.77 for FixFlow, the clinic and zulip), and that CodeGrep's labels were relevant
reads, not edits.

**B4. The RRF arm breaks ties by path name (it changes RRF's score, not the embedders' gate).** `grep_rrf.py:68` sorts the
co-change and PPR lists by (-score, path). With the shared key `common.tiekey` instead (`ties_rrf.py`), FixFlow RRF
Acc@10 falls from 0.904 to 0.884, equal to BM25; 3 queries change. Over 30 random keys (`ties_rrf_salts.py`) the mean
is 0.886 and the range 0.870 to 0.897. The name-ordered 0.904 is above every random draw, so the reported +2.1 over BM25
comes from the tie order. The seed choice (`:98`) also sorts by name, but it matched BM25's own top 3 in all 146 queries.
Failing test: `test_data.py::test_rrf_ties_use_the_shared_random_key`.

## The rest (not breaking)
- **The date split holds** (`leak_git.py`, `twins.py`). On all three repositories:
  - the cut-off's ancestry has 0 commits at or after t0;
  - no query commit is an ancestor of the cut-off;
  - every query has ct >= t0;
  - the co-change pairs come only from commits with ct < t0.
- **One FixFlow leak through a branch copy.** f192fee97d (#204) is a squash re-landing of 3810e4209e (2026-11-01, on the
  plan branch). It has the same patch-id, and all 50 of its added lines are already in the index. So the README's "no
  held-out commit's content is in the index" is false here, for 1 query in 146.
- **No arm sees the truth.** The arms read only the query text; the RRF seeds are BM25's top 3. `score.py` ties: one
  sha256 key per (query, file), the same for every arm, with listed files above unlisted. Correct.
- **Gate.** It is the macro mean of paired per-repository Acc@10 differences, needs all three repositories, and passes
  at 0.06 or more on the point estimate. That matches the README; 3.7 sets no rule on the interval. Note
  (`test_gate.py`): a +0.068 macro difference with interval [-0.005, 0.141] passes.
- **A missing query is not an error.** `score.py:29` scores a query absent from a ranking file as a random ranking,
  silently (failing test `test_missing_query_is_an_error`). Assert before the dense runs.
- **n is short.** n = 468 (146, 80, 242), against the 617 from step 2a. Zulip is capped by hmax 250 although it has
  60,168 candidates, and after B1 FixFlow drops to about 87. In expectation this leaves the point-estimate gate
  unchanged; the interval gets wider.
- **(a) The RRF stand-in** is labelled (README:24). It is not in the gate, so its row must not be read as our ranker's
  (see B4).
- **(b) The cut-off snapshot is not each commit's own parent.** This is not a leak, but:
  - the truth files' text differs from their own parent in 327 of 356 (FixFlow), 178 of 238 (the clinic) and 241 of 561
    (zulip) cases;
  - commits are dropped when no edited file existed at the cut-off: 6 of 152, 46 of 126 (the clinic loses 37 %) and 8 of
    250.
  It is the same for every arm, its direction is unknown, and it was declared first.
- **(c) The grep stand-in** counts occurrences, not matching lines. It is not in the gate.
- **The ceiling is not reported as the section asks.** BM25 scores 0.884, 0.588 and 0.818. The README claims the paths
  were removed and names no ceiling. B1 and B2 show that much of it comes from board files and file names, not from
  issue-like text. Report the headroom per repository and the stripped and code-only figures.
- **Not tested:** `dense.py` on real data (the card was in use, and SweRank does not load). Its code shows no leak.
