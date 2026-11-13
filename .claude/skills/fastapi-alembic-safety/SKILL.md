---
name: fastapi-alembic-safety
description: PostgreSQL-specific safety for FixFlow's backend (FastAPI + async SQLAlchemy 2.0 + asyncpg + Alembic, backend/). Use when writing or reviewing an Alembic migration or a models.py change; a CHECK, FK or unique index on a populated table; a backfill or audit script; engine, pool or pydantic-settings (FIXFLOW_) changes; a real-Postgres integration test; the Docker gate run; or a dump restore-and-verify. Serves the O-04/O-07 analyses, the O-06 money items and plan phases P1, P6a, P6b-1, P6b-2, P7a, P8a, P8b, P9a-1, P13a (and the P13d deferred VALIDATEs). Covers NOT VALID then VALIDATE, single-transaction boot migrations, lock behaviour as FixFlow's code states it, alembic check's blind spots, and read-only checks. Do NOT use for mobile outbox/offline code, Supabase-native features (no RLS, GoTrue, PostgREST or Storage here), generic FastAPI auth (auth is custom PIN + JWT), or any production action — deploys, prod SQL, VALIDATE against prod, restores over live data and DB role grants are owner-only.
---

# FastAPI + async SQLAlchemy + Alembic safety (FixFlow)

Written 2026-11-04 against `main` @ a31924a. Paths are repo-relative; a bare `00NN_….py` is
under `backend/alembic/versions/`, `handoff` is `docs/HANDOFF-2026-07-28-open-work.md`, and
`[PR182]` marks a file on PR #182 — bare `SHIP-PLAN-2026-11.md` is
`[PR182] docs/program/SHIP-PLAN-2026-11.md`, bare `design` is
`[PR182] docs/ORCHESTRATION-DESIGN-2026-10.md`. Tags: **CODE** = read in the repo, **INFERRED** = reasoned, not read or fetched,
**UNVERIFIED** = needs a fetch or command nobody ran. **No PostgreSQL manual page was fetched**
for this package: every lock level here is FixFlow's own code comment, not a primary source.

## 1. FixFlow facts

### 1.1 Versions (verified against `backend/pyproject.toml` on 2026-11-04)

| Package | Range (`backend/pyproject.toml`) | Installed |
| --- | --- | --- |
| fastapi | `>=0.115,<1.0` (`:11`) | UNVERIFIED |
| pydantic / pydantic-settings | `>=2.9,<3.0` (`:13`) / `>=2.6,<3.0` (`:14`) | UNVERIFIED |
| sqlalchemy[asyncio] | `>=2.0,<3.0` (`:15`) | UNVERIFIED |
| asyncpg | `>=0.30,<1.0` (`:16`) | UNVERIFIED |
| alembic | `>=1.13,<2.0` (`:17`) | the handoff ran 1.18.5 (`docs/HANDOFF-2026-07-28-open-work.md:83`) |
| Postgres | prod 17 (`backend/Dockerfile:12-13,25`); CI 16 (`.github/workflows/ci.yml:88`) | P3a moves CI + gates to 17 (`[PR182] docs/program/SHIP-PLAN-2026-11.md:566`) |

No lockfile: a gate run describes "today's resolution, not what prod ran"
(`[PR182] docs/ORCHESTRATION-DESIGN-2026-10.md:624-625`; P13c adds one, `SHIP-PLAN-2026-11.md:1236`).

### 1.2 Boot path and the single transaction

- `backend/start.sh:6` `set -e`; `:9` `alembic upgrade head`; `:12` `exec uvicorn …`. Every
  pending migration runs at **every boot** (`CLAUDE.md:123-124`). On **Railway** (Railway-era
  fact) a raise crash-loops the new container and the old one keeps serving
  (`docs/HANDOFF-2026-07-28-open-work.md:68-70`). On the self-hosted host (runbook R5: build,
  `up -d`) a raising migration restart-loops the **only** backend container — an outage, not a
  fail-safe (`[PR182] docs/program/w2/O-08-design.md:82,84`); every phase after `T_close` deploys
  that way (`SHIP-PLAN-2026-11.md:79`), and the P4c train applies all pending migrations in one
  deploy (`:735`).
