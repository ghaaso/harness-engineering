<!-- Authored for FixFlow, 2026-11-04 -->
# Expo native internals pinned to FixFlow's lockfile

Every line below was read on 2026-11-04 in the read-only cache of the exact tarballs
`technician-app/package-lock.json` resolves: `expo-location` 18.0.10 (lockfile line 7306-7307),
`expo-task-manager` 12.0.6 (7422-7423), `expo-modules-core` 2.2.3 (7383-7384),
`expo-notifications` 0.29.14 (7392-7393). Each `package.json:3` in the cache carries that version.
CHANGELOG headings: `expo-location-18.0.10/package/CHANGELOG.md:13` "## 18.0.10 — 2025-04-01",
`expo-task-manager-12.0.6/package/CHANGELOG.md:13` "## 12.0.6 — 2025-04-02".
Cite these paths; never vendor the sources. A newer Expo version invalidates every line here.

Roots (absolute; every citation below is one of these plus the relative path shown):

- `LOC` = `C:/Users/User/.fixflow-cache/expo-src/expo-location-18.0.10/package/android/src/main`
- `LOCJ` = `LOC/java/expo/modules/location`
- `TMJ` = `C:/Users/User/.fixflow-cache/expo-src/expo-task-manager-12.0.6/package/android/src/main/java/expo/modules/taskManager`
- `TM` = `C:/Users/User/.fixflow-cache/expo-src/expo-task-manager-12.0.6/package`
- `EMC` = `C:/Users/User/.fixflow-cache/expo-src/expo-modules-core-2.2.3/package/android/src/main/java/expo/modules/adapters/react/apploader`
- `NOTIF` = `C:/Users/User/.fixflow-cache/expo-src/expo-notifications-0.29.14/package/android/src/main`

## 1. Manifest: what the merged app gets

| Fact | Citation |
|---|---|
| One service class for every location task, typed `location` | `LOC/AndroidManifest.xml:6-9` — `android:name=".services.LocationTaskService"` … `android:foregroundServiceType="location"` |
| Receiver listens for the task action, `BOOT_COMPLETED`, `MY_PACKAGE_REPLACED` | `C:/Users/User/.fixflow-cache/expo-src/expo-task-manager-12.0.6/package/android/src/main/AndroidManifest.xml:3-11` |
| Deliveries run as jobs in `TaskJobService` | same file `:12-16` — `android:permission="android.permission.BIND_JOB_SERVICE"` |
| `RECEIVE_BOOT_COMPLETED` comes from expo-notifications, not task-manager (INFERRED: merged manifest) | `NOTIF/AndroidManifest.xml:2` — `android.permission.RECEIVE_BOOT_COMPLETED` |

## 2. How an OS event becomes JS (and what bounds it)

1. The broadcast lands in `TMJ/TaskBroadcastReceiver.java:11-16` — `new TaskService(appContext)` then
   `taskService.handleIntent(intent)`.
2. A fresh `TaskService` restores persisted tasks when the in-memory set is empty:
   `TMJ/TaskService.java:76-79` — `if (!mTasksAndEventsRepository.tasksExist()) { … restoreTasks(); }`.
   `restoreTasks()` (`:541-583`) re-registers each persisted task via `internalRegisterTask`, which ends
   in `consumer.didRegister(task)` (`:469`); a consumer whose version changed is skipped (`:560`, log at `:570`).
   Persistence lives in SharedPreferences `"TaskManagerModule"` (`:51`).
3. A non-task action (e.g. `BOOT_COMPLETED`) is fanned out to consumers that accept it
   (`:278-292`); a task intent with no consumer cancels its PendingIntent (`:306-311`).
4. Geofence: `LOCJ/taskConsumers/GeofencingTaskConsumer.kt:88` — `taskManagerUtils.scheduleJob(context, mTask, listOf(data))`;
   location: `LOCJ/taskConsumers/LocationTaskConsumer.kt:266` — same `scheduleJob`. Both reach JS through a JobScheduler job.
