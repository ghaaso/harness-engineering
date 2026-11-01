# FixFlow ship plan — phases sized to one session each (v5, 2026-11-01)

**Status: v5 — revised four times; ready for P0a.** v1 was critiqued by five Opus lenses (138
findings, `SHIP-PLAN-2026-11-critique.md`); v2 reflected them and was verified by eight lenses
(141, `SHIP-PLAN-2026-11-critique-2.md`); v3 by four lenses (52, `SHIP-PLAN-2026-11-critique-3.md`);
v4 by a three-lens delta check (47, `SHIP-PLAN-2026-11-critique-4.md`). §6 records every
adjudication and the rulings. Earlier versions are in git history (762a63f, 79b94c7, 9748453,
46c5d98). Still awaiting: the owner's P0a answers (§4). No further critic pass is scheduled;
the next session is **P0a**.

Built on `G2-deep-dive-gate-2026-11-01.md` (the verified register and decisions G2-D1..D3),
`G1-discovery-gate-2026-11-01.md`, the method in `docs/ORCHESTRATION-DESIGN-2026-10.md`, and
the W2 design notes in this repository under `docs/program/w2/`: `O-01` phones, `O-03` offline
engine, `O-04` attendance truth, `O-05` external attacker, `O-06` operator/insider and money
evidence, `O-07` accounting slice, `O-08` self-host, `O-10` fleet drain. Every phase cites them by
path, so a fresh session resumes from the repository alone. Register ids (`O01-F04`, `O3-F2`,
`O10-F3`, …) are G2 §2 rows. **"R" labels are always prefixed:** "O-10 R7" is a rollback rule
from the drain design, "runbook R5" is a RUNBOOK-SELFHOST operation, "ruling R5" is §6.4.

## 0. How to read and run this plan

- **Sessions.** One phase per session. A phase marked **(×n)** is *repeatable*: one session per
  unit (a workshop visit, an OEM, a late phone), each filling rows of a table that already
  exists; the phase is complete when its table is. At most **one backend phase that runs the
  Docker gates** (design Appendix A, fixed container names) is in flight at a time on this
  machine; a mobile, web or operations phase may run alongside it.
- **Resume.** A code phase opens a **draft PR at its first commit** whose body is its Scope as a
  checkbox list, ticked as items land; resume = `gh pr view <branch>`, first unticked box. An
  operations phase's **first act commits its numbered step table** (copied from its Scope) to
  `docs/program/W0-results.md`, ticked as executed; resume = first unticked row. Builds in flight
  resume from `eas build:list`.
- **Routing (design doc §3).** Opus owns anything touching the outbox contract, drain tooling
  and its matching rules, the job lifecycle, ledger/chain and all posting/money code, auth, PIN,
  JWT, migrations, native patches, and the location-privacy time bounds. Sonnet implements
  well-specified screens, read models, infra files, docs and tests from a design's test list.
  Haiku extracts. Every PR gets an Opus reviewer with a refute-by-default brief naming the
  register ids it must try to break. The main session (Fable) briefs, gates and judges; it never
  implements.
- **Gates.** Backend gates run in Docker (Appendix A on `postgres:17-alpine` from P3a on; the
  owner starts Docker Desktop and confirms with `docker info`). Web and mobile gates run
  natively (green today on Node 24). A code phase is not done until gates are green locally
  **and** CI is green on the PR.
- **Merge is not deploy — the drain image and the deploy train.** From P3 on, production is the
  self-hosted box. Until the drain window closes (`T_close`, P4c) the box runs the git tag
  **`drain-image`**, cut from the branch **`release/drain`** = a branch at P1's squash commit
  with the P2b-2 and P3a squash commits applied **by `git cherry-pick` only — never `git merge`**
  (the repo squash-merges; merging would pull in whatever else reached `main`). After the cut
  `git log release/drain` is recorded in W0-results and must show no commit from another PR, and
  the backend gates (Appendix A) run green on `release/drain` before tagging and after every
  re-cut. Cutting the tag is the last Scope item of whichever of P1 / P2b-2 / P3a merges last
  (P3a-2, if opened, is not part of the image). Runbook R5 deploys only that tag before
  `T_close`. A drain-tool fix during the window is cherry-picked onto `release/drain` and
  re-tagged `drain-image-2`, `-3`… with a W0-results row; an APK-side fix goes to `main`, gets a
  new versionCode and a P2c re-run. Behaviour-changing phases that merge to `main` earlier are
  appended to the **deploy-train table** in W0-results.md (columns: phase, PR, merge sha,
  migration, post-deploy check; the first phase that needs it commits the empty table, P3a
  confirms it exists) and are deployed by P4c; until then their Done-when ends at "**merged;
  deploy-train row added**". After `T_close` a phase ends with "**deployed per runbook R5** (owner
  at SSH, ~15 min); `/api/ops/health` shows the new head and `FIXFLOW_GIT_SHA`, and `docker
  inspect --format '{{.Image}}' backend` is recorded beside it". The **web image** before
  `T_close` is built on **`release/drain-web`** = `release/drain` plus the web-only commits
  P12a/P12 (never on `release/drain` itself); web halves of mixed PRs (P6a, P7b-2, P9b, P10a)
  ride the train, whose last row rebuilds the web image from `main`.
- **Migrations** take the next free slot at rebase time (check the `down_revision` chain) and
  update the CLAUDE.md head in the same PR; branch names carry no numbers. FKs/CHECKs on
  populated tables ship `NOT VALID`; `VALIDATE` lands in a later migration after an audit script
  has run on the box, immediately before that deploy (CLAUDE.md).
- **Retired phones.** A roster phone that cannot be drained (lost, dead, owner-declared) gets a
  **retired row** in W0-results (owner sign-off; its A3 photos transcribed or the loss declared).
  "Every roster phone has a P4b, P4r or retired row" is the condition later phases use.

**Standing rules:**

1. Nothing ships to a phone before the drain protocol has run **on that phone** and its AFTER
   check passed. Installs are per phone, supervised, and never an uninstall — **except** in the
   K=no branch, after the A3 photos, every row retried or transcribed, and the owner's written
   per-phone sign-off (`w2/O-10-design.md` BRANCH K=NO).
2. No field-reliability claim without device evidence from the phone models in the fleet.
3. The **drain image** is the `drain-image` tag (or its re-cut) and nothing else until `T_close`.
   No backend deploy from `main` before P4c.
4. The dispatcher stays OFF. The cursor is re-seeded at `T_close` and again after every P4r;
   enabling the dispatcher is a separate, owner-approved step after the **last re-open**, which
   is the point where every roster phone has a P4b, P4r or retired row (CLAUDE.md; `O10-F7`).
5. The old Railway hostname: K=yes → it may only **hang** (accept, no bytes for ≥ 20 s, close);
   K=no & H=yes → it may **proxy** to the box only from O-10 B6 and only through the repository's
   stub in proxy mode, which hangs instead of answering on any upstream error, 5xx or timeout.
   The stub never originates a 5xx, 2xx or 204 of its own; in proxy mode only the backend's own
   marker-carrying responses pass through (`O10-F3`, `O10-F4`). The stub is removed only after
   every roster phone has a P4b, P4r or retired row (O-10 C). O-08 §4's "503 stub" line is void.
6. Technicians are "released" only by the written release notice (`docs/program/notices/
   release.md`) at the end of their phone's E-steps; until then the hold notice
   (`docs/program/notices/fleet-hold.md`, committed as sent in P0a) stands.
7. Money stays in integer minor units; no money feed (staging, export, push) is driven by the
   `job_event` cursor (payloads may carry amounts for audit); the outbox never deletes a write.

## 1. Milestones against the five goals

