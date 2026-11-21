# WIDEN: the research run widened to the owner's scope (helper A of top session 6, analyse, Opus)

2026-11-21. Brief: `research-tree/build/briefs/TOP6-A-WIDEN.md` (steps 2-3 of `briefs/TOP6-WIDEN-RUN.md`); rulings r57-0047
(scope), r57-0048 (this round). `RUN:` = `C:/research-runs/2026-11-harness-leads/`. Marks: [m] measured, [r] read
(path:line), [c] computed (formula shown), [e] estimate. **Status: design and recompute done; no file of `RUN:` changed
yet: this helper reached about 235 K of context after reading (the brief's 250 K stop) and returns `LIMIT window`.**
A successor applies section 1 from this file.

## 1. What changes, file by file (not yet applied; no commit in `RUN:`'s git, still at d83da0d)
1. `tools/split.mjs` + `split.test.mjs` (new). `node tools/split.mjs f<n>m`: reads the folded map `fields/<n>m-<slug>/KEYS.md`
   (table `| rank | key | owner | what to find | library words | sources |`; key `[a-z0-9-]{2,24}`; owner `f<n>` or
   `xref f<m>`); takes owner = this field, rank order, duplicates dropped; parts of at most `split.keys_per_part` keys
   (5) up to `split.parts_max.f<n>` (f2 4, f3 2, f4 2), letters a-d; writes `PARTS.md` with the exclusive flag (rows
   `| f<n><p> | <key> | collect | <what> | <words> |`, topics.md's form) and `NOT-COVERED.md` (each key over the bound,
   reason "over the bound of P parts of 5 keys", and each xref key, reason "owned by f<m>"); a repeat finds PARTS.md and
   prints it unchanged (posted once: no started key ever moves, t1-0401). One line printed.
2. `tools/hang.mjs` + `hang.test.mjs` (new), `lib.mjs` a `lastWriteByUnit()` by stat only. Prints one line `hang <UTC>:
   <unit> <min> ...` and `SILENT <unit> <min>` (a running unit, started more than D ago, none of its helper transcripts
   written for D = `hang_silent_min` 20), `RETURNED <unit>` (its done file newer than `run/STATE.md` and older than
   5 min: a notice missed), `PAUSE <min>` (the last line of `run/hang.log` over 45 min old: a suspend; no SILENT verdict
   this call, D3-06); exit 1 on SILENT or RETURNED; appends to `run/hang.log`. Running = a gate slot, no done file (as gate.mjs).
3. `tools/gate.mjs` + test: HOLD `starts_max reached` when the unit already has `starts_max` (6) START slots.
4. `briefs/field/fill.mjs`: ids `2a`-`2d`, `3a`, `3b`, `4a`, `4b`, `2m`, `3m`, `4m` beside 5-8; a part's five topics from
   its map's PARTS.md, f5-f8's from topics.md; `{prior}` = `F:collect-prior.md` (f5-f8) or
   `RUN:fields/<n>m-<slug>/collect-prior.md` (parts); x files: f2a x50-54, f3a x55-59, f4a x60-64, f5-f8 x65-84 as now,
   f2b x85-89, f2c x90-94, f2d x95-99, f3b x100-104, f4b x105-109; record prefix `d<id>` (d2a ...).
5. `briefs/MAP.md` (new, one for f2m, f3m, f4m): readers at once (f2m: prior + 4 survey topics; f3m, f4m: prior + 2),
   from new topics.md rows `| f2m | ... |`; then a map writer (analyse, opus, high) writes KEYS.md, ranking keys by the
   field's question and r57-0047's words, naming the owner of each key by the question it answers; a fresh map
   refuter (refute, opus, high: missing areas the sources name, keys outside the question, wrong owner, places that do
   not hold); a map fold (analyse, opus, medium); `node tools/split.mjs f<n>m`; RETURN.md and DONE.md as FIELD.md s6.
   Same waits, limits, drain, restart as FIELD.md s4-5. No records, no extractors (the parts write them).
6. `briefs/field/topics.md`: map rows f2m (prior; kg-construction: knowledge graphs built from code and text;
   graph-retrieval-designs; graphs-kept-fresh: graphs updated as code changes; reasoning-and-learning: reasoning over
   graphs and graph learning; the five areas he was told, r57-0047 context, TOP6-WIDEN-RUN.md:33-35), f3m and f4m (prior
   + two survey topics from DIR:56-57's words); f3, f4 field rows leave topics.md (their maps' PARTS.md replace them);
   f3 adapters' and f6 fit-12gb's 12 GB wording replaced (item 9).
7. `briefs/FIELD.md`: the unit is `f<id>` (f2a ... f8); section 1's table: rows f2 (widened question: graphs and
   knowledge graphs across their architectures, r57-0047), f3 and f6 (tiers); section 2 item 1 holds only on
   `sheet/SHEET.md`; F1 out: step 2 without R_same, step 3b without the fresh review, steps 4 and 5 removed, the pair's
   paragraph, fills 10-12 and 20, section 5's R_same and steps 4-5, section 6's `sealed/` path and the pair in the
   return, section 9 items 2-3; step 6 waits on gate and refute only; figures: part 98.0 (84.3-110.6), limit 150.1.
