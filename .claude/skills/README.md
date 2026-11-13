# Project skills and agents — index and conventions

**What this is.** The skills the ship program's design doc asked the owner to source
(`docs/ORCHESTRATION-DESIGN-2026-10.md` §9), fetched and adapted on 2026-11-03, plus the
project-authored ones. Wiring rule (design §9): a sourced skill is distilled into a project
agent definition in `.claude/agents/<name>.md` (system prompt + tool list + pinned model) and
workflows/sessions call it via `agentType` / `subagent_type`; skills the main session loads
itself live here in `.claude/skills/<name>/`.

**Status words:** _sourced_ (adapted from an upstream repo), _authored_ (written here),
_researched_ (written here from fetched web sources).

## Index

<!-- INDEX:BEGIN -->

| Skill | Status | Purpose | Register ids | Plan phases | Agent definition |
| --- | --- | --- | --- | --- | --- |
| [`android-background-execution`](android-background-execution/SKILL.md) | sourced | Android 12–15 background execution for the three location tasks: expo-location 18.0.10 / expo-task-manager 12.0.6 / expo-modules-core 2.2.3 headless internals, FGS and geofencing rules, fleet-OEM settings paths and autostart intents | S-01a, S-01b, R-01, O-01 (O01-F01..F20) | P5-spike, P5a, P5b-1, P5b-2, P5c, P5d-1b, P5d-2 | [`fixflow-android-background-analyst`](../agents/fixflow-android-background-analyst.md) |
| [`android-field-debugging`](android-field-debugging/SKILL.md) | sourced | Read-only adb / dumpsys / logcat evidence capture on technician phones: the O-01 field protocol, installed-version checks, bug reports, the geofence evidence chain | O-01 (O01-F01..F20), O-10 | P2c, P4a, P4b, P4r, P5c, P5d-1a, P5d-1b, P5d-2 | [`fixflow-device-debugger`](../agents/fixflow-device-debugger.md) |
| [`supabase-railway-r2-recovery`](supabase-railway-r2-recovery/SKILL.md) | sourced | Recovery runbook for the dead production stack: R2 dump inventory, the paused Supabase project's restore policy, Railway edge-404 diagnosis, Postgres 17 restore with count and sequence checks | W0, O-08 (O08-F02, F05–F07, F12, F14), O10-F3, O10-F4 | P0a, P3a, P3b, P3c, P9-0a, P13b, P13e | [`fixflow-recovery-operator`](../agents/fixflow-recovery-operator.md) |
| [`odoo-accounting-import`](odoo-accounting-import/SKILL.md) | sourced | Getting approved money postings into Odoo exactly once: JSON-2 vs deprecated RPC by version, Online plan gates, External IDs as the idempotency key, accounting prerequisites, repeat-import safeguards | R-02, O-07 (O07-F1..F17) | P9-0a, P9-0b, P9a-1, P9a-2, P9b, P10a, P10b, P11 | [`fixflow-odoo-analyst`](../agents/fixflow-odoo-analyst.md) |
| [`offline-sync-review`](offline-sync-review/SKILL.md) | sourced | Refute-by-default review of the hand-rolled offline engine against the outbox contract; records where TanStack's terminal-error deletion disagrees | O-03 (O3-F1..F22), O-10 (O10-F1..F4) | P2a, P2b-1, P2b-2, P4a, P4b, P4r | [`fixflow-offline-sync-reviewer`](../agents/fixflow-offline-sync-reviewer.md) |
| [`fastapi-alembic-safety`](fastapi-alembic-safety/SKILL.md) | sourced | PostgreSQL migration safety for the FastAPI backend: NOT VALID then VALIDATE, single-transaction boot, lock behaviour, never downgrade or rollback, asyncpg pooling, restore-and-verify tests | O-04 (O04-F1..F18), O-06 money items, O-07 (O07-F5..F17), O10-F7 | P1, P6a, P6b-1, P6b-2, P7a, P8a, P8b, P9a-1, P13a, P13d | [`fixflow-migration-reviewer`](../agents/fixflow-migration-reviewer.md) |
| [`appsec-review-asvs`](appsec-review-asvs/SKILL.md) | sourced | ASVS 5.0 / MASVS 2.1 security review with FixFlow's concrete PIN, lock, token_version, per-replica rate-limit, webhook, signed-URL, ops-proxy and Node checks | O-05 (O05-01..18), O-06 (O6-F01..F19) | P1, P7a, P7b-1, P7b-2, P13b | [`fixflow-appsec-reviewer`](../agents/fixflow-appsec-reviewer.md) |
| [`selfhost-homelab-ops`](selfhost-homelab-ops/SKILL.md) | sourced | Self-hosting on the owner's box: compose, cloudflared with the 503 catch-all, Caddy, Postgres 17 restore verification, monitoring, UPS; owner step tables for P0b, P3b, P3c and P13 | R-03, O-08 (O08-F02, F03, F12), O6-F06, O10-F3, O10-F4, O10-F8, S-09 | P0b, P3a, P3b, P3c, P13a, P13b, P13c, P13e | [`fixflow-selfhost-architect`](../agents/fixflow-selfhost-architect.md) |
| [`eas-expo-release`](eas-expo-release/SKILL.md) | sourced | EAS builds of the fleet APK under the rulings (no expo-updates, never prebuild, SDK 52, same signing certificate, install-over only): keystore custody, API URL proof, installed-build receipt | O-10 (O10-F11, F12, F15), O-08 (O08-F05, F14), O-01, rulings R7 / HR-A1b / HR-A2 | P0a, P2b-1, P2c, P5a, P5b-1, P5b-2, P5c, P5d-1a, P14-n, P14-fleet | [`fixflow-eas-release-operator`](../agents/fixflow-eas-release-operator.md) |
| [`maestro-device-e2e`](maestro-device-e2e/SKILL.md) | sourced | Maestro foreground smoke flows (carry-in, offline intake, arrival pair, drain report, read-only) for one named spare or pilot phone, with owner stops | O-01, O-03, O-10 | P2c, P4a, P5c, P5d-1b | [`fixflow-device-smoke-runner`](../agents/fixflow-device-smoke-runner.md) |
| [`pakistan-accounting-context`](pakistan-accounting-context/SKILL.md) | researched | Pakistan books and tax context for the export: kacha vs pakka khata, the SRB services vs FBR goods split, ITO s.174 / STA s.22 / SST s.26 records and retention; every fact with its URL and fetch date | O-07 (O07-F1..F17) | P9-0b, P9a-1, P9b, P10a | preloaded by `fixflow-odoo-analyst` |
| [`fixflow-orchestration`](fixflow-orchestration/SKILL.md) | authored | The main session's orchestration contract: tier routing, the fixflow-* agentType registry, the CONTEXT block, the §5.2 output schemas, briefing and reading rules, the plan's §0 session rules | every W1 probe and W2 analyst id | every phase; any Workflow script or gate | none (main session loads it) |
| [`fixflow-repo-conventions`](fixflow-repo-conventions/SKILL.md) | authored | Repo conventions for implementers and the Opus PR reviewer: deploy traps and the drain image, migration numbering, slice boundaries, PR and commit rules, local gates | any id a PR brief names (G2 §2) | every code phase (P1 … P14-n) | [`fixflow-pr-reviewer`](../agents/fixflow-pr-reviewer.md) |

