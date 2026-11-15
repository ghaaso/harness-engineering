# CLAUDE.md — ground truth for AI agents

**Read this first, and trust it over prose docs.** The long-form docs
(`ARCHITECTURE.md`, `docs/*`) explain the _why_ but drift over time. This file is the
**authoritative, current statement of what the stack actually is**. When this file and a
prose doc disagree, this file + the code win — and you should fix the prose doc (see
"Keeping this file honest" at the bottom).

> This file exists because agents (and humans) kept assuming a generic template —
> WatermelonDB, Supabase-native, GoTrue — none of which this project uses. Don't.

---

## What FixFlow is

A workshop management system for a home-appliance repair shop (Karachi). A **modular
monolith** in one monorepo, delivered as **three runtimes** that share a vertical-slice
layout (the same capability is a same-named folder in each runtime).

---

## The actual stack (verify before assuming anything else)

| Area                                              | Reality                                                                                                                                                       | Not                                                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Web manager** (`src/`)                          | React 19 + Vite 6 + Tailwind 4 + React Router 7; Vitest + Testing Library; state in one React Context (`src/app/providers/AppContext.jsx`). Node >= 22          | —                                                                                               |
| **Ops console** (`src/ops/` + `src/features/ops/`) | Standalone **read-only** monitoring app: its own Vite build, its own Railway service. See **Ops console — the second app** below                                | NOT a page in the manager app                                                                   |
| **Mobile** (`technician-app/`)                    | Expo **SDK 52**, React Native **0.76.9**, **Android-only**, TypeScript strict, Jest (`jest-expo`); needs an **EAS dev build**. See **Mobile** + **Build traps** | not iOS, not Expo Go                                                                            |
| **Backend** (`backend/`)                          | **FastAPI** (Python 3.12), SQLAlchemy 2.0 **async** + asyncpg, **Alembic** (head = **0047**; 42 tables), Pytest + pytest-asyncio, Ruff, Mypy strict, import-linter | not Django, not sync SQLAlchemy                                                                 |
| **Database**                                      | **Postgres 17**, schema owned by **Alembic**. Self-hosted: a `postgres:17` container in `docker-compose.prod.yml` on an internal network, restored from the Supabase-era data. Formerly **Supabase = managed Postgres ONLY**, via the IPv4 session pooler | **NOT** Supabase-native: no RLS, no GoTrue, no PostgREST, no Edge Functions, no pgTAP, no `supabase/` |
| **Auth**                                          | **Custom FastAPI JWT** — name/PIN login, PBKDF2-hashed PIN, `token_version` revocation. Authorization in the **service layer** (`CurrentPrincipal`/`CurrentManager`). Roles: `tech`, `manager` | **NOT** Supabase GoTrue                                                                         |
| **Media bytes**                                   | **Cloudflare R2**, signed PUT, private bucket + signed GET ($0 egress). Phone never holds R2 creds                                                              | **NOT** Supabase Storage                                                                        |
| **Offline (mobile)**                              | **Hand-rolled** queues + read cache. See **Offline engine** below                                                                                              | **NOT** WatermelonDB / Realm / a sync engine                                                    |
| **Sync model**                                    | Server is source of truth; client reconciles the returned row. Safety = **idempotency** (`client_id` dedupe) + **atomic conditional UPDATE** (jobs `try_claim`) | **NOT** bidirectional pull/push with conflict resolution                                        |
| **Push**                                          | Firebase FCM                                                                                                                                                   | —                                                                                               |
| **Deploy**                                        | **Self-hosted** `docker-compose.prod.yml` (profiles `db`/`app`/`web`/`ops`/`edge`) on a host the owner controls — a **VPS** until phase P13e, then the home box — reached **only** through a Cloudflare Tunnel on the owner's domain; driven by `ops/selfhost/bin/ffc`, step by step from `docs/RUNBOOK-SELFHOST.md`. Until `T_close` the host runs only the `drain-image` tag. Railway is dead except the old-hostname stub (`ops/hang-stub/`). Mobile via **EAS Build** | not auto-deploy on merge; not Railway; no published ports |
| **CI**                                            | `.github/workflows/ci.yml` — 3 parallel jobs: frontend, mobile, backend                                                                                        | —                                                                                               |

### Ops console — the second app

- A **second Vite build**: `vite.ops.config.js` → `ops.html` → `dist-ops/`, `Dockerfile.ops`,
  deployed as its own Railway service (`ops`) served by `ops-server.mjs`. Not bundled into
  the manager app.
