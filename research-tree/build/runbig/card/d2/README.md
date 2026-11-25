# D2 Phase A: text-retriever screen (TRACK-PLAN 3.7). Scoring fixed before any arm runs.

Question: from issue-like text, do two embedders (Qwen3-Embedding-0.6B, SweRankEmbed-Small) put the finally edited
files in the top 10 more often than BM25? Gate: pass = 6 points or more over BM25 (Acc@10).

Data (prep.py reads the main line, `--ref main`, never the checked-out branch (B1); per repository: FixFlow = EMS_workshop1 git history, the clinic = its local repo without remote, zulip):
- Candidate commits: non-merge, message of 5 or more words after cleaning, not an automatic one (revert, merge, bump,
  translation, bot), with 1 to 15 files modified (status M) that are text/code files.
- Split by date (committer time): the last min(40 %, 250) candidates are held out. The index snapshot is the tree at
  the last commit before the first held-out candidate. No held-out commit's content is in the index; the RRF arm's
  co-change history uses only commits before that cutoff. Limit: held-out commits are scored against the cutoff
  snapshot, not their own parent.
- Query = cleaned commit message (subject + body up to 1000 characters; trailers and (#123) tags removed; every edited
  path, basename and extension-less file name (whole word) removed from the text (B2)). Written by script, no model.
- Truth = the modified files that exist in the cutoff index. A held-out commit with no such file is dropped (fixed rule
  before scoring). Index = text/code/doc files up to 150 KB, excluding locale, vendored, minified, lock files.

Arms: BM25 (node:sqlite FTS5 bm25(), camelCase split, path in text, OR of query terms); grep (case-insensitive
fixed-string match of each query term over file text, files ranked by distinct terms matched, then total hits; an
emulation of grep -c with the same term list as BM25); Qwen3 and SweRankEmbed (line-window chunks of about 1500
characters with the path, file score = best chunk cosine, model-card query prompts); RRF (FixFlow only): co-change graph
from pre-cutoff commits (weight 1/|e|, commits over 30 files dropped), seeds = BM25 top 3, CO = summed seed weights,
PPR (damping 0.85, power iteration), RRF k=60 of PPR and CO; seeds first, then these files, then BM25 order. It is the
co-change form of our ranker with BM25 seeds, not the 5,400-node typed graph (not rebuilt): a stand-in, said so in the
report.

Scoring (score.py): rankings cover every indexed file; unlisted files tie at the bottom; ties broken by one fixed random
key per (query, file), the same for every arm. Metrics: Acc@10 (at least one edited file in the top 10; primary),
P@2 (top-2 precision), Recall@10. Intervals: 10,000 query resamples within each repository. Primary statistic: mean over
the three repositories of (arm Acc@10 minus BM25 Acc@10), paired. Pass = an embedder's primary statistic is 0.06 or
more; its interval and the per-repository figures are reported next to it. The two absolute lines (under 0.45 stops; 0.68 or more allows seeding the agent's first read) are shown against each arm's
pooled top-2 precision (P@2), as section 3.7 states (B3). Also reported: best possible P@2 per repository (a one-file commit caps it at 0.5),
Acc@10 on queries with a non-docs edited file, n against the 617 of step 2a, and BM25's ceiling (messages still name directories and modules).
score.py raises on a query missing from a ranking file. Tie-breaking everywhere, RRF included, uses common.tiekey (B4).

CORRECTION 2026-11-24 (before any dense arm ran; the refuter's four breaking findings, `research-tree/build/refute/CARD-D2.md`):
B1 history from `main`, B2 file-name stems stripped, B4 random shared tie key in the RRF arm, and B3: the 0.45 and 0.68 lines were
written above on pooled Acc@10, which was a mistake against section 3.7 (top-2 precision). This corrects the README to the section; it is a fix
of a mistake found by the refuter's B3, not a change made after seeing a result. The gate (6 points on Acc@10 over BM25) is unchanged.
