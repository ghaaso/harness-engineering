#!/usr/bin/env bash
# P0a item 4: dump the old Supabase database through the SESSION pooler, then verify the dump.
#
#   FIXFLOW_SUPABASE_URL='postgresql://postgres.<ref>:<pw>@<pooler-host>:5432/postgres' \
#     supabase-dump.sh [--dry-run] [--upload <account-id> <bucket>]
#
# The connection string is read from the environment ONLY and is passed to the container by
# name (-e), so it never appears in a command line, a log or this script's output.
# 1. pg_dump (postgres:17-alpine, custom format, --schema=public --no-owner --no-privileges)
#    into C:/fixflow-dumps/supabase-<date>.dump
# 2. prints sha256 and size; runs pg_restore -l on it as a sanity check
# 3. runs verify-dump.sh on it (Appendix C restore + Appendix B queries)
# 4. with --upload (needs AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY): copies the dump to
#    s3://<bucket>/archive/pre-selfhost/ (additive)
# Optional FF_PGDUMP_NETWORK (for tests only), e.g. container:fixflow-p0a-src, adds --network to
# the pg_dump container so it can reach a sibling container at localhost.
# Use the session pooler (port 5432), never the transaction pooler (6543).
set -u
export MSYS_NO_PATHCONV=1
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DRY=0; UPLOAD=0; ARGS=()
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    --upload) UPLOAD=1 ;;
    *) ARGS+=("$a") ;;
  esac
done
set -- "${ARGS[@]+"${ARGS[@]}"}"
ACCT=""; BUCKET=""
if [ "$UPLOAD" = 1 ]; then
  ACCT="${1:-}"; BUCKET="${2:-}"
  [ -n "$ACCT" ] && [ -n "$BUCKET" ] || { sed -n '2,18p' "$0"; exit 2; }
  case "$ACCT$BUCKET" in
    *[!A-Za-z0-9._-]*) echo "account id / bucket: letters, digits, . _ - only" >&2; exit 2 ;;
  esac
fi

URL="${FIXFLOW_SUPABASE_URL:-}"
if [ -z "$URL" ]; then
  if [ "$DRY" = 1 ]; then echo "(dry run: FIXFLOW_SUPABASE_URL is not set; a real run refuses without it)"
  else echo "REFUSED: export FIXFLOW_SUPABASE_URL (session-pooler connection string) first." >&2; exit 2; fi
else
  case "$URL" in postgres://*|postgresql://*) ;; *) echo "FIXFLOW_SUPABASE_URL must start with postgresql://" >&2; exit 2 ;; esac
  PORT="$(printf '%s' "$URL" | sed -n 's#^[a-z]*://[^@]*@[^:/]*:\([0-9]*\).*#\1#p')"
  [ "$PORT" = 6543 ] && { echo "REFUSED: port 6543 is the transaction pooler; use the session pooler on 5432." >&2; exit 2; }
fi
if [ "$UPLOAD" = 1 ] && { [ -z "${AWS_ACCESS_KEY_ID:-}" ] || [ -z "${AWS_SECRET_ACCESS_KEY:-}" ]; }; then
  if [ "$DRY" = 1 ]; then echo "(dry run: AWS_* variables are not set; a real --upload refuses without them)"
  else echo "REFUSED: --upload needs AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in the environment." >&2; exit 2; fi
fi

OUTW="C:/fixflow-dumps"; OUTU="/c/fixflow-dumps"
STAMP="$(date +%Y%m%d-%H%M%S)"
NAME="supabase-$(date +%Y%m%d).dump"
if [ "$DRY" != 1 ] && [ -e "$OUTU/$NAME" ]; then NAME="supabase-$(date +%Y%m%d-%H%M%S).dump"; fi
if [ "$DRY" = 1 ]; then LOG=/dev/null; else mkdir -p "$OUTU/logs"; LOG="$OUTU/logs/supabase-dump-$STAMP.log"; fi
say() { if [ "$DRY" = 1 ]; then echo "$*"; else echo "$*" | tee -a "$LOG"; fi; }
fail() { say ""; say "######## FAIL: $* ########"; exit 1; }
run() {
  if [ "$DRY" = 1 ]; then echo "+ $*"; return 0; fi
  echo "+ $*" >> "$LOG"; "$@" >> "$LOG" 2>&1
}

