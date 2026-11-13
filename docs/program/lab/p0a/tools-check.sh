#!/usr/bin/env bash
# P0a item 10: which of the tools and accesses are present on this machine.
#
#   tools-check.sh [--dry-run] [--no-eas]
#
# Prints "present" or "MISSING" for: docker (docker info), adb, apksigner, java, gh, node,
# eas-cli (npx eas-cli --version; --no-eas skips it, because npx may download the package).
# FF_ADB / FF_APKSIGNER override where adb / apksigner are looked for.
# Changes nothing. Always exits 0. Log: C:/fixflow-dumps/logs/tools-check-<stamp>.log
set -u
export MSYS_NO_PATHCONV=1
DRY=0; NOEAS=0
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    --no-eas) NOEAS=1 ;;
  esac
done
STAMP="$(date +%Y%m%d-%H%M%S)"
LOGDIR="/c/fixflow-dumps/logs"
if [ "$DRY" = 1 ]; then LOG=/dev/null; else mkdir -p "$LOGDIR"; LOG="$LOGDIR/tools-check-$STAMP.log"; fi
say() { echo "$*" | tee -a "$LOG"; }
GH="/c/Program Files/GitHub CLI/gh.exe"
ADB="${FF_ADB:-adb}"
AS="${FF_APKSIGNER:-apksigner}"

if [ "$DRY" = 1 ]; then
  echo "+ docker info --format '{{.ServerVersion}}'"
  echo "+ \"$ADB\" version"
  echo "+ \"$AS\" --version"
  echo "+ java -version"
  echo "+ \"$GH\" auth status"
  echo "+ node --version"
  [ "$NOEAS" = 1 ] || echo "+ npx --yes eas-cli --version"
  echo "(dry run: nothing was executed)"
  exit 0
fi

say "tools-check $STAMP"

v="$(docker info --format '{{.ServerVersion}}' 2>/dev/null)"
if [ -n "$v" ]; then say "docker       present  (engine $v, docker info ok)"
else say "docker       MISSING  (docker info failed: start Docker Desktop)"; fi

if command -v "$ADB" >/dev/null 2>&1; then
  say "adb          present  ($ADB; $("$ADB" version 2>&1 | head -1))"
else say "adb          MISSING  (install Android platform-tools, or set FF_ADB=<full path to adb.exe>)"; fi

if command -v "$AS" >/dev/null 2>&1; then
  say "apksigner    present  ($AS; $("$AS" --version 2>&1 | head -1))"
else say "apksigner    MISSING  (install Android build-tools, or set FF_APKSIGNER=<full path to apksigner.bat>)"; fi

if command -v java >/dev/null 2>&1; then
  say "java         present  ($(java -version 2>&1 | head -1))"
else say "java         MISSING  (a JDK is needed by apksigner)"; fi

if [ -x "$GH" ]; then
  if "$GH" auth status >/dev/null 2>&1; then say "gh           present  (logged in)"
  else say "gh           present  (NOT logged in: run gh auth login)"; fi
else say "gh           MISSING  ($GH)"; fi

if command -v node >/dev/null 2>&1; then say "node         present  ($(node --version))"
else say "node         MISSING"; fi

if [ "$NOEAS" = 1 ]; then
  say "eas-cli      skipped  (--no-eas)"
else
  out="$(timeout 180 npx --yes eas-cli --version 2>/dev/null | tail -1)"
  if [ -n "$out" ]; then say "eas-cli      present  ($out)"
  else say "eas-cli      MISSING  (npx eas-cli --version failed; login is a separate manual step: npx eas-cli login)"; fi
fi
say "log: $LOG"
exit 0
