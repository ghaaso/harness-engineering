# Embeddings on the code graph: the coordinator's report

Written on 2026-11-16 by the coordinating session, which judged this test and did not build it. It is
the report that rulings 105(c), 108(e), 110(c), 111(c), 112(d) and 113 ask for. It says what the test
found, and what the independent audit found that the lane's RESULT.md lacks or gets wrong. RESULT.md,
result.json, AUDIT.md and CLAIMS.md in this folder are the lane's and are unchanged. Two checkers
compared this report with its sources; their corrections are in it.

## 1. The answer

**No arm adds to the simple ranker on this repository.** Four knowledge-graph embedding models and one
graph-neural encoder were each fused with the simple ranker and compared with it on the 50 later tuning
commits. On top-ten precision every fused arm "matches" it: the largest gain is +0.0023 inside the
candidate pool and +0.0032 over all code files, where the protocol asked for at least +0.02 before it
would say "adds". A real gain of up to about +0.006 in the pool, and about +0.007 over all code files,
cannot be ruled out; that is about a third of the bar. Alone, RotatE and TransE match the simple ranker. ComplEx-N3 and CompGCN match inside the candidate
pool and are lower over all code files. The routed specialists are lower in both.

Why, from the audit: the models learn well, but mostly they recover the co-change facts they were
trained on, which the simple ranker already has. Below those they order the other candidates about as
well as rooted PageRank does. Fused with the simple ranker they add no gain that the protocol's +0.02
bar could register; a small one, of about +0.006 in the pool at most, is not ruled out.

The independent audit (two rounds, 38 agents) found no wrong figure and no wrong verdict word. It found
statements that RESULT.md lacks or gets wrong; section 6 lists them.

## 2. What was compared

- **The task.** Given one code file that a commit changed, rank the other code files. The truth is the
  other code files that commit modified. 65 tuning commits give 388 tasks; the verdicts are on the later
  50 commits (313 tasks). 75 held-out commits (418 tasks) were kept for one run that is described and
  not judged.
- **The simple ranker (RRF).** A reciprocal-rank fusion of two lists: rooted PageRank on the file graph
  (PPR) and co-change confidence (CO), a measure of how regularly two files changed together.
- **The arms.** E1 RotatE, E2 ComplEx-N3, E3 TransE, E4 CompGCN (the graph-neural encoder), E5 routed
  RotatE specialists (one per area, a router that picks two, their percentiles merged by mean). Each was
  scored alone and fused with PPR and CO at a weight of 0.25, 0.5 or 1. A placebo, a random score fused
  the same way, checks the harness.
- **The measure.** P@10 is the share of the top ten that is truth. "Pool" is the candidates within two
  hops of the seed file plus its co-change neighbours; "unrestricted" is every code file. Differences
  are paired by commit, with 10,000 bootstrap resamples and 95 % intervals.
- **The words.** "Adds": the interval lies above zero and the gain is at least +0.02. "Matches": the
  whole interval lies inside -0.02 to +0.02. Otherwise "cannot tell", with "(lower)" when the interval
  lies wholly below zero. So "matches" means "within 0.02", not "no difference".

## 3. The verdicts (the later 50 tuning commits; P@10, difference to the simple ranker)

The simple ranker scores 0.2493 in the pool and 0.2513 unrestricted. In the pool PPR alone scores
0.2149, CO alone 0.2141, a same-folder rule 0.2082 and a random order 0.1190.

