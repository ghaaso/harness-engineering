<!-- Authored for FixFlow, 2026-11-04 -->

# FixFlow posting shapes (O-07) — what the design says, line by line

Source of truth: `docs/program/w2/O-07-design.md` (PR #182, head 3415b5e; line numbers refer to
that head). This file restates it for an implementer or reviewer; when they differ, the plan's
phase scopes and §6.5 rulings (`docs/program/SHIP-PLAN-2026-11.md:1455-1499`), then the design
note and its dated amendments, win.

## 1. One principle, two transports

`O-07-design.md:3` — "Postings are a downstream, append-only projection of the operational
ledgers (kacha khata). Odoo (pakka khata) never feeds back." The stager is "STATE-BASED ...
never by the job_event cursor"; "A correction is always a reversal plus a new revision, never an
update".

| | Shape A — window-keyed External-ID CSV (default) | Shape B — staged, approved, idempotent JSON-2 push (optional) |
| --- | --- | --- |
| Design part | (3), `O-07-design.md:46-52` | (4), `O-07-design.md:54-62` |
| Plan phase | P10a builds, P10b rehearses | P11 (Custom plan only) |
| Odoo plan | any ("works on any plan", :46) | Custom ("Custom plan only, S15", :54) |
| Idempotency | importer updates the record that holds the External ID (:51) | search-before-create + one-call create carrying the External ID (:58) |
| Who moves it to `posted` | manager acknowledgement `POST /api/postings/exports/{id}/imported` (:52) | the `erp-push` worker, `already_present` on a hit (:57-58) |
| Shared front half | stager → `posting` (staged) → `posting_decision` (approve/reject) → approved (:13-44) | same |

