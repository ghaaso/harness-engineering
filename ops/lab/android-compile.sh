#!/usr/bin/env bash
# FixFlow local Android compile gate (ship plan §7.5 phase L2). See ops/lab/README.md.
#
#   bash ops/lab/android-compile.sh <lane> <worktree> [release|debug]
#
# Copies <worktree>/technician-app into a container (the worktree is mounted READ-ONLY), runs
# `npm ci`, `npx expo prebuild --platform android` and the Gradle assemble task THERE, and
# writes COMPILE-ONLY-debugkey-<variant>.apk, the redacted build log and summary.txt to
#   ${FF_LAB_OUT:-C:/Users/User/.fixflow-cache/lab}/<lane>/android-<stamp>/
# Exits non-zero on any failure. The APK is compile evidence only: it is signed with the
# prebuild template's public debug key, bakes only the emulator-loopback fallback API base
# (http://10.0.2.2:8000, technician-app/src/lib/config.ts), and is NEVER installed on any phone
# (plan standing rule 1). Only EAS builds reach phones.
#
# Holds 2 slots of the machine-wide lock (ff-slot.sh, with this script's PID on them) for the
# whole run; a trap releases them and removes the container on exit, error, Ctrl-C, TERM or HUP.
# SIGKILL (a task stop, taskkill /F) cannot be trapped: the lock then reaps the slots once the
# PID is gone and the container (labelled fixflow.holder=<holder>) runs on, so the NEXT run, once
# it holds every slot, removes any Android build container still running before starting its own
# (never one whose holder label ends in a PID that is still alive).
#
# Knobs (env): FF_ANDROID_MEM (6g), FF_ANDROID_CPUSET (0-7: the container sees 8 CPUs, which
# also bounds ninja/clang), FF_ANDROID_WORKERS (8), FF_ANDROID_XMX (3g, at most 4g),
# FF_ANDROID_TIMEOUT_MIN (100), FF_ANDROID_HOOK (a host script run in the copy after `npm ci`;
# spikes only, the summary marks such a run MODIFIED), FF_ANDROID_GRADLE_VOL / FF_ANDROID_NPM_VOL
# (cache volume names, default fixflow-gradle-cache / fixflow-npm-cache; fresh names give a
# cold build without wiping the shared caches), FF_SLOT_SH, FF_LAB_OUT.
#
# Exit codes: 0 APK built; 2 usage; 3 refused to start (Docker down, Xmx above 4g, a secret file
# in the copy list, ...); 4 slot acquire failed; 5 image build
# failed; 6 no APK; 7 the worktree changed during the run; 8 docker could not start the
# container; 10 build failed; 11 timed out; 12 killed (out of memory); 13 redaction check
# failed (log withheld); 130 interrupted.
set -uo pipefail

winpath() { if command -v cygpath > /dev/null; then cygpath -m "$1"; else echo "$1"; fi; }
# Under Git Bash, MSYS rewrites /src, /out etc. into Windows paths for native programs. Turn
# that off for docker ONLY: exported globally it also stops `git -C /c/...` from resolving,
# which once produced an empty copy list and a vacuous git-status proof.
docker() { MSYS_NO_PATHCONV=1 command docker "$@"; }
die() { # refuse: exit 3, leaving a summary once the output folder exists (never an empty folder)
  echo "android-compile: $*" >&2
  if [ -n "${SUMMARY:-}" ] && [ ! -f "$SUMMARY" ]; then write_summary 3 "refused: $*" > /dev/null 2>&1; fi
  exit 3
}
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
  [ -n "${HOLDER:-}" ] && FF_POOL=heavy bash "$SLOT_SH" release "$HOLDER" > /dev/null 2>&1
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
    echo "slot_acquire_requeues: ${acq_requeues:-0}"
    echo "orphans_removed:${stale_removed:- none}"
    echo "live_holders_left_running:${live_spared:- none}"
    echo "files_copied: $nfiles"
    echo "caches: $GRADLE_VOL $NPM_VOL"
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

