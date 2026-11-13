#!/usr/bin/env bash
# L4 restore rehearsal (the owner's P3b) against a stand-in host. See README.md.
#
#   bash ops/lab/rehearsal/restore-rehearsal.sh [--ref <ref>] [--repin] [--mutate] [--keep] [--purge] [--no-wrong-turns]
#
# --ref     the code and runbook under rehearsal (default origin/main, fetched from GitHub read
#           only): it becomes the stand-in origin's main, which the stand-in host seeds from,
#           deploys and whose runbook it types, so a runbook change can be rehearsed from its PR
#           branch before it merges
# --repin   check the runbook against pins made from itself (a runbook change moves blocks);
#           pins-diff-*.txt in the results lists every block whose shape changed
# --mutate  the negative run: lib/mutations.tsv's restore mutations, and mutations.md says
#           whether each targeted check failed (wrong turns are skipped)
# --keep    leave the stand-in host running at the end (for a look inside); default: removed
# --purge   also remove the image/build cache volume fixflow-l4-host-docker
#
# Results: C:/Users/User/.fixflow-cache/lab/l4/<UTC stamp>-restore/ (results.md, rows.tsv, one log
# per runbook command under steps/); evidence bundle:
# C:/Users/User/.fixflow-cache/handoff/evidence/l4/<UTC stamp>-restore/. Exit 0 when the run
# completed (whatever the verdicts are); the verdicts are in results.md.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
# Git for Windows cannot see a Git Bash path such as /tmp/...: give it the Windows form
REPO="$(git -C "$(command -v cygpath >/dev/null && cygpath -m "$HERE" || echo "$HERE")" rev-parse --show-toplevel)" || { echo "L4: not in a git checkout" >&2; exit 1; }
source "$HERE/lib/host.sh"
L4_REF=origin/main; KEEP=0; PURGE=""; WRONG=1; L4_MUTATE=0; L4_REPIN=0
while [ $# -gt 0 ]; do
  case "$1" in
    --ref) L4_REF="${2:?--ref needs a ref}"; shift ;;
    --repin) L4_REPIN=1 ;;
    --mutate) L4_MUTATE=1; WRONG=0 ;;
    --keep) KEEP=1 ;;
    --purge) PURGE=--purge ;;
    --no-wrong-turns) WRONG=0 ;;
    *) l4_die "unknown argument $1" ;;
  esac
  shift
done
RUN="$(date -u +%Y%m%dT%H%M%SZ)-restore$( [ "$L4_MUTATE" = 1 ] && echo -mutate)"
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

l4_slot_acquire restore
l4_host_up
l4_origin "$REPO" "$L4_REF"
l4_copy_kit "$HERE"
l4_mode restore
l4_run_record "$REPO" "$HERE"
l4_dx bash /srv/l4/kit/inner/prep.sh main || l4_die "prep failed"
# the shape guard's own mutation test, against the runbook under rehearsal and the committed pins
if [ "$L4_REPIN" = 0 ]; then
  l4_dx sh -c 'python3 /srv/l4/kit/lib/selftest-runbook.py /srv/prep/docs/RUNBOOK-SELFHOST.md /srv/l4/kit/lib/runbook-pins.tsv > /srv/l4/out/selftest-runbook.txt 2>&1' \
    || echo "L4: the shape guard's self-test failed (selftest-runbook.txt)" >&2
fi
l4_dx bash /srv/l4/kit/inner/restore.sh online main || l4_die "online part failed"
# From here no backend container can reach anything but the stand-in host itself.
docker network disconnect bridge "$L4_HOST" || l4_die "could not take the stand-in host offline"
l4_dx sh -c '{ ip -4 route; ip -6 route; } | grep -c default' | grep -qx 0 || l4_die "the stand-in host still has a default route"
l4_dx bash /srv/l4/kit/inner/restore.sh offline || l4_die "offline part failed"
[ "$WRONG" = 1 ] && { l4_dx bash /srv/l4/kit/inner/wrongturns.sh || echo "L4: wrong-turn part failed" >&2; }
l4_dx python3 /srv/l4/kit/lib/report.py /srv/l4/out "restore rehearsal ($L4_REF)" > /dev/null || echo "L4: report failed" >&2
[ "$L4_MUTATE" = 1 ] && { l4_dx python3 /srv/l4/kit/lib/mutate.py report /srv/l4/out /srv/l4/kit/lib/mutations.tsv restore || echo "L4: a mutation was NOT caught (mutations.md)" >&2; }
true
