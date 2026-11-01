# O-01 design

ANSWER IN ONE PARAGRAPH. On these phones the three behaviours mostly fail for the same reason: they depend on a process the OEM is allowed to keep or restart, and on a foreground service the app never restores.
- H1: there is no autostart or lock-in-recents handling, so kills are silent and boot restore can be blocked.
- H10: after any restart, the sampler comes back without its foreground service, and isRunning() stops the app from repairing it. Tracking degrades to a few fixes per hour and is invisible.
- H16: a Location toggle silently removes the fence until the next app open.
- H3 and H2 then suppress or lose many of the crossings that do arrive: the phone's raw-point rule disagrees with the server's overlap rule, and the dwell path runs past Expo's 15 s job.
Code-level contributors: F08-F13 (fire-and-forget syncs cut by the 2 s teardown, the untracked second event, the debounce stamped before confirmation, the re-add on every foreground with initial triggers, Expo's shared static timestamp, last-fix-only pings).

FIELD PROTOCOL (one technician phone, about 55 min, laptop with adb, during the tech's shift at the workshop). Ground rules:
- Never uninstall, clear data or tap Discard.
- Use no mock locations (they flag rows and do not drive Play geofencing reliably).
- Avoid `am force-stop` until the end.
- Test crossings are real presence rows in this phone's queue; log the time window for O-10.

Step 0, guard (3 min). Before opening FixFlow, turn OFF its Wi-Fi and mobile data in the OEM per-app data settings, so every sync fails as a kept network error instead of the dead host's 404 (dropped or parked, S9). Write down the clock time.

Step 1, static state (7 min). Each check's expected output tells you what it rules in:
a) `adb shell dumpsys package com.fixflow.technician | grep -E 'versionCode|versionName|firstInstallTime|lastUpdateTime|targetSdk|userId'`. Feeds H14; gives the uid.
b) `... | grep -E 'ACCESS_(FINE|COARSE|BACKGROUND)_LOCATION|POST_NOTIFICATIONS'`. Expect granted=true for all.
- BACKGROUND false: H9 on this phone. Geofencing is stopped and steps 3-4 only measure the FGS path.
- FINE false with COARSE true: approximate grant; geofencing is dead (F07).
c) `adb shell appops get com.fixflow.technician`.
- RUN_ANY_IN_BACKGROUND: ignore means the AOSP background restriction is on (H1 precondition).
- Note any OEM autostart op if the ROM prints one.
d) `adb shell dumpsys deviceidle whitelist | grep fixflow`. Absent means not battery-exempt, so Doze and standby apply.
e) `adb shell am get-standby-bucket com.fixflow.technician`.
- 40 RARE or 45 RESTRICTED: Expo's jobs (every delivery is one) are deferred; an H1-class throttle.
f) `adb shell cmd app_hibernation get-state com.fixflow.technician` (Android 12+). true means H9 by hibernation.
g) `adb shell settings get secure location_mode` (0 = off, H16 live now) and `adb shell dumpsys location | grep -iE 'enabled|provider'`.
h) `adb shell dumpsys netpolicy | grep -A2 <uid>`. Blocked reasons beyond the step-0 cut (DATA_SAVER, RESTRICT_BACKGROUND, APP_BACKGROUND) point to H17 / #52544.
i) On the device, record: OEM autostart for FixFlow, the app battery saver setting, and whether the app is locked in recents. adb cannot read these reliably.

Step 2, forensics before touching the app (5 min):
a) `adb shell dumpsys activity exit-info com.fixflow.technician`. Gives recent deaths with reason and timestamp. Read it as:
- USER_REQUESTED or OTHER/SIGNALED with OEM text during shifts: H1, with frequency per day.
- CRASH with 'Starting FGS with type location': #49424 (F15).
- PERMISSION_CHANGE: H9.
- LOW_MEMORY: memory pressure.
b) `adb logcat -b all -d -v time > before.txt`, then grep for fixflow, TaskService, LocationTaskConsumer, GeofencingTaskConsumer, am_proc_start, am_kill.
- 'Handling intent with action android.intent.action.BOOT_COMPLETED' after the last boot (`adb shell uptime`): boot restore was delivered.
- No such line after a boot: OEM blocked it (H1).
- 'Foreground location task cannot be started while the app is in the background!': H10(b) happened.
- 'There is no location provider available': H16 at registration.
c) If the tech is clocked in: `adb shell dumpsys activity services com.fixflow.technician`.
- Healthy: 'LocationTaskService ... isForeground=true foregroundId=481756 types=0x00000008'.
- No ServiceRecord: H1 or H10 already struck this shift; exit-info says which.

