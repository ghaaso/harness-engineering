<!-- Authored for FixFlow, 2026-11-04 -->
# FixFlow restore, backup prefixes and drill evidence

PR #182 docs (plan, O-08 design, orchestration design) are on PR #182 (head 3415b5e) at write
time; their line numbers refer to that head. Worktree paths are on `main` @ a31924a.

## 1. What the app's own backup does (code on `main`)

- `pg_dump --format=custom --schema=public --no-owner --no-privileges` (`backend/app/core/backup.py:88-92`).
- Key `fixflow-db-<YYYYMMDDTHHMMSSZ>.dump` under `settings.backup_prefix`; keys not matching
  `_KEY_RE` are never pruned (`backend/app/core/backup.py:37`, :16-18).
- **After every upload it lists the prefix and deletes every matching key older than
  `backup_retention_days`** (`backend/app/core/backup.py:125-131`). Defaults: `backup_enabled`
  True, retention 30, prefix `backups/db/` (`backend/app/core/config.py:197`, :201, :202). The
  newest pre-death dump known is `fixflow-db-20260802T023008Z.dump` (`docs/RUNBOOK-BACKUPS.md:128`),
  so a new stack on the default prefix deletes it on its first 02:30 run (`O08-F02`).
- Registered only when `enable_scheduler` and `backup_enabled` (`backend/app/main.py:189`, :192, :198).

## 2. Prefixes the plan uses (P3a/P3c/P13b)

| Prefix | Writer | Retention | Source |
| --- | --- | --- | --- |
| `backups/db/` | old Railway stack | never write from the new stack | plan :512; O08-F02 |
| `archive/pre-selfhost/` | owner copy, first | none | O-08-design.md:47 |
| `backups/db-selfhost/` | nightly 02:30 | 30 days | plan :512, :644 |
| `backups/db-hourly/` | host cron -> `run_db_backup` | 72 h | plan :543-545 |
| `archive/post-drain/` | after each P4a/P4b/P4r row | none (no-prune mode, P3a adds it) | plan :546-547 |
| `archive/pre-drain/`, `archive/manifests/` | B5 snapshot, drain manifests | none | plan :536-549 |

All plaintext under the app credential until P13b (`O6-F06`; plan :1298). P13b: `age` to the
owner's offline key, separate bucket/prefix, put-only token, lifecycle retention, provider
snapshots off after an encrypted pair passes a drill (plan :1225-1230).

## 3. Production restore order (owner runs it; P3b step 3, R9 in P13e)

1. Postgres alone (`--profile db`); the backend must not start first — on an empty DB alembic
   builds a schema and seeds `dispatch_cursor`, then the restore collides (O-08-design.md:43).
2. Archive first: copy the dumps to `archive/pre-selfhost/` and the laptop (O-08-design.md:47).
3. As the DB owner `fixflow_app`: `DROP SCHEMA public CASCADE; CREATE SCHEMA public`, copy the dump
   into the container, `pg_restore --exit-on-error -U fixflow_app -d fixflow` (plan :528-531).
4. Appendix B via `psql -f`; every check passes before `--profile app --profile web` (plan :532-533;
   O-08-design.md:48-54).
5. Rollback: never `alembic downgrade`; never an image below the DB's applied head (O-08-design.md:58).

`docs/RUNBOOK-BACKUPS.md:45` omits `--exit-on-error` (the benign "schema public already exists"
error, :94-97); O-08 and Appendix C drop the schema first so `--exit-on-error` stops only on real
failures (O-08-design.md:47; `docs/ORCHESTRATION-DESIGN-2026-10.md:697-701`). Both are documented;
the self-host runbook uses the O-08 form.

## 4. The verification gate (Appendix B, `docs/ORCHESTRATION-DESIGN-2026-10.md:668-686`)

What each line proves, and the floor it is compared with (O-08-design.md:49-53):

| Check | Floor / rule |
| --- | --- |
| `alembic_version` | 0045 or 0046; never above code head 0046 |
| exact `count(*)` per public table (never `n_live_tup`) | at or above the 2026-08-02 drill: 42 app tables + `alembic_version`, 3,268 rows |
| `job_payment` non-voided sum | Rs 34,400 (3,440,000 paisa) at that drill |
| `staff_ledger`, `staff_ledger_chain` counts, chain head | chain verified later via `GET /api/attendance/ledger/verify` |
| `pg_sequences` | `job_token_seq`, `job_event_seq`, `shop_setting_seq` each ≥ its table max (a low sequence makes every write a 500 while reads stay green) |
| `dispatch_cursor` | the whatsapp row exists near max `job_event.seq`; `ENABLE_DISPATCHER=false` read from the file |
| `attendance_geofence` | active row with the workshop coordinates; a (0,0) or inactive fence makes every phone stop geofencing |
| max timestamps | `T_restore` recorded (plan :597-598) |

## 5. Disposable drill (the agent may run this locally when its brief says "runs commands")

Appendix C (`docs/ORCHESTRATION-DESIGN-2026-10.md:690-706`): a `postgres:17-alpine` container
named `fixflow-w1-restore`, separate from the gates' test DB, dump copied in, `DROP SCHEMA public
CASCADE`, `pg_restore --exit-on-error`, Appendix B with `ON_ERROR_STOP=1`, container removed. It
needs a dump path the brief supplies, never a file inside the repo
(`docs/ORCHESTRATION-DESIGN-2026-10.md:692`). The dump carries customer and payment data: keep it
outside the repo and delete the local copy after the drill (`docs/RUNBOOK-BACKUPS.md:86`).

Classify each drill with the bolens taxonomy (`references/backup-restore-verification.md`
"Result"): **recoverable** (restore exit 0, every Appendix B row at or above its floor, one
representative operation proven), **partially proven** (restore ok, a check skipped or below floor),
**failed**, **blocked** (no dump, `DOCKER_ENGINE_DOWN`). Record backup timestamp, measured restore
time and gaps separately (`references/service-recovery-drill.md` "Restore and prove usability").
Append a row to the drill log (`docs/RUNBOOK-BACKUPS.md:123-128`) only in a code phase's PR.

## 6. pg_dump vs pgBackRest

T1 = nightly `pg_dump` (RPO up to 24 h); T2 = pgBackRest WAL archiving, only if the owner's RPO
needs minutes (O-08-design.md:35). The plan answers RPO with hourly dumps: 1 h from the first
drain until P13e, 24 h after (plan :1312). `pg_dump` is not PITR (R-03 F8,
`docs/program/evidence/w1/R-03.txt:20`). pgBackRest is not in any phase's Scope.

WEB (fetched 2026-11-04, https://www.postgresql.org/docs/17/app-pgdump.html): "pg_dump cannot dump
from PostgreSQL servers newer than its own major version"; loading into an older major "is not
guaranteed". WEB (fetched 2026-11-04, https://www.postgresql.org/docs/17/app-pgrestore.html):
`--exit-on-error` default is to continue and count errors; `--single-transaction` implies
`--exit-on-error`; `-j` needs custom/directory format and cannot combine with `--single-transaction`.
