# Chromium supplied archive: validation evidence (2026-10-15)

## Artifact

- Input file: `2_playwright-chromium-linux.tar.gz` (279 MB on disk).
- Archive member count: 619; no absolute / parent traversal paths; no hard/symbolic links.
- Browser: Chrome for Testing 153.0.8010.12, bundle directory `chromium-1243`.
- Extracted main executable: `pw-browsers/chromium-1243/chrome-linux64/chrome`.
- `ldd chrome`: no missing libraries reported.

## Verified in this container

1. `chrome --version` — PASS.
2. Chromium CLI headless, navigate to data HTML, output DOM — PASS.
3. **Python Playwright** launch specified Chromium binary — PASS.
4. Browser DOM and JavaScript-click assertions — PASS.
5. Browser screenshot capture — PASS.
6. Browser fetches page from an ephemeral loopback HTTP server — **PASS, HTTP 200**.
7. Node QA harness unit tests — **7/7 PASS**.
8. External web UI navigation — **BLOCKED**, `Page.goto: Timeout 5000ms exceeded`.
9. `npm install` — **BLOCKED**, registry.npmjs.org DNS resolution `EAI_AGAIN`.
10. Node Playwright `@playwright/test` product suite — **NOT RUN** in this container (dependency unavailable).

The VDR is **not** demonstrated to pass E2E scenarios by these checks. The failed external navigation / npm install is environment reachability, not a confirmed VDR defect.

For raw browser results and screenshot see `evidence/chromium-diagnostic-2026-10-15.json` and `evidence/chromium-playwright-local-smoke-2026-10-15.png`.

## Reproducing with supplied archive (Linux)

```bash
# Work outside the repository for this ~700-MB decompressed browser tree.
mkdir -p "$HOME/vdr-pw-browser"
tar -xzf /path/to/2_playwright-chromium-linux.tar.gz -C "$HOME/vdr-pw-browser"
export CHROMIUM_EXECUTABLE_PATH="$HOME/vdr-pw-browser/pw-browsers/chromium-1243/chrome-linux64/chrome"
"$CHROMIUM_EXECUTABLE_PATH" --version

# Python alternative when npm is unavailable, verifies local browser only.
python3 -m pip install playwright
python3 scripts/check-chromium.py --executable "$CHROMIUM_EXECUTABLE_PATH"

# Optional reachability (read-only), exit 2 if live navigation is blocked:
python3 scripts/check-chromium.py --executable "$CHROMIUM_EXECUTABLE_PATH" \
  --url https://virtual-data-room-ten.vercel.app/

# Primary project test suite, once npm dependencies and the API are reachable.
npm install
npm run test:framework
npm run typecheck
npm run test:smoke
npm run test:report
```

The Python diagnostic is **only** a browser-environment smoke test. The TypeScript Playwright API/UI suite remains the actual product regression suite. The supplied Chromium executable may not match the installed Node Playwright revision; the explicit `CHROMIUM_EXECUTABLE_PATH` overrides Playwright's revision selection and must be regression tested. Prefer the package-managed browser on unrestricted CI.

**No destructive or user-creating tests should be run against the public demo.** For mutation tests use an explicitly approved disposable local/staging environment with the separate safety guard.
