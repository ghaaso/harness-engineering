---
name: android-field-debugging
description: Read-only adb evidence capture from FixFlow technician phones (package com.fixflow.technician, Expo SDK 52, expo-location 18.0.10, expo-task-manager 12.0.6) for the O-01 field protocol, the drain and install sessions (O-10, P2c, P4a, P4b, P4r) and the v2 device checks (P5c, P5d-1a, P5d-1b, P5d-2). Gives the exact dumpsys commands (package, appops, deviceidle, standby bucket, hibernation, location, netpolicy, activity services, exit-info), the logcat filter for TaskService / LocationTaskConsumer / GeofencingTaskConsumer / ReactNativeJS, versionCode and lastUpdateTime checks, the owner-run bug-report procedure and excerpt redaction, and the geofence evidence chain (registration to network call) tied to file:line. Use it when a brief says to capture or read device evidence. Do NOT use it to install, uninstall, clear data, force-stop, change settings or permissions, restore the app's network, message a technician, or judge field reliability; those are [owner] steps or other agents' work.
---

# Android field debugging — FixFlow technician phones

The phones are the only place the truth about geofencing, the on-duty sampler and the offline
queues lives; the field APK is older than `main`, so **code on `main` yields candidates; device
evidence yields conclusions** (`docs/ORCHESTRATION-DESIGN-2026-10.md:540`). This skill makes the
capture repeatable and read-only. It serves design §9 row "Android field debugging protocol"
(`docs/ORCHESTRATION-DESIGN-2026-10.md:725`), register ids **O-01** (`O01-F01`..`O01-F20`) and
**O-10** (drain sessions), and plan phases P2c, P4a, P4b, P4r, P5c, P5d-1a, P5d-1b, P5d-2.
All facts below were re-read on 2026-11-04.

## 1. FixFlow facts

### 1.1 Package, versions, permissions

| Fact | Citation |
|---|---|
| Package id `com.fixflow.technician` (key `android.package`; not a secret) | `technician-app/app.json:16` |
| `app.json` has **no** `versionCode` key; versionCode comes from EAS (`eas.json` key `appVersionSource`, `technician-app/eas.json:4`, value not read). Read it on the phone | key list of both files, 2026-11-04 |
| versionName `0.1.0` — the only version the UI shows | `technician-app/package.json:3`; `docs/program/w2/O-10-design.md:8` "the UI shows only versionName 0.1.0" |
| `expo` ~52.0.0, `expo-location` ~18.0.10, `expo-task-manager` ~12.0.6, `react-native` 0.76.9 | `technician-app/package.json:19`, `:30`, `:33`, `:36` |
| Native sources read for this skill: expo-location 18.0.10, expo-task-manager 12.0.6, expo-modules-core 2.2.3 under `C:/Users/User/.fixflow-cache/expo-src/<pkg>-<version>/package/` | cited by path in `references/fixflow-evidence-chain.md` |
| Declared permissions: CAMERA, RECORD_AUDIO, READ/WRITE_EXTERNAL_STORAGE, ACCESS_FINE/COARSE/BACKGROUND_LOCATION, ACCESS_WIFI_STATE, POST_NOTIFICATIONS, FOREGROUND_SERVICE, FOREGROUND_SERVICE_LOCATION, REQUEST_IGNORE_BATTERY_OPTIMIZATIONS | `technician-app/app.json:24-35` |
| Android-only, needs an EAS dev build (not Expo Go) | `CLAUDE.md:28` |
| Background geofencing (`expo-task-manager` + `ACCESS_BACKGROUND_LOCATION`) drives the arrival/exit prompts | `CLAUDE.md:57` |
| No `technician-app/patches/` yet. P5a creates it for the #49424 guard and #52230 stop fallback (`patches/` + `postinstall`, `O01-F15`); the `O01-F09`/`F12`/`F14` (and `F17`) patches land in P5b-1 | `ls` 2026-11-04; `docs/program/SHIP-PLAN-2026-11.md:805-806` (P5a), `:842-843` (P5b-1); patch list `docs/program/w2/O-01-design.md:101` |

