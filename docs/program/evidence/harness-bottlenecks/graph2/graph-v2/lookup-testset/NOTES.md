# Lookup test set from recorded sessions, with index-only baselines (2026-11-14)

This folder holds the test set that the graph v2 refuter asked for (`../REFUTE.md` sections 6 and 7, ruling R-4a/R-4b):
real lookups that coding agents made on this repository, taken from the recorded session transcripts and weighted by the
tokens they cost, plus the "index-only" arm that any graph tool must beat. It is a measurement, not a design. No model was
called, and no transcript or transcript text left this machine. Only aggregates are kept here; instance-level data (seeds,
paths, call text) stays in the scratch folder named below, because it is transcript content.

Files here: `result.json` (every headline number under stable keys), `tables.md` (generated tables per form, per arm, the
"what a tool has to beat" table and the falsifier check), `split-sessions.tsv` (the split; its sha256 is the split hash).

## 1. Definitions

- **Transcript**: one JSON-lines session log under `C:/Users/User/.claude/projects/`, folders whose name contains
  `EMS-workshop1`, subagent logs included, cut at 2026-11-13T14:13:00Z (the moment `../use-cases.md` parsed, so its form
  weights and these agree). **Session**: one session id = a main transcript plus all its subagent transcripts.
- **Instance**: one lookup episode as `../use-cases.md` section 2.3 defines it (a maximal run of model calls that only
  look things up). Work class (product code, or program and document work), question form (CQ1 to CQ16, or a "not graph"
  form) and the token measures are the use-cases rules, copied verbatim into the extraction script. An episode's form is
  its form with the most carried tokens.
- **Seed**: what the agent had when it started looking, from the episode's first call: a path (and line range), a search
  pattern (identifiers, item IDs, phrases, scope), a file-name pattern, a history command's paths, or nothing usable.
- **Truth, two levels**. "Read": the files and line spans the episode went on to read. "Confirmed": a read span that a
  later call in the same transcript touches: an edit whose replaced text contains a read line, a `file:line` citation
  into the span, or a verbatim quote of a read line (40+ characters). Reading a span does not prove it was needed;
  "read but not confirmed" does not prove it was unneeded either (only about 9 % of model calls carry visible text).
- **Fetched tokens**: result characters / 2.42 (ratio measured in use-cases.md 2.3). **Carried tokens**: fetched tokens
  times the later model calls in the same context window.

## 2. Headline numbers and where each comes from

Every number below is in `result.json` under the key named; the script that computes it and its raw output are listed in
section 8, so a checker can recompute it.

**Instances** (`instances_by_class`; raw: `out/instances-v.jsonl`, checked by `out/check2.json`):
4,829 instances from 1,481 transcripts (109 product, 1,269 program, 103 with no model call). Product work: 1,069
instances, 109 transcripts, 5.35 million fetched and 241.8 million carried tokens; this equals `../use-cases.md` table 3.1
exactly. Program work: 3,760 instances, 1,245 transcripts, 47.8 million fetched, 1,144.8 million carried (use-cases:
3,763 and 1,147 million; the gap is transcripts that grew after its parse).

