## P03

### A (earlier helper, ended 2026-11-19T22:08)
**Brief A:**
You are the successor builder of unit W2 in the build of task r57-0507. W2 is FX-W2: arm first, confirmed by an alarm that has not exited. Kind: build-invariant. Model: Opus. MAIN = `C:/Users/User/Documents/projects/harness-engineering`.

The first W2 helper reached its 330 K context checkpoint at 14.67 M tokens. It committed `u/W2` 1ac4ce94: the FX-W2 code in watch.mjs and status.mjs, with no test run yet. Its checkpoint lists every decision it made and the steps left, in order: `MAIN/research-tree/build/units/W2/checkpoint.md`. **Start from that file.**

Do not redo its design reading. Open only the design places a step you are taking needs.

Read first:
- `MAIN/CLAUDE.md`: the repository's rules.
- `MAIN/research-tree/build/briefs/B1-2.md`: your brief. Its part "Builders" applies, and so do the W2 row and the "W2 places". Note the steps "Before the result": merge `build`, then run the e2e from a checkout outside `.claude/`.
- `MAIN/research-tree/build/briefs/B0b.md`, the part "Builders (build-invariant, opus): common".

Your worktree is `MAIN/.claude/worktrees/W2` on branch `u/W2`.

Do not edit any of these:
- `.claude/hooks/*`;
- `tools/check-commit.mjs`;
- anything under `docs/program/evidence/` or `recovered/`.

**Tokens.** Your limit is 14.5 M: the rest of the unit's 29.2 M. The counter, run with your own words:
`node C:/Users/User/Documents/projects/harness-engineering/research-tree/build/tools/tokens-self.mjs "W2 alarm slot successor"`

At about 330 K context or at the limit:
1. Commit.
2. Rewrite `MAIN/research-tree/build/units/W2/checkpoint.md` with what is done and what is left.
3. Return `LIMIT <path>`.

Write `MAIN/research-tree/build/units/W2/result.md` last, and never at a LIMIT. Departures go into `MAIN/research-tree/build/departures/W2.md`. Return in a [...cut]

