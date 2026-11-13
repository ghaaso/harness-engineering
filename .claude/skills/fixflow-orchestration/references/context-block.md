<!-- Verbatim from FixFlow (PR #182 @ 3415b5e) docs/ORCHESTRATION-DESIGN-2026-10.md lines 363-386, §5.1 (project doc, no SPDX licence), copied with sed on 2026-11-04; the "Which lines are args, not constants" section after the block is authored for FixFlow, 2026-11-04 -->

### 5.1 The CONTEXT block (prepended verbatim to every subagent prompt)

```
PROJECT CONTEXT (established by the orchestrator; do not re-derive):
- Repo C:\Users\User\Documents\projects\EMS_workshop1 (Windows). CLAUDE.md is already injected; trust it.
- Program goals: field-reliable geofencing + location tracking + offline sync; a manager-approved
  "pakka khata" flowing to Odoo while the app stays the operational "kacha khata"; no security
  holes; acceptable latency; near-future self-hosting on a home server the owner controls.
- Today is <args.today>. Last commit on main: a31924a (2026-08-03). 10 commits since the handoff 906b990.
- PRODUCTION: both documented Railway URLs return Railway's edge 404 "Application not found".
  The phones classify that 404 as definitive and drop/park queued data. Treat prod as gone unless
  args.recoveryCase says otherwise. The field APK is older than main (args.apkCommit if known).
- Fleet: Xiaomi/Oppo/Vivo-class Android. attendance_event had 9 rows lifetime when last measured.
  The migration seed is an inactive (0,0) placeholder fence; the live fence row is DB-only.
- Settled facts you take as given (do not re-investigate): see args.settled (the §2.1 SETTLED rows).
- Prior registers to cite, not re-summarise: docs/HANDOFF-2026-07-28-open-work.md,
  docs/lifecycle-audit-followups-2026-07.md, docs/adr/0001-database-region-topology.md,
  docs/requirements-2026-07-gap-analysis.md (R2 Odoo), docs/BACKEND-REQUIREMENTS-2026-07.md §3.15.
RULES: read-only unless your brief says "runs commands". Cite every claim as "path:line — quote".
Mark each fact VERIFIED-IN-CODE / VERIFIED-BY-COMMAND / WEB (URL fetched in this run) / INFERRED.
Return constants, lines and declared names; never a severity or a verdict unless your schema has
that field. Fewer well-evidenced items beat many speculative ones. Your final output is consumed by
a program: return the structured object only.
```

## Which lines are args, not constants (authored 2026-11-04)

The block above is the design's text as written on 2026-10-31. Several of its lines are
**point-in-time literals**; a script must supply them from `args` (stamped by the main session
when it writes the run's args), never paste the 2026-10-31 values as if they were still true.

| Block line (design line) | Literal in the source | Supply as | Why |
| --- | --- | --- | --- |
| `- Repo C:\Users\...\EMS_workshop1` (367) | the main checkout | `args.repo` — the worktree path when agents run in one | handoff §2.5 (`docs/HANDOFF-2026-07-28-open-work.md:140`): more than one agent active means a `git worktree` |
| `Today is <args.today>.` (371) | already a placeholder | `args.today`, an absolute date (2026-11-04) | scripts cannot call `Date.now()` (design line 201) |
| `Last commit on main: a31924a (2026-08-03). 10 commits since the handoff 906b990.` (371) | **dated literal** | `args.mainHead` (sha + date) and `args.commitsSinceHandoff` | true on branch `claude/wizardly-hertz-02c46a` on 2026-11-04; `main` moves as phases merge |
| `PRODUCTION: ... edge 404 ...` (372-374) | 2026-10-31 observation | `args.recoveryCase` (a / b / c / unknown) and a dated production line | CLAUDE.md and the handoff state table are "point-in-time — re-verify against prod" |
| `args.apkCommit if known` (374) | placeholder | `args.apkCommit`, or the literal `unknown` | G2 §2 labels `apk` "unknown" everywhere (`docs/program/G2-deep-dive-gate-2026-11-01.md:100`) |
| `attendance_event had 9 rows lifetime when last measured.` (375) | dated measurement | keep, with its date, or replace from a restored dump's exact `count(*)` | design §8 line 616-617: completeness is exact `count(*)`, never `pg_stat` |
| `see args.settled (the §2.1 SETTLED rows)` (377) | placeholder | `args.settled` — after G2, the G2 §2 register rows the brief depends on | design §5.3 (d): settled facts may be challenged in `challenges_settled` |

Everything from `RULES:` to the end of the block is a constant and is prepended unchanged.
A brief then adds, in one paragraph: the goal, the files, the register ids or hypotheses it
bears on, what is settled, and what "done" returns (design §5.3, line 528-530).