| Goal | Reached at | Phases |
| --- | --- | --- |
| Production back on infrastructure the owner controls; fleet data drained with proof | end of P4c (late phones via P4r) | P0a, P0b, P1, P2a, P2b-1, P2b-2, P2c, P3a, P3b, P3c, P12a, P4a, P4b (×n), P4c, P4r (×n) |
| Geofencing, pings and travel behave as designed in the field (thresholds in §4) | end of P5d-2, thresholds passing | P6a, P5a, P5b, P5c, P5d-1a (×n), P5d-1b (×n), P5d-2, P6b-1, P6b-2 |
| Security holes closed for a shipped system | boot/edge set at P3c; the rest at the later of P7b-1 and P7b-2; insider evidence at P8b, P13a | P1, P3c, P7a, P7b-1, P7b-2, P8a, P8b, P12, P13a, P13b |
| Latency acceptable (threshold in §4) | measured in P3c before the route opens | P3c |
| Kacha khata → manager-approved pakka khata → Odoo | end of P10b (P11 only on a Custom plan) | P7a, P8a, P8b, P9a-1, P9a-2, P9b, P10a, P10b, P11 |
| Self-hosting durable, not just running | end of P13c (incl. P13d's second PR) | P13a, P13b, P13c, P13d |

## 2. Dependency order

Drawn from the Entry lines (the Entry line wins if they ever disagree):

```
P0a (today) ─► P0b (domain, destination by date)
P1 ─► P3a ─► P3b (needs the drain-image tag) ─► P3c ─► P4a ─► P4b×n ─► P4c (T_close, deploy train) ─► P4r×n
P2a ─► P2b-1 ─► P2b-2 (tag cut when the last of P1/P2b-2/P3a merges) ; P2b-1 ─► P2c ─► P4a
P0b ─► P2b-1 (domain name), P2c (DNS), P3b (destination) ; hatches: P2a-2 ─► P2c, P3a-2 ─► P3c, P8b-2 ─► P9a-2
P3b ─► P12a (A4 web fix, before P4a)
P6a (merge after P1; deployed by P4c) ─┐
P2b-1, P4a ────────────────────────────┴─► P5a ─► P5b ─► P5c (after P4c) ─► P5d-1a×n ─► P5d-1b×n ─► P5d-2
P4c ─► P6b-1 ─► P6b-2 (needs P5a merged) ─► P5d-1a
P1 ─► P7a ─► P7b-1 (needs P3c XFF record, every phone P4b/P4r/retired + on v2) ; P3c ─► P7b-2
P7a ─► P8a ─► P8b ─► P9a-1 ─► P9a-2 ─► P9b ─► P10b ; P9a-2 ─► P10a ─► P10b ; P10a ─► P11 (optional)
P3c ─► P12 ; P4c, P7b-2 ─► P13a ─► P13b, P13c (+P13d as a second PR, needs the P6b-2 audit re-run clean, P8a)
P5d-2 ─► P14-n ─► P14-fleet×n
```

**Branch box (recorded by P0a, per phone).** K = the field build's signing cert equals the EAS
keystore cert; H = the owner controls the old Railway hostname; v2 = the field bundle contains
`jobs.outbox.v2`; R = recovery case a/b/c (`w2/O-10-design.md`, G1 §3).
- **K=yes** (expected): the graph above; the old host hangs (P3c step 4). A same-cert phone with a
  **lower** versionCode installs over cleanly and stays K=yes; a phone **STOPs and re-checks K**
  only on a cert mismatch, `INSTALL_FAILED_UPDATE_INCOMPATIBLE` or a version downgrade (O-10 E2).
- **K=no, H=yes**: P2c builds the fleet APK and does a fresh install on the spare phone instead
  of an install-over. P4a/P4b run O-10 "BRANCH K=NO" per phone in a **supervised session**: the
  old host proxies to the box **only from B6**, each parked row is retried by hand (S7 clock-in
  walk included), the AFTER check is against the A3 photos, then uninstall and fresh install of
  the fleet build. If v2=no, the owner decides in P0a whether old-secret tokens are accepted for
  the window (`O10-F15`, §4); the verifier is always built in P1 (default OFF); P3b keeps the
  sealed old secret only on a "yes".
- **K=no, H=no**: no drain is possible; P4a/P4b transcribe each phone's A3 photos into the
  manager web and declare the loss, then fresh install.
- **Mixed fleet** (one or a few K=no phones): the host **hangs** until every K=yes phone has its
  P4b row, then switches to proxy for the K=no phones, each in its own supervised session.
- **Network cut** (P0a item 12) on every phone in every branch. It lifts for a phone only when:
  K=yes and a hang-mode stub is verified (P3c step 4) — or the phone's own supervised drain
  session begins. Under K=no it never lifts outside that session.

## 3. Phase checklist

- [ ] P0a — Owner pre-flight: Railway cut-off + old secret, R2 archive, Supabase dump, evidence, tools, decisions (today)
- [ ] P0b — Procurement: domain, box or VPS, ISP, UPS (owner-run, dated)
- [ ] P1 — Backend first-boot gate, PIN policy, origin marker, deep-health exposure, legacy verifier (default OFF)
- [ ] P2a — Offline engine honesty (mobile code) [P2a-2 if the hatch is taken]
- [ ] P2b-1 — Drain tooling and fleet profile (mobile code)
- [ ] P2b-2 — Drain audit script (backend code) [+ drain-image tag if last]
- [ ] P2c — Fleet APK v1: build, signature, install proof (both K branches)
- [ ] P3a — Self-host repository changes [P3a-2 if the hatch is taken] [+ drain-image tag if last]
- [ ] P3b — Box ready, restore, PIN rotation (owner session)
- [ ] P3c — Pre-cutover verification (preflight host; route stays closed)
- [ ] P12a — Web payment idempotency fix (A4), before P4a
- [ ] P4a — Pilot drain: field protocol, B4–B6, E1–E6 on one phone
- [ ] P4b (×n) — Fleet drain, one session per workshop visit
- [ ] P4c — Window close, ceilings, re-seed, deploy train
- [ ] P4r (×n) — Late re-open, one session per late phone
- [ ] P5a — Geofence and sampler fixes (mobile code) + compile gate
- [ ] P5b — Permissions, OEM onboarding, remaining patches, typed-id login, APK-side fields + v2 build
- [ ] P5c — Pilot validation of v2
- [ ] P5d-1a (×n) — Fleet install of v2, one session per visit; T0 at the last install
- [ ] P5d-1b (×n) — Per-OEM protocol runs (incl. the pilot's OEM)
- [ ] P5d-2 — 48 h review and FIELD-VALIDATION
- [ ] P6a — Attendance truth, migration-free: verdict rule, liveness, discard counts
- [ ] P6b-1 — Attendance migration: late flags, adjustments, payroll version and regeneration
- [ ] P6b-2 — Heartbeat index, sampler-health read, dispatcher guard, audit script
- [ ] P7a — Authorization model and money guards
- [ ] P7b-1 — Login, lock and session hardening (+ web typed-id login, roster removal, PII setting on)
- [ ] P7b-2 — Ops console, media, web dependencies, Cloudflare rules
- [ ] P8a — Money integrity 1: void attribution, payloads, captured_at, FK NOT VALID
- [ ] P8b — Money integrity 2: bill revisions, chain over payments (+ backfill), daily verify, mailer + anchor [P8b-2 if the hatch is taken]
- [ ] P9a-1 — Accounting slice 1: posting tables, triggers, decision API
- [ ] P9a-2 — Accounting slice 2: stager
- [ ] P9b — Approval and reconciliation UI
- [ ] P10a — CSV export, transport seam, exports page
- [ ] P10b — Odoo import rehearsal (owner session)
- [ ] P11 — JSON-2 push adapter (Custom plan only)
- [ ] P12 — Web manager defects
- [ ] P13a — DB role split
- [ ] P13b — Backup encryption, put-only token, retention, first drill
- [ ] P13c — Monitoring upgrade, node:22 images, lock file; P13d as its second PR
- [ ] P14-n — Expo SDK upgrade, one phase per major; P14-fleet (×n)

---

## P0a — Owner pre-flight (owner session, today)

**Goal.** Cut off anything that could still write to or prune the old data, archive and dump
before any clock runs out, capture the evidence that exists only on the phones and dashboards
today, and settle the decisions the program branches on.
**Entry.** None.
**Scope.** Design doc §4.0 items 1–10, `w2/O-10-design.md` A1–A3, G1 §5 form, §4 of this plan.
**Deliverables** — `docs/program/W0-results.md` with these numbered items **in this order,
except that item 10 (tools and access) is set up first**; every line a value or "unknown,
because …" except where marked MUST. Commands are Git Bash; start the shell with
`export MSYS_NO_PATHCONV=1`.
1. **Fleet hold notice** (MUST): the written procedure sent to every technician (do not open the
   app, clock in, start travel, tap Discard, update, uninstall, clear data, reset); date sent;
   the text **as sent** committed to `docs/program/notices/fleet-hold.md` (English and Urdu).
2. **Railway first** (MUST): project state; **copy the old `FIXFLOW_JWT_SECRET` from the Railway
   env and seal it unconditionally** (used only if K=no & H=yes & v2=no and §4 says yes;
   destroyed at P4c otherwise); then cut any surviving service off the database (remove its
   `DATABASE_URL` or scale it to 0) and reset the Supabase DB password in the dashboard, so an
   old backend can neither drain phones nor run its 02:30 pruner (`O08-F02`); whether the old
   subdomain can be bound (H) and to what; account and billing access.
3. **R2 archive** (MUST): mint an R2 API token; `export AWS_ACCESS_KEY_ID=… AWS_SECRET_ACCESS_KEY=…`;
   `docker run --rm -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY amazon/aws-cli --endpoint-url https://<acct>.r2.cloudflarestorage.com s3 ls s3://<bucket>/backups/db/`
   (record the listing); then `… s3 cp --recursive s3://<bucket>/backups/db/ s3://<bucket>/archive/pre-selfhost/`;
   then a laptop copy with `docker run --rm -v C:/fixflow-r2:/dl -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY amazon/aws-cli --endpoint-url … s3 cp --recursive s3://<bucket>/backups/db/ /dl/`;
   `s3 ls` the archive prefix afterwards and record it.
4. **Supabase** (MUST, same day): status, pause date, the restore deadline as shown, Postgres
   major. If restorable: restore (unpause) and **take the dump now** through the session pooler:
   `docker run --rm -v C:/fixflow-dumps:/out postgres:17-alpine pg_dump "postgresql://postgres.<ref>:<pw>@<pooler-host>:5432/postgres" --format=custom --schema=public --no-owner --no-privileges -f /out/supabase-<date>.dump`
   (RUNBOOK-BACKUPS §session pooler); `sha256sum` it; upload it with
   `docker run --rm -v C:/fixflow-dumps:/up -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY amazon/aws-cli --endpoint-url … s3 cp /up/supabase-<date>.dump s3://<bucket>/archive/pre-selfhost/`;
   **verify it the same day with design Appendix C**: `export ARGS_DUMP_PATH=C:/fixflow-dumps/supabase-<date>.dump ARGS_LOGDIR=C:/fixflow-dumps/logs`,
   save the Appendix B block as `$ARGS_LOGDIR/appendix-b.sql`, run the Appendix C commands, record
   the Appendix B output. If only a
   dashboard download is available: `pg_restore -l` it inside `postgres:17-alpine` to learn its
   format; a plain-SQL file is loaded into a scratch PG17 and re-dumped as custom format of the
   `public` schema; done when an Appendix C restore of the resulting file passes. If the
   dashboard says unrecoverable: screenshot. "Unknown" is not accepted; "project restored" alone
   does not satisfy this item.
5. **Fleet roster**: phone × technician id × OEM/model/Android version × shared-phone yes/no.
6. **Field build, per phone**: `adb pull` of `base.apk`; `apksigner verify --print-certs`
   SHA-256; versionCode; `unzip` and `grep -a` of `assets/index.android.bundle` for
   `jobs.outbox.v2` (v2) and the baked API host; K per phone against the EAS keystore cert
   (`eas credentials`); the keystore **exported** (not re-mintable, `w2/O-08-design.md` §1).
7. **A3 photos**, per phone, today: airplane mode on and Wi-Fi off, open FixFlow, photograph the
   ClockScreen DID-NOT-SYNC list and every job banner, close the app, airplane mode off. "Not
   reachable" only for a phone whose session is gone.
8. **Sentry**: backend project last event; mobile project still ingests.
9. **Workshop coordinates** and the fence radius the owner wants (≥ 100 m, `O01-F04`).
10. **Tools and access**: Docker Desktop running (`docker info`); Android platform-tools (adb) and
    build-tools (apksigner) + a JDK; `npx eas-cli login`; `npx @railway/cli login` if H=yes;
    dashboard logins for Railway, Supabase, Cloudflare, Sentry, Firebase, Expo; **USB debugging
    on every roster phone** (item 6 needs it); a cable; a spare Android phone for P2c.
11. **Decisions** (§4): every row answered or left to its default; incl. the chain-anchor address
    and SMTP relay credentials (or "unanchored"), the geofence thresholds, the Odoo plan and
    version, and — when K=no & H=yes & v2=no — the `O10-F15` old-secret decision.
12. **Network cut, every phone**: FixFlow's per-app Wi-Fi and mobile data off (system settings),
    or "background data off + Wi-Fi blocked by <method>", or airplane mode when nothing else is
    available; method and date recorded per phone. It lifts only per the §2 branch box.
13. **Committed keys**: the Maps/Firebase/Sentry client keys restricted in each console (package
    name + SHA-1); done per key (`O05-17`).
**Done when.** Items 1–4, 6 (every roster phone), 10 and 12 have values; the rest have values or
a dated "unknown, because".
**Workflow.** None; a Sonnet chat can help read a dashboard. **Resume.** The file.

## P0b — Procurement: domain, box or VPS, ISP, UPS (owner-run, dated)

**Goal.** What P2b-1, P2c and P3 cannot start without, with a date and a fallback.
**Entry.** P0a.
**Scope.** The **domain** (Cloudflare DNS, multi-year, auto-renew) — the name is enough for
P2b-1; DNS for P2c/P3a. The **box** (Linux, UPS, location, CGNAT test once online) **or**, by
the target date, the G2-D1 fallback: a small VPS running the identical compose behind the same
`api.<domain>` (VPS → box later is a DNS change). ISP facts. Target date = when the drain must
start (P4a), set by the Supabase deadline and the techs' hibernation clock.
**Done when.** `api.<domain>` exists in Cloudflare DNS and a Linux host with SSH exists.
**Resume.** The W0-results section.

## P1 — Backend first-boot gate, PIN policy, origin marker, deep-health exposure, legacy verifier (backend; one PR; migration-free)

**Goal.** The first self-hosted boot cannot run with a dev secret or a usable seed PIN; every
response carries the marker the phones use to tell "the app said no" from "something in the way
said no"; the owner can read from deep-health everything later phases need to read back.
**Entry.** Docker Desktop up. Independent of P2a (which needs only the header name
`X-FixFlow-Api: 1`) and of P0a's answers.
**Scope (register).**
- Dev-secret fail-open (`O6-F01`/`O08-F01`/`O05-01`/`O10-F5`): boot refuses the dev default, a
  blank secret and a secret under 32 bytes unless `FIXFLOW_ENVIRONMENT` is explicitly `dev` or
  `test`; the default environment stops being `dev` (config.py), with the knock-on edits
  `FIXFLOW_ENVIRONMENT=test` in `ci.yml`, in design Appendix A's gate container and in the dev
  compose (`w2/O-06-design.md` item 1).
- Seed PINs (`O6-F05`/`O05-02`/`O10-F6`): in production, login **refuses** (403, "PIN must be
  changed by the manager") any account whose hash verifies against a known default PIN;
  **`MIN_PIN_DIGITS_TECH` → 6 and `SetPinRequest.pin` min_length → 6** in the service and schema
  (G2 §5, `O05-04`), with a test that a 4-digit tech PIN set through the API is refused;
  `backend/scripts/set_pin.py` (dry-run default) shares that policy.
- **Legacy-secret verifier, always built, default OFF** (`O10-F15`): when `FIXFLOW_LEGACY_JWT_SECRET`
  is set, a token whose signature verifies against it is accepted on **write routes only**, with
  the token's own `exp` **not enforced** (the field tokens all expired in 2026-09; the window
  expiry `FIXFLOW_LEGACY_JWT_EXPIRES_AT` replaces it) and `sub`/`ver`/`active` checks kept. Tests: a
  token 60 days past `exp` is accepted on a write route, refused on a read route, refused after
  `EXPIRES_AT`, and ignored entirely when the variable is unset.
- `/docs`, `/redoc`, `/openapi.json` off in production (`O6-F19`/`O05-16`); body caps on login
  and the webhook (`O05-14`).
- Marker header `X-FixFlow-Api: 1` on every response incl. unknown-route 404s and
  unhandled-exception 500s (an outer ASGI wrapper; `w2/O-03-design.md` step 1).
- **Deep-health exposure** (ops-token-gated): `default_pin_active` per account; the resolved
  client IP, raw `X-Forwarded-For` and `CF-Connecting-IP` of the request; `enable_dispatcher`,
  `backup_enabled`, `backup_prefix`; the device_time, jobs-GPS and ping backdate ceilings; the
  legacy verifier's on/off and expiry; `FIXFLOW_GIT_SHA` (a build arg the compose sets from
  `git rev-parse HEAD` or the tag; the image digest itself comes from `docker inspect`). Each
  with a test.
- Ping backdate ceiling default 48 → 240 h (`O04-F12`, G2 §5); drain-mode knobs
  (`FIXFLOW_ATTENDANCE_*`, `FIXFLOW_JOBS_GPS_*`) documented; `/api/ops/health` documented as the
  healthcheck target with its `X-Ops-Proxy-Token` requirement (`O08-F07`).
**Deliverables.** Code + tests per bullet (incl. forced-500 marker test, no-env fails-closed
test, `1234` login → 403 in production); `set_pin.py`; CLAUDE.md security section **and** the
Location-and-privacy trust-window line (240 h) updated. If P1 merges last of P1/P2b-2/P3a: the
`release/drain` branch and `drain-image` tag cut.
**Done when.** Backend gates green in Docker and CI; `curl -i` on an unknown path shows the
marker; a manual boot with no env fails closed.
**Owner inputs.** Docker Desktop started.
**Workflow.** Opus implements; Sonnet writes tests from this list; Opus reviewer with the G2 §1.1
claims as its refute list.
**Size.** Large; if long, the deep-health exposure bullet (except `default_pin_active` and the
client-IP echo) moves to P3a. **Resume.** Branch `fix/backend-first-boot-gate`.
**Backlog in these files.** none (`O05-15` → P7a; `O05-17` → P0a 13).

## P2a — Offline engine honesty (mobile code; one PR; no build)

**Goal.** The engine's contract is true under a dead, reviving or flaky backend.
**Entry.** Header name fixed (`X-FixFlow-Api: 1`). Independent of P1.
**Scope** — `w2/O-03-design.md`, by **its** step numbers (each checkbox names the design's test):
- **Step 1** origin-aware classification: a response without the marker (edge 404, Cloudflare
  403/502/530, captive pages) is **connectivity** — no park, no drop, no attempt count; 5xx
  counts toward the poison cap only with the marker (`O3-F6`). **No** JSON-`detail` fallback
  (ruling R8). Test: a `{"detail": …}` body without the marker is not definitive.
- **Step 2** `sendOrQueue` keeps the write on non-app errors and on 401 (`O3-F1`, `O3-F8`).
- **Step 3** duty truth from live punches only (`O3-F2`, `O3-F3`).
- **Step 4** `clearSession()` on every 401 incl. headless; privacy gates read the cleared state
  (`O3-F7`).
- **Step 5** `drainAll(techId)` on mount, `active`, connected and after login, fixed order
  (`O3-F9`). Lives here only.
- **Step 8** location outbox id **per tap** + travel-state merge (`O3-F10`, `O3-F11`; CLAUDE.md
  "the outbox never deletes a write").
- **Step 9** corrupt-store preservation (`O3-F17`).
- **Step 10** (surfaces): engine status banner (`O3-F14`); `sendPunch` reports landed / queued /
  failed distinctly (`O3-F18`, L7).
**Deliverables.** Code and the design's pure-module Jest tests per step; every new test fails on
`main` and passes on the branch (prove it in the PR).
**Done when.** `npm run typecheck && npm test` green; CI green.
**Workflow.** Opus implements; Sonnet tests from the design's list; Opus reviewer briefed with
CLAUDE.md's outbox invariants.
**Size.** Large but single-threaded. If long, land steps 1–5 and 8 and open **P2a-2** for 9 and
10 (same brief); **P2c's** entry then adds "P2a-2 merged" (P2b-1 does not wait for it).
**Resume.** Branch `fix/mobile-engine-honesty`; draft PR checklist.
**Backlog in these files.** `O3-F16`, `O3-F19`..`F21`, `O10-F16`.

## P2b-1 — Drain tooling and fleet profile (mobile code; one PR; no build)

**Goal.** Everything fleet APK v1 needs to prove it lost nothing, and nothing in it that could
drain before that proof exists.
**Entry.** P2a merged; the domain name decided (P0b; DNS need not resolve); P0a item 6 recorded
for every roster phone (the fleet versionCode must exceed the fleet maximum).
**Scope** — `w2/O-10-design.md` D1–D7 and E4; `w2/O-03-design.md` steps 6–7:
- D1: the `fleet` EAS profile (APK, `EXPO_PUBLIC_API_URL=https://api.<domain>`, real Sentry DSN,
  versionCode above the fleet maximum). `preview` and `production` profiles **repointed to the
  owned domain or removed** (`O08-F05`/`O08-F14`); every later build names `fleet`.
- D4 then D3: the manifest snapshot at bundle load, **written once per versionCode**; a sync gate
  every queue awaits that opens **only on a 2xx manifest receipt**; the one-time un-park
  migration keyed on edge reasons (`O10-F2`) runs **after** the snapshot is written.
- D5: the gate calls `drainAll` (P2a). D6/E4: login banner with per-tech record counts; the
  shared-phone sign-in copy (queues drain under their owner's session, `O10-F10`). D7: the Drain
  Report screen (BEFORE counts by queue and reason) and manifest upload via `POST /api/events`.
- Step 6: retry advice for stale rows at the **post-window ceiling of 336 h** read from one
  shared constant (`O3-F4`; P4c sets the server to the same value); Discard copy that
  distinguishes "server refused" from "could not reach" (`O3-F13`); every Discard writes a
  telemetry event with kind and tech (`O6-F14`/`O6-F15`, `w2/O-06-design.md` item 6).
- Step 7: pending-media retry/discard and the needs-attention list (`O3-F5`, `O3-F12`); a local
  catch around the selfie PUT so a throwing upload marks the punch and retries the selfie
  separately (`O10-F8`).
- The login screen states that the typed value is the **technician id on the sealed slip**
  (ruling R3) — the v1 build still shows the roster; the typed-id screen is P5b.
**Deliverables.** Code; tests `manifest.test` (gate waits for 2xx; un-park after snapshot;
once-per-versionCode), `unpark.test`, `retryAdvice.test` (boundary from the constant), `sync.test`
(selfie throw does not stall).
**Done when.** Mobile gates green; `expo export --platform android` + `grep -a` of the bundle
shows the owned domain and `jobs.outbox.v2`; a parked row older than the constant shows the
late prompt before Retry (test); CI green.
**Workflow.** Opus for the manifest gate, un-park ordering, retry advice, pending-media; Sonnet
for screens and banner; Opus reviewer briefed with O-10 R1–R7.
**Size.** Large. **Resume.** Branch `feat/fleet-drain-tooling`.
**Backlog in these files.** `O10-F9`, `O10-F11`, `O10-F12`.

## P2b-2 — Drain audit script (backend code; one PR; migration-free)

**Entry.** P2b-1 merged (manifest schema fixed).
**Scope.** `backend/scripts/drain_audit.py` (dry-run, read-only), run as `docker compose exec
backend python scripts/drain_audit.py …`: compares a manifest with server rows per tech since
`T_open`, with the matching rules for kinds that carry no `client_id` (`w2/O-10-design.md` E6);
`--test-window START END` reports the rows in that window separately while still counting them
toward the landed delta (the O-01 protocol rows); **`--snapshot-fuel OUT.json`** writes per-job
derived distance and fuel for closed/billed jobs (run at B5, written to the bind-mounted
`/var/lib/fixflow/drain/` and uploaded with the B5 dump to `archive/pre-drain/`, so a re-cut or
restart cannot lose it), and **`--fuel-baseline OUT.json`** diffs the AFTER state against it
(ruling R2; fuel is derived on the fly in `jobs/service.py`, so a `pg_dump` is not a usable
baseline). `docs/program/notices/release.md` (English and Urdu): what
is now allowed (open the app, clock in, travel, Retry), what stays forbidden (Discard, uninstall,
clear data), whom to call.
**Done when.** Backend gates green (pytest against a fixture manifest and a seeded DB, incl. the
snapshot/baseline round trip); CI green. If P2b-2 merges last of P1/P2b-2/P3a: the
`release/drain` branch and `drain-image` tag cut.
**Workflow.** Opus (matching rules halt the fleet on a mismatch); Opus reviewer. **Size.** Medium.
**Resume.** Branch `feat/drain-audit`.

## P2c — Fleet APK v1: build, signature, install proof (EAS + one spare phone; both K branches)

**Entry.** P2b-1 merged (P2a-2 too, if opened); domain in DNS (P0b); P0a item 6 for every roster
phone; the spare Android phone and the pulled field `base.apk`.
**Scope.** `eas build --profile fleet` (record the build id; if the queue is slow the session
ends at "submitted" and resumes from `eas build:list`); download; unzip and `grep -a`
`assets/index.android.bundle` for `api.<domain>` and `jobs.outbox.v2`; `apksigner verify
--print-certs` — **K=yes**: equals the field cert; install the field `base.apk` on the spare
phone, then `adb install -r` the fleet APK (same package, same cert, higher versionCode).
**K=no**: record the new cert SHA-256; fresh install on the spare phone. In both: the spare
phone's FixFlow network is **off** for the whole test (the APK bakes the production domain;
O-10 E6); open the app; the Drain Report renders (empty: the spare phone cannot log in).
**Deliverables.** W0-results "Fleet APK v1": build id, versionCode, cert, grep result, install
result, screenshot.
**Done when.** Grep clean; cert check per branch; install succeeds; the report renders.
**Owner inputs.** EAS access, the spare phone, the field APK. **Size.** Small plus the queue.
**Resume.** `eas build:list`; the section.

## P3a — Self-host repository changes (code; one PR; migration-free)

**Goal.** Everything the box will run, in the repo, smoke-tested locally, with the runbook the
owner session follows step by step.
**Entry.** P1 merged. **First act:** confirm the deploy-train table exists in W0-results.md
(create it if no earlier phase has).
**Scope** — `w2/O-08-design.md` §1–§2, §6; G2-D2:
- `docker-compose.prod.yml` with profiles: `db` (Postgres 17), `app` (backend; cannot start
  before the restore; `FIXFLOW_GIT_SHA` build arg; `FIXFLOW_BACKUP_ENABLED=false` until P3c
  step 7 — the code default is ON), `web`
  (Caddy serving the build from a **node:22 build stage with CSP and security headers, font
  self-hosted**, `O05-11`), `ops` (optional, `Dockerfile.ops`, `OPS_BACKEND_URL=http://backend:8000`,
  `OPS_RAILWAY_*` unset), `edge` (cloudflared with a 503 catch-all; `api.` → `backend:8000`
  directly so XFF stays single-hop, `O08-F04`; the compose healthcheck sends
  `X-Ops-Proxy-Token`). **No published ports** (`O05-08`/`O08-F03`); root-owned env files;
  `FIXFLOW_ENVIRONMENT=production`; `FIXFLOW_BACKUP_PREFIX=backups/db-selfhost/` (existing
  setting).
- **`ops/hang-stub/`**: zero-dependency Node service with two modes — *hang* (accept, no bytes
  for ≥ 20 s, close) and *proxy* (forward to `api.<domain>`; a response passes through **only if
  it carries `X-FixFlow-Api: 1`**; on any markerless response — a Cloudflare 429/403/404, an
  edge page —, any 5xx, error or timeout it hangs instead of answering, because the field build
  treats a bare 4xx as definitive) — with tests for both modes incl. "a markerless 429 causes a
  hang" (standing rule 5). Railway deploy command documented.
- Minimal **off-box heartbeat**: a host cron job calling `/api/ops/health` with the token and
  pinging the §4 dead-man service (G2-D2 "mandatory").
- `docs/RUNBOOK-SELFHOST.md`: the "box ready" checklist with a check command per item; the
  secrets list (JWT, `FIXFLOW_OPS_PROXY_TOKEN`, R2, FCM, Sentry, optional `FIXFLOW_LEGACY_JWT_SECRET`
  + `EXPIRES_AT`); restore per recovery case **from O-08 §3**, run as the DB owner `fixflow_app`
  (`docker compose --profile db up -d`; `docker compose exec -T postgres psql -U fixflow_app -d
  fixflow -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public'`; `docker compose exec postgres
  mkdir -p /restore`; `docker compose cp <dump> postgres:/restore/`; `pg_restore --exit-on-error
  -U fixflow_app -d fixflow /restore/<dump>`; Appendix B via `psql -U fixflow_app -d fixflow -f
  /restore/appendix-b.sql`; then `--profile app --profile web`); case-c extras (`setval
  job_token_seq` above the highest printed ticket, roster slugs, O-10 "nothing" rules); the
  roster check (every tech id in P0a item 5 exists); the fence `UPDATE`/`INSERT` command; the
  **B5 snapshot** commands (`docker compose exec -T postgres pg_dump -U fixflow_app -d fixflow
  --format=custom > predrain-<stamp>.pgdump`, then `pg_restore -l` it and `sha256sum` it before
  the upload to `archive/pre-drain/`, then `drain_audit.py --snapshot-fuel` to
  `/var/lib/fixflow/drain/` and its upload); the **late-sync audit query**, the **per-tech
  min/max device_time query** and the **payroll_export listing** for the window (O-10 F); the
  **dispatch_cursor re-seed SQL**; a manual backup run (`docker compose exec backend python
  -c "import asyncio;from app.core.backup import run_db_backup;asyncio.run(run_db_backup())"`);
  the ceiling env names and the restart; runbook R1–R7 incl. **R5 deploy of a tag or of `main`**;
  the Cloudflare settings for `api.` (no WAF/Bot Fight/challenges; rate rules answer only 429
  with Retry-After); the **`release/drain` branch and `drain-image` tag procedure** incl. the
  re-cut after a window fix; the deploy-train procedure.
- CI backend job on Postgres 17 and **design Appendix A → `postgres:17-alpine`** (`O08-F12`);
  CLAUDE.md Deploy row, traps and doc map updated; ADR-0001 amended "superseded" (G2-D1).
**Deliverables.** The files; a local `docker compose -f docker-compose.prod.yml up` smoke on
Docker Desktop with a fake domain and throwaway DB (health green, catch-all 503). If P3a merges
last of P1/P2b-2/P3a: the `release/drain` branch and `drain-image` tag cut.
**Done when.** Gates and CI green; local smoke green; runbook steps numbered.
**Workflow.** Sonnet drafts configs and runbook from O-08; Opus reviews compose, restore order,
stub modes against `O08-F01`/`F02`/`F07` and rule 5.
**Size.** Large. If long, move the stub and the heartbeat (and their runbook sections) to
**P3a-2** (Entry: P3a merged; Done: stub tests + CI green). P3a-2 does **not** affect the
drain-image tag (the stub runs on Railway and the heartbeat is a host cron, neither is in the
backend image); P3c's Entry then adds "P3a-2 merged".
**Resume.** Branch `feat/selfhost-stack`.
**Backlog in these files.** `O08-F09` (P7b-2), `O08-F10` (P13c).

## P3b — Box ready, restore, PIN rotation (owner session at the box)

**Goal.** The recovered database on the box, verified, with no account on a default or short
PIN, the backend and web booting against it — reachable from the box only.
**Entry.** `drain-image` tag cut; P0b destination with SSH; the P0a dump artefacts and the archive
copy done; the recovery case decided (§4: no default); the `O10-F15` decision recorded if it
applies.
**Scope** (runbook steps, table committed to W0-results first):
1. Box-ready checklist, every command's output recorded.
2. Secrets into `/etc/fixflow`: generated JWT secret; **only on a §4 "yes" (K=no & H=yes &
   v2=no): the sealed old secret as `FIXFLOW_LEGACY_JWT_SECRET` with `EXPIRES_AT` = the planned
   `T_close`** (P4c extends it with the window); `FIXFLOW_OPS_PROXY_TOKEN`; R2 keys; FCM service
   account; Sentry DSN; encrypted copy in the owner's password manager; printed recovery sheet.
3. `--profile db`; restore per case as `fixflow_app` (runbook commands); Appendix B gate against
   the O-08 §3 baselines; case (a) cross-checked against the newest archived R2 dump; record
   `T_restore` (max timestamps from Appendix B).
4. `--profile app --profile web` (and `ops` if used) at the **`drain-image` tag**: deep-health
   shows `jwt_secret_overridden`, `enable_dispatcher=false`, `backup_enabled=false` (set in the
   compose), the git sha; `docker inspect --format '{{.Image}}' backend` recorded beside it.
5. Roster check (every P0a item 5 tech id exists; create missing ones); fence row set from P0a
   item 9 by the runbook command (`O10-F14`).
6. PINs (ruling R4): `set_pin.py --dry-run`, then every account gets a fresh ≥ 6-digit PIN
   (`docker compose exec backend python scripts/set_pin.py …`); sealed per-tech slips (id + PIN)
   for hand-over at P4 E4; `default_pin_active` false for every account.
7. `curl` from the box: login works, marker present, `/api/ops/health` green with the token.
**Done when.** Step 7 passes; `docker ps --format '{{.Ports}}'` shows no host port; the tunnel
is **not** yet created.
**Owner inputs.** Box access; the dumps; the highest printed job ticket (case c).
**Size.** One session (case (a) restoring the P0a dump is the long version). **Resume.** The table.

## P3c — Pre-cutover verification (owner session + session; route stays closed)

**Goal.** Everything G2 §3 and O-10 require to be true before any phone meets the new host,
with `api.<domain>` answering 503 to the world until P4a opens it.
**Entry.** P3b done.
**Scope** (table first):
1. `cloudflared tunnel` created; `--profile edge`; `api.` on the **503 maintenance responder**;
   `app.` (and `ops.` if deployed) behind **Cloudflare Access**; a **temporary
   `preflight-api.<domain>`** ingress to `backend:8000`, reachable only with a Cloudflare Access
   **service token** (curl sends `CF-Access-Client-Id/Secret`); no APK knows it.
2. Tests through `preflight-api.`, recorded: (a) a forged `X-Forwarded-For` — the deep-health
   echo (P1) shows the resolved IP, raw XFF and `CF-Connecting-IP` (decides P7b-1's keying,
   `O08-F03`); (b) cloudflared stopped → `curl -i` code (a markerless 5xx or network error, never
   a marker 4xx; O-10 R3); (c) `/api/ops/health` carries `X-FixFlow-Api`; (d) one selfie presign
   → PUT → commit succeeds (`O10-F8`, O-10 B2); (e) CSP header checked **from the box**
   (`docker compose exec web wget -S -O- http://localhost/`).
3. **Latency** (§4 threshold) from the owner's phone on Pakistani mobile data (Termux `curl -w`
   with the service-token headers): 20 × GET `/api/health`; one manager login with a slip PIN,
   then 20 × GET `/api/jobs` and 20 × POST `/api/events`; record `cf-ray` PoP, p50/p95. Fail →
   G2-D1 VPS: re-run P3b and P3c on the VPS from the same dump with the same slips, discard the
   box DB (O-10 R1), P0b records the VPS date.
4. **Old hostname** per rule 5: H=yes & K=yes → hang stub deployed on Railway and verified (no
   bytes 20 s); H=yes & K=no (or mixed fleet) → the stub deployed, **in hang mode** until B6 (or
   until every K=yes phone has its P4b row), its proxy mode verified with the tunnel stopped (it
   hangs, never 5xx); H=no → recorded. The network-cut lift rule (§2) confirmed per phone.
5. Cloudflare rate rule on `/api/auth/login` (429 + Retry-After); WAF/Bot Fight/challenges off
   for `api.` and `preflight-api.` (`O05-03`, O-08 §4).
6. Heartbeat cron live; the dead-man service pages the owner (tested by stopping the container
   once).
7. Backups: `backup_prefix=backups/db-selfhost/` read back from deep-health; the manual backup
   run; the new key listed in R2; restored once with Appendix C; then `BACKUP_ENABLED=true`
   (read back). Note in W0-results: backups are plaintext under the app credential until P13b
   (`O6-F06`, G2-D2 deviation accepted in §4).
8. `preflight-api.` and its service token **deleted**; deletion recorded.
**Done when.** Every test has a result; latency passes or the VPS path is taken; `api.` still
answers 503 to a phone; step 8 done.
**Owner inputs.** Cloudflare dashboard; Railway if H=yes; their phone.
**Workflow.** The session guides; Opus reviews the XFF/stopped-tunnel results against P7b-1.
**Size.** Medium. **Resume.** The table.

## P12a — Web payment idempotency fix (web; one small PR; before P4a)

**Entry.** P3a merged; **P3b done** (the web profile runs on the box). **Scope.** A4 (HANDOFF
§4.1, P0): `PaymentModal`/`AppContext.logPayment` mint the idempotency key once per payment
attempt and rotate it **on success or on any change of job, amount or method** (after P7a a
reused key with a different job/amount is a 409), so a retried manager payment never
double-charges and a corrected amount is never refused — the manager enters P4's parked cash
residue through this path; a test per case. **Done when.** Vitest green; the web image rebuilt
on `release/drain-web` (= `release/drain` + this commit) and deployed (web-only). **Workflow.**
Opus (money). **Resume.** Branch `fix/web-payment-idempotency`.

## P4a (×n until passed) — Pilot drain (operations; one session; one phone)

**Goal.** One phone's queued data in the recovered database with proof, the field protocol
observed on the field build while it still exists, and the route opened.
**Entry.** P2c done; P3c done; P12a deployed; the first scheduled 02:30 backup object present in
R2; the `O10-F15` decision recorded (if applicable); drain window settings staged per
`w2/O-10-design.md` B4 with ruling R2's values (device_time ceiling = W; **jobs GPS ceiling = W**;
ping 240 h; future tolerance untouched). **In a mixed fleet the pilot is a K=yes phone**; K=no
phones run only as P4b rows after every K=yes row.
**Scope** (O-10 B4–E in order; Pilot table first):
1. **Field protocol** (`w2/O-01-design.md` steps 0–4, 55 min, adb, tech on shift): step 0 keeps
   FixFlow's network cut while the app is opened; start/end times logged (→ `--test-window`).
