# frontend/AGENTS.md — Next.js frontend

TypeScript / Next.js App Router / React Query / shadcn/ui. Read the root
[AGENTS.md](../AGENTS.md) first for the layering model, naming conventions, and
verification commands. This file covers frontend-specific rules.

## Basics

- Dev server runs on **port 3000**.
- Verify with pre-commit — `prettier`, `tsgo`, `eslint` (all three). One hook id per
  invocation, so chain with `&&`:
  ```bash
  pre-commit run prettier --all-files && pre-commit run tsgo --all-files && pre-commit run eslint --all-files
  ```
- **Zod v4** for schemas. **`date-fns`** for _all_ date operations and formatting.
- Display helpers: format times and phone numbers via the utils in
  `src/lib/utils.ts` — don't hand-roll formatting.
- **Academic-year validity**: to decide whether a date like a student's
  `last_registered` (Party Smart) or chosen residence date is still valid, use
  `isFromThisSchoolYear(date)` from `src/lib/utils.ts` — **don't** just null-check it.
  A non-null date from a previous academic year is stale and must not count as valid.
- **Role-based access**: use `getAllowedRoles(path)` from `@/lib/auth/route-access`
  instead of hardcoding comparisons like `role === "police_admin"`. This keeps
  access checks in sync with the route-guard config.
- **React Compiler is on**: do **not** add manual `useMemo`/`useCallback`/`memo`
  unless the component is opted out or there's a documented reason (e.g. a stable
  ref needed as an effect dependency).

## API domain pattern (the "trio")

Each backend domain has a matching trio under `src/lib/api/<domain>/`:

| File                  | Layer       | Responsibility                                                |
| --------------------- | ----------- | ------------------------------------------------------------- |
| `<domain>.service.ts` | FE service  | typed Axios client; maps backend → frontend types             |
| `<domain>.queries.ts` | query layer | React Query hooks (caching, invalidation, optimistic updates) |
| `<domain>.types.ts`   | FE types    | frontend DTOs + `convert*` mappers from `*Backend` shapes     |

Backend sends string dates and backend-shaped DTOs (`FooDtoBackend`); the service's
`convert*` helpers parse them into frontend types (`Date`, etc.). Components consume
**query hooks only**, never the service directly.

The **party** domain (`src/lib/api/party/`) plus the `useServerTableState` hook are
the fully-documented golden reference — mirror them.

## Docstrings: TSDoc, enforced by eslint-plugin-jsdoc

`jsdoc/require-jsdoc` requires a `/** ... */` block on **exported** functions,
classes, methods, and components. Because the stack is fully typed, type tags are
**disabled** (`jsdoc/no-types`) — never write `@param {string}` / `@returns {...}`.

```ts
/**
 * Search for parties near a location (`GET /api/parties/nearby`).
 *
 * Always returns a `ProximitySearchResponse` with `PartyPoliceDto` items —
 * `/nearby` is only used in the police view.
 */
async getPartiesNearby(placeId: string, startDate: Date, endDate: Date) { ... }
```

- A one-line `/** ... */` is fine for simple exports; add `@param`/`@returns`
  **descriptions** (no types) only when they clarify non-obvious behavior.
- **Also document** complex _internal_ helpers (e.g. tricky hooks like
  `useServerTableState`, optimistic-update logic) even though only exports are
  enforced — see the golden files for the bar.
- **Skip / exempt**: `components/ui/` (shadcn primitives), `e2e/`, generated files.
  e2e is not linted but should still be commented so the suite is followable.

> TSDoc is now **enforced across all of `src`** (`src/**/*.{ts,tsx}` in
> `eslint.config.mjs`); `components/ui` (shadcn primitives) is exempt. New exported
> symbols need a `/** ... */` block to pass `eslint`.

## Directory map

```
src/
  app/            Next.js App Router (route groups: (student), staff/, police/, api/)
    **/_components, **/_lib   colocated, route-private helpers
  components/      shared components; components/ui/ = shadcn primitives (don't doc-lint)
  lib/
    api/<domain>/  the service/queries/types trio per domain
    auth/          route-access.ts (getAllowedRoles), auth-options, signout
    utils.ts       formatting helpers (phone, time, address, cn)
    config/        env.client.ts / env.server.ts
  contexts/        React context providers (e.g. SnackbarContext)
```
