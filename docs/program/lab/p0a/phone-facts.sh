#!/usr/bin/env bash
# P0a items 5-6, one phone: read-only facts about the FixFlow technician app on it.
#
#   phone-facts.sh [--dry-run] [adb serial]
#
# STRICTLY READ-ONLY ON THE PHONE. It never starts the app, never installs, uninstalls, clears
# data or changes a setting: the phones hold unsynced records that opening the app can destroy.
# The only phone commands are:  adb shell pm path | adb pull | adb shell dumpsys package |
# adb shell getprop   (plus "adb devices", which only lists serials when none is given).
# Pulls base.apk of com.fixflow.technician to C:/fixflow-phones/<serial>/, then prints:
# signing certificate SHA-256 (apksigner), versionCode, versionName, whether the bundle contains
# "jobs.outbox.v2", the API host name(s) baked into the bundle, manufacturer / model / Android
# version, and one Markdown row for the W0-results roster.
# FF_ADB / FF_APKSIGNER override the tool paths (apksigner needs a JDK). Log and a facts file go to
# C:/fixflow-phones/<serial>/. --dry-run prints each adb command and runs nothing.
set -u
export MSYS_NO_PATHCONV=1
DRY=0; ARGS=()
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    *) ARGS+=("$a") ;;
  esac
done
set -- "${ARGS[@]+"${ARGS[@]}"}"
SERIAL="${1:-}"
PKG=com.fixflow.technician
ADB="${FF_ADB:-adb}"
AS="${FF_APKSIGNER:-apksigner}"
STAMP="$(date +%Y%m%d-%H%M%S)"

if [ -z "$SERIAL" ]; then
  if [ "$DRY" = 1 ]; then
    echo "+ $ADB devices        (no serial given: a real run uses the only attached device, or stops if there are several)"
    SERIAL="SERIAL"
  else
    command -v "$ADB" >/dev/null 2>&1 || { echo "adb not found (set FF_ADB)" >&2; exit 2; }
    DEVS="$("$ADB" devices | awk 'NR>1 && $2=="device" {print $1}')"
    N="$(printf '%s\n' "$DEVS" | grep -c .)"
    [ "$N" -eq 1 ] || { echo "found $N authorised devices; pass the serial as the argument. Attached:"; "$ADB" devices; exit 2; }
    SERIAL="$DEVS"
  fi
fi
case "$SERIAL" in *[!A-Za-z0-9._:-]*) echo "bad serial" >&2; exit 2 ;; esac

OUTW="C:/fixflow-phones/$SERIAL"; OUTU="/c/fixflow-phones/$SERIAL"
if [ "$DRY" = 1 ]; then LOG=/dev/null; else mkdir -p "$OUTU"; LOG="$OUTU/phone-facts-$STAMP.log"; fi
say() { if [ "$DRY" = 1 ]; then echo "$*"; else echo "$*" | tee -a "$LOG"; fi; }
A() { if [ "$DRY" = 1 ]; then echo "+ $ADB -s $SERIAL $*" >&2; return 0; fi; echo "+ $ADB -s $SERIAL $*" >> "$LOG"; "$ADB" -s "$SERIAL" "$@"; }

if [ "$DRY" != 1 ]; then command -v "$ADB" >/dev/null 2>&1 || { echo "adb not found (set FF_ADB)" >&2; exit 2; }; fi
say "phone-facts $STAMP serial=$SERIAL package=$PKG (read-only)"

# 1. where is the apk
if [ "$DRY" = 1 ]; then
  A shell pm path "$PKG"
  APKDEV="/data/app/<...>/base.apk"
else
  PMOUT="$(A shell pm path "$PKG" 2>>"$LOG" | tr -d '\r')"
  APKDEV="$(printf '%s\n' "$PMOUT" | sed -n 's#^package:\(.*/base\.apk\)$#\1#p' | head -1)"
  [ -n "$APKDEV" ] || { say "package $PKG is NOT installed on this phone (or the phone is unauthorised): unknown, because pm path returned nothing"; exit 1; }
fi
say "on-device path: $APKDEV"

# 2. pull it
APKW="$OUTW/base.apk"; APKU="$OUTU/base.apk"
if [ "$DRY" = 1 ]; then A pull "$APKDEV" "$APKW"
else
  A pull "$APKDEV" "$APKW" >> "$LOG" 2>&1 && [ -s "$APKU" ] || { say "adb pull failed: unknown, because the apk could not be copied (see $LOG)"; exit 1; }
fi
say "pulled: $APKW"

