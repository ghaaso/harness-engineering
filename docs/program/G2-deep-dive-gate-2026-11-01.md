# G2 — deep-dive gate (2026-11-01)

The second Fable gate of the ship program (method: `docs/ORCHESTRATION-DESIGN-2026-10.md`;
first gate: `G1-discovery-gate-2026-11-01.md`). Inputs: W2 `fixflow-deep-dive`, run
`wf_5fe2ec50-8de`: 8 analysts (7 Opus, O-08 Sonnet), 139 findings, 109 claims re-located by
Sonnet citation checkers, 12 Opus/xhigh fresh-context skeptics (the cap), one Sonnet web
re-check (12 URLs), about 3.3M subagent tokens, 23 minutes. Per-analyst outputs and designs
live in the session scratchpad (`w2-results/`); this file records the calls.

Two honest notes first. (1) The G1 gate record did not exist when W2 started (a shell quoting
failure delayed the write by one turn), so every analyst fell back to the hypothesis table in
the design doc and the settled facts in its brief; the substance was in the brief, and no
analyst's output depends on the missing file. (2) The twelve skeptics were consumed by the
first four analysts to finish (O-04, O-06, O-08, O-03). The claims that matter most to the
plan — the geofence P1s, the security P0/P1s, the drain-protocol P1s — overflowed. Section 1
says how each was dispositioned instead of pretending they were verified.

---

## 1. Verification outcomes

### 1.1 Skeptic verdicts (12)

| Claim | Verdict | Severity | Essence |
| --- | --- | --- | --- |
| O6-F01 | CONFIRMED | P0 → **P1** | Off Railway, without `FIXFLOW_ENVIRONMENT=production`, the backend boots on the committed dev JWT secret; anyone forges a manager token. Downgraded only because the self-host deploy does not exist yet. **Ship-blocker for that phase.** |
| O08-F01 | CONFIRMED | P1 | Same mechanism, second independent trace; also notes `.env.example` ships a blank secret that would pass the guard (unverified: no Python here). |
| O6-F05 | CONFIRMED | P1 | A fresh database seeds `t1..t5` and the manager `m1` with PIN 1234; login never checks for a default. |
| O3-F2 | CONFIRMED | P1 | Parked punches drive `dutyStatus`; after any landed clock-in the on-duty sampler stops for every later shift until each parked punch is cleared. |
| O08-F02 | PARTIALLY | P1 | The first nightly backup on the new stack prunes pre-death dumps older than 30 days, including the one just restored from; timing depends on when the old scheduler last ran. |
| O6-F02 | CONFIRMED | P1 → **P2** | Any technician token renegotiates any job's bill, to zero, after the customer saw or paid it; the only trace is a timeline text line. |
| O6-F06 | CONFIRMED | P1 → **P2** | Nightly dumps are plaintext in the media bucket and deletable with the API's own R2 credential; the new harm is availability, not confidentiality. |
| O3-F1 | CONFIRMED | P1 → **P2** | During the 404 era every online job write was refused at tap time and never queued (loud, not silent). |
| O04-F1 | CONFIRMED | P1 → **P2** | A punch synced more than 24 h late is re-bucketed to the sync instant: the real day reads absent, today gains a phantom open shift. |
| O04-F2 | CONFIRMED | P1 → **P2** | The 24 h punch window vs the 48 h ping window orphans a late day's pings. |
| O04-F3 | CONFIRMED | P1 → **P2** | With no active fence or only coarse fixes every verdict is `None`, and the derivation reports 100% inside. |
| O04-F5 | PARTIALLY | P1 → **P2** | A months-old drain collapses punches and crossings onto the drain day; travel samples 404 (not "rejected") on a fresh DB. |

