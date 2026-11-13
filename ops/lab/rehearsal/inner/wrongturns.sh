#!/usr/bin/env bash
# Deliberate wrong turns (L4 deliverable 3), after the restore rehearsal, on the same stand-in
# host (offline). Each one runs the runbook's own command text the way an owner who missed a
# line would, and records what stopped it: the runbook text (a Check the owner must read), a
# script (an exit code that halts), or nothing. Destructive ones run last. At the end the
# database is put back from the pre-restore copy 6.6 (b) took, by the runbook's own "go back"
# route (6.7's last paragraph), which is rehearsed too.
set -u
export OUT=/srv/l4/out
export PHASE=wrong-turn
source /srv/l4/kit/lib/harness.sh
source /srv/l4/kit/lib/steps.sh
source /srv/l4/kit/lib/steps-789.sh
export FF_EXTRA_COMPOSE=/srv/l4/kit/lib/lab-override.yml
source /srv/l4/dumps/names.env
sec4_profiles
WT="$OUT/wrongturns.tsv"
printf 'id\twrong turn\twhat happened\twhat stopped it\tscripted guard needed?\n' > "$WT"
wt() { printf '%s\t%s\t%s\t%s\t%s\n' "$1" "$(clean "$2")" "$(clean "$3" 700)" "$(clean "$4" 300)" "$(clean "$5" 400)" >> "$WT"; echo "WT $1: $(clean "$4" 120)"; }
backend_running() { [ -n "$(docker ps -q --filter label=com.docker.compose.project=fixflow --filter label=com.docker.compose.service=backend --filter status=running)" ]; }
ntables() { psql_app -c "select count(*) from pg_tables where schemaname = 'public'" 2>/dev/null | tr -d ' '; }

# ---- WT1: skip the sign-off (start the app with no restore-signed-off) ----------------------
rb_run wt1-close "$(rb_fence 6.1 1)"
rb_run wt1-up "$(rb_fence 6.9 1 '$p')"            # only the `up` line of 6.9, no printf / chmod
o="$(out_of | tail -n 3 | tr '\n' ' ')"; rc="$RC"
gate="$(ffc $P_DB --profile app logs restore-gate 2>&1 | grep -c 'restore gate: CLOSED')"
if backend_running; then st="backend RUNNING"; else st="backend not running"; fi
wt WT1 "6.9's 'up' without writing /etc/fixflow/restore-signed-off" "up exit $rc ($o); restore-gate log CLOSED x$gate; $st" \
  "$( backend_running && echo NOTHING || echo 'the compose restore gate (a script): the backend never starts')" "no: already scripted"

# ---- WT2: forced keys in backend.env, the spellings the P3a review tried --------------------
cp /etc/fixflow/backend.env /srv/l4/backend.env.good
printf '%s\n' "$(date -u +%FT%TZ) wt" > /etc/fixflow/restore-signed-off   # the gate's sign-off half open
ENVCHK="$(rb_fence 3.6 1 '$p')"
kelvin="$(printf 'FIXFLOW_BAC\xe2\x84\xaaUP_PREFIX=backups/db/')"
for spelling in 'fixflow_environment=dev' 'FIXFLOW_ENVIRONMENT: dev' 'export FIXFLOW_ENABLE_DISPATCHER=true' \
  ' FIXFLOW_ENVIRONMENT = dev' 'Fixflow_Backup_Enabled=true' "$kelvin" 'FIXFLOW_ENVIRONMENT=dev' 'FIXFLOW_ENABLE_DISPATCHER=true'; do
  cp /srv/l4/backend.env.good /etc/fixflow/backend.env
  printf '%s\n' "$spelling" >> /etc/fixflow/backend.env
  rb_run wt2-envcheck "$ENVCHK"
  chk="$(out_of | tr '\n' ' ' | cut -c1-160)"
  rb_run wt2-up "$(rb_fence 6.12 1 '$p')"       # `ffc $P_DB --profile app up -d --force-recreate backend`
  urc="$RC"; [ "$urc" = 0 ] && wait_backend_healthy 120 >/dev/null 2>&1
  if backend_running; then
    deep_health > "$OUT/deep-health-wt2.json"
    facts="environment=$(jget facts.environment < "$OUT/deep-health-wt2.json") dispatcher=$(jget facts.enable_dispatcher < "$OUT/deep-health-wt2.json") backup=$(jget facts.backup_enabled < "$OUT/deep-health-wt2.json") prefix=$(jget facts.backup_prefix < "$OUT/deep-health-wt2.json")"
    started="backend running after up (exit $urc): $facts"
  else
    started="backend not running after up (exit $urc)"
  fi
  case "$chk" in
    *CLOSED*) stop="restore-gate refuses (3.6 check and the compose gate)";;
    *) stop="gate allows it; the compose override decides";;
  esac
  wt "WT2 [$spelling]" "backend.env gains: $spelling" "3.6 check: $chk | $started" "$stop" \
    "$( case "$started" in *environment=production*dispatcher=False*backup=False*prefix=backups/db-selfhost/*) echo 'no: the compose override held';; *'not running'*) echo 'no: refused';; *running*) echo 'YES: a forced key won';; *) echo 'no: refused';; esac)"
  ffc $P_DB --profile app stop backend >/dev/null 2>&1
