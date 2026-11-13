#!/usr/bin/env bash
# FixFlow local Android compile gate (ship plan §7.5 phase L2). See ops/lab/README.md.
#
#   bash ops/lab/android-compile.sh <lane> <worktree> [release|debug]
#
# Copies <worktree>/technician-app into a container (the worktree is mounted READ-ONLY), runs
# `npm ci`, `npx expo prebuild --platform android` and the Gradle assemble task THERE, and
# writes the APK, the redacted build log and summary.txt to
#   ${FF_LAB_OUT:-C:/Users/User/.fixflow-cache/lab}/<lane>/android-<stamp>/
# Exits non-zero on any failure. The APK is signed with the prebuild template's public debug
# key: it proves the native project compiles and must NEVER be installed on a roster phone
# (plan standing rule 1). Only EAS builds reach phones.
#
# Holds 2 slots of the machine-wide lock (ff-slot.sh, with this script's PID on them) for the
# whole run; a trap releases them and removes the container on exit, error, Ctrl-C or TERM.
#
# Knobs (env): FF_ANDROID_MEM (6g), FF_ANDROID_CPUSET (0-7: the container sees 8 CPUs, which
# also bounds ninja/clang), FF_ANDROID_WORKERS (8), FF_ANDROID_XMX (3g, at most 4g), FF_ANDROID_TIMEOUT_MIN
# (100), FF_ANDROID_HOOK (a host script run in the copy after `npm ci` — spikes only; the
# summary marks such a run MODIFIED), FF_SLOT_SH, FF_LAB_OUT.
set -uo pipefail

winpath() { if command -v cygpath > /dev/null; then cygpath -m "$1"; else echo "$1"; fi; }
# Under Git Bash, MSYS rewrites /src, /out etc. into Windows paths for native programs. Turn
# that off for docker ONLY: exported globally it also stops `git -C /c/...` from resolving,
# which once produced an empty copy list and a vacuous git-status proof.
docker() { MSYS_NO_PATHCONV=1 command docker "$@"; }
die() { echo "android-compile: $*" >&2; exit 3; }
usage() { echo "usage: android-compile.sh <lane> <worktree> [release|debug]" >&2; exit 2; }

own_container=0
cleaned=0
cleanup() {
  [ "$cleaned" -eq 1 ] && return
  cleaned=1
  [ "$own_container" -eq 1 ] && docker rm -f "$NAME" > /dev/null 2>&1
  [ -n "${HOLDER:-}" ] && bash "$SLOT_SH" release "$HOLDER" > /dev/null 2>&1
  [ -n "${LIST:-}" ] && rm -f "$LIST" "$LIST.all"
}

git_status() { git -C "$wt" status --porcelain=v1 --untracked-files=all; }

write_summary() { # exit_code note  -> prints the summary; returns 1 if the worktree changed
  local rc="$1" note="$2" status_after unchanged=yes
  status_after=$(git_status) || { status_after="(git status failed)"; unchanged=NO; }
  [ "$status_before" = "$status_after" ] || unchanged=NO
  {
    echo "lane: $lane"
    echo "variant: $variant"
    echo "worktree_head: $head_sha"
    echo "image: $TAG"
    echo "exit_code: $rc"
    echo "note: $note"
    echo "wall_seconds: $(($(date +%s) - t_start))"
    echo "slot_wait_seconds: ${slot_wait:-n/a}"
    echo "files_copied: $nfiles"
    echo "limits: memory=$MEM cpuset=$CPUSET gradle_workers=$WORKERS gradle_xmx=$XMX timeout_min=$TIMEOUT_MIN"
    if [ -n "$HOOK" ]; then
      echo "MODIFIED: hook $(basename "$HOOK") sha256=$(sha256sum "$HOOK" | cut -c1-16) — a spike, not a gate result for the worktree as committed"
    fi
    echo "git_status_unchanged: $unchanged (before: $(printf '%s' "$status_before" | grep -c .) lines, after: $(printf '%s' "$status_after" | grep -c .) lines)"
    if [ "$unchanged" != yes ]; then
      echo "git_status_diff:"
      diff <(printf '%s\n' "$status_before") <(printf '%s\n' "$status_after") | sed 's/^/  /'
    fi
    [ -f "$OUT/facts.txt" ] && cat "$OUT/facts.txt"
  } > "$SUMMARY"
  rm -f "$OUT/facts.txt"
  cat "$SUMMARY"
  [ "$unchanged" = yes ]
}

