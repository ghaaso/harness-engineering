---
name: pakistan-accounting-context
description: >-
  Pakistan small-business accounting and tax context for FixFlow's books work (register O-07,
  findings O07-F1..F17; phases P9-0b, P9a-1, P9b, P10a). Use it when designing, reviewing or
  briefing anything that turns FixFlow's operational money (job_payment, job bills, staff_ledger)
  into formal books or a tax figure: the kacha-khata cash book versus the pakka-khata formal books
  in Odoo, the split between Sindh Sales Tax on Services (SRB, provincial, repair labour) and the
  federal Sales Tax Act 1990 (FBR, goods/parts), Income Tax Ordinance 2001 s.174 record keeping,
  what an FBR/SRB-facing export must carry and how long it is kept, and how statutory rates are
  stored (integer basis points in shop_setting, never hardcoded). Facts are as fetched on
  2026-11-04 with a URL per fact. Do NOT use it to file a return, to decide the shop's
  registration status or tax class (owner and accountant decide in P9-0b), to give tax advice, or
  for Odoo payload/JSON-2 detail (that is odoo-accounting-import).
---

# Pakistan accounting context (FixFlow, O-07)

Status: _researched_ (no upstream skill exists). Statute and FBR/SRB facts were fetched on
2026-11-04; each lives in a reference row with its URL. This skill gives context and the rules
FixFlow already holds; **it never decides a tax position**. That is the owner's call, with the
accountant if there is one, in P9-0b.

## 1. FixFlow facts (verified 2026-11-04)

Short forms: `SHIP-PLAN` = `docs/program/SHIP-PLAN-2026-11.md`, `O-07-design.md` =
`docs/program/w2/O-07-design.md` (both PR #182); `BACKEND-REQUIREMENTS` =
`docs/BACKEND-REQUIREMENTS-2026-07.md`, `gap-analysis` = `docs/requirements-2026-07-gap-analysis.md`;
`jobs/`, `tenancy/`, `attendance/` = `backend/app/features/<slice>/`. Fact ids SRB-n / FBR-n / Un
are rows in the two reference files (§6).

### 1.1 What exists today

- **There is no tax concept in the code.** `grep -rniE "\b(ntn|strn|sntn|fbr|srb|sales[ _-]?tax|gst|vat)\b"`
  over `backend/app backend/alembic src technician-app/src` returns 0 hits (VERIFIED-BY-COMMAND,
  2026-11-04). No purchase or supplier table exists either (grep for `class Purchase|Supplier|Restock`
  in `backend/app`: 0 hits), so the input-tax side of BACKEND-REQUIREMENTS 3.14 has no data yet.
  The only repo mentions are owner questions: `docs/BACKEND-REQUIREMENTS-2026-07.md:683-684` and
  `docs/requirements-2026-07-gap-analysis.md:129-130`.
- **Money is integer minor units.** `CLAUDE.md:116` "**Money is integer minor units** (1 Rs = 100
  paisa), never floats"; new columns are `*_minor` (`CLAUDE.md:117-118`). The unit comes from
  `backend/app/features/tenancy/models.py:52-53` `currency ... server_default=text("'PKR'")`; the
  shop-local date from `tenancy/models.py:49-51` (`'Asia/Karachi'`).
- **Single shop, one tax status.** `CLAUDE.md:105-106`: `shop_id` exists but the code uses a
  `DEFAULT_SHOP_ID` constant.
- **Rates belong in the settings registry, as basis points.** `backend/app/features/tenancy/specs.py:10-13`
  "a tax rate) must be integer basis points, never a float"; `:17-20` "Upcoming slices (advances
  3.4, bonus 3.7, tax 3.16) register their parameters here — defaulted off, flagged unset". The bps
  pattern already exists: `specs.py:99-102` (`KEY_ADVANCE_CAP_FRACTION_BPS`, `unit="basis points"`).
  Registry mechanics: `SETTING_SPECS` at `specs.py:62`, `canonicalize` at `:147`. `shop_setting`
  rows are append-only (`tenancy/models.py:62-63`).
