---
name: supabase-railway-r2-recovery
description: FixFlow recovery operations for the dead production stack - what database backups exist (nightly custom-format pg_dump to R2 job-media/backups/db/), the paused Supabase project's restore policy and dashboard flow, writing the owner's R2 list/fetch commands (aws CLI or rclone) and tabulating the listing the owner pastes, Railway deploy history and the undocumented edge 404 "Application not found", restoring a dump into a throwaway Postgres 17 container (design Appendix C) and verifying it with exact counts, max timestamps and the three standalone sequences (Appendix B). Use for ship-plan W0/P0a, P3a, P3b, P3c, P9-0a, P13b, P13e and registers O-08 (O08-F01..F14), O10-F3/F4. Do NOT use to deploy, redeploy or roll back, restore over live data, change Railway variables, rotate keys, run SQL or CLI against production, sign up for accounts, or for Supabase-native features (RLS, GoTrue, Storage, Edge Functions) - Supabase is a Postgres host only here; those steps are [owner].
---

# Supabase / Railway / R2 recovery (FixFlow)

Production is dead: both documented Railway URLs answer Railway's edge 404 and the phones treat
it as definitive (docs/ORCHESTRATION-DESIGN-2026-10.md:372-374). This skill is how an agent finds
what data survives, proves a dump restores, and hands the owner every production step. Facts
were verified against the files on 2026-11-04. Marks: VERIFIED-IN-CODE / WEB (URL, fetched
2026-11-04) / INFERRED.

