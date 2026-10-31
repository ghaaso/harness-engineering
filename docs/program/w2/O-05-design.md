# O-05 design

WHAT AN ATTACKER CAN DO TODAY: production is gone (edge 404), so the live exposure is (a) the field phones' baked Railway hostname (O05-07, depends on whether that subdomain can be re-claimed: W0) and (b) the committed client keys (O05-17). Everything else matters the moment the self-hosted API goes up.

AUTH MODEL AS READ: HS256 JWT, 30-day exp, no refresh. Each request does a DB read that checks token_version, active and role from the live row (deps.py:46-61), so revoke-sessions and deactivation take effect immediately and the role claim cannot be forged. Weak points: no server logout, set_pin does not revoke and needs no old PIN, the boot guard only trusts Railway/ENVIRONMENT, and the seeded PIN 1234. PIN lock: the lock state is in the DB row, so it is shared across replicas and survives restarts. The per-IP limiter is in-memory, per process, resets on deploy, and keys on the last XFF entry. CORS: an explicit origin list with allow_credentials. Because auth is a bearer header from localStorage, not a cookie, CORS is not a security control here. It is an availability one: the self-host web origin must be added to FIXFLOW_CORS_ORIGINS or the console breaks. Shared-secret gates (ops proxy token, webhook verify token and signature) use compare_secret and fail closed. Unauthenticated reads are /api/health, /api/technicians (ids, names, roles), login and the webhook. No customer data is readable without a token. The real exposure is the low-privilege token: GET /api/jobs returns all PII and GPS, media playback works on any job, money writes work on any job. /api/attendance/geofence/active (token required) leaks only the shop circle (lat, lng, radius, no BSSIDs). Attendance today, punches, shift, ledger/me and advances are self-or-manager scoped.

MOBILE ADVISORIES: runtime-reachable candidates are query-string/decode-uri-component via @react-navigation/core (no linking scheme in app.json, so no inbound attacker URL) and nanoid (no negative size in app code), so all are low. Everything else is build or dev tooling and does not ship in a release APK: tar, cacache, glob, minimatch, brace-expansion, js-yaml, image-size, postcss, source-map-js, browserslist, @xmldom via @expo/plist, form-data, undici, node-forge, compression, shell-quote, the dev-middleware chain, and ajv via expo-dev-client (debug-only). The risk is to the developer machine and CI: running Metro on a LAN, and npm install extracting tarballs. Fix it with the SDK upgrade, not urgently.

MINIMUM HARDENING SET BEFORE SHIPPING (ordered):
1. Make the boot guard fail closed: refuse to start unless the JWT secret is non-default, non-empty and at least 32 bytes, or the environment is explicitly dev/test (O05-01).
2. Rotate every seeded PIN before first exposure, with a must_rotate flag in migration 0047 and a box-side set_pin script. Enforce 6+ digits for the manager (O05-02).
3. Add service-layer authorization (assigned tech or manager) on negotiate, payments, completion, transition, messaging send/send-log and media list. Refuse non-manager payments on closed jobs. Cap or approval-gate discounts (O05-05). Scope GET /api/jobs for techs (O05-06).
4. Change the login lock so an outsider cannot hold the owner's account locked: per-(account, IP/device) keying, known-device bypass, plus a Cloudflare rate rule on /api/auth/login. Keep the CLAUDE.md invariant: never let a correct PIN through a lock the caller is subject to (O05-03/04).
5. Require the current PIN for self-service set_pin, add a server-side logout, shorten the manager token TTL (O05-10).
6. Security headers and CSP for the web; self-host the font (O05-11).
7. Ops: behind Access, plus a login backoff and body cap (O05-09).
8. Body caps on the webhook and login; disable /docs in prod (O05-14/16).
9. Media: reservation caps, length-bounded presign, pending-row sweep, 413 commit fix (O05-12/13).
10. W0 key restrictions (Maps/Firebase/Sentry), and decide about the dead Railway hostname before any phone can reach an impostor (O05-07).
11. Bump react-router.

BEHIND CLOUDFLARE TUNNEL:
- cloudflared runs as a container on an internal docker network. Backend, Postgres and ops publish NO host ports (Docker bypasses ufw; S17). The box needs no inbound ports at all, because the tunnel is outbound-only on 7844.
- Hostnames:
  - ops.<domain>: entirely behind Cloudflare Access (owner email OTP or IdP), since humans only use it. ops-server reaches the backend's /api/ops/* over the internal network.
  - /api/ops/* must never be routed publicly. Add an explicit Cloudflare block rule for it.
  - web.<domain>: behind Access as well (manager only). The SPA calls the API with a bearer, so either serve the web and the manager API on the same hostname under one Access app, or keep api.<domain> open and rely on the server-side manager checks.
  - api.<domain>: must stay reachable without interactive Access for phones: /api/auth/login, /api/technicians, /api/auth/me, attendance, jobs, media, catalog, customers/lookup, devices, events, /api/health.
- The current field APK cannot send Access headers and points at the dead Railway host anyway, so the self-host needs a new APK regardless. That APK can send a Cloudflare Access service-token header pair. This is extractable from the APK, so it only stops internet scanners and spraying bots, not a determined attacker who has the APK. It is still worth doing with an Access policy of 'service token OR identity'.
- Add WAF/rate-limit rules: tight on /api/auth/login, moderate on writes. Block /docs, /redoc and /openapi.json.
- Open /api/webhooks/whatsapp only if WhatsApp Cloud is enabled (Meta cannot do Access). Otherwise block it.
- Client IP: behind the tunnel the last XFF entry is the visitor IP added by Cloudflare's edge, so the limiter works only while no direct path exists. Prefer CF-Connecting-IP, and only when the socket peer is the cloudflared container. If a second reverse proxy (Caddy/nginx) is inserted after cloudflared, the last-XFF rule collapses every user into one bucket, which makes the login limiter a self-DoS.
- R2 presigned URLs point at Cloudflare's storage host, not the tunnel, so media keeps working for phones without Access changes. The backend still needs outbound access to R2, FCM and Sentry.
- Treat the tunnel token as a production secret: whoever holds it can serve your hostnames.
