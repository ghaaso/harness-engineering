# UPSTREAM — odoo-accounting-import (status: sourced)

Fetched 2026-11-04 as sparse, shallow clones. Package written 2026-11-04.

## 1. japinol7/odoo-json2

- Repo: https://github.com/japinol7/odoo-json2
- Commit: `5883ed50ef92b8aa8ec6a14a8a32a440e655518f` (branch `main`), fetched 2026-11-04
- Paths taken: `odoo_json2/`, `README.md`
- Licence: MIT (`LICENSE.txt`, "Copyright (c) 2025, 2026 Joan A. Pinol"), copied verbatim as
  `LICENSE-japinol7-odoo-json2`
- Upstream version note kept: `README.md:5` "version: 0.0.2"; `README.md:13` "Python requires:
  3.14 or greater."; `README.md:14` "Tested against Odoo 19.0 CE." (its only version claim: not
  Online, not SaaS 19.x, not 20.0)
- It is a library, not a skill. There is no SKILL.md and no frontmatter.

**Taken.** `references/json2-client-shape.md` (trimmed, MIT header): README lines 1-21 and 39-42,
`simple_json2/config.py:3-8`, `json2_connection.py:45-50` (`/json/2/` and `/web/` roots) and
`:63-69` (Bearer and `X-Odoo-Database` headers), `json2_client.py:50-67` (`_handle_response`),
`:72-81` (`call`), `:112-124` (`get_server_version_data`, trimmed), `:16` `DEFAULT_LIMIT = 50`,
`:129-132` `create` (`vals_list`), `:150-155` `search`, `:169-179` `search_read`, `:187-196`
`write`/`unlink`. All code is quoted unchanged, with upstream line numbers.

**Changed (adapted into SKILL.md).** The wire shape became the JSON-2 bullet of "Odoo facts in one
screen", cross-checked against the primary Odoo docs re-read on 2026-11-04. `_handle_response` is
the counter-example for the failure-classification rule (`references/fixflow-posting-shapes.md`
§4). `get_server_version_data` is the basis of procedure step 1 (version discovery).

**Rejected (with reason).**

- As a dependency (`requests>=2.34.2,<3`, `requires-python=">=3.14"`): the backend is Python 3.12
  + httpx (`backend/pyproject.toml:9`, `:26`; `backend/Dockerfile:4`). A sync `requests` call in
  the async scheduler is the O07-F13 hazard. Collision C1.
- The single `OdooJson2Error` for every status: it merges ambiguous and definitive outcomes.
  Collision C2. Rule: `O-07-design.md:60`, `CLAUDE.md:154`.
- `write` / `unlink` as tools for correcting a move: corrections are reversals. Collision C3.
  Rule: `O-07-design.md:3`, `docs/BACKEND-REQUIREMENTS-2026-07.md:593`.
- `get_db_list` (`/web/database/list`): the `db` service was removed in Odoo 20 and Online 19.1.
- `OdooClient`'s `getpass.getpass("API Key token: ")` (`odoo_client.py:40`): the key is an env
  secret read by a scheduler job.
- `tools/logger`, `version/`, packaging files: not needed for the wire shape.

## 2. unclecatvn/agent-skills — skills/odoo-workflow

- Repo: https://github.com/unclecatvn/agent-skills
- Commit: `82ebbaed8988e9697687612575d437ca0eacec4e` (branch `main`), fetched 2026-11-04
- Paths taken: `skills/odoo-workflow` (`SKILL.md`, `references/definition-of-done.md`,
  `scripts/odoo_trace.py`, `templates/CLAUDE.md`)
- Licence: MIT (`LICENSE`, "Copyright (c) 2026 UncleCat"), copied verbatim as
  `LICENSE-unclecatvn-agent-skills`
- Upstream version notes kept: `SKILL.md:6` "Odoo 16-19". `definition-of-done.md:8-9` "The
  commands below were run on 18 and 19; 16/17 forms are unverified unless the pack says
  otherwise." Repo `package.json` version 1.0.20.

**Taken.** `references/odoo-workflow-trace-rules.md` (trimmed, MIT header): `SKILL.md:6`,
`:63-69` (version rule; pack-missing rule), `:158-168` (Source-cell rules), `:186-192` (xmlids,
including chart-generated `account.<company id>_<name>`), `definition-of-done.md:8-9`
(verification note only).

**Changed (adapted into SKILL.md).** The version rule became procedure step 1, where the owner's
recorded answer outranks a probe. The NOT FOUND / UNCERTAIN discipline is used for "this field
or label exists on this version" claims, so they go to the OPEN list instead of being guessed.

**Rejected (with reason).**

- Steps 1 and 4 (xpath, OWL, view inheritance, `_inherit`, `sudo()` naming, i18n `.pot`/`.po`):
  FixFlow writes no Odoo module. "Odoo Online is incompatible with custom modules or modules
  from the Odoo Apps Store." (odoo_online.rst, re-read 2026-11-04).
