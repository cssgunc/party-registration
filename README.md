# Party Registration System

A CS+SG project for the Office of Off-Campus Student Life at UNC.

## About the Office of Off-Campus Student Life

The Office of Off-Campus Student Life serves as a vital resource for students living off-campus, providing support, programs, and services to enhance the off-campus living experience. This office works to connect off-campus students with campus resources, facilitate community building, and ensure student safety and well-being in off-campus environments. Through various initiatives and programs, the office aims to bridge the gap between on-campus and off-campus student experiences, fostering a sense of belonging and engagement for all students regardless of their housing situation.

## Project Mission

We aim to facilitate and better secure the party registration process at UNC.

## Tech Stack

- Backend
  - FastAPI
  - MySQL
  - SQLAlchemy
  - Pytest
- Frontend
  - Next.js
  - ShadCN
  - Typescript

## File Structure

Root-level config files:

```
pyproject.toml            Root-level Python config for pre-commit and shared tooling (ruff, pyright)
.pre-commit-config.yaml   Pre-commit hook definitions — runs linting and formatting checks before each commit
.dockerignore             Files excluded from the Docker build context
```

<details>
<summary><code>.devcontainer/</code> — dev container configuration and local setup</summary>

```
.devcontainer/
├── devcontainer.json                     VS Code dev container config — defines services, extensions, and settings
├── docker-compose.yml                    Spins up the backend, frontend, database, and supporting dev services
├── Dockerfile                            Base image for the dev container environment
├── post_create.sh                        Runs after the container is created — installs dependencies and seeds the database
├── setup_local.sh                        One-time local setup script for configuring certs and env files outside the container
└── saml-idp/
    └── authsources.php                   Mock SAML IdP user definitions for testing SSO login in development
```

</details>

<details>
<summary><code>deploy/</code> — production Dockerfiles, compose config, and deployment docs</summary>

```
deploy/
├── Dockerfile.backend                Dockerfile for building the FastAPI backend image
├── Dockerfile.frontend               Dockerfile for building the Next.js frontend image
├── docker-compose.prod.yml           Orchestrates backend, frontend, and supporting services for production
├── backend-entrypoint.sh             Entrypoint script — runs Alembic migrations then starts the backend server
├── .env.prod.template                Required production environment variables with placeholder values
└── README.md                         Instructions for deploying and configuring the production environment
```

</details>

<details>
<summary><code>backend/</code> — FastAPI app, database migrations, and tests</summary>

```
backend/
├── .env.template                         Required environment variables for the backend with placeholder values
├── pyproject.toml                        Python project config — dependencies, dev tools, and test settings
├── test/                                 Tests that mirror the structure of src/
│   ├── conftest.py                       Root pytest fixtures — spins up the test database, HTTP client, and auth helpers
│   ├── utils/
│   │   ├── geo.py                        Helpers for computing lat/lng offsets relative to the party search radius
│   │   ├── pagination_test_utils.py      Reusable helpers for asserting pagination, sorting, and filtering on list endpoints
│   │   ├── resource_test_utils.py        Abstract base class for generating and managing test data for any resource
│   │   └── http/
│   │       ├── assertions.py             Typed assertion helpers for validating HTTP response shape, status, and body
│   │       └── test_templates.py         Reusable test generators for asserting auth/authorization behavior on any endpoint
│   └── modules/
│       ├── [module]/                     Tests for each module, mirroring src/modules structure
│       └── query_utils/                  Tests for the shared query_utils pagination and filtering logic
├── alembic/                              Database migration management
│   ├── env.py                            Configures Alembic to use the app's SQLAlchemy engine and entity metadata
│   └── versions/                         One file per migration, applied in order to evolve the database schema
├── script/                               One-off scripts for managing the database
│   ├── create_db.py                      Creates the application database if it doesn't already exist
│   ├── create_test_db.py                 Creates the test database if it doesn't already exist
│   ├── delete_db.py                      Drops the application database
│   └── reset_dev.py                      Drops and recreates the database, then seeds it with initial dev data
└── src/
    ├── core/                             Shared infrastructure used across all modules
    │   ├── authentication.py             Route-level auth guards — enforces which roles are allowed to access a given endpoint
    │   ├── config.py                     Central source for all environment-based configuration (DB credentials, JWT secrets, SMTP, etc.)
    │   ├── database.py                   Connects to the database and initializes entity metadata and session management
    │   ├── exceptions.py                 Shared HTTP error types used across the app to keep error responses consistent
    │   ├── types.py                      Reusable SQLAlchemy column types — UTCDateTime (timezone-aware datetime), PhoneNumber
    │   └── utils/
    │       ├── bcrypt_utils.py           Handles password hashing and verification
    │       ├── date_utils.py             Helpers for academic-year date logic
    │       ├── email_utils.py            Responsible for sending emails
    │       ├── excel_utils.py            Responsible for generating and exporting Excel files
    │       ├── phone_utils.py            Shared phone number type with built-in format validation
    │       └── query_utils.py            Reusable pagination, sorting, filtering, and search logic for list endpoints
    └── modules/                          Feature modules — each one owns its own data, logic, and routes
        │
        │   Each module follows the same four-file pattern:
        │     _entity.py    defines the database table and its columns
        │     _model.py     defines Pydantic schemas for request/response shapes
        │     _service.py   contains all business logic and database queries
        │     _router.py    exposes HTTP endpoints and wires them to the service
        │
        ├── account/        UNC user accounts for students, staff, and admins (identity, roles, profile data)
        ├── auth/           Authentication — login, token issuance, and refresh
        ├── incident/       Incidents reported at a party location
        ├── location/       Physical addresses resolved via Google Maps
        ├── party/          Party registration submissions and their lifecycle
        ├── police/         Police officer accounts and their verification flow
        └── student/        Student-specific profile data linked to an account
```

