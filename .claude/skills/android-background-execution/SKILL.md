---
name: android-background-execution
description: FixFlow's reference for how the technician app's three background location tasks (workshop geofence, on-duty pings, job-travel breadcrumbs) behave on Android 12-15 under Expo SDK 52. Covers expo-location 18.0.10, expo-task-manager 12.0.6 and expo-modules-core 2.2.3 headless internals cited by cache file:line, foreground-service start rules, geofencing semantics and limits, hibernation and permission auto-reset, Data Saver, notification channels, and the autostart and battery settings of the fleet OEMs (Xiaomi/MIUI, Oppo/ColorOS, Realme, Vivo/Funtouch, Tecno), with the intent components AutoStarter names. Use it for S-01a/S-01b mapping, R-01 research, the O-01 geofence analysis and register ids O01-F01..F20, and plan phases P5-spike, P5a, P5b-1, P5b-2, P5c, P5d-1b and P5d-2. Do not use it for periodic jobs (expo-background-task is not installed), the outbox contract (offline-sync-review), adb capture steps (android-field-debugging) or builds and installs (eas-expo-release).
---

# Android background execution (FixFlow technician app)

Read this top to bottom: the FixFlow facts come first, then the procedure, the checks, the forbidden actions and where the upstreams disagree.
Every FixFlow line below was re-read on 2026-11-04 on branch `claude/wizardly-hertz-02c46a`
(main @ a31924a). Paths starting `technician-app/` are repo paths. PR #182 docs are cited by repo
path (see References). Expo native lines live in `references/expo-native-internals.md`.

## 1. FixFlow facts

### 1.1 Versions and what is not installed

- `technician-app/package.json:19` — `"expo": "~52.0.0"`; `:36` — `"react-native": "0.76.9"`;
  `:30` `expo-location ~18.0.10`; `:33` `expo-task-manager ~12.0.6`; `:31` `expo-notifications ~0.29.14`;
  `:23` `expo-battery ~9.0.2`; `:29` `expo-intent-launcher ~12.0.2`. The lockfile resolves exactly
  `expo-location` 18.0.10 (`technician-app/package-lock.json:7306-7307`), `expo-task-manager` 12.0.6
  (`:7422-7423`), `expo-modules-core` 2.2.3 (`:7383-7384`).
