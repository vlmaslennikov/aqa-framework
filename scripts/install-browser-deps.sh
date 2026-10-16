#!/usr/bin/env bash
# Historical filename retained for overlays. This script only checks the host.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
missing=0
if ! command -v Xvfb >/dev/null 2>&1; then
  echo '[browser] Missing Xvfb (required by Cypress on Linux).' >&2
  missing=1
fi
cd "$ROOT/vdr-qa-starter"
if ! CHROME="$(node -e 'process.stdout.write(require("@playwright/test").chromium.executablePath())')"; then
  echo '[browser] Playwright npm dependencies unavailable. Run make deps-qa.' >&2
  exit 2
fi
if [[ ! -x "$CHROME" ]]; then
  echo '[browser] Playwright Chromium unavailable. Run make playwright-install.' >&2
  exit 2
fi
if ! command -v ldd >/dev/null 2>&1; then
  echo '[browser] ldd unavailable; cannot inspect Chromium libraries.' >&2
  exit 2
fi
libs="$(ldd "$CHROME")" || { echo '[browser] Cannot inspect Chromium libraries.' >&2; exit 2; }
if [[ "$libs" == *"not found"* ]]; then
  printf '%s\n' "$libs" >&2
  missing=1
fi
if [[ "$missing" == 1 ]]; then
  echo '[browser] Host dependencies missing. No system changes were made.' >&2
  exit 2
fi
echo '[browser] Xvfb and Chromium dynamic libraries found. No system changes were made.'
