# compare.mjs: spec and behaviours to test

Source of truth: `CONTRACT.md` (§1, §3.1-3.4 card/sentence/pack/review, §3.14-3.16, §3.17 plants, §3.18 analysis plan, §3.20, §5 row U5a);
design R39, §11 (Comparison 1 and 2), R20, R53; layer draft L4 E10-E12. The design wins where it differs from L4 (exploratory is
exit 0 with a label, not exit 4).

## Purpose
Blinds and shuffles the arms' outputs for the scorer (`anon`), then computes the frozen plan's outcomes for Comparison 1 (tree against
one session) and Comparison 2 (same-window review against fresh) (`score`). It never decides which arm is better: it prints the counts,
the exact test, the spread and the label the plan fixes. Output is `descriptive, n = 1 per arm` only when the plan is frozen and its
hash matches; otherwise every figure is labelled `exploratory`.

## Command line
`node compare.mjs <anon|score> --root <dir> --ce <n> [flags]` (both modes write, so `--ce` is required).
- `score` optional: `--scorer-transcript <abs path>` (the scorer helper's transcript; must lie under `transcripts_root`, else exit 66 `file-path`);
  `--transcripts-root <dir>` (test seam; default threshold `transcripts_root`); `--dry-run`; `--now`.
- No flag names an arm: the arms come from the frozen plan (below).

## From the contract
The analysis plan carries `arm_tasks: {<arm>: {pack?: "<task>.<step>", review?: "<task>.<step>"}}` (CONTRACT §3.18; arms `T`, `S1`, `S2`: pack
and review; `R_same`, `R1`, `R2`: review only), checked by protocol-freeze (`arm-tasks`), so the arm-to-output mapping is fixed before any
result. `<task>.<step>` is also the name of the commit record file. `views/comparison.json`, `views/blind/index.json` and the scorer's
[scorer-result] `{scores: [...]}` are formatted here (CONTRACT §3.22).

## Reads
Ledger (the last `plan-freeze` or `protocol-amend` line named `analysis-plan`: `path`, `sha256`; count of `protocol-amend` lines named `analysis-plan`; `certificate` lines; `commit`/`admit` lines for
the time span); the plan file; `run/tasks.json`; `store/commits/<task>.<step>.json` and, through them only, the objects (`getObject`, re-checking each
`sha256`); the field's current frozen protocol (`lib.currentProtocol`, for `question_ids`); `store/status/card_status.jsonl` (last line per card);
certificates (`x_` objects whose `subject` is the review id); the transcripts of the arms' tasks (every attempt's session and its helpers, `sessionTranscripts`,
`spendOf`); the scorer's transcript. `sealed/blind/<plan-sha12>.json` (score). Never `sealed/seeds` or `sealed/plants`.

## Plan binding
The plan is **frozen** when the ledger has a `plan-freeze` line, and the file named by the last `plan-freeze` or `protocol-amend` line of name `analysis-plan` (`plan/frozen/analysis-plan-<sha12>.json`) exists and `sha256hex(its bytes)` equals that line's `sha256`.
Frozen: `plan_sha256` set, `label` = `descriptive, n = 1 per arm`. Not frozen, or hash mismatch: the draft `plan/analysis-plan.json` is used, `plan_sha256: null`,
`label: "exploratory"`, reason `plan-not-frozen` or `plan-hash-mismatch`; exit stays 0. No frozen and no draft: exit 2. `anon` needs a frozen plan (exit 2 `plan-not-frozen`):
its key file is named by the plan hash.

## Definitions (every figure is computed from committed objects)
- **Arm output**: for each `arm_tasks` entry, `commit record -> outputs`, the pack object (kind `pack`) and review object (kind `review`). An arm whose commit record is
  absent has `status: "not_run"` and no figures; all arms absent: exit 2.
- **Answered (Y_q)** per question id of the protocol's `question_ids`: 1 iff the arm's review has a sentence of kind `fact` citing a card `c` that is in the review's pack,
  has `q` in `c.question_ids`, whose last card-status line is `confirmed`, and whose `applies_to` is within `c.conditions`: every array key (`task`, `model_family`, `language`)
  of `applies_to` has all its values (case-folded) in the card's array, and `repo_size`, `metric` equal the card's when given; a key absent from `applies_to` constrains nothing.
- **citation_failures** `{n, failing, rate}` from the review's certificate (`cited`); no certificate: `null`. **outside_conditions**: count of fact sentences with a cited card failing the
  within-conditions test. **judgment_share**: judgment sentences over all sentences. **plants** `{k, found, contra_found}` from the certificate, else `null`.
  **u** (R_same only): `{fact_sentences, fact_citing_nothing_in_pack, share}`, a fact sentence counting when none of its cites is in the pack (zero if commit enforced R18; the checker sample of
  sentences that state facts as judgment is a reading left to the plan, `checked_sample: null`).