- `backend/alembic/env.py:50` — `context.configure(connection=connection, target_metadata=target_metadata)`:
  no `transaction_per_migration`, so **all pending revisions share one transaction**
  (`docs/HANDOFF-2026-07-28-open-work.md:111-112`; `0044_event_kind_check_and_media_fk.py:58-59`).
  A lock taken early is held to the end of the batch.
- `env.py:28` takes the URL from `settings.database_url`; `env.py:56-60` migrates on a
  `NullPool` engine.

### 1.3 Migration chain

- Head **0046** (`backend/alembic/versions/0046_seed_dispatch_cursor.py:46-47`, `revision = "0046"`
  ← `"0045"`); next free slot **0047** (`CLAUDE.md:120-121`). Both agree on 2026-11-04.
- Plan: take the next free slot **at rebase time**, check the `down_revision` chain, update the
  CLAUDE.md head in the same PR (`[PR182] docs/program/SHIP-PLAN-2026-11.md:85-86`); ruling R6:
  no pre-assigned numbers — w2's "0047/0048/0049" are not binding (`SHIP-PLAN-2026-11.md:1480-1482`).
- True head = end of the `down_revision` chain (`CLAUDE.md:385-386`). Deep-health's drift check
  uses the **highest filename** instead (`backend/app/features/ops/health.py:81`, compared with
  `alembic_version` at `:88`).

### 1.4 Constraint precedents (the rule in `CLAUDE.md:121-124`)

| Revision | What | Shape | Cite |
| --- | --- | --- | --- |
| 0020 | `shop_id` FKs | NOT VALID + VALIDATE same migration; seed precedes, every value `'default'` | `0020_tenancy_root.py:11-15,107` |
| 0021 | `job.customer_id` FK | same migration; "all-NULL new column → provably clean" | `0021_customer.py:108,113` |
| 0032 → 0033 | seven tech-ref FKs | NOT VALID only; VALIDATE a **separate deploy** after `scripts/audit_tech_orphans.py` read 0 orphans | `0032_integrity.py:19-22`; `0033_validate_tech_fks.py:13-17,51`; `backend/scripts/audit_tech_orphans.py:7-9` |
| 0038 | `job_payment_amount_positive` CHECK | NOT VALID; follow-up VALIDATE **still unrun** (`O07-F8`) | `0038_job_payment_amount_guard.py:15-19,27-28,51`; `[PR182] docs/program/G2-deep-dive-gate-2026-11-01.md:207` |
| 0044 → 0045 | `job_event_kind_check` | NOT VALID, then VALIDATE in its own deploy after the audit query | `0044_event_kind_check_and_media_fk.py:15-20,83-84`; `0045_validate_event_kind_check.py:13-19,49` |
| 0046 | `dispatch_cursor` seed | `ON CONFLICT (consumer) DO NOTHING`; the dispatcher invariant | `0046_seed_dispatch_cursor.py:55-60`; `CLAUDE.md:234` |

All migration paths above are under `backend/alembic/versions/`.

### 1.5 Lock behaviour (FixFlow comments only — see the source limit above)

- ADD CONSTRAINT … NOT VALID: "the ACCESS EXCLUSIVE lock on job_event", so 0044 backfills first
  and adds the constraint last, "held for microseconds at the very end" (`0044…py:58-62`).
- VALIDATE: "only a SHARE UPDATE EXCLUSIVE lock, so concurrent reads and writes … continue"
  (`0045…py:30-32`; `0033…py:10-11`).
