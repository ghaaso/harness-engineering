#!/usr/bin/env bash
# lookup.sh: find library records without Node, Python or jq. Run it with Bash (Git Bash on this PC).
#   lookup.sh <id>        for example r57-0103, or only 0103: prints  id | kind | status | claim
#   lookup.sh <word>      every current record whose line holds the word (any case): same four columns
#   lookup.sh -f <id>     the whole line of that record (every field, as stored)
# "Current" means not named in the "supersedes" field of another record.
# A claim is printed whole; pipe to  cut -c1-300  for a shorter view.

dir="$(cd "$(dirname "$0")" && pwd)/journal"
files=$(find "$dir" -name '*.jsonl' | sort)
[ -n "$files" ] || { echo "no journal files under $dir" >&2; exit 2; }

full=0
if [ "$1" = "-f" ]; then full=1; shift; fi
[ -n "$1" ] || { echo "usage: lookup.sh [-f] <id or word>" >&2; exit 2; }
q="$*"

# Four columns from one record line. The claim ends at the first quote that is not escaped.
cols() {
  sed -E 's/^\{"id":"([^"]*)","kind":"([^"]*)"(,"status":"([^"]*)")?,"claim":"(([^"\\]|\\.)*)".*/\1 | \2 | \4 | \5/' |
    sed -E 's/\\"/"/g; s/\\\\/\\/g'
}

# Ids named as superseded anywhere in the journal.
superseded=$(cat $files | grep -o '"supersedes":\[[^]]*\]' | grep -oE '[A-Za-z0-9]+-[0-9]+')

if echo "$q" | grep -qE '^([A-Za-z0-9]+-)?[0-9]+$'; then
  # An id, with or without its prefix. Superseded records are still shown, with a mark.
  case "$q" in *-*) pat="\"id\":\"$q\"" ;; *) pat="\"id\":\"[A-Za-z0-9]*-$q\"" ;; esac
  hits=$(cat $files | grep -E "$pat")
  [ -n "$hits" ] || { echo "not recorded: no record with id $q"; exit 1; }
  if [ $full -eq 1 ]; then echo "$hits"; exit 0; fi
  echo "$hits" | while IFS= read -r line; do
    id=$(echo "$line" | sed -E 's/^\{"id":"([^"]*)".*/\1/')
    mark=""
    echo "$superseded" | grep -qx "$id" && mark=" [SUPERSEDED]"
    echo "$line" | cols | sed "s/\$/$mark/"
  done
  exit 0
fi

# A word: every current record whose line contains it.
hits=$(cat $files | grep -iF -- "$q")
[ -n "$hits" ] || { echo "not recorded: no record holds \"$q\""; exit 1; }
n=0
echo "$hits" | while IFS= read -r line; do
  id=$(echo "$line" | sed -E 's/^\{"id":"([^"]*)".*/\1/')
  echo "$superseded" | grep -qx "$id" && continue
  if [ $full -eq 1 ]; then echo "$line"; else echo "$line" | cols; fi
done
