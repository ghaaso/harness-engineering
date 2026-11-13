<!-- Authored for FixFlow, 2026-11-04 -->
# Restore verification: design Appendix B (queries) and Appendix C (Postgres 17 restore stack)

Copied byte-for-byte (by `sed -n '668,711p'`) from `docs/ORCHESTRATION-DESIGN-2026-10.md`
lines 668-711 on PR #182 (head 3415b5e), FixFlow's own design doc, because that file is not on
`main` yet. If PR #182 has merged and the design has moved on, the design wins; re-copy.
docs/ORCHESTRATION-DESIGN-2026-10.md and docs/program/* are on PR #182 (head 3415b5e) at write time; their line numbers refer to that head.

How to use (from SKILL.md procedure steps 11-12):
- Save the SQL block below, without the fences, as `$ARGS_LOGDIR/appendix-b.sql` (plan P0a item 4,
  `docs/program/SHIP-PLAN-2026-11.md:249-250`). `$ARGS_LOGDIR` and `$ARGS_DUMP_PATH` are outside
  the repo; the dump holds real customer and payment data.
- Run the bash block in Git Bash with Docker Desktop up (`docker info` prints a server version).
- `RESTORE EXIT=0` and `QUERIES EXIT=0` are both required; anything else labels the dump facts
  partial. Then fill `sequence-checks.md`.

---

### Appendix B — fixed read-only query set for a restored dump (S-07b, run with `psql` inside the Appendix C container)

```sql
SELECT shop_id, name, center_lat, center_lng, radius_m, is_active FROM attendance_geofence;
-- exact row counts for every public table (the DB is ~300 KB; count(*) is cheap). pg_stat's n_live_tup is an estimate — never use it for completeness.
SELECT string_agg(format('SELECT %L AS t, count(*) AS n FROM %I', relname, relname), ' UNION ALL ' ORDER BY relname)
FROM pg_class WHERE relkind = 'r' AND relnamespace = 'public'::regnamespace \gexec
SELECT 'attendance_event', max(server_time) FROM attendance_event
UNION ALL SELECT 'attendance_presence_event', max(server_time) FROM attendance_presence_event
UNION ALL SELECT 'attendance_ping', max(received_at) FROM attendance_ping
UNION ALL SELECT 'job_event', max(created_at) FROM job_event;                        -- when the fleet last synced
SELECT confirmed, width_bucket(accuracy_m, 0, 200, 10) AS acc_bucket, count(*) FROM attendance_presence_event GROUP BY 1, 2 ORDER BY 1, 2;
SELECT count(*) AS payments, coalesce(sum(amount_paisa) FILTER (WHERE NOT voided), 0) AS non_voided_paisa FROM job_payment;   -- O-08 §3 baseline: Rs 34,400 non-voided at the 2026-08-02 drill
SELECT (SELECT count(*) FROM staff_ledger) AS ledger_rows, (SELECT count(*) FROM staff_ledger_chain) AS chain_rows, (SELECT max(seq) FROM staff_ledger_chain) AS chain_head_seq;
SELECT max(token) FROM job;   -- compare with job_token_seq below (ADR-0001 A1.4); column is job.token (jobs/models.py)
SELECT consumer, last_seq FROM dispatch_cursor;
SELECT sequencename, last_value FROM pg_sequences WHERE schemaname = 'public';        -- the three standalone sequences (ADR-0001 A1.4) must sit at or above their tables' max
SELECT version_num FROM alembic_version;
```

### Appendix C — restore stack for a prod dump (S-07b; separate from the test DB; Postgres 17)

```bash
export MSYS_NO_PATHCONV=1
D="$ARGS_DUMP_PATH"                    # the custom-format dump W0 produced; never a file inside the repo
docker network create fixflow-w1 2>/dev/null; docker rm -f fixflow-w1-restore 2>/dev/null
docker run -d --name fixflow-w1-restore --network fixflow-w1 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=fixflow_restore postgres:17-alpine
n=0; until docker exec fixflow-w1-restore pg_isready -U postgres -q; do n=$((n+1)); [ "$n" -ge 60 ] && { echo "RESTORE[db] TIMEOUT"; exit 2; }; sleep 1; done
docker cp "$D" fixflow-w1-restore:/tmp/prod.dump
# The documented dumps carry the public schema, so a restore into a fresh database raises one benign
# "schema public already exists" error (W2 O08-F06). Drop the empty schema first so --exit-on-error
# only stops on real failures.
docker exec fixflow-w1-restore psql -U postgres -d fixflow_restore -c 'DROP SCHEMA public CASCADE'
docker exec fixflow-w1-restore pg_restore -U postgres -d fixflow_restore --no-owner --no-privileges --exit-on-error /tmp/prod.dump \
  > "$ARGS_LOGDIR/restore.log" 2>&1; echo "RESTORE EXIT=$?"      # non-zero = incomplete; the dump facts are then labelled partial
docker cp "$ARGS_LOGDIR/appendix-b.sql" fixflow-w1-restore:/tmp/b.sql
docker exec fixflow-w1-restore psql -U postgres -d fixflow_restore -v ON_ERROR_STOP=1 -f /tmp/b.sql > "$ARGS_LOGDIR/dumpfacts.txt" 2>&1; echo "QUERIES EXIT=$?"
docker rm -f fixflow-w1-restore
```

Follow `docs/RUNBOOK-BACKUPS.md` for the restore itself; this recipe only fixes the container,
the major version (the dump was taken with `pg_dump` 17 from a 17 server, and loading it into
an older major is not guaranteed) and the separation from the gates' test database, so
restored evidence is never mixed with migration seeds or test state.
