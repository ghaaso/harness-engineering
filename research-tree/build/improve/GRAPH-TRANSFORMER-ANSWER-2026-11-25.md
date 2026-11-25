# Graph transformers for the co-change and file-finding work: the answer (2026-11-25)

The owner's request: r58-0006; his words in full in `briefs/GRAPH-TRANSFORMER-QUESTION.md`. This file is the record
behind the page `improve/review-page/graph-transformers.html`. It rests on three outputs of 2026-11-25:
`improve/lit/GT-LIT-1.md` and `GT-LIT-2.md` (published findings, read at abstract or page level through the fetch
tool's summaries: no full paper was read, so every figure from them is "as the fetched text gave it") and
`improve/FAILURE-MODES-2026-11-25.md` (18 known failure modes against our code, logs and tuning data). Nothing was run
on the card, downloaded or sent anywhere. Held-out data was not opened.

## 0. The answer

1. **The goal** (TRACK-PLAN steps 7, 8, 11; r57-0076): an agent that spends less and is right more often. Two helpers
   are trained: D2, from a task's words to the files to open (baseline BM25, bar +6 points Acc@10); D4, from one
   changed file to the files that change with it (baseline pair counting, bar +0.02 P@10). D2 is beaten on tuning
   (0.919 against 0.713; five-fold 0.916). D4 is not (B2 +0.013 in-sample; U5 level; U6 below; T2's edit content
   +0.029 on a changed task). The benefit inside an agent was never measured (APPROACHES R12): reads and searches bring
   in about 26 % of tokens; "what changed together" is 1.8 % of lookup cost, "where is X defined" and "who uses X"
   19.8 %. Step 11 of the plan is where it would be measured.
2. **Known failure modes did hold our graph models back, and none of them is over-squashing** (FAILURE-MODES rows 1-18).
   Present: node-wise vectors cannot hold pair facts (row 6; graph alone 0.107 under counting 0.124); the temporal
   models' window of the last 19 or 31 neighbour events holds 47 / 23 / 33 % or 55 / 26 / 39 % of tuning truth against
   70 / 34 / 79 % in full history (row 3); no 1/|e| weight in U5's message passing while 35 / 55 / 48 % of pair events
   come from commits of 20 or more files (row 5); pair-stream TGN trains with same-commit pairs in memory that it never
   has when scored (row 9); FixFlow and the clinic have 303 and 214 training tasks (row 8); every tuning number is
   optimistic by selection on the same 260 commits (row 17). Absent as causes: over-squashing and too few layers
   (two layers equal one; the needed fact is one hop away), look-ahead in any feature or graph (row 15). Open: whether
   T2's gain is the seed's diff naming its partner files (row 16).
3. **A relational graph transformer is worth one fair test, in a pair-aware form, on richer tables and more data. It is
   not a swap on today's inputs.** Published: RelGT was tested on 21 entity classification and regression tasks only
   (better by more than 1 % on 10, within 1 % on 9, worse on 2), never on recommendation or link prediction; the
   pretrained relational models (RT, KumoRFM-2, Griffin) likewise (GT-LIT-1 Q1). On RelBench's recommendation tasks the
   pair-aware ContextGNN scores 9.23 average MAP against 2.08 for the best two-tower model, and the Past Visit rule
   (3.55) beats LightGBM (1.79) and GraphSAGE (1.85) (Q2): the pattern we measured. With equal tuning, classic
   message-passing networks match or beat graph transformers on 17 of 18 node-classification sets, and the long-range
   benchmark's gap "completely vanishes after basic hyperparameter optimization" (Q4). For "where else to edit", the
   published models that work take the edit's content and train across hundreds of projects (CoEdPilot: over 180K
   commits, 471 projects); none reports a learned model on co-change history alone beating rules or counting
   (GT-LIT-2 Q4; one query per topic). So a pair-aware relational graph transformer on this task is unpublished as far
   as these searches show: a test would be new, and it is a bet, not a likely win.

## 1. The form that would fit (derived, not built)

