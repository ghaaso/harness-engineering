# FixFlow ship plan — phases sized to one session each (v1 draft, 2026-11-01)

**Status: DRAFT v1 — critiqued, NOT yet revised.** 138 critic findings are in
`SHIP-PLAN-2026-11-critique.md` (3 blockers stand: design notes now copied to `w2/`; the
old-hostname K/H rule; the missing K=no drain branch). The next session writes v2 from that
file; do not execute any phase from this v1. The W2 design notes every phase cites live in
`docs/program/w2/`.

Built on `G2-deep-dive-gate-2026-11-01.md` (the verified register and the three decisions),
`G1-discovery-gate-2026-11-01.md`, and the method in `docs/ORCHESTRATION-DESIGN-2026-10.md`.
Every phase below is scoped so that **one uninterrupted session delivers it end to end**: a
named branch, one PR (or one runbook for an operations phase), explicit entry conditions,
explicit done criteria, and a resume note so a session that is cut short loses an hour, not
the phase. Phases reference register ids (`O01-F04`, `O3-F2`, …) so a future session can go
straight from this file to the evidence.

## 0. How to read and run this plan

- **Sessions.** Each phase is one session. Start by reading this file's phase section and the
  register ids it names; end by ticking the checklist in §3 and committing the tick in the
  same PR. Do not start a second phase in the same session.
- **Routing (from the design doc §3).** Sonnet implements well-specified changes and writes
  pure-module tests; Opus owns anything that touches the outbox contract, the job lifecycle,
  the ledger/chain, auth/PIN/JWT, migrations, or the location-privacy time bounds; Opus
  reviews every PR with a refute-by-default brief before it opens; Haiku does extractions
  (call-site lists, constants). The main session (Fable) briefs, gates and judges, and never
  implements.
- **Gates.** Backend gates run in Docker (design Appendix A; Docker Desktop must be up); web
  and mobile gates run natively (all pass today on Node 24). A phase is not done until its
  gates are green locally **and** CI is green on the PR.
- **Two standing rules.** Nothing ships to a phone before the drain protocol (P4) has run on
  it. Nothing is claimed about field reliability without device evidence (P5c).

## 1. Milestones against the five goals

| Goal | Reached at | Phases |
| --- | --- | --- |
| Production back, on infrastructure the owner controls, with no fleet data lost | end of P4 | P0, P1, P2a, P2b, P3, P4 |
| Geofencing, pings and travel behave as designed in the field | end of P5c | P5a, P5b, P5c, P6 |
| No security holes for a shipped system | end of P7b (gate items in P1) | P1, P7a, P7b, P13 |
| Latency acceptable | measured in P3/P4 (D1: co-located box) | P3, P4 |
| Kacha khata → manager-approved pakka khata → Odoo | end of P10 (P11 only on a Custom plan) | P7a, P8, P9a, P9b, P10, P11 |
| Self-hosting durable, not just running | end of P13 | P13 |

## 2. Dependency order

```
P0 owner pre-flight ──────────────────────────────┐
P1 backend boot gate ──► P3 box + restore ──► P4 drain ──► P5c field protocol (pilot phone)
P2a engine fixes ──► P2b drain tooling + fleet APK v1 ──┘        │
                                                                  ▼
P6 backend truth ◄──────────────── (parallel after P1) ──► P5a geofence fixes (APK v2) ──► P5b ──► P5c fleet validation
P7a authorization + money guards ──► P8 money integrity ──► P9a accounting slice ──► P9b approvals UI ──► P10 CSV export ──► P11 JSON-2 (optional)
P7b auth / lock / ops / media hardening ──► P13 self-host hardening 2
P12 web manager fixes (any time after P6)        P14 SDK upgrade (last)
```

P0 runs in parallel with P1–P2a; P3 cannot start before P0 delivers a domain and a box;
P2b cannot *build* the APK before the domain exists (its code can land earlier).

## 3. Phase checklist (tick in the PR that completes the phase)