| Arm | Fused, pool (the primary contrast) | Alone, pool | Fused, unrestricted | Alone, unrestricted |
|---|---|---|---|---|
| E1 RotatE | +0.0023 [-0.0002, +0.0049] matches | +0.0028 [-0.0042, +0.0096] matches | +0.0032 [-0.0013, +0.0074] matches | -0.0041 [-0.0168, +0.0071] matches |
| E2 ComplEx-N3 | +0.0014 [-0.0017, +0.0046] matches | -0.0042 [-0.0121, +0.0037] matches | -0.0004 [-0.0063, +0.0052] matches | -0.0190 [-0.0331, -0.0066] lower |
| E3 TransE | +0.0008 [-0.0016, +0.0032] matches | +0.0010 [-0.0061, +0.0081] matches | +0.0030 [-0.0010, +0.0070] matches | -0.0010 [-0.0106, +0.0079] matches |
| E4 CompGCN | -0.0005 [-0.0038, +0.0027] matches | -0.0072 [-0.0152, +0.0010] matches | -0.0013 [-0.0074, +0.0045] matches | -0.0278 [-0.0420, -0.0149] lower |
| E5 routed specialists | +0.0017 [-0.0009, +0.0046] matches | -0.0221 [-0.0346, -0.0110] lower | +0.0024 [-0.0012, +0.0058] matches | -0.0441 [-0.0636, -0.0260] lower |
| Placebo | -0.0021 [-0.0043, -0.0002] matches | -0.1269 [-0.1583, -0.0962] lower | -0.0055 [-0.0098, -0.0016] matches | -0.2295 [-0.2781, -0.1835] lower |

"lower" stands for the protocol's word "cannot tell (lower)". The last column is not in RESULT.md
(section 6, point 1); its figures are from the lane's tuning report, recomputed by the audit.

Three things to read with the table:

- **A small gain for E1 cannot be ruled out.** Its primary interval nearly excludes zero (the lower end
  is -0.0002). On the 46 of these commits that the pilot's own late 50 also holds, it lies wholly above
  zero: +0.0031 [+0.0008, +0.0057]. Either way the gain is at most about +0.006.
- **The placebo's fused interval lies wholly below zero and still reads "matches"**, because the word
  only asks that the interval stay inside the band. Fused at weight 1 the placebo loses 0.0108.
- **Answer level** (the grader's measure on the same 50 commits: how much of the reference answer fits
  in 8,000 tokens). The protocol gives no word there. The simple ranker scores 0.6995; the fused arms
  score 0.6947 to 0.7042, and each difference has an interval that includes zero. Those intervals are
  wide: every one reaches beyond 0.02 on one side (E1 fused: -0.0013 [-0.0263, +0.0152]), so by the
  rule above no fused arm would "match" at answer level. Alone: E3 0.6980, E1 0.6731, E5 0.6724, E2
  0.6425 and E4 0.6336; for E2 and E4 the interval lies below zero.

## 4. Why

Points 2 to 5 come from the audit's refuter, who set out to show that "matches" is an artifact. Point 1
comes from the auditors of stage A and of the arms' code, point 6 from the auditor of E5. A second agent
re-tested points 2, 5 and 6 and corrected them; the corrected forms are given here. Point 1's figures
are the lane's stage-A table, with a caveat from two auditors; points 3 and 4 rest on one agent's
computation.

1. **The models learn.** On stage A's held-out co-change pairs E1 to E4 reach a mean reciprocal rank of
   0.68 to 0.75, against 0.28 for PPR. PPR's graph has no co-change edges, so this shows that the models
   learned the co-change structure, not that they beat a ranker that has it.
2. **Mostly they recover what they were trained on.** Alone, E1 to E4 separate a file's known co-change
   partners from the other candidates almost perfectly (AUC 0.996 to 1.000). Inside that block they do
   not follow CO's order (median rank correlation 0.07 to 0.29). Below it their order is moderately
   correlated with PPR's (0.49 to 0.63 in the pool) and about as accurate: P@10 on candidates without
   co-change history is 0.196 to 0.213, against PPR's 0.208. It is not the same order.
3. **They find little that is new.** On those candidates no arm beats PPR by a margin this test can
   see. The refuter's own contrast, with the truth restricted in the same way, gives E1 +0.004
   [-0.005, +0.012] and E3 +0.001; E2, E4 and E5 score below PPR. The data do not show that the
   embeddings carry no information of their own; they show that it is too little to move the top ten.
4. **More weight does not help.** Outside the protocol's grid (weights 2, 4 and 8, and the arm alone)
   no arm's gain over the simple ranker exceeds +0.006 in the pool. The room was there: a perfect order
   would gain +0.119 in the pool.
