# Audit of the K0 cache replay (2026-11-13)

This audit recomputes the headline numbers of the K0 cache replay (`NOTES.md` and `result.json` beside this file)
with code written for the audit, and tests its claims. No model was called and no agent ran, here or in the replay.
The audit's code and raw outputs are in
`C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/k0-audit`
(one script per check, `a1_order.js` to `a7_log.js`, each writing a `.json` file of the same name).

## 1. Verdict

- Checks 1 to 4 hold. The snapshot order is the real commit order and nothing is used out of order; an independent
  recomputation of the true answer agrees with the replay at every one of its 40,880 warm lookups, so the replay's
  stale counts are right (0 for the four fact-level policies, 20,064 for the stale control "never"); the truth is
  recomputed from each snapshot; and seven hand-built dependency cases behave as the notes say.
- Three things need correcting in the notes. (a) The token figure "at most about 58,100 tokens per 100 lookups" is
  not an upper bound: it prices each hit at the median cost of a scripted search, and the notes' own per-kind prices
  give 185,388 tokens per 100 lookups. (b) The notes do not report that 138 of the 250 questions of kinds 1 to 8
  (55.2 %) never change their answer over the replay, and that 47.6 % of the lookups behind the headline rates are of
  those questions. (c) One of the 91 side-branch snapshots was never merged, although the notes say all were.
- The list "what this does not show" (notes section 5) covers model-made conclusions and cheap deterministic answers,
  but should say two more things plainly: the lookups were scheduled by the replay, with no agent choosing what to look
  up, when, or whether to trust a served answer; and zero stale answers is what a correct recorder must give for a
  deterministic program whose every read it sees. It tests the recorder's code, not something that carries over to
  conclusions a model draws from reads nobody records.

## 2. Check 1: snapshot order (holds)

Method (`a1_order.js`): one read-only `git log --all --format="%H %ct %P"` gave every commit's parents. From that,
the audit walked first parents itself, without the replay's `rev-list --first-parent` calls.

- All 190 snapshot folders are commits of the repository. All carry extractor version `59da7b753a4d908e`, and the
  commit time in each `meta.json` equals git's committer time.
- The audit's tree, where each snapshot's parent is its nearest cached ancestor along its own first-parent chain,
  agrees with the replay's `tree.json` for all 190 snapshots, gap included. There is 1 root, 189 steps and 29 branch
  points. The gap histogram is the same: 159 steps of 1 commit, 18 of 2, 5 of 3, 3 of 4, 3 of 6 and 1 of 7. For
  every one of the 189 tree edges, `git merge-base --is-ancestor` confirms the parent is an ancestor of the child,
  and in no case is the parent's committer time later than the child's.
- Main's first-parent chain, taken from the replay's recorded main `34f1dcd` (161 commits long), holds 99 snapshots
  in the same order as `chain.json`. Every main-chain snapshot's tree parent is the previous main-chain snapshot
  (98 of 98). Today's main (`c392cf8`) has moved on, but `34f1dcd` is on its first-parent chain.
- Use order: in the replay's per-lookup log, each snapshot's lookups form one contiguous block (188 of 188). Each
  snapshot's nearest logged ancestor comes before it (188 of 188; the root has no live question and no rows). In
  the replay's depth-first order, each main-chain lane's predecessor is processed before its successor: 98 of 98,
  49 of 49, 24 of 24 and 12 of 12 for strides 1, 2, 4 and 8. The code copies each lane's cache from the tree parent
  into a new map at every step, and replaces entries rather than editing them in place (`replay.js` lines 174-177,
  239 and 257). So sibling branches never see each other's entries.
- Correction: 90 of the 91 side-branch snapshots are ancestors of main `34f1dcd`. One, `8dafcecc7f`, is not: it
  is a leaf of the tree (tree parent `1c546a3106`, gap 1 commit) on a branch that was never merged, and it
  accounts for 342 logged lookups. The notes say all 91 are "on side branches that were merged". The
  difference does not affect the order check.