8. `briefs/field/writer.md` (Part 2 removed), `refuter.md` (Part A removed; part 1 limit 25.5 + a rest), `reader.md`
   (lines 65-68: a tier tag per method, item 9), `gate.md`, `fold.md`, `check.md`, `extractor.md` only where they name
   F1 files (grep showed none in the last four).
9. Tiers (r57-0047): every method tagged `card: none | fits 12 GB | needs 24 GB | needs more | not stated` with the
   source's figure; none dropped for size; test designs ordered 12 GB first. In reader.md 65-68, writer.md 28,
   topics.md f3 adapters and f6 (`tiers`: what fits 12 GB, what needs 24 GB, what needs more, quality per tier), FIELD.md
   rows f3 and f6, CLOSING.md S.1, S.3, S.6, P.
10. F1 moved, not deleted (tests later, r57-0047): `briefs/PLANTED.md`, `briefs/field/scorer.md`,
    `briefs/field/review-form.md`, `tools/shuffle.mjs`, `tools/shuffle.test.mjs` to `later/f1/` (commit.mjs with old and
    new paths: `git add` stages the removal); the `planted` unit out of config; `sealed/` rules out.
11. `briefs/COORDINATOR.md`: units and order (sheet, f2m, f3m, f4m at the start; a map's parts ready on its DONE and its
    PARTS.md; a free slot takes the lowest lane, then letter; f5-f8 ready from the start; at most three map or part units
    at once, the sheet beside them); cap and coordinator limit read from config (`cap_M`, `coordinator.limit_M` 32.0 in
    place of the literals 1,200 and 16.1); no planted unit, no exception; the timer's prompt runs `hang.mjs` (s6), s8's
    Hang on SILENT or RETURNED, s3's HOLD on starts_max = "given up"; the end: TOP.md's message (item 15); R1 and R2 new.
12. `briefs/CLOSING.md`: a sample reader per part or field (12) and per map none; packets of two parts, the sheet with
    f8's (6.5 packets, ids d9-0560 on, ten a packet); 24 recall questions (two a part); S without score.md, f1-tokens,
    sealed; S.4 (F1) removed; the synthesis fold also writes `closing/HAND-BACK.md` (item 15); the closing helper appends
    "Not covered" (each map's NOT-COVERED.md, units ended without DONE) and "Tokens per unit" (`tokens.mjs run`'s table);
    figures 214.8.
