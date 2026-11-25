# Reader table: `docs/` (2026-11-25)

Read only. Branch `top9/track-plan`. Area: `docs/` without `docs/program/repo-organisation-2026-11-25/`.
Counts: tracked 4,281 (`git ls-files docs | wc -l`; 3,080 of them on `main`, 1,201 only on this branch) plus 505 untracked = 4,786 files; the rows below add to 4,786.
Disk: about 366 MB tracked plus 58 MB of `monitor/` and `issues/` on disk (all untracked except `round9/rust/Cargo.lock`).
"state" is given as main / branch only / uncommitted file counts. Proof ids come from `library/INDEX.md` (lines 67-100, 150-153) or the file:line given.

| path | files | MB | what it is | class | proof | loaded by | state in git | note |
|---|---|---|---|---|---|---|---|---|
| docs/ORCHESTRATION-DESIGN-2026-10.md | 1 | 0.08 | FixFlow ship-program method; section 3 is the tier guide | DESIGN | r57-0201: run once, 14 rules worked, 9 failed or changed, 25 never run | `.claude/hooks/tier-routes.json:4` (source), `research-tree/START-HERE.md:21` | 1 main | tier hook derived from its section 3 |
| docs/program/GRAPH-TEST-RESULT-2026-11.md | 1 | 0.02 | graph retrieval test on held-out commits, built from graph-test/data | RESULT-NEGATIVE | file:11-: community prior +0.015 [-0.010,+0.042], no gain of 0.05 recall | CLAUDE.md:55 | 1 main | one form on one repository |
| docs/program/ top reports: TOKEN-BOTTLENECK, SUMMARY-CHECK, AFTER-COMPACTION, HARNESS-BOTTLENECKS, LIBRARY-PATHWAYS, RESEARCH-RESULTS-FOR-CUREFOUND (.md and .pdf) | 7 | 0.7 | finished measurement or sweep reports with numbers | RECORD | TOKEN-BOTTLENECK:3 (14.6k + 21.2k calls); AFTER-COMPACTION:4-5 (0 wrong of 2,727 claims); HARNESS-BOTTLENECKS:5 (23 agents, 3.6M tokens, 21 unsolved) | CLAUDE.md:55-58 names TOKEN, HARNESS-BOTTLENECKS | 7 main | report findings, not a gain; CureFound pdf 0.4 MB, origin of pdf not checked |
| docs/program/ top designs: GRAPH-V2-DESIGN, HARNESS-V2-DESIGN, KNOWLEDGE-STORE-DESIGN, SPLIT-RULE, RESEARCH-DIRECTION, RESEARCH-TREE-PROTOCOL (v1, v2), HARNESS-IDEAS-BAML, HARNESS-IDEAS-HORTHY | 9 | 1.1 | designs, protocols, idea sweeps | DESIGN | r57-0202 harness v2 designed-only; r57-0203 Horthy 78 of 861 kept, none controlled; GRAPH-V2-DESIGN:4 holds a measured use count (1,452 transcripts) | CLAUDE.md:55-61, `research-tree/START-HERE.md:11,29` name protocol v2 | 6 main, 3 branch only (DIRECTION, PROTOCOL, PROTOCOL-v2) | the 3 branch-only files are named by CLAUDE.md and START-HERE: not on main |
| docs/program/HARNESS-IDEAS-AND-BOTTLENECKS-2026-11-14(.pdf, -REFERENCE.pdf) | 2 | 6.8 | the compiled harness PDF, two editions | GENERATED | built by `evidence/harness-compile/build/` (project memory: "how it is rebuilt"); not read here | nothing | 2 main | -REFERENCE.pdf 5.7 MB; older 11-13 editions in harness-compile/superseded |
| docs/program/ FixFlow ship program: G1, G2, HARNESS-REVIEW, SHIP-PLAN, SHIP-PLAN-critique (x5), W0-results, OWNER-VIEW | 11 | 1.0 | plan, gates and critics of the shipping work for the product | WORKING | none for the harness: plan v9, P0a "still owed" (SHIP-PLAN:1-4) | nothing | 11 main | CLAUDE.md line 4 says shipping the product does not belong here |
| docs/program/after-compaction/ | 1 | 0.15 | page for the compaction-mistake study | GENERATED | `evidence/after-compaction/build-page.js.txt`; index.html:"Generated from" | nothing | 1 main | |
| docs/program/summary-check/, split-replay/ | 2 | 0.4 | pages for summary-check and split-rule | GENERATED | `evidence/summary-check/build-page.js.txt`, `evidence/split-replay/build-page.js.txt` | nothing | 2 main | one html each |
| docs/program/graph-test/ | 9 | 1.5 | owner page, data, build script of the graph test | GENERATED | build.js.txt builds index.html from data/data.json (GRAPH-TEST-RESULT:3) | nothing | 9 main | holds the data behind the null result |
| docs/program/graph-v2/ | 18 | 2.2 | graph v2 owner page, data, shots of embeddings | GENERATED | build.js.txt from data/data.json (GRAPH-V2-DESIGN:3) | nothing | 11 main, 7 branch only | shots-embeddings png are the 7 not on main |
| docs/program/harness-v2/ | 13 | 0.6 | harness v2 page, plan page, phase 1 findings | GENERATED | built from design.json by `evidence/harness-v2-design/build.js.txt` (HARNESS-V2-DESIGN:3) | nothing | 13 main | design never run (r57-0202) |
| docs/program/library-pathways/ | 7 | 1.1 | map, params, engine, limitations, owner page | GENERATED | page built by `evidence/library-pathways/build-page.js.txt` (LIBRARY-PATHWAYS:3) | nothing | 7 main | the 6 inputs are sources; index.html is the build |
| docs/program/ship/ | 8 | 6.5 | owner page for the FixFlow ship program, 3 screenshots | GENERATED | build.js.txt from program.json (OWNER-VIEW.md:1) | nothing | 8 main | product material |
| docs/program/w2/ | 8 | 0.1 | design notes O-01 to O-10 from the deep dive | WORKING | G2 gate cites them (`evidence/README.md:7`) | nothing | 8 main | product material |
| docs/program/notices/ | 2 | 0.0 | two draft notices to technicians, "not sent" | DESIGN | status line "DRAFT, not sent" in both | nothing | 2 main | product material |
| docs/program/lab/ | 12 | 0.0 | scripts from the testbed: emulator, gates, merge-ready | RECORD | CLAUDE.md:63 "evidence, not tools" | nothing | 12 main | carry paths of other projects |
| docs/program/issues/ | 1 | 0.0 | issue: coordinator pays its whole window on every wake | WORKING | file:4 "Measured once, open, hypotheses" | nothing | 1 uncommitted | |
| docs/program/agent-session-map/ | 8 | 0.3 | drawio, svg, png map of sessions, sessions.json, brief | GENERATED | build/ folder (not opened) | nothing | 8 branch only | |
| docs/program/pipeline-diagram/ | 26 | 2.2 | the harness pipeline diagram, memory diagrams, pdfs, build scripts | GENERATED | `build/build.mjs` writes drawio, svg, png; `build/pdf.mjs ../memory` writes pdfs (README:45-46) | nothing | 0 main, 7 branch only unchanged, 9 changed, 10 untracked | owner's diagram; edits in working tree |
| docs/program/monitor/ top: README, NEXT-ROUND(-5,-6,-7-BUILD,-8), UX-RESEARCH, feedback jpg, session-monitor.html | 9 | 1.2 | monitor proposal and the briefs for rounds 5 to 8 | WORKING | README.md:10-13 (round 1 table rejected, round 2 map current) | `.claude/hooks/tier-routes.json:14` cites NEXT-ROUND-8.md | 9 uncommitted | session-monitor.html 0.55 MB is the round 2 to 3 map, replaced by round 9 tool |
| docs/program/monitor/app/ | 3 | 0.6 | round 7 in-app monitor: server.mjs, page.html, data.json | SCRATCH | README.md:185 "approved picture, live"; then replaced by round9/tool | `.claude/launch.json:7` runs app/server.mjs | 3 uncommitted | launch.json still points here, so it cannot move yet |
| docs/program/monitor/build/ | 13 | 0.9 | snapshot.mjs, templates v1, v3, v4, round 3 parts | SCRATCH | README.md:10 v1 "rejected"; v4 replaced by template.html (README:151) | nothing | 13 uncommitted | snapshot.mjs fed the round 5 to 7 data |
| docs/program/monitor/round4/ | 4 | 0.9 | screenshots of round 4 | SCRATCH | README.md:150 "owner rejected round 4 on its architecture" | nothing | 4 uncommitted | rejected |
| docs/program/monitor/round5/ | 3 | 0.7 | round 5 screenshots | SCRATCH | README.md:151-170 "not yet judged"; NEXT-ROUND-6 started a new approach | nothing | 3 uncommitted | replaced |
| docs/program/monitor/round6/ | 6 | 1.2 | research page and proof of concept | SCRATCH | round6/README.md:3 "approved ... nothing is built" | nothing | 6 uncommitted | approved, then replaced by round 7 build |
| docs/program/monitor/round7/ | 8 | 1.0 | in-app picture screenshots | SCRATCH | README.md:185-200 (approved, live in app) | nothing | 8 uncommitted | replaced by round 8 and 9 |
| docs/program/monitor/round8/ | 140 | 21.2 | research, four prototypes, "clickable" review and final | SCRATCH | round9/BRIEF.md:8-10, :23-24: owner rejected the final History page | round9/BRIEF.md:56 reads round8/clickable/shared/data.js | 140 uncommitted | rejected 2026-11-24; round 9 pictures still read its data.js |
| docs/program/monitor/round9/ top: BRIEF, BUILD-BRIEF, FEEDBACK(-2,-3), MAPPING, MIGRATION-BRIEF, NOTES, STAGE2-BRIEF, 6 level html | 15 | 0.2 | briefs, owner words, the five approved proof pictures | WORKING | FEEDBACK.md:3-4 "it looks fine" | MIGRATION-BRIEF points to FEEDBACK files | 15 uncommitted | pictures replaced by tool/ |
| docs/program/monitor/round9/tool/ | 77 | 22.4 | the session tool: Now, History, live feed, server.mjs, src | WORKS-TESTED | NOTES.md:1-5 (page 355,530 bytes, runs on replay and live); FEEDBACK-2.md:3-5 owner "pretty good" | nothing (not in settings) | 77 uncommitted | current one; index.html built by `node src/build.mjs`; largest part is data and shots |
| docs/program/monitor/round9/migration/ | 144 | 6.2 | Rust move: SRS, plan, failure modes, skills, checks, briefs | WORKING | MIGRATION-BRIEF.md:3-5 deliverable SRS.md; no run seen | `.claude/hooks/migration-gate.mjs:69` (MIG, CK paths), `tools/git-hooks/pre-commit:7` | 144 uncommitted | in progress |
| docs/program/monitor/round9/rust/ | 64 | 1.1 | Cargo workspace: app, crates, plugin | UNKNOWN | only listed: Cargo.toml, crates, plugin, rust-toolchain.toml; nothing built or tested found | `migration-gate.mjs:69` (RUST), `pre-commit:7` | 1 branch only (Cargo.lock, now AM), 63 uncommitted | Cargo.lock is staged-added and modified |
| docs/program/monitor/round9/shots/, src/ | 9 | 0.8 | screenshots of the five pictures; their source scripts | GENERATED | NOTES.md (round9):2 "screenshots 1870 x 1050, headless Edge" | nothing | 9 uncommitted | |
| docs/program/evidence/ README.md, manifest.sha256 | 2 | 0.1 | digest list and note for the evidence folder | RECORD | README.md:1-9 "evidence, not state" | `.claude/hooks/record-guard.mjs:214`, `tools/check-commit.mjs:49` guard the whole folder | 2 main | |
| docs/program/evidence/harness-bottlenecks/graph2/embeddings/lane/ | 530 | 43.4 | embeddings test lane output: train, gpu, grader returns, leak_audit.json | RECORD | COORDINATOR-REPORT.md:46-58: every arm "matches" the simple ranker, e.g. RotatE +0.0023 [-0.0002,+0.0049] | record-guard | 0 main, 530 branch only | largest file leak_audit.json 6.4 MB; model-run output |
| docs/program/evidence/harness-bottlenecks/graph2/embeddings/coordinator/ | 300 | 9.0 | coordinator's audit work and rerun results | RECORD | COORDINATOR-REPORT.md:24 (38 agents, no wrong figure) | record-guard | 300 branch only | route-pertask.json 5.2 MB |
| docs/program/evidence/harness-bottlenecks/graph2/embeddings/ top (AUDIT, CLAIMS, COORDINATOR-REPORT, RESULT, result.json, INSTALL x2, PRESENT-ELSEWHERE) | 8 | 6.2 | the embeddings test's reports | RESULT-NEGATIVE | COORDINATOR-REPORT.md:46-58, five arms and a placebo all within about 0.005 P@10 | CLAUDE.md:57 names COORDINATOR-REPORT | 2 main (INSTALL files), 6 branch only | CLAUDE.md points at a file not on main; AUDIT.md 5.6 MB |
| docs/program/evidence/harness-bottlenecks/graph2/page/ | 536 | 79.0 | screenshot and job iterations of an owner page: work..work5, final..final4 | SCRATCH | successive versions; final4 last | record-guard | 536 main | png iterations; 79 MB, the heaviest group |
| docs/program/evidence/harness-bottlenecks/graph2/page-v2/ | 150 | 39.3 | second page build: work, final | SCRATCH | same pattern as page/ | record-guard | 150 main | final 22.9 MB |
| docs/program/evidence/harness-bottlenecks/graph2/ other (protocol, addenda 1-8, build-a to h, workflows, research, widen, graph-v2) | 250 | 7 | protocol and builds of the graph test | RECORD | protocol.md; results in GRAPH-TEST-RESULT | record-guard | 250 main | MB approximate (summed by name) |
| docs/program/evidence/harness-bottlenecks/ rest (bottlenecks.md, sweep files, research.json, fill/, fit/, graph/) | 214 | 5 | the 21-bottleneck sweep and its fills | RECORD | HARNESS-BOTTLENECKS:5 (158 cards, 23 agents) | record-guard | 214 main | MB approximate |
| docs/program/evidence/harness-compile/ | 184 | 32.8 | build and output of the compiled harness PDF; superseded editions | GENERATED | out/harness-compile.pdf 5.7 MB from build/ and data/ | record-guard | 184 main | superseded/ 10.6 MB are 3 replaced PDFs |
| docs/program/evidence/harness-ideas/ | 154 | 13.8 | BAML and Horthy sweep material | RECORD | r57-0203 (78 of 861 kept) | record-guard | 154 main | horthy 13.4 MB |
| docs/program/evidence/library-pathways/shots/, proto-ux3/ | 326 | 64.0 | screenshots and prototype page iterations | SCRATCH | prototype iterations of the owner page | record-guard | 326 main | png; shots 42.2, proto-ux3 21.8 MB |
| docs/program/evidence/library-pathways/ rest | 188 | 6.6 | builds, checks, inventory, walkthroughs | RECORD | check-*.md, LIBRARY-PATHWAYS:3 | record-guard | 188 main | |
| docs/program/evidence/pc-freezes-2026-11-17/ | 101 | 14.1 | the freeze investigation: raw histories, refutations, VERDICT | RECORD | VERDICT.md:1-6 (7 agents, 1.41M tokens, 424 calls) | record-guard | 0 main, 101 branch only | raw json 3.8, 3.1, 2.7 MB |
| docs/program/evidence/knowledge-store/ | 216 | 6.3 | panel, refute, critique for the knowledge store design | RECORD | KNOWLEDGE-STORE-DESIGN:3 (30 refuter verdicts) | record-guard | 216 main | design never built (r57 board) |
| docs/program/evidence/token-spend/ | 78 | 2.2 | scripts and tables behind the token bottleneck | RECORD | README.md:1-3, TOKEN-BOTTLENECK | record-guard | 78 main | |
| docs/program/evidence/lab/ | 367 | 1.9 | lab run logs of the testbed | RECORD | CLAUDE.md:63 | record-guard | 367 main | |
| docs/program/evidence/research-tree/ | 69 | 2.0 | attack and foundations papers for the tree | RECORD | folder names attack-2026-11-16, foundations-2026-11-16 | record-guard, START-HERE | 0 main, 69 branch only | |
| docs/program/evidence/round3-2026-11-18/ | 106 | 1.9 | research round 3 briefs and decision rule v2 | WORKING | INDEX.md:150-153 (round 3 verdicts) | record-guard | 0 main, 106 branch only | |
| docs/program/evidence/bottleneck-2026-11-18/, harness-method-status-2026-11-18/ | 54 | 1.0 | method status extractions of 2026-11-18 | RECORD | harness-method-status README:2-4 "not checked row by row" | record-guard | 0 main, 54 branch only | |
| docs/program/evidence/reviews/ | 95 | 0.9 | reviews | UNKNOWN | listed only; contents not read | record-guard | 95 main | |
| docs/program/evidence/w1/, w2/ | 50 | 1.4 | raw outputs of the ship program discovery and deep dive | RECORD | evidence/README.md:3-9 | record-guard | 50 main | product material |
| docs/program/evidence/ small: after-compaction, compile, curefound-results, harness-v2-design, local-checks, markers, notes, resume-trial-P1, split-replay, summary-check | 167 | 3.0 | inputs, page builders and notes for the pages above | RECORD | build-page.js.txt in the page folders | record-guard | 167 main | |

