# admit.mjs (unit U1a)

## Purpose
The admission decision of R10: may this task's next attempt start now. It exports a pure
`decide(facts)` that `replace.mjs start` calls inside the run lock, and a read-only `check` mode that
shows the decision for one task or every waiting task. It reserves nothing: the reservation is
computed at each decision and never stored (R10, lib `reservation`).

## Command line
```
node tcb/admit.mjs check --root R [--task T] [--now ISO] [--free-mb M]
```
Read-only: no `--ce`, no `--dry-run` effect (it writes nothing anyway), no lock. Unknown flag,
missing `--root`, a `--task` not matching the task pattern → 66.

## Exports
- `decide(facts) → {admit: bool, reasons: [{code, detail}], reservation: int}`: pure, no I/O, no
  clock, every reason listed (not only the first). Used by replace.mjs (§8 decision 19).
- `gatherFacts(root, {task, now, freeMb, procList, ce}) → facts`: reads the files below; used by
  `check` and by replace.mjs (inside its lock, with the process list it took before the lock).

### facts (the input of `decide`)
`{row, rows, spentOf: {"<task>:<epoch>": tokens}, thresholds: {N_max, N_ceiling, peak_mb, reserve_mb,
B_tokens, r_tokens, unverifiable_share_max, f5_given} with isGate flags, freeMb, slots: {live,
unknown, unconfirmed}|null, pending: int (current attempts at step admitted|started with no matched
live process), halted, draining, protocol: {needed, frozen}, gate: {needed, result,
cut_sha, hazards_sha, current_cut_sha, current_hazards_sha}|null, selftest: {result, tcb_sha,
current_tcb_sha}|null, fsck: {result, seq, last_write_seq}|null, gateA: {needed, uncovered: key[],
unverifiable_share}|null}`.

## Reads (gatherFacts)
`run/tasks.json`, `run/ledger.jsonl` (lines `protocol-freeze`, `selftest`, `fsck`, `intake`,
`commit`, `halt`, `owner`, `drain`), `run/coord.json` (ce for `draining`), `tcb/thresholds.json`,
`treeSha(<root>/tcb)`, `completeness/gate.json`, the current cut and hazards (`lib.currentDesign`),
`store/status/card_status.jsonl`, `store/commits/*`, the objects they name, transcripts under
`transcripts_root` (spend, slot `unknown`), the process list (realProc, at the CLI edge).

## Writes
Nothing. stdout line only.

## Decision (each failing condition adds one reason)
1. `wrong-state`: the row is not (active|parked, stopped) (a planned row first takes `replace fence
   --reason first`, CONTRACT §3.6). `dep-not-committed` {deps: [task]}: any dep whose state is not
   `committed`.
2. `no-protocol` {field}: stage research|review|fresh-review|control and no `protocol-freeze` line
   naming `plan/frozen/protocol-<field>-*` (R33). Design-check tasks (field null) skip it.
