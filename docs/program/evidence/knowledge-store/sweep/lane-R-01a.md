# lane:R-01a

lane=R-01a rows=121

## Counts
- CLAUDE.md / trap: 4
- CLAUDE.md / invariant: 16
- CLAUDE.md / solved_entry: 9
- CLAUDE.md / open_defect: 1
- HANDOFF / trap: 13
- HANDOFF / invariant: 4
- HANDOFF / solved_entry: 10
- HANDOFF / open_defect: 36
- HANDOFF / other: 14
- FOLLOWUPS / open_defect: 11
- FOLLOWUPS / trap: 1
- FOLLOWUPS / other: 2

## Sections read
- CLAUDE.md: Build & deploy traps (79-93), Do NOT assume (95-108), Invariants (110-251; all subsections)
- docs/HANDOFF-2026-07-28-open-work.md: s2 (52-148), s3 (150-216, extra), s4.1-4.5 (218-422), s5.5 (509-554), s6 (558-579)
- docs/lifecycle-audit-followups-2026-07.md: whole file (1-175)

## Not covered
- HANDOFF s1 state table (15-48) point-in-time facts, not entries
- HANDOFF s5.1 Wave 2 plan (426-469), s5.2 advances remnant (471-492), s5.3 APK gate, s5.4 owner actions: outside requested scope (s5.5 only); s5.1/5.2 hold ~12 design notes and 4 open defects (actor=auto FK, voided advance cooldown, reject_advance on failed, 3.7 dead re-fail signal) that a later pass should classify
- HANDOFF s7 sequencing, s8 provenance
- CLAUDE.md sections outside the three named (stack table, slices, staff money, scheduler jobs, commands, doc map)
- No claim verified against code or git; extraction only. Locators are line starts of each item.

## Rows
- [trap] - — every eas build fails when EXPO_PUBLIC_SENTRY_DSN is an empty string in eas.json
    source: CLAUDE.md @ Build & deploy traps, L81
    root_cause=true fix=add key only with a real DSN value failed_recorded=false
    validity: eas.json env validation rejecting empty values; EAS Build
    verification: none (CI expo export will not catch it)
    files: eas.json, EXPO_PUBLIC_SENTRY_DSN
- [trap] - — gradle build breaks after adding Sentry Expo config plugin to app.json
    source: CLAUDE.md @ Build & deploy traps, L84
    root_cause=false fix=never add the plugin failed_recorded=false
    validity: Expo SDK 52 / current gradle build
    verification: none (expo export does not catch)
    files: app.json
- [trap] - — CI green but native Android build is broken
    source: CLAUDE.md @ Build & deploy traps, L86
    root_cause=true fix=none; real Android compile not gated anywhere failed_recorded=false
    validity: CI runs expo export only
    verification: none
    files: expo export, .github/workflows/ci.yml
- [trap] - — prod API outage: API rebuilt as the web SPA after railway up from repo root
    source: CLAUDE.md @ Build & deploy traps, L88
    root_cause=true fix=deploy from backend/ (cd backend && railway up) failed_recorded=false
    validity: Railway RAILPACK autodetect; manual railway up
    verification: none here (HANDOFF 2.1 adds content-poll)
    files: backend/, RAILPACK
- [invariant] - — agent proposes WatermelonDB/Realm/sync library
    source: CLAUDE.md @ Do NOT assume, L97
    root_cause=false fix=none (rule) failed_recorded=false
    validity: offline engine stays hand-rolled
    verification: none
    files: technician-app/src/lib/outbox.ts
- [invariant] - — agent assumes Supabase RLS/GoTrue/PostgREST/pgTAP
    source: CLAUDE.md @ Do NOT assume, L98
    root_cause=false fix=none (rule) failed_recorded=true
    validity: Supabase used as Postgres host only; decision in docs/PLAYBOOK.md
    verification: none
    files: docs/PLAYBOOK.md
- [invariant] - — agent assumes GoTrue auth or writes pgTAP tests
    source: CLAUDE.md @ Do NOT assume, L100
    root_cause=false fix=none (rule: test authz in pytest on real Postgres) failed_recorded=false
    validity: custom FastAPI JWT auth
    verification: backend/tests/test_identity_integration.py
    files: backend/tests/test_identity_integration.py
- [invariant] - — agent codes against Supabase Storage for media
    source: CLAUDE.md @ Do NOT assume, L102
    root_cause=false fix=none (rule) failed_recorded=false
    validity: media on Cloudflare R2
    verification: none
    files: 
- [invariant] - — agent assumes web uses bundled mock seeds
    source: CLAUDE.md @ Do NOT assume, L103
    root_cause=false fix=none (rule; schedule and workshop-profile form remain demo) failed_recorded=false
    validity: web reads live API for auth/jobs/attendance
    verification: none
    files: 
- [invariant] - — agent builds multi-tenant behaviour
    source: CLAUDE.md @ Do NOT assume, L105
    root_cause=false fix=none (rule) failed_recorded=false
    validity: code uses DEFAULT_SHOP_ID constant
    verification: none
    files: DEFAULT_SHOP_ID, shop_id
