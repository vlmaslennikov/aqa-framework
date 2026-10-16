# VDR QA Framework v0.8 — PDF Lifecycle

This is the v0.7 source+QA delivery with **additive** PDF lifecycle testing. It does not change application business logic or fix the two existing product defects.

## What is new

- `virtual-data-room-main/apps/api/test/qa-pdf-lifecycle.int-spec.ts`: four local PostgreSQL/NestJS integration scenarios with a byte-preserving HTTP fake storage adapter, SHA-256 validation, sharing, revocation, IDOR, rename, move, delete and simulated orphan risk.
- `virtual-data-room-main/apps/api/test/jest-qa-pdf-lifecycle.json` and script `npm run test:qa:pdf-lifecycle`.
- `virtual-data-room-main/.github/workflows/qa-integration.yml`: runs new integration suite after existing one.
- `vdr-qa-starter/tests/ui/pdf-storage-lifecycle.mutation.spec.ts`: optional REAL React-to-Supabase signed upload, preview, SHA-256, rename/move/delete (local isolated stack only).
- `vdr-qa-starter/scripts/guard-storage.mjs`: fail-closed target/permission guard, tested in `tests/unit/storage-e2e-guard.test.mjs`.
- `vdr-qa-starter/.gitignore`: repaired an unrelated malformed file inherited from the old standalone archive.

## Fast path — run on your existing Ubuntu PostgreSQL

From inside `virtual-data-room-main/apps/api` (where your old 7/7 passed):

```bash
# If your previous QA PostgreSQL container is stopped:
cd ../..
docker compose -f qa/docker-compose.postgres.yml up -d
cd apps/api

# If not already installed:
npm ci
# Export test credentials from EXISTING test/.env.test:
set -a; source test/.env.test; set +a
node test/qa-db-guard.cjs
npx prisma generate
npx prisma migrate deploy

npm run test:qa:integration
npm run test:qa:pdf-lifecycle
# Existing known defects are still expected-red (2 failing regressions):
npm run test:qa:known-defects
```

Requires localhost `vdr_qa_test` PostgreSQL. Does not use public VDR or real Supabase. Expected new tests: **4**. They have not been executed against PostgreSQL in the assistant's environment. Print output and send it here.

## Real Supabase end-to-end (optional, more setup)

First read **`virtual-data-room-main/qa/PDF-LIFECYCLE-v0.8.md`** completely. Must run only with a locally hosted frontend/backend, a QA-local PostgreSQL and a disposable test Supabase project/bucket. You'll need a disposable OWNER account and room in the local QA database. The guard rejects public endpoints. It cannot validate that your backend credentials truly refer to test storage; verify manually.

From `vdr-qa-starter` after local URLs, credentials and acknowledgement variables are exported:

```bash
npm ci
npm run test:framework
node scripts/guard-storage.mjs
npm run test:qa:storage
```

This tagged mutation test is excluded from ordinary `npm run test:ui` unless `RUN_MUTATION_TESTS=1`. Failure cleanup is best effort: inspect the isolated test room for pending `qa-lifecycle-*.pdf` metadata after interrupted uploads.

## Current evidence

- **39/39** QA framework tests PASS (v0.8 executed in the assistant environment; includes seven new storage-guard tests).
- **5/5** PostgreSQL guard unit tests PASS (v0.8 executed).
- New TS files: source syntax PASS; source + Jest JSON and CI YAML syntax PASS.
- Generated one-page PDF fixture inspected by `pdfinfo` PASS.
- New NestJS/PostgreSQL tests and browser+Supabase tests: **not yet executed**; require your Ubuntu setup.
- Previous user local reports: **7/7** Nest integration, **8/8** Cypress CT, **9/9** Playwright API, **5/5** Playwright UI; Lighthouse 6 completed audits. Two expected-red known defect tests show HTTP 201 instead of 400 (whitespace name, post-upload >50 MiB size).

The `vdr-qa-starter` directory is the standalone QA harness. The original product source is in `virtual-data-room-main`. This archive does NOT include `node_modules`, browsers, database files, credentials or `.env` secrets.