Citation checks: 109 claims re-located, none `DEAD_CITATION`, none `ALREADY_FIXED`; several
`MOVED` (line drift only). Web re-check: 11 of 12 statements confirmed on page; the one
`NOT_ON_PAGE` was a misattributed URL in R-01 (the sentence is on Android's Oreo
background-limits page), so the fact stands with the corrected source.

### 1.2 Overflow and unskepticed P1 claims — disposition

Policy (design §4.6): an over-cap claim is never dropped. Ruling here: **C = corroborated**
(the same mechanism was confirmed by a skeptic on another analyst's finding, or verified by
me in the pinned native sources at G1, or is a constants/arithmetic claim I re-checked);
**O = open risk** (depends on a W0 fact).

| Claim | Ruling | Why |
| --- | --- | --- |
| O05-01, O10-F5 (dev secret fail-open) | **C** | O6-F01 and O08-F01 confirmed the identical mechanism |
| O05-02, O10-F6 (seed PIN 1234 + public roster) | **C** | O6-F05 confirmed; `GET /api/technicians` is unauthenticated per H-01 |
| O05-05 (any tech: negotiate, log payment on closed, trigger bill send) | **C** | O6-F02 confirmed the core; S-04 F26 and O04-F16 state the rest |
| O05-03 (lock DoS on every account) | **C** | handoff A2 (adversarially confirmed 2026-07) + S-06 PARTIAL: #169 kept the lock-before-verify by design |
| O05-04 (~96 guesses/day → 4-digit PIN in weeks to months) | **C** | arithmetic on `MAX_LOCK_SECONDS = 900`: 96/day, 10⁴/96 ≈ 104 days worst case, ~52 expected; the module's "years" claim is wrong |
| O05-06 (tech token reads all PII, GPS, media) | **C** (design risk) | flat authorization is by construction (H-01, S-04); the claim pool needs *some* visibility, so this is a PII-minimisation decision |
| O05-07 (dead Railway subdomain reclaimable by a third party) | **O** | needs W0: does the project still exist, can the generated name be re-bound |
| O05-08 (templates publish ports; XFF trust) | **C** | dev compose facts; a deployment constraint for F, not a code defect |
| O01-F01 (sampler returns without its FGS; `isRunning()` never repairs) | **C** | verified by me at G1 in `LocationTaskConsumer.kt`, `LocationModule.kt`, `TaskService.java` |
| O01-F05 (contradicted path outlives the 15 s job; crossing recorded after the dwell) | **C** (mechanism) | constants verified (15 s, 20 s dwell, no GPS timeout, record after confirm); field prevalence open |
| O01-F03 (geofence error swallowed, no re-register, no provider check) | **C** | S-01b F24/F27 + `if (error) return;` read at G1 |
| O01-F04 (phone raw-point rule vs server overlap rule) | **C** | S-01a F04 vs S-03 F5, read at G1 |
| O3-F4 (retrying a stale parked punch lands on today) | **C** | same mechanism as O04-F1/F5, both skeptic-confirmed |
| O10-F2 (parked rows stay parked after a classifier fix) | **C** | queue filters on `failed_reason`; retry is per-id (S-01a F25) |
| O10-F3 (a 503 stub parks everything after five flushes) | **C** | 5xx bumps attempts and parks at `MAX_ATTEMPTS = 5` — read in `presenceSync.ts` during scouting |
| O10-F4 (any 2xx/204 from the old host deletes queued items) | **C** | `request()` returns on 204 or any JSON body; syncs mark done — read in `api.ts` during scouting |
| O10-F7 (dispatcher age guard keys on insert time) | **C** (policy) | `created_at` is receipt time; dispatcher is OFF; the drain keeps it off and re-seeds the cursor |
| O10-F15 (pre-v2 outbox drops queued writes on 401) | **O** | depends on the field APK commit (W0) |

No second Opus pass was bought: every over-cap P0/P1 either shares a skeptic-confirmed
mechanism, was verified by me at the native layer, or is arithmetic. The two W0-dependent
claims stay open.

