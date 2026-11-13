<!-- Trimmed from https://github.com/affaan-m/ECC @ b38be6a7f6350964d59328b52f0624e1d1d552d1 skills/fastapi-patterns/SKILL.md (MIT): kept sections "Configuration with pydantic-settings" (upstream lines 87-114), the "Note on Database Design" (line 389), the sync-vs-async pair of "Anti-Patterns" (lines 493-502) and "Best Practices" (lines 507-514). Text below the separator is verbatim. The upstream carries no "verified against version X on date" note (ECC VERSION file = 2.2.3 at this SHA). -->

> FixFlow reading notes (not upstream text): FixFlow's real settings class is
> `backend/app/core/config.py:20-27` (adds `env_prefix="FIXFLOW_"`, `case_sensitive=False`,
> `extra="ignore"`). The JWT/CORS fields in the example below are generic and are NOT FixFlow's
> (FixFlow: `jwt_secret` + boot guard, `config.py:151`, `config.py:223-232`). See SKILL.md
> "Where upstream disagrees" for every upstream sentence FixFlow overrides.

---

## Configuration with pydantic-settings

```python
# app/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "My App"
    app_version: str = "0.1.0"
    debug: bool = False

    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Pydantic-settings v2 safely evaluates mutable list literals directly
    allowed_origins: list[str] = ["http://localhost:3000"]
    allowed_methods: list[str] = ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
    allowed_headers: list[str] = ["Authorization", "Content-Type"]
    allow_credentials: bool = True


settings = Settings()
```

---

> **Note on Database Design:** Application-level unique handling requires an underlying unique database index (e.g., `unique=True` on your SQLAlchemy mapping attributes). Without underlying constraints, application layer error-catching cannot safely prevent concurrent race conditions.

---

## Anti-Patterns

```python
# Bad: sync DB calls in async routes block the event loop.
@router.get("/items/")
async def list_items(db: Session = Depends(get_db)):
    return db.query(Item).all()

# Good: use async SQLAlchemy executions.
@router.get("/items/")
async def list_items(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Item))
    return result.scalars().all()
```

---

## Best Practices

- Always declare a typed `response_model` to prevent accidental PII/data leaks and output clean OpenAPI schemas.
- Consolidate standard middleware dependency injections via type-aliasing: `DbDep = Annotated[AsyncSession, Depends(get_db)]`.
- Wrap database mutation boundaries gracefully within transactions inside your service layer, catching structural database errors directly.
- Parse JWT parameters defensively, expecting potential string/integer cast mismatches from modern payload variations.
- Enforce deterministic sorting (e.g., `.order_by(Model.id)`) on all offset/limit paginated endpoints to avoid data skips.
- Isolate authorization checks from core authentication dependencies to provide precise REST status signals (`401` vs `403`).
