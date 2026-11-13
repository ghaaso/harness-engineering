# Provenance — fastapi-alembic-safety (status: sourced)

## Upstream 1 of 1: ECC (everything-claude-code)

| Field | Value |
| --- | --- |
| Repo | https://github.com/affaan-m/ECC |
| Commit | `b38be6a7f6350964d59328b52f0624e1d1d552d1` |
| Branch | `main` |
| Fetched | 2026-11-04 (sparse, shallow clone) |
| Path taken | `skills/fastapi-patterns` — one file, `skills/fastapi-patterns/SKILL.md` (15,646 bytes) |
| Licence | MIT (SPDX `MIT`), repo-root `LICENSE`, "Copyright (c) 2026 Affaan Mustafa" |
| Licence file here | `LICENSE-ecc` (verbatim `cp`; sha256 `326146379f01…` matches the clone) |
| Version note | The upstream skill carries **no** "verified against / tested with" sentence. Repo `VERSION` = `2.2.3` at this SHA. Its closest version statement is a code comment, upstream `:106` "Pydantic-settings v2 safely evaluates mutable list literals directly" (no version, no date) — kept verbatim in the trimmed reference. |

No web research was done for this package (the owner's row required none). No URL was
fetched; none failed. The Postgres lock-level claims in the package are therefore cited to
FixFlow code comments only, and the package says so in `SKILL.md` and
`references/postgres-migration-safety.md`. URLs a later run should fetch:
`https://www.postgresql.org/docs/17/sql-altertable.html`,
`https://www.postgresql.org/docs/17/sql-createindex.html`.

## Taken

- `references/ecc-fastapi-patterns-trimmed.md` — trimmed from upstream `SKILL.md`, verbatim text
  for: "Configuration with pydantic-settings" (`:87-114`), "Note on Database Design" (`:389`),
  the sync-vs-async pair of "Anti-Patterns" (`:493-502`), "Best Practices" (`:507-514`). A
  short FixFlow reading note above the separator points at `backend/app/core/config.py`.

## Changed (adapted into SKILL.md)

- The pydantic-settings shape → FixFlow's real class: `env_prefix="FIXFLOW_"`,
  `case_sensitive=False`, `extra="ignore"`, the `database_url` driver coercion and the
  production boot guard (`SKILL.md` §1.7, §2.2).
- "Rely on atomic DB constraints rather than race-prone application-level prechecks"
  (upstream `:344`) and the `:389` unique-index note → FixFlow's idempotency (`client_id`
  partial unique indexes) and conditional UPDATEs (`try_transition`), with the savepoint rule
  replacing the upstream's session-wide rollback (`SKILL.md` §1.7, §5 item 5).
- Async-only DB calls and typed `response_model` → listed as "taken where FixFlow already does
  the same"; deterministic `order_by` on offset/limit pagination → a rule for P7a's opt-in
  pagination, not current practice (`SKILL.md` §5, last paragraph).
- Everything the owner's row and design §9 row 2 asked for and the upstream lacks — NOT VALID
  then VALIDATE, lock behaviour, single-transaction boot migrations, `alembic check` blind
  spots, asyncpg pooling and `pool_pre_ping`, migration testing against real Postgres,
  restore-and-verify — is **authored** from FixFlow code and docs, not from the upstream:
  `references/postgres-migration-safety.md`, `references/gates-and-restore-verify.md`.

## Rejected (with reason)

| Upstream | Reason |
| --- | --- |
| `:53-56` "Automatically create tables on startup for ease of use in dev/demo environments" + `Base.metadata.create_all` in the lifespan (survey collision 1) | Schema is owned by Alembic and `start.sh` migrates at boot; `create_all` hides drift (`CLAUDE.md:119-120`) |
| `:405-417` `sqlite+aiosqlite:///:memory:` test DB with `create_all`/`drop_all` (collision 2) | SQLite establishes nothing about Postgres migration safety (no NOT VALID, lock levels, partial indexes, triggers); CI and FixFlow tests run real Postgres (`ci.yml:88`; `CLAUDE.md:100-101`) |
| `:169`, `:176`, `:311-312`, `:321` `jose`, `OAuth2PasswordBearer`, `passlib` bcrypt (collision 3) | FixFlow auth is name/PIN, PBKDF2, `token_version` (`CLAUDE.md:31`); outside this row |
| `:287-300` `/users/token` login flow; `:198-202` integer `sub` user id | Not FixFlow's login; outside this row |
| `:248`, `:281`, `:490` `HTTPException(status_code=400, detail="Email already registered")` (collision 4) | Lifecycle conflicts are 409 with plain-text `(current status: X)` (`CLAUDE.md:188-189`); not generalised |
| `:346-348`, `:369-371` `except IntegrityError: await self.db.rollback()` (found at write time; not in survey §5) | `Session.rollback()` unwinds the outermost transaction; FixFlow recovers in a savepoint (`CLAUDE.md:243-245`) |
| `:179-185` `get_db` rolling back inside the dependency | FixFlow's `get_session` only yields; commit/rollback is the service's (`backend/app/core/db.py:4-5`, `:36-39`) |
| `:95`, `:102` no env prefix; `secret_key: str` with no fail-closed guard (collision 5 — a gap, not a contradiction) | FixFlow uses `FIXFLOW_` and `assert_safe_for_production` (`config.py:24`, `:223-232`) — which fails open off Railway (`O6-F01`, fixed in P1; `SKILL.md` §5 item 7) |
| `:14-34` `routers/ models/ schemas/ services/` layout | FixFlow is vertical slices enforced by import-linter (`CLAUDE.md:257`; `backend/pyproject.toml:99-102`) |
| `:69-75`, `:107-110` CORS middleware and settings | Outside this row (the appsec package's) |
| `:118-158` Pydantic `EmailStr` user schemas | Irrelevant to this row; FixFlow has no email login |
| Survey collision 6 — upstream is **silent** on `alembic downgrade`, the Railway rollback button, same-deploy VALIDATE, floats for money | Nothing to reject; the package adds FixFlow's rules (`SKILL.md` §4) and imports no generic "write a reversible downgrade" advice |
| Survey collision 7 — generic "reversible downgrade" advice (not in this upstream) | FixFlow's VALIDATE/seed downgrades are deliberate no-ops (`0045…py:52-58`, `0046…py:64-81`); kept as FixFlow's rule |