- Nullable, no-default ADD COLUMN: "catalog-only (instant, no table rewrite)" (`0043_job_lifecycle_contract.py:29-30`).
- `SET LOCAL lock_timeout = '3s'` — the only `lock_timeout` in `backend/` (`0044…py:57`; reason `:54-56`).
- CREATE INDEX CONCURRENTLY: **no FixFlow precedent** (no `concurrently` / `autocommit_block` in
  `backend/alembic`, grep 2026-11-04). INFERRED: it cannot run inside the one transaction
  `env.py` opens. UNVERIFIED until `https://www.postgresql.org/docs/17/sql-createindex.html` is fetched.
- Detail and the full table: `references/postgres-migration-safety.md` §1-2.

### 1.6 What CI proves and what it cannot

- CI: `postgres:17-alpine` since P3a (#195, 2026-11-13; the backend job's `services.postgres.image` in `ci.yml`; it was `postgres:16-alpine` at `a31924a`, `ci.yml:88`), `alembic upgrade head` (`:132`; the step name at
  `:131` still says "0001→0003"), `alembic check` (`:135`), `pytest` (`:138`).
- `alembic check` **cannot see CHECK constraints** — "A wrong or missing CHECK ships green"
  (`docs/HANDOFF-2026-07-28-open-work.md:113-116`).
- CI migrates an **empty** DB: "any backfill is untested code reaching prod" (`handoff:117-118`).
- Tests build the schema with `create_all` (`backend/tests/conftest.py:119`), skip every
  `@integration` test when `FIXFLOW_TEST_DATABASE_URL` is unset (`conftest.py:39,65-72`), and
  truncate per test (`:125`). Two pytest processes on one DB deadlock on `create_all`'s
  AccessExclusiveLock (`handoff:132-134`).
- 0041 imports runtime code (`0041_staff_ledger_chain.py:33`); P8b generalises that module
  (`SHIP-PLAN-2026-11.md:1078-1081`) — an empty-DB CI run will not notice a changed backfill (INFERRED).

### 1.7 Engine, sessions, settings

- `backend/app/core/db.py:22` — `create_async_engine(settings.database_url, pool_pre_ping=True, future=True)`;
  `:21` "avoids stale connections after Supabase / Postgres restarts". **No** `pool_size`,
  `max_overflow`, `pool_recycle` or asyncpg `statement_cache_size` anywhere in `backend/` (grep
  2026-11-04) — SQLAlchemy defaults apply (values UNVERIFIED for the installed version).
- `db.py:24-28` `async_sessionmaker(… expire_on_commit=False …)`; `get_session` (`:36-39`) only
  yields — "commit/rollback is the service's responsibility" (`db.py:4-5`).
- `Session.rollback()` unwinds the **outermost** transaction; an expected duplicate-key
  collision is recovered in a savepoint (`backend/app/features/customer_messaging/repository.py:38-46`;
  `CLAUDE.md:243-245`). A batch loop that rolls back the session loses every prior row
  (`handoff:439-443`).
- Atomic state changes are conditional UPDATEs — `try_transition` (`backend/app/features/jobs/repository.py:75-87`).
- Settings: `backend/app/core/config.py:21-27` — `env_prefix="FIXFLOW_"`, `case_sensitive=False`,
  `extra="ignore"` (INFERRED consequence: a misspelt `FIXFLOW_*` variable is silently ignored and
  the default applies). `database_url` (`:30`) is coerced to `postgresql+asyncpg://` by
  `_ensure_async_driver` (`:234-253`). Boot guard `assert_safe_for_production` (`:223-232`);
  P1 hardens it (`SHIP-PLAN-2026-11.md:330-334`). Gates: `enable_scheduler` (`:179`),
  `enable_dispatcher` = False (`:188`), `backup_enabled` (`:197`).
- The DB is reached through the Supabase IPv4 **session** pooler (`CLAUDE.md:30`); "never the
  transaction pooler (port 6543)" (`docs/RUNBOOK-BACKUPS.md:104-107`). asyncpg prepared statements
  through that pooler: **UNVERIFIED** (no code or doc in the repo addresses it). After the
  self-host cutover the DB is box-local and `pool_pre_ping` "costs sub-millisecond instead of
  230 ms" (`[PR182] docs/program/w2/O-08-design.md:70`, a DERIVED figure there).

