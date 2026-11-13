---
name: fixflow-repo-conventions
description: FixFlow repo conventions for implementation sessions and PR review. Deploy traps (backend only from backend/, railway up --ci timeout is not a failure, verify by content, one prod step at a time, only drain-image until P4c); migrations (next free slot from the down_revision chain at rebase time, CLAUDE.md head bump in the same PR, NOT VALID then VALIDATE later, alembic check blind to CHECK, never downgrade); slice boundaries (import-linter, ESLint, web barrels); PR hygiene (draft PR with Plan @ <sha> and Scope checkboxes, decisions journal, Opus reviewer bound to the head SHA, the CI gate list). Use when writing, rebasing or reviewing a code-phase PR: P1/P1-ci, P2a, P2b-1/2, P3a, P5a, P5b-1/2, P6a, P6b-1/2, P7a, P7b-1/2, P8a, P8b, P9-0a, P9a-1/2, P9b, P10a, P11, P12a, P12, P13a-d, P14-n. Not for owner/operations phases (P0a/b, P2c, P3b, P3c, P4*, P5-spike, P5c, P5d*, P9-0b, P10b, P13e, P14-fleet), device or build work; never to deploy, build, install or run a production command (owner steps).
---

# FixFlow repo conventions (for implementers and the PR reviewer)

Authored 2026-11-04 from `CLAUDE.md`, `docs/HANDOFF-2026-07-28-open-work.md` §2, plan §0 of
`docs/program/SHIP-PLAN-2026-11.md` (v8, 2026-11-01) and `docs/ORCHESTRATION-DESIGN-2026-10.md`
§3/§5/§8/§9, against `main` @ a31924a. Precedence: `CLAUDE.md` + the code win over prose docs
(`CLAUDE.md:3-6` — "trust it over prose docs"); plan §0's standing rules bind on top of both.
Where they disagree on `main` @ a31924a (2026-11-04), §1.8 says which wins.

## 1. FixFlow facts

### 1.1 Deploying (everything here ends in an [owner] step)

| Fact | Citation |
| --- | --- |
| Deploy row on `main` @ a31924a (2026-11-04): Railway, manual `railway up`, services `efficient-tenderness` / `web` / `ops`; not auto-deploy on merge | `CLAUDE.md:36` |
| Backend deploys run from `backend/`, never the root: from the root RAILPACK detects Vite and ships the SPA as the API ("This has happened") | `CLAUDE.md:88-89`; `docs/HANDOFF-2026-07-28-open-work.md:62-63` |
| `railway up --ci` always ends `reqwest error / operation timed out`; upload and build succeed; **never re-run it** (double deploy) | `docs/HANDOFF-2026-07-28-open-work.md:64-66` |
| Verify by **content, not exit code**: poll `/openapi.json` for a field the build introduces, plus `/api/health` | `docs/HANDOFF-2026-07-28-open-work.md:67-68` |
| A healthy boot proves migrations applied: `backend/start.sh:6` `set -e`, `:9` `alembic upgrade head`; a failed migration crash-loops and the old container keeps serving | `docs/HANDOFF-2026-07-28-open-work.md:68-70` |
| "One prod-mutating action per step, reviewed in between" — never chain merge + deploy + `--apply` | `docs/HANDOFF-2026-07-28-open-work.md:71-72` |
| Never `alembic downgrade` ("39 of 46 downgrade bodies drop a table or column") | `docs/HANDOFF-2026-07-28-open-work.md:76-79` |
| Never Railway's rollback button once code and DB heads diverge; proven against alembic 1.18.5; abort a config change by reverting the env variable | `docs/HANDOFF-2026-07-28-open-work.md:80-86` |
| From P3 on production is the primary host, a VPS from P3b (HR-A3) | `docs/program/SHIP-PLAN-2026-11.md:61-64` |
| Until `T_close` (P4c) the host runs tag `drain-image` cut from `release/drain` = a branch at P1's squash commit with the P2b-2 and P3a squash commits applied "by `git cherry-pick` only — never `git merge`" | `docs/program/SHIP-PLAN-2026-11.md:65-68` |
| `git log release/drain` recorded in W0-results, no foreign commit; backend gates green on `release/drain` before tagging and after every re-cut; re-cuts are `drain-image-2`, `-3` | `docs/program/SHIP-PLAN-2026-11.md:69-75` |
| Standing rule 3: "No backend deploy from `main` before P4c." | `docs/program/SHIP-PLAN-2026-11.md:100-101` |
| Merge is not deploy: before `T_close` Done-when ends "merged; deploy-train row added"; after it "deployed per runbook R5 (owner at SSH, ~15 min)" | `docs/program/SHIP-PLAN-2026-11.md:76-81` |
| Web before `T_close` builds on `release/drain-web` (= `release/drain` + P12a/P12), never `release/drain` | `docs/program/SHIP-PLAN-2026-11.md:81-84` |
| The CI-harness items (skip gate, CLAUDE.md-head check, `--passWithNoTests` removal) are P1 deliverables by default, so they ride P1's squash commit into `release/drain`; only **if P1 runs long** they "may move to a small **P1-ci** PR", which is never cherry-picked onto `release/drain` | `docs/program/SHIP-PLAN-2026-11.md:361-366`, `:378-381` |
| P3a rewrites the CLAUDE.md Deploy row, traps and doc map | `docs/program/SHIP-PLAN-2026-11.md:566-567` |
| Mobile: never `expo prebuild` / `expo run:android` (creates an un-ignored `technician-app/android`, EAS then skips config plugins); `technician-app/package.json:9` maps `npm run android` to `expo run:android`, so that script is the same forbidden command | `docs/ORCHESTRATION-DESIGN-2026-10.md:598-600` |
| No `expo-updates` (ruling R7) | `docs/program/SHIP-PLAN-2026-11.md:1483` |
| EAS traps: no empty `EXPO_PUBLIC_SENTRY_DSN` in `eas.json`; no Sentry config plugin in `app.json`; `expo export` is JS-only | `CLAUDE.md:81-87` |

