#!/usr/bin/env bash
# Design Appendix C without a Docker network: restore a dump into a throwaway PG17 and run the
# Appendix B read-only query set.
#
#   verify-dump.sh [--dry-run] <dump file>
#
# One container, fixflow-p0a-restore (postgres:17-alpine, default bridge, no published port).
# The dump is copied in with docker cp, the empty public schema is dropped first (otherwise
# pg_restore --exit-on-error stops on the benign "schema public already exists", W2 O08-F06),
# then pg_restore --no-owner --no-privileges --exit-on-error, then the Appendix B queries via
# psql -v ON_ERROR_STOP=1. Output: C:/fixflow-dumps/logs/dumpfacts-<stamp>.txt (+ restore-<stamp>.log).
# Prints RESTORE EXIT= and QUERIES EXIT=; exit 0 only when both are 0. The container is always removed.
# If pg_restore -l says the file is plain SQL (a dashboard download): it is loaded into a scratch
# PG17 (fixflow-p0a-scratch), the public schema is re-dumped as custom format next to the original
# (<name>.public.dump) and THAT file is verified (plan P0a item 4).
# --dry-run prints each docker command and runs nothing.
set -u
export MSYS_NO_PATHCONV=1
DRY=0; ARGS=()
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    *) ARGS+=("$a") ;;
  esac
done
set -- "${ARGS[@]+"${ARGS[@]}"}"
DUMP="${1:-}"
[ -n "$DUMP" ] || { sed -n '2,19p' "$0"; exit 2; }

LOGW="C:/fixflow-dumps/logs"; LOGU="/c/fixflow-dumps/logs"
STAMP="$(date +%Y%m%d-%H%M%S)"
C=fixflow-p0a-restore
S=fixflow-p0a-scratch
IMG=postgres:17-alpine
if [ "$DRY" = 1 ]; then LOG=/dev/null; else mkdir -p "$LOGU"; LOG="$LOGU/verify-dump-$STAMP.log"; fi
say() { if [ "$DRY" = 1 ]; then echo "$*"; else echo "$*" | tee -a "$LOG"; fi; }

DUMPU="$(cygpath -u "$DUMP")"
DUMPW="$(cygpath -m "$DUMP")"
if [ ! -f "$DUMPU" ]; then
  if [ "$DRY" = 1 ]; then echo "(dry run: $DUMPW does not exist; a real run refuses)"
  else echo "no such file: $DUMPW" >&2; exit 2; fi
fi

# only ever remove our own fixflow-p0a- containers
cleanup() { [ "$DRY" = 1 ] || docker rm -f "$C" "$S" > /dev/null 2>&1; }
trap cleanup EXIT

run() {
  if [ "$DRY" = 1 ]; then echo "+ $*"; return 0; fi
  echo "+ $*" >> "$LOG"; "$@" >> "$LOG" 2>&1
}
runo() {  # runo FILE CMD...  (stdout+stderr to FILE)
  f="$1"; shift
  if [ "$DRY" = 1 ]; then echo "+ $* > $f 2>&1"; return 0; fi
  echo "+ $* > $f" >> "$LOG"; "$@" > "$f" 2>&1
}
wait_pg() {  # TCP check on 127.0.0.1: the init-phase temporary server listens on the socket only
  [ "$DRY" = 1 ] && { echo "+ (wait until docker exec $1 pg_isready -h 127.0.0.1 succeeds, max 90 s)"; return 0; }
  n=0
  until docker exec "$1" pg_isready -h 127.0.0.1 -U postgres -q >/dev/null 2>&1; do
    n=$((n+1)); [ "$n" -ge 90 ] && { say "RESTORE[db] TIMEOUT waiting for $1"; return 1; }; sleep 1
  done
  sleep 1
}

