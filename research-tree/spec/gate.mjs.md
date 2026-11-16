# gate.mjs: spec and behaviours to test

Source of truth: `CONTRACT.md` (§1, §3.4 last paragraph, §3.7, §3.11, §3.19, §3.20, §5 row U5a); design R54, R55, R45, R40, R57 (R56 is not a gate);
layer draft L6 (file formats, rules R1-R4 there). The design wins where it differs from L6 (gate binds to the cut hash and the hazards object, not the protocol hash).

## Purpose
`cut` writes the design cut that the two blind analysts read (R54). `check` decides whether admission may proceed: the matrix is full, every problem id has a row, every high hazard is covered or accepted
on the owner's quoted word, the protocol model passes, and the owner's action lines hold (R55, R45). It binds its verdict to the sha256 of the cut and of the hazards object; a changed cut or hazards object makes an old
`gate.json` void. Missing inputs are `not_run`, never pass (R40). It also owns the three design-check schemas below.

## Command line
`node gate.mjs cut --root <dir> --ce <n> --design <path> [--dry-run]` and `node gate.mjs check --root <dir> --ce <n> [--dry-run]`. `--design` is an absolute path or a path under the root,
read-only (a read outside the root, allowed by CONTRACT §6). A `--design` under `<root>/wt/` is exit 66 `file-path`.

