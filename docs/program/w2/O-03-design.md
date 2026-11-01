# O-03 design

WHAT THE FLEET EXPERIENCED, QUEUE BY QUEUE (code on main; field APK unconfirmed). Phones were online and the API answered Railway's edge 404 with no FastAPI detail.
(1) Jobs outbox: items queued before the outage parked as 'rejected (404)' on the first flush, with a red banner 'need attention (see the job)'. Every new job write tapped online was refused with an error and never queued. Only airplane-mode writes queued, and those then parked on reconnect.
(2) Punches: kept, but parked at capture. The ClockScreen showed 'DID NOT SYNC — rejected (404)' with Retry/Discard and 'not clocked in', while the sampler ran on the parked clock_in for up to 14 h.
(3) Presence: kept, parked at capture, adding 2-4 more DID NOT SYNC rows per day; the queue has no cap.
(4) Pings: dropped. Every batch was marked done on the 404, so nothing from the outage survives.
(5) Travel: none recorded. The depart punch was refused, so the sampler never armed. Any samples already queued were dropped on the 404.
(6) Pending media: parked forever with no UI.
(7) Read caches: lists and details served the 'offline copy' stamp. Login was impossible.
After revival, the same APK would see: on-duty pings killed by the parked punches (O3-F2), Retry stamping months-old punches at server_now (O3-F4), and every token expired (30 days), so 401s with the headless strand (O3-F7) and live-tap loss (O3-F8). The URL is baked into the preview APK, so nothing drains until a new APK is installed as an in-place update (same keystore, W0) or the Railway hostname is reclaimed. An uninstall wipes every queue.

MINIMAL HONEST-ENGINE CHANGES, ORDERED BY VALUE, each with the pure-module Jest test that pins it.
1. Origin-aware classification. Backend: in RequestIdMiddleware (core/request_id.py:41-49), also stamp an app-only header (e.g. X-FixFlow-Api: 1) on every response, including unknown-route 404s. Do not reuse X-Request-ID: it echoes an inbound proxy value. Client: ApiError keeps fromApp = header present, or, for older backends, a JSON object body with a 'detail' key. isDefinitiveRejection and the MAX_ATTEMPTS bump require fromApp; any non-app status, 4xx or 5xx (edge 404, Cloudflare 403/502/530, a captive-portal page), is connectivity: break, no park, no drop, no count. Tests: new syncClassification.test.ts (404 without marker is not definitive; with marker it is; a 530 without marker does not count as an attempt); per-queue cases in outboxSync.test, sync.test, presenceSync.test, pingSync.test, travelSync.test and pendingMedia.test asserting an edge 404 leaves the item queued and unchanged. No existing test pins 404 (grep), so nothing breaks.
2. sendOrQueue keeps the write on non-app errors and on 401: enqueue tagged with the tech, return queued (or a typed AuthPaused). Test (outboxSync.test): a live 404 without marker yields status 'queued' and the item is stored; a live 401 stores the item and leaves the flush paused.
3. Duty truth from live punches only: one pure latestLivePunch(queue, techId) (excluding done and parked) used by both dutyStatus and useAttendance.clockedIn. Tests (pingTracker.test): a parked clock_out plus a clockedIn cache still records the ping; a parked clock_in alone yields off duty without the 'expired' notification; plus a pure helper test of the clockedIn derivation.
4. Session loss is total: clearSession() in lib/auth removes token and tech on every 401 whether or not a handler is registered; the privacy gates require a token; restore drops a tech that has no token. Tests: auth.test (401 path clears both keys); pingTracker.test and geofence.test (tech present, token absent: nothing recorded and the sampler stops).
5. One drainAll(techId) orchestrator run on mount, AppState active, NetInfo connected and after login, in the order flushOutbox, drainPendingMedia (with rerun-if-requested), syncNow, syncPresence, syncPings, syncTravelSamples. Test: drainAll.test with mocked syncs asserts every queue is called, in order, and is skipped without a tech.
6. Stale-replay honesty: a pure retryAdvice(item, now, ceilingH) marks rows past the server ceiling as 'late' and the UI asks before retrying. Server: store late punches/presence with device_time and a late_sync flag excluded from derive, instead of re-bucketing them into today (pytest against real Postgres). Client test: retryAdvice boundaries at 24 h and 48 h.
7. Recovery surfaces: retryPendingMedia/discardPendingMedia, and a global Needs-attention selector over outbox items whose job is unreachable (failed creates) plus parked media. Discard copy distinguishes 'server refused' from 'could not reach the server'. Tests: pendingMedia.test (a parked item is retried after reset); a pure selector test that a failed create is listed.
8. Location outbox id per tap (body.client_id) so trips never overwrite each other, and a pure travel-state merge of server locations with queued location items for inTransit. Tests: outbox.test (two departs for one job both kept); a merge test (a queued depart reads as inTransit).
9. Corrupt-store preservation for v2 and attendance queues (copy the raw bytes aside before save). Test: queue.test and outbox.test (an unparseable value survives under the .corrupt key after an enqueue).
10. Engine status (offline / server-unreachable / signed-out) driving the banner text. Test: a pure reducer test from classification outcomes to status.

---

## Amendments (2026-11-01, harness review — `../HARNESS-REVIEW-2026-11-01.md` HR-A2)

1. **Step 1 is one function, not six predicates.** `classify(error, kind)` returns one outcome
   (`landed` / `pause_auth` / `park` / `count_and_retry` / `free_retry` / `drop`) from a per-kind
   policy table; every loop calls it, the pending-media queue included (`O3-F22`: its 413 branch
   and "park by forcing attempts" become policy rows). No queue keeps a private ladder.
2. **Storage size in the manifest** (`O10-F17`, lands in P2b-1): the D4 manifest records the
   phone's total AsyncStorage bytes; the Android cap is 6 MB and nothing has measured it.
3. **After ship (P14-fleet):** the six queues collapse into one durable command log
   (expo-sqlite) with one dispatcher, single-flight per stable id shared by live sends and
   replays (closing CLAUDE.md's known outbox defect), one classifier, a per-kind park/drop policy
   and one trigger set. Never before the drain: it would invalidate the drain tooling.
