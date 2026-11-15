#!/usr/bin/env bash
# Integration tests at one exported parent: alembic upgrade head + alembic check + pytest with a real Postgres
# (my own container feas-phase0-pg from the local postgres:16-alpine image; the CI image). Fresh database per run.
F=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/feas
V=/c/Users/User/Documents/projects/EMS_workshop1/.claude/worktrees/p90a-week-export-script-4f99a5/backend/.venv/Scripts
P=$1
L=$F/logs/$P
mkdir -p $L
DB=feas_$(echo $P | tr -c 'a-z0-9\n' '_')
docker exec feas-phase0-pg psql -U postgres -c "DROP DATABASE IF EXISTS $DB" >/dev/null 2>&1
docker exec feas-phase0-pg psql -U postgres -c "CREATE DATABASE $DB" >/dev/null
export FIXFLOW_DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:55432/$DB
export FIXFLOW_TEST_DATABASE_URL=$FIXFLOW_DATABASE_URL
export PYTHONDONTWRITEBYTECODE=1
cd $F/exp/$P/backend
run() { local name=$1; shift; local t0=$(date +%s); timeout 900 "$@" > $L/integ-$name.log 2>&1; local rc=$?; echo "INT[$P $name] EXIT=$rc SECS=$(( $(date +%s) - t0 ))"; }
run alembic-upgrade $V/alembic.exe upgrade head
run alembic-check $V/alembic.exe check
run pytest $V/python.exe -B -m pytest -p no:cacheprovider -q -rs
tail -n 2 $L/integ-pytest.log
