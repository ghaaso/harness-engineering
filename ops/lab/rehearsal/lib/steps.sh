# shellcheck shell=bash
# The runbook steps, one function per section, shared by restore.sh and train.sh. Each step:
# cut the Do block(s) from the runbook, substitute the placeholders the owner would fill in, run
# it, cut the Check command(s), run them, compare with the runbook's "Expected" text, write a row.
# The judging lines (grep/compare after each Check) are this rehearsal's reading of the
# runbook's Expected prose; the note column quotes what was seen.
# Requires harness.sh. Stand-in values only: example.invalid, the account id `l4lab`, random hex.

DOMAIN=l4lab.example.invalid
has() { grep -qF -- "$1" "$LOG"; }
hasre() { grep -qE -- "$1" "$LOG"; }
v() { if "$@"; then echo DONE; else echo FAILED; fi; }

env_set() { # <file> <KEY> <value>   (the owner's editor: replace the KEY= line, keep the rest)
  python3 - "$1" "$2" "$3" <<'PY'
import sys
path, key, val = sys.argv[1:]
lines = open(path).read().splitlines()
done = False
for i, line in enumerate(lines):
    if line.startswith(key + "="):
        lines[i] = f"{key}={val}"
        done = True
        break
if not done:
    lines.append(f"{key}={val}")
open(path, "w").write("\n".join(lines) + "\n")
PY
  echo "edited $1: $2 (value not shown)" >> "$OUT/editor.log"
}
secret() { printf '%s\n' "$1" >> "$L4_SECRETS_FILE"; }

# ---------------------------------------------------------------- section 1 (host prep, 1.11-1.13)
sec1() { # <repo-url> <tag-or-sha>
  rb_run 1.11-do "$(rb_fence 1.11 1)" "<repo-url>=$1" "<tag-or-sha>=$2"
  local r1="$RC"
  rb_run 1.11-check "$(rb_fence 1.11 2)"
  local want; want="$(git -C /opt/fixflow rev-parse "$2^{commit}" 2>/dev/null)"
  local ok=no
  has "$want" && hasre 'rwx.*ffc' && has docker-compose.prod.yml && ok=yes
  [ "$(git -C /opt/fixflow status --porcelain --untracked-files=no | wc -l)" = 0 ] || ok=no
  row 1.11 "$( [ "$r1" = 0 ] && [ $ok = yes ] && echo DONE || echo FAILED)" "git clone of the stand-in origin; checkout $2" \
    "rev-parse = $want, status empty, ffc executable" "repo-url is the stand-in origin /srv/origin.git (the VERIFY on a deploy key does not apply)"
  rb_run 1.12-do "$(rb_fence 1.12 1)"
  rb_run 1.12-check "$(rb_fence 1.12 2)"
  row 1.12 "$(v hasre '^/opt/fixflow/ops/selfhost/bin/ffc$')" "ln -sfn ffc" "readlink + executable: $(out_of | tr '\n' ' ')"
  rb_run 1.13-do "$(rb_fence 1.13 1)"
  rb_run 1.13-check "$(rb_fence 1.13 2)"
  row 1.13 "$(v grep -qc '700 root:root /var/lib/fixflow/drain' "$LOG")" "install -d" "$(out_of | tr '\n' ';')"
  mkdir -p /run/lock
}