# ---- Appendix B, verbatim from docs/ORCHESTRATION-DESIGN-2026-10.md lines 670-686 ----
QFILE="$LOGU/appendix-b-$STAMP.sql"
if [ "$DRY" != 1 ]; then cat > "$QFILE" <<'APPENDIX_B'
SELECT shop_id, name, center_lat, center_lng, radius_m, is_active FROM attendance_geofence;
-- exact row counts for every public table (the DB is ~300 KB; count(*) is cheap). pg_stat's n_live_tup is an estimate — never use it for completeness.
SELECT string_agg(format('SELECT %L AS t, count(*) AS n FROM %I', relname, relname), ' UNION ALL ' ORDER BY relname)
FROM pg_class WHERE relkind = 'r' AND relnamespace = 'public'::regnamespace \gexec
SELECT 'attendance_event', max(server_time) FROM attendance_event
UNION ALL SELECT 'attendance_presence_event', max(server_time) FROM attendance_presence_event
UNION ALL SELECT 'attendance_ping', max(received_at) FROM attendance_ping
UNION ALL SELECT 'job_event', max(created_at) FROM job_event;                        -- when the fleet last synced
SELECT confirmed, width_bucket(accuracy_m, 0, 200, 10) AS acc_bucket, count(*) FROM attendance_presence_event GROUP BY 1, 2 ORDER BY 1, 2;
SELECT count(*) AS payments, coalesce(sum(amount_paisa) FILTER (WHERE NOT voided), 0) AS non_voided_paisa FROM job_payment;   -- O-08 §3 baseline: Rs 34,400 non-voided at the 2026-08-02 drill
SELECT (SELECT count(*) FROM staff_ledger) AS ledger_rows, (SELECT count(*) FROM staff_ledger_chain) AS chain_rows, (SELECT max(seq) FROM staff_ledger_chain) AS chain_head_seq;
SELECT max(token) FROM job;   -- compare with job_token_seq below (ADR-0001 A1.4); column is job.token (jobs/models.py)
SELECT consumer, last_seq FROM dispatch_cursor;
SELECT sequencename, last_value FROM pg_sequences WHERE schemaname = 'public';        -- the three standalone sequences (ADR-0001 A1.4) must sit at or above their tables' max
SELECT version_num FROM alembic_version;
APPENDIX_B
fi
QFILEW="$(cygpath -m "$QFILE")"
[ "$DRY" = 1 ] && echo "(dry run: the Appendix B block would be written to $LOGW/appendix-b-$STAMP.sql)"

say "verify-dump $STAMP  dump=$DUMPW  size=$([ -f "$DUMPU" ] && stat -c %s "$DUMPU" || echo n/a) bytes"
[ "$DRY" = 1 ] || docker info --format '{{.ServerVersion}}' > /dev/null 2>&1 || { say "DOCKER_ENGINE_DOWN"; exit 3; }

run docker rm -f "$C" "$S"
run docker run -d --name "$C" -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=fixflow_restore "$IMG"
wait_pg "$C" || exit 2
run docker cp "$DUMPW" "$C:/tmp/prod.dump"

# ---- format check: plain SQL (dashboard download) or custom? ----
if [ "$DRY" = 1 ]; then
  echo "+ docker exec $C pg_restore -l /tmp/prod.dump > $LOGW/pg_restore-list-$STAMP.txt   (format check)"
  echo "(dry run: if that says 'text format', the plain-SQL branch runs: scratch container $S loads the file with psql -f,"
  echo "  pg_dump --format=custom --schema=public --no-owner --no-privileges re-dumps it to <name>.public.dump next to the original, and that file replaces the dump below)"