### 1.8 Phases and register ids this skill serves

Headings are `[PR182] docs/program/SHIP-PLAN-2026-11.md`. Ids: `[PR182] docs/program/G2-deep-dive-gate-2026-11-01.md`,
`docs/program/evidence/w2/O-04.txt`, `O-06.txt`, `O-07.txt`, and
`[PR182] docs/program/HARNESS-REVIEW-2026-11-01.md` (`O04-F18`, `:239`).

| Phase (line) | Migration | What this skill checks there | Ids |
| --- | --- | --- | --- |
| P1 (`:317`) | none | skip-aware gate fails on any skipped `@integration` (`:361-364`); CI step failing when CLAUDE.md's head ≠ chain head (`:365-366`); `FIXFLOW_ENVIRONMENT=test` in Appendix A (`:333`); boot-guard settings | `O6-F01`, `O04-F12` (ceiling 48 → 240 h, `:356`) |
| P6a (`:928`) | none | settings/timezone validator; read queries (`DISTINCT ON`, `:944`) | `O04-F3`, `F4`, `F8`, `F9`, `F10`, `F18` |
| P6b-1 (`:955`) | one | adjustment `action` CHECK + `client_id` partial unique (O-04 sketch `w2/O-04-design.md:53`); `payroll_export.version` + new UNIQUE replacing the window key (`:965`); `alembic check` in Done-when (`:971`) | `O04-F1`, `F2`, `F5`, `F6`, `F7`, `F11`, `F13`, `F15` |
| P6b-2 (`:976`) | one | `app_event` index; the dry-run read-only **audit script** for P13d (`:984-985`) | `O04-F4`, `O10-F7` |
| P7a (`:989`) | none | atomic closed-job guards (conditional UPDATE, or `FOR UPDATE` + `populate_existing()`), two-session READ COMMITTED race test (`:1001-1005`) | `O04-F16`, `O07-F5`, `O07-F15`, `O07-F16` |
| P8a (`:1054`) | one | `voided_at`/`voided_by` FK same migration (all-NULL); `recorded_by` FK **NOT VALID** only (`:1057-1061`) | `O6-F08`, `O07-F5`, `O07-F7` |
| P8b (`:1068`) | one | append-only `job_bill_revision`; chain backfill on the 0041 precedent, verify test on a DB seeded with payments (`:1078-1081`) | `O6-F07`, `O6-F08`, `O6-F09` |
| P9a-1 (`:1134`) | one | posting tables with immutability triggers; gapless `seq` under `pg_advisory_xact_lock` (`:1139-1140`); "`UPDATE posting` refused in real Postgres" (`:1149-1150`) | `O07-F6`, `O07-F11`, `O07-F14`, `O07-F17` |
| P13a (`:1215`) | one | role split, `REVOKE` on append-only tables, `start.sh` migrates as the migrator; "app role cannot `UPDATE job_event` in a test" (`:1217-1220`) | `O6-F18` |
| P13d (`:1238-1242`) | three files | fence partial unique index, VALIDATE `job_payment_amount_positive`, VALIDATE `recorded_by` — after the audit re-run immediately before the deploy | `O07-F8` |

## 2. Procedure

### 2.1 Writing or reviewing a migration

1. **Find the head from the chain**: `grep -h "^revision\|^down_revision" backend/alembic/versions/*.py`
   (`CLAUDE.md:386`). Use head+1 at rebase time; the same PR edits `CLAUDE.md:29` and `:120-121`.
2. **Classify every statement** (`references/postgres-migration-safety.md` §3): new empty table
   → inline VALID constraints (`[PR182] docs/program/w2/O-07-design.md:74`); populated table,
   provably clean (seed precedes / all-NULL new column / constant default / backfill writing only
   real references) → NOT VALID + VALIDATE in the same file; populated with human data → NOT
   VALID only, VALIDATE in a later migration and deploy.
