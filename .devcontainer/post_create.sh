#!/bin/bash
set -e

# Expected to run from .devcontainer/

echo "=============== Installing pre-commit hooks ==============="
cd ..
pre-commit install

echo ""
echo "=============== Installing frontend dependencies ==============="
cd ./frontend
npm i --verbose

echo ""
echo "=============== Setting up the database ==============="
cd ../backend
python -m script.create_db
python -m script.create_test_db
python -m script.reset_dev
