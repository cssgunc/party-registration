#!/bin/bash
set -e

# Expected to run from .devcontainer/

# Ensure pre-commit cache directory has correct permissions
sudo chown -R vscode:vscode /home/vscode/.cache/pre-commit 2>/dev/null || true

echo "================== Installing pre-commit hooks ================="
cd ..
pre-commit install
pre-commit install-hooks

echo ""
echo "==================== Setting up the database ==================="
cd backend

# SQL Server takes ~30s to start; wait before running db scripts
echo "Waiting for SQL Server to be ready..."
until sqlcmd -S db -U sa -P "YourStrong!Passw0rd" -Q "SELECT 1" -C &>/dev/null; do
  sleep 2
done
echo "SQL Server is ready!"

python -m script.create_db
python -m script.create_test_db
python -m script.reset_dev
