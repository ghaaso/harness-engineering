# UPSTREAM — supabase-railway-r2-recovery (status: sourced)

Fetched 2026-11-04 as sparse, shallow clones (manifest: the batch scratchpad `upstream/manifest.tsv`).
The three official skills are thin for this row: the Supabase skill carries nothing on pause,
backup or restore; the Railway skill covers CLI deploy/log and Railway-hosted Postgres PITR (not
FixFlow's database); the Cloudflare R2 references are link tables. The substance of the package
is the FixFlow-authored runbook, built from the repo, the PR #182 docs and the web pages below.

## Upstreams

| | supabase/agent-skills | railwayapp/railway-skills | cloudflare/skills |
| --- | --- | --- | --- |
| Repo | https://github.com/supabase/agent-skills | https://github.com/railwayapp/railway-skills | https://github.com/cloudflare/skills |
| Commit | c9be0e931b7930f7d02126d04774d904c381e7d7 | 526e95524e964ed326689cbac4464d97a58ab81c | 1f2cd0a19588e2c6197c91dd7c71729df1fb6156 |
| Branch | main | main | main |
| Fetched | 2026-11-04 | 2026-11-04 | 2026-11-04 |
| Paths taken | skills/supabase, skills/supabase-postgres-best-practices | plugins/railway/skills/use-railway (clone path `plugins`) | skills/cloudflare, skills/wrangler, skills/cf-cli |
| SPDX | MIT ("Copyright (c) 2026 Supabase") | MIT ("Copyright (c) 2026 Railway Corporation"; plugin.json also `"license": "MIT"`) | Apache-2.0 |
| Licence file | LICENSE-supabase-agent-skills | LICENSE-railwayapp-railway-skills | LICENSE-cloudflare-skills |
| Versions | skills/supabase/SKILL.md:6 `version: "0.1.2"`; supabase-postgres-best-practices/SKILL.md `version: "1.1.1"`, `date: January 2026` | plugin `"version": "1.7.0"`; references "Validated against" CLI v5.23.3 / v5.49.1 | root plugin.json `"version": "1.0.4"`; cf-cli is beta, "Requires Node.js 22.18 or later" (cf-cli/SKILL.md:8, :39) |

Each licence file is the upstream root `LICENSE`, copied with `cp`. The Cloudflare sparse clone
has no NOTICE file at its root (not checked on the remote). None of the three skills carries a
"verified on <date>" sentence; the Railway references' "Validated against" sections are kept
verbatim in both trimmed files.

## Taken

| Package file | From | How |
| --- | --- | --- |
| references/railway-deploy-history.md | use-railway/references/deploy.md L15-32, L100-110, L222-225 | trimmed; sections copied with `sed -n` (verbatim); a FixFlow note added under the title |
| references/railway-operate-edge.md | use-railway/references/operate.md L5-28, L67-78, L221-236, L292-296 | trimmed, verbatim sections; FixFlow note added |
| references/cloudflare-r2-gotchas.md | skills/cloudflare/references/r2/gotchas.md L1-7, L11, L14-17 | trimmed rows, verbatim; Apache-2.0 §4(b) change notice in the header |
| references/cloudflare-r2-configuration.md | skills/cloudflare/references/r2/configuration.md L1-6, L9, L13, L18-19 | trimmed rows, verbatim; change notice in the header |

Nothing is vendored from supabase/agent-skills (no recovery content: `grep -rniE
"pg_restore|pg_dump|setval|backup|restor"` over skills/ outside CHANGELOG finds only the
best-practices description's mention of "restoring dumps (pg_restore)"). Its licence is still
shipped because SKILL.md compresses three of its principles.

## Changed (adapted into SKILL.md)

- supabase/SKILL.md Core Principles 1-3 (L13, L18, L21) → compressed to "check current docs
  first, verify after a change, stop after 2-3 failed attempts"; L122 ("any docs page can be
  fetched by appending `.md`") → used for every Supabase fact in the runbook (worked on
  2026-11-04).
- use-railway/SKILL.md Execution rule 9 (L320, observe `SUCCESS` before reporting) and the
  User-only-commands pattern (L322-339) → recast as FixFlow's `[owner]` hand-off: the owner runs
  every `railway` command, the agent tabulates the JSON.
- use-railway/references/configure.md:259 (custom-domain 404 until TXT verifies) → one row of the
  edge-404 evidence table, labelled upstream, not FixFlow evidence.
- cloudflare R2 gotchas listing row → tied to `list_keys` (backend/app/core/storage.py:157-169).
- cf-cli/SKILL.md:71 "Aborted deletes still exit 0" → not carried: FixFlow reaches R2 through
  the S3 API (boto3 / aws CLI / rclone), and agents never delete.

## Rejected (with reason)

Collisions with CLAUDE.md / plan §0 / the package README (SOURCE-NOTES §5 C1-C17); every one is
also listed in SKILL.md "Where upstream disagrees":

- C1 use-railway/SKILL.md:171 "run `railway up` … Run it yourself" — agents never deploy; repo-root
  deploy rebuilds the API as the SPA (CLAUDE.md:88).
- C2 use-railway/SKILL.md:85 `railway up` signs the user in — no agent authentication.
- C3 use-railway/SKILL.md:16-19 (description) "do not refuse" sign-up — no account creation.
- C4 deploy.md:37-40 `railway up --ci` waits for a verdict — FixFlow: it always times out and a
  re-run double-deploys (docs/HANDOFF-2026-07-28-open-work.md:64-66).
- C5 deploy.md:75-80, operate.md:269 `railway redeploy … --yes` — no agent deploy; never a
  rollback (docs/adr/0001-database-region-topology.md:152).
- C6 deploy.md:85-88 `railway down` — takes the API down; owner-only.
- C7 databases.md:44, :57, :61 Railway Postgres PITR / `backup restore` overwrites data — not
  FixFlow's database (CLAUDE.md:30); restore over live data is owner-only. databases.md not vendored.
- C8 use-railway/SKILL.md:141-143 `curl … | sh` installers — downloads-and-executes; never.
- C9 hooks/auto-approve-api.sh:2 — a permission bypass; not vendored.
- C10 configure.md:35 variable changes redeploy — kept only as the reason env changes are [owner].
- C11 supabase/SKILL.md:137 schema changes via `execute_sql` / `supabase db query` — Alembic owns
  the schema.
- C12 supabase/SKILL.md:31 enable RLS — no RLS in FixFlow.
- C13 supabase/SKILL.md:37 `user_metadata` claims — auth is custom FastAPI JWT, not GoTrue.
- C14 supabase/SKILL.md:90 MCP `execute_sql` / `psql` fallback — production SQL is owner-only.
- C15 supabase/references/skill-feedback.md:11, cf-cli/references/skill-feedback.md:25 (file a
  GitHub issue) — publishing needs explicit permission; all skill-feedback.md files dropped.
- C16 use-railway/SKILL.md:318 confirm-then-execute destructive actions — FixFlow: `[owner]`.
- C17 (FixFlow-internal, not upstream) docs/program/w2/O-08-design.md:61 503 stub on the old host —
  void by plan rule 5 (docs/program/SHIP-PLAN-2026-11.md:110); same for the O08-F14 FIX line
  (docs/program/evidence/w2/O-08.txt:171).

Rejected as irrelevant (SOURCE-NOTES §4.2):

- supabase/SKILL.md Core Principles 4-6 and the security checklist (L26-76), MCP server
  (L97-115), schema-change workflow (L125-146), Debugging (L148-150): Supabase is a Postgres host
  only (CLAUDE.md:30, :98).
- supabase-postgres-best-practices/* (31 rule files): performance and design guidance, not
  recovery; its pooling notes add nothing to docs/RUNBOOK-BACKUPS.md:104-107.
- use-railway: account creation & sign-in (L156-215), agent tooling (L217-262), feature flags,
  tracing, sandbox, cloud agents, IaC, usage, setup, every analyze-db-* reference and every
  scripts/*.py (analyze-postgres.py alone is 150,106 B), `railway bucket …` (Railway buckets, not
  R2), databases.md PITR/HA/PgBouncer (Railway-hosted DB).
- deploy.md build/monorepo/Railpack sections, operate.md metrics/SSH/database inspection/CDN-WAF/
  Recovery sections: deploy-time configuration, not recovery of a dead project.
- cloudflare/SKILL.md product map (L26-133) and every non-R2 reference directory; r2/README.md,
  r2/api.md, r2/patterns.md (Workers-binding and upload patterns; FixFlow uses the S3 API).
- wrangler/SKILL.md (Previews, versions, secrets, rollback L52) and cf-cli `cf deploy/dev/build`,
  `cf auth login`: FixFlow has no Workers project; R2 is reached with S3 credentials.

## Web pages fetched on 2026-11-04 (this author re-fetched every one it cites)

| URL | Result |
| --- | --- |
| https://supabase.com/docs/guides/platform/free-project-pausing.md | 200: 7-day pause; 1-year restore; Resume flow |
| https://supabase.com/docs/guides/platform/upgrading.md | 200: 1-year window; image alt "Project Paused: 90 Days Remaining"; download after window; minor-version move; paid cannot pause; upgrade re-enables expired restore |
| https://supabase.com/changelog/27497-paused-free-plan-projects-are-restorable-for-90-days | 200: "restorable for 90 days", beginning June 24, 2024 |
| https://supabase.com/docs/guides/platform/backups.md | 200: daily backups Pro 7 / Team 14 / Enterprise 30; Free told to `db dump`; PITR add-on |
| https://supabase.com/docs/guides/local-development/restoring-downloaded-backup.md | 200: `supabase db start --from-backup db_cluster.backup`; earliest 15.1.0.55; format not stated |
| https://supabase.com/docs/guides/platform/migrating-within-supabase/dashboard-restore.md | 200: logical-backup projects only; gzipped; `psql -d … -f`; session pooler on IPv4; expected errors |
| https://developers.cloudflare.com/r2/api/tokens/ | 200: four token levels; Object Read only reads and lists in specific buckets; S3 API only |
| https://developers.cloudflare.com/r2/examples/aws/aws-cli/ | 200: region `auto`; endpoint form; `s3api list-objects-v2` example; no `s3 cp` example |
| https://developers.cloudflare.com/r2/examples/rclone/ | 200: `type = s3`, `provider = Cloudflare`, `acl = private`, `no_check_bucket = true`; `rclone tree`, `rclone copy` |
| https://docs.railway.com/deployments/reference | 200: states; rollback uses the selected deployment's source; retention limit |
| https://docs.railway.com/networking/troubleshooting/application-failed-to-respond | 200: 502, edge cannot reach the app; no mention of 404 |
| https://docs.railway.com/reference/errors/application-not-found | **404 — no such page** |
| https://station.railway.com/questions/custom-domains-are-verified-and-propagat-69569c8c | 200: `x-railway-fallback: true`, "Application not found" body, employee reply, 2026-07-29 |
| https://www.postgresql.org/docs/17/app-pgrestore.html | 200: `--exit-on-error`, `--single-transaction` implies it, `-l` |
| https://www.postgresql.org/docs/17/view-pg-sequences.html | 200: `last_value` NULL cases and the caching caveat |

Survey-only (fetched by the Sonnet survey on 2026-11-04, not re-fetched here, not cited as web
facts): https://docs.railway.com/domains/troubleshooting (404),
https://station.railway.com/questions/error-404-application-not-found-3586cd70 (no staff answer),
https://developers.cloudflare.com/r2/api/s3/api/, https://www.postgresql.org/docs/17/app-pgdump.html
(the "older major" rule is cited from the design instead). WebFetch answers come through a small
summariser model; quoted strings above are the ones it returned verbatim.