### 1.2 Tasks, keys, constants (what to grep for)

| Kind | Name = value | Citation |
|---|---|---|
| task | `GEOFENCE_TASK = "fixflow-attendance-geofence"` | `technician-app/src/features/attendance/geofence.ts:35` |
| task | `PING_TASK = "fixflow-attendance-pings"`; FGS title "FixFlow — on duty" | `technician-app/src/features/attendance/pingTracker.ts:36`, `:194` |
| task | `TRAVEL_TASK = "fixflow-job-travel"`; FGS titles "FixFlow — travelling to job" / "FixFlow — returning to workshop" | `technician-app/src/features/jobs/travelTracker.ts:27`, `:201-202` |
| load | the three task modules are imported before render so a headless start defines them | `technician-app/index.ts:8-10` |
| re-arm | geofence, pings, travel re-armed on mount and on every `active` | `technician-app/src/features/attendance/useAttendanceBackground.ts:53-68` |
| debounce_ms | `DEBOUNCE_MS = 3 * 60 * 1000` | `geofence.ts:46` |
| interval_ms | `DWELL_RECHECK_MS = 20 * 1000` (deleted in P5a, HR-A1a) | `geofence.ts:58`; `docs/program/w2/O-01-design.md:126-127` |
| interval | `DEFAULT_PING_INTERVAL_MIN = 5` | `pingTracker.ts:43` |
| bound | `maxDutyHours: 14`; `MAX_TRAVEL_MS = 4 * 60 * 60 * 1000` | `technician-app/src/lib/config.ts:51`; `travelTracker.ts:39` |
| timeout_ms | `REQUEST_TIMEOUT_MS = 15_000` (client abort) | `technician-app/src/lib/api.ts:85` |
| queue_cap | `MAX_ATTEMPTS = 5` (5xx parks after five) | `technician-app/src/lib/syncClassification.ts:24` |
| Expo cap | `MAX_TASK_EXECUTION_TIME_MS = 15000` per job; app record invalidated 2 s after the last event | `expo-task-manager-12.0.6/…/TaskService.java:52`, `:209-218` |
| FGS id | first `LocationTaskService` in a process is `481756` | `expo-location-18.0.10/…/services/LocationTaskService.kt:118` |
| storage_key | `attendance.geofence.cache.v1`, `attendance.presence.lastCrossing.v1` | `geofence.ts:41-42` |
| storage_key | `attendance.duty.v1`; `attendance.pings.queue.v1`; `attendance.presence.queue.v1`; `attendance.queue.v1` | `pingTracker.ts:42`; `technician-app/src/features/attendance/pingQueue.ts:35`, `presenceQueue.ts:43`, `queue.ts:43` |
| storage_key | `jobs.outbox.v2` / `v1`; `jobs.travel.queue.v1`; `media.pending.v1`; `jobs.cache.list.v1` | `technician-app/src/lib/outbox.ts:62-63`; `technician-app/src/features/jobs/travelQueue.ts:32`; `technician-app/src/features/media/pendingMedia.ts:38`; `technician-app/src/lib/jobsCache.ts:18` |
| planned | `diag.bg.v1` diagnostics ring does **not** exist yet (ships in the fix APK) | `docs/program/w2/O-01-design.md:78` |

A wipe of these keys is a wipe of every offline queue — the reason clear-data and uninstall are
forbidden (§4).

### 1.3 Where this skill is used