Total: 4,786 (4,281 tracked, 505 untracked). Branch-only tracked: 1,201.

## Largest files

From `git ls-tree -r -l HEAD -- docs`:

1. 6.35 MB `docs/program/evidence/harness-bottlenecks/graph2/embeddings/lane/train/leak_audit/leak_audit.json`
2. 5.73 MB `docs/program/evidence/harness-compile/out/harness-compile.pdf`
3. 5.73 MB `docs/program/HARNESS-IDEAS-AND-BOTTLENECKS-2026-11-14-REFERENCE.pdf` (same size as 2, likely a copy)
4. 5.61 MB `.../graph2/embeddings/AUDIT.md`
5. 5.22 MB `.../graph2/embeddings/coordinator/audit-work/audit10b/e5/route-pertask.json`
6. 4.82 MB `docs/program/evidence/harness-compile/superseded/HARNESS-IDEAS-AND-BOTTLENECKS-2026-11-13.pdf`
7. 4.82 MB `.../superseded/HARNESS-IDEAS-AND-BOTTLENECKS-2026-11-13-REFERENCE.pdf`
8. 3.80 MB `docs/program/evidence/pc-freezes-2026-11-17/refute-evidence-work/tx.json`
9. 3.15 MB `.../pc-freezes-2026-11-17/refute-internals-events.json`
10. 2.75 MB `.../pc-freezes-2026-11-17/history-raw-System.json`

