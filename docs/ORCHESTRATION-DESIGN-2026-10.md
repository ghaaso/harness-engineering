# Orchestration design — the ship-to-client program (v2, 2026-10-31)

**What this is.** The role assignment and multi-agent orchestration for the work that gets
FixFlow shipped: field-reliable geofencing/location/offline, the Odoo "pakka khata" hop,
no security holes, acceptable latency, and a path to a self-hosted home server. It is the
*method*, not the plan: the phased plan is designed only after the workflows below have
produced a verified picture.

**Status: v3 — v2 (three Opus critics + one external review) revised after a second external
review covering the data-preservation procedure, phone-recovery compatibility, verification
buckets, script bookkeeping, the gate recipe, dump inspection, evidence rules and secret
handling. Awaiting the owner's skills research (§9) and the W0 owner pre-flight (§4.0) before
W1 runs.** §11 lists what changed in v2 and v3, including the critique points that were
rejected or narrowed, with reasons.

**Who decides what.** The main session (Fable) is orchestrator, architect and judge. It sets
the hypotheses, routes work, reads every result between workflows, adjudicates conflicts,
and makes the calls. Subagents gather, analyse and verify; they never decide. A Sonnet
verdict can *narrow* an Opus brief; it can never remove one.

---

## 1. Ground truth the design is built on (verified 2026-10-31)