## Design-check schemas (written by the builder of this script, `x-version` 1, `additionalProperties` false, `x-maxWords` where "≤Nw")
Objects are stored by commit.mjs as `d_` objects (kind = the object's `kind`). Ids match `^[a-z][a-z0-9_.-]{0,31}$` unless stated.
- `stpa.schema.json`: `{kind:"stpa", cut_sha: 64 hex, controllers: [{id, name ≤8w, actions: [{id, target: controller id}], feedback: [{id, from: controller id}]}], ucas: [{uca_id, action_id, type: N|U|T|D, hazardous: bool, context ≤40w, case ≤40w}]}`.
  A "type entry" is a uca with that `action_id` and `type`; `hazardous: false` with a `case` saying why records "no unsafe case".
- `fmea.schema.json`: `{kind:"fmea", cut_sha, rows: [{row_id, kind: component|data|flow, name ≤8w}], cells: [{row_id, col, finding: string ≤40w|null, na_reason: string ≤20w|null}]}`; exactly one of `finding`, `na_reason` is non-null.
  Columns: component = `crash, amnesia, omission, timing, wrong_value, common_cause, fabrication, injected_text, agrees_with_brief`; data = `dirty_write, dirty_read, non_repeatable_read, phantom, lost_update, read_skew, write_skew, torn_write, stale_derived, mutable_identity`;
  flow = `spoofing, tampering, repudiation, information_disclosure, denial_of_service, elevation_of_privilege`.
- `hazards.schema.json`: `{kind:"hazards", cut_sha, parent: d id|null, hazards: [{hazard_id: ^h[0-9]{1,4}$, supersedes: hazard_id|null, classical_name ≤12w, statement ≤40w, severity: high|medium|low, p_ids: string[] (^[A-Z]{1,2}[0-9]{1,2}$), covered_by: string[] (^R[0-9]{1,2}$), status: covered|partial|gap}], map: [{source: {kind: uca|cell, id}, hazard_id, borderline: bool, alt_hazard_id: hazard_id|null}]}`.
  `source.id` is a `uca_id` or `<row_id>/<col>`. The object has no `accepted` or `owner_quote`: acceptance is only a ledger `owner` line (`act: accept`, `subject: hazard:<hazard_id>`, quote ≤500 chars, written by status.mjs) so the mapper cannot grant it.
  Append-only: a newer hazards object (its `parent`) keeps every parent `hazard_id`; changes go through a new id with `supersedes`.

## Reads
Ledger (last `cut` line; `audit`, `owner` lines); `completeness/cut-<sha12>.md`; `run/tasks.json`; `store/commits/*`, objects through commit records only (re-check each `sha256`, `getObject`); `completeness/model/result.json` `{result: pass|fail|not_run, sha}`;
`tcb/thresholds.json` (`all`: action lines are the params carrying `line: {measure, op}`, CONTRACT §3.20); `views/measures.json` `{values: {<measure>: number|null}}` (written by render, CONTRACT §3.22; `unverifiable_share` and `coverage` at least).

## Writes
`cut`: `completeness/cut-<sha12>.md` (exclusive create), ledger `cut` {sha}. `check`: `completeness/gate.json` (writeAtomic, §3.19, no timestamp, so equal inputs give equal bytes), ledger `check` {check `gate`, subject sha12 of the cut, result, reasons}, `gate` {result, cut_sha, hazards_sha},
and, when the result is not `pass`, an `incident` {class `not-run` or `refusal`, detail: reasons}; these lines only when `gate.json` changes or no `gate` line exists. `gate.json` carries `schema_version`; `cut_sha`/`hazards_sha` are `null` when absent (CONTRACT §3.19).
stdout `result`: cut: `{cut_sha, path, sections_kept, ids_removed, bytes}`; check: the gate record plus `details` (the lists behind each reason).

## Steps: cut
1. Read the design (missing/unreadable: 2). 2. Split at lines `^## (\d+)\. `. Keep the text of sections 1-7 and, of section 10, the lines from the line starting `**Scripts**` up to the line before `**Files:**`; drop the preamble and sections 8, 9, 11, 12, 13, 14, 15. A kept section missing, or section 10 lacking its `**Scripts**` block: 2 `section-missing`.
3. In kept text delete every paragraph beginning `**Where the classical assumptions fail.**` (to the next blank line). 4. Delete every token matching `\b[PNGDK][0-9]{1,2}(-[0-9]{1,2})?\b`; then tidy: `( )`, `[ ]`, doubled commas or spaces and a comma before a closing mark or full stop disappear; count removed tokens as `ids_removed`.
5. Output = `# Design cut (layout, role table, script lists, rule texts)` + a blank line + kept text, LF newlines, one trailing newline. 6. `cut_sha = sha256hex(bytes)`; write `cut-<sha12>.md` by `createExclusive` (an existing file with other bytes: 3 `cut-tampered`); append `cut`. An identical repeat writes nothing (exit 0).

## Steps: check
1. Lock + ce. 2. Current cut = last `cut` line; the file must exist (`cut-missing` not_run) and hash to it (`cut-mismatch` fail). 3. For each role `stpa`, `fmea`, `mapper`: among tasks with `stage: design-check`, that role, state `committed`, take the commit record's output of the object kind (`stpa|fmea|hazards`); keep those with `cut_sha` equal to the current cut; none committed: `<role>-missing`; committed only for another cut: `<role>-stale` (both not_run); several: the one whose `commit` ledger line has the highest seq (`lib.currentDesign`'s rule; the hazards object and its sha come from `lib.currentDesign` itself).
4. The stpa and fmea tasks need an `audit` ledger line for the committed epoch: `label: clean` else `analysis-tainted` (fail); no line `audit-missing` (not_run). 5. Evaluate the rules below. 6. Model: file missing `model-missing` (not_run); `result` not_run `model-not-run`; `fail` `model-fail` (fail). `model_result_sha` = its `sha`.
7. Action lines: for each threshold param carrying `line: {measure, op}`: `value` null or `gate` false gives `{measure, line, value?, result: reading}` (`line` = the param's `value`); otherwise compare `values[measure]` from `views/measures.json` (`max`: value ≤ line; `min`, `floor`: value ≥ line): `pass`/`fail` (`action-line-fail`); value absent or null: `measure-missing` (not_run). A param without `line` is never an action line, whatever its name.
8. Result = `fail` if any fail reason, else `not_run` if any not_run reason, else `pass`; `reasons` sorted unique. Write per Writes.

## Rules (reason slugs)
- Matrix full (R55): every stpa action has an entry of each type N,U,T,D (`stpa-type-missing`); fmea has ≥1 row of each kind (`fmea-kind-missing`) and exactly one cell per (row, column of its kind), none empty or with both fields (`fmea-cell-empty`, `fmea-cell-both`, `fmea-row-unknown`, `fmea-column-unknown`); `matrix.empty_cells` = missing + empty cells, `matrix.full` = no defect.
- Every hazardous uca and every cell with a `finding` has a `map` entry (`unmapped-findings`); every `map` and `alt_hazard_id` names a hazard of the object (`map-hazard-missing`); the hazards object keeps its parent's ids (`hazards-not-append-only`).
- Every problem id `P1`..`P21` appears in some hazard's `p_ids` (`p-id-missing`; `p_ids_missing` lists them).
- Every `severity: high` hazard is `covered` with non-empty `covered_by`, or has a ledger `owner` accept line for it (`high-uncovered`; `high_uncovered` lists ids). `partial` and `gap` count as uncovered.

## Exit codes
`cut`: 0 written or identical; 2 design missing/section missing; 3 `cut-tampered`. `check`: 0 `pass`; 1 `fail`; 2 `not_run` (gate.json is still written); 3 `ledger-broken`, `object-mismatch`, an `s_` id, run from `wt/`; 64, 66, 70, 75 as the contract. `param-missing` is 2.

## Behaviours
- T1 `cut` on a synthetic design with sections 0 to 15: output has the kept section headings and none of 8, 9, 11-15, nor preamble text; `completeness/cut-<sha12>.md` equals the bytes hashed; ledger `cut` line; exit 0.
- T2 Output contains no match of the id pattern and no `()`, `[]`, `, ,`; the rule text of R10 survives; every "Where the classical assumptions fail" paragraph is gone and the paragraph after it stays; section 10 keeps its `**Scripts**` list and drops `**Files:**` onwards.
- T3 `cut` twice: exit 0, no second ledger line; the design edited in a dropped section gives the same sha; edited in a kept section gives a new sha and a new file; an existing `cut-<sha12>.md` with other bytes: exit 3.
- T4 `cut` with a missing design file: 2; with a design lacking section 5: 2 `section-missing`; `--design` under `wt/`: 66; stale ce: 64 and nothing written.
- T5 Complete fixtures (stpa, fmea, hazards committed through commit records for design-check tasks with clean audit lines, model pass, all P ids covered): `check` exits 0, `gate.json` `result: pass`, `cut_sha` and `hazards_sha` equal the current cut and `sha256hex(canonical hazards)`, `model: "pass"`, ledger `check` and `gate` lines.
- T6 Missing STPA entry type (an action with no `T` entry): exit 1 `stpa-type-missing`, `matrix.full false`, `empty_cells` counts it. A missing FMEA cell, a cell with both fields, a row of unknown kind column, a kind with no row: exit 1 with the slugs.
- T7 A hazardous uca or a finding cell absent from `map`: `unmapped-findings`; a map entry naming `h99`: `map-hazard-missing`.
- T8 `P7` in no hazard: exit 1 `p-id-missing`, `p_ids_missing: ["P7"]`.
- T9 High hazard with status `gap`, `partial`, or `covered` with empty `covered_by`: `high-uncovered` with its id; the same hazard with a ledger `owner` accept line (subject `hazard:h3`) passes; an accept line for another hazard, or `act: ruling`, does not; a medium gap does not fail.
- T10 Parent chain: a child hazards object dropping a parent id: `hazards-not-append-only`; keeping it with a `supersedes` replacement passes.
- T11 No committed stpa task: exit 2 `stpa-missing`; committed for another cut: `stpa-stale`; same for fmea and mapper; all not_run, `gate.json` written with `result: not_run` and null shas where absent.
- T12 Audit line with `label: tainted` for the stpa task: exit 1 `analysis-tainted`; no audit line: exit 2 `audit-missing`; the mapper needs none.
- T13 Model result missing: 2 `model-missing`; `not_run`: `model-not-run`; `fail`: exit 1 `model-fail`; garbage JSON: 2.
- T14 Cut file edited after `cut`: exit 1 `cut-mismatch`; cut file deleted: 2 `cut-missing`.
- T15 A commit record whose object bytes were edited: exit 3 `object-mismatch`; an `s_` id in an output list: 3; ledger with a broken hash: 3.
- T16 Fail beats not_run: one failing rule plus a missing model result gives exit 1 with both slugs listed.
- T17 Action lines: `unverifiable_share_max` null: `{result: reading}`, no effect; set to 0.3 with `gate: true` and measures value 0.2: pass; 0.5: exit 1 `action-line-fail`; no `views/measures.json`: exit 2 `measure-missing`; `gate: false` with any value: reading; `coverage_floor` compares with `>=`; a param named `x_max` without `line` (e.g. `unattributed_share_max`) produces no action line.
- T18 Two consecutive identical `check` runs: same exit, same `gate.json` bytes, the second appends no ledger line; a changed input appends new `check` and `gate` lines.
- T19 `--dry-run` on both modes: same exit and `reasons` as real, `dry_run: true`, no file, no ledger line.
- T20 Stale ce 64, busy lock 75, script under `wt/` 3; every outcome prints one §1.3 line with `script: "gate"`; the ledger passes `verifyLedger`.
- T21 Schema files: a valid stpa, fmea and hazards object pass `checkFormat`; an extra key, `accepted` status, a `type` of `X`, a cell with `finding` and `na_reason` null, a hazard id `hazard1` and a 41-word statement fail with `schema-invalid`.
- T22 Several committed rows of one role for the current cut: the one whose `commit` ledger line has the highest seq is used (an earlier one with a defect does not matter), even when the earlier row has the higher `updated_rev`; `gate.json.hazards_sha` equals `lib.currentDesign(root).hazards_sha`.

## Cannot be tested without the app
- That two real blind sessions read only the cut (audit.mjs labels them; real transcripts, CONTRACT §7 item 7) and that the mapper's output is useful: the gate checks form and coverage, not meaning.
- That the model result's `sha` binds to a real protocol-model run (built elsewhere).
