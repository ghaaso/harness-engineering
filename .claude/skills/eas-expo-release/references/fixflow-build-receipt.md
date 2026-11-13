<!-- Authored for FixFlow, 2026-11-04 -->
# FixFlow build receipt and installed-build receipt

Two receipts, both returned as tables the session commits (an agent returns the rows; it does
not commit them). Package `com.fixflow.technician` (`docs/program/w2/O-10-design.md:8`;
`technician-app/app.json:16` holds it under the key `android.package`). Placeholders:
`<domain>` = the owned domain (plan §4 row 1), `<phone>` = the roster label from P0a item 5,
`fleet.apk` = the downloaded artifact. "plan line N" = `docs/program/SHIP-PLAN-2026-11.md:N`;
`O-10-design.md` / `O-01-design.md` = `docs/program/w2/…` (both on PR #182 @ 3415b5e, see
SKILL.md references). Every command below is read-only. Marks: what each row
proves is VERIFIED-BY-COMMAND only when the command ran in this session.

## A. Build receipt (P2c, P5b-2, P14-n; also the compile gates P5a / P5b-1)

| # | Field | Command (read-only) | Pass condition |
| --- | --- | --- | --- |
| A1 | build id, profile, commit | `npx eas-cli@<pinned> build:list --platform android --limit 5 --json` (owner's logged-in shell; `docs/HANDOFF.md:83` says poll this, not `build:view`) | profile is `fleet`; status finished; commit = the merged phase commit |
| A2 | package + versionCode | `aapt2 dump badging fleet.apk \| grep -o "package: name='[^']*' versionCode='[0-9]*'"` | name `com.fixflow.technician`; versionCode > the fleet maximum from every P0a item 6 row (plan line 426) |
| A3 | signing cert | `apksigner verify --print-certs fleet.apk \| grep -E 'SHA-256\|SHA-1'` (or `keytool -printcert -jarfile fleet.apk`) | K=yes: SHA-256 equals the field cert recorded in P0a item 6; K=no: record the new SHA-256 |
| A4 | API host baked | `unzip -p fleet.apk assets/index.android.bundle \| grep -a -c 'api.<domain>'` | ≥ 1 |
| A5 | no foreign host | same pipe with `grep -a -c` for `up.railway.app`, `fixflow.example`, `10.0.2.2` | each 0 (`10.0.2.2` is the silent fallback when `EXPO_PUBLIC_API_URL` is unset, `technician-app/src/lib/config.ts:14`) |
| A6 | v2 outbox | same pipe, `grep -a -c 'jobs.outbox.v2'` (`technician-app/src/lib/outbox.ts:62`) | ≥ 1 |
| A7 | manifest gate (P2b-1 on) | same pipe, `grep -a -c 'drain_manifest'` (event name, `O-10-design.md:55`) | ≥ 1 for any build from P2b-1 on |
| A8 | Sentry DSN present | same pipe, `grep -a -o 'https://[0-9a-f]\{32\}@[^/" ]*/[0-9]\{1,\}' \| sort -u \| wc -l`; fingerprint `… \| sort -u \| sha256sum \| cut -c1-12` | count ≥ 1; report the 12-hex fingerprint only, never the DSN |

Notes. A4–A8 grep the **built APK**. A local `expo export` takes `EXPO_PUBLIC_*` from the
shell / `.env` (`config.ts:5`), not from `eas.json`, so it proves the code, never the baked
host. The Hermes bundle keeps string literals in its string table, which is what the plan's
`grep -a` method relies on (plan line 259, 485; INFERRED that every literal above survives).

W0-results "Fleet APK v1" row (plan line 491): build id · versionCode · cert SHA-256 · grep
result (A4–A8 counts) · install result (section B on the spare phone) · screenshot of the
Drain Report.

## B. Installed-build receipt, per phone (P0a item 6, P2c spare phone, P4a/P4b E2, P5c, P5d-1a, P14-final, P14-fleet)

BEFORE (phone attached by USB, USB debugging on, P0a item 10):

| # | Field | Command (read-only) |
| --- | --- | --- |
| B1 | versionCode, versionName, firstInstallTime, lastUpdateTime | `adb shell dumpsys package com.fixflow.technician \| grep -E 'versionCode\|versionName\|firstInstallTime\|lastUpdateTime\|targetSdk\|userId'` (`docs/program/w2/O-01-design.md:19`) |
| B2 | field cert | `adb shell pm path com.fixflow.technician`, `adb pull <base.apk path> field-<phone>.apk`, `apksigner verify --print-certs field-<phone>.apk` (`O-10-design.md:8`) |
| B3 | drain precondition | P0a/P4b/P4r row exists for `<phone>`; Drain Report empty (P5d-1a, plan line 898). Missing → STOP: no install (standing rule 1) |

Decision before the owner installs: same package, same cert (B2 = A3), phone versionCode
< build versionCode. A cert mismatch or a build versionCode at or below the phone's → STOP
this phone and re-check K (plan lines 150-152; `O-10-design.md:63`). Never uninstall.

[owner] Install: `adb install -r fleet.apk` or tap "install an update to this existing
application" (`O-10-design.md:63`).

AFTER:

| # | Check | Pass condition |
| --- | --- | --- |
| B4 | B1 again | versionCode = A2; `lastUpdateTime` later than BEFORE; `firstInstallTime` **unchanged** (INFERRED: Android keeps firstInstallTime across an in-place update and resets it on a fresh install, so an unchanged value is the receipt that no uninstall happened) |
| B5 | B2 again | cert unchanged |
| B6 | app opens | Drain Report renders (P2c) / onboarding step completed (P5d-1a); permissions re-granted if hibernation revoked them (`O-10-design.md:64`) |

Row lands in W0-results (P0a, P2c, P4a/P4b) or `docs/program/FIELD-VALIDATION.md` (P5d-1a,
P14-fleet; plan line 899-900): phone · tech id · BEFORE versionCode/lastUpdateTime/cert ·
AFTER versionCode/lastUpdateTime/firstInstallTime/cert · install method · result · time.
Both files are created by their phases; neither exists on `main` @ a31924a.

Why install-over is time-critical: `expo-task-manager` 12.0.6 registers its
`TaskBroadcastReceiver` for `MY_PACKAGE_REPLACED`
(`C:/Users/User/.fixflow-cache/expo-src/expo-task-manager-12.0.6/package/android/src/main/AndroidManifest.xml:9`),
so headless tasks restart the moment `adb install -r` finishes, before anyone opens the app.
That is why the manifest gate must be in the build (`O-10-design.md:48`) and why A7 is checked
before the install, not after.
