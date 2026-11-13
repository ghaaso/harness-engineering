---
name: odoo-accounting-import
description: Getting FixFlow's approved money postings into Odoo correctly and exactly once. Covers the JSON-2 API (Odoo 19.0 and later), the deprecated XML-RPC/JSON-RPC by version, which Odoo Online plan allows the external API, Studio and custom fields, API keys, External IDs and ir.model.data as the idempotency key, accounting prerequisites (l10n_pk chart, journals, partners, account map), CSV-import dedupe, and repeat-import safeguards (corrections are reversals). Use it for R-02 research, for the O-07 design and its review, and for the posting phases P9-0a, P9-0b, P9a-1, P9a-2, P9b, P10a, P10b and P11. Do NOT use it to write an Odoo module (Odoo Online runs no custom modules) or for payroll CSV work that never reaches Odoo. Do NOT use it for Pakistani tax or books questions (use pakistan-accounting-context), or for generic Alembic and migration safety (use fastapi-alembic-safety). It never authorises an agent to touch a real Odoo database, an API key, or production.
---

# Odoo external API and accounting import (FixFlow)

Verified against the worktree at `main @ a31924a` and the web on 2026-11-04. The PR #182 docs
(design, plan, O-07, evidence) are cited by repo path. Their line numbers refer to head 3415b5e.

## (a) FixFlow facts first

