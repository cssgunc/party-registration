#!/usr/bin/env bash
# Local development setup script — Mac and Windows (Git Bash)
# Run from anywhere; it resolves paths relative to the repo root.
set -e

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[ OK ]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERR ]${NC} $1"; }
step()    { echo -e "\n${BOLD}━━━ $1 ━━━${NC}"; }

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

# ── Detect OS ─────────────────────────────────────────────────────────────────
OS="unknown"
if [[ "$OSTYPE" == "darwin"* ]]; then
  OS="mac"
elif [[ "$OSTYPE" == "msys"* ]] || [[ "$OSTYPE" == "mingw"* ]] || [[ "$OSTYPE" == "cygwin"* ]]; then
  OS="windows"
fi

echo -e "${BOLD}Party Registration — Local Setup${NC}"
info "Repo root : $REPO_ROOT"
info "OS        : $OS"

# ══════════════════════════════════════════════════════════════════════════════
step "1/7  Python 3.12"
# ══════════════════════════════════════════════════════════════════════════════

PYTHON=""
for cmd in python3.12 python3 python; do
  if command -v "$cmd" &>/dev/null; then
    ver=$("$cmd" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null || true)
    if [[ "$ver" == "3.12" ]]; then
      PYTHON="$cmd"
      break
    fi
  fi
done

if [[ -z "$PYTHON" ]]; then
  error "Python 3.12 not found."
  if [[ "$OS" == "mac" ]]; then
    error "  Install via Homebrew:  brew install python@3.12"
    error "  Or download from:      https://www.python.org/downloads/"
  else
    error "  Download from: https://www.python.org/downloads/"
    error "  During install, check 'Add Python to PATH'."
  fi
  exit 1
fi
success "Found Python 3.12: $(command -v "$PYTHON")"

# ══════════════════════════════════════════════════════════════════════════════
step "2/7  Virtual environment + Python packages"
# ══════════════════════════════════════════════════════════════════════════════

VENV_DIR="$REPO_ROOT/.venv"

if [[ -d "$VENV_DIR" ]]; then
  warn ".venv already exists — skipping creation."
else
  "$PYTHON" -m venv "$VENV_DIR"
  success "Created .venv"
fi

if [[ "$OS" == "windows" ]]; then
  VENV_ACTIVATE="$VENV_DIR/Scripts/activate"
else
  VENV_ACTIVATE="$VENV_DIR/bin/activate"
fi

# shellcheck source=/dev/null
source "$VENV_ACTIVATE"
success "Activated .venv  ($(python --version))"

info "Installing packages: pip install -e '.[dev]' && pip install -e backend ..."
cd "$REPO_ROOT"
pip install -e ".[dev]" -q
pip install -e backend -q
success "Python packages installed"

# ══════════════════════════════════════════════════════════════════════════════
step "3/7  ODBC Driver 18 for SQL Server"
# ══════════════════════════════════════════════════════════════════════════════

ODBC_FOUND=false
if [[ "$OS" == "mac" ]]; then
  if odbcinst -q -d 2>/dev/null | grep -q "ODBC Driver 18 for SQL Server"; then
    ODBC_FOUND=true
  elif [[ -f "/usr/local/lib/libmsodbcsql.18.dylib" ]] || \
       [[ -f "/opt/homebrew/lib/libmsodbcsql.18.dylib" ]]; then
    ODBC_FOUND=true
  fi
elif [[ "$OS" == "windows" ]]; then
  if reg query "HKLM\\SOFTWARE\\ODBC\\ODBCINST.INI\\ODBC Driver 18 for SQL Server" \
      &>/dev/null 2>&1; then
    ODBC_FOUND=true
  fi
fi

if [[ "$ODBC_FOUND" == "false" ]]; then
  error "ODBC Driver 18 for SQL Server not found."
  if [[ "$OS" == "mac" ]]; then
    error "  Install via Homebrew:"
    error "    brew tap microsoft/mssql-release && brew install msodbcsql18"
    error "  Docs: https://learn.microsoft.com/en-us/sql/connect/odbc/linux-mac/install-microsoft-odbc-driver-sql-server-macos"
  else
    error "  Download: https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server"
  fi
  exit 1