- **Not installed** (grep of `package.json`, 2026-11-04): `expo-background-task`, `expo-background-fetch`,
  `patch-package` / `postinstall`. `technician-app/patches/` does not exist on this branch (the P5a
  patches are designed in PR #182 only: `docs/program/SHIP-PLAN-2026-11.md:804-806`).
- Entry: `technician-app/package.json:6` — `"main": "index.ts"`; `technician-app/index.ts:8-10` side-imports
  `geofence`, `pingTracker`, `travelTracker` before `registerRootComponent(App)` (`:12`), so all three
  `defineTask` calls exist in a headless start.
- `technician-app/app.json` (key names only; values are secrets-adjacent and never copied): `android.permissions`
  at `:23` lists the public constants `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`,
  `ACCESS_WIFI_STATE`, `POST_NOTIFICATIONS`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`,
  `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` (`:28-35`); no `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK`,
  `SCHEDULE_EXACT_ALARM`. Plugin `expo-location` at `:48` with keys `isAndroidBackgroundLocationEnabled` (`:52`),
  `isAndroidForegroundServiceEnabled` (`:53`); `expo-task-manager` at `:56`. No `newArchEnabled` key.
- `technician-app/eas.json` profiles: `development` (`:7`), `preview` (`:14`), `production` (`:25`); no
  `fleet` profile yet (the plan's `eas build --profile fleet` is P2b-1).
- CI: `.github/workflows/ci.yml:76-77` — "Bundle check (expo export)"; CI compiles no native code
  (CLAUDE.md, "Build & deploy traps"). Since L2 (#188, 2026-11-13) a local gate exists:
  `ops/lab/android-compile.sh` builds a debug-signed release APK in a container (compile evidence
  only, never installed on a phone). A native patch or `app.json` plugin change is unproven until
  that gate or an EAS compile has built it; EAS remains the only build a phone receives.

### 1.2 The three tasks

| | Geofence | On-duty pings | Job travel |
|---|---|---|---|
| Task name | `geofence.ts:35` `"fixflow-attendance-geofence"` | `pingTracker.ts:36` `"fixflow-attendance-pings"` | `travelTracker.ts:27` `"fixflow-job-travel"` |
| `defineTask` (module scope) | `geofence.ts:267-271` | `pingTracker.ts:309-313` | `travelTracker.ts:292-296` |
| `error` branch | `:268` `if (error) return;` (silent; a `GEOFENCE_NOT_AVAILABLE` lands here) | `:310` same | `:293` same |
| Start call | `geofence.ts:322-331` `startGeofencingAsync`, one region `FENCE_ID` `"workshop"` (`:36`), `radius: fence.radius_m`, enter+exit | `pingTracker.ts:187-197` `Accuracy.Balanced`, `timeInterval` = `deferredUpdatesInterval` = interval, `foregroundService` set, no `killServiceOnDestroy` | `travelTracker.ts:194-205` `Accuracy.High`, `SAMPLE_INTERVAL_MS` 20 000 (`:42`), `SAMPLE_DISTANCE_M` 50 (`:43`), `foregroundService` set |
| `isRunning()` early return | — | `pingTracker.ts:185` | `travelTracker.ts:193` |
| Stop | `geofence.ts:291-299` (`hasStartedGeofencingAsync` → `stopGeofencingAsync`, bare `catch`) | `pingTracker.ts:205-212` | `travelTracker.ts:214-225` (`stopLocationUpdatesAsync(TRAVEL_TASK)` `:219`) |
| Reconcile | `ensureGeofenceMonitoring` `geofence.ts:307-335` | `ensurePingTracking` `pingTracker.ts:247-263` | `ensureTravelTracking` `travelTracker.ts:230-239` |
| Handler | `handleGeofenceEvent` `:232-263` | `handlePingUpdate` `:271-305` (keeps only `locations[locations.length - 1]`, `:286`, O01-F13) | `handleTravelUpdate` `:243-288` (every fix) |
| Headless sync | `void syncPresence(techId)` `:211` | `void syncPings(techId)` `:304` | `void syncTravelSamples(techId)` `:287` |

All `technician-app/src/features/attendance/` except `travelTracker.ts` (`technician-app/src/features/jobs/`).
Both samplers use the **one** `LocationTaskService`: stopping travel stops the ping task's
foreground service too (O01-F20, `docs/program/w2/O-01-design.md:129-139`).

### 1.3 Constants

| Constant | Value | path:line |
|---|---|---|
| `DEBOUNCE_MS` | `3 * 60 * 1000` | `technician-app/src/features/attendance/geofence.ts:46` |
| `CONFIRM_ACCURACY_MAX_M` | `100` | `geofence.ts:51` |
| `EXIT_HYSTERESIS_FACTOR` / `_MIN_M` | `1.5` / `40` | `geofence.ts:54-55` |
| `DWELL_RECHECK_MS` | `20 * 1000` (comment `:57` assumes "~30s headless budget"; native cap is 15 s) | `geofence.ts:58` |
| `DEFAULT_PING_INTERVAL_MIN` | `5` (server `ping_interval_minutes` overrides, floor 1 min, `:148-157`) | `pingTracker.ts:43` |
| `MAX_DUTY_MS` | `config.attendance.maxDutyHours * 60 * 60 * 1000` | `pingTracker.ts:45` |
| `maxDutyHours` | `14` | `technician-app/src/lib/config.ts:51` |
| `MAX_TRAVEL_MS` | `4 * 60 * 60 * 1000` | `technician-app/src/features/jobs/travelTracker.ts:39` |
| `MAX_TRAIL_POINTS` | `1000` | `travelTracker.ts:35` |
| `REQUEST_TIMEOUT_MS` | `15_000` (every headless network call) | `technician-app/src/lib/api.ts:85` |
| GPS read | `getCurrentPositionAsync({ accuracy: High })`, **no timeout** | `technician-app/src/features/attendance/location.ts:31-33` |
| Storage keys | `"fixflow_tech"` `:40`, `"attendance.geofence.cache.v1"` `:41`, `"attendance.presence.lastCrossing.v1"` `:42` | `geofence.ts` |
| | `"attendance.duty.v1"` | `pingTracker.ts:42` |
| | `"jobs.travel.active.v1"` `:30`, `"jobs.travel.trail.v1"` `:31` | `travelTracker.ts` |
| Native cap | `MAX_TASK_EXECUTION_TIME_MS = 15000` | `references/expo-native-internals.md` §2 item 6 |
| FGS notification id | `481756` | same, §4 |

### 1.4 Time bounds (privacy invariant — CLAUDE.md:171-175)

On-duty sampling stops at 14 h (`dutyStatus`, `pingTracker.ts:112-140`; auto-stop `:224-239`, which never
punches a clock-out); travel stops at 4 h (`expired(state)` checks in `travelTracker.ts:234`, `:256`). Both
handlers check the bound **per batch**, so an FGS-less sampler still obeys it — the breach is
visibility, not duration (`docs/program/w2/O-01-design.md:116`). Any re-arm you design goes through
`dutyStatus` / the travel state; an expired duty calls `autoStopExpiredDuty`, never a re-arm
(`docs/program/SHIP-PLAN-2026-11.md:807-809`).

### 1.5 Permission, battery and channel sites

- Only background-location request: `technician-app/src/features/onboarding/permissions.ts:61` (inside
  `requestAttendancePermissions`, `:41`; foreground first `:50-53`; battery exemption last `:69`). Nothing
  re-asks after onboarding (H9, O01-F06).
- `technician-app/src/features/attendance/location.ts:26` calls `requestForegroundPermissionsAsync()` inside
  `getLocation`, which the headless geofence handler uses (`geofence.ts:126`) — O01-F19 residual.
- Battery: `technician-app/src/features/onboarding/battery.ts:4` — "The field fleet is Xiaomi/Oppo/Vivo-class
  Android"; `:25` hard-coded package `com.fixflow.technician`; `:50-53` `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`
  with `package:` URI, fallback `IGNORE_BATTERY_OPTIMIZATION_SETTINGS` `:58-60`. Re-offer banner only while
  clocked in: `technician-app/src/features/attendance/useBatteryExemptionWarning.ts:42`, mounted at
  `ClockScreen.tsx:37`.
- **Absent from `technician-app/src`** (grep, 2026-11-04): `hasServicesEnabledAsync`, `getProviderStatusAsync`,
  any autostart / `miui` / `coloros` / `iqoo` intent, any hibernation or Data Saver check.
- Channels: `attendanceNotifications.ts:15` `"attendance"`, created `:27-31` `AndroidImportance.HIGH`, trigger
  `{ channelId, seconds: 1 }` `:43`; `technician-app/src/features/jobs/travelPrompt.ts:18` `"travel"` `DEFAULT`
  (`:34-36`), re-created in `returnPrompt.ts:30-32` (the duplicate helper P5b-1 cleans up). The FGS channel
  is Expo's, `IMPORTANCE_LOW`, id `appId:taskName`, created only if absent (`references/expo-native-internals.md` §4).

### 1.6 Re-registration sites

`technician-app/src/features/attendance/useAttendanceBackground.ts:52-60` (mount) and `:64-70` (`AppState`
`active`) call all three `ensure*`; mounted once from the authenticated shell (`:8`). Nothing else re-registers:
no boot handler of FixFlow's own, no periodic re-check, no error-branch re-register (O01-F03). The doc comment
at `geofence.ts:302-306` says re-registration on foreground is "how we recover after a reboot".

### 1.7 Register ids, hypotheses and phases

- W1: S-01a `map-mobile-background-js` (`docs/ORCHESTRATION-DESIGN-2026-10.md:181`), S-01b `map-expo-native`
  (`:182`), R-01 `research-android-oem-background` (`:191`). W2: O-01 `geofence-end-to-end` opus/xhigh (`:299`).
  Hypotheses H1, H2, H3, H9, H10, H11, H16, H17 (`:61-77`; O-01 ranks them, `:80-82`). Skill row `:724`.
- Findings `O01-F01`..`O01-F19`: `docs/program/G2-deep-dive-gate-2026-11-01.md:112-127`; `O01-F20`:
  `:305` and `docs/program/w2/O-01-design.md:129-139`. Fix order: `O-01-design.md:93-102`; dwell deleted
  (amendment 1): `:122-128`.
- Phases (`docs/program/SHIP-PLAN-2026-11.md`): P5-spike `:764` (commercial SDK spike, spare phone),
  P5a `:784` (fixes 1-4, 7; patches; diagnostics ring `diag.bg.v1`; compile gate `:828-829`),
  P5b-1 `:834` (permission/hibernation banners, OEM onboarding `:840-841`, patches F09/F12/F14/F17),
  P5b-2 `:853` (shift-start reminder `:857-859`), P5c `:875` (pilot: 3d, 4b-4d, indoor test, cross-stop `:880-891`),
  P5d-1b `:905` (per-OEM protocol runs), P5d-2 `:913` (48 h metrics `:915-922`). P5d-1a `:894` is the
  fleet install (owner). Ruling R1 (verdict rule) `:1457-1461`; R7 (no `expo-updates`) `:1483`.

## 2. Procedure (analyst or mapper brief)

1. Name the lens from the brief: MAP (S-01a JS side / S-01b native side), RESEARCH (R-01), or FINDINGS
   (O-01). MAP and RESEARCH run at sonnet/medium, R-01 with web tools (design §4.2, `ORCHESTRATION-DESIGN-2026-10.md:181-182`, `:191`);
   FINDINGS is `fixflow-android-background-analyst` (opus/xhigh, `:299`). Note which H-ids and O01-F ids
   the brief names; those are the claims you must try to break.
2. Pin versions first: `grep -n '"version"'` on the cache `package.json` files and the lockfile lines in §1.1.
   If the lockfile no longer resolves 18.0.10 / 12.0.6 / 2.2.3, stop: every native line in
   `references/expo-native-internals.md` is void; return that as a blocker.
3. Read the FixFlow file at the cited line before using any fact above; this file can drift. Follow one
   import hop at most and list extra files in `open_questions` (design §5.3).
4. Trace each behaviour end to end: OS event → `TaskBroadcastReceiver` → job (15 s timer) → headless
   loader → `defineTask` executor → FixFlow handler → queue/sync. Cite each hop from the native
   reference and the table in §1.2.
5. Platform rules come from `references/android-12-15-rules.md` (cite the rule id, URL and 2026-11-04).
   Anything that reference lists as not fetched is `WEB_UNAVAILABLE: <topic>` unless your brief lets you fetch.
6. OEM behaviour comes from `references/dontkillmyapp/*.md` (attribute "www.dontkillmyapp.com / Urbandroid
   Team") and component names from `references/autostarter-intents.md`. Mark every OEM item
   device-unverified; Realme and Tecno have no AutoStarter entry; HyperOS has no upstream content.
7. Label each finding `in_field_apk` `unknown` unless the APK commit (H14) is in your brief: code on
   `main` yields candidates, device evidence yields conclusions (design §5.3).
8. A fix sketch must keep: the 14 h / 4 h bounds through `dutyStatus` / travel state; the outbox contract
   (presence and punches never dropped; pings and travel droppable on definitive 4xx, CLAUDE.md:154-160);
   no `expo-updates` (R7); native changes as patch-package patches proven by `eas build --profile fleet`
   compiling (P5a/P5b-1 Done-when) — never by `expo export`.
9. Write device steps as a protocol for the owner-attended session, citing `docs/program/w2/O-01-design.md`
   steps; you do not run them.
10. **[owner]** Installing any build on a roster phone (P5c pilot install-over, P5d-1a fleet), including
    the P5-spike debug build on the spare phone. The procedure stops here.
11. **[owner]** Asking a technician to change OEM autostart, battery or lock-in-recents settings, or
    sending the hold/release notices (plan §0 rule 6). The in-app onboarding step is code; talking to a
    tech is not.
12. **[owner]** Changing the live fence row (radius or coordinates; O-01 FIX ORDER 2 "owner raises the
    fence to >= 100 m", `O-01-design.md:95`) — production data.
13. **[owner]** Deploying the backend half a phase depends on (P6a/P6b-2 by the P4c train or runbook R5).
14. **[owner]** Buying or signing up for a commercial location SDK licence (P5-spike owner input).

## 3. Checks (read-only; what each proves)

Repo (any brief):

- `grep -n "isRunning()) return" technician-app/src/features/attendance/pingTracker.ts technician-app/src/features/jobs/travelTracker.ts`
  — two hits prove the H10(c) early returns are still there.
- `grep -rn "hasServicesEnabledAsync\|getProviderStatusAsync" technician-app/src` — no hit proves H16's
  "providers never checked".
- `grep -n "DWELL_RECHECK_MS\|getLastKnownPositionAsync" technician-app/src/features/attendance/geofence.ts`
  — a `DWELL_RECHECK_MS` hit and no `getLastKnownPositionAsync` hit mean P5a fix 1 has not landed.
- `ls technician-app/patches` — absent means no native patch has landed (P5a/P5b-1).
- `grep -n '"version"' C:/Users/User/.fixflow-cache/expo-src/*/package/package.json` — pins the native reference.
- `grep -o '"[A-Za-z_]*":' technician-app/app.json` — key names only; never print values.

Device (only when the brief says "runs commands" and a phone or emulator is attached; a roster phone
is attached only in an owner-attended session; capture belongs to `fixflow-device-debugger`). Expected
readings from `docs/program/w2/O-01-design.md`:

| Command | Proves |
|---|---|
| `adb shell dumpsys package com.fixflow.technician` (grep the location perms, `targetSdk`, `versionCode`) | `:19-22` — H9 (background missing), O01-F07 (FINE false, COARSE true), H14 |
| `adb shell appops get com.fixflow.technician` | `:23-25` — `RUN_ANY_IN_BACKGROUND: ignore` is the AOSP background restriction |
| `adb shell dumpsys deviceidle whitelist` | `:26` — absent = not battery-exempt |
| `adb shell am get-standby-bucket com.fixflow.technician` | `:27-28` — 40/45 defers every Expo job |
| `adb shell cmd app_hibernation get-state com.fixflow.technician` | `:29` — true = H9 by hibernation |
| `adb shell settings get secure location_mode` | `:30` — 0 = H16 live |
| `adb shell dumpsys netpolicy` | `:31` — DATA_SAVER / RESTRICT_BACKGROUND = H17 |
| `adb shell dumpsys activity services com.fixflow.technician` | `:45-47` — healthy line `LocationTaskService ... isForeground=true foregroundId=481756 types=0x00000008` |
| `adb shell dumpsys activity exit-info com.fixflow.technician` | `:35-39` — death reasons per H1 / #49424 / H9 |
| `adb logcat` for `TaskService`, `LocationTaskConsumer`, `GeofencingTaskConsumer`, `ReactNativeJS` | `:40-44` — boot restore delivered; "Foreground location task cannot be started while the app is in the background!" = H10(b); "There is no location provider available" = H16 |

OEM autostart, app battery saver and lock-in-recents state cannot be read reliably by adb
(`O-01-design.md:32`); they are recorded on the device by the owner-attended session.

## 4. Forbidden actions

- `pm uninstall`, `pm clear`, the in-app Discard, `adb install` without `-r` on a roster phone — plan §0
  rule 1 (`SHIP-PLAN-2026-11.md:95-98`, never an uninstall) and `O-01-design.md:11`.
- `am force-stop`, `am kill`, `dumpsys deviceidle force-idle|disable`, `am set-standby-bucket`,
  `am compat enable`, `cmd netpolicy set`, any `settings put` on a roster phone — a package rule (no
  agent changes system state on a roster phone), grounded on the field protocol's ground rules
  (`O-01-design.md:11-13`, "Avoid `am force-stop` until the end" of the owner-attended session) and
  plan §0 rule 2. Fine on a named emulator or the spare phone only when the brief says so.
- Mock locations on a roster phone — `O-01-design.md:12`.
- `expo prebuild`, `expo run:android`, `npx`/`npm`/`eas`/`git` from this skill — design §4.2 S-07a
  (`ORCHESTRATION-DESIGN-2026-10.md:187`), design §5.3(e).
- Adding `expo-updates` or any OTA path — ruling R7 (`SHIP-PLAN-2026-11.md:1483`).
- Adding the Sentry Expo config plugin or an empty `EXPO_PUBLIC_SENTRY_DSN` while touching `app.json` /
  `eas.json` — CLAUDE.md:81-85.
- A sampling path that bypasses `dutyStatus` / travel state, or a fix that auto-punches a clock-out —
  CLAUDE.md:171-175, `pingTracker.ts:214-217`.
- A sync design that drops presence rows or punches — CLAUDE.md:154-157; plan §0 rule 7 (`:114-115`).
- Quoting any value from `app.json`, `eas.json`, `google-services.json` or a `.env` — README rule 3.
- A field-reliability claim (an OEM setting "works", an intent "opens the screen") without device
  evidence from a fleet model — plan §0 rule 2 (`SHIP-PLAN-2026-11.md:99`).

## 5. Where upstream disagrees

| Upstream sentence | FixFlow rule that wins, and why |
|---|---|
| zakariaf `skills/background-tasks/SKILL.md:40` "Every job has a literal budget of at most 25 s" | The headless job FixFlow lives in is force-finished at 15 s (`TaskService.java:52,338`; design H2 `ORCHESTRATION-DESIGN-2026-10.md:62`). 25 s is that library's design default for `expo-background-task`, a mechanism FixFlow does not use. |
| zakariaf `SKILL.md:20-22` "Use expo-background-task, and list its config plugin" | Not installed and not in SDK 52 at that version (written against 57.0.21, `SKILL.md:16-18`). Plugin edits are build-sensitive (CLAUDE.md:84-87); nothing is added without an EAS compile. |
| zakariaf `references/api-and-config.md:77` "Then regenerate the native snapshot" and `SKILL.md:85-87` (`npx expo install`, prebuild snapshot) | Never `expo prebuild` / `expo run:android`; agents run no `npx`/`npm` (README rule 2; design §5.3(e)). |
| zakariaf `references/testing-and-device-proof.md:119` "`am kill $PKG` after pressing Home" and `:122-125` force-idle / set-standby-bucket | Emulator or spare phone only (§4). On roster phones no agent changes system state; the field protocol's one `am force-stop` comes at the end of the owner-attended session (`O-01-design.md:11-13`; plan §0 rule 2). |
| zakariaf `references/job-design.md:63` "move the item to a state the user resolves (`markRejected(id, status)`, never a delete)" | Right for presence and punches; overstated for pings and travel samples, which CLAUDE.md:157-160 makes deliberately droppable on a definitive 4xx. |
| zakariaf `references/platform-behaviour.md:131` "removing from Recents usually does **not** stop work" | A generic Android docs claim; the fleet is Xiaomi/Oppo/Vivo-class (`battery.ts:4`) where DontKillMyApp reports kills (`dontkillmyapp/oppo.md`). Swipe behaviour per ROM is a device fact (O-01 step 3b; rule 2). |
| DontKillMyApp `_vendors-content/general/user.md:30` `dumpsys deviceidle disable`; `:37-41` "root your device or uninstall it though **adb**" / `pm uninstall --user 0 …` | Plan §0 rule 1 (never an uninstall) and the §4 package rule (no system-state change on a roster phone, `O-01-design.md:11-13`); cut from the vendored file. |
| DontKillMyApp `google/user.md:37` "turn doze mode completely off in **Settings > Developer options**" | Same: a system-state change on a roster phone; cut. |
| DontKillMyApp `xiaomi/dev.md:12` link to a third-party MIUI autostart checker; `xiaomi/user.md:155-161` Play Store "hidden settings" apps | Unvetted code / third-party installs on fleet phones; not vendored. Any detection library is a dependency decision for an Opus-reviewed PR. |
| DontKillMyApp `oppo/user.md:14` "(com.coloros.safecenter / com.coloros.safecenter.permission.Permission)" vs AutoStarter `AutoStartPermissionHelper.kt:65-66` `com.coloros.safecenter.permission.startup.StartupAppListActivity` | Two upstreams, two components, neither device-verified. FixFlow ships whichever resolves on the roster OEM in P5d-1b, falling back to App info (`.kt:265-280`), and records it (rule 2). |
| AutoStarter `AutoStartPermissionHelper.kt:169-171` `else -> { return false }` | Not a rule collision but a gap: `realme` and `tecno` brands return false; FixFlow's onboarding must fall back to the Settings paths in `dontkillmyapp/realme.md` / `tecno.md`, self-attested (P5b-1 `:840-841`). |

## 6. Hypothesis map (for the O-01 lens)

| H | Mechanism you can cite | Open part |
|---|---|---|
| H1 OEM kill | No autostart handling (§1.5 absence); `dontkillmyapp/*`; boot restore needs the receiver to run (`expo-native-internals.md` §2) | per-ROM prevalence (device) |
| H2 budget | 15 s job timer; dwell 20 s + untimed GPS reads (`geofence.ts:58,131`, `location.ts:31-33`); G2 narrowing: the timer frees the job, the 2 s teardown + untimed reads lose data | JS fate after `jobFinished` on OEM ROMs |
| H3 radius | `CONFIRM_ACCURACY_MAX_M` 100 vs ~80 m fence (`location.ts:28` comment), raw-point judge `evaluateFix` (`geofence.ts:89-113`); rule G2 (100-150 m). Since P6a (#192) the server judges every row with one three-state rule (`backend/app/shared/verdict.py`, contract `technician-app/src/shared/contracts/verdict-vectors.json`); re-locate the phone-side constant by symbol | the live fence row (owner) |
| H9 permission decay | single request site `permissions.ts:61`; silent stop `geofence.ts:313-316`; hibernation rules H1-H3 | auto-reset prevalence |
| H10 FGS family | `LocationTaskConsumer.kt:168-171`; `LocationModule.kt:284-286`; early returns §1.2; shared service (O01-F20) | prevalence only (SETTLED mechanism) |
| H11 Expo defects | `O-01-design.md:104-111` classification | issues not re-fetched here |
| H16 location toggle | rule G5; `GeofencingTaskConsumer.kt:120-123`; silent `error` branch `geofence.ts:268` | Play services behaviour per ROM |
| H17 data restriction | rule D1; no network constraint on jobs (`TaskManagerUtils.java:212-218`) | OEM per-app data settings |

## 7. References

- `references/expo-native-internals.md` — authored: every `expo-location` 18.0.10 / `expo-task-manager` 12.0.6 /
  `expo-modules-core` 2.2.3 behaviour above, cited by absolute cache path and line.
- `references/android-12-15-rules.md` — authored: FGS start, geofencing, hibernation, Data Saver and Expo
  plugin rules with URL and fetch date 2026-11-04, plus what was not fetched.
- `references/zakariaf-platform-behaviour-android.md` — trimmed upstream (MIT): headless loader, drop-undefined,
  rejected executor, when runs stop; verified 2026-10-14 against 57.0.21.
- `references/autostarter-intents.md` — trimmed upstream (MIT): Xiaomi/Oppo/Vivo autostart components,
  brand dispatch, lookup helpers, `<queries>`.
- `references/dontkillmyapp/xiaomi.md`, `oppo.md`, `realme.md`, `vivo.md`, `tecno.md`, `general.md`, `google.md` —
  trimmed upstream (CC-BY-4.0, www.dontkillmyapp.com / Urbandroid Team): per-OEM settings paths.
- `UPSTREAM.md` is for the maintainer (provenance, what was taken, changed, rejected).
- docs/ORCHESTRATION-DESIGN-2026-10.md and docs/program/* are on PR #182 (head 3415b5e) at write time; their line numbers refer to that head.