- [ ] P0 — Owner pre-flight and decisions
- [ ] P1 — Backend first-boot gate and origin marker
- [ ] P2a — Offline engine honesty (mobile)
- [ ] P2b — Drain tooling and the fleet APK v1
- [ ] P3 — Self-host stack, restore, cutover
- [ ] P4 — Fleet drain (pilot, then fleet)
- [ ] P5a — Geofence and sampler fixes (APK v2)
- [ ] P5b — Permissions, OEM onboarding, Expo patches
- [ ] P5c — Field validation across OEMs
- [ ] P6 — Backend truth and dead-sampler visibility
- [ ] P7a — Authorization model and money guards
- [ ] P7b — Auth, lock, ops and media hardening
- [ ] P8 — Money integrity (void attribution, bill history, chain anchor)
- [ ] P9a — Accounting slice: postings, stager, decisions
- [ ] P9b — Approval and reconciliation UI
- [ ] P10 — CSV export to Odoo and import rehearsal
- [ ] P11 — JSON-2 push adapter (Custom plan only)
- [ ] P12 — Web manager defects
- [ ] P13 — Self-host hardening 2
- [ ] P14 — Expo SDK and dependency upgrade

---

## P0 — Owner pre-flight and decisions (owner session, no code)

**Goal.** Settle every fact the program branches on, and start the two clocks that cannot
wait: the Supabase restore deadline and the fleet notice.
**Entry.** None.
**Scope.** Design doc §4.0 items 1–10 and the G1 §5 owner-decision form; G2 §3 open risks
that W0 settles.
**Deliverables.** `docs/program/W0-results.md` with: fleet notice sent (date); Supabase status,
pause date, deadline, Postgres major; R2 `backups/db/` newest key; Railway project state and
whether the old subdomain can be bound; EAS build list with the installed build's commit,
versionCode and signing-cert SHA-256, and whether that keystore is still in EAS credentials;
backend Sentry last event; the workshop's coordinates; Docker Desktop running; the chosen
**domain** (on Cloudflare DNS, multi-year, auto-renew); the **box** (location, OS, UPS, ISP,
CGNAT test); the Odoo plan and the pakka record set; the owner's answers to the rest of the
form.
**Done when.** Every line in the file has a value or an explicit "unknown, because …".
**Verification.** None beyond the file; it is input.
**Owner inputs.** This phase *is* the owner inputs.
**Workflow.** None. If the owner wants help interpreting a dashboard, a Sonnet chat suffices.
**Resume.** The file is the state.

## P1 — Backend first-boot gate and origin marker (backend; one PR; migration-free)

**Goal.** Make the first self-hosted boot safe, and give every response the marker the phones
will use to tell "the app said no" from "something in the way said no".
**Entry.** Docker Desktop up (Appendix A gates).
**Scope (register).** D1 dev-secret fail-open (O6-F01/O08-F01/O05-01/O10-F5); the blank-secret
gap; D2 seed PINs (O6-F05) via a deep-health "default PIN active" check plus
`backend/scripts/set_pin.py`; `/docs`, `/redoc`, `/openapi.json` off in production (O6-F19);
body caps on login and the webhook (O05-14); `X-FixFlow-Api: 1` on every response including
unknown-route 404s (O-03 design step 1, in `core/request_id.py`); ping backdate ceiling default
48 → 240 (O04-F12, G2 ruling); `FIXFLOW_ATTENDANCE_*`/`FIXFLOW_JOBS_GPS_*` documented as the
drain-mode knobs; `/api/ops/health` as the documented healthcheck target (O08-F07).
**Deliverables.** Code + unit tests for: boot refuses the dev default, a blank secret and a
secret under 32 bytes unless `FIXFLOW_ENVIRONMENT` is explicitly `dev`/`test`; default-PIN
check; docs gating; body caps; the marker header (integration test asserts it on a 404);
`set_pin.py` (dry-run default). CLAUDE.md security section updated.
**Done when.** Backend gates green in Docker and CI; a manual boot with no env fails closed.
**Verification.** Appendix A recipe; the new tests; `curl -i` on an unknown path shows the
marker.
**Owner inputs.** None.
**Workflow.** Opus implements (auth-adjacent); Sonnet writes the tests from the brief; Opus
reviewer with the G2 §1.1 claims as its refute list.
**Size.** Medium. **Resume.** Branch `fix/backend-first-boot-gate`; the PR checklist mirrors
the scope list.

