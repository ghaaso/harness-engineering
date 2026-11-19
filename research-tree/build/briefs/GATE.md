# GATE: a hook that holds the build to its orchestration document (2026-11-19)

Kind build-invariant, Opus. Asked by the top session: the owner's words of 2026-11-19, "make sure the
orchestration document is being followed properly". Commit nothing.

**What exists.** The tier hook (`.claude/hooks/tier-hook.mjs`, routes in `tier-routes.json`) refuses a helper
whose description does not start with a kind and a colon, or whose model the route for that kind does not allow.
It cannot see a job given the wrong kind (r57-0120). The build's plan is `research-tree/ORCHESTRATION.md`
(sections 2, 3, 6 and 9) with `research-tree/BUILD-PLAN.md` section 2 (units, dependencies).

**The mechanism (borrowed whole).** Admission control with precedence and a counting semaphore: a workflow engine
starts a task only when the tasks it depends on are done and a slot is free. The lane is already the semaphore for
test commands (`research-tree/tools/lane.mjs`); the decision rule's gates are b1-0401 to b1-0423
(`bash library/lookup.sh -f b1-0401`). What fails for model sessions: a unit's end is a helper's end, seen by
a hook, and a helper that returns LIMIT ends without its unit being done, so a successor for the same unit is
allowed once the first one has ended.

**Build:**
1. `research-tree/build/plan.json`, from those sections: every unit the build root starts (ids as in
   ORCHESTRATION.md section 2, at most 7 characters), its batch, kind, model, the units it depends on, how "done" is
   shown (a reading or running unit: its fact file exists; a build unit: `git merge-base --is-ancestor
   refs/heads/u/<id> refs/heads/build` succeeds in the main checkout; a refuter: its unit's builder result
   exists), expected and limit tokens; every batch's width; refuters as entries of their own. P0, GATE and this
   check are not in it.
2. `.claude/hooks/plan-gate.mjs`, a PreToolUse hook on the Agent tool, active only while `plan.json` exists, for
   a description of the form `<kind>: <unit id> ...` naming a planned unit. It refuses (exit 2, one line
   saying why and what the plan says) when: the kind or model differs from the unit's row; a unit it depends on
   is not done; a helper for the same unit and role is still running; the batch would run more build units than
   its width. A description naming no planned unit is left to the tier hook. Choose and justify how it fails if
   `plan.json` exists but cannot be read: fail closed for the build's own calls, never block a session doing
   unrelated work.
3. "Running" counted from the gate's own log (`.claude/logs/plan-gate.jsonl`): a start when the Agent call has
   returned (its agent id), an end from a SubagentStop hook. Check live, once, which input fields these hooks get
   and that SubagentStop fires for a background helper in this app (one Haiku helper, kind `test`, description
   naming no planned unit). If it does not fire, keep checks 1-2 and say so.
4. Tests in a new `.claude/hooks/plan-gate.test.mjs`: a failing case for each refusal and a passing case for each
   allowed start; all pass. Another helper (P0) is editing `record-guard.mjs`, `selftest.mjs`,
   `tools/check-commit.mjs`, `tools/git-hooks/pre-commit` and `research-tree/tools/lane.mjs` now: do not touch them.
5. Only after the tests pass, register the hooks in `.claude/settings.json` (its `hooks` section only; leave the
   `env`, `skillOverrides` and `permissions` sections as they are).
6. A short section for the build root, `research-tree/build/briefs/GATE-USE.md`: the description form, what it
   refuses, how the root changes a batch's width (only with a line in `research-tree/build/STATE.md` naming the
   measurement, r57-0002).

**Rules.** Hooks run for every session on this PC: never leave a broken hook registered. Every Bash call under
150 s. **Done** = `research-tree/build/units/GATE/result.md`: files, each check and its test, pass, fail or
not-run, the live hook check, departures, your tokens. **Tokens (r57-0038):** expected 11.7 M, limit 29.2 M;
read your own count from your transcript (ORCHESTRATION.md section 3); at about 330 K context or the limit write
`research-tree/build/units/GATE/checkpoint.md` and return "LIMIT". Return at most 10 lines.
