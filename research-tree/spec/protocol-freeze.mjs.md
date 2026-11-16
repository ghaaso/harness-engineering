# protocol-freeze.mjs: spec and behaviours to test

Source of truth: `CONTRACT.md` (§1 conventions, §3.7 ledger, §3.18 protocol, §5 row U5a); design R33, R35, R39, R46
(R40, R58 for the check and incident lines). Where this spec says "the schema" it means `tcb/schemas/protocol.schema.json`
and `analysis-plan.schema.json` (written by the library builder); this spec adds only the checks a schema cannot make.

## Purpose
Turns the coordinator's drafts into frozen, hashed, owner-approved files before any reader starts (R33) and before
the first arm (R39); enforces one owner per question key (R46); splits each field's seed list so half is held out in
`sealed/` (R35). The frozen copy and its sha256 in the ledger do the work of a registry. Admission (admit.mjs) reads the
ledger lines this script writes.

## Command line
`node protocol-freeze.mjs <mode> --root <dir> --ce <n> --file <relpath> [flags]` (all modes write, so `--ce` is required).
- `freeze --file plan/protocols/<field>.json`; `amend --file <same or plan/analysis-plan.json> --reason-code <code>`;
  `plan --file plan/analysis-plan.json`. `--file` is relative to `--root` and must lie under `plan/protocols/` (freeze,
  amend of a protocol) or be exactly `plan/analysis-plan.json` (plan, amend of the plan); anything else, an absolute path
  outside the root, a `..` or a junction leaving the folder is exit 66 `file-path` before the file is read.
- `--reason-code` (amend only, required there): one of `question-change|criteria|routes|sesoi|vocab|must-read|fixed-files|schema-version|other`.
- Optional: `--rng-seed <string>` (freeze: overrides the default split seed; tests), `--dry-run`, `--now`.

## Reads
The draft; `plan/protocols/*.json` (every sibling field, for key ownership); `sealed/heldout/<field>.json` (amend);
`run/ledger.jsonl` (owner lines, earlier freeze lines, head); `run/coord.json`; `run/tasks.json` (plan: the `arm-tasks` check);
`tcb/schemas/{card,protocol,analysis-plan}.schema.json`.
Reads no clock (the ledger `ts` comes from `edgeFacts`).