NETARG=()
[ -n "${FF_PGDUMP_NETWORK:-}" ] && NETARG=(--network "$FF_PGDUMP_NETWORK")

say "step 1: pg_dump to $OUTW/$NAME"
[ "$DRY" = 1 ] || mkdir -p "$OUTU"
if [ "$DRY" = 1 ]; then
  echo "+ docker run --rm ${NETARG[*]:-} -v $OUTW:/out -e FIXFLOW_SUPABASE_URL postgres:17-alpine sh -c 'pg_dump \"\$FIXFLOW_SUPABASE_URL\" --format=custom --schema=public --no-owner --no-privileges -f /out/$NAME'"
else
  echo "+ docker run --rm ${NETARG[*]:-} -v $OUTW:/out -e FIXFLOW_SUPABASE_URL postgres:17-alpine pg_dump <url from env> ... -f /out/$NAME" >> "$LOG"
  docker run --rm "${NETARG[@]}" -v "$OUTW:/out" -e FIXFLOW_SUPABASE_URL postgres:17-alpine \
    sh -c "pg_dump \"\$FIXFLOW_SUPABASE_URL\" --format=custom --schema=public --no-owner --no-privileges -f /out/$NAME" >> "$LOG" 2>&1 \
    || { rm -f "$OUTU/$NAME"; fail "pg_dump failed (details, without the connection string, in $LOG)"; }
  [ -s "$OUTU/$NAME" ] || fail "pg_dump produced an empty file"
fi

say "step 2: sha256, size, pg_restore -l"
if [ "$DRY" = 1 ]; then
  echo "+ sha256sum $OUTU/$NAME"
  echo "+ stat -c %s $OUTU/$NAME"
  echo "+ docker run --rm -v $OUTW:/out postgres:17-alpine pg_restore -l /out/$NAME"
else
  say "sha256: $(sha256sum "$OUTU/$NAME" | cut -d' ' -f1)  $OUTW/$NAME"
  say "size:   $(stat -c %s "$OUTU/$NAME") bytes"
  LISTF="$OUTU/logs/pg_restore-list-$STAMP.txt"
  docker run --rm -v "$OUTW:/out" postgres:17-alpine pg_restore -l "/out/$NAME" > "$LISTF" 2>> "$LOG" \
    || fail "pg_restore -l could not read the dump (not a custom-format file?)"
  say "pg_restore -l: $(grep -c ' TABLE DATA ' "$LISTF") TABLE DATA entries, $(wc -l < "$LISTF") lines (saved $LISTF)"
fi

say "step 3: verify-dump.sh"
VF=()
[ "$DRY" = 1 ] && VF=(--dry-run)
bash "$HERE/verify-dump.sh" "${VF[@]}" "$OUTW/$NAME"
VRC=$?
say "verify-dump.sh exit: $VRC"

if [ "$UPLOAD" = 1 ]; then
  say "step 4: upload to s3://$BUCKET/archive/pre-selfhost/ (additive)"
  EP="https://$ACCT.r2.cloudflarestorage.com"
  run docker run --rm -v "$OUTW:/up" -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION=auto \
    amazon/aws-cli --endpoint-url "$EP" s3 cp "/up/$NAME" "s3://$BUCKET/archive/pre-selfhost/" \
    || fail "upload failed"
fi
[ "$DRY" = 1 ] && { echo "(dry run: nothing was executed)"; exit 0; }
say "dump: $OUTW/$NAME   log: $LOG"
exit "$VRC"
