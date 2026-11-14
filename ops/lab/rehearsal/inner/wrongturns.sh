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
wt() {
  local what="$3"
  # a wrong turn whose runbook text moved typed nothing: say so instead of judging it
  [ -n "$RB_MOVED" ] && { what="MOVED (runbook moved under: $RB_MOVED; nothing typed for it) $what"; RB_MOVED=""; }
  printf '%s\t%s\t%s\t%s\t%s\n' "$1" "$(clean "$2")" "$(clean "$what" 700)" "$(clean "$4" 300)" "$(clean "$5" 400)" >> "$WT"; echo "WT $1: $(clean "$4" 120)"
}
# The guard the binding review gives for D5/D6 (finding 2) and N1, quoted by WT5, WT6 and WT12
MARKER_GUARD="YES. The binding review's form: 6.6 (b) writes a marker in BOTH branches ('tables=0', or 'key=... sha256=...' after the upload) together with 'dump=\$D'; 6.9 deletes it, and 6.1 too; 6.7's DROP line itself begins ': \"\${D:?...}\" && test -s <marker> && grep -qx \"dump=\$D\" <marker> &&', so one line carries the guard (the C34 \${SHA:?} pattern; a separate 'test || exit 1' line under 'sudo -i' would close the root shell instead). The scp fallback of 6.6 (b) needs a hand-written marker carrying the sha checked on the laptop. Owned by the runbook's lane"
backend_running() { [ -n "$(docker ps -q --filter label=com.docker.compose.project=fixflow --filter label=com.docker.compose.service=backend --filter status=running)" ]; }
ntables() { psql_app -c "select count(*) from pg_tables where schemaname = 'public'" 2>/dev/null | tr -d ' '; }
# The runbook batch (ruling C42) gives 6.6 a marker chain and puts the guard on 6.7's DROP line;
# with that text (MARKERS=yes) each wrong turn below types the guarded blocks, by their anchors.
MARKERS=no; rb_anch 6.7 drop-restore && MARKERS=yes
RD=/var/lib/fixflow/restore
G67="$(rb_fence 6.7 @drop-restore/1)"
# 6.6 (a) with its one-line proof, then (b): the count and the branch it takes; sets D and SUM
six6() { # <id> <dump file> <recorded sha256>
  D="$2"; SUM="$3"
  rb_run "$1-66a" "$(rb_fence 6.6 @a-list)" "<dump file name>=$2" "<the recorded sha256 of that file>=$3"
  rb_run "$1-66a-prove" "$(rb_fence 6.6 @a-prove)"
  W66A="$(out_of | tail -n 1)"
  rb_run "$1-66b-count" "$(rb_fence 6.6 @b-count)"
  if [ "$(out_of | sed -n 's/^live tables: *//p')" = 0 ]; then rb_run "$1-66b-empty" "$(rb_fence 6.6 @b-empty)"
  else rb_run "$1-66b-save" "$(rb_fence 6.6 @b-save)"; fi
  W66B="$(out_of | tail -n 2 | tr '\n' ' ')"
}

# ---- WT16 (ruling C58): 6.6 and 6.7 typed with 6.1 skipped, on a live host --------------------
# The state a finished restore leaves: the sign-off present, the backend RUNNING, writes landing.
# The owner then types 6.6 (a) and (b) for a good dump and 6.7, in one shell, never 6.1 (which
# removes the sign-off and the markers and stops the backend). Runs first, on both texts: it needs
# the live state the restore left, which the later wrong turns take apart.
SO=/etc/fixflow/restore-signed-off
if [ ! -s "$SO" ] || ! backend_running; then
  printf '%s\n' "signed-off case=a dump=$NIGHTLY by=l4-rehearsal at=$(date -u +%FT%TZ)" > "$SO"
  ffc $P_DB --profile app up -d >/dev/null 2>&1; wait_backend_healthy 150 >/dev/null
  echo "lab WT16: the backend was not running with a sign-off after the restore part, so the rig wrote the sign-off and started it (as 6.9 does) before WT16" >> "$OUT/deviations.log"
