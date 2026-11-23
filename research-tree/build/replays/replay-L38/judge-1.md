## P01

### A (earlier helper, ended 2026-11-19T20:05)
**Brief A:**
You are a helper of unit W7 (FX-W7) of the research tree's build (kind build-invariant, model opus), started by the build root. W7 passed its refuter, but its landing stopped on a textual conflict and was aborted (`build` unchanged): `research-tree/spec/lib.md` conflicts with text that W6 landed (`MAIN/research-tree/build/landings.jsonl`, last line).
MAIN = `C:/Users/User/Documents/projects/harness-engineering`. The part "Builders (build-invariant, opus): common" of `MAIN/research-tree/build/briefs/B0b.md` holds for you (lane by absolute path with T and W, commits, done file last and never at a LIMIT). Worktree `MAIN/.claude/worktrees/W7`, branch `u/W7` at bb0295bb.
1. Merge `build` (now 35647885: W6 and REDO landed) into `u/W7`: `git -c core.longpaths=true merge build`. Resolve `spec/lib.md` as the union of both units' text (each unit's sections kept whole, nothing reworded); if another file conflicts, resolve it the same way and name it. Change no code beyond a conflict's union.
2. Run `tcb/test/lib.test.mjs` and `tcb/test/watch.test.mjs` through MAIN's lane on the merged branch (label `W7merge-lib-watch`; T 140, W 5; use `--test-reporter=tap` and read `# pass` / `# fail`).
3. Commit the merge (`W7: merge build after a landing conflict`, ending with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`), then write `MAIN/research-tree/build/units/W7/merge.md` last: the merge commit, the files resolved and how, the test counts with the lane label, your tokens.
Tokens: expected about 2 M, limit 4 M, from the unit's own rest. Counter: `node MAIN/research-tree/build/tools/tokens-self.mjs "W7 merge of build"` (a WARNING line means it is not reading your transcript: say so). At the limit: commit, write `units/W7/checkpoint.md`, return `LIMIT <path>`, never merg [...cut]

**Report A:**
Done. I merged `build` (35647885) into `u/W7`. The merge commit is `31658ae76efc3f9f551d6a343e524f537ea821c7`, with parents bb0295bb and 35647885.
- Only `research-tree/spec/lib.md` conflicted. W7 and W6 each rewrote one of two adjacent bullets in the round-3 skeleton. I kept W7's `acquireLock` bullet and W6's `parseTranscript` bullet whole, each replacing the base text of its own bullet. Nothing was reworded and no code changed. A check against the base shows each side's change came through exactly. Every other file merged cleanly.
- Tests ran through the lane as `W7merge-lib-watch` (T 140, W 5, TAP) on `lib.test.mjs` and `watch.test.mjs`: 268 tests, 262 pass, 0 fail, 6 skipped. Exit 0, 69.1 s.
- Tokens: 1.03 M over 15 calls when merge.md was written (counter output had no WARNING line). Limit was 4 M.
- The record is at `C:/Users/User/Documents/projects/harness-engineering/research-tree/build/units/W7/merge.md`. The landing of `u/W7` and the full test suite are left to the root.

### B (later helper, started 2026-11-19T20:11)
**Brief B:**
You are a helper of unit CLAIM (FX-CLAIM) of the research tree's build (kind build-invariant, model opus), started by the build root. CLAIM passed its refuter, but its landing stopped on textual conflicts and was aborted (`build` unchanged at 52ae0f99): `research-tree/spec/replace.mjs.md`, `spec/status.mjs.md` and `spec/stop.mjs.md` conflict with text that other units landed (W6, REDO, W5, W7; `MAIN/research-tree/build/landings.jsonl`, last line).
MAIN = `C:/Users/User/Documents/projects/harness-engineering`. The part "Builders (build-invariant, opus): common" of `MAIN/research-tree/build/briefs/B0b.md` holds for you (lane by absolute path with T and W, commits, done file last and never at a LIMIT). Worktree `MAIN/.claude/worktrees/CLAIM`, branch `u/CLAIM` at 14dc9a06.
1. Merge `build` (52ae0f99) into `u/CLAIM`: `git -c core.longpaths=true merge build`. Resolve each spec conflict as the union of both units' text (each unit's lines kept whole, nothing reworded); if a code or test file conflicts, resolve it as the union too and name it. Change no code beyond a conflict's union.
2. The end-to-end test fails on CLAIM's commit because bind now needs a claim (`MAIN/research-tree/build/refute/CLAIM.md`, its e2e part: `d-stpa: replace bind e1` exits 6 not-claimed; with two lines that simulate the hook's claim before each bind it passes 232/232). Add those two lines in the e2e test and run it on the merged branch through MAIN's lane (label `CLAIMmerge-e2e`). If it fails there for a reason outside CLAIM's claim, do not fix it: report the first failure.
3. Do not run CLAIM's eight unit test files yourself: the landing runs them on the merge. Commit (`CLAIM: merge build; e2e claims before bind`, ending with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`); add an [...cut]

