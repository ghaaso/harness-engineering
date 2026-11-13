<!-- Authored for FixFlow, 2026-11-04 -->
# Code phases: heading, branch, migrations, reviewer brief

Source: `docs/program/SHIP-PLAN-2026-11.md` (v8, 2026-11-01) on PR #182 at head 3415b5e. Every
number below is a line of that file at that head. Re-read the phase section before acting: a
plan amendment after 3415b5e moves these lines (plan §0 Resume, lines 36-39: run
`git diff --stat <sha>..origin/main -- docs/program/` and re-read any changed section).

"Migrations" is what the heading says. "free" = the heading says migration-free; "one" = the
heading says one migration; "—" = the heading says nothing, so read the Scope.

| Phase | Heading | Kind (heading) | Migrations | Branch (line) | Workflow / reviewer brief (line) |
| --- | --- | --- | --- | --- | --- |
| P1 | 317 | backend; one PR | free | `fix/backend-first-boot-gate` (381) | Opus implements; reviewer refutes the G2 §1.1 claims (376-377). CI-harness items may split to a **P1-ci** PR that is never cherry-picked onto `release/drain` (379-381) |
| P2a | 384 | mobile code; one PR; no build | — | `fix/mobile-engine-honesty` (418) | reviewer briefed with CLAUDE.md's outbox invariants (414-415) |
| P2b-1 | 421 | mobile code; one PR; no build | — | `feat/fleet-drain-tooling` (455) | Opus for manifest gate / un-park / retry / pending-media; reviewer briefed with O-10 R1-R7 (453-454) |
| P2b-2 | 458 | backend code; one PR | free | `feat/drain-audit` (477) | Opus; Opus reviewer (476) |
| P3a | 497 | code; one PR | free | `feat/selfhost-stack` (579) | Sonnet drafts; Opus reviews compose, restore order, stub modes against `O08-F01`/`F02`/`F07` and standing rule 5 (573-574) |
| P12a | 656 | web; one small PR; before P4a | — | `fix/web-payment-idempotency` (665) | Opus (money) (664-665) |
| P6a | 928 | backend + small web; one PR | free | `feat/attendance-truth-1` (953) | Opus rule + derivation; Sonnet web + tests; Opus reviewer (952) |
| P6b-1 | 955 | backend; one PR | one | `feat/attendance-truth-2` (973) | Opus throughout (973) |
| P6b-2 | 976 | backend; one PR | one | `feat/attendance-truth-3` (987) | Opus (987) |
| P7a | 989 | backend; one PR | free | `fix/service-layer-authz` (1020) | reviewer hunts field flows the checks would break (1019) |
| P7b-1 | 1022 | backend + web login; one PR | — | `fix/auth-lock` (1040) | Opus; Sonnet web login; Opus reviewer (1039) |
| P7b-2 | 1042 | ops-server + backend + web; one PR | — | `fix/ops-media-hardening` (1052) | Sonnet; Opus reviews media (1051) |
| P8a | 1054 | backend; one PR | one | `feat/money-integrity-1` (1066) | Opus (1066) |
| P8b | 1068 | backend; one PR | one | `feat/money-integrity-2` (1093) | Opus; may split to **P8b-2** (1089-1092) |
| P9a-1 | 1134 | backend; one PR | one | `feat/accounting-1` (1152) | Opus; reviewer with BACKEND-REQUIREMENTS §3.15 (1150-1151) |
| P9a-2 | 1154 | backend; one PR | — | `feat/accounting-2` (1164) | Opus (1163) |
| P9b | 1166 | web + backend read API; one PR | — | `feat/accounting-ui` (1175) | Opus endpoint; Sonnet pages (1175) |
| P10a | 1177 | backend + web; one PR | — | `feat/accounting-csv-export` (1188) | Opus; Sonnet runbook + page (1188) |
| P12 | 1206 | web; one PR | — | `fix/web-manager-defects` (1213) | Sonnet (1213) |
| P13a | 1215 | backend + ops; one PR | one | `feat/db-roles` (1220-1221) | Opus (1220) |
| P13b | 1223 | backend + ops; one PR + owner steps | — | `feat/backup-hardening` (1231) | owner inputs: the age key pair, second bucket/token (1229-1230) |
| P13c | 1233 | ops; one PR | — | `chore/ops-hardening` (1245) | Sonnet (1244) |
| P13d | inside P13c (1238-1242); no own heading | separate PR and deploy | each VALIDATE / the fence index in its **own** migration file (1241-1242) | `feat/deferred-validates` (1245) | Opus (1244); Entry needs the P6b-2 audit script re-run on the box immediately before the deploy, clean (1238-1240) |

## More code phases this skill serves (mobile, money-adjacent, optional, SDK)

Same conventions apply (SKILL.md §1.7 is the one phase list). Their builds and installs are
[owner] steps or the EAS skill's, never part of the PR work. Owner/operations phases P3c (613),
P5-spike (764), P9-0b (1108) and P10b (1190) are not served.

| Phase | Heading | Branch (line) | Workflow (line) |
| --- | --- | --- | --- |
| P5a | 784 | `fix/mobile-geofence-v2` (832) | reviewer with CLAUDE.md's location invariants (830) |
| P5b-1 | 834 | `fix/mobile-permissions-oem` (851) | Opus native patches + login; Opus reviewer (850) |
| P5b-2 | 853 | `feat/mobile-reminder-rules` (873) | Opus reviewer (872) |
| P9-0a | 1095 | `feat/week-export-script` (1106) | Opus (money-adjacent); Opus reviewer (1105) |
| P11 | 1198 (optional) | not named | Opus (1204) |
| P14-n | 1262 | `chore/expo-sdk-<n>` (1271) | patches re-checked by Opus (1265-1266); no `expo-updates` (1267) |

## Done-when wording (plan §0, lines 77-81)

- Before `T_close` (P4c): a behaviour-changing phase ends at "**merged; deploy-train row added**"
  in `docs/program/W0-results.md` (columns: phase, PR, merge sha, migration, post-deploy check).
- After `T_close`: "**deployed per runbook R5** (owner at SSH, ~15 min)"; `/api/ops/health` shows
  the new head and `FIXFLOW_GIT_SHA`; `docker inspect --format '{{.Image}}' backend` recorded.
- Web halves of mixed PRs (P6a, P7b-2, P9b, P10a) ride the train (plan lines 82-84); P12a/P12
  web-only commits go on `release/drain-web`, never on `release/drain`.