Both shapes consume only **approved** postings. Neither reads `job_event` or `dispatch_cursor`
(`O-07-design.md:10` "job_event and dispatch_cursor are not drawn on"; :78 "No dispatch_cursor
'erp' row").

## 2. External ID grammar (`O-07-design.md:11`)

- Move: `fixflow_<kind>_<source_uuid hex32>`; nth reversal `_x<n>`; revision n ≥ 2 `_r<n>`.
- Line: `<move_xid>_l<n>`.
- Partners: `fixflow_cust_<customer uuid>` when resolved, else one `fixflow_cust_walkin`; techs
  `fixflow_tech_<shop>_<tech_id>`.
- Never a seq, token or chain seq: "a fresh DB restarts them, and t1..t5/m1 recur (S14, O07-F11)".
  Evidence: `backend/app/features/attendance/service.py:1372` — `seq = head[0] + 1 if head is
  not None else 1`; `backend/app/features/jobs/models.py:118` — `UniqueConstraint("token",
  name="uq_job_token")` (unique only within one database).
- Odoo-side storage (INFERRED from `references/odoo-api-facts.md` §6): a dot-less id loaded by
  `load()` is stored under module `__import__`; the design's "ir.model.data module 'fixflow'"
  (`O-07-design.md:58`) holds only if the push passes that module explicitly. Verify in the test
  company before relying on either.

## 3. Shape A — the CSV (`O-07-design.md:47-51`)

- Columns (verify labels on the owner's version, 20.0 or SaaS 19.x): External ID, Journal, Date,
  Reference, Journal Items/External ID, Journal Items/Account, Journal Items/Partner, Journal
  Items/Label, Journal Items/Debit, Journal Items/Credit. First row of a move carries the move
  fields; its other line rows leave them blank (:49).
- Window over `posting.decided_at` in shop-local dates, not over the fact date (O07-F2, :47).
- Record first under `pg_advisory_xact_lock`, `ON CONFLICT DO NOTHING RETURNING`, claim rows,
  deterministic bytes ordered by `seq`, sha256 on the record; a re-run returns the same record
  and bytes (O07-F10, :47). At a31924a (2026-11-04), `run_weekly_export` does the opposite order:
  `backend/app/features/attendance/service.py:1262` (`put_bytes`) precedes `:1263`
  (`add_export`).
- Manifest is separate files `manifest.json` + `manifest.csv`, never a row in the import CSV
  (O07-F12, :50). The gap analysis's "a manifest line carries count + sum"
  (`docs/requirements-2026-07-gap-analysis.md:114`) is superseded.
- The manifest **carries the `posting_decision` ids** of the batch (plan ruling R9; P10a scope,
  `SHIP-PLAN-2026-11.md:1182`; `:1494-1495` "**export batches** → `posting_export` whose
  manifest carries the `posting_decision` ids (P10a)"). A manifest without them fails P10a.
- Self-approval (`decided_by = recorded_by`) is **flagged, not refused**, by default
  (`SHIP-PLAN-2026-11.md:1486` "**R9 — self-approval is flagged, not refused**"; P9a-1 scope
  `:1143`). The flag is visible in the P9b queue (`:1170`); the owner may switch to refuse
  once a second approver exists (`:1495`).

### Amounts: integer minor units to a fixed-decimal string

`O-07-design.md:49` — "converted from integer minor units at the edge with divmod into a
fixed-decimal string (decimal places from currency), never through float". Amounts are unsigned
(`posting.amount_minor bigint CHECK > 0`, :21; the column direction is Debit vs Credit).

```python
_DECIMALS = {"PKR": 2}          # ISO 4217 minor-unit exponent; extend deliberately

def minor_to_decimal_str(amount_minor: int, currency: str) -> str:
    if amount_minor < 0:
        raise ValueError("unsigned by contract")  # direction comes from the column
    places = _DECIMALS[currency]                  # KeyError = refuse an unknown currency
    if places == 0:
        return str(amount_minor)
    whole, frac = divmod(amount_minor, 10 ** places)
    return f"{whole}.{frac:0{places}d}"
```

Currency is the snapshot of `shop.currency` (`backend/app/features/tenancy/models.py:53`,
`server_default=text("'PKR'")`), never a hard-coded `'PKR'` (:20).

## 4. Shape B — the push (`O-07-design.md:55-61`)

- `core/posting_transport.py`: **async** Protocol `PostingTransport { name; async
  find(external_id); async push(snapshot) }`, typed `DefinitiveTransportError`,
  `AmbiguousTransportError`, `TransportAuthError`; `idempotency_key = external_id` (:55). Not the
  sync shape of `backend/app/core/payment_rail.py:49` (`def disburse(`) — O07-F13.
- Env, never `shop_setting`: `FIXFLOW_ODOO_URL`, `FIXFLOW_ODOO_DB` (sent as `X-Odoo-Database`),
  `FIXFLOW_ODOO_API_KEY` (:56). None exists today: `backend/app/core/config.py:24` sets `env_prefix="FIXFLOW_"` and
  no Odoo key is declared (VERIFIED-BY-COMMAND, grep, 2026-11-04).
- Per posting: (a) `search_read` on `account.move` with `ref = external_id` → hit = outcome
  `already_present`; (b) else ONE call that carries the External ID (`load` with an `id` column,
  else `create` with `ref`); never split create and xid link, "because each JSON-2 call is its
  own transaction" (:58); (c) `action_post` only if the owner chooses (:58).
- Budget: 1 call/s, serial, `load()` chunks of ~50 (:59).

### Failure classification (`O-07-design.md:60`; `posting_attempt.outcome`, :33)

| Response | Outcome | Effect |
| --- | --- | --- |
| 2xx, created | `ok` | posting → `posted`, `remote_ref` stored |
| search hit | `already_present` | posting → `posted`; no create |
| timeout, connection error, 5xx | `ambiguous` | halt the tick; next tick re-searches first |
| 401 / 403 | `auth_failed` | halt; `erp_auth_failed` alarm |
| other definitive 4xx (e.g. 422, unknown account) | `failed_definitive` | posting → `transport_failed`, visible error, queue halts by default |
| throttled | `rate_limited` | the design names the outcome only; handling is INFERRED: back off, never parallelise |

This is the same split as the mobile outbox (`CLAUDE.md:154-155`: "anything ambiguous
(offline/5xx/timeout) is kept and retried"). The gap analysis states why it matters:
`docs/requirements-2026-07-gap-analysis.md:100-101` — "Odoo's JSON-RPC `create` is **not
idempotent**. A timeout after commit means a retry double-posts."

## 5. Corrections

- A posted move is never updated or deleted from FixFlow: a correction is a reversal plus a
  new revision (`O-07-design.md:3`, :39). A rejected posting is never edited: `restage` makes a
  new posting at `source_rev + 1` with a new External ID (:31).
- `posting` rejects UPDATE of identity/amount columns and any DELETE by trigger (:29); rejected
  rows stay forever (`docs/BACKEND-REQUIREMENTS-2026-07.md:593` — "Rejected items are never
  deleted.").

## 6. The P9-0b decide-before-build checklist (plan `## P9-0b`, SHIP-PLAN-2026-11.md:1115-1124)

Recorded as answers in W0-results before P9a-1 opens:

1. G1 §5 Odoo questions 1–3 (org and plan; which records are pakka; approver and unit).
2. Odoo test company on `l10n_pk` ("an Odoo Online trial or One App Free with Invoicing is
   enough").
3. Real rows or `--pseudonymise`; the P9-0a export of one real week from an Appendix C restore.
4. **[owner]** imports it **twice** (`SHIP-PLAN-2026-11.md:1119`): update-not-duplicate
   confirmed by hand. An agent prepares the check list and reads the recorded result only.
5. Granularity, approval unit, basis (cash/accrual), custody (O-07 amendment 2) — or the owner
   signs the §4 defaults.

No Odoo and no accountant → P9a/P9b/P10a still ship; only `RUNBOOK-ODOO-IMPORT`, P10b and P11
are dropped (SHIP-PLAN-2026-11.md:1127-1130).