fi
so16="$( [ -s "$SO" ] && echo present || echo absent)"; run16="$(backend_running && echo running || echo 'NOT running')"
ev16() { psql_app -c "select count(*) from job_event where text = '$1'" 2>/dev/null | tr -d ' '; }
add16() { psql_app -c "insert into job_event (job_id, kind, text, actor, seq) select id, 'note', '$1', 'm1', nextval('job_event_seq') from job limit 1" >/dev/null 2>&1; }
add16 'WT16 write before 6.6'
cp "/srv/l4/dumps/$NIGHTLY" "$RD/$NIGHTLY"
# the backend's answers while 6.7 runs: a sampler on deep health (database component) and on the
# backend container's state, every 0.2 s, until 6.7 has returned
tok16="$(sed -n 's/^FIXFLOW_OPS_PROXY_TOKEN=//p' /etc/fixflow/backend.env | tail -n 1)"
poll16() {
  local bip cid code db
  while [ ! -e /srv/l4/.wt16-stop ]; do
    cid="$(ffc ps -q backend 2>/dev/null)"
    bip="$( [ -n "$cid" ] && docker inspect -f '{{(index .NetworkSettings.Networks "fixflow_app").IPAddress}}' "$cid" 2>/dev/null)"
    if [ -n "$bip" ]; then
      code="$(curl -s -m 2 -o /srv/l4/.wt16-body -w '%{http_code}' -H "X-Ops-Proxy-Token: $tok16" "http://$bip:8000/api/ops/health" 2>/dev/null)"
      db="$(python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); c=d.get("components"); c=c if isinstance(c,list) else []; print(next((x.get("status") for x in c if x.get("name")=="database"), "?"))' /srv/l4/.wt16-body 2>/dev/null || echo unreadable)"
    else code=none; db=-; fi
    printf '%s running=%s http=%s database=%s\n' "$(date -u +%T.%N | cut -c1-12)" "$(backend_running && echo yes || echo no)" "$code" "$db" >> "$OUT/wt16-poll.log"
    sleep 0.2
  done
}
if [ $MARKERS = yes ]; then
  six6 wt16 "$NIGHTLY" "$(grep " $NIGHTLY\$" "$OUT/dumps.sha256" | cut -d' ' -f1)"
  o16a="$W66A"; o16b="$W66B"; G16="$G67"
else
  rb_run wt16-66a "$(rb_fence 6.6 1)" "<dump file name>=$NIGHTLY"
  o16a="$(out_of | tail -n 3 | tr '\n' ' ')"
  rb_run wt16-66b "$(rb_fence 6.6 2)"
  o16b="$(out_of | grep -E '^dump exit=|^uploaded' | tr '\n' ' ' | cut -c1-160)"
  G16="$(rb_fence 6.7 1)"
fi
add16 'WT16 write after 6.6 (b)'
w16a0="$(ev16 'WT16 write before 6.6')"; w16b0="$(ev16 'WT16 write after 6.6 (b)')"
rm -f /srv/l4/.wt16-stop; : > "$OUT/wt16-poll.log"
poll16 & p16=$!
sleep 1
t16a="$(date -u +%T.%N | cut -c1-12)"
rb_run wt16-67 "$G16"
t16b="$(date -u +%T.%N | cut -c1-12)"
o16c="$(out_of | tail -n 2 | tr '\n' ' ')"
sleep 1; touch /srv/l4/.wt16-stop; wait "$p16" 2>/dev/null; rm -f /srv/l4/.wt16-stop /srv/l4/.wt16-body
w16a1="$(ev16 'WT16 write before 6.6')"; w16b1="$(ev16 'WT16 write after 6.6 (b)')"
during="$(awk -v a="$t16a" -v b="$t16b" '$1>=a && $1<=b' "$OUT/wt16-poll.log")"
nd="$(printf '%s\n' "$during" | grep -c .)"; nrun="$(printf '%s\n' "$during" | grep -c 'running=yes')"
answers="$(printf '%s\n' "$during" | awk '{print $3" "$4}' | sort | uniq -c | sed 's/^ *//' | tr '\n' ';')"
dropped="$(echo "$o16c" | grep -q 'restore exit=' && echo yes || echo no)"
wt "WT16 (C58)" "6.6 (a) and (b) for a good dump, then 6.7, in one shell with 6.1 never typed, on a live host (sign-off $so16, backend $run16, writes landing)" \
  "6.6 (a): $o16a; 6.6 (b): $o16b; 6.7 ($t16a to $t16b UTC): $o16c; the write made before 6.6: $w16a0 -> $w16a1 row(s); the write made after 6.6 (b)'s copy: $w16b0 -> $w16b1; samples during 6.7: $nd, backend running in $nrun; deep health during 6.7 (http database): $answers" \
  "$( [ "$dropped" = yes ] && echo "NOTHING: the DROP ran with the backend running and the sign-off in place$( [ "$w16b1" = 0 ] && echo '; the write made after 6.6 (b) is gone (only 6.6 (b)'"'"'s copy, taken before it, holds the earlier write)')" || echo "the DROP did not run: see the step log")" \
  "$( [ "$dropped" = yes ] && echo "YES, for the next runbook PR (ruling C58): 6.7's DROP line refuses while $SO exists ('this database is live: start at 6.1'), or 6.6 (b) records max(job_event.seq) and the DROP line compares it" || echo no)"
# as 6.9 would leave it: the markers WT16's 6.6 wrote are removed, so they vouch for nothing later
rm -f $RD/ready-to-drop $RD/proven
echo "lab WT16: after WT16 the rig removed the markers its 6.6 wrote (as 6.9 does); the database now holds the nightly dump's rows" >> "$OUT/deviations.log"
wait_backend_healthy 120 >/dev/null 2>&1

