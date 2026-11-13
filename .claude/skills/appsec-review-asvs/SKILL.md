---
name: appsec-review-asvs
description: FixFlow application-security review against OWASP ASVS 5.0 and MASVS v2.1.0, layered on anthropic-skills:code-audit. Use when reviewing, refuting or designing a change that touches JWT issue/verify and token_version revocation, the name/PIN login and its per-account lock, the in-memory per-IP limiter and X-Forwarded-For handling, compare_secret sites (X-Ops-Proxy-Token, WhatsApp verify token, X-Hub-Signature-256), R2 signed PUT/GET and upload caps, CORS, security headers and public API docs, ops-server.mjs, or mobile secret hygiene (Sentry DSN gate, committed app.json/eas.json values reported as fingerprints); and for the O-05/O-06 register in phases P1, P7a, P7b-1, P7b-2, P13b. Do NOT use to change auth policy against CLAUDE.md (the lock that blocks a correct PIN is deliberate), to rotate keys, deploy, or probe a live host (owner only), for a generic OWASP Top-10 sweep, or for outbox, ledger or migration correctness (offline-sync-review, fastapi-alembic-safety).
---

# appsec-review-asvs

ASVS/MASVS-style security review for FixFlow. The base generic checklist is
`anthropic-skills:code-audit` (referred to by name; its files were not surveyed, see
`UPSTREAM.md`); this skill adds the FixFlow layer and **overrides** the base and the OWASP
upstream wherever they collide with `CLAUDE.md` or plan §0 (section e). Code on `main`
yields candidates, device evidence yields conclusions (`docs/ORCHESTRATION-DESIGN-2026-10.md:540-542`).

## (a) FixFlow facts

All code lines read on this branch (base `main @ a31924a`) on 2026-11-04. The full per-row
map, with ASVS ids, register ids and phases, is `references/fixflow-asvs-check-map.md`.

### Where this sits

- Design §9 row: `docs/ORCHESTRATION-DESIGN-2026-10.md:730` — "Application security review
  (ASVS-style) | O-05, O-06 | JWT lifecycle and revocation, PIN policy, per-replica rate limiting…".
- Analysts lifted: O-05 `security-external-attacker` and O-06 `security-insider-and-operator`,
  both opus/high (`docs/ORCHESTRATION-DESIGN-2026-10.md:302-303`). Tier: Opus for "adversarial
  security review" (`:97`); Sonnet's "Never for" includes "security sign-off" (`:96`).
- Register: O05-01..O05-18 (`docs/program/evidence/w2/O-05.txt:30-219`); O6-F01..O6-F19
  (`docs/program/evidence/w2/O-06.txt:20-246` — the file has F19, docs public, at `:240`).
  Verified register and G2 statuses: `docs/program/G2-deep-dive-gate-2026-11-01.md:173-196`.
- Phases (headings of `docs/program/SHIP-PLAN-2026-11.md`): P1 `:317` (dev-secret gate, seed
  PINs, 6-digit tech PIN, docs off, body caps, deep-health), P7a `:989` (`require_job_actor`,
  money guards, PII minimisation), P7b-1 `:1022` (lock per (account, source), roster removed,
  current-PIN `set_pin`, logout, shorter manager TTL), P7b-2 `:1042` (ops-server, media,
  react-router, Cloudflare rules), P13b `:1223` (backup encryption, put-only token).
- Plan §0 routing: Opus owns "auth, PIN, / JWT" (`SHIP-PLAN-2026-11.md:48-49`); every PR gets
  an Opus reviewer that names the PR head SHA and, per register id fixed, "the test that fails
  on the base commit and passes on head" (`:51-54`).