## 3. Check 2: the true answer recomputed with the audit's own code (holds)

Method (`a2_truth.js`, `a2_truth_all.js`):
- Loader: the audit's own `myload.js` builds the canonical graph from `nodes.jsonl` and `edges.jsonl`. It does not
  use the replay's `load.js`.
- Kinds 1 to 8: the finished test's original SQL question programs (`arms/relational/tq.js`, copied unchanged;
  sha256 identical to the build tree's files, listed in `arms_copied_sha256.txt`) ran over an in-memory SQLite store
  built by the audit. The replay itself uses JavaScript ports of these programs.
- Kind 9, completion: the original reference arm (`ref.js`) and the shared packer, driven by the audit's own code.
- Served answers: each policy's code letter comes from the replay's per-lookup log. A served answer is the answer
  stored at the nearest earlier lookup on the same tree path where that policy computed or recomputed. The audit
  recomputes that stored answer at its own snapshot.

Results:
- Seeded sample (seed 777001): 499 (question, step) pairs. 260 were drawn uniformly from the warm lookups of kinds
  1 to 8, 140 from lookups where some policy saw a change, and 99 were completion lookups (one duplicate dropped).
  Every policy's hit or stale verdict agreed with the recomputation, as did every recomputation's "same" or
  "changed" verdict. Stale serves found by the audit in this change-weighted sample: file 31 of 346 served,
  fact_pos 34 of 347, ttl5 57 of 388, ttl20 145 of 479, never 316 of 499. The four fact-level policies served
  0 stale answers (fact 339 served, fact_sem 392, cutoff 362, cutoff_sem 399).
- Then every warm lookup of the tree lane: 40,880 lookups, of which 29,097 are of kinds 1 to 8 and 11,783 are
  completion, at 189 snapshots. The recomputation took 102 seconds. There were 0 disagreements. Stale serves found
  by the audit: file 1,654, fact_pos 1,760, ttl5 4,885, ttl20 10,512, never 20,064, and 0 for fact, fact_sem,
  cutoff and cutoff_sem. These equal the notes' figures for kinds 1 to 8 plus completion (for example, file
  1,632 + 22 and never 9,520 + 10,544). The replay's "answer changed since the previous lookup" flag agreed at all
  40,880 lookups (3,206 changes: 404 in kinds 1 to 8 and 2,802 in completion).
- Recounted from the verified log (`a7_log.js`), kinds 1 to 8: fact served 87.6 % (25,490 of 29,097), fact_sem
  95.9 %, cutoff_sem 96.2 %, file 86.5 % with 6.49 % of served answers stale, fact_pos 88.5 % with 6.79 % stale,
  ttl20 94.4 % with 12.01 % stale, never 32.72 % stale. Questions with at least one stale serve: 0 of 250 under the
  fact-level policies, 69 under file, 71 under fact_pos, 99 under ttl5, 105 under ttl20 and never. Completion: fact
  9.2 % (1,088 of 11,783), cutoff 24.45 % (2,881), file 14.8 % with 22 stale. Two figures in the notes are rounded
  slightly differently (fact_pos 88.6 % for 88.55 %, completion cutoff 24.4 % for 24.45 %); nothing else differs.
- What this independence covers: the loader, the driver and the reconstruction of what was served are the audit's
  own. For kinds 1 to 8 the programs differ from the replay's JavaScript ports. For completion they are the same
  reference code. A mistake shared with the finished test's own question programs, about what a question means,
  would not show.
- Not reconstructed: the four main-chain lanes, which are not in the per-lookup log, and the tables by age and by
  gap. Their zero-stale aggregates for the fact-level policies are in `replay.json`, but the audit did not recompute
  them.

## 4. Check 3: the truth is recomputed at each snapshot, not cached (holds)