- **tokens** per arm: sum over the tasks named by the arm (a task once), every attempt's session and helpers, `{count, weighted, calls, partial}`, `count` = Σ total, `weighted` = Σ(input + read*cache_read + write*cache_write + out*output) with the `weights` threshold;
  missing transcript: `null` and reason `transcript-missing:<task>` (also a task with no row, or an attempt with neither a readable session transcript nor a transcript
  found for its folder; an attempt whose session transcript is absent falls back to `transcriptsForFolder` of its folder; `prediction.actual` is then `null`). `R_same` shares T's task: its tokens are the calls after the ledger `commit` line of the earlier step (`boundary: "ledger-ts"`, information only), T's the rest.
- **time**: `{first_ts, last_ts, wall_s}` from the ledger lines of the arm's tasks, information only, no sleep correction.
- **McNemar** (Comparison 1): `b` = questions with T=1, S1=0; `c` = T=0, S1=1; exact two-sided `p = min(1, 2*P(Bin(b+c, .5) <= min(b,c)))`, `p = 1` when `b+c = 0`; `conditional_on_run: true`.
- **spread** = |answered(S1) - answered(S2)| when S2 is in the plan and committed, else `null`; the **reading** is `above_spread` only when spread is not null and |answered(T) - answered(S1)| > spread,
  else `no_difference_shown`; the same for Comparison 2 with plants found, R1 against R2. Never "equal", never "better".
- **confirmed_per_extra_million_tokens** = (answered(T) - answered(S1)) / ((tokens(T) - tokens(S1))/1e6) when the token difference is positive, else `null`.
- **prediction**: `{predicted: plan.predicted_total, actual: Σ count over all arms' distinct tasks, ratio, within_2x}`.
- **blinding** (score): from the scorer's structured result `{scores: [{item, rubric: {specificity, support, scope, calibration} integers 0-4, guess_arm}]}` (last structured item of the transcript) and the key:
  `{n_items, n_guessed_right, rate, threshold: <blind_fail_rate>, failed: rate > threshold}`. The result is `scores-invalid` (`not_run`) unless every key item is
  answered exactly once and every `guess_arm` is one of the key's arms (a partial result would give a rate over the items it chose). `rubric_total` per arm = sum of its four scores (mean when an arm has several items). Without `--scorer-transcript`: both `{status: "not_run"}`.

## Steps
Both modes read the ledger, bind the plan and compute before taking `run.lock`, keeping the ledger head they computed from; under the lock
they re-read the ledger and, if it moved, exit 75 (`lock-lost`) and write nothing (review U5-CM-2: a plan amend landing in between must not
leave a label bound to the superseded plan).
`anon`: 1 parse, lock + ce. 2 bind the plan (above); every arm named in `arm_tasks` must have a committed review, else exit 2
`arms-not-committed`, nothing written and no key (a key made for a part of the arms would lock the rest out for this plan). 3 build each committed arm's blinded text: sentences renumbered `s1..` in order, cards cited renumbered `[1]..` by first citation, then a table of the cited cards' typed
fields (approach, measure, value, unit, baseline, effect, conditions, evidence_type, date, what_measured, quote); strip card, pack, review, manifest, certificate ids, task names, arm names, epoch numbers, paths and source urls;
one fixed template for every arm. 4 order = `rng(rng_seed).shuffle(arm names sorted)`, where `rng_seed` is 64 hex drawn with `crypto.randomBytes(32)` on
the first `anon` for this plan and stored only in the sealed key; a repeat reuses the key's seed, so the bytes stay identical (review U5-CM-4: the plan hash,
the arm names and `lib.rng` are all readable by the coordinator, so a seed derived from them would let it recompute the order); item ids `b1..bn`. 5 write `views/blind/item-<id>.md` and `views/blind/index.json` `{schema_version, items: [id], arm_names: [sorted]}` (writeAtomic, rebuilt each run), and `sealed/blind/<plan-sha12>.json`
`{schema_version, plan_sha256, rng_seed, items: {<id>: {arm}}}` by exclusive create (identical repeat: no-op). 6 `check` line {check `compare`, subject `anon`, result `pass`}.
`score`: 1-2 as above. 3 compute every figure for every committed arm. 4 write `views/comparison.json` (writeAtomic): `{schema_version, plan_sha256, label, plan_amended: n, field, n_questions, arms: {<arm>: {status, answered, Y: {<q>: 0|1}, citation_failures, outside_conditions, judgment_share, plants, u?, tokens, time, rubric_total}}, comparison1: {...}, comparison2: {...}, blinding, prediction, reasons: [slug]}`.
5 `check` line {check `compare`, subject `score`, result `pass` or `not_run` (any part not_run; never `fail`)}; appended only when the figures changed since the last such line.

## Exit codes
0 written (also exploratory, also with parts `not_run`). 2 no plan at all; no arm committed; `anon` with an arm of the plan not committed (`arms-not-committed`); `--scorer-transcript` given but not found; protocol or a needed commit record missing. 3 `getObject` object-mismatch, an `s_` id anywhere in an arm's cites. 64, 65 n/a, 66 `file-path`, 70, 75.

