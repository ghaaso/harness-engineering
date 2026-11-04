<!-- Authored for FixFlow, 2026-11-04 -->

# Postgres migration safety — FixFlow detail

Companion to `../SKILL.md`. Every FixFlow claim is `path:line` (paths from the repo root);
`[PR182]` marks a file on PR #182 (head 3415b5e). Tags: **CODE** (read in the repo on
2026-11-04), **INFERRED** (reasoned, not read or fetched), **UNVERIFIED** (needs a fetch or a
command nobody ran).

**Source limit, stated once.** No PostgreSQL manual page was fetched on 2026-11-04
(`WEB_UNAVAILABLE: postgres lock levels` — the row did not require web research). Every lock
level below is cited to a **FixFlow code comment**, which is the repo's own claim, not a primary
source. Before a lock claim decides a design, fetch
`https://www.postgresql.org/docs/17/sql-altertable.html` (ADD CONSTRAINT / VALIDATE) and
`https://www.postgresql.org/docs/17/sql-createindex.html` (CONCURRENTLY) and cite them with the
fetch date. Prod is Postgres 17 (`backend/Dockerfile:12-13`), CI is 16 (`.github/workflows/ci.yml:88`).

## 1. Lock levels as FixFlow's code states them

| Statement | What FixFlow says | Cite | Tag |
| --- | --- | --- | --- |
| `ALTER TABLE … ADD CONSTRAINT … CHECK (…) NOT VALID` | takes "the ACCESS EXCLUSIVE lock" on the table, held to the end of the (shared) transaction | `backend/alembic/versions/0044_event_kind_check_and_media_fk.py:59-62` | CODE (comment) |
| FK `NOT VALID` | "a brief lock that enforces on new writes immediately" | `backend/alembic/versions/0020_tenancy_root.py:13-14` | CODE (comment) |
| `ALTER TABLE … VALIDATE CONSTRAINT` | "only a SHARE UPDATE EXCLUSIVE lock, so concurrent reads and writes … continue during the scan" | `backend/alembic/versions/0045_validate_event_kind_check.py:30-32`; also `0033_validate_tech_fks.py:10-11`, `0020_tenancy_root.py:14-15` | CODE (comment) |
| `ADD COLUMN` nullable, no default | "catalog-only (instant, no table rewrite)" | `backend/alembic/versions/0043_job_lifecycle_contract.py:29-30` | CODE (comment) |
| `ADD COLUMN … NOT NULL DEFAULT <constant>` (O-04's 0047 sketch) | no FixFlow statement | `[PR182] docs/program/w2/O-04-design.md:53` | UNVERIFIED (INFERRED: catalog-only on PG ≥ 11 for a non-volatile default) |
| `CREATE INDEX` (plain) | "the table is small, so a plain CREATE INDEX is fine" (for `app_event`) | `[PR182] docs/program/w2/O-04-design.md:54` | CODE-of-design; lock level UNVERIFIED (INFERRED: blocks writes for the build) |
| `CREATE INDEX CONCURRENTLY` | no FixFlow precedent — `grep -rn -i concurrently backend/alembic` is empty on 2026-11-04 | — | UNVERIFIED (INFERRED: cannot run inside a transaction block, so in this repo it would need Alembic's `autocommit_block()`, which nothing here uses) |
| `Base.metadata.create_all` (tests) | "takes an AccessExclusiveLock and they deadlock" with two pytest processes | `docs/HANDOFF-2026-07-28-open-work.md:132-133` | CODE (doc, observed) |

## 2. Why one transaction changes everything here

- `backend/alembic/env.py:50` calls `context.configure(connection=connection, target_metadata=target_metadata)`
  with no `transaction_per_migration`; `env.py:51-52` wraps **all** pending revisions in one
  `begin_transaction()`. The handoff states the consequence: "all pending migrations run in
  **one transaction**" (`docs/HANDOFF-2026-07-28-open-work.md:111-112`).
- `backend/start.sh:6` `set -e` and `:9` `alembic upgrade head` run that transaction at every
  boot. On **Railway** (Railway-era fact) a raise exits the new container and the old one keeps
  serving (`docs/HANDOFF-2026-07-28-open-work.md:68-70`). On the self-hosted host (runbook R5:
  build, `up -d`) a raising migration restart-loops the **only** backend container — an outage,
  not a fail-safe (`[PR182] docs/program/w2/O-08-design.md:82,84`).
- Consequences FixFlow already designs around:
  - a lock taken early is held across every later revision in the batch — so 0044 runs its
    full-table `UPDATE job_media` **before** its `ADD CONSTRAINT`
    (`0044_event_kind_check_and_media_fk.py:58-62`);
  - `SET LOCAL lock_timeout = '3s'` makes a blocked boot fail fast instead of queueing behind a
    long read (`0044_event_kind_check_and_media_fk.py:54-57`) — the only `lock_timeout` in
    `backend/` (grep, 2026-11-04);
  - a statement that can raise on real data is a failed boot — 0044 compares as text rather
    than casting (`0044_event_kind_check_and_media_fk.py:67-72`).
- **INFERRED consequence the plan text does not state:** "each in its own migration file so one
  failure cannot block the others" (`[PR182] docs/program/SHIP-PLAN-2026-11.md:1242`) holds only
  if each file reaches prod in its **own deploy**. If P13d's three files are pending at one boot,
  they share the one transaction above: the third failing rolls back the first two and the
  container crash-loops. Raise it; do not resolve it by adding `transaction_per_migration`
  without an owner decision (it changes 0043/0044's lock ordering argument).

## 3. NOT VALID / VALIDATE — the decision

Rule: `CLAUDE.md:121-124` and `[PR182] docs/program/SHIP-PLAN-2026-11.md:85-88`.

1. **New, empty table** → inline VALID FKs/CHECKs (`[PR182] docs/program/w2/O-07-design.md:74`).
2. **Populated table, provably clean** → `NOT VALID` then `VALIDATE` in the **same** migration.
   "Provably clean" has exactly three shapes in this repo:
   - the referenced row is seeded earlier in the same migration and every value is the
     constant (`0020_tenancy_root.py:11-15`, loop at `:104-107`);
   - a new all-NULL column (`0021_customer.py:108-113`; plan P8a `voided_at`/`voided_by`,
     `[PR182] docs/program/SHIP-PLAN-2026-11.md:1057-1058`);
   - a backfill in the same migration that only writes values referencing real rows
     (`0032_integrity.py:14,74`), or a constant server default
     (`[PR182] docs/program/w2/O-04-design.md:53`).
3. **Populated with months of human data** → `NOT VALID` only. `VALIDATE` is a **later
   migration in its own deploy**, opened only after a dry-run, read-only audit script reads clean
   against prod immediately before that deploy. Precedents: 0032 → `scripts/audit_tech_orphans.py`
   (`backend/scripts/audit_tech_orphans.py:7-9`) → 0033 (`0033_validate_tech_fks.py:13-17,51`);
   0044 → audit query → 0045 (`0045_validate_event_kind_check.py:13-19,49`).
4. Still owed: `job_payment_amount_positive` (`0038_job_payment_amount_guard.py:15-19,27-28,51`;
   `O07-F8`, `[PR182] docs/program/G2-deep-dive-gate-2026-11-01.md:207`) and the P8a
   `recorded_by` FK — both in P13d, each its own file (`[PR182] docs/program/SHIP-PLAN-2026-11.md:1238-1242`).
5. If the audit finds an off-vocabulary value: "do NOT widen the CHECK reflexively"
   (`0045_validate_event_kind_check.py:25-28`) — fix the writer, repair the rows.

## 4. Downgrades

- Never run one: "39 of 46 downgrade bodies drop a table or column"
  (`docs/HANDOFF-2026-07-28-open-work.md:76-79`).
- Writing one: a VALIDATE or a seed gets a **deliberate no-op** with the reason in a comment
  (`0033_validate_tech_fks.py:54-57`, `0045_validate_event_kind_check.py:52-58`,
  `0046_seed_dispatch_cursor.py:64-81` — deleting the cursor "re-arms the incident"). A backfill
  is not reversed (`0044_event_kind_check_and_media_fk.py:89-90`). Reviewers flag a "symmetric"
  downgrade that destroys data or re-arms an invariant.

## 5. What `alembic check` and CI cannot see

- CHECK constraints: "`alembic check` cannot see CHECK constraints … A wrong or missing CHECK
  ships green" (`docs/HANDOFF-2026-07-28-open-work.md:113-116`). The detector is an
  `@integration` test that writes the refused value against real Postgres.
- `env.py:50` leaves `compare_type` unset, so Alembic's own default applies (UNVERIFIED: True
  since Alembic 1.12 per its changelog, not fetched on 2026-11-04; the pin is `>=1.13`,
  `backend/pyproject.toml:17`). Do not list column type changes as an `alembic check` blind spot.
- Backfills: CI migrates an **empty** DB, "so any backfill is untested code reaching prod"
  (`docs/HANDOFF-2026-07-28-open-work.md:117-118`).
- Migrations that import app code: 0041 imports `app.features.attendance.chain`
  (`0041_staff_ledger_chain.py:33`). Changing that module (P8b generalises it,
  `[PR182] docs/program/SHIP-PLAN-2026-11.md:1078-1081`) changes what 0041 does on a fresh DB,
  and an empty-DB CI run will not notice (INFERRED). Keep 0041's import surface stable or pin a
  copy.
- Test schema: `backend/tests/conftest.py:119` builds the schema with `create_all`, not the
  migrations (`:117` "a no-op if CI already ran `alembic upgrade head`"). A test passing locally
  without a prior `alembic upgrade head` proves the models, not the migration.

## 6. Data-bearing migration test (proposal — no such test exists on 2026-11-04)

INFERRED shape, for a migration whose backfill or VALIDATE matters (handoff §2.3's "write a
migration test if the backfill matters"): on a dedicated empty DB (never the shared test DB —
`create_all` there would pre-create the new columns), `alembic upgrade <head-1>`; insert rows in
the old shape including the edge values the audit looks for; `alembic upgrade head`; assert the
backfilled values, `pg_constraint.convalidated` for the new constraint
(`0033_validate_tech_fks.py:21` names the flag), and that the refused value now raises. One
pytest process per DB (`docs/HANDOFF-2026-07-28-open-work.md:132-134`).

## 7. Numbering and the head

- True head = end of the `down_revision` chain (`CLAUDE.md:385-386`); on 2026-11-04 0046
  (`0046_seed_dispatch_cursor.py:46-47`), next free 0047 (`CLAUDE.md:120-121`).
- Slot is taken at rebase time and CLAUDE.md's head is updated in the same PR
  (`[PR182] docs/program/SHIP-PLAN-2026-11.md:85-86`); w2 numbers are not binding (ruling R6,
  `[PR182] docs/program/SHIP-PLAN-2026-11.md:1480-1482`).
- A reverted migration restored verbatim after its number was reused gives two identical
  `revision` ids, which fails **every** command incl. the boot upgrade; renumber to head+1
  (`docs/HANDOFF-2026-07-28-open-work.md:95-99`).
- Deep-health's drift check takes the **highest filename**, not the chain
  (`backend/app/features/ops/health.py:81`), and compares it to `alembic_version`
  (`health.py:88`, `:98-103`). A branch or duplicate in the chain is invisible to it.