2. B4 restart with the staged window; B5 pre-drain snapshot per the runbook (`predrain-<stamp>.pgdump`
   to `archive/pre-drain/` — never via `run_db_backup`) **and `drain_audit.py --snapshot-fuel`**;
   selfie PUT re-checked.
3. B6: the route flips 503 → backend; `T_open` recorded; **K=no & H=yes**: the old-host stub is
   switched to proxy mode now (mixed fleet: only after every K=yes phone's P4b row).
4. **K=yes** E1–E6: BEFORE photo; the tech clocked in with the ping task registered; the app's
   network **on** — with H=no, only immediately before the install (an edge-404 park then is
   expected and un-parked by D3); `adb install -r` with logcat captured before the app is opened
   (no sync before the manifest receipt — O-10 D4); open; E4 sign-in with the sealed slip; drain;
   pings resume after the update (ring); AFTER audit `drain_audit.py --test-window … --fuel-baseline …`
   — per-tech row delta since `T_open` equals the manifest's landed count; fuel-distance diff
   clean (changed closed/billed jobs listed for the manager). **K=no & H=yes**: O-10 BRANCH K=NO
   steps incl. S7, row-by-row Retry, AFTER against the A3 photos, owner sign-off, then uninstall
   + fresh install. **K=no & H=no**: transcribe the A3 photos, declare the loss, sign-off, fresh
   install.
5. Parked residue entered by the manager (cash first, via the P12a web path).
6. The written release notice handed to the pilot tech (rule 6).
**Deliverables.** The Pilot table; logcat and protocol findings; the test-row window.
**Done when.** Per branch: K=yes → AFTER matches; K=no/H=yes → rows match the photos and the
owner signed; K=no/H=no → every photographed row transcribed or declared lost and signed. **On an
AFTER mismatch:** done = mismatch tabulated per kind, a register row opened, fleet halted (O-10
R7); a server-side fix is cherry-picked onto `release/drain` and re-tagged (rule 3); an APK-side
fix goes to `main`, gets a new versionCode and a P2c re-run; the pilot **re-run session** repeats
step 2 (fresh B5 + `--snapshot-fuel`) and steps 4–6 on the **next undrained phone** (the first
phone's queues are gone; O-10 D4 writes the manifest once per versionCode) and adds a row to the
Pilot table — P4b's Entry requires "P4a passed".
**Owner inputs.** Pilot tech and phone, manager, adb laptop.
**Workflow.** The session guides; Sonnet tabulates logcat. **Resume.** The Pilot table.

## P4b (×n) — Fleet drain, one session per workshop visit

**Entry.** **P4a passed** (AFTER matched). **Scope.** For each roster phone present: its E1–E6 row
(BEFORE photo, manifest receipt id or photo set, install result, sign-in — shared phones: each
tech in turn (E4 copy) —, AFTER audit, residue entered, release notice), per the phone's branch;
a phone STOPs and re-checks K only on a cert mismatch, `INSTALL_FAILED_UPDATE_INCOMPATIBLE` or a
downgrade (O-10 E2) and then follows the K=no row in its own supervised session; a phone the
owner declares undrainable gets a retired row. **Mixed fleet:** when the last K=yes phone has its
row, the stub is switched to proxy (recorded); K=no rows run only after that. **Done when** (per
session). Every present phone's row filled. **Done when (phase).** Every roster phone has a P4b
or retired row, or `T_close` has arrived (the rest go to P4r). **Resume.** The per-phone table.

## P4c — Window close, ceilings, re-seed, deploy train (owner + session; one session)

**Entry.** `T_open + 7 days` (extendable once in writing; an extension also moves
`FIXFLOW_LEGACY_JWT_EXPIRES_AT`, restart recorded) or every roster phone drained/retired.
**Scope.** Late-sync audit query; `T_close` recorded; ceilings set **device_time 336 h, jobs GPS
48 h, ping 240 h**, restart, values read back from deep-health; per-tech **min/max device_time
of the drained rows** recorded (for P6b-1's payroll regeneration); `payroll_export` rows created
in the window listed (runbook queries, O-10 F); **cursor re-seeded** (rule 4); the old-host stub
**switched to hang** (or kept hanging) while any roster phone lacks a P4b/P4r/retired row,
**removed** only when none does; `FIXFLOW_LEGACY_JWT_SECRET` unset on the box; the **sealed old
secret**: destroyed and recorded if the §4 `O10-F15` answer is "no" (or no phone is K=no & H=yes
& v2=no), otherwise kept until the last P4r destroys it; then the **deploy train**: `main` HEAD
deployed **once** per runbook R5 (`start.sh` applies the pending migrations in chain order),
`/api/ops/health` sha and `docker inspect` digest recorded, then **each row's post-deploy check
run** — the checks are read-only (P8a: schema at the new head, `voided_by/at` columns present;
P8b: a manual verify run `docker compose exec backend python -c "…verify_ledger_chain…"`; P9b:
the reconciliation GET returns 200 with zero deltas; the approval check waits for P10b); a
failing check **halts the train** (runbook rollback), and the remaining rows continue as
**P4c-train (×n)** sessions, per-row tags `train-<n>` only on a failure; the **last row rebuilds
the web image from `main`** and checks the board shows `sampler_state`; `release/drain` and
`release/drain-web` retired.
**Done when.** All of the above recorded in W0-results. **Resume.** The step table.

## P4r (×n) — Late re-open, one session per late phone

**Entry.** P4c done; a roster phone with no P4b/retired row. **Scope.** Supervised, with the
phone's branch row: the APK is **v2 only if P5c passed**, else fleet v1 (must happen before P7b-1
removes the roster the v1 login uses); **K=no & H=yes**: before the proxy switch, every other
roster phone lacking a row has its network cut re-imposed and verified (recorded), or the session
waits; then the stub switched to proxy and, on the §4 "yes", `FIXFLOW_LEGACY_JWT_SECRET` re-set
with a session-length expiry — both reverted to hang/unset at the end; the **global** window
settings staged (O-10 F: ceilings are global) and restart; fresh B5 snapshot + `--snapshot-fuel`;
drain; AFTER audit with `--test-window` and `--fuel-baseline`; residue entered; release notice;
per-tech min/max device_time recorded; if P6b-1 is deployed, the manager `accept` pass and
payroll regeneration (version + 1) for the touched windows; ceilings restored and read back;
cursor re-seeded (rule 4); row recorded. **If every roster phone now has a P4b/P4r/retired
row:** the stub is removed (or, by owner decision, kept hanging while a lost retired phone
still runs the field build, `O05-07`), the sealed old secret destroyed, both recorded; this is
rule 4's "last re-open". **Done when.** The row is filled and every temporary setting reverted.

## P5a — Geofence and sampler fixes (mobile code; one PR) + compile gate

**Goal.** The arrival prompt fires for real arrivals, the sampler regains its foreground service
when the app comes back, a lost fence repairs itself.
**Entry.** P2b-1 merged (fleet profile); **P6a merged** (shared verdict rule + fixture, ruling R1);
P4a done (protocol findings in W0-results).
**Scope** — `w2/O-01-design.md` FIX ORDER 1–4 and 7, IN-APP LOGGING:
1. Record-first: bounded GPS reads (`O01-F16`), local duty check, debounce stamp **after** enqueue
   (`O01-F05`, `O01-F10`, `O01-F18`).
2. The verdict rule from the P6a fixture (three-state; 100 m accuracy ceiling): inside and
   unknown both **prompt** (unknown with softer copy), outside suppresses (`O01-F04`).
3. FGS re-arm on `active` within the 14 h / 4 h bounds (drop the `isRunning()` early return,
   `O01-F01`) **with the #49424 guard and #52230 stop fallback** as patch-package patches
   (`patches/` + `postinstall`; `O01-F15`); sampler-gap notice.
4. Error-branch re-register, provider banner, periodic re-check every 15 min (O-01 FIX ORDER 4;
   the interval the §4 re-registration threshold assumes) (`O01-F03`).
7. Awaited syncs and foreground drains for pings and presence (`O01-F08`); every fix of a
   batched delivery (`O01-F13`).
- Diagnostics ring (`diag.bg.v1`), telemetry events (`sampler_gap`, `geofence_error`,
  `crossing_recorded`, `notify_suppressed`) whose names are committed as
  `technician-app/src/shared/contracts/telemetry-events.json` (next to the P6a fixture
  `verdict-vectors.json` in the same folder, so Metro bundles both); the mobile test lands here,
  the backend test that reads the same files by repo-relative path lands in P6b-2; hidden
  Diagnostics screen.
**Deliverables.** Code, patches, Jest tests (vectors from the fixture), the event-names JSON.
**Done when.** Mobile gates and CI green; **`eas build --profile fleet` compiles** (id recorded,
not installed — the native patches' first compile).
**Workflow.** Opus implements; Sonnet tests; Opus reviewer with CLAUDE.md's location invariants.
**Size.** Large. If long, defer **only fix 7 and the Diagnostics Share screen** to P5b.
**Resume.** Branch `fix/mobile-geofence-v2`. **Backlog.** `O01-F19`.

## P5b — Permissions, OEM onboarding, remaining patches, typed-id login, APK-side fields (mobile code; one PR) + v2 build

**Entry.** P5a merged.
**Scope** — `w2/O-01-design.md` fixes 5–6, H11; G2 §5; ruling R3:
- Background/precise-location banners with one-tap re-request; hibernation exemption; an
  "Approximate" grant blocks geofencing with a banner (`O01-F06`, `O01-F07`).
- Manufacturer-specific onboarding step + ClockScreen re-offer (autostart, battery saver, lock in
  recents) with a self-attested checklist in telemetry (`O01-F02`), for the P0a roster OEMs.
- Patches: untracked second event (`O01-F09`), shared static timestamp (`O01-F12`), #50060
  (`O01-F14`), network constraint (`O01-F17`); cleanups `O01-F11`, duplicate channel helper.
- **Typed-id login**: the login screen takes the technician id from the sealed slip (no roster
  call; mobile-only).
- **Negotiate reason field** sent with below-original negotiations (P7a flags its absence; never
  required).
- Job list and detail **render minimised unclaimed rows** (no phone/address until claimed) so
  P7b-1 can turn the PII setting on.
- Anything deferred from P5a.
**Done when.** Mobile gates and CI green; **fleet v2 build submitted and finished green**
(`eas build:list`), bundle grep and cert check recorded.
**Workflow.** Opus for native patches and login; Sonnet for screens; Opus reviewer.
**Size.** Medium-large. **Resume.** Branch `fix/mobile-permissions-oem`.

## P5c — Pilot validation of v2 (pilot phone; one session)

**Entry.** P5b's v2 build finished green; **P4c done and P6a deployed** (by the train or per
runbook R5, so the server applies the shared rule); the pilot tech on shift; the adb laptop at
the workshop.
**Scope.** Install-over on the pilot (rule 1); the O-01 protocol gates the fixes address: 3d
(foreground service back within 15 s of opening after an OS kill); 4b–4d (a location toggle
re-registers the fence without opening the app, or the 15-min re-check catches it); the indoor
test (~40 m from the centre on a Wi-Fi fix: prompt fires, server verdict inside or unknown);
device items `O01-F14`, `O01-F12`, `O01-F16` recorded. 3b/3c are P5d-1b.
**Done when.** 3d, 4b–4d and the indoor test pass; device items recorded (W0-results "v2 pilot").
**Owner inputs.** Pilot tech, adb laptop. **Resume.** The section.

## P5d-1a (×n) — Fleet install of v2, one session per workshop visit

**Entry.** P5c passed; **P6b-2 deployed** (sampler-health read); every roster phone has a P4b, P4r
or retired row.
**Scope.** Per phone present: versionCode check, Drain Report empty, `adb install -r` or
tap-to-update, never uninstall, onboarding step completed, row in
`docs/program/FIELD-VALIDATION.md`. **`T0`** is recorded when the last non-retired phone is on v2.
**Done when (session).** Every present phone's row filled. **Done when (phase).** Every roster
phone is on v2 or retired; `T0` recorded. **Owner inputs.** Techs with phones, adb laptop.
**Resume.** FIELD-VALIDATION.md.

## P5d-1b (×n) — Per-OEM protocol runs (one session per one or two OEMs, within T0 + 48 h)

**Entry.** P5d-1a complete (`T0`). **Scope.** The O-01 protocol steps 1–4 incl. 3b/3c on one phone
per OEM in the roster (the pilot's OEM included), tech on shift, adb attached; rows in
FIELD-VALIDATION.md **with the protocol's start/end time per phone** (P5d-2 excludes those
windows from its metrics, as `--test-window` does for the drain). **Done when.** Every OEM has a
row.

## P5d-2 — 48 h review (one session, at T0 + 48 h with every OEM row present)

**Scope.** Ring telemetry per phone and the P6b-2 sampler-health read over the same days,
**excluding the P5d-1b protocol windows**, against the §4 definitions and thresholds:
`sampler_gap` per on-duty hour; % of real arrivals
(arrival punches with server verdict inside/unknown) with `crossing_recorded`; % of
`geofence_error` re-registered within 15 min; **kill rate** = on-duty hours with a sampler gap
and no foreground service ÷ on-duty hours, per OEM.
**Deliverables.** FIELD-VALIDATION.md: a row per OEM, pass/fail per metric, a named follow-up per
fail. **Done when.** Every OEM has a row; the §1 milestone is marked reached **only if the
thresholds pass**; otherwise the follow-ups become a P5e scope.
**Workflow.** Sonnet tabulates; the session judges.

## P6a — Attendance truth, migration-free (backend + small web; one PR)

**Entry.** P1 merged; P2b-1 merged (the Discard event name is fixed). Merge to `main` any time;
**deployed by the P4c train** (rule 3; its web half rides the train too).
**Scope** — `w2/O-04-design.md` §1(a), code-only list, `O04-F9`; ruling R1:
- The **shared verdict rule** as one pure module + a JSON fixture of test vectors at
  `technician-app/src/shared/contracts/verdict-vectors.json` (bundled by Metro for P5a; read by
  the backend tests by repo-relative path): inside if d + a ≤ r, outside if d − a > r, else
  unknown; 100 m accuracy ceiling; versioned; the job-punch rule unified with it (`O04-F9`,
  `O01-F04`).
- `sampler_state`, `last_ping_at`, `pings_today` on BoardRow (one `DISTINCT ON` query, `O04-F4`);
  open-shift breakdown with `window_end = min(now, first_in + 14 h)`; closed zero-ping day →
  coverage 0 `no_pings`; UNKNOWN interval for all-`None` runs (`O04-F3`).
- Timezone validator and single shop-timezone source (`O04-F8`); web renders `effective_time`
  (`O04-F10`); per-tech **discard count** on the board from the P2b-1 telemetry events
  (`w2/O-06-design.md` item 6).
**Done when.** Gates and CI green; the board shows `sampler_state` for a stopped sampler in a
test; **merged; deploy-train row added** (or deployed per runbook R5, after `T_close`).
**Workflow.** Opus for the rule and derivation; Sonnet web + tests; Opus reviewer.
**Size.** Medium. **Resume.** Branch `feat/attendance-truth-1`.

## P6b-1 — Attendance migration: late flags, adjustments, payroll version and regeneration (backend; one PR; one migration)

**Entry.** P6a merged; P4c done (`T_close`, per-tech drained-row date ranges recorded).
**Scope** — `w2/O-04-design.md` §2, §3:
- `late_sync`/`late_batch` flags **derived retroactively** from `received_at` vs `device_time`
  (`O04-F1`, `O04-F2`, `O04-F5`); punches kept at `device_time` within a 14-day window
  (code default **336 h**; env value confirmed from deep-health in Done-when); payroll exclusion:
  `late_sync` days stay out until an `accept` adjustment exists.
- Adjustments: actor from the principal, `client_id`, `action ∈ {add, replace, void, accept}`,
  `derive` honouring replace/void (`O04-F6`, `O04-F7`/`O6-F10`, `O04-F15`).
- **`payroll_export.version`** + `UNIQUE(shop_id, from_date, to_date, version)` replacing the
  window key (`O04-F11`); regeneration for every window covering the **P4c and P4r** date ranges
  **and** any `late_sync` row received between `T_close` and this deploy, **after a manager
  `accept` pass** (its own W0-results step); regenerated exports get version 2. (A P4r after this
  deploy runs its own accept pass and regeneration.)
- Per-session duty windows (`O04-F13`).
**Done when.** Gates incl. `alembic check` and CI green; deployed per runbook R5; env/default
read back as 336; the accept pass done and regenerated exports listed.
**Workflow.** Opus throughout. **Size.** Large. **Resume.** Branch `feat/attendance-truth-2`.
**Backlog.** `O04-F14`, `O04-F17`, `O6-F12`/`O6-F13` (mock-location in the verdict; billed fuel).

## P6b-2 — Heartbeat index, sampler-health read, dispatcher guard, audit script (backend; one PR; one migration)

**Entry.** P6b-1 merged; P5a merged (the event-names JSON exists).
**Scope.** Heartbeat events mapped to O-04's names from the shared JSON (the backend-side test
that reads `telemetry-events.json` and `verdict-vectors.json` by repo-relative path and fails on
drift); the `app_event` index; a per-tech per-day **sampler-health read** (`O04-F4`;
`w2/O-01-design.md` "Server side"); the
dispatcher's stale-event guard keyed on the event's own time, not insert time (`O10-F7`); the
**audit script** (dry-run, read-only) counting duplicate active fences, `job_payment` rows with
amount ≤ 0 and `recorded_by` orphans (for P13d).
**Done when.** Gates and CI green; deployed per runbook R5; the audit script run on the box and
its output recorded. **Workflow.** Opus. **Size.** Medium. **Resume.** Branch `feat/attendance-truth-3`.

## P7a — Authorization model and money guards (backend; one PR; migration-free)

**Entry.** P1 merged. Deployed by the P4c train or after `T_close`.
**Scope (register).**
- `require_job_actor(job, principal)` (assigned tech or manager) on negotiate, payments,
  completion, transition/abandon, customer pin, notes, messaging send/send-log, media list,
  `complete_upload` (`O05-05`, `O6-F02`/`F03`/`F04`, `O07-F3`, `O05-13`). `GET /api/jobs/{id}` and
  per-job reads: another tech's **claimed** job → 403 regardless; an **unclaimed** job returns the
  full detail when the PII setting is off and a **minimised** JobDetail when it is on (the field
  APK opens unclaimed detail before claiming) (`O05-06`).
- `log_payment`/`void_payment` refuse a closed job with the `(current status: closed)` detail
  (`O04-F16`, `O6-F03`, `O07-F5`); payment `client_id` reuse across job/amount → 409 (`O07-F15`).
- Negotiation below original by the assigned tech is **accepted and flagged** in the negotiate
  `job_event` payload (reason = the optional note; a missing note is flagged, never refused); a
  per-shop cap setting, when set, requires a manager beyond it (`O07-F4`). The persisted reason
  lands in P8b's `job_bill_revision`.
- Tech-scoped `GET /api/jobs`: pagination opt-in via query parameter; **PII minimised until
  claimed — list and detail together — behind a per-shop setting, default off** (P7b-1 turns it
  on; §4).
- `manager_id` from the principal for non-attendance writes (`w2/O-06-design.md` item 4).
**Deliverables.** Code; integration tests per denied path **and** a request replay of the field
APK's own-job flow (open unclaimed detail → claim → negotiate below original **without a note** →
payment → completion → transition) run with the PII setting off **and** on, proving nothing the
APK does is newly refused.
**Done when.** Gates and CI green; merged; deploy-train row added (or deployed, after `T_close`).
**Workflow.** Opus; Sonnet tests; Opus reviewer hunting field flows the checks would break.
**Size.** Medium. **Resume.** Branch `fix/service-layer-authz`. **Backlog.** `O05-15`.

