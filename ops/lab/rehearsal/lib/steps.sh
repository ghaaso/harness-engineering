# shellcheck shell=bash
# The runbook steps, one function per section, shared by restore.sh and train.sh. Each step:
# cut the Do block(s) from the runbook, substitute the placeholders the owner would fill in, run
# it, cut the Check command(s), run them, compare with the runbook's "Expected" text, write a row.
# The judging lines (grep/compare after each Check) are this rehearsal's reading of the
# runbook's Expected prose; the note column quotes what was seen.
# Requires harness.sh. Stand-in values only: example.invalid, the account id `l4lab`, random hex.

DOMAIN=l4lab.example.invalid
# a Check is matched against what the command printed, never against the logged command text
has() { out_of | grep -qF -- "$1"; }
hasre() { out_of | grep -qE -- "$1"; }
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
  # the Expected in full: both lines, and nothing else
  row 1.12 "$( [ "$(out_of | tr '\n' '|')" = '/opt/fixflow/ops/selfhost/bin/ffc|executable|' ] && echo DONE || echo FAILED)" \
    "ln -sfn ffc" "readlink + executable: $(out_of | tr '\n' ' ')"
  rb_run 1.13-do "$(rb_fence 1.13 1)"
  rb_run 1.13-check "$(rb_fence 1.13 2)"
  row 1.13 "$( [ "$(out_of | tr '\n' '|')" = '700 root:root /etc/fixflow|700 root:root /var/lib/fixflow|700 root:root /var/lib/fixflow/drain|755 root:root /var/log/fixflow|' ] && echo DONE || echo FAILED)" \
    "install -d" "$(out_of | tr '\n' ';')"
  rb_run 1.14-do "$(rb_fence 1.14 1)"
  local lrc="$RC"
  rb_run 1.14-check "$(rb_fence 1.14 2)"
  row 1.14 "$( [ "$lrc" = 0 ] && has 'exit=0' && ! hasre 'error:' && has '/var/log/fixflow/*.log' && echo DONE || echo FAILED)" \
    "install the logrotate file; logrotate -d" "$(out_of | grep -E 'exit=|/var/log/fixflow/|error:' | head -n 4 | tr '\n' ';')" \
    "logrotate 3.x of the stand-in host (Alpine), the same configuration syntax as Debian's"
  mkdir -p /run/lock
}

# The migration head a checkout declares: CLAUDE.md's 'head = **NNNN**' at that commit (never a
# number written into the rig: the head moves with every row that carries a migration).
claude_head() { # <git dir> [<rev>]
  git -C "$1" show "${2:-HEAD}:CLAUDE.md" 2>/dev/null | grep -o 'head = \*\*[0-9]\{4\}\*\*' | head -n 1 | grep -o '[0-9]\{4\}'
}