- **Gap: the registry validates a minimum only.** `SettingSpec` has `min_int` and no maximum
  (`specs.py:59`); `canonicalize` checks only `value < spec.min_int` (`specs.py:161-162`). A rate key
  would accept 150000 bps (1500%) unless its service bounds it (0..10000).
- **The bill (the source of any invoice figure).** `backend/app/features/jobs/models.py:208-209`
  `bill_original_paisa`, `bill_negotiated_paisa`; `:216` `bill_sent_at` (the freeze stamp, set on
  first send at `backend/app/features/jobs/service.py:1431-1432`); the freeze rule is `CLAUDE.md:199`.
  Bill components: `job_completion.time_spent_mins` (`jobs/models.py:297`), `fuel_paisa` (`:300`),
  `labour_rate_paisa` snapshot (`:302`); parts are `JobMaterial` (`:336`) with `name_raw` (`:357`),
  nullable `part_id` (`:360`), `qty` / `unit_paisa` (`:365-366`). The customer can be unresolved:
  `job.customer_id` is nullable (`jobs/models.py:136`).
- **The cash book (kacha khata).** `JobPayment` (`jobs/models.py:465-466`): "Append-only cash/revenue
  ledger"; `method IN ('cash', 'card', 'online')` (`:472`); `amount_paisa > 0` shipped NOT VALID in
  0038 (`:473-476`, O07-F8); columns `amount_paisa`, `method`, `recorded_by`, `recorded_at`,
  `voided`, `void_reason` (`:486-495`) — no `voided_at` / `voided_by` yet (O07-F5; O-07 adds them in 0047).
- **Staff money.** `LEDGER_SIGN` (`backend/app/features/attendance/models.py:405`), `StaffLedger`
  (`:414`) with `amount_minor > 0` (`:448`) and kinds `earning, advance, settlement,
  adjustment_credit, adjustment_debit` (`:450`); the hash chain `StaffLedgerChain` (`:485`), verified
  by `verify_ledger_chain` (`attendance/service.py:1386`). The weekly payroll CSV is **money-free**
  (`CLAUDE.md:288`); its idempotent window record is `PayrollExportRecord` (`attendance/models.py:365`,
  `:372` `payroll_export_window_key`), run by `run_weekly_export` (`attendance/service.py:1244`) on
  the `payroll-weekly-export` job (`backend/app/main.py:191`, inside `if settings.enable_scheduler:` at `:189`).
- **Migration head.** 0046 (`backend/alembic/versions/0046_seed_dispatch_cursor.py:46-47`); next
  free slot 0047 (`CLAUDE.md:120-121`). No `backend/scripts/export_week_csv.py` yet (P9-0a adds it).

### 1.2 What the owner and the design already decided

- `docs/BACKEND-REQUIREMENTS-2026-07.md:580` capture the supplier registration flag "from day one";
  `:593` "**Rejected items are never deleted.**"; `:606` "the cost of informality made visible";
  `:612` 3.16 Tax projection; `:617` compute output, input and **input tax forfeited**;
  `:622-624` "repair *services* in Karachi are provincial, goods are federal. Carry a classification
  per line and **do not guess it in code**"; `:625` "Rates come from settings, never hardcoded.";
  `:626` "Label it plainly as a planning estimate, not a filing."
- `docs/requirements-2026-07-gap-analysis.md:129-133`: build the export "**full-fidelity by
  default**" — every `job_payment` row flows to the formal books unless the owner configures otherwise.
- PR #182 `docs/program/w2/O-07-design.md:3`: postings are "a downstream, append-only projection of
  the operational ledgers (kacha khata). Odoo (pakka khata) never feeds back"; found by a
  state-based stager, "never by the job_event cursor". Record set `:6-10` (payment; invoice only
  "at CLOSE, on accrual basis only" `:7`; ledger entries `:8`); External IDs `:11`
  (`fixflow_<kind>_<source_uuid hex32>`, one `fixflow_cust_walkin` partner); `posting.currency` is a
  snapshot of `shop.currency`, "never a hardcoded 'PKR'" (`:20`); `amount_minor` unsigned (`:21`);
  payment template "Dr cash_<method>, Cr customer_receipts" (`:36`); invoice lines
  revenue_labour / revenue_fuel / revenue_parts / sales_discount (`:38`); the default path is
  full-fidelity (`:44`); CSV columns and divmod conversion "never through float" (`:49`); manifest
  (`:50`); rejected-sum line first (`:70`); blocked on start date, basis, reason codes (`:90`);
  custody amendment and "invoice kind waits for a basis decision" (`:117-123`).
