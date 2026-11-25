# The models built so far: facts only (2026-11-25)

For the runs that design the model side. What each model was given and what was measured; no verdicts. All figures
are on tuning data of three repositories (two private, one large public); held-out was not scored. Scores on the
change question are "hits in the top ten over ten", pooled; this score cannot exceed about a quarter on that data.
`CR` in the records is `C:/research-runs`. You may open the named records.

## Untrained methods

- Counting earlier joint changes of two files; best form weights a commit by one over its number of files and decays
  with age: 0.124. The one-over-size weight was found by trial and carries much of counting's strength.
- Plain text search (BM25) for the task-words question.

## Learned models, the change question

- **Knowledge-graph embeddings** (ComplEx, RotatE, TransE). One learned vector per file; joint changes given as
  yes-or-no facts, in one form also imports and folders. None reached counting plus 0.02; "they lose on the order
  among known partners". (record: `research-tree/build/improve/CANDIDATES.md` section 0;
  `research-tree/build/runbig/card/d4/README.md`)
- **A graph network with a pair head** (GraphSAGE with mean aggregation; graph attention). One vector per file from
  its neighbours; the score from the two vectors plus hand-made count features. Edges: joint changes weighted by
  decayed counts, imports, folders; frozen text embeddings of files as node inputs. Twenty-two settings scored 0.1275
  to 0.1314. Without the count features the graph part scored below counting; the count features without the graph
  scored the same as the whole. Weighting its edges by one over commit size changed nothing (-0.0003). Twice the
  training data of the large repository changed nothing. (record: `research-tree/build/improve/units/T3/report.md`
  items 3, 5, 6; `research-tree/build/improve/units/U5/report.md`)
- **Time-ordered graph models at their library's settings** (DyGFormer, TGN). They read the 20 to 32 most recent
  events of a file. Best 0.114. Counting restricted to the same window: 0.098 to 0.106. The memory form scored
  candidates by how often a file changes at all (correlation 0.96 to 0.99 with the candidate's mean score on two
  repositories). The library's "historical negatives", which label earlier real pairs as false, brought the score
  from 0.141 to 0.007. (record: `research-tree/build/improve/units/T3/report.md` items 2, 4, 7, 8)
- **A tree ranker over hand-made features of the pair** (starting file, candidate): raw, one-over-size and decayed
  counts, both directions; ages; name, folder and import relations; text similarity. The best model so far on this
  question. Adding the text of the change itself as a query added 0.010 with the lines that name a file removed; the
  change's text names a right file in 37 % of tasks. (record: `research-tree/build/improve/units/T3/report.md`
  item 1; `research-tree/build/improve/units/T2/report.md`)

## Learned models, the task-words question

- Text retrievers used as they come (two embedding models of 0.6 and 0.14 billion parameters, one of 7 billion):
  against plain text search they swing by repository, +23 points on one and -14 on another.
- A tree ranker over text-search scores, retriever scores and history features leads here too.
  (record: `research-tree/build/improve/units/U3/report.md`)
- Tuning the retrievers on our own history is still running; no result.

## The error question

No data and no model.

## How far history reaches

30, 66 and 21 % of the right files (by repository) have never changed with the starting file before. Of all right
files, 8.5, 45 and 11 points lie within two hops of the imports-and-folders graph.

## Compute

One 12 GB card on the PC so far. For this hypothesis: about four large rented cards for about eight hours; the exact
card and its memory are to be confirmed by the owner. Nothing goes to a rented machine without his yes at that moment.
