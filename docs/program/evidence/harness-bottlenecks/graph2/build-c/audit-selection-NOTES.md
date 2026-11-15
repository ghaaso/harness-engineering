# audit/selection: audit of scoring, selection and held-out readiness (2026-11-12, night)

Auditor lane. It reads sealed/ and audit/. Nothing ran on HELD-OUT. Every arm run was inside graphtest:1
(6 CPUs, 4 GB). Stores were on the container filesystem or on this lane's own volume `gt-audsel`, which
was removed afterwards. The repository was only read. Per-task scores stay in this folder
(`scores/`). tmp/audit-selection/ holds only task-id lists and answer files.

## Verdict

**The test is not ready for its held-out run.** The scoring is correct and the selection follows the
written rule exactly. The answers are correct and reproducible. Two harness gaps must be fixed first,
and the orchestrator has one decision to make:
1. **Blocker.** The frozen record is keyed by configuration hash only, so held-out runs of the
   LadybugDB and DuckPGQ arms are refused ("frozen for arm relational").
2. **Blocker for H4.** No TQ implementation is frozen (`results/frozen` has no `tq-<arm>.json`), so
   held-out TQ is refused for every arm.
3. **Decision.** The tie-break by configuration name chose `hops=4`, the weakest of the tied
   configurations. This biases H3; see defect D3.

## Checks and results

1. **Scoring.** `myscore.js` is my own scorer, written from addendum 2 section A. It does not use
   score.js. It reads the packed `shown` lines; in snippet form these are one span `[first, last]`, as
   `packer.js` lines 71-75 document. On 40 sampled TUNE T1 answers (6 arms, stage 1 and stage 2, seed
   20261112), it agrees with the grader on 40 of 40. 35 of them have a primary; 5 use the paths form,
   which has no primary. Across every T1 answer of the 6 arms (99,680 task rows), recall at 2,000,
   4,000, 8,000 and 16,000 tokens and the tokens used agree in every row. So do the per-configuration
   primary, its standard error (over commits, n-1) and the median tokens, in all 256 configurations.
   Files: `scoring_check.json`, `compare_grader.js`, `scores/`.
2. **Selection.** `myselect.js` uses my own complexity function from addendum 3 item 10, applied to my
   own tables. It gives the same choice as the grader for all six arms. The choice does not change
   under any of the open readings tested: depth taken from the hop limit alone, seedImports not
   counted, `co` not counted (`sel_v_*.json`). Each swept arm has 60 configurations (40 in stage 1 and
   20 in stage 2) and each floor has 8. The list hashes equal the grader's. Every stage-2 list was
   written (22:57 to 23:06 local) after the tuner tables (22:49) and before any stage-2 score
   (23:25). In each frozen file, the configuration hashes to its own name and equals the chosen
   list entry.
3. **Tuner hygiene.** `results/tuner/` holds one 40-row table per arm. The tables contain aggregates
   only: no task ids, no commit SHAs and no repository paths. The stage-2 lists and the arms'
   NOTES.md show no sign that another arm's table or sealed content was used. The near-identical
   ideas in the relational and DuckPGQ lists are expected, because their stage-1 tables are the same
   on shared configurations. One finding fails the check, though: the four arm NOTES.md files hold
   their own arm's aggregate TUNE scores (defect D5). No other file under arms/ or results/ holds
   scores. (`results/relational/stage2/selftest.log` holds synthetic self-test values only.)
4. **Stage-2 correctness.** I ran 100 seeded random TUNE tasks per arm through `sweep.js --stage 2`
   against the reference arm (`run_s2xc2.sh`, `s2xc_<arm>.json`). The specification entries were 19
   for relational, 16 for LadybugDB and 18 for DuckPGQ. Against the reference arm:
   - Relational: 1,900 strict comparisons, 0 failures.
   - LadybugDB: 1,600 equivalence comparisons, 0 failures.
   - DuckPGQ: 1,800 equivalence comparisons, 0 failures.
   - Packed answer content (`meta` set aside): identical in all 5,300.

   The fresh answers also equal the stored stage-2 answers in all 20 entries:
   - Relational: 2,000 of 2,000.
   - LadybugDB: 2,000 of 2,000.
   - DuckPGQ: 1,998 of 2,000. In the other 2, one stored score differs at the 12th decimal; the
     shown content is identical.

   Toy hand check of every arm-only mode (`toy_modes.js`, `toy_modes.json`, on toy graphs of my own):
   - `x_wsp` in relational, LadybugDB and DuckPGQ: right, with no hub cut and with an in-degree hub
     cut where the cheapest path would pass a blocked node.
   - LadybugDB `x_core` at k = 1 and k = 2: right.
   - LadybugDB `x_comm`, alone and in a hybrid with PPR: right.
   - DuckPGQ `x_ppr_lift`: the order is right. Its values are a uniform 1.0186 times mine, because the
     engine's PageRank scale differs. This cannot change an order.

   13 of the 14 checks pass exactly. The fourteenth is that uniform scale.