# ---- WT1: skip the sign-off (start the app with no restore-signed-off) ----------------------
rb_run wt1-close "$(rb_fence 6.1 @close/1)"
rb_run wt1-up "$(rb_line 6.9 @signoff/1 'profile app up')"            # only the `up` line of 6.9, no printf / chmod
o="$(out_of | tail -n 3 | tr '\n' ' ')"; rc="$RC"
gate="$(ffc $P_DB --profile app logs restore-gate 2>&1 | grep -c 'restore gate: CLOSED')"
if backend_running; then st="backend RUNNING"; else st="backend not running"; fi
wt WT1 "6.9's 'up' without writing /etc/fixflow/restore-signed-off" "up exit $rc ($o); restore-gate log CLOSED x$gate; $st" \
  "$( backend_running && echo NOTHING || echo 'the compose restore gate (a script): the backend never starts')" \
  "$( backend_running && echo 'YES: the backend started without a sign-off' || echo 'no: already scripted (the compose gate)')"

# ---- WT2: forced keys in backend.env, the spellings the P3a review tried --------------------
cp /etc/fixflow/backend.env /srv/l4/backend.env.good
printf '%s\n' "$(date -u +%FT%TZ) wt" > /etc/fixflow/restore-signed-off   # the gate's sign-off half open
ENVCHK="$(rb_line 3.6 1 'restore-gate.sh --env-only')"
kelvin="$(printf 'FIXFLOW_BAC\xe2\x84\xaaUP_PREFIX=backups/db/')"
for spelling in 'fixflow_environment=dev' 'FIXFLOW_ENVIRONMENT: dev' 'export FIXFLOW_ENABLE_DISPATCHER=true' \
  ' FIXFLOW_ENVIRONMENT = dev' 'Fixflow_Backup_Enabled=true' "$kelvin" 'FIXFLOW_ENVIRONMENT=dev' 'FIXFLOW_ENABLE_DISPATCHER=true'; do
  cp /srv/l4/backend.env.good /etc/fixflow/backend.env
  printf '%s\n' "$spelling" >> /etc/fixflow/backend.env
  rb_run wt2-envcheck "$ENVCHK"
  chk="$(out_of | tr '\n' ' ' | cut -c1-160)"
  rb_run wt2-up "$(rb_line 6.12 '*' 'force-recreate backend')"   # 6.12's up line, in whichever block holds it
  urc="$RC"
  if [ "$urc" = 99 ]; then
    # the up line was not typed (the runbook moved under 6.12): nothing started, so nothing is judged
    wt "WT2 [$spelling]" "backend.env gains: $spelling" "3.6 check: $chk | up line not typed (moved.log)" \
      "MOVED: 6.12's block changed shape, so its up line was not typed" "not judged (MOVED)"
    continue
  fi
  [ "$urc" = 0 ] && wait_backend_healthy 120 >/dev/null 2>&1
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
  if [ $MARKERS = yes ]; then
    rb_run "wt3-$pct-66a" "$(rb_fence 6.6 @a-list)" "<dump file name>=$T" "<the recorded sha256 of that file>=$want"
    o66="$(out_of | tail -n 3 | tr '\n' ' ')"
    D="$T"; SUM="$want"
    rb_run "wt3-$pct-66a-prove" "$(rb_fence 6.6 @a-prove)"
    o66="$o66; the proof: $(out_of | tail -n 1)"
  else
    rb_run "wt3-$pct-66a" "$(rb_fence 6.6 1)" "<dump file name>=$T"
    o66="$(out_of | tail -n 4 | tr '\n' ' ')"
  fi
  # an owner who does not compare the sum: the scratch-database copy of 6.7 (as R7.5 does it), so
  # the live database is not the casualty of this experiment
  psql_super -c 'DROP DATABASE IF EXISTS fixflow_wt' >/dev/null 2>&1
  psql_super -c 'CREATE DATABASE fixflow_wt OWNER fixflow_app' >/dev/null 2>&1
  r67="$(printf '%s\n' "$G67" | sed -n '$p' | sed 's/-d fixflow /-d fixflow_wt /g')"
  [ "$pct" = 60 ] && echo "lab WT3: 6.7's pg_restore line is run with '-d fixflow' changed to '-d fixflow_wt' (a scratch database, so the live one is not dropped)" >> "$OUT/deviations.log"
  if [ $MARKERS = yes ]; then rb_run "wt3-$pct-67" "$r67"; else rb_run "wt3-$pct-67" "$r67" "\$D=$T"; fi
  o67="$(out_of | tail -n 3 | tr '\n' ' ')"
  nt="$(ffc exec -T postgres psql -U fixflow_app -d fixflow_wt -tAc "select count(*) from pg_tables where schemaname='public'" 2>/dev/null)"
  nj="$(ffc exec -T postgres psql -U fixflow_app -d fixflow_wt -tAc "select count(*) from job" 2>/dev/null)"
  wt "WT3 ($pct %)" "a dump cut at $pct % (an interrupted scp)" \
    "6.2 sum $s62… vs recorded $(echo "$want" | cut -c1-16)…; 6.6 (a) on it: $o66; 6.7's pg_restore into a scratch db: $o67; tables loaded $nt, job rows $nj" \
    "$( [ $MARKERS = yes ] && echo "6.6 (a)'s one-line proof: $( echo "$o66" | grep -q 'proven:' && echo 'it wrote proven (NOT stopped)' || echo 'the sum (or the list) is not as recorded, so proven is not written; with no marker 6.7 drops nothing') ($o67)" || { echo "$o66" | grep -q 'list exit=0' && echo "only 6.2's sha256 comparison (an instruction: a different sum prints, nothing exits non-zero); 6.6 (a) passed; pg_restore --exit-on-error at 6.7 fails AFTER the drop" || echo "6.6 (a): pg_restore -l itself failed on the cut file (list exit=1), before anything was dropped; 6.2's sum also differed"; })" \
    "$( [ $MARKERS = yes ] && { echo "$o66" | grep -q 'proven:' && echo 'YES: proven was written for a damaged file' || echo "no: the proof is scripted on one line (D4 as the batch fixed it; a file damaged before its sum was recorded would still pass, as 6.6 says)"; } || { echo "$o66" | grep -q 'list exit=0' && echo "YES: 6.6 (a) passes this truncated dump, so 'prove the dump' proves the table of contents, not the data; 6.7 then drops and the load fails half-way. Smallest fix: in 6.6 (a) restore into a scratch database (R7.4/R7.5's lines) before 6.7 drops anything, or make the sum comparison a test that stops" || echo "no: 6.6 (a) refused it (the sum is still the primary check)"; })"
  psql_super -c 'DROP DATABASE IF EXISTS fixflow_wt' >/dev/null 2>&1