## Writes
- `plan/frozen/protocol-<field>-<sha12>.json` (freeze, amend) or `plan/frozen/analysis-plan-<sha12>.json` (plan): the
  canonical bytes of the frozen value, exclusive create. `sha256` = `sha256hex(canonical bytes)`, `sha12` its first 12 hex.
  In a frozen protocol `seeds` is the **brief half** only; the draft keeps the full list (it is the coordinator's).
- `sealed/heldout/<field>.json` (freeze, once): `{schema_version:1, field, protocol_sha256, rng_seed, seeds_sha256, heldout: canonical_id[] sorted}`,
  `seeds_sha256` = sha256 of the canonical sorted full seed list. Exclusive create; an amend never rewrites it.
- Ledger (under the run lock, `ctx.ledgerSeq` lists them): freeze: `protocol-freeze` {name: `protocol-<field>`, sha256, path}
  then `seed-split` {field, n_brief, n_heldout, rng_seed}; amend: `protocol-amend` {name, sha256, path, old_sha, reason_code};
  plan: `plan-freeze` {name: `analysis-plan`, sha256, path}; a refusal after the ce check: one `incident` {class: `refusal`, detail: {script, mode, codes}}.
  A `check` line {check: `protocol-freeze`, subject: name, result, reasons} accompanies every non-dry-run outcome except a replay.
- stdout `result`: `{name, sha256, sha12, path, questions_sha, seed_split: {n_brief, n_heldout, rng_seed}|null, replay: bool, amended: bool}`;
  `questions_sha` = `lib.questionsSha(question_ids)` = sha256 of the canonical sorted `question_ids` (CONTRACT §3.18; the value
  packs record, commit checks and tms compares). The current frozen file of a name is the one of its last `protocol-freeze`,
  `protocol-amend` or (analysis plan) `plan-freeze` line; readers use `lib.currentProtocol` for a field.

## Steps (freeze)
1. Parse flags (66 on any error, `file-path` check). 2. `withRunLock` with `ce` (64, 75). 3. Read the draft (missing or unparseable: 2).
4. `checkFormat` against the schema (1 `schema-version` / `schema-invalid`). 5. Approval check (below). 6. Key checks (below).
7. Content checks (below). 8. Read the ledger (broken chain: 3 `ledger-broken`, nothing written); find the field's last
`protocol-freeze`/`protocol-amend` line: none = first freeze; a line whose `sha256` equals the new frozen sha = replay (exit 0,
write nothing new; if a file or line is missing from an interrupted run, write just that); a different sha = 1 `already-frozen`.
9. Split the seeds: sorted unique list, `rng(rngSeed).shuffle`, `n_heldout = floor(n/2)` (the first ones), rest are the brief half;
default `rngSeed` = `sha256hex("seed-split:" + field + ":" + sha256 of the canonical draft)`; reproducible, never reads a clock.
10. If `plan/frozen/<name>` exists with other bytes: 3 `frozen-tampered`. 11. Write frozen file, heldout file, then the ledger lines (files first, ledger last).
`amend` repeats 1-7 on the new draft, then: the field must already be frozen (1 `not-frozen`); `field` and the full seed list must equal the
frozen ones (1 `field-changed`, `seeds-changed`); an identical new sha is a replay (0); the approval must be a **newer** owner line than the last
freeze/amend line of the name; the new frozen copy's seeds come from the stored `rng_seed`; writes the new frozen file and the `protocol-amend`
line (the old frozen file stays). `plan` = steps 1-8 and 10-11 for the analysis plan with its own checks, no seed split, no key checks.

## Checks
- **Approval (R33, R39).** `approval.quote` non-blank, `approval.at` a parseable ISO time (1 `no-approval`); and the ledger holds an `owner`
  line with `act: approve`, `subject` = `protocol:<field>` or `analysis-plan`, `quote` equal to `approval.quote` (compared on the first 500
  characters, trimmed), at a `seq` after the last freeze/amend line of that name (1 `approval-unrecorded`). Owner lines enter the ledger only through status.mjs (decision 25).
- **Keys (R46, decision 24: exit 1, not 3).** Every `question_ids` entry matches `^<field>-[a-z0-9]{1,12}-\d{2,3}$` (`key-format`, covers "no group");
  no duplicates (`key-duplicate`); no sibling protocol lists the same id (`key-two-owners`); `cross_field` entries name a foreign field as `owner_field`
  (`cross-self`), whose key prefix equals that field, and whose protocol lists the key in its `question_ids` (`key-no-owner` when that protocol is absent or lacks it).
  Cross-field keys are read-only inputs and are not in this field's `question_ids`. An unparseable sibling is 2 `sibling-unreadable`.
- **Protocol content.** `card_schema_version` equals the card schema's `x-version` (`card-version`); `sesoi` has one number for every measure in
  `outlist_vocab.measures` and no other (`sesoi-missing`, `sesoi-unknown`); `criteria` codes are unique (`criteria-dup`); `fixed_files` are relative, without
  `..` or a drive and not under a protected prefix of `tcb_paths_protected` (`unsafe-path`); `must_read` urls are http/https (`bad-url`).
- **Analysis plan.** `looks` is 1; `labels` contains the exact string `descriptive, n = 1 per arm` (`label-missing`); `arm_budget` keys are within `T,R_same,R1,R2,S1,S2`, include `T,R_same,R1,S1`, values positive integers (`arm-budget`);
  `predicted_total` a positive integer; `decision_rules` non-empty; `arm_tasks` keys are within `arm_budget`'s and each
  `pack`/`review` value `<task>.<step>` names a task of `run/tasks.json` whose `steps` contain that step (`arm-tasks`; a
  missing table is 2 `missing`).

## Exit codes
0 frozen, amended, or an identical repeat that changed nothing. 1 any check above fails (reasons carry every slug found, not just the first). 2 draft or sibling missing/unparseable.
3 `ledger-broken`, `frozen-tampered`, run from `wt/`. 64, 66, 70, 75 as the contract. (The layer draft's 3 for a missing approval and 4 for a second hash are replaced by 1.)

## Behaviours
- T1 Good protocol, owner line present: exit 0; `plan/frozen/protocol-f1-<sha12>.json` holds the canonical bytes and its sha256 equals the result's; ledger has `protocol-freeze` then `seed-split`, `verifyLedger` ok; `sealed/heldout/f1.json` exists.
- T2 Repeat of T1: exit 0, `replay:true`, no new file, no new ledger line, bytes of every file unchanged.
- T3 Stale `--ce`: exit 64; no frozen file, no sealed file, ledger unchanged.
- T4 `run.lock` held by a live process (the test's own sleeper): exit 75 after the bounded retry; nothing written.
- T5 `--file` outside the allowed place (`wt/x/protocol.json`, `plan/other.json`, `plan/protocols/../../x.json`, a junction under `plan/protocols/` pointing out): exit 66 `file-path`, nothing read or written.
- T6 Draft missing: 2 `missing`; draft not JSON: 2 `unparseable`.
- T7 `schema_version: 2`: 1 `schema-version`; an extra property or `status` field: 1 `schema-invalid` naming the path.
- T8 Approval: blank quote, no ledger owner line, owner line with another quote, `act: accept`, subject of another field, or a line with a lower seq than the last freeze: each 1 (`no-approval` or `approval-unrecorded`), nothing written but one `incident`.
- T9 Keys: `f1-03` (no group), `g1-a-01` in field f1 (`key-prefix`), the same id twice, the same id in a sibling's `question_ids` (`key-two-owners`), a `cross_field` pointing at a protocol that lacks the key (`key-no-owner`), `owner_field` equal to the own field: each exit 1; a valid cross-field entry freezes and the key stays out of the owned list.
- T10 A sibling protocol that is not JSON: exit 2 `sibling-unreadable`.
- T11 `card_schema_version` 9: `card-version`; a measure without a `sesoi`; a `sesoi` for an unknown measure; duplicate criteria codes; `fixed_files` of `../x`, `C:/x`, `tcb/x`; a `must_read` of `ftp://`: each 1 with its slug.
- T12 Seed split, 7 seeds: n_heldout 3, n_brief 4, disjoint, union equals the draft's seeds; the frozen copy's `seeds` is the brief half; same split when the draft lists the seeds in another order; `--rng-seed` is recorded in the ledger and in the sealed file; two different rng seeds give different splits for a fixed 12-seed list (assert on a pair the test finds).
- T13 The held-out ids occur in no file outside `sealed/` and `plan/protocols/` (grep the whole root); 1 seed gives heldout 0, 0 seeds both 0, the `seed-split` line is still written.
- T14 Plan, good: exit 0, `plan/frozen/analysis-plan-<sha12>.json`, a `plan-freeze` line; no sealed file.
- T15 Plan with `looks: 2`, no `descriptive, n = 1 per arm` label, an unknown arm key, no `S1` budget, `predicted_total: 0`, empty `decision_rules`, or no recorded approval: each 1.
- T15b Plan `arm_tasks`: `{T: {pack: "f1-research.pack", review: "f1-research.review"}}` with that row planned with steps [pack, review] → 0; an arm not in `arm_budget`, a task not in the table, a step the task does not list, or a `:` separator (`f1-research:pack`) → 1 `arm-tasks`.
- T16 Freeze again after editing the draft, no amend: 1 `already-frozen`; no new file.
- T17 Amend, good (new owner line after the freeze, new `--reason-code criteria`): exit 0, a new frozen file, a `protocol-amend` line with `old_sha` equal to the first sha, the old frozen file untouched, heldout file unchanged, new frozen `seeds` equal the earlier brief half.
- T18 Amend refused: before any freeze (`not-frozen`); with the old approval (`approval-unrecorded`); changing `field` or the seed list (`field-changed`, `seeds-changed`); with `--reason-code bogus` (66); with an unchanged draft (exit 0, nothing written).
- T19 Amend of `plan/analysis-plan.json` writes `protocol-amend` with name `analysis-plan`.
- T20 Interrupted run: frozen and sealed files exist, ledger lacks the lines: the rerun exits 0 and appends exactly the missing lines; a frozen file name present with other bytes: exit 3 `frozen-tampered`.
- T21 `--dry-run`: for a good and a refused input the exit code and `reasons` equal the real run's, `dry_run:true`, no file created, no ledger line, no lock file left.
- T22 Ledger with a broken hash: exit 3 `ledger-broken`, nothing written.
- T23 Script copied under `<root>/wt/`: exit 3 `run-from-attempt`.
- T24 Every outcome prints one JSON line with the §1.3 keys and `script: "protocol-freeze"`; a refusal after the ce check appends one `incident` {class `refusal`}, a 64 or 66 appends none.
- T25 `questions_sha` equals sha256 of the canonical sorted `question_ids` and is independent of their order in the draft.

## Cannot be tested without the app
- That the owner's chat words are what the `owner` ledger line quotes (status.mjs writes it from the coordinator's message): needs the real session and the owner.
- That a child session cannot read `plan/protocols/` (the full seed list) or `sealed/`: it depends on the harness enforcing the role profile (CONTRACT §7 item 1-3).