## Behaviours
- T1 `anon` with a frozen plan and four committed arms (T, S1, R_same, R1): exit 0; `views/blind/item-b1..b4.md`, `index.json`, `sealed/blind/<sha12>.json` exist; the key maps each item to exactly one arm.
- T2 No blinded file contains an object id (`[cprmxds]_[0-9a-f]{16}`), a task name, an arm name, `wt/`, an epoch marker or a url; every card cited appears once as `[n]`.
- T3 `anon` twice: exit 0 both, files byte-identical, no new ledger line the second time; another plan hash gives a permutation of the same items; the key's `rng_seed` is 64 hex, differs from `sha256hex("blind:" + plan_sha256)`, differs between two runs, and is kept on a repeat.
- T4 `anon` without a frozen plan, or with the frozen file edited: exit 2 `plan-not-frozen`; nothing written.
- T5 The key file lies under `sealed/` only; `views/blind/` holds no arm name (grep).
- T6 `score` on the same arms with two questions q1,q2: Y values follow the definition: a confirmed card gives 1; the same card `witnessed`, not in the pack, tagged to another question, cited only by a judgment sentence, or used with `applies_to` outside its conditions (extra language, dropped model family) gives 0.
- T7 McNemar: T answers {q1,q2,q3}, S1 {q3,q4}: b = 2, c = 1, p = 1; T 5-0 discordant gives `p = 0.0625` (exact, two-sided: 2 x 1/32); all concordant gives `p = 1`; `conditional_on_run: true`.
- T8 Spread: with S2 present and |T - S1| = 3 > |S1 - S2| = 1: `above_spread`; with equal gap: `no_difference_shown`; without S2: `no_difference_shown` and `spread: null`.
- T9 Comparison 2: certificates with plants (k 3, found 3, 1, 2) for R_same, R1, R2: figures copied; spread |R1 - R2| = 1; reading follows the rule; a review without a certificate has `plants: null` and does not change the exit code.
- T10 Frozen and matching plan: `label` is `descriptive, n = 1 per arm`, `plan_sha256` set; no frozen plan (draft only): `label: "exploratory"`, `plan_sha256: null`, reason `plan-not-frozen`, exit 0; frozen file edited: `plan-hash-mismatch`, exploratory, exit 0; neither: exit 2.
- T11 Tokens from fake transcripts (calls with known usage, a helper transcript under the session's `subagents/`): `count` and `weighted` equal the hand sum; a missing transcript gives `tokens: null` and `transcript-missing:<task>`; R_same's tokens equal the calls after the pack step's `commit` ledger line, T's the rest.
- T11b A task with no row, an attempt with neither session nor folder, and a folder attempt with no transcript each give `tokens: null`, `transcript-missing:<task>` and `prediction.actual: null`; a session whose transcript is absent but whose folder has one is counted from the folder.
- T12 `confirmed_per_extra_million_tokens` computed for a positive token difference, `null` for zero or negative; `prediction.ratio` and `within_2x` (ratio 1.9 true, 2.1 false).
- T13 Scorer transcript with a structured result of four items, three guesses right: `rate 0.75`, `failed: false`; four right: `rate 1`, `failed: true`; rubric totals per arm are the sum of the four scores; an item id not in the key, a score of 5, a missing criterion, an item of the key left out, or a `guess_arm` that is no arm: `blinding.status: not_run` with reason `scores-invalid`.
- T14 No `--scorer-transcript`: `blinding` and rubric `not_run`, exit 0, the `check` line has result `not_run`; the flag naming a missing file: exit 2; naming a file outside `transcripts_root`: exit 66.
- T15 An arm named in the plan but not committed has `status: "not_run"`, the others are computed; no arm committed: exit 2.
- T16 A cite with an `s_` id, or an object whose bytes were edited: exit 3 (`seed-id`, `object-mismatch`); nothing written.
- T17 `u` for R_same counts fact sentences with no cite in the pack (a hand-made review with one such sentence: `{2, 1, 0.5}`).
- T18 Stale `--ce`: 64, no file changed. Busy lock: 75.
- T19 `--dry-run`: figures printed, `dry_run: true`, no file written, no ledger line.
- T20 Ledger after `anon` and `score` passes `verifyLedger`; the `check` lines name `compare`; a second identical `score` appends nothing.
- T21 `comparison.json` contains no wall-clock-derived count other than `time` and the blinding/ledger fields; running `score` twice with the same inputs and `--now` gives identical bytes.
- T22 Script run from `wt/`: 3. Every outcome prints one §1.3 JSON line with `script: "compare"`.
- T23 `anon` with an arm named in the plan but not committed: exit 2 `arms-not-committed`, nothing written, `sealed/blind/` empty; once that arm is committed the same plan blinds every arm.
- T24 A plan amend that lands while `score` waits for the lock: exit 75 with no `comparison.json` and no `check` line, or (if the run read the ledger after the amend) the amended plan; never a label bound to the old plan.

## Cannot be tested without the app
- That a real scorer's result is extractable from its transcript (`structured` shape of a real helper, CONTRACT §7 item 7) and its `guess_arm` honesty.
- That the scorer cannot read `sealed/` (role profile enforcement, §7 items 1-3).
