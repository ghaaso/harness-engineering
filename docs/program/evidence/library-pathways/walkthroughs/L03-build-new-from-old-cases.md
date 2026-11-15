# L03 Building something new where similar things exist: real cases

Repos: FixFlow = C:/Users/User/Documents/projects/EMS_workshop1 (F). Clinic = C:/Bilal_Migration/User/Downloads/20_PROJECTS/24_Clinic_Workshop (C).
Facts only. Commit trailers show Claude Fable 5 wrote the FixFlow July commits 26c9f1e..db545cb; the 0046 hardening trailer says Claude Opus 5. Git author shows "Your Name".

## Case 1. Staff money chain: ledger (0039), hash chain (0041), advance requests (0042), plus a naming change
When: 2026-07-26, three commits in one day. Model: Claude Fable 5 (commit trailers).
What happened: 0039 created staff_ledger with a new money naming rule (amount_minor). Older tables use *_paisa (0007, 0008, 0015, 0035, 0038). Two later slices reused ledger pieces. 0041 kept the ledger append-only and added a per-shop seq under pg_advisory_xact_lock. 0042 reused the ledger's unique client_id dedup as its exactly-once guard, a PaymentRail Protocol "the same seam as the storage backend", the 0040 shop_setting registry, and the "new empty table, FKs VALID" migration rule first stated in 0039.
Evidence:
- 0039 migration docstring: "All FKs are created VALID in this migration: the table is brand new and empty, so there is no populated-table orphan risk and no need for the NOT VALID two-step"
- 0042 migration docstring: "New empty table (FKs VALID; nothing to backfill)."
- 0042 commit body: "a pre-minted disbursement_client_id becomes the ledger row's client_id, so the ledger's existing unique-client_id dedup guarantees EXACTLY ONE money row"
- 0041 commit body: "Kept SEPARATE from staff_ledger on purpose - the ledger's void mutates a row in place, so a row-hash on the ledger would break on every legitimate void."
- Convention change: attendance/models.py (at 26c9f1e) line 442 "Money is integer minor units of shop.currency (seed PKR => paisa)"; CLAUDE.md line 70 "Existing columns keep their *_paisa names (no churn on a live ledger); new money columns are named *_minor". jobs/models.py line 208 still has bill_original_paisa.
Sources: F commits 26c9f1e, acba12a, db545cb; backend/alembic/versions/0039_staff_ledger.py, 0041_staff_ledger_chain.py, 0042_advance_request.py; CLAUDE.md.
Later moment: 0042 itself needed the 0039 and 0040 knowledge the same day. 0040 (7d567c7) also snapshots "labour_rate_paisa + fuel_rate_paisa_per_km" in jobs while the new ledger uses *_minor: two names for one unit in the same week (7d567c7 commit body).

## Case 2. shop_setting (0040): borrowed the job_event_seq idea; first version used created_at and failed in CI
When: 2026-07-26. Commits 7d567c7 then 12c16f1. Model: Claude Fable 5.
What happened: 0040 made an append-only "latest row per (shop,key) wins" table. The first version ordered by created_at. The CI integration test against real Postgres caught it. Fix: a monotonic seq from a sequence, "the job_event_seq client-side-default pattern" that already existed in 0027 (2026-07-08).
Evidence (12c16f1 body): "two writes in one transaction share a created_at (now() is transaction-start time in Postgres), so 'latest write wins' was decided by random UUID order and the second write could lose. seq (the job_event_seq client-side-default pattern) is monotonic across and within transactions"
7d567c7 also added "a new conscious import-linter edge jobs.service -> tenancy.service" (CLAUDE.md "Respect slice boundaries").
Sources: F commits 7d567c7, 12c16f1; backend/alembic/versions/0027_events_outbox.py lines 49-51 (CREATE SEQUENCE job_event_seq); 0040_shop_settings.py lines 43-47, 71 (shop_setting_seq, ix_shop_setting_effective).
Later moment: same day, 0041 (acba12a) used a per-shop gapless seq under pg_advisory_xact_lock; attendance/models.py lines 498-499 say it is "NOT a DB sequence". No later record of created_at ordering reappearing was found.

