<!-- Authored for FixFlow, 2026-11-04 -->
# Background-task evidence chain (geofence, on-duty pings, travel)

Each row is one link in the chain, the exact log string that proves it, where the string is
emitted, and the FixFlow code it corresponds to. Native paths are relative to
`C:/Users/User/.fixflow-cache/expo-src/<pkg>-<version>/package/` (`expo-task-manager-12.0.6`,
`expo-location-18.0.10`, `expo-modules-core-2.2.3`; read-only, cite, never vendor). App paths are
`technician-app/…` on `main` @ a31924a. **The field APK is older than `main`**: a code line here
is a candidate for what the phone does, the device line is the conclusion
(`docs/ORCHESTRATION-DESIGN-2026-10.md:540`).

`<scope>` below is the app scoping identifier Expo prints; it is the same on every line of one
install, so grep on the task name, not on it.

## 1. Geofence (`GEOFENCE_TASK = "fixflow-attendance-geofence"`, `technician-app/src/features/attendance/geofence.ts:35`)

| # | Link | String that proves it (tag) | Emitted at | FixFlow side |
|---|---|---|---|---|
| G0 | Task body defined at bundle load | negative only: `TaskManager: Task "fixflow-attendance-geofence" has been executed but looks like it is not defined` (`ReactNativeJS`) means the import is missing in that bundle | `expo-task-manager-12.0.6/package/build/TaskManager.js:164` | `technician-app/index.ts:8` import; `geofence.ts:267` `TaskManager.defineTask(GEOFENCE_TASK, …)` |
| G1 | JS asks for registration | none from JS: `ensureGeofenceMonitoring` swallows every error (`geofence.ts:333` "best-effort — a registration failure must never crash the app") and silently stops when a permission is missing (`:313`) or the fence is null/inactive (`:318`) | — | called on mount and on every `active` (`technician-app/src/features/attendance/useAttendanceBackground.ts:53`, `:66`) |
| G2 | Native task registered | `Registered task with name 'fixflow-attendance-geofence' for app with scoping identifier '<scope>'.` (`TaskService`) | `expo-task-manager-12.0.6/…/TaskService.java:467` | logged only when the task is new to this process or restored at boot (`restoreTasks`, `:541-575`); a re-register of an existing task only updates options (`:99-102`) and logs nothing |
| G2- | Registration refused | `There is no location provider available` (`GeofencingTaskConsumer`) → no fence (H16 at registration, `O01-F03`); `Geofencing request has been rejected.` → SecurityException (permission, `O01-F06`/`F07`) | `expo-location-18.0.10/…/GeofencingTaskConsumer.kt:121`, `:155` | — |
| G2? | Play services accepted the fence | **not logged**: `addGeofences(...)` has no success or failure listener | `GeofencingTaskConsumer.kt:151` | absence of G2- is not proof of a live fence; the proof is a later G3 for a real crossing |
| G3 | OS delivered a transition (broadcast) | `Handling intent with task name 'fixflow-attendance-geofence' and app scoping identifier '<scope>'.` (`TaskService`) | `TaskService.java:304`, via `TaskBroadcastReceiver.java:11-16` | — |
| G3e | Delivery was an error (e.g. GEOFENCE_NOT_AVAILABLE after a Location toggle) | G3 **with no G4 after it**: the consumer executes the task directly with an error, no job | `GeofencingTaskConsumer.kt:66-70`, messages `:236-243` | JS returns at `geofence.ts:268` `if (error) return;` (`O01-F03`; O-01 step 4b, `docs/program/w2/O-01-design.md:63`) |
| G3x | Consumer gone | `Task or consumer not found.` (`TaskService`, W) | `TaskService.java:307` | the pending intent is cancelled (`:310`): the fence is effectively dead until re-registered |
| G4 | Job started for the transition | `Handling job with task name 'fixflow-attendance-geofence' for app with scoping identifier '<scope>'.` | `TaskService.java:331`; scheduled at `GeofencingTaskConsumer.kt:88` | — |
| G4c | Job cut by the system | `Job for task 'fixflow-attendance-geofence' has been cancelled by the system.` | `TaskService.java:362` | — |
| G5 | Headless JS ran | no line of its own; `executeTask` queues the event and loads the headless app when no task manager exists | `TaskService.java:372-420`; loader `expo-modules-core-2.2.3/…/RNHeadlessAppLoader.kt:21` | `handleGeofenceEvent` `geofence.ts:232`; debounce `isDuplicate` `:239` (`DEBOUNCE_MS` `:46`, stamp written at `:174`, `O01-F10`); `confirmCrossing` `:241` with the 20 s `DWELL_RECHECK_MS` (`:58`, slept at `:131`; deleted in P5a, `docs/program/w2/O-01-design.md:126-127`) |
| G5e | Headless JS threw | `TaskManager: Task "fixflow-attendance-geofence" failed:` (`ReactNativeJS`, console.error) | `build/TaskManager.js:156` | — |
| G6 | JS body finished | `Finished task 'fixflow-attendance-geofence' with eventId '<id>'.` (`TaskService`) | `TaskService.java:201` (called from `build/TaskManager.js:160` in a `finally`, so it also follows G5e) | G4→G6 gap over 15 s = the job outlived Expo's cap `MAX_TASK_EXECUTION_TIME_MS = 15000` (`TaskService.java:52`) — the `O01-F05` signature (`O-01-design.md:62`) |
| G6t | Instance torn down | no line; the app record is invalidated 2 s after the last event finishes | `TaskService.java:209-218` | the fire-and-forget `void syncPresence(techId)` (`geofence.ts:211`) can be cut here (`O01-F08`) |
| G7 | Crossing stored locally | no line; the presence row is written to AsyncStorage `attendance.presence.queue.v1` | `geofence.ts:210` `await enqueuePresence(item); // local write = never lost`; key `presenceQueue.ts:43` | proof on the phone = the ClockScreen list / A3 photo (`docs/program/w2/O-10-design.md:12`) |
| G8 | Network call | **no log line in the release path**: `request()` logs nothing (`technician-app/src/lib/api.ts:87-110`); the only `console.warn` calls under `src/` are `features/jobs/closeJobWithVideo.ts:86,122` | — | `presenceSync.ts:38` → `attendanceApi.ts:176` `POST /api/attendance/presence`, 15 s abort `api.ts:85`. Proof = the server row by `client_id`, or the queue emptying on the phone. Under the O-01 step-0 cut the expected outcome is a kept network error (`O-01-design.md:16`) |

