# Glossary: words the records use
`E:` = docs/program/evidence/harness-method-status-2026-11-18/ (the evidence folder of 2026-11-18).
**R57** has three meanings. A rule: R57 of research-tree's protocol, "A protocol model": a model check of the tree's scripts as built, where a counterexample blocks the change (protocol lines 529 to 536). A round of work: the R57 round of 2026-11-17, which modelled the scripts, found faults, designed 13 fixes and changed no script. A prefix: `r57-` on record ids, the session that ran that round and wrote version 0 of this library.
**the tree** = the research tree: a coordinator session that starts child sessions, each with helpers, kept going by scripts. Designed in the v2 protocol, scripts built, never run.
**tcb** = the tree's trusted base, research-tree/tcb/: small Node scripts that do what a model session cannot be trusted to do (fences, claims, commits, watching).
**0b** = strict hook write: exclusive create with no fallback write; the shared primitive built first, three fixes need it.
**FX-OUT** = outcome log: a child's finished result is logged first, so a fence cannot throw it away.
**FX-CLAIM** = one claim per attempt: stops two sessions being started for one attempt.
**FX-CGATE** = coordinator hook: a stale coordinator cannot start a session.
**FX-CLOSE** = release a finished child: its slot is freed after the close is verified.
**FX-REDO** = a repeated call after a death fills the missing ledger line.
**FX-PLAN** = planner expectations: one function decides the next legal act from files, so no double start or bind loop.
**FX-W1** = tri-state liveness check, exit markers, flag allow-list: one process-list outage no longer causes a wake loop.
**FX-W2** = arm the alarm first, confirm by a live slot: closes the gap where nothing wakes the tree.
**FX-W3** = work needs a live confirmed arm: no act without a wake source.
**FX-W4** = dead-man check: a read-only mode that alerts the owner when the tree is silent.
**FX-W5** = re-raise act-due: a hang raised once and ignored is raised again.
**FX-W6** = per-kind deadlines: a healthy slow call (about ten minutes) is not taken for a hang.
**FX-W7** = watcher lock under the run lock: no two writers of watcher state, no restart loop.
(The FX lines are from research-tree/FAULTS-AND-FIXES.md and BUILD-SIZE.md section 1a; 13 fixes plus 0b make the 14 units.)
**lane** = two things. research-tree/tools/lane.mjs: the one-at-a-time queue every heavy command goes through. In the v2 design: a session working one slice beside others.
**skeleton** = one small first change that fixes the interfaces and turns each ordered sequence into empty steps, one per fix, so several fixes can be written at once (r57-0401, untested).
**the check** = the run each change must pass (the test suite, 596 s, and review); serial. Not the plan check (a design-only script that refuses a plan with no footprints or two writers of one file).
**decision rule** = a rule that finds the limiting resource now and routes to the method that fits it (r57-0015); to be written (r57-0503).
**decision sheet** = the page "R57 Decision Sheet" that asked the owner 29 questions; he rejected it; never use it (r57-0704).
**tier hook** = the PreToolUse hook that refuses a helper or child session on the wrong model for its kind of job (r57-0120).
**top session** = the session the owner talks to; a **child session** was started by another session from a brief. If unsure, you are a child.
