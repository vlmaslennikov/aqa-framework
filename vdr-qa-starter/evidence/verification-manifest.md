# Local verification manifest — 2026-10-15

- Executed: `npm run test:framework` — **7 PASS, 0 FAIL** (source output in `harness-unit-2026-10-15.log`).
- Executed: `node --check` for guard + scanrepo scripts — no syntax errors.
- Executed: TypeScript syntactic transpilation check over tests/src/config — this **is not TypeScript typechecking**.
- Executed: `npm run test:mutation` without opt-in — blocked with exit status 2 by design.
- Attempted: `npm install --offline --ignore-scripts` — unavailable (`ENOTCACHED` for `@playwright/test`). No new Playwright API/browser run was made.
- The 42 Jest tests, 24.5/100 ScanRepo result and API sharing/revoke results were reported by earlier assistant; their raw artifacts/commit hashes are not contained in this package.

## Follow-up: supplied Chromium archive (same day)

- Inspected and unpacked `/mnt/data/2_playwright-chromium-linux.tar.gz`: 619 members, no unsafe paths or links; no missing shared libraries identified.
- Executed Google Chrome for Testing `153.0.8010.12` CLI headless — **PASS**.
- Executed Python Playwright with explicit supplied Chromium path — **PASS** (DOM assertions, JS click, screenshot).
- Executed browser loopback HTTP request with local test server — **PASS, HTTP 200**.
- Executed `npm run test:framework` again — **7 PASS, 0 FAIL**.
- Attempted `npm install` from registry — failed DNS `EAI_AGAIN`; Node `@playwright/test` remains uninstalled.
- Attempted Python Playwright `page.goto` to the deployed web URL — timed out; **BLOCKED**, not evidence of a product defect.
- Browser machine evidence: `chromium-diagnostic-2026-10-15.json`, `chromium-playwright-local-smoke-2026-10-15.png`.