5. **In the pool the fused list can hardly differ from the simple ranker's.** There are two causes. The
   fusion the protocol fixed (k = 60) keeps a candidate with co-change history above one without: in
   the fused tables the co-change candidates hold the top places in 224 to 226 of the 226 tasks where
   that can be tested. And the selection gave low weights to arms that added nothing. So the fused top
   ten shares 9.1 to 9.3 of its 10 files with the simple ranker's, and the placebo moves the list as
   much as the real models do. "Adds" was still reachable: a perfect score put through the same
   selection takes weight 1 and gains +0.060 [+0.042, +0.079], and a half-informative one +0.036. But
   that is the most the primary contrast can show, so "matches" rules out a third to a half of the
   gain that could be reached, not all of it. The pool "matches" is a weak comparison; the arms alone,
   the unrestricted lists and the weights beyond the grid (points 2 to 4) carry the conclusion.
6. **E5.** The routed specialists' shortfall alone lies entirely in the 192 tasks that were routed to
   two areas. On the 121 tasks routed to one area E5 equals E1 (0.2226 against 0.2219). About 60 % of
   E5's gap to E1 on the two-area tasks comes from the merge the protocol wrote (item 13): a candidate
   that only the second specialist knows enters with that one percentile and takes top-ten places at
   about 5 % precision. The rest is not explained by this test. Candidates that no specialist knows
   explain at most 0.008 (the bound comes from the re-test of the arms auditor's finding).

The sentence the evidence supports: on this repository, at this size, the trained embeddings mostly
recover the co-change facts they were trained on; below those they order candidates about as well as
rooted PageRank, though not in the same order; and fused with the simple ranker they add nothing this
test's bar could register (at most about +0.006 in pool P@10, where the protocol asked for +0.02).

## 5. Held-out (75 commits, 418 tasks; one run of the frozen arm; described, not judged)

Before any held-out unit ran, the rule froze E1 (RotatE), setting c04 (256 dimensions), weight 1,
70 epochs. The five arms' selection figures lie within about 0.0015 of each other with a standard error
of 0.022, so the rule decided, not a real gap between arms.

| | Pool P@10 | Unrestricted P@10 | Answer level |
|---|---|---|---|
| Simple ranker (RRF) | 0.2155 | 0.2153 | 0.7020 |
| E1 fused | 0.2181 (+0.0026 [-0.0019, +0.0071]) | 0.2171 (+0.0017 [-0.0040, +0.0073]) | 0.7125 (+0.0105 [-0.0019, +0.0231]) |
| E1 alone | 0.2060 (-0.0096 [-0.0216, +0.0026]) | 0.2020 (-0.0133 [-0.0261, -0.0006]) | 0.6750 (-0.0269 [-0.0578, +0.0012]) |
| PPR | 0.1855 | 0.1844 | 0.6826 |
| CO | 0.1795 | 0.1461 | 0.4240 |
| Same folder | 0.1767 | 0.1509 | 0.5644 |

It is the same picture as on tuning, with two differences for E1 alone: over all code files it lies
below the simple ranker here, and in the pool its interval reaches past -0.02; on tuning it matched in
both. The arms of the earlier graph test on these 75 commits
(typed graph 0.700, scripted search 0.625, changed-together floor 0.638, same-folder floor 0.549, answer
level) are context only: they were packed in another way (ruling 88(g)).

The rank figures have a second computation. After the grading, the audit derived the held-out truth
from git and recomputed all 96 rank figures; they equal the grader's to 4e-16. The answer-level column
rests on the grader alone.

## 6. What RESULT.md lacks or gets wrong

None of these changes a figure or a verdict word. Points 3 to 6 come from my own rulings (105 and 108 to
113), which the audit checked; the others were found by the audit. Those marked (re-tested) were
confirmed, or confirmed in part, by a second agent.

1. **The words for an arm alone over all code files are missing** (re-tested). Item 26 asks for them.
   They are in section 3: E2, E4 and E5 alone are lower there. "Alone, E1 to E4 match" holds for the
   pool only.
2. **A wrong label** (re-tested). RESULT.md prints "cannot tell (no evidence either way at this size)
   (lower)" for E5 alone and the placebo alone. Their intervals lie wholly below zero, which is
   evidence that they are lower. The stored word, "cannot tell (lower)", is right; the gloss is item
   31's sentence put where it does not fit.
3. **The memory cap** (re-tested). RESULT.md says the held-out run had a cap of 2,560 MB. It ran under
   6 GB (ruling 108), after a probe at 4 GB was killed. That is above item 2's maximum of 4 GB; ruling
   108 amended the maximum for the probe, the rehearsal and the held-out run. A cap limits memory, not
   arithmetic.
4. **The machine sleep** (rulings 112 and 113; re-tested). The PC went to sleep on its idle timer from
   19:38:17Z to 21:38:12Z on 2026-11-15, in the middle of the held-out run, and froze one unit (E1,
   c04, seed 3, checkpoint f57288f1f9a1, four tasks). The run went on by itself and ended with exit 0.
   The audit found one task of that unit (T1-0557, the arm alone, pool) whose top ten differs from both
   sibling seeds in six places while the siblings differ in one; its fused lists are ordinary. That
   unit, its two siblings and one tuning unit were then trained again in fresh processes: all four are
   byte-identical to the real run (the 70 losses, both score tables, the counts). The sleep changed
   nothing.
5. **Tests that were run again** (rulings 109 to 111). Three tests of step 2d failed once. One failed
   because the machine refused the test's own scratch file, and passed unchanged when run again. One
   fits a known defect of the rehearsal script, which can turn a pass into a failure and never the
   reverse; the script was left as it was. One cannot pass after step 1, because its fixture copies the
   real run log; it passed from a copy with one line added to the fixture and one line of the test
   changed to call it, so the evidence for that test is not the frozen test itself.
6. **Values that are not finite numbers** (ruling 105): none, among 3,625,479 stage-B score rows,
   2,268,424 held-out score rows and the 210 held-out loss lists.
7. **The sources of each arm's settings.** Item 15 asks for them in RESULT.md; they are only in the
   code (`train/kge.py`, `train/stageA_configs.json`). E1: Sun et al., ICLR 2019, arXiv 1902.10197,
   table 7. E2: Lacroix et al., ICML 2018, arXiv 1806.07297; Ruffinelli et al., ICLR 2020. E3: Bordes
   et al., NeurIPS 2013, trained as Sun et al. 2019, table 4. E4: Vashishth et al., ICLR 2020, arXiv
   1911.03082, as PyKEEN 1.11.1 ships it. E5: the owner's CureFound form, with E1's recipe for each
   specialist.
8. **The graph sizes** (re-tested). RESULT.md's limit, "about 233 commits of history, about 5,400 nodes
   and 19,000 edges", describes the repository's head. The verdicts were given on smaller graphs: the
   largest tuning graph has 2,450 nodes and 7,585 facts over 116 commits, the median one 1,627 and
   4,374, and stage A's 1,293 nodes. The density is about the same, about 6 facts per node.
9. **E2's regulariser** (re-tested in part; the last step checked by me). The lane divided the N3
   weight by three, as the paper's formula writes it. The authors' own code has no such factor (their
   public `kbc/regularizers.py`, read on 2026-11-16; the reading is recorded in
   `coordinator/kbc-n3-reading-2026-11-16.md`), and the weights they publish are the code's. So the
   strongest setting on the grid, which is the one chosen (0.1 / 3 = 0.033 in the code's units), is
   below both published values: a third of the 0.1 for WN18RR and two thirds of the 0.05 for
   FB15k-237. Nothing stronger was tried. Those values are for other data; the authors use them at
   every rank from 25 to 2,000, which covers the dimensions used here. E2's finalists (weights 0.005,
   0.02 and 0.1) differ by about 0.002 in the
   selection figure, and in stage A the weight 0.1 was the worst at dimension 512, so the data give no
   sign that the grid's edge binds. Whether a stronger N3 would change E2's "matches" cannot be told.
10. **Other departures that no ruling names.** Initial values are the library's. Negatives are not
    filtered against known facts; the auditor recalls that the authors' code filters them, and that was
    not checked. CompGCN's dropout of 0.1 is the paper's value, not the library's default of 0.
11. **The selection always took the smallest model** (re-tested). The rule takes the simplest setting
    within one standard error of the best. The standard error (about 0.022 on all 65 commits, 0.024 to
    0.041 inside the blocks) was wider than every difference between settings (at most 0.015), so all
    nine candidates were always inside, the smallest model was always chosen, and only the weight
    varied. The placebo has no size and took the best of nine, so it gained more from selection than
    the real arms; that errs on the safe side.
12. **The yardstick is not the pilot's** (re-tested). The simple ranker scores 0.249 on the 50 commits
    used here (the latest by date) and 0.233 on the pilot's 50; four commits differ. The check that the
    evaluation code reproduces the pilot passed on the pilot's set. Every word is the same on the 46
    commits the two sets share (E1's fused interval lies above zero there; section 3). The ruling that
    chose the date-order set (ruling 32) is in the part of the protocol added after its first hash;
    the lane's run log puts it before any embedding score, and no timestamp proves that.
13. **"No score was read before the freeze" is a statement, not a technical fact** (re-tested in part).
    Stage-B score tables lay beside the tuning truth from 2026-11-14 15:23Z, about 25 hours before the
    code freeze; nothing technical stopped a metric being computed. Score tables for a few tuning tasks
    (two-epoch trial models) existed before the rulings whose preamble says none did. The audit
    recomputed every candidate: no reading of the selection rule and no choice of setting changes a
    word.
14. **Isolation** (re-tested). The whole export folder, with the held-out graphs in it, was readable
    in containers that ran before the grading. Ruling 89 rests on the code opening a graph only for a
    planned checkpoint, and the audit confirmed that no stage-B unit names a held-out checkpoint. The
    held-out seal is a rule of procedure: the truth can be derived from the repository's history, as
    the audit did after the grading.
15. **Repeatability** (re-tested). Byte-identical re-runs were shown for 15 tuning units before the
    freeze (one of them the frozen setting) and, by ruling 113, for three held-out units. The other 207
    held-out units rest on the same code. E5 is not bit-reproducible on the card; its score tables are.
16. **Stage B.** Two units failed once on a file rename and were done again; ruling 103's "none failed"
    and the unit counts in ruling 98's preamble are slightly off. Units ran under a cap of 2,560 MB
    and later 4 GB; the re-run evidence across the two caps covers 13 of the 15 settings.
17. **Stage A.** CO's figure of 0.002 on the held-out pairs is a floor by construction: those pairs
    were taken out of it. "Training stops at the validation peak" is not true for E2's first choice
    (its peak was at 10 epochs; it trains for 20). E4's three settings rest on single noisy evaluations
    of 32 queries, and its initialisation fix was kept after its numbers had been seen (ruling 47 says
    so).
18. **Small things.** One held-out seed file (`ops-server.mjs`) lies outside the code-file rule (418
    tasks against 417); it moves no P@10. E1's "matches" alone over all code files depends on which
    seeds are averaged, and E4's alone in the pool sits 0.005 from the boundary. A graph's history list
    leaves out the parent's own commit at 36 of the 70 held-out parents and 9 of the 53 tuning parents,
    so the co-change counts and the training graph lack that one change; it is the same for every arm
    and for the comparators. In CLAIMS.md, 33 pointers name keys that do not exist (count keys read as
    0, and the simple ranker's two "reference" rows).

## 7. What the test does not say

- It is one repository with small graphs (point 8 above), 50 commits, and truth at file level: what a
  commit edited, not what it needed to read. No agent was run and no tokens were counted.
- Not tested: temporal or inductive models, text or code embeddings, rule learners, larger dimensions,
  a longer history.
- **The routed-specialist idea.** This test used folders as areas, RotatE specialists and the merge as
  the protocol wrote it, on a graph that one model can hold whole. Most of E5's shortfall comes from
  the merge as written. Routing a seed to its own area cost nothing: the single-area tasks equal E1.
  The choice of the second area (the documentation-heavy "other" area on 153 of the 313 tasks) and the
  quality of specialists trained on parts of the graph were not separated. The test says nothing about
  routing on a graph too large for one model.
- **The harness question** (do a graph layer and learned relations cut what an agent has to read?). At
  this size a learned ranker gives no better list of related files than rooted PageRank plus co-change
  confidence, which need no training. The earlier measured gain of the typed store over scripted search
  is a different question and is not touched by this.

## 8. How it was checked

All times are UTC on 2026-11-15.

- The code, the protocol, every input and both images were frozen by hash at 16:48:03Z (10,940 lines:
  10,935 files, the two image ids and three headers). The audit hashed all 10,935 files again and found
  them equal;
  the image ids it could check only through the containers' records. The protocol has since gained
  rulings 112 and 113 at its end; its first 97,907 bytes are the frozen file.
- The selection and the tuning report ran after the freeze (16:48Z to 16:56Z). The grader's own
  scoring of the lane's ranked lists equals the report on all 416 figures. That is a consistency check,
  since the grader scores with the lane's scoring module; the independent check of the figures is the
  audit's own recomputation.
- Before the one anchor line was written (17:33:53Z), the selection was recomputed twice from the score
  tables with other code: all 45 candidates agree within 1.1e-16, and so do every choice and the chosen
  arm.
- One held-out run (17:36Z to 22:19Z; 2 h 43 min of work and the 2 h sleep), graded once (22:30Z).
- The lane's leak audit passed. The audit's own leak check ran git on all 123 checkpoints: every one of
  the 14,123 commits in their history lists is an ancestor of its checkpoint.
- The audit (22:59Z to 23:36Z): 16 auditors and refuters, 21 re-tests of their findings and one critic
  of coverage; 177 checks. It recomputed the selection, the stitched score tables (6.03 million rows),
  every metric, interval and word, the comparator tables from the graphs, the task set from git, stage
  A's hold-out and top three, and the held-out ranked lists. It read the arms' code against the PyKEEN
  1.11.1 library and the protocol's descriptions of the methods (the papers and the authors' code were
  not at hand offline) and found no mis-built loss, encoder or score. RESULT.md's 385 cells equal their
  sources.

## 9. My own part

- I made rulings 103 to 113 on 2026-11-15. Rulings 108 to 113 each followed something that went wrong:
  a probe killed at 4 GB, three tests that failed once, the sleep, the audit's question about the
  slept unit. None of them touches selection, scoring or the statistics. Each of 108 to 111 widened or
  bent a written rule after a failure; the plainest are 108, which raised the cap above item 2's 4 GB,
  and 111, which accepted a changed copy of a test as evidence.
- I read the five arms' selection figures when I checked the record, before I wrote the anchor. The
  arm was fixed by the frozen rule, and the audit confirmed it would have been E1 under the other
  readings of the rule too. Before the grading I also read the held-out scores of the slept unit and
  its two siblings, to compute ruling 112's rank correlations (scores only, no truth).
- The sleep happened because no session was holding the PC awake while the run trained in the
  background. My estimate of the run (1.1 to 1.5 hours, given in the session and not on disk) was too
  low: the work took 2 h 43 min.
- Held-out truth was derived from git by one audit agent after the grading, to give the held-out
  figures a second computation. Nothing under `build/sealed` was opened by me or by any auditor. After
  the result was final, a file search by the lane entered the grader's folder there and printed the
  sha256 sums of test hand-off files; the lane reported it itself, and no file content was read.

## 10. Files

In this folder: `RESULT.md` 5ca6673f, `result.json` bc9c98e5, `AUDIT.md` a323e01a, `CLAIMS.md` ef59e716
(the lane's). The protocol: `../protocol-addendum-8.md`, frozen a92eef5e, now b7c1e682 with rulings 112
and 113.

`lane/` holds a copy, made on 2026-11-16, of the lane's records, code, score tables and held-out outputs
(1,633 files, 114 MB, each checked by hash; `lane/MANIFEST.sha256`). Paths below are inside it:
`progress.jsonl` (235 lines; my lines 223 to 235 record the freeze, the tuning check, the anchor, the
grading, the rulings, the sleep check and the audit); `orchestrator/coordinator-rulings-103.md` to
`-113.md`; `orchestrator/item27-verification.json` d28bb626 (the recomputation before the anchor);
`orchestrator/step10-audit-round1.json` 76bb50c1 and `-round2.json` 17192dbe (every auditor's report);
`orchestrator/sleep-check-comparison.json` 674c0223; `r58c/sleep-check/` (the four re-runs);
`grader-returns/tune-rank.json` 61deb1d2, `tune-item24.json` 7d5dc799, `heldout.json` 8182ed8b.

`coordinator/` holds my own check scripts, grading outputs and the lines I appended. The rest of the
lane's working folder (about 3.5 GB: graphs, staged inputs, test outputs, stage-B parts) is still in
the session's temporary folder and is not copied.
