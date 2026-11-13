<!-- Trimmed from https://github.com/zakariaf/ReactNative-Skills @ 41a0e66d4d09de5b46e6537f59a97c7192473486 skills/background-tasks/references/platform-behaviour.md (MIT, Copyright (c) 2026 Zakaria Fatahi; licence ../LICENSE-zakariaf-reactnative-skills): kept the provenance paragraph with its verification note, the Android bullet and closing paragraph of section 3, the Android bullets of section 4, and section 5 whole; iOS-only bullets and sections 1, 2, 6-8 are cut -->
# What Android actually does with background work (upstream, SDK 57)

> **FixFlow reading note (not upstream):** this was written for `expo-background-task` /
> `expo-task-manager` **57.0.21** (Expo SDK 57). FixFlow is on Expo `~52.0.0` with
> `expo-task-manager` 12.0.6 and does **not** install `expo-background-task`
> (`technician-app/package.json:19,33`). The headless-loader, drop-undefined and
> rejected-executor mechanisms below are confirmed in 12.0.6 by
> `expo-native-internals.md` §2; the 25 s budget is **not** FixFlow's number (15 s,
> `TaskService.java:52`), and WorkManager rows do not describe location/geofence tasks.

Every fact here says how it was established: **source** (read in the installed SDK 57 package, file
named), **docs** (the Expo SDK 57 page or the platform's documentation, not run here), **introspected**
(`npx expo config --type introspect` in the reference app), or **design default** (this library's
choice, with the reason). Nothing here was measured on a device by this library; the device proof in
[testing-and-device-proof.md](testing-and-device-proof.md) is how an app measures it. Verified on
2026-10-14 against `expo-background-task` 57.0.21 and `expo-task-manager` 57.0.21.

## 3. How long a run may last, and how it ends

- **Android.** A WorkManager worker may run up to 10 minutes before the system stops it (Android docs).
  The process can still be frozen or killed sooner under memory pressure or by vendor battery
  managers (dontkillmyapp.com, quoted by the Expo docs).
- **Design default: 25 s per job** (`MAX_JOB_BUDGET_MS`). It fits inside the shortest window any of
  the platform documents promise for background execution (around 30 s), leaves time to commit and
  write the run log, and is what makes a job's behaviour the same on both platforms. A job that needs
  more does a bounded batch per run and returns `partial`; the next run continues.

A run ends in one of four ways: the job returns; the budget passes (the runner aborts the signal and
records `timed-out`); the system expiry arrives (`cancelled`, when it reaches JS); or the process dies
with no JavaScript running at all. The last one is why every step commits on its own (rule 6).

## 4. What runs in the process (headless or not)

- **Android, process not running:** the task service loads the bundle with Expo's
  `react-native-headless` app loader (source: `TaskService.java`, `AppLoaderProvider.getLoader(
  "react-native-headless", ...)`). No activity starts and no root component renders: the entry file's
  imports run, routes do not. That is why tasks are defined in a module the entry imports (rule 2).
- **Android, process alive in the background:** the run happens in the existing JS runtime, next to a
  mounted but stopped UI (source: task managers of non-headless contexts take precedence).
- **expo-task-manager drops undefined tasks.** When a task fires and no `defineTask` registered its
  name in this JS runtime, the event handler logs a warning, reports the task finished, and calls
  `unregisterTaskAsync(taskName)` (source: `TaskManager.ts`). One release that defines the task inside
  a component turns into a task that silently stops running for every user who updated.
- **A rejected executor is only `console.error`ed** (source), then reported finished with result
  `null`. Rule 4 routes every executor through `toTaskExecutor`, which never rejects.

## 5. When runs stop for good

| Event | iOS | Android |
|---|---|---|
| User force-quits the app (swipe away) | no more background runs until the user opens the app again (docs) | removing from Recents usually does **not** stop work; some vendors treat it as a kill (docs) |
| Force stop (Settings > Apps > the app > Force stop) | (no counterpart: the force-quit row above) | the app's WorkManager jobs and alarms are cancelled and nothing runs until the user opens the app again, the Android counterpart of an iOS force-quit; at that launch the startup reconcile registers the jobs again (Android docs, not run here) |
| Device reboot | registrations restored at the next launch (docs) | WorkManager re-schedules after boot (docs) |
| App update | registrations persist (they are stored by the task manager and restored at launch) | WorkManager work persists across updates |
| Task renamed or removed in a new release | the old name stays scheduled; when it fires it is undefined and dropped (source) | same |
| Low Power Mode / Background App Refresh off | runs stop (Apple docs) | battery saver, restricted bucket: runs deferred or stopped (Android docs) |

`reconcileBackgroundTasks` (rule 10) removes names the build no longer defines and re-registers a
changed interval, so a rename never relies on the drop-when-undefined path.
