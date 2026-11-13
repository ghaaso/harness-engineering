#!/usr/bin/env bash
# The deploy-train rehearsal (the owner's P4c), inside the stand-in host, as root.
#   train.sh cut       runbook section 11 on a development clone: release/drain = a31924a + the
#                      squash commits by cherry-pick, tag drain-image, push to the stand-in origin
#   train.sh prebuild  (online) build main's backend and web images once, so R5.5's build later
#                      is the same build from cache while the host is offline
#   train.sh deploy    (offline) restore onto drain-image (section 6), then R5 to main (12.4),
#                      each train row's post-deploy check (12.5), the web row (12.6), and the
#                      rollback R5.9 back to drain-image
set -u
export OUT=/srv/l4/out
source /srv/l4/kit/lib/harness.sh
source /srv/l4/kit/lib/steps.sh
source /srv/l4/kit/lib/steps-789.sh
export FF_EXTRA_COMPOSE=/srv/l4/kit/lib/lab-override.yml
source /srv/l4/dumps/names.env
P1=87bbe88; P3A=90ea88d
TR="$OUT/train.tsv"
[ -f "$TR" ] || printf 'row\tcheck\tresult\tevidence\n' > "$TR"
trow() { printf '%s\t%s\t%s\t%s\n' "$1" "$(clean "$2" 300)" "$3" "$(clean "$4" 900)" >> "$TR"; echo "TRAIN $1: $3"; }

case "${1:?cut|prebuild|deploy}" in
cut)
  PHASE=release-drain
  git config --global user.name "L4 rehearsal"; git config --global user.email "l4@example.invalid"
  rm -rf /srv/dev && git clone -q /srv/origin.git /srv/dev && cd /srv/dev || exit 1
  # the runbook of main: a31924a (checked out at 11.2) predates the file
  RB_FILE=/srv/prep/docs/RUNBOOK-SELFHOST.md
  echo "lab: section 11 with P2b-2 absent (not merged): '87bbe88 <p2b2> <p3a>' becomes '87bbe88 $P3A'" >> "$OUT/deviations.log"
  rb_run 11.1 "$(rb_fence 11.1 1)" "87bbe88 <p2b2> <p3a>=$P1 $P3A"
  row 11.1 "$( [ "$(out_of | grep -c 'on main')" = 2 ] && [ "$(out_of | grep -c 'parents: 1')" = 2 ] && out_of | grep -qx commit && echo DONE || echo FAILED)" \
    "preconditions" "$(out_of | tr '\n' ';')" "two commits checked, not three: P2b-2 is not merged"
  rb_run 11.2 "$(rb_span 11.2 'git switch -c')"
  row 11.2 "$( [ "$(git rev-parse --short HEAD)" = a31924a ] && echo DONE || echo FAILED)" "git switch -c release/drain a31924a" "HEAD $(git rev-parse --short HEAD)"
  rb_run 11.3 "$(rb_span 11.3 'cherry-pick -x')"
  row 11.3 "$( [ "$RC" = 0 ] && ! has CONFLICT && echo DONE || echo FAILED)" "git cherry-pick -x $P1" "exit $RC; $(out_of | head -n 1)"
  row 11.4 NRH "git cherry-pick -x <p2b2>" "-" "P2b-2 is not merged (lane still working); the drain image is not complete until it is"
  rb_run 11.5 "$(rb_span 11.5 'cherry-pick -x')" "<p3a>=$P3A"
  row 11.5 "$( [ "$RC" = 0 ] && ! has CONFLICT && echo DONE || echo FAILED)" "git cherry-pick -x $P3A" "exit $RC; $(out_of | head -n 1)"
  rb_run 11.6 "$(rb_fence 11.6 1)"
  row 11.6 "$( [ "$(out_of | grep -c '(#')" = 2 ] && [ "$(out_of | tail -n 1)" = 2 ] && echo DONE || echo FAILED)" "git log a31924a..release/drain" \
    "$(out_of | tr '\n' ';')" "the Check expects three lines and 3; with P2b-2 absent two and 2 are the right answer"
  rb_run 11.7 "$(rb_fence 11.7 1)" "87bbe88 <p2b2> <p3a>=$P1 $P3A"
  row 11.7 "$( [ "$(out_of | grep -c '^[<>]')" = 0 ] && echo DONE || echo FAILED)" "diff --name-only vs the PRs' files" "$(out_of | head -n 3 | tr '\n' ';')"
  row 11.8 NRH "backend gates on release/drain (ff-gates.sh) and CI on push" "-" \
    "CI runs only on a push to the real remote (forbidden here); the local gate stack is the coordinator's and takes a light slot of its own; both belong to the cut that tags the real drain-image"
  rb_run 11.9 "$(rb_fence 11.9 1)" "<p2b2>, =" "<p3a>=$P3A" "<summary path>=not run here (11.8)" "<date UTC>=$(date -u +%F)"
  local_ok=no
  [ "$(git cat-file -t drain-image)" = tag ] && [ "$(git rev-parse 'drain-image^{commit}')" = "$(git rev-parse release/drain)" ] && local_ok=yes
  row 11.9 "$( [ $local_ok = yes ] && echo DONE || echo FAILED)" "git tag -a drain-image" "type $(git cat-file -t drain-image); $(git tag -n1 drain-image | cut -c1-120)" \
    "the message's '<p2b2>, ' was dropped (P2b-2 absent)"
  rb_run 11.10 "$(rb_span 11.10 'git push origin')"
  rb_run 11.10-check "$(rb_span 11.10 'git ls-remote')"
  row 11.10 "$( [ "$(out_of | grep -c 'refs/')" -ge 3 ] && echo DONE || echo FAILED)" "git push origin release/drain drain-image (the stand-in origin)" "$(out_of | awk '{print substr($1,1,9), $2}' | tr '\n' ';')"
  row 11.11 N/A "record the cut in W0-results" "-" "the coordinator's record; this rehearsal's results file holds the log"
  ;;

