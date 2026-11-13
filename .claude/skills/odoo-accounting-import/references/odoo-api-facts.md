<!-- Authored for FixFlow, 2026-11-04 -->

# Odoo external API and import facts (web, fetched 2026-11-04)

Every row is a WEB fact. "Re-read" = the skill author fetched the URL on 2026-11-04 and the
quote is from that fetch. "Survey" = located by the 2026-11-04 survey only (search summary or
`gh api`) and not re-read; treat it as a pointer. Odoo source is LGPL-3: cite by path and
symbol, never copy. Raw `.rst` sources on GitHub were used because the odoo.com HTML article
bodies came back truncated (WEB_UNAVAILABLE: odoo.com/documentation HTML bodies).

URL keys used below:

- `EXT` = https://raw.githubusercontent.com/odoo/documentation/master/content/developer/reference/external_api.rst
- `RPC` = https://raw.githubusercontent.com/odoo/documentation/master/content/developer/reference/external_rpc_api.rst
- `IMP` = https://raw.githubusercontent.com/odoo/documentation/master/content/applications/essentials/export_import_data.rst
- `SUP` = https://raw.githubusercontent.com/odoo/documentation/master/content/administration/standard_extended_support.rst
- `ONL` = https://raw.githubusercontent.com/odoo/documentation/master/content/administration/odoo_online.rst
- `PRC` = https://www.odoo.com/pricing-plan
- `AUP` = https://www.odoo.com/acceptable-use
- `J2` = https://raw.githubusercontent.com/odoo/odoo/20.0/addons/rpc/controllers/json2.py
- `ORM` = https://raw.githubusercontent.com/odoo/odoo/20.0/odoo/orm/models.py
- `PK` = https://raw.githubusercontent.com/odoo/odoo/20.0/addons/l10n_pk/__manifest__.py

## 1. Versions (which Odoo you are talking to)

| Fact | Source | Status |
| --- | --- | --- |
| 20.0 released September 2026; Online, Odoo.sh and on-premise; standard support to September 2029 (planned) | SUP | re-read |
| SaaS 19.4 (July 2026) and 19.3 (May 2026): Online only, standard support; SaaS 19.2 and 19.1: not supported | SUP | re-read |
| 19.0 (September 2025): standard support to September 2028 (planned) | SUP | re-read |
| SaaS versions: "They are only available on Odoo Online and are not eligible for extended support." | SUP | re-read |
| Odoo Online page does not say which version a new database gets | ONL | re-read |
| Branches 19.0, 20.0, saas-19.1..saas-19.4 exist; master `odoo/release.py` `version_info = (20, 1, 0, ALPHA, 1, '')` | `gh api repos/odoo/odoo` | survey |

Version discovery: `GET {base}/web/version` (unauthenticated). EXT: "The version function is
replaced by the ``/web/version`` endpoint." (re-read). The odoo-json2 client wraps it as
`get_server_version_data` (`json2-client-shape.md`).

## 2. JSON-2 API (Odoo >= 19.0)

| Fact | Source | Status |
| --- | --- | --- |
| "Post a JSON object at the ``/json/2/<model>/<method>`` URL." — `.. versionadded:: 19.0` | EXT | re-read |
| Authorization: "Required, ``bearer`` followed by an ... API key"; X-Odoo-Database: "Optional, the name of the database to connect to." | EXT | re-read |
| "All calls to the JSON-2 endpoint run in their own SQL transaction." | EXT | re-read |
| "it is recommended to create and use **dedicated bot users**." | EXT | re-read |
| "For security reasons, it is not possible to create keys that last for more than three months." | EXT | re-read |
| Errors: "a **4xx**/**5xx** status with a JSON-serialized error object in the body"; 401 on a bad key; 403 on an invalid revoke; 422 "Unprocessable Content" on exceeding the programmatic key limit | EXT | re-read |
| `ids`: "An array of record ids on which to execute the method."; `context`: "Optional, an object of additional values." | EXT | re-read |
| Route `'/json/2/<__model__>/<__method__>'`, `auth='bearer'`, `bearer_scope='rpc'`, POST only | J2 | re-read |
| An `@api.model` method called with `ids` raises `UnprocessableEntity` "cannot call {model}.{method} with ids" (HTTP 422) | J2 | re-read |
| A recordset result is returned as `result.ids` | J2 | re-read |
| `addons/rpc` manifest: auto_install, LGPL-3, depends base (self-hosted Community ships JSON-2) | `gh api` | survey |

## 3. Legacy XML-RPC / JSON-RPC (version-aware; deprecated)

| Fact | Source | Status |
| --- | --- | --- |
| "Both the XML-RPC and JSON-RPC APIs at endpoints ``/xmlrpc``, ``/xmlrpc/2`` and ``/jsonrpc`` are deprecated." | EXT | re-read |
| "The db service was removed in Odoo 20 (fall 2026) and Online 19.1 (winter 2025)." | RPC | re-read |
| "The common and object services are scheduled for removal in Odoo 22 (fall 2028) and Online 21.1 (winter 2027)." | RPC | re-read |
| `/xmlrpc/2/common` "provides meta-calls which don't require authentication, such as the authentication itself or fetching version information." | RPC | re-read |
| `/xmlrpc/2/object` "is used to call methods of odoo models via the execute_kw RPC function." | RPC | re-read |
| "The way to use API Keys in your scripts is to simply replace your password by the key." | RPC | re-read |

