#!/usr/bin/env bash
# FixFlow device lab: the app on the emulator (ship plan 7.5, phase L3a).
#
#   bash ops/lab/device/app.sh install <apk>   verify the APK bakes only the lab host, install it
#                                              on the lab emulator (never a phone), grant perms
#   bash ops/lab/device/app.sh check <apk>     the host check alone (no emulator needed)
#   bash ops/lab/device/app.sh grant           fine + coarse + background location and
#                                              notifications by `pm grant`; CAMERA denied and
#                                              user-fixed, so a clock-in takes no selfie and
#                                              opens no camera (deterministic punches)
#   bash ops/lab/device/app.sh login           sign in as the lab technician through the UI
#   bash ops/lab/device/app.sh state [file]    dump the queue + state keys from AsyncStorage
#   bash ops/lab/device/app.sh keys            check the dumped key names against the source
#   bash ops/lab/device/app.sh clear           wipe the app's data (pm clear) and re-grant
#   bash ops/lab/device/app.sh tap "<text>"    tap a node by its exact text (debugging aid)
#
# Needs: the emulator booted (emu.sh start) and the lab backend up (lab-backend.sh up).
# `install` refuses an APK whose JS bundle names any host other than the lab address, or that
# contains any env value from technician-app/eas.json (checked by value, never printed).
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$HERE/lib.sh"
# shellcheck source=lib-app.sh
source "$HERE/lib-app.sh"
load_android_env

LAB_TECH_ID="${FF_LAB_TECH_ID:-t2}"
LAB_TECH_PIN="${FF_LAB_TECH_PIN:-2580}" # lab-backend.sh seeds this; a throwaway local DB

# Refuse an APK that could reach a real server. Exits non-zero with the reason.
check_apk_hosts() { # apk
  local apk="$1" tmp
  tmp="$(mktemp -d)"
  unzip -q -o "$apk" assets/index.android.bundle resources.arsc -d "$tmp" || die "no JS bundle in $apk"
  local top
  top="$(git -C "$(winpath "$HERE")" rev-parse --show-toplevel)"
  node - "$(winpath "$tmp/assets/index.android.bundle")" "$LAB_API_URL" \
    "$(winpath "$top/technician-app/eas.json")" "$(winpath "$tmp/resources.arsc")" \
    "$(winpath "$top/technician-app/google-services.json")" << 'NODE'
const fs = require("fs");
const [bundlePath, labUrl, easPath, arscPath, gsPath] = process.argv.slice(2);
const b = fs.readFileSync(bundlePath, "utf8");
let bad = 0;
// 1. the lab base must be in the bundle (the API URL is inlined at build time)
if (!b.includes(labUrl)) { console.error(`lab API base ${labUrl} is NOT in the bundle`); bad++; }
// 2. no env value from eas.json may appear (compared by value; never printed)
try {
  const eas = JSON.parse(fs.readFileSync(easPath, "utf8"));
  const vals = new Set();
  const walk = (v, inEnv) => {
    if (typeof v === "string") { if (inEnv && v.length >= 6) vals.add(v); return; }
    if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, inEnv || k === "env");
  };
  walk(eas, false);
  let hits = 0;
  for (const v of vals) if (b.includes(v)) hits++;
  console.log(`eas.json env values checked: ${vals.size}; present in bundle: ${hits}`);
  if (hits) bad++;
} catch (e) { console.error("cannot read eas.json: " + e.message); bad++; }
// 3. list every http(s) origin the bundle names; anything not lab/doc/schema is reported
const origins = new Set((b.match(/https?:\/\/[A-Za-z0-9.-]+(:\d+)?/g) || []));
const allowed = /^(http:\/\/10\.0\.2\.2:\d+|https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?|https?:\/\/(www\.)?(w3\.org|reactnative\.dev|facebook\.github\.io|github\.com|fb\.me|expo\.dev|docs\.expo\.dev|goo\.gl|developer\.android\.com|developer\.apple\.com|reactjs\.org|react\.dev|example\.com|schemas\.android\.com|ns\.adobe\.com|json-schema\.org|bit\.ly|mozilla\.org|developer\.mozilla\.org|tools\.ietf\.org|nodejs\.org|sentry\.io|docs\.sentry\.io|ingest\.sentry\.io|nominatim\.openstreetmap\.org|openstreetmap\.org|tile\.openstreetmap\.org|maps\.google\.com|www\.google\.com|google\.com|wa\.me|api\.whatsapp\.com|exp\.host|u\.expo\.dev|reactnavigation\.org|callstack\.github\.io|xml\.org|purl\.org|www\.w3\.org))$/;
const other = [...origins].filter((o) => !allowed.test(o));
console.log(`origins in bundle: ${origins.size}; not on the allow-list: ${other.length}`);
// Reviewed by hand (2026-11-13), none a FixFlow host: Expo doc links, placeholder strings in RN
// permission constants and a library test string, Sentry loader/dev-tool URLs (Sentry is off in
// a lab build: empty DSN), and NetInfo's reachability probe (Google). Anything else FAILS.
const reviewed = /^(https:\/\/expo\.fyi|http:\/\/www\.example\.com\.android\.|https:\/\/spotlightjs\.com|https:\/\/classic-assets\.eascdn\.net|https:\/\/browser\.sentry-cdn\.com\.android\.|http:\/\/dogs\.are\.greater|https:\/\/clients3\.google\.com)/;
for (const o of other) {
  const ok = reviewed.test(o);
  console.log((ok ? "  reviewed " : "  NOT REVIEWED ") + o);
  if (!ok) bad++;
}
// 4. the production Firebase project must not be baked in (compared by value, never printed)
try {
  const gs = JSON.parse(fs.readFileSync(gsPath, "utf8"));
  const pi = gs.project_info || {};
  const vals = [pi.project_id, pi.project_number]
    .concat((gs.client || []).flatMap((c) => (c.api_key || []).map((k) => k.current_key)))
    .filter((v) => typeof v === "string" && v.length >= 6);
  const arsc = fs.readFileSync(arscPath);
  let hits = 0;
  for (const v of vals) if (arsc.includes(Buffer.from(v, "utf8")) || arsc.includes(Buffer.from(v, "utf16le"))) hits++;
  console.log(`production Firebase values checked: ${vals.length}; present in resources: ${hits}`);
  if (hits) { console.error("the production Firebase project is baked in (push would register with it)"); bad++; }
} catch (e) { console.error("cannot check Firebase values: " + e.message); bad++; }
if (/railway\.app|up\.railway|fixflow[a-z0-9-]*\.(com|app|pk|net)/i.test(b)) { console.error("a production-looking FixFlow/Railway host is in the bundle"); bad++; }
process.exit(bad ? 1 : 0);
NODE
  local rc=$?
  rm -rf "$tmp"
  return $rc
}

