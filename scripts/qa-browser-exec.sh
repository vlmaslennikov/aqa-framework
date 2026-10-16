#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
QA="$ROOT/vdr-qa-starter"
NODE="$ROOT/scripts/with-node22.sh"
if [[ $# -eq 0 ]]; then
  echo 'Usage: qa-browser-exec.sh <command> [args...]' >&2
  exit 2
fi
if [[ ! -f "$QA/node_modules/@playwright/test/package.json" ]]; then
  echo '[browser] Playwright dependencies missing. Run make deps-qa or make setup.' >&2
  exit 2
fi
# Determine the exact browser binary required by installed @playwright/test.
# Deliberately override stale hardcoded paths inherited from old shell/.env.browser.
CHROME="$(cd "$QA" && bash "$NODE" node -e '
const fs=require("node:fs");
const p=require("@playwright/test").chromium.executablePath();
if (!fs.existsSync(p)) {
  console.error("[browser] Matching Playwright Chromium missing: " + p);
  console.error("[browser] Run make playwright-install");
  process.exit(2);
}
process.stdout.write(p);
')" || exit $?
if [[ ! -x "$CHROME" ]]; then
  echo "[browser] Not executable: $CHROME. Run make playwright-install." >&2
  exit 2
fi
export CHROME_PATH="$CHROME"
export CHROMIUM_EXECUTABLE_PATH="$CHROME"
exec bash "$NODE" "$@"
