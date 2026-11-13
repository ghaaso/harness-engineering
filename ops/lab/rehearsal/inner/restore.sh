#!/usr/bin/env bash
# The restore rehearsal (the owner's P3b), inside the stand-in host, as root.
#   restore.sh online  <ref>   sections 1.11-1.13, 3 and 4 (4.3 pulls and builds: needs the network)
#   restore.sh offline         (the host has been cut off the network) sections 6, 7, 9.1, a second
#                              restore over the live database (the B5-form dump: 6.6 b takes the
#                              pre-restore copy), section 8, 9.2, and 4.5 again
set -u
export OUT=/srv/l4/out
export PHASE="${PHASE:-restore}"
source /srv/l4/kit/lib/harness.sh
source /srv/l4/kit/lib/steps.sh
source /srv/l4/kit/lib/steps-789.sh
export FF_EXTRA_COMPOSE=/srv/l4/kit/lib/lab-override.yml
source /srv/l4/dumps/names.env

case "${1:?online|offline}" in
  online)
    REF="${2:-main}"
    echo "lab: ffc runs with FF_EXTRA_COMPOSE=lib/lab-override.yml (stand-in bucket + its CA; no port)" >> "$OUT/deviations.log"
    echo "lab: cron is cronie on the (Alpine) stand-in host; it reads /etc/cron.d with the user field, as Debian's cron does" >> "$OUT/deviations.log"
    echo "lab: a runbook line carrying a \${NAME:?} guard runs in a subshell (lib/guardwrap.py): the rig's non-interactive bash would exit on it, where the owner's interactive shell drops the rest of that line; what the line assigns is carried back" >> "$OUT/deviations.log"
    # /opt/fixflow does not exist before 1.11. The train reads main's runbook throughout (its own
    # clone, /srv/rbsrc); a restore reads main's from the seed's clone, then the copy it checked out.
    if [ "${PHASE:-}" = train-host ]; then RB_FILE=/srv/rbsrc/docs/RUNBOOK-SELFHOST.md; else RB_FILE=/srv/prep/docs/RUNBOOK-SELFHOST.md; fi
    sec1 /srv/origin.git "$REF"
    [ "${PHASE:-}" = train-host ] || RB_FILE=/opt/fixflow/docs/RUNBOOK-SELFHOST.md
    sec3
    sec4
    ;;
  offline)
    sec4_profiles
    lab_up || exit 1

    PHASE=restore-1
    sec6 "(nightly form, empty volume)" "$NIGHTLY" a
    sec6_tail
    sec4_5 "4.5 (stack up)"
    sec7
    sec9_1
    PHASE=restore-2
    sec6 "(B5 form, over the live database)" "$B5" a
    echo "$PRE_KEY" > "$OUT/pre-restore-key.txt"; echo "${PRE_FILE:-}" > "$OUT/pre-restore-file.txt"
    PHASE=drain-window
    sec8
    sec9_2
    sec4_5 "4.5 (end)"
    ;;
esac