Packages fetched and adapted on 2026-11-04 (upstream commit SHAs and licences in each `UPSTREAM.md`).
<!-- INDEX:END -->

## Read this first: these files are dated

Written against `main` @ `a31924a` on 2026-11-04 and merged into `main` on 2026-11-13, after P1,
P2a, P3a, P6a, P7a, P9-0a, P12a and L2 had merged. Statements that those merges made false were
corrected at the merge (each correction names the PR that changed the fact). Everything else is as
written:

- Every FixFlow `path:line` citation refers to `a31924a`. About six in ten still point at the
  same text, three in ten at text that has moved, and the rest at text that changed (measured at
  the merge). Resolve a citation with `git show a31924a:<path>`, or find the symbol on the current
  head. Never cite one of these lines as current without re-reading it.
- A sentence in the present tense about the code is a statement about `a31924a` unless it names
  a later PR. `CLAUDE.md` wins wherever the two disagree.
- `docs/program/...` and `docs/ORCHESTRATION-DESIGN-2026-10.md` are not on `main`: they live on
  branch `docs/orchestration-design-2026-10` (PR #182), and their line numbers refer to the head
  the citing file names (`3415b5e` unless it says otherwise).
- Paths under `C:/Users/User/.fixflow-cache/` exist only on the owner's PC.
- Every agent definition grants Bash. "Read-only" is a rule in the definition's own text and in
  the session's permission settings; the tool list does not enforce it.

## Conventions every package follows

### Layout

```
.claude/skills/<name>/
  SKILL.md              the skill. Frontmatter: `name` (= the folder name, lowercase, hyphens)
                        and `description` (the trigger: what it is for, when to use it, when
                        NOT to; ≤ 1024 chars). Body ≤ ~400 lines: FixFlow facts first, then
                        procedure, checks, forbidden actions, and a references list.
  UPSTREAM.md           provenance (sourced/researched packages): repo URL, commit SHA, the
                        exact paths taken, SPDX licence, date fetched, "Taken", "Changed",
                        "Rejected (with reason)". A web-researched package lists every URL
                        fetched with the date.
  LICENSE-<upstream>    the upstream licence text verbatim (one file per upstream).
  references/           upstream reference files (verbatim or trimmed — say which, in a
                        one-line header) and FixFlow-specific references authored here.
.claude/agents/<name>.md
                        the distilled agent definition (see "Agent definitions" below).
```

### Content rules

1. **FixFlow facts over generic advice.** A section that could apply to any project is
   compressed to the rule and its reason; the words go to what is specific here: the file, the
   constant, the phase, the register id. Every FixFlow-specific claim is cited `path:line`
   (verify the line exists at write time). Every upstream claim keeps the upstream's own
   "verified against version X on date" note where it had one. A web fact carries the URL
   fetched and the fetch date.
2. **Never contradict `CLAUDE.md` or the plan's standing rules** (`docs/program/SHIP-PLAN-2026-11.md`
   §0). Where the upstream says otherwise, the skill says so in a "Where upstream disagrees"
   block with the reason, and `UPSTREAM.md` records it under "Rejected". The ones most likely
   to collide: the outbox never deletes a write; money is integer minor units; never
   `alembic downgrade`, never the Railway rollback button; FKs/CHECKs on populated tables ship
   `NOT VALID` then `VALIDATE` in a later deploy; Supabase is a Postgres host only (no RLS,
   GoTrue, PostgREST, Storage); no `expo-updates` (ruling R7); never `expo prebuild` /
   `expo run:android`; no phone gets a new app before its drain; no production action by an
   agent.