| Fact | Consequence for the design |
| --- | --- |
| Both documented Railway URLs return Railway's edge fallback `404 {"message":"Application not found"}`. Per Railway's own community answers this means no active deployment is routed to the hostname (service offline, deleted, or unbound), not necessarily an expired plan | **Production is unknown, probably gone.** The owner's dashboard is the only way to know which (§4.0) |
| **The phones have been losing field data since the backend died, and can lose more.** `DEFINITIVE_4XX` includes 404 (`technician-app/src/lib/syncClassification.ts`). On a definitive rejection the ping and travel syncs **drop** the batch (`pingSync.ts:63-69`, `travelSync.ts`); the punch, presence and jobs syncs **park** the item in a visible failed list (`markFailed`/`markPresenceFailed`), retained until a technician taps Discard. The punch, presence and jobs queues have **no cap**; the ping and travel queues evict oldest-first above 1000 unsent. Headless paths that sync without the app open: presence (`geofence.ts:211` → parks, safe), pings (`pingTracker.ts:304` → drops, but only during a duty session, which the 14 h failsafe ends) and travel (`travelTracker.ts:224,287` → drops, only during a leg, 4 h failsafe). So today the live destruction is foreground-only: opening the app, clocking in, or starting travel | The **W0 fleet procedure** (§4.0) is a procedure, not a slogan: no opening, clocking in, travel, Discard, update, uninstall or reset; and the old hostname is made to answer 503 or nothing if the owner can still control it. **"Until a backend answers" is not the release condition** — a revived backend answers every phone with a 401 (expired 30-day tokens), rejects out-of-window pings/travel with a *successful* batch (`PingBatchResponse.rejected`, phone prunes them) and would 404 writes that name jobs a fresh DB does not have. Release is gated on the **fleet drain protocol** (O-10, §4.5) |
| The API hostname is **baked into the APK at build time** (`config.ts:14`, `eas.json` preview profile = the dead Railway subdomain; the production profile = the placeholder `https://api.fixflow.example`) | Recovery and self-hosting both require a **new APK pointed at a domain the owner controls**. Any cutover must never let the old hostname answer 4xx to a fleet with queued writes (serve 503 or nothing) |
| Last commit on `main` is `a31924a` (2026-08-03); 10 commits since the handoff (`906b990`) | Register reconciliation is a diff-restricted check, not a re-audit; the field APK is **older than `main`** (handoff §1) so every Q1 finding must be labelled "in the field APK" or "main only" |
| Supabase Free projects pause after 7 idle days. The current docs state a **one-year** restore window; the 2024 changelog stated **90 days**; the dashboard shows the real deadline for this project | Prod was last seen alive 2026-08-01. If the old window applies, the deadline is early November. **The owner checks the pause date this week** (§4.0) |
| This machine: Node 24 (CI pins 22), **Docker CLI present but the engine is down** (`docker info` fails on the Desktop pipe), **no Python on PATH** (a Python 3 interpreter exists at the Codex runtime path, `HARNESS-REVIEW-2026-11-01.md` §4), no `node_modules`, `gh` 2.103 installed and logged in (Tempest-Zero), Railway CLI not logged in, no `backend/.env`, no EAS login | Backend gates run only inside Docker **after the owner starts Docker Desktop**; Node failures must be re-run under `node:22` before being called defects; nothing here can touch prod |
| The pinned Expo packages ship their Android sources, now cached at `C:\Users\User\.fixflow-cache\expo-src\` (`expo-location@18.0.10`, `expo-task-manager@12.0.6`, `expo-notifications@0.29.14`, `expo-modules-core@2.2.3`) | Native questions are answered from these files; no `npm ci` and no `expo prebuild` is needed or allowed for that (§8) |
| The migration seed is an **inactive (0,0) placeholder fence** (`backend/alembic/versions/0002_create_attendance.py:190-199`); the live fence recorded in `docs/HANDOFF.md` (`33.65564, 72.8543`, 80 m — an Islamabad/Wah latitude, while CLAUDE.md says Karachi) exists **only in the database** | Where the workshop is, and whether the fence row survives, cannot be settled from code. Owner item in W0; a restored dump can confirm it |
| ADR-0001 A1.2: `attendance_event` had **9 rows lifetime** | "Doesn't behave in production" rests on a thin evidence base. Q1 must deliver a *discriminating field protocol*, not only a code audit |
| Fleet is Xiaomi/Oppo/Vivo-class Android (`onboarding/battery.ts`); the app asks for battery exemption but **never for OEM autostart**, never checks location providers, and only requests background location once, in onboarding | OEM kill and permission decay are first-class hypotheses |

---

## 2. The questions the program must answer

| # | Question | Kind of work |
| --- | --- | --- |
| Q1 | Why do geofencing, on-duty pings, travel breadcrumbs and offline sync not behave as designed in the field? | root cause under incomplete evidence |
| Q2 | What is the production state and the recovery path (Railway, Supabase, R2 dumps, the phones)? | **owner pre-flight (W0)**, then a branch at G1 |
| Q3 | Which register items are fixed on `main`, partial, or open? | diff-restricted cross-reference |
| Q4 | What are the real security holes for shipping, and how does self-hosting change the threat model? | adversarial analysis + design |
| Q5 | Latency: region move, straight to a self-host, or cheap levers only? | Fable decision at G2 on gathered facts |
| Q6 | How does the manager-approved "pakka khata" reach Odoo while the app stays the "kacha khata"? | integration design, **gated on owner decisions** |
| Q7 | What does the self-hosted stack look like and how do we migrate to it without losing the fleet's queued data? | architecture + runbook, **gated on owner decisions** |
| Q8 | What can be verified where (local gates, Docker, device smoke, CI)? | capability inventory |

### 2.1 Hypotheses for Q1 (v2 — consolidated; status set by the orchestrator)

Status key: **SETTLED** = answered from code/native sources, no agent re-investigates it;
**RESIDUAL** = the app side is settled, a named residue stays open; **OPEN** = needs W1/W2;
**OWNER** = only the owner, a device, or a restored dump can settle it.

| ID | Hypothesis | Status | Residue / discriminator | Owner |
| --- | --- | --- | --- | --- |
| H1 | OEM background kill (MIUI/HyperOS, ColorOS, FuntouchOS): the app is killed or force-stopped, so neither the geofence PendingIntent nor `BOOT_COMPLETED` reaches it; the app requests battery exemption but **not autostart** | OPEN (master) | R-01 collects per-OEM behaviour and the autostart intents; O-01 ranks; field: `adb shell dumpsys activity services`, OEM autostart screen, swipe-away test | R-01, O-01 |
| H2 | The headless geofence handler overruns its budget. **Settled constants:** Expo force-finishes a headless job after **15 s** (`TaskService.java:52,338`); the handler may spend a **20 s** dwell (`geofence.ts` `DWELL_RECHECK_MS`, whose comment assumes "~30 s"); `getCurrentPositionAsync(High)` has **no timeout** (`location.ts:31-33`); the `getToday` call aborts at **15 s** (`api.ts:85`) | RESIDUAL | What actually happens to JS after `jobFinished` (process kept? killed on OEM ROMs?), plus the headless cold-start cost in `expo-modules-core` `RNHeadlessAppLoader.kt`. S-01b extracts; O-01 judges; field: `adb logcat -s TaskService ReactNativeJS` | S-01b, O-01 |
| H3 | Radius vs accuracy: the fence is 80 m, the confirmation ceiling is 100 m (`geofence.ts` `CONFIRM_ACCURACY_MAX_M`), and inside/outside is judged on the raw point with no accuracy circle (`evaluateFix`). A true indoor Enter with a 40–100 m fix reads "contradicted" twice and the prompt is **suppressed**; Android also recommends ≥100 m radii | OPEN | Dump: presence rows with `confirmed=false` and `accuracy_m` 40–100; R-01 for the OS guidance | S-07b (dump), O-01 |
| H4 | The fence row is wrong or gone: the seed is an inactive (0,0) placeholder, the live row is DB-only, and a fresh or restored DB serves `is_active=false`, which makes every phone call `stopGeofencing` | OWNER | Owner confirms the workshop coordinates; W0/S-07b reads the row from a dump; any revived backend's active-fence endpoint | owner |
| H5 | Session expiry: 30-day JWT, no refresh (`config.py`), **any 401 wipes the persisted token** (`api.ts:111-113`) and every queue pauses on 401, while the headless tasks keep enqueueing because they key on `TECH_KEY`, not the token. **Consequence for recovery:** every phone's token expired weeks ago, so the first sync against any revived backend is a 401 → logout → paused queues; the drain cannot start until each tech logs in again | SETTLED (mechanism) | What the technician sees for a paused queue; whether a logged-out phone records presence indefinitely; the re-login step in the drain protocol — O-03, O-10 | O-03, O-10 |
| H6 | Backend **unreachable** (DNS/timeout/5xx) for some period → writes kept and retried | OPEN | W0: when did prod die (backend Sentry last event; Railway deploy history) | owner, O-03 |
| H7 | Backend answers the **edge 404** → classified definitive → pings/travel **dropped**, presence/punches/jobs **parked** (Discard-able). Already happened on every open since the backend died; further loss needs the app opened or a duty/travel session started (§1) | SETTLED (code) | W0 fleet procedure now; count the failed list on one phone (no Discard); the fixed APK must classify a 404 whose body lacks FastAPI's `detail` as transient; the drain protocol (O-10) decides when phones may sync again | owner, O-03, O-10 |
| H8 | Notification suppression at OEM level (the app does create its channels and requests the Android 13 grant) | RESIDUAL | R-01: MIUI per-app notification defaults; device smoke | R-01 |
| H9 | Background permission decay: only onboarding ever requests "Allow all the time" (`permissions.ts:57-63`); when it is missing, `ensureGeofenceMonitoring` silently stops (`geofence.ts:313-316`) and **no surface re-asks**. Android 11+ "remove permissions if app unused" (and OEM equivalents) revoke it on a rarely-opened app | SETTLED (no re-ask) + OPEN (auto-reset prevalence) | Field: `dumpsys package com.fixflow.technician` runtime permissions; the "pause app activity if unused" toggle | R-01, O-01 |
| H10 | The foreground-service family: (a) Expo refuses to start the location FGS unless the app is foregrounded (`LocationTaskConsumer.kt:163-171`); (b) a boot-time `restoreTasks()` therefore re-arms the on-duty/travel sampler **without** its FGS, under background-location limits; (c) the app never repairs it — `startDutyPings`/`startJobTravel` return early on `isRunning()`, which only tests task registration (`LocationModule.kt:284-286`), while a re-call would reach `setOptions()` → `maybeStartForegroundService()` (`TaskService.java:95-107`); (d) after an OEM kill or swipe-away nothing restarts the FGS until the app is opened, because `ensure*` runs only on mount/AppState `active` (`useAttendanceBackground.ts`) | SETTLED (mechanism, all four) | Field prevalence only: register, reboot, open app, check for the "on duty" notification; swipe away while on duty, check `dumpsys activity services` | O-01 (prevalence), fix phase |
| H11 | Expo SDK 52 / `expo-location` 18 / `expo-task-manager` 12 known Android geofencing or headless defects | OPEN | R-01 from the tarballs' CHANGELOG/README first, then the web | R-01 |
| H12 | Trust windows (24 h punch backdate, 48 h ping ceiling) re-bucket or reject late offline batches | REGISTERED (handoff §4.4) | S-06 confirms unchanged; O-04 only if the register says so | S-06 |
| H13 | The drains have no ordering primitive (completion before media) | REGISTERED (lifecycle doc) | S-06 confirms unchanged | S-06 |
| H14 | The field APK does not match `main` (older build; may predate D5 confirmation, the battery exemption, the ping cap, the 14 h failsafe) | OWNER | W0: EAS build list (commit hash + profile) vs `dumpsys package` versionCode on one phone; S-06 then diffs that commit → `main` for the background files so O-01/O-03 label each finding | owner, S-06 |
| H15 | The baked API URL is dead (preview profile) or a placeholder (production profile) | SETTLED | Constraint for O-08 and every later phase: new APK on an owner-controlled domain before any backend move | — |
| H16 | Location services / Google Location Accuracy toggled off → Play Services removes all geofences (`GEOFENCE_NOT_AVAILABLE`); the app never checks providers (no `hasServicesEnabledAsync` anywhere) and re-registers only on foreground | OPEN | Field: `adb shell dumpsys location` after a toggle | R-01, O-01 |
| H17 | OEM "restrict background data" / Data Saver makes every headless sync fail as a network error, so data moves only in the foreground | OPEN | Field: `dumpsys netpolicy`, per-app data setting | R-01, O-01 |
| H18 | Nothing detects a silent kill: no telemetry says "task not registered when foregrounded" or "no ping for N hours while on duty", so a dead sampler looks like a quiet day | OPEN (design gap) | S-03/S-05: what telemetry and board views exist; O-04: what the board would need | O-04 |

O-01 must rank H1, H2, H3, H9, H10, H11, H16, H17 **for this fleet**, label each as "in the
field APK" / "main only" once H14 is known, and output the field protocol that separates the
top three with one phone and `adb`. H4, H7, H14 and H15 are not ranked by any agent.

---

## 3. Tier guide for this repository

Routing rule: **raise effort on the current tier before moving up a tier.** Ultracode
multiplies every token across agents; the model per agent is the main cost lever. Every
subagent also pays a fixed overhead (CLAUDE.md ≈ 7.5k tokens plus the CONTEXT block) before
doing any work, so tiny tasks are inline commands, and claims are batched per verifier.

| Tier | Use for (in this repo) | Never for |
| --- | --- | --- |
| **Haiku** (`low` for literal dumps, `medium` when names vary) | Pure extraction into a **typed schema with `additionalProperties:false`**: router tables, settings fields, mobile constants, audit/scan output. Keep each prompt under ~100k input tokens (Haiku's price cliff); split large dumps | any inference ("is this endpoint unauthenticated?"); anything cross-file |
| **Sonnet** (`medium`; `high` for cross-referencing) | Module maps with light reasoning, native-source question lists, web-research *collection* with fetched URLs, running gates and reporting, diff-restricted register reconciliation, citation checking, straightforward implementation later | adversarial verification of a critical claim; security sign-off; invariant-sensitive code (outbox, lifecycle, ledger, migrations) |
| **Opus** (`high`; `xhigh` for the geofence analyst and P0 skeptics) | Deep subsystem analysis, adversarial security review, Odoo idempotency design, **fresh-context default-refute verification**, Stage-3 design critique | high-volume reading a map can replace; the three G2 decisions |
| **Fable** (main session) | Hypotheses, routing, inline pre-flight commands, gates G1/G2, adjudicating conflicting verdicts, the three decisions, owner-decision framing, phase design (later) | subagent work. A Fable subagent is a last resort for a question Opus at `xhigh` demonstrably cannot settle |
| **`fixflow-explorer`** (project agent, `.claude/agents/fixflow-explorer.md`, model pinned to Haiku) | "where is X?" file location from a gate | reading or auditing. The built-in Explore agent inherits the session model's tier (Opus here) — do not use it |

---

## 4. The orchestration

```
W0   owner pre-flight (no agents, ~30 min)  →  Fable inline pre-flight (docker, pulls, git log, greps, npm ci in background)
W1   fixflow-discover   Haiku extractors + Sonnet mappers/researchers; gates in their own phase   (wide, cheap)
G1   Fable: branch on the recovery case; confirm/kill hypotheses; issue the owner-decision form; write W2 briefs
W2   fixflow-deep-dive  Opus analysts → Sonnet citation check → Opus fresh-context skeptics (capped)   (narrow, expensive)
G2   Fable: verified register + three decisions (latency path, self-host scope, Odoo shape)
S3   not designed yet (phase plan + Opus critics; per-phase implementation recipes)
```

Discovery is **judgement-free**: Stage-1 agents return constants, lines, declared names,
commands and exit codes — never a comparison, a severity, or a verdict. Comparing a 20 s dwell
to a 15 s budget is G1's or O-01's job. This stops a Stage-1 impression from becoming a P0 by
inertia, and keeps the G1 reading load bounded by schema, not by prose.

### 4.0 W0 — owner pre-flight (before any agent spends a token)

1. **Fleet data-preservation procedure (today).** Technicians: do not open the app, do not
   clock in or start travel from it, do not tap Discard on anything, do not update, uninstall,
   clear data, or factory-reset the phone; keep it charged. This stops the *foreground* drains,
   which are the only live destructive paths now (§1). It is **not** the release condition.
   Phones are released to sync only by the drain protocol (O-10), never by "a backend answers".
2. **Old hostname control.** In the Railway dashboard: does the project/service still exist and
   can the generated subdomain be bound (or regenerated with the same name)? If yes, the only
   safe things that hostname may ever do are **hang** (accept the connection, send nothing for
   more than 15 s, then close: the phones' client aborts as a connectivity error and keeps
   everything) or **proxy** to the recovered backend. **Not a 503**: every 5xx counts toward
   the phones' five-attempt poison cap and parks the item (W2 O10-F3). **Never a 2xx or 204**:
   the phones treat any OK answer as "landed" and delete the queued item (O10-F4). If the
   hostname cannot be controlled, say so — the drain protocol then relies on the APK update
   alone.
3. **APK update compatibility.** From EAS: the keystore fingerprint used for the installed
   build, and whether that credential set is still in the project (`eas credentials`). From
   one phone: `adb shell dumpsys package com.fixflow.technician` → `versionCode`,
   `lastUpdateTime`, signing certificate digest. An in-place update preserves app data only
   with the **same application id and a compatible signing certificate**; an uninstall erases
   the queues. If the signatures differ, the drain protocol must find another path before any
   install.
4. **Supabase:** project status, the pause date, and the restore deadline the dashboard shows.
   If restorable, restore now, or at least download the logical backup it offers. Record the
   Postgres major (expected 17).
5. **Cloudflare R2:** list `backups/db/` in the `job-media` bucket; note the newest key date
   (`backup_retention_days` = 30; pruning runs only after a successful dump, so the last 30
   nightly dumps before death should be there).
6. **Railway:** project and billing state (deleted / lapsed / unbound domain), deploy history,
   last successful deploy date.
7. **Sentry (backend project, ingesting since 2026-08-03):** last event date. A *clue* to when
   traffic stopped, not an outage timestamp — an idle backend emits nothing.
8. **EAS:** build list — commit hash, profile and date of the APK installed on the phones (H14).
9. **The workshop's actual coordinates** and whether the manager ever set the fence in the web
   Settings (H4).
10. **Docker Desktop started** on this machine (§8).

Outputs 4–8 decide the G1 branch: (a) Supabase restorable, (b) R2 dump only, (c) nothing but
the phones. Outputs 2–3 are hard inputs to O-10.

### 4.1 Fable inline pre-flight (no agents)

```bash
docker info --format '{{.ServerVersion}}'                      # must print; else stop
docker pull python:3.12-slim && docker pull postgres:16-alpine   # so no agent pays for pulls
node -v                                                         # 24 here; CI is 22
git log --stat --format='%h %s' 906b990..HEAD                  # → args.gitLog (S-06, citation checkers)
git diff --name-only 906b990..HEAD                              # → args.changedFiles
grep -h "^revision\|^down_revision" backend/alembic/versions/*.py            # → args.migrationChain
grep -n "INSERT INTO\|NOT VALID" backend/alembic/versions/*.py              # → args.migrationSeeds
test -d "$USERPROFILE/.fixflow-cache/expo-src/expo-location-18.0.10"         # → args.expoSrc
( cd technician-app && SENTRY_CLI_SKIP_DOWNLOAD=1 npm ci --no-audit --no-fund ) &   # background; S-07a waits for it
```

### 4.2 W1 — `fixflow-discover`

| ID | Model / effort | Scope (read-only unless stated) | Schema | Notes |
| --- | --- | --- | --- | --- |
| H-01 `extract-endpoints` | haiku / **medium** | every `@router.*` in `backend/app/features/*/router.py`: method, full path (prefix from `main.py`), slice, and the **declared** dependency names verbatim at three syntactic places — router-level `dependencies=[...]`, decorator `dependencies=[...]`, parameter annotations. Never infer authorisation; `none_declared` is a literal observation | `ENDPOINTS` | O-05 is told `none_declared` means "look at the service layer", not "unauthenticated" |
| H-02 `extract-config` | haiku / low | every `Settings` field (`core/config.py`): name, type, default, `is_secret` (by name pattern); every hardcoded external host in the repo (railway.app, supabase, r2.cloudflarestorage, sentry.io, googleapis, fcm, expo.dev) with file:line | `CONFIG` | feeds O-05, O-08 |
| H-03 `extract-mobile-constants` | haiku / low | every AsyncStorage key, TaskManager task name, queue cap, interval/timeout/debounce/radius/accuracy constant in `technician-app/src` with file:line and literal value | `CONSTANTS` | feeds O-01, O-03 |
| S-01a `map-mobile-background-js` | sonnet / medium | the JS side only: geofence/ping/travel triggers, what runs headless, every network call made in a headless path **with its timeout constant and line** (no comparison to any budget), every `isRunning()`/early-return site, permission request sites, notification channel sites, re-registration sites, provider checks (or their absence) | `MAP` | no hypothesis verdicts; the `hypotheses` tag is routing only |
| S-01b `map-expo-native` | sonnet / medium | a **fixed question list** against `args.expoSrc`: manifest receivers/actions; `restoreTasks()` on boot; how a geofence broadcast becomes JS execution and what bounds it (`MAX_TASK_EXECUTION_TIME_MS`, `jobFinished`, headless loader in `expo-modules-core`); `GeofencingRequest` initial trigger and expiry; FGS type and start conditions; what `hasStartedLocationUpdatesAsync` tests; what a repeated `startLocationUpdatesAsync` does. Fallback ladder in §8 | `MAP` | replaces any need for `npm ci` or GitHub |
| S-03 `map-backend-location-truth` | sonnet / medium | `attendance/` + `jobs/` ingestion of punches, presence, pings, travel samples: trust windows, flags, `no_data` derivation, board/grid/tech_days, `derive_route`, verdicts, and which web pages render each. Facts tagged H7/H12/H18 are forwarded to O-03/O-04 by the script | `MAP` | uses Grep + ranged Read on the two ~1.9k-line service files |
| S-04 `map-money-and-outbox` | sonnet / medium | `job_payment`/`job_completion`/bill fields, `job_event` kinds + payloads, `dispatch_cursor`, `staff_ledger`/chain/advances, `shop_setting`, `run_weekly_export` as the export template, every manager approval primitive that exists; the docs' R2/§3.15 shape | `MAP` | input to O-07 |
| S-05 `map-web-and-ops` | sonnet / medium | manager web features, fetch/refresh patterns, demo-labelled surfaces, token storage, `Dockerfile.web` serving, the ops console and what `ops-server.mjs` needs from Railway/Sentry | `MAP` | feeds O-05, O-08 |
| S-06 `reconcile-register` | sonnet / **high** | every handoff register item (A1–A7, B1–B5, C1–C5, §4.4 rows, §4.5, §5.2), lifecycle follow-ups 1–10, ADR follow-through. **Diff-restricted with a one-hop check:** an item is `UNCHANGED_SINCE_HANDOFF` only when neither its cited files **nor any file they import / that imports them** (one grep hop) intersects `args.changedFiles`, and no `core/config.py` or settings-registry change touches it; otherwise it is checked in depth against `args.gitLog`. Also diffs the field-APK commit (from W0) → `main` for the mobile background files | `REGISTER` | a `FIXED` here **narrows** an Opus brief to "claimed fixed at file:line — confirm or refute"; it never removes an analyst |
| S-07a `node-gates` | sonnet / medium (**runs commands**, own phase) | waits for the background `npm ci` (or runs it: `SENTRY_CLI_SKIP_DOWNLOAD=1 npm ci --no-audit --no-fund`, root then `technician-app`, never both at once), then the CI gates: root `lint`, `format:check`, `test`, `build`; mobile `typecheck`, `test -- --ci`, `expo export --platform android`. Logs to the scratchpad, reports tails. Any failure re-run once under `node:22` before being reported. **Never `expo prebuild` or `expo run:android` in place** | `COMMANDS` | writes only `node_modules/`, `dist/`, `coverage/` |
| S-07b `backend-gates` | sonnet / medium (**runs commands**, own phase) | the Docker recipe in Appendix A, verbatim: ruff, mypy, lint-imports, `alembic upgrade head`, `alembic check`, pytest, plus pip-audit in the same container; the result is the `GATE[...] EXIT=` lines, not the container's exit code alone. **If W0 produced a dump:** restore it into the **separate Postgres 17 stack in Appendix C** (never the test DB, never Postgres 16) following `docs/RUNBOOK-BACKUPS.md`, then run the read-only query set in Appendix B (active fence row, exact `count(*)` per table, max timestamp per event table, presence `confirmed`/`accuracy_m` distribution, the three standalone sequences, `alembic_version`) | `COMMANDS` + `DUMPFACTS` | first command is `docker info`; on failure return `blocked:["DOCKER_ENGINE_DOWN"]`, never try to start Docker |
| S-08 `dependency-and-secret-scan` | haiku / low (**runs commands**) | `npm audit --package-lock-only --omit=dev --json` (root, mobile); `git grep` + `git log -p -S` for key/DSN/private-key patterns; what is committed in `app.json`, `google-services.json`, `eas.json`. **Redaction rule:** returns file, pattern name, line *number*, first commit, and a fingerprint (`sha256` prefix of the matched value) — never the value, never a quoted line; the agent must not paste matches into its reasoning, logs or output, because every output is journaled. "Acceptable?" is O-05's call | `SCAN` | needs no `node_modules`; pip-audit lives in S-07b |
| S-09 `latency-facts` | sonnet / high | ADR-0001's measurements with line cites; the query count behind each `_detail()` call site in `jobs/service.py`; pool settings in `core/db.py` (`pool_pre_ping` is already `True`); what `/api/ops/metrics` can measure; what a Karachi-local host changes per leg | `MAP` | the latency *decision* is Fable's at G2 |
| R-01 `research-android-oem-background` | sonnet / medium (**web**) | per-OEM kill/autostart behaviour and the intents that open each OEM's autostart/battery screens (MIUI/HyperOS, ColorOS, FuntouchOS, Realme UI); Android 12–15 FGS-from-background and geofence rules; min-radius guidance; unused-app permission auto-reset; background-data restriction; Google Location Accuracy; `expo-location` 18 / SDK 52 Android issues — **first from the tarballs' CHANGELOG/README in `args.expoSrc`**, then the web | `RESEARCH` | every fact carries `fetched_in_run` |
| R-02 `research-odoo-api` | sonnet / medium (**web**) | current Odoo Online version and external APIs (XML-RPC, JSON-RPC, the newer JSON API), API keys, **which plans allow the external API / Studio / custom fields** (this gates O-07's tier), External IDs and `ir.model.data` dedupe, payloads for `account.move` (customer invoice) and `account.payment`, partner/journal prerequisites, rate limits, CSV import dedupe semantics | `RESEARCH` | |
| R-03 `research-selfhost-stack` | sonnet / medium (**web**) | Cloudflare Tunnel + Access, Caddy, Postgres 17 backup/restore tooling, MinIO vs keeping R2 (phones PUT media straight to R2 today, bypassing home upload bandwidth), GlitchTip/Uptime Kuma/Dozzle, Docker restart + UPS/power-loss patterns, CGNAT on Pakistani ISPs, Linux hardening baseline | `RESEARCH` | |

Cut from v1: H-04 (two greps, now inline), H-05 (one `git log`, now `args`), S-02 (the offline
engine is ~1.7k lines that O-03 must read anyway; CLAUDE.md lists every file), O-09 (now S-09).

### 4.3 W1 script contract

- Deterministic issue order and **stable, unique labels** (`H-01`, `S-07b`, `S-07b#retry`) —
  resume depends on both. No `Date.now()`; stamps come in via `args`.