done

# ---- WT4: a dump whose list is empty (a dump of an empty database) ---------------------------
E="empty-$NIGHTLY"
psql_super -c 'CREATE DATABASE fixflow_empty OWNER fixflow_app' >/dev/null 2>&1
ffc exec -T postgres pg_dump -U fixflow_app -d fixflow_empty --format=custom > "/var/lib/fixflow/restore/$E"
psql_super -c 'DROP DATABASE fixflow_empty' >/dev/null 2>&1
if [ $MARKERS = yes ]; then
  esum="$(sha256sum "/var/lib/fixflow/restore/$E" | cut -d' ' -f1)"
  rb_run wt4-66a "$(rb_fence 6.6 @a-list)" "<dump file name>=$E" "<the recorded sha256 of that file>=$esum"
  o66="$(out_of | tail -n 3 | tr '\n' ' ')"
  D="$E"; SUM="$esum"
  rb_run wt4-66a-prove "$(rb_fence 6.6 @a-prove)"
  o66="$o66; the proof: $(out_of | tail -n 1)"
  wt WT4 "a dump whose restore list is empty (its sum recorded, so only the count can stop it)" "6.6 (a): $o66" \
    "$( echo "$o66" | grep -q 'proven:' && echo 'NOTHING: proven was written' || echo "6.6 (a)'s one-line proof: the TABLE DATA count is not above 30, so proven is not written (a script)")" \
    "$( echo "$o66" | grep -q 'proven:' && echo 'YES' || echo 'no: scripted (D7 as the batch fixed it)')"
else
rb_run wt4-66a "$(rb_fence 6.6 1)" "<dump file name>=$E"
o66="$(out_of | tail -n 4 | tr '\n' ' ')"
wt WT4 "a dump whose restore list is empty" "6.6 (a): $o66" \
  "6.6 (a)'s Check ('a number above 30') — read by the owner; every command exits 0 except grep -c's 0-count exit 1, which nothing acts on" \
  "advisable: make the count a test that stops (e.g. '[ \$(grep -c ...) -gt 30 ] || echo STOP'); 6.8's count comparison is the second net before the backend starts"
fi