13. `briefs/SHEET.md`: its readers are the parts' writers (lines 7-8, 19-20: no planted files, no R_same); 8 KB kept.
14. `CLAUDE.md` (rule 3 without the F1 comparison; rule 10 removed; table rows planted, R_same, scorer removed; map rows),
    `DOWNLOADS.md` (section 4 removed; sizes section 3), `GO.md` (the go below; sections 3-5 numbers; hours),
    `tools/README.md` (split, hang, starts_max; shuffle out), `run/config.json` (section 3's units, `preparation_M` 110,
    `cap_M` 1860, `split`, `starts_max` 6, `hang_silent_min` 20, `coordinator.limit_M` 32).
15. `run/TOP.md` (new): name `top-6-widen-run`; title `orchestrate: top session 6, widen the research run`; id
    `local_62806337-b942-4cf6-bf74-f2814f1b4188`; message: `The research run in C:/research-runs/2026-11-harness-leads
    has ended: read closing/HAND-BACK.md there and judge it (your brief's step 7).` The coordinator, after the closing's
    DONE: ToolSearch `select:SendMessage,ListAgents`, ListAgents, the row by name or id, SendMessage once; appends
    `message to top-6-widen-run: sent <UTC>` or `... FAILED: <why>` as HAND-BACK.md's last line, commits; on a failure its
    last line to him says to type in that session: `Read C:/research-runs/2026-11-harness-leads/closing/HAND-BACK.md.`
    Not tested (r57-0506). HAND-BACK.md: a block a lead (what it is; source, place, quoted figure; effect on the seven
    measures against its baseline; evidence strength; the refuter's verdict; memory tier; pipeline: quality (the tree)
    or tokens (library, graph, router); cost to test here in tokens, hours, card; record ids), then not covered, then
    tokens per unit.

The go (GO.md section 1): "I approve the research run in this folder: read and follow
C:/research-runs/2026-11-harness-leads/briefs/COORDINATOR.md. I approve the downloads that DOWNLOADS.md in this folder
names (public papers from open copies, at most 40 MB each, about 960 MB in all, and public raw text pages of code and
benchmark results, at most 2 MB each, about 160 MB in all), and one message the run sends at its end to top session 6
in the harness repository. The cap is 1.86 B tokens for the run, the preparation included."

