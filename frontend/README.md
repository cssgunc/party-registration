# Frontend — Party Registration

Next.js (App Router) + TypeScript + React Query + shadcn/ui client for students,
police, and staff/admins.

> For environment setup, the dev container, populating `.env`, and running the
> whole stack, see the **[root README](../README.md)**. For coding conventions
> (TSDoc, date handling, role checks, the React Compiler rules), see **[AGENTS.md](AGENTS.md)**.

## Scripts

Run from the `frontend/` directory (dev server runs on **port 3000**):

```bash
npm run dev          # dev server (Turbopack)
npm run build        # production build
npm run start        # serve the production build
npm run lint         # eslint
npm run test:e2e     # Playwright e2e (see ../e2e and root README)
npm run test:e2e:ui  # Playwright UI mode
```

## Architecture

Data flows in one direction; components never call a service directly:

```
FE service   (*.service.ts)   typed Axios client; maps backend → frontend types
     ↓
query layer  (*.queries.ts)   React Query hooks (caching, invalidation, optimistic updates)
     ↓
presentational                components & pages consume query hooks only
```

### Layout

```
src/
  app/                  Next.js App Router
    (student)/          student route group (registration, profile, info)
    staff/              staff/admin dashboard ([tab] tables + _components/_lib)
    police/             police map, party search, incident reporting, admin, auth
    api/                Next.js route handlers (NextAuth, SAML, token refresh)
    layout.tsx, providers.tsx
  components/           shared components; components/ui/ = shadcn primitives
    form/               app form fields built on shadcn Form + react-hook-form
  lib/
    api/<domain>/       the service/queries/types trio (see below)
    auth/               route-access.ts (getAllowedRoles), auth-options, signout
    utils.ts            formatting helpers (phone, time, address, cn)
    config/             env.client.ts / env.server.ts
  contexts/             React context providers (e.g. SnackbarContext)
  proxy.ts              route-access middleware
```

### API domain pattern (the "trio")

Each backend domain has a matching trio under `src/lib/api/<domain>/`:

| File                  | Layer       | Responsibility                                            |
| --------------------- | ----------- | --------------------------------------------------------- |
| `<domain>.service.ts` | FE service  | typed Axios client; maps backend → frontend types         |
| `<domain>.queries.ts` | query layer | React Query hooks                                         |
| `<domain>.types.ts`   | FE types    | frontend DTOs + `convert*` mappers from `*Backend` shapes |

The backend sends string dates and backend-shaped DTOs (`FooDtoBackend`); the
service's `convert*` helpers parse them into frontend types (`Date`, etc.). The
**party** domain is the reference implementation.

### Route access

Access control is centralized in `lib/auth/route-access.ts` and enforced by
`proxy.ts`. Always use `getAllowedRoles(path)` rather than hardcoding role
comparisons, so checks stay in sync with the route-guard config.

## Conventions (see [AGENTS.md](AGENTS.md) for the full list)

- **Zod v4** for schemas; **`date-fns`** for all date work; format phone/time via
  `lib/utils.ts`.
- **React Compiler is on** — don't add manual `useMemo`/`useCallback`/`memo` without
  a documented reason.
- TSDoc is enforced on exported symbols across `src/**` (shadcn `components/ui` exempt).

## Verification

Run before committing (one pre-commit hook id per invocation; chain with `&&`):

```bash
pre-commit run prettier --all-files && pre-commit run tsgo --all-files && pre-commit run eslint --all-files
```
