# lane:R-01b

lane=R-01b rows=149

## Counts
- G2 / open_defect: 74
- G2 / solved_entry: 1
- G2 / invariant: 1
- G2 / other: 7
- HR / open_defect: 6
- HR / other: 1
- HR / invariant: 4
- HR / trap: 3
- O-01 / other: 8
- O-03 / other: 4
- O-04 / other: 4
- O-05 / other: 5
- O-06 / other: 3
- O-07 / other: 8
- O-08 / other: 11
- O-10 / other: 9

## Sections read
- G2-deep-dive-gate-2026-11-01.md lines 1-311 (all; used sec 1.3, sec 2 incl. status codes, sec 1.1/1.2 only for status/disposition, sec 7 addendum)
- HARNESS-REVIEW-2026-11-01.md lines 1-20, sec 3 (234-250), sec 4 table and Lessons paragraph (252-285)
- O-01-design.md lines 1-148 (whole)
- O-03-design.md (whole)
- O-04-design.md (whole)
- O-05-design.md (whole)
- O-06-design.md (whole)
- O-07-design.md lines 1-12 fully, 13-131 (clipped at 1500 chars per line)
- O-08-design.md lines 1-126 (clipped at 1300-1400 chars per line)
- O-10-design.md lines 1-111 (clipped at 1300 chars per line)

## Not covered
- G2 sec 1.1 skeptic verdict table and sec 1.2 corroboration table: used only to fill status/severity on sec 2 rows, not emitted as rows (they restate the same claims)
- G2 sec 3 open-risks list (10 'settled by' items = verification pointers), sec 4 decisions D1-D3, sec 5 conflicts adjudicated (7 rulings with reasons = negative results/rejected alternatives), sec 6 constraints: not extracted (outside the requested sections)
- HARNESS-REVIEW sec 1 (six answers), sec 2 (HR-A1a..A4 rulings, 4 architect verdicts), sec 4 mechanism table (adopt/skip rulings), sec 5, 6, 7, 8: not extracted
- W2 notes: long single lines were clipped at 1300-1500 characters in O-07, O-08, O-10 reads, so trailing text of some lines (e.g. O-07 lines 47-49, O-08 lines 14-25) was not seen; O-03, O-04, O-05, O-06 and O-01 were read in full width
- W2 notes: only ruled-out/rejected statements and named verifications recorded, per instruction; the designs' fixes, schemas and owner parameters are not rows
- Per-row file:line locators for code were not re-checked against the repository (read-only task, source copies only)
- G1-discovery gate, HANDOFF-2026-07-28, ORCHESTRATION-DESIGN, SHIP-PLAN, critique-5, OWNER-VIEW, w1w2-manifest.sha256: outside lane

## Rows
- [open_defect] O01-F01 — After a phone/process restart on-duty pings and travel samples drop to a few fixes per hour, no foreground notification
    source: G2 @ sec2.A line 112 (P1, C)
    root_cause=true fix=none failed_recorded=false
    validity: expo-location 18.0.10 / expo-task-manager 12.0.6 native code as verified by main session at G1; field APK commit unknown
    verification: none named in sec2 (O-01 protocol: adb shell dumpsys activity services shows no LocationTaskService ServiceRecord)
    files: LocationTaskConsumer.kt, LocationModule.kt, TaskService.java, isRunning()
- [open_defect] O01-F03 — After the phone's Location toggle is turned off/on, arrival/exit prompts stop until the app is opened
    source: G2 @ sec2.A line 113 (P1, C)
    root_cause=true fix=none failed_recorded=false
    validity: geofence error branch 'if (error) return;' in current app code; Play services behaviour per ROM
    verification: none named
    files: geofence error handler (if (error) return;)
- [open_defect] O01-F04 — Real indoor arrivals judged 'contradicted' by phone so the arrival prompt is suppressed
    source: G2 @ sec2.A line 114 (P1, C)
    root_cause=true fix=none failed_recorded=false
    validity: phone rule (raw point, 100 m ceiling vs 80 m fence) differs from server rule (fix overlap, 200 m)
    verification: none named
    files: phone verdict rule, server inside rule
- [open_defect] O01-F05 — Crossing recorded late or lost; contradicted path outlives Expo 15 s job with nothing enqueued yet
    source: G2 @ sec2.A line 115 (P1, C mechanism; field prevalence open)
    root_cause=true fix=none (later narrowed by HR addendum; dwell deletion planned P5a/P6a) failed_recorded=false
    validity: constants 15 s job, 20 s dwell (DWELL_RECHECK_MS), no GPS timeout, record-after-confirm still in code
    verification: none named
    files: DWELL_RECHECK_MS, presence enqueue path
- [open_defect] O01-F02 — Tracker silently killed by OEM; no autostart/battery-saver/lock-in-recents handling
    source: G2 @ sec2.A line 116 (P1, G)
    root_cause=false fix=none failed_recorded=false
    validity: OEM ROM behaviour of the fleet phones; gap by construction
    verification: none named (O-01 one-phone adb protocol)
    files: 
- [open_defect] O01-F06 — Background/precise location permission silently lost after onboarding, hibernation unhandled
    source: G2 @ sec2.A line 117 (P1, G)
    root_cause=false fix=none failed_recorded=false
    validity: permission/hibernation behaviour on Android 12+
    verification: none named (O-01: adb shell cmd app_hibernation get-state)
    files: 
- [open_defect] O01-F07 — Approximate-location grant passes all gates but geofencing never registers
    source: G2 @ sec2.A line 118 (P2)
    root_cause=true fix=none failed_recorded=false
    validity: permission gate code does not check precise accuracy
    verification: none named
    files: 
- [open_defect] O01-F08 — Syncs started in headless task bodies never complete
    source: G2 @ sec2.A line 119 (P2)
    root_cause=true fix=none failed_recorded=false
    validity: headless instance torn down 2 s after last tracked event; syncs fire-and-forget
    verification: none named
    files: headless task bodies
- [open_defect] O01-F09 — Second concurrent task event handler dies when the first finishes
    source: G2 @ sec2.A line 120 (P2)
    root_cause=true fix=none failed_recorded=false
    validity: Expo headless tracking of events
    verification: none named
    files: 
- [open_defect] O01-F10 — A crossing is suppressed by debounce although it was never confirmed/recorded
    source: G2 @ sec2.A line 121 (P2)
    root_cause=true fix=none failed_recorded=false
    validity: debounce stamp written before confirm/record in current code
    verification: none named
    files: debounce stamp