main() {
  lane="${1:-}"
  wt="${2:-}"
  variant="${3:-release}"
  [ -n "$lane" ] && [ -n "$wt" ] || usage
  [[ "$lane" =~ ^[a-z0-9][a-z0-9-]{0,30}$ ]] || die "lane must match [a-z0-9-]"
  case "$variant" in release | debug) ;; *) usage ;; esac
  [ -f "$wt/technician-app/package.json" ] || die "no technician-app/ in $wt"
  wt=$(cd "$wt" && pwd)

  HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
  SLOT_SH="${FF_SLOT_SH:-/c/Users/User/Documents/projects/EMS_workshop1/docs/program/lab/ff-slot.sh}"
  OUT_ROOT="${FF_LAB_OUT:-/c/Users/User/.fixflow-cache/lab}"
  MEM="${FF_ANDROID_MEM:-6g}"
  CPUSET="${FF_ANDROID_CPUSET:-0-7}"
  WORKERS="${FF_ANDROID_WORKERS:-8}"
  XMX="${FF_ANDROID_XMX:-3g}"
  TIMEOUT_MIN="${FF_ANDROID_TIMEOUT_MIN:-100}"
  HOOK="${FF_ANDROID_HOOK:-}"
  [ -f "$SLOT_SH" ] || die "slot lock not found: $SLOT_SH"
  if [ -n "$HOOK" ]; then
    [ -f "$HOOK" ] || die "hook not found: $HOOK"
    HOOK="$(cd "$(dirname "$HOOK")" && pwd)/$(basename "$HOOK")"
  fi

  TAG="fixflow-android-build:$(sha256sum "$HERE/Dockerfile.android" | cut -c1-12)"
  NAME="fixflow-$lane-android"
  OUT="$OUT_ROOT/$lane/android-$(date +%Y%m%dT%H%M%S)"
  mkdir -p "$OUT" || die "cannot create $OUT"
  SUMMARY="$OUT/summary.txt"
  t_start=$(date +%s)
  nfiles=0
  head_sha=unknown

  trap cleanup EXIT
  trap 'echo "interrupted" >&2; cleanup; exit 130' INT TERM HUP

  status_before=$(git_status) || die "git status failed in $wt"
  head_sha=$(git -C "$wt" rev-parse HEAD) || die "git rev-parse failed in $wt"
  [ -e "$wt/technician-app/android" ] &&
    die "technician-app/android/ exists in the worktree: a native project makes EAS treat the app as bare. Stop."

  # Copy list: tracked + untracked-but-not-ignored files under technician-app/ that exist.
  # Ignored files (.env, .eastoken, node_modules) never enter the container.
  LIST="$OUT/.copy-list"
  git -C "$wt" ls-files -z --cached --others --exclude-standard -- technician-app > "$LIST.all" ||
    die "git ls-files failed in $wt"
  local f
  while IFS= read -r -d '' f; do [ -f "$wt/$f" ] && printf '%s\0' "$f"; done < "$LIST.all" > "$LIST"
  nfiles=$(tr -cd '\0' < "$LIST" | wc -c)
  [ "$nfiles" -gt 0 ] || die "empty copy list for $wt/technician-app"
  tr '\0' '\n' < "$LIST" | grep -qx 'technician-app/package-lock.json' || die "package-lock.json not in the copy list"

  # A container with our name that is still running belongs to another run of this lane.
  [ "$(docker inspect -f '{{.State.Running}}' "$NAME" 2> /dev/null)" = "true" ] &&
    die "$NAME is already running (another build for lane $lane)"

  # Our PID goes on the slots: ff-slot reaps them only once this script is gone, so a long
  # cold build never loses them, and a SIGKILLed run frees them without an age limit.
  HOLDER="$lane-android-$$"
  local t_slot rc note
  t_slot=$(date +%s)
  bash "$SLOT_SH" acquire "$HOLDER" 2 "$$" || { write_summary 4 "slot acquire failed"; exit 4; }
  slot_wait=$(($(date +%s) - t_slot))

  if ! docker image inspect "$TAG" > /dev/null 2>&1; then
    echo "building $TAG (no build context)"
    if ! docker build -t "$TAG" - < "$HERE/Dockerfile.android" > "$OUT/image-build.log" 2>&1; then
      write_summary 5 "image build failed: see image-build.log"
      exit 5
    fi
  fi

  docker rm -f "$NAME" > /dev/null 2>&1 # a stopped leftover of this lane's own container
  local mounts=(
    -v "$(winpath "$wt"):/src:ro"
    -v "$(winpath "$LIST"):/lab/files:ro"
    -v "$(winpath "$HERE/android-compile-inner.sh"):/lab/inner.sh:ro"
    -v "$(winpath "$OUT"):/out"
    -v fixflow-gradle-cache:/root/.gradle
    -v fixflow-npm-cache:/root/.npm
  )
  [ -n "$HOOK" ] && mounts+=(-v "$(winpath "$HOOK"):/lab/hook:ro")

  own_container=1
  # The inner script times the build itself (so a timed-out build still gets a redacted log);
  # the outer `timeout` is only a backstop 10 minutes later.
  docker run --rm --name "$NAME" \
    --memory "$MEM" --memory-swap "$MEM" --cpuset-cpus "$CPUSET" \
    "${mounts[@]}" \
    "$TAG" \
    timeout --kill-after=30 "$(((TIMEOUT_MIN + 10) * 60))" \
    bash /lab/inner.sh "$variant" "$WORKERS" "$XMX" "$((TIMEOUT_MIN * 60))"
  rc=$?
  own_container=0

  note=ok
  if [ "$rc" -eq 0 ] && [ ! -f "$OUT/app-$variant.apk" ]; then
    rc=6
    note="build exited 0 but produced no APK"
  fi
  case "$rc" in
    0) ;;
    124) note="timed out after $TIMEOUT_MIN min (failed_stage names where)" ;;
    137) note="killed (SIGKILL: out of memory at $MEM, or a timeout's kill-after)" ;;
    97) note="redaction check failed: build.log withheld" ;;
    6) ;;
    *) note="build failed: see failed_stage and build.log" ;;
  esac
  if ! write_summary "$rc" "$note"; then
    echo "WORKTREE CHANGED during the build (see git_status_diff in summary.txt)" >&2
    [ "$rc" -eq 0 ] && rc=7
    sed -i "s/^exit_code: 0$/exit_code: 7/; s/^note: ok$/note: the worktree's git status changed during the run/" "$SUMMARY"
  fi
  echo "output: $OUT"
  exit "$rc"
}

# One line: bash has read it whole before main runs, so an edit to this file mid-build
# (a checkout, a save) cannot shift what bash reads next.
main "$@"; exit $?
