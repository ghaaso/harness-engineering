# UPSTREAM — android-background-execution (status: sourced)

Packaged 2026-11-04. Upstreams were fetched as sparse, shallow clones on 2026-11-04 (manifest in the
packaging session's scratchpad). The owner's row asked for a custom skill: the existing upstream
skill covers periodic jobs only, so geofencing, Android 12-15 rules and OEM settings intents are
written here from local Expo sources, fetched platform docs and the two OEM upstreams.

## 1. zakariaf/ReactNative-Skills

- Repo: https://github.com/zakariaf/ReactNative-Skills
- Commit: `41a0e66d4d09de5b46e6537f59a97c7192473486`, branch `main`, fetched 2026-11-04
- Paths taken: `skills/background-tasks` (read whole; one reference vendored trimmed)
- Licence: MIT ("Copyright (c) 2026 Zakaria Fatahi"), copied verbatim to `LICENSE-zakariaf-reactnative-skills`
- Upstream verification note kept: "Verified on 2026-10-14 against `expo-background-task` 57.0.21 and
  `expo-task-manager` 57.0.21" (`references/platform-behaviour.md:7-8`).

**Taken.** `references/platform-behaviour.md` → `references/zakariaf-platform-behaviour-android.md`,
trimmed: provenance paragraph, section 3 Android bullet + closing paragraph, section 4 Android bullets,
section 5 whole. A FixFlow reading note is added inside a quote block marked "not upstream".

**Changed.** The upstream's three Android mechanisms (headless loader, drop-undefined tasks,
`console.error` on a rejected executor) were re-verified against FixFlow's pinned
`expo-task-manager` 12.0.6 and restated in `references/expo-native-internals.md` §2 items 7-9
(headless loader items 7-8; drop-undefined and `console.error`-only executor item 9) with 12.0.6
line numbers. `SKILL.md` §2 step 4 traces the headless-loader hop only. Its "unregisterAllTasksAsync on
sign-out" anti-pattern (`SKILL.md:158`) is consistent with FixFlow's logout path
(`stopDutyPings` / `stopJobTravel`) and is not restated.

**Rejected (with reason).**
- `SKILL.md` rules 1, 10, 12 and `references/api-and-config.md` §§3, 4, 8 — `expo-background-task`,
  its config plugin and the `expo-background-fetch` migration: not installed in `technician-app`
  (Expo `~52.0.0`), and the topic is periodic jobs, not geofencing.
- `SKILL.md:40` 25 s job budget — collides with the 15 s `MAX_TASK_EXECUTION_TIME_MS` FixFlow's
  headless jobs run under (`SKILL.md` §5).
- `references/api-and-config.md:77` and `SKILL.md:85-87` (`npx expo install`, regenerate the prebuild
  snapshot) — never `expo prebuild`; agents run no `npx`/`npm` (README rule 2; design §5.3(e)).
- `references/testing-and-device-proof.md:119`, `:122-125` (`am kill`, `force-idle`,
  `set-standby-bucket`) — emulator-only; never on a roster phone (O-01 ground rules; plan §0 rules 1-2).
- `references/job-design.md:63` "never a delete" — overstated for FixFlow's droppable pings and travel
  samples (CLAUDE.md "the outbox never deletes a write" exceptions).
- `references/platform-behaviour.md:131` generic "removing from Recents usually does not stop work" —
  kept verbatim in the trimmed file but overruled for fleet claims (plan §0 rule 2).
- `scripts/` (202,185 B; `check-lib.mjs` alone 122,200 B), `tests/`, `templates/`, `examples/` —
  an SDK 57 checker and SQLite/expo-router reference app; over the size cap and not FixFlow's
  AsyncStorage + hand-rolled outbox.
- All iOS content (BGTaskScheduler, `UIBackgroundModes`, iOS device proof) — FixFlow mobile is
  Android-only. Exception: the iOS column of section 5's table is kept in
  `references/zakariaf-platform-behaviour-android.md` for table integrity; it is not FixFlow guidance.
