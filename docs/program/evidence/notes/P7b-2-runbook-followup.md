# P7b-2 — runbook follow-up (left out of the PR because PR #211 edits docs/RUNBOOK-SELFHOST.md)

Written by the P7b-2 lane (branch `claude/trusting-wing-28271e`, head 90211e3) on 2026-11-14.
Apply after #211 merges, as its own small docs commit (or fold into whichever lane next owns the runbook).

## What the runbook already says (main @ 6f430ce)

- §5.14 "Rate limiting: 429 with Retry-After only" — already states the rule and has a check.
- §5.16 "`app.` and `ops.` behind Cloudflare Access (allowed, optional)" — already states it.
- `ops/selfhost/cloudflared/config.example.yml:10` — `ops.` stays commented out unless behind Access.

So the plan's "Cloudflare rules documented" item is mostly on main already. What P7b-2 makes
stale or needs sharpened:

## Lines P7b-2 makes false

1. **Line ~640** (secrets table, `OPS_SESSION_SECRET`): "(set it, or every restart signs everyone
   out)". Now: **required, at least 32 characters; `ops-server.mjs` refuses to start without it**
   (exit 1, the value never printed). Same generator (`openssl rand -hex 32`).
2. **§3.7 step 1 (line ~764)**: "`OPS_HEALTH_TARGETS` with your domain". Now: the `ops` service sits
   only on the internal network `opsnet` (no route out), so the targets are **internal URLs**:
   `api|http://backend:8000/api/health,web|http://web:80/` (as `ops/selfhost/env/ops.env.example`
   now says). A public URL there reads as `down`. `compose-rules.mjs` checks the example file, not
   `/etc/fixflow/ops.env`; suggest a Check line:
   `grep -E '^OPS_HEALTH_TARGETS=' /etc/fixflow/ops.env | grep -vE 'https?://(backend|web)[:/]' ; echo "(no line above = internal only)"`
   — adjust so it prints nothing on a good file.
3. **§3.7 step 1, Sentry**: "The Sentry lines stay commented unless Sentry SaaS is used." Now Sentry
   SaaS is unreachable from `opsnet`; the Sentry rows will report `down`/unreachable if configured.
   Say: leave them commented (unset rows report `not_configured` and do not degrade the rollup).
4. **R0.3 (line ~2878)**: "An overall `status` of `degraded` is expected while the optional Railway
   pages are unconfigured (O08-F09)". For the **ops console** rollup that is no longer true: unset
   Railway/Sentry rows are `not_configured` and the rollup stays `ok`. (Check whether R0.3 is about
   the backend's deep health or the ops console's; if the backend's, the sentence was already
   mis-attributed and should just go.)

## §5.16 sharpening (suggested text)

> `ops.` is routed **only** behind an Access application (never "optional" once routed). The ops
> console trusts `CF-Connecting-IP` for its login backoff because the tunnel is its only way in
> (`opsnet` is internal); a route to `ops.` without Access leaves the password the only control.
> Its login answers `429` + `Retry-After` itself after five wrong passwords per IP (30 s doubling
> to 15 min, a correct password refused while locked) — no Cloudflare rate rule is needed on `ops.`.

Check for `ops.` when routed: same `curl` as `app.`, expected `302` to `cloudflareaccess.com`.

## §5.14 note (suggested)

> The backend's media reservation (`POST /api/media/upload-url`) answers `429` + `Retry-After` itself
> past `FIXFLOW_MEDIA_MAX_LIVE_RESERVATIONS` (default 20 live reservations per principal); the
> phones keep and retry a marker-carrying 429. Never put an edge rule on that path that returns
> 403 or a challenge.

## New settings to list in the backend.env table (all optional, defaults shown)

- `FIXFLOW_MEDIA_MAX_LIVE_RESERVATIONS=20`
- `FIXFLOW_MEDIA_REQUIRE_DECLARED_SIZE=false` — keep OFF until every phone's APK declares `size_bytes`.
- `FIXFLOW_MEDIA_STALE_PENDING_HOURS=48` — the 03:45 PKT `media-stale-pending-sweep` threshold.

## Deep-health check after deploy (read-only)

`/api/ops/health` → the scheduler component lists `media-stale-pending-sweep` at 03:45 (Karachi).
