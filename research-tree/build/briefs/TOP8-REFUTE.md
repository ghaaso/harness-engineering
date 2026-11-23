# T8-REFUTE: one blind review of the enforcement built on 2026-11-24 (refute, Opus)

Read `briefs/TOP8-COMMON.md` (its rules apply; you change no code at all) and CLAUDE.md.

## What to attack
The hooks and tools built today, now live in this repository's sessions (`.claude/settings.json`,
`library/.claude/settings.json`):
- `.claude/hooks/window-ceiling.mjs` (requirement: `briefs/TOP8-CEIL.md`)
- `.claude/hooks/count-gate.mjs` and `research-tree/build/WIDTHS.md` (`briefs/TOP8-COUNT.md`)
- `tools/journal.mjs`, `tools/journal-rules.mjs`, `.claude/hooks/record-guard.mjs`, `.claude/hooks/journal-watch.mjs`,
  `tools/check-commit.mjs` (`briefs/TOP8-JOURNAL.md`)
- `.claude/hooks/fanout-gate.mjs` (`briefs/TOP8-BASIS.md`)
- `.claude/hooks/owner-report.mjs` (`briefs/TOP8-REPORT.md`)
Each has a `*.test.mjs` beside it (the guard's is `selftest.mjs`). Judge the code against its brief and against the
rule it enforces. Do not read `research-tree/build/units/*/result.md` or `TOP8-STATE.md` before you have your
findings: form them from the code, the briefs and the record.

## What counts as breaking
1. A hook that blocks legitimate work it should pass, with no way out: above all a session that can no longer hand
   over or end cleanly, a helper that can no longer finish, the owner unable to work in his own sessions, an endless
   refusal loop.
2. A hook that lets through the very break it was built for (the five of 2026-11-23 in `briefs/TOP8-ENFORCEMENT.md`).
3. A crash or a slow path that refuses or stalls every call (time each hook on a large real transcript; hooks run on
   every call: about 37 ms a start is the measured floor, r57-0106).
4. Hooks that contradict each other (for example the ceiling's hand-over exceptions against the guard, the fan-out
   gate or the report check).
5. A number not computed from a recorded measurement.
Anything else is non-breaking: list it short.

You may run the self-tests and feed the hooks crafted JSON on stdin with logs sent elsewhere (check each hook for its
log override in its test file). Do not trigger refusals in this repository's real journal or logs.

## Return
Write `research-tree/build/refute/TOP8.md`: breaking findings first, each with the file and line, a reproduction
(the exact stdin or command), and the smallest fix; then non-breaking, one line each. Return under 25 lines.
token limit 14 M (expected about 10.6 M, basis r57-0173)
