#!/usr/bin/env bash
# Run the backend checks at one exported parent with the EXISTING venv (no install). Read-only use of the venv.
F=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/feas
V=/c/Users/User/Documents/projects/EMS_workshop1/.claude/worktrees/p90a-week-export-script-4f99a5/backend/.venv/Scripts
P=$1
D=$F/exp/$P/backend
L=$F/logs/$P
mkdir -p $L
export PYTHONDONTWRITEBYTECODE=1
export RUFF_CACHE_DIR=$F/cache/ruff-$P
export MYPY_CACHE_DIR=$F/cache/mypy-$P
unset FIXFLOW_TEST_DATABASE_URL
cd $D || { echo "no backend"; exit 0; }
run() { local name=$1; shift; local t0=$(date +%s); timeout 900 "$@" > $L/be-$name.log 2>&1; local rc=$?; echo "BE[$name] EXIT=$rc SECS=$(( $(date +%s) - t0 ))" | tee -a $L/summary.txt; }
run ruff-check $V/ruff.exe check --no-cache .
run ruff-format $V/ruff.exe format --check --no-cache .
run mypy $V/mypy.exe --cache-dir $MYPY_CACHE_DIR app
if grep -q "importlinter" pyproject.toml; then run lint-imports $V/lint-imports.exe --no-cache; else echo "BE[lint-imports] NO_CONFIG" | tee -a $L/summary.txt; fi
run pytest $V/python.exe -B -m pytest -p no:cacheprovider -q -rs
