# sealed/grader: grader lane, stage 2 and selection (2026-11-12, late night)

Nothing ran on HELD-OUT. Everything below is TUNE only. The stage-1 notes follow unchanged after this section.

## S2.1 Files (new)

| path | content |
|---|---|
| `stage2/inventory2.js`, `inventory2.json` | Stage-2 answer-file check, stage-1 lists and files unchanged, cross-arm identity over stage 1 and 2. |
| `stage2/diffcheck.js` | Shows how two arms' answers of one configuration hash differ. |
| `stage2/score_arm2.js` | Copy of `stage1/score_arm.js` reading the stage-2 list. Writes `stage2/<arm>.{summary.json,clusters.jsonl,tasks.jsonl.gz}`. |
| `stage2/select.js` -> `selection.json` | The selection rule, every arm. |
| `dkf.sh` | Like `dk.sh`, but `results/frozen` is writable and `GT_RESULTS` is the default, for `run.js freeze`. |
| `stage2/preview.js` -> `stage2/preview.json` | The tuning-set preview, paired bootstrap with `arms/common/compare.js`. |
| `stage2/tq/<arm>.tq.json` | TQ re-scored from a fresh TUNE re-run (`tmp/grader/results/tq/`). |
| `complexity.js` | One addition: the search field `co` adds one ranking part, and `fuse` adds nothing. No stage-1 entry has `co`, and all 160 stage-1 complexities are unchanged. |

## S2.2 Stage-2 answers (inventory2.json: 0 problems)

- Relational, search, LadybugDB and DuckPGQ each have exactly 20 stage-2 configurations. The list hashes are relational 52b3f69b93f01360, search afba6dde623aa616, ladybug f8b75c2a4dcfd6a1 and duckpgq 06ca0b6d351fdcf1, and each equals the hash in that arm's stage-2 sweep summaries. Each arm has 60 files and 15,440 answers (T1 7,760, T1x 2,880, T2 4,800). Each file holds every TUNE task of its set exactly once, and every file is newer than the facts. The stage-1 lists and stage-1 answer files have not changed since stage-1 grading.
- Stored answers of identical configuration hashes, over stages 1 and 2:
  - Relational vs LadybugDB: 44 configurations, all 33,968 answers identical.
  - Relational vs DuckPGQ: 44 configurations, 33,962 of 33,968 identical. The other 6 answers (in 3 configurations) differ only by one stored score of 0.01059323928 against 0.010593239279, a 1e-12 rounding difference. The items and their order are the same.
  - The three independent x_wsp implementations (relational SQL, LadybugDB, DuckPGQ) give identical answers.
- Scoring was done exactly as in stage 1: `arms/common/score.js`, rule content, `refs_tune.jsonl`. It found 0 missing references and 0 zero-unit references. `score.js` was last changed at 16:26, before stage 1.

## S2.3 Selection (selection.json)

The rule is the highest T1 TUNE primary. Then, among configurations with a primary of at least the best primary minus the best configuration's standard error, the lowest complexity wins. Ties go to the lower median tokens of the 8,000-token answer, then to the configuration name. Candidates are content-form configurations: 58 for relational, 58 for search, 59 for ladybug, 59 for duckpgq and 4 for each floor. Paths and range forms have no primary.

| arm | best (T1 primary +- se) | chosen | chosen primary | cx | median tokens |
|---|---|---|---|---|---|
| relational | s2: hops=null rank=degnorm 0.7853 +- 0.0254 | hops=4 (6b70cc1222745385) | 0.7681 | 2 | 7,999 |
| ladybug | s2 hops=null native rank=hybrid ppr+x_comm 0.7862 +- 0.0255 | hops=4 (6b70cc1222745385) | 0.7681 | 2 | 7,999 |
| duckpgq | s2: hops=null + rank=degnorm 0.7853 +- 0.0254 | hops=4 (6b70cc1222745385) | 0.7681 | 2 | 7,999 |
| search | pad=CO co rrf rounds=1 0.7644 +- 0.0269 | pad=CO rounds=1 routes=off (e70177e5807f0252) | 0.7593 | 3 | 7,999 |
| floor-dir | gran=file form=signature 0.7191 +- 0.0272 | same (714a474060653c1f) | 0.7191 | 1 | 7,999 |
| floor-co | gran=file form=signature 0.7521 +- 0.0279 | same (c4d2f0a60a3d199c) | 0.7521 | 1 | 7,999 |

