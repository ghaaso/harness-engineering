#!/bin/bash
# shoot.sh <svg> <png> [x y w h]  -> a PNG of the whole SVG, or of one region of it, by headless Edge.
set -e
SVG="$1"; PNG="$2"
DIR="$(cd "$(dirname "$SVG")" && pwd -W 2>/dev/null || pwd)"
EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
PROFILE="$(cd "${TMPDIR:-/tmp}" && pwd -W)/harness-diagram-edge-profile"
if [ -n "$3" ]; then
  X=$3; Y=$4; W=$5; H=$6
  TMP="$DIR/crop-$X-$Y.svg"
  sed -E "1s/width=\"[0-9]+\" height=\"[0-9]+\" viewBox=\"[^\"]+\"/width=\"$W\" height=\"$H\" viewBox=\"$X $Y $W $H\"/" "$SVG" > "$TMP"
  SRC="$TMP"
else
  W=$(sed -n '1s/.*width="\([0-9]*\)" height="\([0-9]*\)".*/\1/p' "$SVG"); H=$(sed -n '1s/.*width="\([0-9]*\)" height="\([0-9]*\)".*/\2/p' "$SVG")
  SRC="$SVG"
fi
OUT="$(cd "$(dirname "$PNG")" && pwd -W)/$(basename "$PNG")"
"$EDGE" --headless=new --disable-gpu --hide-scrollbars --no-first-run --user-data-dir="$PROFILE" --window-size=$W,$H --default-background-color=ffffffff --screenshot="$OUT" "file:///$(cd "$(dirname "$SRC")" && pwd -W)/$(basename "$SRC")" >/dev/null 2>&1
ls -la "$PNG" | awk '{print $5, $9}'