Version matrix (INFERRED from the rows above): Odoo <= 18 → legacy RPC only; 19.0 / SaaS 19.x /
20.0 → JSON-2 preferred, legacy still answers (minus the `db` service from 20.0 and Online
19.1); Odoo 22 / Online 21.1 → legacy `common`/`object` gone.

## 4. Plan gates (Odoo Online)

| Fact | Source | Status |
| --- | --- | --- |
| "Access to data via the external API is only available on *Custom* Odoo pricing plans." (same sentence on both pages) | EXT, RPC | re-read |
| Pricing page: External API listed only under Custom; Custom lists "Odoo Studio / Agentic AI" | PRC | re-read |
| "When the call is initiated from Odoo, this is NOT considered an "External API."" | PRC | re-read |
| "You can also choose Odoo Studio as the app for a free plan." / "If you install Studio or add companies to your database, you will automatically switch to the Custom plan." | PRC | re-read |
| Pricing page has no statement about custom fields | PRC | re-read |
| "Odoo Online is incompatible with custom modules or modules from the Odoo Apps Store." Online allows "customizations that do not require custom code." No mention of Studio | ONL | re-read |
| Custom models over RPC: "Custom model names must start with x_."; fields: "only new fields created with state="manual" are activated" | RPC | re-read |

OPEN (no fetched page settles it): whether `ir.model.fields` creation over the API is allowed on
an Online Custom database and whether Studio is required; whether a trial database may use the
external API. FixFlow's design needs no custom field (it keys on External IDs and `ref`).

## 5. Rate limits

AUP (re-read): "Throttled calls are typically acceptable for unsustained usage at a rate of
1 call/second, with no parallel calls."; "Odoo provides batch APIs for imports, so there should
be no need for this."; "On Odoo.sh the dedicated hosting mode can be considered as an
alternative to lift this restriction." The rate text does not name Odoo Online (OPEN whether it
applies there; FixFlow assumes it does).

## 6. CSV importer and External IDs

| Fact | Source | Status |
| --- | --- | --- |
| With an External ID / Database ID column, "records that have already been imported are modified, instead of being created" | IMP | re-read |
| "If an ID is altered, or removed, the system may add a duplicate record, instead of updating the existing one." | IMP | re-read |
| The External ID "must be unique across all records of all objects" | IMP | re-read |
| "It is a good practice to prefix this External ID with the name of the application or table." | IMP | re-read |
| You can "import the same file several times without creating duplicates" | IMP | re-read |
| Relations: "XXX/ID (XXX/External ID)" or "XXX/Database ID" | IMP | re-read |
| "Click Test to verify that the data is valid."; "It is strongly advised to not remove the External ID (ID) column" | IMP | re-read |
| Journal entries are listed as importable; no column labels for `account.move` are given | IMP | re-read |

`load()` (ORM, re-read, first 100000 chars of ORM): docstring "Attempts to load the data matrix,
and returns a list of ids"; `current_module = self.env.context.get('module', '__import__')`; a
dot-less id becomes `"%s.%s" % (current_module, xid)`. So a JSON-2 `account.move/load` with a
dot-less `id` column lands in `ir.model.data` under module `__import__` unless a `module` context
key is passed (INFERRED from that line; not tested). `_load_records` ("Create or update records
of this model, and assign XMLIDs") and the `import_file` check that refuses a prefix naming an
existing module: survey only (ORM beyond 100000 chars, not re-read).

## 7. Accounting prerequisites (what exists, what is OPEN)

- `PK` (re-read): `'Pakistan - Accounting'`, version `'1.1'`, depends `['account',
  'account_tax_python', 'l10n_account_withholding_tax', 'product']`, auto_install `['account']`,
  LGPL-3.
- Survey (search summary, page not opened): the country chosen at database creation selects the
  default localization; it can be changed "as long as no entry has been posted".
- Survey (forum threads, fetched_in_run=false): `inalterable_hash` ("Secure Posted Entries with
  Hash") blocks reset to draft; a locked period blocks it too.
- OPEN: minimal `account.move` payloads (`move_type='entry'` with `line_ids`; `out_invoice`
  with `invoice_line_ids`), the `account.payment` / `account.payment.register` flow, and the
  journal / account / partner / currency prerequisites on 19.x / 20.0 — no primary page fetched.
  R-02 F13 (forum, Odoo 15, fetched=false) is the only lead. Settle it in the owner's test
  company (P9-0b / P10b), never from memory.
- OPEN: exact CSV column labels of the journal-entry importer on the owner's version; what a
  re-import of an already posted move does; the hash-lock behaviour on 19.x / 20.0.