The configuration NAME decided the three typed arms. Within one standard error, the lowest complexity is 2. At complexity 2, 15 relational, 11 LadybugDB and 10 DuckPGQ configurations tie, and all of them have a median of 7,999 tokens. "hops=4" sorts first by name. It is the weakest of the tied set on primary (0.768 against 0.785 for hops=null rank=degnorm), on area under the curve (0.678 against up to 0.698) and on median tokens to 80 % recall (7,212 against about 6,100 to 7,400). The tie measure the rule names does not separate them, as the stage-1 notes warned. For the H1/H2 comparisons this costs nothing, because all three typed arms chose the same configuration. For H3 it costs the typed arms about 0.017 against search and the floors, compared with what the best tied configuration scores on TUNE. Other choices that do not depend on these issues: the x_wsp complexity (2 or 3) and the search `co` count (+1 or 0) do not change any choice.

Complexities differ from some tuners' own counts: the LadybugDB x_core entry is 3 here, and the DuckPGQ x_ppr_lift entry is 4 here (2 ranking parts). Neither entry was chosen either way.

## S2.4 Freeze

`dkf.sh` ran `run.js freeze` for all six arms. `results/frozen/` now holds 4 harness records, because relational, ladybug and duckpgq share hash 6b70cc1222745385 and the harness keys records by hash and keeps the first writer (relational). `harness.js checkSplit` will therefore refuse a ladybug or duckpgq held-out run until the harness keys records by (arm, hash). The harness lane must fix this (see `results/frozen/NOTES.md` and `by_arm.json`).

The frozen configuration hops=4 follows the shared specification in all three typed arms. Its 772 answers are identical across relational, reference, ladybug and duckpgq: 2,316 of 2,316 comparisons. No frozen configuration uses an engine-only mode or LadybugDB's stored community prior, so the four-draw spread rule of addendum 3 B.5 does not apply. Median engine-reported lookups per T1 answer are 1 for the typed arms, 7 for search (including the 2 lookups of the CO tail), 1 for floor-dir and 2 for floor-co.

## S2.5 Tuning-set preview (OPTIMISTIC: selected on the same tasks; stage2/preview.json)

The H1 graph arm is ladybug. Both graph arms froze hops=4 with T1 primary 0.7681 and 7,999 tokens, and the declared tie rule names ladybug. The comparisons use a paired cluster bootstrap over commits with 10,000 resamples and seed 20261112. Each difference is A - B with its 95 % interval.

- Ladybug - relational and duckpgq - relational: exactly 0 on every set and metric, because the answers are identical (addendum 3 F.21).
- Ladybug and relational (the same numbers for both), against each baseline:
  - Against search: T1 primary +0.009 [-0.023, 0.041], T1x -0.092 [-0.167, -0.025], T2 +0.032 [-0.030, 0.093].
  - Against floor-dir: T1 +0.049 [0.012, 0.086], T1x -0.048 [-0.132, 0.030], T2 +0.141 [0.060, 0.224].
  - Against floor-co: T1 +0.016 [-0.019, 0.051], T1x -0.092 [-0.170, -0.021], T2 +0.036 [-0.025, 0.097].
- Recall at 2,000 tokens on T1: +0.026 against search, +0.083 against floor-dir and +0.038 against floor-co. Only the floor-dir interval excludes 0.
- Area under the curve on T1: +0.003, +0.042 and +0.007. Again only the floor-dir interval excludes 0.

## S2.6 Questions (TUNE, 20), re-run with the current code

The TUNE questions were re-run inside graphtest:1 into `tmp/grader/results/tq/`. All 80 answers are identical to the stored ones once the timing fields are set aside, and the scores are unchanged.

| arm | macro F1 | macro precision | macro recall | micro F1 | without the judgement items, macro F1 | median tokens |
|---|---|---|---|---|---|---|
| relational, ladybug, duckpgq | 0.810 | 0.847 | 0.804 | 0.755 | 0.818 | 35 |
| search | 0.741 | 0.743 | 0.833 | 0.705 | 0.749 | 2,577 |

---

# sealed/grader: grader lane, stage 1 (2026-11-12, night)

Grader only. Arm builders never read this folder. Everything here ran on TUNE only; nothing was
run on HELD-OUT, and nothing was selected or frozen. Copies of reference content, per-task and
per-commit scores stay in this folder; results/tuner/ holds aggregates per configuration only.

## Files

