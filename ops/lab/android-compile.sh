#!/usr/bin/env bash
# FixFlow local Android compile gate (ship plan §7.5 phase L2). See ops/lab/README.md.
#
#   bash ops/lab/android-compile.sh <lane> <worktree> [release|debug]
#
# Copies <worktree>/technician-app into a container (the worktree is mounted READ-ONLY), runs
# `npm ci`, `npx expo prebuild --platform android` and the Gradle assemble task THERE, and
# writes the APK, the redacted build log and summary.txt to
#   ${FF_LAB_OUT:-C:/Users/User/.fixflow-cache/lab}/<lane>/android-<stamp>/
# Exits non-zero on any failure. The APK is compile evidence only: it is signed with the
# prebuild template's public debug key, bakes no API host, and is NEVER installed on any phone
# (plan standing rule 1). Only EAS builds reach phones.
#
# Holds 2 slots of the machine-wide lock (ff-slot.sh, with this script's PID on them) for the
# whole run; a trap releases them and removes the container on exit, error, Ctrl-C, TERM or HUP.
# SIGKILL cannot be trapped: the lock then reaps the slots once the PID is gone, while the
# container (labelled fixflow.holder=<holder>) runs on until its own timeout.
#
# Knobs (env): FF_ANDROID_MEM (6g), FF_ANDROID_CPUSET (0-7: the container sees 8 CPUs, which
# also bounds ninja/clang), FF_ANDROID_WORKERS (8), FF_ANDROID_XMX (3g, at most 4g),
# FF_ANDROID_TIMEOUT_MIN (100), FF_ANDROID_HOOK (a host script run in the copy after `npm ci`;
# spikes only, the summary marks such a run MODIFIED), FF_SLOT_SH, FF_LAB_OUT.
#
# Exit codes: 0 APK built; 2 usage; 3 refused to start; 4 slot acquire failed; 5 image build
# failed; 6 no APK; 7 the worktree changed during the run; 8 docker could not start the
# container; 10 build failed; 11 timed out; 12 killed (out of memory); 13 redaction check
# failed (log withheld); 130 interrupted.
set -uo pipefail

winpath() { if command -v cygpath > /dev/null; then cygpath -m "$1"; else echo "$1"; fi; }
# Under Git Bash, MSYS rewrites /src, /out etc. into Windows paths for native programs. Turn
# that off for docker ONLY: exported globally it also stops `git -C /c/...` from resolving,
# which once produced an empty copy list and a vacuous git-status proof.
docker() { MSYS_NO_PATHCONV=1 command docker "$@"; }
die() { echo "android-compile: $*" >&2; exit 3; }
usage() { echo "usage: android-compile.sh <lane> <worktree> [release|debug]" >&2; exit 2; }

# Long children (the slot wait, docker run) run in the background and are waited for: bash
# defers a trapped signal until a FOREGROUND child exits, so a TERM would otherwise leave a
# running container behind for up to the build's timeout.
own_container=0
cleaned=0
acq_pid=""
run_pid=""
cleanup() {
  [ "$cleaned" -eq 1 ] && return
  cleaned=1
  if [ -n "$acq_pid" ]; then
    kill "$acq_pid" 2> /dev/null
    wait "$acq_pid" 2> /dev/null
  fi
  [ "$own_container" -eq 1 ] && docker rm -f "$NAME" > /dev/null 2>&1
  [ -n "$run_pid" ] && kill "$run_pid" 2> /dev/null
  [ -n "${HOLDER:-}" ] && bash "$SLOT_SH" release "$HOLDER" > /dev/null 2>&1
  [ -n "${LIST:-}" ] && rm -f "$LIST" "$LIST.all"
}

# GIT_OPTIONAL_LOCKS=0: a status must not take index.lock and break another session's commit.
git_status() { GIT_OPTIONAL_LOCKS=0 git -C "$wt" status --porcelain=v1 --untracked-files=all; }

