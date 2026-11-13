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
    RB_FILE=/srv/prep/docs/RUNBOOK-SELFHOST.md   # /opt/fixflow does not exist before 1.11
    sec1 /srv/origin.git "$REF"
    RB_FILE=/opt/fixflow/docs/RUNBOOK-SELFHOST.md
    sec3
    sec4
    ;;
  offline)
    sec4_profiles
    # the stand-in dead-man listener and the stand-in bucket (lab setup, not runbook steps)
    nohup python3 /srv/l4/kit/lib/deadman.py "$OUT/deadman.log" >/dev/null 2>&1 &
    : > "$OUT/deadman.log"
    ffc --profile l4s3 up -d l4-s3 > "$OUT/s3-up.log" 2>&1
    sleep 3
    ffc --profile db --profile app run --rm --no-deps -T --entrypoint python backend -c \
      "from app.core.storage import get_storage; s=get_storage(); s._client.create_bucket(Bucket=s._bucket); print('bucket', s._bucket)" \
      >> "$OUT/s3-up.log" 2>&1 || { echo "stand-in bucket could not be created"; cat "$OUT/s3-up.log"; exit 1; }

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
