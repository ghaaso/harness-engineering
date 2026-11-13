<!-- Authored for FixFlow, 2026-11-04 -->

# Backend gates in Docker and restore-and-verify — FixFlow detail

Companion to `../SKILL.md`. `[PR182]` = a file on PR #182 (head 3415b5e); line numbers refer to
that head. Connection strings are **named, never reproduced**: the recipes use throwaway local
container credentials, and copying a DSN into a brief or a log is the habit the secret scan
exists to catch.

## 1. The gate recipe (design Appendix A)

Source: `[PR182] docs/ORCHESTRATION-DESIGN-2026-10.md:630-666`. Run it **only when the brief
says "runs commands"**, after the owner has started Docker Desktop
(`[PR182] docs/ORCHESTRATION-DESIGN-2026-10.md:593-595`). Pass the script inline from Git Bash,
never a mounted `.sh` (heading, `:630`).

Shape (read the source for the exact text; do not retype the DSN):

- `docker info --format '{{.ServerVersion}}'` first; on failure print `DOCKER_ENGINE_DOWN` and
  stop (`:637`).
- Fixed names: network `fixflow-w1`, DB container `fixflow-w1-db`, gates container
  `fixflow-w1-gates`; `docker rm -f` of those names up front is intentional (`:638`,
  `:620-623`). A second start fails on the name conflict — mechanically one pytest per DB.