3. **Order for the shared transaction**: backfills before ACCESS EXCLUSIVE statements; add
   `SET LOCAL lock_timeout` when a hot table is touched (`0044…py:54-62`). Remember the other
   pending revisions in the same boot share the transaction (§1.2).
4. **Never raise on real data**: no cast that can overflow, idempotent `WHERE … IS NULL`
   backfills that leave unresolvable rows NULL (`0044…py:28-31,67-72`). Seeds go in migrations;
   fuzzy backfills are dry-run-default scripts in `backend/scripts/` (`CLAUDE.md:125-126`).
5. **Downgrade body**: a VALIDATE or a seed gets a deliberate no-op with its reason
   (`0045…py:52-58`, `0046…py:64-81`); a backfill is not reversed (`0044…py:89-90`).
6. **Tests the gates will not write for you**: an `@integration` test that writes a value each new
   CHECK must refuse (`handoff:115-116`); a data-bearing migration test when a backfill or
   VALIDATE matters (`references/postgres-migration-safety.md` §6); real-Postgres trigger/grant
   tests for append-only tables (P9a-1, P13a rows above).
7. **Money columns**: integer minor units; existing `*_paisa`, new `*_minor` (`CLAUDE.md:116-118`).
8. **Run the gates** only when the brief says "runs commands": design Appendix A, fixed names,
   one pytest per DB (`references/gates-and-restore-verify.md` §1). Report every `GATE[…] EXIT=`
   line and the skipped `@integration` count.
9. **For a deferred VALIDATE**: write or extend the read-only, dry-run audit script
   (template `backend/scripts/audit_tech_orphans.py:1-9`; P6b-2 owns the P13d one).
10. `[owner]` runs that audit on the box **immediately before** the VALIDATE deploy and records the
    output (`SHIP-PLAN-2026-11.md:87-88`, `:1238-1240`). The agent's procedure stops here.
11. `[owner]` deploys (runbook R5 / the deploy train; no backend deploy from `main` before P4c,
    `SHIP-PLAN-2026-11.md:100-101`) and verifies by content — `/api/ops/health` shows
    "head 00NN" (`health.py:104`) and `FIXFLOW_GIT_SHA` (`SHIP-PLAN-2026-11.md:79-81`).
12. `[owner]` if the boot crash-loops: no rollback button, no downgrade; roll forward, revert the
    env variable, or hand-edit `alembic_version` (`handoff:80-86`).

### 2.2 Engine, pool or settings change

1. Keep `pool_pre_ping=True` in `db.py:22` and its test mirror (`conftest.py:116`).
2. Any new pool argument names the pooler mode it assumes (session, `CLAUDE.md:30`) and the
   post-cutover box-local DB; state asyncpg prepared-statement behaviour as UNVERIFIED unless a
   command in this run proved it.
3. A new setting: `FIXFLOW_` prefix, typed, feature switches default **off**, secrets compared
   with `compare_secret` (`backend/app/core/security.py:22`, `:30`; `CLAUDE.md:134-139`), never
   logged; deep-health exposes booleans only (`health.py:107-115`).
4. `[owner]` sets or changes any production env value (`FIXFLOW_DATABASE_URL`, secrets,
   `FIXFLOW_ENABLE_DISPATCHER`) — enabling the dispatcher is a separate owner-approved step
   (`SHIP-PLAN-2026-11.md:102-104`).

### 2.3 Restore-and-verify

1. `[owner]` produces the dump (P0a step 4, `SHIP-PLAN-2026-11.md:244-249`) and passes its path.
2. Restore into `fixflow-w1-restore` on `postgres:17-alpine` only (design Appendix C); run the
   Appendix B set; return `DUMPFACTS` (`references/gates-and-restore-verify.md` §2).
3. Compare with the 2026-08-02 baseline (`docs/RUNBOOK-BACKUPS.md:128`): exact counts, money,
   sequences, `alembic_version`, NOT VALID constraints still listed.