- PR #182 `docs/program/SHIP-PLAN-2026-11.md:114` standing rule 7: "Money stays in integer minor
  units; no money feed (staging, export, push) is driven by the `job_event` cursor ... the outbox
  never deletes a write." Milestone `:125` "Kacha khata → manager-approved pakka khata → Odoo".
- P0a item 15 field cash custody (`SHIP-PLAN-2026-11.md:283`, O07-F17) and item 16 **books basis**
  (`:287`): "is the shop registered for sales tax (SRB/FBR)? Are the books on a cash basis? Is there
  an accountant ...". Unknowns become answers in P9-0b.
- §4 decision rows: `:1301` "Pakka record set, basis (cash/accrual), sales-tax registration, start
  date, reason codes" — "**no default — P9-0b must answer** (the owner may sign the cash-basis /
  not-registered defaults as the answer)"; `:1303` full-fidelity; `:1304` "Tax regime and chart of
  accounts / journals" (`l10n_pk` is the test-company chart); `:1305` "one walk-in partner, no
  customer PII exported". Ruling R9 self-approval flagged, not refused (`:1486`).
- Design §9 brief for this skill: PR #182 `docs/ORCHESTRATION-DESIGN-2026-10.md:734` "cash book vs
  formal books, Sindh services tax vs federal goods tax split, what FBR-facing books need from an export".

### 1.3 Phases and register ids this skill serves

| Phase (plan heading line) | What this skill supplies |
| --- | --- |
| P9-0b Odoo and books rehearsal (`SHIP-PLAN-2026-11.md:1108`; defaults `:1123-1124`) | the question list in §2 step 1 and the facts the owner/accountant answers against |
| P9a-1 posting tables, decision API (`:1134`; settings keys `:1144`) | rate/class keys as bps, unset by default; no tax literal in code |
| P9b approval and reconciliation UI (`:1166`) | "planning estimate" labelling; rejected sum visible first |
| P10a CSV export (`:1177`) | export field map (§2 step 6), retention (step 7) |

Register (PR #182 `docs/program/G2-deep-dive-gate-2026-11-01.md:198-207`; F16/F17 at
`SHIP-PLAN-2026-11.md:1327-1328`): **O07-F1** no approval boundary (what reached the formal books);
**F2** late facts dropped by a cloned window shape; **F3-F5** abandon ungated / negotiate to zero /
void without timestamp (under-reporting paths); **F6** `job_event.seq` unfit for an ERP feed; **F7**
offline payments dated at sync (the date of a supply); **F8** amount CHECK NOT VALID; **F9** stale
negotiated figure; **F10** export check-then-insert; **F11** UUID External IDs; **F12** manifest not a
CSV row; **F13** PaymentRail sync shape; **F14** no settings keys for posting; **F15** payment dedupe
ignores job and amount; **F16** closed-job race; **F17** field cash custody.

## 2. Procedure

An agent's procedure stops at every `[owner]` step and returns the question instead.

1. **Read the shop's recorded status first.** In `docs/program/W0-results.md` (PR #182 branch) find
   the answers to P0a items 15-16 and the §4 rows `:1301` / `:1304`. If any of these is missing or
   "unknown", stop and return these questions (they are answered in P9-0b, never assumed):
   1. Annual turnover against Rs 4,000,000 (SRB-5, SRB-6 — the Sindh turnover exemptions).
   2. SRB registration and SNTN; FBR NTN; FBR sales-tax registration (STRN) — each yes/no.
   3. Does the shop serve withholding agents or SRB/FBR-registered businesses? (Those services fall
      outside the serial 44 exemption, SRB-6 exclusions (1)-(2).)
   4. Any parts-only counter sale (goods with no repair)? The shop's 12-month electricity bill,
      whether it is in an air-conditioned mall or part of a chain (FBR-3, FBR-4, FBR-5).
   5. Accountant yes/no; cash or accrual basis; per-transaction or periodic entries.
   6. If registered: are FixFlow bills tax-inclusive or tax-exclusive, and what rounding rule applies?
   `[owner]` answering, signing the P9-0b defaults, or registering with SRB/FBR.