fi
success "ODBC Driver 18 for SQL Server found"

# ══════════════════════════════════════════════════════════════════════════════
step "4/7  backend/.env"
# ══════════════════════════════════════════════════════════════════════════════

ENV_FILE="$REPO_ROOT/backend/.env"
TEMPLATE_FILE="$REPO_ROOT/backend/.env.template"

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$TEMPLATE_FILE" "$ENV_FILE"
  success "Copied .env.template → backend/.env"
fi

# Ensure MSSQL_HOST=localhost (not db, which is only valid inside the devcontainer)
if grep -q "^MSSQL_HOST=db$" "$ENV_FILE"; then
  if [[ "$OS" == "mac" ]]; then
    sed -i '' 's/^MSSQL_HOST=db$/MSSQL_HOST=localhost/' "$ENV_FILE"
  else
    sed -i 's/^MSSQL_HOST=db$/MSSQL_HOST=localhost/' "$ENV_FILE"
  fi
  success "Set MSSQL_HOST=localhost in backend/.env"
elif grep -q "^MSSQL_HOST=" "$ENV_FILE"; then
  current_host=$(grep "^MSSQL_HOST=" "$ENV_FILE" | cut -d= -f2)
  if [[ "$current_host" == "localhost" ]]; then
    success "MSSQL_HOST already set to localhost"
  else
    warn "MSSQL_HOST is set to '$current_host' — expected 'localhost' for local dev."
  fi
else
  warn "MSSQL_HOST not found in backend/.env — adding MSSQL_HOST=localhost"
  echo "MSSQL_HOST=localhost" >> "$ENV_FILE"
fi

info "Verify that the MSSQL_* vars in backend/.env match backend/.env.template"
info "(except MSSQL_HOST which should be 'localhost')"

# ══════════════════════════════════════════════════════════════════════════════
step "5/7  Start database container + reset dev DB"
# ══════════════════════════════════════════════════════════════════════════════

if ! command -v docker &>/dev/null; then
  error "Docker not found. Please install Docker Desktop:"
  if [[ "$OS" == "mac" ]]; then
    error "  https://docs.docker.com/desktop/install/mac-install/"
  else
    error "  https://docs.docker.com/desktop/install/windows-install/"
  fi
  exit 1
fi

if ! docker info &>/dev/null 2>&1; then
  error "Docker daemon is not running. Start Docker Desktop, then re-run this script."
  exit 1
fi
success "Docker is running"

# Prefer the v2 plugin syntax
if docker compose version &>/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose &>/dev/null; then
  DC="docker-compose"
else
  error "'docker compose' not found. Please update Docker Desktop."
  exit 1
fi

info "Starting db service  ($DC up -d db) ..."
cd "$REPO_ROOT/.devcontainer"
$DC up -d db
cd "$REPO_ROOT"
success "Database container started"

# Wait for SQL Server to accept connections (can take ~30 s)
info "Waiting for SQL Server to be ready (up to 90 s) ..."
MAX_WAIT=90
WAITED=0
DB_CONTAINER=$(cd "$REPO_ROOT/.devcontainer" && $DC ps -q db 2>/dev/null | head -1)

if [[ -z "$DB_CONTAINER" ]]; then
  error "Could not find the db container. Check: cd .devcontainer && $DC ps"
  exit 1
fi

while ! docker exec "$DB_CONTAINER" \
    /opt/mssql-tools18/bin/sqlcmd \
      -S localhost -U sa -P "YourStrong!Passw0rd" -Q "SELECT 1" -C \
    &>/dev/null 2>&1; do
  sleep 2
  WAITED=$((WAITED + 2))
  echo -n "."
  if [[ $WAITED -ge $MAX_WAIT ]]; then
    echo ""
    error "SQL Server did not become ready in ${MAX_WAIT}s."
    error "  Check logs: docker logs $DB_CONTAINER"
    error "  If you see a connection timeout, verify the MSSQL_* vars in backend/.env."
    exit 1
  fi
done
echo ""
success "SQL Server is ready!"