# ---- C27 note 2 (WT5): the pre-restore copy fails to leave the host; does anything stop 6.7? --
if [ $MARKERS = yes ]; then
  cp "/srv/l4/dumps/$NIGHTLY" "$RD/$NIGHTLY"
  before_jobs="$(psql_app -c 'select count(*) from job')"
  ffc --profile l4s3 stop l4-s3 >/dev/null 2>&1
  six6 wt5 "$NIGHTLY" "$(grep " $NIGHTLY\$" "$OUT/dumps.sha256" | cut -d' ' -f1)"
  ffc --profile l4s3 up -d l4-s3 >/dev/null 2>&1; lab_s3_bucket >/dev/null && echo "lab WT5: the stand-in bucket (in memory) was created again after its restart; its earlier objects are gone" >> "$OUT/deviations.log"
  rb_run wt5-67 "$G67"
  o67="$(out_of | tr '\n' ' ' | cut -c1-200)"; after_jobs="$(psql_app -c 'select count(*) from job')"
  wt "WT5 (C27 note 2)" "6.6 (b)'s upload fails (stand-in bucket stopped) and the owner goes on to 6.7, in the same shell" \
    "6.6 (a): $W66A; 6.6 (b): $W66B; 6.7: $o67; live jobs $before_jobs before, $after_jobs after; marker: $( [ -e $RD/ready-to-drop ] && echo present || echo absent)" \
    "$( [ "$after_jobs" = "$before_jobs" ] && echo 'the marker chain (a script): 6.6 (b) writes ready-to-drop only on the upload receipt, and 6.7 DROP line refuses without it' || echo 'NOTHING: the live database was dropped')" \
    "$( [ "$after_jobs" = "$before_jobs" ] && echo 'no: scripted (D5 as the batch fixed it)' || echo YES)"
else
ffc --profile l4s3 stop l4-s3 >/dev/null 2>&1
rb_run wt5-66b-count "$(rb_line 6.6 2 "from pg_tables where schemaname")"
cnt="$(out_of)"
rb_run wt5-66b-copy "$(rb_line 6.6 2 'S=$(date -u' '$')"
o="$(out_of | tail -n 3 | tr '\n' ' ')"
ffc --profile l4s3 up -d l4-s3 >/dev/null 2>&1; lab_s3_bucket >/dev/null && echo "lab WT5: the stand-in bucket (in memory) was created again after its restart; its earlier objects are gone" >> "$OUT/deviations.log"
# the live database before the experiment
before_jobs="$(psql_app -c 'select count(*) from job')"
cp "/srv/l4/dumps/$NIGHTLY" "/var/lib/fixflow/restore/$NIGHTLY"
rb_run wt5-67 "$(rb_fence 6.7 1)" "\$D=$NIGHTLY"
o67="$(out_of | tail -n 2 | tr '\n' ' ')"
wt "WT5 (C27 note 2)" "6.6 (b)'s upload fails (stand-in bucket stopped) and the owner goes on to 6.7" \
  "live tables $cnt; 6.6 (b): $o; 6.7 ran: $o67 (live jobs before: $before_jobs)" \
  "$( echo "$o67" | grep -q 'restore exit=0' && echo "NOTHING in a script: fixflow-r2-put.sh exits non-zero, but 6.7 is a separate command that does not look for the copy" || echo "see the step log: 6.7 did not complete")" \
  "$MARKER_GUARD"
fi

# ---- C27 note 1 (WT6): drop before the checks (6.7 first, 6.6 never run) ----------------------
psql_app -c "insert into job_event (job_id, kind, text, actor, seq) select id, 'note', 'WT6 manager write after the dump', 'm1', nextval('job_event_seq') from job limit 1" > "$OUT/wt6-insert.log" 2>&1
marker="$(psql_app -c "select count(*) from job_event where text = 'WT6 manager write after the dump'")"
if [ $MARKERS = yes ]; then
  # the owner remembers the dump's name (D set) but skips 6.6; as after any sign-off, no marker is left
  rm -f $RD/ready-to-drop $RD/proven; D="$NIGHTLY"
  rb_run wt6-67-first "$G67"
  o67="$(out_of | tr '\n' ' ' | cut -c1-200)"
  after="$(psql_app -c "select count(*) from job_event where text = 'WT6 manager write after the dump'")"
  # and a marker left for ANOTHER dump (an attempt abandoned before 6.9): it must not vouch for this one
  printf 'dump=%s\npre-restore=none live-tables=0\nat=%s\n' "$B5" "$(date -u +%FT%TZ)" > $RD/ready-to-drop
  rb_run wt6-67-stale "$G67"
  o67b="$(out_of | tr '\n' ' ' | cut -c1-160)"; rm -f $RD/ready-to-drop
  after2="$(psql_app -c "select count(*) from job_event where text = 'WT6 manager write after the dump'")"
  wt "WT6 (C27 note 1)" "6.7 typed before 6.6 (D set, 6.6 skipped); then with a marker left for another dump" \
    "a manager write made after the dump: $marker row(s) before, $after after the first try, $after2 after the second; 6.7 (no marker): $o67; 6.7 (another dump's marker): $o67b" \
    "$( [ "$after2" = "$marker" ] && echo "the guard on 6.7's DROP line (a script): no marker naming this dump, nothing dropped" || echo 'NOTHING: the write is gone')" \
    "$( [ "$after2" = "$marker" ] && echo 'no: scripted (D6 as the batch fixed it)' || echo YES)"