## Case 3. customer_messaging slice (0034) on top of the job_event outbox (0027); the cursor hazard found 24 days later
When: built 2026-07-08 (834311f); hardened 2026-08-02 (c731e66, merged as da988e2, PR #170). Built by Claude Fable 5; hardening trailer Claude Opus 5.
What happened: 0027 (d1f78cd, 2026-07-08) added dispatch_cursor and a dispatcher. 0034 the same day added the WhatsApp consumer on top, with UNIQUE(job_id, kind) as the idempotency guard and claim-before-send. The older cursor's first-use behaviour (minted at last_seq=0) was not handled by the new slice. The dispatcher stayed OFF, so nothing was sent.
Evidence:
- 0034 commit body: "UNIQUE(job_id, kind) IS the idempotency guard, so outbox replays ... can never double-send"; "enable_dispatcher stays safe to flip."
- 0046 docstring: "run_dispatch_once mints a missing cursor at last_seq=0, so the first tick after someone sets FIXFLOW_ENABLE_DISPATCHER=true would drain the entire history of job_event ... Measured against prod at the time of writing: 87 events ... 36 WhatsApp messages about jobs that may be months old, to real customers."
- 0046: "uq_customer_message_job_kind ... make the first decision per (job, kind) permanent - including a suppressed one."
- c731e66 body: "Session.rollback() expires the whole identity map, so later events must be re-hydrated before the handler reads them or they raise MissingGreenlet"
Sources: F commits 834311f, d1f78cd, c731e66, da988e2; alembic 0027_events_outbox.py, 0034_customer_message.py, 0046_seed_dispatch_cursor.py lines 1-30; docs/HANDOFF-2026-07-28-open-work.md line 303 ("B1. Enabling the dispatcher replays the entire job_event history as live customer WhatsApp"); CLAUDE.md "The outbox dispatcher" section.
Later moment: CLAUDE.md now says "Never message a customer about an old event"; docs/lifecycle-audit-followups-2026-07.md is listed in CLAUDE.md as "Read before ... adding an outbox kind". The record holds no later outbox consumer built after 0046.

## Case 4. Clinic: later slices and the item lock rule (FOR UPDATE to FOR NO KEY UPDATE; 32-bit to 64-bit advisory key)
When: S03, S04, S06, S07, S08 built 2026-11-04 in parallel worktrees on the S02 kernel; fixed by the kernel follow-up merged 2026-11-09 (c6adf7b). Reviewers: Opus (task record says "Opus, high").
What happened: S03's receipt posting locked item rows FOR UPDATE before the stock scope. S04's issue (D04-06) used FOR NO KEY UPDATE, because deferred FK checks of a writer holding the scope take FOR KEY SHARE on the item. S03 merged first (37c172d) without that rule, so a receipt and a reversal could deadlock. Same shape for advisory locks: S07's cash reference lock and S04's bill identity lock use the 2-key hashtext form; the kernel moved to a 64-bit key (D02-37); the two stayed on the old form "until their owners move both together".
Evidence:
- docs/tasks/clinic-build/task.md line 309: "G04-18 | S01's freeze_conversion callers and S03's receipt posting still lock the item FOR UPDATE before the scope, so a receipt and a reversal can deadlock (retried by the kernel)"
- docs/application/conventions.md line 95: "Lock an item row FOR NO KEY UPDATE unless the row itself changes ... FOR UPDATE there can deadlock (D04-06)"
- conventions.md line 97: "An advisory lock is taken with kernel.advisory_xact_lock(namespace, key) (one 64-bit key, D02-37), never pg_advisory_xact_lock(n, hashtext(...)); S07's cash reference lock and S04's bill identity lock stay on the old form"
- conventions.md line 102 (S06 additions): "Global lock order (PROPOSED addition to D02-08): the supplier row after the draft and before the period and counter"
Sources: C commits 7429aa2..37c172d (S03), 156d86e..d96e2d6 (S04), f54b729..948735a (S08), b356158, d572ee2, 43e6f8c, merge c6adf7b; docs/application/s02-decision-record.md D02-37, D02-38; s04-decision-record.md D04-06; docs/tasks/kernel-followup/task.md lines 17-18, 354 (P-7).
Later moment: the kernel follow-up (2026-11-09) and S08's D08-19 (reversal waits with FOR KEY SHARE; D02-38 says a consumer of a receipt's layer and that receipt's reversal "deadlock once and the kernel retries"). Staging rig finding F-S02-2 (docs/tasks/staging-rig/evidence/f_posix_checks-20261104T104717Z.md) names the 32-bit key.

## Searched
F: git log all refs for backend/alembic/versions (0020-0046); commits 26c9f1e, 7d567c7, 12c16f1, acba12a, db545cb, 834311f, c731e66, da988e2; NOT VALID notes in 0032/0033/0044/0045; CLAUDE.md. Not read: web and mobile twins of these slices, and session transcripts (no transcript quotes used). C: the first 200 commits in order, conventions.md, kernel-followup and clinic-build task records, S02 and S04 decision records.
