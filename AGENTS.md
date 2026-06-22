# AGENTS.md — Party Registration

Shared guidance for any AI agent or human contributor working in this repository.
This is the **source of truth**; `CLAUDE.md` is a symlink to it. Stack-specific
rules live in nested files — read the one for the area you're editing:

- **[backend/AGENTS.md](backend/AGENTS.md)** — Python / FastAPI / SQLAlchemy
- **[frontend/AGENTS.md](frontend/AGENTS.md)** — TypeScript / Next.js / React Query

> Documentation effort in progress (see `.claude/plans/`): docstrings and OpenAPI
> are being rolled out module-by-module behind linters. The **party module** is the
> golden reference in both stacks — mirror it when documenting other areas.

## What this project is

A web app for UNC students to register parties and for police/staff/admins to
review them. Monorepo:

| Path                    | What it is                                                                     |
| ----------------------- | ------------------------------------------------------------------------------ |
| `backend/`              | FastAPI API (Python 3.13, SQLAlchemy async, MySQL)                             |
| `frontend/`             | Next.js App Router app (TypeScript, React Query, shadcn/ui)                    |
| `deploy/`               | Production Docker Compose + deployment guide                                   |
| `e2e/`, `frontend/e2e/` | Playwright end-to-end tests                                                    |
| `.venv/`                | Root-level Python virtualenv (**local setups only** — not in the devcontainer) |

## Architecture: strict layering

Data flows through these layers and **never skips one** (e.g. a React component
never calls a service directly; it goes through a query hook):

```
 BACKEND                          FRONTEND
 persistence  (*_entity.py)       FE service   (*.service.ts)   typed Axios client
      ↓                                ↓
 service      (*_service.py)      query layer  (*.queries.ts)   React Query hooks
      ↓                                ↓
 router       (*_router.py)       presentational (components/pages)
      ↓  HTTP  ↑
      └────────┘
```

- **persistence** — SQLAlchemy ORM entities = database tables. No business logic.
- **service** — business logic, validation, owns the DB session. Raises typed exceptions.
- **router** — thin HTTP layer: auth, request/response shapes, status codes.
- **FE service** — typed client that calls the API and maps responses to frontend types.
- **query layer** — React Query hooks wrapping the FE service (caching, invalidation, optimistic updates).
- **presentational** — components and pages; consume query hooks only.

## Naming conventions

A suffix tells you the layer and shape at a glance:

| Suffix / pattern                | Layer        | Meaning                                                     |
| ------------------------------- | ------------ | ----------------------------------------------------------- |
| `FooEntity` / `foo_entity.py`   | persistence  | SQLAlchemy model — one DB table                             |
| `FooDto` / `foo_model.py`       | API contract | Pydantic request/response schema                            |
| `FooService` / `foo_service.py` | service      | business logic for a domain                                 |
| `foo_router.py`                 | router       | FastAPI endpoints for a domain                              |
| `foo.service.ts`                | FE service   | typed Axios client for a domain                             |
| `foo.queries.ts`                | query layer  | React Query hooks for a domain                              |
| `foo.types.ts`                  | FE types     | frontend DTOs + `convertFoo` mappers                        |
| `FooDtoBackend` (TS)            | FE types     | raw backend response shape (string dates) before conversion |

## Documentation philosophy

We document the **why and the non-obvious**, never restating what types already say.

- **Document**: every exported/public function, class, component, and hook;
  raised exceptions where non-obvious; surprising behavior, invariants, and edge cases.
- **Also document** confusing or complex _internal_ helpers even though the linter
  only enforces public/exported symbols — if it took you a minute to understand, write a line.
- **Skip**: trivial, self-evident one-liners (`getName`, simple getters/setters),
  generated code (`components/ui/` shadcn primitives), and tests (though e2e helpers
  should still be commented so the suite is followable).
- **Never** restate types in prose (no `@param {string}` — the stack is fully typed).

Stack-specific style, exact linter rules, and examples are in the nested AGENTS.md files.

## Verification (always before committing)

Use **pre-commit** for all verification:

- **Backend**: `ruff-check`, `ruff-format`, `pyright`
- **Frontend**: `prettier`, `tsgo`, `eslint`

`pre-commit run` takes **one hook id per invocation** — `pre-commit run ruff-check pyright --all-files` is **invalid**. Chain them with `&&`:

```bash
pre-commit run ruff-check --all-files && pre-commit run ruff-format --all-files && pre-commit run pyright --all-files
pre-commit run prettier --all-files && pre-commit run tsgo --all-files && pre-commit run eslint --all-files
```

Run a domain's checks together — don't run a single rule in isolation.

## Cross-cutting rules

- **Environment variables**: when adding/renaming/removing one, update all three
  templates in sync — `backend/.env.template`, `frontend/.env.template`,
  `deploy/.env.prod.template`. If a var exists on both sides (e.g. `CONTACT_EMAIL` /
  `NEXT_PUBLIC_CONTACT_EMAIL`), each template's comment should reference its counterpart.
- **Python environment**: in **local** setups dependencies live in the root `.venv` —
  activate it before running any Python command. In the **devcontainer** (the assumed
  default for most work), there is no `.venv`; the interpreter is already on `PATH`,
  so run `python`/`ruff`/`pyright`/`pre-commit` directly.
- **Error messages**: only tailor user-facing copy for error codes a user can
  realistically trigger; fall back to a generic message for the rest.
