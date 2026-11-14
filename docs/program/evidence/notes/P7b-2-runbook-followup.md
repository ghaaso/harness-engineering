# P7b-2 — runbook follow-up (for the lane that next owns docs/RUNBOOK-SELFHOST.md)

Written by the P7b-2 lane on 2026-11-14. First draft at head 90211e3; this copy is brought up to
date after ruling C97 and checked against `main` @ b3fd9c9 (PR #215 merged). PR #215 left the
runbook alone because PR #211 was editing it. Apply as its own small docs commit.
Line numbers below are `docs/RUNBOOK-SELFHOST.md` on `main` @ b3fd9c9.

## What the runbook already says

- §5.14 "Rate limiting: 429 with Retry-After only" (line 1228) states the rule and has a check.
- §5.16 "`app.` and `ops.` behind Cloudflare Access (allowed, optional)" (line 1263) states it.
- `ops/selfhost/cloudflared/config.example.yml`: `ops.` stays commented out unless it is behind Access.

So the plan's "Cloudflare rules documented" item is mostly on main already. These are what P7b-2
makes stale or needs sharpened.

## The four lines that are false since #215

1. **Line 654** (secrets table, `OPS_SESSION_SECRET`): "(set it, or every restart signs everyone
   out)". Now: **required, at least 32 characters; `ops-server.mjs` refuses to start without it**
   (exit 1, the value never printed). The same holds for `OPS_PASSWORD`, at least 16 characters
   (`openssl rand -base64 18`); length is the whole rule. Same generator for the secret
   (`openssl rand -hex 32`).
2. **Line 778** (§3.7 step 1): "`OPS_HEALTH_TARGETS` with your domain". Now: the `ops` service sits
   only on the internal network `opsnet` (no route out), so the targets are **internal URLs**:
   `api|http://backend:8000/api/health,web|http://web:80/`, as `ops/selfhost/env/ops.env.example`
   line 14 says. A public URL there reads as `down`. `compose-rules.mjs` checks the example file,
   not `/etc/fixflow/ops.env`; a suggested Check line that prints nothing on a good file:
   `grep -E '^OPS_HEALTH_TARGETS=' /etc/fixflow/ops.env | grep -E 'https://|\.<domain>'`
   (replace `<domain>`; any output means a public target).
3. **Line 779** (§3.7 step 1, Sentry): "The Sentry lines stay commented unless Sentry SaaS is
   used." Now Sentry SaaS is unreachable from `opsnet`, so a configured Sentry row reads as
   unreachable. Say: leave the Sentry lines commented; an unset row reports `not_configured` and
   does not degrade the ops console's rollup. (`ops.env.example` ships no Railway or Sentry token.)
4. **Lines 2959-2960** (R0.3, deep health): "An overall `status` of `degraded` is expected while
   the optional Railway pages are unconfigured (O08-F09)". R0.3 reads the **backend's** deep health
   (section 0), and the backend has had no Railway or Sentry row since the ops server took them
   over (`backend/app/features/ops/__init__.py`), so the sentence was already misattributed: drop
   it, keep "read the components, not the overall word". On the **ops console**, unset Railway and
   Sentry rows are `not_configured` and its rollup stays `ok` (`ops-server.mjs`, the rollup counts
   only `down` and `degraded`).

## §5.16 sharpening (suggested text)

> `ops.` is routed **only** behind an Access application (never "optional" once routed). The ops
> console trusts `CF-Connecting-IP` for its login backoff because the tunnel is its only way in
> (`opsnet` is internal); a route to `ops.` without Access leaves the password the only control.
> Its login answers `429` + `Retry-After` itself after five wrong passwords per IP (30 s doubling
> to 15 min, a correct password refused while locked) — no Cloudflare rate rule is needed on `ops.`.

Check for `ops.` when routed: the same `curl` as `app.`, expected `302` to `cloudflareaccess.com`.

## §5.14 note (suggested)

> The backend's media reservation (`POST /api/jobs/{job_id}/media`) can answer `429` + `Retry-After`
> itself, past `FIXFLOW_MEDIA_MAX_LIVE_RESERVATIONS` live reservations per principal. That cap ships
> OFF (`0`, ruling C76). Never put an edge rule on that path that returns 403 or a challenge.

## New settings for the backend.env table (all optional, defaults shown)

- `FIXFLOW_MEDIA_MAX_LIVE_RESERVATIONS=0`: no cap. **Keep it at 0 until every phone in the fleet
  runs a release** (rulings C76, C93; a release merely existing is not enough) that (a) treats our
  429 as a free retry and waits for Retry-After on every upload path, and (b) shows the
  pending-media list with Retry (register O3-F5). Today the phone has no error class for 429 (it
  counts as "server"), and two live paths do not queue one: the closing clip turns it into
  "upload-failed" and the job cannot close (`features/jobs/closeJobWithVideo.ts`), and the
  completion's voice note is dropped silently (`features/jobs/CompleteJobScreen.tsx`). The deployed
  phone keeps no `media_id` between attempts, so it reserves again on every attempt, and the
  arrival wizard uploads its captures in parallel; a failed attempt's reservation counts for
  10 minutes. When the cap is switched on, set it far above what one phone's own failed attempts
  can leave in 10 minutes.
- `FIXFLOW_MEDIA_REQUIRE_DECLARED_SIZE=false`: keep OFF until every phone in the fleet runs a
  release that declares `size_bytes`. Until then every upload would get a 422 and park, and no job
  could close.
- `FIXFLOW_MEDIA_STALE_PENDING_HOURS=48`: the 03:45 PKT `media-stale-pending-sweep` threshold. The
  sweep never acts on a row under 1 h old whatever the setting.

After changing either media switch in `/etc/fixflow/backend.env`, run
`ffc ... up -d --force-recreate backend` (a `restart` does not re-read env files), then read the
value back in the deep-health facts below.

## Deep-health check after deploy (read-only)

`/api/ops/health`:
- the scheduler component lists `media-stale-pending-sweep` at 03:45 (Karachi);
- `facts.media_max_live_reservations` is `0` and `facts.media_require_declared_size` is `false`,
  unless the owner switched one on under the rule above.

Backend log: `media deletion:` lines name a source, an outcome and ids only; the media log lines
that name a job id or a path print it with `%r` (C93, C97), so none of them can start a line of its
own. A `media purge failed: ...; the row is kept so the sweep can reach the object` line means the
row was kept on purpose (C94).

## Owner steps at cutover (from the security review)

- [owner] Create the Cloudflare Access application for `ops.<domain>` before routing it. Check the
  commented `originRequest.access` keys in `ops/selfhost/cloudflared/config.example.yml` against
  the cloudflared version in use before relying on them.
- [owner] Put the two ops values in `/etc/fixflow/ops.env`: `OPS_PASSWORD` (at least 16
  characters; `openssl rand -base64 18`) and `OPS_SESSION_SECRET` (at least 32; `openssl rand -hex
  32`). ops-server refuses to start otherwise.
- [owner] On a test object, check that the storage refuses a PUT whose length differs from the
  signed one (a size-bound URL from a reservation that declared `size_bytes`).
- An engaged login lock writes one line to the ops container's log:
  `ops-server: login locked: ip="..." failures=N lock_seconds=S`. That line is evidence of
  guessing; it never carries a password or token.
