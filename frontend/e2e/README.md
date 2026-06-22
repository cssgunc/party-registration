# E2E Tests

End-to-end tests run with [Playwright](https://playwright.dev/) against a fully local stack. All tests are sequential (single worker) to avoid database conflicts.

## Prerequisites

### Services

All of the following must be running before you start the test suite:

| Service                  | Port(s) | Notes                                             |
| ------------------------ | ------- | ------------------------------------------------- |
| Next.js frontend         | 3000    | `NEXTAUTH_URL` in `.env.local` controls this      |
| FastAPI backend          | 8000    | `NEXT_PUBLIC_API_BASE_URL` must point here        |
| MySQL                    | 3306    | Populated via `reset_dev` script before each test |
| SAML IdP (SimpleSAMLphp) | 8080    | Required for student/staff/admin login flows      |
| Mailpit SMTP             | 1025    | Backend sends all email here                      |
| Mailpit Web UI           | 8025    | Tests read email via the REST API                 |

### Setup — devcontainer vs. local

**Devcontainer** (`post_create.sh` + `Dockerfile`): `socat`, the Playwright Chromium browser, SAML SP certificates, and the initial database seed are all handled automatically. You do not need to install or run any of those manually.

**Local dev** (`setup_local.sh`): Running `.devcontainer/setup_local.sh` handles the same items — it installs the Playwright browser, generates SAML certificates, starts the Docker containers (MySQL, SAML IdP, Mailpit), and seeds the database. Run it once after cloning.

In both cases you still need to start the frontend and backend dev servers manually before running tests.

## Running tests

From `frontend/`:

```bash
npm run test:e2e        # headless
npm run test:e2e:ui     # interactive UI mode
```

## Configuration

`playwright.config.ts` loads `frontend/.env.local` and `backend/.env` automatically via dotenv. Key variables:

| Variable                        | Default                     | Effect                                                                |
| ------------------------------- | --------------------------- | --------------------------------------------------------------------- |
| `NEXTAUTH_URL`                  | `http://localhost:3000`     | Sets Playwright `baseURL`                                             |
| `NEXT_PUBLIC_API_BASE_URL`      | `http://localhost:8000/api` | API the app talks to                                                  |
| `ACCESS_TOKEN_EXPIRE_MINUTES`   | `60`                        | Used by `global-setup` to decide if cached auth files are still valid |
| `NEXT_PUBLIC_CHPD_EMAIL_DOMAIN` | `chapelhillnc.gov`          | Police signup email validation                                        |
| `MAILPIT_TIMEOUT_MS`            | `10000`                     | How long to poll Mailpit waiting for an email                         |
| `E2E_EXPECT_TIMEOUT`            | `15000`                     | Playwright assertion timeout (ms)                                     |
| `E2E_ACTION_TIMEOUT`            | `30000`                     | Playwright action timeout (ms)                                        |
| `E2E_NAVIGATION_TIMEOUT`        | `60000`                     | Playwright navigation timeout (ms)                                    |
| `E2E_TEST_TIMEOUT`              | `120000`                    | Per-test timeout (ms)                                                 |

### Things that must match between config and services

- `SMTP_HOST` / `SMTP_PORT` in `backend/.env` must point at Mailpit (`localhost:1025`).
- `SAML_*` vars in `frontend/.env.local` must match the running SimpleSAMLphp container (port 8080, SSO at `/simplesaml/saml2/idp/SSOService.php`).
- `SAML_ALLOW_UNENCRYPTED_ASSERTION=true` must be set for the local test IdP to work.

## Seeded accounts

The database is reset to a known state (from `frontend/shared/mock_data.json`) before each test. The following accounts are always available:

### Students (SAML login)

| Fixture    | Username   | Password       | Email                  | State                               |
| ---------- | ---------- | -------------- | ---------------------- | ----------------------------------- |
| `STUDENT1` | `student1` | `student1pass` | stevenmorrison@unc.edu | Party Smart complete, residence set |
| `STUDENT2` | `student2` | `student2pass` | monicamalone@unc.edu   | New user, no residence              |
| `STUDENT3` | `student3` | `student3pass` | lauragonzales@unc.edu  | Expired Party Smart, residence set  |
| `STUDENT4` | `student4` | `student4pass` | alexrivera@unc.edu     | Brand new, never provisioned        |

### Staff / Admin (SAML login)

| Fixture  | Username | Password     | Email              | Notes                                                       |
| -------- | -------- | ------------ | ------------------ | ----------------------------------------------------------- |
| `STAFF1` | `staff1` | `staff1pass` | janesmith@unc.edu  | Provisioned in backend                                      |
| `ADMIN1` | `admin1` | `admin1pass` | johndoe@unc.edu    | Provisioned in backend                                      |
| `ADMIN2` | `admin2` | `admin2pass` | priyapatel@unc.edu | In SAML IdP but NOT provisioned — used to test invite flows |

### Police (database login)

| Fixture          | Email                    | Password         | Role         |
| ---------------- | ------------------------ | ---------------- | ------------ |
| `POLICE_OFFICER` | jcarter@chapelhillnc.gov | `securepassword` | officer      |
| `POLICE_ADMIN`   | dreyes@chapelhillnc.gov  | `securepassword` | police_admin |

## Auth file caching

`global-setup.ts` logs in once per role and saves auth state to `.auth/`. These files are reused across tests to skip repeated login flows. They are invalidated when cookies expire (checked against `ACCESS_TOKEN_EXPIRE_MINUTES - 1` minutes from now).

## Test structure

Tests in `e2e/test/` use two fixtures:

- **`test`** (from `helpers/fixtures.helpers.ts`) — auto-resets the database before each individual test. Use this for most tests.
- **`suiteTest`** — no auto-reset. Used by exhaustive/pagination tests that call `resetDatabase()` once in `beforeAll` and run many sub-tests against the same seeded state.

Exhaustive tests often set longer timeouts (`test.describe.configure({ timeout: 300_000 })`).
