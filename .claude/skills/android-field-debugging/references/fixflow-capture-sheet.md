<!-- Authored for FixFlow, 2026-11-04 -->
# Read-only capture sheet (adb laptop, Git Bash or any POSIX shell)

Every command here **reads**. Nothing in this file writes to the phone, changes a setting,
kills a process or touches app data. The command set is the O-01 field protocol
(`docs/program/w2/O-01-design.md:18-69`) plus the installed-version checks; commands the
protocol did not name are marked (INFERRED) and must be reported as such. Run a section only when
the brief says "runs commands", with the serial the brief names. §6 (bug report) is **[owner]**
and never run by an agent.

```bash
PKG=com.fixflow.technician            # technician-app/app.json:16 key android.package
S=<serial from the brief>             # never guess; `adb devices -l` must list exactly this one
OUT=<capture dir OUTSIDE the repo>/$(date +%Y%m%d-%H%M)   # raw captures hold location + PII
A="adb -s $S"
mkdir -p "$OUT"
```

## 0. Session header (who, what, when)

```bash
adb version                                  > "$OUT/00-adb-version.txt"
adb devices -l                               > "$OUT/00-devices.txt"
$A shell getprop ro.product.manufacturer     > "$OUT/00-device.txt"
$A shell getprop ro.product.model           >> "$OUT/00-device.txt"
$A shell getprop ro.build.version.release   >> "$OUT/00-device.txt"
$A shell getprop ro.build.version.sdk       >> "$OUT/00-device.txt"
{ $A shell date; date; }                     > "$OUT/00-clock.txt"   # phone, then laptop: skew
$A shell uptime                              > "$OUT/00-uptime.txt"
```

## 1. Installed version and package state (O-01 1a/1b; O-10 A2; P2c, P4b, P5d-1a)

```bash
$A shell dumpsys package $PKG > "$OUT/10-package.txt"
grep -E 'versionCode|versionName|firstInstallTime|lastUpdateTime|targetSdk|userId|installerPackageName|pkgFlags' "$OUT/10-package.txt"
grep -E 'ACCESS_(FINE|COARSE|BACKGROUND)_LOCATION|POST_NOTIFICATIONS|FOREGROUND_SERVICE' "$OUT/10-package.txt"
$A shell pm path $PKG                        > "$OUT/11-pm-path.txt"
```

Reading: `versionCode=N … targetSdk=T` and `versionName=0.1.0` (the UI shows only versionName,
`docs/program/w2/O-10-design.md:8`). `firstInstallTime` changes only on a fresh install, so an
unchanged `firstInstallTime` with a newer `lastUpdateTime` is the install-over that rule 1
requires (INFERRED from Android package semantics). `pkgFlags=[ … DEBUGGABLE … ]` present means
`run-as` would work (INFERRED; settles the open "is the field APK debuggable?" question).
`granted=false` on BACKGROUND → H9 on this phone; FINE false with COARSE true → approximate grant
(`O01-F07`) (`O-01-design.md:20-22`).

Pulling the installed APK for the cert/bundle check (read-only on the phone; O-10 A2):

```bash
$A pull "$(sed -n 's/^package://p' "$OUT/11-pm-path.txt" | head -1 | tr -d '\r')" "$OUT/base.apk"
apksigner verify --print-certs "$OUT/base.apk" > "$OUT/12-cert.txt"        # SHA-256 → K
unzip -p "$OUT/base.apk" assets/index.android.bundle | grep -a -c 'jobs.outbox.v2'
```

The K comparison against `eas credentials` is **[owner]** (`O-10-design.md:8`). Report the cert
SHA-256 as printed (it is public), the API host only as a fingerprint unless the brief says it is
the known production host.

## 2. Background-execution state (O-01 1c-1h)

