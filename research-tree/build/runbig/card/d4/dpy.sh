#!/bin/bash
# run python in the CPU image, network off. usage: dpy.sh <script args...>  (cwd = this folder mounted at /code)
CR=C:/Users/User/Documents/projects/card-run-2026-11
HERE="$(cd "$(dirname "$0")" && pwd -W 2>/dev/null || pwd)"
MSYS_NO_PATHCONV=1 docker run --rm --network none -m 24g -e D4_DATA=/data -e D4_OUT=/out \
  -v "$HERE:/code:ro" -v "$CR/d4/data:/data:ro" -v "$CR/d4/out:/out" -w /code graphtest-kge:1 python -u "$@"
