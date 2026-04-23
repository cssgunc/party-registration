# Deployment Guide

This guide covers two deployment paths:
- **Manual** — for first-time setup or ad-hoc deploys directly from a machine with Docker.
- **GitLab CI** — for automated deploys triggered by the pipeline.

Both paths use the same Docker images and compose file. The only difference is how environment variables and secrets reach the server.

---

## Prerequisites

- Docker Engine + Docker Compose installed on the host
- Ports `3000` and `8000` open on the host
- Access to a MySQL server with a provisioned database and login
- SAML SP registered with the UNC IdP (see below)

---

## One-Time Setup

These steps are done once, before the first deploy, regardless of which deployment path you use.

### 1. Generate SAML Service Provider certs

```bash
mkdir -p deploy/certs
openssl req -x509 -newkey rsa:2048 \
  -keyout deploy/certs/key.pem \
  -out deploy/certs/cert.pem \
  -days 3650 -nodes
```

Give `deploy/certs/cert.pem` to the UNC IdP administrator to register this app
as a Service Provider. **Never regenerate these certs** unless you re-register
with the IdP — doing so will break SSO for all users.

### 2. Obtain a Google Maps API key and Map ID

The app uses Google Maps for the embedded party map and address autocomplete.

**API key:**
1. Go to [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Credentials**
2. Create a new API key
3. Under **API restrictions**, restrict it to: **Maps JavaScript API** and **Places API**
4. Under **Website restrictions**, restrict it to `https://partysmart.unc.edu`
5. Copy the key — this is `GOOGLE_MAPS_API_KEY` (backend) and `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (frontend)

**Map ID:**
1. In the Cloud Console go to **Google Maps Platform → Map Management**
2. Click **Create Map ID**, select **JavaScript** and **Vector** map type
3. Copy the Map ID — this is `NEXT_PUBLIC_GOOGLE_MAP_ID`

### 3. Provision the database schema

No manual SQL required. On first startup, the backend automatically runs
`alembic upgrade head`, which creates all tables from the migration history.

The database user must have DDL privileges for this to succeed:
```sql
GRANT CREATE, ALTER, DROP, INSERT, UPDATE, DELETE, SELECT ON ocsl.* TO 'user'@'%';
```
Confirm the provisioned login has these rights before running the containers for the first time.

---

## Manual Deploy

### 1. Configure environment variables

```bash
cp deploy/.env.prod.template deploy/.env.prod
```

Fill in every required value in `deploy/.env.prod`. Optional vars are commented
out — see `backend/src/core/config.py` and `frontend/src/lib/config/env.client.ts`
for their defaults.

Generate secrets with:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```
Run this separately for `JWT_SECRET_KEY`, `REFRESH_TOKEN_SECRET_KEY`,
`INTERNAL_API_SECRET`, and `NEXTAUTH_SECRET`.

### 2. Place SAML certs

Ensure `deploy/certs/cert.pem` and `deploy/certs/key.pem` are present on the
host (generated in the one-time setup above).

### 3. Run

From the project root:

```bash
docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml up -d --build
```

---

## GitLab CI Deploy

In a pipeline, secrets come from GitLab CI/CD variables instead of a `.env.prod`
file. The deploy job generates `.env.prod` and writes the SAML certs to the
server before running compose.

### 1. Configure GitLab CI/CD variables

In **Settings → CI/CD → Variables**, add a variable for every entry in
`deploy/.env.prod.template`. Mark secrets (keys, passwords, tokens) as
**Masked** and **Protected**.

Also add the following for the deploy job itself:

| Variable | Description |
|---|---|
| `SSH_PRIVATE_KEY` | Private key for SSH access to the deploy server |
| `DEPLOY_HOST` | Hostname or IP of the deploy server |
| `DEPLOY_USER` | SSH user on the deploy server |
| `SAML_SP_CERT` | Contents of `deploy/certs/cert.pem` |
| `SAML_SP_KEY` | Contents of `deploy/certs/key.pem` |

### 2. Example deploy job

Add a deploy job to your `.gitlab-ci.yml`. The job writes the env file and
certs to the server, then runs compose:

```yaml
deploy:
  stage: deploy
  only:
    - main
  before_script:
    - apt-get install -y openssh-client
    - eval $(ssh-agent -s)
    - echo "$SSH_PRIVATE_KEY" | ssh-add -
    - mkdir -p ~/.ssh && chmod 700 ~/.ssh
    - ssh-keyscan "$DEPLOY_HOST" >> ~/.ssh/known_hosts
  script:
    # Generate .env.prod from GitLab variables
    - |
      cat > deploy/.env.prod << EOF
      MYSQL_HOST=$MYSQL_HOST
      MYSQL_USER=$MYSQL_USER
      MYSQL_PASSWORD=$MYSQL_PASSWORD
      NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
      API_BASE_URL=$API_BASE_URL
      NEXTAUTH_URL=$NEXTAUTH_URL
      FRONTEND_BASE_URL=$FRONTEND_BASE_URL
      JWT_SECRET_KEY=$JWT_SECRET_KEY
      REFRESH_TOKEN_SECRET_KEY=$REFRESH_TOKEN_SECRET_KEY
      INTERNAL_API_SECRET=$INTERNAL_API_SECRET
      NEXTAUTH_SECRET=$NEXTAUTH_SECRET
      SAML_SP_ENTITY_ID=$SAML_SP_ENTITY_ID
      SAML_ASSERT_ENDPOINT=$SAML_ASSERT_ENDPOINT
      SAML_IDP_SSO_LOGIN_URL=$SAML_IDP_SSO_LOGIN_URL
      SAML_IDP_SSO_LOGOUT_URL=$SAML_IDP_SSO_LOGOUT_URL
      SAML_IDP_CERT=$SAML_IDP_CERT
      SAML_ALLOW_UNENCRYPTED_ASSERTION=$SAML_ALLOW_UNENCRYPTED_ASSERTION
      SMTP_HOST=$SMTP_HOST
      SMTP_PORT=$SMTP_PORT
      SMTP_TLS=$SMTP_TLS
      GOOGLE_MAPS_API_KEY=$GOOGLE_MAPS_API_KEY
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      NEXT_PUBLIC_GOOGLE_MAP_ID=$NEXT_PUBLIC_GOOGLE_MAP_ID
      EOF

    # Write SAML certs
    - mkdir -p deploy/certs
    - echo "$SAML_SP_CERT" > deploy/certs/cert.pem
    - echo "$SAML_SP_KEY" > deploy/certs/key.pem

    # Copy files to server
    - scp deploy/.env.prod "$DEPLOY_USER@$DEPLOY_HOST:~/app/deploy/.env.prod"
    - scp deploy/certs/cert.pem deploy/certs/key.pem "$DEPLOY_USER@$DEPLOY_HOST:~/app/deploy/certs/"

    # Pull latest code and redeploy
    - ssh "$DEPLOY_USER@$DEPLOY_HOST" "cd ~/app && git pull && docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml up -d --build"
```

> The `cat > .env.prod << EOF` block should include any optional vars you've
> set (e.g. `SMTP_USER`, `NEXT_PUBLIC_CHPD_EMAIL_DOMAIN`). Omit lines for vars
> you haven't configured — the app will use its built-in defaults.

---

## Deploy Checklist

### First deploy
- [ ] SP certs generated and `cert.pem` given to UNC IdP admin
- [ ] Google Maps API key created with Maps JavaScript API and Places API enabled
- [ ] Google Maps Map ID created and configured in Cloud Console
- [ ] All required CI/CD variables set in GitLab (or `.env.prod` filled in for manual deploy)
- [ ] UNC IT confirmed the database login has DDL privileges (CREATE/ALTER/DROP TABLE)
- [ ] Deploy run and containers started
- [ ] App reachable at `https://<your-domain>`
- [ ] SSO login works end-to-end
- [ ] Police signup email arrives via SMTP

### Subsequent deploys
- [ ] Deploy run and containers rebuilt
- [ ] Check logs for migration errors: `docker compose ... logs backend`
- [ ] App reachable and login works

---

## Operational Notes

### Environment variable categories

The frontend has two categories of env vars with different behaviors:

- **Build-time** (`NEXT_PUBLIC_*`) — baked into the JavaScript code when the Docker image is built. Changing them requires a full image rebuild (`--build`). Restarting the container alone has no effect.
- **Runtime** (everything else) — read when the container starts. Changing them only requires a restart.

### Two backend URL vars

`NEXT_PUBLIC_API_BASE_URL` and `API_BASE_URL` both point to the backend API but serve different callers:

- `NEXT_PUBLIC_API_BASE_URL` — used by the **browser**. Must be a URL the end user's browser can reach (e.g. `https://partysmart.unc.edu/api`).
- `API_BASE_URL` — used by the **Next.js server container** for internal calls (SAML token exchange, session refresh). Set to `http://backend:8000/api` to use Docker's internal DNS. In a typical production setup both values are the same public domain — only set them differently if internal network routing requires it.

### Database migrations

The backend runs `alembic upgrade head` automatically on every container start before serving traffic. If migrations fail the container exits immediately — check backend logs before investigating anything else. The database login needs `CREATE TABLE / ALTER TABLE / DROP TABLE` privileges for the first startup (subsequent deploys only run incremental migrations).

### SAML certs

SP certs are generated once and must never be regenerated unless you re-register with the UNC IdP. Regenerating them without re-registering breaks SSO for all users until the new cert is accepted by the IdP administrator.

### Rotating `NEXTAUTH_SECRET`

Changing this value immediately invalidates all active user sessions — every logged-in user is signed out. Only rotate if required for security reasons.

### Build time

The frontend image takes approximately 2 minutes to build due to Next.js compilation. The backend builds faster. Allow ~5 minutes total for a fresh `--build` deploy.

### Ports and TLS

Ports `3000` (frontend) and `8000` (backend) are exposed directly on the host. There is no built-in reverse proxy or TLS termination — place a reverse proxy (nginx, Caddy, etc.) in front of port `3000` if HTTPS is required. Port `8000` should not be publicly exposed; it is only needed by the frontend container internally.

---

## Useful Commands

Run these on the server, from the project root (manual deploys), or via SSH in a CI job.

```bash
# View live logs
docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml logs -f

# View logs for one service
docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml logs -f backend
docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml logs -f frontend

# Restart without rebuilding
docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml restart

# Stop everything
docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml down

# Rebuild and redeploy
docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml up -d --build
```