## P7b-1 — Login, lock and session hardening (backend + web login; one PR)

**Entry.** P7a merged; P3c's XFF record; P3b rotation done; **every roster phone has a P4b, P4r or
retired row and is on v2 or retired** (P5d-1a complete) — the v1 login still loads the roster.
**Scope** — G2 §5; `w2/O-05-design.md`:
- Lock keyed per (account, source) with the per-account invariant kept; source =
  `CF-Connecting-IP` when the peer is cloudflared (P3c), else single-hop XFF; an `app_event`/ops
  alert when an account locks (`O05-03`, `O05-04`).
- Roster endpoint **removed**; the **web manager login takes a typed id** (small web change in
  this PR; rides the deploy); the mobile side is P5b.
- `set_pin` requires the current PIN for self-service; `POST /api/auth/logout` bumps
  `token_version`; shorter manager token TTL (`O05-10`).
- The **PII-minimisation setting turned on** on the box and recorded (closes `O05-06`; the only
  phase that turns it on).
**Deliverables.** Code and tests, incl. a spray test showing per-account guesses per day across
N sources do not exceed the per-account ceiling.
**Done when.** Gates and CI green; deployed per runbook R5; setting on.
**Workflow.** Opus; Sonnet for the web login; Opus reviewer. **Size.** Medium.
**Resume.** Branch `fix/auth-lock`.

