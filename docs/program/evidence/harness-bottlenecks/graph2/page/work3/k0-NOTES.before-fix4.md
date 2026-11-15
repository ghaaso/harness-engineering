# K0: cached answers with invalidation, replayed over 190 code-graph snapshots (2026-11-13)

This lane tests the owner's idea of caching answers on top of a code graph and invalidating them when what they rest
on changes. It is the deterministic form only: no model was called and no agent ran. An answer is computed once from
the parser-built code graph of the finished test, stored with the set of facts it rests on, and served again at later
commits if an invalidation rule says it still holds. Because the answers are deterministic, the true answer at every
commit is free: it is recomputed and compared with what each rule served.

Aggregates, per policy, per kind, per runtime, by age and by gap, are in `result.json` beside this file. Code and raw
results are in the session scratchpad at
`C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/k0`
(the reported run is `out/final1`, its repeat `out/final2`).

Corrected on 2026-11-13 after the audit in `AUDIT.md` beside this file. No measured number was changed. The
corrections: the token figure is now called an estimate at median prices, not a bound, and is shown beside the
per-kind-price and mean-price figures (sections 1 and 3.10); the share of questions that never change and every rate
on the questions that do change are added (sections 1, 3.1 and 3.2); section 5 gains the items the audit asked for;
90 of the 91 side-branch snapshots were merged, not all 91 (section 2.1); two rates were rounded twice and are now
rounded once (fact_pos 88.5 %, completion cutoff 24.5 %); the audit's independent recomputation is cited (section 2.3).

## 1. Short answer