docs/ORCHESTRATION-DESIGN-2026-10.md and docs/program/* are on PR #182 (head 3415b5e) at write time; their line numbers refer to that head.

## (a) FixFlow facts

### Phases and register ids served

| Id | Where | What this skill does there |
| --- | --- | --- |
| W0 / P0a | design §4.0 docs/ORCHESTRATION-DESIGN-2026-10.md:119-158; plan docs/program/SHIP-PLAN-2026-11.md:219 | items 2-4: cut-off, R2 archive, Supabase dump + same-day Appendix C verify (:233-256) |
| P3a | docs/program/SHIP-PLAN-2026-11.md:497 | restore commands, hourly/post-drain dump prefixes in the runbook (:528-549) |
| P3b | :582 | owner restore per case; Appendix B gate; `T_restore` (:596-598) |
| P3c | :613 | step 7: first self-host backup listed in R2 and restored once with Appendix C (:644-648) |
| P9-0a | :1095 | the export runs on "an **Appendix C restore** of the latest R2 dump, never against production" (:1103) |
| P13b | :1223 | encrypted put-only path, row-count restore gate, first drill (:1225-1231) |
| P13e | :1247 | final dump + sha256, O-08 §3 production restore, Appendix B counts equal the source (:1254-1255) |
| O-08 | docs/program/w2/O-08-design.md; findings docs/program/evidence/w2/O-08.txt | recovery CASE a/b/c (:3), restore order (:43-47), verification gate (:48-54) |
| O10-F3 / O10-F4 | docs/program/evidence/w2/O-10.txt:40, :51 | why the old hostname may never answer 5xx, 2xx or 204 |

O-08 findings by relevance here: **F02** first nightly run prunes every pre-outage dump
(O-08.txt:37); **F06** `--exit-on-error` vs the benign schema error (:83); **F07** `/api/health`
green over an empty DB (:93); **F12** CI on Postgres 16, dump and client on 17 (:144); **F14** the
baked Railway host answers 404 (:163); **F05** both EAS profiles bake a host the owner does not
control (:72). F01, F03, F04, F08-F11, F13 (boot guard, XFF, dev compose, ops login, ops health,
R2 endpoint, images, web logout; :24-154) belong to the self-host and appsec packages; cite them,
do not work them here.

### Backups, code and constants (VERIFIED-IN-CODE)

- `db-backup-nightly` is registered only under `if settings.enable_scheduler:` and
  `if settings.backup_enabled:` (backend/app/main.py:189, :192, :198); defaults
  `backup_enabled = True`, `backup_hour = 2`, `backup_minute = 30`, `backup_retention_days = 30`,
  `backup_prefix = "backups/db/"` (backend/app/core/config.py:197-202), timezone `"Asia/Karachi"`
  (:182), bucket `r2_bucket = "job-media"` (:37), env prefix `FIXFLOW_` (:24).
- Key `f"{prefix}fixflow-db-{...}.dump"` stamped `%Y%m%dT%H%M%SZ` UTC (backend/app/core/backup.py:52,
  :38); `_KEY_RE = re.compile(r"fixflow-db-(\d{8}T\d{6}Z)\.dump$")` (:37); unrecognised keys are
  never pruned (:67-75); flags `--format=custom --schema=public --no-owner --no-privileges`
  (:88-92); upload then prune with `store.delete(old)` (:122, :125-131) — the O08-F02 hazard.
- R2 client: `endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com"`,
  `region_name="auto"` (backend/app/core/storage.py:182, :185); `list_keys` follows
  `NextContinuationToken` until `IsTruncated` is false (:157-169).
- `postgresql-client-17` (backend/Dockerfile:25); `start.sh` runs `alembic upgrade head` under
  `set -e` on every boot (backend/start.sh:6, :9) — so a backend started on an empty DB builds a
  fresh schema and seeds `dispatch_cursor` (docs/program/w2/O-08-design.md:43).
- `/api/health`: "Liveness probe. Returns ok without touching the database."
  (backend/app/features/health/router.py:12). The DB-touching probe is `/api/ops/health`, gated by
  `X-Ops-Proxy-Token` (backend/app/features/ops/router.py:18, :21).
- Sequences: `job_token_seq` (`start=1052`, backend/app/features/jobs/models.py:48),
  `job_event_seq` (:56), `shop_setting_seq` (backend/app/features/tenancy/models.py:36); created by
  migrations 0016:31, 0027:51, 0040:47. Head 0046 (`down_revision = "0045"`,
  backend/alembic/versions/0046_seed_dispatch_cursor.py:46-47; CLAUDE.md:120).
- Tests run `postgres:17-alpine` since P3a (#195, 2026-11-13; the backend job in .github/workflows/ci.yml); the dev compose still runs `postgres:16-alpine` (docker-compose.yml:9).
- Field classification: `DEFINITIVE_4XX = new Set([400, 403, 404, 409, 422])`, `MAX_ATTEMPTS = 5`
  (technician-app/src/lib/syncClassification.ts:18, :24); `REQUEST_TIMEOUT_MS = 15_000` and a
  timeout throws a plain `Error` (technician-app/src/lib/api.ts:85, :105) while a non-OK answer
  throws `ApiError` (:118) and a 204 returns as success (:120).

### Docs and evidence

- docs/RUNBOOK-BACKUPS.md: table (:8-17); the benign `schema "public" already exists` (:94-97);
  session pooler on 5432, "never the transaction pooler (port 6543)" (:104-107); limits (:111-121);
  2026-08-02 drill: `backups/db/fixflow-db-20260802T023008Z.dump`, 302 KB, 43 tables, 3,268 rows,
  head 0045, `job_payment` 9 rows / Rs 34,400 non-voided, `job_event_seq`=90, `job_token_seq`=1057 (:128).
- ADR-0001: "Never abort by rolling the Railway deployment back." (docs/adr/0001-database-region-topology.md:152);
  "Never run `alembic downgrade`." (:157); split restore skips `SETVAL`, a low sequence makes every
  write a 500 while reads stay green (:212-215); three sequences, not two (:336-337); free-tier
  auto-pause after a week (:319-320).
- CLAUDE.md: Supabase = managed Postgres only, session pooler, Alembic owns the schema (:30);
  deploy is manual `railway up` (:36); "Deploy the backend from `backend/`, never the repo root" (:88);
  the outbox contract, pings/travel droppable (:154-160); never message a customer about an old
  event (:231). docs/HANDOFF-2026-07-28-open-work.md: `railway up --ci` "Never re-run it" (:64-66),
  verify by content (:67).
- Plan standing rules (docs/program/SHIP-PLAN-2026-11.md): rule 1 nothing ships to a phone before
  its drain (:95-98); rule 3 drain image only, no backend deploy from `main` before P4c (:100-101);
  rule 4 dispatcher OFF (:102-104); rule 5 old Railway hostname may only hang (≥ 20 s) or proxy,
  "O-08 §4's "503 stub" line is void." (:105-110); rule 7 integer minor units, the outbox never
  deletes a write (:114-115). Routing: Opus owns ledger/chain, money and migration code and
  reviews every PR (:47-56); in P3a "Opus reviews compose, restore order" (:573-574). This skill's
  operator tabulates a discrepancy; it does not judge it.

### Edge-404 semantics (no official Railway documentation)

- https://docs.railway.com/reference/errors/application-not-found → HTTP 404 (WEB, 2026-11-04).
  Call the edge 404 "observed", never "documented".
- FixFlow probe 2026-11-01: `POST /api/jobs` and `GET /api/health` on the baked URL both returned
  404 `{"status":"error","code":404,"message":"Application not found"}`
  (docs/program/evidence/w2/O-03.json:676).
- Forum report 2026-07-29 (WEB, https://station.railway.com/questions/custom-domains-are-verified-and-propagat-69569c8c):
  same body, header `x-railway-fallback: true`; a Railway employee: "the edge traffic routes were
  never installed for either hostname". Upstream: a custom domain can 404 until its TXT record
  verifies (plugins/railway/skills/use-railway/references/configure.md:259). A 502 "Application
  failed to respond" is a different class (WEB, https://docs.railway.com/networking/troubleshooting/application-failed-to-respond).
- **Classification rule:** that body = no application routed at Railway's edge for the host. The
  field APK cannot tell it from an app 404: it parks job/punch/presence writes and drops ping and
  travel batches (syncClassification.ts:18; CLAUDE.md:154-160; O08-F14). From P1 every real
  backend response carries `X-FixFlow-Api: 1`, unknown-route 404s included
  (docs/program/SHIP-PLAN-2026-11.md:348), so a markerless 404 is never the app.
- The old hostname: never a 5xx (each bumps toward `MAX_ATTEMPTS` and parks, O10-F3), never a 2xx
  or 204 (deleted as landed, O10-F4); only hang or proxy (rule 5). P13e's new-host 503 responder is
  a different case: it serves the drained build, for which "a markerless 503 is connectivity"
  (docs/program/SHIP-PLAN-2026-11.md:1252-1253).

### Supabase pause and backup facts (WEB, each fetched 2026-11-04; detail in references/recovery-runbook.md §2)

- Free projects pause after "low activity over a 7-day period"; resume = organisation → project →
  **Resume project** → confirm (https://supabase.com/docs/guides/platform/free-project-pausing.md).
- **Conflict, UNVERIFIED:** the docs say a 1-year restore window
  (https://supabase.com/docs/guides/platform/upgrading.md); the same upgrading page's image alt
  text says "Project Paused: 90 Days Remaining"; the 2024 changelog says 90 days
  (https://supabase.com/changelog/27497-paused-free-plan-projects-are-restorable-for-90-days).
  Only the dashboard shows the deadline and the plan tier (O-08-design.md:40; ADR-0001 :221-222).
- After the window the backup file and Storage objects can be downloaded from the dashboard; a
  restored Free project moves to the latest minor Postgres; paid projects cannot pause
  (https://supabase.com/docs/guides/platform/upgrading.md).
- Dashboard backups exist only for older logical-backup projects, come gzipped, and load with
  `psql -f` (plain SQL); the format of any downloaded file is unknown until `pg_restore -l`
  (https://supabase.com/docs/guides/platform/migrating-within-supabase/dashboard-restore.md).
- Daily backups are listed only for Pro/Team/Enterprise; FixFlow's nightly R2 dump is the export
  the Free plan is told to keep (https://supabase.com/docs/guides/platform/backups.md).

## (b) Procedure

An agent's procedure stops at every `[owner]` step: it writes the command with placeholders,
waits, and tabulates what the owner pastes. Full commands: references/recovery-runbook.md.

1. Read the brief: phase, recovery CASE (a Supabase restorable | b R2 dump only | c nothing,
   O-08-design.md:3), whether it says "runs commands", the dump path and log dir (both outside the
   repo), and the probe host if any. No host, path or credential is ever read out of
   `technician-app/eas.json`, `app.json`, `google-services.json` or a `.env`.
2. Inventory from code (read-only): re-verify the constants in (a) with the Checks below; report
   any drift from this file as a fact, not a fix.
3. [owner] P0a item 2 first: seal the old `FIXFLOW_JWT_SECRET`, cut every surviving service off
   the database, reset the Supabase DB password (docs/program/SHIP-PLAN-2026-11.md:233-238). Until
   this row is ticked, nothing may start a backend against `job-media` (O08-F02).
4. [owner] Mint R2 tokens: Object Read only on `job-media` for the owner's listing/downloads;
   Object Read & Write only for the owner's own archive copy. Export them in the owner's shell,
   never into a file; no R2 token is ever handed to an agent.
5. [owner] Archive before anything else: `s3 cp --recursive` of `backups/db/` to
   `archive/pre-selfhost/`, a laptop copy, then `s3 ls` the archive and record it (:239-243).
6. [owner] List and fetch. R2 listing and download are owner pre-flight (design §4.0 item 5,
   docs/ORCHESTRATION-DESIGN-2026-10.md:119, :145; plan P0a item 3,
   docs/program/SHIP-PLAN-2026-11.md:219, :239-243), so the agent runs no R2 command, even
   read-only. The agent writes the runbook §3 commands with placeholders; the owner lists
   `backups/db/` (and the archive prefix), downloads the chosen key to a path outside the repo and
   `sha256sum`s it. The agent tabulates the pasted listing (key / size / LastModified, newest
   stamp) and the hash, and restores only a dump the owner has already put at `ARGS_DUMP_PATH`.
7. [owner] Supabase dashboard: status, pause date, deadline as shown, Postgres major, screenshot;
   Resume; `pg_dump` 17 through the session pooler; `sha256sum`; upload to `archive/pre-selfhost/`
   (:244-248; runbook §2).
8. Dashboard-download only: `pg_restore -l` the local file in `postgres:17-alpine`; a plain-SQL
   file is loaded into a throwaway PG17 container and re-dumped as custom format of `public`
   (:251-254). The re-dumped file goes to step 11.
9. [owner] Railway dashboard: project and service exist? billing state; deploy history and last
   successful deploy date; can the generated subdomain be bound (H)? (design :126-134, :148-149).
   Read-only `railway deployment list / domain status / logs --http` are owner-run
   (references/railway-deploy-history.md, references/railway-operate-edge.md).
10. Probe the old host only if the brief supplies it: `curl -sS -i -m 20 https://<host>/api/health`
    or `curl -sS -I`, never a POST; classify per the edge-404 rule; record date, status, body keys,
    `x-railway-fallback`, `X-FixFlow-Api`.
11. Restore into the throwaway Postgres 17 container, only from the local file the owner put at
    `ARGS_DUMP_PATH` (none → `NO_DUMP_PATH`): `docker info` first (else
    `DOCKER_ENGINE_DOWN`); save Appendix B plus the sequence addendum as
    `$ARGS_LOGDIR/appendix-b.sql`; run Appendix C verbatim (references/restore-appendix-b-c.md,
    references/sequence-checks.md). Require `RESTORE EXIT=0` and `QUERIES EXIT=0`; on a timeout
    re-check with `docker ps`, never re-issue.
12. Tabulate the gate (runbook §6): head, exact count per table, max timestamps (`T_restore`),
    non-voided `job_payment` in paisa, ledger and chain counts, the three sequences, the
    `dispatch_cursor` row, the active fence. Compare with the 2026-08-02 baseline and, in CASE a,
    with the newest archived R2 dump (P3b step 3, :596-598). Delete the scratch dump copies.
13. [owner] Everything after the evidence: the production restore (P3b, P13e), any `setval`,
    roster/fence/PIN changes, `FIXFLOW_BACKUP_*` changes or `BACKUP_ENABLED=true`, binding the old
    hostname, `GET /api/attendance/ledger/verify` on the live backend, the dispatcher. The agent's
    procedure ends at step 12.

## (c) Checks (read-only; what each proves)

| Command | Proves |
| --- | --- |
| `grep -h "^revision\|^down_revision" backend/alembic/versions/*.py` | code head is 0046 (end of the chain); a dump head above it cannot be served |
| `grep -n "backup_\|r2_bucket\|enable_scheduler\|enable_dispatcher" backend/app/core/config.py` | the defaults that make O08-F02 fire (:179, :188, :197-202) |
| `grep -n "_KEY_RE\|def keys_to_prune\|store.delete" backend/app/core/backup.py` | which keys the pruner can delete, and that it deletes after the upload |
| owner-pasted `s3 ls` / `s3api list-objects-v2 --prefix backups/db/` output ([owner] runs it) | what survives; newest stamp; if newest < (first planned 02:30 − 30 d) the first run would delete them all (O-08.txt:37 SETTLE) |
| `sha256sum <dump>` vs the owner's recorded hash | the laptop, archive and verified copies are the same bytes |
| `pg_restore -l <dump>` in `postgres:17-alpine` | it is a custom-format archive and its TOC lists `public` tables and the three `SEQUENCE SET` entries (INFERRED entry name; read the TOC) |
| `RESTORE EXIT=0`, `QUERIES EXIT=0` | complete restore and complete Appendix B; anything else = partial |
| Appendix B `count(*)` per table | completeness (never `pg_stat` / `n_live_tup`, design :616-617) |
| sequence addendum: next value > table max | writes will not 500 after cut-over (ADR-0001 :212-215) |
| `curl -i` body + headers | edge 404 (Railway body, no marker) vs application (marker from P1) |
| `docker ps -a --filter name=fixflow-w1-restore` empty at the end | the throwaway container was removed |

## (d) Forbidden actions (and the rule each comes from)

- `railway up`, `redeploy`, `restart`, `down`, `service delete`, the rollback button, any deploy —
  production actions are owner-only (.claude/skills/README.md rule 4); deploy is manual and from
  `backend/` only (CLAUDE.md:36, :88); `railway up --ci` is never re-run (HANDOFF :64-66); never a
  Railway rollback (ADR-0001 :152); no backend deploy from `main` before P4c (plan rule 3, :100-101).
- `alembic downgrade` (ADR-0001 :157; O-08-design.md:58).
- Restoring over, or running SQL/CLI against, any database a backend serves, incl. `setval`,
  `DROP SCHEMA`, `ALTER ... OWNER` — owner-only (README rule 4); the backend must not start before a
  restore (O-08-design.md:43).
- `railway variable set` / any change to `FIXFLOW_DATABASE_URL`, `FIXFLOW_BACKUP_*` — "Variable
  changes trigger a redeployment by default" (upstream configure.md:35), and `start.sh` migrates on
  boot (backend/start.sh:9).
- Deleting, moving or overwriting R2 objects (`s3 rm`, `s3 mv`, `sync --delete`, lifecycle rules),
  writing under `backups/db/` — the dumps may be the only copy (backup.py:16-18; O08-F02). Any
  R2 command at all, read-only listing and download included, is owner pre-flight (design :145;
  plan :239-243); the agent works only from the pasted listing and the local file.
- Making the old hostname answer a 503, 2xx or 204, or standing up any stub on it (plan rule 5,
  :105-110; O10-F3, O10-F4).
- Restoring into Postgres 16 or into the gates' test DB `fixflow-w1-db` (design :614-617,
  :620-621, :709-710; O08-F12).
- Dropping `--exit-on-error` to make a restore "pass" (O08-F06 is fixed by the schema drop).
- Opening a `.env`; quoting a value from `eas.json` / `app.json` / `google-services.json`;
  putting a token or DSN in a file, a URL query or a commit (README rule 3). A value that must be
  mentioned is a fingerprint (first 12 hex of sha256).
- Copying a dump into the repo or committing one — it holds customer and payment data (Appendix C
  comment, design :692; RUNBOOK-BACKUPS :86).
- Account sign-up or login (`railway login`, `railway up` unauthenticated, `cf auth login`,
  `supabase login`), `curl … | sh` installers, auto-approve hooks — README rule 4; permissions are
  never widened by an agent.
- Supabase-native features (RLS, GoTrue, PostgREST, Storage, Edge Functions, MCP `execute_sql`) —
  CLAUDE.md:30, :98.
- Enabling the dispatcher or touching `dispatch_cursor` (plan rule 4, :102-104; CLAUDE.md:231).
- Messaging a technician or customer (the hold notice is P0a item 1, owner) (README rule 4).
- Money as floats or rupees in a result: report `amount_paisa` sums as integers (plan rule 7, :114).

## (e) Where upstream disagrees

Each line: upstream sentence (path:line in the clone) → why FixFlow's rule wins.

- railway use-railway/SKILL.md:171 "Deploy from cwd → run `railway up` … Run it yourself" → agents
  never deploy (README rule 4); from the repo root it rebuilds the API as the web SPA (CLAUDE.md:88).
- use-railway/SKILL.md:85 "Run `railway up` directly — it … signs the user in" → no agent
  authentication or account creation; wrong-directory deploy risk (CLAUDE.md:88).
- use-railway/SKILL.md:16-19 "Also invoke it when the user asks to be signed up … do not refuse" →
  agents never create accounts (README rule 4).
- use-railway/references/deploy.md:37-40 "`railway up --ci` … waits for the deployment verdict"
  → in FixFlow it "always ends with `reqwest error / operation timed out`" and a re-run
  double-deploys (HANDOFF :64-66); verify by content (:67).
- deploy.md:75 and operate.md:269 "`railway redeploy --service <service> --yes`" as recovery → no
  agent deploy; a redeploy re-runs `alembic upgrade head` (start.sh:9); never roll back (ADR :152).
- deploy.md:85 "`railway down --service <service> --yes`" → takes the API down; owner-only.
- databases.md:44, :57, :61 `railway postgres pitr restore` / "`backup restore` overwrites the
  current data" → FixFlow's DB is Supabase, not Railway Postgres (CLAUDE.md:30); restore over live
  data is owner-only.
- use-railway/SKILL.md:141-143 `curl -fsSL agents.railway.com | sh` and install.sh → executing
  downloaded scripts needs the user's explicit permission; never from an agent.
- hooks/auto-approve-api.sh:2 "Auto-approve railway-api.sh and railway CLI commands." → a
  permission bypass; not vendored, never installed.
- configure.md:35 "Variable changes trigger a redeployment by default." → kept as a warning: env
  changes are owner-only because each one redeploys and migrates.
- use-railway/SKILL.md:318 "For destructive actions … confirm intent and state impact before
  executing." → weaker than FixFlow: destructive and production steps are `[owner]`, not
  confirm-then-execute.
- supabase/SKILL.md:137 "To make schema changes, use `execute_sql` (MCP) or `supabase db query`
  (CLI)." → Alembic owns the schema; every `models.py` change needs a migration (CLAUDE.md:30, :119-120).
- supabase/SKILL.md:31 "Enable RLS on every table in any exposed schema" and :37 "`user_metadata`
  claims" → no RLS, no GoTrue; auth is custom FastAPI JWT (CLAUDE.md:30-31, :98-100).
- supabase/SKILL.md:90 "use MCP `execute_sql` or `psql` as fallback" → SQL on production is an
  owner action; Appendix B runs only against the throwaway restore.
- supabase/references/skill-feedback.md:11 and cf-cli/references/skill-feedback.md:25 (file a
  GitHub issue) → publishing for the user needs explicit permission each time; dropped.

FixFlow-internal drift (not upstream, same treatment): docs/program/w2/O-08-design.md:61 and the
O08-F14 FIX (O-08.txt:163-171) still propose a 503 stub on the old host — void by plan rule 5
(:105-110). docs/RUNBOOK-BACKUPS.md:47-50 (repoint in Railway, verify `/api/health`) and :92
(`pg_stat_user_tables`) are superseded (runbook §5). Design §4.0 item 2 says "more than 15 s" for
the hang (:128-129); the plan's "≥ 20 s" (:105-106) wins.

## (f) References

- references/recovery-runbook.md — the six-part runbook (backups, Supabase, R2, Railway/edge 404,
  Postgres 17 restore, verification gate) with every command and web URL.
- references/restore-appendix-b-c.md — design Appendix B and C copied verbatim (PR #182).
- references/sequence-checks.md — the three sequences, the read-only addendum query, pass rule.
- references/railway-deploy-history.md — trimmed upstream: deployment status vocabulary, history and logs.
- references/railway-operate-edge.md — trimmed upstream: health snapshot, HTTP logs, domain status.
- references/cloudflare-r2-gotchas.md — trimmed upstream: listing cursor, S3 auth, consistency, lifecycle rows.
- references/cloudflare-r2-configuration.md — trimmed upstream: token scoping and lifecycle rows.
- Cited by path, not vendored: supabase/agent-skills skills/supabase/SKILL.md (version 0.1.2;
  discipline kept: check current docs first, :13; any docs page can be fetched as `.md`, :122;
  stop after 2-3 failed attempts, :21-22).
- docs/ORCHESTRATION-DESIGN-2026-10.md and docs/program/* are on PR #182 (head 3415b5e) at write time; their line numbers refer to that head.