### 1.3 Refuted or narrowed

- Eight of twelve skeptic verdicts lowered a severity (table above); none refuted a claim.
- "Calling `requestForegroundPermissionsAsync` from a headless context is a defect" — refuted
  by O-01: in a pure headless process it is a status read; the residue is a possible stray
  dialog when the Activity is alive in the background (O01-F19, P3).
- "`jobFinished` stops the JS" — false; the headless instance is torn down 2 s after the last
  *tracked* event (and a second concurrent event is untracked: O01-F09).
- H17 (OEM background-data restriction) — weakened to latency plus a missing clock-out
  reminder; network errors are kept.
- O3-F8's failing condition — corrected by O-10: `set_pin` does **not** bump `token_version`;
  only `revoke_sessions` does. The live-tap 401 loss still holds for expired tokens.
- Settled fact S7 — refined by O-03: punch-sync triggers exist only while the ClockScreen is
  mounted; outside it `syncNow` runs only from `punch()` itself.
- My own W0 §2 "503 stub" — wrong (O10-F3/F4); corrected in the design doc: hang or proxy,
  never 5xx, never 2xx.
- The gap analysis's "the `erp` cursor row already exists" — false (0046 seeds `whatsapp` only).

---

## 2. The verified register

Status codes: **V** skeptic-confirmed, **S** skeptic-narrowed, **C** corroborated (§1.2),
**G** gap/design (unverified by construction), **O** open (W0-dependent). Severity is after
correction. `apk` is "unknown" everywhere: the installed build predates `main` by an
unknown amount, though no background file changed since the handoff.

### A — Phones: geofence, on-duty pings, travel (O-01)

Ranking for this fleet (O-01): H1 OEM kill 0.75 · H10 FGS family 0.65 · H16 location toggle
0.45 · H3 radius/accuracy 0.45 · H11 Expo defects 0.45 · H2 headless budget 0.35 · H9
permission decay 0.35 · H17 0.15. The one-phone field protocol (55 min, adb) and the in-app
diagnostics ring are in O-01's design.

| Id | Sev | Status | Claim |
| --- | --- | --- | --- |
| O01-F01 | P1 | C | After any restart the ping/travel sampler returns without its foreground service and `isRunning()` early returns stop the app from ever repairing it |
| O01-F03 | P1 | C | A location toggle removes the fence; the error is swallowed, nothing re-registers, providers are never checked |
| O01-F04 | P1 | C | Phone judges the raw point under a 100 m ceiling against an 80 m fence; server judges fix-overlap under 200 m; real indoor arrivals are "contradicted" and the prompt suppressed |
| O01-F05 | P1 | C | The contradicted path (fix, 20 s dwell, fix, no timeouts) runs past Expo's 15 s job with nothing enqueued yet |
| O01-F02 | P1 | G | No OEM autostart, app-battery-saver or lock-in-recents handling |
| O01-F06 | P1 | G | Background/precise location never re-requested after onboarding; hibernation unhandled |
| O01-F07 | P2 | — | An "Approximate" grant passes every gate but geofencing never registers |
| O01-F08 | P2 | — | Fire-and-forget syncs in headless bodies are aborted by the 2 s teardown |
| O01-F09 | P2 | — | A second concurrent task event is untracked and dies when the first finishes |
| O01-F10 | P2 | — | The debounce stamp is written before the crossing is confirmed or recorded |
| O01-F11 | P2 | — | Every foreground re-adds the fence with initial triggers: fake crossings and nag prompts |
| O01-F12 | P2 | — | Expo's shared static timestamp drops on-duty pings while a travel leg samples |
| O01-F13 | P2 | — | The ping task keeps only the last fix of a batched delivery |
| O01-F14, F15 | P2 | — | Expo #50060 (task manager dropped) and #49424 (FGS bind crash on Android 14+) apply to this version |
| O01-F16 | P2 | — | No timeout on any GPS read in the geofence or punch paths |
| O01-F17..F19 | P3 | — | No network constraint on task jobs; device_time is enqueue time; headless permission call residue |