do_grant() {
  local p
  for p in ACCESS_FINE_LOCATION ACCESS_COARSE_LOCATION ACCESS_BACKGROUND_LOCATION POST_NOTIFICATIONS; do
    ash pm grant "$APP_PKG" "android.permission.$p" || die "pm grant $p failed"
  done
  ash pm revoke "$APP_PKG" android.permission.CAMERA > /dev/null 2>&1 || true
  ash pm set-permission-flags "$APP_PKG" android.permission.CAMERA user-fixed > /dev/null 2>&1 || true
  # location must be ON (mode 3 = high accuracy) for the fused provider and geofences
  ash settings put secure location_mode 3
  ash cmd location set-location-enabled true > /dev/null 2>&1 || true
  ash dumpsys package "$APP_PKG" | grep -E "android.permission.(ACCESS_(FINE|COARSE|BACKGROUND)_LOCATION|POST_NOTIFICATIONS|CAMERA): granted" |
    sed 's/^ */  /' | sort -u
}

do_login() {
  local name
  name="$(lab_curl "$LAB_HOST_URL/api/technicians" | node -e '
    let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
      const t = JSON.parse(s).find((x) => x.id === process.argv[1]);
      if (!t) process.exit(1); console.log(t.name);
    });' "$LAB_TECH_ID")" || die "lab tech $LAB_TECH_ID not in the lab roster (is lab-backend.sh up?)"
  launch_app
  if wait_text "Welcome back," 6; then
    log "already signed in"
    return 0
  fi
  wait_text "Technician sign-in" 40 || die "login screen did not appear"
  wait_text "$name" 30 || die "roster did not load from $LAB_API_URL (is the backend up?)"
  tap_text "$name" || die "cannot tap $name"
  tap_class android.widget.EditText || die "no PIN field"
  ash input text "$LAB_TECH_PIN"
  ash input keyevent KEYCODE_BACK > /dev/null 2>&1 # hide the keyboard so the button is visible
  sleep 1
  tap_text "Log in" || die "no Log in button"
  local t=0
  while [ $t -lt 40 ]; do
    if ui_has "Maybe later"; then
      tap_text "Maybe later"
      sleep 2
    fi
    ui_has "Welcome back," && {
      log "signed in as $LAB_TECH_ID ($name) against $LAB_API_URL"
      return 0
    }
    sleep 2
    t=$((t + 2))
  done
  die "did not reach the dashboard after Log in (screen: $(grep -o 'text="[^"]\+"' "$UI_XML" | head -n 8 | tr '\n' ' '))"
}

cmd="${1:-}"
[ -n "$cmd" ] && shift
case "$cmd" in
  install)
    apk="${1:?usage: app.sh install <apk>}"
    [ -f "$apk" ] || die "no such APK: $apk"
    require_emulator
    log "checking the APK's bundle for hosts"
    check_apk_hosts "$apk" || die "REFUSED: $apk could reach a non-lab host (see above)"
    adb_ install -r "$(winpath "$apk")" || die "install failed"
    do_grant
    ;;
  check)
    apk="${1:?usage: app.sh check <apk>}"
    check_apk_hosts "$apk" && echo "OK: $apk bakes only the lab API base"
    ;;
  grant)
    require_emulator
    do_grant
    ;;
  login)
    require_emulator
    do_login
    ;;
  state)
    require_emulator
    out="${1:-/dev/stdout}"
    dump_state "$out"
    ;;
  keys)
    src="$(git -C "$(winpath "$HERE")" rev-parse --show-toplevel)/technician-app/src"
    miss=0
    for k in "${QUEUE_KEYS[@]}" "${STATE_KEYS[@]}" fixflow_token; do
      if grep -rqF "\"$k\"" "$src" --include=*.ts --include=*.tsx; then echo "ok   $k"; else
        echo "MISSING $k"
        miss=1
      fi
    done
    exit $miss
    ;;
  clear)
    require_emulator
    ash pm clear "$APP_PKG"
    do_grant
    ;;
  tap)
    require_emulator
    tap_text "${1:?text}"
    ;;
  *)
    sed -n '2,15p' "$0" >&2
    exit 2
    ;;
esac