3. Gate (R55), skipped for stage `design-check`: `gate-missing` (no gate.json: not-run counts as
   fail, R40), `gate-fail` (result ≠ pass), `gate-stale` (cut_sha or hazards_sha ≠
   `lib.currentDesign`'s).
4. `selftest-missing|selftest-fail|selftest-stale`: the last `selftest` line must have result pass
   and `tcb_sha` = `treeSha(tcb/)` (R41, decision 18).
5. `fsck-missing|fsck-fail|fsck-stale`: the last `fsck` line must pass and be newer (higher seq)
   than the last `intake` or `commit` line (R23, decision 18).
6. `ceiling` {N_max, N_ceiling}: N_max > N_ceiling (never above 3). `slots-full` {live, unknown,
   unconfirmed, N_max}: live + unknown + unconfirmed ≥ N_max (lib `slotCount`: an admitted, started
   or bound current attempt always counts one slot, so back-to-back starts cannot all pass).
   `slots-unknown`: slots null (process list failed) — fail-safe refusal.
7. `memory` {free_mb, reserve_mb, peak_mb, pending}: freeMb − reserve_mb − peak_mb × pending <
   peak_mb (the sessions admitted but not yet running have not taken their memory yet).
8. Budget: reservation = lib `reservation(rows, spentOf)`. When `B_tokens` is a gate with a
   non-null value: `budget` {B, reservation, r, e_task} if B − reservation − r < row.e_task. When B
   is null or `gate:false` the check is a reading (R45, decision 39): no reason, the numbers are
   still returned.
9. `halted`, `draining` from `lib.runFlags(lines, ce)` (R12: every start is blocked while draining,
   failure restarts included).
10. Gate A (R44), only for stage review|fresh-review: `gate-a-uncovered` {ids}: an approved id of
   the field neither covered by a card of status witnessed|confirmed nor listed in the committed
   pack's `not_covered`; `gate-a-unverifiable` {share, max}: the share of the field's cards with
   status `unverifiable` above `unverifiable_share_max` when that is a gate. With `f5_given` false a
   committed card counts as covering and the share is a reading only (R5 "a committed card until
   F5"; the same rule as `lib.variant`).
`admit` = no reasons. `reservation` is returned in both cases.

## check mode steps
1 `edgeFacts`. 2 `proc.list()` (failure → slots null). 3 Candidates: `--task` alone, else every row
at (active|parked, stopped). 4 `gatherFacts` + `decide` per candidate.
5 Result `{decisions: [{task, admit, reasons, reservation}], slots, free_mb, B, r}`.
Exit: with `--task`: 0 admit, 6 refused, 2 when the refusal is only `slots-unknown` or a fact file is
unreadable (`missing`/`unparseable`); without `--task`: 0 if any candidate (or none at all) is
admissible, 6 if every candidate is refused, 2 as above. Unknown `--task` → 1 `no-task`.

## Exit codes
0, 1 `no-task`, 2 `not-run` (proc-unavailable, missing, unparseable, schema-version), 3
`run-from-attempt`, 6 `deferred`, 66, 67 (tasks.json corrupt), 70.

## Rules implemented
R10 (all conditions, reservation over every attempt incl. zombie and post-limit spend, live
processes incl. stop-unconfirmed), R12 (drain blocks starts), R33, R40 (missing = not-run = fail),
R41, R44 (gate A), R45 (null threshold = reading), R55 (design-check skips the gate); §8 decisions
17, 18, 19, 40. Model findings F6 (count live processes, not table state), A7 (refusal changes
nothing); second model check M4 (rows admitted but not yet started are reservations): already
implemented by condition 6 through `lib.slotCount` (an admitted current attempt always counts one
slot, CONTRACT §4.10), so this spec is unchanged apart from the test T6c.

## Behaviours (tests)
`decide` tests call the function with literal facts; `check` tests run the script on a temp root.
- T1 decide: every condition met → `{admit:true, reasons:[]}`, reservation as lib computes it.
- T2 decide: two deps, one `active` → reason `dep-not-committed` with that dep only.
- T3 decide: no protocol frozen for a research row → `no-protocol`; the same for a design-check row
  (field null) → admitted.
- T4 decide: gate result `fail`, `null` (missing) and stale cut_sha each give their slug; a
  design-check row with a missing gate is admitted (R55).
- T5 decide: selftest tcb_sha ≠ current → `selftest-stale`; fsck seq lower than the last intake seq
  → `fsck-stale`.
- T6 decide: slots {live 1, unknown 0, unconfirmed 1}, N_max 2 → `slots-full`; {1,0,0} → admitted;
  slots null → `slots-unknown`; N_max 4, N_ceiling 3 → `ceiling`.
- T6b slotCount through check: two rows at step admitted with no process and no transcript, N_max 2
  → a third candidate refused `slots-full` (each counted `unknown`, never zero).
- T6c (M4, the model's trace) check, N_max 2: row A at epoch 2 step admitted (no process, no
  transcript) whose attempt 1 has `stop: unconfirmed` (a zombie after a planned hand-over), row B at
  active/stopped → B refused `slots-full` {unconfirmed 1, unknown 1}. Counting only live and
  unconfirmed attempts would give 1 < 2 and admit B: three sessions once A and B both start.
- T7 decide: freeMb 2000, reserve 1024, peak 1200, pending 0 → `memory`; freeMb 2300 → admitted;
  freeMb 2300 with pending 1 → `memory`.
- T8 decide: B 10000 gate, rows spent 3000 (finished) + bound row e_task 5000 spent 1000 →
  reservation 3000 + 1000 + 4000 = 8000; new e_task 1500, r 0 → `budget`; e_task 2000 with B 10500
  → admitted. B null → admitted, reservation still 8000.
- T9 decide: a `halt` flag → `halted`; `draining` → `draining`; both listed together with
  `memory` when all three hold (all reasons, not the first).
- T10 decide: review row, one approved id neither covered nor in `not_covered` → `gate-a-uncovered`
  with that id; with f5 false and the id covered by a committed card → admitted.
- T11 decide is pure: the same facts give deep-equal output twice; the facts object is unchanged.
- T12 check `--task` on an admissible fixture (`--free-mb 99999`) → exit 0, `result.decisions[0]
  .admit` true; no file in the root changes (tree hash before = after), no `run.lock` created.
- T13 check `--task` with `--free-mb 10` → exit 6, `code` `deferred`, `reasons[0].code` `memory`.
- T13b check on a planned row → `wrong-state` (it needs `replace fence --reason first`); check
  without `--task` does not list planned rows.
- T14 check with a `halt` line followed by `owner {act:resume}` → not halted.
- T15 check with two rows whose attempts have `stop: unconfirmed` and N_max 2 → every candidate
  refused with `slots-full`, exit 6 (no process list needed for those counts).
- T16 check with a bound attempt that has a transcript (from `fakeTranscript`) under the test's
  `transcripts_root` but no matching process → counted `unknown`.
- T16b (M4, review U1-F1) check with one row at step admitted (no process, no transcript) and a
  candidate, reserve 1024, peak 1200, N_max 2, `--free-mb 2300` → exit 6 `memory` {pending: 1};
  without the admitted row → admitted.
- T10b (R44, review U1-F2) check `--task` on a review row, gate A read from files: a committed card
  of the field covers a, the latest pack lists b in `not_covered` → admitted; no pack →
  `gate-a-uncovered` [b]; `f5_given` true and the card still pending, no pack → [a, b]; the card
  witnessed and the pack present → admitted.
- T17 check with `tasks.json` holding a row with `step: "running"` → exit 67.
- T18 check `--task nosuch` → exit 1 `no-task`; `--task Bad_Id` → exit 66.
- T19 check with `gate.json` unparseable → reason `gate-missing` and exit 2 for that task.
- T20 Every stdout is one §1.3 line with `mode:"check"`, `dry_run:false`, `ledger_seq:[]`.

## Cannot be tested without the app
Whether a real session's processes are found by `attemptProcesses` (§7 item 4), so whether `live`
counts real children; real memory peaks per session (`peak_mb` is a guess until measured).