else
rb_run wt6-67-first "$(rb_fence 6.7 1)" "\$D=$NIGHTLY"
o67="$(out_of | tail -n 2 | tr '\n' ' ')"
after="$(psql_app -c "select count(*) from job_event where text = 'WT6 manager write after the dump'")"
wt "WT6 (C27 note 1)" "6.7 typed before 6.6 (the owner skips 'prove' and 'save')" \
  "a manager write made after the dump: $marker row(s) before, $after after; 6.7: $o67" \
  "$( [ "${after:-1}" = 0 ] && echo "NOTHING: 6.7's DROP runs whatever 6.6 did; the order exists only in the runbook text (and the P3a smoke, which runs it in order without asserting it)" || echo "the write survived: see the step log")" \
  "$MARKER_GUARD (the marker names the dump, so a marker left by an earlier restore does not wave a skipped 6.6 through)"
fi

# ---- N1 (WT12): 6.7 in a new or reconnected shell, where D is empty -----------------------------
D_SAVED="${D:-}"; unset D
jobs12="$(psql_app -c 'select count(*) from job' 2>/dev/null)"
rb_run wt12-67-no-d "$G67"
o12="$(out_of | tail -n 3 | tr '\n' ' ')"
nt12="$(ntables)"
D="$D_SAVED"
wt "WT12 (N1)" "6.7 typed in a new shell (the variable D from 6.6 is empty)" \
  "job rows before $jobs12; 6.7: $o12; public tables after: ${nt12:-?}" \
  "$( [ "${nt12:-1}" = 0 ] && echo "NOTHING: the DROP runs, then pg_restore cannot find /restore/.list and the schema is left empty" || { [ $MARKERS = yes ] && echo "the \${D:?} guard on 6.7's DROP line (bash drops the rest of the line, as in the owner's interactive shell)" || echo "something stopped the DROP: see the step log"; })" \
  "$( [ "${nt12:-1}" = 0 ] && echo "$MARKER_GUARD (the \${D:?} on the DROP line is what stops this one)" || echo "no$( [ $MARKERS = yes ] && echo ': scripted (N1 as the batch fixed it)')")"

