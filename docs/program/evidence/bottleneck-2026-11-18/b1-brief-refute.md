# Brief b1/refute (Opus, kind refute): refute the claims in a fresh context

Repo root: C:\Users\User\Documents\projects\harness-engineering. F = docs/program/evidence/bottleneck-2026-11-18/.
Write only F/b1-refute.md. Read F/b1-claims.md and the repository files and records it cites, plus any code you need.
Do not read F/BUILD-IN.md, F/b1-map-*.md, F/b1-gate.md or F/b1-state.md. Run no script, test or hook.
For each C claim and each D choice, try to refute it: is it true of the code; does the record say it; does the
choice follow from the records it names; is there a simpler or stronger mechanism; what failure mode breaks it
(a race between two starts, a crash holding a slot, a session that forgets an instruction, a hook that does not
fire in another folder, a number used before it is measured). One line per item in F/b1-refute.md:
id | confirmed / holds in part / refuted / cannot be checked | reason with path:line or record id.
Then at most 10 lines on the design's weakest points. Final reply: counts per verdict, nothing else.