# 3. signing certificate
CERT="unknown, because apksigner is missing or failed"; [ "$DRY" = 1 ] && CERT="(dry run)"
if [ "$DRY" = 1 ]; then echo "+ $AS verify --print-certs $APKW"
elif command -v "$AS" >/dev/null 2>&1; then
  c="$("$AS" verify --print-certs "$APKW" 2>>"$LOG" | tr -d '\r' | sed -n 's/^Signer #1 certificate SHA-256 digest: *//p' | head -1)"
  [ -n "$c" ] && CERT="$c"
fi
say "signing certificate SHA-256: $CERT"

# 4. versionCode / versionName
VC="unknown"; VN="unknown"; [ "$DRY" = 1 ] && { VC="(dry run)"; VN="(dry run)"; }
if [ "$DRY" = 1 ]; then A shell dumpsys package "$PKG"
else
  DS="$(A shell dumpsys package "$PKG" 2>>"$LOG" | tr -d '\r')"
  v="$(printf '%s\n' "$DS" | sed -n 's/.*versionCode=\([0-9]*\).*/\1/p' | head -1)"; [ -n "$v" ] && VC="$v"
  v="$(printf '%s\n' "$DS" | sed -n 's/^ *versionName=\(.*\)$/\1/p' | head -1)"; [ -n "$v" ] && VN="$v"
fi
say "versionCode: $VC   versionName: $VN"

# 5. the bundle: jobs.outbox.v2 and API hosts
V2="unknown"; HOSTS="unknown"; [ "$DRY" = 1 ] && V2="(dry run)"
if [ "$DRY" = 1 ]; then
  echo "+ unzip -p $APKW assets/index.android.bundle | grep -a -c jobs.outbox.v2"
  echo "+ unzip -p $APKW assets/index.android.bundle | grep -aoE 'https?://[A-Za-z0-9.-]+' (hostnames only)"
else
  BUNDLE="$OUTU/index.android.bundle"
  if command -v unzip >/dev/null 2>&1; then unzip -p "$APKU" assets/index.android.bundle > "$BUNDLE" 2>>"$LOG"
  else tar -xOf "$APKW" assets/index.android.bundle > "$BUNDLE" 2>>"$LOG"; fi
  if [ -s "$BUNDLE" ]; then
    if grep -aq 'jobs\.outbox\.v2' "$BUNDLE"; then V2=yes; else V2=no; fi
    HOSTS="$(grep -aoE 'https?://[A-Za-z0-9.-]+' "$BUNDLE" | sed -E 's#^https?://##' | sort -u)"
  else say "could not extract assets/index.android.bundle: v2 and hosts unknown, because the bundle could not be read"; fi
fi
say "bundle contains jobs.outbox.v2: $V2"
API="unknown"
if [ "$DRY" != 1 ] && [ "$HOSTS" != unknown ]; then
  API="$(printf '%s\n' "$HOSTS" | grep -Ei 'railway|fixflow|api|supabase|\.app$' | paste -sd, -)"
  [ -n "$API" ] || API="none matched (see the full list)"
  say "API host(s) baked into the bundle (hostnames only): $API"
  say "all hostnames found in the bundle: $(printf '%s\n' "$HOSTS" | paste -sd, -)"
else say "API host(s) baked into the bundle: $API"; fi

# 6. the phone
if [ "$DRY" = 1 ]; then
  A shell getprop ro.product.manufacturer; A shell getprop ro.product.model; A shell getprop ro.build.version.release
  MAN="<manufacturer>"; MOD="<model>"; REL="<android>"
else
  MAN="$(A shell getprop ro.product.manufacturer 2>>"$LOG" | tr -d '\r')"
  MOD="$(A shell getprop ro.product.model 2>>"$LOG" | tr -d '\r')"
  REL="$(A shell getprop ro.build.version.release 2>>"$LOG" | tr -d '\r')"
fi
say "phone: $MAN $MOD, Android $REL"

ROW="| $SERIAL |  | $MAN $MOD | Android $REL |  | $VC / $VN | $CERT | $V2 | $API | $(date +%Y-%m-%d) |"
say ""
say "Paste into the W0-results roster (technician id and shared-phone yes/no are yours to fill; K = compare the cert with 'eas credentials'):"
say "| Serial | Technician id | OEM / model | Android | Shared phone | versionCode / versionName | Cert SHA-256 | v2 | API host(s) | Date |"
say "$ROW"
if [ "$DRY" = 1 ]; then echo "(dry run: nothing was executed; the app is never started)"; else echo "$ROW" > "$OUTU/roster-row.md"; say "saved: $OUTW/roster-row.md   log: $LOG"; fi
exit 0
