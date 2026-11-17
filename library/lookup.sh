#!/usr/bin/env bash
# lookup.sh: find library records without Node, Python or jq. Run it with Bash (Git Bash on this PC).
#   lookup.sh <id>            for example r57-0103, or only 0103: prints  id | kind | status | claim
#   lookup.sh <word> [word..] every current record whose line holds all the words (any case, any order).
#                             A quoted phrase counts as one word. If no record holds them all, the records
#                             that hold any one of them are printed instead, and the first line says so.
#   lookup.sh -f <id or words>  the whole line of each record (every field, as stored)
# "Current" means not named in the "supersedes" field of another record.
# Output order: a line of counts, then the records of the top session and its child sessions, then the
# extractor records (ids beginning with x; read the place one cites before a decision rests on it).
# A claim is printed whole; pipe to  cut -c1-300  for a shorter view.

dir="$(cd "$(dirname "$0")" && pwd)/journal"
files=$(find "$dir" -name '*.jsonl' | sort)
[ -n "$files" ] || { echo "no journal files under $dir" >&2; exit 2; }

full=0
if [ "$1" = "-f" ]; then full=1; shift; fi
[ -n "$1" ] || { echo "usage: lookup.sh [-f] <id or words>" >&2; exit 2; }
q="$*"

# Four columns from each record line. The claim ends at the first quote that is not escaped.
cols() {
  sed -E 's/^\{"id":"([^"]*)","kind":"([^"]*)"(,"status":"([^"]*)")?,"claim":"(([^"\\]|\\.)*)".*/\1 | \2 | \4 | \5/' |
    sed -E 's/\\"/"/g; s/\\\\/\\/g'
}
count() { if [ -n "$1" ]; then printf '%s\n' "$1" | wc -l | tr -d ' '; else echo 0; fi; }

all=$(cat $files)
# Ids named as superseded anywhere in the journal.
superseded=$(printf '%s\n' "$all" | grep -o '"supersedes":\[[^]]*\]' | grep -oE '[A-Za-z0-9]+-[0-9]+' | sort -u)

if [ $# -eq 1 ] && echo "$q" | grep -qE '^([A-Za-z0-9]+-)?[0-9]+$'; then
  # An id, with or without its prefix. Superseded records are still shown, with a mark.
  case "$q" in *-*) pat="\"id\":\"$q\"" ;; *) pat="\"id\":\"[A-Za-z0-9]*-$q\"" ;; esac
  hits=$(printf '%s\n' "$all" | grep -E "$pat")
  [ -n "$hits" ] || { echo "not recorded: no record with id $q"; exit 1; }
  if [ $full -eq 1 ]; then printf '%s\n' "$hits"; exit 0; fi
  printf '%s\n' "$hits" | while IFS= read -r line; do
    id=$(printf '%s\n' "$line" | sed -E 's/^\{"id":"([^"]*)".*/\1/')
    mark=""
    printf '%s\n' "$superseded" | grep -qx "$id" && mark=" [SUPERSEDED]"
    printf '%s\n' "$line" | cols | sed "s/\$/$mark/"
  done
  exit 0
fi

# Words: records that hold all of them; if none does, records that hold any one.
hits="$all"
for w in "$@"; do hits=$(printf '%s\n' "$hits" | grep -iF -- "$w"); done
mode="all of: $q"
if [ -z "$hits" ] && [ $# -gt 1 ]; then
  hits=$(printf '%s\n' "$all" | grep -iF -f <(printf '%s\n' "$@"))
  mode="ANY ONE of: $q (no record holds them all)"
fi
[ -n "$hits" ] || { echo "not recorded: no record holds \"$q\""; exit 1; }
if [ -n "$superseded" ]; then
  hits=$(printf '%s\n' "$hits" | grep -vF -f <(printf '%s\n' "$superseded" | sed 's/.*/"id":"&"/'))
fi
[ -n "$hits" ] || { echo "not recorded: only superseded records hold \"$q\""; exit 1; }

top=$(printf '%s\n' "$hits" | grep -vE '^\{"id":"x[0-9]+-')
xs=$(printf '%s\n' "$hits" | grep -E '^\{"id":"x[0-9]+-')
out="# $(count "$top") current records of the top session and its child sessions, then $(count "$xs") extractor records (x); holding $mode"
if [ $full -eq 1 ]; then
  [ -n "$top" ] && out="$out"$'\n'"$top"
  [ -n "$xs" ] && out="$out"$'\n'"$xs"
else
  [ -n "$top" ] && out="$out"$'\n'"$(printf '%s\n' "$top" | cols)"
  [ -n "$xs" ] && out="$out"$'\n'"$(printf '%s\n' "$xs" | cols)"
fi
# One write, so a closed pipe (for example "| head") ends the script quietly.
printf '%s\n' "$out" 2>/dev/null
exit 0