## P7b-2 — Ops console, media, web dependencies, Cloudflare rules (ops-server + backend + web; one PR)

**Entry.** P3c done. **Scope.** ops-server: per-IP backoff, 16 KB body cap, `OPS_SESSION_SECRET`
required, internal network only, status ignores unconfigured Railway pages (`O05-09`, `O6-F17`,
`O08-F08`, `O08-F09`). Media: reservation caps, length-bounded presign, 413 commit fix,
stale-pending sweep (`O05-12`, `O05-13`, T44-media-1/2). Web: react-router bump (`O05-18`).
Cloudflare rules documented (429 + Retry-After only; `app.`/`ops.` behind Access). **Done when.**
Gates and CI green; backend part: merged; deploy-train row added (or deployed after `T_close`);
the **web part rides the train** before `T_close` (or is cherry-picked as web-only onto
`release/drain-web`); the ops part may deploy any time. **Workflow.** Sonnet; Opus reviews media.
**Resume.** Branch `fix/ops-media-hardening`.

## P8a — Money integrity 1 (backend; one PR; one migration)

**Entry.** P7a merged. **Scope** — `w2/O-06-design.md` items 1–2, `w2/O-07-design.md` part 6:
`job_payment.voided_at`/`voided_by` (FK `NOT VALID` + `VALIDATE` same migration; all-NULL
column) stamped by `void_payment` with a required `reason` (`O6-F08`, `O07-F5`); payment/void
`job_event` payloads `{payment_id, amount_paisa, method, reason}`; optional `captured_at`
trust-windowed (`O07-F7`); **`job_payment.recorded_by` FK added `NOT VALID`** (validated in
P13d after the audit); the historical-void backfill script (dry-run default).
**Done when.** Gates incl. `alembic check`, CI green (a test proves a void stamps `voided_by/at`
and its payload); merged; deploy-train row added (or deployed after `T_close`); the row's
post-deploy check is **read-only**: schema at the new head, the columns present; the next real
void is reviewed by the manager.
**Workflow.** Opus. **Resume.** Branch `feat/money-integrity-1`.