## P2a — Offline engine honesty (mobile; one PR; no build)

**Goal.** Make the engine's contract true under a dead, reviving, or flaky backend.
**Entry.** P1 merged (the marker header exists), or the client treats a JSON `detail` body as
the app signature for older backends.
**Scope (register).** O-03 design steps 1–5 and 9: origin-aware classification (edge 404,
Cloudflare 403/502/530, captive pages are connectivity: no park, no drop, no count); 5xx
counts toward the cap only with the marker (O3-F6); `sendOrQueue` keeps the write on non-app
errors and on 401 (O3-F1, O3-F8); `clearSession()` on every 401 and privacy gates that need a
token (O3-F7); duty truth from live punches only (O3-F2, O3-F3); `drainAll(techId)` on mount,
`active`, connected, and after login, in a fixed order (O3-F9); corrupt-store preservation
(O3-F17); the engine status banner (O3-F14).
**Deliverables.** Code and the pure-module Jest tests named in the O-03 design for each step.
**Done when.** `npm run typecheck && npm test` green; every new test fails on `main` and
passes on the branch (prove it in the PR).
**Verification.** Jest only (no screen harness); the device proof comes in P4.
**Owner inputs.** None.
**Workflow.** Opus implements (outbox contract, privacy gates); Sonnet writes tests from the
design's test list; Opus reviewer briefed with CLAUDE.md's outbox invariants.
**Size.** Large but single-threaded; if it runs long, land steps 1–4 and leave 5/9/banner for
P2b. **Resume.** Branch `fix/mobile-engine-honesty`; the O-03 design's numbered list is the
checklist.

## P2b — Drain tooling and the fleet APK v1 (mobile + EAS; one PR + one build)

**Goal.** The APK that can be installed over the field build and prove it lost nothing.
**Entry.** P2a merged; the domain known (P0); the installed build's keystore and versionCode
known (P0).
**Scope (register).** O-10 design D1–D7: the `fleet` EAS profile (APK, owned domain, real DSN,
versionCode above the field value); the manifest snapshot at bundle load with a gate every sync
awaits (O10-F1); the Drain Report screen; manifest upload via `POST /api/events`; the one-time
un-park migration keyed on edge reasons (O10-F2); retry advice for stale rows (O3-F4); Discard
copy that distinguishes "server refused" from "could not reach" (O3-F13); pending-media
retry/discard and the needs-attention list (O3-F5, O3-F12); `backend/scripts/drain_audit.py`
(dry-run, read-only) that compares a manifest with server rows.
**Deliverables.** Code, tests (`manifest.test`, `unpark.test`, `drainAll.test`), the audit
script, and a **built APK** whose bundle is grepped for the owned domain and `jobs.outbox.v2`.
**Done when.** Gates green; the APK installs over a copy of the field build on one test phone
(same package, same signature) and shows the Drain Report with BEFORE counts.
**Verification.** `expo export` + the bundle grep; `apksigner verify --print-certs` matches
the field cert; an install-over test on a phone with seeded queues.
**Owner inputs.** Domain; EAS access; the field build's cert.
**Workflow.** Opus for the manifest gate and un-park migration; Sonnet for screens and the
audit script; Opus reviewer. The build itself is an owner/agent action on EAS.
**Size.** Large; the build wait (EAS free queue) is wall-clock, not work. **Resume.** Branch
`feat/fleet-drain-tooling`; a build in progress is resumed by `eas build:list`.

## P3 — Self-host stack, restore, cutover (operations + small repo additions; one session)