## 2. Decisions and their derivations
- **D1 The map inside the run** (the top session's decision 1, kept): it needs the literature, which only the go's
  downloads allow (rule 3); a map from the records held would rest on code-graph and symbol-index records (FIELD.md:29:
  "code graph, knowledge graph, retrieval: none") and on memory (rule 7). Its tokens in section 3.
- **D2 b = 5 keys a part**: today's five topics a field (topics.md; FIELD.md:65, five readers), so a part is today's
  field without F1 and the measured basis holds. The prior is read once, in the map, and every part's writer reads it
  ({prior}); f5-f8 keep their own prior. Bounds 4, 2, 2 (decision 2). **Keys over the bound** go to NOT-COVERED with
  the cost to cover them (98.0 M a part); no automatic extra part: the cap's buffer is for overruns (r57-0038), and
  spending it on parts would leave none; the top session decides from the hand-back.
- **D3 Fields 3 and 4 get a map** (decision 2's default): without one, their second part could take only the
  direction's own words (DIR:56-57: about six keys for f3, today's four topics folded finer), deeper, not wider, and
  new keys written here would come from memory (FIELD.md fill 2). A map sized to its bound (3 readers, about 12 keys)
  costs 28.0 M (21.4-36.5) against the 196 M of the two parts it chooses (14 %).
- **D4 One owner a key**: each map writer gets every field's question (FIELD.md s1) and marks a key answering another
  field's question `xref f<m>`: not read here, listed in NOT-COVERED, never a second reading. Knowledge graphs with
  time as an agent's memory: f4 (DIR:57); graph-neural encoders: f3 (DIR:56); graphs kept fresh as code changes: f2
  (TOP6-WIDEN-RUN.md:34). A key named by no map is the residual (section 4).
- **D5 F1 out, sheet kept**: the sheet is lane 1 (DIR:54), every writer scores leads against it (writer.md:10, :26) and
  the closing maps leads per sink (CLOSING.md:117); only its F1 lines change. F1's files move to `later/f1/`.
- **D6 The three checks** (r57-0177; numbers measured here: `gaps.mjs`, `gapctx.mjs` in this helper's scratchpad, over
  the 262 helper transcripts of this repository's sessions, 2026-11-19 to 20) [m]: longest silence a transcript, median
  1.5 min, p90 3.9, p99 21.7, max 46.5; the four over 10 min: two helpers that had returned and were resumed later
  (46.5, 21.7), one waiting on its own background commands (24.3, a form this run forbids), one model response of
  10.9 min. No hang in 262; one stall on record (memory note of 2026-11-17, a notice that never came, 22 min).
  - **Hang detection: added** (hang.mjs). Guards a silent unit or a missed notice at the coordinator's level, where
    only returns wake it: with no return due (the last units, the closing), nothing else looks. About 1 in 300
    helpers [m: 1 stall in 262 + the note's round] x 17 units: about 5 % a run that one unit stalls, mostly caught at
    events today; uncaught at the end about 1-2 % [c]; then the run waits until he looks. Cost: one more call at each
    timer wake, 20-28 wakes x 0.1-0.18 M = 2.4-4.6 M Fable tokens, mostly cache reads (r57-0175: about 1 % of a fresh
    token on the meter), 0.4-0.8 Fable points at 5.7 M a point (r57-0170, all-token basis); build about 1-2 M. D = 20
    min: about twice the longest working silence measured (10.9 min); part helpers write every 150 s or less (wait.mjs).
  - **Restart limit: added** in the gate (starts_max 6 = first + one window restart + one extension + one restart,
    COORDINATOR s5 and s8, + two free restarts after an app restart or a usage limit [e]). Guards a restart loop
    after a hand-over or a miscount: the gate's slots are the durable record; each loop event costs the coordinator
    4-5 K of window (R2), so 20 would cost 80-100 K of its 230 K. Run cost 0 calls; build about 0.5 M.
  - **Fencing: not added.** It guards a replaced helper writing on; here only a restart of a live one, after a hang
    verdict at D = 20 min (no working silence over 10.9 min in 262) or a failure; app restarts and usage limits end the
    old ones (r57-0118; sub-agents.md:1007). A real fence needs a hook refusing a fenced agent id's writes, whose input
    is not verified here: a probe of the app, his word first (r57-0506). TaskStop before a restart and the restarted
    helper's wait-first (FIELD.md s5) stay.
- **D7 Width**: three map or part units at once [c: the app's 20 helpers a session (C:99-100) / a unit's peak of 6
  (its helper + 5 readers or 5 extractors) = 3]; memory (about 20 more sessions, C:95-97), processor, ready work (7 units
  ready at the start) and the token gate do not bind; the coordinator ends at 160-202 K, under its 230 K (R2's method).
  If helpers of helpers do not count in the 20 (not measured; a refused start shows it), more.

## 3. The numbers (M tokens; expected (low-high); limit = high + 1.5 x (high - low), PILOT-PLAN.md:32-33)
| Unit | Basis | Expected | Limit |
|---|---|---|---|
| sheet | unchanged (COORDINATOR R1) | 9.8 (6.5-13.2) | 23.2 |
| f2m | 5 readers x 3.21 (1.86-4.83) + writer 10.0 (9.4-12.1) + refuter 15.5 x 24/70 + fold 9.6 x 24/70 + map helper 8.1 (6.65-9.8: lane session 9.8 x 4/8 steps + 21-32 polls at 100-140 K) [m: FIELD.md:65-76; c] | 42.8 (32.5-56.0) | 91.3 |
| f3m, f4m | 3 readers + writer x 3/5 + refuter and fold x 12/70 + helper 8.1 | 28.0 (21.4-36.5) each | 59.2 |
| 12 parts (f2a-d, f3a-b, f4a-b, f5-f8) | field 117.7 less F1 19.1 less the scorer's and blinding calls 0.5-0.9: helpers 83.1 (71.8-92.8) + helper 14.9 (12.5-17.8) [C:166-170] | 98.0 (84.3-110.6) each | 150.1 |
| closing | 12 samples x 4.70; 6.5 packets x 10.59; board 5.5 x 12/7; recall 24 questions (5.0 x 24/14); synthesis 30 x 12/7 [e]; helper 15.7; page 1.5; check 1.745 x 12/7 | 214.8 (168.6-259.4) | 395.6 |
| coordinator (Fable) | 110-143 calls (17 units x 3.5-4.5 + 10 + 20-28 wakes x 2) x 120-145 K mean window | 16.6 (13.2-20.7) | 32.0 |
| **run** | | **1,516 (1,275-1,750)** | |
- With the preparation (80 M + this round's 30 M, `preparation_M` 110; the top session writes the measured figure):
  1,626 M (1,385-1,860). **Cap 1,860 M** = the high with the preparation, the approved cap's form (1.2 B against the sum
  of Q3s 1,211 M, COORDINATOR.md:191) and r57-0038's expected need plus a buffer.
- **Points** (62 M a point, r57-0170): 24.5 (20.6-28.2) of next week's all-models meter, room 64.7 at the reset
  (100 less 0.21 x 168 h protected); Fable 2.9 points (2.3-3.6) at 5.7 M a point, room 55.5; Fable on the all-models
  meter not known (r57-0514): at two Opus tokens a Fable token, +0.3.
- **Hours**: 7.5-11.2 h of machine time at three at once [c: maps 0.75-1.2 h a unit, parts 1.1-1.8 h (C:88-92 less the
  fresh review's 5-12 min); (3 x 0.75-1.2 + 12 x 1.1-1.8) / 3 = 5.2-8.4 h, + closing 2.3-2.8 h [e: 2.2-2.4 h, C s3,
  with the longer synthesis]]; 3.7-5.8 h if helpers of helpers do not count.
- **Downloads**: papers 960 MB [c: 60 MB a field of four web topics (DOWNLOADS.md:12) = 15 MB a topic x 64 topics
  (maps 8, parts 8 x 5 + 4 x 4)], at most 40 MB each; pages 160 MB [c: 10 MB a field = 2.5 MB a topic x 64], at most
  2 MB each; about 1.12 GB in all, against 490 MB.
- Against top session 2's estimate (1.3 B, 1.0-1.6; cap about 1.7 B): the maps (99 M) and a closing 87 M larger (more
  parts to sample, fold and read) were not in it.

## 4. Not done or not checked
- No change applied, no test run on the new scripts, no commit (the window limit). Nothing downloaded, no web request.
- Per-unit figures are R3's (n = 4 lanes, 39 readers); maps and the closing's scaling are computed, not measured; the
  map's prior reader and a part's five web readers are not separated in R3 (one prior a lane of about ten readers).
- The meter basis: r57-0175 says the meter follows fresh tokens; the run's gate keeps r57-0170's all-token 62 M.
- Keys named by no map (between fields), ListAgents and SendMessage between sessions, whether helpers of helpers count
  in the 20, TaskStop on a helper's own helpers: not known.

## 5. State
Done: reading, design (D1-D7), numbers (section 3). Next, for a successor (about 8-12 M [e]): apply section 1 in this
order, committing each through `node C:/research-runs/2026-11-harness-leads/tools/commit.mjs "<message>" <paths>`:
tools 1-3 with tests (`node --test tools/*.test.mjs`, 29 pass today), fill.mjs (item 4; check on a scratch copy for
f2a and f5), MAP.md and topics.md, FIELD.md and the templates (7-9), the F1 move (10), COORDINATOR.md, CLOSING.md,
SHEET.md, CLAUDE.md, DOWNLOADS.md, GO.md, README, config, TOP.md (11-15); then fill this file's section 1 with the
commits. This helper's tokens: 4.3 M at 31 calls, context 235 K.