- [invariant] - — float money or *_paisa/*_minor naming mix
    source: CLAUDE.md @ Invariants/Data and money, L116
    root_cause=false fix=none (rule) failed_recorded=false
    validity: integer minor units; shop.currency PKR
    verification: none
    files: *_paisa, *_minor
- [invariant] - — CI alembic check drift; FK on populated table; orphan rows at boot
    source: CLAUDE.md @ Invariants/Data and money, L119
    root_cause=true fix=matching migration; FKs NOT VALID then VALIDATE (separate deploy if human data) failed_recorded=false
    validity: start.sh runs pending migrations at boot; head 0046, next 0047
    verification: alembic upgrade head && alembic check
    files: models.py, backend/alembic/versions, backend/scripts/, start.sh
- [invariant] - — CI fails import-linter or ESLint no-restricted-imports on cross-slice import
    source: CLAUDE.md @ Invariants/Data and money, L127
    root_cause=false fix=go through service.py/deps.py or index.js barrel failed_recorded=false
    validity: importlinter contracts in backend/pyproject.toml
    verification: lint-imports
    files: backend/pyproject.toml [tool.importlinter]
- [solved_entry] - — unauthenticated 500 (TypeError) from non-ASCII header on shared-secret compare
    source: CLAUDE.md @ Invariants/Security, L134
    root_cause=true fix=compare_secret in core/security.py (hash both sides); three sites fixed failed_recorded=false
    validity: hmac.compare_digest raises TypeError on non-ASCII str
    verification: none named
    files: backend/app/core/security.py:compare_secret, ops proxy-token gate, WhatsApp verify token, webhook signature header
- [invariant] - — agent sees correct PIN rejected during lock and proposes to fix it
    source: CLAUDE.md @ Invariants/Security, L140
    root_cause=true fix=none (do not fix); recovery via set_pin or backend/scripts/unlock_account.py failed_recorded=true
    validity: 4-digit tech PIN; per-account lockout MAX_LOCK_SECONDS=15min, DECAY_AFTER_SECONDS
    verification: none
    files: features/identity/throttle.py, backend/scripts/unlock_account.py, set_pin
- [invariant] - — direct fetch write from screen loses data offline or double-charges
    source: CLAUDE.md @ Invariants/Mobile outbox, L151
    root_cause=false fix=none (rule: sendOrQueue + client_id) failed_recorded=false
    validity: hand-rolled outbox
    verification: none (architecture guard test per HANDOFF 4.4)
    files: sendOrQueue
- [invariant] - — someone simplifies outbox to drop failed writes
    source: CLAUDE.md @ Invariants/Mobile outbox, L154
    root_cause=false fix=none (rule; pings and travel breadcrumbs deliberately droppable) failed_recorded=false
    validity: shared 4xx policy
    verification: none
    files: lib/syncClassification.ts, pingSync, travelSync
- [open_defect] - — concurrent sendOrQueue and flushOutbox on same id: last-finishing server request wins
    source: CLAUDE.md @ Invariants/Mobile outbox, L161
    root_cause=true fix=none; completion path avoids by refusing a second completion failed_recorded=false
    validity: outbox lacks mutual exclusion
    verification: none
    files: features/jobs/completionPrefill.ts, sendOrQueue, flushOutbox
- [invariant] - — location sampling continues without clock-out or arrival
    source: CLAUDE.md @ Invariants/Location, L171
    root_cause=false fix=none (rule: maxDutyHours 14h, MAX_TRAVEL_MS 4h; ping captured_at window ~48h/2min) failed_recorded=false
    validity: all sampling routes via dutyStatus / travel state
    verification: none
    files: pingTracker.ts:dutyStatus, travelTracker.ts, config.attendance.maxDutyHours
- [solved_entry] - — queued ready reopened a settled, billed job
    source: CLAUDE.md @ Invariants/Job lifecycle, L181
    root_cause=true fix=0043 guarded state machine; atomic try_transition; client_id/settled-state replay idempotency; 409 detail ends (current status: X) failed_recorded=false
    validity: three clients regex the 409 detail text
    verification: none named
    files: jobs/service.py:_TRANSITION_FROM, _TRANSITION_SETTLED, repository.try_transition, job_event.client_id
- [invariant] - — agent reintroduces client-queued ready
    source: CLAUDE.md @ Invariants/Job lifecycle, L191
    root_cause=true fix=server-side submit_completion moves carry-in/pickup to ready failed_recorded=false
    validity: ready = work done awaiting handover; closing clip required
    verification: none
    files: submit_completion
- [solved_entry] - — completion resubmit silently rewrote real bills to zero
    source: CLAUDE.md @ Invariants/Bill freeze, L199
    root_cause=true fix=refuse resubmit once bill_sent_at/bill_negotiated_paisa/payment; byte-identical resubmit is idempotent success (PR #162/#163) failed_recorded=false
    validity: deployed phones send no client_id; upsert re-prices from payload
    verification: none named
    files: job.bill_sent_at, bill_negotiated_paisa, _is_identical_completion
- [solved_entry] - — completion form opens blank against a real bill and replaces it
    source: CLAUDE.md @ Invariants/Bill freeze, L207
    root_cause=true fix=completionPrefill: unknown is blocked, not new failed_recorded=true
    validity: server upsert re-prices from payload
    verification: none named
    files: features/jobs/completionPrefill.ts
- [solved_entry] - — capture flow restarts on a finished job; clearArrivalDraft wipes evidence
    source: CLAUDE.md @ Invariants/Bill freeze, L212
    root_cause=true fix=wizard state monotonic (#162 loop) failed_recorded=true
    validity: flushOutbox removeItem before notifying landed-listeners
    verification: none named
    files: features/jobs/arrival-job/wizardState.ts, flushOutbox, clearArrivalDraft
- [invariant] - — guard logic inside a mobile component is untested
    source: CLAUDE.md @ Invariants/Bill freeze, L218
    root_cause=true fix=keep guards as pure functions failed_recorded=false
    validity: no @testing-library/react-native or react-test-renderer
    verification: none
    files: completionPrefill.ts, wizardState.ts
- [invariant] - — client re-demands evidence server already holds; None treated as zero
    source: CLAUDE.md @ Invariants/Resuming from server truth, L224
    root_cause=false fix=JobDetail.evidence per-phase counts failed_recorded=false
    validity: None means unknown
    verification: none
    files: JobDetail.evidence
- [solved_entry] B1 — enabling dispatcher messaged customers about months-old jobs (36 measured)
    source: CLAUDE.md @ Invariants/Outbox dispatcher, L231
    root_cause=true fix=migration 0046 seeds dispatch_cursor at head + _MAX_DISPATCH_EVENT_AGE 2 days failed_recorded=false
    validity: uq_customer_message_job_kind makes first decision terminal; cursor reset by hand defeats seed
    verification: none named
    files: run_dispatch_once, 0046, _MAX_DISPATCH_EVENT_AGE (main.py), dispatch_cursor, uq_customer_message_job_kind
- [solved_entry] B3 — consumer replays same batch forever after rollback expunged pending cursor
    source: CLAUDE.md @ Invariants/Outbox dispatcher, L239
    root_cause=true fix=commit per event; commit new cursor before loop failed_recorded=false
    validity: SQLAlchemy rollback expunges pending instances
    verification: none named
    files: run_dispatch_once, cursor.last_seq
- [solved_entry] - — duplicate-key race recovery rolled back caller's whole session
    source: CLAUDE.md @ Invariants/Outbox dispatcher, L243
    root_cause=true fix=claim row in savepoint (CustomerMessageRepository.savepoint) failed_recorded=false
    validity: Session.rollback unwinds outermost transaction
    verification: none named
    files: CustomerMessageRepository.savepoint
- [solved_entry] B2 — automated send leaves bill_sent_at NULL so freeze never engages
    source: CLAUDE.md @ Invariants/Outbox dispatcher, L246
    root_cause=true fix=automated send calls log_customer_message failed_recorded=false
    validity: log_customer_message is sole writer of bill_sent_at
    verification: none named
    files: log_customer_message, bill_sent_at
- [trap] - — prod API serves the web SPA after deploy from repo root
    source: HANDOFF @ 2.1 Deploying, L62-63
    root_cause=true fix=cd backend && railway up --ci --service efficient-tenderness failed_recorded=false
    validity: RAILPACK detects Vite at root
    verification: poll /openapi.json and /api/health
    files: backend/
- [trap] - — railway up --ci ends with reqwest error / operation timed out
    source: HANDOFF @ 2.1 Deploying, L64-66
    root_cause=true fix=do not re-run; log stream dropped, build succeeded; verify by polling prod failed_recorded=true
    validity: railway CLI --ci log stream behaviour
    verification: poll prod
    files: railway up --ci
- [trap] - — cannot tell whether deploy/migration applied
    source: HANDOFF @ 2.1 Deploying, L67-70
    root_cause=true fix=verify by content: new schema field in /openapi.json plus /api/health; failed migration crash-loops new container, old keeps serving failed_recorded=false
    validity: start.sh runs alembic upgrade head under set -e
    verification: GET /openapi.json, /api/health, /api/ops/health
    files: start.sh
- [invariant] - — merge+deploy+--apply chained in one command
    source: HANDOFF @ 2.1 Deploying, L71-72
    root_cause=false fix=one prod-mutating action per step failed_recorded=false
    validity: none
    verification: none
    files: 
- [invariant] - — temptation to alembic downgrade as rollback
    source: HANDOFF @ 2.1 Rule 1, L76-79
    root_cause=true fix=never run downgrade (39 of 46 bodies drop table/column; money-chain verifies clean over emptied ledger past 0041) failed_recorded=false
    validity: downgrade bodies as of head 0046
    verification: verified 2026-08-02 per docs/adr/0001-database-region-topology.md
    files: backend/alembic/versions, docs/adr/0001-database-region-topology.md
- [trap] - — container crash-loops after Railway rollback once DB head is ahead of code
    source: HANDOFF @ 2.1 Rule 2, L80-86
    root_cause=true fix=roll forward or hand-edit alembic_version; revert the env variable instead of the deployment failed_recorded=true
    validity: alembic 1.18.5; start.sh upgrade head under set -e; head/0045/0044 targets all raise same CommandError
    verification: proven by execution (alembic 1.18.5); no script named
    files: start.sh, alembic_version
- [trap] - — alembic raises on every command incl. boot upgrade: duplicate revision id
    source: HANDOFF @ 2.2 Reverted-migration trap, L88-107
    root_cause=true fix=renumber restored migration to head+1 (edit revision and down_revision); 0045 resolved via ea48987 (#166) failed_recorded=false
    validity: a parked/reverted migration restored after its number was taken
    verification: railway run psql -c "SELECT kind, count(*) FROM job_event GROUP BY kind ORDER BY 2 DESC;" before VALIDATE
    files: 0045_validate_event_kind_check.py, job_event_kind_check, c79bec7, ea48987
- [trap] - — lock hold time depends on statement order across pending migrations
    source: HANDOFF @ 2.3 Migrations, L111-112
    root_cause=true fix=none; mind statement order failed_recorded=false
    validity: alembic/env.py sets no transaction_per_migration
    verification: none
    files: alembic/env.py
- [trap] - — wrong or missing CHECK constraint ships green
    source: HANDOFF @ 2.3 Migrations, L113-116
    root_cause=true fix=@integration test that POSTs new value against real Postgres failed_recorded=false
    validity: installed alembic autogenerate/compare has zero CheckConstraint references
    verification: @integration pytest with FIXFLOW_TEST_DATABASE_URL
    files: alembic/autogenerate/compare/
- [trap] - — backfill in a migration reaches prod untested
    source: HANDOFF @ 2.3 Migrations, L117-118
    root_cause=true fix=write a migration test if backfill matters failed_recorded=false
    validity: CI runs migrations against an empty DB
    verification: none
    files: .github/workflows/ci.yml
- [invariant] - — FK/CHECK on populated table
    source: HANDOFF @ 2.3 Migrations, L119
    root_cause=false fix=NOT VALID then VALIDATE in separate deploy failed_recorded=false
    validity: duplicates CLAUDE.md L119
    verification: none
    files: 
- [trap] - — belief that tests need no/unavailable local Postgres
    source: HANDOFF @ 2.4 Running tests locally, L121-131
    root_cause=true fix=docker run postgres:16-alpine on port 55432; export FIXFLOW_TEST_DATABASE_URL; alembic upgrade head && alembic check && pytest failed_recorded=false
    validity: Docker working (Windows socket note, not in this file)
    verification: alembic upgrade head && alembic check && pytest
    files: FIXFLOW_TEST_DATABASE_URL, fixflow-testdb
- [trap] - — 22 phantom pytest failures / deadlock
    source: HANDOFF @ 2.4 Running tests locally, L132-135
    root_cause=true fix=never run two pytest processes against the same DB failed_recorded=false
    validity: conftest metadata.create_all takes AccessExclusiveLock
    verification: none
    files: backend/tests/conftest.py, metadata.create_all
- [trap] - — files changed under me mid-review; uncommitted work nearly lost
    source: HANDOFF @ 2.5 Multi-agent work, L140-143
    root_cause=true fix=use a git worktree per agent failed_recorded=false
    validity: agents share one working tree
    verification: none
    files: 
- [trap] - — background workflow died; findings seem lost
    source: HANDOFF @ 2.5 Multi-agent work, L143-146
    root_cause=false fix=recover from .claude/projects/<proj>/<session>/subagents/workflows/<runId>/journal.jsonl (type:result lines) and resume failed_recorded=false
    validity: journal.jsonl layout of the harness
    verification: none
    files: journal.jsonl
- [solved_entry] - — CI red: test_messaging_integration asserted wa_me_url present after asserting consent False
    source: HANDOFF @ 3 branch fix/mobile-completion-guards item 1, L157-161
    root_cause=true fix=split into test_preview_withholds_the_wa_link_without_consent and ..._builds_the_wa_link_with_consent failed_recorded=false
    validity: server-side consent gate on preview
    verification: the two named tests
    files: tests/test_messaging_integration.py
- [solved_entry] B3 — dispatcher re-attempts same event every 60 s forever; dead-letter never fires
    source: HANDOFF @ 3 branch item 2, L162-172
    root_cause=true fix=run_dispatch_once rolls back before dead-letter row, reloads expired event, guards the commit failed_recorded=true
    validity: record_dead_letter is only session.add; poisoned txn fails later statements
    verification: test_dead_letter_survives_a_handler_that_poisons_the_transaction
    files: run_dispatch_once, telemetry/service.py:61 record_dead_letter
- [open_defect] - — customer_message row stays pending forever; sent_now False; bill_sent_at never stamped
    source: HANDOFF @ 3 branch item 3, L173-181
    root_cause=true fix=only a warning log naming the stuck row; resume-vs-double-send decision open failed_recorded=true
    validity: commit rolls back after Meta accepted; uq_customer_message_job_kind terminal
    verification: none
    files: send_cloud_message, get_by_job_kind, uq_customer_message_job_kind
- [solved_entry] - — 0046 downgrade silently no-ops or deletes a live cursor
    source: HANDOFF @ 3 branch item 4, L182-186
    root_cause=true fix=downgrade() explicit no-op failed_recorded=false
    validity: absent cursor is minted at last_seq=0 (whole-history replay)
    verification: none
    files: 0046_seed_dispatch_cursor.py
- [solved_entry] - — evidence row finalized uploaded with zero bytes in R2; closing-handover gate passable
    source: HANDOFF @ 3 PR #164 commit 1, L192-199
    root_cause=true fix=head_size raises ObjectNotFoundError on 404; complete_upload 409 leaves PENDING (013a86b) failed_recorded=false
    validity: head_size swallowed all exceptions and returned None
    verification: none named
    files: head_size, ObjectNotFoundError, complete_upload
- [solved_entry] - — attendance selfie finalize would 500 after head_size change
    source: HANDOFF @ 3 PR #164 commit 2, L200-202
    root_cause=true fix=catch new exception in selfie finalize failed_recorded=true
    validity: second head_size caller
    verification: none named
    files: head_size, selfie finalize
- [invariant] - — shared Protocol failure mode changed with only one caller fixed
    source: HANDOFF @ 3 PR #164 lesson, L204-206
    root_cause=true fix=visit every implementor and every caller failed_recorded=false
    validity: none
    verification: none
    files: 
- [open_defect] - — pre-fix phantom job_media rows status uploaded with size_bytes NULL in prod
    source: HANDOFF @ 3 PR #164 follow-up, L208-214
    root_cause=true fix=none; audit query given failed_recorded=false
    validity: prod data
    verification: SELECT id, job_id, phase, type, created_at FROM job_media WHERE status = 'uploaded' AND size_bytes IS NULL
    files: job_media
- [open_defect] A1 — ops console process dies on unauthenticated POST /api/ops/login body 'null' (restart loop)
    source: HANDOFF @ 4.1 A1, L225-234
    root_cause=true fix=proposed: readBody returns {} for non-object, move :470-479 into try, add unhandledRejection handler, sha256 compare failed_recorded=false
    validity: ops-server.mjs lines 433/470-484; Node --unhandled-rejections=throw
    verification: curl -X POST <ops>/api/ops/login -d 'null'
    files: ops-server.mjs:474, readBody (:433), timingSafeEqual
- [open_defect] A2 — all accounts held locked by unauthenticated wrong-PIN requests
    source: HANDOFF @ 4.1 A2, L236-246
    root_cause=true fix=proposed: lock on failure path only so correct PIN clears; unlock_account.py (CONFLICTS with CLAUDE.md L140) failed_recorded=false
    validity: GET /api/technicians unauthenticated; lock evaluated before verify_pin
    verification: tests pinning broken behaviour: tests/test_identity_integration.py:80, identity/tests/test_service.py:113
    files: identity/router.py:67-69, identity/service.py:75-79, config.py:154
- [open_defect] A3 — Dashboard Revenue This Week shows Rs 0, recent activity empty
    source: HANDOFF @ 4.1 A3, L248-255
    root_cause=true fix=proposed: use GET /api/jobs/reports/tech-metrics; em-dash when null failed_recorded=false
    validity: GET /api/jobs returns list[Job] without events/payments
    verification: none
    files: Dashboard.jsx:86-89, AppContext.jsx:442-448, amountPaid
- [open_defect] A4 — retry after 'please retry' toast creates a second real payment row
    source: HANDOFF @ 4.1 A4, L257-267
    root_cause=true fix=proposed: id in PaymentModal state, rotate on success only; naive useState worse; pattern at NewJobForm.jsx:20-25 failed_recorded=true
    validity: randomUUID evaluated per attempt; PaymentModal mounted unconditionally
    verification: none
    files: AppContext.jsx:319, PaymentModal, JobDetail.jsx:675, NewJobForm.jsx:20-25, uq_job_payment_client
- [open_defect] A5 — payroll CSV shows 14.8 h after manager corrects forgotten clock-out to 18:00
    source: HANDOFF @ 4.1 A5, L269-280
    root_cause=true fix=proposed: migration superseded_by_event_id, _window filter, flag_adjusted column, web change; own PR with owner failed_recorded=false
    validity: derive.py takes min(clock_ins)/max(clock_outs); original_event_id read nowhere
    verification: reproduced 890 min to 14.8 h (no command named)
    files: derive.py:123-125, original_event_id, _day_flags, AttendanceTechDetail.jsx:225-231
- [open_defect] A6 — metrics route table grows without bound; ops metrics poll stalls event loop
    source: HANDOFF @ 4.1 A6, L282-288
    root_cause=true fix=proposed: label from scope['route'].path not request.url.path failed_recorded=false
    validity: percent-encoded # or ? defeats label-collapsing
    verification: none
    files: core/metrics.py, snapshot()
- [open_defect] A7 — nightly media-orphan sweep re-alarms every orphan every night
    source: HANDOFF @ 4.1 A7, L289-294
    root_cause=true fix=proposed: uuid5 on (completion_id, media_id) via on_conflict_do_nothing failed_recorded=false
    validity: enable_scheduler default True; client_id=uuid4 per emission
    verification: none
    files: telemetry/service.py:74-89 record_media_orphan, uq_app_event_client
- [solved_entry] B1 — enabling dispatcher replays whole job_event history as live WhatsApp messages
    source: HANDOFF @ 4.2 B1, L303-312
    root_cause=true fix=seed cursor at head (0046) + event-age skip; on branch fix/mobile-completion-guards; CLAUDE.md treats as landed failed_recorded=true
    validity: dispatch_cursor unseeded; payload.get('auto') guard passes pre-0043 ready events
    verification: none named
    files: run_dispatch_once, dispatch_cursor, uq_customer_message_job_kind
- [solved_entry] B2 — automated bill send leaves bill_sent_at NULL; no timeline event
    source: HANDOFF @ 4.2 B2, L314-321
    root_cause=true fix=mirror router's if sent_now: log_customer_message; shared helper (branch) failed_recorded=false
    validity: log_customer_message sole writer of bill_sent_at (jobs/service.py:1342-1343)
    verification: none named
    files: build_dispatch_handler.handle, send_cloud_message, log_customer_message
- [solved_entry] B3 — messages re-sent after commit failure; claim-before-send not durable
    source: HANDOFF @ 4.2 B3, L323-329
    root_cause=true fix=commit per event; commit claim before _post_cloud_api (branch) failed_recorded=false
    validity: claim flush-only; 100-event batch single commit; 10 s httpx inside txn
    verification: none named
    files: _post_cloud_api, customer_message, idle_in_transaction_session_timeout
- [open_defect] B4 — typo in Settings timezone (e.g. Karachi) 500s attendance reads and kills Sunday payroll job
    source: HANDOFF @ 4.2 B4, L331-336
    root_cause=true fix=proposed: field_validator with ZoneInfo, fallback in _tz_from_shifts, select input failed_recorded=false
    validity: schemas.py:450 bare str
    verification: none
    files: schemas.py:450, _tz_from_shifts, ZoneInfoNotFoundError
- [open_defect] B5 — verify_chain returns ok:true after DB-level un-void flip adds money back
    source: HANDOFF @ 4.2 B5, L338-345
    root_cause=true fix=proposed: symmetric sweep over voids failed_recorded=false
    validity: chain.py:288 gated on row.voided; :327 iterates creates only
    verification: none
    files: chain.py:288, chain.py:327, /ledger/verify, uq_staff_ledger_chain_ledger_event, ledger_balances
- [solved_entry] C1 — Correct the completion silently replaces queued completion with blank one
    source: HANDOFF @ 4.3 C1, L349-357
    root_cause=true fix=completionPrefill guard, merged 8dafcec (per s1); s5.3 still lists as gating failed_recorded=false
    validity: both queue under key completion:${id}; prefill bails offline
    verification: none named
    files: ArrivalAlreadyDoneScreen.tsx:57-59, CompleteJobScreen, outbox.ts:155-162, outboxSync.ts:280, JobDetailScreen.tsx:201/:265
- [solved_entry] C2 — rejected completion leaves wizard saying still syncing forever
    source: HANDOFF @ 4.3 C2, L359-361
    root_cause=true fix=onOutboxItemFailed or itemsForJob (merged 8dafcec per s1) failed_recorded=false
    validity: submittedPending cleared only on success
    verification: none named
    files: submittedPending, markFailed, onOutboxItemLanded
- [open_defect] C3 — multi-day carry-in bills days of labour; second visit anchors to first punch
    source: HANDOFF @ 4.3 C3, L363-367
    root_cause=true fix=none; server le=1440 cap (#163) bounds it failed_recorded=false
    validity: arrivalDraft stores bare epoch
    verification: none
    files: arrivalDraft.ts, ArrivalJobWizard.tsx:90-97
- [open_defect] C4 — steps 2 and 5 re-demand after-video/voice evidence server already holds
    source: HANDOFF @ 4.3 C4, L369-371
    root_cause=true fix=none failed_recorded=false
    validity: evidenceSatisfiesCaptures ignores after and remark
    verification: none
    files: evidenceSatisfiesCaptures
- [open_defect] C5 — CompleteJobScreen shows 'check your connection' for bill-freeze 409s
    source: HANDOFF @ 4.3 C5, L373-376
    root_cause=true fix=proposed: export failureReason(e) from syncClassification.ts failed_recorded=false
    validity: bare catch
    verification: none
    files: CompleteJobScreen, syncClassification.ts
- [open_defect] - — lockout counter lost-update, ~15x brute-force budget
    source: HANDOFF @ 4.4 table row identity-1, L382
    root_cause=true fix=proposed: with_for_update failed_recorded=false
    validity: read-modify-write without row lock
    verification: none
    files: identity throttle
- [open_defect] - — Principal lacks shop_id; 32 routes take it from query string
    source: HANDOFF @ 4.4 row identity-2, L383
    root_cause=true fix=proposed 1-line + call sites failed_recorded=false
    validity: single-tenant today
    verification: none
    files: Principal
- [open_defect] - — 413 path deletes R2 object but row delete rolls back: permanently pending row
    source: HANDOFF @ 4.4 row media-1, L384
    root_cause=true fix=proposed 2-line x2 failed_recorded=false
    validity: media upload path
    verification: none
    files: media service 413 path
- [open_defect] - — orphan sweep covers 1 of 4 orphan classes; stale pending rows never reaped
    source: HANDOFF @ 4.4 row media-2, L385
    root_cause=true fix=proposed 1-file failed_recorded=false
    validity: media-orphan-sweep
    verification: none
    files: media-orphan-sweep
- [open_defect] - — complete_upload has no job-status or ownership guard
    source: HANDOFF @ 4.4 row media-3, L386
    root_cause=true fix=proposed 1-file failed_recorded=false
    validity: none
    verification: none
    files: complete_upload
- [open_defect] - — lower-seq job_event commits later and is skipped forever by cursor
    source: HANDOFF @ 4.4 row messaging-1, L387
    root_cause=true fix=needs migration failed_recorded=false
    validity: seq assigned at flush, visible at commit
    verification: none
    files: job_event.seq, dispatch_cursor
- [open_defect] - — lost-race path rolls back caller's whole session
    source: HANDOFF @ 4.4 row messaging-2, L388
    root_cause=true fix=1-file savepoint (CLAUDE.md L243 says done) failed_recorded=false
    validity: none
    verification: none
    files: CustomerMessageRepository.savepoint
- [open_defect] - — non-ASCII verify token/signature header gives unauthenticated 500
    source: HANDOFF @ 4.4 row messaging-3, L389
    root_cause=true fix=2-line (CLAUDE.md L134 says compare_secret done) failed_recorded=false
    validity: compare_digest on str
    verification: none
    files: compare_secret
- [open_defect] - — preview hands out wa.me link after consent withdrawal
    source: HANDOFF @ 4.4 row messaging-4, L390
    root_cause=true fix=1-file (branch consent gate, see s3 item 1) failed_recorded=false
    validity: none
    verification: test_preview_withholds_the_wa_link_without_consent
    files: wa_me_url
- [open_defect] - — non-ASCII X-Ops-Proxy-Token gives 500 instead of 401
    source: HANDOFF @ 4.4 row ops-1, L391
    root_cause=true fix=1-line compare bytes (CLAUDE.md L134 says compare_secret done) failed_recorded=false
    validity: compare_digest on str
    verification: none
    files: X-Ops-Proxy-Token, compare_secret
- [open_defect] - — payroll CSV frozen forever on (shop, window), no regenerate
    source: HANDOFF @ 4.4 row attendance-1, L392
    root_cause=true fix=proposed 1-file failed_recorded=false
    validity: payroll_export idempotent on (shop, window)
    verification: none
    files: payroll_export
- [open_defect] - — overnight shift unrepresentable in classify_day; start==end gives 1440 min
    source: HANDOFF @ 4.4 row attendance-2, L393
    root_cause=true fix=1-line validator failed_recorded=false
    validity: none
    verification: none
    files: classify_day
- [open_defect] - — ping backdate ceiling 48h rejects phone queue spanning ~6 days
    source: HANDOFF @ 4.4 row attendance-3, L394
    root_cause=true fix=env-only: FIXFLOW_ATTENDANCE_PING_BACKDATE_CEILING_HOURS=168 (s7) failed_recorded=false
    validity: Railway backend env
    verification: none
    files: FIXFLOW_ATTENDANCE_PING_BACKDATE_CEILING_HOURS
- [open_defect] - — 9 of 13 mutators swallow serverReason; Haul on ready visit gives permanent 409 shown as please retry
    source: HANDOFF @ 4.4 row web-1, L395
    root_cause=true fix=proposed 1-file failed_recorded=false
    validity: none
    verification: none
    files: serverReason
- [open_defect] - — completion voice note recorded and silently discarded
    source: HANDOFF @ 4.4 row web-2, L396
    root_cause=true fix=1-file (delete it) failed_recorded=false
    validity: none
    verification: none
    files: 
- [open_defect] - — bill preview hardcodes Rs 1,200/hr instead of shop_setting
    source: HANDOFF @ 4.4 row web-3, L397
    root_cause=true fix=1-file failed_recorded=false
    validity: none
    verification: none
    files: shop_setting
- [open_defect] - — Troubleshooting Add Part toasts success before request runs
    source: HANDOFF @ 4.4 row web-4, L398
    root_cause=true fix=1-file failed_recorded=false
    validity: none
    verification: none
    files: 
- [open_defect] - — manager correction of frozen bill leaves no record of replaced figure
    source: HANDOFF @ 4.4 row jobs-1, L399
    root_cause=true fix=1-file (event payload) failed_recorded=false
    validity: none
    verification: none
    files: 
- [open_defect] - — architecture guard scans only src/features and single-line jobsApi.<method>( calls
    source: HANDOFF @ 4.4 row mobile-1, L400
    root_cause=true fix=1-file failed_recorded=false
    validity: none
    verification: none
    files: jobsApi
- [open_defect] - — jobs list ignores reconciliation when painted from cache; full JobDetail written to list cache
    source: HANDOFF @ 4.4 row mobile-2, L401
    root_cause=true fix=2x 1-line failed_recorded=false
    validity: none
    verification: none
    files: jobsCache.ts
- [other] A7 — CLAUDE.md claims scheduler jobs idempotent; media-orphan sweep is not
    source: HANDOFF @ 4.5 item 1, L408-409
    root_cause=true fix=see A7 failed_recorded=false
    validity: A7 unfixed
    verification: none
    files: CLAUDE.md Scheduler jobs
- [other] A4 — CLAUDE.md replay-is-idempotent claim broken by web payment path
    source: HANDOFF @ 4.5 item 2, L410-411
    root_cause=true fix=see A4 failed_recorded=false
    validity: A4 unfixed
    verification: none
    files: 
- [open_defect] - — jobs/models.py:229 docstring says seq gap-free and drains in order; false
    source: HANDOFF @ 4.5 item 3, L412-415
    root_cause=true fix=none failed_recorded=false
    validity: nextval non-transactional; seq assigned at flush, visible at commit
    verification: none
    files: jobs/models.py:229, job_event.seq
- [other] B3 — server outbox violates never-delete via lost-race rollback
    source: HANDOFF @ 4.5 item 4, L416-417
    root_cause=true fix=see B3 / savepoint failed_recorded=false
    validity: none
    verification: none
    files: 
- [other] B3 — customer_messaging/service.py:20-23 claims claim-before-send can never double-send; claim is flush-only
    source: HANDOFF @ 4.5 item 5, L418-420
    root_cause=true fix=see B3 failed_recorded=false
    validity: none
    verification: none
    files: customer_messaging/service.py:20-23
- [other] - — workflow agents all died on account session limit; no results cached
    source: HANDOFF @ 5.5 review program failure, L509-514
    root_cause=true fix=re-run with small fan-out and default effort; later completed 2026-08-02 failed_recorded=true
    validity: journal.jsonl run wf_19ec6538-b01
    verification: inspect journal.jsonl for type:result lines
    files: journal.jsonl
- [other] - — six review lenses and the decisions they gate
    source: HANDOFF @ 5.5 lens table L1-L6, L516-523
    root_cause=false fix=none failed_recorded=false
    validity: gates region move, enable_dispatcher, contract gate
    verification: none
    files: 
- [trap] - — rolled-back deploy crash-loops after migration boundary
    source: HANDOFF @ 5.5 L2 hypothesis, L525-531
    root_cause=true fix=revert env variable not deployment (same as 2.1 Rule 2) failed_recorded=true
    validity: alembic 1.18.5; DB at 0046, code knows <=0045
    verification: proven by execution, no script named
    files: start.sh
- [other] M1-M28 — merged register M1-M28, ADR-0001, master plan; region move NO-GO on execute; WhatsApp credentials hard NO
    source: HANDOFF @ 5.5 programme completed, L533-540
    root_cause=false fix=docs/adr/0001-database-region-topology.md failed_recorded=false
    validity: restore rehearsal covers all 42 tables; opt-in toggle
    verification: none
    files: docs/adr/0001-database-region-topology.md
- [open_defect] - — POST /payments about 4.6 s; _detail() 7-9 serial queries across Mumbai DB and sfo app
    source: HANDOFF @ 5.5 latency finding, L542-554
    root_cause=true fix=none landed; move DB to US-West (about 0.73 s); never move backend to Asia failed_recorded=true
    validity: Railway sfo + Supabase ap-south-1; R_c about 675 ms, R_d about 230 ms
    verification: calibrated against src/shared/lib/requestCache.js:6 (~0.7 s)
    files: jobs/service.py:1843 _detail, src/shared/lib/requestCache.js:6
- [other] - — correct pattern (try_claim, void_ledger_entry, useAttendance, todayCache) not generalised to lifecycle/evidence
    source: HANDOFF @ 6 item 1, L562-564
    root_cause=true fix=grep for existing guard before writing new failed_recorded=false
    validity: none
    verification: none
    files: try_claim, void_ledger_entry, useAttendance, todayCache
- [other] - — tests pin broken behaviour (correct PIN rejected during lock)
    source: HANDOFF @ 6 item 2, L565-566
    root_cause=true fix=none failed_recorded=false
    validity: see A2
    verification: none
    files: tests/test_identity_integration.py:80
- [other] - — MagicMock repo hid FK violation in advance auto-approve
    source: HANDOFF @ 6 item 3, L567-569
    root_cause=true fix=use @integration test for real constraints failed_recorded=false
    validity: none
    verification: none
    files: advance auto-approve
- [other] - — fixture default head_size to None was the fraud path
    source: HANDOFF @ 6 item 4, L570-572
    root_cause=true fix=assert existence failed_recorded=false
    validity: none
    verification: none
    files: head_size
- [other] - — docstring asserts property that is missing
    source: HANDOFF @ 6 item 5, L573-574
    root_cause=true fix=none failed_recorded=false
    validity: none
    verification: none
    files: 
- [other] - — ops-server.mjs excluded from backend sweep so process-kill survived
    source: HANDOFF @ 6 item 6, L575-577
    root_cause=true fix=add to standing audit scope failed_recorded=false
    validity: none
    verification: none
    files: ops-server.mjs
- [other] - — shared contract changed without visiting every caller
    source: HANDOFF @ 6 item 7, L578-579
    root_cause=true fix=see PR #164 lesson failed_recorded=false
    validity: none
    verification: none
    files: 
- [open_defect] - — offline depart punch makes screen re-offer START TRAVEL; second depart_workshop queued; wrong fuel line
    source: FOLLOWUPS @ High 1, L16-29
    root_cause=true fix=none; correct pattern useAttendance.ts:107-196 failed_recorded=false
    validity: tracker reconciles vs OS task, screen vs server job.locations
    verification: none
    files: travelTracker.ts:229, TravelScreen.tsx:117, derive_route, useAttendance.ts
- [open_defect] - — WhatsApp send-log lost after message sent; false 'Couldn't open WhatsApp'
    source: FOLLOWUPS @ High 2, L31-41
    root_cause=true fix=none; needs message_log outbox kind and client_id on send-log failed_recorded=false
    validity: logSend outside outbox; no dedupe
    verification: none
    files: ArrivalJobBillScreen.tsx, JobDetailScreen.tsx:404, customer_messaging/router.py:76, log_customer_message
- [open_defect] - — manager board misses phone-originated changes until reload
    source: FOLLOWUPS @ High 3, L43-52
    root_cause=true fix=none; reuse refreshBoard (:156) failed_recorded=false
    validity: jobs list fetched once on isAuthenticated
    verification: none
    files: AppContext.jsx:90, refreshBoard, replaceFromDetail
- [open_defect] - — out-of-order replay of old consent given re-grants after withdrawn
    source: FOLLOWUPS @ High 4, L54-63
    root_cause=true fix=none; latent until consent is queued failed_recorded=false
    validity: no path outboxes consent today
    verification: none
    files: customers/service.py:96 record_consent, whatsapp_opt_in_at, jobs/service.py:690
- [open_defect] - — replay duplicates note/followup/assign/adjustment/media row on endpoints lacking client_id (7 endpoints)
    source: FOLLOWUPS @ Medium 5, L69-86
    root_cause=true fix=none; payments void guarded in #162 failed_recorded=false
    validity: outbox replays; outboxSync.ts:19-21 docstring premise false for negotiate and consent
    verification: none
    files: jobs/router.py:154,172,221,294,351, attendance/router.py:357, media/router.py:57, outboxSync.ts:19-21
- [open_defect] - — log_payment accepts cash against closed job unlike submit_completion/negotiate_bill
    source: FOLLOWUPS @ Medium 6, L88-95
    root_cause=true fix=none; possibly deliberate failed_recorded=false
    validity: bill and ledger can disagree after manager close
    verification: none
    files: jobs/service.py log_payment
- [open_defect] - — sendPunch returns true for landed and queued; wizard entered on merely queued punch
    source: FOLLOWUPS @ Medium 7, L97-103
    root_cause=true fix=none failed_recorded=false
    validity: none
    verification: none
    files: TravelScreen.tsx:159-189, startTravel, arrive
- [open_defect] - — queued upload-state silently stops being counted
    source: FOLLOWUPS @ Medium 8, L105-112
    root_cause=true fix=none failed_recorded=false
    validity: draftRef.current.uploads assigned in render body
    verification: none
    files: ArrivalJobWizard.tsx:104-108 setSlot
- [open_defect] - — duplicated rules drift: isVisitType, 'closed' literals, arrivalGate mirrors, PUNCH_LABELS
    source: FOLLOWUPS @ Medium 9, L114-126
    root_cause=true fix=none failed_recorded=false
    validity: kept in sync by comment only
    verification: none
    files: jobType.ts:26 isVisitType, arrivalGate.ts:24-27, mapJob.js:68-75, _LOCATION_EVENT_LABELS
- [open_defect] - — failed offline job-create appears only in global banner count
    source: FOLLOWUPS @ Medium 10, L128-133
    root_cause=true fix=none failed_recorded=false
    validity: jobId set to client UUID; no screen mounted with it
    verification: none
    files: CreateJobWizard.tsx:152, itemsForJob
- [open_defect] - — no tests across wizard/outbox/cache seams; completion flushes before voice note upload so remarks_audio_media_id never back-filled
    source: FOLLOWUPS @ Test-layer gaps, L137-150
    root_cause=true fix=#162 added some tests; drains test still missing failed_recorded=false
    validity: flushOutbox and drainPendingMedia share no ordering primitive
    verification: none
    files: flushOutbox, drainPendingMedia, completionFromWizard.ts:25-30, jobsMemo.test.ts:81-87, invalidateJobsList
- [trap] - — VALIDATE of job_event_kind_check bundled with other deploy defeats two-step; verbatim restore duplicates revision id
    source: FOLLOWUPS @ Deferred 1, L156-168
    root_cause=true fix=own PR after prod audit; restore 4a40423 content renumbered head+1 (STALE: says 0045 free, HANDOFF 2.2 says merged ea48987) failed_recorded=false
    validity: start.sh runs migrations at boot
    verification: SELECT kind, count(*) FROM job_event GROUP BY kind ORDER BY 2 DESC;
    files: 0045_validate_event_kind_check.py, 4a40423, job_event_kind_check
- [other] - — jobs stuck open with a completion not backfilled
    source: FOLLOWUPS @ Deferred 2, L169-171
    root_cause=false fix=none; manager closes from web; script would be dry-run-default failed_recorded=false
    validity: live data mutation
    verification: none
    files: backend/scripts/
- [other] - — fully-offline close would replay into definitive 409 and park as false failure
    source: FOLLOWUPS @ Deferred 3, L172-175
    root_cause=true fix=deferred; ready now means awaiting handover failed_recorded=true
    validity: closing video signed-URL reservation needs network
    verification: none
    files: 

## Anomalies
- Stale-status conflict: HANDOFF s2.2 says 0045 resolved and merged as ea48987 (#166); FOLLOWUPS L161-165 still says 0045 is a free slot. Same migration, two contradictory claims.
- HANDOFF s1/s3 say 0046 and B1-B3 fixes live only on unmerged branch fix/mobile-completion-guards; CLAUDE.md (head 0046, dispatcher invariants) treats them as landed. Git log shows no such merge visible in the five recent commits; status unverified.
- HANDOFF A2 proposes letting a correct PIN clear the lock; CLAUDE.md L140 says the lock deliberately blocks a correct PIN and must not be fixed. Direct contradiction between authoritative file and handoff register.
- HANDOFF s5.3 says do not ship APK until C1/C2 fixed, while s1/s3 say the C1/C2 guards merged as 8dafcec and CLAUDE.md describes them as in place. Rows C1/C2 are therefore classed solved_entry on the weight of s1.
- HANDOFF 4.4 still lists non-ASCII token 500s (messaging, ops), lost-race rollback and post-withdrawal wa.me link as open; CLAUDE.md L134/L243 and s3 item 1 describe them as fixed. Classed open_defect per the source; likely stale.
- HANDOFF s1 says prod Sentry is unset; recent commit a31924a wires the mobile Sentry DSN. Point-in-time claim already drifting.
- CLAUDE.md L86 says real Android compile is not gated; HANDOFF 5.3 agrees. No verification commands exist for any trap; only a few items name a command or test (alembic check chain, audit SQL, curl for A1, two named dead-letter/consent tests).
- HANDOFF s3 (not in the requested section list) was extracted because it holds the richest solved entries; s5.1-5.4 were not.
- Very few items record failed approaches in the sense of tried-and-abandoned fixes: the strong ones are railway up --ci re-run, alembic revision targeting on rollback, naive useState for payment id, login-lock PIN verification, B3 dead-letter placement, fully-offline close.
- Locators for multi-line bullets are the bullet start line; line numbers are as of the working tree read, not pinned to a commit.