## Not sure

- `monitor/round9/rust/` (64 files): listed top-level names only; no test or build seen. UNKNOWN.
- `evidence/reviews/` (95 files): not opened. UNKNOWN.
- `agent-session-map/`: class GENERATED from the file types and a `build/` folder; README and BRIEF not read.
- `graph2/page`, `page-v2`, `library-pathways/shots`, `proto-ux3`: classed SCRATCH from folder names (work, final, final2...) and file types; I did not open them. They sit under `evidence/`, so the guards refuse edits; the owner's rule 1 forbids removing them.
- MB of the two `graph2 other` and `harness-bottlenecks rest` rows are summed by folder name, about plus or minus 1 MB.
- Whether the two top-level PDFs are built by `harness-compile/build/`: taken from the memory note, build script not opened.
- `round9/tool/` WORKS-TESTED rests on NOTES and the owner's "pretty good"; no test count seen and live answer/stop is not wired (memory: round 9).

## Questions

**a. Where the weight sits.** 12 heaviest folders (tracked, MB from `git ls-files` sizes; file kind):
1. `evidence/library-pathways/shots` 42.2 (233 png screenshots, iterations) and `proto-ux3` 21.8 (93 files, png)
2. `evidence/harness-bottlenecks/graph2/embeddings/lane` 43.4 (530 files: json and gz of model output, leak_audit.json 6.4)
3. `.../graph2/page-v2/final` 22.9 (52, png) 
4. `.../graph2/page/work2` 16.0 (76, png)
5. `.../graph2/page-v2/work` 15.5 (74, png)
6. `.../graph2/page/final2` 13.3 (64, png)
7. `.../graph2/page/work` 12.3 (67, png)
8. `.../graph2/page/final` 10.2 (53, png)
9. `.../graph2/page/final4` 9.9 (84, png)
10. `.../graph2/embeddings/coordinator` 9.0 (300, json and md audit work)
11. `evidence/harness-compile/superseded` 10.6 and `out` 13.2 (PDFs and html)
12. `evidence/pc-freezes-2026-11-17` 14.1 (raw json histories)
Untracked on disk: `monitor/round9/tool` 22.4 and `monitor/round8` 21.2 (png, html, json). By extension over all tracked: png 180 MB (786 files), json 67.5 MB, gz 34.3, pdf 24.6 (8), md 23.7, txt 15.4, html 12.4. Screenshot iterations of pages are about half the folder.