**Report B:**
Done. `u/CLAIM` is now at merge commit cbe4367f (parents 14dc9a06 and build 52ae0f99), committed as "CLAIM: merge build; e2e claims before bind".
Conflicts: only `spec/replace.mjs.md`, `spec/status.mjs.md` and `spec/stop.mjs.md`. Both units had added a section at the end of each. Each file now holds CLAIM's FX-CLAIM section, then REDO's FX-REDO section, both unchanged, with a blank line between. No code or test file conflicted, and none was edited.
e2e: I added the two claim lines in `run-e2e.mjs` (one in `bind()`, one before f1-research's bind). Run on cbe4367f from a checkout outside `.claude/`, label `CLAIMmerge-e2e-hx`: 232/232, exit 0, 88 s. My first run, label `CLAIMmerge-e2e`, used the same tree inside the worktree under `.claude/` and is not a result: it timed out (124), and before that selftest's `audit/good-clean-attempt` exited 3 instead of 0. Like guard-hook.test.mjs, the e2e should be run outside `.claude/`.
Not run: `tcb/test/redo.test.mjs` is not in CLAIM's 8 landing files, but CLAIM and REDO both changed the code it tests (it merged without conflict). Adding it to the landing's files would check the two together.
Records: departure 13 is in `MAIN/research-tree/build/departures/CLAIM.md`. `MAIN/research-tree/build/units/CLAIM/merge.md` is written last, with the step log next to it in `merge-e2e.log`.
Tokens: 3.40 M at 36 calls, above the expected 2.5 M and under the 4 M limit. One WARNING appeared after the 140-s lane call; the counter's figures matched my calls and later readings showed no warning.

---

## P04

### A (earlier helper, ended 2026-11-19T17:28)
**Brief A:**
You are unit S0.6 of the research tree's build (kind build-invariant, model opus), started by the build root.
Read `C:/Users/User/Documents/projects/harness-engineering/research-tree/build/briefs/B0b.md`: the part "Builders (build-invariant, opus): common" and the part "S0.6 (the landing script)". Do exactly that, in your worktree `C:/Users/User/Documents/projects/harness-engineering/.claude/worktrees/S0.6` (branch `u/S0.6`, already cut from `build`): build `research-tree/tools/land.mjs` and its test, run only your unit's test files through the main checkout's lane, commit on your branch, and write `research-tree/build/units/S0.6/result.md` in the main checkout last (never at a LIMIT). The build worktree `.claude/worktrees/build` (branch `build`) already exists; do not merge anything into `build` yourself. Return in at most 8 lines.

**Report A:**
S0.6 is done. The landing script and its test are committed on `u/S0.6` as 245641e0: `research-tree/tools/land.mjs` and `research-tree/tools/land.test.mjs`.
- **Final test run:** `tools/land.test.mjs` through MAIN's lane (label `S0.6-land`) gave 7 pass, 0 fail, 0 not-run in 41 s. All tests run in scratch repositories, including the required one: a failing test file undoes the merge. Run 1 had 6 false failures: the outer `node --test` set `NODE_TEST_CONTEXT`, so the nested runs ran nothing and exited 0. land.mjs now clears it, and exit 0 without a test summary counts as no result.
- **Your `hb` change:** the default build worktree is the folder `hb` beside MAIN, made with `git worktree add` if missing. `--build-wt` overrides it. A path inside any `.claude` folder is refused.
- **Exit codes:** 0 landed; 1 tests failed, merge undone; 2 conflict, merge aborted; 3 a merge with no line names no files; 4 its re-check failed; 5 no result (124, or 75 after retries), merge undone; 6 nothing to merge; 64 setup error.
- **Main departures:** selftest runs as its shards plus one run of the tests no shard names; any failed file or shard runs once more by itself (a pass then is marked flaky); exit 75 is retried for up to 300 s of waiting. All 13 are in `research-tree/build/departures/S0.6.md`.
- **For your hand landing of S0.6:** your `landings.jsonl` line must carry the merge's hash under `merge`. Without it, land.mjs's first run stops with exit 3 until `node land.mjs S0.6 tools/land.test.mjs` checks that merge. Use T 62 s, W 83 s for the test file. For S0.4 the script will pick T 106 s, W 39 s.
- **Not tested:** the real `shards.cmds` (the test uses a scratch one), the 30 s floor on T, a failing re-check below the tip, and breaking a stale lock. Tokens: 4.96 M, 31 calls, context 270  [...cut]

### B (later helper, started 2026-11-19T17:29)
**Brief B:**
You are the refuter of unit S0.6 (the landing script) of the research tree's build (kind refute, model opus), started by the build root. You have not seen the builder's reasoning.
Read `C:/Users/User/Documents/projects/harness-engineering/research-tree/build/briefs/B0b.md`: the part "S0.6 (the landing script)", the builders' common part (for the lane and tokens) and the part "Refuters". Do exactly that for S0.6: branch `u/S0.6` (worktree `.claude/worktrees/S0.6`), result `research-tree/build/units/S0.6/result.md`, departures `research-tree/build/departures/S0.6.md`. The real build worktree is `C:/Users/User/Documents/projects/hb` (branch `build`): never run land.mjs against it or change `build`; mutate and test only in scratch worktrees and the scratch repositories the tests make. Write `research-tree/build/refute/S0.6.md` last (first line `PASS` or `BREAKING: ...`), never at a LIMIT. Return in at most 8 lines.

**Report B:**
PASS. Verdict: `C:/Users/User/Documents/projects/harness-engineering/research-tree/build/refute/S0.6.md`.
- Mutation test: 38 one-statement mutants of land.mjs plus a control, run through MAIN's lane in 5 calls (`rS0.6-mutA` to `-mutE`), all in scratch repos. 23 caught; the control passed 7 of 7.
- 15 survive, all test gaps over correct code: M20 (skip only after a pass), M06/M07 (re-check with no result), M23 (undo before the line), M29 (stale lock), M15/M16 (T + W at most 145), plus M03, M10, M17, M27, M31, M33, M35, M36.
- Six extra scenario tests on paths land.test.mjs doesn't reach all pass, including a lander killed mid-run: the next landing broke the lock, re-checked the merge and recorded it.
- Small items, not breaking: a killed lander exits 1, the same code as "tests failed, merge undone", while its merge stays unchecked. After exit 4 below the tip, the next landing still goes ahead on top of the failing merge, because the exit-4 line counts as recording it.
- S0.4's hand line 1 (full `merge` hash) is read as recording f852145c.
- Nothing changed on u/S0.6, build or hb. Scratch worktree `.claude/worktrees/rS0.6` removed; temp repos cleaned.
- Tokens: calls 41, 6.32 M, context 221.5 K (expected 5.4 M, limit 15.6 M).

---

## P07

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

Your file: REPO/docs/program/evidence/bottleneck-2026-11-18/own-data.md
Your prefix: x18

Job:
1. Read REPO/library/README.md, only the sections "A record" and "A new writer" (and the id ranges line under it). Nothing else in the library.
2. Read your one file (whole).
3. Write REPO/library/journal/2026-11-18/x18.jsonl: one JSON object per line, one record for each fact, status, published result or hypothesis the file states. Field order: id, kind, status, claim, when, quote, evidence, see, note, handles, footprint, supersedes, date, by; leave out empty fields. Always set "date":"2026-11-18" and "by":"x18".
 - id: x18-NNNN with four digits in the range for the kind (fact 0100-0199, status 0200-0299, result 0300-0399, hypothesis 0400-0499, open 0500-0599, mistake 0600-0699, pointer 0700-0799). Number consecutively within each range, no duplicates.
 - kind: fact (measured/observed here), status (how far a method was ever tested), result (a published result by others, with the author/source named in the claim), hypothesis (a design or guess not yet tested). Never use kind ruling or adjudication.
 - status: what the file itself says about how the thing is known: measured, observed, quoted, summary, textbook, reasoned, designed-only. Where the file does not say, use reasoned and add a "note" saying the file does not state it.
 - claim: ONE sentence, as short as it can be, carrying its number, unit and condition, and any caveat the file gives beside it. It must be understandable alone (name the method, paper, tool). Copy numbers exactly.
 - evidence: a JSON array with the  [...cut]

**Report B:**
76

I wrote 76 records to `library/journal/2026-11-18/x18.jsonl`. The count is confirmed with `wc -l`. The file has 57 facts (x18-0100 to x18-0156), 13 statuses (x18-0200 to x18-0212) and 6 hypotheses (x18-0400 to x18-0405). It has no results, since the source file cites no published results of others, and no open, mistake or pointer records.

---

## P10

### A (earlier helper, ended 2026-11-19T19:36)
**Brief A:**
You are unit OUT (FX-OUT) of the research tree's build (kind build-invariant, model opus), started by the build root.
Read `C:/Users/User/Documents/projects/harness-engineering/research-tree/build/briefs/B1-1.md` (the builders' part and your row) and the part of `briefs/B0b.md` it says holds for you. Build FX-OUT in your worktree `C:/Users/User/Documents/projects/harness-engineering/.claude/worktrees/OUT` (branch `u/OUT`, cut from `build` ec3b04fd), filling the skeleton's steps for your fix, with its tests (and the one test that runs the hook as a process) run through the main checkout's lane; commit on your branch; write `research-tree/build/units/OUT/result.md` in the main checkout last, never at a LIMIT. Return in at most 8 lines.

**Report A:**
LIMIT C:/Users/User/Documents/projects/harness-engineering/research-tree/build/units/OUT/checkpoint.md
I stopped at the 330 K context checkpoint. No `result.md` was written.
- **Branch:** `u/OUT`, commit **e38717a3** (parent ec3b04fd).
- **Done:** FX-OUT is built in lib, guard-hook, replace, commit, watch, status and fsck. CONTRACT 3.12, 3.23 and 4.6, the specs and the five READY brief lines are written, and coordinator.md 5a is filled. Six new tests and the hook-clock process test are written, and the existing tests that read READY were moved to outcome slots.
- **Tests:** none run yet. My one lane call (`OUT-lib-commit`) showed nothing through my output filter, so it is not a result.
- **Departures:** listed in the checkpoint; `departures/OUT.md` is not written yet.
- **Tokens:** calls 92, 19.64 M (over the 11.7 M expected, under the 29.2 M limit), context 327.9 K.
- **Not done:** the lane runs (guard-hook from a detached checkout outside `.claude/`), fixes for any failures, the departures file and `result.md`.
- **Next step:** a successor resumes from step 1 of the checkpoint's "Left" list.

### B (later helper, started 2026-11-19T19:36)
**Brief B:**
You are the successor of unit OUT (FX-OUT) of the research tree's build (kind build-invariant, model opus), started by the build root. The first helper stopped at its context checkpoint (327.9 K) after 19.64 M tokens with the code written and no test run: commit e38717a3 on `u/OUT`.
1. Read `C:/Users/User/Documents/projects/harness-engineering/research-tree/build/units/OUT/checkpoint.md` first and resume from step 1 of its "Left" list: the lane runs of the unit's test files (guard-hook.test.mjs from a detached checkout outside `.claude/`), fixes for any failure, the departures file `research-tree/build/departures/OUT.md` (listed in the checkpoint), then the result. Do not re-read the design unless a test fails or the checkpoint names a place. Note the first helper's one lane call showed nothing through its output filter: read the lane's exit code and the TAP summary lines (`# pass`, `# fail`) directly.
2. Read only the builders' part of `research-tree/build/briefs/B1-1.md` and the part of `briefs/B0b.md` it points to.
3. Worktree `C:/Users/User/Documents/projects/harness-engineering/.claude/worktrees/OUT`, branch `u/OUT`. Token limit 9.5 M (the rest of the unit's 29.2 M); the 330 K checkpoint applies. Write `research-tree/build/units/OUT/result.md` in the main checkout last, covering the whole unit, never at a LIMIT. Return in at most 8 lines.

**Report B:**
OUT finished. Branch `u/OUT`, final commit `e38717a3` (no test failed, so there was nothing to fix and no new commit).
Tests passed in all 7 of the unit's files (pass/fail/not-run): lib 192/0/2 and commit 35/0/1 (`OUT-lib-commit`), replace 84/0/2 and fsck 21/0/0 (`OUT-replace-fsck`), watch 65/0/4 (`OUT-watch`), status 30/0/2 (`OUT-status`). guard-hook got 20/0/3 (`OUT-guard-hook`), run from the detached checkout `hx-OUT`, which is now removed. Every not-run test is one that needs the app.
All 7 new tests pass, including the hook-clock test that runs the hook as a process. The first helper's lane call had also exited 0. Its `# pass` filter found nothing only because Node 24 prints the spec reporter unless `--test-reporter=tap` is given.
Departures: `C:/Users/User/Documents/projects/harness-engineering/research-tree/build/departures/OUT.md` (7 items). Expect a landing conflict on the `const stubs` line of lib.test.mjs with W1 and CLAIM; resolve it as the union of the removals.
Not done: three shared lines were left as they were: CONTRACT 3.6's row, guard-hook.mjs header line 8, and `spec/status.mjs.md` line 62, which still names `ready-unparseable`. No status test asserts the new `outcome-tamper` anomaly, and selftest.test.mjs was not run.
Tokens: successor 3.81 M before the result file, first helper 20.64 M, unit about 24.5 M of 29.2 M.
Result: `C:/Users/User/Documents/projects/harness-engineering/research-tree/build/units/OUT/result.md`

---

## P13

### A (library record on file before B started)
fact observed: An Agent tool call's input carries description, prompt, subagent_type and model, though not every call carries all of them.

### B (later helper, started 2026-11-19T11:42)
**Brief B:**
This is a harmless probe. Do exactly this and nothing else:
1. Call the Agent tool once with subagent_type "general-purpose", model "haiku", description "test: inner echo", and prompt "Reply with the single word INNER-OK and do nothing else."
2. Report verbatim: whether the Agent tool exists for you, the exact result or error of the call (if the call runs in the background, wait for its result notification), and nothing else. At most 600 characters.

**Report B:**
Agent tool exists for me: yes. I called it once with subagent_type "general-purpose", model "haiku", description "test: inner echo", and the prompt "Reply with the single word INNER-OK and do nothing else." The call succeeded with no error. Its result, delivered as a handback message from agent a95f8e01c6046ab36, was: INNER-OK. Usage reported: 1 tool use, 59,108 subagent tokens, 3,438 ms.

---

## P16

### A (earlier helper, ended 2026-11-18T21:14)
**Brief A:**
Read and follow exactly the brief in docs/program/evidence/round3-2026-11-18/t1-brief-5-extract.md (repository root: C:\Users\User\Documents\projects\harness-engineering), for collect file t1-collect-concurrent.md only (its "Second attempt" section included), writing library/journal/2026-11-19/x36.jsonl.

Follow the section 'Keeping the library clean' in docs/program/evidence/round3-2026-11-18/ROUND.md. A result record states only what stands at the place it cites; a narrowed claim is recorded as narrowed; a refuted claim is not recorded as a result but named with its reason in one status record of the lane; a company's own figure carries 'self-reported'; the check covers every record, removes any that fails, and reports how many.

Do not commit; write only that file. Return five lines or fewer: records written, by type.

**Report A:**
Wrote `library/journal/2026-11-19/x36.jsonl`: 36 `result` records (all `quoted`), no facts, no `open` or refuted-claim status record.

The check covered every record: all 36 parse, keep field order, and each number stands at its cited input and paper line. Names and words were not script-checked.

Narrowed: the 8.6x Bw-tree figure is labelled dedup from the input's gate summary, not the quoted sentence. The 18.7x and 5.8x records omit the thread count, and the 20-thread count for the Leis 2016 cycles record was dropped.

Not committed.

### B (later helper, started 2026-11-18T21:15)
**Brief B:**
Read and follow exactly the brief in C:\Users\User\Documents\projects\harness-engineering\docs\program\evidence\round3-2026-11-18\w1-brief-extract.md

Collect file: w1-collect-grain.md. Output: library/journal/2026-11-19/x26.jsonl (if the brief assigns another number to this topic, the brief wins).

Follow the section 'Keeping the library clean' in docs/program/evidence/round3-2026-11-18/ROUND.md. A result record states only what stands at the place it cites; a narrowed claim is recorded as narrowed; a refuted claim is not recorded as a result but named with its reason in one status record of the lane; a company's own figure carries 'self-reported'; the check covers every record, removes any that fails, and reports how many.

Do not commit. Return ten lines or fewer.

**Report B:**
Wrote `library/journal/2026-11-19/x26.jsonl`, not committed.

- Records: 14, all `result` with status `quoted`, from the grain collect file.
- Check: all 14 parse, keep field order, and every number in each claim stands at its cited collect-file lines. Problems: 0 after two evidence lines were added.
- Left out: Mohan 1990 (ARIES/KVL). The collect file says the copy's route is unrecorded, and the brief bars pirate copies.
- Left out: the ratios (34 %, 64 %) the collector computed from the Ries and Stonebraker table. They are not the paper's figures, so only the raw values are recorded.
- Not done: the refuted-claims status record. The brief sends that to the lane's `w1.jsonl`, and this step does not write it.

---

## P19

### A (earlier helper, ended 2026-11-17T21:39)
**Brief A:**
Reply with the single word OK and stop.

**Report A:**
OK

### B (later helper, started 2026-11-17T21:39)
**Brief B:**
Reply with the single word OK and stop.

**Report B:**
OK

---

## P22

### A (earlier helper, ended 2026-11-18T21:14)
**Brief A:**
Read and follow exactly the brief in docs/program/evidence/round3-2026-11-18/t1-brief-5-extract.md (repository root: C:\Users\User\Documents\projects\harness-engineering), for collect file t1-collect-concurrent.md only (its "Second attempt" section included), writing library/journal/2026-11-19/x36.jsonl.

Follow the section 'Keeping the library clean' in docs/program/evidence/round3-2026-11-18/ROUND.md. A result record states only what stands at the place it cites; a narrowed claim is recorded as narrowed; a refuted claim is not recorded as a result but named with its reason in one status record of the lane; a company's own figure carries 'self-reported'; the check covers every record, removes any that fails, and reports how many.

Do not commit; write only that file. Return five lines or fewer: records written, by type.

**Report A:**
Wrote `library/journal/2026-11-19/x36.jsonl`: 36 `result` records (all `quoted`), no facts, no `open` or refuted-claim status record.

The check covered every record: all 36 parse, keep field order, and each number stands at its cited input and paper line. Names and words were not script-checked.

Narrowed: the 8.6x Bw-tree figure is labelled dedup from the input's gate summary, not the quoted sentence. The 18.7x and 5.8x records omit the thread count, and the 20-thread count for the Leis 2016 cycles record was dropped.

Not committed.

### B (later helper, started 2026-11-18T21:15)
**Brief B:**
Read and follow exactly the brief in C:\Users\User\Documents\projects\harness-engineering\docs\program\evidence\round3-2026-11-18\w1-brief-extract.md

Collect file: w1-collect-production.md. Output: library/journal/2026-11-19/x41.jsonl.

Follow the section 'Keeping the library clean' in docs/program/evidence/round3-2026-11-18/ROUND.md. A result record states only what stands at the place it cites; a narrowed claim is recorded as narrowed; a refuted claim is not recorded as a result but named with its reason in one status record of the lane; a company's own figure carries 'self-reported'; the check covers every record, removes any that fails, and reports how many.

Do not commit. Return ten lines or fewer.

**Report B:**
Wrote `library/journal/2026-11-19/x41.jsonl` with 21 `result` records (ids x41-0301 to x41-0321): 20 `quoted`, 1 `summary` (x41-0320, Meta, from a third party's talk notes).

Check: all 21 parse and keep the field order. Every figure stands at its cited collect-file line. The only tokens not on the cited line are citation years, which sit in the block headings. No record failed, so none were removed.

Not recorded: Uber SubmitQueue (block 8, a reused library record, not a finding of this collect), and the Meta primary account (not found). Figma and Google Docs have no measured figures, so their records state the mechanism and say "no figures" in the claim.

Nothing committed.

---

## P25

### A (earlier helper, ended 2026-11-17T21:39)
**Brief A:**
Reply with the single word OK and stop.

**Report A:**
OK

### B (later helper, started 2026-11-19T11:42)
**Brief B:**
Reply with the single word INNER-OK and do nothing else.

**Report B:**
INNER-OK

---

## P28

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

Your file: REPO/docs/program/evidence/harness-method-status-2026-11-18/several-writers-options.md
Your prefix: x15

Job:
1. Read REPO/library/README.md, only the sections "A record" and "A new writer" (and the id ranges line under it). Nothing else in the library.
2. Read your one file (whole).
3. Write REPO/library/journal/2026-11-18/x15.jsonl: one JSON object per line, one record for each fact, status, published result or hypothesis the file states. Field order: id, kind, status, claim, when, quote, evidence, see, note, handles, footprint, supersedes, date, by; leave out empty fields. Always set "date":"2026-11-18" and "by":"x15".
 - id: x15-NNNN with four digits in the range for the kind (fact 0100-0199, status 0200-0299, result 0300-0399, hypothesis 0400-0499, open 0500-0599, mistake 0600-0699, pointer 0700-0799). Number consecutively within each range, no duplicates.
 - kind: fact (measured/observed here), status (how far a method was ever tested), result (a published result by others, with the author/source named in the claim), hypothesis (a design or guess not yet tested). Never use kind ruling or adjudication.
 - status: what the file itself says about how the thing is known: measured, observed, quoted, summary, textbook, reasoned, designed-only. Where the file does not say, use reasoned and add a "note" saying the file does not state it.
 - claim: ONE sentence, as short as it can be, carrying its number, unit and condition, and any caveat the file gives beside it. It must be understandable alone (name the method, paper, tool). Copy numbers exactly.
 - eviden [...cut]

**Report B:**
163

---

## P31

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

### B (later helper, started 2026-11-17T22:00)
**Brief B:**
You extract records for a knowledge library. REPO = C:/Users/User/Documents/projects/harness-engineering. Use only Read and Write tools (Bash only to count lines if needed). Write only under REPO/library/.

Your file: REPO/docs/program/evidence/harness-method-status-2026-11-18/concurrency-literature.md
Your prefix: x07

Job:
1. Read REPO/library/README.md, only the sections "A record" and "A new writer" (and the id ranges line under it). Nothing else in the library.
2. Read your one file (whole).
3. Write REPO/library/journal/2026-11-18/x07.jsonl: one JSON object per line, one record for each fact, status, published result or hypothesis the file states. Field order: id, kind, status, claim, when, quote, evidence, see, note, handles, footprint, supersedes, date, by; leave out empty fields. Always set "date":"2026-11-18" and "by":"x07".
 - id: x07-NNNN with four digits in the range for the kind (fact 0100-0199, status 0200-0299, result 0300-0399, hypothesis 0400-0499, open 0500-0599, mistake 0600-0699, pointer 0700-0799). Number consecutively within each range, no duplicates.
 - kind: fact (measured/observed here), status (how far a method was ever tested), result (a published result by others, with the author/source named in the claim), hypothesis (a design or guess not yet tested). Never use kind ruling or adjudication.
 - status: what the file itself says about how the thing is known: measured, observed, quoted, summary, textbook, reasoned, designed-only. Where the file does not say, use reasoned and add a "note" saying the file does not state it.
 - claim: ONE sentence, as short as it can be, carrying its number, unit and condition, and any caveat the file gives beside it. It must be understandable alone (name the method, paper, tool). Copy numbers exactly.
 - evidenc [...cut]

**Report B:**
3

---

## P34

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

Your file: REPO/docs/program/evidence/harness-method-status-2026-11-18/testing-evidence.md
Your prefix: x16

Job:
1. Read REPO/library/README.md, only the sections "A record" and "A new writer" (and the id ranges line under it). Nothing else in the library.
2. Read your one file (whole).
3. Write REPO/library/journal/2026-11-18/x16.jsonl: one JSON object per line, one record for each fact, status, published result or hypothesis the file states. Field order: id, kind, status, claim, when, quote, evidence, see, note, handles, footprint, supersedes, date, by; leave out empty fields. Always set "date":"2026-11-18" and "by":"x16".
 - id: x16-NNNN with four digits in the range for the kind (fact 0100-0199, status 0200-0299, result 0300-0399, hypothesis 0400-0499, open 0500-0599, mistake 0600-0699, pointer 0700-0799). Number consecutively within each range, no duplicates.
 - kind: fact (measured/observed here), status (how far a method was ever tested), result (a published result by others, with the author/source named in the claim), hypothesis (a design or guess not yet tested). Never use kind ruling or adjudication.
 - status: what the file itself says about how the thing is known: measured, observed, quoted, summary, textbook, reasoned, designed-only. Where the file does not say, use reasoned and add a "note" saying the file does not state it.
 - claim: ONE sentence, as short as it can be, carrying its number, unit and condition, and any caveat the file gives beside it. It must be understandable alone (name the method, paper, tool). Copy numbers exactly.
 - evidence: a J [...cut]

**Report B:**
98

---

## P37

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

### B (later helper, started 2026-11-20T00:38)
**Brief B:**
You are the builder of unit S2.1 in the build of task r57-0507. S2.1 writes the tests that cross fixes, then reads CONTRACT and the specs through for agreement. Kind: build. Model: Sonnet. MAIN = `C:/Users/User/Documents/projects/harness-engineering`.

**Read first:**
- `MAIN/CLAUDE.md`: the repository's rules;
- `MAIN/research-tree/build/briefs/B1-4.md`: your brief, its part "S2.1";
- the parts it points into: `briefs/B1-2.md` part "Builders", and `briefs/B0b.md` part "Builders (build-invariant, opus): common". Their worktree, lane, tests, checkpoint and result rules hold for you.

**Your worktree** is `MAIN/.claude/worktrees/S2.1` on branch `u/S2.1`, at `build` 56918efb. That tip holds all of B1-1 to B1-3. Suite 4 passed on it, with 0 failures, and the end-to-end file passed 239/239. W4 is being built at the same time in its own worktree. Write W4's dead-man test as a `todo` test that names W4, as the brief says.

**Do not edit:**
- `.claude/hooks/*`;
- `tools/check-commit.mjs`;
- anything under `docs/program/evidence/` or `recovered/`.

**Tokens:** expected 5.5 M, limit 10 M. Count them with `node C:/Users/User/Documents/projects/harness-engineering/research-tree/build/tools/tokens-self.mjs "S2.1 cross tests build"`.

At about 330 K context or at the limit:
1. commit;
2. write only `MAIN/research-tree/build/units/S2.1/checkpoint.md`;
3. return `LIMIT <path>`.

**Result:** write `MAIN/research-tree/build/units/S2.1/result.md` last, and never at a LIMIT. Return in at most 8 lines.

**Report B:**
S2.1 done: branch u/S2.1, final commit 2687415f (on build 56918efb). Result: MAIN/research-tree/build/units/S2.1/result.md.
- Items 1 and 2 already exist and pass on build, so no change: lib "FX-PLAN T1 total table" (3 tests; the committed-at-started case is now a real test since CLOSE landed) and guard-hook "FX-W3 hook" (a denied start leaves no start.json).
- Item 3 is new in status.test.mjs, 3 tests "S2.1 N2": the brief text, endturn after handover exit 2, endturn after exit 75 (endturn itself busy gives 75 and writes nothing).
- Item 4: the W4 dead-man is a `todo` test in status.test.mjs, since `status --deadman` is still an empty stub. Its field names (runs_no_alarm, alert) are guessed from FIX-wake, so whichever of W4 and S2.1 lands second must adapt them and drop `todo`.
- Tests: status.test.mjs 45 tests, 42 pass, 0 fail, 2 skipped, 1 todo (lane S2.1-status-all). lib and guard-hook files were not changed and not run.
- Wording fixes, no departures file: spec/lib.md line 402 (the todo wording is gone), CONTRACT.md line 1337 (endturn also after handover exit 2 and exit 75). The read-through found no other disagreement on these points.
- Tokens: 1.70 M, 19 calls. Not done: full suite 5 (the root's) and the real W4 dead-man test.

---

## P40

### A (earlier helper, ended 2026-11-19T19:36)
**Brief A:**
You are unit OUT (FX-OUT) of the research tree's build (kind build-invariant, model opus), started by the build root.
Read `C:/Users/User/Documents/projects/harness-engineering/research-tree/build/briefs/B1-1.md` (the builders' part and your row) and the part of `briefs/B0b.md` it says holds for you. Build FX-OUT in your worktree `C:/Users/User/Documents/projects/harness-engineering/.claude/worktrees/OUT` (branch `u/OUT`, cut from `build` ec3b04fd), filling the skeleton's steps for your fix, with its tests (and the one test that runs the hook as a process) run through the main checkout's lane; commit on your branch; write `research-tree/build/units/OUT/result.md` in the main checkout last, never at a LIMIT. Return in at most 8 lines.

**Report A:**
LIMIT C:/Users/User/Documents/projects/harness-engineering/research-tree/build/units/OUT/checkpoint.md
I stopped at the 330 K context checkpoint. No `result.md` was written.
- **Branch:** `u/OUT`, commit **e38717a3** (parent ec3b04fd).
- **Done:** FX-OUT is built in lib, guard-hook, replace, commit, watch, status and fsck. CONTRACT 3.12, 3.23 and 4.6, the specs and the five READY brief lines are written, and coordinator.md 5a is filled. Six new tests and the hook-clock process test are written, and the existing tests that read READY were moved to outcome slots.
- **Tests:** none run yet. My one lane call (`OUT-lib-commit`) showed nothing through my output filter, so it is not a result.
- **Departures:** listed in the checkpoint; `departures/OUT.md` is not written yet.
- **Tokens:** calls 92, 19.64 M (over the 11.7 M expected, under the 29.2 M limit), context 327.9 K.
- **Not done:** the lane runs (guard-hook from a detached checkout outside `.claude/`), fixes for any failures, the departures file and `result.md`.
- **Next step:** a successor resumes from step 1 of the checkpoint's "Left" list.

### B (later helper, started 2026-11-19T19:47)
**Brief B:**
You are the refuter of unit OUT (FX-OUT) of the research tree's build (kind refute, model opus), started by the build root. You have not seen the builder's reasoning.
Read `C:/Users/User/Documents/projects/harness-engineering/research-tree/build/briefs/B1-1.md` (the refuters' part and OUT's row) and the part of `briefs/B0b.md` it says holds for you. Review `u/OUT` (final commit e38717a3, worktree `.claude/worktrees/OUT`; two helpers built it, a first one to its checkpoint and a successor) against FX-OUT's design (`research-tree/model/as-built/FIX-fence.md` part 1 and 0b, its Revision 5 notes, the FIX-JOIN points that name FX-OUT) and fact F-P2 (`research-tree/build/facts/FP1b-FP2.md`), with `research-tree/build/units/OUT/result.md` and `research-tree/build/departures/OUT.md`. The unit's test files: tcb/test/lib, commit, replace, fsck, watch, status and guard-hook (`.test.mjs`); the hook-clock test that runs the hook as a process is one of the invariants to mutate. The result names what the builder left undone (three shared lines; no status test of the new `outcome-tamper` anomaly; selftest.test.mjs not run): say for each whether it breaks the unit's purpose or a unit built on it. One mutation per invariant in a scratch worktree of your own (`.claude/worktrees/rOUT`; guard-hook.test.mjs from a detached checkout outside `.claude/`, for example `C:/Users/User/Documents/projects/hx-rOUT`, removed at the end), through the main checkout's lane; never change the builder's branch. Write `research-tree/build/refute/OUT.md` last (first line `PASS` or `BREAKING: ...`), never at a LIMIT. Return in at most 8 lines.

**Report B:**
PASS. Verdict: C:/Users/User/Documents/projects/harness-engineering/research-tree/build/refute/OUT.md. u/OUT is unchanged at e38717a3; both scratch checkouts (rOUT, hx-rOUT) are removed.
Baselines match the result: guard-hook+fsck+commit+replace 160/0/6, watch 65/0/4, status 30/0/2. I also ran selftest as its 4 shards: 29/0/2.
I ran 44 mutations: 26 were caught, including the hook-clock test, so S0.4's M25 is now closed. Survivors are F3 and F4 (equivalent), plus untested sites where the code is right: A2 and A3 (the fence/hook race, re-read after a lost name), F11 (`start` makes `outcome/`), F8 (dry run writes nothing), L2 (R-b), W1/S3 and W2/S1 (watch/status read the log, not READY.json), O1 (hook order) and the tamper shapes L3/L7/L8/L9. For A2, A3 and L2 a scratch race test passes on e38717a3 and fails on each mutation; for the others I judged correctness by reading.
Recommended tests to add, by S2.2 or a fix round: the two lib race tests, a start assertion for `outcome/`, a dry-run no-write case, R-b, and a slot-only and a READY-only case in watch and status.
The builder's three open items do not break the unit or anything built on it. The three shared lines are a comment and two doc lines that S2.2 must reword; no status test of `outcome-tamper` is a test gap only (fence, commit, hook and fsck still catch a bad log); selftest passes.
Small item: other helpers share this scratchpad, and one overwrote my `mut.mjs`. Scratch files should carry the unit's name.
Tokens: refute: OUT | calls 71 | tokens 13.78 M | context 292.1 K (expected 5.4 M, limit 15.6 M).

---

## P43

### A (earlier helper, ended 2026-11-06T02:57)
**Brief A:**
You are a read-only refute-reviewer. Reply with text only. Do NOT write or edit any file, do NOT run tests, pytest, manage.py, docker or any database command. Reading files and `git diff`/`git show`/`git log` are fine.

Repository: the git worktree at C:\Bilal_Migration\User\Downloads\20_PROJECTS\24_Clinic_Workshop\.claude\worktrees\exciting-vaughan-0ad194 (branch claude/exciting-vaughan-0ad194). It is a Django 5.2 clinic app; everything is synthetic.

Scope: the commit 152439f (`git show 152439f`), which answers four gate findings on the sign-in throttle. Try hard to REFUTE each fix: find a concrete sequence of requests or a code path where the fix does not hold, or where it creates a new way to shut a real person out or to guess passwords faster. Read `src/clinic/identity/throttle.py` whole, `services.authenticate_credentials`, `services.console_unlock_address`, `services._register_failure`, `views._finished`/`password_change`/`sign_in`, the new command `management/commands/unlock_address.py`, and the tests `src/clinic/identity/tests/test_signin_throttle.py`. Check the settings in `src/clinic/settings/base.py` (CLINIC_SIGNIN_*, CLINIC_LOCKOUT_MINUTES).

The four findings as the gate stated them:
- GI-01 (P1): one source could keep a person out of every new device for good. Under the old code `fresh_source = not rows[PAIR].struck`, and a pair with one failure every 15 minutes is never struck. Sequence: close the account with 4+4+2 failures from three sources, then one failure from the first source every 15 minutes. Required: a source that re-paused the struck account counter is used up; a test of 4+4+2 then one failure from the first source every 16 minutes for two hours with no refusal for the real person (a new browser, fresh address) from the second cycle on; an hon [...cut]

**Report A:**
**Verdict:** GI-02 holds. GI-01, GI-03 and GI-04 hold as code changes or recorded decisions, but the residuals recorded for them are wrong or incomplete in ways that matter. The GI-01 fix also opens a new, cheap way to keep a named person out of new browsers (N1, rated P1). I read the code and records only; nothing was run.

## Findings under review

**GI-01: HOLDS for the gate's sequence.** Its residual is understated.
- Traced 4+4+2, then the first source failing every 16 minutes. In cycle 1 the first source's pair reaches 5 and re-pauses the account. From cycle 2 that source is refused (`throttle.py:262`), and a new browser at HOME gets in.
- I found no fixed pool of 2 to 20 sources that keeps the account *closed* for good. Each source buys one 15-minute pause per 24 hours, so 20 sources give about 5 closed hours a day.
- Total guesses per account improved: about one per 15 minutes from a fresh source, against about 10 per window before.
- The weak part is N1 below: keeping the account counter *struck* (not closed) costs about 2 guesses a day, and the struck state is what does the damage.
- The decision record's reason for still re-pausing a struck counter compares the new rule only with "count only, no refusal". It does not weigh "refuse spent sources, count only". With spent sources refused, a fixed pool can no longer refill the counter, so the stated reason no longer holds on its own (P3, `docs/tasks/identity-followup/task.md:23`).

**GI-02: HOLDS.**
- With the cookie path at `/`, the password change receives the cookie, so the same device id and the other accounts' tags are kept.
- The test's cookie filter (`_send_only_cookies_for`) would fail under the old `/login/` path, so it does detect the bug.

**GI-03: HOLDS** (docstring, residual and Q-GI03 with options a [...cut]

### B (later helper, started 2026-11-06T03:04)
**Brief B:**
You are a read-only refute-reviewer. Reply with text only. Do NOT write or edit any file, do NOT run tests, pytest, manage.py, docker or any database command. Reading files and git commands (`git show`, `git diff`, `git log`) are fine.

Repository: the git worktree at C:\Bilal_Migration\User\Downloads\20_PROJECTS\24_Clinic_Workshop\.claude\worktrees\exciting-vaughan-0ad194 (Django 5.2, synthetic data). Scope: commit d69ebb4 (`git show d69ebb4`), which reshapes the sign-in throttle's "spent source" rule in `src/clinic/identity/throttle.py` (`record_failure`, `refusal`, `remember_device`), plus `services.console_unlock_address`, `views.mfa_setup`, settings `CLINIC_SIGNIN_*` in `src/clinic/settings/base.py`, and tests in `src/clinic/identity/tests/test_signin_throttle.py`. Read throttle.py whole.

The rule now: three counters (pair = account+source, account = account across unknown sources, address = address across names). A known device (signed cookie) has only its pair counter. A full counter pauses 15 min and becomes "struck" (every later failure re-pauses it at once) until a quiet day. While the account counter is struck, a failure from an unknown source "spends" that source: its pair counter is struck and paused for CLINIC_SIGNIN_SPENT_MINUTES (60). Only an unspent source's failure re-pauses the account at once; spent sources' failures still count in the account window (10 closes it). The previous version refused spent sources until the account counter was forgotten, which let an outsider keep a person's own address out for 24 h with ~2 failures a day; that is what this commit replaces.

Goals the design must meet: (1) no single source, or small fixed pool (say under ~30 sources), can keep a named person out of new devices (a fresh browser at an address the attacker n [...cut]

**Report B:**
**Verdict:** goals 2, 4 and the person's-own-typo half of goal 3 hold. Goal 1 fails at your "under ~30" bar, because of the two-request race the docs already admit. The outsider half of goal 3 fails as a documented residual from before this commit.

## Goals

**Goal 1 (no small fixed pool keeps a person off new devices): DOES NOT HOLD under ~30.** Without the race it does hold down to 40 sources. That matches `10 x 60 / 15 = 40` in task.md:23 and :63 and throttle.py:31.
- **The race.** `refusal()` reads without a lock (throttle.py:260-271). The password check then takes about 0.7 s before `record_failure` runs (services.py:178-189). With two sync workers, two requests from one source both pass the pause check. Both count in the account counter, and the second also re-pauses the source (`blocked_until < until` is true for the later `at`, :348). So a spent source yields 2 failures per spent pause, not 1.
- **Sequence with 20 IPv4 sources in groups G1 to G4 of 5.** The account is struck.
  - t=15: the account pause ends. G1 sends 2 concurrent requests per source; the window rolls, failures reach 1 to 10, and the account is paused to about t=30 (plus 3.5 s). G1 is spent to about t=75.
  - G2 does the same at t=30, G3 at t=45, G4 at t=60, then G1 again at about t=75 plus 14 s.
  - The person on a fresh browser at an unused address is refused, except for about 3.5 s every 15 minutes.
  - The fast "paused" refusal tells the attacker exactly when each pause ends (the Timing residual).
- **Pool with the race:** 10 x 60 / 15 / 2 = 20.
- The "Two requests at once" bullet (task.md:69) and the pool figure are not connected anywhere.

**Goal 2 (guessing capped per account): HOLDS.** The caps:
- **Unknown sources:**
  - First close: 10 per 15-minute window (19 around a boundary).
  -  [...cut]

---

## P46

### A (earlier helper, ended 2026-11-18T20:19)
**Brief A:**
Read and follow exactly the brief in C:\Users\User\Documents\projects\harness-engineering\docs\program\evidence\round3-2026-11-18\w1-brief-analyse.md

Input: all six collect files of lane w1 in that folder: w1-collect-isolation.md, w1-collect-grain.md, w1-collect-engines.md, w1-collect-order.md, w1-collect-merge.md, w1-collect-long.md (each with its "Second attempt" section where present). Do not commit. Return ten lines or fewer: files written, number of claims, and anything the brief told you to flag.

**Report A:**
Now the six collect files.

### B (later helper, started 2026-11-18T20:24)
**Brief B:**
Read and follow exactly the brief in C:\Users\User\Documents\projects\harness-engineering\docs\program\evidence\round3-2026-11-18\w1-brief-analyse.md

Input: all seven collect files of lane w1 in that folder: w1-collect-isolation.md, w1-collect-grain.md, w1-collect-engines.md, w1-collect-order.md, w1-collect-merge.md, w1-collect-long.md, and w1-collect-production.md (sub-topic 7 of lane-writers.md, added 2026-11-19 on the owner's word; follow what ROUND.md and lane-writers.md now say for it, including that a company's own figure is marked "self-reported"). Read each with its "Second attempt" section where present. Do not commit. Return ten lines or fewer: files written, number of claims, and anything the brief told you to flag.

**Report B:**
I wrote both step 2 files and did not commit. 98 claims: 84 proven, 7 measured here, 7 hypothesis.

- **Files:** `docs/program/evidence/round3-2026-11-18/w1-report.md` and `docs/program/evidence/round3-2026-11-18/w1-claims.md`. I checked every quote at its cited line with a script; three lines were corrected. All 98 claims are cited in the report.
- **Claims by standing:** of the 84 proven, 6 are self-reported company figures, 10 come from preprints and 5 from simulations. Of the 7 measured here, 2 have status measured and 5 are observed (the brief only defines status measured, so I listed these separately). Of the 7 hypotheses, 2 are computed.
- **Answer, in three lines:**
  1. The frame is right on its four failures but wrong that ordering first means nothing is redone. It misses wasted work and starvation of long units, deadlock, edits silently lost when another writer deletes the code, and escalation with de-escalation.
  2. Every engine gain is for units of seconds or less: commuting writes 38x, hot item out of the unit 17x, snapshots 80x; for long units the published advice is to wait rather than abort. On model sessions, one preprint found version-checked writes beat worktrees 82.5 % to 63.8 % at 4 writers.
  3. The ranked ladder that replaces the switch: reshape shared places, claims below the file, version-checked landing, waiting, checkpoints, the serial check, structured merge last. Today nothing per file is enforced for helpers.
- **Collectors missed:**
  - The size of the wait-versus-abort crossover sits in plots that were never read (Tanabe Fig 9a, Srinivasan Fig 23).
  - CAID's "shared workspace" was instruction-only, so it is not comparable with STORM; I settled this at `caid/paper.txt:420-430`.
  - Not opened: Weihl 1988 and Pradel 1986. Fekete, Cahill  [...cut]

---

## P49

### A (earlier helper, ended 2026-11-20T01:00)
**Brief A:**
You are the blind refuter of unit S2.1, the tests that cross fixes, in the build of task r57-0507. Your kind is refute and your model is Opus. MAIN = `C:/Users/User/Documents/projects/harness-engineering`.

**Read first:**
- `MAIN/CLAUDE.md`, the repository's rules;
- `MAIN/research-tree/build/briefs/B1-4.md`, its parts "S2.1" and "S2.1's refuter";
- the parts that B1-4 points into: `briefs/B1-2.md`, part "Refuters", and `briefs/B0b.md`, part "Refuters".

**The unit:**
- branch `u/S2.1`, worktree `MAIN/.claude/worktrees/S2.1`;
- the diff: `git -C MAIN/.claude/worktrees/S2.1 diff build...u/S2.1`;
- `MAIN/research-tree/build/units/S2.1/result.md`.

S2.1 says two of its four cross tests already existed on `build`. Check them as well:
- lib "FX-PLAN T1 total table";
- guard-hook "FX-W3 hook".

**Your work:**
1. For each fix that a cross test claims to guard, mutate that fix in a scratch worktree of your own. Show whether the test fails.
2. Check the two wording changes in `spec/lib.md` and `CONTRACT.md` against the code.
3. Run test files through MAIN's lane, as B0b says. Run `guard-hook.test.mjs` from a checkout outside `.claude/`.
4. Keep each lane call under 150 s, with its wait.
5. Never change the builder's branch.
6. Put your scratch scripts under `C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/8a7db643-dc9c-42d9-8dea-e9f99c2d3b69/scratchpad/S2.1-refute/`.

**Do not edit:**
- `.claude/hooks/*`;
- `tools/check-commit.mjs`;
- anything under `docs/program/evidence/` or `recovered/`.

**Tokens:** expected 5.4 M, limit 15.6 M. Count them with `node C:/Users/User/Documents/projects/harness-engineering/research-tree/build/tools/tokens-self.mjs "S2.1 blind review"`. At the limit, write only `MAIN/research-tree/build/units/S2.1/refute-checkpoint.md` and return `LIMIT [...cut]

**Report A:**
BREAKING: the N2 "after handover exit 2" test checks nothing about handover. It deletes coord.json and runs `handover bind --dry-run`, which exits 2 at checkCe's `no-coordinator`, then puts coord.json back. Mutation C4 makes `handover raise`'s real exit 2 (proc-unavailable, the path N2 names) first write coord.json at ce+1. It survives all three S2.1 N2 tests and all of handover.test.mjs; no test runs raise's exit 2. The suggested test is in the verdict.
Item 1 (lib FX-PLAN T1): A1, A2, A3 and A6 caught. A5 (replace's dry-run fence refuses planned/none) and A7 (stop request gated by the arm) get past T1. T1 counts any exit other than 64-66 as accepted, and the first fence's dry run exits 6 not-armed: the root has no turn.json, and W3's arm check runs first. replace and stop tests catch both, so this is not breaking.
Item 2 (guard-hook FX-W3 hook, run outside .claude): all seven mutations caught.
Item 3, rest: C1, C1b, C2 and C3 caught. The `!hasReason(j, ...)` checks are dead because `j` has no `.reasons` (C5 survives them). Probe P1: if the watcher's intake has rebuilt status.json, K from status.json after a 75 gets `acked-ahead`, nothing acknowledged, arm spent (safe).
Item 4 (dead-man todo): guards nothing until W4 lands; u/W4 has no commits yet; its names fit FX-W4's design.
Both wording changes (spec/lib.md:402, CONTRACT.md:1337) agree with the code.
Verdict: C:/Users/User/Documents/projects/harness-engineering/research-tree/build/refute/S2.1.md; scratch checkout removed; tokens 8.55 M (limit 15.6 M).

### B (later helper, started 2026-11-20T01:00)
**Brief B:**
You are the fix-round helper of unit S2.1 (the tests that cross fixes) in the build of task r57-0507. Kind build, model Sonnet. MAIN = `C:/Users/User/Documents/projects/harness-engineering`. Rules: `MAIN/CLAUDE.md`; `MAIN/research-tree/build/briefs/B1-4.md` part "S2.1" and what it points into. Do not edit `.claude/hooks/*`, `tools/check-commit.mjs`, `docs/program/evidence/`, `recovered/`.

S2.1's blind review is BREAKING: `MAIN/research-tree/build/refute/S2.1.md` (read it whole; it gives the suggested test). The "S2.1 N2 after handover exit 2" test in `tcb/test/status.test.mjs` exits 2 at checkCe's `no-coordinator` (coord.json deleted), not at `handover raise`'s real exit 2 (proc-unavailable); mutation C4 (raise writes coord.json at ce+1 before its exit 2) survives everything. Work on `u/S2.1` in `MAIN/.claude/worktrees/S2.1`:
1. Replace that test with the verdict's suggested test, which runs raise's real exit 2 and checks nothing was written; show C4 caught in a scratch copy, then restore it.
2. Make the dead `!hasReason(j, ...)` checks real (C5) or remove them.
3. Change only test files. Run `tcb/test/status.test.mjs` and `tcb/test/handover.test.mjs` through the lane from the worktree's `research-tree/`: `node C:/Users/User/Documents/projects/harness-engineering/research-tree/tools/lane.mjs --label S2.1fix-<what> --timeout-s 100 --wait-s 45 -- node --test <files>`.
4. Commit `S2.1: N2 tests run raise's real exit 2` ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; never `--no-verify`.
5. Write `MAIN/research-tree/build/units/S2.1/fix.md` last: commit, changes, counts and lane labels, the C4 result, tokens.

Scratch scripts under `C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/8a7db643-dc9c-42d9-8dea-e9f99c2d3b69/scratchpad/S2.1-fix/`. To [...cut]

**Report B:**
DONE c970fc03 on u/S2.1 (test file only: tcb/test/status.test.mjs).
- The N2 exit-2 test now runs a real `handover raise` (drain line, proc_exe unavailable): exit 2 proc-unavailable, tree unchanged. Then endturn: K acked, arm spent, sources unknown (exit 2).
- C4 (raise writes coord.json at ce+1 before its exit 2), in a scratch copy: new test FAILS, so it is caught. The worktree was never mutated. Lane: S2.1fix-c4.
- C5: the dead `!hasReason(j, ...)` checks are now live (`j.json`) in the exit-75 test; the old test's dead ones went with it.
- Lane S2.1fix-both (status + handover): 68 tests, 62 pass, 0 fail, 5 skipped, 1 todo (W4 dead-man). S2.1fix-n2b: S2.1 3 pass, 1 todo.
- Report: MAIN/research-tree/build/units/S2.1/fix.md. Tokens 1.12 M (limit 4 M).

---

## P52

### A (earlier helper, ended 2026-11-23T15:02)
**Brief A:**
Read and follow exactly the brief in RUN:fields/8-measurement/briefs/gate.md (RUN: = C:/research-runs/2026-11-harness-leads/)

**Report A:**
Gate done: C:/research-runs/2026-11-harness-leads/fields/8-measurement/gate.md (done marker: fields/8-measurement/done/gate.done).
Counts: LOCATED 112, MOVED 0, ALTERED 0, DEAD_CITATION 0, NOT_CHECKABLE 15 (C113-C127, all hypotheses with no quote). All 184 quoted parts were found at the cited line plus or minus 3.
ALTERED or DEAD_CITATION ids: none.
I checked the quotes with a script, fields/8-measurement/work/gate.cjs, and wrote no git command.

### B (later helper, started 2026-11-23T15:06)
**Brief B:**
Read and follow exactly the brief in RUN:fields/8-measurement/briefs/extractor-prior.md (RUN: = C:/research-runs/2026-11-harness-leads/)

**Report B:**
Output: C:/research-runs/2026-11-harness-leads/journal/2026-11-23/x80.jsonl (committed cebaddb). Records: 3 facts, all status observed (x80-0100 embeddings test, x80-0101 token counting, x80-0102 token bottleneck on two repositories). Each JSON line parses. Done marker written (fields/8-measurement/done/extract-prior.done, "records 3", committed d84f843).
Skipped: none. Topic prior has no paper, so no results were extracted, and the input's F4-F9 items carry existing record ids or are not marked new. No reasoned lines extracted.

---

## P55

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

### B (later helper, started 2026-11-17T22:00)
**Brief B:**
You extract records for a knowledge library. REPO = C:/Users/User/Documents/projects/harness-engineering. Use only Read and Write tools (Bash only to count lines if needed). Write only under REPO/library/.

Your file: REPO/docs/program/evidence/harness-method-status-2026-11-18/harness-v2-status.md
Your prefix: x09

Job:
1. Read REPO/library/README.md, only the sections "A record" and "A new writer" (and the id ranges line under it). Nothing else in the library.
2. Read your one file (whole).
3. Write REPO/library/journal/2026-11-18/x09.jsonl: one JSON object per line, one record for each fact, status, published result or hypothesis the file states. Field order: id, kind, status, claim, when, quote, evidence, see, note, handles, footprint, supersedes, date, by; leave out empty fields. Always set "date":"2026-11-18" and "by":"x09".
 - id: x09-NNNN with four digits in the range for the kind (fact 0100-0199, status 0200-0299, result 0300-0399, hypothesis 0400-0499, open 0500-0599, mistake 0600-0699, pointer 0700-0799). Number consecutively within each range, no duplicates.
 - kind: fact (measured/observed here), status (how far a method was ever tested), result (a published result by others, with the author/source named in the claim), hypothesis (a design or guess not yet tested). Never use kind ruling or adjudication.
 - status: what the file itself says about how the thing is known: measured, observed, quoted, summary, textbook, reasoned, designed-only. Where the file does not say, use reasoned and add a "note" saying the file does not state it.
 - claim: ONE sentence, as short as it can be, carrying its number, unit and condition, and any caveat the file gives beside it. It must be understandable alone (name the method, paper, tool). Copy numbers exactly.
 - evidence: a  [...cut]

**Report B:**
128
