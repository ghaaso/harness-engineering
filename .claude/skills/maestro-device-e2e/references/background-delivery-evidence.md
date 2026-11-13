<!-- Authored for FixFlow, 2026-11-04 -->

# What a Maestro pass can and cannot prove about background delivery

Maestro "interacts with the Accessibility Tree" (WEB https://docs.maestro.dev/api-reference/selectors,
fetched 2026-11-04): it sees and taps the **foreground** UI. Everything FixFlow does headless —
the geofence task, the on-duty ping sampler, the travel breadcrumb sampler, a drain after the
app is backgrounded — happens where Maestro cannot look. Pair every flow that touches location
with the adb captures below (the `android-field-debugging` skill owns the full protocol).

## A pass proves (foreground, at the moment of the assertion)

| Flow | Proves | Register id |
| --- | --- | --- |
| `drain-report-smoke.yaml` | the fleet APK opens to the Drain Report with the network off | O-10 (P2c) |
| `carry-in-completion.yaml` | an online create, the wizard and the completion submit reach the bill; the job is listed under AWAITING HANDOVER | O-03 |
| `carry-in-offline-intake.yaml` | an offline create is queued (not refused) and counted; the banner clears after reconnect while the app is in the foreground | O-03 |
| `arrival-1-depart.yaml` / `arrival-2-arrive.yaml` | the depart punch, the tap-time arrival gate with a real fix, and the wizard opening after "Arrival recorded" | O-01 |

## A pass does NOT prove

1. **That anything landed server-side.** A cleared amber banner means the jobs outbox has no
   queued item; it does not show the row. O3-F8 (a 401 on a live tap discards the write instead
   of pausing it, `docs/program/G2-deep-dive-gate-2026-11-01.md:145` on PR #182) is exactly a
   write that vanishes with no banner. Server truth is read on the manager side by the owner.
2. **Any headless delivery.** Geofence crossings need a person walking (O-01 step 4,
   `docs/program/w2/O-01-design.md:61-67`) and "no mock locations"
   (`O-01-design.md:12`); Maestro's location commands are mock locations (INFERRED; not
   checked on the docs in this run), so no FixFlow flow uses them.
3. **Foreground-service state.** Whether `LocationTaskService` is running and foregrounded is
   an adb read, never a UI read.
4. **Field reliability.** Standing rule 2: "No field-reliability claim without device evidence
   from the phone models in the fleet" (`docs/program/SHIP-PLAN-2026-11.md:99`). A green
   Maestro run on one phone is a functional smoke, not that evidence.
5. **The background half of the P5c cross-stop check.** It needs the Diagnostics "stop travel
   in 60 s" action (`SHIP-PLAN-2026-11.md:886-888`), which is not on main @ a31924a.

## The adb pairing (read-only; never `adb logcat -c`, which destroys O-01 step-2 forensics)

Before part 1, start a live capture to a file **outside the repository** (the filter is
`O-01-design.md:50`):

```
adb -s <serial> logcat -v time -s TaskService:* LocationTaskConsumer:* GeofencingTaskConsumer:* ReactNativeJS:*
```

| When | Command | Read it as |
| --- | --- | --- |
| before part 1 | `adb -s <serial> shell dumpsys activity services com.fixflow.technician` | baseline. Healthy on-duty line: `LocationTaskService ... isForeground=true foregroundId=481756 types=0x00000008` (`O-01-design.md:46`) |
| after part 1 (leg running) | same | a `LocationTaskService` ServiceRecord with `isForeground=true` = the travel sampler holds its foreground service |
| after part 2 (leg ended in the foreground) | same | tech on duty: P5c expects `isForeground=true` still (`SHIP-PLAN-2026-11.md:888-890`). On a build without the P5a fix, `O01-F20` predicts the shared service is stopped for the on-duty sampler too (`O-01-design.md:129-133`) — record what you see, do not judge |
| throughout | the logcat file | `Handling job with task name '…'` (`expo-task-manager` 12.0.6 `TaskService.java:331`), `Handling intent with task name '…'` (`:304`), `Finished task '…'` (`:201`); tag `TaskService` (`:50`) |

Task names to grep for: `fixflow-attendance-geofence`
(`technician-app/src/features/attendance/geofence.ts:35`), `fixflow-attendance-pings`
(`attendance/pingTracker.ts:36`), `fixflow-job-travel` (`jobs/travelTracker.ts:27`). The
native sources are under `C:/Users/User/.fixflow-cache/expo-src/expo-task-manager-12.0.6/package/`
(read-only; cite, never vendor).

## Record with every run

Flow name, phone model/OEM (`adb shell getprop ro.product.manufacturer` / `ro.product.model`),
versionCode (`adb shell dumpsys package com.fixflow.technician | grep -E 'versionCode|lastUpdateTime'`,
`O-01-design.md:19`), start and end clock time (test rows are real rows; O-01 logs its window
for O-10, `O-01-design.md:14`, and P5d-1b needs "the protocol's start/end time per phone",
`SHIP-PLAN-2026-11.md:909`), the JUnit result, and the artefact folder. Screenshots, hierarchy
dumps and Maestro's per-flow `device-logcat.txt` (WEB https://docs.maestro.dev/cli/test-suites-and-reports,
fetched 2026-11-04 per the survey) show customer names, phones and locations: they stay outside
the repository and are never attached to a PR.
