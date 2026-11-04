<!-- Authored for FixFlow, 2026-11-04 -->

# FixFlow ↔ ASVS 5.0 / MASVS v2.1.0 check map

Read with `../SKILL.md`. Every row is a **check**, not a verdict: "state on main" is what the
code at `main @ a31924a` (this branch's base, 2026-11-04) shows; the register id is where the
finding already lives (PR #182 `docs/program/evidence/w2/O-05.txt`, `O-06.txt`); the phase is
the `## P..` heading of `docs/program/SHIP-PLAN-2026-11.md` that changes it. A reviewer of a
phase PR re-runs the row against the PR head and reports what moved. ASVS/MASVS wording is in
`asvs-5.0-cited-rows.md` / `masvs-2.1.0-cited-controls.md`; "L" = ASVS level.

Line numbers below were read on this branch on 2026-11-04. Evidence files on PR #182 cite
older line numbers for some of the same code (their `cite=MOVED` rows) — cite this branch,
not the evidence file, when the two differ.

## 1. Tokens and sessions (V7.2, V7.3, V7.4, V9.1, V9.2)

| ASVS | Surface (path:line) | State on main | Register | Phase |
| --- | --- | --- | --- | --- |
| 9.1.1, 9.1.2 (L1) | `backend/app/features/identity/security.py:67` — `jwt.decode(token, settings.jwt_secret, algorithms=[_ALGORITHM])`; `:21` `_ALGORITHM = "HS256"` | one-algorithm allowlist; HMAC verified before claims are read | — | — |
| 9.1.3 (L1) | `backend/app/core/config.py:151` — `jwt_secret: str = DEV_JWT_SECRET`; `:228` guard compares only to the dev default | key source is env; dev default, blank and short secrets not all refused off Railway | O05-01, O6-F01 | P1 |
| 9.2.1 (L1) | `security.py:60` `"exp": now + timedelta(...)`; `:66` docstring "Verify signature + expiry" | exp set and verified (PyJWT default; installed version unpinned, `backend/pyproject.toml:21`) | — | P1 legacy verifier deliberately skips exp on write routes (`SHIP-PLAN-2026-11.md:340-345`) |
| 9.2.3 (L2) | `security.py:54-61` payload has no `aud`/`iss` | single audience by construction; ops console uses a separate HMAC token (`ops-server.mjs:93-97`) | — | — |
| 7.2.1, 7.2.2 (L1) | `identity/deps.py:42-53` — decode, live row, `ver` check | backend-verified self-contained token | — | — |
| 7.3.2 (L2) | `config.py:152-154` — "Long-lived by design: a workshop device stays logged in." / `60 * 24 * 30` | 30-day absolute lifetime, every role | O05-10 | P7b-1 shortens the **manager** TTL only (`:1033`) |
| 7.4.1 (L1) | `src/app/providers/AuthContext.jsx:49-50` — logout = `setToken(null)`; no logout route in `identity/router.py:1-7` | web logout is client-side only | O05-10 | P7b-1 `POST /api/auth/logout` bumps `token_version` (`:1032-1033`) |
| 7.4.2 (L1) | `deps.py:50-51` — `if tech is None or not tech.active:` | deactivation ends sessions on the next request | — | — |
| 7.4.3 (L2) | `identity/service.py:125-128` — set_pin "Deliberately does NOT bump ``token_version``" | PIN change keeps sessions (outbox reason; see SKILL.md §e) | O05-10 | P7b-1 |
| 7.4.5 (L2) | `service.py:140-150` `revoke_sessions` bumps `token_version`; manager-gated per docstring `:145-146` | admin kill switch exists | — | — |

## 2. PIN, lock, roster (V6.2, V6.3, V6.4, V11.4, V2.4)

| ASVS | Surface (path:line) | State on main | Register | Phase |
| --- | --- | --- | --- | --- |
| 6.2.1 (L1) | `service.py:31` `MIN_PIN_DIGITS_TECH = 4`; `:32` `MIN_PIN_DIGITS_MANAGER = 6`; `schemas.py:33` SetPinRequest `min_length=4` | below ASVS length; FixFlow policy is digits (see §e) | O05-04 | P1 → 6 for techs (`:337`); R4 rotation (`:1473-1475`) |
| 6.2.3 (L1) | `service.py:122-134` — no current-PIN parameter | self-service change needs no current PIN | O05-10 | P7b-1 (`:1032`) |
| 6.2.4 (L1) | no denylist in `service.py:159-165` | absent | — | P1 refuses known default PINs at login (`:335-336`) |
| 6.3.1 (L1) | `throttle.py:35` `LOCK_THRESHOLD = 5`, `:37` `BASE_LOCK_SECONDS = 30`, `:39` `MAX_LOCK_SECONDS = 15 * 60`; `service.py:94-95` lock before verify | ~96 guesses/account/day after the 10th failure (`G2-deep-dive-gate-2026-11-01.md:57`); `throttle.py:20` "brute force takes years" is wrong per G2 | O05-03, O05-04 | P7b-1 per-(account, source) keying (`:1027-1029`) |
| 6.3.2 (L1) | `backend/alembic/versions/0004_create_technicians.py:28`, `0012_dedicated_manager_account.py:31` — `_DEFAULT_PIN` (value not repeated here) | every seeded account incl. `m1` shares one known PIN | O05-02, O6-F05 | P1 refuses it at login (403) in production (`:335-336`); P3b rotation |
| 6.3.8 (L3) | `identity/router.py:86-90` lock → 429 + `Retry-After`; `:93` wrong PIN → 401; `:67-69` public roster | lock state is observable; roster is pre-auth | O05-02, O05-03 | P7b-1 removes roster (`:1030`), R3 (`:1469-1472`) |
| 6.4.6 (L3) | `service.py:130-131` manager may set anyone's PIN | manager chooses the PIN (see §e) | — | — |
| 11.4.2 (L2) | `security.py:22` `_PBKDF2_ITERATIONS = 120_000`; `:29` `pbkdf2_hmac("sha256", …)` | PBKDF2-SHA256, 16-byte salt (`:28`) | backlog (O-05.txt:223, PBKDF2 on the event loop) | — |
| 2.4.1 (L2) | `throttle.py:98-123` `IpRateLimiter`, `:107` `max_attempts: int = 20, window_seconds: float = 60.0`; `router.py:54` module-level `_ip_limiter` | per-process memory; resets on deploy; one count per replica | O05-03 | P7b-1; Cloudflare rate rule (`:1044-1048`) |

## 3. Client IP and intermediaries (V4.1.3, V15.3.4)

| ASVS | Surface | State on main | Register | Phase |
| --- | --- | --- | --- | --- |
| 4.1.3, 15.3.4 (L2) | `router.py:57-64` — `return forwarded.split(",")[-1].strip()` | trusts the last XFF hop with no trusted-peer check; correct only behind exactly one appending proxy (Railway) | O05-08 | P3c XFF record; P7b-1 source = `CF-Connecting-IP` when the peer is cloudflared (`:1027-1028`); P1 deep-health echoes the resolved IP (`:350-352`) |
| (deploy) | `backend/start.sh:12` `--host 0.0.0.0`, no `--workers`; `docker-compose.yml:15-16`, `:32-33` published ports | dev template; one worker per container | O05-08 | P3a |

## 4. Shared secrets (V11.2.4, V16.5.3)

| Site | path:line | State on main |
| --- | --- | --- |
| primitive | `backend/app/core/security.py:22-34`; `:30` `if not expected or candidate is None:` → False | hashes both sides; total; unconfigured = deny |
| ops proxy token | `backend/app/features/ops/deps.py:39-45` | fail-closed on blank (`:40-41`), `compare_secret` (`:44`) |
| webhook verify token | `backend/app/features/customer_messaging/router.py:150-157` | `configured and … compare_secret(token, configured)` |
| webhook signature | `backend/app/features/customer_messaging/service.py:149-158` | fail-closed (`:152`), HMAC-SHA256 of raw body, `compare_secret` (`:158`) |
| PIN hash compare | `backend/app/features/identity/security.py:44` — `hmac.compare_digest(digest.hex(), hash_hex)` | `str` operands; `hash_hex` comes from the stored row, not the request (INFERRED: not attacker-reachable) — report as a CLAUDE.md-rule-letter fact, not a defect |
| ops session token | `ops-server.mjs:99-109` | `timingSafeEqual` on hex buffers inside `try` → false on length mismatch |
| ops password | `ops-server.mjs:122-127` | hashes both sides (the Node twin of `compare_secret`) |

## 5. Webhook (V4.1.5, V5.2.1, V2.4.1)

`customer_messaging/router.py:170` — `raw = await request.body()` runs before the signature
check at `:172`; no body cap anywhere in the request path (`start.sh:12`). Register O05-14;
P1 adds body caps on login and the webhook (`SHIP-PLAN-2026-11.md:346-347`). Secrets:
`config.py:137-138` "Empty = webhook endpoints fail closed (403 for everyone)."

## 6. Signed URLs and uploads (V5.2.1, V5.2.4, V8.2.2, V8.3.1)

| ASVS | Surface | State on main | Register | Phase |
| --- | --- | --- | --- | --- |
| 5.2.1 (L1) | `backend/app/core/storage.py:102-104` presign params `Bucket`, `Key`, `ContentType` (no length); `media/service.py:105` "A pre-signed PUT can't cap size server-side"; `:29` `DEFAULT_MAX_UPLOAD_BYTES = 64 * 1024 * 1024` | size enforced only at `complete_upload` (HEAD) | O05-12 | P7b-2 length-bounded presign (`:1046`) |
| 5.2.4 (L3) | `media/router.py:58-64` request_upload; no per-tech/job reservation cap | unlimited reservations | O05-12 | P7b-2 reservation caps |
| — | `media/service.py:133-134` `repo.delete(media)` then `raise MediaTooLargeError` | row delete rolls back with the 413 (O05-12 mechanism) | O05-12 | P7b-2 "413 commit fix" |
| 8.2.2 (L1) | `media/router.py:49-52` router-level `get_current_principal` only; `:98` `complete_upload`, `:124` `list_media` | any token, any job | O05-13, O05-06 | P7a `require_job_actor` (`:993-998`) |
| TTLs | `storage.py:63` `DEFAULT_UPLOAD_TTL = 600`; `:67` `DEFAULT_PLAYBACK_TTL = 3600` | 10-min PUT, 1-h GET bearer links | O-06.txt backlog (:250) | — |

## 7. Browser surface (V3.4, V13.4, V14.3)

| ASVS | Surface | State on main | Register | Phase |
| --- | --- | --- | --- | --- |
| 3.4.1-3.4.6 | `Dockerfile.web:47` `serve -s dist`; no `serve.json` at repo root (VERIFIED-BY-COMMAND `ls serve.json` → absent, 2026-11-04) | no HSTS/CSP/nosniff/frame-ancestors/Referrer-Policy | O05-11 | P3a Caddy with CSP and security headers (`SHIP-PLAN-2026-11.md:507-508`); P3c checks the CSP header from the box (`:627`) |
| 3.4.2 | `backend/app/main.py:287-292` `CORSMiddleware`, `allow_credentials=True`, methods/headers `*`; `config.py:205-209` localhost defaults; prod value = env `FIXFLOW_CORS_ORIGINS` (not in repo) | allowlist from env; credentials flag set though auth is a bearer header | — | — |
| 13.4.5 (L2) | `main.py:275-280` `FastAPI(...)` with no `docs_url`/`openapi_url` | `/docs`, `/redoc`, `/openapi.json` public | O05-16, O6-F19 | P1 (`:346`) |
| 14.3.3 (L2) | `src/shared/lib/api.js:15` `TOKEN_KEY = "fixflow_token"`, `:32` `s.setItem(TOKEN_KEY, token)` | session token in localStorage (ASVS allows tokens) | O05-11 | — |
| 3.6 / third party | `index.html:7`, `:10` `fonts.googleapis.com` | third-party stylesheet on the manager origin | O05-11 | — |

## 8. `ops-server.mjs` (zero-dep Node BFF; V2.4.1, V5.2.1, V16.5.1, V16.5.4, V13.4)

| Check | path:line | State on main | Register | Phase |
| --- | --- | --- | --- | --- |
| zero deps | `:10` "zero npm deps — Node 20+ built-ins only"; `Dockerfile.ops:30` `node:20-alpine` | built-ins only | — | P13c node:22 images |
| login throttle | `:499-504` | none | O05-09, O6-F17 | P7b-2 per-IP backoff (`:1044`) |
| body cap | `:447-449` `for await (const c of req) chunks.push(c);` | unbounded | O05-09 | P7b-2 16 KB cap |
| session secret | `:40` falls back to `crypto.randomBytes(32)`; `:41` 12 h TTL; `:93-97` HMAC over `exp` only | no revocation short of rotating the secret | O05-09 | P7b-2 `OPS_SESSION_SECRET` required |
| bind | `:583` `server.listen(PORT, …)` (all interfaces) | — | O08-F08 | P7b-2 internal network only |
| error detail | `:556` `sendJson(res, 500, { error: String(e.message \|\| e) })`; `:549` Sentry error text | upstream error text returned to an authenticated caller (16.5.1) | — | — |
| caller-set limit | `:527` `Number(searchParams.get("limit")) \|\| 500` | no ceiling | O-05.txt backlog (:227) | — |
| headers | `:436-438` `sendJson` sets only `Content-Type` | no security headers | — | — |
| last resort | `:566-570` handler `.catch`; `:576-581` process handlers | 16.5.4 present | — | — |
| static path | `:468-469` `path.join(DIST, path.normalize(rel))` then `startsWith(DIST)` | prefix check; `URL` already resolves `..` (INFERRED) | — | — |
| proxy token out | `:324` `headers: { "X-Ops-Proxy-Token": OPS_PROXY_TOKEN }` | sent only to `OPS_BACKEND_URL` | — | — |

## 9. Mobile (MASVS-STORAGE-1/2, NETWORK-1, PLATFORM-1, CODE-3, AUTH-1)

No `technician-app/android/` exists (VERIFIED-BY-COMMAND `ls`, 2026-11-04): the manifest is
generated at EAS build time from `technician-app/app.json` (key names only) and plugin code.

| Control | Surface | State on main | Register | Phase |
| --- | --- | --- | --- | --- |
| STORAGE-1 | `technician-app/src/lib/auth.ts:9` `TOKEN_KEY = "fixflow_token"`; `:26` `AsyncStorage.setItem(TOKEN_KEY, token)` | JWT in plain AsyncStorage | O-05.txt backlog (:225) | — |
| STORAGE-2 (MASTG-TEST-0216 backup) | `app.json` has no `allowBackup` key (grep exit 1, 2026-11-04) | Android/Expo default applies — default not verified here (open question) | O-05.txt backlog (:225) | — |
| STORAGE-2 (MASTG-TEST-0203/0231 logging) | `technician-app/src/lib/sentry.ts:20` `sendDefaultPii: false`; `:22` `tracesSampleRate: 0` | errors only | — | — |
| NETWORK-1 (MASTG-TEST-0233) | `technician-app/src/lib/config.ts:14` fallback `"http://10.0.2.2:8000"` | dev cleartext fallback when `EXPO_PUBLIC_API_URL` unset at build | O05-07 (hostname) | P5b-2 / P2c builds |
| PLATFORM-1 | `technician-app/src/features/jobs/JobDetailScreen.tsx:432` `Linking.openURL(preview.wa_me_url)` | server-supplied URL opened without a host allowlist | O05-07 | — |
| CODE-3 (MASTG-TEST-0272) | `technician-app/package-lock.json:4322` `@sentry/react-native` 6.10.0; S-08 audit totals (`docs/program/evidence/w1/S-08.txt:70`) | advisories exist; release-APK reachability is a separate question | O05-18 (web) | P14-n |
| AUTH-1 | server-side authorization only (`identity/deps.py:64`, `:82`) | — | O05-05 | P7a |

## 10. Committed values (design §5.2 `SCAN`; report fingerprints only)

| File:line | Key name | Fingerprint (first 12 hex of sha256) | Source |
| --- | --- | --- | --- |
| `technician-app/app.json:20` | `expo.android.config.googleMaps.apiKey` | `8567d6129303` | S-08 (`S-08.txt:66`); recomputed 2026-11-04, matches |
| `technician-app/eas.json:22`, `:32` | `EXPO_PUBLIC_SENTRY_DSN` | S-08 recorded `25b0a3f00718` (`S-08.txt:67-68`); recomputed 2026-11-04 over the full JSON string value: `b2373ab07694` | mismatch — matched span or value differs; unresolved |
| `technician-app/google-services.json:18` | `client[0].api_key[0].current_key` (S-08's pattern label is `google_api_key`, `S-08.txt:69-70`) | `77b7f2782359` | S-08 (`S-08.txt:69`); key names read 2026-11-04, value never printed; recomputed, matches |

Recompute without printing the value (method used 2026-11-04):
`sed -n '22p' technician-app/eas.json | sed 's/.*"EXPO_PUBLIC_SENTRY_DSN": *"\([^"]*\)".*/\1/' | tr -d '\n\r' | sha256sum | cut -c1-12`.
Whether a value is "acceptable" (client identifier shipped in every APK) is O05-17's
question; the restriction checks (Google Cloud key restrictions, Sentry spike protection) are
**[owner]** console steps.
