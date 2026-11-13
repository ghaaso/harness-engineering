<!-- Authored for FixFlow, 2026-11-04 -->
# FixFlow recovery runbook — Supabase, Railway, Cloudflare R2

One runbook, six parts: (1) what backups exist, (2) the paused Supabase project, (3) R2 listing
and fetching, (4) Railway deploy history and the edge 404, (5) restoring a custom-format dump
into Postgres 17, (6) sequence verification. `[owner]` = production or account action; an agent
stops there, hands the owner the command with placeholders, and tabulates the pasted output.
Placeholders in angle brackets are never filled from `technician-app/eas.json`, `app.json`,
`google-services.json` or any `.env`.

docs/ORCHESTRATION-DESIGN-2026-10.md and docs/program/* are on PR #182 (head 3415b5e) at write time; their line numbers refer to that head.

## 1. What backups exist and where

| Item | Value | Source |
| --- | --- | --- |
| Job | `db-backup-nightly`, registered only when `enable_scheduler` and `backup_enabled` | backend/app/main.py:189, :192, :198 |
| Schedule | 02:30 Asia/Karachi | backend/app/core/config.py:182, :199-200 |
| Bucket / prefix | `job-media` / `backups/db/` | backend/app/core/config.py:37, :202 |
| Key | `<prefix>fixflow-db-<YYYYMMDD>T<HHMMSS>Z.dump`, UTC stamp | backend/app/core/backup.py:52, regex :37 |
| Format | `pg_dump --format=custom --schema=public --no-owner --no-privileges` | backend/app/core/backup.py:88-92 |
| Client | `postgresql-client-17` | backend/Dockerfile:25 |
| Retention | 30 days; only keys matching the regex are ever pruned | backend/app/core/config.py:201; backend/app/core/backup.py:67-75 |
| Prune timing | after the upload, over `list_keys(backup_prefix)` | backend/app/core/backup.py:122, :125-131 |
| Known dumps | `backups/db/fixflow-db-20260615T102020Z.dump` (manual); `backups/db/fixflow-db-20260802T023008Z.dump` (302 KB, head 0045) | docs/RUNBOOK-BACKUPS.md:127-128 |
| Expected | the last 30 nightly dumps before the backend stopped | docs/ORCHESTRATION-DESIGN-2026-10.md:145-147 |
| Not covered | media bytes (only their rows); no PITR | docs/RUNBOOK-BACKUPS.md:111-119 |

Prefixes the plan adds (none exists until its phase runs): `archive/pre-selfhost/` (P0a item 3,
docs/program/SHIP-PLAN-2026-11.md:241), `backups/db-selfhost/` (:512, :644), `backups/db-hourly/`
with 72 h retention (:543-546), `archive/post-drain/` with no retention (:546-547),
`archive/pre-drain/` (:538), `archive/manifests/` (:548-549); P13b moves dumps to an encrypted,
put-only path (:1225-1226).

**The pruner hazard (O08-F02, docs/program/evidence/w2/O-08.txt:37).** Any backend started with
the defaults against `job-media` deletes every pre-outage dump at its first 02:30 run, because
all of them are older than 30 days. That is why P0a cuts every surviving backend off the
database first (docs/program/SHIP-PLAN-2026-11.md:233-238) and copies the dumps to a prefix the
pruner never lists (`archive/pre-selfhost/`) before anything else (:239-243).

## 2. The paused Supabase project

Web facts, fetched 2026-11-04 (the dashboard is the authority; the docs disagree with each other):

- "Supabase pauses Free Plan projects that show low activity over a 7-day period"
  (https://supabase.com/docs/guides/platform/free-project-pausing.md).
- Restore window: "up to 1 year after it was paused" (same page) and "a 1-year window"
  (https://supabase.com/docs/guides/platform/upgrading.md) — but the upgrading page's image alt
  text reads "Project Paused: 90 Days Remaining", and the 2024 changelog says "Paused Free Plan
  projects are restorable for 90 days", beginning June 24, 2024
  (https://supabase.com/changelog/27497-paused-free-plan-projects-are-restorable-for-90-days).
  **UNVERIFIED: the real deadline and the plan tier** (also ADR-0001 open question,
  docs/adr/0001-database-region-topology.md:221-222). Only the dashboard shows it; O-08 calls it
  "the only irreversible clock in the program" (docs/program/w2/O-08-design.md:40).
- Dashboard flow: organisation → the paused project → **Resume project** → confirm (pausing page).
- "After the restore window, you can download your project's backup file, and Storage objects
  from the project dashboard" (upgrading.md). "Free projects will move to the latest minor
  version when their paused project is restored. Paid projects can't be paused." Upgrading to
  paid while paused re-enables expired one-click restore, but the old backup "may fail to restore".
- Daily backups are listed only for Pro (7 d), Team (14 d), Enterprise (30 d); Free projects are
  told to "regularly export their data using the Supabase CLI `db dump` command"
  (https://supabase.com/docs/guides/platform/backups.md). FixFlow's own nightly dump to R2 is
  that export.
- A dashboard download: "Dashboard backups are only available for older projects that still use
  logical backups"; "The backup file will be gzipped with a .gz extension"; the documented load
  is `psql -d [CONNECTION_STRING] -f /file/path`, i.e. plain SQL
  (https://supabase.com/docs/guides/platform/migrating-within-supabase/dashboard-restore.md).
  The local-restore page names the file `db_cluster.backup` and does not state its format
  (https://supabase.com/docs/guides/local-development/restoring-downloaded-backup.md). So the
  format of a downloaded file is unknown until `pg_restore -l` is run on it.

Steps (P0a item 4, docs/program/SHIP-PLAN-2026-11.md:244-256):

1. [owner] Record in W0-results: project status, pause date, the restore deadline **as shown**,
   Postgres major (expected 17, docs/ORCHESTRATION-DESIGN-2026-10.md:142-144). Screenshot it.
2. [owner] Resume the project (dashboard). Account action.
3. [owner] Take the dump the same day through the **session pooler** on port 5432 (never the
   transaction pooler 6543, docs/RUNBOOK-BACKUPS.md:104-107; copy the pooler host verbatim from
   the dashboard, docs/adr/0001-database-region-topology.md:164):
   `docker run --rm -v C:/fixflow-dumps:/out postgres:17-alpine pg_dump "<session-pooler-uri>" --format=custom --schema=public --no-owner --no-privileges -f /out/supabase-<date>.dump`
   (docs/program/SHIP-PLAN-2026-11.md:246). The password was reset in P0a item 2; it never
   reaches an agent.
4. [owner] `sha256sum` the file and upload it to `archive/pre-selfhost/` (:247-248).
5. Agent: verify the local file with Appendix C (part 5) the same day (:249-251).
6. Only a dashboard download: agent runs `pg_restore -l` on the local file inside
   `postgres:17-alpine`; a TOC listing = custom/directory archive, an error = not an archive
   (`gunzip` first if `.gz`). A plain-SQL file is loaded into a throwaway PG17 container with
   `psql -v ON_ERROR_STOP=1 -f`, re-dumped as custom format of `public`, and that file goes
   through part 5 (:251-254). Expect Supabase-internal objects (`auth`, `storage`) in a full
   dashboard file; only `public` is FixFlow's (docs/RUNBOOK-BACKUPS.md:19-20).
7. "Unrecoverable" on the dashboard: [owner] screenshot. "Unknown" is not an answer (:255-256).

## 3. Listing and fetching R2 objects

Every R2 command in this part is [owner]: listing and downloading are owner pre-flight (design
§4.0 item 5, docs/ORCHESTRATION-DESIGN-2026-10.md:119, :145; plan P0a item 3,
docs/program/SHIP-PLAN-2026-11.md:219, :239-243). The agent writes them with placeholders,
tabulates the listing the owner pastes (step 6), and restores only a dump file the owner has
already put at `ARGS_DUMP_PATH` (part 5). No R2 token is ever exported into an agent's session.

Token (web, fetched 2026-11-04, https://developers.cloudflare.com/r2/api/tokens/): levels are
Admin Read & Write, Admin Read only, Object Read & Write, Object Read only; **Object Read only**
"allows the ability to read and list objects in specific buckets", and object permissions "are
only supported by the S3-compatible API, not the Cloudflare REST API" (summariser-read; confirm
with the first listing).

1. [owner] Mint an **Object Read only** token scoped to `job-media` for the owner's listing and
   downloads. The P0a item 3 server-side copy to `archive/pre-selfhost/` writes, so it needs
   Object Read & Write and stays [owner] (docs/program/SHIP-PLAN-2026-11.md:239-243).
2. [owner] Put the key pair in the shell environment only (`export AWS_ACCESS_KEY_ID=…
   AWS_SECRET_ACCESS_KEY=…`), never in a file under the repo. Never use the app's R2 keys from
   `backend/.env` (docs/RUNBOOK-BACKUPS.md:35 reads them; agents never open a `.env`).
3. [owner] List (aws CLI in Docker, the plan's form, :240):
   `docker run --rm -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY amazon/aws-cli --endpoint-url https://<account-id>.r2.cloudflarestorage.com s3 ls s3://job-media/backups/db/`
   The documented R2 form is `aws s3api list-objects-v2 --endpoint-url https://<ACCOUNT_ID>.r2.cloudflarestorage.com --bucket my-bucket`
   with region `auto` ("required by the SDK but not used by R2",
   https://developers.cloudflare.com/r2/examples/aws/aws-cli/, fetched 2026-11-04); add
   `--prefix backups/db/`. `s3 ls` / `s3 cp` against R2 are not on that page (INFERRED from
   generic aws CLI behaviour; the 2026-08-02 drill used boto3, docs/RUNBOOK-BACKUPS.md:128).
4. [owner] Fetch one key: `docker run --rm -v C:/fixflow-r2:/dl -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY amazon/aws-cli --endpoint-url https://<account-id>.r2.cloudflarestorage.com s3 cp s3://job-media/backups/db/<key> /dl/`
   then `sha256sum` it. A laptop copy of the whole prefix is the plan's `s3 cp --recursive` (:242).
5. [owner] rclone alternative (https://developers.cloudflare.com/r2/examples/rclone/, fetched
   2026-11-04): a remote with `type = s3`, `provider = Cloudflare`,
   `endpoint = https://<accountid>.r2.cloudflarestorage.com`, `acl = private`; "If you are using
   a token with Object-level permissions, you will need to add no_check_bucket = true". List with
   `rclone tree r2:job-media` (narrow to `backups/db`), fetch with
   `rclone copy r2:job-media/backups/db/<key> .`. The rclone config file lives outside the repo.
6. Agent, from the owner's pasted listing: record per key: key, size, LastModified, and that the key stamp parses (backend/app/core/backup.py:55-64).
   The app's own lister follows `NextContinuationToken` until `IsTruncated` is false
   (backend/app/core/storage.py:157-169); a manual listing keeps the same prefix on every page
   (references/cloudflare-r2-gotchas.md, listing row).

Never from an agent: `s3 rm`, `s3 mv`, `s3 sync --delete`, any write under `backups/db/`, lifecycle
rules, or a bucket-wide token.

## 4. Railway deploy history and the edge 404

What the owner reads in the Railway dashboard [owner] (docs/ORCHESTRATION-DESIGN-2026-10.md:126-134,
:148-149): does the project/service still exist; billing state (deleted / lapsed / unbound
domain); deploy history and the last successful deploy date; can the generated subdomain be bound
or regenerated with the same name (H). The read-only CLI equivalents, run by the owner, are in
references/railway-deploy-history.md and references/railway-operate-edge.md.

Deployment states on the docs page: Initializing, Building, Deploying, Failed, Active, Completed,
Crashed, Removed; "The rollback will use the source code from the selected deployment" and
"Deployments older than your plan's retention policy cannot be restored via rollback"
(https://docs.railway.com/deployments/reference, fetched 2026-11-04). FixFlow never uses rollback
(docs/adr/0001-database-region-topology.md:152).

**Edge-404 semantics — no official Railway doc exists.**
https://docs.railway.com/reference/errors/application-not-found returned HTTP 404 on 2026-11-04.
What is known:

| Evidence | Kind | Says |
| --- | --- | --- |
| docs/program/evidence/w2/O-03.json:676 | FixFlow probe, 2026-11-01 | `POST /api/jobs` and `GET /api/health` on the baked Railway URL both returned HTTP 404 `{"status":"error","code":404,"message":"Application not found"}` |
| https://station.railway.com/questions/custom-domains-are-verified-and-propagat-69569c8c (fetched 2026-11-04) | forum report, 2026-07-29 | same body, header `x-railway-fallback: true`; a Railway employee: "the edge traffic routes were never installed for either hostname" |
| plugins/railway/skills/use-railway/references/configure.md:259 (upstream) | upstream skill | a custom domain "can return `404` until Railway verifies the ownership `TXT` record" |
| https://docs.railway.com/networking/troubleshooting/application-failed-to-respond (fetched 2026-11-04) | official doc | a different class: 502, "Railway's Edge Proxy cannot communicate with your application"; no mention of 404 |

Classification rule for an agent's report: a 404 with that body (and, where captured,
`x-railway-fallback: true`) is **"no application routed at Railway's edge for this hostname"** —
an infrastructure answer, "observed", not "documented". It is not "route missing in FastAPI".
The field APK cannot tell the two apart: 404 is in `DEFINITIVE_4XX`
(technician-app/src/lib/syncClassification.ts:18), so job, punch and presence writes park in the
failed list and ping/travel batches are dropped (CLAUDE.md:154-160; O08-F14,
docs/program/evidence/w2/O-08.txt:163). From P1 every real backend response, unknown-route 404s
included, carries `X-FixFlow-Api: 1` (docs/program/SHIP-PLAN-2026-11.md:348); a 404 without the
marker is then never the app.

What the old hostname may do (plan standing rule 5, docs/program/SHIP-PLAN-2026-11.md:105-110):
hang (no bytes for ≥ 20 s) or proxy through the repository stub; never a 5xx (each counts toward
`MAX_ATTEMPTS = 5`, technician-app/src/lib/syncClassification.ts:24, and parks the item — O10-F3,
docs/program/evidence/w2/O-10.txt:40), never a 2xx or 204 (deleted as landed — O10-F4, :51). A
hang works because the client aborts at `REQUEST_TIMEOUT_MS = 15_000` with a plain `Error`, not an
`ApiError` (technician-app/src/lib/api.ts:85, :105). Binding anything to the old hostname is
[owner] (P3c step 4, :636-639).

Probing: the target host comes from the brief (owner-supplied), never read out of
`technician-app/eas.json`. `curl -sS -i -m 20 https://<host>/api/health` or `curl -sS -I` only;
never a POST — on a revived app that is a production write. Record status, the body's JSON keys,
`x-railway-fallback`, `X-FixFlow-Api`, and the date.

## 5. Restore a custom-format dump into Postgres 17 (agent-side: design Appendix C only)

Rules: Postgres **17** — the server was 17 (docs/RUNBOOK-BACKUPS.md:127), the client is 17
(backend/Dockerfile:25), and loading into an older major "is not guaranteed"
(docs/ORCHESTRATION-DESIGN-2026-10.md:709-710). Never `postgres:16-alpine`: that is the CI and dev
image for tests only (.github/workflows/ci.yml:88, docker-compose.yml:9; O08-F12,
docs/program/evidence/w2/O-08.txt:144). Never the gates' test database: Appendix C runs its own
container `fixflow-w1-restore` / database `fixflow_restore`, apart from `fixflow-w1-db`
(docs/ORCHESTRATION-DESIGN-2026-10.md:620-621).

1. `docker info` prints a server version, else return `DOCKER_ENGINE_DOWN`. The agent never
   starts or reconfigures Docker (docs/ORCHESTRATION-DESIGN-2026-10.md:593-595).
2. `export ARGS_DUMP_PATH=<dump outside the repo> ARGS_LOGDIR=<log dir outside the repo>`;
   save Appendix B (+ the sequence addendum) as `$ARGS_LOGDIR/appendix-b.sql`.
3. Run the Appendix C block verbatim (references/restore-appendix-b-c.md). It drops the empty
   `public` schema first so `--exit-on-error` stops only on a real failure (O08-F06,
   docs/program/evidence/w2/O-08.txt:83; the benign error is docs/RUNBOOK-BACKUPS.md:94-97).
4. `RESTORE EXIT=0` and `QUERIES EXIT=0` or the result is labelled partial with the first error
   line from `restore.log`. Never drop `--exit-on-error` to make a run pass. On a timeout re-check
   with `docker ps` and never re-issue a mutating command (docs/ORCHESTRATION-DESIGN-2026-10.md:618-619).
5. Delete the local dump copies the run made under the scratch log dir when done; the dump holds
   real customer and payment data (docs/RUNBOOK-BACKUPS.md:86).

Production-side restores are [owner] and are not this recipe: P3b restores per recovery case as
`fixflow_app` with `docker compose` (docs/program/SHIP-PLAN-2026-11.md:528-533, :596-598), into
postgres alone — "the backend must NOT start first" (docs/program/w2/O-08-design.md:43); P13e's
final dump + O-08 §3 production restore (:1254-1255); from `T_open` on every restore is an O-10
R2 restore with owner sign-off (:559-562). P9-0a's export runs against "an **Appendix C restore**
of the latest R2 dump, never against production" (:1103).

Superseded text in docs/RUNBOOK-BACKUPS.md (still on main): "update `FIXFLOW_DATABASE_URL` in
Railway → redeploy" and "Verify: `/api/health`" (:47-50) — Railway is gone, and `/api/health`
"Returns ok without touching the database" (backend/app/features/health/router.py:12; O08-F07,
docs/program/evidence/w2/O-08.txt:93); "`pg_stat_user_tables` or direct counts" (:92) — only exact
`count(*)` (docs/ORCHESTRATION-DESIGN-2026-10.md:616-617).

## 6. Verification gate and sequences

Gate (docs/program/w2/O-08-design.md:48-54), every line from Appendix B output:

| Check | Pass | Baseline |
| --- | --- | --- |
| `alembic_version` | 0045 or 0046, never above the code head 0046 (CLAUDE.md:120) | 0045 in the 2026-08-02 dump |
| row counts, every public table | at or above the last drill | 43 tables (42 app + `alembic_version`), 3,268 rows (docs/RUNBOOK-BACKUPS.md:128) |
| `job_payment` non-voided sum | reconciles | 9 rows; 3,440,000 paisa = Rs 34,400 non-voided (Rs 39,400 total) |
| `staff_ledger` / `staff_ledger_chain` | counts reported; chain verified later by the owner via `GET /api/attendance/ledger/verify` | 0 / 0 at the drill |
| three sequences | next value > table max (references/sequence-checks.md) | `job_token_seq` 1057, `job_event_seq` 90 |
| `dispatch_cursor` | `whatsapp` row at or near max `job_event.seq` (0046 dumps) | +1 row after the 0046 seed |
| `attendance_geofence` | the active row has the workshop coordinates, not the (0,0) placeholder | from P0a item 9 |
| max timestamps | recorded as `T_restore` (P3b step 3, docs/program/SHIP-PLAN-2026-11.md:596-598) | — |

Money is reported in integer paisa as the query returns it; any rupee figure is derived at the
edge (CLAUDE.md money rule; plan standing rule 7, docs/program/SHIP-PLAN-2026-11.md:114).