### B — Offline engine and the fleet drain (O-03, O-10)

| Id | Sev | Status | Claim |
| --- | --- | --- | --- |
| O3-F2 | P1 | V | Parked punches make `dutyStatus` stop pings after every landed clock-in |
| O3-F4 | P1 | C | Retrying a stale parked punch or crossing lands it on today |
| O10-F2 | P1 | C | Rows parked during the outage stay parked after any classifier fix; recovery is per-row Retry only |
| O10-F3 | P1 | C | A 503 stub on the old hostname parks every queued item after five flushes |
| O10-F4 | P1 | C | Any 2xx JSON or 204 from the old hostname deletes queued items as "landed" |
| O10-F7 | P1 | C | The dispatcher's stale-event guard keys on insert time; drained old writes count as fresh |
| O10-F15 | P1 | O | A pre-v2 outbox drops queued job writes on the first 401 (depends on the field APK) |
| O3-F1 | P2 | S | Online job writes against the dead edge were refused at tap time, never queued |
| O3-F3 | P2 | — | Clock screen and background sampler disagree about duty while a punch is parked |
| O3-F5 | P2 | — | Pending media parked by one 404 is stuck forever with no UI and no retry |
| O3-F6 | P2 | — | Proxy 5xx during a home-server outage counts toward the poison cap and parks real writes |
| O3-F7 | P2 | — | A headless 401 clears the token but leaves the tech "signed in" to the privacy gates |
| O3-F8 | P2 | — | A 401 on a live tap discards the write instead of pausing it (corrected condition: expired token or `revoke_sessions`) |
| O3-F9 | P2 | — | Presence, ping and offline-punch queues lack app-wide drain triggers |
| O3-F10 | P2 | — | A stable location outbox id deletes an unsent punch from an earlier trip |
| O3-F11 | P2 | — | L1 refined: a queued depart hides ARRIVE; a re-tap replaces the depart |
| O3-F12 | P2 | G | L10: a failed offline create and its voice notes are unreachable |
| O3-F13 | P2 | — | Discard copy tells the tech the server rejected an edge-404 record |
| O10-F1 | P1 | G | The field APK cannot produce the per-phone BEFORE counts the drain proof needs |
| O10-F8..F14 | P2 | — | selfie-upload throw stalls the punch drain; a restore after a drain loses that phone's data; queues drain only under their owner's session; only the preview profile yields an APK and it bakes the dead host; versionCode/keystore unknown; outage pings and breadcrumbs are already gone; a fresh DB's null fence disarms every phone on first contact |
| O3-F14..F21, O10-F16 | P3 | — | status surfaces, drain ordering, corrupt-store overwrite, L7, C3, C4, shared-phone banner, late-sync marker |

The drain protocol (O-10 design, steps A–F with the K/H/R branches) is the release
condition for the phones. Its non-negotiables: never uninstall; the old host may only hang
or proxy; the dispatcher stays off and the cursor is re-seeded; manifest before any sync;
forward-only after the first phone drains.

### C — Backend truth and the manager view (O-04)

| Id | Sev | Status | Claim |
| --- | --- | --- | --- |
| O04-F4 | P1 | G | A dead sampler is invisible: zero-ping days and open shifts produce no coverage, the board has no ping signal |
| O04-F1, F2, F3, F5 | P2 | S | the 24 h re-bucket, the 24/48 h asymmetry, 100% inside from all-`None`, the drain-day collapse |
| O04-F6 | P2 | — | Corrections can only add punches (A5 confirmed) |
| O04-F7 | P2 | — | Adjustment audit actor comes from the request body |
| O04-F8 | P2 | — | An invalid shift timezone 500s every attendance read incl. the phone's `/today` (B4 confirmed) |
| O04-F9 | P2 | G | The server inside rule (ceiling 200 m, overlap) is far looser than the phone's; a third rule governs job punches |
| O04-F10, F11, F12, F16 | P2 | — | web shows receipt time; payroll export frozen before late syncs; ping ceiling 48 h vs a ~9-working-day queue (T44-attendance-3); `log_payment` accepts a closed job (L6) |
| O04-F13..F15, F17 | P3 | — | split shifts read as no_data; overnight shift unrepresentable; adjustments lack `client_id`; verdicts frozen against the fence at receipt |

