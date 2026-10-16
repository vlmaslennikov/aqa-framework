# VDR QA v0.11 — consolidated Ubuntu/Make/Playwright fixes

This is a complete, corrected snapshot of v0.10. Use the smaller overlay ZIP to update an existing v0.10 working directory, preserving your private `.env` files and PostgreSQL data.

## Apply the overlay to an existing v0.10

Unpack the overlay directly into the **root containing `Makefile`, `scripts/` and `vdr-qa-starter/`**:

```bash
cd ~/Desktop/CODEX_APPS_1/vdr-qa-framework-v0.10-docker-make
unzip -o /path/to/vdr-qa-v0.11-fixes-overlay.zip
```

No `.env` files, database volumes, test credentials, performance results or `node_modules` are included in the overlay. The corrected `.env.example` is a **template**, not your existing `.env`.

## First start or verification

```bash
make node-version      # v22.16.0; no broken nvm default alias
make test-framework    # 57 unit/regression tests, including read-only mock discovery
make browser-path      # prints auto-discovered CHROME_PATH and CHROMIUM_EXECUTABLE_PATH
make test-ui           # auto-discovers room/folder/PDF when IDs are absent, then runs 5 tests
```

If matching Playwright Chromium/FFmpeg is not installed:

```bash
make playwright-install
make browser-path
```

If dependencies are missing (new full archive):

```bash
make setup
make env-ui
```

Fill only `vdr-qa-starter/.env` with `OWNER_EMAIL` and `OWNER_PASSWORD` from your authorized test account. The browser path is **not** a required setting. The `make setup` target installs Node 22.16.0, API/Web/QA npm dependencies, Cypress 16.2.0, Playwright Chromium, Playwright FFmpeg and pulls the Docker k6 image.

If resource IDs are not selected yet, `make test-ui` attempts **read-only** discovery against the approved API. When a PDF/folder/room cannot be selected uniquely it stops with a specific message instead of reporting five skipped tests as success. You may also run:

```bash
make qa-discover
make qa-baseline
make qa-diff
```

Discovery performs login plus GET requests and does not change documents. It may fail on ambiguous data; in that case configure `QA_ROOM_ID`, `QA_FILE_NAME` or `QA_FOLDER_NAME` in `vdr-qa-starter/.env` rather than mutating the public demo.

## Corrections consolidated

- Node 22.16.0 pinned via `.nvmrc`, `nvm.sh --no-use`, no re-download when installed.
- Full `make setup` installs Playwright Chromium and FFmpeg; both browser env vars automatically derive from `@playwright/test` in Make commands (stale paths ignored).
- `make test-ui` and `make test-api` force `RUN_MUTATION_TESTS=0` even if exported in the shell; Playwright also ignores `*.mutation.spec.ts` at file-discovery time unless explicitly enabled; Storage E2E remains guarded and is not part of `test-ui`.
- Compatible `qa-inventory.mjs` module path; Make `qa-discover/baseline/diff` use Node 22.16.0.
- `.env.example` replaced with an actual dotenv template. Existing `.env` is untouched.
- `make test-ui` preflight detects missing credentials, tries read-only resource discovery, then either runs all five UI tests or **fails explicitly**.
- Isolated Lighthouse unit test uses `LHCI_CHROME_NO_SANDBOX=0` rather than relying on machine environment; sandbox is not disabled automatically.
- Cypress `component-index.html` and `indexHtmlFile` config present; Vite config includes `fileURLToPath` import.
- k6 Docker/DB guard, Jest integration/PDF lifecycle, Playwright API, Lighthouse and Cypress suites retained from v0.10.

## Verification scope

`make test-framework` / the unit suite has been run in the build environment: **57/57 PASS**. Also verified Bash syntax, Makefile dry runs, real nvm Node 22.16.0 activation, a mock Playwright Chromium-path detection overriding stale env vars, and read-only discovery via a local mock API. Actual UI/Cypress, Docker k6, and PostgreSQL integration suites still require your configured Ubuntu test stack; they are **not** claimed as run in this build environment.
