#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FILE="$ROOT/virtual-data-room-main/apps/api/test/.env.test"
if [[ ! -f "$FILE" ]]; then
  echo "[qa] Missing $FILE. Run make env-qa, inspect the file and retry." >&2
  exit 2
fi
set -a
# shellcheck source=/dev/null
source "$FILE"
set +a
exec "$@"
