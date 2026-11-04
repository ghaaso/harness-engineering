# Provenance — android-field-debugging (status: sourced)

## Upstream: skydoves/android-testing-skills

| Field | Value |
|---|---|
| Repo | https://github.com/skydoves/android-testing-skills |
| Commit | `8665ed59643c90eb1056a256a6ddec161aa1cfa1` |
| Branch | `main` |
| Fetched | 2026-11-04 (sparse, shallow clone) |
| Paths taken (cloned) | `adb/`, `fundamentals/`, `platform/` |
| Licence | Apache-2.0 (root `LICENSE`, "Apache License, Version 2.0, January 2004"; each SKILL.md frontmatter: "license: Apache-2.0. See LICENSE for complete terms.") |
| Licence file here | `LICENSE-skydoves-android-testing` (verbatim `cp` of the root `LICENSE`; sha256 `fabd7028904f…` identical to the clone) |
| Author | Jaewoong Eum (skydoves) — frontmatter `metadata.author` |
| Version notes | none of the taken files carries a "verified against version X on date" stamp; the version prerequisites they do carry (`-v json` needs Android 11+, `pidof -s` needs API 24+) are kept verbatim in `references/logcat-skydoves.md` |

### Taken

| File here | From (upstream path) | How |
|---|---|---|
| `references/logcat-skydoves.md` | `adb/observability/extracting-logs-with-logcat/SKILL.md` lines 19, 39-216, 235-330, 333-335 | trimmed, verbatim text: title, Prerequisites, Three fundamental operations, Buffer selection, Priority ladder + filters, Format flags, Time and PID filters, Buffer rotation, Patterns, Mandatory rules minus the two R8 bullets |
| `references/devices-and-run-as-skydoves.md` | `adb/devices/connecting-to-devices/SKILL.md` lines 46-72, 106-117; `adb/transfer/extracting-test-artifacts/SKILL.md` lines 74-83, 91-100, 116-157 | trimmed, verbatim text: `adb devices -l`, selectors, ready filter, device states; path-permission table, `/sdcard`, `/data/data`, `run-as` on debuggable builds |
| `LICENSE-skydoves-android-testing` | `LICENSE` | verbatim |

### Changed (adapted into SKILL.md)

- The logcat filter idiom (`Tag:P … *:S`, quoted) became the FixFlow tag set (`TaskService`,
  `LocationTaskConsumer`, `GeofencingTaskConsumer`, `TaskManagerUtils`,
  `expo.modules.taskManager.TaskManagerUtils`, `ExpoTaskManager`, `ReactNativeJS`), each tag read
  from the expo-task-manager 12.0.6 / expo-location 18.0.10 sources.
- "Clear, run, dump" became "dump first, never clear, scope live captures with `-T '<step-0
  time>'`" (O-01 step 2 reads the pre-existing log).