2. **Keep the two books apart.** Kacha khata = FixFlow's operational ledgers: non-voided
   `job_payment` rows by `method` are the cash book (FBR-6 lists "cash book" among required records);
   `staff_ledger` is staff money. Pakka khata = Odoo (or the journal CSV alone in P9-0b's no-Odoo
   branch, `SHIP-PLAN:1127-1130`), fed only through manager-approved postings (O-07 design `:3`, `:44`). Nothing flows back. A void is a reversal posting, never an edit
   (`:36-37`). Whether the STA s.22(1) records, double-entry sales tax accounts (FBR-6 `(da)`)
   included, bind an unregistered shop is **not recorded** (FBR-6 omits who must keep them;
   INFERRED registered-only) — an accountant question for P9-0b.
3. **Split each bill line by authority — as data, never as code.** Labour (`time_spent_mins` ×
   `labour_rate_paisa`), fuel (`fuel_paisa`) and parts (`job_material` `qty` × `unit_paisa`) each carry
   a tax class set by the owner, default **unclassified**. Candidate classes, all unconfirmed for
   this shop: SRB service at the 15% standard rate (SRB-1), CPC 872 at 8% (SRB-3), exempt under
   CPC 871 serial 26 or serial 44 (SRB-5, SRB-6), FBR goods at 18% (FBR-1). Whether parts inside a
   repair are part of the service value (SRB-11, SST s.5) or a separate goods supply is **unknown
   (U3)**; the CPC 871/872 boundary is **unknown (U4)**. An unclassified line makes the projection
   say "unclassified", never zero (`BACKEND-REQUIREMENTS-2026-07.md:622-624`).
4. **Store statutory parameters as `shop_setting` keys, integer bps, unset by default.** One spec per
   key in `specs.py` (`:17-20`), `unit="basis points"` like `:99-102`, `min_int=0` plus a service-side
   upper bound of 10000 (the registry has no max, `:59`, `:161-162`). Examples in tests and docs:
   1500 (15%), 800 (8%), 1800 (18%) — never `0.15`. The turnover threshold is money: `*_minor`
   (Rs 4,000,000 = 400000000 paisa). Key names are proposals until a PR registers them (O07-F14);
   none exists today. A new key needs no migration (`specs.py:8-10`); unset means off.
5. **Compute in integer minor units with a named rounding mode.** Tax on a tax-exclusive value:
   `tax_minor = (value_minor * rate_bps + 5_000) // 10_000` (half-up shown; the real rule is
   question 1.6). Tax-inclusive gross: `value_minor = (gross_minor * 10_000) // (10_000 + rate_bps)`
   — SST value excludes the SST itself (SRB-11). Example: Rs 2,500 labour = 250000 paisa at 800 bps
   → 20000 paisa (Rs 200). The 3.16 projection adds input tax available and **forfeited** (unregistered
   suppliers) — today there is no purchase data, so it must say "no purchase data", not 0.
   Label every figure "planning estimate, not a filing" (`:626`); never name a route or module
   `return` / `filing`.