### D — Security (O-05, O-06)

| Id | Sev | Status | Claim |
| --- | --- | --- | --- |
| O6-F01 / O08-F01 / O05-01 / O10-F5 | P1 (gate) | V | Dev JWT secret fail-open off Railway |
| O6-F05 / O05-02 / O10-F6 | P1 | V | Seeded PIN 1234 on every account incl. the manager; roster public |
| O05-03 | P1 | C | An unauthenticated attacker keeps every account locked indefinitely |
| O05-04 | P1 | C | ~96 online guesses per account per day; 4-digit PINs fall in weeks to months |
| O05-05 / O6-F02 / O6-F03 / O6-F04 / O07-F3 | P1 family | V/C | Flat authorization: any tech negotiates any bill (to zero, after send or payment), logs payments on any or closed jobs, submits the first completion on others' jobs, abandons a billed job |
| O05-06 | P1 | C (design) | A tech token reads the whole customer base, every job's GPS and media |
| O05-07 | P1 | O | The dead Railway subdomain might be claimable by a third party |
| O05-08 / O08-F03 / O08-F04 | P2 | C | Dev templates publish API and Postgres on all interfaces; XFF trust is single-hop |
| O08-F02 | P1 | S | First nightly backup prunes every pre-death dump |
| O6-F06 | P2 | S | Dumps plaintext in the media bucket, deletable with the API credential |
| O05-09 / O6-F17 / O08-F08 | P2 | — | Ops login unthrottled, unbounded body, 12 h unrevocable tokens, binds all interfaces |
| O05-10 | P2 | — | 30-day JWT, no server logout, `set_pin` needs no current PIN |
| O05-11 | P2 | — | Web served with no security headers while the manager JWT lives in localStorage |
| O05-12, O05-13 | P2/P3 | — | Unlimited unreaped upload reservations; 413 leaves phantom rows; `complete_upload` has no guard (T44-media-3) |
| O6-F07, O6-F08, O6-F09 | P1/P2 | G | Ledger chain unkeyed, unanchored, never auto-verified; `job_payment` has no tamper evidence or void attribution; completion override deletes material lines with no snapshot |
| O6-F10 / O04-F7 | P2 | — | Adjustment actor from the body |
| O6-F12, O6-F13 | P2 | — | Mock-location is client-asserted and never affects the verdict; a mocked arrive sets the billed fuel distance |
| O6-F14, O6-F15 | P2 | — | Shared-phone Discard of another tech's items; a discard leaves no server trace |
| O6-F16, O6-F18 | P2 | G | Manager self-credit / self-approval possible; the runtime DB role is the owner role |
| O05-14..F18, O6-F19 | P3 | — | webhook body unbounded; manual send claim flush-only (45-5); docs public; committed keys need console restrictions; react-router bump |

### E — Money and the Odoo hand-off (O-07, plus money items above)