- Long agents (S-07a, S-07b, S-08) are issued first in their own `phase('Gates')` and are not
  awaited by the reader slices; their write-set (`node_modules/`, `dist/`, `coverage/`,
  Docker) is disjoint from everything the readers read.
- Readers run in slices of **five** with a **circuit breaker**: two or more *fresh* nulls in
  one slice means the session limit is suspected; the script stops issuing, accounts for every
  unstarted id, logs `HALT`, and returns. Resume replays the identical call order (completed
  agents come from cache; dead ones replay their null instantly) and then issues retries **at
  the tail with a per-attempt label** (`#retry<args.attempt>`), so the cached prefix stays
  intact and a journaled null is never re-served as a result.
- Every `run()` resolves to a value or `null` — a rejected promise can never escape the return
  contract.
- Return contract: `{ results: {id → object}, missing: [id], not_started: [id],
  halted_at_slice, coverage }`. **G1 rule:** every id in `missing` **or** `not_started` is
  re-run or explicitly waived in writing, and `coverage` must read 16/16 or carry a written
  waiver per gap; an absent result is never treated as "nothing found".
- Output discipline: command agents redirect `npm`/`pytest`/`docker` output to scratchpad logs
  and return tails + exit codes; mappers return at most 40 facts, each evidence string ≤ 200
  chars; FINDINGS are sliced to 12 in the script with the dropped count logged (no silent caps).