- Step 5 and `definition-of-done.md` §1-6 (`odoo-bin -i/-u/--test-tags`, `db duplicate`,
  `db drop`, i18n export, lint): they need a local Odoo runtime and act on databases. Collision
  C7. Rule: `.claude/skills/README.md` rule 4 (`[owner]`). The owner's test company is an Online
  trial or One App Free (`SHIP-PLAN-2026-11.md:1116`). This includes `definition-of-done.md:32-33`
  (demo data, `--without-demo=all` / `--with-demo`) and `:35-36` (never `-i`/`-u` a named
  database "unless the user asks for it by name"): both sit inside §1 ("Install and test on one
  throwaway database", lines 11-37), need an `odoo-bin` runtime FixFlow does not have, and the
  second would let an agent run `-i`/`-u` on request. An earlier draft vendored them; removed
  2026-11-04 (refuter finding ODOO-R3).
- Step 0's conf discovery and `.claude/odoo.json` (`SKILL.md:50-62`): it reads `*.conf` files,
  which can hold an admin password. Collision C8. Rule: README rule 3.
- `odoo-commit` and the hygiene greps (`SKILL.md:35`, `:266-267`; `definition-of-done.md:124-142`;
  `templates/CLAUDE.md:32-39`): they fail on or strip `Co-Authored-By` / `Generated with`, while
  this repo's harness requires those attribution lines. Collisions C4 and C5.
- "Run BEFORE brainstorming or planning" (description; `SKILL.md:36-37`): plan §0 orders the
  work. Collision C6.
- `templates/CLAUDE.md` (Odoo 18.0 hard-coded): it would compete with `CLAUDE.md` as ground truth.
- `scripts/odoo_trace.py` (70,364 bytes, about 47 % of the package cap): it needs an Odoo source
  checkout and is usable only for self-hosted Community (`O-07-design.md:128-131`). Cited by path,
  not vendored.
- The `odoo-<major>` packs and the `odoo-code-tracer` / `odoo-code-review` agents named in
  `SKILL.md:65-69`, `:138-141`, `:271`: outside the manifest paths, so not fetched
  (PATH_MISSING `skills/odoo-19.0`, `skills/odoo-commit`). No `odoo-20.0` pack exists.

## 3. Collisions from SOURCE-NOTES §5 not adopted

| Id | Collision | Disposition |
| --- | --- | --- |
| C1 | odoo-json2 needs Python ≥ 3.14 | rejected (§1); SKILL.md (e) row 1 |
| C2 | one error class for 4xx and 5xx | rejected (§1); SKILL.md (e) row 2 |
| C3 | `unlink` / `write` helpers | rejected (§1); SKILL.md (e) row 3 |
| C4 | attribution-stripping greps and template | rejected (§2); SKILL.md (e) row 9 |
| C5 | `odoo-commit`, "no AI attribution" | rejected (§2); SKILL.md (e) row 9 |
| C6 | "Run BEFORE brainstorming or planning" | rejected (§2); SKILL.md (e) row 6 |
| C7 | `odoo-bin db duplicate` / `drop` | rejected (§2); SKILL.md (e) row 8 |
| C8 | reads `*.conf`, writes `.claude/odoo.json` | rejected (§2); SKILL.md (e) row 7 |
| C9 | O-07 says "never /xmlrpc or /jsonrpc"; the row asks for version-aware legacy RPC | not an upstream sentence. Legacy RPC is documented as reference for an Odoo ≤ 18 target only (`references/odoo-api-facts.md` §3); product transport stays JSON-2 (SKILL.md step 10) |
| C10 | `docs/requirements-2026-07-gap-analysis.md:100` says "JSON-RPC `create`"; `:88` cites `models.py:459` for the cursor | repo text, not upstream. The idempotency point is kept (JSON-2 `create` is equally non-idempotent). The cursor class is at `backend/app/features/jobs/models.py:498`. The stale doc lines were not edited (outside this package) |
| C11 | `docs/program/evidence/w1/R-02.txt:6` F1 reads 19.0 as "the last listed major" | superseded by the 2026-11-04 re-read of standard_extended_support.rst (20.0 latest; SaaS 19.3/19.4 supported) |

No upstream sentence mentions floats for money, Supabase RLS/GoTrue/Storage, expo, `alembic
downgrade` or the Railway rollback button.

## 4. Web sources (fetched by the author on 2026-11-04)

All succeeded unless noted:

1. https://raw.githubusercontent.com/odoo/documentation/master/content/developer/reference/external_api.rst
2. https://raw.githubusercontent.com/odoo/documentation/master/content/developer/reference/external_rpc_api.rst
3. https://raw.githubusercontent.com/odoo/documentation/master/content/applications/essentials/export_import_data.rst
4. https://raw.githubusercontent.com/odoo/documentation/master/content/administration/standard_extended_support.rst
5. https://raw.githubusercontent.com/odoo/documentation/master/content/administration/odoo_online.rst
6. https://www.odoo.com/pricing-plan (prices not recorded)
7. https://www.odoo.com/acceptable-use
8. https://raw.githubusercontent.com/odoo/odoo/20.0/addons/rpc/controllers/json2.py
9. https://raw.githubusercontent.com/odoo/odoo/20.0/odoo/orm/models.py (partial: only the first
   100000 of 292993 characters were read; `load()` is inside that range, `_load_records` is not)
10. https://raw.githubusercontent.com/odoo/odoo/20.0/addons/l10n_pk/__manifest__.py

Survey-only on 2026-11-04 (not re-read by the author). They are pointers in
`references/odoo-api-facts.md`:

- https://www.odoo.com/documentation/master/administration/odoo_online.html: nav only. WEB_UNAVAILABLE.
- https://www.odoo.com/documentation/19.0/applications/essentials/export_import_data.html:
  truncated at 100000 of 118988 characters. WEB_UNAVAILABLE.
- https://raw.githubusercontent.com/odoo/documentation/master/content/developer/reference/backend/orm.rst:
  fetched, but no ir.model.data / load text found.
- WebSearch ×4 (odoo.com: journal entry import; posted entries / reset to draft; Studio custom
  fields; l10n_pk): summaries only.
- `gh api repos/odoo/odoo` (branches; `odoo/release.py`; `addons/rpc`; commits/20.0).