| Id | Sev | Status | Claim |
| --- | --- | --- | --- |
| O07-F1 | P1 | G | No approval boundary or record of what reached the formal books; sources change in place |
| O07-F2 | P1 | G | Cloning `run_weekly_export`'s window shape would drop late facts forever |
| O07-F6 | P2 | — | `job_event.seq` can permanently skip a late-committing event; not fit for an ERP feed |
| O07-F4, O07-F5, O07-F3 | P2 | — | negotiate to zero by anyone; void has no timestamp and is allowed after close; abandon is ungated |
| O07-F11, F12, F13, F14 | P2/P3 | G | External IDs must be UUID-based; manifest cannot be a CSV row; PaymentRail's sync shape must not be copied; no settings keys for posting |
| O07-F7, F8, F9, F10, F15 | P3 | — | offline payments dated at sync; amount CHECK still NOT VALID; stale negotiated figure after a correction; export check-then-insert; payment dedupe ignores job and amount |

### F — Self-host (O-08)

| Id | Sev | Status | Claim |
| --- | --- | --- | --- |
| O08-F05 / O08-F14 | P1 | G | Both EAS profiles bake a host the owner does not control; the old hostname cannot be made safe from the box |
| O08-F07 | P2 | — | `/api/health` never touches the DB: a healthcheck stays green over an empty database |
| O08-F06 | P2 | — | Appendix C's `--exit-on-error` tripped on the benign schema error (fixed in the design doc) |
| O08-F09, F10, F11, F12, F13 | P3 | — | ops always "degraded" off Railway; R2 endpoint hardcoded; node:20 images and unpinned deps; CI/compose on PG16 vs prod 17; web logs out on any `me()` failure |

---

## 3. Open-risks list (carried into the plan; each names what settles it)

| Risk | Settled by |
| --- | --- |
| H4: the live fence row's location and survival | W0 item 9 + Appendix B on a restored dump |
| H14: the field APK's commit, versionCode, signing cert, v2 outbox presence | W0 items 3 and 8; `apksigner --print-certs`; bundle grep for `jobs.outbox.v2` |
| O05-07: can a third party claim the dead Railway subdomain | W0 item 2 (Railway dashboard) |
| O10-F15: pre-v2 outbox drops on 401 | the H14 answer |
| Recovery case a / b / c | W0 items 4–6 |
| The Supabase restore deadline (the only irreversible clock) | W0 item 4, today |
| Odoo plan (API needs Custom) | owner form, Odoo question 1 |
| Field prevalence of H1 / H10 / H16 / H3 / H9 | O-01's one-phone protocol, then fleet validation in Stage 3 |
| cloudflared's X-Forwarded-For behaviour; the HTTP code a stopped tunnel yields; the PoP that serves Karachi/Islamabad phones | tests in the self-host phase before cutover |
| Whether a blank `FIXFLOW_JWT_SECRET=` passes the boot guard | a unit test in the D1 fix (no Python here today) |
| O01-F14 outcome under the old architecture; O01-F12 FLP timestamp sharing; O01-F16 FLP internal timeout | device tests in the field-fix phase |

---

## 4. The three decisions

**D1 — Latency path.** No Supabase region move; ADR-0001's execution is superseded, not
deferred: production is gone and the destination is the owner's box, so there is nothing to
move. DB and backend are co-located on the box; the client leg becomes phone → Cloudflare
PoP → tunnel → box, which O-08 estimates at a fraction of today's 675 ms but which is a
hypothesis until a field-phone `curl` run with `cf-ray` is done before cutover. `pool_pre_ping`
stays (sub-millisecond locally). If the box is not ready when the drain must start, the
fallback is a small VPS running the identical compose behind the same DNS name — never a
platform-generated hostname again. Measurement: per-route ops metrics plus the field `curl`
run; amend the ADR with "superseded by the self-host decision".

**D2 — Self-host scope.** Postgres 17 (fsync on, named volume, no published ports), the
backend (one uvicorn process, `FIXFLOW_ENVIRONMENT=production`, a generated 32-byte secret
required by compose), the web manager served by Caddy with CSP and headers from a node:22
build, and cloudflared with a 503 catch-all; `api.<domain>` open to phones, `app.` and `ops.`
behind Cloudflare Access; a Linux box on a UPS. Keep R2 for media **and** backups (phones PUT
directly; MinIO is archived), but on a new prefix or bucket, encrypted with `age`, under a
put-only token, after archiving the pre-death dumps elsewhere first. Keep FCM. Keep Sentry
SaaS for now (the DSN is baked; off-box reporting is the point). Ops console optional with the
Railway pages unconfigured. An off-box dead-man monitor is mandatory. The owned domain is a
hard prerequisite and, once baked into the APK, permanent: DNS is the only indirection.

