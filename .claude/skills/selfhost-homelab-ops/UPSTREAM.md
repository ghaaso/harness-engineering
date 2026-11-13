# UPSTREAM — selfhost-homelab-ops

Status: **sourced**. Fetched 2026-11-04 (sparse, shallow clones). For the maintainer, not the agent.

## Upstream 1 — bolens/agent-skills

| Field | Value |
| --- | --- |
| Repo | https://github.com/bolens/agent-skills |
| Commit | `e7c49bfa5b71c3bf3ebf97f090aab78842b0e63d` |
| Branch | `main` |
| Fetched | 2026-11-04 |
| Paths taken | `skills/backup-restore-verification` (SKILL.md, references/service-recovery-drill.md), `skills/homelab-stack-maintenance` (references/example-validation.md only), `skills/homelab-stack-triage` (SKILL.md) |
| Licence | SPDX `MIT` — root `LICENSE`, "Copyright (c) 2026 bolens"; copied verbatim as `LICENSE-bolens` |

Licence provenance: the repo's `LICENSE.md` says original bolens material is MIT and imported
skills keep their own licences. `PROVENANCE.json` records all three skills as
`"hard_fork": true` with `"origin": {"type": "local-original", ...}` (PROVENANCE.json:204-209,
:749-754, :767-772, read with grep on 2026-11-04), and none is in `LICENSE.md`'s imported-source
table, so the root MIT grant applies. Upstream carries no "verified against version X on date"
note in any of the three skills.

## Upstream 2 — cloudflare/skills

| Field | Value |
| --- | --- |
| Repo | https://github.com/cloudflare/skills |
| Commit | `1f2cd0a19588e2c6197c91dd7c71729df1fb6156` |
| Branch | `main` |
| Fetched | 2026-11-04 |
| Paths taken | `skills/cloudflare-one/SKILL.md` |
| Licence | SPDX `Apache-2.0` — root `LICENSE` ("Apache License Version 2.0, January 2004"); copied verbatim as `LICENSE-cloudflare`. No `NOTICE` file exists at the root or in the skill folder |

Upstream's dated sentence (kept by reference in the trimmed file's header): the Gateway Audit SSH
action "reached end of life on July 15, 2026" (cloudflare-one/SKILL.md:142). Upstream's own rule
"Before citing limits, settings, API fields ... retrieve current information from the Cloudflare
One docs" (:8) is kept verbatim. Apache-2.0 §4(b): the trimmed file carries a header stating it
was modified.

## Taken

| File here | From | How |
| --- | --- | --- |
| `references/service-recovery-drill.md` | bolens `skills/backup-restore-verification/references/service-recovery-drill.md` | verbatim (+ one-line header) |
| `references/example-validation.md` | bolens `skills/homelab-stack-maintenance/references/example-validation.md` | verbatim (+ header) |
| `references/backup-restore-verification.md` | bolens `skills/backup-restore-verification/SKILL.md` | trimmed: kept L6-33, L37-41; dropped frontmatter and L35 (routes to unfetched skills) |
| `references/homelab-stack-triage.md` | bolens `skills/homelab-stack-triage/SKILL.md` | trimmed: kept L6-28, L36-48; dropped frontmatter and L30-34 (routes to unfetched skills) |
| `references/cloudflare-one-tunnel-access.md` | cloudflare `skills/cloudflare-one/SKILL.md` | trimmed: kept L6-16, L31-46, L67-88, L112-118, L161-180 |

Cut lines were taken with `sed -n` ranges, so every kept line is byte-identical to upstream.

## Changed (adapted into SKILL.md)

- bolens "recovery contract" + "evidence ladder" -> SKILL.md §2.4 steps 21-23 and
  `references/fixflow-restore-and-drill.md` §5, mapped onto FixFlow's Appendix C container and
  Appendix B floors (design doc, PR #182) instead of a generic snapshot restore; the
  recoverable / partially proven / failed / blocked result words are kept as-is.
- bolens drill isolation ("Prevent outbound effects before application startup") -> SKILL.md step
  20, made specific: R2, FCM, WhatsApp and FixFlow's own in-process pruner
  (`backend/app/core/backup.py:125-131`) behind `FIXFLOW_ENABLE_SCHEDULER`.
- bolens triage "Trace the service path" -> SKILL.md §2.5 with FixFlow's hops (cf-ray, tunnel
  ingress, `backend:8000`, `/api/ops/health`, Postgres, disk/clock/UPS); "Mutations" reduced to
  proposals because every host mutation is `[owner]`.
- bolens maintenance "Preserve preparation and storage behavior" (homelab-stack-maintenance/SKILL.md:37,
  named-volume-to-bind is a data migration) and example-validation -> SKILL.md step 6 (render with
  synthetic inputs before the P3a local smoke). The maintenance SKILL.md itself is not vendored.