6. **Check the export against what FBR/SRB-facing books need.** For P10a, map each required record to
   its FixFlow source and mark the gaps (do not close a gap by guessing):

   | Required record (fact row) | FixFlow source | Gap / owner question |
   | --- | --- | --- |
   | Supplies made, value, tax charged (FBR-6 (a); SRB-12) | posting snapshot: labour/fuel/materials split, original and payable (`O-07-design.md:23`, `:38`) | tax charged = none until registered |
   | Recipient name and address (FBR-6 (a); SRB-12) | `customer` via `job.customer_id` (nullable, `jobs/models.py:136`) | export sends one walk-in partner, no PII (`SHIP-PLAN:1305`); if registered, where the name/address record lives is an accountant question |
   | Exempt services too (SRB-12 "including exempt services") | full-fidelity postings (`gap-analysis:129-133`) | none if full-fidelity holds |
   | Serially numbered tax invoice with SNTN / FBR invoice number (SRB-15, FBR-7) | none — `job.token` is for human reference only (`O-07-design.md:7`) | FixFlow issues **no tax invoice** until U1/U8 are answered; SRB-14 penalises non-conforming invoicing software |
   | Purchases with supplier registration number (FBR-6 (b)) | none (no purchase table) | BACKEND-REQUIREMENTS 3.14 (`:580`) |
   | Cash book (FBR-6 (e)) | non-voided `job_payment` by method; voids as reversals | O07-F5 `voided_at`, O07-F7 collection time |
   | Salary and labour bills (FBR-6 (e)) | `staff_ledger` postings (`O-07-design.md:8`) | chain verified before staging |
   | Accounting date = date of the fact, shop-local | `posting.accounting_date` (`O-07-design.md:20`) | O07-F2, O07-F7 |

7. **Retention: keep everything at least six years; never shorten it.** STA s.24 and ITO s.174(3)
   give six years (FBR-8, FBR-9); SST s.27 gives six years for periods from 2025-07-01 and ten years
   for periods ending on or before 2025-06-30 (SRB-13). ITO s.174(3) and SST s.27(1) extend this
   while a proceeding is pending (FBR-9, SRB-13); whether STA s.24 extends was not read (FBR-8).
   "Seven years" appears in neither statute. O-07's **designed** (not yet built) `posting` table has
   a no-delete trigger (`O-07-design.md:29`); `posting_decision` and `posting_attempt` are
   append-only (`:31`, `:33`). `job_payment` is an append-only ledger (`jobs/models.py:466`).
   ITO s.174(1) records are kept "in Pakistan" — where the backups and Odoo data reside is a P9-0b
   question for the accountant, not an agent's call.
8. **Re-verify before relying on a rate.** Every fact here is as fetched 2026-11-04. Both Finance
   Acts change rates each 1 July; after 2027-07-01 re-fetch the rows a PR depends on and record the
   new URL and date. A WEB_UNAVAILABLE row stays unknown — return it, never fill it from memory.
9. `[owner]` registering with SRB or FBR, applying for POS / e-invoicing integration, filing a return,
   choosing the basis, deciding whether real rows reach an Odoo trial (`SHIP-PLAN-2026-11.md:1117`),
   sending any bill or invoice to a customer, running production SQL to measure turnover, signing up
   for an Odoo account. An agent drafts the question and stops.

## 3. Checks (read-only)

Each command, then what a clean result proves. `backend/app/features/accounting/` does not exist
until P9a-1; before then the first six report "no such directory", which is the expected result.

1. `grep -rnE '0\.(15|08|18)\b|\b(1500|800|1800)\b' backend/app/features/accounting src/features/accounting`
   — no rate literal in code; a hit outside a test fixture fails review (`BACKEND-REQUIREMENTS:625`).
2. `grep -rnE 'float\(|Decimal\(|/ 100\b' backend/app/features/accounting` — no float or decimal
   division on money (`CLAUDE.md:116`; divmod at the edge, `O-07-design.md:49`).
3. `grep -rn 'job_event' backend/app/features/accounting` — the stager and export do not read the
   `job_event` cursor (`SHIP-PLAN:114`, O07-F6).
4. `grep -rniE 'delete\(|DELETE FROM' backend/app/features/accounting` — no delete path on postings
   (`BACKEND-REQUIREMENTS:593`).
5. `grep -rniE 'return|filing' backend/app/features/accounting/router.py src/features/accounting`
   — read each hit: no route or label may imply a filed return (`:626`).
6. `grep -rniE 'tax_class|unclassified' backend/app/features/accounting` — the class is read from a
   setting per line, never inferred from a part name or `quality`.
7. `grep -n 'bps\|basis points' backend/app/features/tenancy/specs.py` — every rate key is bps with
   `min_int=0`; then read its service for the 10000 upper bound (`specs.py:59`, `:161-162`).