# Copy list: tracked + untracked-but-not-ignored files under technician-app/ that exist.
# Ignored files (.env, .eastoken, node_modules) never enter the container.
build_copy_list() {
  local f bad
  git -C "$wt" ls-files -z --cached --others --exclude-standard -- technician-app > "$LIST.all" ||
    die "git ls-files failed in $wt"
  while IFS= read -r -d '' f; do [ -f "$wt/$f" ] && printf '%s\0' "$f"; done < "$LIST.all" > "$LIST"
  nfiles=$(tr -cd '\0' < "$LIST" | wc -c)
  [ "$nfiles" -gt 0 ] || die "empty copy list for $wt/technician-app"
  tr '\0' '\n' < "$LIST" | grep -qx 'technician-app/package-lock.json' || die "package-lock.json not in the copy list"
  # Secret-bearing files that are NOT gitignored would be copied in: an .env.production is
  # loaded by Expo into the release bundle (a real API URL / DSN, never redacted), and a
  # keystore or credentials.json has no business in a compile. Refuse, naming the files only.
  # Case-insensitive: Windows filesystems are, so Credentials.json or b.JKS is the same risk.
  bad=$(tr '\0' '\n' < "$LIST" | grep -iE '(^|/)(\.env[^/]*|credentials\.json|[^/]*\.keystore|[^/]*\.jks)$' |
    grep -viE '(^|/)\.env\.example$' || true)
  [ -z "$bad" ] || die "refusing to copy secret-bearing files into the build: $(echo $bad) (move them out or gitignore them)"
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
  GRADLE_VOL="${FF_ANDROID_GRADLE_VOL:-fixflow-gradle-cache}"
  NPM_VOL="${FF_ANDROID_NPM_VOL:-fixflow-npm-cache}"
  [[ "$GRADLE_VOL" =~ ^fixflow-[a-z0-9-]+$ && "$NPM_VOL" =~ ^fixflow-[a-z0-9-]+$ ]] ||
    die "cache volume names must match fixflow-[a-z0-9-]+"
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
  trap 'echo "interrupted" >&2; cleanup; [ -f "$SUMMARY" ] || write_summary 130 "interrupted" > /dev/null; exit 130' INT TERM HUP

  # Docker first: a stopped engine must fail now, not after queueing for every slot.
  docker info > /dev/null 2>&1 || die "the Docker engine is not reachable (docker info failed)"
  # The Gradle heap must leave room in the container for Kotlin, Metro/Hermes and the NDK.
  [[ "$XMX" =~ ^([0-9]+)([mMgG])$ ]] || die "FF_ANDROID_XMX must look like 3g or 3072m"
  local xmx_mib="${BASH_REMATCH[1]}"
  [[ "${BASH_REMATCH[2]}" =~ [gG] ]] && xmx_mib=$((xmx_mib * 1024))
  [ "$xmx_mib" -le 4096 ] || die "FF_ANDROID_XMX ($XMX) is above the 4g ceiling"

  [ -e "$wt/technician-app/android" ] &&
    die "technician-app/android/ exists in the worktree: a native project makes EAS treat the app as bare. Stop."
  # The copy list and its refusals run before queueing too, so a refused run never waits for
  # every slot first; it is built again once the slots are held.
  LIST="$OUT/.copy-list"
  build_copy_list

  # No "is our container already running?" refusal here: a live run of this lane holds the
  # slots, so the wait below serialises us behind it; anything still running once we hold
  # the slots is an orphan, removed below.

  # Our PID goes on the slots: ff-slot reaps them only once this script is gone, so a long
  # cold build never loses them.
  HOLDER="$lane-android-$$"
  local t_slot rc note f
  t_slot=$(date +%s)
  # A waiting acquire has been ended from outside this script (2026-11-13: a coordinator
  # SIGTERM; an MSYS fork failure, exit 254). If it exits above 128 while this script lives, requeue (at
  # the back of the line) up to 5 times and record it; a signal to THIS script still ends
  # the run through the trap.
  acq_requeues=0
  while :; do
    # The pool is named, never inherited: a caller's FF_POOL=light would otherwise put a 6 GB
    # build in the light pool, beside every heavy holder.
    FF_POOL=heavy bash "$SLOT_SH" acquire "$HOLDER" 2 "$$" &
    acq_pid=$!
    wait "$acq_pid"
    rc=$?
    acq_pid=""
    [ "$rc" -gt 128 ] && [ "$acq_requeues" -lt 5 ] || break
    acq_requeues=$((acq_requeues + 1))
    echo "slot acquire ended with exit $rc (killed, or bash could not fork); requeue $acq_requeues/5" >&2
  done
  if [ "$rc" -ne 0 ]; then
    write_summary 4 "slot acquire failed (ff-slot.sh exit $rc$([ "$rc" -gt 128 ] && echo ": killed by signal $((rc - 128))"))"
    exit 4
  fi
  slot_wait=$(($(date +%s) - t_slot))

  # This run now holds every slot, so no other Android build can legitimately be running. One
  # that is was left by a hard-killed run (its slots were reaped, its container was not):
  # remove it before adding another 6 GB to the VM. Matched by name AND by our label or our
  # image, so nothing outside this gate is touched. A container whose holder label ends in a
  # PID that is still alive is never removed, whatever the lock says: that run may simply not
  # be visible to this lock (another pool or lock dir, a reaped slot) and is still building.
  local cid cname clabel cimage hpid
  stale_removed=""
  live_spared=""
  while read -r cid cname clabel cimage; do
    [ -n "$cid" ] || continue
    [[ "$cname" =~ ^fixflow-[a-z0-9-]+-android$ ]] || continue
    [ "$clabel" != "-" ] || [[ "$cimage" == fixflow-android-build:* ]] || continue
    hpid="${clabel##*-}"
    if [[ "$hpid" =~ ^[0-9]+$ ]] && kill -0 "$hpid" 2> /dev/null; then
      live_spared="$live_spared $cname(holder=$clabel)"
      echo "left running: $cname belongs to a live holder ($clabel)" >&2
      continue
    fi
    docker rm -f "$cid" > /dev/null 2>&1 && stale_removed="$stale_removed $cname(holder=$clabel)"
    echo "removed an orphaned Android build container: $cname (holder $clabel)" >&2
  done < <(docker ps --format '{{.ID}} {{.Names}} {{if .Labels}}{{.Label "fixflow.holder"}}{{end}} {{.Image}}' |
    awk '{ if (NF == 3) print $1, $2, "-", $3; else print }')

  # What gets built is captured only now, after the (possibly long) slot wait, so a checkout
  # during the wait cannot credit this result to the wrong commit; write_summary re-checks HEAD
  # and the status at the end.
  status_before=$(git_status) || die "git status failed in $wt"
  head_sha=$(git -C "$wt" rev-parse HEAD) || die "git rev-parse failed in $wt"
  [ -e "$wt/technician-app/android" ] && die "technician-app/android/ appeared in the worktree. Stop."
  # Rebuilt now: the worktree may have changed during the wait, and this is the list copied.
  build_copy_list

  if ! docker image inspect "$TAG" > /dev/null 2>&1; then
    echo "building $TAG (no build context)"
    if ! docker build -t "$TAG" - < "$HERE/Dockerfile.android" > "$OUT/image-build.log" 2>&1; then
      write_summary 5 "image build failed: see image-build.log"
      exit 5
    fi
  fi

  # This lane's own name still running here can only be a live holder's (the loop above
  # removed every dead one): refuse rather than force-remove it.
  [ -z "$(docker ps -q --filter "name=^${NAME}\$")" ] ||
    die "$NAME is running for a live holder:${live_spared:- (unlabelled)}; not removing it"
  docker rm -f "$NAME" > /dev/null 2>&1 # a stopped leftover of this lane's own container
  local mounts=(
    -v "$(winpath "$wt"):/src:ro"
    -v "$(winpath "$LIST"):/lab/files:ro"
    -v "$(winpath "$HERE/android-compile-inner.sh"):/lab/inner.sh:ro"
    -v "$(winpath "$OUT"):/out"
    -v "$GRADLE_VOL:/root/.gradle"
    -v "$NPM_VOL:/root/.npm"
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
  # A Gradle child killed by the kernel's OOM killer makes the build exit 1, not 137: the
  # cgroup's own oom_kill counter is the reliable signal.
  if [ "$rc" -ne 0 ] && [ "$rc" -ne 137 ] && grep -qE '^container_oom_kills: [1-9]' "$OUT/facts.txt" 2> /dev/null; then
    rc=137
  fi
  note=ok
  case "$rc" in
    0)
      if [ ! -f "$OUT/COMPILE-ONLY-debugkey-$variant.apk" ]; then
        rc=6
        note="build exited 0 but produced no APK"
      fi
      ;;
    124) rc=11 note="timed out after $TIMEOUT_MIN min (failed_stage names where)" ;;
    137) rc=12 note="killed: out of memory at $MEM (see container_oom_kills), or a timeout's kill-after" ;;
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