- `references/api-and-config.md` §7 store declarations — the APK is EAS-distributed internally
  (`technician-app/src/features/onboarding/battery.ts:13-14`).

## 2. urbandroid-team/dont-kill-my-app

- Repo: https://github.com/urbandroid-team/dont-kill-my-app
- Commit: `3616bc8b3b6b3910ac204e107ff0dfd6064f877c`, branch `master`, fetched 2026-11-04
- Paths taken: `_vendors` (front matter read for the fleet vendors), `_vendors-content/{xiaomi,oppo,realme,vivo,tecno,general,google}`
- Licence: CC-BY-4.0, copied verbatim (`LICENCE`, begins "Attribution 4.0 International") to
  `LICENSE-urbandroid-dont-kill-my-app`. **Attribution: content by www.dontkillmyapp.com / Urbandroid
  Team** — the form the upstream README asks for ("mentioning the original authors of the site, as
  either www.dontkillmyapp.com, or Urbandroid Team"). Every vendored file names it in its header.
- Upstream date/version notes kept in the vendored files: the MIUI 10-14 tested-device list
  (`xiaomi/dev.md:15-21`) — it is the test list of the third-party XomaDev/MIUI-autostart checker
  (`xiaomi/dev.md:10-12`, rejected below), kept and labelled as such, not a verification of any
  settings path; "On MIUI 14 …" (`xiaomi/user.md:40`), Vivo "reported from Android 13"
  (`vivo/user.md:16,28`), "On Color OS 6 …" (`oppo/user.md:60`). The repo has no global
  "last updated" and **no HyperOS content** (grep, 2026-11-04).

**Taken.** Seven files under `references/dontkillmyapp/`, one per vendor folder, each trimmed:
text kept verbatim; images and `<div>/<figure>` markup removed; `<figcaption>` text kept as plain
lines; sections cut are listed in each file's header.

**Changed.** The settings paths feed `SKILL.md` §2 step 6 and the P5b-1 onboarding step as
device-unverified input. Nothing was reworded.

**Rejected (with reason).**
- `general/user.md:20-30` "turn Doze mode off" / `dumpsys deviceidle disable` and `:32-41` "If all
  fails" (root, `adb shell pm uninstall --user 0 …`) — plan §0 rule 1 (never an uninstall) and the
  package rule in `SKILL.md` §4 (no system-state change on a roster phone; field-protocol ground
  rules `docs/program/w2/O-01-design.md:11-13`).
- `google/user.md:34-37` "If all fails … turn doze mode completely off" — same reason.
- `xiaomi/dev.md:10-12, 24-39` link to and usage of a third-party MIUI autostart checker — unvetted
  third-party code; a dependency decision belongs to an Opus-reviewed PR.
- `xiaomi/user.md:153-161` "Hidden settings" Play Store apps — third-party installs on fleet phones.
- `oppo/user.md:14` component `com.coloros.safecenter.permission.Permission` — kept verbatim but not
  adopted as fact: it differs from AutoStarter's Oppo component and neither is device-verified
  (plan §0 rule 2).
- Vendors with no fleet relevance (asus, blackview, htc, huawei, lenovo, meizu, motorola, nokia,
  oneplus, samsung, sony, ulefone, unihertz, wiko, hmd-global) — the fleet is "Xiaomi/Oppo/Vivo-class"
  (`technician-app/src/features/onboarding/battery.ts:4`); Realme and Tecno are kept as likely
  budget-fleet brands pending the P0a roster. Huawei's `pm uninstall -k --user 0 com.huawei.powergenie`
  (`huawei/user.md:99,101`) is rejected on rule 1 as well.
- `_includes`, images, `about*.md`, `api.md`, `press.md`, `index.md` — site chrome, not in scope.

## 3. judemanutd/AutoStarter

- Repo: https://github.com/judemanutd/AutoStarter
- Commit: `ea5fca55457facb6f97555e20dcd231b39c6995e`, branch `master`, fetched 2026-11-04
- Paths taken: `autostarter/src/main/java/com/judemanutd/autostarter/AutoStartPermissionHelper.kt`
  (475 lines) and `autostarter/src/main/AndroidManifest.xml` (the `<queries>` block)
- Licence: MIT ("Copyright (c) 2018 Jude Fernandes"), copied verbatim from `LICENSE.txt` to
  `LICENSE-judemanutd-autostarter`
- Version: README gradle coordinate `com.github.judemanutd:autostarter:1.1.0` (`README.md:35`). No
  "verified against" note and no tested-device list exists upstream.

**Taken.** `references/autostarter-intents.md`, trimmed, code verbatim: fleet-OEM constants
(`.kt:15-23`, `59-83`), `getAutoStartPermission` dispatch (`:137-173`), `autoStartXiaomi` (`:199-206`),
`autoStartOppo` + `launchOppoAppInfo` + `autoStartVivo` (`:250-293`), helpers (`:340-350`, `:369-374`,
`:398-402`, `:425-433`, `:445-455`), manifest `<queries>` fleet lines.

**Changed.** Component names are restated in `SKILL.md` §5 as code-verified only. Noted gaps:
no `realme`/`tecno`/`infinix`/`itel`/`hyperos` entry (unknown brand → `false`, `.kt:169-171`);
the Oppo component differs from DontKillMyApp's.

**Rejected (with reason).** Non-fleet brands (Letv, Asus, Honor, Huawei, Nokia, Samsung, OnePlus —
listed by line, not vendored); Gradle files, sample app, logo — not needed to cite a component name.
Adding AutoStarter as a dependency is not proposed: it is a native module and a decision for P5b-1's
Opus-reviewed PR.

## 4. Not vendored, cited by path (read-only cache)

`C:/Users/User/.fixflow-cache/expo-src/expo-location-18.0.10/`, `expo-task-manager-12.0.6/`,
`expo-modules-core-2.2.3/`, `expo-notifications-0.29.14/` (each `/package/`). No licence file was
read for these; nothing from them is copied beyond short identifiers and log strings quoted as
citations in `references/expo-native-internals.md`.

## 5. Web sources (fetched 2026-11-04)

Re-fetched by the author on 2026-11-04 (all OK):
1. https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start
2. https://developer.android.com/develop/sensors-and-location/location/geofencing
3. https://developer.android.com/about/versions/15/behavior-changes-15
4. https://developer.android.com/topic/performance/app-hibernation
5. https://developer.android.com/training/basics/network-ops/data-saver
6. https://developer.android.com/develop/background-work/services/fgs/service-types

Fetched by the survey on 2026-11-04, not re-fetched by the author (OK per the survey):
7. https://developer.android.com/training/permissions/requesting
8. https://docs.expo.dev/versions/v52.0.0/sdk/location/ (returned a summarised excerpt)

Not fetched / no primary source reached: notification-channel importance behaviour; the Google
Location Accuracy toggle; OEM documentation (none exists); HyperOS behaviour; Expo GitHub issues
#49424, #52230, #50060, #46505, #52544, #47023 (classified in PR #182 `docs/program/w2/O-01-design.md:104-111`).

## 6. Survey corrections found while packaging (2026-11-04)

The survey's pointers were re-read; these lines differed and the package cites the corrected ones:
`TaskManagerUtils.java` `PENDING_INTENT_REQUEST_CODE` is `:39` and `DEFAULT_OVERRIDE_DEADLINE` `:41`
(survey `:42`/`:44`); the two CHANGELOG version headings are at `:13` (survey `:12`); the CI bundle
check is `.github/workflows/ci.yml:76-77` (survey `:79-80`); AutoStarter's manifest does declare a
`<queries>` block and comments out `QUERY_ALL_PACKAGES` (survey left it unread).