| path | content |
|---|---|
| `dk.sh` | Runs a command in graphtest:1 (6 CPUs, 4 GB). /build is mounted read-only, `sealed/` is hidden behind an empty tmpfs so arm code never sees references, `sealed/grader` is `/out`, stores and the source store are on the grader's own volume `gt-grader` (fresh builds, not the builders' stores). |
| `lists.js` | Prints every arm's stage-1 list and list hash without logging (`--json`). |
| `complexity.js` | Addendum 3 item 10, written once; reused for stage 2 and selection (rule in its header). |
| `refs_tune.jsonl` | The 772 TUNE lines of `sealed/references.jsonl` (T1 388, T1x 144, T2 240); the only reference file the scorer was given. |
| `gate/gate.js` | The four-arm gate (strata A, B, C; `--focus` supplement). Outputs `gate.json`, `gate.rows.jsonl`, `gate.pairs.jsonl`, and the same with `_focus`. |
| `gate/replay.js`, `replay.json` | Currency check: 24 stored stage-1 answers per arm re-run on the current facts. |
| `stage1/inventory.js`, `inventory.json` | Answer-file inventory and cross-arm identity on shared configuration hashes. |
| `stage1/score_arm.js` | Runs `arms/common/score.js` (rule content) per arm; writes `<arm>.summary.json`, `<arm>.clusters.jsonl` (per-commit values), `<arm>.tasks.jsonl.gz` (per-task values). Arms: relational, reference, search, ladybug, duckpgq, floor-dir, floor-co. |
| `stage1/handcheck.js`, `handcheck.txt` | Three answers re-scored by hand. |
| `stage1/tables.js` | Writes `results/tuner/<arm>.stage1.{json,md}` (relational, search, ladybug, duckpgq) and `stage1/leaderboard.json`. |
| `tq/` | TUNE question references (`tq_reference_tune.jsonl`), the TUNE judgement items (`judgement_tune.json`), and `<arm>.tq.json` (full tq_score.js output with per-question values). |

How to re-run (from build/): `bash sealed/grader/dk.sh "cd /out/gate && node gate.js --n 300 --out /out/gate"`;
`... node gate.js --focus --n 150 --seed 20261122 --out /out/gate`; `... node replay.js --out /out/gate`;
on the host (pure computation, no arm runs): `node sealed/grader/stage1/inventory.js > inventory.json`,
`node sealed/grader/stage1/score_arm.js <arm>`, `node sealed/grader/stage1/tables.js`,
`node arms/common/tq_score.js --answers results/tq/<arm>.tune.answers.jsonl --refs sealed/grader/tq/tq_reference_tune.jsonl --split tune --judgement sealed/grader/tq/judgement_tune.json --out sealed/grader/tq/<arm>.tq.json`.

## 1. Gate (gate_ok = true)

Main draw, seed 20261120, 300 (configuration, TUNE task) pairs over 45 parent commits, 207 s wall:
- stratum A, 120 pairs: metapath traversals, every direction (dependents, dependencies, both) x four
  ranking cells (degnorm alone; hybrid containing degnorm; hybrid without degnorm; one other single
  ranking), about 10 pairs per cell; steps lean against the configured direction half the time and
  draw rare kinds (enqueues_kind, kind_handled_by, registers_job, runs, navigates, returns_model,
  has_field, reads_response_field, overrides, passes_callable, inherits, uses_constant) or the
  never-loaded class `experimental` about a third of the time.
- stratum B, 90 pairs: a specified stage-1 entry of the relational, LadybugDB or DuckPGQ list with
  one or two random one-factor changes (a plausible stage-2 proposal); 20 pairs landed exactly on a
  stage-1 configuration.
- stratum C, 90 pairs: general random (k-hop of 0 to 6 hops or unbounded, budgets, metapaths; all
  rankings; hub none, indeg 0 to 15, transport; minConf 0 to 1; pad none/DIR/CO; all four forms;
  both granularities).
Coverage: traversal k-hop 127, budget 25, metapath 148 pairs; ranking bfs 25, degnorm 43, ppr 98,
cochange 19, text 21, hybrid 94; hub none 180, indeg 57, transport 63; a step with every kind absent
at the commit 57 pairs (45 of them reached nothing); out-degree-0 fallback used in 3 pairs; 114 pairs
reached nothing in all.

Result: relational vs reference 300 of 300 strictly identical (ranked lists and packed answers);
LadybugDB 300 of 300 equivalent, and also 300 of 300 byte-identical ranked lists and identical
answers; DuckPGQ the same, 300 of 300. LadybugDB's native typed path pattern variant on the 148
metapath pairs: 148 equivalent (140 byte-identical; the rest differ only in the explanation path,
which the equivalence rule allows). Errors 0.