# ---------------------------------------------------------------- section 3
sec3() {
  rb_run 3.1-do "$(rb_fence 3.1 1)"
  rb_run 3.1-check "$(rb_fence 3.1 2)"
  row 3.1 "$( [ "$(grep -c -- '-rw------- 1 root root' "$OLOG")" = 5 ] && echo DONE || echo FAILED)" \
    "install -m 0600 the five templates" "ls -l: $(grep -c -- '-rw------- 1 root root' "$OLOG") of 5 files -rw------- root root"
  row 3.2 NRH "create the dead-man checks at the monitoring service" "-" \
    "needs the off-box monitoring service. Stand-in: a local listener on the stand-in host (127.0.0.1:9999) whose URLs go into heartbeat.env"

  # 3.3: each line is run on its own; the values go straight into the files, never into a log
  local gen="$(rb_fence 3.3 1)" line vals=() n=0
  rb_moved_check 3.3 "$gen" || gen=""
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
  row 3.4 "$(v sh -c "grep -qx 'FIXFLOW_DOMAIN=$DOMAIN' '$OLOG' && grep -qx 'FIXFLOW_BACKUP_ENABLED=false' '$OLOG' && grep -qx 'FIXFLOW_CLOUDFLARED_TAG=2025.11.1' '$OLOG'")" \
    "edit compose.env (domain, cloudflared tag)" "$(out_of | tr '\n' ';')" "cloudflared tag 2025.11.1 (the smoke's); the VERIFY on picking a dated tag was not exercised"

  env_set /etc/fixflow/postgres.env POSTGRES_PASSWORD "$PGPW"
  env_set /etc/fixflow/postgres.env FIXFLOW_APP_DB_PASSWORD "$APPPW"
  rb_run 3.5-check "$(rb_fence 3.5 1)"
  row 3.5 "$(v sh -c "grep -qx 'POSTGRES_PASSWORD 48' '$OLOG' && grep -qx 'FIXFLOW_APP_DB_PASSWORD 48' '$OLOG'")" \
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
  row 3.7 "$(v sh -c "grep -q 'ops token matches' '$OLOG' && grep -q 'FIXFLOW_HEARTBEAT_HEALTH_URL=https://api.$DOMAIN/api/ops/health' '$OLOG'")" \
    "edit ops.env and heartbeat.env" "$(out_of | tr '\n' ';')" "ping URLs point at the stand-in dead-man listener"

  rb_run 3.8-do "$(rb_fence 3.8 1)"
  rb_run 3.8-check "$(rb_fence 3.8 2)"
  local five; five="$(grep -c '^600 root:root /etc/fixflow/' "$OLOG")"
  local repl; repl="$(grep -E '\.env:[0-9]+$' "$OLOG" | grep -vc ':0$')"
  row 3.8 "$( [ "$five" = 5 ] && [ "$repl" = 0 ] && echo DONE || echo FAILED)" "chown/chmod" \
    "stat: $five of 5 '600 root:root'; files with a REPLACE count above 0: $repl ($(grep -E '\.env:[0-9]+$' "$OLOG" | tr '\n' ' '))"
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
  local m04=no
  l4_mut 4.2-backup-on && { m04=yes; env_set /etc/fixflow/compose.env FIXFLOW_BACKUP_ENABLED true; }
  rb_run 4.2 "$(rb_fence 4.2 1)"
  [ $m04 = yes ] && env_set /etc/fixflow/compose.env FIXFLOW_BACKUP_ENABLED false
  local ok=no
  has 'FIXFLOW_ENVIRONMENT: production' && has 'FIXFLOW_BACKUP_PREFIX: backups/db-selfhost/' \
    && has 'FIXFLOW_BACKUP_ENABLED: "false"' && has 'FIXFLOW_ENABLE_DISPATCHER: "false"' \
    && has "https://app.$DOMAIN" && [ "$(out_of | tail -n 1)" = 0 ] && ok=yes
  row 4.2 "$( [ $ok = yes ] && echo DONE || echo FAILED)" "config | grep overrides; ports count" "$(out_of | tr '\n' ';' | sed 's/ \+/ /g')" \
    "the CORS line: $(grep -c CORS "$OLOG") rendered (the VERIFY on env_file inlining is answered: compose v2.33 inlines it)"
  rb_run 4.3-do "$(rb_fence 4.3 1)"
  local brc="$RC"
  cp "$LOG" "$OUT/build-$(git -C /opt/fixflow rev-parse --short HEAD).log"
  rb_run 4.3-check "$(rb_fence 4.3 2)"
  local sha; sha="$(git -C /opt/fixflow rev-parse HEAD)"
  ok=no
  [ "$brc" = 0 ] && grep -q "^fixflow/backend:$sha " "$OLOG" && grep -q "^fixflow/web:$sha " "$OLOG" \
    && grep -q "^fixflow/ops:$sha " "$OLOG" && grep -q '^postgres:17-bookworm' "$OLOG" && grep -q '^cloudflare/cloudflared:2025.11.1' "$OLOG" && ok=yes
  row 4.3 "$( [ $ok = yes ] && echo DONE || echo FAILED)" "pull postgres restore-gate edge; build backend web ops (exit $brc)" \
    "$(out_of | tr '\n' ';')"
  rb_run 4.4 "$(rb_fence 4.4 1)"
  local digs; digs="$(grep -cE '(@sha256:[0-9a-f]{64}|sha256:[0-9a-f]{64})$' "$OLOG")"
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
  [ "$PHASE" = restore-2 ] && l4_mut 6.2-recorded-sum && want_sha="$(printf '%064d' 0)"
  # MARKERS: the runbook batch's marker chain (6.6 writes proven and ready-to-drop, 6.7's DROP
  # line requires them, 6.1 and 6.9 remove them); main's text before it has none
  MARKERS=no; rb_anch 6.7 drop-restore && MARKERS=yes
  local RD=/var/lib/fixflow/restore
  rb_run 6.1-do "$(rb_fence 6.1 @close/1)"
  rb_run 6.1-check "$(rb_span 6.1 'test ! -e')"
  local c1; c1="$(out_of)"
  rb_run 6.1-check2 "$(rb_span 6.1 'ps' 1)"
  local running; running="$(out_of | grep -c ' backend .* Up\| backend-1 .*Up' )"
  local mk="n/a"; [ $MARKERS = yes ] && { [ ! -e $RD/ready-to-drop ] && [ ! -e $RD/proven ] && mk=gone || mk=PRESENT; }
  row "6.1 $tag" "$( [ "$c1" = gate-closed ] && [ "$running" = 0 ] && [ "$mk" != PRESENT ] && echo DONE || echo FAILED)" \
    "rm -f restore-signed-off$( [ $MARKERS = yes ] && echo ' ready-to-drop proven'); ffc stop backend; ffc ps" "$c1; backend rows Up: $running; 6.6's marker and proof: $mk" \
    "the curl-through-the-tunnel 503 check is NRH (no tunnel)"

  rb_run 6.2-do "$(rb_fence 6.2 1)"
  # the scp from the laptop (a comment in the block) is played by a copy on the stand-in host
  cp "/srv/l4/dumps/$DUMPF" "/var/lib/fixflow/restore/$DUMPF"
  echo "lab: 6.2 scp from the laptop played by cp /srv/l4/dumps/$DUMPF /var/lib/fixflow/restore/" >> "$OUT/deviations.log"
  rb_run 6.2-check "$(rb_span 6.2 'sha256sum')" "<dump>=$DUMPF"
  row "6.2 $tag" "$(v grep -q "^$want_sha " "$OLOG")" "install -d restore; (scp played by cp)" \
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
  # The image's head is the one CLAUDE.md declares at the deployed checkout; the runbook's text
  # names a literal head, which goes stale when a migration lands (then the row is AMBIGUOUS).
  # A dump above the image's head must STOP here, as the text says.
  local ch lit v64
  ch="$(claude_head /opt/fixflow)"; lit="$(rb_span 6.4 '(head)')"
  if [ -z "$ch" ] || ! has "$ch (head)"; then v64=FAILED
  elif [ -n "${SEED_HEAD:-}" ] && [ "$((10#$SEED_HEAD))" -gt "$((10#$ch))" ]; then v64=FAILED
  elif [ "$lit" != "$ch (head)" ]; then v64=AMBIGUOUS
  else v64=DONE; fi
  row "6.4 $tag" "$v64" "alembic heads in a one-off backend" "$(out_of | grep -v '^ *$' | tail -n 2 | tr '\n' ';')" \
    "CLAUDE.md at the deployed checkout says head ${ch:-(not found)}; the runbook's text names '$lit'; the dump's head is ${SEED_HEAD:-?}$( [ -n "${SEED_HEAD:-}" ] && [ -n "$ch" ] && [ "$((10#$SEED_HEAD))" -gt "$((10#$ch))" ] && echo ': above the image, so the text says STOP')"

  local o sumline schema tdata live proven="n/a"
  if [ $MARKERS = yes ]; then
    rb_run 6.6a "$(rb_fence 6.6 @a-list)" "<dump file name>=$DUMPF" "<the recorded sha256 of that file>=$want_sha"
  else
    rb_run 6.6a "$(rb_fence 6.6 1)" "<dump file name>=$DUMPF"
  fi
  o="$(out_of)"
  sumline="$(echo "$o" | grep -c "^$want_sha ")"
  schema="$(echo "$o" | grep -A1 '^list exit=' | sed -n 2p)"
  tdata="$(echo "$o" | grep -A2 '^list exit=' | sed -n 3p)"
  if [ $MARKERS = yes ]; then
    rb_run 6.6a-prove "$(rb_fence 6.6 @a-prove)"
    proven=no; has "proven: $DUMPF" && grep -qsx "dump=$DUMPF" $RD/proven && proven=yes
  fi
  ok=no
  [ "$sumline" = 1 ] && echo "$o" | grep -qx 'list exit=0' && [ "$schema" = 0 ] && [ "${tdata:-0}" -gt 30 ] && [ "$proven" != no ] && ok=yes
  row "6.6a $tag" "$( [ $ok = yes ] && echo DONE || echo FAILED)" "prove the dump: cp in, sha256, restore list$( [ $MARKERS = yes ] && echo '; the one-line proof writes proven')" \
    "sha match $sumline; $(echo "$o" | grep '^list exit='); SCHEMA-public entries $schema; TABLE DATA $tdata$( [ $MARKERS = yes ] && echo "; proven: $proven ($(out_of | tail -n 1 | cut -c1-80))")" \
    "D=$DUMPF; TOC SCHEMA lines in the original: $(grep -c 'SCHEMA - public' "$OUT/toc-$DUMPF.txt" 2>/dev/null)"

  if [ $MARKERS = yes ]; then
    rb_run 6.6b-count "$(rb_fence 6.6 @b-count)"
    live="$(out_of | sed -n 's/^live tables: *//p' | tr -d ' \r')"
  else
    rb_run 6.6b-count "$(rb_fence 6.6 2 1p)"
    live="$(out_of | tr -d ' \r')"
  fi
  if [ $MARKERS = yes ] && [ "$live" = 0 ]; then
    rb_run 6.6b-empty "$(rb_fence 6.6 @b-empty)"
    row "6.6b $tag" "$( has "marker: $DUMPF (nothing to save)" && grep -qsx "dump=$DUMPF" $RD/ready-to-drop && echo DONE || echo FAILED)" \
      "count live tables; 0: write the marker" "live tables: 0; $(out_of | tail -n 1)" "the marker: $(tr '\n' ' ' < $RD/ready-to-drop 2>/dev/null)"
    PRE_KEY=""
  elif [ $MARKERS = yes ]; then
    rb_run 6.6b-save "$(rb_fence 6.6 @b-save)"
    o="$(out_of)"
    local td up lsum
    td="$(echo "$o" | grep -A1 '^dump exit=' | sed -n 2p)"
    up="$(echo "$o" | grep '^uploaded key=archive/pre-restore/pre-restore-')"
    lsum="$(echo "$o" | grep -xE '[0-9a-f]{64}' | head -n 1)"
    ok=no
    echo "$o" | grep -qx 'dump exit=0' && [ "${td:-0}" -gt 30 ] && [ -n "$up" ] && echo "$up" | grep -q "sha256=$lsum" \
      && has "marker: $DUMPF (pre-restore copy uploaded)" && grep -qsx "dump=$DUMPF" $RD/ready-to-drop && ok=yes
    PRE_KEY="$(echo "$up" | sed -n 's/^uploaded key=\([^ ]*\).*/\1/p')"
    PRE_FILE="$(ls -t $RD/pre-restore-*.pgdump 2>/dev/null | head -n 1)"
    row "6.6b $tag" "$( [ $ok = yes ] && echo DONE || echo FAILED)" "count $live live tables; pg_dump; TABLE DATA count; sha256; fixflow-r2-put.sh; the marker on one line" \
      "$(echo "$o" | grep '^dump exit='); TABLE DATA $td; $(echo "$up" | cut -c1-110); $(echo "$o" | tail -n 1)" "the marker: $(tr '\n' ' ' < $RD/ready-to-drop 2>/dev/null)"
  elif [ "$live" = 0 ]; then
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

  if [ $MARKERS = yes ]; then rb_run 6.7 "$(rb_fence 6.7 @drop-restore)"; else rb_run 6.7 "$(rb_fence 6.7 1)"; fi
  o="$(out_of)"
  local cnt; cnt="$(echo "$o" | grep -xE '[0-9]+' | head -n 1)"
  row "6.7 $tag" "$( [ "$cnt" = 0 ] && echo "$o" | grep -qx 'restore exit=0' && ! echo "$o" | grep -q '^STOP' && echo DONE || echo FAILED)" \
    "$( [ $MARKERS = yes ] && echo 'the guarded DROP line (marker names D); the count; the guarded pg_restore -L list' || echo 'DROP SCHEMA public CASCADE; CREATE SCHEMA public; pg_restore -L list')" \
    "count after drop $cnt; $(echo "$o" | grep 'restore exit='); STOP lines: $(echo "$o" | grep -c '^STOP')" \
    "$(echo "$o" | grep -m2 -i 'error' | tr '\n' ' ')"
  if [ "$PHASE" = restore-1 ] && l4_mut 6.8-lost-row; then
    local t n
    for t in app_event attendance_ping customer_phone; do
      n="$(psql_app -c "select count(*) from $t" 2>/dev/null)"
      [ "${n:-0}" -gt 0 ] && psql_app -c "delete from $t where ctid = (select ctid from $t limit 1)" >/dev/null 2>&1 \
        && { echo "state mutation 6.8-lost-row: one row of $t deleted" >> "$OUT/mutations-applied.log"; break; }
    done
  fi

  sec6_8 "$tag"

  rb_run 6.9-do "$(rb_fence 6.9 @signoff/1)" "<a|b|c>=$CASE" "<file or none>=$DUMPF" "<sum or none>=$want_sha" "<owner>=l4-rehearsal"
  local up_rc="$RC" upo; upo="$(out_of | tail -n 3 | tr '\n' ';')"
  wait_backend_healthy 150; local healthy=$?
  rb_run 6.9-gate "$(rb_span 6.9 'logs restore-gate')"
  local gate; gate="$(grep -c 'restore gate: signed off' "$OLOG")"
  deep_health > "$OUT/deep-health-6.9-$tag.json"
  local dh="$OUT/deep-health-6.9-$tag.json"
  local env dsp bk pfx gsha db mig
  env="$(jget facts.environment < "$dh")"; dsp="$(jget facts.enable_dispatcher < "$dh")"
  bk="$(jget facts.backup_enabled < "$dh")"; pfx="$(jget facts.backup_prefix < "$dh")"
  gsha="$(jget facts.git_sha < "$dh")"; db="$(jget database.status < <(jget components < "$dh"))"
  mig="$(jget migrations.detail < <(jget components < "$dh"))"
  local cur maxseq before="" mk="n/a"
  if rb_anch 6.9 reseed; then
    # the corrected 6.9 (ruling C42): once healthy, 8.8's forward-only re-seed, then the exact check
    before="$(psql_app -c "select last_seq from dispatch_cursor where consumer = 'whatsapp'" 2>/dev/null)"
    rb_run 6.9-reseed "$(rb_fence 6.9 @reseed)"
    cur="$(out_of | grep '^whatsapp|' | tr -d '\r')"
    maxseq="$(out_of | grep -xE '[0-9]+' | tail -n 1)"
    has 'INSERT 0 1' || cur="$cur (no 'INSERT 0 1')"
    mk=gone; { [ -e $RD/ready-to-drop ] || [ -e $RD/proven ]; } && mk=PRESENT
  else
    rb_run 6.9-cursor "$(rb_span 6.9 'select consumer, last_seq')"
    cur="$(out_of | tr -d '\r')"
    maxseq="$(psql_app -c 'select max(seq) from job_event' 2>/dev/null)"
  fi
  local head; head="$(git -C /opt/fixflow rev-parse HEAD)"
  local base_ok=no
  [ "$up_rc" = 0 ] && [ "$healthy" = 0 ] && [ "$gate" -ge 1 ] && [ "$env" = production ] && [ "$dsp" = False ] \
    && [ "$bk" = False ] && [ "$pfx" = backups/db-selfhost/ ] && [ "$gsha" = "$head" ] && [ "$db" = ok ] && [ "$mk" != PRESENT ] && base_ok=yes
  local verdict=FAILED note=""
  [ -n "$before" ] && note="the re-seed moved the cursor from $before to ${cur#whatsapp|} (max(seq) $maxseq); 6.6's marker and proof: $mk"
  if [ $base_ok = yes ] && [ "$cur" = "whatsapp|$maxseq" ]; then verdict=DONE
  elif [ $base_ok = yes ]; then
    verdict=FAILED
    note="RUNBOOK DEFECT (D1): everything else as expected, but the cursor check expects whatsapp|<max job_event.seq> and reads $cur with max(seq)=$maxseq. 0046 seeded the cursor at the head when the migration ran; events kept arriving with the dispatcher off, and nothing between 6.7 and 6.9 moves it (the re-seed is 8.8, at T_close). Production was deployed at 0046 on 2026-08-02 (docs/RUNBOOK-BACKUPS.md:141), so the real dump most likely shows the same. Fix (binding review, finding 1): 6.9 runs 8.8's forward-only re-seed (GREATEST) once the backend is healthy and keeps this check exact. Loosening the check to 'any N up to max(seq)' would pass a dangerously low cursor."
  fi
  row "6.9 $tag" "$verdict" "write restore-signed-off; ffc \$P_DB --profile app up -d (exit $up_rc)" \
    "gate-log 'signed off' x$gate; healthy=$([ $healthy = 0 ] && echo yes || echo no); environment=$env dispatcher=$dsp backup=$bk prefix=$pfx git_sha=$( [ "$gsha" = "$head" ] && echo "the checkout HEAD ${head:0:7}" || echo "$gsha") database=$db migrations=$mig; cursor=$cur max(seq)=$maxseq" "$note"
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
  # the version must be the dump's own head (SEED_HEAD: the source database's alembic_version,
  # which prep.sh checked against CLAUDE.md at the seed's checkout)
  [ "$qexit" = 1 ] && [ "$diffc" = 0 ] && [ "$ntab" -gt 30 ] && [ -n "${SEED_HEAD:-}" ] && [ "$ver" = "$SEED_HEAD" ] && [ "$pay_src" = "$pay_dst" ] \
    && [ "$led_src" = "$led_dst" ] && [ "$seqok" = yes ] && ok=yes
  # Check 6 is "at or near max(seq)", which no reader can apply the same way twice: a cursor
  # below max(seq) leaves the step AMBIGUOUS (the same reading makes 6.9 stop; finding D1). The
  # binding review's form of check 6, "equals the cursor recorded for this dump", is computed too.
  local cseq mseq; cseq="${curs##*|}"; mseq="$(echo "$o" | awk '/job_event_seq/{print $3; exit}')"
  local src_cur; src_cur="$(cut -d'|' -f1 "$OUT/source-cursor.txt" 2>/dev/null)"
  local exact=no
  rb_text_has 6.8 'equals the `dispatch_cursor` line of P0a' && exact=yes
  if [ $exact = yes ]; then
    # the corrected check 6 (ruling C42): the cursor equals the value recorded for this dump
    [ $ok = yes ] && [ "$cseq" != "$src_cur" ] && ok=no
  else
    [ $ok = yes ] && [ -n "$cseq" ] && [ "$cseq" != "$mseq" ] && ok=amb
  fi
  # check 6: a dump at 0046 or above has the whatsapp row
  case "$ver" in [0-9][0-9][0-9][0-9]) [ "$((10#$ver))" -ge 46 ] && [ -z "$cseq" ] && ok=no ;; *) ok=no ;; esac
  row "6.8 $tag" "$(case $ok in yes) echo DONE ;; amb) echo AMBIGUOUS ;; *) echo FAILED ;; esac)" "appendix-b.sql; the sequence query" \
    "queries exit=0: $qexit; $ntab tables, count lines differing from the source: $diffc; version $ver (the dump's head ${SEED_HEAD:-?}); payments $pay_dst (source $pay_src); ledger|chain|head $led_dst (source $led_src); sequences at/above max: $seqok; cursor $curs; geofence: $(awk '/center_lat/{getline; getline; print; exit}' "$af" | tr -s ' ')" \
    "$( [ $exact = yes ] && echo "check 6 as the runbook states it: the cursor equals the value recorded for this dump ($src_cur): here $curs (max(seq) $mseq)" || echo "check 6 reads 'a 0046 dump has the whatsapp row at or near max(job_event.seq)': here $curs vs max $mseq. In the review's form (equals the value recorded for this dump: $src_cur) it $( [ -n "$cseq" ] && [ "$cseq" = "$src_cur" ] && echo passes || echo fails)")"
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
  local before; before="$(grep 'DEFAULT PIN' "$OLOG" | awk '{print $1}' | tr '\n' ' ')"
  [ "$PHASE" = restore-1 ] && l4_mut 6.13-skip-one && before="${before#* }"
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
    grep -q "PIN set for $id" "$OLOG" || rc_all=1
    unset L4_PIN
  done
  rb_run 6.13-report2 "$(rb_fence 6.13 1 1p)"
  local after; after="$(grep -c 'DEFAULT PIN' "$OLOG")"
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