- UI is `src/features/ops/` (kernel-only), wired by the `src/ops/` composition root — its own
  auth and router (HashRouter).
- **`ops-server.mjs` is a zero-dep Node BFF and it holds the Railway/Sentry tokens**, proxying
  logs/deploys/metrics + Sentry issues itself. The manager backend never holds those tokens.
  There is **no** `core/railway.py` / `core/sentry_api.py`.
- The only surfaces the **backend** exposes are **deep-health + in-app API metrics**
  (`backend/app/features/ops/`), gated by a shared secret in the `X-Ops-Proxy-Token` header
  (`settings.ops_proxy_token`) — no DB role, no migration. Deep-health also reports deployment
  facts (dispatcher/backup switches, the three trust ceilings, the legacy window,
  `FIXFLOW_GIT_SHA`), per-account `default_pin_active`, and the request's client-IP echo.
- In-app metrics come from `core/metrics.py` and are **in-memory, per-replica, reset on
  deploy**. Not APM.

### Mobile

- **Background geofencing** (`expo-task-manager` + `ACCESS_BACKGROUND_LOCATION`) drives the
  attendance arrival/exit prompts.
- Crash reporting is `@sentry/react-native`, gated on `EXPO_PUBLIC_SENTRY_DSN` — unset is a
  no-op via the `?? ""` gate in `technician-app/src/lib/sentry.ts:13`.

### Offline engine (hand-rolled — there is no sync library)

| Queue / cache          | Files                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| Jobs outbox            | `technician-app/src/lib/outbox.ts`, `outboxSync.ts` (incl. the idempotent `create` and `customer_pin` kinds); reconciliation in `lib/jobsReconcile.ts` |
| Attendance punches     | `features/attendance/{queue,sync,punch}.ts`                                              |
| Geofence presence      | `features/attendance/{presenceQueue,presenceSync}.ts`                                    |
| On-duty pings          | `features/attendance/{pingQueue,pingSync,pingTracker}.ts`                                |
| Job-travel breadcrumbs | `features/jobs/{travelQueue,travelSync,travelTracker}.ts`                                |
| Pending media          | `features/media/pendingMedia.ts` (voice notes waiting for their offline-created job)     |
| Read caches            | `lib/jobsCache.ts`, `features/attendance/todayCache.ts`                                  |
| Shared classifier      | `lib/syncClassification.ts` — one pure `classify(error, kind)` over a per-kind policy table, origin-aware (`X-FixFlow-Api` marker) |
| Drain triggers         | `lib/drainAll.ts` (fixed order: outbox, pending media, punches, presence, pings, travel) via `lib/useDrainAll.ts`; every step and every send re-checks the pass's technician is still signed in (`lib/auth.stillSignedInAs`); engine status in `lib/engineStatus.ts`, reported by `request()` |
| Corrupt-store guard    | `lib/queueStore.ts` — never-delete queues copy unparseable bytes to `<key>.corrupt` before reading as empty |

All tested in plain Jest by mocking AsyncStorage/NetInfo/jobsApi.

---

## Build & deploy traps (each one has already cost real time)

- **Never put `EXPO_PUBLIC_SENTRY_DSN` in `eas.json` as an empty string.** `eas.json` rejects
  an empty env value and every `eas build` fails. To enable Sentry, add the key **with a real
  DSN value**. CI's `expo export` will not catch this.
- **Never add the Sentry Expo config plugin to `app.json`** — it breaks the gradle build. Also
  uncaught by `expo export`.
- **`expo export` (in CI) bundles JS only.** It does NOT catch native/Gradle compile breaks. A
  real Android compile is gated only **locally and by hand**: `ops/lab/android-compile.sh` builds
  a debug-signed release APK in a container (compile evidence only, never installed on a phone;
  see `ops/lab/README.md`).
  CI still compiles no native code, and EAS stays the only build a phone receives.
- **Deploy the backend from `backend/`, never the repo root.** From the root, RAILPACK detects
  Vite and rebuilds the API as the web SPA → prod API outage. This has happened. The same holds
  for the old-hostname stub: `railway up` from `ops/hang-stub/`, with no healthcheck path.
- **The old Railway hostname may only hang, or proxy marker-carrying answers** (standing rule 5;
  `ops/hang-stub/`). The installed app deletes a record on any 2xx/204 and parks it on a bare
  4xx or after five 5xx. Never stand up anything there that answers on its own — not a 503
  page, not a "moved" 200.