5. **Reproducibility.** I made three from-scratch store builds per graph arm and ran the frozen
   `hops=4` on 30 seeded TUNE T1 tasks each time (`run_repro.sh`, `repro_<arm>.json`). The three
   builds are identical to each other and to the stored answers: LadybugDB 30 of 30 and DuckPGQ 30 of
   30. LadybugDB's stored-community configuration (`ppr+x_comm`) is also 30 of 30 identical across the
   three builds and the stored answers. The prior folder (54 files) was unchanged.
6. **Held-out discipline.** `heldout_scan.js` scanned 4,580 result, answer, score and log files under
   results/, tmp/, sealed/grader/, audit/ and arms/. None holds a held-out split string or a held-out
   task id, and no TQ answer file holds a held-out question. `lock_check.js` made 42 held-out attempts
   without the frozen hash, across all 7 arms and TQ. All 42 were refused before any task was read,
   and no file was written.

## Defects (graded)

| id | grade | defect | fix |
|---|---|---|---|
| D1 | blocks the held-out run | `run.js freeze` writes `results/frozen/<hash>.json` and keeps the first writer (run.js line 140). `checkSplit` (harness.js line 26) refuses an arm the record does not name. Relational, LadybugDB and DuckPGQ share hash 6b70cc1222745385, so LadybugDB and DuckPGQ cannot run held-out. | Key the record by (arm, hash), for example `frozen/<arm>/<hash>.json`, and read that path in checkSplit. Then re-freeze those two arms. |
| D2 | blocks the held-out run (H4) | No `tq-<arm>.json` exists, so `run.js tq --split heldout --allow-heldout` is refused for all four arms. Also, `tqImplHash` covers only `arms/<arm>/*.js`, not the shared code. | Run `run.js freeze-tq` for every arm. Optionally include `arms/common/*.js` in the hash. |
| D3 | biases a result (H3) | The written rule chose `hops=4` (T1 TUNE primary 0.7681). Within one standard error the lowest complexity is 2, with 15 relational, 11 LadybugDB and 10 DuckPGQ ties. All of them use 7,999 tokens, so the token tie-measure is inert and the name decides: "hops=4" sorts before "hops=null" ('4' < 'n'). `hops=4` is the lowest primary of every tied set. `hops=null` (the stage-1 best) scores 0.7843 and `s2 hops=null rank=degnorm` scores 0.7853. The cost is about 0.017 recall (0.6 standard errors) to the typed arms in H3 against search and the floors. H1 and H2 are not affected. The name order also places every "s2"-prefixed stage-2 entry after the stage-1 names. Other tie measures would pick a better entry in all three typed arms, but not one shared entry: the higher primary picks degnorm in all three; median tokens to 80 % recall picks base+membership (relational), degnorm (LadybugDB) and bfs (DuckPGQ). | The orchestrator decides before held-out. Either keep the rule and declare the TUNE gap, or amend the tie measure for every arm alike, stating that the amendment was made after TUNE tables existed. |
| D4 | minor | The H1 graph arm tie rule ("then ladybug", stage2/preview.js line 18) is the grader's own. Protocol E.13 declares none, so the grader's notes are wrong to call it "declared". It has no numeric effect, because the answers are identical. | Declare the H1 tie rule in an addendum before held-out. |
| D5 | minor | arms/{relational,ladybug,duckpgq,search}/NOTES.md hold their own arm's aggregate TUNE scores (copied from the tuner tables) in folders every lane can read. results/tuner/ also puts all four tables in one shared folder. No per-task or reference content is involved. | Move those score paragraphs to results/tuner or sealed/. |
| D6 | minor | The freeze records a configuration but not the arm code, so code edits after the freeze would go unseen. Every arm file is older than the freeze (23:27), and the fresh answers equal the stored ones. | Record a code hash at freeze, as freeze-tq does. |
| D7 | minor | DuckPGQ scores are not bit-stable at 1e-12 (multi-threaded sums): 2 of 2,000 fresh answers differ only in a last digit. | Report it; order differences need ties within 1e-12. |
| D8 | biases a result (H5) | The engine-timing preconditions are not met. See below. | Meet the preconditions before the quiet-machine run. |

