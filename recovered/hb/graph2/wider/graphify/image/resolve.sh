#!/bin/sh
# Resolve phase (network ON, build only): download graphifyy==0.9.108 and its core
# dependencies as binary wheels into /out/wheels. No extras. Runs on the same base
# image (Debian 12, CPython 3.11, x86_64) as the final image, so pip picks the
# wheels that image needs. Nothing is installed in any image here; the container
# is thrown away.
set -eu
python3 -m venv /tmp/resolver
/tmp/resolver/bin/pip --version
mkdir -p /out/wheels
/tmp/resolver/bin/pip download --disable-pip-version-check --no-cache-dir \
  --only-binary=:all: -d /out/wheels "graphifyy==0.9.108"
ls -l /out/wheels
