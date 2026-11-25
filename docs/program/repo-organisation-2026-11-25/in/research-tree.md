# Reader table: research-tree/ (2026-11-25, branch top9/track-plan)

Totals: tracked 7,888 (`git ls-files research-tree | wc -l`), untracked 941 files (`git ls-files -o --exclude-standard research-tree`;
`git status` shows only about 63 lines because it folds untracked folders), changed-tracked 4 (build/ENFORCEMENT-TABLE.md,
build/RUN-BIG-STATE.md, build/landings.jsonl, lane/log.jsonl). Sum of the rows below: 7,888 + 941 = 8,829.
**Nothing under research-tree/ is on main**: `git ls-tree -r main -- research-tree` gives 0 files, so every tracked file is `not on main`.
MB are from `git ls-tree -l HEAD` (tracked) and `du` (untracked). Proof ids are from `library/INDEX.md` lines 67-100 and 150-153.
In the "files" column "T+U" = tracked + untracked.

| path | files | MB | what it is | class | proof | loaded by | state in git | note |
|---|---|---|---|---|---|---|---|---|
| research-tree/*.md (START-HERE, SELECTIONS-MAP, DESIGN-RECORD, ATTACK-AND-COST-RECORD, FIX-VS-SELECTIONS, BUILD-SIZE, BUILD-PLAN, ORCHESTRATION, CONTRACT, FAULTS-AND-FIXES, RULINGS) | 11 | 0.3 | Board and digests of the tree's design, build size and orchestration | DESIGN | START-HERE.md:9-19: design v2, scripts built, "Not done: pilot, first run" | CLAUDE.md and memory name START-HERE; hooks cite ORCHESTRATION.md in comments only | not on main (11) | digests by small readers, "not checked row by row" (START-HERE.md:5) |
| research-tree/tmp-witness-r1.txt, tmp-join-U2b-tms.txt, review-lib-run1.txt | 3 | 0.02 | Pasted node test-runner output (witness, join, lib tests) | SCRATCH | head of each is a test log; `git grep` finds no reference | nothing | not on main (3) | tmp-witness-r1 shows failing lines |
| research-tree/model/ top files (model.mjs, check.mjs, configs*.mjs, run-all.mjs, run-resumable.mjs, show.mjs, ladder*, 3 .md) | 13 | 0.14 | Hand-written protocol model and model checker (plain Node) | WORKS-TESTED | model/README.md:1-25; checker found failing traces (results/SUMMARY.md) | nothing | not on main (13) | run-all.mjs produces results/ |
| research-tree/model/as-built/ | 45 | 1.28 | Fix designs FIX-fence/wake/JOIN, failing traces CEX-*, ablations | DESIGN | START-HERE.md:20-26 names FIX-*.md and CEX-*.md; thirteen fixes designed from it | nothing | not on main (45) | fixes later built in tcb/ on branch build |
| research-tree/model/results/ | 5,179 | 20.61 | Model-checker output: 5,164 .json (one per config part), .err, SUMMARY, DIGEST, ladder.log | GENERATED | results/SUMMARY.md:5-7: 5,154 of 5,163 parts complete, 9 bounded, 3.43 G states | nothing | not on main (5,179) | 75 config folders; largest run-tier-500.out 0.53 MB; made by `node model/run-all.mjs` |
| research-tree/model/results-ladder/ | 154 | 0.66 | Same checker, groups 1-5 rerun with all cores | GENERATED | model/RUN-LADDER.md:1-12 | nothing | not on main (154) | by ladder.sh / ladder2.sh |
| research-tree/model/results-as-built/ | 120 | 1.14 | Checker output on the as-built scripts | GENERATED | folder names asbuilt-fence/* | nothing | not on main (120) | |
| research-tree/model/results-build/ | 78 | 0.70 | Checker output for later fix variants (AGE-B etc.) | GENERATED | file names AGE-B*.json/.err | nothing | not on main (78) | not read further |
| research-tree/tcb/ (scripts, schemas, profiles, settings, agents, briefs; no fixtures, no test) | 126 | 1.23 | The trusted scripts of the tree: admit, commit, gate, render, lib, schemas | WORKS-TESTED | r57-0101: 965 pass, 0 fail, 53 skipped, e2e 232 of 232; r57-0172: suite 6 1,037 pass; t1-0114 "the tree never ran" | no settings.json hook runs tcb; tcb files read build/plan.json themselves | not on main (126) | 20,560 lines, 31 stages (START-HERE.md:12) |
| research-tree/tcb/test/ | 29 | 1.67 | Unit tests of the scripts | WORKS-TESTED | r57-0101; build/suites/ logs | run by build/tools/suite.sh | not on main (29) | |
| research-tree/tcb/fixtures/ | 629 | 0.31 | Small input cases for the tests (case.json folders) | WORKS-TESTED | used by tcb/test | tests only | not on main (629) | tiny files |
| research-tree/spec/ | 26 | 0.38 | One spec per tcb script (admit.mjs.md ...) | DESIGN | file names mirror tcb/*.mjs | nothing | not on main (26) | specs written before the build |
| research-tree/done/ | 103 | 0.75 | Build-time hand-back JSON/markdown of units (closing, fix-U*, e2e-build, first-run) | WORKING | `ls done`: ARGS.json, closing/, fix-U1.json | nothing | not on main (103) | finished build round |
| research-tree/e2e/ | 4 | 0.10 | End-to-end script and last result | WORKS-TESTED | e2e/last-result.json "failures": []; r57-0101 232 of 232 | nothing | not on main (4) | run-e2e.mjs |
| research-tree/inputs/ | 14 | 0.34 | Layer inputs handed to the build (HARNESS-FACTS, layer-L1..L4, files.json) | WORKING | `ls inputs` | nothing | not on main (14) | |
| research-tree/notes/ | 9 | 0.35 | R57 round notes, r3 changes, r3 coordination, rejected decision sheet | WORKING | notes/r3-changes.md:1; START-HERE "Do not use" the decision sheet | nothing | not on main (9) | decision sheet rejected by owner |
| research-tree/probes/ | 18 | 0.04 | Hook probe and observations of the coordinating session | RECORD | probes/coordinator-observations.md:1; hook-probe/hook-log.jsonl | nothing | not on main (18) | evidence of app behaviour (r57-0105) |
| research-tree/tools/ | 18 | 0.15 | lane.mjs, land.mjs, recorder, av-watch, coordinator one-off scripts | WORKS-TESTED | r57-0127: lane queue 2 slots, 780 commands measured; land.test.mjs | lane.mjs reads lane/capacity.txt (tools/lane.mjs:43); record-guard.mjs:679 names lane.mjs | not on main (18) | coordinator/*.js are one-offs |
| research-tree/lane/ | 3 | 1.96 | Lane capacity file, command log, recorder log | RECORD | r57-0127; r57-0134 recorder last line 17 Nov | capacity.txt and log.jsonl by tools/lane.mjs | not on main (3); 1 changed | recorder.log 1.53 MB; log.jsonl modified |
| research-tree/build/ top files, tracked (STATE, TOP-STATE, TOP8/9-STATE, WIDTHS, plan.json, landings.jsonl, usage.jsonl, plans, -v1 plans) | 31 | 0.80 | State files, width and plan files, plans of the pilot and the owner's track | WORKING | build/TRACK-PLAN.md:1-7 plan, "Nothing in this file is started" | count-gate.mjs:47 WIDTHS.md; plan-gate.mjs:33-34 plan.json, STATE.md; window-ceiling.mjs:240 *state.md; fanout-gate.mjs:128, owner-report.mjs:64 scan build/*.md | not on main (31); 3 changed | COMPLEXITY/FAULTS/LOCKS/ROUTER/UNATTENDED -v1 replaced by v2 |
| research-tree/build/ top files, untracked (IMPROVE-STATE, REPO-ORG-STATE, RUST-L1-STATE, RUST-PREP-STATE, TOP-REVIEW-STATE) | 5 | 0.03 | Session state files of current rounds | WORKING | `ls build` | window-ceiling.mjs:240 and fanout-gate.mjs:128 read *state.md here | uncommitted (5) | |
| research-tree/build/briefs/ | 74 + 11 | 0.33 + ~0.1 | Briefs given to helpers of finished and current units | WORKING | `ls build/briefs` | fanout-gate.mjs:7, window-ceiling.mjs:241 (briefs/*.md); creep-gate.mjs:88 | 74 not on main; 11 uncommitted | |
| research-tree/build/units/ | 132 + 9 | 0.87 + ~0.1 | Result.md of each build unit (T8-COUNT, P0, PA...) | WORKING | `ls build/units` | window-ceiling.mjs:242 (units/ pattern) | 132 not on main; 9 uncommitted (PA, PA2, PB, PB2, PC, PC2, PT) | hooks cite units/T8-COUNT/result.md in comments |
| research-tree/build/refute/ | 26 + 11 | 0.27 + ~0.1 | Blind refute reports on units and plans | WORKING | e.g. refute/P0-GATE.md cited by record-guard.mjs:2 | nothing (comments only) | 26 not on main; 11 uncommitted | breaking findings fixed per r57-0172 |
| research-tree/build/landings/ | 217 + 85 | 2.58 + ~1 | One folder per merge of a unit into build (land.mjs output) | GENERATED | made by tools/land.mjs; r57-0166 to 0169 | nothing | 217 not on main; 85 uncommitted | 2026-11-19 to 11-24 |
| research-tree/build/departures/ | 18 + 3 | 0.07 | Departures from the orchestration plan per unit | WORKING | `ls build/departures` | nothing | 18 not on main; 3 uncommitted | |
| research-tree/build/facts/ | 207 | 1.31 | Slice-0 facts about the app and files (FP12, S0.1c, S2.3) | RECORD | facts/FP12.md:1-5 (hard-link test, nlink 2) | nothing | not on main (207) | measured on this PC |
| research-tree/build/check/ | 13 | 1.33 | Checks A-G: hooks, documents, capacity, tokens per kind of session | RECORD | check/E-tokens.md:1 over 3,622 transcripts; r57-0175 meter weights | nothing | not on main (13) | tokens-transcripts.csv 0.72 MB |
| research-tree/build/suites/ | 54 | 1.80 | Logs of the tcb test suite runs 1 to 6 | RECORD | r57-0103: one run 596 s; r57-0172 suite 6 1,037 pass | nothing | not on main (54) | others.log 0.28 MB each |
| research-tree/build/replays/ | 426 + 10 | 4.83 + ~0.2 | Seven replays of earlier sessions scored against changed rules | RESULT-NEGATIVE | replays/JUDGE-REPLAYS.md:1; board: cache lapses 16.3 % of fresh tokens, helper waits 46.2 M; L11, L8, L6 "do not pilot" in the form tried | nothing | 426 not on main; 10 uncommitted | mixed: some plain measures, three forms negative; replay-L24/flagged.json 0.97 MB |
| research-tree/build/research-run/ | 39 | 0.19 | Briefs, GO, downloads, hook settings for the widened research run | WORKING | JUDGE-HANDBACK.md:1-8; r57-0180: round 60.1 M tokens | nothing | not on main (39) | the run itself is in C:/research-runs, outside the repo |
| research-tree/build/top9/ | 37 | 0.31 | Top session 9 work: track digest sources, briefs, log | WORKING | `ls build/top9` | nothing | not on main (37) | |
| research-tree/build/reports/ | 10 | 0.18 | Helper reports (fx-w6, pilot-plan, complexity) with HTML pages | WORKING | `ls build/reports` | nothing | not on main (10) | pages for the owner |
| research-tree/build/tree/, page/, pages/, apply/, tools/, locks/ (tracked) | 6+5+1+5+3+2 = 22 | 0.57 | Run-tree drawings, owner pages, apply notes, suite.sh / landtests.sh / tokens-self.mjs, locks research | WORKING | `ls` of each | scripts run by hand; no hook reads them | not on main (22) | tools/tokens-self.mjs counts tokens (PILOT-PLAN.md) |
| research-tree/build/tree/ (5), locks/papers/ (17), speedups/ (5), untracked | 27 | 8.9 | New map drawings; downloaded papers (7.7 MB); speedups page and PDF | RECORD | locks/SOURCES.md; locks/papers/READY | nothing | uncommitted (27) | speedups-new.pdf is output of speedups/build.mjs |
| research-tree/build/runbig/ | 35 | 0.2 | The big run: card-run reports D2, D4, FINAL-REPORT | RESULT-NEGATIVE | runbig/FINAL-REPORT.md:14-22: no embedder +6 Acc@10 over BM25 (Qwen3 +2.9, interval -3.6 to +9.4); learned graph +0.000 pooled P@10 over counting | nothing | uncommitted (35) | one form, three repos, one held-out run each |
| research-tree/build/improve/ | 745 | 4.9 | Improvement round 2026-11-24/25: candidates, estimates, code per unit, review page, worktree extras | WORKING | improve/CANDIDATES.md:1; no result file read | nothing | uncommitted (745) | code/ 1.1 MB, worktree-extras 3.5 MB; not read further |

Rows: 38. Tracked in build/ rows: 31+74+132+26+217+18+207+13+54+426+39+37+10+22 = 1,306 (matches). Untracked: 5+11+9+11+85+3+10+27+35+745 = 941 (matches).

## Largest files

Tracked, `git ls-tree -r -l HEAD -- research-tree`:
1. research-tree/lane/recorder.log 1.53 MB
2. research-tree/build/replays/replay-L24/flagged.json 0.97
3. research-tree/build/check/tokens-transcripts.csv 0.72
4. research-tree/model/results/run-tier-500.out 0.53
5. research-tree/build/check/tokens-calls-harness.csv 0.44
6. research-tree/lane/log.jsonl 0.43
7. research-tree/build/suites/5/others.log 0.28
8. research-tree/build/suites/6/others.log 0.28
9. research-tree/build/suites/4/others.log 0.28
10. research-tree/build/suites/3/others.log 0.27

Whole area: about 38 MB tracked (model/results 20.6 MB of it) plus about 21 MB untracked (locks/papers 7.9 MB, improve 4.9 MB).

## Not sure

- build/improve/ (745 files): I read only the head of CANDIDATES.md and file names. Class WORKING is from names; whether a measured result sits there I did not check.
- build/replays/: classed RESULT-NEGATIVE from JUDGE-REPLAYS.md and board lines; some of the seven replays are plain measurements, not all negative.
- build/facts/, top9/, reports/: classed from names and one head each.
- tcb "loaded by": no `.claude/settings.json` hook runs tcb scripts; hooks read only plan.json, STATE.md, WIDTHS.md and build/*.md.
- First byte sums (`du -cb | tail`) were wrong for large sets (xargs batches); MB above come from `git ls-tree -l`.

## Questions

a. `research-tree/model/` is both. Hand-written: 13 top files (0.14 MB) and as-built/ 45 files (1.28 MB). Output: results/ 5,179 files 20.61 MB (5,164 .json), results-ladder/ 154 files 0.66 MB, results-as-built/ 120 files 1.14 MB, results-build/ 78 files 0.70 MB; together 5,531 files, 23.1 MB. Producer: `model/run-all.mjs` running `check.mjs` on `configs.mjs` (model/README.md:19-24); `ladder.sh`, `ladder2.sh` for the ladder (model/RUN-LADDER.md:1-12). Summary: results/SUMMARY.md:5-7 (5,154 of 5,163 parts complete).

b. Read at run time by hooks listed in `.claude/settings.json` (count-gate, creep-gate, fanout-gate, owner-report, plan-gate, record-guard, tier-hook, window-ceiling, journal-watch, library-start, migration-gate):
- research-tree/build/WIDTHS.md: .claude/hooks/count-gate.mjs:47, :147.
- research-tree/build/plan.json and build/STATE.md: .claude/hooks/plan-gate.mjs:33-34 (active only while plan.json exists, plan-gate.mjs:19).
- research-tree/build/*.md state files naming a session: fanout-gate.mjs:12, :128; window-ceiling.mjs:86, :204, :240-242 (state.md, briefs/*.md, units/**); owner-report.mjs:64.
- research-tree/build/briefs/<name>.md: fanout-gate.mjs:7, :91; creep-gate.mjs:88.
- research-tree/lane/capacity.txt and lane/log.jsonl: research-tree/tools/lane.mjs:8, :43; record-guard.mjs:679 expects `node research-tree/tools/lane.mjs`.
- By hand, not by hook: tools/land.mjs, build/tools/*.
- Comments only (a move breaks nothing running): refute/P0-GATE.md, refute/TOP8.md, units/T8-COUNT/result.md, check/A-hooks.md, cited in hook headers and tools/check-commit.mjs:2. No other file in tools/ names research-tree (git grep).
All of these are `not on main`, so on main those hooks would find none of them.

c. research-tree/build/ split.
- Results or code someone needs later: facts/ (207), check/ (13), suites/ (54), replays/ (426+10), runbig/ (35), locks/papers (17), tools/ (3), landings.jsonl, usage.jsonl, research-run/ (39 briefs; run itself outside).
- Run-time files that must stay where they are: WIDTHS.md, plan.json, STATE.md, the *STATE.md files, and the path patterns briefs/*.md, units/**.
- Paperwork of finished rounds: briefs/ (74+11), units/ (132+9), refute/ (26+11), landings/ (217+85), departures/ (18+3), top9/ (37), reports/ (10), page, pages, apply (11), the -v1 plans, judge-records.jsonl.
- Unsorted: improve/ (745 files, 4.9 MB, round of 2026-11-24/25, IMPROVE-STATE.md).
Tracked 1,306 files. Untracked 941, not about 60: improve 745, landings 85, runbig 35, locks 17, briefs 11, refute 11, replays 10, units 9, speedups 5, tree 5, top 5, departures 3.

d. All three are pasted node test-runner output. tmp-witness-r1.txt starts "witness.mjs: the corpus of invented texts" with failing lines; tmp-join-U2b-tms.txt starts "T0 the exported constants carry the names the contract lists" with passes; review-lib-run1.txt is a similar log. `git grep` for the names finds only docs/program/evidence/pc-freezes-2026-11-17/refute-evidence-work/tx.json:1, an unrelated transcript dump; nothing reads them. An empty untracked folder `research-tree/tmp/` also exists.

e. Measured result behind it:
- model checker: results/SUMMARY.md:5-7 (3.43 G states, failing traces that led to the thirteen fixes).
- build: r57-0166 to r57-0169 (105 M against 78.6 M planned; 508 M against 222 M; 87.4 M against 34.8 M; 41 M), r57-0101, r57-0172 (tests).
- lane: r57-0127. Tokens per kind of session: build/check/E-tokens.md:1; meter weights r57-0175.
- replays: JUDGE-REPLAYS.md and board line 100 (cache lapses 16.3 % of fresh tokens, helper waits 5-10 min 46.2 M, fixed prefix 19.8 %); negative for L11, L8, L6.
- card run: runbig/FINAL-REPORT.md:14-22 (null for embedders over BM25 and for learned graph over counting; one form each).
- research run: build/JUDGE-HANDBACK.md:1-8 (58 leads; r57-0180 60.1 M for the round).
Built and tested, never run for real: tcb/ (965 and 1,037 pass; t1-0114 "the tree never ran"; r57-0172 "nothing merged, pushed or run for real"; board line 150: pilot P3.1 to P3.3 open, needs the owner's word). Pilot preparation landed on build (runbig/FINAL-REPORT.md:7-9, pin 2662bb99), but the pilot did not run. Designed only: spec/, the digests at the top, build/TRACK-PLAN.md, build/PILOT-PLAN.md.
