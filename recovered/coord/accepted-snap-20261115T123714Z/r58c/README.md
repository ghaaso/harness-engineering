# r58c: tests for selection-freeze-8 and ruling 64, and a draft AUDIT.md / CLAIMS.md writer

Written 2026-11-14 against the current bytes. **Nothing here has been run.** No file outside `r58c/` was written.

| file | sha256 |
|---|---|
| `tests/test_selection_freeze8.py` | `22a85a2f0507a426de0374cfceed5c2f0977aae3207ae2e886d4ea60584171c8` |
| `tests/test_r64.py` | `40412721b2e4589f5535b24584b7ad56a824b15a457b8ff95bb246ea88d76378` |
| `write_audit_claims.py` | `49de5bf4e76d1ee33919cc9a105f0fcf930628b719a3f8806d6649e34ef45aa6` |

This README cannot list its own hash.

The tests were written against these bytes:

- `train/selectB.py` `3a3d32956502...`
- `train/report.py` `a190dbeabba0...`
- `train/item27.py` `982c97eabdd8...`
- `train/write_result.py` `9bea9131d0e9...` (the writer pins this one in full)
- `train/leak_audit.py` `6725c5ee454b...`
- `eval/evalcore.py` `4054976ce935...`

## What each file covers

The finding's `fix` text for selection-freeze-8 asks for four tests. Here is where each one is covered.

