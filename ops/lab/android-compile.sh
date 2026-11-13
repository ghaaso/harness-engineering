#!/usr/bin/env bash
# FixFlow local Android compile gate (ship plan §7.5 phase L2).
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
# Holds 2 slots of the machine-wide lock (ff-slot.sh) for the whole run; a trap releases them
# and removes the container on exit, error, Ctrl-C or TERM.
#
# Knobs (env): FF_ANDROID_MEM (10g), FF_ANDROID_CPUSET (0-7: the container sees 8 CPUs, which
# also bounds ninja/clang), FF_ANDROID_WORKERS (6), FF_ANDROID_XMX (4g), FF_ANDROID_TIMEOUT_MIN
# (100), FF_ANDROID_HOOK (a host script run in the copy after `npm ci` — spikes only; the
# summary marks such a run MODIFIED), FF_SLOT_SH, FF_LOCK_DIR, FF_LAB_OUT.
set -uo pipefail

usage() { echo "usage: android-compile.sh <lane> <worktree> [release|debug]" >&2; exit 2; }
lane="${1:-}"
wt="${2:-}"
variant="${3:-release}"
[ -n "$lane" ] && [ -n "$wt" ] || usage
[[ "$lane" =~ ^[a-z0-9][a-z0-9-]{0,30}$ ]] || { echo "lane must match [a-z0-9-]" >&2; exit 2; }
case "$variant" in release | debug) ;; *) usage ;; esac
[ -f "$wt/technician-app/package.json" ] || { echo "no technician-app/ in $wt" >&2; exit 2; }
wt=$(cd "$wt" && pwd)

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
SLOT_SH="${FF_SLOT_SH:-/c/Users/User/Documents/projects/EMS_workshop1/docs/program/lab/ff-slot.sh}"
LOCK_DIR="${FF_LOCK_DIR:-/c/Users/User/.fixflow-cache/locks}"
OUT_ROOT="${FF_LAB_OUT:-/c/Users/User/.fixflow-cache/lab}"
MEM="${FF_ANDROID_MEM:-10g}"
CPUSET="${FF_ANDROID_CPUSET:-0-7}"
WORKERS="${FF_ANDROID_WORKERS:-6}"
XMX="${FF_ANDROID_XMX:-4g}"
TIMEOUT_MIN="${FF_ANDROID_TIMEOUT_MIN:-100}"
HOOK="${FF_ANDROID_HOOK:-}"

TAG="fixflow-android-build:$(sha256sum "$HERE/Dockerfile.android" | cut -c1-12)"
NAME="fixflow-$lane-android"
HOLDER="$lane-android-$$"
stamp=$(date +%Y%m%dT%H%M%S)
OUT="$OUT_ROOT/$lane/android-$stamp"
mkdir -p "$OUT"
SUMMARY="$OUT/summary.txt"
export MSYS_NO_PATHCONV=1 # keep /src, /out etc. as container paths under Git Bash
winpath() { if command -v cygpath > /dev/null; then cygpath -m "$1"; else echo "$1"; fi; }

# ---- cleanup: always release the slots; remove the container only if this run started it ----
own_container=0
hb_pid=""
cleaned=0
cleanup() {
  [ "$cleaned" -eq 1 ] && return
  cleaned=1
  [ -n "$hb_pid" ] && kill "$hb_pid" 2> /dev/null
  [ "$own_container" -eq 1 ] && docker rm -f "$NAME" > /dev/null 2>&1
  bash "$SLOT_SH" release "$HOLDER" > /dev/null 2>&1
}
trap cleanup EXIT
trap 'echo "interrupted" >&2; cleanup; exit 130' INT TERM HUP

t_start=$(date +%s)
status_before=$(git -C "$wt" status --porcelain=v1 --untracked-files=all)
head_sha=$(git -C "$wt" rev-parse HEAD)

# Copy list: tracked + untracked-but-not-ignored files under technician-app/ that exist.
# Ignored files (.env, .eastoken, node_modules, android/) never enter the container.
LIST="$OUT/.copy-list"
git -C "$wt" ls-files -z --cached --others --exclude-standard -- technician-app |
  while IFS= read -r -d '' f; do [ -f "$wt/$f" ] && printf '%s\0' "$f"; done > "$LIST"
nfiles=$(tr -cd '\0' < "$LIST" | wc -c)
if tr '\0' '\n' < "$LIST" | grep -q '^technician-app/android/'; then
  echo "technician-app/android/ is present in the worktree: a native project would make EAS treat it as bare. Stop." >&2
  exit 3
fi

# A container with our name that is still running belongs to another run of this lane.
if [ "$(docker inspect -f '{{.State.Running}}' "$NAME" 2> /dev/null)" = "true" ]; then
  echo "$NAME is already running (another build for lane $lane)" >&2
  exit 3
