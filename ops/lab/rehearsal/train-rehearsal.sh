#!/usr/bin/env bash
# L4 deploy-train rehearsal (the owner's P4c) against a stand-in host. See README.md.
#
#   bash ops/lab/rehearsal/train-rehearsal.sh [--ref <ref>] [--repin] [--mutate] [--keep] [--purge]
#
# --ref     the code and runbook under rehearsal (default origin/main, fetched from GitHub read
#           only): it becomes the stand-in origin's main, so a runbook change can be rehearsed
#           from its PR branch before it merges
# --repin   check the runbook against pins made from itself (a runbook change moves blocks);
#           pins-diff-*.txt in the results lists every block whose shape changed
# --mutate  the negative run: lib/mutations.tsv's train mutations, and mutations.md says whether
#           each targeted check failed
# --keep    leave the stand-in host running at the end; --purge also drop the image cache
#
# 1. cuts release/drain the way runbook section 11 says (a31924a, then P1, the fix by its tag,
#    P3a by cherry-pick; P2b-2 is not merged yet), with the wrong turns WT7-WT11, and pushes the
#    branch and the drain-image tag to the stand-in origin inside the stand-in host;
# 2. seeds the stand-in production database at drain-image's head (the code production runs
#    until the train), deploys drain-image (1.11-1.14, 3, 4) and restores the dump into it
#    (section 6), with the host OFFLINE from the first backend start on;
# 3. deploys main over it by 12.4 / R5 (start.sh runs the migrations), runs every train row's
#    post-deploy check and P3a's first-boot check, rolls back by R5.9; then lands a stand-in row
#    that carries a migration, deploys it by R5 (the migration runs on the populated database)
#    and meets R5.9's refusal branch.
# Results: C:/Users/User/.fixflow-cache/lab/l4/<UTC stamp>-train/; evidence bundle:
# C:/Users/User/.fixflow-cache/handoff/evidence/l4/<UTC stamp>-train/.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
# Git for Windows cannot see a Git Bash path such as /tmp/...: give it the Windows form
REPO="$(git -C "$(command -v cygpath >/dev/null && cygpath -m "$HERE" || echo "$HERE")" rev-parse --show-toplevel)" || { echo "L4: not in a git checkout" >&2; exit 1; }
source "$HERE/lib/host.sh"
KEEP=0; PURGE=""; L4_REF=origin/main; L4_MUTATE=0; L4_REPIN=0
while [ $# -gt 0 ]; do
  case "$1" in
    --ref) L4_REF="${2:?--ref needs a ref}"; shift ;;
    --repin) L4_REPIN=1 ;;
    --mutate) L4_MUTATE=1 ;;
    --keep) KEEP=1 ;;
    --purge) PURGE=--purge ;;
    *) l4_die "unknown argument $1" ;;
  esac
  shift
done
RUN="$(date -u +%Y%m%dT%H%M%SZ)-train$( [ "$L4_MUTATE" = 1 ] && echo -mutate)"
finish() {
  local rc=$?
  local dst; dst="$(l4_collect "$RUN")"
  [ "$KEEP" = 1 ] || l4_host_down $PURGE
  l4_slot_release
  echo "RESULTS $dst"
  echo "EVIDENCE $(l4_evidence "$dst" "$RUN")"
  exit $rc
}
trap finish EXIT
trap 'exit 130' INT TERM

l4_slot_acquire train
l4_host_up
l4_origin "$REPO" "$L4_REF" tag:drain-pick-tz-fix   # 3810e42 (rulings C30, C32): on no main commit, kept reachable by this tag
l4_copy_kit "$HERE"
l4_mode train
l4_run_record "$REPO" "$HERE"
l4_dx bash /srv/l4/kit/inner/train.sh cut || l4_die "cut failed"
l4_dx bash /srv/l4/kit/inner/prep.sh drain-image || l4_die "prep failed"
l4_dx env PHASE=train-host bash /srv/l4/kit/inner/restore.sh online drain-image || l4_die "online part failed"
l4_dx bash /srv/l4/kit/inner/train.sh prebuild || l4_die "prebuild failed"
docker network disconnect bridge "$L4_HOST" || l4_die "could not take the stand-in host offline"
l4_dx sh -c '{ ip -4 route; ip -6 route; } | grep -c default' | grep -qx 0 || l4_die "the stand-in host still has a default route"
l4_dx bash /srv/l4/kit/inner/train.sh deploy || l4_die "deploy part failed"
l4_dx python3 /srv/l4/kit/lib/report.py /srv/l4/out "deploy-train rehearsal ($L4_REF)" > /dev/null || echo "L4: report failed" >&2
[ "$L4_MUTATE" = 1 ] && { l4_dx python3 /srv/l4/kit/lib/mutate.py report /srv/l4/out /srv/l4/kit/lib/mutations.tsv train || echo "L4: a mutation was NOT caught (mutations.md)" >&2; }
true
