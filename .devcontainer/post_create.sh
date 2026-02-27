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

# SQL Server takes ~30s to start; wait before running db scripts
echo "Waiting for SQL Server to be ready..."
until sqlcmd -S db -U sa -P "YourStrong!Passw0rd" -Q "SELECT 1" -C &>/dev/null; do
  sleep 2
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
