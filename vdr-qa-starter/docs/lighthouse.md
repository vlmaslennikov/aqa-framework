# Lighthouse CI + VDR — execution guide (v0.4.1)

This is a **standalone QA overlay**. No live Work branch contents were supplied. The code here is intended for placement at `<vdr-repo>/qa/` after reviewing `MERGE.md`.

## Scope and decision

- Primary: Lighthouse CI v0.15.1, Chromium navigation audits for `/login`, `/register`, and signed-in `/`, `/shared-with-me`, and optional `/room/:id`.
- Optional: Lighthouse User Flow (snapshot dashboard → SPA transition → snapshot shared page).
- No automatic SEO gating: authenticated VDR is not a public marketing site.
- Unlighthouse is deferred: authenticated, dynamic IDs are not well served by blind URL discovery; explicit URL audit is more reproducible.
- This is *lab* Lighthouse testing, not production RUM/field INP, not k6 load testing, and not an accessibility certification.

## Safety / privacy

- All collection defaults to `http://127.0.0.1:4173`. Remote targets require explicit `LHCI_ALLOW_REMOTE=1` and the user's authorization.
- Audits are repeated three times per URL by default. Never run this against an unapproved target.
- Login uses disposable TEST account credentials from environment; no secrets in repo. `localStorage` key `dataroom_token` is used exclusively because code verification showed it in the VDR client.
- LHCI uploads **to filesystem** only, not temporary-public-storage.
- Keep `reports/` and `.lighthouseci/` private: raw artifacts may contain confidential URLs, contents, IDs and request metadata, and auth flow reports may include PII.
- The CI workflow runs **public pages only**, and is `workflow_dispatch` (manual) by default.

## Installing next to the VDR monorepo

Extract overlay to `qa/` inside your actual Work branch. Do NOT replace more recent QA changes without reviewing diffs. Monorepo must contain `apps/web` with Vite scripts and `apps/api` for authenticated audits. See `MERGE.md`.

One-time install on Ubuntu (Node 22.16+ is supported by the pinned Lighthouse 12.x):

```bash
cd /path/to/virtual-data-room
(cd apps/web && npm ci)                       # use npm install if repo has no lockfile
(cd qa && PUPPETEER_SKIP_DOWNLOAD=1 npm install) # QA overlay has no lockfile
```

Use your supplied Chromium — no second download required:

```bash
mkdir -p "$HOME/vdr-chromium"
tar -xzf /path/to/2_playwright-chromium-linux.tar.gz -C "$HOME/vdr-chromium"
find "$HOME/vdr-chromium" -type f -path '*/chrome-linux64/chrome' -print
export CHROME_PATH="$(find "$HOME/vdr-chromium" -type f -path '*/chrome-linux64/chrome' -print -quit)"
"$CHROME_PATH" --version
```

## Ubuntu Chromium sandbox troubleshooting (v0.4.1)

A previous local run showed `FATAL: No usable sandbox!` on Ubuntu, while `lhci healthcheck` still passed. **Healthcheck tests executable discovery, not an actual browser launch**; with that error LHCI's generated `manifest.json` is `[]` because zero pages were audited. This is a QA environment failure, not a VDR defect.

First run a real headless launch check (does not contact the VDR):

```bash
cd /path/to/qa
npm run lighthouse:browser-check
```

Preferred resolution: use Chromium with its Linux sandbox correctly configured under an isolated account (Ubuntu AppArmor restrictions or missing user namespaces may be involved). On a **disposable/isolated machine auditing only trusted or approved QA content**, opt in to Chromium without its sandbox:

```bash
export LHCI_CHROME_NO_SANDBOX=1
npm run lighthouse:browser-check
```

Or add `LHCI_CHROME_NO_SANDBOX=1` to your private `qa/.env`. **Disabling the sandbox removes a major layer of browser isolation.** Do not enable this globally; avoid arbitrary or untrusted sites and production credentials. This flag is *off by default*, and is applied consistently to LHCI's Chrome launcher, LHCI's Puppeteer login launcher, and the separate Lighthouse User Flow launcher.

After the browser check passes, retry:

```bash
LHCI_WEB_BASE_URL=https://virtual-data-room-ten.vercel.app LHCI_ALLOW_REMOTE=1 LHCI_RUNS=1 npm run lighthouse:public
# After one success, run with LHCI_RUNS=3 for a representative baseline.
```

On failure, `reports/lighthouse/public/qa-status.json` now contains the failed stage. Incomplete/empty `manifest.json` is not a successful report. The runner cleans stale `.lighthouseci` results before each new collection to avoid mistaking them for new results.

No npm reinstallation is needed to apply v0.4.1: only scripts/configuration/tests/docs changed.

## Option A: Local public-page audit (recommended first run)