</details>

<details>
<summary><code>frontend/</code> — Next.js app, pages, components, and API client</summary>

```
frontend/
├── .env.template                 Required environment variables for the frontend with placeholder values
├── package.json                  Node dependencies, scripts, and project metadata
├── shared/
│   └── mock_data.json            Shared mock dataset used by `backend/script/reset_dev.py` to seed the dev database and by `src/lib/mockData.ts` to build typed frontend fixtures
└── src/
    ├── proxy.ts                  Next.js middleware — enforces role-based route access before any page renders
    ├── app/
    │   ├── layout.tsx                Root layout — applies global fonts, styles, and wraps the app in Providers
    │   ├── page.tsx                  Landing page
    │   ├── providers.tsx             Client-side providers for React Query and the toast/snackbar system
    │   │
    │   ├── api/                      Next.js API routes (server-side, not rendered)
    │   │   └── auth/
    │   │       ├── [...nextauth]/    NextAuth.js catch-all handler for OAuth session management
    │   │       ├── login/saml/       Handles the SAML SSO login flow for UNC accounts
    │   │       ├── logout/           Revokes the refresh token and clears the session on logout
    │   │       ├── police/login/     Issues a session for police accounts via username/password
    │   │       └── token/refresh/    Exchanges a refresh token for a new access token
    │   │
    │   ├── login/
    │   │   ├── page.tsx              Student/staff login page (redirects to UNC SSO)
    │   │   └── police/page.tsx       Police login page (username/password form)
    │   ├── logout/page.tsx           Handles post-logout redirect after session teardown
    │   │
    │   ├── student/                  Student-facing portal
    │   │   ├── page.tsx              Student dashboard — shows their registered parties
    │   │   ├── profile/page.tsx      Student profile — contact preferences and phone number
    │   │   ├── new-party/page.tsx    Party registration form
    │   │   └── _components/          Components used only within the student section
    │   │
    │   ├── staff/                    Staff/admin management portal
    │   │   ├── page.tsx              Staff landing page — redirects to default tab
    │   │   ├── [tab]/page.tsx        Tabbed management views (parties, students, locations, accounts, incidents)
    │   │   ├── _lib/tabs.tsx         Tab definitions and routing config for the staff portal
    │   │   └── _components/          Components used only within the staff section
    │   │
    │   └── police/                   Police-facing portal
    │       ├── page.tsx              Police dashboard — map and party list for officers
    │       ├── signup/page.tsx       Self-service signup page for new police officers
    │       ├── verify/page.tsx       Email verification landing page for police accounts
    │       ├── admin/page.tsx        Police admin view for managing officer accounts
    │       └── _components/          Components used only within the police section
    │           └── admin/_components/  Components used only within the police admin subpage
    │
    ├── components/                   Shared components used across multiple pages
    │   ├── ui/                       Low-level ShadCN primitives (Button, Dialog, Table, etc.) — not modified directly
    │   └── ...                       Higher-level shared components (AddressSearch, DatePicker, Header, etc.)
    │
    └── lib/
        ├── api/                      Frontend's module system — mirrors the backend's modules structure
        │   │   Each module has up to three files:
        │   │     .types.ts     TypeScript types mirroring backend Pydantic schemas
        │   │     .service.ts   Functions that make HTTP requests to the backend
        │   │     .queries.ts   React Query hooks wrapping service calls for use in components
        │   ├── account/
        │   ├── auth/
        │   ├── incident/
        │   ├── location/
        │   ├── party/
        │   ├── police/
        │   ├── student/
        │   └── shared/
        │       ├── download-file.ts  Helper for triggering Excel file downloads from API responses
        │       └── query-params.ts   Converts TanStack Table state (pagination, sort, filters) to API query params
        │
        ├── auth/
        │   ├── auth-options.ts       NextAuth configuration — session strategy, providers, and token callbacks
        │   └── signout.ts            Wrapper around NextAuth signOut that also clears local session state
        ├── config/
        │   ├── env.client.ts         Public env vars accessible in the browser
        │   └── env.server.ts         Private env vars accessible only server-side
        ├── network/
        │   └── apiClient.ts          Axios instance with auth headers, token refresh interceptor, and error handling
        ├── mockData.ts               Typed mock data used for development and testing without a live backend
        ├── saml.ts                   Initializes the SAML service provider using certificates and config from env
        ├── shared.ts                 Shared TypeScript types and constants used across lib/
        └── utils.ts                  General-purpose utilities (cn, date helpers, zod schemas, role checks)
```