- DB image `postgres:16-alpine` on 2026-11-04 (`:639`); P3a has merged (#195, 2026-11-13) and CI and the gate script now run `postgres:17-alpine`, as the plan set from
  P3a on (`[PR182] docs/program/SHIP-PLAN-2026-11.md:57-58`, `:566`, `O08-F12`). Record which
  one ran.
- Source mounted read-only and copied to `/work` (`:640`, `:643`) so nothing writes into the repo;
  both `FIXFLOW_DATABASE_URL` and `FIXFLOW_TEST_DATABASE_URL` point at `fixflow-w1-db` (`:641`).
  P1 adds `FIXFLOW_ENVIRONMENT=test` to this container
  (`[PR182] docs/program/SHIP-PLAN-2026-11.md:332-334`).
- Gates in CI order: `ruff format --check .`, `ruff check .`, `mypy app`, `lint-imports`,
  `alembic upgrade head`, `alembic check`, `pytest -p no:cacheprovider -q`, `pip-audit`
  (`:649-650`). Each prints `GATE[<n> <cmd>] EXIT=<rc>`; the run ends `SUMMARY FAIL=<0|1>`
  (`:648`, `:651`). Setup failures print `SETUP[...]` (`:644-646`).
- `docker wait fixflow-w1-gates` with a 600000 ms Bash timeout; **on a timeout run `docker wait`
  again, never a second `docker run`** (`:652`, `:618-619`).
- Logs to the scratchpad log dir, per-gate logs copied out, containers and network removed
  (`:653-656`).
- `backend/Dockerfile` is **not** used for gates (`:664-666`).

What a green run proves: the migration chain applies to an **empty** Postgres of that major and
the models match it, except CHECK constraints and backfills (see
`postgres-migration-safety.md` §5). It proves nothing about prod data.

**Skipped tests are not passes.** `backend/tests/conftest.py:65-72` skips every `@integration`
test when `FIXFLOW_TEST_DATABASE_URL` is unset. Until P1 lands its skip-aware gate
(`[PR182] docs/program/SHIP-PLAN-2026-11.md:361-364`: pytest with `-rs --junitxml`, fail on any
skipped `@integration`), report the skipped count from the pytest summary line beside the exit
code.

Pins are open ranges with no lockfile (`backend/pyproject.toml:11-17`), so a gate run describes
"today's resolution, not what prod ran" (`[PR182] docs/ORCHESTRATION-DESIGN-2026-10.md:624-625`).
Record the resolved versions from `setup-pip.log` when a claim depends on them.

## 2. Restore-and-verify (design Appendix C + B)

Sources: `[PR182] docs/ORCHESTRATION-DESIGN-2026-10.md:668-711`; `docs/RUNBOOK-BACKUPS.md`.

- Separate container `fixflow-w1-restore` on **`postgres:17-alpine`** (`:694`) — prod dumps are
  taken with `pg_dump` 17 from a 17 server and loading into an older major "is not guaranteed"
  (`:709-711`; `backend/Dockerfile:12-13`). Never the gates' test DB: restored evidence must not
  mix with migration seeds or test state (`:710-711`).
- The dump path comes from the brief and is **never a file inside the repo** (`:692`). Dumps
  carry real customer and payment data. Afterwards remove the restore container
  (`docker rm -f fixflow-w1-restore`, `:705`) and the `fixflow-w1` network only. **Never delete,
  move or copy the dump file** — the P0a dump is the owner's copy and P3b restores it again
  (`[PR182] docs/program/SHIP-PLAN-2026-11.md:249`, `:610-611`); deleting it is `[owner]`. The
  runbook's "delete the dump" (`docs/RUNBOOK-BACKUPS.md:86-88`) applies only to a throwaway
  `drill.dump` that the drill itself downloaded (`:73-75`).
- `DROP SCHEMA public CASCADE` first, then `pg_restore --no-owner --no-privileges
  --exit-on-error`; print `RESTORE EXIT=<rc>` — non-zero means the dump facts are partial
  (`:700-702`). Without the drop, the one benign `schema "public" already exists` error appears
  (`docs/RUNBOOK-BACKUPS.md:94-97`).
- Run the fixed Appendix B query set with `ON_ERROR_STOP=1`; print `QUERIES EXIT=<rc>`
  (`:703-704`). It covers: geofence rows, **exact `count(*)` per public table** (never
  `pg_stat` estimates, `:672`, `:614-617`), last sync times, presence accuracy buckets, payments
  and non-voided paisa (`:680`), ledger + chain rows and head seq (`:681`), `max(token)` vs
  `job_token_seq` (`:682`), `dispatch_cursor` (`:683`), sequences vs table max (`:684`),
  `alembic_version` (`:685`). Return them in the design-§5.2 `DUMPFACTS` shape
  (`[PR182] docs/ORCHESTRATION-DESIGN-2026-10.md:462-466`).

Baselines to compare against (the 2026-08-02 42-table drill, `docs/RUNBOOK-BACKUPS.md:128`):
43 public tables (42 app + `alembic_version`), 3,268 rows, `job_payment` 9 rows / Rs 34,400
non-voided, `staff_ledger` and `staff_ledger_chain` empty, `job_event_seq`=90,
`job_token_seq`=1057, restored head 0045 (the dump predated that day's 0046). A dump taken
later must show **no table with fewer rows** than the baseline unless a deletion is explained.

Two read-only additions worth running inside the restore container (INFERRED queries; standard
catalogs):

```sql
-- constraints still NOT VALID (expect job_payment_amount_positive until P13d)
SELECT conrelid::regclass, conname FROM pg_constraint WHERE NOT convalidated ORDER BY 1, 2;
-- the P13d pre-VALIDATE audit, run against the restored copy instead of prod
SELECT count(*) FROM job_payment WHERE amount_paisa <= 0;   -- 0038:23-25 audit; must be 0
```

## 3. Owner-only around a restore

`[owner]` takes the prod dump (`[PR182] docs/program/SHIP-PLAN-2026-11.md:244-249`, P0a step 4),
restores over any live database, repoints `FIXFLOW_DATABASE_URL` and redeploys
(`docs/RUNBOOK-BACKUPS.md:41-49`), and does any selective `--data-only` table restore into prod
(`docs/RUNBOOK-BACKUPS.md:57-62` — "Restore into a scratch DB first and reconcile before touching
prod"). An agent restores only into `fixflow-w1-restore`.