- The `timeout` wrapper (`adb/automation/scripting-adb-for-ci/SKILL.md`, "Timeouts — wrap with
  `timeout`") is used on every live capture in `references/fixflow-capture-sheet.md`.
- `pm path` / `dumpsys package` (`adb/apps/installing-and-managing-apps/SKILL.md:107-108`) became
  the installed-version check with the exact grep for versionCode, firstInstallTime,
  lastUpdateTime, targetSdk, userId, installerPackageName and pkgFlags.
- The "filter on device, not host grep" rule is kept for the tagged buffers; the events buffer
  has no per-package tag, so O-01 step 3a's host-side `grep -i fixflow` on `-b events` stands.
- `run-as` is reframed as an open question about the field APK (debuggable or not, settled from
  `pkgFlags`) and limited to reads after the owner's go.

### Rejected (with reason)

| Upstream content | Reason |
|---|---|
| `installing-and-managing-apps/SKILL.md:77`, `:238` `pm clear` as the reset; `:140` `adb uninstall`; `:154` "Uninstall first" on `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | plan standing rule 1 (`docs/program/SHIP-PLAN-2026-11.md:95-98`), `docs/program/w2/O-01-design.md:11`, `docs/program/w2/O-10-design.md:63`, `CLAUDE.md:154` — a clear or uninstall wipes every offline queue (survey collisions 1-3) |
| `installing-and-managing-apps/SKILL.md:66` `adb install -r -d` (downgrade) | a downgrade is an O-10 E2 STOP (survey collision 5) |
| `installing-and-managing-apps/SKILL.md:53`, `:115` `-g` / `pm grant` / `pm revoke` | grant state is what O-01 step 1b measures |
| `scripting-adb-for-ci/SKILL.md:240-242` trap teardown (`am force-stop`, `pm clear`, `adb uninstall`) | `O-01-design.md:13` "Avoid `am force-stop` until the end."; rule 1 (survey collision 4) |
| `adb/control/injecting-input-and-state/SKILL.md` (`input`, `wm`, `settings put`, `am start`, `cmd wifi`) | mutates a technician phone; the step-0 network cut lifts only per the plan's branch box (`SHIP-PLAN-2026-11.md:277`) (survey collision 6) |
| any `adb install` on a roster phone (`installing-and-managing-apps` Workflow 1) | rule 1: installs are per phone, supervised, [owner] (survey collision 7) |
| `extracting-logs-with-logcat/SKILL.md:329` "MUST call `adb logcat -c` before reproducing" and `:335` `-G 16M` | `-c` destroys the O-01 step-2 forensic log; `-G` is a device-global change with no need |
| `extracting-logs-with-logcat/SKILL.md` R8 `-assumenosideeffects` section (218-233) and its Verification list | build-shrinking advice; no ProGuard rule was inspected; out of scope |
| `connecting-to-devices/SKILL.md` step 4 (reboot, `input keyevent 82`), `connecting-over-wifi` | reboots/inputs mutate the phone; USB at the workshop is the protocol (`O-01-design.md:10`) |
| `capturing-screenshots-and-screenrecord`, `extracting-test-artifacts` TestStorage and push recipes | not needed: the A3 evidence is photos taken by the owner (`O-10-design.md:12`); nothing is pushed to a phone |
| `adb/tests/*`, the Test Orchestrator part of `scripting-adb-for-ci`, `fundamentals/*` (5 skills), `platform/legacy/*` | instrumented-test / JVM test-strategy material; FixFlow mobile ships Jest + an EAS APK and has no screen-test harness (`CLAUDE.md`, "Both client guards are pure functions") |
| `understanding-adb-architecture` | general; one rule kept in spirit (use the platform-tools adb, `adb version` recorded in the session header) |

Survey collision 8 ("no upstream sentence touches money, Supabase, Railway, expo-updates,
prebuild, alembic") was re-checked by grep over the taken paths on 2026-11-04: still none.

## Web sources (fetched 2026-11-04)

| URL | Used for |
|---|---|
| https://developer.android.com/studio/debug/bug-report | `adb bugreport <path>`, `-s <serial>`, `/bugreports`, zip contents, the on-device "Take bug report" flow |
| https://developer.android.com/tools/dumpsys | syntax, `-l`, `netstats detail`, `dumpsys package … userId`; it does **not** document location / deviceidle / netpolicy / activity services |
| https://developer.android.com/training/monitoring-device-state/doze-standby | the `deviceidle force-idle/unforce`, `battery unplug/reset`, `am set-inactive` test recipes — cited only as forbidden on technician phones |
| https://developer.android.com/topic/performance/appstandby | `am get-standby-bucket`, "greater than STANDBY_BUCKET_ACTIVE (10)", background-location exemption from the restricted bucket |
| https://developer.android.com/reference/android/app/ApplicationExitInfo | REASON_* names and values for reading `dumpsys activity exit-info` |

Not fetched / failed: none failed. Not available as web docs: per-subcommand pages for
`dumpsys location`, `deviceidle`, `netpolicy`, `activity services|exit-info`, `appops`, and
`cmd app_hibernation`; those commands are taken from `docs/program/w2/O-01-design.md:18-47`
(PR #182 head 3415b5e) and marked as such in SKILL.md §6.

## Local (non-vendored) sources cited

- `C:/Users/User/.fixflow-cache/expo-src/expo-task-manager-12.0.6/package/` (TaskService.java,
  TaskBroadcastReceiver.java, TaskManagerUtils.java, TaskManagerInternalModule.java,
  build/TaskManager.js, AndroidManifest.xml), `expo-location-18.0.10/package/`
  (GeofencingTaskConsumer.kt, LocationTaskConsumer.kt, LocationTaskService.kt, AndroidManifest.xml),
  `expo-modules-core-2.2.3/package/` (RNHeadlessAppLoader.kt) — read-only, cited by path, never
  vendored.