5. Job shape: `TMJ/TaskManagerUtils.java:212-218` — `.setMinimumLatency(0)` `.setOverrideDeadline(DEFAULT_OVERRIDE_DEADLINE)`,
   no network constraint (O01-F17); `:41` — `DEFAULT_OVERRIDE_DEADLINE = 60 * 1000; // 1 minute`.
6. The job: `TMJ/TaskJobService.java:9-14` → `TaskService.handleJob` (`TaskService.java:318-342`); async jobs get
   `finishJobAfterTimeout(jobService, params, MAX_TASK_EXECUTION_TIME_MS)` (`:338`) with
   `MAX_TASK_EXECUTION_TIME_MS = 15000; // 15 seconds` (`:52`). The timer only calls
   `jobService.jobFinished(params, false)` (`:612-620`): it releases the job, it does not stop JS
   (G2 addendum narrowing of O01-F05, `docs/program/G2-deep-dive-gate-2026-11-01.md:306-307`).
7. No live JS task manager: the event is queued and the app is loaded headless
   (`TaskService.java:404-412`) through `AppLoaderProvider.getLoader("react-native-headless", …)` (`:437-443`).
   **Load failure unregisters every task of the app** (`:414-420` — `unregisterAllTasksForAppScopeKey(appScopeKey)`);
   an `AppConfigurationError` unregisters that task (`:422-431`).
8. The loader: `EMC/RNHeadlessAppLoader.kt:21-70` — requires `ReactApplication` (`:26`); new arch
   `reactHost.start()` (`:43-45`), old arch `createReactContextInBackground()` (`:59-62`); an already-loaded
   scope key just runs (`:64-66`). Which branch runs is `BuildConfig.IS_NEW_ARCHITECTURE_ENABLED` (`:29`);
   `technician-app/app.json` has no `newArchEnabled` key (key-name grep, 2026-11-04) — architecture unverified.
   `invalidateApp` (`:72-110`) destroys the host only in `LifecycleState.BEFORE_CREATE` (`:83`, `:98`).
9. JS dispatch: `TM/src/TaskManager.ts:258` — `const taskExecutor = tasks.get(taskName);`; a throwing executor is
   only `console.error`ed (`:261-270`); **an undefined task is unregistered** (`:271-280`, `await ExpoTaskManager.unregisterTaskAsync(taskName);` at `:279`).
   FixFlow defines all three tasks at module scope from `technician-app/index.ts:8-10`.

## 3. Geofencing consumer (`GeofencingTaskConsumer.kt`, all under `LOCJ/taskConsumers/`)

| Behaviour | Line — quote |
|---|---|
| task type | `:36-38` — `return "geofencing"` |
| (re)registration removes and re-adds | `:54-58` — `stopGeofencing()` then `startGeofencing()` |
| initial triggers on every add (O01-F11) | `:168` — `.setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER or GeofencingRequest.INITIAL_TRIGGER_EXIT)` |
| ENTER/EXIT only, no DWELL, no loitering delay | `:193-195` — `notifyOnEnter`/`notifyOnExit` default `true` |
| never expires | `:199` — `.setExpirationDuration(Geofence.NEVER_EXPIRE)` |
| no provider ⇒ silent no-registration | `:120-123` — `Log.w(TAG, "There is no location provider available")` then `return` |
| add result never observed | `:148-156` — `mGeofencingClient?.addGeofences(geofencingRequest, pendingIntent)`, only `SecurityException` caught |
| error event goes to JS directly, not via a job | `:66-70` — `mTask?.execute(null, error)` |
| error strings | `:238-240` — `"Geofencing not available."`, `"Too many geofences."`, `"Too many pending intents."` |
| event payload has no timestamp | `:81-86` — bundle carries `state`, `eventType`, `region` only |

## 4. Location consumer and the shared foreground service