Boot and update restore: `Handling intent with action 'android.intent.action.BOOT_COMPLETED'.`
or `…'android.intent.action.MY_PACKAGE_REPLACED'.` (`TaskService.java:281`; both actions are in
`expo-task-manager-12.0.6/package/android/src/main/AndroidManifest.xml:8-9`). No BOOT line after
the last boot (`adb shell uptime`) = the OEM blocked the boot broadcast (H1, `O-01-design.md:41-42`).
A failed headless load unregisters **every** task of the app: `Unregistering all tasks for app
with scoping identifier '<scope>'.` (`TaskService.java:137`, reached from `:412-420`).

## 2. On-duty pings and travel (shared `LocationTaskService`)

| Fact | Where |
|---|---|
| `PING_TASK = "fixflow-attendance-pings"`; FGS title "FixFlow — on duty" | `technician-app/src/features/attendance/pingTracker.ts:36`, `:194` |
| Start returns early when Expo says it is running, so a sampler without its FGS is never repaired (`O01-F01`) | `pingTracker.ts:185` `if (await isRunning()) return;`; re-arm `:261` |
| `TRAVEL_TASK = "fixflow-job-travel"`; titles "FixFlow — travelling to job" / "FixFlow — returning to workshop"; 4 h cap | `technician-app/src/features/jobs/travelTracker.ts:27`, `:201-202`, `MAX_TRAVEL_MS` `:39` |
| FGS refused from the background: `Foreground location task cannot be started while the app is in the background!` (`LocationTaskConsumer`) = H10(b) | `expo-location-18.0.10/…/LocationTaskConsumer.kt:169` |
| FGS start sequence (the `#49424` race, `O01-F15`) | `LocationTaskConsumer.kt:201` `startForegroundService`, `:209` `startForeground` in `onServiceConnected` |
| One service instance for both tasks; `stop()` = `stopForeground(true)` + `stopSelf()` (`O01-F20`) | `expo-location-18.0.10/…/services/LocationTaskService.kt:49-52`; travel stop `travelTracker.ts:219` |
| Notification id: first instance in a process is `481756`, each new instance `+1` | `LocationTaskService.kt:118` `sServiceId = 481756`, `:21` `sServiceId++` — a higher `foregroundId` in `dumpsys activity services` within one pid means the service was recreated (INFERRED from the code) |
| Manifest type `location` → `types=0x00000008` in `dumpsys activity services` | `expo-location-18.0.10/package/android/src/main/AndroidManifest.xml:9`; healthy line quoted at `O-01-design.md:46` |
| Ping deliveries in logcat: `Handling intent with task name 'fixflow-attendance-pings' …` / `Handling job with task name 'fixflow-attendance-pings' …` | `TaskService.java:304`, `:331`; reading at `O-01-design.md:55` |
| Ping task keeps the last fix only (`O01-F13`) | `pingTracker.ts:286` `const fix = locations[locations.length - 1];` |
| Shared static timestamp drops pings during a travel leg (`O01-F12`): fewer `Handling job … fixflow-attendance-pings` lines than one per interval while travelling | `LocationTaskConsumer.kt:253-256` `if (timestamp > sLastTimestamp)`, `:317` `private var sLastTimestamp: Long = 0` |

## 3. Reading order for one capture

1. G2/G2- around app open → registration state. 2. G3/G3e/G4 per crossing, with clock times.
3. G4→G6 gap per job. 4. Ping deliveries per 5-min interval (`DEFAULT_PING_INTERVAL_MIN = 5`,
`pingTracker.ts:43`) against `dumpsys activity services` FGS state. 5. Boot / package-replaced
lines against `uptime` and `lastUpdateTime`. Record lines and times; the analyst
(`fixflow-android-background-analyst`) ranks H1/H10/H16/H3/H2.