```js
// W1 skeleton (JS, not TS). TASKS = [{id, model, effort, schema, phase, brief, long}]
// args: { today, attempt (1, 2, 3…), knownDead: [ids that were null in the previous run], …inputs }
const LONG = TASKS.filter(t => t.long), SHORT = TASKS.filter(t => !t.long)
const known = new Set(args.knownDead || [])
const run = (t, suffix = '') => agent(CONTEXT + t.brief, { label: t.id + suffix, phase: t.phase, model: t.model, effort: t.effort, schema: t.schema })
  .then(r => { log((r ? 'done ' : 'NULL ') + t.id + suffix); return r })
  .catch(e => { log('ERROR ' + t.id + suffix + ': ' + (e && e.message)); return null })   // never escapes the contract
// Pass 1 — identical call order to any previous run: completed agents replay from cache, dead ones replay null instantly.
phase('Gates'); const longP = LONG.map(t => run(t))
phase('Discover'); const out = {}, missing = [], not_started = []; let halted = null
for (let i = 0; i < SHORT.length; i += 5) {
  const slice = SHORT.slice(i, i + 5)
  const rs = await parallel(slice.map(t => () => run(t)))
  slice.forEach((t, k) => rs[k] ? (out[t.id] = rs[k]) : missing.push(t.id))
  const fresh = slice.filter((t, k) => !rs[k] && !known.has(t.id)).length
  if (fresh >= 2) {                                   // session limit suspected: stop issuing, account for everything, return
    halted = i; SHORT.slice(i + 5).forEach(t => not_started.push(t.id)); break
  }
}
const lr = await Promise.all(longP)                   // every promise already resolves to a value or null
LONG.forEach((t, k) => lr[k] ? (out[t.id] = lr[k]) : missing.push(t.id))
// Pass 2 — retries at the TAIL with a per-attempt label: the cached prefix stays intact, a cached null is never re-served.
if (halted === null) {
  phase('Retry')
  for (const id of [...missing]) {
    const r = await run(TASKS.find(t => t.id === id), '#retry' + args.attempt)
    if (r) { out[id] = r; missing.splice(missing.indexOf(id), 1) }
  }
} else log('HALT at slice ' + halted + '; resume with attempt=' + (args.attempt + 1) + ' knownDead=' + JSON.stringify(missing))
return { results: out, missing, not_started, halted_at_slice: halted, coverage: Object.keys(out).length + '/' + TASKS.length }
```

### 4.4 G1 — the first Fable gate

1. **Branch on the recovery case** from W0: (a) Supabase restorable → S-07b's dump facts
   stand in for prod; (b) R2 dump only → same, plus "the dump is the new prod" becomes a
   constraint on O-08; (c) nothing survives → the phones are the only data source — and they
   hold **pending writes plus per-tech read caches** (`jobsCache.ts`, `todayCache.ts`), not a
   database backup, so recovery is partial by construction. In every case the first
   implementation phase is the drain protocol O-10 designs: a backend on an owned domain, an
   in-place APK update, then a controlled drain — and nothing else ships before it.
2. Each hypothesis moved to SETTLED / weakened / killed / untestable, with the fact IDs that
   moved it. A `missing` W1 id is re-run or waived in writing.
3. **Demote, never delete:** a `FIXED` from S-06 rewrites the relevant O-03/O-04 brief line to
   "claimed fixed in `<hash>` at file:line — confirm or refute"; it does not drop the analyst.
4. The W2 briefs, one paragraph each, naming files, the hypotheses to rank, the settled facts
   to take as given, and the reading rules (§5.3).
5. The **owner-decision form** that gates O-07 and O-08 (below). W2 may start without the
   answers; O-07 and O-08 may not.
6. Reading budget: G1 reads results by id from the journal, in the order the briefs need them;
   it never loads all sixteen objects into one pass.

**Owner-decision form (issued at G1):**

| For | Decision |
| --- | --- |
| Odoo (O-07) | Does the org exist; edition, version, plan, and whether that plan allows the external API (R-02 answers the plan question first). Which record types are "pakka" (payments only? bills? materials/stock? payroll/advances?). Who approves and at what unit (per payment / daily close / weekly close). Full-fidelity export by default vs selective declaration — the owner's explicit call, per the gap analysis flag. Tax regime and chart of accounts (Sindh services tax vs federal goods). Customer mapping (per-customer partner with PII, or one cash partner). |
| Self-host (O-08) | Where the box physically sits (the only recorded fence is at an Islamabad/Wah latitude, not Karachi). Hardware, UPS, ISP, static IP vs CGNAT. The owned domain for the Tunnel and the baked APK URL. Which externals may stay (R2, FCM, Sentry, EAS). RPO/RTO and who answers the phone. Whether the web and ops consoles move too. |

If Odoo answer 1 is "no org" or "no API", O-07's **scope** narrows to the Phase-1 CSV export
with External IDs. Its **tier does not drop**: stable identifiers, duplicate-import handling,
corrections as reversal rows, the approval boundary and the reconciliation view are money
invariants that hold whatever the transport is, and they are what Opus is being paid to get
right.

### 4.5 W2 — `fixflow-deep-dive`

Analysts receive the relevant maps as `args`, obey the reading rules (§5.3), and return
`FINDINGS` with **every `defect`/`risk` claim they can evidence, ranked by severity**, each
with a file:line and a *failing condition* (the input or state under which the claim is
observable). The script never truncates a P0 or P1; anything an analyst cannot fully write up
goes in `backlog` as title + file:line + severity, so an omission is visible rather than
silent. The cap on **verification spend** (§4.6) is separate from reporting. `gap`/`design`
items are unlimited and unverified.

| ID | Model / effort | Lens | Inputs |
| --- | --- | --- | --- |
| O-01 `geofence-end-to-end` | opus / **xhigh** | the single Q1 analyst: ranks H1, H2, H3, H9, H10, H11, H16, H17 for this fleet; labels each "field APK" / "main only"; outputs the discriminating field protocol | S-01a, S-01b, R-01, H-03, S-06 (APK diff), dump facts if any |
| O-03 `offline-sync-correctness` | opus / high | queue semantics, 401 pause UX (H5), outage behaviour (H6/H7), caps, drain ordering, `inTransit` divergence, unreachable failed create; every register item S-06 says is fixed is "confirm or refute" | CLAUDE.md's offline-engine file list, H-03, S-03 facts tagged H7, S-06 |
| O-04 `backend-location-truth` | opus / high | whether server + manager views represent phone data honestly: trust windows (H12), `no_data` math, A5 adjustments, timezone, ping ceiling, and what the board would need to detect a silent kill (H18) | S-03, H-01, dump facts |
| O-05 `security-external-attacker` | opus / high | unauthenticated surface (from declared deps **and** service-layer checks), JWT/PIN/lockout, per-IP limiter per replica, CORS, security headers, `ops-server.mjs`, webhooks, signed URLs, dependency CVEs, committed credentials (the "acceptable?" call) | H-01, H-02, S-05, S-08 |
| O-06 `security-insider-and-operator` | opus / high | technician abuse (mock location, evidence gaming, shared devices), manager abuse, operator exposure (DB superuser via pooler, unencrypted dumps, secrets at rest), and **the tunnel/exposure threat model of a home server** | H-02, S-03, S-04, R-03 |
| O-07 `odoo-pakka-khata-design` | opus / high (scope, not tier, follows the owner form) | staging table + manager approval + idempotent push **or** External-ID CSV export + attempt log + reconciliation view; stable ids, duplicate-import handling, corrections as reversals, the approval boundary; which app records map to which Odoo documents; migration sketch from 0047; what the chosen plan permits | S-04, R-02, `args.migrationChain/Seeds`, owner form |
| O-08 `selfhost-architecture-draft` | sonnet / high (**after** the owner form) | compose topology, what stays external, cutover from a dump **with the H7/H15 constraint** (no old hostname may answer 4xx; new APK on an owned domain first), expected latency per S-09, failure modes (power, ISP, hardware), runbook skeleton | H-02, R-03, S-05, S-07b, S-09, owner form |
| O-10 `fleet-drain-protocol` | opus / high (**pipelined after O-03**) | the ordered, verifiable procedure that gets the phones' queued data into the recovered backend: make the old hostname safe (503 stub, or unreachable) or accept that the APK update is the only guard; the in-place APK update (same application id + compatible signing certificate per W0 §3 — **never uninstall**); the 404-classification fix (an edge 404 without a FastAPI `detail` body is transient); re-login after the unavoidable 401 (H5); a **bounded drain window** that widens the env-tunable ceilings (`FIXFLOW_ATTENDANCE_DEVICE_TIME_BACKDATE_CEILING_HOURS`, `FIXFLOW_ATTENDANCE_PING_BACKDATE_CEILING_HOURS`, `FIXFLOW_JOBS_GPS_BACKDATE_CEILING_HOURS`) with honest flags, then restores them; what a restored DB vs a fresh DB can accept (seeded technician ids vs job ids that no longer exist); the before/after counts (failed-list sizes per phone, server row deltas) that prove nothing was lost. Its output is the **release condition** for the fleet | W0 §2–3 and the recovery case, H-02, H-03, S-03, S-04, O-03's queue findings |