else
  LISTF="$LOGU/pg_restore-list-$STAMP.txt"
  docker exec "$C" pg_restore -l /tmp/prod.dump > "$LISTF" 2>&1
  lrc=$?
  if [ "$lrc" -ne 0 ] && grep -qi 'text format' "$LISTF"; then
    say "FORMAT: plain SQL (not a custom-format dump). Loading it into a scratch PG17 and re-dumping public as custom format."
    docker run -d --name "$S" -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=fixflow_restore "$IMG" >> "$LOG" 2>&1 || { say "scratch container failed to start"; exit 2; }
    wait_pg "$S" || exit 2
    docker cp "$DUMPW" "$S:/tmp/plain.sql" >> "$LOG" 2>&1
    # no ON_ERROR_STOP: a dashboard file may mention roles/extensions/schemas that do not exist here; errors are counted, not hidden
    docker exec "$S" psql -U postgres -d fixflow_restore -f /tmp/plain.sql > "$LOGU/plain-load-$STAMP.log" 2>&1
    say "plain load: psql exit $?, $(grep -c 'ERROR' "$LOGU/plain-load-$STAMP.log") ERROR lines (see $LOGW/plain-load-$STAMP.log)"
    BASE="${DUMPU%.*}"; NEWU="$BASE.public.dump"; NEWW="$(cygpath -m "$NEWU")"
    docker exec "$S" pg_dump -U postgres -d fixflow_restore --format=custom --schema=public --no-owner --no-privileges -f /tmp/public.dump >> "$LOG" 2>&1 \
      || { say "re-dump of the scratch database failed"; exit 2; }
    docker cp "$S:/tmp/public.dump" "$NEWW" >> "$LOG" 2>&1 || { say "could not copy the re-dump out"; exit 2; }
    say "re-dumped custom-format file: $NEWW ($(stat -c %s "$NEWU") bytes, sha256 $(sha256sum "$NEWU" | cut -d' ' -f1))"
    docker rm -f "$S" > /dev/null 2>&1
    docker cp "$NEWW" "$C:/tmp/prod.dump" >> "$LOG" 2>&1
    docker exec "$C" pg_restore -l /tmp/prod.dump > "$LISTF" 2>&1 || { say "the re-dumped file is not readable by pg_restore -l"; exit 2; }
    DUMPW="$NEWW"
  elif [ "$lrc" -ne 0 ]; then
    say "pg_restore -l failed on the dump (see $LISTF): not verifiable"; exit 2
  fi
  say "pg_restore -l: $(grep -c ' TABLE DATA ' "$LISTF") TABLE DATA entries in $DUMPW"
fi

run docker exec "$C" psql -U postgres -d fixflow_restore -c 'DROP SCHEMA public CASCADE'
RLOG="$LOGW/restore-$STAMP.log"
if [ "$DRY" = 1 ]; then
  echo "+ docker exec $C pg_restore -U postgres -d fixflow_restore --no-owner --no-privileges --exit-on-error /tmp/prod.dump > $RLOG 2>&1"
  echo "RESTORE EXIT=(dry run)"
else
  docker exec "$C" pg_restore -U postgres -d fixflow_restore --no-owner --no-privileges --exit-on-error /tmp/prod.dump > "$LOGU/restore-$STAMP.log" 2>&1
  RRC=$?
  say "RESTORE EXIT=$RRC"
fi

FACTS="$LOGW/dumpfacts-$STAMP.txt"
run docker cp "$QFILEW" "$C:/tmp/b.sql"
if [ "$DRY" = 1 ]; then
  echo "+ docker exec $C psql -U postgres -d fixflow_restore -v ON_ERROR_STOP=1 -f /tmp/b.sql > $FACTS 2>&1"
  echo "QUERIES EXIT=(dry run)"
  echo "(dry run: nothing was executed; the container would be removed with docker rm -f $C)"
  exit 0
fi
docker exec "$C" psql -U postgres -d fixflow_restore -v ON_ERROR_STOP=1 -f /tmp/b.sql > "$LOGU/dumpfacts-$STAMP.txt" 2>&1
QRC=$?
say "QUERIES EXIT=$QRC"
NT="$(docker exec "$C" psql -U postgres -d fixflow_restore -Atc "select count(*) from pg_class where relkind='r' and relnamespace='public'::regnamespace" 2>/dev/null)"
say "PUBLIC TABLES RESTORED=$NT"
say "Appendix B output: $FACTS"
say "restore log:       $RLOG"
[ "$RRC" -ne 0 ] && say "NOTE: RESTORE EXIT is non-zero: the dump facts are PARTIAL (see $RLOG)"
[ "$RRC" -eq 0 ] && [ "$QRC" -eq 0 ] && exit 0
exit 1
