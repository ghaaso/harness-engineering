---
name: selfhost-homelab-ops
description: FixFlow self-hosting operations for R-03, O-08 and the migration session - the docker-compose.prod.yml stack (Postgres 17, backend, Caddy web, ops, cloudflared with a 503 catch-all), Cloudflare Tunnel + Access, pg_dump/pg_restore restore drills against the Appendix B gate, backup prefixes and the first-night prune hazard, off-box dead-man monitoring, UPS/power-loss, Linux hardening, secrets at rest and the CGNAT test. Use when drafting or reviewing the P3a files and RUNBOOK-SELFHOST, preparing P0b/P3b/P3c/P13b/P13c/P13e owner checklists, running a disposable local restore drill, or triaging a degraded self-hosted service hop by hop. Do NOT use for the drain protocol (O-10), migrations, DB-role or VALIDATE SQL (fixflow-migration-reviewer), recovering the dead Supabase/Railway production (supabase-railway-r2-recovery), APK builds, or any production action - deploys, restores over live data, Cloudflare dashboard changes, key rotation and production CLI are [owner].
---

# Self-hosting / homelab operations (FixFlow)

The project's Caddy, Postgres 17, R2, monitoring, UPS and CGNAT procedures are FixFlow's own and
come from the O-08 design and plan phases P0b, P3a-P3c, P13a-P13e. Upstream gives two
disciplines only: **restore verification and stack triage** (bolens) and **Tunnel + Access
guardrails** (Cloudflare `cloudflare-one`). Where they collide with FixFlow, FixFlow wins (§5).

Dates are absolute; this skill was written 2026-11-04 against `main` @ a31924a and PR #182 @ 3415b5e.

## 1. FixFlow facts (read these before proposing anything)

### 1.1 Why the stack looks like this

- The fleet only ever sees `https://api.${DOMAIN}`; it is baked into the APK, so DNS is the only
  indirection afterwards (`docs/program/w2/O-08-design.md:6` — "The only thing the fleet ever sees").
  The APK reads `EXPO_PUBLIC_API_URL` at build time (`technician-app/src/lib/config.ts:14`;
  key at `technician-app/eas.json:21` and `:31`, key names only).
- Phones PUT/GET media straight to R2, so the host carries only JSON and needs no object store
  (`docs/program/w2/O-08-design.md:7`). The R2 endpoint is hard-coded
  (`backend/app/core/storage.py:182` — `endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com"`),
  and the MinIO community repo is archived (R-03 F11, `docs/program/evidence/w1/R-03.txt:26`).
  **R2 stays; MinIO is out.**
- Anything that must report the host's death lives off it (`docs/program/w2/O-08-design.md:8`).
- The backend never answers a 4xx for infrastructure reasons (`docs/program/w2/O-08-design.md:9`):
  phones treat 400/403/404/409/422 as definitive (`technician-app/src/lib/syncClassification.ts:18`
  — `export const DEFINITIVE_4XX = new Set([400, 403, 404, 409, 422]);`). On `main` a 5xx/429 that
  recurs 5 times is parked too (`technician-app/src/lib/syncClassification.ts:24` —
  `export const MAX_ATTEMPTS = 5;`); the plan's "a markerless 503 is connectivity, nothing parks"
  (`docs/program/SHIP-PLAN-2026-11.md:1252`) relies on the field build's origin marker
  (P1/P2a). INFERRED: say which build a 503 claim is about.

### 1.2 Code on `main` that the stack must respect

