# results/tuner: stage-1 score tables for the arm tuners (grader output)

Written by the grader lane on 2026-11-12 (stage 1, TUNE only). Each file holds one arm's own rows
and nothing else: aggregates per configuration and task set, never per task, per commit, or any
reference content. A tuner reads only its own arm's pair of files (addendum 3, item 8).

| file | content |
|---|---|
| `relational.stage1.json` / `.md` | 40 configurations of the relational list (hash 5efda93e9c470eb9) |
| `search.stage1.json` / `.md` | 40 configurations of the search list (hash ef02c4a27f96928a) |
| `ladybug.stage1.json` / `.md` | 40 configurations of the LadybugDB list (hash 62916d71ad487af9) |
| `duckpgq.stage1.json` / `.md` | 40 configurations of the DuckPGQ list (hash 0cef37d35583a845) |

Per configuration: its name, configuration hash, the normalised configuration, its complexity
(addendum 3 item 10, with the parts that make it up), and for each of T1, T1x and T2: primary
(recall of reference files plus definitions shown inside the 8,000-token answer, averaged per task
within a commit and then over commits; null for paths and range forms) with its standard error over
commits, recall at 2,000, 4,000, 8,000 and 16,000 tokens, area under recall against tokens (0 to
16,000, divided by 16,000), definition-only and file-only recall at 8,000, recall of the arm's own
head without the padding tail at 8,000, precision at 8,000, file recall@10, nDCG@10, MRR, median
tokens used at 8,000 and 16,000, tokens to 80 % recall (median and mean; 16,000 when not reached)
with the share of tasks that reach it, median engine milliseconds per query and median lookups.

Scored by the grader with `arms/common/score.js`, rule `content`, against the TUNE references only.
Engine milliseconds come from the stage-1 sweeps, which ran several processes at once: they are not
the engine measures of addendum 2 item 22. Nothing was selected or frozen.
