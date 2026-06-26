# Backend — Party Registration API

FastAPI service (Python 3.13, async SQLAlchemy, MySQL) for party registration,
review, and incident tracking.

> For environment setup, the dev container, populating `.env`, running the whole
> stack, SAML/Mailpit dev setup, and DB access, see the **[root README](../README.md)**.
> For coding conventions and the docstring/OpenAPI standard, see **[AGENTS.md](AGENTS.md)**.

## API docs

With the backend running, the OpenAPI docs are served at:

- **Swagger UI** — `<API_BASE_URL>/docs`
- **ReDoc** — `<API_BASE_URL>/redoc`

Every route has a summary, a docstring-derived description, and documents the
error responses a client can realistically trigger (via the shared
`ErrorResponse` schema). This is the authoritative API reference — it is generated
from the code, so it never drifts.

## Architecture

Strict layering (a layer never skips the one below it):

```
persistence  (*_entity.py)   SQLAlchemy ORM models = DB tables
     ↓
service      (*_service.py)  business logic, validation, owns the session, raises typed exceptions
     ↓
router       (*_router.py)   FastAPI endpoints: auth, status codes, OpenAPI metadata
```

### Layout

```
src/
  core/                     shared infrastructure
    authentication.py       JWT + role-based auth dependencies
    config.py               env-driven settings
    database.py             async engine/session + get_session dependency
    exceptions.py           typed HTTPExceptions + ErrorResponse / error_response()
    types.py                custom SQLAlchemy types (UTC datetime, phone)
    utils/                  query_utils (pagination/sort/filter), email, excel, date, phone, bcrypt
  modules/<name>/           one folder per domain (see below)
  main.py                   app wiring: middleware, exception handlers, router includes
test/                       pytest suite, mirrors src/modules
alembic/                    migrations
script/                     dev DB scripts (create_db, reset_dev, …)
```

### Module pattern

Each domain in `src/modules/<name>/` has the same four-file shape:

| File                | Layer        | Responsibility                              |
| ------------------- | ------------ | ------------------------------------------- |
| `<name>_entity.py`  | persistence  | SQLAlchemy model(s) + `to_dto()` converters |
| `<name>_model.py`   | API contract | Pydantic DTOs (request/response schemas)    |
| `<name>_service.py` | service      | business logic; raises typed exceptions     |
| `<name>_router.py`  | router       | FastAPI endpoints + OpenAPI metadata        |

Domains: `account`, `auth`, `party`, `student`, `police`, `incident`, `location`,
`notification`. The **party** module is the reference implementation for the
docstring + OpenAPI conventions.

## Naming conventions

| Suffix       | Meaning                                                 |
| ------------ | ------------------------------------------------------- |
| `FooEntity`  | SQLAlchemy model — one DB table                         |
| `FooDto`     | Pydantic request/response schema                        |
| `FooService` | business logic for a domain                             |
| `*Exception` | typed `HTTPException` subclass with a fixed status code |

## Common tasks

All commands assume the Python environment is active (local: `source ../.venv/bin/activate`;
the dev container already has it on `PATH`). Run from the `backend/` directory.

```bash
# Run the dev server (or use the VSCode debugger — see root README)
fastapi dev src/main.py

# Tests
pytest                          # whole suite
pytest test/modules/party       # one module

# Migrations (always autogenerate — never hand-write; add CHECK constraints manually after)
alembic revision --autogenerate -m "describe change"
alembic upgrade head

# Dev DB helpers
python script/reset_dev.py      # rebuild + reseed the dev database
```

## Verification

Run before committing (one pre-commit hook id per invocation; chain with `&&`):

```bash
pre-commit run ruff-check --all-files && pre-commit run ruff-format --all-files && pre-commit run pyright --all-files
```

Docstrings (Google style) are enforced by Ruff `D` across all of `src/` — only
tests, migrations, and scripts are exempt.
