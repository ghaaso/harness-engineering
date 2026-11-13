<!-- Authored for FixFlow, 2026-11-04 -->
# Sequence verification after a restore (the three standalone sequences)

Why: the three sequences are bare `CREATE SEQUENCE` objects, not owned by a column. "A full
custom-format `pg_restore` replays their `SETVAL`; a split schema/data restore does not, and a
sequence below its table max makes every write a 500 while every read and the health check stay
green" (docs/adr/0001-database-region-topology.md:212-215). The ADR body says two; its own A1.4
says "there are **three**" (docs/adr/0001-database-region-topology.md:336-337).

| Sequence | Drives | Declared | Created / set by | Floor / last drill |
| --- | --- | --- | --- | --- |
| `job_token_seq` | `job.token` (human job number on printed tickets) | backend/app/features/jobs/models.py:48 (`start=1052`), column :130 | backend/alembic/versions/0016_job_token_sequence.py:31, `setval` to `GREATEST(COALESCE(MAX(token),1051),1051)` at :36-37 | 1052 first value; 1057 at the 2026-08-02 drill (docs/RUNBOOK-BACKUPS.md:128) |
| `job_event_seq` | `job_event.seq` (the outbox order `dispatch_cursor` follows) | backend/app/features/jobs/models.py:56, column :271 | backend/alembic/versions/0027_events_outbox.py:51, `setval` at :70 | 90 at the 2026-08-02 drill (docs/RUNBOOK-BACKUPS.md:128) |
| `shop_setting_seq` | `shop_setting.seq` (append-only settings registry) | backend/app/features/tenancy/models.py:36, column :91 | backend/alembic/versions/0040_shop_settings.py:47 | no drill value recorded |

## Addendum query (read-only; append to `appendix-b.sql` below the unchanged Appendix B block)

Appendix C removes its container at the end, so these lines must ride in the same file. They
assume a dump at head 0040 or later (`shop_setting` exists; the known dumps are 0045).

```sql
-- sequence addendum (supabase-railway-r2-recovery skill, 2026-11-04); read-only
SELECT 'job_token_seq' AS seq, s.last_value, s.is_called, (SELECT max(token) FROM job) AS table_max FROM job_token_seq s
UNION ALL SELECT 'job_event_seq', s.last_value, s.is_called, (SELECT max(seq) FROM job_event) FROM job_event_seq s
UNION ALL SELECT 'shop_setting_seq', s.last_value, s.is_called, (SELECT max(seq) FROM shop_setting) FROM shop_setting_seq s;
SELECT (SELECT max(seq) FROM job_event) AS job_event_max_seq, (SELECT last_seq FROM dispatch_cursor WHERE consumer = 'whatsapp') AS cursor_last_seq;
```

## Reading the result

- The next value a sequence hands out is `last_value + 1` when `is_called` is true and
  `last_value` when it is false (all three use the default increment of 1). **Pass** iff that
  next value is greater than `table_max`, or `table_max` is NULL (empty table). A row that fails
  is reported with its numbers; the agent does not fix it.
- `pg_sequences.last_value` (Appendix B) reads NULL when "the sequence has not been read from
  yet" or the user lacks `USAGE`/`SELECT`; with caching it "can be greater than the last value
  handed out" (https://www.postgresql.org/docs/17/view-pg-sequences.html, fetched 2026-11-04).
  NULL there is not a failure; the addendum's direct read settles it.
- `dispatch_cursor`: a 0046 dump carries the `whatsapp` row; `cursor_last_seq` must be at or near
  `job_event_max_seq` and never above it (docs/program/w2/O-08-design.md:52). A 0045 dump has no
  row; the first backend boot's 0046 migration seeds it from `COALESCE(MAX(seq), 0)` of `job_event`
  (backend/alembic/versions/0046_seed_dispatch_cursor.py:57-58), which is correct only if
  `job_event_seq` and the table were restored together. A cursor far below the head is a
  mass-message hazard (CLAUDE.md:231) and is reported, never "fixed".
- Fixing a sequence (`setval`) on any database a backend will serve is an owner step: the case-c
  `setval job_token_seq` above the highest printed ticket is in the owner's P3b runbook
  (docs/program/SHIP-PLAN-2026-11.md:533-534).

## Row to return per sequence (DUMPFACTS rows, design §5.2)

`query`: the addendum line; `result`: `seq=<name> last_value=<n> is_called=<t|f> table_max=<n|NULL> next=<n> pass=<yes|no>`.
