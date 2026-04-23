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

echo "Waiting for MySQL..."
MAX_WAIT_SECONDS=120
WAITED_SECONDS=0
until python -c "
import pymysql, sys
try:
    pymysql.connect(host='db', user='root', password='securepassword')
    sys.exit(0)
except Exception as e:
    print(f'Error connecting to MySQL: {e}')
    sys.exit(1)
" 2>/dev/null; do
  echo "  still waiting..."
  sleep 2
  WAITED_SECONDS=$((WAITED_SECONDS + 2))
  if [ "$WAITED_SECONDS" -ge "$MAX_WAIT_SECONDS" ]; then
    echo "Error: Timed out after ${MAX_WAIT_SECONDS}s waiting for MySQL at host 'db'."
    exit 1
  fi
done
echo "MySQL is ready."

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
