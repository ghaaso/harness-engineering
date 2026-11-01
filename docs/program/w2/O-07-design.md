# O-07 design

PRINCIPLE. Postings are a downstream, append-only projection of the operational ledgers (kacha khata). Odoo (pakka khata) never feeds back. A new backend slice, backend/app/features/accounting/ (router → service → repository, models, schemas, tests), owns the projection. It reads jobs and attendance only through their service.py; add import-linter edges accounting→jobs.service and accounting→attendance.service, never the reverse. The only change to an existing write path is void_payment stamping voided_at/voided_by. Postings are found by a STATE-BASED stager (source rows with no posting, via anti-join), never by the job_event cursor. Payment and negotiate events carry no amounts or ids (S16), and seq is not commit-ordered (O07-F6). Every posting is an immutable snapshot. A correction is always a reversal plus a new revision, never an update, because Odoo refuses to modify a posted move and a changed External ID duplicates.

(1) RECORD SET AND STABLE IDENTIFIERS
- job_payment (id uuid = source_id; client_id; amount_paisa; method; recorded_at; voided/void_reason, plus voided_at/voided_by from 0047) → 'payment' posting, and 'payment_reversal' on void.
- job (id uuid; token for human reference only; status closed; closed_at; abandoned; bill_original_paisa; bill_negotiated_paisa) + job_completion (time_spent_mins, labour_rate_paisa snapshot, fuel_paisa, fuel_basis) + job_material (qty × unit_paisa) → 'invoice' posting at CLOSE, on accrual basis only. Close is the first moment the bill is immutable: closed is terminal, and both submit_completion (service.py:1155) and negotiate_bill (service.py:1385) refuse a closed job. Before close, bill edits are operational and post nothing.
- staff_ledger (id; client_id; kind; amount_minor; occurred_on; voided_at/voided_by) + staff_ledger_chain (row_hash of the create/void event) → 'ledger_entry' and 'ledger_reversal'. The chain hash goes into the snapshot as a tamper link.
- advance_request → NO posting of its own. Its money is exactly the one staff_ledger 'advance' row (advance_request.ledger_id). The request id rides in the snapshot so nothing is counted twice. Rejected or failed requests moved no money.
- payroll_export is money-free and produces no postings. job_event and dispatch_cursor are not drawn on.
- External ID = 'fixflow_<kind>_<source_uuid hex32>', with suffix '_x<n>' for the nth reversal and '_r<n>' for revision n ≥ 2. Line IDs are '<move_xid>_l<n>'. Customer partners: 'fixflow_cust_<customer uuid>' when job.customer_id is resolved, else one 'fixflow_cust_walkin' (owner decision on PII to Odoo). Tech partners: 'fixflow_tech_<shop>_<tech_id>'. Never use a seq, token or chain seq: a fresh DB restarts them, and t1..t5/m1 recur (S14, O07-F11).

