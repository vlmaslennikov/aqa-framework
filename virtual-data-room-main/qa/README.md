# QA integrations — archived VDR product source

This archive contains **the original VDR source plus additive QA tests**. It does not modify business logic. The existing [standalone QA starter](../../vdr-qa-starter/) is included alongside the product source in the delivery archive.

## Backend integration suite — LOCAL DATABASE ONLY

Prerequisites: Ubuntu with Node.js compatible with this repo, Docker + Docker Compose (or a manually configured local PostgreSQL 16 database named `vdr_qa_test`). No internet-facing database or VDR production API is used.

From `virtual-data-room-main/`:

```bash
docker compose -f qa/docker-compose.postgres.yml up -d
cd apps/api
npm ci
cp test/qa-env.example test/.env.test
# Review credentials and edit the file if needed. NEVER commit it.
set -a; source test/.env.test; set +a
node test/qa-db-guard.cjs
npx prisma generate
npx prisma migrate deploy
npm run test:qa:integration
```

The `.env.test` file is untracked; set its DATABASE_URL and DIRECT_URL to the exact same **local** PostgreSQL database. A guard rejects non-local hosts, databases other than `vdr_qa_test`, and missing explicit consent (`QA_INTEGRATION_ACK=I_OWN_THIS_LOCAL_DB`). Guards run both before Jest and inside the test setup.

The core suite creates **two isolated test users** plus folders/shares/test-only file metadata and cleans up by the IDs it created. It uses real HTTP controllers, Auth guard, Prisma and PostgreSQL; only Supabase Storage is simulated. No public-demo writes and no real file payloads. If interrupted, inspect QA users with `qa-...@example.test` before manual cleanup; do not delete unrelated accounts. Direct database connection is required; no PgBouncer/remote Supabase.

### Expected-red regressions (run separately)

```bash
npm run test:qa:known-defects
```

These are **expected to fail on the archived code**, documenting two suspected bugs: whitespace-only account name accepted after post-validation trimming, and completed upload over 50 MiB after mocked Storage reports actual size. They are deliberate red regressions, not unexplained framework errors. See `test/qa-known-defects.int-spec.ts`. The second scenario only mocks Storage size and does not demonstrate that real Supabase permits such an upload.

To stop the isolated database:

```bash
cd ../..
docker compose -f qa/docker-compose.postgres.yml down
```

Do **not** use `down -v` unless you intentionally want to destroy the isolated QA volume.

## Cypress React Component Testing

Component tests mount real `PdfViewer` and `UploadPanel` from `apps/web/src`. The components make no network requests in these scenarios. Cypress 16 supports React 19 and Vite 8 (https://docs.cypress.io/app/component-testing/react/overview).

```bash
cd apps/web
npm ci
npm install --save-dev cypress@^16
npx cypress run --component --browser chromium
# Alternative with a direct Chromium path:
# npx cypress run --component --browser "$CHROMIUM_EXECUTABLE_PATH"
# Or interactive Cypress runner:
# npx cypress open --component
```

If `--browser chromium` cannot discover your unpacked Chromium, specify its absolute executable path. Cypress requires **its own binary** in addition to Chromium. `npm install --save-dev` updates frontend package.json and package-lock.json on your local copy; these modifications are intentionally not pre-generated because the user-supplied lockfile must stay valid for `npm ci`.

Tests included: PDF loading/preview/error/retry/download states; UploadPanel progress, retry, close and auto-dismiss; eight component tests total. Browser execution **has not been verified** in this restricted environment.

## Existing Playwright/Lighthouse

The separately included `vdr-qa-starter/` preserves QA Framework v0.6 (with the user-discovered CommonJS `playwright.config.ts` fix). It contains the 14 read-only API/E2E tests that were reported passing on Ubuntu by the user, the Lighthouse CI and read-only inventory tools.

```bash
cd ../../../vdr-qa-starter
npm install
npm run test:framework
npm run qa:discover
npm run test:api
npm run test:ui
```

Use `OWNER_EMAIL`, `OWNER_PASSWORD`, `CHROMIUM_EXECUTABLE_PATH` from your trusted local `.env` or shell — **not bundled** in the archive.

## Optional k6

From `vdr-qa-starter/`, start a **locally hosted QA backend** then:

```bash
K6_BASE_URL=http://127.0.0.1:3000 k6 run performance/k6/local-readonly.js
```

Local-only, GET-only, 2 VUs/15 s. No production load/stress tests.