write_summary() { # exit_code note  -> prints the summary; returns 1 if the worktree changed
  local rc="$1" note="$2" status_after head_after unchanged=yes
  status_after=$(git_status) || { status_after="(git status failed)"; unchanged=NO; }
  head_after=$(git -C "$wt" rev-parse HEAD 2> /dev/null) || head_after="(rev-parse failed)"
  [ "$status_before" = "$status_after" ] || unchanged=NO
  [ "$head_sha" = unknown ] || [ "$head_sha" = "$head_after" ] || unchanged=NO
  {
    echo "lane: $lane"
    echo "variant: $variant"
    echo "worktree_head: $head_sha"
    if [ -n "$status_before" ]; then
      echo "worktree_dirty: yes (status sha256 $(printf '%s' "$status_before" | sha256sum | cut -c1-16)): the build used the working tree, not HEAD"
    else
      echo "worktree_dirty: no"
    fi
    echo "image: $TAG"
    echo "exit_code: $rc"
    echo "note: $note"
    echo "wall_seconds: $(($(date +%s) - t_start))"
    echo "slot_wait_seconds: ${slot_wait:-n/a}"
    echo "files_copied: $nfiles"
    echo "limits: memory=$MEM cpuset=$CPUSET gradle_workers=$WORKERS gradle_xmx=$XMX timeout_min=$TIMEOUT_MIN"
    if [ -n "$HOOK" ]; then
      echo "MODIFIED: hook $(basename "$HOOK") sha256=$(sha256sum "$HOOK" | cut -c1-16): a spike, not a gate result for the worktree as committed"
    fi
    if [ "$head_sha" != unknown ] && [ "$head_sha" != "$head_after" ]; then
      echo "HEAD_MOVED_DURING_RUN: now $head_after"
    fi
    echo "git_status_unchanged: $unchanged (before: $(printf '%s' "$status_before" | grep -c .) lines, after: $(printf '%s' "$status_after" | grep -c .) lines)"
    if [ "$status_before" != "$status_after" ]; then
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
  mkdir -p "$OUT_ROOT" || die "cannot create $OUT_ROOT"
  # The APK carries the app's Maps/Firebase keys like any APK: it must never land in a checkout.
  git -C "$OUT_ROOT" rev-parse --show-toplevel > /dev/null 2>&1 &&
    die "FF_LAB_OUT ($OUT_ROOT) is inside a git checkout"
  OUT="$OUT_ROOT/$lane/android-$(date +%Y%m%dT%H%M%S)"
  mkdir -p "$OUT" || die "cannot create $OUT"
  SUMMARY="$OUT/summary.txt"
  t_start=$(date +%s)
  nfiles=0
  head_sha=unknown
  status_before=""

  trap cleanup EXIT
  trap 'echo "interrupted" >&2; cleanup; exit 130' INT TERM HUP

  [ -e "$wt/technician-app/android" ] &&
    die "technician-app/android/ exists in the worktree: a native project makes EAS treat the app as bare. Stop."
  # A container with our name that is still running belongs to another run of this lane.
  [ "$(docker inspect -f '{{.State.Running}}' "$NAME" 2> /dev/null)" = "true" ] &&
    die "$NAME is already running (another build for lane $lane)"

  # Our PID goes on the slots: ff-slot reaps them only once this script is gone, so a long
  # cold build never loses them.
  HOLDER="$lane-android-$$"
  local t_slot rc note f
  t_slot=$(date +%s)
  bash "$SLOT_SH" acquire "$HOLDER" 2 "$$" &
  acq_pid=$!
  if ! wait "$acq_pid"; then
    acq_pid=""
    write_summary 4 "slot acquire failed"
    exit 4
  fi
  acq_pid=""
  slot_wait=$(($(date +%s) - t_slot))

  # What gets built is captured only now, after the (possibly long) slot wait, so a checkout
  # during the wait cannot credit this result to the wrong commit; write_summary re-checks HEAD
  # and the status at the end.
  status_before=$(git_status) || die "git status failed in $wt"
  head_sha=$(git -C "$wt" rev-parse HEAD) || die "git rev-parse failed in $wt"
  [ -e "$wt/technician-app/android" ] && die "technician-app/android/ appeared in the worktree. Stop."
  # Copy list: tracked + untracked-but-not-ignored files under technician-app/ that exist.
  # Ignored files (.env, .eastoken, node_modules) never enter the container.
  LIST="$OUT/.copy-list"
  git -C "$wt" ls-files -z --cached --others --exclude-standard -- technician-app > "$LIST.all" ||
    die "git ls-files failed in $wt"
  while IFS= read -r -d '' f; do [ -f "$wt/$f" ] && printf '%s\0' "$f"; done < "$LIST.all" > "$LIST"
  nfiles=$(tr -cd '\0' < "$LIST" | wc -c)
  [ "$nfiles" -gt 0 ] || die "empty copy list for $wt/technician-app"
  tr '\0' '\n' < "$LIST" | grep -qx 'technician-app/package-lock.json' || die "package-lock.json not in the copy list"

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
  docker run --rm --name "$NAME" --label "fixflow.holder=$HOLDER" \
    --memory "$MEM" --memory-swap "$MEM" --cpuset-cpus "$CPUSET" \
    "${mounts[@]}" \
    "$TAG" \
    timeout --kill-after=30 "$(((TIMEOUT_MIN + 10) * 60))" \
    bash /lab/inner.sh "$variant" "$WORKERS" "$XMX" "$((TIMEOUT_MIN * 60))" &
  run_pid=$!
  wait "$run_pid"
  rc=$?
  run_pid=""
  own_container=0

  # Map the container's exit into this script's own codes, so a build that happens to exit
  # 3..7 can never be read as one of the refusals above (inner_exit keeps the raw value).
  note=ok
  case "$rc" in
    0)
      if [ ! -f "$OUT/app-$variant.apk" ]; then
        rc=6
        note="build exited 0 but produced no APK"
      fi
      ;;
    124) rc=11 note="timed out after $TIMEOUT_MIN min (failed_stage names where)" ;;
    137) rc=12 note="killed (SIGKILL: out of memory at $MEM, or a timeout's kill-after)" ;;
    97) rc=13 note="redaction check failed: build.log withheld" ;;
    125 | 126 | 127) note="docker run could not start the container (exit $rc): no build ran" rc=8 ;;
    *) note="build failed (container exit $rc): see failed_stage and build.log" rc=10 ;;
  esac
  if ! write_summary "$rc" "$note"; then
    echo "WORKTREE CHANGED during the build (see git_status_diff in summary.txt)" >&2
    if [ "$rc" -eq 0 ]; then
      rc=7
      sed -i "s/^exit_code: 0$/exit_code: 7/; s/^note: ok$/note: the worktree changed during the run/" "$SUMMARY"
    fi
  fi
  echo "output: $OUT"
  exit "$rc"
}

# One line: bash has read it whole before main runs, so an edit to this file mid-build
# (a checkout, a save) cannot shift what bash reads next.
main "$@"; exit $?