**State today (VERIFIED-BY-COMMAND, 2026-11-04).** There is no `backend/app/features/accounting/`
and no `backend/app/core/posting_transport.py`. `backend/scripts/export_week_csv.py` exists since
`c392cf8` (P9-0a, #190, 2026-11-13: read-only, pseudonymised unless `--real-names` is passed). No file in
`backend/app`, `src/` or `technician-app/src/` mentions Odoo. Settings use
`backend/app/core/config.py:24` — `env_prefix="FIXFLOW_",` and no `FIXFLOW_ODOO_*` key exists
yet. Everything below about postings is **design**, not code.

**Register ids and phases.**

| Id / phase | What it is | Where |
| --- | --- | --- |
| R-02 | W1 web research: versions, APIs, plan gate, External IDs, payloads (F1-F13) | `docs/program/evidence/w1/R-02.txt:6-30` |
| O-07 | W2 Odoo pakka-khata design (findings O07-F1..F15) | `docs/program/evidence/w2/O-07.txt:18-158`, `docs/program/w2/O-07-design.md` |
| O07-F16, O07-F17 | harness-review addendum: closed-job guard race; cash custody | `docs/program/G2-deep-dive-gate-2026-11-01.md:306`, `O-07-design.md:117-127` |
| P9-0a | week-export script, read-only, run on an Appendix C restore | `docs/program/SHIP-PLAN-2026-11.md:1095` |
| P9-0b | owner + accountant session: **the decide-before-build gate** | `SHIP-PLAN-2026-11.md:1108` |
| P9a-1 / P9a-2 | posting tables, triggers, decision API / state-based stager | `SHIP-PLAN-2026-11.md:1134`, `:1154` |
| P9b | approval + reconciliation UI | `SHIP-PLAN-2026-11.md:1166` |
| P10a / P10b | CSV export + transport seam / owner double-import rehearsal | `SHIP-PLAN-2026-11.md:1177`, `:1190` |
| P11 | JSON-2 push adapter (optional; Custom plan only) | `SHIP-PLAN-2026-11.md:1198` |

Order (`SHIP-PLAN-2026-11.md:142`): `P3b ─► P9-0a ─► P9-0b (owner) ─► P9a-1`; `P9a-2 ─► P10a ─►
P10b`; `P10a ─► P11 (optional)`. Plan defaults (`SHIP-PLAN-2026-11.md:1299-1305`): Odoo plan
"P11 only | CSV path (P10)"; Odoo version "draft with the current release's labels"; `l10n_pk` is
the test-company chart; "one walk-in partner, no customer PII exported".

**Rules this skill must not bend.**

- Plan §0 standing rule 7 (`SHIP-PLAN-2026-11.md:114-115`): "Money stays in integer minor units;
  no money feed (staging, export, push) is driven by the `job_event` cursor ... the outbox never
  deletes a write."
- `CLAUDE.md:116` — "**Money is integer minor units** (1 Rs = 100 paisa), never floats."; new
  money columns are `*_minor` (`CLAUDE.md:117-118`).
- `CLAUDE.md:231` — "**Never message a customer about an old event.**" The dispatcher stays OFF
  (`backend/app/core/config.py:188` — `enable_dispatcher: bool = False`). An `erp` cursor would
  inherit the same mass-replay hazard. That is one reason O-07 forbids it
  (`O-07-design.md:78` — "No dispatch_cursor 'erp' row").
- `docs/BACKEND-REQUIREMENTS-2026-07.md:593` — "**Rejected items are never deleted.**"; `:597` —
  "**Push must be idempotent.**"; `:603` — "The ERP client sits behind a `Protocol`".

**Code anchors the posting work reads (VERIFIED-IN-CODE, 2026-11-04).**

| Anchor | Line |
| --- | --- |
| Payment row | `backend/app/features/jobs/models.py:465` `class JobPayment`; `:486` `amount_paisa`; `:491` `recorded_at`; `:494` `voided`; `:495` `void_reason` (no `voided_at`/`voided_by` yet: O07-F5) |
| Payment CHECK still NOT VALID (O07-F8) | `backend/alembic/versions/0038_job_payment_amount_guard.py:51` `... CHECK (amount_paisa > 0) NOT VALID` |
| Payment dedupe on `client_id` only (O07-F15) | `backend/app/features/jobs/models.py:477` `uq_job_payment_client`; `backend/app/features/jobs/service.py:1457` |
| Bill figures | `backend/app/features/jobs/models.py:208-209` `bill_original_paisa`, `bill_negotiated_paisa` |
| Void path | `backend/app/features/jobs/service.py:1489` `async def void_payment(`; `:1507` `payment.voided = True` |
| The cursor a money feed must NOT use (O07-F6) | `backend/app/features/jobs/models.py:498` `class DispatchCursor` (docstring names `erp`); `backend/app/features/jobs/service.py:511` `.where(JobEvent.seq > cursor.last_seq)` |
| Staff ledger | `backend/app/features/attendance/models.py:405` `LEDGER_SIGN`; `:414` `class StaffLedger`; `:448` `amount_minor > 0`; `:485` `class StaffLedgerChain` |
| Chain verify the stager calls first | `backend/app/features/attendance/service.py:1386` `verify_ledger_chain` |
| Seq that restarts on a fresh DB (O07-F11) | `backend/app/features/attendance/service.py:1372` `seq = head[0] + 1 if head is not None else 1` |
| Export shape to clone, and fix (O07-F2, O07-F10) | `backend/app/features/attendance/service.py:1244` `run_weekly_export`; `:1262` `put_bytes` before `:1263` `add_export`; `backend/app/features/attendance/models.py:372` `payroll_export_window_key` |
| Settings registry (O07-F14) | `backend/app/features/tenancy/specs.py:6` "nothing may write a key that is not registered here" |
| Currency | `backend/app/features/tenancy/models.py:53` `currency ... server_default=text("'PKR'")` |
| Sync Protocol not to copy (O07-F13) | `backend/app/core/payment_rail.py:43` `class PaymentRail(Protocol)`; `:49` `def disburse(` |
| Storage seam for exports | `backend/app/core/storage.py:77` `StorageClient(Protocol)`; `:81` `mint_playback_url`; `:86` `put_bytes` |
| Manager gate | `backend/app/features/identity/deps.py:82` `CurrentManager` |
| Runtime | `backend/pyproject.toml:9` `requires-python = ">=3.12"`; `:26` `"httpx>=0.27,<1.0"`; `backend/Dockerfile:4` `FROM python:3.12-slim` |
| Slice contract a new `accounting` slice joins | `backend/pyproject.toml:99` `[tool.importlinter]`; `:103` "Feature slices stay independent ..."; CI `.github/workflows/ci.yml:129` `lint-imports` |
| Alembic head | `backend/alembic/versions/0046_seed_dispatch_cursor.py:46` `revision: str = "0046"` (next free 0047 at a31924a, `CLAUDE.md:120-121`; not reserved for posting work, ruling R6, `SHIP-PLAN-2026-11.md:1480`) |

**Odoo facts in one screen** (WEB, fetched 2026-11-04; details and URLs in
`references/odoo-api-facts.md`):

- Versions: 20.0 (September 2026) is the latest major. SaaS 19.4 and 19.3 run on Online only.
  19.0 is supported to September 2028. Which version a **new** Online database gets is OPEN.
- JSON-2 (`.. versionadded:: 19.0`): `POST /json/2/<model>/<method>`, `Authorization: bearer
  <key>`, optional `X-Odoo-Database`. "All calls to the JSON-2 endpoint run in their own SQL
  transaction." Keys last at most three months.
- Legacy `/xmlrpc`, `/xmlrpc/2`, `/jsonrpc` are deprecated. The `db` service is gone in 20.0 and
  Online 19.1. `common`/`object` are scheduled for removal in Odoo 22 / Online 21.1.
- Plan gate: "Access to data via the external API is only available on *Custom* Odoo pricing
  plans." Installing Studio switches a database to Custom. Online runs no custom modules.
- Importer: with an External ID column, "records that have already been imported are modified,
  instead of being created". Changing an ID "may add a duplicate record".
- Fair use: "1 call/second, with no parallel calls".

## (b) Procedure

Work type decides the entry point: **research** (R-02 style) starts at step 1; it is collected
by a Sonnet/medium researcher (`docs/ORCHESTRATION-DESIGN-2026-10.md:192`), and the Opus
`fixflow-odoo-analyst` consumes and adjudicates it. **Design or review** of O-07 code (P9-0a to
P11) starts at step 4 once steps 1-3 have recorded answers. An agent's procedure stops at every
`[owner]` step and returns what the owner must do.

1. **Pin the Odoo version.** The owner's recorded answer (W0-results, P9-0b) outranks everything,
   including a probe. With no answer, the plan default is "draft with the current release's
   labels" (`SHIP-PLAN-2026-11.md:1300`). Never assume one version silently: return the question
   (upstream rule, `references/odoo-workflow-trace-rules.md` "Version rule"). Discovery is
   `GET <base>/web/version` (unauthenticated), and only against a URL the brief names.
2. **[owner]** Sign up for or open the Odoo test company on `l10n_pk` ("an Odoo Online trial or
   One App Free with Invoicing is enough", `SHIP-PLAN-2026-11.md:1116`). Account sign-up and
   choosing a plan are the owner's.
3. **Pin the plan and pick the shape.** Not Custom → Shape A (CSV) only, and P11 stays parked
   (`O-07-design.md:96-97`). Custom → Shape A still ships first. Shape B is an added transport
   behind the Protocol (`references/fixflow-posting-shapes.md` §1). Whether a trial may use the
   API is OPEN. Never design around Studio or `x_` custom fields: the design needs neither, and
   their Online gating is OPEN.
4. **Confirm the full P9a-1 entry gate before any posting code**
   (`SHIP-PLAN-2026-11.md:1136-1138`): P8b merged; P9-0b done; P5d-2 done (verdict recorded,
   pass or P5e scoped); no fleet install session in flight (HR-A4). P9-0b's answers cover the
   record set, basis (cash/accrual), start date, approver, unit, cadence, tax regime and chart. The custody answer, when yes, adds `cash_remittance` (O07-F17).
   A missing answer is a blocker to return, not a default to invent. The exception is the defaults
   the owner signed (`SHIP-PLAN-2026-11.md:1122-1124`).
5. **Accounting prerequisites.** Each one is resolved in the test company by the owner, then
   recorded as a setting. The agent only lists what is missing.
   - Chart: `l10n_pk` (20.0 manifest: `'Pakistan - Accounting'`, version `'1.1'`). Survey lead:
     the localization can be changed only "as long as no entry has been posted".
   - Journals: `journal_code_sales` / `cash` / `payroll` (`O-07-design.md:49`).
   - Accounts: `account_code_<role>` per posting role. Approval is refused (400 naming the role)
     while a role is unmapped (`O-07-design.md:44`; O07-F14).
   - Partners: one `fixflow_cust_walkin` by default (no customer PII). Use per-customer partners
     only by an owner decision. Tech partners are `fixflow_tech_<shop>_<tech_id>` (`:11`).
   - Currency: the `shop.currency` snapshot. Fiscal position and taxes: decided in P9-0b with
     `pakistan-accounting-context`. Whether an `entry` move with explicit accounts applies a
     fiscal position is INFERRED "no" — verify in the test company.
6. **External IDs are the idempotency key.** Use the grammar in
   `references/fixflow-posting-shapes.md` §2, built from `gen_random_uuid` source ids. Never use a
   seq, token or chain seq (O07-F11). A revision or reversal gets a new suffix and never reuses an
   old id. Over `load()`, a dot-less id lands under module `__import__` unless a `module` context
   is passed (INFERRED from the 20.0 ORM line). Fix the module in the design before writing the
   search-before-create.
7. **Money at the edge only.** Convert integer minor units to the CSV/JSON decimal string with
   `divmod`, using decimals from the currency and never a float. Amounts are unsigned; direction
   is the Debit/Credit column (`references/fixflow-posting-shapes.md` §3). Σdebit = Σcredit =
   amount is checked in the service and again by verify (`O-07-design.md:22`).
8. **Source rows are found by state, never by the cursor.** The stager anti-joins source rows
   that have no posting (`O-07-design.md:3`). A diff that reads `job_event` or `dispatch_cursor`
   for money breaks standing rule 7.
9. **Shape A (P10a).** Window on `decided_at`. Write the record first under an advisory lock,
   produce deterministic bytes plus a sha256, keep the manifest as separate files, and acknowledge
   through the endpoint (`references/fixflow-posting-shapes.md` §3). The manifest carries the
   batch's `posting_decision` ids (ruling R9, `SHIP-PLAN-2026-11.md:1182`, `:1494-1495`); a
   manifest without them fails P10a. Self-approval is flagged, not refused, by default (R9,
   `:1486`; P9a-1 scope `:1143`). Draft the column labels from the owner's version. Their exact
   labels are OPEN until P10b.
10. **Shape B (P11).** Use an async `PostingTransport`. Search before create (`ref =
    external_id`), then create in ONE call that carries the External ID. Keep a 1 call/s serial
    budget, chunks of ~50, and the ambiguous / definitive / auth split
    (`references/fixflow-posting-shapes.md` §4). `erp-push` defaults OFF. Run JSON-2 only, never
    `/xmlrpc` or `/jsonrpc` (`O-07-design.md:56`). Legacy RPC is reference for an Odoo ≤ 18
    target only (`references/odoo-api-facts.md` §3). Do not reach for it because a library
    supports it.
11. **Repeat-import safeguards.** (a) **[owner]** imports twice and confirms update-not-duplicate
    (step 15; P9-0b scope 4, `SHIP-PLAN-2026-11.md:1119`; P10b, `:1190`). The agent only prepares
    the check list and reads the owner's recorded result. (b) Line External IDs stop a
    re-imported draft from appending lines (`O-07-design.md:51`).
    (c) Re-importing a **posted** move "should fail loudly rather than duplicate (verify in the
    test company)". This and the hash lock (Secure Posted Entries with Hash) are OPEN. (d) A
    correction is always a reversal plus a new revision, never `write` or `unlink` on a move
    (`O-07-design.md:3`). (e) Rejected postings stay forever. `restage` creates
    `source_rev + 1`.
12. **[owner]** Create the dedicated bot user and its API key, and store it as env
    `FIXFLOW_ODOO_API_KEY`, never as a `shop_setting` (`O-07-design.md:56`). Record
    `odoo_api_key_expires_on`.
13. **[owner]** Rotate the key before its three-month expiry. The 21-day alert is design
    (`O-07-design.md:61`).
14. **[owner]** Run the P9-0a export on the owner's laptop against an Appendix C restore, never
    against production (`SHIP-PLAN-2026-11.md:1102-1103`). The owner decides real rows vs
    `--pseudonymise`.
15. **[owner]** Import into Odoo: the double import in P9-0b and P10b, `Test` before `Import`.
    Also `action_post` or posting a move by hand, and any reset-to-draft.
16. **[owner]** Enable `enable_erp_push`, or any scheduler job that sends money out. Deploy any
    posting phase (runbook R5 after `T_close`, or the deploy train before). Run any production
    SQL or CLI.
17. Return the result in the agent's output contract. Name the OPEN items below that the work
    touched.

**OPEN (return these, never guess):** the version a new Online database gets (20.0 vs SaaS
19.4). Whether `ir.model.fields` (`x_`) creation over the API is allowed on Online Custom, and
whether Studio is required. Minimal `account.move` (`entry`, `out_invoice`) and `account.payment`
/ `account.payment.register` payloads on 19.x/20.0. The journal-entry CSV column labels.
Re-import of a posted move, and the hash lock. Whether 1 call/s applies to Online. Whether a
trial may use the API. Which `ir.model.data` module a CSV-imported dot-less id gets. The
`odoo-19.0` reference pack and `odoo-commit` from the odoo-workflow upstream were not fetched,
and no `odoo-20.0` pack exists.

## (c) Checks (read-only; what each proves)

Run from the worktree root. Each block is followed by what its result proves.

```bash
grep -rnE "job_event|dispatch_cursor|DispatchCursor" backend/app/features/accounting
```
Empty means no money feed rides the cursor (rule 7).

```bash
grep -rnwE "float|Decimal" backend/app/features/accounting backend/scripts/export_week_csv.py
```
Empty means no float money. Read every hit; `Decimal` is allowed only if it never meets a float.

```bash
grep -rnE "/xmlrpc|/jsonrpc|execute_kw" backend/app
```
Empty means JSON-2 only (`O-07-design.md:56`).

```bash
grep -rnE "\"(write|unlink)\"" backend/app/features/accounting backend/app/core
```
Empty means no update or delete of a remote move.

```bash
grep -rn "fixflow_" backend/app/features/accounting
```
Read each hit. The External ID must be built from a UUID source, never a seq or a token.

```bash
grep -n "accounting" backend/pyproject.toml
```
A hit means the new slice was added to the import-linter contract on purpose.

```bash
grep -h "^revision\|^down_revision" backend/alembic/versions/*.py
```
Shows the true head; the new migration takes the next free number at write time (plan ruling
R6, `SHIP-PLAN-2026-11.md:1480` — No pre-assigned numbers; G2-D3's "0047" is not binding).

```bash
grep -rni "odoo" backend/app/core/config.py backend/app/features/tenancy/specs.py
```
Secrets belong in env (`config.py`) and policy in `specs.py`. A hit in the wrong one is a finding.

```bash
curl -s <base>/web/version
```
Only for a URL the brief names, and never with a key. Gives the server version the CSV labels
must match.

Gates (`ruff`, `mypy`, `lint-imports`, `alembic check`, `pytest` against real Postgres) run only
when the brief says "runs commands". This skill adds no gate of its own. A double import is
proven only by the owner's P9-0b/P10b record. A green test is not that proof.

## (d) Forbidden actions

- Floats anywhere on a money path, including a `float` round-trip "just for formatting".
  Source: `CLAUDE.md:116`; plan §0 rule 7.
- Driving staging, export or push from `job_event` / `dispatch_cursor`, or seeding an `erp`
  cursor row. Source: plan §0 rule 7; `O-07-design.md:78`; `CLAUDE.md:231`.
- Deleting or overwriting a posting, a rejected row, or a remote posted move. Corrections are
  reversals. Source: `docs/BACKEND-REQUIREMENTS-2026-07.md:593`; `O-07-design.md:3`; the outbox
  rule `CLAUDE.md:154`.
- Treating a timeout or 5xx as a failure that may be retried by re-creating. Ambiguous means
  re-search first. Source: `docs/requirements-2026-07-gap-analysis.md:100-101`; `CLAUDE.md:154-155`.
- Building P9a-1 before its full entry gate holds: P8b merged, P9-0b answers recorded, P5d-2
  done, no fleet install session in flight. Source: `SHIP-PLAN-2026-11.md:1136-1138` (HR-A4).
- Putting the Odoo key in `shop_setting`, a doc, a log or a reply. Reading any `.env`, any
  Odoo `*.conf`, `technician-app/eas.json` or `technician-app/app.json` values. Source:
  `.claude/skills/README.md` rule 3; `O-07-design.md:56`.
- Any act on a real Odoo database, key, deploy, scheduler flag or production data. Each is
  `[owner]`. Source: `.claude/skills/README.md` rules 2 ("no production action by an agent")
  and 4.
- Copying `PaymentRail`'s sync signature for an HTTP transport. Source: O07-F13.
- Shipping customer PII to Odoo without the owner's partner decision. Source:
  `SHIP-PLAN-2026-11.md:1305`.

## (e) Where upstream disagrees

| Upstream sentence | FixFlow rule that wins, and why |
| --- | --- |
| odoo-json2 `README.md:13` "Python requires: 3.14 or greater." | Backend is Python 3.12 + httpx (`backend/pyproject.toml:9`, `:26`; `CLAUDE.md` stack table). The library is a wire reference, never a dependency. |
| odoo-json2 `json2_client.py:50-67` raises one `OdooJson2Error` for 4xx and 5xx alike | Ambiguous (timeout/5xx) must halt and re-search, while definitive 4xx goes to `transport_failed` (`O-07-design.md:60`; `CLAUDE.md:154-155`). One error class makes a double-post retry look safe. |
| odoo-json2 `json2_client.py:194-196` `unlink` "Deletes the document objects ..." and `:187` `write` | A posted move is never updated or deleted. The fix is a reversal plus a new revision (`O-07-design.md:3`; `docs/BACKEND-REQUIREMENTS-2026-07.md:593`). |
| odoo-json2 `odoo_client.py:40` `getpass.getpass("API Key token: ")` | The key comes from env `FIXFLOW_ODOO_API_KEY` in a scheduler job (`O-07-design.md:56`). An interactive prompt cannot run there, and a typed key leaks into terminals. |
| odoo-json2 `json2_client.py:86-105` `get_db_list` (`/web/database/list`) | The `db` service was removed in Odoo 20 and Online 19.1 (`references/odoo-api-facts.md` §3). FixFlow names its database explicitly (`FIXFLOW_ODOO_DB`). |
| odoo-workflow `SKILL.md` description: "Run BEFORE brainstorming or planning" | Plan §0 orders the work (draft PR at first commit, `Plan @ <sha>`, journal; `SHIP-PLAN-2026-11.md:31-43`). An Odoo check is an inner step of a phase. |
| odoo-workflow `SKILL.md:50-62` reads `*.conf` and writes `.claude/odoo.json` (`conf`, `dev_db`) | No secrets (README rule 3). An Odoo conf can hold the admin password, so its contents are never read. FixFlow targets Odoo Online, where no conf exists. |
| odoo-workflow `definition-of-done.md:46` `odoo-bin db ... duplicate`, `:105` `... drop`, and `:35-36` "Never pass `-i` or `-u` to a named database ... unless the user asks for it by name" | No agent acts on any Odoo database; creating, duplicating or dropping one is `[owner]` (README rule 4). FixFlow writes no Odoo module, so it has nothing to install. |
| odoo-workflow `SKILL.md:35`, `:266-267` `odoo-commit` "no AI attribution"; `definition-of-done.md:131-134` greps that fail on `Co-Authored-By` / `Generated with`; `templates/CLAUDE.md:32` | This repo's commits and PRs carry the harness attribution lines and the repo-local identity. A skill must not strip them or fail on them. |
| odoo-workflow `SKILL.md:65-69` "Load the Odoo reference pack for that major" | The `odoo-19.0` pack was not fetched and no `odoo-20.0` pack exists. Primary Odoo docs and the owner's test company are the authority, which upstream's own "Pack missing: say so and continue" allows. |
| odoo-workflow `templates/CLAUDE.md:5` "Odoo version: **18.0**" | `CLAUDE.md` is FixFlow's ground truth. The Odoo version is the owner's P9-0b answer, never a template value. |

## (f) References

- `references/fixflow-posting-shapes.md` — O-07 Shape A vs Shape B, the External ID grammar, the
  divmod conversion, the failure table and the P9-0b checklist (authored).
- `references/odoo-api-facts.md` — every Odoo web fact with URL, fetch date 2026-11-04 and
  re-read/survey status, plus the OPEN list (authored).
- `references/json2-client-shape.md` — odoo-json2 0.0.2 README and wire shape, "Tested against
  Odoo 19.0 CE." (trimmed, MIT).
- `references/odoo-workflow-trace-rules.md` — odoo-workflow version rule, Source-cell and xmlid
  rules (trimmed, MIT; no `odoo-bin` or database rules).
- Cited by path, not vendored: `docs/program/w2/O-07-design.md`,
  `docs/program/evidence/w2/O-07.txt`, `docs/program/evidence/w1/R-02.txt`,
  `docs/program/SHIP-PLAN-2026-11.md`, `docs/requirements-2026-07-gap-analysis.md`,
  `docs/BACKEND-REQUIREMENTS-2026-07.md` §3.15; unclecatvn `skills/odoo-workflow/scripts/odoo_trace.py`
  (70 KB; needs an Odoo source checkout, so it is usable only against self-hosted Community).
- docs/ORCHESTRATION-DESIGN-2026-10.md and docs/program/* are on PR #182 (head 3415b5e) at write time; their line numbers refer to that head.