| Phase / id | What the capture is for | Citation |
|---|---|---|
| O-01 protocol (inside P4a, P5c, P5d-1b) | steps 0–5, ~55 min, one phone, tech on shift, adb laptop | `docs/program/w2/O-01-design.md:10-69` |
| P2c | spare phone only: installed versionCode, cert, bundle grep after the fleet APK install | `docs/program/SHIP-PLAN-2026-11.md:479` |
| P4a | field protocol on the field build; logcat captured **before** the app is opened after `adb install -r`; "Sonnet tabulates logcat" | `SHIP-PLAN-2026-11.md:677-678`, `:686-687`, `:708` |
| P4b, P4r | per-phone version/install evidence beside each E1–E6 row (O-10 E2 STOP conditions) | `SHIP-PLAN-2026-11.md:710`, `:746`; `docs/program/w2/O-10-design.md:63` |
| P5c | v2 pilot: O-01 3d, 4b–4d, indoor test, cross-stop check `O01-F20` via `dumpsys activity services` | `SHIP-PLAN-2026-11.md:880-890` |
| P5d-1a | "versionCode check, Drain Report empty, `adb install -r` …, never uninstall" | `SHIP-PLAN-2026-11.md:898` |
| P5d-1b | O-01 steps 1–4 incl. 3b/3c, one phone per OEM, start/end time per phone | `SHIP-PLAN-2026-11.md:907` |
| P5d-2 | tabulated ring telemetry and protocol windows (excluded from metrics) | `SHIP-PLAN-2026-11.md:913` |
| Register | `O01-F01`..`O01-F19` titles | `docs/program/evidence/w2/O-01.txt:24`..`:254` |
| Register | `O01-F20` cross-stop (shared `LocationTaskService`) | `docs/program/w2/O-01-design.md:129-139` |

## 2. Procedure