4. Remove the restore container (`docker rm -f fixflow-w1-restore`, design `:705`) and the
   `fixflow-w1` network only. Never delete, move or copy the dump file — it is the owner's P0a
   copy that P3b restores again (`SHIP-PLAN-2026-11.md:610-611`); deleting it is `[owner]`.
5. `[owner]` any restore over live data, repoint or redeploy (`RUNBOOK-BACKUPS.md:41-49,57-62`).

## 3. Checks (read-only; what each proves)

| Command (from the repo root unless noted) | Proves |
| --- | --- |
| `grep -h "^revision\|^down_revision" backend/alembic/versions/*.py` | the chain head and no duplicate `revision` (a duplicate fails every Alembic command, `handoff:95-98`) |
| `grep -n "NOT VALID\|postgresql_not_valid\|VALIDATE CONSTRAINT" <new migration>` | which constraints are two-step and whether VALIDATE shares the file |
| `grep -n "transaction_per_migration" backend/alembic/env.py` (empty on 2026-11-04; a recursive grep of `backend/alembic` also hits the comment at `0044…py:59`) | the single-transaction batch still holds |
| `grep -rn -i "lock_timeout\|concurrently\|autocommit_block" backend/alembic` | lock handling in play; on 2026-11-04 only `0044…py:57` |
| `grep -rn "CheckConstraint\|create_check_constraint\|CHECK (" <slice>/models.py <migration>` | the CHECKs `alembic check` will not compare — each needs an `@integration` test |
| `grep -rn "pool_size\|max_overflow\|pool_recycle\|statement_cache" backend/app` (empty on 2026-11-04) | engine still on defaults + `pool_pre_ping` |
| `grep -n "integration" <test file>` and the pytest `-rs` summary | the new tests are `@integration` and none were skipped |
| Appendix A output: every `GATE[…] EXIT=0`, `SUMMARY FAIL=0` | chain applies to an empty Postgres of that major; models match except CHECKs/backfills |
| Appendix C: `RESTORE EXIT=0`, `QUERIES EXIT=0` | the dump restores whole; Appendix B facts are complete, not partial |
| In the restore container: `SELECT conrelid::regclass, conname FROM pg_constraint WHERE NOT convalidated;` | which constraints are still NOT VALID (`job_payment_amount_positive` until P13d) |

A check proves only its row. A green gate run never proves a prod-data property.

## 4. Forbidden actions

| Never | Rule it comes from |
| --- | --- |
| `alembic downgrade`, in any situation | `docs/HANDOFF-2026-07-28-open-work.md:76-79` ("a data-loss tool, not a rollback tool") |
| Railway's rollback button once code and DB heads diverge | `handoff:80-86` |
| VALIDATE in the same deploy as NOT VALID on months of human data | `CLAUDE.md:121-124`; `SHIP-PLAN-2026-11.md:86-88` |
| Widening a CHECK because the audit found an unknown value | `0045…py:25-28` |
| `create_all` (or any non-Alembic DDL) as a schema path | `CLAUDE.md:119-120` — any `models.py` change needs a migration |
| Floats for money; a money feed driven by the `job_event` cursor | `CLAUDE.md:116`; standing rule 7, `SHIP-PLAN-2026-11.md:114-115` |
| Session-wide `rollback()` to recover from an expected IntegrityError mid-unit | `CLAUDE.md:243-245` |
| Two pytest processes against one DB | `handoff:132-134`; design `:620-623` |
| Restoring a reverted migration file verbatim | `handoff:95-99` — renumber to head+1 |
| Deploying from the repo root; re-running `railway up --ci` after its timeout | `CLAUDE.md:88-89`; `handoff:64-66` |
| Any agent deploy, `railway run`, prod SQL, prod VALIDATE, restore over live data, role grant | README rule 4; `SHIP-PLAN-2026-11.md:1219` ("the owner applies the roles"); design `:628` |
| Enabling the dispatcher | standing rule 4, `SHIP-PLAN-2026-11.md:102-104` |
| RLS / GoTrue / PostgREST / Supabase Storage as a fix | `CLAUDE.md:30` |
| Quoting a DSN, password or secret value (incl. CI/compose throwaway ones) | README rule 3; refer to `FIXFLOW_DATABASE_URL` by name |