Focused supplement, seed 20261122, 150 pairs over 41 parents, drawn with the harness's own focused
generator (metapath, direction dependents or dependencies, degnorm alone or in a hybrid): 0
failures in all three arms (150 of 150 identical each), pattern variant 150 of 150 equivalent (139
byte-identical); the out-degree-0 fallback was used in 16 pairs, an absent step occurred in 43 pairs.

## 2. Answer files (all current)

`stage1/inventory.json`: 0 problems. Every arm has one file per (configuration, set): relational,
reference, search, ladybug, duckpgq 120 files and 30,880 answers each; floor-dir and floor-co 24 files
and 6,176 answers each. Each file holds every TUNE task of its set exactly once (T1 388, T1x 144, T2
240), split tune only, the right config_hash, arm and parent; no extra files. List hashes recomputed
now equal the ones in the sweep summaries: relational 5efda93e9c470eb9, search ef02c4a27f96928a,
ladybug 62916d71ad487af9, duckpgq 0cef37d35583a845, floor-dir 4d36e676b1fde233, floor-co
43b5798d088ac9ea. All 53 TUNE parents' facts carry extractor 59da7b753a4d908e and were written
(16:33 local) before every answer file (21:17 to 22:08 local). Replay: 24 stored answers per arm
re-run on the current facts in fresh stores gave identical packed answers, 144 of 144.

Cross-arm identity of stored answers on shared configuration hashes: relational vs reference 40
configurations, 30,880 of 30,880 identical; relational vs LadybugDB 32 configurations, 24,704 of
24,704 identical; relational vs DuckPGQ 31 configurations, 23,932 answers, 23,928 identical; the 4
others (2 configurations x 2 tasks) differ only by one stored score of 0.019925463235 vs ...236
(1e-12 rounding); every shown item and the order are the same, so every score is identical.
LadybugDB vs DuckPGQ: 33 shared, including the two x_wsp entries both engines implement
independently: all identical apart from the same 4 rounding records.

## 3. Scoring

score.js, rule content, refs_tune.jsonl: 0 missing references, 0 zero-unit references. Hand check
(`stage1/handcheck.txt`), independent code and reading: relational base T1-0361 recall@8000 1.0
(2 of 2 files, 2 of 2 definitions); search pad=CO T2-0162 0.5 (2 of 4 files, 1 of 2 definitions);
ladybug gran=symbol T1x-0034 0.6667 (4 of 5 files, 0 of 1 definitions). All three equal score.js.

## 4. Leaderboard (T1 primary, recall in the 8,000-token answer, mean over commits +- standard error)

| arm | best (T1) | primary | base primary |
|---|---|---|---|
| relational = ladybug = duckpgq | hops=null | 0.784 +- 0.026 | 0.664 +- 0.033 |
| search | pad=CO | 0.739 +- 0.026 | 0.502 +- 0.029 |
| floor-co | file signature | 0.752 +- 0.028 | - |
| floor-dir | file signature | 0.719 +- 0.027 | - |

Full table per set in `stage1/leaderboard.json`.

## 5. Questions (TUNE, 20 questions)

relational, ladybug, duckpgq give the same 20 answers: macro F1 0.811 (precision 0.847, recall
0.804), micro F1 0.755, 52.7 tokens and 1 lookup per question on average. search: macro F1 0.742
(precision 0.743, recall 0.833), micro F1 0.705, 2,743 tokens and 2.3 lookups on average. Without
the judgement items: typed stores 0.818 macro F1, search 0.749. Only 5 of the 12 shared judgement
items fall on TUNE questions (Q3 CLAUDE.md:L191 excluded; Q12 syncClassification.ts::failureReason
included; Q18 CLAUDE.md:L199 and L224 included; Q20 ops-server.mjs::backendOps excluded); the other 7
are on held-out questions 21, 25, 31 and 39 and were not used.

## Limits and open points

- Engine milliseconds in the tables come from the builders' sweeps (several processes at once); they
  are not engine measures.
- The parsimony tie-break (lower median token use) does not separate the top configurations: almost
  every content configuration that fills its answer uses 7,999 tokens at the 8,000 budget, so ties
  fall through to the configuration name. The orchestrator may want a different tie measure before
  selection (for example tokens to 80 % recall or the unpadded head's tokens).
- complexity.js choices that the addendum leaves open: depth uses the effective cap (budget sum,
  metapath sum of step maxima); x_ rankings that fuse PPR with a second signal count 2 parts; the
  search arm's seedImports counts as import following (as does followImports, once).
