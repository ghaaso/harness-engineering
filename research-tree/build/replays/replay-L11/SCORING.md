# SCORING: replay-L11 (written 2026-11-23 before any count)

Question (TOP7-REPLAYS row): of helper and session reports that say "done" (or passed, fixed, verified), what share did a
later executed check, gate or refuter verdict contradict? Would "accept done only against an executed check" have caught
them, and how often would it have held a true "done"? Sink S4.

## Records in
- Helper transcripts (`<session>/subagents/**/*.jsonl`, with `.meta.json` description) and their parent session
  transcripts under `C:/Users/User/.claude/projects/`, grouped by project:
  - H = this repository (`...-harness-engineering*`), RUN = the research run (`C--research-runs-2026-11-harness-leads`),
    FF = the FixFlow product (`...-EMS-workshop1*`, `...-23-FixFlow`), CL = the clinic (`...-24-Clinic-Workshop*`).
- Unit reports of the research-tree build (`H:research-tree/build/units/*/result.md`) against its refuter verdicts
  (`H:research-tree/build/refute/*.md`, verdict on line 1) and landing checks (`landings.jsonl`). These are the
  "session reports" side: a child session's unit DONE judged by a blind refuter that ran mutations.
## Records out
- Other projects on the PC (personal, coursework, scratch workspaces, Codex outputs, hook probes): not the harness's work.
- Helpers whose transcript has no final assistant text, and helpers of this replay's own top session 7 (dated 2026-11-23).

## Unit of count
One claim = the final assistant text of one helper (or one unit's result.md). It is a DONE claim if it matches, in its
first 400 characters or as a line, any of: `DONE`, `done`, `complete(d)`, `pass(ed|es)`, `fixed`, `verified`, `green`,
`all .* pass`, `0 fail`, `landed`, `built`; and it does NOT lead with `LIMIT`, `BLOCKED`, `FAIL`, `could not`,
`cannot`, `unable`. Others are counted as non-DONE and kept apart.

## Kinds (from the helper's own transcript)
- code helper: made at least one Edit/Write/NotebookEdit to a non-`.md` file;
- report helper: everything else (reads, analyses, refutes, notes).
- backed: the helper ran an executed check (Bash/PowerShell command matching test/check/gate/tsc/lint/vitest/jest/
  pytest/`node --test`/`npm (run )?test`/playwright/land/check.mjs) AFTER its last edit, and that run's result was not an
  error. Unbacked: no such run.

## Later verdict (in the parent session, after the helper's result arrives, until the parent's end)
- contradicted (hit for "contradiction"): a later helper launched by the same parent whose description or prompt names
  the claim's helper (shared description words of 2+ distinctive tokens, its output path, or the unit id) AND whose final
  text gives a failing verdict (`FAIL`, `does not hold`, `refuted`, `overstat`, `wrong`, `not done`, `P1`, `survives`,
  `broken`, `missing`, `regress`); or a refuter file whose line 1 is FAIL for that unit; or a parent executed check run in
  the same task within 20 parent tool calls that fails, followed by a re-brief or fix of the same task.
- confirmed: a later linked verdict that passes (PASS, holds, caught all, check green) and none failing.
- unverified: no linked later verdict.
- Every script-flagged "contradicted" and "confirmed" pair is read by me (or an `analyse:` helper) from excerpts to keep
  only those where the later verdict is about the same claim. A random sample of 30 "unverified" DONE claims is read to
  estimate contradictions the linker missed. The reading is recorded per claim in `judged.jsonl`.

## The rule's replay
- caught: a contradicted claim that was unbacked (the rule would have held it for an executed check). Split: caught-by-
  check (the contradiction itself came from an executed check or a mutation run, so the held check would show it) and
  held-only (the contradiction came from a reading; a check would have been demanded, its result unknown).
- missed: a contradicted claim that was backed (it already rested on a passing executed check).
- false hold (the false-alarm side): a confirmed (true) DONE that was unbacked; the rule would have held a true done for
  one check run. Reported on confirmed claims (like with like) and, as an upper bound, on all uncontradicted claims.
  For report helpers no executable check exists for most claims: the rule cannot be met; counted separately as "no check
  possible", not as a catch.

## Figures reported
- contradiction share = contradicted / DONE claims with a later linked verdict (and / all DONE claims), by project.
- catch share = caught / contradicted; caught-by-check / contradicted.
- false-hold share = unbacked confirmed / confirmed; holds per catch.
- spread by project (H, RUN, FF, CL) and by kind (code, report); denominators always.

## "Do not pilot" if any of
1. contradicted < 5 % of DONE claims that had a later linked verdict (the sink is small here);
2. fewer than a third of contradicted code claims were unbacked (our dones already rest on checks and were still wrong:
   the rule adds nothing; the lead to test is then L6 or L8);
3. false holds exceed 3 per catch on code helpers and caught-by-check is under 5 claims in all (cost with no gain).
Otherwise: pilot the rule on code helpers only, sized from these counts.

## Departures after the first counts (the lines above are kept as written)
- Linking by shared description words over-linked: reviews of other slices share 'Opus', 'refute-review' and 'screens'.
  Verdicts are linked instead by the target the review names (slice, unit, PR, head), read from each review's head.
- The clinic's done claims are made by child sessions, so there the unit is the gate review, counted per review.
- The 30-claim sample of unlinked DONE claims was not read, for lack of budget (see RESULT.md "What was not tested").