- **Every fact row in this section describes `main` at `a31924a` (2026-11-04), before P1 and
  before P7a. Both have merged (P1 #187 `87bbe88`, P7a #191 `6ff6039`, 2026-11-13), and several
  rows below are now FALSE as present-tense statements:** the technician PIN minimum is 6, not 4
  (`backend/app/features/identity/pin_policy.py`); the environment default is `production` and
  the boot guard is fail-closed (`backend/app/core/config.py`, `boot_problems`); the API docs are
  gated (`backend/app/main.py`); job reads and writes are authorised in the service layer
  (`backend/app/features/jobs/service.py`: the actor rule, the implicit claim of an unclaimed
  job, the atomic closed-job money guards); every response carries `X-FixFlow-Api: 1`
  (`backend/app/core/origin_marker.py`). Re-derive each row from those files on the current head
  before citing it, and report a row as an open gap only after the grep checks later in this
  skill confirm it on the current head.

### Tokens (custom FastAPI JWT, CLAUDE.md:31)

- `backend/app/features/identity/security.py:21` — `_ALGORITHM = "HS256"`; `:58` `"ver": token_version,`;
  `:67` `jwt.decode(token, settings.jwt_secret, algorithms=[_ALGORITHM])`.
- `backend/app/core/config.py:151` — `jwt_secret: str = DEV_JWT_SECRET` (dev constant defined
  at `:17`; name only here); `:152-154` "Long-lived by design: a workshop device stays logged
  in." / `jwt_expire_minutes: int = 60 * 24 * 30`; `:160` `environment: str = "dev"`.
- Boot guard: `config.py:221` `return self.environment.lower() == "production" or bool(os.getenv("RAILWAY_ENVIRONMENT"))`;
  `:228` `if self.is_production and self.jwt_secret == DEV_JWT_SECRET:`; called at
  `backend/app/main.py:251`. Off Railway without `FIXFLOW_ENVIRONMENT=production` it never
  fires; a blank or short secret is never refused (O05-01, O6-F01; P1 `SHIP-PLAN-2026-11.md:330-334`).
  `backend/.env.example:23` ships `FIXFLOW_JWT_SECRET=` blank (key name only).
- Revocation: `backend/app/features/identity/deps.py:52` `if int(claims.get("ver", 0)) != tech.token_version:`;
  `service.py:140-150` `revoke_sessions` bumps it; `service.py:125-128` `set_pin` "Deliberately
  does NOT bump ``token_version``" because the installed APK's outbox drops queued writes on 401.
- Web token: `src/shared/lib/api.js:15` `TOKEN_KEY = "fixflow_token"` in localStorage;
  `src/app/providers/AuthContext.jsx:49-50` logout only clears it. Mobile token:
  `technician-app/src/lib/auth.ts:26` `AsyncStorage.setItem(TOKEN_KEY, token)`.
- PyJWT is a range, `backend/pyproject.toml:21` `"pyjwt[crypto]>=2.9,<3.0"`; no backend lock
  file, so the installed version (and its empty-HMAC-key behaviour, O-05.txt:238) is unknown.

### PIN, lock, roster

- `service.py:31-32` — `MIN_PIN_DIGITS_TECH = 4`, `MIN_PIN_DIGITS_MANAGER = 6`; `:161-162`
  digits only; policy runs in `set_pin` only (`:133`), never at login.
- `backend/app/features/identity/schemas.py:26` login `pin` `min_length=3, max_length=12`; `:33` SetPinRequest `min_length=4`.
- Seeds: `backend/alembic/versions/0004_create_technicians.py:28` and
  `0012_dedicated_manager_account.py:31` — `_DEFAULT_PIN` (same value for t1..t5 and m1; do not
  repeat it in output). O05-02 / O6-F05; P1 refuses it at login with a 403 (`SHIP-PLAN-2026-11.md:335-336`).
- Lock: `service.py:91-95` — "Deliberately BEFORE verify_pin: a lock has to refuse a correct PIN
  too"; `backend/app/features/identity/throttle.py:35` `LOCK_THRESHOLD = 5`, `:37`
  `BASE_LOCK_SECONDS = 30`, `:39` `MAX_LOCK_SECONDS = 15 * 60`, `:47` `DECAY_AFTER_SECONDS = 60 * 60`.
- `throttle.py:20` "with the lock throttling, brute force takes years" is wrong: G2 records
  "96/day, 10⁴/96 ≈ 104 days worst case, ~52 expected" (`G2-deep-dive-gate-2026-11-01.md:57`).
- Responses: `backend/app/features/identity/router.py:86-90` lock → 429 + `Retry-After`; `:93` wrong
  PIN → 401 "invalid tech id or PIN"; `:67-69` unauthenticated roster `GET /api/technicians`.
- Recovery (CLAUDE.md:140-147): manager `set_pin` resets the throttle (`service.py:135-137`);
  `backend/scripts/unlock_account.py` is dry-run by default, writes only with `--apply` (`:91`).

### Per-replica limiter and client IP

- `throttle.py:101-104` — "In-memory by design: the deployment is a single replica"; `:107`
  `max_attempts: int = 20, window_seconds: float = 60.0`; one module-level instance per process
  (`router.py:54`). `backend/start.sh:12` runs uvicorn with no `--workers`, so one count per
  container; every replica and every deploy starts at zero. The scheduler makes the same
  single-replica assumption (`config.py:176-178`); in-app metrics are per-replica (CLAUDE.md:52).
- `router.py:57-64` — `return forwarded.split(",")[-1].strip()`: trusts the last XFF hop with
  no trusted-peer check (O05-08). P7b-1 keys on `CF-Connecting-IP` only when the peer is
  cloudflared (`SHIP-PLAN-2026-11.md:1027-1028`); P1 deep-health echoes the resolved IP (`:350-352`).

### Shared secrets (CLAUDE.md:134-139)

- `backend/app/core/security.py:22-34` `compare_secret`; `:30` blank expected → False.
- Call sites: `backend/app/features/ops/deps.py:44` (X-Ops-Proxy-Token; blank token → 401 at
  `:40-41`), `backend/app/features/customer_messaging/router.py:157` (hub.verify_token),
  `backend/app/features/customer_messaging/service.py:158` (X-Hub-Signature-256; fail-closed at `:152`).
- `identity/security.py:44` `hmac.compare_digest(digest.hex(), hash_hex)` compares `str`
  operands; `hash_hex` is from the stored row, not the request (INFERRED unreachable). Report as
  a fact against the rule's letter, never as an exploitable defect without a reachability trace.

### Webhook, signed URLs, browser surface

- `customer_messaging/router.py:170` `raw = await request.body()` before the signature check
  at `:172`; no body cap (O05-14; P1 body caps `SHIP-PLAN-2026-11.md:346-347`).
- `backend/app/core/storage.py:102-104` presign params `Bucket`, `Key`, `ContentType` (no length);
  `:63` `DEFAULT_UPLOAD_TTL = 600`; `:67` `DEFAULT_PLAYBACK_TTL = 3600`;
  `backend/app/features/media/service.py:29` 64 MiB cap enforced only at `complete_upload` (`:105`).
  `backend/app/features/media/router.py:49-52` router-level token check only (O05-12, O05-13; P7a, P7b-2).
- `main.py:287-292` `CORSMiddleware` with `allow_credentials=True` and `*` methods/headers;
  origins from env `FIXFLOW_CORS_ORIGINS` (defaults `config.py:205-209`, localhost only).
- `main.py:275-280` `FastAPI(...)` without `docs_url`/`openapi_url` (O05-16, O6-F19; P1 `:346`).
- `Dockerfile.web:47` `serve -s dist`; no `serve.json` exists → no CSP/HSTS/nosniff/frame-ancestors
  (O05-11). Scheduled outside this skill's phases: P3a Caddy "with CSP and security headers"
  (`SHIP-PLAN-2026-11.md:507-508`), checked from the box in P3c (`:627`).

### ops-server.mjs (CLAUDE.md:46-51: zero-dep BFF holding the Railway/Sentry tokens)

- `ops-server.mjs:10` "zero npm deps — Node 20+ built-ins only"; `:39` `OPS_PASSWORD`; `:40`
  session secret falls back to random per boot; `:41` 12 h TTL; `:93-97` HMAC over `exp` only.
- `:122-127` `passwordValid` hashes both sides (the Node twin of `compare_secret`); `:447-449`
  `readBody` has no size cap; `:499-504` login has no throttle (O05-09, O6-F17; P7b-2 `:1044`).
- `:556` returns `String(e.message || e)` in a 500; `:527` caller-set log `limit` with no
  ceiling; `:436-438` only `Content-Type` is set; `:583` `server.listen(PORT, …)` on all interfaces.
- `:324` sends `X-Ops-Proxy-Token` only to `OPS_BACKEND_URL`; the backend never holds the
  Railway/Sentry tokens (no `core/railway.py`, CLAUDE.md:48).

### Mobile secret hygiene (Android-only, Expo SDK 52, CLAUDE.md:28)

- `technician-app/src/lib/sentry.ts:13` `const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? "";`,
  `:16` `if (!dsn) return;`, `:20` `sendDefaultPii: false`. CLAUDE.md:81-85: never an empty DSN in
  `eas.json`, never the Sentry config plugin in `app.json`.
- Committed values (design §5.2 `SCAN`, `docs/ORCHESTRATION-DESIGN-2026-10.md:468-477`) — key
  name and fingerprint only: `technician-app/app.json:20` `expo.android.config.googleMaps.apiKey` `8567d6129303`;
  `technician-app/eas.json:22`, `:32` `EXPO_PUBLIC_SENTRY_DSN` (S-08 `25b0a3f00718`,
  `docs/program/evidence/w1/S-08.txt:67-68`; recomputed 2026-11-04 `b2373ab07694` — unresolved);
  `technician-app/google-services.json:18` `client[0].api_key[0].current_key` `77b7f2782359`
  (`S-08.txt:69`, where it is labelled `google_api_key`).
- No `technician-app/android/` (manifest is generated at EAS build from `app.json`); no
  `allowBackup` key in `app.json`; `technician-app/src/lib/config.ts:14` dev fallback
  `"http://10.0.2.2:8000"`; `technician-app/src/features/jobs/JobDetailScreen.tsx:432` opens a
  server-supplied `wa_me_url` (O05-07). `@sentry/react-native` 6.10.0 (`technician-app/package-lock.json:4322`).

### Rulings a reviewer must not "fix"

- Lock blocks a correct PIN — CLAUDE.md:140; G2 kept it against O-05's known-device bypass:
  "keep the invariant" (`G2-deep-dive-gate-2026-11-01.md:283`).
- Legacy-secret verifier (P1, `SHIP-PLAN-2026-11.md:340-345`): accepts a token past `exp` on
  write routes only, bounded by `FIXFLOW_LEGACY_JWT_EXPIRES_AT`, inert when unset; always built
  (R10, `:1496-1498`). Check those bounds; do not report the skipped `exp` itself.
- R3 no pre-auth roster, and no forgeable "app marker" (`:1469-1472`); R4 every account rotated
  to ≥ 6 digits in P3b, policy in the service (`:1473-1475`); R9 self-approval flagged, not
  refused (`:1486-1495`, O6-F16).

## (b) Procedure

1. Read the brief: goal, PR or files, the register ids to break, the phase. Record the PR head
   SHA you read (plan §0 `SHIP-PLAN-2026-11.md:51-53`). If the brief names no register id, map
   the diff onto `references/fixflow-asvs-check-map.md` sections and work from those rows.
2. Read `references/fixflow-asvs-check-map.md`, then the ASVS rows the touched rows name in
   `references/asvs-5.0-cited-rows.md`; for `technician-app/` changes also
   `references/masvs-2.1.0-cited-controls.md` and the Android tables in
   `references/owasp-playbook-procedure-excerpts.md`. If the host offers
   `anthropic-skills:code-audit`, run its generic Python/JavaScript pass as the base; drop any
   item section (e) overrides.
3. For each register id in the brief, refute by default: find the input that still reaches the
   old behaviour on the PR head (e.g. a blank secret with `RAILWAY_ENVIRONMENT` unset; a 4-digit
   PIN through `PUT /api/technicians/{id}/pin`; a second XFF hop; a 65 MiB PUT; a non-ASCII
   header). Name the test that fails on base and passes on head, and list every changed expected
   value, removed assertion, new skip/xfail (`:53-55`). No such test → say so; that is the gap.
4. Walk the touched areas with section (c). Read only the cited range (files over 300 lines:
   Grep then Read around the line, design §5.3 `:534`), follow one hop when a claim depends on
   it, and list every extra file read.
5. Before writing any ASVS gap, check section (e). A listed collision is reported as "documented
   deviation, FixFlow rule wins (source)", never as a finding to fix; an item under (e) "Not
   deviations" is reported as a gap or an `open_questions` entry, never suppressed.
6. Committed values: report file, key name, line and fingerprint only (method in the check map
   §10). Whether the value is "acceptable" stays with O05-17.
7. Live-host or account questions go to the output as owner steps, then stop:
   - **[owner]** forge a token, spray the login or send oversized bodies at any running host
     (prod, VPS, home box, staging) — the H1/H3/H11 tests in `O-05.txt:5-14` are owner-run.
   - **[owner]** rotate `FIXFLOW_JWT_SECRET`, `OPS_PASSWORD`, `OPS_SESSION_SECRET`,
     `OPS_PROXY_TOKEN`/`FIXFLOW_OPS_PROXY_TOKEN`, the WhatsApp app secret or verify token, the
     Sentry DSN, the Maps/Firebase keys, or the R2 keys.
   - **[owner]** run `set_pin`, `revoke_sessions` or `backend/scripts/unlock_account.py --apply`
     against a production database; any production SQL or `railway run`.
   - **[owner]** Google Cloud key restrictions, Sentry spike protection, Cloudflare rate rules
     and Access policies, R2 bucket/put-only token creation and the `age` key pair (P13b `:1225-1230`).
   - **[owner]** turn on the PII-minimisation setting on the box (P7b-1 `:1034-1035`) or enable
     the dispatcher (plan §0 rule 4, `:102`).
   - **[owner]** deploy (README rule 4; "deployed per runbook R5 (owner at SSH, ~15 min)",
     `SHIP-PLAN-2026-11.md:79-80`), install or back up/restore an app on a roster phone (plan §0
     rule 1, `:95`), message a technician or customer.
8. Return the output contract (agent definition): FINDINGS for an audit, VERDICT per claim for
   a refutation, `SCAN` rows for committed values. Fewer well-evidenced items beat many.

## (c) Checks (read-only; what proves what)

Run from the repo root. Each line: command → what the output proves.

- `grep -n "is_production\|assert_safe_for_production\|jwt_secret" backend/app/core/config.py backend/app/main.py`
  → whether the boot guard still keys on `environment == "production"` / `RAILWAY_ENVIRONMENT`
  and whether blank, short and default secrets are refused (P1 wants all three, `:330-332`).
- `grep -rn "require_job_actor" backend/app` → absent = pre-P7a; present = check every route
  listed at `SHIP-PLAN-2026-11.md:993-998` calls it.
- `grep -n "MIN_PIN_DIGITS\|min_length" backend/app/features/identity/service.py backend/app/features/identity/schemas.py`
  → tech minimum (4 on `main @ a31924a`, 2026-11-04; 6 after P1 `:337`) in **both** service and schema.
- `grep -n "is_locked\|verify_pin" backend/app/features/identity/service.py` → `is_locked`
  must stay before `verify_pin` (CLAUDE.md:140). A diff that moves `verify_pin` above it is the
  regression; a diff that changes the lock key to (account, source) must keep a per-account
  ceiling (P7b-1 `:1027`, spray test `:1037`).
- `grep -n "_DEFAULT_PIN\|default_pin" -r backend/app backend/alembic/versions` → seed sites and
  whether login refuses a default-PIN hash (P1 `:335-336`).
- `grep -n "token_version\|\"ver\"" -r backend/app/features/identity` → logout (P7b-1
  `:1032-1033`) and `revoke_sessions` bump it, `deps.py:52` checks it (`:50-51` refuses a
  deactivated account); `set_pin`
  must **not** bump it (`service.py:125-128`; section e item 5).
- `grep -n "x-forwarded-for\|cf-connecting-ip\|request.client" -i -r backend/app` → which header
  the limiter and lock trust; any new trust must be conditional on the socket peer (ASVS 4.1.3).
- `grep -rn "compare_digest\|timingSafeEqual\|==.*secret\|secret.*==" backend/app ops-server.mjs src technician-app/src --include=*.py --include=*.mjs --include=*.js --include=*.ts --include=*.tsx`
  → every comparison site; any new `str` `compare_digest` on request input violates CLAUDE.md:134.
- `grep -n "request.body()\|Content-Length\|max_body" -r backend/app` → body read before
  authentication without a cap (O05-14).
- `grep -n "generate_presigned_url\|ContentLength\|ContentType\|ExpiresIn" backend/app/core/storage.py`
  → whether the PUT signature binds a length (P7b-2 `:1046`); TTLs unchanged unless the brief says so.
- `grep -n "docs_url\|openapi_url\|redoc_url" backend/app/main.py` → docs off in production (P1 `:346`).
- `grep -n "allow_origins\|allow_credentials" backend/app/main.py; grep -n "cors_origins" -A5 backend/app/core/config.py`
  → allowlist source; a `*` default or a regex origin is a new fact to report (ASVS 3.4.2).
  Starlette's credentialed-`*` behaviour at the installed version is unverified here — do not assert it.
- `ls serve.json public/serve.json Caddyfile 2>&1; grep -n "CMD" Dockerfile.web` → where web
  security headers would come from (O05-11).
- `grep -n "readBody\|createServer\|listen(\|limit\|setHeader\|writeHead" ops-server.mjs` →
  body cap, throttle, bind address, header set; `grep -c "^import" ops-server.mjs` and
  `grep -n "from \"" ops-server.mjs` → still `node:` built-ins only (zero-dep).
- `grep -n "EXPO_PUBLIC_SENTRY_DSN\|initSentry" -r technician-app/src technician-app/App.tsx` → the
  `?? ""` gate at `sentry.ts:13` still guards init; `grep -o '"[A-Za-z_.]*":' technician-app/eas.json | sort -u`
  → key names only; an `EXPO_PUBLIC_SENTRY_DSN` key with an empty value is the eas trap
  (check emptiness with `grep -c '"EXPO_PUBLIC_SENTRY_DSN": *""' technician-app/eas.json`, which prints a count, not a value).
- `grep -io '"[A-Za-z_./@-]*sentry[A-Za-z_./@-]*"' technician-app/app.json` → prints only
  sentry-named strings (plugin names), never a whole line; must not show a Sentry config plugin (CLAUDE.md:84).
- `grep -n "allowBackup\|usesCleartextTraffic\|\"scheme\"" technician-app/app.json` → backup and
  cleartext flags (MASVS-STORAGE-2, NETWORK-1); absent = platform default, which you must name
  as an open question, not assume.
- `grep -rn "AsyncStorage.setItem\|SecureStore" technician-app/src/lib` → where the JWT lives (MASVS-STORAGE-1).
- `grep -rn "Linking.openURL" technician-app/src` → server-supplied URLs opened (MASVS-PLATFORM-1).
- Fingerprint a committed value without printing it: check map §10 command.
- Backend tests that pin these behaviours (read, do not run unless the brief says "runs
  commands"): `backend/app/features/identity/tests/test_throttle.py`, `test_service.py`,
  `test_router.py`, `test_deps.py`, `test_security.py`; `backend/tests/test_security.py`,
  `test_config.py`, `test_identity_integration.py` (`@integration`, real Postgres; CLAUDE.md:100-101).

## (d) Forbidden actions

- Letting a correct PIN through an active lock, a "known device" bypass, or verifying the PIN
  before `is_locked` — CLAUDE.md:140-147; G2 ruling `G2-deep-dive-gate-2026-11-01.md:283`.
- Bumping `token_version` on `set_pin`, a mobile logout that wipes AsyncStorage queues, or any
  401-forcing change before the fleet's drain — "The outbox never deletes a write" (CLAUDE.md:154;
  plan §0 rule 7 `:114-115`); `service.py:125-128`.
- `hmac.compare_digest` on a `str` from request input, or a shared-secret check that passes when
  the secret is unset — CLAUDE.md:134-139.
- Proposing Supabase Auth/GoTrue, RLS or pgTAP for authorization — CLAUDE.md:98-101 ("Test
  authorization in pytest against real Postgres").
- Deploying, rotating a key, production SQL/CLI (`railway run`, `unlock_account.py --apply`),
  enabling the dispatcher, account sign-up, messaging a customer or technician — README rule 4;
  `SHIP-PLAN-2026-11.md:79-80` (deploy is the owner's, per runbook R5); plan §0 rules 3-4
  (`:100-102`). Trap if the owner asks how: deploy from `backend/`, never the root (CLAUDE.md:88-89).
- Installing, backing up or restoring an app on a roster phone, or running a MASTG dynamic test on
  one — plan §0 rule 1 (`:95`); a reliability claim needs device evidence (rule 2, `:99`).
- `expo prebuild` / `expo run:android` to obtain an `AndroidManifest.xml` — README rule 2.
- Opening a `.env`, printing a value from `eas.json`, `app.json` or `google-services.json`, or
  quoting the seed PIN or the dev JWT constant's value — README rule 3; design §5.2 `SCAN`.
- `npm`, `docker` or `git` commands, ever — design §5.3 (`:539`). A brief that says "runs
  commands" unlocks read-only commands only, never `pip`, `railway`, `eas`, `adb` or anything
  that reaches a running host (agent definition; README rule 4).
- A severity or verdict outside a contract field that carries one — README agent rules.

## (e) Where upstream disagrees

Every collision found between the OWASP upstream and CLAUDE.md or plan §0, with the reason the
FixFlow rule wins. Report these as documented deviations, not findings. The three items under
"Not deviations" (after item 7) have **no** such ruling and are reported, never suppressed.

1. **Password length and composition.** 6.2.1 (`V6.2.md:28`) "at least 8 characters … 15 …
   strongly recommended" and 6.2.5 (`:32`) "any composition". FixFlow: digits only
   (`service.py:161-162`), ≥ 6 for every account after P1/R4 (`SHIP-PLAN-2026-11.md:337`, `:1473`).
   Wins: plan ruling for a keypad PIN; the per-account lock carries the brute-force defence.
2. **"Default to the most secure option."** `skills/security-guidance/SKILL.md:18` read as "let
   the owner's correct PIN in" (O-05's known-device bypass, `O-05.txt:61`). Wins: CLAUDE.md "do
   not 'fix' this"; G2 ruled "keep the invariant" (`:283`).
3. **Admin-chosen credentials.** 6.4.6 (`V6.4.md:30`, L3) admins must not "change or choose the
   user's password". FixFlow: a manager clears a tech's lock via `set_pin` (CLAUDE.md:146-147).
   Wins: it is the designed out-of-band recovery path (CLAUDE.md:146-147, "Recovery is
   out-of-band by design"); R4 hands sealed slips (`:1473-1475`).
4. **Expired tokens.** 9.2.1 (`V9.2.md:25`) "the claims 'nbf' and 'exp' must be verified" vs the
   P1 legacy verifier (`SHIP-PLAN-2026-11.md:340-345`). Wins: ruling R10 (`:1496-1498`) for the
   drain window; review its bounds, not its existence.
5. **Session termination after a credential change — technician sessions, until the v2
   outbox.** 7.4.3 (`V7.4.md:28`). FixFlow: `set_pin` keeps sessions (`service.py:125-128`,
   "Revisit once the v2 outbox is rolled out", `:128`). Wins: the deployed APK drops queued
   writes on 401, and the outbox never deletes a write (CLAUDE.md:154; plan §0 rule 7, `:115`).
   The same 401 mechanism makes a shortened **technician** TTL (7.3.2) unsafe before the drain;
   the plan schedules none (P7b-1 names only the manager TTL, `:1033`), so a PR that shortens it
   is a finding. The **manager** TTL is not covered here (see "Not deviations").
6. **Clearing client data at logout.** 14.3.1 (`V14.3.md:22`) "authenticated data is cleared from
   client storage … after the client or session is terminated". Wins: on the phone the queues
   *are* the unsent writes (CLAUDE.md:154); a logout may drop the token, never a queue.
7. **Secret rotation.** 13.3.4 (`V13.3.md:26`, L3) "secrets are configured to expire and be
   rotated". Wins: rotation is an owner step (README rule 4; plan P0a/P3b); the agent reports.

**Not deviations — report as a gap or an `open_questions` entry** (no CLAUDE.md, plan §0 or
G2 ruling decides them; PR #182 docs grepped 2026-11-04 for MFA/multi-factor/second
factor/2FA found only O-08's 2FA advice for the Cloudflare and registrar accounts):

- **MFA.** `V6.3.md:19` "L2 applications must force the use of multi-factor authentication
  (MFA)"; 6.3.3 (`:31`) says relaxing it "requires a fully documented rationale and a
  comprehensive set of mitigating controls". CLAUDE.md:31 describes today's single-factor
  name/PIN login; it is not a rule against a second factor. Report 6.3.3 as a gap whose decision
  is the owner's. `G2-deep-dive-gate-2026-11-01.md:283` lists the **lock-DoS** mitigations
  (per-(account, source) keying, Cloudflare rate rule, 6-digit PINs, no pre-auth roster, ops
  alert); cite them as context, never as MFA compensation.
- **User deducibility.** 6.3.8 (`V6.3.md:36`, L3) "valid users cannot be deduced from failed
  authentication challenges … HTTP response codes". The lock answers 429 + `Retry-After`
  (`router.py:86-90`), a wrong PIN 401 (`:91-93`), so lock state is observable. The 429 is a
  current design choice (trade-off: a locked technician sees how long to wait), not a CLAUDE.md
  rule — CLAUDE.md:140-142 forbids letting a correct PIN *through*, and the lock check already
  runs before `verify_pin` (`service.py:94-95`) whatever status is returned. Report 6.3.8 as an
  L3 gap or open question; the roster removal (P7b-1 `:1030`, R3 `:1469-1472`) is the scheduled
  part.
- **Manager token lifetime.** 7.3.2 (`V7.3.md:22`) vs 30 days for every role
  (`config.py:152-154`). Registered as O05-10 (`G2-deep-dive-gate-2026-11-01.md:188`) and
  shortened in P7b-1 (`SHIP-PLAN-2026-11.md:1033`): a finding to verify on that PR.

Upstream practice the agent replaces:

8. **Severity sort and finding template.** `skills/mobile-code-review/SKILL.md:20` "Sort by
    severity (CRITICAL > HIGH > MEDIUM > LOW > INFO)"; `templates/finding.md:6`, `:8`
    (`[SEVERITY]`, `NDC-YYYY-NNN` ids), `:16` remediation code. Wins: README agent rules (no
    severity outside a contract field) and the register's own ids (O05-xx, O6-Fxx); use design
    §5.2 FINDINGS/VERDICT (`docs/ORCHESTRATION-DESIGN-2026-10.md:479-523`).
9. **Platform detection from native files.** `plays/mobile-code-review.md:39` fingerprints
    `AndroidManifest.xml`, `build.gradle`; `:43` declares partial coverage for a shell. FixFlow has
    no `android/` and must never `expo prebuild` (README rule 2). Wins: read `app.json` key names
    and the plugin/native-module sources under `node_modules` (or the Expo source cache) instead.
10. **Dynamic MASTG tests.** e.g. `data/mastg/MASTG-TEST-0216.md:10-12` (`type: dynamic`;
    backup and restore on a device). Wins: plan §0 rule 1 and README rule 4 — list them as
    owner/spare-phone follow-ups, never run them on a roster phone.
11. **Web lookups.** `templates/finding.md:25` (OpenCRE API) and `plays/mobile-code-review.md:78`
    (MASWE site) for CWE. Wins: the agent has no web tool; leave CWE empty unless the brief or a
    local file gives it. Compatible: `security-guidance/SKILL.md:23` "stop and flag the gap" is
    the same rule as "never a guess" and is kept.

## (f) References

- `references/fixflow-asvs-check-map.md` — authored: every check row (ASVS/MASVS id, path:line,
  state on main, register id, phase), committed-value fingerprints and the fingerprint method.
- `references/asvs-5.0-cited-rows.md` — trimmed OWASP ASVS 5.0 rows cited here (CC BY-SA 4.0).
- `references/masvs-2.1.0-cited-controls.md` — trimmed MASVS v2.1.0 controls STORAGE-1/2,
  NETWORK-1, AUTH-1, PLATFORM-1, CODE-3 (CC BY-SA 4.0).
- `references/owasp-playbook-procedure-excerpts.md` — trimmed upstream workflow, escalation, platform
  detection, MASVS signal tables and diff analysis (CC BY 4.0).
- `LICENSE-owasp-asvs-masvs`, `LICENSE-owasp-secure-agent-playbook` — attribution; `UPSTREAM.md` — provenance.
- docs/ORCHESTRATION-DESIGN-2026-10.md and docs/program/* are on PR #182 (head 3415b5e) at write time; their line numbers refer to that head.