```bash
$A shell appops get $PKG                               > "$OUT/20-appops.txt"     # RUN_ANY_IN_BACKGROUND: ignore = restricted
$A shell dumpsys deviceidle whitelist | grep -i fixflow > "$OUT/21-deviceidle.txt" # NO "+pkg"/"-pkg" argument, ever
$A shell am get-standby-bucket $PKG                    > "$OUT/22-bucket.txt"
$A shell cmd app_hibernation get-state $PKG            > "$OUT/23-hibernation.txt" # Android 12+
$A shell settings get secure location_mode             > "$OUT/24-location-mode.txt" # get only
$A shell dumpsys location                              > "$OUT/25-location.txt"
grep -iE 'enabled|provider' "$OUT/25-location.txt"
UID_=$(sed -n 's/.*userId=\([0-9]*\).*/\1/p' "$OUT/10-package.txt" | head -1)
$A shell dumpsys netpolicy | grep -A2 "$UID_"          > "$OUT/26-netpolicy.txt"
$A shell dumpsys jobscheduler | grep -A4 "$PKG"        > "$OUT/27-jobs.txt"     # (INFERRED) pending Expo TaskJobService jobs
$A shell dumpsys netstats detail | grep -A3 "uid=$UID_" > "$OUT/28-netstats.txt" # coarse per-uid bytes
```

`netstats detail` reports per-uid bytes in two-hour buckets (`bucketDuration=7200000`) (WEB,
https://developer.android.com/tools/dumpsys, fetched 2026-11-04).

Note: Play-services geofences (`GeofencingClient`) live in Google Play services, not in the
framework `LocationManager`; absence of a FixFlow geofence in `dumpsys location` proves nothing
(INFERRED). Record OEM autostart, app battery saver and lock-in-recents from the device screens
(O-01 1i, `O-01-design.md:32`) — that is the person holding the phone reading a screen, not adb.

## 3. Forensics before the app is touched (O-01 step 2)

```bash
$A shell dumpsys activity exit-info $PKG > "$OUT/30-exit-info-before.txt"   # Android 11+
$A logcat -b all -d -v threadtime -v year > "$OUT/31-logcat-before.txt"     # NO -c, ever
grep -E 'fixflow|TaskService|LocationTaskConsumer|GeofencingTaskConsumer|TaskManager|am_proc_start|am_kill|ReactNativeJS' "$OUT/31-logcat-before.txt" > "$OUT/32-before-filtered.txt"
$A shell dumpsys activity services $PKG > "$OUT/33-services-before.txt"     # if clocked in
```

## 4. Live capture during the protocol steps (O-01 steps 3-4)

```bash
timeout 75m $A logcat -v threadtime -v year -T "<step-0 clock time, MM-DD HH:MM:SS.000>" \
  "TaskService:V LocationTaskConsumer:V GeofencingTaskConsumer:V TaskManagerUtils:V expo.modules.taskManager.TaskManagerUtils:V ExpoTaskManager:V ReactNativeJS:V *:S" \
  > "$OUT/40-live-tags.txt" &
timeout 75m $A logcat -b events -v threadtime -v year | grep -i fixflow > "$OUT/41-live-events.txt" &
# at each protocol mark the session announces:
$A shell pidof $PKG                       >> "$OUT/42-pid-marks.txt"
$A shell dumpsys activity services $PKG   >> "$OUT/43-services-marks.txt"
```

The events buffer has no per-package tag, so a host-side grep on it is the only filter (the
upstream "filter on device" rule applies to the tagged main buffer).

## 5. Close-out (O-01 step 5)

```bash
$A shell dumpsys activity exit-info $PKG > "$OUT/50-exit-info-after.txt"
$A logcat -b all -d -v threadtime -v year > "$OUT/51-logcat-after.txt"
sha256sum "$OUT"/* > "$OUT/SHA256SUMS"
```

The app's network stays cut; it is restored only when O-10 says so (`O-01-design.md:69`) —
**[owner]**.

## 6. Bug report — **[owner]** (the owner runs it, with the technician's consent; the agent never does)

For the owner's reference only; an agent never runs this section, whatever the brief says. It
analyses only the redacted excerpt the owner hands it (../SKILL.md §2 step 9).

```bash
# [owner] only
adb -s $S bugreport "$OUT/"          # WEB: saved to the given dir, or the local directory without one
$A shell ls /bugreports/             # WEB: older reports; pull a zip with `adb pull /bugreports/<name>.zip`
```

The zip's main file `bugreport-BUILD_ID-DATE.txt` carries dumpsys, dumpstate and logcat output
(WEB, https://developer.android.com/studio/debug/bug-report, fetched 2026-11-04). It is the whole
phone, not FixFlow: every app's logs and notifications, accounts, Wi-Fi names, location history
(INFERRED from that content list). Handling and redaction: see ../SKILL.md §2 step 9.