- cloudflare-one Tunnel prompts (egress precheck, origin reachability), "A healthy tunnel only
  proves cloudflared can reach Cloudflare" (:116), Access validation prompts (:169) -> SKILL.md §3
  checks and §2.3; the precheck commands were re-fetched from the Cloudflare docs on 2026-11-04.

## Rejected (with reason)

Collisions from SOURCE-NOTES §5 (all recorded in SKILL.md §5):

1. cloudflare-one:46 / :118 remote-managed tunnel preference — O-08 pins a locally managed
   `config.yml` (docs/program/w2/O-08-design.md:16); not adopted; a switch is an owner decision.
2. cloudflare-one:118 multiple connectors on separate hosts — one host; VPS default + box gate
   (plan :305, :1286).
3. cloudflare-one:16 / :78 pilot staging — standing rule 1 (plan :95); `api.` stays 503 until P4a.
4. cloudflare-one:15 / :179 inspect account resources — agents never touch the Cloudflare account
   (README rule 4; plan :652).
5. cloudflare-one:69 / :85 Access + Gateway, default-deny — not on `api.` (a 403 parks writes;
   O-08-design.md:62; `technician-app/src/lib/syncClassification.ts:18`).
6. Cloudflare docs example catch-all `http_status:404` — FixFlow uses 503 (O-08-design.md:16; plan :509).
7. homelab-stack-triage:42 agent-authorised restart/recreate/pull/migrate — `[owner]` on the host
   (plan :79-80).
8. homelab-stack-triage:42 database replacement — adopted but stricter (14-day read-only host,
   plan :1256-1259).
9. backup-restore-verification:8 retention — adopted; the app's own first-night prune named as the
   retention change to pre-empt (`O08-F02`).
10. CLAUDE.md:36 Deploy row (Railway) vs the self-host stack from P3b — not an upstream collision;
    SKILL.md names the phase (P3a rewrites the row, plan :567).
11. `docs/RUNBOOK-BACKUPS.md:45` (no `--exit-on-error`) vs O-08 §3 / Appendix C (with it, after
    `DROP SCHEMA`) — both FixFlow docs; the self-host runbook uses the O-08 form.

Out of scope for FixFlow (not vendored):

- cloudflare-one Gateway, TLS inspection, DLP, CASB, device client / Split Tunnels, WAN, DEX,
  Infrastructure Access, Logs (L47-66, L89-111, L119-160): FixFlow runs one outbound tunnel plus
  Access on two hostnames and has no managed device fleet.
- cloudflare-one `references/skill-feedback.md`: about reporting to Cloudflare, not FixFlow.
- bolens generated catalogs/topology, `.env.spec`, ingress-snippet metadata
  (homelab-stack-maintenance/SKILL.md:10-29, :41-47): FixFlow has no generated stack catalog.
- bolens Restic/Borg framing (backup-restore-verification/SKILL.md:16): backups are `pg_dump`
  objects in R2.
- bolens `agents/openai.yaml` files and per-skill `UPSTREAM.md` (provenance only).
- Every dangling skill reference (bolens: sensitive-info-audit, migration,
  network-exposure-verification, managed-config-drift, workstation-health-triage, diagnose-crash,
  ci-maintenance, triage-dependency-updates, git-hygiene, babysit; Cloudflare:
  cloudflare-one-migrations, gateway-workers): not fetched, not linked.

No upstream coverage at all (kept custom, from O-08 and the plan): Caddy, Postgres 17 tuning,
MinIO vs R2, GlitchTip / Uptime Kuma / Dozzle, UPS and power-loss, Linux hardening, secrets at
rest, CGNAT.

## Web sources

Fetched in the authoring run (2026-11-04), all OK:

- https://developers.cloudflare.com/tunnel/advanced/local-management/configuration-file/
- https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/troubleshoot-tunnels/connectivity-prechecks/
- https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/
- https://www.postgresql.org/docs/17/app-pgrestore.html
- https://www.postgresql.org/docs/17/app-pgdump.html

Attempted by the survey on 2026-11-04 (SOURCE-NOTES §6):

- OK: the connectivity-prechecks page, both PostgreSQL pages,
  https://developers.cloudflare.com/cloudflare-one/access-controls/policies/,
  https://www.cloudflare.com/plans/zero-trust-services/ (no seat number stated),
  the service-tokens page, the /tunnel/advanced/ configuration-file page.
- **Failed (HTTP 404):**
  https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/local-management/configuration-file/
  and https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configuration/configuration-file/ingress/
- **No credible source:** WebSearch "Pakistan ISP CGNAT PTCL Nayatel StormFiber carrier-grade NAT
  public IP" — `WEB_UNAVAILABLE: CGNAT on Pakistani ISPs` (same result as R-03 F18).
- Summary only, not used as a fact: a WebSearch for the cloudflared ingress catch-all.

Carried from R-03 (fetched 2026-11-01, not re-fetched): F2, F4, F7, F8, F11, F14, F15, F16, F17,
F18 (`docs/program/evidence/w1/R-03.txt`, PR #182).
