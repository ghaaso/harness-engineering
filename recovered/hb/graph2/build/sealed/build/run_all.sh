#!/usr/bin/env bash
# Rebuild every task set and the sealed references from git (read-only), then the checksums.
#   bash sealed/build/run_all.sh        (from the build/ folder)
set -euo pipefail
PY=C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe
cd "$(dirname "$0")"
$PY build_t12.py ../work/t12.json
$PY build_t34.py ../work/t34.json
$PY finalize.py > ../work/finalize_out.txt
cd ../..
# checksums: tasks.jsonl, parents.txt, README and every sealed file this builder owns (sealed/tq_writer
# and tasks/tq_questions.jsonl belong to the TQ writer, which seals them itself)
rm -rf sealed/build/__pycache__
{ sha256sum tasks/tasks.jsonl tasks/parents.txt tasks/README.md
  find sealed -type f ! -name SHA256SUMS ! -path 'sealed/tq_writer/*' ! -path '*/__pycache__/*' | LC_ALL=C sort | xargs sha256sum; } > sealed/SHA256SUMS
echo "wrote sealed/SHA256SUMS ($(wc -l < sealed/SHA256SUMS) files)"