Where O-01 would have had a second "app-logic" analyst in v1, the second lens now lives in
its **skeptic**: the P0 skeptic for O-01's ranking is briefed to explain the field symptom
with app-logic causes alone and to refute the device-layer ranking if it can. Diversity is
bought at verification, not by paying Opus twice to read the same 1.4k lines.

### 4.6 Verification policy

1. **Citation check — Sonnet / high, one per analyst, batched over all its defect/risk
   claims.** Re-locates every quote by content, checks it against `args.gitLog` and
   `args.changedFiles`, and marks each `LOCATED` / `MOVED` / `DEAD_CITATION` /
   `ALREADY_FIXED(<hash>)`. It establishes that the cited text exists where claimed — nothing
   more; behaviour is the skeptic's question. A `DEAD_CITATION` claim goes to the open-risks
   list as `unverifiable`, not to the register.
2. **Fresh-context skeptic — Opus / xhigh**, one per surviving **P0**, and per surviving **P1
   that touches** the outbox, the job lifecycle, the ledger/chain, auth, or the location
   privacy time bounds. Other P1s share one Opus / high skeptic per analyst. The skeptic
   receives the claim, its evidence and its failing condition **only** — not the analyst's
   reasoning. **Verdict rules:** `CONFIRMED` requires the path traced from the cited lines to
   the failing condition; `REFUTED` requires *positive* counter-evidence (a line that prevents
   the failing condition, or a commit that removed it); when the skeptic can do neither, the
   verdict is `UNVERIFIABLE` with `what_would_settle_it` filled in. The bias is "never promote
   without evidence", not "declare refuted without evidence". **Hard cap: 12 Opus skeptics per
   W2 run**; claims beyond the cap go to the open-risks list as `unverified` — never dropped.
   This stage will cross the harness's agent/token warnings; that is deliberate.
3. **Web re-check — Sonnet / medium, one agent:** re-fetches every URL cited by O-01's top
   three hypotheses and R-02's plan-gating facts, confirming the statement is on the page.
   Anything not confirmed is downgraded to `inferred` before G2.
