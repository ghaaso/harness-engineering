#!/usr/bin/env bash
# Runs INSIDE the fixflow-android-build container; started by android-compile.sh. Never run it
# on the host. Mounts it expects:
#   /src        the worktree, READ-ONLY
#   /lab/files  NUL-separated list of the worktree's technician-app files to copy (tracked +
#               untracked-not-ignored, so .env / .eastoken / node_modules never come in)
#   /lab/hook   optional: a script run in the copy after `npm ci` (spikes only)
#   /out        the host output directory: receives only the APK, the REDACTED log and facts
#   /root/.gradle, /root/.npm   the fixflow-gradle-cache / fixflow-npm-cache volumes
#
#   inner.sh <release|debug> <gradle max workers> <gradle Xmx> <timeout seconds>
#
# Everything is built under /work, in the container's own filesystem: `expo prebuild` writes
# /work/technician-app/android, never the repository. The whole file is one `main` call, so
# bash has parsed all of it before anything runs.
set -uo pipefail

export APP=/work/technician-app
export RAW=/work/build.raw.log  # raw log: never leaves the container
export FACTS=/work/facts.txt    # copied to /out only after redaction
export STAGE_FILE=/work/stage.cur

fact() { echo "$1: $2" >> "$FACTS"; }

# The current stage lives in a file so the parent can name the stage that failed or timed out.
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
  set -euo pipefail
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
    cp /lab/hook /work/hook.sh
    bash /work/hook.sh
  fi

  stage prebuild
  npm view expo-template-bare-minimum@sdk-52 version || true
  npx expo prebuild --platform android --no-install

  stage gradle
  cd android
  {
    echo ""
    echo "# --- fixflow lab overrides (container copy only) ---"
    echo "org.gradle.jvmargs=-Xmx${XMX} -XX:MaxMetaspaceSize=1g"
    echo "kotlin.daemon.jvmargs=-Xmx2g"
    echo "org.gradle.caching=true"
    echo "org.gradle.parallel=true"
  } >> gradle.properties
  grep -E '^(newArchEnabled|hermesEnabled|reactNativeArchitectures)=' gradle.properties
  ccache -z > /dev/null
  ./gradlew --no-daemon --console=plain --build-cache --max-workers "$WORKERS" "$TASK"
  ccache -s

  stage collect
  local apk
  apk=$(ls app/build/outputs/apk/"$VARIANT"/*.apk | head -n1)
  cp "$apk" "/work/app-$VARIANT.apk"
}

redact_file() { # in-place: replace every value listed in /work/secrets.txt
  local f="$1"
  node - "$f" /work/secrets.txt > "$f.tmp" << 'NODE'
const fs = require("fs");
let s = fs.readFileSync(process.argv[2], "utf8");
const secrets = fs.readFileSync(process.argv[3], "utf8").split("\n").filter(Boolean)
  .sort((a, b) => b.length - a.length);
for (const v of secrets) s = s.split(v).join("[REDACTED]");
process.stdout.write(s);
NODE
  mv "$f.tmp" "$f"
}

main() {
  export VARIANT="$1" WORKERS="$2" XMX="$3"
  local timeout_s="$4" rc cur_stage stage_t0
  case "$VARIANT" in
    release) export TASK=assembleRelease ;;
    debug) export TASK=assembleDebug ;;
    *) echo "bad variant $VARIANT" >&2; return 2 ;;
  esac
  mkdir -p /work
  : > "$FACTS"
  export -f fact stage build

  # The build runs in its own bash under `timeout`, so a hung or timed-out build still gets
  # its facts written and its log redacted below.
  timeout --kill-after=60 "$timeout_s" bash -c build > "$RAW" 2>&1
  rc=$?

  cur_stage=unknown
  stage_t0=$(date +%s)
  [ -s "$STAGE_FILE" ] && read -r cur_stage stage_t0 < "$STAGE_FILE"
  fact "stage_seconds.$cur_stage" "$(($(date +%s) - stage_t0))"
  fact "failed_stage" "$([ "$rc" -eq 0 ] && echo none || echo "$cur_stage")"
  fact "inner_exit" "$rc"
  fact "sdk_autoinstalls" "$(grep -c 'Preparing "Install' "$RAW")"
  fact "ccache" "$(grep -E '^ +Hits:' "$RAW" | head -n1 | tr -s ' ')"
  fact "container_memory_peak_mib" "$(($(cat /sys/fs/cgroup/memory.peak 2> /dev/null || echo 0) / 1048576))"
  fact "container_oom_kills" "$(sed -n 's/^oom_kill //p' /sys/fs/cgroup/memory.events 2> /dev/null)"

  local apk="/work/app-$VARIANT.apk"
  if [ "$rc" -eq 0 ] && [ -f "$apk" ]; then
    fact "apk_bytes" "$(stat -c %s "$apk")"
    fact "apk_sha256" "$(sha256sum "$apk" | cut -d' ' -f1)"
    fact "abis" "$(unzip -Z1 "$apk" | sed -n 's#^lib/\([^/]*\)/.*#\1#p' | sort -u | tr '\n' ' ')"
    apksigner verify --print-certs "$apk" > /work/certs.txt 2>&1
    fact "apksigner_exit" "$?"
    fact "signer_sha256" "$(sed -n 's/.*certificate SHA-256 digest: //p' /work/certs.txt | head -n1)"
    fact "signer_dn" "$(sed -n 's/.*certificate DN: //p' /work/certs.txt | head -n1)"
    aapt2 dump badging "$apk" > /work/badging.txt 2>&1
    fact "badging" "$(head -n1 /work/badging.txt)"
    fact "minSdkVersion" "$(sed -n "s/^minSdkVersion:'\(.*\)'/\1/p" /work/badging.txt)"
    fact "targetSdkVersion" "$(sed -n "s/^targetSdkVersion:'\(.*\)'/\1/p" /work/badging.txt)"
  fi

  # --- redaction ------------------------------------------------------------------------
  # Values from app.json / google-services.json / eas.json must never reach /out. They are
  # read from the COPY, every occurrence in the log and the facts is replaced, and a re-scan
  # must find none. If a file exists but cannot be parsed, nothing is published (exit 97).
  if ! node - "$APP" > /work/secrets.txt 2> /work/secrets.err << 'NODE'
const fs = require("fs"), path = require("path");
const app = process.argv[2];
const read = (f) => {
  const p = path.join(app, f);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8")); // throws -> non-zero exit -> log withheld
};
const out = new Set();
const walk = (v, keyPath, pick) => {
  if (typeof v === "string") { if (pick(keyPath, v)) out.add(v); return; }
  if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, keyPath.concat(k), pick);
};
const appJson = read("app.json");
const pkg = appJson?.expo?.android?.package;
const sensitive = /key|secret|token|dsn|password|projectid|client_id|mobilesdk|url/i;
walk(appJson, [], (kp, v) => v.length >= 6 && kp.some((k) => sensitive.test(k)));
walk(read("google-services.json"), [], (kp, v) => v.length >= 6 && v !== pkg);
walk(read("eas.json"), [], (kp, v) => v.length >= 6 && kp.includes("env"));
for (const v of out) console.log(v);
NODE
  then
    echo "secret extraction failed; publishing no log" >&2
    fact "redaction" "FAILED: could not read the secret-bearing files; build.log withheld"
    redact_file "$FACTS" 2> /dev/null || true
    rm -f "$RAW"
    cp "$FACTS" /out/facts.txt
    return 97
  fi
  local nsecrets hits=0 c v
  nsecrets=$(grep -c . /work/secrets.txt || true)
  cp "$RAW" /work/build.log
  rm -f "$RAW"
  redact_file /work/build.log
  redact_file "$FACTS"
  while IFS= read -r v; do
    [ -z "$v" ] && continue
    c=$(cat /work/build.log "$FACTS" | grep -cF -- "$v" || true)
    hits=$((hits + c))
  done < /work/secrets.txt
  rm -f /work/secrets.txt
  fact "redaction" "$nsecrets values from app.json/google-services.json/eas.json; $hits remaining after redaction"
  cp "$FACTS" /out/facts.txt
  if [ "$hits" -ne 0 ]; then
    echo "redaction failed: $hits secret occurrences remain; publishing no log" >&2
    return 97
  fi
  cp /work/build.log /out/build.log
  [ -f "$apk" ] && [ "$rc" -eq 0 ] && cp "$apk" "/out/app-$VARIANT.apk"
  tail -n 40 /out/build.log
  return "$rc"
}

# One line: bash has read it whole before main runs, so an edit to this file mid-build
# (a checkout, a save) cannot shift what bash reads next.
main "$@"; exit $?
