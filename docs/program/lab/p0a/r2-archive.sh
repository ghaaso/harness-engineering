#!/usr/bin/env bash
# P0a item 3: archive the old R2 database backups. Additive only: nothing is ever deleted.
#
#   AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... r2-archive.sh [--dry-run] <account-id> <bucket>
#
# Reads the R2 token from the environment ONLY (never an argument; never printed or logged).
# 1. lists s3://<bucket>/backups/db/ and saves the listing
# 2. copies it inside the bucket to archive/pre-selfhost/   (s3 cp --recursive; no rm, no sync --delete)
# 3. downloads a laptop copy to C:/fixflow-r2/
# 4. lists archive/pre-selfhost/ and saves that listing
# 5. compares source / archive / laptop copy (name + size). Any difference: FAIL, exit 1.
# --dry-run prints each docker command and runs nothing.
# Outputs: C:/fixflow-r2/ (the copy), C:/fixflow-r2/logs/ (listings and a timestamped log).
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
ACCT="${1:-}"; BUCKET="${2:-}"
usage() { sed -n '2,13p' "$0"; exit 2; }
[ -n "$ACCT" ] && [ -n "$BUCKET" ] || usage
case "$ACCT$BUCKET" in
  *[!A-Za-z0-9._-]*) echo "account id / bucket: letters, digits, . _ - only" >&2; exit 2 ;;
esac
if [ -z "${AWS_ACCESS_KEY_ID:-}" ] || [ -z "${AWS_SECRET_ACCESS_KEY:-}" ]; then
  if [ "$DRY" = 1 ]; then
    echo "(dry run: AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY are not set; a real run refuses without them)"
  else
    echo "REFUSED: export AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY first (R2 API token)." >&2
    exit 2
  fi
fi

EP="https://$ACCT.r2.cloudflarestorage.com"
OUTW="C:/fixflow-r2"; OUTU="/c/fixflow-r2"
STAMP="$(date +%Y%m%d-%H%M%S)"
SRC="backups/db/"; ARC="archive/pre-selfhost/"
if [ "$DRY" = 1 ]; then LOG=/dev/null; else mkdir -p "$OUTU/logs"; LOG="$OUTU/logs/r2-archive-$STAMP.log"; fi
say() { if [ "$DRY" = 1 ]; then echo "$*"; else echo "$*" | tee -a "$LOG"; fi; }
fail() { say ""; say "######## FAIL: $* ########"; exit 1; }

# the token is passed by NAME (-e VAR), so its value never appears in a command line or a log
AWS=(docker run --rm -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION=auto)
IMG=amazon/aws-cli
run() {
  if [ "$DRY" = 1 ]; then echo "+ $*"; return 0; fi
  echo "+ $*" >> "$LOG"; "$@" >> "$LOG" 2>&1
}
capture() {  # capture FILE CMD...
  f="$1"; shift
  if [ "$DRY" = 1 ]; then echo "+ $* > $f"; return 0; fi
  echo "+ $* > $f" >> "$LOG"; "$@" > "$f" 2>> "$LOG"
}

LS1="$OUTU/logs/source-listing-$STAMP.txt"
LS2="$OUTU/logs/archive-listing-$STAMP.txt"

say "step 1: list s3://$BUCKET/$SRC"
capture "$LS1" "${AWS[@]}" "$IMG" --endpoint-url "$EP" s3 ls "s3://$BUCKET/$SRC" --recursive \
  || fail "listing the source failed (see $LOG)"
if [ "$DRY" != 1 ] && [ ! -s "$LS1" ]; then fail "source prefix $SRC is EMPTY or unreadable: nothing to archive"; fi

say "step 2: copy inside the bucket to $ARC (additive)"
run "${AWS[@]}" "$IMG" --endpoint-url "$EP" s3 cp --recursive "s3://$BUCKET/$SRC" "s3://$BUCKET/$ARC" \
  || fail "in-bucket copy failed"

say "step 3: laptop copy to $OUTW/"
[ "$DRY" = 1 ] || mkdir -p "$OUTU"
run "${AWS[@]}" -v "$OUTW:/dl" "$IMG" --endpoint-url "$EP" s3 cp --recursive "s3://$BUCKET/$SRC" /dl/ \
  || fail "laptop download failed"

say "step 4: list s3://$BUCKET/$ARC"
capture "$LS2" "${AWS[@]}" "$IMG" --endpoint-url "$EP" s3 ls "s3://$BUCKET/$ARC" --recursive \
  || fail "listing the archive failed"

if [ "$DRY" = 1 ]; then
  echo "step 5: compare name+size of source, archive, laptop copy; FAIL if any differ"
  echo "(dry run: nothing was executed)"
  exit 0
fi

# "size name" lines with the prefix stripped, sorted
norm() { awk -v p="$2" '$3 ~ /^[0-9]+$/ && index($4,p)==1 { n=substr($4,length(p)+1); if (n!="") print $3, n }' "$1" | sort; }
T="$OUTU/logs"
norm "$LS1" "$SRC" > "$T/.src.$STAMP"
norm "$LS2" "$ARC" > "$T/.arc.$STAMP"
( cd "$OUTU" && find . -maxdepth 1 -type f | sed 's#^\./##' | while read -r f; do echo "$(stat -c %s "$f") $f"; done | sort ) > "$T/.loc.$STAMP"
NS=$(wc -l < "$T/.src.$STAMP"); NA=$(wc -l < "$T/.arc.$STAMP"); NL=$(wc -l < "$T/.loc.$STAMP")
MISS_ARC=$(comm -23 "$T/.src.$STAMP" "$T/.arc.$STAMP" | wc -l)
MISS_LOC=$(comm -23 "$T/.src.$STAMP" "$T/.loc.$STAMP" | wc -l)
say ""
say "objects in source  $SRC           : $NS"
say "objects in archive $ARC : $NA   (source objects missing or different size there: $MISS_ARC)"
say "files in laptop copy $OUTW/      : $NL   (source objects missing or different size there: $MISS_LOC)"
[ "$NS" -gt 0 ] || fail "source listing parsed to zero objects"
[ "$MISS_ARC" -eq 0 ] || fail "archive does not hold every source object (name + size): $MISS_ARC differ"
[ "$MISS_LOC" -eq 0 ] || fail "laptop copy does not hold every source object (name + size): $MISS_LOC differ"
[ "$NA" -eq "$NS" ] || say "note: archive holds $((NA-NS)) extra object(s) beyond the source set (an earlier archive or a dump): informational"
[ "$NL" -eq "$NS" ] || say "note: laptop folder holds $((NL-NS)) extra file(s) beyond the source set: informational"
say "OK: every source object is in the archive and in the laptop copy with the same size."
say "listings: $LS1 , $LS2   log: $LOG"