**D3 — Odoo shape.** A new `accounting` slice: immutable posting snapshots with UUID-based
External IDs, append-only decisions and attempts, export records with a separate manifest
(migration 0047); a state-based stager over the source tables (never the `job_event` cursor;
no `erp` cursor row); a manager approval boundary (per-row reject with a typed reason, bulk
approve with count and sum, idle until a start date is set); the **default transport is the
window-keyed CSV for Odoo's importer**, with windows keyed on approval time so late facts are
never lost; the JSON-2 push is an async adapter behind a Protocol, written only if the owner
buys the Custom plan. Full-fidelity by default. Four cheap prerequisite fixes land first:
`voided_at`/`voided_by` on payments, service-layer authorization on negotiate / payment /
completion / abandon, closed-job guards, and a 409 on payment `client_id` reuse across jobs.
Implementation stays on Opus whatever the transport, because the money invariants do not
change with it.

---

## 5. Conflicts adjudicated

| Conflict | Ruling | Reason |
| --- | --- | --- |
| Design v3's "503 stub" for the old hostname vs O-10's "hang or proxy only" | O-10 | every 5xx `ApiError` bumps attempts and parks at five; any 2xx/204 deletes items — both read in the client code |
| Skeptic cap exhausted before the plan-critical claims | corroboration policy, no second Opus pass | every over-cap P0/P1 shares a confirmed mechanism, was verified natively at G1, or is arithmetic; the two W0-dependent ones stay open (§1.2) |
| Ping backdate ceiling: O-04 "240 h permanent" vs O-10 "48 h is a privacy invariant" | **240 h permanent** | the ceiling guards against back-dating coverage, not against sampling; the 48 h justification in `config.py` is arithmetically wrong (the queue spans ~9 working days); the drain window widens further only with manifest evidence and owner sign-off |
| Login lock: O-05's known-device bypass vs CLAUDE.md's "a correct PIN is blocked during a lock" | keep the invariant | the invariant protects a 4-digit space; the DoS is mitigated by per-(account, source) keying, a Cloudflare rate rule on `/api/auth/login`, 6-digit technician PINs on the next `set_pin`, no pre-auth roster, and an ops alert on lock |
| Dev-secret fail-open severity: O-05 P0 vs two skeptics P1 | P1 in the register, **hard gate** for the self-host phase | the skeptics' reason ("the deploy does not exist yet") is exactly why it must gate that deploy |
| One geofence analyst vs the "two lenses" advice | accepted as run | the second lens was to be the skeptic, which the cap removed; the G1 native verification covers the mechanisms and the field protocol settles prevalence |
| Sentry vs GlitchTip; R2 vs MinIO | Sentry SaaS now; R2 stays | off-box reporting and direct phone-to-R2 media are the point; MinIO is archived and the endpoint is hardcoded |
| O-01's "record first, 8 s GPS timeout, local duty check" vs the privacy time bounds | accepted | the bounds are checked per batch in the handlers; recording first adds no sampling path |

---

## 6. What G2 unblocks

Stage 3 begins: the phased plan, one session per phase, Opus critics on one-session fit.
Constraints every phase inherits from this gate: the drain protocol is the first thing to
ship in every recovery case; the dev-secret and seed-PIN fixes gate the first self-host boot;
a reliability claim about geofencing needs device evidence across the fleet's OEMs; the owner
decisions above are parameters, not assumptions; nothing is built on the `job_event` cursor
for money.
