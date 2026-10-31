# O-04 design

1. DEAD-SAMPLER SIGNAL

(a) Ship now, no migration, works with the field APK: derive liveness from attendance_ping on read.

Query per board load:
SELECT DISTINCT ON (tech_id) tech_id, captured_at, received_at FROM attendance_ping WHERE shop_id=:s AND captured_at >= :day_start ORDER BY tech_id, captured_at DESC
plus count(*) per tech for the day. It is served by ix_attendance_ping_shop_time / ix_attendance_ping_tech_time. With 6 techs this is sub-millisecond.

New BoardRow fields: last_ping_at, last_ping_received_at, pings_today, sampler_state ∈ {not_expected (not clocked in), ok, stale, silent, unknown_fence}:
- stale: clocked in and now - last captured_at > 3 × ping_interval_minutes.
- silent: clocked in for more than 2 × interval with zero pings.
- unknown_fence: get_active_geofence is None.

Label honestly: "no pings received for N min — phone offline or tracker stopped". The server cannot tell these apart in real time. When a late batch lands, received_at - captured_at > 2 × interval proves 'offline', not 'dead'. Expose that as late_batch_minutes on TechDay.

Also:
- Compute the open-shift breakdown for today with window_end = min(now, first_in + 14 h).
- Return coverage_pct=0 with a no_pings flag for a closed day with zero pings, instead of null.
- Add an UNKNOWN or no_data interval for all-None verdict runs (O04-F3).
- Optional scheduler job 'sampler-watch' every 15 min, idempotent: writes an app_event (actor_kind='system', name='attendance.sampler_silent', props {tech_id, minutes}) once per tech per episode, client_id = uuid5(tech, episode start), for the ops console.

(b) Needs an app release: an app_event heartbeat via POST /api/events. Names: tracker.started / tracker.stopped{reason} / geofence.registered / geofence.error{code} / provider.disabled / permission.changed, plus an hourly tracker.alive while on duty. That is about 15-20 rows per tech-day, so roughly 40k rows a year for 6 techs. This is the only way to tell an OS-killed sampler from no network, and permission revoked from provider off. It requires index ix_app_event_shop_name_actor_time (shop_id, name, actor_id, server_time DESC) for 'last heartbeat per actor': migration 0048. Keep (a) as the fallback for old APKs.

2. DRAIN MODE

Purpose: a one-time cut-over while phones replay parked or queued data to the self-hosted server. Time-box it and revert afterwards. All are env-only FIXFLOW_* settings.

- FIXFLOW_ATTENDANCE_DEVICE_TIME_BACKDATE_CEILING_HOURS: 24 -> the drain horizon (for example 2160, about 90 days, or the age of the oldest parked punch). Permanent value after the O04-F1 fix: 336 (14 days). This changes bucketing only; punches are never rejected either way.
- FIXFLOW_ATTENDANCE_PING_BACKDATE_CEILING_HOURS: 48 -> 240 permanently (about 9 working days covers the 1000-ping cap), and the drain horizon during the drain.
- FIXFLOW_JOBS_GPS_BACKDATE_CEILING_HOURS: leave at 48. It feeds billing, and in a fresh DB the job ids 404 first anyway.
- Keep FIXFLOW_ATTENDANCE_DEVICE_TIME_FUTURE_TOLERANCE_SECONDS=120.

Honest flags to ship before widening:
- late_sync on DayFlags/BoardRow/GridCell/PayrollDay: any event with server_time - effective_time > 24 h, computed with no migration. The existing flagged_drift also fires (drift_seconds is stored for every row).
- late_batch on TechDay: max(received_at - captured_at).
- A banner when no active fence exists.

Order of operations:
1. Set and verify the real fence row (is_active) BEFORE any phone syncs, because verdicts freeze at receipt (O04-F17).
2. Widen the settings.
3. Let phones drain.
4. Regenerate payroll exports for affected windows (needs O04-F11).
5. Revert the settings.

Payroll exclusion: keep late_sync days out of payroll until a manager accepts them. This needs adjustment action 'accept', or simply manual review by flag.

3. MIGRATIONS FROM 0047

Each migration is provably clean when shipped against a fresh DB. Against restored months-old prod data, migration 3 needs a prior audit.

- 0047 attendance_adjustment: add action VARCHAR(16) NOT NULL DEFAULT 'add' plus CHECK (action IN ('add','replace','void','accept')), and client_id UUID NULL with a partial unique index WHERE client_id IS NOT NULL. Add the CHECK as NOT VALID, then VALIDATE CONSTRAINT in the same migration: the server default fills every existing row with 'add', so it is provably clean. No new FK (original_event_id already has one).
- 0048 (only with option 1b) app_event index (shop_id, name, actor_id, server_time). An index only, no constraint sequencing; the table is small, so a plain CREATE INDEX is fine.
- 0049, a separate PR/deploy after an orphan/duplicate audit script in backend/scripts/ (dry-run default): partial unique index uq_attendance_geofence_one_active ON attendance_geofence(shop_id) WHERE is_active AND deleted_at IS NULL. Same-deploy is acceptable on a fresh DB.
- Optional later (only with O04-F11): payroll_export.version INT NOT NULL DEFAULT 1, replacing payroll_export_window_key with UNIQUE(shop_id, from_date, to_date, version).

Code-only (no migration):
- timezone validator and shop-timezone source (O04-F8)
- adjustment principal (O04-F7)
- three-state inside rule (O04-F9)
- unknown/no_pings coverage (O04-F3/F4)
- per-session duty windows (O04-F13)
- effective_time on the web (O04-F10)
- the liveness fields (1a)

The superseded-event exclusion for O04-F6 reads attendance_adjustment(action, original_event_id), which already has an FK. No attendance_event column is needed.
