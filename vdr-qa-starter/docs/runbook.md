# Local runbook — Ubuntu / Playwright / Chromium

Set up standalone QA project:

```bash
npm install
npx playwright install --with-deps chromium
cp .env.example .env
# Set OWNER_EMAIL/PASSWORD and VIEWER_EMAIL/PASSWORD from the product README or own QA fixture.
npm run test:framework
npm run typecheck
npm run test:api
npm run test:ui
npm run test:report
```

**Using a Chromium tarball:** the browser archive is not included in this package. Extract only if archive provenance is trusted; inspect via `tar -tzf /path/to/2_playwright-chromium-linux.tar.gz | head`; use your extracted Chrome/Chromium executable file with `CHROMIUM_EXECUTABLE_PATH=/absolute/path/to/chrome`. `chrome --version` proves only executable version detection, **not Playwright launch compatibility**. Prefer Playwright-managed browser matching the installed Playwright version. In the previous environment a local browser hit a sandbox-denied `socket()` syscall; this cannot be repaired by changing UI locators and is not a defect in the VDR.

**Mutation tests (NEVER on public demo):**

```bash
API_BASE_URL=http://127.0.0.1:3000 RUN_MUTATION_TESTS=1 QA_ENV_DISPOSABLE=1 \
VIEWER_EMAIL=qa-viewer@example.test VIEWER_PASSWORD='...' npm run test:mutation
```

Approved dedicated remote staging additionally requires `QA_ENV_ALLOW_REMOTE=1`; public Railway/Vercel domains are always blocked. Tests may create accounts which the application cannot remove. Reset database/storage after the run.

**ScanRepo:** `npm run security:repo`, optionally `SCANREPO_REPOSITORY=github.com/owner/repo`. Inspect `reports/scanrepo/metadata.json` and raw evidence. Internet and npm access required; the scanner checks a remote public snapshot, not the local working tree.

**Execution troubleshooting:** `npm run test:framework` requires only Node 20+ and no npm dependencies. Playwright tests need `@playwright/test`; if the environment has no npm network, they remain *unexecuted*, not PASS. Do not attach traces with passwords, JWTs or signed URLs to a public repository.

## Added 2026-10-15: supplied Chromium verified

See [`browser-validation-2026-10-15.md`](browser-validation-2026-10-15.md). This archive's browser successfully launched through Python Playwright, handled a click and screenshot, and navigated to a local HTTP server (HTTP 200). In this restricted container, navigation to the public demo timed out and npm registry DNS failed; **the remote UI tests were not executed**. Use `npm run browser:check -- --executable "$CHROMIUM_EXECUTABLE_PATH"` for a standalone environment diagnostic after installing Python Playwright.