## P8b — Money integrity 2 (backend; one PR; one migration)

**Entry.** P8a merged; the §4 anchor row answered (SMTP relay credentials, **or** "unanchored"
recorded).
**Scope** — `w2/O-06-design.md` items 2, 5:
- Append-only `job_bill_revision` on every **real** completion upsert, negotiate and bill send
  (an idempotent byte-identical replay writes **no** revision; CLAUDE.md bill freeze); reason
  required on manager override and on post-send negotiate from the web (`O6-F09`).
- `attendance/chain.py` generalised: one per-shop chain over `staff_ledger`, `job_payment`
  create/void and `job_bill_revision` (`O6-F07`, `O6-F08`); the migration **backfills** chain
  entries for existing payments with the pinned serialisation (0041 precedent); the verify test
  runs on a DB seeded with pre-existing payments.
- Daily `ledger-chain-verify` scheduler job writing to `app_event` and delivering the head hash
  by a minimal stdlib **`core/mailer.py`** (SMTP relay from `/etc/fixflow`; a fake for tests);
  without credentials the verify output and CLAUDE.md say **"unanchored"**.
**Done when.** Gates and CI green; merged; deploy-train row added (or deployed after `T_close`);
post-deploy check: a **manual verify run** (`docker compose exec backend python -c
"…verify_ledger_chain…"`) delivers one head hash, **or** shows "unanchored" in its output and
CLAUDE.md.
**Workflow.** Opus. **Size.** Large. If long, land revisions + chain first and open **P8b-2**
(Entry: P8b merged; Scope: the verify job and mailer; Done: the head-hash/unanchored check,
merged; deploy-train row added or deployed after `T_close`) — P8b's own Done-when then drops
that check, and **P9a-2's Entry adds "P8b-2 merged"** (the stager calls verify first).
**Resume.** Branch `feat/money-integrity-2`.

## P9a-1 — Accounting slice 1: posting tables, triggers, decision API (backend; one PR; one migration)

**Entry.** P8b merged. **Scope** — `w2/O-07-design.md` parts 1, 2 (decision step), 6: `posting`,
`posting_decision`, `posting_attempt`, `posting_export` with immutability triggers; gapless
commit-ordered `posting.seq` under `pg_advisory_xact_lock`; UUID External IDs (`O07-F11`); the
`accounting` slice and import-linter edges; decision API: approve / reject (typed reason) / bulk
approve with count + sum, 409 on drift; approval resolves `account_code_<role>` settings and is
refused while a role is unmapped; **self-approval flagged, not blocked** by default (ruling R9);
settings keys incl. `account_code_*` (`O07-F14`).
**Deliverables.** Migration, code, real-Postgres trigger and API tests, CLAUDE.md (head, slice
list, invariant "no money feed on the `job_event` cursor", `O07-F6`).
**Done when.** Gates and CI green; fixture postings approve/reject; `UPDATE posting` refused in
real Postgres; merged; deploy-train row added (or deployed after `T_close`). **Workflow.** Opus;
Sonnet tests; Opus reviewer with BACKEND-REQUIREMENTS §3.15. **Size.** Medium-large.
**Resume.** Branch `feat/accounting-1`.

## P9a-2 — Accounting slice 2: stager (backend; one PR)

**Entry.** P9a-1 merged (and P8b-2 if opened); basis, start date, reason codes (§4; defaults
ship; idle without a start date). **Scope** — part 2: the state-based stager (anti-join;
`O07-F1`, `O07-F2`) for all five kinds; calls `verify_ledger_chain` first and refuses to stage on
failure; poison-row skipping; `restage` → new posting at `source_rev + 1`; reversal on void;
accrual close stages an invoice. **Done when.** Gates and CI green; in a test with a start date,
payments and ledger rows stage, a void stages a reversal, an unmapped role refuses approval;
merged; deploy-train row added (or deployed after `T_close`). **Workflow.** Opus.
**Resume.** Branch `feat/accounting-2`. **Backlog.** `O07-F9`.

## P9b — Approval and reconciliation UI (web + backend read API; one PR)