### 1.2 Migrations

| Fact | Citation |
| --- | --- |
| Chain head on `main` @ a31924a is 0046: `revision: str = "0046"`, `down_revision: str \| None = "0045"`; no file names `"0046"` as its `down_revision` (grep, 2026-11-04); 46 files | `backend/alembic/versions/0046_seed_dispatch_cursor.py:46-47` |
| CLAUDE.md states the head in two places: the stack table and the migration rule | `CLAUDE.md:29`, `CLAUDE.md:120-121` |
| "take the next free slot at rebase time (check the `down_revision` chain) and update the CLAUDE.md head in the same PR; branch names carry no numbers" | `docs/program/SHIP-PLAN-2026-11.md:85-86` |
| R6: "No pre-assigned numbers; G2-D3's "0047" is not binding" | `docs/program/SHIP-PLAN-2026-11.md:1480` |
| Restoring a parked migration verbatim after its number was taken gives two identical `revision` ids — alembic raises on every command, boot included; renumber to head+1 (both `revision` and `down_revision`) | `docs/HANDOFF-2026-07-28-open-work.md:95-99` |
| One transaction for all pending migrations: `do_run_migrations` opens one `context.begin_transaction()`; no `transaction_per_migration` in `env.py` (grep empty) | `backend/alembic/env.py:49-52`; `docs/HANDOFF-2026-07-28-open-work.md:111-112` |
| "`alembic check` cannot see CHECK constraints" — the only detector is an `@integration` test that POSTs the new value against real Postgres | `docs/HANDOFF-2026-07-28-open-work.md:113-116` |
| CI migrates an **empty** database, so a backfill is untested code reaching prod; write a migration test if it matters | `docs/HANDOFF-2026-07-28-open-work.md:117-118` |
| FKs on populated tables: `NOT VALID` then `VALIDATE` — same migration only when provably clean, a separate PR/deploy when human data could hold orphans | `CLAUDE.md:121-124` |
| Plan: `VALIDATE` lands in a **later migration** after an audit script has run on the box immediately before that deploy | `docs/program/SHIP-PLAN-2026-11.md:86-88` |
| Precedent: 0044 `CHECK (kind IN ({_KINDS})) NOT VALID`; 0045 `ALTER TABLE job_event VALIDATE CONSTRAINT job_event_kind_check` | `backend/alembic/versions/0044_event_kind_check_and_media_fk.py:84`; `backend/alembic/versions/0045_validate_event_kind_check.py:49` |
| P13d: the fence index and each deferred VALIDATE "each in its own migration file so one failure cannot block the others" | `docs/program/SHIP-PLAN-2026-11.md:1238-1242` |
| Seeds go in migrations (0046 seeds the dispatch cursor); fuzzy backfills are idempotent dry-run-default scripts in `backend/scripts/` | `CLAUDE.md:125-126`; `backend/alembic/versions/0046_seed_dispatch_cursor.py:1` |
| Dry-run default shape: `--apply` "write (default is dry-run)" | `backend/scripts/unlock_account.py:91` |
| Ruff does not lint migration files: `extend-exclude = ["alembic/versions"]` | `backend/pyproject.toml:68` |
| Money: integer minor units; existing `*_paisa` names stay, new columns are `*_minor` | `CLAUDE.md:116-118` |
| Phases with one migration (by heading): P6b-1, P6b-2, P8a, P8b, P9a-1, P13a; migration-free: P1, P2b-2, P3a, P6a, P7a | `references/phase-branches.md` |