4. No materiality skeptic: severity is re-set by Fable at G2 with the whole program in view.
5. **Three buckets at G2**, derived in the script from `verdict`: the **verified register**
   (`CONFIRMED`, `PARTIALLY`); the **open-risks list** (`UNVERIFIABLE`, `unverified` overflow,
   `DEAD_CITATION`), each carrying what would settle it; and **refuted** (recorded with the
   skeptic's counter-evidence; every refuted P0 is spot-read by Fable).
6. The W2 script uses the same breaker/retry shape as §4.3, pipelined per analyst so citation
   checks start as each analyst finishes; O-10 is pipelined after O-03.

### 4.7 G2 — the second Fable gate

1. **The verified register**: every surviving claim with its corrected severity, owner,
   effort, APK/main label, and the hypothesis it settles.
1b. **The open-risks list**: every `UNVERIFIABLE`, over-cap or dead-citation claim with what
   would settle it and which later phase must do so. A P0 on this list blocks the phase that
   touches its area until it is settled; it is never silently absent from the plan.
2. **Three decisions**, each with the evidence that forced it: the latency path (region move
   vs straight to self-host vs levers only — on S-09's facts, as a proposal with a measurement
   plan), the self-host scope (what moves, what stays on R2/FCM/Sentry), and the Odoo shape
   (batch export first vs supervised live push).
3. The conflicts the orchestrator adjudicated and why, written so a later session can disagree
   with reasons rather than re-run everything.

Only after G2 does phase design start.

---

## 5. Shared contracts every brief uses

### 5.1 The CONTEXT block (prepended verbatim to every subagent prompt)

```
PROJECT CONTEXT (established by the orchestrator; do not re-derive):
- Repo C:\Users\User\Documents\projects\EMS_workshop1 (Windows). CLAUDE.md is already injected; trust it.
- Program goals: field-reliable geofencing + location tracking + offline sync; a manager-approved
  "pakka khata" flowing to Odoo while the app stays the operational "kacha khata"; no security
  holes; acceptable latency; near-future self-hosting on a home server the owner controls.
- Today is <args.today>. Last commit on main: a31924a (2026-08-03). 10 commits since the handoff 906b990.
- PRODUCTION: both documented Railway URLs return Railway's edge 404 "Application not found".
  The phones classify that 404 as definitive and drop/park queued data. Treat prod as gone unless
  args.recoveryCase says otherwise. The field APK is older than main (args.apkCommit if known).
- Fleet: Xiaomi/Oppo/Vivo-class Android. attendance_event had 9 rows lifetime when last measured.
  The migration seed is an inactive (0,0) placeholder fence; the live fence row is DB-only.
- Settled facts you take as given (do not re-investigate): see args.settled (the §2.1 SETTLED rows).
- Prior registers to cite, not re-summarise: docs/HANDOFF-2026-07-28-open-work.md,
  docs/lifecycle-audit-followups-2026-07.md, docs/adr/0001-database-region-topology.md,
  docs/requirements-2026-07-gap-analysis.md (R2 Odoo), docs/BACKEND-REQUIREMENTS-2026-07.md §3.15.
RULES: read-only unless your brief says "runs commands". Cite every claim as "path:line — quote".
Mark each fact VERIFIED-IN-CODE / VERIFIED-BY-COMMAND / WEB (URL fetched in this run) / INFERRED.
Return constants, lines and declared names; never a severity or a verdict unless your schema has
that field. Fewer well-evidenced items beat many speculative ones. Your final output is consumed by
a program: return the structured object only.
```

### 5.2 Output schemas (JSON Schema; object root, required ⊆ properties)

```js
const DEP = { type: 'string' }   // declared dependency name, verbatim (e.g. "Depends(get_current_principal)", "CurrentManager", "none_declared")
const ENDPOINTS = { type: 'object', additionalProperties: false, properties: {
  rows: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
    method: { type: 'string' }, path: { type: 'string' }, slice: { type: 'string' },
    router_level_deps: { type: 'array', items: DEP }, decorator_deps: { type: 'array', items: DEP }, param_deps: { type: 'array', items: DEP },
    file_line: { type: 'string' } },
    required: ['method', 'path', 'slice', 'router_level_deps', 'decorator_deps', 'param_deps', 'file_line'] } } },
  required: ['rows'] }

const CONFIG = { type: 'object', additionalProperties: false, properties: {
  settings: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
    name: { type: 'string' }, type: { type: 'string' }, default: { type: 'string' }, is_secret: { type: 'boolean' }, file_line: { type: 'string' } },
    required: ['name', 'type', 'default', 'is_secret', 'file_line'] } },
  hosts: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
    host: { type: 'string' }, file_line: { type: 'string' } }, required: ['host', 'file_line'] } } },
  required: ['settings', 'hosts'] }

const CONSTANTS = { type: 'object', additionalProperties: false, properties: {
  rows: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
    kind: { type: 'string', enum: ['storage_key', 'task_name', 'queue_cap', 'interval_ms', 'timeout_ms', 'debounce_ms', 'radius_m', 'accuracy_m', 'other'] },
    name: { type: 'string' }, value: { type: 'string' }, file_line: { type: 'string' } },
    required: ['kind', 'name', 'value', 'file_line'] } } },
  required: ['rows'] }

const MAP = { type: 'object', properties: {
  area: { type: 'string' },
  summary: { type: 'string' },                                   // <= 300 words
  facts: { type: 'array', items: { type: 'object', properties: {   // brief: at most 40
    id: { type: 'string' }, fact: { type: 'string' },
    evidence: { type: 'array', items: { type: 'string' } },      // "path:line — quote", <= 200 chars each
    source_kind: { type: 'string', enum: ['code', 'doc', 'command', 'web', 'inferred'] },
    hypotheses: { type: 'array', items: { type: 'string' } } },  // routing only, not a verdict
    required: ['id', 'fact', 'evidence', 'source_kind'] } },
  anomalies: { type: 'array', items: { type: 'string' } },        // neutral, evidenced, no severity
  questions_for_deep_dive: { type: 'array', items: { type: 'string' } },
  files_or_urls: { type: 'array', items: { type: 'string' } } },
  required: ['area', 'summary', 'facts', 'anomalies', 'questions_for_deep_dive', 'files_or_urls'] }

const RESEARCH = { type: 'object', properties: {                       // facts MAY be empty when tool_status is web_unavailable; never fabricate to fill it
  area: { type: 'string' },
  tool_status: { type: 'string', enum: ['web_ok', 'web_partial', 'web_unavailable'] },
  urls_attempted: { type: 'array', items: { type: 'string' } },
  facts: { type: 'array', items: { type: 'object', properties: {
    id: { type: 'string' }, fact: { type: 'string' }, url: { type: 'string' },
    fetched_in_run: { type: 'boolean' }, source_kind: { type: 'string', enum: ['web', 'local_source', 'inferred'] },
    hypotheses: { type: 'array', items: { type: 'string' } } },
    required: ['id', 'fact', 'url', 'fetched_in_run', 'source_kind'] } },
  anomalies: { type: 'array', items: { type: 'string' } },
  questions_for_deep_dive: { type: 'array', items: { type: 'string' } } },
  required: ['area', 'tool_status', 'urls_attempted', 'facts', 'anomalies', 'questions_for_deep_dive'] }

const REGISTER = { type: 'object', properties: {
  items: { type: 'array', items: { type: 'object', properties: {
    id: { type: 'string' }, source: { type: 'string' }, title: { type: 'string' },
    status: { type: 'string', enum: ['FIXED', 'PARTIAL', 'OPEN', 'UNCHANGED_SINCE_HANDOFF', 'UNCLEAR'] },
    evidence: { type: 'array', items: { type: 'string' } }, note: { type: 'string' } },
    required: ['id', 'source', 'title', 'status', 'evidence'] } },
  apk_to_main_diff: { type: 'array', items: { type: 'string' } },
  summary: { type: 'string' } },
  required: ['items', 'apk_to_main_diff', 'summary'] }

const COMMANDS = { type: 'object', properties: {
  preflight: { type: 'object', properties: { node: { type: 'string' }, npm: { type: 'string' }, docker_server: { type: 'string' } },
    required: ['node', 'npm', 'docker_server'] },
  runs: { type: 'array', items: { type: 'object', properties: {
    gate: { type: 'string' }, cwd: { type: 'string' }, command: { type: 'string' },
    exit_code: { type: 'integer' }, duration_s: { type: 'number' }, summary: { type: 'string' }, tail: { type: 'string' } },
    required: ['gate', 'command', 'exit_code', 'summary'] } },           // exit_code -1 = not run; reason in blocked
  blocked: { type: 'array', items: { type: 'string' } }, notes: { type: 'string' } },
  required: ['preflight', 'runs', 'blocked'] }

const DUMPFACTS = { type: 'object', properties: {
  restored: { type: 'boolean' }, dump_key: { type: 'string' },
  rows: { type: 'array', items: { type: 'object', properties: {
    query: { type: 'string' }, result: { type: 'string' } }, required: ['query', 'result'] } } },
  required: ['restored', 'rows'] }

const SCAN = { type: 'object', additionalProperties: false, properties: {
  advisories: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
    tool: { type: 'string' }, package: { type: 'string' }, advisory: { type: 'string' }, severity_reported: { type: 'string' }, fix_version: { type: 'string' } },
    required: ['tool', 'package', 'advisory', 'severity_reported', 'fix_version'] } },
  committed_values: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {   // NEVER the value or the line text
    file: { type: 'string' }, pattern: { type: 'string' }, line_no: { type: 'integer' },
    fingerprint: { type: 'string' },                                     // first 12 hex of sha256(matched value)
    committed_since: { type: 'string' } },
    required: ['file', 'pattern', 'line_no', 'fingerprint', 'committed_since'] } } },
  required: ['advisories', 'committed_values'] }

const FINDINGS = { type: 'object', properties: {
  area: { type: 'string' },
  hypothesis_ranking: { type: 'array', items: { type: 'object', properties: {
    id: { type: 'string' }, verdict: { type: 'string', enum: ['supported', 'weakened', 'killed', 'untestable'] },
    likelihood_for_this_fleet: { type: 'number', minimum: 0, maximum: 1 },
    in_field_apk: { type: 'string', enum: ['yes', 'no', 'unknown'] },
    discriminating_test: { type: 'string' } },
    required: ['id', 'verdict', 'likelihood_for_this_fleet', 'in_field_apk', 'discriminating_test'] } },
  findings: { type: 'array', items: { type: 'object', properties: {     // brief: at most 6 defect/risk; script slices + logs
    id: { type: 'string' }, title: { type: 'string' },
    severity: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
    category: { type: 'string', enum: ['defect', 'risk', 'gap', 'design'] },
    claim: { type: 'string' }, failing_condition: { type: 'string' },
    evidence: { type: 'array', items: { type: 'string' } },
    impact: { type: 'string' }, fix_sketch: { type: 'string' },
    effort: { type: 'string', enum: ['S', 'M', 'L'] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    in_field_apk: { type: 'string', enum: ['yes', 'no', 'unknown'] } },
    required: ['id', 'title', 'severity', 'category', 'claim', 'failing_condition', 'evidence', 'impact', 'fix_sketch', 'effort', 'confidence', 'in_field_apk'] } },
  backlog: { type: 'array', items: { type: 'object', properties: {              // claims seen but not written up — never silently dropped
    title: { type: 'string' }, file_line: { type: 'string' }, severity: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] } },
    required: ['title', 'file_line', 'severity'] } },
  challenges_settled: { type: 'array', items: { type: 'object', properties: {   // a settled fact the analyst believes is wrong, with evidence
    settled_id: { type: 'string' }, claim: { type: 'string' }, evidence: { type: 'array', items: { type: 'string' } } },
    required: ['settled_id', 'claim', 'evidence'] } },
  open_questions: { type: 'array', items: { type: 'string' } } },
  required: ['area', 'hypothesis_ranking', 'findings', 'backlog', 'challenges_settled', 'open_questions'] }

const CITATIONS = { type: 'object', properties: {
  rows: { type: 'array', items: { type: 'object', properties: {
    finding_id: { type: 'string' }, status: { type: 'string', enum: ['LOCATED', 'MOVED', 'DEAD_CITATION', 'ALREADY_FIXED'] },
    fixed_by: { type: 'string' }, note: { type: 'string' } },
    required: ['finding_id', 'status', 'fixed_by'] } } },
  required: ['rows'] }

const VERDICT = { type: 'object', properties: {
  finding_id: { type: 'string' },
  verdict: { type: 'string', enum: ['CONFIRMED', 'PARTIALLY', 'REFUTED', 'UNVERIFIABLE'] },
  already_fixed_by: { type: 'string' },                               // '' allowed
  corrected_claim: { type: 'string' },
  corrected_severity: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3', 'NONE'] },
  reasoning: { type: 'string' },
  what_would_settle_it: { type: 'string' },                             // required on UNVERIFIABLE; '' otherwise
  evidence: { type: 'array', items: { type: 'string' } } },
  required: ['finding_id', 'verdict', 'already_fixed_by', 'corrected_severity', 'reasoning', 'what_would_settle_it'] }
```

### 5.3 Briefing and reading rules

- A brief names the **goal, the files, the hypotheses it bears on, what is settled, and what
  "done" returns**. If the orchestrator cannot write that in a paragraph, the task is not
  understood well enough to delegate.
- Analysts: (a) **start** from the files named in the brief or in an input map's
  `files_or_urls`; follow an import or call **one hop** when a claim depends on it, and list
  every extra file read in `open_questions` so the spend is visible; (b) never read a file
  over 300 lines whole — Grep for the symbol and Read a range around the cited line; (c) a
  map fact with `source_kind: code` and a `path:line — quote` evidence may be cited by fact id
  **for context** (a constant, a name, a location); the evidence behind a `defect`/`risk`
  claim must have been read by the analyst itself; (d) take `args.settled` as given, but a
  settled fact may be **challenged** with evidence in `challenges_settled` — the orchestrator
  wants to know; (e) no `npm`, `docker` or `git` commands.
- **Code on `main` yields candidates; device evidence yields conclusions.** The field APK is
  older than `main`, so every Q1 finding is labelled `in_field_apk` and the field protocol,
  not the audit, decides what the phones do today.
- Skeptics get the claim, its evidence and its failing condition **only**, in a fresh context.
- Mappers return constants, lines and names; the `hypotheses` tag routes, it does not judge.
- Every agent is told the *scope* and the *rules*, never which tier it is on.

---

## 6. Why this shape and not a fixed pipeline

- **The expensive thinking goes where evidence is thin.** Q1 has nine rows of field data, a
  dead backend, phones that are still dropping data, and an APK older than `main`. Reading
  code cannot settle it; ranking hypotheses and designing the discriminating field test can.
  That is one Opus `xhigh` analyst on top of Sonnet maps and native-source answers, judged by
  Fable.
- **Discovery is cheap because it is judgement-free and schema-bounded.** A Sonnet fact that
  says "`getToday` is called at `geofence.ts:214` in the headless path; `REQUEST_TIMEOUT_MS =
  15_000` at `api.ts:85`" is extraction. "This overruns the budget" is O-01's sentence.
- **Verification is bought where it moves the plan**: a cheap Sonnet citation pass over
  everything, Opus skeptics only for P0s and invariant-touching P1s, a hard cap, and a second
  lens at the skeptic rather than a duplicate analyst.
- **Two Fable gates instead of a synthesis agent**: the orchestrator reads every result, writes
  Stage-2 briefs with Stage 1 in hand, and records its adjudications with reasons.
- **Owner decisions gate the design agents.** O-07 and O-08 cannot be right without the Odoo
  plan, the pakka record set, the box location and the domain; spending Opus before those
  answers is spending it on a guess.
- **Verification is skeptical about promotion, not about existence.** A claim enters the
  verified register only with traced evidence, but a claim nobody could settle is carried as
  an open risk with its settling test attached — it is never deleted by a verdict of "I could
  not tell".

---

## 7. Cost envelope (order of magnitude, before skills)

| Stage | Agents | Tier mix | Expectation |
| --- | --- | --- | --- |
| W1 | 16 | 4 haiku · 9 sonnet-medium/high · 3 sonnet-web | cheap in tokens; wall-clock set by S-07a/S-07b (25–40 min), which run alongside the readers |
| W2 analysts | 8 | 1 opus-xhigh (O-01) · 6 opus-high (O-03, O-04, O-05, O-06, O-07, O-10) · 1 sonnet-high (O-08, after the owner form) | the main spend |
| W2 verification | ≤ 8 Sonnet citation checks · ≤ 12 Opus skeptics · 1 Sonnet web re-check | bounded by the cap; overflow goes to the open-risks list, logged by id |
| Fable gates | 0 agents | main session | reading by id from the journal; no fan-out |

Fixed overhead per agent (CLAUDE.md ≈ 7.5k tokens + CONTEXT) is why the git log, the migration
greps and the `npm ci` are inline, and why claims are batched per checker. If a run dies on
an account session limit, completed agents are in
`.claude/projects/<proj>/<session>/subagents/workflows/<runId>/journal.jsonl`; resume with
`resumeFromRunId` **and `args.knownDead`** rather than re-running (§4.3).

---

## 8. Harness and machine constraints the scripts must respect

- **Docker engine must be up before W1 launches** (`docker info` prints a version). The owner
  starts Docker Desktop; agents never start, install or reconfigure it. On failure an agent
  returns `blocked: ["DOCKER_ENGINE_DOWN"]` and `runs: []`.
- **Node parity:** CI pins Node 22, this machine has 24. A `jest-expo` / RN 0.76.9 failure on
  24 is re-run under `node:22` (Docker) before it is reported as a repo defect.
- **Never run `expo prebuild` or `expo run:android` in `technician-app/`.** It creates
  `technician-app/android`, which is not gitignored and would make EAS treat the project as
  bare and skip config plugins. `npx expo config --type introspect --json` shows plugin-level
  permissions only; library-manifest permissions (`RECEIVE_BOOT_COMPLETED`) are settled from
  the sources in §1 and their absence from introspect is **not** a contradiction.
- **Expo sources** live at `C:\Users\User\.fixflow-cache\expo-src\<pkg>-<version>\package\`
  (passed as `args.expoSrc`). Fallback ladder for S-01b/R-01: (1) that path; (2)
  `npm pack <pkg>@<exact-version> --pack-destination <new empty dir>` + `tar -xzf`; (3)
  `WebFetch https://unpkg.com/<pkg>@<exact-version>/android/src/main/...`. Never the
  `expo/expo` `sdk-52` branch head, which is not the pinned patch version.
- **Web research:** load `WebSearch`/`WebFetch` via `ToolSearch` first; stop retrying a tool
  after two denials; record `tool_status` and `urls_attempted`. An empty `facts` array with
  `tool_status: web_unavailable`, `WEB_UNAVAILABLE: <topic>` in `anomalies` and the questions
  returned is a **valid, honest result** about coverage; a fact invented to avoid emptiness is
  not. Fable re-runs degraded topics with main-session web access rather than paying Opus to
  reason on `inferred` facts.
- **Postgres majors:** prod is 17 (`backend/Dockerfile` pins `postgresql-client-17` to match
  it); CI and the gate recipe use 16 for tests only. A prod dump is restored into
  **`postgres:17`** (Appendix C), and completeness is measured with exact `count(*)` per
  table, never `pg_stat` estimates.
- **Command agents:** per-command `timeout: 600000`; on a timeout re-check state
  (`docker wait` again) and **never re-issue a mutating command**; redirect output to
  scratchpad logs; fixed container names (`fixflow-w1-db`, `fixflow-w1-gates`,
  `fixflow-w1-audit`) so a second start fails on a name conflict — mechanically no second
  `pytest` against one DB (handoff §2.4 deadlock); `docker rm -f` those names up front is
  intentional cleanup; clean up containers and the user network at the end.
- **Open ranges, no lockfile** in `backend/pyproject.toml`: pip-audit and the pytest baseline
  describe today's resolution, not what prod ran. S-07b says so in `notes`.
- **`.claude/agents/`** holds only `fixflow-explorer.md` today. W1/W2 pass `agentType` only
  for agents whose definition file exists.
- Nothing here touches production. Q2 is W0.

### Appendix A — backend gates recipe (S-07b, Git Bash; pass the script inline, never a mounted `.sh`)

```bash
export MSYS_NO_PATHCONV=1
B='C:/Users/User/Documents/projects/EMS_workshop1/backend'
L="$ARGS_LOGDIR"                       # the scratchpad log dir passed in args; every full log lands here
U='postgresql+asyncpg://postgres:postgres@fixflow-w1-db:5432/fixflow_test'
docker info --format '{{.ServerVersion}}' || { echo DOCKER_ENGINE_DOWN; exit 3; }
docker network create fixflow-w1 2>/dev/null; docker rm -f fixflow-w1-db fixflow-w1-gates 2>/dev/null
docker run -d --name fixflow-w1-db --network fixflow-w1 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=fixflow_test postgres:16-alpine
docker run -d --name fixflow-w1-gates --network fixflow-w1 -v "$B:/src:ro" \
  -e FIXFLOW_DATABASE_URL=$U -e FIXFLOW_TEST_DATABASE_URL=$U -e PYTHONDONTWRITEBYTECODE=1 \
  python:3.12-slim sh -c '
    cp -r /src /work && mkdir -p /work/logs && cd /work || exit 2
    pip install -q -e ".[dev]" pip-audit > /work/logs/setup-pip.log 2>&1 || { echo "SETUP[pip] FAILED"; exit 2; }
    n=0; until python -c "import socket;socket.create_connection((\"fixflow-w1-db\",5432),1)" 2>/dev/null; do
      n=$((n+1)); [ "$n" -ge 60 ] && { echo "SETUP[db] TIMEOUT"; exit 2; }; sleep 1; done
    FAIL=0; i=0
    g(){ i=$((i+1)); "$@" > "/work/logs/gate-$i.log" 2>&1; rc=$?; echo "GATE[$i $*] EXIT=$rc"; [ "$rc" -ne 0 ] && FAIL=1; return 0; }
    g ruff format --check .; g ruff check .; g mypy app; g lint-imports
    g alembic upgrade head; g alembic check; g pytest -p no:cacheprovider -q; g pip-audit
    echo "SUMMARY FAIL=$FAIL"; exit "$FAIL"'
docker wait fixflow-w1-gates > "$L/gates.exit"        # Bash timeout 600000; on timeout run `docker wait` again, NEVER a second `docker run`
docker logs fixflow-w1-gates > "$L/gates.log" 2>&1    # full log to disk; the GATE/SETUP/SUMMARY lines are the result
docker cp fixflow-w1-gates:/work/logs "$L/gate-logs" 2>/dev/null   # per-gate output, for the failing ones
grep -E "^(GATE|SETUP|SUMMARY)" "$L/gates.log"; echo "container exit: $(cat "$L/gates.exit")"
docker rm -f fixflow-w1-gates fixflow-w1-db; docker network rm fixflow-w1
```

Each gate's full output goes to its own file; the agent reports every `GATE[...] EXIT=` line
and the tail of each failing gate's log. `g()` always returns 0 so every gate runs, but the
container exits non-zero if any gate failed; setup failures and a readiness timeout exit
early and are labelled `SETUP[...]`. The read-only mount plus a copy into `/work` keeps every
write out of the repo; the user network avoids host ports and the `docker-compose.yml`
name/port clash; running `alembic` then `pytest` on one DB follows CI. `backend/Dockerfile`
is **not** used for gates: it lacks the `[dev]` extras and spends minutes on a PGDG `pg_dump`
install the gates do not need.

### Appendix B — fixed read-only query set for a restored dump (S-07b, run with `psql` inside the Appendix C container)

```sql
SELECT shop_id, name, center_lat, center_lng, radius_m, is_active FROM attendance_geofence;
-- exact row counts for every public table (the DB is ~300 KB; count(*) is cheap). pg_stat's n_live_tup is an estimate — never use it for completeness.
SELECT string_agg(format('SELECT %L AS t, count(*) AS n FROM %I', relname, relname), ' UNION ALL ' ORDER BY relname)
FROM pg_class WHERE relkind = 'r' AND relnamespace = 'public'::regnamespace \gexec
SELECT 'attendance_event', max(server_time) FROM attendance_event
UNION ALL SELECT 'attendance_presence_event', max(server_time) FROM attendance_presence_event
UNION ALL SELECT 'attendance_ping', max(received_at) FROM attendance_ping
UNION ALL SELECT 'job_event', max(created_at) FROM job_event;                        -- when the fleet last synced
SELECT confirmed, width_bucket(accuracy_m, 0, 200, 10) AS acc_bucket, count(*) FROM attendance_presence_event GROUP BY 1, 2 ORDER BY 1, 2;
SELECT count(*) AS payments, coalesce(sum(amount_paisa) FILTER (WHERE NOT voided), 0) AS non_voided_paisa FROM job_payment;   -- O-08 §3 baseline: Rs 34,400 non-voided at the 2026-08-02 drill
SELECT (SELECT count(*) FROM staff_ledger) AS ledger_rows, (SELECT count(*) FROM staff_ledger_chain) AS chain_rows, (SELECT max(seq) FROM staff_ledger_chain) AS chain_head_seq;
SELECT max(token) FROM job;   -- compare with job_token_seq below (ADR-0001 A1.4); column is job.token (jobs/models.py)
SELECT consumer, last_seq FROM dispatch_cursor;
SELECT sequencename, last_value FROM pg_sequences WHERE schemaname = 'public';        -- the three standalone sequences (ADR-0001 A1.4) must sit at or above their tables' max
SELECT version_num FROM alembic_version;
```

### Appendix C — restore stack for a prod dump (S-07b; separate from the test DB; Postgres 17)

```bash
export MSYS_NO_PATHCONV=1
D="$ARGS_DUMP_PATH"                    # the custom-format dump W0 produced; never a file inside the repo
docker network create fixflow-w1 2>/dev/null; docker rm -f fixflow-w1-restore 2>/dev/null
docker run -d --name fixflow-w1-restore --network fixflow-w1 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=fixflow_restore postgres:17-alpine
n=0; until docker exec fixflow-w1-restore pg_isready -U postgres -q; do n=$((n+1)); [ "$n" -ge 60 ] && { echo "RESTORE[db] TIMEOUT"; exit 2; }; sleep 1; done
docker cp "$D" fixflow-w1-restore:/tmp/prod.dump
# The documented dumps carry the public schema, so a restore into a fresh database raises one benign
# "schema public already exists" error (W2 O08-F06). Drop the empty schema first so --exit-on-error
# only stops on real failures.
docker exec fixflow-w1-restore psql -U postgres -d fixflow_restore -c 'DROP SCHEMA public CASCADE'
docker exec fixflow-w1-restore pg_restore -U postgres -d fixflow_restore --no-owner --no-privileges --exit-on-error /tmp/prod.dump \
  > "$ARGS_LOGDIR/restore.log" 2>&1; echo "RESTORE EXIT=$?"      # non-zero = incomplete; the dump facts are then labelled partial
docker cp "$ARGS_LOGDIR/appendix-b.sql" fixflow-w1-restore:/tmp/b.sql
docker exec fixflow-w1-restore psql -U postgres -d fixflow_restore -v ON_ERROR_STOP=1 -f /tmp/b.sql > "$ARGS_LOGDIR/dumpfacts.txt" 2>&1; echo "QUERIES EXIT=$?"
docker rm -f fixflow-w1-restore
```

Follow `docs/RUNBOOK-BACKUPS.md` for the restore itself; this recipe only fixes the container,
the major version (the dump was taken with `pg_dump` 17 from a 17 server, and loading it into
an older major is not guaranteed) and the separation from the gates' test database, so
restored evidence is never mixed with migration seeds or test state.

---

## 9. Skills that would make these agents materially better (for the owner to source)

Wiring plan: a sourced skill is distilled into a project agent definition in
`.claude/agents/<name>.md` (system prompt + tool list + pinned model), and W1/W2 call it via
`agentType`. That is the reliable injection path for workflow subagents. Skills the main
session should load itself go in `.claude/skills/`.

| Priority | Skill | Which agents it lifts | What it should contain |
| --- | --- | --- | --- |
| **1** | Android background execution for Expo/React Native | S-01a/b, O-01, R-01 | `expo-location`/`expo-task-manager`/`expo-modules-core` headless internals, foreground-service types and start rules on Android 12–15, geofencing API semantics and limits, OEM (MIUI/HyperOS, ColorOS, FuntouchOS, Realme) autostart/battery/data-restriction behaviours **and the intents that open their settings screens**, unused-app permission auto-reset, notification channel behaviour |
| **1** | Android field debugging protocol | O-01, the fix and device-smoke sessions | `adb logcat` filters for Expo/TaskManager/ReactNativeJS, `dumpsys location` / `activity services` / `deviceidle` / `netpolicy` / `package`, how to prove a geofence fired, how to pull a bug report from a technician's phone, how to read `versionCode`/`lastUpdateTime` |
| **1** | Supabase / Railway / Cloudflare R2 recovery operations | W0, O-08 | pausing/restore policy and the dashboard flow, downloading a paused project's logical backup, listing and fetching R2 objects (`rclone`/`aws` CLI), Railway deploy history and the edge-404 semantics, restoring a custom-format `pg_dump` into Postgres 17 with sequence checks |
| **1** | Odoo external API and accounting import | R-02, O-07, later implementation | XML-RPC / JSON-RPC / the newer JSON API, API keys, **Online-plan gating of the API, Studio and custom fields**, External IDs and `ir.model.data`, `account.move` / `account.payment` payloads, partner and journal prerequisites, CSV-import dedupe semantics |
| **2** | Offline-first sync review | O-03, later reviewers | outbox semantics, idempotency keys, reconciliation, head-of-line blocking, failure classification (what an edge 404 vs an app 404 means), what "never delete a write" implies for UX |
| **2** | FastAPI + async SQLAlchemy + Alembic safety | O-04, O-07, implementation sessions | `NOT VALID`/`VALIDATE`, lock behaviour, asyncpg pooling and `pool_pre_ping`, pydantic-settings, migration testing against real Postgres, restore-and-verify |
| **2** | Application security review (ASVS-style) | O-05, O-06 | JWT lifecycle and revocation, PIN policy, per-replica rate limiting, CORS/security headers, signed URLs, webhook signatures, Node zero-dep server hardening, mobile secret hygiene. The existing `anthropic-skills:code-audit` is the base |
| **2** | Self-hosting / homelab operations | R-03, O-08, the migration session | Docker Compose in production, Caddy, Cloudflare Tunnel + Access, Postgres 17 backup/restore (pg_dump vs pgBackRest), MinIO, GlitchTip, Uptime Kuma, UPS/power-loss recovery, Linux hardening, secrets at rest, CGNAT |
| **3** | EAS / Expo build and release | the APK sessions | `eas build --local`, keystore handling, versionCode, internal distribution, whether `expo-updates` should ship so JS fixes skip the EAS queue, how to rebake the API URL safely |
| **3** | Device-level E2E for React Native (Maestro) | verification sessions | the app has no screen-test harness; a Maestro skill is the cheapest route to an automated carry-in/arrival smoke on a real device |
| **3** | Pakistan small-business accounting context | O-07 | cash book vs formal books, Sindh services tax vs federal goods tax split, what FBR-facing books need from an export |
| **project** | FixFlow orchestration skill (written here) | every workflow | the CONTEXT block, schemas, reading rules and routing table in §3–§5, so each session's agents get identical briefs |
| **project** | FixFlow repo conventions | implementation sessions | deploy traps, migration numbering, slice boundaries, PR hygiene — CLAUDE.md + handoff §2 aimed at an implementer |

Haiku candidates once skills exist: the H-0x extractors (already), S-08, table generation from
verified findings, summarising audit output.

---

## 10. Deliberately not in this document

- The phased plan and its one-session-per-phase sizing (designed after G2). Two constraints
  it must carry: the fleet drain protocol (O-10) is the first phase in every recovery case,
  and **a reliability claim about geofencing needs device evidence across the OEMs in the
  fleet** — one phone discriminates hypotheses, it does not validate a fix.
- Per-phase implementation recipes (Sonnet implements well-specified fixes; Opus owns
  outbox/lifecycle/ledger/migration code; Opus reviewers with refute-by-default; worktrees).
- Any production action.

---

## 11. Change log

### v3 (2026-10-31) — after the second external review

**Accepted, with the code facts that confirmed them:**

- **Data preservation is a procedure, not a notice.** Verified: headless presence syncs *park*
  (safe, uncapped queue); headless ping/travel syncs *drop*, but only during a duty session
  (14 h failsafe) or a travel leg (4 h failsafe), so today's live destruction is foreground-only.
  "Until a backend answers" is withdrawn as the release condition: revival means a 401 on
  every phone (expired tokens), out-of-window pings/travel answered with a *successful* batch
  and a `rejected` count the phone prunes, and 404s for job ids a fresh DB lacks. Added the
  503-stub option for the old hostname (W0 §2) and the **fleet drain protocol** as a new Opus
  analyst **O-10**, whose output is the release condition.
- **Phone-recovery compatibility** is now a W0 input (keystore fingerprint vs installed
  signature; never uninstall) and an O-10 constraint; case (c) is stated as partial recovery
  (pending writes + read caches, not a backup).
- **Verification buckets.** `UNVERIFIABLE` is distinct from `REFUTED`; `REFUTED` needs positive
  counter-evidence; an open-risks list (unverifiable, over-cap, dead citations) reaches G2 and
  the plan with "what would settle it". The skeptical *bias* is kept — it governs promotion
  into the verified register, which the handoff's provenance shows is where confident-but-
  wrong findings were caught — but it no longer deletes anything.
- **Script bookkeeping:** `not_started` on HALT; `.catch(() => null)` so a rejection cannot
  escape the contract; retries at the tail with a per-attempt label so a cached null is never
  re-served; the G1 rule covers both lists and `coverage`.
- **Gate recipe:** per-gate logs, a `FAIL` flag that drives the container exit, setup
  fail-fast, a readiness deadline, full logs to disk — the result is the `GATE` lines, not the
  exit code of an `echo`.
- **Dump inspection:** a separate Postgres **17** restore stack (Appendix C), exact `count(*)`
  per table, the three standalone sequences checked; CI's 16 stays for tests only.
- **Evidence rules:** one-hop dependency reads allowed and recorded; map facts citable for
  context only — the evidence behind a defect/risk claim must be read by the analyst;
  settled facts can be challenged with evidence; S-06's "unchanged by construction" now needs
  a one-hop import check and no settings change; "code on `main` yields candidates, device
  evidence yields conclusions" is now a rule.
- **Secret handling:** the scan returns file, pattern, line number and a hash fingerprint —
  never the value, never a quoted line — because every agent output is journaled.
- Reporting caps removed from analysts (a `backlog` field makes omissions visible); the
  skeptic cap governs verification spend only. O-07 keeps Opus whatever the transport, because
  the money invariants do not change with it. Sentry's last event is a clue, not a timestamp.
  An empty research result with `web_unavailable` is valid.

**Narrowed or rejected, with reasons:**

- "Background tasks keep syncing, so not opening the app does not stop the loss" — *narrowed*.
  True for pings and travel only, and both samplers are already stopped by their time
  failsafes unless a tech clocks in or starts travel, which needs the app open. Presence
  continues to be *parked*, not lost. The procedure in W0 §1 covers the foreground triggers
  that remain, and the 503 stub covers the rest where the hostname can be controlled.
- "Default-refute creates false negatives" — *accepted in mechanism, rejected in framing*. The
  bias against promoting unverified claims stays; what changed is that unverified claims are
  bucketed and carried, not that the skeptic is told to be generous.
- "Six findings per analyst hides omissions" — *accepted*, but the verification cap stays:
  spend is bounded by the skeptic count, not by what analysts may report.

### v2 (2026-10-31) — after three Opus critics and the first external review

- **W0 added** (owner pre-flight with the fleet notice) and G1 now branches on the recovery case; the design no longer assumes a backend exists somewhere.
- H7 corrected: the edge 404 is a *definitive* rejection to the phones — data is being dropped today, not kept. H14/H15 (field APK ≠ `main`; baked URL) and H16–H18 (location toggles, data restriction, silent-kill detection) added; H2/H8/H9/H10 pre-filled from code; H5 (fence) and H14 moved to the owner; H12/H13 left to S-06.
- O-01/O-02 merged into one `xhigh` analyst with the second lens at its skeptic; O-09 became S-09 (facts) with the decision at G2; O-08 became a Sonnet draft gated on the owner form, with exposure analysis kept in O-06 and an Opus critic in Stage 3; O-07's tier now follows the Odoo plan answer.
- Verification restructured: Sonnet citation check over all claims → capped Opus skeptics for P0/invariant-P1 → Sonnet web re-check; the materiality skeptic and the 1-in-5 sample are gone; claims capped at six per analyst with a failing condition.
- Haiku extractors got typed schemas (`additionalProperties:false`) and medium effort where names vary; H-04/H-05 became inline greps; S-02 cut; S-07 split into S-07a/S-07b in their own phase with the Docker recipe and dump queries; S-08 moved to Haiku with a typed scan schema.
- Script contract added (stable labels, slices of five, circuit breaker, `knownDead` retry at the tail, return contract, output discipline); schemas fixed (no `maxItems`, bounded numbers, `refuted` derived, `NONE` severity, `COMMANDS`/`RESEARCH`/`CITATIONS` added).
- Machine facts corrected: Docker engine down; Expo sources cached at a stable path with `expo-modules-core`; introspect cannot show library-manifest permissions; no in-place prebuild; Node 22 parity; `fixflow-explorer` pinned to Haiku because the built-in Explore inherits the session tier.