- **`docker-compose.prod.yml` publishes no port, ever.** Docker bypasses ufw for published
  ports; the tunnel is the only way in. `docker ps --format '{{.Ports}}'` must show no `->` (an
  exposed `5432/tcp` is fine; a `0.0.0.0:...->` mapping is not). CI renders the file and fails on
  a published port (`ops/selfhost/smoke/compose-rules.mjs`).
- **The tunnel's catch-all is `http_status:503`, never 404**, and `api.` has no WAF, Bot Fight
  Mode or challenge: a mis-routed or challenged request must look like an outage (kept and
  retried), never like a refusal (parked).
- **The backend will not start until `/etc/fixflow/restore-signed-off` exists** (the compose's
  restore gate). Remove it before any restore. A backend that boots on an empty database builds a
  schema and seeds the cursor, and the restore then collides with it.
- **`docker compose restart` does not re-read env files.** After editing `/etc/fixflow/*.env` use
  `ffc ... up -d --force-recreate backend`, then read the value back in `/api/ops/health` facts.
- **`/api/ops/health` answers 200 even when the database is down.** A check reads the
  `database` component, never the status code alone (the compose healthcheck and
  `ops/selfhost/bin/fixflow-heartbeat.sh` both do).
- More deploy-time traps (the `railway up --ci` timeout that is not a failure, verifying a
  deploy by content) are in `docs/HANDOFF-2026-07-28-open-work.md` §2.

---

## Do NOT assume (the things that keep biting)

- **No WatermelonDB / Realm / offline sync library.** Offline is the hand-rolled queues above.
- **Supabase is a Postgres host, not a platform.** No RLS / GoTrue / PostgREST / pgTAP. The
  team evaluated Supabase-native and chose FastAPI (`docs/PLAYBOOK.md`).
- **Auth is custom FastAPI JWT, not GoTrue.** Test authorization in **pytest against real
  Postgres** (see `backend/tests/test_identity_integration.py`), never pgTAP/RLS.
- **Media is on R2, not Supabase Storage.**
- **The web app reads the LIVE API** for auth/jobs/attendance — not bundled mock seeds. (Only a
  few surfaces — schedule, the workshop-profile form — remain demo data, and are labeled in the UI.)
- **Effectively single-tenant today**: `shop_id` columns exist but the code uses a
  `DEFAULT_SHOP_ID` constant. Multi-customer is a _future_ goal — don't build for it as if it's live.

---

## Invariants you must respect when changing code

Rule first, reason second. Each of these was paid for.

### Data and money

- **Money is integer minor units** (1 Rs = 100 paisa), never floats. Convert at the UI edge.
  Existing columns keep their `*_paisa` names (no churn on a live ledger); **new** money columns
  are named `*_minor` (the unit is `shop.currency`; seed `PKR` ⇒ paisa).
- **Any `models.py` change needs a matching Alembic migration.** CI runs `alembic check` (drift)
  and `alembic upgrade head` against real Postgres. Head is **0047**; the next free slot is
  **0048**. **FKs on populated tables** ship as `NOT VALID` then `VALIDATE CONSTRAINT` — same
  migration when the column is provably clean (seed precedes it / all-NULL new column), a
  **separate PR/deploy** when months of human data could hold orphans (`start.sh` runs all
  pending migrations at boot, so a same-deploy VALIDATE leaves no window to audit orphans).
  Seeds go in migrations; fuzzy backfills are idempotent dry-run-default scripts in
  `backend/scripts/` (run deliberately via `railway run`).
- **`job_payment` is append-only cash; a void is attributed** (0047). `void_payment` stamps
  `voided_at`/`voided_by` from the principal (never the body) in the same conditional UPDATE
  that flips `voided`, and a non-blank `reason` is required; NULL stamps on a voided row mean
  "voided before 0047" (`backend/scripts/backfill_payment_voided_at.py` proposes them from the
  void events, dry-run by default, and never guesses). `recorded_by` is `Principal.tech_id`;
  its FK to `technician` is `NOT VALID` until P13d's orphan audit. `captured_at` is the
  device's offline capture time, kept only inside the trust window (240 h back / 2 min
  forward) and NULL otherwise — a payment is never refused for its clock. Payment and void
  `job_event` payloads are `{payment_id, amount_paisa, method, job_closed}`, a payment's plus
  `captured_at_claimed` (ISO 8601 UTC) when the device's claim was not trusted (left out,
  never a 500, when the claim has no UTC form); no money feed reads them (standing rule 7). A
  payment response's `payment_receipt.replayed` says the `client_id` matched an earlier
  payment. On a **closed** job only a **manager** may record a payment (a non-blank `reason`
  of at most 256 characters, else 422) or void one; that reason is stored in
  `job_payment.reason`, a void's in `job_payment.void_reason`, and both are repeated in the
  event text. On an open job a payment's `reason` within the request's 4096-character cap is
  ignored (not stored, never a 422). Technicians keep the 409 `(current status: closed)`;
  negotiate and completion stay refused for everyone.