**Goal.** A backend answering on `api.<domain>` with the recovered data, and nothing else
reachable.
**Entry.** P0 delivered domain, box (Linux, UPS), ISP facts, recovery case; P1 merged.
**Scope (register).** O-08 design §1–§4 and the D2 decision: `docker-compose.prod.yml`
(Postgres 17, backend, Caddy web, cloudflared with a 503 catch-all, no published ports),
root-owned env files with `FIXFLOW_ENVIRONMENT=production` and a generated secret, archive of
every pre-death dump to a prefix the pruner never lists **before** the first scheduler run
(O08-F02), new `FIXFLOW_BACKUP_PREFIX`, restore per recovery case into Postgres 17 (Appendix C
with the schema drop), the Appendix B verification gate including the three sequences, the
fence row set from P0, every PIN rotated via `set_pin.py` before the tunnel route opens,
dispatcher off, smoke on localhost then through the tunnel, latency `curl` run from a field
phone with `cf-ray`, `docs/RUNBOOK-SELFHOST.md`.
**Deliverables.** The compose file and Caddy/cloudflared configs in the repo (no secrets); the
runbook; a W3 results section in `W0-results.md` with the gate outputs and the measured
latency.
**Done when.** `/api/ops/health` green with `jwt_secret_overridden`; Appendix B counts match
the dump; login works through the tunnel; the old hostname is hanging/proxying or documented as
uncontrollable; no port is published on the box.
**Verification.** The Appendix B queries; `docker ps --format '{{.Ports}}'` shows no publish;
`curl -i` a bogus hostname on the tunnel returns 503.
**Owner inputs.** Box access, Cloudflare account, R2 keys, FCM service account, Sentry DSN.
**Workflow.** Sonnet drafts configs from the O-08 design; Opus reviews the compose and the
restore gate against O08-F01/F02/F07; the operator (owner, with the session guiding) runs it.
**Size.** Medium if the box is ready; a whole session if the restore case is (a) with a
Supabase dump to take. **Resume.** The runbook's numbered steps; the source of truth stays
untouched until sign-off.

## P4 — Fleet drain, pilot then fleet (operations; one session for the pilot)

**Goal.** Every phone's queued data in the recovered database with proof, and the phones
released.
**Entry.** P2b APK built and verified; P3 done; drain window settings staged (O-10 B4).
**Scope.** O-10 design steps B4–F exactly, on one pilot phone first; the O-01 field protocol
(55 min) runs on the pilot phone **before** its update, while adb is attached — this is the
only chance to observe the field build.
**Deliverables.** Per-phone BEFORE photos, manifest receipt, AFTER audit output; the field
protocol's logcat captures and findings appended to `W0-results.md`; window close record
(`T_open`, `T_close`, the late-sync audit query result); dispatcher cursor re-seeded.
**Done when.** Pilot AFTER matches the manifest; then each roster phone; the window is closed
and ceilings restored; parked residue is transcribed by the manager (cash first).
**Verification.** `drain_audit.py` per phone; server row deltas since `T_open`.
**Owner inputs.** Techs present with phones; the manager for residue entry.
**Workflow.** The session guides the operator; no code. A Sonnet agent can read logcat
captures and tabulate the protocol's outcomes.
**Size.** Pilot fits a session; the rest is owner-run over days with a dated deadline.
**Resume.** Rule R2: forward-only after the first drain; the manifest archive is the replay.

## P5a — Geofence and sampler fixes, APK v2 (mobile; one PR + one build)

**Goal.** The arrival prompt fires for real arrivals, the sampler keeps its foreground
service, and a lost fence repairs itself.
**Entry.** P4 drained the fleet (never ship a second APK into undrained queues); the field
protocol's ranking from P4.
**Scope (register).** O-01 fix order 1–4 and 7: record-first with bounded GPS reads and a local
duty check, stamp after enqueue (O01-F05, F10, F16, F18); the shared overlap verdict rule with
test vectors against `derive.geofence_flags` (O01-F04); FGS re-arm on `active` within the 14 h
/ 4 h bounds by dropping the `isRunning()` early return (O01-F01) plus the sampler-gap notice;
error-branch re-register, provider banner, periodic re-check (O01-F03); awaited syncs and
foreground drains for pings and presence (O01-F08); every fix in a batched delivery (O01-F13);
the diagnostics ring and telemetry events (O-01 design "in-app logging").
**Deliverables.** Code, Jest tests per fix, the `fleet` build v2.
**Done when.** Gates green; on the pilot phone the step-3/step-4 protocol tests now pass
(FGS present after reopen; a toggle re-registers the fence; an indoor arrival notifies).
**Verification.** The O-01 protocol steps 3–4 repeated on the pilot phone with adb.
**Owner inputs.** The fence radius raised to ≥ 100 m in the manager web (O01-F04 step 3).
**Workflow.** Opus implements (privacy time bounds, headless paths); Sonnet tests; Opus
reviewer briefed with CLAUDE.md's location invariants.
**Size.** Large; if long, ship fixes 1–3 and move 4/7 to P5b. **Resume.** Branch
`fix/mobile-geofence-v2`; O-01's fix-order list is the checklist.