fi

write_summary() { # exit_code note
  local rc="$1" note="$2" t_end status_after unchanged
  t_end=$(date +%s)
  status_after=$(git -C "$wt" status --porcelain=v1 --untracked-files=all)
  [ "$status_before" = "$status_after" ] && unchanged=yes || unchanged=NO
  {
    echo "lane: $lane"
    echo "variant: $variant"
    echo "worktree_head: $head_sha"
    echo "image: $TAG"
    echo "exit_code: $rc"
    echo "note: $note"
    echo "wall_seconds: $((t_end - t_start))"
    echo "slot_wait_seconds: ${slot_wait:-n/a}"
    echo "files_copied: $nfiles"
    echo "limits: memory=$MEM cpuset=$CPUSET gradle_workers=$WORKERS gradle_xmx=$XMX timeout_min=$TIMEOUT_MIN"
    if [ -n "$HOOK" ]; then
      echo "MODIFIED: hook $(basename "$HOOK") sha256=$(sha256sum "$HOOK" | cut -c1-16) — not a gate result for the worktree as committed"
    fi
    echo "git_status_lines_before: $(printf '%s' "$status_before" | grep -c .)"
    echo "git_status_lines_after: $(printf '%s' "$status_after" | grep -c .)"
    echo "git_status_unchanged: $unchanged"
    [ -f "$OUT/facts.txt" ] && cat "$OUT/facts.txt"
  } > "$SUMMARY"
  rm -f "$OUT/facts.txt"
  cat "$SUMMARY"
  [ "$unchanged" = yes ] || { echo "WORKTREE CHANGED during the build" >&2; return 1; }
}

# ---- slots --------------------------------------------------------------------------------
t_slot=$(date +%s)
bash "$SLOT_SH" acquire "$HOLDER" 2 || { write_summary 4 "slot acquire failed"; exit 4; }
slot_wait=$(($(date +%s) - t_slot))
# ff-slot reaps a slot older than FF_STALE_MIN (120) minutes; keep ours fresh while we run.
(
  while sleep 300; do
    for s in "$LOCK_DIR"/slot-*; do
      [ -f "$s/holder" ] && grep -q "^$HOLDER " "$s/holder" && touch "$s"
    done
  done
) &
hb_pid=$!

# ---- image --------------------------------------------------------------------------------
if ! docker image inspect "$TAG" > /dev/null 2>&1; then
  echo "building $TAG (no build context)"
  if ! docker build -t "$TAG" - < "$HERE/Dockerfile.android" > "$OUT/image-build.log" 2>&1; then
    write_summary 5 "image build failed: see image-build.log"
    exit 5
  fi
fi

# ---- build --------------------------------------------------------------------------------
docker rm -f "$NAME" > /dev/null 2>&1 # a stopped leftover of this lane's own container
mounts=(
  -v "$(winpath "$wt"):/src:ro"
  -v "$(winpath "$LIST"):/lab/files:ro"
  -v "$(winpath "$HERE/android-compile-inner.sh"):/lab/inner.sh:ro"
  -v "$(winpath "$OUT"):/out"
  -v fixflow-gradle-cache:/root/.gradle
  -v fixflow-npm-cache:/root/.npm
)
if [ -n "$HOOK" ]; then
  [ -f "$HOOK" ] || { write_summary 2 "hook $HOOK not found"; exit 2; }
  mounts+=(-v "$(winpath "$(cd "$(dirname "$HOOK")" && pwd)/$(basename "$HOOK")"):/lab/hook:ro")
fi
own_container=1
docker run --rm --name "$NAME" \
  --memory "$MEM" --memory-swap "$MEM" --cpuset-cpus "$CPUSET" \
  "${mounts[@]}" \
  "$TAG" \
  timeout --kill-after=60 "$((TIMEOUT_MIN * 60))" bash /lab/inner.sh "$variant" "$WORKERS" "$XMX"
rc=$?
own_container=0

note=ok
if [ "$rc" -eq 0 ] && [ ! -f "$OUT/app-$variant.apk" ]; then rc=6; note="build exited 0 but produced no APK"; fi
[ "$rc" -eq 124 ] && note="timed out after $TIMEOUT_MIN min"
[ "$rc" -eq 137 ] && note="killed (SIGKILL: out of memory at $MEM, or the timeout's kill-after)"
[ "$rc" -eq 97 ] && note="redaction check failed: build.log withheld"
[ "$rc" -ne 0 ] && [ "$note" = ok ] && note="build failed: see failed_stage and build.log"
rm -f "$LIST"
write_summary "$rc" "$note" || { [ "$rc" -eq 0 ] && rc=7; }
echo "output: $OUT"
exit "$rc"