Step 3, separating H1 from H10 (15 min, tech on duty, FGS present):
a) Start a live capture: `adb logcat -v time -s TaskService:* LocationTaskConsumer:* GeofencingTaskConsumer:* ReactNativeJS:*` plus `adb logcat -b events | grep -i fixflow`.
b) Swipe FixFlow from recents, wait 60 s, then run `adb shell pidof com.fixflow.technician` and `dumpsys activity services`.
- Process and FGS alive: swipe-kill is ruled out on this ROM.
- Process gone with a new exit-info entry: the OEM kills on swipe (H1).
c) Screen off, wait 10 min (two ping intervals).
- 'Handling intent/Handling job ... fixflow-attendance-pings' lines with am_proc_start 'broadcast' and no ServiceRecord: the process restarts but the sampler has no FGS (H10b). One or two deliveries in 10 min confirms background throttling.
- No deliveries and no process start: the OEM blocks restart (H1).
d) Open FixFlow and run `dumpsys activity services` within 15 s.
- LocationTaskService is back: H10(c) refuted on this path (restore ran while foregrounded).
- Still absent while on duty: H10(c) confirmed (pingTracker.ts:185).

Step 4, H16 plus H3/H2 timing (20 min, app open then Home, screen off):
a) Walk to 150 m or more from the fence centre. Within about 6 min expect 'Handling job with task name fixflow-attendance-geofence' then 'Finished task'. A gap over 15 s means the dwell ran (H3/H2).
b) Location OFF for 60 s, then ON. Expect 'Handling intent with task name fixflow-attendance-geofence' with no 'Handling job' after it: the GEOFENCE_NOT_AVAILABLE delivery.
c) Walk back within 40 m of the centre and wait 6 min.
- No job: H16 confirmed.
- A job: Play services kept the fence on this ROM (H16 weakened).
d) Open the app. A geofence job within 1-2 min confirms the foreground-only recovery and the re-add noise (F11).

Step 5, close-out (2 min): exit-info again; `adb logcat -d > after.txt`. Restore the app's network only when O-10 says so.

Separation:
- H1: exit-info deaths, plus no deliveries while killed, plus no boot broadcast.
- H10: deliveries arrive without the FGS, and the FGS is still absent after opening the app.
- H16: no crossings after a toggle until the app is opened.
- Step 1b/1f gates H9 first.

IN-APP LOGGING SO THE NEXT FIELD REPORT IS DECISIVE (ships in the fix APK):
- Store: a bounded diagnostics ring in AsyncStorage key diag.bg.v1, mutex-guarded, at most 500 entries, pruned at 7 days.
- Privacy: no coordinates beyond what presence rows already carry. Geofence verdict entries may hold accuracy_m and a signed distance-to-edge rounded to 10 m.
- Transport: shipped as droppable telemetry batches to POST /api/events, plus a hidden Diagnostics screen with Share.
Entries:
- proc/bundle start: timestamp, AppState at load, headless yes/no.
- task_begin / task_end per task: delivery-to-handler delay, duration, outcome.
- geofence_error: message.
- gps_fix: ms_to_fix, accuracy, per-fix verdict; plus dwell_started.
- crossing_recorded; notify_shown or notify_suppressed with reason.
- On every foreground: {fg, bg, accuracy fine|coarse, hasServicesEnabledAsync, getProviderStatusAsync, batteryOptimized, fence active and radius, hasStartedGeofencingAsync, ping/travel registered, re-arm performed}.
- sync_result per queue: HTTP status or network-error class, plus queue depth.
- headless_401.
- sampler_gap: previous ping older than 3x the interval while on duty.
Server side (O-04/H18): a per-tech, per-day sampler-health view built from these events.

FIX ORDER (each respects the 14 h / 4 h bounds and the outbox contract):
1. F05 + F10: record first, bound every GPS read, local duty check, stamp after enqueue.
2. F04: shared verdict rule; owner raises the fence to >= 100 m.
3. F01: re-arm the FGS on 'active' within bounds; patch #49424/#52230; sampler_gap notice.
4. F03: error-branch re-register, provider banner, periodic re-check.
5. F06/F07: permission and accuracy banner, hibernation exemption.
6. F02: OEM onboarding.
7. F08: awaited syncs and foreground drains for pings and presence.
8. F09/F12/F14: patch-package fixes in expo-task-manager / expo-location.
9. F11/F13/F18: cleanups.