## P5b — Permissions, OEM onboarding, Expo patches (mobile; one PR + one build)

**Goal.** The phone keeps the grants and the process the feature depends on, and the known
Expo defects are patched in our build.
**Entry.** P5a merged.
**Scope (register).** O01-F06/F07 (background and precise-location banners with one-tap
re-request, hibernation exemption intent); O01-F02 (manufacturer-specific onboarding step and
ClockScreen re-offer: autostart, app battery saver, lock in recents, with a self-attested
checklist in telemetry); patch-package for expo-task-manager/expo-location: #49424 guard,
#52230 stop fallback, the untracked second event (O01-F09), the shared static timestamp
(O01-F12), #50060 (O01-F14), optional network constraint on task jobs (O01-F17); cleanups
O01-F11 (re-add only when parameters differ) and the duplicate channel helper.
**Deliverables.** Code, patches under `technician-app/patches/`, tests where pure, build v3.
**Done when.** Gates green; a native compile succeeds (EAS build — `expo export` proves
nothing about patches); on one phone per OEM the onboarding step opens the right screen.
**Verification.** EAS build success; manual OEM screen check on the fleet's models.
**Owner inputs.** The fleet's phone models and ROM versions.
**Workflow.** Opus for the native patches; Sonnet for onboarding screens; Opus reviewer.
**Size.** Medium. **Resume.** Branch `fix/mobile-permissions-oem`.

## P5c — Field validation across OEMs (operations; one session)

**Goal.** Device evidence that the fixes hold on every OEM in the fleet, not on one phone.
**Entry.** P5b build installed fleet-wide (through the normal in-place update, queues drained).
**Scope.** For one phone per manufacturer: the O-01 protocol steps 1–4; a 48-hour diagnostics
ring review (`sampler_gap`, `geofence_error`, `notify_suppressed` counts); the server-side
sampler state (P6) over the same days.
**Deliverables.** `docs/program/FIELD-VALIDATION-<date>.md`: per-OEM pass/fail per hypothesis,
residual kill rate, what remains OEM-specific.
**Done when.** Each OEM has a row; any fail has a named follow-up in the register.
**Workflow.** A Sonnet agent tabulates logcat and telemetry; the session judges.
**Size.** One session plus the 48 h wait. **Resume.** The validation file.

## P6 — Backend truth and dead-sampler visibility (backend + small web; one PR; migration 0047)

**Goal.** The manager can tell a dead phone from a quiet day, and late data lands on the right
day with an honest flag.
**Entry.** P1 merged. Can run in parallel with P2.
**Scope (register).** O-04 design: `sampler_state`, `last_ping_at`, `pings_today` on BoardRow
from one `DISTINCT ON` query (O04-F4); open-shift breakdown with `window_end = min(now,
first_in + 14 h)`; closed zero-ping day → coverage 0 with `no_pings`; UNKNOWN interval for
all-`None` runs (O04-F3); `late_sync` and `late_batch` flags (O04-F1/F2); punches kept at
device_time within a 14-day window instead of re-bucketed (O04-F1), with the drain horizon
still env-tunable; three-state server inside rule with the ceiling lowered to 100 m, versioned
(O04-F9); timezone validator and a single shop-timezone source (O04-F8); adjustment actor from
the principal, `client_id`, and `action ∈ {add, replace, void, accept}` with derive honouring
replace/void (O04-F6, F7, F15 — **migration 0047**); web renders `effective_time` (O04-F10);
per-session duty windows (O04-F13).
**Deliverables.** Code, pytest including real-Postgres integration tests for the window and
the dead-sampler fields, web change, migration 0047 with the CHECK shipped NOT VALID then
VALIDATEd in the same migration (default fills every row), CLAUDE.md head → 0047.
**Done when.** Gates green incl. `alembic check`; the board shows `sampler_state` for a tech
whose sampler is stopped in a test.
**Workflow.** Opus implements (attendance derivation and the migration); Sonnet for the web
change and tests; Opus reviewer with O04 claims as the refute list.
**Size.** Large; if long, defer payroll regeneration (O04-F11) and the one-active-fence index
to P13. **Resume.** Branch `feat/attendance-truth-0047`.