## 5. Where upstream disagrees

Upstream = ECC `skills/fastapi-patterns/SKILL.md` @ b38be6a (see `UPSTREAM.md`).

1. **`:53-56`** "Automatically create tables on startup for ease of use in dev/demo environments"
   + `Base.metadata.create_all` in the lifespan. FixFlow wins: the schema is Alembic's, and
   `start.sh:9` already migrates at boot; `create_all` would hide drift `alembic check` exists to catch (`CLAUDE.md:119-120`).
2. **`:405`** `TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"`. FixFlow wins: SQLite has no
   NOT VALID, no lock levels, no partial indexes or triggers; FixFlow tests against real Postgres
   (`ci.yml:88`; `CLAUDE.md:100-101`).
3. **`:169`, `:176`, `:321`** `jose`, `OAuth2PasswordBearer`, `CryptContext(schemes=["bcrypt"]…)`.
   FixFlow wins: name/PIN login, PBKDF2-hashed PIN, `token_version` revocation (`CLAUDE.md:31`).
4. **`:248`** `HTTPException(status_code=400, detail="Email already registered")`. FixFlow wins
   for lifecycle conflicts: a 409 whose plain-text `detail` ends `(current status: X)`, which three
   clients regex (`CLAUDE.md:188-189`).
5. **`:346-348`, `:369-371`** `except IntegrityError: await self.db.rollback()`. FixFlow wins:
   that unwinds the outermost transaction and everything pending with it; use a savepoint
   (`CLAUDE.md:243-245`; `customer_messaging/repository.py:38-46`) and idempotency via unique
   indexes + `client_id`.
6. **`:179-185`** `get_db` rolls back on any exception. Not adopted: FixFlow's `get_session`
   only yields; the service owns commit/rollback (`db.py:4-5`, `:36-39`).
7. **`:95`, `:102`** settings with no env prefix and a `secret_key` with no boot guard. FixFlow
   uses the `FIXFLOW_` prefix (`config.py:24`) and a boot guard (`:223-232`), but the guard
   only runs when `is_production` is true (`:218-222`; default `environment = "dev"`, `:160`), so
   off Railway it **fails open** (`O6-F01` CONFIRMED, `[PR182] docs/program/G2-deep-dive-gate-2026-11-01.md:26`);
   P1 makes it fail closed (`SHIP-PLAN-2026-11.md:330-334`). Never cite the current guard as
   fixing `O6-F01`.
8. **`:14-34`** `routers/ models/ schemas/ services/` layout. FixFlow wins: vertical slices
   `router → service → repository` enforced by import-linter (`CLAUDE.md:257`; `backend/pyproject.toml:99-102`).

Taken where FixFlow already does the same: async-only DB calls (upstream `:493-502`), DB unique
index under app-level dedupe (`:389`), typed `response_model` (`:509`) —
`references/ecc-fastapi-patterns-trimmed.md`. A rule for P7a, not current practice: deterministic
`order_by` on offset/limit pagination (`:513`); `backend/app` has no such pagination on
2026-11-04, and P7a adds opt-in pagination (`SHIP-PLAN-2026-11.md:1010`).

## 6. References

- `references/postgres-migration-safety.md` — lock table with sources, the single-transaction
  consequences, the NOT VALID decision, downgrades, `alembic check` blind spots, the
  data-bearing migration test proposal, numbering.
- `references/gates-and-restore-verify.md` — design Appendix A gate shape, the skip trap,
  Appendix B/C restore-and-verify, the 2026-08-02 baseline, owner-only restore steps.
- `references/ecc-fastapi-patterns-trimmed.md` — the upstream sections taken (MIT, trimmed).
- docs/ORCHESTRATION-DESIGN-2026-10.md and docs/program/* are on PR #182 (head 3415b5e) at write time; their line numbers refer to that head.
