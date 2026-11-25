# The data we have now: facts only (2026-11-25)

For the runs that design the data side. Facts and where each is recorded; no verdicts. `CR` in the records is the
folder `C:/research-runs`. You may open the named records to check a fact or to find more.

## What was collected

- **Three repositories**, taken because they were at hand: two private ones of the owner (a product called FixFlow;
  a clinic system whose repository has no remote) and one large public one (zulip). All three are used for training
  and for testing, split by time inside each. Zulip makes up 82 % of the pooled result.
  (record: `research-tree/build/runbig/card/d4/README.md`; `research-tree/build/improve/CANDIDATES.md` line 26)
- **What the extraction keeps** per commit: committer time, the message cut to 600 characters, the list of files
  added, modified or deleted, under a file identity that survives renames. **Not kept:** what changed inside a file,
  the file's content or its symbols at that time, the author, the pull request or issue a commit belongs to, any
  error text. One later test extracted diffs separately. (record: `research-tree/build/runbig/card/d4/extract.mjs`)
- **Rules applied while collecting:** no merge commits; only files with seven endings (.py .js .jsx .ts .tsx .mjs
  .cjs), vendored code left out; a commit counts only if it modifies 2 to 50 such files.
- **Other links in the data:** imports and folders. No symbols, references or test relations.
- **The error question:** nothing collected.

## How examples, splits and scores were made

- One example: a starting file (one modified file of an eligible commit, alive at the cut-off); the right files are
  the other modified files of that commit; the candidates are all code files alive at the cut-off. Every modified
  file of every eligible commit is a starting file, so a commit of n files gives n examples.
- Splits follow time. Eligible commits are cut into blocks of 10 (zulip 20); a block sees only commits strictly
  before its first commit. FixFlow and the clinic: first 40 % of eligible commits history only, next 25 % tuning,
  last 35 % held out. Zulip: the last 500 held out, the 200 before for tuning. Held-out is scored once.
- Scores: hits in the top ten over ten, and hits in the top ten over the number of right files; per commit, pooled
  and per repository; naive baselines (counting, text search) beside every learned model.
- For the task-words question, text retrievers were scored on task texts. Which texts served as task texts in each
  repository (issue texts or commit messages) has not been checked.

## What the models were given

- Pairs of files that changed together; for the embedding models yes-or-no facts ("pairs" or "triples": co-changed,
  imports, in folder, folder parent).
- A tree ranker: features per (starting file, candidate): raw, one-over-size and time-decayed counts, ages, name and
  folder relations, an import edge, text similarity.
- A graph network: co-change edges weighted by decayed counts, imports, folders; frozen text embeddings of files.
- Time-ordered graph models on the stream of co-change events, reading a window of the 20 to 32 most recent events.

## What was measured

- 30, 66 and 21 % of the right files (FixFlow, clinic, zulip) have never changed with the starting file before. Of
  all right files, 8.5, 45 and 11 points lie within two hops of the imports-and-folders graph.
  (record: `research-tree/build/improve/CANDIDATES.md` line 24; `research-tree/build/improve/units/T1/report.md`)
- Weighting a commit by one over its number of files is where much of plain counting's strength lies. It was found
  by trial.
- A content input (a text embedding per file) was empty for 88 to 99 % of the training cells of two repositories.
  (record: `research-tree/build/improve/APPROACHES-2026-11-25.md`)
- The score "hits in the top ten over ten" cannot exceed the number of right files over ten: about a quarter on the
  tuning data. (record: `research-tree/build/improve/units/T1/report.md`)
- Twenty-two settings of the graph network all scored within 0.1275 to 0.1314 (pooled, tuning), the best untrained
  method 0.124. The time-ordered models with their recency window fell below counting. The tree ranker leads.
- Not done: no stated keys, no automatic leak test, no description of each repository (sizes of changes, share of
  merges and bulk edits). The leak rule (a strict cut-off per block) is kept by reading the code.

## The setting

- The owner's PC: 32 GB free on a 931 GB disk; a slow link (large downloads are fetched in parallel pieces); Python
  runs only in containers; experiments run with the network off; one 12 GB card.
- For training later: about four large rented cards for about eight hours. Nothing goes to a rented machine without
  the owner's yes at that moment. Public code may be collected on a rented machine with his yes.
- The owner's two private repositories never leave his PC. Held-out truth never leaves his PC.
- A download needs his word, named with source and size first.
