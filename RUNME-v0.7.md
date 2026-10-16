# Virtual Data Room — QA Framework v0.7

**Delivered:** original VDR application from the attached `virtual-data-room-main.zip`, additive NestJS/PostgreSQL integration suite, React Cypress CT, optional safe k6 scenario, and previously working QA Framework v0.6 (Playwright API/E2E + Lighthouse + inventory).

## Status and provenance

| Evidence | Status |
|---|---|
| Playwright API / UI (9/9 + 5/5) | **PASS according to user-supplied Ubuntu logs (v0.6)** |
| Lighthouse authenticated `/` and `/shared-with-me` | **6/6 completed according to user logs** |
| Lighthouse metrics | Median Performance 97 and 99, LCP ≈2.007 and 1.923 s, CLS 0 (from user-provided summary) |
| QA starter native tests | **32/32 PASS in this environment** |
| Isolated-PostgreSQL guard unit tests | **5/5 PASS in this environment** |
| NestJS/PostgreSQL integration suite | **Created; NOT EXECUTED** (local PostgreSQL + dependencies unavailable here) |
| Two known-defect regression cases | **Created; NOT EXECUTED** (intentionally expected red on archived code) |
| Cypress React Component Testing | **8 test cases created; NOT EXECUTED** (requires Cypress binary + frontend dependencies) |
| k6 localhost performance smoke | **Created; NOT EXECUTED** (requires k6 and locally running backend) |

### Folder layout

- `virtual-data-room-main/` — product source and additive test files.
- `virtual-data-room-main/qa/README.md` — full setup and safety notes.
- `virtual-data-room-main/apps/api/test/qa-core.int-spec.ts` — local NestJS + Prisma integration cases.
- `virtual-data-room-main/apps/api/test/qa-known-defects.int-spec.ts` — expected-red issues, isolated from green suite.
- `virtual-data-room-main/apps/web/cypress/component/` — eight real-component Cypress tests.
- `vdr-qa-starter/` — existing 0.6 QA test runner, corrected CommonJS Playwright config, Lighthouse, ScanRepo and inventory.

## Recommended local run order — Ubuntu

**0.** Unpack in a new directory (do not overwrite your existing working project).

**1. Previously proven API/E2E (no mutations):**

```bash
cd vdr-qa-starter
npm install
# configure OWNER_EMAIL, OWNER_PASSWORD, CHROMIUM_EXECUTABLE_PATH via .env/shell
npm run test:framework
npm run qa:discover
npm run test:api
npm run test:ui
cd ..
```

**2. Isolated backend integration (Docker required):**

```bash
cd virtual-data-room-main
docker compose -f qa/docker-compose.postgres.yml up -d
cd apps/api
npm ci
cp test/qa-env.example test/.env.test
set -a; source test/.env.test; set +a
node test/qa-db-guard.cjs
npx prisma generate
npx prisma migrate deploy
npm run test:qa:guard
npm run test:qa:integration
```

Do not replace the test database with your real one. Suite only creates test-specific records and cleans them up on normal completion. The run is **write-capable on the isolated local database**.

**3. Known issues (intentionally RED):**

```bash
npm run test:qa:known-defects
```

Expected failing assertions (until fixed in product): whitespace-only registration name, uploaded Storage size greater than 50MiB. These are hypotheses from source until reproduced at runtime; the second scenario uses a fake storage response.

**4. Cypress Component Tests:**

```bash
cd ../web
npm ci
npm install --save-dev cypress@^16
npx cypress run --component --browser chromium
```

If Cypress cannot discover Chromium, use:

```bash
npx cypress run --component --browser "$CHROMIUM_EXECUTABLE_PATH"
```

Cypress itself also requires downloading its executable and system libraries. Cypress installation updates your local frontend lockfile; the original lockfile in this archive remains unchanged.

**5. Optional k6 smoke (LOCAL ONLY):**

```bash
# Requires a locally running NestJS backend, not the public demo.
cd ../../../vdr-qa-starter
K6_BASE_URL=http://127.0.0.1:3000 k6 run performance/k6/local-readonly.js
```

## Send back these outputs

```
apps/api: npm run test:qa:integration
apps/api: npm run test:qa:known-defects
apps/web: npx cypress run --component --browser chromium
vdr-qa-starter: npm run test:api && npm run test:ui
```

Additionally send the failure log or redacted reports where tests fail. Do not include `.env`, JWTs, signed URLs, production credentials or unredacted document contents.

## Release-readiness

**Undetermined.** Read-only smoke and two-page Lighthouse audits are positive. Permission/scoping and upload validation require the new isolated integration suite plus broader end-to-end evidence. Do not claim a release gate solely on a green Lighthouse score or the 14 read-only Playwright tests.
