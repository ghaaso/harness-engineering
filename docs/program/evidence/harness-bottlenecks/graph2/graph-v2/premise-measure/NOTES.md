# Premise measurement for the conclusion ledger (graph v2, question form CQ1), 2026-11-14

**What this measures.** The graph v2 design wants to store agents' conclusions with the premises they rest on, and
re-check a stored conclusion by re-checking its premises. The refuter (`../REFUTE.md`, objection at line 87 and the
open item at line 204) said most earlier conclusions in this program rest on things outside version control, so a
premise check cannot reach them. This folder measures how true that is. It also measures how often findings are read
again and whether a finding that had gone stale was read and used.

**Data.** Local session transcripts only (JSON-lines under `C:/Users/User/.claude/projects/`, folders whose name
contains `EMS-workshop1`, subagents included). Nothing left this machine; no transcript text is in this folder.
The reads are the calls that `../use-cases.md` labelled CQ1 ("what did an earlier lane, round, agent or review
conclude about X, and does it still hold"): 6,340 calls, 20.7 million fetched tokens, 522 million carried tokens.
**Fetched tokens** = tokens a call returned; **carried tokens** = fetched tokens times the number of later model calls
in the same context window (definitions in `../use-cases.md` 2.3). CQ1 is that file's noisiest label: a heuristic
on reads of notes, reports and verdict files, not a judged intent.

**Two sessions did this.** Session 1 (2026-11-13) wrote steps 0 to 3a and was cut off by a shutdown; session 2
(2026-11-14) checked its scripts, kept its outputs, split one premise kind, traced staleness, and wrote this folder.
Scripts and intermediate files live in the scratch folder
`C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/graph-v2-work/premises/`
(called WORK below; its `PROGRESS.md` is the step log). Copies of every script are in `scripts/` here; the SHA-256 of
every input and intermediate file is in `input-hashes.txt`. Scripts run with `cd WORK && node - < name.js.txt`.

## Definitions

- **Inside the repository, tracked**: a fact computable from git at a commit of this repository by a fixed query
  (premise kind a), or a span of a file committed in this repository (kind b). For the location of reads (step 1),
  a file counts as tracked when git shows it added on any ref (`git log --all --diff-filter=A`, file `git-added.txt`,
  format `@@<sha> <commit time>` then paths) **before the time of the read**. "Any ref" includes the docs branch the
  program documents are committed on; `main` alone would count fewer.
- **Inside the repository folder, untracked** (kind c_repo): a file under the repository folder (mostly
  `docs/program/` notes and `docs/program/evidence/`) that git does not hold. It can change or vanish with no record.
  For premises this is judged by where a copy sits now (2026-11-14).
- **Outside**: scratch folders and transcripts (c_scratch), untracked files of the owner's other (clinic)
  repository (c_other), facts from that repository's git (ax, bx), third-party library source pinned by a tracked
  lockfile (epin), one-off measurements whose inputs were not kept (d), outside sources such as papers, web pages,
  videos and tool documentation (e), and agent judgement with no checkable premise (f).
- **Finding**: one stated conclusion with its evidence (a bullet, table row or paragraph that concludes something).

## Headline numbers and where each comes from

| Number | Value | Script -> raw file -> key in `result.json` |
|---|---|---|
| CQ1 reads of tracked files in this repository (product plus program) | 15.6 % of calls, 7.1 % of fetched, 4.1 % of carried tokens | `loc.js.txt` -> `loc.json` -> `reads_by_location.inside_repository` |
| CQ1 reads of untracked files in the repository folder | 28.8 % of calls, 22.4 % fetched, 25.1 % carried | same |
| CQ1 reads of scratch folders outside the repository | 50.8 % of calls, 66.9 % fetched, 67.8 % carried | same, `classes` |
| Transcripts / other outside / unresolved / web | 1.3 % / 3.2 % / 0.4 % / 0 % of calls | same |
| Re-read of a file the same agent transcript wrote | 23.9 % of calls, 21.5 % of carried | `measure.js.txt` over `rows.jsonl` -> `same_task_reread_share.strict_same_transcript` |
| Same transcript, or same session within 24 h of writing | 72.1 % of calls, 81.8 % fetched, 83.9 % carried | `...task_same_transcript_or_session_under_24h` |
| Same session at any age (upper bound) | 86.4 % of calls, 92.2 % carried | `...loose_same_session_any_age` |
| Findings whose checkable premises are all tracked in this repository | 12 of 60 = 20 % (Wilson 95 %: 12 to 32 %; file-cluster bootstrap 6 to 41 %) | `measure.js.txt` over `classify2.json` -> `in_repo_premise_share.headline_tracked_checkable` |
| Same, with no bare-judgement premise at all | 7 of 60 = 12 % (6 to 22 %) | `...tracked_strict` |
| All checkable premises in the repository folder, tracked or not | 16 of 60 = 27 % (17 to 39 %) | `...folder_checkable` |
| All checkable premises in some version control or pinned (either repository) | 17 of 60 = 28 % (19 to 41 %) | `...any_version_control_or_pinned_checkable` |
| If every cited file had been content-hashed when cited | 32 of 60 = 53 % (41 to 65 %) | `...counterfactual_every_cited_file_content_hashed` |
| At least one premise that cannot be re-checked at all (d or f) | 44 of 60 = 73 % (61 to 83 %) | `...has_unrecheckable_premise` |
| Deterministic finding (a query plus its answer, type Q) | 7 of 60 = 12 % (6 to 22 %); all 7 re-checkable from this repository now | `deterministic_finding_share.type_Q_*` |
| Expressible as a query if its inputs had been kept (Q, or script result M) | 22 of 60 = 37 % (corrected by the checker; the earlier 19 of 60 counted the `r9` field "new or typed", a different quantity) | `findings-classified.json`, see `CHECK.md` |
| Interpretation only a model or person can re-check | 41 of 60 = 68 % (56 to 79 %) | `...interpretation` |
| Premises per finding | mean 3.65, median 3 (quartiles 2 and 4, maximum 10) | `premise_kind_shares.premise_counts` |
| Sampled findings shown again in another session | 43 of 56 found (27 in two or more other sessions); median gap to each later session 57 h | `reuse.js.txt` -> `reuse-hits.jsonl`; `reuse2.js.txt` -> `reuse.json` -> `reuse.sample` |
| CQ1-read files read in two or more sessions | 94 of 2,245 files (checker's recount: 284 scratch directories outside the repository had been counted as files; the earlier figure was 108 of 2,529); 9.9 % of all CQ1 carried tokens; none in more than 5 | `rows.jsonl` via WORK `check/align-result.js.txt` -> `reuse.files` |
| Stale findings in the sample, read again after the change | 2 stale (I9, B5) and 1 drifted (E5) of 8 traced; 6 exposures after the change, in 5 session-finding pairs; none wrote the stale sentence into a file afterwards | `classify2.js.txt` (STALE table), `stale2.js.txt` -> `stale2.json` (copy: `stale-exposures.json`) -> `stale_use` |

Intervals: Wilson 95 % on 60 findings; the file-cluster bootstrap resamples the 12 source files (findings in one
file are not independent) and is the honest, wider one.

## Step 1: what CQ1 re-reads, and how much of it is the agent's own working file

Two thirds of what the "earlier conclusion" label fetches and carries is scratch-folder content outside the
repository; a quarter is untracked notes and evidence in the repository folder; tracked files are 4 % of carried
tokens. No CQ1 call fetched the web. Of the tracked reads, almost none had uncommitted edits recorded after the last
commit (0.07 % of calls, `own.json` `trackedReads`).

Most of the label is not "an earlier lane's conclusion" at all: 72 % of calls (84 % of carried tokens) re-read a
file the same agent wrote, or that its own session (an orchestrator and its subagents) wrote less than 24 hours
before. Only 6.3 % of calls read a file another session wrote (`own.json` `byWriter`, row d). One session that ran
310 hours holds 39 % of the calls, so the session-level figures lean on it. Writes are taken from recorded Write and
Edit calls and parsed shell redirects; a file a script wrote has no recorded writer and is counted as "same agent"
only when it was created during the reading agent's run (file birth time). The 24-hour age of a file with no
recorded write is also taken from its file birth time, read at analysis time; counting recorded writes alone, the
share is 49 % of calls and 75 % of carried tokens (checker, `CHECK.md`). Read the 72 % as an upper figure.

## Step 2: what the conclusions rest on

**Sample.** Twelve finding-bearing files were picked by hand among the files with the most CQ1 reads, sessions or
carried tokens (their ranks are in `findings-classified.json`, `files_rank_among_cq1_files`): a review report (A),
gate verdicts (B), two lane-note files (C, J), the bottleneck compile (D), two facts lists (E, H), review cards (F),
sweep cards (G), a design with findings (I), a critic report (K) and a refuter report (L). `sample.js.txt` cut each
into units and shuffled them with seed 20261113; `sel.js.txt` took them in that order, skipping units that state no
conclusion (procedure steps, file or schema descriptions, source links, sentence fragments), five per file, four for
I and J and six for K and L: 60 findings. The skipped units are mostly descriptions, so the sample leans away from
plain factual descriptions of code, which would be more deterministic.

**Classification** (one coder, no second coder): per finding, a type (Q query plus answer, M result of a script run,
S summary of a cited text, R record of a decision, I interpretation) and a count of premises by kind. Session 1
made the first pass (`classify-first-pass.json`); session 2 split kind c by place and moved three clinic-repository
queries from a to ax (`classify2.js.txt`). The per-finding table with text, premises, the query in words and the
staleness check is `findings-classified.json`.

Finding-level shares (share of the 60 with at least one premise of the kind; Wilson 95 %): judgement f 63 %
(51 to 74); tracked span b 32 % (21 to 44); outside source e 25 % (16 to 37); untracked file in the repository
folder c_repo 25 % (16 to 37); scratch c_scratch 23 % (14 to 35); one-off measurement d 22 % (13 to 34); repository
query a 20 % (12 to 32); clinic tracked span bx 15 %; clinic untracked c_other 8 %; clinic query ax 5 %; pinned
library source epin 3 %. Of the 219 premises: 18 % judgement, 14 % untracked repository-folder files, 12 % outside
sources, 11 % tracked spans here, 11 % tracked clinic spans, 10 % scratch, 8 % clinic untracked, 7 % one-off
measurements, 6 % repository queries, 3 % other.

**Answer to the refuter.** He is right in direction and the size is now known for this sample: one finding in five
rests only on things tracked in this repository (12 %, if a finding that adds any bare judgement is excluded).
Three in four have a premise no ledger could re-check (a one-off measurement or bare judgement). The program
documents themselves are the main obstacle: a quarter of findings cite untracked notes in the repository folder.

**Against R9 of `../lane-time-incremental.md`** (line 212: most checkable content is already a deterministic query):
in these program files 12 % of findings are a query plus answer and 37 % (22 of 60, type Q or M) could be, if their inputs had been kept.
"Most" is not supported for program work. Six of the seven deterministic findings came from two tracked plan
documents (B, I: product facts such as a seed PIN, a config default, a build profile); the seventh (E5) is a size of
CLAUDE.md quoted in a scratch facts list.

## Step 3: reuse and staleness

**Reuse.** A finding's "needle" (a 24 to 48 character run of its text) was searched in every transcript
(`reuse.js.txt`); an exposure is a tool result that contains it. 56 of 60 needles were found (C4, G2, I4, J4 cross a
line break). Of the 56, 43 were shown in a session other than the one that wrote them, 27 in two or more; 1,193
exposures in all, 504 in other sessions (420 of those by reading a file, 59 by search, 18 by scanning transcripts).
Median gap from writing to the first exposure in each later session: 57 h (quartiles 30 h and 279 h, maximum
305 h). An exposure is not use. The file view is stricter, because it counts only CQ1-labelled reads: of 2,245 files
so read, 94 were read in two or more sessions (checker's recount; the earlier 108 of 2,529 counted 284 scratch
directories as files). The needle counts above exclude the measuring lane's own scanning transcript (82 hits) and 747 hits
that carry no timestamp; with those rules stated, the checker reproduces 56 / 43 / 27. So findings do travel between sessions, mostly through the tracked
plan documents (B, I: up to 10 sessions) and the review report A; most CQ1 traffic stays inside one session.

**Staleness** was traced for the 8 findings with premises in this repository (git history of `main`): I9 (the ping
backdate ceiling "stays 48 by default") went stale when 87bbe88 (2026-11-13 10:03 UTC) set the default to 240 h;
B5 ("login never checks for a default" PIN) went stale with the PIN policy in the same commit; E5 ("CLAUDE.md is
about 7.5k tokens") drifted as CLAUDE.md grew from 29,605 to 35,853 characters that day. I3, I4, A8 hold; I6 holds
for the phones in the field; B6 was not traced. **Both stale sentences still stand, unmarked, in tracked
documents** (`docs/program/w2/O-10-design.md` on the plan branch, `docs/program/G2-deep-dive-gate-2026-11-01.md`).
After the change, I9 was shown 5 times in 4 sessions and B5 once (`stale2.js.txt`, mechanical only): in 5 of the 6
the corrected fact was also shown in the same transcript, and none of the 6 wrote the stale sentence into a file
afterwards. Whether a decision rested on it is **not established**, and the window is short: the corpus ends 5.4
hours after the change.

## Step 4: what a premise-checking ledger could keep honest

- **Can keep honest (about 12 to 20 % of these findings):** query-plus-answer findings about this repository (seed
  values, config defaults, build profiles, call sites), and summaries of tracked spans whose span hash can be
  re-checked (E1 to E3). Two of the seven query findings went stale within two weeks; a ledger re-running "default
  of the ping backdate ceiling setting" and "does login compare a PIN with a default" at the new commit would have
  flagged both, and both still sit unflagged in tracked documents.
- **Could keep honest if written differently (up to about half):** script results (M, 25 %) and findings citing
  untracked notes, scratch files or clinic files. With every cited file content-hashed at citation time, 53 %
  (41 to 65 %) would have only file or query premises (the change detected, not the conclusion re-derived).
- **Cannot:** findings resting on outside sources (25 %), on one-off measurements whose inputs are gone (22 %), and
  the judgement layer (63 % carry some bare judgement; 68 % are interpretation). For these a ledger can store the
  date, author and premises, and show their age; it cannot say the conclusion still holds.
- **What recording premises at writing time would have required:** about 3 to 4 premise records per finding
  (median 3, up to 10). In this sample a writer would have had to record, per 100 premises: 6 repository queries,
  11 tracked spans with commit, 14 plus 10 plus 8 file spans needing a content hash (repository folder, scratch,
  clinic), 11 plus 1 clinic git facts, 2 pinned library spans, 12 outside-source citations with fetch date,
  7 measurement inputs that were not kept, and 18 judgements to be marked as such.
- **What would have to change in how findings are written:** put the query in words or code and the commit beside
  each code claim; keep measurement inputs and outputs under content hashes (or commit them) instead of in scratch;
  commit or hash the evidence notes a finding cites; mark judgement as judgement; and give each finding an id the
  ledger can index. None of this was measured as a cost; it is what the sample says is missing.

## Could not measure

1. Whether a stale finding was acted on (needs a reading of the transcripts; this lane only counted).
2. Staleness of findings whose premises have no history (scratch, untracked notes, clinic output, outside sources).
3. Use as opposed to exposure (a shown finding need not be read; 9 % of model calls carry visible text).
4. Four sampled findings (C4, G2, I4, J4) were not found in transcripts (needle crosses a line break).
5. Coder agreement: one coder, no second pass.
6. The CQ1 label's precision (heuristic, noisiest in `../use-cases.md`).
7. Random file choice: the 12 files were chosen by hand among high-ranking ones.
8. The state of an untracked file when a finding was written (judged by where a copy sits now).
9. Stale use over time: only 5.4 hours separate the two changes from the end of the transcript corpus.

Not claimed here: any token saving, or that a ledger would have prevented a wrong action.

## Independent recomputation (2026-11-14)

A fresh-context checker recomputed the headline numbers from the raw files with its own code (scripts in
WORK `premises/check/`; table in `CHECK.md` here). About 30 numbers matched. Two did not, and are corrected above:
files read in two or more sessions (94 of 2,245, not 108 of 2,529) and "expressible as a query" (22 of 60, not 19).
Rounding only: transcripts 1.2 % (not 1.3 %), other outside sources 3.1 % (not 3.2 %). Wording tightened: the 72 %
same-task share is an upper figure (49 % of calls counting recorded writes alone). Ground-truth spot checks: 15 of
15 seeded paths agree with `git ls-files` on tracked or untracked; 5 of 5 sampled findings' text occurs in the cited
file near the cited line. `result.json` still carries the earlier values for the two corrected keys; `CHECK.md` and
this file supersede them.