info "Running python -m script.reset_dev ..."
cd "$REPO_ROOT/backend"
python -m script.reset_dev
cd "$REPO_ROOT"
success "Dev database reset"

# ══════════════════════════════════════════════════════════════════════════════
step "6/7  pre-commit hooks"
# ══════════════════════════════════════════════════════════════════════════════

# pre-commit is installed as part of .[dev], but check just in case
if ! command -v pre-commit &>/dev/null; then
  info "pre-commit not on PATH — installing into venv ..."
  pip install pre-commit -q
fi

cd "$REPO_ROOT"
pre-commit install
pre-commit install-hooks
success "pre-commit hooks installed"

# ══════════════════════════════════════════════════════════════════════════════
step "7/7  .vscode/settings.json + extensions"
# ══════════════════════════════════════════════════════════════════════════════

VSCODE_DIR="$REPO_ROOT/.vscode"
SETTINGS_FILE="$VSCODE_DIR/settings.json"
mkdir -p "$VSCODE_DIR"

if [[ -f "$SETTINGS_FILE" ]]; then
  warn ".vscode/settings.json already exists — skipping."
else
  python - "$REPO_ROOT/.devcontainer/devcontainer.json" "$SETTINGS_FILE" <<'PYEOF'
import json
import re
import sys

devcontainer_path, settings_path = sys.argv[1], sys.argv[2]

with open(devcontainer_path) as f:
    content = f.read()

# Strip single-line JSONC comments so the file is valid JSON
content = re.sub(r'//[^\n]*', '', content)

try:
    data = json.loads(content)
except json.JSONDecodeError as e:
    print(f"ERROR: Could not parse devcontainer.json: {e}", file=sys.stderr)
    sys.exit(1)

settings = data["customizations"]["vscode"]["settings"]

with open(settings_path, "w") as f:
    json.dump(settings, f, indent=2)
    f.write("\n")

print(f"Written to {settings_path}")
PYEOF
  success ".vscode/settings.json created from devcontainer.json"
fi

# Read extensions from devcontainer.json
DEVCONTAINER_JSON="$REPO_ROOT/.devcontainer/devcontainer.json"
EXTENSIONS=()
while IFS= read -r ext; do
  EXTENSIONS+=("$ext")
done < <(python - "$DEVCONTAINER_JSON" <<'PYEOF'
import json, re, sys
with open(sys.argv[1]) as f:
    content = re.sub(r'//[^\n]*', '', f.read())
for ext in json.loads(content)["customizations"]["vscode"]["extensions"]:
    print(ext)
PYEOF
)

if command -v code &>/dev/null; then
  info "Installing VSCode extensions (from devcontainer.json) ..."
  INSTALLED_EXTS=$(code --list-extensions 2>/dev/null | tr '[:upper:]' '[:lower:]')
  for ext in "${EXTENSIONS[@]}"; do
    if echo "$INSTALLED_EXTS" | grep -qx "$ext"; then
      echo "  - $ext (already installed)"
    elif code --install-extension "$ext" &>/dev/null 2>&1; then
      echo "  ✓ $ext"
    else
      warn "  Could not install $ext — install it manually in VSCode."
    fi
  done
  success "VSCode extensions done"
else
  warn "'code' CLI not found. Install the following extensions manually in VSCode:"
  for ext in "${EXTENSIONS[@]}"; do
    warn "  • $ext"
  done
  warn "Tip (Mac): open VSCode → Cmd+Shift+P → 'Shell Command: Install code in PATH'"
fi

# ══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}${BOLD}All done! Local setup complete.${NC}"
echo ""
echo "Reminder:"
if [[ "$OS" == "windows" ]]; then
  echo "  • Activate the venv each time:  source .venv/Scripts/activate"
else
  echo "  • Activate the venv each time:  source .venv/bin/activate"
fi
echo "  • In VSCode, select the .venv interpreter:"
echo "      Ctrl+Shift+P → 'Python: Select Interpreter' → choose .venv"
echo "  • DB container is running. Stop it with:"
echo "      cd .devcontainer && $DC stop db"
