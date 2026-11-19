# OUT checkpoint (LIMIT at about 330 K context; first helper)

Branch `u/OUT`, worktree `MAIN/.claude/worktrees/OUT`, commit **e38717a3** (parent ec3b04fd). Tokens at the stop:
`build-invariant: OUT outcome log and READY fence | calls 92 | tokens 19.64 M | context now 327.9 K`.

## Done (all in e38717a3; nothing run yet)

- `tcb/lib.mjs`: `outcomeSlotBytes`, `outcomeState` (R-a, R-b, R-c; `outcome-tamper` 3 with detail `why`: gap,
  after-fenced, slot-unparseable, slot-shape, slot-owner, slot-name, slot-not-file, not-a-folder; no `outcome/` = empty
  log, `present` false), `outcomeAppend(dir, slot, {row, check, create})` (fenced first, `check` on every read,
  identical, then create at `next`; `different` reads again; 64 tries).
- `tcb/guard-hook.mjs` `stepReadySlot`: READY path key; Edit -> `ready-write-only`; parse + `checkFormat(ready)` + task,
  epoch, step in row -> else `ready-invalid`; repair -> allow, no slot; `outcomeAppend` with `hookCreate`; fenced ->
  `attempt-fenced`; TcbError -> deny with its code. Header line 8 ("No step writes yet") left as is (shared).
- `tcb/replace.mjs`: `readyValid`/`readyShapeOk` removed; `readyInLog(dir,row)` is lib.fence's callback (line
  `const readyCheck = ...`); M6 block removed; `fenceOutcomeSteps` = steps 1-5 (retry path `fence-pending` 65; predictFence
  refusals; no slot for first/cut-drop-no-attempt, no manifest (H1), retry; ready check; no write in dry run or without
  `outcome/`; fenced slot via outcomeAppend with the ready check as `check`); `start` makes `outcome/` beside `staging/`.
- `tcb/commit.mjs` step 4 reads the log: fenced -> 1 `attempt-fenced`; no ready slot -> 2 `no-ready`; none for the
  step or later -> 1 `ready-mismatch`.
- `tcb/watch.mjs`: class 11 from the log (`readLog`; latest uncommitted ready step); class 12 and the zombie-write
  telemetry still read READY.json (departure to write: the repair marker takes no slot, so the log cannot carry it;
  telemetry is no decision). `commitExists` left unused on purpose (parallel units may use it).
- `tcb/status.mjs`: `readyPending` from the log; a bad log -> anomaly `outcome-tamper` (replaces `ready-unparseable`);
  zombie anomaly still READY.json; `readyStep`/`commitExists` left unused.
- `tcb/fsck.mjs`: check 10 `outcome` (`checkOutcome`), in `checks.outcome`.
- CONTRACT 3.12, 3.23 (full text), 4.6 (callback, steps 1-5, the two functions). 3.6's row text ("READY of e present")
  NOT changed (shared row; note it in result).
- Specs: lib.md, guard-hook.mjs.md, replace.mjs.md, commit.mjs.md, watch.mjs.md, status.mjs.md, fsck.mjs.md, briefs.md.
- Briefs: READY sentence appended to the READY line of child.md:41, fmea.md:21, fresh-reviewer.md:23, mapper.md:23,
  stpa.md:21; coordinator.md section 5a filled.
- Tests written (not run): guard-hook.test.mjs `FX-OUT 1`, `FX-OUT 2`, `FX-OUT hook clock` (inserted after T15; the
  clock test preloads `--import data:...Atomics.wait 2000` with hook_deadline_ms 1500); replace.test.mjs `FX-OUT 3`,
  `FX-OUT 4` (after T5b) plus T5/T5b put a ready slot (`readySlot`) and the tainted case asserts the slot after;
  commit.test.mjs `FX-OUT 5 (F7)` (before T16), `writeReady` also writes the slot (`addSlot`), T15 changed (epoch-1 READY
  in e2 -> 2 no-ready; new ready-mismatch case); fsck.test.mjs `FX-OUT 6` (before T13); watch/status `readyFile` also
  writes the slot; lib.test.mjs skeleton test line `const stubs = {...}` drops outcomeState/outcomeAppend.

## Left

1. Run the tests through MAIN's lane from the worktree's `research-tree/` (labels OUT-*): lib+commit (T 80, W 65),
   replace+fsck (T 90, W 55), watch (T 80, W 65), status (T 65, W 80); guard-hook.test.mjs from a detached checkout
   outside `.claude/` (`git -C MAIN -c core.longpaths=true worktree add --detach C:/Users/User/Documents/projects/hx-OUT
   u/OUT`, T 40, W 105, then `worktree remove --force`). My first lane call (OUT-lib-commit) printed nothing through my
   grep filter: run it again without the filter and read the lane's own output. Fix failures; commit.
2. Write `MAIN/research-tree/build/departures/OUT.md`: (a) watch class 12 and the zombie-write telemetry (watch and
   status) still read READY.json; (b) lib.test.mjs skeleton line `const stubs` edited (shared with W1, CLAIM: a landing
   conflict on that line is expected; resolve as the union of removals); (c) status anomaly `ready-unparseable` replaced by
   `outcome-tamper`; (d) commit T15's epoch-1 READY case now exits 2 no-ready; (e) slot shape/owner/gap/after-fenced are
   tamper (exit 3), beyond R-c's "do not parse"; (f) CONTRACT 3.6 row and guard-hook header line 8 left unchanged;
   (g) selftest.test.mjs not run (no READY in its fixtures).
3. Write `MAIN/research-tree/build/units/OUT/result.md` last (branch, final commit, each test file's pass/fail/not-run
   counts and lane label, departures file, tokens line, not done), then return in at most 8 lines.
