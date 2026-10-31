# O-10 design

FLEET DRAIN PROTOCOL (release condition for the phones). Parameters: K = the field signing cert matches the EAS keystore (yes/no); H = we control the old hostname efficient-tenderness-production-2d09.up.railway.app (yes/no); R = recovery case (restorable / dump-only / nothing). Steps are ordered: no step may start before the previous one is verified.

A. FREEZE AND EVIDENCE (today, every case)
A1. Tell every tech: do not uninstall, do not clear app storage, do not tap Discard, do not tap Retry, do not log out. An uninstall or storage clear wipes every queue, and a Retry before step B4 stamps the row at server_now.
A2. Settle the parameters (W0).
- K: on each phone, `adb shell pm path com.fixflow.technician`, `adb pull <base.apk>`, then `apksigner verify --print-certs`. Compare the SHA-256 with `eas credentials` for project eb1d2f9f (owner instant_fidelity). Record the field versionCode from `adb shell dumpsys package com.fixflow.technician`; the UI shows only versionName 0.1.0.
- Grep the pulled bundle for 'jobs.outbox.v2' (v2 outbox present?) and for the API host.
- H: does the Railway service behind the old domain still exist?
- R: Supabase project or PITR available (restorable), only an R2 backups/db/ dump (dump-only, record T_dump), or neither (nothing).
A3. Photograph each phone's ClockScreen DID NOT SYNC list and the job banner counts. This is the only BEFORE evidence the field APK can give (O10-F1), and the whole proof in the K=no branch.

B. SERVER PREP (no phone may reach it yet; the tunnel route stays closed)
B1. Database.
- restorable: restore the latest point into the box's Postgres at the same major version.
- dump-only: restore the newest R2 dump; do not load a pg_dump 17 file into 16.
- nothing: `alembic upgrade head` (0046).
In every case, write down T_restore. Records that landed between T_restore and prod's death are lost on both sides: the phones deleted them on landing. Declare that loss; it cannot be measured from the phones.
B2. Environment.
- FIXFLOW_ENVIRONMENT=production. Without it, a box off Railway accepts the committed dev JWT secret (O10-F5).
- FIXFLOW_JWT_SECRET: a new random value in the update branch. Keep the old one only in the K=no/H=yes branch, if it is recoverable.
- FIXFLOW_ENABLE_DISPATCHER=false for the whole window (O10-F7).
- FIXFLOW_R2_*: set them and prove one selfie PUT end to end, or the punch drain stalls (O10-F8).
- Scheduler on, so backups run. Note that the Sunday payroll export may cover back-filled weeks (backlog).
B3. Data.
- The active fence row with the real centre and 80 m radius. A null fence makes every phone stop geofencing (O10-F14).
- Roster: every tech id that any phone holds must exist (t1..t5 and m1 are seeded; recreate any other slug).
- Set every PIN via set_pin over a local connection before the tunnel opens. A fresh DB has 1234 everywhere (O10-F6). In a restored DB, clear locks with set_pin.
B4. Open the drain window by widening the ceilings, then restart (settings are read at import).
- FIXFLOW_ATTENDANCE_DEVICE_TIME_BACKDATE_CEILING_HOURS = W. W = hours from the oldest queued device_time to now, plus 72 h. Before any manifest exists, base it on the last-known-good date: about 2,200 h from 2026-08-01, so start at 2640 (110 days), then lower it to the manifest maximum.
- FIXFLOW_JOBS_GPS_BACKDATE_CEILING_HOURS = W only when R is not 'nothing' (the jobs exist); otherwise keep 48.
- FIXFLOW_ATTENDANCE_PING_BACKDATE_CEILING_HOURS stays 48 by default. Outage pings were already dropped on the 404 (O10-F13), and the 48 h guard is a location-privacy invariant. Raise it to W only on owner sign-off, if a manifest shows unsent pings older than 48 h.
- Never touch the 120 s future tolerance.
- Record T_open. The honest flags are already there: device_time, server_time and drift_seconds are kept on every row, and drift_flagged marks each back-filled day.
B5. Take a pre-drain DB snapshot, for forensics only. Never restore it after any phone drains (O10-F9).
B6. Open the tunnel route on the owned domain. Verify that /health answers with the app-origin marker header (the O3 design step 1 server change).

