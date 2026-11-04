---
name: fixflow-orchestration
description: FixFlow's orchestration contract for the MAIN session (Fable) - tier routing table, the CONTEXT block every subagent prompt starts with, the design-5.2 output schemas (MAP, RESEARCH, FINDINGS, VERDICT, COMMANDS, SCAN...), briefing and reading rules, the W1/W2 script contract (stable labels, slices of five, circuit breaker, tail retries, coverage), harness constraints, the ship plan's section-0 session/resume/routing/gates/merge-is-not-deploy/migration rules, and which fixflow-* agentType exists at which tier. Use it at the start of every ship-plan phase session (P0a..P14-fleet) and before writing any Workflow script, subagent brief, G1/G2-style gate or PR-review brief. Do NOT preload it into a subagent, use it for a phase's content (read that phase's "## P.." section) or implementation conventions (fixflow-repo-conventions), or treat it as authority for any production action - deploys, restores, installs, messages and the dispatcher stay [owner].
---

# FixFlow orchestration (main session only)

Loaded by the main session, which briefs, gates and judges and never implements
(`docs/program/SHIP-PLAN-2026-11.md:55-56`). Subagents gather, analyse and verify; they never
decide, and a Sonnet verdict can narrow an Opus brief but never remove one
(`docs/ORCHESTRATION-DESIGN-2026-10.md:16-19`). Written 2026-11-04 against branch
`claude/wizardly-hertz-02c46a` (HEAD a31924a, 2026-08-03) and PR #182 head 3415b5e.
Citation shorthand: `design:N` = `docs/ORCHESTRATION-DESIGN-2026-10.md:N`, `plan:N` =
`docs/program/SHIP-PLAN-2026-11.md:N` (both on PR #182, see §5).

## 1. FixFlow facts

### 1.1 The sources and their state

- **Design** `docs/ORCHESTRATION-DESIGN-2026-10.md`: title says v2 (line 1), status says v3
  (line 9); 818 lines. §3 tier guide 86-99, §4 orchestration 103-357, §5 contracts 361-545,
  §8 harness 591-628, §9 skills 715-739.
- **Plan** `docs/program/SHIP-PLAN-2026-11.md`: "v8 ... ready for P0a" (lines 1-3); §0 = lines
  24-115 (standing rules 93-115); phase checklist 168-215; rulings R1-R10 at 1455-1498;
  harness rulings HR-* at 1500-1526.
- **Gates and evidence (PR #182):** `docs/program/G1-discovery-gate-2026-11-01.md`,
  `docs/program/G2-deep-dive-gate-2026-11-01.md` (§2 verified register at line 96, §3
  open-risks at 220), raw outputs `docs/program/evidence/w1/<id>.{json,txt}` (run
  `wf_989263ce-0ef`) and `docs/program/evidence/w2/<id>.{json,txt}` (run `wf_5fe2ec50-8de`)
  (`docs/program/evidence/README.md:3-4`); W2 design notes `docs/program/w2/O-0{1,3..8}-design.md`
  and `O-10-design.md`.
- **Register ids** are G2 §2 rows (`O01-F04`, `O3-F2`, `O10-F3`, ...); "R" labels are always
  prefixed - "O-10 R7" (drain rollback rule), "runbook R5", "ruling R5"
  (`docs/program/SHIP-PLAN-2026-11.md:20-22`).
- **On this branch** neither the design nor the plan exists, and `.claude/agents/` held nothing
  before this batch (survey PATH_MISSING, 2026-11-04). The design's "`.claude/agents/` holds
  only `fixflow-explorer.md` today" (`docs/ORCHESTRATION-DESIGN-2026-10.md:626`) is true only
  on PR #182.

### 1.2 Routing table (design §3 + plan §0)

Rule: **raise effort on the current tier before moving up a tier**
(`docs/ORCHESTRATION-DESIGN-2026-10.md:88`). Every subagent pays CLAUDE.md (about 7.5k tokens)
plus the CONTEXT block before working, so tiny tasks are inline commands and claims are batched
per verifier (lines 89-91).

| Tier (effort) | Use for in this repo | Never for | Source |
| --- | --- | --- | --- |
| Haiku (`low` literal dumps, `medium` when names vary) | extraction into a closed schema (`additionalProperties:false`): router tables, settings, mobile constants, audit/scan output; each prompt under ~100k input tokens, split large dumps | any inference; anything cross-file | design:95 |
| Sonnet (`medium`; `high` cross-referencing) | maps, native-source question lists, web-research collection with fetched URLs, running gates and reporting, diff-restricted register reconciliation, citation checks, well-specified screens/read models/infra/docs/tests | adversarial verification of a critical claim; security sign-off; outbox, lifecycle, ledger, migrations | design:96, plan:49-50 |
| Opus (`high`; `xhigh` for the geofence analyst and P0 skeptics) | deep subsystem analysis, adversarial security review, Odoo idempotency design, fresh-context default-refute verification, design critique; owns outbox contract, drain tooling and matching rules, job lifecycle, ledger/chain and all posting/money code, auth/PIN/JWT, migrations, native patches, location-privacy time bounds | high-volume reading a map can replace; the G2 decisions | design:97, plan:47-50 |
| Fable (main session) | hypotheses, routing, inline pre-flight, gates, adjudication, owner-decision framing, phase design | subagent work; a Fable subagent only when Opus `xhigh` demonstrably cannot settle it | design:98 |
| `fixflow-explorer` (Haiku, PR #182 only) | "where is X?" | reading or auditing; never use the built-in Explore agent, which inherits the session's Opus tier | design:99 |

### 1.3 The agentType registry (what a workflow script may pass)

Wiring: a sourced skill is distilled into `.claude/agents/<name>.md` and workflows call it via
`agentType` (`docs/ORCHESTRATION-DESIGN-2026-10.md:717-720`); pass `agentType` **only for a
definition file that exists** (lines 626-627) - run `ls .claude/agents/` first. The Workflow
`agent()` opts accept `agentType`, which composes with `schema` (workflow-authoring reference,
read 2026-11-04). "Lifts" is the design §9 row for the preloaded skill.
When a task passes `agentType`, omit `model` and `effort` from the `agent()` opts (or set them
to the registry row's values exactly): "opts.model overrides the model for this agent call"
(same reference), so the skeleton's `model: t.model, effort: t.effort`
(`references/w1-script-skeleton.md:31`) would silently re-tier a pinned definition.

| agentType | model / effort | preloads | why this tier | lifts (design §9 line) |
| --- | --- | --- | --- | --- |
| `fixflow-android-background-analyst` | opus / xhigh | android-background-execution | design §3: xhigh for the geofence analyst (O-01 lens) | S-01a/b, O-01, R-01 (724) |
| `fixflow-device-debugger` | sonnet / medium | android-field-debugging | Sonnet runs commands and reports; adb/dumpsys capture is read-only reporting | O-01, fix and device-smoke sessions (725) |
| `fixflow-recovery-operator` | sonnet / high | supabase-railway-r2-recovery | Sonnet runs gates and tabulates; restores over live data stay [owner] | W0, O-08 (726) |
| `fixflow-odoo-analyst` | opus / high | odoo-accounting-import, pakistan-accounting-context | Opus owns the Odoo idempotency design (O-07) | R-02, O-07 (727, 734) |
| `fixflow-offline-sync-reviewer` | opus / high | offline-sync-review | the outbox contract is invariant-sensitive, Opus-owned | O-03, later reviewers (728) |
| `fixflow-migration-reviewer` | opus / high | fastapi-alembic-safety | migrations, ledger/money and auth are Opus-owned | O-04, O-07, implementation (729) |
| `fixflow-appsec-reviewer` | opus / high | appsec-review-asvs | security review and sign-off are Opus, never Sonnet | O-05, O-06 (730) |
| `fixflow-selfhost-architect` | sonnet / high | selfhost-homelab-ops | O-08 is sonnet/high; production actions stay [owner] | R-03, O-08 (731) |
| `fixflow-eas-release-operator` | sonnet / medium | eas-expo-release | runs commands and reports; roster-phone installs are [owner] | APK sessions (732) |
| `fixflow-device-smoke-runner` | sonnet / medium | maestro-device-e2e | runs gates and reports evidence; never judges field reliability | verification sessions (733) |
| `fixflow-pr-reviewer` | opus / high | fixflow-repo-conventions | every PR gets an Opus refute-by-default reviewer | implementation sessions (736) |
| `fixflow-explorer` | haiku | none | locator; on PR #182 only (`.claude/agents/fixflow-explorer.md` there) | "where is X?" (design:99) |

This skill itself has no agent: design §9 row "FixFlow orchestration skill (written here) |
every workflow" (`docs/ORCHESTRATION-DESIGN-2026-10.md:735`). The agent never learns its tier
(line 545); the definition pins the model.

### 1.4 Register ids: the W1 probes (design §4.2, lines 176-193)

| id | slug | model / effort | schema | note |
| --- | --- | --- | --- | --- |
| H-01 | extract-endpoints | haiku / medium | ENDPOINTS | declared deps only; `none_declared` means "look at the service layer" |
| H-02 | extract-config | haiku / low | CONFIG | `Settings` fields + hard-coded hosts |
| H-03 | extract-mobile-constants | haiku / low | CONSTANTS | storage keys, task names, caps, timings |
| S-01a | map-mobile-background-js | sonnet / medium | MAP | JS headless paths, timeouts with lines, no budget comparison |
| S-01b | map-expo-native | sonnet / medium | MAP | fixed question list against `args.expoSrc` |
| S-03 | map-backend-location-truth | sonnet / medium | MAP | punches, presence, pings, travel ingestion |
| S-04 | map-money-and-outbox | sonnet / medium | MAP | input to O-07 |
| S-05 | map-web-and-ops | sonnet / medium | MAP | web, ops console, `ops-server.mjs` |
| S-06 | reconcile-register | sonnet / high | REGISTER | diff-restricted with a one-hop check; FIXED narrows, never removes |
| S-07a | node-gates | sonnet / medium, runs commands | COMMANDS | own phase; failures re-run under `node:22` |
| S-07b | backend-gates | sonnet / medium, runs commands | COMMANDS + DUMPFACTS | Appendix A recipe verbatim (design line 630) |
| S-08 | dependency-and-secret-scan | haiku / low, runs commands | SCAN | fingerprint, never the value |
| S-09 | latency-facts | sonnet / high | MAP | the latency decision is Fable's |
| R-01 | research-android-oem-background | sonnet / medium, web | RESEARCH | expo tarballs first, then web |
| R-02 | research-odoo-api | sonnet / medium, web | RESEARCH | plan gating of the external API |
| R-03 | research-selfhost-stack | sonnet / medium, web | RESEARCH | tunnel, Caddy, PG17, R2 vs MinIO |

Cut: H-04, H-05, S-02, O-09 (now S-09) (`docs/ORCHESTRATION-DESIGN-2026-10.md:195-196`); O-02
merged into O-01 with the second lens at its skeptic (line 814). Sixteen W1 ids, hence
`coverage` 16/16 (line 215).

### 1.5 Register ids: the W2 analysts (design §4.5, lines 299-306; all return FINDINGS)

| id | slug | model / effort | inputs (W1 ids) |
| --- | --- | --- | --- |
| O-01 | geofence-end-to-end | opus / xhigh | S-01a, S-01b, R-01, H-03, S-06, dump facts |
| O-03 | offline-sync-correctness | opus / high | H-03, S-03 (H7), S-06 |
| O-04 | backend-location-truth | opus / high | S-03, H-01, dump facts |
| O-05 | security-external-attacker | opus / high | H-01, H-02, S-05, S-08 |
| O-06 | security-insider-and-operator | opus / high | H-02, S-03, S-04, R-03 |
| O-07 | odoo-pakka-khata-design | opus / high (scope follows the owner form, tier does not drop, lines 281-285) | S-04, R-02, migration chain, owner form |
| O-08 | selfhost-architecture-draft | sonnet / high, after the owner form | H-02, R-03, S-05, S-07b, S-09 |
| O-10 | fleet-drain-protocol | opus / high, pipelined after O-03 | W0 §2-3, H-02, H-03, S-03, S-04, O-03 |

Gates: **G1** (design §4.4, 254-285; done 2026-11-01) and **G2** (design §4.7, 343-357; done
2026-11-01, 12 skeptic verdicts at `docs/program/G2-deep-dive-gate-2026-11-01.md:22`). "Only
after G2 does phase design start" (`docs/ORCHESTRATION-DESIGN-2026-10.md:357`).

### 1.6 Phases (the `## P..` headings of the plan)

P0a 219, P0b 295, P1 317, P2a 384, P2b-1 421, P2b-2 458, P2c 479, P3a 497, P3b 582, P3c 613,
P12a 656, P4a 667, P4b 710, P4c 723, P4r 746, P5-spike 764, P5a 784, P5b-1 834, P5b-2 853,
P5c 875, P5d-1a 894, P5d-1b 905, P5d-2 913, P6a 928, P6b-1 955, P6b-2 976, P7a 989, P7b-1 1022,
P7b-2 1042, P8a 1054, P8b 1068, P9-0a 1095, P9-0b 1108, P9a-1 1134, P9a-2 1154, P9b 1166,
P10a 1177, P10b 1190, P11 1198, P12 1206, P13a 1215, P13b 1223, P13c 1233 (P13d is its second
PR), P13e 1247, P14-n 1262 (P14-fleet x n in the same heading); P14-log has no `## P..`
heading: a backlog checklist item (`docs/program/SHIP-PLAN-2026-11.md:215`) described in a
paragraph under P14-n (lines 1273-1277). (xn) marks a repeatable phase, one session
per unit (line 26-27). Owner sessions by heading: P0a, P0b, P3b, P3c (owner + session), P4c
(owner + session), P9-0b, P10b, P13e. 32 of the 45 phase sections carry a `**Workflow.**`
routing line, e.g. P1 "Opus implements; Sonnet writes tests from this list; Opus reviewer"
(line 376), P5d-2 "Sonnet tabulates; the session judges" (line 926), P12 "Sonnet" (line 1213).
The owner and operations phases P0b, P2c, P3b, P4b, P4c, P4r, P5c, P5d-1a, P5d-1b, P10b, P13b,
P13e and P14-n have none; route those by plan §0 (plan:47-56).

### 1.7 Constants the scripts and briefs use

| Constant | Value | Source |
| --- | --- | --- |
| Mapper output | at most 40 facts, evidence strings at most 200 chars | design:218-219 |
| FINDINGS slice | 12 in the script, dropped count logged | design:219 |
| Reader slice / breaker | slices of five; two or more fresh nulls in one slice = halt | design:205-206 |
| Opus skeptic cap | 12 per W2 run; overflow -> open risks as `unverified` | design:329-330 |
| Command timeout | `timeout: 600000` per command | design:618 |
| Gate containers | `fixflow-w1-db`, `fixflow-w1-gates`, `fixflow-w1-audit` | design:620-621 |
| Node | CI 22, this machine 24 | design:596 |
| Postgres | prod 17; gate recipe on `postgres:17-alpine` from P3a on | design:614, plan:57 |
| Alembic head | 0046 (0046 down_revision 0045, read 2026-11-04) | CLAUDE.md:29, CLAUDE.md:120 |
| Expo sources | `C:\Users\User\.fixflow-cache\expo-src\<pkg>-<version>\package\` (expo-location-18.0.10, expo-task-manager-12.0.6, expo-modules-core-2.2.3; folders listed 2026-11-04) | design:603-607, design:170 |
| Run journal | `.claude/projects/<proj>/<session>/subagents/workflows/<runId>/journal.jsonl` | design:585-587, `docs/HANDOFF-2026-07-28-open-work.md:144-146` |

### 1.8 Source text that is stale or superseded (FixFlow's rule wins)

- Design §9's EAS row asks "whether `expo-updates` should ship" (design:732): superseded by
  **ruling R7 - no `expo-updates`**, which bypasses the once-per-versionCode manifest and rule 1
  (`docs/program/SHIP-PLAN-2026-11.md:1483`, repeated at 1267).
- CLAUDE.md:120-121 "the next free slot is 0047" vs ruling R6 "No pre-assigned numbers; G2-D3's
  "0047" is not binding" (plan:1480): take the slot at rebase time from the `down_revision`
  chain and update CLAUDE.md's head in the same PR (plan:85-86). Never hard-code 0047 in a brief.
- Design §4.1 pulls `postgres:16-alpine` (design:164) and §8 says the recipe uses 16 for tests
  (design:615): from P3a on the gates run on `postgres:17-alpine` (plan:57).
- The CONTEXT block's production, fleet and last-commit lines are 2026-10-31 observations
  (design:371-375): supply them from `args` (`references/context-block.md`).
- Design §4 calls S3 "not designed yet" (design:111): the plan v8 is that design.
- Git rule differs by agent: analysts run no `npm`, `docker` or `git` (design:539);
  `fixflow-explorer` allows `git grep` / `git log` only (PR #182 `.claude/agents/fixflow-explorer.md:12`);
  S-08 uses `git grep` + `git log -p -S` (design:189). State the one that applies in the brief.
- Design §4.0 W0 says the old hostname may hang or proxy, "Not a 503" (design:126-132); plan
  rule 5 is the binding form, and O-08 §4's "503 stub" line is void (plan:105-110).
- CLAUDE.md:121-123 lets `VALIDATE` share the `NOT VALID` migration "when the column is
  provably clean"; plan §0 always puts `VALIDATE` in a later migration after an audit script
  (plan:86-88). The plan's rule applies to every ship-plan phase; reconcile CLAUDE.md in a
  later PR.

## 2. Procedure (main session)

An agent running under a brief from this skill stops at every [owner] step and returns.

**Session start**

1. One phase per session (`docs/program/SHIP-PLAN-2026-11.md:26`). Find the phase in the
   checklist (168-215), then read its heading section with ranged reads: Entry, Scope, Done
   when, Workflow (where present; §1.6), Resume.
2. Resume state: a code phase -> `gh pr view <branch>`, first unticked box; an operations phase
   -> its numbered step table in `docs/program/W0-results.md`, first unticked row; builds in
   flight -> `eas build:list` (plan:31-36).
3. Read the first line of the draft PR body, `Plan @ <sha>`; run
   `git diff --stat <sha>..origin/main -- docs/program/` and re-read any changed section before
   ticking the next box (plan:35-39).
4. Keep the "Decisions / ruled out / owner corrections (this phase)" journal under the
   checklist, appended the moment one occurs with `gh pr edit --body-file` (plan:39-42, HR-C2).
5. A backend phase that runs the Docker gates: confirm no other one is in flight on this
   machine (plan:28-30). [owner] The owner starts Docker Desktop and confirms `docker info`
   (plan:57-58); agents never start, install or reconfigure Docker (design:593-595).
6. `ls .claude/agents/` and fix the agentType set for this session (§1.3).

**Briefing**

7. Build the CONTEXT block from `references/context-block.md`, supplying every args line
   (today, repo or worktree path, main head, recovery case, APK commit, settled rows).
8. Write the brief as one paragraph: goal, files, the register ids or hypotheses it bears on,
   what is settled, what "done" returns. If it does not fit a paragraph, the task is not
   understood well enough to delegate (design:528-530).
9. Route per §1.2: raise effort before tier; Opus for anything in plan:47-50's list; the agent
   is told scope and rules, never its tier (design:545).
10. Pick the schema from `references/output-schemas.md`; Haiku gets a closed schema
    (design:95). Judgement-free stages return constants, lines, names, commands and exit
    codes, never a comparison, severity or verdict (design:114-117).
11. State the reading rules (design:531-545): start from the brief's files or a map's
    `files_or_urls`; one hop, extra files listed in `open_questions`; never read a file over
    300 lines whole; a `source_kind: code` map fact is citable for context only, a
    defect/risk claim's evidence is read by the analyst itself; `args.settled` is taken as
    given but may be challenged in `challenges_settled`; code on `main` yields candidates,
    device evidence yields conclusions (`in_field_apk` on every Q1 finding).

**Workflow scripts** (contract: `references/w1-script-skeleton.md`)

12. Deterministic issue order and stable unique labels (`H-01`, `S-07b`, `S-07b#retry`); no
    `Date.now()`, stamps come in via `args` (design:200-201).
13. Long command agents (S-07a, S-07b, S-08 shape) go first in their own `phase('Gates')`, not
    awaited by readers; their write-set (`node_modules/`, `dist/`, `coverage/`, Docker) is
    disjoint from what readers read (design:202-204).
14. Readers in slices of five with the circuit breaker; on halt account for every unstarted
    id, log `HALT`, return; resume replays the identical call order and retries at the tail as
    `#retry<args.attempt>` with `args.knownDead` (design:205-210, 585-587).
15. Every `run()` resolves to a value or `null`; return
    `{ results, missing, not_started, halted_at_slice, coverage }` (design:211-216).
16. Command agents: output to scratchpad logs, tails + exit codes returned; on a timeout
    re-check state and never re-issue a mutating command; fixed container names so a second
    start fails; clean up containers and the network at the end (design:217-218, 618-623).
17. Web agents: load WebSearch/WebFetch via ToolSearch first, stop after two denials, record
    `tool_status` and `urls_attempted`; an empty `facts` with `web_unavailable` is honest, an
    invented fact is not; the main session re-runs degraded topics itself (design:608-613).
18. Analysts list every `defect`/`risk` they can evidence with file:line and a failing
    condition; the script never truncates a P0 or P1; the rest goes in `backlog`
    (design:289-295).

**Gating** (any fan-out, G1/G2 shape)

19. Read results by id from the journal in the order the next briefs need them; never load
    every object in one pass (design:271-272).
20. Every id in `missing` or `not_started` is re-run or waived in writing; `coverage` reads N/N
    or carries a written waiver per gap; an absent result is never "nothing found"
    (design:213-216).
21. Demote, never delete: a FIXED claim becomes "claimed fixed in `<hash>` at file:line -
    confirm or refute" in the next brief (design:265-266).
22. Verify: one Sonnet/high citation check per analyst (`LOCATED`/`MOVED`/`DEAD_CITATION`/
    `ALREADY_FIXED`); one Opus/xhigh fresh-context skeptic per surviving P0 and per P1 touching
    outbox, lifecycle, ledger/chain, auth or location time bounds; other P1s share one
    Opus/high skeptic per analyst; skeptics get claim, evidence and failing condition only;
    cap 12 (design:315-331).
23. Three buckets: verified register (`CONFIRMED`, `PARTIALLY`), open risks (`UNVERIFIABLE`,
    `unverified`, `DEAD_CITATION`, each with what settles it), refuted (with counter-evidence;
    every refuted P0 spot-read by the main session) (design:336-339). A P0 on the open-risks
    list blocks the phase touching its area (design:347-349).
24. [owner] Design agents that need owner answers (O-07, O-08 shape) wait for the
    owner-decision form; discovery may start without it (design:269-270).
25. Commit raw outputs under `docs/program/evidence/` (plan:1520) only after the secret grep in
    §3.

**PR, merge, deploy**

26. A code phase opens a draft PR at its first commit, body = its Scope as checkboxes
    (plan:31-32); implementation is a subagent per §1.2, never the main session (plan:55-56).
27. Done only when gates are green locally and CI is green on the PR (plan:59-60).
28. Brief `fixflow-pr-reviewer` refute-by-default with the register ids it must try to break;
    its verdict names the PR head SHA it read; a push after review needs a re-read of the diff
    since that SHA; for each register id fixed it names the test that fails on base and passes
    on head and lists every changed expected value, removed assertion and new skip/xfail with
    its reason (plan:51-55).
29. Migrations: next free slot at rebase time, CLAUDE.md head updated in the same PR; FKs/CHECKs
    on populated tables ship `NOT VALID`, `VALIDATE` in a later migration after an audit script
    has run on the box immediately before that deploy (plan:85-88).
30. [owner] Merge on the owner's go-ahead. Merge is not deploy: before `T_close` a behaviour
    change ends "merged; deploy-train row added" (plan:76-79); `release/drain` takes commits by
    `git cherry-pick` only, never `git merge` (plan:67-68).
31. [owner] Deploy: "deployed per runbook R5 (owner at SSH, ~15 min)" after `T_close`; no
    backend deploy from `main` before P4c (plan:79-80, 100-101).
32. [owner] Every install on a roster phone, only after that phone's drain and AFTER check
    (plan:95-98); never an uninstall, except the K=no branch with the owner's written
    per-phone sign-off (same lines); technicians are released only by the written release
    notice (plan:111-113).
33. [owner] Enabling the dispatcher, a separate owner-approved step after the last re-open
    (plan:102-104); no customer or technician is messaged by an agent.
34. [owner] Restores over live data, production SQL/CLI, PIN rotation (P3b, plan:582), key
    rotation, account sign-up and procurement (P0b, plan:295), the W0/P0a dashboard and phone
    items (design:121-155), and a retired-phone sign-off (plan:89-91).

**Close**

35. Close the phase in a few lines answering: goal, where it fits, why this choice,
    before/after, what evidence ran (incl. skipped counts), what remains; then refresh
    `OWNER-VIEW.md`; move each journal entry to its owner and say where (plan:42-46).
36. A phase that finds the plan wrong records it in its W0-results step table and amends the
    plan in the same PR (plan:1552-1553).

## 3. Checks (read-only; what each proves)

| Check | Proves |
| --- | --- |
| `ls .claude/agents/` | which agentType values a script may pass (design:626-627) |
| `grep -h "^revision\|^down_revision" backend/alembic/versions/*.py` | the true head (end of the chain, not the highest filename; CLAUDE.md:385) |
| `git diff --stat <sha>..origin/main -- docs/program/` | whether the plan moved since `Plan @ <sha>` (plan:38) |
| `gh pr view <branch>` | resume point = first unticked Scope box (plan:32) |
| `docker info --format '{{.ServerVersion}}'` prints | engine up; otherwise agents return `blocked: ["DOCKER_ENGINE_DOWN"]`, `runs: []` (design:163, 593-595) |
| script return `coverage` == N/N and `missing`/`not_started` empty or waived | nothing silently absent (design:213-216) |
| Read `journal.jsonl` for the runId | what each agent actually returned before diagnosing an empty result |
| `GATE[...] EXIT=` lines in S-07b-shape output | backend gate result, not the container's exit code alone (design:188) |
| VERDICT `what_would_settle_it` non-empty on every `UNVERIFIABLE` | open risk is actionable (design:328, 521) |
| reviewer verdict SHA == PR head SHA | review covers what merges (plan:52-53) |
| grep -E evidence/briefs for `eyJ`, `sb_`, `AKIA`, `AIza[0-9A-Za-z_-]{35}`, `EAAG[0-9A-Za-z]+`, `whsec_`, `BEGIN .*PRIVATE KEY`, `postgres(ql)?://[^:]+:[^@]+@`, `https://[0-9a-f]+@[^ ]*sentry` | no known secret pattern lands in a committed file (SCAN rule, design:189, 472-474); `AIza` covers the keys in `technician-app/app.json` and `google-services.json`, `EAAG` the Meta token behind `FIXFLOW_WHATSAPP_*` |
| grep -F every JSON string of 8+ chars from `technician-app/eas.json`, `app.json`, `google-services.json` against evidence/briefs; report file, line and first 12 hex of sha256 only | no known committed value lands in a committed file; a hit on a generic word (a profile or package name) is reviewed, never printed |

## 4. Forbidden actions (and the rule each comes from)

- The main session implementing code (plan:55-56); an agent deciding, or a Sonnet verdict
  removing an Opus brief (design:16-19).
- The built-in Explore agent (design:99); an `agentType` with no definition file
  (design:626-627); telling an agent its tier (design:545).
- Giving a skeptic the analyst's reasoning (design:324-325, 543); deleting a claim instead of
  demoting it or carrying it as an open risk (design:265, 330, 336).
- `Date.now()`/`Math.random()` in a script (design:201; workflow-authoring reference, read
  2026-11-04); re-issuing a mutating command after a
  timeout; a second `pytest` against one DB (design:618-623).
- `expo prebuild` / `expo run:android` in `technician-app/` (design:598-602); `expo-updates`
  (ruling R7, plan:1483).
- An agent starting Docker (design:593-595); analysts running `npm`, `docker` or `git`
  (design:539).
- Quoting a value from `technician-app/eas.json`, `technician-app/app.json`,
  `technician-app/google-services.json` or any `.env`; report a fingerprint (first 12 hex of
  sha256) (design:189, 472-474; `.claude/skills/README.md:57`).
- Hard-coding migration 0047 (plan:1480); `VALIDATE` in the same deploy as `NOT VALID` on a
  populated table (plan:86-88); `alembic downgrade`, the Railway rollback button
  (`.claude/skills/README.md:52`).
- A backend deploy from `main` before P4c; any backend image other than the `drain-image` tag
  or its re-cut (`drain-image-2`, `-3`...) before `T_close` (plan:73-75, 100-101); the web
  image before `T_close` comes only from `release/drain-web` (plan:81-84); `git merge` into
  `release/drain` (plan:67-68); deploying the backend from the repo root (CLAUDE.md:88).
- The dispatcher ON before the owner's step (plan:102-104; CLAUDE.md:321); the old Railway
  hostname doing anything but hang (K=yes) or, for K=no & H=yes and only from O-10 B6,
  proxying through the repository stub in proxy mode; the stub never originates a 4xx, 5xx, 2xx
  or 204 of its own (plan:105-110; design:29).
- An uninstall on a roster phone (it erases the queues, design:139-140), except the K=no branch
  with the owner's written per-phone sign-off (plan:95-98).
- A money feed driven by the `job_event` cursor, money as floats, an outbox path that deletes a
  write (plan:114-115; CLAUDE.md:116, 154).
- A field-reliability claim without device evidence from the fleet's phone models (plan:99).
- Any production action by an agent: "Nothing here touches production" (design:628;
  `.claude/skills/README.md:60`).

## 5. References

- `references/context-block.md` - the CONTEXT block verbatim (design §5.1) and which lines are
  args, not constants.
- `references/output-schemas.md` - ENDPOINTS, CONFIG, CONSTANTS, MAP, RESEARCH, REGISTER,
  COMMANDS, DUMPFACTS, SCAN, FINDINGS, CITATIONS, VERDICT verbatim (design §5.2).
- `references/w1-script-skeleton.md` - the W1 script contract and JS skeleton verbatim (design
  §4.3); W2 uses the same shape pipelined per analyst (design:340-341).
- By path, not vendored: design Appendix A gates recipe (design:630), §4.0 W0 pre-flight
  (design:119-158), plan §6.5 rulings (plan:1455-1498), `docs/HANDOFF-2026-07-28-open-work.md`
  §2.5 multi-agent work (lines 138-146).
- docs/ORCHESTRATION-DESIGN-2026-10.md and docs/program/* are on PR #182 (head 3415b5e) at write time; their line numbers refer to that head.