```bash
cd /path/to/virtual-data-room
# API not needed for public pages when localStorage is clean. Build with correct API URL regardless.
cd apps/web
VITE_API_URL=http://127.0.0.1:3000 npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

In another terminal:

```bash
cd /path/to/virtual-data-room/qa
cp -n .env.example .env
npm run lighthouse:check
npm run lighthouse:public
```

`lighthouse:public` generates `.lighthouseci/lhr-*.json`, files in `reports/lighthouse/public/` and `qa-summary.json` which asserts that Lighthouse actually audited the requested route. Failure if reports are missing or redirected to `/login`.

## Option B: Authenticated dashboard and real room (requires running backend)

The Vite production build must be built with `VITE_API_URL` pointing at a **real reachable API**. Changing it after `npm run build` is too late.

In `qa/.env` set:

```ini
LHCI_WEB_BASE_URL=http://127.0.0.1:4173
OWNER_EMAIL=<test-user-email>
OWNER_PASSWORD=<test-user-password>
LHCI_ROOM_ID=<optional-uuid-of-your-own-test-room>
```

Then:

```bash
cd /path/to/virtual-data-room/qa
npm run lighthouse:auth
npm run lighthouse:flow
```

`lighthouse:auth` runs a browser login before every audited URL. It confirms that `dataroom_token` was created, the destination route stayed correct, and a signed-in header appeared. A second report verifier checks Lighthouse's *actual* final URL, not just the planned URL. Avoid running it against the public demo with production-like accounts.

If backend is on a different host, compile the frontend with its URL in `VITE_API_URL`, and ensure backend CORS allows `http://127.0.0.1:4173`.

## Option C: Approved remote/staging audit (no local VDR source required)

Use only if you own/are authorized to audit the target:

```bash
cd qa
LHCI_WEB_BASE_URL=https://staging.example.com LHCI_ALLOW_REMOTE=1 npm run lighthouse:public
LHCI_WEB_BASE_URL=https://staging.example.com LHCI_ALLOW_REMOTE=1 npm run lighthouse:auth
```

For the VDR public demo, automated repeated audits are deliberately opt-in. Do not provide public-share tokens via URL for audits: reports could include those tokens.

## Why Lighthouse CI rather than Unlighthouse

VDR is a React SPA with dynamic `/room/:id`, `/folder/:id`, `/share/:token` routes and auth requirements. LHCI's **explicit URL list** and auth preflight make audits reproducible and avoid accidentally collecting another user's shared link. Unlighthouse can be added separately later for a broad public-route inventory if needed.

## Initial performance budgets

`performance >= 0.80`, `accessibility >= 0.90`, `best-practices >= 0.85`, `LCP <= 2500 ms`, `CLS <= 0.10`: **warn-only engineering baselines**, not signed-off product SLOs and not hard CI gates. Review actual numbers after multiple stable runs before converting to `error`.

Lighthouse Navigation scores measure page load in a controlled browser; the optional Timespan measures interactions without navigation performance score/LCP. Field INP requires RUM (or representative interaction instrumentation), not ordinary LHCI navigation score.

## Troubleshooting

- `No .lighthouseci LHR`: Lighthouse failed before audit; inspect process output, Chrome installation and connectivity.
- `correctRoute=false`: likely redirected to `/login`, 404 or canonical route; investigate target/session, do not accept the score.
- `Could not verify session`: backend URL was not correctly compiled into Vite build, backend unavailable, wrong credentials, or CORS blocked.
- Chrome won't launch: check executable path, Linux dynamic libraries, `--version`. If in a restricted container, test on your Ubuntu system; don't force no-sandbox flags without understanding risks.
- `CHROME_PATH`: set to the `chrome` binary, **not** the folder.
- `npm install` cannot access registry: download/install dependency packages on your machine; the archive includes **source**, not `node_modules` or LHCI binaries.
- Local `test:framework`: `node --test tests/unit/*.test.mjs` tests runner/guards/verifier without VDR network.

## Capture for QA report

From `qa/`, after running:

```bash
mkdir -p results-to-share
cp reports/lighthouse/public/qa-summary.json results-to-share/  # for public runs only
# Keep full raw *.json and *.html private, redact before sharing.
```

Record test target, commit SHA, dataset, Chrome version, Node version, LHCI version, run timestamp, device/throttling, per-route median score, p95 only if measured from proper repeated benchmark (NOT from 3 runs), failures and limitations.

## Documentation verified against public source

- VDR `App.tsx`: https://github.com/evo9/virtual-data-room/blob/main/apps/web/src/App.tsx
- VDR JWT storage: https://github.com/evo9/virtual-data-room/blob/main/apps/web/src/lib/api.ts
- VDR auth API: https://github.com/evo9/virtual-data-room/blob/main/apps/web/src/features/auth/api.ts
- Lighthouse CI configuration: https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md
- Lighthouse User Flows: https://github.com/GoogleChrome/lighthouse/blob/main/docs/user-flows.md
