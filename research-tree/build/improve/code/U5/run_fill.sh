#!/bin/bash
# Fills B4's column in U4's tables (U4's folder mounted read-write at /u4w for this step only). Network off. usage: run_fill.sh [repos]
export MSYS_NO_PATHCONV=1
CR="C:/Users/User/Documents/projects/card-run-2026-11"
H="C:/Users/User/Documents/projects/harness-engineering/research-tree/build"
docker run --rm --network none -m 8g -e PYTHONDONTWRITEBYTECODE=1 -v "$H/improve/code/U5:/code:ro" -v "$CR/improve/U5:/out:ro" -v "$CR/improve/U4:/u4w" -w /code \
  d2-embed-gpu:3 python -u fill_tables.py "$@"