done
cp /srv/l4/backend.env.good /etc/fixflow/backend.env
ffc $P_DB --profile app up -d >/dev/null 2>&1; wait_backend_healthy 150

# ---- WT3: a truncated dump, cut early (60 %) and late (99 %: only the tail of the data lost) ----
psql_super() { ffc exec -T postgres psql -U postgres -v ON_ERROR_STOP=1 "$@"; }
want="$(grep " $NIGHTLY\$" "$OUT/dumps.sha256" | cut -d' ' -f1)"
for pct in 60 99; do
  T="trunc$pct-$NIGHTLY"
  head -c "$(( $(stat -c %s "/srv/l4/dumps/$NIGHTLY") * pct / 100 ))" "/srv/l4/dumps/$NIGHTLY" > "/var/lib/fixflow/restore/$T"
  rb_run "wt3-$pct-62" "$(rb_span 6.2 'sha256sum')" "<dump>=$T"
  s62="$(out_of | cut -c1-16)"
  rb_run "wt3-$pct-66a" "$(rb_fence 6.6 1)" "<dump file name>=$T"
  o66="$(out_of | tail -n 4 | tr '\n' ' ')"
  # an owner who does not compare the sum: the scratch-database copy of 6.7 (as R7.5 does it), so
  # the live database is not the casualty of this experiment
  psql_super -c 'DROP DATABASE IF EXISTS fixflow_wt' >/dev/null 2>&1
  psql_super -c 'CREATE DATABASE fixflow_wt OWNER fixflow_app' >/dev/null 2>&1
  r67="$(rb_fence 6.7 1 '$p' | sed 's/-d fixflow /-d fixflow_wt /')"
  rb_run "wt3-$pct-67" "$r67" "\$D=$T"
  o67="$(out_of | tail -n 3 | tr '\n' ' ')"
  nt="$(ffc exec -T postgres psql -U fixflow_app -d fixflow_wt -tAc "select count(*) from pg_tables where schemaname='public'" 2>/dev/null)"
  nj="$(ffc exec -T postgres psql -U fixflow_app -d fixflow_wt -tAc "select count(*) from job" 2>/dev/null)"
  wt "WT3 ($pct %)" "a dump cut at $pct % (an interrupted scp)" \
    "6.2 sum $s62… vs recorded $(echo "$want" | cut -c1-16)…; 6.6 (a) on it: $o66; 6.7's pg_restore into a scratch db: $o67; tables loaded $nt, job rows $nj" \
    "$( echo "$o66" | grep -q 'list exit=0' && echo "only 6.2's sha256 comparison (an instruction: a different sum prints, nothing exits non-zero); 6.6 (a) passed; pg_restore --exit-on-error at 6.7 fails AFTER the drop" || echo "6.6 (a): pg_restore -l itself failed on the cut file (list exit=1), before anything was dropped; 6.2's sum also differed")" \
    "$( echo "$o66" | grep -q 'list exit=0' && echo "YES: 6.6 (a) passes this truncated dump, so 'prove the dump' proves the table of contents, not the data; 6.7 then drops and the load fails half-way. Smallest fix: in 6.6 (a) restore into a scratch database (R7.4/R7.5's lines) before 6.7 drops anything, or make the sum comparison a test that stops" || echo "no: 6.6 (a) refused it (the sum is still the primary check)")"
  psql_super -c 'DROP DATABASE IF EXISTS fixflow_wt' >/dev/null 2>&1
done

# ---- WT4: a dump whose list is empty (a dump of an empty database) ---------------------------
E="empty-$NIGHTLY"
psql_super -c 'CREATE DATABASE fixflow_empty OWNER fixflow_app' >/dev/null 2>&1
ffc exec -T postgres pg_dump -U fixflow_app -d fixflow_empty --format=custom > "/var/lib/fixflow/restore/$E"
psql_super -c 'DROP DATABASE fixflow_empty' >/dev/null 2>&1
rb_run wt4-66a "$(rb_fence 6.6 1)" "<dump file name>=$E"
o66="$(out_of | tail -n 4 | tr '\n' ' ')"
wt WT4 "a dump whose restore list is empty" "6.6 (a): $o66" \
  "6.6 (a)'s Check ('a number above 30') — read by the owner; every command exits 0 except grep -c's 0-count exit 1, which nothing acts on" \
  "advisable: make the count a test that stops (e.g. '[ \$(grep -c ...) -gt 30 ] || echo STOP'); 6.8's count comparison is the second net before the backend starts"

# ---- C27 note 2 (WT5): the pre-restore copy fails to leave the host; does anything stop 6.7? --
ffc --profile l4s3 stop l4-s3 >/dev/null 2>&1
rb_run wt5-66b-count "$(rb_fence 6.6 2 1p)"
cnt="$(out_of)"
rb_run wt5-66b-copy "$(rb_fence 6.6 2 '3,$p')"
o="$(out_of | tail -n 3 | tr '\n' ' ')"
ffc --profile l4s3 up -d l4-s3 >/dev/null 2>&1
# the live database before the experiment
before_jobs="$(psql_app -c 'select count(*) from job')"
cp "/srv/l4/dumps/$NIGHTLY" "/var/lib/fixflow/restore/$NIGHTLY"
rb_run wt5-67 "$(rb_fence 6.7 1)" "\$D=$NIGHTLY"
o67="$(out_of | tail -n 2 | tr '\n' ' ')"
wt "WT5 (C27 note 2)" "6.6 (b)'s upload fails (stand-in bucket stopped) and the owner goes on to 6.7" \
  "live tables $cnt; 6.6 (b): $o; 6.7 ran: $o67 (live jobs before: $before_jobs)" \
  "NOTHING in a script: fixflow-r2-put.sh exits non-zero, but 6.7 is a separate command that does not look for the copy" \
  "YES: 6.7 should refuse when 6.6 (b) found tables and no upload receipt exists, e.g. 6.6 (b) writes /var/lib/fixflow/restore/pre-restore.ok only after 'uploaded key=' and 6.7 starts with 'test -s .../pre-restore.ok || { echo STOP; exit 1; }' (cleared in 6.1)"

# ---- C27 note 1 (WT6): drop before the checks (6.7 first, 6.6 never run) ----------------------
psql_app -c "insert into job_event (job_id, kind, text, actor, seq) select id, 'note', 'WT6 manager write after the dump', 'm1', nextval('job_event_seq') from job limit 1" > "$OUT/wt6-insert.log" 2>&1
marker="$(psql_app -c "select count(*) from job_event where text = 'WT6 manager write after the dump'")"
rb_run wt6-67-first "$(rb_fence 6.7 1)" "\$D=$NIGHTLY"
o67="$(out_of | tail -n 2 | tr '\n' ' ')"
after="$(psql_app -c "select count(*) from job_event where text = 'WT6 manager write after the dump'")"
wt "WT6 (C27 note 1)" "6.7 typed before 6.6 (the owner skips 'prove' and 'save')" \
  "a manager write made after the dump: $marker row(s) before, $after after; 6.7: $o67" \
  "NOTHING: 6.7's DROP runs whatever 6.6 did; the order exists only in the runbook text (and the P3a smoke, which runs it in order without asserting it)" \
  "YES (same guard as WT5): 6.7 starts with a test for 6.6's proof and copy markers"

# ---- the way back: the pre-restore copy, by the runbook's own route ---------------------------
PRE="$(basename "$(cat "$OUT/pre-restore-file.txt" 2>/dev/null)")"
if [ -n "$PRE" ] && [ -f "/var/lib/fixflow/restore/$PRE" ]; then
  rb_run back-66a "$(rb_fence 6.6 1)" "<dump file name>=$PRE"
  ob="$(out_of | tail -n 3 | tr '\n' ' ')"
  rb_run back-67 "$(rb_fence 6.7 1)"
  ob7="$(out_of | tail -n 2 | tr '\n' ' ')"
  marker_back="$(psql_app -c 'select count(*) from job' 2>/dev/null)"
  wt BACK "go back to the database as it was: 6.6 (a) and 6.7 with the pre-restore copy ($PRE)" \
    "6.6 (a): $ob; 6.7: $ob7; job rows now $marker_back" \
    "$( echo "$ob7" | grep -q 'restore exit=0' && echo 'the route works as written' || echo 'the route FAILED as written')" "-"
else
  wt BACK "go back with the pre-restore copy" "no pre-restore file recorded" "-" "-"
fi
printf '%s\n' "signed-off case=a dump=$PRE by=l4-rehearsal at=$(date -u +%FT%TZ)" > /etc/fixflow/restore-signed-off
ffc $P_DB --profile app up -d >/dev/null 2>&1; wait_backend_healthy 150 && echo "WT: backend healthy again"