**Report A:**
LIMIT C:/Users/User/Documents/projects/harness-engineering/research-tree/build/units/W2/checkpoint.md
- Branch u/W2, clean tree, last commit d5690df3. The new commits are d81b5951 (tests, the hook's alarm form, fixtures) and d5690df3 (the four specs and CONTRACT).
- Tests: the last whole run of watch+status (`W2-ws2`) had 118 tests: 110 pass, 2 fail, 6 skipped. Both failures were in the watch test file, whose line check expected the script name watch on status lines. After the fix only the FX-W2 watch tests were rerun (`W2-w3`: 3 of 3 pass); the whole files have not been rerun. guard-hook.test.mjs from the outside checkout hx-W2 (`W2-gh`): 30 tests, 27 pass, 0 fail, 3 skipped.
- Done: fixtures, hook form plus T16, the adapted tests, 4 new FX-W2 tests (BUILD-PLAN's 3 plus a usage test), the watch/status/guard-hook/lib specs, and CONTRACT (3.9, the writer and scripts tables, decisions 40 and 41).
- Departures: research-tree/build/departures/W2.md, items 1-9. Item 9, brief place 0a, is not yet edited.
- Left: brief places 0a, 2 and 3 in tcb/briefs/coordinator.md; one whole rerun of watch+status; merge `build`; e2e adapted at lines 431, 493 and ~733 and run once; result.md.
- Tokens: this helper used 13.24 M of its 14.5 M. The unit has used about 27.9 M of 29.2 M, so a successor has about 1.3 M, which is too little for the e2e. It needs a raised cap.

### B (later helper, started 2026-11-19T22:08)
**Brief B:**
You are the third and last builder helper of unit W2 in the build of task r57-0507. W2 is FX-W2: arm first, confirmed by an alarm that has not exited. Kind build-invariant, model Opus. MAIN = `C:/Users/User/Documents/projects/harness-engineering`.

**Where W2 stands.**
- Two helpers built it: 14.67 M and 13.24 M tokens.
- Branch `u/W2` in worktree `MAIN/.claude/worktrees/W2` has a clean tree at d5690df3.
- Code, fixtures, the hook's alarm form and T16, 4 new tests, the specs and CONTRACT are done.
- Departures 1-9 are in `MAIN/research-tree/build/departures/W2.md`.
- What is left, in order, is in `MAIN/research-tree/build/units/W2/checkpoint.md`. **Start from that file. Do not redo design reading.**

What is left:
1. Brief places 0a, 2 and 3 in `research-tree/tcb/briefs/coordinator.md` (departure item 9).
2. One whole rerun of `tcb/test/watch.test.mjs` and `tcb/test/status.test.mjs` through the lane. The last whole run had 2 failures in watch, fixed since; only the FX-W2 tests were rerun.
3. Merge the current `build` tip: `git -c core.longpaths=true merge build`.
   - Batch partner PLAN may have landed by then. It also changes watch.mjs and status.mjs.
   - `git merge-tree` shows that `u/PLAN` and `u/W2` conflict in `research-tree/CONTRACT.md` and `research-tree/spec/watch.mjs.md`.
   - Resolve every conflict as a union, each side kept whole. Then rerun watch and status, plus lib if the merge touched it.
4. The e2e. The checkpoint names the points: lines 431, 493 and about 733 of `research-tree/e2e/run-e2e.mjs`.
   - Adapt it to what FX-W2's actors now do, never a script.
   - Run it once from a detached checkout of `u/W2` outside `.claude/`, from that checkout's `research-tree/` folder: `node C:/Users/User/Documents/projects/harness-engineering/research-tree/tools/lane [...cut]

**Report B:**
W2 done; result at C:/Users/User/Documents/projects/harness-engineering/research-tree/build/units/W2/result.md.
- Branch u/W2, final commit 308abe83, clean tree. The last two commits are dac3c7fb (coordinator brief places 0a, 2 and 3, plus an FX-W2 line in spec/briefs.md) and 308abe83 (the e2e).
- Merging build gave "Already up to date": the build tip is still b6fabfa0 and PLAN has not landed. Merge-tree of u/W2 with u/PLAN (eb0c6810) still conflicts in research-tree/CONTRACT.md and spec/watch.mjs.md only. Whichever lands second resolves them as a union.
- Tests through the lane: W2-ws3 (watch 80 tests: 76 pass, 0 fail, 4 skipped; status 38 tests: 36 pass, 0 fail, 2 skipped; 80 s). W2-gh (guard-hook 30 tests: 27 pass, 0 fail, 3 skipped) still holds, since guard-hook has not changed since d5690df3.
- e2e W2-e2e from the detached checkout hx-W2e2e (since removed): 232/232 steps ok, 0 FAIL. Lines 431 and 493 now expect exit 1 arm-unconfirmed. The stand-in alarm writes slot-1 and its nonce file, then reconcile --arm-nonces gives exit 0 with arm confirmed.
- Departures: MAIN/research-tree/build/departures/W2.md, items 1-9; item 9 (brief place 0a) is now done.
- Tokens: builder 1 14.67 M, builder 2 13.24 M, builder 3 4.14 M at 44 calls; unit total about 32.1 M.
- Not done: no tests for departures 4 and 6 or for the brief's text; the real ensure process runs only in watch.test.mjs; S1's single-death gap waits for FX-W4 (B1-4); the full suite is the root's.

---

## P06

### A (earlier helper, ended 2026-11-19T23:40)
**Brief A:**
You are the successor builder of unit CLOSE in the build of task r57-0507. CLOSE is FX-CLOSE: releasing a finished child's slot. Kind build-invariant, model Opus. MAIN = `C:/Users/User/Documents/projects/harness-engineering`.

**Where CLOSE stands.** The first helper stopped at 305 K context and 22.42 M tokens. `u/CLOSE` is at 4126cb75 and the tree is clean.

Built:
- stop request takes a committed row at started;
- stop verify confirms only on (a), (b) and (c), with the wall floor through the sample's `at`;
- an unconfirmed verify adds 1 to `verify_rounds` and gives reason `close-missing`, and `lib.fence` resets the count;
- the hook's close answer is anchored;
- the watcher's stop-verify act waits for the wall floor;
- the contract, the stop spec and brief section 5c are updated.

Tests that pass: `CLOSE-stop-lib` (stop + lib) 248 pass, 0 fail, 5 skipped, and T1's todo now passes; redo 7 pass; guard-hook from outside `.claude/` 27 pass, 0 fail, 3 skipped.

The id gap stays open. No measured fact ties the CLI id to `local_<uuid>`, so every close ends with the owner's `closed` act. That is a departure for S2.2.

The checkpoint lists what is left: `MAIN/research-tree/build/units/CLOSE/checkpoint.md`. **Start from it, and do not redo the design reading.** What is left:
1. The status/watch test "FX-CLOSE T3": `close-session` end to end through status and the watcher, on a continuing row as well as an ended one, and the watcher's wall floor. It must also cover `closesMissing` and the `planFacts` facts you read (B1-3's "CLOSE places", from PLAN's refuter).
2. `MAIN/research-tree/build/departures/CLOSE.md`, including the id gap for S2.2.
3. Merge the current `build` tip (`git -c core.longpaths=true merge build`). Resolve any conflict as a union with each side kept whole, then [...cut]

**Report A:**
LIMIT C:/Users/User/Documents/projects/harness-engineering/research-tree/build/units/CLOSE/checkpoint.md
1. Done: the FX-CLOSE T3 tests are in commit d478c7cc on u/CLOSE, and the tree is clean. They cover close-session end to end through status and the watcher on four rows: three that continue (stopped, admitted at e2, bound) and one that has ended. They also cover closesMissing, the fenced reason, a tampered log, an invalid claim, the orphan holding the only slot, and the watcher's wall floor.
2. Test results: status 38 pass, 0 fail, 2 skipped (CLOSE-status). Watch 80 pass, 0 fail, 4 skipped (CLOSE-watch). Both ran on d478c7cc.
3. `departures/CLOSE.md` is written with items 1-10. Item 1 is the id gap for S2.2: nothing measured ties the CLI id to `local_<uuid>`, so the relay through the owner's `closed` act stays.
4. Merging build changed nothing: the build tip is still 2a8480af.
5. Not done: the e2e has not run, departures item 11 (the e2e edits) is not written, and there is no result.md. The checkpoint gives the exact steps.
6. Tokens: this helper used about 6.7 M against the 6.7 M limit. Each call cost about 175 K at the end.
7. The unit has now used about 29.1 M of its 29.2 M (22.42 M + 6.7 M). Another helper needs a new limit from you.

### B (later helper, started 2026-11-19T23:40)
**Brief B:**
You are the third and last helper of unit CLOSE in the build of task r57-0507. CLOSE is FX-CLOSE: it releases a finished child's slot. Your kind is build-invariant and your model is Opus. MAIN = `C:/Users/User/Documents/projects/harness-engineering`.

**Where CLOSE stands.** Two helpers built it, with 22.42 M and 6.7 M tokens. `u/CLOSE` is at d478c7cc with a clean tree, and merging `build` (2a8480af) changed nothing. Done so far:
- all code;
- the FX-CLOSE T3 tests;
- `CLOSE-status`: 38 pass, 0 fail, 2 skipped;
- `CLOSE-watch`: 80 pass, 0 fail, 4 skipped;
- `CLOSE-stop-lib`: 248 pass, 0 fail;
- redo: 7 pass;
- guard-hook, run from outside `.claude/`: 27 pass, 0 fail;
- departures 1-10 in `MAIN/research-tree/build/departures/CLOSE.md`.

The exact steps that are left are in `MAIN/research-tree/build/units/CLOSE/checkpoint.md`. **Start from it, and do not redo design reading.**

**Left to do:**
1. **The e2e** (`research-tree/e2e/run-e2e.mjs`).
   - Adapt `stopCommitted` and the f1-control stop to what FX-CLOSE's actors now do, as the checkpoint says. Never change a script to suit the e2e.
   - Run it once from a detached checkout of `u/CLOSE` outside `.claude/`. Create the checkout with `git -C MAIN -c core.longpaths=true worktree add --detach C:/Users/User/Documents/projects/hx-CLOSEe2e u/CLOSE`.
   - From that checkout's `research-tree/` folder, run `node C:/Users/User/Documents/projects/harness-engineering/research-tree/tools/lane.mjs --label CLOSE-e2e --timeout-s 135 --wait-s 10 -- node e2e/run-e2e.mjs`. It has 232 steps.
   - Remove the checkout at the end.
   - If a step fails for a reason that is not CLOSE's, name it by unit.
2. **Departures item 11:** the e2e edits.
3. **`MAIN/research-tree/build/units/CLOSE/result.md`**, written last.
   - CLOSE has no reviewer of [...cut]

**Report B:**
CLOSE is finished. `u/CLOSE` is at 572bb8eb with a clean tree; that commit changes `research-tree/e2e/run-e2e.mjs` only, and no script was changed.
- **e2e (CLOSE-e2e):** 239 of 239 steps pass, 0 fail, lane exit 0 in 83 s. It ran once from the detached checkout `C:/Users/User/Documents/projects/hx-CLOSEe2e`, now removed. It was 232 steps; the 7 new ones are the owner's `closed` acts below.
- **The edit:** a new `closeAttempt` records each stopped session's close by the owner's act (`status owner --act closed`, quoting `plan/notes/closed.txt`). Before each comparing verify, the e2e clock moves by `stop_verify_ms` (120000). This covers the f1-control stop and `stopCommitted`.
- **Departures:** item 11 added to `MAIN/research-tree/build/departures/CLOSE.md`. Checkpoint 3 added to `units/CLOSE/checkpoint.md`.
- **Result:** `MAIN/research-tree/build/units/CLOSE/result.md`. It lists the 6 lane runs for the landing with counts and labels: stop-lib 248 of 253, redo 7 of 7, guard-hook 27 of 30, status 38 of 40, watch 80 of 84, e2e 239 of 239. It names B1-4's combined review as CLOSE's reviewer.
- **Tokens:** helper 1 22.42 M, helper 2 about 6.7 M, helper 3 3.42 M at the last count (about 3.7 M at the end). The unit total is about 32.8 M.
- **Not done:** the id gap stays open for S2.2, so every close needs the owner's act. The PostToolUseFailure error shape is not measured. 14 tests were skipped. `stop_verify_ms` is a guess. The e2e covers neither the hook's close path nor a second session in one folder.

---

## P09

### A (earlier helper, ended 2026-11-04T18:10)
**Brief A:**
You are the root's adversarial reviewer for slice S09 ("Doctor dashboard, drill-down and exports") of the MD Health Clinic inventory application (Django 5.2, PostgreSQL 17). Your job is to REFUTE the slice's claims by reading code, not to summarize it. Reply with your full findings as text in your final message (do not write files).

Where: worktree `C:\Bilal_Migration\User\Downloads\20_PROJECTS\24_Clinic_Workshop\.claude\worktrees\epic-blackwell-8e1f51`, branch `claude/stoic-hodgkin-938a0b`, head 2687a1c, cut from `main` at 948735a (use `git -C <worktree> diff 948735a 2687a1c -- <paths>` or read files). HARD RULE: do not run pytest, manage.py, scripts/check.py or anything that touches a database; the root's own check is running in that worktree on the same test database. You may run `uv run --locked python -c "..."` for pure imports that open no connection, and ruff/mypy read-only. Do not modify any file.

Scope for this reviewer (restriction surfaces, screens, shared-file edits, records): `src/clinic/reporting/views.py`, `urls.py`, `templates/reporting/*`, `templatetags/reporting_tags.py`, `tests/` (the per-role access tests, page tests, browser layout test, the slow-connection record), the shared-file edits (`src/clinic/ui/forest.py`, `src/clinic/ui/screens.py`, `src/clinic/ui/tests/test_global_bar.py`, `src/clinic/ui/tests/test_shortcuts.py`, `src/clinic/urls.py`), and the records `docs/tasks/s09-overview/task.md`, `docs/application/s09-decision-record.md` (D09-01 to D09-22), `docs/tasks/s09-overview/evidence/`. Context: `docs/technical-plan/contracts-and-permissions.md` (the capability table rows `report.stock`, `report.finance`, `data.export`, `payroll.read`, `cash.full`, `audit.read`; the payroll-protection paragraph and "unauthorized fields omitted, never shown  [...cut]

**Report A:**
I found one P1, three P2 and several P3 findings in S09. I only read code: nothing was run and no files were changed.

## Findings

**F1 (P1): the salary account's individual incoming movements can be rebuilt by a viewer with `report.finance` but no `cash.full`.**
- **Where:** `reporting/metrics/money.py:300-349` (the transactions list), `money.py:413-424` (the summary), `envelope.py:180` (only refuses `from > as_of`, so a one-day period is allowed).
- **Scenario:** a finance operator, or the doctor without the pay grant, requests `/reports/cash-flow/?view=transactions&account=<till>&from=D&as_of=D` for each day D.
  - Lines of documents the hidden-document rule hides are added into one row per account, "Other lines, not itemised for you".
  - On the till, the only documents hidden by that rule are transfers to or from the salary account. Over a one-day window that row is exactly that day's transfer.
  - So the date and amount of every funding transfer comes back. That is the salary account's movement history, which D07-11/D08-14 put behind `cash.full`.
  - The summary leaks the same figure by difference: the till's cash out minus the itemised lines. If payroll is funded from the till, this is the payroll total per period.
- **The code's own tests confirm it.** `tests/test_review_round1.py:163-166` asserts the viewer without `cash.full` sees `-777`, the exact amount moved to the salary account.
- **The leak test cannot see it.** In `test_access.py:56` the salary account is funded by a direct receipt, and the till-to-salary transfer at `:83-86` is 100, which is not in `FORBIDDEN_TOKENS`.
- **What this refutes:**
  - D09-18's "without marking each payment to the hidden account".
  - The T12 row in task.md:21 ("money moved to it … [no] total from which they could be inferr [...cut]

### B (later helper, started 2026-11-04T19:18)
**Brief B:**
You are the root's targeted re-reviewer for slice S09 ("Doctor dashboard, drill-down and exports") of the MD Health Clinic inventory application (Django 5.2, PostgreSQL 17), gate round 2. Your job is to REFUTE the slice's claims that it fixed six findings, by reading the code and the diff, not to summarize. Reply with your full findings as text in your final message (do not write files).

Where: worktree `C:\Bilal_Migration\User\Downloads\20_PROJECTS\24_Clinic_Workshop\.claude\worktrees\epic-blackwell-8e1f51`, branch `claude/stoic-hodgkin-938a0b`, head 96725a5, rebased onto `main` (the merge base is after the prototype retirement merge 2aedeaa). The round-1 head was 2687a1c before the rebase; the fix commit is the last one on the branch (`git -C <worktree> log --oneline -4` shows it; read `git -C <worktree> diff <records commit> 96725a5` or simply `git -C <worktree> show 96725a5 --stat` and the diff of the fix commit). The slice's own record of the round is `docs/tasks/s09-overview/evidence/gate-round-1.md` (or the task record's gate section). HARD RULE: do not run pytest, manage.py, scripts/check.py or anything that touches a database; the root's own check is running in that worktree on the same test database. You may run `uv run --locked python -c "..."` for pure imports that open no connection, and ruff/mypy read-only. Do not modify any file. Context: `src/clinic/reporting/` (registry.py, envelope.py, metrics/money.py, metrics/stock.py, exports.py, views.py, tests/), `src/clinic/finance/reports.py` (S07's `sees_all_cash`, `may_see`), `operations/visibility.py`, `docs/technical-plan/contracts-and-permissions.md` (the metrics table, the payroll-protection paragraph: "A shared cash account that pays salaries exposes amounts through its balance/history even if names are  [...cut]

**Report B:**
**S09 gate round 2 re-review: G09-01 to G09-06 at 96725a5**

G09-01 is closed on S09's own surfaces, but the salary funding can still be rebuilt elsewhere in the application. S07's money pages show the till's balance and close amounts, and S09 links to one of them. G09-02 to G09-06 are closed, with minor gaps noted. Nothing was run except a read-only `ruff check src/clinic/reporting` (it passed).

**G09-01 (P1): closed on S09 surfaces; still open in the application (P1, S07 pages)**

- **The S09 code holds.**
  - `base.hidden_line_filter` (base.py:107-128) covers documents hidden by rule and documents touching an unseen cash account.
  - These lines are excluded from every list:
    - the cash-flow transactions list (money.py `_cash_lines_list`)
    - the supplier lines list (`_supplier_lines_list`)
    - the expense lines list (`_expense_lines`)
  - `touched()` takes no date filter, so withholding does not move with the window.
  - For a touched account, opening and closing are withheld; cash in is withheld on a debit mark and cash out on a credit mark (money.py:476-486).
  - `_total` withholds any total with a withheld part.
  - The `account=` filter narrows rows only; the marks are computed for all visible accounts.
  - The salary account's id gives no rows, like an unknown id.
  - Cash variance withholds expected and counted (money.py:641-642).
  - JSON writes `"withheld"`; CSV writes `withheld` plus the `withheld_count` and `coverage` preamble rows.
  - The export manifest's omitted list carries "Lines of documents you may not see".
  - An account that never touched a hidden document keeps its full figures (the marks default to False).
- **The new test does what was asked.** It uses a distinctive amount (4 321 987), one-day windows 2 to 8 November and the whole wee [...cut]

---

## P12

### A (earlier helper, ended 2026-11-17T20:06)
**Brief A:**
You work in the repository C:/Users/User/Documents/projects/harness-engineering (below: REPO). Read REPO/CLAUDE.md first: its rules bind you. Your job is extraction only: facts with their sources. No verdict, no recommendation.

Why. The owner's team swept the published work of Dex Horthy on context engineering for coding agents. The owner wants everything in that record that Horthy has proved, across all of context engineering and not only instruction files, so that nothing is missed that would bite later, and so that each item can be enforced. Another reader is covering instruction files (CLAUDE.md, AGENTS.md) in detail: for those items give one line only. "Proved" must not be overstated: separate what he reports as a result from what he recommends.

Sources in REPO
- docs/program/HARNESS-IDEAS-HORTHY-2026-11.md: the main document. Read its summary, its tables of kept ideas and its limits.
- docs/program/evidence/harness-ideas/horthy/review/POST-REVIEW-LIST.md (866 lines): the ideas after review. Read it whole in parts.
- docs/program/evidence/harness-ideas/horthy/addendum-2026-11-09/README.md, review/ADDENDUM-POST-REVIEW.md (126 lines), review-input/NEW-cards.md (217 lines).
- docs/program/evidence/harness-bottlenecks/fit/FIT-LIST.md (94 lines), fit/in/horthy-survivors-A.md, -B.md, -C.md, and fit/in/horthy-fallen-1.md to -5.md.
- docs/program/evidence/harness-ideas/horthy/README.md and inventory.md: what was read and how, and the limits.
- docs/program/evidence/harness-ideas/horthy/sweep/PRE-REVIEW-LIST.md is 13,424 lines: Grep only, to fetch what Horthy himself reports for an idea.

Output: write only REPO/docs/program/evidence/harness-method-status-2026-11-18/horthy-proved-general.md (create the folder if missing), at most 240 lines. No git command that writes, no  [...cut]

**Report A:**


### B (later helper, started 2026-11-17T20:07)
**Brief B:**
You work in the repository C:/Users/User/Documents/projects/harness-engineering (below: REPO). Read REPO/CLAUDE.md first: its rules bind you. Your job is extraction only: facts with their sources. No verdict, no recommendation.

An earlier helper with this same task was killed. If the output file named below already exists, read it, keep what is sound, and finish it. Do not start over.

Why. The owner's team swept the published work of Dex Horthy on context engineering for coding agents. The owner wants everything in that record that Horthy has proved, across all of context engineering and not only instruction files, so that nothing is missed that would bite later, and so that each item can be enforced. Another reader covers instruction files (CLAUDE.md, AGENTS.md) in detail: for those items give one line only. "Proved" must not be overstated: separate what he reports as a result from what he recommends.

Sources in REPO
- docs/program/HARNESS-IDEAS-HORTHY-2026-11.md: the main document. Read its summary, its tables of kept ideas and its limits.
- docs/program/evidence/harness-ideas/horthy/review/POST-REVIEW-LIST.md (866 lines): the ideas after review. Read it whole in parts.
- docs/program/evidence/harness-ideas/horthy/addendum-2026-11-09/README.md, review/ADDENDUM-POST-REVIEW.md (126 lines), review-input/NEW-cards.md (217 lines).
- docs/program/evidence/harness-bottlenecks/fit/FIT-LIST.md (94 lines), fit/in/horthy-survivors-A.md, -B.md, -C.md, and fit/in/horthy-fallen-1.md to -5.md.
- docs/program/evidence/harness-ideas/horthy/README.md and inventory.md: what was read and how, and the limits.
- docs/program/evidence/harness-ideas/horthy/sweep/PRE-REVIEW-LIST.md is 13,424 lines: Grep only, to fetch what Horthy himself reports for an idea.

Output: write only REPO/docs/p [...cut]

**Report B:**
I wrote `docs/program/evidence/harness-method-status-2026-11-18/horthy-proved-general.md` (167 lines, 78 rows, no em dashes). The earlier helper's file did not exist, so I started fresh.

- **Counts:** after the 2026-11-09 addendum, over 861 families: adopt 24, trial 54, already-done 407, skip 376 (HI:49-52, 667-668). The first pass was 24, 53, 395, 350, plus 16 unrefuted over the cap (HI:184). Kept is 78 (FL:3). Dropped is 783.
- **Kept ideas with a reported result:** 9 of 78 have a card marked "measured" (G4-F022, F034, F023, F203, G1-F157, G4-F088, F025, F032, G1-F098). For 6 of them Horthy himself reports it (G1-F098 only as a count).
- **Strongest, as the record grades:** the record gives no kept family above 2 of 3 on evidence, and eight tie at 2 on both lenses. The order is my own: author first, then guest or third party.
  1. G4-F034 and G4-F022: the effort data, one run per setting, no error bars; his chart footnote says the pairs differ in date and agent version.
  2. G4-F023: 557 against 566 tests makes a cross-run comparison invalid.
  3. G4-F203: his spend figures; the record says they do not apply to a flat subscription.
  4. G1-F157: about 5.7k tokens for one MCP server, from a summarised episode source.
  5. G4-F088: 200 runs, 12.5 % added a second source of truth; this is Avery's result, repeated by Dex.
- **Tried in this project:** no trial of any kept idea is recorded; HI:5-6 says nothing is installed or adopted. The "tried" column gives only the FIT-LIST fit (2 direct, 23 supporting, 53 fixflow-only), which is a mapping, not a trial.
- **Where the results sit:** 88 of the 112 measured cards are in dropped families, mostly SlopCodeBench and third-party studies. Section 4 lists them with the record's reason for each.
- **Not found:** no result Horthy r [...cut]

---

## P15

### A (earlier helper, ended 2026-11-23T12:39)
**Brief A:**
Read and follow exactly the brief in RUN:fields/2b-graphs/briefs/reader-code-graph-build.md (RUN: = C:/research-runs/2026-11-harness-leads/)

**Report A:**
Output: C:/research-runs/2026-11-harness-leads/fields/2b-graphs/collect-code-graph-build.md. The done marker is written.
Papers read: 5 (PyCG, JARVIS, Codebase-Memory, Venkatesh et al. LLM call graphs, TraceEval). The full text of each is in RUN:papers/f2b/. I read the results, method and limits sections, not every page.
Could not open: 2, both with public routes not yet tried.
- The ISSTA 2024 dynamic call-graph preprint (dyncg): the authors' site timed out twice and left a damaged PDF. Not yet tried: arXiv, Semantic Scholar, the ACM open copy.
- Sui et al., ICSE 2020, "On the Recall of Static Call Graph Construction in Practice": found by search only, no PDF link. I did not claim its figures.
Sign-in: none.
Gaps searched: static call-graph recall, tree-sitter graph builders and build time, LLM versus static call graphs, execution-verified ground truth. Still open: Java/C++ tools (WALA, Soot, Doop), Jelly, code property graph build cost (Joern, CodeQL), SCIP indexers. The library had no record for any of the topic words.
Top results:
1. PyCG (quoted, paper.txt 34-37, 733-735): precision 99.2 %, recall 69.9 % on 5 hand-checked Python projects, about 61 MB and 0.38 s per 1 k LoC. Maker's own claim. Venkatesh et al. independently put PyCG at 84.9 % complete and 87.3 % sound on a 126-case micro-benchmark, against 60.3 % and 62.6 % for the best LLM; PyCG took 0.41 s and that LLM 534 s (llmcg paper.txt 1327-1337, 1262-1300).
2. Codebase-Memory, a tree-sitter graph (quoted, paper.txt 335-339, 388-391): 10x fewer tokens and 2.1x fewer tool calls, but quality 0.83 against 0.92 for a file-exploring agent. Opus 4.6 only, one repository per language, one grader. Build times: Django (49 K nodes) 6 s, Linux kernel (2.1 M nodes) about 3 min, incremental re-index 1.2 s. Self-reported. [...cut]

### B (later helper, started 2026-11-23T12:39)
**Brief B:**
Read and follow exactly the brief in RUN:fields/2b-graphs/briefs/reader-code-graph-build.md (RUN: = C:/research-runs/2026-11-harness-leads/). Second attempt: append to collect-code-graph-build.md and write done/reader-code-graph-build-2.done. Public routes untried: the ISSTA 2024 dynamic call-graph preprint (try arXiv, Semantic Scholar, the ACM open copy; the authors' site timed out) and Sui et al., ICSE 2020, "On the Recall of Static Call Graph Construction in Practice". Gaps still open: Java/C++ call-graph tools (WALA, Soot, Doop), Jelly, code property graph build cost (Joern, CodeQL), SCIP indexers.

**Report B:**
Second attempt finished. Appended "## Second attempt" to RUN:fields/2b-graphs/collect-code-graph-build.md (154 lines). Done marker: fields/2b-graphs/done/reader-code-graph-build-2.done. Nothing committed.
Read: S1 Helm et al. ISSTA 2024 (full, quoted), S2 Sui et al. ICSE 2020 via the author's open Massey thesis (chapter 6, quoted), S3 Jelly/PLDI 2024 (quoted), S4 QVoG (parts, quoted). S5 Joern flatgraph benchmark page and S6 scip-clang blog by fetch summary only.
Could not open: 0 left. Both earlier closed papers are now read. The ISSTA preprint came whole on a resumed curl retry from the authors' site; the ACM open copy gave a bot-check page. The ICSE 2020 PDF stays closed (ACM, S2 and OpenAlex list it closed), so it was read via the thesis, and no sign-in is needed.
Gaps searched: Java tools (WALA, Soot, Doop, OPAL), Jelly, Joern/CodeQL build cost, SCIP. For Joern/CodeQL there is no independent head-to-head, only maker figures. For SCIP there is no academic paper and no memory figure. Mistake: the first ISSTA guess, arXiv 2402.07294, was a different paper (kept as notrelated-*.pdf, unused). I also downloaded a JS call-graph paper to papers/f2b/jscgroot/ by mistake and did not claim it.
Most useful results:
1. Sui thesis: Doop, 31 Java programs, median recall 0.884 vs execution oracle; reflection support gives 0.935 on 20 programs, with 11 timeouts (quoted, suithesis/paper.txt 5400-5405, 5463-5469).
2. Helm et al.: call-graph size does not predict recall; edge-level recall is far below method-level (Doop 0-CFA 30.0 % vs 65.4 %); WALA 0-CFA timed out on Batik at 3 h with 400 GB heap (quoted, dyncg2/paper.txt 441, 477, 580, 638).
3. Jelly: JS recall 75.9 % to 88.1 % with hints on 36 projects, but 68 of the 141 candidate projects failed the 30 GB baseline limit; maker's o [...cut]

---

## P18

### A (earlier helper, ended 2026-11-14T14:11)
**Brief A:**
You write Vitest tests for a React 19 + Vite web app (FixFlow). Work only in the worktree `C:/Users/User/Documents/projects/EMS_workshop1/.claude/worktrees/brave-pike-8fb70a` (branch `claude/p8b-web`, head `5cd5ae3`, one commit on `27c9e04`). Do not commit, push, or edit any non-test source file; do not touch package.json/package-lock.json. Use the Bash tool; use `git -C` rather than `cd` into other trees. Bash commands over ~8 KB get cut, so write big files with the Write tool.

## The change under test (`git show 5cd5ae3` shows it)
The backend (PR #216, not in this tree) now requires: (1) `POST /api/jobs/{id}/completion` — when a MANAGER corrects a frozen bill (completion exists and bill sent, or negotiated figure set, or a non-voided payment), body `reason` is required (non-blank, <=256 chars) else 422 with a string detail like "correcting a bill the customer has seen, agreed or paid against needs a reason"; (2) `POST /api/jobs/{id}/bill/negotiate` — a MANAGER negotiating after the bill was sent must give a non-blank `note`, else 422 "the bill was already sent to the customer — say why the figure changes".
Web side:
- `src/features/jobs/data/mapJob.js`: `bill.sentAt` from `bill_sent_at` (null when absent).
- `src/shared/lib/job.js`: `isBillSent(job)`, `isBillFrozen(job)` (needs `job.completion` and one of `bill.sentAt`, `bill.negotiated != null`, a `job.revenue` entry with `!voided`), `MAX_CORRECTION_REASON = 256`.
- `src/features/jobs/components/CompletionForm.jsx`: new prop `isManager`. When `isManager && isBillFrozen(job)` (or after a 422 whose sentence mentions "reason") it shows a textarea labelled "Reason for correcting the bill (required)" with a count hint "n/256"; "Submit Completion" is disabled until the trimmed reason is 1..256 code points; the payload pas [...cut]

**Report A:**
All the new tests pass on head `5cd5ae3`. Each one that targets the new behaviour fails on base `27c9e04`, and the controls pass there. The full suite on head is 43 files, 356 tests, all passing. `npx eslint src` is clean and `npx prettier --check src` passes (the test files were formatted with `--write`). I found no bugs in the source change.

## Files

- Modified: `src/features/jobs/data/mapJob.test.js`
- New, page level: `src/features/jobs/pages/JobDetail.billReason.test.jsx` (17 tests)
- New, provider level: `src/app/providers/AppContext.billReason.test.jsx` (6 tests)
- Nothing committed, no source files touched, and the base checkout is restored (`git status --short` prints nothing, HEAD at 6f430ce).

## Changed expectations in `mapJob.test.js`

1. "maps snake_case API fields to the nested view shape" now expects `bill` to be `{original: null, negotiated: null, status: "none", sentAt: null}`. `mapBill` always emits `sentAt`, and it is null when `bill_sent_at` is absent.
2. "maps the bill, completion and ledger from paisa to rupees (P2f)" now feeds `bill_sent_at: "2026-06-07T11:00:00Z"` and expects `sentAt` to equal it. This is also the new mapping assertion. On base both of these fail on `bill.toEqual` (the actual `bill` has 3 keys, the expected one has 4).

## New tests: head and base

In the table, JD is `JobDetail.billReason.test.jsx` and AC is `AppContext.billReason.test.jsx`. Every JD and AC test passes on head. "Control" means it also passes on base, as expected.

| Test | Base result (first failure) |
|---|---|
| JD: frozen bill needs a reason, sent trimmed, when the bill was sent | FAIL, `expect(received).toBeInTheDocument()` (no reason field) |
| JD: same, when a negotiated figure is set | FAIL, same |
| JD: same, when a payment is not voided | FAIL, same  [...cut]

### B (later helper, started 2026-11-14T14:26)
**Brief B:**
You write Vitest tests for a React 19 + Vite web app (FixFlow). Work only in the worktree `C:/Users/User/Documents/projects/EMS_workshop1/.claude/worktrees/brave-pike-8fb70a` (branch `claude/p8b-web`, head `ae77663`; the previous reviewed head is `c2279f5`). Do not commit, push, or edit non-test source; do not touch package.json/package-lock.json. Use the Bash tool; use `git -C` rather than `cd` into other trees. Bash commands over ~8 KB get cut: write big files with the Write tool.

## The change under test (`git show ae77663`)
- `src/app/providers/AppContext.jsx` `handOverRefusal`: a 4xx (not 401) is handed to the form only if `opts.onRefused(sentence, status)` returns exactly `true`; otherwise the provider reports as before (`reportFailure`: a toast with the server's sentence, job re-read). `setNegotiatedBill(jobId, { amount, amountPaisa, note }, opts)` sends `amountPaisa` when it is a safe integer, else `rupeesToPaisa(amount)`.
- `src/features/jobs/components/CompletionForm.jsx`: a `mounted` ref; `onRefused` returns false once unmounted; after `await onSave(...)` it does nothing if unmounted, else `setSaving(false)` and calls `onClose()` when the save resolved true. JobDetail's `onSave` now just returns `app.submitCompletion(...)`.
- `src/features/jobs/pages/JobDetail.jsx` `NegotiateModal`: now rendered only when `modal === "negotiate"`, with `key={negotiate-${job.id}}` (per opening and per job); same mounted logic; a 422 makes the note required only when the sentence matches `/\bnote\b|\bsent\b/i`; the note is counted in code points, hint shows `n/256` (and " — too long, shorten it to save" when over), no `maxLength`, Save disabled over 256; the amount input is `type="text"`, parsed with `parseRupeesExact` (from `@shared/lib/currency`): an unparseable figure shows  [...cut]

**Report B:**
The new tests cover all of F1, F2, N1, N2, N3 and the exact-amount cases, and 20 of the 28 fail on `c2279f5`. The other 8 pass on both heads; they are controls, listed below. The full suite on head `ae77663` passes (45 files, 384 tests), and eslint and prettier are clean. I found no source bugs and did not touch source, `package.json` or `package-lock.json`.

**New test files**
- `src/features/jobs/pages/JobDetail.refusal.test.jsx` (20 tests; it drives the real JobDetail, with a toast probe and a "go to j2" button to reuse the page across job ids).
- `src/app/providers/AppContext.refusal.test.jsx` (8 tests).

**Per new test: head passes for all; base column is c2279f5**

| Test | Base (c2279f5) |
|---|---|
| F1 completion: Cancel while pending, then 409, gives a toast and no alert | FAIL: `expected '' to contain 'the job is already closed'` |
| F1 negotiate: same | FAIL: same line |
| F1 provider: `onRefused` returning false, undefined or "yes" (3 for `submitCompletion`) | FAIL: `expected false to be true` |
| F1 provider: `onRefused` returning false or undefined (2 for `setNegotiatedBill`) | FAIL: `expected false to be true` |
| F2: 422 on j1, Cancel, go to j2, reopen: no alert, "Note (optional)", no "already sent" hint | FAIL: `expected <p role="alert"> to be null` |
| F2: 422, Cancel, reopen on the same job: no "Not saved" alert | FAIL: `expected <p role="alert"> to be null` |
| N1: two unrelated 422 sentences keep "Note (optional)" | FAIL: `Unable to find a label with the text of: /Note \(optional\)/` |
| N2 completion: submit, Cancel, reopen, then the first request resolves: the reopened form stays | FAIL: `Unable to find ... role "button" and name /submit completion|submitting/i` |
| N2 negotiate: same | FAIL: `Unable to find a label with the text of: /Agreed amou [...cut]

---

## P21

### A (earlier helper, ended 2026-11-04T13:33)
**Brief A:**
You are the root's adversarial reviewer for slice S08 ("Restricted payroll information") of the MD Health Clinic inventory application (Django 5.2, PostgreSQL 17). Your job is to REFUTE the slice's claims by reading code, not to summarize it. Reply with your full findings as text in your final message (do not write files).

Where: worktree `C:\Bilal_Migration\User\Downloads\20_PROJECTS\24_Clinic_Workshop\.claude\worktrees\kind-grothendieck-2e7379`, branch `claude/s08-payroll`, head 0865481, cut from `main` at ed477ea (use `git -C <worktree> diff ed477ea 0865481 -- <paths>` or read files). HARD RULE: do not run pytest, manage.py, scripts/check.py or anything that touches a database; the root's own check is running in that worktree on the same test database. You may run `uv run --locked python -c "..."` for pure imports that open no connection, and ruff/mypy read-only. Do not modify any file.

Scope for this reviewer (postings, money arithmetic, separation and concurrency): the new app `src/clinic/people/` (models, services, migrations 0001 to 0009, testing, tests), `src/clinic/finance/migrations/0022_pay_reduction.py` and the `SETTLEMENT_KINDS` line in `finance/models.py`, the additive hooks the slice added to `src/clinic/operations/reversal.py` and `operations/visibility.py`, and the records `docs/tasks/s08-payroll/task.md`, `docs/tasks/s08-payroll/evidence/review-round-1.md`, `docs/application/s08-decision-record.md` (D08-01 to D08-20). Context: `operations/kernel.py` (`run_command`, idempotency, fault injection), `operations/periods.py`, `operations/testing.py` (race harness), `finance/ledger.py` (journal, accounts), `finance/cash.py` (`open_cash_account`, `pay_out`, `lock_accounts`, `require_cash`, the salary guard and the restricted twin document types; D07-11 and D [...cut]

**Report A:**
I found no P1. The money arithmetic, separation, salary-account guard and migrations hold as coded. The records are wrong in two places, though: what happens after a reversal, and which lock the correction-versus-reversal race really rests on. Fault injection also skips one document type.

## Findings

**F1 (P2): a reversed accrual leaves its period with no way forward, and D08-07 says otherwise.**
- Where: `accruals.py:251-259` and `:295-297`, `corrections.py:69-71`, `models.py:174-183`, and D08-07, the task record ("only a correction follows") and the review's finding 3.
- What the records say: D08-07 says that after a reversal "the next step is a correction, not a second accrual", and the task record repeats it.
- What the code does: `start_correction` refuses a fully reversed accrual ("not posted or was reversed"). `test_corrections.py:221` and `test_accruals.py:410` assert both refusals. The period cannot be redone either: periods are append-only, may not overlap, and the unique slot stays taken.
- Scenario, taken from the slice's own test: an accrual is posted "for the wrong person" and one `payroll.approve` holder reverses it. Re-accruing for the right person with the same pay-sheet line is then refused as a duplicate source (`people_accrual_one_per_source` still counts reversed originals). The only escape is to change the source text, which defeats the source-uniqueness rule. The wrong person's period can never be accrued again.
- Fix: correct D08-07, the task record and the review record. Then either let a fully reversed original free its source and period slot, adding "and not reversed" to both partial unique indexes plus a trigger, or let a correction follow a reversed original. As a minimum, warn on the reversal screen.

**F2 (P2): one person can undo an app [...cut]

### B (later helper, started 2026-11-04T15:40)
**Brief B:**
You are the root's targeted re-reviewer for slice S08 ("Restricted payroll information") of the MD Health Clinic inventory application (Django 5.2, PostgreSQL 17), gate round 2. Your job is to REFUTE the slice's claims that it fixed four P2 findings, by reading the code and the diff, not to summarize. Reply with your full findings as text in your final message (do not write files).

Where: worktree `C:\Bilal_Migration\User\Downloads\20_PROJECTS\24_Clinic_Workshop\.claude\worktrees\kind-grothendieck-2e7379`, branch `claude/s08-payroll`, head 4528022 (rebased onto `main` f8284d7). The fix commit is f8d65a2 on top of the records commit 3f7eb8c: read `git -C <worktree> diff 3f7eb8c f8d65a2` (the `people` app, its migrations 0010 to 0012, templates, tests, records) and the files around the hunks; the slice's own record of the round is `docs/tasks/s08-payroll/evidence/gate-round-1.md`. HARD RULE: do not run pytest, manage.py, scripts/check.py or anything that touches a database; the root's own check is running in that worktree on the same test database. You may run `uv run --locked python -c "..."` for pure imports that open no connection, and ruff/mypy read-only. Do not modify any file. Context: `src/clinic/operations/kernel.py`, `operations/reversal.py` (the hook S08 added), `operations/testing.py` (race harness), `src/clinic/finance/ledger.py`, `finance/cash.py`, `docs/application/s08-decision-record.md` (D08-01 to D08-24).

The four findings and the slice's fix claims to refute (verdict per finding: "closed", "open" with a concrete failing scenario and file:line, or "unverifiable"):
- G08-01 (P2): a fully reversed accrual left its period with no way forward (no correction after a reversed original; the partial unique indexes on source and period counted reversed originals [...cut]

**Report B:**
I found no P1 or P2, and all four claims hold. Every finding except G08-04 leaves a P3 test gap, and the fix commit adds three new P3 defects. I did not run anything that touches a database. I read `git diff 3f7eb8c f8d65a2` and the surrounding code, and ran ruff on `src/clinic/people` (clean). Head 4528022 changes only S08 docs on top of f8d65a2, and the worktree is clean.

## G08-01: closed (P3 test gap remains)

- **Indexes and trigger:** migration 0010 removes `people_accrual_one_per_source` and `people_accrual_one_per_period` (`models.py:171-174`). Its BEFORE INSERT trigger skips corrections. It takes `pg_advisory_xact_lock` on the source key and then on period plus type. It then refuses any other original that is not abandoned and whose posted document has no reversal row. `accruals.holding_slots()` (`accruals.py:256-262`) applies the same rule in the service.
- **Two re-accruals at once:** this is race-safe by construction. In READ COMMITTED a volatile plpgsql function takes a fresh snapshot for each statement, so once the second insert gets the advisory lock, its EXISTS check sees the first insert's commit. The same-period case is also serialized earlier by `start_accrual`'s `Employee ... FOR NO KEY UPDATE`. A trigger refusal comes back as INVALID through the savepoint `IntegrityError` handler (`accruals.py:323-332`). The lock order is always source then period, so there is no cycle.
- **Re-accrual racing the reversal:** while the reversal is uncommitted the re-accrual sees the original standing and is refused, which is the safe direction. A reversal cannot itself be reversed (`reversal.py:84-88`), so a slot cannot become held again.
- **No race test:** nothing in `test_pay_races.py` covers either race. The safety rests on the reasoning above, not on a test.
- * [...cut]

---

## P24

### A (earlier helper, ended 2026-11-17T21:56)
**Brief A:**
You extract records for a knowledge library. REPO = C:/Users/User/Documents/projects/harness-engineering. Use only Read and Write tools (Bash only to count lines if needed). Write only under REPO/library/.

Your file: REPO/docs/program/evidence/harness-method-status-2026-11-18/app-enforcement-mechanisms.md
Your prefix: x01

Job:
1. Read REPO/library/README.md, only the sections "A record" and "A new writer" (and the id ranges line under it). Nothing else in the library.
2. Read your one file (whole).
3. Write REPO/library/journal/2026-11-18/x01.jsonl: one JSON object per line, one record for each fact, status, published result or hypothesis the file states. Field order: id, kind, status, claim, when, quote, evidence, see, note, handles, footprint, supersedes, date, by; leave out empty fields. Always set "date":"2026-11-18" and "by":"x01".
 - id: x01-NNNN with four digits in the range for the kind (fact 0100-0199, status 0200-0299, result 0300-0399, hypothesis 0400-0499, open 0500-0599, mistake 0600-0699, pointer 0700-0799). Number consecutively within each range, no duplicates.
 - kind: fact (measured/observed here), status (how far a method was ever tested), result (a published result by others, with the author/source named in the claim), hypothesis (a design or guess not yet tested). Never use kind ruling or adjudication.
 - status: what the file itself says about how the thing is known: measured, observed, quoted, summary, textbook, reasoned, designed-only. Where the file does not say, use reasoned and add a "note" saying the file does not state it.
 - claim: ONE sentence, as short as it can be, carrying its number, unit and condition, and any caveat the file gives beside it. It must be understandable alone (name the method, paper, tool). Copy numbers exactly.
 - evi [...cut]

**Report A:**
53

### B (later helper, started 2026-11-17T22:12)
**Brief B:**
You extract records for a knowledge library. REPO = C:/Users/User/Documents/projects/harness-engineering. Use only Read and Write tools (Bash only to count lines if needed). Write only under REPO/library/.

Your file: REPO/research-tree/SELECTIONS-MAP.md
Your prefix: x19

Job:
1. Read REPO/library/README.md, only the sections "A record" and "A new writer" (and the id ranges line under it). Nothing else in the library.
2. Read your one file (whole).
3. Write REPO/library/journal/2026-11-18/x19.jsonl: one JSON object per line, one record for each fact, status, published result or hypothesis the file states. Field order: id, kind, status, claim, when, quote, evidence, see, note, handles, footprint, supersedes, date, by; leave out empty fields. Always set "date":"2026-11-18" and "by":"x19".
 - id: x19-NNNN with four digits in the range for the kind (fact 0100-0199, status 0200-0299, result 0300-0399, hypothesis 0400-0499, open 0500-0599, mistake 0600-0699, pointer 0700-0799). Number consecutively within each range, no duplicates.
 - kind: fact (measured/observed here), status (how far a method was ever tested), result (a published result by others, with the author/source named in the claim), hypothesis (a design or guess not yet tested). Never use kind ruling or adjudication.
 - status: what the file itself says about how the thing is known: measured, observed, quoted, summary, textbook, reasoned, designed-only. Where the file does not say, use reasoned and add a "note" saying the file does not state it.
 - claim: ONE sentence, as short as it can be, carrying its number, unit and condition, and any caveat the file gives beside it. It must be understandable alone (name the method, paper, tool). Copy numbers exactly.
 - evidence: a JSON array with the file's path relative to  [...cut]

**Report B:**
155 records written to `C:/Users/User/Documents/projects/harness-engineering/library/journal/2026-11-18/x19.jsonl`.

Not all of the file's content is in the journal. The 103 mapping rows are 103 hypotheses, but the hypothesis range 0400-0499 holds only 100. I wrote D1-01 to D8-08 as x19-0400 to x19-0499. D8-09, D8-10 and D8-11 are not written, and the top session should decide how to number them.

I did not run JSON validation (Bash was limited to the line count), so the lines are unchecked for syntax.

---

## P27

### A (earlier helper, ended 2026-11-21T09:30)
**Brief A:**
You are a helper of top session 6 in the harness-engineering repository (C:/Users/User/Documents/projects/harness-engineering). Kind: build-invariant. Model: opus. You succeed a helper that finished the analysis for starting the research run now, on this week's leftover (the owner's ruling r57-0051: `bash library/lookup.sh -f r57-0051`), and stopped at its window before applying it.

Read research-tree/build/apply/WEEKEND.md (its analysis, and section 5: what to apply, file by file). The run: C:/research-runs/2026-11-harness-leads (its own git; tools/gate.mjs and tests, run/config.json, briefs/COORDINATOR.md, GO.md). Apply section 5 as written, with two corrections of mine:

(a) The idle wait. Before the reset the weekend line rises as the hours left shrink (0.126 points an hour in WEEKEND.md), so a unit held only by that line becomes startable later in the weekend; sleeping until Monday would waste most of the leftover, which is what he asked to use. So: the gate's HOLD line for a hold on the weekend line states the earliest UTC time at which that unit's limit would fit at the current reading ("fits at <UTC>", or "not before the reset"); the coordinator, when nothing more starts, sets one wake at the earliest such time over its held units (12:05 UTC on 2026-11-23 if none fits before the reset), re-reads the meter at that wake and gates again (the re-plan of r57-0813 and a1-0400), with no 30-minute timer while nothing runs. Tests cover the fit time (a unit that fits later, one that never fits before the reset, the reading moving up meanwhile).
(b) The basis of 0.126 points an hour. State which sessions it counts. If it counts work that does not recur this weekend (top session 6's widening round of 2026-11-20 to 21 and its helpers, or other one-off rounds), compute the r [...cut]

**Report A:**
LIMIT (my context reached 203.5 K; I used 2.88 M tokens myself, plus two helpers). Notes are in H:research-tree/build/apply/WEEKEND.md, sections Applied A to E.
1. Commits in RUN:, made by my helper: c919eea config.json (weekend 0.081 an hour + 1.0 fixed, until 2026-11-23T12:00Z), cce1db1 gate.mjs and README (the weekend rule, and "fits at <UTC> (wake cron ... local)" or "not before the reset" on a meter hold), db27bbc gate.test.mjs, 7a76f69 COORDINATOR.md (5.5, plus one wake at the earliest fit time, no 30-minute timer while nothing runs). 53 tests pass (46 before).
2. GO.md and the page are not done. Nothing is committed for them and nothing is published. The exact replacement numbers are at the end of WEEKEND.md section C.
3. The rate: 0.126 counted top session 2 (957a3bc0) and top session 1's last two typed turns (34cb9690), 3.19 points in 25.35 h. Inside it is the one-off pilot-plan round of 11-20 08:59-10:34 (1.13 points). Without that round it is 0.081 an hour, and 0.081 is used. Top session 6's widening (5a6626f4) and the other round sessions were never in it.
4. Scratch test (11:00 UTC, 90 %, line 95.03): sheet, f2m, f3m and f4m START at once (f4m 94.25). f5 and f2a HOLD at 96.67, fits at 2026-11-22T07:12Z.
5. This week, expected: about 4.0 points (211.6 M; 0.9 Fable points), covering the sheet, f2m, f3m, f4m and f2a. At most 4.4 with units at their limits, 5.0 in the worst case found; the gate's bound is 9. Expected wakes: Sun 09:27 and Mon 10:01 UTC. Both find no room at his use of 0.081 (0.39 points together). Then the reset wake at Mon 12:05 UTC (17:05 his time).
6. Next week: 1,305 M = 21.05 points (17.2-24.8) and 2.1 Fable points. Total 141.6 + 211.6 + 1,304.9 = 1,658 M (1,417-1,891) of the 1.9 B cap. It ends about 23:50 Monday to 03:10 Tuesday his time.
 [...cut]

### B (later helper, started 2026-11-21T09:30)
**Brief B:**
You are a helper of top session 6 in the harness-engineering repository (C:/Users/User/Documents/projects/harness-engineering). Kind: build-invariant. Model: opus. You finish the change that lets the research run start now on this week's leftover (the owner's ruling r57-0051: `bash library/lookup.sh -f r57-0051`). Two helpers before you did the analysis and applied most of it; read research-tree/build/apply/WEEKEND.md (its analysis, section 5, and "Applied" A to E: what is committed, and point 7 of the last helper's return below).

The run: C:/research-runs/2026-11-harness-leads (its own git; committed so far: c919eea config weekend 0.081 an hour + 1.0 fixed until 2026-11-23T12:00Z; cce1db1 gate.mjs fits-at; db27bbc tests; 7a76f69 COORDINATOR.md one wake at the earliest fit time; 53 tests pass).

The last helper's open point: "the coordinator's gate reserve (0.49 at 62 M a point) is below its draw by the weights (0.65, high 1.01). At a true reading of 90.99 the meter would reach 100 at Mon 10:08 UTC. Computed fix for a successor to check: weekend fixed 1.0 to 1.52. The first four units still start."

Do:
1. Check that computation from its sources (WEEKEND.md, ROUTER.md section 2's weights, r57-0175); apply the fix you find right (1.52 or your figure) in run/config.json with a gate test that shows a unit started at the line cannot take the meter to 100 before the reset at the high weights. Commit.
2. Rerun the scratch test outside the run folder at the meter as it reads now (91 % all models, 54 % Fable at about 10:45 UTC on 2026-11-21) with a go at about 11:30 UTC: which units START at once, which HOLD and when each fits.
3. Recompute this week's points (expected, at most), the units they cover, next week's need in tokens and points, the total against the 1.9 B cap, and  [...cut]

**Report B:**
1. Reserve: I set the weekend fixed reserve to 2.06, not 1.52. The 1.52 only holds at the central weights (Fable 1.48 per M fresh). At ROUTER.md section 2's high ends (Fable 1.67 per M fresh, cache reads 0.0091 per M, units at 57 M a point from path e2's 17.3 points), the coordinator can draw up to 1.32 points before the reset: the go 0.16, at most four held wakes (each at least 12.3 h apart) 0.97, returns and timer fires 0.20. Its limit only counts 0.49 of that. The units' limits add 0.22 in the room left at 91 %. So the reserve must be at least 2.053. With 1.52, a unit started at the line ends at 100.5. The cost in units is nil: the same four units run this week either way.
2. Commits in the run folder: 94aec81 run/config.json (2.06, with the note); 9af53d3 tools/gate.test.mjs; 3f01069 GO.md. The new test runs the real config through the gate for four starts at the line (the go, a Sunday wake, a Monday wake); at the high weights the meter at the reset is 99.93 to 99.98. 54 tests pass (53 before).
3. Reading: get_usage at 09:32 UTC gave all models 91 %, Fable 54 %. The clock read 09:31 UTC when I started, not 10:45; the card turned 91 between 09:15 and 09:32. Scratch test (go 11:30 UTC, 91/54; line 94.01): sheet START (91.86) and f2m START (93.34). f3m and f4m HOLD at 94.29, printed fit 14:57 UTC; the coordinator gates only f3m, since f4m has the same limit. f5 and f2a HOLD at 95.76, printed fit Sun 09:03 UTC, but they are not ready yet. In the expected course f3m starts at f2m's return about 12:45 UTC (17:45 his time), f4m at a wake about 16:20 UTC (21:20 his time), and the parts and fields wait for the reset; a wake Sun 22:32 UTC finds them still held.
4. This week: about 2.36 points (the sheet and the three maps, 113 M tokens; units 1.75 + coordinator 0.61), Fable 0 [...cut]

---

## P30

### A (earlier helper, ended 2026-11-17T21:56)
**Brief A:**
You extract records for a knowledge library. REPO = C:/Users/User/Documents/projects/harness-engineering. Use only Read and Write tools (Bash only to count lines if needed). Write only under REPO/library/.

Your file: REPO/docs/program/evidence/harness-method-status-2026-11-18/app-enforcement-mechanisms.md
Your prefix: x01

Job:
1. Read REPO/library/README.md, only the sections "A record" and "A new writer" (and the id ranges line under it). Nothing else in the library.
2. Read your one file (whole).
3. Write REPO/library/journal/2026-11-18/x01.jsonl: one JSON object per line, one record for each fact, status, published result or hypothesis the file states. Field order: id, kind, status, claim, when, quote, evidence, see, note, handles, footprint, supersedes, date, by; leave out empty fields. Always set "date":"2026-11-18" and "by":"x01".
 - id: x01-NNNN with four digits in the range for the kind (fact 0100-0199, status 0200-0299, result 0300-0399, hypothesis 0400-0499, open 0500-0599, mistake 0600-0699, pointer 0700-0799). Number consecutively within each range, no duplicates.
 - kind: fact (measured/observed here), status (how far a method was ever tested), result (a published result by others, with the author/source named in the claim), hypothesis (a design or guess not yet tested). Never use kind ruling or adjudication.
 - status: what the file itself says about how the thing is known: measured, observed, quoted, summary, textbook, reasoned, designed-only. Where the file does not say, use reasoned and add a "note" saying the file does not state it.
 - claim: ONE sentence, as short as it can be, carrying its number, unit and condition, and any caveat the file gives beside it. It must be understandable alone (name the method, paper, tool). Copy numbers exactly.
 - evi [...cut]

**Report A:**
53

### B (later helper, started 2026-11-17T22:06)
**Brief B:**
You extract records for a knowledge library. REPO = C:/Users/User/Documents/projects/harness-engineering. Use only Read and Write tools (Bash only to count lines if needed). Write only under REPO/library/.

Your file: REPO/docs/program/evidence/harness-method-status-2026-11-18/horthy-proved-general.md
Your prefix: x11

Job:
1. Read REPO/library/README.md, only the sections "A record" and "A new writer" (and the id ranges line under it). Nothing else in the library.
2. Read your one file (whole).
3. Write REPO/library/journal/2026-11-18/x11.jsonl: one JSON object per line, one record for each fact, status, published result or hypothesis the file states. Field order: id, kind, status, claim, when, quote, evidence, see, note, handles, footprint, supersedes, date, by; leave out empty fields. Always set "date":"2026-11-18" and "by":"x11".
 - id: x11-NNNN with four digits in the range for the kind (fact 0100-0199, status 0200-0299, result 0300-0399, hypothesis 0400-0499, open 0500-0599, mistake 0600-0699, pointer 0700-0799). Number consecutively within each range, no duplicates.
 - kind: fact (measured/observed here), status (how far a method was ever tested), result (a published result by others, with the author/source named in the claim), hypothesis (a design or guess not yet tested). Never use kind ruling or adjudication.
 - status: what the file itself says about how the thing is known: measured, observed, quoted, summary, textbook, reasoned, designed-only. Where the file does not say, use reasoned and add a "note" saying the file does not state it.
 - claim: ONE sentence, as short as it can be, carrying its number, unit and condition, and any caveat the file gives beside it. It must be understandable alone (name the method, paper, tool). Copy numbers exactly.
 - evidence [...cut]

**Report B:**
169

---

## P33

### A (earlier helper, ended 2026-11-19T21:49)
**Brief A:**
You are the builder of unit W2 in the build of task r57-0507. W2 is FX-W2: arm first; confirmed by an alarm that has not exited. Kind build-invariant, model Opus. MAIN = `C:/Users/User/Documents/projects/harness-engineering`.

Read these first:
- `MAIN/CLAUDE.md`: the repository's rules.
- `MAIN/research-tree/build/briefs/B1-2.md`: your brief. Its part "Builders" applies to you, and so do the W2 row and its "W2 places".
- `MAIN/research-tree/build/briefs/B0b.md`, the part "Builders (build-invariant, opus): common". B1-2 points into it.

Your worktree is `MAIN/.claude/worktrees/W2`, on branch `u/W2`, at `build` b6fabfa0. That tip has all of batch B1-1 plus OUT's end-to-end change; its end-to-end file passes 232/232.

Do not edit `.claude/hooks/*`, `tools/check-commit.mjs`, or anything under `docs/program/evidence/` or `recovered/`.

Tokens: expected 11.7 M, limit 29.2 M. The counter is:
`node C:/Users/User/Documents/projects/harness-engineering/research-tree/build/tools/tokens-self.mjs "W2 alarm slot build"`

At about 330 K context or at the limit:
1. Commit.
2. Write only `MAIN/research-tree/build/units/W2/checkpoint.md`.
3. Return `LIMIT <path>`.

Write `MAIN/research-tree/build/units/W2/result.md` last, and never at a LIMIT. Return in at most 8 lines.

**Report A:**
LIMIT C:/Users/User/Documents/projects/harness-engineering/research-tree/build/units/W2/checkpoint.md
- Branch u/W2, commit 1ac4ce94. It holds the FX-W2 code in watch.mjs (the ensure: steps 2-4 and 8, alarmRegisterSlot) and in status.mjs (--arm-nonces, turn.json hold 1, hold2Wait, hold2Lock, hold2ArmSlots, armAtStart removed). Both files pass `node --check`.
- Tests: none run yet. e2e: not run. result.md: not written.
- The checkpoint records every design decision, the departures still to file, and the remaining steps in order: fixtures, the hook form and T16, test updates and lane runs, 3 new tests, specs, CONTRACT and brief, departures, merging build, e2e, result.
- Tokens: calls 74, 14.67 M, context 327.9 K.

### B (later helper, started 2026-11-19T23:11)
**Brief B:**
You are the builder of unit W3 in the build of task r57-0507. FX-W3 says that acts which create work need a live, confirmed arm. Your kind is build-invariant and your model is Opus. MAIN = `C:/Users/User/Documents/projects/harness-engineering`.

Read first:
- `MAIN/CLAUDE.md`: the repository's rules.
- `MAIN/research-tree/build/briefs/B1-3.md`: your brief. Its part "Builders", the W3 row and its "W3 places" apply to you.
- `MAIN/research-tree/build/briefs/B1-2.md` (part "Builders") and `MAIN/research-tree/build/briefs/B0b.md` (part "Builders (build-invariant, opus): common"). B1-3 points into both.

Your worktree is `MAIN/.claude/worktrees/W3` on branch `u/W3`, at `build` 2a8480af. That tip has all of B1-1 and B1-2 (W2, PLAN). Suite 3 passed on it (1003 + 29 pass, 0 fail), and the end-to-end file passed 232/232. CLOSE is built in parallel in its own worktree.

Do not edit:
- `.claude/hooks/*`;
- `tools/check-commit.mjs`;
- anything under `docs/program/evidence/` or `recovered/`.

Tokens: expected 11.7 M, limit 29.2 M. Run the counter: `node C:/Users/User/Documents/projects/harness-engineering/research-tree/build/tools/tokens-self.mjs "W3 lock and arm build"`. At about 330 K context or at the limit:
1. commit;
2. write only `MAIN/research-tree/build/units/W3/checkpoint.md`;
3. return `LIMIT <path>`.

Write `MAIN/research-tree/build/units/W3/result.md` last, and never at a LIMIT. Return in at most 8 lines.

**Report B:**
LIMIT C:/Users/User/Documents/projects/harness-engineering/research-tree/build/units/W3/checkpoint.md
- Stopped near the 330 K checkpoint; the counter's last line is calls 86, 16.59 M tokens, context 301.2 K.
- Branch u/W3, clean tree. The last commit is faa87c45: 63e36ff6 holds all the FX-W3 code, faa87c45 the coordinator brief places 0b, 4, 6, 8 and 9.
- The code fills armedState/checkArmed and requireArmed in lib, armedFor in replace (start and fence first; the dry run checks too), stepArmed in the hook (start tool only), turn_seq_at_reg and the unarmed record in watch. Endturn takes K from turn.json (turn-stale, acked-ahead against read_seq), spends the arm, and reports the sources after a refusal too. The handover brief line now ends with the brief path.
- One lane run (W3-first: status, watch, replace, handover): 233 tests, 187 pass, 35 fail, 11 skipped. These four files have not been run again since. Every failure is an old fixture that does not arm the turn, an endturn with no turn.json, the new slot field or the longer brief line. The checkpoint lists each one and its adaptation.
- Not done: adapting those fixtures, the 5 new tests, guard-hook tests (G4 needs an armed turn), specs, CONTRACT, departures/W3.md, the merge of build, the e2e adaptation and run, result.md.
- The checkpoint names the next steps in order.

---

## P36

### A (earlier helper, ended 2026-11-20T00:57)
**Brief A:**
You are the builder of unit W4 (FX-W4: the dead-man check) in the build of task r57-0507. Kind build-invariant, model Opus. MAIN = `C:/Users/User/Documents/projects/harness-engineering`.

Read first:
- `MAIN/CLAUDE.md` (the repository's rules);
- `MAIN/research-tree/build/briefs/B1-4.md` (your brief: its part "W4" and the line on top about installing nothing);
- the parts it points into: `briefs/B1-2.md` part "Builders" and `briefs/B0b.md` part "Builders (build-invariant, opus): common".

Your worktree is `MAIN/.claude/worktrees/W4` on branch `u/W4`, at `build` 56918efb. That tip holds all of B1-1 to B1-3. Suite 4 passed on it (1028 + 29 pass, 0 fail), and so did the end-to-end file (239/239). S2.1 is built in parallel in its own worktree.

**Never register, install or schedule `deadman-task.xml` or any task on this PC.** It is a file that tests read as text.

Do not edit:
- `.claude/hooks/*`;
- `tools/check-commit.mjs`;
- anything under `docs/program/evidence/` or `recovered/`.

Tokens: expected 11.7 M, limit 29.2 M. Count them with `node C:/Users/User/Documents/projects/harness-engineering/research-tree/build/tools/tokens-self.mjs "W4 dead-man build"`.

At about 330 K context, or at the limit:
1. commit;
2. write only `MAIN/research-tree/build/units/W4/checkpoint.md`;
3. return `LIMIT <path>`.

Write `MAIN/research-tree/build/units/W4/result.md` last, and never at a LIMIT. Return in at most 8 lines.

**Report A:**
LIMIT C:/Users/User/Documents/projects/harness-engineering/research-tree/build/units/W4/checkpoint.md
- I stopped at the 330 K context mark (312.6 K when I wrote the checkpoint), so result.md is not written.
- Branch `u/W4`, commit 7ea139fe: code only, in `research-tree/tcb/status.mjs`. It adds `status --deadman --root R` (7 alert causes, re-alert every 6 runs, `run/deadman.json`) and the `deadman-nowake` anomaly in the status view. It passes `node --check`; no test has been run.
- Not done yet: the 4 tests, `tcb/settings/deadman-task.xml` (a file only; nothing is installed or registered), the specs, CONTRACT, coordinator brief 0c, `departures/W4.md`, the merge of `build`, and the e2e run. The checkpoint lists each, with the test plan and the 7 decisions to record as departures.
- One choice the successor and the reviewer must see: `deadman-nowake` flags what is observable, not the task's own wake-to-run setting. It flags a dead-man that never ran, a stale record, or a gap between its runs within one boot. Reading the setting would mean querying the Task Scheduler, which this build does not do.
- Tokens: 15.23 M at the checkpoint (expected 11.7 M, limit 29.2 M).

### B (later helper, started 2026-11-20T00:57)
**Brief B:**
You are the successor builder of unit W4 (FX-W4: the dead-man check) in the build of task r57-0507. Kind: build-invariant. Model: Opus. MAIN = `C:/Users/User/Documents/projects/harness-engineering`.

**Where W4 stands.** The first helper stopped at its 330 K checkpoint after 15.23 M tokens.
- `u/W4` is at commit 7ea139fe, in worktree `MAIN/.claude/worktrees/W4`.
- That commit holds only code in `tcb/status.mjs`: `status --deadman --root R`, 7 alert causes, a re-alert every 6 runs, `run/deadman.json`, and the `deadman-nowake` anomaly.
- No test has run yet.
- What is left, the test plan and the 7 decisions to record as departures are in `MAIN/research-tree/build/units/W4/checkpoint.md`. **Start from it, and do not redo the design reading.**

**Read first:**
- `MAIN/CLAUDE.md`;
- `MAIN/research-tree/build/briefs/B1-4.md`, part "W4", and its top line: nothing is installed, registered or scheduled on this PC;
- the parts it points into: `briefs/B1-2.md`, part "Builders", and `briefs/B0b.md`, part "Builders (build-invariant, opus): common".

Run your test files early, before your first checkpoint.

**S2.1's `todo` test.** S2.1 wrote a `todo` test for the dead-man in `tcb/test/status.test.mjs` on `u/S2.1`, guessing the field names `runs_no_alarm` and `alert`. If S2.1 has landed on `build` when you merge `build`, adapt that test to your real fields and drop the `todo`.

**Do not edit:** `.claude/hooks/*`, `tools/check-commit.mjs`, or anything under `docs/program/evidence/` or `recovered/`.

**Tokens.** Your limit is 13.9 M, the rest of the unit's 29.2 M. Count with `node C:/Users/User/Documents/projects/harness-engineering/research-tree/build/tools/tokens-self.mjs "W4 dead-man successor"`.

At about 330 K context or at the limit:
1. commit;
2. rewrite the checkpoint;
3. return [...cut]

**Report B:**
W4 is done: branch `u/W4`, final commit 439a50c6. `build` at cc6df491 (with S2.1) merged with no conflicts. S2.1's `todo` test is adapted to the built fields (exit 1 `deadman-alert` {alerts, causes}) and its `todo` dropped.
Built: `status --deadman --root R` (7 causes, re-alert every `realert_runs` runs, `run/deadman.json`), the status view's `deadman-nowake`, `tcb/settings/deadman-task.xml` (a file only, never registered), 4 tests, spec, CONTRACT 1.4/2.1/3.8/3.9/decision 41, coordinator brief 0c, spec/briefs.md.
Tests through MAIN's lane:
- status.test.mjs (`W4-status2`, after the merge): 49 tests, 47 pass, 0 fail, 2 skipped, 0 todo.
- guard-hook.test.mjs (`W4-guard`, detached checkout outside `.claude/`): 31 tests, 28 pass, 0 fail, 3 skipped.
- e2e (`W4-e2e`): 239/239 steps ok, 0 FAIL.
Departures: `MAIN/research-tree/build/departures/W4.md` (10 items). Result: `MAIN/research-tree/build/units/W4/result.md`. W2's single-death gap (N3) is now covered by the `no-alarm` cause.
Tokens: builder 1 15.23 M; successor `calls 82 | tokens 12.67 M` plus the last writes. Unit total about 27.9 M, under 29.2 M.
Not done: the task file was never imported (whether the toast reaches the owner and whether a console flashes are unknown); lib.test.mjs and selftest.test.mjs not run (lib.mjs changed only the deadman entry's strings); the hook still admits `status --deadman` for the coordinator, and brief 0c forbids it.

---

## P39

### A (earlier helper, ended 2026-11-05T12:34)
**Brief A:**
You are an adversarial code reviewer for slice S10 ("trial import, openings and source ownership") of a Django 5.2 clinic inventory app. Your job is to REFUTE the claims below by finding concrete code paths where they fail. Do not praise; report only findings, each with file:line, a concrete failure scenario (inputs/state → wrong outcome), severity P1 (wrong money/stock/visibility or a claim false), P2 (a guard missing but no current path), P3 (cosmetic/documentation), and a suggested fix. If a claim holds, say so in one line with the evidence you checked.

Repository root: C:\Bilal_Migration\User\Downloads\20_PROJECTS\24_Clinic_Workshop\.claude\worktrees\nervous-newton-322a49 (branch claude/s10-import). READ ONLY: do not edit files, do not run pytest, scripts/check.py, migrations or anything touching the database (another process is using it). You may read files and use grep. Reply with your full findings as text in your final message (do not write a report file; the harness refuses subagent file writes).

Code under review: src/clinic/imports/ (models.py, mapping.py, staging.py, openings.py, cutover.py, views.py, forms.py, urls.py, migrations/0001_initial.py, migrations/0002_import_guards.py, testing.py, tests/). Decision record: docs/application/s10-decision-record.md (D10-01..D10-22). Protocol: docs/application/import-protocol.md. Kernel and services it builds on (read as needed, do not review them): src/clinic/operations/kernel.py (run_command, Posting.open_document), operations/drafts.py, operations/reversal.py, inventory/ledger.py (post_lines, lock_scopes, lock_holdings), inventory/services.py (register_batch), reconciliation/counts.py, finance/ledger.py, finance/cash.py, finance/supplier_money.py (start_opening, post_opening, _refuse_overlap), people/ (accruals, [...cut]

**Report A:**
I found 5 P1 and 10 P2 findings, plus some P3s. The worst is a posting failure that permanently blocks a group's cutover. Line numbers refer to the current worktree; I only read files and ran nothing.

## P1

**1. An approved batch that cannot post is stuck for good, and it blocks the group's cutover.**
- Where: `staging.py:830-833`, `openings.py:759-768`, `cutover.py:128-131`, `0002_import_guards.py:46-50`, `urls.py` (no abandon route).
- Scenario: two supplier files for supplier A are both staged, validated and approved. A posts. B's post is refused by S06's overlap rule. B stays `status=draft`, `stage=approved`; `test_opening_money.py:172-174` asserts exactly this state.
- B cannot be withdrawn (only `submitted` can), cannot be abandoned (refused when `approved`), and the trigger refuses any change of stage away from `approved`.
- `declare_cutover` refuses while any batch of the group is a draft, so supplier cutover can never be declared.
- Other ways to reach the same state:
  - another batch posts the same item, cash account or employee first;
  - the cutoff's period closes after approval;
  - the item is deactivated (`counts.start` refuses);
  - a location is deactivated (raw `KeyError` at `openings.py:455/489`).
- For history batches, a repeated source row from another file reaches `SourceIdentity.objects.create`. The raw `IntegrityError` is not a `ClinicError` or `ValueError`, so the view returns HTTP 500 and the batch is stuck.
- Separately, there is no UI route for `abandon` at all, although the cutover error says "post or abandon it".
- Fix: let an approved, unposted batch be abandoned (by the preparer, or by a second person) with a recorded reason, and let the trigger allow `approved` to `abandoned`. Catch the identity `IntegrityError` and turn it into a cle [...cut]

### B (later helper, started 2026-11-05T13:34)
**Brief B:**
You are the root's adversarial reviewer for slice S10 ("Trial import, openings and source ownership") of the MD Health Clinic inventory application (Django 5.2, PostgreSQL 17). Your job is to REFUTE the slice's claims by reading code, not to summarize it. Reply with your full findings as text in your final message (do not write files).

Where: worktree `C:\Bilal_Migration\User\Downloads\20_PROJECTS\24_Clinic_Workshop\.claude\worktrees\nervous-newton-322a49`, branch `claude/s10-import`, head 3ad56d8, eight commits on top of `main` at beae158 (use `git -C <worktree> diff beae158 3ad56d8 -- <paths>` or read files). HARD RULE: do not run pytest, manage.py, scripts/check.py or anything that touches a database; the root's own check is running in that worktree on the same test database. You may run `uv run --locked python -c "..."` for pure imports that open no connection, and ruff/mypy read-only. Do not modify any file.

Scope for this reviewer (staging, idempotency, openings, postings, concurrency): the new app `src/clinic/imports/` (models, migrations 0001 to 0003, the mapping, staging, validation, approval, posting and opening commands, the cutover and source ledger, the reconciliation sheet, testing helpers, tests), and the records `docs/tasks/s10-import/task.md`, `docs/application/s10-decision-record.md` (D10-01 to D10-30), `docs/application/import-protocol.md`, `docs/tasks/s10-import/evidence/review-opus.md` (the slice's own review: 26 issues, five P1 fixed: an approved batch that can no longer post can be abandoned; a cash file naming a salary-paying account restricted from staging; a stock item whose unit or pack changed after validation cannot be approved or posted; a file with non-synthetic labels refused before storage; the race and fault tests added). Context: `sr [...cut]

**Report B:**
I found 13 problems with S10's claims, all by reading the code. Two are P1s that the slice's records don't mention: a cash opening can double-count money already put right by an S07 close and correction, and real data can get past the synthetic-only guard. One P1 is disclosed: there is no rule for postings dated on or before a cash or pay opening's cutoff. I ran no tests and nothing that touches a database.

## Findings

**F1 — P1 (not in the records): a cash opening can double-count money S07 has already reconciled.**
- Where: `staging.py:567-574`, `openings.py:691-695, 736-742`.
- The cash check refuses an opening only when the account has a standing line dated on or before the cutoff. Lines dated after the cutoff, and S07 cash closes (which post no journal), are not checked.
- Scenario:
  - The till is used from 3 Nov with no opening.
  - The 3 Nov close counts 1 000 more than expected, and an S07 correction raises cash by 1 000.
  - On 5 Nov an opening of 1 000 is imported with cutoff 2 Nov. No line is dated on or before 2 Nov, so it is accepted.
  - The books are now 1 000 over the physical till. The next close shows a phantom 1 000 shortage, and `open_shortfall` would treat it as a cashier shortfall.
- Without the correction, the reviewed 3 Nov close still shows a variance the books no longer have.
- Fix: make a cash opening the account's first record, as stock already is. Refuse it if the account has any standing journal line of any date, or any `CashClose`. Check this at validation and again under `lock_accounts` at posting.

**F2 — P1 (disclosed in D10-13 and D10-14, still exploitable): postings dated on or before an opening's cutoff are accepted afterwards.**
- Cash: after an opening at cutoff C, S07 accepts a receipt dated on or before C. It also accepts a ca [...cut]

---

## P42

### A (earlier helper, ended 2026-11-14T10:29)
**Brief A:**
You make this lane's KGE training run on the graphics card without changing anything else, prove it is correct, time it, and prepare (never run) a guarded stage-B launcher. LANE = C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings . Read first: LANE/train/RUNLOG.md (whole; it is ~130 lines), the rules docs/program/evidence/harness-bottlenecks/graph2/protocol-addendum-8.md sections E and K (repo root C:/Users/User/Documents/projects/EMS_workshop1), LANE/train/kge.py (684 lines: read by section, not whole), stageA.py, stageB.py, check.py, scoretest.py, timing.py, proj.py, drun.sh, launchB.sh, LANE/orchestrator/guard-stageA.sh and LANE/orchestrator/memgate.sh. Settled: stage A is COMPLETE (80 units, CPU; LANE/train/stageA/{results.tsv,top3.json}); its table is never re-made. Image `graphtest-kge-gpu:1` (torch 2.15.0+cu132, RTX 5070 sm_120 covered, 12 GB card) works with `--gpus all --network none`; never build, pull or remove an image. TASKS. (3) Device change only: one env var (e.g. KGE_DEVICE) defaulting to `cpu`, so a CPU run is byte-for-byte the same code path; same model code, configs, dims, batch sizes, negative counts, optimisers, float32; PyTorch precision defaults (no AMP, no TF32 — set torch.backends.cuda.matmul.allow_tf32=False and cudnn.allow_tf32=False explicitly, no torch.compile); ranking ties and every evaluation/negative-sampling RNG stay where they are (generators on CPU where they are now, move tensors not seeds). Record the diff in RUNLOG.md under a new section. (4) Correctness before timing is trusted: (a) check.py and scoretest.py pass with the device on cuda; (b) per arm E1..E5, one trained model's scores on CPU vs on the card agree to 1e-4 on 20 queries (train one small [...cut]

**Report A:**
The training now runs on the graphics card and passes the correctness checks. Under ruling 37 the card gives **s = 1**: 14.4 h projected with one process. The stage-B launcher is written but not run; the only stage-B run was a 3-task plumbing test. Stage A and its table were not touched (train/ was mounted read-only for every card run).

**(i) Device change**
- **Env var:** `KGE_DEVICE`, default `cpu`. Only the model, its batches and the final read-back move. Every random generator stays on the CPU. The representations come back to the CPU, so evaluation, ranking ties, `reps.pt` and `score()` run exactly as before.
- **`train/kge.py`** (684 → 707 lines):
  - `DEVICE` is set from the env var. On cuda only, TF32 is switched off explicitly for matmul and cudnn; the image's cudnn default was on.
  - `make_model` builds on the CPU (body moved to `_make_model`) and returns `m.to(DEVICE)`.
  - SLCWA moves `ids[j]`, `w[j]` and `Wsum` to the device. Negative tails are still drawn by the CPU generator, then `.to(pos.device)`. OneVsAllN3 moves each batch.
  - `final_reps` returns `.cpu()` tensors.
  - `cuda_peak()` adds card peaks to meta on cuda only, and `train()` resets the peak counter on cuda.
- **Other files:**
  - `check.py` (1 line) and `scoretest.py` (2 lines): output-path overrides.
  - `proj.py`: `--gpu`/`--lanes` flags; the CPU key is unchanged.
  - `stageB.py`: changes under (v).
  - New `stageB_test3.py`.
- **CPU path is unchanged:** original vs edited `kge.py`, both on the CPU, are bit-identical for E1, E2, E3 and E5. E4 differs at 1e-8, but the original code also differs from itself between runs at 6 threads. At 1 thread, original, edited and a repeat run are bit-identical, so the difference comes from CompGCN's multithreaded CPU scatter, not the edit.

**(ii) Corr [...cut]

### B (later helper, started 2026-11-14T10:30)
**Brief B:**
You implement the coordinator's pre-run fixes to this lane's stage-B code, and settle one card-vs-CPU question, before stage B is released. LANE = C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings . Read first: LANE/orchestrator/coordinator-rulings-48-62.md (95 lines; the binding text, also now section M of docs/program/evidence/harness-bottlenecks/graph2/protocol-addendum-8.md under repo root C:/Users/User/Documents/projects/EMS_workshop1), LANE/orchestrator/prerun-review.json (each finding has claim, path:lines, fix, sceptic verdict — use it as your map), LANE/train/RUNLOG.md (last two sections: "Stage B tooling" and "Stage B on the graphics card"), then the code by section, never a >300-line file whole: LANE/export/checkpoints.py, LANE/train/{stageB.py, kge.py, selectB.py, report.py, stageB_test*.py}. Settled: stage A is complete and frozen; s = 1 (ruling 48; card timing 14.4 h, one process; dry plan 53 checkpoints, 2,385 units, lag 0); device via KGE_DEVICE (cpu default, CPU path proven bit-identical); delete-after-score is in. TASK A — implement, each with a plumbing test on TUNING data only that FAILS on the current code and PASSES after (keep the failing output as evidence): rulings 49-52 (ancestry for s>1: C==P or [C git-ancestor of P AND C's ancestors.txt ⊆ P's]; parent order author time, committer time, sha; ruling-51 promotion of a checkpoint with no co_changed fact; ruling-52 lag) in export/checkpoints.py and the stageB.py plan with assertions for every assignment in both splits — test them at s = 10 too, since s = 1 leaves them idle; ruling 55 (E5: a specialist scores only its known entities; fold-in only for an entity absent from the whole checkpoint graph; unscored otherwise [...cut]

**Report B:**
Now the tests. First rulings 49-52.

---

## P45

### A (earlier helper, ended 2026-11-17T21:56)
**Brief A:**
You extract records for a knowledge library. REPO = C:/Users/User/Documents/projects/harness-engineering. Use only Read and Write tools (Bash only to count lines if needed). Write only under REPO/library/.

Your file: REPO/docs/program/evidence/harness-method-status-2026-11-18/app-enforcement-mechanisms.md
Your prefix: x01

Job:
1. Read REPO/library/README.md, only the sections "A record" and "A new writer" (and the id ranges line under it). Nothing else in the library.
2. Read your one file (whole).
3. Write REPO/library/journal/2026-11-18/x01.jsonl: one JSON object per line, one record for each fact, status, published result or hypothesis the file states. Field order: id, kind, status, claim, when, quote, evidence, see, note, handles, footprint, supersedes, date, by; leave out empty fields. Always set "date":"2026-11-18" and "by":"x01".
 - id: x01-NNNN with four digits in the range for the kind (fact 0100-0199, status 0200-0299, result 0300-0399, hypothesis 0400-0499, open 0500-0599, mistake 0600-0699, pointer 0700-0799). Number consecutively within each range, no duplicates.
 - kind: fact (measured/observed here), status (how far a method was ever tested), result (a published result by others, with the author/source named in the claim), hypothesis (a design or guess not yet tested). Never use kind ruling or adjudication.
 - status: what the file itself says about how the thing is known: measured, observed, quoted, summary, textbook, reasoned, designed-only. Where the file does not say, use reasoned and add a "note" saying the file does not state it.
 - claim: ONE sentence, as short as it can be, carrying its number, unit and condition, and any caveat the file gives beside it. It must be understandable alone (name the method, paper, tool). Copy numbers exactly.
 - evi [...cut]

**Report A:**
53

### B (later helper, started 2026-11-17T22:12)
**Brief B:**
You extract records for a knowledge library. REPO = C:/Users/User/Documents/projects/harness-engineering. Use only Read and Write tools (Bash only to count lines if needed). Write only under REPO/library/.

Your file: REPO/docs/program/evidence/harness-method-status-2026-11-18/write-collision-points.md
Your prefix: x17

Job:
1. Read REPO/library/README.md, only the sections "A record" and "A new writer" (and the id ranges line under it). Nothing else in the library.
2. Read your one file (whole).
3. Write REPO/library/journal/2026-11-18/x17.jsonl: one JSON object per line, one record for each fact, status, published result or hypothesis the file states. Field order: id, kind, status, claim, when, quote, evidence, see, note, handles, footprint, supersedes, date, by; leave out empty fields. Always set "date":"2026-11-18" and "by":"x17".
 - id: x17-NNNN with four digits in the range for the kind (fact 0100-0199, status 0200-0299, result 0300-0399, hypothesis 0400-0499, open 0500-0599, mistake 0600-0699, pointer 0700-0799). Number consecutively within each range, no duplicates.
 - kind: fact (measured/observed here), status (how far a method was ever tested), result (a published result by others, with the author/source named in the claim), hypothesis (a design or guess not yet tested). Never use kind ruling or adjudication.
 - status: what the file itself says about how the thing is known: measured, observed, quoted, summary, textbook, reasoned, designed-only. Where the file does not say, use reasoned and add a "note" saying the file does not state it.
 - claim: ONE sentence, as short as it can be, carrying its number, unit and condition, and any caveat the file gives beside it. It must be understandable alone (name the method, paper, tool). Copy numbers exactly.
 - evidenc [...cut]

**Report B:**
113

---

## P48

### A (earlier helper, ended 2026-11-18T00:44)
**Brief A:**
Read and follow exactly the brief in C:\Users\User\Documents\projects\harness-engineering\docs\program\evidence\bottleneck-2026-11-18\b1-brief-analyse.md (Git Bash path /c/Users/User/Documents/projects/harness-engineering/...). Your final reply is two lines only.

**Report A:**
C:\Users\User\Documents\projects\harness-engineering\docs\program\evidence\bottleneck-2026-11-18\BUILD-IN.md ; C:\Users\User\Documents\projects\harness-engineering\docs\program\evidence\bottleneck-2026-11-18\b1-claims.md
C claims: 174; D choices: 21

### B (later helper, started 2026-11-18T19:07)
**Brief B:**
Read and follow exactly the brief in C:\Users\User\Documents\projects\harness-engineering\docs\program\evidence\round3-2026-11-18\c1-brief-collect.md. Your sub-topic is 3, `mergeq`. Your output file is docs/program/evidence/round3-2026-11-18/c1-collect-mergeq.md. The working directory is the repository root C:\Users\User\Documents\projects\harness-engineering.

**Report B:**
Output file: `docs/program/evidence/round3-2026-11-18/c1-collect-mergeq.md` (138 lines).

Papers read in full or in the parts that matter: 8, five of them by their text and three by selected ranges. Two are web documentation pages with no numbers (Zuul, GitHub). Could not open: 3.

The three results most useful for our check:
1. **Najafi, Rigby, Shang 2019 (Ericsson), mark quoted, txt l.549-555 and l.614-621.** The best batch size falls as the share of failing changes rises. At 2.8% culprit commits the best batch is 9 and saves 72% of test runs. At 6.8% to 8.6% it is 2 to 4 and saves 46% at most. Flaky failures cut the 72% to 41%, and to 7% for the flakiest project.
2. **Fallahzadeh, Bavand, Rigby 2023 (FSE), mark quoted, txt l.36-47 and l.840-848.** Testing every change that is waiting as one batch keeps the same average feedback time with up to 91% fewer machines (Chrome, 8.5% failing builds). A constant batch of 4 used 14.29% more machines than the baseline at Ericsson. The paper also shows the knee in waiting time against machine count (l.649-651). It assumes independent changes with no merge conflicts (l.1100-1101).
3. **Uber SubmitQueue 2019, mark quoted, txt l.1146-1167.**
   - Testing ahead on top of the changes in front, with the likely outcome guessed, reaches up to 2.98x an oracle's turnaround, and 1.2x with 500 workers.
   - Testing every combination goes up to 15x.
   - One change at a time goes to 80x.
   - These are replays of one iOS monorepo against an oracle, not against a real baseline.
   - A 2025 Uber follow-up halves CI resources at the same landing rate (53%, l.28-30).

- **Library records:** the x06 Uber records match the paper text. I upgraded the Zuul window rule (starts at 20, +1 per merge, halved on failure) and the GitHub queue limits from s [...cut]

---

## P51

### A (earlier helper, ended 2026-11-17T20:06)
**Brief A:**
A research question about Claude Code (the CLI and the desktop app) for an engineering decision. Answer from the documentation, cite the page for every claim, and say plainly when something is undocumented or uncertain. Do not guess.

We need the complete list of mechanisms by which a rule can be ENFORCED on a session and on the subagents it starts, as opposed to written instructions that the model may ignore. We are open to hooks, to scripts, and to a mix. We also want to know every way a script can act in the middle of a session.

Part 1. For each mechanism give: when it runs, what it can see (the exact input fields), what it can do (block, change, add context, stop the session), how it is configured (which settings file, which scope: user, project, local, managed), and its known limits.
Cover at least:
a. Hooks, every event: PreToolUse, PostToolUse, UserPromptSubmit, Stop, SubagentStop, SessionStart, SessionEnd, PreCompact, Notification, and any newer events. In particular:
   - For PreToolUse on the tool that starts a subagent (Agent, formerly Task): can the hook see the subagent type, a model override, the effort, the prompt? Can it deny the call or rewrite its input?
   - Does hook input carry session_id and transcript_path? Can a hook read the transcript to work out how full the context is? Is the context size or token usage given to a hook directly?
   - Exit-code and JSON-decision semantics for each event: what blocks, what only warns.
   - Do a session's hooks also run for tool calls made inside its subagents? Is there a way to tell a subagent's call from the main session's?
   - What happens when a hook times out, crashes or is slow; the default timeout; whether hooks run in parallel.
   - Can a Stop hook force the session to continue, and can a hook force a  [...cut]

**Report A:**
The core pages are read. Next I need the exact permission-rule details, the PreToolUse input for the Agent tool, the compaction and status-line settings, and the managed-only keys.

### B (later helper, started 2026-11-17T20:07)
**Brief B:**
A research question about Claude Code (the CLI and the desktop app) for an engineering decision. Answer from the documentation, cite the page for every claim, and say plainly when something is undocumented or uncertain. Do not guess.

We need the complete list of mechanisms by which a rule can be ENFORCED on a session and on the subagents it starts, as opposed to written instructions that the model may ignore. We are open to hooks, to scripts, and to a mix. We also want to know every way a script can act in the middle of a session.

Part 1. For each mechanism give: when it runs, what it can see (the exact input fields), what it can do (block, change, add context, stop the session), how it is configured (which settings file, which scope: user, project, local, managed), and its known limits.
Cover at least:
a. Hooks, every event: PreToolUse, PostToolUse, UserPromptSubmit, Stop, SubagentStop, SessionStart, SessionEnd, PreCompact, Notification, and any newer events. In particular:
   - For PreToolUse on the tool that starts a subagent (Agent, formerly Task): can the hook see the subagent type, a model override, the effort, the prompt? Can it deny the call or rewrite its input?
   - Does hook input carry session_id and transcript_path? Can a hook read the transcript to work out how full the context is? Is the context size or token usage given to a hook directly?
   - Exit-code and JSON-decision semantics for each event: what blocks, what only warns.
   - Do a session's hooks also run for tool calls made inside its subagents? Is there a way to tell a subagent's call from the main session's?
   - What happens when a hook times out, crashes or is slow; the default timeout; whether hooks run in parallel.
   - Can a Stop hook force the session to continue, and can a hook force a  [...cut]

**Report B:**
## Short answer

Hooks and permission rules are the only mechanisms that enforce a rule at the moment of the action. Everything else either configures the session (and can be overridden) or runs after the fact. The docs give no hook field for context size, and no documented way to force a compaction, end a session from a hook, or count tokens per session.

Sources are cited by short code, listed at the end. The desktop app reads the same settings files as the CLI [ST]. Items marked *not verified* were not in the pages I could read.

## Part 1. Mechanisms

**Hooks** (configured under `hooks` in `~/.claude/settings.json`, `.claude/settings.json`, `.claude/settings.local.json`, managed settings, plugins, or skill/subagent frontmatter [H])

| Event | When | Input it receives | Can do | Limits |
|---|---|---|---|---|
| PreToolUse | Before each tool call, including calls made inside subagents | `tool_name`, `tool_input`, `tool_use_id`; `agent_id` and `agent_type` for subagent calls [H] | Exit 2 or `permissionDecision` `deny` blocks; `allow`, `ask`, `defer`; `updatedInput` replaces the whole input object [H] | A timeout does not block unless `onFailure: "block"` [H]; `if` filter is best-effort [H]; `allow` cannot override a deny rule [H] |
| PostToolUse / PostToolUseFailure | After the call | Same, plus `tool_response` | `additionalContext`, `decision: "block"` as feedback | Cannot undo the action |
| PostToolBatch | After a parallel batch, before the next model call | `tool_calls[]` (name, input, id, response) | `additionalContext`; `decision: "block"` or `continue: false` stops the loop [H] | No matcher |
| UserPromptSubmit | Before a prompt is processed | Prompt | Exit 2 or block; add context | Hook can only see the prompt, not the model's state |
| Stop / SubagentStop | Tu [...cut]

---

## P54

### A (earlier helper, ended 2026-11-03T17:03)
**Brief A:**
You are an adversarial reviewer. Your job is to REFUTE the invariant claims of slice S02 ("atomic posting, journal and idempotency foundations") of a Django 5.2 / PostgreSQL 17 clinic application. Find concrete ways each claim can be broken. Do not edit, create or delete any file in the repository, and do not commit. Reply with your full findings as text in your final message (the harness may refuse file writes from subagents).

Repository root (a git worktree; work only here): C:\Bilal_Migration\User\Downloads\20_PROJECTS\24_Clinic_Workshop\.claude\worktrees\ecstatic-snyder-3d2e0d
Branch claude/s02-posting; S02 is the 7 commits after aae924f (`git log --oneline aae924f..HEAD`, `git diff aae924f..HEAD --stat`).

Code to read:
- src/clinic/operations/kernel.py (run_command, Posting.open_document, payload_hash, advisory key lock, replay, retry), faults.py, drafts.py, periods.py, reversal.py, jobs.py, history_views.py (UI-60/61/62 screens), models.py, dbguards.py, migrations 0002-0004
- src/clinic/inventory/ledger.py, models.py (StockScope/Balance/Movement/Layer/LayerAllocation), migrations 0004-0005
- src/clinic/finance/ledger.py, models.py, migrations 0001-0002
- src/clinic/catalogue/migrations/0002_frozen_unit_triggers.py
- Tests: src/clinic/operations/tests/ (test_kernel, test_guards, test_periods, test_reversal, test_jobs_and_drafts, test_history_screens, test_races), src/clinic/inventory/tests/test_stock_ledger.py, src/clinic/finance/tests/test_journal.py; harness src/clinic/operations/testing.py
- Plan context if needed: docs/technical-plan/implementation-plan.md (S02 section), docs/technical-plan/data-model.md ("Stock posting algorithm and concurrency"), docs/technical-plan/contracts-and-permissions.md.

Roles: the migrator owns the schema; the runtime role (used b [...cut]

**Report A:**
I found three ways the runtime role can break the S02 invariants (P1), two lock-order deadlocks, and two screen leaks. All but three findings were reproduced against the real PostgreSQL test database, using the runtime role. The probe tests live only in the scratchpad, outside the repo: `C:\Users\User\AppData\Local\Temp\claude\C--Bilal-Migration-User-Downloads-20-PROJECTS-24-Clinic-Workshop--claude-worktrees-ecstatic-snyder-3d2e0d\16a65b98-4814-437b-bcbf-d300bfafc87f\scratchpad\s02probe\test_probe_db.py` and `...\s02probe\test_probe_races.py` (same folder). I edited nothing in the repo. `git status` shows `docs/application/s02-decision-record.md` and `docs/tasks/s02-posting/` as untracked; I did not create them.

## Findings

**R1 — P1 — `src/clinic/operations/dbguards.py:225` (`SEARCH_PATH = "SET search_path = pg_catalog, public"`), together with `docker/postgres/init/10-clinic-roles.sh:20` (`GRANT ... TEMPORARY ... TO runtime`)**
- **Claims broken:** 4 (balanced journal, one currency), 6 (period), 5, and the deferred stock checks in 3.
- **Cause:** every guard function runs as the caller and reads other tables by unqualified name. PostgreSQL searches the session's temporary schema first for table names unless `pg_temp` is listed explicitly. The runtime role holds TEMPORARY, so a temporary table with the same name replaces the real table inside the guard.
- **Scenario:** `CREATE TEMP TABLE clinic_operations_periodcontrol(singleton bool, closed_through date)` with one row `(true, NULL)`, then a normal `post_reference(..., posting_date=2026-10-15)`. That date is inside the period closed through 2026-10-31. Both the Python `require_open` (`periods.py:43`, also unqualified) and the insert trigger read the temporary table, and `SYS-000001` posts into the closed period.
- ** [...cut]

### B (later helper, started 2026-11-06T07:14)
**Brief B:**
You are a read-only refutation reviewer. Reply with TEXT ONLY. Do NOT write, edit or create any file. Do NOT run tests, pytest, uv, docker, psql or any database command. You may use git (log/diff/show), grep, and file reads only.

Repository (git worktree): C:\Bilal_Migration\User\Downloads\20_PROJECTS\24_Clinic_Workshop\.claude\worktrees\upbeat-almeida-d75bf6
Django 5.2 / PostgreSQL 17 clinic application under src/clinic. Review the three commits `git diff 0d991d9..d572ee2` (7884b3b item 3, 43e6f8c item 4, d572ee2 item 5). Try hard to REFUTE each change: find correctness bugs, wrong claims in comments/docstrings/commit messages, missed callers, broken reversibility, lock-order regressions, flaky tests.

What each commit claims:
- Item 3 (src/clinic/operations/migrations/0006_lines_within_their_command.py and tests): a BEFORE INSERT trigger on nine ledger tables (stock movement, stock layer, layer allocation, journal, journal line, obligation, settlement, money allocation, document dependency) refuses an insert once an OperationRecord exists whose key equals the owning document's operation_key. Claimed: defence in depth only (runtime role can still insert a whole new document and rows with no record); triggers named *_within_command fire after existing guards (BEFORE triggers fire in name order); migration linear over operations 0005 and reversible; legitimate kernel flow is unaffected because run_command writes the OperationRecord after the command body. Check: is the record really written after every row insert in every path (reversal, retries, nested commands, imports/openings, people/pay, finance cash, any place that inserts ledger rows after the record, e.g. post-commit hooks, later commands appending to an earlier document such as allocations/settlements against a [...cut]

**Report B:**
No P1 or P2 in any of the three commits. I found four P3s: one wrong claim, two gaps in the defence-in-depth, and one test that depends on timing.

**Item 3 (operations 0006, the `_within_command` trigger): the P1 you suspected does not happen.** I checked every writer of the nine tables in `finance/ledger.py`, `inventory/ledger.py` and `Posting.depends_on`. Each insert goes under a document the running command just opened:
- **Allocations:** they use the new allocation document, never the old obligation's or settlement's document.
- **Reversal rows:** the mirrored journals and lines, the negative allocations and the opposite movements are all written under the new reversal document.
- **Layers and layer allocations:** they hang off movements created in the same command.
- **Dependencies:** all 19 `depends_on` callers pass the new document as `dependent`, including `imports/openings.py:987`, `issuing/references.py:282/286`, `supplier_returns.py:286` and `cash.py:951`. So reading `dependent_id` resolves the right document.
- **Ordering:** in `run_command` the `OperationRecord` is written after the body (kernel.py:545). Only `force_deferred_checks` follows it, and it inserts nothing. A retry rolls the record back, and a replay returns before the body runs.
- **Nested commands:** a nested command closes only documents under its own key; `test_a_command_writes_under_its_own_document_after_a_nested_command_committed` covers this.
- **Other paths:** nothing writes these tables from post-commit hooks or other triggers. `operation_key` is NOT NULL. The reverse migration drops the triggers before the function, and the chain is linear over operations 0005.

**P3-1. The "fires after existing guards" claim is wrong for journal lines** (`0006_lines_within_their_command.py:19-21`)
-  [...cut]

---

## P57

### A (earlier helper, ended 2026-11-19T19:32)
**Brief A:**
You are unit W1 (FX-W1) of the research tree's build (kind build-invariant, model opus), started by the build root.
Read `C:/Users/User/Documents/projects/harness-engineering/research-tree/build/briefs/B1-1.md` (the builders' part and your row) and the part of `briefs/B0b.md` it says holds for you. Build FX-W1 in your worktree `C:/Users/User/Documents/projects/harness-engineering/.claude/worktrees/W1` (branch `u/W1`, cut from `build` ec3b04fd), filling the skeleton's steps for your fix, with its tests run through the main checkout's lane; commit on your branch; write `research-tree/build/units/W1/result.md` in the main checkout last, never at a LIMIT. Return in at most 8 lines.

**Report A:**
LIMIT C:/Users/User/Documents/projects/harness-engineering/research-tree/build/units/W1/checkpoint.md
- FX-W1 is only partly built. I hit the 330 K context checkpoint (325.3 K) after the design pass, so I stopped and wrote no result.md.
- Branch u/W1, commit b1e11391 (parent ec3b04fd). It contains lib `liveness` (tri-state, with exit markers) and a new `exitMarkers`, plus the S0.5 stubs line in lib.test.mjs:3090 without `liveness`. I checked it once by hand; no test file has been run through the lane.
- Not built yet: the watch exit marker, the status changes (endturn tri-state, state-corrupt, armAtStart D1, marker prune), the guard-hook allow-list, the `.gitignore` line, the U3-F8 lines, CONTRACT and spec text, and the tests.
- The checkpoint holds the settled design: file and line places, the full allow-list table, the tests and the 7 departures, so a successor needs no design re-read. No departures file is written yet.
- Tokens: build-invariant: W1 liveness and allow-list | calls 73 | tokens 15.05 M | context now 325.3 K.
- U3-F8 needs lines in profiles/settings `coordinator.json`, which CGATE also edits; check its diff before committing. The protocol R55 change is left out.

### B (later helper, started 2026-11-19T19:32)
**Brief B:**
You are the successor of unit W1 (FX-W1) of the research tree's build (kind build-invariant, model opus), started by the build root. The first helper stopped at its context checkpoint (325 K) after 15.05 M tokens, with commit b1e11391 on `u/W1` (lib `liveness` tri-state and `exitMarkers`; no test run yet).
1. Read `C:/Users/User/Documents/projects/harness-engineering/research-tree/build/units/W1/checkpoint.md` first: it holds the settled design (places, the allow-list table, the tests, 7 departures). Continue from it; do not re-read the design documents unless a test fails or the checkpoint names a place.
2. Read only the builders' part of `research-tree/build/briefs/B1-1.md` and the part of `briefs/B0b.md` it points to (lane, guard-hook.test.mjs outside `.claude/`, tokens, commits, departures, result).
3. Worktree `C:/Users/User/Documents/projects/harness-engineering/.claude/worktrees/W1`, branch `u/W1`. U3-F8's lines in `coordinator.json` are also edited by CGATE: keep your change to your own lines.
4. Token limit 14.15 M (the rest of the unit's 29.2 M); the 330 K checkpoint applies (at it: commit, rewrite checkpoint.md, return LIMIT). Write `research-tree/build/units/W1/result.md` in the main checkout last, covering the whole unit, never at a LIMIT. Return in at most 8 lines.

**Report B:**
LIMIT C:/Users/User/Documents/projects/harness-engineering/research-tree/build/units/W1/checkpoint.md
- Branch u/W1, final commit a78deee2 (b1e11391 lib, 7172d34f watch+status+tests, a78deee2 guard-hook allow list + U3-F8 (a)); worktree clean, hx-W1 removed.
- Tests: W1-lib 193 pass / 0 fail / 2 skip; W1-status 34/0/2; W1-guard-hook (from hx-W1) 18/0/3; W1-watch only the FX-W1+T20 subset (4/0); the whole watch.test.mjs is not run yet.
- Built: exit markers on every alarm exit after registration; tri-state wake sources in status (records read before the process list, the verdict counts only with unchanged bytes, corrupt is state-corrupt, endturn 1/2/0, armAtStart D1, marker prune); coordinator allow list (EXEC_FORMS, seams refused); coordinator agent_types [checker].
- Left: full watch test; .gitignore run/arm/ (handover + test + spec + CONTRACT §2); CONTRACT §1.2, §3.9, decision 41; specs lib/watch/status/guard-hook; departures/W1.md (8 listed in the checkpoint); result.md.
- Tokens: helper 2 at 13.49 M (+~0.5 M for the checkpoint) after helper 1's 15.05 M, so the unit's 29.2 M is used up. You decide whether a third helper finishes the list.