**b. Monitor rounds.** Evidence: README.md:10 (round 1 table "rejected"), :13 (map "current" at that time), :150 (round 4 "rejected on its architecture"), :151 (round 5 new page, "not yet judged"), round6/README.md:3 (proof of concept approved), README.md:185 (round 7 approved picture live), round9/BRIEF.md:8-10 and :23-24 (owner rejected round 8's final History page), round9/FEEDBACK.md:3-4 ("looks fine"), FEEDBACK-2.md:3-5 (tool "pretty good"), FEEDBACK-3.md (Rust move).
- Rejected by the owner: round4 (4 files, 0.9 MB), round8 (140 files, 21.2 MB), build/template-v1-table.html (1 file). Total about 145 files, 22.1 MB.
- Replaced after approval or without a verdict: round5 (3, 0.7), round6 (6, 1.2), round7 (8, 1.0), app (3, 0.6), build (13, 0.9, minus the v1 above), the 5 NEXT-ROUND files, session-monitor.html (0.55), round9 level html and shots (about 1.0). About 40 files, 6 MB.
- Current: round9/tool (77, 22.4 MB); round9/migration (144, 6.2) and round9/rust (64, 1.1) are the live Rust move; round9 briefs and FEEDBACK files are the record of owner words.
- Warning: `round9/BRIEF.md:56` has the level pages read `round8/clickable/shared/data.js`, so round 8's data is still used; `.claude/launch.json:7` still starts `monitor/app/server.mjs`.

**c. Documents by class** (top level of `docs/` and `docs/program/`; each once):
- Finished measurement with numbers: GRAPH-TEST-RESULT (null, GRAPH-TEST-RESULT:11); TOKEN-BOTTLENECK (:3, tokens by bottleneck); SUMMARY-CHECK and AFTER-COMPACTION (0 wrong of 2,727 claims, AFTER-COMPACTION:4-5; no live trial run); HARNESS-BOTTLENECKS (:5); LIBRARY-PATHWAYS ([M] tags, :3); RESEARCH-RESULTS-FOR-CUREFOUND (+pdf; summary of the above); the embeddings reports under evidence (null).
- Mixed, measured part plus design: GRAPH-V2-DESIGN (:4 measured lookups 28,229; the graph form not built), SPLIT-RULE (a replay; live trial "said yes", not shown run), HARNESS-IDEAS-AND-BOTTLENECKS pdfs (compiled).
- Designs or plans never built or run: HARNESS-V2-DESIGN (r57-0202), KNOWLEDGE-STORE-DESIGN, RESEARCH-DIRECTION, RESEARCH-TREE-PROTOCOL and v2 (the tree "never ran", INDEX t1-0100 to t1-0120; the build is on branch `build`), HARNESS-IDEAS-BAML and -HORTHY ("ideas only", nothing tried, r57-0203), ORCHESTRATION-DESIGN-2026-10 (run once, r57-0201).
- Product work (not harness): G1, G2, HARNESS-REVIEW, SHIP-PLAN and its 5 critiques, W0-results, OWNER-VIEW.

**d. Read at run time, cannot move.**
- `CLAUDE.md:55-63` names HARNESS-BOTTLENECKS, TOKEN-BOTTLENECK, GRAPH-TEST-RESULT, `evidence/.../embeddings/COORDINATOR-REPORT.md`, GRAPH-V2-DESIGN, HARNESS-V2-DESIGN, RESEARCH-DIRECTION, RESEARCH-TREE-PROTOCOL (v1, v2), `docs/program/lab/`. Three of these (DIRECTION, PROTOCOL, PROTOCOL-v2) and COORDINATOR-REPORT are not on main.
- `research-tree/START-HERE.md:11,21,29` names PROTOCOL-v2 and ORCHESTRATION-DESIGN.
- `.claude/hooks/record-guard.mjs:214` and `tools/check-commit.mjs:49`: the whole `docs/program/evidence/` is guarded as archive (no edit, rename or delete).
- `.claude/launch.json:7`: `docs/program/monitor/app/server.mjs`.
- `.claude/hooks/migration-gate.mjs:69` (`monitor/round9`, `migration`, `rust`, `migration/checks`) and `tools/git-hooks/pre-commit:7` (round9/rust, round9/migration).
- `.claude/hooks/tier-routes.json:4,14`: cite ORCHESTRATION-DESIGN section 3 and `monitor/NEXT-ROUND-8.md` as text sources (not read at run time as files).
- `.claude/hooks/selftest.mjs`, `owner-report.test.mjs`, `tools/check-commit.mjs` mention `docs/program` too (grep hit; lines not opened).

**e. Built from a source by a script.**
- Pages: graph-test (`build.js.txt`), graph-v2 (`build.js.txt`), ship (`build.js.txt`), harness-v2 (`evidence/harness-v2-design/build.js.txt`), library-pathways (`evidence/library-pathways/build-page.js.txt`), after-compaction, summary-check, split-replay (`evidence/<name>/build-page.js.txt` with `page-template.html`).
- Markdown also generated: GRAPH-TEST-RESULT.md, GRAPH-V2-DESIGN.md, HARNESS-V2-DESIGN.md, LIBRARY-PATHWAYS.md, ship/OWNER-VIEW.generated.md and OWNER-VIEW.md (each says "Generated ... do not edit").
- `pipeline-diagram/`: drawio, svg, png from `build/build.mjs`; PDFs in `memory/` from `build/pdf.mjs` (README:45-46).
- `evidence/harness-compile/out/harness-compile.pdf` and `.html` from `build/` and `data/`; the two top-level PDFs are probably the same build (not verified).
- Monitor: `round9/tool/index.html` from `src/build.mjs`; `round8/research.html` from `build-research-page.mjs`; `session-monitor.html` from `build/snapshot.mjs` with `build/template.html` (README:151-160).