**Instances by form** (`instances_by_form`, share of the class's carried tokens, per-episode dominant form):
- Product, top six: how does this subsystem work (CQ3) 52 instances, 31.8 %; where is X defined (CQ5) 182, 11.6 %; what
  does this change set change (CQ6) 58, 9.4 %; run output and state (not graph) 226, 9.0 %; which rule applies (CQ4) 87,
  8.6 %; build, CI and lab scripts (CQ16) 119, 8.0 %. Co-change's form, what changed recently (CQ10): 51, 1.4 %.
- Program, top six: what did an earlier lane or agent conclude (CQ1) 1,574 instances, 49.6 %; what does the plan or design
  say (CQ2) 438, 16.4 %; which rule applies (CQ4) 218, 6.2 %; web pages (not graph) 184, 5.5 %; past transcripts (not
  graph) 70, 5.2 %; orientation in code (CQ3) 76, 4.8 %.
- These shares differ from use-cases.md table 3.1 (CQ3 20.7 % there) because there each call is counted under its own
  form, here each episode under one form. Both are in the repository; use the per-call table for "what is spent on what",
  this one for "what a test instance asks".

**Confirmed truth** (`confirmed_truth_share`): 27.1 % of all instances have at least one confirmed span (23.4 % by an
edit or citation alone). Product 28.4 % (22.4 %), carrying 50.8 % of product carried tokens; program 26.7 % (23.6 %),
49.5 % of program carried tokens. Per form: `tables.md` first two tables.

**Falsifier of use-cases.md recommendation R1** (`r1_falsifier`): it says CQ1 to CQ4 must be scored by an agent run if the
used spans cannot be identified for at least half of the instances. Only CQ3 reaches half (product 55.8 %, program
59.2 %). CQ4 (40.2 %, 39.9 %), CQ2 (10.4 %, 20.3 %) and CQ1 (program 24.3 %; product 0 of 4) do not. So for the forms that
carry most program tokens, this test set can score "was the read span returned", not "was the needed span returned".

**Replayable without leakage** (`replayable_no_leak_share`, `replay`): 512 of 4,829 instances (10.6 %); product 196 of
1,069 (18.3 %, 26.4 % of product carried tokens), program 316 of 3,760 (8.4 %, 4.6 % of program carried tokens).
"Replayable" means every primary-truth file (the confirmed files if any, else all read files) is byte-identical at the
session's inferred commit and at the frozen commit a31924a, whose extracted facts exist in `BUILD/facts/cache/`. All 190
cached snapshots are at or before a31924a (2026-08-03) and every session is later (2026-10-31 to 2026-11-13), so a
snapshot can be stale for an instance but cannot hold content written after it. The rest, by primary truth:
- needs a build at the session commit (a truth file changed or was added after a31924a): product 314, program 796;
  instances with any truth file changed or added since a31924a: product 265, program 833;
- needs the current content of untracked program documents (no history exists, so a replay may see text written after
  the session; flagged, never counted as leak-free): product 202, program 1,009; 174 and 1,155 distinct untracked files;
- truth only outside the repository (scratch files, transcripts, memory, web): product 215, program 1,248;
- no truth at all (the episode read nothing attributable): product 142, program 391.

**Version inference** (`replay`, `instances_by_class.commit_approximated`): the commit is the tip of the transcript's
recorded branch at the episode time (main when the branch is gone: 1 product instance). Uncommitted working-tree changes
are invisible. As a check on the truth spans themselves: on truth files unchanged since a31924a, the sampled read lines
match the file text at their line number for 87.5 % of lines (mean over 4,131 files; 85.1 % against the session-commit
text, 6,740 files). About one sampled line in eight is attributed to the wrong line or file, mostly in chained shell
reads; read spans carry that error.

## 3. The split (`split`, `split_hash`)

By session, never by instance. Each session gets a home class (the class with most of its carried tokens); within each
home class sessions are ordered by first lookup; the development part is the prefix closest to 60 % of the class's
carried tokens; every instance follows its session. Hash: sha256 of `split-sessions.tsv` =
`f49e3828cb6fcd89e3351d3e27dc56ebcdbf101a66c075fb66d34eab4dc6fee1`.
- Development: 4 program-home sessions (started 2026-10-31 to 2026-11-04 06:51) and 8 product-home sessions (started
  2026-11-13 07:23 to 08:10). Confirmation: 9 program-home sessions (from 2026-11-04 07:17) and 5 product-home sessions
  (from 2026-11-13 10:39). Realised development share of carried tokens: product 57.8 % (644 instances), program 65.3 %
  (2,309 instances).
- Plainly: the 13 product sessions are one day (2026-11-13) of one plan. The confirmation part is later by session start,
  not by every instance: the longest program session (31 Oct to 13 Nov, 37 % of all carried tokens) starts first and so
  sits in development while running alongside confirmation sessions. Documents read in both parts are the same files.

## 4. Index-only baselines on the development part (`baselines`)

Three arms, each given only the seed, no relation edges, top 10 results (k = 10), ties broken by a seeded hash:
- **A, path and symbol index**: file paths and definition names (functions, classes, constants, types; regex-extracted).
- **B, outline and item-ID index**: markdown headings as sections; item IDs, definition sites before citing lines.
- **C, keyword search**: BM25 over names, paths, headings and ID definitions (no body text).
The index is the tracked files at each instance's inferred commit plus the untracked files at their current content.
A **span hit** is a result whose line span overlaps a primary-truth span (any result in the file when the truth is a whole
file or a file list). Tokens: the 10 result lines, plus the text of the first span-hitting result ("to first hit"), or of
the cheapest span-hitting result among the 10 ("cheapest", which assumes the reader picks the right line).

Scorable: 266 of 644 product and 838 of 2,309 program development instances. Not scorable: no truth inside the repository
(product 251, program 1,083), no usable seed (67, 277), truth file not in the index at that commit (60, 111).

Results (span hit@10 % of scorable; carried-weighted %; median tokens to first hit / cheapest hit):
- Product, all seeds (median agent fetched 1,781, median truth span 1,234): A 47.4 % (34.7 %; 3,105 / 404);
  B 8.6 % (10.8 %; 4,052 / 709); C 55.3 % (36.6 %; 2,387 / 1,292); any arm 56.8 %.
- Product, search seeds only (121; agent fetched 1,069): A 27.3 %, B 8.3 %, C 42.1 % (51.8 % carried-weighted; 322 / 300).
- Program, all seeds (fetched 4,035, truth 2,054): A 31.7 % (39.5 %; 6,400 / 4,648); B 33.1 % (34.5 %; 1,061 / 714);
  C 55.3 % (46.7 %; 1,331 / 840); any arm 58.2 %.
- Program, search seeds only (521; fetched 4,102): A 11.3 %, B 33.8 %, C 44.0 % (20.2 %; 588 / 462).
- As a share of all development instances, scorable or not: product A 19.6 %, B 3.6 %, C 22.8 %, any 23.4 %; program
  A 11.5 %, B 12.0 %, C 20.1 %, any 21.1 % (`span_hit10_pct_of_all_dev`).
Reading notes: path seeds (the agent already had the file) make A and C look strong, and their first hit is the whole
file in 96 to 100 % of cases (rounded), so "tokens to first hit" there is a whole-file read. Ties straddle the cut of 10 in 34.6 to
41.7 % of keyword queries (`tie_at_cut_pct`). Hits on untracked current-only files: product 0 to 3, program 22 to 36 per arm.
Per form, with search and path seeds apart: `tables.md`.

## 5. What a tool has to return per form to do better (`to_beat`)

For each form a tool beats the index-only arms only if it puts the truth span in its answer more often than the best
arm, at fewer tokens than that arm needs to reach it; the floor is the truth span itself. The largest forms:
- Product CQ3 orientation (31.8 %): best arm C hits 66.7 % of 24 at 2,014 tokens to first hit; truth span 5,556; agent
  fetched 17,680. Product CQ5 definition (11.6 %): C 65.2 % of 89 at 2,481; truth 1,110; fetched 1,088.
  Product CQ4 rule (8.6 %): C 58.8 % of 17 at 2,707 (cheapest 667); truth 1,690; fetched 9,001.
- Program CQ1 earlier conclusions (49.6 %): C 44.7 % of 123 at 1,036; truth 1,554; fetched 3,531. Program CQ2 plan and
  design (16.4 %): C 58.9 % of 175 at 1,955 (cheapest 817); truth 4,161; fetched 5,526. Program CQ4 rule (6.2 %):
  C 60.2 % of 88 at 1,843; truth 3,122; fetched 4,613. Program CQ9 item IDs: B 70.4 % of 27 at 424.
These are sizes of index answers measured on recorded lookups. They are not a forecast of tokens saved: whether an agent
would stop reading after such an answer needs an agent run.

## 6. What could not be measured (`could_not_measure`)

- Which lines of a read the agent used; confirmation sees only edits, citations and quotes (section 1).
- The exact code version (no commit in transcripts) and uncommitted working-tree state.
- Leak-free replay of untracked program documents (current content only); and run-to-run drift: those files are read live
  when the baseline runs and other sessions keep writing them (one cell moved 29.6 to 29.5 % between two runs).
- Truth outside the repository (scratch, transcripts, memory, web): counted, not scored.
- Whether a hit covers the whole needed span (a hit is an overlap), and whether an agent given it would stop reading.
- Form labels are rule-based, right on about 3 calls in 4 (use-cases.md 2.4); CQ1 is the noisiest.
- Nothing has been scored on the confirmation part, by design; product numbers per form rest on few sessions (8 in
  development).

## 7. What this changes for the design

The test set exists and the split is fixed, but for CQ1, CQ2 and CQ4 the truth is mostly "read", not "confirmed used",
and only 10.6 % of instances replay against a cached snapshot without possible leakage (product 18.3 %). A zero-model
replay can score the graph arms against the index-only arms on the snapshot-ok and read-truth instances; the forms with
weak truth (CQ1, CQ2, CQ4) need the agent run that use-cases.md R1 names. Keyword search over names, paths and headings
is the strongest index-only arm on almost every form, and it is the one to beat.

## 8. How to recompute

Scripts and raw data are in `C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/graph-v2-work/lookups/`
(`PROGRESS.md` there is the run log). Run each with `cd <that folder> && node --max-old-space-size=1400 - < <name>`.
| Step | Script | Raw output | Feeds keys |
|---|---|---|---|
| Episodes, seeds, truth | `extract.js.txt` | `out/instances.jsonl`, `out/transcripts.jsonl` | all |
| Completeness check | `check2.js.txt` | `out/check2.json` | `transcripts`, class totals |
| Version, replay | `version.js.txt` | `out/instances-v.jsonl` (its `out/version-summary.json` has one wrong key, `afterLatestSnap`; not used) | `replay`, `replayable_no_leak_share` |
| Sessions, split | `sessions.js.txt`, `split.js.txt` | `out/sessions.json`, `out/split.json`, `out/split-sessions.tsv` | `split`, `split_hash` |
| Baselines | `baseline.js.txt` | `out/baseline-instances.jsonl`, `out/baseline-log.txt` | `baselines`, `to_beat` |
| Aggregates | `report.js.txt` | this folder's `result.json`, `tables.md` | everything above |

## Independent recomputation (2026-11-14)

A fresh-context checker recomputed about 35 headline numbers from the raw instance files with its own code (scripts
in WORK `lookups/check/`; table in `CHECK.md` here): counts per class and per form, fetched and carried token
shares, confirmed-truth shares, the 512 instances (10.6 %) replayable without leakage (also re-derived from the
per-file labels), the split hash, that no session sits in both parts, that every baseline instance is in the
development part, and the recomputed index-only baseline cells. All matched. Its one caveat is already stated
above: "replayable without leakage" rests on an inferred commit, so uncommitted edits are invisible.
