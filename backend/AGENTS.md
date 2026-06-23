# backend/AGENTS.md — FastAPI backend

Python 3.13 / FastAPI / SQLAlchemy (async) / MySQL. Read the root
[AGENTS.md](../AGENTS.md) first for the layering model, naming conventions, and
verification commands. This file covers backend-specific rules.

## Environment & basics

- **Local setups**: dependencies live in the root `.venv` — activate it before any
  Python command (`source .venv/bin/activate` from the repo root). **Devcontainer**
  (the assumed default): no `.venv`; run `python`/`ruff`/`pyright`/`pre-commit` directly.
- **Imports go at the top of the file**, unless an import genuinely must be deferred.
- Verify with pre-commit — `ruff-check`, `ruff-format`, `pyright` (all three). One hook
  id per invocation, so chain with `&&`:
  ```bash
  pre-commit run ruff-check --all-files && pre-commit run ruff-format --all-files && pre-commit run pyright --all-files
  ```

## Module pattern

Each domain under `src/modules/<name>/` follows the same four-file shape:

| File                | Layer        | Responsibility                                            |
| ------------------- | ------------ | --------------------------------------------------------- |
| `<name>_entity.py`  | persistence  | SQLAlchemy ORM model(s) + `to_dto()` converters           |
| `<name>_model.py`   | API contract | Pydantic DTOs (request/response schemas)                  |
| `<name>_service.py` | service      | business logic; owns the session; raises typed exceptions |
| `<name>_router.py`  | router       | FastAPI endpoints; auth, status codes, OpenAPI metadata   |

The **party module** (`src/modules/party/`) is the fully-documented golden
reference — copy its docstring and OpenAPI style when documenting other modules.

## Docstrings: Google style, enforced by Ruff

Ruff's `D` (pydocstyle) rules are enabled with `convention = "google"` (see the
root `pyproject.toml`). Public modules/packages/`__init__`/magic methods are
exempt; everything else exported needs a docstring.

**What the rules enforce** (the ones you'll hit most):

- Summary line starts on the **first line**, right after `"""`, and ends with a period.
- A **blank line** between the summary and any further description.
- For multi-line docstrings, the closing `"""` goes on **its own line**.
- Document raised exceptions under a `Raises:` section when non-obvious.
- Use `Args:` / `Returns:` only when they add information beyond the type signature.

```python
async def cancel_party(self, party_id: int, student_id: int | None) -> PartyDto:
    """Cancel a party by ID; idempotent if already cancelled.

    Args:
        party_id: ID of the party to cancel.
        student_id: If given, only the owning student may cancel; pass None for admins.

    Raises:
        PartyNotFoundException: If no party has the given ID.
        PartyValidationException: If the student doesn't own the party or it has occurred.
    """
```

**When to skip** (the linter already exempts these, but use judgment):

- Trivial converters/getters whose name says everything — a one-line summary is plenty.
- Tests (`test/`), migrations (`alembic/`), and scripts (`script/`) are fully exempt.
- For a genuinely self-evident public function the rule still fires; add a one-line
  summary rather than reaching for `# noqa: D` (reserve that for true exceptions).

> Docstrings are now **enforced across all of `backend/src`** — only tests,
> Alembic migrations, and one-off scripts are exempt (see `per-file-ignores` in the
> root `pyproject.toml`). New code needs docstrings to pass `ruff check`.

## OpenAPI: document every route

Routes are documented so `/docs` and `/redoc` are accurate. Standard per route:

- **`summary="..."`** — a short imperative title on every route.
- **Description** — comes free from the function's docstring; write a good one.
- **`responses={...}`** — document only the error codes a client can **realistically
  trigger** (not every theoretically possible code). Wire in the shared error schema
  with the `error_response()` helper from `src/core/exceptions.py`:

```python
from src.core.exceptions import error_response

@router.get("/{party_id}", summary="Get a party by ID",
            responses={404: error_response("Party with the given ID was not found")})
```

- **Structured errors** — `error_response()` references the `ErrorResponse` model
  (`{"detail": str}`). For domain errors with a richer body (e.g. party rule
  violations returning `{"detail": {"code", "message"}}`), reference a dedicated
  model like `PartyRuleErrorResponse` instead.
- **Paginated/list routes** — every route using
  `openapi_extra=get_paginated_openapi_params(...)` can return the same sort/filter 400. Don't repeat it; spread the shared `PAGINATED_QUERY_RESPONSES` from
  `src/core/utils/query_utils.py`:
  ```python
  responses={**PAGINATED_QUERY_RESPONSES, 404: error_response("...")}
  ```
- **`tags`** — set once on the `APIRouter(prefix=..., tags=[...])`.
- **Examples** — only on genuinely complex endpoints (e.g. discriminated-union
  request bodies). See `create_party` in `party_router.py` for the `openapi_extra`
  request-example pattern. Don't add examples to every route.
- **No `operation_id`s** — the frontend hand-writes its API layer; we don't generate
  a client from the spec, so explicit operation IDs add nothing.

## Other backend rules

- **Migrations**: always `alembic revision --autogenerate`; never hand-write a
  migration. Add CHECK constraints manually afterward (autogenerate misses them).
- **Tests**: avoid bare `assert`s — use or add shared test-util assertion helpers
  unless the assertion is truly one-off.
- **Auth**: login never returns 404 — an unknown email returns **401** by design
  (don't reveal which accounts exist).
- **Exceptions**: raise the typed exceptions in `src/core/exceptions.py` from the
  service layer; the global handler in `main.py` serializes them to `{"detail": ...}`.