C. OLD HOSTNAME
- H=yes and K=yes: replace the dead service with a HANG stub (accept, send nothing for at least 20 s, close). The client's 15 s abort is a non-ApiError, so every queue keeps its items and nothing counts toward MAX_ATTEMPTS. NOT a 503: every 5xx counts and parks after 5 flushes (O10-F3). NEVER any 2xx JSON or 204: those read as landed and delete the item (O10-F4). Remove the stub after the last phone is updated.
- H=yes and K=no: this host is the only drain path. After B1-B6, make it a reverse proxy to the tunnel hostname (see branch K=no).
- H=no: the APK update is the only guard. Until each phone is updated, the edge 404 keeps parking punches and crossings (recoverable by D3) and dropping pings and travel (lost). Keep the gap between B6 and the updates short.

D. THE UPDATE APK (K=yes); everything below ships in one build
D1. Same package com.fixflow.technician and the same EAS keystore. versionCode above the field value: check `eas build:version:get` and set it if needed (O10-F12). Build from a new 'fleet' profile (extends production, buildType apk, EXPO_PUBLIC_API_URL=https://<owned domain>, the real Sentry DSN, no empty env). The production profile is an AAB pointing at api.fixflow.example (O10-F11). Verify the URL in the built bundle.
D2. Origin-aware classification (O3 design 1). An edge 404 without detail, any non-app 4xx, and Cloudflare 502/530 are connectivity: break, no park, no drop, no count. A 401 is a pause. sendOrQueue enqueues on non-app errors and on 401 (O3 design 2).
D3. One-time un-park migration (O10-F2), run after D4. Reset to queued every punch, presence and outbox row whose reason is exactly /^rejected \(\d{3}\)$/, or /^gave up after \d+ attempts \(server 5\d\d\)$/ with failed_at inside the outage window. Reset parked pending media too. Rows carrying an app detail stay parked.
D4. Manifest snapshot at bundle load: an index.ts import placed before the task bodies, plus a gate promise every sync awaits. A headless task restored by MY_PACKAGE_REPLACED therefore cannot drain first. The snapshot is written once per versionCode to a durable key and holds, per queue and per owning tech:
- punches pending/parked by reason class;
- presence pending/parked;
- outbox queued/failed by kind;
- unsent pings and travel samples (with the oldest captured_at);
- pending media pending/parked;
- the full record list (ids plus payloads; no selfie or media bytes).
It is shown on a Drain Report screen and uploaded as the first authenticated call via POST /api/events, name 'drain_manifest' (props is unbounded; no migration). The drain waits for a 2xx receipt.
D5. drainAll(techId), run on AuthedStack mount, AppState active, NetInfo connected and after login: flushOutbox (creates first, FIFO), drainPendingMedia (rerun flag), syncNow, syncPresence, syncPings, syncTravelSamples. Media needs the created jobs; telemetry goes last.
D6. Session loss is total (O3 design 4): clearSession() on every 401, and the privacy gates require a token. Show a login banner.
D7. Duty truth from live punches only (O3 design 3), so a parked row cannot kill pings after the drain.
Tests: those in the O3 design, plus manifest.test (the counts, and the gate blocks sync until the snapshot exists), unpark.test (edge reason un-parks, app detail does not) and drainAll.test (order).

E. PER PHONE (supervised, workshop wifi, one pilot phone first, then the rest)
E1. BEFORE (field APK): the A3 photos.
E2. Install in place with `adb install -r fleet.apk`, or tap and confirm Android's 'install an update to this existing application'. On INSTALL_FAILED_UPDATE_INCOMPATIBLE or a version downgrade: STOP this phone, never uninstall, re-check K.
E3. Open the app. The manifest exists (Drain Report shows BEFORE). Re-grant permissions if hibernation revoked them.
E4. Re-login. The rotated secret makes every token fail. The login screen must say: "FixFlow moved to a new server. Sign in again. This phone holds N records for <name> (tN). Nothing has been deleted; they upload after <name> signs in." On a shared phone, each listed tech signs in in turn (O10-F10).
E5. Manifest upload receipt, then the drain. The Drain Report must reach pending=0 on every queue. Parked residue may only carry app reasons.
E6. AFTER check with drain_audit (backlog script) against the manifest:
- punches: count of attendance_event.client_id in M.punch_ids equals the pending count plus the un-parked count;
- presence: the same check on the presence log;
- pings: accepted plus rejected, as the phone recorded per id, equals the M.ping count;
- payments, creates (job.client_id), location rows and transitions (job_event.client_id): matched by client_id;
- completion, negotiate, customer pin and note (no client_id): matched by job state;
- media: rows for job and phase with status uploaded.
The per-tech server row delta since T_open must equal the landed count on the phone. Any mismatch stops the fleet rollout.
E7. Parked residue (for example 'job not found' on a fresh or dump DB, cash included) is never discarded. The manager enters it from the manifest archive, cash first.

F. CLOSE THE WINDOW
When every roster phone has an AFTER-verified manifest, or at a dated deadline (B6 + 7 days):
- Set the ceilings back to 24 / 48 / 48 (ping too, if it was raised), restart, and record T_close.
- Run the audit query: server_time between T_open and T_close and server_time - device_time > 24 h. Archive the result.
- A phone that shows up late gets a scheduled, supervised re-open (the ceilings are global).
- Re-seed dispatch_cursor('whatsapp') at max(seq) before the dispatcher is ever enabled.
- Delete the old-hostname stub.

RECOVERY CASE: WHAT THE SERVER ACCEPTS
- Restorable / dump-only: client_id dedupe makes replays of rows that already landed harmless. Writes for jobs created after T_restore come back as app 404s with a detail and stay parked, correctly. Travel samples for missing jobs are dropped by design.
- Nothing:
  - punches, crossings and pings land for the seeded ids;
  - offline creates land as new jobs;
  - every other job write and media item for an old job id parks with an app 404;
  - travel samples are dropped;
  - the cash in parked payments is recovered from the manifest archive.

BRANCH K=NO
- H=yes (the old APK drains through the proxy):
  - If the bundle lacks v2, queued job writes drop on the first 401 (O10-F15). Photograph them first. Then either accept the loss, or, under explicit owner sign-off, accept expired tokens signed with the old secret on write routes for the window.
  - Each tech logs in, taps Retry row by row on ClockScreen (B4 lands each row on its true day) and on each job's failed item. Failed creates are unreachable (O3-F12): transcribe them.
  - Pings and crossings drain only on the next ping or crossing (S7): clock in and walk through the fence.
  - The AFTER check runs against the photos only.
  - Then uninstall and install the new build (new cert).
- H=no: there is no drain path. Transcribe the photos as manual corrections (cash from the job items), declare the rest lost, then reinstall.

ROLLBACK AND ABORT
- R1. Before any phone drains, every server step can be redone.
- R2. After the first drain: forward corrections only. No DB restore unless every drained phone's manifest archive is in hand to replay.
- R3. Mid-drain abort lever: cut the tunnel route. With D2, the Cloudflare error is connectivity and nothing parks or drops. Never abort with app 4xx/5xx or a 2xx stub.
- R4. If any app-origin 5xx appears, cut the tunnel before five flushes (MAX_ATTEMPTS).
- R5. Install refused: stop that phone, no uninstall.
- R6. Manifest upload failed: no drain.
- R7. AFTER mismatch on the pilot phone: halt the fleet.
- R8. Deadline reached: close the window anyway; late phones get a per-phone re-open.