prebuild)
  rm -rf /srv/prebuild && git clone -q /srv/origin.git /srv/prebuild
  MAIN="$(git -C /srv/prebuild rev-parse HEAD)"
  FF_ROOT=/srv/prebuild ffc --profile db --profile app --profile web build backend web > "$OUT/prebuild-main.log" 2>&1 \
    && echo "prebuild: fixflow/backend and fixflow/web at $MAIN" || { echo "prebuild failed"; tail "$OUT/prebuild-main.log"; exit 1; }
  ;;

deploy)
  # The owner reads the runbook of main (the one being deployed), not the copy in the checkout
  # that R5.4 is about to replace; /srv/prep is the clone of main that prep.sh made.
  RB_FILE=/srv/prep/docs/RUNBOOK-SELFHOST.md
  sec4_profiles
  lab_up || exit 1
  PHASE=train-restore
  sec6 "(drain-image, nightly form)" "$NIGHTLY" a
  sec6_tail
  # stand-in accounts for the rows' checks (harness setup): known stand-in PINs for m1, t1, t2
  for t in m1 t1 t2; do
    p="$(python3 -c 'import secrets; print("".join(str(secrets.randbelow(10)) for _ in range(6)))')"; secret "$p"
    printf '%s\n' "$p" | ffc exec -T backend python -m scripts.set_pin --tech $t --pin-stdin --apply > /dev/null 2>&1
    eval "export L4_PIN_$(echo $t | tr a-z A-Z)=$p"
  done
  echo "lab: stand-in PINs set for m1, t1, t2 by set_pin --pin-stdin (values in no file)" >> "$OUT/deviations.log"

  PHASE=train
  rb_run 11.14 "$(rb_fence 11.14 1)"
  row 11.14 "$(v sh -c "[ \"\$(sed -n '/^### output:/,/^### exit/p' '$LOG' | sed '1d;\$d')\" = drain-image ]")" "describe --tags --exact-match HEAD" "$(out_of)"

  rb_run 12.4-do "$(rb_fence 12.4 1)"
  TARGET="$(out_of | grep -E '^[0-9a-f]{40}$' | tail -n 1)"
  row 12.4a "$( [ -n "$TARGET" ] && echo DONE || echo FAILED)" "fetch origin --tags; rev-parse origin/main" "TARGET=$TARGET"
  rb_run R5.1 "$(rb_span R5.1 'status --porcelain')"
  row R5.1 "$( [ -z "$(out_of)" ] && echo DONE || echo FAILED)" "status --porcelain" "[$(out_of | tr '\n' ' ')]"
  rb_run R5.2 "$(rb_fence R5.2 1)" "<target>=$TARGET"
  rb_run R5.2-check "$(rb_span R5.2 'branch -r --contains')" "<sha>=$TARGET"
  row R5.2 "$(v has origin/main)" "fetch; rev-parse '<target>^{commit}' (after T_close: a main sha)" "$(out_of | tr '\n' ' ')" \
    "T_close is assumed recorded (the train runs after it); before T_close the target could only be a drain-image tag"
  rb_run R5.3 "$(rb_fence R5.3 1)"
  PREV="$(out_of | grep -E '^[0-9a-f]{40}$' | head -n 1)"; PREV_IMG="$(out_of | grep -E '^sha256:' | head -n 1)"
  DBHEAD="$(out_of | grep -xE '[0-9]{4}' | head -n 1)"
  row R5.3 "$( [ -n "$PREV" ] && [ -n "$PREV_IMG" ] && [ -n "$DBHEAD" ] && has '"sha256"' && echo DONE || echo FAILED)" \
    "PREV sha, PREV image, DB head, manual backup" "PREV=$PREV image=$(echo "$PREV_IMG" | cut -c1-19) head=$DBHEAD; $(out_of | grep '^{' | cut -c1-100)"
  rb_run R5.4 "$(rb_span R5.4 'checkout --detach')" "<TARGET>=$TARGET"
  row R5.4 "$( [ "$(git -C /opt/fixflow rev-parse HEAD)" = "$TARGET" ] && echo DONE || echo FAILED)" "checkout --detach TARGET" "HEAD $(git -C /opt/fixflow rev-parse --short HEAD)"
  # P6a's row: a leftover value of a retired key must be ignored on boot
  printf 'FIXFLOW_ATTENDANCE_LOCATION_ACCURACY_CEILING_M=50\nFIXFLOW_JOBS_PUNCH_ACCURACY_CEILING_M=50\n' >> /etc/fixflow/backend.env
  echo "edited /etc/fixflow/backend.env: added the two keys P6a retired (leftover values)" >> "$OUT/editor.log"
  rb_run R5.5 "$(rb_span R5.5 'build backend web')"
  local_b="$RC"
  rb_run R5.5-check "$(rb_span R5.5 'docker images')"
  row R5.5 "$( [ "$local_b" = 0 ] && [ -n "$(out_of)" ] && echo DONE || echo FAILED)" "ffc \$P_RUN build backend web" "exit $local_b; $(out_of | head -n 1)" \
    "built from cache: the same build ran online in the prebuild step"
  rb_run R5.6 "$(rb_span R5.6 'up -d')"
  wait_backend_healthy 150; hb=$?
  rb_run R5.6-logs "$(rb_span R5.6 'logs --tail 60 backend')"
  row R5.6 "$( [ $hb = 0 ] && has 'alembic' && has 'Application startup complete' && echo DONE || echo FAILED)" "ffc \$P_RUN up -d (start.sh migrates, then serves)" \
    "healthy=$([ $hb = 0 ] && echo yes || echo no); alembic lines $(grep -ci alembic "$LOG"); startup complete $(grep -c 'Application startup complete' "$LOG")"
  rb_run R5.7 "$(rb_fence R5.7 1)"
  row R5.7 "$( has "git_sha= $TARGET" && has "'status': 'ok'" && echo DONE || echo FAILED)" "deep health git_sha and database" "$(out_of | tr '\n' ' ' | cut -c1-200)" \
    "the curl through api.<domain> half is NRH (no tunnel)"
  rb_run R5.8 "$(rb_span R5.8 "docker inspect --format '{{.Image}}'")"
  NEW_IMG="$(out_of)"
  row R5.8 "$( echo "$NEW_IMG" | grep -q '^sha256:' && echo DONE || echo FAILED)" "record the image id" "image $(echo "$NEW_IMG" | cut -c1-19); was $(echo "$PREV_IMG" | cut -c1-19)"
  rb_run 12.4-check "$(rb_fence 12.4 2)"
  row 12.4 "$( [ "$(out_of)" = 0046 ] && echo DONE || echo FAILED)" "select version_num from alembic_version" "$(out_of) (no train row carries a migration; CLAUDE.md at main says 0046)"

  # ---- 12.5: each row's post-deploy check, in table order
  BIP="$(docker inspect -f '{{(index .NetworkSettings.Networks "fixflow_app").IPAddress}}' "$(ffc $P_RUN ps -q backend)")"
  BASE="http://$BIP:8000"
  setup="$(python3 /srv/l4/kit/lib/traincheck.py "$BASE" p6a-setup 2>&1)"
  r6="$(python3 /srv/l4/kit/lib/traincheck.py "$BASE" p6a 2>&1)"
  tmpl="$(grep -cE 'FIXFLOW_(ATTENDANCE_LOCATION|JOBS_PUNCH)_ACCURACY_CEILING_M' /opt/fixflow/ops/selfhost/env/backend.env.example)"
  res6="$(echo "$r6" | python3 -c 'import json,sys; print(json.load(sys.stdin)["result"])' 2>/dev/null || echo FAIL)"
  [ "$hb" = 0 ] && [ "$tmpl" = 0 ] || res6=FAIL
  trow P6a "sampler_state, last_ping_at, pings_today on the board; clocked in without a recent ping is stale/silent; day view effective time; shift before midnight on duty; two retired keys ignored and absent from the template" \
    "$res6" "fixture: $(echo "$setup" | cut -c1-300) | check: $r6 | backend booted healthy with both retired keys set: $([ $hb = 0 ] && echo yes || echo no); template lines naming them: $tmpl"
  J_OTHER="$(psql_app -c "select id from job where assigned_tech_id='t2' and status in ('open','waiting','ready') order by token limit 1")"
  J_CLOSED="$(psql_app -c "select id from job where status='closed' order by token limit 1")"
  J_UNCL="$(psql_app -c "select id from job where assigned_tech_id is null and status='open' order by token limit 1")"
  r7="$(python3 /srv/l4/kit/lib/traincheck.py "$BASE" p7a "{\"other\": \"$J_OTHER\", \"closed\": \"$J_CLOSED\", \"unclaimed\": \"$J_UNCL\"}" 2>&1)"
  claims="$(psql_app -c "select count(*) from job_event where job_id='$J_UNCL' and kind='claim' and actor='t1'" 2>/dev/null)"
  res7="$(echo "$r7" | python3 -c 'import json,sys; print(json.load(sys.stdin)["result"])' 2>/dev/null || echo FAIL)"
  [ "$claims" = 1 ] || res7=FAIL
  trow P7a "(1) tech GET another tech's job 403; (2) payment on a closed job 409 '(current status: closed)'; (3) tech note on an unclaimed job 201 + assigned + one claim event; (4) GET /api/jobs/99999999999/media not 500" \
    "$res7" "$r7 | claim events by t1 on that job: $claims"
  deep_health > "$OUT/deep-health-train.json"
  d="$OUT/deep-health-train.json"
  ports="$(docker ps --format '{{.Names}} [{{.Ports}}]' | grep -c -- '->')"
  f3="environment=$(jget facts.environment < "$d") git_sha=$(jget facts.git_sha < "$d") backup_prefix=$(jget facts.backup_prefix < "$d") enable_dispatcher=$(jget facts.enable_dispatcher < "$d") database=$(jget components < "$d" | jget database.status); '->' lines: $ports"
  res3=FAIL
  [ "$(jget facts.environment < "$d")" = production ] && [ "$(jget facts.git_sha < "$d")" = "$TARGET" ] && [ "$(jget facts.backup_prefix < "$d")" = backups/db-selfhost/ ] \
    && [ "$(jget facts.enable_dispatcher < "$d")" = False ] && [ "$(jget components < "$d" | jget database.status)" = ok ] && [ "$ports" = 0 ] && res3=PASS
  trow "P3a first boot" "deep health environment=production, git_sha = deployed commit, backup_prefix=backups/db-selfhost/, enable_dispatcher=false, database ok; docker ps shows no '->'" \
    "$res3" "$f3 (read after the train deploy; the same facts after 6.9 on drain-image are in the step table)"
  sed -i '/^FIXFLOW_ATTENDANCE_LOCATION_ACCURACY_CEILING_M=/d; /^FIXFLOW_JOBS_PUNCH_ACCURACY_CEILING_M=/d' /etc/fixflow/backend.env

  # ---- 12.6 the web image from main
  WEBIMG="$(docker inspect --format '{{.Image}}' "$(ffc ps -q web)" 2>/dev/null)"
  row 12.6 AMBIGUOUS "web built from main in R5.5 and started in R5.6" "web image $(echo "$WEBIMG" | cut -c1-19)" \
    "the board 'shows sampler_state' is a page in a browser; the same fields were read from the API in the P6a row. 12.6's 'ffc \$P_RUN build web' is the build R5.5 already did"

  # ---- R5.9 the rollback, to PREV (the drain-image commit)
  PHASE=rollback
  rb_run R5.9-1 "$(rb_span R5.9 "show <PREV>:CLAUDE.md")" "<PREV>=$PREV"
  prevhead="$(out_of | grep -o '[0-9]\{4\}' | head -n 1)"
  # step 1's "the database's applied head (..., as in R5.3)": R5.3's third line
  rb_run R5.9-1b "$(rb_fence R5.3 1 '3p')"
  dbh="$(out_of | grep -xE '[0-9]{4}' | head -n 1)"
  row R5.9.1 "$( [ -n "$prevhead" ] && [ -n "$dbh" ] && echo DONE || echo FAILED)" "previous head from CLAUDE.md at PREV; DB head" "PREV head $prevhead; DB head $dbh" \
    "the VERIFY on 'head = **NNNN**' existing at the previous sha: $( [ -n "$prevhead" ] && echo present || echo ABSENT)"
  if [ -z "$prevhead" ] || [ -z "$dbh" ]; then
    row R5.9.2 FAILED "compare the heads" "PREV head '$prevhead', DB head '$dbh'" "a head could not be read: no rollback attempted"
  elif [ "$dbh" -gt "$prevhead" ]; then
    row R5.9.2 DONE "database head above the previous version's: STOP, no rollback" "$dbh > $prevhead"
  else
    row R5.9.2 DONE "heads equal: rollback allowed" "$dbh = $prevhead"
    rb_run R5.9-3a "$(rb_span R5.9 'checkout --detach <PREV>')" "<PREV>=$PREV"
    rb_run R5.9-3b "$(rb_span R5.9 'build backend web')"
    rb_run R5.9-3c "$(rb_span R5.9 'up -d')"
    wait_backend_healthy 150
    rb_run R5.9-r57 "$(rb_fence R5.7 1)"
    row R5.9 "$( has "git_sha= $PREV" && has "'status': 'ok'" && echo DONE || echo FAILED)" "checkout PREV; build; up -d; R5.7" "$(out_of | tr '\n' ' ' | cut -c1-200)" \
      "rolled back to the drain-image commit; describe: $(git -C /opt/fixflow describe --tags --exact-match HEAD 2>&1)"
  fi
  sec4_5 "4.5 (after the train)"
  ;;
esac