3. **No secrets, ever.** `technician-app/eas.json`, `technician-app/app.json` and `.env` files
   carry real values; refer to them by path and key name, never copy a value. A committed
   value is reported as a fingerprint (design §5.2 `SCAN`), never as the value or the line.
4. **Owner-only steps are marked `[owner]`** and an agent's procedure stops there. Nothing in a
   skill instructs an agent to deploy, restore over live data, rotate a key, message a
   customer or technician, or install on a roster phone.
5. **Tier per design §3.** Haiku extracts into a closed schema; Sonnet maps, researches,
   runs gates and tabulates; Opus analyses, refutes and owns invariant-sensitive code; the
   main session briefs, gates and judges. An agent definition pins the tier its role needs
   and says why in one line.
6. **Dates are absolute** (2026-11-03, not "today"). Versions are exact (`expo-location`
   18.0.10, not "18").
7. **Keep it loadable.** A package stays under ~150 KB; large upstream data is vendored only
   where a cited section needs it (the OWASP ASVS/MASVS files are CC-BY-SA 4.0 — vendor only
   the sections the skill cites, with the notice).

### Agent definitions

```markdown
---
name: fixflow-<role>
description: <one paragraph: when to use it (the design-§9 lift list and the plan phases it
  serves), what it returns, what it never does>
tools: Read, Grep, Glob, Bash            # + ToolSearch, WebFetch, WebSearch for researchers
model: haiku | sonnet | opus             # per design §3
skills: [<name>]                         # preloads the skill's full SKILL.md at startup (docs: up to 32)
effort: high                             # only where design §3 pins it (xhigh for the geofence analyst and P0 skeptics)
---
<body = the system prompt>
- Before anything: read `.claude/skills/<name>/SKILL.md` and the references it names (the
  `skills:` field preloads it; the body still says so for a host that does not preload).
- Scope and rules: read-only unless the brief says "runs commands"; cite every claim as
  `path:line — quote`; mark each fact VERIFIED-IN-CODE / VERIFIED-BY-COMMAND / WEB (URL
  fetched in this run) / INFERRED; return constants, lines and names, never a severity or a
  verdict unless the output contract has that field; fewer well-evidenced items beat many.
- Output contract: the design-§5.2 schema that fits (MAP, RESEARCH, FINDINGS, VERDICT,
  COMMANDS) or a named table.
- When blocked: say what blocked you (`DOCKER_ENGINE_DOWN`, `WEB_UNAVAILABLE: <topic>`,
  `DEVICE_NOT_PRESENT`) and return the questions, never a guess.
```

CLAUDE.md loads into a custom subagent by default (never set `omitClaudeMd`), so the design's
"CLAUDE.md is already injected; trust it" holds. Frontmatter fields confirmed against
https://code.claude.com/docs/en/sub-agents.md and /skills.md on 2026-11-03.

The agent never learns which tier it is on (design §5.3); the definition pins the model, the
body states scope and rules.

### Reading a package

Start at `SKILL.md`. It links the references it needs; nothing else in the folder is loaded
unless the body names it. `UPSTREAM.md` is for the maintainer, not the agent.