| finding text | covered by | checks |
|---|---|---|
| "perturbing the late-50 scores of block k leaves the choices of blocks 1..k unchanged" | `test_selection_freeze8.py` part A | **A1** (deterministic): c03 gains scores on blocks 3-5 only. Checks: blocks 1-3 are byte-identical (the rule-53 records and the builder's sensitivity records); their fused rows are identical; blocks 4 and 5 and the all-65 choice move to the hand values 5/45, 10/55 and 15/65, so the test is not vacuous. **A2** (hashed noise): for every k = 1..5, only blocks k..5 change and blocks 1..k stay byte-identical. |
| "earlier_commits equals [15,25,35,45,55]" | part B | The recorded `earlier_commits` values. Each block's commits are the date-ordered late-50 slice; tasks are listed in reverse and named out of date order, so only `date_order` can give these slices. The block-4 mean is 5/45, which proves block 4 did not see its own commits (they were perturbed too). Also: the pilot-only commits are left out (ruling 56), and every block has 9 candidates. |
| "item27.arm_choice calls the same selectB.choose ... circular" | part C | Five arms are built so that every per-commit value is 0, 0.5 or 1.0. Each arm's candidate means, the SE, ruling 53/64's pick and best, and ruling 57's arm choice are written in the test as numbers derived by hand. The derivation is in the comments. `item27.main --test` (explicit paths under `R58_OUT`) is checked against them, and so is `selectB.run`'s `final_all65`. Neither is checked against `choose()`. E3 is a ruling-64 case: the pick changes if the band is measured from the smaller tied SE. The arm choice is a four-decimal tie, E2 = E4 = 0.1, which E4 wins as the smaller model. |
| "the item27 --test refusal from selection-freeze-1" | part C, last check | `item27.main(['--test'])` exits 2, and the real `train/heldout/item27.json` existence is unchanged. The full refusal set is already in `train/r58/tests/test_item27.py` (`sf1_r80_refusals`); `r58b/logs/test_item27.log` shows `RESULT PASS item27` on item27.py `982c97...`. |
| "verdict() boundary cases (see selection-freeze-6)" | part D | Already covered by `r58b/logs/test_verdict.log`, which shows `RESULT PASS verdict` on report.py `a190db...`, the current bytes. The test checks that the log still names the current report.py hash. If it does, the verdict cases are skipped. If it does not, the same boundary cases run inline. |
| "verdict() and the Holm labels have no unit test" | part D | Checks: `ec.holm` against hand values (step-down, monotone, capped at 1). For `ec.holm_intervals`: diff = mean, p_raw = the unadjusted bootstrap p, p_holm = the step-down, the level set by p rank (smallest p at 0.99), and each Holm interval contains the 95 % one. The label tuple report.py zips onto the result is checked against holm_intervals' return order, and both files use ruling 62's wording. |
| "test_r64's order-invariance case runs on the current selectB" | `test_r64.py` | **U1**: the earlier test's three-candidate case, in all 6 orders. **U2**: seven candidates with a three-way exact tie. The band is taken from the largest tied SE, and the pick (c01, 0.25) holds in all 5,040 orders. The pick from a smaller SE would differ; the `w` tie-break is exercised. **U3**: two tied candidates share the largest SE; `best` goes to the lower config id, and the pick is unchanged in 720 orders. **S**: `selectB.run` end to end on a fake lane where c02 and c03 tie exactly in every block and on all 65. The block picks (c02, then c01 four times) and the final pick (c01) are checked against hand values. Seven runs (six plan orders of the configurations, one with the task list shuffled) must give identical choices, bests and candidate statistics. |

All data in both tests is synthetic:

- 65 commits, one task each, with 100 candidates and 10 truth files.
- PPR ranks the truth last and CO is empty.
- A table that scores T1..Tk gives a fused pool P@10 of 0 at w = 0.25, min(k, 2)/10 at w = 0.5, and k/10 at w = 1. The derivation is in the test docstring.

No real stage-B table, tune task, tune truth, held-out file or `sealed/` path is read. The only real files read are:

- code;
- `train/stageB/plan.json`, for its plan_hash only, inside item27's ruling-80 guard;
- `r58b/logs/test_verdict.log`.

Both tests refuse to start (exit 2) unless `R58_OUT` lies under `r58c/`.

### `write_audit_claims.py` (audit-result-6, a DRAFT)

**AUDIT.md**, in this order:

1. The leak table from `leak_audit.json`, every checkpoint at full sha, with ruling 35's disclosure word for word from the protocol, and items 18 and 60 quoted.
2. The mount audit of rulings 60, 72 and 78: every mount row, ruling 78's staged-input result, coverage, and where eval/ is mounted.
3. Ruling 72's full eval/ list, walked here: every file including `pilot_rows.tsv`, with class, bytes, full sha256 and why it is truth. Each file is compared with `leak_audit.json`'s `eval_files`.
4. Ruling 72's code lines, as file:line found by pattern in the current bytes. Sources:
   - **stageB.py:** `load_tasks` reads `tune_tasks.jsonl`; `kge.train(arm, c['cfg'], seed, C, ...)`; `score_tasks`; and `kge.score(reps_path, [(tid, t['seed'], cands...)], t['parent'])`.
   - **kge.py:** the `train` and `score` signatures, and the docstring for `rows`.
   - **heldout.py:** the task fields and the truth-key refusal.
   - **evalcore.py:** `candidates`.

   Also listed: every file-read site of kge.py and stageB.py (not only lines with a keyword and `open(`), and a truth-key scan.
5. Item 22 evidence, when `item22.json` exists:
   - an injection failure is printed as `injection FAILED`;
   - the reciprocal relation is labelled as item22.py's description, not a check;
   - E4 is worded as ruling 74 words it;
   - the RUNLOG note that CO's figure is a floor by construction is cited by line.
6. The item-27 freeze: the record against its `.sha256` file, `tables_digest`, and HANDOFF.json's hash and `freeze_sha256`.
7. The assemble_checks PASS log against the current `assemble_checks.py` and tables digest.
8. Rulings 47 and 69, word for word.

**CLAIMS.md**: one row per claim in RESULT.md. Each row gives the RESULT.md line, the claim as printed, the source file, that file's sha256, the key (a JSON pointer), the value and a status.

Table cells are matched cell by cell. Lines that carry several values must equal the line write_result would print. Every remaining non-blank line is listed as a write_result.py literal.

Before any claim is mapped, `write_result.build()` is run on the cited input bytes and must reproduce RESULT.md line for line. Paths of missing inputs are reduced to their basenames for that comparison.

**Named refusals.** Each exit happens before anything is written, except that test mode writes CLAIMS.md first and then exits 24.

| exit | name |
|---|---|
| 2 | USAGE |
| 20 | MISSING_INPUT |
| 21 | TEST_MARKER |
| 22 | PLAN_HASH |
| 23 | SOURCE_HASH |
| 24 | CLAIM_NOT_IN_RESULT |
| 25 | EVAL_LISTING |
| 26 | CODE_EVIDENCE |
| 27 | WRITER_PIN |
| 28 | OUTDIR |
| 29 | LEAK_AUDIT_FAIL |
| 30 | RESULT_NOT_REPRODUCED |
| 31 | REAL_INPUT_IN_TEST |
| 32 | PROTOCOL_TEXT |
| 33 | FREEZE_HASH |

**Real mode** reads fixed paths only and requires an explicit `--outdir`. Nothing is written to the deliverable folder by default.

**`--test`** writes only to `r58c/out/<name>/` and refuses inputs under the real `train/report`, `train/leak_audit`, `train/heldout`, `train/stageB` or the deliverable folder.

The header lists the inputs and eight open questions. Open question 1: write_result emits no claim map, so this draft mirrors `build()` at the pinned bytes.

## What it does NOT cover

- **No run, so no evidence yet.** None of the three files has been run. The hand values were checked by hand only. The `RESULT PASS` lines do not exist until a ktest run makes them.
- **No ruling-58 PASS line.** `RUNLOG.md` has none for these tests; nothing here touches RUNLOG.
- **Item 27 test bounds:**
  - seed averaging is exercised exactly in one candidate only (E2 c03, seeds 1.0 / 0.5 / 0.0);
  - w = 0.5 values are never in a band;
  - no case puts two w of one configuration in the band with different means. That case stays covered only by `fixes/tests/test_select_report.py` r53.
- **No plumbing test of `write_audit_claims.py` itself.** Its refusals, the claim map and the reproduce step are untested.
- **Parts of audit-result-6 the writer does not cover:**
  - ruling 69's rerun comparisons are not located;
  - the grader's ruling-73 literal check is not available;
  - mount rows keep leak_audit's six-file cut.
- **audit-result-10 is not fixed.** tune.json and item22.json still carry no test or plan_hash field, so a synthetic tune.json placed at the real path cannot be detected.
- **Not covered here:** selection-freeze-5 (record/.sha256 order) and selection-freeze-7 (stamps). Both are tested in `test_item27.py` and `test_gate.py`.

## The exact command

`r58b/ktest.sh` does not mount `r58c/`, so it cannot run these tests. Use the same launcher rule:

- the name `ktest-N`;
- no other `ktest-*` container running;
- three memgate samples 30 s apart, each with free >= 6 GB and commit < 40 GB (`sh $WB/orchestrator/memgate.sh sample`);
- a wait of at most 900 s, then `docker stop` of this container only.

`r58b/` is mounted read-only (for `test_verdict.log`), and only `r58c/` is writable. Run from Git Bash on the host:

```sh
W=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
REPO=C:/Users/User/Documents/projects/EMS_workshop1
IMGID=$(docker image inspect -f '{{.Id}}' graphtest-kge:1 | tr -d '\r')
MSYS_NO_PATHCONV=1 docker run -d --rm --pull never --name ktest-15 --network none --cpus 2 -m 1536m --memory-swap 1536m \
 -e EMB_ROOT=/w -e KGE_DEVICE=cpu -e OMP_NUM_THREADS=2 -e MKL_NUM_THREADS=2 -e PYTHONUNBUFFERED=1 -e PYTHONDONTWRITEBYTECODE=1 \
 -e HOME=/tmp -e R58_OUT=/w/r58c/out -e FIXFLOW_REPO=/repo \
 -v $W/export:/w/export:ro -v $W/eval:/w/eval:ro -v $W/train:/w/train:ro -v $W/orchestrator:/w/orchestrator:ro \
 -v $W/r58b:/w/r58b:ro -v $W/r58c:/w/r58c -v $REPO:/repo:ro \
 -w /w/train "$IMGID" sh -c 'mkdir -p /w/r58c/logs; : > /w/r58c/logs/summary.txt; for t in test_selection_freeze8 test_r64; do (echo "sha256 $(sha256sum /w/r58c/tests/$t.py | cut -d" " -f1) r58c/tests/$t.py"; timeout 900 python /w/r58c/tests/$t.py) > /w/r58c/logs/$t.log 2>&1; echo "$t rc=$? $(grep "^RESULT" /w/r58c/logs/$t.log | tail -1 | cut -c1-90)" >> /w/r58c/logs/summary.txt; done; echo done >> /w/r58c/logs/summary.txt'
```

Inside the container, the command for each test is `cd /w/train && python /w/r58c/tests/<test>.py`, with `EMB_ROOT=/w` and `R58_OUT=/w/r58c/out`. Logs go to `/w/r58c/logs/<test>.log`. Each log ends with:

- `RESULT PASS selection-freeze-8` or `RESULT FAIL selection-freeze-8`;
- `RESULT PASS r64` or `RESULT FAIL r64`.

The writer's test mode runs in the same container (with `-v $W/r58b:/w/r58b:ro`), on the fake inputs of `train/r58/tests/test_write_result.py`. If those r58b outputs were rewritten after their RESULT.md, it stops with exit 23, which is intended:

```sh
python /w/r58c/write_audit_claims.py --test --name wr_test --result-dir /w/r58b/out/write_result_test \
  --tune /w/r58b/out/fakeB/report/tune.json --item22 /w/r58b/out/item22_test/item22.json \
  --answer /w/r58b/out/answer_test/answer_level.json --leak /w/r58b/out/leak_audit.json \
  --item27 /w/r58b/out/fakeB/heldout/item27.json --plan /w/r58b/out/fakeB/stageB/plan.json
```

Real mode, after the real RESULT.md exists and only on the coordinator's word, uses a writable `--outdir`:

```sh
python /w/r58c/write_audit_claims.py --outdir DIR
```