| Behaviour | Line — quote |
|---|---|
| FGS refused from background (H10a) | `LOCJ/taskConsumers/LocationTaskConsumer.kt:168-171` — `"Foreground location task cannot be started while the app is in the background!"` |
| register ⇒ updates + maybe FGS | `:56-60`; re-register ⇒ `setOptions` restarts both (`:70-79`) |
| unregister stops the shared service (O01-F20) | `:62-68` → `stopForegroundService()` = `mService?.stop()` (`:226-228`) |
| start path (#49424 shape) | `:191-219` — `context.startForegroundService(serviceIntent)` then `bindService`, `startForeground` in `onServiceConnected` |
| `killServiceOnDestroy` default false | `:199` |
| foreground option = key present | `:316-320` — `FOREGROUND_SERVICE_KEY = "foregroundService"` |
| shared static de-dup timestamp (O01-F12) | `:317` `sLastTimestamp`; filter `:253-256` — `if (timestamp > sLastTimestamp)` |
| deferral only while host paused | `:275-284` — `deferredUpdatesInterval` and `deferredUpdatesDistance` |
| `LocationTaskService.onStartCommand` never calls `startForeground` (#52230) | `LOCJ/services/LocationTaskService.kt:34-41` — returns `START_REDELIVER_INTENT` |
| stop = stopForeground + stopSelf | `LocationTaskService.kt:49-52` |
| swipe-away kills only with `killService` | `:54-59` |
| notification id base | `:118` — `sServiceId = 481756`; per instance `:21` — `mServiceId = sServiceId++` |
| FGS channel | `:37` id = `appId + ":" + taskName`; `:97-107` created only if absent, `IMPORTANCE_LOW`, description `"Background location notification channel"` (`:104`) |

## 5. `LocationModule.kt` API gates (`LOCJ/LocationModule.kt`)

| Call | Line — what it checks |
|---|---|
| `startLocationUpdatesAsync` | `:255-277` — background permission only when no `foregroundService` (`:264`); throws `ForegroundServiceStartNotAllowedException` when `!AppForegroundedSingleton.isForegrounded && options.foregroundService != null` (`:267-269`); FGS permissions (`:271-273`); `registerTask` (`:275`) |
| `hasStartedLocationUpdatesAsync` | `:284-286` — `taskHasConsumerOfClass`: registration exists, **not** "service is foreground" |
| `startGeofencingAsync` | `:288-295` — background permission only; no foreground check |
| `hasStartedGeofencingAsync` / `stopGeofencingAsync` | `:297-312` — **both throw `LocationBackgroundUnauthorizedException` when background is missing** (`:298-300`, `:306-308`) |
| `hasServicesEnabledAsync` | `:251-253` → `LOCJ/LocationHelpers.kt:173-177` (GPS or NETWORK provider enabled) |
| foreground flag | `:314-320` toggles `AppForegroundedSingleton.isForegrounded`; default `false` (`LocationHelpers.kt:228-229`) — a headless process is "background" |
| FGS permissions | `:720-733` — API 34+ needs `FOREGROUND_SERVICE` and `FOREGROUND_SERVICE_LOCATION` |

Consequence for `technician-app/src/features/attendance/geofence.ts:291-299`: with background
permission revoked, `hasStartedGeofencingAsync` throws, the bare `catch` swallows it, and the
registered task is never stopped by the app (INFERRED from the two lines above; device behaviour of
Play services after a revoke is not established here).

## 6. What a boot or an OEM restart does (mechanism, SETTLED per design H10)

`TaskService` construct → `restoreTasks()` → `LocationTaskConsumer.didRegister` → `startLocationUpdates()`
succeeds under background permission, `maybeStartForegroundService()` returns early because the
process is not foregrounded → the sampler runs **without** its FGS; `pingTracker.ts:185` /
`travelTracker.ts:193` `isRunning()` early returns then stop the app from repairing it (O01-F01). The
geofence consumer re-adds its fence on the same path (`GeofencingTaskConsumer.kt:40-43`).