# ---- WT13-WT15: the batch's marker chain under the remaining wrong turns (ruling C51) -------------
# Each needs the marker chain (6.6 (b)'s ready-to-drop and its scp fallback), which only the batch's
# text has; on a text without it they are N/A.
if [ $MARKERS = yes ]; then
  sumof() { grep " $1\$" "$OUT/dumps.sha256" | cut -d' ' -f1; }
  ev() { psql_app -c "select count(*) from job_event where text = '$1'" 2>/dev/null | tr -d ' '; }
  addev() { psql_app -c "insert into job_event (job_id, kind, text, actor, seq) select id, 'note', '$1', 'm1', nextval('job_event_seq') from job limit 1" >/dev/null 2>&1; }
  cp "/srv/l4/dumps/$NIGHTLY" "$RD/$NIGHTLY"
  # as after 6.1: the backend is stopped while 6.6 and 6.7 run
  ffc $P_DB --profile app stop backend >/dev/null 2>&1

  # WT13 (a): a restore that went through 6.9 leaves no marker, so 6.7 typed again for the same dump,
  # 6.6 skipped, drops nothing. Shown by the state the completed restore left, then 6.7.
  rm -f $RD/ready-to-drop $RD/proven
  addev 'WT13 write after the earlier restore'
  m0="$(ev 'WT13 write after the earlier restore')"; D="$NIGHTLY"
  rb_run wt13-67-after-signoff "$G67"
  o13a="$(out_of | tr '\n' ' ' | cut -c1-160)"; m1="$(ev 'WT13 write after the earlier restore')"
  # WT13 (b): an attempt abandoned after 6.6 leaves a marker for the same dump; the backend is then
  # started by hand (outside the runbook) and a manager writes; 6.7 is typed later for the same dump.
  six6 wt13 "$NIGHTLY" "$(sumof "$NIGHTLY")"
  addev 'WT13 write after an abandoned 6.6'
  n0="$(ev 'WT13 write after an abandoned 6.6')"
  so13="$( [ -s /etc/fixflow/restore-signed-off ] && echo present || echo absent)"
  rb_run wt13-67-stale-same "$G67"
  o13b="$(out_of | tr '\n' ' ' | cut -c1-160)"; n1="$(ev 'WT13 write after an abandoned 6.6')"
  wt "WT13" "a marker left by an earlier restore: (a) one that went through 6.9, then 6.7 again with 6.6 skipped; (b) one abandoned after 6.6, the backend started by hand and a manager write made, then 6.7 for the same dump" \
    "(b) the sign-off file when 6.7 was typed: $so13; the write made after 6.6: $n0 before, $n1 after. (a) a later write: $m0 before, $m1 after; 6.7: $o13a. (b) 6.6: $W66A / $W66B; 6.7: $o13b" \
    "(a) $( [ "$m1" = "$m0" ] && echo '6.9 removed the marker, so the DROP line refused (a script)' || echo 'NOTHING: dropped') ; (b) $( [ "$n1" = "$n0" ] && echo 'refused' || echo "the marker names this dump, so the DROP ran and the write made after 6.6 is gone: what prevents (b) is the text alone (6.1 stops the backend, and only 6.9 writes the sign-off that lets it start)")" \
    "$( [ "$m1" = "$m0" ] && echo 'no for (a)' || echo 'YES for (a)'); (b): $( [ "$n1" = "$n0" ] && echo no || echo 'by design the marker vouches for the dump and the copy, not for the database after it; a write needs the backend running, which the restore gate refuses until 6.9 (WT1). Optional: (b) also records max(job_event.seq) and the DROP line compares it')"
  rm -f $RD/ready-to-drop $RD/proven

  # WT14: a dump damaged BEFORE its sum was recorded (cut at 99 %, its own sum as SUM) passes 6.6 (a)
  # as the text warns; 6.7 drops and the load stops half-way; 6.7 is run again; then the way back.
  T14="damaged99-$NIGHTLY"
  head -c "$(( $(stat -c %s "/srv/l4/dumps/$NIGHTLY") * 99 / 100 ))" "/srv/l4/dumps/$NIGHTLY" > "$RD/$T14"
  addev 'WT14 live write before the failed restore'
  j0="$(psql_app -c 'select count(*) from job_event' 2>/dev/null | tr -d ' ')"
  six6 wt14 "$T14" "$(sha256sum "$RD/$T14" | cut -d' ' -f1)"
  o14p="$W66A / $W66B"; P14="${P:-}"; L14="${L:-}"
  rb_run wt14-67-first "$G67"
  o14a="$(out_of | tail -n 2 | tr '\n' ' ')"; t14a="$(ntables)"
  rb_run wt14-67-again "$G67"
  o14b="$(out_of | tail -n 2 | tr '\n' ' ')"; t14b="$(ntables)"
  # the way back as 6.7 writes it: D = the pre-restore copy 6.6 (b) just made, SUM = its L
  if [ -n "$P14" ] && [ -f "$P14" ]; then
    six6 wt14-back "$(basename "$P14")" "$L14"
    o14c="$W66A / $W66B"
    rb_run wt14-back-67 "$G67"
    o14d="$(out_of | tail -n 2 | tr '\n' ' ')"
  else
    o14c="no pre-restore copy was made (P empty)"; o14d="-"
  fi
  j1="$(psql_app -c 'select count(*) from job_event' 2>/dev/null | tr -d ' ')"
  w14="$(ev 'WT14 live write before the failed restore')"
  wt "WT14" "a dump damaged before its sum was recorded (cut at 99 %): 6.7 stops half-way; 6.7 run again in the same shell; then back to the database as it was (6.7's last paragraph)" \
    "6.6: $o14p; 6.7: $o14a (tables after: $t14a); 6.7 again: $o14b (tables after: $t14b); way back 6.6: $o14c; 6.7: $o14d; job_event rows $j0 before, $j1 after; the live write: $w14" \
    "$( echo "$o14a" | grep -q 'restore exit=0' && echo 'NOTHING: the damaged dump loaded' || echo "6.7's pg_restore --exit-on-error stopped part-way, after the DROP, as 6.6 (a) says it would; the second 6.7 did the same (the text allows it: list and marker unchanged); the backend stays stopped (6.1)")$( [ "$j1" = "$j0" ] && [ "$w14" = 1 ] && echo '; the way back restored every row, the live write included' || echo '; the way back did NOT restore the database as it was')" \
    "$( [ "$j1" = "$j0" ] && [ "$w14" = 1 ] && echo 'no: the copy 6.6 (b) put off the host is the net, and the route back works as written (downtime, not loss)' || echo 'YES: see the step logs')"

  # WT15: the scp fallback. (a) after a FAILED dump (pg_dump exits non-zero part-way); (b) after a
  # good dump whose upload failed, with the laptop's sum right; (c) the same with a wrong laptop sum.
  scp15() { # <id> <laptop sum or 'same'>: the laptop copy is a cp on this host (no laptop here)
    mkdir -p /srv/l4/laptop; cp "$P" /srv/l4/laptop/ 2>/dev/null
    local s; s="$(sha256sum "/srv/l4/laptop/$(basename "$P")" 2>/dev/null | cut -d' ' -f1)"; [ "$2" = same ] || s="$2"
    rb_run "$1" "$(rb_fence 6.6 @b-scp)" "<the sha256 the laptop printed>=$s"
    out_of | tail -n 1
  }
  echo "lab WT15: the laptop of 6.6 (b)'s scp fallback is a directory on the stand-in host (/srv/l4/laptop); its sha256sum stands in for the laptop's" >> "$OUT/deviations.log"
  D="$NIGHTLY"; SUM="$(sumof "$NIGHTLY")"
  rb_run wt15-66a "$(rb_fence 6.6 @a-list)" "<dump file name>=$D" "<the recorded sha256 of that file>=$SUM"
  rb_run wt15-66a-prove "$(rb_fence 6.6 @a-prove)"
  p15="$(out_of | tail -n 1)"
  # (a) pg_dump fails part-way: a wrapper earlier on the postgres container's PATH (removed after)
  ffc exec -T postgres sh -c 'printf "#!/bin/sh\n/usr/lib/postgresql/17/bin/pg_dump \"\$@\" | head -c 65536\nexit 1\n" > /usr/local/bin/pg_dump && chmod +x /usr/local/bin/pg_dump' </dev/null
  echo "lab WT15 (a): pg_dump in the postgres container was made to fail part-way (a wrapper on its PATH that stops after 64 KiB and exits 1), then removed" >> "$OUT/deviations.log"
  rb_run wt15a-save "$(rb_fence 6.6 @b-save)"
  s15a="$(out_of | grep -E '^dump exit=|^STOP|^marker' | tr '\n' ' ')"
  l15a="$(scp15 wt15a-scp same)"
  ffc exec -T postgres rm -f /usr/local/bin/pg_dump </dev/null
  m15a="$( [ -e $RD/ready-to-drop ] && echo present || echo absent)"; rm -f $RD/ready-to-drop
  # (b) a good dump, the upload fails (stand-in bucket stopped), the laptop's sum equals L
  ffc --profile l4s3 stop l4-s3 >/dev/null 2>&1
  rb_run wt15b-save "$(rb_fence 6.6 @b-save)"
  s15b="$(out_of | grep -E '^dump exit=|^STOP|^marker' | tr '\n' ' ')"
  l15b="$(scp15 wt15b-scp same)"; m15b="$(grep -c 'checked-on-laptop' $RD/ready-to-drop 2>/dev/null)"; rm -f $RD/ready-to-drop
  # (c) the same, the laptop printing another sum (a copy that went wrong on the way)
  l15c="$(scp15 wt15c-scp 0000000000000000000000000000000000000000000000000000000000000000)"
  m15c="$( [ -e $RD/ready-to-drop ] && echo present || echo absent)"; rm -f $RD/ready-to-drop $RD/proven
  ffc --profile l4s3 up -d l4-s3 >/dev/null 2>&1; lab_s3_bucket >/dev/null
  wt "WT15" "6.6 (b)'s scp fallback: (a) after a failed pg_dump; (b) after a good dump whose upload failed, laptop sum = L; (c) the same, laptop sum wrong" \
    "6.6 (a): $p15. (a) save: $s15a; scp line: $l15a; marker $m15a. (b) save: $s15b; scp line: $l15b; marker lines naming the laptop: ${m15b:-0}. (c) scp line: $l15c; marker $m15c" \
    "(a) $( [ "$m15a" = absent ] && echo "the fallback line's own test refuses (pg_dump exit not 0)" || echo 'NOTHING: a marker was written for a cut dump'); (b) $( [ "${m15b:-0}" = 1 ] && echo 'marker written, copy on the laptop (the intended path)' || echo 'the intended path did NOT write the marker'); (c) $( [ "$m15c" = absent ] && echo "refused (the laptop's sum is not L)" || echo 'NOTHING: a marker was written on a wrong sum')" \
    "$( [ "$m15a" = absent ] && [ "${m15b:-0}" = 1 ] && [ "$m15c" = absent ] && echo 'no: scripted (the batch'"'"'s fallback line)' || echo 'YES: see the step logs')"
else
  for w in WT13 WT14 WT15; do wt "$w" "needs 6.6's marker chain and scp fallback line" "not in this runbook text" "N/A" "-"; done
fi

# ---- the way back: the pre-restore copy, by the runbook's own route ---------------------------
PRE="$(basename "$(cat "$OUT/pre-restore-file.txt" 2>/dev/null)")"
if [ -n "$PRE" ] && [ -f "/var/lib/fixflow/restore/$PRE" ]; then
  if [ $MARKERS = yes ]; then
    # 6.7's way back as the batch writes it: D and SUM for the pre-restore copy, 6.6 (a) and (b), 6.7
    six6 back "$PRE" "$(sha256sum "$RD/$PRE" | cut -d' ' -f1)"
    ob="$W66A; $W66B"
    rb_run back-67 "$G67"
  else
  rb_run back-66a "$(rb_fence 6.6 1)" "<dump file name>=$PRE"
  ob="$(out_of | tail -n 3 | tr '\n' ' ')"
  rb_run back-67 "$(rb_fence 6.7 1)"
  fi
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