(2) APPROVAL BOUNDARY (does not exist today)
Table posting:
- id uuid PK; shop_id FK shop.
- seq bigint, per-shop gapless, assigned under pg_advisory_xact_lock(shop) held to commit (the staff_ledger_chain pattern, so it is commit-ordered).
- source_kind CHECK IN (payment, payment_reversal, invoice, ledger_entry, ledger_reversal); source_id uuid; source_rev smallint default 1; UNIQUE (source_kind, source_id, source_rev) is the stager's idempotency key.
- reverses_posting_id uuid FK posting, NULL; CHECK (reversal kind ⇔ NOT NULL); UNIQUE partial (reverses_posting_id) so a posting is reversed at most once.
- external_id varchar(128) UNIQUE NOT NULL.
- accounting_date date (the fact's shop-local date); currency char(3) (snapshot of shop.currency, never a hardcoded 'PKR').
- amount_minor bigint CHECK > 0 (unsigned; direction comes from kind via a code table POSTING_TEMPLATE, the LEDGER_SIGN discipline).
- lines jsonb: [{role, account_code|null, debit_minor, credit_minor, label, partner_xid}], with Σdebit = Σcredit = amount enforced in the service and re-checked by a verify endpoint.
- snapshot jsonb: canonical, PII-free source fields (job token, method, tech_id, ledger kind, chain row_hash, labour/fuel/materials split, original and payable figures, advance_request id). snapshot_hash char(64) = sha256(version‖canonical bytes), using a stdlib-only canonicaliser like attendance/chain.py.
- flags text[]: abandoned, negotiated_below_original, negotiated_stale, post_close_void, void_date_unknown, offline_dated, original_rejected.
- status CHECK IN (staged, approved, rejected, exported, posted, transport_failed).
- staged_at; decided_by FK technician; decided_at.
- reject_code CHECK IN (duplicate, test_entry, not_business, voided_before_posting, covered_by_opening_balance, other); reject_reason varchar(512). CHECK (status <> 'rejected' OR (reject_code IS NOT NULL AND length(btrim(reject_reason)) > 0)).
- export_id FK posting_export NULL; remote_ref varchar(64) NULL; posted_at NULL.
- Enforcement: a BEFORE UPDATE trigger rejects any change to source_*, external_id, accounting_date, currency, amount_minor, snapshot, snapshot_hash or reverses_posting_id, and any change to lines once status ≠ staged. A BEFORE DELETE trigger raises. Status moves only by atomic conditional UPDATE with an allowed-from table (the try_transition pattern): approve staged→approved; reject staged→rejected; export approved→exported; post approved|exported→posted; transport_failed⇄approved. A replay is an idempotent success.

Table posting_decision (append-only): id; posting_id FK; decision IN (approve, reject, restage); actor FK technician; reason_code; reason; client_id UNIQUE; decided_at. Status is the projection of the latest decision. A 'restage' of a rejected row never edits it: it stages a NEW posting at source_rev + 1, with a new external_id, linked through the snapshot. The rejected row stays queryable forever.

Table posting_attempt (append-only): id; posting_id NULL FK; export_id NULL FK; transport IN (csv, odoo_json2); attempt_no; started_at; finished_at; outcome IN (ok, already_present, failed_definitive, ambiguous, auth_failed, rate_limited); http_status; remote_ref; request_sha256; error varchar(1024).

How sources become postings (stager job 'posting-stage-scan': daily, plus an on-demand manager trigger; idempotent; idle until posting_start_date is set; only facts with accounting_date ≥ start):
- Payment: Dr cash_<method>, Cr customer_receipts. The owner maps customer_receipts to a revenue account (cash basis) or to receivable (accrual). A payment is staged even if already voided, so the trail is complete.
- Void: for each voided payment whose payment posting exists and is not yet reversed, stage a payment_reversal with the lines swapped, dated voided_at; if voided_at is NULL, use the staging date and flag void_date_unknown. If the original was rejected, the reversal is still staged and flagged original_rejected, and the manager rejects it with voided_before_posting, so both sides stay visible.
- Bill / invoice (accrual only): every closed job with a bill, abandoned included (flagged; O07-F3). Lines: Dr receivable = payable; Cr revenue_labour; Cr revenue_fuel; Cr revenue_parts (gross original); and a sales_discount line for original − payable on whichever side its sign requires (O07-F4, O07-F9).
- Bill correction: no path today changes a closed bill. If one is ever added (reopen) or a non-rejected posting's source snapshot_hash drifts, stage a reversal of the prior revision plus a new revision. Never update.
- Ledger entry, by kind: earning Dr wages_expense / Cr wages_payable[tech]; adjustment_credit Dr wages_expense / Cr wages_payable; advance Dr staff_advances[tech] / Cr cash_cash; settlement Dr wages_payable / Cr cash_cash; adjustment_debit Dr wages_payable / Cr staff_deductions. The stager first calls attendance verify_ledger_chain and refuses to stage on a verify failure (alarm).
- Advance: covered by its ledger row, as above.
- Poison rows (e.g. amount ≤ 0 under the NOT VALID CHECK from 0038) are skipped with an app_event alarm and counted as 'unpostable' (O07-F8).

Manager step (all routes require_manager): GET /api/postings?status=staged; POST /api/postings/{id}/approve; POST /api/postings/{id}/reject {reason_code, reason} (required); POST /api/postings/approve-window {from, to, expected_count, expected_sum_minor}. Bulk approve needs a single confirmation, and returns 409 if the staged set changed since the manager looked. Approval resolves each role to the account_code_<role> setting and freezes the lines, and is refused (400 naming the role) while a role is unmapped. Rejection is per row and needs a typed reason. So the default path (stage everything, approve all) is full-fidelity, and leaving something out costs per-row effort that leaves a trace.

(3) DEFAULT TRANSPORT: window-keyed CSV for Odoo's importer (works on any plan)
- run_posting_export(shop_id, today) clones run_weekly_export's idempotent record + storage object + manager download, with three fixes. First, the window is over posting.decided_at (approval time) in shop-local dates, so late or back-dated facts go into the next export and keep their own accounting_date (O07-F2). Second, it takes pg_advisory_xact_lock and inserts posting_export first (ON CONFLICT DO NOTHING RETURNING), then claims rows with UPDATE posting SET status='exported', export_id=:id WHERE status='approved' AND export_id IS NULL AND decided_at in window, then writes deterministic bytes (ordered by seq) to accounting/<shop>/<from>_<to>/journal.csv plus manifest.json and manifest.csv, records csv_sha256, and commits; a re-run returns the same record and bytes (O07-F10). Third, export is a scheduler job (weekly, or monthly as the owner chooses) plus on-demand.
- posting_export columns: id; shop_id; window_from; window_to; storage_path; manifest_path; posting_count; move_count; line_count; total_debit_minor; total_credit_minor; csv_sha256; rejected_count; rejected_sum_minor; pending_count; pending_sum_minor; created_at; UNIQUE (shop_id, window_from, window_to).
- CSV (account.move, move_type entry, in Odoo's parent/child import shape; verify the column labels on the owner's version, 20.0 or SaaS 19.x): External ID, Journal, Date, Reference, Journal Items/External ID, Journal Items/Account, Journal Items/Partner, Journal Items/Label, Journal Items/Debit, Journal Items/Credit. The first row of each move carries the move fields; its other line rows leave them blank. Reference = 'FixFlow <kind> job #<token>/<ledger kind> <external_id>'. Amounts are converted from integer minor units at the edge with divmod into a fixed-decimal string (decimal places from currency), never through float. Journals: journal_code_sales / cash / payroll.
- Manifest as separate files (O07-F12): export id; window; posting/move/line counts; Σdebit = Σcredit in minor units; count and sum per kind; csv sha256; first and last posting seq; the window's rejected count and sum by reason_code; and the pending count and sum.
- Idempotency: Odoo's importer updates the record holding an existing External ID (R-02 F10). Line External IDs stop a re-imported draft move from appending lines. Re-importing an already-posted move should fail loudly rather than duplicate (verify in the test company).
- Acknowledgement: after import the manager calls POST /api/postings/exports/{id}/imported, which moves postings exported→posted and writes a posting_attempt with transport csv and outcome ok. GET /api/postings/exports returns signed URLs (mint_playback_url) through the existing storage abstraction, R2 or self-hosted.

(4) OPTIONAL TRANSPORT: JSON-2 behind a Protocol (Custom plan only, S15)
- core/posting_transport.py: async Protocol PostingTransport { name; async find(external_id) -> RemoteRef|None; async push(snapshot) -> RemoteRef }, with typed DefinitiveTransportError, AmbiguousTransportError and TransportAuthError. idempotency_key = external_id. It mirrors PaymentRail's narrow-surface contract but is async (O07-F13).
- Default CsvExportTransport: push is a no-op, the export is the transport. OdooJson2Transport is configured by FIXFLOW_ODOO_URL, FIXFLOW_ODOO_DB (sent as the X-Odoo-Database header) and FIXFLOW_ODOO_API_KEY (an env secret, never a shop_setting), and authenticates as a dedicated minimal-rights bot user. It never uses /xmlrpc or /jsonrpc (deprecated, removal in Odoo 22).
- Worker: scheduler job 'erp-push', gated by settings.enable_erp_push (default OFF), single replica. Each tick selects approved|exported, not-posted postings ORDER BY seq. A reversal waits until its original is posted.
- Per posting: (a) search-before-create: /json/2/account.move/search_read with domain ref = external_id (or ir.model.data module 'fixflow' + name); a hit means attempt outcome already_present, then mark posted. (b) Otherwise create in ONE call that carries the External ID: prefer account.move/load with an 'id' column (the importer's semantics), or else create with ref = external_id. Never split create and the xid link across two calls, because each JSON-2 call is its own transaction (R-02 F5). (c) action_post only if the owner chooses; the default leaves moves in draft for review in Odoo.
- Budget: a token bucket at 1 call per second, serial, no parallel calls. Chunk load() calls of up to about 50 moves.
- Failure handling: ambiguous (timeout, 5xx, connection) halts the tick, and the next tick re-searches. Definitive 4xx (e.g. unknown account) marks the posting transport_failed with a visible error and halts the queue by default. 401/403 halts and raises the 'erp_auth_failed' alarm. Every call writes a posting_attempt row.
- Key rotation: keys last at most three months (R-02 F3). The owner records odoo_api_key_expires_on; ops deep-health turns degraded and writes an app_event 21 days before expiry; rotation is manual (new key, env, setting). Programmatic res.users.apikeys.generate needs admin rights or a system parameter and is not the default.
- Lag alert: oldest approved-not-posted older than posting_lag_alert_hours (default 48), or oldest staged-undecided older than 7 days, shows on the ops deep-health surface plus an app_event. No pull from Odoo except remote_ref.

(5) RECONCILIATION VIEW
GET /api/postings/reconciliation?from&to (manager), per kind, over accounting_date:
- Operational totals use the stager's predicates, read straight from the source tables: Σ non-voided job_payment by method; Σ payable of closed jobs; Σ non-voided staff_ledger by kind, signed with LEDGER_SIGN.
- Projection totals: staged, approved, exported and posted, net of reversals.
- Delta = operational − posted, itemised as: unstaged (should be 0; non-zero means stager lag or a bug); unpostable (with source ids); pending decision; rejected by reason_code (count, sum, reason texts, actor); approved-not-exported; exported-not-acknowledged; transport_failed.
- Informational lines: negotiated discounts (original − payable) by actor; abandoned-with-bill totals; payments on jobs not yet closed; post-close voids; voids by actor.
- The rejected-sum line is shown first, and the same figure is printed on each export manifest. This is 'the cost of informality made visible' (BACKEND-REQUIREMENTS 3.15).

(6) MIGRATION SKETCH (head 0046 → next 0047)
- 0047 (one deploy):
  - CREATE posting, posting_decision, posting_attempt, posting_export. These are new empty tables, so FKs are inline and VALID (the 0039/0040 precedent).
  - Immutability and no-delete triggers on posting.
  - ALTER job_payment ADD voided_at timestamptz NULL, ADD voided_by varchar(64) NULL, with the FK to technician added NOT VALID then VALIDATEd in the same migration (a new all-NULL column is provably clean).
  - The service change in void_payment ships with it.
  - No dispatch_cursor 'erp' row and no posting seeds: the stager stays idle until posting_start_date is set.
  - Register the new specs.py keys; this needs no migration, unset means off.
- 0048 (separate deploy, after the audit SELECTs):
  - VALIDATE job_payment_amount_positive (the 0038 follow-up).
  - ADD job_payment.recorded_by FK → technician NOT VALID (populated human data), with VALIDATE in 0049 after an orphan audit.
  - Optionally ADD job_payment.shop_id NOT NULL DEFAULT 'default' with an FK. VALIDATE it in the same migration only because every value is the constant default.
  - Optionally ADD job_payment.captured_at NULL (O07-F7).
- Script backend/scripts/backfill_payment_voided_at.py (idempotent, dry-run by default, run via railway run or the self-host equivalent): sets voided_at and voided_by only where a job has exactly one voided payment and exactly one 'Payment voided — ' job_event; everything else stays NULL and gets flagged.
- Each migration updates CLAUDE.md's head number in the same PR.

(7) OWNER DECISIONS AND WHAT TO BUILD REGARDLESS
- Parts 1-2 (stager, approval):
  - Blocked on: posting_start_date (the cutover from the Phase 0 manual opening totals); cash vs accrual basis (whether invoices are staged); the reason_code vocabulary; whether abandoned billed jobs may be posted; whether negotiation below original needs a manager.
  - Build regardless: all four tables, the stager, the decision API, reconciliation and tests. The stager is internal, harmless and idle until a start date is set.
- Part 3 (CSV):
  - Blocked on: the Odoo version and the test company's chart of accounts and journals (role → code map); partner policy (per-customer partners send customer data to Odoo; the walk-in partner does not); whether imported moves stay draft.
  - Build regardless: the exporter, manifest, acknowledgement endpoint and role-map settings; dry-run against the test company.
- Part 4 (JSON-2):
  - Blocked on: whether the plan is Custom (Standard and One App Free mean CSV only, S15); a bot user; who owns key rotation.
  - Build regardless: the Protocol, a fake transport, the attempt log, and halt/lag/rotation alerts with tests. The Odoo adapter is written only after the plan is confirmed.
- Part 5: no decision needed; build now.
- Part 6: the 0048 audits need real data. Production is gone: a fresh self-hosted DB is trivially clean, but a restored backup must be audited first.
- Independent fixes worth doing first (cheap, and they stop under-reporting from being the easy path): stamp voided_at/voided_by; manager-gate or require a reason for negotiation below original and for abandoning a billed job; capture an offline payment time; reject payment client_id reuse across jobs or amounts.

---

## Amendments (2026-11-01, harness review — `../HARNESS-REVIEW-2026-11-01.md` HR-A4)

1. **Decide before building.** Parts 1–3 and 5 are no longer "build regardless". Two new
   phases (plan) gate P9a-1: **P9-0a**, a small Opus PR with the week-export script (read-only,
   run against an Appendix C restore, pseudonymised unless the owner allows real rows into the
   Odoo trial, refusing an empty week); and **P9-0b**, the owner session that answers the G1 Odoo
   questions, opens an Odoo test company on the Pakistani chart, imports the week twice, and lets
   the accountant choose granularity (per-payment vs daily close per method), the approval unit,
   the basis and the custody design — or the owner signs the plan's defaults as answers. P9a-1
   waits for P9-0b and for P5d-2 done. The `cash_remittance` source is built in P9a-1 and its
   manager form in P9b when P9-0b's recorded custody answer is yes. If there is no Odoo and no
   accountant, P9a/P9b ship the approval boundary and reconciliation, P10a ships the journal CSV
   export as written, and only the Odoo import runbook, P10b and P11 are dropped.
2. **Cash custody (`O07-F17`).** If P0a item 15 confirms that technicians hold field cash or
   receive online payments into personal wallets before remitting, the posting model gains a
   manager-recorded `cash_remittance` source: tech-recorded cash debits `cash_with_staff[tech]`,
   card and online receipts debit `receipts_clearing`, and a remittance moves the money to
   `cash_in_hand` with the variance to the staff ledger or cash over/short. The accrual-only
   invoice kind waits for a basis decision (P0a item 16) and is then sourced from
   `job_bill_revision` only.
3. **Atomic closed-job guards (`O07-F16`, P2, P7a).** `negotiate_bill`, `log_payment` and
   `void_payment` refuse a closed job by a conditional UPDATE with the status predicate
   (preferred) or a `SELECT … FOR UPDATE` with `populate_existing()` in the same transaction,
   with a two-session race test against a concurrent close.
4. **Hosting and transport unchanged:** Odoo Online + window-keyed CSV by default. Self-hosted
   Odoo Community 19 ships the JSON-2/RPC API free (`addons/rpc`, LGPL-3) but lacks the Enterprise
   accounting reports and would add a second stateful app to one developer's host; it is the
   option if a live push or the parked connector product ever matters.