**Entry.** P9a-2 merged. **Scope.** `GET /api/postings/reconciliation` (part 5; **Opus**) and
the web pages: staged queue with per-row reject, bulk approve with count and sum, reconciliation
view with the rejected-sum line first, flagged self-approvals visible; own polling. **Done when.**
Gates green (a test approves a staged posting and the delta moves); merged; deploy-train row
added (or deployed after `T_close`); post-deploy check is **read-only**: the reconciliation GET
returns 200 with zero deltas (the stager is idle until a start date; the live approval check is
P10b's). **Workflow.** Opus endpoint; Sonnet pages. **Resume.** Branch `feat/accounting-ui`.

## P10a — CSV export, transport seam, exports page (backend + web; one PR)

**Entry.** P9a-2 merged; the Odoo version (§4; draft with the current release's labels if
unknown). **Scope** — parts 3, 4 (seam), 7 "build regardless": `run_posting_export` (window on
`decided_at`, advisory lock, record-first, deterministic bytes, sha256, `manifest.json`/`.csv` —
the manifest **carries the `posting_decision` ids** of the batch, ruling R9), acknowledgement
endpoint, signed download URLs; `core/posting_transport.py` Protocol with `CsvExportTransport`
(default) and a fake with tests; attempt log; lag alert (halt/rotation alerts may move to P11);
exports list page; `docs/RUNBOOK-ODOO-IMPORT.md` draft.
**Done when.** Gates and CI green; golden-file test proves deterministic bytes; merged;
deploy-train row added (or deployed after `T_close`).
**Workflow.** Opus; Sonnet runbook + page. **Resume.** Branch `feat/accounting-csv-export`.

## P10b — Odoo import rehearsal (owner session)

**Entry.** P10a and **P9b deployed**; one window's postings approved in the UI; Odoo test company
with chart of accounts and journals; account map set. **Scope.** Export one window; import it
**twice** following the runbook click by click; confirm update-not-duplicate on External ID;
manifest sums equal the import. **Done when.** The double import shows updates. **Resume.** The
runbook.

## P11 — JSON-2 push adapter (optional; Custom plan only)

**Entry.** P10a merged; Custom plan with bot user and API key. **Scope.** `OdooJson2Transport`
behind the Protocol; `erp-push` job (default OFF; ~1 call/s); search-before-create;
`already_present` on retry; key-expiry and halt alerts. **Done when.** A posting round-trips to
the test company and a retry is `already_present`; merged; deploy-train row added (or deployed
after `T_close`). **Workflow.** Opus.

## P12 — Web manager defects (web; one PR)

**Entry.** P3c done. **Scope** (HANDOFF §4.1/§4.4 and W1 S-06; §5 addenda): A3 revenue tile (tech
metrics report); L3 board refresh/polling; the nine bare `catch {}` mutators surface
`serverReason`; token kept on network/5xx failure (`O08-F13`); T44-web-1 (incl. Haul-on-ready),
T44-web-2..4. (A4 is P12a.) **Done when.** Vitest green; manual tile check; web image rebuilt
(on `release/drain-web` before `T_close`, from `main` after) and deployed.
**Workflow.** Sonnet. **Resume.** Branch `fix/web-manager-defects`.

## P13a — DB role split (backend + ops; one PR; one migration)

**Entry.** P4c done (after `T_close`); P7b-2 merged. **Scope.** `fixflow_migrator` /
`fixflow_app` / `fixflow_backup` with `REVOKE` on append-only tables (`O6-F18`); `start.sh`
migrates as the migrator; the owner applies the roles per the runbook. **Done when.** The app role
cannot `UPDATE job_event` in a test; deployed per runbook R5. **Workflow.** Opus. **Resume.**
Branch `feat/db-roles`.

## P13b — Backup encryption, put-only token, retention, first drill (backend + ops; one PR + owner steps)

**Entry.** P13a. **Scope.** `age` encryption to the owner's offline key; a separate bucket/prefix
with a put-only token; lifecycle retention per §4 (`O6-F06`); row-count restore gate; the first
restore drill logged in RUNBOOK-BACKUPS with the monthly drill as a calendar item. **Owner
inputs.** The age key pair; the second bucket/token. **Done when.** A drill restore from an
encrypted dump succeeds. **Resume.** Branch `feat/backup-hardening`.

## P13c — Monitoring upgrade, node:22 images, lock file (ops; one PR) — then P13d as a second PR

**Entry.** P13a. **Scope.** The P3c heartbeat upgraded to the §4 MON_LOC choice with paging
tested; node:22 images; a Python lock file (`O08-F11`); `O08-F10` (R2 endpoint from settings).
Then **P13d** in the same session as a separate PR and deploy: Entry = P8a merged **and the P6b-2
audit script re-run on the box in this session, immediately before the deploy, clean** (fences,
amount ≤ 0, `recorded_by` orphans; remediation recorded if not); Scope = the one-active-fence
partial unique index, `VALIDATE job_payment_amount_positive` (`O07-F8`), `VALIDATE` the
`recorded_by` FK — **each in its own migration file** so one failure cannot block the others.
**Done when.** Monitor pages on a stopped container; images deployed; P13d's `alembic check`
green and deployed with the audit output attached. **Workflow.** Sonnet (P13c), Opus (P13d).
**Resume.** Branches `chore/ops-hardening`, `feat/deferred-validates`.

## P14-n — Expo SDK upgrade, one phase per major; P14-fleet (×n)

**Entry.** P5d-2 passed. **Scope per major.** Upgrade one SDK major; typecheck, Jest, `expo
export`; re-check each P5a/P5b patch against upstream (drop when fixed, else re-apply —
**Opus**); `expo-av` → `expo-audio` when required (re-test the recorder); advisories; `fleet`
build submitted and id recorded. **No `expo-updates`** (ruling R7). **P14-final.** Install on the
pilot (rule 1); the P5c gate re-run (owner inputs: pilot tech, adb laptop). **P14-fleet (×n).**
Per-phone install rows as in P5d-1a, one session per visit. **Done when.** Build green; pilot
without regression; every roster phone on the new versionCode or retired.
**Resume.** Branch `chore/expo-sdk-<n>`.

---

## 4. What the owner decides, and when it blocks

| Decision | Blocks | Default if undecided |
| --- | --- | --- |
| Domain (Cloudflare DNS, multi-year, auto-renew) | P2b-1 (name), P2c, P3a | nothing can ship to phones |
| Destination: box (location, OS, UPS, ISP) or VPS by the target date | P3b | **G2-D1 fallback: small VPS, identical compose, same `api.<domain>`**, by the P4a target date |
| Recovery case a / b / c | P3b | **none** — P3b blocks until P0a item 4 is answered; (a) wins when restorable |
| Highest job ticket number printed for a customer (case c) | P3b | — |
| Fence coordinates and radius (≥ 100 m) | P3b, P5a | P3b blocks |
| `O10-F15`: accept old-secret tokens for the window (K=no & H=yes & v2=no only) | P3b, P4a (the verifier itself is always built in P1, default OFF) | **no**: photograph, retry by hand, declare the loss |
| Geofence thresholds (P5d-2) | P5d-2 verdict | `sampler_gap` < 1 per on-duty hour per phone; ≥ 90 % of real arrivals `crossing_recorded`; ≥ 95 % of `geofence_error` re-registered within 15 min; kill rate < 5 % per OEM |
| Latency threshold (P3c) | P3c | POST p95 < 805 ms (ADR projection) from a field phone; target 150–400 ms |
| Jobs GPS backdate ceiling during the drain | P4a | widened to W like device_time (ruling R2) with the per-job fuel-distance before/after check; back to 48 h at `T_close` |
| Plaintext backups under the app credential until P13b | P3c step 7 | accepted (G2-D2 deviation, `O6-F06`) |
| Odoo plan (external API needs Custom) | P11 only | CSV path (P10) |
| Odoo version | P10a labels, P10b | draft with the current release's labels |
| Pakka record set, basis (cash/accrual), start date, reason codes | P9a-2 going live | stager idle |
| Approver, unit and export cadence | P9a-1 / P10a | the manager; per posting; weekly export |
| Full-fidelity or selective postings | P9a-2 | full-fidelity |
| Tax regime and chart of accounts / journals | P10b | — (P10b blocks) |
| Customer → Odoo partner mapping | P10a | one walk-in partner, no customer PII exported |
| Negotiation below original | P7a | allowed for the assigned tech, **flagged, never required** (the note is optional); manager beyond the cap once set |
| PII minimisation of unclaimed jobs for tech tokens (list and detail) | P7a setting; P7b-1 turns it on | off until v2 is fleet-wide (the list shows addresses techs use before claiming), then on |
| Second approver / self-approval | P9a-1 | flag, do not block (single-manager shop, ruling R9) |
| Chain anchor channel + SMTP relay credentials | P8b | email to the owner via `core/mailer.py`; without credentials the chain is labelled "unanchored" and P8b still completes |
| Error tracking | decided (G2-D2) | Sentry SaaS; P0a confirms the mobile project ingests; a change needs a new APK |
| Dead-man monitor location and paging (MON_LOC) | P3a | external heartbeat service paging the owner by email |
| RPO target; who is on call | P3c, P13b | 24 h; the owner |
| R2 retention and media cap | P13b | dumps 30 days; media uncapped with an alert at 8 GB |
| Second-provider backup copy | P13b | none (recorded) |
| Maintenance window | P3a runbook | outside 02:00–04:00 |
| age key holder | P13b | the owner, private key offline |
| Second uplink, split-horizon DNS, disk encryption | P13c | none |

## 5. Register coverage

Every P0/P1 row of G2 §2 maps to one or more closing phases:

| Register id(s) | Closing phase(s) |
| --- | --- |
| `O01-F01`, `O01-F03`, `O01-F04` (phone), `O01-F05` | P5a (evidence P5c) |
| `O01-F02`, `O01-F06` | P5b |
| `O3-F2` | P2a |
| `O3-F4` | P2b-1 (constant) + P4c (server value) |
| `O10-F1`, `O10-F2` | P2b-1 |
| `O10-F3`, `O10-F4` | P3a (stub modes), P3c step 4 |
| `O10-F7` | P6b-2 (guard), P4c/P4r (re-seed) |
| `O10-F15` | P0a 2/6/11 (secret, v2, decision), P1 (verifier), P3b 2, P4a/P4b/P4r K=no rows |
| `O04-F4` | P6a (fields), P6b-2 (health read) |
| `O6-F01` / `O08-F01` / `O05-01` / `O10-F5` | P1 |
| `O6-F05` / `O05-02` / `O10-F6` | P1 (refusal, policy), P3b (rotation) |
| `O05-03`, `O05-04` | P1 (6-digit policy), P3c (rate rule), P7b-1 (per-source lock, alert) |
| `O05-05` / `O6-F02` / `O6-F03` / `O6-F04` / `O07-F3` | P7a |
| `O05-06` | P7a (code), P5b (APK), P7b-1 (setting on) |
| `O05-07` | P0a 2 and 12; P3c 4; P4c/P4r (stub lifecycle) |
| `O05-14`, `O05-16` | P1 |
| `O08-F02` | P0a 2–3; P3c 7 |
| `O6-F07`, `O6-F08` | P8a, P8b |
| `O07-F1`, `O07-F2` | P9a-2 |
| `O08-F05` / `O08-F14` | P2b-1 |

P2/P3 rows are in the "Backlog" line of the phase owning their file or in the scope that fixes
them (`O3-F1`..`F13`, `O3-F17`, `O3-F18` → P2a/P2b-1; `O01-F07`..`F18` → P5a/P5b; `O04-F1`..
`F3`, `F5`..`F13`, `F15`, `F16` → P1 (`F12`)/P6a/P6b-1/P6b-2/P7a; `O05-08`..`F13`, `O05-15`, `O05-17`,
`O05-18`, `O6-F17`, `O08-F03`/`F04`/`F08`/`F09`/`F13` → P3a/P7a/P0a/P7b-1/P7b-2/P12; `O6-F06`,
`O6-F18` → P13b/P13a; `O6-F09`, `O6-F14`..`F16` → P8b/P2b-1/P6a/P9a-1; `O07-F4`..`F15` →
P7a/P8a/P9a/P10a/P13d; `O08-F06` fixed in the design doc; `O08-F07` → P1; `O08-F10`..`F12` →
P13c/P3a). **Addenda admitted from W1 S-06 and the HANDOFF** (not in G2 §2), with severity:
A4 **P0** (P12a); A3, L3 P2 (P12); L7 = `O3-F18` P3 (P2a); T44-web-1..4 P2/P3 (P12);
T44-media-1..3 P2 (P7b-2; media-3 = `O05-13`); T44-attendance-3 = `O04-F12`.

## 6. Adjudication record

### 6.1 The v1 critique (138 findings; `SHIP-PLAN-2026-11-critique.md`)

**Accepted** (default): every finding not listed. **Narrowed:** FIT-6/EXE-14/FID-15 (a spare
phone cannot log in: P2c proves install + report; the seeded and ordering proofs are P4a's
pilot); FIT-18 (O05-06 kept in P7a behind a setting; the list shows addresses techs use before
claiming — a UX/policy change, not an APK contract break); DEP-10 (the citation check found no
evidence that P7a parks queued writes; the drain-image rule is adopted anyway); DEP-23/CMP-16/
FID-9 (the drain does not wait for P6b; flags are retroactive; regeneration needs
`payroll_export.version`, now in P6b-1); EXE-9 (Appendix B carries drill baselines; exact
commands added); EXE-21 (manager-only below original was unsafe for field flows); CMP-18/FID-24
(T44 ids are W1 S-06 items, now cited with severity); DEP-1/EXE-1/EXE-2/CMP-4 (downgraded by
refuters; P0a now takes the dump the same day with commands); CMP-1/FID-11 (6-digit policy in the
service, refusal of default PINs, rotation of every account); FID-1 (adopted in full).
**Rejected:** none.

### 6.2 The v2 verification (141 findings; `SHIP-PLAN-2026-11-critique-2.md`)

**Accepted** (default), with these structural results: repeatable phases and the window-close
phase P4c (RFIT-1, FIT2-08, FIT2-11, EXE-17-r1); the drain image and the deploy train (CON-1,
FIT2-01, CON-2, CON-3); the complete K=no branch incl. the legacy verifier, the proxy-mode stub,
per-branch Done-whens and per-phone K (RFIT-3, R-DEP-3, CMP-3-R, EXE-3-r1..r3, FID-2-kno,
CON-6..CON-8, NT-7..NT-11); the `preflight-api.` host and the client-IP echo (RFIT-2, R-DEP-4,
EXE-13-r1, CON-4, CON-5, FIT2-04, NT-12, NT-13); runnable P0a (NT-1..NT-6, EXE-2-r1, NT-4); the
service PIN policy (CMP-1-R, CON-11, NT-15); payroll version + regeneration keyed on drained
dates after an accept pass (FID-9-regen, CON-14, FIT2-12); ceilings aligned at 336 h (CMP-15-R,
CON-15); the Docker-gate concurrency rule (RFIT-4, CON-16); P2b split and the audit script's
`--test-window` (FIT2-02, R-DEP-22, FID-3, NT-22, CON-21); compile gates at the end of P5a and
P5b (R-DEP-13, FIT2-09); P8b chain backfill and mailer (FIT2-15, EXE-20-r1, CON-20, FIT2-14); FK
NOT VALID in P8a and the three-part audit (FID-21-fk, R-DEP-12); P12a before P4a (CMP-18-R); the
rest as wording.
**Narrowed:** NT-17 (B5 named so the pruner regex cannot match; wording only); CMP-17-R (an
unclaimed job's detail is minimised, not 403 — adopted, gated by the same setting as the list;
the setting is turned on in **P7b-1 only**, which waits for v2 fleet-wide); FIT2-19 (P13d is a
second PR in the P13c session, not a phase); R-DEP-10 (wording: "citation check").
**Rejected:** none.

### 6.3 The v3 verification (52 findings; `SHIP-PLAN-2026-11-critique-3.md`)

**Accepted** (default), with these results: P5d-1a made repeatable per visit with `T0` at the
last install (RFL3-1, V3R-1); the legacy verifier always built, default OFF, `exp` not enforced
(RFL3-2, V3R-5, CON3-12); the old secret sealed unconditionally in P0a item 2 before the cut-off
(RFL3-7, V3R-3, RC-NT7-order, CON3-18); P4r completed (ranges, snapshot, residue, notice, accept
pass and regeneration, proxy/legacy re-set per session) and P6b-1 regenerating P4c + P4r ranges
and the `T_close`→deploy late rows (RFL3-3, CON3-07, RC-NT23-P4r, CON3-03); the PII setting owned
by P7b-1 only, list and detail gated together (RFL3-4/5/6, CON3-08, CON3-09); P12a after P3b and
the web profile started in P3b, web image from `release/drain` before `T_close` (RFL3-6,
RC-NT18-web, V3R-11, CON3-13); P13d's audit re-run immediately before its deploy (RFL3-8); the
`release/drain` branch procedure, tag ownership, re-cut after a window fix, P4b entry "P4a
passed" and re-run on the next undrained phone (V3R-2, CON3-01, CON3-11); the fuel
snapshot/baseline modes and the runbook's B5 and re-seed commands (V3R-4, CON3-10); R9 extended
to ledger entries and export batches (V3R-7); P8b Entry/Done-when consistent with the
"unanchored" default and the P8b-2 hatch wired into P9a-2 (V3R-8, RC-FIT2-14, CON3-14); graph
edges redrawn from the Entry lines (V3R-9, CON3-19); the money-chain Done-whens in train form
(V3R-10, RC-FIT2-01, CON3-02); Appendix B's `job.token` column fixed in the design doc
(RC-NT14-token); `MSYS_NO_PATHCONV`, exported AWS variables and the laptop copy mount in P0a
(RC-NT1-msys); STOP only on cert mismatch / incompatible update / downgrade (RC-NT11-vc); the
mixed-fleet host mode and the network-cut lift rule (CON3-04); deep-health exposing the values
phases read back plus an image identifier (CON3-05; renamed `FIXFLOW_GIT_SHA` in v5); retired rows, the "last re-open"
definition and P4r's APK (CON3-06); H=no pilot network timing (CON3-16); rule 5 reworded
(RC-NT8-rule5, CON3-17); the hold notice committed as sent in P0a (RC-NT20-notice, CON3-15); the
"R" prefix convention (CON3-20); the event-names JSON shared by both runtimes (CON3-22); USB
debugging on every phone and P7b-1 in the §5 line (CON3-23).
**Narrowed:** CON3-21 (the negotiate note stays optional for good — "flagged, never required" —
rather than becoming required after v2; field discounting must not park a write).
**Rejected:** none.

### 6.4 The v4 delta check (47 findings; `SHIP-PLAN-2026-11-critique-4.md`)

**Accepted** (default), with these results: `release/drain` built by cherry-pick only, its log
recorded and gated before tagging, P3a-2 outside the image (DV4-RB-1, D4-CON3-01-merge, DC4-05,
DC4-16, DV4-RB-4); the web image on `release/drain-web`, P7b-2/P9b/P10a web halves on the
train, the train's last row rebuilding the web image (DV4-RB-2, DV4-RB-3, D4-CON3-13-p7b2,
DC4-11, DC4-22); the deploy-train table created by the first phase that needs it (DC4-04,
D4-CON3-01-table); the train deploying `main` HEAD once with read-only post-deploy checks, a
halt rule and P4c-train (×n) (DC4-06, DC4-07, D4-FIT2-01-checks); the mixed-fleet guard in P4r
and P4b, a K=yes pilot, v2 on a late phone only after P5c, the stub removed and the sealed
secret destroyed at the last P4r (DC4-01, DC4-02, DC4-08, DC4-09, D4-CON3-03-p4r-proxy,
D4-CON3-03-p4r-v2, D4-CON3-03-final, D4-CON3-18-seal, DV4-RB-5); P6a's Done-when in train-or-R5
form and P5c's Entry "P6a deployed" (DC4-03); P6a waiting for P2b-1's Discard event (DC4-12); the
runbook's `-d fixflow`, `mkdir -p /restore`, `exec -T` on the B5 dump with `pg_restore -l` and a
sha256, the three window queries, the fuel snapshot on a bind mount (DC4-10, D4-CON3-10-tty,
D4-CON3-10-json, DC4-18); the proxy-mode stub passing only marker-carrying responses
(D4-CON3-17-marker); `FIXFLOW_BACKUP_ENABLED=false` in the compose (D4-CON3-05-backup, DC4-13);
`FIXFLOW_GIT_SHA` plus `docker inspect` instead of a self-referential digest
(D4-CON3-05-digest); P0a tools first and the Appendix C variables (DC4-14, D4-CON3-23-order,
D4-NT1-appc); P4a (×n until passed) with the APK-side fix path (D4-CON3-11-rerun, DC4-15); the
P8b-2 hatch given an Entry and Done-when (D4-CON3-14-hatch); the contract JSON files under
`technician-app/src/shared/contracts/` with the backend test in P6b-2 (D4-CON3-22-path,
DC4-17); protocol windows excluded from P5d-2 (DC4-19); P12a rotating the key on any change
(DC4-20); graph edges for P0b and the hatches (DC4-21); P11 in train form (DC4-22); `O04-F12`
moved to the P2 paragraph and the 15-min re-check cited to O-01 (DC4-23); R9's ledger-entry
coverage limited to the stager's start date (DV4-RB-6).
**Narrowed:** none. **Rejected:** none.

