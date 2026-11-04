<!-- Authored for FixFlow, 2026-11-04 -->
# FixFlow self-host stack: the constants a draft must carry

Source of truth is `docs/program/w2/O-08-design.md` (§1-§2, §6, amendments) and plan P3a
(`docs/program/SHIP-PLAN-2026-11.md:504-568`). Both are on PR #182 (head 3415b5e) at write time;
their line numbers refer to that head. Worktree paths are on `main` @ a31924a. Every value below is
a name, image tag, prefix or placeholder; no secret value appears in this file.

## 1. Compose services (`docker-compose.prod.yml`, profiles per plan P3a)

| Profile / service | Constant | Source |
| --- | --- | --- |
| `db` / `postgres` | `postgres:17` (Debian/glibc), pin minor + digest; named volume `pg_data`; `fsync=on`, `full_page_writes=on`, `synchronous_commit=on`, `max_connections=60`, `archive_mode=off`; `stop_grace_period 60s`; network `db` only (`internal: true`) | O-08-design.md:12, :14 |
| `app` / `backend` | `build ./backend` (`python:3.12-slim`, `postgresql-client-17`); `env_file /etc/fixflow/backend.env` root:root 0600; **no `ports:`**; one uvicorn process, never `--workers`; healthcheck on `/api/ops/health` with `X-Ops-Proxy-Token`, never `/api/health`; json-file logs `max-size 10m max-file 5`; cannot start before the restore | O-08-design.md:15; backend/Dockerfile:4, :25; backend/start.sh:12; plan :504-506 |
| `web` | Caddy serving a `node:22` build stage; `auto_https off`; CSP allowing `api.${DOMAIN}`, Google Fonts (self-hosted per `O05-11`), the Sentry ingest host; replaces `node:20-alpine` + `serve@14` | O-08-design.md:17; plan :507-508; Dockerfile.web:10, :39 |
| `ops` (optional) | `Dockerfile.ops`, `OPS_BACKEND_URL=http://backend:8000`, `OPS_RAILWAY_*` unset; published only behind Access or LAN-only | O-08-design.md:18; plan :508-509 |
| `edge` / `cloudflared` | image pinned; **locally managed `config.yml` mounted read-only, credentials file as a compose secret**; final catch-all `http_status:503`; outbound 7844 only | O-08-design.md:16; plan :509 |
| none | GlitchTip, Uptime Kuma: optional, off the critical path, die with the box | O-08-design.md:19 |

Backend env set deliberately (all `FIXFLOW_*`, names only): `ENVIRONMENT=production`
(the boot guard is open otherwise, `backend/app/core/config.py:221` and `O08-F01`),
`ENABLE_DISPATCHER=false`, `ENABLE_SCHEDULER=true`, `SCHEDULER_TIMEZONE=Asia/Karachi`,
`BACKUP_ENABLED=false` until P3c step 7, `BACKUP_PREFIX=backups/db-selfhost/`,
`BACKUP_RETENTION_DAYS=30` (O-08-design.md:21-22; plan :505-506, :512).

## 2. Edge: ingress shape (sketch from O-08-design.md:16; hostnames are placeholders)

```yaml
# /etc/fixflow/cloudflared/config.yml  (mounted :ro; the tunnel id and credentials path come from the owner's tunnel)
ingress:
  - hostname: api.${DOMAIN}            # -> backend directly, no Caddy hop (XFF single-hop, O08-F03/F04)
    service: http://backend:8000       #    until P4a this rule points at the 503 maintenance responder (plan :619)
  - hostname: app.${DOMAIN}            # behind Cloudflare Access (plan :620)
    service: http://web:80
  - hostname: ops.${DOMAIN}            # only if deployed, only behind Access (O-08-design.md:16)
    service: http://ops:8080
  # temporary, P3c only: preflight-api.${DOMAIN} -> http://backend:8000, Access service token, deleted at step 8 (plan :621-622, :649)
  - service: http_status:503           # MUST be 503; the documented example 404 parks phone writes
```