- **`job_event.payload` carries ids, amounts, flags, slugs and timestamps — never free text**
  (rulings C31/C35; 0027's "never PII"). A reason, note or remark goes in the event `text`
  (and in a column of its own where it must be kept). Known exception, routed to P13b: the
  customer-pin event's payload holds the pin's coordinates.
  `tests/test_event_payload_free_text_integration.py` drives every function that writes a
  `job_event` today (its `_WRITERS` list, all in `jobs/service.py`; the one branch it does not
  drive is a plain `close`, inside `transition`'s single site) with a marker in each free-text
  input and in the job rows they read, and fails on a marker in any payload. A second test fails when `app/` or
  `scripts/` gains a `job_event` write site (`JobEvent(`, `insert(JobEvent)` or an
  `INSERT INTO job_event` string) the list does not name: drive the new writer there. It
  cannot see free text that only a path it does not drive would write.
- **Respect slice boundaries.** Cross-slice access goes through `service.py`/`deps.py` (backend)
  or a feature's `index.js` barrel (web). CI enforces this — contracts live in
  `backend/pyproject.toml` under `[tool.importlinter]`, plus ESLint `no-restricted-imports`. A
  new edge must be added to the allow-list consciously.

### Security

- **Compare shared secrets with `compare_secret` (`backend/app/core/security.py`), never
  `hmac.compare_digest` on a `str`.** `compare_digest` raises `TypeError` on non-ASCII strings,
  so a single non-ASCII byte in an attacker-controlled header turns an auth check into an
  unhandled 500. Three sites had exactly that hole: the ops proxy-token gate, the WhatsApp
  webhook verify token, and the webhook signature header. `compare_secret` hashes both sides
  first, so it is total over all inputs, and an unconfigured secret is always `False`.
- **The login lock deliberately blocks a correct PIN too — do not "fix" this.** To let a correct
  PIN through you must verify every PIN, which stops the lock throttling guessing at all; a
  4-digit tech PIN then falls in under an hour. The **per-account** lockout
  (`features/identity/throttle.py`) is the real defense — the per-IP limiter only blunts
  roster-wide spraying. The lock always decays (`MAX_LOCK_SECONDS` = 15 min) and escalation
  forgets itself after a quiet hour (`DECAY_AFTER_SECONDS` — ergonomic, **not** a security
  control). Recovery is out-of-band by design: a manager clears a tech's lock via `set_pin`,
  and `backend/scripts/unlock_account.py` covers the manager's own locked account.
- **The backend refuses to boot on a weak JWT secret; the environment defaults to production.**
  Boot fails on the dev default, a blank, or a < 32-byte `FIXFLOW_JWT_SECRET` unless
  `FIXFLOW_ENVIRONMENT` is explicitly `dev` or `test`; a present `RAILWAY_ENVIRONMENT` forces strict
  regardless. pytest gets `test` from `backend/conftest.py`, CI sets it in `ci.yml`. A forgotten
  variable on a live host must fail closed, not run on a public dev secret.
- **PIN policy lives in one place** (`features/identity/pin_policy.py`): 6+ digits for every role
  when a PIN is SET, and the known defaults (1234, 123456) are refused. In production a login with
  a default PIN is a 403 "PIN must be changed by the manager". `backend/scripts/set_pin.py` is the
  out-of-band path and shares the policy; don't add a PIN-writing path that skips it.
- **`X-FixFlow-Api: 1` is on every response** (`core/origin_marker.py`, an ASGI layer outside
  `ServerErrorMiddleware`, so it survives a 500). Phones classify a status as the app's own only when
  it is present — a captive portal or proxy 4xx must not park a queued write as "failed". Never
  remove it, never add it to anything that is not the app.
- **The legacy-secret verifier is always built and default OFF.** It accepts old-secret tokens for
  write methods only (never `set_pin`), tech accounts only, ignores the token's own `exp`, and
  `FIXFLOW_LEGACY_JWT_EXPIRES_AT` ends it. Never switch it on outside a supervised drain window.
- **`/docs`, `/redoc`, `/openapi.json` are off in production**, and login plus the WhatsApp webhook
  have body caps (`core/body_limit.py`). Keep both when adding routes or middleware.
- **The container healthcheck target is `/api/ops/health`** (send `X-Ops-Proxy-Token`), never
  `/api/health` — that one never touches the DB, so it stays green through a dead database.

### The mobile outbox

- **Mobile mutations go through the outbox** (`sendOrQueue`) and carry an idempotency
  `client_id`. Never `fetch` a write directly from a screen — that loses data offline and risks
  double-charging on retry.
- **The outbox never deletes a write.** Success removes; a definitive 4xx **from our server**
  (response carries `X-FixFlow-Api: 1`) → visible "failed" list; anything ambiguous
  (offline/5xx/timeout, and ANY response without the marker — an edge 404, a Cloudflare 530, a
  captive portal) is kept and retried, and a markerless answer never counts toward the poison
  cap. There is no JSON-`detail` fallback for the marker. A live `sendOrQueue` queues on an
  app 401 (paused until sign-in) and rethrows only an app-origin definitive 4xx. Don't "simplify"
  this away. Every queue — outbox, **punch and presence**, **pending media**, pings, travel —
  calls the same `classify(error, kind)` (`lib/syncClassification.ts`); no queue keeps a
  private ladder. On-duty **pings and job-travel breadcrumbs are the exceptions — deliberately
  droppable**: `drop` exists only on their rows of the policy table (an app-origin definitive
  refusal; coverage degrades to an honest `no_data` gap / the fuel estimate stands in).
- **KNOWN DEFECT, UNFIXED: the outbox has no mutual exclusion on a stable id.** A live
  `sendOrQueue` racing a concurrent `flushOutbox` for the same id resolves to whichever request
  the **server** finishes last, not whichever the technician sent last — so "last write wins by
  id" is a false assumption; do not build on it. The completion path avoids the race by
  **refusing** to open a second completion while one is queued
  (`features/jobs/completionPrefill.ts`). Don't remove that refusal believing the outbox
  serialises for you.

### Location and privacy

- **Location tracking is time-bounded, not just event-bounded.** On-duty sampling stops at
  `config.attendance.maxDutyHours` (14h) even if the tech never clocked out, and job-travel
  breadcrumb sampling stops at `MAX_TRAVEL_MS` (4h) even if the arrival punch never came. All
  privacy layers route through `dutyStatus` (`pingTracker.ts`) / the travel state
  (`travelTracker.ts`); don't add a path that samples without them. "Signed in" for every privacy
  gate means a stored technician **and** a stored token (`lib/auth.signedInTechId`); an app 401
  clears both (`clearSession`, also in headless tasks). Duty state reads only **live** punches —
  a settled or parked punch is not evidence of the current shift (`dutyTruth.ts`, shared by the
  sampler and the Clock screen), and a punch our server refuses returns duty to the server's
  `today` — off when unreadable (`sync.ts` `parkPunch`). Ping `captured_at` is likewise
  trust-windowed server-side (rejected outside 240 h back / 2min forward) so it can't be back-dated
  to rewrite an attendance day. The back ceiling defaults to 240 h and is
  `FIXFLOW_ATTENDANCE_PING_BACKDATE_CEILING_HOURS` (O04-F12: the ceiling guards back-dating, not
  sampling).

### The job lifecycle

- **The job lifecycle is a guarded state machine, not a setter** (0043). Statuses are
  `open → waiting → ready → closed`; only `closed` is terminal. Every action's legal
  from-states live in `_TRANSITION_FROM` / `_TRANSITION_SETTLED` (`jobs/service.py`) and are
  applied by an **atomic conditional UPDATE** (`repository.try_transition`, the `try_claim`
  pattern) — never load-mutate-flush. A replay is an **idempotent success, never a duplicate
  event**: by `client_id` when the client sends one (`job_event.client_id`, partial unique
  index), by the settled-state check when it doesn't (deployed APKs send none). Reaching a
  state the contract forbids is a 409 whose `detail` ends `(current status: X)` — three
  clients regex that string, so keep it plain text. Before this, `transition()` never read
  the current status and a queued `ready` could silently **reopen a settled, billed job**.
- **`ready` means "work done, awaiting handover"** — `submit_completion` moves a carry-in or
  pickup-delivery job there automatically (home-visit closes on the spot instead). Completion
  is a _bill document_, not a lifecycle event; the close still needs its `closing` handover
  clip. Don't reintroduce a client-queued `ready`: server-side is what makes `ready`
  impossible without a completion, and what fixed the deployed fleet without an app update.

### The bill freeze (server and client are two halves of one rule)

- **A bill the customer has seen, agreed, or paid against is frozen.** A completion _resubmit_
  (not the first submission — cash can precede paperwork) is refused once `job.bill_sent_at` is
  set, `bill_negotiated_paisa` is set, or a non-voided payment exists; a manager may still
  correct it **until the job closes** (the closed guard outranks the override). The upsert clears
  materials and re-prices labour from the payload, so an unguarded resubmit silently rewrote real
  bills to zero. A resubmit of the _byte-identical_ form is an idempotent success, not a 409 —
  deployed phones send no `client_id`, so payload equality is the only way to tell a replayed
  write from a real edit, and a 409 would park a landed completion in the tech's failed list.
- **A completion form must never open blank against a real bill**
  (`features/jobs/completionPrefill.ts`). Because the server upsert re-prices from the payload,
  a blank form _is_ a delete. "Could not establish whether a completion exists" is
  `blocked/"unknown"` — **not** `new`. A bare `catch { return; }` made "offline" and "this job
  has no completion" the same answer, which is how a blank form got to replace a real bill.
- **Arrival-wizard state is monotonic** (`features/jobs/arrival-job/wizardState.ts`). Once it
  has said `pending`/`failed`/`done` it may be upgraded, never walked back to `run`. Deriving it
  live from the outbox reopens the loop #162 closed: `flushOutbox` calls `removeItem` **before**
  notifying landed-listeners, so for one render there is neither a queued item nor a known
  completion, and a live derivation restarts the capture flow on a finished job while
  `clearArrivalDraft` wipes the evidence behind it.
- Both client guards are **pure functions living outside their components on purpose** — this app
  has no screen-test harness (no `@testing-library/react-native`, no `react-test-renderer`), so
  logic inside a component is logic nothing asserts.

### Resuming from server truth

- **A client must be able to resume a workflow from server truth.** `JobDetail.evidence` carries
  per-phase media counts (pending rows included, matching the close gate) precisely so a client
  whose local draft is gone doesn't re-demand evidence the server already holds. `None` means
  "unknown" (service built without the media surface), not "no evidence" — never treat it as zero.

### The outbox dispatcher (default OFF — and it must stay safe to switch on)

- **Never message a customer about an old event.** `run_dispatch_once` mints a missing cursor at
  `last_seq=0`, so an unseeded cursor drains **the entire history** of `job_event` and treats
  every row as a live customer message — measured at 36 real messages about months-old jobs.
  Two independent locks: **migration 0046 seeds `dispatch_cursor` at the current head** (enabling
  the dispatcher is forward-only), and `_MAX_DISPATCH_EVENT_AGE` (2 days, `main.py`) skips stale
  events for the cases a seed can't cover — a cursor reset by hand, or restored from an older
  snapshot. The damage is permanent, not transient: `uq_customer_message_job_kind` makes the
  first decision per (job, kind) terminal, including a `suppressed` one.
- **`run_dispatch_once` commits per event, not per batch**, and commits a newly-created cursor
  _before_ the loop. A rollback inside the loop expunges a still-pending cursor, after which
  `cursor.last_seq = …` mutates a detached instance, the final commit persists nothing, and the
  consumer replays the same batch forever.
- **The messaging claim row is written in a savepoint** (`CustomerMessageRepository.savepoint`).
  `Session.rollback()` unwinds the _outermost_ transaction, so recovering from an ordinary
  duplicate-key race that way costs the caller everything else it had pending.
- **The automated send must call `log_customer_message`**, exactly as the manual endpoint does.
  Without it the automated path sends a bill the customer can see while leaving `bill_sent_at`
  NULL — the freeze never engages and a queued `completion` can still rewrite a billed job. That
  is the carry-in loop #162/#163 closed, reopened through the automated door.

---

## Where things live

Each capability is a same-named folder per runtime:
`src/features/<x>/` (web) ⇄ `technician-app/src/features/<x>/` (mobile) ⇄
`backend/app/features/<x>/` (backend). Backend slice = `router → service → repository`, with
`schemas.py`/`models.py`/`deps.py`/`tests/`. For the full lookup table ("feature X lives
where?") and an end-to-end trace, see **`docs/CODE-MAP.md`** (Part 3 + Part 6).

### The twelve backend slices

`identity`, `jobs`, `media`, `attendance`, `notifications`, `ops`, `health` — the original
seven — plus five that came with the ERD build-out (migrations 0020–0036 grew the operational
store into a 38-table data asset; spec: `docs/fixflow-erd-specification.md`):

- **`tenancy`** — `shop`/`area`, plus `shop_setting` since 0040: **append-only per-shop business
  parameters** with a code registry in `specs.py`, manager-edited via `GET/PUT /api/shop/settings`.
  The money rates read from here; env values are seed defaults only.
- **`customers`** — `customer`/`customer_phone`/`customer_consent_event`/`appliance_unit`.
  Consent writes via `POST /api/customers/{id}/consent` and the intake consent chip.
- **`catalog`** — `appliance_category/brand/model` + aliases, `fault_code`/`action_code`,
  `part`/`part_alias`. Read-only picker endpoints under `/api/catalog/` since 0036.
- **`telemetry`** — `app_event`/`ops_metric_rollup`, the `POST /api/events` ingest.
- **`customer_messaging`** — `customer_message` plus the WhatsApp surface: wa.me preview/send-log
  endpoints under `/api/messaging/`, a settings-gated Meta Cloud API sender, and the signed
  `/api/webhooks/whatsapp` callback. See `customer_messaging/service.py`.

`job_event` doubles as a transactional outbox (`seq` + `dispatch_cursor`). New rows carry
enforced FKs; free-text intake stays in `*_raw` columns beside the resolved FK (C7 raw+resolved).

### Staff money (owned by the `attendance` slice)

- **`staff_ledger`** (0039) — append-only staff money (advances, earnings, settlements) with
  UNSIGNED `amount_minor` + a DB CHECK. Direction comes from `kind` alone via
  `models.LEDGER_SIGN`; balances come from `repository.ledger_balances`, the one place voided
  rows are filtered. A positive balance means the shop owes the tech.
- The weekly payroll CSV stays deliberately **money-free**: a balance is point-in-time, and
  `payroll_export` is idempotent on (shop, window).
- **`staff_ledger_chain`** (0041) — tamper-evidence as a SEPARATE append-only, hash-linked event
  log (one `create`/`void` entry per ledger event; `row_hash = sha256(version‖payload‖prev_hash)`,
  per-shop `seq` serialised by a `pg_advisory_xact_lock`). The canonical serialisation is pinned
  in `attendance/chain.py` (stdlib-only, shared by the runtime append AND the 0041 backfill).
  `GET /api/attendance/ledger/verify` (manager) rescans the chain and reconciles it against the
  ledger — catching a tampered amount, a deleted row, or a direct-DB **void-flip**. The ledger's
  in-place void is unchanged; the chain records the void as its own event, so the money table and
  the balance path stay untouched.
- **`advance_request`** (0042) — earned-wage advances. A tech requests via
  `POST /api/attendance/advances` (one action, idempotent on `client_id`, self-scoped); a manager
  approves/rejects (`/advances/{id}/approve|reject`). On disbursement **exactly one** `advance`
  row lands in `staff_ledger`, keyed on the request's pre-minted `disbursement_client_id` so the
  ledger's own dedup makes it exactly-once across retries. The disbursement rides a `PaymentRail`
  **Protocol** (`core/payment_rail.py`, default `ManualCashRail`); the rail's `idempotency_key`
  stops a double payment, and a rail failure leaves the request `failed`/retryable with **no**
  money row. **All advance policy — enabled, caps, cooldown, auto-approve threshold — lives in the
  per-shop `shop_setting` registry and ships OFF** (build the seam, default off). Available
  amount = min(balance, %-of-accrued, absolute cap), floored at zero.

### Scheduler jobs

Registered in `main.py` `_lifespan`, single-replica. **The whole block is behind
`settings.enable_scheduler` (default ON).** Each job is idempotent, so a duplicate run is harmless.

| Job                     | Schedule            | Gate                                  |
| ----------------------- | ------------------- | ------------------------------------- |
| `payroll-weekly-export` | Sundays             | —                                     |
| `db-backup-nightly`     | daily               | `settings.backup_enabled` (default ON) |
| `outcome-auto-link-scan` | daily 03:00        | —                                     |
| `media-orphan-sweep`    | daily 03:30         | —                                     |
| `ops-metric-rollup`     | every 300s          | —                                     |
| `outbox-dispatch-whatsapp` | every `dispatcher_interval_seconds` (60s) | `settings.enable_dispatcher` — **default OFF** |

The whatsapp consumer sends via the Meta Cloud API when `FIXFLOW_WHATSAPP_*` is configured and
stays log-only otherwise. Before switching `enable_dispatcher` on, read the dispatcher invariants
above — an unseeded cursor is a mass-message incident.

---

## Commands

```bash
# Web (repo root)         Node >= 22
npm run lint && npm run format:check && npm test && npm run build

# Backend (backend/)      Python 3.12
ruff check . && ruff format --check . && mypy app && lint-imports
alembic upgrade head && alembic check
pytest                    # set FIXFLOW_TEST_DATABASE_URL to also run @integration tests

# Mobile (technician-app/)
npm run typecheck && npm test && npx expo export --platform android
```

Note: `CLAUDE.md`, `docs/`, `backend/` and `technician-app/` are all in `.prettierignore` —
`npm run format:check` does not police them.

---

## Doc map (read on demand; this file is the index)

| Doc                                | Use it for                                                                       |
| ---------------------------------- | -------------------------------------------------------------------------------- |
| `docs/CODE-MAP.md`                 | The on-ramp: how to read/navigate/trace the repo (start here if unfamiliar)      |
| `ARCHITECTURE.md`                  | Layer map, dependency rules, how to add a feature                                |
| `docs/SOLUTION-ARCHITECT-GUIDE.md` | The _why_ behind decisions; where a new capability belongs                       |
| `docs/PLAYBOOK.md`                 | Operational checklist before building a slice (offline, push, migrations, media) |
| `docs/HANDOFF.md`                  | Live URLs, demo credentials, what's real vs demo                                 |
| `docs/fixflow-erd-specification.md` | The data-model spec behind migrations 0020–0036 (entity definitions, C7 raw+resolved) |
| `docs/RUNBOOK-BACKUPS.md`          | The nightly DB backup: what runs, where it lands, how to restore                 |
| `docs/RUNBOOK-SELFHOST.md`         | **The production host**: host-ready checklists, secrets, restore per recovery case, the drain window, backups, the old-hostname stub, `release/drain`, the deploy train, operations R0-R9 |
| `ops/hang-stub/README.md`          | The old-hostname stub: why it never answers, its two modes, its Railway deploy   |
| `docs/PRODUCT-READINESS-REVIEW.md` | Forward-looking "what to harden next"                                            |
| `docs/BACKEND-REQUIREMENTS-2026-07.md` | The owner's working agreement for the 2026-07 batch: invariants, published contracts, waves — read with the phase-0 audit's corrections (its §1.3 is partly stale) |
| `docs/requirements-2026-07-phase0-audit.md` | Phase-0 reconciliation: every batch requirement classified against the code (what's live/partial/missing) |
| `docs/requirements-2026-07-gap-analysis.md` | Current requirements queue (Odoo, payroll v2, stock, performance) vs what's built |
| `docs/frontend-gaps-2026-07.md`    | Client-side gaps from that batch — **not owned by the backend track**; handoff doc |
| `docs/lifecycle-audit-followups-2026-07.md` | What the carry-in-loop audit found and PR #162 did **not** fix, with file:line. Read before touching travel/messaging/consent or adding an outbox kind |
| `docs/HANDOFF-2026-07-28-open-work.md` | **Start here if you are picking up open work.** Deploy-time traps, every adversarially-confirmed defect ranked by when it hurts, the unfinished Wave-2 plan, and the recurring defect shapes earlier passes missed. Its §1 state table is **point-in-time — re-verify against prod before trusting it** |

`README.md` and `CONTRIBUTING.md` are human-facing onboarding, not agent context.

---

## Keeping this file honest

When you change the stack — a dependency, a cloud service, the auth mechanism, the offline
engine, the deploy path — **update this file in the same PR**, and fix any prose doc that now
contradicts it. The facts most prone to rot (audit these if anything feels off): the storage
backend (was Supabase Storage → now R2), the auth mechanism (never GoTrue — custom JWT), the
offline engine (hand-rolled, not a library), **the Alembic head number**, and the Expo SDK
version. If you catch a doc asserting one of these wrongly, correct it — that drift is exactly
why this file exists.

Two checks worth running before you trust this file:

```bash
# The true head is the end of the down_revision chain, not the highest filename.
grep -h "^revision\|^down_revision" backend/alembic/versions/*.py

# Every path this file names should still resolve.
grep -o '`[a-zA-Z0-9_./-]*\.\(py\|ts\|tsx\|js\|jsx\|mjs\|json\|md\)`' CLAUDE.md | tr -d '`' | sort -u
```
