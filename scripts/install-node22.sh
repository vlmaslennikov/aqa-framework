#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(<"$ROOT/.nvmrc")"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
  echo "[node] nvm missing at $NVM_DIR/nvm.sh. Install nvm manually before running make node-install." >&2
  exit 2
fi
# shellcheck source=/dev/null
source "$NVM_DIR/nvm.sh" --no-use
# Do not contact nodejs.org when the exact version is already installed.
if [[ "$(nvm version "$VERSION")" != "v$VERSION" ]]; then
  echo "[node] Installing Node.js $VERSION via nvm..."
  nvm install "$VERSION"
else
  echo "[node] Node.js $VERSION already installed; skipping download."
fi
nvm use --silent "$VERSION"
echo "[node] Active in this subprocess: $(node --version), npm $(npm --version)"
echo "[node] To select it in your interactive shell: cd '$ROOT' && nvm use"