Every agent step is read-only and runs only when the brief says "runs commands". Steps marked
**[owner]** are done by the owner (or the session under the owner's supervision); the agent's
procedure **stops** there and waits. Command text lives in `references/fixflow-capture-sheet.md`.

1. **[owner]** USB debugging is enabled on the phone and the laptop key is accepted
   (`docs/program/SHIP-PLAN-2026-11.md:269-270`); the technician is present and has agreed.
   Telling the technician what to do is the owner's job (README rule 4).
2. Identify the device: `adb devices -l` must list exactly the serial the brief names, in state
   `device`. Zero devices or `unauthorized` → stop with `DEVICE_NOT_PRESENT`. Record manufacturer,
   model, Android release and SDK (`getprop`), the phone-vs-laptop clock skew, and `uptime`.
   Report the serial as a fingerprint (first 12 hex of sha256).
3. **[owner]** O-01 step 0: FixFlow's per-app Wi-Fi and mobile data are **off before the app is
   opened**, and the clock time is written down (`docs/program/w2/O-01-design.md:16`; plan P0a
   item 12, `SHIP-PLAN-2026-11.md:275-277` "It lifts only per the §2 branch box"). The agent
   records the time it was told; it never changes network state.
4. Installed version and package state (capture sheet §1): `dumpsys package` lines for
   versionCode, versionName, firstInstallTime, lastUpdateTime, targetSdk, userId,
   installerPackageName, pkgFlags; the location/notification grants; `pm path`. For P2c/P4/P5d
   also pull `base.apk` and run `apksigner verify --print-certs` and the bundle grep for
   `jobs.outbox.v2` (`docs/program/w2/O-10-design.md:8-9`). **[owner]** compares the cert with
   `eas credentials` (K).
5. Background-execution state (sheet §2; O-01 step 1c–1h, `O-01-design.md:23-31`): appops,
   deviceidle whitelist, standby bucket, hibernation state, `location_mode`, `dumpsys location`,
   `dumpsys netpolicy` for the uid. **[owner]** reads OEM autostart, app battery saver and
   lock-in-recents off the device screens (`O-01-design.md:32`).
6. Forensics before the app is touched (sheet §3; `O-01-design.md:34-47`): `dumpsys activity
   exit-info`, `logcat -b all -d` (never `-c`), the filtered extract, and `dumpsys activity
   services` if the tech is clocked in.
7. Live capture (sheet §4): a tag-filtered `logcat -T '<step-0 time>'` and the events buffer,
   both `timeout`-wrapped to host files; `pidof` and `dumpsys activity services` at each mark.
8. **[owner]** The physical protocol actions — swipe from recents, screen off and wait, Location
   off/on, the walks to ≥150 m and back within 40 m, opening the app
   (`O-01-design.md:49-67`) — are done by the person holding the phone. The agent timestamps each
   mark and captures; it sends no input to the phone.
9. **Bug report** (only when the brief asks and the owner says go):
   - **[owner]** asks the technician's consent, explains that the report holds the whole phone
     (every app's logs and notifications, accounts, Wi-Fi names, location history), and takes
     custody of the zip. Raw captures and the zip stay **outside the repository** on the owner's
     machine.
   - **[owner]** runs the capture: `adb -s <serial> bugreport <dir>`; older reports are listed
     with `adb shell ls /bugreports/` and pulled with `adb pull /bugreports/<name>.zip`
     (WEB, https://developer.android.com/studio/debug/bug-report, fetched 2026-11-04). On the
     phone instead: Developer options → Take bug report → choose the type → Report → share from
     the notification (same page) — **[owner]** with the technician. The agent never runs these.
   - The agent analyses only the excerpt of `bugreport-BUILD_ID-DATE.txt` the owner hands it (the
     file holds dumpsys, dumpstate and logcat output, same page): lines for
     `com.fixflow.technician`, its uid, the Expo tags and `am_proc_start`/`am_kill` for its pids.
   - Redact before anything leaves the laptop: latitude/longitude → `<loc>`; SSID/BSSID →
     fingerprint; account e-mails, phone numbers, IMEI/serial → fingerprint; other apps'
     notification text → dropped. Only the redacted excerpt and your table go to the session.
10. Close-out (sheet §5; `O-01-design.md:69`): exit-info again, `logcat -d` after, `sha256sum` of
    the capture folder. **[owner]** restores the app's network only when O-10 says so.
11. Return the DEVICE-EVIDENCE table (agent definition) — lines, times, values, which hypothesis
    or register id each line bears on. No verdict: the analyst
    (`fixflow-android-background-analyst`) and the session judge (standing rule 2,
    `SHIP-PLAN-2026-11.md:99` "No field-reliability claim without device evidence from the phone
    models in the fleet").

Installs (`adb install -r`) in P2c/P4a/P4b/P4r/P5c/P5d-1a are **[owner]** (or
`fixflow-eas-release-operator` on the spare phone only); this skill reads the result before and
after, never performs it.

## 3. Checks — what proves what

| Command (read-only) | Output that matters | Proves / bears on |
|---|---|---|
| `dumpsys package com.fixflow.technician` | `versionCode=`, `versionName=`, `targetSdk=` | field build identity (H14); downgrade or equal versionCode = O-10 E2 STOP (`O-10-design.md:63`) |
| same | `firstInstallTime` unchanged, `lastUpdateTime` new | install-over, not uninstall (rule 1, `SHIP-PLAN-2026-11.md:95-98`) — INFERRED from Android semantics |
| same | `pkgFlags=[ … DEBUGGABLE … ]` | whether `run-as` works (open question; INFERRED) |
| same | `ACCESS_BACKGROUND_LOCATION … granted=false` / FINE false + COARSE true | H9 on this phone / approximate grant `O01-F07` (`O-01-design.md:20-22`) |
| `appops get` | `RUN_ANY_IN_BACKGROUND: ignore` | AOSP background restriction on (H1 precondition, `O-01-design.md:24`) |
| `dumpsys deviceidle whitelist` | FixFlow absent | not battery-exempt; Doze and standby apply (`O-01-design.md:26`) |
| `am get-standby-bucket` | value > 10 | throttled ("greater than STANDBY_BUCKET_ACTIVE (10)", WEB https://developer.android.com/topic/performance/appstandby, 2026-11-04); 40/45 = RARE/RESTRICTED per `O-01-design.md:28` (not web-verified). Same page: apps granted `ACCESS_BACKGROUND_LOCATION` are exempt from the restricted bucket |
| `cmd app_hibernation get-state` | `true` | H9 by hibernation, Android 12+ (`O-01-design.md:29`) |
| `settings get secure location_mode` | `0` | Location off now (H16 live, `O-01-design.md:30`) |
| `dumpsys netpolicy` (uid) | DATA_SAVER, RESTRICT_BACKGROUND, APP_BACKGROUND beyond the step-0 cut | H17 / `O01-F17` (`O-01-design.md:31`) |
| `dumpsys activity exit-info` | reason + timestamp per death | USER_REQUESTED (10, includes "removed the application away from Recents"; before Android 14 also an app update) / SIGNALED (2) with OEM text → H1; CRASH (4) with "Starting FGS with type location" → `O01-F15`; PERMISSION_CHANGE (8) → H9; LOW_MEMORY (3) → memory pressure (`O-01-design.md:35-39`; constants WEB https://developer.android.com/reference/android/app/ApplicationExitInfo, 2026-11-04, class added in API 30) |
| `dumpsys activity services` | `LocationTaskService … isForeground=true foregroundId=481756 types=0x00000008` | sampler has its FGS (`O-01-design.md:46`); no ServiceRecord while on duty → H1 or H10; after a travel leg ends → `O01-F20` check (`O-01-design.md:137-139`) |
| `logcat` (tags) | strings in §3.1 | the geofence/ping/travel chain |
| `uptime` + boot line | `Handling intent with action 'android.intent.action.BOOT_COMPLETED'.` after the last boot | boot restore delivered; absent → OEM blocked it (H1, `O-01-design.md:41-42`) |
| `pidof` after a swipe | pid alive + FGS alive / pid gone + new exit-info | swipe-kill ruled out / OEM kills on swipe (`O-01-design.md:51-53`) |

### 3.1 Geofence evidence chain (full table with every source line: `references/fixflow-evidence-chain.md`)

| Link | Proof in logcat | Source |
|---|---|---|
| defined | negative only: `TaskManager: Task "fixflow-attendance-geofence" has been executed but looks like it is not defined` (ReactNativeJS) | `expo-task-manager-12.0.6/package/build/TaskManager.js:164`; `technician-app/index.ts:8` |
| registered | `Registered task with name 'fixflow-attendance-geofence' …` (TaskService) — first registration in a process or boot restore only | `TaskService.java:467`; JS `geofence.ts:322` |
| refused | `There is no location provider available` / `Geofencing request has been rejected.` (GeofencingTaskConsumer) | `GeofencingTaskConsumer.kt:121`, `:155` |
| accepted by Play services | **never logged** (no listener on `addGeofences`) — only a later delivery proves it | `GeofencingTaskConsumer.kt:151` |
| broadcast | `Handling intent with task name 'fixflow-attendance-geofence' …` | `TaskService.java:304` |
| error delivery | the broadcast line with **no** job line after it; JS returns at `if (error) return;` | `GeofencingTaskConsumer.kt:66-70`; `geofence.ts:268` |
| job | `Handling job with task name 'fixflow-attendance-geofence' …` | `TaskService.java:331` |
| headless JS failed | `TaskManager: Task "fixflow-attendance-geofence" failed:` (ReactNativeJS) | `build/TaskManager.js:156` |
| finished | `Finished task 'fixflow-attendance-geofence' with eventId …`; job→finished > 15 s = `O01-F05` | `TaskService.java:201`, `:52`; `O-01-design.md:62` |
| stored | no log; the presence row is written locally | `geofence.ts:210` |
| network | **no log in the release path**; proof is the server row by `client_id` or the queue emptying; under the step-0 cut it must stay queued | `geofence.ts:211`; `presenceSync.ts:38`; `lib/attendanceApi.ts:176`; `lib/api.ts:87-110` |

The live tag filter is in the capture sheet §4; it follows O-01 step 3a (`O-01-design.md:50`)
and adds `TaskManagerUtils`, `expo.modules.taskManager.TaskManagerUtils` and `ExpoTaskManager`,
the other tags Expo 12.0.6 logs under (`TaskManagerUtils.java:36`, `:86`;
`TaskManagerInternalModule.java:193`).

## 4. Forbidden actions

| Never (on a technician phone, by an agent) | Rule it comes from |
|---|---|
| `pm clear`, `adb uninstall`, `pm uninstall`, tapping Discard, logging out | `docs/program/w2/O-01-design.md:11` "Never uninstall, clear data or tap Discard."; `O-10-design.md:6`; standing rule 1 `SHIP-PLAN-2026-11.md:95-98`; `CLAUDE.md:154` "The outbox never deletes a write." |
| `adb install` of anything on a roster phone; `-d` downgrade; uninstall-then-install on `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | standing rule 1; `O-10-design.md:63` "STOP this phone, never uninstall, re-check K." |
| `am force-stop`, `am kill`, `cmd activity stop-app`, `am crash` | `O-01-design.md:13` "Avoid `am force-stop` until the end." — the end-of-protocol stop is [owner] only |
| `settings put …`, `svc`/`cmd wifi|connectivity|location set-…`, toggling network or Location from adb | read-only protocol; the step-0 network cut "lifts only per the §2 branch box" (`SHIP-PLAN-2026-11.md:277`) |
| `dumpsys deviceidle disable|force-idle|unforce|step|whitelist +/-pkg|tempwhitelist`, `dumpsys battery unplug|reset`, `am set-inactive`, `am set-standby-bucket`, `cmd app_hibernation set-state`, `appops set`, `pm grant|revoke|reset-permissions|disable*` | they change the state the protocol measures (H1/H9/`O01-F06`/`F07`); the WEB Doze page's `force-idle`/`set-inactive` recipes are for test devices (https://developer.android.com/training/monitoring-device-state/doze-standby, 2026-11-04) |
| `am broadcast` (e.g. a fake BOOT_COMPLETED), `adb shell input …`, `adb push`, `adb reboot`, `adb root`, `adb tcpip` | read-only protocol; a tap can hit Discard or Retry (`O-10-design.md:6`) |
| `adb logcat -c`, `logcat -G`/`-P`, `logcat -b all -c` | destroys the forensic record O-01 step 2 reads before the app is touched (`O-01-design.md:34-40`) |
| mock locations | `O-01-design.md:12` "Use no mock locations" |
| `run-as … rm|sed|cp` or any write through run-as; reading the queues via run-as without the owner's go | the queues are the drain evidence (`O-10-design.md:6`); raw captures hold location and PII (the redaction rule, §2 step 9; context `CLAUDE.md:169` "Location and privacy") |
| committing a bugreport, raw logcat, or an unredacted excerpt to the repo | README content rule 3 (no secrets) and the redaction step (§2 step 9); context `CLAUDE.md:169` "Location and privacy" |
| `expo-updates`, `expo prebuild`, `expo run:android` as a "quick fix" for a device | ruling R7 `SHIP-PLAN-2026-11.md:1483` "no `expo-updates`"; README rule 2 |
| messaging a technician, deploying, any production SQL/CLI | README rule 4; plan §0 routing — the session briefs and the owner acts |

## 5. Where upstream disagrees

skydoves/android-testing-skills @ 8665ed5 is written for test devices and CI; FixFlow's phones are
production devices holding unsent data.

| Upstream sentence | FixFlow rule that wins and why |
|---|---|
| "Reset app state between tests with `pm clear`." / "**MUST** use `pm clear <pkg>` to reset app state between tests" (`adb/apps/installing-and-managing-apps/SKILL.md:77`, `:238`) | Forbidden: a clear wipes every offline queue (`O-01-design.md:11`, `CLAUDE.md:154`). |
| `adb uninstall com.example.app`; on `INSTALL_FAILED_UPDATE_INCOMPATIBLE` "Uninstall first" (`installing-and-managing-apps/SKILL.md:140`, `:154`) | STOP the phone, never uninstall, re-check K (`O-10-design.md:63`; rule 1). |
| `adb install -r -d app-debug.apk # allow downgrade` (`installing-and-managing-apps/SKILL.md:66`) | A downgrade is an O-10 E2 STOP, not a flag to add. |
| `-g` "Grant all permissions" / `pm grant` (`installing-and-managing-apps/SKILL.md:53`, `:115`) | Grants are what O-01 1b measures; changing them destroys the evidence. |
| teardown `am force-stop`, `pm clear`, `adb uninstall … \|\| true` (`adb/automation/scripting-adb-for-ci/SKILL.md:240-242`) | No teardown on a technician phone; nothing is reset. |
| `settings put global …` and `pm clear` vs `am force-stop` recipes (`adb/control/injecting-input-and-state/SKILL.md:177-179`, `:197-206`) | Settings and process state are observed, never changed (§4). |
| "**MUST** call `adb logcat -c` before reproducing a bug" (`adb/observability/extracting-logs-with-logcat/SKILL.md:329`) | Never clear: O-01 reads the pre-existing log first; scope a capture with `-T '<step-0 time>'`. |
| "**PREFERRED:** run with `-G 16M` for the `main` buffer" (`extracting-logs-with-logcat/SKILL.md:335`) | Not on a technician phone: it is a device-global change and not needed for a 55-min capture. |

## 6. Unknowns (do not guess; report as open)

- Whether the field APK is debuggable (`run-as` usable): not determinable without reading
  `eas.json` values; settle it on the device from `pkgFlags` (§3).
- Upstream has no coverage of `dumpsys location`, `deviceidle`, `netpolicy`, `activity services`,
  `exit-info`, `appops` or bugreports; those commands come from the O-01 design. Of them only the
  standby bucket, exit-info reasons and the bug-report flow were web-checked (2026-11-04); the
  `dumpsys` page (https://developer.android.com/tools/dumpsys) documents syntax, `-l`, `netstats
  detail` and `package … userId`, not location/deviceidle/netpolicy. Output formats vary by OEM
  ROM — quote what the phone printed.
- Whether Play-services geofences are visible in any `dumpsys` on these ROMs (INFERRED: not in
  `dumpsys location`).
- `technician-app/patches/` does not exist yet (P5a adds the #49424/#52230 patches, P5b-1 the
  `O01-F09`/`F12`/`F14`/`F17` ones); patched Expo line numbers will differ after each.
- Whether `console.error` from a headless task reaches `ReactNativeJS` in this release build is
  INFERRED (RN's usual behaviour), not verified on a FixFlow APK.

## 7. References

- `references/fixflow-capture-sheet.md` — the read-only command sheet (session header, version,
  background state, forensics, live capture, close-out, bug report). Authored.
- `references/fixflow-evidence-chain.md` — every log string ↔ Expo source line ↔ FixFlow line for
  geofence, pings and travel. Authored.
- `references/logcat-skydoves.md` — logcat buffers, filters, formats, `-T`/`-t`/`--pid`, rotation
  (trimmed upstream; keeps its Android 11+ `-v json` and API 24+ `pidof -s` notes).
- `references/devices-and-run-as-skydoves.md` — `adb devices -l`, `-s`, device states; path
  permissions and `run-as` limits (trimmed upstream).
- docs/ORCHESTRATION-DESIGN-2026-10.md and docs/program/* are on PR #182 (head 3415b5e) at write time; their line numbers refer to that head.
