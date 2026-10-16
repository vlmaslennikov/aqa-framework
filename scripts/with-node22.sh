#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(<"$ROOT/.nvmrc")"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
  echo "[node] nvm missing at $NVM_DIR/nvm.sh. Install nvm first: https://github.com/nvm-sh/nvm" >&2
  exit 2
fi
# nvm.sh is needed in non-interactive make recipes (new shell for each target).
# shellcheck source=/dev/null
source "$NVM_DIR/nvm.sh" --no-use
if ! nvm use --silent "$VERSION" >/dev/null; then
  echo "[node] Node $VERSION not installed. Run 'make node-install' first." >&2
  exit 2
fi
exec "$@"