| choice | what fits us | why (source) |
|---|---|---|
| tokens | a time-valid sample of a few hundred neighbours around the pair (seed, candidate), not the whole graph | RelGT samples K = 300 temporally valid neighbours within 2 hops (Q1); it also repairs our short-window fault (row 3) |
| pair-awareness | hop distance to both ends, or shared-neighbour pooling, or the counts beside the model | labeling trick, NCN, LPFormer, ContextGNN (Q2, Q3); row 6 |
| type, hop, time | one token element each; time as the gap to the seed change | RelGT's five elements (Q1); brings TGN's time information without the memory module's train and score mismatch (row 9) |
| position | no whole-graph Laplacian; a local encoding on the sample | RelGT's subgraph encoding (Q1); a whole-graph spectral encoding must be rebuilt per time cut or it sees later edges [inference; no paper found, Q6] |
| direction | where a spectral or walk encoding is used on imports and calls: magnetic Laplacian or directional random walks | Geisler 2023, shown on source-code graphs, +14.7 % relative on OGB Code2 (Q6) |
| commit size | weight an event by 1/|e| | row 5; R3 (counting's strength lies in decay and the 1/|e| weight) |
| cost | dense attention over the sample; O(n^2) over the graph never arises | Q5: at a few hundred tokens a sub-quadratic form buys little [inference from the sizes] |
| edges | parsed from code, never model-written; text enters as features | R11; f2b C48 (model-written graphs cost 19.75-45.64 times and skip files) |
| comparator | the learned ranker and a tuned pair-aware message-passing network on the same inputs and budget | Q4 (Luo 2024, Tonshoff 2023); HeaRT: score against hard candidates (ours ranks every alive file, which already does) |

## 2. Data

- Zulip is not short of data for the forms tried (342,722 pair events; row 8); a learning curve on 25 / 50 / 100
  training blocks would show it. FixFlow and the clinic are: runs swing from 0.00 to 0.195.
- "Transformers are data hungry": no study of graph transformers against training-set size was found (Q4); RelGT's
  training sets run from 1.3K records up (Q1); RelBench's link tables from about 3.9K rows (Q2).
- What would extend ours: histories of many public repositories. CommitChronicle (10.7M commits, 20 languages,
  per-row licence) and CommitPack (57.7M commits, about 3.8 TB, permissive licences per row) carry file lists and
  diffs (GT-LIT-2 Q5; field details and some licences not confirmed). Nothing is downloaded without his word, with
  source, size and licence named first.
- Quality: commits of 20 or more files carry a third to a half of the pair events (row 5); D4 never tests new files
  (row 12).

## 3. Are the good numbers real

- No look-ahead found (row 15); held-out is unopened; our scoring ranks every alive file, so the sampled-negatives
  class of inflation does not apply (GT-LIT-2 Q6).
- Selection (row 17): about 240 U5 and 461 U6 scorings on 260 commits; the epoch pick alone adds about +0.003. It does
  not turn a loss into a win; it does inflate B2's +0.013 and T2's +0.015. Published size of the same effect on
  link-prediction data: about 3.6 % on average, over 15 % for some algorithms (Jiao 2025).
- T2 (row 16): open until the diff lines that name a candidate are dropped and the gain is read again.

## 4. The eight small measurements (not run; each needs his word)

CPU: (1) T2's gain with naming lines dropped, 20-30 min; (2) counting restricted to the last 19 or 31 neighbour
events, seconds; (3) split-half selection on the per-commit scores, seconds; (4) `diag_tgn.py` on one saved state per
repository, about 6 min; (5) one U5 run with hl90/|e| edge weights, about 10 min; (6) U5's learning curve on zulip at
25 / 50 / 100 blocks, about 30 min. Card: (7) pair TGN with the memory held at each commit's start, about 10 min;
(8) U6 with `historical` negatives, one setting, about 10 min. Each changes what is done next: (1) and (3) say how
much of the gains is real; (2), (7) and (8) say whether U6's result is its settings; (4) and (5) the same for the
memory model and U5; (6) says whether more zulip data would help.

## 5. Order of work that follows

1. The eight measurements. 2. Where they confirm it: a long-window temporal arm and a commit-weighted graph arm as new
entries of the round (new arms with their own tuning and held-out files, r57-0080 untouched). 3. Design B's tables
(the edit's content, parsed symbols, calls and routes): every option needs them, the relational transformer most of
all, since they are its relational database. 4. On those tables, like with like: the learned ranker, a tuned
pair-aware message-passing network, a pair-aware relational graph transformer; the transformer trained across public
repositories on rented GPUs. Tokens: 80 % of the week used at 13:42 UTC, stop line 85 % (r57-0091), reset 2026-11-30
12:00 UTC; steps 1 and 2 fit before the reset, steps 3 and 4 after it.

## 6. Not covered

No graph transformer, labeling-trick model or positional encoding was built or run. The literature rows are abstract
or page level through a summarising tool; RelBench v2's recommendation results, the code licences of RelGT and RT, the
surprise-index figures and any study of memory staleness were not read. One search per topic for the co-change prior
art: "unpublished" means not found in that search.