# ---------------------------------------------------------------- section 3
sec3() {
  rb_run 3.1-do "$(rb_fence 3.1 1)"
  rb_run 3.1-check "$(rb_fence 3.1 2)"
  row 3.1 "$( [ "$(grep -c -- '-rw------- 1 root root' "$LOG")" = 5 ] && echo DONE || echo FAILED)" \
    "install -m 0600 the five templates" "ls -l: $(grep -c -- '-rw------- 1 root root' "$LOG") of 5 files -rw------- root root"
  row 3.2 NRH "create the dead-man checks at the monitoring service" "-" \
    "needs the off-box monitoring service. Stand-in: a local listener on the stand-in host (127.0.0.1:9999) whose URLs go into heartbeat.env"

  # 3.3: each line is run on its own; the values go straight into the files, never into a log
  local gen="$(rb_fence 3.3 1)" line vals=() n=0
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    vals+=("$(eval "${line%%#*}")")
    n=$((n + 1))
  done <<< "$gen"
  JWT="${vals[0]}"; OPSTOK="${vals[1]}"; OPSSESS="${vals[2]}"; PGPW="${vals[3]}"; APPPW="${vals[4]}"; OPSPW="${vals[5]}"
  for s in "$JWT" "$OPSTOK" "$OPSSESS" "$PGPW" "$APPPW" "$OPSPW"; do secret "$s"; done
  local lens; lens="$(for s in "${vals[@]}"; do printf '%s ' "${#s}"; done)"
  local uniq; uniq="$(printf '%s\n' "${vals[@]}" | sort -u | wc -l)"
  row 3.3 "$( [ "$n" = 6 ] && [ "$uniq" = 6 ] && [ "$lens" = "64 64 64 48 48 24 " ] && echo DONE || echo FAILED)" \
    "the six openssl lines of the block, one at a time" "lengths: $lens; distinct: $uniq" \
    "the Check names the first five lengths (64,64,64,48,48); the sixth (base64 18) is 24"

  env_set /etc/fixflow/compose.env FIXFLOW_DOMAIN "$DOMAIN"
  env_set /etc/fixflow/compose.env FIXFLOW_CLOUDFLARED_TAG 2025.11.1
  rb_run 3.4-check "$(rb_fence 3.4 1)"
  row 3.4 "$(v sh -c "grep -qx 'FIXFLOW_DOMAIN=$DOMAIN' '$LOG' && grep -qx 'FIXFLOW_BACKUP_ENABLED=false' '$LOG' && grep -qx 'FIXFLOW_CLOUDFLARED_TAG=2025.11.1' '$LOG'")" \
    "edit compose.env (domain, cloudflared tag)" "$(out_of | tr '\n' ';')" "cloudflared tag 2025.11.1 (the smoke's); the VERIFY on picking a dated tag was not exercised"

  env_set /etc/fixflow/postgres.env POSTGRES_PASSWORD "$PGPW"
  env_set /etc/fixflow/postgres.env FIXFLOW_APP_DB_PASSWORD "$APPPW"
  rb_run 3.5-check "$(rb_fence 3.5 1)"
  row 3.5 "$(v sh -c "grep -qx 'POSTGRES_PASSWORD 48' '$LOG' && grep -qx 'FIXFLOW_APP_DB_PASSWORD 48' '$LOG'")" \
    "edit postgres.env" "$(out_of | tr '\n' ';')"

  local f=/etc/fixflow/backend.env
  env_set $f FIXFLOW_DATABASE_URL "postgresql+asyncpg://fixflow_app:$APPPW@postgres:5432/fixflow"
  env_set $f FIXFLOW_JWT_SECRET "$JWT"
  env_set $f FIXFLOW_OPS_PROXY_TOKEN "$OPSTOK"
  env_set $f FIXFLOW_CORS_ORIGINS "[\"https://app.$DOMAIN\"]"
  R2SECRET="$(openssl rand -hex 20)"; secret "$R2SECRET"
  env_set $f FIXFLOW_R2_ACCOUNT_ID l4lab
  env_set $f FIXFLOW_R2_ACCESS_KEY_ID l4-standin-key
  env_set $f FIXFLOW_R2_SECRET_ACCESS_KEY "$R2SECRET"
  env_set $f FIXFLOW_R2_BUCKET l4-bucket
  rb_run 3.6-check "$(rb_fence 3.6 1)"
  local ok=no
  has "FIXFLOW_JWT_SECRET 64" && has "FIXFLOW_OPS_PROXY_TOKEN 64" && has "db password matches" \
    && hasre '^0$' && has "restore gate: backend.env OK" && ok=yes
  row 3.6 "$( [ $ok = yes ] && echo DONE || echo FAILED)" "edit backend.env (URL, JWT, ops token, CORS, four stand-in R2 values)" \
    "$(out_of | tr '\n' ';')" "R2 values are stand-ins: account l4lab, bucket l4-bucket (the stand-in bucket on the stand-in host)"

  env_set /etc/fixflow/ops.env OPS_PASSWORD "$OPSPW"
  env_set /etc/fixflow/ops.env OPS_SESSION_SECRET "$OPSSESS"
  env_set /etc/fixflow/ops.env OPS_PROXY_TOKEN "$OPSTOK"
  env_set /etc/fixflow/ops.env OPS_HEALTH_TARGETS "api|https://api.$DOMAIN/api/health,web|https://app.$DOMAIN/"
  env_set /etc/fixflow/heartbeat.env FIXFLOW_HEARTBEAT_HEALTH_URL "https://api.$DOMAIN/api/ops/health"
  env_set /etc/fixflow/heartbeat.env FIXFLOW_HEARTBEAT_PING_URL "http://127.0.0.1:9999/ping/heartbeat"
  env_set /etc/fixflow/heartbeat.env FIXFLOW_HOURLY_DUMP_PING_URL "http://127.0.0.1:9999/ping/hourly-dump"
  rb_run 3.7-check "$(rb_fence 3.7 1)"
  row 3.7 "$(v sh -c "grep -q 'ops token matches' '$LOG' && grep -q 'FIXFLOW_HEARTBEAT_HEALTH_URL=https://api.$DOMAIN/api/ops/health' '$LOG'")" \
    "edit ops.env and heartbeat.env" "$(out_of | tr '\n' ';')" "ping URLs point at the stand-in dead-man listener"

  rb_run 3.8-do "$(rb_fence 3.8 1)"
  rb_run 3.8-check "$(rb_fence 3.8 2)"
  local five; five="$(grep -c '^600 root:root /etc/fixflow/' "$LOG")"
  local repl; repl="$(grep -E '\.env:[0-9]+$' "$LOG" | grep -vc ':0$')"
  row 3.8 "$( [ "$five" = 5 ] && [ "$repl" = 0 ] && echo DONE || echo FAILED)" "chown/chmod" \
    "stat: $five of 5 '600 root:root'; files with a REPLACE count above 0: $repl ($(grep -E '\.env:[0-9]+$' "$LOG" | tr '\n' ' '))"
  rb_run 3.9-check "$(rb_fence 3.9 2 1p)"
  row 3.9 NRH "scp the env files to the laptop, password-manager vault, printed sheet" \
    "host half of the check ran: $(out_of | wc -l) fingerprints of 12 characters" "needs the owner's laptop and vault"
}

# ---------------------------------------------------------------- section 4
sec4_profiles() { # the profile sets, then the one lab change: no edge (it needs a real tunnel)
  rb_run 4.0-profiles "$(rb_fence 4 1)"
  P_RUN="--profile db --profile app --profile web"
  echo "lab: P_RUN without --profile edge (cloudflared needs a real tunnel); P_ALL unchanged for config/pull/build" >> "$OUT/deviations.log"
}
sec4() {
  sec4_profiles
  rb_run 4.1 "$(rb_fence 4.1 1)"
  row 4.1 "$( [ "$(out_of)" = "exit=0" ] && echo DONE || echo FAILED)" "ffc \$P_ALL config -q" "$(out_of | tr '\n' ';')"
  rb_run 4.2 "$(rb_fence 4.2 1)"
  local ok=no
  has 'FIXFLOW_ENVIRONMENT: production' && has 'FIXFLOW_BACKUP_PREFIX: backups/db-selfhost/' \
    && has 'FIXFLOW_BACKUP_ENABLED: "false"' && has 'FIXFLOW_ENABLE_DISPATCHER: "false"' \
    && has "https://app.$DOMAIN" && [ "$(out_of | tail -n 1)" = 0 ] && ok=yes
  row 4.2 "$( [ $ok = yes ] && echo DONE || echo FAILED)" "config | grep overrides; ports count" "$(out_of | tr '\n' ';' | sed 's/ \+/ /g')" \
    "the CORS line: $(grep -c CORS "$LOG") rendered (the VERIFY on env_file inlining is answered: compose v2.33 inlines it)"
  rb_run 4.3-do "$(rb_fence 4.3 1)"
  local brc="$RC"
  cp "$LOG" "$OUT/build-$(git -C /opt/fixflow rev-parse --short HEAD).log"
  rb_run 4.3-check "$(rb_fence 4.3 2)"
  local sha; sha="$(git -C /opt/fixflow rev-parse HEAD)"
  ok=no
  [ "$brc" = 0 ] && grep -q "^fixflow/backend:$sha " "$LOG" && grep -q "^fixflow/web:$sha " "$LOG" \
    && grep -q "^fixflow/ops:$sha " "$LOG" && grep -q '^postgres:17-bookworm' "$LOG" && grep -q '^cloudflare/cloudflared:2025.11.1' "$LOG" && ok=yes
  row 4.3 "$( [ $ok = yes ] && echo DONE || echo FAILED)" "pull postgres restore-gate edge; build backend web ops (exit $brc)" \
    "$(out_of | tr '\n' ';')"
  rb_run 4.4 "$(rb_fence 4.4 1)"
  local digs; digs="$(grep -cE '(@sha256:[0-9a-f]{64}|sha256:[0-9a-f]{64})$' "$LOG")"
  row 4.4 "$( [ "$digs" = 5 ] && ls /var/lib/fixflow/image-digests-*.txt >/dev/null 2>&1 && echo DONE || echo FAILED)" \
    "record the digests" "$digs of 5 digest lines; file $(ls /var/lib/fixflow/image-digests-*.txt 2>/dev/null | tail -n 1)"
  sec4_5 "4.5 (nothing running)"
}
sec4_5() { # <label>
  rb_run 4.5 "$(rb_fence 4.5 1)"
  local ok=no
  has 'published=1' && has 'proxy=1' && ! grep -q -- '->' <(out_of | grep -v '^published=') && ok=yes
  row "$1" "$( [ $ok = yes ] && echo DONE || echo FAILED)" "docker ps ports; ss docker-proxy" "$(out_of | tr '\n' ';')" \
    "the stand-in host's own sockets are not sshd (a container); the check that matters is no '->' and no docker-proxy"
}

# ---------------------------------------------------------------- section 6
# sec6 <pass label> <dump file> <case a|b>
sec6() {
  local tag="$1" DUMPF="$2" CASE="$3"
  local want_sha; want_sha="$(grep " $DUMPF\$" "$OUT/dumps.sha256" | cut -d' ' -f1)"
  rb_run 6.1-do "$(rb_fence 6.1 1)"
  rb_run 6.1-check "$(rb_span 6.1 'test ! -e')"
  local c1; c1="$(out_of)"
  rb_run 6.1-check2 "$(rb_span 6.1 'ps' 1)"
  local running; running="$(out_of | grep -c ' backend .* Up\| backend-1 .*Up' )"
  row "6.1 $tag" "$( [ "$c1" = gate-closed ] && [ "$running" = 0 ] && echo DONE || echo FAILED)" \
    "rm -f restore-signed-off; ffc stop backend; ffc ps" "$c1; backend rows Up: $running" \
    "the curl-through-the-tunnel 503 check is NRH (no tunnel)"

  rb_run 6.2-do "$(rb_fence 6.2 1)"
  # the scp from the laptop (a comment in the block) is played by a copy on the stand-in host
  cp "/srv/l4/dumps/$DUMPF" "/var/lib/fixflow/restore/$DUMPF"
  echo "lab: 6.2 scp from the laptop played by cp /srv/l4/dumps/$DUMPF /var/lib/fixflow/restore/" >> "$OUT/deviations.log"
  rb_run 6.2-check "$(rb_span 6.2 'sha256sum')" "<dump>=$DUMPF"
  row "6.2 $tag" "$(v grep -q "^$want_sha " "$LOG")" "install -d restore; (scp played by cp)" \
    "sha256 $(out_of | cut -c1-16)… vs recorded $(echo "$want_sha" | cut -c1-16)…" "recorded sha = dumps.sha256 from prep (P0a's role)"

  rb_run 6.3-do "$(rb_fence 6.3 1)"
  local i
  for i in $(seq 1 60); do
    rb_run 6.3-check "$(rb_fence 6.3 2)"
    [ "$(out_of | head -n 1)" = healthy ] && break
    sleep 2
  done
  local ok=no
  [ "$(out_of | sed -n 1p)" = healthy ] && [ "$(out_of | sed -n 2p)" = 'fixflow_app|fixflow_app|false' ] \
    && out_of | sed -n 3p | grep -q '^17\.' && ok=yes
  row "6.3 $tag" "$( [ $ok = yes ] && echo DONE || echo FAILED)" "ffc \$P_DB up -d" "$(out_of | tr '\n' ';')"

  rb_run 6.4 "$(rb_fence 6.4 1)"
  row "6.4 $tag" "$(v has '0046 (head)')" "alembic heads in a one-off backend" "$(out_of | grep -v '^ *$' | tail -n 2 | tr '\n' ';')"

  rb_run 6.6a "$(rb_fence 6.6 1)" "<dump file name>=$DUMPF"
  local o; o="$(out_of)"
  local sumline schema tdata
  sumline="$(echo "$o" | grep -c "^$want_sha ")"
  schema="$(echo "$o" | grep -A1 '^list exit=' | sed -n 2p)"
  tdata="$(echo "$o" | grep -A2 '^list exit=' | sed -n 3p)"
  ok=no
  [ "$sumline" = 1 ] && echo "$o" | grep -qx 'list exit=0' && [ "$schema" = 0 ] && [ "${tdata:-0}" -gt 30 ] && ok=yes
  row "6.6a $tag" "$( [ $ok = yes ] && echo DONE || echo FAILED)" "prove the dump: cp in, sha256, restore list" \
    "sha match $sumline; $(echo "$o" | grep '^list exit='); SCHEMA-public entries $schema; TABLE DATA $tdata" \
    "D=$DUMPF; TOC SCHEMA lines in the original: $(grep -c 'SCHEMA - public' "$OUT/toc-$DUMPF.txt" 2>/dev/null)"

  rb_run 6.6b-count "$(rb_fence 6.6 2 1p)"
  local live; live="$(out_of | tr -d ' \r')"
  if [ "$live" = 0 ]; then
    row "6.6b $tag" DONE "count live tables" "count 0: 'pre-restore: empty, no copy'"
    PRE_KEY=""
  else
    rb_run 6.6b-copy "$(rb_fence 6.6 2 '3,$p')"
    o="$(out_of)"
    local td up
    td="$(echo "$o" | grep -A1 '^dump exit=' | sed -n 2p)"
    up="$(echo "$o" | grep '^uploaded key=archive/pre-restore/pre-restore-')"
    local lsum; lsum="$(echo "$o" | grep -E '^[0-9a-f]{64} ' | cut -d' ' -f1)"
    ok=no
    echo "$o" | grep -qx 'dump exit=0' && [ "${td:-0}" -gt 30 ] && [ -n "$up" ] && echo "$up" | grep -q "sha256=$lsum" && ok=yes
    PRE_KEY="$(echo "$up" | sed -n 's/^uploaded key=\([^ ]*\).*/\1/p')"
    PRE_FILE="$(ls -t /var/lib/fixflow/restore/pre-restore-*.pgdump 2>/dev/null | head -n 1)"
    row "6.6b $tag" "$( [ $ok = yes ] && echo DONE || echo FAILED)" "count $live live tables; pg_dump; TABLE DATA count; sha256; fixflow-r2-put.sh" \
      "$(echo "$o" | grep '^dump exit='); TABLE DATA $td; $(echo "$up" | cut -c1-120)" "uploaded to the stand-in bucket"
  fi

  rb_run 6.7 "$(rb_fence 6.7 1)"
  o="$(out_of)"
  local cnt; cnt="$(echo "$o" | grep -xE '[0-9]+' | head -n 1)"
  row "6.7 $tag" "$( [ "$cnt" = 0 ] && echo "$o" | grep -qx 'restore exit=0' && echo DONE || echo FAILED)" \
    "DROP SCHEMA public CASCADE; CREATE SCHEMA public; pg_restore -L list" "count after drop $cnt; $(echo "$o" | grep 'restore exit=')" \
    "$(echo "$o" | grep -m2 -i 'error' | tr '\n' ' ')"

  sec6_8 "$tag"

  rb_run 6.9-do "$(rb_fence 6.9 1)" "<a|b|c>=$CASE" "<file or none>=$DUMPF" "<sum or none>=$want_sha" "<owner>=l4-rehearsal"
  local up_rc="$RC" upo; upo="$(out_of | tail -n 3 | tr '\n' ';')"
  wait_backend_healthy 150; local healthy=$?
  rb_run 6.9-gate "$(rb_span 6.9 'logs restore-gate')"
  local gate; gate="$(grep -c 'restore gate: signed off' "$LOG")"
  deep_health > "$OUT/deep-health-6.9-$tag.json"
  local dh="$OUT/deep-health-6.9-$tag.json"
  local env dsp bk pfx gsha db mig
  env="$(jget facts.environment < "$dh")"; dsp="$(jget facts.enable_dispatcher < "$dh")"
  bk="$(jget facts.backup_enabled < "$dh")"; pfx="$(jget facts.backup_prefix < "$dh")"
  gsha="$(jget facts.git_sha < "$dh")"; db="$(jget database.status < <(jget components < "$dh"))"
  mig="$(jget migrations.detail < <(jget components < "$dh"))"
  rb_run 6.9-cursor "$(rb_span 6.9 'select consumer, last_seq')"
  local cur; cur="$(out_of | tr -d '\r')"
  local maxseq; maxseq="$(psql_app -c 'select max(seq) from job_event' 2>/dev/null)"
  local head; head="$(git -C /opt/fixflow rev-parse HEAD)"
  local base_ok=no
  [ "$up_rc" = 0 ] && [ "$healthy" = 0 ] && [ "$gate" -ge 1 ] && [ "$env" = production ] && [ "$dsp" = False ] \
    && [ "$bk" = False ] && [ "$pfx" = backups/db-selfhost/ ] && [ "$gsha" = "$head" ] && [ "$db" = ok ] && base_ok=yes
  local verdict=FAILED note=""
  if [ $base_ok = yes ] && [ "$cur" = "whatsapp|$maxseq" ]; then verdict=DONE
  elif [ $base_ok = yes ]; then
    verdict=FAILED
    note="RUNBOOK DEFECT CANDIDATE: everything else as expected, but the cursor check expects whatsapp|<max job_event.seq> and reads $cur with max(seq)=$maxseq. Nothing between 6.7 and 6.9 moves the cursor: migration 0046 is already applied in this dump, so it does not re-seed, and the re-seed is 8.8 (at T_close)."
  fi
  row "6.9 $tag" "$verdict" "write restore-signed-off; ffc \$P_DB --profile app up -d (exit $up_rc)" \
    "gate-log 'signed off' x$gate; healthy=$([ $healthy = 0 ] && echo yes || echo no); environment=$env dispatcher=$dsp backup=$bk prefix=$pfx git_sha=$( [ "$gsha" = "$head" ] && echo HEAD || echo "$gsha") database=$db migrations=$mig; cursor=$cur max(seq)=$maxseq" "$note"
}

sec6_8() { # <tag>  Appendix B against the source's facts
  local tag="$1"
  rb_run 6.8 "$(rb_fence 6.8 1)"
  local o; o="$(out_of)"
  local af; af="$(ls -t /var/lib/fixflow/restore/appendix-b-*.txt 2>/dev/null | head -n 1)"
  cp "$af" "$OUT/appendix-b-$tag.txt" 2>/dev/null
  local qexit; qexit="$(echo "$o" | grep -c '^queries exit=0$')"
  # 3. the count blocks: lines "<table> | <n>" between the geofence block and the max(time) block
  counts() { awk -F'|' 'NF==2 && $1 ~ /^ [a-z_]+ +$/ && $2 ~ /^ +[0-9]+$/ {gsub(/ /,""); print $1"|"$2}' "$1" | sort; }
  local diffc; diffc="$(diff <(counts "$OUT/dumpfacts-standin.txt") <(counts "$af") | grep -c '^[<>]')"
  local ntab; ntab="$(counts "$af" | wc -l)"
  local ver; ver="$(awk '/version_num/{getline; getline; print $1; exit}' "$af")"
  local pay_src pay_dst
  pay_src="$(awk '/non_voided_paisa/{getline; getline; print; exit}' "$OUT/dumpfacts-standin.txt" | tr -d ' ')"
  pay_dst="$(awk '/non_voided_paisa/{getline; getline; print; exit}' "$af" | tr -d ' ')"
  local led_src led_dst
  led_src="$(awk '/ledger_rows/{getline; getline; print; exit}' "$OUT/dumpfacts-standin.txt" | tr -d ' ')"
  led_dst="$(awk '/ledger_rows/{getline; getline; print; exit}' "$af" | tr -d ' ')"
  local seqok=yes l
  while read -r l; do
    set -- $l
    [ "$#" = 3 ] || { seqok=no; continue; }
    [ "${3:-0}" = "" ] && continue
    [ "$2" -ge "${3:-0}" ] || seqok=no
  done < <(echo "$o" | grep '_seq ')
  local curs; curs="$(awk '/consumer \| last_seq/{getline; getline; print; exit}' "$af" | tr -d ' ')"
  local ok=no
  [ "$qexit" = 1 ] && [ "$diffc" = 0 ] && [ "$ntab" -gt 30 ] && [ "$ver" = 0046 ] && [ "$pay_src" = "$pay_dst" ] \
    && [ "$led_src" = "$led_dst" ] && [ "$seqok" = yes ] && ok=yes
  row "6.8 $tag" "$( [ $ok = yes ] && echo DONE || echo FAILED)" "appendix-b.sql; the sequence query" \
    "queries exit=0: $qexit; $ntab tables, count lines differing from the source: $diffc; version $ver; payments $pay_dst (source $pay_src); ledger|chain|head $led_dst (source $led_src); sequences at/above max: $seqok; cursor $curs; geofence: $(awk '/center_lat/{getline; getline; print; exit}' "$af" | tr -s ' ')" \
    "check 6 reads 'a 0046 dump has the whatsapp row at or near max(job_event.seq)': here $curs vs max $(echo "$o" | awk '/job_event_seq/{print $3}')"
}

sec6_tail() { # 6.10-6.14 after a case-a restore
  row 6.10 N/A "case c only" "-" "the rehearsal is case a; the smoke (P3a) ran its setval"
  rb_run 6.11-check "$(rb_fence 6.11 1)" "<t1 t2 t3 ...>=t1 t2 t3 t4 t5 t6 t7"
  local miss; miss="$(out_of | tr '\n' ' ' | sed 's/ $//')"
  rb_run 6.11-create "$(rb_fence 6.11 2)" "<id>=t7" "<Display Name>=Lab Tech Seven"
  local crc="$RC"
  rb_run 6.11-recheck "$(rb_fence 6.11 1)" "<t1 t2 t3 ...>=t1 t2 t3 t4 t5 t6 t7"
  row 6.11 "$( [ "$miss" = t7 ] && [ "$crc" = 0 ] && [ -z "$(out_of)" ] && echo DONE || echo FAILED)" \
    "roster check (roster t1..t7, t7 never synced); create t7" "missing before: [$miss]; create exit $crc; missing after: [$(out_of | tr '\n' ' ')]" \
    "the roster list stands in for P0a item 5"
  rb_run 6.12-do "$(rb_fence 6.12 1)" "<lat>=24.8600" "<lng>=67.0000"
  local frc="$RC"
  wait_backend_healthy 120
  rb_run 6.12-check "$(rb_fence 6.12 2)"
  local fence_ok
  fence_ok="$(out_of | python3 -c 'import sys
rows = [l.strip().split("|") for l in sys.stdin if l.strip()]
print("yes" if len(rows) == 1 and [float(x) for x in rows[0]] == [24.86, 67.0, 80.0] else "no")' 2>/dev/null)"
  row 6.12 "$( [ "$frc" = 0 ] && [ "$fence_ok" = yes ] && echo DONE || echo FAILED)" \
    "fence update + force-recreate backend" "rows: [$(out_of | tr '\n' ' ')] (exit $frc)" \
    "typed 24.8600 / 67.0000; Postgres prints them as numbers (24.86|67|80), compared numerically"
  sec6_13
  row 6.14 NRH "route api. to the backend (5.9)" "-" "needs the Cloudflare tunnel"
}

sec6_13() {
  rb_run 6.13-report "$(rb_fence 6.13 1 1p)"
  local before; before="$(grep 'DEFAULT PIN' "$LOG" | awk '{print $1}' | tr '\n' ' ')"
  local set_line; set_line="$(rb_fence 6.13 1 2p)"
  local id rc_all=0
  for id in $before; do
    local pin; pin="$(python3 -c 'import secrets; print("".join(str(secrets.randbelow(10)) for _ in range(6)))')"
    case "$pin" in 123456|000000) pin=482917 ;; esac
    secret "$pin"
    echo "$id stand-in PIN set (value in no file)" >> "$OUT/editor.log"
    # the script prompts twice on a terminal: typist.py gives it one and types the PIN at each prompt
    export L4_PIN="$pin"
    rb_run "6.13-set-$id" "$set_line" "<id>=$id" "ffc exec backend=python3 /srv/l4/kit/lib/typist.py ffc exec backend"
    grep -q "PIN set for $id" "$LOG" || rc_all=1
    unset L4_PIN
  done
  rb_run 6.13-report2 "$(rb_fence 6.13 1 1p)"
  local after; after="$(grep -c 'DEFAULT PIN' "$LOG")"
  deep_health > "$OUT/deep-health-6.13.json"
  local dflt; dflt="$(python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); print(sum(1 for a in d.get("accounts",[]) if a["active"] and a["default_pin_active"]))' "$OUT/deep-health-6.13.json" 2>/dev/null)"
  row 6.13 "$( [ "$rc_all" = 0 ] && [ "$after" = 0 ] && [ "$dflt" = 0 ] && echo DONE || echo FAILED)" \
    "set_pin --report; set_pin --tech <id> --apply (interactive, twice) for: $before" \
    "report after: $after on a seed PIN; deep health active accounts with default_pin_active: $dflt" \
    "the interactive prompt was answered through a pty (lib/typist.py) at each prompt; PINs are random stand-ins kept in no file"
}

# The stand-in dead-man listener and the stand-in bucket (lab setup, not runbook steps).
lab_up() {
  nohup python3 /srv/l4/kit/lib/deadman.py "$OUT/deadman.log" >/dev/null 2>&1 &
  : > "$OUT/deadman.log"
  ffc --profile l4s3 up -d l4-s3 > "$OUT/s3-up.log" 2>&1
  sleep 3
  ffc --profile db --profile app run --rm --no-deps -T --entrypoint python backend -c \
    "from app.core.storage import get_storage; s=get_storage(); s._client.create_bucket(Bucket=s._bucket, CreateBucketConfiguration={'LocationConstraint': 'auto'}); print('bucket', s._bucket)" \
    >> "$OUT/s3-up.log" 2>&1 || { echo "stand-in bucket could not be created"; tail -5 "$OUT/s3-up.log"; return 1; }
}
