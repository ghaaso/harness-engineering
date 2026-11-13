#!/usr/bin/env bash
# L4 deploy-train rehearsal (the owner's P4c) against a stand-in host. See README.md.
#
#   bash ops/lab/rehearsal/train-rehearsal.sh [--keep] [--purge]
#
# 1. cuts release/drain the way runbook section 11 and plan 7.7 say (a31924a, then the merged
#    squash commits of P1 and P3a by cherry-pick; P2b-2 is not merged yet) and pushes the branch
#    and the drain-image tag to the stand-in origin inside the stand-in host;
# 2. deploys drain-image on the stand-in host (1.11-1.13, 3, 4) and restores the stand-in
#    production dump into it (section 6), with the host OFFLINE from the first backend start on;
# 3. deploys main over it by 12.4 / R5 (start.sh runs the migrations), runs every deploy-train
#    row's post-deploy check (W0-results: P6a, P7a) and P3a's first-boot check, then the
#    runbook's rollback R5.9 back to the drain-image commit.
# Results: C:/Users/User/.fixflow-cache/lab/l4/<UTC stamp>-train/ (results.md, train.tsv, logs).
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
# Git for Windows cannot see a Git Bash path such as /tmp/...: give it the Windows form
REPO="$(git -C "$(command -v cygpath >/dev/null && cygpath -m "$HERE" || echo "$HERE")" rev-parse --show-toplevel)" || { echo "L4: not in a git checkout" >&2; exit 1; }
source "$HERE/lib/host.sh"
KEEP=0; PURGE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --keep) KEEP=1 ;;
    --purge) PURGE=--purge ;;
    *) l4_die "unknown argument $1" ;;
  esac
  shift
done
RUN="$(date -u +%Y%m%dT%H%M%SZ)-train"
finish() {
  local rc=$?
  local dst; dst="$(l4_collect "$RUN")"
  [ "$KEEP" = 1 ] || l4_host_down $PURGE
  l4_slot_release
  echo "RESULTS $dst"
  exit $rc
}
trap finish EXIT
trap 'exit 130' INT TERM

l4_slot_acquire train
l4_host_up
l4_origin "$REPO" tag:drain-pick-tz-fix   # 3810e42 (rulings C30, C32): on no main commit, kept reachable by this tag
l4_copy_kit "$HERE"
l4_dx bash /srv/l4/kit/inner/prep.sh main || l4_die "prep failed"
l4_dx bash /srv/l4/kit/inner/train.sh cut || l4_die "cut failed"
l4_dx env PHASE=train-host bash /srv/l4/kit/inner/restore.sh online drain-image || l4_die "online part failed"
l4_dx bash /srv/l4/kit/inner/train.sh prebuild || l4_die "prebuild failed"
docker network disconnect bridge "$L4_HOST" || l4_die "could not take the stand-in host offline"
l4_dx sh -c '{ ip -4 route; ip -6 route; } | grep -c default' | grep -qx 0 || l4_die "the stand-in host still has a default route"
l4_dx bash /srv/l4/kit/inner/train.sh deploy || l4_die "deploy part failed"
l4_dx python3 /srv/l4/kit/lib/report.py /srv/l4/out "deploy-train rehearsal" > /dev/null || echo "L4: report failed" >&2