### 1.3 Slice boundaries

| Fact | Citation |
| --- | --- |
| `[tool.importlinter]`, `root_package = "app"` | `backend/pyproject.toml:99-100` |
| Contract "Feature slices stay independent (cross-slice only via deps/service)", type independence, 11 modules (identity deliberately outside) | `backend/pyproject.toml:103-117`; comment `:95-98` |
| `ignore_imports` **is the allow-list**; every edge carries a comment saying why (e.g. `:128-130` money rates → `jobs.service -> tenancy.service`) | `backend/pyproject.toml:118-163` |
| Test-harness exceptions cover only `service`/`deps`/`schemas`/`app.main`, "so a test reaching into another slice's repository/models still fails" | `backend/pyproject.toml:155-162` |
| Identity imports no other feature (forbidden list `:169-180`; `ops` is not on it) | `backend/pyproject.toml:165-180` |
| `shared/` imports nothing internal; `core/` never reaches into features | `backend/pyproject.toml:185-195` |
| Web: `src/shared/**` may not import `@app/*` or `@features/*` | `eslint.config.js:29-37` |
| Web: `src/features/**` may import only `@app/providers` from the app layer | `eslint.config.js:48-57` |
| No ESLint rule governs feature → feature imports; ARCHITECTURE says import another feature's data/helpers **by specific path**, one-directional and acyclic, and **not** its pages or `index.js` barrel; the router imports pages only through `index.js` | `ARCHITECTURE.md:143-151` |
| Code follows that: `import { fetchSelfieGaps } from "@features/attendance/data/attendanceApi";` | `src/features/dashboard/pages/Dashboard.jsx:21` |
| Mobile has no ESLint config; its one mechanised boundary is the outbox guard (`WRITE_METHODS`, `claim` exempt); it only scans `src/features` and single-line `jobsApi.<method>(` | `technician-app/src/lib/architecture.test.ts:21-42`; `docs/HANDOFF-2026-07-28-open-work.md:400` |
| `DEFAULT_SHOP_ID = "default"` — single-tenant; don't build for multi-tenant as live | `backend/app/shared/tenancy.py:12`; `CLAUDE.md:105-106` |

### 1.4 Invariant sections a reviewer maps a diff onto

`CLAUDE.md` headings: Data and money `:114`, Security `:132`, The mobile outbox `:149` (known
unfixed race `:161`), Location and privacy `:169`, The job lifecycle `:179`, The bill freeze
`:197`, Resuming from server truth `:222`, The outbox dispatcher `:229`, Staff money `:282`,
Scheduler jobs `:309`. Code anchors: `compare_secret` `backend/app/core/security.py:22`;
`enable_dispatcher: bool = False` `backend/app/core/config.py:188`; `_MAX_DISPATCH_EVENT_AGE =
timedelta(days=2)` `backend/app/main.py:94`. Plan §0 routing makes the outbox contract, drain
tooling, lifecycle, ledger/chain/money, auth/PIN/JWT, migrations, native patches and the
location time bounds Opus-owned (`docs/program/SHIP-PLAN-2026-11.md:47-50`).

### 1.5 Gates