`replay.js` computes the truth with `computeTruth(S, q)`: a new recorder over `new Snap(sha)`, read from that
snapshot's own files, for every live question at every snapshot. The only memos are tied to one snapshot object:
the ranking graph `snap._ref` and the packer's `G._defsByPath`. Three results back this up empirically. The
independent recomputation matched every lookup. The change flags agreed. And the answers really do vary over the
history: 3,206 changes, and a median of 22 distinct completion answers per question.

## 5. Check 4: hand-built dependency cases (holds)

Method (`a4_cases.js`): the frozen commit's snapshot was copied and changed by hand. Blob ids were changed only for
the files each change touches. The answer and its dependency record were computed at the base with the replay's own
recorder and programs. The replay's validity rules, copied verbatim from `replay.js`, were then applied to the
changed snapshot.

| Case | Question | Changed file in the answer's dependency set? | file | fact_pos | fact, fact_sem, cutoff, cutoff_sem | never |
|---|---|---|---|---|---|---|
| 1 new caller (new file) of a route's call site | tq7 route_clients | no | served stale | served stale | recomputed (needed) | served stale |
| 2 new reader of a setting (new file) | tq5 setting_readers | no | served stale | served stale | recomputed (needed) | served stale |
| 3 new route (new router file) registers an existing handler | tq8 change_reach | no | served stale | served stale | recomputed (needed) | served stale |
| 4 removed test (its test file deleted) | tq2 tests_reach | yes | recomputed (needed) | recomputed | recomputed | served stale |
| 4b helper in another file stops calling the target | tq2 tests_reach | yes | recomputed | recomputed | recomputed | served stale |
| 5 route id renamed by a prefix set in another file (main.py) | tq7 route_clients | no | served stale | recomputed (node vanished) | recomputed | served stale |
| 5b caller symbol renamed in its own file | tq7 route_clients | yes | recomputed | recomputed | recomputed | served stale |

In every case the answer changed. The fact-level policies recomputed every time, file-level served stale exactly
when the change lay outside the dependency set's files, and fact_pos served stale exactly when only a query pattern
gained a match. That matches the notes. One nuance: a removed test is caught by file-level invalidation, because the
test's own file is in the dependency set. Only new relations, and renames caused from another file, get past it. The
cases are synthetic: in case 5 the audit dropped the client `calls_url` edges to the old route id, whereas a real
extractor might point them at the new id.

## 6. Check 5: spread of the questions, and the questions that never change (spread holds; static share missing)

- The question set matches the notes (`a5_spread.js`, `a5b_exists.js`). There are 50 finished-test questions, 200
  generated (25 per kind) and 100 completion files (34 backend, 33 web, 33 mobile). The runtime split per kind
  equals the notes' table. No generated anchor is an anchor of the 50. All 300 generated and completion anchors exist
  in at least 20 consecutive main-chain snapshots; the audit recomputed the run lengths from the node files and
  agreed for 350 of 350. The recorded snapshots where each anchor exists agree for 349 of 350; the remaining one
  (tq41) is a config-name anchor the audit's check does not read.
- Not reported in the notes: the share of questions whose answer never changes, measured over every lookup of the
  tree lane with the audit's recomputed answers.
  - Kinds 1 to 8: 138 of 250 questions (55.2 %) never change. 63 of those (25.2 % of all 250) are empty at every
    lookup. They account for 13,857 of the 29,097 lookups (47.6 %). By kind, the questions that never change are:
    setting_readers 27 of 31, change_reach 25 of 31, tests_reach 21 of 31, migrations_touch_table 21 of 32,
    screen_tables 19 of 31 (18 of them always empty), route_clients 13 of 32, other_half 11 of 31 and
    invariants_on_file 1 of 31. Finished-test questions: 23 of 50. Generated questions: 115 of 200.
  - Completion: 6 of 100 never change, with a median of 22 distinct answers per question.
  - Every policy, the stale control included, is never stale on these questions, so they lift hit rates without
    testing invalidation. Only 404 of the 29,097 lookups (1.39 %) fall at a change.
