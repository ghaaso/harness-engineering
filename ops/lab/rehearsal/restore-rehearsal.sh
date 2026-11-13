#!/usr/bin/env bash
# L4 restore rehearsal (the owner's P3b) against a stand-in host. See README.md.
#
#   bash ops/lab/rehearsal/restore-rehearsal.sh [--ref <git ref>] [--keep] [--purge] [--no-wrong-turns]
#
# --ref    what the stand-in host deploys (default main; the owner's P3b deploys drain-image,
#          which train-rehearsal.sh cuts and deploys)
# --keep   leave the stand-in host running at the end (for a look inside); default: removed
# --purge  also remove the image/build cache volume fixflow-l4-host-docker
#
# Results: C:/Users/User/.fixflow-cache/lab/l4/<UTC stamp>-restore/ (results.md, rows.tsv, one log
# per runbook command under steps/). Exit 0 when the run completed (whatever the verdicts are);
# the verdicts are in results.md.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(git -C "$HERE" rev-parse --show-toplevel)"
source "$HERE/lib/host.sh"
REF=main; KEEP=0; PURGE=""; WRONG=1
while [ $# -gt 0 ]; do
  case "$1" in
    --ref) REF="$2"; shift ;;
    --keep) KEEP=1 ;;
    --purge) PURGE=--purge ;;
    --no-wrong-turns) WRONG=0 ;;
    *) l4_die "unknown argument $1" ;;
  esac
  shift
done
RUN="$(date -u +%Y%m%dT%H%M%SZ)-restore"
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

l4_slot_acquire restore
l4_host_up
l4_origin "$REPO"
l4_copy_kit "$HERE"
l4_dx bash /srv/l4/kit/inner/prep.sh main || l4_die "prep failed"
l4_dx bash /srv/l4/kit/inner/restore.sh online "$REF" || l4_die "online part failed"
# From here no backend container can reach anything but the stand-in host itself.
docker network disconnect bridge "$L4_HOST" || l4_die "could not take the stand-in host offline"
l4_dx sh -c '{ ip -4 route; ip -6 route; } | grep -c default' | grep -qx 0 || l4_die "the stand-in host still has a default route"
l4_dx bash /srv/l4/kit/inner/restore.sh offline || l4_die "offline part failed"
[ "$WRONG" = 1 ] && { l4_dx bash /srv/l4/kit/inner/wrongturns.sh || echo "L4: wrong-turn part failed" >&2; }
l4_dx python3 /srv/l4/kit/lib/report.py /srv/l4/out "restore rehearsal ($REF)" > /dev/null || echo "L4: report failed" >&2
