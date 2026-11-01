# FixFlow ship plan — phases sized to one session each (v2, 2026-11-01)

**Status: v2 — revised from the Stage-3 critique.** The five-lens critic run on v1 produced
138 findings (`SHIP-PLAN-2026-11-critique.md`); §6 records how each was adjudicated and the
seven rulings the revision required. v1 is in git history (commit 762a63f). Still awaiting:
the owner's P0a answers (§4), and the second critic pass noted at the end of §6.

Built on `G2-deep-dive-gate-2026-11-01.md` (the verified register and decisions G2-D1..D3),
`G1-discovery-gate-2026-11-01.md`, the method in `docs/ORCHESTRATION-DESIGN-2026-10.md`, and
the W2 design notes, which now live in this repository under `docs/program/w2/`:
`O-01` phones, `O-03` offline engine, `O-04` attendance truth, `O-05` external attacker,
`O-06` operator/insider and money evidence, `O-07` accounting slice, `O-08` self-host,
`O-10` fleet drain. Every phase cites them by path, so a fresh session resumes from the
repository alone. Register ids (`O01-F04`, `O3-F2`, `O10-F3`, …) are G2 §2 rows.

## 0. How to read and run this plan

- **Sessions.** One phase per session, one phase in flight at a time on this machine (the
  Docker gate recipe in design Appendix A uses fixed container names and `docker rm -f`s them;
  two sessions would kill each other's gates). A phase starts by reading its section and the
  design-note sections it cites; it ends with its checklist ticked and committed.
- **Resume.** A code phase opens a **draft PR at its first commit** whose body is the phase's
  Scope as a checkbox list; each landed item ticks its box in the same push. Resume = `gh pr
  view <branch>` and continue from the first unticked box. An operations phase ticks a numbered
  step table in `docs/program/W0-results.md` (created by P0a) as each step is executed; resume
  from the first unticked row. Builds in flight are resumed by `eas build:list`.
- **Routing (design doc §3).** Opus owns anything touching the outbox contract, drain tooling
  and its matching rules, the job lifecycle, the ledger/chain and all posting/money code, auth,
  PIN, JWT, migrations, native patches, and the location-privacy time bounds. Sonnet implements
  well-specified screens, read models, infra files, docs and tests from a design's test list.
  Haiku extracts (call-site lists, constants). Every PR gets an Opus reviewer with a
  refute-by-default brief naming the register ids it must try to break. The main session
  (Fable) briefs, gates and judges; it never implements.
- **Gates.** Backend gates run in Docker (Appendix A; the owner starts Docker Desktop and
  confirms with `docker info` — agents never start it). Web and mobile gates run natively (all
  green today on Node 24). A phase is not done until its gates are green locally **and** CI is
  green on the PR.
- **Deploys.** From P3 on, production is the self-hosted box. Every backend phase after P3
  ends with "deployed to the box per `docs/RUNBOOK-SELFHOST.md` R5 (owner at SSH, ~15 min);
  `/api/ops/health` shows the new Alembic head and image digest". Merge is not deploy.
- **Migrations** take the next free slot at rebase time (check the `down_revision` chain) and
  update the CLAUDE.md head in the same PR. Branch names carry no numbers. G2-D3 spoke of
  "0047" for the accounting slice; this plan does not pre-assign numbers (§6 ruling R6).

**Standing rules** (each one was paid for; see G2 and CLAUDE.md):

1. Nothing ships to a phone before the drain protocol has run **on that phone** and its AFTER
   audit passed. Installs are per phone, supervised, never an uninstall.
2. No field-reliability claim without device evidence from the phone models in the fleet.
3. The **drain image** is P1 (plus the P3 infrastructure) and nothing else. Behaviour-changing
   backend phases (P6a onward) deploy only after the drain window closes (`T_close`).
4. The dispatcher stays OFF. The cursor is re-seeded at window close and again after every
   supervised late re-open; enabling the dispatcher is a separate, owner-approved step after
   the last re-open (CLAUDE.md dispatcher invariants; `O10-F7`).
5. The old Railway hostname: with K=yes it may only **hang** (accept, send no bytes for ≥20 s,
   close); with K=no it may **proxy** only after O-10 steps B1–B6; never 5xx, never 2xx/204
   (`O10-F3`, `O10-F4`). O-08 §4's "503 stub" line is void (G2 §5).
6. Technicians are "released" (may open the app, clock in, travel, Retry) only by the written
   release notice at the end of their phone's E-steps; until then the P0a notice stands.
7. Money stays in integer minor units; nothing money-related rides the `job_event` cursor; the
   outbox never deletes a write. The plan never asks for an exception.

## 1. Milestones against the five goals

| Goal | Reached at | Phases |
| --- | --- | --- |
| Production back on infrastructure the owner controls, fleet data drained with proof | end of P4b | P0a, P0b, P1, P2a, P2b, P2c, P3a, P3b, P3c, P4a, P4b |
| Geofencing, pings and travel behave as designed in the field (thresholds in §4) | end of P5d-2 | P6a (rule), P5a, P5b, P5c, P5d-1, P5d-2, P6b |
| Security holes closed for a shipped system | P1 and P3c for the boot/edge set; end of P7b-2 for the rest; P8b, P13a for insider evidence | P1, P3c, P7a, P7b-1, P7b-2, P8a, P8b, P13a |
| Latency acceptable (threshold in §4) | measured in P3c, before the route opens | P3c |
| Kacha khata → manager-approved pakka khata → Odoo | end of P10b (P11 only on a Custom plan) | P7a, P8a, P8b, P9a-1, P9a-2, P9b, P10a, P10b, P11 |
| Self-hosting durable, not just running | end of P13d | P13a–P13d |

## 2. Dependency order

```
P0a today ─┬─► P0b procurement (domain, box-or-VPS by date) ─┐
           │                                                 │
P1 boot gate + marker ──► P3a self-host code ──► P3b box + restore ──► P3c pre-cutover tests
P2a engine honesty ──► P2b drain tooling ──► P2c fleet APK v1 build + install proof   │
                                                   │                                  ▼
                                                   └────────────────► P4a pilot drain (B4–B6, E1–E6) ──► P4b fleet drain + T_close
P6a verdict rule + liveness (merge any time after P1; DEPLOY after T_close) ──► P5a code ──► P5b code ──► P5c build v2 + pilot ──► P5d-1 fleet install + per-OEM ──► P5d-2 48 h review
P6b attendance migration (after T_close) ─────────────────────────────────────────────┘ (P5d needs P6a+P6b deployed ≥ 48 h before the review)
P7a authz + money guards ──► P7b-1 auth/lock ──► P7b-2 ops/media/web deps        (P7a..P8b deploy after T_close)
P7a ──► P8a void attribution ──► P8b revisions + chain + anchor ──► P9a-1 tables + decision API ──► P9a-2 stager ──► P9b UI ──► P10a export code ──► P10b rehearsal ──► P11 (optional)
P12 web defects (after P3c: web on the new origin)         P13a..P13d after P3c and P7b-2        P14-n after P5d-2
```

**Branch box (recorded by P0a).** K = the field build's signing cert equals the EAS keystore
cert; H = the owner controls the old Railway hostname; R = recovery case a/b/c
(`w2/O-10-design.md`, G1 §3).
- **K=yes** (expected): the graph above.
- **K=no, H=yes**: P2c is skipped; P4a/P4b run the `O-10` "BRANCH K=NO" steps — the old host
  proxies to the box only after B1–B6, each parked row is retried by hand, the AFTER check is
  photos-only, the owner signs off (or not) on accepting old-secret tokens for the window
  (`O10-F15`), then uninstall and fresh install of the fleet build. P2c's code still ships as
  the fresh install.
- **K=no, H=no**: no drain is possible; P4a transcribes each phone's DID-NOT-SYNC photos into
  the manager web and declares the loss; then fresh install.
- **H=no with K=yes**: from P0a until each phone's update, FixFlow's per-app Wi-Fi and mobile
  data stay off on every field phone (O-01 step 0 mechanism), recorded per phone (`O05-07`).

## 3. Phase checklist (tick in the PR or W0-results row that completes the phase)

- [ ] P0a — Owner pre-flight: clocks, evidence, tools, logins, decisions (today)
- [ ] P0b — Procurement: domain, box or VPS, ISP, UPS (owner-run, dated)
- [ ] P1 — Backend first-boot gate and origin marker
- [ ] P2a — Offline engine honesty (mobile code)
- [ ] P2b — Drain tooling and fleet profile (mobile + backend script code)
- [ ] P2c — Fleet APK v1: build, signature and install-over proof
- [ ] P3a — Self-host repository changes: compose, Caddy, cloudflared, hang stub, runbook
- [ ] P3b — Box ready, restore, PIN rotation (owner session)
- [ ] P3c — Pre-cutover verification: tunnel, XFF, selfie PUT, latency, Access, heartbeat
- [ ] P4a — Pilot drain: field protocol, B4–B6, E1–E6 on one phone
- [ ] P4b — Fleet drain and window close (owner-run, per-phone table)
- [ ] P5a — Geofence and sampler fixes (mobile code)
- [ ] P5b — Permissions, OEM onboarding, Expo patches, typed-name login (mobile code)
- [ ] P5c — Build v2 and pilot validation
- [ ] P5d-1 — Fleet install and per-OEM protocol
- [ ] P5d-2 — 48 h review and FIELD-VALIDATION
- [ ] P6a — Attendance truth, migration-free: verdict rule, liveness fields
- [ ] P6b — Attendance migration: late flags, adjustments, heartbeat index, payroll
- [ ] P7a — Authorization model and money guards
- [ ] P7b-1 — Login, lock and session hardening
- [ ] P7b-2 — Ops console, media, web dependencies, Cloudflare rules
- [ ] P8a — Money integrity 1: void attribution, payloads, captured_at
- [ ] P8b — Money integrity 2: bill revisions, chain over payments, daily verify, anchor
- [ ] P9a-1 — Accounting slice 1: posting tables, triggers, decision API
- [ ] P9a-2 — Accounting slice 2: stager
- [ ] P9b — Approval and reconciliation UI
- [ ] P10a — CSV export, transport seam, exports page
- [ ] P10b — Odoo import rehearsal (owner session)
- [ ] P11 — JSON-2 push adapter (Custom plan only)
- [ ] P12 — Web manager defects
- [ ] P13a — DB role split
- [ ] P13b — Backup encryption, put-only token, retention, first drill
- [ ] P13c — Monitoring upgrade, node:22 images, lock file
- [ ] P13d — Fence index and deferred VALIDATEs after audit
- [ ] P14-n — Expo SDK upgrade, one phase per major, then field re-validation

---

## P0a — Owner pre-flight: clocks, evidence, tools, logins, decisions (owner session, today)

**Goal.** Start the clocks that cannot wait, capture the evidence that only exists on the
phones and dashboards today, and settle the decisions the program branches on.
**Entry.** None.
**Scope.** Design doc §4.0 items 1–10, `w2/O-10-design.md` A1–A3, G1 §5 form, this plan's §4.
**Deliverables** — `docs/program/W0-results.md`, with these sections, every line a value or
"unknown, because …" **except where marked MUST**:
1. **Fleet notice** (MUST): the written procedure sent to every technician (do not open the
   app, clock in, start travel, tap Discard, update, uninstall, clear data, reset), date sent.
2. **Supabase** (MUST, same day): project status, pause date, the restore deadline as shown on
   the dashboard, Postgres major. If restorable: project restored or the logical backup
   downloaded to the laptop and copied to R2 `archive/pre-selfhost/` — path and sha256
   recorded. If the dashboard says unrecoverable: screenshot. "Unknown" is not accepted.
3. **R2 `backups/db/`**: full listing; every dump copied to `archive/pre-selfhost/` (a prefix
   the nightly pruner never lists, `O08-F02`) before any backend ever boots against the bucket.
4. **Railway**: project state; whether the old subdomain can be bound (H), and to what
   (hang stub, proxy); account and billing access.
5. **Field build** (per phone): `adb pull` of `base.apk`; `apksigner verify --print-certs`
   SHA-256; versionCode; bundle grep for `jobs.outbox.v2` and the baked API host; the result
   `K` against the EAS keystore cert (`eas credentials`); the keystore **exported** (it is not
   re-mintable, `O-08 §1`). Record v2-outbox yes/no (`O10-F15`, H14).
6. **A3 photos** of every phone's "DID NOT SYNC" / failed lists, today, without opening the app
   where the list is reachable from a notification; otherwise note "not reachable".
7. **Fleet roster**: phone × technician id × OEM/model/Android version × shared-phone yes/no.
8. **Sentry**: backend project last event; mobile project still ingests.
9. **Workshop coordinates** and the fence radius the owner wants (≥ 100 m, `O01-F04`).
10. **Tools and access on this machine**: Docker Desktop running (`docker info`); Android
    platform-tools (adb) and build-tools (apksigner) + a JDK; `npx eas-cli login`; dashboard
    logins confirmed for Railway, Supabase, Cloudflare, Sentry, Firebase, Expo; USB debugging
    on the pilot phone; a cable; a spare Android phone for P2c.
11. **Decisions** (§4): every row answered or left to its default; the chain-anchor email;
    the geofence pass thresholds (defaults in §4); the Odoo plan.
12. **If H=no**: FixFlow per-app Wi-Fi and mobile data turned off on each field phone (system
    settings, not the app), date per phone.
**Done when.** Items 1, 2, 3, 5 (for at least the pilot phone) and 10 have values; the rest
have values or a dated "unknown, because".
**Workflow.** None; a Sonnet chat can help read a dashboard. **Resume.** The file.

## P0b — Procurement: domain, box or VPS, ISP, UPS (owner-run, dated)

**Goal.** The things P2c and P3 cannot start without, with a date and a fallback.
**Entry.** P0a.
**Scope.** The **domain** (on Cloudflare DNS, multi-year, auto-renew); the **box** (Linux,
UPS, location, CGNAT test once online) **or**, by the target date, the G2-D1 fallback: a small
VPS running the identical compose behind the same `api.<domain>` (moving VPS → box later is a
DNS change only). ISP facts. Target date = the date the fleet drain must start (P4a), which
the Supabase deadline and the techs' hibernation clock set.
**Deliverables.** W0-results.md "Procurement" section: domain, destination (box or VPS),
SSH reachable, target date, fallback decision date.
**Done when.** `api.<domain>` resolves in Cloudflare DNS (to nothing yet) and a Linux host
with SSH exists. **Resume.** The section.

## P1 — Backend first-boot gate and origin marker (backend; one PR; migration-free)

**Goal.** The first self-hosted boot cannot run with a dev secret or a usable seed PIN, and
every response carries the marker the phones use to tell "the app said no" from "something in
the way said no".
**Entry.** Docker Desktop up (owner). Runs in parallel with P2a (which needs only the header
name, fixed here as `X-FixFlow-Api: 1`).
**Scope (register).**
- Dev-secret fail-open (`O6-F01`/`O08-F01`/`O05-01`/`O10-F5`): boot refuses the dev default, a
  blank secret, and a secret under 32 bytes unless `FIXFLOW_ENVIRONMENT` is explicitly `dev` or
  `test`; the default environment stops being `dev` (config.py), with the knock-on edits:
  `FIXFLOW_ENVIRONMENT=test` in `ci.yml`, in design Appendix A's gate container, and in the dev
  compose (`w2/O-06-design.md` item 1; design Appendix A).
- Seed PINs (`O6-F05`/`O05-02`/`O10-F6`): in production, login **refuses** (403, "PIN must be
  changed by the manager") any account whose hash verifies against a known default PIN; the
  deep-health check reports `default_pin_active` per account as the visible signal;
  `backend/scripts/set_pin.py` (dry-run default) sets PINs and enforces a **6-digit minimum for
  every role** (G2 §5; `O05-04`).
- `/docs`, `/redoc`, `/openapi.json` off in production (`O6-F19`); body caps on login and the
  webhook (`O05-14`).
- Marker header `X-FixFlow-Api: 1` on every response including unknown-route 404s and
  unhandled-exception 500s (an outer ASGI wrapper, not only the BaseHTTPMiddleware;
  `w2/O-03-design.md` step 1).
- Ping backdate ceiling default 48 → 240 h (`O04-F12`, G2 §5 ruling); the drain-mode knobs
  (`FIXFLOW_ATTENDANCE_*`, `FIXFLOW_JOBS_GPS_*`) documented; `/api/ops/health` documented as the
  healthcheck target (`O08-F07`).
**Deliverables.** Code + tests for each bullet (a test forces an unhandled 500 and asserts the
marker; a test boots with no env and fails closed; a test logs in with `1234` in production
and gets 403); `set_pin.py`; CLAUDE.md security section **and** the Location-and-privacy
trust-window line (240 h) updated.
**Done when.** Backend gates green in Docker and CI; `curl -i` on an unknown path shows the
marker; a manual boot with no env fails closed.
**Owner inputs.** Docker Desktop started.
**Workflow.** Opus implements (auth-adjacent); Sonnet writes tests from this list; Opus
reviewer with the G2 §1.1 claims as its refute list.
**Size.** Medium. **Resume.** Branch `fix/backend-first-boot-gate`; draft PR checklist.
**Backlog in these files.** `O05-15`, `O05-17` (committed-key console restrictions: owner
action, P0a item 10).

## P2a — Offline engine honesty (mobile code; one PR; no build)

**Goal.** The engine's contract is true under a dead, reviving or flaky backend.
**Entry.** The header name fixed (`X-FixFlow-Api: 1`). No backend dependency; parallel with P1.
**Scope.** `w2/O-03-design.md` steps 1–5, 8, 9, and the status surfaces of 10:
- Step 1: origin-aware classification — a response without the marker (edge 404, Cloudflare
  403/502/530, captive pages) is **connectivity**: no park, no drop, no attempt count. There is
  **no** JSON-`detail` fallback: the only backend the phones ever reach is P1+ (§6 ruling).
  Test: a `{"detail": …}` body without the marker is not definitive.
- Step 2: 5xx counts toward the poison cap only with the marker (`O3-F6`).
- Step 3: `sendOrQueue` keeps the write on non-app errors and on 401 (`O3-F1`, `O3-F8`).
- Step 4: `clearSession()` on every 401, including headless, and every privacy gate that needs
  a token reads the cleared state (`O3-F7`); duty truth from live punches only (`O3-F2`, `O3-F3`).
- Step 5: `drainAll(techId)` on mount, `active`, connected and after login, in a fixed order
  (`O3-F9`). This step lives here only.
- Step 8: a location outbox id **per tap** and a travel-state merge, so a second depart never
  overwrites an unsent first punch (`O3-F10`, `O3-F11`; CLAUDE.md "the outbox never deletes a
  write").
- Step 9: corrupt-store preservation (`O3-F17`).
- Step 10 (surfaces): the engine status banner (`O3-F14`); `sendPunch` reports landed / queued /
  failed distinctly (`O3-F18`, L7).
**Deliverables.** Code and the pure-module Jest tests named in the design for each step. Every
new test fails on `main` and passes on the branch (prove it in the PR).
**Done when.** `npm run typecheck && npm test` green; CI green.
**Workflow.** Opus implements (outbox contract, privacy gates); Sonnet writes tests from the
design's test list; Opus reviewer briefed with CLAUDE.md's outbox invariants.
**Size.** Large but single-threaded. If it runs long, land steps 1–5 and 8, and open **P2a-2**
for 9 and 10 with the same brief; P2b's entry becomes "P2a and P2a-2 merged".
**Resume.** Branch `fix/mobile-engine-honesty`; draft PR checklist = the step list above.
**Backlog in these files.** `O3-F16`, `O3-F19`..`F21`, `O10-F16`.

## P2b — Drain tooling and fleet profile (mobile + one backend script; one PR; no build)

**Goal.** Everything the fleet APK v1 needs to prove it lost nothing, and nothing in it that
could drain before that proof exists.
**Entry.** P2a merged.
**Scope.** `w2/O-10-design.md` D1–D7 and E4, `w2/O-03-design.md` steps 6–7:
- D1: the `fleet` EAS profile (APK, `EXPO_PUBLIC_API_URL=https://api.<domain>`, real Sentry
  DSN, versionCode above the field value from P0a). The `preview` and `production` profiles are
  **repointed to the owned domain or removed** (`O08-F05`/`O08-F14`); every later build names
  `fleet` and gets the bundle grep.
- D4 then D3: the manifest snapshot at bundle load, **written once per versionCode**, and a
  sync gate every queue awaits that opens **only on a 2xx manifest receipt**; the one-time
  un-park migration keyed on edge reasons (`O10-F2`) runs **after** the snapshot is written.
- D5: `drainAll` is called by the gate (the function itself is P2a).
- D6/E4: the login banner with per-tech record counts and the shared-phone sign-in copy
  (queues drain only under their owner's session, `O10-F10`).
- D7: the Drain Report screen (BEFORE counts by queue and reason) and manifest upload via
  `POST /api/events`.
- Step 6: retry advice for stale rows at the post-P1/P6 ceilings read from **one shared
  constant** (`O3-F4`); Discard copy that distinguishes "server refused" from "could not reach"
  (`O3-F13`); every Discard writes a telemetry event with the item's kind and tech
  (`O6-F14`/`O6-F15`, `w2/O-06-design.md` item 6).
- Step 7: pending-media retry/discard and the needs-attention list (`O3-F5`, `O3-F12`); a local
  catch around the selfie PUT so a throwing upload marks the punch and retries the selfie
  separately instead of stalling the punch drain (`O10-F8`).
- `backend/scripts/drain_audit.py` (dry-run, read-only): compares a manifest with server rows per
  tech since `T_open`, with the matching rules for kinds that carry no `client_id`; run as
  `docker compose exec backend python scripts/drain_audit.py`.
**Deliverables.** Code; tests `manifest.test` (gate waits for 2xx; un-park after snapshot;
once-per-versionCode), `unpark.test`, `retryAdvice.test` (boundaries from the shared constant),
`sync.test` (selfie throw does not stall), the audit script with its own pytest.
**Done when.** Mobile gates green; `expo export --platform android` + bundle grep shows the owned
domain and `jobs.outbox.v2`; backend gates green for the script; CI green.
**Workflow.** Opus implements the manifest gate, un-park ordering, retry advice, pending-media
and the audit script's matching rules; Sonnet does the screens and the login banner; Opus
reviewer briefed with O-10 R1–R7.
**Size.** Large. **Resume.** Branch `feat/fleet-drain-tooling`; draft PR checklist.
**Backlog in these files.** `O10-F9`, `O10-F11`, `O10-F12`.

## P2c — Fleet APK v1: build, signature and install-over proof (EAS + one spare phone; K=yes only)

**Goal.** A built APK that installs over the field build on a phone and renders the Drain Report
before any sync.
**Entry.** P2b merged; domain in DNS (P0b); P0a item 5 recorded K=yes; a spare Android phone
and the pulled field `base.apk` (P0a). **If K=no, skip**: the fleet build becomes the fresh
install at the end of the K=no branch (§2 box).
**Scope.** `eas build --profile fleet` (record the build id; the session ends when the build
is submitted if the queue is slow, and resumes from `eas build:list`); download; `apksigner
verify --print-certs` equals the field cert; the test phone's FixFlow per-app network is
**off** for the whole test (the APK bakes the production domain; a stray sync before P4 B6
would corrupt the per-tech deltas, `O-10` E6); install the field `base.apk` on the spare
phone, then `adb install -r` the fleet APK (same package, same cert, higher versionCode); open
it; the Drain Report renders (empty queues: the spare phone cannot log in against a dead
host, so the seeded-queue proof is the P4a pilot's). `expo export` says nothing about native
compile, so the build itself is the compile gate.
**Deliverables.** W0-results.md "Fleet APK v1" section: build id, versionCode, cert SHA-256,
install-over result, Drain Report screenshot.
**Done when.** The cert matches, the install-over succeeds without uninstall, the report renders.
**Owner inputs.** EAS access, the spare phone, the field APK.
**Workflow.** The session drives EAS and adb; no code. **Size.** Small plus the queue wait.
**Resume.** `eas build:list`; the W0-results section.

## P3a — Self-host repository changes (code; one PR; migration-free)

**Goal.** Everything the box will run, in the repo, smoke-tested locally, with the runbook the
owner session will follow step by step.
**Entry.** P1 merged.
**Scope.** `w2/O-08-design.md` §1–§2, §6; G2-D2:
- `docker-compose.prod.yml`: Postgres 17 (profile-gated so the backend cannot boot before the
  restore), backend, Caddy serving the web build **from a node:22 build stage with CSP and
  security headers and the font self-hosted** (`O05-11`), cloudflared with a **503 catch-all**
  for unknown hostnames; **no published ports** (`O05-08`/`O08-F03`); `api.` routes **directly
  to the backend** (no Caddy hop, so XFF depth stays single-hop, `O08-F04`); root-owned env
  files; `FIXFLOW_ENVIRONMENT=production`; new `FIXFLOW_BACKUP_PREFIX`; backup target prefix
  `backups/db-selfhost/`.
- The **hang stub**: a zero-dependency Node service in `ops/hang-stub/` with one test proving no
  bytes are sent for 20 s (deployed to Railway only if H=yes and K=yes; standing rule 5).
- A minimal **off-box heartbeat**: a host cron job that runs a DB-touching health request and
  pings an external dead-man service chosen in §4 (G2-D2 "mandatory"); documented in the runbook.
- `docs/RUNBOOK-SELFHOST.md`: the "box ready" checklist with a check command per item (Ubuntu
  LTS, `systemctl is-enabled docker`, BIOS power-on after AC loss, `timedatectl` chrony, key-only
  SSH, upgrade window, `/etc/fixflow` 0600 env files, encrypted secrets copy + printed recovery
  sheet); the restore procedure per recovery case **from O-08 §3** (postgres alone → `DROP
  SCHEMA public CASCADE` → `pg_restore --exit-on-error` → `ALTER … OWNER TO fixflow_app` →
  Appendix B gate against the O-08 §3 baselines → `--profile app`); case-c extras (`setval
  job_token_seq` above the highest printed ticket, roster slugs, O-10 "nothing" rules); R1–R7
  operations incl. **R5 deploy**; the Cloudflare settings for `api.` (no WAF/Bot Fight/
  challenges; rate rules answer only 429 with Retry-After).
- CI runs the backend job on Postgres 17 (`O08-F12`); CLAUDE.md Deploy row, build-and-deploy
  traps and doc map updated (RUNBOOK-SELFHOST); ADR-0001 amended "superseded by the self-host
  decision" (G2-D1).
**Deliverables.** The files above; a local `docker compose -f docker-compose.prod.yml up` smoke
on Docker Desktop with a fake domain and a throwaway DB (health green, catch-all 503).
**Done when.** Gates and CI green; local smoke green; the runbook's steps are numbered.
**Workflow.** Sonnet drafts configs and the runbook from O-08; Opus reviews the compose,
restore order and the hang stub against `O08-F01`/`F02`/`F07` and standing rule 5.
**Size.** Medium. **Resume.** Branch `feat/selfhost-stack`; draft PR checklist.
**Backlog in these files.** `O08-F09` (fixed in P7b-2), `O08-F10`.

## P3b — Box ready, restore, PIN rotation (owner session at the box)

**Goal.** The recovered database on the box, verified, with no account on a default PIN, and
the backend booting against it — reachable from the box only.
**Entry.** P3a merged; P0b destination with SSH; P0a item 2/3 artefacts (the Supabase dump or
the newest R2 dump; the archive copy done); the recovery case decided (§4: no default).
**Scope.** RUNBOOK-SELFHOST steps in order, ticked in W0-results.md:
1. Box-ready checklist, every command's output recorded.
2. Secrets: generated JWT secret, R2 keys, FCM service account, Sentry DSN into `/etc/fixflow`;
   encrypted copy to the owner's password manager; printed recovery sheet.
3. Restore per case (O-08 §3), Appendix B gate against the O-08 §3 baselines (row counts,
   non-voided payment sum, `job_token_seq`, the three sequences, `alembic_version`,
   `dispatch_cursor` near max `seq`); case (a) cross-checked against the newest R2 dump.
4. `--profile app`: backend boots (`jwt_secret_overridden` true in deep-health), dispatcher OFF,
   `BACKUP_ENABLED=false` until P3c confirms the archive.
5. Fence row set from P0a item 9 (a fresh DB's null fence disarms every phone, `O10-F14`).
6. PINs (§6 ruling R4): `set_pin.py --dry-run`, then every account gets a fresh ≥ 6-digit PIN;
   per-tech sealed slips for hand-over at P4 E4; `default_pin_active` false for every account.
7. `curl` from the box: login works, marker present, `/api/ops/health` green.
**Deliverables.** W0-results.md "Restore" section with every gate output; the slips.
**Done when.** Step 7 passes; nothing is published on the box (`docker ps --format
'{{.Ports}}'` shows no host port); the tunnel is **not** yet created.
**Owner inputs.** Box access; the dumps; the highest printed job ticket (case c).
**Workflow.** The session guides; Sonnet can read gate outputs. **Size.** One session; case (a)
with a dump still to take is the long version. **Resume.** The step table.

## P3c — Pre-cutover verification (owner session + session; route stays closed)

**Goal.** Everything G2 §3 and O-10 require to be true before any phone meets the new host,
with `api.<domain>` answering 503 to the world until P4a opens it.
**Entry.** P3b done.
**Scope.**
1. `cloudflared tunnel` created; `api.` on the **503 maintenance responder** (O-08 §3 step 3);
   `app.` and `ops.` behind **Cloudflare Access** (G2-D2).
2. Tests recorded in W0-results.md: (a) through the tunnel, a forged `X-Forwarded-For` — what
   `_client_ip` logs, and that `CF-Connecting-IP` is present (decides P7b-1's keying, `O08-F03`,
   G2 §3); (b) cloudflared stopped → `curl -i` code (must be a markerless 5xx or a network
   error, never a marker 4xx; O-10 R3 depends on it); (c) `/api/ops/health` through the tunnel
   carries `X-FixFlow-Api`; (d) one selfie presign → PUT → commit succeeds against the box's
   R2 settings (`O10-F8`, O-10 B2); (e) `curl -I https://app.<domain>` shows the CSP header.
3. **Latency** (§4 threshold): from the owner's phone on Pakistani mobile data (Termux `curl -w`
   or an equivalent app), 20 requests each to `/api/ops/health`, a GET list and a POST, record
   `cf-ray` PoP and p50/p95. Pass: POST p95 under the §4 threshold. Fail → G2-D1 VPS fallback.
4. The **old hostname** settled per standing rule 5: H=yes & K=yes → hang stub deployed on
   Railway and verified (no bytes for 20 s); H=yes & K=no → proxy prepared but **not** enabled
   until P4a B6; H=no → recorded, per-app data-off confirmed for every phone (P0a item 12).
5. Cloudflare rate rule on `/api/auth/login` (429 + Retry-After); WAF/Bot Fight/challenges off
   for `api.` (`O05-03`, O-08 §4).
6. Heartbeat cron live and the dead-man service paging the owner (tested by stopping the
   container once).
7. `BACKUP_ENABLED=true` only after the archive prefix is read back from the env and the first
   scheduler run is confirmed to write under `backups/db-selfhost/` (`O08-F02`).
**Deliverables.** W0-results.md "Pre-cutover" section; the Cloudflare rules documented in the
runbook.
**Done when.** Every test has a recorded result; latency passes or the VPS decision is taken;
`api.` still answers 503 to a phone.
**Owner inputs.** Cloudflare dashboard; Railway (if H=yes); their phone for latency.
**Workflow.** The session guides; Opus reviews the XFF and stopped-tunnel results against the
P7b-1 design. **Size.** Medium. **Resume.** The step table.

## P4a — Pilot drain (operations; one session; one phone)

**Goal.** One phone's queued data in the recovered database with proof, the field protocol
observed on the field build while it still exists, and the route opened.
**Entry.** P2c done (K=yes) or the K=no branch chosen; P3c done; drain window settings staged
per `w2/O-10-design.md` B4 with the **values in §6 ruling R2** (device_time ceiling = W; jobs GPS
ceiling stays 48 h; ping ceiling 240 h; future tolerance untouched).
**Scope** (O-10 B4–E in order, each verified before the next; W0-results "Pilot" table):
1. **Field protocol first** (`w2/O-01-design.md` steps 0–4, 55 min, adb attached, tech on
   shift): **step 0 turns FixFlow's per-app data off** before the app is opened; the protocol's
   start and end times are logged so its presence/punch rows are marked as test rows by
   `drain_audit.py`; the app's network is restored only at step E.
2. B4 restart with the staged window; B5 pre-drain snapshot (`pg_dump` to the archive prefix);
   the selfie PUT re-checked.
3. B6: the route flips from 503 to the backend; `T_open` recorded; **K=no & H=yes**: the proxy
   is enabled now, not before.
4. E1–E6 on the pilot: BEFORE photo; install-over (K=yes) with logcat confirming **no sync ran
   before the manifest receipt** (`O-10` D4, `O-01` #47595); E4 sign-in with the sealed PIN
   slip; drain; AFTER audit `docker compose exec backend python scripts/drain_audit.py` — per-tech
   row delta since `T_open` equals the manifest's landed count (R7 halts on mismatch).
5. Parked residue read off the Drain Report and entered by the manager (cash first).
6. The written **release notice** handed to the pilot tech (standing rule 6).
**Deliverables.** The Pilot table; logcat captures and protocol findings appended; the test-row
window.
**Done when.** AFTER matches the manifest; the pilot is released.
**Owner inputs.** The pilot tech and phone, the manager for residue, the adb laptop.
**Workflow.** The session guides; a Sonnet agent tabulates logcat and the protocol outcomes.
**Size.** One session. **Resume.** The Pilot table (O-10 R2: forward-only after the first drain;
no DB restore unless every drained phone's manifest archive is in hand).

## P4b — Fleet drain and window close (owner-run over days; per-phone table)

**Goal.** Every roster phone drained with proof, the window closed, ceilings restored, the
dispatcher cursor re-seeded.
**Entry.** P4a done.
**Scope.** For each roster phone (P0a item 7): the E1–E6 row (BEFORE photo, manifest receipt
id, install-over result, sign-in, AFTER audit, residue entered, release notice) — shared phones:
each tech signs in in turn (E4 copy). Window: `T_close = T_open + 7 days` (O-10 F), extendable
once by the owner in writing. At `T_close`: late-sync audit query; ceilings restored to
**device_time 24 h (336 h once P6b is deployed), jobs GPS 48 h, ping 240 h**; `payroll_export`
rows created in [`T_open`, `T_close`] recorded for P6b regeneration; **cursor re-seeded**
(standing rule 4). Late phones: a scheduled, supervised re-open, each followed by a re-seed.
**K=no**: the O-10 "BRANCH K=NO" steps per phone, incl. the owner's signed decision on
old-secret tokens (`O10-F15`), then fresh install of the fleet build.
**Deliverables.** The per-phone table complete; the window record (`T_open`, `T_close`, the
audit query result, payroll windows touched).
**Done when.** Every row filled; `T_close` recorded; ceilings restored; cursor re-seeded.
**Resume.** The table; the first unfilled row.

## P5a — Geofence and sampler fixes (mobile code; one PR; no build)

**Goal.** The arrival prompt fires for real arrivals, the sampler regains its foreground
service when the app comes back, a lost fence repairs itself.
**Entry.** P2c merged (the fleet profile); **P6a merged** (the shared verdict rule and its
fixture, §6 ruling R1); P4a's protocol ranking read.
**Scope.** `w2/O-01-design.md` FIX ORDER 1–4 and 7, and IN-APP LOGGING:
1. Record-first: bounded GPS reads (timeouts, `O01-F16`), a local duty check, the debounce stamp
   written **after** enqueue (`O01-F05`, `O01-F10`, `O01-F18`).
2. The verdict rule from the P6a fixture (three-state: inside if d + a ≤ r, outside if
   d − a > r, else unknown; 100 m accuracy ceiling): inside and unknown both **prompt** (unknown
   with the softer "are you at the workshop?" copy), outside suppresses; test vectors are the
   P6a JSON fixture (`O01-F04`).
3. FGS re-arm on `active` within the 14 h / 4 h bounds by dropping the `isRunning()` early
   return (`O01-F01`), **with the #49424 guard and the #52230 stop fallback** as patch-package
   patches (patch-package setup and `postinstall` added; `O01-F15`); the sampler-gap notice.
4. Error-branch re-register, provider banner, periodic re-check (`O01-F03`; the
   GEOFENCE_NOT_AVAILABLE error is no longer ignored).
7. Awaited syncs and foreground drains for pings and presence (`O01-F08`); every fix of a
   batched delivery (`O01-F13`).
- The diagnostics ring (`diag.bg.v1`, mutex-guarded), telemetry events (`sampler_gap`,
  `geofence_error`, `crossing_recorded`, `notify_suppressed`), the hidden Diagnostics screen.
**Deliverables.** Code, patches under `technician-app/patches/`, Jest tests per fix (vectors
from the fixture).
**Done when.** `npm run typecheck && npm test` green; `expo export` green; CI green. (Device
proof is P5c.)
**Workflow.** Opus implements (privacy time bounds, headless paths, native patches); Sonnet
tests; Opus reviewer briefed with CLAUDE.md's location invariants.
**Size.** Large. If long, defer **only fix 7 and the Diagnostics Share screen** to P5b; fixes
1–4 and the ring stay (P5c's gate needs them).
**Resume.** Branch `fix/mobile-geofence-v2`; draft PR checklist.
**Backlog in these files.** `O01-F19`.

## P5b — Permissions, OEM onboarding, remaining Expo patches, typed-name login (mobile code; one PR)

**Goal.** The phone keeps the grants and the process the feature depends on; the known Expo
defects are patched; the login no longer needs a public roster.
**Entry.** P5a merged.
**Scope.** `w2/O-01-design.md` fixes 5–6 and H11; G2 §5 login ruling:
- Background and precise-location banners with one-tap re-request; hibernation exemption
  intent; an "Approximate" grant is detected and blocks geofencing with a banner (`O01-F06`,
  `O01-F07`).
- Manufacturer-specific onboarding step and ClockScreen re-offer (autostart, app battery saver,
  lock in recents) with a self-attested checklist sent as telemetry (`O01-F02`), for the OEMs
  in the P0a roster.
- Patches: the untracked second event (`O01-F09`), the shared static timestamp (`O01-F12`),
  #50060 (`O01-F14`), optional network constraint on task jobs (`O01-F17`); cleanups `O01-F11`
  (re-add only when parameters differ) and the duplicate channel helper.
- **Typed-name login** (§6 ruling R3): the login screen takes a typed name (remembered on the
  device) instead of the pre-auth roster; the roster endpoint is removed in P7b-1 once this
  build is fleet-wide.
- Any fix 7 / Share screen deferred from P5a.
**Deliverables.** Code, patches, tests where pure.
**Done when.** Mobile gates green; CI green. (Native compile is P5c's build.)
**Workflow.** Opus for the native patches and login; Sonnet for onboarding screens; Opus
reviewer. **Size.** Medium. **Resume.** Branch `fix/mobile-permissions-oem`.

## P5c — Build v2 and pilot validation (EAS + pilot phone; one session plus the queue wait)

**Goal.** Device evidence on one phone that the P5a/P5b fixes do what they claim.
**Entry.** P5b merged; the pilot phone drained and released (P4a); the pilot tech on shift; the
adb laptop at the workshop.
**Scope.** `eas build --profile fleet` (v2; bundle grep; cert check); install-over on the pilot
(standing rule 1); then the O-01 protocol gates that the fixes address:
- 3d: the foreground service is back within 15 s of opening the app after an OS kill.
- 4b–4d: a location toggle re-registers the fence without opening the app, or the periodic
  re-check catches it within N min.
- The indoor test: ~40 m from the centre on a Wi-Fi fix, the prompt fires, the server row's
  verdict agrees (inside or unknown).
- The G2 §3 device items: F14 (#50060) behaviour, F12 timestamp sharing during a travel leg,
  F16 a GPS read with no fix — recorded pass/fail.
- 3b/3c (OEM swipe-kill and blocked restart) are **not** this gate; they are P5d.
**Deliverables.** W0-results.md "v2 pilot" section; the ring export.
**Done when.** 3d, 4b–4d and the indoor test pass on the pilot; the device items are recorded.
**Owner inputs.** Pilot tech, adb laptop. **Workflow.** The session drives; Sonnet tabulates.
**Resume.** `eas build:list`; the section.

## P5d-1 — Fleet install and per-OEM protocol (operations; one session)

**Goal.** v2 on every phone, supervised, and the protocol run once per manufacturer.
**Entry.** P5c passed; **P6a and P6b deployed** (the server sampler-health read exists);
every phone's P4b row complete.
**Scope.** Per phone: versionCode check, queues drained (Drain Report empty), `adb install -r`
or tap-to-update, never uninstall, onboarding step completed on the phone, checklist row. Then
for one phone per OEM in the roster: the O-01 protocol steps 1–4 incl. 3b/3c (H1 swipe-kill),
with the tech on shift. `T0` recorded.
**Deliverables.** `docs/program/FIELD-VALIDATION-<date>.md` started: per-phone install rows;
per-OEM protocol rows (pass/fail per hypothesis H1/H10/H16/H3/H9).
**Done when.** Every phone has v2; every OEM has a protocol row; `T0` recorded.
**Owner inputs.** All techs with phones at the workshop (or across shifts; the session may
span a day). **Resume.** The file.

## P5d-2 — 48 h review (one session, at `T0` + 48 h)

**Goal.** Say, with numbers, whether the field behaviour meets the §4 thresholds.
**Entry.** `T0` + 48 h.
**Scope.** The diagnostics ring per phone (telemetry events) and the P6b sampler-health read
over the same days: `sampler_gap` per on-duty hour; % of real arrivals with
`crossing_recorded`; % of `geofence_error` re-registered within N min; per-OEM residual kill
rate. Compared with the §4 thresholds.
**Deliverables.** FIELD-VALIDATION completed: a row per OEM, pass/fail per metric, the named
follow-up for every fail (a register id or a new one).
**Done when.** Every OEM has a row; the §1 geofencing milestone is marked reached **only if the
thresholds pass**; otherwise the follow-ups become a P5e scope.
**Workflow.** A Sonnet agent tabulates; the session judges. **Resume.** The file.

## P6a — Attendance truth, migration-free (backend + small web; one PR)

**Goal.** One verdict rule for phone and server, and a board that can tell a dead sampler from
a quiet day.
**Entry.** P1 merged. Merge any time; **deploy after `T_close`** (standing rule 3).
**Scope.** `w2/O-04-design.md` §1(a), the code-only list, `O04-F9`; §6 ruling R1:
- The **shared verdict rule** as one pure module with a JSON fixture of test vectors published
  in the repo (consumed by P5a): three-state inside/outside/unknown, accuracy ceiling 100 m,
  versioned (`O04-F9`, `O01-F04`); the job-punch rule unified with it.
- `sampler_state`, `last_ping_at`, `pings_today` on BoardRow from one `DISTINCT ON` query
  (`O04-F4`); open-shift breakdown with `window_end = min(now, first_in + 14 h)`; closed
  zero-ping day → coverage 0 with `no_pings`; UNKNOWN interval for all-`None` runs (`O04-F3`).
- Timezone validator and a single shop-timezone source (`O04-F8`); web renders `effective_time`
  (`O04-F10`).
**Deliverables.** Code, pytest incl. real-Postgres integration tests for the window and the
dead-sampler fields, the fixture, the web change.
**Done when.** Gates and CI green; the board shows `sampler_state` for a tech whose sampler is
stopped in a test; deployed to the box after `T_close`.
**Workflow.** Opus implements the rule and derivation; Sonnet the web change and tests; Opus
reviewer with the O04 claims as the refute list.
**Size.** Medium. **Resume.** Branch `feat/attendance-truth-1`.

## P6b — Attendance migration: late flags, adjustments, heartbeat index, payroll (backend; one PR; one migration)

**Goal.** Late data lands on the right day with an honest flag, corrections are attributable
and reversible, and back-filled weeks' payroll is regenerated.
**Entry.** P6a merged; `T_close` recorded (the drain's payroll windows are known).
**Scope.** `w2/O-04-design.md` §1(b), §2, §3; `O10-F7`:
- `late_sync` and `late_batch` flags, **derived retroactively** from `received_at` vs
  `device_time` so the drained rows are flagged too (`O04-F1`, `O04-F2`, `O04-F5`); punches kept
  at `device_time` within a 14-day window instead of re-bucketed (ceiling 336 h permanent);
  payroll exclusion: `late_sync` days stay out of payroll until an `accept` adjustment exists.
- Adjustments: actor from the principal, `client_id`, `action ∈ {add, replace, void, accept}`
  with `derive` honouring replace/void (`O04-F6`, `O04-F7`/`O6-F10`, `O04-F15`).
- Heartbeat events from the P5a ring mapped to O-04's names; the `app_event` index; a per-tech
  per-day **sampler-health read** (`O04-F4`; `w2/O-01-design.md` "Server side").
- Payroll regeneration (`O04-F11`) run for every window touched by the drain (P4b record).
- Per-session duty windows (`O04-F13`).
- The dispatcher's stale-event guard keyed on the event's own time, not insert time (`O10-F7`).
- The one-active-fence **audit script** (dry-run, read-only) — the index itself is P13d.
**Deliverables.** The migration (next free slot; CHECKs/FKs on populated tables `NOT VALID` then
`VALIDATE` in the same migration only where the column is provably clean), code, tests, the
regeneration run recorded, CLAUDE.md head updated.
**Done when.** Gates incl. `alembic check` green; CI green; deployed; regenerated exports listed.
**Workflow.** Opus throughout; Opus reviewer. **Size.** Large. If long, split the heartbeat
index + sampler-health read into **P6b-2** (P5d-1's entry then names P6b-2).
**Resume.** Branch `feat/attendance-truth-2`.
**Backlog in these files.** `O04-F14`, `O04-F16` (closed in P7a), `O04-F17`, `O6-F12`/`O6-F13`
(mock-location to affect the verdict; billed fuel from a mocked arrive).

## P7a — Authorization model and money guards (backend; one PR; migration-free)

**Goal.** A technician token acts only on its own jobs; money-changing actions respect close
and freeze.
**Entry.** P1 merged. Deploy after `T_close`.
**Scope (register).**
- `require_job_actor(job, principal)` (assigned tech or manager) on negotiate, payments,
  completion, transition/abandon, customer pin, notes, messaging send/send-log, media list and
  `complete_upload`, **and on `GET /api/jobs/{id}` and every per-job read carrying customer or
  location fields** (`O05-05`, `O6-F02`/`F03`/`F04`, `O07-F3`, `O05-13`, `O05-06`).
- `log_payment`/`void_payment` refuse a closed job with the `(current status: closed)` detail
  (`O04-F16`, `O6-F03`, `O07-F5`); payment `client_id` reuse across job/amount → 409 (`O07-F15`).
- Negotiation below original (§4 row, default per §6 ruling): the assigned tech may negotiate
  below original with a **required reason and a flagged approval record** (`w2/O-06-design.md`
  item 3); a per-shop cap setting, when set, requires a manager beyond it (`O07-F4`).
- Tech-scoped `GET /api/jobs`: pagination opt-in via query parameter (old clients get the current
  shape); PII minimised until claimed **behind a per-shop setting, default off** until the v2
  APK is fleet-wide (`O05-06`; §4 row).
- `manager_id` from the principal for non-attendance writes (`w2/O-06-design.md` item 4).
**Deliverables.** Code; integration tests for each denied path **and** an own-job **request
replay** of the field APK's flow (claim → negotiate below original with reason → payment →
completion → transition) proving nothing the APK does is newly refused.
**Done when.** Gates and CI green; deployed after `T_close`.
**Workflow.** Opus implements; Sonnet tests; Opus reviewer briefed to find flows the field APK
uses that the new checks would break.
**Size.** Medium. **Resume.** Branch `fix/service-layer-authz`.

## P7b-1 — Login, lock and session hardening (backend; one PR)

**Goal.** The remaining external-attacker items on the login path.
**Entry.** P7a merged; P3c's XFF record; every account on a ≥ 6-digit PIN (P3b); the v2 APK
fleet-wide (P5d-1) for the roster removal.
**Scope.** G2 §5 ruling; `w2/O-05-design.md`:
- Lock keyed per (account, source) with the per-account invariant kept (CLAUDE.md); source =
  `CF-Connecting-IP` when the peer is cloudflared (P3c result), else the single-hop XFF;
  an `app_event`/ops alert when an account locks (`O05-03`, `O05-04`).
- Roster endpoint **removed** (typed-name login from P5b is fleet-wide) — "no pre-auth roster".
- `set_pin` requires the current PIN for self-service; `POST /api/auth/logout` bumps
  `token_version`; shorter manager token TTL (`O05-10`).
**Deliverables.** Code and tests, incl. a spray test showing the per-(account, source) lock and
that per-account guesses per day across N sources do not exceed the per-account ceiling.
**Done when.** Gates and CI green; deployed.
**Workflow.** Opus; Opus reviewer. **Size.** Medium. **Resume.** Branch `fix/auth-lock`.

## P7b-2 — Ops console, media, web dependencies, Cloudflare rules (ops-server + backend + web; one PR)

**Entry.** P3c done.
**Scope.** ops-server: per-IP backoff, 16 KB body cap, `OPS_SESSION_SECRET` required, bind to
the internal network, status ignores unconfigured Railway pages (`O05-09`, `O6-F17`, `O08-F08`,
`O08-F09`). Media: reservation caps, length-bounded presign, 413 commit fix, stale-pending
sweep (`O05-12`, `O05-13`, T44-media-1/2 from W1 S-06). Web: react-router bump (`O05-18`).
The Cloudflare rules from P3c documented in the runbook (429 + Retry-After only; `app.`/`ops.`
behind Access).
**Done when.** Gates and CI green; deployed. **Workflow.** Sonnet implements; Opus reviews
media. **Size.** Medium. **Resume.** Branch `fix/ops-media-hardening`.

## P8a — Money integrity 1: void attribution, payloads, captured_at (backend; one PR; one migration)

**Goal.** Every payment change is attributable before anything flows toward Odoo.
**Entry.** P7a merged.
**Scope.** `w2/O-06-design.md` items 1–2, `w2/O-07-design.md` part 6:
- `job_payment.voided_at` / `voided_by` (FK `NOT VALID` + `VALIDATE` in the same migration;
  all-NULL new column) and `void_payment` stamping them; a required `reason` on void (`O6-F08`,
  `O07-F5`).
- Payment and void `job_event` payloads `{payment_id, amount_paisa, method, reason}` (`O6-F08`).
- Optional `captured_at` on payments, trust-windowed (`O07-F7`).
- The backfill script for historical voids (dry-run default; `railway run` replaced by
  `docker compose exec`).
**Done when.** Gates incl. `alembic check` and CI green; deployed; a void shows `voided_by/at`
and its event payload.
**Workflow.** Opus throughout. **Size.** Medium. **Resume.** Branch `feat/money-integrity-1`.
**Deferred to P13d:** `VALIDATE` of `job_payment_amount_positive` (`O07-F8`) and the
`recorded_by` FK validate (populated-table rule).

## P8b — Money integrity 2: bill revisions, chain over payments, daily verify, anchor (backend; one PR; one migration)

**Entry.** P8a merged; the chain-anchor channel chosen (§4; default email to the owner).
**Scope.** `w2/O-06-design.md` items 2, 5:
- Append-only `job_bill_revision` written on every **real** completion upsert, negotiate and
  bill send — an idempotent byte-identical replay writes **no** revision (CLAUDE.md bill
  freeze); a required reason on manager override and on post-send negotiate (`O6-F09`).
- `attendance/chain.py` generalised so the per-shop chain covers `job_payment` create/void and
  `job_bill_revision` as well as `staff_ledger` (`O6-F07`, `O6-F08`).
- A daily `ledger-chain-verify` scheduler job writing to `app_event` and delivering the head
  hash through the off-box channel; if no channel is configured the verify output and
  CLAUDE.md say **"unanchored"** rather than claiming tamper evidence.
**Done when.** Gates and CI green; deployed; one head hash delivered through the channel.
**Workflow.** Opus throughout. **Size.** Medium. **Resume.** Branch `feat/money-integrity-2`.

## P9a-1 — Accounting slice 1: posting tables, triggers, decision API (backend; one PR; one migration)

**Goal.** The approval boundary exists: immutable posting snapshots, append-only decisions and
attempts, a decision API — before any stager runs.
**Entry.** P8b merged.
**Scope.** `w2/O-07-design.md` parts 1, 2 (decision step), 6:
- `posting`, `posting_decision`, `posting_attempt`, `posting_export` with immutability triggers;
  `posting.seq` gapless and commit-ordered under `pg_advisory_xact_lock`; UUID-based External
  IDs (`O07-F11`); the `accounting` slice `router → service → repository`; import-linter edges
  `accounting → jobs.service`, `accounting → attendance.service`.
- Decision API: approve / reject (typed reason) / bulk approve with count + sum returning 409 on
  drift; approval resolves `account_code_<role>` settings and is **refused while a role is
  unmapped**; **self-approval** (decided_by = subject tech or recorded_by) is flagged, not
  blocked, by default (§4 row; `O6-F16`, O-06 item 3).
- Settings keys incl. `account_code_*` (`O07-F14`).
**Deliverables.** Migration (next free slot), code, real-Postgres tests of the triggers and the
decision API, CLAUDE.md (head, slice list, invariant "no money on the `job_event` cursor",
`O07-F6`).
**Done when.** Gates and CI green; fixture postings approve and reject; an `UPDATE` on `posting`
is refused in real Postgres; deployed.
**Workflow.** Opus implements; Sonnet tests from the design; Opus reviewer with
BACKEND-REQUIREMENTS §3.15. **Size.** Medium-large. **Resume.** Branch `feat/accounting-1`.

## P9a-2 — Accounting slice 2: stager (backend; one PR)

**Entry.** P9a-1 merged; the owner's basis (cash/accrual), start date and reason codes (§4;
defaults ship and the stager stays idle without a start date).
**Scope.** `w2/O-07-design.md` part 2: the state-based stager (anti-join, not a window — `O07-F2`,
`O07-F1`) for all five kinds; it calls `verify_ledger_chain` first and refuses to stage on a
failure; poison-row skipping (`O07-F8` design item); `restage` creates a new posting at
`source_rev + 1`; a reversal stages on void; accrual-basis close stages an invoice.
**Done when.** Gates and CI green; with a start date set in a test, payments and ledger rows
stage, a void stages a reversal, an unmapped role refuses approval; deployed.
**Workflow.** Opus. **Size.** Medium. **Resume.** Branch `feat/accounting-2`.
**Backlog.** `O07-F9`.

## P9b — Approval and reconciliation UI (web + backend read API; one PR)

**Entry.** P9a-2 merged.
**Scope.** `GET /api/postings/reconciliation` (`w2/O-07-design.md` part 5; **Opus**, LEDGER_SIGN
arithmetic) and the web pages: staged queue with per-row reject, bulk approve with count and
sum confirmation, the reconciliation view with the rejected-sum line first, flagged
self-approvals visible; the queue implements its own polling (P12's L3 fix is not an entry).
**Done when.** Vitest and backend gates green; a staged posting can be approved locally and the
delta moves; deployed.
**Workflow.** Opus for the endpoint; Sonnet for the pages. **Size.** Medium. **Resume.** Branch
`feat/accounting-ui`.

## P10a — CSV export, transport seam, exports page (backend + web; one PR)

**Entry.** P9a-2 merged (approved postings exist in tests).
**Scope.** `w2/O-07-design.md` parts 3, 4 (seam), 7 "build regardless": `run_posting_export`
(window on `decided_at`, advisory lock, record-first, deterministic bytes, sha256, separate
`manifest.json`/`manifest.csv`), the acknowledgement endpoint, signed download URLs;
`core/posting_transport.py` async Protocol with `CsvExportTransport` (default) and a fake
transport with tests, the attempt log, halt/lag/rotation alerts; the exports list page;
`docs/RUNBOOK-ODOO-IMPORT.md` draft with the column labels for the owner's Odoo version.
**Done when.** Gates and CI green; a golden-file test shows the CSV bytes are deterministic;
deployed.
**Workflow.** Opus implements; Sonnet writes the runbook and page. **Size.** Medium.
**Resume.** Branch `feat/accounting-csv-export`.

## P10b — Odoo import rehearsal (owner session)

**Entry.** P10a deployed; Odoo test company with chart of accounts and journals; the account
map set in settings; Odoo version recorded.
**Scope.** Export one window; import it **twice** into the test company following the runbook
click by click; confirm update-not-duplicate on External ID; manifest sums equal the import.
**Deliverables.** Runbook corrected to what the owner actually clicked; W0-results "Odoo" row.
**Done when.** The double import shows updates, not duplicates. **Resume.** The runbook.

## P11 — JSON-2 push adapter (optional; Custom plan only)

**Entry.** P10a merged; the owner on the Custom plan with a bot user and API key.
**Scope.** `OdooJson2Transport` behind the P10a Protocol; the `erp-push` scheduler job (default
OFF; ~1 call/s); search-before-create; `already_present` on retry; key-expiry alert.
**Done when.** Against the test company a posting round-trips and a retry is `already_present`.
**Workflow.** Opus. **Resume.** Branch `feat/odoo-json2-transport`.

## P12 — Web manager defects (web; one PR)

**Entry.** P3c done (the web runs on the new origin). Parallel with P5–P7.
**Scope** (sources: `docs/HANDOFF-2026-07-28-open-work.md` §4.1/§4.4 and W1 S-06, admitted as
register addenda in §5): A3 revenue tile (use the tech-metrics report); A4 payment idempotency
key lifecycle (`PaymentModal`, rotate on success only — **Opus**, money); L3 board
refresh/polling; the nine bare `catch {}` mutators surface `serverReason`; token kept on
network/5xx failure (`O08-F13`); T44-web-1 (incl. the Haul-on-ready item), T44-web-2..4.
**Done when.** Vitest green; manual check of the tile and a retried payment; deployed.
**Workflow.** Sonnet implements; Opus owns A4. **Size.** Medium. **Resume.** Branch
`fix/web-manager-defects`.

## P13a — DB role split (backend + ops; one PR; one migration)

**Entry.** P3c done; P7b-2 merged.
**Scope.** `fixflow_migrator` / `fixflow_app` / `fixflow_backup` with `REVOKE` on append-only
tables (`O6-F18`); `start.sh` runs migrations as the migrator; the owner applies the roles on
the box per the runbook.
**Done when.** The app role cannot `UPDATE job_event` in a test; deployed.
**Workflow.** Opus. **Resume.** Branch `feat/db-roles`.

## P13b — Backup encryption, put-only token, retention, first drill (backend + ops; one PR + owner steps)

**Entry.** P13a.
**Scope.** `age` encryption to the owner's offline key; a separate bucket/prefix with a put-only
token; lifecycle retention (`O6-F06`); a row-count restore gate; the **first** restore drill
run and logged in RUNBOOK-BACKUPS, with the monthly drill as a calendar item.
**Owner inputs.** The age key pair (private key offline), the second bucket/token.
**Done when.** A drill restore from an encrypted dump succeeds. **Resume.** Branch
`feat/backup-hardening`.

## P13c — Monitoring upgrade, node:22 images, lock file (ops; one PR)

**Entry.** P13a.
**Scope.** The P3c heartbeat upgraded to the §4 MON_LOC choice with paging tested; node:22
images; a Python lock file (`O08-F11`); `O08-F10` (R2 endpoint from settings).
**Done when.** The monitor pages on a stopped container; images rebuilt and deployed.
**Workflow.** Sonnet. **Resume.** Branch `chore/ops-hardening`.

## P13d — Fence index and deferred VALIDATEs after audit (backend; one PR; one migration; separate deploy)

**Entry.** The P6b audit script run on the box shows no duplicate active fences and no
orphans; P8a merged.
**Scope.** The one-active-fence partial unique index (`w2/O-04-design.md` §3 "separate
PR/deploy"); `VALIDATE` of `job_payment_amount_positive` (`O07-F8`) and the `recorded_by` FK.
**Done when.** `alembic check` green; deployed in its own deploy with the audit output attached
to the PR. **Workflow.** Opus. **Resume.** Branch `feat/deferred-validates`.

## P14-n — Expo SDK upgrade, one phase per major, then field re-validation (mobile)

**Entry.** P5d-2 passed.
**Scope per major** (P14-1, P14-2, …): upgrade one SDK major; typecheck, Jest, `expo export`;
re-check each P5a/P5b patch against upstream (drop when fixed, else re-apply — **Opus**);
`expo-av` → `expo-audio` when the SDK requires it (re-test the recorder); advisories; build
submitted (`fleet`) and its id recorded. **No `expo-updates`** (§6 ruling R7).
**P14-final.** Install on the pilot (standing rule 1); the P5c gate re-run; a per-OEM spot check.
**Done when (per major).** Build green and installed on the pilot without regression.
**Resume.** Branch `chore/expo-sdk-<n>`.

---

## 4. What the owner decides, and when it blocks

| Decision | Blocks | Default if undecided |
| --- | --- | --- |
| Domain (Cloudflare DNS, multi-year, auto-renew) | P2c, P3a | nothing can ship to phones |
| Destination: box (location, OS, UPS, ISP) or VPS by the target date | P3b | **G2-D1 fallback: small VPS, identical compose, same `api.<domain>`**, by the P4a target date |
| Recovery case a / b / c | P3b | **none** — P3b blocks until P0a item 2 is answered; (a) wins when restorable |
| Highest job ticket number printed for a customer (case c) | P3b | — |
| Fence coordinates and radius (≥ 100 m) | P3b, P5a | P3b blocks |
| Geofence pass thresholds (P5d-2) | P5d-2 verdict | `sampler_gap` < 1 per on-duty hour per phone; ≥ 90 % of real arrivals `crossing_recorded`; ≥ 95 % of `geofence_error` re-registered within 15 min; residual kill rate reported per OEM |
| Latency threshold (P3c) | P3c | POST p95 < 805 ms (ADR projection) from a field phone; target 150–400 ms |
| Jobs GPS backdate ceiling during the drain | P4a | stays 48 h (§6 ruling R2); late job-travel punches older than that are rejected and the fuel estimate stands in |
| Odoo plan (external API needs Custom) | P11 only | CSV path (P10) |
| Pakka record set, basis (cash/accrual), start date, reason codes | P9a-2 going live | stager idle |
| Approver, unit and export cadence | P9a-1 / P10a | the manager; per posting; weekly export |
| Full-fidelity or selective postings | P9a-2 | full-fidelity |
| Tax regime and chart of accounts / journals; Odoo version | P10b | — (P10b blocks) |
| Customer → Odoo partner mapping | P10a | one walk-in partner, no customer PII exported |
| Negotiation below original | P7a setting | allowed for the assigned tech with a required reason and a flagged record; manager beyond the cap once a cap is set |
| PII minimisation of unclaimed jobs for tech tokens | P7a setting | off until the v2 APK is fleet-wide, then on |
| Second approver / self-approval | P9a-1 | flag, do not block |
| Chain anchor channel | P8b | email to the owner (address collected in P0a) |
| Error tracking | decided (G2-D2) | Sentry SaaS; P0a confirms the mobile project ingests; a change needs a new APK |
| Dead-man monitor location and paging (MON_LOC) | P3a | external heartbeat service paging the owner by email |
| RPO target; who is on call | P3c, P13b | 24 h; the owner |
| age key holder | P13b | the owner, private key offline |
| Second uplink, split-horizon DNS, disk encryption | P13c | none |

## 5. Register coverage

Every P0/P1 row of G2 §2 maps to exactly one closing phase (ids appear elsewhere only as
dependencies):

| Register id(s) | Closing phase |
| --- | --- |
| `O01-F01`, `O01-F03`, `O01-F04` (phone side), `O01-F05` | P5a (device evidence P5c) |
| `O01-F02`, `O01-F06` | P5b |
| `O3-F2` | P2a |
| `O3-F4` | P2b |
| `O10-F1`, `O10-F2` | P2b |
| `O10-F3`, `O10-F4` | P3c (standing rule 5) |
| `O10-F7` | P6b (guard) and P4b (re-seed) |
| `O10-F15` | P0a records v2 yes/no; P4b K=no branch |
| `O04-F4` | P6a (fields) and P6b (heartbeat read) |
| `O6-F01` / `O08-F01` / `O05-01` / `O10-F5` | P1 |
| `O6-F05` / `O05-02` / `O10-F6` | P1 (refusal) and P3b (rotation) |
| `O05-03`, `O05-04` | P3c (rate rule), P1 (6-digit minimum), P7b-1 (per-source lock, alert) |
| `O05-05` / `O6-F02` / `O6-F03` / `O6-F04` / `O07-F3` | P7a |
| `O05-06` | P7a (setting; on after P5d-1) |
| `O05-07` | P0a item 4 and 12; P3c step 4 |
| `O08-F02` | P0a item 3; P3c step 7 |
| `O6-F07`, `O6-F08` | P8a (attribution), P8b (chain, anchor) |
| `O07-F1`, `O07-F2` | P9a-1, P9a-2 |
| `O08-F05` / `O08-F14` | P2b |

P2/P3 rows are named in the "Backlog in these files" line of the phase that owns their file,
or in the phase scope that fixes them (`O3-F1`..`F13`, `O3-F17`, `O3-F18` → P2a/P2b;
`O01-F07`..`F18` → P5a/P5b; `O04-F1`..`F3`, `F5`..`F13`, `F15`, `F16` → P6a/P6b/P7a; `O05-08`..
`O05-14`, `O6-F17`, `O08-F03`/`F04`/`F08`/`F09`/`F13` → P3a/P7b-1/P7b-2/P12; `O6-F06`, `O6-F18`
→ P13a/P13b; `O6-F09`, `O6-F14`..`F16` → P8b/P2b/P9a-1; `O07-F4`..`F15` → P7a/P8a/P9a/P10a/P13d;
`O08-F06` fixed in the design doc; `O08-F07` → P1; `O08-F10`..`F12` → P3a/P13c).
**Addenda admitted from W1 S-06 and the HANDOFF** (not in G2 §2): A3, A4, L3, L7 (= `O3-F18`),
T44-web-1..4, T44-media-1..3 (T44-media-3 = `O05-13`), T44-attendance-3 (= `O04-F12`).

## 6. Adjudication of the v1 critique

The 138 findings in `SHIP-PLAN-2026-11-critique.md` were adjudicated by the main session
(Fable) with the citation checks and refuter verdicts in hand. **Accepted** (the default): every
finding not listed below, reflected in the phase text, the standing rules or §4. **Narrowed**
(accepted in part, with the reason):

- FIT-6 / EXE-14 / FID-15 — the seeded-queue install-over test cannot run on a spare phone (it
  cannot log in against a dead host); P2c proves install-over + report; the seeded and
  ordering proofs are P4a's pilot with logcat.
- FIT-18 — O05-06 is a contract change for the fleet APK; kept in P7a behind a setting that
  turns on after the v2 APK is fleet-wide, with a §4 row.
- DEP-10 — the refuter found no evidence that P7a's checks park queued writes; the drain-image
  rule (standing rule 3) is adopted anyway because it costs nothing and removes the question.
- DEP-23 / CMP-16 / FID-9 — the drain is **not** made to wait for P6b: late flags are derived
  retroactively from `received_at`, and P6b regenerates payroll for the drain windows P4b
  records.
- EXE-9 — Appendix B is not circular (O-08 §3 carries drill baselines); the exact commands were
  added instead.
- EXE-21 — "manager-only below original" was an unsafe default for field flows; replaced by
  reason + flagged record, cap optional.
- CMP-18 / FID-24 — the T44 ids are not invented (W1 S-06, HANDOFF §4.4); they are now cited and
  admitted as addenda in §5.
- DEP-1 / EXE-1 / EXE-2 / CMP-4 — the refuters downgraded these to major (P0 already covered the
  Supabase action by reference); P0a now makes the dump a same-day MUST with no "unknown".
- CMP-1 / FID-11 — downgraded by the refuter; adopted as: 6-digit minimum in P1's `set_pin.py`,
  login refusal of default PINs in P1, rotation of every account in P3b.
- FID-1 — downgraded by the refuter; adopted in full anyway (the field-bundle grep is P0a item 5).

**Rejected:** none outright.

**Rulings made by this revision** (each needed a decision no design note had made):

- **R1 — one verdict rule.** O-01's phone rule (confirmed if d − a ≤ r) and O-04's server rule
  (inside only if d + a ≤ r) disagreed. The three-state server rule is adopted on both sides,
  with the phone prompting on inside **and** unknown. Built once in P6a as a pure module with a
  published fixture; P5a consumes the fixture. (`O01-F04`, `O04-F9`.)
- **R2 — jobs GPS ceiling during the drain stays 48 h.** O-10 B4 widened it; O-04 §2 said it
  feeds billing (`O6-F13`). Breadcrumbs from the outage are already gone and the fuel estimate
  stands in by design (CLAUDE.md); a late job-travel punch older than 48 h is rejected and
  counted in the Drain Report as "too old", not as money loss. The owner may override in §4.
- **R3 — no pre-auth roster.** G2 §5 ruled it; the plan implements it as typed-name login in
  P5b and removes the endpoint in P7b-1 once v2 is fleet-wide. A request-side "app marker" is
  forgeable and is not used.
- **R4 — PIN rotation.** O-08 said rotate only in case c; O-10 B3 said set every PIN; G2 §5
  wants 6 digits. Every account is rotated to ≥ 6 digits in P3b with sealed per-tech slips
  handed over at P4 E4, because `default_pin_active` cannot otherwise be guaranteed false before
  the route opens.
- **R5 — the drain image.** P1 (+ P3 infrastructure) only; everything behaviour-changing
  deploys after `T_close`.
- **R6 — migration numbering.** No pre-assigned numbers; next free slot at rebase; G2-D3's
  "0047" is not binding. The fence index and the deferred VALIDATEs ship in their own
  migration and deploy (P13d) after the audit script (P6b).
- **R7 — no `expo-updates`.** It bypasses the once-per-versionCode manifest and standing rule
  1; dropped from P14.

**Second critic pass:** pending — recorded here when it runs (lenses: every accepted finding is
reflected; no new contradiction between phases; the new splits fit one session).
