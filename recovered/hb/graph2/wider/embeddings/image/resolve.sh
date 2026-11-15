#!/bin/sh
# Resolve phase (network ON, build only; throwaway container on the default bridge).
# Same base image (Debian 12, CPython 3.11, x86_64) as the final image.
# Pass 1: torch (CPU build) with its dependencies from the PyTorch CPU index ONLY.
# Pass 2: pykeen 1.11.1 and the rest from PyPI; torch is pinned to the wheel of pass 1,
#         so the CUDA build of torch (and every nvidia-* wheel) cannot be selected.
set -eu
python3 -m venv /tmp/resolver
/tmp/resolver/bin/pip install --disable-pip-version-check --no-cache-dir --upgrade pip   # resolver-only: base pip 23.0.1 loops on the "inconsistent Name" check against the CPU index
/tmp/resolver/bin/pip --version
mkdir -p /out/wheels
/tmp/resolver/bin/pip download --disable-pip-version-check --no-cache-dir \
  --only-binary=:all: -d /out/wheels --index-url https://download.pytorch.org/whl/cpu torch
TORCH=$(ls /out/wheels | grep '^torch-' | head -1 | cut -d- -f2)
echo "torch wheel version: $TORCH"
/tmp/resolver/bin/pip download --disable-pip-version-check --no-cache-dir \
  --only-binary=:all: -d /out/wheels --find-links /out/wheels \
  --index-url https://pypi.org/simple "torch==$TORCH" "pykeen==1.11.1"
ls -l /out/wheels