- [open_defect] O01-F11 — Fake crossings and nag prompts on every app foreground
    source: G2 @ sec2.A line 122 (P2)
    root_cause=true fix=none failed_recorded=false
    validity: fence re-added on each foreground with initial triggers (expo #33433 class)
    verification: none named (O-01 step 4d)
    files: 
- [open_defect] O01-F12 — On-duty pings dropped while a travel leg is sampling
    source: G2 @ sec2.A line 123 (P2)
    root_cause=true fix=none failed_recorded=false
    validity: Expo shared static timestamp; FLP timestamp sharing is an open device test
    verification: none named (device test in field-fix phase)
    files: 
- [open_defect] O01-F13 — Batched location delivery yields one ping instead of many
    source: G2 @ sec2.A line 124 (P2)
    root_cause=true fix=none failed_recorded=false
    validity: ping task keeps only last fix of a batch
    verification: none named
    files: 
- [open_defect] O01-F14/F15 — Task manager dropped (expo #50060) or FGS bind crash on Android 14+ (expo #49424) after Start travel then lock
    source: G2 @ sec2.A line 125 (P2)
    root_cause=true fix=none failed_recorded=false
    validity: expo-task-manager 12.0.6 / expo-location 18.0.10, Android 14+, targetSdk 34, old architecture presumed
    verification: none named (device tests in field-fix phase; exit-info shows CRASH 'Starting FGS with type location')
    files: TaskManagerInternalModule.java, TaskService.java
- [open_defect] O01-F16 — Geofence or punch hangs waiting on a GPS read with no timeout
    source: G2 @ sec2.A line 126 (P2)
    root_cause=true fix=none failed_recorded=false
    validity: no timeout on GPS reads in geofence/punch paths
    verification: none named
    files: 
- [open_defect] O01-F17..F19 — Task jobs have no network constraint; device_time is enqueue time; headless permission call may show stray dialog
    source: G2 @ sec2.A line 127 (P3)
    root_cause=true fix=none failed_recorded=false
    validity: requestForegroundPermissionsAsync is only a status read in pure headless process (see G2 1.3)
    verification: none named
    files: requestForegroundPermissionsAsync
- [open_defect] O3-F2 — On-duty pings stop for every later shift after a clock-in landed, while parked punches sit in the queue
    source: G2 @ sec2.B line 133 (P1, V skeptic-confirmed)
    root_cause=true fix=none (O-03 plan: latestLivePunch pure function) failed_recorded=false
    validity: parked punches drive dutyStatus in pingTracker.ts
    verification: none named in G2
    files: dutyStatus, pingTracker.ts
- [open_defect] O3-F4 — Retrying a stale parked punch or crossing records it on today's date
    source: G2 @ sec2.B line 134 (P1, C)
    root_cause=true fix=none failed_recorded=false
    validity: server re-buckets device_time older than ceiling to sync instant (same as O04-F1/F5)
    verification: none named
    files: attendance device_time backdate ceiling
- [open_defect] O10-F2 — Rows parked during the outage stay parked after a classifier fix; only per-row Retry recovers
    source: G2 @ sec2.B line 135 (P1, C)
    root_cause=true fix=none (O-10 D3 un-park migration planned) failed_recorded=false
    validity: queue filters on failed_reason; retry is per-id
    verification: none named in G2 (O-10: unpark.test)
    files: failed_reason
- [open_defect] O10-F3 — Every queued item parked after five flushes against an old host that returns 503
    source: G2 @ sec2.B line 136 (P1, C)
    root_cause=true fix=none failed_recorded=false
    validity: 5xx bumps attempts, MAX_ATTEMPTS = 5 in presenceSync.ts and siblings
    verification: none named
    files: presenceSync.ts, MAX_ATTEMPTS
- [open_defect] O10-F4 — Queued items vanish as 'landed' when the old host returns 2xx JSON or 204
    source: G2 @ sec2.B line 137 (P1, C)
    root_cause=true fix=none failed_recorded=false
    validity: request() in api.ts returns on 204 or any JSON body; syncs mark done
    verification: none named
    files: api.ts request()
- [open_defect] O10-F7 — Dispatcher would treat drained old writes as fresh events and message customers
    source: G2 @ sec2.B line 138 (P1, C policy)
    root_cause=true fix=none (drain keeps dispatcher OFF and re-seeds cursor) failed_recorded=false
    validity: _MAX_DISPATCH_EVENT_AGE keys on created_at (receipt time); enable_dispatcher default OFF
    verification: none named
    files: _MAX_DISPATCH_EVENT_AGE, job_event.created_at, dispatch_cursor
- [open_defect] O10-F15 — Pre-v2 outbox drops queued job writes on the first 401
    source: G2 @ sec2.B line 139 (P1, O open)
    root_cause=true fix=none failed_recorded=false
    validity: field APK lacks the v2 outbox (commit unknown, W0)
    verification: bundle grep for jobs.outbox.v2; apksigner --print-certs (open-risks list)
    files: jobs.outbox.v2
- [open_defect] O3-F1 — Online job writes refused at tap time and never queued during the 404 era
    source: G2 @ sec2.B line 140 (P2, S narrowed)
    root_cause=true fix=none failed_recorded=false
    validity: sendOrQueue treats edge 404 as definitive; only relevant while an old host answers 404
    verification: none named
    files: sendOrQueue
- [open_defect] O3-F3 — Clock screen says not clocked in while the background sampler thinks on duty (parked punch)
    source: G2 @ sec2.B line 141 (P2)
    root_cause=true fix=none failed_recorded=false
    validity: two duty derivations differ
    verification: none named
    files: dutyStatus, useAttendance.clockedIn
- [open_defect] O3-F5 — Pending media parked by one 404 is stuck forever, no UI, no retry
    source: G2 @ sec2.B line 142 (P2)
    root_cause=true fix=none failed_recorded=false
    validity: pendingMedia.ts has no retry/discard surface
    verification: none named
    files: features/media/pendingMedia.ts
- [open_defect] O3-F6 — Real writes parked after proxy 5xx during a home-server outage
    source: G2 @ sec2.B line 143 (P2)
    root_cause=true fix=none failed_recorded=false
    validity: 5xx counts toward poison cap
    verification: none named
    files: MAX_ATTEMPTS
- [open_defect] O3-F7 — Tech appears signed in to privacy gates after a headless 401 cleared the token
    source: G2 @ sec2.B line 144 (P2)
    root_cause=true fix=none failed_recorded=false
    validity: headless 401 clears token but not tech
    verification: none named
    files: lib/auth
- [open_defect] O3-F8 — Live-tap write lost on a 401 instead of paused
    source: G2 @ sec2.B line 145 (P2)
    root_cause=true fix=none failed_recorded=false
    validity: condition is expired token or revoke_sessions; set_pin does NOT bump token_version
    verification: none named
    files: token_version, revoke_sessions, set_pin
- [open_defect] O3-F9 — Presence/ping/offline-punch queues do not drain on app start or reconnect
    source: G2 @ sec2.B line 146 (P2)
    root_cause=true fix=none failed_recorded=false
    validity: no app-wide drain triggers; punch sync only while ClockScreen mounted
    verification: none named
    files: syncNow, ClockScreen
- [open_defect] O3-F10 — An unsent punch from an earlier trip is overwritten by a new location outbox item
    source: G2 @ sec2.B line 147 (P2)
    root_cause=true fix=none failed_recorded=false
    validity: location outbox id is stable per job (relates to CLAUDE.md known outbox defect)
    verification: none named
    files: outbox.ts
- [open_defect] O3-F11 — After a queued depart the ARRIVE button is hidden; re-tapping depart replaces the first depart
    source: G2 @ sec2.B line 148 (P2)
    root_cause=true fix=none failed_recorded=false
    validity: travel state derived from server locations without queued items
    verification: none named
    files: 
- [open_defect] O3-F12 — A failed offline job create and its voice notes are unreachable in the UI
    source: G2 @ sec2.B line 149 (P2, G)
    root_cause=false fix=none failed_recorded=false
    validity: L10 loop item; no surface for failed creates
    verification: none named
    files: 
- [open_defect] O3-F13 — Discard dialog says the server rejected a record that was only an edge 404
    source: G2 @ sec2.B line 150 (P2)
    root_cause=true fix=none failed_recorded=false
    validity: discard copy does not distinguish refused vs unreachable
    verification: none named
    files: 
- [open_defect] O10-F1 — Cannot count per-phone BEFORE records needed to prove a drain
    source: G2 @ sec2.B line 151 (P1, G)
    root_cause=true fix=none (O-10 D4 manifest snapshot planned) failed_recorded=false
    validity: field APK has no manifest; only ClockScreen photos possible
    verification: none named
    files: 
- [open_defect] O10-F8..F14 — Drain stalls or loses data: selfie-upload throw stalls punch drain; restore after drain loses phone data; queues drain only under owner's session; only preview profile yields an APK with dead host baked; versionCode/keystore unknown; outage pings/breadcrumbs gone; fresh DB null fence disarms every phone
    source: G2 @ sec2.B line 152 (P2 group)
    root_cause=true fix=none failed_recorded=false
    validity: eas.json profiles, R2 config and DB state at drain time
    verification: none named
    files: eas.json
- [open_defect] O3-F14..F21, O10-F16 — Minor: status surfaces, drain ordering, corrupt-store overwrite, shared-phone banner, late-sync marker (L7, C3, C4)
    source: G2 @ sec2.B line 153 (P3 group)
    root_cause=false fix=none failed_recorded=false
    validity: lumped P3 items
    verification: none named
    files: 
- [open_defect] O04-F4 — Dead sampler invisible to manager: zero-ping days and open shifts show no coverage signal
    source: G2 @ sec2.C line 164 (P1, G)
    root_cause=true fix=none (O-04 design: derive liveness from attendance_ping on read) failed_recorded=false
    validity: board has no ping signal
    verification: none named
    files: attendance_ping, BoardRow
- [open_defect] O04-F1/F2/F3/F5 — Punch synced over 24 h late re-bucketed to sync instant (real day absent, phantom open shift today); 24 h punch vs 48 h ping windows orphan pings; all-None verdicts report 100% inside; months-old drain collapses onto drain day
    source: G2 @ sec2.C line 165 (P2, S narrowed)
    root_cause=true fix=none (O-04: ceilings 336 h / 240 h permanent, late_sync flag) failed_recorded=false
    validity: FIXFLOW_ATTENDANCE_DEVICE_TIME_BACKDATE_CEILING_HOURS=24, PING 48, no active fence or coarse fixes
    verification: none named
    files: attendance_*_backdate_ceiling_hours settings, derive
- [open_defect] O04-F6 — Attendance corrections can only add punches, not replace or void
    source: G2 @ sec2.C line 166 (P2)
    root_cause=true fix=none failed_recorded=false
    validity: attendance_adjustment has no action column (A5 confirmed)
    verification: none named
    files: attendance_adjustment
- [open_defect] O04-F7 — Adjustment audit actor taken from request body
    source: G2 @ sec2.C line 167 (P2)
    root_cause=true fix=none failed_recorded=false
    validity: manager_id read from body
    verification: none named
    files: attendance_adjustment.manager_id
- [open_defect] O04-F8 — Every attendance read including phone /today returns 500
    source: G2 @ sec2.C line 168 (P2)
    root_cause=true fix=none failed_recorded=false
    validity: an invalid shift timezone string is stored (B4 confirmed)
    verification: none named
    files: shift timezone
- [open_defect] O04-F9 — Server inside rule far looser than phone's; a third rule governs job punches
    source: G2 @ sec2.C line 169 (P2, G)
    root_cause=true fix=none failed_recorded=false
    validity: ceiling 200 m with overlap
    verification: none named
    files: 
- [open_defect] O04-F10/F11/F12/F16 — Web shows receipt time; payroll export frozen before late syncs; ping ceiling 48 h vs ~9-working-day queue; log_payment accepts a closed job
    source: G2 @ sec2.C line 170 (P2)
    root_cause=true fix=none failed_recorded=false
    validity: payroll_export idempotent on (shop, window); 1000-ping cap
    verification: none named
    files: payroll_export, log_payment, T44-attendance-3
- [open_defect] O04-F13..F15/F17 — Split shifts read as no_data; overnight shift unrepresentable; adjustments lack client_id; verdicts frozen against fence at receipt
    source: G2 @ sec2.C line 171 (P3)
    root_cause=true fix=none failed_recorded=false
    validity: per-day derivation
    verification: none named
    files: 
- [open_defect] O6-F01/O08-F01/O05-01/O10-F5 — Off Railway without FIXFLOW_ENVIRONMENT=production the backend boots on the committed dev JWT secret; anyone can forge a manager token
    source: G2 @ sec2.D line 177 (P1 gate, V)
    root_cause=true fix=none (hard gate for self-host phase; O-05 step 1 fail-closed boot guard) failed_recorded=false
    validity: boot guard trusts only Railway/ENVIRONMENT; blank FIXFLOW_JWT_SECRET= in .env.example may pass (unverified, no Python)
    verification: a unit test in the D1 fix (open-risks list)
    files: config.py, DEV_JWT_SECRET, .env.example, FIXFLOW_ENVIRONMENT
- [open_defect] O6-F05/O05-02/O10-F6 — Fresh DB seeds t1..t5 and manager m1 with PIN 1234; login never checks for a default; roster is public
    source: G2 @ sec2.D line 178 (P1, V)
    root_cause=true fix=none (O-05: must_rotate in 0047, set_pin script) failed_recorded=false
    validity: seed in migrations; GET /api/technicians unauthenticated
    verification: none named
    files: GET /api/technicians, seed migrations
- [open_defect] O05-03 — Unauthenticated attacker can keep every account locked indefinitely
    source: G2 @ sec2.D line 179 (P1, C)
    root_cause=true fix=none (mitigations: per-(account,source) keying, Cloudflare rate rule, 6-digit PINs) failed_recorded=true
    validity: lock-before-verify kept by design (CLAUDE.md invariant); MAX_LOCK_SECONDS=900
    verification: none named
    files: features/identity/throttle.py, MAX_LOCK_SECONDS
- [open_defect] O05-04 — 4-digit PINs guessable in weeks to months (~96 guesses/account/day)
    source: G2 @ sec2.D line 180 (P1, C arithmetic)
    root_cause=true fix=none failed_recorded=false
    validity: MAX_LOCK_SECONDS=900 => 96/day; 10^4/96 ~ 104 days worst case, ~52 expected; module's 'years' claim is wrong
    verification: arithmetic re-checked by main session
    files: MAX_LOCK_SECONDS
- [open_defect] O05-05/O6-F02/O6-F03/O6-F04/O07-F3 — Any tech token negotiates any bill to zero (after send or payment), logs payments on any/closed jobs, submits first completion on others' jobs, abandons a billed job
    source: G2 @ sec2.D line 181 (P1 family, V/C)
    root_cause=true fix=none (D3 prerequisite: service-layer authorization on negotiate/payment/completion/abandon) failed_recorded=false
    validity: flat authorization in jobs service; only trace is a timeline text line
    verification: none named
    files: negotiate_bill, log_payment, submit_completion, abandon
- [open_defect] O05-06 — A tech token reads the whole customer base, every job's GPS and media
    source: G2 @ sec2.D line 182 (P1, C design)
    root_cause=true fix=none failed_recorded=false
    validity: GET /api/jobs unscoped; claim pool needs some visibility (PII-minimisation decision)
    verification: none named
    files: GET /api/jobs
- [open_defect] O05-07 — Dead Railway subdomain baked into APK might be re-bound by a third party
    source: G2 @ sec2.D line 183 (P1, O open)
    root_cause=true fix=none failed_recorded=false
    validity: depends on whether the Railway project still exists and the generated name can be re-bound
    verification: W0 item 2: Railway dashboard check
    files: efficient-tenderness-production-2d09.up.railway.app, eas.json
- [open_defect] O05-08/O08-F03/O08-F04 — Dev compose templates publish API and Postgres on all interfaces; XFF trust is single-hop
    source: G2 @ sec2.D line 184 (P2, C)
    root_cause=true fix=none (deployment constraint for self-host) failed_recorded=false
    validity: dev docker-compose.yml used for prod; last-XFF rule
    verification: none named (cloudflared X-Forwarded-For behaviour to be tested before cutover)
    files: docker-compose.yml
- [open_defect] O08-F02 — First nightly backup on the new stack prunes pre-death dumps older than 30 days, including the one restored from
    source: G2 @ sec2.D line 185 (P1, S partially)
    root_cause=true fix=none (O-08: BACKUP_ENABLED=false until restore sign-off, new BACKUP_PREFIX, archive dumps first) failed_recorded=false
    validity: BACKUP_RETENTION_DAYS=30 on same prefix; timing depends on old scheduler's last run
    verification: none named
    files: backup.py, BACKUP_RETENTION_DAYS, BACKUP_PREFIX
- [open_defect] O6-F06 — Nightly DB dumps are plaintext in the media bucket and deletable with the API's own R2 credential
    source: G2 @ sec2.D line 186 (P2, S)
    root_cause=true fix=none (planned age encryption, put-only token) failed_recorded=false
    validity: same R2 credential for media and backups; harm is availability not confidentiality
    verification: none named
    files: run_db_backup, R2 credential
- [open_defect] O05-09/O6-F17/O08-F08 — Ops console login unthrottled, unbounded request body, 12 h unrevocable tokens, binds all interfaces
    source: G2 @ sec2.D line 187 (P2)
    root_cause=true fix=none failed_recorded=false
    validity: ops-server.mjs as read
    verification: none named
    files: ops-server.mjs
- [open_defect] O05-10 — 30-day JWT with no server logout; set_pin needs no current PIN
    source: G2 @ sec2.D line 188 (P2)
    root_cause=true fix=none failed_recorded=false
    validity: set_pin does not bump token_version (only revoke_sessions)
    verification: none named
    files: set_pin, token_version, deps.py:46-61
- [open_defect] O05-11 — Web app served without security headers while manager JWT sits in localStorage
    source: G2 @ sec2.D line 189 (P2)
    root_cause=true fix=none failed_recorded=false
    validity: serve@14 static host without CSP
    verification: none named
    files: 
- [open_defect] O05-12/O05-13 — Unlimited unreaped upload reservations; 413 leaves phantom rows; complete_upload has no guard
    source: G2 @ sec2.D line 190 (P2/P3)
    root_cause=true fix=none failed_recorded=false
    validity: media slice upload reservation code (T44-media-3)
    verification: none named
    files: complete_upload, T44-media-3
- [open_defect] O6-F07/F08/F09 — Ledger chain is unkeyed, unanchored, never auto-verified; job_payment has no tamper evidence or void attribution; completion override deletes material lines with no snapshot
    source: G2 @ sec2.D line 191 (P1/P2, G)
    root_cause=true fix=none (O-06: job_bill_revision, anchored chain, void metadata) failed_recorded=false
    validity: attendance/chain.py unkeyed hash chain; clear_materials in jobs service
    verification: none named
    files: attendance/chain.py, job_payment, clear_materials
- [open_defect] O6-F10 (=O04-F7) — Adjustment actor comes from request body
    source: G2 @ sec2.D line 192 (P2)
    root_cause=true fix=none failed_recorded=false
    validity: duplicate of O04-F7
    verification: none named
    files: attendance_adjustment.manager_id
- [open_defect] O6-F12/O6-F13 — Mock-location flag is client-asserted and never changes the verdict; a mocked arrive sets the billed fuel distance
    source: G2 @ sec2.D line 193 (P2)
    root_cause=true fix=none failed_recorded=false
    validity: verdict code ignores mock flag
    verification: none named
    files: fuel_paisa/fuel_basis
- [open_defect] O6-F14/O6-F15 — Shared-phone Discard removes another tech's items; a discard leaves no server trace
    source: G2 @ sec2.D line 194 (P2)
    root_cause=true fix=none failed_recorded=false
    validity: queued items carry no author
    verification: none named
    files: 
- [open_defect] O6-F16/O6-F18 — Manager can self-credit/self-approve; runtime DB role is the owner role
    source: G2 @ sec2.D line 195 (P2, G)
    root_cause=true fix=none failed_recorded=false
    validity: only tech and manager roles; single app DB role
    verification: none named
    files: 
- [open_defect] O05-14..F18/O6-F19 — Webhook body unbounded; manual send claim flush-only (45-5); /docs public; committed keys need console restrictions; react-router bump
    source: G2 @ sec2.D line 196 (P3)
    root_cause=false fix=none failed_recorded=false
    validity: lumped P3 items
    verification: none named
    files: /api/webhooks/whatsapp, /docs
- [open_defect] O07-F1 — No approval boundary or record of what reached the formal books; sources change in place
    source: G2 @ sec2.E line 202 (P1, G)
    root_cause=true fix=none (D3 accounting slice with immutable posting snapshots) failed_recorded=false
    validity: no accounting slice exists
    verification: none named
    files: 
- [open_defect] O07-F2 — Cloning run_weekly_export's window shape would drop late facts forever
    source: G2 @ sec2.E line 203 (P1, G)
    root_cause=true fix=none (D3: window keyed on approval time) failed_recorded=true
    validity: weekly export windows over event time
    verification: none named
    files: run_weekly_export, payroll_export
- [open_defect] O07-F6 — job_event.seq can permanently skip a late-committing event; unfit as an ERP feed
    source: G2 @ sec2.E line 204 (P2)
    root_cause=true fix=none (state-based stager instead of cursor) failed_recorded=false
    validity: seq is not commit-ordered
    verification: none named
    files: job_event.seq, dispatch_cursor
- [open_defect] O07-F4/F5/F3 — Negotiate to zero by anyone; payment void has no timestamp and is allowed after close; abandon ungated
    source: G2 @ sec2.E line 205 (P2)
    root_cause=true fix=none (D3 prerequisite fixes: voided_at/voided_by, closed guards) failed_recorded=false
    validity: job_payment lacks voided_at/voided_by
    verification: none named
    files: void_payment, negotiate_bill, job_payment
- [open_defect] O07-F11/F12/F13/F14 — External IDs must be UUID-based (seq/tokens restart on fresh DB); manifest cannot be a CSV row; PaymentRail sync shape must not be copied; no settings keys for posting
    source: G2 @ sec2.E line 206 (P2/P3, G)
    root_cause=true fix=none failed_recorded=true
    validity: design constraints for the accounting slice
    verification: none named
    files: PaymentRail, core/payment_rail.py
- [open_defect] O07-F7/F8/F9/F10/F15 — Offline payments dated at sync; amount CHECK still NOT VALID; stale negotiated figure after correction; export check-then-insert; payment dedupe ignores job and amount
    source: G2 @ sec2.E line 207 (P3)
    root_cause=true fix=none failed_recorded=false
    validity: job_payment_amount_positive constraint NOT VALID (0038)
    verification: none named
    files: job_payment_amount_positive, job_payment.client_id
- [open_defect] O08-F05/O08-F14 — Both EAS profiles bake a host the owner does not control; old hostname cannot be made safe from the self-host box
    source: G2 @ sec2.F line 213 (P1, G)
    root_cause=true fix=none (new APK on owned domain; only W0 item 2 can regain old host) failed_recorded=false
    validity: eas.json:21/29, config.ts:14 bake the Railway URL
    verification: none named
    files: eas.json, technician-app config.ts
- [open_defect] O08-F07 — Healthcheck stays green over an empty/dead database
    source: G2 @ sec2.F line 214 (P2)
    root_cause=true fix=none (use /api/ops/health with X-Ops-Proxy-Token) failed_recorded=false
    validity: /api/health never touches the DB
    verification: none named
    files: /api/health, /api/ops/health
- [solved_entry] O08-F06 — pg_restore --exit-on-error aborts on the benign 'schema public already exists' error
    source: G2 @ sec2.F line 215 (P2)
    root_cause=true fix=fixed in the design doc (docs only): DROP SCHEMA public CASCADE before pg_restore failed_recorded=true
    validity: restore into an empty target with pg_restore --no-owner --no-privileges --exit-on-error; PG 17 dump into PG 17
    verification: none named (Appendix B row counts / sequences gate)
    files: Appendix C restore steps
- [open_defect] O08-F09..F13 — Ops always 'degraded' off Railway; R2 endpoint hardcoded; node:20 images and unpinned deps; CI/compose on PG16 vs prod 17; web logs out on any me() failure
    source: G2 @ sec2.F line 216 (P3)
    root_cause=true fix=none failed_recorded=false
    validity: ops-server.mjs:415-421 Railway pages unconfigured
    verification: none named
    files: ops-server.mjs, Dockerfile.ops
- [invariant] O-10-nonneg — Drain proceeds with uninstall, a 5xx/2xx stub on the old host, no manifest, or restores after first phone drained
    source: G2 @ sec2 lines 155-158 (drain protocol non-negotiables)
    root_cause=true fix=none failed_recorded=true
    validity: holds for the fleet drain window until all phones AFTER-verified
    verification: drain_audit AFTER check against manifest (O-10 E6)
    files: drain_audit
- [other] G2-1.3-a — Claim 'requestForegroundPermissionsAsync from headless context is a defect' was believed; refuted because in a pure headless process it is only a status read
    source: G2 @ sec1.3 line 79-81
    root_cause=true fix=none failed_recorded=true
    validity: expo-location 18.0.10; residue is a stray dialog when Activity alive in background (O01-F19, P3)
    verification: none named (refuted by O-01)
    files: requestForegroundPermissionsAsync
- [other] G2-1.3-b — Claim 'jobFinished stops the JS' was believed; refuted because headless instance is torn down 2 s after the last tracked event, and a second concurrent event is untracked
    source: G2 @ sec1.3 line 82-83
    root_cause=true fix=none failed_recorded=true
    validity: Expo headless task teardown behaviour at this version
    verification: none named
    files: jobFinished
- [other] G2-1.3-c — H17 (OEM background-data restriction) was believed to lose data; weakened to latency plus missing clock-out reminder, network errors are kept
    source: G2 @ sec1.3 line 84-85
    root_cause=true fix=none failed_recorded=true
    validity: outbox keeps network errors
    verification: none named
    files: 
- [other] G2-1.3-d — O3-F8 failing condition 'set_pin invalidates token' was believed; corrected: set_pin does not bump token_version, only revoke_sessions does
    source: G2 @ sec1.3 line 86-87
    root_cause=true fix=none failed_recorded=true
    validity: identity service token_version semantics
    verification: none named (refined by O-10)
    files: set_pin, revoke_sessions, token_version
- [other] G2-1.3-e — Settled fact S7 (punch-sync triggers) was believed global; refined: triggers exist only while ClockScreen is mounted, otherwise syncNow runs only from punch()
    source: G2 @ sec1.3 line 88-89
    root_cause=true fix=none failed_recorded=true
    validity: attendance sync trigger wiring
    verification: none named (refined by O-03)
    files: syncNow, punch(), ClockScreen
- [other] G2-1.3-f — Plan assumed the dead old host could be stubbed with 503; refuted: 5xx bumps attempts and parks at five, any 2xx/204 deletes items; only hang or proxy is safe
    source: G2 @ sec1.3 line 90-91
    root_cause=true fix=corrected in the design doc failed_recorded=true
    validity: MAX_ATTEMPTS=5, request() returns on 204/JSON body
    verification: none named (O10-F3/F4 read in client code)
    files: MAX_ATTEMPTS, api.ts request()
- [other] G2-1.3-g — Gap analysis said 'the erp cursor row already exists'; false, migration 0046 seeds the whatsapp cursor only
    source: G2 @ sec1.3 line 92-93
    root_cause=true fix=none failed_recorded=true
    validity: alembic head 0046 dispatch_cursor seed
    verification: none named
    files: dispatch_cursor, migration 0046
- [open_defect] O01-F20 — Ending a job-travel leg leaves the on-duty ping sampler throttled (no foreground state) for the rest of the shift
    source: HR @ sec3 line 238
    root_cause=true fix=none landed; planned P5a dutyStatus-gated reassertPingForeground re-register failed_recorded=false
    validity: expo-location 18.0.10: both tasks share one LocationTaskService; stopLocationUpdatesAsync(TRAVEL_TASK) runs stopForeground(true)+stopSelf(); device-unverified
    verification: P5c: adb shell dumpsys activity services shows isForeground=true after a travel leg ends
    files: LocationTaskService.kt:49-52, LocationTaskConsumer.kt:62-64,226-228, stopJobTravel, ensurePingTracking
- [open_defect] O04-F18 — wifi_match computed on every punch/crossing/ping but never feeds inside; a redacted BSSID would be stored as a miss
    source: HR @ sec3 line 239
    root_cause=true fix=none (owner P6a) failed_recorded=false
    validity: wifi_match unused in inside derivation
    verification: none named
    files: wifi_match, inside
- [open_defect] O3-F22 — Pending-media queue behaves differently from other queues on errors (413 special case, parks by forcing attempts)
    source: HR @ sec3 line 240
    root_cause=true fix=none (P2a: classify(error, kind) policy table) failed_recorded=false
    validity: pendingMedia.ts keeps a private error ladder outside lib/syncClassification.ts
    verification: none named
    files: features/media/pendingMedia.ts, lib/syncClassification.ts
- [open_defect] O10-F17 — Drain manifest has no storage size; 6 MB AsyncStorage cap unmeasured on every phone
    source: HR @ sec3 line 241
    root_cause=true fix=none (P2b-1 records total AsyncStorage bytes) failed_recorded=false
    validity: Android AsyncStorage 6 MB cap
    verification: none named
    files: AsyncStorage, drain manifest
- [open_defect] O07-F16 — negotiate_bill / void_payment loaded before a concurrent close still writes onto the closed job
    source: HR @ sec3 line 242
    root_cause=true fix=none (P7a: conditional UPDATE with status predicate or SELECT FOR UPDATE + populate_existing()) failed_recorded=false
    validity: check-then-set with no row lock; window is negotiate/void overlapping a close; missing closed checks on log_payment/void_payment are O04-F16/O07-F5
    verification: two-session race test against a concurrent close (O-07 amendment 3)
    files: negotiate_bill, void_payment, log_payment
- [open_defect] O07-F17 — No record of field-cash custody or hand-over; tech-collected cash booked straight into the till account
    source: HR @ sec3 line 243
    root_cause=true fix=none (P9-0b decision, P9a-1 cash_remittance source) failed_recorded=false
    validity: depends on P0a item 15 confirming techs hold field cash
    verification: P0a item 15 owner answer
    files: cash_remittance, cash_with_staff, receipts_clearing
- [other] O01-F05-narrowed — Claim 'the 15 s jobFinished timer stops the JS' was believed; narrowed: it releases the job's wakelock without stopping JS; the loss path is the 2 s teardown after last tracked event plus untimed GPS reads
    source: HR @ sec3 lines 246-248
    root_cause=true fix=none (HR-A1a removes the dwell) failed_recorded=true
    validity: Expo headless teardown 2 s; GPS reads untimed
    verification: none named
    files: jobFinished, DWELL_RECHECK_MS
- [invariant] HR-L-RT03 — An 'accepted' row sits beside a failed AFTER check
    source: HR @ sec4 lessons para line 278-280
    root_cause=true fix=rule carried into plan (standing rule 1 depends on it) failed_recorded=true
    validity: every drain/verification table
    verification: none named
    files: 
- [trap] HR-L-RT02 — Decisive verification check silently passes because a bare assert is stripped under python -O
    source: HR @ sec4 lessons para line 280-281
    root_cause=true fix=use if/raise in drain_audit.py decisive checks failed_recorded=false
    validity: checks in drain_audit.py (backlog script) run by python
    verification: none named
    files: drain_audit.py
- [trap] HR-L-RT05 — P1 'manual boot with no env fails closed' test passes or fails because of leftover env variables
    source: HR @ sec4 lessons para line 281-282
    root_cause=true fix=run the test in a cleaned environment failed_recorded=false
    validity: boot-guard test for FIXFLOW_ENVIRONMENT/JWT secret
    verification: P1 test in cleaned environment
    files: FIXFLOW_JWT_SECRET, FIXFLOW_ENVIRONMENT
- [invariant] HR-L-RT06 — A W0-results table shows 0 where the value was never measured
    source: HR @ sec4 lessons para line 282-283
    root_cause=true fix=record unknown as 'unknown', never 0 failed_recorded=false
    validity: all W0-results tables
    verification: none named
    files: 
- [trap] HR-L-content-verify — A plan rewrite commit message claims a change that is not in the content (the program's one recorded state loss, commit 093b793)
    source: HR @ sec4 lessons para line 283-284
    root_cause=true fix=verify a plan rewrite by content, not by commit message failed_recorded=true
    validity: any docs/program plan rewrite
    verification: read the changed sections / git diff by content
    files: 093b793
- [invariant] HR-L-gate-record — Next workflow dispatched before the gate record existed, so analysts fell back to an older table
    source: HR @ sec4 lessons para line 284
    root_cause=true fix=write the gate record before dispatching the next workflow failed_recorded=true
    validity: orchestration order (G1 record missing when W2 started, per G2 intro)
    verification: none named
    files: G1-discovery-gate-2026-11-01.md
- [invariant] HR-L-skeptic-budget — Capped skeptic budget exhausted by first analysts to finish, plan-critical claims unverified
    source: HR @ sec4 lessons para line 284-285
    root_cause=true fix=allocate the capped verification budget by priority, not first-come failed_recorded=true
    validity: any workflow with a verification cap (12 skeptics in G2)
    verification: none named
    files: 
- [other] O-01-R1 — Swipe-kill as cause is ruled out on a ROM when process and FGS are still alive 60 s after swiping from recents
    source: O-01 @ line 52
    root_cause=true fix=none failed_recorded=true
    validity: per phone/ROM, tested in field protocol step 3b
    verification: adb shell pidof com.fixflow.technician and dumpsys activity services after 60 s
    files: com.fixflow.technician
- [other] O-01-R2 — Expo issue #47023 (job/thread pattern) looked applicable; ruled NOT APPLICABLE
    source: O-01 @ line 110
    root_cause=true fix=none failed_recorded=true
    validity: expo-task-manager 12.0.6: TaskJobService.onStartJob only calls taskService.handleJob; cadence 5 min pings / 20 s travel
    verification: code read of TaskJobService.java:9-14
    files: TaskJobService.java:9-14
- [other] O-01-R3 — Mock locations rejected as a test method: they flag rows and do not drive Play geofencing reliably
    source: O-01 @ line 12
    root_cause=true fix=use real walking crossings in the field protocol failed_recorded=true
    validity: geofence testing on the fleet phones
    verification: none named
    files: 
- [other] O-01-R4 — Claims refuted: requestForegroundPermissionsAsync headless is a status read (F19 residual only); 'jobFinished stops the JS' is false (S1)
    source: O-01 @ lines 113-115
    root_cause=true fix=none failed_recorded=true
    validity: duplicates G2 sec1.3 a and b
    verification: none named
    files: requestForegroundPermissionsAsync, jobFinished
- [other] O-01-R5 — Worry that an FGS-less sampler breaks the 14 h / 4 h privacy bounds is narrowed: bounds are checked per batch, so the breach is visibility, not duration
    source: O-01 @ line 116
    root_cause=true fix=none failed_recorded=true
    validity: handlePingUpdate and handleTravelUpdate check bounds per batch
    verification: none named
    files: handlePingUpdate, handleTravelUpdate, maxDutyHours, MAX_TRAVEL_MS
- [other] O-01-R6 — H11 Expo issue triage: #52544/#49424 applicable conditional (Android 15+/14+, targetSdk 34, while-in-use grant); #46505 unknown; #52230 applicable; #50060 likely applicable (old architecture presumed, unverified)
    source: O-01 @ lines 105-111
    root_cause=true fix=patch-package fixes planned (fix order 3, 8) failed_recorded=true
    validity: expo-location 18.0.10 / expo-task-manager 12.0.6 on Android 13-15
    verification: none named (device tests)
    files: LocationTaskConsumer.kt:168-171,191-219,226-228, TaskManagerInternalModule.java:50-56, TaskService.java:603-610
- [other] O-01-V1 — One-phone 55 min adb protocol separates H1 (OEM kill), H10 (FGS family), H16 (location toggle), H9 (permission decay)
    source: O-01 @ lines 10-75 field protocol
    root_cause=false fix=none failed_recorded=false
    validity: one fleet phone, tech on duty, no uninstall/clear data/Discard, network cut per step 0
    verification: adb shell dumpsys package / appops / deviceidle / activity exit-info / activity services; logcat greps for TaskService, LocationTaskConsumer, GeofencingTaskConsumer
    files: fixflow-attendance-pings, fixflow-attendance-geofence, diag.bg.v1
- [other] O-01-V2 — Check that sampler foreground state is repaired after a travel leg ends
    source: O-01 @ amendment 2 lines 137-139
    root_cause=true fix=none failed_recorded=false
    validity: after P5a fix
    verification: adb shell dumpsys activity services shows isForeground=true (P5c)
    files: LocationTaskService
- [other] O-03-R1 — Reusing X-Request-ID as the 'came from the app' marker rejected: it echoes an inbound proxy value
    source: O-03 @ line 14
    root_cause=true fix=stamp a dedicated app-only header (e.g. X-FixFlow-Api: 1) in RequestIdMiddleware on every response including unknown-route 404s failed_recorded=true
    validity: core/request_id.py:41-49 middleware
    verification: syncClassification.test.ts: 404 without marker is not definitive, with marker is; 530 without marker does not count an attempt
    files: core/request_id.py:41-49, X-Request-ID, syncClassification.ts
- [other] O-03-R2 — Six separate classification predicates rejected in favour of one classify(error, kind) function with a per-kind policy table (pending-media private ladder included)
    source: O-03 @ amendment 1 lines 29-32
    root_cause=true fix=none landed failed_recorded=true
    validity: all queue loops call classify; O3-F22
    verification: none named
    files: classify, lib/syncClassification.ts, pendingMedia.ts
- [other] O-03-R3 — Collapsing the six queues into one durable command log (expo-sqlite) must NOT happen before the drain: it would invalidate drain tooling
    source: O-03 @ amendment 3 lines 36-38
    root_cause=true fix=deferred to P14-fleet after ship failed_recorded=true
    validity: drain window not yet closed
    verification: none named
    files: expo-sqlite, outbox.ts
- [other] O-03-V1 — Each proposed engine change names a pure-module Jest test
    source: O-03 @ lines 13-23 ten changes
    root_cause=false fix=none failed_recorded=false
    validity: pure modules, AsyncStorage/NetInfo mocked
    verification: syncClassification.test.ts, outboxSync.test, sync.test, presenceSync.test, pingSync.test, travelSync.test, pendingMedia.test, pingTracker.test, auth.test, geofence.test, drainAll.test, queue.test, outbox.test
    files: pingTracker.test, drainAll.test, outboxSync.test
- [other] O-04-R1 — Server cannot distinguish phone offline from tracker dead in real time; late batch with received_at - captured_at > 2x interval proves offline, not dead
    source: O-04 @ line 16
    root_cause=true fix=label honestly: 'no pings received for N min'; late_batch_minutes failed_recorded=true
    validity: liveness derived from attendance_ping only (no app heartbeat); old APKs
    verification: none named
    files: attendance_ping, received_at, captured_at
- [other] O-04-R2 — Widening FIXFLOW_JOBS_GPS_BACKDATE_CEILING_HOURS during drain rejected: it feeds billing and job ids 404 first on a fresh DB
    source: O-04 @ line 32
    root_cause=true fix=leave at 48 failed_recorded=true
    validity: fresh DB drain
    verification: none named
    files: FIXFLOW_JOBS_GPS_BACKDATE_CEILING_HOURS
- [other] O-04-R3 — Same-deploy unique index on attendance_geofence(is_active) is only safe on a fresh DB; months of data need a prior orphan/duplicate audit script
    source: O-04 @ line 55
    root_cause=true fix=0049 as separate PR after audit script in backend/scripts/ (dry-run default) failed_recorded=false
    validity: restored months-old prod data; CLAUDE.md FK/validate rule
    verification: audit script in backend/scripts/
    files: uq_attendance_geofence_one_active, migration 0049
- [other] O-04-V1 — Drain mode order: set and verify the real fence row before any phone syncs, because verdicts freeze at receipt (O04-F17)
    source: O-04 @ lines 40-45 order of operations
    root_cause=true fix=none failed_recorded=false
    validity: drain-time settings are env-only FIXFLOW_*; read at import
    verification: verify attendance_geofence active row (is_active) before admitting phones; no test named
    files: attendance_geofence, FIXFLOW_ATTENDANCE_DEVICE_TIME_BACKDATE_CEILING_HOURS
- [other] O-05-R1 — CORS is not a security control here (bearer header from localStorage, not cookie); only an availability control: missing self-host origin breaks the console
    source: O-05 @ line 43
    root_cause=true fix=add web origin to FIXFLOW_CORS_ORIGINS failed_recorded=true
    validity: auth stays bearer-in-localStorage
    verification: none named
    files: FIXFLOW_CORS_ORIGINS
- [other] O-05-R2 — Mobile npm advisories (tar, glob, minimatch, js-yaml, etc.) ruled out as release-APK risk: build/dev tooling only; runtime-reachable ones low (no linking scheme, no negative nanoid size)
    source: O-05 @ line 45
    root_cause=true fix=fix with SDK upgrade, not urgent failed_recorded=true
    validity: no linking scheme in app.json; Expo SDK 52
    verification: none named
    files: app.json, @react-navigation/core, nanoid
- [other] O-05-R3 — Cloudflare Access service-token header in the APK rejected as strong control: extractable from APK, stops only scanners and bots
    source: O-05 @ line 67
    root_cause=true fix=still worth doing with policy 'service token OR identity' failed_recorded=true
    validity: APK distributed to techs
    verification: none named
    files: 
- [other] O-05-R4 — Login limiter collapses all users into one bucket (self-DoS) if a second reverse proxy (Caddy/nginx) sits after cloudflared with last-XFF keying
    source: O-05 @ line 70
    root_cause=true fix=prefer CF-Connecting-IP only when socket peer is the cloudflared container failed_recorded=true
    validity: per-IP limiter keys on last XFF entry; tunnel topology
    verification: cloudflared X-Forwarded-For behaviour to be tested before cutover
    files: per-IP limiter, X-Forwarded-For, CF-Connecting-IP
- [other] O-05-R5 — Known-device bypass of the login lock considered but the CLAUDE.md invariant (correct PIN blocked during lock) is kept
    source: O-05 @ line 51 step 4
    root_cause=true fix=per-(account, IP/device) keying plus Cloudflare rate rule failed_recorded=true
    validity: 4-digit PIN space; throttle.py per-account lockout
    verification: none named
    files: features/identity/throttle.py
- [other] O-06-R1 — Residual risk accepted: an operator with root on the live box can still alter live rows; design only makes it detectable within a day
    source: O-06 @ line 99
    root_cause=true fix=out-of-band head-hash anchor plus encrypted put-only backups failed_recorded=true
    validity: chain unkeyed; anchor pushed off-box
    verification: monthly restore drills verify chain anchor against restored head
    files: attendance/chain.py, staff_ledger_chain
- [other] O-06-R2 — Unkeyed unanchored hash chain cannot defeat an operator who can recompute it; only an out-of-band anchor does
    source: O-06 @ line 80
    root_cause=true fix=generalised per-shop chain, daily verify, head_hash pushed to owner failed_recorded=true
    validity: chain remains unkeyed
    verification: daily scheduler verify result in app_event
    files: attendance/chain.py
- [other] O-06-V1 — Claims flagged unverified in the note: tunnel token lets any holder run a connector for that tunnel (own knowledge, not fetched in W1); Cloudflare Access Free plan 50 users (R-03 F4)
    source: O-06 @ lines 87, 91
    root_cause=false fix=none failed_recorded=false
    validity: Cloudflare plan terms at time of use
    verification: 'verify it' / 'to be verified' (no command)
    files: cloudflared tunnel token
- [other] O-07-R1 — Driving postings from the job_event cursor rejected: payment/negotiate events carry no amounts or ids (S16) and seq is not commit-ordered (O07-F6)
    source: O-07 @ line 3
    root_cause=true fix=state-based stager via anti-join over source rows failed_recorded=true
    validity: job_event payload shape; dispatch_cursor has no erp row
    verification: none named
    files: job_event.seq, dispatch_cursor
- [other] O-07-R2 — Using seq, token or chain seq as an Odoo External ID rejected: a fresh DB restarts them and t1..t5/m1 recur
    source: O-07 @ line 11
    root_cause=true fix=External ID = fixflow_<kind>_<source_uuid hex32> with _x<n>/_r<n> suffixes failed_recorded=true
    validity: UUID-based source ids
    verification: none named
    files: external_id, job_token_seq
- [other] O-07-R3 — Updating a posted move rejected: Odoo refuses to modify a posted move and a changed External ID duplicates
    source: O-07 @ line 3, line 39
    root_cause=true fix=correction is always reversal plus new revision failed_recorded=true
    validity: Odoo accounting semantics
    verification: re-importing an already-posted move should fail loudly (verify in test company)
    files: posting, posting_decision
- [other] O-07-R4 — Odoo /xmlrpc and /jsonrpc rejected as transports: deprecated, removal in Odoo 22
    source: O-07 @ line 56
    root_cause=true fix=JSON-2 only, behind a Protocol, Custom plan only failed_recorded=true
    validity: Odoo version of owner; Custom plan for API (S15)
    verification: none named
    files: OdooJson2Transport, core/posting_transport.py
- [other] O-07-R5 — Splitting create and External-ID link into two JSON-2 calls rejected: each call is its own transaction (R-02 F5)
    source: O-07 @ line 58
    root_cause=true fix=search-before-create; create in ONE call carrying the External ID (account.move/load with id column) failed_recorded=true
    validity: Odoo JSON-2 semantics
    verification: none named
    files: account.move/load
- [other] O-07-R6 — Cloning run_weekly_export's window shape rejected: it would drop late or back-dated facts (O07-F2)
    source: O-07 @ line 47
    root_cause=true fix=window over posting.decided_at (approval time), pg_advisory_xact_lock, insert export first with ON CONFLICT DO NOTHING failed_recorded=true
    validity: approval time windows in shop-local dates
    verification: none named
    files: run_weekly_export, run_posting_export, posting_export
- [other] O-07-R7 — Self-hosted Odoo Community 19 not chosen: lacks Enterprise accounting reports and adds a second stateful app to one developer's host
    source: O-07 @ amendment 4 lines 77-80
    root_cause=true fix=Odoo Online + window-keyed CSV by default failed_recorded=true
    validity: revisit if live push or connector product matters
    verification: none named
    files: addons/rpc
- [other] O-07-V1 — Named verifications for the accounting hand-off
    source: O-07 @ line 49, 51; amendments 1,3
    root_cause=false fix=none failed_recorded=false
    validity: owner's Odoo version (20.0 or SaaS 19.x) and a test company
    verification: verify CSV column labels on owner's version; re-import already-posted move fails loudly in test company; P9-0a week-export script run against Appendix C restore and import the week twice (P9-0b); two-session race test against concurrent close
    files: account.move, job_payment_amount_positive
- [other] O-08-R1 — ufw rejected as the port control: Docker-published ports bypass ufw
    source: O-08 @ line 12
    root_cause=true fix=no ports: stanza is the control failed_recorded=true
    validity: Docker on Linux host
    verification: VERIFIED R-03 F16
    files: docker-compose.prod.yml
- [other] O-08-R2 — /api/health rejected as the container healthcheck: never touches the DB (O08-F07)
    source: O-08 @ line 15
    root_cause=true fix=curl /api/ops/health with X-Ops-Proxy-Token failed_recorded=true
    validity: /api/health implementation unchanged
    verification: none named
    files: /api/health, /api/ops/health
- [other] O-08-R3 — cloudflared documented catch-all http_status:404 rejected: hands phones a definitive 4xx that parks queued writes
    source: O-08 @ line 16, 62
    root_cause=true fix=catch-all http_status:503 failed_recorded=true
    validity: syncClassification.ts parks 400/403/404/409/422
    verification: HYPOTHESIS to test: stop cloudflared and curl -i (530/1033?)
    files: syncClassification.ts:15, cloudflared config.yml
- [other] O-08-R4 — Caddy ACME HTTP-01 / port-forward plan rejected: fatal under CGNAT
    source: O-08 @ line 78
    root_cause=true fix=outbound-only cloudflared tunnel failed_recorded=true
    validity: home ISP behind CGNAT
    verification: none named
    files: 
- [other] O-08-R5 — GlitchTip / Uptime Kuma on the same box rejected as monitors: they die with the box
    source: O-08 @ line 31, 32
    root_cause=true fix=Sentry SaaS now; off-box dead-man monitor (host cron DB check + external heartbeat) failed_recorded=true
    validity: APK Sentry DSN baked in
    verification: none named
    files: SENTRY_DSN
- [other] O-08-R6 — MinIO rejected for media: community edition archived, endpoint hard-coded (O08-F10)
    source: O-08 @ line 29
    root_cause=true fix=keep R2 (phones PUT to presigned URLs) failed_recorded=true
    validity: storage.py hardcodes R2 endpoint
    verification: none named
    files: storage.py:1-12,103-117
- [other] O-08-R7 — uvicorn --workers rejected: scheduler, limiter and metrics are per-process
    source: O-08 @ line 15
    root_cause=true fix=one uvicorn process via start.sh failed_recorded=true
    validity: in-process scheduler/limiter/metrics
    verification: none named
    files: start.sh, core/metrics.py
- [other] O-08-R8 — Cloudflare WAF, Bot Fight, Browser Integrity Check, managed challenges and Access on api.<domain> rejected: a challenge returns 403 which parks queued writes
    source: O-08 @ line 62 (ii)
    root_cause=true fix=keep OFF for api; rate limits only as 429 with Retry-After; maintenance 503 failed_recorded=true
    validity: syncClassification.ts classes 429 as retained, 4xx as park
    verification: none named
    files: syncClassification.ts
- [other] O-08-R9 — Reusing an old hostname, or a stub answering 200 with a non-JSON body, rejected
    source: O-08 @ line 63
    root_cause=true fix=never reuse old hostname failed_recorded=true
    validity: api.ts request() treats 2xx as landed
    verification: none named
    files: api.ts
- [other] O-08-V1 — Appendix B psql verification gate must pass before the backend starts on a restored DB
    source: O-08 @ lines 48-54 verification gate
    root_cause=true fix=none failed_recorded=true
    validity: dump head <= code head 0046; sequences job_token_seq, job_event_seq, shop_setting_seq at or above table max (below max makes every write 500 while reads stay green)
    verification: alembic_version 0045/0046; row counts >= last drill (3,268 rows, 42 tables); job_payment non-voided sum; dispatch_cursor whatsapp row near max seq; active attendance_geofence row; GET /api/attendance/ledger/verify
    files: alembic_version, job_token_seq, job_event_seq, shop_setting_seq, dispatch_cursor, attendance_geofence
- [other] O-08-V2 — HYPOTHESIS items needing a test: stopped tunnel yields 530/1033; PoP serving Karachi/Islamabad phones; latency range 60-250 ms per leg
    source: O-08 @ lines 62, 68
    root_cause=false fix=none failed_recorded=false
    validity: before cutover
    verification: stop cloudflared and curl -i; field-phone curl run with cf-ray header
    files: cf-ray
- [other] O-10-R1 — 503 stub on the old hostname rejected: every 5xx counts and parks after 5 flushes (O10-F3)
    source: O-10 @ line 40
    root_cause=true fix=HANG stub (accept, send nothing >= 20 s) so the 15 s client abort keeps items failed_recorded=true
    validity: MAX_ATTEMPTS = 5; 15 s client abort is a non-ApiError
    verification: none named
    files: MAX_ATTEMPTS
- [other] O-10-R2 — Any 2xx JSON or 204 from the old hostname rejected: reads as landed and deletes the item (O10-F4)
    source: O-10 @ line 40
    root_cause=true fix=never failed_recorded=true
    validity: api.ts request() semantics
    verification: none named
    files: api.ts
- [other] O-10-R3 — Uninstall, clear storage, Discard, Retry before B4 and logout on a phone rejected: wipes every queue or stamps rows at server_now
    source: O-10 @ line 6
    root_cause=true fix=A1 freeze instruction to every tech failed_recorded=true
    validity: before ceilings widened (B4)
    verification: none named
    files: AsyncStorage
- [other] O-10-R4 — Restoring the pre-drain DB snapshot after any phone drained rejected: phones deleted landed copies
    source: O-10 @ line 36, R2
    root_cause=true fix=forward corrections only unless every drained phone's manifest archive is in hand failed_recorded=true
    validity: after first phone drains
    verification: none named
    files: 
- [other] O-10-R5 — Raising the ping backdate ceiling for the drain rejected by default: 48 h guard is a location-privacy invariant (later overruled to 240 h permanent in G2 sec5)
    source: O-10 @ line 33
    root_cause=true fix=raise only on owner sign-off with a manifest showing older unsent pings failed_recorded=true
    validity: FIXFLOW_ATTENDANCE_PING_BACKDATE_CEILING_HOURS; conflicts with G2 adjudication
    verification: none named
    files: FIXFLOW_ATTENDANCE_PING_BACKDATE_CEILING_HOURS
- [other] O-10-R6 — Aborting mid-drain with an app-origin 4xx/5xx or a 2xx stub rejected
    source: O-10 @ lines 105-107 R3/R4
    root_cause=true fix=cut the tunnel route; with origin-aware classification the Cloudflare error is connectivity failed_recorded=true
    validity: D2 origin-aware classification shipped in the update APK
    verification: none named
    files: 
- [other] O-10-R7 — Discarding parked residue (e.g. 'job not found' on fresh/dump DB, cash included) rejected
    source: O-10 @ line 75 E7
    root_cause=true fix=manager enters it from the manifest archive, cash first failed_recorded=true
    validity: recovery case b/c; parked residue carries only app reasons
    verification: none named
    files: 
- [other] O-10-V1 — Update-APK tests named
    source: O-10 @ line 59 tests
    root_cause=false fix=none failed_recorded=false
    validity: update APK build with manifest, un-park and drainAll
    verification: manifest.test (counts; gate blocks sync until snapshot exists), unpark.test (edge reason un-parks, app detail does not), drainAll.test (order), plus the O-03 tests
    files: manifest.test, unpark.test, drainAll.test
- [other] O-10-V2 — AFTER check proves each phone drained: per-tech server row delta since T_open must equal the phone's landed count
    source: O-10 @ lines 67-74 E6
    root_cause=false fix=none failed_recorded=false
    validity: manifest exists per versionCode; drain_audit (backlog script) not yet written
    verification: drain_audit against the manifest: attendance_event.client_id counts, presence log, pings accepted+rejected, job.client_id, job_event.client_id, media status uploaded; any mismatch stops the fleet rollout (R7)
    files: drain_audit, attendance_event.client_id, job.client_id, job_event.client_id, POST /api/events drain_manifest

## Anomalies
- Granularity: G2 sec2 rows are one per table line, not per id. Many lines carry several ids (e.g. 'O6-F01 / O08-F01 / O05-01 / O10-F5', 'O10-F8..F14'), so the 75 register rows cover roughly 140 ids; register_id keeps the line's id list verbatim.
- No register row records a landed code fix. The only solved_entry (O08-F06) is a design-document correction; every other row is open_defect (including G/gap rows, status O open-risk rows and the P3 lumps). Sec 1.3 negative results are 7 rows (the first bullet 'eight of twelve lowered severity, none refuted' is meta and not a row).
- G2 sec1.3 bullets a and b are repeated in O-01 (O-01-R4) and the O01-F05 narrowing is stated in both G2 sec7 and HR sec3; counted once per source, so these are duplicates across sources.
- Conflict: O-10 note says the ping backdate ceiling stays 48 h (privacy invariant) but G2 sec5 adjudicated 240 h permanent and calls the 48 h justification arithmetically wrong. Both recorded (O-10-R5 flags it); stale text lives in O-10 and CLAUDE.md-style prose.
- Stale-in-source: O-10 and O-04 designs predate the HR amendments (e.g. O-01 dwell now deleted, O-03 classify() unification, O-08 VPS-first host); only O-01, O-03, O-07, O-08 carry appended Amendments sections. O-04, O-05, O-06, O-10 have none.
- Severities: G2 sec2 'Sev' is post-correction. Several V rows were downgraded by skeptics (O6-F01 P0->P1; O6-F02, F06, O3-F1, O04-F1/2/3/5 P1->P2); the pre-correction severities are in sec1.1 only and are not in the rows.
- G2 sec2 'apk unknown' applies to every row: installed field APK predates main by an unknown amount, so field-reach validity of all mobile rows is conditional on W0 item 3/8 (commit, versionCode, signing cert).
- The O-01 and O-03 notes name file:line citations (e.g. LocationTaskConsumer.kt:168-171) that are tied to expo-location 18.0.10 / expo-task-manager 12.0.6; they invalidate on an Expo SDK upgrade, and 'old architecture presumed, unverified' is stated in the source.
- Source counts: files_symbols for G2 register rows are mostly absent because the register states claims in prose; symbols were taken only from the claim text and from the O-xx notes where the same id is discussed.
- Harness 'Lessons carried into the plan' paragraph splits into 7 lessons; RT-03/02/05/06 are references to red-team ids defined elsewhere (not in the files read).