| Gate | CI (`.github/workflows/ci.yml`) | `CONTRIBUTING.md` / PR template |
| --- | --- | --- |
| Web | job `frontend` "Lint · Format · Test · Build" `:18-19`, Node 22 `:28`: lint `:35`, format:check `:38`, test `:41`, build `:44` | same (`CONTRIBUTING.md:145-150`); template says `npm run format` applied, not `format:check` (`.github/pull_request_template.md:27`) |
| Mobile | job `mobile` `:47-48`: typecheck `:68`, `npm test -- --ci --passWithNoTests` `:71`, `npx expo export --platform android` `:77` | omits `expo export` (`CONTRIBUTING.md:164-168`) |
| Backend | job `backend` `:80-81`, `postgres:17-alpine` since P3a (#195; `:88` showed `postgres:16-alpine` at `a31924a`), Python 3.12 `:110`: ruff format `:120`, ruff check `:123`, mypy `:126`, `lint-imports` `:129`, `alembic upgrade head` `:132`, `alembic check` `:135`, pytest `:138` | omits `lint-imports`, both alembic steps (`CONTRIBUTING.md:154-160`); template is npm-only (`:25-28`) |

- **CI wins**: "done" = gates green locally **and** CI green on the PR
  (`docs/program/SHIP-PLAN-2026-11.md:59-60`). Backend gates run in Docker per design Appendix A
  (`docs/ORCHESTRATION-DESIGN-2026-10.md:630-657`), on `postgres:17-alpine` from P3a on
  (`docs/program/SHIP-PLAN-2026-11.md:57`, `:566`); prod is Postgres 17 (`backend/Dockerfile:25`
  `postgresql-client-17`). At most one Docker backend phase at a time (`SHIP-PLAN:28-30`).
- **Appendix A gates the main checkout unless you change it**: `B='C:/Users/User/Documents/projects/EMS_workshop1/backend'`
  (design `:634`) is mounted as `-v "$B:/src:ro"` (`:640`). In a phase worktree (or on
  `release/drain`) set `B` to **that** worktree's `backend` path first, and record the mounted
  path and its `git rev-parse HEAD` beside the `GATE[...]` lines; a run without both does not
  count as "gates green locally".
- A green pytest proves nothing about SQL if `@integration` tests were skipped:
  `backend/tests/conftest.py:65-72` skips them all when `FIXFLOW_TEST_DATABASE_URL` is unset.
  P1 adds the skip-aware gate, the CLAUDE.md-head CI check and drops `--passWithNoTests`
  (`docs/program/SHIP-PLAN-2026-11.md:361-366`); none is in `ci.yml` on `main` @ a31924a.
- Never two pytest processes on one DB — `metadata.create_all` takes an AccessExclusiveLock;
  22 phantom "failures" (`docs/HANDOFF-2026-07-28-open-work.md:132-134`). Appendix A does **not**
  guard this: it runs `docker rm -f fixflow-w1-db fixflow-w1-gates` before starting (design
  `:638`), so a second concurrent start destroys the first run's DB and gate container. The only
  guard is the one-Docker-backend-phase rule (`SHIP-PLAN:28-30`); check `docker ps` for those
  names before starting and stop if they are running.
- Node: CI 22 (`ci.yml:28`, `:60`), `"node": ">=22.0.0"` (`package.json:7`), this machine Node
  24.x (the sources give the major only: design `:596-597`, `SHIP-PLAN:59`): a
  `jest-expo` / RN 0.76.9 failure on 24 is re-run under `node:22` before it is called a repo
  defect (`docs/ORCHESTRATION-DESIGN-2026-10.md:596-597`). Images are still `node:20-alpine`
  (`Dockerfile.ops:9`, `Dockerfile.web:10`) until P13c (`SHIP-PLAN:1233-1236`).
- Prettier skips `CLAUDE.md`, `docs`, `backend`, `technician-app` and, as an **uncommitted** change
  on this branch, `.claude` (`.prettierignore:24`). Commit that line with any `.claude/` content
  or `prettier --check .` (`package.json:19`) fails the frontend job.

### 1.6 PRs, commits, branches

- Draft PR **at the first commit**; body = Scope as a checkbox list; first line `Plan @ <sha>`;
  resume = `gh pr view <branch>` + `git diff --stat <sha>..origin/main -- docs/program/`; a
  "Decisions / ruled out / owner corrections (this phase)" journal appended as they occur
  (`docs/program/SHIP-PLAN-2026-11.md:31-43`). Six-question closing message, then refresh
  `OWNER-VIEW.md` (`:43-46`). Skeleton: `references/pr-body-and-review.md`.
- Reviewer: Opus, refute-by-default, brief names the register ids to break; verdict names the PR
  head SHA read; a push after review needs a re-read of the diff since that SHA; per fixed id the
  test failing on base and passing on head; every changed expected value, removed assertion, new
  skip/xfail with reason. "The main session (Fable) briefs, gates and judges; it never
  implements." (`docs/program/SHIP-PLAN-2026-11.md:51-56`)
- Branch per phase is fixed by the plan (`references/phase-branches.md`), in
  `type/scope-short-description` form (`CONTRIBUTING.md:80-82`); Conventional Commits with a
  scope (`CONTRIBUTING.md:86-97`; history e.g. `fix(mobile): make the WhatsApp opt-in a real
  opt-in (M11) (#173)`). `main` is protected; one review and green CI required; squash merge
  (`CONTRIBUTING.md:70-71`, `:173-174`); every path owned by `@Tempest-Zero`
  (`.github/CODEOWNERS:7`). The owner merges.
- Identity: commits under the repo-local git identity (`git config user.name` in this repository; GitHub `Tempest-Zero`, noreply address), stored
  repo-locally on 2026-10-31; branch, never `main`; `git commit -F <file>` and `--body-file`
  because apostrophes break `-m`; `gh.exe` is at `C:\Program Files\GitHub CLI\gh.exe`, not on the
  Git Bash PATH (project memory `user-git-identity`, not a repo file). Commit messages end with the
  `Co-Authored-By:` trailer the session's attribution reminder gives; PR bodies end with its
  "Generated with Claude Code" line.
- Multi-agent work: one `git worktree` per agent; "the files changed under me three times
  mid-review" (`docs/HANDOFF-2026-07-28-open-work.md:140-142`). A dead workflow's results are in
  its `journal.jsonl` — recover, don't re-run (`:143-146`).

### 1.7 Register ids and phases

- Register: `docs/program/G2-deep-dive-gate-2026-11-01.md` §2 (`:96-218`); raw analyst output in
  `docs/program/evidence/w2/O-0*.txt` / `O-10.txt`. W1 ids H-01..H-03, S-01a/b, S-03..S-09,
  R-01..R-03 (design §4.2, `:174-197`); W2 analysts O-01, O-03..O-08, O-10 (design §4.5,
  `:287-312`). Spellings vary inside the register — `O6-F01`, `O08-F01`, `O3-F2` all occur
  (`G2-deep-dive-gate-2026-11-01.md:26-29`), and the plan writes `O05-15`, `O10-F7` — so grep
  both `O6-`/`O06-` forms before calling an id unknown.
- Phases this skill serves (the PR of every code phase; "Every PR gets an Opus reviewer",
  `SHIP-PLAN:51`): P1 (and P1-ci if split, `:378-381`), P2a, P2b-1, P2b-2, P3a, P12a, P5a,
  P5b-1, P5b-2, P6a, P6b-1, P6b-2, P7a, P7b-1, P7b-2, P8a, P8b (and P8b-2 if split), P9-0a,
  P9a-1, P9a-2, P9b, P10a, P11, P12, P13a, P13b, P13c, P13d (second PR inside P13c,
  `SHIP-PLAN:1238`; no own heading), P14-n. Builds and installs inside P5a/P5b-2/P14-n are not
  this skill's (they are [owner] or the EAS skill's). Not served: owner/operations phases P0a,
  P0b, P2c, P3b, P3c, P4a/b/c/r, P5-spike, P5c, P5d-*, P9-0b, P10b, P13e, P14-fleet. Headings,
  branches and reviewer briefs: `references/phase-branches.md`.