## P7a — Authorization model and money guards (backend; one PR; migration-free)

**Goal.** A technician token can act only on its own jobs; money-changing actions respect
close and freeze; the flat-authz family is closed at the service layer.
**Entry.** P1 merged. Can run in parallel with P5.
**Scope (register).** One `require_job_actor(job, principal)` helper (assigned tech or
manager) applied to negotiate, payments, completion, transition/abandon, customer pin, notes,
messaging send/send-log, media list and complete_upload (O05-05, O6-F02/F03/F04, O07-F3,
O05-13); `log_payment`/`void_payment` refuse a closed job with the `(current status: closed)`
detail (O04-F16, O6-F03, O07-F5); negotiation below original requires a manager or a
per-shop cap setting (O07-F4); payment `client_id` reuse across job/amount → 409 (O07-F15);
tech-scoped `GET /api/jobs` with PII minimised until claimed, plus pagination (O05-06);
`manager_id` from the principal everywhere (O6-F10).
**Deliverables.** Code and integration tests for each denied path **and** each allowed path
(the deployed APK's flows: claim pool visibility, own-job negotiate below cap).
**Done when.** Gates green; the mobile app against a local backend still completes an
own-job flow end to end (manual smoke).
**Owner inputs.** The discount cap value (a setting; ships unset = manager only).
**Workflow.** Opus implements; Sonnet tests; Opus reviewer briefed to look for flows the
field APK uses that the new checks would break.
**Size.** Medium. **Resume.** Branch `fix/service-layer-authz`.

## P7b — Auth, lock, ops and media hardening (backend + ops-server + web infra; one PR)

**Goal.** Close the remaining external-attacker items that do not need the owner's product
decisions.
**Entry.** P1 and P3 merged (Cloudflare in the path).
**Scope (register).** Lock keyed per (account, source) with the CLAUDE.md invariant kept; a
Cloudflare rate rule on `/api/auth/login`; roster endpoint requires the app marker or is
reduced to names (O05-03/F04); 6-digit technician PINs on the next `set_pin`; `set_pin`
requires the current PIN for self-service; `POST /api/auth/logout` bumping `token_version` for
web sessions; shorter manager token TTL (O05-10); ops-server per-IP backoff, 16 KB body cap,
`OPS_SESSION_SECRET` required, bind to the internal network (O05-09, O6-F17, O08-F08, O08-F09);
media reservation caps, length-bounded presign, 413 commit fix, stale-pending sweep (O05-12,
T44-media-1/2); react-router bump (O05-18); Caddy CSP/headers already in P3 — verify.
**Deliverables.** Code and tests; Cloudflare rules documented in the self-host runbook.
**Done when.** Gates green; a spray test against a local backend shows the per-source lock and
the owner can still log in from a known device.
**Workflow.** Opus implements auth/lock; Sonnet for ops-server and media; Opus reviewer.
**Size.** Medium. **Resume.** Branch `fix/auth-lock-ops-media`.

## P8 — Money integrity (backend; one PR; migration 0048)

**Goal.** Every money change is attributable and reconstructible before anything flows to
Odoo.
**Entry.** P7a merged.
**Scope (register).** `job_payment.voided_at`/`voided_by` (FK NOT VALID + VALIDATE in the same
migration, all-NULL column) and `void_payment` stamping them (O6-F08, O07-F5); payment and void
`job_event` payloads `{payment_id, amount_paisa, method}` (O6-F08); append-only
`job_bill_revision` written on every completion upsert, negotiate and bill send, with a
required reason on manager override (O6-F09); optional `captured_at` on payments,
trust-windowed (O07-F7); a daily `ledger-chain-verify` scheduler job writing to `app_event`
and anchoring the head hash out of band (O6-F07) — the anchor channel is an owner choice
(email, WhatsApp to the owner, or a locked object under another account); the backfill
script for historical voids (dry-run default).
**Deliverables.** Migration 0048, code, tests, script, CLAUDE.md head → 0048.
**Done when.** Gates green; a void shows `voided_by/at` and its event payload; the chain job
runs in a test scheduler.
**Owner inputs.** The anchor channel.
**Workflow.** Opus throughout (ledger/chain); Opus reviewer.
**Size.** Medium. **Resume.** Branch `feat/money-integrity-0048`.

## P9a — Accounting slice: postings, stager, decisions (backend; one PR; migration 0049)

**Goal.** The approval boundary exists: immutable posting snapshots, append-only decisions
and attempts, a state-based stager that is idle until a start date.
**Entry.** P8 merged; the owner's answers on basis (cash vs accrual), start date and the
reason-code vocabulary (defaults ship if absent; the stager stays idle).
**Scope.** O-07 design parts 1, 2 and 6: `posting`, `posting_decision`, `posting_attempt`,
`posting_export` tables with immutability triggers (0049); UUID-based External IDs
(O07-F11); the stager job with poison-row skipping (O07-F8); the decision API (approve /
reject with typed reason / bulk approve with count+sum returning 409 on drift); the settings
keys (O07-F14); import-linter edges `accounting → jobs.service`, `accounting →
attendance.service`.
**Deliverables.** The new slice with `router → service → repository`, tests incl.
real-Postgres tests of the immutability triggers and the anti-join stager, migration 0049,
CLAUDE.md (head, slice list, invariants: "no money on the `job_event` cursor").
**Done when.** Gates green; with a start date set in a test, payments and ledger rows stage,
approve, and a reversal stages on void.
**Workflow.** Opus implements (money invariants); Sonnet tests from the design; Opus
reviewer briefed with BACKEND-REQUIREMENTS §3.15 constraints.
**Size.** Large; if long, land tables + stager and leave the decision API to P9b. **Resume.**
Branch `feat/accounting-postings-0049`.

## P9b — Approval and reconciliation UI (web + backend read API; one PR)

**Goal.** The manager approves or rejects postings and sees the delta between the cash book
and the formal books.
**Entry.** P9a merged.
**Scope.** O-07 design part 5 (`GET /api/postings/reconciliation`) and the web pages: staged
queue with per-row reject (typed reason), bulk approve with count and sum confirmation,
exports list, the reconciliation view with the rejected-sum line first; L3 board refresh
pattern reused for the queue.
**Deliverables.** Backend read endpoints and web pages with Vitest coverage.
**Done when.** Gates green; a staged posting can be approved and the reconciliation delta
moves accordingly in a local run.
**Workflow.** Sonnet implements (read models, UI); Opus reviews the money arithmetic.
**Size.** Medium. **Resume.** Branch `feat/accounting-ui`.

## P10 — CSV export to Odoo and the import rehearsal (backend + owner session; one PR)

**Goal.** Approved postings leave the app as a window-keyed CSV that Odoo's importer dedupes
on External ID, and the owner has imported it once into the test company.
**Entry.** P9a merged; the Odoo test company's chart of accounts and journals (owner).
**Scope.** O-07 design part 3: `run_posting_export` (window on `decided_at`, advisory lock,
record-first, deterministic bytes, sha256, separate `manifest.json`/`manifest.csv`), the
acknowledgement endpoint, signed download URLs, the role → account-code settings;
the owner imports one export twice into the test company and confirms update-not-duplicate.
**Deliverables.** Code, tests, `docs/RUNBOOK-ODOO-IMPORT.md` with the column labels verified
against the owner's Odoo version.
**Done when.** The double-import rehearsal shows updates, not duplicates, and the manifest
sums match the import.
**Owner inputs.** Odoo access to the test company; the account map.
**Workflow.** Opus implements; Sonnet writes the runbook; Opus reviewer.
**Size.** Medium. **Resume.** Branch `feat/accounting-csv-export`.

## P11 — JSON-2 push adapter (optional; only on a Custom plan)

**Goal.** Live push behind the Protocol, at one call per second, idempotent on External ID.
**Entry.** The owner is on the Custom plan with a bot user and API key.
**Scope.** O-07 design part 4: `core/posting_transport.py` async Protocol, `OdooJson2Transport`,
the `erp-push` scheduler job (default OFF), search-before-create, halting rules, key-expiry and
lag alerts.
**Done when.** Against the test company, a posting round-trips and a retry is
`already_present`.
**Workflow.** Opus. **Size.** Medium. **Resume.** Branch `feat/odoo-json2-transport`.

## P12 — Web manager defects (web; one PR)

**Goal.** The manager board tells the truth.
**Entry.** P6 merged.
**Scope (register).** A3 revenue tile (use the tech-metrics report); A4 payment idempotency
key lifecycle (`PaymentModal`, rotate on success only); L3 board refresh/polling; nine bare
`catch {}` mutators surface `serverReason`; token kept on network/5xx failure (O08-F13); L7
wording; T44-web-2..4.
**Done when.** Vitest green; manual check of the dashboard tile and a retried payment.
**Workflow.** Sonnet implements; Opus reviews A4 (money). **Size.** Medium. **Resume.**
Branch `fix/web-manager-defects`.

## P13 — Self-host hardening 2 (backend + ops; one PR + runbook; migration 0050)

**Goal.** The box survives its operator, its disk and its power.
**Entry.** P3 and P7b done; a month of stable running is nice but not required.
**Scope (register).** DB role split `fixflow_migrator` / `fixflow_app` / `fixflow_backup` with
REVOKE on append-only tables (O6-F18; 0050 + `start.sh`); backup encryption with `age`,
separate bucket or prefix with a put-only token, lifecycle retention (O6-F06); dead-man
monitor off-box and a row-count restore gate; monthly restore drill logged in
RUNBOOK-BACKUPS; node:22 images, a Python lock file, CI on Postgres 17 (O08-F11/F12);
one-active-fence partial unique index after an audit (O04 design 0049-equivalent); payroll
export regeneration (O04-F11) if not done.
**Done when.** The app role cannot `UPDATE job_event` in a test; a drill restore from an
encrypted dump succeeds; the monitor pages on a stopped container.
**Workflow.** Opus for roles and migration; Sonnet for infra files; Opus reviewer.
**Size.** Large; split roles/backups from monitor/drill if needed. **Resume.** Branch
`feat/selfhost-hardening-0050`.

## P14 — Expo SDK and dependency upgrade (mobile; one PR + build; last)

**Goal.** Current SDK, the build-tool advisories gone, optional `expo-updates` so JS fixes skip
the EAS queue.
**Entry.** Field stability confirmed (P5c).
**Scope.** SDK 52 → current; re-apply or drop the P5b patches as upstream fixes land;
`expo-av` → `expo-audio` (the known recorder defect is version-specific — re-test);
advisories; `expo-updates` decision.
**Done when.** EAS build green; the P5c protocol re-run on one phone shows no regression.
**Workflow.** Sonnet upgrades; Opus reviews native-affecting changes. **Size.** Large.
**Resume.** Branch `chore/expo-sdk-upgrade`.

---

## 4. What the owner decides, and when it blocks

| Decision | Blocks | Default if undecided |
| --- | --- | --- |
| Domain | P2b build, P3 | nothing can ship to phones |
| Box, OS, UPS, ISP | P3 | — |
| Recovery case | P3 restore path | case (b) R2 dump if it exists |
| Fence coordinates and radius ≥ 100 m | P3 data step, P5a | P3 blocks |
| Odoo plan | P11 only | CSV path (P10) |
| Pakka record set, basis, start date, reason codes | P9a going live (not being built) | stager idle |
| Discount cap | P7a setting | manager-only below original |
| Chain anchor channel | P8 | app_event only |
| Error tracking: Sentry vs GlitchTip | P13 | Sentry SaaS |
| Second uplink, split-horizon DNS | P13 | none |

## 5. Register coverage

Every P0/P1 item in G2 §2 appears in exactly one phase above: A (P5a/P5b), B (P2a/P2b/P4),
C (P6), D (P1/P7a/P7b/P8/P13), E (P7a/P8/P9a/P9b/P10/P11), F (P3/P13). P2/P3 items are listed
in the phase that touches their file; anything not named here stays in the register as
backlog for the session that next opens that file.
