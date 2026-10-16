# Lighthouse QA delivery verification — 2026-10-15

## Verified here
- Public VDR source routes and JWT key (`dataroom_token`) were cross-checked via the public repository.
- New Node.js QA harness tests run under Node v22.16.0: see `evidence/lighthouse-validation.log`.
- Runner and config JavaScript syntax were checked with `node --check`.
- Route-integrity verification was exercised against synthetic Lighthouse reports including a deliberate redirect to `/login` and a successful corrected route.

## Not verified here
- Actual Lighthouse CI navigation runs against VDR: npm registry and VDR hostname unreachable from this isolated runtime; LHCI npm package not installed.
- Puppeteer authenticated launch against VDR, Vite preview + real backend, and Lighthouse user flow: must run in a network-enabled Ubuntu/CI environment.
- No new LCP/CLS/score values are claimed; thresholds are only proposed baselines.

## Requested evidence from user's local run
- `npm run lighthouse:public` exit code / sanitized console logs.
- `npm run lighthouse:auth` exit code / sanitized console logs if private backend + test user configured.
- `qa-summary.json` per mode, scores, browser version; redacted HTML only if useful.
- Any skipped routes or auth/CORS redirects.

## v0.4.1 runtime diagnosis

User-provided local log (2026-10-15) showed `No usable sandbox` in `lighthouse:public`, `:auth`, `:flow`. An empty LHCI manifest after those failures is a **no-run** status, not a product finding. Implemented explicit opt-in flags plus a headless Chromium preflight. Local isolated testing exercised the supplied archived Chromium and passed only with `LHCI_CHROME_NO_SANDBOX=1`. Full Lighthouse audits against VDR still require an accessible deployed/staging application and installed LHCI dependencies.