## Engine-timing readiness (addendum 2 E.22, addendum 3 C.6, C.7)

| must be true | state |
|---|---|
| Quiet machine, one arm at a time | **Not met.** Three unrelated containers (an app, Postgres, Redis) have run on the same Docker host for more than 10 hours. |
| Stores on the container filesystem or a volume | Met. The benches use /store volumes. |
| The frozen query class is timed (k-hop 4 + PPR, restart 0.3, co-change weight 1) | **Not met.** The LadybugDB and DuckPGQ benches time k-hop 1, 3, 6 and unbounded, and PPR at 2 hops or unbounded. None times hops=4 + PPR. |
| Relational measures current | **Not met.** Only `results/_phaseA_old/engine/relational.json` exists. `relational/bench.js` was not re-run. |
| Client overhead apart from engine time | LadybugDB is met: it samples in-process inside its bench child, with no IPC per query. DuckPGQ is **not met**: its NOTES (line 300) say engine_ms includes 10 to 20 statement round trips per rank call. |
| Application-code caches named | Met. LadybugDB names its cached PPR transition CSR and reports first_call and warm_uncached. DuckPGQ names its TEMP-table connection caches (meta.setup_ms). |
| Thread settings declared | Declared, but not equal: LadybugDB uses 1 thread per query (measured faster), DuckPGQ 6 (C.6), SQLite 1. Report each, or time both 1 and 6. |
| DuckPGQ k-hop bounded at the hop limit; property graph stored once | Met, per its NOTES. The bounded k-hop of the frozen class is plain recursive SQL, not a PGQ routine. H5 must label it so. LadybugDB's PPR iterations run in application code and need the same label. |

## Fairness in plain words

- No arm was denied an option. Every arm had 60 configurations, the same padding and the same packer.
  The mode catalogue was open to all. The relational arm added `x_wsp` in SQL and did not add the
  three other arm-only modes. That was its tuner's choice, and none of those modes was selected.
- The relational arm has every specified mode that the graph arms used: all spec entries
  cross-check, with 0 failures.
- The frozen typed configuration is the weakest of its tie set (D3). That is a weak choice against
  its own table, made by the written rule and not by design. It hits all three typed arms alike.
- On TUNE, the graph arms' best native entry (`ppr+x_comm`, 0.7862) beats the best specification
  entry (0.7853) by only 0.0009. Choosing it would not change H1.
- The frozen search configuration is plausible as what a careful agent does: one round of text
  search for the seed's names plus its imports, then the co-change and directory tail. It costs a
  median of 7 lookups. Its TUNE primary, 0.7593, is 0.005 below its best configuration.
- H1 and H2 are exactly 0 by construction (addendum 3 F.21). The engines then differ only on H5.

## Files

`myscore.js`, `compare_grader.js`, `scoring_check.json`, `scores/` (my tables and per-task values),
`myselect.js`, `selection_mine.json`, `sel_v_*.json`, `heldout_scan.js/.json`, `lock_check.js/.json`,
`run_s2xc2.sh` (`run_s2xc.sh` is the first form, which collided on a shared scratch folder and was
replaced), `cmp_answers.js`, `s2xc_<arm>.json`, `run_repro.sh`, `repro_<arm>.json`,
`toy_modes.js/.json`. Task samples and fresh answers are in tmp/audit-selection/.

Re-run (from build/): `node audit/selection/myscore.js . audit/selection/scores`; then
`node audit/selection/compare_grader.js . audit/selection/scores`; then
`node audit/selection/myselect.js . audit/selection/scores`. The container checks run as
`docker run ... graphtest:1 bash -lc "bash /build/audit/selection/run_s2xc2.sh <arm>"` (and the same
for `run_repro.sh`, `toy_modes.js`, `lock_check.js`).
