#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

# Ensure pre-commit cache directory has correct permissions
sudo chown -R vscode:vscode /home/vscode/.cache/pre-commit 2>/dev/null || true

echo "================== Installing pre-commit hooks ================="
cd "$REPO_ROOT"
pre-commit install
pre-commit install-hooks

echo ""
echo "==================== Setting up the database ==================="
cd "$REPO_ROOT/backend"

# Resolve sqlcmd robustly (login shells may not preserve /opt/mssql-tools18/bin in PATH)
SQLCMD_BIN="$(command -v sqlcmd || true)"
if [ -z "$SQLCMD_BIN" ]; then
  for candidate in /opt/mssql-tools18/bin/sqlcmd /opt/mssql-tools/bin/sqlcmd; do
    if [ -x "$candidate" ]; then
      SQLCMD_BIN="$candidate"
      break
    fi
  done
fi

if [ -z "$SQLCMD_BIN" ]; then
  echo "Error: sqlcmd not found. Expected it in PATH or under /opt/mssql-tools*/bin."
  exit 1
fi

# SQL Server takes ~30s to start; wait before running db scripts
echo "Waiting for SQL Server to be ready... ('Killed' messages are expected)"
MAX_WAIT_SECONDS=120
WAITED_SECONDS=0
until timeout --kill-after=3 3 "$SQLCMD_BIN" -S db -U sa -P "YourStrong!Passw0rd" -Q "SELECT 1" -C &>/dev/null; do
  sleep 2
  WAITED_SECONDS=$((WAITED_SECONDS + 2))
  if [ "$WAITED_SECONDS" -ge "$MAX_WAIT_SECONDS" ]; then
    echo "Error: Timed out after ${MAX_WAIT_SECONDS}s waiting for SQL Server at host 'db'."
    exit 1
  fi
done
echo "SQL Server is ready!"

python -m script.create_db
python -m script.create_test_db
python -m script.reset_dev

echo ""
echo "================= Generating frontend SAML certs ==============="
cd "$REPO_ROOT/frontend"
mkdir -p certs
if [ ! -f certs/key.pem ] || [ ! -f certs/cert.pem ]; then
  openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -nodes -days 900 -subj "/CN=localhost"
  echo "Frontend SAML SP certificates generated in frontend/certs/."
else
  echo "Frontend SAML SP certificates already exist; skipping generation."
fi