</details>

## Prerequisites

Before setting up the dev container, ensure you have the following installed:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (v2.0.0+) — must be running before opening the dev container
- VS Code extensions:
  - **Docker** by Microsoft
  - **Dev Containers** by Microsoft

## Onboarding

Clone the repository into your preferred directory

```
git clone https://github.com/cssgunc/party-registration.git
```

Open a terminal at the project root and run the following commands

```
cd frontend
cp .env.template .env.local # duplicates the template and renames it to .env.local

cd ../backend
cp .env.template .env # duplicates the template and renames it to .env
```

### Populating environment variables

After copying the templates, fill in the `REPLACE_ME` values in each file before starting the dev container.

**`backend/.env`**

| Variable | How to get it |
| --- | --- |
| `JWT_SECRET_KEY` | Any random string — run `python -c "import secrets; print(secrets.token_hex(32))"` |
| `REFRESH_TOKEN_SECRET_KEY` | Same as above, use a **different** value from `JWT_SECRET_KEY` |
| `INTERNAL_API_SECRET` | Any random string — must match `INTERNAL_API_SECRET` in `frontend/.env.local` |
| `GOOGLE_MAPS_API_KEY` | Obtain from the team, or create one in [Google Cloud Console](https://console.cloud.google.com) with **Maps JavaScript API** and **Places API** enabled |

**`frontend/.env.local`**

| Variable | How to get it |
| --- | --- |
| `INTERNAL_API_SECRET` | Must match `INTERNAL_API_SECRET` in `backend/.env` |
| `NEXTAUTH_SECRET` | Any random string — run `python -c "import secrets; print(secrets.token_hex(32))"` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Same key as `GOOGLE_MAPS_API_KEY` in `backend/.env` |
| `NEXT_PUBLIC_GOOGLE_MAP_ID` | Create a Map ID in [Google Cloud Console](https://console.cloud.google.com) under Google Maps Platform → Map Management |

All other values in both templates are pre-configured for the local dev container and can be left as-is.

Or you can do the actions manually. Then,

- Open the VS Code Command Palette (Mac - Cmd+Shift+P and Windows - Ctrl+Shift+P)
- Run the command **Dev Containers: Rebuild and Reopen in Container**
- This should open the dev container with the same file directory mounted so any changes in the dev container will be seen in the local repo
- The dev container is fully built once the file directory is populated and the post create script finished running


### Troubleshooting

#### Dev Container fails with Docker image pull error

If the Dev Container build fails with an error like `Command failed: docker pull python:3.12-slim`, the most common cause is an active VPN. Disable your VPN and run **Dev Containers: Rebuild and Reopen in Container** again.

If you aren't on a VPN and the pull is still timing out, try pulling the image manually first:

```sh
DOCKER_CLIENT_TIMEOUT=120 docker pull python:3.12-slim
```

Then retry the Dev Container command.

## Running The App

_If you haven't run in a day or more, run `python -m script.reset_dev` from the `/backend` directory to ensure all mock data is updated to be centered around today's date_

### VSCode Debugger (Recommended)

Navigate to the "Debug and Run" tab on the VSCode side bar.

At the top of the side bar, next to the green play button, select the desired module to run

- **Backend**: Starts the FastAPI backend on http://localhost:8000
- **Purge & Frontend**: Starts the Next.js frontend on http://localhost:3000
  - _The "Purge" part of this is referring to the task that kills any `next dev` processes in order to address a devcontainer issue. Note that this prevents you from running multiple of these debug sessions concurrently. If mulitple are needed, refer to the manual instructions below_
- **Full Stack**: Starts both of the above in separate terminals

Then simply press the green play button

### Manually

**Backend**: Open a new terminal and run these commands

```
cd backend/src
fastapi dev
```

**Frontend**: Open another new terminal and run these commands to start the frontend

```
cd frontend
npm run dev
```

Navigate to [http://localhost:3000]() to view the website

## SAML Dev Setup

When you open this project in the Dev Container, the post-create script will automatically generate the Service Provider (SP) certs used by `saml2-js` in `frontend/certs` (`key.pem` and `cert.pem`).

The development IdP certificate (`SAML_IDP_CERT`) is already populated in `frontend/.env.template` using the test IdP cert published by `kristophjunge/test-saml-idp`:

- [https://github.com/kristophjunge/docker-test-saml-idp/blob/master/config/simplesamlphp/server.crt](https://github.com/kristophjunge/docker-test-saml-idp/blob/master/config/simplesamlphp/server.crt)

### Dev IdP Test Accounts

The mock IdP users are defined in `.devcontainer/saml-idp/authsources.php` and match the accounts in `frontend/shared/mock_data.json`. Credentials follow the pattern `<username>:<username>pass`.

**SSO Authenticated Accounts**

| Credential                  | Name            | Role    | Email                  |
| --------------------------- | --------------- | ------- | ---------------------- |
| `student1` / `student1pass` | Steven Morrison | student | stevenmorrison@unc.edu |
| `student2` / `student2pass` | Monica Malone   | student | monicamalone@unc.edu   |
| `student3` / `student3pass` | Laura Gonzales  | student | lauragonzales@unc.edu  |
| `staff1` / `staff1pass`     | Jane Smith      | staff   | janesmith@unc.edu      |
| `admin1` / `admin1pass`     | John Doe        | admin   | johndoe@unc.edu        |

**Police Accounts**

| Email                    | Password       |
| ------------------------ | -------------- |
| jcarter@chapelhillnc.gov | securepassword |
| dreyes@chapelhillnc.gov  | securepassword |

## Mail Server (Mailpit)

The dev container includes [Mailpit](https://mailpit.axllent.org/), a local SMTP server that captures outgoing emails so they never reach real recipients.

- **Web UI**: [http://localhost:8025](http://localhost:8025) — view all captured emails
- **SMTP**: `localhost:1025` — configure your backend's email settings to point here

Any emails sent by the app during development will appear in the Mailpit inbox instead of being delivered.

## Running Backend Tests

### Manual Testing

After running the backend, navigate to [http://localhost:3000/docs]()
Click on the "Authorize 🔓" button in the top right, and enter "admin", "student", or "police" as the mock token for the respective role
You can then make any requests using the provided GUI

### Unit Tests

The best way to run unit tests is by using the "Testing" window on the sidebar. This provides an intuitive GUI for running tests within the IDE.
You can also run all tests by opening a new terminal and simply running

```sh
pytest
```

## Accessing the Database

- Navigate to the Database tab on the sidebar in VSCode (provided by the "MySQL" extension, cylinder icon)
- Click the plus icon to add a new connection and enter these values:
  - Host: db (inside devcontainer) or localhost (local dev)
  - User: root
  - Password: securepassword
  - Database: ocsl
  - Port: 3306
- In this interface, you can explore the database, make queries, etc.
