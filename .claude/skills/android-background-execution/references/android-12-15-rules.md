<!-- Authored for FixFlow, 2026-11-04 -->
# Android 12-15 platform rules that bind FixFlow's three tasks

Every fact is WEB, fetched 2026-11-04 (re-fetched by the package author that day; first collected
by the survey the same day). Quotes are under 25 words. Platform docs describe AOSP; an OEM ROM
may be stricter (see `dontkillmyapp/`), and plan §0 standing rule 2 forbids a field claim from
these alone. `technician-app` targets SDK 52's default `targetSdk` (34 per
`docs/program/w2/O-01-design.md:106`, "targetSdk 34 (the SDK 52 default)"; confirm on a phone with
`dumpsys package … | grep targetSdk`).

| Id | Rule | URL | Bears on |
|---|---|---|---|
| A1 | "Apps that target Android 12 (API level 31) or higher can't start foreground services while the app is running in the background, except for a few special cases." | https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start | H10, O01-F01, O01-F20 |
| A2 | Exemptions include a geofencing / activity-recognition event, `ACTION_BOOT_COMPLETED` / `ACTION_MY_PACKAGE_REPLACED`, a notification tap, and "The user turns off battery optimizations for your app." | same | why `battery.ts` exemption matters; Expo still refuses (`LocationTaskConsumer.kt:168-171`) |
| A3 | A while-in-use FGS (location) "cannot *create* the service while the app is in the background, even if the app falls into one of the exemptions" | same | Expo's foreground check mirrors this |
| A4 | Android 14+: from the background, creating a camera/location/microphone FGS without the current permission "throws a `SecurityException`" | same | #49424 shape (`O01-F15`) |
| A5 | A `location`-typed FGS "started by an app that has the `ACCESS_BACKGROUND_LOCATION` permission … can access location information all the time" (exemption list: system component, widget, notification, PendingIntent from a visible app, DPC, VoiceInteractionService, `START_ACTIVITIES_FROM_BACKGROUND`) | same | why "Allow all the time" (H9) is load-bearing |
| A6 | "you cannot create a `location` foreground service while your app is in the background, unless you've been granted the `ACCESS_BACKGROUND_LOCATION` runtime permission" | https://developer.android.com/develop/background-work/services/fgs/service-types | worded differently from A3; both recorded |
| A7 | "Beginning with Android 14 (API level 34), you must declare an appropriate service type for each foreground service." Location needs `FOREGROUND_SERVICE_LOCATION`; alternative: "consider using the geofence API instead." | same | `app.json` permissions (key names only) carry `FOREGROUND_SERVICE_LOCATION` |
| A8 | Android 15 target: `BOOT_COMPLETED` receivers may not launch `dataSync`, `camera`, `mediaPlayback`, `phoneCall`, `mediaProjection`, `microphone` FGS; `location` is not listed. Test (emulator or spare phone only, SKILL.md §4): `adb shell am compat enable FGS_BOOT_COMPLETED_RESTRICTIONS <pkg>`, then `adb shell am broadcast -a android.intent.action.BOOT_COMPLETED <pkg>` | https://developer.android.com/about/versions/15/behavior-changes-15 | boot restore path |
| A9 | The 6 h / 24 h FGS timeout applies to `dataSync` and `mediaProcessing`; `location` is not named. Test (emulator or spare phone only): `adb shell am compat enable FGS_INTRODUCE_TIME_LIMITS <pkg>` (re-fetched 2026-11-04 for this test flag) | same | not a 14 h duty-cap conflict |
| G1 | "You can have multiple active geofences, with a limit of 100 per app, per device user." | https://developer.android.com/develop/sensors-and-location/location/geofencing | FixFlow registers one (`FENCE_ID`) |
| G2 | "For best results, the minimum radius of the geofence should be set between 100 - 150 meters." "assume that Wi-Fi location accuracy is about 50 meters." | same | H3, O01-F04; the fence is owner data (~80 m per `location.ts:28`) |
| G3 | `INITIAL_TRIGGER_ENTER` "should be triggered if the device is already inside the geofence"; DWELL plus a loitering delay reduces alert spam | same | Expo sets ENTER+EXIT initial triggers, no DWELL (O01-F11) |
| G4 | Latency "Usually … less than 2 minutes"; with Background Location Limits "about 2-3 minutes on average"; stationary "up to 6 minutes" | same | the field protocol's 6-minute waits |
| G5 | Re-register after reboot, reinstall, app data cleared, Play services data cleared, and a `GEOFENCE_NOT_AVAILABLE` alert ("typically happens after NLP … is disabled"); survives Play services upgrade/restart and location-process crash | same | H16, O01-F03 |
| G6 | "On most devices, the geofence service uses only network location for geofence triggering"; with no reliable data connection "alerts might not be generated" | same | indoor workshop; Data Saver |
| G7 | Permissions: `ACCESS_FINE_LOCATION`, plus `ACCESS_BACKGROUND_LOCATION` when targeting Android 10+ | same | an "Approximate" grant (O01-F07) |
| H1 | Target 12+ on Android 12+, hibernated: runtime permissions reset; "Your app can't run jobs or alerts from the background"; no FCM | https://developer.android.com/topic/performance/app-hibernation | H9, O01-F06 |
| H2 | "running a job does not count as usage"; JobScheduler jobs, implicit broadcasts and alarms are non-examples of usage | same | every Expo delivery is a job (`TaskService.java:318-342`) |
| H3 | Opt-out names: Android 13+ "Pause app activity if unused" (App info); 12 "Remove permissions and free up space"; 11 "Remove permissions if app isn't used" (App info > Permissions). APIs `getUnusedAppRestrictionsStatus()`, `createManageUnusedAppRestrictionsIntent()` sent with `startActivityForResult()`. Check: `adb shell cmd app_hibernation get-state PACKAGE-NAME` | same | P5b-1 hibernation exemption |
| D1 | "When a user enables Data Saver in **Settings** and the device is on a metered network, the system blocks background data usage"; `getRestrictBackgroundStatus()` returns `…_DISABLED` / `…_ENABLED` / `…_WHITELISTED`; request via `Settings.ACTION_IGNORE_BACKGROUND_DATA_RESTRICTIONS_SETTINGS` with `package:MY_APP_ID`; inspect `adb shell dumpsys netpolicy`; `ACTION_RESTRICT_BACKGROUND_CHANGED` reaches only dynamically registered receivers | https://developer.android.com/training/basics/network-ops/data-saver | H17 |
| E1 | Expo v52 config plugin: `isAndroidBackgroundLocationEnabled` enables `ACCESS_BACKGROUND_LOCATION`; `isAndroidForegroundServiceEnabled` "Defaults to `true` if `isAndroidBackgroundLocationEnabled` is `true`" (fetch returned a summarised excerpt; survey-only) | https://docs.expo.dev/versions/v52.0.0/sdk/location/ | `app.json:52-53` key names |

Survey-fetched only (2026-11-04, not re-fetched by the author): https://developer.android.com/training/permissions/requesting
— Android 11+ auto-reset of "sensitive runtime permissions" for an app "not used for a few months";
permanent denial flags `USER_SET` / `USER_FIXED` visible in `adb shell dumpsys package PACKAGE_NAME`.

**Not fetched (WEB_UNAVAILABLE in this package):** notification-channel importance rules (whether an
app can raise a channel's importance after creation), the Google Location Accuracy toggle, any OEM's
own documentation (none exists, `AutoStarter` README "there is no documented api"), HyperOS
(Xiaomi, post-MIUI 14) behaviour, and the Expo GitHub issues #49424, #52230, #50060, #46505, #52544,
#47023 (classified in `docs/program/w2/O-01-design.md:104-111`, not re-read here).
