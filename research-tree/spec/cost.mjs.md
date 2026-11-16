# cost.mjs: spec and behaviours to test

Source of truth: `CONTRACT.md` (§1, §2.1, §3.5-3.6 rows and attempts, §3.7 `meter` and `unit-costs` lines, §3.20, §3.22 [unit-costs], §4.8 parser, §4.10, §5 row U5b); design R50, R52, R53, R47 (inputs),
§11; layer draft L5 (R2-R11, `unit-costs.json`). The model is the existing `docs/program/evidence/research-tree/foundations-2026-11-16/cost/cost.js`; its model, tags and
sections [1]-[8] are kept unchanged in `compute`. The design wins: unit costs come from `from-transcripts` using lib's parser; there is no separate unit-costs script and no group-start ledger line.

## Purpose
Prices the shape of the tree before and after the pilot: the hand-over interval k* and window W* (count and weighted), the reload-thrash bound n_max, F1's token price, token fan-out, bulk load, load control,
admission factor and Smith's order (`compute`); a stated prediction of the pilot's tokens over every arm, marked stand-in while inputs are guesses (`predict`, R53); and the unit costs the pilot measured (`from-transcripts`, R52).
Tokens are counted, never money: the weighted figures use the dimensionless ratios in the inputs' `weights`.