| Fact | Cite |
| --- | --- |
| Boot guard is **fail-closed** since P1 (#187, `87bbe88`): the default environment is `production`, and a production boot is refused while `boot_problems` finds a missing or default secret (`O08-F01`, `O6-F01`). At `a31924a` it was open off Railway | `backend/app/core/config.py` (`environment`, `boot_problems`): re-read on the current head |
| Backups ON by default, 30-day retention, prefix `backups/db/` | `backend/app/core/config.py:197`, `:201`, `:202` |
| Dispatcher OFF by default | `backend/app/core/config.py:188` — `enable_dispatcher: bool = False` |
| After each upload the job prunes keys directly under its own prefix that are older than retention; since P3a (#195, `90ea88d`) it never prunes under `archive/` and always keeps the newest dumps (`O08-F02`). At `a31924a` it deleted every matching key older than retention | `backend/app/core/backup.py` (`keys_to_prune`): re-read on the current head |
| Dump flags `--format=custom --schema=public --no-owner --no-privileges` | `backend/app/core/backup.py:88-92` |
| Image has `pg_dump` client 17 on `python:3.12-slim` | `backend/Dockerfile:25`, `:4` |
| `start.sh` migrates on every start, then one uvicorn | `backend/start.sh:9`, `:12` |
| `/api/health` never touches the DB (`O08-F07`); use `/api/ops/health` + `X-Ops-Proxy-Token` | `backend/app/features/health/router.py:12`; `backend/app/features/ops/router.py:18`, `:23` |
| Per-IP limiter takes the **last** XFF entry (`O08-F03`) | `backend/app/features/identity/router.py:63` — `return forwarded.split(",")[-1].strip()` |
| The repo compose is dev-only: `postgres:16-alpine`, `5432:5432`, `--reload` (`O08-F04`, `O08-F12`) | `docker-compose.yml:9`, `:16`, `:28` |
| Since P3a (#195) the web image is a `node:22-alpine` build stage served by `caddy:2-alpine` (`O08-F11`). At `a31924a` it was `node:20-alpine` + unpinned `serve@14` | `Dockerfile.web`, `ops/selfhost/web/Caddyfile`: re-read on the current head |
| Restore runbook line omits `--exit-on-error`; benign "schema public already exists" | `docs/RUNBOOK-BACKUPS.md:45`, `:94` |
| Newest pre-death dump known: `fixflow-db-20260802T023008Z.dump`, 42-table drill | `docs/RUNBOOK-BACKUPS.md:128` |
| The Deploy row describes the self-host path since P3a (#195) rewrote it; Railway is history for production | `CLAUDE.md` ("The actual stack", Deploy row); `docs/program/SHIP-PLAN-2026-11.md:567` |

### 1.3 Plan phases this skill serves (`docs/program/SHIP-PLAN-2026-11.md`)

| Phase | What it fixes here | Cite |
| --- | --- | --- |
| P0b | domain on Cloudflare DNS; host = VPS by default (2 vCPU / 4 GB, provider backups, deny-all-inbound-except-SSH); home box = UPS for box, ONT and router, CGNAT test; box-gate probe started | :299-310 |
| P3a | `docker-compose.prod.yml` profiles `db`/`app`/`web`/`ops`/`edge`, no published ports, `FIXFLOW_BACKUP_PREFIX=backups/db-selfhost/`, hang stub, off-box heartbeat, `docs/RUNBOOK-SELFHOST.md`, CI on PG 17, local smoke with a fake domain | :504-572 |
| P3b | host-ready checklist, secrets into `/etc/fixflow`, restore as `fixflow_app`, Appendix B gate, deep-health read-back, PIN rotation; done = no host port, no tunnel yet | :590-609 |
| P3c | tunnel + `--profile edge`, `api.` on the 503 responder, Access on `app.`/`ops.`, temporary `preflight-api.` with a service token, XFF/stopped-tunnel/CSP tests, latency, rate rule, heartbeat, backups on | :619-651 |
| P13a | `fixflow_migrator`/`fixflow_app`/`fixflow_backup`, `REVOKE` on append-only tables (`O6-F18`) — Opus, migration | :1217-1220 |
| P13b | `age` encryption, put-only token, retention, provider snapshots off, first drill (`O6-F06`) | :1225-1230 |
| P13c | heartbeat upgraded to MON_LOC with paging tested, node:22 images, lock file (`O08-F11`), R2 endpoint from settings (`O08-F10`) | :1235-1237 |
| P13d | inside the P13c section, no own heading: fence index + deferred `VALIDATE`s, each its own migration — Opus, not this skill's lane | :1238-1242 |
| P13e | VPS -> home box by runbook R9 after the box gate; old host read-only for 14 days | :1249-1259 |

Owner defaults that bind a draft (plan §4): host VPS until P13e, box gate = 14-day ≥ 99.5 % or a
second uplink (:1286); plaintext backups accepted until P13b (:1298); error tracking **Sentry
SaaS, decided** (:1310); MON_LOC = external heartbeat service paging by email (:1311); RPO 1 h
until P13e, 24 h after (:1312); dumps 30 days, media alert at 8 GB (:1313); second uplink,
split-horizon DNS, disk encryption: none (:1317).

### 1.4 Register ids

- **R-03** `research-selfhost-stack` (`docs/ORCHESTRATION-DESIGN-2026-10.md:193`); facts F1-F18 in
  `docs/program/evidence/w1/R-03.txt:6-40`.
- **O-08** `selfhost-architecture-draft`, sonnet/high (`docs/ORCHESTRATION-DESIGN-2026-10.md:305`);
  findings in `docs/program/evidence/w2/O-08.txt`: F01 :24, F02 :37, F03 :51, F04 :61, F05 :72,
  F06 :83, F07 :93, F08 :103, F09 :113, F10 :123, F11 :133, F12 :144, F13 :154, F14 :163.
- **O-06 operator items** (`docs/program/evidence/w2/O-06.txt`): `O6-F01` dev JWT secret off Railway
  (:20), `O6-F05` seed PIN 1234 (:75), `O6-F06` plaintext dumps in the media bucket under the API
  credential (:88), `O6-F17` ops console shared password, no throttling (:218), `O6-F18` runtime
  role = owner role (:229).

Constants for drafts (images, env names, ingress sketch, host checklist, secrets list, runbook
numbering): `references/fixflow-stack-constants.md`. Restore order, prefixes, Appendix B floors,
drill classification: `references/fixflow-restore-and-drill.md`.

## 2. Procedure

The agent drafts, renders, drills on disposable local containers and tabulates. Every step marked
**[owner]** is the owner's; the agent's procedure **stops there**, hands over the exact command or
dashboard step, and resumes only from output the owner pastes back.

### 2.1 P3a — the repository files exist: review them, never redraft them

**P3a merged on 2026-11-13 as `90ea88d` (#195).** `docker-compose.prod.yml`, `ops/selfhost/` (the
`bin/ffc` wrapper, `bin/restore-gate.sh`, env examples, the Caddyfile, the cloudflared examples,
`sql/appendix-b.sql`, the compose smoke), `ops/hang-stub/` and `docs/RUNBOOK-SELFHOST.md` are on
`main`. Steps 1-7 below were the drafting procedure at `a31924a` and are kept as the checklist a
review holds those files against; an agent that follows them as "draft" writes a competing copy.

1. Read O-08 §1-§2, §6 and the amendments (`docs/program/w2/O-08-design.md:11-35`, `:76-84`,
   `:104-126`), plan P3a Scope (:504-568), and the review record of #195 (kept with the program
   documents on PR #182, `docs/program/evidence/reviews/195-*.txt`: four major findings, all
   fixed: a stub that answered by itself, a bypassable restore gate, a runbook STOP step that
   detached the old hostname, a restore that dropped before it proved).
2. Review `docker-compose.prod.yml` against `references/fixflow-stack-constants.md` §1: profiles,
   `db` network `internal: true`, **no `ports:` on any service**, env files outside the repo, the
   keys `backend.env` cannot override (`FIXFLOW_ENVIRONMENT=production`, the dispatcher off),
   backups off by default in `compose.env` until the owner turns them on, the backup prefix,
   the healthcheck reading the `database` component of `/api/ops/health`. Render the compose only
   through `ops/selfhost/bin/ffc` (the images need `FIXFLOW_GIT_SHA`; a bare
   `docker compose -f docker-compose.prod.yml config` skips the wrapper's profile and env handling).
3. Review the cloudflared examples (constants §2): `api.` -> `backend:8000` directly, final
   catch-all `http_status:503`.
4. Review the Caddy web stage: `node:22` build stage, CSP and security headers (`O05-11`),
   `auto_https off`.
5. Review `docs/RUNBOOK-SELFHOST.md`: every step numbered with its check command; the restore
   proves the dump and saves a live database before anything is dropped; the old hostname is never
   detached while a roster phone lacks its row; the plan's R1-R9 numbering (constants §6).
6. If the brief says "runs commands" and `docker info` answers: run the repository's own smoke
   (`ops/selfhost/smoke/smoke.sh`), never a hand-made stack. Otherwise return
   `DOCKER_ENGINE_DOWN` or "not authorised to run", never a guess.
7. Report differences between those files and O-08 or the plan as findings with `path:line`; a
   change to them is a new PR by the owning lane, reviewed against standing rule 5 (plan :573-574).

### 2.2 P0b / P3b — host ready and restore

8. Produce the host-ready table from constants §3 with a read-only check command per row (§3
   below). **[owner]** runs it at SSH on the VPS or home box and pastes outputs; the agent
   tabulates pass/missing. Account sign-ups (domain, VPS, heartbeat service) are **[owner]**.
9. **[owner]** generates and places secrets in `/etc/fixflow` (root 0600), stores the encrypted copy
   and printed sheet (plan :592-595). The agent lists names only.
10. **[owner]** archives the old dumps to `archive/pre-selfhost/` and the laptop **before** anything
    else can prune them (O-08-design.md:47; `O08-F02`).
11. **[owner]** restores on the host: `--profile db` only, `DROP SCHEMA public CASCADE; CREATE SCHEMA
    public`, `pg_restore --exit-on-error` as `fixflow_app`, Appendix B
    (`references/fixflow-restore-and-drill.md` §3-§4). The agent compares the pasted Appendix B
    output with the floors and returns PASS/FAIL per row; any FAIL stops the phase.
12. **[owner]** starts `--profile app --profile web` at the `drain-image` tag and reads deep-health:
    `jwt_secret_overridden`, `enable_dispatcher=false`, `backup_enabled=false`, git sha, image digest
    (plan :599-601). PIN rotation with `set_pin.py` is **[owner]** production CLI (plan :604-606).

### 2.3 P3c — pre-cutover (route stays closed)

13. **[owner]** creates the tunnel and Access apps in the Cloudflare dashboard (plan :619-622, :652):
    `api.` on the 503 responder; Access on `app.` (and `ops.`); `preflight-api.` with a service
    token only (Service Auth policy; WEB below).
14. The agent writes the P3c test table (plan :623-628) with the exact `curl` per test; **[owner]**
    runs them (they carry the service-token headers) and pastes results; the agent records codes,
    headers and the XFF echo for P7b-1.
15. **[owner]** runs the latency test from their own phone on Pakistani mobile data (Termux
    `curl -w` with the service-token headers: 20 × GET `/api/health`, one manager login with a slip
    PIN, 20 × GET `/api/jobs`, 20 × POST `/api/events`); the agent tabulates `cf-ray` PoP and
    p50/p95 against the §4 threshold. Fail → P3b and P3c re-run on the next candidate from the same
    dump, the failed host's DB discarded (plan :629-635).
16. **[owner]** handles the old Railway hostname per rule 5 (plan :636-639, :105-110): H=yes & K=yes
    → hang stub deployed on Railway and verified (accepts, no bytes for 20 s); H=yes & K=no or a
    mixed fleet → stub deployed in hang mode until B6, its proxy mode verified with the tunnel
    stopped (it hangs, never a 5xx); H=no → recorded; the network-cut lift rule confirmed per
    phone. The agent writes the check commands and records the pasted results.
17. **[owner]** sets the login rate rule (429 + Retry-After) and confirms WAF/Bot Fight/challenges off
    for `api.` and `preflight-api.` (plan :640-641).
18. **[owner]** installs the heartbeat cron and tests paging by stopping the container once (plan :642).
19. **[owner]** turns backups on only after: prefix read back from deep-health, one manual run, the
    new key listed, one Appendix C restore of it (plan :644-646). The agent may run that Appendix C
    restore **locally** on a dump the owner hands over (§2.4).
20. **[owner]** deletes `preflight-api.` and its token; the agent records the deletion row (plan :649).

### 2.4 Restore drills (P3c step 7, P13b first drill, monthly drill)

21. Write the recovery contract first (`references/backup-restore-verification.md` "Build the
    recovery contract"): source, prefix, schedule, credential dependency, RPO per plan :1312.
22. With "runs commands" and a dump path outside the repo: run Appendix C on a fresh
    `postgres:17-alpine` container (`docs/ORCHESTRATION-DESIGN-2026-10.md:690-706`), then Appendix B.
    Isolation rules from `references/service-recovery-drill.md`: never attach the restored DB to a
    backend that can reach R2, FCM or WhatsApp; a backend started on it runs the scheduler and its
    pruner unless `FIXFLOW_ENABLE_SCHEDULER=false`.
23. Classify recoverable / partially proven / failed / blocked
    (`references/fixflow-restore-and-drill.md` §5); remove only the drill's own container; delete the
    local dump copy.

### 2.5 Triage of a degraded self-hosted service (after P3b)

24. Follow `references/homelab-stack-triage.md` hop by hop: phone/DNS/TLS -> Cloudflare edge
    (`cf-ray`) -> cloudflared (`tunnel ingress rule`, logs) -> `backend:8000` -> `/api/ops/health`
    -> Postgres -> disk/clock/UPS. Read-only commands only (§3). A healthy tunnel proves only that
    cloudflared reaches Cloudflare (`references/cloudflare-one-tunnel-access.md`, Private Networking).
25. Report boundary, decisive evidence and the narrowest proposed action. Restart, recreate, pull,
    `git pull`, migrate or restore on the host is **[owner]** (runbook R5 is owner at SSH, plan :79-80).

### 2.6 P13 hardening and the move

26. P13a: the agent drafts only the runbook steps for applying roles; the migration is Opus
    (plan :1220); **[owner]** applies the roles on the host.
27. P13b: draft the encrypted, put-only backup path and the drill; **[owner]** creates the `age` key
    pair, second bucket and put-only token (plan :1229-1230) and switches provider snapshots off.
28. P13c: draft the MON_LOC upgrade and node:22 image bumps; **[owner]** confirms paging on a stopped
    container (plan :1243). P13d is migrations (Opus) — out of this skill.
29. P13e (R9): the agent writes the step table from plan :1252-1257 and the box-gate evidence check
    (14-day history ≥ 99.5 % or a second uplink, :1250-1251). **[owner]** executes every step: 503
    route, VPS backend stop and crons off, `/etc/fixflow` byte-for-byte copy, final dump + sha256,
    production restore, tunnel move, read-only old host for 14 days, the dated destroy row.

## 3. Checks (read-only; what each proves)

| Command (run by whoever holds the host; the agent only locally) | Proves | Does not prove |
| --- | --- | --- |
| `docker compose -f docker-compose.prod.yml config --quiet` (synthetic env) | the file renders | health, mounts, secrets |
| `docker ps --format '{{.Names}} {{.Ports}}'` | no host port published (plan :608) | firewall state |
| `docker compose exec backend sh -c 'curl -fsS -H "X-Ops-Proxy-Token: $FIXFLOW_OPS_PROXY_TOKEN" http://localhost:8000/api/ops/health'` (single quotes: the token expands inside the container and is never echoed; `curl` is in the image, `backend/Dockerfile:18`) | DB, migration head, R2, config presence | phone path |
| `curl -fsS http://localhost:8000/api/health` | the process answers | anything about the DB (`backend/app/features/health/router.py:12`) |
| `docker inspect --format '{{.Image}}' backend` | the running image digest (plan :80-81) | which commit unless `FIXFLOW_GIT_SHA` agrees |
| `cloudflared tunnel --config <config.yml> ingress rule https://<host>/` | which ingress rule matches; the last is the catch-all | the tunnel is connected |
| `dig A region1.v2.argotunnel.com`; `nc -vz -w 3 <ip> 7844`; `nc -uvz -w 3 <ip> 7844` | egress to the tunnel edge over TCP/UDP 7844 (WEB) | DNS for `api.` |
| `curl -is https://api.<domain>/api/health` before P4a | the world sees a markerless 503 | backend health |
| `pg_restore -l <dump>` + `sha256sum <dump>` | the archive's table of contents is readable; identity of the file | restorability (only Appendix C proves that) |
| Appendix C + Appendix B | restore exit code, counts, sequences, cursor, fence, head | a live app works on it |
| `docker compose exec postgres psql -U postgres -c 'SHOW fsync' -c 'SHOW full_page_writes'` | durability settings are on (R-03 F15) | disk cache honesty |
| `docker inspect --format '{{.HostConfig.RestartPolicy.Name}}' <c>` | `unless-stopped` (a manually stopped container stays stopped, R-03 F14) | boot order |
| `systemctl is-enabled docker`; `timedatectl`; `chronyc tracking` | the daemon starts at boot; clock sync (punch re-bucketing depends on it, O-08-design.md:80) | BIOS power-on (owner checks it) |
| `df -h /var/lib/docker`; `docker system df` | disk headroom (alert at 80 %, O-08-design.md:79) | — never follow with prune |
| `stat -c '%U %a %n' /etc/fixflow/*` | owner root and mode 600, names only | contents (never `cat` them) |
| Router admin page WAN IP vs an IP-check site, read by the owner | CGNAT present if they differ (`docs/program/evidence/w2/O-08.txt:10`) | ISP policy |

**CGNAT on Pakistani ISPs: `WEB_UNAVAILABLE: CGNAT on Pakistani ISPs`.** No credible source was
found for any named ISP (R-03 F18, `docs/program/evidence/w1/R-03.txt:40`; survey 2026-11-04). Do not
write CGNAT or static-IP claims about PTCL, Nayatel, StormFiber or Transworld. Grounded only:
the outbound-only tunnel needs no inbound port (R-03 F2, `docs/program/evidence/w1/R-03.txt:8`,
itself labelled an inference), so CGNAT matters only to a port-forward plan, which this design
does not use (`docs/program/w2/O-08-design.md:78`).

WEB facts (fetched 2026-11-04): a locally managed config with ingress rules "must always include a
catch-all rule that concludes the file", and the page's example catch-all is `http_status:404`
(https://developers.cloudflare.com/tunnel/advanced/local-management/configuration-file/);
cloudflared makes outbound-only connections over port 7844 with `quic` (UDP) or `http2` (TCP)
(https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/troubleshoot-tunnels/connectivity-prechecks/);
service tokens send `CF-Access-Client-Id` / `CF-Access-Client-Secret`, need the Service Auth policy
action, and the secret is displayed once
(https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/).
The Free Zero Trust seat count is unverified (R-03 F4, `docs/program/evidence/w1/R-03.txt:12`).

## 4. Forbidden actions

| Never | Rule it comes from |
| --- | --- |
| Deploy, restart, recreate, `pull`, `git pull` on the host, or run production SQL/CLI (`set_pin.py`, role grants, `UPDATE` fence) | README rule 4; plan :79-80 (R5 owner at SSH); plan §0 routing :47 |
| Restore over live data, or start the backend before the restore on an empty DB | README rule 4; `docs/program/w2/O-08-design.md:43` |
| `docker compose down -v`, `docker system/volume prune`, `rm` a volume, destroy the old host early | `references/homelab-stack-triage.md` Mutations; plan :1256-1259 (14-day read-only host) |
| `alembic downgrade`; Railway's rollback button; an image below the DB head | `docs/HANDOFF-2026-07-28-open-work.md:76`, `:80`; `docs/program/w2/O-08-design.md:58` |
| `BACKUP_ENABLED=true` on the default prefix, or before the archive copy and restore sign-off | `O08-F02`; `backend/app/core/backup.py:125-131`; plan :644-645 |
| A catch-all or any edge feature that answers `api.` with a 4xx (404 catch-all, WAF challenge, Bot Fight, Browser Integrity Check, Access) | `docs/program/w2/O-08-design.md:16`, `:62`; `technician-app/src/lib/syncClassification.ts:18` |
| Make the old Railway hostname answer anything but hang/proxy per rule 5 | plan :105-110 (O-08 §4's "503 stub" line is void) |
| `ports:` on any prod service; relying on ufw instead | plan :511; R-03 F16 (`docs/program/evidence/w1/R-03.txt:36`) |
| `fsync`/`full_page_writes` off; `--workers` on uvicorn | `docs/program/w2/O-08-design.md:14`, `:15`; CLAUDE.md:311 (single-replica scheduler) |
| Restore a prod dump into Postgres 16 | `docs/program/w2/O-08-design.md:14`; plan :566 (`O08-F12`) |
| Enable the dispatcher | plan :102-104 (standing rule 4); `backend/app/core/config.py:188` |
| Swap R2 for MinIO; swap Sentry for GlitchTip | `backend/app/core/storage.py:182`; plan :1310 (a change needs a new APK) |
| Read `.env` or `/etc/fixflow` contents, print a token, paste a value from `technician-app/eas.json` / `app.json` | README rule 3 (values as sha256 fingerprints only) |
| Touch the Cloudflare, Railway, VPS-provider or heartbeat accounts | README rule 4; plan :652 (owner inputs: Cloudflare dashboard) |
| Install anything on a roster phone, message a technician | plan :95 (standing rule 1); README rule 4 |

## 5. Where upstream disagrees

1. **cloudflare-one/SKILL.md:46 and :118** — "prefer remotely managed/token-based tunnels" and
   "Token-based, remotely managed tunnels are the default". FixFlow's O-08 pins a locally managed
   `config.yml` mounted read-only (`docs/program/w2/O-08-design.md:16`) so the ingress, including the
   503 catch-all, is a reviewed repo file an agent can diff and Opus can refute; the plan does not
   restate the choice, so a switch is an owner decision row, and the 503 catch-all survives either way.
2. **cloudflare-one/SKILL.md:118** — "Run multiple cloudflared connectors for production HA,
   preferably on separate hosts." FixFlow has one primary host; availability is answered by the VPS
   default and the box gate or a second uplink (plan :305, :1286).
3. **cloudflare-one/SKILL.md:16 and :78** — stage risky changes disabled or "limited to a pilot".
   Standing rule 1 (plan :95): nothing is trialled on a phone before its drain; `api.` answers a 503
   to everyone until P4a, and pre-cutover tests go only through `preflight-api.` with a service
   token (plan :619-622).
4. **cloudflare-one/SKILL.md:15 and :179** — "If account access is available, inspect existing
   resources" / retrieve "existing account objects". Agents never touch the Cloudflare account;
   dashboard work is the owner's (README rule 4; plan :652).
5. **cloudflare-one/SKILL.md:69 and :85** — "Use both" Access and Gateway; "Access policies are
   default-deny". Correct for `app.`/`ops.`, wrong for `api.`: a challenge or Access denial is a 403
   the phones park (`technician-app/src/lib/syncClassification.ts:18`), so `api.` carries no Access,
   WAF, Bot Fight or challenge (`docs/program/w2/O-08-design.md:62`; plan :640-641).
6. **Cloudflare docs example `- service: http_status:404`** (WEB, fetched 2026-11-04). FixFlow's
   catch-all is `http_status:503` (`docs/program/w2/O-08-design.md:16`; plan :509); a 404 is
   definitive. Standing rule 5 voids only O-08 §4's stub line for the **old** hostname (plan :110).
7. **homelab-stack-triage/SKILL.md:42** — "A restart tests transient state; recreation applies
   configuration" (authorised mutations by the agent). On the FixFlow host every mutation is
   `[owner]` (README rule 4; plan :79-80); the agent proposes the narrowest one.
8. **homelab-stack-triage/SKILL.md:42** — never "replace a database without explicit
   authorization and recovery proof". Consistent but stricter here: the replaced host stays a
   read-only DB container for 14 days before a dated destroy row (plan :1256-1259).
9. **backup-restore-verification/SKILL.md:8** — never "prune snapshots, change retention".
   Consistent, but the app prunes by itself on its first nightly run
   (`backend/app/core/backup.py:125-131`); the prefix change, `BACKUP_ENABLED=false` and the archive
   copy pre-empt it (plan :505, :512; `O08-F02`).
10. **backup-restore-verification/SKILL.md:16** — Restic/Borg repositories. FixFlow backups are
    custom-format `pg_dump` objects in R2 (`backend/app/core/backup.py:88-92`); repository-integrity
    steps map to `pg_restore -l` + sha256 + Appendix C.

## 6. References

- `references/fixflow-stack-constants.md` — compose services, env names, ingress sketch, host,
  secrets, monitoring and runbook numbering (authored).
- `references/fixflow-restore-and-drill.md` — backup behaviour, prefixes, restore order, Appendix B
  floors, drill classification, pg_dump vs pgBackRest (authored).
- `references/backup-restore-verification.md` — recovery contract, evidence ladder, result taxonomy
  (bolens, trimmed, MIT).
- `references/service-recovery-drill.md` — isolation before startup, usability proof, teardown
  (bolens, verbatim, MIT).
- `references/homelab-stack-triage.md` — hop-by-hop service path, mutation discipline (bolens,
  trimmed, MIT).
- `references/example-validation.md` — rendering Compose with synthetic inputs, helper effects
  (bolens, verbatim, MIT).
- `references/cloudflare-one-tunnel-access.md` — Tunnel prompts, Access guardrails, validation
  prompts, API safety (Cloudflare, trimmed, Apache-2.0); read with §5.
- docs/ORCHESTRATION-DESIGN-2026-10.md and docs/program/* are on PR #182 (head 3415b5e) at write time; their line numbers refer to that head.