8. `grep -n 'default=' backend/app/features/tenancy/specs.py` — tax keys default to `"0"` / unset and
   surface as `is_default` (`specs.py:52-56`).
9. `grep -h '^revision\|^down_revision' backend/alembic/versions/*.py` — the true head before naming
   a migration (`CLAUDE.md:120-121`).
10. Every statute claim in a PR or brief cites a row in a reference file (URL + fetch date); a
    row older than the last 1 July is re-fetched first (§2 step 8).

## 4. Forbidden

- Hardcoding a statutory rate or threshold anywhere in code — `BACKEND-REQUIREMENTS-2026-07.md:625`.
- A float, or a rate stored as a fraction — `CLAUDE.md:116`; `specs.py:10-13`.
- Deciding a line's tax class, the shop's registration status or the basis in code or in a
  default the owner did not sign — `BACKEND-REQUIREMENTS:622-624`; `SHIP-PLAN:1301`.
- Deleting or hiding a rejected or unwanted posting, or making selective export the default —
  `BACKEND-REQUIREMENTS:593`; `gap-analysis:129-133`; `SHIP-PLAN:1303`.
- Driving any money feed from the `job_event` cursor — `SHIP-PLAN:114` (standing rule 7).
- Naming anything a return or filing, or presenting a projection as tax payable — `BACKEND-REQUIREMENTS:626`.
- Issuing a "tax invoice" (serial number, SNTN, FBR invoice number) before U1/U8 are answered —
  SRB-14 penalty row; `.claude/skills/README.md` content rule 4 (no customer message by an agent).
- Exporting customer name/phone/address to Odoo without the owner's decision — `SHIP-PLAN:1305`.
- Fetching `srb.gos.pk` with TLS verification disabled, or quoting bill-stage or budget-speech
  figures as law (SRB-7 is bill stage; only the enacted Rs 4,000,000 text, SRB-6, is used).
- Tax advice, a filing position, or a statement that the shop "is exempt" — this skill is context;
  the accountant or owner decides (P9-0b).

## 5. Where the sources pull against FixFlow's defaults (no upstream skill)

- **"Not registered" default vs SST s.24.** The plan lets the owner sign "cash-basis /
  not-registered" (`SHIP-PLAN:1123-1124`, `:1301`), while SST s.24(1) requires registration of every
  resident providing a taxable service (SRB-9); only the First Schedule turnover exemptions
  (SRB-5, SRB-6) make "not registered" coherent. FixFlow's rule wins in the sense that the owner
  decides, but P9-0b must record the **turnover and exemption basis** beside "not registered".
- **Statute rates vs "never hardcoded".** The Acts print 15% / 8% / 18%; FixFlow stores them as
  owner-set bps (1500 / 800 / 1800) in `shop_setting` (`BACKEND-REQUIREMENTS:625`; `specs.py:10-13`),
  because rates change every 1 July and the class is unconfirmed.
- **Recipient name and address vs the PII-free export.** FBR-6 (a) and SRB-12 list recipient
  name and address among required records (SRB-12: a registered person's; FBR-6 does not say
  whose, so whether it binds an unregistered shop is an accountant question); the export uses one walk-in partner with no
  PII (`SHIP-PLAN:1305`). The export rule stands (Odoo is not the only record store); whether
  FixFlow's `customer` table satisfies the record duty is an accountant question.

## 6. References

- `references/srb-sindh-sales-tax-on-services.md` — SRB fact table (SRB-1..15) and unknowns U1-U5,
  URL and fetch date per row.
- `references/fbr-sales-tax-and-income-tax.md` — FBR fact table (FBR-1..11: Sales Tax Act 1990,
  Income Tax Ordinance 2001 s.174, POS provisions) and unknowns U6-U9, URL and fetch date per row.
- Odoo import shape and JSON-2: the `odoo-accounting-import` skill (preloaded with this one by
  `fixflow-odoo-analyst`).

docs/ORCHESTRATION-DESIGN-2026-10.md and docs/program/* are on PR #182 (head 3415b5e) at write time; their line numbers refer to that head.