- On the 112 questions of kinds 1 to 8 whose answer changes at least once (15,240 lookups):
  - fact-level policies, all with 0 stale: fact 82.5 %, fact_sem 93.8 %, cutoff 83.8 %, cutoff_sem 94.2 %
  - file: 80.9 %, with 13.23 % of served answers stale (twice the headline 6.49 %)
  - fact_pos: 84.2 %, with 13.63 % stale
  - ttl20: 94.2 %, with 22.97 % stale
  - never: 62.47 % stale

## 7. Check 6: the token figure (labelled a bound, prices measured, but not an upper bound)

Method (`a6_tokens.js`): the prices were recomputed from the finished test's held-out answer files (30 questions,
`results/heldout/tq/search.answers.jsonl` and `relational.answers.jsonl`).

- The prices are the measured ones. The scripted search read a median of 694.5 tokens per answer (mean 1,903.6,
  maximum 7,711); the typed answer had a median of 31 tokens (mean 59.9). The notes' per-kind medians (for example
  screen_tables 7,169 tokens and setting_readers 271) match, each over 3 or 4 questions.
- The figure is labelled a bound, and against typed queries the notes correctly give 0 tokens. Nothing unmeasured
  is called a saving.
- But "at most about 58,100 tokens per 100 lookups" (notes sections 1 and 3.10, and section 6's "That is an upper
  bound") is not an upper bound. It multiplies each hit by the median price, and a median is not a maximum. The
  same hits priced differently:
  - per-kind medians: 185,388 tokens per 100 lookups (in the notes' own table)
  - the overall means: 161,515 tokens per 100 lookups (1,903.6 minus 59.9 tokens per hit)
  - a true upper bound from the largest measured search: 675,511 tokens per 100 lookups (7,711 tokens per hit)
- All of these prices were measured once, at the frozen commit, on 30 held-out questions answered by a scripted
  search. They are applied here to 250 questions at 190 snapshots. The correct wording is "an estimate at median
  prices, under the assumption that every hit replaces one scripted-search derivation". It is not a bound and not
  a measured saving.

## 8. Check 7: is the "does not show" list complete? (mostly; three additions needed)

Already present in the notes: no model or agent ran; caching of conclusions a model derives at great token cost is
untested; the deterministic answers are cheap to recompute (sections 1, 3.9, 3.10 and section 5's second bullet);
the truth is the extractor's own facts; no temporal knowledge graph, graph database or traversal caching was tested;
the hit rate is not a workload's; one repository.

Should be added:
1. The lookups were scheduled by the replay: every live question at every snapshot. No agent decided whether or when
   to look something up, what to ask, or whether to trust a served answer.
2. Zero stale answers under the fact-level policies is what a correct recorder must give when a deterministic program
   reads the graph only through it. The replay shows that this recorder has no gaps for these nine programs, and that
   the completion kind's after-the-fact reconstruction of its reads is complete on this history. It does not carry
   over to conclusions a model draws from reads nobody records.
3. 55.2 % of the questions of kinds 1 to 8 never change, and 47.6 % of the lookups are of those questions. On the
   changing questions the rates are those in section 6 above.

Also worth stating: the per-question cost prices come from 3 or 4 held-out questions per kind at one commit.
Questions were only drawn from anchors that live at least 20 consecutive main-chain snapshots, and that rule was not
varied.

## 9. Claims of the notes, with results

| Claim (notes) | Result | Detail |
|---|---|---|
| fact: 87.6 % of 29,097 lookups served, 0 stale | survives, with a qualification | All 29,097 recomputed independently; 0 stale. 47.6 % of these lookups are of questions that never change; on changing questions the rate is 82.5 %. |
| fact_sem 95.9 %, cutoff_sem 96.2 %, 0 stale | survives | Recomputed. |
| file 86.5 %, 6.5 % of served stale (1,632, 69 questions) | survives, with a qualification | Exact. On changing questions it is 13.2 % stale, so the share depends on the question mix. |
| fact_pos 6.8 % stale | survives | 6.79 %; its hit rate is 88.55 %, which the notes round to 88.6 %. |
| Stale serves come from new relations outside the answer's files; 133 of 134 cases are pattern changes, 1 is a route prefix | survives, with a qualification | Read from the replay's own dependency records (133 + 1, none unexplained), not recomputed; the hand-built cases agree. |
| Completion: changed at 23.8 % of steps; fact 9.2 %; cutoff 24.4 % | survives | 2,802 of 11,783; 1,088; 2,881 (24.45 %). |
| ttl20 94.4 % with 12.0 % stale; never 32.7 % stale | survives | Recomputed. |
| Token figure "at most about 58,100 per 100 lookups" | refuted as an upper bound | It uses median prices. Per-kind prices give 185,388 and mean prices 161,515; the measured maximum gives 675,511. |
| Against typed queries a hit avoids 0 tokens | survives | |
| 190 snapshots, 99 on main, a tree with 1 root, 189 steps, 29 branch points, the gap histogram | survives | Recomputed from git independently. |
| The 91 off-chain snapshots are on side branches that were merged | needs qualification | 90 of 91; `8dafcecc7f` was never merged. |
| The question set and its spread (table in section 2.2) | survives | Recomputed; the static share is unreported (section 6 above). |
| JS ports equal the SQL programs (50 of 50, and 6,177 of 6,177) | survives, and is extended | The SQL programs agreed with the replay at all 29,097 lookups of kinds 1 to 8. |
| Determinism (identical sha256 of the two runs) | survives | `replay.json` 328e46b5...; the decompressed lookup log e85112c0...; both identical in final1 and final2. |
| Index cost (6.0 ms answering without recording, 11.3 ms with it, plus 18.6 ms to build the arrays) | survives as reported | Read from `bench_index.json`; not re-measured. |
| Main-chain lanes, and hit rates by gap and by age | not checked | Not in the per-lookup log, so not reconstructed. |
| What this does not show (section 5) | needs qualification | Add the three items in section 8 above. |

## 10. Sentences that may not be said about this replay

- "Fact-level invalidation is proven safe" or "never serves a stale answer". Zero stale holds against the extractor's
  own facts, for nine fixed programs, on one history. For programs whose every read is recorded, it is expected by
  construction.
- "The cached answers are correct about the code." The truth is the same extractor's facts.
- "The cache avoids at most about 58,000 tokens per 100 lookups", or any token saving. That figure is not a bound
  (median prices), and nothing was measured.
- "Caching with invalidation saves tokens", or "caching does not help".
- "An agent would see an 87.6 % (or 95.9 %) hit rate." Nearly half the lookups are of questions that never change,
  and the replay imposed the lookup schedule.
- "File-level caching serves 6.5 % stale answers" as a general rate. It is 13.2 % on the changing questions here, and
  it depends on the question mix.
- "Removed tests defeat file-level caching." In the hand-built case, the removed test's own file was in the
  dependency set.
- "The audit verified the question programs' meaning independently." It used the finished test's own SQL programs
  and reference code.
- "The main-chain lanes, the age table and the gap table were independently verified."
- "All side-branch snapshots were merged into main."
- "A graph database, a knowledge graph, a temporal knowledge graph or traversal caching was tested."
- "Early cutoff makes cached model conclusions cheap to keep fresh."
- The finished test's lists still apply: `build-e/result.json` (refute:claims, refute:discipline),
  `build-f/engines_checked.json` and `widen/result.json` (refuter, designCheck).

## 11. Not done

- The main-chain lanes, the tables by age and by gap, and the dependency-size medians were not recomputed.
- Timings (replay and index bench) were read from the replay's files, not re-measured.
- The completion check against the 40 held-out T1 records (notes check 3) was not re-run, although the audit's
  completion recomputation agreed with the replay at all 11,783 lookups.
- Name anchors (one question, tq41) were not covered by the existence check.
