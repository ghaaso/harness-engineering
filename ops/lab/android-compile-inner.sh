#!/usr/bin/env bash
# Runs INSIDE the fixflow-android-build container; started by android-compile.sh. Never run it
# on the host. Mounts it expects:
#   /src        the worktree, READ-ONLY
#   /lab/files  NUL-separated list of the worktree's technician-app files to copy (tracked +
#               untracked-not-ignored, so .env / .eastoken / node_modules / android never come in)
#   /lab/hook   optional: a script run in the copy after `npm ci` (spikes only)
#   /out        the host output directory
#   /root/.gradle, /root/.npm   the fixflow-gradle-cache / fixflow-npm-cache volumes
#
# Everything is built under /work, in the container's own filesystem: `expo prebuild` writes
# /work/technician-app/android, never the repository.
set -uo pipefail

variant="$1"
workers="$2"
xmx="$3"
case "$variant" in
  release) task=assembleRelease ;;
  debug) task=assembleDebug ;;
  *) echo "bad variant $variant" >&2; exit 2 ;;
esac

APP=/work/technician-app
RAW=/work/build.raw.log # stays in the container until redacted
FACTS=/out/facts.txt
: > "$FACTS"
fact() { echo "$1: $2" >> "$FACTS"; }

# The build runs in a subshell (so set -e ends the build, not this script); the current stage
# lives in a file so the parent can name the stage that failed.
STAGE_FILE=/work/stage.cur
mkdir -p /work
stage() {
  local now prev t0
  now=$(date +%s)
  if [ -s "$STAGE_FILE" ]; then
    read -r prev t0 < "$STAGE_FILE"
    fact "stage_seconds.$prev" "$((now - t0))"
  fi
  echo "$1 $now" > "$STAGE_FILE"
  echo "=== STAGE $1 $(date -Is)"
}

build() {
  set -e
  stage copy
  tar -C /src --null -T /lab/files -cf - | tar -C /work -xf -
  cd "$APP"
  test ! -e android # the copy must start without a native project (EAS managed workflow)

  stage npm-ci
  node --version
  npm --version
  npm ci --no-audit --no-fund

  if [ -s /lab/hook ]; then
    stage hook
    bash /lab/hook
  fi

  stage prebuild
  npm view expo-template-bare-minimum@sdk-52 version || true
  npx expo prebuild --platform android --no-install

  stage gradle
  cd android
  {
    echo ""
    echo "# --- fixflow lab overrides (container copy only) ---"
    echo "org.gradle.jvmargs=-Xmx${xmx} -XX:MaxMetaspaceSize=1g -XX:+HeapDumpOnOutOfMemoryError"
    echo "kotlin.daemon.jvmargs=-Xmx2g"
    echo "org.gradle.caching=true"
    echo "org.gradle.parallel=true"
  } >> gradle.properties
  grep -E '^(newArchEnabled|hermesEnabled|reactNativeArchitectures)=' gradle.properties
  ./gradlew --no-daemon --build-cache --max-workers "$workers" "$task"
  ccache -s || true

  stage collect
  local apk
  apk=$(ls app/build/outputs/apk/"$variant"/*.apk | head -n1)
  cp "$apk" "/out/app-$variant.apk"
  set +e
}

( build ) > "$RAW" 2>&1
rc=$?
cur_stage=unknown
stage_t0=$(date +%s)
[ -s "$STAGE_FILE" ] && read -r cur_stage stage_t0 < "$STAGE_FILE"
fact "stage_seconds.$cur_stage" "$(($(date +%s) - stage_t0))"
fact "failed_stage" "$([ "$rc" -eq 0 ] && echo none || echo "$cur_stage")"
fact "inner_exit" "$rc"

# APK facts (only when the build produced one)
APK="/out/app-$variant.apk"
if [ "$rc" -eq 0 ] && [ -f "$APK" ]; then
  fact "apk_bytes" "$(stat -c %s "$APK")"
  fact "apk_sha256" "$(sha256sum "$APK" | cut -d' ' -f1)"
  fact "abis" "$(unzip -Z1 "$APK" | sed -n 's#^lib/\([^/]*\)/.*#\1#p' | sort -u | tr '\n' ' ')"
  apksigner verify --print-certs "$APK" > /work/certs.txt 2>&1
  fact "apksigner_exit" "$?"
  fact "signer_sha256" "$(sed -n 's/.*certificate SHA-256 digest: //p' /work/certs.txt | head -n1)"
  fact "signer_dn" "$(sed -n 's/.*certificate DN: //p' /work/certs.txt | head -n1)"
  aapt2 dump badging "$APK" > /work/badging.txt 2>&1
  fact "badging" "$(head -n1 /work/badging.txt)"
  fact "sdkVersion" "$(sed -n "s/^sdkVersion:'\(.*\)'/\1/p" /work/badging.txt)"
  fact "targetSdkVersion" "$(sed -n "s/^targetSdkVersion:'\(.*\)'/\1/p" /work/badging.txt)"
fi

# --- redaction --------------------------------------------------------------------------
# Values from app.json / google-services.json / eas.json must never reach a file under /out.
# Collect them from the COPY (the repository is never read for this), replace every
# occurrence in the log and the facts, then prove zero remain.
node - "$APP" > /work/secrets.txt 2>/dev/null <<'NODE'
const fs = require("fs"), path = require("path");
const app = process.argv[2];
const read = (f) => { try { return JSON.parse(fs.readFileSync(path.join(app, f), "utf8")); } catch { return null; } };
const out = new Set();
const walk = (v, keyPath, pick) => {
  if (typeof v === "string") { if (pick(keyPath, v)) out.add(v); return; }
  if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, keyPath.concat(k), pick);
};
const appJson = read("app.json");
const pkg = appJson?.expo?.android?.package;
const sensitive = /key|secret|token|dsn|password|projectid|client_id|mobilesdk|current_key|url/i;
walk(appJson, [], (kp, v) => v.length >= 6 && kp.some((k) => sensitive.test(k)));
walk(read("google-services.json"), [], (kp, v) => v.length >= 6 && v !== pkg);
walk(read("eas.json"), [], (kp, v) => v.length >= 6 && kp.includes("env"));
for (const v of out) console.log(v);
NODE
nsecrets=$(grep -c . /work/secrets.txt || true)
redact() { # file
  local f="$1" tmp="$1.tmp"
  node - "$f" /work/secrets.txt > "$tmp" <<'NODE'
const fs = require("fs");
let s = fs.readFileSync(process.argv[2], "utf8");
const secrets = fs.readFileSync(process.argv[3], "utf8").split("\n").filter(Boolean)
  .sort((a, b) => b.length - a.length);
for (const v of secrets) s = s.split(v).join("[REDACTED]");
process.stdout.write(s);
NODE
  mv "$tmp" "$f"
}
cp "$RAW" /work/build.log
redact /work/build.log
redact "$FACTS"
hits=0
while IFS= read -r v; do
  [ -z "$v" ] && continue
  c=$(cat /work/build.log "$FACTS" | grep -cF -- "$v" || true)
  hits=$((hits + c))
done < /work/secrets.txt
fact "redaction" "$nsecrets values from app.json/google-services.json/eas.json; $hits remaining after redaction"
cp /work/build.log /out/build.log
rm -f "$RAW" /work/secrets.txt
if [ "$hits" -ne 0 ]; then
  echo "redaction failed: $hits secret occurrences remain" >&2
  rm -f /out/build.log
  exit 97
fi
tail -n 40 /out/build.log
exit "$rc"