H11 ISSUE CLASSIFICATION against expo-location 18.0.10 / expo-task-manager 12.0.6 on Android 13-15:
- #52544: APPLICABLE, conditional. 12.0.6's JobInfo has no network constraint (TaskManagerUtils.java:212-218), but the symptom needs Android 15+ and a process alive in the background without the FGS. Effect is a network error, so data is kept and only the depart reminder is lost. Its note on the 15 s cap leading to a frozen process supports H2. The reporter was on an SDK 55 emulator; the issue was closed for a missing repro, not fixed.
- #49424: APPLICABLE, conditional. The same unguarded startForegroundService, bind, then startForeground in onServiceConnected (LocationTaskConsumer.kt:191-219). Needs Android 14+, targetSdk 34 (the SDK 52 default) and only a while-in-use grant; with 'all the time' the location FGS is not foreground-only. Our trigger: Start travel, then lock immediately.
- #46505: UNKNOWN, likely applicable in effect. Its symptom (updates never resume after a user stop from the location indicator) matches H10(c)/(d) in our app regardless of the Expo root cause, which the issue does not identify. The reporter, on SDK 56, says older versions are worse.
- #52230: APPLICABLE. Same early return (LocationTaskConsumer.kt:168-171) and mService-only stop (226-228). Our LocationTaskService.onStartCommand never calls startForeground (LocationTaskService.kt:34-41), so the device outcome after an OS restart (no notification, a lingering one, or an ANR-type kill) is unknown. First seen on OPPO ColorOS 13, the same class of phone as the fleet. It cites #47595 (an app update freezes tracking), which matters for O-10.
- #50060: LIKELY APPLICABLE. Same once-only setTaskManager (TaskManagerInternalModule.java:50-56) and invalidateAppRecord removal (TaskService.java:603-610). The old-arch invalidateApp branch also spares an Activity-bound instance (RNHeadlessAppLoader.kt:89-103). Our build is presumably old architecture (no newArchEnabled in app.json; unverified), and the outcome after the drop is unverified.
- #47023: NOT APPLICABLE as described. 12.0.6's TaskJobService.onStartJob only calls taskService.handleJob (TaskJobService.java:9-14), with no mJobParams or thread pattern. Our cadence (5 min pings, 20 s travel) is far below the reporter's continuous GPS.
Mechanisms not in that list but present in this version: the shared static timestamp (F12) and the initial-trigger re-add (F11, title of #33433).

REFUTED or NARROWED CANDIDATES:
- requestForegroundPermissionsAsync from a headless context: a status read in the pure headless case (F19 residual only).
- 'jobFinished stops the JS': no (S1).
- The FGS-less sampler still obeys the 14 h / 4 h bounds, because handlePingUpdate and handleTravelUpdate check them per batch; the privacy breach is visibility, not duration.

---

## Amendments (2026-11-01, harness review — `../HARNESS-REVIEW-2026-11-01.md` HR-A1a/A1b/A1c)

1. **The dwell is deleted, not bounded.** FIX ORDER 1 becomes: one bounded fix per crossing
   (`getLastKnownPositionAsync` max age 2 min and accuracy ≤ 100 m, else `getCurrentPositionAsync`
   under an 8 s timeout, else null coordinates); the presence row is enqueued after the bounded fix
   returns, carrying its coordinates (null only on timeout); the debounce stamp is written after
   the enqueue; a fix older than the handler's start time never suppresses; the 20 s `DWELL_RECHECK_MS` path
   and the second fix are removed. The phone applies the R1 rule to that single fix only to
   suppress the prompt on a definitive outside; the server recomputes every row.
2. **New finding `O01-F20` (P1).** Both location tasks share one `LocationTaskService`
   (`expo-location` 18.0.10, `LocationTaskService.kt:49-52`, `LocationTaskConsumer.kt:62-64,
   226-228`). `stopJobTravel` calls `stopLocationUpdatesAsync(TRAVEL_TASK)`, which runs
   `stopForeground(true)` + `stopSelf()` on the instance the on-duty ping task also uses; the
   sampler then runs throttled for the rest of the shift and `ensurePingTracking` never re-arms.
   Fix (P5a): a `dutyStatus`-gated `reassertPingForeground` — on duty and foregrounded → a forced
   re-register with the foreground option (Expo refuses a foreground service from the background);
   expired → `autoStopExpiredDuty`; a leg ended in the background is repaired on the next
   `active` (or consolidate both into one mode-switching task). Check (P5c): `adb shell dumpsys
   activity services` shows `isForeground=true` after a travel leg ends from the foreground, and
   after the next foreground when it ended in the background.
3. **Shift-start reminder** (P5b-2, §4 decision default yes): `expo-notifications` WEEKLY triggers
   at shift start + grace on working days from the cached shift, cancelled by the clock-in punch,
   rescheduled on foreground and login; a pure scheduling function with Jest tests. It is the
   location-free backstop for the arrival prompt.
4. **Commercial SDK spike** (phase P5-spike, §4 decision): a one-session debug build of
   `react-native-background-geolocation` under a separate applicationId on the spare phone,
   never signed in to `api.<domain>` during the drain window, decided at P5a's entry; a
   favourable result proves compatibility only (standing rule 2). Not a replacement of this note; the patched-Expo path stands unless the spike and the
   owner say otherwise.
