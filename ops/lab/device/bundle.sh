#!/usr/bin/env bash
# bundle.sh <run-dir>... : the small evidence bundle a review can cite, per run.
#
# Copies result.json, meta.txt, timeline.txt, adb-processes.txt and every file a check in
# result.json names as its evidence, into $FF_BUNDLE_OUT/<run>/ (default the coordinator's
# handoff folder). Never copies the full logcat.txt or a screen recording (result.json carries
# each recording's sha256 instead). Refuses the whole bundle when a copied file names a roster
# technician: the names are read from the lab database at bundle time, so none is written here.
set -euo pipefail
. "$(dirname "$0")/lib.sh"

OUT="${FF_BUNDLE_OUT:-C:/Users/User/.fixflow-cache/handoff/evidence/l3a}"
C_DB="${FF_LAB_DB_CONTAINER:-fixflow-l3a-labdb}"
[ $# -ge 1 ] || die "usage: bundle.sh <run-dir>..."

roster="$(docker exec "$C_DB" psql -U postgres -d fixflow -tAc \
  "select id || '|' || name from technician where id <> '$LAB_TECH_ID'")" ||
  die "cannot read the roster from $C_DB (is the lab backend up?)"
[ -n "$roster" ] || die "empty roster read from $C_DB"

for run in "$@"; do
  run="${run%/}"
  [ -f "$run/result.json" ] || die "$run has no result.json"
  name="$(basename "$run")"
  dest="$OUT/$name"
  tmp="$dest.tmp"
  rm -rf "$tmp"
  mkdir -p "$tmp"
  files="$(
    {
      printf '%s\n' result.json meta.txt timeline.txt adb-processes.txt
      sed -n 's/^ *"evidence": "\(.*\)",\{0,1\}$/\1/p' "$run/result.json" | tr ' ,' '\n\n'
    } | grep -vE '^$|^logcat\.txt$|\.mp4$' | sort -u
  )"
  for f in $files; do
    [ -f "$run/$f" ] && cp "$run/$f" "$tmp/$f"
  done
  hit=""
  while IFS='|' read -r id nm; do
    [ -n "$nm" ] || continue
    if grep -rlF -- "$nm" "$tmp" > /dev/null; then hit="$hit name-of-$id"; fi
    if grep -rlE -- "(^|[^A-Za-z0-9_])$id([^A-Za-z0-9_]|$)" "$tmp" | grep -q .; then
      hit="$hit id:$id($(grep -rlE -- "(^|[^A-Za-z0-9_])$id([^A-Za-z0-9_]|$)" "$tmp" | xargs -n1 basename | tr '\n' ' '))"
    fi
  done <<< "$roster"
  if [ -n "$hit" ]; then
    rm -rf "$tmp"
    die "$name: refused, a roster technician is named:$hit"
  fi
  rm -rf "$dest"
  mv "$tmp" "$dest"
  echo "$dest: $(ls "$dest" | wc -l) files, $(du -sk "$dest" | cut -f1) KB"
done