### 1.8 Where FixFlow's own docs disagree (which wins)

| Statement | Conflicts with | Rule applied here |
| --- | --- | --- |
| "the next free slot is **0047**" (`CLAUDE.md:120-121`); "Free migration slot 0047" (`docs/HANDOFF-2026-07-28-open-work.md:29`) | plan `:85-86` + R6 `:1480` (no pre-assigned numbers) | derive the slot from the chain at rebase time; bump `CLAUDE.md:29` and `:120-121` in the same PR. The handoff table is point-in-time (`:17`) |
| "0045 is a free slot" (`docs/lifecycle-audit-followups-2026-07.md:163`) | `0045_validate_event_kind_check.py:42` exists; handoff `:90-93` "0045 is no longer a free slot" | stale; ignore |
| Deploy = `cd backend && railway up --ci --service efficient-tenderness` (`CLAUDE.md:36`, handoff `:58-60`) | plan `:61-84`, rule 3 `:100-101` | P3a has merged (#195): the Deploy row now describes the self-host path and `railway up` is history; any deploy is still [owner], and before `T_close` only the `drain-image` tag deploys |
| CI and the local recipe on `postgres:16-alpine` (`ci.yml:88`, handoff `:127`) | plan `:57`, `:566` (17 from P3a) | P3a merged on 2026-11-13 (#195): CI and the gate script run `postgres:17-alpine` (the first cell describes `a31924a`); pass `FF_PG_IMAGE=postgres:16-alpine` to the gate script only for a branch cut before it |
| Backend PR gates in `CONTRIBUTING.md:154-160` and `.github/pull_request_template.md:25-28` | `ci.yml:119-138` | the CI list is the gate list |
| "a feature's `index.js` barrel (web)" for cross-slice access (`CLAUDE.md:127-128`) | `ARCHITECTURE.md:143-151` and `Dashboard.jsx:21` | **unruled**: app/router → feature via `index.js` satisfies both; a feature → feature import is reported `not_applicable` with an open question (§4 check 6), never pass/fail. A PR that touches this may propose the CLAUDE.md:127-128 rewording ("Keeping this file honest", `CLAUDE.md:372-380`) for the owner to accept |
| "Prefer squash merge" (`CONTRIBUTING.md:174`) | `release/drain` by cherry-pick only (plan `:66-68`) | compatible: squash to `main`, cherry-pick the squash commits onto `release/drain` |

## 2. Procedure — implementing a code phase

1. Work in a dedicated worktree on the phase's branch from `references/phase-branches.md`;
   never on `main`. Read the phase section and the design note it cites; note the plan commit sha.
2. At the first commit open a **draft** PR with `--body-file` from the skeleton in
   `references/pr-body-and-review.md` (`Plan @ <sha>` first, Scope checkboxes, journal heading).
   Append journal entries the moment a decision or owner correction happens.
3. Migration (only where the phase heading or Scope has one):
   a. At rebase time find the chain head (§3 check 1); the new file takes head+1 in **both**
      `revision` and `down_revision` — no number is reserved (R6).
   b. Bump `CLAUDE.md:29` and `CLAUDE.md:120-121` in the same PR.
   c. FK/CHECK on a populated table: `NOT VALID` here; the `VALIDATE` goes in a **later**
      migration file (P13d: one file per VALIDATE). Same-migration VALIDATE only for a provably
      clean column (`CLAUDE.md:121-124`).
   d. A new or changed CHECK gets an `@integration` test that writes the boundary value against
      real Postgres — `alembic check` will not catch it.
   e. A backfill gets a migration test against seeded rows (CI's DB is empty). Seeds in the
      migration; fuzzy backfills as dry-run-default scripts in `backend/scripts/`.
   f. No `downgrade()` is ever run; write the body, but no runbook or PR text may tell anyone to
      run it.
4. Slice edges: a new cross-slice import goes through the target's `service.py`/`deps.py` and is
   added to `ignore_imports` with a one-line why-comment (`backend/pyproject.toml:118-163`);
   web edges follow §1.3. Never widen the test-harness wildcards.
5. Touching an invariant area (§1.4): re-read that `CLAUDE.md` section first; if it changes,
   update `CLAUDE.md` in this PR (`CLAUDE.md:372-379` "Keeping this file honest").
6. [owner] Docker Desktop is started by the owner and confirmed with `docker info`
   (`docs/ORCHESTRATION-DESIGN-2026-10.md:593-595`). Then run the gates: backend via design
   Appendix A with `B` set to **this worktree's** `backend` path (its default, design `:634`, is
   the main checkout), web/mobile natively; record skipped counts, the mounted path and
   `git rev-parse HEAD` (§1.5).
7. Commit: Conventional Commit subject with scope, `git commit -F`, attribution trailer, identity
   per §1.6. Push the branch.
8. Ask the main session for the Opus review (agent `fixflow-pr-reviewer`), naming the register
   ids to break and the head SHA. After any later push, the review re-reads the diff since the
   SHA it named.
9. CI green on all three jobs (`ci.yml:19`, `:48`, `:81` names).
10. [owner] Merge the PR (squash).
11. Before `T_close`: commit the deploy-train row to `docs/program/W0-results.md` (phase, PR,
    merge sha, migration, post-deploy check). After `T_close`: [owner] deploy per runbook R5
    and record `/api/ops/health` head + `FIXFLOW_GIT_SHA` + the image id.
12. If this PR is the last of P1 / P2b-2 / P3a to merge: create `release/drain` **at P1's squash
    commit** on `main`, then `git cherry-pick` the P2b-2 and P3a squash commits onto it (never
    `git merge`; `SHIP-PLAN:65-68`). If P1 is not the first of the three to merge, the base is an
    owner question — stop and ask. Record `git log release/drain`, run the backend gates on it
    (§1.5, `B` = that worktree). [owner] Pushing `release/drain` and the `drain-image` tag (it is
    what production runs until `T_close`, rule 3).
13. Production-side steps a phase may name — `railway run psql` audits, a script's `--apply`,
    the VALIDATE pre-deploy audit on the box, hand-editing `alembic_version`, re-seeding the
    cursor, enabling the dispatcher — are each [owner], one per step, reviewed in between.
14. Close: move journal entries to their owners, write the six-question closing message, refresh
    `docs/program/OWNER-VIEW.md`.

## 3. Procedure — reviewing a PR (the `fixflow-pr-reviewer` brief)

1. Read the PR's head and base SHAs (`gh pr view <n> --json headRefOid,baseRefOid,body`) and line
   1 of the body (`Plan @ <sha>`). Everything after is bound to that head SHA.
2. For each register id in the brief: find the test that fails on base and passes on head (read
   base code with `git show <base>:<path>`), then try to break the fix — the failing condition
   from the register, the deployed-APK case (no `client_id`), the empty-DB-vs-populated case.
3. List every changed expected value, removed assertion, new skip/xfail/`.only` (§4 check 7).
4. Run the conventions checks (§4) on the diff; report each failure with `path:line — quote`.
5. Return the review record (`references/pr-body-and-review.md`) in the agent's output
   contract. The reviewer never posts, approves, merges or pushes; the main session does.

## 4. Checks (read-only; what each proves)

Every check reads the tree at `<head>` (the reviewer's recorded head SHA; an implementer uses
`HEAD` in the phase worktree), never whatever the working tree holds: the CLAUDE.md quick check
at `CLAUDE.md:386` greps the working tree, which is the wrong code unless
`git rev-parse HEAD` equals `<head>`.

1. **Chain head** — `git grep -h -e "^revision" -e "^down_revision" <head> -- backend/alembic/versions/`
   (the `CLAUDE.md:386` grep, bound to `<head>`): head = the revision no file names as
   `down_revision`.
2. **Linear, unique** — `git grep -h "^down_revision" <head> -- backend/alembic/versions/ | sort | uniq -d`
   and the same for `^revision`: both empty ⇒ no fork, no duplicate id (the 0045 trap).
3. **CLAUDE.md head matches** — `git show <head>:CLAUDE.md | grep -n "head = \*\*\|Head is \*\*"`
   shows the chain head on both lines (29, 120 on `main` @ a31924a); otherwise the PR is missing
   its bump.
4. **Two-step** — for each new migration, `git show <head>:<path> | grep -n "NOT VALID\|VALIDATE CONSTRAINT\|create_foreign_key\|create_check_constraint"`:
   an FK/CHECK on a populated table without `NOT VALID`, or a `VALIDATE` of a constraint added in
   the same deploy on human data, fails `CLAUDE.md:121-124`.
5. **CHECK has a real-DB test** — a new CHECK with no `@pytest.mark.integration` test writing the
   rejected value: `alembic check` cannot see it (handoff `:113-116`).
6. **Slice edges** — `git diff <base>..<head> -- backend/pyproject.toml`: each new
   `ignore_imports` edge targets a `service`/`deps`/`schemas` module and carries a comment;
   `git grep -n -e "from app.features.<other>.repository" -e "from app.features.<other>.models" <head> -- backend/app/features/<x>/`
   is empty. Web: no `@app/` import from `src/features/**` other than providers
   (`git grep -n "@app/" <head> -- src/features/`). A new feature → feature import is
   `not_applicable` plus an open question until the owner rules on the barrel conflict (§1.8);
   a cycle between features still fails (`ARCHITECTURE.md:146`).
7. **Changed expectations** — `git diff <base>..<head> -- '*test*'` lines matching
   `^-.*(assert |expect\()`, `^\+.*(pytest\.mark\.(skip|xfail)|\.skip\(|xit\(|\.only\()`.
   Each needs a stated reason in the PR.
8. **Integration actually ran** — the pytest output has no `set FIXFLOW_TEST_DATABASE_URL to run
   integration tests` skip reason (`backend/tests/conftest.py:69`); any such line ⇒ the SQL path
   is untested.
9. **PR body** — first line `Plan @ <sha>`; a Scope checkbox list; the journal heading.
10. **CI** — `gh pr checks <n>` shows the three jobs green; a local-only green is not "done".
11. **Commits** — `git log --format='%an%n%s%n%b' <base>..<head>`: author = the repo-local identity (`git config user.name`),
    Conventional subject, the `Co-Authored-By:` trailer; branch is not `main`; branch name has no
    migration number.
12. **Drain scope** — the CI-harness items pass inside a P1 PR (plan default deliverables,
    `SHIP-PLAN:361-366`). They fail only where the plan keeps them off `release/drain`: a split
    **P1-ci** PR must say it is never cherry-picked onto `release/drain` (`:378-381`), and a
    P2b-2 / P3a PR must carry no web-only commit and no P1-ci commit (`:66-68`, `:81-84`).
13. **No secret values** — `git diff <base>..<head>` grepped with
    `grep -nE 'eyJ|sb_|AKIA|BEGIN .*PRIVATE KEY|AIza[0-9A-Za-z_-]{35}|EAA[A-Za-z0-9]{20,}|whsec_|sntrys_|https://[^ ]*@[^ ]*sentry\.io|postgres(ql)?(\+asyncpg)?://[^:]+:[^@]+@'`
    (JWT, Supabase, AWS, PEM keys of every kind, Google/Firebase, Meta Cloud API/WhatsApp,
    webhook secrets, Sentry auth tokens and DSNs, DB URLs), outside the known test-only
    credentials (`ci.yml:101-102`, design Appendix A). A hit is reported as file, line number and a
    12-hex sha256 fingerprint, never the value (design §5.2 `SCAN`).

## 5. Forbidden (and where the rule comes from)

| Never | Source |
| --- | --- |
| deploy, `railway up`, `railway run`, Railway rollback, push a deploy tag | standing rule 3 `SHIP-PLAN:100-101`; handoff `:71-72`, `:80-86`; `.claude/skills/README.md` rule 4 |
| re-run `railway up --ci` after its timeout | handoff `:64-66` |
| deploy the backend from the repo root | `CLAUDE.md:88-89` |
| `alembic downgrade`, in any situation | handoff `:76-79` |
| `git merge` into `release/drain`; a foreign commit on it | `SHIP-PLAN:66-69` |
| a backend deploy from `main` before P4c | `SHIP-PLAN:100-101` |
| a pre-assigned migration number or a number in a branch name | `SHIP-PLAN:85-86`, `:1480` |
| restoring a parked migration file without renumbering | handoff `:95-99` |
| two pytest processes on one DB; a second Docker backend phase | handoff `:132-134`; `SHIP-PLAN:28-30` |
| `expo prebuild`, `expo run:android`, `npm run android`, `expo-updates` | design `:598-600`; `technician-app/package.json:9`; `SHIP-PLAN:1483` |
| an `eas build`/`eas submit`, an `adb install` or any install on a roster phone ([owner]) | `.claude/skills/README.md` rule 4; standing rule 1 `SHIP-PLAN:95-98` |
| committing to `main`; merging your own PR | `CONTRIBUTING.md:70-71`; project memory `user-git-identity` ("the owner merges PRs") |
| force-pushing a branch someone else (a reviewer, another worktree) is reading | INFERRED from the head-SHA rule `SHIP-PLAN:52-53` and handoff `:140-142`; no repo file states it |
| copying a value from `technician-app/eas.json`, `app.json`, `google-services.json` or any `.env` | `.claude/skills/README.md` rule 3 |
| enabling the dispatcher | standing rule 4 `SHIP-PLAN:102-104` |
| messaging a customer or technician (release/hold notices are the owner's) | `.claude/skills/README.md` rule 4; standing rule 6 `SHIP-PLAN:111-113` |
| floats for money; an outbox path that deletes a write | standing rule 7 `SHIP-PLAN:114-115`; `CLAUDE.md:116`, `:154` |

## 6. Unknowns carried forward (2026-11-04)

- `.claude/agents/fixflow-explorer.md` is named by design §3 and §8
  (`docs/ORCHESTRATION-DESIGN-2026-10.md:99`, `:626`) but is not on this branch (PATH_MISSING);
  it exists on PR #182.
- Prod's Alembic head and deploy state are not derivable from the repo; the last record is 0045
  on 2026-08-01 (`docs/HANDOFF-2026-07-28-open-work.md:24`) and prod has since died. Treat as
  unknown until P0a/W0 records it.
- Whether pushing `release/drain` / `drain-image` is the session's Scope item or an owner step:
  the plan makes the cut a Scope item (`SHIP-PLAN:71-72`); this skill marks the push [owner]
  because it selects what production runs (INFERRED).

## 7. References

- `references/phase-branches.md` — per code phase: heading line, migrations, branch, reviewer
  brief, Done-when wording.
- `references/pr-body-and-review.md` — the draft PR body skeleton and the per-pass review record.
- docs/ORCHESTRATION-DESIGN-2026-10.md and docs/program/* are on PR #182 (head 3415b5e) at write time; their line numbers refer to that head.
- Read on demand, not vendored: `CLAUDE.md`; `docs/HANDOFF-2026-07-28-open-work.md` §2
  (`:52-146`); `ARCHITECTURE.md:140-156`; `CONTRIBUTING.md:68-182`; `.github/workflows/ci.yml`;
  `backend/pyproject.toml:94-195`; `eslint.config.js:24-64`. Deeper lenses: the
  `fastapi-alembic-safety`, `offline-sync-review` and `appsec-review-asvs` skills.