- On 250 structured code questions of 8 kinds, replayed over 189 steps of this repository's history, a fact-level
  dependency record that also records negative dependencies (query patterns such as "edges of kind calls_url into this
  route") served 87.6 % of 29,097 lookups from the cache and served 0 stale answers. Comparing only the fields a
  program actually read raised that to 95.9 %, and early cutoff on top of it to 96.2 %, still with 0 stale answers.
  "Stale" is judged against the same extractor's facts, and for programs whose every read is recorded, zero stale is
  what a correct recorder must give (section 5).
- 138 of the 250 questions (55.2 %) never change their answer over the replay, and 13,857 of the 29,097 lookups
  (47.6 %) are of those questions; every rule, even "never invalidate", is right on them. On the 112 questions whose
  answer changes at least once (15,240 lookups), fact level served 82.5 %, the read-fields variant 93.8 % and early
  cutoff on it 94.2 %, all with 0 stale; file level served 80.9 % with 13.2 % of its served answers stale.
- File-level invalidation served 86.5 % of lookups, but 6.5 % of the answers it served were stale (1,632 answers,
  from 69 of the 250 questions; 13.2 % on the changing questions). Fact-level tracking without the negative patterns
  was no better: 6.8 % stale (13.6 % on the changing questions).
- The stale answers come almost entirely from new relations appearing outside an answer's own files: a new client
  call to a route, a new test, a new invariant in CLAUDE.md, a new migration, a new setting reader. Of the 134
  "dependency cases" in the 8 question kinds (an answer changed although none of its own files changed), 133 were of
  this kind; 1 was a route id whose prefix is set in another file.
- The change-completion ranking (the ninth kind) rests on a large part of the graph (a median of 3,633 nodes, 8,319
  edges and 323 files per answer). Its answer changed at 23.8 % of steps, and fact-level invalidation could serve only
  9.2 % of its lookups (24.5 % with early cutoff).
- Time-to-live rules and "never invalidate" serve many answers but cannot tell stale from fresh: 20 commits served
  94.4 % with 12.0 % of served answers stale (23.0 % on the changing questions); never invalidating served all of
  them with 32.7 % stale (62.5 % on the changing questions).
- Tokens: nothing was measured. The figure below is an estimate under one assumption, not a bound and not a saving:
  if every served answer replaced one scripted-search derivation, the fact-level cache would avoid about 58,100
  tokens per 100 lookups at the finished test's median prices (694.5 tokens read, 31 tokens of answer), about
  161,500 at its mean prices and about 185,400 at its per-kind median prices. Against a typed query it avoids 0
  tokens, because a typed query already returns an answer of the same size. These answers cost about 6 ms of computer
  time for 247 questions, so the case that could matter, conclusions that cost a model many tokens to derive, is not
  tested here.

## 2. Setup

### 2.1 Snapshots and their order

- The finished test's facts cache holds 190 snapshots of the code graph (`nodes.jsonl`, `edges.jsonl` per commit), all
  built by extractor version `59da7b753a4d908e`.
- Read-only git (`rev-list --first-parent`, `ls-tree`) placed them. Only 99 of the 190 lie on main's first-parent
  chain (main has 161 first-parent commits; the 99 span first-parent index 0 to 154, 2026-05-31 to 2026-08-03). The
  other 91 are commits on side branches. 90 of them were merged into main (they are ancestors of main `34f1dcd`).
  One, `8dafcecc7f`, is not: it is a leaf of the tree (tree parent `1c546a3106`, gap 1 commit) on a branch that was
  never merged, and it accounts for 342 logged lookups. This does not affect the order check (`AUDIT.md` section 2).
- All 190 form one first-parent ancestry tree: each snapshot's parent is its nearest cached ancestor along its own
  first-parent chain. The tree has 1 root, 189 steps and 29 branch points. The gap between a snapshot and its tree
  parent is 1 commit for 159 steps, 2 for 18, 3 for 5, 4 for 3, 6 for 3 and 7 for 1.
- Treatment: the primary replay ("tree" lane) walks the whole tree depth-first and each snapshot inherits the cache
  of its tree parent, so side-branch snapshots are used, not dropped. Four further lanes replay main's chain alone:
  every snapshot (98 steps, mean gap 1.57 commits), every 2nd (mean 3.14), every 4th (6.33) and every 8th (12.67).
- File content hashes are git blob ids at each snapshot commit (`git ls-tree -r`).

### 2.2 Questions (counts actually obtained)

| Kind | Finished test's 50 | Generated | Runtimes of the generated anchors |
|---|---|---|---|
| screen_tables | 6 | 25 | web 13, mobile 12 (no backend anchor exists) |
| tests_reach | 6 | 25 | backend 9, web 8, mobile 8 |
| invariants_on_file | 6 | 25 | backend 11, web 9, mobile 5 |
| other_half | 6 | 25 | backend 25 (the kind starts from a backend function) |
| setting_readers | 6 | 25 | backend 9, web 8, mobile 8 |
| migrations_touch_table | 7 | 25 | backend 25 |
| route_clients | 7 | 25 | backend 25 (the anchor is a backend route) |
| change_reach | 6 | 25 | backend 9, web 8, mobile 8 |
| completion (ninth kind) | - | 100 files | backend 34, web 33, mobile 33 |

- (a) The 50 questions are the finished test's (`tasks/tq_questions.jsonl`), with targets read by the shared parser
  `arms/common/tqtarget.js` and its absent-member rule applied at the frozen commit.
- (b) 200 generated questions, 25 per kind, by a seeded rule (seed 20261113, mulberry32): candidate anchors of the
  right node kind (listed in `gen.js`), not already an anchor of the 50, existing in at least 20 consecutive
  main-chain snapshots, split by runtime (ops console counted as web), each list sorted by node id and shuffled, then
  taken round-robin over runtimes.
- (c) 100 completion seeds: non-test code files (.py, .ts, .tsx, .js, .jsx, .mjs) with the same 20-snapshot rule,
  34 backend, 33 web, 33 mobile.
- Deviation from the brief: anchors were not drawn from the first snapshot graph, because the first snapshot is the
  repository's first commit (237 nodes, web only, with no route, table, setting, migration or test node).
- A question is looked up at a snapshot when its anchor exists there or existed at the lane's previous snapshot (so
  the step that removes an anchor is tested). This gave 29,097 warm lookups of kinds 1-8 and 11,783 of completion in
  the tree lane. Lookups with no cached entry yet (a question's first lookup on a path of the tree) are cold misses
  and are not counted in the rates; their counts are in `result.json` (`cold_misses`).
- Many fresh answers are empty: change_reach 63 %, screen_tables 60 %, invariants_on_file 42 %, tests_reach 35 %,
  other_half 23 %, route_clients 19 %, completion 7 %, setting_readers and migrations_touch_table 0 %. Rates on
  non-empty answers alone are reported in section 3.7.

### 2.3 The question programs, and the checks that they are the finished test's

- Kinds 1-8 are JavaScript ports (`programs.js`) of the finished test's SQL question programs
  (`arms/relational/tq.js`), reading the graph only through a recording reader. Same depth cap (12), same filters,
  same ordering (UTF-8 byte order, empty values first) and the same merge of several routes.
- Kind 9 is the frozen change-completion configuration (config hash 95e990307da3b42b: file granularity, signature
  form, no padding, minimum confidence 0.5, both directions, classes structure to history, k-hop with no hop cap, no
  hub rule, degree-normalised ranking), run by the reference arm's own code (`arms/reference/ref.js`) and packed by
  the shared packer into 8,000 tokens. Its answer is the list of files shown inside 8,000 tokens and which is cut.
  The seed is the file node alone.
- Check 1: at the frozen commit the JS programs gave the same answers as the SQL arm's answer files for 50 of 50
  questions.
- Check 2: at 40 snapshots spread over the tree, every live question of kinds 1-8 was answered by both the JS port and
  the SQL program (over a SQLite store built by the finished test's `db.js` from the same graph): 6,177 of 6,177
  answers byte-identical.
- Check 3: the completion program reproduced the items shown inside 8,000 tokens for 40 of 40 held-out T1 answer
  records of the frozen configuration (with the records' own seeds).
- The true answers used for the stale counts came from the same JavaScript code that produced the cached answers,
  and check 2 covered 40 of the 190 snapshots. The audit (`AUDIT.md` section 3) then recomputed the true answer for
  every one of the 40,880 warm lookups of the tree lane (29,097 of kinds 1-8, 11,783 of completion) with its own
  loader, the finished test's original SQL programs and reference arm, and its own reconstruction of what each policy
  served: 0 disagreements. Not re-checked by the audit: the four main-chain lanes, the tables by age and by gap, and
  the dependency-size medians. A mistake shared with the finished test's own question programs, about what a
  question means, would not show in either check.

### 2.4 What each answer rests on (three grains)

Every read goes through `rec.js`, which logs:
- facts: each node read (by id, with a hash of the whole raw record and a hash of its semantic fields: id, kind, path,
  name, runtime, slice, is_test) and each canonical edge read (kind, source, target, with a hash of all its evidence
  rows and a semantic hash of the highest confidence and the set of evidence paths and operations). Whether the
  program read line numbers, token counts or signatures is logged per read. A node looked up and absent is recorded
  as absent, so its appearance invalidates.
- negative dependencies: every query pattern the program ran (out-edges or in-edges of a node restricted to kinds,
  all edges at a node in the active classes, nodes with a path, nodes with a name), with a hash of its matched set.
  A new matching fact changes that hash.
- files: the paths of every node read, the evidence paths and both endpoints' paths of every edge read, and the path
  inside an absent symbol's id.
- sub-derivations: the reach sets (client reach and backend reach of screen_tables, the reverse reach of tests_reach,
  other_half and change_reach) and the ranked file list of completion are recorded as separate units with their own
  dependencies and results, for early cutoff.

### 2.5 Policies

| Policy | Rule |
|---|---|
| none | recompute at every lookup |
| repo | any changed file anywhere invalidates every entry |
| file | invalidate when a file of the answer's dependency set has a different blob id |
| fact_pos (extra) | invalidate when a recorded node or edge record changed; negative patterns not checked |
| fact | invalidate when a recorded node or edge record changed or vanished (whole-record hash), or a recorded pattern's matched set changed |
| fact_sem (extra) | as fact, but a fact read without its line, token or signature fields is compared on its semantic hash |
| cutoff | as fact; when a sub-derivation's dependency changed, it is recomputed, and if its result is equal the answer above it is kept (backdated) |
| cutoff_sem (extra) | early cutoff on the semantic hashes |
| ttl5, ttl20 | served while the answer is at most 5 or 20 first-parent commits old |
| never | never invalidated (the stale control) |

Each lane carries every policy's cache forward step by step. A served answer is stale when it differs from the answer
recomputed at that commit. A recomputation is avoidable when it returned the cached answer. For "none" a
recomputation is avoidable when it returned the previous lookup's answer.

### 2.6 Determinism

The replay was run twice with the final code (`out/final1`, `out/final2`). The aggregate file `replay.json` has the
same sha256 in both (328e46b5...52934f0), and so has the per-lookup log of the tree lane (e85112c0...c78bed). An
earlier pair with slightly older code (`out/run1`, `out/run2`) was also byte-identical within the pair.

## 3. Results

All figures are for the tree lane (190 snapshots, 189 steps) unless a lane is named. "Served" means answered from
the cache. Stale upper bounds are one-sided 95 % Clopper-Pearson bounds on stale answers per served answer; they
assume independent lookups, which these are not (the same questions repeat at every snapshot), so a per-question
count is given too.

### 3.1 Per policy, kinds 1-8 (29,097 lookups)

| Policy | Served | Hit rate | Stale served | Stale per served (upper 95 %) | Recomputations | Avoidable |
|---|---|---|---|---|---|---|
| none | 0 | 0 % | 0 | - | 29,097 | 28,693 (98.6 %) |
| repo | 0 | 0 % | 0 | - | 29,097 | 28,693 |
| file | 25,162 | 86.5 % | 1,632 | 6.49 % (6.75 %) | 3,935 | 3,623 |
| fact_pos (extra) | 25,765 | 88.5 % | 1,750 | 6.79 % (7.06 %) | 3,332 | 3,025 |
| fact | 25,490 | 87.6 % | 0 | 0 % (0.012 %) | 3,607 | 3,203 (88.8 %) |
| fact_sem (extra) | 27,896 | 95.9 % | 0 | 0 % (0.011 %) | 1,201 | 797 |
| cutoff | 25,752 | 88.5 % | 0 | 0 % (0.012 %) | 3,345 | 2,941 |
| cutoff_sem (extra) | 27,982 | 96.2 % | 0 | 0 % (0.011 %) | 1,115 | 711 |
| ttl5 | 23,150 | 79.6 % | 949 | 4.10 % (4.32 %) | 5,947 | 5,516 |
| ttl20 | 27,454 | 94.4 % | 3,297 | 12.0 % (12.3 %) | 1,643 | 1,337 |
| never | 29,097 | 100 % | 9,520 | 32.7 % (33.2 %) | 0 | 0 |

- The answer changed between consecutive lookups in only 404 of 29,097 cases (1.4 %); that is why "none" wastes
  98.6 % of its recomputations and why serving everything is right most of the time yet 32.7 % stale overall (a
  stale entry stays stale until it is replaced, and under "never" it is never replaced).
- Per question: 0 of the 250 questions ever served a stale answer under fact, fact_sem, cutoff or cutoff_sem (upper
  95 % bound 1.19 % of questions); 69 of 250 did under file, 71 under fact_pos, 99 under ttl5 and 105 under ttl20
  and never.
- No fact-level policy served a stale answer in any lane, so no dependency fix was needed and none was made. The
  recording had negative patterns from its first version; the extra row fact_pos shows what happens without them.
- "repo" never served: every one of the 189 steps changed at least one file.

### 3.1b Questions that never change, and the rates on the questions that do (from the audit)

Recomputed by the audit over every lookup of the tree lane (`AUDIT.md` section 6; its code `a5_spread.js`):

- 138 of the 250 questions of kinds 1-8 (55.2 %) never change their answer over the replay; 63 of them (25.2 % of
  all 250) are empty at every lookup. They account for 13,857 of the 29,097 lookups (47.6 %). By kind, the questions
  that never change are: setting_readers 27 of 31, change_reach 25 of 31, tests_reach 21 of 31,
  migrations_touch_table 21 of 32, screen_tables 19 of 31 (18 of them always empty), route_clients 13 of 32,
  other_half 11 of 31 and invariants_on_file 1 of 31. Finished-test questions: 23 of 50; generated questions: 115 of
  200. Completion: 6 of 100 never change, with a median of 22 distinct answers per question.
- Every policy, the stale control included, is never stale on the questions that never change, so they lift every
  hit rate without testing invalidation. Only 404 of the 29,097 lookups (1.39 %) fall at a change.

Rates on the 112 questions of kinds 1-8 whose answer changes at least once (15,240 lookups), beside the rates on all
250 (29,097 lookups) from section 3.1:

| Policy | Hit rate, changing questions | Stale per served, changing questions | Hit rate, all | Stale per served, all |
|---|---|---|---|---|
| file | 80.9 % | 13.2 % (1,632 stale) | 86.5 % | 6.5 % |
| fact_pos (extra) | 84.2 % | 13.6 % (1,750 stale) | 88.5 % | 6.8 % |
| fact | 82.5 % | 0 % | 87.6 % | 0 % |
| fact_sem (extra) | 93.8 % | 0 % | 95.9 % | 0 % |
| cutoff | 83.8 % | 0 % | 88.5 % | 0 % |
| cutoff_sem (extra) | 94.2 % | 0 % | 96.2 % | 0 % |
| ttl5 | 78.9 % | 7.9 % (949 stale) | 79.6 % | 4.1 % |
| ttl20 | 94.2 % | 23.0 % (3,297 stale) | 94.4 % | 12.0 % |
| never | 100 % | 62.5 % (9,520 stale) | 100 % | 32.7 % |

On the questions that never change (13,857 lookups) the hit rates are: file 92.6 %, fact_pos 93.3 %, fact 93.2 %,
fact_sem 98.2 %, cutoff 93.7 %, cutoff_sem 98.3 %, ttl5 80.3 %, ttl20 94.5 %, never 100 %, all with 0 stale. The
stale share of a non-safe policy therefore depends on the question mix: file level's 6.5 % overall is 13.2 % on the
changing questions.

### 3.2 Completion (ninth kind, 11,783 lookups)

| Policy | Hit rate | Stale served | Stale per served (upper 95 %) |
|---|---|---|---|
| file | 14.8 % | 22 | 1.26 % (1.80 %) |
| fact_pos (extra) | 9.3 % | 10 | 0.91 % |
| fact | 9.2 % | 0 | 0 % (0.27 %) |
| fact_sem (extra) | 19.0 % | 0 | 0 % (0.13 %) |
| cutoff | 24.5 % (2,881 of 11,783) | 0 | 0 % (0.10 %) |
| cutoff_sem (extra) | 24.5 % | 0 | 0 % (0.10 %) |
| ttl5 | 79.9 % | 3,936 | 41.8 % |
| ttl20 | 94.5 % | 7,215 | 64.8 % |
| never | 100 % | 10,544 | 89.5 % |

- The completion answer changed at 2,802 of 11,783 steps (23.8 %). Co-change edges are recomputed from history at
  every snapshot (their recency and confidence move with time), and the ranking reads the out-degree of every node
  it reaches, so a change anywhere in the connected graph can reorder the top files.
- Early cutoff helps here more than anywhere else: 1,793 of cutoff's served completion answers needed the ranked file
  list to be recomputed and found equal (6,228 sub-derivations were re-run in all). The cost is that the expensive
  part, the ranking, is re-run anyway; only the packing is skipped.

### 3.3 Per kind (hit rate; stale per served)

| Kind | Lookups | file | fact | fact_sem | cutoff_sem | ttl20 stale | never stale |
|---|---|---|---|---|---|---|---|
| screen_tables | 3,863 | 82.4 %; 0 % | 83.5 % | 93.5 % | 93.7 % | 9.3 % | 24.1 % |
| tests_reach | 3,497 | 90.9 %; 3.9 % | 90.3 % | 95.3 % | 95.3 % | 6.7 % | 36.4 % |
| invariants_on_file | 4,393 | 88.4 %; 30.7 % | 92.4 % | 94.1 % | 94.1 % | 28.4 % | 52.6 % |
| other_half | 3,343 | 76.1 %; 4.8 % | 75.8 % | 96.0 % | 97.3 % | 17.6 % | 52.6 % |
| setting_readers | 3,465 | 90.7 %; 0.7 % | 93.0 % | 95.2 % | 95.2 % | 2.5 % | 5.1 % |
| migrations_touch_table | 3,517 | 92.0 %; 1.1 % | 93.9 % | 98.9 % | 98.9 % | 10.1 % | 25.3 % |
| route_clients | 3,900 | 84.1 %; 3.1 % | 84.4 % | 98.0 % | 98.0 % | 13.5 % | 48.9 % |
| change_reach | 3,119 | 86.9 %; 1.4 % | 86.5 % | 96.6 % | 97.8 % | 3.1 % | 8.8 % |
| completion | 11,783 | 14.8 %; 1.3 % | 9.2 % | 19.0 % | 24.5 % | 64.8 % | 89.5 % |

- invariants_on_file is the worst case for file-level caching (30.7 % of served answers stale): before invariants
  were written into CLAUDE.md the answer was empty and rested only on the asked file, so the new `constrains` edges,
  whose evidence is in CLAUDE.md, were invisible to it for many steps.
- other_half and route_clients lose most to whole-record hashes (fact 75.8 % and 84.4 % against fact_sem 96.0 % and
  98.0 %): their answers read nodes in large backend files whose line numbers shift with unrelated edits.
- Wide dependency sets (hubs), medians over every fresh answer at every snapshot: completion is the only true hub kind
  (3,633 nodes, 8,319 edges, 3,167 patterns and 323 files per answer; maximum 6,027 nodes, 13,482 edges, 461 files).
  Among kinds 1-8 the widest is screen_tables (median 19 nodes, 21 edges, 39 patterns, 7 files; maximum 369 nodes,
  616 edges, 74 files), then tests_reach (17 nodes, 5 edges, 4 files) and other_half (12 nodes, 9 edges, 7 files);
  the narrowest are setting_readers and migrations_touch_table (median 3 nodes, 1 edge, 2 files).

### 3.4 Per runtime

- Kinds 1-8, fact level: backend 85.2 % of 16,623 lookups, web 94.7 % of 7,495, mobile 85.0 % of 4,979 served, all
  with 0 stale. File level served 768 stale answers in backend, 790 in web (mostly invariants_on_file) and 74 in
  mobile.
- Completion, fact level: backend 15.2 %, web 9.8 %, mobile 0 % served; with early cutoff 29.1 %, 26.0 % and 15.4 %.
- The "runtime" of a question is its anchor's runtime; several kinds have backend anchors only (section 2.2).

### 3.5 Dependency cases (where fact level can beat file level)

- Counted first, as the brief asked: 150 cases in 44 of the 189 steps (an answer changed between a snapshot and its
  tree parent although no file of the earlier answer's dependency set changed).
- Kinds 1-8: 134 cases. invariants_on_file 40 (24 questions, 6 steps), route_clients 32, other_half 28,
  tests_reach 14, change_reach 10, migrations_touch_table 6, setting_readers 4, screen_tables 0.
- Causes in kinds 1-8: 133 were a recorded query pattern gaining or losing a match (new `calls_url` or `calls` edges
  into a route or client function, new test calls, a new `constrains` edge, a new `migration_touches`, a new
  `reads_setting`); 1 was a recorded fact changing with its file unchanged (a route node id changed because the route
  prefix is set in another file).
- Completion: 16 cases, 11 caused by co-change edges recomputed from git history with no file content change, 5 by
  new edges.
- These 150 events are the source of the file policy's 1,632 + 22 stale serves: a stale entry is served again at
  every later step until one of its own files changes.

### 3.6 By age of the cached answer

Age is first-parent commits since the cached answer was computed. Hit rates by age are conditional on an entry having
survived that long under each policy (survival selection), so they rise with age and are not a decay curve.

| Age (commits) | fact hit, kinds 1-8 | fact_sem hit | never: stale per served | file: stale per served |
|---|---|---|---|---|
| 1 | 72.0 % | 85.4 % | 6.9 % | 1.8 % |
| 2 | 71.5 % | 86.1 % | 10.1 % | 1.6 % |
| 3-5 | 84.3 % | 93.0 % | 13.5 % | 2.9 % |
| 6-10 | 89.9 % | 95.7 % | 13.1 % | 3.3 % |
| 11-20 | 94.8 % | 97.0 % | 13.6 % | 2.3 % |
| 21-50 | 95.6 % | 97.8 % | 18.0 % | 5.4 % |
| 51+ | 97.6 % | 98.7 % | 48.7 % | 35.8 % |

For "never", the share of stale answers grows with age, from 6.9 % at 1 commit to 48.7 % at 51 or more commits.

### 3.7 Non-empty answers only (kinds 1-8)

20,349 of the 29,097 lookups had a non-empty fresh answer. On those: file served 83.5 % with 9.6 % of served answers
stale; fact 85.1 %, fact_sem 94.9 %, cutoff 86.2 %, cutoff_sem 95.3 %, all with 0 stale; ttl20 94.2 % with 17.2 %
stale; never 46.7 % stale. Per kind on non-empty answers, fact_sem ranged from 85.3 % (screen_tables) to 98.9 %
(migrations_touch_table).

### 3.8 How the result depends on the gap between snapshots

| Main-chain lane | Mean gap | fact | fact_sem | cutoff_sem | file (stale per served) | ttl20 (stale per served) | completion, fact |
|---|---|---|---|---|---|---|---|
| every snapshot | 1.57 commits | 85.9 % | 94.9 % | 95.2 % | 84.6 % (5.8 %) | 93.8 % (11.5 %) | 9.7 % |
| every 2nd | 3.14 | 76.7 % | 91.1 % | 91.7 % | 75.0 % (5.9 %) | 88.8 % (11.7 %) | 9.4 % |
| every 4th | 6.33 | 63.4 % | 84.4 % | 85.3 % | 61.4 % (6.5 %) | 77.5 % (10.8 %) | 8.8 % |
| every 8th | 12.67 | 46.5 % | 73.8 % | 75.1 % | 45.5 % (9.2 %) | 63.2 % (12.8 %) | 7.5 % |

Fact-level policies stayed at 0 stale in every lane. In the tree lane, steps of 1 commit gave fact 89.3 % and steps of
2 commits 74.5 % (25,536 and 2,038 lookups). ttl5 never serves at the 8-snapshot stride, where every gap exceeds
5 commits.

### 3.9 Cost of keeping the dependency index

- Size, measured at the frozen commit (bench run alone): 990 bytes of dependency arrays per question for kinds 1-8
  (245 KB for 247 questions) and 272 KB per completion question (25.9 MB for 95). Estimated from the median entries
  per answer over every fresh answer of the replay (13 bytes per fact, 8 per pattern or file), the median is about
  76 to 888 bytes per answer for kinds 1-8 (migrations_touch_table to screen_tables) and 183 KB for completion.
- Time, at the frozen commit: answering 247 questions of kinds 1-8 took 6.0 ms without recording, 11.3 ms with
  recording, plus 18.6 ms to turn the records into dependency arrays. The 95 completion questions took 1,346 ms
  without recording, 2,397 ms with it, plus 1,380 ms for the arrays. For these cheap deterministic answers, keeping
  the index costs more computer time than recomputing the answers.
- Validation, per snapshot over all 5 lanes and 350 questions (median, measured while two replays shared the
  machine): fact 0.31 ms, fact_sem 0.79 ms, file 0.41 ms, cutoff 3.75 ms; loading and hashing a snapshot 98 ms.

### 3.10 Token estimate (an estimate under one assumption; not a bound and not a saving)

Required wording from the finished test: a typed query returns the answer directly. The scripted search read a
median of 695 tokens of grep and file output to produce an answer of about the same size (held-out medians 694.5 and
31 tokens; means 1,903.6 and 59.9 tokens; the largest single search read 7,711 tokens). The typed side's own costs
are not counted: knowing the schema, writing the query, and the per-kind query programs written in advance.

Assumption: each served answer of kinds 1-8 replaces one scripted-search derivation, minus the answer tokens that a
served answer still costs to read. Under that assumption, the tokens avoided per 100 lookups, tree lane, priced three
ways (an earlier draft of these notes called the first column an upper bound; it is not one, because a median price
is not a maximum, `AUDIT.md` section 7):

| Policy | Median prices (694.5 - 31 tokens per hit) | Mean prices (1,903.6 - 59.9 per hit, from the audit) | Per-kind median prices | Stale answers served per 100 lookups |
|---|---|---|---|---|
| file | 57,377 | 159,436 | 181,534 | 5.6 |
| fact_pos (extra) | 58,752 | 163,257 | 186,639 | 6.0 |
| fact | 58,125 | 161,515 | 185,388 | 0 |
| fact_sem (extra) | 63,611 | 176,760 | 200,256 | 0 |
| cutoff | 58,722 | 163,175 | 191,451 | 0 |
| cutoff_sem (extra) | 63,807 | 177,305 | 200,533 | 0 |
| ttl5 | 52,789 | 146,687 | 167,574 | 3.3 |
| ttl20 | 62,603 | 173,959 | 198,828 | 11.3 |
| never | 66,350 | 184,370 | 210,793 | 32.7 |

- The three columns differ by a factor of about 3 because the measured search costs are skewed: a few questions read
  thousands of tokens. Pricing every hit at the largest single measured search (7,711 tokens) gives 675,511 tokens
  per 100 lookups for fact (audit); that is the same assumption at the most extreme measured price, not a measurement.
- All prices were measured once, at the frozen commit, on 30 held-out questions answered by a scripted search, not by
  an agent. Here they are applied to 250 questions at 190 snapshots.
- Against typed queries the same hits avoid 0 tokens: the typed query already returns an answer of the size of the
  cached answer.
- The per-kind prices rest on 3 to 4 held-out questions per kind (screen_tables 7,169 tokens read, setting_readers
  271), so that column is dominated by a few screen_tables and migrations questions.
- The completion kind has no measured derivation price and is left out.
- These answers are deterministic and cheap to recompute, so the case that could save many tokens, conclusions that
  cost a model many tokens to derive, is not tested here.

## 4. What this shows

- With negative dependencies recorded, fact-level invalidation served 87.6 % of lookups (95.9 % comparing only the
  fields read) with no stale answer, against the extractor's own facts, on this history and these 250 questions. On
  the 112 questions whose answer changes at least once the rates are 82.5 % and 93.8 %, still with no stale answer.
  An independent recomputation of all 40,880 warm tree-lane lookups agreed at every lookup (`AUDIT.md`).
- File-level invalidation and fact-level invalidation without negative dependencies each served stale answers in
  about 6.5 to 6.8 % of served answers (13.2 and 13.6 % on the changing questions), because what changes most answers
  here is a new relation in some other file, not an edit of the answer's own facts.
- More than half the questions (138 of 250) never change their answer over this history, and they make up 47.6 % of
  the lookups. Rates over all questions are therefore higher than rates on the questions that test invalidation.
- Whole-record fact hashes waste recomputation (88.8 % of fact's recomputations returned the same answer);
  read-field hashes remove most of that waste.
- A ranking over the whole connected graph cannot be cached usefully by any safe rule tested (9 to 25 % hit rate),
  and unsafe rules serve mostly stale rankings (42 to 90 %).
- The hit rate of safe rules falls with the gap between lookups: from 85.9 % at a mean gap of 1.6 commits to 46.5 %
  at 12.7 commits (fact), or 94.9 % to 73.8 % (fact_sem).
- Time-to-live is not a substitute for dependency tracking: at a hit rate close to fact_sem's (94.4 %) it served
  12.0 % stale answers (23.0 % on the changing questions).

## 5. What this does not show

- Nothing about an agent's or a model's tokens, turns or mistakes: no model and no agent ran.
- Nothing about caching conclusions that a model derives at great token cost; only cheap deterministic answers were
  cached.
- Nothing about how an agent would look things up. The replay scheduled every lookup itself: every live question at
  every snapshot. No agent decided whether or when to look something up, what to ask, or whether to trust a served
  answer.
- Not that fact-level invalidation is safe in general. Zero stale answers under the fact-level policies is what a
  correct recorder must give when a deterministic program reads the graph only through it: it is expected by
  construction. The replay shows that this recorder has no gaps for these nine programs, and that the completion
  kind's after-the-fact reconstruction of its reads is complete on this history. It does not carry over to
  conclusions a model draws from reads nobody records.
- Not hit rates on a mix of questions that all change: 55.2 % of the questions of kinds 1-8 never change, and 47.6 %
  of the lookups are of those questions (section 3.1b gives the rates on the changing questions).
- Not prices that hold for these questions: the per-kind token prices come from 3 or 4 held-out questions per kind at
  one commit, and the token figure is an estimate under one assumption, not a bound (section 3.10).
- Not the effect of the anchor rule: questions were drawn only from anchors that live in at least 20 consecutive
  main-chain snapshots, and that rule was not varied.
- Not correctness against the code: the ground truth is the same extractor's facts (design-check P15). An extraction
  error that persists across snapshots is invisible here.
- Not that the dependency recording is complete for other programs; zero stale holds for these nine programs on this
  history.
- Not a temporal knowledge graph, validity intervals, model-extracted facts, documents read by a model, graph type,
  or a graph database: the store here is an in-memory graph over the finished test's parser-built snapshots.
- Not traversal caching inside one query, uncommitted working-tree edits, or caching within one session.
- Not a hit rate a real workload would see: every live question was asked at every snapshot.
- Not other repositories, larger graphs or other change rates (about 155 first-parent commits on main over 9 weeks).

## 6. Sentences that must not be said about this lane

- "Caching with invalidation saves tokens", or "caching does not help". No tokens were measured; the answers cost
  almost nothing to recompute.
- "Fact-level invalidation is proven safe" or "never serves a stale answer". Zero stale is against the extractor's
  own facts, for nine programs, on one repository's history.
- "The cache saves about 58,000 tokens per 100 lookups", or "avoids at most about 58,000", or any token saving. That
  figure is an estimate at median prices under the assumption that every hit replaces one scripted-search
  derivation; it is not a bound (mean prices give about 161,500 and per-kind prices about 185,400), nothing was
  measured, and against typed queries it is 0.
- "The cached answers are correct about the code." The truth is the same extractor's facts.
- "Fact-level invalidation never serves a stale answer" in general: for programs whose every read is recorded, zero
  stale is expected by construction.
- "File-level caching serves 6.5 % stale answers" as a general rate: it is 13.2 % on the changing questions here.
- "Removed tests defeat file-level caching": in the audit's hand-built case the removed test's own file was in the
  dependency set.
- "The main-chain lanes, the age table and the gap table were independently verified": the audit did not recompute
  them.
- "All side-branch snapshots were merged into main": 90 of 91 were.
- "Typed queries plus a cache answer questions 20 times cheaper", or "31 against 695 tokens is a session saving".
- "Early cutoff makes cached model conclusions cheap to keep fresh". Only deterministic answers were tested.
- "A graph database, a knowledge graph or a temporal knowledge graph was tested here."
- "File-level caching is unsafe in general". Its 6.5 % stale share holds for these questions, which include
  "nothing else" questions by design, on this history.
- "An agent would see a hit rate of 87.6 % (or 95.9 %)". Every question was asked at every snapshot (the replay
  imposed the schedule), 47.6 % of the lookups are of questions that never change, and both the empty-answer share
  and the gap between lookups move the rate.
- "Hub questions cannot be cached". The completion kind cached poorly because it rests on the whole graph; a bounded
  or smaller-budget form was not tried.
- The finished test's own lists still apply (build-e/result.json, build-f/engines_checked.json, widen/result.json).

## 7. Problems, deviations and limits

- Questions (b) were drawn from all snapshots, not from the first snapshot graph (section 2.2).
- 91 of 190 snapshots are off main's first-parent chain; they are replayed through the first-parent ancestry tree,
  and main-chain-only lanes are reported separately (section 2.1). One of the 91 (`8dafcecc7f`) is on a branch that
  was never merged.
- The first version of these notes called the token figure an upper bound, left out the share of questions that
  never change, said all 91 side-branch snapshots were merged, and rounded two rates twice (88.6 % for 88.548 %,
  24.4 % for 24.45 %). These were corrected after the audit; no measured number changed.
- The runtimes could not be balanced for kinds whose anchors exist in one runtime only (section 2.2).
- Many fresh answers are empty; non-empty-only rates are in section 3.7.
- The first pair of runs used slightly older code; the reported pair was re-run with the final code (section 2.6).
- Replay timings were taken with two replays running at once; the index bench was run alone, at one commit only.
- Fact hashes are 32-bit FNV-1a: a collision would hide a change, with a chance of about 2.3 in 10 billion per changed
  fact; this was not otherwise guarded.
- The stale upper bounds per served answer assume independence; the per-question count (0 of 250) is the safer
  reading.
- Token prices per kind rest on 3 to 4 held-out questions each.

## 8. Reproduce

In `C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/k0`
(Node 24; reads the finished test's build tree and the repository read-only; copies of the reference, relational and
common code are in `lib/` with their hashes in `lib/COPIED_SHA256.txt`):

```
node chain.js && node tree.js && node gen.js
node check_frozen.js && node crosscheck.js 40 && node check_completion.js 40
node --max-old-space-size=8192 replay.js out/final1
node --max-old-space-size=8192 replay.js out/final2
node report.js out/final1 && node nonempty.js out/final1 && node bench_index.js && node finalize.js
```

The full replay takes about 6.5 minutes; most of it is the 100 completion rankings at each of 190 snapshots.