## Command line
- `node cost.mjs compute [--inputs <file>] [--text]`: no `--root`, no `--ce`, writes nothing. Default inputs `tcb/cost-inputs.json` beside the script (`../cost-inputs.json`).
- `node cost.mjs predict --root <dir> [--inputs <file>] [--g <n>] [--child-form a|b] [--s2] [--actual <tokens>]`: read-only. Default inputs `<root>/plan/cost-inputs.json`; absent: exit 2 (the plan's copy, not the template, is what the owner approved). `--g` picks one value of the child's `g_sweep` (default its first); `--child-form a` (default, amendment 1: the child researches and reviews in one session up to the ceiling) or `b` (hand-over at k*); `--s2` includes the second control run.
- `node cost.mjs from-transcripts --root <dir> --ce <n> [--transcripts-root <dir>] [--dry-run] [--now]`: writes `plan/unit-costs.json`.
Unknown flags and bad values: 66. `--text` adds the report to stdout JSON as `result.text` (also printed to stderr); stdout is still one JSON line.

## Inputs file (`cost-inputs.json`, the existing format)
Top-level `_note`, `coordinator`, `child`, `review`, `weights`, `packing`, `concurrency`, `admission`, `order`; each value is a number/array or `{v, tag, src}` with `tag` in `M, E, G, I` (measured, computed, guess, illustrative); `schema_version` 1 added. All numbers finite and non-negative, `g_sweep` a non-empty array of positive numbers, `weights.read|write|out`, `packing.questions[].id` matching the key pattern; else exit 2 `input-invalid` with the path of the first bad value. A missing section is `input-invalid`.

## `compute`: result
Same quantities and rounding as cost.js, as numbers in `result` (the text keeps its format, header `== cost.mjs output, inputs: <basename> ==`):
`coordinator {H0, k_star, W_star, per_call_at_kstar, per_call_at_200k, script_status {k_star, W_star}, weighted {k_star, W_star}, fanout_rows}`; `child: [{g, k_star, W_star, cost {k_star, W_star}, one_session {count, max_window, over_cap}, handover_at_kstar {count, handovers, thrash_at}, best_k {count: {k, count}, cost: {k}}, adaptive {count, handovers, max_window, thrash_at}, k_star_with_growth, n_max, ratio {count, weighted}, break_even_n}]`; `review: [{g, same_session {count, max_window}, research {count}, fresh_review {count, max_window}, total, ratio}]`, `reviewer_capacity`; `fanout {g, k_opt, epoch_calls}`; `packing {f, totals, lower_bound_leaves, leaves[]}`; `concurrency {N_mem, N, speedup: [{s, S1, S2, S3, gain_third}]}`; `admission {factor, max_fields, theta}`; `order [{field, ratio}]`; `stand_in`: true when any value is tagged `E`, `G` or `I`.

## `predict`: model (R53)
`p = {P: child.P, S0: child.S0, sigma: child.sigma, g, hc, o, qf, w}` and `Wcap = child.W_quality`; `simulate` as in cost.js (call i of an epoch reads `P + S + g*i` tokens; count = sum of windows).
`n_cap = floor((Wcap - P - S0)/g) + 1`, `n_session = min(child.n, n_cap)`; `n_rev = review.n_rev`.
- Form a: `T = simulate(n_session)`; `R_same = simulate(n_session + n_rev) - simulate(n_session)` (the review continues T's window); `S1 = T`; `S2 = S1` with `--s2`, else absent. Form b: `T = simulate(child.n, k = round(k*))`, `R_same = 0`, `S1` as form a.
- `R1 = R2 = simulate(n_rev, {P: child.P, S0: review.pack, sigma: 0, g: review.g_rev, hc: 0, o: 0, qf: 0, w: 0})`.
- `total = T + R_same + R1 + R2 + S1 (+ S2)`; `work_ratio {one_session: simulate(child.n + n_rev, one session), tree: simulate(child.n, k*) + R1, ratio}`; `time_speedup [{s, N, speedup: 1/(s + (1-s)/N)}]` over `concurrency.s_sweep`, `N = min(N_cap, N_mem)`.
- `result`: `{stand_in, form, g, n_cap, arms: {T, R_same, R1, R2, S1, S2?}, total, work_ratio, time_speedup, helpers_modelled: false}`. Helpers' own tokens are not in the model. `--actual n`: `check {ratio: n/total, within_2x: 0.5 <= ratio <= 2}` (R53: off by more than 2x, no fan-out choice rests on the model).

## `from-transcripts`: reads, steps, writes
Reads: `run/tasks.json`, `run/coord.json` (`session`), `store/commits/*` and, through them, card objects; frozen protocol question ids (`lib.currentProtocol` per field); `meter` ledger lines; transcripts under `transcripts_root` (or `--transcripts-root`) by `sessionTranscripts` (session and helpers) and, for an attempt with no `session`, `transcriptsForFolder(<root>/wt/<task>-e<e>)` (attempts read through `lib.attemptOf`); each helper's `agent-<id>.meta.json` (`agentType`). Thresholds: `weights`, `unattributed_share_max` (0.1, guess).
1. Read and parse everything without the lock (CONTRACT §2.1: no transcript parse while `run.lock` is held); `checkCe` early to fail fast. 2. Sessions: the coordinator (role `coord`), each attempt of each row (role = the row's `role`), helper transcripts (role `helper:<agentType>`, `helper:unknown` when no meta). An attempt with no transcript goes to `missing: [{task, epoch}]`. A torn transcript tail is skipped (parser). 3. Per session: `calls`, `context` per call, `spendOf` totals; `weighted = input + read*cache_read + write*cache_write + out*output`.
4. **Roles**: `P` = median first-call context over the role's sessions; `g` = median over sessions with at least 5 calls of the mean positive step of `context` between consecutive calls (a fall, as at a compaction, is skipped and counted in `compactions`); `S0` = for rows with attempts of epoch 1 and 2, the second attempt's first-call context minus the role's P, median over rows; `sigma` = mean difference of successive successors' S (null with fewer than two successors); `o` = mean number of calls before the first tool use with access kind `write` in a successor session; `hc`, `qf`, `w` = null (the hand-over trigger and failed calls are not visible in transcripts). A role with no session: absent.
5. **Units** `{mean, sd (sample, null when n<2), n, weighted_mean}`: `stage:<stage>` = tokens per task (all its attempts and helpers) over tasks with transcripts; `helper_run:<agentType>` = tokens per helper transcript; `card` = research-task tokens divided by cards committed (commit records' outputs of kind `card`), over tasks with at least one.
6. **t_q, k_q**: a research task's tokens are shared equally over its committed cards, each card's share equally over its `question_ids`: `t_q[q]` = sum; `k_q[q]` = sum of `round(canonical bytes of the card / 4)` shares (a stated approximation, chars/4); question ids of the frozen protocols with no card are listed in `no_estimate` (they block admission in plan-tree later, R47).
7. `tokens_per_meter_pct` = tokens of all considered calls with `ts` after the first and up to the last `meter` line, divided by the difference of their `pct`; null with fewer than two lines or no rise; `meter_self_reported: true`. `serial_fraction`, `rss_mb`: null.
8. `unattributed_share` = (tokens of research tasks with no committed card + tokens of `helper:unknown` transcripts) / all tokens; `trusted = unattributed_share <= unattributed_share_max and missing is empty`.
9. Under `withRunLock(ce)`: write `plan/unit-costs.json` (writeAtomic): `{schema_version:1, generated_at, trusted, unattributed_share, missing, no_estimate, roles, units, t_q: {q: {t, k}}, tokens_per_meter_pct, meter_self_reported, serial_fraction, rss_mb}` (the contract's [unit-costs]); append one `unit-costs` ledger line {sha256 of the file's bytes, unattributed_share, trusted}, skipped when the last `unit-costs` line has the same sha256.

## Exit codes
`compute`, `predict`: 0; 2 `input-invalid`, inputs unreadable/unparseable, plan inputs absent. `from-transcripts`: 0 trusted; 2 not trusted (`untrusted`: file still written) or no row/transcript to read; 64, 66, 70, 75 as the contract. No other code.

## Behaviours
- T1 `compute` on `tcb/cost-inputs.json`: exit 0; coordinator `H0 = 432400`, `k_star` rounds to 17.6, `W_star` rounds to 133200 (the `W_star_coord` threshold), `weighted.k_star` rounds to 26.1; `fanout_rows` 246.
- T2 Child, `g = 2800`: `k_star` 16.1, `W_star` 115000, one session `count` 94.89M (rounded), `max_window` 730800, `over_cap: true`, hand-over at k* 44.98M with 14 hand-overs, `n_max` 289, `break_even_n` 29, `ratio.count` 2.11; `g = 10000`: `n_max` 307.
- T3 Review at `g = 2800`: same session 126.42M, research 44.98M, fresh review 7.58M, ratio 2.40; `reviewer_capacity` 180000. Packing: 2 leaves, separator `F7-C`. Concurrency `N_mem` 2, `N` 2. Admission factor 1.82, `max_fields` 3. Order `F2 > F7 > F6 > F4 > F5 > F3`.
- T4 `--text`: `result.text` starts `== cost.mjs output, inputs: cost-inputs.json ==` and contains `[1] Coordinator (count): H0=432.4k k*=17.6 calls  W*=133.2k`; stdout is exactly one JSON line; the same text goes to stderr.
- T5 Input errors: unparseable file, a missing `weights`, a negative `g`, a NaN, an empty `g_sweep`, a bad question id, a tag `X`: each exit 2 `input-invalid` naming the path; `compute` writes no file and needs neither `--root` nor `--ce`.
- T6 `compute` is deterministic and pure: two runs give identical stdout; changing one input changes only the figures that depend on it (raise `coordinator.w` to 0: `k_star` 17.5); `stand_in` true for the shipped inputs and false when every tag is `M`.
- T7 `predict --root` with the shipped inputs copied to `plan/cost-inputs.json`, form a: `n_cap 83`, `arms.T = arms.S1 = 15338400`, `R_same 14280000`, `R1 = R2 = 7584000`, `total 60124800`, `work_ratio.ratio` rounds to 2.40, `stand_in true`, `helpers_modelled false`; `--s2` adds `arms.S2` and 15338400 to the total; `--child-form b`: `R_same 0`, `T` = the hand-over research count (44.98M).
- T8 `predict --actual 60124800` gives ratio 1, `within_2x` true; `--actual 130000000`: ratio about 2.16, false; `--g 5000` uses that sweep value; `--g 7` not in the sweep: exit 66. No `plan/cost-inputs.json` and no `--inputs`: exit 2.
- T9 `from-transcripts` with fake transcripts for one coordinator, one research child (3 attempts-worth of calls, one helper reader with a meta file) and one fresh reviewer: `roles.child.P` equals the child's first-call context, `g` equals the mean positive step, `units["stage:research"].mean` equals the hand sum over session plus helper, `units["helper_run:reader"]` the helper's tokens; `plan/unit-costs.json` written, exit 0, `trusted: true`.
- T10 A row with epochs 1 and 2 (two sessions): `S0` = second first-call context minus P; three epochs give `sigma`; `o` counts calls before the first Write tool use; a fall of context between calls is skipped and not averaged.
- T11 Cards: a research task with 4 committed cards, two tagged `f1-a-01` only, one `f1-a-01` and `f1-a-02`, one `f1-a-02`: `t_q` shares equal the hand split; a protocol id with no card is in `no_estimate`; `card` unit = tokens / 4.
- T12 Untrusted: a research task with transcripts but no committed card holding 30 % of all tokens: exit 2 `untrusted`, file written with `trusted: false` and `unattributed_share` 0.3; a helper without a meta file counts as `helper:unknown`; a row whose attempt has no transcript: `missing` lists it, `trusted: false`, exit 2.
- T13 `meter` lines (pct 10 then 14, self-reported) with calls between them totalling 2.0M tokens: `tokens_per_meter_pct` 500000; one line, or no rise: null.
- T14 Torn last line in a transcript: skipped, same totals as without it; a transcript with only synthetic calls adds no call.
- T15 Stale `--ce`: 64, no file written; `--dry-run`: result printed, no file; busy lock: 75; two runs with the same `--now` write identical bytes.
- T16 `from-transcripts` reads no clock and no environment (it uses `--now`), writes nothing outside `plan/unit-costs.json` and the ledger, appends one `unit-costs` line whose `sha256` equals the file's (a rerun with the same `--now` appends none), and its output `plan/unit-costs.json` parses with `JSON.parse` and contains no `NaN`.
- T18 The run lock is not held while transcripts are parsed: with a 50 MB fake transcript, a concurrent `withRunLock` caller (retries 3) acquires the lock during the parse.
- T17 Every outcome prints one §1.3 JSON line with `script: "cost"` and the mode; `compute` works with a nonexistent `--root` absent from the command line.

## Cannot be tested without the app
- That real transcripts have the §4.8 shape and helper meta files (CONTRACT §7 item 7); that the hand-over parameters `hc`, `qf`, `w` can ever be read from them.
- That tokens per meter percent means anything: the meter is read only by a session, in whole percent (§7 item 9).