Why 503: the phones treat 400/403/404/409/422 as definitive (`technician-app/src/lib/syncClassification.ts:18`).
Note for reviewers: on `main` @ a31924a a 5xx/429 that recurs `MAX_ATTEMPTS = 5` times is also
parked (`technician-app/src/lib/syncClassification.ts:24`); "a markerless 503 is connectivity,
nothing parks" (plan :1252) depends on the field build's origin-marker classification (P1/P2a),
and `X-FixFlow-Api` does not exist on `main` yet (grep finds no match in `backend/app`). INFERRED: a
long maintenance window against a pre-P2a build is not free.

Cloudflare settings for `api.` (owner, dashboard): no WAF managed challenges, no Bot Fight Mode,
no Browser Integrity Check, no Access; rate rules answer only 429 + Retry-After; no path routes
(O-08-design.md:62; plan :563, :640).

## 3. Host (VPS by default until P13e; home box after the box gate)

- VPS: 2 vCPU / 4 GB, provider backups on, provider firewall deny-all-inbound-except-SSH, swap,
  unattended upgrades; Mumbai measured first, then Singapore (plan :300-302, :522-523; O-08-design.md:106-110).
- Home box: Linux (Ubuntu Server LTS preferred over Windows + Docker Desktop), UPS covering box,
  ONT **and** router, BIOS power-on after AC loss, `systemctl enable docker`, chrony/timesyncd,
  SSH key-only, unattended-upgrades reboot at 04:30 (clear of the 02:30/03:00/03:30 jobs), no
  auto-updating images, the docker group treated as root (O-08-design.md:25, :77; plan :303).
- Box gate: a cron on the home box pings a **second** dead-man check every 5 min; the gate is
  ≥ 99.5 % reachability over 14 days read from that service's history, or a second uplink
  (plan :305-309).
- Firewall: Docker published ports bypass ufw (R-03 F16, `docs/program/evidence/w1/R-03.txt:36`),
  so "no `ports:`" is the control (O-08-design.md:12).
- Durability stack: consumer SSD + UPS + `fsync` on (O-08-design.md:26; R-03 F15 at R-03.txt:34).

## 4. Secrets at rest (names only)

`/etc/fixflow/*.env` root 0600 plus tunnel credentials; not in git, not only on the box; an
encrypted copy in the owner's password manager and a printed recovery sheet (O-08-design.md:24;
plan :592-595). List: JWT secret, `FIXFLOW_OPS_PROXY_TOKEN`, R2 keys, FCM service account, Sentry
DSN, optional `FIXFLOW_LEGACY_JWT_SECRET` + `EXPIRES_AT` (plan :527-528). Not re-mintable: the
Android keystore (O-08-design.md:24). A VPS provider snapshot holds plaintext `/etc/fixflow`
(plan :1228). Disk encryption vs unattended boot: LUKS with a passphrase prompt blocks
self-recovery (O-08-design.md:77); plan default "none" (plan :1317).

## 5. Monitoring

Off-box by construction (O-08-design.md:8, :32). P3a: host cron calling `/api/ops/health` with the
token, then pinging the external dead-man service (plan :520-521). MON_LOC default: external
heartbeat service paging the owner by email (plan :1311). Error tracking: Sentry SaaS, decided
(G2-D2; plan :1310) — the APK DSN is baked, so GlitchTip would need a new APK (O-08-design.md:31).
Uptime Kuma off-box is the named alternative (O-08-design.md:32). Dozzle: named in the R-03 brief
(design `docs/ORCHESTRATION-DESIGN-2026-10.md:193`) but no fact was collected and no phase uses it.

## 6. Runbook numbering (plan wins over O-08)

Plan P3a: R1-R7 incl. R5 deploy of a tag or of `main`, R8 host -> VPS, R9 the P13e VPS -> home-box
move (plan :550-558). O-08's skeleton numbers differ (its R9 is PIN lock recovery,
O-08-design.md:84); the RUNBOOK-SELFHOST draft uses the plan's numbers.