### 6.5 Rulings

- **R1 — one verdict rule.** Three-state (inside if d + a ≤ r; outside if d − a > r; else
  unknown), 100 m accuracy ceiling, on both sides; the phone prompts on inside **and** unknown.
  Built once in P6a with a published fixture; P5a consumes it (`O01-F04`, `O04-F9`).
- **R2 — jobs GPS ceiling during the drain is widened to W.** Job punches are never rejected:
  out-of-window ones are re-bucketed to `server_now` (`jobs/service.py`), so a 48 h ceiling would
  collapse every drained depart/arrive pair to drain time and derive routes from it — worse for
  billing than landing them at their true `device_time`. The safeguard O-04 wanted (`O6-F13`) is
  `drain_audit.py --snapshot-fuel` at B5 and `--fuel-baseline` at AFTER (fuel is derived on the
  fly, so a `pg_dump` alone is not a baseline); changed closed/billed jobs are listed for the
  manager. Back to 48 h at `T_close`.
- **R3 — no pre-auth roster.** The typed value is the **technician id on the sealed slip**
  (mobile-only in P5b; the backend already logs in by id). The roster endpoint is removed in
  P7b-1 together with a typed-id web manager login, only once every phone is on v2 or retired. A
  request-side "app marker" is forgeable and is not used.
- **R4 — PIN rotation.** Every account is rotated to ≥ 6 digits in P3b with sealed slips handed
  over at E4; the 6-digit policy lives in the service (P1) so the manager's in-app `set_pin`
  cannot reintroduce 4 digits.
- **R5 — the drain image** is the `drain-image` tag cut from `release/drain` (P1 + P2b-2 + P3a,
  nothing else, applied by cherry-pick only), re-cut only for drain-tool fixes; everything else
  deploys via the P4c train or after `T_close`. The web image before `T_close` is built on
  `release/drain-web` (that branch plus web-only commits).
- **R6 — migration numbering.** No pre-assigned numbers; G2-D3's "0047" is not binding; deferred
  VALIDATEs and the fence index are separate migration files in P13d after the audit script has
  been re-run immediately before that deploy.
- **R7 — no `expo-updates`.** It bypasses the once-per-versionCode manifest and rule 1.
- **R8 — no JSON-`detail` fallback** in origin classification: the only backend the phones ever
  reach is P1+, so the fallback could fire only on non-app bodies and park them.
- **R9 — self-approval is flagged, not refused**, by default: with one manager, refusing
  `decided_by = recorded_by` would block every payment the manager recorded. O-06 item 3's "one
  approval table" is realised as: postings → `posting_decision` (from the stager's start date
  every ledger entry becomes a posting the manager decides, so **ledger entries** are covered
  there; manual entries before that date or while the stager is idle have no approval record —
  the P8b chain gives them tamper evidence, and approval begins with the pakka start date);
  advances →
  `advance_request`; bill override reasons → `job_bill_revision`; negotiate flags → the
  negotiate `job_event` payload; **export batches** → `posting_export` whose manifest carries the
  `posting_decision` ids (P10a). The owner may switch to refuse once a second approver exists.
- **R10 — the legacy-secret verifier is always built.** It is inert when unset, so building it
  unconditionally removes a P0a dependency from P1; whether it is ever switched on is the §4
  `O10-F15` decision, and it is never on outside a supervised window.

**Status of verification.** Four passes have run (138 + 141 + 52 + 47 findings); each pass
found mainly second-order effects of the previous pass's fixes, and the fourth found one
blocker (the mixed-fleet proxy guard in P4r), now closed. No further pass is scheduled: the
remaining risk is in execution, which P0a starts. A phase session that finds the plan wrong
records the finding in its W0-results step table and amends this file in the same PR.
