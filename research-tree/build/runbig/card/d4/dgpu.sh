#!/bin/bash
# run python on the card, network off, 6 GB container memory (section 3.6), under CR/GPU.lock.
CR=C:/Users/User/Documents/projects/card-run-2026-11
LOCK="$CR/GPU.lock"
HERE="$(cd "$(dirname "$0")" && pwd -W 2>/dev/null || pwd)"
until mkdir "$LOCK" 2>/dev/null; do echo "$(date +%T) waiting for GPU.lock" >&2; sleep 20; done
echo "d4 $$ $(date -u +%FT%TZ)" > "$LOCK/owner.txt"
trap 'rm -rf "$LOCK"' EXIT
MSYS_NO_PATHCONV=1 docker run --rm --gpus all --network none -m 6g -e D4_DATA=/data -e D4_OUT=/out \
  -v "$HERE:/code:ro" -v "$CR/d4/data:/data:ro" -v "$CR/d4/out:/out" -w /code graphtest-kge-gpu:1 python -u "$@"
